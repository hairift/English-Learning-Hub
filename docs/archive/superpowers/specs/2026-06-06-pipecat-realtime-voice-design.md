# 设计文档：Pipecat 实时语音陪练引擎接入

- 日期：2026-06-06
- 状态：已确认设计，待写实现计划
- 相关需求：连续 5–7 分钟 AI 口语陪练（非固定轮次问答）

## 1. 目标与范围

把 `pipecat-ai/pipecat` 接入为英语口语训练模块的**实时语音对话引擎**，实现 5–7 分钟连续陪练：用户开口 → VAD 自动判断说完 → STT → LLM Tutor 动态追问 → TTS 播报，全程流式、可打断、无"提交这一轮"按钮。

### 范围内
- 新增独立 Python Pipecat Voice Agent 服务（实时语音管线层）。
- 业务后端收口：移除与 Pipecat 冲突的旧实时实现，明确 session/turns/report 契约。
- 前端收口：去掉前端落库逻辑，右侧只做实时字幕展示。

### 范围外（需求 #12：Pipecat 只负责实时语音 Agent 层）
- 用户系统、报告管理、历史记录页面、成长轨迹等业务逻辑仍在业务后端 / 前端。
- 报告生成、`practice_session` / `conversation_turns` 的真相源仍在业务后端。

## 2. 已确认的关键决策

| 决策点 | 结论 |
|---|---|
| conversation_turns 由谁实时写入 | **Pipecat 服务端 server-to-server 写入**；前端只用客户端事件展示，不落库 |
| 实时语音 provider | **Deepgram STT + OpenAI 兼容 LLM + Cartesia TTS**（对应现有 `global-mixed` 预设），key/model 走 env |
| 旧 Node 实时循环 `server/realtimeServer.ts` | **移除**（含 `index.ts` 的 attach、`api.ts` 的 `createPracticeSocket` 与死 WS 类型） |
| 开场白去重 | `session/start` 仍 seed 一条 `ai` 开场白 turn；Pipecat 把它当已存在的第一句 **TTS 播报但不重复 POST**，之后所有 turn 才由 bot 写 |
| 三个手动单轮端点 `/api/asr/transcribe`、`/api/llm/turn`、`/api/tts/synthesize` | **保留**（不被新流程使用，但作为现有能力/测试保留） |
| Python 服务位置 | 仓库内 `pipecat/` 子目录（polyglot 单仓） |

## 3. 架构与数据流

三个进程，职责单一：

| 进程 | 端口 | 职责 |
|---|---|---|
| Vite 前端 | 5173 | 三个交互（开始/结束/生成报告）+ 实时字幕展示。只连 WebRTC，不落库 |
| 业务后端（Express） | 5174 | `practice_session` / `conversation_turns` 真相源 + 报告生成 |
| Pipecat Voice Agent（Python，新增） | 7860 | 实时语音管线 + 把每条 turn server-to-server 写回业务后端 |

### 时序

```
前端「开始训练」
  └─ POST /api/session/start (业务后端) → 建 practice_session, seed 开场白 turn, 返回 sessionId + 开场白文本
  └─ 前端用 SmallWebRTCTransport 连 Pipecat: POST /api/offer?session_id&business_api_url&scenario_id&task_id&target_goal
        Pipecat: GET /api/session/:id → 取 scenario_label / target_goal / 开场白 → 构建 system prompt
        Pipecat 管线: WebRTC音频 → SileroVAD → Deepgram STT → LLM Tutor → Cartesia TTS → WebRTC音频
        开场白: bot 先 TTS 播报已 seed 的第一句(不再 POST)
        之后每条: STT final(user) / LLM 回复(ai) → Pipecat POST /api/session/:id/turns 落库
        前端: 用 Pipecat 客户端事件(用户转写 / AI 文本)实时渲染右侧对话记录
前端「结束训练」(或前端计时到时长 / Pipecat 侧到时长保护)
  └─ 关闭 WebRTC 连接
前端「生成报告」
  └─ POST /api/report/generate { sessionId } → 业务后端读自己的 conversation_turns → 七维报告
```

