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

/**
 * Nama suara yang diprioritaskan untuk tiap bahasa (huruf kecil).
 *
 * Daftar ini disusun **perempuan lebih dulu**, karena tutor aplikasi ini
 * perempuan dan suaranya harus konsisten antar-perangkat. Nama-nama ini adalah
 * suara bawaan sistem yang paling luas ketersediaannya:
 * - `microsoft gadis` / `damayanti` / `andika` → Windows & Android Indonesia
 * - `google bahasa indonesia` → Chrome Indonesia
 * - `microsoft aria` / `jenny` / `zira` / `samantha` → suara perempuan Inggris
 */
const PRIORITAS_SUARA: Record<"id" | "en", string[]> = {
  id: [
    "google bahasa indonesia",
    "microsoft gadis",
    "gadis",
    "damayanti",
    "damayanti indonesian",
    "microsoft andika",
    "andika"
  ],
  en: [
    "google us english",
    "microsoft aria",
    "microsoft jenny",
    "microsoft zira",
    "samantha",
    "google uk english female",
    "microsoft michelle",
    "microsoft sonia"
  ]
};

/**
 * Penanda nama yang biasanya berarti suara perempuan.
 * Dipakai sebagai sinyal tambahan, bukan penentu tunggal.
 */
const PENANDA_PEREMPUAN = [
  "female", "woman", "gadis", "damayanti", "andika", "aria", "jenny",
  "zira", "samantha", "michelle", "sonia", "siti", "dewi", "putri",
  "wanita", "perempuan"
];

/**
 * Penanda nama yang biasanya berarti suara laki-laki.
 * Dipakai untuk MENGHINDARI suara ini, bukan untuk memilihnya.
 */
const PENANDA_LAKI = [
  "male", "man", "david", "mark", "george", "james", "daniel", "alex",
  "fred", "rishi", "arif", "budi"
];

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
 * Urutan penilaian: kecocokan kode bahasa dinilai paling tinggi, lalu nama yang
 * ada di daftar prioritas, lalu sinyal "suara perempuan", lalu suara non-lokal
 * (biasanya lebih natural karena dirender di server).
 *
 * Suara laki-laki diberi penalti besar supaya tutor tetap bersuara perempuan
 * konsisten di semua perangkat.
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
    if (PENANDA_PEREMPUAN.some((penanda) => nama.includes(penanda))) skor += 18;
    if (PENANDA_LAKI.some((penanda) => nama.includes(penanda))) skor -= 30;
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

/**
 * Daftar suara yang tersedia untuk sebuah bahasa, terurut dari yang terbaik.
 * Dipakai panel pengaturan (khusus developer) untuk memilih suara manual.
 */
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
        (PENANDA_PEREMPUAN.some((penanda) => nama.includes(penanda)) ? -1 : 0) +
        (PENANDA_LAKI.some((penanda) => nama.includes(penanda)) ? 1 : 0);
      return peringkat(namaA) - peringkat(namaB) || a.name.localeCompare(b.name);
    });
}

/**
 * Tunggu sampai browser selesai memuat daftar suara.
 *
 * Chrome mengisi daftar suara secara ASINKRON: `getVoices()` sering
 * mengembalikan array kosong pada panggilan pertama, lalu terisi setelah
 * kejadian `voiceschanged`. Tanpa menunggu, aplikasi akan menyimpulkan "tidak
 * ada suara" dan jatuh ke jalur tanpa suara.
 */
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
    // Beberapa peramban hanya mengisi daftar setelah `speak()` dipanggil sekali.
    try {
      mesin.getVoices();
    } catch {
      // Abaikan: bukan kegagalan fatal.
    }
  });
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
  /** Nada suara (1 = normal). Sedikit lebih tinggi membuat suara terdengar lebih ramah. */
  pitch?: number;
  /** Panggil paksa suara tertentu (dipakai saat pengguna memilih suara sendiri). */
  suara?: SpeechSynthesisVoice | null;
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
  const { teks, teksUcap, lang, rate = 0.95, pitch = 1.05 } = opsi;

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
  utterance.pitch = pitch;
  utterance.volume = 1;

  const suara = opsi.suara ?? pilihSuaraTerbaik(lang);
  if (suara) {
    utterance.voice = suara;
    // Selaraskan kode bahasa dengan suara yang benar-benar dipakai. Bila tidak,
    // sebagian peramban mengabaikan `voice` dan jatuh ke suara bawaan.
    utterance.lang = suara.lang || utterance.lang;
  }

  // Chrome punya bug lama: ucapan panjang kadang terpotong di tengah karena
  // mesin mengira sudah selesai. Memanggil `resume()` berkala menjaganya hidup.
  let pengawasJeda: ReturnType<typeof setInterval> | null = null;
  const hentikanPengawas = () => {
    if (pengawasJeda !== null) {
      clearInterval(pengawasJeda);
      pengawasJeda = null;
    }
  };

  // Sinkronkan gerakan mulut ke kata yang sedang diucapkan.
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

  // Pengaman: bila browser tidak pernah memicu `onend` (mis. suara hilang di
  // tengah jalan), paksa selesai setelah perkiraan durasi + kelonggaran.
  const perkiraan = perkirakanDurasiUcapanMs(teks) / Math.max(0.6, rate);
  timerPengaman = setTimeout(() => {
    hentikanPengawas();
    selesaikan();
  }, perkiraan * 1.5 + 2500);

  try {
    mesin.speak(utterance);
    // Jaga ucapan tetap berjalan (lihat catatan bug Chrome di atas).
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
        // Menghentikan ucapan yang sudah mati bukan masalah.
      }
      bersihkan();
    }
  };
}
