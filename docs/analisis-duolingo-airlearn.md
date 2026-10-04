# Analisis Fitur Duolingo & Airlearn — Rekayasa Bersih untuk Aplikasi Bahasa Inggris

**Bilingual document** — Bahasa Indonesia dan English. Setiap bagian punya versi Indonesia lebih dulu, lalu versi English.

> **Penting — etika dan hukum.** Dokumen ini adalah **rekayasa bersih (clean-room)**. Tidak ada kode, aset, teks, suara, atau basis data milik Duolingo/Airlearn yang diambil, disalin, atau direproduksi. Yang dianalisis adalah **pola produk dan mekanika pengalaman pengguna yang terlihat dari luar** oleh pengguna umum. Semua kurikulum, soal, kosakata, dan naskah di aplikasi ini disusun sendiri. Jangan pernah menyalin aset, merek, atau isi berhak cipta milik pihak lain.

---

## 1. Ringkasan Eksekutif / Executive Summary

**ID.** Duolingo dan Airlearn adalah dua aplikasi belajar bahasa dengan pendekatan berbeda. Duolingo unggul pada **mesin gamifikasi dan retensi kebiasaan**; Airlearn unggul pada **penjelasan tata bahasa yang manusiawi dan tata letak yang bersih**. Aplikasi berbahasa Inggris ini menggabungkan kedua kekuatan itu: mesin gamifikasi bergaya jalur (path), ditambah tutor bicara AI yang mendengarkan dan mengevaluasi — sesuatu yang justru menjadi celah terbesar pada aplikasi keliling.

**EN.** Duolingo and Airlearn sit at opposite ends of the spectrum. Duolingo excels at **habit-formation gamification**; Airlearn excels at **human-readable grammar explanation and clean layouts**. This English-learning app fuses both strengths: a Duolingo-style path engine, plus a speaking AI tutor that listens and evaluates — precisely the biggest gap in surrounding apps.

**Tiga pembeda utama aplikasi ini / Three core differentiators:**

| # | Pembeda / Differentiator | Mengapa penting / Why it matters |
|---|---|---|
| 1 | Tutor suara AI yang benar-benar mendengarkan (Web Speech Recognition + LLM) | Duolingo menilai ucapan dengan pola terbatas; di sini penilaian kontekstual oleh model bahasa |
| 2 | Mesin kuis lima tipe soal + kurikulum CEFR yang disusun sendiri | Bukan hanya pilihan ganda — ada susun kalimat, cocokkan kata, isi rumpang, dengar-ketik |
| 3 | Semua progres nyata tanpa server akun (localStorage) + mesin suara bawaan browser | Aplikasi tetap jujur soal datanya dan gratis untuk di-hosting |

---

## 2. Peta Fitur Lengkap / Complete Feature Map

### 2.1 Jalur pembelajaran & kurikulum / Learning path & curriculum

**ID.**
- **Skill tree bertingkat**: unit disusun dari A1 ke C1; level terbuka satu per satu setelah level sebelumnya lulus. Ini mencegah pengguna melompat ke materi yang belum siap dan menciptakan rasa kemajuan yang konstan.
- **Unit tematik**: sapaan, keluarga, rutinitas harian, kampus, pekerjaan, perjalanan, opini, komunikasi profesional.
- **Tiap unit memuat**: poin tata bahasa, kosakata target beserta contoh kalimat, skenario bicara, dan beberapa level kuis.
- **Placement test**: serangkaian soal bertingkat A1–C1 untuk menebak titik masuk pengguna, supaya yang sudah bisa tidak perlu mulai dari sapaan.

**EN.**
- **Tiered skill tree**: units run A1 → C1; each level unlocks only after the previous one is passed. This prevents skipping ahead and provides constant visible progress.
- **Thematic units**: greetings, family, daily routines, campus, work, travel, opinions, professional communication.
- **Each unit holds**: grammar points, target vocabulary with example sentences, speaking scenarios, and several quiz levels.
- **Placement test**: a tiered A1–C1 question set that estimates the learner's entry point so proficient users don't restart from "hello".

