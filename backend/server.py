"""
HEARSAY Backend - Simli Token Server + Writing Engine
─────────────────────────────────────────────────────────────────────────────
Railway-deployable FastAPI server for Simli token generation, transcript retrieval,
and chapter generation via Claude Opus.

Endpoints:
    POST /api/simli-token?agentId=xxx&faceId=xxx  → Get session token + sessionId
    GET  /api/simli-transcript/{session_id}       → Retrieve transcript after session
    POST /api/writing-engine/generate             → Generate chapter from transcripts
    GET  /api/health                               → Health check
    GET  / (serves frontend)

Environment Variables (set in Railway):
    SIMLI_API_KEY - Your Simli API key
    ELEVENLABS_API_KEY - ElevenLabs API key for TTS
    ANTHROPIC_API_KEY - Anthropic API key for Writing Engine
    PORT - Railway sets this automatically
"""

import os
import uuid
import asyncio
from pathlib import Path
from datetime import datetime
from fastapi import FastAPI, HTTPException, Query, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict
import httpx

app = FastAPI(
    title="HEARSAY Backend",
    description="Token server for Simli AI talking heads",
    version="0.1.0"
)

# CORS for development (Railway handles production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration from environment
SIMLI_API_KEY = os.getenv("SIMLI_API_KEY", "")
SIMLI_API_URL = os.getenv("SIMLI_API_URL", "https://api.simli.ai")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
PORT = int(os.getenv("PORT", 8000))

# Path to frontend files (parent directory of backend/)
FRONTEND_DIR = Path(__file__).parent.parent
PROMPTS_DIR = Path(__file__).parent / "prompts"
AUDIO_DIR = Path(__file__).parent / "audio_uploads"

# Ensure audio directory exists
AUDIO_DIR.mkdir(exist_ok=True)

# In-memory job tracking (for production, use Redis or database)
chapter_jobs: Dict[str, dict] = {}

# Whisper model (lazy loaded)
whisper_model = None

def get_whisper_model():
    """Lazy load Whisper model"""
    global whisper_model
    if whisper_model is None:
        try:
            from faster_whisper import WhisperModel
            # Use 'base' model - good balance of speed and accuracy
            # Use CPU since Railway may not have GPU
            whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
            print("[HEARSAY] Whisper model loaded (base, cpu)")
        except ImportError:
            print("[HEARSAY] Warning: faster-whisper not installed. Audio transcription disabled.")
            return None
        except Exception as e:
            print(f"[HEARSAY] Warning: Failed to load Whisper: {e}")
            return None
    return whisper_model

# Load Writing Engine system prompt
WRITING_ENGINE_PROMPT = ""
prompt_path = PROMPTS_DIR / "writing_engine.md"
if prompt_path.exists():
    WRITING_ENGINE_PROMPT = prompt_path.read_text()
    print(f"[HEARSAY] Writing Engine prompt loaded: {len(WRITING_ENGINE_PROMPT)} chars")
else:
    print(f"[HEARSAY] Warning: Writing Engine prompt not found at {prompt_path}")


