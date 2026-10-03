# Architecture

> **English** | [Bahasa Indonesia](#bahasa-indonesia)

---

## English

### 1. What the system does

**Sela Tutor English** is an AI English-speaking tutor for Indonesian learners.
A learner picks a real-world scenario (job interview, business meeting,
restaurant ordering), speaks an answer out loud, and receives:

* a spoken reply from a 3D tutor avatar (Sela) with real-time lip sync,
* a transcript of what they said,
* a structured evaluation report with scores, corrections, and next steps.

### 2. Process topology

```
┌──────────────────────────────────────────────────────────────────────┐
│  Browser (React 19 + TypeScript + Vite)                              │
│  ─────────────────────────────────────────────────────────────────   │
│  • UI: scenarios, practice room, transcript, report, settings        │
│  • 3D avatar (React Three Fiber) + lip sync (Web Audio API)          │
│  • Web Speech API for ASR (default, no key needed)                   │
└───────────────┬──────────────────────────────────┬───────────────────┘
                │  fetch /api/*                    │  WebRTC (optional)
                ▼                                  ▼
┌───────────────────────────────┐   ┌──────────────────────────────────┐
│  Node / Express  :5174        │   │  Pipecat voice agent  :7860      │
│  ───────────────────────────  │   │  (Python, optional real-time     │
│  • REST API + Zod validation  │   │   voice; not required to run)    │
│  • Session store              │   └──────────────────────────────────┘
│  • Settings store (.sela-...) │
│  • TTS text normalisation     │
└───────────┬───────────────────┘
            │  HTTP  POST /api/tts
            ▼
┌───────────────────────────────┐
│  Supertonic TTS sidecar :7861 │
│  (FastAPI + uvicorn, Python)  │
│  • ONNX inference, 31 langs   │
│  • 10 voices (F1-F5, M1-M5)   │
└───────────────────────────────┘
```

### 3. Why three processes

| Process | Why it is separate |
| --- | --- |
| **Browser** | All UI, the 3D avatar, and the default ASR run client-side, so a demo works with zero keys. |
| **Node / Express** | Holds API keys server-side, validates every payload with Zod, owns the session store, and normalises text before TTS. |
| **Python sidecar** | Supertonic is a Python/ONNX package. Isolating it keeps the Node process lean and lets it fail gracefully (`local-offline`) without taking down the app. |
| **Pipecat (optional)** | A heavier real-time WebRTC agent. It is entirely optional — the app is fully usable without it. |

**Graceful degradation is a first-class principle.** Every provider has a mock
or fallback path, so the app always runs:

* No LLM key → deterministic mock dialogue.
* TTS sidecar down → `window.speechSynthesis` fallback.
* No WebGL → static avatar photo.
* No audio analysis → procedural mouth driver (`lipsync/gerakMulut.ts`).

### 4. Data flow — a practice turn

```
1. Learner clicks a scenario + task
        │
        ▼
2. POST /api/session/start  { scenarioId, taskId, durationMinutes }
        │  → server creates a PracticeSession, returns AI opening question
        ▼
3. Coach asks the opening question
        │  → TTS: normalise text → sidecar → WAV → <audio> → lip sync
        ▼
4. Learner speaks
        │  → ASR (Web Speech API by default) → transcript + word timings
        ▼
5. POST /api/llm/turn  { sessionId, userText, round, ... }
        │  → server calls the LLM (Groq by default)
        │  → returns { aiText, hintZh, coachState, positiveFeedback,
        │              correctionPreview, nextRoundGoal }
        ▼
6. Coach replies (TTS + lip sync), transcript grows
        │
        ▼
7. POST /api/session/:id/end
        │
        ▼
8. POST /api/report/generate  → structured ReportResult
        │  → scores, sentence analyses, pronunciation tips, next practice
        ▼
9. Report dashboard renders
```

### 5. Backend API reference

All routes are under `/api`. Payloads are validated with Zod.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Mode + provider readiness (`mock`/`live`) |
| `GET` | `/api/settings` | Read runtime settings (with editable block) |
| `POST` | `/api/settings` | Update runtime settings |
| `POST` | `/api/settings/reset` | Reset to defaults |
| `GET` | `/api/scenarios` | List scenarios and their tasks |
| `POST` | `/api/session/start` | Start a practice session |
| `GET` | `/api/session/:sessionId` | Read a session |
| `POST` | `/api/session/:sessionId/turns` | Append a conversation turn |
| `POST` | `/api/session/:sessionId/end` | End a session |
| `POST` | `/api/asr/transcribe` | Transcribe an uploaded audio blob |
| `POST` | `/api/llm/turn` | Generate the tutor's next dialogue turn |
| `POST` | `/api/tts/synthesize` | Synthesise speech (Supertonic by default) |
| `GET` | `/api/tts/voices` | List Supertonic voices + service status |
| `POST` | `/api/tts/normalize` | Preview text normalisation only |
| `POST` | `/api/report/generate` | Build the evaluation report |

### 6. Module map

#### Backend (`server/`)

| File | Role |
| --- | --- |
| `index.ts` | HTTP entry point, startup log |
| `app.ts` | Express app, all routes, Zod validation |
| `config.ts` | Presets, env parsing, runtime settings, health |
| `env.ts` | Loads `.env` / `.env.local` |
| `data.ts` | Scenario + task catalogue |
| `practiceSession.ts` | Session lifecycle logic |
| `sessionStore.ts` | In-memory session persistence |
| `settingsStore.ts` | `.sela-settings.json` read/write |
| `providers/liveProviders.ts` | Real provider calls (LLM, ASR, TTS) |
| `providers/mockProviders.ts` | Deterministic offline fallbacks |
| `providers/reportSchema.ts` | Report validation |
| `providers/ttsServiceStatus.ts` | Polls the Supertonic sidecar |

#### Shared (`shared/`)

| File | Role |
| --- | --- |
| `schemas.ts` | Single source of truth for all Zod schemas + inferred types |
| `textNormalizer.ts` | Number/currency/time normalisation for TTS (ID + EN) |

#### Frontend (`src/`)

| File / folder | Role |
| --- | --- |
| `App.tsx` | Root component, navigation, session orchestration |
| `api.ts` | Typed API client |
| `styles.css` | The entire design system (blue tokens) |
| `components/` | `CoachAvatar`, `Sela3DAvatar`, `Sela3DScene`, `ReportDashboard`, `ApiSettingsPanel`, `BrandGuidelines`, `WeekDots` |
| `lipsync/` | `audioAnalyser`, `lipsyncStore`, `useLipsync`, `gerakMulut` |
| `domain/` | `learning`, `checkin`, `growth` — learning logic |
| `copy/` | `coachCopy` — all user-facing strings |
| `storage.ts` | `localStorage` persistence (scenarios, settings, ASR language) |
| `suaraBrowser.ts` | Browser `speechSynthesis` wrapper — voice selection, mouth sync, watchdog |
| `pipecatVoiceClient.ts` | Optional WebRTC voice client |
| `practiceExperience.ts` | Practice status copy/state mapping |
| `practiceTranscript.ts` | Transcript assembly |
| `reportDiagnostics.ts` | Report diagnostics |
| `storage.ts` | Local persistence helpers |

### 7. Session lifecycle

```
running ──► paused ──► running
   │                     │
   ├─────────────────────┼──► completed
   │                     │
   └─────────────────────┴──► expired / cancelled
```

Statuses: `running`, `paused`, `completed`, `expired`, `cancelled`.

A session holds an ordered list of `ConversationTurn`s (`speaker`: `ai` | `user`
| `system`), each with text, timestamp, optional confidence, audio duration, and
latency.

### 8. Coach state machine

The avatar's animation is driven by a `CoachState`:

| State | Meaning | Avatar clip |
| --- | --- | --- |
| `idle` | Waiting | Idle |
| `listening` | Learner is speaking | Idle |
| `thinking` | Generating a reply | Thinking |
| `asking` | Tutor is speaking | Talking |
| `reviewing` | Giving feedback | Thinking |
| `celebrating` | Praise / completion | Greeting |

### 9. Frontend data types

All shared contracts live in `shared/schemas.ts` and are inferred, never
duplicated:

* `CoachState`, `TranscriptResult`, `DialogueTurnResult`, `SpeechAudioResult`
* `ReportResult` (with `scoreDimension`, `sentenceAnalysis`, `pronunciationTip`, `evidenceTurn`, `nextPractice`)
* `ConversationTurn`, `PracticeSession`, `PracticeSessionStatus`

### 10. Scenarios shipped

| Scenario | Task | AI role |
| --- | --- | --- |
| Job Interview | Internship Introduction | AI Interviewer |
| Job Interview | Strengths & Career Plan | AI Interviewer |
| Business Meeting | Share a Project Opinion | AI Meeting Chair |
| Restaurant Ordering | Order with Preferences | AI Server |

Each task carries a `focus` (the speaking skill being trained) and an
`openingQuestion` the tutor asks first.

---

## Bahasa Indonesia

### 1. Fungsi sistem

**Sela Tutor English** adalah tutor berbicara Bahasa Inggris berbasis AI untuk
pelajar Indonesia. Pelajar memilih skenario dunia nyata (wawancara kerja, rapat
bisnis, memesan restoran), menjawab dengan suara, lalu menerima:

* balasan bersuara dari avatar tutor 3D (Sela) dengan lip sync real time,
* transkrip ucapan mereka,
* laporan evaluasi terstruktur berisi skor, koreksi, dan langkah berikutnya.

### 2. Topologi proses

```
┌──────────────────────────────────────────────────────────────────────┐
│  Browser (React 19 + TypeScript + Vite)                              │
│  ─────────────────────────────────────────────────────────────────   │
│  • UI: skenario, ruang latihan, transkrip, laporan, pengaturan       │
│  • Avatar 3D (React Three Fiber) + lip sync (Web Audio API)          │
│  • Web Speech API untuk ASR (default, tanpa kunci)                   │
└───────────────┬──────────────────────────────────┬───────────────────┘
                │  fetch /api/*                    │  WebRTC (opsional)
                ▼                                  ▼
┌───────────────────────────────┐   ┌──────────────────────────────────┐
│  Node / Express  :5174        │   │  Agen suara Pipecat  :7860       │
│  ───────────────────────────  │   │  (Python, real-time opsional;    │
│  • REST API + validasi Zod    │   │   tidak wajib dijalankan)        │
│  • Penyimpanan sesi           │   └──────────────────────────────────┘
│  • Penyimpanan pengaturan     │
│  • Normalisasi teks TTS       │
└───────────┬───────────────────┘
            │  HTTP  POST /api/tts
            ▼
┌───────────────────────────────┐
│  Sidecar Supertonic TTS :7861 │
│  (FastAPI + uvicorn, Python)  │
│  • Inferensi ONNX, 31 bahasa  │
│  • 10 suara (F1-F5, M1-M5)    │
└───────────────────────────────┘
```

### 3. Kenapa tiga proses

| Proses | Alasan dipisah |
| --- | --- |
| **Browser** | Semua UI, avatar 3D, dan ASR default berjalan di sisi klien, jadi demo bisa jalan tanpa kunci apa pun. |
| **Node / Express** | Menyimpan kunci API di sisi server, memvalidasi setiap payload dengan Zod, memiliki penyimpanan sesi, dan menormalisasi teks sebelum TTS. |
| **Sidecar Python** | Supertonic adalah paket Python/ONNX. Isolasinya menjaga proses Node tetap ringan dan memungkinkannya gagal dengan mulus (`local-offline`) tanpa menjatuhkan aplikasi. |
| **Pipecat (opsional)** | Agen WebRTC real-time yang lebih berat. Sepenuhnya opsional — aplikasi tetap bisa dipakai tanpa itu. |

**Degradasi mulus adalah prinsip utama.** Setiap provider punya jalur mock atau
cadangan, jadi aplikasi selalu bisa jalan:

* Tanpa kunci LLM → dialog mock deterministik.
* Sidecar TTS mati → cadangan `window.speechSynthesis`.
* Tanpa WebGL → foto avatar statis.
* Tanpa analisis audio → penggerak mulut prosedural (`lipsync/gerakMulut.ts`).

### 4. Alur data — satu giliran latihan

```
1. Pelajar klik skenario + tugas
        │
        ▼
2. POST /api/session/start  { scenarioId, taskId, durationMinutes }
        │  → server membuat PracticeSession, mengembalikan pertanyaan pembuka AI
        ▼
3. Pelatih menanyakan pertanyaan pembuka
        │  → TTS: normalisasi teks → sidecar → WAV → <audio> → lip sync
        ▼
4. Pelajar berbicara
        │  → ASR (default Web Speech API) → transkrip + waktu per kata
        ▼
5. POST /api/llm/turn  { sessionId, userText, round, ... }
        │  → server memanggil LLM (default Groq)
        │  → mengembalikan { aiText, hintZh, coachState, positiveFeedback,
        │                   correctionPreview, nextRoundGoal }
        ▼
6. Pelatih membalas (TTS + lip sync), transkrip bertambah
        │
        ▼
7. POST /api/session/:id/end
        │
        ▼
8. POST /api/report/generate  → ReportResult terstruktur
        │  → skor, analisis kalimat, tips pengucapan, latihan berikutnya
        ▼
9. Dasbor laporan tampil
```

### 5. Referensi API backend

Semua rute berada di bawah `/api`. Payload divalidasi dengan Zod.

| Method | Path | Fungsi |
| --- | --- | --- |
| `GET` | `/api/health` | Mode + kesiapan provider (`mock`/`live`) |
| `GET` | `/api/settings` | Baca pengaturan runtime (termasuk blok editable) |
| `POST` | `/api/settings` | Perbarui pengaturan runtime |
| `POST` | `/api/settings/reset` | Reset ke default |
| `GET` | `/api/scenarios` | Daftar skenario dan tugasnya |
| `POST` | `/api/session/start` | Mulai sesi latihan |
| `GET` | `/api/session/:sessionId` | Baca sesi |
| `POST` | `/api/session/:sessionId/turns` | Tambah giliran percakapan |
| `POST` | `/api/session/:sessionId/end` | Akhiri sesi |
| `POST` | `/api/asr/transcribe` | Transkripsi blob audio yang diunggah |
| `POST` | `/api/llm/turn` | Hasilkan giliran dialog berikutnya |
| `POST` | `/api/tts/synthesize` | Sintesis suara (default Supertonic) |
| `GET` | `/api/tts/voices` | Daftar suara Supertonic + status layanan |
| `POST` | `/api/tts/normalize` | Pratinjau normalisasi teks saja |
| `POST` | `/api/report/generate` | Bangun laporan evaluasi |

### 6. Peta modul

#### Backend (`server/`)

| Berkas | Peran |
| --- | --- |
| `index.ts` | Titik masuk HTTP, log startup |
| `app.ts` | Aplikasi Express, semua rute, validasi Zod |
| `config.ts` | Preset, parsing env, pengaturan runtime, health |
| `env.ts` | Memuat `.env` / `.env.local` |
| `data.ts` | Katalog skenario + tugas |
| `practiceSession.ts` | Logika siklus hidup sesi |
| `sessionStore.ts` | Penyimpanan sesi di memori |
| `settingsStore.ts` | Baca/tulis `.sela-settings.json` |
| `providers/liveProviders.ts` | Panggilan provider sungguhan (LLM, ASR, TTS) |
| `providers/mockProviders.ts` | Cadangan offline deterministik |
| `providers/reportSchema.ts` | Validasi laporan |
| `providers/ttsServiceStatus.ts` | Memantau sidecar Supertonic |

#### Bersama (`shared/`)

| Berkas | Peran |
| --- | --- |
| `schemas.ts` | Sumber tunggal semua skema Zod + tipe turunannya |
| `textNormalizer.ts` | Normalisasi angka/mata uang/waktu untuk TTS (ID + EN) |

#### Frontend (`src/`)

| Berkas / folder | Peran |
| --- | --- |
| `App.tsx` | Komponen akar, navigasi, orkestrasi sesi |
| `api.ts` | Klien API bertipe |
| `styles.css` | Seluruh sistem desain (token biru) |
| `components/` | `CoachAvatar`, `Sela3DAvatar`, `Sela3DScene`, `ReportDashboard`, `ApiSettingsPanel`, `BrandGuidelines`, `WeekDots` |
| `lipsync/` | `audioAnalyser`, `lipsyncStore`, `useLipsync`, `gerakMulut` |
| `domain/` | `learning`, `checkin`, `growth` — logika pembelajaran |
| `copy/` | `coachCopy` — semua teks untuk user |
| `storage.ts` | Penyimpanan `localStorage` (skenario, pengaturan, bahasa ASR) |
| `suaraBrowser.ts` | Pembungkus `speechSynthesis` browser — pemilihan suara, sinkron mulut, pengaman waktu |
| `pipecatVoiceClient.ts` | Klien suara WebRTC opsional |
| `practiceExperience.ts` | Pemetaan status & teks latihan |
| `practiceTranscript.ts` | Penyusunan transkrip |
| `reportDiagnostics.ts` | Diagnostik laporan |
| `storage.ts` | Pembantu penyimpanan lokal |

### 7. Siklus hidup sesi

```
running ──► paused ──► running
   │                     │
   ├─────────────────────┼──► completed
   │                     │
   └─────────────────────┴──► expired / cancelled
```

Status: `running`, `paused`, `completed`, `expired`, `cancelled`.

Sesi menyimpan daftar berurutan `ConversationTurn` (`speaker`: `ai` | `user` |
`system`), masing-masing dengan teks, stempel waktu, confidence opsional, durasi
audio, dan latensi.

### 8. State machine pelatih

Animasi avatar digerakkan oleh `CoachState`:

| Status | Arti | Klip avatar |
| --- | --- | --- |
| `idle` | Menunggu | Idle |
| `listening` | Pelajar sedang berbicara | Idle |
| `thinking` | Sedang menyusun balasan | Thinking |
| `asking` | Tutor sedang berbicara | Talking |
| `reviewing` | Memberi umpan balik | Thinking |
| `celebrating` | Pujian / penyelesaian | Greeting |

### 9. Tipe data frontend

Semua kontrak bersama ada di `shared/schemas.ts` dan diturunkan, tidak pernah
diduplikasi:

* `CoachState`, `TranscriptResult`, `DialogueTurnResult`, `SpeechAudioResult`
* `ReportResult` (dengan `scoreDimension`, `sentenceAnalysis`, `pronunciationTip`, `evidenceTurn`, `nextPractice`)
* `ConversationTurn`, `PracticeSession`, `PracticeSessionStatus`

### 10. Skenario yang tersedia

| Skenario | Tugas | Peran AI |
| --- | --- | --- |
| Wawancara Kerja | Perkenalan Diri Magang | Pewawancara AI |
| Wawancara Kerja | Kelebihan & Rencana Karir | Pewawancara AI |
| Rapat Bisnis | Menyampaikan Opini Proyek | Moderator Rapat AI |
| Pemesanan Restoran | Pesan dengan Preferensi Khusus | Pelayan AI |

Setiap tugas membawa `focus` (keterampilan berbicara yang dilatih) dan
`openingQuestion` yang ditanyakan tutor lebih dulu.
