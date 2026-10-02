# One-Screen Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current scrolling report page with a desktop-first one-screen diagnostic dashboard: top diagnosis hero plus three columns where the middle dialogue-correction column is the primary focus.

**Architecture:** Extend `ReportResult` with optional diagnostic fields, keep fallback derivation so older mock/live responses still render, then extract the report UI into a focused React component. The page keeps the existing app navigation and state flow; only the report rendering and report data shape are upgraded.

**Tech Stack:** React 19, TypeScript, Vite, Zod, Express, Vitest, existing CSS variables and report provider code.

---

## File Structure

- Modify `shared/schemas.ts`: add optional report diagnostic schemas for sentence analyses, pronunciation tips, evidence turns, and next-practice drills.
- Modify `server/providers/reportSchema.ts`: allow live LLM structured outputs to include the new optional fields.
- Modify `server/providers/mockProviders.ts`: return a rich mock report so the competition demo shows professional diagnostics without requiring live API success.
- Modify `server/providers/liveProviders.ts`: normalize optional diagnostic fields and update the report-generation prompt.
- Create `src/reportDiagnostics.ts`: derive fallback report diagnostics from existing `ReportResult` and `conversationTurns`.
- Create `src/components/ReportDashboard.tsx`: render the one-screen report, combined ability/radar card, large correction column, and guidance modals.
- Modify `src/App.tsx`: replace the inline report JSX with `ReportDashboard`.
- Modify `src/styles.css`: add one-screen report layout and modal styling.
- Create `tests/reportDiagnostics.test.ts`: verify fallback derivation and dimension sorting.
- Modify `tests/reportSchema.test.ts`: verify optional live structured fields are allowed.
- Modify `tests/api.test.ts`: verify mock report returns structured diagnostic fields.
- Create `tests/reportDashboard.test.tsx`: verify the rendered report has the three-column structure and guidance buttons.

---

### Task 1: Extend The Shared Report Schema

**Files:**
- Modify: `shared/schemas.ts`
- Test: `tests/reportSchema.test.ts`

- [ ] **Step 1: Add optional diagnostic schemas**

In `shared/schemas.ts`, add these schemas after `correctionSchema`:

```ts
export const sentenceHighlightSchema = z.object({
  originalText: z.string(),
  improvedText: z.string(),
  reasonZh: z.string()
});

export const sentenceAnalysisSchema = z.object({
  original: z.string(),
  improved: z.string(),
  issueType: z.enum(["grammar", "wording", "logic", "pronunciation"]),
  explanationZh: z.string(),
  highlights: z.array(sentenceHighlightSchema)
});

export const pronunciationTipSchema = z.object({
  wordOrPhrase: z.string(),
  issueZh: z.string(),
  tipZh: z.string(),
  example: z.string()
});

export const evidenceTurnSchema = z.object({
  speaker: z.literal("user"),
  text: z.string(),
  reasonZh: z.string()
});

export const nextPracticeSchema = z.object({
  goalZh: z.string(),
  targetSentence: z.string(),
  chunks: z.array(z.string()),
  drills: z.array(z.string())
});
```

Then extend `reportResultSchema`:

```ts
export const reportResultSchema = z.object({
  reportId: z.string(),
  totalScore: z.number(),
  dimensions: z.array(scoreDimensionSchema),
  summaryZh: z.string(),
  corrections: z.array(correctionSchema),
  suggestions: z.array(z.string()),
  coachCommentZh: z.string(),
  provider: z.string(),
  fallback: z.boolean().optional(),
  sentenceAnalyses: z.array(sentenceAnalysisSchema).optional(),
  pronunciationTips: z.array(pronunciationTipSchema).optional(),
  evidenceTurns: z.array(evidenceTurnSchema).optional(),
  nextPractice: nextPracticeSchema.optional()
});
```

Finally add exported types:

```ts
export type SentenceAnalysis = z.infer<typeof sentenceAnalysisSchema>;
export type PronunciationTip = z.infer<typeof pronunciationTipSchema>;
export type EvidenceTurn = z.infer<typeof evidenceTurnSchema>;
export type NextPractice = z.infer<typeof nextPracticeSchema>;
```

- [ ] **Step 2: Run schema-related tests**

Run:

```bash
npm test -- tests/reportSchema.test.ts tests/api.test.ts
```

