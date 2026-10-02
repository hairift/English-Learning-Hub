import { describe, expect, it } from "vitest";
import { applyPracticeCompletion, getRecentWeekDates } from "../src/domain/checkin";

describe("check-in streak rules", () => {
  it("starts a first-day streak when the user completes a report", () => {
    const result = applyPracticeCompletion(
      { completedDates: [], currentStreak: 0, todayBestScore: null, latestReportId: null },
      { date: "2026-06-05", score: 82, reportId: "report_1" }
    );

    expect(result.completedDates).toEqual(["2026-06-05"]);
    expect(result.currentStreak).toBe(1);
    expect(result.todayBestScore).toBe(82);
  });

  it("does not increment streak twice on the same local day", () => {
    const result = applyPracticeCompletion(
      {
        completedDates: ["2026-06-05"],
        currentStreak: 1,
        todayBestScore: 82,
        latestReportId: "report_1"
      },
      { date: "2026-06-05", score: 91, reportId: "report_2" }
    );

    expect(result.completedDates).toEqual(["2026-06-05"]);
    expect(result.currentStreak).toBe(1);
    expect(result.todayBestScore).toBe(91);
    expect(result.latestReportId).toBe("report_2");
  });

  it("increments consecutive next-day completion and restarts after a gap", () => {
    const nextDay = applyPracticeCompletion(
      {
        completedDates: ["2026-06-05"],
        currentStreak: 1,
        todayBestScore: 82,
        latestReportId: "report_1"
      },
      { date: "2026-06-06", score: 84, reportId: "report_2" }
    );

    expect(nextDay.currentStreak).toBe(2);

    const afterGap = applyPracticeCompletion(nextDay, {
      date: "2026-06-08",
      score: 79,
      reportId: "report_3"
    });

    expect(afterGap.currentStreak).toBe(1);
    expect(afterGap.restartMessage).toContain("kemajuan");
  });

  it("builds full week dates across a year boundary", () => {
    expect(getRecentWeekDates("2026-01-02")).toEqual([
      "2025-12-27",
      "2025-12-28",
      "2025-12-29",
      "2025-12-30",
      "2025-12-31",
      "2026-01-01",
      "2026-01-02"
    ]);
  });
});
