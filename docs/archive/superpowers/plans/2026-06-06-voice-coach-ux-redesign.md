# AI 口语陪练 UX 重构 (P0) 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把首页 / 练习页 / 报告页从"功能堆叠"重构为"低压开口 · 真实追问 · 可见成长"的吉祥物陪练体验,复用现有品牌样式,不接真实持久化。

**Architecture:** 前端 React + Vite(`src/`),后端 Express + mock/live provider(`server/`),Zod 共享 schema(`shared/schemas.ts`)。新增字段 `positiveFeedback` 走完整链路:schema → mock provider → live prompt → api 类型 → 前端渲染。成长轨迹与即时反馈在 P0 用 mock/示例数据呈现。人物用升级版 SVG + CSS 动画,封装在 `CoachAvatar`,预留 Lottie 替换接口。

**Tech Stack:** React 18 + TypeScript、Vite、Express、Zod、Vitest + Supertest、纯 CSS(`src/index.css` 的品牌 token)。

**关键既有事实(实施前必读):**
- `CoachState` 枚举是 `idle | listening | thinking | asking | reviewing | celebrating`(**没有 `speaking`**,说话状态用 `asking`)。
- `dialogueTurnResultSchema` **已有** `nextRoundGoal` 字段 —— 本计划复用它当"下一轮目标",只新增 `positiveFeedback`。
- `playSpeech` / 真实音频播放已实现且能用(`src/App.tsx`),本计划不动语音播放逻辑。
- mock 是默认模式;P0 所有页面以 mock 数据为准跑通。

---

## File Structure

**新建:**
- `src/components/MascotAvatar.tsx` — 吉祥物 SVG 人物组件,按 `CoachState` 切换表情/动画。
- `src/copy/coachCopy.ts` — 去压力化文案常量(标题、状态、反馈结构),集中便于审校。
- `src/domain/growthMock.ts` — 成长轨迹的 mock/示例数据(连续天数、累计时长、薄弱项、推荐下一练)。
- `tests/dialogueSchema.test.ts` — 校验 `positiveFeedback` 字段链路。
- `tests/growthMock.test.ts` — 校验成长 mock 数据结构。

**修改:**
- `shared/schemas.ts` — `dialogueTurnResultSchema` 增加 `positiveFeedback`。
- `server/providers/mockProviders.ts` — `mockDialogueTurn` 返回 `positiveFeedback`。
- `server/providers/liveProviders.ts` — dialogue 的 system prompt 增加 `positiveFeedback` key 与 schema 兜底。
- `src/components/CoachAvatar.tsx` — 内部改用 `MascotAvatar`(保持对外接口不变)。
- `src/index.css` — 吉祥物动画类、舞台背景、首页三栏、报告诊断单样式。
- `src/App.tsx` — 首页三栏、练习页舞台、报告页诊断单的渲染重排 + 接入 `positiveFeedback` 与成长 mock。

> **注**:`src/App.tsx` 已较大(~620 行)。本计划在其中做渲染重排,不强制拆分;若执行时发现某段渲染过长,可抽到 `src/components/` 下的子组件(如 `HomeScreen.tsx`),属合理范围。

---

## Task 1: 后端 schema 新增 `positiveFeedback` 字段

**Files:**
- Modify: `shared/schemas.ts:31-39`
- Test: `tests/dialogueSchema.test.ts`

- [ ] **Step 1: 写失败测试**

Create `tests/dialogueSchema.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { dialogueTurnResultSchema } from "../shared/schemas";

describe("dialogueTurnResultSchema", () => {
  it("requires a positiveFeedback string", () => {
    const base = {
      aiText: "What result did it create?",
      hintZh: "先说结果，再补数字。",
      coachState: "asking",
      correctionPreview: "基本清楚。",
      nextRoundGoal: "补一个数字。",
      provider: "mock"
    };

    expect(() => dialogueTurnResultSchema.parse(base)).toThrow();
    const ok = dialogueTurnResultSchema.parse({ ...base, positiveFeedback: "你已经说清楚项目主题了。" });
    expect(ok.positiveFeedback).toBe("你已经说清楚项目主题了。");
  });
});
```

- [ ] **Step 2: 运行,确认失败**

Run: `npx vitest run tests/dialogueSchema.test.ts`
Expected: FAIL —— 第一个 `parse` 不抛错(因为字段还不存在,多余 key 被忽略),断言失败。

- [ ] **Step 3: 加字段**

In `shared/schemas.ts`, edit `dialogueTurnResultSchema` (lines 31-39) to add `positiveFeedback` after `coachState`:

```typescript
export const dialogueTurnResultSchema = z.object({
  aiText: z.string(),
  hintZh: z.string(),
  coachState: coachStateSchema,
  positiveFeedback: z.string(),
  correctionPreview: z.string(),
  nextRoundGoal: z.string(),
  provider: z.string(),
  fallback: z.boolean().optional()
});
```

- [ ] **Step 4: 运行,确认通过**

