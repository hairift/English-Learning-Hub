/**
 * audioAnalyser.ts — mesin lip sync berbasis analisis audio.
 *
 * Cara kerja (terinspirasi wawa-lipsync):
 * 1. Sumber audio (elemen <audio> TTS atau MediaStream WebRTC) disambungkan ke
 *    sebuah `AnalyserNode` Web Audio API.
 * 2. Setiap frame, kita hitung:
 *    - RMS (kekuatan suara)  -> seberapa lebar mulut terbuka.
 *    - Energi 3 pita frekuensi (bass / mid / treble) -> bentuk viseme mana yang dominan.
 * 3. Hasilnya dipetakan ke 5 viseme (a, i, u, e, o) lalu ditulis ke lipsyncStore.
 *
 * Semua langkah dibungkus `try/catch` supaya kegagalan audio TIDAK pernah
 * mematikan aplikasi — kalau gagal, kita jatuh ke mode viseme dari teks.
 */

import { perbaruiLipsync, setelLipsyncDiam, type BobotViseme } from "./lipsyncStore";

/** Konteks audio bersama (dibuat sekali, sesuai kebijakan browser). */
let konteksAudio: AudioContext | null = null;

/** Penjaga agar `resume()` tidak dipanggil berulang-ulang di dalam loop. */
let sedangMencobaResume = false;

/** Waktu (performance.now) paling awal untuk mencoba `resume()` lagi. */
let cooldownResume = 0;

/** Elemen yang sudah pernah dibuatkan MediaElementSource (tidak boleh dua kali). */
const sudahDisambungkan = new WeakSet<HTMLAudioElement>();

/** Kumpulan sumber analisis yang sedang aktif. */
type SumberAnalisis = {
  id: string;
  analyser: AnalyserNode;
  buffer: Float32Array;
  terakhirBerbunyi: number;
};

const sumberAnalisis = new Map<string, SumberAnalisis>();

/** Status loop animasi. */
let idAnimasi: number | null = null;
let penghitungSumber = 0;

/** Ambang batas RMS agar derau (noise) latar tidak dianggap bicara. */
const AMBANG_SENYAP = 0.012;

/** Faktor pelembutan gerakan mulut (0..1, makin kecil makin halus). */
const PELEMBUT = 0.45;

/** Viseme yang sedang ditampilkan (untuk interpolasi halus). */
let visemeSekarang: BobotViseme = { a: 0, i: 0, u: 0, e: 0, o: 0 };
let kebukaanSekarang = 0;

/** Nilai RMS terakhir yang terbaca (dipakai untuk diagnostik opt-in). */
let rmsTerakhir = 0;

/** Ambil (atau buat) AudioContext bersama. */
function ambilKonteksAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Pabrik = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Pabrik) return null;
    if (!konteksAudio) konteksAudio = new Pabrik();
    cobaLanjutkanKonteks(konteksAudio);
    return konteksAudio;
  } catch {
    return null;
  }
}

/**
 * Coba lanjutkan AudioContext yang sedang "suspended" (kebijakan autoplay).
 *
 * `resume()` bersifat asinkron sehingga TIDAK boleh ditunggu di jalur render.
 * Percobaannya dibatasi (satu per satu + jeda 800 ms) supaya loop animasi yang
 * berjalan 60x per detik tidak membanjiri browser dengan promise.
 */
function cobaLanjutkanKonteks(konteks: AudioContext) {
  if (konteks.state !== "suspended") return;
  if (sedangMencobaResume) return;
  const sekarang = typeof performance !== "undefined" ? performance.now() : 0;
  if (sekarang < cooldownResume) return;

  sedangMencobaResume = true;
  konteks
    .resume()
    .catch(() => {
      // Gagal (belum ada gesture pengguna): beri jeda sebelum mencoba lagi.
      cooldownResume = (typeof performance !== "undefined" ? performance.now() : 0) + 800;
    })
    .finally(() => {
      sedangMencobaResume = false;
    });
}

/**
 * Buka/mengaktifkan mesin audio. Panggil dari handler gesture pengguna
 * (klik/tap) agar browser mengizinkan pemutaran audio dan analisis lip sync.
 */
