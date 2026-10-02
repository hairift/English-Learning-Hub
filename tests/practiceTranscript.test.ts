import { describe, expect, it } from "vitest";
import { getTranscriptFollowState } from "../src/practiceTranscript";

describe("practice transcript follow behavior", () => {
  it("keeps following new turns when the learner is already near the latest message", () => {
    expect(
      getTranscriptFollowState({
        scrollTop: 710,
        clientHeight: 260,
        scrollHeight: 1000,
        newTurnCount: 1
      })
    ).toEqual({ shouldFollow: true, unseenCount: 0 });
  });

  it("does not steal scroll when the learner has moved up to review earlier turns", () => {
    expect(
      getTranscriptFollowState({
        scrollTop: 240,
        clientHeight: 260,
        scrollHeight: 1000,
        newTurnCount: 2
      })
    ).toEqual({ shouldFollow: false, unseenCount: 2 });
  });
});