- **VAD 自动判断说完**（#4）：Silero VAD 在管线内完成，前端无"提交这一轮"。
- **动态追问**（#5）：Pipecat context aggregator 把完整对话历史喂给 LLM，无固定 5 轮题目。
- **实时落库**（#7）：由 Pipecat 服务端逐条 POST，浏览器掉线不丢数据。

## 4. 组件设计

### 4.1 Pipecat Voice Agent（新增 `pipecat/`）

单一职责小单元：

- **`server.py`** — FastAPI。`POST /api/offer`（SDP 协商 + 每连接启动一条管线），`GET /health`。监听 7860。
- **`bot.py`** — 构建并运行管线：
  `SmallWebRTCTransport(input, vad=SileroVADAnalyzer)` → `DeepgramSTTService` → user context aggregator → `OpenAILLMService(base_url, model)` → `CartesiaTTSService` → `transport.output()` → assistant context aggregator。
- **`business_client.py`** — 瘦 HTTP 客户端：`GET /api/session/:id` 取上下文；`POST /api/session/:id/turns` 写 turn（带 `X-Bot-Secret` 头，见 4.4）。
- **`tutor.py`** — 由 session 上下文（`scenario_label` + `target_goal`）拼 system prompt：英语口语陪练、口语化短句、一次一个动态追问、温和、对话中不纠错（纠错留课后报告）。
- **turn 落库** — 用 Pipecat `TranscriptProcessor` 的 `on_transcript_update`（同时给 user/assistant 消息），每条新消息 POST 回业务后端；开场白（已 seed）跳过不重复写。
- **时长保护** — 从 session 读 `duration`，到点 bot 说一句收尾并结束管线（前端收到断开事件）。
- **配置（env）** — 复用现有名：`DEEPGRAM_API_KEY` / `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` / `CARTESIA_API_KEY` / `CARTESIA_VOICE_ID` / `CARTESIA_TTS_MODEL` / `CARTESIA_VERSION`，新增 `BUSINESS_API_URL`（也可从 offer query 拿）与 `BOT_SHARED_SECRET`。
- **依赖** — `pyproject.toml` + `requirements.txt`，`pipecat-ai[deepgram,cartesia,openai,silero,webrtc]`（具体 extras 在实现时对照已装版本锁定）。

> 注：Pipecat 各 service 的确切类名/参数（如 SmallWebRTC 的 server 端 offer 写法、TranscriptProcessor 事件签名）在实现阶段对照 `pip install` 实际版本验证后再固化。

### 4.2 业务后端（`server/`，做减法 + 收口）

- **移除**：`server/realtimeServer.ts` 整文件；`server/index.ts` 中 `attachRealtimeServer` 及其 import；`src/api.ts` 中 `createPracticeSocket` + `PracticeRealtimeEvent` 死类型。
- **保留**：`/api/asr/transcribe`、`/api/llm/turn`、`/api/tts/synthesize`（不被新流程调用，作为现有能力保留）。
- **保留并作为契约**：`POST /api/session/start`、`GET /api/session/:id`（Pipecat 读）、`POST /api/session/:id/turns`（Pipecat 写）、`POST /api/report/generate`、`/api/scenarios`、`/api/settings`、`/api/health`。
- **`/api/report/generate`**：带 `sessionId` 时读 `session.conversation_turns`（现已实现）→ 前端不再传 turns，后端用自身真相源（满足 #10/#11，七维 schema 已就绪）。

### 4.3 前端（`src/`，去掉自己落库）

