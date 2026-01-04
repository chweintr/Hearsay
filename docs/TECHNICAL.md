# Technical Documentation

> Developer guide for HEARSAY platform and Room 412 experience.
> 
> **Last Updated:** January 3, 2026

---

## Architecture Overview

HEARSAY uses a simple client-server architecture:

- **Frontend:** Vanilla JS, no framework. State machine pattern for app flow.
- **Backend:** Python FastAPI server for Simli token generation.
- **AI Conversations:** Simli widget SDK (handles WebRTC, audio, video).
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
│                              │ (canvas transparency)│        │
│                              └─────────────────────┘        │
│                                         │                    │
│                              ┌──────────┴──────────┐        │
│                              │   localStorage      │        │
│                              │  (transcripts)      │        │
│                              └─────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI)                         │
│   POST /api/simli-token    → get token + sessionId           │
│   GET  /api/simli-transcript/{id} → retrieve transcript      │
│      Passes: simliAPIKey, agentId, faceId, createTranscript  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      SIMLI API                               │
│        POST https://api.simli.ai/v1/sessions                 │
│        GET  https://api.simli.ai/auto/transcript/{id}        │
│            (WebRTC, AI conversation, video, transcripts)     │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
hearsay/
├── index.html              # Main app - landing page + peephole experience
├── styles.css              # All styling (landing, peephole, UI)
├── config.js               # Platform, experience, and character definitions
├── state-machine.js        # App state: idle → transitioning → active
├── compositor.js           # Video layer orchestration
├── simli-integration.js    # Simli widget lifecycle management
├── black-remover.js        # Canvas-based black→transparent processor
│
├── requirements.txt        # Python deps (root level for Railway detection)
├── Procfile                # Railway start command
├── railway.json            # Railway deploy configuration
├── nixpacks.toml           # Nixpacks build hints
│
├── assets/
│   ├── videos/
│   │   ├── The_Knock_Background.mp4   # Landing page background
│   │   ├── Background_1.mp4            # Hallway view in peephole
│   │   ├── Animated_Text.mp4           # "A Conversation" text overlay
│   │   ├── Wire_Walkup_2.mp4           # Wire's transition video
│   │   └── Marisol_Walkup.mp4          # Marisol's transition video
│   ├── sounds/
│   │   ├── MataZ.wav                   # Background music
│   │   ├── hotel_hallway_subtle_3a.wav # Ambient sound
│   │   └── door_knocks/                # Character knock sounds
│   └── images/
│       ├── overlay.png                 # Peephole brass frame (full screen)
│       └── Room_412.png                # Splash image
│
├── backend/
│   ├── server.py           # FastAPI token server + static file serving
│   └── requirements.txt    # Python dependencies (backup)
│
└── docs/
    ├── HEARSAY.md          # Full project vision document
    └── TECHNICAL.md        # This file
```

---

## Visual Layer Stack (Bottom to Top)

The experience uses a shared face container for centering:

| Layer | Element | Content | Notes |
|-------|---------|---------|-------|
| Background | `#layer-background` | Hallway video | Full screen, always visible |
| Face Container | `#face-container` | Centered mount | 55% × 70% of viewport, holds walkup + Simli |
| ├─ Transition | `#layer-transition` | Walkup videos | Plays during summon |
| └─ Simli | `#layer-simli` | AI face | Canvas overlay removes black background |
| Overlay | `#layer-door-overlay` | overlay.png | Full-screen brass peephole frame |
| UI | Various | Buttons, sliders | Top layer |

### Face Container CSS
```css
#face-container {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 55%;   /* Adjust to match overlay opening */
    height: 70%;
    z-index: 15;
}
```

---

## Black Background Removal (Canvas Method)

Simli outputs video with black background. We remove it using canvas processing:

**File:** `black-remover.js`

```javascript
// For each video frame:
// 1. Draw frame to canvas
// 2. Scan all pixels
// 3. If R, G, B all < threshold (15), set alpha to 0
// 4. Put modified data back

if (r < threshold && g < threshold && b < threshold) {
    data[i + 3] = 0; // Make transparent
}
```

