# Pipecat Realtime Voice Coaching Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fixed-round Q&A with a continuous 5–7 minute AI speaking-practice session driven by a Python Pipecat Voice Agent (WebRTC → Silero VAD → Deepgram STT → OpenAI-compatible LLM tutor → Cartesia TTS), while the Node business backend owns `practice_session` / `conversation_turns` and report generation.

**Architecture:** Three processes — Vite frontend (5173, three controls + live caption display only), Express business backend (5174, session/turns/report truth source), and a new Python Pipecat service (7860, realtime voice pipeline). Pipecat writes each finalized turn server-to-server to the backend; the frontend only renders live captions from Pipecat client events. The legacy Node WS realtime loop is removed.

**Tech Stack:** TypeScript (Express 5, React 19, Vitest, Supertest), Python 3.11+ (`pipecat-ai`, FastAPI/uvicorn, httpx, pytest), `@pipecat-ai/client-js` + `@pipecat-ai/small-webrtc-transport` (already installed).

---

## Conventions & Prerequisites

- **Node tests:** `npm test` (Vitest, run-once). Type check: `npm run typecheck`.
- **Python service lives in `pipecat/`.** Use a venv: `python3 -m venv pipecat/.venv && source pipecat/.venv/bin/activate`. Python tests: `pytest` run from `pipecat/`.
- **Commit after every task.** Git is currently unavailable in this environment due to a transient infra issue; if `git commit` fails, leave the changes staged and continue — do not block.
- **Branch:** all work goes on `feat/pipecat-realtime-voice` (create with `git checkout -b feat/pipecat-realtime-voice` at the first successful git step).
- **Pipecat API note:** The Python import paths below reflect Pipecat's module layout as of early 2026. **Task B1 verifies them against the actually-installed version.** If an import differs, fix it at the top of the affected file and apply the same corrected module path consistently. Keep all third-party imports at the top of each file so a fix is one localized edit.

---

## Phase A — Business backend收口 (remove legacy realtime, lock contracts)

### Task A1: Remove the legacy Node WS realtime loop

**Files:**
- Delete: `server/realtimeServer.ts`
- Modify: `server/index.ts`
- Modify: `src/api.ts:165-193` (remove `PracticeRealtimeEvent` type + `createPracticeSocket`)

- [ ] **Step 1: Confirm the dead code has no live importers**

Run: `grep -rn "realtimeServer\|attachRealtimeServer\|createPracticeSocket\|PracticeRealtimeEvent" server src tests`
Expected: matches only in `server/index.ts`, `server/realtimeServer.ts`, and `src/api.ts` (no usage in `src/App.tsx` or tests). If any other file references them, stop and report.

- [ ] **Step 2: Delete the realtime server file**

```bash
rm server/realtimeServer.ts
```

- [ ] **Step 3: Simplify `server/index.ts` to plain Express listen**

Replace the entire file with:

```ts
import { createApp } from "./app";

const port = Number(process.env.PORT || 5174);
const app = createApp();

app.listen(port, () => {
  console.log(`AI Speaking Coach API listening on http://127.0.0.1:${port}`);
});
```

- [ ] **Step 4: Remove the dead WS exports from `src/api.ts`**

Delete the `createPracticeSocket` function and the `PracticeRealtimeEvent` union (current lines 165–193, the whole block starting at `export type PracticeRealtimeEvent =` through the end of `createPracticeSocket`). Keep `createPipecatOfferUrl` (lines 195–209). The file should end with `createPipecatOfferUrl`.

- [ ] **Step 5: Type-check and test**

Run: `npm run typecheck && npm test`
Expected: PASS. (`tests/api.test.ts` does not touch the WS loop; all existing suites still pass.)

- [ ] **Step 6: Commit**

```bash
git add server/index.ts src/api.ts
git rm server/realtimeServer.ts
git commit -m "refactor: remove legacy Node WS realtime loop in favor of Pipecat"
```

---

### Task A2: Add optional shared-secret guard to the turn-write endpoint

**Files:**
- Modify: `server/app.ts:110-137` (the `POST /api/session/:sessionId/turns` handler)
- Modify: `server/config.ts` (expose `botSharedSecret` on config)
- Test: `tests/api.test.ts`

- [ ] **Step 1: Write the failing test**

Add inside the `describe("local API in mock mode")` block in `tests/api.test.ts`:

```ts
it("rejects Pipecat turn writes with a wrong bot secret when a secret is configured", async () => {
  const guardedApp = createApp({ apiMode: "mock" });
  guardedApp.locals.config.botSharedSecret = "s3cret";

  const started = await request(guardedApp)
    .post("/api/session/start")
    .send({ scenarioId: "interview", taskId: "internship-intro" })
    .expect(200);

  await request(guardedApp)
    .post(`/api/session/${started.body.sessionId}/turns`)
    .set("X-Bot-Secret", "wrong")
    .send({ speaker: "user", text: "hello" })
    .expect(401);

  await request(guardedApp)
    .post(`/api/session/${started.body.sessionId}/turns`)
    .set("X-Bot-Secret", "s3cret")
    .send({ speaker: "user", text: "hello" })
    .expect(200);
});
```

- [ ] **Step 2: Run it to verify failure**

Run: `npm test -- tests/api.test.ts`
Expected: FAIL — the wrong-secret request returns 200 instead of 401 (and `botSharedSecret` is not yet on config).

- [ ] **Step 3: Add `botSharedSecret` to `LiveConfig` and `getConfig`**

In `server/providers/liveProviders.ts`, add to the `LiveConfig` type (after `pronunciationProvider`):

```ts
  pronunciationProvider: PronunciationProvider;
  botSharedSecret?: string;
