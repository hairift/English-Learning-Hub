import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../server/app";

describe("runtime API settings", () => {
  it("reports the configured provider preset while staying safe in mock mode", async () => {
    const app = createApp({ apiMode: "mock" });

    const settings = await request(app).get("/api/settings").expect(200);

    expect(settings.body.mode).toBe("mock");
    expect(settings.body.editable.providerPreset).toBeTruthy();
    expect(settings.body.providers.asr.active).toBe(false);
    expect(settings.body.providers.llm.active).toBe(false);
    expect(settings.body.providers.tts.active).toBe(false);
  });

  it("applies the China Qwen preset without exposing submitted secrets", async () => {
    const app = createApp({ apiMode: "mock" });

    const update = await request(app)
      .post("/api/settings")
      .send({
        apiMode: "live",
        providerPreset: "china-qwen",
        llmApiKey: "dashscope_test_secret"
      })
      .expect(200);

    expect(update.body.mode).toBe("live");
    expect(update.body.editable.providerPreset).toBe("china-qwen");
    expect(update.body.providers.llm.provider).toBe("qwen");
    expect(update.body.providers.llm.configured).toBe(true);
    expect(update.body.providers.llm.active).toBe(true);
    expect(update.body.providers.llm.model).toBe("qwen-plus");
    expect(update.body.providers.llm.baseUrl).toBe("https://dashscope.aliyuncs.com/compatible-mode/v1");
    expect(update.body.providers.asr.provider).toBe("qwen-asr");
    expect(update.body.providers.tts.provider).toBe("qwen-tts");
    expect(update.text).not.toContain("dashscope_test_secret");
  });

  it("supports custom OpenAI-compatible LLM provider settings", async () => {
    const app = createApp({ apiMode: "mock" });

    const update = await request(app)
      .post("/api/settings")
      .send({
        apiMode: "live",
        providerPreset: "custom",
        llmProvider: "kimi",
        llmApiKey: "moonshot_test_secret",
        llmBaseUrl: "https://api.moonshot.cn/v1",
        llmModel: "kimi-latest"
      })
      .expect(200);

    expect(update.body.providers.llm.provider).toBe("kimi");
    expect(update.body.providers.llm.model).toBe("kimi-latest");
    expect(update.body.providers.llm.baseUrl).toBe("https://api.moonshot.cn/v1");
    expect(update.body.providers.llm.configured).toBe(true);
    expect(update.text).not.toContain("moonshot_test_secret");
  });

  it("accepts Qwen speech providers for live experiments without leaking keys", async () => {
    const app = createApp({ apiMode: "mock" });

    const update = await request(app)
      .post("/api/settings")
      .send({
        apiMode: "live",
        providerPreset: "custom",
        asrProvider: "qwen-asr",
        asrApiKey: "dashscope_speech_secret",
        llmProvider: "qwen",
        llmApiKey: "dashscope_speech_secret",
        llmBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        llmModel: "qwen-plus",
        ttsProvider: "qwen-tts",
        ttsApiKey: "dashscope_speech_secret",
        ttsModel: "qwen3-tts-flash",
        pronunciationProvider: "qwen"
      })
      .expect(200);

    expect(update.body.providers.asr.provider).toBe("qwen-asr");
    expect(update.body.providers.asr.configured).toBe(true);
    expect(update.body.providers.tts.provider).toBe("qwen-tts");
    expect(update.body.providers.tts.configured).toBe(true);
    expect(update.body.providers.pronunciation.provider).toBe("qwen");
    expect(update.body.providers.pronunciation.configured).toBe(true);
    expect(update.text).not.toContain("dashscope_speech_secret");
  });

  it("accepts AssemblyAI ASR with custom LLM and Cartesia TTS", async () => {
    const app = createApp({ apiMode: "mock" });

    const update = await request(app)
      .post("/api/settings")
      .send({
        apiMode: "live",
        providerPreset: "custom",
        asrProvider: "assemblyai",
        asrApiKey: "assembly_test_secret",
        asrModel: "universal-3-pro",
        llmProvider: "custom-openai-compatible",
        llmApiKey: "hezu_test_secret",
        llmBaseUrl: "https://hezu.ink/v1",
        llmModel: "gpt-5.4-mini",
        ttsProvider: "cartesia",
        ttsApiKey: "cartesia_test_secret",
        ttsModel: "sonic-3.5",
        cartesiaVoiceId: "voice_test"
      })
      .expect(200);

    expect(update.body.providers.asr.provider).toBe("assemblyai");
    expect(update.body.providers.asr.configured).toBe(true);
    expect(update.body.providers.asr.model).toBe("universal-3-pro");
    expect(update.body.providers.llm.provider).toBe("custom-openai-compatible");
    expect(update.body.providers.llm.model).toBe("gpt-5.4-mini");
    expect(update.body.providers.llm.baseUrl).toBe("https://hezu.ink/v1");
    expect(update.body.providers.tts.provider).toBe("cartesia");
    expect(update.body.providers.tts.configured).toBe(true);
    expect(update.text).not.toContain("assembly_test_secret");
    expect(update.text).not.toContain("hezu_test_secret");
    expect(update.text).not.toContain("cartesia_test_secret");
  });

  it("updates provider configuration without exposing submitted secret values", async () => {
    const app = createApp({ apiMode: "mock" });

    const update = await request(app)
      .post("/api/settings")
      .send({
        apiMode: "live",
        providerPreset: "custom",
        asrProvider: "deepgram",
        llmProvider: "openai",
        ttsProvider: "cartesia",
        deepgramApiKey: "dg_test_secret",
        openaiApiKey: "sk-test-secret",
        openaiModel: "gpt-4o-mini",
        cartesiaApiKey: "cartesia_test_secret",
        cartesiaVoiceId: "voice_test",
        cartesiaModel: "sonic-latest",
        cartesiaVersion: "2026-03-01"
      })
      .expect(200);

    expect(update.body.mode).toBe("live");
    expect(update.text).not.toContain("dg_test_secret");
    expect(update.text).not.toContain("sk-test-secret");
    expect(update.text).not.toContain("cartesia_test_secret");

    const health = await request(app).get("/api/health").expect(200);

    expect(health.body.mode).toBe("live");
    expect(health.body.providers.deepgram.configured).toBe(true);
    expect(health.body.providers.openai.configured).toBe(true);
    expect(health.body.providers.cartesia.configured).toBe(true);
    expect(health.text).not.toContain("sk-test-secret");
  });

  it("keeps existing runtime secrets when update fields are blank", async () => {
    const app = createApp({ apiMode: "mock" });

    await request(app)
      .post("/api/settings")
      .send({ apiMode: "live", openaiApiKey: "sk-existing-secret" })
      .expect(200);

    const update = await request(app)
      .post("/api/settings")
      .send({ apiMode: "mock", openaiApiKey: "", openaiModel: "gpt-4o-mini" })
      .expect(200);

    expect(update.body.providers.openai.configured).toBe(true);
    expect(update.text).not.toContain("sk-existing-secret");
  });
});
