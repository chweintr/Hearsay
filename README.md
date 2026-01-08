# HEARSAY

> Unreliable narrators, reliable conversations.

**Current Experience: THE KNOCK (Room 412)**

Someone is at your door. They have something to tell you. Whether you believe them is up to you.

The owner died six months ago. People keep knocking. You talk to them through the peephole. You decide what to believe.

---

## Quick Start (Railway)

1. **Push to GitHub**
2. **Create Railway project** → Connect GitHub repo
3. **Set environment variables:**
   ```
   SIMLI_API_KEY=your_simli_api_key
   ELEVENLABS_API_KEY=your_elevenlabs_api_key
   ```
4. **Deploy**

Railway URL: `https://web-production-607f7.up.railway.app/`

---

## Current Status

**Version Tag:** `v1.0-working-app` (stable checkpoint)

| Component | Status |
|-----------|--------|
| Simli Integration | ✅ Working |
| 11 Characters | ✅ Configured |
| Video Transitions | ✅ Working |
| Black Removal | ✅ Working (head protection) |
| Transcript Capture | ✅ Infrastructure ready |
| Writing Engine | 📋 Planned (see docs) |

---

## Characters (THE KNOCK)

| Character | Role | Status |
|-----------|------|--------|
| Wire | Long-Time Resident | ✅ Ready |
| Marisol | Owner's Daughter | ✅ Ready |
| Eddie | Night Chef | ✅ Ready |
| Tane | Wire's Brother | ✅ Ready |
| Priya | Bartender | ✅ Ready |
| Rufus | The Clown | ✅ Ready |
| Dotty | Room 308 | 🟡 Walkup ready |
| Constance | Fourth Floor | 🔴 Coming soon |
| Milton | The Comedian | 🟡 Walkup ready |
| Caleb | The Author | 🟡 Walkup ready |
| Solomon | The Concierge | 🟡 Walkup ready |

---

## Project Structure

```
hearsay/
├── index.html              # Main app, video layers, Simli mount
├── styles.css              # Baroque peephole styling
├── config.js               # Character definitions (11 characters)
├── state-machine.js        # State: idle → transitioning → active
├── compositor.js           # Video layer orchestration
├── simli-integration.js    # Simli widget lifecycle + transcript capture
├── black-remover.js        # Canvas-based background removal
├── Procfile                # Railway start command
├── railway.json            # Railway configuration
├── assets/
│   ├── videos/             # Walkup videos, transitions
│   ├── sounds/             # Knock sounds, ambient audio
│   └── images/             # Heraldic crest, overlays
├── backend/
│   └── server.py           # FastAPI token server
└── docs/
    ├── SIMLI_INTEGRATION.md    # Simli troubleshooting (critical!)
    ├── WRITING_ENGINE.md       # Writing Engine architecture
    ├── CHARACTER_BIBLE.md      # Full character details
    ├── caleb-third-person-voice.md  # Voice skill for Writing Engine
    └── TECHNICAL.md            # Technical architecture
```

---

## Critical: If Simli Stops Working

**Symptoms:** Face shows, no voice/conversation

**Fix:** Check that `ttsAPIKey` (ElevenLabs) is included in the token request.

See `/docs/SIMLI_INTEGRATION.md` for full troubleshooting guide.

```python
# backend/server.py - Token request MUST include:
payload = {
    "simliAPIKey": simli_key,
    "agentId": agentId,
    "faceId": faceId,
    "ttsAPIKey": elevenlabs_key,  # ← WITHOUT THIS, NO VOICE!
    "expiryStamp": -1,
    "createTranscript": True
}
```

---

## Writing Engine (Planned)

Transform conversations into literature using Claude Opus 4.5.

**How it will work:**
1. User has multiple conversations in one session
2. User clicks "End Session"
3. All transcripts bundled and sent to Claude Opus
4. Opus weaves conversations into a single chapter
5. User reads their personalized novel in `/chapters`

**Key feature:** The engine embellishes — adding setting details, character thoughts, scenes the user didn't directly witness.

See `/docs/WRITING_ENGINE.md` for full architecture.

---

## Adding Characters

1. **Create Simli agent** at [simli.com](https://simli.com) with character prompt
2. **Add to `config.js`:**
   ```javascript
   newcharacter: {
       name: 'Display Name',
       role: 'Their Role',
       agentId: 'simli_agent_id',
       faceId: 'simli_face_id',
       idleToActive: ['assets/videos/Name_Walkup.mp4'],
       activeToIdle: ['assets/videos/Name_Walkup.mp4'],
       knockSound: 'assets/sounds/door_knocks/knock_hotel_1.wav',
       previewVideo: 'assets/videos/Name_Walkup.mp4',
       status: 'ready'
   }
   ```
3. **Add walkup video** to `assets/videos/`

---

## State Flow

```
idle → transitioning-in → active → transitioning-out → idle
  │                         │
  │  Knock sound            │  Simli widget active
  │  Walkup video loops     │  BlackRemover processing
  │  Simli loading          │  Transcript capturing
  │                         │
  └─────────────────────────┘
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/simli-token` | POST | Generate Simli session token |
| `/api/simli-transcript/{id}` | GET | Retrieve conversation transcript |
| `/api/health` | GET | Health check for Railway |
| `/` | GET | Serve frontend |

**Planned:**
| `/api/writing-engine/generate` | POST | Generate chapter from transcripts |
| `/api/chapters` | GET | List generated chapters |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SIMLI_API_KEY` | Yes | Simli API key from dashboard |
| `ELEVENLABS_API_KEY` | Yes | ElevenLabs key for TTS |
| `OPENAI_API_KEY` | No | For future features |
| `PORT` | Auto | Set by Railway |

---

## Visual Conceit

POV through brass hotel door peephole:
- Circular frame with heavy vignette
- Dark baroque palette
- Video transitions loop until Simli ready
- Canvas-based black removal with head protection zone
- The feeling of 2am, uncertain whether to open

---

## Rollback

If something breaks, return to working state:

```bash
git checkout v1.0-working-app
```

---

## Documentation

| Doc | Purpose |
|-----|---------|
| `/docs/SIMLI_INTEGRATION.md` | How Simli works, troubleshooting |
| `/docs/WRITING_ENGINE.md` | Writing Engine architecture |
| `/docs/CHARACTER_BIBLE.md` | All character details |
| `/docs/caleb-third-person-voice.md` | Voice skill for Opus |
| `/docs/TECHNICAL.md` | Technical architecture |
| `/docs/PROJECT_DESCRIPTION.md` | Project overview for pitches |

---

## License

Private project. Not for distribution.
