import cors from "cors";
import express from "express";
import multer from "multer";
import { siapkanTeksTts } from "../shared/textNormalizer";
import {
  applyRuntimeSettings,
  getConfig,
  getHealth,
  getRuntimeSettings,
  SUARA_SUPERTONIC_DEFAULT,
  URL_LAYANAN_TTS_DEFAULT,
  type AppOptions,
  type RuntimeSettingsInput
} from "./config";
import { findScenarioTask, scenarios, type Scenario } from "./data";
import {
  generateReportWithLlm,
  generateTurnWithLlm,
  synthesizeWithCartesia,
  transcribeWithDeepgram
} from "./providers/liveProviders";
import { ambilStatusLayananTts, periksaLayananTts, perluPeriksaUlang } from "./providers/ttsServiceStatus";
import { completePracticeSession } from "./practiceSession";
import { practiceSessionStore } from "./sessionStore";
import {
  adaPengaturanTersimpan,
  hapusPengaturanTersimpan,
  muatPengaturanTersimpan,
  simpanPengaturan
} from "./settingsStore";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

/** Daftar suara Supertonic cadangan bila layanan TTS sedang tidak aktif. */
const SUARA_SUPERTONIC_CADANGAN = ["F1", "F2", "F3", "F4", "F5", "M1", "M2", "M3", "M4", "M5"];

function normalizeCustomScenario(value: unknown): Scenario | null {
  if (!value || typeof value !== "object") return null;
  const scenario = value as Partial<Scenario>;
  const task = scenario.tasks?.[0];
  if (!scenario.nameZh || !scenario.descriptionZh || !task?.titleZh || !task.openingQuestion) return null;

  return {
    id: scenario.id || `custom_${Date.now()}`,
    nameZh: scenario.nameZh,
    nameEn: scenario.nameEn || "Custom",
    descriptionZh: scenario.descriptionZh,
    tasks: [
      {
        id: task.id || "custom-task",
        titleZh: task.titleZh,
        titleEn: task.titleEn || "Custom practice",
        aiRoleZh: task.aiRoleZh || "AI Coach",
        focus: task.focus || "Jelaskan tujuan dan hasil dengan jelas",
        openingQuestion: task.openingQuestion
      }
    ]
  };
}

