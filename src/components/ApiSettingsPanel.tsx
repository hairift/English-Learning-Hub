/**
 * ApiSettingsPanel.tsx — panel pengaturan provider (ASR / LLM / TTS).
 *
 * Fitur utama:
 * - Preset siap pakai (default: Groq + Supertonic).
 * - Kontrol lengkap Supertonic: pilihan suara, mode bahasa, kecepatan, kualitas.
 * - Pratinjau suara (memakai override tanpa mengubah konfigurasi tersimpan).
 * - Tombol reset untuk kembali ke konfigurasi awal.
 *
 * Catatan: kunci API hanya disimpan di memori server Node lokal (dan berkas
 * `.sela-settings.json` bila persistensi aktif), tidak pernah ditulis ke browser.
 */

import { ArrowRight, Mic, RotateCcw, Save, Settings, Sparkles, Volume2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api, type RuntimeSettingsResult, type TtsVoicesResult } from "../api";

type SettingsForm = {
  apiMode: "mock" | "live";
  providerPreset: string;
  asrProvider: string;
  asrApiKey: string;
  asrModel: string;
  llmProvider: string;
  llmApiKey: string;
  llmBaseUrl: string;
  llmModel: string;
  ttsProvider: string;
  ttsApiKey: string;
  ttsVersion: string;
  ttsModel: string;
  ttsVoiceId: string;
  ttsLanguageMode: string;
  ttsSpeed: number;
  ttsSteps: number;
  ttsServiceUrl: string;
  pronunciationProvider: string;
};