### 2.2 Taksonomi latihan / Exercise taxonomy

**ID.** Lima tipe soal dipakai, masing-masing melatih keterampilan berbeda:

| Tipe soal | Keterampilan | Cara kerja |
|---|---|---|
| `pilih-terjemahan` | Pengenalan makna | Pilih arti yang tepat dari beberapa kartu |
| `susun-kalimat` | Sintaksis / tata bahasa | Ketuk blok kata untuk menyusun kalimat benar |
| `isi-rumpang` | Tata bahasa dalam konteks | Pilih kata yang tepat untuk mengisi bagian rumpang |
| `cocokkan-kata` | Kosakata & pemetaan makna | Pasangkan kata Inggris dengan artinya |
| `dengar-ketik` | Menyimak + ejaan | Putar audio, lalu ketik kalimat yang didengar |

**EN.** Five exercise types, each targeting a distinct skill: recognition, syntax, grammar-in-context, vocabulary mapping, and listening + spelling.

### 2.3 Gamifikasi / Gamification

**ID.**
- **XP**: poin dari setiap level yang lulus. Menyelesaikan level yang sama dua kali **tidak** menggandakan XP — catatan lama diganti, jadi pengguna tidak bisa menumpuk poin dengan mengulang level termudah.
- **Rentetan harian (streak)**: jumlah hari beruntun berlatih. Dihitung mundur dari hari ini; lewat satu hari tanpa latihan membuat rentetan putus.
- **Pelindung rentetan (streak freeze)**: menyelamatkan rentetan saat pengguna melewatkan tepat satu hari. Jumlahnya terbatas (mulai dari 2) agar tetap terasa berharga.
- **Nyawa (hearts)**: 5 nyawa; jawaban salah mengurangi satu. Pulih satu setiap 30 menit, dan berlatih juga memulihkan satu. Kehabisan nyawa menghentikan level dan pengguna harus mengulang.
- **Liga mingguan**: Bronze → Silver → Gold → Sapphire → Diamond. Naik berdasarkan XP tujuh hari berjalan. Liga hanya naik, tidak pernah turun, supaya pengguna tidak merasa dihukum.
- **Papan peringkat jujur**: karena tidak ada server akun, papan tidak menampilkan nama pengguna palsu. Yang ditampilkan adalah tonggak perjalanan menuju liga berikutnya, dengan posisi pengguna ditandai jelas.

**EN.** XP (no double-dipping on repeats), daily streaks, limited streak freezes, 5 hearts with timed recovery, a monotonic weekly league ladder, and an honest leaderboard that shows milestones rather than fabricated competitor names.

### 2.4 Pengulangan berjadwal / Spaced repetition (SRS)

**ID.** Setiap kosakata menjadi kartu dengan tingkat penguasaan 0–5. Interval pengulangan mengikuti kurva lupa: `[0, 1, 2, 4, 8, 16, 32]` hari. Jawaban benar menaikkan tingkat (interval makin panjang); jawaban salah menurunkannya dan mengulang besok. Tampilan menampilkan berapa kartu yang dikuasai, perlu diulang, dan masih baru.

**EN.** Each vocabulary item becomes a card with mastery level 0–5. Intervals follow the forgetting curve: `[0, 1, 2, 4, 8, 16, 32]` days. Correct answers promote the card; wrong answers demote it and resurface it tomorrow.

### 2.5 Alur suara AI / Speech-AI flow

**ID.**

```
Pengguna bicara
   │  Web Speech Recognition (id-ID atau en-US)
   ▼
Transkrip mentah
   │  deteksiBahasa() → pilih bahasa balasan + normalisasi teks
   ▼
LLM (tutor) menghasilkan balasan terstruktur (JSON tervalidasi Zod)
   │  dipecah per kalimat untuk menekan latensi
   ▼
Speech Synthesis (suara perempuan) + lip sync prosedural
```

