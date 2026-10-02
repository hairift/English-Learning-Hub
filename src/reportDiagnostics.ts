import type {
  ConversationTurn,
  EvidenceTurn,
  NextPractice,
  PronunciationTip,
  ReportResult,
  SentenceAnalysis
} from "../shared/schemas";

export type ReportDiagnostics = {
  sortedDimensions: ReportResult["dimensions"];
  strongestDimension: ReportResult["dimensions"][number] | null;
  weakestDimension: ReportResult["dimensions"][number] | null;
  evidenceTurns: EvidenceTurn[];
  sentenceAnalyses: SentenceAnalysis[];
  primaryAnalysis: SentenceAnalysis | null;
  pronunciationTips: PronunciationTip[];
  nextPractice: NextPractice;
};

export function createReportDiagnostics(
  report: ReportResult,
  turns: ConversationTurn[],
  targetGoal: string
): ReportDiagnostics {
  const sortedDimensions = [...report.dimensions].sort((a, b) => b.score - a.score);
  const sentenceAnalyses = report.sentenceAnalyses?.length
    ? report.sentenceAnalyses
    : createFallbackSentenceAnalyses(report);
  const evidenceTurns = report.evidenceTurns?.length
    ? report.evidenceTurns
    : createFallbackEvidenceTurns(turns, report);
  const pronunciationTips = report.pronunciationTips?.length
    ? report.pronunciationTips
    : createFallbackPronunciationTips(turns);

  return {
    sortedDimensions,
    strongestDimension: sortedDimensions[0] ?? null,
    weakestDimension: sortedDimensions.at(-1) ?? null,
    evidenceTurns,
    sentenceAnalyses,
    primaryAnalysis: sentenceAnalyses[0] ?? null,
    pronunciationTips,
    nextPractice: report.nextPractice ?? createFallbackNextPractice(report, targetGoal)
  };
}

function createFallbackSentenceAnalyses(report: ReportResult): SentenceAnalysis[] {
  return report.corrections.slice(0, 2).map((correction) => ({
    original: correction.original,
    improved: correction.improved,
    issueType: inferIssueType(correction.explanationZh),
    explanationZh: correction.explanationZh,
    highlights: [
      {
        originalText: findFirstChangedPhrase(correction.original, correction.improved).originalText,
        improvedText: findFirstChangedPhrase(correction.original, correction.improved).improvedText,
        reasonZh: correction.explanationZh
      }
    ]
  }));
}

function inferIssueType(explanationZh: string): SentenceAnalysis["issueType"] {
  if (/pronunciation|stress|intonation|pengucapan|pelafalan/i.test(explanationZh)) return "pronunciation";
  if (/logic|structure|coherence|struktur|logika|hasil/i.test(explanationZh)) return "logic";
  if (/wording|vocabulary|phrase|kata|istilah|ekspresi/i.test(explanationZh)) return "wording";
  return "grammar";
}

function findFirstChangedPhrase(original: string, improved: string) {
  const originalWords = original.split(/\s+/).filter(Boolean);
  const improvedWords = improved.split(/\s+/).filter(Boolean);
  const max = Math.max(originalWords.length, improvedWords.length);

  for (let index = 0; index < max; index += 1) {
    if (originalWords[index] !== improvedWords[index]) {
      return {
        originalText: originalWords.slice(index, index + 3).join(" ") || original,
        improvedText: improvedWords.slice(index, index + 3).join(" ") || improved
      };
    }
  }

  return { originalText: original, improvedText: improved };
}

function createFallbackEvidenceTurns(turns: ConversationTurn[], report: ReportResult): EvidenceTurn[] {
  const userTurns = turns
    .filter((turn) => turn.speaker === "user" && turn.text.trim())
    .slice(-3)
    .map((turn) => ({
      speaker: "user" as const,
      text: turn.text,
      reasonZh: "Kutipan ucapan asli pengguna untuk mendukung rekomendasi perbaikan kalimat."
    }));

  if (userTurns.length) return userTurns;

  return report.corrections.slice(0, 2).map((correction) => ({
    speaker: "user" as const,
    text: correction.original,
    reasonZh: "Kutipan dari poin koreksi laporan untuk melengkapi bukti dialog."
  }));
}

function createFallbackPronunciationTips(turns: ConversationTurn[]): PronunciationTip[] {
  const text = turns
    .filter((turn) => turn.speaker === "user")
    .map((turn) => turn.text)
    .join(" ")
    .toLowerCase();
  const tips: PronunciationTip[] = [];

  if (text.includes("project")) {
    tips.push({
      wordOrPhrase: "project",
      issueZh: "Penekanan suku kata (word stress) pada kata benda 'project'.",
      tipZh: "Sebagai kata benda, letakkan penekanan di awal: PRO-ject, lalu ucapkan bagian kedua lebih ringan.",
      example: "My PRO-ject improved route planning."
    });
  }

  if (text.includes("model")) {
    tips.push({
      wordOrPhrase: "model and the UI",
      issueZh: "Kata 'and' sering tertelan saat diucapkan cepat sebelum konsonan/vokal.",
      tipZh: "Ucapkan 'and' secara ringan (weak form: /ənd/ atau /ən/) tanpa memutus alur frasa.",
      example: "I improved the model and the UI."
    });
  }

  if (text.includes("maybe") || text.includes("things")) {
    tips.push({
      wordOrPhrase: "maybe / things",
      issueZh: "Terlalu banyak kata ragu membuat jawaban terdengar kurang meyakinkan.",
      tipZh: "Gunakan intonasi menurun di akhir kalimat agar terdengar percaya diri dan profesional.",
      example: "I improved the prompt flow and reduced repeated answers."
    });
  }

  if (!tips.length) {
    tips.push({
      wordOrPhrase: "result sentence",
      issueZh: "Kalimat penyampaian hasil memerlukan ritme dan intonasi yang stabil.",
      tipZh: "Beri jeda singkat sebelum angka atau metrik hasil, dan akhiri dengan intonasi menurun.",
      example: "It reduced planning time by 30%."
    });
  }

  return tips;
}

function createFallbackNextPractice(report: ReportResult, targetGoal: string): NextPractice {
  const candidate = report.suggestions.find((suggestion) => /[a-z]/i.test(suggestion));
  const targetSentence =
    candidate || "My project improved route planning by 30% by making the model responses clearer.";

  return {
    goalZh: targetGoal || "Sampaikan kembali hasil proyek dalam satu kalimat bahasa Inggris yang lugas.",
    targetSentence,
    chunks: splitSentenceIntoChunks(targetSentence),
    drills: [
      "Baca perlahan per bagian (chunk), beri jeda setengah detik di antaranya.",
      "Pada kali kedua, beri penekanan khusus pada angka atau kata kunci hasil.",
      "Pada kali ketiga, ucapkan mengalir dalam satu kalimat utuh dengan intonasi menurun."
    ]
  };
}

function splitSentenceIntoChunks(sentence: string): string[] {
  const chunks = sentence
    .replace(/\s+(by|because|and|that|with)\s+/gi, "|$1 ")
    .split("|")
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  return chunks.length > 1 ? chunks : [sentence, "Tambahkan satu angka metrik atau dampak pengguna."];
}
