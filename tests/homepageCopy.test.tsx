import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../src/App";
import { getShanghaiDate } from "../src/domain/checkin";

function createLocalStorageMock(seed: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(seed));
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear()
  };
}

function pasangLocalStorage(seed: Record<string, string> = {}) {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: createLocalStorageMock(seed)
  });
}

describe("homepage Just. say it copy", () => {
  beforeEach(() => {
    pasangLocalStorage();
  });

  it("renders the approved teacher-led mission card and the growth panel", () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain("YOUR TEACHER IS LISTENING");
    expect(markup).toContain("Just");
    expect(markup).toContain("say it");
    expect(markup).toContain("Tidak perlu menunggu jawaban sempurna.");
    expect(markup).toContain("Mulailah berbicara dalam bahasa Inggris");
    expect(markup).toContain("Say it");
    expect(markup).toContain("Progres Belajar");
    expect(markup).toContain("Jejak Perkembangan");
    expect(markup).toContain("Lihat Progres");
  });

  it("shows an honest empty state for growth when there is no practice history", () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain("Belum Ada Streak");
    expect(markup).toContain("Belum ada catatan latihan");
    expect(markup).toContain("Sesi Minggu Ini");
    expect(markup).toContain("Belum ada tren");
    expect(markup).toContain("0 Menit");
  });

  it("never falls back to dummy growth numbers", () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).not.toContain("68 → 72 → 76");
    expect(markup).not.toContain("Pertahankan semangatmu, sudah 3 hari berturut-turut!");
    expect(markup).not.toContain("Streak Freeze");
    expect(markup).not.toContain("1x Tersedia");
  });

  it("renders growth numbers that come from the stored practice history", () => {
    const hariIni = getShanghaiDate();
    pasangLocalStorage({
      "ai-speaking-coach-learning": JSON.stringify({
        records: [
          {
            reportId: "report_1",
            date: hariIni,
            scenarioNameZh: "Wawancara Kerja",
            scenarioNameEn: "Job Interview",
            taskTitleZh: "Perkenalan Diri",
            focus: "Jelaskan hasil proyek",
            score: 88,
            roundCount: 3,
            durationMinutes: 5,
            correctionCount: 1,
            suggestionCount: 1,
            dimensions: [
              { id: "grammar", labelZh: "Akurasi Tata Bahasa", score: 80 },
              { id: "task_completion", labelZh: "Penyelesaian Tugas", score: 88 }
            ],
            nextGoal: "Tambahkan satu angka terukur."
          }
        ]
      }),
      "ai-speaking-coach-checkin": JSON.stringify({
        completedDates: [hariIni],
        currentStreak: 1,
        todayBestScore: 88,
        latestReportId: "report_1"
      })
    });

    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain("5 Menit");
    expect(markup).toContain("88");
    expect(markup).toContain("Wawancara Kerja · Job Interview");
    expect(markup).toContain("Sedang diasah: Akurasi Tata Bahasa");
    expect(markup).toContain("Streak Aktif");
    expect(markup).toContain("1 dari 7 hari");
  });
});
