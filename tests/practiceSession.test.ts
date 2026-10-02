import { describe, expect, it, vi } from "vitest";
import {
  addConversationTurn,
  completePracticeSession,
  createPracticeSession,
  getRemainingSeconds,
  markSessionPaused,
  markSessionRunning
} from "../server/practiceSession";

describe("practice session lifecycle", () => {
  it("creates a timed continuous session without fixed round limits", () => {
    const now = new Date("2026-06-06T10:00:00.000Z");
    const session = createPracticeSession({
      now,
      scenarioId: "interview",
      scenarioLabel: "Wawancara Kerja / Interview",
      targetGoal: "Jelaskan hasil proyek dengan jelas",
      durationMinutes: 7,
      openingAiText: "Tell me about your project."
    });

    expect(session.id).toMatch(/^practice_session_/);
    expect(session.start_time).toBe(now.toISOString());
    expect(session.duration).toBe(7 * 60);
    expect(session.status).toBe("running");
    expect(session.scenario_id).toBe("interview");
    expect(session.target_goal).toBe("Jelaskan hasil proyek dengan jelas");
    expect(session.conversation_turns).toEqual([
      expect.objectContaining({
        speaker: "ai",
        text: "Tell me about your project."
      })
    ]);
    expect(session).not.toHaveProperty("roundLimit");
  });

  it("stores conversation turns and computes remaining time", () => {
    const start = new Date("2026-06-06T10:00:00.000Z");
    const session = createPracticeSession({
      now: start,
      scenarioId: "interview",
      scenarioLabel: "Wawancara Kerja / Interview",
      targetGoal: "Jelaskan hasil proyek dengan jelas",
      durationMinutes: 5,
      openingAiText: "Tell me about your project."
    });

    addConversationTurn(session, {
      speaker: "user",
      text: "It is about my AI urgent.",
      timestamp: "2026-06-06T10:00:10.000Z",
      transcriptConfidence: 0.82
    });
    addConversationTurn(session, {
      speaker: "ai",
      text: "Do you mean an AI agent project? What problem did it solve?",
      timestamp: "2026-06-06T10:00:11.000Z"
    });

    expect(session.conversation_turns).toHaveLength(3);
    expect(session.conversation_turns[1]).toMatchObject({
      speaker: "user",
      text: "It is about my AI urgent.",
      transcriptConfidence: 0.82
    });
    expect(getRemainingSeconds(session, new Date("2026-06-06T10:02:00.000Z"))).toBe(180);
  });

  it("supports pause, resume, and final report completion", () => {
    const clock = vi
      .spyOn(Date, "now")
      .mockReturnValue(new Date("2026-06-06T10:03:00.000Z").getTime());
    const session = createPracticeSession({
      now: new Date("2026-06-06T10:00:00.000Z"),
      scenarioId: "interview",
      scenarioLabel: "Wawancara Kerja / Interview",
      targetGoal: "Jelaskan hasil proyek dengan jelas",
      durationMinutes: 5,
      openingAiText: "Tell me about your project."
    });

    markSessionPaused(session);
    expect(session.status).toBe("paused");

    markSessionRunning(session);
    expect(session.status).toBe("running");

    completePracticeSession(session, {
      reportId: "report_1",
      totalScore: 84,
      dimensions: [],
      summaryZh: "Secara keseluruhan jelas.",
      corrections: [],
      suggestions: [],
      coachCommentZh: "Lanjutkan menambahkan angka.",
      provider: "mock"
    });

    expect(session.status).toBe("completed");
    expect(session.end_time).toBe("2026-06-06T10:03:00.000Z");
    expect(session.final_report?.reportId).toBe("report_1");
    clock.mockRestore();
  });
});
