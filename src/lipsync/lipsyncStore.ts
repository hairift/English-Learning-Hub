/**
 * lipsyncStore.ts — penyimpan state lip sync (sinkronisasi bibir) global.
 *
 * Store ini adalah "jembatan" antara mesin audio dan komponen avatar 3D.
 * Siapa pun boleh menulis nilai viseme (mis. analiser audio atau pembuat
 * viseme dari teks), dan komponen avatar hanya perlu berlangganan (subscribe).
 *
 * Referensi pendekatan: wawa-lipsync (https://github.com/wass08/wawa-lipsync)
 * yang menganalisis amplitudo audio lalu memetakannya ke bentuk mulut.
 * Di sini kita tingkatkan: dari sekadar "buka-tutup" menjadi 5 viseme
 * (a, i, u, e, o) karena model GLB Sela sudah punya morph target tersebut.
 */

/** Bobot lima viseme vokal. Nilai 0..1. */
export type BobotViseme = {
  a: number;
  i: number;
  u: number;
  e: number;
  o: number;
};

/** State lengkap lip sync. */
export type StateLipsync = {
  /** Bobot tiap viseme vokal. */
  viseme: BobotViseme;
  /** Tingkat kebukaan mulut 0..1 (dipakai untuk morph jaw). */
  kebukaan: number;
  /** True saat avatar sedang bersuara. */
  bersuara: boolean;
  /** True saat avatar berkedip. */
  berkedip: boolean;
  /** Sumber sinyal: 'audio' | 'teks' | 'idle'. */
  sumber: "audio" | "teks" | "idle";
};

/** State awal: mulut tertutup. */
const STATE_AWAL: StateLipsync = {
  viseme: { a: 0, i: 0, u: 0, e: 0, o: 0 },
  kebukaan: 0,
  bersuara: false,
  berkedip: false,
  sumber: "idle"
};

let state: StateLipsync = STATE_AWAL;
const pendengar = new Set<(s: StateLipsync) => void>();

/** Ambil snapshot state saat ini (dipakai React `useSyncExternalStore`). */
export function ambilStateLipsync(): StateLipsync {
  return state;
}

/** Berlangganan perubahan state. Mengembalikan fungsi berhenti berlangganan. */
export function langgananLipsync(listener: (s: StateLipsync) => void) {
  pendengar.add(listener);
  return () => {
    pendengar.delete(listener);
  };
}

/** Perbarui state lip sync dan beri tahu seluruh pendengar. */
export function perbaruiLipsync(patch: Partial<StateLipsync>) {
  const berikutnya: StateLipsync = { ...state, ...patch };

  // Lewati pembaruan bila perubahannya sangat kecil (hemat render).
  const selisih =
    Math.abs(berikutnya.kebukaan - state.kebukaan) +
    Math.abs(berikutnya.viseme.a - state.viseme.a) +
    Math.abs(berikutnya.viseme.i - state.viseme.i) +
    Math.abs(berikutnya.viseme.u - state.viseme.u) +
    Math.abs(berikutnya.viseme.e - state.viseme.e) +
    Math.abs(berikutnya.viseme.o - state.viseme.o);
  const statusBerubah =
    berikutnya.bersuara !== state.bersuara ||
    berikutnya.sumber !== state.sumber ||
    berikutnya.berkedip !== state.berkedip;

  if (selisih < 0.004 && !statusBerubah) return;

  state = berikutnya;
  pendengar.forEach((listener) => listener(state));
}

/** Kembalikan mulut ke posisi diam. */
export function setelLipsyncDiam() {
  perbaruiLipsync({ ...STATE_AWAL });
}

/** Paksa kondisi kedip (dipakai animasi idle agar avatar terlihat hidup). */
export function kedipkanMata(nilai: boolean) {
  perbaruiLipsync({ berkedip: nilai });
}

/**
 * Kait diagnostik (opt-in, tidak aktif secara default).
 *
 * Bila `window.__SELA_DEBUG__ = true` diset SEBELUM aplikasi dimuat, state lip
 * sync dipaparkan lewat `window.__selaLipsync()` supaya bisa diperiksa otomatis
 * — misalnya oleh skrip verifikasi browser yang memastikan mulut avatar benar
 * benar bergerak saat Sela berbicara. Pada pemakaian normal tidak ada efek apa pun.
 */
declare global {
  interface Window {
    __SELA_DEBUG__?: boolean;
    __selaLipsync?: () => StateLipsync;
  }
}

if (typeof window !== "undefined" && window.__SELA_DEBUG__) {
  window.__selaLipsync = ambilStateLipsync;
}
