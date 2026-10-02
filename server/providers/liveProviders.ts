import OpenAI from "openai";
import type {
  AsrProvider,
  LlmProvider,
  PronunciationProvider,
  ProviderPreset,
  TtsProvider
} from "../config";
import type {
  ConversationTurn,
  DialogueTurnResult,
  ReportResult,
  SentenceAnalysis,
  SpeechAudioResult,
  TranscriptResult
} from "../../shared/schemas";
import { dialogueTurnResultSchema, reportResultSchema } from "../../shared/schemas";
import { siapkanTeksTts, type ModeBahasaTts } from "../../shared/textNormalizer";
import { mockDialogueTurn, mockSpeech, mockTranscribe } from "./mockProviders";

export type LiveConfig = {
  apiMode: "mock" | "live";
  providerPreset: ProviderPreset;
  asrProvider: AsrProvider;
  asrModel: string;
  asrApiKey?: string;
  deepgramApiKey?: string;
  llmProvider: LlmProvider;
  llmApiKey?: string;
  llmBaseUrl?: string;
  llmModel: string;
  openaiApiKey?: string;
  openaiModel: string;
  ttsProvider: TtsProvider;
  ttsApiKey?: string;
  ttsVersion: string;
  ttsModel: string;
  ttsVoiceId?: string;
  /** Mode bahasa TTS: 'auto' mendeteksi Indonesia/Inggris otomatis per kalimat. */
  ttsLanguageMode: ModeBahasaTts;
  /** Kecepatan bicara Supertonic (0.7 - 2.0). */
  ttsSpeed: number;
  /** Kualitas Supertonic (5 - 12). */
  ttsSteps: number;
  /** URL layanan sidecar Supertonic. */
  ttsServiceUrl: string;
  cartesiaApiKey?: string;
  cartesiaVersion: string;
  cartesiaModel: string;
  cartesiaVoiceId?: string;
  pronunciationProvider: PronunciationProvider;
};

export async function transcribeWithDeepgram(
  audio: Express.Multer.File | undefined,
  config: LiveConfig
): Promise<TranscriptResult> {
  if (config.asrProvider === "qwen-asr") {
    return transcribeWithQwen(audio, config);
  }

  if (config.asrProvider === "assemblyai") {
    return transcribeWithAssemblyAi(audio, config);
  }

  if (config.asrProvider !== "deepgram") {
    return {
      ...mockTranscribe(),
      fallbackReason:
        config.asrProvider === "mock"
          ? "ASR provider is mock"
          : `${config.asrProvider} ASR live adapter is planned`
    };
  }

  if (config.apiMode !== "live" || !config.deepgramApiKey || !audio) {
    return {
      ...mockTranscribe(),
      fallbackReason: !audio ? "No audio uploaded" : "Deepgram is not configured"
    };
  }

  const started = Date.now();
  try {
    const response = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&language=en",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${config.deepgramApiKey}`,
          "Content-Type": audio.mimetype || "audio/webm"
        },
        body: audio.buffer as unknown as BodyInit
      }
    );

    if (!response.ok) {
      return { ...mockTranscribe(), fallbackReason: `Deepgram ${response.status}` };
    }

    const json = (await response.json()) as {
      metadata?: { duration?: number };
      results?: {
        channels?: Array<{
          alternatives?: Array<{
            transcript?: string;
            confidence?: number;
            words?: Array<{
              word: string;
              start: number;
              end: number;
              confidence: number;
              punctuated_word?: string;
            }>;
          }>;
        }>;
      };
    };
    const alternative = json.results?.channels?.[0]?.alternatives?.[0];

    return {
      text: alternative?.transcript || "",
      confidence: alternative?.confidence ?? 0,
      words:
        alternative?.words?.map((word) => ({
          word: word.word,
          start: word.start,
          end: word.end,
          confidence: word.confidence,
          punctuatedWord: word.punctuated_word
        })) ?? [],
      durationSec: json.metadata?.duration ?? 0,
      providerLatencyMs: Date.now() - started,
      provider: "deepgram"
    };
  } catch (error) {
    return {
      ...mockTranscribe(),
      fallbackReason: error instanceof Error ? error.message : "Deepgram request failed"
    };
  }
}

