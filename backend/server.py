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
    
    # Test HTTPS connection with relaxed SSL (for debugging)
    try:
        import ssl
        # Try with default SSL first
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("https://api.simli.com/")
            results["https_connection"] = True
            results["https_status"] = response.status_code
    except httpx.ConnectError as e:
        results["https_connection"] = False
        results["https_error"] = f"ConnectError: {str(e)}"
        
        # Try again with SSL verification disabled
        try:
            async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
                response = await client.get("https://api.simli.com/")
                results["https_no_verify"] = True
                results["https_no_verify_status"] = response.status_code
        except Exception as e2:
            results["https_no_verify"] = False
            results["https_no_verify_error"] = f"{type(e2).__name__}: {str(e2)}"
            
    except httpx.TimeoutException as e:
        results["https_connection"] = False
        results["https_error"] = f"Timeout: {str(e)}"
    except Exception as e:
        results["https_connection"] = False
        results["https_error"] = f"{type(e).__name__}: {str(e)}"
    
    # Also try a different known-good endpoint to verify outbound HTTPS works
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
    
    simli_url = "https://api.simli.com/getSessionToken"
    payload = {
        "simliAPIKey": SIMLI_API_KEY,
        "agentId": agentId,
        "faceId": faceId
    }
    
    print(f"[HEARSAY] Calling Simli API: {simli_url}")
    print(f"[HEARSAY] Payload (key hidden): agentId={agentId}, faceId={faceId}")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                simli_url,
                headers={
                    "Content-Type": "application/json"
                },
                json=payload,
                timeout=30.0
            )
            
            print(f"[HEARSAY] Simli API response status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"[HEARSAY] Simli API error: {response.status_code}")
                print(f"[HEARSAY] Response: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Simli API error: {response.text}"
                )
            
            data = response.json()
            print(f"[HEARSAY] Simli response keys: {list(data.keys())}")
            
            # Simli returns 'sessionToken'
            token = data.get("sessionToken") or data.get("token") or ""
        
        if not token:
            print(f"[HEARSAY] No token in response: {data}")
            raise HTTPException(
                status_code=500,
                detail="No token in Simli response"
            )
        
        print(f"[HEARSAY] Token obtained successfully (length: {len(token)})")
        return {"token": token}
        
    except httpx.ConnectError as e:
        print(f"[HEARSAY] Connection error: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Cannot connect to Simli API: {str(e)}"
        )
    except httpx.TimeoutException as e:
        print(f"[HEARSAY] Timeout error: {e}")
        raise HTTPException(
            status_code=504,
            detail=f"Simli API timeout: {str(e)}"
        )
    except httpx.RequestError as e:
        print(f"[HEARSAY] Request error type: {type(e).__name__}")
        print(f"[HEARSAY] Request error: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Failed to connect to Simli API: {type(e).__name__}: {str(e)}"
        )
    except Exception as e:
        print(f"[HEARSAY] Unexpected error type: {type(e).__name__}")
        print(f"[HEARSAY] Unexpected error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {type(e).__name__}: {str(e)}"
        )


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
