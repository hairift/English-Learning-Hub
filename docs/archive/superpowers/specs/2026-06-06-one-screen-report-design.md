# One-Screen Report Design

## Goal

Redesign the report page details into a desktop-first one-screen diagnostic dashboard without changing the app's three-page structure. The report should prove that the product analyzed the full conversation, identified concrete language issues, and produced actionable next-practice guidance.

## Product Position

The report page is not just a score result. It is the proof layer for the competition requirements:

- pronunciation assessment
- grammar and expression correction
- after-class summary
- quantifiable speaking feedback
- next-step practice guidance

The page should feel compact, professional, and coaching-oriented. It should keep the current bright green brand style, but reduce vertical sprawl.

## Layout

Use a desktop one-screen structure:

```text
Top diagnosis hero
  score + one-line diagnosis + completed goal + next focus

Three-column diagnostic body
  Column 1: Ability diagnosis
  Column 2: Dialogue correction
  Column 3: Improvement guidance
```

The report should fit comfortably on a typical desktop viewport around 1440 x 900. Mobile is not a priority for this iteration.

Column width should prioritize the middle correction column:

```text
Ability diagnosis: compact support column
Dialogue correction: widest primary column
Improvement guidance: compact action column
```

The middle column should carry the most visual weight because it is the strongest evidence that the model analyzed this specific conversation rather than producing a generic score summary.

Final selected preset:

- Keep the top diagnosis hero.
- Use three columns below the hero.
- Make the middle dialogue-correction column the widest and most visually important column.
- Merge ability bars and radar chart into the left ability-diagnosis column.
- Keep the right improvement-guidance column compact.
- Use three guidance buttons in the right column.
- Open guidance details in lightweight modals.
- Move full conversation replay into a modal instead of showing it inline.

## Top Diagnosis Hero

The top hero keeps the current high-energy green score card, but its content becomes more diagnostic.

Required content:

- total score
- scenario label
- target goal
- one-line coach diagnosis
- strongest issue or next focus

Example copy:

```text
84 / 100
语法还算稳，但表达太泛。下一轮加一个具体数字。
完成目标：把项目结果说清楚
本次最该补强：结果量化表达
```

The diagnosis should be direct and constructive. It can carry the virtual coach tone, but should not become sarcastic or vague.

## Column 1: Ability Diagnosis

Merge the current ability bars and radar chart into one card.

Required content:

- compact dimension score bars
- mini radar chart in the same card
- strongest dimension
- weakest dimension

Keep the existing seven report dimensions because the backend schema and competition requirement already support them:

- fluency
- pronunciation
- grammar
- vocabulary
- coherence
- task_completion
- interaction

If the visual card title uses "五维能力" in current copy, update the label to avoid contradicting the seven-dimension data. Use "能力诊断" or "七维能力".

Do not show long dimension explanations in the main card. If explanation text is needed, show it through a tooltip or detail popover.

## Column 2: Dialogue Correction

This is the most important column because it proves the report is based on the actual conversation.

Main report content:

- 2-3 key evidence turns from the user's speech
- one or two high-value sentence corrections
- word-level or phrase-level diff marks
- Chinese explanation for why each correction matters
- a "查看完整对话" action that opens a modal

This column should be wider than the ability and guidance columns. The wider space is used for readable evidence snippets and inline phrase-level contrast marking.

Full conversation should not occupy the main report page. It should be available in a modal so the report remains one-screen.

Correction display rules:

- Original text uses muted color or deletion styling.
- Problematic words or phrases are highlighted in red.
- Improved words or phrases are highlighted in green.
- Each highlight has a short Chinese reason.

Example:

```text
Original:
My role is about to improve the model and the UI style.

Better:
My role was to improve the model behavior and polish the UI.

about to -> was to
原因：职责表达应用 was to；about to 表示“即将要做”，不适合复盘项目经历。

the UI style -> polish the UI
原因：polish the UI 更像项目职责表达，也更自然。
```

## Column 3: Improvement Guidance