async function transcribeWithAssemblyAi(
  audio: Express.Multer.File | undefined,
  config: LiveConfig
): Promise<TranscriptResult> {
  if (config.apiMode !== "live" || !config.asrApiKey || !audio) {
    return {
      ...mockTranscribe(),
      fallbackReason: !audio ? "No audio uploaded" : "AssemblyAI ASR is not configured"
    };
  }

  const started = Date.now();
  try {
    const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        Authorization: config.asrApiKey,
        "Content-Type": "application/octet-stream"
      },
      body: audio.buffer as unknown as BodyInit
    });

    if (!uploadResponse.ok) {
      return { ...mockTranscribe(), fallbackReason: `AssemblyAI upload ${uploadResponse.status}` };
    }

    const uploadJson = (await uploadResponse.json()) as { upload_url?: string };
    if (!uploadJson.upload_url) {
      return { ...mockTranscribe(), fallbackReason: "AssemblyAI upload returned no URL" };
    }

    const transcriptResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        Authorization: config.asrApiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        audio_url: uploadJson.upload_url,
        language_code: "en_us",
        punctuate: true,
        format_text: true,
        speech_models: [config.asrModel || "universal-3-pro"]
      })
    });

    if (!transcriptResponse.ok) {
      const errorText = await transcriptResponse.text();
      return {
        ...mockTranscribe(),
        fallbackReason: `AssemblyAI transcript ${transcriptResponse.status}: ${errorText.slice(0, 180)}`
      };
    }

    const transcriptJson = (await transcriptResponse.json()) as { id?: string };
    if (!transcriptJson.id) {
      return { ...mockTranscribe(), fallbackReason: "AssemblyAI transcript returned no ID" };
    }

    let transcript: {
      status?: string;
      text?: string;
      confidence?: number;
      audio_duration?: number;
      words?: Array<{ text?: string; start?: number; end?: number; confidence?: number }>;
      error?: string;
    } = {};

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptJson.id}`, {
        headers: { Authorization: config.asrApiKey }
      });

      if (!pollResponse.ok) {
        return { ...mockTranscribe(), fallbackReason: `AssemblyAI poll ${pollResponse.status}` };
      }

      transcript = await pollResponse.json();
      if (transcript.status === "completed" || transcript.status === "error") break;
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }

    if (transcript.status !== "completed") {
      return {
        ...mockTranscribe(),
        fallbackReason: transcript.error || `AssemblyAI status ${transcript.status || "timeout"}`
      };
    }

    return {
      text: transcript.text || "",
      confidence: transcript.confidence ?? 0,
      words:
        transcript.words?.map((word) => ({
          word: (word.text || "").toLowerCase().replace(/[^a-z'-]/gi, ""),
          punctuatedWord: word.text || "",
          start: (word.start ?? 0) / 1000,
          end: (word.end ?? 0) / 1000,
          confidence: word.confidence ?? transcript.confidence ?? 0
        })) ?? [],
      durationSec: transcript.audio_duration ?? 0,
      providerLatencyMs: Date.now() - started,
      provider: "assemblyai"
    };
  } catch (error) {
    return {
      ...mockTranscribe(),
      fallbackReason: error instanceof Error ? error.message : "AssemblyAI request failed"
    };
  }
}

async function transcribeWithQwen(
  audio: Express.Multer.File | undefined,
  config: LiveConfig
): Promise<TranscriptResult> {
  if (config.apiMode !== "live" || !config.asrApiKey || !audio) {
    return {
      ...mockTranscribe(),
      fallbackReason: !audio ? "No audio uploaded" : "Qwen ASR is not configured"
    };
  }

  const started = Date.now();
  try {
    const dataUrl = `data:${audio.mimetype || "audio/webm"};base64,${audio.buffer.toString("base64")}`;
    const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.asrApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.asrModel || "qwen3-asr-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "input_audio",
                input_audio: { data: dataUrl }
              }
            ]
          }
        ],
        stream: false,
        asr_options: {
          language: "en",
          enable_itn: true
        }
      })
    });

    if (!response.ok) {
      return { ...mockTranscribe(), fallbackReason: `Qwen ASR ${response.status}` };
    }

    const json = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
          annotations?: Array<{ language?: string; emotion?: string }>;
        };
      }>;
      usage?: { seconds?: number };
    };
    const text = json.choices?.[0]?.message?.content || "";
    const words = text
      .split(/\s+/)
      .filter(Boolean)
      .map((word, index) => ({
        word: word.toLowerCase().replace(/[^a-z'-]/gi, ""),
        punctuatedWord: word,
        start: index * 0.35,
        end: index * 0.35 + 0.28,
        confidence: 0.9
      }));

    return {
      text,
      confidence: text ? 0.9 : 0,
      words,
      durationSec: words.length * 0.35,
      providerLatencyMs: Date.now() - started,
      provider: "qwen-asr"
    };
  } catch (error) {
    return {
      ...mockTranscribe(),
      fallbackReason: error instanceof Error ? error.message : "Qwen ASR request failed"
    };
  }
}

function parseJsonContent(content: string): unknown {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const source = fenced?.[1] ?? trimmed;
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(source.slice(start, end + 1));
  }
  return JSON.parse(source);
}

function createOpenAiCompatibleClient(config: LiveConfig) {
  if (!config.llmApiKey) return null;
  return new OpenAI({
    apiKey: config.llmApiKey,
    baseURL: config.llmBaseUrl || undefined
  });
}

async function createJsonChatCompletion(
  config: LiveConfig,
  system: string,
  user: string
): Promise<unknown> {
  const client = createOpenAiCompatibleClient(config);
  if (!client) {
    throw new Error(`${config.llmProvider} is not configured`);
  }

  const completion = await client.chat.completions.create({
    model: config.llmModel,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error(`${config.llmProvider} returned empty content`);
  }
  return parseJsonContent(content);
}

export async function generateTurnWithLlm(
  input: {
    scenarioId: string;
    taskId: string;
    scenarioLabel?: string;
    taskTitle?: string;
    taskFocus?: string;
    aiRoleZh?: string;
    round: number;
    userText: string;
  },
  config: LiveConfig
): Promise<DialogueTurnResult> {
  if (config.apiMode !== "live" || !config.llmApiKey) {
    return mockDialogueTurn(input.userText, input.round);
  }

  try {
    const json = await createJsonChatCompletion(
      config,
      [
        "You are an encouraging and professional English Speaking Tutor for Indonesian college students (Universitas Catur Insan Cendekia / UCIC).",
        "Your role is to help Indonesian learners practice English speaking naturally while communicating with them warmly as their tutor in Bahasa Indonesia.",
        "Crucial communication rules:",
        "1. aiText: This is what you speak to the student. It MUST start with friendly feedback/guidance in Bahasa Indonesia, followed immediately by the next speaking question/challenge in English.",
        "   Example: 'Bagus sekali! Cara kamu menjelaskan ide dasar sudah baik. Sekarang coba jawab pertanyaan ini dalam bahasa Inggris: What was your main contribution to the project?'",
        "2. hintZh: A practical tip or scaffolding strategy in Bahasa Indonesia explaining how the student can structure their English response (e.g. sentence pattern, vocabulary suggestions, or STAR method).",
        "3. positiveFeedback: Exactly one warm, encouraging sentence in Bahasa Indonesia that praises what the student expressed or pronounced well.",
        "4. correctionPreview: If the student made a grammar/vocabulary slip in their English, provide a clear improvement (e.g. 'Lebih baik gunakan \"I am responsible for\" daripada \"I am responsible with\".'). If their English is good, write null.",
        "5. nextRoundGoal: A concise goal for the next speaking round in Bahasa Indonesia.",
        "6. coachState must be 'asking'.",
        "7. Return one strict JSON object only. Do not wrap with Markdown code fences or extra text.",
        "8. Keys must be: aiText, hintZh, coachState, positiveFeedback, correctionPreview, nextRoundGoal, provider.",
        `provider must be ${config.llmProvider}.`
      ].join(" "),
      `Scenario: ${input.scenarioLabel || input.scenarioId}
