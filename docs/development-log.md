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

### 2026-10-03 — Bug-fix round after the first live review

**Console errors removed**

* `THREE.Clock` deprecation warning: `three@0.186` deprecates `Clock` in favour of
  `Timer`, but `@react-three/fiber` 9.x still constructs one inside `createStore`,
  and `three` / `fiber` / `drei` are all already at their latest versions.
  `src/main.tsx` now filters that single message out of `console.warn` instead of
  hiding every warning.
* `GET :7860/health → ERR_CONNECTION_REFUSED`: `startConversation()` probed the
  optional Pipecat service unconditionally. It now runs only when
  `VITE_PIPECAT_BASE_URL` is explicitly set (`pipecatDiaktifkan()` in `src/api.ts`),
  and `checkPipecatHealth()` gained an `AbortController` timeout.

**Lip sync now actually moves**

* Root cause: `daftarkanElemenAudio()` returned `null` whenever
  `AudioContext.state !== "running"`. `resume()` is asynchronous, so on the first
  utterance the guard always failed and no analyser was ever attached.
* Fixes in `src/lipsync/audioAnalyser.ts`: `pasangPembukaAudio()` unlocks the
  `AudioContext` on the first user gesture, `siapkanKonteksAudio()` is called from
  the mic/start handlers, the analyser is attached even while the context is still
  resuming, and `cobaLanjutkanKonteks()` throttles `resume()` so the render loop
  cannot flood the browser.
* `pastikanKonteksBerjalan()` guards the audio path: when the context cannot run the
  element is **not** routed through Web Audio, so speech always stays audible.
* Verified: context `running`, analyser attached, RMS 0.08, `bersuara: true`, mouth
  opening animating 0 → 0.69 → 0.41 → 0.13.

**Speech recognition records fully and sends itself**

* `recognition.continuous` was `false`, so Chrome stopped after a few words.
* Now `continuous = true`, final results accumulate in a ref (they survive Chrome
  restarting the session), `onend` restarts recording while the user still wants it,
  and a 1.6 s silence timer submits the answer automatically. Pressing the mic
  button again also submits.

**Faster speech**

* `tts_service/supertonic_engine.py`: LRU result cache (64 entries) plus a warm-up
  synthesis at start-up.
* `src/App.tsx`: client-side TTS cache, and replies are split per sentence so
  playback starts after the first sentence instead of the whole paragraph.
* Measured: new sentence ≈ 4 s, repeated sentence ≈ 0.02 s (~170× faster).
* Default `TTS_STEPS` lowered from 8 to 6.

**Progress panel is now real data**

* Deleted `src/domain/growthMock.ts` and its test.
* New `src/domain/growth.ts` derives streak, total minutes, last/average score,
  session counts, weak/strong dimension, next goal, trend, and the weekly map from
  the real `LearningState` + `CheckinState`, with an honest empty state.
* `LearningRecord` gained `durationMinutes`.

**Readability and hosting**

* `.scene-card h3` rendered dark navy on a blue gradient because the global
  `h1, h2, h3` rule overrode the card's inherited white text. Titles, meta text and
  tag chips are now explicitly white with a soft text shadow; the white custom card
  keeps dark text.
* Added `server/production.ts` and `npm start` to serve the built frontend and the
  API from a single port, so the app can be published to a free host.

**Verification**

* `npm run typecheck` → exit 0.
* `npm test` → 17 files / 73 tests passed.
* `npm run build` → succeeded.
* Playwright run: 0 console errors, 0 failed requests, card title
  `rgb(255, 255, 255)`, lip sync detected, STT transcript auto-submitted and
  answered by the AI.

### 2026-10-03 — Second bug-fix round: mouth, language, layout

**The mouth never moved**

* Root cause: lip sync depended entirely on tapping an `<audio>` element with
  Web Audio. Whenever the coach's voice came from the browser's
  `speechSynthesis` (audio the Web Audio API cannot reach), there was no signal
  and the mouth stayed shut — which is exactly what happened on the hosted build.
