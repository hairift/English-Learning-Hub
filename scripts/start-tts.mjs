/**
 * start-tts.mjs — menjalankan layanan TTS Supertonic (sidecar Python).
 *
 * Skrip ini:
 * 1. Memastikan virtual environment (venv) tersedia di `tts_service/.venv`.
 * 2. Memasang dependensi Python bila belum ada.
 * 3. Menjalankan `server.py` pada port 7861 (bisa diubah lewat env TTS_SERVICE_PORT).
 *
 * Jalankan dengan: npm run dev:tts
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const akarProyek = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const folderLayanan = path.join(akarProyek, "tts_service");
const adalahWindows = process.platform === "win32";
const pythonVenv = path.join(folderLayanan, ".venv", adalahWindows ? "Scripts" : "bin", adalahWindows ? "python.exe" : "python");
const port = process.env.TTS_SERVICE_PORT || "7861";
const host = process.env.TTS_SERVICE_HOST || "127.0.0.1";

/** Mencari interpreter Python yang tersedia di sistem. */
function cariPython() {
  const kandidat = adalahWindows ? ["python", "py", "python3"] : ["python3", "python"];
  for (const nama of kandidat) {
    const cek = spawnSync(nama, ["--version"], { stdio: "ignore", shell: adalahWindows });
    if (cek.status === 0) return nama;
  }
  return null;
}

if (!existsSync(pythonVenv)) {
  console.log("[tts] Membuat virtual environment Python di tts_service/.venv ...");
  const python = cariPython();
  if (!python) {
    console.error("[tts] Python tidak ditemukan. Pasang Python 3.10+ lalu coba lagi.");
    process.exit(1);
  }
  const buatVenv = spawnSync(python, ["-m", "venv", path.join(folderLayanan, ".venv")], {
    stdio: "inherit",
    shell: adalahWindows
  });
  if (buatVenv.status !== 0) {
    console.error("[tts] Gagal membuat virtual environment.");
    process.exit(1);
  }
  console.log("[tts] Memasang dependensi (supertonic, fastapi, uvicorn, num2words, numpy) ...");
  const pasang = spawnSync(pythonVenv, ["-m", "pip", "install", "--no-input", "-r", "requirements.txt"], {
    cwd: folderLayanan,
    stdio: "inherit"
  });
  if (pasang.status !== 0) {
    console.error("[tts] Gagal memasang dependensi Python.");
    process.exit(1);
  }
}

console.log(`[tts] Menjalankan layanan Supertonic TTS di http://${host}:${port}`);
const proses = spawn(pythonVenv, ["server.py", "--host", host, "--port", port], {
  cwd: folderLayanan,
  stdio: "inherit",
  env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" }
});

proses.on("exit", (kode) => process.exit(kode ?? 0));