```

In `server/config.ts`, inside the object returned by `getConfig`, add as the last property before the closing `}`:

```ts
    pronunciationProvider: readPronunciationProvider(
      process.env.PRONUNCIATION_PROVIDER,
      preset.pronunciationProvider
    ),
    botSharedSecret: process.env.BOT_SHARED_SECRET
  };
```

- [ ] **Step 4: Enforce the secret in the turns handler**

In `server/app.ts`, at the very top of the `app.post("/api/session/:sessionId/turns", ...)` handler (before the `practiceSessionStore.get` call), add:

```ts
    const requiredSecret = config.botSharedSecret;
    if (requiredSecret && req.get("X-Bot-Secret") !== requiredSecret) {
      res.status(401).json({ error: "invalid bot secret" });
      return;
    }
```

- [ ] **Step 5: Run the tests**

Run: `npm test -- tests/api.test.ts`
Expected: PASS (new test plus the existing turn-recording tests, which set no secret and are unaffected).

- [ ] **Step 6: Commit**

```bash
git add server/app.ts server/config.ts server/providers/liveProviders.ts tests/api.test.ts
git commit -m "feat: optional X-Bot-Secret guard on conversation_turns writes"
```

---

### Task A3: Lock that the report reads the session's own turns

**Files:**
- Test: `tests/api.test.ts`

This behavior already exists (`server/app.ts:166-172` merges `session.conversation_turns` when `sessionId` resolves). This task only adds a regression test proving the frontend can omit turns and the report still reflects the stored conversation (requirement #10).

- [ ] **Step 1: Write the failing test**

Add inside the `describe` block in `tests/api.test.ts`:

```ts
it("generates a report from the stored session turns without client-supplied turns", async () => {
  const started = await request(app)
    .post("/api/session/start")
    .send({ scenarioId: "interview", taskId: "internship-intro" })
    .expect(200);
  const sessionId = started.body.sessionId;

  await request(app)
    .post(`/api/session/${sessionId}/turns`)
    .send({ speaker: "user", text: "I built a campus navigation app.", timestamp: "2026-06-06T04:10:00.000Z" })
    .expect(200);

  const response = await request(app)
    .post("/api/report/generate")
    .send({ sessionId, scenarioId: "interview", taskId: "internship-intro" })
    .expect(200);

  const parsed = reportResultSchema.parse(response.body);
  expect(parsed.dimensions.map((d) => d.id)).toEqual([
    "fluency",
    "pronunciation",
    "grammar",
    "vocabulary",
    "coherence",
    "task_completion",
    "interaction"
  ]);
});
```

- [ ] **Step 2: Run it**

Run: `npm test -- tests/api.test.ts`
Expected: PASS immediately (no implementation needed — this locks existing behavior). If it FAILS, the report path is not reading session turns; fix `server/app.ts:166-172` so it does before continuing.

- [ ] **Step 3: Commit**

```bash
git add tests/api.test.ts
git commit -m "test: lock report generation from stored session turns"
```

---

## Phase B — Pipecat Voice Agent (Python service in `pipecat/`)

### Task B1: Scaffold the Python service and verify the Pipecat API surface

**Files:**
- Create: `pipecat/pyproject.toml`
- Create: `pipecat/requirements.txt`
- Create: `pipecat/.gitignore`
- Create: `pipecat/verify_imports.py`
- Create: `pipecat/app/__init__.py`

- [ ] **Step 1: Create `pipecat/requirements.txt`**

```
pipecat-ai[deepgram,cartesia,openai,silero,webrtc]
fastapi
uvicorn[standard]
httpx
python-dotenv
pytest
pytest-asyncio
```

- [ ] **Step 2: Create `pipecat/pyproject.toml`**

```toml
[project]
name = "speaking-coach-voice-agent"
version = "0.1.0"
requires-python = ">=3.11"

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

- [ ] **Step 3: Create `pipecat/.gitignore`**

```
.venv/
__pycache__/
*.pyc
.env
```

- [ ] **Step 4: Create `pipecat/app/__init__.py`** (empty package marker)

```python
```

- [ ] **Step 5: Install dependencies**

```bash
cd pipecat && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
```
Expected: installs `pipecat-ai` and extras without error. Note the installed version: `pip show pipecat-ai | grep Version`.

- [ ] **Step 6: Create `pipecat/verify_imports.py`** — proves the exact API paths this plan depends on

```python
"""Run this once after install to confirm the Pipecat API surface the bot uses.
If any import fails, the real path moved in your installed version — find it with
`python -c "import pipecat, pkgutil; ..."` and update the corresponding import in
app/bot.py and app/server.py (one localized edit per moved symbol)."""

import importlib

CHECKS = [
    ("pipecat.pipeline.pipeline", "Pipeline"),
    ("pipecat.pipeline.runner", "PipelineRunner"),
    ("pipecat.pipeline.task", "PipelineTask"),
    ("pipecat.pipeline.task", "PipelineParams"),
    ("pipecat.processors.aggregators.openai_llm_context", "OpenAILLMContext"),
    ("pipecat.processors.transcript_processor", "TranscriptProcessor"),
    ("pipecat.audio.vad.silero", "SileroVADAnalyzer"),
    ("pipecat.services.deepgram.stt", "DeepgramSTTService"),
    ("pipecat.services.cartesia.tts", "CartesiaTTSService"),
    ("pipecat.services.openai.llm", "OpenAILLMService"),
    ("pipecat.transports.network.small_webrtc", "SmallWebRTCTransport"),
    ("pipecat.transports.network.webrtc_connection", "SmallWebRTCConnection"),
    ("pipecat.transports.base_transport", "TransportParams"),
    ("pipecat.frames.frames", "TTSSpeakFrame"),
    ("pipecat.frames.frames", "EndFrame"),
]

def main() -> None:
    failures = []
    for module, symbol in CHECKS:
        try:
            mod = importlib.import_module(module)
            getattr(mod, symbol)
            print(f"OK   {module}.{symbol}")
        except Exception as exc:  # noqa: BLE001
            failures.append(f"FAIL {module}.{symbol}: {exc}")
    for line in failures:
        print(line)
    if failures:
        raise SystemExit(f"{len(failures)} import(s) need path correction")
    print("All Pipecat imports verified.")

if __name__ == "__main__":
    main()
```

