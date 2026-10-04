/**
 * Deteksi bahasa teks — dipakai bersama oleh browser dan server.
 *
 * Kenapa modul ini ada:
 *
 * Versi pertama deteksi bahasa berada di `shared/textNormalizer.ts` dan punya
 * dua cacat yang membuat pengenalan suara Bahasa Indonesia rusak:
 *
 * 1. **Regex imbuhan tidak case-insensitive.** Kode menjalankan
 *    `/\b(me|ber|ter|pe|se)[a-z]{3,}\b/.test(teks.toLowerCase())` di satu baris,
 *    tetapi baris berikutnya memakai `teks.toLowerCase()` untuk pola akhiran
 *    sementara pola awalan masih diuji terhadap teks asli. Akibatnya
 *    "Makanan" atau "Belajar" (huruf besar di awal kalimat — yang SELALU
 *    terjadi pada hasil transkrip) tidak pernah cocok, sehingga skor Indonesia
 *    kehilangan bobot penandanya.
 *
 * 2. **Daftar kata tidak seimbang.** `KATA_UMUM_ID` hampir tidak memuat kata
 *    fungsi yang paling sering muncul dalam percakapan sehari-hari ("apa kabar",
 *    "hari ini", "terima kasih" hanya sebagian tertutup), sedangkan
 *    `KATA_UMUM_EN` memuat kata yang sangat sering muncul. Akibatnya satu saja
 *    kata Inggris dalam kalimat Indonesia ("saya suka belajar English") sudah
 *    cukup membalik hasil deteksi.
 *
 * Dampak gabungannya fatal karena hasil deteksi dipakai untuk MENGUNCI bahasa
 * recognizer pada sesi berikutnya. Begitu salah kunci ke `en-US`, semua ucapan
 * Indonesia berikutnya ditranskrip menjadi omong kosong, dan pengguna harus
 * memilih bahasa secara manual untuk memulihkannya.
 *
 * Perbaikan di sini:
 * - normalisasi huruf kecil SEKALI di awal, lalu semua pola diuji pada teks kecil,
 * - daftar kata fungsi Indonesia yang jauh lebih lengkap,
 * - imbuhan (awalan/akhiran) dihitung dengan bobot yang jelas,
 * - `nilaiKeyakinanBahasa()` mengembalikan selisih skor sehingga pemanggil bisa
 *   memutuskan untuk TIDAK mengunci bahasa ketika buktinya lemah.
 */

/** Kata fungsi bahasa Indonesia yang paling sering muncul dalam percakapan. */
const KATA_UMUM_ID = [
  "yang", "dan", "saya", "aku", "kamu", "anda", "dia", "kami", "kita", "mereka",
  "tidak", "tak", "bukan", "bisa", "dapat", "dengan", "untuk", "adalah", "ialah",
  "ini", "itu", "akan", "sudah", "belum", "sedang", "masih", "pernah",
  "terima", "kasih", "tolong", "silakan", "maaf", "permisi",
  "bagaimana", "gimana", "apa", "apakah", "siapa", "kenapa", "mengapa",
  "sekarang", "nanti", "besok", "kemarin", "tadi", "hari", "minggu", "bulan",
  "tahun", "pagi", "siang", "sore", "malam", "jam", "menit",
  "sangat", "sekali", "banget", "terlalu", "cukup", "agak",
  "juga", "atau", "karena", "tetapi", "tapi", "kalau", "jika", "supaya",
  "saja", "hanya", "sama", "seperti", "sebagai", "setelah", "sebelum",
  "mau", "ingin", "pengen", "suka", "punya", "buat", "bikin",
  "dari", "ke", "di", "pada", "dalam", "luar", "atas", "bawah", "depan",
  "belakang", "samping", "antara", "tentang",
  "ada", "orang", "waktu", "baik", "bagus", "keren", "senang", "susah",
  "sulit", "mudah", "benar", "salah", "lagi", "pergi", "datang", "makan",
  "minum", "tinggal", "nama", "umur", "rumah", "sekolah", "kantor",
  "latihan", "belajar", "bahasa", "inggris", "indonesia", "bicara", "ngomong",
  "kerja", "main", "santai", "bantu", "coba", "mulai", "selesai"
];

/** Kata fungsi bahasa Inggris yang paling sering muncul dalam percakapan. */
const KATA_UMUM_EN = [
  "the", "a", "an", "and", "or", "but", "so", "because", "if", "then",
  "i", "you", "we", "they", "he", "she", "it", "my", "your", "our", "their",
  "his", "her", "its", "me", "us", "them",
  "is", "are", "was", "were", "am", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "doing", "done",
  "can", "could", "will", "would", "shall", "should", "may", "might", "must",
  "to", "of", "in", "on", "at", "for", "with", "from", "about", "into",
  "this", "that", "these", "those", "there", "here",
  "hello", "hi", "hey", "please", "thank", "thanks", "sorry",
  "what", "why", "how", "when", "where", "who", "which", "whose",
  "very", "too", "quite", "just", "also", "only", "really",
  "good", "great", "nice", "bad", "fine", "okay", "yes", "no", "not",
  "work", "practice", "learn", "study", "speak", "talk", "english",
  "project", "team", "meeting", "time", "day", "week", "month", "year",
  "today", "tomorrow", "yesterday", "morning", "afternoon", "evening", "night",
  "people", "person", "friend", "name", "home", "school", "office", "help"
];

