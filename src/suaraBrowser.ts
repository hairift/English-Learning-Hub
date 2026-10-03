/**
 * suaraBrowser.ts — pembungkus `speechSynthesis` bawaan browser.
 *
 * Peran modul ini adalah menjadi jalur cadangan yang BENAR-BENAR andal ketika
 * layanan TTS utama (Supertonic) tidak tersedia. Sebelumnya jalur ini rapuh:
 *
 * - Suara tidak dipilih berdasarkan bahasa, sehingga browser bisa memilih suara
 *   yang salah (atau tidak bersuara sama sekali).
 * - Gerakan mulut avatar bergantung pada kejadian `onstart`, padahal browser
 *   tidak selalu memicunya (mis. saat belum ada suara yang terpasang).
 * - Tidak ada batas waktu, sehingga percakapan bisa "menggantung" selamanya
 *   bila `onend` tidak pernah datang.
 *
 * Modul ini memperbaiki ketiganya: pemilihan suara cerdas, gerakan mulut yang
 * langsung berjalan tanpa menunggu `onstart`, sinkronisasi lewat `onboundary`,
 * dan pengaman waktu yang memastikan alur percakapan selalu lanjut.
 */

import { mulaiGerakMulut, perkirakanDurasiUcapanMs, type KendaliMulut } from "./lipsync/gerakMulut";

/** Daftar suara yang tersedia di browser (di-cache). */
let daftarSuara: SpeechSynthesisVoice[] = [];
let pendengarSuaraTerpasang = false;

/** Nama suara yang diprioritaskan untuk tiap bahasa (huruf kecil). */
const PRIORITAS_SUARA: Record<"id" | "en", string[]> = {
  id: [
    "google bahasa indonesia",
    "google indonesia",
    "microsoft gadis",
    "microsoft andika",
    "damayanti",
    "andika",
    "gadis"
  ],
  en: [
    "google us english",
    "google uk english female",
    "microsoft aria",
    "microsoft jenny",
    "samantha",
    "microsoft zira",
    "google uk english male"
  ]
};

/** Kode bahasa yang dicari untuk tiap bahasa aplikasi. */
const KODE_BAHASA: Record<"id" | "en", string[]> = {
  id: ["id-id", "id"],
  en: ["en-us", "en-gb", "en-au", "en"]
};

/** Ambil daftar suara, sekaligus pasang pendengar `voiceschanged` sekali saja. */
export function ambilDaftarSuara(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  const sekarang = window.speechSynthesis.getVoices();
  if (sekarang.length > 0) daftarSuara = sekarang;

  if (!pendengarSuaraTerpasang) {
    pendengarSuaraTerpasang = true;
    // Chrome memuat daftar suara secara asinkron.
    window.speechSynthesis.addEventListener?.("voiceschanged", () => {
      daftarSuara = window.speechSynthesis.getVoices();
    });
  }
  return daftarSuara;
}

/** True bila browser punya mesin suara sama sekali. */
export function browserPunyaSuara(): boolean {
  return ambilDaftarSuara().length > 0;
}

/**
 * Pilih suara terbaik untuk bahasa tertentu.
 *
 * Urutan penilaian: kecocokan kode bahasa dinilai paling tinggi, lalu nama
 * yang ada di daftar prioritas, lalu suara non-lokal (biasanya lebih natural).
 */
export function pilihSuaraTerbaik(lang: "id" | "en"): SpeechSynthesisVoice | null {
  const daftar = ambilDaftarSuara();
  if (daftar.length === 0) return null;

  const kode = KODE_BAHASA[lang];
  const prioritas = PRIORITAS_SUARA[lang];

  let terbaik: SpeechSynthesisVoice | null = null;
  let skorTerbaik = -1;

  for (const suara of daftar) {
    const nama = (suara.name || "").toLowerCase();
    const kodeSuara = (suara.lang || "").toLowerCase().replace("_", "-");

    let skor = 0;
    if (kodeSuara === kode[0]) skor += 100;
    else if (kode.some((k) => kodeSuara.startsWith(k))) skor += 70;
    else continue; // Bahasa tidak cocok: jangan dipakai sama sekali.

    const indeksPrioritas = prioritas.findIndex((namaPrioritas) => nama.includes(namaPrioritas));
    if (indeksPrioritas >= 0) skor += 40 - indeksPrioritas * 3;
    if (nama.includes("natural") || nama.includes("online")) skor += 12;
    if (!suara.localService) skor += 6;
    if (suara.default) skor += 2;

    if (skor > skorTerbaik) {
      skorTerbaik = skor;
      terbaik = suara;
    }
  }

  return terbaik;
}