- [ ] **Step 7: Run the verifier**

Run: `cd pipecat && source .venv/bin/activate && python verify_imports.py`
Expected: every line prints `OK`. If any prints `FAIL`, locate the moved symbol (e.g. `python -c "import pipecat.services.deepgram.stt as m; print(m.__file__)"` or browse the installed package) and **record the corrected path** — you will use it in Tasks B4/B5.

- [ ] **Step 8: Commit**

```bash
git add pipecat/pyproject.toml pipecat/requirements.txt pipecat/.gitignore pipecat/verify_imports.py pipecat/app/__init__.py
git commit -m "chore: scaffold pipecat voice-agent service and verify API surface"
```

---

### Task B2: Config loader

**Files:**
- Create: `pipecat/app/config.py`
- Create: `pipecat/tests/__init__.py` (empty)
- Test: `pipecat/tests/test_config.py`

- [ ] **Step 1: Write the failing test**

`pipecat/tests/test_config.py`:

```python
from app.config import load_config

def test_load_config_reads_env(monkeypatch):
    monkeypatch.setenv("DEEPGRAM_API_KEY", "dg-key")
    monkeypatch.setenv("LLM_API_KEY", "llm-key")
    monkeypatch.setenv("LLM_BASE_URL", "https://hezu.ink/v1")
    monkeypatch.setenv("LLM_MODEL", "gpt-5.4-mini")
    monkeypatch.setenv("CARTESIA_API_KEY", "ct-key")
    monkeypatch.setenv("CARTESIA_VOICE_ID", "voice-123")
    monkeypatch.setenv("BUSINESS_API_URL", "http://127.0.0.1:5174")

    cfg = load_config()

    assert cfg.deepgram_api_key == "dg-key"
    assert cfg.llm_base_url == "https://hezu.ink/v1"
    assert cfg.llm_model == "gpt-5.4-mini"
    assert cfg.cartesia_voice_id == "voice-123"
    assert cfg.business_api_url == "http://127.0.0.1:5174"
    assert cfg.cartesia_model == "sonic-2"  # default when unset

def test_business_api_url_defaults_to_localhost(monkeypatch):
    monkeypatch.delenv("BUSINESS_API_URL", raising=False)
    cfg = load_config()
    assert cfg.business_api_url == "http://127.0.0.1:5174"
```

- [ ] **Step 2: Run it to verify failure**

Run: `cd pipecat && source .venv/bin/activate && pytest tests/test_config.py -v`
Expected: FAIL — `app.config` does not exist.

- [ ] **Step 3: Implement `pipecat/app/config.py`**

```python
import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class VoiceAgentConfig:
    deepgram_api_key: str | None
    deepgram_model: str
    llm_api_key: str | None
    llm_base_url: str | None
    llm_model: str
    cartesia_api_key: str | None
    cartesia_voice_id: str | None
    cartesia_model: str
    cartesia_version: str | None
    business_api_url: str
    bot_shared_secret: str | None
    port: int
    max_session_seconds_cap: int


def load_config() -> VoiceAgentConfig:
    return VoiceAgentConfig(
        deepgram_api_key=os.getenv("DEEPGRAM_API_KEY") or os.getenv("ASR_API_KEY"),
        deepgram_model=os.getenv("DEEPGRAM_MODEL", "nova-3"),
        llm_api_key=os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY"),
        llm_base_url=os.getenv("LLM_BASE_URL") or None,
        llm_model=os.getenv("LLM_MODEL") or os.getenv("OPENAI_LLM_MODEL") or "gpt-5.4-mini",
        cartesia_api_key=os.getenv("CARTESIA_API_KEY") or os.getenv("TTS_API_KEY"),
        cartesia_voice_id=os.getenv("CARTESIA_VOICE_ID") or os.getenv("TTS_VOICE_ID"),
        cartesia_model=os.getenv("CARTESIA_TTS_MODEL") or os.getenv("TTS_MODEL") or "sonic-2",
        cartesia_version=os.getenv("CARTESIA_VERSION") or os.getenv("TTS_VERSION") or None,
        business_api_url=os.getenv("BUSINESS_API_URL", "http://127.0.0.1:5174"),
        bot_shared_secret=os.getenv("BOT_SHARED_SECRET") or None,
        port=int(os.getenv("PIPECAT_PORT", "7860")),
        max_session_seconds_cap=int(os.getenv("MAX_SESSION_SECONDS_CAP", "600")),
    )
```

Also create empty `pipecat/tests/__init__.py`.

- [ ] **Step 4: Run the tests**

