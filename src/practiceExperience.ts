export type PracticeStatus = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "ended" | "completed";

type PracticeExperienceInput = {
  status: PracticeStatus;
  busy?: string;
  error?: string;
};

export type PracticeExperienceCopy = {
  headline: string;
  helper: string;
};

const statusLabels: Record<PracticeStatus, string> = {
  idle: "Ready when you are",
  connecting: "Checking microphone and voice connection",
  listening: "I'm listening",
  thinking: "Thinking about your answer",
  speaking: "I'm replying",
  ended: "Practice ended. Ready for your report",
  completed: "Report ready"
};

const statusHelpers: Record<PracticeStatus, string> = {
  idle: "Click Start Training when you are ready. Your coach will ask and follow up automatically.",
  connecting: "Keep this tab open while we prepare the microphone and voice connection.",
  listening: "Pause briefly when you finish; I will respond automatically.",
  thinking: "I am reading your full answer and preparing the next useful question.",
  speaking: "Listen to the coach, then answer naturally when the coach finishes.",
  ended: "Your full conversation is ready for review.",
  completed: "Your report is ready."
};

export function practiceStatusLabel(status: PracticeStatus) {
  return statusLabels[status];
}

export function getPracticeExperienceCopy({ status, busy, error }: PracticeExperienceInput): PracticeExperienceCopy {
  if (error) return { headline: "Connection needs attention", helper: error };
  if (busy) return { headline: statusLabels[status], helper: busy };
  return { headline: statusLabels[status], helper: statusHelpers[status] };
}

export function mapPracticeStartError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  const lower = message.toLowerCase();

  if (error instanceof DOMException && ["NotAllowedError", "PermissionDeniedError"].includes(error.name)) {
    return "Microphone permission is blocked. Allow microphone access in the browser, then start again.";
  }

  if (lower.includes("permission") || lower.includes("notallowederror")) {
    return "Microphone permission is blocked. Allow microphone access in the browser, then start again.";
  }

  if (lower.includes("provider") || lower.includes("api key") || lower.includes("configured")) {
    return "Voice provider is not ready. Open API settings or switch to mock mode for demo.";
  }

  if (lower.includes("autoplay") || lower.includes("playback")) {
    return "The browser blocked AI audio playback. Click Start Training again or check the speaker permission.";
  }

  if (lower.includes("audio track") || lower.includes("output device")) {
    return "Voice connected, but AI audio is not playing yet. Check output device or restart training.";
  }

  if (
    lower.includes("failed to fetch") ||
    lower.includes("load failed") ||
    lower.includes("networkerror") ||
    lower.includes("cors") ||
    lower.includes("127.0.0.1:7860")
  ) {
    return "Voice service is not running. Start the Python service on 127.0.0.1:7860, then try again.";
  }

  return message || "Voice service is not running. Start the Python service on 127.0.0.1:7860, then try again.";
}
