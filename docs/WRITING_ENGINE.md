# Writing Engine — Design Document

> Transform conversations into literature.

---

## Overview

The Writing Engine takes user conversations with AI characters and transforms them into narrativized prose chapters using Claude Opus 4.5. Users talk to characters; the engine turns those conversations into a personalized novel.

**Key principle:** The user's actual dialogue is preserved and woven into literary prose, but the engine embellishes — adding setting details, character thoughts, scenes the user didn't directly witness.

---

## Architecture (v2 — Audio Recording + Whisper)

**Previous approach:** Relied on Simli's transcript API (unreliable, often returns 404).

**Current approach:** Record audio locally → upload → Whisper transcription → Claude chapter generation.

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER SESSION                             │
│                                                                 │
│   User opens site → SESSION_ID generated (sessionStorage)       │
│                                                                 │
│   Talk to Wire   → Audio recorded (MediaRecorder API)           │
│   Talk to Eddie  → Audio recorded (MediaRecorder API)           │
│   Talk to Priya  → Audio recorded (MediaRecorder API)           │
│                                                                 │
│   User clicks "End Session"                                     │
│                          ↓                                      │
│   All audio blobs uploaded to backend                           │
│                          ↓                                      │
│   "The hotel heard everything.                                  │
│    Your chapter is being written.                               │
│    We'll let you know when it's ready."                         │
│                          ↓                                      │
│   User can leave / start new session / close tab                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼ (Background Processing)
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND PIPELINE                              │
│                                                                 │
│   1. Receive audio files from frontend                          │
│                          ↓                                      │
│   2. Whisper transcribes each conversation                      │
│      (faster-whisper library, runs on Railway)                  │
│                          ↓                                      │
│   3. Claude Opus 4.5 weaves transcripts into ONE chapter        │
│      (with voice skill + previous chapters for RAG)             │
│                          ↓                                      │
│   4. Chapter stored in database                                 │
│                          ↓                                      │
│   5. User notified (email / badge on next visit)                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Why Audio Recording + Whisper?

| Approach | Reliability | Quality | Complexity |
|----------|-------------|---------|------------|
| Simli transcript API | ❌ Unreliable (404s, no sessionId) | Unknown | Low |
| Widget event capture | ❌ Events may not fire | Partial (user only?) | Low |
| **Audio recording + Whisper** | ✅ We control everything | ✅ Excellent | Medium |

**Whisper is free** — OpenAI's model is open source. We use `faster-whisper` (Python) which runs efficiently on Railway.

---

## Session vs. Conversation vs. Chapter

| Term | Definition |
|------|------------|
| **Conversation** | One user ↔ character exchange (e.g., talking to Wire) |
| **Session** | All conversations from site open to "End Session" |
| **Chapter** | One session narrativized into prose |

**Rule:** One session = one chapter. Multiple conversations within a session are woven together.

---

## Audio Recording Flow

### Frontend (browser)

```javascript
// Start recording when Simli conversation begins
const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
const audioChunks = [];

mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
mediaRecorder.onstop = () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    // Store blob for upload when session ends
};

mediaRecorder.start();
```

### Audio Sources

