import type { ConversationTurn, PracticeSession, ReportResult } from "../shared/schemas";

type CreatePracticeSessionInput = {
  now?: Date;
  scenarioId: string;
  scenarioLabel: string;
  targetGoal: string;
  durationMinutes?: number;
  openingAiText: string;
};

type AddTurnInput = Omit<ConversationTurn, "id"> & { id?: string };

const DEFAULT_DURATION_MINUTES = 5;
const ALLOWED_DURATIONS = new Set([3, 5, 7, 10]);

function normalizeDurationMinutes(value: number | undefined) {
  if (!value || !ALLOWED_DURATIONS.has(value)) return DEFAULT_DURATION_MINUTES;
  return value;
}

function createTurn(input: AddTurnInput): ConversationTurn {
  return {
    id: input.id ?? `turn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    speaker: input.speaker,
    text: input.text,
    timestamp: input.timestamp,
    transcriptConfidence: input.transcriptConfidence,
    audioDurationSec: input.audioDurationSec,
    latencyMs: input.latencyMs,
    hintZh: input.hintZh,
    keywords: input.keywords
  };
}

export function createPracticeSession(input: CreatePracticeSessionInput): PracticeSession {
  const now = input.now ?? new Date();
  const durationMinutes = normalizeDurationMinutes(input.durationMinutes);
  return {
    id: `practice_session_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
    start_time: now.toISOString(),
    end_time: null,
    duration: durationMinutes * 60,
    status: "running",
    scenario_id: input.scenarioId,
    scenario_label: input.scenarioLabel,
    target_goal: input.targetGoal,
    conversation_turns: [
      createTurn({
        id: "opening_ai",
        speaker: "ai",
        text: input.openingAiText,
        timestamp: now.toISOString()
      })
    ],
    final_report: null
  };
}

export function addConversationTurn(session: PracticeSession, input: AddTurnInput): ConversationTurn {
  const turn = createTurn(input);
  session.conversation_turns.push(turn);
  return turn;
}

export function getElapsedSeconds(session: PracticeSession, now = new Date()) {
  return Math.max(0, Math.floor((now.getTime() - new Date(session.start_time).getTime()) / 1000));
}

export function getRemainingSeconds(session: PracticeSession, now = new Date()) {
  return Math.max(0, session.duration - getElapsedSeconds(session, now));
}

export function markSessionPaused(session: PracticeSession) {
  if (session.status === "running") session.status = "paused";
  return session;
}

export function markSessionRunning(session: PracticeSession) {
  if (session.status === "paused") session.status = "running";
  return session;
}

export function markSessionEnded(
  session: PracticeSession,
  now = new Date(Date.now()),
  status: "completed" | "expired" = "completed"
) {
  session.status = status;
  session.end_time = now.toISOString();
  return session;
}

export function completePracticeSession(
  session: PracticeSession,
  report: ReportResult,
  now = new Date(Date.now()),
  status: "completed" | "expired" = "completed"
) {
  markSessionEnded(session, now, status);
  session.final_report = report;
  return session;
}

export class PracticeSessionStore {
  private sessions = new Map<string, PracticeSession>();

  create(input: CreatePracticeSessionInput) {
    const session = createPracticeSession(input);
    this.sessions.set(session.id, session);
    return session;
  }

  get(sessionId: string) {
    return this.sessions.get(sessionId) ?? null;
  }

  addTurn(sessionId: string, input: AddTurnInput) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    return addConversationTurn(session, input);
  }

  complete(sessionId: string, report: ReportResult) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    return completePracticeSession(session, report);
  }

  end(sessionId: string, status: "completed" | "expired" = "completed") {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    return markSessionEnded(session, new Date(), status);
  }
}