# ─────────────────────────────────────────────────────────────────────────────
# API ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/simli-token")
async def get_simli_token(
    agentId: str = Query(..., description="Simli Agent ID"),
    faceId: str = Query(..., description="Simli Face ID")
):
    """
    Generate a session token for the Simli widget.
    Uses /auto/token - LLM/TTS keys are configured in each agent in Simli dashboard.
    """
    
    if not SIMLI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="SIMLI_API_KEY not configured. Set it in Railway environment variables."
        )
    
    try:
        async with httpx.AsyncClient() as client:
            
            # Clean API key
            simli_key = SIMLI_API_KEY.strip().replace('\n', '').replace('\r', '').replace(' ', '')
            
            # Full payload per Simli docs - including TTS key for voice!
            elevenlabs_key = ELEVENLABS_API_KEY.strip().replace('\n', '').replace('\r', '') if ELEVENLABS_API_KEY else ""
            
            payload = {
                "simliAPIKey": simli_key,
                "agentId": agentId,
                "faceId": faceId,
                "ttsAPIKey": elevenlabs_key,  # CRITICAL: Without this, no voice!
                "expiryStamp": -1,  # -1 means no expiry
                "createTranscript": True  # Enable transcript for Writing Engine
            }
            
            # Log what we're sending (without exposing full keys)
            print(f"[HEARSAY] ttsAPIKey present: {bool(elevenlabs_key)}, length: {len(elevenlabs_key)}")
            
            print(f"[HEARSAY] Calling /auto/token for agent {agentId}")
            
            response = await client.post(
                f"{SIMLI_API_URL}/auto/token",
                headers={
                    "Content-Type": "application/json"
                },
                json=payload,
                timeout=30.0
            )
            
            if response.status_code != 200:
                print(f"[HEARSAY] Simli API error: {response.status_code}")
                print(f"[HEARSAY] Response: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Simli API error: {response.text}"
                )
            
            data = response.json()
            print(f"[HEARSAY] Simli response for {agentId}: {data}")
            
            # Simli may return token as 'sessionToken', 'session_token', or 'token'
            token = data.get("sessionToken") or data.get("session_token") or data.get("token") or ""
            
            # Capture sessionId for transcript retrieval later
            session_id = data.get("sessionId") or data.get("session_id") or ""
            if session_id:
                print(f"[HEARSAY] Session ID (for transcript): {session_id}")
            
            if not token:
                print(f"[HEARSAY] No token in response: {data}")
                raise HTTPException(
                    status_code=500,
                    detail="No token in Simli response"
                )
            
            # Return both token and sessionId (frontend needs sessionId for transcript retrieval)
            return {
                "token": token,
                "sessionId": session_id  # Store this to retrieve transcript later
            }
            
    except httpx.RequestError as e:
        print(f"[HEARSAY] Request error: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Failed to connect to Simli API: {str(e)}"
        )


