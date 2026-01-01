"""
HEARSAY Backend - Simli Token Server
─────────────────────────────────────────────────────────────────────────────
Railway-deployable FastAPI server for Simli token generation.

Endpoints:
    POST /api/simli-token?agentId=xxx&faceId=xxx
    GET  /api/health
    GET  / (serves frontend)

Environment Variables (set in Railway):
    SIMLI_API_KEY - Your Simli API key
    PORT - Railway sets this automatically
"""

import os
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
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
SIMLI_API_URL = os.getenv("SIMLI_API_URL", "https://api.simli.com")
PORT = int(os.getenv("PORT", 8000))

# Path to frontend files (parent directory of backend/)
FRONTEND_DIR = Path(__file__).parent.parent

print(f"[HEARSAY] Frontend directory: {FRONTEND_DIR}")
print(f"[HEARSAY] Frontend directory exists: {FRONTEND_DIR.exists()}")


# ─────────────────────────────────────────────────────────────────────────────
# API ENDPOINTS (defined BEFORE static file mounting)
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    """Health check for Railway monitoring - must respond quickly"""
    return {
        "status": "ok",
        "service": "hearsay",
        "simli_configured": bool(SIMLI_API_KEY)
    }


@app.get("/api/test-simli")
async def test_simli_connection():
    """Debug endpoint to test Simli API connectivity"""
    import socket
    
    results = {
        "api_key_set": bool(SIMLI_API_KEY),
        "api_key_length": len(SIMLI_API_KEY) if SIMLI_API_KEY else 0
    }
    
    # Test DNS resolution
    try:
        ip = socket.gethostbyname("api.simli.com")
        results["dns_resolved"] = True
        results["simli_ip"] = ip
    except socket.gaierror as e:
        results["dns_resolved"] = False
        results["dns_error"] = str(e)
    
    # Test HTTPS connection - try BOTH domains
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    
    # Try simli.AI first (correct domain!)
    for domain in ["api.simli.ai", "api.simli.com"]:
        try:
            async with httpx.AsyncClient(timeout=15.0, headers=headers) as client:
                response = await client.post(
                    f"https://{domain}/getSessionToken",
                    json={"simliAPIKey": "test", "agentId": "test", "faceId": "test"}
                )
                results[f"{domain}_works"] = True
                results[f"{domain}_status"] = response.status_code
                results[f"{domain}_response"] = response.text[:100]
        except Exception as e:
            results[f"{domain}_works"] = False
            results[f"{domain}_error"] = f"{type(e).__name__}: {str(e)}"
    
    # Test with REAL endpoint: /auto/token
    if SIMLI_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=15.0, headers=headers) as client:
                response = await client.post(
                    "https://api.simli.ai/auto/token",
                    json={
                        "simliAPIKey": SIMLI_API_KEY.strip(),
                        "expiryStamp": -1,
                        "createTranscript": True
                    }
                )
                results["auto_token_works"] = True
                results["auto_token_status"] = response.status_code
                results["auto_token_response"] = response.text[:200]
        except Exception as e:
            results["auto_token_works"] = False
            results["auto_token_error"] = f"{type(e).__name__}: {str(e)}"
    
    # Also try httpbin to verify outbound HTTPS works
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get("https://httpbin.org/get")
            results["httpbin_works"] = True
    except Exception as e:
        results["httpbin_works"] = False
        results["httpbin_error"] = str(e)
    
    return results


@app.post("/api/simli-token")
async def get_simli_token(
    agentId: str = Query(..., description="Simli Agent ID"),
    faceId: str = Query(..., description="Simli Face ID")
):
    """
    Generate a session token for the Simli widget.
    Proxies to Simli API, keeping the API key server-side.
    """
    
    if not SIMLI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="SIMLI_API_KEY not configured. Set it in Railway environment variables."
        )
    
    # Correct endpoint: /auto/token (NOT /getSessionToken!)
    simli_url = "https://api.simli.ai/auto/token"
    
    # Strip whitespace from API key
    api_key = SIMLI_API_KEY.strip()
    
    payload = {
        "simliAPIKey": api_key,
        "expiryStamp": -1,  # No expiry
        "createTranscript": True
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    print(f"[HEARSAY] Calling Simli API: {simli_url}")
    print(f"[HEARSAY] Payload (key hidden): expiryStamp=-1, createTranscript=True")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                simli_url,
                json=payload,
                headers=headers
            )
            
            print(f"[HEARSAY] Simli response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"[HEARSAY] Success! Response keys: {list(data.keys())}")
                token = data.get("token") or ""
                if token:
                    return {"token": token, "sessionId": data.get("sessionId", "")}
                else:
                    raise HTTPException(status_code=500, detail="No token in Simli response")
            else:
                print(f"[HEARSAY] Simli error: {response.text[:500]}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Simli API error: {response.text[:200]}"
                )
                
    except httpx.ConnectError as e:
        print(f"[HEARSAY] Connection error: {e}")
        raise HTTPException(status_code=503, detail=f"Cannot connect to Simli API: {str(e)}")
    except httpx.TimeoutException as e:
        print(f"[HEARSAY] Timeout: {e}")
        raise HTTPException(status_code=504, detail=f"Simli API timeout: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[HEARSAY] Unexpected error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


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
        content={"error": "index.html not found", "path": str(index_path)}
    )


# Serve assets folder - only mount if it exists and has content
assets_dir = FRONTEND_DIR / "assets"
if assets_dir.exists() and assets_dir.is_dir():
    try:
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")
        print(f"[HEARSAY] Mounted assets from {assets_dir}")
    except Exception as e:
        print(f"[HEARSAY] Could not mount assets: {e}")


# Serve root-level static files (JS, CSS)
@app.get("/{filename:path}")
async def serve_static(filename: str):
    """Serve static files from frontend directory"""
    
    # Skip API routes (shouldn't reach here but just in case)
    if filename.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")
    
    # Security: prevent directory traversal
    if ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid path")
    
    # Only serve known file types
    allowed_extensions = {'.js', '.css', '.html', '.json', '.ico', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.mp3', '.webm', '.wav', '.ogg'}
    ext = Path(filename).suffix.lower()
    
    if ext not in allowed_extensions:
        raise HTTPException(status_code=404, detail="File not found")
    
    file_path = FRONTEND_DIR / filename
    
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)
    
    raise HTTPException(status_code=404, detail="File not found")


# ─────────────────────────────────────────────────────────────────────────────
# STARTUP EVENT
# ─────────────────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    """Log startup info"""
    print(f"[HEARSAY] ════════════════════════════════════════")
    print(f"[HEARSAY] Server starting on port {PORT}")
    print(f"[HEARSAY] Simli API key configured: {bool(SIMLI_API_KEY)}")
    print(f"[HEARSAY] Frontend directory: {FRONTEND_DIR}")
    print(f"[HEARSAY] Index exists: {(FRONTEND_DIR / 'index.html').exists()}")
    print(f"[HEARSAY] ════════════════════════════════════════")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=PORT,
        log_level="info"
    )