Deteksi bahasa memakai skor berbobot: kata fungsi (+1), penanda struktur kuat (+0.8), imbuhan Indonesia (+0.35 per kata). Bahasa recognizer hanya diganti bila **selisih skor ≥ 1,5 dan minimal 3 kata** — ini yang mencegah satu kata Inggris ("English") merusak transkripsi Indonesia.

**EN.** Language detection uses weighted scoring; the recognizer language only switches when the score gap is ≥ 1.5 and at least 3 words are present — preventing a single English word from breaking Indonesian transcription.

### 2.6 Struktur data / Data entities

**ID.**

| Entitas | Medan kunci |
|---|---|
| `UnitJalur` | id, tingkat CEFR, judul (EN/ID), tema, grammar[], kosakata[], skenario[], level[] |
| `LevelJalur` | id, judul, ringkasan, soal[], xp |
| `Soal` | id, tipe, pertanyaan, blok[]/pilihan[], jawaban, teksAudio |
| `ProgresJalur` | levelSelesai[], xpTotal |
| `GamifikasiState` | xpTotal, xpHarian[], terakhirLatihan, rentetan, rentetanTerpanjang, pelindungRentetan, liga, nyawa, nyawaBerkurangPada |
| `KartuSrs` | id, kosakata, tingkat, jatuhTempo, benarBerturut, jumlahSalah |
| `HasilPenempatan` | tingkat, rincian[], ringkasan |

**EN.** Seven core entities model the whole learning loop without requiring a backend account system.

---

## 3. Rekomendasi Tumpukan Teknologi / Tech-Stack Recommendations

| Lapisan / Layer | Pilihan di aplikasi ini / Chosen here | Alternatif / Alternative |
|---|---|---|
| Antarmuka / UI | React 19 + TypeScript (strict) + Vite | Next.js bila butuh SSR/SEO |
| Gaya / Styling | CSS murni dengan token (`--biru-utama`, dst.) | Tailwind untuk kecepatan |
| API | Node.js + Express 5 + Zod 4 (validasi skema) | Fastify, Hono |
| TTS | Web Speech Synthesis (utama) + Supertonic (opsional developer) | ElevenLabs, Azure Speech |
| STT | Web Speech Recognition | Whisper (server), Deepgram |
| LLM | Provider apa pun lewat panel developer | — |
| Penyimpanan | localStorage (tanpa akun) | Postgres + Prisma bila perlu multiperangkat |

**Catatan hosting / Hosting note:** Supertonic butuh model ONNX ~385 MB + venv Python ~174 MB. Sandbox gratis biasanya hanya memberi satu port HTTP tanpa Python, jadi di pratinjau hosting mesin suara utama adalah **Speech Synthesis bawaan browser**. Supertonic tetap tersedia lewat `.env` untuk mesin pengembang. Lihat `docs/tts-supertonic.md`.

---

## 4. Skema JSON Kurikulum / Curriculum JSON Schema

**ID.** Struktur berikut adalah bentuk yang dipakai `src/domain/jalurBelajar.ts` dan bisa dijadikan acuan bila kurikulum dipindah ke basis data.

```jsonc
{
  "id": "unit-perkenalan",
  "tingkat": "A1",
  "judul": "Greetings & Introductions",
  "judulId": "Sapaan & Perkenalan",
  "tema": "Menyapa orang baru dan memperkenalkan diri",
  "grammar": ["To be (am/is/are)", "Kata ganti orang"],
  "kosakata": [
    { "en": "hello", "id": "halo", "contoh": "Hello, my name is Rina." }
  ],
  "skenario": ["Berkenalan dengan tetangga baru"],
  "level": [
    {
      "id": "lv-perkenalan-1",
      "judul": "Sapaan Dasar",
      "ringkasan": "Menyapa dan menjawab sapaan",
      "xp": 20,
      "soal": [
        {
          "id": "s1-1",
          "tipe": "pilih-terjemahan",
          "pertanyaan": "Apa arti \"hello\"?",
          "pilihan": ["halo", "selamat", "terima kasih"],
          "jawaban": "halo"
        },
        {
          "id": "s1-2",
          "tipe": "susun-kalimat",
          "pertanyaan": "Susun menjadi kalimat yang benar.",
          "blok": ["name", "is", "My", "Rina"],
          "jawaban": "My name is Rina"
        }
      ]
    }
  ]
}
```

