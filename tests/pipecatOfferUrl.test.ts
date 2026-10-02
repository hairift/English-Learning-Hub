import { describe, expect, it } from "vitest";
import { createPipecatOfferUrl } from "../src/api";

describe("Pipecat offer URL", () => {
  it("passes the opening question so the voice agent can speak immediately after connect", () => {
    const url = new URL(
      createPipecatOfferUrl({
        sessionId: "practice_session_test",
        scenarioId: "interview",
        taskId: "internship-intro",
        targetGoal: "Jelaskan hasil proyek dengan jelas",
        openingText: "Tell me about one project you are proud of."
      })
    );

    expect(url.searchParams.get("opening_text")).toBe("Tell me about one project you are proud of.");
  });
});
