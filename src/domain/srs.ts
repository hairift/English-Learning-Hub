/**
 * Placement test dan sistem pengulangan berjadwal (SRS).
 *
 * Dua bagian:
 *
 * 1. **Placement test** — serangkaian soal bertingkat untuk menebak tingkat
 *    CEFR pengguna (A1–C1). Soal disusun dari mudah ke sulit; begitu pengguna
 *    salah beberapa kali berturut-turut pada satu tingkat, tes berhenti dan
 *    tingkat terakhir yang dikuasai dipakai sebagai hasil.
 *
 * 2. **SRS (Spaced Repetition System)** — penjadwalan pengulangan kosakata
 *    berbasis kurva lupa. Setiap butir punya tingkat penguasaan (0–5) dan
 *    tanggal jatuh tempo. Jawaban benar menaikkan tingkat (interval makin
 *    panjang), jawaban salah menurunkannya (muncul lagi besok).
 */

import type { Kosakata, TingkatCefr } from "./jalurBelajar";
import { getShanghaiDate } from "./checkin";

/* ============================ PLACEMENT TEST ============================ */

/** Satu soal placement test. */
export interface SoalPenempatan {
  id: string;
  tingkat: TingkatCefr;
  pertanyaan: string;
  pilihan: string[];
  jawaban: string;
}

/**
 * Bank soal penempatan, dikelompokkan per tingkat.
 * Setiap tes mengambil soal dari tiap tingkat secara berurutan.
 */
export const BANK_PENEMPATAN: SoalPenempatan[] = [
  // ---- A1 ----
  {
    id: "pt-a1-1",
    tingkat: "A1",
    pertanyaan: "____ name is Rina.",
    pilihan: ["My", "I", "Me"],
    jawaban: "My"
  },
  {
    id: "pt-a1-2",
    tingkat: "A1",
    pertanyaan: "She ____ a doctor.",
    pilihan: ["is", "are", "am"],
    jawaban: "is"
  },
  {
    id: "pt-a1-3",
    tingkat: "A1",
    pertanyaan: "What is the meaning of 'breakfast'?",
    pilihan: ["sarapan", "makan malam", "minuman"],
    jawaban: "sarapan"
  },
  // ---- A2 ----
  {
    id: "pt-a2-1",
    tingkat: "A2",
    pertanyaan: "I ____ to work by bus every day.",
    pilihan: ["go", "goes", "going"],
    jawaban: "go"
  },
  {
    id: "pt-a2-2",
    tingkat: "A2",
    pertanyaan: "She ____ comes early, but today she is late.",
    pilihan: ["always", "never", "rarely"],
    jawaban: "always"
  },
  {
    id: "pt-a2-3",
    tingkat: "A2",
    pertanyaan: "The deadline is tomorrow. What does 'deadline' mean?",
    pilihan: ["tenggat", "jadwal", "catatan"],
    jawaban: "tenggat"
  },
  // ---- B1 ----
  {
    id: "pt-b1-1",
    tingkat: "B1",
    pertanyaan: "I ____ in this company for three years.",
    pilihan: ["have worked", "work", "working"],
    jawaban: "have worked"
  },
  {
    id: "pt-b1-2",
    tingkat: "B1",
    pertanyaan: "We achieved the target ____.",
    pilihan: ["last month", "next month", "every month"],
    jawaban: "last month"
  },
  {
    id: "pt-b1-3",
    tingkat: "B1",
    pertanyaan: "If I had more time, I ____ join the course.",
    pilihan: ["would", "will", "am"],
    jawaban: "would"
  },
  // ---- B2 ----
  {
    id: "pt-b2-1",
    tingkat: "B2",
    pertanyaan: "____ it was difficult, we finished the project.",
    pilihan: ["Although", "However", "Because"],
    jawaban: "Although"
  },
  {
    id: "pt-b2-2",
    tingkat: "B2",
    pertanyaan: "The report ____ by the finance team last week.",
    pilihan: ["was written", "wrote", "is writing"],
    jawaban: "was written"
  },
  {
    id: "pt-b2-3",
    tingkat: "B2",
    pertanyaan: "In a debate, 'evidence' means ____.",
    pilihan: ["bukti", "pendapat", "kesimpulan"],
    jawaban: "bukti"
  },
  // ---- C1 ----
  {
    id: "pt-c1-1",
    tingkat: "C1",
    pertanyaan: "We should ____ the risk before launching the product.",
    pilihan: ["mitigate", "celebrate", "ignore"],
    jawaban: "mitigate"
  },
  {
    id: "pt-c1-2",
    tingkat: "C1",
    pertanyaan: "The plan is not ____ given the current budget.",
    pilihan: ["feasible", "possible to see", "visible"],
    jawaban: "feasible"
  },
  {
    id: "pt-c1-3",
    tingkat: "C1",
    pertanyaan: "'Stakeholders' refers to ____.",
    pilihan: ["pemangku kepentingan", "para pesaing", "para pelanggan setia"],
    jawaban: "pemangku kepentingan"
  }
];