Expected: `tests/api.test.ts` still passes because the new fields are optional. `tests/reportSchema.test.ts` may fail until Task 2 updates the live JSON schema.

---

### Task 2: Allow Live Report Structured Fields

**Files:**
- Modify: `server/providers/reportSchema.ts`
- Modify: `tests/reportSchema.test.ts`

- [ ] **Step 1: Extend `reportJsonSchema.properties`**

In `server/providers/reportSchema.ts`, add these optional properties under `provider`:

```ts
    sentenceAnalyses: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["original", "improved", "issueType", "explanationZh", "highlights"],
        properties: {
          original: { type: "string" },
          improved: { type: "string" },
          issueType: {
            type: "string",
            enum: ["grammar", "wording", "logic", "pronunciation"]
          },
          explanationZh: { type: "string" },
          highlights: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["originalText", "improvedText", "reasonZh"],
              properties: {
                originalText: { type: "string" },
                improvedText: { type: "string" },
                reasonZh: { type: "string" }
              }
            }
          }
        }
      }
    },
    pronunciationTips: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["wordOrPhrase", "issueZh", "tipZh", "example"],
        properties: {
          wordOrPhrase: { type: "string" },
          issueZh: { type: "string" },
          tipZh: { type: "string" },
          example: { type: "string" }
        }
      }
    },
    evidenceTurns: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["speaker", "text", "reasonZh"],
        properties: {
          speaker: { type: "string", enum: ["user"] },
          text: { type: "string" },
          reasonZh: { type: "string" }
        }
      }
    },
    nextPractice: {
      type: "object",
      additionalProperties: false,
      required: ["goalZh", "targetSentence", "chunks", "drills"],
      properties: {
        goalZh: { type: "string" },
        targetSentence: { type: "string" },
        chunks: { type: "array", items: { type: "string" } },
        drills: { type: "array", items: { type: "string" } }
      }
    }
```

Do not add these fields to the top-level `required` array. They must remain optional for backward compatibility.

- [ ] **Step 2: Add a report schema test for optional fields**

Append this test to `tests/reportSchema.test.ts`:

```ts
  it("allows optional one-screen diagnostic report fields", () => {
    expect(reportJsonSchema.required).not.toContain("sentenceAnalyses");
    expect(reportJsonSchema.properties.sentenceAnalyses.items.required).toEqual([
      "original",
      "improved",
      "issueType",
      "explanationZh",
      "highlights"
    ]);
    expect(reportJsonSchema.properties.pronunciationTips.items.required).toEqual([
      "wordOrPhrase",
      "issueZh",
      "tipZh",
      "example"
    ]);
    expect(reportJsonSchema.properties.evidenceTurns.items.properties.speaker.enum).toEqual(["user"]);
    expect(reportJsonSchema.properties.nextPractice.required).toEqual([
      "goalZh",
      "targetSentence",
      "chunks",
      "drills"
    ]);
  });
```

- [ ] **Step 3: Run the report schema test**

Run:

```bash
npm test -- tests/reportSchema.test.ts
```

Expected: PASS.

---

### Task 3: Return Rich Mock Reports And Normalize Live Reports

**Files:**
- Modify: `server/providers/mockProviders.ts`
- Modify: `server/providers/liveProviders.ts`
- Modify: `tests/api.test.ts`

- [ ] **Step 1: Add rich fields to `mockReport()`**

In `server/providers/mockProviders.ts`, add these fields before `provider: "mock"`:

```ts
    sentenceAnalyses: [
      {
        original: "My role is about to improve the model and the UI style.",
        improved: "My role was to improve the model behavior and polish the UI.",
        issueType: "wording",
        explanationZh: "职责表达应使用 was to；about to 表示“即将要做”，不适合复盘项目经历。",
        highlights: [
          {
            originalText: "about to",
            improvedText: "was to",
            reasonZh: "职责表达要用 was to，而不是“即将要做”。"
          },
          {
            originalText: "the UI style",
            improvedText: "polish the UI",
            reasonZh: "polish the UI 更像项目职责表达，也更自然。"
          }
        ]
      },
      {
        original: "Um, maybe the word or the other things else, maybe.",
        improved: "I improved the prompts and response wording.",
        issueType: "wording",
        explanationZh: "maybe 和 things 让回答显得不确定，应该换成具体动作。",
        highlights: [
          {
            originalText: "maybe",
            improvedText: "confident action",
            reasonZh: "减少不确定语气。"
          },
          {
            originalText: "other things",
            improvedText: "prompts and response wording",
            reasonZh: "用具体项目动作替代泛词。"
          }
        ]
      }
    ],
    pronunciationTips: [
      {
        wordOrPhrase: "project",
        issueZh: "项目类回答中这个词出现频繁，需要稳定重音。",
        tipZh: "名词重音在前，读作 PRO-ject。",
        example: "My PRO-ject improved route planning."
      },
      {
        wordOrPhrase: "model and the UI",
        issueZh: "连续说技术对象时容易吞掉 and。",
        tipZh: "and 可以弱读，但不要完全省略。",
        example: "the model and the UI"
      },
      {
        wordOrPhrase: "result sentence",
        issueZh: "结果句需要更确定的收尾。",
        tipZh: "句尾语调下落，减少 maybe 带来的漂浮感。",
        example: "It reduced route planning time by 30%."
      }
    ],
    evidenceTurns: [
      {
        speaker: "user",
        text: "My role is about to improve the model and the UI style.",
        reasonZh: "这句话暴露出职责表达和项目动作不够自然。"
      },
      {
        speaker: "user",
        text: "Um, maybe the word or the other things else, maybe.",
        reasonZh: "这句话显示表达太泛，缺少具体改动。"
      }
    ],
    nextPractice: {
      goalZh: "用一句话先说项目结果，并加入一个具体数字。",
      targetSentence:
        "My project improved route planning by 30% by making the model responses clearer.",
      chunks: [
        "My project improved route planning",
        "by 30%",
        "by making the model responses clearer"
      ],
      drills: [
        "先慢读三段 chunk。",
        "第二遍把 by 30% 读重一点。",
        "第三遍完整说出目标句。"
      ]
    },
```

- [ ] **Step 2: Normalize optional fields in live reports**

In `server/providers/liveProviders.ts`, add helper functions above `normalizeReportJson`:

```ts
function normalizeSentenceAnalyses(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return value.map((analysis) => {
    const item = typeof analysis === "object" && analysis ? (analysis as Record<string, unknown>) : {};
    const issueType = String(item.issueType ?? "wording");
    const safeIssueType = ["grammar", "wording", "logic", "pronunciation"].includes(issueType)
      ? issueType
      : "wording";
    return {
      original: String(item.original ?? ""),
      improved: String(item.improved ?? ""),
      issueType: safeIssueType,
      explanationZh: String(item.explanationZh ?? item.explanation ?? ""),
      highlights: Array.isArray(item.highlights)
        ? item.highlights.map((highlight) => {
            const h = typeof highlight === "object" && highlight ? (highlight as Record<string, unknown>) : {};
            return {
              originalText: String(h.originalText ?? ""),
              improvedText: String(h.improvedText ?? ""),
              reasonZh: String(h.reasonZh ?? h.reason ?? "")
            };
          })
        : []
    };
  });
}

function normalizePronunciationTips(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return value.map((tip) => {
    const item = typeof tip === "object" && tip ? (tip as Record<string, unknown>) : {};
    return {
      wordOrPhrase: String(item.wordOrPhrase ?? item.word ?? ""),
      issueZh: String(item.issueZh ?? item.issue ?? ""),
      tipZh: String(item.tipZh ?? item.tip ?? ""),
      example: String(item.example ?? "")
    };
  });
}

function normalizeEvidenceTurns(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return value.map((turn) => {
    const item = typeof turn === "object" && turn ? (turn as Record<string, unknown>) : {};
    return {
      speaker: "user" as const,
      text: String(item.text ?? ""),
      reasonZh: String(item.reasonZh ?? item.reason ?? "")
    };
  });
}

function normalizeNextPractice(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const item = value as Record<string, unknown>;
  return {
    goalZh: String(item.goalZh ?? ""),
    targetSentence: String(item.targetSentence ?? ""),
    chunks: Array.isArray(item.chunks) ? item.chunks.map(String) : [],
    drills: Array.isArray(item.drills) ? item.drills.map(String) : []
  };
}
```

Then add these fields in `normalizeReportJson` return object:

```ts
    sentenceAnalyses: normalizeSentenceAnalyses(raw.sentenceAnalyses),
    pronunciationTips: normalizePronunciationTips(raw.pronunciationTips),
    evidenceTurns: normalizeEvidenceTurns(raw.evidenceTurns),
    nextPractice: normalizeNextPractice(raw.nextPractice),
```

- [ ] **Step 3: Update live report prompt**

In `generateReportWithLlm`, replace the strict key instruction:

```ts
"The JSON keys must be reportId, totalScore, dimensions, summaryZh, corrections, suggestions, coachCommentZh, provider.",
```

with:

```ts
"The required JSON keys must be reportId, totalScore, dimensions, summaryZh, corrections, suggestions, coachCommentZh, provider.",
"Also include optional diagnostic keys when possible: sentenceAnalyses, pronunciationTips, evidenceTurns, nextPractice.",
"sentenceAnalyses must include original, improved, issueType, explanationZh, and highlights with originalText, improvedText, reasonZh.",
"pronunciationTips must include wordOrPhrase, issueZh, tipZh, example.",
"evidenceTurns should include 2-3 user utterances from the conversation that justify the correction.",
"nextPractice must include goalZh, targetSentence, chunks, drills.",
```

- [ ] **Step 4: Extend API test**

In `tests/api.test.ts`, inside `"generates a report that matches the public schema"`, add:

```ts
    expect(parsed.sentenceAnalyses?.[0].highlights[0].reasonZh).toBeTruthy();
    expect(parsed.pronunciationTips?.[0].wordOrPhrase).toBeTruthy();
    expect(parsed.evidenceTurns?.[0].speaker).toBe("user");
    expect(parsed.nextPractice?.targetSentence).toContain("project");
```

- [ ] **Step 5: Run API tests**

Run:

```bash
npm test -- tests/api.test.ts tests/reportSchema.test.ts
```

Expected: PASS.

---

### Task 4: Add Report Diagnostic Fallback Helpers

**Files:**
- Create: `src/reportDiagnostics.ts`
- Create: `tests/reportDiagnostics.test.ts`

- [ ] **Step 1: Create `src/reportDiagnostics.ts`**

Create this file:

