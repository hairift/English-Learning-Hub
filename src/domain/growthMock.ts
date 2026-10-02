// P0: growth tracking uses example data only. Later it can read from learning.ts or a backend store.
export type GrowthSnapshot = {
  streakDays: number;
  totalMinutes: number;
  lastScore: number;
  weakAreaZh: string;
  nextPracticeZh: string;
  nextTipZh: string;
};

export const GROWTH_MOCK: GrowthSnapshot = {
  streakDays: 3,
  totalMinutes: 28,
  lastScore: 76,
  weakAreaZh: "Hasil Terukur / Measurable Results",
  nextPracticeZh: "Wawancara: Hasil Proyek / Interview: Project Results",
  nextTipZh: 'Ganti "improved route flow" menjadi "reduced route search time by 30%".'
};
