import type {
  DialogueTurnResult,
  ReportResult,
  SpeechAudioResult,
  TranscriptResult
} from "../../shared/schemas";
import { findScenarioTask } from "../data";

export function mockStartSession(scenarioId: string, taskId: string) {
  const { task } = findScenarioTask(scenarioId, taskId);

  return {
    sessionId: `session_${Date.now()}`,
    aiText: task.openingQuestion,
    hintZh: `Fokus giliran ini: ${task.focus}. Jawab pertanyaan lebih dulu, lalu sertakan contoh konkret. / Focus: ${task.focus}. Answer first, then provide a concrete example.`,
    coachState: "asking" as const,
    roundLimit: 5
  };
}

export function mockTranscribe(): TranscriptResult {
  const words = [
    "I",
    "built",
    "a",
    "campus",
    "navigation",
    "project",
    "and",
    "improved",
    "the",
    "route",
    "flow"
  ];

  return {
    text: "I built a campus navigation project and improved the route flow.",
    confidence: 0.93,
    words: words.map((word, index) => ({
      word: word.toLowerCase(),
      punctuatedWord: index === 0 ? word : word,
      start: index * 0.32,
      end: index * 0.32 + 0.24,
      confidence: index === 4 ? 0.74 : 0.92 + (index % 3) * 0.02
    })),
    durationSec: 4.1,
    providerLatencyMs: 120,
    provider: "mock",
    fallback: true,
    fallbackReason: "API_MODE=mock"
  };
}

export function mockDialogueTurn(userText: string, round: number): DialogueTurnResult {
  if (/urgent/i.test(userText)) {
    return {
      aiText: "Do you mean an AI agent project? What problem did it solve?",
      hintZh: "AI mendeteksi kata 'urgent' yang mungkin dimaksudkan sebagai 'agent'. Konfirmasi kata kunci Anda lalu jelaskan masalah yang dipecahkan proyek.",
      coachState: "asking",
      positiveFeedback: "Bagus! Anda sudah menyebutkan topik proyek. Selanjutnya perjelas kata kuncinya agar lebih presisi.",
      correctionPreview: "Jika ingin menyatakan proyek AI agent, katakan: 'It is about my AI agent project.'",
      nextRoundGoal: "Konfirmasi jenis proyek dan jelaskan masalah apa yang diselesaikannya secara spesifik.",
      provider: "mock",
      fallback: true
    };
  }

  const resultWord = /result|improved|increase|reduced|saved|score/i.test(userText)
    ? "Good. Now make the result measurable with one number or percentage."
    : "What measurable result or impact did your work create for users or the team?";

  return {
    aiText: resultWord,
    hintZh: "Jawaban lebih baik jika spesifik dan konkret: sebutkan hasil utama, lalu tambahkan angka atau dampak bagi pengguna.",
    coachState: "asking",
    positiveFeedback: /result|improved|increase|reduced|saved|score/i.test(userText)
      ? "Sangat baik! Anda mulai menyertakan hasil yang konkret."
      : "Struktur jawaban Anda sudah terarah dan topik proyek tersampaikan dengan jelas.",
    correctionPreview:
      round <= 1
        ? "Saran: ubah 'I built campus navigation app' menjadi 'I built a campus navigation app'."
        : "Penyampaian kalimat sudah cukup jelas, pertahankan keringkasan kalimat.",
    nextRoundGoal: "Sertakan satu metrik hasil nyata, misalnya peningkatan efisiensi, pengurangan kesalahan, atau feedback pengguna.",
    provider: "mock",
    fallback: true
  };
}

export function mockSpeech(text: string): SpeechAudioResult {
  return {
    audioBase64: Buffer.from(`Mock speech for: ${text}`).toString("base64"),
    audioUrl: null,
    format: "mock",
    durationEstimateSec: Math.max(1.8, text.split(/\s+/).length * 0.28),
    provider: "mock",
    fallback: true
  };
}

