import {
  ArrowDown,
  Award,
  BarChart3,
  CalendarDays,
  ClipboardList,
  Headphones,
  Home,
  Languages,
  MessageCircle,
  Mic,
  PencilLine,
  Play,
  Route,
  Send,
  Settings,
  Sparkles,
  Square,
  Target,
  TrendingUp,
  Volume2
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CoachState, ConversationTurn, PracticeSession, ReportResult } from "../shared/schemas";
import { deteksiBahasa, normalisasiTeksEn, normalisasiTeksId } from "../shared/textNormalizer";
import type { Scenario } from "../server/data";
import { api, checkPipecatHealth, createPipecatOfferUrl, type HealthResult } from "./api";
import { ApiSettingsPanel } from "./components/ApiSettingsPanel";
import { BrandTopBar } from "./components/BrandGuidelines";
import { CoachAvatar } from "./components/CoachAvatar";
import { ReportDashboard } from "./components/ReportDashboard";
import { WeekDots } from "./components/WeekDots";
import { VALUE_CARDS } from "./copy/coachCopy";
import { getShanghaiDate, type CheckinState } from "./domain/checkin";
import { GROWTH_MOCK } from "./domain/growthMock";
import {
  completeToday,
  loadCheckin,
  loadCustomScenarios,
  loadLearning,
  recordLearning,
  saveCustomScenario
} from "./storage";
import {
  createLearningRecord,
  summarizeLearning,
  type LearningState
} from "./domain/learning";
import { createPipecatVoiceClient, type PipecatVoiceClient, type PipecatVoiceTurn } from "./pipecatVoiceClient";
import {
  getPracticeExperienceCopy,
  mapPracticeStartError,
  practiceStatusLabel,
  type PracticeStatus
} from "./practiceExperience";
import { getTranscriptFollowState } from "./practiceTranscript";
import {
  daftarkanElemenAudio,
  daftarkanStreamAudio,
  lepasSemuaSumberAudio,
  lepasSumberAudio
} from "./lipsync/audioAnalyser";
import { mulaiVisemeDariTeks } from "./lipsync/visemeDariTeks";

type Screen = "home" | "prep" | "practice" | "report";
type JourneyStatus = "done" | "active" | "waiting";
type JourneyStep = {
  label: string;
  detail: string;
  status: JourneyStatus;
};
type CustomScenarioForm = {
  sceneName: string;
  aiRole: string;
  taskTitle: string;
  focus: string;
  openingQuestion: string;
};

const fallbackScenarios: Scenario[] = [
  {
    id: "interview",
    nameZh: "Wawancara Kerja",
    nameEn: "Job Interview",
    descriptionZh: "Latihan menjawab pertanyaan wawancara kerja teknis dan profesional.",
    tasks: [
      {
        id: "internship-intro",
        titleZh: "Perkenalan Diri Wawancara",
        titleEn: "Internship introduction",
        aiRoleZh: "AI Interviewer",
        focus: "Jelaskan pengalaman proyek dan hasil terukur",
        openingQuestion: "Tell me about one project you are proud of."
      }
    ]
  }
];