export function siapkanKonteksAudio(): void {
  const konteks = ambilKonteksAudio();
  if (konteks) void konteks.resume().catch(() => undefined);
}

/**
 * Cek apakah AudioContext sedang berjalan.
 *
 * Dibuat sebagai fungsi terpisah supaya TypeScript tidak "mengunci" tipe
 * `state` setelah pengecekan sebelumnya (nilai `state` bisa berubah setelah
 * `resume()` selesai, tetapi TypeScript tidak mengetahuinya).
 */
function konteksBerjalan(konteks: AudioContext | null): boolean {
  return Boolean(konteks && konteks.state === "running");
}

/**
 * Tunggu sampai AudioContext benar-benar berjalan (maksimal `waktuTungguMs`).
 *
 * Dipakai sebelum memutar TTS: menyambungkan elemen <audio> ke graf Web Audio
 * saat konteks masih "suspended" akan membuat suara SENYAP. Jadi kita pastikan
 * dulu konteksnya hidup; bila belum bisa, pemanggil sebaiknya tidak menyambung
 * elemen ke analiser supaya suara tetap terdengar.
 */
export async function pastikanKonteksBerjalan(waktuTungguMs = 400): Promise<boolean> {
  const konteks = ambilKonteksAudio();
  if (!konteks) return false;
  if (konteksBerjalan(konteks)) return true;

  try {
    await Promise.race([
      konteks.resume(),
      new Promise((selesai) => {
        setTimeout(selesai, waktuTungguMs);
      })
    ]);
  } catch {
    // Gagal resume (belum ada gesture pengguna): pemanggil akan memakai jalur aman.
  }
  return konteksBerjalan(konteks);
}

/**
 * Pasang pendengar sekali agar AudioContext otomatis aktif pada interaksi
 * pertama pengguna (klik, sentuh, atau tombol apa pun). Mengembalikan fungsi
 * pembersih untuk dipakai di `useEffect`.
 */
export function pasangPembukaAudio(): () => void {
  if (typeof window === "undefined") return () => undefined;

  let sudahDibersihkan = false;
  const bersihkan = () => {
    if (sudahDibersihkan) return;
    sudahDibersihkan = true;
    window.removeEventListener("pointerdown", buka);
    window.removeEventListener("keydown", buka);
    window.removeEventListener("touchstart", buka);
  };
  const buka = () => {
    siapkanKonteksAudio();
    // Begitu konteks benar-benar berjalan, pendengar tidak diperlukan lagi.
    if (konteksBerjalan(konteksAudio)) bersihkan();
  };

  window.addEventListener("pointerdown", buka, { passive: true });
  window.addEventListener("keydown", buka);
  window.addEventListener("touchstart", buka, { passive: true });
  return bersihkan;
}

/** Menghitung rata-rata kuadrat sinyal (RMS) dari data waktu. */
function hitungRms(data: Float32Array): number {
  let jumlah = 0;
  for (let i = 0; i < data.length; i += 1) jumlah += data[i] * data[i];
  return Math.sqrt(jumlah / data.length);
}

/** Menghitung energi rata-rata pada rentang indeks frekuensi tertentu. */
function hitungEnergiPita(data: Uint8Array, mulai: number, akhir: number): number {
  let jumlah = 0;
  const batas = Math.min(akhir, data.length);
  for (let i = mulai; i < batas; i += 1) jumlah += data[i];
  return batas > mulai ? jumlah / (batas - mulai) : 0;
}

/**
 * Memetakan kekuatan suara + distribusi frekuensi menjadi 5 bobot viseme.
 *
 * Ide dasarnya: frekuensi rendah -> mulut terbuka lebar (a/o),
 * frekuensi menengah -> (e), frekuensi tinggi -> mulut menyempit (i/u).
 */
