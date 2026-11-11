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
  NYAVA_MAKS,
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
import { normalkanSrs, type KartuSrs, type HasilPenempatan } from "./domain/srs";
import {
  buatDiagnostikKosong,
  buatProfilDefault,
  catatHasilSpeaking,
  catatPercobaanKuis,
  normalkanDiagnostik,
  normalkanProfil,
  type DataDiagnostikRiset,
  type KategoriKemampuan,
  type ProfilMahasiswa
} from "./domain/diagnostikRiset";

const KEY = "ai-speaking-coach-checkin";
const LEARNING_KEY = "ai-speaking-coach-learning";
const CUSTOM_SCENARIOS_KEY = "ai-speaking-coach-custom-scenarios";
const ASR_LANGUAGE_KEY = "sela-asr-language";
const JALUR_KEY = "sela-jalur-belajar";
const GAMIFIKASI_KEY = "sela-gamifikasi";
const SRS_KEY = "sela-srs";
const PENEMPATAN_KEY = "sela-placement";
const DIAGNOSTIK_KEY = "sela-diagnostik-riset";
const PROFIL_KEY = "sela-profil-mahasiswa";
const TEMA_KEY = "sela-tema-tampilan";

export type BahasaAsr = "auto" | "id-ID" | "en-US";
export type TemaTampilan = "dark" | "light";

export function loadTema(): TemaTampilan {
  try {
    const raw = localStorage.getItem(TEMA_KEY);
    if (raw === "light" || raw === "dark") return raw;
  } catch {
    // Penyimpanan lokal tidak tersedia
  }
  return "dark";
}

export function saveTema(tema: TemaTampilan) {
  try {
    localStorage.setItem(TEMA_KEY, tema);
  } catch {
    // Abaikan jika mode privat
  }
}

export function loadBahasaAsr(): BahasaAsr {
  try {
    const raw = localStorage.getItem(ASR_LANGUAGE_KEY);
    if (raw === "id-ID" || raw === "en-US" || raw === "auto") return raw;
  } catch {
    // Abaikan jika mode privat
  }
  return "auto";
}

export function saveBahasaAsr(nilai: BahasaAsr) {
  try {
    localStorage.setItem(ASR_LANGUAGE_KEY, nilai);
  } catch {
    // Abaikan jika mode privat
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
    // Abaikan jika penyimpanan lokal penuh atau privat
  }
}

export function selesaikanLevel(masukan: {
  idLevel: string;
  benar: number;
  total: number;
  xp: number;
}): { jalur: ProgresJalur; gamifikasi: GamifikasiState } {
  const jalur = catatLevelSelesai(loadJalur(), masukan);
  saveJalur(jalur);
  const gamifikasiSekarang = loadGamifikasi();
  const bonusPermata = masukan.benar === masukan.total ? 15 : 8;
  const gamifikasi = {
    ...tambahXp(gamifikasiSekarang, masukan.xp),
    permata: (gamifikasiSekarang.permata ?? 500) + bonusPermata
  };
  saveGamifikasi(gamifikasi);
  return { jalur, gamifikasi };
}

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
    // Abaikan jika penyimpanan lokal tidak tersedia
  }
}

export function tambahXpSaja(jumlahXp: number): GamifikasiState {
  const next = tambahXp(loadGamifikasi(), jumlahXp);
  saveGamifikasi(next);
  return next;
}

export function bukaPetiUnit(idPeti: string, hadiahPermata = 25): GamifikasiState {
  const sekarang = loadGamifikasi();
  const daftarPeti = sekarang.petiDibuka ?? [];
  if (daftarPeti.includes(idPeti)) return sekarang;
  const baru: GamifikasiState = {
    ...sekarang,
    permata: (sekarang.permata ?? 250) + hadiahPermata,
    petiDibuka: [...daftarPeti, idPeti]
  };
  saveGamifikasi(baru);
  return baru;
}

export function beliIsiNyawa(hargaPermata = 100): { berhasil: boolean; state: GamifikasiState } {
  const sekarang = loadGamifikasi();
  const saldoPermata = sekarang.permata ?? 250;
  if (saldoPermata < hargaPermata || sekarang.nyawa >= NYAVA_MAKS) {
    return { berhasil: false, state: sekarang };
  }
  const baru: GamifikasiState = {
    ...sekarang,
    permata: saldoPermata - hargaPermata,
    nyawa: NYAVA_MAKS,
    nyawaBerkurangPada: null
  };
  saveGamifikasi(baru);
  return { berhasil: true, state: baru };
}

export function beliPelindungRentetan(hargaPermata = 150): { berhasil: boolean; state: GamifikasiState } {
  const sekarang = loadGamifikasi();
  const saldoPermata = sekarang.permata ?? 250;
  if (saldoPermata < hargaPermata || sekarang.pelindungRentetan >= 3) {
    return { berhasil: false, state: sekarang };
  }
  const baru: GamifikasiState = {
    ...sekarang,
    permata: saldoPermata - hargaPermata,
    pelindungRentetan: sekarang.pelindungRentetan + 1
  };
  saveGamifikasi(baru);
  return { berhasil: true, state: baru };
}

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
    // Abaikan jika mode privat
  }
}

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
    // Abaikan jika mode privat
  }
}

export function loadDiagnostik(): DataDiagnostikRiset {
  try {
    const raw = localStorage.getItem(DIAGNOSTIK_KEY);
    return raw ? normalkanDiagnostik(JSON.parse(raw)) : buatDiagnostikKosong();
  } catch {
    return buatDiagnostikKosong();
  }
}

export function saveDiagnostik(data: DataDiagnostikRiset) {
  try {
    localStorage.setItem(DIAGNOSTIK_KEY, JSON.stringify(data));
  } catch {
    // Abaikan jika mode privat
  }
}

export function simpanPercobaanKuis(masukan: {
  kategori: KategoriKemampuan;
  benar: boolean;
  pertanyaan: string;
  jawabanPengguna: string;
  jawabanBenar: string;
}): DataDiagnostikRiset {
  const baru = catatPercobaanKuis(loadDiagnostik(), masukan);
  saveDiagnostik(baru);
  return baru;
}

export function simpanDiagnostikSpeaking(masukan: {
  skorSpeaking: number;
  skorGrammar: number;
  skorListening: number;
  skorKosakata: number;
}): DataDiagnostikRiset {
  const baru = catatHasilSpeaking(loadDiagnostik(), masukan);
  saveDiagnostik(baru);
  return baru;
}

export function loadProfil(): ProfilMahasiswa {
  try {
    const raw = localStorage.getItem(PROFIL_KEY);
    return raw ? normalkanProfil(JSON.parse(raw)) : buatProfilDefault();
  } catch {
    return buatProfilDefault();
  }
}

export function saveProfil(profil: ProfilMahasiswa) {
  try {
    localStorage.setItem(PROFIL_KEY, JSON.stringify(profil));
  } catch {
    // Abaikan jika mode privat
  }
}
