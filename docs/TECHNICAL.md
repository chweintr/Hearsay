# Technical Documentation

> Developer guide for HEARSAY platform and Room 412 experience.
> 
> **Last Updated:** January 9, 2026

---

## Architecture Overview

HEARSAY uses a client-server architecture with audio processing:

- **Frontend:** Vanilla JS, no framework. State machine pattern for app flow.
- **Backend:** Python FastAPI server for Simli tokens + audio processing.
- **AI Conversations:** Simli widget SDK (handles WebRTC, audio, video).
- **Transcription:** Whisper (faster-whisper) for audio → text.
- **Chapter Generation:** Claude Opus 4.5 for narrative prose.
- **Hosting:** Railway (auto-deploys from GitHub).

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  ┌──────────┐  ┌────────────┐  ┌──────────────────────────┐ │
│  │  State   │→ │ Compositor │→ │     Simli Widget         │ │
│  │ Machine  │  │  (videos)  │  │  (AI talking head)       │ │
│  └──────────┘  └────────────┘  └──────────────────────────┘ │
│                                         │                    │
│                              ┌──────────┴──────────┐        │
│                              │   BlackRemover.js   │        │
│                              │ (canvas chroma key) │        │
│                              └─────────────────────┘        │
│                                         │                    │
│       ┌─────────────────────────────────┴─────────────────┐ │
│       │              AudioRecorder.js                      │ │
│       │  (MediaRecorder API captures user microphone)      │ │
│       └─────────────────────────────────────────────────────┘│
│                              │                               │
│                   ┌──────────┴──────────┐                   │
│                   │   SessionManager    │                   │
│                   │ (tracks sessions)   │                   │
│                   └─────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI)                         │
│                                                             │
│   POST /api/simli-token      → get token for Simli widget   │
│   POST /api/upload-audio     → receive recorded audio       │
│   POST /api/writing-engine/generate → trigger chapter gen   │
│   GET  /api/writing-engine/status   → check job status      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┼──────────────────┐
           ▼                  ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   SIMLI API     │  │  WHISPER        │  │  ANTHROPIC API  │
│   (sessions)    │  │  (transcribe)   │  │  (Claude Opus)  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## Project Structure

```
hearsay/
├── index.html              # Main app - entry, landing, peephole experience
├── styles.css              # All styling (entry, landing, peephole, UI)
├── config.js               # Platform, experience, and character definitions
├── state-machine.js        # App state: idle → transitioning → active
├── compositor.js           # Video layer orchestration
├── simli-integration.js    # Simli widget lifecycle + audio recording
├── session-manager.js      # User session tracking across conversations
├── audio-recorder.js       # MediaRecorder wrapper for audio capture
├── black-remover.js        # Canvas-based chroma key (black or green)
│
├── requirements.txt        # Python deps (root level for Railway detection)
├── Procfile                # Railway start command
├── railway.json            # Railway deploy configuration
├── nixpacks.toml           # Nixpacks build hints
│
├── assets/
│   ├── videos/
│   │   ├── Landing_1080.mp4           # Entry page video (black bg)
│   │   ├── Background_1.mp4            # Hallway view in peephole
│   │   ├── Wire_Walkup_2.mp4           # Wire's transition video
│   │   ├── Marisol_Walkup.mp4          # Marisol's transition video
│   │   ├── Eddie_walkup.mp4            # Eddie's transition video
│   │   └── ... (more walkup videos)
│   ├── sounds/
│   │   ├── MataZ.wav                   # Background music
│   │   ├── beard-contest--(remastered).mp3  # Alt music track
│   │   ├── hotel_hallway_subtle_3a.wav # Ambient sound
│   │   └── door_knocks/                # Character knock sounds
│   └── images/
│       ├── overlay.png                 # Peephole brass frame
│       └── Room_412.png                # Fallback splash
│
├── backend/
│   ├── server.py           # FastAPI: tokens, audio upload, chapter gen
│   ├── requirements.txt    # Python dependencies
│   └── prompts/
│       └── writing_engine.md  # Claude system prompt for chapters
│
└── docs/
    ├── HEARSAY.md           # Project vision
    ├── TECHNICAL.md         # This file
    ├── WRITING_ENGINE.md    # Writing Engine architecture
    ├── CHARACTER_BIBLE.md   # All character details
    └── *_PROMPT.md          # Individual character prompts
```

---

## Visual Layer Stack (Bottom to Top)

| Layer | Element | Content | Notes |
|-------|---------|---------|-------|
| Background | `#layer-background` | Hallway video | Full screen, always visible |
| Face Container | `#face-container` | Centered mount | 55% × 70% of viewport |
| ├─ Transition | `#layer-transition` | Walkup videos | Plays during summon |
| └─ Simli | `#layer-simli` | AI face | Canvas removes background |
| Overlay | `#layer-door-overlay` | overlay.png | Full-screen brass frame |
| UI | Various | Buttons, sliders | Top layer |

