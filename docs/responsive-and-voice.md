# Responsive Layout & Voice Pipeline

> **English** | [Bahasa Indonesia](#bahasa-indonesia)

---

## English

### 1. Why this document exists

Three problems kept resurfacing in user testing and are addressed together here
because they share the same root cause — the app assumed a large desktop screen
and a perfectly working local TTS service:

1. **The avatar's mouth never moved.** Lip sync only worked when the coach's
   voice came from an `<audio>` element that Web Audio could tap. Whenever the
   app fell back to the browser's `speechSynthesis`, there was no analysable
   signal at all, so the mouth stayed shut.
2. **Speech recognition only understood English.** `recognition.lang` was
   hard-coded to `en-US`, so Indonesian answers came back as nonsense.
3. **The layout was uncomfortable on tablets and phones.** The navigation
   stacked into tall columns below 767 px, the practice room and its transcript
   panel fought for width, and the settings dialog was clipped by the sticky
   header.

### 2. Mouth movement that always works

Lip sync now has **two drivers** that cooperate instead of one that fails
silently.

| Driver | File | When it is in control |
| --- | --- | --- |
| Audio analysis | `src/lipsync/audioAnalyser.ts` | An `<audio>` element is playing and the `AnalyserNode` reports real signal |
| Procedural motion | `src/lipsync/gerakMulut.ts` | Anything else — browser `speechSynthesis`, missing audio, silent decode |

The procedural driver is **always started** while the coach speaks. It yields to
the audio analyser only while the analyser is genuinely producing signal, and
takes back over after 600 ms without signal. This means the mouth moves in every
scenario, while still being phonetically accurate whenever real audio exists.

```
speakText()
   ├─ start mulaiGerakMulut(chunk)          ← always, as a safety net
   └─ play <audio> chunk
         ├─ analyser has signal  → procedural driver stays quiet (audio wins)
         └─ no signal for 600 ms → procedural driver takes over
```

Additional details:

* The mouth starts moving **immediately**, not on `SpeechSynthesisUtterance.onstart`.
  Browsers do not reliably fire `onstart` when no matching voice is installed.
* When `speechSynthesis` *does* fire `onboundary`, the character index is fed
  into `KendaliMulut.lompatKeKarakter()` so the mouth follows the actual word
  being spoken.
* Vowel shapes are mapped per letter class; bilabials (`m`, `b`, `p`) close the
  lips, and punctuation inserts a longer pause so the mouth "breathes".

### 3. Speech recognition in Indonesian *and* English

Web Speech API recognises **one language per session** and has no auto-detect.
The app therefore offers an explicit choice with a sensible adaptive default.

| Mode | Behaviour |
| --- | --- |
| `Otomatis` (default) | Starts in the last used language; after every final result the transcript is re-checked with `deteksiBahasa()`. If the learner switched language, the next recognition session uses the other one. |
| `Indonesia` | Locks `recognition.lang = "id-ID"`. |
| `Inggris` | Locks `recognition.lang = "en-US"`. |

The switch lives directly above the answer bar on the practice screen so it can
be changed mid-conversation. Changing it while recording stops and restarts the
recogniser (the `lang` property is immutable while active) **without** sending
the answer in progress. The preference persists in `localStorage` under
`sela-asr-language`.

### 4. A TTS path that does not wobble

| Problem | Fix |
| --- | --- |
| Mock audio was treated as real audio, wasting a failed `play()` round-trip | `audioTtsSah()` rejects `provider: "mock"`, `format: "mock"` and `fallback: true` before an `<audio>` element is ever created |
| A single transient failure dropped the app to the browser voice | `ambilAudioTts()` retries once after a 350 ms pause |
| Browser fallback picked an arbitrary voice | `pilihSuaraTerbaik()` scores voices by language code, a curated name list, and "natural"/"online" markers |
| Conversations could hang if `onend` never fired | `ucapkanDenganBrowser()` has a watchdog timer at `estimated duration × 1.5 + 2.5 s` |
| The **first** sentence after a cold start was slow (the model is loaded on first use), which felt like "sometimes it works, sometimes it doesn't" | On load the app fires one background `synthesize()` for a short greeting, warming the model **and** filling both the server and client caches |
| Once the sidecar recovered, the app stayed on the browser voice until reload | When every attempt fails, `ambilAudioTts()` calls `/api/tts/voices` in the background — that endpoint re-probes the sidecar — then refreshes `/api/health` |
| It was impossible to tell which engine was speaking | The navigation pill and the practice chip now read `Supertonic F1 · Auto ID/EN` or `Suara browser (cadangan) · …` instead of a bare provider name |

Measured on the local sidecar (`supertonic 1.3.1`, CPU): a cold Indonesian
sentence takes ≈ 5.5 s, the same sentence from cache ≈ 0.12 s, and an English
sentence ≈ 4.5 s. The active engine is always visible in the navigation bar
(voice pill) and the settings dialog shows the live Supertonic sidecar status.

### 5. Responsive layout

Breakpoints are declared once, at the end of `src/styles.css`, so they form the
final source of truth and do not fight the older, scattered media queries.

| Width | Target | Key changes |
| --- | --- | --- |
| ≥ 1361 px | Desktop | Three-column hero, 1440 px shell |
| ≤ 1360 px | Large laptop | Tighter padding, slightly smaller hero type |
| ≤ 1180 px | Tablet landscape / small laptop | Hero becomes 2 columns, growth card spans the full row, practice transcript drops below the stage |
| ≤ 980 px | Tablet portrait | Hero becomes 1 column, navigation stays on one scrollable row, settings dialog becomes a full sheet |
| ≤ 768 px | Large phone | Two-row compact navigation, single-column preset/settings grids, answer bar wraps with full-width input, ASR picker stacks |
| ≤ 520 px | Phone | Smaller avatar and hero type, single-column dialog actions |
| ≤ 380 px | Small phone | Compressed navigation chips |

Two rules matter for perceived quality:

* **Navigation never stacks vertically.** On narrow screens the tab row and the
  action row scroll horizontally instead, so the header keeps a stable height.
* **Nothing overflows horizontally.** `min-width: 0` is applied to every grid
  child, and the verification script asserts
  `documentElement.scrollWidth <= innerWidth`.

#### 5.1 The coach stage: the status label no longer covers the avatar

The coach stage nests as
`.coach-avatar-wrap > .coach-stage > (.sela-3d + .coach-status)`. The status
label used to be `position: absolute; bottom: 16px`, painted on top of the
avatar box. Because the bilingual label wraps to two lines it is **68 px tall**,
while the stage reserved only 66 px — measured overlap was 18 px on desktop and
worse on phones.

Reserving more padding only postpones the problem: as soon as the text wraps to
a third line the overlap returns. The stage is therefore a **two-row grid** now
— avatar in the first row, label in the second — so the label can never cover
the avatar regardless of text length:

```css
.coach-stage {
  grid-template-rows: auto auto;
  align-content: center;
  gap: 10px;
  padding: 18px;
}
.coach-stage .coach-status {
  position: static;   /* flows in the grid instead of floating over the avatar */
  width: 100%;
  max-width: 100%;
}
```

The verification script measures this directly
(`ukurPanggungPelatih()`) and reports `tumpangTindihPx`, the vertical overlap
between `.coach-status` and `.sela-3d`. It must be `0`.

### 6. Dialogs above the sticky header

`.brand-top-bar` and `.screen-tabs` are sticky with `z-index` 50 and 45. The
settings backdrop previously used `z-index: 20`, so the panel slid underneath
the header. It is now `z-index: 200`, uses `100dvh` for its height budget, locks
body scroll while open, and closes on `Escape`.

### 7. Verification

`tests/lipsyncMulut.test.ts` and `tests/bahasaAsr.test.ts` cover the pure logic
(viseme frames, duration estimation, voice selection, preference storage). The
browser-level behaviour is asserted by `capture-docs3.mjs`, which reads the
**actual morph target influences** applied to the face mesh via
`window.__selaMorph()` — so "the mouth moved" is measured, not assumed.

The script also records the provider of every `/api/tts/synthesize` response, so
a run can prove that the coach really spoke through Supertonic rather than the
browser fallback. On the last full run all five synthesis requests returned
`provider: "supertonic"` with `fallback: false`.

> **Note on screenshotting a live WebGL canvas.** On narrow viewports the home
> screen keeps the 3D scene continuously drawing. Under software rendering
> (SwiftShader, which is what the CI-style capture uses) Chromium then never
> reports a "settled" frame, and `page.screenshot()` times out no matter how
> long the timeout is — while the same page with the model request blocked
> captures in 13 seconds. The capture scripts therefore fall back to the raw CDP
> `Page.captureScreenshot` call, which skips that wait. This is a
> software-rendering artefact of the test harness, not a defect users see on a
> device with a GPU; it is recorded here so the next person does not spend an
> afternoon rediscovering it.

---

## Bahasa Indonesia

### 1. Kenapa dokumen ini ada

Tiga masalah yang berulang kali muncul saat pengujian oleh pemilik proyek
dibahas bersama di sini karena akar penyebabnya sama — aplikasi mengasumsikan
layar desktop lebar dan layanan TTS lokal yang selalu hidup:

1. **Mulut avatar tidak pernah bergerak.** Lip sync hanya bekerja bila suara
   coach berasal dari elemen `<audio>` yang bisa disadap Web Audio. Begitu
   aplikasi jatuh ke `speechSynthesis` bawaan browser, tidak ada sinyal yang
   bisa dianalisis sama sekali, sehingga mulut tetap tertutup.
2. **Pengenalan suara hanya mengerti Bahasa Inggris.** `recognition.lang`
   dikunci ke `en-US`, jadi jawaban Bahasa Indonesia dikenali sebagai kata
   yang tidak berarti.
3. **Tata letak tidak nyaman di tablet dan ponsel.** Navigasi menumpuk menjadi
   kolom tinggi di bawah 767 px, ruang latihan dan panel transkrip berebut
   lebar, dan dialog pengaturan terpotong bilah kepala yang menempel.

### 2. Gerakan mulut yang selalu bekerja

Lip sync sekarang punya **dua penggerak** yang bekerja sama, bukan satu
penggerak yang bisa gagal diam-diam.

| Penggerak | Berkas | Kapan memegang kendali |
| --- | --- | --- |
| Analisis audio | `src/lipsync/audioAnalyser.ts` | Ada elemen `<audio>` yang diputar dan `AnalyserNode` membaca sinyal nyata |
| Gerak prosedural | `src/lipsync/gerakMulut.ts` | Selain kondisi di atas — `speechSynthesis` browser, audio tidak ada, atau dekode senyap |

Penggerak prosedural **selalu dinyalakan** selama coach bicara. Ia menyerahkan
kendali ke analiser audio hanya ketika analiser benar-benar menghasilkan sinyal,
dan mengambil alih kembali setelah 600 ms tanpa sinyal. Artinya mulut bergerak
di semua kondisi, tetapi tetap akurat secara fonetik saat audio nyata tersedia.

```
speakText()
   ├─ mulaiGerakMulut(potongan)             ← selalu, sebagai jaring pengaman
   └─ putar potongan <audio>
         ├─ analiser punya sinyal  → penggerak prosedural diam (audio menang)
         └─ 600 ms tanpa sinyal    → penggerak prosedural mengambil alih
```

Detail tambahan:

* Mulut mulai bergerak **seketika**, tidak menunggu
  `SpeechSynthesisUtterance.onstart`. Browser tidak selalu memicunya saat tidak
  ada suara yang cocok terpasang.
* Bila `speechSynthesis` memicu `onboundary`, indeks karakter dikirim ke
  `KendaliMulut.lompatKeKarakter()` sehingga mulut mengikuti kata yang benar
  benar sedang diucapkan.
* Bentuk vokal dipetakan per kelas huruf; konsonan bilabial (`m`, `b`, `p`)
  menutup bibir, dan tanda baca memberi jeda lebih panjang agar mulut "bernapas".

### 3. Pengenalan suara Bahasa Indonesia *dan* Inggris

Web Speech API hanya mengenali **satu bahasa per sesi** dan tidak punya mode
deteksi otomatis. Karena itu aplikasi menyediakan pilihan eksplisit dengan
default yang menyesuaikan diri.

| Mode | Perilaku |
| --- | --- |
| `Otomatis` (default) | Mulai dengan bahasa terakhir yang dipakai; setiap hasil final diperiksa ulang dengan `deteksiBahasa()`. Bila pelajar berganti bahasa, sesi rekaman berikutnya memakai bahasa yang lain. |
| `Indonesia` | Mengunci `recognition.lang = "id-ID"`. |
| `Inggris` | Mengunci `recognition.lang = "en-US"`. |

Tombol pemilih berada tepat di atas bilah jawaban pada layar latihan agar bisa
diganti di tengah percakapan. Menggantinya saat sedang merekam akan
menghentikan lalu memulai ulang recognizer (properti `lang` tidak bisa diubah
saat aktif) **tanpa** mengirim jawaban yang sedang disusun. Pilihannya disimpan
di `localStorage` dengan kunci `sela-asr-language`.

### 4. Jalur TTS yang tidak lagi goyah

| Masalah | Perbaikan |
| --- | --- |
| Audio mock diperlakukan sebagai audio asli sehingga membuang satu siklus `play()` yang gagal | `audioTtsSah()` menolak `provider: "mock"`, `format: "mock"`, dan `fallback: true` sebelum elemen `<audio>` dibuat |
| Satu kegagalan sesaat langsung menjatuhkan aplikasi ke suara browser | `ambilAudioTts()` mencoba ulang sekali setelah jeda 350 ms |
| Cadangan browser memilih suara secara acak | `pilihSuaraTerbaik()` menilai suara berdasarkan kode bahasa, daftar nama pilihan, dan penanda "natural"/"online" |
| Percakapan bisa menggantung bila `onend` tidak pernah datang | `ucapkanDenganBrowser()` punya pengaman waktu pada `perkiraan durasi × 1,5 + 2,5 s` |
| Kalimat **pertama** setelah aplikasi baru dibuka terasa lambat (model baru dimuat saat dipakai), sehingga terasa "kadang bisa, kadang tidak" | Saat aplikasi dimuat, satu `synthesize()` latar dijalankan untuk sapaan pendek — memanaskan model **sekaligus** mengisi cache server dan cache klien |
| Setelah sidecar hidup kembali, aplikasi tetap memakai suara browser sampai halaman dimuat ulang | Bila semua percobaan gagal, `ambilAudioTts()` memanggil `/api/tts/voices` di latar belakang — endpoint itu memeriksa ulang sidecar — lalu menyegarkan `/api/health` |
| Tidak ada cara mengetahui mesin suara mana yang sedang berbicara | Chip navigasi dan chip di ruang latihan kini berbunyi `Supertonic F1 · Auto ID/EN` atau `Suara browser (cadangan) · …`, bukan sekadar nama provider |

Diukur pada sidecar lokal (`supertonic 1.3.1`, CPU): kalimat Bahasa Indonesia
pertama ≈ 5,5 detik, kalimat yang sama dari cache ≈ 0,12 detik, dan kalimat
Bahasa Inggris ≈ 4,5 detik. Mesin suara yang sedang aktif selalu terlihat di
bilah navigasi (chip suara), dan dialog pengaturan menampilkan status layanan
Supertonic secara langsung.

### 5. Tata letak responsif

Titik henti (breakpoint) dideklarasikan satu kali di akhir `src/styles.css`
supaya menjadi sumber kebenaran terakhir dan tidak berbenturan dengan media
query lama yang tersebar.

| Lebar | Sasaran | Perubahan utama |
| --- | --- | --- |
| ≥ 1361 px | Desktop | Hero tiga kolom, lebar cangkang 1440 px |
| ≤ 1360 px | Laptop besar | Padding lebih rapat, huruf hero sedikit mengecil |
| ≤ 1180 px | Tablet lanskap / laptop kecil | Hero menjadi 2 kolom, kartu progres memenuhi satu baris penuh, transkrip latihan turun ke bawah panggung |
| ≤ 980 px | Tablet potret | Hero menjadi 1 kolom, navigasi tetap satu baris yang bisa digeser, dialog pengaturan menjadi lembar penuh |
| ≤ 768 px | Ponsel besar | Navigasi dua baris ringkas, grid preset/pengaturan satu kolom, bilah jawaban melipat dengan input selebar penuh, pemilih ASR menumpuk |
| ≤ 520 px | Ponsel | Avatar dan huruf hero lebih kecil, tombol dialog satu kolom |
| ≤ 380 px | Ponsel kecil | Chip navigasi dipadatkan |

Dua aturan yang paling menentukan kenyamanan:

* **Navigasi tidak pernah menumpuk vertikal.** Di layar sempit, baris tab dan
  baris aksi digeser mendatar, sehingga tinggi bilah kepala tetap stabil.
* **Tidak ada luapan mendatar.** `min-width: 0` diterapkan pada setiap anak
  grid, dan skrip verifikasi memastikan
  `documentElement.scrollWidth <= innerWidth`.

#### 5.1 Panggung pelatih: label status tidak lagi menutupi avatar

Panggung pelatih bersarang sebagai
`.coach-avatar-wrap > .coach-stage > (.sela-3d + .coach-status)`. Label status
dulu memakai `position: absolute; bottom: 16px`, sehingga dilukis **di atas**
kotak avatar. Karena label dua bahasa ini membungkus menjadi dua baris, tingginya
**68 px**, sedangkan panggung hanya menyisakan 66 px — tumpang tindih terukur
18 px di desktop dan lebih parah di ponsel.

Menambah padding hanya menunda masalah: begitu teks membungkus ke baris ketiga,
tumpang tindih muncul lagi. Karena itu panggung sekarang menjadi **grid dua
baris** — avatar di baris pertama, label di baris kedua — sehingga label tidak
mungkin menutupi avatar, berapa pun panjang teksnya:

```css
.coach-stage {
  grid-template-rows: auto auto;
  align-content: center;
  gap: 10px;
  padding: 18px;
}
.coach-stage .coach-status {
  position: static;   /* ikut arus grid, bukan mengapung di atas avatar */
  width: 100%;
  max-width: 100%;
}
```

Skrip verifikasi mengukurnya langsung (`ukurPanggungPelatih()`) dan melaporkan
`tumpangTindihPx`, yaitu tumpang tindih vertikal antara `.coach-status` dan
`.sela-3d`. Nilainya harus `0`.

### 6. Dialog di atas bilah kepala yang menempel

`.brand-top-bar` dan `.screen-tabs` bersifat sticky dengan `z-index` 50 dan 45.
Latar dialog pengaturan sebelumnya memakai `z-index: 20`, sehingga panelnya
menyelip di bawah bilah kepala. Sekarang nilainya `z-index: 200`, tinggi
anggarannya memakai `100dvh`, scroll halaman dikunci selama terbuka, dan panel
bisa ditutup dengan tombol `Escape`.

### 7. Verifikasi

`tests/lipsyncMulut.test.ts` dan `tests/bahasaAsr.test.ts` menguji logika
murninya (bingkai viseme, perkiraan durasi, pemilihan suara, penyimpanan
preferensi). Perilaku tingkat browser diperiksa oleh `capture-docs3.mjs` yang
membaca **nilai morph target yang benar-benar diterapkan** ke mesh wajah lewat
`window.__selaMorph()` — jadi "mulutnya bergerak" itu diukur, bukan diasumsikan.

Skrip itu juga mencatat provider dari setiap respons `/api/tts/synthesize`,
sehingga satu kali jalan bisa membuktikan bahwa coach benar-benar berbicara
lewat Supertonic, bukan suara cadangan browser. Pada jalan lengkap terakhir,
kelima permintaan sintesis mengembalikan `provider: "supertonic"` dengan
`fallback: false`.

> **Catatan tentang menangkap kanvas WebGL yang hidup.** Di lebar layar sempit,
> halaman beranda terus menggambar pemandangan 3D. Dengan perenderan perangkat
> lunak (SwiftShader, yang dipakai skrip tangkapan layar), Chromium tidak pernah
> melaporkan bingkai yang "tenang", sehingga `page.screenshot()` kehabisan waktu
> berapa pun batas waktunya — sementara halaman yang sama dengan permintaan model
> diblokir selesai dalam 13 detik. Karena itu skrip tangkapan layar memakai
> cadangan langsung ke `Page.captureScreenshot` milik CDP, yang melewati
> penantian tersebut. Ini artefak perenderan perangkat lunak pada alat uji, bukan
> cacat yang dialami pengguna di perangkat ber-GPU; dicatat di sini supaya orang
> berikutnya tidak perlu menghabiskan waktu menemukannya lagi.