```ts
import type { ConversationTurn, EvidenceTurn, NextPractice, PronunciationTip, ReportResult, SentenceAnalysis } from "../shared/schemas";

export type ReportDiagnostics = {
  sortedDimensions: ReportResult["dimensions"];
  strongestDimension: ReportResult["dimensions"][number] | null;
  weakestDimension: ReportResult["dimensions"][number] | null;
  evidenceTurns: EvidenceTurn[];
  primaryAnalysis: SentenceAnalysis | null;
  secondaryAnalysis: SentenceAnalysis | null;
  pronunciationTips: PronunciationTip[];
  nextPractice: NextPractice;
};

export function createReportDiagnostics(
  report: ReportResult,
  turns: ConversationTurn[],
  targetGoal: string
): ReportDiagnostics {
  const sortedDimensions = [...report.dimensions].sort((a, b) => b.score - a.score);
  const strongestDimension = sortedDimensions[0] ?? null;
  const weakestDimension = sortedDimensions[sortedDimensions.length - 1] ?? null;
  const sentenceAnalyses = report.sentenceAnalyses?.length
    ? report.sentenceAnalyses
    : createFallbackSentenceAnalyses(report);

  return {
    sortedDimensions,
    strongestDimension,
    weakestDimension,
    evidenceTurns: report.evidenceTurns?.length ? report.evidenceTurns : createFallbackEvidenceTurns(turns),
    primaryAnalysis: sentenceAnalyses[0] ?? null,
    secondaryAnalysis: sentenceAnalyses[1] ?? null,
    pronunciationTips: report.pronunciationTips?.length ? report.pronunciationTips : createFallbackPronunciationTips(turns),
    nextPractice: report.nextPractice ?? createFallbackNextPractice(report, targetGoal)
  };
}

function createFallbackSentenceAnalyses(report: ReportResult): SentenceAnalysis[] {
  return report.corrections.slice(0, 2).map((correction) => ({
    original: correction.original,
    improved: correction.improved,
    issueType: "grammar",
    explanationZh: correction.explanationZh,
    highlights: [
      {
        originalText: firstMeaningfulToken(correction.original),
        improvedText: firstMeaningfulToken(correction.improved),
        reasonZh: correction.explanationZh
      }
    ]
  }));
}

function createFallbackEvidenceTurns(turns: ConversationTurn[]): EvidenceTurn[] {
  return turns
    .filter((turn) => turn.speaker === "user" && turn.text.trim().length > 0)
    .slice(-3)
    .map((turn) => ({
      speaker: "user",
      text: turn.text,
      reasonZh: "这句话用于判断本轮表达、语法和任务完成情况。"
    }));
}

function createFallbackPronunciationTips(turns: ConversationTurn[]): PronunciationTip[] {
  const userText = turns
    .filter((turn) => turn.speaker === "user")
    .map((turn) => turn.text)
    .join(" ")
    .toLowerCase();

  const tips: PronunciationTip[] = [
    {
      wordOrPhrase: "project",
      issueZh: "项目类回答中这个词出现频繁，需要稳定重音。",
      tipZh: "名词重音在前，读作 PRO-ject。",
      example: "My PRO-ject improved route planning."
    },
    {
      wordOrPhrase: "result sentence",
      issueZh: "结论句需要更确定的收尾。",
      tipZh: "句尾语调下落，减少不确定感。",
      example: "It reduced route planning time by 30%."
    }
  ];

  if (userText.includes("model") || userText.includes("ui")) {
    tips.splice(1, 0, {
      wordOrPhrase: "model and the UI",
      issueZh: "连续说技术对象时容易吞掉 and。",
      tipZh: "and 可以弱读，但不要完全省略。",
      example: "the model and the UI"
    });
  }

  return tips.slice(0, 3);
}

function createFallbackNextPractice(report: ReportResult, targetGoal: string): NextPractice {
  const targetSentence =
    report.suggestions.find((suggestion) => /project|项目|result|结果/i.test(suggestion)) ||
    "My project improved the user experience by making the result clearer.";

  return {
    goalZh: targetGoal || "用一句话先说项目结果，并加入一个具体数字。",
    targetSentence,
    chunks: splitSentenceIntoChunks(targetSentence),
    drills: ["先慢读每个 chunk。", "第二遍强调数字或结果。", "第三遍完整说出目标句。"]
  };
}

function splitSentenceIntoChunks(sentence: string) {
  const words = sentence.split(/\s+/).filter(Boolean);
  if (words.length <= 6) return [sentence];
  const size = Math.ceil(words.length / 3);
  return [words.slice(0, size), words.slice(size, size * 2), words.slice(size * 2)]
    .map((chunk) => chunk.join(" "))
    .filter(Boolean);
}

function firstMeaningfulToken(value: string) {
  return value.split(/\s+/).find((token) => token.replace(/[^\w]/g, "").length > 2) ?? value;
}
```

- [ ] **Step 2: Add fallback tests**

