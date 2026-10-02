# Product Requirements

> **English** | [Bahasa Indonesia](#bahasa-indonesia)

---

## English

### 1. Product positioning

**Sela Tutor English** is a coach-style English speaking practice tool for
university students and early-career professionals. A learner completes a **5-minute
real conversation** in a chosen scenario (job interview, business meeting,
restaurant ordering) and receives quantifiable post-session feedback.

The product is **not** a long-term course platform. It is a fast-to-start,
finishable, reviewable practice loop:

```text
Choose scenario -> Choose task card -> AI states the goal -> Voice dialogue 4-6 rounds -> Post-session report
```

### 2. Target users

* **University students** preparing for English interviews, internship
  applications, and class presentations.
* **Early-career professionals** facing English meetings, self-introductions, and
  opinion sharing.
* **English level:** A2–B2 — can produce simple sentences but lacks real
  conversation practice and correction feedback.
* **Interface language:** Indonesian first; English is used for the practice
  content, example sentences, and score-dimension labels.

Key pain points:

* No realistic role-play environment; unsure how to respond naturally to follow-ups.
* After practising, they only know they "spoke badly" — not what specifically to fix.
* Fear of being interrupted; conversation flow matters.
* Need quantifiable feedback quickly, for review and for demoing.
* Need lightweight, positive, non-punishing daily motivation.

### 3. Virtual coach and check-in

A "virtual coach + streak" interaction layer adds companionship and practice
motivation, without becoming a complex gamification system.

**Coach positioning**

* An original 3D tutor — no third-party IP is copied.
* Persona: "cool but constructive" — direct, rhythmic, slightly demanding, never
  mocking.
* Responsibilities: daily home reminder, task preparation, in-practice hints and
  follow-ups, post-session commentary, and check-in feedback.
* Rendered as a **real 3D model** with a state machine (idle, listening, thinking,
  asking, reviewing, celebrating), plus blinking, breathing, lip sync, and clip
  transitions.

**Check-in rules**

* A day counts as checked in when the learner completes at least one practice and
  reaches the post-session report.
* Multiple practices in one day light up the day **once**, but can update the
  day's best score / latest report.
* Streak days are counted by calendar date.
* A missed day is **not** punished — the app says "starting again today still
  counts as progress".
* The MVP stores check-ins and streaks in local state; this migrates when accounts
  are added.

### 4. MVP scenarios

Three scenarios, each with tasks:

**Job Interview** — AI role: interviewer
* Internship Introduction
* Strengths & Career Plan

**Business Meeting** — AI role: meeting chair
* Share a Project Opinion

**Restaurant Ordering** — AI role: server
* Order with Preferences

### 5. Single practice flow

#### 5.1 Entering practice

The learner picks a scenario and a task card. The card shows:

* the task goal,
* the AI role,
* the expected duration,
* the focus of this practice (fluency, expression, task completion),
* the coach's explanation of the round goal.

#### 5.2 Dialogue practice

The practice room shows:

* current scenario and task goal,
* AI role description,
* the **3D coach stage**,
* the voice input button,
* the live transcript area,
* round progress,
* the hint panel.

The AI follows up or advances the task each round. The MVP keeps sessions to
**4–6 rounds** for stable demos and reproducibility.

#### 5.3 Post-session report

After ending the practice, the learner sees:

* total score,
* five-dimension scores,
* a summary of this session,
* sentence-by-sentence corrections,
* recommended expressions,
* three prioritised improvements,
* today's check-in status, streak days, and the 7-day weekly progress,
* one line of coach commentary.

### 6. Correction strategy

Correction uses "light hints during the conversation, full review afterwards".

**During the conversation**

* When the learner is stuck, offer a short hint or a candidate expression.
* Do not interrupt when grammar does not impede understanding.
* When the meaning breaks down, use a natural follow-up to steer back to the task.

**Afterwards**

* Show grammar errors, expression improvements, vocabulary substitutions, and
  task-relevance issues in full.
* Show each item as "original -> recommended -> reason".
* Give actionable next-practice advice.

### 7. Scoring model

The report uses **five 0–100 dimensions** plus a total score.

| Dimension | What it measures |
| --- | --- |
| Pronunciation | Clarity, stress, intonation |
| Fluency | Pauses, repetition, coherence |
| Grammar | Tense, sentence structure, basic errors |
| Expression | Naturalness, avoidance of literal translation, vocabulary fit |
| Task Completion | Did the learner answer, advance the dialogue, and meet the scenario goal |

Scores must always be accompanied by an explanation — never a bare number.

### 8. MVP pages

#### Home
* Today's practice entry point.
* Recommended scenarios.
* Last session's total score.
* Quick-start button.
* Indonesian guidance copy.
* Coach welcome card with today's task and a training reminder.
* Streak widget: today's status, streak days, 7-day progress.

#### Scenario library
* Three scenarios: Job Interview, Business Meeting, Restaurant Ordering.
* Task cards under each, with goal, difficulty, duration, and AI role.
* Names use Indonesian primary labels with English scenario tags.

#### Practice room
* AI role area.
* **3D coach stage** with idle / listening / thinking / asking / reviewing states
  and real-time lip sync.
* Current task goal.
* Conversation transcript.
* Voice control button.
* Hint panel.
* Round progress.
* End-practice entry point.

#### Report
* Total score and five dimensions.
* Conversation summary.
* Sentence-by-sentence correction list.
* Recommended expressions.
* Three prioritised improvements.
* Practice-again or switch-scenario entry.
* Correction explanations in Indonesian; recommended expressions keep the
  original and improved English.
* Today's check-in confirmation.
* Streak days and weekly progress.

### 9. Demo narrative

1. Open the home screen and click the Job Interview scenario.
2. Choose the task: "Introduce yourself for an internship interview".
3. The AI interviewer asks the opening question (spoken by Sela, with lip sync).
4. The learner answers by voice; the app shows the live transcript.
5. The AI follows up for 2–3 rounds, giving only light hints.
6. The learner ends the practice and opens the report.
7. Show five-dimension scores, sentence corrections, recommended expressions, and
   three improvements.
8. Show today's check-in, streak days, and the coach's commentary.

### 10. Non-goals

The MVP does **not** include:

* Long-cycle course systems.
* Complex user level systems.
* Community or friend systems.
* Coins, shops, leaderboards, make-up check-ins, or complex badges.
* Paid subscriptions.
* Multi-language learning.
* Large-scale historical trend analysis.
* Copying any existing product's characters, brand, UI, or motion.

These are future iterations, outside the current MVP line.

### 11. Acceptance criteria

The MVP must satisfy:

* The learner can choose one of at least three scenarios.
* The learner can enter a task-based practice flow.
* The learner can complete 4–6 dialogue rounds by voice or simulated voice input.
* Hints appear during the conversation without frequent interruption.
* After practising, the learner sees the total score, five dimensions,
  sentence-level corrections, and improvement suggestions.
* After completing a practice, the home screen and report show today as checked in.
* Repeating a practice on the same day does not increase the streak twice.
* Coach state changes never overlap the transcript, buttons, scores, or
  explanations.
* The README explains dependencies, original features, how to run, and the demo
  route.
* The demo video shows the full loop from scenario selection to post-session summary.

### 12. What this continuation added

This revision extends the original MVP without removing any feature:

| Area | Change |
| --- | --- |
| Brand | Rebranded from "AI Speaking Coach" to **Sela Tutor English** |
| Theme | Full **blue** palette (was green); all emojis replaced with `lucide-react` icons |
| Avatar | 2D animation replaced with a **real 3D model** + **lip sync** |
| TTS | **Supertonic** is now the default: on-device, Indonesian + English, auto language switching, female Indonesian voice by default |
| Numbers | Dual-layer normalisation so digits, currency, times, and phone numbers are read correctly |
| Providers | Runtime-configurable LLM / ASR / TTS with five presets; Groq remains the default LLM |
| Font | Nunito Variable |
| Docs | Fully bilingual (English + Indonesian) with real screenshots |

---

## Bahasa Indonesia

### 1. Posisi produk

**Sela Tutor English** adalah alat latihan berbicara Bahasa Inggris bergaya
pelatih untuk mahasiswa dan profesional pemula. Pelajar menyelesaikan
**percakapan nyata 5 menit** dalam skenario pilihan (wawancara kerja, rapat
bisnis, memesan restoran) dan menerima umpan balik pasca-sesi yang terukur.

Produk ini **bukan** platform kursus jangka panjang. Ini adalah loop latihan yang
cepat dimulai, bisa diselesaikan, dan bisa ditinjau:

```text
Pilih skenario -> Pilih kartu tugas -> AI menyatakan tujuan -> Dialog suara 4-6 ronde -> Laporan pasca-sesi
```

### 2. Pengguna sasaran

* **Mahasiswa** yang bersiap untuk wawancara Bahasa Inggris, lamaran magang, dan
  presentasi kelas.
* **Profesional pemula** yang menghadapi rapat Bahasa Inggris, perkenalan diri,
  dan menyampaikan opini.
* **Level Bahasa Inggris:** A2–B2 — bisa membuat kalimat sederhana tetapi kurang
  latihan percakapan nyata dan umpan balik koreksi.
* **Bahasa antarmuka:** Indonesia lebih dulu; Bahasa Inggris dipakai untuk konten
  latihan, contoh kalimat, dan label dimensi skor.

Masalah utama:

* Tidak ada lingkungan role-play realistis; tidak tahu cara menanggapi
  pertanyaan lanjutan secara natural.
* Setelah latihan, mereka hanya tahu "bicara buruk" — bukan apa yang harus
  diperbaiki.
* Takut dipotong; kelancaran percakapan penting.
* Butuh umpan balik terukur dengan cepat, untuk ditinjau dan untuk demo.
* Butuh motivasi harian yang ringan, positif, dan tidak menghukum.

### 3. Pelatih virtual dan check-in

Lapisan interaksi "pelatih virtual + runtutan" menambah kebersamaan dan motivasi
latihan, tanpa menjadi sistem gamifikasi yang rumit.

**Posisi pelatih**

* Tutor 3D orisinal — tidak meniru IP pihak ketiga.
* Persona: "dingin tapi membangun" — langsung, berirama, sedikit menuntut, tidak
  pernah mengejek.
* Tanggung jawab: pengingat harian di beranda, persiapan tugas, petunjuk dan
  pertanyaan lanjutan saat latihan, komentar pasca-sesi, dan umpan balik check-in.
* Dirender sebagai **model 3D sungguhan** dengan state machine (idle, listening,
  thinking, asking, reviewing, celebrating), plus kedipan, napas, lip sync, dan
  transisi klip.

**Aturan check-in**

* Sebuah hari dianggap check-in bila pelajar menyelesaikan minimal satu latihan
  dan mencapai laporan pasca-sesi.
* Beberapa latihan dalam sehari hanya menyalakan hari itu **sekali**, tetapi bisa
  memperbarui skor terbaik / laporan terbaru hari itu.
* Hari runtutan dihitung berdasarkan tanggal kalender.
* Hari yang terlewat **tidak** dihukum — aplikasi berkata "mulai lagi hari ini
  tetap dihitung kemajuan".
* MVP menyimpan check-in dan runtutan di state lokal; ini akan dimigrasi saat
  akun ditambahkan.

### 4. Skenario MVP

Tiga skenario, masing-masing dengan tugas:

**Wawancara Kerja** — Peran AI: pewawancara
* Perkenalan Diri Magang
* Kelebihan & Rencana Karir

**Rapat Bisnis** — Peran AI: moderator rapat
* Menyampaikan Opini Proyek

**Pemesanan Restoran** — Peran AI: pelayan
* Pesan dengan Preferensi Khusus

### 5. Alur satu latihan

#### 5.1 Masuk latihan

Pelajar memilih skenario dan kartu tugas. Kartu menampilkan:

* tujuan tugas,
* peran AI,
* perkiraan durasi,
* fokus latihan ini (kelancaran, ekspresi, penyelesaian tugas),
* penjelasan pelatih tentang tujuan ronde.

#### 5.2 Latihan dialog

Ruang latihan menampilkan:

* skenario dan tujuan tugas saat ini,
* deskripsi peran AI,
* **panggung pelatih 3D**,
* tombol input suara,
* area transkrip langsung,
* progres ronde,
* panel petunjuk.

AI menindaklanjuti atau memajukan tugas setiap ronde. MVP menjaga sesi pada
**4–6 ronde** untuk demo yang stabil dan bisa direproduksi.

#### 5.3 Laporan pasca-sesi

Setelah mengakhiri latihan, pelajar melihat:

* skor total,
* skor lima dimensi,
* ringkasan sesi ini,
* koreksi per kalimat,
* ekspresi yang direkomendasikan,
* tiga perbaikan berprioritas,
* status check-in hari ini, hari runtutan, dan progres mingguan 7 hari,
* satu baris komentar pelatih.

### 6. Strategi koreksi

Koreksi memakai "petunjuk ringan saat percakapan, tinjauan lengkap setelahnya".

**Saat percakapan**

* Saat pelajar tersendat, berikan petunjuk singkat atau ekspresi kandidat.
* Jangan memotong saat tata bahasa tidak menghambat pemahaman.
* Saat makna rusak, gunakan pertanyaan lanjutan alami untuk mengarahkan kembali
  ke tugas.

**Setelahnya**

* Tampilkan kesalahan tata bahasa, perbaikan ekspresi, penggantian kosakata, dan
  masalah relevansi tugas secara lengkap.
* Tampilkan setiap item sebagai "asli -> rekomendasi -> alasan".
* Beri saran latihan berikutnya yang bisa dijalankan.

### 7. Model penilaian

Laporan memakai **lima dimensi 0–100** plus skor total.

| Dimensi | Yang diukur |
| --- | --- |
| Pengucapan | Kejelasan, tekanan, intonasi |
| Kelancaran | Jeda, pengulangan, koherensi |
| Tata Bahasa | Kala, struktur kalimat, kesalahan dasar |
| Ekspresi | Kealamian, menghindari terjemahan literal, kesesuaian kosakata |
| Penyelesaian Tugas | Apakah pelajar menjawab, memajukan dialog, dan memenuhi tujuan skenario |

Skor harus selalu disertai penjelasan — jangan pernah angka telanjang.

### 8. Halaman MVP

#### Beranda
* Titik masuk latihan hari ini.
* Skenario rekomendasi.
* Skor total sesi terakhir.
* Tombol mulai cepat.
* Teks panduan Bahasa Indonesia.
* Kartu sambutan pelatih dengan tugas hari ini dan satu pengingat latihan.
* Widget runtutan: status hari ini, hari runtutan, progres 7 hari.

#### Pustaka skenario
* Tiga skenario: Wawancara Kerja, Rapat Bisnis, Pemesanan Restoran.
* Kartu tugas di bawah masing-masing, dengan tujuan, tingkat kesulitan, durasi,
  dan peran AI.
* Nama memakai label utama Indonesia dengan tag skenario Bahasa Inggris.

#### Ruang latihan
* Area peran AI.
* **Panggung pelatih 3D** dengan status idle / listening / thinking / asking /
  reviewing dan lip sync real time.
* Tujuan tugas saat ini.
* Transkrip percakapan.
* Tombol kontrol suara.
* Panel petunjuk.
* Progres ronde.
* Titik masuk mengakhiri latihan.

#### Laporan
* Skor total dan lima dimensi.
* Ringkasan percakapan.
* Daftar koreksi per kalimat.
* Ekspresi yang direkomendasikan.
* Tiga perbaikan berprioritas.
* Titik masuk latihan lagi atau ganti skenario.
* Penjelasan koreksi dalam Bahasa Indonesia; ekspresi rekomendasi tetap memakai
  Bahasa Inggris asli dan yang diperbaiki.
* Konfirmasi check-in hari ini.
* Hari runtutan dan progres mingguan.

### 9. Narasi demo

1. Buka beranda lalu klik skenario Wawancara Kerja.
2. Pilih tugas: "Introduce yourself for an internship interview".
3. Pewawancara AI menanyakan pertanyaan pembuka (diucapkan Sela, dengan lip sync).
4. Pelajar menjawab dengan suara; aplikasi menampilkan transkrip langsung.
5. AI menindaklanjuti 2–3 ronde, hanya memberi petunjuk ringan.
6. Pelajar mengakhiri latihan dan membuka laporan.
7. Tampilkan skor lima dimensi, koreksi kalimat, ekspresi rekomendasi, dan tiga
   perbaikan.
8. Tampilkan check-in hari ini, hari runtutan, dan komentar pelatih.

### 10. Bukan target

MVP **tidak** mencakup:

* Sistem kursus siklus panjang.
* Sistem level pengguna yang rumit.
* Sistem komunitas atau teman.
* Koin, toko, papan peringkat, check-in pengganti, atau lencana rumit.
* Langganan berbayar.
* Pembelajaran multi-bahasa.
* Analisis tren historis berskala besar.
* Meniru karakter, merek, UI, atau gerak produk yang sudah ada.

Ini adalah iterasi mendatang, di luar garis MVP saat ini.

### 11. Kriteria penerimaan

MVP harus memenuhi:

* Pelajar bisa memilih satu dari minimal tiga skenario.
* Pelajar bisa masuk ke alur latihan berbasis tugas.
* Pelajar bisa menyelesaikan 4–6 ronde dialog lewat suara atau input suara
  simulasi.
* Petunjuk muncul selama percakapan tanpa sering memotong.
* Setelah latihan, pelajar melihat skor total, lima dimensi, koreksi per kalimat,
  dan saran perbaikan.
* Setelah menyelesaikan latihan, beranda dan laporan menampilkan hari ini sudah
  check-in.
* Mengulang latihan di hari yang sama tidak menambah runtutan dua kali.
* Perubahan status pelatih tidak pernah menutupi transkrip, tombol, skor, atau
  penjelasan.
* README menjelaskan dependensi, fitur orisinal, cara menjalankan, dan rute demo.
* Video demo menampilkan loop penuh dari pemilihan skenario sampai ringkasan
  pasca-sesi.

### 12. Yang ditambahkan oleh lanjutan ini

Revisi ini memperluas MVP asli tanpa menghapus fitur apa pun:

| Area | Perubahan |
| --- | --- |
| Merek | Di-rebranding dari "AI Speaking Coach" menjadi **Sela Tutor English** |
| Tema | Palet **biru** penuh (sebelumnya hijau); semua emoji diganti ikon `lucide-react` |
| Avatar | Animasi 2D diganti **model 3D sungguhan** + **lip sync** |
| TTS | **Supertonic** kini default: di perangkat, Indonesia + Inggris, ganti bahasa otomatis, default suara perempuan Indonesia |
| Angka | Normalisasi dua lapis supaya angka, mata uang, waktu, dan nomor HP dibaca benar |
| Provider | LLM / ASR / TTS bisa diatur saat berjalan dengan lima preset; Groq tetap LLM default |
| Font | Nunito Variable |
| Dokumentasi | Sepenuhnya bilingual (Inggris + Indonesia) dengan tangkapan layar nyata |