* Added `src/lipsync/gerakMulut.ts`: a procedural mouth driver that builds a
  viseme timeline from the text and runs for as long as the coach speaks.
* The driver yields to the audio analyser while real signal exists and takes
  back over after 600 ms of silence, so accuracy is preserved when audio is
  available and motion is guaranteed when it is not.
* `speechSynthesis` `onboundary` events feed the character index into
  `lompatKeKarakter()` so the mouth follows the word actually being spoken.
* Mouth motion no longer waits for `utterance.onstart`, which browsers skip when
  no matching voice is installed.

**Speech recognition now understands Indonesian**

* `recognition.lang` was hard-coded to `en-US`. It now follows a user-selectable
  mode — `Otomatis` / `Indonesia` / `Inggris` — shown right above the answer bar.
* `Otomatis` re-checks each final transcript with `deteksiBahasa()` and switches
  the language for the next recognition session, because the Web Speech API
  cannot auto-detect within a single session.
* Changing the language while recording restarts the recogniser without sending
  the answer in progress. The choice persists in `localStorage`.

**TTS stopped wobbling**

* `audioTtsSah()` rejects mock/fallback audio *before* an `<audio>` element is
  built, instead of discovering the failure through a rejected `play()`.
* `ambilAudioTts()` retries once after 350 ms.
* `src/suaraBrowser.ts` selects the best browser voice by language code and a
  curated name list, and adds a watchdog timer so a missing `onend` can never
  hang the conversation.

**Settings dialog was hidden behind the header**

* `.settings-backdrop` used `z-index: 20` while the sticky header uses 50 and
  45, so the panel slid underneath it. Now `z-index: 200`, height budgeted with
  `100dvh`, body scroll locked while open, and closable with `Escape`.

**Broken hero headline**

* `.home-task-title span { display: block }` also matched the accent period
  inside the heading, pushing it onto its own line — the heading rendered as
  "Just" / "." / "say it" / ".". Scoped to `.judul-baris` only and redesigned
  the heading with the brand-blue second line.

**Responsive overhaul**

* All breakpoints consolidated at the end of `src/styles.css` (1360 / 1180 /
  980 / 768 / 520 / 380 px) so they are the final source of truth.
* The navigation no longer stacks vertically on phones — both rows scroll
  horizontally, keeping a stable header height.
* Practice room, transcript panel, settings sheet, and answer bar all get
  purpose-built tablet and phone layouts. `min-width: 0` on grid children
  removes horizontal overflow.

**Verification**

* `npm run typecheck` → exit 0.
* `npm test` → 19 files / 86 tests passed (new: `lipsyncMulut`, `bahasaAsr`).
* `npm run build` → succeeded.
* Playwright: the **actual morph target influences** on the face mesh are read
  through `window.__selaMorph()` to prove the mouth moves; zero horizontal
  overflow at 1024 px and 390 px; settings panel verified above the header.
* Four new screenshots (`10`–`13`) capture the tablet and phone layouts.

### 2026-10-03 — Third bug-fix round: the status label, and a TTS that stopped wobbling

**The status label still covered the avatar**

* The previous round reserved bottom padding on `.coach-stage` to make room for
  `.coach-status`, which is `position: absolute`. Measuring the real geometry
  showed why that could never be enough: the bilingual label wraps to two lines
  and is **68 px** tall, while only 66 px had been reserved — an 18 px overlap on
  desktop and tablet, worse on phones.
* The stage is now a **two-row grid** (`grid-template-rows: auto auto`), with the
  avatar in the first row and the label in the second. `position: static` on
  `.coach-status` removes the absolute positioning entirely, so the label can no
  longer overlap the avatar no matter how long the text becomes.