export function mockReport(): ReportResult {
  return {
    reportId: `report_${Date.now()}`,
    totalScore: 84,
    dimensions: [
      {
        id: "fluency",
        labelZh: "Kelancaran (Fluency)",
        labelEn: "Fluency",
        score: 85,
        explanationZh: "Penyampaian lancar dan beruntun; kurangi pengulangan kata pengantar."
      },
      {
        id: "pronunciation",
        labelZh: "Pengucapan (Pronunciation)",
        labelEn: "Pronunciation",
        score: 82,
        explanationZh: "Tingkat kejelasan tinggi; kata-kata panjang dapat diucapkan lebih tenang."
      },
      {
        id: "grammar",
        labelZh: "Tata Bahasa (Grammar)",
        labelEn: "Grammar",
        score: 80,
        explanationZh: "Perhatikan penggunaan tenses lampau dan article (a/an/the) serta bentuk tunggal-jamak."
      },
      {
        id: "vocabulary",
        labelZh: "Kosakata (Vocabulary)",
        labelEn: "Vocabulary",
        score: 84,
        explanationZh: "Kosakata teknis sudah tepat, pastikan pelafalan kata kunci seperti 'agent' atau 'result' terdengar tegas."
      },
      {
        id: "coherence",
        labelZh: "Koherensi (Coherence)",
        labelEn: "Coherence",
        score: 83,
        explanationZh: "Penjelasan terstruktur baik; hubungan antar masalah, solusi, dan dampak dapat diperkuat."
      },
      {
        id: "task_completion",
        labelZh: "Penyelesaian Tugas (Task Completion)",
        labelEn: "Task Completion",
        score: 88,
        explanationZh: "Jawaban menjawab pertanyaan skenario dan mampu merespons pertanyaan lanjutan AI."
      },
      {
        id: "interaction",
        labelZh: "Interaksi (Interaction)",
        labelEn: "Interaction",
        score: 81,
        explanationZh: "Mampu merespons cepat; dapat menambahkan konfirmasi aktif saat ditanya."
      }
    ],
    summaryZh: "Anda berhasil menjelaskan proyek dengan baik. Pada sesi berikutnya, utamakan menambahkan angka atau dampak nyata yang terukur.",
    corrections: [
      {
        original: "I built campus navigation app. It make route clear.",
        improved: "I built a campus navigation app that made route planning clearer.",
        explanationZh: "Tambahkan article 'a' sebelum noun phrase dan gunakan past tense 'made' untuk konsistensi waktu."
      }
    ],
    suggestions: [
      "Awali jawaban dengan satu kalimat ringkasan hasil proyek.",
      "Sertakan minimal satu angka konkret (misalnya penghematan waktu atau persentase).",
      "Saat menjawab follow-up, berikan jawaban inti terlebih dahulu baru tambahkan latar belakang."
    ],
    coachCommentZh: "Tata bahasa cukup stabil dan terarah. Tambahkan angka atau metrik hasil konkret pada giliran berikutnya!",
    sentenceAnalyses: [
      {
        original: "My role is about to improve the model and the UI style.",
        improved: "My role was to improve the model behavior and polish the UI.",
        issueType: "wording",
        explanationZh: "Gunakan 'was to' untuk menjelaskan tanggung jawab masa lalu; 'about to' berarti 'akan segera dilakukan'.",
        highlights: [
          {
            originalText: "about to",
            improvedText: "was to",
            reasonZh: "Untuk peran lampau gunakan 'was to', lebih tepat daripada 'about to'."
          },
          {
            originalText: "the UI style",
            improvedText: "polish the UI",
            reasonZh: "Frasa 'polish the UI' terdengar lebih profesional dan alami dalam wawancara kerja."
          }
        ]
      },
      {
        original: "I built campus navigation app. It make route clear.",
        improved: "I built a campus navigation app that made route planning clearer.",
        issueType: "grammar",
        explanationZh: "Pertahankan past tense untuk pengalaman masa lalu dan lengkapi dengan article 'a'.",
        highlights: [
          {
            originalText: "campus navigation app",
            improvedText: "a campus navigation app",
            reasonZh: "Kata benda tunggal dapat dihitung (app) memerlukan article 'a'."
          },
          {
            originalText: "It make",
            improvedText: "that made",
            reasonZh: "Gunakan klausa penghubung 'that made' dengan past tense agar kalimat mengalir alami."
          }
        ]
      }
    ],
    pronunciationTips: [
      {
        wordOrPhrase: "project",
        issueZh: "Penekanan suku kata (stressing) pada kata benda 'project'.",
        tipZh: "Sebagai kata benda, tekan suku kata pertama: PRO-ject, lalu ucapkan suku kata kedua dengan ringan.",
        example: "My PRO-ject improved route planning."
      },
      {
        wordOrPhrase: "model and the UI",
        issueZh: "Kata penghubung 'and' dapat diucapkan ringan (weak form) namun tetap terdengar artikulasinya.",
        tipZh: "Ucapkan 'model and the UI' sebagai satu frasa mengalir, dengan 'and' diucapkan ringan sebagai /ənd/.",
        example: "I improved the model and the UI."
      },
      {
        wordOrPhrase: "result sentence",
        issueZh: "Intonasi kalimat penutup harus turun (falling intonation) agar terdengar yakin dan meyakinkan.",
        tipZh: "Berikan jeda singkat sebelum angka penting dan turunkan nada di akhir kalimat.",
        example: "It reduced planning time by 30%."
      }
    ],
    evidenceTurns: [
      {
        speaker: "user",
        text: "My role is about to improve the model and the UI style.",
        reasonZh: "Kalimat ini menunjukkan perlunya ekspresi tanggung jawab peran yang lebih alami."
      },
      {
        speaker: "user",
        text: "I built campus navigation app. It make route clear.",
        reasonZh: "Kalimat ini memperlihatkan perlunya pelengkap article serta metrik hasil yang terukur."
      }
    ],
    nextPractice: {
      goalZh: "Sampaikan hasil proyek dalam satu kalimat bahasa Inggris dengan menyertakan metrik angka.",
      targetSentence: "My project improved route planning by 30% by making the model responses clearer.",
      chunks: [
        "My project improved route planning",
        "by 30%",
        "by making the model responses clearer"
      ],
      drills: [
        "Baca tiga bagian (chunk) secara perlahan dengan jeda setengah detik di antaranya.",
        "Pada pengulangan kedua, berikan penekanan intonasi khusus pada 'by 30%'.",
        "Pada pengulangan ketiga, baca lancar sebagai satu kalimat utuh dengan intonasi akhir menurun."
      ]
    },
    provider: "mock",
    fallback: true
  };
}