The third column should not show long advice directly. It should show three professional guidance buttons. Clicking a button opens a lightweight modal without changing the main report layout.

Buttons:

1. 表达优化
2. 发音技巧
3. 推荐重练句

Each button shows:

- title
- one-line summary
- status tag or action label

Example:

```text
表达优化
减少 maybe / things，先说结果，再补数字
查看

发音技巧
重音、连读、弱读、句尾语调
查看

推荐重练句
直接朗读一句更自然的项目回答
开始
```

## Guidance Modal Behavior

Use lightweight modal overlays for all three guidance details. Do not use in-column accordion expansion because it breaks the one-screen layout.

The modal should:

- open from the selected guidance button
- keep the report page visible behind it
- provide a clear close action
- avoid blocking the page with oversized content
- use compact sections and short examples

### Expression Optimization Modal

Content should be based on this session's conversation text.

Show:

- vague or repeated expressions detected in the user's answer
- a better structure
- replacement phrases
- a short drill

Example content:

```text
问题：你多次使用 maybe / things，表达显得不确定。
推荐结构：Result -> Action -> Evidence
替代表达：I improved the model prompts and made the UI flow clearer.
训练：用一句话先说项目结果，再补一个数字。
```

### Pronunciation Tips Modal

Content should be based on transcript confidence and conversation text when live pronunciation data is limited.

Show:

- word or phrase
- issue in Chinese
- pronunciation tip
- short readable example

Example content:

```text
project
名词重音在前：PRO-ject。

model and the UI
and 可以弱读，但不要完全吞掉。

result sentence
句尾语调下落，让回答听起来更确定。
```

### Recommended Drill Modal

Show one immediately repeatable sentence and break it into chunks.

Example:

```text
Target sentence:
My project improved route planning by 30% by making the model responses clearer.

Chunk 1: My project improved route planning
Chunk 2: by 30%
Chunk 3: by making the model responses clearer
```

Include a CTA:

```text
用这句再练一轮
```

The CTA can route back to the practice room with the same scenario and a more specific target goal.

## Data Model Implications

The existing `ReportResult` is enough for the current simple report, but not enough for a professional diagnostic report.

Add optional structured fields so old mock/live reports remain renderable:

```ts
sentenceAnalyses?: Array<{
  original: string;
  improved: string;
  issueType: "grammar" | "wording" | "logic" | "pronunciation";
  explanationZh: string;
  highlights: Array<{
    originalText: string;
    improvedText: string;
    reasonZh: string;
  }>;
}>;

pronunciationTips?: Array<{
  wordOrPhrase: string;
  issueZh: string;
  tipZh: string;
  example: string;
}>;

evidenceTurns?: Array<{
  speaker: "user";
  text: string;
  reasonZh: string;
}>;

nextPractice?: {
  goalZh: string;
  targetSentence: string;
  chunks: string[];
  drills: string[];
};
```

Fallback behavior:

- If `sentenceAnalyses` is missing, derive one simple analysis from `corrections[0]`.
- If `pronunciationTips` is missing, generate static tips from common project-interview phrases and low-confidence words when available.
- If `evidenceTurns` is missing, show the latest 2-3 user turns.
- If `nextPractice` is missing, derive the target sentence from `suggestions[0]` or a safe default based on the task goal.

## Visual Constraints

- Keep current brand palette and green score hero.
- Avoid adding extra vertical card stacks.
- Use dense but readable spacing.
- Use real text labels, not emoji-based icons.
- Keep buttons at least 44px high.
- The report should be desktop-first for this competition version.
- Do not introduce complex charts beyond the existing radar chart.

## Acceptance Criteria

- Report page can be understood without scrolling on desktop.
- Ability bars and radar chart are shown in one combined ability card.
- Full conversation is not shown inline; it is available through a modal.
- User mistakes include word-level or phrase-level contrast marking.
- Third column contains three guidance buttons.
- Each guidance button opens a lightweight detail modal.
- Report provides expression guidance, pronunciation guidance, and a repeatable target sentence.
- Existing mock/live reports still render if the new optional structured fields are absent.
