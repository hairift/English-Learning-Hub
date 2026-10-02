// Salinan (copy) panduan belajar dua bahasa: Indonesia + Inggris.
// Catatan: seluruh ikon memakai komponen lucide-react, bukan emoji.

import {
  BarChart3,
  ClipboardCheck,
  Mic,
  Theater,
  type LucideIcon
} from "lucide-react";

export const HOME_COPY = {
  title: "Latihan berbicara 5 menit hari ini, sampaikan satu jawaban dengan jelas.",
  titleEn: "Practice 5 minutes today, deliver one clear answer.",
  subtitle:
    "AI akan bertanya terlebih dahulu, Anda cukup menjawab. Tidak perlu takut salah, sistem akan membantu mengevaluasi dan merangkum setelah latihan selesai.",
  subtitleEn:
    "AI asks first, just speak naturally. Mistakes are fine, the coach will review and guide you after the session.",
  startButton: "Mulai Latihan 5 Menit / Start 5-Min Practice",
  changeScene: "Ganti Skenario / Change Scenario",
  lastReport: "Lihat Laporan Terakhir / View Last Report",
  lowPressureNote:
    "Mode Bebas Tekanan: tidak ada hukuman nilai, hanya latihan langsung dan saran perkembangan."
};

/** Kartu keunggulan pada beranda. */
export const VALUE_CARDS: Array<{
  icon: LucideIcon;
  titleZh: string;
  descZh: string;
}> = [
  {
    icon: Theater,
    titleZh: "Tanya Jawab Realistis / Real Scenarios",
    descZh:
      "AI berperan sebagai pewawancara, rekan rapat, atau pelayan restoran seperti di dunia nyata."
  },
  {
    icon: Mic,
    titleZh: "Bicara Bebas Tekanan / Low-Pressure Speaking",
    descZh:
      "Cukup klik 'Mulai Latihan', sistem akan mendengarkan, mentranskripsi, dan membimbing Anda."
  },
  {
    icon: ClipboardCheck,
    titleZh: "Laporan Evaluasi Lengkap / Comprehensive Feedback",
    descZh:
      "Dapatkan analisis 7 dimensi: pengucapan, tata bahasa, kelancaran, dan target selanjutnya."
  },
  {
    icon: BarChart3,
    titleZh: "Pertumbuhan Berkelanjutan / Continuous Growth",
    descZh:
      "Lacak kebiasaan belajar harian dan lihat peningkatan skor berbicara Anda dari waktu ke waktu."
  }
];

export const REPORT_COPY = {
  nextRoundLabel: "Fokus Latihan Selanjutnya / Next Practice Focus",
  bestFixLabel: "Kalimat Utama yang Perlu Diperbaiki / Priority Sentence Fix",
  replayLabel: "Rekomendasi Latihan Ulang / Recommended Drill Sentence",
  dimensionsLabel: "7 Dimensi Kemampuan / 7 Ability Dimensions"
};