---

## 5. Prinsip Desain yang Diadopsi / Adopted Design Principles

**ID.**
1. **Satu jalur, satu arah.** Pengguna tidak perlu memilih; jalur menunjukkan langkah berikutnya.
2. **Kesalahan tidak dihukum berat.** Jawaban salah tidak membuka kunci jawaban — pengguna boleh mencoba lagi sampai benar, hanya kehilangan satu nyawa.
3. **Kejujuran data.** Bila pengguna belum berlatih, angka menunjukkan nol. Tidak ada nama atau skor palsu.
4. **Tanpa emoji.** Semua ikon memakai pustaka vektor profesional (lucide-react).
5. **Suara konsisten.** Satu mesin suara untuk semua kondisi (Speech Synthesis bawaan browser), suara perempuan, mendukung Indonesia dan Inggris.
6. **Konfigurasi tersembunyi dari pengguna.** Panel API hanya muncul di mode developer (`?dev=1`).

**EN.**
1. **One path, one direction.** No decision fatigue — the path always shows the next step.
2. **Errors are cheap.** A wrong answer never reveals the key; the learner retries, losing only one heart.
3. **Honest data.** No practice, no points. No fabricated competitor names or scores.
4. **No emoji.** All iconography uses a professional vector library.
5. **Consistent voice.** One engine everywhere, female voice, Indonesian + English.
6. **Configuration hidden from end users.** The API panel appears only in developer mode.

---

## 6. Yang Sengaja TIDAK Ditiru / Deliberately Not Copied

**ID.**
- **Aset visual, maskot, dan suara Duolingo/Airlearn.** Semua identitas visual di sini orisinal.
- **Teks pelajaran, contoh kalimat, dan rekaman audio.** Seluruh kurikulum disusun sendiri.
- **Papan peringkat palsu.** Banyak aplikasi menampilkan "pengguna lain" yang sebenarnya data buatan. Di sini tidak.
- **Iklan dan batas harian yang memaksa berlangganan.** Nyawa memang ada, tapi pemulihannya jelas dan gratis.

**EN.**
- **Visual assets, mascots, and voices** from either app. All identity here is original.
- **Lesson text, example sentences, and audio recordings.** The curriculum is authored from scratch.
- **Fake leaderboards.** This app shows milestones and honest self-positioning instead.
- **Ads and artificial paywalls.** Hearts exist, but recovery is transparent and free.

---

## 7. Peta Berkas Terkait / Related Files

| Berkas / File | Isi / Contents |
|---|---|
| `src/domain/jalurBelajar.ts` | Kurikulum 8 unit CEFR + 5 tipe soal |
| `src/domain/progresJalur.ts` | Aturan kunci-terbuka level, pencatatan kelulusan |
| `src/domain/gamifikasi.ts` | XP, rentetan, pelindung, liga, nyawa |
| `src/domain/srs.ts` | Placement test + pengulangan berjadwal |
| `src/domain/deteksiBahasa.ts` | Deteksi bahasa ID/EN berbobot |
| `src/components/PetaJalur.tsx` | Peta jalur bergaya skill tree |
| `src/components/MesinKuis.tsx` | Mesin kuis lima tipe soal |
| `src/components/Gamifikasi.tsx` | Bilah status, papan liga, nyawa |
| `src/components/TesPenempatan.tsx` | Placement test + kotak SRS |
| `src/storage.ts` | Penyimpanan localStorage untuk semua modul di atas |
