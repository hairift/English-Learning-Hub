/**
 * growth.ts — ringkasan "Progres Belajar" yang dihitung dari data NYATA.
 *
 * Tidak ada satu pun angka contoh/dummy di modul ini. Semua nilai diturunkan
 * dari dua sumber yang benar-benar tersimpan di perangkat pengguna:
 *
 * 1. `LearningState` — riwayat sesi latihan (skor, dimensi, target berikutnya).
 * 2. `CheckinState`  — tanggal-tanggal latihan yang sudah diselesaikan.
 *
 * Karena dihitung ulang setiap kali salah satu sumber berubah (dan setiap
 * pergantian hari), panel Progres Belajar selalu menampilkan kondisi terkini.
 */

import { getRecentWeekDates, getShanghaiDate, type CheckinState } from "./checkin";
import { summarizeLearning, type LearningState } from "./learning";

/** Dipakai bila catatan lama belum menyimpan durasi sesi. */
export const MENIT_PER_SESI_DEFAULT = 5;

const SATU_HARI_MS = 24 * 60 * 60 * 1000;

/** Satu kotak hari pada baris progres mingguan. */
export type HariProgres = {
  /** Label singkat hari dalam bahasa Indonesia (Sen, Sel, Rab, ...). */
  label: string;
  /** Tanggal ISO `yyyy-mm-dd` menurut zona waktu Asia/Shanghai. */
  tanggal: string;
  /** True bila ada latihan yang diselesaikan pada tanggal tersebut. */
  selesai: boolean;
  /** True bila tanggal ini adalah hari ini. */
  hariIni: boolean;
};

/** Seluruh angka yang dibutuhkan panel Progres Belajar. */
export type RingkasanProgres = {
  /** Hari berturut-turut yang dihitung "hidup" sampai hari ini. */
  streakDays: number;
  /** Total menit latihan dari seluruh riwayat. */
  totalMinutes: number;
  /** Skor sesi terakhir (null bila belum ada latihan). */
  lastScore: number | null;
  /** Rata-rata skor seluruh sesi. */
  averageScore: number | null;
  /** Jumlah sesi latihan yang tercatat. */
  totalSessions: number;
  /** Jumlah hari latihan dalam 7 hari terakhir. */
  sessionsThisWeek: number;
  /** Dimensi dengan skor terendah (area yang perlu diasah). */
  weakArea: string | null;
  /** Dimensi dengan skor tertinggi. */
  strongArea: string | null;
  /** Target latihan berikutnya (saran teratas dari sesi terakhir). */
  nextGoal: string | null;
  /** Skenario yang terakhir dilatih. */
  lastScenario: string | null;
  /** Tiga skor terakhir, urut lama -> baru, untuk grafik tren. */
  trend: number[];
  /** Peta 7 hari terakhir. */
  week: HariProgres[];
  /** True bila sudah ada minimal satu sesi tercatat. */
  adaData: boolean;
  /** Pesan penyemangat yang menyesuaikan kondisi nyata. */
  pesan: string;
};

/** Ubah tanggal `yyyy-mm-dd` menjadi milidetik pada tengah malam Asia/Shanghai. */
function keMilidetik(tanggal: string): number {
  return Date.parse(`${tanggal}T00:00:00+08:00`);
}

/** Format milidetik menjadi tanggal `yyyy-mm-dd` di zona Asia/Shanghai. */
function keTanggal(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(ms));
}

/** Nama hari singkat berbahasa Indonesia untuk sebuah tanggal. */
function labelHari(tanggal: string): string {
  return new Intl.DateTimeFormat("id-ID", { weekday: "short", timeZone: "Asia/Shanghai" })
    .format(new Date(keMilidetik(tanggal)))
    .replace(/\./g, "");
}

/**
 * Hitung rentetan hari latihan yang masih "hidup".
 *
 * Aturan: rentetan dihitung mundur dari hari ini. Bila hari ini belum
 * berlatih, rantai masih dianggap hidup selama kemarin berlatih (memberi
 * kesempatan menyelesaikan sesi hari ini). Bila kemarin pun kosong, rentetan
 * dianggap putus dan bernilai 0.
 */
