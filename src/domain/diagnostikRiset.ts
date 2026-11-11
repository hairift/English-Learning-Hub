import type { ReportResult } from "../../shared/schemas";
import type { TipeSoal } from "./jalurBelajar";

export type AspekKemampuan = "grammar" | "listening" | "speaking" | "vocabulary";
export type KategoriKemampuan = AspekKemampuan;

export interface CatatanAspek {
  percobaan: number;
  benar: number;
  salah: number;
  skorKumulatif: number;
}

export interface ProfilMahasiswa {
  nama: string;
  nim: string;
  prodi: string;
  semester: string;
  fokusRiset?: string;
  targetHarianXp: number;
  sudahOnboarding: boolean;
}

export interface CatatanKesalahanRiset {
  id: string;
  waktu: string;
  tanggal: string;
  aspek: AspekKemampuan;
  kategori: AspekKemampuan;
  pertanyaan: string;
  jawabanPengguna: string;
  jawabanBenar: string;
}

export interface DataDiagnostikRiset {
  aspek: Record<AspekKemampuan, CatatanAspek>;
  riwayatKesalahan: CatatanKesalahanRiset[];
  terakhirDiperbarui?: string;
}

export const PROFIL_DEFAULT: ProfilMahasiswa = {
  nama: "Mahasiswa UCIC",
  nim: "2024102001",
  prodi: "Teknik Informatika",
  semester: "3",
  fokusRiset: "Pemetaan Kelemahan Bahasa Inggris Mahasiswa",
  targetHarianXp: 30,
  sudahOnboarding: false
};

export function buatProfilDefault(): ProfilMahasiswa {
  return { ...PROFIL_DEFAULT };
}

export function normalkanProfil(nilai: unknown): ProfilMahasiswa {
  const dasar = buatProfilDefault();
  if (!nilai || typeof nilai !== "object") return dasar;
  const mentah = nilai as Partial<ProfilMahasiswa>;
  return {
    nama: typeof mentah.nama === "string" && mentah.nama.trim() ? mentah.nama.trim() : dasar.nama,
    nim: typeof mentah.nim === "string" && mentah.nim.trim() ? mentah.nim.trim() : dasar.nim,
    prodi: typeof mentah.prodi === "string" && mentah.prodi.trim() ? mentah.prodi.trim() : dasar.prodi,
    semester: typeof mentah.semester === "string" && mentah.semester.trim() ? mentah.semester.trim() : dasar.semester,
    fokusRiset: typeof mentah.fokusRiset === "string" ? mentah.fokusRiset : dasar.fokusRiset,
    targetHarianXp: typeof mentah.targetHarianXp === "number" ? mentah.targetHarianXp : dasar.targetHarianXp,
    sudahOnboarding: Boolean(mentah.sudahOnboarding)
  };
}

export function buatDiagnostikKosong(): DataDiagnostikRiset {
  return {
    aspek: {
      grammar: { percobaan: 0, benar: 0, salah: 0, skorKumulatif: 0 },
      listening: { percobaan: 0, benar: 0, salah: 0, skorKumulatif: 0 },
      speaking: { percobaan: 0, benar: 0, salah: 0, skorKumulatif: 0 },
      vocabulary: { percobaan: 0, benar: 0, salah: 0, skorKumulatif: 0 }
    },
    riwayatKesalahan: [],
    terakhirDiperbarui: new Date().toISOString()
  };
}

export function petakanTipeSoalKeAspek(
  tipe: TipeSoal,
  kategoriEksplisit?: AspekKemampuan
): AspekKemampuan {
  if (kategoriEksplisit) return kategoriEksplisit;
  if (tipe === "dengar-ketik") return "listening";
  if (tipe === "cocokkan-kata" || tipe === "cocokkan-pasangan" || tipe === "pilih-terjemahan") {
    return "vocabulary";
  }
  return "grammar";
}

export function catatPercobaanKuis(
  data: DataDiagnostikRiset,
  masukan: {
    aspek?: AspekKemampuan;
    kategori?: AspekKemampuan;
    benar: boolean;
    pertanyaan: string;
    jawabanPengguna: string;
    jawabanBenar: string;
  }
): DataDiagnostikRiset {
  const kunci: AspekKemampuan = masukan.kategori ?? masukan.aspek ?? "grammar";
  const lama = data.aspek[kunci] ?? { percobaan: 0, benar: 0, salah: 0, skorKumulatif: 0 };
  const benarBaru = lama.benar + (masukan.benar ? 1 : 0);
  const salahBaru = (lama.salah ?? Math.max(0, lama.percobaan - lama.benar)) + (masukan.benar ? 0 : 1);
  const percobaanBaru = benarBaru + salahBaru;
  const skorBaru = Math.round((benarBaru / Math.max(1, percobaanBaru)) * 100);
  const waktuSekarang = new Date().toISOString();

  const kesalahanBaru = masukan.benar
    ? data.riwayatKesalahan
    : [
        {
          id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          waktu: waktuSekarang,
          tanggal: waktuSekarang,
          aspek: kunci,
          kategori: kunci,
          pertanyaan: masukan.pertanyaan,
          jawabanPengguna: masukan.jawabanPengguna,
          jawabanBenar: masukan.jawabanBenar
        },
        ...data.riwayatKesalahan
      ].slice(0, 25);

  return {
    aspek: {
      ...data.aspek,
      [kunci]: {
        percobaan: percobaanBaru,
        benar: benarBaru,
        salah: salahBaru,
        skorKumulatif: skorBaru
      }
    },
    riwayatKesalahan: kesalahanBaru,
    terakhirDiperbarui: waktuSekarang
  };
}

