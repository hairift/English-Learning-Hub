# Development Log

> **English** | [Bahasa Indonesia](#bahasa-indonesia)

---

## English

### 2026-06-05

* Initialised the local Git repository's compliance baseline files.
* Recorded the development window, PR rules, dependency-disclosure rules, and the
  upcoming PR breakdown plan.
* At this stage there was no application feature code and no third-party runtime
  dependencies.

### 2026-10-03 — Continuation phase

**Rebrand and theme**

* Renamed the product to **Sela Tutor English** across `index.html`,
  `server/index.ts`, `README.md`, `pipecat_service/*`, and all UI copy.
* Moved `SELA-AI.png` to `public/brand/sela-ai.png`, wired it as the favicon, and
  removed the old `public/favicon.svg` so files no longer pile up at the root.
* Replaced the entire green palette with a full blue palette in `src/styles.css`.
  Introduced Indonesian-named tokens (`--biru-utama`, `--biru-terang`,
  `--biru-gelap`, `--biru-muda-bg`) and **aliased** the legacy green token names to
  them, so 80+ existing rules keep working with a single change point.
* Replaced every emoji with a `lucide-react` icon (nav tabs, report diff arrows,
  the "Answer → Action → Impact" structure).
* Switched the typeface to **Nunito Variable**.

**3D avatar and lip sync**

* Moved `Draft 11 (Animation) AI Sela_v05.glb` → `public/models/sela-tutor.glb`
  and `..._v04.fbx` → `public/models/sela-tutor.fbx`.
* Built `src/components/Sela3DScene.tsx` (lazy, heavy) and
  `src/components/Sela3DAvatar.tsx` (light wrapper with WebGL detection, an error
  boundary, and a static-photo fallback).
* Implemented the lip sync engine in `src/lipsync/`:
  `audioAnalyser.ts` (RMS + 3 bands → 5 visemes), `lipsyncStore.ts`,
  `useLipsync.ts`, and `visemeDariTeks.ts` (text-driven fallback).
* Wired WebRTC bot audio into lip sync via two new optional callbacks in
  `src/pipecatVoiceClient.ts`.
* Verified the avatar renders: `webgl: true`, canvas 236×236, no fallback photo.

**Supertonic TTS**

* Made Supertonic the default TTS provider (`F1` female Indonesian voice,
  `TTS_LANGUAGE_MODE=auto`).
* Built the Python sidecar in `tts_service/` (FastAPI + uvicorn, port 7861) with
  `supertonic_engine.py`, `server.py`, and `normalizer.py`.
* Fixed the real Supertonic API mismatches: `synthesize()` returns
  `(wav, duration_array)`; `save_audio()` needs a path; `sample_rate` must be read
  after load.
* Added `scripts/start-tts.mjs` and the `dev:tts` / `dev:all` npm scripts.

**Number normalisation**

* Rewrote `shared/textNormalizer.ts` and `tts_service/normalizer.py`.
* Solved the placeholder-collision bug by moving placeholders into the Private Use
  Area (`U+E000`, `U+E001`, index base `0xE100`).
* Fixed currency handling (`$5.2M` losing "dollars"; trailing spaces swallowed),
  the `re.escape` double-backslash bug, the `IndexError` in `_mata_uang`, and the
  duplicated "jam".
* Verified outputs: `Rp15.000` → "lima belas ribu rupiah", `50%` → "lima puluh
  persen", `081234567890` → per-digit spelling.

**Runtime providers**

* Added five presets including `sela-default` (Groq LLM + Supertonic TTS).
* Rewrote `src/components/ApiSettingsPanel.tsx` with TTS / LLM / ASR subsections,
  a live voice list, a voice preview button, and a Supertonic status dot.
* Fixed a `ReferenceError` in `server/app.ts` where `izinkanSimpan` was referenced
  but never defined — this had made every `/api/settings` route return 500.

**Documentation**

* Rewrote `README.md` fully bilingually with 9 real screenshots.
* Captured the screenshots with Playwright (Chromium) into `docs/screenshots/`.
* Rewrote every doc bilingually: architecture, user guide, provider setup,
  Supertonic TTS, 3D avatar & lip sync, visual design system, product
  requirements, development, UI information architecture, coach & check-in spec,
  and the development plan and log.

**Verification**

* `npm run typecheck` → exit 0.
* `npm test` → 17 test files passed.
* `npm run build` → succeeded, with `vendor-three`, `vendor-voice`, and a lazy
  `Sela3DScene` chunk.

### Conventions adopted

* New code comments are written in **Bahasa Indonesia**.
* New variables and functions use **Indonesian** names.
* No emojis in the UI — `lucide-react` icons only.
* The blue brand palette is used exclusively; no green.
* No feature is ever removed — this is a continuation project.

---

## Bahasa Indonesia

### 2026-06-05

* Menginisialisasi berkas dasar kepatuhan repositori Git lokal.
* Mencatat jendela pengembangan, aturan PR, aturan pengungkapan dependensi, dan
  rencana pemecahan PR berikutnya.
* Pada tahap ini belum ada kode fitur aplikasi dan belum ada dependensi runtime
  pihak ketiga.

### 2026-10-03 — Fase lanjutan

**Rebranding dan tema**

* Mengganti nama produk menjadi **Sela Tutor English** di `index.html`,
  `server/index.ts`, `README.md`, `pipecat_service/*`, dan semua teks UI.
* Memindahkan `SELA-AI.png` ke `public/brand/sela-ai.png`, memasangnya sebagai
  favicon, dan menghapus `public/favicon.svg` lama supaya berkas tidak menumpuk
  di akar proyek.
* Mengganti seluruh palet hijau dengan palet biru penuh di `src/styles.css`.
  Memperkenalkan token bernama Indonesia (`--biru-utama`, `--biru-terang`,
  `--biru-gelap`, `--biru-muda-bg`) dan **mengalias** nama token hijau lama ke
  token tersebut, sehingga 80+ aturan lama tetap jalan dengan satu titik
  perubahan.
* Mengganti setiap emoji dengan ikon `lucide-react` (tab navigasi, panah diff
  laporan, struktur "Answer → Action → Impact").
* Mengganti jenis huruf ke **Nunito Variable**.

**Avatar 3D dan lip sync**

* Memindahkan `Draft 11 (Animation) AI Sela_v05.glb` → `public/models/sela-tutor.glb`
  dan `..._v04.fbx` → `public/models/sela-tutor.fbx`.
* Membangun `src/components/Sela3DScene.tsx` (lazy, berat) dan
  `src/components/Sela3DAvatar.tsx` (pembungkus ringan dengan deteksi WebGL,
  pembatas galat, dan cadangan foto statis).
* Mengimplementasikan mesin lip sync di `src/lipsync/`:
  `audioAnalyser.ts` (RMS + 3 pita → 5 viseme), `lipsyncStore.ts`,
  `useLipsync.ts`, dan `visemeDariTeks.ts` (cadangan dari teks).
* Menyambungkan audio bot WebRTC ke lip sync lewat dua callback opsional baru di
  `src/pipecatVoiceClient.ts`.
* Memverifikasi avatar benar-benar dirender: `webgl: true`, kanvas 236×236, tanpa
  foto cadangan.

**Supertonic TTS**

* Menjadikan Supertonic provider TTS default (suara perempuan Indonesia `F1`,
  `TTS_LANGUAGE_MODE=auto`).
* Membangun sidecar Python di `tts_service/` (FastAPI + uvicorn, port 7861)
  dengan `supertonic_engine.py`, `server.py`, dan `normalizer.py`.
* Memperbaiki ketidaksesuaian API Supertonic yang sebenarnya: `synthesize()`
  mengembalikan `(wav, durasi_array)`; `save_audio()` butuh path; `sample_rate`
  harus dibaca setelah model dimuat.
* Menambahkan `scripts/start-tts.mjs` dan skrip npm `dev:tts` / `dev:all`.

**Normalisasi angka**

* Menulis ulang `shared/textNormalizer.ts` dan `tts_service/normalizer.py`.
* Mengatasi bug tabrakan penanda dengan memindahkan penanda ke Private Use Area
  (`U+E000`, `U+E001`, basis indeks `0xE100`).
* Memperbaiki penanganan mata uang (`$5.2M` kehilangan "dollars"; spasi di akhir
  tertelan), bug backslash ganda pada `re.escape`, `IndexError` di `_mata_uang`,
  dan "jam" yang terduplikasi.
* Memverifikasi keluaran: `Rp15.000` → "lima belas ribu rupiah", `50%` → "lima
  puluh persen", `081234567890` → ejaan per digit.

**Provider runtime**

* Menambahkan lima preset termasuk `sela-default` (LLM Groq + TTS Supertonic).
* Menulis ulang `src/components/ApiSettingsPanel.tsx` dengan subbagian TTS / LLM /
  ASR, daftar suara langsung, tombol pratinjau suara, dan titik status Supertonic.
* Memperbaiki `ReferenceError` di `server/app.ts` di mana `izinkanSimpan`
  direferensikan tetapi tidak pernah didefinisikan — ini membuat semua rute
  `/api/settings` mengembalikan 500.

**Dokumentasi**

* Menulis ulang `README.md` sepenuhnya bilingual dengan 9 tangkapan layar nyata.
* Mengambil tangkapan layar dengan Playwright (Chromium) ke `docs/screenshots/`.
* Menulis ulang setiap dokumen secara bilingual: arsitektur, panduan pengguna,
  penyiapan provider, Supertonic TTS, avatar 3D & lip sync, sistem desain visual,
  kebutuhan produk, pengembangan, arsitektur informasi UI, spesifikasi pelatih &
  check-in, serta rencana dan catatan pengembangan.

**Verifikasi**

* `npm run typecheck` → keluar 0.
* `npm test` → 17 berkas uji lulus.
* `npm run build` → berhasil, dengan chunk `vendor-three`, `vendor-voice`, dan
  `Sela3DScene` yang dimuat lazy.

### Konvensi yang diadopsi

* Komentar kode baru ditulis dalam **Bahasa Indonesia**.
* Variabel dan fungsi baru memakai nama **Indonesia**.
* Tanpa emoji di UI — hanya ikon `lucide-react`.
* Palet merek biru dipakai eksklusif; tanpa hijau.
* Tidak ada fitur yang dihapus — ini proyek lanjutan.