Task: ${input.taskTitle || input.taskId}
AI role: ${input.aiRoleZh || "Tutor Bahasa Inggris UCIC"}
Learning focus: ${input.taskFocus || "bantu mahasiswa menjawab dengan jelas dan percaya diri dalam bahasa Inggris"}
Round: ${input.round}
User answer: ${input.userText}
Return the JSON with friendly Indonesian feedback + next English question in aiText, and Indonesian guidance in hintZh and positiveFeedback.`
    );

    const record = (json && typeof json === "object" ? { ...(json as Record<string, unknown>) } : {}) as Record<string, unknown>;
    record.correctionPreview =
      typeof record.correctionPreview === "string" && record.correctionPreview.trim()
        ? record.correctionPreview
        : "Tata bahasa dan pilihan kata Anda sudah baik dan tepat.";
    record.hintZh =
      typeof record.hintZh === "string" && record.hintZh.trim()
        ? record.hintZh
        : "Gunakan kalimat terstruktur untuk menjelaskan ide Anda.";
    record.positiveFeedback =
      typeof record.positiveFeedback === "string" && record.positiveFeedback.trim()
        ? record.positiveFeedback
        : "Bagus! Kamu sudah menyampaikan poin dasar dengan cukup baik.";
    record.nextRoundGoal =
      typeof record.nextRoundGoal === "string" && record.nextRoundGoal.trim()
        ? record.nextRoundGoal
        : "Jelaskan lebih detail dan percaya diri.";

    return dialogueTurnResultSchema.parse({
      positiveFeedback: "Bagus! Kamu sudah menyampaikan poin dasar dengan cukup baik.",
      ...record,
      coachState: "asking",
      provider: config.llmProvider
    });
  } catch (error) {
    return {
      ...mockDialogueTurn(input.userText, input.round),
      fallbackReason: error instanceof Error ? error.message : "LLM dialogue request failed"
    } as DialogueTurnResult;
  }
}

export async function synthesizeWithElevenLabs(
  text: string,
  config: LiveConfig
): Promise<SpeechAudioResult> {
  if (config.apiMode !== "live" || !config.ttsApiKey || !text.trim()) {
    return mockSpeech(text);
  }

  const voiceId = config.ttsVoiceId && config.ttsVoiceId.length > 5 ? config.ttsVoiceId : "JBFqnCBsd6RMkjVDRZzb";
  const modelId = config.ttsModel && config.ttsModel.startsWith("eleven_") ? config.ttsModel : "eleven_multilingual_v2";

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": config.ttsApiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text,
        model_id: modelId
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        ...mockSpeech(text),
        fallbackReason: `ElevenLabs ${response.status}: ${errorText.slice(0, 180)}`
      } as SpeechAudioResult;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      audioBase64: buffer.toString("base64"),
      audioUrl: null,
      format: "mp3",
      durationEstimateSec: Math.max(1.8, text.split(/\s+/).length * 0.28),
      provider: "elevenlabs"
    };
  } catch (error) {
    return {
      ...mockSpeech(text),
      fallbackReason: error instanceof Error ? error.message : "ElevenLabs request failed"
    } as SpeechAudioResult;
  }
}

/**
 * Titik masuk sintesis suara (dispatcher).
 *
 * Nama fungsi dipertahankan demi kompatibilitas, tetapi sekarang menangani semua
 * provider TTS. Sebelum dikirim ke provider mana pun, teks selalu dinormalisasi
 * lewat `siapkanTeksTts()` agar angka, tanggal, mata uang, dan nomor telepon
 * dibaca dengan benar (terutama untuk Supertonic dengan `lang="id"`).
 */
export async function synthesizeWithCartesia(
  text: string,
  config: LiveConfig
): Promise<SpeechAudioResult> {
  if (!text.trim()) {
    return mockSpeech(text);
  }

  // Normalisasi teks + deteksi bahasa otomatis (Indonesia <-> Inggris).
  const { text: teksSiap, lang } = siapkanTeksTts(text, config.ttsLanguageMode ?? "auto");

  if (config.ttsProvider === "supertonic") {
    return synthesizeWithSupertonic(teksSiap, lang, config);
  }

  if (config.ttsProvider === "elevenlabs") {
    return synthesizeWithElevenLabs(teksSiap, config);
  }

  if (config.ttsProvider === "qwen-tts") {
    return synthesizeWithQwenTts(teksSiap, config);
  }

  if (config.ttsProvider !== "cartesia") {
    return { ...mockSpeech(teksSiap), lang, normalizedText: teksSiap };
  }

  if (
    config.apiMode !== "live" ||
    !config.ttsApiKey ||
    !config.ttsVoiceId ||
    !teksSiap.trim()
  ) {
    return { ...mockSpeech(teksSiap), lang, normalizedText: teksSiap };
  }

  try {
    const response = await fetch("https://api.cartesia.ai/tts/bytes", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.ttsApiKey}`,
        "Cartesia-Version": config.ttsVersion,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model_id: config.ttsModel,
        transcript: teksSiap,
        voice: { id: config.ttsVoiceId },
        output_format: { container: "mp3", sample_rate: 44100, bit_rate: 128000 },
        language: lang
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        ...mockSpeech(teksSiap),
        fallbackReason: `Cartesia ${response.status}: ${errorText.slice(0, 180)}`
      } as SpeechAudioResult;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      audioBase64: buffer.toString("base64"),
      audioUrl: null,
      format: "mp3",
      durationEstimateSec: Math.max(1.8, teksSiap.split(/\s+/).length * 0.28),
      provider: "cartesia",
      lang,
      normalizedText: teksSiap
    };
  } catch (error) {
    return {
      ...mockSpeech(teksSiap),
      fallbackReason: error instanceof Error ? error.message : "Cartesia request failed"
    } as SpeechAudioResult;
  }
}

/**
 * Sintesis suara memakai Supertonic TTS (on-device, 31 bahasa).
 *
 * Alur: Node -> layanan sidecar Python (default http://127.0.0.1:7861) -> WAV base64.
 * Bila layanan belum berjalan atau model belum siap, fungsi ini mengembalikan
 * hasil mock agar aplikasi tetap berjalan (fallback berlapis), lalu pemanggil
 * bisa memakai `window.speechSynthesis` di sisi browser.
 */
