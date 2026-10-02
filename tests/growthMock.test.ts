import { describe, expect, it } from "vitest";
import { GROWTH_MOCK } from "../src/domain/growthMock";

describe("GROWTH_MOCK", () => {
  it("exposes streak, total minutes, last score, weak area and next practice", () => {
    expect(GROWTH_MOCK.streakDays).toBeGreaterThan(0);
    expect(GROWTH_MOCK.totalMinutes).toBeGreaterThan(0);
    expect(GROWTH_MOCK.lastScore).toBeGreaterThan(0);
    expect(GROWTH_MOCK.weakAreaZh).toBeTruthy();
    expect(GROWTH_MOCK.nextPracticeZh).toBeTruthy();
  });
});
