# Technical Documentation

> Developer guide for HEARSAY platform and Room 412 experience.

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
│   ├── videos/             # Background loops, character transitions
│   ├── sounds/             # Knock sounds, ambient audio
│   └── images/             # Splash images, overlays
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

## Deployment (Railway)

### Initial Setup

1. Push repo to GitHub
2. Create new Railway project → Deploy from GitHub repo
3. Add environment variable:
   ```
   SIMLI_API_KEY=your_simli_api_key_from_dashboard
   ```
4. Railway auto-detects Python, installs deps, runs server

### How It Works

- Railway reads `requirements.txt` in root → installs Python deps
- `Procfile` tells Railway to run: `cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT`
- FastAPI serves both API endpoints and static frontend files
- Health check: `GET /api/health`

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SIMLI_API_KEY` | Yes | From Simli dashboard |
| `PORT` | Auto | Set by Railway |
| `SIMLI_API_URL` | No | Override Simli API endpoint (default: `https://api.simli.ai/v1`) |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/simli-token?agentId=xxx&faceId=xxx` | POST | Generate session token for Simli widget |
| `GET /api/health` | GET | Health check (returns `{"status": "ok"}`) |
| `GET /` | GET | Serve index.html |
| `GET /{path}` | GET | Serve static files (JS, CSS, assets) |

### Token Request Example

```bash
curl -X POST "https://your-app.railway.app/api/simli-token?agentId=abc123&faceId=def456"
# Response: {"token": "session_token_here"}
```

---

## State Machine

The app uses a simple state machine pattern. States flow in one direction:

```
idle → transitioning-in → active → transitioning-out → idle
```

### States

| State | Description |
|-------|-------------|
| `idle` | No one at door. Landing page or empty peephole. |
| `transitioning-in` | Playing approach/knock video. |
| `active` | Simli widget visible. Character is speaking. |
| `transitioning-out` | Playing departure video. Destroying widget. |

### Events Emitted

- `stateChange` — `{ from, to, character }`
- `characterSummoned` — `{ character }`
- `characterDismissed` — `{ character }`
- `transitionStart` — `{ type: 'in' | 'out', character }`
- `transitionEnd` — `{ type: 'in' | 'out', character }`

---

## Adding Characters

### 1. Create Simli Agent

Go to [simli.com](https://simli.com) dashboard:
- Create new agent with system prompt
- Note the `agentId` and `faceId`

### 2. Add to config.js

```javascript
newcharacter: {
    name: 'Display Name',
    role: 'Their Role',
    agentId: 'simli_agent_id',      // From Simli dashboard
    faceId: 'simli_face_id',        // From Simli dashboard
    idleToActive: ['assets/videos/idle_to_name.mp4'],
    activeToIdle: ['assets/videos/name_to_idle.mp4'],
    knockSound: 'assets/sounds/knock.mp3',
    previewVideo: 'assets/videos/name_preview.mp4'  // For landing gallery
}
```

### 3. Add Video Assets

- **Transition in:** Character approaching door (plays when summoned)
- **Transition out:** Character leaving (plays when dismissed)
- **Preview:** Looping clip for character gallery on landing page

---

## Video Layer Stack

The compositor manages video layers (bottom to top):

| Z-Index | Layer | Content |
|---------|-------|---------|
| 0 | Background | Idle loop (empty hallway) |
| 10 | Transition | Approach/departure videos |
| 20 | Simli | Live AI talking head |
| 30 | Peephole | Brass ring, fisheye distortion (CSS) |
| 40 | Door overlay | Optional PNG hardware overlay |
| 50 | Vignette | Heavy edge darkening |
| 100 | UI | Buttons, character info |

---

## Debug Console

Open browser dev tools and access:

```javascript
// Get current state
window.hearsay.stateMachine.getState()

// Manually summon a character
window.hearsay.stateMachine.summonCharacter('wire')

// Dismiss current character
window.hearsay.stateMachine.dismissCharacter()

// Reset to idle
window.hearsay.stateMachine.reset()

// Access config
window.hearsay.characters
window.hearsay.config
```

---

## Simli Widget Integration

The Simli widget is created dynamically when a character is summoned:

```javascript
// Fetch token from our backend
const token = await fetch(`/api/simli-token?agentId=${agentId}&faceId=${faceId}`, 
    { method: 'POST' }).then(r => r.json());

// Create widget element
const widget = document.createElement('simli-widget');
widget.setAttribute('agent-id', agentId);
widget.setAttribute('face-id', faceId);
widget.setAttribute('session-token', token.token);

// Listen for events
widget.addEventListener('simli-ready', () => { /* video stream active */ });
widget.addEventListener('simli-error', (e) => { /* handle error */ });
widget.addEventListener('simli-ended', () => { /* session ended */ });

// Mount
document.getElementById('simli-mount').appendChild(widget);
```

### Destroying Widget

```javascript
if (typeof widget.destroy === 'function') {
    widget.destroy();
}
widget.remove();
```

---

## Troubleshooting

### Railway Deploy Fails

- Check `requirements.txt` is in root (not just in `backend/`)
- Check Railway logs for Python version issues
- Verify `Procfile` command is correct

### Simli Widget Not Loading

- Check browser console for errors
- Verify `SIMLI_API_KEY` is set in Railway
- Test `/api/health` endpoint returns `simli_configured: true`
- Try Simli's demo directly to rule out their service issues

### "Transport Disconnected" Errors

This is Simli's WebRTC layer, not our code:
- Check network/firewall (WebRTC needs specific ports)
- Try different network (phone hotspot)
- Contact Simli support with the Room URL from console

### Video Not Playing

- Check browser autoplay policy (videos must be muted)
- Verify video file exists at correct path
- Check browser console for 404 errors

---

## Local Development

```bash
# Install Python deps
cd backend
pip install -r requirements.txt

# Run server
uvicorn server:app --reload --port 8000

# Open browser
open http://localhost:8000
```

Note: You'll need `SIMLI_API_KEY` in environment or a `.env` file.

---

*For project vision and design principles, see [HEARSAY.md](HEARSAY.md)*

