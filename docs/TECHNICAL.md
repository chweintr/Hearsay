# Technical Documentation

> Developer guide for HEARSAY platform and Room 412 experience.
> 
> **Last Updated:** January 2026

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
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI)                         │
│         POST /api/simli-token → fetch token from Simli       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      SIMLI API                               │
│      https://api.simli.com/getSessionToken                   │
│              (WebRTC, AI conversation, video)                │
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

The experience uses CSS z-index layering. Order matters:

| Z-Index | Layer | Content | Notes |
|---------|-------|---------|-------|
| 0 | `#layer-background` | Hallway video (Background_1.mp4) | Always visible in peephole |
| 10 | `#layer-transition` | Character walkup videos | Plays during summon |
| 20 | `#layer-simli` | Live Simli AI face | Uses `mix-blend-mode: screen` for transparent black |
| 30 | `#layer-peephole` | CSS circular mask | Clips video to circle |
| 40 | `#layer-door-overlay` | overlay.png | Full-screen brass peephole frame |
| 100 | `.animated-text-container` | Animated_Text.mp4 | "A Conversation" - hidden when Simli active |
| var(--z-ui) | UI elements | Buttons, sliders, About modal |

### Key CSS Variable
```css
--peephole-size: min(42vh, 42vw);  /* Size of video circle - adjust to match overlay.png */
```

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

## Simli Widget Integration (IMPORTANT)

### Correct SDK URL
```html
<script src="https://app.simli.com/simli-widget/index.js" defer></script>
```

### Backend Token Request
```python
# POST to https://api.simli.com/getSessionToken
response = await client.post(
    "https://api.simli.com/getSessionToken",
    json={
        "simliAPIKey": SIMLI_API_KEY,  # API key in body, NOT header
        "agentId": agentId,
        "faceId": faceId
    }
)
token = response.json()["sessionToken"]
```

### Frontend Widget Creation
```javascript
const widget = document.createElement('simli-widget');

// Set token attribute
widget.setAttribute('token', sessionToken);

// Set ALL attribute formats (Simli is inconsistent about which it reads)
widget.setAttribute('agentid', agentId);
widget.setAttribute('agent-id', agentId);
widget.setAttribute('agentId', agentId);
widget.setAttribute('faceid', faceId);
widget.setAttribute('face-id', faceId);
widget.setAttribute('faceId', faceId);

// Also set as direct properties
widget.agentId = agentId;
widget.faceId = faceId;

// Mount
document.getElementById('simli-mount').appendChild(widget);

// Auto-click Start button (Simli shows a button overlay)
setTimeout(() => {
    widget.querySelectorAll('button').forEach(btn => btn.click());
}, 500);
```

### CSS to Hide Simli UI, Show Video
```css
#simli-mount simli-widget button,
#simli-mount simli-widget svg,
#simli-mount simli-widget [class*="placeholder"] {
    display: none !important;
}

#simli-mount simli-widget video {
    display: block !important;
}
```

---

## Character Configuration

Characters are defined in `config.js`:

```javascript
wire: {
    name: 'Wire',
    role: 'Long-Time Resident',
    agentId: '2439209e-abb8-4ccc-ab18-2bbbfc78d4f6',
    faceId: 'bc603b3f-d355-424d-b613-d7db4588cb8a',
    idleToActive: ['assets/videos/Wire_Walkup_2.mp4'],
    activeToIdle: ['assets/videos/Wire_Walkup_2.mp4'],
    knockSound: 'assets/sounds/door_knocks/knock_hotel_1.wav',
    previewVideo: 'assets/videos/Wire_Walkup_2.mp4'
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
3. `transitionStart` event emitted
4. Compositor plays walkup video + knock sound
5. Video ends → `onTransitionInComplete()`
6. `transitionEnd` event emitted
7. SimliIntegration creates widget, fetches token
8. Simli face appears (if everything works)

---

## Deployment (Railway)

### Environment Variables Required

| Variable | Required | Description |
|----------|----------|-------------|
| `SIMLI_API_KEY` | **Yes** | From Simli dashboard |
| `PORT` | Auto | Set by Railway |

### Health Check
```
GET /api/health
Response: {"status": "ok", "service": "hearsay", "simli_configured": true}
```

If `simli_configured: false`, the API key is not set.

---

## Debug Console

```javascript
// Access app state
window.hearsay.stateMachine.getState()

// Manually summon character
window.hearsay.stateMachine.summonCharacter('wire')

// Reset to idle
window.hearsay.stateMachine.reset()

// Check characters
window.hearsay.characters
```

---

## Known Issues & Current State (Jan 2026)

### Working ✓
- Landing page with character gallery
- Background video looping
- Animated text overlay ("A Conversation")
- Music and ambient audio with sliders
- Door knock sounds per character
- About modal
- Character walkup videos play on summon

### In Progress / Issues
- **Simli integration**: Token fetch and widget creation flow implemented, needs testing
- **Peephole sizing**: `--peephole-size` variable needs fine-tuning to match overlay.png
- **Text styling**: Billiard green with pink outline for readability

### File Naming Rules
- **No spaces** in filenames (use underscores)
- **No `#` symbols** (breaks URL encoding)
- **Use `.mp4`** for videos (not `.mov` - browser compatibility)

---

## Text Styling (Current)

Character names use billiard green (`#1a5c3a`) with pink outline (`#e84a8a`):

```css
.character-name {
    color: #1a5c3a;
    text-shadow: 
        -1px -1px 0 #e84a8a,
        1px -1px 0 #e84a8a,
        -1px 1px 0 #e84a8a,
        1px 1px 0 #e84a8a;
}
```

---

*For project vision and design principles, see [HEARSAY.md](HEARSAY.md)*