@app.get("/api/simli-transcript/{session_id}")
async def get_transcript(session_id: str):
    """
    Retrieve transcript for a completed Simli session.
    Call this after the conversation ends (not during).
    
    The transcript is used by the Writing Engine to narrativize conversations.
    """
    
    if not SIMLI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="SIMLI_API_KEY not configured"
        )
    
    if not session_id:
        raise HTTPException(
            status_code=400,
            detail="session_id is required"
        )
    
    print(f"[HEARSAY] Fetching transcript for session: {session_id}")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.simli.ai/auto/transcript/{session_id}",
                headers={
                    "api-key": SIMLI_API_KEY.strip(),
                    "Content-Type": "application/json"
                },
                timeout=30.0
            )
            
            print(f"[HEARSAY] Transcript response status: {response.status_code}")
            
            if response.status_code == 404:
                # Transcript may not be ready yet, or session doesn't exist
                return JSONResponse(
                    status_code=202,  # Accepted - try again later
                    content={
                        "status": "pending",
                        "message": "Transcript not yet available. Try again in a few seconds.",
                        "sessionId": session_id
                    }
                )
            
            if response.status_code != 200:
                print(f"[HEARSAY] Transcript error: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Simli transcript error: {response.text}"
                )
            
            data = response.json()
            print(f"[HEARSAY] Transcript retrieved successfully for {session_id}")
            
            return {
                "status": "complete",
                "sessionId": session_id,
                "transcript": data
            }
            
    except httpx.RequestError as e:
        print(f"[HEARSAY] Transcript request error: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Failed to retrieve transcript: {str(e)}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# AUDIO UPLOAD & TRANSCRIPTION
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/upload-audio")
async def upload_audio(
    background_tasks: BackgroundTasks,
    sessionId: str = Form(...),
    characterId: str = Form(...),
    characterName: str = Form(...),
    duration: str = Form(...),
    timestamp: str = Form(...),
    audio: UploadFile = File(...)
):
    """
    Upload recorded audio from a conversation.
    Audio will be transcribed by Whisper in the background.
    """
    
    # Create session directory
    session_dir = AUDIO_DIR / sessionId
    session_dir.mkdir(exist_ok=True)
    
    # Generate unique filename
    audio_id = str(uuid.uuid4())[:8]
    file_ext = Path(audio.filename).suffix or ".webm"
    audio_filename = f"{characterId}_{timestamp}_{audio_id}{file_ext}"
    audio_path = session_dir / audio_filename
    
    # Save audio file
    try:
        contents = await audio.read()
        with open(audio_path, "wb") as f:
            f.write(contents)
        
        print(f"[HEARSAY] Audio saved: {audio_path} ({len(contents) / 1024:.1f} KB)")
    except Exception as e:
        print(f"[HEARSAY] Audio save failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save audio: {e}")
    
    # Create metadata file
    metadata = {
        "sessionId": sessionId,
        "characterId": characterId,
        "characterName": characterName,
        "duration": int(duration),
        "timestamp": int(timestamp),
        "filename": audio_filename,
        "status": "pending_transcription",
        "transcript": None
    }
    
    metadata_path = session_dir / f"{audio_filename}.json"
    import json
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    
    # Queue transcription in background
    background_tasks.add_task(transcribe_audio_file, str(audio_path), str(metadata_path))
    
    return {
        "status": "queued",
        "audioId": audio_id,
        "filename": audio_filename,
        "sessionId": sessionId,
        "characterId": characterId
    }


async def transcribe_audio_file(audio_path: str, metadata_path: str):
    """
    Background task to transcribe audio using Whisper.
    """
    import json
    
    print(f"[HEARSAY] Transcribing: {audio_path}")
    
    model = get_whisper_model()
    if model is None:
        print("[HEARSAY] Whisper not available, skipping transcription")
        return
    
    try:
        # Transcribe with Whisper
        segments, info = model.transcribe(audio_path, beam_size=5)
        
        # Combine all segments into transcript
        transcript_parts = []
        for segment in segments:
            transcript_parts.append(segment.text.strip())
        
        full_transcript = " ".join(transcript_parts)
        
        print(f"[HEARSAY] Transcription complete: {len(full_transcript)} chars")
        print(f"[HEARSAY] Language: {info.language}, Probability: {info.language_probability:.2f}")
        
        # Update metadata file
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
        
        metadata["status"] = "transcribed"
        metadata["transcript"] = full_transcript
        metadata["language"] = info.language
        metadata["languageProb"] = info.language_probability
        
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)
        
    except Exception as e:
        print(f"[HEARSAY] Transcription error: {e}")
        
        # Update metadata with error
        try:
            with open(metadata_path, "r") as f:
                metadata = json.load(f)
            metadata["status"] = "error"
            metadata["error"] = str(e)
            with open(metadata_path, "w") as f:
                json.dump(metadata, f, indent=2)
        except:
            pass


@app.get("/api/session-transcripts/{session_id}")
async def get_session_transcripts(session_id: str):
    """
    Get all transcripts for a session.
    Used by the Writing Engine to gather conversation data.
    """
    import json
    
    session_dir = AUDIO_DIR / session_id
    if not session_dir.exists():
        return {"sessionId": session_id, "conversations": [], "status": "no_audio"}
    
    conversations = []
    pending = 0
    
    # Find all metadata files
    for metadata_file in session_dir.glob("*.json"):
        try:
            with open(metadata_file, "r") as f:
                metadata = json.load(f)
            
            if metadata.get("status") == "pending_transcription":
                pending += 1
            
            conversations.append({
                "characterId": metadata.get("characterId"),
                "characterName": metadata.get("characterName"),
                "timestamp": metadata.get("timestamp"),
                "duration": metadata.get("duration"),
                "status": metadata.get("status"),
                "transcript": metadata.get("transcript")
            })
        except Exception as e:
            print(f"[HEARSAY] Error reading metadata {metadata_file}: {e}")
    
    # Sort by timestamp
    conversations.sort(key=lambda x: x.get("timestamp", 0))
    
    return {
        "sessionId": session_id,
        "conversations": conversations,
        "pendingCount": pending,
        "status": "complete" if pending == 0 else "processing"
    }


# ─────────────────────────────────────────────────────────────────────────────
# WRITING ENGINE
# ─────────────────────────────────────────────────────────────────────────────