Run: `npx vitest run tests/dialogueSchema.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add shared/schemas.ts tests/dialogueSchema.test.ts
git commit -m "feat: add positiveFeedback to dialogue turn schema"
```

---

## Task 2: mock provider 返回 `positiveFeedback`

**Files:**
- Modify: `server/providers/mockProviders.ts:54-71`
- Test: `tests/api.test.ts`(已有,新增一条断言)

- [ ] **Step 1: 写失败测试**

在 `tests/api.test.ts` 中,找到调用 `/api/llm/turn` 的现有测试块,新增一条断言(若没有该调用,新增以下独立测试)。先读 `tests/api.test.ts` 确认现有结构,然后追加:

```typescript
it("mock dialogue turn returns a positive feedback line", async () => {
  const app = createApp({ apiMode: "mock" });
  const turn = await request(app)
    .post("/api/llm/turn")
    .send({ scenarioId: "interview", taskId: "internship-intro", round: 1, userText: "I built an app." })
    .expect(200);
  expect(typeof turn.body.positiveFeedback).toBe("string");
  expect(turn.body.positiveFeedback.length).toBeGreaterThan(0);
});
```

> 顶部如缺少 import,补:`import request from "supertest";`、`import { createApp } from "../server/app";`、`import { describe, expect, it } from "vitest";`(与文件现有保持一致)。

- [ ] **Step 2: 运行,确认失败**

Run: `npx vitest run tests/api.test.ts`
Expected: FAIL —— `positiveFeedback` 为 `undefined`,`typeof` 断言失败。

- [ ] **Step 3: 改 mock**

In `server/providers/mockProviders.ts`, `mockDialogueTurn` 的 return(lines 59-70)增加 `positiveFeedback`(放在 `coachState` 之后),并按是否含结果给不同肯定语:

```typescript
  return {
    aiText: resultWord,
    hintZh: "回答要更具体：先说结果，再补数字或用户影响。",
    coachState: "asking",
    positiveFeedback: /result|improved|increase|reduced|saved|score/i.test(userText)
      ? "很好，你开始补充具体结果了。"
      : "你已经说清楚项目主题了，这一轮回答有基本结构。",
    correctionPreview:
      round <= 1
        ? "建议把 I built campus navigation app 改为 I built a campus navigation app."
        : "这一轮表达基本清楚，继续压缩句子长度。",
    nextRoundGoal: "补充一个具体结果，例如效率提升、错误减少或用户反馈。",
    provider: "mock",
    fallback: true
  };
```

- [ ] **Step 4: 运行,确认通过**

Run: `npx vitest run tests/api.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add server/providers/mockProviders.ts tests/api.test.ts
git commit -m "feat: mock dialogue returns positiveFeedback"
```

---

## Task 3: live provider prompt 产出 `positiveFeedback`

**Files:**
- Modify: `server/providers/liveProviders.ts`(`generateTurnWithLlm` 的 system prompt 与兜底解析)

> 该任务无单测(依赖真实 LLM)。改动是把新 key 加进 prompt 契约,并保证 catch 兜底仍合法。

- [ ] **Step 1: 读现有 prompt**

Read `server/providers/liveProviders.ts` 中 `generateTurnWithLlm`(约 line 373 起)。定位 system prompt 的这两行:

```
        "The JSON keys must be aiText, hintZh, coachState, correctionPreview, nextRoundGoal, provider.",
        "coachState must be asking.",
```

- [ ] **Step 2: 把 positiveFeedback 写进契约**

将上面第一行替换为(加入 `positiveFeedback`,并补一句行为约束):

```typescript
        "The JSON keys must be aiText, hintZh, coachState, positiveFeedback, correctionPreview, nextRoundGoal, provider.",
        "positiveFeedback must be one short encouraging Chinese sentence that first affirms what the learner did well, before any correction.",
        "coachState must be asking.",
```

- [ ] **Step 3: 兜底解析补字段**

在同函数的 `dialogueTurnResultSchema.parse({...})` 调用里,确保缺省时不报错。把 parse 入参改为带兜底:

```typescript
    return dialogueTurnResultSchema.parse({
      positiveFeedback: "你已经完成了基本表达。",
      ...(json as Record<string, unknown>),
      coachState: "asking",
      provider: config.llmProvider
    });
```

> 把兜底放在最前、`...json` 在后,这样模型若返回了 `positiveFeedback` 会覆盖兜底;没返回则用兜底,parse 不会因 required 字段缺失而抛错回退到 mock。

- [ ] **Step 4: 类型检查**

Run: `npx tsc --noEmit`
Expected: exit 0

- [ ] **Step 5: 提交**

```bash
git add server/providers/liveProviders.ts
git commit -m "feat: live dialogue prompt emits positiveFeedback"
```

---

## Task 4: 前端 api 类型同步(自动,验证即可)

**Files:**
- Verify: `src/api.ts`(其 `DialogueTurnResult` 由 `shared/schemas.ts` 推导,无需手改)

- [ ] **Step 1: 类型检查确认前端已识别新字段**

