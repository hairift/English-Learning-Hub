import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from loguru import logger
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import (
    Frame,
    LLMFullResponseEndFrame,
    LLMFullResponseStartFrame,
    LLMTextFrame,
    OutputTransportMessageFrame,
    TTSSpeakFrame,
)
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.worker import PipelineParams, PipelineWorker
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.processors.frameworks.rtvi import models as RTVI
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.processors.idle_frame_processor import IdleFrameProcessor
from pipecat.services.assemblyai.stt import AssemblyAISTTService
from pipecat.services.cartesia.tts import CartesiaTTSService
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.transports.base_transport import TransportParams
from pipecat.transports.smallwebrtc.transport import SmallWebRTCTransport
from pipecat.workers.runner import WorkerRunner

load_dotenv(override=True)


def env_first(*names: str, default: str = "") -> str:
    for name in names:
        value = os.getenv(name)
        if value:
            return value
    return default


def build_system_instruction(target_goal: str, scenario_id: str, task_id: str) -> str:
    return f"""
You are Sela, the English speaking tutor of "Sela Tutor English", helping Indonesian learners
practice spoken English with confidence.

Mode:
- Run a natural 5 to 7 minute continuous spoken conversation.
- Do not use fixed rounds, quizzes, or numbered questions.
- Ask one short follow-up at a time and keep the session moving.
- Give only light in-session guidance. Leave detailed grammar and scoring for the final report.
- Speak English only unless the user is stuck; then give one short Indonesian scaffold and return to English.
- You are in a real-time voice call with TTS audio. Never say you are text-only.
- If the learner says they cannot hear you, say one short check like
  "I am speaking now; please check your speaker output," then continue the practice.

Training context:
- scenario_id: {scenario_id}
- task_id: {task_id}
- target_goal: {target_goal}

Tutor strategy:
- Stay goal-driven. If the target is a project interview, explore background, user role,
  technical approach, measurable result, challenge, and reflection.
- Listen to the user's exact wording. If they say something unclear like "AI urgent",
  infer the likely meaning, ask a clarification, and continue naturally.
- Example: if the user says "It is about my AI urgent", respond:
  "Do you mean an AI agent project? What problem did it solve?"
- Keep responses concise enough for low-latency TTS.
- Be warm, direct, constructive, and calm. Never shame the learner.
""".strip()


def clean_opening_text(value: str) -> str:
    text = " ".join(value.split())
    return text[:280] if text else "Tell me about one project you are proud of."


class AssistantTurnPublisher(FrameProcessor):
    def __init__(self, *, session_id: str, **kwargs):
        super().__init__(**kwargs)
        self._session_id = session_id
        self._assistant_chunks: list[str] = []

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, LLMFullResponseStartFrame):
            self._assistant_chunks = []
        elif isinstance(frame, LLMTextFrame):
            self._assistant_chunks.append(frame.text)
        elif isinstance(frame, LLMFullResponseEndFrame):
            assistant_text = " ".join("".join(self._assistant_chunks).split())
            self._assistant_chunks = []
            if assistant_text:
                await self.push_frame(
                    OutputTransportMessageFrame(
                        message=RTVI.ServerMessage(
                            data={
                                "type": "conversation_turn",
                                "speaker": "ai",
                                "text": assistant_text,
                                "timestamp": datetime.now(timezone.utc).isoformat(),
                                "session_id": self._session_id,
                            }
                        ).model_dump()
                    ),
                    direction,
                )

        await self.push_frame(frame, direction)


async def run_bot(webrtc_connection, session_params: dict[str, str]):
    session_id = session_params.get("session_id", "")
    scenario_id = session_params.get("scenario_id", "interview")
    task_id = session_params.get("task_id", "internship-intro")
    target_goal = session_params.get("target_goal", "make the answer clear")
    opening_text = clean_opening_text(session_params.get("opening_text", ""))

    transport = SmallWebRTCTransport(
        webrtc_connection=webrtc_connection,
        params=TransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            audio_out_10ms_chunks=2,
            vad_analyzer=SileroVADAnalyzer(),
        ),
    )

    stt = AssemblyAISTTService(
        api_key=env_first("ASSEMBLYAI_API_KEY", "ASR_API_KEY"),
        vad_force_turn_endpoint=False,
        settings=AssemblyAISTTService.Settings(
            min_turn_silence=800,
            max_turn_silence=1200,
        ),
    )

    llm = OpenAILLMService(
        api_key=env_first("LLM_API_KEY", "OPENAI_API_KEY"),
        base_url=env_first("LLM_BASE_URL", default="https://api.openai.com/v1"),
        settings=OpenAILLMService.Settings(
            model=env_first("LLM_MODEL", "OPENAI_LLM_MODEL", default="gpt-4o-mini"),
            temperature=0.7,
            max_completion_tokens=180,
            system_instruction=build_system_instruction(target_goal, scenario_id, task_id),
        ),
    )

    tts = CartesiaTTSService(
        api_key=env_first("CARTESIA_API_KEY", "TTS_API_KEY"),
        cartesia_version=env_first("CARTESIA_VERSION", "TTS_VERSION", default="2026-03-01"),
        settings=CartesiaTTSService.Settings(
            model=env_first("CARTESIA_TTS_MODEL", "TTS_MODEL", default="sonic-3.5"),
            voice=env_first("CARTESIA_VOICE_ID", "TTS_VOICE_ID"),
        ),
    )

    context = LLMContext(
        [
            {
                "role": "assistant",
                "content": opening_text,
            }
        ],
    )
    user_aggregator, assistant_aggregator = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(vad_analyzer=SileroVADAnalyzer()),
    )
    assistant_turn_publisher = AssistantTurnPublisher(session_id=session_id)

    worker: PipelineWorker | None = None

    async def handle_user_idle(processor):
        if worker:
            await worker.queue_frames([TTSSpeakFrame("Take your time. Start with one clear sentence.")])

    user_idle = IdleFrameProcessor(timeout=6.0, callback=handle_user_idle)

    pipeline = Pipeline(
        [
            transport.input(),
            user_idle,
            stt,
            user_aggregator,
            llm,
            assistant_turn_publisher,
            tts,
            transport.output(),
            assistant_aggregator,
        ]
    )
    worker = PipelineWorker(
        pipeline,
        params=PipelineParams(
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
    )

    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        logger.info(f"Client connected for session {session_id}")
        await worker.queue_frames([TTSSpeakFrame(opening_text)])

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info(f"Client disconnected for session {session_id}")
        await worker.cancel()

    @transport.event_handler("on_app_message")
    async def on_app_message(transport, message, sender):
        if isinstance(message, dict) and message.get("type") == "idle_prompt":
            await worker.queue_frames([TTSSpeakFrame("Take your time. Start with one clear sentence.")])

    runner = WorkerRunner(handle_sigint=False)
    await runner.add_workers(worker)
    await runner.run()