export function catatHasilSpeaking(
  data: DataDiagnostikRiset,
  masukan: {
    skorSpeaking: number;
    skorGrammar: number;
    skorListening: number;
    skorKosakata: number;
  }
): DataDiagnostikRiset {
  function tambahSkor(lama: CatatanAspek, skor: number): CatatanAspek {
    const lulus = skor >= 70;
    const benar = lama.benar + (lulus ? 1 : 0);
    const salah = (lama.salah ?? Math.max(0, lama.percobaan - lama.benar)) + (lulus ? 0 : 1);
    const percobaan = benar + salah;
    const skorKumulatif = Math.round((benar / Math.max(1, percobaan)) * 100);
    return { percobaan, benar, salah, skorKumulatif };
  }

  return {
    ...data,
    aspek: {
      grammar: tambahSkor(data.aspek.grammar, masukan.skorGrammar),
      listening: tambahSkor(data.aspek.listening, masukan.skorListening),
      speaking: tambahSkor(data.aspek.speaking, masukan.skorSpeaking),
      vocabulary: tambahSkor(data.aspek.vocabulary, masukan.skorKosakata)
    },
    terakhirDiperbarui: new Date().toISOString()
  };
}

export function catatDiagnostikLaporanBicara(
  data: DataDiagnostikRiset,
  laporan: ReportResult
): DataDiagnostikRiset {
  const cariSkor = (id: string, cadangan: number) =>
    laporan.dimensions.find((d) => d.id === id)?.score ?? cadangan;

  return catatHasilSpeaking(data, {
    skorGrammar: cariSkor("grammar", laporan.totalScore),
    skorKosakata: cariSkor("vocabulary", laporan.totalScore),
    skorSpeaking: Math.round(
      (cariSkor("fluency", laporan.totalScore) + cariSkor("pronunciation", laporan.totalScore)) / 2
    ),
    skorListening: Math.round(
      (cariSkor("interaction", laporan.totalScore) + cariSkor("coherence", laporan.totalScore)) / 2
    )
  });
}

export interface RingkasanAspekRiset {
  kategori: AspekKemampuan;
  id: AspekKemampuan;
  labelId: string;
  labelEn: string;
  skor: number;
  totalPercobaan: number;
  benar: number;
  salah: number;
  level: "perlu-bimbingan" | "cukup" | "kuat";
  rekomendasi: string;
}

const META_KATEGORI: Record<
  AspekKemampuan,
  { labelId: string; labelEn: string; saranRendah: string; saranTinggi: string }
> = {
  grammar: {
    labelId: "Tata Bahasa (Grammar)",
    labelEn: "Grammar & Sentence Structure",
    saranRendah:
      "Perkuat pola kalimat Simple Present, Past Tense, serta pemilihan kata kerja bantu (am/is/are, have/has, modals).",
    saranTinggi:
      "Penguasaan struktur kalimat sudah stabil. Lanjutkan dengan latihan kalimat kompleks dan negosiasi profesional."
  },
  listening: {
    labelId: "Menyimak (Listening)",
    labelEn: "Listening Comprehension",
    saranRendah:
      "Gunakan tombol kura-kura (0.6x) pada kuis dengar untuk melatih kepekaan bunyi kata sambung bahasa Inggris.",
    saranTinggi:
      "Kemampuan menangkap ucapan bahasa Inggris sangat baik. Tantang dirimu dengan dialog cepat tanpa teks."
  },
  speaking: {
    labelId: "Berbicara (Speaking)",
    labelEn: "Speaking & Pronunciation",
    saranRendah:
      "Latih pelafalan dan kelancaran bicara bersama Tutor 3D Sela minimal 5 menit sehari dengan struktur Result -> Action -> Impact.",
    saranTinggi:
      "Kelancaran dan kepercayaan diri berbicara sudah kuat. Pertahankan intonasi dan ekspresi profesional."
  },
  vocabulary: {
    labelId: "Kosakata (Vocabulary)",
    labelEn: "Academic & Career Vocabulary",
    saranRendah:
      "Rutin ulas kartu kosakata harian (SRS) dan buka Buku Panduan di setiap unit sebelum memulai kuis.",
    saranTinggi:
      "Perbendaharaan kosakata sudah luas. Mulai terapkan kosakata tingkat B2/C1 dalam percakapan langsung."
  }
};

