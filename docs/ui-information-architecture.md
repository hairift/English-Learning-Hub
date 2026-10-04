# UI Information Architecture

> **English** | [Bahasa Indonesia](#bahasa-indonesia)

---

## English

### 1. Navigation structure

The app is a single-page application with five core screens, keeping the demo
clear and the implementation manageable.

```text
Home
  -> Learning Path (Journey)
      -> Interactive Quiz (5 exercise types)
      -> Placement Test
      -> Review / SRS panel
  -> Scenario Library
      -> Task Preparation
          -> Practice Room
              -> Session Report
```

Auxiliary entry points:

* **Home** can jump straight into a recommended task.
* **Session Report** can return to the Practice Room for another round, or go back
  to the Scenario Library to switch scenarios.
* **Settings** is reachable from the top navigation at any time.

The top navigation has four icon entries — **Home**, **Journey**, **Practice**,
**Report** — plus a **hearts widget** and **Settings**. Icons come from
`lucide-react`; no emojis are used. It also carries a **voice engine chip** that
names the voice currently in use.

### 2. Screen responsibilities

#### Home

**Goal:** let the learner start a practice quickly.

Modules:

* Top brand identity and the current practice goal.
* Quick-start card.
* Coach welcome card: today's task, streak days, and a short training reminder.
* Weekly progress: a 7-day check-in widget highlighting whether today is done.
* Recommended scenario cards.
* Last session's result.
* Today's suggestion.
* The AI practice assistant's guidance card.

#### Learning Path (Journey)

**Goal:** give the learner a structured, gamified CEFR curriculum that always shows
the next step.

Modules:

* **Status bar** — current streak, total XP, hearts, league, and streak freezes.
* **Journey hero** — a progress ring showing levels completed out of the whole
  curriculum, plus the next level to attempt.
* **Path map** — 8 units (A1 → C1) laid out as an accordion; each unit holds 2
  level nodes on a winding path. A node is `selesai` (done, with its score badge),
  `terbuka` (playable), or `terkunci` (locked until the previous level is passed).
  The unit containing the active level auto-opens.
* **Unit detail** — grammar focus, vocabulary set, and real-world scenarios, so the
  learner knows what a unit teaches before starting it.
* **Weekly league board** — a 7-day XP bar chart plus the promotion threshold to
  the next league.
* **Review (SRS) panel** — flashcards for vocabulary from completed levels; cards
  are scheduled on a spaced-repetition curve and only due cards appear.
* **Interactive quiz** — five exercise types: arrange-sentence, match-pairs,
  fill-blank, listen-and-type, and choose-translation. A wrong answer costs one
  heart and never reveals the key.
* **Placement test** — 15 questions across A1–C1 that recommend a starting level
  and seed the review deck.

#### Scenario Library

**Goal:** let the learner choose a scenario and task type.

Modules:

* Scenario categories: Job Interview, Business Meeting, Restaurant Ordering.
* Scenario description: AI role, suitable goals, difficulty.
* Task card list: each card shows goal, expected time, and practice focus.

#### Task Preparation

**Goal:** define the task boundary before voice practice starts.

Modules:

* Task goal.
* AI role definition.
* Coach task briefing: explains the round goal, pace, and watch-outs.
* This round's practice focus.
* Expected rounds and duration.
* Start-practice button.

#### Practice Room

**Goal:** complete 4–6 rounds of role-play.

Modules:

* Left: **3D coach stage** showing the original tutor with idle / listening /
  thinking / asking / reviewing states and real-time lip sync, plus a status
  label that sits **below** the avatar rather than over it.
* Main dialogue area: the current question or follow-up, the learner's live
  transcript, and the AI reply.
* Right control panel: task goal, round progress, hints, practice focus, and score
  preview.
* Bottom control area: **speech-recognition language picker**
  (`Otomatis` / `Indonesia` / `Inggris`), voice input button, recognition status,
  text-input fallback, and end-practice button.
* **Voice engine chip** stating which voice is actually speaking —
  `Supertonic F1 · Auto ID/EN` or `Suara browser (cadangan) · …` — so the learner
  is never left guessing why the voice sounds different.

#### Session Report

**Goal:** let the learner understand this session and know what to change next.

Modules:

* Check-in card: today's completion, streak days, and 7-day weekly progress.
* Total score.
* Five-dimension scores.
* Performance summary.
* Sentence-by-sentence corrections.
* Recommended expressions.
* Three prioritised improvements.
* Coach commentary card: summarises the round and gives the next training
  suggestion.
* Practice-again / switch-scenario buttons.

### 3. Key interaction states

| State | Behaviour |
| --- | --- |
| Microphone not authorised | Prompt for permission and offer text input as a fallback |
| Coach idle | Light breathing and blinking on Home / Task Preparation |
| Recording | The main button shows the recording state and duration |
| Coach listening | The coach enters listening while recording, without covering the transcript |
| AI thinking | Show an "analysing / preparing" state so the learner does not think it is stuck |
| Coach thinking | Brief thinking state while generating a follow-up |
| Learner stuck | The hint area offers one candidate expression |
| Coach asking | The coach enters the follow-up state as the AI advances the task |
| Session complete | The coach enters reviewing / celebrating, and today's check-in lights up |
| Practice ended | Lock the round's record and open the report |
| Level locked | The node shows a padlock and cannot be started until the previous level is passed |
| Level passed | Award XP once (never on replay), mark the node done, and unlock the next level |
| Level failed | Report the honest score, award no XP, and restore one heart |
| Hearts empty | Block the quiz and show the recovery timer |
| Card due | Show the card in the review panel; a correct answer raises its mastery level |
| No card due | Show "all cards reviewed today" instead of an empty panel |

### 4. Demo-priority path

The implementation prioritises this path:

```text
Home -> Scenario Library -> Job Interview task -> Practice Room -> Session Report
```

Business Meeting and Restaurant Ordering are also selectable, but the demo route
prefers Job Interview.

---

## Bahasa Indonesia

### 1. Struktur navigasi

Aplikasi ini adalah single-page application dengan lima layar inti, menjaga demo
tetap jelas dan implementasi tetap terkendali.

```text
Beranda
  -> Jalur Belajar (Journey)
      -> Kuis Interaktif (5 tipe latihan)
      -> Tes Penempatan
      -> Panel Pengulangan / SRS
  -> Pustaka Skenario
      -> Persiapan Tugas
          -> Ruang Latihan
              -> Laporan Sesi
```

Titik masuk tambahan:

* **Beranda** bisa langsung masuk ke tugas rekomendasi.
* **Laporan Sesi** bisa kembali ke Ruang Latihan untuk ronde lain, atau kembali ke
  Pustaka Skenario untuk berganti skenario.
* **Pengaturan** bisa diakses dari navigasi atas kapan saja.

Navigasi atas punya empat entri ikon — **Beranda**, **Jalur**, **Latihan**,
**Laporan** — plus **widget nyawa** dan **Pengaturan**. Ikon berasal dari
`lucide-react`; tidak ada emoji. Di sana juga ada **chip mesin suara** yang
menyebut suara yang sedang dipakai.

### 2. Tanggung jawab layar

#### Beranda

**Tujuan:** pelajar bisa memulai latihan dengan cepat.

Modul:

* Identitas merek di atas dan tujuan latihan saat ini.
* Kartu mulai cepat.
* Kartu sambutan pelatih: tugas hari ini, hari runtutan, dan pengingat latihan
  singkat.
* Progres mingguan: widget check-in 7 hari yang menyoroti apakah hari ini sudah
  selesai.
* Kartu skenario rekomendasi.
* Hasil sesi terakhir.
* Saran hari ini.
* Kartu panduan asisten latihan AI.

#### Jalur Belajar (Journey)

**Tujuan:** memberi pelajar kurikulum CEFR terstruktur dan bergamifikasi yang
selalu menunjukkan langkah berikutnya.

Modul:

* **Bar status** — runtutan aktif, total XP, nyawa, liga, dan pelindung runtutan.
* **Hero jalur** — cincin progres yang menunjukkan level selesai dari seluruh
  kurikulum, plus level berikutnya yang harus dicoba.
* **Peta jalur** — 8 unit (A1 → C1) dalam bentuk akordeon; setiap unit memuat 2
  simpul level pada jalur berkelok. Simpul berstatus `selesai` (dengan lencana
  nilai), `terbuka` (bisa dimainkan), atau `terkunci` (menunggu level sebelumnya
  lulus). Unit yang memuat level aktif otomatis terbuka.
* **Detail unit** — fokus tata bahasa, kosakata, dan skenario dunia nyata, agar
  pelajar tahu isi unit sebelum memulainya.
* **Papan liga mingguan** — diagram batang XP 7 hari plus ambang promosi ke liga
  berikutnya.
* **Panel pengulangan (SRS)** — kartu flash untuk kosakata dari level yang sudah
  selesai; kartu dijadwalkan dengan kurva pengulangan berjeda dan hanya kartu yang
  jatuh tempo yang muncul.
* **Kuis interaktif** — lima tipe latihan: susun kalimat, cocokkan pasangan, isi
  rumpang, dengar lalu ketik, dan pilih terjemahan. Jawaban salah mengurangi satu
  nyawa dan tidak pernah membocorkan kunci.
* **Tes penempatan** — 15 soal A1–C1 yang merekomendasikan level awal dan mengisi
  dek pengulangan.

#### Pustaka Skenario

**Tujuan:** pelajar memilih skenario dan jenis tugas.

Modul:

* Kategori skenario: Wawancara Kerja, Rapat Bisnis, Pemesanan Restoran.
* Deskripsi skenario: peran AI, tujuan yang cocok, tingkat kesulitan.
* Daftar kartu tugas: setiap kartu menampilkan tujuan, perkiraan waktu, dan fokus
  latihan.

#### Persiapan Tugas

**Tujuan:** menetapkan batas tugas sebelum latihan suara dimulai.

Modul:

* Tujuan tugas.
* Definisi peran AI.
* Pengarahan tugas dari pelatih: menjelaskan tujuan ronde, tempo, dan hal yang
  perlu diperhatikan.
* Fokus latihan ronde ini.
* Perkiraan ronde dan durasi.
* Tombol mulai latihan.

#### Ruang Latihan

**Tujuan:** menyelesaikan 4–6 ronde role-play.

Modul:

* Kiri: **panggung pelatih 3D** menampilkan tutor orisinal dengan status idle /
  listening / thinking / asking / reviewing dan lip sync real time, plus label
  status yang berada **di bawah** avatar, bukan menutupinya.
* Area dialog utama: pertanyaan atau tindak lanjut saat ini, transkrip langsung
  pelajar, dan balasan AI.
* Panel kontrol kanan: tujuan tugas, progres ronde, petunjuk, fokus latihan, dan
  pratinjau skor.
* Area kontrol bawah: **pemilih bahasa pengenalan suara**
  (`Otomatis` / `Indonesia` / `Inggris`), tombol input suara, status pengenalan,
  cadangan input teks, dan tombol akhiri latihan.
* **Chip mesin suara** yang menyatakan suara mana yang benar-benar dipakai —
  `Supertonic F1 · Auto ID/EN` atau `Suara browser (cadangan) · …` — supaya
  pelajar tidak menduga-duga kenapa suaranya terdengar berbeda.

#### Laporan Sesi

**Tujuan:** pelajar memahami sesi ini dan tahu apa yang harus diubah berikutnya.

Modul:

* Kartu check-in: penyelesaian hari ini, hari runtutan, dan progres mingguan 7
  hari.
* Skor total.
* Skor lima dimensi.
* Ringkasan performa.
* Koreksi per kalimat.
* Ekspresi yang direkomendasikan.
* Tiga perbaikan berprioritas.
* Kartu komentar pelatih: merangkum ronde dan memberi saran latihan berikutnya.
* Tombol latihan lagi / ganti skenario.

### 3. Status interaksi penting

| Status | Perilaku |
| --- | --- |
| Mikrofon belum diizinkan | Minta izin dan tawarkan input teks sebagai cadangan |
| Pelatih idle | Napas dan kedipan ringan di Beranda / Persiapan Tugas |
| Merekam | Tombol utama menampilkan status merekam dan durasinya |
| Pelatih mendengarkan | Pelatih masuk status listening saat merekam, tanpa menutupi transkrip |
| AI berpikir | Tampilkan status "menganalisis / menyiapkan" agar pelajar tidak mengira macet |
| Pelatih berpikir | Status berpikir singkat saat menyusun pertanyaan lanjutan |
| Pelajar tersendat | Area petunjuk menawarkan satu ekspresi kandidat |
| Pelatih bertanya | Pelatih masuk status tindak lanjut saat AI memajukan tugas |
| Sesi selesai | Pelatih masuk reviewing / celebrating, dan check-in hari ini menyala |
| Latihan berakhir | Kunci catatan ronde dan buka laporan |
| Level terkunci | Simpul menampilkan gembok dan tidak bisa dimulai sampai level sebelumnya lulus |
| Level lulus | Beri XP sekali saja (tidak diulang saat main lagi), tandai simpul selesai, dan buka level berikutnya |
| Level gagal | Tampilkan nilai apa adanya, tanpa XP, dan pulihkan satu nyawa |
| Nyawa habis | Blokir kuis dan tampilkan penghitung waktu pemulihan |
| Kartu jatuh tempo | Tampilkan kartu di panel pengulangan; jawaban benar menaikkan tingkat penguasaannya |
| Tidak ada kartu jatuh tempo | Tampilkan "semua kartu sudah diulang hari ini", bukan panel kosong |

### 4. Jalur prioritas demo

Implementasi memprioritaskan jalur ini:

```text
Beranda -> Pustaka Skenario -> Tugas Wawancara Kerja -> Ruang Latihan -> Laporan Sesi
```

Rapat Bisnis dan Pemesanan Restoran juga bisa dipilih, tetapi rute demo
mengutamakan Wawancara Kerja.