Run: `cd pipecat && source .venv/bin/activate && pytest tests/test_config.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pipecat/app/config.py pipecat/tests/__init__.py pipecat/tests/test_config.py
git commit -m "feat: pipecat voice-agent config loader"
```

---

### Task B3: Business backend HTTP client

**Files:**
- Create: `pipecat/app/business_client.py`
- Test: `pipecat/tests/test_business_client.py`

The client uses an injectable `httpx.AsyncClient` so tests use `httpx.MockTransport` (no network, no extra deps).

- [ ] **Step 1: Write the failing test**

`pipecat/tests/test_business_client.py`:

```python
import httpx
import pytest

from app.business_client import BusinessClient


def make_client(handler, secret=None):
    transport = httpx.MockTransport(handler)
    http = httpx.AsyncClient(transport=transport, base_url="http://test")
    return BusinessClient(base_url="http://test", secret=secret, http=http)


async def test_get_session_returns_session_object():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/session/sess_1"
        return httpx.Response(200, json={"session": {"scenario_label": "面试 / Interview", "target_goal": "把项目结果说清楚", "duration": 420}})

    client = make_client(handler)
    session = await client.get_session("sess_1")
    assert session["scenario_label"] == "面试 / Interview"
    assert session["duration"] == 420


async def test_post_turn_sends_secret_header_and_payload():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["path"] = request.url.path
        seen["secret"] = request.headers.get("X-Bot-Secret")
        seen["body"] = httpx.Request("POST", request.url, content=request.content).read().decode()
        return httpx.Response(200, json={"turn": {"id": "t1"}, "session": {}})

    client = make_client(handler, secret="s3cret")
    await client.post_turn("sess_1", "ai", "Tell me more.", "2026-06-06T04:10:00.000Z")

    assert seen["path"] == "/api/session/sess_1/turns"
    assert seen["secret"] == "s3cret"
    assert '"speaker":"ai"' in seen["body"].replace(" ", "")


async def test_post_turn_omits_secret_header_when_unset():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["has_secret"] = "X-Bot-Secret" in request.headers
        return httpx.Response(200, json={})

    client = make_client(handler, secret=None)
    await client.post_turn("sess_1", "user", "Hello.", "2026-06-06T04:10:01.000Z")
    assert captured["has_secret"] is False
```

- [ ] **Step 2: Run it to verify failure**

Run: `cd pipecat && source .venv/bin/activate && pytest tests/test_business_client.py -v`
Expected: FAIL — `app.business_client` does not exist.

- [ ] **Step 3: Implement `pipecat/app/business_client.py`**

```python
from __future__ import annotations

import httpx


class BusinessClient:
    """Thin async client for the Node business backend (session read + turn write)."""

    def __init__(self, base_url: str, secret: str | None = None, http: httpx.AsyncClient | None = None) -> None:
        self._base_url = base_url.rstrip("/")
        self._secret = secret
        self._http = http or httpx.AsyncClient(timeout=10.0)

    async def get_session(self, session_id: str) -> dict:
        response = await self._http.get(f"{self._base_url}/api/session/{session_id}")
        response.raise_for_status()
        return response.json()["session"]

    async def post_turn(self, session_id: str, speaker: str, text: str, timestamp: str) -> None:
        headers = {"X-Bot-Secret": self._secret} if self._secret else {}
        response = await self._http.post(
            f"{self._base_url}/api/session/{session_id}/turns",
            json={"speaker": speaker, "text": text, "timestamp": timestamp},
            headers=headers,
        )
        response.raise_for_status()

    async def aclose(self) -> None:
        await self._http.aclose()
```

- [ ] **Step 4: Run the tests**

Run: `cd pipecat && source .venv/bin/activate && pytest tests/test_business_client.py -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add pipecat/app/business_client.py pipecat/tests/test_business_client.py
git commit -m "feat: pipecat business backend http client"
```

---

### Task B4: Tutor system-prompt builder

**Files:**
- Create: `pipecat/app/tutor.py`
- Test: `pipecat/tests/test_tutor.py`

- [ ] **Step 1: Write the failing test**

`pipecat/tests/test_tutor.py`:

```python
from app.tutor import build_system_prompt, opening_text_from_session


def test_build_system_prompt_includes_scenario_and_goal():
    session = {"scenario_label": "面试 / Interview", "target_goal": "把项目结果说清楚"}
    prompt = build_system_prompt(session)
    assert "面试 / Interview" in prompt
    assert "把项目结果说清楚" in prompt
    # behavioral guardrails the realtime tutor must follow
    assert "one" in prompt.lower()  # ask one follow-up at a time
    assert "english" in prompt.lower()


def test_opening_text_prefers_first_ai_turn():
    session = {
        "conversation_turns": [
            {"speaker": "ai", "text": "Tell me about one project you are proud of."},
            {"speaker": "user", "text": "..."},
        ]
    }
    assert opening_text_from_session(session) == "Tell me about one project you are proud of."


def test_opening_text_returns_none_when_no_ai_turn():
    assert opening_text_from_session({"conversation_turns": []}) is None
```

- [ ] **Step 2: Run it to verify failure**

Run: `cd pipecat && source .venv/bin/activate && pytest tests/test_tutor.py -v`
Expected: FAIL — `app.tutor` does not exist.

- [ ] **Step 3: Implement `pipecat/app/tutor.py`**

