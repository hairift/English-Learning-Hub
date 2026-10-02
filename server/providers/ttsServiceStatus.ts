/**
 * ttsServiceStatus.ts — pemantau status layanan TTS Supertonic (sidecar Python).
 *
 * Modul ini menyimpan hasil pemeriksaan terakhir (di-cache) supaya endpoint
 * `/api/health` bisa melaporkan status layanan TTS tanpa memblokir permintaan.
 */

export type StatusLayananTts = {
  /** URL dasar layanan TTS. */
  baseUrl: string;
  /** True bila layanan merespons dan mesin Supertonic siap. */
  tersedia: boolean;
  /** True bila layanan hidup tapi model Supertonic belum siap. */
  hidup: boolean;
  /** Pesan detail/kesalahan terakhir. */
  detail: string | null;
  /** Suara default yang dilaporkan layanan. */
  suaraDefault: string | null;
  /** Daftar suara yang tersedia di layanan. */
  daftarSuara: string[];
  /** Waktu (ms) pemeriksaan terakhir. */
  diperiksaPada: number;
};

/** Status awal sebelum pemeriksaan pertama dijalankan. */
let statusTerakhir: StatusLayananTts = {
  baseUrl: "",
  tersedia: false,
  hidup: false,
  detail: null,
  suaraDefault: null,
  daftarSuara: [],
  diperiksaPada: 0
};

/** Lama cache status (ms) supaya tidak memanggil layanan terlalu sering. */
const MASA_BERLAKU_MS = 15_000;

export function ambilStatusLayananTts(): StatusLayananTts {
  return statusTerakhir;
}

export function perbaruiStatusLayananTts(patch: Partial<StatusLayananTts>) {
  statusTerakhir = { ...statusTerakhir, ...patch, diperiksaPada: Date.now() };
  return statusTerakhir;
}

/** True bila cache sudah kedaluwarsa dan perlu diperiksa ulang. */
export function perluPeriksaUlang() {
  return Date.now() - statusTerakhir.diperiksaPada > MASA_BERLAKU_MS;
}

/**
 * Memeriksa kesehatan layanan TTS Supertonic.
 * Tidak melempar galat: kegagalan hanya menghasilkan status "tidak tersedia".
 */
export async function periksaLayananTts(baseUrl: string): Promise<StatusLayananTts> {
  const urlDasar = baseUrl.replace(/\/+$/, "");
  try {
    const respons = await fetch(`${urlDasar}/health`, { signal: AbortSignal.timeout(2500) });
    if (!respons.ok) {
      return perbaruiStatusLayananTts({
        baseUrl: urlDasar,
        tersedia: false,
        hidup: false,
        detail: `HTTP ${respons.status}`
      });
    }

    const data = (await respons.json()) as {
      ready?: boolean;
      defaultVoice?: string;
      voices?: string[];
      detail?: string | null;
    };

    return perbaruiStatusLayananTts({
      baseUrl: urlDasar,
      tersedia: Boolean(data.ready),
      hidup: true,
      detail: data.detail ?? null,
      suaraDefault: data.defaultVoice ?? null,
      daftarSuara: Array.isArray(data.voices) ? data.voices : []
    });
  } catch (error) {
    return perbaruiStatusLayananTts({
      baseUrl: urlDasar,
      tersedia: false,
      hidup: false,
      detail: error instanceof Error ? error.message : "layanan TTS tidak dapat dihubungi"
    });
  }
}