* `.coach-avatar-wrap .sela-3d` now carries `max-width: 100%` with
  `aspect-ratio: 1 / 1`, so the 230 px avatar never spills out of a 200 px
  wrapper on small phones. The earlier selector targeted a direct child and
  never matched — the avatar actually sits one level deeper, inside
  `.coach-stage`.

**Supertonic TTS "sometimes worked, sometimes did not"**

* Verified the whole chain against a live sidecar: `/api/tts/synthesize` returned
  real audio with `provider: supertonic`, `lang: id` for Indonesian and
  `lang: en` for English. Cold synthesis ≈ 5.5 s, cached ≈ 0.12 s.
* The first sentence after a cold start was the slow one, and that latency is
  what read as instability. The app now fires one background `synthesize()` for
  a short greeting on load, which warms the model and fills both caches.
* When every attempt fails, `ambilAudioTts()` now calls `/api/tts/voices` in the
  background — that endpoint re-probes the sidecar — and then refreshes
  `/api/health`. Previously the app stayed on the browser voice until a reload
  even after the sidecar had recovered.
* The active engine is now stated in plain words in the navigation pill and the
  practice chip: `Supertonic F1 · Auto ID/EN` or
  `Suara browser (cadangan) · …`.

**Verification**

* `npx tsc --noEmit` → exit 0.
* `npx vitest run` → 19 files / 86 tests passed.
* `npm run build` → succeeded.
* Geometry probe (`probe-panggung.mjs`) at 1500×1000, 1024×768 and 390×844
  reports the avatar/status overlap directly.
* `capture-docs3.mjs` now also records the TTS provider of every synthesis
  request, and a failed screenshot no longer aborts the whole run.

### 2026-10-04 — Fourth phase: Duolingo-class learning experience

**Goal.** Turn the speaking tutor into a full English-learning product on the
Duolingo / Airlearn model, without losing any existing feature.

**Delivered**

* **Clean-room analysis** — `docs/analisis-duolingo-airlearn.md` studies the
  *visible* mechanics of Duolingo and Airlearn (feature map, exercise taxonomy,
  gamification, SRS, speech-AI flow, data entities, curriculum schema) and states
  explicitly what was **not** copied: no assets, copy, data, or private APIs.
* **CEFR curriculum** — `src/domain/jalurBelajar.ts`: 8 units from A1 to C1, each
  with 2 levels of 4 questions, drawn from five exercise types
  (`susun-kalimat | cocokkan-kata | isi-rumpang | dengar-ketik | pilih-terjemahan`).
  Question builders are deterministic — no `Math.random()`, so a level is the same
  every time and the tests can assert on it.
* **Path progression** — `src/domain/progresJalur.ts`: the first level is always
  open, later levels unlock only after the previous one is passed, and XP is
  recorded once per level so replays cannot inflate the total.
* **Gamification** — `src/domain/gamifikasi.ts`: XP, daily streak with limited
  freezes, monotonic leagues (Bronze → Silver → Gold → Sapphire → Diamond), and
  5 hearts recovering one per 30 minutes.
* **Spaced repetition** — `src/domain/srs.ts`: a 15-question placement bank across
  A1–C1, plus flashcards on a `[0,1,2,4,8,16,32]`-day interval curve.
* **UI** — new components `PetaJalur`, `MesinKuis`, `Gamifikasi`, `TesPenempatan`,
  plus a new **Journey** tab and a hearts widget in the navigation. The Journey
  screen is a real redesign (status strip, hero with progress ring, winding path
  map, league board, review panel) rather than a restyle of the old layout.
* **TTS** — Supertonic is now an optional developer-only sidecar; the app ships on
  **Speech Synthesis** with a female Indonesian/English voice, so the default
  install has no Python dependency and no first-request latency.
* **Configuration** — the provider panel is hidden from learners entirely; only a
  developer can change providers, via the API layer.