function hitungViseme(rms: number, bass: number, mid: number, treble: number): BobotViseme {
  const total = bass + mid + treble + 0.0001;
  const porsiBass = bass / total;
  const porsiMid = mid / total;
  const porsiTreble = treble / total;

  // Kebukaan mulut dibatasi 0..1 dan dinaikkan sedikit agar terlihat jelas.
  const kebukaan = Math.max(0, Math.min(1, rms * 9));

  return {
    a: Math.max(0, Math.min(1, kebukaan * porsiBass * 1.6)),
    o: Math.max(0, Math.min(1, kebukaan * (porsiBass * 0.7 + porsiMid * 0.5))),
    e: Math.max(0, Math.min(1, kebukaan * porsiMid * 1.5)),
    i: Math.max(0, Math.min(1, kebukaan * porsiTreble * 1.4)),
    u: Math.max(0, Math.min(1, kebukaan * (porsiTreble * 0.6 + porsiMid * 0.3)))
  };
}

/** Interpolasi linear agar mulut tidak bergetar kasar. */
function lembuhkan(sekarang: number, target: number, faktor = PELEMBUT): number {
  return sekarang + (target - sekarang) * faktor;
}

/** Loop utama: membaca seluruh sumber aktif lalu memperbarui state lip sync. */
function loopAnalisis() {
  const konteks = ambilKonteksAudio();
  if (!konteks) {
    idAnimasi = null;
    return;
  }

  const sekarang = performance.now();
  let rmsGabungan = 0;
  let bassGabungan = 0;
  let midGabungan = 0;
  let trebleGabungan = 0;
  let jumlahSumber = 0;

  sumberAnalisis.forEach((sumber) => {
    sumber.analyser.getFloatTimeDomainData(sumber.buffer as Float32Array<ArrayBuffer>);
    const rms = hitungRms(sumber.buffer);

    const dataFrekuensi = new Uint8Array(sumber.analyser.frequencyBinCount);
    sumber.analyser.getByteFrequencyData(dataFrekuensi);

    // 44.1kHz dengan fftSize 1024 -> tiap bin sekitar 43 Hz.
    const binPerHz = sumber.analyser.frequencyBinCount / (konteks.sampleRate / 2);
    const bass = hitungEnergiPita(dataFrekuensi, Math.floor(60 * binPerHz), Math.floor(400 * binPerHz));
    const mid = hitungEnergiPita(dataFrekuensi, Math.floor(400 * binPerHz), Math.floor(1800 * binPerHz));
    const treble = hitungEnergiPita(dataFrekuensi, Math.floor(1800 * binPerHz), Math.floor(6000 * binPerHz));

    if (rms > AMBANG_SENYAP) sumber.terakhirBerbunyi = sekarang;

    rmsGabungan += rms;
    bassGabungan += bass;
    midGabungan += mid;
    trebleGabungan += treble;
    jumlahSumber += 1;
  });

  if (jumlahSumber === 0) {
    setelLipsyncDiam();
    idAnimasi = null;
    return;
  }

  rmsGabungan /= jumlahSumber;
  bassGabungan /= jumlahSumber;
  midGabungan /= jumlahSumber;
  trebleGabungan /= jumlahSumber;
  rmsTerakhir = rmsGabungan;

  const target = hitungViseme(rmsGabungan, bassGabungan, midGabungan, trebleGabungan);
  const targetKebukaan = Math.max(0, Math.min(1, rmsGabungan * 9));

  visemeSekarang = {
    a: lembuhkan(visemeSekarang.a, target.a),
    i: lembuhkan(visemeSekarang.i, target.i),
    u: lembuhkan(visemeSekarang.u, target.u),
    e: lembuhkan(visemeSekarang.e, target.e),
    o: lembuhkan(visemeSekarang.o, target.o)
  };
  kebukaanSekarang = lembuhkan(kebukaanSekarang, targetKebukaan);

  perbaruiLipsync({
    viseme: { ...visemeSekarang },
    kebukaan: kebukaanSekarang,
    bersuara: rmsGabungan > AMBANG_SENYAP,
    sumber: "audio"
  });

  idAnimasi = requestAnimationFrame(loopAnalisis);
}

/** Memastikan loop animasi berjalan. */
function pastikanLoopBerjalan() {
  if (idAnimasi !== null) return;
  if (typeof requestAnimationFrame === "undefined") return;
  idAnimasi = requestAnimationFrame(loopAnalisis);
}

/**
 * Menyambungkan elemen <audio> ke analiser lip sync.
 * Aman dipanggil berulang kali untuk elemen yang sama.
 */