```python
from __future__ import annotations


def build_system_prompt(session: dict) -> str:
    scenario = session.get("scenario_label") or "an English speaking scenario"
    goal = session.get("target_goal") or "help the learner speak clearly and naturally"
    return (
        "You are a warm, encouraging English speaking partner for a Chinese learner in a live "
        "voice conversation.\n"
        f"Scenario: {scenario}.\n"
        f"Today's focus: {goal}.\n"
        "Rules:\n"
        "- Speak ONLY English. Keep every reply short and spoken — one or two sentences.\n"
        "- Ask exactly ONE follow-up question at a time, chosen dynamically from what the learner "
        "just said. Never read from a fixed list of questions.\n"
        "- Build on the full conversation so far; reference earlier details to go deeper.\n"
        "- Do NOT correct grammar or pronunciation during the conversation — corrections belong in "
        "the after-class report. Keep the learner talking and confident.\n"
        "- If the learner is silent or stuck, offer a gentle, simpler prompt."
    )


def opening_text_from_session(session: dict) -> str | None:
    for turn in session.get("conversation_turns", []):
        if turn.get("speaker") == "ai" and turn.get("text"):
            return turn["text"]
    return None
```

- [ ] **Step 4: Run the tests**

Run: `cd pipecat && source .venv/bin/activate && pytest tests/test_tutor.py -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add pipecat/app/tutor.py pipecat/tests/test_tutor.py
git commit -m "feat: tutor system-prompt and opening-line helpers"
```

---

### Task B5: Build the Pipecat pipeline (`bot.py`)

**Files:**
- Create: `pipecat/app/bot.py`

This wires the realtime pipeline and the turn-writing side effects. No automated test (requires live audio + browser); it is exercised by the E2E checklist in Task D2. Apply any import corrections from Task B1 here.

- [ ] **Step 1: Implement `pipecat/app/bot.py`**

```python
from __future__ import annotations

import asyncio

from loguru import logger
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import EndFrame, TTSSpeakFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.processors.transcript_processor import TranscriptProcessor
from pipecat.services.cartesia.tts import CartesiaTTSService
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.transports.base_transport import TransportParams
from pipecat.transports.network.small_webrtc import SmallWebRTCTransport

from app.business_client import BusinessClient
from app.config import VoiceAgentConfig
from app.tutor import build_system_prompt, opening_text_from_session

_ROLE_TO_SPEAKER = {"assistant": "ai", "user": "user"}


async def run_bot(webrtc_connection, config: VoiceAgentConfig, session_id: str) -> None:
    """Run one realtime practice session over an established WebRTC connection."""
    business = BusinessClient(config.business_api_url, secret=config.bot_shared_secret)
    try:
        session = await business.get_session(session_id)
    except Exception as exc:  # noqa: BLE001
        logger.error(f"Could not load session {session_id}: {exc}")
        session = {}

    opening_text = opening_text_from_session(session)
    system_prompt = build_system_prompt(session)
    duration = min(int(session.get("duration", config.max_session_seconds_cap)), config.max_session_seconds_cap)

    transport = SmallWebRTCTransport(
        webrtc_connection=webrtc_connection,
        params=TransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            vad_analyzer=SileroVADAnalyzer(),
        ),
    )

    stt = DeepgramSTTService(api_key=config.deepgram_api_key, model=config.deepgram_model, language="en-US")
    llm = OpenAILLMService(api_key=config.llm_api_key, base_url=config.llm_base_url, model=config.llm_model)
    tts = CartesiaTTSService(
        api_key=config.cartesia_api_key,
        voice_id=config.cartesia_voice_id,
        model=config.cartesia_model,
    )

    # Seed the context with the system prompt and the already-stored opening line so follow-ups are coherent.
    messages = [{"role": "system", "content": system_prompt}]
    if opening_text:
        messages.append({"role": "assistant", "content": opening_text})
    context = OpenAILLMContext(messages)
    context_aggregator = llm.create_context_aggregator(context)

    transcript = TranscriptProcessor()

    pipeline = Pipeline(
        [
            transport.input(),
            stt,
            transcript.user(),
            context_aggregator.user(),
            llm,
            tts,
            transport.output(),
            transcript.assistant(),
            context_aggregator.assistant(),
        ]
    )
    task = PipelineTask(pipeline, params=PipelineParams(allow_interruptions=True))

    # The opening line is already stored as turn #1 by the backend — speak it, but do not re-write it.
    opening_written = False

    @transcript.event_handler("on_transcript_update")
    async def on_transcript_update(_processor, frame):
        nonlocal opening_written
        for message in frame.messages:
            speaker = _ROLE_TO_SPEAKER.get(message.role)
            if speaker is None or not (message.content or "").strip():
                continue
            if speaker == "ai" and opening_text and not opening_written and message.content.strip() == opening_text.strip():
                opening_written = True  # skip the seeded opening exactly once
                continue
            timestamp = getattr(message, "timestamp", None) or ""
            try:
                await business.post_turn(session_id, speaker, message.content.strip(), timestamp)
            except Exception as exc:  # noqa: BLE001
                logger.error(f"post_turn failed ({speaker}): {exc}")

    @transport.event_handler("on_client_connected")
    async def on_client_connected(_transport, _client):
        if opening_text:
            await task.queue_frames([TTSSpeakFrame(opening_text)])

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(_transport, _client):
        await task.cancel()

    async def end_at_duration():
        await asyncio.sleep(duration)
        logger.info(f"Session {session_id} reached {duration}s — wrapping up.")
        await task.queue_frames([TTSSpeakFrame("That's our time for today. Great work!"), EndFrame()])

    timer = asyncio.create_task(end_at_duration())
    runner = PipelineRunner(handle_sigint=False)
    try:
        await runner.run(task)
    finally:
        timer.cancel()
        await business.aclose()
```