export function buatRingkasanDiagnostik(data: DataDiagnostikRiset): {
  daftar: RingkasanAspekRiset[];
  terlemah: RingkasanAspekRiset;
  terkuat: RingkasanAspekRiset;
  rataRata: number;
  totalSemuaPercobaan: number;
  rekomendasiUtama: string;
} {
  const urutan: AspekKemampuan[] = ["grammar", "listening", "speaking", "vocabulary"];
  const daftar: RingkasanAspekRiset[] = urutan.map((kat) => {
    const mentah = data.aspek[kat] ?? { percobaan: 0, benar: 0, salah: 0, skorKumulatif: 0 };
    const salah = mentah.salah ?? Math.max(0, mentah.percobaan - mentah.benar);
    const total = mentah.benar + salah;
    const skor = total > 0 ? Math.round((mentah.benar / total) * 100) : 65;
    const level: RingkasanAspekRiset["level"] =
      skor < 65 ? "perlu-bimbingan" : skor < 82 ? "cukup" : "kuat";
    const meta = META_KATEGORI[kat];
    return {
      kategori: kat,
      id: kat,
      labelId: meta.labelId,
      labelEn: meta.labelEn,
      skor,
      totalPercobaan: total,
      benar: mentah.benar,
      salah,
      level,
      rekomendasi: skor < 78 ? meta.saranRendah : meta.saranTinggi
    };
  });

  const terurut = [...daftar].sort((a, b) => a.skor - b.skor);
  const terlemah = terurut[0];
  const terkuat = terurut[terurut.length - 1];
  const rataRata = Math.round(daftar.reduce((sum, item) => sum + item.skor, 0) / daftar.length);
  const totalSemuaPercobaan = daftar.reduce((sum, item) => sum + item.totalPercobaan, 0);

  const rekomendasiUtama =
    totalSemuaPercobaan === 0
      ? "Mulai kerjakan 1 level kuis atau 1 sesi ngobrol AI untuk memetakan kekuatan dan kelemahan bahasa Inggrismu secara otomatis."
      : `Berdasarkan ${totalSemuaPercobaan} sampel latihan, fokus perbaikan utama ada pada ${terlemah.labelId} (${terlemah.skor}%). ${terlemah.rekomendasi}`;

  return {
    daftar,
    terlemah,
    terkuat,
    rataRata,
    totalSemuaPercobaan,
    rekomendasiUtama
  };
}

export function normalkanDiagnostik(nilai: unknown): DataDiagnostikRiset {
  const kosong = buatDiagnostikKosong();
  if (!nilai || typeof nilai !== "object") return kosong;
  const mentah = nilai as Partial<DataDiagnostikRiset>;
  const aspekMentah = (mentah.aspek ?? {}) as Partial<Record<AspekKemampuan, Partial<CatatanAspek>>>;

  const bacaSatu = (kunci: AspekKemampuan): CatatanAspek => {
    const item = aspekMentah[kunci];
    if (!item || typeof item !== "object") {
      return { percobaan: 0, benar: 0, salah: 0, skorKumulatif: 0 };
    }
    const benar = typeof item.benar === "number" ? Math.max(0, Math.round(item.benar)) : 0;
    const salah =
      typeof item.salah === "number"
        ? Math.max(0, Math.round(item.salah))
        : typeof item.percobaan === "number"
          ? Math.max(0, Math.round(item.percobaan) - benar)
          : 0;
    const percobaan = benar + salah;
    const skorKumulatif = percobaan > 0 ? Math.round((benar / percobaan) * 100) : 0;
    return { percobaan, benar, salah, skorKumulatif };
  };

  return {
    aspek: {
      grammar: bacaSatu("grammar"),
      listening: bacaSatu("listening"),
      speaking: bacaSatu("speaking"),
      vocabulary: bacaSatu("vocabulary")
    },
    riwayatKesalahan: Array.isArray(mentah.riwayatKesalahan)
      ? mentah.riwayatKesalahan.slice(0, 25)
      : [],
    terakhirDiperbarui:
      typeof mentah.terakhirDiperbarui === "string"
        ? mentah.terakhirDiperbarui
        : kosong.terakhirDiperbarui
  };
}

export function eksporCsvRiset(profil: ProfilMahasiswa, data: DataDiagnostikRiset): string {
  const ringkasan = buatRingkasanDiagnostik(data);
  const barisHeader = [
    "Nama Mahasiswa",
    "NIM",
    "Program Studi",
    "Semester",
    "Aspek Kemampuan",
    "Skor Akurasi (%)",
    "Jawaban Benar",
    "Jawaban Salah",
    "Total Percobaan",
    "Kategori Penguasaan"
  ].join(",");

  const barisData = ringkasan.daftar.map((item) =>
    [
      `"${profil.nama.replace(/"/g, '""')}"`,
      `"${profil.nim.replace(/"/g, '""')}"`,
      `"${profil.prodi.replace(/"/g, '""')}"`,
      `"${profil.semester}"`,
      `"${item.labelId}"`,
      item.skor,
      item.benar,
      item.salah,
      item.totalPercobaan,
      `"${item.level}"`
    ].join(",")
  );

  return [barisHeader, ...barisData].join("\n");
}