---

## Chroma Key Background Removal

**File:** `black-remover.js`

Supports two modes:
1. **Black key (default):** Removes pure black (#000000) backgrounds
2. **Green key:** Removes green screen (#00ff00) backgrounds

### Black Key Mode
```javascript
// Head protection zone - don't remove dark hair/features
if (distFromHeadCenter < 1.0) {
    // Only remove pure RGB(0,0,0)
    if (r === 0 && g === 0 && b === 0) {
        data[i + 3] = 0;
    }
}
```

### Green Key Mode (for Solomon, future characters)
```javascript
// config.js
solomon: {
    chromaKey: '#00ff00',  // Use green screen removal
    ...
}

// black-remover.js
setChromaKey('#00ff00');  // Called before start()
```

---

## Audio Recording System

**File:** `audio-recorder.js` (NEW)

Captures user microphone during Simli conversations for Whisper transcription.

### Flow
1. When Simli widget starts → request microphone access
2. MediaRecorder captures audio stream
3. On conversation end → stop recording, create blob
4. On session end → upload all blobs to backend

### Implementation
```javascript
class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.recordings = []; // Array of { characterId, blob, timestamp }
    }
    
    async start() {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaRecorder = new MediaRecorder(stream, { 
            mimeType: 'audio/webm;codecs=opus' 
        });
        
        this.mediaRecorder.ondataavailable = (e) => {
            this.audioChunks.push(e.data);
        };
        
        this.mediaRecorder.start();
    }
    
    stop(characterId) {
        return new Promise((resolve) => {
            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
                this.recordings.push({ 
                    characterId, 
                    blob, 
                    timestamp: Date.now() 
                });
                this.audioChunks = [];
                resolve(blob);
            };
            this.mediaRecorder.stop();
        });
    }
    
    async uploadAll(sessionId) {
        for (const recording of this.recordings) {
            const formData = new FormData();
            formData.append('sessionId', sessionId);
            formData.append('characterId', recording.characterId);
            formData.append('audio', recording.blob);
            
            await fetch('/api/upload-audio', { 
                method: 'POST', 
                body: formData 
            });
        }
    }
}
```

---

## Session Management

**File:** `session-manager.js`

Tracks user sessions across multiple character conversations.

### Key Concepts
- **Session:** One visit (tab open → "End Session" or tab close)
- **Conversation:** One character interaction within a session
- **Chapter:** One session transformed into narrative prose

### Storage
```javascript
// sessionStorage (cleared on tab close)
hearsay_user_session              // Current session ID

// localStorage (persists)
hearsay_session_transcripts_{id}  // Conversations for session
hearsay_sessions_index            // List of all sessions
hearsay_chapters                  // Generated chapters
```

### API
```javascript
const manager = getSessionManager();

manager.recordConversationStart(character);  // When character summoned
manager.storeConversation(id, char, data);   // When transcript ready
manager.exportForWritingEngine();            // Bundle for chapter gen
manager.endSession();                        // On "End Session" click
```

---

## Simli Widget Integration

### Token Endpoint
```
POST /api/simli-token?agentId=xxx&faceId=xxx
```

### Required Payload
```python
payload = {
    "simliAPIKey": SIMLI_API_KEY,
    "agentId": agentId,
    "faceId": faceId,
    "ttsAPIKey": ELEVENLABS_API_KEY,  # REQUIRED for voice!
    "expiryStamp": -1,
    "createTranscript": True
}
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SIMLI_API_KEY` | **Yes** | From Simli dashboard |
| `ELEVENLABS_API_KEY` | **Yes** | For TTS voice output |
| `ANTHROPIC_API_KEY` | **Yes** | For Claude chapter generation |
| `PORT` | Auto | Set by Railway |

---

## Character Configuration

Characters defined in `config.js`:

```javascript
solomon: {
    name: 'Solomon',
    role: 'The Concierge',
    agentId: '05bf4fc1-9e97-4f5e-9fa5-43712181839f',
    faceId: '38a35d8d-6d7b-4369-85be-d57a419e3ebb',
    idleToActive: ['assets/videos/Solomon_Walkup.mp4'],
    knockSound: 'assets/sounds/door_knocks/knock_hotel_1.wav',
    chromaKey: '#00ff00',  // Green screen removal
    status: 'ready'
}
```

### Status Values
- `ready` — Fully functional
- `coming_soon` — Shows placeholder message
- `unavailable` — Hidden from menu

### Adding a New Character

1. Create agent in Simli dashboard → get `agentId` and `faceId`
2. Create walkup video (black or green background)
3. Add knock sound (or use existing)
4. Write character prompt (see `/docs/*_PROMPT.md`)
5. Add entry to `characters` object
6. If green screen, add `chromaKey: '#00ff00'`

---

## Ready Characters (Jan 9, 2026)

| Character | agentId | faceId | Chroma | Status |
|-----------|---------|--------|--------|--------|
| Wire | `2439209e-...` | `bc603b3f-...` | Black | ✅ Ready |
| Marisol | `24105503-...` | `28851337-...` | Black | ✅ Ready |
| Eddie | `48daac40-...` | `9402a60c-...` | Black | ✅ Ready |
| Tane | `ca858324-...` | `7e095ab0-...` | Black | ✅ Ready |
| Priya | `a0819479-...` | `28503d8d-...` | Black | ✅ Ready |
| Milton | `c25a4b14-...` | `4a0Khp1o...` | Black | ✅ Ready |
| Rufus | `97eca1b0-...` | `297c78be-...` | Black | ✅ Ready |
| Solomon | `05bf4fc1-...` | `38a35d8d-...` | **Green** | ✅ Ready |
| Dotty | — | — | — | Coming Soon |
| Constance | — | — | — | Coming Soon |
| Caleb | — | — | — | Coming Soon |

---

## Writing Engine Pipeline

### Overview
```
User Conversations → Audio Recording → Whisper → Claude → Chapter
```

### Processing Flow

1. **During conversation:** MediaRecorder captures user microphone
2. **Conversation ends:** Audio blob stored locally
3. **"End Session" clicked:** All audio uploaded to backend
4. **Backend processing:**
   - Whisper transcribes each audio file
   - Claude Opus 4.5 generates narrative chapter
   - Chapter stored, user notified

### Backend Endpoints

```python
# Upload recorded audio
POST /api/upload-audio
    Form: sessionId, characterId, audio (file)
    → Returns: { status: "queued", conversationId }

# Generate chapter from session
POST /api/writing-engine/generate
    JSON: { sessionId }
    → Returns: { jobId, status: "processing" }

# Check job status
GET /api/writing-engine/status/{jobId}
    → Returns: { status, chapter? }
```

### Whisper Configuration

Using `faster-whisper` library:

```python
from faster_whisper import WhisperModel

model = WhisperModel("base", device="cpu")

def transcribe(audio_path: str) -> str:
    segments, _ = model.transcribe(audio_path)
    return " ".join([s.text for s in segments])
```

| Model | Size | Railway Compatible |
|-------|------|--------------------|
| tiny | 39MB | ✅ Yes |
| base | 74MB | ✅ Yes (recommended) |
| small | 244MB | ✅ Yes |
| medium | 769MB | ⚠️ May need more RAM |

---

## State Machine Flow

```
idle → transitioning-in → active → transitioning-out → idle
```

### Character Summon Sequence

1. User clicks character in gallery
2. `enterExperience(characterKey)` called
3. State → `transitioning-in`
4. Compositor plays walkup video + knock sound
5. SimliIntegration fetches token, creates widget
6. **AudioRecorder.start()** begins capturing
7. BlackRemover processes video frames
8. State → `active`, Simli face visible

### Character Dismissal

1. User clicks "Send Away" or "← Back"
2. **AudioRecorder.stop()** saves recording
3. State → `transitioning-out`
4. SimliIntegration destroys widget
5. SessionManager records conversation
6. State → `idle`

---

## Debugging

### Console Commands

```javascript
// Check session and transcripts
hearsay.debug.showTranscripts()
hearsay.debug.showSessionData()

// Check audio recordings
hearsay.debug.showRecordings()
```

### Common Issues

| Problem | Check | Solution |
|---------|-------|----------|
| Simli not talking | `ELEVENLABS_API_KEY` | Verify key in Railway |
| No audio recording | Microphone permission | User must allow access |
| Transcript empty | Console for errors | Check Whisper logs |
| Chapter not generating | `ANTHROPIC_API_KEY` | Verify key, check quota |

### Simli Debugging

Look for these console messages:
```
[Simli] Token received: yes
[Simli] Session ID: xxxxx
[Simli] 🎬 Video found, starting black removal
[Simli] 📝 Local transcript capture ready
```

---

## File Naming Rules

- **No spaces** in filenames (use underscores)
- **No `#` symbols** (breaks URL encoding)
- **Use `.mp4`** for videos (browser compatibility)
- **Use `.webm`** for recorded audio (efficient, web-native)

---

## Railway Deployment

### Build
Railway auto-detects Python from `requirements.txt`:
```
fastapi
uvicorn
httpx
python-multipart
faster-whisper
anthropic
```

### Start Command (Procfile)
```
web: cd backend && python -m uvicorn server:app --host 0.0.0.0 --port $PORT
```

### Environment Variables
Set in Railway dashboard:
- `SIMLI_API_KEY`
- `ELEVENLABS_API_KEY`
- `ANTHROPIC_API_KEY`

---

*For project vision and design principles, see [HEARSAY.md](HEARSAY.md)*
*For Writing Engine details, see [WRITING_ENGINE.md](WRITING_ENGINE.md)*