class TranscriptEntry(BaseModel):
    """A single message in a conversation transcript"""
    speaker: str  # 'user' or character name
    text: str

class Conversation(BaseModel):
    """A conversation with one character"""
    character: str
    role: Optional[str] = None
    timestamp: str
    transcript: List[TranscriptEntry] | str  # Can be list or raw string

class ChapterRequest(BaseModel):
    """Request to generate a chapter from session transcripts"""
    sessionId: str
    transcripts: List[Conversation]
    previousChapters: Optional[List[str]] = []
    chapterLength: Optional[str] = "medium"  # short, medium, long


@app.post("/api/writing-engine/generate")
async def generate_chapter(request: ChapterRequest):
    """
    Generate a literary chapter from conversation transcripts using Claude Opus.
    
    This is the heart of the Writing Engine. It takes raw Simli transcripts
    and transforms them into narrativized prose.
    """
    
    if not ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="ANTHROPIC_API_KEY not configured. Set it in Railway environment variables."
        )
    
    if not WRITING_ENGINE_PROMPT:
        raise HTTPException(
            status_code=500,
            detail="Writing Engine prompt not loaded. Check backend/prompts/writing_engine.md"
        )
    
    if not request.transcripts or len(request.transcripts) == 0:
        raise HTTPException(
            status_code=400,
            detail="No transcripts provided"
        )
    
    print(f"[HEARSAY] Generating chapter for session {request.sessionId}")
    print(f"[HEARSAY] Conversations: {len(request.transcripts)}")
    
    try:
        # Format transcripts for the prompt
        formatted_transcripts = []
        for conv in request.transcripts:
            formatted = f"\n--- Conversation with {conv.character}"
            if conv.role:
                formatted += f" ({conv.role})"
            formatted += f" ---\nTime: {conv.timestamp}\n\n"
            
            # Handle transcript format (could be list or string)
            if isinstance(conv.transcript, list):
                for entry in conv.transcript:
                    if isinstance(entry, dict):
                        speaker = entry.get('speaker', 'unknown')
                        text = entry.get('text', '')
                    else:
                        speaker = entry.speaker
                        text = entry.text
                    formatted += f"[{speaker}]: {text}\n"
            else:
                # Already a string
                formatted += conv.transcript
            
            formatted_transcripts.append(formatted)
        
        transcripts_text = "\n".join(formatted_transcripts)
        
        # Build the user message
        user_message = f"""Please write a chapter based on the following conversation transcripts from tonight's session.

SESSION: {request.sessionId}
CONVERSATION COUNT: {len(request.transcripts)}
REQUESTED LENGTH: {request.chapterLength} (~{"1000" if request.chapterLength == "short" else "2000" if request.chapterLength == "medium" else "3500"} words)

{transcripts_text}

---

Write the chapter now. Remember:
- Preserve actual dialogue (may polish for flow)
- Add setting, interiority, sensory detail
- Weave multiple conversations into one coherent chapter
- Ground us in Room 412, the peephole, the hallway
- End with an image, not a cliffhanger or closure"""

        # Include previous chapters if provided (for continuity)
        if request.previousChapters and len(request.previousChapters) > 0:
            prev_chapters_text = "\n\n---\n\n".join(request.previousChapters[-2:])  # Last 2 chapters
            user_message = f"""PREVIOUS CHAPTERS (for continuity):

{prev_chapters_text}

---

NOW, for tonight's session:

{user_message}"""

        # Call Claude Opus
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY.strip(),
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": "claude-opus-4-20250514",
                    "max_tokens": 8192,
                    "system": WRITING_ENGINE_PROMPT,
                    "messages": [
                        {"role": "user", "content": user_message}
                    ]
                },
                timeout=120.0  # Opus can take a while
            )
            
            if response.status_code != 200:
                print(f"[HEARSAY] Anthropic API error: {response.status_code}")
                print(f"[HEARSAY] Response: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Anthropic API error: {response.text}"
                )
            
            data = response.json()
            
            # Extract the chapter text
            chapter_content = ""
            if data.get("content"):
                for block in data["content"]:
                    if block.get("type") == "text":
                        chapter_content += block.get("text", "")
            
            if not chapter_content:
                raise HTTPException(
                    status_code=500,
                    detail="No chapter content in Anthropic response"
                )
            
            # Generate chapter ID
            chapter_id = str(uuid.uuid4())
            
            # Count words
            word_count = len(chapter_content.split())
            
            # Extract character names from transcripts
            characters = list(set([t.character for t in request.transcripts]))
            
            print(f"[HEARSAY] Chapter generated: {word_count} words, {len(characters)} characters")
            
            return {
                "chapterId": chapter_id,
                "sessionId": request.sessionId,
                "content": chapter_content,
                "wordCount": word_count,
                "charactersIncluded": characters,
                "generatedAt": datetime.utcnow().isoformat() + "Z"
            }
            
    except httpx.RequestError as e:
        print(f"[HEARSAY] Writing Engine request error: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Failed to connect to Anthropic API: {str(e)}"
        )


