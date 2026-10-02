import { describe, expect, it } from "vitest";
import { dialogueTurnResultSchema } from "../shared/schemas";

describe("dialogueTurnResultSchema", () => {
  it("requires a positiveFeedback string", () => {
    const base = {
      aiText: "What result did it create?",
      hintZh: "Sebutkan hasil dulu, lalu tambahkan angka.",
      coachState: "asking",
      correctionPreview: "Sudah cukup jelas.",
      nextRoundGoal: "Tambahkan satu angka.",
      provider: "mock"
    };

    expect(() => dialogueTurnResultSchema.parse(base)).toThrow();
    const ok = dialogueTurnResultSchema.parse({ ...base, positiveFeedback: "Anda sudah menjelaskan topik proyek dengan jelas." });
    expect(ok.positiveFeedback).toBe("Anda sudah menjelaskan topik proyek dengan jelas.");
  });
});