export function createApp(options: AppOptions = {}) {
  const app = express();
  const config = getConfig(options);
  app.locals.config = config;

  /**
   * Apakah pengaturan boleh ditulis ke berkas `.sela-settings.json`?
   * Dimatikan saat pengujian agar tes tidak mengubah berkas milik pengguna.
   */
  const izinkanSimpan =
    options.persistSettings ?? (process.env.NODE_ENV !== "test" && !process.env.VITEST);

  // Terapkan pengaturan yang pernah disimpan pengguna (bila ada).
  const tersimpan = izinkanSimpan ? muatPengaturanTersimpan() : null;
  if (tersimpan) {
    applyRuntimeSettings(config, tersimpan);
    // Mode dari opsi eksplisit (mis. tes) tetap diprioritaskan.
    if (options.apiMode) config.apiMode = options.apiMode;
  }

  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", async (_req, res) => {
    // Segarkan status layanan TTS bila cache sudah kedaluwarsa.
    if (perluPeriksaUlang()) {
      await periksaLayananTts(config.ttsServiceUrl);
    }
    res.json(getHealth(config));
  });

  app.get("/api/settings", (_req, res) => {
    res.json({ ...getRuntimeSettings(config), persisted: izinkanSimpan && adaPengaturanTersimpan() });
  });

  app.post("/api/settings", (req, res) => {
    const input = (req.body || {}) as RuntimeSettingsInput;
    applyRuntimeSettings(config, input);
    // Simpan agar pengaturan bertahan setelah server dinyalakan ulang.
    if (izinkanSimpan) {
      simpanPengaturan({
        ...input,
        // Simpan juga nilai efektif supaya berkas selalu lengkap.
        ttsVoiceId: config.ttsVoiceId,
        ttsLanguageMode: config.ttsLanguageMode,
        ttsSpeed: config.ttsSpeed,
        ttsSteps: config.ttsSteps,
        ttsServiceUrl: config.ttsServiceUrl
      });
    }
    void periksaLayananTts(config.ttsServiceUrl);
    res.json({ ...getRuntimeSettings(config), persisted: izinkanSimpan });
  });

  app.post("/api/settings/reset", (_req, res) => {
    if (izinkanSimpan) hapusPengaturanTersimpan();
    const segar = getConfig({ apiMode: options.apiMode });
    Object.assign(config, segar);
    void periksaLayananTts(config.ttsServiceUrl);
    res.json({ ...getRuntimeSettings(config), persisted: false });
  });

  app.get("/api/scenarios", (_req, res) => {
    res.json({ scenarios });
  });

  app.post("/api/session/start", (req, res) => {
    const scenarioId = String(req.body?.scenarioId || "interview");
    const taskId = String(req.body?.taskId || "internship-intro");
    const customScenario = normalizeCustomScenario(req.body?.customScenario);
    const { scenario, task } = customScenario
      ? { scenario: customScenario, task: customScenario.tasks[0] }
      : findScenarioTask(scenarioId, taskId);
    const durationMinutes = Number(req.body?.durationMinutes || 5);
    const session = practiceSessionStore.create({
      scenarioId: scenario.id,
      scenarioLabel: `${scenario.nameZh} / ${scenario.nameEn}`,
      targetGoal: task.focus,
      durationMinutes,
      openingAiText: task.openingQuestion
    });
    res.json({
      sessionId: session.id,
      session,
      aiText: task.openingQuestion,
      hintZh: `Fokus giliran ini: ${task.focus}. Jawab pertanyaan lebih dulu, lalu sertakan contoh konkret. / Focus: ${task.focus}. Answer first, then provide a concrete example.`,
      coachState: "asking",
      duration: session.duration,
      remainingSeconds: session.duration,
      scenario,
      task
    });
  });

  app.get("/api/session/:sessionId", (req, res) => {
    const session = practiceSessionStore.get(req.params.sessionId);
    if (!session) {
      res.status(404).json({ error: "practice_session not found" });
      return;
    }
    res.json({ session });
  });

  app.post("/api/session/:sessionId/turns", (req, res) => {
    const session = practiceSessionStore.get(req.params.sessionId);
    if (!session) {
      res.status(404).json({ error: "practice_session not found" });
      return;
    }

    const speaker = String(req.body?.speaker || "");
    const text = String(req.body?.text || "").trim();
    if (!["ai", "user", "system"].includes(speaker) || !text) {
      res.status(400).json({ error: "speaker must be ai/user/system and text is required" });
      return;
    }

    const turn = practiceSessionStore.addTurn(session.id, {
      speaker: speaker as "ai" | "user" | "system",
      text,
      timestamp: String(req.body?.timestamp || new Date().toISOString()),
      transcriptConfidence:
        typeof req.body?.transcriptConfidence === "number" ? req.body.transcriptConfidence : undefined,
      audioDurationSec: typeof req.body?.audioDurationSec === "number" ? req.body.audioDurationSec : undefined,
      latencyMs: typeof req.body?.latencyMs === "number" ? req.body.latencyMs : undefined,
      hintZh: typeof req.body?.hintZh === "string" ? req.body.hintZh : undefined,
      keywords: Array.isArray(req.body?.keywords) ? req.body.keywords.map(String) : undefined
    });

    res.json({ turn, session });
  });

  app.post("/api/session/:sessionId/end", (req, res) => {
    const session = practiceSessionStore.end(req.params.sessionId);
    if (!session) {
      res.status(404).json({ error: "practice_session not found" });
      return;
    }
    res.json({ session });
  });

  app.post("/api/asr/transcribe", upload.single("audio"), async (req, res) => {
    const result = await transcribeWithDeepgram(req.file, config);
    res.json(result);
  });

  app.post("/api/llm/turn", async (req, res) => {
    const result = await generateTurnWithLlm(
      {
        scenarioId: String(req.body?.scenarioId || "interview"),
        taskId: String(req.body?.taskId || "internship-intro"),
        scenarioLabel: String(req.body?.scenarioLabel || ""),
        taskTitle: String(req.body?.taskTitle || ""),
        taskFocus: String(req.body?.taskFocus || ""),
        aiRoleZh: String(req.body?.aiRoleZh || ""),
        round: Number(req.body?.round || 1),
        userText: String(req.body?.userText || "")
      },
      config
    );
    res.json(result);
  });

  /**
   * Endpoint sintesis suara.
   * Menerima override opsional (voice/lang/speed/steps) untuk fitur pratinjau
   * di panel pengaturan, tanpa mengubah konfigurasi tersimpan.
   */
  app.post("/api/tts/synthesize", async (req, res) => {
    const text = String(req.body?.text || "");
    const overrideVoice = typeof req.body?.voice === "string" ? req.body.voice : undefined;
    const overrideLang = typeof req.body?.lang === "string" ? req.body.lang : undefined;
    const overrideSpeed = typeof req.body?.speed === "number" ? req.body.speed : undefined;
    const overrideSteps = typeof req.body?.steps === "number" ? req.body.steps : undefined;

    // Simpan konfigurasi asli lalu terapkan override sementara.
    const asli = {
      ttsVoiceId: config.ttsVoiceId,
      ttsLanguageMode: config.ttsLanguageMode,
      ttsSpeed: config.ttsSpeed,
      ttsSteps: config.ttsSteps
    };
    if (overrideVoice) config.ttsVoiceId = overrideVoice;
    if (overrideLang === "id" || overrideLang === "en" || overrideLang === "auto") {
      config.ttsLanguageMode = overrideLang;
    }
    if (overrideSpeed !== undefined) config.ttsSpeed = Math.max(0.7, Math.min(2, overrideSpeed));
    if (overrideSteps !== undefined) config.ttsSteps = Math.max(5, Math.min(12, Math.round(overrideSteps)));

    try {
      const result = await synthesizeWithCartesia(text, config);
      res.json(result);
    } finally {
      Object.assign(config, asli);
    }
  });

  /** Daftar suara Supertonic untuk panel pengaturan. */
  app.get("/api/tts/voices", async (_req, res) => {
    const status = ambilStatusLayananTts();
    if (!status.tersedia && perluPeriksaUlang()) {
      await periksaLayananTts(config.ttsServiceUrl);
    }
    const terbaru = ambilStatusLayananTts();
    const daftar = terbaru.daftarSuara.length ? terbaru.daftarSuara : SUARA_SUPERTONIC_CADANGAN;
    res.json({
      serviceUrl: config.ttsServiceUrl,
      serviceAlive: terbaru.hidup,
      serviceReady: terbaru.tersedia,
      serviceDetail: terbaru.detail,
      default: terbaru.suaraDefault || SUARA_SUPERTONIC_DEFAULT,
      voices: daftar.map((id) => ({
        id,
        label: `Supertonic ${id}`,
        gender: id.startsWith("F") ? "wanita" : "pria"
      }))
    });
  });

  /** Pratinjau normalisasi teks (angka -> kata) tanpa sintesis. */
  app.post("/api/tts/normalize", (req, res) => {
    const text = String(req.body?.text || "");
    const mode = String(req.body?.lang || config.ttsLanguageMode || "auto");
    const hasil = siapkanTeksTts(text, mode === "id" || mode === "en" ? mode : "auto");
    res.json({ original: hasil.original, text: hasil.text, lang: hasil.lang });
  });

  app.post("/api/report/generate", async (req, res) => {
    const sessionId = String(req.body?.sessionId || "");
    const session = sessionId ? practiceSessionStore.get(sessionId) : null;
    const result = await generateReportWithLlm(
      session ? { ...req.body, conversation_turns: session.conversation_turns } : req.body,
      config
    );
    if (session) completePracticeSession(session, result);
    res.json(result);
  });

  // Pemeriksaan awal layanan TTS (tidak memblokir startup).
  void periksaLayananTts(config.ttsServiceUrl);

  return app;
}

export { URL_LAYANAN_TTS_DEFAULT };
