# 3D Avatar & Lip Sync

> **English** | [Bahasa Indonesia](#bahasa-indonesia)

---

## English

### 1. Overview

The tutor avatar is a **real 3D model**, not a 2D sprite. It is rendered with
React Three Fiber (Three.js) and animates its mouth in real time from the
coach's audio. This replaces the previous 2D animation.

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Model | Blender → GLB | Sela's rig, morph targets, animation clips |
| Renderer | `three@0.186.1`, `@react-three/fiber@9.8.1`, `@react-three/drei@10.7.9` | Canvas, camera, lighting, animation mixer |
| Lip sync | Web Audio API `AnalyserNode` | Turn audio amplitude + spectrum into visemes |
| Fallback | Text-driven visemes | Keep the mouth moving when audio analysis is unavailable |
| Wiring | `src/lipsync/*` + `src/components/Sela3D*.tsx` | Glue everything together |

### 2. Assets

| File | Size | Source |
| --- | --- | --- |
| `public/models/sela-tutor.glb` | ~12 MB | `Draft 11 (Animation) AI Sela_v05.glb` |
| `public/models/sela-tutor.fbx` | ~12 MB | `Draft 11 (Animation) AI Sela_v04.fbx` |
| `public/brand/sela-ai.png` | 312 KB | `SELA-AI.png` — also used as the static avatar fallback |

The GLB is the file actually loaded at runtime (`JALUR_MODEL_SELA = "/models/sela-tutor.glb"`).
The FBX is kept as the editable source for future Blender work.

### 3. Model anatomy

**Morph targets** (shape keys) present on the face mesh:

| Group | Targets | Purpose |
| --- | --- | --- |
| Visemes | `a`, `i`, `u`, `e`, `o` | Mouth shapes for speech |
| Blink | `blink.l`, `blink.r`, `blink.all` | Eye blinking |

**Animation clips** (as authored in Blender):

| Clip | Used when |
| --- | --- |
| `Idle` | Default resting state |
| `Talking` | Coach state `asking`, or while audio is playing |
| `Thinking` | Coach state `thinking` / `reviewing` |
| `Greeting` | Coach state `celebrating` |
| `Nodding`, `Shaking Head`, `Confused`, `Goodbye` | Available in the file, reserved for future use |
| `Talking_%temp` | **Explicitly skipped** — an experimental morph clip |

```ts
const KLIP_DILEWATI = new Set(["Talking_%temp"]);
```

### 4. Rendering pipeline

```
CoachAvatar  (src/components/CoachAvatar.tsx)
   └── Sela3DAvatar  (light wrapper)
         ├── dukungWebgl()?  ── no ──►  AvatarCadangan  (static photo + pulse)
         └── yes
               └── <Suspense> + <BatasGalat>   (error boundary)
                     └── lazy(() => import("./Sela3DScene"))   ← heavy chunk
                           └── <Canvas>  →  ModelSela  →  useGLTF(JALUR_MODEL_SELA)
```

Three deliberate design choices:

1. **Lazy loading.** `Sela3DScene` is a dynamic import, so Three.js stays out of
   the main bundle and is never executed during server-side render or tests.
   Vite emits it as a separate `Sela3DScene-*.js` chunk (~2.8 kB) alongside
   `vendor-three`.
2. **Graceful degradation.** `Sela3DAvatar` checks WebGL support first; if it is
   missing, or the model fails to load, `AvatarCadangan` shows the static
   `sela-ai.png` with a subtle pulse while the coach is speaking. The UI is
   never empty.
3. **Automatic framing.** On load, a `Box3` is computed over the model and the
   camera is positioned to frame head and shoulders — a tutor portrait — using
   `fov = 32` and a distance derived from the visible height.

### 5. Animation state machine

```ts
function pilihKlip(state: CoachState, bersuara: boolean): string {
  if (state === "celebrating") return KLIP.sapaan;      // Greeting
  if (state === "reviewing" || state === "thinking") return KLIP.berpikir;  // Thinking
  if (state === "asking" || bersuara) return KLIP.bicara;  // Talking
  return KLIP.idle;                                     // Idle
}
```

Clip transitions use `fadeIn(0.35)` / `fadeOut(0.35)` so the avatar never
"pops" between poses. A gentle procedural sway (sine waves on head rotation)
keeps the model from looking frozen; amplitude increases slightly while
speaking.

### 6. Lip sync architecture

#### 6.1 Audio path (primary)

```
TTS <audio> element  ─┐
                      ├─►  AnalyserNode (fftSize 1024, smoothing 0.6)
WebRTC bot stream    ─┘         │
                                ▼  every animation frame
        RMS (loudness)  +  3 frequency bands (bass / mid / treble)
                                │
                                ▼
        5 viseme weights  { a, i, u, e, o }  +  mouth opening
                                │
                                ▼
                  lipsyncStore  →  useFrame in Sela3DScene
                                │
                                ▼
        morphTargetInfluences on the face mesh
```

* **RMS** → how far the mouth opens (`Math.min(1, rms * 9)`).
* **Bass (60–400 Hz)** → wide vowels (`a`, `o`).
* **Mid (400–1800 Hz)** → `e`.
* **Treble (1800–6000 Hz)** → narrow vowels (`i`, `u`).
* An `AMBANG_SENYAP` (silence threshold) of `0.012` stops background noise from
  moving the mouth.
* A `PELEMBUT` (smoothing factor) of `0.45` interpolates between frames so the
  mouth does not jitter.

The analyser is registered in two ways:

| Function | Source | Notes |
| --- | --- | --- |
| `daftarkanElemenAudio(el)` | `<audio>` element (TTS playback) | Connected to `destination` so sound still plays |
| `daftarkanStreamAudio(stream)` | `MediaStream` (WebRTC bot audio) | **Not** connected to `destination` — the owning `<audio>` already plays it, otherwise audio would double |

#### 6.2 Text path (fallback)

When audio analysis is unavailable, `visemeDariTeks.ts` estimates a viseme
sequence directly from the text:

* `perkirakanDurasiMs(teks)` — rough duration estimate.
* `susunBingkaiViseme(teks)` — builds `[{ viseme, durasiMs }]` frames.
* `mulaiVisemeDariTeks(teks, onSelesai)` — plays the sequence and returns a
  cancel function.

This guarantees the mouth still moves even if the browser blocks audio
analysis.

#### 6.3 Shared state

`src/lipsync/lipsyncStore.ts` is a tiny observable store so the render loop and
the React tree can share state without re-rendering:

| Export | Purpose |
| --- | --- |
| `ambilStateLipsync()` | Read current state synchronously (used inside `useFrame`) |
| `langgananLipsync(fn)` | Subscribe to changes |
| `perbaruiLipsync(patch)` | Merge a partial update |
| `setelLipsyncDiam()` | Reset to silent |
| `kedipkanMata(nilai)` | Force a blink |
| `useLipsync()` | React hook wrapper |

`StateLipsync` carries `{ viseme, kebukaan, bersuara, berkedip, sumber }`.

### 7. Connecting WebRTC bot audio

When the optional Pipecat voice agent is active, the bot's audio arrives as a
WebRTC track. `src/pipecatVoiceClient.ts` exposes two optional callbacks so the
avatar can follow it:

```ts
// Callback opsional: dipakai untuk menyambungkan audio bot ke lip sync 3D.
onBotAudioStream?: (stream: MediaStream) => void;
// Callback opsional: dipanggil saat audio bot berhenti, agar lip sync diam.
onBotAudioStreamEnded?: () => void;
```

Inside `attachBotAudioTrack`, the client wraps the track in a `MediaStream`,
assigns it to the hidden `<audio>` element, and fires the callback:

```ts
const stream = new MediaStream([track]);
botAudio.srcObject = stream;
callbacks.onBotAudioStream?.(stream);
```

`App.tsx` consumes it:

```tsx
callbacks: {
  onBotAudioStream: (stream: MediaStream) => {
    lipsyncSourceRef.current = daftarkanStreamAudio(stream);
  },
  onBotAudioStreamEnded: () => {
    lepasSumberAudio(lipsyncSourceRef.current);
    lipsyncSourceRef.current = null;
  },
}
```

> **Note:** these callbacks must live **inside** the `callbacks` object passed to
> `createPipecatVoiceClient`, not as siblings of it — otherwise TypeScript
> rejects them and the lip sync never connects.

### 8. Lighting

A simple studio setup — no external HDR file needed:

| Light | Role |
| --- | --- |
| `ambientLight` (0.85, `#eaf2ff`) | Base fill |
| `hemisphereLight` (0.7) | Soft sky/ground gradient |
| `directionalLight` (2.1, front-right) | Key light |
| `directionalLight` (0.8, front-left) | Fill light |
| `pointLight` (0.6, front) | Catchlight on the face |

### 9. Testing

`tests/sela3dAvatar.test.tsx` covers the wrapper:

* Renders the static fallback when WebGL is unavailable.
* Renders the fallback while the lazy scene is suspended.
* Falls back to the photo if the scene throws (error boundary).

Because `Sela3DScene` is lazy and WebGL-gated, the whole suite runs in jsdom
without a GPU.

### 10. Tuning tips

| Want to change | Where |
| --- | --- |
| Mouth opens too much / too little | `rms * 9` in `audioAnalyser.ts` (`hitungViseme`) |
| Mouth jitters | Lower `PELEMBUT` (e.g. `0.3`) |
| Background noise triggers the mouth | Raise `AMBANG_SENYAP` |
| Blink frequency | `waktuKedipBerikutnya` in `Sela3DScene.tsx` (`2.4 + random * 2.6`) |
| Head sway amount | `amplitudo` in the `useFrame` block |
| Portrait framing | `tinggiTerlihat = ukuran.y * 0.46` and `fov = 32` |

---

## Bahasa Indonesia

### 1. Ringkasan

Avatar tutor adalah **model 3D sungguhan**, bukan sprite 2D. Ia dirender dengan
React Three Fiber (Three.js) dan menggerakkan mulutnya secara real time dari
audio pelatih. Ini menggantikan animasi 2D sebelumnya.

| Lapisan | Teknologi | Tanggung jawab |
| --- | --- | --- |
| Model | Blender → GLB | Rig Sela, morph target, klip animasi |
| Renderer | `three@0.186.1`, `@react-three/fiber@9.8.1`, `@react-three/drei@10.7.9` | Kanvas, kamera, pencahayaan, animation mixer |
| Lip sync | Web Audio API `AnalyserNode` | Mengubah amplitudo + spektrum audio menjadi viseme |
| Cadangan | Viseme dari teks | Menjaga mulut tetap bergerak bila analisis audio tidak tersedia |
| Perekat | `src/lipsync/*` + `src/components/Sela3D*.tsx` | Menyatukan semuanya |

### 2. Aset

| Berkas | Ukuran | Asal |
| --- | --- | --- |
| `public/models/sela-tutor.glb` | ~12 MB | `Draft 11 (Animation) AI Sela_v05.glb` |
| `public/models/sela-tutor.fbx` | ~12 MB | `Draft 11 (Animation) AI Sela_v04.fbx` |
| `public/brand/sela-ai.png` | 312 KB | `SELA-AI.png` — juga dipakai sebagai avatar cadangan statis |

GLB adalah berkas yang benar-benar dimuat saat runtime (`JALUR_MODEL_SELA = "/models/sela-tutor.glb"`).
FBX disimpan sebagai sumber yang bisa diedit untuk pekerjaan Blender berikutnya.

### 3. Anatomi model

**Morph target** (shape key) pada mesh wajah:

| Kelompok | Target | Fungsi |
| --- | --- | --- |
| Viseme | `a`, `i`, `u`, `e`, `o` | Bentuk mulut saat berbicara |
| Kedip | `blink.l`, `blink.r`, `blink.all` | Kedipan mata |

**Klip animasi** (sesuai pembuatan di Blender):

| Klip | Dipakai saat |
| --- | --- |
| `Idle` | Kondisi diam default |
| `Talking` | Status pelatih `asking`, atau saat audio diputar |
| `Thinking` | Status pelatih `thinking` / `reviewing` |
| `Greeting` | Status pelatih `celebrating` |
| `Nodding`, `Shaking Head`, `Confused`, `Goodbye` | Tersedia di berkas, disiapkan untuk pemakaian mendatang |
| `Talking_%temp` | **Sengaja dilewati** — klip morph eksperimental |

```ts
const KLIP_DILEWATI = new Set(["Talking_%temp"]);
```

### 4. Alur render

```
CoachAvatar  (src/components/CoachAvatar.tsx)
   └── Sela3DAvatar  (pembungkus ringan)
         ├── dukungWebgl()?  ── tidak ──►  AvatarCadangan  (foto statis + denyut)
         └── ya
               └── <Suspense> + <BatasGalat>   (pembatas galat)
                     └── lazy(() => import("./Sela3DScene"))   ← chunk berat
                           └── <Canvas>  →  ModelSela  →  useGLTF(JALUR_MODEL_SELA)
```

Tiga pilihan desain yang disengaja:

1. **Lazy loading.** `Sela3DScene` dimuat dinamis, jadi Three.js tidak masuk ke
   bundel utama dan tidak pernah dieksekusi saat render sisi server atau
   pengujian. Vite memisahkannya jadi chunk `Sela3DScene-*.js` (~2,8 kB)
   bersama `vendor-three`.
2. **Degradasi mulus.** `Sela3DAvatar` memeriksa dukungan WebGL lebih dulu;
   bila tidak ada, atau model gagal dimuat, `AvatarCadangan` menampilkan
   `sela-ai.png` statis dengan denyut halus saat pelatih berbicara. UI tidak
   pernah kosong.
3. **Pembingkaian otomatis.** Saat dimuat, `Box3` dihitung atas model dan kamera
   diposisikan untuk membingkai kepala dan bahu — potret tutor — memakai
   `fov = 32` dan jarak dari tinggi terlihat.

### 5. State machine animasi

```ts
function pilihKlip(state: CoachState, bersuara: boolean): string {
  if (state === "celebrating") return KLIP.sapaan;      // Greeting
  if (state === "reviewing" || state === "thinking") return KLIP.berpikir;  // Thinking
  if (state === "asking" || bersuara) return KLIP.bicara;  // Talking
  return KLIP.idle;                                     // Idle
}
```

Transisi klip memakai `fadeIn(0.35)` / `fadeOut(0.35)` supaya avatar tidak
"melompat" antar pose. Goyangan prosedural halus (gelombang sinus pada rotasi
kepala) menjaga model tidak terlihat kaku; amplitudonya sedikit meningkat saat
berbicara.

### 6. Arsitektur lip sync

#### 6.1 Jalur audio (utama)

```
Elemen <audio> TTS  ─┐
                     ├─►  AnalyserNode (fftSize 1024, smoothing 0.6)
Stream bot WebRTC   ─┘         │
                               ▼  setiap frame animasi
       RMS (kekuatan suara)  +  3 pita frekuensi (bass / mid / treble)
                               │
                               ▼
       5 bobot viseme  { a, i, u, e, o }  +  kebukaan mulut
                               │
                               ▼
                 lipsyncStore  →  useFrame di Sela3DScene
                               │
                               ▼
       morphTargetInfluences pada mesh wajah
```

* **RMS** → seberapa lebar mulut terbuka (`Math.min(1, rms * 9)`).
* **Bass (60–400 Hz)** → vokal lebar (`a`, `o`).
* **Mid (400–1800 Hz)** → `e`.
* **Treble (1800–6000 Hz)** → vokal sempit (`i`, `u`).
* `AMBANG_SENYAP` (ambang senyap) `0.012` mencegah derau latar menggerakkan mulut.
* `PELEMBUT` (faktor pelembut) `0.45` menginterpolasi antar frame supaya mulut
  tidak bergetar.

Analiser didaftarkan dengan dua cara:

| Fungsi | Sumber | Catatan |
| --- | --- | --- |
| `daftarkanElemenAudio(el)` | Elemen `<audio>` (pemutaran TTS) | Disambungkan ke `destination` agar suara tetap terdengar |
| `daftarkanStreamAudio(stream)` | `MediaStream` (audio bot WebRTC) | **Tidak** disambungkan ke `destination` — elemen `<audio>` pemiliknya sudah memutar, kalau disambung akan ganda |

#### 6.2 Jalur teks (cadangan)

Bila analisis audio tidak tersedia, `visemeDariTeks.ts` memperkirakan urutan
viseme langsung dari teks:

* `perkirakanDurasiMs(teks)` — perkiraan durasi kasar.
* `susunBingkaiViseme(teks)` — menyusun bingkai `[{ viseme, durasiMs }]`.
* `mulaiVisemeDariTeks(teks, onSelesai)` — memutar urutan dan mengembalikan
  fungsi pembatalan.

Ini menjamin mulut tetap bergerak walau browser memblokir analisis audio.

#### 6.3 State bersama

`src/lipsync/lipsyncStore.ts` adalah store observable kecil supaya loop render
dan pohon React bisa berbagi state tanpa re-render:

| Ekspor | Fungsi |
| --- | --- |
| `ambilStateLipsync()` | Baca state sekarang secara sinkron (dipakai di dalam `useFrame`) |
| `langgananLipsync(fn)` | Berlangganan perubahan |
| `perbaruiLipsync(patch)` | Gabungkan pembaruan sebagian |
| `setelLipsyncDiam()` | Reset ke diam |
| `kedipkanMata(nilai)` | Paksa kedipan |
| `useLipsync()` | Pembungkus hook React |

`StateLipsync` membawa `{ viseme, kebukaan, bersuara, berkedip, sumber }`.

### 7. Menyambungkan audio bot WebRTC

Saat agen suara Pipecat (opsional) aktif, audio bot datang sebagai track WebRTC.
`src/pipecatVoiceClient.ts` menyediakan dua callback opsional supaya avatar bisa
mengikutinya:

```ts
// Callback opsional: dipakai untuk menyambungkan audio bot ke lip sync 3D.
onBotAudioStream?: (stream: MediaStream) => void;
// Callback opsional: dipanggil saat audio bot berhenti, agar lip sync diam.
onBotAudioStreamEnded?: () => void;
```

Di dalam `attachBotAudioTrack`, klien membungkus track menjadi `MediaStream`,
menetapkannya ke elemen `<audio>` tersembunyi, lalu memicu callback:

```ts
const stream = new MediaStream([track]);
botAudio.srcObject = stream;
callbacks.onBotAudioStream?.(stream);
```

`App.tsx` mengonsumsinya:

```tsx
callbacks: {
  onBotAudioStream: (stream: MediaStream) => {
    lipsyncSourceRef.current = daftarkanStreamAudio(stream);
  },
  onBotAudioStreamEnded: () => {
    lepasSumberAudio(lipsyncSourceRef.current);
    lipsyncSourceRef.current = null;
  },
}
```

> **Catatan:** callback ini wajib berada **di dalam** objek `callbacks` yang
> diberikan ke `createPipecatVoiceClient`, bukan sejajar dengannya — kalau tidak,
> TypeScript akan menolak dan lip sync tidak pernah tersambung.

### 8. Pencahayaan

Setup studio sederhana — tanpa berkas HDR eksternal:

| Cahaya | Peran |
| --- | --- |
| `ambientLight` (0.85, `#eaf2ff`) | Isian dasar |
| `hemisphereLight` (0.7) | Gradasi langit/tanah lembut |
| `directionalLight` (2.1, depan-kanan) | Cahaya kunci |
| `directionalLight` (0.8, depan-kiri) | Cahaya isian |
| `pointLight` (0.6, depan) | Kilau pada wajah |

### 9. Pengujian

`tests/sela3dAvatar.test.tsx` menguji pembungkusnya:

* Menampilkan cadangan statis bila WebGL tidak tersedia.
* Menampilkan cadangan saat pemandangan lazy masih suspended.
* Jatuh ke foto bila pemandangan melempar galat (pembatas galat).

Karena `Sela3DScene` lazy dan bergerbang WebGL, seluruh suite berjalan di jsdom
tanpa GPU.

### 10. Tips penyetelan

| Ingin mengubah | Di mana |
| --- | --- |
| Mulut terlalu lebar / sempit | `rms * 9` di `audioAnalyser.ts` (`hitungViseme`) |
| Mulut bergetar | Turunkan `PELEMBUT` (mis. `0.3`) |
| Derau latar menggerakkan mulut | Naikkan `AMBANG_SENYAP` |
| Frekuensi kedipan | `waktuKedipBerikutnya` di `Sela3DScene.tsx` (`2.4 + random * 2.6`) |
| Besar goyangan kepala | `amplitudo` di blok `useFrame` |
| Pembingkaian potret | `tinggiTerlihat = ukuran.y * 0.46` dan `fov = 32` |