**Why canvas instead of CSS blend modes:**
- CSS `mix-blend-mode: screen` affects ALL dark colors (face shadows become see-through)
- Canvas can target ONLY pure black (#000000 or near-black)
- Face shadows stay solid

---

## Audio System

Two independent audio tracks with volume sliders:

1. **Ambient** (`#ambient-main`): `hotel_hallway_subtle_3a.wav` - loops
2. **Music** (`#music-main`): `MataZ.wav` - loops

### Audio starts on first user interaction (browser policy)

```javascript
document.body.addEventListener('click', () => {
    if (!audioStarted) startAudio();
}, { once: true });
```

### Volume defaults
- Ambient: 65%
- Music: 15%

---

## Simli Widget Integration

### Correct API Endpoint
```
POST https://api.simli.ai/auto/token
```

### Backend Token Request (CRITICAL)
```python
payload = {
    "simliAPIKey": SIMLI_API_KEY,      # API key in body
    "agentId": agentId,                 # Character config
    "faceId": faceId,                   # Face to animate
    "ttsAPIKey": ELEVENLABS_API_KEY,   # REQUIRED for voice!
    "expiryStamp": -1,
    "createTranscript": True
}
```

### Environment Variables Required

| Variable | Required | Description |
|----------|----------|-------------|
| `SIMLI_API_KEY` | **Yes** | From Simli dashboard |
| `ELEVENLABS_API_KEY` | **Yes** | For TTS voice output |
| `PORT` | Auto | Set by Railway |

### Frontend Widget Creation
```javascript
const widget = document.createElement('simli-widget');
widget.setAttribute('token', sessionToken);
widget.setAttribute('agentId', agentId);
widget.setAttribute('faceId', faceId);
document.getElementById('simli-mount').appendChild(widget);

// Auto-click Start button (Simli shows internal button)
setTimeout(() => {
    widget.querySelectorAll('button').forEach(btn => {
        if (!btn.textContent.includes('close')) btn.click();
    });
}, 500);
```

---

## Character Configuration

Characters are defined in `config.js`:

```javascript
wire: {
    name: 'Wire (Wiremu)',
    role: 'Long-Time Resident',
    agentId: '2439209e-abb8-4ccc-ab18-2bbbfc78d4f6',
    faceId: 'bc603b3f-d355-424d-b613-d7db4588cb8a',
    idleToActive: ['assets/videos/Wire_Walkup_2.mp4'],
    knockSound: 'assets/sounds/door_knocks/knock_hotel_1.wav',
    status: 'ready'  // ready | coming_soon | unavailable
},
marisol: {
    name: 'Marisol',
    role: "Owner's Daughter",
    agentId: '24105503-dbf2-48ec-9d14-b800f8ebedde',
    faceId: '28851337-4976-4692-b5c5-3c2825c8d522',
    idleToActive: ['assets/videos/Marisol_Walkup.mp4'],
    knockSound: 'assets/sounds/door_knocks/knock_office.wav',
    status: 'ready'
}
```

### Adding a New Character

1. Create agent in Simli dashboard → get `agentId` and `faceId`
2. Create walkup video (character approaching door)
3. Create knock sound (or use existing)
4. Add entry to `characters` object in `config.js`
5. Character automatically appears in landing gallery

---

## State Machine Flow

```
idle → transitioning-in → active → transitioning-out → idle
```

### What Happens When User Clicks Character

1. `enterExperience(characterKey)` called
2. State machine calls `summonCharacter()`
3. Compositor plays walkup video + knock sound
4. Video ends → `onTransitionInComplete()`
5. SimliIntegration creates widget, fetches token
6. BlackRemover starts processing video frames
7. Simli face appears with transparent background

---

## Known Issues & Current State (Jan 3, 2026)

### Working ✓
- Landing page with **radial character gallery** (9 characters orbit peephole)
- Background video looping with 5-second pause on first frame
- Animated text overlay ("A Conversation") with transparent black
- Music and ambient audio with volume sliders
- Door knock sounds per character
- About modal
- **Wire (Wiremu)** — fully working Simli integration
- **Marisol** — fully working Simli integration  
- Character walkup videos centered in peephole
- **Simli token fetch working** (with agentId, faceId, ttsAPIKey)
- **Simli voice working** (ElevenLabs TTS connected)
- **BlackRemover canvas** — removes pure black backgrounds
- **Store modal** with 10 sensory packs (individual + Hotel Pack)
- Character hover: simple scale effect (1.1x)

### Ready Characters
| Character | agentId | faceId | Status |
|-----------|---------|--------|--------|
| Wire (Wiremu) | `2439209e-abb8-4ccc-ab18-2bbbfc78d4f6` | `bc603b3f-d355-424d-b613-d7db4588cb8a` | ✅ Ready |
| Marisol | `24105503-dbf2-48ec-9d14-b800f8ebedde` | `28851337-4976-4692-b5c5-3c2825c8d522` | ✅ Ready |
| Eddie | — | — | Coming Soon |
| Dotty | — | — | Coming Soon |
| Tane | — | — | Coming Soon |
| Constance | — | — | Coming Soon |
| Priya | — | — | Coming Soon |
| Lenny | — | — | Coming Soon |
| Caleb | — | — | Coming Soon |
| Rufus | — | — | Coming Soon |

### In Progress / Needs Fixing
- Walkup→Simli transition: small visual gap during loading
- Additional character Simli IDs needed (7 remaining)

### Planned Features
- **Marisol Incognito Mode:** Random toggle between Marisol's regular appearance and an "incognito" version (different faceId). Initially 2 variants, could expand based on budget. User never knows which Marisol they'll get.

- **Writing Engine (Dialogue Harvest → Narrative Pipeline):**
  - Harvest full conversation transcripts from sessions (Simli's `createTranscript: true`)
  - Feed harvested dialogue to Writing Agent (Claude Opus 4.5 or Kimi K2)
  - Transform raw dialogue into narrativized chapters (1500-2500 words)
  - Custom `.skill` file for author's voice/style
  - Output: email, user journal, PDF, collective novel contribution
  - See `docs/HEARSAY.md` for full vision

### Recently Completed (Jan 3)
- Added Marisol's Simli IDs
- Radial character menu (horseshoe orbit)
- Store modal with all 10 sensory pack products
- Sticky notes added to all packs (handwriting ambiguity)
- Character hover: simplified to scale effect
- Updated all documentation

### What Failed / Didn't Work (Reference)
- CSS `mix-blend-mode: screen` made face shadows transparent (face looked ghostly)
- High contrast filters didn't isolate pure black well enough
- Multiple Simli API endpoints tried before finding `/auto/token`

---

## Writing Engine Implementation

### Overview

The Writing Engine harvests dialogue from user sessions and transforms raw conversation into narrativized literary chapters. Not summarization—fiction generation using harvested dialogue as raw material.

### Architecture

```
Session → Transcript Capture → Local Storage → Writing Agent → Chapter Delivery
```

### Step 1: Transcript Capture ✅ IMPLEMENTED

**Backend Endpoints:**
```
POST /api/simli-token?agentId=xxx&faceId=xxx
    → Returns: { token, sessionId }
    → Enables createTranscript: true

GET /api/simli-transcript/{session_id}
    → Polls Simli for transcript after session ends
    → Returns: { status, sessionId, transcript }
```

**Frontend Flow (simli-integration.js):**
1. `fetchToken()` stores `sessionId` when creating session
2. `destroyWidget()` waits 5s then calls `fetchTranscript()`
3. `storeTranscript()` saves to localStorage
4. Dispatches `hearsay-transcript` custom event for other components

**Transcript Storage:**
```javascript
// localStorage keys
hearsay_transcript_index     // Array of { sessionId, character, timestamp }
hearsay_transcript_{id}      // Full transcript record per session
```

**Retrieve All Transcripts:**
```javascript
const simli = /* SimliIntegration instance */;
const allTranscripts = simli.getAllTranscripts();
```

**Session Boundaries:**
- User clicks "Send Away" button (triggers destroyWidget)
- User clicks "← Back" button
- Inactivity timeout (future: 5 min silence)
- Browser close (navigator.sendBeacon for reliability)

### Step 2: Writing Agent

**Model Options:**
| Model | Cost | Quality | Notes |
|-------|------|---------|-------|
| Claude Opus 4.5 | $$$ | Excellent | Supports .skills, best for literary output |
| Kimi K2 | $ | Good | Cheaper, test/scale option |
| Claude Sonnet | $$ | Very Good | Balance of cost/quality |

**Custom Voice (.skill file):**
```
// writing-style.skill
{
  "name": "HEARSAY Author Voice",
  "samples": [
    "excerpt from author's published work...",
    "another excerpt...",
    // 5-10 style samples
  ],
  "guidelines": {
    "pov": "second person, present tense",
    "tone": "literary noir, baroque, melancholic",
    "avoid": ["said", "walked", "looked"],
    "prefer": ["murmured", "drifted", "noticed"]
  }
}
```

**New Endpoint:**
```python
@app.post("/api/generate-chapter")
async def generate_chapter(
    transcript: str,
    character_id: str,
    session_metadata: dict
):
    prompt = build_writing_prompt(transcript, character_id, session_metadata)
    
    # Call Claude API
    response = await anthropic.messages.create(
        model="claude-sonnet-4-20250514",  # or opus
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}]
    )
    
    return {"chapter": response.content[0].text}
```

### Step 3: Chapter Delivery

**Options (implement in order of priority):**

1. **Console/Debug** (MVP)
   - Log generated chapter to console
   - Manual copy/paste

2. **Email Delivery**
   - Resend or SendGrid integration
   - User provides email at session end
   - Chapter arrives in inbox

3. **User Journal**
   - Personal page on site
   - All chapters collected
   - Requires user accounts (optional: email-as-ID)

4. **Collective Novel**
   - Anonymized chapters contributed to shared document
   - Curated by author
   - Published as "The Hotel Manuscript"

### Environment Variables Needed

```env
# Add to Railway
ANTHROPIC_API_KEY=sk-ant-...
RESEND_API_KEY=re_...  # for email delivery
```

### File Structure (Planned)

```
backend/
├── server.py              # Existing
├── writing_engine.py      # NEW: Chapter generation logic
├── transcript_store.py    # NEW: Session/transcript storage
└── email_delivery.py      # NEW: Chapter delivery
```

---

## Troubleshooting

### Simli Not Talking
1. Check `ELEVENLABS_API_KEY` in Railway env vars
2. Check console for token fetch errors
3. Verify agentId and faceId are correct

### Simli Not Showing
1. Check console for `[Simli] Token received: yes`
2. Check console for `[BlackRemover] Started processing`
3. Try clicking Connect button manually if visible

### Face Position Wrong
Adjust in CSS:
```css
#face-container {
    width: 55%;   /* Horizontal size */
    height: 70%;  /* Vertical size */
}
```

---

## File Naming Rules
- **No spaces** in filenames (use underscores)
- **No `#` symbols** (breaks URL encoding)
- **Use `.mp4`** for videos (not `.mov` - browser compatibility)

---

*For project vision and design principles, see [HEARSAY.md](HEARSAY.md)*
