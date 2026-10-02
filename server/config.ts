import type { LiveConfig } from "./providers/liveProviders";
import { ambilStatusLayananTts } from "./providers/ttsServiceStatus";
import type { ModeBahasaTts } from "../shared/textNormalizer";
import "./env";

export type ProviderPreset = "sela-default" | "global-mixed" | "china-qwen" | "groq-elevenlabs" | "custom";
export type AsrProvider = "mock" | "deepgram" | "qwen-asr" | "assemblyai" | "aliyun-isi" | "iflytek";
export type LlmProvider = "openai" | "qwen" | "doubao" | "kimi" | "groq" | "custom-openai-compatible";
export type TtsProvider =
  | "mock"
  | "supertonic"
  | "cartesia"
  | "qwen-tts"
  | "elevenlabs"
  | "aliyun-isi"
  | "iflytek";
export type PronunciationProvider = "rule" | "qwen" | "iflytek";

export type AppOptions = {
  apiMode?: "mock" | "live";
  /**
   * Simpan pengaturan ke berkas `.sela-settings.json`.
   * Default: aktif, kecuali saat menjalankan pengujian (NODE_ENV=test / VITEST).
   */
  persistSettings?: boolean;
};

export type RuntimeSettingsInput = {
  apiMode?: "mock" | "live";
  providerPreset?: ProviderPreset;
  asrProvider?: AsrProvider;
  asrApiKey?: string;
  asrModel?: string;
  deepgramApiKey?: string;
  llmProvider?: LlmProvider;
  llmApiKey?: string;
  llmBaseUrl?: string;
  llmModel?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  ttsProvider?: TtsProvider;
  ttsApiKey?: string;
  ttsModel?: string;
  /** Mode bahasa TTS: 'auto' | 'id' | 'en'. */
  ttsLanguageMode?: ModeBahasaTts;
  /** Suara Supertonic (F1-F5 wanita, M1-M5 pria). */
  ttsVoiceId?: string;
  /** Kecepatan bicara Supertonic. */
  ttsSpeed?: number;
  /** Kualitas Supertonic (5-12). */
  ttsSteps?: number;
  /** URL layanan sidecar Supertonic. */
  ttsServiceUrl?: string;
  cartesiaApiKey?: string;
  cartesiaVersion?: string;
  cartesiaModel?: string;
  cartesiaVoiceId?: string;
  pronunciationProvider?: PronunciationProvider;
};

type ProviderDefaults = Pick<
  LiveConfig,
  | "providerPreset"
  | "asrProvider"
  | "asrModel"
  | "llmProvider"
  | "llmBaseUrl"
  | "llmModel"
  | "ttsProvider"
  | "ttsVersion"
  | "ttsModel"
  | "pronunciationProvider"
>;

/** URL default layanan TTS Supertonic (sidecar Python). */
export const URL_LAYANAN_TTS_DEFAULT = process.env.TTS_SERVICE_URL || "http://127.0.0.1:7861";

/** Suara default Supertonic: F1 = perempuan (bahasa Indonesia & Inggris). */
export const SUARA_SUPERTONIC_DEFAULT = "F1";