- `src/pipecatVoiceClient.ts` 保留（已能产出 user 转写 / AI 文本事件）。
- `src/App.tsx`：删除 `recordVoiceTurn` / `dedupeVoiceTurn` / `recordedTurnKeysRef` 这套"前端写后端"逻辑。右侧实时对话记录改为**纯前端内存列表**，由 Pipecat 事件 append，仅展示（无置信度/编辑框/模拟转写/音频播放器，满足 #8）。
- `generatePracticeReport` 只发 `{ sessionId, 场景元信息 }`，不再发 `conversation_turns`。
- 三个按钮（开始/结束/生成报告）+ 计时 + 到时长断开逻辑保留（满足 #1/#9）。

### 4.4 接口契约

`POST /api/session/:id/turns`（Pipecat → 业务后端）：
- Header：`X-Bot-Secret: <BOT_SHARED_SECRET>`（env 未配则放行，本地友好）。
- Body：`{ speaker: "ai"|"user", text, timestamp }`（沿用现有 schema，置信度等字段可选省略）。

`GET /api/session/:id`（Pipecat → 业务后端）：返回 `{ session }`，含 `scenario_label`、`target_goal`、`duration`、`conversation_turns`（第一条为开场白）。

`POST /api/offer`（前端 → Pipecat）：query 含 `session_id`、`business_api_url`、`scenario_id`、`task_id`、`target_goal`。

## 5. 运行、环境与测试

- **本地编排**：新增 `npm run dev:voice`（起 Python 服务）；`dev` 用 concurrently 同拉起 server(5174)/client(5173)/voice(7860)。`pipecat/README.md` 写清 `uv`/venv 安装与 `python server.py`。
- **env**：`.env.example` 增补 Pipecat 段（上述 key 名 + `BUSINESS_API_URL` + `BOT_SHARED_SECRET`）。
- **测试**：
  - Node 侧（vitest）：`/api/session/:id/turns` 写入；`/api/report/generate` 读自身 turns 生成七维报告；移除 `realtimeServer` 后的回归。
  - Python 侧：`business_client` 与 `tutor` prompt 构建单元测试；管线用"echo/占位"配置冒烟（不依赖真实 key），验证 offer→连接→turn 落库闭环。
  - 真实 provider 联调（Deepgram/OpenAI 兼容/Cartesia）留到实现计划最后一步。

## 6. 需求覆盖核对

| # | 需求 | 落点 |
|---|---|---|
| 1 | 前端只保留 开始/结束/生成报告 | 4.3 前端 |
| 2 | WebRTC/WS 连 Pipecat | 4.1 SmallWebRTCTransport + offer |
| 3 | 完整实时管线 Audio→VAD→STT→LLM→TTS→Audio | 4.1 bot.py |
| 4 | VAD 自动判断说完 | 4.1 SileroVADAnalyzer |
| 5 | LLM 基于完整上下文动态追问 | 4.1 context aggregator + tutor.py |
| 6 | 业务后端维护 session / turns | 4.2 业务后端 |
| 7 | 每条发言实时写入 turns | 3 时序 + 4.1 落库（服务端写） |
| 8 | 右侧只显示实时对话记录 | 4.3 前端 |
| 9 | 到时长或点结束 → 关闭连接 | 3 时序 + 4.1 时长保护 |
| 10 | 结束后读完整 turns 生成报告 | 4.2 report/generate |
| 11 | 七维报告 | 现有 `shared/schemas.ts` reportResultSchema |
| 12 | Pipecat 只负责实时语音层 | 范围外约束 + 4.2 收口 |

## 7. 风险与缓解

- **Pipecat API 版本漂移**：确切类名/参数随版本变化 → 实现阶段对照已装版本验证后固化。
- **WebRTC 本地连通性**：已配 Google STUN；如内网受限，实现时评估是否加 TURN。
- **provider 联调成本**：用 echo/占位 bot 先打通 WebRTC + 落库闭环，把真实 key 联调放最后，降低早期阻塞。
- **polyglot 运维**：Python 与 Node 并存 → README + dev 脚本统一编排，env 复用同名变量降低认知负担。
