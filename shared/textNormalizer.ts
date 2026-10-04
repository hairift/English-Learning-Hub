/**
 * normalizer teks untuk TTS (Text To Speech) — Bahasa Indonesia & Inggris.
 *
 * Kenapa file ini ada?
 * Supertonic TTS (dan hampir semua TTS) punya normalizer internal yang dioptimalkan
 * untuk bahasa Inggris. Saat `lang="id"`, angka mentah seperti `15.000`, `50%`,
 * `14:30`, atau nomor HP sering dibaca aneh (dibaca desimal, dibaca per digit salah,
 * atau dicampur logat Inggris).
 *
 * Solusinya: JANGAN kirim angka mentah ke TTS. Ubah dulu angka menjadi kata di sini.
 *
 * File ini dipakai bersama (shared) oleh:
 * - server Node  -> sebelum memanggil provider TTS apa pun (Supertonic, ElevenLabs, Cartesia, Qwen).
 * - browser      -> fallback `window.speechSynthesis` dan pratinjau suara.
 *
 * Aturan penting:
 * - Nomor HP / NIK / OTP / kode verifikasi TIDAK diterbilang, tapi dieja per digit.
 * - Pemisah ribuan Indonesia (titik) dihapus lebih dulu supaya tidak dibaca desimal.
 * - Desimal Indonesia memakai koma, jadi `3,5` -> "tiga koma lima".
 */

/* -------------------------------------------------------------------------- */
/* Bagian 1 — Angka menjadi kata: Bahasa Indonesia                            */
/* -------------------------------------------------------------------------- */

/** Nama satuan 0-9 dalam bahasa Indonesia. */
const SATUAN_ID = [
  "nol",
  "satu",
  "dua",
  "tiga",
  "empat",
  "lima",
  "enam",
  "tujuh",
  "delapan",
  "sembilan"
] as const;

/** Nama kelompok besar (ribu, juta, miliar, triliun). */
const KELOMPOK_ID = ["", "ribu", "juta", "miliar", "triliun"] as const;

/**
 * Mengubah bilangan bulat 0-999 menjadi kata bahasa Indonesia.
 * Contoh: 115 -> "seratus lima belas"
 */
function tigaDigitKeKataId(angka: number): string {
  const bagian: string[] = [];
  const ratusan = Math.floor(angka / 100);
  const sisa = angka % 100;

  if (ratusan > 0) {
    // 100 dibaca "seratus", bukan "satu ratus".
    bagian.push(ratusan === 1 ? "seratus" : `${SATUAN_ID[ratusan]} ratus`);
  }

  if (sisa >= 12 && sisa <= 19) {
    // 12-19 memakai akhiran "belas".
    bagian.push(`${SATUAN_ID[sisa - 10]} belas`);
  } else if (sisa === 10) {
    bagian.push("sepuluh");
  } else if (sisa === 11) {
    bagian.push("sebelas");
  } else if (sisa >= 20) {
    const puluhan = Math.floor(sisa / 10);
    const satuan = sisa % 10;
    bagian.push(satuan === 0 ? `${SATUAN_ID[puluhan]} puluh` : `${SATUAN_ID[puluhan]} puluh ${SATUAN_ID[satuan]}`);
  } else if (sisa > 0) {
    bagian.push(SATUAN_ID[sisa]);
  }

  return bagian.join(" ");
}

/**
 * Mengubah bilangan bulat (boleh negatif, boleh besar) menjadi kata bahasa Indonesia.
 * Contoh: 25000 -> "dua puluh lima ribu"
 */
export function angkaKeKataId(nilai: number | string): string {
  const angka = typeof nilai === "number" ? nilai : Number.parseInt(nilai.replace(/[^\d-]/g, ""), 10);
  if (!Number.isFinite(angka)) return String(nilai);
  if (angka === 0) return "nol";

  const negatif = angka < 0;
  let sisa = Math.abs(Math.trunc(angka));
  const kelompok: string[] = [];
  let indeksKelompok = 0;

  while (sisa > 0 && indeksKelompok < KELOMPOK_ID.length) {
    const potongan = sisa % 1000;
    if (potongan > 0) {
      const namaKelompok = KELOMPOK_ID[indeksKelompok];
      // 1000 dibaca "seribu", bukan "satu ribu".
      const teksPotongan = indeksKelompok === 1 && potongan === 1 ? "se" : `${tigaDigitKeKataId(potongan)} `;
      kelompok.unshift(`${teksPotongan}${namaKelompok}`.trim());
    }
    sisa = Math.floor(sisa / 1000);
    indeksKelompok += 1;
  }

  const hasil = kelompok.join(" ").replace(/\s+/g, " ").trim();
  return negatif ? `min ${hasil}` : hasil;
}