* **STT** — `src/domain/deteksiBahasa.ts` replaces the ad-hoc language check with
  weighted scoring (function words +1, structural markers +0.8, Indonesian affixes
  +0.35) locked only when the gap is ≥ 1.5 across ≥ 3 words.

**Bugs found and fixed by the new tests**

* `nilaiSoal` for `cocokkan-kata` compared raw pairs, so `" Hello = Halo "` never
  matched `"hello=halo"`. Fixed by sanitising each side of the pair separately.
* `hitungRentetan` returns 1 (not 0) for a fresh day, so the streak-freeze branch
  never fired. The condition now checks `jeda === 2 && rentetanSebelumnya > 0`.
* `body { min-width: 320px }` forced 15 px of horizontal scroll at a 320 px
  viewport with a classic scrollbar. Removed and replaced with `overflow-x: hidden`
  on `html, body`.

**Verification**

* `npx tsc --noEmit` → exit 0.
* `npx vitest run` → **25 files / 170 tests passed**.
* `npm run build` → succeeded.
* Browser run (Chromium via agent-browser): 16 level nodes across 8 units render;
  a correct run awards +20 XP and unlocks level 2; a wrong run honestly reports
  "belum lulus" with 0 XP; localStorage confirms persistence; the placement test
  returns a level with a per-level breakdown; the SRS panel seeds 8 cards.
* Responsive audit at 320/360/390/768/1280/1920 px: `scrollWidth == clientWidth`
  at every width, and `window.scrollX` cannot be moved — no horizontal overflow.
* New screenshots: `jalur-peta.png`, `jalur-peta-mobile.png`, `jalur-kuis.png`,
  `jalur-penempatan.png`.

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

### 2026-10-03 — Ronde perbaikan bug setelah tinjauan langsung pertama

**Galat konsol dihilangkan**

* Peringatan deprecation `THREE.Clock`: `three@0.186` mengusangkan `Clock` dan
  menyarankan `Timer`, tetapi `@react-three/fiber` 9.x masih membuatnya di dalam
  `createStore`, sementara `three` / `fiber` / `drei` sudah versi terbaru.
  `src/main.tsx` kini menyaring hanya pesan itu dari `console.warn`, bukan
  menyembunyikan semua peringatan.
* `GET :7860/health → ERR_CONNECTION_REFUSED`: `startConversation()` selalu menguji
  layanan Pipecat yang bersifat opsional. Sekarang pengujian hanya dilakukan bila
  `VITE_PIPECAT_BASE_URL` diset eksplisit (`pipecatDiaktifkan()` di `src/api.ts`),
  dan `checkPipecatHealth()` diberi batas waktu `AbortController`.

**Lip sync benar-benar bergerak**

* Akar masalah: `daftarkanElemenAudio()` mengembalikan `null` bila
  `AudioContext.state !== "running"`. Karena `resume()` asinkron, penjaga itu selalu
  gagal pada ucapan pertama sehingga analiser tidak pernah tersambung.
* Perbaikan di `src/lipsync/audioAnalyser.ts`: `pasangPembukaAudio()` membuka
  `AudioContext` pada gesture pertama pengguna, `siapkanKonteksAudio()` dipanggil dari
  handler mikrofon/mulai, analiser tetap disambungkan walau konteks baru di-resume,
  dan `cobaLanjutkanKonteks()` membatasi percobaan `resume()` agar loop render tidak
  membanjiri browser.
* `pastikanKonteksBerjalan()` menjaga jalur audio: bila konteks tidak bisa berjalan,
  elemen **tidak** disambungkan ke Web Audio sehingga suara tetap terdengar.
* Terverifikasi: konteks `running`, analiser tersambung, RMS 0,08, `bersuara: true`,
  kebukaan mulut bergerak 0 → 0,69 → 0,41 → 0,13.

**STT merekam penuh dan mengirim otomatis**

