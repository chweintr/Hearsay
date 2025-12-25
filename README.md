# HEARSAY

> Unreliable narrators, reliable conversations.

A platform for conversational narrative experiences delivered through AI-driven talking heads.

---

## Platform Structure

```
HEARSAY (platform)
├── Room 412        ← Current experience (peephole conceit)
├── The Gallery     ← Future (portrait frames)
├── The Waiting Room← Future (intake window)
├── The Séance      ← Future (dark mirror)
└── ...
```

---

## Room 412

**"Stories through the door"**

The owner died six months ago. People keep knocking on your door. You talk to them through the peephole. You decide what to believe.

### Visual Conceit
POV through brass hotel door peephole:
- Fisheye barrel distortion
- Circular frame, heavy vignette
- Dark baroque palette (Thom Browne, Delicatessen, Tom Waits)
- The feeling of 2am, uncertain whether to open

### Characters
- **Wire** — Night Porter. Been here longer than the building.
- **Marisol** — House Detective. Hired for unclear purposes.
- *More in development...*

---

## Quick Start (Railway)

1. **Push to GitHub**
2. **Create Railway project** → Connect GitHub repo
3. **Set environment variable:**
   ```
   SIMLI_API_KEY=your_simli_api_key
   ```
4. **Deploy**

---

## Project Structure

```
hearsay/
├── index.html              # Room 412 experience
├── styles.css              # Baroque peephole styling
├── config.js               # Platform, experience, character definitions
├── state-machine.js        # idle → transitioning → active flow
├── compositor.js           # Video layer orchestration
├── simli-integration.js    # Simli widget lifecycle
├── requirements.txt        # Python dependencies (root for Railway)
├── Procfile                # Railway start command
├── railway.json            # Railway configuration
├── nixpacks.toml           # Nixpacks build config
├── assets/
│   ├── videos/             # Transition videos, idle loops
│   ├── sounds/             # Knock sounds, ambient audio
│   └── images/             # Room_412.png, door overlays
└── backend/
    ├── server.py           # FastAPI token server
    └── requirements.txt    # Python deps (backup)
```

---

## Adding Characters

1. **Create Simli agent** at [simli.com](https://simli.com)
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

---

## State Flow

```
idle → transitioning-in → active → transitioning-out → idle
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/simli-token` | POST | Generate Simli session token |
| `/api/health` | GET | Health check for Railway |
| `/` | GET | Serve Room 412 experience |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SIMLI_API_KEY` | Yes | Simli API key |
| `PORT` | Auto | Set by Railway |

---

## Debug Console

```javascript
window.hearsay.stateMachine.getState()
window.hearsay.stateMachine.summonCharacter('wire')
window.hearsay.stateMachine.dismissCharacter()
```

---

## Future Experiences

Each experience uses the same Simli infrastructure with different visual conceits:

| Experience | Visual Frame |
|------------|--------------|
| Room 412 | Peephole, fisheye, brass ring |
| The Gallery | Gilt frames, faces in paintings |
| The Waiting Room | Intake window, plexiglass |
| The Séance | Dark mirror, scrying screen |

---

*Private project. Not for distribution.*