/** Tingkat dalam urutan kemudahan. */
export const URUTAN_TINGKAT: TingkatCefr[] = ["A1", "A2", "B1", "B2", "C1"];

/** Hasil sebuah placement test. */
export interface HasilPenempatan {
  tingkat: TingkatCefr;
  /** Jumlah benar per tingkat, dipakai untuk menjelaskan hasil ke pengguna. */
  rincian: Array<{ tingkat: TingkatCefr; benar: number; total: number }>;
  /** Kalimat ringkas yang bisa langsung ditampilkan. */
  ringkasan: string;
}

/**
 * Nilai hasil placement test.
 *
 * Aturannya: telusuri tingkat dari A1 ke atas. Tingkat tertinggi yang benar
 * SEMUA soalnya (atau minimal 2 dari 3) dianggap tingkat pengguna. Bila tidak
 * ada tingkat yang lolos, hasilnya A1.
 */
export function nilaiPenempatan(jawaban: Record<string, string>): HasilPenempatan {
  const rincian = URUTAN_TINGKAT.map((tingkat) => {
    const soal = BANK_PENEMPATAN.filter((item) => item.tingkat === tingkat);
    const benar = soal.filter((item) => jawaban[item.id] === item.jawaban).length;
    return { tingkat, benar, total: soal.length };
  });

  let tingkat: TingkatCefr = "A1";
  for (const baris of rincian) {
    // Butuh minimal dua pertiga benar agar sebuah tingkat dianggap dikuasai.
    const ambang = Math.ceil(baris.total * 0.67);
    if (baris.benar >= ambang) tingkat = baris.tingkat;
    else break;
  }

  const deskripsi: Record<TingkatCefr, string> = {
    A1: "Pemula — mulai dari sapaan dan kalimat dasar.",
    A2: "Dasar — sudah bisa rutinitas harian dan kalimat sederhana.",
    B1: "Menengah — mampu membahas pekerjaan dan pengalaman.",
    B2: "Menengah atas — bisa berargumen dan memakai kalimat kompleks.",
    C1: "Mahir — siap presentasi dan negosiasi profesional."
  };

  return { tingkat, rincian, ringkasan: deskripsi[tingkat] };
}

/* ================================ SRS ================================ */

/** Satu kartu pengulangan. */
export interface KartuSrs {
  /** Kunci unik kartu (biasanya kata bahasa Inggrisnya). */
  id: string;
  kosakata: Kosakata;
  /** Tingkat penguasaan 0–5, makin tinggi makin lama intervalnya. */
  tingkat: number;
  /** Tanggal jatuh tempo berikutnya (YYYY-MM-DD). */
  jatuhTempo: string;
  /** Berapa kali kartu ini dijawab benar berturut-turut. */
  benarBerturut: number;
  /** Berapa kali kartu ini pernah salah. */
  jumlahSalah: number;
}

/**
 * Interval pengulangan (dalam hari) berdasarkan tingkat penguasaan.
 * Mengikuti gagasan kurva lupa: makin kuat ingatan, makin jarang diulang.
 */
