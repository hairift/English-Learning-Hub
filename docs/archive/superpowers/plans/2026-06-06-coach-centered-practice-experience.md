# Coach-Centered Practice Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Pipecat realtime practice room feel like a live coach-led speaking session by keeping the original animated coach as the visual and state center.

**Architecture:** React owns learner-facing practice state, friendly copy, and layout; Node remains the source of truth for `practice_session`, `conversation_turns`, and reports; Pipecat remains the realtime voice pipeline. The implementation adds a small pure frontend copy module so status/error behavior is testable without mounting the whole app.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, lucide-react, existing `CoachAvatar` / `MascotAvatar`, Pipecat client over WebRTC.

---

## File Structure

- Create `src/practiceExperience.ts`: pure helpers for practice status labels, coach-stage state copy, helper text, and friendly start/connect error mapping.
- Create `tests/practiceExperience.test.ts`: Vitest coverage for learner-facing state and error copy.
- Modify `src/App.tsx`: use the helper module, add Pipecat health preflight, keep the three-button interaction, make the coach stage the primary state center, and remove visible pipeline/debug copy.
- Modify `src/api.ts`: expose a small Pipecat health check using `VITE_PIPECAT_BASE_URL`.
- Modify `src/pipecatVoiceClient.ts`: align autoplay and connection error messages with the friendly copy contract.
- Modify `src/components/CoachAvatar.tsx`: keep the original mascot while changing status labels to learner-facing coach states.
- Modify `src/styles.css`: enlarge and center the original coach in the practice room, add listening/speaking state treatments, keep the right panel as a clean complete-turn log, and preserve mobile order.

---

### Task 1: Learner-Facing Practice Copy

**Files:**
- Create: `src/practiceExperience.ts`
- Create: `tests/practiceExperience.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import {
  getPracticeExperienceCopy,
  mapPracticeStartError,
  practiceStatusLabel,
  type PracticeStatus
} from "../src/practiceExperience";

describe("practice experience copy", () => {
  it("maps technical practice states to learner-facing labels", () => {
    const labels: Record<PracticeStatus, string> = {
      idle: "Ready when you are",
      connecting: "Checking microphone and voice connection",
      listening: "I'm listening",
      thinking: "Thinking about your answer",
      speaking: "I'm replying",
      ended: "Practice ended. Ready for your report",
      completed: "Report ready"
    };

    for (const [status, label] of Object.entries(labels) as Array<[PracticeStatus, string]>) {
      expect(practiceStatusLabel(status)).toBe(label);
      expect(getPracticeExperienceCopy({ status }).headline).toBe(label);
    }
  });

  it("keeps ended sessions focused on report generation", () => {
    expect(getPracticeExperienceCopy({ status: "ended" }).helper).toContain("full conversation");
  });

  it("maps common connection failures to specific guidance", () => {
    expect(mapPracticeStartError(new TypeError("Failed to fetch"))).toContain("Voice service is not running");
    expect(mapPracticeStartError(new DOMException("Permission denied", "NotAllowedError"))).toContain("Microphone permission");
    expect(mapPracticeStartError(new Error("provider is not configured"))).toContain("Voice provider is not ready");
  });
});
```

- [ ] **Step 2: Run the new test and confirm it fails**

Run: `npm test -- tests/practiceExperience.test.ts`

Expected: FAIL because `src/practiceExperience.ts` does not exist yet.

- [ ] **Step 3: Implement the helper module**

```ts
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
  if (error) return { headline: statusLabels[status], helper: error };
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
  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("127.0.0.1:7860")) {
    return "Voice service is not running. Start the Python service on 127.0.0.1:7860, then try again.";
  }
  return message || "Voice service is not running. Start the Python service on 127.0.0.1:7860, then try again.";
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/practiceExperience.test.ts`

Expected: PASS.

---

### Task 2: Start Flow Preflight And Friendly Errors

**Files:**
- Modify: `src/api.ts`
- Modify: `src/App.tsx`
- Modify: `src/pipecatVoiceClient.ts`

- [ ] **Step 1: Add Pipecat health check API**

Add:

```ts
export async function checkPipecatHealth() {
  const baseUrl = import.meta.env.VITE_PIPECAT_BASE_URL || "http://127.0.0.1:7860";
  const response = await fetch(new URL("/health", baseUrl));
  if (!response.ok) {
    throw new Error(`Pipecat health check failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as { status?: string; providers?: unknown };
}
```

- [ ] **Step 2: Use friendly error mapping in `startConversation`**

In `src/App.tsx`, import `checkPipecatHealth`, `PracticeStatus`, `getPracticeExperienceCopy`, `mapPracticeStartError`, and `practiceStatusLabel`. Before `api.startSession(...)`, call `await checkPipecatHealth();`. In the catch block, replace raw `error.message` display with `mapPracticeStartError(error)`.

- [ ] **Step 3: Align Pipecat client error text**

In `src/pipecatVoiceClient.ts`, replace autoplay and generic Pipecat error strings with the learner-facing messages from the spec:

```ts
callbacks.onError("The browser blocked AI audio playback. Click Start Training again or check the speaker permission.");
callbacks.onError(data?.message || "Voice service is not running. Start the Python service on 127.0.0.1:7860, then try again.");
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

