# Cendekia & Sela English Learning Hub (UCIC)

Platform pembelajaran bahasa Inggris interaktif bergaya Duolingo Web yang dipadukan dengan **Tutor AI 3D Berbicara (Sela)** dan **Panel Riset Diagnostik UAS** untuk memetakan serta mengatasi kelemahan mahasiswa dalam bahasa Inggris (**Grammar, Listening, Speaking, dan Vocabulary**).

| Informasi Proyek | Detail |
| --- | --- |
| **Repositori** | <https://github.com/hairift/English-Learning-Hub> |
| **Antarmuka (Frontend)** | React 19, TypeScript, Vite 7, Three.js / React Three Fiber |
| **Peladen (Backend API)** | Node.js, Express 5, Zod, siap deploy di Vercel Serverless |
| **Sintesis Suara (TTS)** | Web Speech API (`speechSynthesis`) multi-gender (suara pria & wanita alami + mode lambat) |
| **Pengenalan Suara (STT)** | Browser Web Speech Recognition (`SpeechRecognition` dwi-bahasa Inggris & Indonesia) |
| **Penyimpanan Data** | `localStorage` peramban + ekspor CSV riset (100% gratis tanpa biaya basis data eksternal) |

## 1. Fitur Utama

1. **Jalur Belajar Bergaya Duolingo Web (`/learn`)**
   - Kurikulum terstruktur dari tingkat dasar hingga mahir (CEFR A1 sampai C1) dengan peta jalur berliku, tombol mengambang `MULAI`, buku panduan unit interaktif bersuara, peti harta karun permata, dan trofi skenario akhir unit.
   - Langsung bisa dimainkan tanpa wajib membuat akun berbayar, dilengkapi profil mahasiswa lokal opsional (Nama, NIM, Program Studi, Semester).

2. **Mesin Kuis Interaktif & Karakter Animasi 2D**
   - **Kartu Kosakata Bergambar**: Pilihan kartu ilustrasi SVG vektor interaktif dengan pintasan papan ketik (`1`, `2`, `3`) dan pelafalan otomatis.
   - **Karakter Kampus 2D & Maskot Cendekia**: Animasi karakter 2D ekspresif (Pak Aris, Bu Sari, Raka, Nadia) serta maskot burung hantu sarjana **Cendekia** yang bereaksi terhadap jawaban pengguna.
   - **Dialog Dua Karakter**: Latihan melengkapi percakapan kontekstual antara dua karakter yang saling berhadapan.
   - **Latihan Mendengarkan (Listening)**: Tombol audio kecepatan normal (`1.0x`) dan tombol kura-kura kecepatan lambat (`0.6x`), opsi melewati soal dengar bila sedang di tempat bising, serta pilihan bank kata atau ketik manual.
   - **Layar Perayaan & Ulasan Kartu Skor**: Ringkasan XP dan akurasi di akhir pelajaran, dilengkapi modal **"Cek kartu skormu!"** untuk meninjau setiap soal beserta solusinya.

3. **Ngobrol AI 3D (Sela Speaking Coach dengan Lipsync)**
   - Latihan berbicara bahasa Inggris secara langsung bersama avatar 3D (`public/models/sela-tutor.glb`) yang memiliki gerakan bibir (*viseme lip-sync* `a, i, u, e, o`) dan ekspresi wajah.
   - Empat skenario dunia nyata & akademik: **Wawancara Kerja**, **Rapat Tim**, **Memesan di Restoran**, dan **Presentasi Riset Kampus**, ditambah fitur pembuat skenario kustom.

4. **Laboratorium Bunyi & Kartu Hafalan Kosakata (SRS)**
   - Latihan pelafalan fonetik bahasa Inggris (vokal, diftong, konsonan) dengan pilihan suara tutor wanita (Bu Sari) atau pria (Pak Aris) serta pemutar kecepatan normal dan lambat.
   - Sistem pengulangan berjarak (*Spaced Repetition System*) untuk memperkuat daya ingat kosakata.

5. **Gamifikasi Lengkap**
   - Poin pengalaman (XP), rentetan belajar harian (*streak*), pelindung rentetan, 5 nyawa (*hearts*) dengan pemulihan otomatis, permata biru (*gems*), toko penukaran permata, misi harian, dan papan skor liga mingguan (Perunggu hingga Berlian).

6. **Dashboard Riset UAS & Evaluasi 7 Dimensi**
   - Mengukur akurasi mahasiswa secara langsung pada 4 aspek inti: **Grammar**, **Listening**, **Speaking**, dan **Vocabulary**.
   - Menyediakan identifikasi area terlemah otomatis, rekomendasi fokus latihan, simulasi sampel kohort mahasiswa untuk demonstrasi presentasi UAS, serta tombol **Unduh CSV Riset** untuk pengolahan data laporan.
   - Laporan evaluasi berbicara 7 dimensi (Kelancaran, Pelafalan, Tata Bahasa, Kosakata, Keterpaduan, Pencapaian Tugas, Interaksi) lengkap dengan koreksi kalimat sebelum/sesudah dan tombol pemutar suara.

7. **Mode Terang & Mode Gelap (Light / Dark Mode) + Responsif Penuh**
   - Palet warna berstandar kontras tinggi yang nyaman di mata pada mode terang maupun mode gelap.
   - Tata letak adaptif untuk layar desktop (bilah sisi kiri dan kanan), tablet, hingga ponsel pintar (navigasi bawah).

## 2. Cara Menjalankan di Komputer Lokal

Pastikan **Node.js 20+** sudah terpasang di perangkat Anda.

```bash
npm install
cp .env.example .env
npm run dev
```

Buka peramban di alamat <http://127.0.0.1:5173>.

Aplikasi dapat langsung berjalan sepenuhnya meskipun tanpa mengisi kunci API eksternal (otomatis menggunakan simulasi cerdas dan sintesis suara bawaan peramban). Jika ingin mengaktifkan LLM eksternal (seperti Groq), cukup isi `LLM_API_KEY` di berkas `.env`.

## 3. Perintah Penting

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Menjalankan peladen API (`:5174`) dan antarmuka Vite (`:5173`) secara bersamaan |
| `npm test` | Menjalankan seluruh pengujian unit Vitest (25 berkas uji / 170 pengujian) |
| `npm run typecheck` | Memeriksa keamanan tipe data TypeScript (`tsc --noEmit`) |
| `npm run build` | Membangun bundel produksi ke folder `dist/` |
| `npm start` | Menjalankan peladen produksi satu pintu pada port `5174` |

## 4. Deploy Gratis ke Vercel

Proyek ini telah dilengkapi konfigurasi `vercel.json` dan fungsi tanpa peladen di `api/index.ts`. Anda cukup menghubungkan repositori GitHub ini ke akun Vercel gratis tanpa memerlukan layanan basis data berbayar.