> Note: `loguru` ships as a Pipecat dependency. If Task B1 flagged a moved import (e.g. `transport.input()`/`output()` accessor names, or `TransportParams` field names like `vad_analyzer`), apply the corrected names here. The pipeline order (`transport.input → stt → transcript.user → context.user → llm → tts → transport.output → transcript.assistant → context.assistant`) is the canonical Pipecat arrangement.

- [ ] **Step 2: Import smoke check**

Run: `cd pipecat && source .venv/bin/activate && python -c "from app.bot import run_bot; print('bot import ok')"`
Expected: prints `bot import ok` with no ImportError. If an import fails, fix per Task B1 findings and re-run.

- [ ] **Step 3: Commit**

```bash
git add pipecat/app/bot.py
git commit -m "feat: pipecat realtime pipeline with server-side turn writing"
```

---

### Task B6: FastAPI offer server (`server.py`)

**Files:**
- Create: `pipecat/app/server.py`
- Test: `pipecat/tests/test_server_health.py`

The `@pipecat-ai/small-webrtc-transport` client POSTs `{sdp, type, pc_id?}` to the offer URL (with our query string) and expects `{sdp, type, pc_id}` back.

- [ ] **Step 1: Write the failing health test**

`pipecat/tests/test_server_health.py`:

```python
from fastapi.testclient import TestClient

from app.server import app


def test_health_endpoint_ok():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
```

- [ ] **Step 2: Run it to verify failure**

Run: `cd pipecat && source .venv/bin/activate && pytest tests/test_server_health.py -v`
Expected: FAIL — `app.server` does not exist.

- [ ] **Step 3: Implement `pipecat/app/server.py`**

```python
from __future__ import annotations

import uvicorn
from fastapi import BackgroundTasks, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from pipecat.transports.network.webrtc_connection import IceServer, SmallWebRTCConnection

from app.bot import run_bot
from app.config import load_config

config = load_config()
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_connections: dict[str, SmallWebRTCConnection] = {}
_ice_servers = [IceServer(urls="stun:stun.l.google.com:19302")]


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/api/offer")
async def offer(request: Request, background_tasks: BackgroundTasks) -> dict:
    body = await request.json()
    session_id = request.query_params.get("session_id", "")
    pc_id = body.get("pc_id")

    if pc_id and pc_id in _connections:
        connection = _connections[pc_id]
        await connection.renegotiate(sdp=body["sdp"], type=body["type"])
        return connection.get_answer()

    connection = SmallWebRTCConnection(_ice_servers)
    await connection.initialize(sdp=body["sdp"], type=body["type"])

    @connection.event_handler("closed")
    async def _on_closed(conn: SmallWebRTCConnection) -> None:
        _connections.pop(conn.pc_id, None)

    if not session_id:
        logger.warning("Offer received without session_id query param")

    background_tasks.add_task(run_bot, connection, config, session_id)
    answer = connection.get_answer()
    _connections[answer["pc_id"]] = connection
    return answer


def main() -> None:
    uvicorn.run(app, host="0.0.0.0", port=config.port)


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run the health test**

Run: `cd pipecat && source .venv/bin/activate && pytest tests/test_server_health.py -v`
Expected: PASS. (Importing `app.server` imports `run_bot`; if that fails, resolve Task B1/B5 import issues first.)

- [ ] **Step 5: Full Python suite**

Run: `cd pipecat && source .venv/bin/activate && pytest -v`
Expected: PASS (config, business_client, tutor, server health).

- [ ] **Step 6: Commit**

```bash
git add pipecat/app/server.py pipecat/tests/test_server_health.py
git commit -m "feat: fastapi /api/offer server for small-webrtc transport"
```

---

## Phase C — Frontend (display-only, server-owned turns)

### Task C1: Render the live caption log from Pipecat events (stop writing to backend)

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace the persistence path with a display-only list**

In `src/App.tsx`:

1. Add a state for live display turns near the other state (after `conversationTurns`):

```tsx
  const [liveTurns, setLiveTurns] = useState<PipecatVoiceTurn[]>([]);
```

2. Delete `recordVoiceTurn` (lines ~193-208) and replace `dedupeVoiceTurn` usage so it appends to `liveTurns` for display only. Replace the `dedupeVoiceTurn` + `recordVoiceTurn` pair with:

```tsx
  function appendLiveTurn(turn: PipecatVoiceTurn) {
    const key = `${turn.speaker}:${turn.text}`;
    if (recordedTurnKeysRef.current.has(key)) return;
    recordedTurnKeysRef.current.add(key);
    setLiveTurns((current) => [...current, turn]);
    if (turn.speaker === "ai") {
      setLatestAiText(turn.text);
      setPracticeStatus("speaking");
      setCoachState("asking");
      window.setTimeout(() => setPracticeStatus("listening"), 800);
    }
  }
```

3. In `startConversation`, change the `onTurn` callback (currently calls `recordVoiceTurn`) to:

```tsx
          onTurn: (turn) => appendLiveTurn(turn),
```

4. In `startConversation`, reset `liveTurns` alongside the other resets (where `setConversationTurns([])` is called):

```tsx
    setConversationTurns([]);
    setLiveTurns([]);
