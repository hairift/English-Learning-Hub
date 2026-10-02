# UI Information Architecture

> **English** | [Bahasa Indonesia](#bahasa-indonesia)

---

## English

### 1. Navigation structure

The app is a single-page application with four core screens, keeping the demo
clear and the implementation manageable.

```text
Home
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

The top navigation has three icon entries — **Home**, **Practice**, **Report** —
plus **Settings**. Icons come from `lucide-react`; no emojis are used.

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
  thinking / asking / reviewing states and real-time lip sync.
* Main dialogue area: the current question or follow-up, the learner's live
  transcript, and the AI reply.
* Right control panel: task goal, round progress, hints, practice focus, and score
  preview.
* Bottom control area: voice input button, recognition status, text-input
  fallback, and end-practice button.

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

Aplikasi ini adalah single-page application dengan empat layar inti, menjaga demo
tetap jelas dan implementasi tetap terkendali.

```text
Beranda
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

Navigasi atas punya tiga entri ikon — **Beranda**, **Latihan**, **Laporan** —
plus **Pengaturan**. Ikon berasal dari `lucide-react`; tidak ada emoji.

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
  listening / thinking / asking / reviewing dan lip sync real time.
* Area dialog utama: pertanyaan atau tindak lanjut saat ini, transkrip langsung
  pelajar, dan balasan AI.
* Panel kontrol kanan: tujuan tugas, progres ronde, petunjuk, fokus latihan, dan
  pratinjau skor.
* Area kontrol bawah: tombol input suara, status pengenalan, cadangan input teks,
  dan tombol akhiri latihan.

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

### 4. Jalur prioritas demo

Implementasi memprioritaskan jalur ini:

```text
Beranda -> Pustaka Skenario -> Tugas Wawancara Kerja -> Ruang Latihan -> Laporan Sesi
```

Rapat Bisnis dan Pemesanan Restoran juga bisa dipilih, tetapi rute demo
mengutamakan Wawancara Kerja.
