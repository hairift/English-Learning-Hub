# Visual Design System

> **English** | [Bahasa Indonesia](#bahasa-indonesia)

---

## English

### 1. Visual positioning

Sela Tutor English is an **AI English-speaking tutor for Indonesian learners**.
The interface is a calm, professional, system-level practice companion — not a
cartoon or a game. The previous green palette has been replaced by a **full blue
brand**, and all emojis have been replaced by line icons.

Design goals:

* Look modern, light, and trustworthy.
* Keep high-density content (transcripts, corrections, scores) readable.
* Use a real **3D tutor avatar** as the emotional anchor.
* Keep interaction feedback gentle, short, and stable.
* Prioritise Indonesian copy for the learner, with English reserved for the
  learning content itself.

### 2. Design principles

* **Light and modern** — soft blue-white gradients, layered surfaces, subtle shadows.
* **System affinity** — rounded corners, clear outlines, blue accent, line icons.
* **Information first** — corrections, score explanations, and transcripts always
  outrank decoration.
* **Restrained motion** — feedback is soft and brief; no exaggerated bouncing.
* **No emoji** — every glyph is a `lucide-react` icon.
* **Original character** — Sela is an original 3D tutor; no third-party IP.

### 3. Colour system

The palette lives entirely in `src/styles.css` under `:root` as CSS variables.

**Brand blue tokens** (use these for new CSS):

| Token | Value | Use |
| --- | --- | --- |
| `--biru-utama` | `#1f7ae0` | Primary buttons, active state, brand |
| `--biru-terang` | `#7cb8ff` | Accents, active borders, glows |
| `--biru-gelap` | `#145cb0` | Button shadow (3D pressed effect) |
| `--biru-muda-bg` | `#e7f1ff` | Pale background for chips and panels |

**Legacy aliases** — the old green token names are kept so 80+ existing rules
keep working. They now resolve to blue:

```css
--feather-green: var(--biru-utama);
--mask-green: var(--biru-terang);
--wing-overlay: var(--biru-gelap);
```

This means the whole theme has a **single change point**.

**Semantic colours:**

| Token | Value | Use |
| --- | --- | --- |
| `--macaw` | `#1cb0f6` | Secondary accent |
| `--cardinal` | `#ff4b4b` | Errors |
| `--bee` | `#ffc800` | Warnings |
| `--fox` | `#ff9600` | Attention |
| `--purple` | `#ce82ff` | Tertiary accent |

**Neutrals:**

| Token | Value | Use |
| --- | --- | --- |
| `--eel` | `#4b4b4b` | Primary text |
| `--wolf` | `#777777` | Secondary text |
| `--hare` | `#afafaf` | Muted text |
| `--swan` | `#e5e5e5` | Borders |
| `--snow` | `#ffffff` | Card background |
| `--panel-bg` | `#f7f7f7` | Panel background |

Gamification accents (used only on the Journey screen):

| Token | Value | Use |
| --- | --- | --- |
| `WARNA_LIGA.Bronze` | `#c98a4b` | Bronze league chip and bars |
| `WARNA_LIGA.Silver` | `#9aa7b4` | Silver league chip and bars |
| `WARNA_LIGA.Gold` | `#f2b705` | Gold league chip and bars |
| `WARNA_LIGA.Sapphire` | `#2f6fdd` | Sapphire league chip and bars |
| `WARNA_LIGA.Diamond` | `#41c9d6` | Diamond league chip and bars |

Rules:

* Page backgrounds use a light blue-white gradient; no saturated blocks.
* Only the primary action uses `--biru-utama`; avoid competing accents.
* Score charts may use blue/green/amber/red, but semantics must stay consistent.
* League colours are reserved for league UI; never reuse them for generic
  emphasis, so a learner can read league standing at a glance.
* Hearts use a single warm accent; depleted hearts drop to a muted grey rather
  than a second red, keeping the primary blue dominant.
* Text must always meet contrast against its surface — dark text on light
  surfaces, light text on dark surfaces (this applies to the 3D scene gradients
  and to hard-coded SVG/canvas colours).

### 4. Material and depth

| Element | Specification |
| --- | --- |
| Card background | High-opacity white over a soft gradient |
| Card border | 1px translucent white or pale blue |
| Shadow | Soft, large radius, low opacity — `--soft-shadow: 0 12px 30px rgba(75,75,75,0.08)` |
| Ink shadow | `--ink-shadow: 0 3px 0 rgba(0,0,0,0.06)` |
| Radius | Cards 20–28px, buttons 12–16px, pills 999px |

Layer structure: background → page container → cards → controls → feedback.

### 5. Layout language

#### Home

* Simple top navigation with the brand identity (logo + name + tagline).
* A large hero card for "today's recommended practice".
* Coach welcome card, recent scores, streak, weekly check-in, recommended scenarios.

#### Learning path (Journey)

* A **status strip** of pill chips (streak, XP, hearts, league, freezes) above the
  hero, each with a line icon and a unit label.
* A **hero card** pairing a headline with a conic-gradient **progress ring**; the
  ring uses the brand blue and reports levels done out of the curriculum.
* A **winding path map**: units are accordions; level nodes alternate left and
  right along a vertical spine. Node states are visually distinct — filled blue
  with a score badge when done, blue ring when open, grey with a padlock when
  locked. No emoji; lock and check marks come from `lucide-react`.
* A **two-column grid** below the map: the path on the main column, the weekly
  league board and SRS review panel on the side column.
* Beats are restrained: nodes nudge slightly on hover, celebrations stay small.
  All animation respects `prefers-reduced-motion`.

#### Scenario library

* One card per scenario (Job Interview, Business Meeting, Restaurant Ordering).
* Each card carries a line icon, description, and skill focus.
* Hover lifts the card slightly and strengthens the blue border.

#### Task preparation

* A stepped panel showing the task goal, AI role, focus, and expected rounds.
* A single primary button: **Start practice**.

#### Practice room

* **3D avatar stage** — the tutor rendered live with lip sync.
* Main column: transcript and the tutor's current question.
* Side column: round progress, hints, score preview.
* Fixed controls: microphone button, text fallback, end session.
* Voice state uses a soft blue glow — never an exaggerated animation.

#### Report

* Top: total score and a one-line summary.
* Check-in card: today's completion, streak days, weekly progress.
* Five-dimension scores as cards / bars / radar.
* Sentence-by-sentence corrections: original, recommended, reason.
* Three prioritised improvement cards.
* Coach commentary in a high-opacity panel for readability.

### 6. Components

**Buttons**

* Primary: `--biru-utama` background, white text, 12–16px radius.
* Secondary: translucent white, pale blue border, dark text.
* Destructive: red, reserved for ending or clearing.

**Cards**

* Soft background, thin border, ≥20px internal padding.
* Information-dense cards use higher opacity for readability.

**Segmented controls**

* Used for scenario switching and report dimension switching.
* Active item uses a blue fill or pale blue background.

**Status pills**

* Pill-shaped: "listening", "round 3/6", "hints on".
* Limited palette — prefer blue / green / amber.

**Check-in widget**

* 7-day horizontal progress, pill status, streak number with an Indonesian label.
* No coins, shops, leaderboards, or complex badge systems.

**3D avatar stage**

* Large rounded card, soft blue-white gradient background.
* Status pill in the corner: "listening", "thinking", "preparing a follow-up".
* The avatar must never overlap the transcript, mic button, or progress.

**Progress and scoring**

* Soft width transitions on progress bars.
* Five dimensions with Indonesian primary labels and English secondary labels:

| Indonesian | English |
| --- | --- |
| Kelancaran | Fluency |
| Pengucapan | Pronunciation |
| Tata Bahasa | Grammar |
| Kosakata / Ekspresi | Vocabulary / Expression |
| Penyelesaian Tugas | Task Completion |

**Avatar states**

| State | Behaviour |
| --- | --- |
| Idle | Breathing, blinking |
| Listening | Looks at the learner, soft blue ring |
| Thinking | Small shimmer / dot loader |
| Asking | Focused expression, talking clip |
| Reviewing | Constructive commentary |
| Celebrating | Lightweight celebration, no exaggerated bounce |

### 7. Typography and icons

**Font:** **Nunito Variable** (weight 200–1000), imported via
`@fontsource-variable/nunito` in `src/main.tsx` and listed first in the
`font-family` stack, followed by `Nunito`, `Avenir Rounded`,
`Arial Rounded MT Bold`, `Segoe UI`, `system-ui`.

| Element | Weight |
| --- | --- |
| Headings | 600–700 |
| Body | 400–500 |
| Buttons / pills | 700–800 |

**Icons:** `lucide-react`, consistent stroke width, no filled cartoon icons.
Scene icons use semantic glyphs (briefcase, users, utensils, mic, clipboard).
Icon colour is brand blue or neutral grey.

### 8. Motion and interaction

* Duration: 150–300ms.
* Easing: soft ease-out, or the project token
  `--coach-motion: cubic-bezier(0.32, 0.72, 0, 1)`.
* Movement: lift 2–4px; no large bounces.
* Shadows strengthen slightly on hover.

Key states: hover (card lift, stronger blue border), pressed (darker fill, sinks
back), loading (shimmer / dots), recording (blue ring + timer), completed (report
fades in, total score counts up smoothly).

### 9. Indonesian-learner adaptation

* Navigation, buttons, hints, score explanations, and error reasons are in
  Indonesian.
* English learning content keeps the original English sentence with an Indonesian
  explanation.
* Scenario names use "Indonesian + English label" (Wawancara Kerja / Job
  Interview).
* AI roles are described in Indonesian ("Pewawancara AI akan menanyakan
  pengalaman proyek Anda").
* The tutor nudges in short Indonesian sentences.
* The demo narrative is in Indonesian, so a reviewer can follow the value without
  full English fluency.

### 10. Readability and overlap checklist

Before shipping any page, verify:

* No text overlap at desktop-wide, laptop, and mobile viewports.
* Buttons, labels, and task card titles display fully.
* Surface transparency never drops body contrast below readable.
* Long Indonesian correction reasons wrap naturally; containers grow or scroll.
* Recording, thinking, hover, and report-generation states do not shift layout.
* Avatar states never overlap the transcript, buttons, scores, or explanations.
* The check-in widget shows all 7 days on desktop and mobile.
* Screenshots cover home, scenario library, task prep, practice room, and report.

### 11. Rejected directions

No comic-book styling, no heavy gamification, no exaggerated explosion graphics,
no thick black outlines, no tilted panel layouts. Also no full gamification system
(coins, shops, leaderboards, complex levels, or imitation of existing characters).
Streaks exist only as lightweight practice feedback.

---

## Bahasa Indonesia

### 1. Posisi visual

Sela Tutor English adalah **tutor berbicara Bahasa Inggris berbasis AI untuk
pelajar Indonesia**. Antarmukanya adalah pendamping latihan tingkat sistem yang
tenang dan profesional — bukan kartun atau permainan. Palet hijau sebelumnya
diganti dengan **merek biru penuh**, dan semua emoji diganti ikon garis.

Tujuan desain:

* Tampil modern, ringan, dan bisa dipercaya.
* Menjaga konten padat (transkrip, koreksi, skor) tetap terbaca.
* Memakai **avatar tutor 3D** sungguhan sebagai jangkar emosional.
* Menjaga umpan balik interaksi lembut, singkat, dan stabil.
* Mengutamakan teks Indonesia untuk pelajar, dengan Bahasa Inggris khusus untuk
  materi pembelajarannya.

### 2. Prinsip desain

* **Ringan dan modern** — gradasi biru-putih lembut, permukaan berlapis, bayangan halus.
* **Kedekatan sistem** — sudut membulat, garis luar jelas, aksen biru, ikon garis.
* **Informasi lebih dulu** — koreksi, penjelasan skor, dan transkrip selalu
  mengalahkan dekorasi.
* **Gerak terkendali** — umpan balik lembut dan singkat; tanpa pantulan berlebihan.
* **Tanpa emoji** — setiap glyph adalah ikon `lucide-react`.
* **Karakter orisinal** — Sela adalah tutor 3D orisinal; tanpa IP pihak ketiga.

### 3. Sistem warna

Palet sepenuhnya ada di `src/styles.css` pada `:root` sebagai variabel CSS.

**Token biru merek** (gunakan untuk CSS baru):

| Token | Nilai | Pemakaian |
| --- | --- | --- |
| `--biru-utama` | `#1f7ae0` | Tombol utama, status aktif, merek |
| `--biru-terang` | `#7cb8ff` | Aksen, border aktif, kilau |
| `--biru-gelap` | `#145cb0` | Bayangan tombol (efek tekan 3D) |
| `--biru-muda-bg` | `#e7f1ff` | Latar pucat untuk chip dan panel |

**Alias lama** — nama token hijau lama dipertahankan agar 80+ aturan lama tetap
jalan. Sekarang semuanya mengarah ke biru:

```css
--feather-green: var(--biru-utama);
--mask-green: var(--biru-terang);
--wing-overlay: var(--biru-gelap);
```

Artinya seluruh tema punya **satu titik perubahan**.

**Warna semantik:**

| Token | Nilai | Pemakaian |
| --- | --- | --- |
| `--macaw` | `#1cb0f6` | Aksen sekunder |
| `--cardinal` | `#ff4b4b` | Galat |
| `--bee` | `#ffc800` | Peringatan |
| `--fox` | `#ff9600` | Perhatian |
| `--purple` | `#ce82ff` | Aksen tersier |

**Netral:**

| Token | Nilai | Pemakaian |
| --- | --- | --- |
| `--eel` | `#4b4b4b` | Teks utama |
| `--wolf` | `#777777` | Teks sekunder |
| `--hare` | `#afafaf` | Teks redup |
| `--swan` | `#e5e5e5` | Border |
| `--snow` | `#ffffff` | Latar kartu |
| `--panel-bg` | `#f7f7f7` | Latar panel |

Aksen gamifikasi (hanya dipakai di layar Jalur):

| Token | Nilai | Penggunaan |
| --- | --- | --- |
| `WARNA_LIGA.Bronze` | `#c98a4b` | Chip dan batang liga Bronze |
| `WARNA_LIGA.Silver` | `#9aa7b4` | Chip dan batang liga Silver |
| `WARNA_LIGA.Gold` | `#f2b705` | Chip dan batang liga Gold |
| `WARNA_LIGA.Sapphire` | `#2f6fdd` | Chip dan batang liga Sapphire |
| `WARNA_LIGA.Diamond` | `#41c9d6` | Chip dan batang liga Diamond |

Aturan:

* Latar halaman memakai gradasi biru-putih terang; tanpa blok jenuh.
* Hanya aksi utama memakai `--biru-utama`; hindari aksen yang bersaing.
* Grafik skor boleh memakai biru/hijau/kuning/merah, tetapi semantiknya harus
  konsisten.
* Warna liga hanya untuk UI liga; jangan dipakai ulang untuk penekanan umum, agar
  posisi liga pelajar bisa dibaca sekilas.
* Nyawa memakai satu aksen hangat; nyawa yang habis berubah menjadi kelabu redup,
  bukan merah kedua, agar biru utama tetap dominan.
* Teks harus selalu memenuhi kontras terhadap permukaannya — teks gelap di
  permukaan terang, teks terang di permukaan gelap (berlaku juga untuk gradasi
  pemandangan 3D dan warna SVG/kanvas yang ditulis langsung).

### 4. Material dan kedalaman

| Elemen | Spesifikasi |
| --- | --- |
| Latar kartu | Putih opasitas tinggi di atas gradasi lembut |
| Border kartu | 1px putih transparan atau biru pucat |
| Bayangan | Lembut, radius besar, opasitas rendah — `--soft-shadow: 0 12px 30px rgba(75,75,75,0.08)` |
| Bayangan tinta | `--ink-shadow: 0 3px 0 rgba(0,0,0,0.06)` |
| Radius | Kartu 20–28px, tombol 12–16px, pil 999px |

Struktur lapisan: latar → kontainer halaman → kartu → kontrol → umpan balik.

### 5. Bahasa tata letak

#### Beranda

* Navigasi atas sederhana dengan identitas merek (logo + nama + tagline).
* Kartu hero besar untuk "latihan rekomendasi hari ini".
* Kartu sambutan pelatih, skor terakhir, runtutan, check-in mingguan, skenario
  rekomendasi.

#### Jalur belajar (Journey)

* **Strip status** berisi chip pil (runtutan, XP, nyawa, liga, pelindung) di atas
  hero, masing-masing dengan ikon garis dan label satuan.
* **Kartu hero** yang memasangkan judul dengan **cincin progres** conic-gradient;
  cincin memakai biru merek dan melaporkan level selesai dari seluruh kurikulum.
* **Peta jalur berkelok**: unit berbentuk akordeon; simpul level bergantian kiri
  dan kanan di sepanjang tulang vertikal. Status simpul dibedakan jelas — biru
  penuh dengan lencana nilai saat selesai, cincin biru saat terbuka, kelabu dengan
  gembok saat terkunci. Tanpa emoji; ikon gembok dan centang berasal dari
  `lucide-react`.
* **Grid dua kolom** di bawah peta: jalur di kolom utama, papan liga mingguan dan
  panel pengulangan SRS di kolom samping.
* Gerak tetap tertahan: simpul bergeser sedikit saat hover, perayaan tetap kecil.
  Semua animasi menghormati `prefers-reduced-motion`.

#### Pustaka skenario

* Satu kartu per skenario (Wawancara Kerja, Rapat Bisnis, Pemesanan Restoran).
* Setiap kartu membawa ikon garis, deskripsi, dan fokus keterampilan.
* Hover mengangkat kartu sedikit dan memperkuat border biru.

#### Persiapan tugas

* Panel bertahap yang menampilkan tujuan tugas, peran AI, fokus, dan perkiraan
  ronde.
* Satu tombol utama: **Mulai latihan**.

#### Ruang latihan

* **Panggung avatar 3D** — tutor dirender langsung dengan lip sync.
* Kolom utama: transkrip dan pertanyaan tutor saat ini.
* Kolom samping: progres ronde, petunjuk, pratinjau skor.
* Kontrol tetap: tombol mikrofon, cadangan teks, akhiri sesi.
* Status suara memakai kilau biru lembut — bukan animasi berlebihan.

#### Laporan

* Atas: skor total dan ringkasan satu baris.
* Kartu check-in: penyelesaian hari ini, hari runtutan, progres mingguan.
* Skor lima dimensi sebagai kartu / bar / radar.
* Koreksi per kalimat: asli, rekomendasi, alasan.
* Tiga kartu perbaikan berprioritas.
* Komentar pelatih di panel opasitas tinggi agar terbaca.

### 6. Komponen

**Tombol**

* Utama: latar `--biru-utama`, teks putih, radius 12–16px.
* Sekunder: putih transparan, border biru pucat, teks gelap.
* Destruktif: merah, khusus untuk mengakhiri atau membersihkan.

**Kartu**

* Latar lembut, border tipis, padding dalam ≥20px.
* Kartu padat informasi memakai opasitas lebih tinggi agar terbaca.

**Kontrol tersegmentasi**

* Dipakai untuk berpindah skenario dan dimensi laporan.
* Item aktif memakai isian biru atau latar biru pucat.

**Pil status**

* Berbentuk pil: "mendengarkan", "ronde 3/6", "petunjuk aktif".
* Palet terbatas — utamakan biru / hijau / kuning.

**Widget check-in**

* Progres horizontal 7 hari, status pil, angka runtutan dengan label Indonesia.
* Tanpa koin, toko, papan peringkat, atau sistem lencana rumit.

**Panggung avatar 3D**

* Kartu membulat besar, latar gradasi biru-putih lembut.
* Pil status di sudut: "mendengarkan", "berpikir", "menyiapkan pertanyaan lanjutan".
* Avatar tidak boleh menutupi transkrip, tombol mikrofon, atau progres.

**Progres dan penilaian**

* Transisi lebar yang lembut pada bar progres.
* Lima dimensi dengan label utama Indonesia dan label sekunder Inggris:

| Indonesia | Inggris |
| --- | --- |
| Kelancaran | Fluency |
| Pengucapan | Pronunciation |
| Tata Bahasa | Grammar |
| Kosakata / Ekspresi | Vocabulary / Expression |
| Penyelesaian Tugas | Task Completion |

**Status avatar**

| Status | Perilaku |
| --- | --- |
| Idle | Bernapas, berkedip |
| Listening | Menatap pelajar, cincin biru lembut |
| Thinking | Shimmer kecil / pemuat titik |
| Asking | Ekspresi fokus, klip Talking |
| Reviewing | Komentar membangun |
| Celebrating | Perayaan ringan, tanpa pantulan berlebihan |

### 7. Tipografi dan ikon

**Font:** **Nunito Variable** (bobot 200–1000), diimpor lewat
`@fontsource-variable/nunito` di `src/main.tsx` dan diletakkan paling depan pada
tumpukan `font-family`, diikuti `Nunito`, `Avenir Rounded`,
`Arial Rounded MT Bold`, `Segoe UI`, `system-ui`.

| Elemen | Bobot |
| --- | --- |
| Judul | 600–700 |
| Badan teks | 400–500 |
| Tombol / pil | 700–800 |

**Ikon:** `lucide-react`, lebar goresan konsisten, tanpa ikon kartun berisi.
Ikon skenario memakai glyph semantik (briefcase, users, utensils, mic, clipboard).
Warna ikon adalah biru merek atau abu-abu netral.

### 8. Gerak dan interaksi

* Durasi: 150–300ms.
* Easing: ease-out lembut, atau token proyek
  `--coach-motion: cubic-bezier(0.32, 0.72, 0, 1)`.
* Perpindahan: angkat 2–4px; tanpa pantulan besar.
* Bayangan menguat sedikit saat hover.

Status penting: hover (kartu terangkat, border biru menguat), pressed (isian
menggelap, kembali turun), loading (shimmer / titik), recording (cincin biru +
timer), completed (laporan memudar masuk, skor total menghitung naik dengan
halus).

### 9. Adaptasi untuk pelajar Indonesia

* Navigasi, tombol, petunjuk, penjelasan skor, dan alasan galat berbahasa
  Indonesia.
* Konten pembelajaran Bahasa Inggris tetap memakai kalimat Inggris asli dengan
  penjelasan Indonesia.
* Nama skenario memakai "Indonesia + label Inggris" (Wawancara Kerja / Job
  Interview).
* Peran AI dijelaskan dalam Bahasa Indonesia ("Pewawancara AI akan menanyakan
  pengalaman proyek Anda").
* Tutor menegur dengan kalimat pendek Bahasa Indonesia.
* Narasi demo berbahasa Indonesia, supaya penilai bisa mengikuti nilai produk
  tanpa harus fasih Bahasa Inggris.

### 10. Daftar periksa keterbacaan dan tumpang tindih

Sebelum merilis halaman apa pun, pastikan:

* Tidak ada teks bertumpuk di viewport desktop lebar, laptop, dan mobile.
* Tombol, label, dan judul kartu tugas tampil penuh.
* Transparansi permukaan tidak pernah menurunkan kontras badan teks di bawah
  ambang terbaca.
* Alasan koreksi Indonesia yang panjang membungkus secara alami; kontainer
  tumbuh atau bisa di-scroll.
* Status merekam, berpikir, hover, dan pembuatan laporan tidak menggeser tata
  letak.
* Status avatar tidak menutupi transkrip, tombol, skor, atau penjelasan.
* Widget check-in menampilkan seluruh 7 hari di desktop dan mobile.
* Tangkapan layar mencakup beranda, pustaka skenario, persiapan tugas, ruang
  latihan, dan laporan.

### 11. Arah yang tidak dipakai

Tanpa gaya buku komik, tanpa gamifikasi berat, tanpa grafis ledakan berlebihan,
tanpa garis luar hitam tebal, tanpa tata letak panel miring. Juga tanpa sistem
gamifikasi penuh (koin, toko, papan peringkat, level rumit, atau meniru karakter
yang sudah ada). Runtutan hanya ada sebagai umpan balik latihan yang ringan.
