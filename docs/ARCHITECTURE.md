# HEARSAY — Platform Architecture

## Hierarchy

```
HEARSAY (Platform)
    │
    ├── THE KNOCK (Experience #1) ← Current
    │       └── Room 412, the hotel, characters at the door
    │
    ├── [Future Experience #2]
    │       └── Different setting, different conceit
    │
    └── [Future Experience #3]
            └── ...
```

---

## Terminology

| Term | Definition |
|------|------------|
| **HEARSAY** | The parent platform/brand. "Unreliable narrators, reliable conversations." |
| **Experience** | A single narrative world with its own characters, setting, and interface conceit. |
| **THE KNOCK** | The first HEARSAY experience. Set in a hotel. User talks through the peephole. |
| **Character** | An AI-driven conversational entity with video avatar (Simli). |
| **Session** | One user visit (open site → close tab or "End Session"). |
| **Chapter** | A session narrativized into prose by the Writing Engine. |

---

## Branding Language

**On the site:**
- "THE KNOCK — A HEARSAY Experience"
- "Brought to you by HEARSAY"

**Taglines:**
- HEARSAY: "Unreliable narrators, reliable conversations."
- THE KNOCK: "Someone is at your door."

---

## Future Experience Concepts (Parking Lot)

### Cell Phone Conceit
- Interface is a phone screen (FaceTime-like)
- Characters call you
- Different visual language, same conversational core

### Other Settings
- A diner at 3am
- A confessional booth
- A therapy waiting room
- A séance

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│                                                                 │
│   Entry Page → Landing (Characters) → Experience (Peephole)    │
│                                                                 │
│   - config.js (characters, settings)                           │
│   - state-machine.js (idle → active → idle)                    │
│   - compositor.js (video layers)                               │
│   - simli-integration.js (widget lifecycle)                    │
│   - session-manager.js (transcript bundling)                   │
│   - black-remover.js (background transparency)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                 │
│                                                                 │
│   FastAPI (Railway)                                            │
│                                                                 │
│   - /api/simli-token (Simli session)                           │
│   - /api/simli-transcript/{id} (retrieve transcript)           │
│   - /api/writing-engine/generate (Claude Opus → chapter)       │
│   - Static file serving                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       EXTERNAL SERVICES                         │
│                                                                 │
│   - Simli (AI video avatars, WebRTC)                           │
│   - ElevenLabs (TTS via Simli)                                 │
│   - Anthropic Claude (Writing Engine)                          │
│   - Railway (hosting)                                          │
│   - GitHub (version control)                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
hearsay/
├── index.html              # Main app
├── styles.css              # All styling
├── config.js               # Characters, settings
├── state-machine.js        # State management
├── compositor.js           # Video layers
├── simli-integration.js    # Simli widget
├── session-manager.js      # Transcript tracking
├── black-remover.js        # Background removal
│
├── assets/
│   ├── videos/             # Walkups, backgrounds, store loops
│   ├── sounds/             # Knocks, ambient, music
│   └── images/             # Heraldic, overlays
│
├── backend/
│   ├── server.py           # FastAPI
│   ├── requirements.txt    # Python deps
│   └── prompts/
│       └── writing_engine.md  # Claude system prompt
│
└── docs/
    ├── ARCHITECTURE.md     # This file
    ├── CHARACTER_BIBLE.md  # All characters
    ├── SIMLI_INTEGRATION.md # Simli troubleshooting
    ├── WRITING_ENGINE.md   # Writing Engine design
    └── PROJECT_DESCRIPTION.md # For pitches/grants
```

