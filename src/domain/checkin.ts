export type CheckinState = {
  completedDates: string[];
  currentStreak: number;
  todayBestScore: number | null;
  latestReportId: string | null;
  restartMessage?: string;
};

export type PracticeCompletion = {
  date: string;
  score: number;
  reportId: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function parseLocalDate(date: string): number {
  return Date.parse(`${date}T00:00:00+08:00`);
}

function isNextDay(previous: string, current: string): boolean {
  return parseLocalDate(current) - parseLocalDate(previous) === DAY_MS;
}

export function getShanghaiDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
}

function formatShanghaiDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function createEmptyCheckinState(): CheckinState {
  return {
    completedDates: [],
    currentStreak: 0,
    todayBestScore: null,
    latestReportId: null
  };
}

export function applyPracticeCompletion(
  state: CheckinState,
  completion: PracticeCompletion
): CheckinState {
  const completedDates = Array.from(new Set(state.completedDates)).sort();
  const lastDate = completedDates[completedDates.length - 1];
  const alreadyCompletedToday = completedDates.includes(completion.date);
  const nextDates = alreadyCompletedToday
    ? completedDates
    : [...completedDates, completion.date].sort();

  if (alreadyCompletedToday) {
    return {
      ...state,
      completedDates: nextDates,
      todayBestScore: Math.max(state.todayBestScore ?? 0, completion.score),
      latestReportId: completion.reportId,
      restartMessage: undefined
    };
  }

  const continued = lastDate ? isNextDay(lastDate, completion.date) : false;
  const restarted = Boolean(lastDate && !continued);

  return {
    completedDates: nextDates,
    currentStreak: continued ? state.currentStreak + 1 : 1,
    todayBestScore: completion.score,
    latestReportId: completion.reportId,
    restartMessage: restarted ? "Memulai kembali hari ini tetaplah sebuah kemajuan, selesaikan satu sesi! / Starting over today is still progress, complete one session!" : undefined
  };
}

export function getRecentWeekCompletion(completedDates: string[], today: string): string[] {
  return getRecentWeekDates(today).filter((date) => completedDates.includes(date));
}

export function getRecentWeekDates(today: string): string[] {
  const todayMs = parseLocalDate(today);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(todayMs - (6 - index) * DAY_MS);
    return formatShanghaiDate(date);
  });
}
