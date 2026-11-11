/**
 * suaraBrowser.ts - Mesin sintesis suara (Web Speech API) alami yang mendukung
 * pemilihan suara berdasarkan bahasa (Inggris / Indonesia) dan gender karakter
 * (perempuan / laki-laki), lengkap dengan sinkronisasi gerak mulut.
 */

import { mulaiGerakMulut, perkirakanDurasiUcapanMs, type KendaliMulut } from "./lipsync/gerakMulut";

export type GenderSuara = "perempuan" | "laki";

let daftarSuara: SpeechSynthesisVoice[] = [];
let pendengarSuaraTerpasang = false;

const PRIORITAS_SUARA_PEREMPUAN: Record<"id" | "en", string[]> = {
  id: [
    "microsoft gadis online (natural)",
    "microsoft gadis",
    "google bahasa indonesia",
    "gadis",
    "damayanti",
    "damayanti indonesian"
  ],
  en: [
    "microsoft aria online (natural)",
    "microsoft jenny online (natural)",
    "microsoft sonia online (natural)",
    "microsoft michelle online (natural)",
    "google us english",
    "google uk english female",
    "microsoft aria",
    "microsoft jenny",
    "microsoft zira",
    "samantha",
    "karen",
    "victoria"
  ]
};

const PRIORITAS_SUARA_LAKI: Record<"id" | "en", string[]> = {
  id: [
    "microsoft ardi online (natural)",
    "microsoft ardi",
    "ardi",
    "google bahasa indonesia"
  ],
  en: [
    "microsoft guy online (natural)",
    "microsoft christopher online (natural)",
    "microsoft ryan online (natural)",
    "microsoft andrew online (natural)",
    "microsoft brian online (natural)",
    "google uk english male",
    "microsoft guy",
    "microsoft christopher",
    "microsoft david",
    "microsoft mark",
    "daniel",
    "alex",
    "james"
  ]
};

const PENANDA_PEREMPUAN = [
  "female", "woman", "gadis", "damayanti", "aria", "jenny",
  "zira", "samantha", "michelle", "sonia", "siti", "dewi", "putri",
  "wanita", "perempuan", "karen", "victoria", "clara"
];

const PENANDA_LAKI = [
  "male", "man", "david", "mark", "george", "james", "daniel", "alex",
  "fred", "rishi", "arif", "budi", "ardi", "guy", "christopher", "ryan",
  "andrew", "brian", "eric", "steffan", "roger"
];

const KODE_BAHASA: Record<"id" | "en", string[]> = {
  id: ["id-id", "id"],
  en: ["en-us", "en-gb", "en-au", "en"]
};

/** Ambil daftar suara dari browser dan pasang pendengar perubahan suara. */
export function ambilDaftarSuara(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  const sekarang = window.speechSynthesis.getVoices();
  if (sekarang.length > 0) daftarSuara = sekarang;

  if (!pendengarSuaraTerpasang) {
    pendengarSuaraTerpasang = true;
    window.speechSynthesis.addEventListener?.("voiceschanged", () => {
      daftarSuara = window.speechSynthesis.getVoices();
    });
  }
  return daftarSuara;
}

/** Periksa apakah browser memiliki daftar suara yang siap dipakai. */
export function browserPunyaSuara(): boolean {
  return ambilDaftarSuara().length > 0;
}

/**
 * Pilih suara paling natural sesuai bahasa dan gender karakter.
 */