@app.post("/api/writing-engine/generate-from-audio")
async def generate_chapter_from_audio(
    background_tasks: BackgroundTasks,
    session_id: str = Form(...)
):
    """
    Generate a chapter from audio transcripts.
    This is the main entry point for the Writing Engine.
    
    1. Checks all audio has been transcribed
    2. Gathers transcripts
    3. Generates chapter with Claude
    4. Returns job ID for status polling
    """
    import json
    
    # Check session exists
    session_dir = AUDIO_DIR / session_id
    if not session_dir.exists():
        raise HTTPException(status_code=404, detail="No audio found for this session")
    
    # Gather all transcripts
    conversations = []
    pending = 0
    
    for metadata_file in session_dir.glob("*.json"):
        try:
            with open(metadata_file, "r") as f:
                metadata = json.load(f)
            
            if metadata.get("status") == "pending_transcription":
                pending += 1
                continue
            
            if metadata.get("transcript"):
                conversations.append({
                    "character": metadata.get("characterName", "Unknown"),
                    "role": None,
                    "timestamp": datetime.fromtimestamp(metadata.get("timestamp", 0) / 1000).isoformat(),
                    "transcript": metadata.get("transcript")
                })
        except Exception as e:
            print(f"[HEARSAY] Error reading {metadata_file}: {e}")
    
    if pending > 0:
        return JSONResponse(
            status_code=202,
            content={
                "status": "waiting",
                "message": f"Still transcribing {pending} conversation(s). Try again in a moment.",
                "pendingCount": pending
            }
        )
    
    if len(conversations) == 0:
        raise HTTPException(status_code=400, detail="No transcripts available for this session")
    
    # Sort by timestamp
    conversations.sort(key=lambda x: x.get("timestamp", ""))
    
    # Create job
    job_id = str(uuid.uuid4())
    chapter_jobs[job_id] = {
        "status": "processing",
        "sessionId": session_id,
        "startedAt": datetime.utcnow().isoformat(),
        "conversations": len(conversations),
        "chapter": None,
        "error": None
    }
    
    # Queue chapter generation in background
    background_tasks.add_task(generate_chapter_background, job_id, session_id, conversations)
    
    return {
        "status": "processing",
        "jobId": job_id,
        "sessionId": session_id,
        "conversations": len(conversations),
        "message": "The hotel is writing your chapter..."
    }