/** Mengeja digit satu per satu. Contoh: "0812" -> "nol delapan satu dua". */
export function ejaDigitId(digit: string): string {
  return digit
    .replace(/[^\d]/g, "")
    .split("")
    .map((d) => SATUAN_ID[Number(d)] ?? d)
    .join(" ");
}

/* -------------------------------------------------------------------------- */
/* Bagian 2 — Angka menjadi kata: Bahasa Inggris                              */
/* -------------------------------------------------------------------------- */

const SATUAN_EN = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen"
] as const;

const PULUHAN_EN = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety"
] as const;

const KELOMPOK_EN = ["", "thousand", "million", "billion", "trillion"] as const;

function tigaDigitKeKataEn(angka: number): string {
  const bagian: string[] = [];
  const ratusan = Math.floor(angka / 100);
  const sisa = angka % 100;

  if (ratusan > 0) bagian.push(`${SATUAN_EN[ratusan]} hundred`);
  if (sisa >= 20) {
    const puluhan = Math.floor(sisa / 10);
    const satuan = sisa % 10;
    bagian.push(satuan === 0 ? PULUHAN_EN[puluhan] : `${PULUHAN_EN[puluhan]}-${SATUAN_EN[satuan]}`);
  } else if (sisa > 0) {
    bagian.push(SATUAN_EN[sisa]);
  }

  return bagian.join(" ");
}

/** Mengubah bilangan bulat menjadi kata bahasa Inggris. Contoh: 5200000 -> "five million two hundred thousand". */
export function angkaKeKataEn(nilai: number | string): string {
  const angka = typeof nilai === "number" ? nilai : Number.parseInt(nilai.replace(/[^\d-]/g, ""), 10);
  if (!Number.isFinite(angka)) return String(nilai);
  if (angka === 0) return "zero";

  const negatif = angka < 0;
  let sisa = Math.abs(Math.trunc(angka));
  const kelompok: string[] = [];
  let indeks = 0;

  while (sisa > 0 && indeks < KELOMPOK_EN.length) {
    const potongan = sisa % 1000;
    if (potongan > 0) {
      kelompok.unshift(`${tigaDigitKeKataEn(potongan)} ${KELOMPOK_EN[indeks]}`.trim());
    }
    sisa = Math.floor(sisa / 1000);
    indeks += 1;
  }

  const hasil = kelompok.join(" ").replace(/\s+/g, " ").trim();
  return negatif ? `minus ${hasil}` : hasil;
}

/** Mengeja digit satu per satu dalam bahasa Inggris. */
export function ejaDigitEn(digit: string): string {
  return digit
    .replace(/[^\d]/g, "")
    .split("")
    .map((d) => SATUAN_EN[Number(d)] ?? d)
    .join(" ");
}

/* -------------------------------------------------------------------------- */
/* Bagian 3 — Utilitas pemetaan angka                                          */
/* -------------------------------------------------------------------------- */

/** Mengubah "15.000" / "15,000" menjadi 15000 (menghapus pemisah ribuan). */
function bersihkanPemisahRibuan(teks: string, gaya: "id" | "en"): string {
  const pemisahRibuan = gaya === "id" ? "." : ",";
  const pola = new RegExp(`(\\d)\\${pemisahRibuan}(\\d{3})(?!\\d)`, "g");
  let hasil = teks;
  // Ulangi sampai tidak ada lagi pemisah ribuan bertingkat (mis. 1.234.567).
  let sebelum = "";
  while (sebelum !== hasil) {
    sebelum = hasil;
    hasil = hasil.replace(pola, "$1$2");
  }
  return hasil;
}

/** Mengubah angka desimal menjadi kata. Contoh: "3,5" -> "tiga koma lima". */
function desimalKeKataId(angka: string): string {
  const [bulat, desimal] = angka.split(/[.,]/);
  const bagianBulat = angkaKeKataId(bulat || "0");
  if (!desimal) return bagianBulat;
  const digitDesimal = desimal
    .split("")
    .map((d) => SATUAN_ID[Number(d)] ?? d)
    .join(" ");
  return `${bagianBulat} koma ${digitDesimal}`;
}