* `recognition.continuous` bernilai `false` sehingga Chrome berhenti setelah beberapa
  kata. Sekarang `continuous = true`, hasil final diakumulasi di ref (tetap aman saat
  Chrome memulai ulang sesi), `onend` memulai ulang rekaman selama pengguna masih
  menginginkannya, dan timer hening 1,6 detik mengirim jawaban otomatis. Menekan
  tombol mikrofon sekali lagi juga langsung mengirim.

**Suara lebih cepat**

* `tts_service/supertonic_engine.py`: cache hasil (64 entri) + sintesis pemanasan
  saat start-up.
* `src/App.tsx`: cache TTS sisi klien, dan balasan dipecah per kalimat sehingga
  pemutaran mulai setelah kalimat pertama, bukan setelah seluruh paragraf.
* Hasil ukur: kalimat baru ≈ 4 detik, kalimat berulang ≈ 0,02 detik (~170× lebih cepat).
* `TTS_STEPS` bawaan diturunkan dari 8 menjadi 6.

**Panel progres kini memakai data nyata**

* `src/domain/growthMock.ts` dan tesnya dihapus.
* `src/domain/growth.ts` baru menurunkan rentetan hari, total menit, skor terakhir
  dan rata-rata, jumlah sesi, dimensi terlemah/terkuat, target berikutnya, tren, dan
  peta mingguan dari `LearningState` + `CheckinState` yang nyata, lengkap dengan
  kondisi kosong yang jujur.
* `LearningRecord` mendapat field `durationMinutes`.

**Keterbacaan dan hosting**

* `.scene-card h3` tampil biru tua di atas gradasi biru karena aturan global
  `h1, h2, h3` mengalahkan pewarisan teks putih dari kartu. Judul, teks meta, dan chip
  tag kini dipaksa putih dengan bayangan teks halus; kartu kustom berlatar putih tetap
  memakai teks gelap.
* Ditambahkan `server/production.ts` dan `npm start` untuk melayani frontend hasil build
  dan API dari satu port sehingga aplikasi bisa dipublikasikan ke hosting gratis.

**Verifikasi**

* `npm run typecheck` → exit 0.
* `npm test` → 17 berkas / 73 tes lulus.
* `npm run build` → berhasil.
* Uji Playwright: 0 galat konsol, 0 permintaan gagal, warna judul kartu
  `rgb(255, 255, 255)`, lip sync terdeteksi, transkrip STT terkirim otomatis dan
  dijawab AI.

### 2026-10-03 — Ronde perbaikan bug kedua: mulut, bahasa, tata letak

**Mulut tidak pernah bergerak**

* Akar masalah: lip sync sepenuhnya bergantung pada penyadapan elemen `<audio>`
  lewat Web Audio. Setiap kali suara coach berasal dari `speechSynthesis` bawaan
  browser (audio yang tidak bisa dijangkau Web Audio API), tidak ada sinyal sama
  sekali dan mulut tetap tertutup — persis inilah yang terjadi pada versi yang
  dipublikasikan.
* Ditambahkan `src/lipsync/gerakMulut.ts`: penggerak gerak mulut prosedural yang
  menyusun garis waktu viseme dari teks dan berjalan selama coach bicara.
* Penggerak ini menyerahkan kendali ke analiser audio selama sinyal nyata masih
  ada, dan mengambil alih kembali setelah 600 ms tanpa sinyal. Akurasi tetap
  terjaga saat audio tersedia, dan gerakan dijamin ada saat audio tidak tersedia.
* Kejadian `onboundary` dari `speechSynthesis` mengirim indeks karakter ke
  `lompatKeKarakter()` sehingga mulut mengikuti kata yang benar-benar diucapkan.
* Gerakan mulut tidak lagi menunggu `utterance.onstart`, yang sering dilewati
  browser ketika tidak ada suara yang cocok terpasang.

**Pengenalan suara kini mengerti Bahasa Indonesia**

