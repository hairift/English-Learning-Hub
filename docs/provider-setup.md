# Provider Setup

> **English** | [Bahasa Indonesia](#bahasa-indonesia)

---

## English

Sela Tutor English has three independent provider slots — **LLM**, **ASR**, and
**TTS** — plus a **pronunciation** assessor. You can configure them two ways:

1. **`.env` / `.env.local`** — for defaults at startup.
2. **Settings panel in the app** — for runtime changes (persisted to
   `.sela-settings.json`).

### 1. Quick start

```bash
cp .env.example .env.local
# edit .env.local, then:
npm run dev:all
```

The shipped default is the **`sela-default`** preset:

| Slot | Provider | Why |
| --- | --- | --- |
| LLM | **Groq** (`qwen/qwen3.8-27b`) | Fast and cheap; OpenAI-compatible API |
| TTS | **Supertonic** (`supertonic-3`, voice `F1`) | On-device, ID + EN, no per-request cost |
| ASR | **Browser native** (Web Speech API) | No key needed |
| Pronunciation | **Rule-based** | Works offline |

With `API_MODE=mock` the app runs with **zero keys** — every provider has a
deterministic mock.

### 2. Modes

| `API_MODE` | Behaviour |
| --- | --- |
| `mock` | No paid API calls. Safe for demos, tests, and offline work. |
| `live` | Calls the real providers configured below. |

### 3. Presets

Set `API_PROVIDER_PRESET` to one of:

| Preset | LLM | TTS | ASR |
| --- | --- | --- | --- |
| `sela-default` | Groq | Supertonic | Browser native |
| `groq-elevenlabs` | Groq | ElevenLabs | Browser native |
| `china-qwen` | Qwen (DashScope) | Qwen TTS | Qwen ASR |
| `global-mixed` | OpenAI-compatible | Cartesia | AssemblyAI |
| `custom` | configure manually | configure manually | configure manually |

A preset only fills in **defaults** — any explicit variable overrides it.

### 4. LLM configuration

The LLM is the tutor's brain. Any **OpenAI-compatible** endpoint works.

| Variable | Meaning |
| --- | --- |
| `LLM_PROVIDER` | `openai` \| `qwen` \| `doubao` \| `kimi` \| `groq` \| `custom-openai-compatible` |
| `LLM_BASE_URL` | API base URL |
| `LLM_MODEL` | Model id |
| `LLM_API_KEY` | Generic key (fallback for all providers) |

Provider-specific keys (checked first):

| Provider | Key variable | Base URL |
| --- | --- | --- |
| Groq | `GROQ_API_KEY` | `https://api.groq.com/openai/v1` |
| Qwen | `DASHSCOPE_API_KEY` | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| Doubao | `ARK_API_KEY` | `https://ark.cn-beijing.volces.com/api/v3` |
| Kimi | `MOONSHOT_API_KEY` | `https://api.moonshot.cn/v1` |
| OpenAI | `OPENAI_API_KEY` | `https://api.openai.com/v1` |

Example (Groq, the default):

```env
LLM_PROVIDER=groq
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=qwen/qwen3.8-27b
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
```

**Using your own endpoint** — point `LLM_BASE_URL` at any OpenAI-compatible
server and set `LLM_PROVIDER=custom-openai-compatible`:

```env
LLM_PROVIDER=custom-openai-compatible
LLM_BASE_URL=https://your-endpoint.example/v1
LLM_MODEL=your-model
LLM_API_KEY=sk-xxxxxxxxxxxx
```

### 5. TTS configuration

See **[tts-supertonic.md](tts-supertonic.md)** for the full Supertonic
specification, including number normalisation.

#### Supertonic (default)

| Variable | Default | Meaning |
| --- | --- | --- |
| `TTS_PROVIDER` | `supertonic` | Active engine |
| `TTS_MODEL` | `supertonic-3` | Model id |
| `TTS_VOICE_ID` | `F1` | `F1`–`F5` female, `M1`–`M5` male |
| `TTS_LANGUAGE_MODE` | `auto` | `auto` \| `id` \| `en` |
| `TTS_SPEED` | `1` | `0.7`–`2.0` |
| `TTS_STEPS` | `8` | Quality, `5`–`12` |
| `TTS_SERVICE_URL` | `http://127.0.0.1:7861` | Sidecar URL |

Requires the Python sidecar: `npm run dev:tts`.

#### Alternative TTS providers

| Provider | Key variable | Extra |
| --- | --- | --- |
| ElevenLabs | `ELEVENLABS_API_KEY` or `TTS_API_KEY` | `TTS_MODEL=eleven_multilingual_v2` |
| Cartesia | `CARTESIA_API_KEY` | `TTS_VERSION`, `CARTESIA_VOICE_ID` |
| Qwen TTS | `DASHSCOPE_API_KEY` | `TTS_MODEL=qwen3-tts-flash` |
| Mock | — | `TTS_PROVIDER=mock` |

```env
# ElevenLabs
TTS_PROVIDER=elevenlabs
TTS_API_KEY=sk_xxxxxxxxxxxx
TTS_MODEL=eleven_multilingual_v2
TTS_VOICE_ID=<your-voice-id>
```

> **Note:** Supertonic is the only provider that is *ready without a key*.
> All other providers report `missing-key` until a key is supplied.

### 6. ASR configuration

ASR turns the learner's speech into text.

| Variable | Meaning |
| --- | --- |
| `ASR_PROVIDER` | `mock` \| `deepgram` \| `qwen-asr` \| `assemblyai` \| `aliyun-isi` \| `iflytek` |
| `ASR_MODEL` | Model id |
| `ASR_API_KEY` | Generic key |
| `DEEPGRAM_API_KEY` | Deepgram-specific key |

| Provider | Status | Key |
| --- | --- | --- |
| `mock` (browser native) | Ready, no key | — |
| `deepgram` | Implemented | `DEEPGRAM_API_KEY` |
| `qwen-asr` | Implemented | `DASHSCOPE_API_KEY` |
| `assemblyai` | Implemented | `ASSEMBLYAI_API_KEY` |
| `aliyun-isi`, `iflytek` | Planned | — |

```env
ASR_PROVIDER=deepgram
ASR_MODEL=nova-3
DEEPGRAM_API_KEY=xxxxxxxxxxxx
```

### 7. Pronunciation assessor

| Variable | Options | Notes |
| --- | --- | --- |
| `PRONUNCIATION_PROVIDER` | `rule` \| `qwen` \| `iflytek` | `rule` works offline; `qwen` needs an LLM key |

### 8. Ports

| Variable | Default | Service |
| --- | --- | --- |
| `PORT` | `5174` | Node / Express API |
| `VITE_PIPECAT_BASE_URL` | `http://127.0.0.1:7860` | Optional Pipecat voice agent |
| `VITE_BUSINESS_API_URL` | `http://127.0.0.1:5174` | Business API for Pipecat |
| `VITE_TTS_SERVICE_URL` | `http://127.0.0.1:7861` | Supertonic sidecar |

### 9. Configuring at runtime

Open **Settings** in the app. You can:

* choose a preset,
* override the LLM base URL / model / key,
* pick the TTS provider, voice, language mode, speed, and quality,
* preview the voice before saving,
* reset everything to defaults.

Runtime settings are persisted to `.sela-settings.json` (git-ignored) and take
effect immediately — no restart.

### 10. Health check

```bash
curl http://127.0.0.1:5174/api/health
```

The response reports, for each provider, `configured`, `active`, `status`
(`ready` / `missing-key` / `local-offline` / `planned`), and the model in use.
For Supertonic it also reports `serviceAlive`, `serviceReady`, and the list of
available voices.

---

## Bahasa Indonesia

Sela Tutor English punya tiga slot provider independen — **LLM**, **ASR**, dan
**TTS** — plus penilai **pengucapan**. Anda bisa mengaturnya dengan dua cara:

1. **`.env` / `.env.local`** — untuk default saat startup.
2. **Panel Pengaturan di aplikasi** — untuk perubahan saat berjalan (disimpan ke
   `.sela-settings.json`).

### 1. Mulai cepat

```bash
cp .env.example .env.local
# edit .env.local, lalu:
npm run dev:all
```

Default bawaan adalah preset **`sela-default`**:

| Slot | Provider | Alasan |
| --- | --- | --- |
| LLM | **Groq** (`qwen/qwen3.8-27b`) | Cepat dan murah; API kompatibel OpenAI |
| TTS | **Supertonic** (`supertonic-3`, suara `F1`) | Di perangkat, ID + EN, tanpa biaya per permintaan |
| ASR | **Browser native** (Web Speech API) | Tanpa kunci |
| Pengucapan | **Berbasis aturan** | Jalan offline |

Dengan `API_MODE=mock`, aplikasi jalan dengan **nol kunci** — setiap provider
punya mock deterministik.

### 2. Mode

| `API_MODE` | Perilaku |
| --- | --- |
| `mock` | Tanpa panggilan API berbayar. Aman untuk demo, pengujian, dan kerja offline. |
| `live` | Memanggil provider sungguhan yang dikonfigurasi di bawah. |

### 3. Preset

Set `API_PROVIDER_PRESET` ke salah satu:

| Preset | LLM | TTS | ASR |
| --- | --- | --- | --- |
| `sela-default` | Groq | Supertonic | Browser native |
| `groq-elevenlabs` | Groq | ElevenLabs | Browser native |
| `china-qwen` | Qwen (DashScope) | Qwen TTS | Qwen ASR |
| `global-mixed` | OpenAI-compatible | Cartesia | AssemblyAI |
| `custom` | atur manual | atur manual | atur manual |

Preset hanya mengisi **default** — variabel eksplisit apa pun akan menimpanya.

### 4. Konfigurasi LLM

LLM adalah otak tutor. Semua endpoint yang **kompatibel OpenAI** bisa dipakai.

| Variabel | Arti |
| --- | --- |
| `LLM_PROVIDER` | `openai` \| `qwen` \| `doubao` \| `kimi` \| `groq` \| `custom-openai-compatible` |
| `LLM_BASE_URL` | URL dasar API |
| `LLM_MODEL` | ID model |
| `LLM_API_KEY` | Kunci generik (cadangan untuk semua provider) |

Kunci khusus provider (diperiksa lebih dulu):

| Provider | Variabel kunci | Base URL |
| --- | --- | --- |
| Groq | `GROQ_API_KEY` | `https://api.groq.com/openai/v1` |
| Qwen | `DASHSCOPE_API_KEY` | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| Doubao | `ARK_API_KEY` | `https://ark.cn-beijing.volces.com/api/v3` |
| Kimi | `MOONSHOT_API_KEY` | `https://api.moonshot.cn/v1` |
| OpenAI | `OPENAI_API_KEY` | `https://api.openai.com/v1` |

Contoh (Groq, default):

```env
LLM_PROVIDER=groq
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=qwen/qwen3.8-27b
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
```

**Memakai endpoint sendiri** — arahkan `LLM_BASE_URL` ke server kompatibel
OpenAI mana pun dan set `LLM_PROVIDER=custom-openai-compatible`:

```env
LLM_PROVIDER=custom-openai-compatible
LLM_BASE_URL=https://your-endpoint.example/v1
LLM_MODEL=your-model
LLM_API_KEY=sk-xxxxxxxxxxxx
```

### 5. Konfigurasi TTS

Lihat **[tts-supertonic.md](tts-supertonic.md)** untuk spesifikasi Supertonic
lengkap, termasuk normalisasi angka.

#### Supertonic (default)

| Variabel | Default | Arti |
| --- | --- | --- |
| `TTS_PROVIDER` | `supertonic` | Mesin aktif |
| `TTS_MODEL` | `supertonic-3` | ID model |
| `TTS_VOICE_ID` | `F1` | `F1`–`F5` perempuan, `M1`–`M5` pria |
| `TTS_LANGUAGE_MODE` | `auto` | `auto` \| `id` \| `en` |
| `TTS_SPEED` | `1` | `0.7`–`2.0` |
| `TTS_STEPS` | `8` | Kualitas, `5`–`12` |
| `TTS_SERVICE_URL` | `http://127.0.0.1:7861` | URL sidecar |

Butuh sidecar Python: `npm run dev:tts`.

#### Provider TTS alternatif

| Provider | Variabel kunci | Tambahan |
| --- | --- | --- |
| ElevenLabs | `ELEVENLABS_API_KEY` atau `TTS_API_KEY` | `TTS_MODEL=eleven_multilingual_v2` |
| Cartesia | `CARTESIA_API_KEY` | `TTS_VERSION`, `CARTESIA_VOICE_ID` |
| Qwen TTS | `DASHSCOPE_API_KEY` | `TTS_MODEL=qwen3-tts-flash` |
| Mock | — | `TTS_PROVIDER=mock` |

```env
# ElevenLabs
TTS_PROVIDER=elevenlabs
TTS_API_KEY=sk_xxxxxxxxxxxx
TTS_MODEL=eleven_multilingual_v2
TTS_VOICE_ID=<voice-id-anda>
```

> **Catatan:** Supertonic adalah satu-satunya provider yang *siap tanpa kunci*.
> Provider lain melaporkan `missing-key` sampai kunci diberikan.

### 6. Konfigurasi ASR

ASR mengubah ucapan pelajar menjadi teks.

| Variabel | Arti |
| --- | --- |
| `ASR_PROVIDER` | `mock` \| `deepgram` \| `qwen-asr` \| `assemblyai` \| `aliyun-isi` \| `iflytek` |
| `ASR_MODEL` | ID model |
| `ASR_API_KEY` | Kunci generik |
| `DEEPGRAM_API_KEY` | Kunci khusus Deepgram |

| Provider | Status | Kunci |
| --- | --- | --- |
| `mock` (browser native) | Siap, tanpa kunci | — |
| `deepgram` | Terimplementasi | `DEEPGRAM_API_KEY` |
| `qwen-asr` | Terimplementasi | `DASHSCOPE_API_KEY` |
| `assemblyai` | Terimplementasi | `ASSEMBLYAI_API_KEY` |
| `aliyun-isi`, `iflytek` | Direncanakan | — |

```env
ASR_PROVIDER=deepgram
ASR_MODEL=nova-3
DEEPGRAM_API_KEY=xxxxxxxxxxxx
```

### 7. Penilai pengucapan

| Variabel | Opsi | Catatan |
| --- | --- | --- |
| `PRONUNCIATION_PROVIDER` | `rule` \| `qwen` \| `iflytek` | `rule` jalan offline; `qwen` butuh kunci LLM |

### 8. Port

| Variabel | Default | Layanan |
| --- | --- | --- |
| `PORT` | `5174` | API Node / Express |
| `VITE_PIPECAT_BASE_URL` | `http://127.0.0.1:7860` | Agen suara Pipecat opsional |
| `VITE_BUSINESS_API_URL` | `http://127.0.0.1:5174` | Business API untuk Pipecat |
| `VITE_TTS_SERVICE_URL` | `http://127.0.0.1:7861` | Sidecar Supertonic |

### 9. Mengatur saat berjalan

Buka **Pengaturan** di aplikasi. Anda bisa:

* memilih preset,
* menimpa base URL / model / kunci LLM,
* memilih provider TTS, suara, mode bahasa, kecepatan, dan kualitas,
* mempratinjau suara sebelum menyimpan,
* mereset semuanya ke default.

Pengaturan runtime disimpan ke `.sela-settings.json` (diabaikan git) dan berlaku
seketika — tanpa restart.

### 10. Pemeriksaan kesehatan

```bash
curl http://127.0.0.1:5174/api/health
```

Responsnya melaporkan, untuk setiap provider, `configured`, `active`, `status`
(`ready` / `missing-key` / `local-offline` / `planned`), dan model yang dipakai.
Untuk Supertonic juga dilaporkan `serviceAlive`, `serviceReady`, dan daftar suara
yang tersedia.
