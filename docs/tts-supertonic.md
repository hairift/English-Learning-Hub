# Supertonic TTS — Voice Engine & Number Normalisation

> **English** | [Bahasa Indonesia](#bahasa-indonesia)

---

## English

### 1. Why Supertonic is the default

| Requirement | How Supertonic satisfies it |
| --- | --- |
| Works in Indonesian **and** English | 31 built-in languages, including `id` and `en` |
| Female Indonesian voice by default | Voice `F1` (female) is the shipped default |
| Automatically switches language | `TTS_LANGUAGE_MODE=auto` detects ID/EN per sentence |
| Runs without a paid API key | Fully on-device ONNX inference (no network calls at runtime) |
| User-selectable voice | 10 voices (`F1`–`F5` female, `M1`–`M5` male) exposed in **Settings** |
| Adjustable speed & quality | Speed `0.7`–`2.0`, quality steps `5`–`12` |

Supertonic is **not** called directly from Node. It runs as a small Python
sidecar (FastAPI + uvicorn) on port **7861**, and the Node backend proxies to it.

### 2. Process topology

```
Browser (React)
   │  POST /api/tts/synthesize      (JSON: text, voice, lang, speed, steps)
   ▼
Node / Express  :5174
   │  1. normalisasiTeks()  ← shared/textNormalizer.ts  (ID + EN)
   │  2. POST http://127.0.0.1:7861/api/tts
   ▼
Supertonic sidecar  :7861   (FastAPI + uvicorn)
   │  normalizer.py (defensive second pass)
   │  supertonic_engine.py  →  supertonic.TTS(model="supertonic-3")
   ▼
WAV bytes (44.1 kHz, mono, 16-bit)  →  returned as base64/data-URL to the browser
```

### 3. Sidecar REST API

Base URL: `http://127.0.0.1:7861`

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| `GET` | `/health` | — | `{ alive, ready, model, voices, detail }` |
| `GET` | `/api/voices` | — | `{ default, voices: [{ id, label, gender }] }` |
| `POST` | `/api/normalize` | `{ text, lang }` | `{ original, text, lang }` |
| `POST` | `/api/tts` | `{ text, voice, lang, speed, steps }` | `{ audio_base64, format, sample_rate, duration, lang, voice }` |

The model is pre-loaded in a **daemon thread** during `lifespan`, so `/health`
answers immediately even while the 385 MB model is still downloading.

### 4. Engine details (`supertonic_engine.py`)

The real `supertonic` API (v1.3.1) is wrapped carefully:

```python
tts = TTS(model="supertonic-3", auto_download=True)   # ~385 MB, cached in ~/.cache/supertonic3/
style = tts.get_voice_style(voice_name="F1")
wav, duration = tts.synthesize(
    text="...", voice_style=style,
    total_steps=8, speed=1.05, lang="id", silence_duration=0.3,
)
tts.save_audio(wav, "output.wav")   # path string, NOT a BytesIO
```

Two things that are easy to get wrong:

* `synthesize()` returns a **tuple** `(wav_ndarray, duration_array)` — not just audio.
* `save_audio()` requires a **path string**. The engine therefore writes the WAV
  itself with the stdlib `wave` module + NumPy, and only falls back to
  `save_audio()` via a temp file if needed.
* `sample_rate` is `44100` and must be read from `tts.sample_rate` **after** the
  model has been loaded.

**Latency controls**

Diffusion-based TTS on CPU costs a few seconds per new sentence, so the engine and
the client both cache:

| Layer | Mechanism | Effect |
| --- | --- | --- |
| `supertonic_engine.py` | LRU result cache keyed by `(text, lang, voice, speed, steps)`, 64 entries | A repeated sentence returns instantly |
| `supertonic_engine.py` | `panaskan()` — one short warm-up synthesis after the model loads (daemon thread) | Removes the cold-start penalty for the first user |
| `src/App.tsx` | Client-side cache (40 entries) | Repeated AI phrases never hit the network |
| `src/App.tsx` | Replies split per sentence (`pecahKalimat`) | Playback starts after the first sentence instead of the whole paragraph |

Measured on this machine: a **new** sentence takes ≈ 4 s, a **repeated** sentence
≈ 0.02 s (~170× faster). The default `TTS_STEPS` is **6** (was 8) — a good
speed/quality balance; raise it in the settings panel for maximum quality.

### 5. Number normalisation — the core problem

Supertonic's built-in normaliser is tuned for English. When `lang="id"`, raw
digits are frequently read wrong: `15.000` becomes a decimal, `50%` is read in an
English accent, phone numbers are mangled, and `Rp` is spelled out letter by
letter.

**The fix: never send raw digits to the TTS. Convert them to words first.**

There are two defensive layers:

1. `shared/textNormalizer.ts` — the **primary** layer, used by both the Node
   server and the browser (for `window.speechSynthesis` fallback + previews).
2. `tts_service/normalizer.py` — a **defensive second pass** inside the sidecar,
   so the engine is still safe if called directly.

#### 5.1 Conversion rules

| Input | Indonesian output | English output |
| --- | --- | --- |
| `Rp15.000` | `lima belas ribu rupiah` | — |
| `IDR 2.500.000` | `dua juta lima ratus ribu rupiah` | — |
| `$1,250` | — | `one thousand, two hundred and fifty dollars` |
| `$5.2M` | — | `five point two million dollars` |
| `50%` | `lima puluh persen` | `fifty percent` |
| `14:30` | `jam empat belas lewat tiga puluh` | `fourteen thirty` |
| `3,5` | `tiga koma lima` | — |
| `3.5` | — | `three point five` |
| `081234567890` | `nol delapan satu dua tiga empat lima enam tujuh delapan sembilan nol` | same per-digit |
| `1.234.567` | `satu juta dua ratus tiga puluh empat ribu lima ratus enam puluh tujuh` | — |
| `1990` | `seribu sembilan ratus sembilan puluh` | `one thousand nine hundred and ninety` |

#### 5.2 Rules in detail

* **Thousands separators first.** Indonesian `1.234.567` uses dots as group
  separators, so the dots are stripped *before* decimal handling — otherwise the
  number would be read as a decimal.
* **Decimals use a comma in Indonesian.** `3,5` → `tiga koma lima`; English uses a
  point: `3.5` → `three point five`.
* **Per-digit spelling** for phone numbers, NIK, OTP, verification codes, and
  anything that looks like an ID. Digits are spelled one by one, never as a
  magnitude.
* **Currency symbols and codes** are recognised: `Rp`, `IDR`, `$`, `€`, `£`,
  `USD`, `EUR`, `GBP`, plus Indonesian magnitude shorthand (`juta`, `ribu`,
  `miliar`) and English shorthand (`K`, `M`, `B`).
* **Time** is expanded with `lewat` / `thirty`-style wording, without duplicating
  the word "jam".
* **Percent** is expanded to `persen` / `percent`.

#### 5.3 The placeholder trap (important for maintainers)

To avoid normalising the same digits twice, the normaliser temporarily replaces
already-converted text with **placeholders**. The naive implementation used a
digit as the placeholder index — which the final `\b\d+\b` pass then re-wrote
into words, corrupting the output (`\x00nol\x00`).

The fix: placeholders use **Private Use Area** characters.

```ts
const PENANDA_AWAL = "\uE000";
const PENANDA_AKHIR = "\uE001";
const BASIS_INDEKS_PENANDA = 0xe100;
function buatPenanda(indeks: number): string {
  return `${PENANDA_AWAL}${String.fromCharCode(BASIS_INDEKS_PENANDA + indeks)}${PENANDA_AKHIR}`;
}
```

The Python layer uses the same scheme (`_KUNCI_AWAL = "\uE000"`, `_BASIS_INDEKS = 0xE100`).
A final cleanup pass strips any leftover markers.

### 6. Language mode

| Mode | Behaviour |
| --- | --- |
| `auto` (default) | `deteksiBahasa()` scores ID vs EN keyword hits per sentence and picks the winner |
| `id` | Force Indonesian pronunciation |
| `en` | Force English pronunciation |

Because detection is **per sentence**, a mixed conversation (Indonesian learner,
English tutor) switches voice automatically without any user action.

### 7. Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `TTS_PROVIDER` | `supertonic` | Active TTS engine |
| `TTS_MODEL` | `supertonic-3` | Model identifier |
| `TTS_VOICE_ID` | `F1` | `F1`–`F5` female, `M1`–`M5` male |
| `TTS_LANGUAGE_MODE` | `auto` | `auto` \| `id` \| `en` |
| `TTS_SPEED` | `1` | `0.7`–`2.0` |
| `TTS_STEPS` | `8` | Quality, `5`–`12` |
| `TTS_SERVICE_URL` | `http://127.0.0.1:7861` | Sidecar URL |

Everything above is also editable at runtime from the **Settings → TTS** panel
without restarting the server.

### 8. Running the sidecar

```bash
# from the project root
npm run dev:tts        # creates .venv, installs requirements, starts on :7861

# or manually
cd tts_service
python -m venv .venv
./.venv/Scripts/pip install -r requirements.txt   # Windows
# source .venv/bin/activate && pip install -r requirements.txt   # macOS / Linux
./.venv/Scripts/python server.py --host 127.0.0.1 --port 7861
```

The first run downloads the ~385 MB model into `~/.cache/supertonic3/`.
Subsequent runs start instantly.

### 9. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `/api/health` shows `tts.status = "local-offline"` | Sidecar not running | `npm run dev:tts` |
| Voice preview button does nothing | `AudioContext` suspended (no user gesture yet) | Click once inside the page, then retry |
| Numbers still read oddly | Text bypassed the normaliser | Call `POST /api/tts/normalize` and inspect the output |
| First synthesis takes minutes | Model still downloading | Wait for `GET /health` → `ready: true` |
| `AttributeError: 'NoneType' object has no attribute 'sample_rate'` | Model not loaded yet | The engine calls `muat()` before reading `sample_rate`; ensure you did not reorder this |

### 10. Client-side reliability — why the voice no longer wobbles

The sidecar being healthy is not enough: the *perceived* instability users
reported ("sometimes it works, sometimes it doesn't") came from three
client-side behaviours that have all been fixed.

| Behaviour | Why it felt broken | Fix |
| --- | --- | --- |
| **Cold start.** The model loads on first use, so the very first sentence of a session could take ~5.5 s while the same sentence from cache takes ~0.12 s. | The opening line sometimes lagged, sometimes did not. | On load, `App.tsx` fires one background `synthesize()` for a short greeting. That warms the model **and** fills both the server and client caches. |
| **Permanent fallback.** Once a request failed, the app stayed on the browser voice until the page was reloaded — even after the sidecar came back. | Recovering the sidecar appeared to have no effect. | When every attempt fails, `ambilAudioTts()` calls `/api/tts/voices` in the background (that endpoint re-probes the sidecar) and then refreshes `/api/health`. |
| **Silent engine switching.** The UI showed only the provider name, so a drop to the browser voice looked like the app randomly changing voice. | Users could not tell which engine was speaking. | The navigation pill and practice chip now read `Supertonic F1 · Auto ID/EN` or `Suara browser (cadangan) · …`. |

Two guards protect the real-audio path:

* `audioTtsSah()` rejects `provider: "mock"`, `format: "mock"` and
  `fallback: true` **before** an `<audio>` element is created, so a known-bad
  payload never costs a failed `play()` round-trip.
* `ambilAudioTts()` retries once after a 350 ms pause, which absorbs the
  occasional first-request rejection while the model is still warming.

Measured on the local sidecar (`supertonic 1.3.1`, CPU): Indonesian cold
≈ 5.5 s, cached ≈ 0.12 s, English ≈ 4.5 s. The settings dialog's **voice preview**
button was verified end-to-end against the live sidecar and returns
`provider: "supertonic"`, `lang: "id"`, `voice: "F1"`, `fallback: false`.

**The hosted preview cannot run Supertonic — by design, not by bug.** The engine
needs a Python runtime, a ~174 MB virtualenv and **385 MB** of ONNX models
(`vector_estimator.onnx` 245 MB, `vocoder.onnx` 97 MB, `text_encoder.onnx`
35 MB), while the free sandbox exposes a single HTTP port and no Python. Paying
that cost on every cold start would exceed the startup limit. Verified on the
live link: `/api/health` → `tts.status: "local-offline"`, the voice chip reads
`Suara browser (cadangan) · Auto ID/EN`, and the mouth still animates
(`morphBergerak: true`, peak `0.916`) because `gerakMulut.ts` does not depend on
the audio signal. Run locally for the real Supertonic voice.

---

## Bahasa Indonesia

### 1. Kenapa Supertonic jadi default

| Kebutuhan | Cara Supertonic memenuhinya |
| --- | --- |
| Bisa Bahasa Indonesia **dan** Inggris | 31 bahasa bawaan, termasuk `id` dan `en` |
| Default suara perempuan Indonesia | Suara `F1` (perempuan) adalah default |
| Otomatis ganti bahasa | `TTS_LANGUAGE_MODE=auto` mendeteksi ID/EN per kalimat |
| Jalan tanpa kunci API berbayar | Inferensi ONNX sepenuhnya di perangkat (tanpa panggilan jaringan) |
| Suara bisa dipilih user | 10 suara (`F1`–`F5` perempuan, `M1`–`M5` pria) ada di **Pengaturan** |
| Kecepatan & kualitas bisa diatur | Kecepatan `0.7`–`2.0`, langkah kualitas `5`–`12` |

Supertonic **tidak** dipanggil langsung dari Node. Ia berjalan sebagai sidecar
Python kecil (FastAPI + uvicorn) di port **7861**, dan backend Node mem-proxy ke sana.

### 2. Topologi proses

```
Browser (React)
   │  POST /api/tts/synthesize      (JSON: text, voice, lang, speed, steps)
   ▼
Node / Express  :5174
   │  1. normalisasiTeks()  ← shared/textNormalizer.ts  (ID + EN)
   │  2. POST http://127.0.0.1:7861/api/tts
   ▼
Sidecar Supertonic  :7861   (FastAPI + uvicorn)
   │  normalizer.py (lapisan kedua sebagai pengaman)
   │  supertonic_engine.py  →  supertonic.TTS(model="supertonic-3")
   ▼
Byte WAV (44.1 kHz, mono, 16-bit)  →  dikirim sebagai base64/data-URL ke browser
```

### 3. REST API sidecar

Base URL: `http://127.0.0.1:7861`

| Method | Path | Body | Balikan |
| --- | --- | --- | --- |
| `GET` | `/health` | — | `{ alive, ready, model, voices, detail }` |
| `GET` | `/api/voices` | — | `{ default, voices: [{ id, label, gender }] }` |
| `POST` | `/api/normalize` | `{ text, lang }` | `{ original, text, lang }` |
| `POST` | `/api/tts` | `{ text, voice, lang, speed, steps }` | `{ audio_base64, format, sample_rate, duration, lang, voice }` |

Model dimuat di **daemon thread** saat `lifespan`, jadi `/health` langsung
menjawab walaupun model 385 MB masih dalam proses unduh.

### 4. Detail mesin (`supertonic_engine.py`)

API `supertonic` yang asli (v1.3.1) dibungkus dengan hati-hati:

```python
tts = TTS(model="supertonic-3", auto_download=True)   # ~385 MB, tersimpan di ~/.cache/supertonic3/
style = tts.get_voice_style(voice_name="F1")
wav, duration = tts.synthesize(
    text="...", voice_style=style,
    total_steps=8, speed=1.05, lang="id", silence_duration=0.3,
)
tts.save_audio(wav, "output.wav")   # wajib path (string), BUKAN BytesIO
```

Dua hal yang mudah salah:

* `synthesize()` mengembalikan **tuple** `(wav_ndarray, durasi_array)` — bukan hanya audio.
* `save_audio()` wajib **path string**. Karena itu mesin menulis WAV sendiri
  memakai modul `wave` standar + NumPy, dan hanya jatuh ke `save_audio()` lewat
  berkas sementara bila perlu.
* `sample_rate` = `44100` dan wajib dibaca dari `tts.sample_rate` **setelah**
  model dimuat.

**Kendali latensi**

TTS berbasis difusi di CPU butuh beberapa detik untuk setiap kalimat baru, jadi mesin
dan klien sama-sama menyimpan cache:

| Lapisan | Mekanisme | Efek |
| --- | --- | --- |
| `supertonic_engine.py` | Cache hasil (LRU) dengan kunci `(teks, lang, voice, speed, steps)`, 64 entri | Kalimat yang sama diulang kembali seketika |
| `supertonic_engine.py` | `panaskan()` — satu sintesis pendek setelah model dimuat (thread daemon) | Menghilangkan penalti cold-start bagi pengguna pertama |
| `src/App.tsx` | Cache sisi klien (40 entri) | Frasa AI berulang tidak lagi memanggil jaringan |
| `src/App.tsx` | Balasan dipecah per kalimat (`pecahKalimat`) | Pemutaran mulai setelah kalimat pertama, bukan seluruh paragraf |

Hasil ukur di mesin ini: kalimat **baru** ≈ 4 detik, kalimat **berulang** ≈ 0,02 detik
(~170× lebih cepat). `TTS_STEPS` bawaan kini **6** (sebelumnya 8) — keseimbangan
kecepatan/kualitas yang baik; naikkan lewat panel pengaturan bila ingin kualitas maksimal.

### 5. Normalisasi angka — inti masalahnya

Normalizer bawaan Supertonic dioptimalkan untuk bahasa Inggris. Saat `lang="id"`,
angka mentah sering dibaca salah: `15.000` dibaca desimal, `50%` dibaca logat
Inggris, nomor HP kacau, dan `Rp` dieja huruf per huruf.

**Solusinya: jangan pernah kirim angka mentah ke TTS. Ubah dulu ke kata.**

Ada dua lapisan pengaman:

1. `shared/textNormalizer.ts` — lapisan **utama**, dipakai server Node maupun
   browser (untuk cadangan `window.speechSynthesis` + pratinjau).
2. `tts_service/normalizer.py` — **lapisan kedua** di dalam sidecar, supaya mesin
   tetap aman bila dipanggil langsung.

#### 5.1 Aturan konversi

| Masukan | Keluaran Indonesia | Keluaran Inggris |
| --- | --- | --- |
| `Rp15.000` | `lima belas ribu rupiah` | — |
| `IDR 2.500.000` | `dua juta lima ratus ribu rupiah` | — |
| `$1,250` | — | `one thousand, two hundred and fifty dollars` |
| `$5.2M` | — | `five point two million dollars` |
| `50%` | `lima puluh persen` | `fifty percent` |
| `14:30` | `jam empat belas lewat tiga puluh` | `fourteen thirty` |
| `3,5` | `tiga koma lima` | — |
| `3.5` | — | `three point five` |
| `081234567890` | `nol delapan satu dua tiga empat lima enam tujuh delapan sembilan nol` | sama, per digit |
| `1.234.567` | `satu juta dua ratus tiga puluh empat ribu lima ratus enam puluh tujuh` | — |
| `1990` | `seribu sembilan ratus sembilan puluh` | `one thousand nine hundred and ninety` |

#### 5.2 Aturan lengkap

* **Pemisah ribuan diproses lebih dulu.** Indonesia memakai titik sebagai
  pemisah kelompok (`1.234.567`), jadi titik dibuang *sebelum* penanganan
  desimal — kalau tidak, angkanya akan dibaca sebagai desimal.
* **Desimal Indonesia memakai koma.** `3,5` → `tiga koma lima`; Inggris memakai
  titik: `3.5` → `three point five`.
* **Eja per digit** untuk nomor HP, NIK, OTP, kode verifikasi, dan apa pun yang
  mirip ID. Digit dieja satu per satu, bukan sebagai bilangan besar.
* **Simbol & kode mata uang** dikenali: `Rp`, `IDR`, `$`, `€`, `£`, `USD`, `EUR`,
  `GBP`, plus singkatan Indonesia (`juta`, `ribu`, `miliar`) dan Inggris
  (`K`, `M`, `B`).
* **Waktu** diperluas dengan gaya `lewat` / `thirty`, tanpa menduplikasi kata "jam".
* **Persen** diperluas jadi `persen` / `percent`.

#### 5.3 Jebakan penanda (penting untuk maintainer)

Supaya angka yang sudah dikonversi tidak diproses dua kali, normalizer
sementara mengganti teks hasil konversi dengan **penanda**. Implementasi naif
memakai digit sebagai indeks penanda — lalu lintasan `\b\d+\b` terakhir menulis
ulang digit itu menjadi kata, sehingga hasilnya rusak (`\x00nol\x00`).

Perbaikannya: penanda memakai karakter **Private Use Area**.

```ts
const PENANDA_AWAL = "\uE000";
const PENANDA_AKHIR = "\uE001";
const BASIS_INDEKS_PENANDA = 0xe100;
function buatPenanda(indeks: number): string {
  return `${PENANDA_AWAL}${String.fromCharCode(BASIS_INDEKS_PENANDA + indeks)}${PENANDA_AKHIR}`;
}
```

Lapisan Python memakai skema yang sama (`_KUNCI_AWAL = "\uE000"`, `_BASIS_INDEKS = 0xE100`).
Langkah pembersihan terakhir membuang sisa penanda.

### 6. Mode bahasa

| Mode | Perilaku |
| --- | --- |
| `auto` (default) | `deteksiBahasa()` menghitung kemunculan kata kunci ID vs EN per kalimat lalu memilih pemenangnya |
| `id` | Paksa pelafalan Bahasa Indonesia |
| `en` | Paksa pelafalan Bahasa Inggris |

Karena deteksi dilakukan **per kalimat**, percakapan campuran (murid berbahasa
Indonesia, tutor berbahasa Inggris) otomatis berganti suara tanpa aksi user.

### 7. Konfigurasi

| Variabel | Default | Arti |
| --- | --- | --- |
| `TTS_PROVIDER` | `supertonic` | Mesin TTS aktif |
| `TTS_MODEL` | `supertonic-3` | Identifier model |
| `TTS_VOICE_ID` | `F1` | `F1`–`F5` perempuan, `M1`–`M5` pria |
| `TTS_LANGUAGE_MODE` | `auto` | `auto` \| `id` \| `en` |
| `TTS_SPEED` | `1` | `0.7`–`2.0` |
| `TTS_STEPS` | `8` | Kualitas, `5`–`12` |
| `TTS_SERVICE_URL` | `http://127.0.0.1:7861` | URL sidecar |

Semuanya juga bisa diubah saat aplikasi berjalan lewat panel **Pengaturan → TTS**
tanpa restart server.

### 8. Menjalankan sidecar

```bash
# dari akar proyek
npm run dev:tts        # membuat .venv, memasang requirements, jalan di :7861

# atau manual
cd tts_service
python -m venv .venv
./.venv/Scripts/pip install -r requirements.txt   # Windows
# source .venv/bin/activate && pip install -r requirements.txt   # macOS / Linux
./.venv/Scripts/python server.py --host 127.0.0.1 --port 7861
```

Jalan pertama mengunduh model ~385 MB ke `~/.cache/supertonic3/`. Jalan
berikutnya langsung siap.

### 9. Pemecahan masalah

| Gejala | Penyebab | Solusi |
| --- | --- | --- |
| `/api/health` menampilkan `tts.status = "local-offline"` | Sidecar tidak jalan | `npm run dev:tts` |
| Tombol pratinjau suara tidak bereaksi | `AudioContext` masih suspended (belum ada interaksi user) | Klik sekali di halaman, lalu coba lagi |
| Angka masih dibaca aneh | Teks melewati normalizer | Panggil `POST /api/tts/normalize` dan periksa hasilnya |
| Sintesis pertama lama sekali | Model masih diunduh | Tunggu sampai `GET /health` → `ready: true` |
| `AttributeError: 'NoneType' object has no attribute 'sample_rate'` | Model belum dimuat | Mesin memanggil `muat()` sebelum membaca `sample_rate`; pastikan urutannya tidak diubah |

### 10. Keandalan di sisi klien — kenapa suaranya berhenti goyah

Sidecar yang sehat saja tidak cukup: ketidakstabilan yang *dirasakan* pengguna
("kadang bisa, kadang tidak") berasal dari tiga perilaku sisi klien yang
semuanya sudah diperbaiki.

| Perilaku | Kenapa terasa rusak | Perbaikan |
| --- | --- | --- |
| **Mulai dingin.** Model dimuat saat pertama dipakai, jadi kalimat pertama sebuah sesi bisa butuh ~5,5 detik sementara kalimat yang sama dari cache hanya ~0,12 detik. | Kalimat pembuka kadang lambat, kadang tidak. | Saat aplikasi dimuat, `App.tsx` menjalankan satu `synthesize()` latar untuk sapaan pendek. Itu memanaskan model **sekaligus** mengisi cache server dan klien. |
| **Cadangan permanen.** Setelah satu permintaan gagal, aplikasi bertahan di suara browser sampai halaman dimuat ulang — walaupun sidecar sudah hidup lagi. | Menghidupkan sidecar kembali tampak tidak berpengaruh. | Bila semua percobaan gagal, `ambilAudioTts()` memanggil `/api/tts/voices` di latar (endpoint itu memeriksa ulang sidecar) lalu menyegarkan `/api/health`. |
| **Pergantian mesin tanpa kabar.** UI hanya menampilkan nama provider, jadi turunnya kualitas ke suara browser terlihat seperti aplikasi berganti suara secara acak. | Pengguna tidak bisa tahu mesin mana yang bicara. | Chip navigasi dan chip ruang latihan kini berbunyi `Supertonic F1 · Auto ID/EN` atau `Suara browser (cadangan) · …`. |

Dua penjaga melindungi jalur audio asli:

* `audioTtsSah()` menolak `provider: "mock"`, `format: "mock"`, dan
  `fallback: true` **sebelum** elemen `<audio>` dibuat, sehingga muatan yang sudah
  diketahui buruk tidak pernah memakan satu siklus `play()` yang gagal.
* `ambilAudioTts()` mencoba ulang sekali setelah jeda 350 ms, yang menyerap
  penolakan permintaan pertama saat model masih menghangat.

Diukur pada sidecar lokal (`supertonic 1.3.1`, CPU): Bahasa Indonesia dingin
≈ 5,5 detik, dari cache ≈ 0,12 detik, Bahasa Inggris ≈ 4,5 detik. Tombol
**pratinjau suara** di dialog pengaturan sudah diverifikasi menyeluruh terhadap
sidecar yang hidup dan mengembalikan `provider: "supertonic"`, `lang: "id"`,
`voice: "F1"`, `fallback: false`.

**Pratinjau hosting tidak bisa menjalankan Supertonic — memang begitu, bukan bug.**
Mesin ini butuh runtime Python, virtualenv ~174 MB, dan **385 MB** model ONNX
(`vector_estimator.onnx` 245 MB, `vocoder.onnx` 97 MB, `text_encoder.onnx`
35 MB), sedangkan sandbox gratis hanya membuka satu port HTTP tanpa Python.
Membayar biaya itu di setiap start dingin akan melewati batas waktu start.
Terverifikasi pada tautan hosting: `/api/health` → `tts.status: "local-offline"`,
chip mesin suara berbunyi `Suara browser (cadangan) · Auto ID/EN`, dan mulut tetap
bergerak (`morphBergerak: true`, puncak `0.916`) karena `gerakMulut.ts` tidak
bergantung pada sinyal audio. Jalankan secara lokal untuk suara Supertonic asli.