* `recognition.lang` dikunci ke `en-US`. Sekarang mengikuti mode yang bisa
  dipilih pengguna — `Otomatis` / `Indonesia` / `Inggris` — tepat di atas bilah
  jawaban.
* Mode `Otomatis` memeriksa ulang setiap transkrip final dengan `deteksiBahasa()`
  lalu mengganti bahasa untuk sesi rekaman berikutnya, karena Web Speech API
  tidak bisa mendeteksi otomatis dalam satu sesi.
* Mengganti bahasa saat merekam akan memulai ulang recognizer tanpa mengirim
  jawaban yang sedang disusun. Pilihannya disimpan di `localStorage`.

**TTS tidak lagi goyah**

* `audioTtsSah()` menolak audio mock/cadangan **sebelum** elemen `<audio>`
  dibuat, bukan setelah `play()` gagal.
* `ambilAudioTts()` mencoba ulang sekali setelah 350 ms.
* `src/suaraBrowser.ts` memilih suara browser terbaik berdasarkan kode bahasa
  dan daftar nama pilihan, serta menambahkan pengaman waktu sehingga `onend`
  yang tidak pernah datang tidak bisa menggantungkan percakapan.

**Dialog pengaturan tertutup bilah kepala**

* `.settings-backdrop` memakai `z-index: 20` sementara bilah kepala sticky
  memakai 50 dan 45, sehingga panelnya menyelip di bawah. Sekarang
  `z-index: 200`, tinggi memakai `100dvh`, scroll halaman dikunci saat terbuka,
  dan bisa ditutup dengan `Escape`.

**Judul hero rusak**

* `.home-task-title span { display: block }` juga mengenai titik aksen di dalam
  judul sehingga titik itu turun ke baris sendiri — judul tampil sebagai
  "Just" / "." / "say it" / ".". Sekarang aturannya dibatasi ke `.judul-baris`
  saja, dan judulnya dirancang ulang dengan baris kedua berwarna biru merek.

**Rombak responsif**

* Seluruh titik henti dikonsolidasikan di akhir `src/styles.css`
  (1360 / 1180 / 980 / 768 / 520 / 380 px) agar menjadi sumber kebenaran akhir.
* Navigasi tidak lagi menumpuk vertikal di ponsel — kedua barisnya digeser
  mendatar sehingga tinggi bilah kepala tetap stabil.
* Ruang latihan, panel transkrip, lembar pengaturan, dan bilah jawaban semuanya
  mendapat tata letak khusus tablet dan ponsel. `min-width: 0` pada anak grid
  menghilangkan luapan mendatar.

**Verifikasi**

* `npm run typecheck` → exit 0.
* `npm test` → 19 berkas / 86 tes lulus (baru: `lipsyncMulut`, `bahasaAsr`).
* `npm run build` → berhasil.
* Playwright: **nilai morph target yang benar-benar diterapkan** pada mesh wajah
  dibaca lewat `window.__selaMorph()` untuk membuktikan mulut bergerak; nol
  luapan mendatar pada 1024 px dan 390 px; panel pengaturan terverifikasi berada
  di atas bilah kepala.
* Empat tangkapan layar baru (`10`–`13`) merekam tata letak tablet dan ponsel.

### 2026-10-03 — Ronde perbaikan bug ketiga: label status dan TTS yang berhenti goyah

**Label status masih menutupi avatar**

* Ronde sebelumnya menambah padding bawah pada `.coach-stage` untuk memberi ruang
  bagi `.coach-status` yang bersifat `position: absolute`. Pengukuran geometri
  nyata menunjukkan kenapa cara itu tidak akan pernah cukup: label dua bahasa ini
  membungkus menjadi dua baris dengan tinggi **68 px**, sedangkan yang disisakan
  hanya 66 px — tumpang tindih 18 px di desktop dan tablet, lebih parah di ponsel.
