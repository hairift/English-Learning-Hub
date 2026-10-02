import type { BotLLMTextData, Participant, TranscriptData, TransportState } from "@pipecat-ai/client-js";
import { PipecatClient } from "@pipecat-ai/client-js";
import { SmallWebRTCTransport } from "@pipecat-ai/small-webrtc-transport";

export type PipecatVoiceTurn = {
  speaker: "ai" | "user" | "system";
  text: string;
  timestamp?: string;
  source: "server" | "transcript" | "bot_llm";
};

export type PipecatVoiceCallbacks = {
  onStatus: (status: TransportState | "bot-ready" | "user-speaking" | "bot-speaking") => void;
  onTurn: (turn: PipecatVoiceTurn) => void;
  onError: (message: string) => void;
  onDisconnected: () => void;
  // Callback opsional: dipakai untuk menyambungkan audio bot ke lip sync 3D.
  onBotAudioStream?: (stream: MediaStream) => void;
  // Callback opsional: dipanggil saat audio bot berhenti, agar lip sync diam.
  onBotAudioStreamEnded?: () => void;
};

export type PipecatVoiceClient = {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

function normalizeServerTurn(data: unknown): PipecatVoiceTurn | null {
  if (!data || typeof data !== "object") return null;
  const message = data as Record<string, unknown>;
  if (message.type !== "conversation_turn") return null;

  const speaker = message.speaker;
  const text = typeof message.text === "string" ? message.text.trim() : "";
  if ((speaker !== "ai" && speaker !== "user" && speaker !== "system") || !text) return null;

  return {
    speaker,
    text,
    timestamp: typeof message.timestamp === "string" ? message.timestamp : undefined,
    source: "server"
  };
}

function transcriptToTurn(data: TranscriptData): PipecatVoiceTurn | null {
  const text = data.text.trim();
  if (!data.final || !text) return null;
  return {
    speaker: "user",
    text,
    timestamp: data.timestamp,
    source: "transcript"
  };
}

function createAudioElement() {
  const audio = document.createElement("audio");
  audio.autoplay = true;
  audio.setAttribute("playsinline", "true");
  audio.style.display = "none";
  document.body.appendChild(audio);
  return audio;
}

export function shouldDetachBotAudioTrack(track: MediaStreamTrack) {
  return track.readyState === "ended";
}

export function shouldAttachBotAudioTrack(track: MediaStreamTrack, participant?: Participant) {
  if (track.kind !== "audio") return false;
  return participant?.local !== true;
}

export function createPipecatVoiceClient({
  webrtcUrl,
  callbacks
}: {
  webrtcUrl: string;
  callbacks: PipecatVoiceCallbacks;
}): PipecatVoiceClient {
  const botAudio = createAudioElement();
  let botLlmChunks: string[] = [];
  let isConnected = false;

  function setMicEnabledSafely(enabled: boolean) {
    if (!isConnected) return;
    try {
      client.enableMic(enabled);
    } catch {
      // Device state may briefly race during connect/disconnect; the next state event will recover.
    }
  }

  function attachBotAudioTrack(track: MediaStreamTrack, participant?: Participant) {
    if (!shouldAttachBotAudioTrack(track, participant)) return;
    const stream = new MediaStream([track]);
    botAudio.srcObject = stream;
    void botAudio.play().catch(() => {
      callbacks.onError(
        "The browser blocked AI audio playback. Click Start Training again or check the speaker permission."
      );
    });
    // Sambungkan stream audio bot ke lip sync supaya mulut avatar 3D bergerak sinkron.
    callbacks.onBotAudioStream?.(stream);
  }

  function appendBotLlmText(data: BotLLMTextData) {
    if (data.text) botLlmChunks.push(data.text);
  }

  function flushBotLlmTurn() {
    const text = botLlmChunks.join("").replace(/\s+/g, " ").trim();
    botLlmChunks = [];
    if (!text) return;
    callbacks.onTurn({
      speaker: "ai",
      text,
      timestamp: new Date().toISOString(),
      source: "bot_llm"
    });
  }

  const client = new PipecatClient({
    transport: new SmallWebRTCTransport({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    }),
    enableCam: false,
    enableMic: true,
    callbacks: {
      onConnected: () => {
        isConnected = true;
        callbacks.onStatus("connected");
      },
      onDisconnected: () => {
        isConnected = false;
        callbacks.onDisconnected();
      },
      onTransportStateChanged: (state) => callbacks.onStatus(state),
      onBotReady: () => callbacks.onStatus("bot-ready"),
      onUserStartedSpeaking: () => callbacks.onStatus("user-speaking"),
      onBotStartedSpeaking: () => {
        setMicEnabledSafely(false);
        callbacks.onStatus("bot-speaking");
      },
      onBotStoppedSpeaking: () => {
        setMicEnabledSafely(true);
        callbacks.onStatus("connected");
      },
      onTrackStarted: attachBotAudioTrack,
      onTrackStopped: (track, participant) => {
        if (shouldAttachBotAudioTrack(track, participant) && botAudio.srcObject && shouldDetachBotAudioTrack(track)) {
          botAudio.srcObject = null;
          // Audio bot berhenti: hentikan gerakan mulut avatar.
          callbacks.onBotAudioStreamEnded?.();
        }
      },
      onUserTranscript: (data) => {
        const turn = transcriptToTurn(data);
        if (turn) callbacks.onTurn(turn);
      },
      onBotLlmStarted: () => {
        botLlmChunks = [];
      },
      onBotLlmText: appendBotLlmText,
      onBotLlmStopped: flushBotLlmTurn,
      onServerMessage: (data) => {
        const turn = normalizeServerTurn(data);
        if (turn) callbacks.onTurn(turn);
      },
      onError: (message) => {
        const data = message.data as { message?: string } | undefined;
        callbacks.onError(
          data?.message || "Voice service is not running. Start the Python service on 127.0.0.1:7860, then try again."
        );
      },
      onMessageError: () =>
        callbacks.onError("Voice connected, but AI audio is not playing yet. Check output device or restart training.")
    }
  });

  return {
    async connect() {
      await client.connect({ webrtcUrl });
    },
    async disconnect() {
      isConnected = false;
      await client.disconnect();
      botAudio.pause();
      botAudio.srcObject = null;
      botAudio.remove();
    }
  };
}
