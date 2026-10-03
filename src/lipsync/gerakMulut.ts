/**
 * gerakMulut.ts — penggerak gerakan mulut prosedural (jalur cadangan utama).
 *
 * Kenapa berkas ini ada?
 * ----------------------
 * Lip sync berbasis analisis audio (`audioAnalyser.ts`) hanya bisa bekerja
 * bila suara coach benar-benar lewat elemen `<audio>` yang bisa disadap Web
 * Audio API. Kenyataannya ada dua kondisi yang membuat jalur itu mati:
 *
 * 1. Suara dihasilkan `speechSynthesis` bawaan browser (audio sistem) —
 *    audio ini TIDAK bisa disadap sama sekali oleh Web Audio API.
 * 2. Layanan TTS (Supertonic) sedang tidak aktif sehingga aplikasi jatuh ke
 *    jalur cadangan di atas.
 *
 * Akibatnya mulut avatar tidak bergerak sama sekali. Modul ini menutup celah
 * tersebut: ia menghasilkan gerakan mulut dari TEKS yang sedang diucapkan,
 * lalu tetap berjalan selama coach bicara.
 *
 * Prioritas kendali (agar tidak berebut):
 * - Bila analiser audio sedang membaca sinyal nyata (`kekuatanAudioSekarang()`
 *   di atas ambang), modul ini diam dan membiarkan audio yang mengatur mulut
 *   sehingga hasilnya tetap akurat secara fonetik.
 * - Bila tidak ada sinyal (atau tidak ada elemen audio sama sekali), modul ini
 *   yang menggerakkan mulut.
 *
 * Sinkronisasi tambahan: saat memakai `speechSynthesis`, kejadian `onboundary`
 * memberi tahu indeks karakter yang sedang diucapkan. Pemanggil bisa memanggil
 * `lompatKeKarakter()` agar gerakan mulut menempel pada kata yang benar-benar
 * sedang diucapkan, bukan sekadar perkiraan waktu.
 */

import { AMBANG_AUDIO_BERSUARA, kekuatanAudioSekarang } from "./audioAnalyser";
import { perbaruiLipsync, setelLipsyncDiam, type BobotViseme } from "./lipsyncStore";

/** Durasi satu huruf (ms) bila durasi total ucapan tidak diketahui. */
const DURASI_HURUF_MS = 74;

/** Durasi minimum agar mulut tidak berkedip terlalu cepat. */
const DURASI_MINIMUM_MS = 500;

/** Faktor pelembutan gerakan (0..1). */
const PELEMBUT = 0.34;

/**
 * Bobot viseme untuk setiap kelas huruf.
 *
 * Dasarnya adalah bentuk mulut saat mengucapkan huruf tersebut:
 * - vokal terbuka (a)   -> mulut lebar
 * - vokal sempit (i/u)  -> mulut menyempit
 * - konsonan bilabial (m, b, p) -> bibir menutup rapat
 * - konsonan lain       -> sedikit terbuka sebagai bentuk netral
 */
function visemeHuruf(huruf: string): BobotViseme {
  switch (huruf) {
    case "a":
      return { a: 0.94, i: 0.03, u: 0.03, e: 0.12, o: 0.16 };
    case "i":
    case "y":
      return { a: 0.12, i: 0.88, u: 0.05, e: 0.18, o: 0.03 };
    case "u":
    case "w":
      return { a: 0.06, i: 0.06, u: 0.9, e: 0.04, o: 0.32 };
    case "e":
      return { a: 0.24, i: 0.12, u: 0.04, e: 0.86, o: 0.08 };
    case "o":
      return { a: 0.26, i: 0.03, u: 0.26, e: 0.06, o: 0.88 };
    case "m":
    case "b":
    case "p":
      // Bibir menutup: hampir tidak ada bukaan.
      return { a: 0.02, i: 0.02, u: 0.02, e: 0.03, o: 0.03 };
    case "f":
    case "v":
      return { a: 0.06, i: 0.12, u: 0.03, e: 0.14, o: 0.05 };
    case " ":
      return { a: 0, i: 0, u: 0, e: 0, o: 0 };
    default:
      return { a: 0.18, i: 0.05, u: 0.06, e: 0.24, o: 0.09 };
  }
}

/** Satu potongan gerakan mulut beserta durasinya. */
export type BingkaiMulut = {
  viseme: BobotViseme;
  durasiMs: number;
};

