import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ConversationTurn, ReportResult } from "../shared/schemas";
import type { Scenario } from "../server/data";
import { ReportDashboard } from "../src/components/ReportDashboard";

const scenario: Scenario = {
  id: "interview",
  nameZh: "Wawancara Kerja",
  nameEn: "Interview",
  descriptionZh: "Latih menjelaskan pengalaman proyek dan menanggapi pertanyaan lanjutan.",
  tasks: []
};

const report: ReportResult = {
  reportId: "report_test",
  totalScore: 84,
  dimensions: [
    { id: "fluency", labelZh: "Kelancaran", labelEn: "Fluency", score: 85, explanationZh: "" },
    { id: "pronunciation", labelZh: "Kejelasan Pengucapan", labelEn: "Pronunciation", score: 82, explanationZh: "" },
    { id: "grammar", labelZh: "Akurasi Tata Bahasa", labelEn: "Grammar", score: 80, explanationZh: "" },
    { id: "vocabulary", labelZh: "Kosakata", labelEn: "Vocabulary", score: 84, explanationZh: "" },
    { id: "coherence", labelZh: "Koherensi", labelEn: "Coherence", score: 83, explanationZh: "" },
    { id: "task_completion", labelZh: "Penyelesaian Tugas", labelEn: "Task Completion", score: 88, explanationZh: "" },
    { id: "interaction", labelZh: "Interaksi", labelEn: "Interaction", score: 81, explanationZh: "" }
  ],
  summaryZh: "Secara keseluruhan jelas.",
  corrections: [
    {
      original: "I built campus navigation app.",
      improved: "I built a campus navigation app.",
      explanationZh: "Perlu menambahkan artikel \"a\"."
    }
  ],
  suggestions: ["Tambahkan satu angka di ronde berikutnya."],
  coachCommentZh: "Tata bahasa cukup stabil, tetapi ekspresinya terlalu umum. Tambahkan satu angka konkret di ronde berikutnya.",
  provider: "mock"
};

const turns: ConversationTurn[] = [
  {
    id: "turn_1",
    speaker: "user",
    text: "My role is about to improve the model and the UI style.",
    timestamp: "2026-06-06T12:00:00.000Z"
  }
];

describe("ReportDashboard", () => {
  it("renders the accepted one-screen report structure", () => {
    const markup = renderToStaticMarkup(
      <ReportDashboard
        report={report}
        conversationTurns={turns}
        scenario={scenario}
        targetGoal="Jelaskan hasil proyek dengan jelas"
        onChangeTask={vi.fn()}
        onPracticeAgain={vi.fn()}
      />
    );

    expect(markup).toContain("one-report");
    expect(markup).toContain("Diagnostik Kemampuan");
    expect(markup).toContain("Koreksi Dialog");
    expect(markup).toContain("Panduan Belajar");
    expect(markup).toContain("Optimasi Ekspresi");
    expect(markup).toContain("Tips Pengucapan");
    expect(markup).toContain("Kalimat Latihan Ulang");
    expect(markup).toContain("Lihat Dialog Lengkap");
    expect(markup).toContain("Sumber Analisis");
    expect(markup).toContain("Percakapan Pengguna");
  });
});