const defaultCustomForm: CustomScenarioForm = {
  sceneName: "Presentasi Proyek Kampus",
  aiRole: "Dosen Penguji AI",
  taskTitle: "Menjelaskan Manfaat Proyek",
  focus: "Mulai dari kesimpulan, jelaskan manfaat bagi pengguna dan sertakan data/angka",
  openingQuestion: "Could you explain the value of your project in one minute?"
};

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>(fallbackScenarios);
  const [scenario, setScenario] = useState<Scenario>(fallbackScenarios[0]);
  const [task, setTask] = useState<Scenario["tasks"][number]>(fallbackScenarios[0].tasks[0]);
  const [practiceSession, setPracticeSession] = useState<PracticeSession | null>(null);
  const [practiceStatus, setPracticeStatus] = useState<PracticeStatus>("idle");
  const [remainingSeconds, setRemainingSeconds] = useState(5 * 60);
  const [selectedDurationMinutes, setSelectedDurationMinutes] = useState(5);
  const [coachState, setCoachState] = useState<CoachState>("idle");
  const [conversationTurns, setConversationTurns] = useState<ConversationTurn[]>([]);
  const [latestAiText, setLatestAiText] = useState("");
  const [report, setReport] = useState<ReportResult | null>(null);
  const [checkin, setCheckin] = useState<CheckinState>(() => loadCheckin());
  const [learning, setLearning] = useState<LearningState>(() => loadLearning());
  const [customForm, setCustomForm] = useState<CustomScenarioForm>(defaultCustomForm);
  const [busy, setBusy] = useState("");
  const [startError, setStartError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userAnswerText, setUserAnswerText] = useState("");
  const [isListeningMic, setIsListeningMic] = useState(false);
  const recognitionRef = useRef<any>(null);
  const voiceClientRef = useRef<PipecatVoiceClient | null>(null);
  const countdownRef = useRef<number | null>(null);
  const recordedTurnKeysRef = useRef(new Set<string>());
  const transcriptLogRef = useRef<HTMLDivElement | null>(null);
  const transcriptPinnedRef = useRef(true);
  const previousTurnCountRef = useRef(0);
  const [transcriptPinnedToLatest, setTranscriptPinnedToLatest] = useState(true);
  const [unseenTurnCount, setUnseenTurnCount] = useState(0);

  const todayDone = checkin.completedDates.includes(getShanghaiDate());
  const learningSummary = useMemo(() => summarizeLearning(learning), [learning]);
  const latestLearningRecord = learning.records[0] ?? null;
  const userTurnCount = conversationTurns.filter((turn) => turn.speaker === "user").length;
  const practiceCopy = useMemo(
    () => getPracticeExperienceCopy({ status: practiceStatus, busy, error: startError }),
    [busy, practiceStatus, startError]
  );
  const journeySteps = useMemo(
    () =>
      createJourneySteps({
        screen,
        busy,
        turnCount: userTurnCount,
        hasReport: Boolean(report)
      }),
    [busy, report, screen, userTurnCount]
  );

  /** Ringkasan konfigurasi suara yang sedang aktif (untuk chip di navbar). */
  const voiceSummary = useMemo(() => {
    const tts = health?.providers.tts;
    if (!tts) return null;
    const supertonic = health?.providers.supertonic;
    const voice = supertonic?.voice || tts.voice || "";
    const mode = tts.languageMode === "en" ? "English" : tts.languageMode === "id" ? "Indonesia" : "Auto ID/EN";
    return {
      provider: tts.provider,
      voice,
      mode,
      offline: tts.provider === "supertonic" && !supertonic?.serviceReady
    };
  }, [health]);

  useEffect(() => {
    void api.health().then(setHealth).catch(() => null);
    void api
      .scenarios()
      .then((result) => {
        const mergedScenarios = [...result.scenarios, ...loadCustomScenarios()];
        setScenarios(mergedScenarios);
        setScenario(mergedScenarios[0]);
        setTask(mergedScenarios[0].tasks[0]);
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [screen]);

  useEffect(() => {
    return () => {
      void voiceClientRef.current?.disconnect();
      if (countdownRef.current) {
        window.clearInterval(countdownRef.current);
      }
      lepasSemuaSumberAudio();
    };
  }, []);

  useLayoutEffect(() => {
    const log = transcriptLogRef.current;
    const previousTurnCount = previousTurnCountRef.current;
    const currentTurnCount = conversationTurns.length;
    const newTurnCount = Math.max(0, currentTurnCount - previousTurnCount);
    previousTurnCountRef.current = currentTurnCount;

    if (!log) return;
    if (currentTurnCount === 0) {
      setTranscriptPinned(true);
      setUnseenTurnCount(0);
      return;
    }
    if (newTurnCount === 0) return;

    if (transcriptPinnedRef.current) {
      scrollTranscriptToLatest("smooth");
      return;
    }

    const followState = getTranscriptFollowState({
      scrollTop: log.scrollTop,
      clientHeight: log.clientHeight,
      scrollHeight: log.scrollHeight,
      newTurnCount
    });
    if (followState.shouldFollow) {
      scrollTranscriptToLatest("smooth");
      return;
    }
    setUnseenTurnCount((current) => current + followState.unseenCount);
  }, [conversationTurns.length]);

  const coachLine = useMemo(() => {
    if (screen === "report" && report) return report.coachCommentZh;
    if (todayDone) return "Latihan hari ini selesai! Kamu bisa latihan lagi untuk meningkatkan ketepatan jawaban.";
    return "Ayo mulai hari ini, selesaikan latihan 5 menit sekarang!";
  }, [report, screen, todayDone]);

  function enterPracticeRoom() {
    setStartError("");
    setScreen("practice");
  }

  function setTranscriptPinned(nextPinned: boolean) {
    transcriptPinnedRef.current = nextPinned;
    setTranscriptPinnedToLatest(nextPinned);
  }

  function scrollTranscriptToLatest(behavior: ScrollBehavior = "smooth") {
    const log = transcriptLogRef.current;
    if (!log) return;
    log.scrollTo({ top: log.scrollHeight, behavior });
    setTranscriptPinned(true);
    setUnseenTurnCount(0);
  }

  function updateTranscriptScrollState() {
    const log = transcriptLogRef.current;
    if (!log) return;
    const followState = getTranscriptFollowState({
      scrollTop: log.scrollTop,
      clientHeight: log.clientHeight,
      scrollHeight: log.scrollHeight,
      newTurnCount: 0
    });
    if (followState.shouldFollow !== transcriptPinnedRef.current) {
      setTranscriptPinned(followState.shouldFollow);
    }
    if (followState.shouldFollow) setUnseenTurnCount(0);
  }

  function startCountdown(initialSeconds: number, sessionId: string) {
    if (countdownRef.current) window.clearInterval(countdownRef.current);
    setRemainingSeconds(initialSeconds);
    countdownRef.current = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          if (countdownRef.current) window.clearInterval(countdownRef.current);
          void endTraining(sessionId);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  }

  function updatePracticeStatusFromPipecat(status: string) {
    if (status === "connecting" || status === "initializing" || status === "authenticating") {
      setPracticeStatus("connecting");
      setCoachState("thinking");
      return;
    }
    if (status === "bot-speaking") {
      setBusy("");
      setPracticeStatus("speaking");
      setCoachState("asking");
      return;
    }
    if (status === "user-speaking" || status === "ready" || status === "bot-ready" || status === "connected") {
      setBusy("");
      setPracticeStatus("listening");
      setCoachState("listening");
    }
  }

  function createTurnKey(speaker: ConversationTurn["speaker"], text: string) {
    return `${speaker}:${text.replace(/\s+/g, " ").trim()}`;
  }

  function seedRecordedTurnKeys(turns: ConversationTurn[]) {
    recordedTurnKeysRef.current = new Set(turns.map((turn) => createTurnKey(turn.speaker, turn.text)));
  }

  function dedupeVoiceTurn(turn: PipecatVoiceTurn) {
    const normalizedText = turn.text.replace(/\s+/g, " ").trim();
    if (!normalizedText) return true;
    const key = createTurnKey(turn.speaker, normalizedText);
    if (recordedTurnKeysRef.current.has(key)) return true;
    recordedTurnKeysRef.current.add(key);
    return false;
  }

  async function recordVoiceTurn(turn: PipecatVoiceTurn, sessionId: string) {
    if (dedupeVoiceTurn(turn)) return;
    const text = turn.text.replace(/\s+/g, " ").trim();
    if (!text) return;
    const result = await api.addSessionTurn(sessionId, {
      speaker: turn.speaker,
      text,
      timestamp: turn.timestamp || new Date().toISOString()
    });
    setPracticeSession(result.session);
    setConversationTurns(result.session.conversation_turns);
    if (turn.speaker === "ai") {
      setLatestAiText(text);
      setPracticeStatus("speaking");
      setCoachState("asking");
      window.setTimeout(() => setPracticeStatus("listening"), 800);
    }
  }

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  /** ID sumber analisis audio untuk lip sync. */
  const lipsyncSourceRef = useRef<string | null>(null);
  /** Penghenti animasi mulut berbasis teks (mode cadangan). */
  const stopVisemeTeksRef = useRef<(() => void) | null>(null);

  /** Menghentikan seluruh sumber suara & lip sync yang sedang berjalan. */
  function hentikanSumberSuara() {
    stopVisemeTeksRef.current?.();
    stopVisemeTeksRef.current = null;
    lepasSumberAudio(lipsyncSourceRef.current);
    lipsyncSourceRef.current = null;
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Cadangan bila audio TTS tidak tersedia: pakai `speechSynthesis` bawaan browser.
   * Teks dinormalisasi lebih dulu (angka -> kata) dan bahasa dideteksi otomatis,
   * lalu gerakan mulut dijalankan dari teks karena audio sistem tidak bisa dianalisis.
   */
  function fallbackSpeechSynthesis(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    const lang = deteksiBahasa(text);
    const teksSiap = lang === "id" ? normalisasiTeksId(text) : normalisasiTeksEn(text);

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(teksSiap);
    utterance.lang = lang === "id" ? "id-ID" : "en-US";
    utterance.rate = 0.95;
    utterance.onstart = () => {
      setPracticeStatus("speaking");
      setCoachState("asking");
      stopVisemeTeksRef.current = mulaiVisemeDariTeks(text);
    };
    utterance.onend = () => {
      stopVisemeTeksRef.current?.();
      stopVisemeTeksRef.current = null;
      setPracticeStatus("listening");
      setCoachState("listening");
    };
    window.speechSynthesis.speak(utterance);
  }

  /** Mengucapkan teks AI memakai TTS (Supertonic secara default) + lip sync. */
  async function speakText(text: string) {
    if (!text.trim()) return;
    try {
      setPracticeStatus("speaking");
      setCoachState("asking");

      hentikanSumberSuara();

      // Panggil TTS backend (default: Supertonic, fleksibel Indonesia & Inggris).
      const res = await api.synthesize(text).catch(() => null);
      if (res && res.audioBase64) {
        const audio = new Audio(`data:audio/${res.format || "mp3"};base64,${res.audioBase64}`);
        audioPlayerRef.current = audio;
        // Sambungkan ke analiser lip sync (aman: gagal -> mulut diam).
        lipsyncSourceRef.current = daftarkanElemenAudio(audio);
        audio.onended = () => {
          lepasSumberAudio(lipsyncSourceRef.current);
          lipsyncSourceRef.current = null;
          setPracticeStatus("listening");
          setCoachState("listening");
        };
        audio.onerror = () => {
          fallbackSpeechSynthesis(text);
        };
        await audio.play();
        return;
      }
    } catch {
      // Kebijakan autoplay atau galat jaringan: lanjut ke cadangan.
    }
    fallbackSpeechSynthesis(text);
  }

  function toggleMic() {
    if (isListeningMic) {
      recognitionRef.current?.stop();
      setIsListeningMic(false);
      return;
    }
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Browser Anda belum mendukung Web Speech Recognition otomatis. Anda tetap dapat mengetik jawaban langsung pada kolom input."
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.onstart = () => setIsListeningMic(true);
      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setUserAnswerText(transcript);
      };
      recognition.onerror = () => setIsListeningMic(false);
      recognition.onend = () => setIsListeningMic(false);
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListeningMic(false);
    }
  }

  async function submitUserTurn(textToSend?: string) {
    const text = (textToSend ?? userAnswerText).trim();
    if (!text || !practiceSession || practiceStatus === "thinking") return;
    setUserAnswerText("");
    setBusy("AI sedang menganalisis jawabanmu...");
    setPracticeStatus("thinking");
    setCoachState("thinking");

    try {
      const userTurnResult = await api.addSessionTurn(practiceSession.id, {
        speaker: "user",
        text,
        timestamp: new Date().toISOString()
      });
      setPracticeSession(userTurnResult.session);
      setConversationTurns(userTurnResult.session.conversation_turns);

      const nextRound = userTurnResult.session.conversation_turns.filter((t) => t.speaker === "user").length;

      const reply = await api.nextTurn({
        sessionId: practiceSession.id,
        scenarioId: scenario.id,
        taskId: task.id,
        scenarioLabel: scenario.nameZh,
        taskTitle: task.titleZh,
        taskFocus: task.focus,
        aiRoleZh: task.aiRoleZh,
        round: nextRound,
        userText: text
      });

      const aiTurnResult = await api.addSessionTurn(practiceSession.id, {
        speaker: "ai",
        text: reply.aiText,
        hintZh: reply.hintZh,
        timestamp: new Date().toISOString()
      });
      setPracticeSession(aiTurnResult.session);
      setConversationTurns(aiTurnResult.session.conversation_turns);
      setLatestAiText(reply.aiText);
      setBusy("");

      void speakText(reply.aiText);
    } catch (err) {
      setBusy("");
      setStartError(err instanceof Error ? err.message : "Gagal memproses jawaban.");
      setPracticeStatus("listening");
      setCoachState("listening");
    }
  }

  async function startConversation() {
    setBusy("Mempersiapkan sesi latihan...");
    setStartError("");
    setConversationTurns([]);
    setLatestAiText("");
    setPracticeSession(null);
    setReport(null);
    setPracticeStatus("connecting");
    setCoachState("thinking");
    recordedTurnKeysRef.current.clear();
    previousTurnCountRef.current = 0;
    setTranscriptPinned(true);
    setUnseenTurnCount(0);

    try {
      await voiceClientRef.current?.disconnect();
      hentikanSumberSuara();
      const started = await api.startSession(
        scenario.id,
        task.id,
        isCustomScenario(scenario) ? scenario : undefined,
        selectedDurationMinutes
      );
      setPracticeSession(started.session);
      setConversationTurns(started.session.conversation_turns);
      seedRecordedTurnKeys(started.session.conversation_turns);
      setLatestAiText(started.aiText);
      setRemainingSeconds(started.remainingSeconds);
      startCountdown(started.remainingSeconds, started.sessionId);

      // Periksa apakah layanan Pipecat (suara real-time) sedang berjalan.
      try {
        await checkPipecatHealth();
        setBusy("Membuka koneksi suara langsung...");
        const client = createPipecatVoiceClient({
          webrtcUrl: createPipecatOfferUrl({
            sessionId: started.sessionId,
            scenarioId: scenario.id,
            taskId: task.id,
            targetGoal: task.focus,
            openingText: started.aiText
          }),
          callbacks: {
            onStatus: updatePracticeStatusFromPipecat,
            onBotAudioStream: (stream: MediaStream) => {
              // Sambungkan audio bot ke lip sync agar mulut 3D ikut bergerak.
              lipsyncSourceRef.current = daftarkanStreamAudio(stream);
            },
            onBotAudioStreamEnded: () => {
              // Audio bot berhenti: hentikan analisis agar mulut kembali diam.
              lepasSumberAudio(lipsyncSourceRef.current);
              lipsyncSourceRef.current = null;
            },
            onTurn: (turn) => {
              void recordVoiceTurn(turn, started.sessionId).catch((error) => {
                setStartError(error instanceof Error ? error.message : "Gagal mencatat percakapan.");
              });
            },
            onError: (message) => {
              setStartError(mapPracticeStartError(new Error(message)));
              setBusy("");
              setPracticeStatus((current) => (current === "connecting" ? "idle" : current));
              setCoachState((current) => (current === "thinking" ? "idle" : current));
            },
            onDisconnected: () => {
              setBusy("");
              setPracticeStatus((current) => (current === "completed" ? current : "ended"));
              setCoachState("reviewing");
            }
          }
        });
        voiceClientRef.current = client;
        await client.connect();
      } catch {
        // Cadangan: pakai TTS backend / speech synthesis browser.
        void speakText(started.aiText);
      }

      setBusy("");
      setPracticeStatus("listening");
      setCoachState("listening");
    } catch (error) {
      setBusy("");
      if (countdownRef.current) window.clearInterval(countdownRef.current);
      await voiceClientRef.current?.disconnect().catch(() => null);
      voiceClientRef.current = null;
      setPracticeStatus("idle");
      setCoachState("idle");
      setStartError(mapPracticeStartError(error));
    }
  }

  async function endTraining(sessionIdOverride?: string) {
    const activeSessionId = sessionIdOverride || practiceSession?.id;
    if (!activeSessionId) return;
    setBusy("Menutup sesi latihan...");
    hentikanSumberSuara();
    recognitionRef.current?.stop();
    setIsListeningMic(false);
    await voiceClientRef.current?.disconnect().catch(() => null);
    voiceClientRef.current = null;
    lepasSemuaSumberAudio();
    if (countdownRef.current) window.clearInterval(countdownRef.current);
    const ended = await api.endSession(activeSessionId).catch(() => null);
    if (ended) setPracticeSession(ended.session);
    setPracticeStatus("ended");
    setCoachState("reviewing");
    setBusy("");
  }

  async function generatePracticeReport() {
    if (!practiceSession) return;
    setBusy("Membuat laporan evaluasi...");
    setCoachState("reviewing");
    setPracticeStatus("thinking");

    const result = await api.generateReport({
      sessionId: practiceSession.id,
      scenarioId: scenario.id,
      taskId: task.id,
      scenarioNameZh: scenario.nameZh,
      taskTitleZh: task.titleZh,
      taskFocus: task.focus,
      conversation_turns: conversationTurns
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
          roundCount: userTurnCount,
          report: result
        })
      )
    );
    setCoachState("celebrating");
    setPracticeStatus("completed");
    setScreen("report");
    setBusy("");
  }

  function applyCustomScenario() {
    const sceneName = customForm.sceneName.trim() || defaultCustomForm.sceneName;
    const taskTitle = customForm.taskTitle.trim() || defaultCustomForm.taskTitle;
    const focus = customForm.focus.trim() || defaultCustomForm.focus;
    const openingQuestion = customForm.openingQuestion.trim() || defaultCustomForm.openingQuestion;
    const nextScenario: Scenario = {
      id: `custom-${Date.now()}`,
      nameZh: sceneName,
      nameEn: "Custom",
      descriptionZh: `Skenario Kustom: ${focus}`,
      tasks: [
        {
          id: "custom-task",
          titleZh: taskTitle,
          titleEn: "Custom practice",
          aiRoleZh: customForm.aiRole.trim() || defaultCustomForm.aiRole,
          focus,
          openingQuestion
        }
      ]
    };
    saveCustomScenario(nextScenario);
    setScenarios((items) => [nextScenario, ...items.filter((item) => item.id !== nextScenario.id)]);
    setScenario(nextScenario);
    setTask(nextScenario.tasks[0]);
  }

  return (
    <>
      <BrandTopBar />
      <nav className="screen-tabs" aria-label="Menu Utama">
        <div className="screen-tabs-inner">
          <div className="screen-tab-list">
            <button
              className={`screen-tab ${screen === "home" ? "active" : ""}`}
              type="button"
              onClick={() => setScreen("home")}
            >
              <Home size={16} aria-hidden="true" />
              Beranda / Home
            </button>
            <button
              className={`screen-tab ${screen === "practice" || screen === "prep" ? "active" : ""}`}
              type="button"
              onClick={() => setScreen(practiceSession ? "practice" : "prep")}
            >
              <Mic size={16} aria-hidden="true" />
              Latihan / Practice
            </button>
            <button
              className={`screen-tab ${screen === "report" ? "active" : ""}`}
              type="button"
              disabled={!report}
              onClick={() => report && setScreen("report")}
            >
              <ClipboardList size={16} aria-hidden="true" />
              Laporan / Report
            </button>
          </div>
          <div className="screen-tab-actions">
            {voiceSummary && (
              <div className="api-pill voice-pill" title={`Mesin suara: ${voiceSummary.provider}`}>
                <Volume2 size={16} />
                {voiceSummary.voice ? `${voiceSummary.voice} · ${voiceSummary.mode}` : voiceSummary.mode}
                {voiceSummary.offline && <span className="pill-warning" aria-hidden="true" />}
              </div>
            )}
            <div className="api-pill">
              <Headphones size={16} />
              {health?.mode === "live" ? "Live API" : "Mock Demo"}
            </div>
            <button className="secondary" onClick={() => setSettingsOpen(true)}>
              <Settings size={16} />
              Pengaturan
            </button>
          </div>
        </div>
      </nav>
      <main className="app-shell">
        <ApiSettingsPanel
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onSaved={(settings) => setHealth(settings)}
        />

        {screen === "home" && (
          <section className="home-screen">
            <div className="home-hero">
              <section className="panel home-task">
                <span className="eyebrow home-teacher-eyebrow">YOUR TEACHER IS LISTENING</span>
                <h2 className="home-task-title just-say-title">
                  <span>
                    Just<span className="accent-dot">.</span>
                  </span>
                  <span>
                    say it<span className="accent-dot">.</span>
                  </span>
                </h2>
                <p className="teacher-support-copy">
                  Tidak perlu menunggu jawaban sempurna.{" "}
                  <strong>
                    Mulailah berbicara dalam bahasa Inggris, AI Coach akan mendengarkan sampai selesai, lalu memberikan
                    evaluasi.
                  </strong>
                </p>
                <div className="goal-box home-soft-target">
                  Target hari ini sederhana: Jelaskan hasil pekerjaan atau proyekmu dengan terstruktur, bahkan dalam 1-2
                  kalimat.
                </div>
                <div className="top-actions">
                  <button className="primary" onClick={enterPracticeRoom}>
                    <Play size={18} />
                    Say it
                  </button>
                  <button className="secondary" onClick={() => setScreen("prep")}>
                    Pilih Topik Lain
                  </button>
                  {report && (
                    <button className="secondary" onClick={() => setScreen("report")}>
                      Lihat Laporan
                    </button>
                  )}
                </div>
                <p className="muted low-pressure-note">
                  Tidak akan dipotong di tengah bicara. Evaluasi pelafalan, tata bahasa, dan kosakata akan dirangkum di
                  laporan akhir.
                </p>
              </section>

              <section className="panel home-coach">
                <div className="home-bubble">Ready for a 5-minute English practice? Let's speak!</div>
                <CoachAvatar state={coachState === "idle" ? "idle" : coachState} size={240} />
              </section>

              <section className="panel home-growth">
                <span className="eyebrow">Progres Belajar</span>
                <div className="streak-headline">
                  <span>Latihan Beruntun</span>
                  <strong>{GROWTH_MOCK.streakDays} Hari</strong>
                </div>
                <div className="spark-status-row" aria-label="Status Semangat">
                  <div className="spark-chip spark-chip-burning">
                    <span className="spark-flame" aria-hidden="true" />
                    <div>
                      <strong>Streak Aktif</strong>
                      <span>Hari ke-{GROWTH_MOCK.streakDays}</span>
                    </div>
                  </div>
                  <div className="spark-chip spark-chip-freeze">
                    <span className="freeze-crystal" aria-hidden="true">
                      <span />
                    </span>
                    <div>
                      <strong>Streak Freeze</strong>
                      <span>1x Tersedia</span>
                    </div>
                  </div>
                </div>
                <div className="week-check-row" aria-label="Progres Latihan Mingguan">
                  {["Sen", "Sel", "Rab"].map((day) => (
                    <span className="done" key={day}>
                      {day}
                    </span>
                  ))}
                  <span className="today">Hari Ini</span>
                  {["Jum", "Sab", "Min"].map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>
                <div className="streak-reward">Pertahankan semangatmu, sudah 3 hari berturut-turut!</div>
                <div className="growth-metrics">
                  <div>
                    <span>Total Latihan</span>
                    <strong>{GROWTH_MOCK.totalMinutes} Menit</strong>
                  </div>
                  <div>
                    <span>Skor Terakhir</span>
                    <strong>{GROWTH_MOCK.lastScore}</strong>
                  </div>
                </div>
                <div className="growth-trail-card">
                  <div>
                    <span className="growth-trail-label">Jejak Perkembangan</span>
                    <strong className="growth-trail-trend">
                      <TrendingUp size={16} aria-hidden="true" />
                      68 → 72 → 76
                    </strong>
                    <p>Sedang diasah: {GROWTH_MOCK.weakAreaZh}</p>
                  </div>
                  <button
                    type="button"
                    className="growth-trail-button"
                    onClick={() => setScreen(report ? "report" : "prep")}
                  >
                    Lihat Progres
                  </button>
                </div>
                <div className="next-target home-next-practice">
                  Latihan Berikutnya: {GROWTH_MOCK.nextPracticeZh}
                  <br />
                  Fokuskan pada "{GROWTH_MOCK.weakAreaZh}", sebutkan hasil nyata lalu sertakan angka.
                </div>
              </section>
            </div>

            <span className="eyebrow section-kicker">Keunggulan Sela Tutor English</span>
            <div className="value-row">
              {VALUE_CARDS.map((value) => {
                const Icon = value.icon;
                return (
                  <div className="value-card" key={value.titleZh}>
                    <div className="value-icon">
                      <Icon size={22} />
                    </div>
                    <strong>{value.titleZh}</strong>
                    <p className="muted">{value.descZh}</p>
                  </div>
                );
              })}
            </div>

            <span className="eyebrow section-kicker">Pilih Skenario Percakapan Nyata</span>
            <div className="scene-grid">
              {scenarios.slice(0, 3).map((item, index) => (
                <button
                  type="button"
                  className={`scene-card scene-tone-${index % 3}`}
                  key={item.id}
                  onClick={() => {
                    setScenario(item);
                    setTask(item.tasks[0]);
                    setScreen("prep");
                  }}
                >
                  <div className="scene-tags">
                    <span>{index === 0 ? "Rekomendasi" : index === 1 ? "Level Pemula" : "Tingkat Lanjut"}</span>
                    <span>{item.tasks[0]?.titleZh}</span>
                  </div>
                  <h3>
                    {item.nameZh} · {item.nameEn}
                  </h3>
                  <div className="scene-meta">
                    Fokus: {item.tasks[0]?.focus}
                    <br />
                    Kemampuan: Struktur Kalimat · Tindak Lanjut Natural · Evaluasi Menyeluruh
                    <br />
                    Format: Sesi 5 Menit · Interaktif & Ramah Pemula
                  </div>
                  <div className="scene-go">Mulai Latihan</div>
                </button>
              ))}
              <button type="button" className="scene-card custom" onClick={() => setScreen("prep")}>
                <div className="plus">+</div>
                <h3>Kustomisasi Skenario</h3>
                <div className="scene-meta">Tentukan peran AI, topik pembicaraan, dan pertanyaan pembuka sendiri</div>
              </button>
            </div>
          </section>
        )}

        {screen === "prep" && (
          <section className="panel prep-panel">
            <div>
              <p className="eyebrow">
                {scenario.nameZh} · {scenario.nameEn}
              </p>
              <h2>Pilih Tugas Skenario / Select Task</h2>
              <p>
                Pelatih akan mendengarkan dengan seksama dan memberikan umpan balik komprehensif setelah sesi berakhir.
              </p>
              <div className="requirement-strip" aria-label="Fitur Utama Latihan">
                <span>Pilihan Skenario</span>
                <span>Percakapan Real-Time</span>
                <span>Analisis Pelafalan</span>
                <span>Koreksi Grammar</span>
                <span>Laporan Akhir</span>
              </div>
              <div className="task-list">
                {scenario.tasks.map((item) => (
                  <button
                    key={item.id}
                    className={`task-card ${task.id === item.id ? "selected" : ""}`}
                    onClick={() => setTask(item)}
                  >
                    <strong>{item.titleZh}</strong>
                    <span>{item.titleEn}</span>
                    <small>
                      {item.aiRoleZh} · {item.focus}
                    </small>
                  </button>
                ))}
              </div>
              <CustomScenarioBuilder form={customForm} onChange={setCustomForm} onApply={applyCustomScenario} />
              <div className="duration-picker" aria-label="Durasi Latihan">
                {[3, 5, 7, 10].map((minutes) => (
                  <button
                    type="button"
                    key={minutes}
                    className={selectedDurationMinutes === minutes ? "active" : ""}
                    onClick={() => setSelectedDurationMinutes(minutes)}
                  >
                    {minutes} Menit
                  </button>
                ))}
              </div>
              <button className="primary" onClick={enterPracticeRoom} disabled={Boolean(busy)}>
                <Sparkles size={18} />
                {busy || "Masuk ke Ruang Latihan"}
              </button>
              {startError && <div className="hint-line">{startError}</div>}
            </div>
            <CoachAvatar state="idle" />
          </section>
        )}

        {screen === "practice" && (
          <>
            <div className="practice-top">
              <span className="practice-chip blue">
                {scenario.nameZh} · {scenario.nameEn}
              </span>
              <span className="practice-chip">Sisa: {formatSeconds(remainingSeconds)}</span>
              <span className="practice-chip">Status: {practiceStatusLabel(practiceStatus)}</span>
              <span className="practice-chip goal">
                <Target size={14} aria-hidden="true" />
                {task.focus}
              </span>
              {voiceSummary && (
                <span className="practice-chip voice">
                  <Languages size={14} aria-hidden="true" />
                  {voiceSummary.mode}
                </span>
              )}
            </div>
            <section className="practice-grid">
              <div className={`stage dialogue-room practice-${practiceStatus}`}>
                <div className="coach-focus">
                  <div className="coach-prompt">
                    {latestAiText ||
                      "Klik 'Mulai Latihan' dan AI Coach akan menyapa serta mengajukan pertanyaan."}
                  </div>
                  <div className="coach-avatar-wrap">
                    <CoachAvatar state={coachState} size={230} />
                  </div>
                  <div className={`coach-state-panel ${startError ? "error" : ""}`} aria-live="polite">
                    <span>{practiceCopy.headline}</span>
                    <p>{practiceCopy.helper}</p>
                  </div>
                </div>

                {practiceSession && practiceStatus !== "ended" && practiceStatus !== "completed" && (
                  <div className="speech-interaction-panel">
                    <form
                      className="speech-input-bar"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void submitUserTurn();
                      }}
                    >
                      <button
                        type="button"
                        className={`mic-toggle-btn ${isListeningMic ? "listening" : ""}`}
                        onClick={toggleMic}
                        title={isListeningMic ? "Klik untuk berhenti merekam" : "Klik untuk bicara dalam bahasa Inggris"}
                      >
                        <Mic size={18} />
                        {isListeningMic ? "Mendengarkan..." : "Bicara (Mic)"}
                      </button>
                      <input
                        type="text"
                        value={userAnswerText}
                        onChange={(e) => setUserAnswerText(e.target.value)}
                        placeholder="Bicara lewat mic atau ketik jawaban dalam bahasa Inggris..."
                        disabled={practiceStatus === "thinking"}
                      />
                      <button
                        type="submit"
                        className="send-answer-btn"
                        disabled={!userAnswerText.trim() || practiceStatus === "thinking"}
                      >
                        <Send size={16} />
                        Kirim
                      </button>
                    </form>

                    <div className="quick-prompts-row">
                      <span className="quick-prompts-label">Contoh Jawaban / Quick Responses:</span>
                      <div className="quick-prompts-chips">
                        {[
                          "In my last project, I built a web application that improved team productivity by 35%.",
                          "My primary responsibility was designing the system architecture and integrating the AI API.",
                          "We solved the main challenge by optimizing database queries, reducing latency by 40%."
                        ].map((prompt, i) => (
                          <button
                            key={i}
                            type="button"
                            className="quick-prompt-chip"
                            onClick={() => void submitUserTurn(prompt)}
                            disabled={practiceStatus === "thinking"}
                          >
                            "{prompt}"
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="voice-primary-controls" aria-label="Kontrol Latihan">
                  <button
                    className={`${
                      practiceStatus === "idle" || practiceStatus === "completed" ? "primary" : "secondary"
                    } wide`}
                    onClick={startConversation}
                    disabled={Boolean(busy) || (practiceStatus !== "idle" && practiceStatus !== "completed")}
                  >
                    <Play size={18} />
                    Mulai Latihan
                  </button>
                  <button
                    className="danger wide"
                    onClick={() => void endTraining()}
                    disabled={
                      !practiceSession || practiceStatus === "ended" || practiceStatus === "completed" || Boolean(busy)
                    }
                  >
                    <Square size={17} />
                    Selesaikan Latihan
                  </button>
                  <button
                    className={`${practiceStatus === "ended" ? "primary" : "secondary"} wide`}
                    onClick={generatePracticeReport}
                    disabled={!practiceSession || practiceStatus !== "ended" || Boolean(busy)}
                  >
                    <Sparkles size={17} />
                    Buat Laporan
                  </button>
                </div>
              </div>

              <aside className="practice-side voice-log-side" aria-label="Transkrip Percakapan Real-Time">
                <div className="voice-log-header">
                  <div>
                    <span className="eyebrow">Transkrip Percakapan Real-Time</span>
                    <p>
                      {conversationTurns.length > 0
                        ? `${conversationTurns.length} pesan · ${
                            transcriptPinnedToLatest ? "Mengikuti pesan terbaru" : "Melihat riwayat"
                          }`
                        : "Setiap kalimat Anda dan AI akan tercatat otomatis di sini"}
                    </p>
                  </div>
                  <span
                    className={`voice-log-live ${
                      practiceStatus === "listening" || practiceStatus === "speaking" ? "active" : ""
                    }`}
                  >
                    <MessageCircle size={15} />
                    Live
                  </span>
                </div>
                <div
                  className="caption-stream voice-only-log"
                  ref={transcriptLogRef}
                  onScroll={updateTranscriptScrollState}
                  aria-live="polite"
                >
                  {conversationTurns.length === 0 ? (
                    <div className="caption-line system">
                      <span>Siap / Ready</span>
                      <p>
                        Mulai latihan untuk berbicara dengan AI Coach. Setiap kalimat Anda dan respon AI akan tercatat di
                        sini secara otomatis.
                      </p>
                    </div>
                  ) : (
                    conversationTurns.map((turn, index) => (
                      <div
                        className={`caption-line ${turn.speaker} ${
                          index === conversationTurns.length - 1 ? "latest" : ""
                        }`}
                        key={turn.id}
                      >
                        <div className="caption-meta">
                          <span>
                            {turn.speaker === "ai" ? "AI Coach" : turn.speaker === "user" ? "You (Anda)" : "System"}
                          </span>
                          <small>{formatTurnTime(turn.timestamp)}</small>
                        </div>
                        <p>{turn.text}</p>
                      </div>
                    ))
                  )}
                </div>
                {unseenTurnCount > 0 && (
                  <button type="button" className="transcript-follow-button" onClick={() => scrollTranscriptToLatest()}>
                    <ArrowDown size={16} />
                    {unseenTurnCount} pesan baru
                  </button>
                )}
              </aside>
            </section>
          </>
        )}

        {screen === "report" && report && (
          <ReportDashboard
            report={report}
            conversationTurns={conversationTurns}
            scenario={scenario}
            targetGoal={task.focus}
            onChangeTask={() => setScreen("prep")}
            onPracticeAgain={enterPracticeRoom}
          />
        )}
      </main>
    </>
  );
}

function isCustomScenario(scenario: Scenario) {
  return scenario.id.startsWith("custom-") || scenario.id.startsWith("custom_");
}

function formatSeconds(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatTurnTime(value: string) {
  return new Date(value).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function createJourneySteps({
  screen,
  busy,
  turnCount,
  hasReport
}: {
  screen: Screen;
  busy: string;
  turnCount: number;
  hasReport: boolean;
}): JourneyStep[] {
  const inPractice = screen === "practice";
  const reportActive = busy.toLowerCase().includes("laporan") || busy.toLowerCase().includes("report");

  return [
    {
      label: "Target Skenario",
      detail: "Wawancara / Rapat / Restoran / Kustom",
      status: screen === "home" ? "active" : "done"
    },
    {
      label: "Percakapan Suara Real-Time",
      detail: "AI Coach mendengarkan responmu lalu merespon secara alami",
      status: hasReport || turnCount > 0 ? "done" : inPractice ? "active" : "waiting"
    },
    {
      label: "Analisis Pelafalan",
      detail: "Seluruh percakapan dianalisis dalam evaluasi 7 dimensi",
      status: hasReport || turnCount > 0 ? "done" : busy.includes("voice") ? "active" : "waiting"
    },
    {
      label: "Koreksi Grammar & Kosakata",
      detail: "Umpan balik ringan saat latihan, ringkasan menyeluruh di laporan",
      status: hasReport ? "done" : turnCount > 0 ? "active" : "waiting"
    },
    {
      label: "Laporan Akhir & Panduan Belajar",
      detail: "Skor 7 dimensi, rekomendasi ekspresi, dan target latihan berikutnya",
      status: hasReport ? "done" : reportActive ? "active" : "waiting"
    }
  ];
}

export function LearningJourneyCard({
  checkin,
  latestRecord,
  scenario,
  task,
  steps,
  summary
}: {
  checkin: CheckinState;
  latestRecord: LearningState["records"][number] | null;
  scenario: Scenario;
  task: Scenario["tasks"][number];
  steps: JourneyStep[];
  summary: ReturnType<typeof summarizeLearning>;
}) {
  return (
    <aside className="panel stats-panel learning-journey-card">
      <div className="journey-header">
        <div>
          <p className="eyebrow">Learning Track</p>
          <h3>Pelacakan Perkembangan Belajar</h3>
        </div>
        <Route size={24} />
      </div>
      <div className="journey-metrics">
        <Metric icon={<CalendarDays size={18} />} value={`${checkin.currentStreak} Hari`} label="Latihan Beruntun" />
        <Metric icon={<Award size={18} />} value={summary.latestScore ?? "--"} label="Skor Terakhir" />
        <Metric icon={<BarChart3 size={18} />} value={summary.averageScore ?? "--"} label="Rata-rata" />
      </div>
      <div className="active-goal">
        <span>Target Aktif</span>
        <strong>
          {scenario.nameZh} · {task.titleZh}
        </strong>
        <small>{task.focus}</small>
      </div>
      <FlowTracker steps={steps} compact />
      <div className="journey-note">
        <strong>
          {latestRecord
            ? `Latihan Terakhir: ${latestRecord.scenarioNameZh} (${latestRecord.score} poin)`
            : "Selesaikan 1 sesi untuk melihat grafik pertumbuhan"}
        </strong>
        <span>Fokus Perbaikan: {summary.priorityDimension}</span>
      </div>
      <WeekDots checkin={checkin} />
    </aside>
  );
}

function Metric({ icon, value, label }: { icon: ReactNode; value: number | string; label: string }) {
  return (
    <div className="metric">
      {icon}
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function FlowTracker({ steps, compact = false }: { steps: JourneyStep[]; compact?: boolean }) {
  return (
    <ol className={`flow-tracker ${compact ? "compact" : ""}`}>
      {steps.map((step) => (
        <li key={step.label} className={step.status}>
          <span className="flow-dot" />
          <div>
            <strong>{step.label}</strong>
            <small>{step.detail}</small>
          </div>
        </li>
      ))}
    </ol>
  );
}

function CustomScenarioBuilder({
  form,
  onChange,
  onApply
}: {
  form: CustomScenarioForm;
  onChange: (form: CustomScenarioForm) => void;
  onApply: () => void;
}) {
  function update(field: keyof CustomScenarioForm, value: string) {
    onChange({ ...form, [field]: value });
  }

  return (
    <section className="custom-scenario-box" aria-label="Kustomisasi Skenario Latihan">
      <div className="custom-scenario-header">
        <div>
          <p className="eyebrow">Custom Scene</p>
          <h3>Rancang Skenario Latihan Mandiri</h3>
        </div>
        <PencilLine size={22} />
      </div>
      <div className="custom-form-grid">
        <label>
          Nama Skenario (Scene Name)
          <input value={form.sceneName} onChange={(event) => update("sceneName", event.target.value)} />
        </label>
        <label>
          Peran AI (AI Role)
          <input value={form.aiRole} onChange={(event) => update("aiRole", event.target.value)} />
        </label>
        <label>
          Judul Tugas (Task Title)
          <input value={form.taskTitle} onChange={(event) => update("taskTitle", event.target.value)} />
        </label>
        <label>
          Fokus Latihan (Focus)
          <input value={form.focus} onChange={(event) => update("focus", event.target.value)} />
        </label>
        <label className="custom-question">
          Pertanyaan Pembuka (Opening Question)
          <input value={form.openingQuestion} onChange={(event) => update("openingQuestion", event.target.value)} />
        </label>
      </div>
      <button className="secondary" type="button" onClick={onApply}>
        <Target size={18} />
        Terapkan Skenario Ini / Use This Scenario
      </button>
    </section>
  );
}

export function LearningHistoryPanel({
  state,
  summary
}: {
  state: LearningState;
  summary: ReturnType<typeof summarizeLearning>;
}) {
  const recent = state.records.slice(0, 3);

  return (
    <div className="panel learning-history-panel">
      <p className="eyebrow">Growth Trail</p>
      <h3>Perkembangan Kemampuan Berbicara</h3>
      <div className="history-metrics">
        <Metric icon={<Sparkles size={18} />} value={summary.totalSessions} label="Total Laporan" />
        <Metric icon={<BarChart3 size={18} />} value={summary.strongestDimension} label="Kekuatan Utama" />
        <Metric icon={<Target size={18} />} value={summary.priorityDimension} label="Fokus Berikutnya" />
      </div>
      <div className="history-list">
        {recent.map((record) => (
          <article key={record.reportId}>
            <strong>
              {record.scenarioNameZh} · {record.taskTitleZh}
            </strong>
            <span>
              {record.score} Poin / {record.roundCount} Respon / {record.correctionCount} Koreksi
            </span>
            <small>{record.nextGoal}</small>
          </article>
        ))}
      </div>
    </div>
  );
}