/**
 * Menyusun rangkaian bingkai gerakan mulut dari teks.
 *
 * Tanda baca diberi jeda lebih panjang supaya mulut ikut "berhenti" saat
 * pembicara mengambil napas — detail kecil yang membuat gerakan terasa wajar.
 *
 * Diekspor agar bisa diuji langsung tanpa perlu menjalankan animasi.
 */
export function susunBingkaiMulut(teks: string, durasiTotalMs: number): BingkaiMulut[] {
  const bersih = teks.toLowerCase().replace(/[^a-z\s.,!?;:]/g, "");

  // Teks tanpa huruf (mis. hanya spasi atau tanda baca): cukup satu bingkai
  // netral, jangan sampai menghasilkan deretan bingkai kosong.
  if (!bersih.trim()) {
    return [{ viseme: visemeHuruf("a"), durasiMs: DURASI_MINIMUM_MS }];
  }

  const huruf = bersih.split("");

  const bobot: number[] = huruf.map((karakter) => {
    if (karakter === " ") return 1.5;
    if (/[.,!?;:]/.test(karakter)) return 2.6;
    if (/[aiueo]/.test(karakter)) return 1.25;
    return 1;
  });
  const totalBobot = bobot.reduce((jumlah, nilai) => jumlah + nilai, 0);

  return huruf.map((karakter, indeks) => ({
    viseme: visemeHuruf(karakter),
    durasiMs: (durasiTotalMs * bobot[indeks]) / totalBobot
  }));
}

/** Mencampur dua bobot viseme (untuk interpolasi halus antar huruf). */
function campurViseme(dari: BobotViseme, ke: BobotViseme, rasio: number): BobotViseme {
  const t = Math.max(0, Math.min(1, rasio));
  return {
    a: dari.a + (ke.a - dari.a) * t,
    i: dari.i + (ke.i - dari.i) * t,
    u: dari.u + (ke.u - dari.u) * t,
    e: dari.e + (ke.e - dari.e) * t,
    o: dari.o + (ke.o - dari.o) * t
  };
}

/** Perkiraan durasi ucapan (ms) dari panjang teks — sekitar 2,6 kata/detik. */
export function perkirakanDurasiUcapanMs(teks: string): number {
  const jumlahKata = teks.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(DURASI_MINIMUM_MS, (jumlahKata / 2.6) * 1000);
}

/** Kendali gerakan mulut yang dikembalikan ke pemanggil. */
export type KendaliMulut = {
  /** Hentikan gerakan dan tutup mulut. */
  hentikan: () => void;
  /**
   * Selaraskan gerakan ke indeks karakter tertentu.
   * Dipakai dari kejadian `onboundary` milik `speechSynthesis`.
   */
  lompatKeKarakter: (indeks: number) => void;
  /** Ubah perkiraan durasi (mis. setelah audio TTS diketahui panjangnya). */
  setelDurasi: (durasiMs: number) => void;
};

/** Opsi tambahan penggerak gerak mulut. */
export type OpsiGerakMulut = {
  /** Perkiraan durasi ucapan (ms). */
  durasiMs?: number;
  /**
   * Predikat "elemen audio TTS sedang diputar?".
   *
   * Bila true, penggerak prosedural menyerahkan kendali kepada analiser audio.
   * Namun bila tidak ada sinyal nyata selama `TOLERANSI_TANPA_SINYAL_MS`,
   * penggerak mengambil alih kembali — ini yang menjaga mulut tetap bergerak
   * saat audio berjalan tetapi tidak bisa dianalisis (mis. dekode gagal).
   */
  audioAktif?: () => boolean;
};

/** Lama menunggu sinyal audio sebelum penggerak prosedural mengambil alih. */
const TOLERANSI_TANPA_SINYAL_MS = 600;

/**
 * Mulai menggerakkan mulut untuk teks tertentu.
 *
 * @param teks  Teks yang sedang diucapkan coach.
 * @param opsi  Opsi durasi & predikat status audio.
 * @returns Kendali untuk menyetop / menyelaraskan gerakan.
 */
