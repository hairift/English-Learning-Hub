import argparse
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from dotenv import dotenv_values
from fastapi import BackgroundTasks, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from pipecat.transports.smallwebrtc.request_handler import (
    SmallWebRTCPatchRequest,
    SmallWebRTCRequest,
    SmallWebRTCRequestHandler,
)

from bot import run_bot


def load_local_env() -> None:
    service_dir = Path(__file__).resolve().parent
    for env_file, override in ((service_dir.parent / ".env", False), (service_dir / ".env", True)):
        if not env_file.exists():
            continue
        for key, value in dotenv_values(env_file).items():
            if value is None or value == "":
                continue
            if override or not os.getenv(key):
                os.environ[key] = value


load_local_env()

small_webrtc_handler = SmallWebRTCRequestHandler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await small_webrtc_handler.close()


app = FastAPI(title="Sela Tutor English — Pipecat Voice Agent", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_origin_regex=r"^https?://(127\.0\.0\.1|localhost):\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {
        "service": "pipecat-voice-agent",
        "transport": "small-webrtc",
        "ready": True,
        "configured": {
            "assemblyai": bool(os.getenv("ASSEMBLYAI_API_KEY") or os.getenv("ASR_API_KEY")),
            "llm": bool(os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY")),
            "cartesia": bool(os.getenv("CARTESIA_API_KEY") or os.getenv("TTS_API_KEY")),
            "businessApi": bool(os.getenv("BUSINESS_API_URL")),
        },
    }


@app.post("/api/offer")
async def offer(http_request: Request, request: SmallWebRTCRequest, background_tasks: BackgroundTasks):
    session_params = dict(http_request.query_params)

    async def webrtc_connection_callback(connection):
        background_tasks.add_task(run_bot, connection, session_params)

    return await small_webrtc_handler.handle_web_request(
        request=request,
        webrtc_connection_callback=webrtc_connection_callback,
    )


@app.patch("/api/offer")
async def ice_candidate(request: SmallWebRTCPatchRequest):
    await small_webrtc_handler.handle_patch_request(request)
    return {"status": "success"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sela Tutor English — Pipecat Voice Agent")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=7860)
    parser.add_argument("--verbose", "-v", action="count")
    args = parser.parse_args()

    logger.remove(0)
    logger.add(sys.stderr, level="TRACE" if args.verbose else "DEBUG")
    uvicorn.run(app, host=args.host, port=args.port)
