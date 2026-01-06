# Simli Integration — Critical Reference

> **READ THIS FIRST** if Simli faces show but don't talk!

---

## The Most Common Fix

**Problem:** Face appears, but no voice/conversation  
**Cause:** Missing `ttsAPIKey` in token request  
**Solution:** Include ElevenLabs API key in the payload

```python
# backend/server.py - Token endpoint payload
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

## Complete Working Flow

### 1. Backend Token Request

```python
POST https://api.simli.ai/auto/token

{
    "simliAPIKey": "your-simli-api-key",
    "agentId": "uuid-from-simli-dashboard",
    "faceId": "uuid-from-simli-dashboard", 
    "ttsAPIKey": "your-elevenlabs-api-key",  # CRITICAL!
    "expiryStamp": -1,
    "createTranscript": true
}
```

### 2. Frontend Widget Setup

```javascript
// Load the widget SDK
<script src="https://app.simli.com/simli-widget/index.js" defer></script>

// Create widget
const widget = document.createElement('simli-widget');
widget.setAttribute('token', sessionToken);
widget.setAttribute('agentid', agentId);
widget.setAttribute('faceid', faceId);
container.appendChild(widget);

// Auto-click Start button (widget requires this)
setTimeout(() => {
    widget.querySelectorAll('button').forEach(btn => {
        if (btn.textContent.toLowerCase().includes('start') || 
            btn.textContent.toLowerCase().includes('connect')) {
            btn.click();
        }
    });
}, 800);
```

### 3. Required Environment Variables (Railway)

```
SIMLI_API_KEY=your-simli-api-key
ELEVENLABS_API_KEY=your-elevenlabs-api-key
OPENAI_API_KEY=your-openai-api-key (if using OpenAI for LLM)
```

---

## Troubleshooting Checklist

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Face shows, no voice | Missing `ttsAPIKey` | Add ElevenLabs key to payload |
| No face, 404 error | Wrong agentId/faceId | Verify UUIDs from Simli dashboard |
| Face shows, no response | Missing `simliAPIKey` | Check backend env var |
| "Already joined meeting" warning | Multiple join attempts | Only click Start button once |
| 422 error | Wrong field name | Use `simliAPIKey` not `apiKey` |
| 2x2 video dimensions | Widget not initialized | Wait for video to load before processing |
| Transcription works but no reply | LLM not configured | Check agent config in Simli dashboard |

---

## API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /auto/token` | Get session token (use this one) |
| `GET /auto/transcript/{session_id}` | Retrieve conversation transcript |
| `GET /session/{agentId}/{token}` | Get Daily.co room URL (internal) |

---

## Key IDs Needed Per Character

```javascript
{
    agentId: "uuid",  // Conversational AI agent (has prompt, LLM config)
    faceId: "uuid"    // Visual avatar face
}
```

Both come from Simli dashboard. Agent contains the prompt and LLM settings.

---

## Alternative Architecture (simli-client)

If the widget approach fails, there's a more manual approach using:
- `simli-client` npm package (for face video only)
- `realtime-ai` + `realtime-ai-daily` (for conversation)
- Requires `DAILY_BOTS_KEY`
- See `/Volumes/T7/simli-reference/` for example

The widget approach is simpler and works for HEARSAY.

---

## Quick Diagnostic Commands

```javascript
// Check if audio element exists and isn't muted
document.querySelector('simli-widget')?.shadowRoot?.querySelector('audio')

// Check video dimensions (should be 512x512, not 2x2)
const video = document.querySelector('simli-widget')?.shadowRoot?.querySelector('video');
console.log(video?.videoWidth, video?.videoHeight);

// Check if Start button was clicked
// Look for "Successfully joined" in console
```

---

**Last Updated:** January 2026  
**Fix Verified:** ttsAPIKey addition enables voice output

