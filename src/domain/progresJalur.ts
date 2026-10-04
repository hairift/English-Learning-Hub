/**
 * Logika progres jalur belajar: level mana yang terbuka, mana yang terkunci,
 * dan bagaimana kemajuan dicatat.
 *
 * Aturan kunci-terbuka sengaja sederhana dan dapat diprediksi:
 * - Level pertama selalu terbuka.
 * - Sebuah level terbuka setelah level SEBELUMNYA (dalam urutan kurikulum)
 *   dinyatakan selesai.
 *
 * Aturan ini sama dengan yang dipakai aplikasi belajar bahasa populer, dan
 * penting supaya pengguna tidak bisa melompat ke materi yang belum siap.
 */

import { daftarLevelBerurutan, type LevelJalur, type UnitJalur } from "./jalurBelajar";

/** Satu level yang sudah diselesaikan pengguna. */
export interface LevelSelesai {
  idLevel: string;
  /** Waktu penyelesaian dalam ISO string. */
  selesaiPada: string;
  /** Jumlah jawaban benar. */
  benar: number;
  /** Jumlah soal seluruhnya. */
  total: number;
  /** XP yang diperoleh. */
  xp: number;
}

/** Seluruh kemajuan pengguna pada jalur belajar. */
export interface ProgresJalur {
  levelSelesai: LevelSelesai[];
  /** XP total yang dikumpulkan dari jalur belajar. */
  xpTotal: number;
}

export function buatProgresKosong(): ProgresJalur {
  return { levelSelesai: [], xpTotal: 0 };
}

/**
 * Status sebuah level bagi pengguna.
 * - `selesai`  : sudah lulus
 * - `terbuka`  : belum lulus, tapi boleh dikerjakan sekarang
 * - `terkunci` : harus menyelesaikan level sebelumnya dulu
 */
export type StatusLevel = "selesai" | "terbuka" | "terkunci";

/** Satu level beserta statusnya, siap ditampilkan di peta jalur. */
export interface LevelBerstatus {
  unit: UnitJalur;
  level: LevelJalur;
  indeks: number;
  status: StatusLevel;
  /** Nilai terbaik bila sudah selesai (0–100). */
  nilai: number | null;
}

/**
 * Hitung status setiap level berdasarkan kemajuan pengguna.
 *
 * Fungsi ini murni: diberikan progres yang sama, hasilnya selalu sama. Itu
 * membuatnya mudah diuji dan aman dipanggil berkali-kali saat render.
 */
export function hitungStatusLevel(progres: ProgresJalur): LevelBerstatus[] {
  const berurutan = daftarLevelBerurutan();
  const sudahSelesai = new Map(progres.levelSelesai.map((item) => [item.idLevel, item]));

  return berurutan.map((item, posisi) => {
    const catatan = sudahSelesai.get(item.level.id);
    if (catatan) {
      return {
        unit: item.unit,
        level: item.level,
        indeks: item.indeks,
        status: "selesai" as const,
        nilai: catatan.total > 0 ? Math.round((catatan.benar / catatan.total) * 100) : 100
      };
    }

    // Level pertama selalu terbuka; selebihnya butuh level sebelumnya selesai.
    const sebelumnya = posisi === 0 ? null : berurutan[posisi - 1];
    const bolehDibuka = posisi === 0 || Boolean(sebelumnya && sudahSelesai.has(sebelumnya.level.id));

    return {
      unit: item.unit,
      level: item.level,
      indeks: item.indeks,
      status: bolehDibuka ? ("terbuka" as const) : ("terkunci" as const),
      nilai: null
    };
  });
}

/**
 * Catat penyelesaian sebuah level.
 *
 * Menyelesaikan level yang sama dua kali tidak menggandakan XP: catatan lama
 * diganti, dan XP total dihitung ulang dari seluruh catatan. Ini mencegah
 * pengguna menumpuk XP dengan mengulang level termudah.
 */
export function catatLevelSelesai(
  progres: ProgresJalur,
  masukan: { idLevel: string; benar: number; total: number; xp: number; waktu?: string }
): ProgresJalur {
  const waktu = masukan.waktu ?? new Date().toISOString();
  const catatanBaru: LevelSelesai = {
    idLevel: masukan.idLevel,
    selesaiPada: waktu,
    benar: masukan.benar,
    total: masukan.total,
    xp: masukan.xp
  };

  const lain = progres.levelSelesai.filter((item) => item.idLevel !== masukan.idLevel);
  const levelSelesai = [...lain, catatanBaru];

  return {
    levelSelesai,
    xpTotal: levelSelesai.reduce((total, item) => total + item.xp, 0)
  };
}

/** Level berikutnya yang sebaiknya dikerjakan pengguna. */
export function levelBerikutnya(progres: ProgresJalur): LevelBerstatus | null {
  const semua = hitungStatusLevel(progres);
  return semua.find((item) => item.status === "terbuka") ?? null;
}

/** Berapa level yang sudah selesai, untuk ditampilkan sebagai kemajuan. */
export function ringkasJalur(progres: ProgresJalur): {
  selesai: number;
  total: number;
  persen: number;
} {
  const total = daftarLevelBerurutan().length;
  const selesai = progres.levelSelesai.length;
  return {
    selesai,
    total,
    persen: total === 0 ? 0 : Math.round((selesai / total) * 100)
  };
}

/**
 * Susun ulang data lama agar aman dipakai.
 *
 * Data dari localStorage bisa saja rusak atau berasal dari versi aplikasi yang
 * lebih tua, jadi setiap medan diperiksa sebelum dipakai.
 */
export function normalkanProgres(nilai: unknown): ProgresJalur {
  if (!nilai || typeof nilai !== "object") return buatProgresKosong();
  const mentah = nilai as Partial<ProgresJalur>;
  const daftar = Array.isArray(mentah.levelSelesai) ? mentah.levelSelesai : [];
  const levelSelesai = daftar
    .filter(
      (item): item is LevelSelesai =>
        Boolean(item) &&
        typeof item.idLevel === "string" &&
        typeof item.benar === "number" &&
        typeof item.total === "number" &&
        typeof item.xp === "number"
    )
    .map((item) => ({
      idLevel: item.idLevel,
      selesaiPada: typeof item.selesaiPada === "string" ? item.selesaiPada : new Date().toISOString(),
      benar: item.benar,
      total: item.total,
      xp: item.xp
    }));

  return {
    levelSelesai,
    xpTotal: levelSelesai.reduce((total, item) => total + item.xp, 0)
  };
}
