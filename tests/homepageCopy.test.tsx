import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../src/App";

function createLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear()
  };
}

describe("homepage Just. say it copy", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: createLocalStorageMock()
    });
  });

  it("renders the approved teacher-led mission card and gamified streak copy", () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain("YOUR TEACHER IS LISTENING");
    expect(markup).toContain("Just");
    expect(markup).toContain("say it");
    expect(markup).toContain("Tidak perlu menunggu jawaban sempurna.");
    expect(markup).toContain("Mulailah berbicara dalam bahasa Inggris");
    expect(markup).toContain("Say it");
    expect(markup).toContain("Streak Aktif");
    expect(markup).toContain("Pertahankan semangatmu, sudah 3 hari berturut-turut!");
    expect(markup).toContain("Streak Freeze");
    expect(markup).toContain("Jejak Perkembangan");
    expect(markup).toContain("68 → 72 → 76");
    expect(markup).toContain("Lihat Progres");
  });
});
