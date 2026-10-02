# Development Guide

> **English** | [Bahasa Indonesia](#bahasa-indonesia)

---

## English

### 1. Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | 20+ (22 recommended) | Frontend + backend |
| Python | 3.10+ | Only for the Supertonic TTS sidecar |
| npm | bundled with Node | — |

### 2. Install

```bash
npm install                 # Node dependencies
cp .env.example .env.local  # then fill in your keys (optional)
```

### 3. Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Backend + frontend (no TTS sidecar) |
| `npm run dev:all` | TTS sidecar + backend + frontend (recommended) |
| `npm run dev:server` | Backend only (`tsx watch server/index.ts`) |
| `npm run dev:client` | Frontend only (`vite --host 127.0.0.1`) |
| `npm run dev:tts` | Supertonic sidecar (`scripts/start-tts.mjs`) |
| `npm run build` | Type-check, then production build into `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |

### 4. Ports

| Port | Service |
| --- | --- |
| `5173` | Vite dev server |
| `4173` | Vite preview (production build) |
| `5174` | Node / Express API |
| `7861` | Supertonic TTS sidecar |
| `7860` | Pipecat voice agent (optional) |

Vite proxies `/api` to `http://127.0.0.1:5174` in **both** `server` and
`preview` modes, so the built app behaves like the dev app.

### 5. Testing

The suite uses **Vitest** + **Supertest** (17 test files):

```bash
npm test
```

Coverage includes the API surface, session lifecycle, text normalisation,
report generation, the 3D avatar wrapper, and the Pipecat client.

Because `Sela3DScene` is lazy and WebGL-gated, the whole suite runs in **jsdom
without a GPU**.

### 6. Build & preview

```bash
npm run build
npx vite preview --host 127.0.0.1 --port 4173
```

The build emits separate chunks so the heavy 3D libraries never block first
paint:

| Chunk | Contents |
| --- | --- |
| `index-*.js` | App code |
| `vendor-three` | Three.js + React Three Fiber + drei |
| `vendor-voice` | Pipecat WebRTC client |
| `Sela3DScene-*.js` | Lazily loaded 3D scene (~2.8 kB) |

### 7. Project conventions

These are **mandatory** for this project:

1. **Comments in Bahasa Indonesia.** All new code comments must be written in
   Indonesian. Existing Indonesian comments must be preserved.
2. **New variables in Bahasa Indonesia.** New identifiers (variables, functions,
   constants) use Indonesian names, e.g. `hitungViseme`, `ambilStateLipsync`,
   `daftarSuara`. English is kept only where it is a proper noun or a library API.
3. **No emojis in the UI.** Use icons from `lucide-react` instead.
4. **Blue brand palette only.** No green. Use the CSS tokens, never hard-coded
   hex values.
5. **Never lose a feature.** This is a continuation project — modify and extend,
   never delete working functionality.

### 8. Design system

All styling lives in `src/styles.css`. Brand colours are exposed as CSS
variables in `:root`:

```css
--biru-utama: #1f7ae0;     /* primary blue */
--biru-terang: #7cb8ff;    /* light blue */
--biru-gelap: #145cb0;     /* dark blue */
--biru-muda-bg: #e7f1ff;   /* pale blue background */
```

Legacy green tokens are **aliased** to the blue ones, so there is a single
change point:

```css
--feather-green: var(--biru-utama);
--mask-green: var(--biru-terang);
--wing-overlay: var(--biru-gelap);
```

See **[visual-design-system.md](visual-design-system.md)** for the full palette.

### 9. Font

**Nunito Variable** (weight 200–1000), imported in `src/main.tsx` via
`@fontsource-variable/nunito` and listed first in the `font-family` stack.

### 10. 3D assets

| File | Purpose |
| --- | --- |
| `public/models/sela-tutor.glb` | Runtime model |
| `public/models/sela-tutor.fbx` | Editable Blender source |
| `public/brand/sela-ai.png` | Favicon + static avatar fallback |

To replace the model, drop a new GLB in `public/models/` and keep the same
filename, or update `JALUR_MODEL_SELA` in `src/components/Sela3DScene.tsx`.

### 11. Adding a scenario

1. Add an entry to `scenarios` in `server/data.ts`:

```ts
{
  id: "travel",
  nameZh: "Perjalanan",       // internal label
  nameEn: "Travel",
  descriptionZh: "...",
  tasks: [
    {
      id: "airport-checkin",
      titleZh: "Check-in Bandara",
      titleEn: "Airport Check-in",
      aiRoleZh: "Petugas Check-in AI",
      focus: "Sampaikan permintaan dengan jelas",
      openingQuestion: "Good morning, may I see your passport?"
    }
  ]
}
```

2. That is all — the UI reads the scenario list from `GET /api/scenarios`.

### 12. Troubleshooting

| Problem | Cause | Fix |
| --- | --- | --- |
| `EADDRINUSE` on 5174 | Another instance is running | Kill the old process or change `PORT` |
| Vite cannot write its cache | Permission issue | The project sets `cacheDir: ".vite-cache"`; ensure the folder is writable |
| TTS returns `local-offline` | Sidecar not running | `npm run dev:tts` |
| First TTS call is very slow | Model downloading (~385 MB) | Wait for `GET /health` → `ready: true` |
| 3D avatar shows a photo | No WebGL | Expected fallback; use a WebGL-capable browser |
| `tsc` complains about a new callback | It is probably outside the expected object | See `pipecatVoiceClient.ts` callbacks in `App.tsx` |

### 13. Repository layout

```
├── server/            # Express API
├── shared/            # Zod schemas + text normaliser (shared)
├── src/               # React frontend
│   ├── components/    # UI + 3D avatar
│   ├── lipsync/       # Lip sync engine
│   ├── domain/        # Learning logic
│   └── copy/          # User-facing strings
├── tests/             # Vitest suite
├── tts_service/       # Python Supertonic sidecar
├── pipecat_service/   # Optional Python voice agent
├── scripts/           # Helper scripts (TTS launcher)
├── docs/              # Documentation + screenshots
└── public/            # Static assets (brand, models)
```

---

## Bahasa Indonesia

### 1. Prasyarat

| Alat | Versi | Catatan |
| --- | --- | --- |
| Node.js | 20+ (disarankan 22) | Frontend + backend |
| Python | 3.10+ | Hanya untuk sidecar Supertonic TTS |
| npm | bawaan Node | — |

### 2. Pemasangan

```bash
npm install                 # Dependensi Node
cp .env.example .env.local  # lalu isi kunci Anda (opsional)
```

### 3. Skrip

| Skrip | Fungsinya |
| --- | --- |
| `npm run dev` | Backend + frontend (tanpa sidecar TTS) |
| `npm run dev:all` | Sidecar TTS + backend + frontend (disarankan) |
| `npm run dev:server` | Backend saja (`tsx watch server/index.ts`) |
| `npm run dev:client` | Frontend saja (`vite --host 127.0.0.1`) |
| `npm run dev:tts` | Sidecar Supertonic (`scripts/start-tts.mjs`) |
| `npm run build` | Type-check, lalu build produksi ke `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Jalankan suite Vitest sekali |
| `npm run test:watch` | Vitest mode watch |

### 4. Port

| Port | Layanan |
| --- | --- |
| `5173` | Server dev Vite |
| `4173` | Vite preview (build produksi) |
| `5174` | API Node / Express |
| `7861` | Sidecar Supertonic TTS |
| `7860` | Agen suara Pipecat (opsional) |

Vite mem-proxy `/api` ke `http://127.0.0.1:5174` di mode **`server` maupun
`preview`**, jadi aplikasi hasil build berperilaku sama seperti mode dev.

### 5. Pengujian

Suite memakai **Vitest** + **Supertest** (17 berkas uji):

```bash
npm test
```

Cakupannya meliputi permukaan API, siklus hidup sesi, normalisasi teks,
pembuatan laporan, pembungkus avatar 3D, dan klien Pipecat.

Karena `Sela3DScene` lazy dan bergerbang WebGL, seluruh suite berjalan di
**jsdom tanpa GPU**.

### 6. Build & pratinjau

```bash
npm run build
npx vite preview --host 127.0.0.1 --port 4173
```

Build memisahkan chunk supaya pustaka 3D yang berat tidak menghambat
render pertama:

| Chunk | Isi |
| --- | --- |
| `index-*.js` | Kode aplikasi |
| `vendor-three` | Three.js + React Three Fiber + drei |
| `vendor-voice` | Klien WebRTC Pipecat |
| `Sela3DScene-*.js` | Pemandangan 3D yang dimuat lazy (~2,8 kB) |

### 7. Konvensi proyek

Berikut **wajib** untuk proyek ini:

1. **Komentar dalam Bahasa Indonesia.** Semua komentar kode baru wajib
   berbahasa Indonesia. Komentar berbahasa Indonesia yang sudah ada harus
   dipertahankan.
2. **Variabel baru dalam Bahasa Indonesia.** Identifier baru (variabel, fungsi,
   konstanta) memakai nama Indonesia, mis. `hitungViseme`, `ambilStateLipsync`,
   `daftarSuara`. Bahasa Inggris hanya dipertahankan untuk nama diri atau API
   pustaka.
3. **Tanpa emoji di UI.** Gunakan ikon dari `lucide-react`.
4. **Hanya palet merek biru.** Tidak boleh hijau. Gunakan token CSS, jangan
   pernah menulis nilai hex langsung.
5. **Jangan pernah menghilangkan fitur.** Ini proyek lanjutan — modifikasi dan
   kembangkan, jangan hapus fungsi yang sudah jalan.

### 8. Sistem desain

Seluruh styling ada di `src/styles.css`. Warna merek diekspos sebagai variabel
CSS di `:root`:

```css
--biru-utama: #1f7ae0;     /* biru utama */
--biru-terang: #7cb8ff;    /* biru terang */
--biru-gelap: #145cb0;     /* biru gelap */
--biru-muda-bg: #e7f1ff;   /* latar biru muda */
```

Token hijau lama **dialias** ke token biru, jadi hanya ada satu titik perubahan:

```css
--feather-green: var(--biru-utama);
--mask-green: var(--biru-terang);
--wing-overlay: var(--biru-gelap);
```

Lihat **[visual-design-system.md](visual-design-system.md)** untuk palet lengkap.

### 9. Font

**Nunito Variable** (bobot 200–1000), diimpor di `src/main.tsx` lewat
`@fontsource-variable/nunito` dan diletakkan paling depan pada tumpukan
`font-family`.

### 10. Aset 3D

| Berkas | Fungsi |
| --- | --- |
| `public/models/sela-tutor.glb` | Model saat runtime |
| `public/models/sela-tutor.fbx` | Sumber Blender yang bisa diedit |
| `public/brand/sela-ai.png` | Favicon + avatar cadangan statis |

Untuk mengganti model, letakkan GLB baru di `public/models/` dengan nama berkas
yang sama, atau ubah `JALUR_MODEL_SELA` di `src/components/Sela3DScene.tsx`.

### 11. Menambah skenario

1. Tambahkan entri ke `scenarios` di `server/data.ts`:

```ts
{
  id: "travel",
  nameZh: "Perjalanan",       // label internal
  nameEn: "Travel",
  descriptionZh: "...",
  tasks: [
    {
      id: "airport-checkin",
      titleZh: "Check-in Bandara",
      titleEn: "Airport Check-in",
      aiRoleZh: "Petugas Check-in AI",
      focus: "Sampaikan permintaan dengan jelas",
      openingQuestion: "Good morning, may I see your passport?"
    }
  ]
}
```

2. Selesai — UI membaca daftar skenario dari `GET /api/scenarios`.

### 12. Pemecahan masalah

| Masalah | Penyebab | Solusi |
| --- | --- | --- |
| `EADDRINUSE` di 5174 | Ada instance lain berjalan | Matikan proses lama atau ubah `PORT` |
| Vite tidak bisa menulis cache | Masalah izin | Proyek memakai `cacheDir: ".vite-cache"`; pastikan folder bisa ditulis |
| TTS mengembalikan `local-offline` | Sidecar tidak jalan | `npm run dev:tts` |
| Panggilan TTS pertama sangat lama | Model sedang diunduh (~385 MB) | Tunggu `GET /health` → `ready: true` |
| Avatar 3D menampilkan foto | Tidak ada WebGL | Cadangan yang wajar; pakai browser ber-WebGL |
| `tsc` mengeluh soal callback baru | Kemungkinan berada di luar objek yang diharapkan | Lihat callback `pipecatVoiceClient.ts` di `App.tsx` |

### 13. Struktur repositori

```
├── server/            # API Express
├── shared/            # Skema Zod + normalizer teks (bersama)
├── src/               # Frontend React
│   ├── components/    # UI + avatar 3D
│   ├── lipsync/       # Mesin lip sync
│   ├── domain/        # Logika pembelajaran
│   └── copy/          # Teks untuk user
├── tests/             # Suite Vitest
├── tts_service/       # Sidecar Supertonic (Python)
├── pipecat_service/   # Agen suara opsional (Python)
├── scripts/           # Skrip pembantu (launcher TTS)
├── docs/              # Dokumentasi + tangkapan layar
└── public/            # Aset statis (merek, model)
```