/** Nilai default tiap preset (dipakai saat pengguna menekan kartu preset). */
const PRESET_DEFAULTS: Record<string, Partial<SettingsForm>> = {
  "sela-default": {
    asrProvider: "mock",
    asrModel: "browser-native",
    llmProvider: "groq",
    llmBaseUrl: "https://api.groq.com/openai/v1",
    llmModel: "qwen/qwen3.8-27b",
    ttsProvider: "supertonic",
    ttsVersion: "",
    ttsModel: "supertonic-3",
    ttsVoiceId: "F1",
    ttsLanguageMode: "auto",
    ttsSpeed: 1,
    ttsSteps: 8,
    pronunciationProvider: "rule"
  },
  "groq-elevenlabs": {
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
  custom: {}
};

const FALLBACK_FORM: SettingsForm = {
  apiMode: "mock",
  providerPreset: "sela-default",
  asrProvider: "mock",
  asrApiKey: "",
  asrModel: "browser-native",
  llmProvider: "groq",
  llmApiKey: "",
  llmBaseUrl: "https://api.groq.com/openai/v1",
  llmModel: "qwen/qwen3.8-27b",
  ttsProvider: "supertonic",
  ttsApiKey: "",
  ttsVersion: "",
  ttsModel: "supertonic-3",
  ttsVoiceId: "F1",
  ttsLanguageMode: "auto",
  ttsSpeed: 1,
  ttsSteps: 8,
  ttsServiceUrl: "http://127.0.0.1:7861",
  pronunciationProvider: "rule"
};

const PRESETS = [
  {
    id: "sela-default",
    title: "Sela Default (Direkomendasikan)",
    description: "LLM Groq + TTS Supertonic on-device. Suara perempuan Indonesia, otomatis ganti ke Inggris."
  },
  {
    id: "groq-elevenlabs",
    title: "Groq + ElevenLabs",
    description: "LLM Groq dengan TTS ElevenLabs (butuh kunci ElevenLabs)."
  },
  {
    id: "global-mixed",
    title: "Global Mixed",
    description: "AssemblyAI + LLM OpenAI-compatible + Cartesia TTS."
  },
  {
    id: "china-qwen",
    title: "Qwen / DashScope",
    description: "ASR, LLM, dan TTS terintegrasi dari Qwen."
  },
  {
    id: "custom",
    title: "Kustom / Custom",
    description: "Atur mandiri endpoint LLM, ASR, dan TTS sesuai kebutuhan."
  }
];

const ASR_OPTIONS = [
  ["mock", "Bawaan Browser (Web Speech API)"],
  ["assemblyai", "AssemblyAI Universal-3"],
  ["deepgram", "Deepgram Nova-3"],
  ["qwen-asr", "Qwen ASR"],
  ["aliyun-isi", "Aliyun Speech"],
  ["iflytek", "iFlytek ASR"]
];

const LLM_OPTIONS = [
  ["groq", "Groq (cepat & hemat)"],
  ["openai", "OpenAI (GPT-4o / GPT-4o-mini)"],
  ["custom-openai-compatible", "OpenAI-Compatible (Gemini, OpenRouter)"],
  ["qwen", "Qwen / DashScope"],
  ["doubao", "Volcengine / Doubao"],
  ["kimi", "Kimi / Moonshot"]
];

const TTS_OPTIONS = [
  ["supertonic", "Supertonic (on-device, ID + EN)"],
  ["mock", "Mock (suara simulasi)"],
  ["elevenlabs", "ElevenLabs Multilingual v2"],
  ["cartesia", "Cartesia Sonic-3.5"],
  ["qwen-tts", "Qwen TTS"],
  ["aliyun-isi", "Aliyun TTS"],
  ["iflytek", "iFlytek TTS"]
];

const LANGUAGE_MODE_OPTIONS = [
  ["auto", "Otomatis (deteksi ID / EN per kalimat)"],
  ["id", "Selalu Bahasa Indonesia"],
  ["en", "Selalu Bahasa Inggris"]
];

const PRONUNCIATION_OPTIONS = [
  ["rule", "Rule-Based Aggregated Scoring (Rekomendasi)"],
  ["qwen", "Qwen Text Assessment"],
  ["iflytek", "iFlytek Voice Evaluation"]
];

/** Teks contoh untuk pratinjau suara (memuat angka agar normalisasi teruji). */
const CONTOH_PRATINJAU = "Halo, saya Sela. Hari ini kita akan berlatih percakapan bahasa Inggris selama 5 menit.";

function createForm(settings: RuntimeSettingsResult | null): SettingsForm {
  return {
    ...FALLBACK_FORM,
    apiMode: settings?.mode ?? FALLBACK_FORM.apiMode,
    providerPreset: settings?.editable.providerPreset ?? FALLBACK_FORM.providerPreset,
    asrProvider: settings?.editable.asrProvider ?? FALLBACK_FORM.asrProvider,
    asrApiKey: "",
    asrModel: settings?.editable.asrModel ?? FALLBACK_FORM.asrModel,
    llmProvider: settings?.editable.llmProvider ?? FALLBACK_FORM.llmProvider,
    llmApiKey: "",
    llmBaseUrl: settings?.editable.llmBaseUrl ?? FALLBACK_FORM.llmBaseUrl,
    llmModel: settings?.editable.llmModel ?? FALLBACK_FORM.llmModel,
    ttsProvider: settings?.editable.ttsProvider ?? FALLBACK_FORM.ttsProvider,
    ttsApiKey: "",
    ttsVersion: settings?.editable.ttsVersion ?? FALLBACK_FORM.ttsVersion,
    ttsModel: settings?.editable.ttsModel ?? FALLBACK_FORM.ttsModel,
    ttsVoiceId: settings?.editable.ttsVoiceId ?? FALLBACK_FORM.ttsVoiceId,
    ttsLanguageMode: settings?.editable.ttsLanguageMode ?? FALLBACK_FORM.ttsLanguageMode,
    ttsSpeed: settings?.editable.ttsSpeed ?? FALLBACK_FORM.ttsSpeed,
    ttsSteps: settings?.editable.ttsSteps ?? FALLBACK_FORM.ttsSteps,
    ttsServiceUrl: settings?.editable.ttsServiceUrl ?? FALLBACK_FORM.ttsServiceUrl,
    pronunciationProvider: settings?.editable.pronunciationProvider ?? FALLBACK_FORM.pronunciationProvider
  };
}

function statusText(status?: string) {
  if (status === "ready") return "Siap";
  if (status === "local-offline") return "Layanan lokal mati";
  if (status === "planned") return "Belum diimplementasikan";
  if (status === "missing-key") return "Perlu kunci API";
  return "Belum terdeteksi";
}

function optionLabel(options: string[][], value: string) {
  return options.find(([id]) => id === value)?.[1] ?? value;
}

export function ApiSettingsPanel({
  open,
  onClose,
  onSaved
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (settings: RuntimeSettingsResult) => void;
}) {
  const [settings, setSettings] = useState<RuntimeSettingsResult | null>(null);
  const [form, setForm] = useState<SettingsForm>(() => createForm(null));
  const [status, setStatus] = useState("");
  const [voiceList, setVoiceList] = useState<TtsVoicesResult | null>(null);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStatus("Memuat konfigurasi API...");
    void api
      .settings()
      .then((result) => {
        setSettings(result);
        setForm(createForm(result));
        setStatus("");
      })
      .catch(() => setStatus("Gagal memuat konfigurasi. Pastikan backend server aktif di port 5174."));
    // Muat daftar suara Supertonic dari layanan TTS (bila hidup).
    void api
      .ttsVoices()
      .then(setVoiceList)
      .catch(() => setVoiceList(null));
  }, [open]);

  if (!open) return null;

  function update<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function choosePreset(preset: string) {
    setForm((current) => ({
      ...current,
      ...PRESET_DEFAULTS[preset],
      providerPreset: preset
    }));
  }

  async function saveSettings() {
    setStatus("Menyimpan konfigurasi...");
    const result = await api.updateSettings(form);
    setSettings(result);
    setForm(createForm(result));
    onSaved(result);
    setStatus("Berhasil disimpan. Konfigurasi tersimpan di server Node lokal.");
  }

  async function resetSettings() {
    setStatus("Mengembalikan ke pengaturan awal...");
    const result = await api.resetSettings();
    setSettings(result);
    setForm(createForm(result));
    onSaved(result);
    setStatus("Pengaturan dikembalikan ke default Sela Tutor English.");
  }

  /** Memutar contoh suara memakai override tanpa mengubah konfigurasi tersimpan. */
  async function previewVoice() {
    setPreviewing(true);
    setStatus("Menghasilkan contoh suara...");
    try {
      const res = await api.synthesize(CONTOH_PRATINJAU, {
        voice: form.ttsVoiceId,
        lang: form.ttsLanguageMode,
        speed: form.ttsSpeed,
        steps: form.ttsSteps
      });
      if (res.audioBase64) {
        const audio = new Audio(`data:audio/${res.format || "wav"};base64,${res.audioBase64}`);
        await audio.play();
        setStatus(
          res.normalizedText
            ? `Pratinjau diputar. Teks dinormalisasi: "${res.normalizedText}"`
            : "Pratinjau suara diputar."
        );
      } else {
        setStatus("Pratinjau tidak menghasilkan audio. Pastikan layanan TTS Supertonic aktif.");
      }
    } catch {
      setStatus("Gagal memutar pratinjau. Pastikan layanan TTS Supertonic aktif di port 7861.");
    } finally {
      setPreviewing(false);
    }
  }

  const supertonic = settings?.providers.supertonic;
  const isSupertonic = form.ttsProvider === "supertonic";
  const voices = voiceList?.voices ?? [];

  const providerItems = [
    {
      label: "ASR",
      value: `${optionLabel(ASR_OPTIONS, settings?.providers.asr.provider ?? form.asrProvider)} / ${
        settings?.providers.asr.model ?? form.asrModel
      }`,
      status: settings?.providers.asr.status
    },
    {
      label: "LLM",
      value: `${optionLabel(LLM_OPTIONS, settings?.providers.llm.provider ?? form.llmProvider)} / ${
        settings?.providers.llm.model ?? form.llmModel
      }`,
      status: settings?.providers.llm.status
    },
    {
      label: "TTS",
      value: optionLabel(TTS_OPTIONS, settings?.providers.tts.provider ?? form.ttsProvider),
      status: settings?.providers.tts.status
    },
    {
      label: "Pengucapan",
      value: optionLabel(PRONUNCIATION_OPTIONS, settings?.providers.pronunciation.provider ?? form.pronunciationProvider),
      status: settings?.providers.pronunciation.status
    }
  ];

  const settingsNote =
    form.apiMode === "mock"
      ? "Mode Mock aktif: Anda dapat langsung berlatih dan melakukan demo tanpa kunci API berbayar. Jawaban dan evaluasi akan disimulasikan secara realistis."
      : "Mode Live aktif: backend akan memanggil API AI sesuai provider di bawah. Kunci API hanya disimpan di server Node lokal. Untuk permanen, gunakan berkas .env.";

  return (
    <div className="settings-backdrop" role="dialog" aria-modal="true" aria-label="Pengaturan API">
      <section className="settings-panel panel">
        <div className="settings-header">
          <div>
            <p className="eyebrow">Konfigurasi Provider AI</p>
            <h2>Pengaturan API</h2>
          </div>
          <button className="ghost icon-only" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        <div className="mode-switch" role="group" aria-label="Pilihan Mode API">
          <button
            className={form.apiMode === "mock" ? "selected" : ""}
            onClick={() => update("apiMode", "mock")}
          >
            Mock Demo (Gratis, Tanpa Kunci)
          </button>
          <button
            className={form.apiMode === "live" ? "selected" : ""}
            onClick={() => update("apiMode", "live")}
          >
            Live API (Kunci Pribadi)
          </button>
        </div>

        <div className="preset-grid" aria-label="Preset Provider">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={form.providerPreset === preset.id ? "preset-card selected" : "preset-card"}
              onClick={() => choosePreset(preset.id)}
            >
              <strong>{preset.title}</strong>
              <span>{preset.description}</span>
            </button>
          ))}
        </div>

        <div className="provider-status">
          {providerItems.map((item) => (
            <span key={item.label} className={item.status === "ready" ? "ready" : ""}>
              {item.label}: {item.value} · {statusText(item.status)}
            </span>
          ))}
        </div>

        <div className="settings-section-title">
          <span>
            <Volume2 size={16} aria-hidden="true" />
            Mesin Suara (TTS)
            <ArrowRight size={14} aria-hidden="true" />
            Otak AI (LLM)
            <ArrowRight size={14} aria-hidden="true" />
            Pengenalan Suara (ASR)
          </span>
          <small>Sintesis suara coach, pemahaman &amp; evaluasi AI, lalu pengenalan ucapan pengguna.</small>
        </div>

        {/* ---------------- Mesin Suara (TTS) ---------------- */}
        <div className="settings-subsection">
          <h3>
            <Volume2 size={16} aria-hidden="true" />
            Mesin Suara (TTS)
          </h3>
          <div className="settings-grid">
            <label>
              TTS Provider (Suara Coach)
              <select
                value={form.ttsProvider}
                onChange={(event) => {
                  update("ttsProvider", event.target.value);
                  update("providerPreset", "custom");
                }}
              >
                {TTS_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            {isSupertonic && (
              <>
                <label>
                  Suara Supertonic
                  <select value={form.ttsVoiceId} onChange={(event) => update("ttsVoiceId", event.target.value)}>
                    {(voices.length > 0
                      ? voices
                      : [
                          { id: "F1", label: "F1 — Perempuan", gender: "female" },
                          { id: "F2", label: "F2 — Perempuan", gender: "female" },
                          { id: "F3", label: "F3 — Perempuan", gender: "female" },
                          { id: "F4", label: "F4 — Perempuan", gender: "female" },
                          { id: "F5", label: "F5 — Perempuan", gender: "female" },
                          { id: "M1", label: "M1 — Laki-laki", gender: "male" },
                          { id: "M2", label: "M2 — Laki-laki", gender: "male" },
                          { id: "M3", label: "M3 — Laki-laki", gender: "male" },
                          { id: "M4", label: "M4 — Laki-laki", gender: "male" },
                          { id: "M5", label: "M5 — Laki-laki", gender: "male" }
                        ]
                    ).map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Mode Bahasa
                  <select
                    value={form.ttsLanguageMode}
                    onChange={(event) => update("ttsLanguageMode", event.target.value)}
                  >
                    {LANGUAGE_MODE_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Kecepatan Bicara: {form.ttsSpeed.toFixed(2)}x
                  <input
                    type="range"
                    min={0.7}
                    max={2}
                    step={0.05}
                    value={form.ttsSpeed}
                    onChange={(event) => update("ttsSpeed", Number(event.target.value))}
                  />
                </label>
                <label>
                  Kualitas Suara (langkah): {form.ttsSteps}
                  <input
                    type="range"
                    min={5}
                    max={12}
                    step={1}
                    value={form.ttsSteps}
                    onChange={(event) => update("ttsSteps", Number(event.target.value))}
                  />
                </label>
                <label className="settings-wide">
                  URL Layanan TTS Supertonic
                  <input
                    value={form.ttsServiceUrl}
                    placeholder="http://127.0.0.1:7861"
                    onChange={(event) => update("ttsServiceUrl", event.target.value)}
                  />
                </label>
              </>
            )}

            <label>
              TTS API Key
              <input
                type="password"
                autoComplete="off"
                value={form.ttsApiKey}
                placeholder="Kosongkan bila memakai konfigurasi .env"
                onChange={(event) => update("ttsApiKey", event.target.value)}
              />
            </label>
            <label>
              TTS Model
              <input value={form.ttsModel} onChange={(event) => update("ttsModel", event.target.value)} />
            </label>
            <label>
              TTS Version
              <input
                value={form.ttsVersion}
                placeholder="Contoh: 2026-03-01 untuk Cartesia"
                onChange={(event) => update("ttsVersion", event.target.value)}
              />
            </label>
          </div>

          {isSupertonic && (
            <div className="supertonic-status">
              <span className={supertonic?.serviceReady ? "dot ready" : "dot"} aria-hidden="true" />
              <span>
                {supertonic?.serviceReady
                  ? "Layanan Supertonic aktif dan siap."
                  : "Layanan Supertonic belum aktif. Jalankan: python tts_service/server.py"}
              </span>
              <button type="button" className="secondary" onClick={previewVoice} disabled={previewing}>
                <Volume2 size={16} />
                {previewing ? "Memutar..." : "Pratinjau Suara"}
              </button>
            </div>
          )}
        </div>

        {/* ---------------- Otak AI (LLM) ---------------- */}
        <div className="settings-subsection">
          <h3>
            <Sparkles size={16} aria-hidden="true" />
            Otak AI (LLM)
          </h3>
          <div className="settings-grid">
            <label>
              LLM Provider
              <select
                value={form.llmProvider}
                onChange={(event) => {
                  update("llmProvider", event.target.value);
                  update("providerPreset", "custom");
                }}
              >
                {LLM_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              LLM API Key
              <input
                type="password"
                autoComplete="off"
                value={form.llmApiKey}
                placeholder="Masukkan kunci API (Groq / OpenAI / Gemini)"
                onChange={(event) => update("llmApiKey", event.target.value)}
              />
            </label>
            <label>
              LLM Base URL
              <input
                value={form.llmBaseUrl}
                placeholder="Contoh: https://api.groq.com/openai/v1"
                onChange={(event) => update("llmBaseUrl", event.target.value)}
              />
            </label>
            <label>
              LLM Model
              <input
                value={form.llmModel}
                placeholder="Contoh: qwen/qwen3.8-27b, llama-3.3-70b-versatile"
                onChange={(event) => update("llmModel", event.target.value)}
              />
            </label>
          </div>
        </div>

        {/* ---------------- Pengenalan Suara (ASR) ---------------- */}
        <div className="settings-subsection">
          <h3>
            <Mic size={16} aria-hidden="true" />
            Pengenalan Suara (ASR)
          </h3>
          <div className="settings-grid">
            <label>
              ASR Provider
              <select
                value={form.asrProvider}
                onChange={(event) => {
                  update("asrProvider", event.target.value);
                  update("providerPreset", "custom");
                }}
              >
                {ASR_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              ASR API Key
              <input
                type="password"
                autoComplete="off"
                value={form.asrApiKey}
                placeholder="Kosongkan bila memakai konfigurasi .env"
                onChange={(event) => update("asrApiKey", event.target.value)}
              />
            </label>
            <label>
              ASR Model
              <input value={form.asrModel} onChange={(event) => update("asrModel", event.target.value)} />
            </label>
            <label>
              Evaluasi Pengucapan
              <select
                value={form.pronunciationProvider}
                onChange={(event) => {
                  update("pronunciationProvider", event.target.value);
                  update("providerPreset", "custom");
                }}
              >
                {PRONUNCIATION_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <p className="settings-note">{settingsNote}</p>

        <div className="settings-actions">
          <span>{status}</span>
          <div className="settings-action-buttons">
            <button className="secondary" onClick={resetSettings}>
              <RotateCcw size={16} />
              Reset
            </button>
            <button className="primary" onClick={saveSettings}>
              <Save size={18} />
              Simpan Konfigurasi
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