export function pilihSuaraTerbaik(
  lang: "id" | "en",
  gender: GenderSuara = "perempuan"
): SpeechSynthesisVoice | null {
  const daftar = ambilDaftarSuara();
  if (daftar.length === 0) return null;

  const kode = KODE_BAHASA[lang];
  const prioritas = gender === "laki" ? PRIORITAS_SUARA_LAKI[lang] : PRIORITAS_SUARA_PEREMPUAN[lang];
  const penandaCocok = gender === "laki" ? PENANDA_LAKI : PENANDA_PEREMPUAN;
  const penandaLawan = gender === "laki" ? PENANDA_PEREMPUAN : PENANDA_LAKI;

  let terbaik: SpeechSynthesisVoice | null = null;
  let skorTerbaik = -999;

  for (const suara of daftar) {
    const nama = (suara.name || "").toLowerCase();
    const kodeSuara = (suara.lang || "").toLowerCase().replace("_", "-");

    let skor = 0;
    if (kodeSuara === kode[0]) skor += 100;
    else if (kode.some((k) => kodeSuara.startsWith(k))) skor += 75;
    else continue;

    const indeksPrioritas = prioritas.findIndex((namaPrioritas) => nama.includes(namaPrioritas));
    if (indeksPrioritas >= 0) skor += 55 - indeksPrioritas * 3;
    if (penandaCocok.some((penanda) => nama.includes(penanda))) skor += 28;
    if (penandaLawan.some((penanda) => nama.includes(penanda))) skor -= 40;
    if (nama.includes("natural") || nama.includes("neural") || nama.includes("online")) skor += 20;
    if (!suara.localService) skor += 8;
    if (suara.default) skor += 2;

    if (skor > skorTerbaik) {
      skorTerbaik = skor;
      terbaik = suara;
    }
  }

  return terbaik;
}

/** Daftar suara yang tersedia untuk sebuah bahasa, diurutkan dari yang paling natural. */
export function daftarSuaraUntukBahasa(lang: "id" | "en"): SpeechSynthesisVoice[] {
  const kode = KODE_BAHASA[lang];
  return ambilDaftarSuara()
    .filter((suara) => {
      const kodeSuara = (suara.lang || "").toLowerCase().replace("_", "-");
      return kode.some((k) => kodeSuara.startsWith(k));
    })
    .sort((a, b) => {
      const namaA = (a.name || "").toLowerCase();
      const namaB = (b.name || "").toLowerCase();
      const peringkat = (nama: string) =>
        (nama.includes("natural") ? -2 : 0) +
        (PENANDA_PEREMPUAN.some((penanda) => nama.includes(penanda)) ? -1 : 0);
      return peringkat(namaA) - peringkat(namaB) || a.name.localeCompare(b.name);
    });
}

/** Tunggu hingga browser memuat daftar suara secara asinkron. */
export function tungguDaftarSuara(batasMs = 2500): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return Promise.resolve([]);
  }

  const mesin = window.speechSynthesis;
  const langsung = ambilDaftarSuara();
  if (langsung.length > 0) return Promise.resolve(langsung);

  return new Promise((selesai) => {
    let tuntas = false;
    const akhiri = () => {
      if (tuntas) return;
      tuntas = true;
      mesin.removeEventListener?.("voiceschanged", akhiri);
      clearTimeout(batas);
      selesai(ambilDaftarSuara());
    };
    const batas = setTimeout(akhiri, batasMs);
    mesin.addEventListener?.("voiceschanged", akhiri);
    try {
      mesin.getVoices();
    } catch {
      // Abaikan bila gagal memuat suara awal.
    }
  });
}

export type OpsiUcapBrowser = {
  teks: string;
  teksUcap: string;
  lang: "id" | "en";
  gender?: GenderSuara;
  rate?: number;
  pitch?: number;
  suara?: SpeechSynthesisVoice | null;
  onMulai?: () => void;
  onSelesai?: () => void;
};

export type KendaliUcapBrowser = {
  batalkan: () => void;
};

/**
 * Ucapkan teks menggunakan speechSynthesis browser sesuai bahasa dan gender karakter.
 */
