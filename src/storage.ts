import {
  applyPracticeCompletion,
  createEmptyCheckinState,
  getShanghaiDate,
  type CheckinState
} from "./domain/checkin";
import {
  addLearningRecord,
  createEmptyLearningState,
  type LearningRecord,
  type LearningState
} from "./domain/learning";
import type { Scenario } from "../server/data";
import {
  buatGamifikasiKosong,
  normalkanGamifikasi,
  tambahXp,
  type GamifikasiState
} from "./domain/gamifikasi";
import {
  buatProgresKosong,
  catatLevelSelesai,
  normalkanProgres,
  type ProgresJalur
} from "./domain/progresJalur";
import { normalkanSrs, type KartuSrs } from "./domain/srs";
import type { HasilPenempatan } from "./domain/srs";

const KEY = "ai-speaking-coach-checkin";
const LEARNING_KEY = "ai-speaking-coach-learning";
const CUSTOM_SCENARIOS_KEY = "ai-speaking-coach-custom-scenarios";
const ASR_LANGUAGE_KEY = "sela-asr-language";
const JALUR_KEY = "sela-jalur-belajar";
const GAMIFIKASI_KEY = "sela-gamifikasi";
const SRS_KEY = "sela-srs";
const PENEMPATAN_KEY = "sela-placement";

/**
 * Bahasa pengenalan suara (ASR) yang dipilih pengguna.
 *
 * `auto` berarti aplikasi memilih sendiri dan menyesuaikan antar sesi rekaman
 * (lihat `mulaiMikrofon`), karena Web Speech API tidak bisa mendeteksi bahasa
 * secara langsung dalam satu sesi.
 */
export type BahasaAsr = "auto" | "id-ID" | "en-US";

export function loadBahasaAsr(): BahasaAsr {
  try {
    const raw = localStorage.getItem(ASR_LANGUAGE_KEY);
    if (raw === "id-ID" || raw === "en-US" || raw === "auto") return raw;
  } catch {
    // Penyimpanan tidak tersedia (mode privat): pakai nilai default.
  }
  return "auto";
}

export function saveBahasaAsr(nilai: BahasaAsr) {
  try {
    localStorage.setItem(ASR_LANGUAGE_KEY, nilai);
  } catch {
    // Penyimpanan tidak tersedia (mode privat): abaikan dengan aman.
  }
}

export function loadCheckin(): CheckinState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...createEmptyCheckinState(), ...JSON.parse(raw) } : createEmptyCheckinState();
  } catch {
    return createEmptyCheckinState();
  }
}

export function saveCheckin(state: CheckinState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function completeToday(score: number, reportId: string, now = new Date()) {
  const next = applyPracticeCompletion(loadCheckin(), {
    date: getShanghaiDate(now),
    score,
    reportId
  });
  saveCheckin(next);
  return next;
}

export function loadLearning(): LearningState {
  try {
    const raw = localStorage.getItem(LEARNING_KEY);
    return raw ? { ...createEmptyLearningState(), ...JSON.parse(raw) } : createEmptyLearningState();
  } catch {
    return createEmptyLearningState();
  }
}

export function saveLearning(state: LearningState) {
  localStorage.setItem(LEARNING_KEY, JSON.stringify(state));
}

export function recordLearning(record: LearningRecord) {
  const next = addLearningRecord(loadLearning(), record);
  saveLearning(next);
  return next;
}

export function loadCustomScenarios(): Scenario[] {
  try {
    const raw = localStorage.getItem(CUSTOM_SCENARIOS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isScenarioLike) : [];
  } catch {
    return [];
  }
}

export function saveCustomScenario(scenario: Scenario) {
  const existing = loadCustomScenarios().filter((item) => item.id !== scenario.id);
  const next = [scenario, ...existing].slice(0, 6);
  localStorage.setItem(CUSTOM_SCENARIOS_KEY, JSON.stringify(next));
  return next;
}

function isScenarioLike(value: unknown): value is Scenario {
  if (!value || typeof value !== "object") return false;
  const item = value as Scenario;
  return Boolean(
    item.id &&
      item.nameZh &&
      item.nameEn &&
      item.descriptionZh &&
      Array.isArray(item.tasks) &&
      item.tasks[0]?.id &&
      item.tasks[0]?.openingQuestion
  );
}

/* ===================== JALUR BELAJAR (jalur + gamifikasi) ===================== */

/** Baca kemajuan jalur belajar (level mana yang sudah lulus). */
export function loadJalur(): ProgresJalur {
  try {
    const raw = localStorage.getItem(JALUR_KEY);
    return raw ? normalkanProgres(JSON.parse(raw)) : buatProgresKosong();
  } catch {
    return buatProgresKosong();
  }
}

export function saveJalur(state: ProgresJalur) {
  try {
    localStorage.setItem(JALUR_KEY, JSON.stringify(state));
  } catch {
    // Penyimpanan tidak tersedia (mode privat): abaikan dengan aman.
  }
}

/** Catat penyelesaian sebuah level, lalu perbarui XP & rentetan sekaligus. */
export function selesaikanLevel(masukan: {
  idLevel: string;
  benar: number;
  total: number;
  xp: number;
}): { jalur: ProgresJalur; gamifikasi: GamifikasiState } {
  const jalur = catatLevelSelesai(loadJalur(), masukan);
  saveJalur(jalur);
  const gamifikasi = tambahXp(loadGamifikasi(), masukan.xp);
  saveGamifikasi(gamifikasi);
  return { jalur, gamifikasi };
}

/** Baca keadaan gamifikasi (XP, rentetan, liga, nyawa). */
export function loadGamifikasi(): GamifikasiState {
  try {
    const raw = localStorage.getItem(GAMIFIKASI_KEY);
    return raw ? normalkanGamifikasi(JSON.parse(raw)) : buatGamifikasiKosong();
  } catch {
    return buatGamifikasiKosong();
  }
}

export function saveGamifikasi(state: GamifikasiState) {
  try {
    localStorage.setItem(GAMIFIKASI_KEY, JSON.stringify(state));
  } catch {
    // Penyimpanan tidak tersedia (mode privat): abaikan dengan aman.
  }
}

/** Tambahkan XP saja (mis. setelah sesi percakapan dengan tutor suara). */
export function tambahXpSaja(jumlahXp: number): GamifikasiState {
  const next = tambahXp(loadGamifikasi(), jumlahXp);
  saveGamifikasi(next);
  return next;
}

/* ============================ SRS & PLACEMENT ============================ */

export function loadSrs(): KartuSrs[] {
  try {
    const raw = localStorage.getItem(SRS_KEY);
    return raw ? normalkanSrs(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function saveSrs(kartu: KartuSrs[]) {
  try {
    localStorage.setItem(SRS_KEY, JSON.stringify(kartu));
  } catch {
    // Penyimpanan tidak tersedia (mode privat): abaikan dengan aman.
  }
}

/** Hasil placement test yang sudah disimpan. */
export interface PenempatanTersimpan {
  hasil: HasilPenempatan;
  dikerjakanPada: string;
}

export function loadPenempatan(): PenempatanTersimpan | null {
  try {
    const raw = localStorage.getItem(PENEMPATAN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PenempatanTersimpan;
    if (!parsed?.hasil?.tingkat) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function savePenempatan(hasil: HasilPenempatan) {
  try {
    const data: PenempatanTersimpan = { hasil, dikerjakanPada: new Date().toISOString() };
    localStorage.setItem(PENEMPATAN_KEY, JSON.stringify(data));
  } catch {
    // Penyimpanan tidak tersedia (mode privat): abaikan dengan aman.
  }
}