function desimalKeKataEn(angka: string): string {
  const [bulat, desimal] = angka.split(".");
  const bagianBulat = angkaKeKataEn(bulat || "0");
  if (!desimal) return bagianBulat;
  const digitDesimal = desimal
    .split("")
    .map((d) => SATUAN_EN[Number(d)] ?? d)
    .join(" ");
  return `${bagianBulat} point ${digitDesimal}`;
}

/* -------------------------------------------------------------------------- */
/* Bagian 4 — Normalisasi kalimat lengkap                                      */
/* -------------------------------------------------------------------------- */

/**
 * Penanda agar nomor HP/kode tidak ikut diubah oleh aturan angka umum.
 *
 * PENTING: penanda memakai karakter Private Use Area (U+E000..), BUKAN digit.
 * Kalau indeksnya berupa digit, regex `\b\d+\b` pada langkah terakhir akan
 * mengubah indeks itu menjadi kata ("nol", "satu", ...) sehingga penanda rusak
 * dan hasil ejaan gagal dikembalikan.
 */
const PENANDA_AWAL = "\uE000";
const PENANDA_AKHIR = "\uE001";
const BASIS_INDEKS_PENANDA = 0xe100;

/** Membuat penanda unik untuk indeks tertentu. */
function buatPenanda(indeks: number): string {
  return `${PENANDA_AWAL}${String.fromCharCode(BASIS_INDEKS_PENANDA + indeks)}${PENANDA_AKHIR}`;
}

/**
 * Normalisasi teks bahasa Indonesia sebelum dikirim ke mesin TTS.
 *
 * Contoh:
 *   "Saya punya 2 apel seharga Rp15.000 dan diskon 50% jam 14:30"
 *   -> "Saya punya dua apel seharga lima belas ribu rupiah dan diskon lima puluh persen jam empat belas lewat tiga puluh"
 */
export function normalisasiTeksId(teks: string): string {
  let hasil = teks;
  const penampungEjaan: string[] = [];

  /** Menyimpan hasil ejaan digit ke penampung agar tidak diproses ulang. */
  const simpanEjaan = (teksEjaan: string) => {
    penampungEjaan.push(teksEjaan);
    return buatPenanda(penampungEjaan.length - 1);
  };

  // 1. Nomor HP / WhatsApp Indonesia (08xx, +628xx) -> eja per digit.
  hasil = hasil.replace(/(\+?62|0)8[\d\s-]{7,14}\d/g, (cocok) =>
    simpanEjaan(ejaDigitId(cocok))
  );

  // 2. NIK (16 digit), nomor rekening, OTP, kode panjang -> eja per digit.
  hasil = hasil.replace(/\b\d{6,}\b/g, (cocok) => simpanEjaan(ejaDigitId(cocok)));

  // 3. Mata uang: Rp / IDR / Rp. + angka -> "... rupiah".
  // Catatan: satuan opsional dibungkus grup non-capturing supaya spasi sesudah
  // angka tidak ikut termakan saat tidak ada satuan (mis. "Rp15.000 dan").
  hasil = hasil.replace(
    /(?:Rp|IDR)\.?\s*([\d.,]+)(?:\s*(juta|ribu|miliar|m))?/gi,
    (_cocok, angka, satuan) => {
      const nilai = angka.replace(/\./g, "").replace(",", ".");
      const dasar = nilai.includes(".") ? desimalKeKataId(nilai.replace(".", ",")) : angkaKeKataId(nilai);
      return `${dasar}${satuan ? ` ${satuan}` : ""} rupiah`;
    }
  );

  // 4. Mata uang asing.
  hasil = hasil.replace(
    /\$\s*([\d.,]+)(?:\s*(k|m|b|juta|ribu|miliar))?/gi,
    (_cocok, angka, satuan) => {
      const nilai = angka.replace(/,/g, "");
      const dasar = nilai.includes(".") ? desimalKeKataEn(nilai) : angkaKeKataId(nilai);
      const pengali = satuan ? ` ${satuan}` : "";
      return `${dasar}${pengali} dolar`;
    }
  );
  hasil = hasil.replace(/€\s*([\d.,]+)/g, (_cocok, angka) => `${angkaKeKataId(angka.replace(/\./g, ""))} euro`);

  // 5. Persen: 50% / 3,5 % -> "... persen".
  hasil = hasil.replace(/(\d+(?:[.,]\d+)?)\s*%/g, (_cocok, angka) =>
    `${angka.includes(",") ? desimalKeKataId(angka) : angkaKeKataId(angka)} persen`
  );

  // 6. Jam dengan titik dua (14:30). Titik dua wajib supaya tidak menabrak angka ribuan.
  // Awalan "jam"/"pukul" yang sudah ada ikut dimakan agar tidak jadi "jam jam".
  hasil = hasil.replace(/\b(?:(?:jam|pukul)\s+)?(\d{1,2}):(\d{2})\b/gi, (_cocok, jam, menit) => {
    const menitAngka = Number(menit);
    const jamKata = angkaKeKataId(jam);
    if (menitAngka === 0) return `jam ${jamKata} tepat`;
    if (menitAngka === 15) return `jam ${jamKata} lewat lima belas`;
    if (menitAngka === 30) return `jam ${jamKata} lewat tiga puluh`;
    if (menitAngka === 45) return `jam ${jamKata} lewat empat puluh lima`;
    return `jam ${jamKata} lewat ${angkaKeKataId(String(menitAngka).padStart(2, "0"))}`;
  });

  // 7. Hapus pemisah ribuan supaya "15.000" tidak dibaca desimal.
  hasil = bersihkanPemisahRibuan(hasil, "id");

  // 8. Desimal Indonesia memakai koma.
  hasil = hasil.replace(/(\d+),(\d+)/g, (_cocok, bulat, desimal) => desimalKeKataId(`${bulat},${desimal}`));

  // 9. Sisa angka apa pun (termasuk tahun) -> terbilang biasa.
  hasil = hasil.replace(/\b\d+\b/g, (cocok) => angkaKeKataId(cocok));

  // 10. Kembalikan hasil ejaan digit.
  penampungEjaan.forEach((teksEjaan, indeks) => {
    // Pakai fungsi pengganti agar karakter khusus (mis. `$`) pada hasil ejaan tidak ditafsirkan.
    hasil = hasil.replace(buatPenanda(indeks), () => teksEjaan);
  });

  // 11. Bersihkan sisa penanda (jaga-jaga) dan rapikan spasi.
  hasil = hasil.replace(/[\uE000\uE001]/g, " ");

  return hasil.replace(/\s+/g, " ").trim();
}

