import {
  applyPracticeCompletion,
  createEmptyCheckinState,
  getShanghaiDate,
  type CheckinState
} from "./domain/checkin";
import {
  addLearningRecord,
  createEmptyLearningState,
  type LearningRecord,
  type LearningState
} from "./domain/learning";
import type { Scenario } from "../server/data";

const KEY = "ai-speaking-coach-checkin";
const LEARNING_KEY = "ai-speaking-coach-learning";
const CUSTOM_SCENARIOS_KEY = "ai-speaking-coach-custom-scenarios";

export function loadCheckin(): CheckinState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...createEmptyCheckinState(), ...JSON.parse(raw) } : createEmptyCheckinState();
  } catch {
    return createEmptyCheckinState();
  }
}

export function saveCheckin(state: CheckinState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function completeToday(score: number, reportId: string, now = new Date()) {
  const next = applyPracticeCompletion(loadCheckin(), {
    date: getShanghaiDate(now),
    score,
    reportId
  });
  saveCheckin(next);
  return next;
}

export function loadLearning(): LearningState {
  try {
    const raw = localStorage.getItem(LEARNING_KEY);
    return raw ? { ...createEmptyLearningState(), ...JSON.parse(raw) } : createEmptyLearningState();
  } catch {
    return createEmptyLearningState();
  }
}

export function saveLearning(state: LearningState) {
  localStorage.setItem(LEARNING_KEY, JSON.stringify(state));
}

export function recordLearning(record: LearningRecord) {
  const next = addLearningRecord(loadLearning(), record);
  saveLearning(next);
  return next;
}

export function loadCustomScenarios(): Scenario[] {
  try {
    const raw = localStorage.getItem(CUSTOM_SCENARIOS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isScenarioLike) : [];
  } catch {
    return [];
  }
}

export function saveCustomScenario(scenario: Scenario) {
  const existing = loadCustomScenarios().filter((item) => item.id !== scenario.id);
  const next = [scenario, ...existing].slice(0, 6);
  localStorage.setItem(CUSTOM_SCENARIOS_KEY, JSON.stringify(next));
  return next;
}

function isScenarioLike(value: unknown): value is Scenario {
  if (!value || typeof value !== "object") return false;
  const item = value as Scenario;
  return Boolean(
    item.id &&
      item.nameZh &&
      item.nameEn &&
      item.descriptionZh &&
      Array.isArray(item.tasks) &&
      item.tasks[0]?.id &&
      item.tasks[0]?.openingQuestion
  );
}