```

- [ ] **Step 2: Point the practice-screen caption list at `liveTurns`**

In the `screen === "practice"` block, the `aside.voice-log-side` renders `conversationTurns`. Change its source to `liveTurns` and use index keys (display turns have no id):

```tsx
            <div className="caption-stream voice-only-log">
              {liveTurns.length === 0 ? (
                <div className="caption-line system">开始训练后，用户和 AI 的每句话会实时写入这里。</div>
              ) : (
                liveTurns.map((turn, index) => (
                  <div className={`caption-line ${turn.speaker}`} key={`${turn.source}-${index}`}>
                    <span>{turn.speaker === "ai" ? "AI" : turn.speaker === "user" ? "You" : "System"}</span>
                    <p>{turn.text}</p>
                  </div>
                ))
              )}
            </div>
```

- [ ] **Step 3: Derive `userTurnCount` from live turns during practice**

Replace the `userTurnCount` definition (currently from `conversationTurns`) with one that prefers live turns and falls back to the server-loaded conversation (used on the report screen):

```tsx
  const userTurnCount =
    liveTurns.filter((turn) => turn.speaker === "user").length ||
    conversationTurns.filter((turn) => turn.speaker === "user").length;
```

- [ ] **Step 4: Type-check**

Run: `npm run typecheck`
Expected: PASS. (`api.addSessionTurn` is no longer called from `App.tsx`; it remains exported in `src/api.ts` for tests/other use.)

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: render live captions from Pipecat events, drop client-side turn writes"
```

---

### Task C2: Pull authoritative turns from the backend at report time

**Files:**
- Modify: `src/App.tsx` (`generatePracticeReport`)

- [ ] **Step 1: Load server turns and stop sending client turns**

Replace the body of `generatePracticeReport` so it (a) reads the authoritative conversation from the backend for the report replay, and (b) sends only `sessionId` + scenario metadata:

```tsx
  async function generatePracticeReport() {
    if (!practiceSession) return;
    setBusy("生成课后报告");
    setCoachState("reviewing");
    setPracticeStatus("thinking");

    const { session } = await api.readSession(practiceSession.id);
    setConversationTurns(session.conversation_turns);

    const result = await api.generateReport({
      sessionId: practiceSession.id,
      scenarioId: scenario.id,
      taskId: task.id,
      scenarioNameZh: scenario.nameZh,
      taskTitleZh: task.titleZh,
      taskFocus: task.focus
    });
    setReport(result);
    setCheckin(completeToday(result.totalScore, result.reportId));
    setLearning(
      recordLearning(
        createLearningRecord({
          date: getShanghaiDate(),
          scenarioNameZh: scenario.nameZh,
          scenarioNameEn: scenario.nameEn,
          taskTitleZh: task.titleZh,
          focus: task.focus,
          roundCount: session.conversation_turns.filter((turn) => turn.speaker === "user").length,
          report: result
        })
      )
    );
    setCoachState("celebrating");
    setPracticeStatus("completed");
    setScreen("report");
    setBusy("");
  }
```

The report screen's `ConversationLog turns={conversationTurns}` now shows the server-authoritative transcript.

- [ ] **Step 2: Type-check**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: report reads authoritative turns from backend session"
```

---

### Task C3: Auto-end when the countdown reaches zero

**Files:**
- Modify: `src/App.tsx`

Requirement #9: at the default duration the connection closes (in addition to the bot-side cap and the manual 结束训练 button).

- [ ] **Step 1: Add an effect that ends training at 0 seconds**

Add this effect alongside the other `useEffect`s (after the countdown helpers/state are defined):

```tsx
  useEffect(() => {
    if (remainingSeconds > 0) return;
    if (practiceStatus === "listening" || practiceStatus === "speaking" || practiceStatus === "thinking") {
      void endTraining();
    }
  }, [remainingSeconds, practiceStatus]);
```

- [ ] **Step 2: Type-check and run the frontend build**

Run: `npm run typecheck && npm run build`
Expected: PASS (build compiles the client).

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: auto-close realtime session when the countdown ends"
```

---

## Phase D — Wiring, env, run scripts, and E2E

### Task D1: Dev scripts, env example, and Python README

**Files:**
- Modify: `package.json` (scripts)
- Modify: `.env.example`
- Create: `pipecat/README.md`
- Create: `pipecat/.env.example`

- [ ] **Step 1: Add a `dev:voice` script and include it in `dev`**

In `package.json`, update the `scripts` block:

```json
  "scripts": {
    "dev": "concurrently \"npm:dev:server\" \"npm:dev:client\" \"npm:dev:voice\"",
    "dev:server": "tsx watch server/index.ts",
    "dev:client": "vite --host 127.0.0.1",
    "dev:voice": "cd pipecat && ./.venv/bin/python -m app.server",
    "build": "tsc -p tsconfig.json && vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
```

- [ ] **Step 2: Append a Pipecat section to the root `.env.example`**

Add at the end of `.env.example`:

```
# --- Pipecat Voice Agent (Python service on :7860) ---
# Reuses the same provider keys as the Node backend (global-mixed preset).
PIPECAT_PORT=7860
BUSINESS_API_URL=http://127.0.0.1:5174
# Shared secret guarding POST /api/session/:id/turns (optional locally; set in both processes for prod)
BOT_SHARED_SECRET=
DEEPGRAM_API_KEY=
DEEPGRAM_MODEL=nova-3
LLM_API_KEY=
LLM_BASE_URL=https://hezu.ink/v1
LLM_MODEL=gpt-5.4-mini
CARTESIA_API_KEY=
CARTESIA_VOICE_ID=
CARTESIA_TTS_MODEL=sonic-2
CARTESIA_VERSION=2026-03-01
# Hard ceiling (seconds) regardless of the session's requested duration
MAX_SESSION_SECONDS_CAP=600
```

- [ ] **Step 3: Create `pipecat/.env.example`** (same keys, for running the service standalone)

