import { describe, expect, it } from "vitest";
import {
  addLearningRecord,
  createLearningRecord,
  summarizeLearning,
  type LearningRecord
} from "../src/domain/learning";
import type { ReportResult } from "../shared/schemas";

const report: ReportResult = {
  reportId: "report_1",
  totalScore: 86,
  dimensions: [
    { id: "pronunciation", labelZh: "Kejelasan Pengucapan", labelEn: "Pronunciation", score: 82, explanationZh: "" },
    { id: "fluency", labelZh: "Kelancaran", labelEn: "Fluency", score: 88, explanationZh: "" },
    { id: "grammar", labelZh: "Akurasi Tata Bahasa", labelEn: "Grammar", score: 80, explanationZh: "" },
    { id: "vocabulary", labelZh: "Kekayaan Kosakata", labelEn: "Vocabulary", score: 84, explanationZh: "" },
    { id: "coherence", labelZh: "Ekspresi & Koherensi", labelEn: "Coherence", score: 85, explanationZh: "" },
    { id: "task_completion", labelZh: "Penyelesaian Tugas", labelEn: "Task Completion", score: 90, explanationZh: "" },
    { id: "interaction", labelZh: "Interaksi", labelEn: "Interaction", score: 87, explanationZh: "" }
  ],
  summaryZh: "Jawaban sudah jelas.",
  corrections: [{ original: "I build app.", improved: "I built an app.", explanationZh: "Gunakan bentuk lampau (past tense)." }],
  suggestions: ["Tambahkan satu angka di ronde berikutnya."],
  coachCommentZh: "Lanjutkan menambahkan hasil konkret.",
  provider: "mock"
};

describe("learning progress tracking", () => {
  it("creates a learning record from a report", () => {
    const record = createLearningRecord({
      date: "2026-06-05",
      scenarioNameZh: "Wawancara Kerja",
      scenarioNameEn: "Interview",
      taskTitleZh: "Perkenalan Diri Magang",
      focus: "Jelaskan hasil proyek dengan jelas",
      roundCount: 4,
      report
    });

    expect(record.score).toBe(86);
    expect(record.correctionCount).toBe(1);
    expect(record.nextGoal).toContain("angka");
  });

  it("keeps newest records first and summarizes current growth", () => {
    const older: LearningRecord = {
      reportId: "report_old",
      date: "2026-06-04",
      scenarioNameZh: "Pemesanan Restoran",
      scenarioNameEn: "Restaurant",
      taskTitleZh: "Pesan dengan Preferensi",
      focus: "Sampaikan preferensi",
      score: 74,
      roundCount: 3,
      correctionCount: 2,
      suggestionCount: 2,
      nextGoal: "Jelaskan batasannya dulu.",
      dimensions: [
        { id: "grammar", labelZh: "Akurasi Tata Bahasa", score: 74 },
        { id: "task_completion", labelZh: "Penyelesaian Tugas", score: 80 }
      ]
    };
    const newest = createLearningRecord({
      date: "2026-06-05",
      scenarioNameZh: "Wawancara Kerja",
      scenarioNameEn: "Interview",
      taskTitleZh: "Perkenalan Diri Magang",
      focus: "Jelaskan hasil proyek dengan jelas",
      roundCount: 4,
      report
    });

    const state = addLearningRecord(addLearningRecord({ records: [] }, older), newest);
    const summary = summarizeLearning(state);

    expect(state.records[0].reportId).toBe("report_1");
    expect(summary.totalSessions).toBe(2);
    expect(summary.averageScore).toBe(80);
    expect(summary.strongestDimension).toBe("Penyelesaian Tugas");
    expect(summary.priorityDimension).toBe("Akurasi Tata Bahasa");
  });
});