* Panggung sekarang menjadi **grid dua baris** (`grid-template-rows: auto auto`),
  avatar di baris pertama dan label di baris kedua. `position: static` pada
  `.coach-status` menghapus posisi absolutnya, sehingga label tidak mungkin lagi
  menutupi avatar, sepanjang apa pun teksnya.
* `.coach-avatar-wrap .sela-3d` kini memakai `max-width: 100%` dengan
  `aspect-ratio: 1 / 1`, sehingga avatar 230 px tidak meluber dari pembungkus
  200 px di ponsel kecil. Selektor sebelumnya menargetkan anak langsung dan tidak
  pernah cocok — avatar sebenarnya berada satu tingkat lebih dalam, di dalam
  `.coach-stage`.

**TTS Supertonic "kadang bisa, kadang tidak"**

* Seluruh rantai diuji terhadap sidecar yang hidup: `/api/tts/synthesize`
  mengembalikan audio nyata dengan `provider: supertonic`, `lang: id` untuk
  Bahasa Indonesia dan `lang: en` untuk Bahasa Inggris. Sintesis dingin ≈ 5,5
  detik, dari cache ≈ 0,12 detik.
* Kalimat pertama setelah aplikasi baru dibuka adalah yang paling lambat, dan
  latensi itulah yang terbaca sebagai ketidakstabilan. Aplikasi sekarang
  menjalankan satu `synthesize()` latar untuk sapaan pendek saat dimuat, yang
  memanaskan model sekaligus mengisi kedua cache.
* Bila semua percobaan gagal, `ambilAudioTts()` kini memanggil `/api/tts/voices`
  di latar belakang — endpoint itu memeriksa ulang sidecar — lalu menyegarkan
  `/api/health`. Sebelumnya aplikasi tetap memakai suara browser sampai halaman
  dimuat ulang walaupun sidecar sudah hidup kembali.
* Mesin suara yang aktif kini dinyatakan dengan kata-kata jelas pada chip
  navigasi dan chip ruang latihan: `Supertonic F1 · Auto ID/EN` atau
  `Suara browser (cadangan) · …`.

**Verifikasi**

* `npx tsc --noEmit` → keluar 0.
* `npx vitest run` → 19 berkas / 86 tes lulus.
* `npm run build` → berhasil.
* Probe geometri (`probe-panggung.mjs`) pada 1500×1000, 1024×768, dan 390×844
  melaporkan tumpang tindih avatar/label secara langsung.
* `capture-docs3.mjs` kini juga mencatat provider TTS setiap permintaan
  sintesis, dan kegagalan satu tangkapan layar tidak lagi menggagalkan seluruh
  proses.

### 2026-10-04 — Fase keempat: pengalaman belajar kelas Duolingo

**Tujuan.** Mengubah tutor bicara menjadi produk belajar bahasa Inggris utuh
dengan model Duolingo / Airlearn, tanpa menghilangkan fitur yang sudah ada.

**Yang dikerjakan**

* **Analisis clean-room** — `docs/analisis-duolingo-airlearn.md` mempelajari
  mekanisme *yang terlihat* dari Duolingo dan Airlearn (peta fitur, taksonomi
  latihan, gamifikasi, SRS, alur speech-AI, entitas data, skema kurikulum) dan
  menyatakan secara eksplisit apa yang **tidak** disalin: tidak ada aset, teks,
  data, atau API privat.
* **Kurikulum CEFR** — `src/domain/jalurBelajar.ts`: 8 unit dari A1 sampai C1,
  masing-masing 2 level berisi 4 soal, diambil dari lima tipe latihan
  (`susun-kalimat | cocokkan-kata | isi-rumpang | dengar-ketik | pilih-terjemahan`).
  Penyusun soal bersifat deterministik — tanpa `Math.random()` — sehingga satu
  level selalu sama dan tes bisa memeriksanya.
* **Progres jalur** — `src/domain/progresJalur.ts`: level pertama selalu terbuka,
  level berikutnya hanya terbuka setelah level sebelumnya lulus, dan XP dicatat
  sekali per level agar pengulangan tidak menggelembungkan total.