export function ucapkanDenganBrowser(opsi: OpsiUcapBrowser): KendaliUcapBrowser {
  const gender = opsi.gender ?? "perempuan";
  const rate = opsi.rate ?? (opsi.lang === "en" ? 0.94 : 0.98);
  const pitchDefault = gender === "laki" ? 0.88 : 1.04;
  const pitch = opsi.pitch ?? pitchDefault;
  const { teks, teksUcap, lang } = opsi;

  let selesai = false;
  let timerPengaman: ReturnType<typeof setTimeout> | null = null;
  let mulut: KendaliMulut | null = null;

  const bersihkan = () => {
    if (timerPengaman !== null) {
      clearTimeout(timerPengaman);
      timerPengaman = null;
    }
    mulut?.hentikan();
    mulut = null;
  };

  const selesaikan = () => {
    if (selesai) return;
    selesai = true;
    bersihkan();
    opsi.onSelesai?.();
  };

  mulut = mulaiGerakMulut(teks, { durasiMs: perkirakanDurasiUcapanMs(teks) / Math.max(0.55, rate) });
  opsi.onMulai?.();

  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    timerPengaman = globalThis.setTimeout(selesaikan, perkirakanDurasiUcapanMs(teks) + 600);
    return { batalkan: () => { selesai = true; bersihkan(); } };
  }

  const mesin = window.speechSynthesis;
  mesin.cancel();

  const utterance = new SpeechSynthesisUtterance(teksUcap);
  utterance.lang = lang === "id" ? "id-ID" : "en-US";
  utterance.rate = rate;
  utterance.pitch = pitch;
  utterance.volume = 1;

  const suara = opsi.suara ?? pilihSuaraTerbaik(lang, gender);
  if (suara) {
    utterance.voice = suara;
    utterance.lang = suara.lang || utterance.lang;
  }

  let pengawasJeda: ReturnType<typeof setInterval> | null = null;
  const hentikanPengawas = () => {
    if (pengawasJeda !== null) {
      clearInterval(pengawasJeda);
      pengawasJeda = null;
    }
  };

  utterance.onboundary = (kejadian: SpeechSynthesisEvent) => {
    if (typeof kejadian.charIndex === "number") mulut?.lompatKeKarakter(kejadian.charIndex);
  };

  utterance.onend = () => {
    hentikanPengawas();
    selesaikan();
  };
  utterance.onerror = () => {
    hentikanPengawas();
    selesaikan();
  };

  const perkiraan = perkirakanDurasiUcapanMs(teks) / Math.max(0.55, rate);
  timerPengaman = setTimeout(() => {
    hentikanPengawas();
    selesaikan();
  }, perkiraan * 1.5 + 2500);

  try {
    mesin.speak(utterance);
    pengawasJeda = setInterval(() => {
      if (selesai) {
        hentikanPengawas();
        return;
      }
      if (mesin.paused) mesin.resume();
    }, 5000);
  } catch {
    hentikanPengawas();
    selesaikan();
  }

  return {
    batalkan: () => {
      selesai = true;
      hentikanPengawas();
      try {
        mesin.cancel();
      } catch {
        // Abaikan bila sudah berhenti.
      }
      bersihkan();
    }
  };
}

let kendaliAktif: KendaliUcapBrowser | null = null;

export interface OpsiUcapRingkas {
  lang?: "id" | "en";
  gender?: GenderSuara;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
}

/**
 * Fungsi pembantu ringkas untuk membacakan teks bahasa Inggris/Indonesia
 * di kuis, kartu kosakata, buku panduan, dan laboratorium bunyi.
 */
export function ucapkan(teks: string, opsi: OpsiUcapRingkas = {}): KendaliUcapBrowser {
  kendaliAktif?.batalkan();
  const kendali = ucapkanDenganBrowser({
    teks,
    teksUcap: teks,
    lang: opsi.lang ?? "en",
    gender: opsi.gender ?? "perempuan",
    rate: opsi.rate,
    pitch: opsi.pitch,
    onMulai: opsi.onStart,
    onSelesai: opsi.onEnd
  });
  kendaliAktif = kendali;
  return kendali;
}

/** Hentikan suara yang sedang diputar di browser. */
export function bersihkanSuara(): void {
  kendaliAktif?.batalkan();
  kendaliAktif = null;
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Abaikan bila gagal membatalkan.
    }
  }
}