export type OpsiUcapBrowser = {
  /** Teks asli (dipakai untuk menyusun gerakan mulut). */
  teks: string;
  /** Teks siap ucap (sudah dinormalisasi angka/singkatan). */
  teksUcap: string;
  /** Bahasa yang dipakai. */
  lang: "id" | "en";
  /** Kecepatan bicara (1 = normal). */
  rate?: number;
  /** Dipanggil saat suara mulai terdengar (atau saat pengaman waktu aktif). */
  onMulai?: () => void;
  /** Dipanggil tepat sekali saat ucapan selesai / dibatalkan pengaman. */
  onSelesai?: () => void;
};

/** Kendali ucapan yang dikembalikan ke pemanggil. */
export type KendaliUcapBrowser = {
  /** Hentikan ucapan tanpa memicu `onSelesai`. */
  batalkan: () => void;
};

/**
 * Ucapkan teks memakai suara bawaan browser + gerakan mulut yang selalu hidup.
 *
 * Gerakan mulut dimulai SEGERA (tidak menunggu `onstart`) supaya avatar tidak
 * pernah tampak "bisu" meski browser lambat memicu kejadiannya.
 */
export function ucapkanDenganBrowser(opsi: OpsiUcapBrowser): KendaliUcapBrowser {
  const { teks, teksUcap, lang, rate = 0.95 } = opsi;

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

  // Gerakan mulut langsung berjalan dari teks.
  mulut = mulaiGerakMulut(teks, { durasiMs: perkirakanDurasiUcapanMs(teks) / Math.max(0.6, rate) });
  opsi.onMulai?.();

  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    // Tidak ada mesin suara: tetap selesaikan setelah perkiraan durasi agar
    // alur percakapan tidak menggantung.
    timerPengaman = globalThis.setTimeout(selesaikan, perkirakanDurasiUcapanMs(teks) + 600);
    return { batalkan: () => { selesai = true; bersihkan(); } };
  }

  const mesin = window.speechSynthesis;
  mesin.cancel();

  const utterance = new SpeechSynthesisUtterance(teksUcap);
  utterance.lang = lang === "id" ? "id-ID" : "en-US";
  utterance.rate = rate;
  utterance.pitch = 1;

  const suara = pilihSuaraTerbaik(lang);
  if (suara) utterance.voice = suara;

  // Sinkronkan gerakan mulut ke kata yang sedang diucapkan.
  utterance.onboundary = (kejadian: SpeechSynthesisEvent) => {
    if (typeof kejadian.charIndex === "number") mulut?.lompatKeKarakter(kejadian.charIndex);
  };

  utterance.onend = () => selesaikan();
  utterance.onerror = () => selesaikan();

  // Pengaman: bila browser tidak pernah memicu `onend` (mis. suara hilang di
  // tengah jalan), paksa selesai setelah perkiraan durasi + kelonggaran.
  const perkiraan = perkirakanDurasiUcapanMs(teks) / Math.max(0.6, rate);
  timerPengaman = setTimeout(selesaikan, perkiraan * 1.5 + 2500);

  try {
    mesin.speak(utterance);
  } catch {
    selesaikan();
  }

  return {
    batalkan: () => {
      selesai = true;
      try {
        mesin.cancel();
      } catch {
        // Menghentikan ucapan yang sudah mati bukan masalah.
      }
      bersihkan();
    }
  };
}
