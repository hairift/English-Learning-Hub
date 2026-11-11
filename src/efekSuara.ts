/**
 * efekSuara.ts - Efek suara antarmuka berbasis Web Audio API untuk kuis dan gamifikasi.
 */

let konteksEfek: AudioContext | null = null;

function ambilKonteks(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const KelasAudio =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!KelasAudio) return null;
  if (!konteksEfek) {
    try {
      konteksEfek = new KelasAudio();
    } catch {
      return null;
    }
  }
  if (konteksEfek.state === "suspended") {
    void konteksEfek.resume().catch(() => null);
  }
  return konteksEfek;
}

function mainkanNada(frekuensi: number, mulaiDetik: number, durasiDetik: number, tipe: OscillatorType = "sine", volume = 0.12) {
  const ctx = ambilKonteks();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const waktuMulai = ctx.currentTime + mulaiDetik;

    osc.type = tipe;
    osc.frequency.setValueAtTime(frekuensi, waktuMulai);

    gain.gain.setValueAtTime(0.001, waktuMulai);
    gain.gain.exponentialRampToValueAtTime(volume, waktuMulai + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, waktuMulai + durasiDetik);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(waktuMulai);
    osc.stop(waktuMulai + durasiDetik + 0.02);
  } catch {
    // Abaikan bila perangkat menolak pemutaran audio otomatis.
  }
}

/** Suara ketukan halus saat memilih blok kata atau kartu pilihan. */
export function bunyiKlik() {
  mainkanNada(520, 0, 0.055, "triangle", 0.07);
}

/** Suara denting ceria saat jawaban kuis benar. */
export function bunyiBenar() {
  mainkanNada(587.33, 0, 0.11, "triangle", 0.13);
  mainkanNada(880, 0.09, 0.22, "triangle", 0.15);
}

/** Suara rendah lembut saat jawaban kuis kurang tepat. */
export function bunyiSalah() {
  mainkanNada(260, 0, 0.14, "sawtooth", 0.08);
  mainkanNada(196, 0.11, 0.22, "sawtooth", 0.09);
}

/** Suara perayaan saat menyelesaikan satu pelajaran penuh. */
export function bunyiSelesai() {
  mainkanNada(523.25, 0, 0.12, "triangle", 0.13);
  mainkanNada(659.25, 0.1, 0.12, "triangle", 0.13);
  mainkanNada(783.99, 0.2, 0.14, "triangle", 0.14);
  mainkanNada(1046.5, 0.32, 0.35, "triangle", 0.16);
}

