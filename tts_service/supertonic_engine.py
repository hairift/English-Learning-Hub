"""
supertonic_engine.py — pembungkus (wrapper) mesin Supertonic TTS.

Mesin dimuat secara "lazy" (baru saat dipakai pertama kali) supaya service tetap
bisa hidup dan melaporkan status di endpoint /health walau model belum terpasang.
Kalau Supertonic tidak tersedia, service mengembalikan status "unavailable" dan
Node akan otomatis jatuh ke provider TTS cadangan (fallback berlapis).
"""

from __future__ import annotations

import io
import os
import threading
from dataclasses import dataclass, field
from typing import Any

# Kode bahasa yang didukung Supertonic (31 bahasa + 'na').
BAHASA_DIDUKUNG = {
    "en", "ko", "ja", "ar", "bg", "cs", "da", "de", "el", "es", "et", "fi", "fr",
    "hi", "hr", "hu", "id", "it", "lt", "lv", "nl", "pl", "pt", "ro", "ru", "sk",
    "sl", "sv", "tr", "uk", "vi", "na",
}

# Suara bawaan Supertonic: M1-M5 (pria) dan F1-F5 (wanita).
SUARA_BAWAAN = ["F1", "F2", "F3", "F4", "F5", "M1", "M2", "M3", "M4", "M5"]

# Suara default: perempuan Indonesia sesuai permintaan produk.
SUARA_DEFAULT = os.getenv("SUPERTONIC_VOICE", "F1")


@dataclass
class HasilSintesis:
    """Hasil sintesis suara yang dikembalikan ke pemanggil."""

    audio_base64: str
    format: str
    sample_rate: int
    durasi_detik: float
    lang: str
    voice: str
    provider: str = "supertonic"
    meta: dict[str, Any] = field(default_factory=dict)


