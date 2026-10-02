import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AvatarCadangan, Sela3DAvatar, dukungWebgl } from "../src/components/Sela3DAvatar";
import { CoachAvatar } from "../src/components/CoachAvatar";

describe("Sela3DAvatar", () => {
  it("does not report WebGL support outside the browser", () => {
    expect(dukungWebgl()).toBe(false);
  });

  it("falls back to the Sela portrait when WebGL is unavailable", () => {
    const markup = renderToStaticMarkup(<Sela3DAvatar state="idle" size={200} />);

    expect(markup).toContain("sela-3d");
    expect(markup).toContain("/brand/sela-ai.png");
    // Avatar 2D lama (SVG berlapis) tidak boleh dipakai lagi.
    expect(markup).not.toContain("layered-coach-avatar");
  });

  it("marks the portrait as active while Sela is speaking or listening", () => {
    const speaking = renderToStaticMarkup(<AvatarCadangan state="asking" size={200} />);
    const idle = renderToStaticMarkup(<AvatarCadangan state="idle" size={200} />);

    expect(speaking).toContain('class="aktif"');
    expect(idle).not.toContain('class="aktif"');
  });

  it("exposes the bilingual coach status label", () => {
    const markup = renderToStaticMarkup(<CoachAvatar state="thinking" />);

    expect(markup).toContain("Menganalisis jawaban / Thinking");
  });
});