Create `tests/reportDiagnostics.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ConversationTurn, ReportResult } from "../shared/schemas";
import { createReportDiagnostics } from "../src/reportDiagnostics";

const report: ReportResult = {
  reportId: "report_test",
  totalScore: 84,
  dimensions: [
    { id: "fluency", labelZh: "流利度", labelEn: "Fluency", score: 85, explanationZh: "" },
    { id: "pronunciation", labelZh: "发音清晰度", labelEn: "Pronunciation", score: 82, explanationZh: "" },
    { id: "grammar", labelZh: "语法准确度", labelEn: "Grammar", score: 80, explanationZh: "" },
    { id: "vocabulary", labelZh: "词汇表达", labelEn: "Vocabulary", score: 84, explanationZh: "" },
    { id: "coherence", labelZh: "连贯性", labelEn: "Coherence", score: 83, explanationZh: "" },
    { id: "task_completion", labelZh: "任务完成度", labelEn: "Task Completion", score: 88, explanationZh: "" },
    { id: "interaction", labelZh: "互动回应", labelEn: "Interaction", score: 81, explanationZh: "" }
  ],
  summaryZh: "整体清楚。",
  corrections: [
    {
      original: "I built campus navigation app.",
      improved: "I built a campus navigation app.",
      explanationZh: "需要补冠词 a。"
    }
  ],
  suggestions: ["My project improved the route planning result by 30%."],
  coachCommentZh: "表达还可以更具体。",
  provider: "mock"
};

const turns: ConversationTurn[] = [
  {
    id: "turn_1",
    speaker: "user",
    text: "My role is about to improve the model and the UI style.",
    timestamp: "2026-06-06T12:00:00.000Z"
  },
  {
    id: "turn_2",
    speaker: "user",
    text: "Maybe the word or other things.",
    timestamp: "2026-06-06T12:01:00.000Z"
  }
];

describe("createReportDiagnostics", () => {
  it("derives strongest and weakest dimensions", () => {
    const diagnostics = createReportDiagnostics(report, turns, "把项目结果说清楚");

    expect(diagnostics.strongestDimension?.id).toBe("task_completion");
    expect(diagnostics.weakestDimension?.id).toBe("grammar");
  });

  it("falls back to user turns and correction data when rich fields are missing", () => {
    const diagnostics = createReportDiagnostics(report, turns, "把项目结果说清楚");

    expect(diagnostics.evidenceTurns).toHaveLength(2);
    expect(diagnostics.primaryAnalysis?.highlights[0].reasonZh).toContain("冠词");
    expect(diagnostics.pronunciationTips.some((tip) => tip.wordOrPhrase.includes("model"))).toBe(true);
    expect(diagnostics.nextPractice.chunks.length).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 3: Run diagnostic tests**

Run:

```bash
npm test -- tests/reportDiagnostics.test.ts
```

Expected: PASS.

---

### Task 5: Extract The One-Screen Report Component

**Files:**
- Create: `src/components/ReportDashboard.tsx`
- Modify: `src/App.tsx`
- Create: `tests/reportDashboard.test.tsx`

- [ ] **Step 1: Create `ReportDashboard` component**

Create `src/components/ReportDashboard.tsx` with this public API:

```ts
import { useMemo, useState } from "react";
import type { ConversationTurn, ReportResult } from "../../shared/schemas";
import type { Scenario } from "../../server/data";
import { createReportDiagnostics } from "../reportDiagnostics";

type ReportModal = "none" | "dialogue" | "expression" | "pronunciation" | "drill";

export function ReportDashboard({
  report,
  conversationTurns,
  scenario,
  targetGoal,
  onChangeTask,
  onPracticeAgain
}: {
  report: ReportResult;
  conversationTurns: ConversationTurn[];
  scenario: Scenario;
  targetGoal: string;
  onChangeTask: () => void;
  onPracticeAgain: () => void;
}) {
  const [modal, setModal] = useState<ReportModal>("none");
  const diagnostics = useMemo(
    () => createReportDiagnostics(report, conversationTurns, targetGoal),
    [report, conversationTurns, targetGoal]
  );

  return (
    <section className="one-report" aria-label="课后诊断报告">
      <ReportHero report={report} scenario={scenario} targetGoal={targetGoal} diagnostics={diagnostics} />
      <div className="one-report-body">
        <AbilityDiagnosis dimensions={report.dimensions} diagnostics={diagnostics} />
        <DialogueCorrection diagnostics={diagnostics} onOpenDialogue={() => setModal("dialogue")} />
        <GuidanceColumn
          diagnostics={diagnostics}
          onOpenExpression={() => setModal("expression")}
          onOpenPronunciation={() => setModal("pronunciation")}
          onOpenDrill={() => setModal("drill")}
          onPracticeAgain={onPracticeAgain}
        />
      </div>
      <ReportModalLayer
        modal={modal}
        report={report}
        turns={conversationTurns}
        diagnostics={diagnostics}
        onClose={() => setModal("none")}
        onPracticeAgain={onPracticeAgain}
        onChangeTask={onChangeTask}
      />
    </section>
  );
}
```

Inside the same file, implement local subcomponents:

- `ReportHero`
- `AbilityDiagnosis`
- `MiniAbilityRadar`
- `DialogueCorrection`
- `GuidanceColumn`
- `GuidanceButton`
- `ReportModalLayer`
- `ConversationModal`
- `ExpressionModal`
- `PronunciationModal`
- `DrillModal`

Use existing `ConversationLog` logic from `App.tsx` inside this file or recreate it locally.

- [ ] **Step 2: Render the report component from `App.tsx`**

In `src/App.tsx`, import:

```ts
import { ReportDashboard } from "./components/ReportDashboard";
```

Replace the current `screen === "report"` block with:

```tsx
      {screen === "report" && report && (
        <ReportDashboard
          report={report}
          conversationTurns={conversationTurns}
          scenario={scenario}
          targetGoal={task.focus}
          onChangeTask={() => setScreen("prep")}
          onPracticeAgain={enterPracticeRoom}
        />
      )}