/** Imbuhan yang kuat menandai kata bahasa Indonesia. */
const AWALAN_ID = ["meng", "meny", "menge", "mem", "men", "me", "ber", "ter", "pe", "per", "se", "ke", "di"];
const AKHIRAN_ID = ["kan", "nya", "lah", "kah", "pun", "an"];

/** Kata yang HANYA bermakna sebagai penanda struktur bahasa Indonesia. */
const PENANDA_KUAT_ID = ["yang", "dan", "di", "ke", "dari", "tidak", "tidak", "sudah", "belum", "adalah", "dengan", "untuk", "pada"];

/** Kata yang HANYA bermakna sebagai penanda struktur bahasa Inggris. */
const PENANDA_KUAT_EN = ["the", "and", "is", "are", "was", "were", "have", "has", "do", "does", "to", "of", "with", "this", "that"];

export interface HasilDeteksiBahasa {
  /** Bahasa yang paling mungkin. */
  bahasa: "id" | "en";
  /** Skor bahasa Indonesia. */
  skorId: number;
  /** Skor bahasa Inggris. */
  skorEn: number;
  /**
   * Selisih skor (selalu >= 0). Nilai kecil berarti bukti lemah, dan pemanggil
   * sebaiknya TIDAK mengunci bahasa recognizer berdasarkan hasil ini.
   */
  keyakinan: number;
}

/**
 * Pisahkan teks menjadi kata huruf kecil, sekaligus membuang angka dan tanda baca.
 * Hasil kosong bila teks tidak memuat huruf sama sekali.
 */
export function pecahKata(teks: string): string[] {
  return teks
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Hitung skor kedua bahasa beserta tingkat keyakinannya.
 *
 * Semua pengujian dilakukan pada teks yang sudah dinormalisasi ke huruf kecil,
 * sehingga kapitalisasi awal kalimat tidak lagi menghilangkan penanda imbuhan.
 */
export function hitungKeyakinanBahasa(teks: string): HasilDeteksiBahasa {
  const teksKecil = teks.toLowerCase();
  const kata = pecahKata(teksKecil);

  if (!kata.length) {
    return { bahasa: "id", skorId: 0, skorEn: 0, keyakinan: 0 };
  }

  const himpunanId = new Set(KATA_UMUM_ID);
  const himpunanEn = new Set(KATA_UMUM_EN);
  let skorId = 0;
  let skorEn = 0;

  for (const item of kata) {
    if (himpunanId.has(item)) skorId += 1;
    if (himpunanEn.has(item)) skorEn += 1;
  }

  // Penanda struktur memberi bobot lebih besar karena kata-kata ini hampir
  // tidak pernah muncul di bahasa lain, sehingga buktinya jauh lebih kuat
  // daripada sekadar kecocokan kosakata.
  for (const item of kata) {
    if (PENANDA_KUAT_ID.includes(item)) skorId += 0.8;
    if (PENANDA_KUAT_EN.includes(item)) skorEn += 0.8;
  }

  // Imbuhan khas Indonesia dihitung pada teks huruf kecil — inilah perbaikan
  // utama dibanding versi sebelumnya yang menguji pola pada teks asli.
  for (const item of kata) {
    // Kata sangat pendek tidak diperiksa agar "me" atau "di" berdiri sendiri
    // tidak salah dianggap berimbuhan.
    if (item.length < 5) continue;
    if (AWALAN_ID.some((awalan) => item.startsWith(awalan)) && item.length > 4) skorId += 0.35;
    if (AKHIRAN_ID.some((akhiran) => item.endsWith(akhiran))) skorId += 0.35;
  }

  const keyakinan = Math.abs(skorId - skorEn);
  return { bahasa: skorEn > skorId ? "en" : "id", skorId, skorEn, keyakinan };
}

/**
 * Menebak bahasa dominan pada sebuah teks.
 *
 * Dipakai untuk fitur "ganti bahasa otomatis": kalau pengguna berbicara bahasa
 * Inggris, mesin TTS otomatis memakai `lang="en"`, dan sebaliknya.
 *
 * Seri selalu dimenangkan bahasa Indonesia karena itu bahasa utama aplikasi.
 */
export function deteksiBahasa(teks: string): "id" | "en" {
  return hitungKeyakinanBahasa(teks).bahasa;
}