export async function synthesizeWithSupertonic(
  teks: string,
  lang: "id" | "en",
  config: LiveConfig
): Promise<SpeechAudioResult> {
  const baseUrl = (config.ttsServiceUrl || "http://127.0.0.1:7861").replace(/\/+$/, "");

  if (!teks.trim()) {
    return mockSpeech(teks);
  }

  // Mode mock: jangan panggil layanan eksternal sama sekali.
  if (config.apiMode !== "live") {
    return { ...mockSpeech(teks), lang, normalizedText: teks };
  }

  try {
    const respons = await fetch(`${baseUrl}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: teks,
        lang,
        voice: config.ttsVoiceId || "F1",
        speed: config.ttsSpeed ?? 1,
        steps: config.ttsSteps ?? 8,
        // Teks sudah dinormalisasi di sisi Node; jangan dinormalisasi dua kali.
        normalize: false
      }),
      signal: AbortSignal.timeout(60_000)
    });

    if (!respons.ok) {
      const detail = await respons.text();
      return {
        ...mockSpeech(teks),
        fallbackReason: `Supertonic ${respons.status}: ${detail.slice(0, 180)}`
      } as SpeechAudioResult;
    }

    const data = (await respons.json()) as {
      audioBase64?: string;
      format?: string;
      durationEstimateSec?: number;
      lang?: string;
      voice?: string;
    };

    if (!data.audioBase64) {
      return { ...mockSpeech(teks), fallbackReason: "Supertonic tidak mengembalikan audio" } as SpeechAudioResult;
    }

    return {
      audioBase64: data.audioBase64,
      audioUrl: null,
      format: data.format || "wav",
      durationEstimateSec:
        typeof data.durationEstimateSec === "number" && data.durationEstimateSec > 0
          ? data.durationEstimateSec
          : Math.max(1.8, teks.split(/\s+/).length * 0.28),
      provider: "supertonic",
      lang: (data.lang as "id" | "en") || lang,
      voice: data.voice || config.ttsVoiceId || "F1",
      normalizedText: teks
    };
  } catch (error) {
    return {
      ...mockSpeech(teks),
      fallbackReason:
        error instanceof Error
          ? `Supertonic: ${error.message}`
          : "Supertonic tidak dapat dihubungi"
    } as SpeechAudioResult;
  }
}

function parseSseJsonLines(raw: string): unknown[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .filter((line) => line && line !== "[DONE]")
    .map((line) => {
      try {
        return JSON.parse(line) as unknown;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function extractQwenAudioBase64(payloads: unknown[]): string | null {
  const chunks: Buffer[] = [];
  for (const payload of payloads) {
    const value = payload as {
      output?: {
        audio?: { data?: string; url?: string };
        choices?: Array<{ message?: { audio?: { data?: string; url?: string } } }>;
      };
    };
    const direct = value.output?.audio?.data;
    if (direct) chunks.push(Buffer.from(direct, "base64"));
    const choiceAudio = value.output?.choices?.[0]?.message?.audio?.data;
    if (choiceAudio) chunks.push(Buffer.from(choiceAudio, "base64"));
  }
  return chunks.length ? Buffer.concat(chunks).toString("base64") : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value ? (value as Record<string, unknown>) : {};
}

function readText(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function readFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeScoreScale(value: number, scaleHint: number): number {
  if (value > 0 && value <= 1 && scaleHint > 1) return value * 100;
  if (value > 0 && value <= 10 && scaleHint > 10) return value * 10;
  return value;
}

function readDimensionId(value: unknown): keyof typeof dimensionFallbacks | null {
  const key = readText(value).toLowerCase().replace(/[\s_\-:/]+/g, "");
  if (!key) return null;
  if (key.includes("fluency") || key.includes("kelancaran")) return "fluency";
  if (key.includes("pronunciation") || key.includes("pengucapan")) return "pronunciation";
  if (key.includes("grammar") || key.includes("tata bahasa")) return "grammar";
  if (key.includes("vocabulary") || key.includes("kosakata")) return "vocabulary";
  if (key.includes("coherence") || key.includes("koherensi")) return "coherence";
  if (key.includes("taskcompletion") || key.includes("penyelesaian")) return "task_completion";
  if (key.includes("interaction") || key.includes("interaksi")) return "interaction";
  return null;
}

const dimensionFallbacks = {
  fluency: { labelZh: "Kelancaran (Fluency)", labelEn: "Fluency", offset: 3 },
  pronunciation: { labelZh: "Pengucapan (Pronunciation)", labelEn: "Pronunciation", offset: -3 },
  grammar: { labelZh: "Tata Bahasa (Grammar)", labelEn: "Grammar", offset: -1 },
  vocabulary: { labelZh: "Kosakata (Vocabulary)", labelEn: "Vocabulary", offset: 0 },
  coherence: { labelZh: "Koherensi (Coherence)", labelEn: "Coherence", offset: 1 },
  task_completion: { labelZh: "Penyelesaian Tugas (Task Completion)", labelEn: "Task Completion", offset: 2 },
  interaction: { labelZh: "Interaksi (Interaction)", labelEn: "Interaction", offset: -4 }
} as const;

function readDimensionScore(value: unknown, fallback: number): number {
  const direct = readFiniteNumber(value);
  if (direct !== null) return clampScore(normalizeScoreScale(direct, fallback));

  const item = asRecord(value);
  const nested = readFiniteNumber(item.score ?? item.value ?? item.points ?? item.rating);
  return clampScore(nested !== null ? normalizeScoreScale(nested, fallback) : fallback);
}

function alignDimensionScoresToTotal<T extends { score: number }>(dimensions: T[], totalScore: number): T[] {
  if (!dimensions.length) return dimensions;
  const average = dimensions.reduce((sum, dimension) => sum + dimension.score, 0) / dimensions.length;
  const delta = totalScore - average;
  if (Math.abs(delta) < 4) return dimensions;

  return dimensions.map((dimension) => ({
    ...dimension,
    score: clampScore(dimension.score + delta)
  }));
}

function normalizeSentenceAnalyses(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const analyses = value
    .map((analysis) => {
      const item = asRecord(analysis);
      const issueType = readText(item.issueType || item.type);
      const highlightsRaw = Array.isArray(item.highlights) ? item.highlights : [];
      const highlights = highlightsRaw
        .map((highlight) => {
          const mark = asRecord(highlight);
          return {
            originalText: readText(mark.originalText || mark.original || mark.from),
            improvedText: readText(mark.improvedText || mark.improved || mark.to),
            reasonZh: readText(mark.reasonZh || mark.reason || mark.explanationZh)
          };
        })
        .filter((highlight) => highlight.originalText || highlight.improvedText || highlight.reasonZh);

      return {
        original: readText(item.original || item.originalText),
        improved: readText(item.improved || item.improvedText || item.better),
        issueType: ["grammar", "wording", "logic", "pronunciation"].includes(issueType)
          ? issueType
          : "wording",
        explanationZh: readText(item.explanationZh || item.explanation || item.reason),
        highlights
      };
    })
    .filter((analysis) => analysis.original || analysis.improved);

  return analyses.length ? analyses : undefined;
}

function normalizePronunciationTips(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const tips = value
    .map((tip) => {
      const item = asRecord(tip);
      return {
        wordOrPhrase: readText(item.wordOrPhrase || item.word || item.phrase),
        issueZh: readText(item.issueZh || item.issue),
        tipZh: readText(item.tipZh || item.tip || item.adviceZh),
        example: readText(item.example || item.sentence)
      };
    })
    .filter((tip) => tip.wordOrPhrase || tip.tipZh);

  return tips.length ? tips : undefined;
}

function normalizeEvidenceTurns(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const turns = value
    .map((turn) => {
      const item = asRecord(turn);
      return {
        speaker: "user" as const,
        text: readText(item.text || item.userText || item.original),
        reasonZh: readText(item.reasonZh || item.reason || item.explanationZh)
      };
    })
    .filter((turn) => turn.text);

  return turns.length ? turns : undefined;
}

function normalizeNextPractice(value: unknown) {
  const item = asRecord(value);
  const targetSentence = readText(item.targetSentence || item.sentence || item.example);
  if (!targetSentence && !item.goalZh) return undefined;

  const chunks = readStringArray(item.chunks);
  const drills = readStringArray(item.drills || item.steps);
  return {
    goalZh: readText(item.goalZh || item.goal || "Ucapkan hasil proyek dalam satu kalimat bahasa Inggris yang lebih alami."),
    targetSentence,
    chunks: chunks.length ? chunks : targetSentence.split(/\s+(?=by|and|that|with)/).filter(Boolean),
    drills: drills.length ? drills : ["Baca per bagian secara perlahan, lalu satukan menjadi satu kalimat utuh.", "Beri penekanan intonasi pada angka metrik hasil."]
  };
}

function normalizeReportJson(json: unknown, provider: string): Record<string, unknown> {
  const raw = json as Record<string, unknown>;
  const dimensionsRaw = raw.dimensions;
  const rawTotalScore = readFiniteNumber(raw.totalScore ?? raw.score);
  const totalScore = clampScore(rawTotalScore !== null ? normalizeScoreScale(rawTotalScore, 100) : 80);
  const dimensionValues = new Map<keyof typeof dimensionFallbacks, unknown>();
  const dimensionValuesByIndex: unknown[] = [];

  if (Array.isArray(dimensionsRaw)) {
    dimensionsRaw.forEach((dimension, index) => {
      const item = asRecord(dimension);
      const id = readDimensionId(item.id || item.key || item.dimension || item.name || item.labelEn || item.labelZh);
      if (id) {
        dimensionValues.set(id, dimension);
      } else {
        dimensionValuesByIndex[index] = dimension;
      }
    });
  } else if (dimensionsRaw && typeof dimensionsRaw === "object") {
    Object.entries(dimensionsRaw as Record<string, unknown>).forEach(([key, value]) => {
      const item = asRecord(value);
      const id = readDimensionId(key) || readDimensionId(item.id || item.key || item.dimension || item.name);
      if (id) dimensionValues.set(id, value);
    });
  }

  const normalizedDimensions = Object.entries(dimensionFallbacks).map(([id, label], index) => {
    const dimensionId = id as keyof typeof dimensionFallbacks;
    const value = dimensionValues.get(dimensionId) ?? dimensionValuesByIndex[index];
    const item = asRecord(value);
    const fallbackScore = totalScore + label.offset;
    return {
      id: dimensionId,
      labelZh: typeof item.labelZh === "string" ? item.labelZh : label.labelZh,
      labelEn: typeof item.labelEn === "string" ? item.labelEn : label.labelEn,
      score: readDimensionScore(value, fallbackScore),
      explanationZh:
        typeof item.explanationZh === "string"
          ? item.explanationZh
          : typeof item.explanation === "string"
            ? item.explanation
        : "Dimensi ini dinilai berdasarkan respon percakapan Anda dan telah diselaraskan dengan skala total."
    };
  });
  const dimensions = alignDimensionScoresToTotal(normalizedDimensions, totalScore);
  const corrections = Array.isArray(raw.corrections)
    ? raw.corrections.map((correction) => {
        const item = typeof correction === "object" && correction ? (correction as Record<string, unknown>) : {};
        return {
          original: String(item.original ?? item.originalText ?? ""),
          improved: String(item.improved ?? item.improvedText ?? item.suggestion ?? ""),
          explanationZh: String(item.explanationZh ?? item.explanation ?? item.reason ?? "")
        };
      })
    : [];

  return {
    ...raw,
    reportId: typeof raw.reportId === "string" ? raw.reportId : `report_${Date.now()}`,
    totalScore,
    dimensions,
    summaryZh: typeof raw.summaryZh === "string" ? raw.summaryZh : String(raw.summary ?? ""),
    corrections,
    suggestions: Array.isArray(raw.suggestions) ? raw.suggestions.map(String) : [],
    coachCommentZh:
      typeof raw.coachCommentZh === "string" ? raw.coachCommentZh : String(raw.coachComment ?? raw.summaryZh ?? ""),
    sentenceAnalyses: normalizeSentenceAnalyses(raw.sentenceAnalyses || raw.sentenceAnalysis),
    pronunciationTips: normalizePronunciationTips(raw.pronunciationTips || raw.pronunciation),
    evidenceTurns: normalizeEvidenceTurns(raw.evidenceTurns || raw.evidence),
    nextPractice: normalizeNextPractice(raw.nextPractice || raw.drill || raw.recommendedPractice),
    provider
  };
}

const reportDimensionLabels = [
  { id: "fluency", labelZh: "Kelancaran (Fluency)", labelEn: "Fluency" },
  { id: "pronunciation", labelZh: "Pengucapan (Pronunciation)", labelEn: "Pronunciation" },
  { id: "grammar", labelZh: "Tata Bahasa (Grammar)", labelEn: "Grammar" },
  { id: "vocabulary", labelZh: "Kosakata (Vocabulary)", labelEn: "Vocabulary" },
  { id: "coherence", labelZh: "Koherensi (Coherence)", labelEn: "Coherence" },
  { id: "task_completion", labelZh: "Penyelesaian Tugas (Task Completion)", labelEn: "Task Completion" },
  { id: "interaction", labelZh: "Interaksi (Interaction)", labelEn: "Interaction" }
] as const;

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function createSyntheticTurn(
  speaker: ConversationTurn["speaker"],
  text: string,
  index: number
): ConversationTurn {
  return {
    id: `report_turn_${index}`,
    speaker,
    text,
    timestamp: new Date(Date.now() + index).toISOString()
  };
}

function readConversationTurns(value: unknown): ConversationTurn[] {
  if (!Array.isArray(value)) return [];
  return value
    .map<ConversationTurn | null>((turn, index) => {
      const item = asRecord(turn);
      const speakerRaw = readText(item.speaker);
      const speaker = speakerRaw === "ai" || speakerRaw === "system" || speakerRaw === "user" ? speakerRaw : "user";
      const text = readText(item.text || item.userText || item.aiText).trim();
      if (!text) return null;
      return {
        id: readText(item.id) || `report_turn_${index}`,
        speaker,
        text,
        timestamp: readText(item.timestamp) || new Date(Date.now() + index).toISOString(),
        transcriptConfidence:
          typeof item.transcriptConfidence === "number" ? item.transcriptConfidence : undefined,
        audioDurationSec: typeof item.audioDurationSec === "number" ? item.audioDurationSec : undefined,
        latencyMs: typeof item.latencyMs === "number" ? item.latencyMs : undefined,
        hintZh: typeof item.hintZh === "string" ? item.hintZh : undefined,
        keywords: Array.isArray(item.keywords) ? item.keywords.map(String) : undefined
      } satisfies ConversationTurn;
    })
    .filter((turn): turn is ConversationTurn => turn !== null);
}

function readLegacyRoundTurns(value: unknown): ConversationTurn[] {
  if (!Array.isArray(value)) return [];
  const turns: ConversationTurn[] = [];
  value.forEach((turn, index) => {
    const item = asRecord(turn);
    const aiText = readText(item.aiText).trim();
    const userText = readText(item.userText).trim();
    if (aiText) turns.push(createSyntheticTurn("ai", aiText, index * 2));
    if (userText) {
      turns.push({
        ...createSyntheticTurn("user", userText, index * 2 + 1),
        transcriptConfidence:
          typeof item.transcriptConfidence === "number" ? item.transcriptConfidence : undefined
      });
    }
  });
  return turns;
}

function extractReportTurns(payload: unknown): ConversationTurn[] {
  const item = asRecord(payload);
  return readConversationTurns(item.conversation_turns).concat(readLegacyRoundTurns(item.turns));
}

function getUserTurns(payload: unknown): ConversationTurn[] {
  return extractReportTurns(payload).filter((turn) => turn.speaker === "user" && turn.text.trim());
}

function normalizeForGrounding(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function isTextGroundedInUserTurns(value: string, userTurns: ConversationTurn[]): boolean {
  const normalized = normalizeForGrounding(value);
  if (!normalized) return false;
  return userTurns.some((turn) => normalizeForGrounding(turn.text).includes(normalized));
}

function firstUsefulUserText(userTurns: ConversationTurn[]): string {
  return userTurns[0]?.text || "I explained my project, but I need to make the result more specific.";
}

function createGroundedCorrection(userText: string) {
  const lower = userText.toLowerCase();
  if (lower.includes("urgent")) {
    return {
      original: userText,
      improved: userText
        .replace(/AI urgent/gi, "AI agent")
        .replace(/maybe things are useful/gi, "it solves a clear user problem"),
      explanationZh:
        "Kata 'urgent' kemungkinan dimaksudkan sebagai 'agent', konfirmasikan kata kunci Anda lalu ganti kata umum seperti 'useful' dengan masalah spesifik yang diselesaikan."
    };
  }

  if (/\bit make\b/i.test(userText) || /\bmake route\b/i.test(userText)) {
    return {
      original: userText,
      improved: userText.replace(/\bit make\b/gi, "it made").replace(/\bmake route\b/gi, "made the route"),
      explanationZh: "Gunakan bentuk past tense dengan mengganti 'make' menjadi 'made' untuk konsistensi waktu saat menjelaskan proyek masa lalu."
    };
  }

  if (/\bmaybe\b|\bthings\b/i.test(userText)) {
    return {
      original: userText,
      improved: userText
        .replace(/\bmaybe\b/gi, "")
        .replace(/\bthings\b/gi, "specific user problems")
        .replace(/\s+/g, " ")
        .trim(),
      explanationZh: "Kata 'maybe' dan 'things' membuat jawaban terdengar ragu; ganti dengan hasil konkret atau masalah pengguna yang jelas."
    };
  }

  return {
    original: userText,
    improved: `${userText} It improved one clear workflow and saved time for users.`,
    explanationZh: "Kalimat ini telah menyampaikan topik proyek, namun dampaknya belum terukur; disarankan menambahkan dampak atau metrik angka nyata."
  };
}

function createGroundedSentenceAnalysis(correction: ReturnType<typeof createGroundedCorrection>) {
  const originalChanged = findChangedPhrase(correction.original, correction.improved, "original");
  const improvedChanged = findChangedPhrase(correction.original, correction.improved, "improved");
  const issueType: SentenceAnalysis["issueType"] = /urgent|agent/i.test(correction.original)
    ? "pronunciation"
    : /make|made|tenses|lampau/i.test(correction.explanationZh)
      ? "grammar"
      : /maybe|things|ragu/i.test(correction.explanationZh)
        ? "wording"
        : "logic";

  return {
    original: correction.original,
    improved: correction.improved,
    issueType,
    explanationZh: correction.explanationZh,
    highlights: [
      {
        originalText: originalChanged,
        improvedText: improvedChanged,
        reasonZh: correction.explanationZh
      }
    ]
  };
}

function findChangedPhrase(original: string, improved: string, side: "original" | "improved"): string {
  const source = side === "original" ? original : improved;
  const other = side === "original" ? improved : original;
  const sourceWords = source.split(/\s+/).filter(Boolean);
  const otherWords = other.split(/\s+/).filter(Boolean);
  const max = Math.max(sourceWords.length, otherWords.length);

  for (let index = 0; index < max; index += 1) {
    if (sourceWords[index] !== otherWords[index]) {
      return sourceWords.slice(index, index + 3).join(" ") || source;
    }
  }
  return sourceWords.slice(0, 4).join(" ") || source;
}

function createGroundedPronunciationTips(userText: string) {
  const tips = [];
  if (/urgent|agent/i.test(userText)) {
    tips.push({
      wordOrPhrase: "agent",
      issueZh: "Kata 'agent' dan 'urgent' sering tertukar, perhatikan vokal pertama dan akhiran /t/.",
      tipZh: "Saat mengucapkan 'agent', tekankan vokal awal dan bunyi /dʒ/ secara jelas, akhiri dengan /t/ tegas tanpa diseret.",
      example: "It is about my AI agent project."
    });
  }
  if (/project/i.test(userText)) {
    tips.push({
      wordOrPhrase: "project",
      issueZh: "Penekanan suku kata (stress) pada kata benda 'project' harus berada di depan.",
      tipZh: "Sebagai kata benda, tekan suku kata pertama: PRO-ject, lalu ucapkan suku kata kedua dengan ringan.",
      example: "My PRO-ject improved the workflow."
    });
  }
  if (/maybe|things/i.test(userText)) {
    tips.push({
      wordOrPhrase: "maybe / things",
      issueZh: "Kata-kata pengisi atau umum dapat membuat intonasi terdengar ragu-ragu.",
      tipZh: "Gunakan kata kunci yang lebih pasti, turunkan nada bicara di akhir kalimat agar terdengar percaya diri.",
      example: "It solved a clear user problem."
    });
  }

  return tips.length
    ? tips
    : [
        {
          wordOrPhrase: "result sentence",
          issueZh: "Kalimat penyampaian hasil memerlukan ritme dan jeda yang stabil.",
          tipZh: "Sampaikan hasil terlebih dahulu sebelum menyebutkan angka, beri jeda singkat sebelum angka, dan turunkan intonasi di akhir kalimat.",
          example: "It reduced planning time by 30%."
        }
      ];
}

function isUsefulImprovedSentence(original: string, improved: string): boolean {
  const cleaned = improved.trim();
  if (!cleaned) return false;
  if (normalizeForGrounding(cleaned) === normalizeForGrounding(original)) return false;
  return cleaned.split(/\s+/).filter(Boolean).length >= 3;
}

function createConversationAwareFallbackReport(
  payload: unknown,
  config: LiveConfig,
  fallbackReason: string
): ReportResult {
  const userTurns = getUserTurns(payload);
  const userText = firstUsefulUserText(userTurns);
  const correction = createGroundedCorrection(userText);
  const sentenceAnalysis = createGroundedSentenceAnalysis(correction);
  const provider = config.apiMode === "live" ? config.llmProvider : "mock";
  const weakArea = /urgent|agent/i.test(userText)
    ? "Pelafalan & Konfirmasi Kata Kunci"
    : /\bmake\b/i.test(userText)
      ? "Tata Bahasa & Tenses"
      : "Penyampaian Hasil Terukur";

  return {
    reportId: `report_${Date.now()}`,
    totalScore: userTurns.length >= 2 ? 82 : 78,
    dimensions: reportDimensionLabels.map((dimension, index) => ({
      ...dimension,
      score: [80, 76, 78, 79, 81, 82, 77][index] ?? 78,
      explanationZh: `Berdasarkan evaluasi terhadap ${userTurns.length || 1} respon pengguna, ${dimension.labelZh} masih dapat ditingkatkan.`
    })),
    summaryZh: `Laporan ini dihasilkan berdasarkan respon percakapan Anda. Area yang paling perlu ditingkatkan adalah ${weakArea}. Pada sesi berikutnya, pertegas kata kunci lalu tambahkan hasil terukur.`,
    corrections: [correction],
    suggestions: [
      "Gunakan satu kalimat pembuka untuk menjelaskan masalah yang diselesaikan proyek.",
      "Ganti kata umum seperti 'maybe' atau 'things' dengan hasil nyata atau dampak bagi pengguna.",
      "Akhiri jawaban dengan metrik angka, misalnya efisiensi waktu, peningkatan akurasi, atau pengurangan beban kerja."
    ],
    coachCommentZh: `Evaluasi ini berdasarkan percakapan nyatamu. Fokus perbaiki ${weakArea}, agar jawabanmu semakin meyakinkan saat wawancara!`,
    provider,
    fallback: true,
    fallbackReason,
    sentenceAnalyses: [sentenceAnalysis],
    pronunciationTips: createGroundedPronunciationTips(userText),
    evidenceTurns: userTurns.slice(0, 3).map((turn) => ({
      speaker: "user",
      text: turn.text,
      reasonZh: "Kalimat ini diambil dari respon latihan Anda untuk mendukung evaluasi dan rekomendasi perbaikan."
    })),
    nextPractice: {
      goalZh: "Jelaskan topik proyek dengan presisi dan lengkapi dengan satu hasil terukur.",
      targetSentence: /urgent/i.test(userText)
        ? "It is about my AI agent project, and it solved a clear user problem."
        : "My project improved one workflow and made the result easier to understand.",
      chunks: /urgent/i.test(userText)
        ? ["It is about my AI agent project", "and it solved", "a clear user problem"]
        : ["My project improved one workflow", "and made the result", "easier to understand"],
      drills: ["Baca kata kunci secara perlahan.", "Pada pengulangan kedua, berikan penekanan pada kata kerja hasil.", "Pada pengulangan ketiga, baca lancar sebagai satu kalimat utuh dengan intonasi menurun di akhir."]
    }
  };
}

function normalizeGroundedCorrections(value: unknown, userTurns: ConversationTurn[]) {
  if (!Array.isArray(value)) return [];
  return value
    .map((correction) => {
      const item = asRecord(correction);
      const original = readText(item.original || item.originalText).trim();
      if (!isTextGroundedInUserTurns(original, userTurns)) return null;

      const groundedFallback = createGroundedCorrection(original);
      const improved = readText(item.improved || item.improvedText || item.suggestion).trim();
      const explanationZh = readText(item.explanationZh || item.explanation || item.reason).trim();

      return {
        original,
        improved: isUsefulImprovedSentence(original, improved) ? improved : groundedFallback.improved,
        explanationZh: explanationZh || groundedFallback.explanationZh
      };
    })
    .filter((correction): correction is ReturnType<typeof createGroundedCorrection> => correction !== null);
}

function normalizeGroundedSentenceAnalyses(value: unknown, userTurns: ConversationTurn[]) {
  if (!Array.isArray(value)) return [];
  return value
    .map((analysis) => {
      const item = asRecord(analysis);
      const original = readText(item.original || item.originalText).trim();
      if (!isTextGroundedInUserTurns(original, userTurns)) return null;

      const fallbackCorrection = createGroundedCorrection(original);
      const fallbackAnalysis = createGroundedSentenceAnalysis(fallbackCorrection);
      const improved = readText(item.improved || item.improvedText || item.better).trim();
      const improvedSentence = isUsefulImprovedSentence(original, improved) ? improved : fallbackCorrection.improved;
      const issueTypeRaw = readText(item.issueType || item.type);
      const issueType: SentenceAnalysis["issueType"] = ["grammar", "wording", "logic", "pronunciation"].includes(
        issueTypeRaw
      )
        ? (issueTypeRaw as SentenceAnalysis["issueType"])
        : fallbackAnalysis.issueType;
      const explanationZh =
        readText(item.explanationZh || item.explanation || item.reason).trim() ||
        fallbackCorrection.explanationZh;
      const highlights = Array.isArray(item.highlights)
        ? item.highlights
            .map((highlight) => {
              const mark = asRecord(highlight);
              const originalText = readText(mark.originalText || mark.original || mark.from).trim();
              const improvedText = readText(mark.improvedText || mark.improved || mark.to).trim();
              const reasonZh = readText(mark.reasonZh || mark.reason || mark.explanationZh).trim();
              if (!originalText || !improvedText || !reasonZh) return null;
              return { originalText, improvedText, reasonZh };
            })
            .filter((highlight): highlight is SentenceAnalysis["highlights"][number] => highlight !== null)
        : [];

      return {
        original,
        improved: improvedSentence,
        issueType,
        explanationZh,
        highlights: highlights.length
          ? highlights
          : [
              {
                originalText: findChangedPhrase(original, improvedSentence, "original"),
                improvedText: findChangedPhrase(original, improvedSentence, "improved"),
                reasonZh: explanationZh
              }
            ]
      };
    })
    .filter((analysis): analysis is SentenceAnalysis => analysis !== null);
}

function ensureReportGroundedInConversation(
  report: Record<string, unknown>,
  payload: unknown,
  config: LiveConfig
): Record<string, unknown> {
  const userTurns = getUserTurns(payload);
  if (!userTurns.length) return report;

  const fallback = createConversationAwareFallbackReport(payload, config, "LLM report lacked grounded evidence");
  const groundedCorrections = normalizeGroundedCorrections(report.corrections, userTurns);
  const groundedAnalyses = normalizeGroundedSentenceAnalyses(report.sentenceAnalyses, userTurns);
  const evidenceTurns = normalizeEvidenceTurns(report.evidenceTurns);
  const hasGroundedEvidence = evidenceTurns?.some((turn) => isTextGroundedInUserTurns(turn.text, userTurns));

  return {
    ...report,
    corrections: groundedCorrections.length ? groundedCorrections : fallback.corrections,
    sentenceAnalyses: groundedAnalyses.length ? groundedAnalyses : fallback.sentenceAnalyses,
    evidenceTurns: hasGroundedEvidence ? evidenceTurns : fallback.evidenceTurns,
    pronunciationTips:
      Array.isArray(report.pronunciationTips) && report.pronunciationTips.length
        ? report.pronunciationTips
        : fallback.pronunciationTips,
    nextPractice: report.nextPractice || fallback.nextPractice
  };
}

async function synthesizeWithQwenTts(
  text: string,
  config: LiveConfig
): Promise<SpeechAudioResult> {
  if (config.apiMode !== "live" || !config.ttsApiKey || !text.trim()) {
    return mockSpeech(text);
  }

  try {
    const response = await fetch(
      "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.ttsApiKey}`,
          "Content-Type": "application/json",
          "X-DashScope-SSE": "enable"
        },
        body: JSON.stringify({
          model: config.ttsModel || "qwen3-tts-flash",
          input: {
            text,
            voice: config.ttsVoiceId || "Cherry",
            language_type: "English"
          }
        })
      }
    );

    if (!response.ok) {
      return { ...mockSpeech(text), fallbackReason: `Qwen TTS ${response.status}` } as SpeechAudioResult;
    }

    const raw = await response.text();
    const audioBase64 = extractQwenAudioBase64(parseSseJsonLines(raw));
    if (!audioBase64) {
      return { ...mockSpeech(text), fallbackReason: "Qwen TTS returned no inline audio" } as SpeechAudioResult;
    }

    return {
      audioBase64,
      audioUrl: null,
      format: "wav",
      durationEstimateSec: Math.max(1.8, text.split(/\s+/).length * 0.28),
      provider: "qwen-tts",
      normalizedText: text
    };
  } catch (error) {
    return {
      ...mockSpeech(text),
      fallbackReason: error instanceof Error ? error.message : "Qwen TTS request failed"
    } as SpeechAudioResult;
  }
}

