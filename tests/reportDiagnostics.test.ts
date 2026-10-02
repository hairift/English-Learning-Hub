import { describe, expect, it } from "vitest";
import type { ConversationTurn, ReportResult } from "../shared/schemas";
import { createReportDiagnostics } from "../src/reportDiagnostics";

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
  suggestions: ["My project improved the route planning result by 30%."],
  coachCommentZh: "Ekspresinya masih bisa lebih spesifik.",
  provider: "mock"
};

const turns: ConversationTurn[] = [
  {
    id: "turn_1",
    speaker: "user",
    text: "My role is about to improve the model and the UI style.",
    timestamp: "2026-06-06T12:00:00.000Z"
  },
  {
    id: "turn_2",
    speaker: "user",
    text: "Maybe the word or other things.",
    timestamp: "2026-06-06T12:01:00.000Z"
  }
];

describe("createReportDiagnostics", () => {
  it("derives strongest and weakest dimensions", () => {
    const diagnostics = createReportDiagnostics(report, turns, "Jelaskan hasil proyek dengan jelas");

    expect(diagnostics.strongestDimension?.id).toBe("task_completion");
    expect(diagnostics.weakestDimension?.id).toBe("grammar");
  });

  it("falls back to user turns and correction data when rich fields are missing", () => {
    const diagnostics = createReportDiagnostics(report, turns, "Jelaskan hasil proyek dengan jelas");

    expect(diagnostics.evidenceTurns).toHaveLength(2);
    expect(diagnostics.primaryAnalysis?.highlights[0].reasonZh).toContain("artikel");
    expect(diagnostics.pronunciationTips.some((tip) => tip.wordOrPhrase.includes("model"))).toBe(true);
    expect(diagnostics.nextPractice.chunks.length).toBeGreaterThan(1);
  });
});
