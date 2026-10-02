"""
server.py — Sela Tutor English · Layanan TTS Supertonic.

Service ini adalah "sidecar" Python kecil yang membungkus Supertonic TTS
(on-device, 31 bahasa, mendukung `lang="id"` dan `lang="en"`).

Cara pakai singkat:
    cd tts_service
    python -m venv .venv
    .venv/Scripts/activate        # Windows
    pip install -r requirements.txt
    uvicorn server:app --host 127.0.0.1 --port 7861

Endpoint:
    GET  /health                -> status mesin & daftar suara/bahasa
    GET  /api/voices            -> daftar suara bawaan
    POST /api/normalize         -> normalisasi angka (ID/EN)
    POST /api/tts               -> sintesis suara, balikan base64 WAV
"""

from __future__ import annotations

import argparse
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import uvicorn
from dotenv import dotenv_values
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from normalizer import deteksi_bahasa, normalisasi, siapkan_teks
from supertonic_engine import BAHASA_DIDUKUNG, SUARA_BAWAAN, SUARA_DEFAULT, mesin


# --------------------------------------------------------------------------- #
# Pemuatan variabel lingkungan
# --------------------------------------------------------------------------- #
def muat_env_lokal() -> None:
    """Muat .env dari root proyek dan dari folder service ini."""
    folder_service = Path(__file__).resolve().parent
    for berkas_env, paksa in ((folder_service.parent / ".env", False), (folder_service / ".env", True)):
        if not berkas_env.exists():
            continue
        for kunci, nilai in dotenv_values(berkas_env).items():
            if nilai is None or nilai == "":
                continue
            if paksa or not os.getenv(kunci):
                os.environ[kunci] = nilai


muat_env_lokal()


# --------------------------------------------------------------------------- #
# Skema permintaan
# --------------------------------------------------------------------------- #
class PermintaanTts(BaseModel):
    """Body permintaan sintesis suara."""

    text: str = Field(..., min_length=1, description="Teks yang akan diucapkan")
    lang: str = Field("auto", description="'auto' | 'id' | 'en' | kode ISO Supertonic")
    voice: str = Field(SUARA_DEFAULT, description="Nama suara: F1-F5 (wanita), M1-M5 (pria)")
    speed: float = Field(1.0, ge=0.7, le=2.0, description="Kecepatan bicara")
    steps: int = Field(8, ge=5, le=12, description="Kualitas (5 rendah - 12 tinggi)")
    normalize: bool = Field(True, description="Normalisasi angka sebelum sintesis")


class PermintaanNormalisasi(BaseModel):
    """Body permintaan normalisasi teks."""

    text: str
    lang: str = "auto"


# --------------------------------------------------------------------------- #
# Aplikasi
# --------------------------------------------------------------------------- #
@asynccontextmanager
async def lifespan(_app: FastAPI):
    """
    Muat mesin Supertonic di latar belakang saat service mulai.

    Pemuatan dijalankan di thread terpisah supaya endpoint /health langsung
    bisa diakses walau model masih dimuat (unduhan pertama bisa ~400MB).
    """
    import threading

    def _siapkan_mesin() -> None:
        # Muat model, lalu "hangatkan" sekali supaya sesi TTS pertama tidak lambat.
        if mesin.muat():
            mesin.panaskan()

    threading.Thread(target=_siapkan_mesin, name="muat-supertonic", daemon=True).start()
    yield


app = FastAPI(
    title="Sela Tutor English · Supertonic TTS",
    description="Layanan text-to-speech Supertonic untuk Sela Tutor English.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173", "http://127.0.0.1:5174"],
    allow_origin_regex=r"^https?://(127\.0\.0\.1|localhost):\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, Any]:
    """Status layanan TTS beserta daftar suara dan bahasa yang didukung."""
    status = mesin.status()
    return {
        "service": "sela-supertonic-tts",
        "provider": "supertonic",
        "ready": status["ready"],
        "engine": status["engine"],
        "defaultVoice": status["default_voice"],
        "voices": status["voices"],
        "languages": status["languages"],
        "detail": status["detail"],
    }


@app.get("/api/voices")
async def daftar_suara() -> dict[str, Any]:
    """Daftar suara bawaan Supertonic beserta rekomendasi default."""
    return {
        "default": SUARA_DEFAULT,
        "voices": [
            {"id": nama, "label": f"Supertonic {nama}", "gender": "wanita" if nama.startswith("F") else "pria"}
            for nama in SUARA_BAWAAN
        ],
    }


@app.post("/api/normalize")
async def normalisasi_teks(permintaan: PermintaanNormalisasi) -> dict[str, Any]:
    """Normalisasi angka/tanggal/mata uang pada teks (tanpa sintesis)."""
    if permintaan.lang in ("id", "en"):
        lang = permintaan.lang
        teks = normalisasi(permintaan.text, lang)  # type: ignore[arg-type]
    else:
        teks, lang = siapkan_teks(permintaan.text, permintaan.lang)
    return {"text": teks, "lang": lang, "detected": deteksi_bahasa(permintaan.text)}


@app.post("/api/tts")
async def sintesis(permintaan: PermintaanTts) -> dict[str, Any]:
    """Sintesis teks menjadi audio WAV (base64)."""
    if not mesin.tersedia and not mesin.muat():
        # 503 supaya Node tahu harus memakai provider cadangan.
        raise HTTPException(
            status_code=503,
            detail=f"Mesin Supertonic tidak tersedia: {mesin.galat}",
        )

    # Tentukan bahasa: 'auto' berarti deteksi otomatis dari teks.
    if permintaan.lang in ("id", "en"):
        lang = permintaan.lang
        teks = normalisasi(permintaan.text, lang) if permintaan.normalize else permintaan.text  # type: ignore[arg-type]
    elif permintaan.lang == "auto":
        teks, lang = siapkan_teks(permintaan.text, "auto")
    else:
        lang = permintaan.lang if permintaan.lang in BAHASA_DIDUKUNG else "na"
        teks = permintaan.text

    try:
        hasil = mesin.sintesis(
            teks=teks,
            lang=lang,
            voice=permintaan.voice,
            speed=permintaan.speed,
            steps=permintaan.steps,
        )
    except Exception as exc:  # pragma: no cover - bergantung lingkungan
        raise HTTPException(status_code=500, detail=f"Gagal sintesis: {exc}") from exc

    return {
        "audioBase64": hasil.audio_base64,
        "format": hasil.format,
        "sampleRate": hasil.sample_rate,
        "durationEstimateSec": hasil.durasi_detik,
        "provider": hasil.provider,
        "lang": hasil.lang,
        "voice": hasil.voice,
        "normalizedText": teks,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sela Tutor English · Supertonic TTS")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=7861)
    argumen = parser.parse_args()
    uvicorn.run(app, host=argumen.host, port=argumen.port)
    sys.exit(0)