Run: `npx tsc --noEmit`
Expected: exit 0 —— `DialogueTurnResult` 自动含 `positiveFeedback`,因为 `src/api.ts` 从 `../shared/schemas` 导入类型。

- [ ] **Step 2: 无代码改动,跳过提交**

(本任务仅为防止后续任务因类型缺失踩坑的检查点。)

---

## Task 5: 成长轨迹 mock 数据模块

**Files:**
- Create: `src/domain/growthMock.ts`
- Test: `tests/growthMock.test.ts`

- [ ] **Step 1: 写失败测试**

Create `tests/growthMock.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { GROWTH_MOCK } from "../src/domain/growthMock";

describe("GROWTH_MOCK", () => {
  it("exposes streak, total minutes, last score, weak area and next practice", () => {
    expect(GROWTH_MOCK.streakDays).toBeGreaterThan(0);
    expect(GROWTH_MOCK.totalMinutes).toBeGreaterThan(0);
    expect(GROWTH_MOCK.lastScore).toBeGreaterThan(0);
    expect(GROWTH_MOCK.weakAreaZh).toBeTruthy();
    expect(GROWTH_MOCK.nextPracticeZh).toBeTruthy();
  });
});
```

- [ ] **Step 2: 运行,确认失败**

Run: `npx vitest run tests/growthMock.test.ts`
Expected: FAIL —— 模块不存在 / 找不到导出。

- [ ] **Step 3: 实现 mock 数据**

Create `src/domain/growthMock.ts`:

```typescript
// P0：成长轨迹用示例数据呈现，不接真实持久化。后续接 src/domain/learning.ts 或后端。
export type GrowthSnapshot = {
  streakDays: number;
  totalMinutes: number;
  lastScore: number;
  weakAreaZh: string;
  nextPracticeZh: string;
  nextTipZh: string;
};

export const GROWTH_MOCK: GrowthSnapshot = {
  streakDays: 3,
  totalMinutes: 28,
  lastScore: 76,
  weakAreaZh: "结果量化表达",
  nextPracticeZh: "面试 · 项目成果追问",
  nextTipZh: "把 “improved route flow” 说成 “reduced route search time by 30%”。"
};
```

- [ ] **Step 4: 运行,确认通过**

Run: `npx vitest run tests/growthMock.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/domain/growthMock.ts tests/growthMock.test.ts
git commit -m "feat: add growth snapshot mock data"
```

---

## Task 6: 去压力化文案常量

**Files:**
- Create: `src/copy/coachCopy.ts`

> 无单测(纯常量)。后续页面统一引用,避免散落硬编码。

- [ ] **Step 1: 创建文案模块**

Create `src/copy/coachCopy.ts`:

```typescript
// 去压力化文案：只用“练习/提示/可以更自然/本轮重点/成长建议”，不出现“测试/错误/扣分/失败/能力不足”。
export const HOME_COPY = {
  title: "今天只练 5 分钟，把一个回答说清楚。",
  subtitle: "AI 会先提问，你只需要开口回答。说错也没关系，系统会在课后帮你整理。",
  startButton: "开始 5 分钟练习",
  changeScene: "更换场景",
  lastReport: "查看上次报告",
  lowPressureNote: "低压模式：没有“测试/扣分”，只有“练习 + 成长建议”。"
};

export const VALUE_CARDS = [
  { icon: "🎭", titleZh: "真实场景追问", descZh: "AI 扮演面试官 / 服务员 / 会议同事，像真人一样追问。" },
  { icon: "🎙️", titleZh: "低压开口", descZh: "点一下“开始回答”即可，系统自动转写和记录。" },
  { icon: "📋", titleZh: "课后成长报告", descZh: "总结发音、语法、表达，并给出下一轮目标。" },
  { icon: "📈", titleZh: "持续成长", descZh: "每次练习沉淀为成长轨迹，越练越有方向。" }
];

// 报告维度的标签由后端返回；这里只放心理设计相关的固定文案。
export const REPORT_COPY = {
  nextRoundLabel: "下一轮只练一件事",
  bestFixLabel: "最值得改的一句",
  replayLabel: "推荐复练句",
  dimensionsLabel: "五维能力"
};
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: exit 0

- [ ] **Step 3: 提交**

```bash
git add src/copy/coachCopy.ts
git commit -m "feat: add low-pressure coaching copy constants"
```

---

## Task 7: 吉祥物人物组件 `MascotAvatar`

**Files:**
- Create: `src/components/MascotAvatar.tsx`
- Modify: `src/components/CoachAvatar.tsx`
- Modify: `src/index.css`(追加动画类)

> 无单测(纯展示组件)。验证方式:类型检查 + 第 13 任务的浏览器目检。

- [ ] **Step 1: 创建 MascotAvatar**

Create `src/components/MascotAvatar.tsx`（吉祥物 = 圆润大头大眼；按 state 切换嘴型与配饰；预留 `size` 与未来 Lottie 替换的单一接口）:

```tsx
import type { CoachState } from "../../shared/schemas";