async def generate_chapter_background(job_id: str, session_id: str, conversations: list):
    """
    Background task to generate a chapter from transcripts.
    """
    
    try:
        print(f"[HEARSAY] Generating chapter for job {job_id}")
        
        # Format transcripts for Claude
        formatted_transcripts = []
        for conv in conversations:
            formatted = f"\n--- Conversation with {conv['character']} ---\n"
            formatted += f"Time: {conv['timestamp']}\n\n"
            
            # Format as dialogue (user is speaking to character)
            # Note: We only have user's speech from Whisper
            formatted += f"Occupant of 412: {conv['transcript']}\n"
            formatted += f"[{conv['character']} responds - content inferred from conversation flow]\n"
            
            formatted_transcripts.append(formatted)
        
        transcripts_text = "\n".join(formatted_transcripts)
        
        # Build prompt
        user_message = f"""Please write a chapter based on the following conversation transcripts from tonight's session.

Note: These transcripts capture the occupant's side of the conversation (what they said aloud).
The character's responses should be inferred from the flow and context of the occupant's words.

SESSION: {session_id}
CONVERSATION COUNT: {len(conversations)}

{transcripts_text}

---

Write the chapter now. Remember:
- The transcripts show what the occupant said; imagine what the characters said in response
- Add setting, interiority, sensory detail
- Weave multiple conversations into one coherent chapter
- Ground us in Room 412, the peephole, the hallway
- End with an image, not a cliffhanger or closure"""

        # Call Claude
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY.strip(),
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": "claude-opus-4-20250514",
                    "max_tokens": 8192,
                    "system": WRITING_ENGINE_PROMPT,
                    "messages": [
                        {"role": "user", "content": user_message}
                    ]
                },
                timeout=180.0  # 3 minutes for Opus
            )
            
            if response.status_code != 200:
                raise Exception(f"Anthropic API error: {response.status_code} - {response.text}")
            
            data = response.json()
            
            # Extract chapter
            chapter_content = ""
            if data.get("content"):
                for block in data["content"]:
                    if block.get("type") == "text":
                        chapter_content += block.get("text", "")
            
            if not chapter_content:
                raise Exception("No chapter content in response")
            
            # Update job
            chapter_jobs[job_id] = {
                "status": "complete",
                "sessionId": session_id,
                "completedAt": datetime.utcnow().isoformat(),
                "chapter": chapter_content,
                "wordCount": len(chapter_content.split()),
                "characters": [c["character"] for c in conversations]
            }
            
            print(f"[HEARSAY] Chapter complete for job {job_id}: {len(chapter_content.split())} words")
            
    except Exception as e:
        print(f"[HEARSAY] Chapter generation error: {e}")
        chapter_jobs[job_id] = {
            "status": "error",
            "sessionId": session_id,
            "error": str(e)
        }


@app.get("/api/writing-engine/status/{job_id}")
async def get_chapter_status(job_id: str):
    """
    Check status of a chapter generation job.
    """
    if job_id not in chapter_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return chapter_jobs[job_id]


@app.get("/api/health")
async def health_check():
    """Health check for Railway monitoring"""
    return {
        "status": "ok",
        "service": "hearsay",
        "simli_configured": bool(SIMLI_API_KEY),
        "openai_configured": bool(OPENAI_API_KEY),
        "elevenlabs_configured": bool(ELEVENLABS_API_KEY),
        "anthropic_configured": bool(ANTHROPIC_API_KEY),
        "writing_engine_ready": bool(WRITING_ENGINE_PROMPT)
    }


# ─────────────────────────────────────────────────────────────────────────────
# STATIC FILE SERVING
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/")
async def serve_index():
    """Serve main index.html"""
    index_path = FRONTEND_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return JSONResponse(
        status_code=404,
        content={"error": "index.html not found"}
    )


# Serve assets folder
assets_dir = FRONTEND_DIR / "assets"
if assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")


# Serve root-level static files (JS, CSS)
@app.get("/{filename:path}")
async def serve_static(filename: str):
    """Serve static files from frontend directory"""
    
    # Security: prevent directory traversal
    if ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid path")
    
    # Only serve known file types
    allowed_extensions = {'.js', '.css', '.html', '.json', '.ico', '.png', '.jpg', '.mp4', '.mp3', '.webm'}
    ext = Path(filename).suffix.lower()
    
    if ext not in allowed_extensions:
        raise HTTPException(status_code=404, detail="File not found")
    
    file_path = FRONTEND_DIR / filename
    
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)
    
    raise HTTPException(status_code=404, detail="File not found")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    
    print(f"[HEARSAY] Starting server on port {PORT}")
    print(f"[HEARSAY] Simli API key configured: {bool(SIMLI_API_KEY)}")
    print(f"[HEARSAY] Frontend directory: {FRONTEND_DIR}")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=PORT,
        log_level="info"
    )