const PRESETS: Record<ProviderPreset, ProviderDefaults> = {
  /**
   * Preset default Sela Tutor English.
   * LLM: Groq (cepat + murah). TTS: Supertonic (on-device, ID + EN).
   * ASR: browser bawaan (Web Speech API) sehingga bisa jalan tanpa kunci tambahan.
   */
  "sela-default": {
    providerPreset: "sela-default",
    asrProvider: "mock",
    asrModel: "browser-native",
    llmProvider: "groq",
    llmBaseUrl: "https://api.groq.com/openai/v1",
    llmModel: "qwen/qwen3.8-27b",
    ttsProvider: "supertonic",
    ttsVersion: "",
    ttsModel: "supertonic-3",
    pronunciationProvider: "rule"
  },
  /** Kombinasi lama: Groq LLM + ElevenLabs TTS. Tetap disediakan sebagai alternatif. */
  "groq-elevenlabs": {
    providerPreset: "groq-elevenlabs",
    asrProvider: "mock",
    asrModel: "browser-native",
    llmProvider: "groq",
    llmBaseUrl: "https://api.groq.com/openai/v1",
    llmModel: "qwen/qwen3.8-27b",
    ttsProvider: "elevenlabs",
    ttsVersion: "",
    ttsModel: "eleven_multilingual_v2",
    pronunciationProvider: "rule"
  },
  "china-qwen": {
    providerPreset: "china-qwen",
    asrProvider: "qwen-asr",
    asrModel: "qwen3-asr-flash",
    llmProvider: "qwen",
    llmBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    llmModel: "qwen-plus",
    ttsProvider: "qwen-tts",
    ttsVersion: "",
    ttsModel: "qwen3-tts-flash",
    pronunciationProvider: "qwen"
  },
  "global-mixed": {
    providerPreset: "global-mixed",
    asrProvider: "assemblyai",
    asrModel: "universal-3-pro",
    llmProvider: "custom-openai-compatible",
    llmBaseUrl: "https://hezu.ink/v1",
    llmModel: "gpt-5.4-mini",
    ttsProvider: "cartesia",
    ttsVersion: "2026-03-01",
    ttsModel: "sonic-3.5",
    pronunciationProvider: "rule"
  },
  custom: {
    providerPreset: "custom",
    asrProvider: "assemblyai",
    asrModel: "universal-3-pro",
    llmProvider: "custom-openai-compatible",
    llmBaseUrl: "https://hezu.ink/v1",
    llmModel: "gpt-5.4-mini",
    ttsProvider: "supertonic",
    ttsVersion: "",
    ttsModel: "supertonic-3",
    pronunciationProvider: "rule"
  }
};

function isOneOf<T extends string>(value: string | undefined, options: readonly T[]): value is T {
  return Boolean(value && (options as readonly string[]).includes(value));
}

function readProviderPreset(value: string | undefined): ProviderPreset {
  return isOneOf(value, ["sela-default", "global-mixed", "china-qwen", "groq-elevenlabs", "custom"] as const)
    ? value
    : "sela-default";
}

function readAsrProvider(value: string | undefined, fallback: AsrProvider): AsrProvider {
  return isOneOf(value, ["mock", "deepgram", "qwen-asr", "assemblyai", "aliyun-isi", "iflytek"] as const)
    ? value
    : fallback;
}

function readLlmProvider(value: string | undefined, fallback: LlmProvider): LlmProvider {
  return isOneOf(value, ["openai", "qwen", "doubao", "kimi", "groq", "custom-openai-compatible"] as const)
    ? value
    : fallback;
}

function readTtsProvider(value: string | undefined, fallback: TtsProvider): TtsProvider {
  return isOneOf(
    value,
    ["mock", "supertonic", "cartesia", "qwen-tts", "elevenlabs", "aliyun-isi", "iflytek"] as const
  )
    ? value
    : fallback;
}

function readPronunciationProvider(
  value: string | undefined,
  fallback: PronunciationProvider
): PronunciationProvider {
  return isOneOf(value, ["rule", "qwen", "iflytek"] as const) ? value : fallback;
}

function readModeBahasa(value: string | undefined, fallback: ModeBahasaTts): ModeBahasaTts {
  return isOneOf(value, ["auto", "id", "en"] as const) ? value : fallback;
}

function readLlmApiKey(provider: LlmProvider): string | undefined {
  if (provider === "groq") return process.env.GROQ_API_KEY || process.env.LLM_API_KEY;
  if (provider === "qwen") return process.env.DASHSCOPE_API_KEY || process.env.LLM_API_KEY;
  if (provider === "doubao") return process.env.ARK_API_KEY || process.env.LLM_API_KEY;
  if (provider === "kimi") return process.env.MOONSHOT_API_KEY || process.env.LLM_API_KEY;
  if (process.env.LLM_API_KEY) return process.env.LLM_API_KEY;
  return process.env.OPENAI_API_KEY;
}

function readNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getConfig(options: AppOptions = {}): LiveConfig {
  const apiMode = options.apiMode ?? (process.env.API_MODE === "live" ? "live" : "mock");
  const providerPreset = readProviderPreset(process.env.API_PROVIDER_PRESET);
  const preset = PRESETS[providerPreset];
  const asrProvider = readAsrProvider(process.env.ASR_PROVIDER, preset.asrProvider);
  const llmProvider = readLlmProvider(process.env.LLM_PROVIDER, preset.llmProvider);
  const llmModel = process.env.LLM_MODEL || process.env.OPENAI_LLM_MODEL || preset.llmModel;
  const ttsModel = process.env.TTS_MODEL || process.env.CARTESIA_TTS_MODEL || preset.ttsModel;
  const ttsProvider = readTtsProvider(process.env.TTS_PROVIDER, preset.ttsProvider);
  const dashscopeApiKey = process.env.DASHSCOPE_API_KEY;

  return {
    apiMode,
    providerPreset,
    asrProvider,
    asrModel: process.env.ASR_MODEL || preset.asrModel,
    asrApiKey:
      process.env.ASR_API_KEY ||
      (asrProvider === "assemblyai" ? process.env.ASSEMBLYAI_API_KEY : undefined) ||
      (asrProvider === "qwen-asr" ? dashscopeApiKey : undefined) ||
      process.env.DEEPGRAM_API_KEY,
    deepgramApiKey: process.env.DEEPGRAM_API_KEY || process.env.ASR_API_KEY,
    llmProvider,
    llmApiKey: readLlmApiKey(llmProvider),
    llmBaseUrl: process.env.LLM_BASE_URL ?? preset.llmBaseUrl,
    llmModel,
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_LLM_MODEL || llmModel,
    ttsProvider,
    ttsApiKey:
      process.env.TTS_API_KEY ||
      process.env.ELEVENLABS_API_KEY ||
      (ttsProvider === "qwen-tts" ? dashscopeApiKey : undefined) ||
      process.env.CARTESIA_API_KEY,
    ttsVersion: process.env.TTS_VERSION || process.env.CARTESIA_VERSION || preset.ttsVersion,
    ttsModel,
    ttsVoiceId:
      process.env.TTS_VOICE_ID ||
      process.env.SUPERTONIC_VOICE ||
      process.env.CARTESIA_VOICE_ID ||
      (ttsProvider === "supertonic" ? SUARA_SUPERTONIC_DEFAULT : undefined),
    ttsLanguageMode: readModeBahasa(process.env.TTS_LANGUAGE_MODE, "auto"),
    ttsSpeed: readNumber(process.env.TTS_SPEED, 1),
    ttsSteps: readNumber(process.env.TTS_STEPS, 8),
    ttsServiceUrl: URL_LAYANAN_TTS_DEFAULT,
    cartesiaApiKey: process.env.CARTESIA_API_KEY || process.env.TTS_API_KEY,
    cartesiaVersion: process.env.CARTESIA_VERSION || process.env.TTS_VERSION || preset.ttsVersion,
    cartesiaModel: process.env.CARTESIA_TTS_MODEL || process.env.TTS_MODEL || ttsModel,
    cartesiaVoiceId: process.env.CARTESIA_VOICE_ID || process.env.TTS_VOICE_ID,
    pronunciationProvider: readPronunciationProvider(
      process.env.PRONUNCIATION_PROVIDER,
      preset.pronunciationProvider
    )
  };
}

function cleanValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function cleanNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function applyRuntimeSettings(config: LiveConfig, input: RuntimeSettingsInput): LiveConfig {
  if (input.apiMode === "mock" || input.apiMode === "live") {
    config.apiMode = input.apiMode;
  }

  if (input.providerPreset && PRESETS[input.providerPreset]) {
    Object.assign(config, PRESETS[input.providerPreset]);
    // Suara Supertonic dipertahankan saat berpindah ke preset Supertonic.
    if (config.ttsProvider === "supertonic" && !config.ttsVoiceId) {
      config.ttsVoiceId = SUARA_SUPERTONIC_DEFAULT;
    }
  }

  if (input.asrProvider) config.asrProvider = readAsrProvider(input.asrProvider, config.asrProvider);
  if (input.llmProvider) config.llmProvider = readLlmProvider(input.llmProvider, config.llmProvider);
  if (input.ttsProvider) config.ttsProvider = readTtsProvider(input.ttsProvider, config.ttsProvider);
  if (input.pronunciationProvider) {
    config.pronunciationProvider = readPronunciationProvider(
      input.pronunciationProvider,
      config.pronunciationProvider
    );
  }
  if (input.ttsLanguageMode) {
    config.ttsLanguageMode = readModeBahasa(input.ttsLanguageMode, config.ttsLanguageMode);
  }

  const asrApiKey = cleanValue(input.asrApiKey);
  const asrModel = cleanValue(input.asrModel);
  const deepgramApiKey = cleanValue(input.deepgramApiKey);
  const llmApiKey = cleanValue(input.llmApiKey);
  const llmBaseUrl = cleanValue(input.llmBaseUrl);
  const llmModel = cleanValue(input.llmModel);
  const openaiApiKey = cleanValue(input.openaiApiKey);
  const ttsApiKey = cleanValue(input.ttsApiKey);
  const ttsModel = cleanValue(input.ttsModel);
  const cartesiaApiKey = cleanValue(input.cartesiaApiKey);
  const openaiModel = cleanValue(input.openaiModel);
  const cartesiaVersion = cleanValue(input.cartesiaVersion);
  const cartesiaModel = cleanValue(input.cartesiaModel);
  const cartesiaVoiceId = cleanValue(input.cartesiaVoiceId);
  const ttsVoiceId = cleanValue(input.ttsVoiceId);
  const ttsServiceUrl = cleanValue(input.ttsServiceUrl);
  const ttsSpeed = cleanNumber(input.ttsSpeed);
  const ttsSteps = cleanNumber(input.ttsSteps);

  if (asrApiKey || deepgramApiKey) {
    config.asrApiKey = asrApiKey || deepgramApiKey;
    config.deepgramApiKey = deepgramApiKey || asrApiKey;
  }
  if (asrModel) config.asrModel = asrModel;
  if (llmApiKey || openaiApiKey) {
    config.llmApiKey = llmApiKey || openaiApiKey;
    config.openaiApiKey = openaiApiKey || llmApiKey;
  }
  if (llmBaseUrl !== undefined) config.llmBaseUrl = llmBaseUrl;
  if (llmModel || openaiModel) {
    config.llmModel = llmModel || openaiModel || config.llmModel;
    config.openaiModel = openaiModel || llmModel || config.openaiModel;
  }
  if (ttsApiKey || cartesiaApiKey) {
    config.ttsApiKey = ttsApiKey || cartesiaApiKey;
    config.cartesiaApiKey = cartesiaApiKey || ttsApiKey;
  }
  if (cartesiaVersion) {
    config.ttsVersion = cartesiaVersion;
    config.cartesiaVersion = cartesiaVersion;
  }
  if (ttsModel || cartesiaModel) {
    config.ttsModel = ttsModel || cartesiaModel || config.ttsModel;
    config.cartesiaModel = cartesiaModel || ttsModel || config.cartesiaModel;
  }
  if (ttsVoiceId || cartesiaVoiceId) {
    config.ttsVoiceId = ttsVoiceId || cartesiaVoiceId;
    config.cartesiaVoiceId = cartesiaVoiceId || ttsVoiceId;
  }
  if (ttsServiceUrl !== undefined) config.ttsServiceUrl = ttsServiceUrl;
  if (ttsSpeed !== undefined) config.ttsSpeed = Math.max(0.7, Math.min(2, ttsSpeed));
  if (ttsSteps !== undefined) config.ttsSteps = Math.max(5, Math.min(12, Math.round(ttsSteps)));

  return config;
}

export function getRuntimeSettings(config: LiveConfig) {
  return {
    ...getHealth(config),
    editable: {
      providerPreset: config.providerPreset,
      asrProvider: config.asrProvider,
      asrModel: config.asrModel,
      llmProvider: config.llmProvider,
      llmBaseUrl: config.llmBaseUrl || "",
      llmModel: config.llmModel,
      ttsProvider: config.ttsProvider,
      ttsVersion: config.ttsVersion || "",
      ttsModel: config.ttsModel,
      ttsVoiceId: config.ttsVoiceId || "",
      ttsLanguageMode: config.ttsLanguageMode,
      ttsSpeed: config.ttsSpeed,
      ttsSteps: config.ttsSteps,
      ttsServiceUrl: config.ttsServiceUrl,
      pronunciationProvider: config.pronunciationProvider,
      openaiModel: config.llmModel,
      cartesiaVersion: config.ttsVersion || "",
      cartesiaModel: config.ttsModel,
      cartesiaVoiceId: config.ttsVoiceId || ""
    }
  };
}

