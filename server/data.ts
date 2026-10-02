export type ScenarioTask = {
  id: string;
  titleZh: string;
  titleEn: string;
  aiRoleZh: string;
  focus: string;
  openingQuestion: string;
};

export type Scenario = {
  id: string;
  nameZh: string;
  nameEn: string;
  descriptionZh: string;
  tasks: ScenarioTask[];
};

export const scenarios: Scenario[] = [
  {
    id: "interview",
    nameZh: "Wawancara Kerja",
    nameEn: "Job Interview",
    descriptionZh: "Latihan perkenalan diri, pengalaman proyek, dan menjawab pertanyaan lanjutan wawancara kerja.",
    tasks: [
      {
        id: "internship-intro",
        titleZh: "Perkenalan Diri Magang",
        titleEn: "Internship Introduction",
        aiRoleZh: "Pewawancara AI / AI Interviewer",
        focus: "Jelaskan hasil dan dampak proyek / Highlight project impact",
        openingQuestion: "Tell me about one project you are proud of."
      },
      {
        id: "strengths-plan",
        titleZh: "Kelebihan & Rencana Karir",
        titleEn: "Strengths & Career Plan",
        aiRoleZh: "Pewawancara AI / AI Interviewer",
        focus: "Kesimpulan dulu lalu contoh nyata / Conclusion first, then example",
        openingQuestion: "What is one strength that would help you in this role?"
      }
    ]
  },
  {
    id: "meeting",
    nameZh: "Rapat Bisnis",
    nameEn: "Business Meeting",
    descriptionZh: "Latihan menyampaikan opini, konfirmasi tugas, dan menyampaikan sanggahan secara sopan dalam rapat.",
    tasks: [
      {
        id: "share-opinion",
        titleZh: "Menyampaikan Opini Proyek",
        titleEn: "Share a Project Opinion",
        aiRoleZh: "Moderator Rapat AI / AI Meeting Chair",
        focus: "Opini jelas & alasan ringkas / Clear point, concise reasoning",
        openingQuestion: "What do you think is the biggest risk in this plan?"
      }
    ]
  },
  {
    id: "restaurant",
    nameZh: "Pemesanan Restoran",
    nameEn: "Restaurant Ordering",
    descriptionZh: "Latihan memesan makanan, meminta rekomendasi menu, dan menyampaikan preferensi khusus.",
    tasks: [
      {
        id: "order-with-preference",
        titleZh: "Pesan dengan Preferensi Khusus",
        titleEn: "Order with Preferences",
        aiRoleZh: "Pelayan AI / AI Server",
        focus: "Sampaikan pantangan & preferensi / Express limits & preferences",
        openingQuestion: "Hi, what would you like to order today?"
      }
    ]
  }
];

export function findScenarioTask(scenarioId: string, taskId: string): {
  scenario: Scenario;
  task: ScenarioTask;
} {
  const scenario = scenarios.find((item) => item.id === scenarioId) ?? scenarios[0];
  const task = scenario.tasks.find((item) => item.id === taskId) ?? scenario.tasks[0];
  return { scenario, task };
}