class MesinSupertonic:
    """Singleton pembungkus mesin Supertonic dengan pemuatan aman (thread-safe)."""

    def __init__(self) -> None:
        self._tts: Any = None
        self._kunci = threading.Lock()
        self._galat: str | None = None
        self._cache_gaya: dict[str, Any] = {}
        # Cache hasil sintesis: kalimat yang berulang (sapaan, umpan balik umum)
        # bisa dikembalikan seketika tanpa menjalankan model lagi.
        self._cache_hasil: dict[tuple, HasilSintesis] = {}
        self._kunci_cache = threading.Lock()
        self._batas_cache = 64
        self._hangat = False

    # ------------------------------------------------------------------ #
    # Status
    # ------------------------------------------------------------------ #
    @property
    def tersedia(self) -> bool:
        """True bila mesin sudah berhasil dimuat."""
        return self._tts is not None

    @property
    def galat(self) -> str | None:
        """Pesan galat terakhir saat pemuatan mesin gagal."""
        return self._galat

    def status(self) -> dict[str, Any]:
        """Ringkasan status mesin untuk endpoint /health."""
        return {
            "engine": "supertonic" if self.tersedia else "unavailable",
            "ready": self.tersedia,
            "default_voice": SUARA_DEFAULT,
            "voices": SUARA_BAWAAN,
            "languages": sorted(BAHASA_DIDUKUNG),
            "detail": self._galat,
        }

    # ------------------------------------------------------------------ #
    # Pemuatan model
    # ------------------------------------------------------------------ #
    def muat(self) -> bool:
        """Muat mesin Supertonic. Aman dipanggil berulang kali."""
        if self._tts is not None:
            return True
        with self._kunci:
            if self._tts is not None:
                return True
            try:
                from supertonic import TTS  # type: ignore

                # auto_download=True: model (~400MB) diunduh ke cache saat pertama kali.
                self._tts = TTS(auto_download=True)
                self._galat = None
                return True
            except Exception as exc:  # pragma: no cover - bergantung lingkungan
                self._galat = f"{type(exc).__name__}: {exc}"
                return False

    # ------------------------------------------------------------------ #
    # Gaya suara
    # ------------------------------------------------------------------ #
    def _ambil_gaya(self, nama_suara: str) -> Any:
        """Ambil objek voice style, dengan cache agar tidak memuat berulang."""
        kunci = nama_suara or SUARA_DEFAULT
        if kunci in self._cache_gaya:
            return self._cache_gaya[kunci]
        gaya = self._tts.get_voice_style(voice_name=kunci)
        self._cache_gaya[kunci] = gaya
        return gaya

    # ------------------------------------------------------------------ #
    # Sintesis
    # ------------------------------------------------------------------ #
    # ------------------------------------------------------------------ #
    # Utilitas
    # ------------------------------------------------------------------ #
    def _wav_ke_bytes(self, wav: Any) -> bytes:
        """
        Ubah array audio Supertonic menjadi bytes WAV.

        Strategi utama: tulis sendiri memakai modul `wave` bawaan Python
        (cepat, tanpa berkas sementara, dan tanpa dependensi tambahan).
        Strategi cadangan: pakai `save_audio()` milik Supertonic.
        """
        # Strategi 1: sudah berupa bytes WAV.
        if isinstance(wav, (bytes, bytearray)):
            return bytes(wav)

        sample_rate = int(getattr(self._tts, "sample_rate", 44100) or 44100)

        # Strategi 2: tulis WAV sendiri memakai modul `wave` + numpy.
        try:
            import wave

            import numpy as np

            data = np.asarray(wav).squeeze()
            if data.dtype != np.int16:
                # Normalisasi ke rentang [-1, 1] lalu konversi ke PCM 16-bit.
                pcm = np.clip(data.astype(np.float32), -1.0, 1.0)
                pcm = (pcm * 32767.0).astype(np.int16)
            else:
                pcm = data

            buffer = io.BytesIO()
            with wave.open(buffer, "wb") as berkas_wav:
                berkas_wav.setnchannels(1)
                berkas_wav.setsampwidth(2)
                berkas_wav.setframerate(sample_rate)
                berkas_wav.writeframes(pcm.tobytes())
            data_bytes = buffer.getvalue()
            if data_bytes:
                return data_bytes
        except Exception:
            pass

        # Strategi 3: pakai save_audio() ke berkas sementara lalu baca kembali.
        import tempfile
        from pathlib import Path

        with tempfile.TemporaryDirectory() as folder:
            jalur = Path(folder) / "hasil.wav"
            self._tts.save_audio(wav, str(jalur))
            return jalur.read_bytes()

    def _durasi_detik(self, durasi: Any) -> float:
        """Supertonic mengembalikan array durasi per potongan; jumlahkan semuanya."""
        try:
            import numpy as np

            return float(np.sum(np.asarray(durasi, dtype=np.float64)))
        except Exception:
            try:
                return float(durasi)
            except Exception:
                return 0.0

    def sintesis(
        self,
        teks: str,
        lang: str = "id",
        voice: str = SUARA_DEFAULT,
        speed: float = 1.0,
        steps: int = 8,
    ) -> HasilSintesis:
        """Sintesis teks menjadi WAV 16-bit (dikembalikan sebagai base64)."""
        if not self.muat():
            raise RuntimeError(f"Supertonic belum siap: {self._galat}")

        lang_aman = lang if lang in BAHASA_DIDUKUNG else "na"
        steps_aman = max(5, min(12, int(steps)))
        speed_aman = max(0.7, min(2.0, float(speed)))
        suara_aman = voice or SUARA_DEFAULT

        # Cek cache lebih dulu: ini memangkas latensi hampir sepenuhnya untuk
        # kalimat yang sudah pernah disintesis.
        kunci = (teks, lang_aman, suara_aman, round(speed_aman, 3), steps_aman)
        with self._kunci_cache:
            tersimpan = self._cache_hasil.get(kunci)
        if tersimpan is not None:
            return tersimpan

        gaya = self._ambil_gaya(suara_aman)

        # `speed` Supertonic valid di rentang 0.7 - 2.0, `total_steps` 5 - 12.
        wav, durasi = self._tts.synthesize(
            text=teks,
            voice_style=gaya,
            total_steps=steps_aman,
            speed=speed_aman,
            lang=lang_aman,
        )

        audio_bytes = self._wav_ke_bytes(wav)
        import base64

        audio_base64 = base64.b64encode(audio_bytes).decode("ascii")

        hasil = HasilSintesis(
            audio_base64=audio_base64,
            format="wav",
            sample_rate=int(getattr(self._tts, "sample_rate", 44100) or 44100),
            durasi_detik=self._durasi_detik(durasi),
            lang=lang_aman,
            voice=suara_aman,
            meta={"total_steps": steps_aman, "speed": speed_aman},
        )

        with self._kunci_cache:
            if len(self._cache_hasil) >= self._batas_cache:
                self._cache_hasil.clear()
            self._cache_hasil[kunci] = hasil

        return hasil

    def panaskan(self) -> None:
        """
        Sintesis contoh pendek sekali agar model "hangat".

        Sesi pertama biasanya paling lambat (alokasi memori & grafik komputasi).
        Pemanasan ini dipanggil di latar belakang saat service mulai sehingga
        pengguna pertama tidak merasakan latensi awal.
        """
        if self._hangat:
            return
        try:
            self.sintesis(
                teks="Halo, saya Sela, siap membantu latihan bahasa Inggrismu.",
                lang="id",
                voice=SUARA_DEFAULT,
                speed=1.0,
                steps=6,
            )
            self._hangat = True
        except Exception:
            # Pemanasan bersifat best-effort: kegagalan tidak boleh menghentikan layanan.
            pass


# Instance tunggal yang dipakai seluruh service.
mesin = MesinSupertonic()