We capture **user microphone only** (Simli's audio is internal). The transcript will show:
- User speech (from Whisper)
- AI responses (from the original prompts/agent config, not transcribed)

**Alternative:** Capture system audio too (complex, requires user permission).

### Upload

When "End Session" is clicked:
```javascript
const formData = new FormData();
formData.append('sessionId', sessionId);
formData.append('audio', audioBlob, `${characterId}_${timestamp}.webm`);

await fetch('/api/upload-audio', { method: 'POST', body: formData });
```

---

## Backend Processing

### New Endpoints

```python
# Upload audio for transcription
POST /api/writing-engine/upload-audio
    Form data: sessionId, characterId, audio (file)
    → Saves audio file, queues for transcription
    → Returns: { status: "queued", jobId }

# Check job status
GET /api/writing-engine/status/{jobId}
    → Returns: { status: "processing" | "complete" | "failed", chapter? }

# Get generated chapter
GET /api/writing-engine/chapter/{chapterId}
    → Returns: { chapter, generatedAt, ... }
```

### Whisper Transcription

```python
from faster_whisper import WhisperModel

model = WhisperModel("base", device="cpu")  # or "small" for better quality

def transcribe_audio(audio_path: str) -> str:
    segments, info = model.transcribe(audio_path)
    return " ".join([segment.text for segment in segments])
```

**Model options:**
| Model | Size | Speed | Quality |
|-------|------|-------|---------|
| tiny | 39MB | Fastest | Lower |
| base | 74MB | Fast | Good |
| small | 244MB | Medium | Better |
| medium | 769MB | Slow | Best |

Start with `base` for Railway (balance of speed/quality).

---

## User Experience Flow

### Happy Path

1. User has 1-3 conversations with characters
2. User clicks "End Session"
3. UI shows:
   ```
   ┌─────────────────────────────────────────────┐
   │                                             │
   │    The hotel heard everything.              │
   │                                             │
   │    Your chapter is being written.           │
   │    We'll let you know when it's ready.      │
   │                                             │
   │    Feel free to keep exploring,             │
   │    or return later.                         │
   │                                             │
   │         [Continue Exploring]                │
   │                                             │
   └─────────────────────────────────────────────┘
   ```
4. User can close tab, start new session, etc.
5. Processing happens in background (1-3 minutes typical)
6. User gets notified when chapter is ready

### Notification Options

| Method | Implementation | User Experience |
|--------|---------------|-----------------|
| **Badge on return** | Check localStorage for pending chapters | "Your chapter is ready!" toast |
| **Email** | Resend/SendGrid integration | Chapter delivered to inbox |
| **Push notification** | Web Push API | Browser notification |

Start with badge-on-return (simplest), add email later.

---

## Voice Skill Reference

The Writing Engine uses **Caleb's Third-Person Fiction Voice** for prose generation.

**Location:** `/docs/caleb-third-person-voice.md`

**Key principles:**
- Measured but alive — sentences have momentum
- Show the thinking — characters reveal how they arrive at conclusions
- Spare existential weight — stakes matter but aren't announced
- Playful precision — exact word choice, unexpected analogies

---

## LLM Configuration

**Model:** Claude Opus 4.5 (claude-opus-4-20250514)

**Why Opus:**
- Best literary quality
- Follows complex voice prompts precisely
- Long context for previous chapters (RAG-lite)
- Handles nuanced embellishment well

**System Prompt Structure:**
```
1. Voice Skill (Caleb's third-person fiction voice)
2. Story World Context (hotel, characters, relationships)
3. Character Sensory Details (smells, drinks, objects)
4. Previous Chapters (last 2-3 for continuity)
5. Current Session's Transcripts (actual dialogue)
6. Embellishment Instructions
7. Chapter Length Guidelines
```

---

## Embellishment Guidelines

The Writing Engine doesn't just transcribe — it embellishes:

**What the engine adds:**
- Setting details (hallway sounds, lighting, carpet texture)
- Character thoughts (what they were thinking but didn't say)
- Pre-scene context (what character was doing before arriving)
- Post-scene hints (where character went after)
- Sensory details (smells from sensory packs, drinks, textures)
- Other characters' activities (Eddie in the kitchen, Dotty watching from her doorway)
- Character glimpses (disguised Marisol passing by, sounds from other rooms)

**What the engine preserves:**
- User's actual dialogue (may be polished but not changed)
- Character's actual responses
- Key information revealed
- Emotional beats of the conversation

**The Hearsay Thread:**
Occasionally weave in the theme of unreliability:
- "...but as far as they could tell, it was all just hearsay anyway."
- "The occupant wasn't sure which of them to believe."
- Vary terms for the user: "the occupant," "the one in 412," "the observer," "the listener"

---

## Data Storage

### localStorage (Frontend)
```javascript
hearsay_user_session          // Current session ID
hearsay_session_transcripts_* // Transcripts per session
hearsay_sessions_index        // List of all sessions
hearsay_audio_*               // Audio blobs (temporary)
hearsay_chapters              // Generated chapters
hearsay_pending_chapters      // Chapters being generated
```

### Backend (Future: Database)
```
sessions/
  {sessionId}/
    audio/
      wire_1704667200.webm
      eddie_1704667800.webm
    transcripts/
      wire.txt
      eddie.txt
    chapter.md
    metadata.json
```

---

## Implementation Phases

### Phase 0: Documentation ✅
- [x] Architecture document
- [x] Voice skill in repo
- [x] Updated TECHNICAL.md

### Phase 1: Session Tracking ✅
- [x] Generate SESSION_ID on site load
- [x] Track conversations per session
- [x] Persist across page refreshes

### Phase 2: Local Capture (Partial) ✅
- [x] Event listeners for Simli widget transcription events
- [x] Session manager stores conversation records
- [ ] **Audio recording with MediaRecorder** ← NEXT

### Phase 3: Audio Recording ← IN PROGRESS
- [ ] MediaRecorder integration during Simli conversation
- [ ] Store audio blobs locally
- [ ] Upload endpoint `/api/upload-audio`

### Phase 4: Whisper Transcription
- [ ] Install `faster-whisper` on Railway
- [ ] Transcribe uploaded audio files
- [ ] Store transcripts with session

### Phase 5: Chapter Generation
- [ ] POST `/api/writing-engine/generate`
- [ ] Claude Opus 4.5 with voice skill
- [ ] Store generated chapters

### Phase 6: Notification & UI
- [ ] "Chapter is being written" UI
- [ ] Badge on return when chapter ready
- [ ] /chapters page improvements
- [ ] Email delivery (optional)

---

## Environment Variables

```env
# Required
SIMLI_API_KEY=...
ELEVENLABS_API_KEY=...
ANTHROPIC_API_KEY=...

# Optional (for email)
RESEND_API_KEY=...
```

---

## Rollback Point

**Tag:** `v1.0-working-app`

If Writing Engine implementation breaks the main app:
```bash
git checkout v1.0-working-app
```

---

## References

- Voice Skill: `/docs/caleb-third-person-voice.md`
- System Prompt: `/backend/prompts/writing_engine.md`
- Simli Integration: `/docs/SIMLI_INTEGRATION.md`
- Character Bible: `/docs/CHARACTER_BIBLE.md`
- Technical Docs: `/docs/TECHNICAL.md`