export function daftarkanElemenAudio(elemen: HTMLAudioElement, idSumber = `audio-${penghitungSumber}`): string | null {
  const konteks = ambilKonteksAudio();
  if (!konteks || sudahDisambungkan.has(elemen)) return null;

  // Penting: menyambungkan elemen ke graf Web Audio akan mengalihkan keluaran
  // suara ke `destination`. Bila AudioContext masih "suspended", suara akan
  // senyap — karena itu kita minta `resume()` di latar. Graf tetap disambungkan
  // sekarang (tidak menunggu) supaya analisis langsung aktif begitu konteks
  // berjalan; ini yang membuat mulut avatar ikut bergerak saat Sela bicara.
  cobaLanjutkanKonteks(konteks);

  try {
    const sumberNode = konteks.createMediaElementSource(elemen);
    const analyser = konteks.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.6;

    sumberNode.connect(analyser);
    // Tetap sambungkan ke keluaran supaya suara terdengar normal.
    analyser.connect(konteks.destination);
    sudahDisambungkan.add(elemen);

    const id = idSumber;
    sumberAnalisis.set(id, {
      id,
      analyser,
      buffer: new Float32Array(analyser.fftSize),
      terakhirBerbunyi: 0
    });
    penghitungSumber += 1;
    pastikanLoopBerjalan();
    return id;
  } catch {
    // Beberapa browser menolak elemen lintas-asal; abaikan dengan aman.
    return null;
  }
}

/** Menyambungkan MediaStream (mis. audio bot WebRTC) ke analiser lip sync. */
export function daftarkanStreamAudio(stream: MediaStream, idSumber = `stream-${penghitungSumber}`): string | null {
  const konteks = ambilKonteksAudio();
  if (!konteks) return null;

  try {
    const sumberNode = konteks.createMediaStreamSource(stream);
    const analyser = konteks.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.6;

    sumberNode.connect(analyser);
    // JANGAN sambungkan ke destination untuk MediaStream — audio sudah
    // diputar oleh elemen <audio> pemilik stream, kalau disambungkan akan ganda.

    const id = idSumber;
    sumberAnalisis.set(id, {
      id,
      analyser,
      buffer: new Float32Array(analyser.fftSize),
      terakhirBerbunyi: 0
    });
    penghitungSumber += 1;
    pastikanLoopBerjalan();
    return id;
  } catch {
    return null;
  }
}

/** Melepas satu sumber analisis. */
export function lepasSumberAudio(id: string | null) {
  if (!id) return;
  sumberAnalisis.delete(id);
  if (sumberAnalisis.size === 0) {
    setelLipsyncDiam();
    if (idAnimasi !== null) {
      cancelAnimationFrame(idAnimasi);
      idAnimasi = null;
    }
  }
}

/** Melepas seluruh sumber (dipakai saat sesi berakhir). */
export function lepasSemuaSumberAudio() {
  sumberAnalisis.clear();
  setelLipsyncDiam();
  if (idAnimasi !== null) {
    cancelAnimationFrame(idAnimasi);
    idAnimasi = null;
  }
}

/** Menandai bahwa audio sedang diputar / berhenti, untuk indikator UI. */
export function tandaiAudioDiputar(aktif: boolean) {
  perbaruiLipsync({ bersuara: aktif, sumber: aktif ? "audio" : "idle" });
}

/**
 * Kait diagnostik (opt-in, tidak aktif secara default).
 *
 * Bila `window.__SELA_DEBUG__ = true` diset SEBELUM aplikasi dimuat, status
 * mesin audio dipaparkan lewat `window.__selaAudio()` untuk keperluan
 * pemeriksaan otomatis. Pada pemakaian normal tidak ada efek apa pun.
 */
declare global {
  interface Window {
    __SELA_DEBUG__?: boolean;
    __selaAudio?: () => {
      konteks: string | null;
      jumlahSumber: number;
      animasiAktif: boolean;
      rmsTerakhir: number;
    };
  }
}

if (typeof window !== "undefined" && window.__SELA_DEBUG__) {
  window.__selaAudio = () => ({
    konteks: konteksAudio ? konteksAudio.state : null,
    jumlahSumber: sumberAnalisis.size,
    animasiAktif: idAnimasi !== null,
    rmsTerakhir
  });
}