* **Gamifikasi** — `src/domain/gamifikasi.ts`: XP, runtutan harian dengan
  pelindung terbatas, liga monoton (Bronze → Silver → Gold → Sapphire → Diamond),
  dan 5 nyawa yang pulih satu per 30 menit.
* **Pengulangan berjeda** — `src/domain/srs.ts`: bank penempatan 15 soal A1–C1,
  plus kartu flash dengan kurva interval `[0,1,2,4,8,16,32]` hari.
* **UI** — komponen baru `PetaJalur`, `MesinKuis`, `Gamifikasi`, `TesPenempatan`,
  plus tab **Jalur** baru dan widget nyawa di navigasi. Layar Jalur benar-benar
  dirombak (strip status, hero dengan cincin progres, peta jalur berkelok, papan
  liga, panel pengulangan), bukan sekadar pengecatan ulang tata letak lama.
* **TTS** — Supertonic kini sidecar opsional khusus developer; aplikasi berjalan
  dengan **Speech Synthesis** bersuara perempuan Indonesia/Inggris, sehingga
  pemasangan default tidak butuh Python dan tidak ada latensi permintaan pertama.
* **Konfigurasi** — panel provider disembunyikan total dari pelajar; hanya
  developer yang bisa mengubah provider, lewat lapisan API.
* **STT** — `src/domain/deteksiBahasa.ts` menggantikan pemeriksaan bahasa ad-hoc
  dengan skor berbobot (kata fungsi +1, penanda struktural +0.8, imbuhan Indonesia
  +0.35) yang mengunci hanya bila selisihnya ≥ 1.5 pada ≥ 3 kata.

**Bug yang ditemukan dan diperbaiki oleh tes baru**

* `nilaiSoal` untuk `cocokkan-kata` membandingkan pasangan mentah, sehingga
  `" Hello = Halo "` tidak pernah cocok dengan `"hello=halo"`. Diperbaiki dengan
  membersihkan tiap sisi pasangan secara terpisah.
* `hitungRentetan` mengembalikan 1 (bukan 0) untuk hari baru, sehingga cabang
  pelindung runtutan tidak pernah aktif. Kondisinya kini memeriksa
  `jeda === 2 && rentetanSebelumnya > 0`.
* `body { min-width: 320px }` memaksa 15 px gulir horizontal pada viewport 320 px
  dengan scrollbar klasik. Dihapus dan diganti `overflow-x: hidden` pada
  `html, body`.

**Verifikasi**

* `npx tsc --noEmit` → keluar 0.
* `npx vitest run` → **25 berkas / 170 tes lulus**.
* `npm run build` → berhasil.
* Uji browser (Chromium lewat agent-browser): 16 simpul level pada 8 unit tampil;
  permainan benar memberi +20 XP dan membuka level 2; permainan salah melaporkan
  "belum lulus" secara jujur dengan 0 XP; localStorage membuktikan persistensi;
  tes penempatan mengembalikan level dengan rincian per level; panel SRS mengisi
  8 kartu.
* Audit responsif pada 320/360/390/768/1280/1920 px: `scrollWidth == clientWidth`
  di semua lebar, dan `window.scrollX` tidak bisa digeser — tanpa luapan
  horizontal.
* Tangkapan layar baru: `jalur-peta.png`, `jalur-peta-mobile.png`, `jalur-kuis.png`,
  `jalur-penempatan.png`.

### Konvensi yang diadopsi

* Komentar kode baru ditulis dalam **Bahasa Indonesia**.
* Variabel dan fungsi baru memakai nama **Indonesia**.
* Tanpa emoji di UI — hanya ikon `lucide-react`.
* Palet merek biru dipakai eksklusif; tanpa hijau.
* Tidak ada fitur yang dihapus — ini proyek lanjutan.