// P0：升级版 SVG 吉祥物。对外只暴露 state/size，未来可整体替换为 Lottie 而不动调用方。
export function MascotAvatar({ state, size = 220 }: { state: CoachState; size?: number }) {
  const speaking = state === "asking";
  const listening = state === "listening";
  const thinking = state === "thinking";
  return (
    <div className={`mascot mascot-${state}`} style={{ width: size, height: size }} aria-label={`虚拟教练状态：${state}`}>
      <svg viewBox="0 0 150 180" width={size} height={size} role="img">
        <ellipse cx="75" cy="172" rx="48" ry="6" fill="#E5E5E5" />
        <ellipse cx="75" cy="138" rx="38" ry="32" fill="#58CC02" />
        <circle cx="75" cy="78" r="46" fill="#89E219" />
        <ellipse cx="58" cy="78" rx="13" ry="15" fill="#fff" />
        <ellipse cx="92" cy="78" rx="13" ry="15" fill="#fff" />
        <circle cx={listening ? 60 : 60} cy={thinking ? 76 : 80} r="6.5" fill="#3a3a3a" />
        <circle cx={listening ? 90 : 90} cy={thinking ? 76 : 80} r="6.5" fill="#3a3a3a" />
        <circle cx="62" cy="77.5" r="2" fill="#fff" />
        <circle cx="92" cy="77.5" r="2" fill="#fff" />
        <ellipse cx="75" cy="98" rx="8" ry="5" fill="#FF9600" />
        {speaking ? (
          <ellipse cx="75" cy="110" rx="9" ry="7" fill="#fff" />
        ) : (
          <path d="M60 108 q15 12 30 0" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" />
        )}
        <circle cx="50" cy="96" r="5" fill="rgba(255,255,255,.5)" />
        <circle cx="100" cy="96" r="5" fill="rgba(255,255,255,.5)" />
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: CoachAvatar 改用 MascotAvatar(保持对外接口)**

Replace `src/components/CoachAvatar.tsx` 全文:

```tsx
import type { CoachState } from "../../shared/schemas";
import { MascotAvatar } from "./MascotAvatar";

const STATUS_ZH: Record<CoachState, string> = {
  idle: "待机陪练中",
  listening: "正在听你说",
  thinking: "分析回答中",
  asking: "准备追问",
  reviewing: "生成课后点评",
  celebrating: "今日已打卡"
};

export function CoachAvatar({ state, size }: { state: CoachState; size?: number }) {
  return (
    <div className={`coach-stage coach-${state}`} aria-label={`虚拟教练状态：${state}`}>
      <MascotAvatar state={state} size={size} />
      <div className="coach-status">{STATUS_ZH[state]}</div>
    </div>
  );
}
```

- [ ] **Step 3: 追加动画样式**

在 `src/index.css` 末尾追加:

```css
/* 吉祥物人物动画 */
.mascot { display: inline-block; }
.mascot-idle { animation: mascot-bob 3.2s ease-in-out infinite; }
.mascot-asking { animation: mascot-bob 1.4s ease-in-out infinite; }
.mascot-listening { animation: mascot-lean 2s ease-in-out infinite; }
.mascot-thinking { animation: mascot-tilt 2.4s ease-in-out infinite; }
@keyframes mascot-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes mascot-lean { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-3px) scale(1.03); } }
@keyframes mascot-tilt { 0%,100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
@media (prefers-reduced-motion: reduce) { .mascot { animation: none !important; } }
```

- [ ] **Step 4: 类型检查 + 测试无回归**

Run: `npx tsc --noEmit && npx vitest run`
Expected: exit 0;测试全过(CoachAvatar 接口未变)。

- [ ] **Step 5: 提交**

```bash
git add src/components/MascotAvatar.tsx src/components/CoachAvatar.tsx src/index.css
git commit -m "feat: mascot avatar with per-state animation"
```

---

## Task 8: 首页样式(三栏 hero + 价值卡 + 场景卡)

**Files:**
- Modify: `src/index.css`(追加首页布局类)

> 参照已定稿 mockup `docs/mockups/voice-coach-ux-mockup.html` 的样式。无单测。

- [ ] **Step 1: 追加首页样式**

在 `src/index.css` 末尾追加(类名与 Task 9 渲染保持一致):

```css
/* 首页三栏 */
.home-hero { display: grid; grid-template-columns: 1.05fr 1.1fr .95fr; gap: 24px; align-items: stretch; }
.home-coach { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;
  background: linear-gradient(180deg,#f3fde9,#fff); }
.home-bubble { background: #fff; border: 2px solid var(--swan,#E5E5E5); border-radius: 18px; padding: 12px 16px;
  font-weight: 800; margin-bottom: 18px; max-width: 300px; }
.goal-box { background: #eafbe0; border: 2px solid #89E219; border-radius: 16px; padding: 14px 16px; margin: 16px 0; font-weight: 700; }
.growth-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px dashed var(--swan,#E5E5E5); }
.growth-row:last-child { border-bottom: none; }
.growth-big { font-size: 26px; font-weight: 900; color: var(--feather-green,#58CC02); }
.next-target { background: #fff7d6; border: 2px solid #FFC800; border-radius: 14px; padding: 12px; margin-top: 12px; font-weight: 700; font-size: 14px; }
.value-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-top: 28px; }
.value-card { background: #fff; border: 2px solid var(--swan,#E5E5E5); border-radius: 18px; padding: 18px; }
.scene-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-top: 28px; }
.scene-card { border-radius: 18px; padding: 18px; color: #fff; min-height: 150px; display: flex; flex-direction: column; }
.scene-card h3 { font-size: 20px; font-weight: 900; }
.scene-meta { font-size: 12px; font-weight: 700; margin-top: 6px; opacity: .95; line-height: 1.6; }
.scene-go { margin-top: auto; background: #fff; color: var(--eel,#4B4B4B); border-radius: 10px; padding: 8px; text-align: center; font-weight: 900; font-size: 13px; }
.scene-card.custom { background: #fff; color: var(--eel,#4B4B4B); border: 3px dashed #AFAFAF; align-items: center; justify-content: center; text-align: center; }
.scene-card.custom .plus { font-size: 34px; font-weight: 900; color: var(--feather-green,#58CC02); }
@media (max-width: 1100px) { .home-hero { grid-template-columns: 1fr; } .value-row, .scene-grid { grid-template-columns: repeat(2,1fr); } }
```

- [ ] **Step 2: 类型检查(CSS 无类型,跑构建确保无语法错)**

Run: `npx vitest run` (确保无回归) ;CSS 在 Task 13 浏览器目检。
Expected: 测试全过。

- [ ] **Step 3: 提交**

```bash
git add src/index.css
git commit -m "style: home three-column hero, value and scene cards"
```

---

## Task 9: 首页渲染重排(App.tsx)

**Files:**
- Modify: `src/App.tsx`(home/`screen === "home"` 渲染段)
- 引用:`HOME_COPY`/`VALUE_CARDS`(Task 6)、`GROWTH_MOCK`(Task 5)、`CoachAvatar`(Task 7)

> 先 Read `src/App.tsx` 的 home 渲染段落,按下述结构重排。保留现有 `startPractice`/`scenarios`/`applyCustomScenario` 等行为不变。

- [ ] **Step 1: 加 import**

在 `src/App.tsx` 顶部 import 区追加:

```typescript
import { HOME_COPY, VALUE_CARDS } from "./copy/coachCopy";
import { GROWTH_MOCK } from "./domain/growthMock";
```

- [ ] **Step 2: 重排 home 三栏**

把首页主区替换为三栏结构(用 Task 8 的类名)。左栏任务卡、中栏 `CoachAvatar`、右栏成长(读 `GROWTH_MOCK`):

```tsx
<div className="home-hero">
  <section className="panel home-task">
    <span className="eyebrow">今日任务</span>
    <h1>{HOME_COPY.title}</h1>
    <p className="muted">{HOME_COPY.subtitle}</p>
    <div className="goal-box">🎯 本轮目标：{task.focus}</div>
    <div className="top-actions">
      <button className="primary" onClick={startPractice}>{HOME_COPY.startButton} →</button>
      <button className="secondary" onClick={() => setScreen("prep")}>{HOME_COPY.changeScene}</button>
      {report && <button className="secondary" onClick={() => setScreen("report")}>{HOME_COPY.lastReport}</button>}
    </div>
    <p className="muted" style={{ marginTop: 14 }}>💛 {HOME_COPY.lowPressureNote}</p>
  </section>

  <section className="panel home-coach">
    <div className="home-bubble">Ready for a 5-minute practice? 😊</div>
    <CoachAvatar state={coachState === "idle" ? "idle" : coachState} size={240} />
  </section>

  <section className="panel home-growth">
    <span className="eyebrow">我的成长轨迹</span>
    <div className="growth-row"><span className="muted">连续练习</span><span className="growth-big">{GROWTH_MOCK.streakDays} 天 🔥</span></div>
    <div className="growth-row"><span className="muted">累计口语时间</span><span><b>{GROWTH_MOCK.totalMinutes} 分钟</b></span></div>
    <div className="growth-row"><span className="muted">最近得分</span><span><b>{GROWTH_MOCK.lastScore}</b></span></div>
    <div className="growth-row"><span className="muted">当前薄弱项</span><span className="pill">{GROWTH_MOCK.weakAreaZh}</span></div>
    <div className="next-target">📌 推荐下一练：{GROWTH_MOCK.nextPracticeZh}<br/>{GROWTH_MOCK.nextTipZh}</div>
  </section>
</div>
```

- [ ] **Step 3: 价值卡 + 场景卡区**

在三栏下方加价值卡与场景卡(场景沿用现有 `scenarios` 列表渲染,末尾加自定义卡):

```tsx
<span className="eyebrow" style={{ display: "block", marginTop: 34 }}>为什么用 lingo coach</span>
<div className="value-row">
  {VALUE_CARDS.map((v) => (
    <div className="value-card" key={v.titleZh}>
      <div style={{ fontSize: 24 }}>{v.icon}</div>
      <b>{v.titleZh}</b>
      <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{v.descZh}</p>
    </div>
  ))}
</div>

<span className="eyebrow" style={{ display: "block", marginTop: 34 }}>选择真实场景</span>
<div className="scene-grid">
  {scenarios.slice(0, 3).map((s, i) => (
    <div className="scene-card" key={s.id}
      style={{ background: ["#58CC02", "#1CB0F6", "#CE82FF"][i % 3] }}
      onClick={() => { setScenario(s); setTask(s.tasks[0]); }}>
      <h3>{s.nameZh}</h3>
      <div className="scene-meta">{s.tasks[0]?.focus}</div>
      <div className="scene-go">开始练习 →</div>
    </div>
  ))}
  <div className="scene-card custom" onClick={() => setScreen("prep")}>
    <div className="plus">＋</div>
    <h3 style={{ color: "var(--eel)" }}>自定义场景</h3>
    <div className="scene-meta" style={{ color: "var(--wolf)" }}>自己设定 AI 角色、任务与开场问题</div>
  </div>
</div>
```

> 注:`setScreen("prep")`/`startPractice`/`scenarios` 等均为 App.tsx 已有的 state 与函数。若现有首页用的是别的入口名,执行时按文件实际命名对齐,不要新造。

- [ ] **Step 4: 类型检查 + 测试**

Run: `npx tsc --noEmit && npx vitest run`
Expected: exit 0;测试全过。

- [ ] **Step 5: 提交**

```bash
git add src/App.tsx
git commit -m "feat: rebuild home as three-column low-pressure layout"
```

---

## Task 10: 练习页舞台样式

**Files:**
- Modify: `src/index.css`(追加舞台类,参照 mockup v2)

- [ ] **Step 1: 追加舞台样式**

在 `src/index.css` 末尾追加:

```css
/* 练习页舞台 */
.practice-grid { display: grid; grid-template-columns: 1fr 320px; gap: 22px; }
.stage { position: relative; border: 2px solid var(--swan,#E5E5E5); border-radius: 24px; min-height: 460px;
  overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding: 0 0 26px;
  background: linear-gradient(180deg,#dff0ff 0%,#eaf6ff 46%,#f3ece2 46%,#efe6d8 100%); }
.stage-q { position: absolute; top: 26px; left: 50%; transform: translateX(-50%); background: #fff;
  border: 2px solid #1CB0F6; border-radius: 18px; padding: 14px 20px; font-size: 18px; font-weight: 800;
  max-width: 70%; text-align: center; z-index: 3; box-shadow: 0 4px 12px rgba(0,0,0,.08); }
.stage-mascot { position: absolute; bottom: 64px; left: 50%; transform: translateX(-50%); z-index: 2; }
.stage-subtitle { position: absolute; bottom: 150px; left: 50%; transform: translateX(-50%); background: rgba(255,255,255,.92);
  border: 2px dashed var(--swan,#E5E5E5); border-radius: 14px; padding: 10px 16px; color: var(--wolf,#777); font-weight: 700; z-index: 3; max-width: 70%; }
.stage-speak { position: relative; z-index: 3; background: var(--feather-green,#58CC02); color: #fff; border: none;
  border-radius: 999px; width: 118px; height: 118px; font-weight: 900; font-size: 16px; box-shadow: 0 6px 0 #43C000; cursor: pointer; }
.stage-ring { position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); width: 118px; height: 118px;
  border-radius: 50%; border: 3px solid #89E219; animation: stage-pulse 1.6s ease-out infinite; z-index: 2; }
@keyframes stage-pulse { 0% { transform: translateX(-50%) scale(1); opacity: .7; } 100% { transform: translateX(-50%) scale(1.9); opacity: 0; } }
.goal-now { background: #eafbe0; border: 2px solid #89E219; border-radius: 14px; padding: 14px; margin-bottom: 14px; }
.round-tip { background: #fff7d6; border: 2px solid #FFC800; border-radius: 14px; padding: 12px; font-weight: 700; font-size: 14px; margin-bottom: 14px; }
.tech-fold { background: var(--panel-bg,#F7F7F7); border: 2px solid var(--swan,#E5E5E5); border-radius: 12px;
  padding: 10px 12px; font-size: 13px; font-weight: 800; color: var(--wolf,#777); }
@media (max-width: 1100px) { .practice-grid { grid-template-columns: 1fr; } }
```

- [ ] **Step 2: 测试无回归**

Run: `npx vitest run`
Expected: 测试全过。

- [ ] **Step 3: 提交**

```bash
git add src/index.css
git commit -m "style: practice stage layout with pulse ring"
```

---

## Task 11: 练习页渲染重排 + 接入 positiveFeedback

**Files:**
- Modify: `src/App.tsx`(`screen === "practice"` 渲染段)

> 保留现有 `beginRecording`/`stopRecording`/`submitTurn`/`draft`/`latestAiText` 行为。P0:主按钮触发录音/提交(沿用现有逻辑),不做 VAD 自动提交。新增即时反馈展示。

- [ ] **Step 1: 加即时反馈 state + 在 submitTurn 中赋值**

在 `src/App.tsx` 的 state 区(`latestHint` 附近)新增:

```typescript
const [positiveFeedback, setPositiveFeedback] = useState("");
```

在 `submitTurn` 中,`setLatestHint(turnResult.hintZh);` 之后追加:

```typescript
    setPositiveFeedback(turnResult.positiveFeedback);
```

- [ ] **Step 2: 重排练习页为舞台 + 右侧导航**

把 practice 主区替换为(舞台居中人物 + AI 问题气泡 + 主按钮 + 字幕;右侧目标/轻提示/即时反馈/状态/技术折叠):

```tsx
<div className="practice-grid">
  <div className="stage">
    <div className="stage-q">{latestAiText}</div>
    <div className="stage-mascot"><CoachAvatar state={coachState} size={150} /></div>
    {draft && <div className="stage-subtitle">{draft}</div>}
    {recording && <div className="stage-ring" />}
    <button className="stage-speak" onClick={recording ? stopRecording : beginRecording}>
      {recording ? "停止" : coachState === "thinking" ? "思考中" : "开始回答"}
    </button>
    <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>说完点“停止”，系统会转写并提交。</p>
  </div>

  <aside>
    <div className="goal-now">
      <span className="eyebrow">本轮目标</span>
      <p style={{ fontWeight: 800, marginTop: 6 }}>{task.focus}</p>
    </div>
    {positiveFeedback && <div className="round-tip">👏 {positiveFeedback}</div>}
    {latestHint && <div className="round-tip">💡 {latestHint}</div>}
    <div className="panel" style={{ marginBottom: 14 }}>
      <span className="eyebrow">本轮状态</span>
      <p style={{ fontSize: 13, marginTop: 6 }}>
        ✅ 场景目标已设定<br />🟡 实时对话进行中<br />⚪ 发音评测待生成<br />⚪ 课后总结待生成
      </p>
    </div>
    <div className="tech-fold">🟢 语音链路正常 {speech ? `· ${speech.provider}` : ""}</div>
    {draft.trim() && (
      <button className="primary" style={{ marginTop: 14, width: "100%" }} onClick={submitTurn}>提交这一轮</button>
    )}
    <button className="secondary" style={{ marginTop: 10, width: "100%" }} onClick={finishSession}>结束并生成报告</button>
  </aside>
</div>
```

> 说明:保留显式「提交这一轮」按钮(P0 无 VAD);录音→转写→`draft` 由现有 `beginRecording/stopRecording/runTranscription` 链路填充。`finishSession`/`recording`/`speech` 均为现有。

- [ ] **Step 3: 类型检查 + 测试**

Run: `npx tsc --noEmit && npx vitest run`
Expected: exit 0;测试全过。

- [ ] **Step 4: 提交**

```bash
git add src/App.tsx
git commit -m "feat: stage-style practice page with instant positive feedback"
```

---

## Task 12: 报告页诊断单重排

**Files:**
- Modify: `src/App.tsx`(`screen === "report"` 渲染段)
- Modify: `src/index.css`(报告样式)
- 引用:`REPORT_COPY`(Task 6)

- [ ] **Step 1: 追加报告样式**

在 `src/index.css` 末尾追加:

```css
/* 报告诊断单 */
.report-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.score-hero { grid-column: 1 / -1; background: linear-gradient(135deg,#58CC02,#89E219); color: #fff;
  border-radius: 24px; padding: 32px; display: flex; align-items: center; gap: 28px; }
.score-num { font-size: 72px; font-weight: 900; line-height: 1; }
.dim { margin-bottom: 14px; }
.dim .dim-t { display: flex; justify-content: space-between; font-weight: 800; font-size: 14px; margin-bottom: 4px; }
.dim-bar { height: 8px; border-radius: 99px; background: var(--swan,#E5E5E5); overflow: hidden; }
.dim-bar > i { display: block; height: 100%; background: var(--feather-green,#58CC02); }
.fix-orig { color: var(--wolf,#777); text-decoration: line-through; }
.fix-better { color: var(--feather-green,#58CC02); font-weight: 900; font-size: 18px; margin: 6px 0; }
.replay-li { margin: 8px 0; background: #eafbe0; border: 2px solid #89E219; border-radius: 12px; padding: 10px 14px; font-weight: 700; list-style: none; }
.encourage { background: #fff7d6; border: 2px solid #FFC800; border-radius: 16px; padding: 16px; font-weight: 800; grid-column: 1 / -1; }
@media (max-width: 1100px) { .report-grid { grid-column: 1fr; grid-template-columns: 1fr; } }
```

- [ ] **Step 2: 加 import**

在 `src/App.tsx` import 区追加:

```typescript
import { REPORT_COPY } from "./copy/coachCopy";
```

- [ ] **Step 3: 重排报告页**

把 report 主区替换为诊断单(读现有 `report` 对象:`totalScore`/`dimensions`/`corrections`/`suggestions`/`coachCommentZh`):

```tsx
{report && (
  <div className="report-grid">
    <div className="score-hero">
      <div><div className="score-num">{report.totalScore}</div><div style={{ fontWeight: 800 }}>/ 100</div></div>
      <div>
        <span className="eyebrow" style={{ color: "rgba(255,255,255,.85)" }}>本次练习 · {scenario.nameZh}</span>
        <h2 style={{ marginTop: 6 }}>{report.coachCommentZh}</h2>
        <p style={{ marginTop: 6, fontWeight: 700 }}>完成目标：{task.focus} ✅</p>
      </div>
    </div>

    <div className="panel">
      <span className="eyebrow">{REPORT_COPY.dimensionsLabel}</span>
      {report.dimensions.map((d) => (
        <div className="dim" key={d.id}>
          <div className="dim-t"><span>{d.labelZh}</span><span>{d.score}</span></div>
          <div className="dim-bar"><i style={{ width: `${d.score}%` }} /></div>
        </div>
      ))}
    </div>

    <div className="panel">
      <span className="eyebrow">{REPORT_COPY.bestFixLabel}</span>
      {report.corrections[0] && (
        <>
          <p className="fix-orig" style={{ marginTop: 8 }}>Original: {report.corrections[0].original}</p>
          <p className="fix-better">Better: {report.corrections[0].improved}</p>
          <p className="muted" style={{ fontSize: 14 }}>{report.corrections[0].explanationZh}</p>
        </>
      )}
    </div>

    <div className="panel">
      <span className="eyebrow">{REPORT_COPY.replayLabel}</span>
      <ul style={{ padding: 0, marginTop: 8 }}>
        {report.suggestions.map((s) => <li className="replay-li" key={s}>{s}</li>)}
      </ul>
    </div>

    <div className="encourage">🌱 {report.summaryZh}</div>
  </div>
)}
```

> `scenario`/`task`/`report` 均为现有 state。维度条用 `score` 直接做百分比宽度。

- [ ] **Step 4: 类型检查 + 测试**

Run: `npx tsc --noEmit && npx vitest run`
Expected: exit 0;测试全过。

- [ ] **Step 5: 提交**

```bash
git add src/App.tsx src/index.css
git commit -m "feat: rebuild report as learning diagnostic sheet"
```

---

## Task 13: 端到端目检 + 全量验证

**Files:** 无改动,仅验证。

- [ ] **Step 1: 全量测试 + 构建**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: tsc exit 0;测试全过(原 21 条 + 新增 3 条);build 成功。

- [ ] **Step 2: 启动并目检三页**

Run: `npm run dev`,浏览器开 `http://127.0.0.1:5173`(若端口占用看终端实际端口)。逐项核对验收标准:
  - 首页 3 秒内看清"今天练什么 / 为什么 / 点哪开始";吉祥物居中是主视觉;成长轨迹显示 mock 数据。
  - 进练习:人物在舞台居中、有 AI 问题气泡、主按钮"开始回答";提交后右侧出现"👏 即时肯定"+"💡 提示";无"测试/扣分"字样。
  - 结束生成报告:总分 + 完成目标 + 五维条 + 最值得改的一句 + 推荐复练句 + 正向收尾。

- [ ] **Step 3: 关闭 dev,收尾提交(若有目检微调)**

```bash
git add -A
git commit -m "chore: UX redesign P0 polish after manual review"
```

---

## Self-Review

**Spec 覆盖核对:**
- 首页三栏 + 低压标题 + 价值卡 + 场景卡(含自定义)→ Task 6/8/9 ✅
- 练习页舞台式 + 人物居中 + 即时反馈 + 技术折叠 → Task 7/10/11 ✅
- 报告诊断单(总分→五维→改一句→下一轮→复练句→正向收尾)→ Task 6/12 ✅
- 吉祥物人物升级(SVG,留 Lottie 接口)→ Task 7 ✅
- `roundGoal`/`positiveFeedback` 后端字段(P0)→ `nextRoundGoal` 已存在复用 + `positiveFeedback` 新增 Task 1/2/3 ✅
- 成长轨迹 mock 数据 → Task 5/9 ✅
- 去压力化文案集中 → Task 6 ✅
- VAD 自动提交不在 P0(显式按钮)→ Task 11 已注明 ✅

**类型一致性:** `CoachState` 全程用既有枚举(无 `speaking`,说话=asking);`positiveFeedback` 在 schema/mock/live/前端 state 命名一致;`GROWTH_MOCK` 字段在 Task 5 定义、Task 9 引用一致;`MascotAvatar({state,size})` 接口在 Task 7 定义、各页一致引用。

**占位扫描:** 无 TBD/TODO;每个改代码的步骤都给了完整代码与预期输出。