```
PIPECAT_PORT=7860
BUSINESS_API_URL=http://127.0.0.1:5174
BOT_SHARED_SECRET=
DEEPGRAM_API_KEY=
DEEPGRAM_MODEL=nova-3
LLM_API_KEY=
LLM_BASE_URL=https://hezu.ink/v1
LLM_MODEL=gpt-5.4-mini
CARTESIA_API_KEY=
CARTESIA_VOICE_ID=
CARTESIA_TTS_MODEL=sonic-2
CARTESIA_VERSION=2026-03-01
MAX_SESSION_SECONDS_CAP=600
```

- [ ] **Step 4: Create `pipecat/README.md`**

```markdown
# Speaking Coach — Pipecat Voice Agent

Realtime voice pipeline (WebRTC → Silero VAD → Deepgram STT → OpenAI-compatible LLM tutor →
Cartesia TTS). Writes each finalized turn to the Node business backend; the backend owns
`practice_session` / `conversation_turns` and report generation.

## Setup
```bash
cd pipecat
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python verify_imports.py        # confirm the Pipecat API surface
cp .env.example .env            # fill in provider keys
```

## Run
```bash
./.venv/bin/python -m app.server   # serves http://127.0.0.1:7860
```
Or from the repo root, `npm run dev` starts backend (5174), client (5173), and this service (7860).

## Test
```bash
pytest -v
```
```

- [ ] **Step 5: Verify scripts parse and Node still builds**

Run: `npm run typecheck`
Expected: PASS. (Does not start the Python process.)

- [ ] **Step 6: Commit**

```bash
git add package.json .env.example pipecat/README.md pipecat/.env.example
git commit -m "chore: dev orchestration, env examples, and pipecat README"
```

---

### Task D2: End-to-end verification (manual)

**Files:** none (verification only)

- [ ] **Step 1: Start all three processes with real keys**

Fill `.env` / `pipecat/.env` with Deepgram, OpenAI-compatible LLM, and Cartesia keys + a Cartesia `voice_id`. Then:

```bash
npm run dev
```
Expected: backend logs `listening on :5174`, Vite serves `:5173`, uvicorn serves `:7860`, and `curl -s http://127.0.0.1:7860/health` returns `{"status":"ok"}`.

- [ ] **Step 2: Run one full practice session**

In the browser at `http://127.0.0.1:5173`: choose a scenario → 开始训练. Verify:
- The bot speaks the opening question (audio plays).
- Speaking a sentence, then pausing, auto-triggers a transcript (VAD) with no "submit" click (requirement #4).
- The AI asks a context-aware follow-up (requirement #5).
- The right-side log shows each user and AI line in real time (requirement #8), with no confidence/edit/audio-player UI.

- [ ] **Step 3: Confirm server-side persistence**

While the session runs, in another shell:
```bash
curl -s http://127.0.0.1:5174/api/session/<sessionId> | python3 -m json.tool
```
Expected: `conversation_turns` grows with `ai`/`user` entries written by the Python service (requirement #7), the opening line appears exactly once (no duplicate).

- [ ] **Step 4: End and report**

Click 结束训练 (or let the countdown hit 0 — requirement #9). The WebRTC connection closes. Click 生成报告. Verify the report renders all seven dimensions (`fluency, pronunciation, grammar, vocabulary, coherence, task_completion, interaction`, requirement #11) and the replay shows the full server-side transcript (requirement #10).

- [ ] **Step 5: Record results**

Note any failures and fix the relevant task before considering the feature complete. No commit (verification only).

---

## Self-Review

**Spec coverage (design §6 table):**
- #1 three controls — existing UI retained; Tasks C1–C3 keep 开始/结束/生成报告. ✓
- #2 WebRTC to Pipecat — existing `createPipecatOfferUrl` + Task B6 `/api/offer`. ✓
- #3 full pipeline — Task B5. ✓
- #4 VAD auto end-of-turn — Task B5 `SileroVADAnalyzer`. ✓
- #5 dynamic follow-ups — Task B4 prompt + Task B5 context aggregator. ✓
- #6 backend owns session/turns — Phase A retains the REST contract. ✓
- #7 realtime turn writes (server-side) — Task B5 `on_transcript_update` → `post_turn`. ✓
- #8 display-only right panel — Task C1. ✓
- #9 close at duration / on end — Task B5 timer + Task C3 countdown + manual button. ✓
- #10 report from full turns — Task A3 + Task C2. ✓
- #11 seven dimensions — locked by Task A3 test (existing schema). ✓
- #12 Pipecat only does the voice layer — Task A1 removes the rival Node loop; Python service has no business logic. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full content. The only deferred item is exact Pipecat import paths, which Task B1 verifies with a concrete script and Tasks B5/B6 consume — this is a real verification step, not a placeholder.

**Type/naming consistency:** `BusinessClient.get_session`/`post_turn`, `load_config`/`VoiceAgentConfig`, `build_system_prompt`/`opening_text_from_session`, `run_bot(webrtc_connection, config, session_id)`, and the frontend `liveTurns`/`appendLiveTurn` names are used consistently across tasks. `_ROLE_TO_SPEAKER` maps `assistant→ai`, `user→user`, matching the backend `speaker` enum (`ai`/`user`/`system`).

**Open risk carried forward:** Pipecat class/param names (`TransportParams` fields, `transport.input()/output()`, `create_context_aggregator`, `TranscriptProcessor` message fields) are the early-2026 API; if Task B1 reports drift, apply the corrected symbols in B5/B6 before running.