/**
 * Normalisasi teks bahasa Inggris sebelum dikirim ke mesin TTS.
 *
 * Contoh:
 *   "The startup secured $5.2M in funding at 4:45 PM, 30kph"
 *   -> "The startup secured five point two million dollars in funding at four forty-five PM, thirty kph"
 */
export function normalisasiTeksEn(teks: string): string {
  let hasil = teks;
  const penampungEjaan: string[] = [];
  const simpanEjaan = (teksEjaan: string) => {
    penampungEjaan.push(teksEjaan);
    return buatPenanda(penampungEjaan.length - 1);
  };

  // 1. Nomor telepon AS/Internasional -> eja per digit.
  hasil = hasil.replace(/\+?\d[\d\s().-]{7,}\d/g, (cocok) => {
    const jumlahDigit = cocok.replace(/\D/g, "").length;
    // Hanya perlakukan sebagai nomor bila punya cukup digit dan ada tanda pemisah.
    if (jumlahDigit >= 7 && /[\s().-]/.test(cocok)) return simpanEjaan(ejaDigitEn(cocok));
    return cocok;
  });

  // 2. Kode panjang tanpa pemisah (OTP / ID) -> eja per digit.
  hasil = hasil.replace(/\b\d{6,}\b/g, (cocok) => simpanEjaan(ejaDigitEn(cocok)));

  // 3. Singkatan besaran: $5.2M, 450K, 2.3B (simbol "$" ikut jadi "dollars").
  hasil = hasil.replace(
    /(\$)?\s*(\d+(?:\.\d+)?)\s*([KkMmBb])\b/g,
    (_cocok, simbolDolar, angka, satuan) => {
      const namaSatuan: Record<string, string> = {
        k: "thousand",
        m: "million",
        b: "billion"
      };
      const dasar = angka.includes(".") ? desimalKeKataEn(angka) : angkaKeKataEn(angka);
      const dolar = simbolDolar ? " dollars" : "";
      return `${dasar} ${namaSatuan[satuan.toLowerCase()]}${dolar}`;
    }
  );

  // 4. Mata uang dolar.
  hasil = hasil.replace(/\$\s*(\d+(?:\.\d+)?)/g, (_cocok, angka) =>
    `${angka.includes(".") ? desimalKeKataEn(angka) : angkaKeKataEn(angka)} dollars`
  );

  // 5. Persen.
  hasil = hasil.replace(/(\d+(?:\.\d+)?)\s*%/g, (_cocok, angka) =>
    `${angka.includes(".") ? desimalKeKataEn(angka) : angkaKeKataEn(angka)} percent`
  );

  // 6. Jam dengan menit: "4:45 PM" / "16:30".
  hasil = hasil.replace(/\b(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?\b/g, (_cocok, jam, menit, penanda) => {
    const menitAngka = Number(menit);
    const jamKata = angkaKeKataEn(jam);
    const penandaKata = penanda ? ` ${penanda.toUpperCase().split("").join(" ")}` : "";
    if (menitAngka === 0) return `${jamKata} o'clock${penandaKata}`;
    if (menitAngka < 10) return `${jamKata} oh ${angkaKeKataEn(menitAngka)}${penandaKata}`;
    return `${jamKata} ${angkaKeKataEn(menitAngka)}${penandaKata}`;
  });

  // 7. Hapus pemisah ribuan gaya Inggris.
  hasil = bersihkanPemisahRibuan(hasil, "en");

  // 8. Desimal titik.
  hasil = hasil.replace(/(\d+)\.(\d+)/g, (_cocok, bulat, desimal) => desimalKeKataEn(`${bulat}.${desimal}`));

  // 9. Sisa angka.
  hasil = hasil.replace(/\b\d+\b/g, (cocok) => angkaKeKataEn(cocok));

  // 10. Kembalikan hasil ejaan digit.
  penampungEjaan.forEach((teksEjaan, indeks) => {
    // Pakai fungsi pengganti agar karakter khusus (mis. `$`) pada hasil ejaan tidak ditafsirkan.
    hasil = hasil.replace(buatPenanda(indeks), () => teksEjaan);
  });

  // 11. Bersihkan sisa penanda (jaga-jaga) dan rapikan spasi.
  hasil = hasil.replace(/[\uE000\uE001]/g, " ");

  return hasil.replace(/\s+/g, " ").trim();
}

/* -------------------------------------------------------------------------- */
/* Bagian 5 — Deteksi bahasa otomatis                                          */
/* -------------------------------------------------------------------------- */

import {
  hitungKeyakinanBahasa,
  type HasilDeteksiBahasa
} from "../src/domain/deteksiBahasa";

/**
 * Menebak bahasa dominan pada sebuah teks.
 *
 * Implementasi aslinya berada di `src/domain/deteksiBahasa.ts` supaya logika
 * yang dipakai browser dan server persis sama. Versi lama di berkas ini punya
 * bug yang membuat pengenalan suara Bahasa Indonesia rusak — lihat komentar
 * panjang di modul domain tersebut.
 *
 * Dipakai untuk fitur "auto switch": kalau pengguna berbicara bahasa Inggris,
 * mesin TTS otomatis memakai `lang="en"`, dan sebaliknya.
 */
export function deteksiBahasa(teks: string): "id" | "en" {
  return nilaiKeyakinanBahasa(teks).bahasa;
}

/**
 * Versi lengkap: mengembalikan skor kedua bahasa beserta tingkat keyakinannya,
 * sehingga pemanggil bisa menolak mengunci bahasa ketika buktinya lemah.
 */
export function nilaiKeyakinanBahasa(teks: string): HasilDeteksiBahasa {
  return hitungKeyakinanBahasa(teks);
}

/** Mode bahasa TTS yang bisa dipilih pengguna di panel pengaturan. */
export type ModeBahasaTts = "auto" | "id" | "en";

/**
 * Fungsi utama: siapkan teks untuk TTS.
 * Mengembalikan teks yang sudah dinormalisasi beserta bahasa yang dipakai.
 */
export function siapkanTeksTts(
  teks: string,
  mode: ModeBahasaTts = "auto"
): { text: string; lang: "id" | "en"; original: string } {
  const bersih = teks.replace(/\s+/g, " ").trim();
  const lang = mode === "auto" ? deteksiBahasa(bersih) : mode;
  const text = lang === "id" ? normalisasiTeksId(bersih) : normalisasiTeksEn(bersih);
  return { text, lang, original: bersih };
}