---

### Task 3: Coach-Centered Practice Room Markup

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/CoachAvatar.tsx`

- [ ] **Step 1: Compute stage copy**

Add near other `useMemo` calls:

```ts
const practiceCopy = useMemo(
  () => getPracticeExperienceCopy({ status: practiceStatus, busy, error: startError }),
  [busy, practiceStatus, startError]
);
```

- [ ] **Step 2: Replace the practice-room stage**

Replace the current `stage dialogue-room` contents with:

```tsx
<div className={`stage dialogue-room practice-${practiceStatus}`}>
  <div className="coach-focus">
    <div className="coach-prompt">{latestAiText || "Click Start Training and your coach will begin the conversation."}</div>
    <div className="coach-avatar-wrap">
      <CoachAvatar state={coachState} size={230} />
    </div>
    <div className="coach-state-panel" aria-live="polite">
      <span>{practiceCopy.headline}</span>
      <p>{practiceCopy.helper}</p>
    </div>
  </div>
  <div className="voice-primary-controls" aria-label="实时训练控制">...</div>
  <p className="muted stage-note">Pause briefly when you finish; your coach will respond automatically.</p>
</div>
```

Keep the existing three buttons unchanged in behavior.

- [ ] **Step 3: Remove learner-visible pipeline copy**

Delete the `mic-status` line that says `Pipecat Voice Agent 已接管 VAD / STT / LLM / TTS`, and do not add any new VAD/STT/LLM/TTS text to the practice room.

- [ ] **Step 4: Update avatar status labels**

Change `STATUS_ZH` in `src/components/CoachAvatar.tsx` to:

```ts
const STATUS_ZH: Record<CoachState, string> = {
  idle: "准备陪你练",
  listening: "正在听你说",
  thinking: "思考你的回答",
  asking: "正在回应你",
  reviewing: "整理练习报告",
  celebrating: "报告已完成"
};
```

---

### Task 4: Responsive Visual Polish

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Replace continuous conversation room styles**

Update the bottom `/* Continuous conversation room */` section so `.stage.dialogue-room` has a coach-centered grid, `.coach-focus` centers the original avatar, `.coach-state-panel` replaces `.mic-status`, `.practice-listening .coach-avatar-wrap` adds a subtle listening ring, `.practice-speaking .coach-avatar-wrap` adds a speaking pulse, and `.voice-log-side` remains a clean complete-turn panel.

- [ ] **Step 2: Add mobile constraints**

In the existing `@media (max-width: 900px)` block, keep one-column buttons, reduce `CoachAvatar` container width with CSS rather than changing the component identity, and ensure the coach remains above the conversation log.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

---

### Task 5: Verification And Commit

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run frontend tests**

Run: `npm test`

Expected: all Vitest tests pass.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 3: Compile Python Pipecat service**

Run: `python3 -m py_compile pipecat_service/server.py pipecat_service/bot.py`

Expected: no output and exit code 0.

- [ ] **Step 4: Check local service health**

Run:

```bash
curl -s http://127.0.0.1:5174/api/health
curl -s http://127.0.0.1:7860/health
```

Expected: Node API returns provider health JSON; Pipecat returns health JSON if the Python service is running.

- [ ] **Step 5: Browser visual verification**

Open the Vite app, enter the practice room, capture desktop and narrow viewport screenshots, and check that:

- The original animated coach is prominent and centered.
- No visible learner copy mentions VAD/STT/LLM/TTS.
- Only three core buttons are present.
- Right panel contains complete-turn log only.
- Mobile layout shows coach stage before the log.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/practiceExperience.ts tests/practiceExperience.test.ts src/api.ts src/App.tsx src/pipecatVoiceClient.ts src/components/CoachAvatar.tsx src/styles.css docs/superpowers/plans/2026-06-06-coach-centered-practice-experience.md
git commit -m "feat: center coach in realtime practice"
```

Expected: commit succeeds.

---

## Self-Review

- Spec coverage: The plan covers the coach-centered stage, original mascot preservation, three-button flow, Pipecat preflight, friendly errors, complete-turn log, end/report state, and verification.
- Placeholder scan: No TBD/TODO/fill-in-later placeholders remain.
- Type consistency: `PracticeStatus` is centralized in `src/practiceExperience.ts` and imported by `src/App.tsx`.