export const INTERVAL_HARI = [0, 1, 2, 4, 8, 16, 32];

/** Buat kartu baru dari sebuah kosakata — jatuh tempo hari ini. */
export function buatKartu(kosakata: Kosakata, hariIni = getShanghaiDate()): KartuSrs {
  return {
    id: kosakata.en,
    kosakata,
    tingkat: 0,
    jatuhTempo: hariIni,
    benarBerturut: 0,
    jumlahSalah: 0
  };
}

/**
 * Perbarui kartu setelah dijawab.
 *
 * Benar  → tingkat naik satu langkah, jatuh tempo memakai interval baru.
 * Salah  → tingkat turun satu langkah (tidak di bawah 0), diulang besok.
 */
export function jawabKartu(
  kartu: KartuSrs,
  benar: boolean,
  hariIni = getShanghaiDate()
): KartuSrs {
  const tingkatBaru = benar
    ? Math.min(kartu.tingkat + 1, INTERVAL_HARI.length - 1)
    : Math.max(0, kartu.tingkat - 1);

  const jedaHari = benar ? INTERVAL_HARI[tingkatBaru] : 1;

  return {
    ...kartu,
    tingkat: tingkatBaru,
    benarBerturut: benar ? kartu.benarBerturut + 1 : 0,
    jumlahSalah: benar ? kartu.jumlahSalah : kartu.jumlahSalah + 1,
    jatuhTempo: tambahHari(hariIni, jedaHari)
  };
}

/** Tambahkan sejumlah hari pada tanggal YYYY-MM-DD. */
export function tambahHari(tanggal: string, hari: number): string {
  const ms = Date.parse(`${tanggal}T00:00:00+08:00`) + hari * 24 * 60 * 60 * 1000;
  return getShanghaiDate(new Date(ms));
}

/** Kartu yang sudah jatuh tempo hari ini (atau terlambat). */
export function kartuJatuhTempo(kartu: KartuSrs[], hariIni = getShanghaiDate()): KartuSrs[] {
  return kartu
    .filter((item) => item.jatuhTempo <= hariIni)
    .sort((a, b) => a.tingkat - b.tingkat || a.jatuhTempo.localeCompare(b.jatuhTempo));
}

/** Ringkasan penguasaan untuk ditampilkan di layar. */
export function ringkasSrs(kartu: KartuSrs[]): {
  total: number;
  dikuasai: number;
  perluDiulang: number;
  baru: number;
} {
  return {
    total: kartu.length,
    dikuasai: kartu.filter((item) => item.tingkat >= 4).length,
    perluDiulang: kartu.filter((item) => item.jumlahSalah > 0 && item.tingkat < 4).length,
    baru: kartu.filter((item) => item.tingkat === 0).length
  };
}

/**
 * Susun ulang data SRS agar aman dipakai.
 * Data localStorage bisa rusak atau berasal dari versi lama.
 */
export function normalkanSrs(nilai: unknown): KartuSrs[] {
  if (!Array.isArray(nilai)) return [];
  return nilai
    .filter((item): item is KartuSrs => {
      if (!item || typeof item !== "object") return false;
      const kartu = item as Partial<KartuSrs>;
      return (
        typeof kartu.id === "string" &&
        Boolean(kartu.kosakata) &&
        typeof (kartu.kosakata as Kosakata).en === "string" &&
        typeof (kartu.kosakata as Kosakata).id === "string"
      );
    })
    .map((item) => ({
      id: item.id,
      kosakata: { en: item.kosakata.en, id: item.kosakata.id, contoh: item.kosakata.contoh },
      tingkat: typeof item.tingkat === "number" ? Math.min(5, Math.max(0, item.tingkat)) : 0,
      jatuhTempo: typeof item.jatuhTempo === "string" ? item.jatuhTempo : getShanghaiDate(),
      benarBerturut: typeof item.benarBerturut === "number" ? Math.max(0, item.benarBerturut) : 0,
      jumlahSalah: typeof item.jumlahSalah === "number" ? Math.max(0, item.jumlahSalah) : 0
    }));
}
