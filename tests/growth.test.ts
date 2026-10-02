import { describe, expect, it } from "vitest";
import type { CheckinState } from "../src/domain/checkin";
import { hitungStreakBeruntun, MENIT_PER_SESI_DEFAULT, ringkasanProgres } from "../src/domain/growth";
import type { LearningRecord, LearningState } from "../src/domain/learning";

function catatan(partial: Partial<LearningRecord> & { reportId: string; date: string; score: number }): LearningRecord {
  return {
    scenarioNameZh: "Wawancara Kerja",
    scenarioNameEn: "Job Interview",
    taskTitleZh: "Perkenalan Diri",
    focus: "Jelaskan hasil proyek",
    roundCount: 3,
    correctionCount: 1,
    suggestionCount: 1,
    nextGoal: "Tambahkan satu angka terukur.",
    dimensions: [
      { id: "grammar", labelZh: "Akurasi Tata Bahasa", score: partial.score - 6 },
      { id: "task_completion", labelZh: "Penyelesaian Tugas", score: partial.score }
    ],
    ...partial
  };
}

function checkin(completedDates: string[]): CheckinState {
  return {
    completedDates,
    currentStreak: 0,
    todayBestScore: null,
    latestReportId: null
  };
}

describe("ringkasanProgres", () => {
  it("menampilkan kondisi kosong tanpa data dummy", () => {
    const hasil = ringkasanProgres({ records: [] }, checkin([]), "2026-10-03");

    expect(hasil.adaData).toBe(false);
    expect(hasil.totalSessions).toBe(0);
    expect(hasil.totalMinutes).toBe(0);
    expect(hasil.lastScore).toBeNull();
    expect(hasil.weakArea).toBeNull();
    expect(hasil.nextGoal).toBeNull();
    expect(hasil.trend).toEqual([]);
    expect(hasil.pesan).toContain("Belum ada catatan latihan");
  });

  it("menghitung total menit, skor terakhir, dan tren dari riwayat nyata", () => {
    const learning: LearningState = {
      records: [
        catatan({ reportId: "r3", date: "2026-10-03", score: 88, durationMinutes: 5 }),
        catatan({ reportId: "r2", date: "2026-10-02", score: 80, durationMinutes: 10 }),
        catatan({ reportId: "r1", date: "2026-10-01", score: 72 })
      ]
    };

    const hasil = ringkasanProgres(learning, checkin(["2026-10-01", "2026-10-02", "2026-10-03"]), "2026-10-03");

    expect(hasil.adaData).toBe(true);
    expect(hasil.totalSessions).toBe(3);
    // 5 + 10 + (default 5) = 20 menit
    expect(hasil.totalMinutes).toBe(20);
    expect(hasil.lastScore).toBe(88);
    // Tren urut lama -> baru
    expect(hasil.trend).toEqual([72, 80, 88]);
    expect(hasil.nextGoal).toBe("Tambahkan satu angka terukur.");
    expect(hasil.weakArea).toBe("Akurasi Tata Bahasa");
    expect(hasil.strongArea).toBe("Penyelesaian Tugas");
    expect(MENIT_PER_SESI_DEFAULT).toBe(5);
  });

  it("menandai hari yang selesai pada peta mingguan", () => {
    const hasil = ringkasanProgres({ records: [] }, checkin(["2026-10-02", "2026-10-03"]), "2026-10-03");

    expect(hasil.week).toHaveLength(7);
    const hariIni = hasil.week.find((hari) => hari.hariIni);
    expect(hariIni?.tanggal).toBe("2026-10-03");
    expect(hariIni?.selesai).toBe(true);
    expect(hasil.sessionsThisWeek).toBe(2);
  });
});

describe("hitungStreakBeruntun", () => {
  it("menghitung rentetan yang berakhir hari ini", () => {
    expect(hitungStreakBeruntun(["2026-10-01", "2026-10-02", "2026-10-03"], "2026-10-03")).toBe(3);
  });

  it("tetap hidup bila hari ini belum berlatih tetapi kemarin berlatih", () => {
    expect(hitungStreakBeruntun(["2026-10-01", "2026-10-02"], "2026-10-03")).toBe(2);
  });

  it("putus bila ada hari yang terlewat", () => {
    expect(hitungStreakBeruntun(["2026-09-28", "2026-09-29"], "2026-10-03")).toBe(0);
  });

  it("mengembalikan 0 tanpa riwayat", () => {
    expect(hitungStreakBeruntun([], "2026-10-03")).toBe(0);
  });
});
