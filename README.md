# HEARSAY

> Conversational narrative experiences through AI-driven talking heads.

**Current Experience: THE HOTEL**

The owner died six months ago. People keep knocking on your door. You talk to them through the peephole. You decide what to believe.

---

## Quick Start (Railway)

1. **Push to GitHub**
2. **Create Railway project** → Connect GitHub repo
3. **Set environment variable:**
   ```
   SIMLI_API_KEY=your_simli_api_key
   ```
4. **Deploy**

Railway will:
- Detect Python via `requirements.txt`
- Run the FastAPI server via `Procfile`
- Serve frontend files automatically

---

## Project Structure

```
hearsay/
├── index.html              # Main app, video layers, Simli mount
├── styles.css              # Baroque peephole styling
├── config.js               # Character definitions
├── state-machine.js        # State: idle → transitioning → active
├── compositor.js           # Video layer orchestration
├── simli-integration.js    # Simli widget lifecycle
├── Procfile                # Railway start command
├── railway.json            # Railway configuration
├── assets/
│   ├── videos/             # Transition videos, idle loops
│   ├── sounds/             # Knock sounds, ambient audio
│   └── images/             # Door overlay PNG (optional)
└── backend/
    ├── server.py           # FastAPI token server
    └── requirements.txt    # Python dependencies
```

---

## Characters (THE HOTEL)

### Wire (Wiremu Tūhoe)
Night porter. Been here longer than the building, according to him. Speaks in racing idioms and slippery time references.

### Marisol Vance
House detective. Hired for unclear purposes. Keeps records on everyone, including Wire.

*More characters in development.*

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
       idleToActive: ['assets/videos/idle_to_name.mp4'],
       activeToIdle: ['assets/videos/name_to_idle.mp4'],
       knockSound: 'assets/sounds/knock.mp3'
   }
   ```
3. **Add transition videos** to `assets/videos/`

---

## State Flow

```
idle → transitioning-in → active → transitioning-out → idle
  │                                        │
  │  Knock sound                           │
  │  Transition video plays                │
  │  Simli widget created                  │
  │                                        │
  └────────────────────────────────────────┘
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/simli-token` | POST | Generate Simli session token |
| `/api/health` | GET | Health check for Railway |
| `/` | GET | Serve frontend |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SIMLI_API_KEY` | Yes | Simli API key from dashboard |
| `PORT` | Auto | Set by Railway |

---

## Visual Conceit

POV through brass hotel door peephole:
- Fisheye barrel distortion (CSS approximation + optional video bake)
- Circular frame, heavy vignette
- Dark baroque palette (Thom Browne, Delicatessen, Tom Waits)
- The feeling of 2am, uncertain whether to open

---

## Development Notes

- **No backend state** between characters (user is the state)
- **System prompts** live in Simli dashboard, not frontend
- **Hint system** triggers by conversation count (future)
- **Interstitials** (envelopes, texts, footage) planned for v2

---

## Debug

Open browser console:
```javascript
window.hearsay.stateMachine.getState()
window.hearsay.stateMachine.summonCharacter('wire')
window.hearsay.stateMachine.dismissCharacter()
```

---

## License

Private project. Not for distribution.