```

Remove `AbilityRadar` and `ConversationLog` from `App.tsx` if they become unused.

- [ ] **Step 3: Add render test**

Create `tests/reportDashboard.test.tsx`:

```ts
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReportDashboard } from "../src/components/ReportDashboard";
import type { ConversationTurn, ReportResult } from "../shared/schemas";
import type { Scenario } from "../server/data";

const scenario: Scenario = {
  id: "interview",
  nameZh: "面试",
  nameEn: "Interview",
  descriptionZh: "练习面试",
  tasks: []
};

const report: ReportResult = {
  reportId: "report_test",
  totalScore: 84,
  dimensions: [
    { id: "fluency", labelZh: "流利度", labelEn: "Fluency", score: 85, explanationZh: "" },
    { id: "pronunciation", labelZh: "发音清晰度", labelEn: "Pronunciation", score: 82, explanationZh: "" },
    { id: "grammar", labelZh: "语法准确度", labelEn: "Grammar", score: 80, explanationZh: "" },
    { id: "vocabulary", labelZh: "词汇表达", labelEn: "Vocabulary", score: 84, explanationZh: "" },
    { id: "coherence", labelZh: "连贯性", labelEn: "Coherence", score: 83, explanationZh: "" },
    { id: "task_completion", labelZh: "任务完成度", labelEn: "Task Completion", score: 88, explanationZh: "" },
    { id: "interaction", labelZh: "互动回应", labelEn: "Interaction", score: 81, explanationZh: "" }
  ],
  summaryZh: "整体清楚。",
  corrections: [
    {
      original: "My role is about to improve the model.",
      improved: "My role was to improve the model.",
      explanationZh: "职责表达应使用 was to。"
    }
  ],
  suggestions: ["My project improved route planning by 30%."],
  coachCommentZh: "语法还算稳，但表达太泛。",
  provider: "mock"
};

const turns: ConversationTurn[] = [
  {
    id: "turn_1",
    speaker: "user",
    text: "My role is about to improve the model.",
    timestamp: "2026-06-06T12:00:00.000Z"
  }
];

describe("ReportDashboard", () => {
  it("renders the selected one-screen report structure", () => {
    const markup = renderToStaticMarkup(
      <ReportDashboard
        report={report}
        conversationTurns={turns}
        scenario={scenario}
        targetGoal="把项目结果说清楚"
        onChangeTask={() => undefined}
        onPracticeAgain={() => undefined}
      />
    );

    expect(markup).toContain("one-report");
    expect(markup).toContain("能力诊断");
    expect(markup).toContain("对话纠错");
    expect(markup).toContain("提升指导");
    expect(markup).toContain("表达优化");
    expect(markup).toContain("发音技巧");
    expect(markup).toContain("推荐重练句");
    expect(markup).toContain("查看完整对话");
  });
});
```

- [ ] **Step 4: Run component tests**

Run:

```bash
npm test -- tests/reportDashboard.test.tsx tests/reportDiagnostics.test.ts
```

Expected: PASS.

---

### Task 6: Add One-Screen Report Styling

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Add desktop report layout classes**

Add these styles near the existing `/* Learning diagnostic report */` section:

```css
.one-report {
  display: grid;
  gap: 14px;
}

.one-report-hero {
  display: grid;
  grid-template-columns: 150px 1fr 270px;
  align-items: center;
  gap: 24px;
  min-height: 154px;
  border-radius: 26px;
  padding: 24px 32px;
  background: linear-gradient(135deg, var(--feather-green), var(--mask-green));
  color: #fff;
}

.one-report-body {
  display: grid;
  grid-template-columns: minmax(250px, 0.88fr) minmax(420px, 1.38fr) minmax(260px, 0.86fr);
  gap: 14px;
  min-height: 610px;
}

.report-ability-panel,
.report-correction-panel,
.report-guidance-panel {
  min-width: 0;
}

.report-correction-panel {
  border-color: var(--mask-green);
}