export function mulaiGerakMulut(teks: string, opsi: OpsiGerakMulut = {}): KendaliMulut {
  let durasiTotal = Math.max(DURASI_MINIMUM_MS, opsi.durasiMs ?? perkirakanDurasiUcapanMs(teks));
  let bingkai = susunBingkaiMulut(teks, durasiTotal);

  let indeksBingkai = 0;
  let waktuMulai = typeof performance !== "undefined" ? performance.now() : Date.now();
  let idAnimasi: number | null = null;
  let dihentikan = false;
  let waktuTerakhirSinyal = 0;

  /** Viseme yang sedang ditampilkan (agar gerakan tidak bergetar). */
  let visemeSekarang: BobotViseme = { a: 0, i: 0, u: 0, e: 0, o: 0 };

  const hitungWaktu = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

  /** Geser `waktuMulai` supaya bingkai ke-`indeks` tepat dimulai sekarang. */
  function setelWaktuKeIndeks(indeks: number) {
    let akumulasi = 0;
    for (let i = 0; i < indeks && i < bingkai.length; i += 1) akumulasi += bingkai[i].durasiMs;
    waktuMulai = hitungWaktu() - akumulasi;
  }

  function langkah() {
    if (dihentikan) return;

    const sekarang = hitungWaktu();
    const adaSinyal = kekuatanAudioSekarang() > AMBANG_AUDIO_BERSUARA;
    if (adaSinyal) waktuTerakhirSinyal = sekarang;

    // Audio TTS sedang berbunyi dan bisa dianalisis: biarkan analiser yang
    // menggerakkan mulut (hasilnya lebih akurat secara fonetik).
    const audioMenguasai =
      (opsi.audioAktif?.() ?? false) && (adaSinyal || sekarang - waktuTerakhirSinyal < TOLERANSI_TANPA_SINYAL_MS);

    if (audioMenguasai) {
      idAnimasi = requestAnimationFrame(langkah);
      return;
    }

    const berlalu = sekarang - waktuMulai;

    // Majukan indeks sesuai waktu berjalan.
    let akumulasi = 0;
    let indeks = 0;
    for (; indeks < bingkai.length; indeks += 1) {
      akumulasi += bingkai[indeks].durasiMs;
      if (berlalu < akumulasi) break;
    }

    // Ucapan dianggap selesai: mulut perlahan menutup lalu berhenti.
    if (indeks >= bingkai.length) {
      visemeSekarang = campurViseme(visemeSekarang, { a: 0, i: 0, u: 0, e: 0, o: 0 }, PELEMBUT);
      perbaruiLipsync({
        viseme: { ...visemeSekarang },
        kebukaan: Math.max(...Object.values(visemeSekarang)),
        bersuara: false,
        sumber: "teks"
      });
      idAnimasi = requestAnimationFrame(langkah);
      return;
    }

    indeksBingkai = indeks;
    const durasiBingkai = bingkai[indeks].durasiMs || DURASI_HURUF_MS;
    const sebelumBingkai = akumulasi - durasiBingkai;
    const rasio = Math.max(0, Math.min(1, (berlalu - sebelumBingkai) / durasiBingkai));

    const bingkaiBerikut = bingkai[Math.min(indeks + 1, bingkai.length - 1)];
    const target = campurViseme(bingkai[indeks].viseme, bingkaiBerikut.viseme, rasio * 0.6);

    visemeSekarang = campurViseme(visemeSekarang, target, PELEMBUT);

    perbaruiLipsync({
      viseme: { ...visemeSekarang },
      kebukaan: Math.max(...Object.values(visemeSekarang)),
      bersuara: true,
      sumber: "teks"
    });

    idAnimasi = requestAnimationFrame(langkah);
  }

  if (typeof requestAnimationFrame === "function") {
    idAnimasi = requestAnimationFrame(langkah);
  }

  return {
    hentikan() {
      dihentikan = true;
      if (idAnimasi !== null) {
        cancelAnimationFrame(idAnimasi);
        idAnimasi = null;
      }
      setelLipsyncDiam();
    },
    lompatKeKarakter(indeks: number) {
      if (bingkai.length === 0) return;
      const dibatasi = Math.max(0, Math.min(bingkai.length - 1, indeks));
      indeksBingkai = dibatasi;
      setelWaktuKeIndeks(dibatasi);
    },
    setelDurasi(durasiMs: number) {
      durasiTotal = Math.max(DURASI_MINIMUM_MS, durasiMs);
      const posisiSekarang = indeksBingkai;
      bingkai = susunBingkaiMulut(teks, durasiTotal);
      setelWaktuKeIndeks(Math.min(posisiSekarang, bingkai.length - 1));
    }
  };
}