export function hitungStreakBeruntun(completedDates: string[], hariIni: string): number {
  const himpunan = new Set(completedDates);
  if (himpunan.size === 0) return 0;

  let kursor = keMilidetik(hariIni);
  if (!himpunan.has(keTanggal(kursor))) {
    kursor -= SATU_HARI_MS;
    if (!himpunan.has(keTanggal(kursor))) return 0;
  }

  let jumlah = 0;
  while (himpunan.has(keTanggal(kursor))) {
    jumlah += 1;
    kursor -= SATU_HARI_MS;
  }
  return jumlah;
}

/** Susun pesan penyemangat berdasarkan kondisi nyata pengguna. */
function susunPesan(input: { adaData: boolean; streakDays: number; hariIniSelesai: boolean }): string {
  if (!input.adaData) {
    return "Belum ada catatan latihan. Selesaikan satu sesi 5 menit untuk mulai melacak progres nyata.";
  }
  if (input.streakDays >= 3) {
    return `Luar biasa! ${input.streakDays} hari berturut-turut. Pertahankan ritmenya!`;
  }
  if (input.streakDays > 0) {
    return `${input.streakDays} hari beruntun. Lanjutkan besok agar rentetanmu tetap menyala!`;
  }
  if (input.hariIniSelesai) {
    return "Latihan hari ini selesai. Tambah satu sesi lagi untuk skor yang lebih tinggi!";
  }
  return "Ayo selesaikan satu sesi hari ini untuk menyalakan kembali rentetanmu.";
}

/**
 * Bangun ringkasan progres dari riwayat latihan dan catatan kehadiran.
 *
 * @param learning Riwayat sesi latihan pengguna.
 * @param checkin  Tanggal-tanggal latihan yang sudah diselesaikan.
 * @param hariIni  Tanggal acuan (`yyyy-mm-dd`); default hari ini di Asia/Shanghai.
 */
export function ringkasanProgres(
  learning: LearningState,
  checkin: CheckinState,
  hariIni: string = getShanghaiDate()
): RingkasanProgres {
  const catatan = learning.records ?? [];
  const tanggalSelesai = checkin.completedDates ?? [];
  const adaData = catatan.length > 0;
  const ringkasan = summarizeLearning(learning);

  const totalMinutes = catatan.reduce(
    (jumlah, item) => jumlah + (item.durationMinutes ?? MENIT_PER_SESI_DEFAULT),
    0
  );

  // Tiga skor terakhir, dibalik agar urut lama -> baru (kiri -> kanan).
  const trend = catatan
    .slice(0, 3)
    .map((item) => item.score)
    .reverse();

  const week = getRecentWeekDates(hariIni).map((tanggal) => ({
    label: labelHari(tanggal),
    tanggal,
    selesai: tanggalSelesai.includes(tanggal),
    hariIni: tanggal === hariIni
  }));

  return {
    streakDays: hitungStreakBeruntun(tanggalSelesai, hariIni),
    totalMinutes,
    lastScore: ringkasan.latestScore,
    averageScore: ringkasan.averageScore,
    totalSessions: ringkasan.totalSessions,
    sessionsThisWeek: week.filter((hari) => hari.selesai).length,
    weakArea: adaData ? ringkasan.priorityDimension : null,
    strongArea: adaData ? ringkasan.strongestDimension : null,
    nextGoal: catatan[0]?.nextGoal ?? null,
    lastScenario: catatan[0] ? `${catatan[0].scenarioNameZh} · ${catatan[0].scenarioNameEn}` : null,
    trend,
    week,
    adaData,
    pesan: susunPesan({
      adaData,
      streakDays: hitungStreakBeruntun(tanggalSelesai, hariIni),
      hariIniSelesai: tanggalSelesai.includes(hariIni)
    })
  };
}
