import { describe, expect, it } from "vitest";
import {
  getPracticeExperienceCopy,
  mapPracticeStartError,
  practiceStatusLabel,
  type PracticeStatus
} from "../src/practiceExperience";

describe("practice experience copy", () => {
  it("maps technical practice states to learner-facing labels", () => {
    const labels: Record<PracticeStatus, string> = {
      idle: "Ready when you are",
      connecting: "Checking microphone and voice connection",
      listening: "I'm listening",
      thinking: "Thinking about your answer",
      speaking: "I'm replying",
      ended: "Practice ended. Ready for your report",
      completed: "Report ready"
    };

    for (const [status, label] of Object.entries(labels) as Array<[PracticeStatus, string]>) {
      expect(practiceStatusLabel(status)).toBe(label);
      expect(getPracticeExperienceCopy({ status }).headline).toBe(label);
    }
  });

  it("keeps ended sessions focused on report generation", () => {
    expect(getPracticeExperienceCopy({ status: "ended" }).helper).toContain("full conversation");
  });

  it("maps common connection failures to specific guidance", () => {
    expect(mapPracticeStartError(new TypeError("Failed to fetch"))).toContain("Voice service is not running");
    expect(mapPracticeStartError(new DOMException("Permission denied", "NotAllowedError"))).toContain(
      "Microphone permission"
    );
    expect(mapPracticeStartError(new Error("provider is not configured"))).toContain("Voice provider is not ready");
    expect(mapPracticeStartError(new Error("audio track not found"))).toContain("AI audio is not playing");
    expect(mapPracticeStartError(new TypeError("Load failed"))).toContain("Voice service is not running");
  });
});
