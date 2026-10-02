# Coach & Lightweight Check-in Interaction Spec

> **English** | [Bahasa Indonesia](#bahasa-indonesia)

---

## English

### 1. Goal

Add a lightweight interaction layer to Sela Tutor English so the learner feels a
virtual coach is training with them every day, without a complex gamification
system interfering with the core speaking practice.

The layer has two parts:

* **Virtual coach** — an original 3D tutor who reminds, accompanies, follows up,
  and gives feedback.
* **Streak check-in** — completing one practice lights up today and shows streak
  days and weekly progress.

### 2. Coach definition

* **Persona:** a cool-but-constructive coach — direct and rhythmic, but
  constructive in feedback.
* **Visuals:** a futuristic professional tutor in blue-white tech attire with a
  sharp haircut, consistent with the blue system style.
* **Copyright boundary:** an original character. No characters, brands, UI, or
  motion are copied from any existing product.
* **Tone rules:** never mock, never humiliate, never create failure anxiety.

Example tone:

* Home reminder: "Don't delay — finish your 5-minute interview sprint first."
* Task preparation: "This round, focus on stating the project outcome, not just
  the process."
* In-practice hint: "Shorter. Answer the question first, then add an example."
* Post-session commentary: "Grammar is steady, but the expression is too vague.
  Add one concrete number next round."
* Missed-day message: "Starting again today still counts as progress. Finish one
  round first."

### 3. Coach states

#### Idle
* Where: Home, Task Preparation.
* Behaviour: light breathing, blinking.
* Copy: shows today's task reminder.

#### Listening
* Where: while the learner is recording.
* Behaviour: the coach looks at the learner; a soft blue ring appears.
* Copy: never interrupts; just shows "listening to you".

#### Thinking
* Where: while the AI generates a follow-up or analyses an answer.
* Behaviour: a small shimmer, dot loader, or status pill.
* Copy: "analysing your answer".

#### Asking
* Where: the AI advances to the next question.
* Behaviour: the coach switches to a focused expression.
* Copy: shows the next follow-up question.

#### Reviewing
* Where: the session report.
* Behaviour: the coach stays stable and does not cover the report.
* Copy: one constructive line of commentary.

#### Celebrating
* Where: the first completed practice of the day that reaches the report.
* Behaviour: lightweight blue highlight; the streak number is briefly emphasised.
* Copy: "Done today — N-day streak."

### 4. Check-in rules

* **Completion condition:** the learner completes one practice and reaches the
  report.
* **Daily count:** multiple practices in one day light up the day only once.
* **Repeat practice:** repeating on the same day can update today's best score or
  latest report, but does not increase the streak again.
* **Streak:** counted by calendar date.
* **Missed day:** no punishment — restart the streak and give a positive message.
* **Storage:** the MVP uses local state; this migrates to the user data layer when
  accounts are added.

### 5. Screen interactions

#### Home
* Show the coach welcome card.
* Show today's recommended task.
* Show the N-day streak.
* Show the 7-day weekly progress.
* When today is not done, the primary button reads "Start today's practice".
* When today is done, it can read "Practise another round".

#### Task Preparation
* The coach explains the task goal, expected rounds, and this round's focus.
* Clicking "Start 5-minute practice" enters the Practice Room.

#### Practice Room
* Left: the 3D coach stage.
* While the learner records, the coach enters listening.
* While the AI generates a follow-up, the coach enters thinking.
* When the AI asks the next question, the coach enters asking.
* The right panel keeps the task goal, rounds, hints, and score preview.

#### Session Report
* If today is not yet checked in, light it up once the report is generated.
* Show "Done today", "N-day streak", and "This week's progress".
* The coach gives one line of commentary.
* Offer "Practise another round" and "Switch scenario".

### 6. State data

The MVP stores at least:

| Field | Meaning |
| --- | --- |
| `lastCompletedDate` | Most recent completion date |
| `currentStreak` | Current streak days |
| `weekCompletion` | Completion over the last 7 days |
| `todayBestScore` | Today's best score (optional) |
| `latestReportId` | Most recent report (optional) |

### 7. Acceptance cases

* First completed practice: the report shows today done, streak 1 day.
* Second completed practice on the same day: today lights up once; the streak does
  not increase twice.
* Completing on a second consecutive day: the streak goes from 1 to 2.
* Completing after a one-day gap: the streak restarts, and no negative punishment
  copy appears.
* Home in the completed state: the button shows "Practise another round" or
  equivalent.
* Coach state changes: idle, listening, thinking, asking, reviewing, and
  celebrating never cover the transcript, buttons, scores, or explanations.
* Mobile layout: the coach stage, right panel, and check-in widget can stack
  vertically without content overlap.

### 8. Non-goals

* No coins, shops, leaderboards, or make-up check-ins.
* No complex level system.
* No full character progression.
* No copying characters or visual assets from any existing learning product.

---

## Bahasa Indonesia

### 1. Tujuan

Menambahkan lapisan interaksi ringan pada Sela Tutor English supaya pelajar merasa
ada pelatih virtual yang berlatih bersamanya setiap hari, tanpa sistem gamifikasi
rumit yang mengganggu latihan berbicara inti.

Lapisan ini punya dua bagian:

* **Pelatih virtual** — tutor 3D orisinal yang mengingatkan, menemani,
  menindaklanjuti, dan memberi umpan balik.
* **Check-in runtutan** — menyelesaikan satu latihan menyalakan hari ini dan
  menampilkan hari runtutan serta progres mingguan.

### 2. Definisi pelatih

* **Persona:** pelatih "dingin tapi membangun" — langsung dan berirama, tetapi
  umpan baliknya membangun.
* **Visual:** tutor profesional futuristik dengan pakaian teknologi biru-putih dan
  potongan rambut rapi, konsisten dengan gaya sistem biru.
* **Batas hak cipta:** karakter orisinal. Tidak ada karakter, merek, UI, atau
  gerak yang ditiru dari produk mana pun.
* **Aturan nada:** tidak mengejek, tidak merendahkan, tidak menciptakan kecemasan
  gagal.

Contoh nada:

* Pengingat beranda: "Jangan ditunda — selesaikan sprint wawancara 5 menit dulu."
* Persiapan tugas: "Ronde ini fokus menyatakan hasil proyek, bukan hanya
  prosesnya."
* Petunjuk saat latihan: "Lebih singkat. Jawab pertanyaannya dulu, baru tambah
  contoh."
* Komentar pasca-sesi: "Tata bahasa cukup stabil, tetapi ekspresinya terlalu
  umum. Tambahkan satu angka konkret di ronde berikutnya."
* Pesan hari terlewat: "Mulai lagi hari ini tetap dihitung kemajuan. Selesaikan
  satu ronde dulu."

### 3. Status pelatih

#### Idle
* Di mana: Beranda, Persiapan Tugas.
* Perilaku: napas dan kedipan ringan.
* Teks: menampilkan pengingat tugas hari ini.

#### Mendengarkan
* Di mana: saat pelajar merekam.
* Perilaku: pelatih menatap pelajar; cincin biru lembut muncul.
* Teks: tidak pernah memotong; hanya menampilkan "sedang mendengarkan Anda".

#### Berpikir
* Di mana: saat AI menyusun tindak lanjut atau menganalisis jawaban.
* Perilaku: shimmer kecil, pemuat titik, atau pil status.
* Teks: "menganalisis jawaban Anda".

#### Bertanya
* Di mana: AI memajukan ke pertanyaan berikutnya.
* Perilaku: pelatih beralih ke ekspresi fokus.
* Teks: menampilkan pertanyaan lanjutan berikutnya.

#### Meninjau
* Di mana: laporan sesi.
* Perilaku: pelatih tetap stabil dan tidak menutupi laporan.
* Teks: satu baris komentar yang membangun.

#### Merayakan
* Di mana: latihan pertama hari itu yang mencapai laporan.
* Perilaku: sorotan biru ringan; angka runtutan disorot sebentar.
* Teks: "Selesai hari ini — runtutan N hari."

### 4. Aturan check-in

* **Syarat penyelesaian:** pelajar menyelesaikan satu latihan dan mencapai
  laporan.
* **Hitungan harian:** beberapa latihan dalam sehari hanya menyalakan hari itu
  sekali.
* **Latihan ulang:** mengulang di hari yang sama bisa memperbarui skor terbaik
  atau laporan terbaru hari itu, tetapi tidak menambah runtutan lagi.
* **Runtutan:** dihitung berdasarkan tanggal kalender.
* **Hari terlewat:** tanpa hukuman — mulai ulang runtutan dan beri pesan positif.
* **Penyimpanan:** MVP memakai state lokal; ini dimigrasi ke lapisan data
  pengguna saat akun ditambahkan.

### 5. Interaksi layar

#### Beranda
* Tampilkan kartu sambutan pelatih.
* Tampilkan tugas rekomendasi hari ini.
* Tampilkan runtutan N hari.
* Tampilkan progres mingguan 7 hari.
* Bila hari ini belum selesai, tombol utama berbunyi "Mulai latihan hari ini".
* Bila hari ini sudah selesai, bisa berbunyi "Latihan satu ronde lagi".

#### Persiapan Tugas
* Pelatih menjelaskan tujuan tugas, perkiraan ronde, dan fokus ronde ini.
* Klik "Mulai latihan 5 menit" masuk ke Ruang Latihan.

#### Ruang Latihan
* Kiri: panggung pelatih 3D.
* Saat pelajar merekam, pelatih masuk mendengarkan.
* Saat AI menyusun tindak lanjut, pelatih masuk berpikir.
* Saat AI menanyakan pertanyaan berikutnya, pelatih masuk bertanya.
* Panel kanan menyimpan tujuan tugas, ronde, petunjuk, dan pratinjau skor.

#### Laporan Sesi
* Bila hari ini belum check-in, nyalakan setelah laporan dibuat.
* Tampilkan "Selesai hari ini", "Runtutan N hari", dan "Progres minggu ini".
* Pelatih memberi satu baris komentar.
* Tawarkan "Latihan satu ronde lagi" dan "Ganti skenario".

### 6. Data status

MVP menyimpan minimal:

| Field | Arti |
| --- | --- |
| `lastCompletedDate` | Tanggal penyelesaian terakhir |
| `currentStreak` | Hari runtutan saat ini |
| `weekCompletion` | Penyelesaian 7 hari terakhir |
| `todayBestScore` | Skor terbaik hari ini (opsional) |
| `latestReportId` | Laporan terbaru (opsional) |

### 7. Kasus penerimaan

* Latihan pertama selesai: laporan menampilkan hari ini selesai, runtutan 1 hari.
* Latihan kedua di hari yang sama: hari ini menyala sekali; runtutan tidak
  bertambah dua kali.
* Selesai di hari kedua berturut-turut: runtutan naik dari 1 ke 2.
* Selesai setelah jeda sehari: runtutan mulai ulang, dan tidak ada teks hukuman.
* Beranda dalam status selesai: tombol menampilkan "Latihan satu ronde lagi" atau
  setara.
* Perubahan status pelatih: idle, mendengarkan, berpikir, bertanya, meninjau, dan
  merayakan tidak pernah menutupi transkrip, tombol, skor, atau penjelasan.
* Tata letak mobile: panggung pelatih, panel kanan, dan widget check-in bisa
  ditumpuk vertikal tanpa tumpang tindih konten.

### 8. Bukan target

* Tanpa koin, toko, papan peringkat, atau check-in pengganti.
* Tanpa sistem level yang rumit.
* Tanpa progresi karakter penuh.
* Tanpa meniru karakter atau aset visual dari produk pembelajaran mana pun.