.report-guide-button {
  display: flex;
  width: 100%;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  border: 2px solid #d7ead0;
  border-radius: 17px;
  padding: 12px 14px;
  background: #fff;
  color: var(--eel);
  cursor: pointer;
  text-align: left;
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}

.report-guide-button:hover {
  transform: translateY(-2px);
  border-color: var(--feather-green);
  box-shadow: 0 10px 24px rgba(88, 204, 2, 0.16);
}

.report-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 32px;
  background: rgba(24, 30, 26, 0.34);
}

.report-modal-card {
  width: min(560px, 100%);
  max-height: min(720px, calc(100vh - 64px));
  overflow: auto;
  border: 2px solid var(--swan);
  border-radius: 24px;
  padding: 20px;
  background: #fff;
  box-shadow: 0 26px 80px rgba(24, 30, 26, 0.22);
}

.report-diff-bad {
  border-bottom: 3px solid #ff6b6b;
  border-radius: 5px;
  padding: 1px 4px;
  background: #ffe8e8;
  color: #a62626;
}

.report-diff-good {
  border-bottom: 3px solid var(--feather-green);
  border-radius: 5px;
  padding: 1px 4px;
  background: #e8ffd8;
  color: #2a9400;
}
```

Then add a desktop fallback:

```css
@media (max-width: 1100px) {
  .one-report-hero,
  .one-report-body {
    grid-template-columns: 1fr;
  }
}
```

Use existing variables. Avoid new color systems beyond necessary red/green diff marks.

- [ ] **Step 2: Run build**

Run:

```bash
npm run build
```

Expected: PASS. Existing Vite chunk warning may remain.

---

### Task 7: Browser Verification And Screenshot Acceptance

**Files:**
- No source changes unless visual verification reveals issues.

- [ ] **Step 1: Start or reuse the local dev server**

Run:

```bash
npm run dev
```

Expected:

```text
Frontend: http://127.0.0.1:5173/
API: http://127.0.0.1:5174/
```

- [ ] **Step 2: Generate or navigate to a report**

Use the app in mock or live mode to reach the report page:

```text
Home -> Start 5-minute practice -> Start training -> End training -> Generate report
```

If voice service is not running, use mock API mode or any existing report flow that reaches `screen === "report"`.

- [ ] **Step 3: Verify desktop layout**

Use Browser screenshot at `http://127.0.0.1:5173/`.

Checklist:

- Top hero is visible without overlap.
- Three columns are visible below the hero.
- Middle dialogue-correction column is visibly widest.
- Ability bars and radar chart are in one card.
- Full conversation is not inline; "查看完整对话" opens a modal.
- Third column shows exactly three guidance buttons.
- Each guidance button opens a lightweight modal.
- Word-level bad/good highlights are readable.
- No text overflows buttons or cards.

- [ ] **Step 4: Run final verification**

Run:

```bash
npm test
npm run build
```

Expected: all tests pass and production build succeeds.

- [ ] **Step 5: Commit only after verification and visual acceptance**

After the user accepts the screenshot:

```bash
git add shared/schemas.ts server/providers/reportSchema.ts server/providers/mockProviders.ts server/providers/liveProviders.ts src/reportDiagnostics.ts src/components/ReportDashboard.tsx src/App.tsx src/styles.css tests/reportDiagnostics.test.ts tests/reportSchema.test.ts tests/api.test.ts tests/reportDashboard.test.tsx docs/superpowers/specs/2026-06-06-one-screen-report-design.md docs/superpowers/plans/2026-06-06-one-screen-report-implementation.md
git commit -m "feat: add one-screen diagnostic report"
```

Do not push unless the user explicitly asks.

---

## Self-Review

- Spec coverage: The plan covers the one-screen layout, top hero, three columns, wider middle correction column, merged ability/radar card, full conversation modal, three guidance buttons, lightweight guidance modals, word-level diff, pronunciation tips, and fallback rendering.
- Placeholder scan: No task uses TBD, TODO, or unspecified "add tests" language. Each task names exact files, expected code, and commands.
- Type consistency: Optional fields are introduced in `shared/schemas.ts`, permitted in `server/providers/reportSchema.ts`, normalized in `liveProviders.ts`, provided by `mockReport`, derived through `createReportDiagnostics`, and rendered by `ReportDashboard`.
