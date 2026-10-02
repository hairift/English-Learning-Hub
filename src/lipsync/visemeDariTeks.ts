/**
 * visemeDariTeks.ts — pembuat gerakan mulut dari TEKS (mode cadangan).
 *
 * Dipakai ketika analisis audio tidak tersedia, misalnya:
 * - audio bot berasal dari WebRTC dan browser menolak analisis,
 * - pengguna memakai mode mock tanpa berkas audio,
 * - audio gagal diputar karena kebijakan autoplay.
 *
 * Hasilnya bukan lip sync akurat seperti analisis audio, tetapi cukup membuat
 * avatar terlihat "berbicara" dan tetap terasa hidup.
 */

import { perbaruiLipsync, setelLipsyncDiam, type BobotViseme } from "./lipsyncStore";

/** Pemetaan huruf vokal ke viseme utama. */
const VISEME_VOKAL: Record<string, keyof BobotViseme> = {
  a: "a",
  i: "i",
  y: "i",
  u: "u",
  w: "u",
  e: "e",
  o: "o"
};

/** Viseme netral untuk huruf mati (konsonan). */
const VISEME_KONSONAN: BobotViseme = { a: 0.12, i: 0.04, u: 0.04, e: 0.18, o: 0.06 };

/** Membuat satu bingkai viseme dengan satu vokal dominan. */
function buatViseme(vokal: keyof BobotViseme, kekuatan = 0.85): BobotViseme {
  return {
    a: vokal === "a" ? kekuatan : 0.04,
    i: vokal === "i" ? kekuatan : 0.04,
    u: vokal === "u" ? kekuatan : 0.04,
    e: vokal === "e" ? kekuatan : 0.04,
    o: vokal === "o" ? kekuatan : 0.04
  };
}

/**
 * Memperkirakan durasi bicara dari panjang teks.
 * Rata-rata manusia berbicara sekitar 2,6 kata per detik.
 */
export function perkirakanDurasiMs(teks: string): number {
  const jumlahKata = teks.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(900, (jumlahKata / 2.6) * 1000);
}

/** Menyusun rangkaian bingkai viseme dari teks. */
export function susunBingkaiViseme(teks: string): Array<{ viseme: BobotViseme; durasiMs: number }> {
  const huruf = teks
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split("");

  const bingkai: Array<{ viseme: BobotViseme; durasiMs: number }> = [];
  const durasiTotal = perkirakanDurasiMs(teks);
  const durasiPerHuruf = durasiTotal / Math.max(1, huruf.length);

  for (const karakter of huruf) {
    if (karakter === " ") {
      // Jeda singkat antar kata: mulut menutup.
      bingkai.push({ viseme: { a: 0, i: 0, u: 0, e: 0, o: 0 }, durasiMs: durasiPerHuruf * 1.4 });
      continue;
    }
    const vokal = VISEME_VOKAL[karakter];
    bingkai.push({
      viseme: vokal ? buatViseme(vokal) : VISEME_KONSONAN,
      durasiMs: durasiPerHuruf
    });
  }

  return bingkai;
}

/**
 * Menjalankan animasi mulut dari teks.
 * Mengembalikan fungsi untuk menghentikan animasi lebih awal.
 */
export function mulaiVisemeDariTeks(teks: string, onSelesai?: () => void): () => void {
  const bingkai = susunBingkaiViseme(teks);
  if (!bingkai.length) {
    setelLipsyncDiam();
    onSelesai?.();
    return () => undefined;
  }

  let indeks = 0;
  let waktuMulai = performance.now();
  let idAnimasi: number | null = null;
  let dihentikan = false;

  const langkah = () => {
    if (dihentikan) return;
    const sekarang = performance.now();
    const berjalan = sekarang - waktuMulai;

    while (indeks < bingkai.length && berjalan >= bingkai[indeks].durasiMs) {
      waktuMulai += bingkai[indeks].durasiMs;
      indeks += 1;
    }

    if (indeks >= bingkai.length) {
      setelLipsyncDiam();
      idAnimasi = null;
      onSelesai?.();
      return;
    }

    const bingkaiAktif = bingkai[indeks];
    perbaruiLipsync({
      viseme: bingkaiAktif.viseme,
      kebukaan: Math.min(1, Math.max(...Object.values(bingkaiAktif.viseme)) * 1.1),
      bersuara: true,
      sumber: "teks"
    });

    idAnimasi = requestAnimationFrame(langkah);
  };

  idAnimasi = requestAnimationFrame(langkah);

  return () => {
    dihentikan = true;
    if (idAnimasi !== null) cancelAnimationFrame(idAnimasi);
    idAnimasi = null;
    setelLipsyncDiam();
  };
}