export function getHealth(config: LiveConfig) {
  const asrIsMock = config.asrProvider === "mock";
  const asrIsReady =
    asrIsMock ||
    (config.asrProvider === "deepgram" && Boolean(config.deepgramApiKey)) ||
    (config.asrProvider === "qwen-asr" && Boolean(config.asrApiKey)) ||
    (config.asrProvider === "assemblyai" && Boolean(config.asrApiKey));
  const asrIsImplemented =
    asrIsMock ||
    config.asrProvider === "deepgram" ||
    config.asrProvider === "qwen-asr" ||
    config.asrProvider === "assemblyai";
  const ttsIsMock = config.ttsProvider === "mock";
  const ttsIsSupertonic = config.ttsProvider === "supertonic";
  const ttsIsReady =
    ttsIsMock ||
    ttsIsSupertonic ||
    (config.ttsProvider === "elevenlabs" && Boolean(config.ttsApiKey)) ||
    (config.ttsProvider === "cartesia" && Boolean(config.ttsApiKey && config.ttsVoiceId)) ||
    (config.ttsProvider === "qwen-tts" && Boolean(config.ttsApiKey));
  const ttsIsImplemented =
    ttsIsMock ||
    ttsIsSupertonic ||
    config.ttsProvider === "elevenlabs" ||
    config.ttsProvider === "cartesia" ||
    config.ttsProvider === "qwen-tts";
  const llmIsReady = Boolean(config.llmApiKey);
  const statusLayanan = ambilStatusLayananTts();

  const asr = {
    provider: config.asrProvider,
    configured: asrIsReady,
    active: config.apiMode === "live" && asrIsReady && asrIsImplemented,
    status: !asrIsImplemented ? "planned" : asrIsReady ? "ready" : "missing-key",
    model: config.asrModel
  };
  const llm = {
    provider: config.llmProvider,
    configured: llmIsReady,
    active: config.apiMode === "live" && llmIsReady,
    model: config.llmModel,
    baseUrl: config.llmBaseUrl || "",
    status: llmIsReady ? "ready" : "missing-key"
  };
  const tts = {
    provider: config.ttsProvider,
    configured: ttsIsReady,
    active: config.apiMode === "live" && ttsIsReady && ttsIsImplemented,
    model: config.ttsModel,
    voice: config.ttsVoiceId || "",
    languageMode: config.ttsLanguageMode,
    status: !ttsIsImplemented
      ? "planned"
      : ttsIsSupertonic
        ? statusLayanan.tersedia
          ? "ready"
          : "local-offline"
        : ttsIsReady
          ? "ready"
          : "missing-key"
  };

  return {
    mode: config.apiMode,
    providers: {
      asr,
      llm,
      tts,
      pronunciation: {
        provider: config.pronunciationProvider,
        configured: config.pronunciationProvider === "rule" || Boolean(config.llmApiKey),
        active:
          config.pronunciationProvider === "rule" ||
          (config.apiMode === "live" && config.pronunciationProvider === "qwen" && Boolean(config.llmApiKey)),
        status:
          config.pronunciationProvider === "rule" || Boolean(config.llmApiKey) ? "ready" : "missing-key"
      },
      deepgram: {
        configured: config.asrProvider === "deepgram" && Boolean(config.deepgramApiKey),
        active: config.apiMode === "live" && config.asrProvider === "deepgram" && Boolean(config.deepgramApiKey)
      },
      openai: {
        configured: Boolean(config.llmApiKey),
        active: config.apiMode === "live" && Boolean(config.llmApiKey),
        model: config.llmModel
      },
      cartesia: {
        configured: config.ttsProvider === "cartesia" && Boolean(config.ttsApiKey && config.ttsVoiceId),
        active:
          config.apiMode === "live" &&
          config.ttsProvider === "cartesia" &&
          Boolean(config.ttsApiKey && config.ttsVoiceId),
        model: config.ttsModel
      },
      elevenlabs: {
        configured: config.ttsProvider === "elevenlabs" && Boolean(config.ttsApiKey),
        active: config.apiMode === "live" && config.ttsProvider === "elevenlabs" && Boolean(config.ttsApiKey),
        model: config.ttsModel
      },
      supertonic: {
        configured: config.ttsProvider === "supertonic",
        active: config.apiMode === "live" && config.ttsProvider === "supertonic" && statusLayanan.tersedia,
        model: config.ttsModel,
        voice: config.ttsVoiceId || SUARA_SUPERTONIC_DEFAULT,
        serviceUrl: config.ttsServiceUrl,
        serviceAlive: statusLayanan.hidup,
        serviceReady: statusLayanan.tersedia,
        serviceDetail: statusLayanan.detail,
        voices: statusLayanan.daftarSuara
      }
    },
    fallbackEnabled: true
  };
}
