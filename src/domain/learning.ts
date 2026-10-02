import type { ReportResult } from "../../shared/schemas";

export type LearningRecord = {
  reportId: string;
  date: string;
  scenarioNameZh: string;
  scenarioNameEn: string;
  taskTitleZh: string;
  focus: string;
  score: number;
  roundCount: number;
  correctionCount: number;
  suggestionCount: number;
  dimensions: Array<{
    id: string;
    labelZh: string;
    score: number;
  }>;
  nextGoal: string;
};

export type LearningState = {
  records: LearningRecord[];
};

export type LearningSummary = {
  totalSessions: number;
  latestScore: number | null;
  averageScore: number | null;
  strongestDimension: string;
  priorityDimension: string;
};

export function createEmptyLearningState(): LearningState {
  return { records: [] };
}

export function createLearningRecord(input: {
  date: string;
  scenarioNameZh: string;
  scenarioNameEn: string;
  taskTitleZh: string;
  focus: string;
  roundCount: number;
  report: ReportResult;
}): LearningRecord {
  const [nextGoal = "Lanjutkan menambahkan contoh yang lebih spesifik pada sesi berikutnya. / Add more specific examples next round."] = input.report.suggestions;

  return {
    reportId: input.report.reportId,
    date: input.date,
    scenarioNameZh: input.scenarioNameZh,
    scenarioNameEn: input.scenarioNameEn,
    taskTitleZh: input.taskTitleZh,
    focus: input.focus,
    score: input.report.totalScore,
    roundCount: input.roundCount,
    correctionCount: input.report.corrections.length,
    suggestionCount: input.report.suggestions.length,
    dimensions: input.report.dimensions.map((dimension) => ({
      id: dimension.id,
      labelZh: dimension.labelZh,
      score: dimension.score
    })),
    nextGoal
  };
}

export function addLearningRecord(
  state: LearningState,
  record: LearningRecord,
  maxRecords = 20
): LearningState {
  const records = [record, ...state.records.filter((item) => item.reportId !== record.reportId)];
  return { records: records.slice(0, maxRecords) };
}

export function summarizeLearning(state: LearningState): LearningSummary {
  const [latest] = state.records;

  if (!latest) {
    return {
      totalSessions: 0,
      latestScore: null,
      averageScore: null,
      strongestDimension: "Belum Ada Data / No Data",
      priorityDimension: "Tersedia setelah latihan / Available after practice"
    };
  }

  const averageScore = Math.round(
    state.records.reduce((sum, item) => sum + item.score, 0) / state.records.length
  );
  const sortedDimensions = [...latest.dimensions].sort((a, b) => b.score - a.score);
  const strongest = sortedDimensions[0];
  const priority = sortedDimensions[sortedDimensions.length - 1];

  return {
    totalSessions: state.records.length,
    latestScore: latest.score,
    averageScore,
    strongestDimension: strongest?.labelZh ?? "Belum ada catatan",
    priorityDimension: priority?.labelZh ?? "Belum ada catatan"
  };
}