export async function generateReportWithLlm(
  payload: unknown,
  config: LiveConfig
): Promise<ReportResult> {
  if (config.apiMode !== "live" || !config.llmApiKey) {
    return createConversationAwareFallbackReport(
      payload,
      config,
      config.apiMode === "live" ? "LLM is not configured" : "API_MODE=mock"
    );
  }

  try {
    const json = await createJsonChatCompletion(
      config,
      [
        "Generate a comprehensive English speaking evaluation report for an Indonesian college student (Universitas Catur Insan Cendekia / UCIC).",
        "All feedback, summaries, explanations, coaching comments, and suggestions MUST be written in clear, encouraging Bahasa Indonesia.",
        "Return one strict JSON object only. Do not include Markdown or code blocks.",
        "The required JSON keys are reportId, totalScore, dimensions, summaryZh, corrections, suggestions, coachCommentZh, provider.",
        "Also include optional keys when possible: sentenceAnalyses, pronunciationTips, evidenceTurns, nextPractice.",
        "Analyze only the supplied conversation_turns. Do not invent user sentences.",
        "Every correction.original and sentenceAnalyses.original must be copied from an actual user turn.",
        "If a weakness is not evidenced in the user turns, do not mention it.",
        "sentenceAnalyses must include 1-3 concrete user sentence fixes with phrase-level highlights and clear explanations in Indonesian.",
        "pronunciationTips must include words or phrases from the transcript with practical Indonesian coaching tips and phonetic guidance.",
        "evidenceTurns must quote only user turns that justify the feedback with explanations in Indonesian.",
        "nextPractice must provide one immediately repeatable target sentence, chunks, and drills with goals in Indonesian.",
        "dimensions must include fluency, pronunciation, grammar, vocabulary, coherence, task_completion, interaction.",
        "Score the whole conversation fairly and constructively (0-100 scale).",
        `provider must be ${config.llmProvider}.`
      ].join(" "),
      JSON.stringify(payload)
    );

    const normalized = normalizeReportJson(json, config.llmProvider);
    return reportResultSchema.parse(ensureReportGroundedInConversation(normalized, payload, config));
  } catch (error) {
    return createConversationAwareFallbackReport(
      payload,
      config,
      error instanceof Error ? error.message : "LLM report request failed"
    );
  }
}
