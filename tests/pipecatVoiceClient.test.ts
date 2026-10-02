import { describe, expect, it } from "vitest";
import { shouldAttachBotAudioTrack, shouldDetachBotAudioTrack } from "../src/pipecatVoiceClient";

function audioTrack(readyState: MediaStreamTrackState) {
  return {
    kind: "audio",
    readyState
  } as MediaStreamTrack;
}

describe("Pipecat bot audio track lifecycle", () => {
  it("does not attach the local microphone track to bot playback", () => {
    expect(shouldAttachBotAudioTrack(audioTrack("live"), { id: "local", name: "You", local: true })).toBe(false);
  });

  it("attaches only remote bot audio tracks to bot playback", () => {
    expect(shouldAttachBotAudioTrack(audioTrack("live"), { id: "bot", name: "Bot", local: false })).toBe(true);
  });

  it("attaches an audio track when Pipecat does not provide participant metadata", () => {
    expect(shouldAttachBotAudioTrack(audioTrack("live"))).toBe(true);
  });

  it("keeps a live audio track attached while WebRTC is temporarily muted", () => {
    expect(shouldDetachBotAudioTrack(audioTrack("live"))).toBe(false);
  });

  it("detaches the audio track only when WebRTC ends it", () => {
    expect(shouldDetachBotAudioTrack(audioTrack("ended"))).toBe(true);
  });
});
