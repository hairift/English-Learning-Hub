/**
 * Sistem gamifikasi: XP, rentetan harian (streak), liga mingguan, nyawa, dan permata.
 */

import { getShanghaiDate } from "./checkin";

/** Tingkatan liga mingguan dari terendah ke tertinggi. */
export type NamaLiga = "Bronze" | "Silver" | "Gold" | "Sapphire" | "Diamond";

/** Urutan liga untuk keperluan promosi. */
export const URUTAN_LIGA: NamaLiga[] = ["Bronze", "Silver", "Gold", "Sapphire", "Diamond"];

/** Batas XP minimum untuk naik ke liga berikutnya dalam satu minggu. */
export const AMBANG_PROMOSI_LIGA: Record<NamaLiga, number> = {
  Bronze: 60,
  Silver: 140,
  Gold: 260,
  Sapphire: 420,
  Diamond: Infinity
};

/** Jumlah nyawa maksimum yang bisa disimpan. */
export const NYAWA_MAKSIMUM = 5;

/** Selang pemulihan satu nyawa (ms), yaitu 30 menit. */
export const SELANG_PEMULIHAN_NYAWA_MS = 30 * 60 * 1000;

/** Satu catatan XP harian untuk menghitung liga mingguan. */
export interface CatatanXpHarian {
  tanggal: string;
  xp: number;
}

/** Seluruh keadaan gamifikasi pengguna. */
export interface GamifikasiState {
  xpTotal: number;
  xpHarian: CatatanXpHarian[];
  terakhirLatihan: string | null;
  rentetan: number;
  rentetanTerpanjang: number;
  pelindungRentetan: number;
  liga: NamaLiga;
  nyawa: number;
  nyawaBerkurangPada: string | null;
  permata?: number;
  petiDibuka?: string[];
}

export function buatGamifikasiKosong(): GamifikasiState {
  return {
    xpTotal: 0,
    xpHarian: [],
    terakhirLatihan: null,
    rentetan: 0,
    rentetanTerpanjang: 0,
    pelindungRentetan: 2,
    liga: "Bronze",
    nyawa: NYAWA_MAKSIMUM,
    nyawaBerkurangPada: null,
    permata: 250,
    petiDibuka: []
  };
}

const HARI_MS = 24 * 60 * 60 * 1000;

function keMilidetik(tanggal: string): number {
  return Date.parse(`${tanggal}T00:00:00+08:00`);
}

/** Selisih hari antara dua tanggal (positif bila kedua lebih baru). */
export function selisihHari(pertama: string, kedua: string): number {
  return Math.round((keMilidetik(kedua) - keMilidetik(pertama)) / HARI_MS);
}

/** Hitung ulang rentetan berdasarkan daftar tanggal latihan. */
export function hitungRentetan(daftarTanggal: string[], hariIni: string): number {
  const unik = Array.from(new Set(daftarTanggal)).sort();
  if (!unik.length) return 0;

  const terakhir = unik[unik.length - 1];
  const jarakDariHariIni = selisihHari(terakhir, hariIni);

  if (jarakDariHariIni > 1) return 0;

  let rentetan = 1;
  for (let i = unik.length - 1; i > 0; i -= 1) {
    if (selisihHari(unik[i - 1], unik[i]) === 1) rentetan += 1;
    else break;
  }
  return rentetan;
}

/** Tambahkan XP dan perbarui rentetan setelah pengguna menyelesaikan aktivitas. */
export function tambahXp(
  state: GamifikasiState,
  jumlahXp: number,
  hariIni = getShanghaiDate()
): GamifikasiState {
  const xpBertambah = Math.max(0, Math.round(jumlahXp));

  const xpHarian = (() => {
    const ada = state.xpHarian.find((item) => item.tanggal === hariIni);
    if (!ada) return [...state.xpHarian, { tanggal: hariIni, xp: xpBertambah }];
    return state.xpHarian.map((item) =>
      item.tanggal === hariIni ? { ...item, xp: item.xp + xpBertambah } : item
    );
  })();

  const tanggalLatihan = Array.from(
    new Set([...xpHarian.filter((item) => item.xp > 0).map((item) => item.tanggal)])
  ).sort();

  const rentetanSebelumnya = state.rentetan;
  let rentetan = hitungRentetan(tanggalLatihan, hariIni);
  let pelindungRentetan = state.pelindungRentetan;
  const jeda = state.terakhirLatihan ? selisihHari(state.terakhirLatihan, hariIni) : 0;

  if (jeda === 2 && rentetanSebelumnya > 0 && pelindungRentetan > 0) {
    pelindungRentetan -= 1;
    rentetan = rentetanSebelumnya + 1;
  }

  const bonusPermata = xpBertambah > 0 ? Math.max(5, Math.round(xpBertambah * 0.6)) : 0;

  return {
    ...state,
    xpTotal: state.xpTotal + xpBertambah,
    xpHarian,
    terakhirLatihan: hariIni,
    rentetan,
    rentetanTerpanjang: Math.max(state.rentetanTerpanjang, rentetan),
    pelindungRentetan,
    liga: hitungLiga(xpHarian, state.liga, hariIni),
    nyawa: Math.min(NYAWA_MAKSIMUM, state.nyawa + 1),
    permata: (state.permata ?? 250) + bonusPermata
  };
}

/** Hitung liga berdasarkan XP minggu berjalan. */
export function hitungLiga(
  xpHarian: CatatanXpHarian[],
  ligaSekarang: NamaLiga,
  hariIni = getShanghaiDate()
): NamaLiga {
  const xpMingguIni = xpMingguBerjalan(xpHarian, hariIni).reduce((total, item) => total + item.xp, 0);
  const ambang = AMBANG_PROMOSI_LIGA[ligaSekarang];
  if (xpMingguIni >= ambang) {
    const indeks = URUTAN_LIGA.indexOf(ligaSekarang);
    return URUTAN_LIGA[Math.min(indeks + 1, URUTAN_LIGA.length - 1)];
  }
  return ligaSekarang;
}

/** Ambil catatan XP tujuh hari terakhir termasuk hari ini. */
export function xpMingguBerjalan(xpHarian: CatatanXpHarian[], hariIni = getShanghaiDate()): CatatanXpHarian[] {
  return Array.from({ length: 7 }, (_, index) => {
    const tanggal = getShanghaiDate(new Date(keMilidetik(hariIni) - (6 - index) * HARI_MS));
    const catatan = xpHarian.find((item) => item.tanggal === tanggal);
    return { tanggal, xp: catatan?.xp ?? 0 };
  });
}

/** Total XP dalam tujuh hari terakhir. */
export function xpMingguan(xpHarian: CatatanXpHarian[], hariIni = getShanghaiDate()): number {
  return xpMingguBerjalan(xpHarian, hariIni).reduce((total, item) => total + item.xp, 0);
}

/** Sisa XP yang dibutuhkan untuk naik ke liga berikutnya. */
export function sisaXpNaikLiga(state: GamifikasiState, hariIni = getShanghaiDate()): number | null {
  const ambang = AMBANG_PROMOSI_LIGA[state.liga];
  if (!Number.isFinite(ambang)) return null;
  return Math.max(0, ambang - xpMingguan(state.xpHarian, hariIni));
}

/** Hitung nyawa terkini dengan memperhitungkan pemulihan berbasis waktu. */
export function nyawaTerkini(state: GamifikasiState, sekarang = new Date()): number {
  if (state.nyawa >= NYAWA_MAKSIMUM || !state.nyawaBerkurangPada) return state.nyawa;
  const berlalu = sekarang.getTime() - Date.parse(state.nyawaBerkurangPada);
  if (berlalu <= 0) return state.nyawa;
  const pulih = Math.floor(berlalu / SELANG_PEMULIHAN_NYAWA_MS);
  return Math.min(NYAWA_MAKSIMUM, state.nyawa + pulih);
}

/** Kurangi satu nyawa karena jawaban salah. */
export function kurangiNyawa(state: GamifikasiState, sekarang = new Date()): GamifikasiState {
  const kini = nyawaTerkini(state, sekarang);
  return {
    ...state,
    nyawa: Math.max(0, kini - 1),
    nyawaBerkurangPada: sekarang.toISOString()
  };
}

/** Kembalikan nyawa ke penuh. */
export function isiPenuhNyawa(state: GamifikasiState): GamifikasiState {
  return { ...state, nyawa: NYAWA_MAKSIMUM, nyawaBerkurangPada: null };
}

export interface BarisPapanPeringkat {
  label: string;
  xp: number;
  milikSaya: boolean;
}

/** Susun papan peringkat mingguan berbasis tonggak target. */
export function papanPeringkatMingguan(
  state: GamifikasiState,
  hariIni = getShanghaiDate()
): BarisPapanPeringkat[] {
  const xpSaya = xpMingguan(state.xpHarian, hariIni);
  const ambang = AMBANG_PROMOSI_LIGA[state.liga];
  const target = Number.isFinite(ambang) ? ambang : Math.max(600, xpSaya);

  const tonggak = [
    { label: "Mulai", xp: 0 },
    { label: "Sepertiga jalan", xp: Math.round(target / 3) },
    { label: "Dua pertiga jalan", xp: Math.round((target * 2) / 3) },
    { label: `Target Liga ${berikutLiga(state.liga)}`, xp: target }
  ];

  const baris: BarisPapanPeringkat[] = tonggak.map((item) => ({
    label: item.label,
    xp: item.xp,
    milikSaya: false
  }));

  baris.push({ label: "Kamu minggu ini", xp: xpSaya, milikSaya: true });

  return baris.sort((a, b) => b.xp - a.xp);
}

/** Nama liga berikutnya, atau liga yang sama bila sudah tertinggi. */
export function berikutLiga(liga: NamaLiga): NamaLiga {
  const indeks = URUTAN_LIGA.indexOf(liga);
  return URUTAN_LIGA[Math.min(indeks + 1, URUTAN_LIGA.length - 1)];
}

/** Susun ulang data gamifikasi dari penyimpanan lokal agar selalu valid. */
export function normalkanGamifikasi(nilai: unknown): GamifikasiState {
  const kosong = buatGamifikasiKosong();
  if (!nilai || typeof nilai !== "object") return kosong;
  const mentah = nilai as Partial<GamifikasiState>;

  const xpHarian = Array.isArray(mentah.xpHarian)
    ? mentah.xpHarian
        .filter(
          (item): item is CatatanXpHarian =>
            Boolean(item) && typeof item.tanggal === "string" && typeof item.xp === "number"
        )
        .map((item) => ({ tanggal: item.tanggal, xp: Math.max(0, Math.round(item.xp)) }))
    : [];

  const liga = URUTAN_LIGA.includes(mentah.liga as NamaLiga)
    ? (mentah.liga as NamaLiga)
    : kosong.liga;

  return {
    xpTotal: typeof mentah.xpTotal === "number" ? Math.max(0, mentah.xpTotal) : 0,
    xpHarian,
    terakhirLatihan: typeof mentah.terakhirLatihan === "string" ? mentah.terakhirLatihan : null,
    rentetan: typeof mentah.rentetan === "number" ? Math.max(0, mentah.rentetan) : 0,
    rentetanTerpanjang:
      typeof mentah.rentetanTerpanjang === "number" ? Math.max(0, mentah.rentetanTerpanjang) : 0,
    pelindungRentetan:
      typeof mentah.pelindungRentetan === "number" ? Math.max(0, mentah.pelindungRentetan) : kosong.pelindungRentetan,
    liga,
    nyawa: typeof mentah.nyawa === "number" ? Math.min(NYAWA_MAKSIMUM, Math.max(0, mentah.nyawa)) : kosong.nyawa,
    nyawaBerkurangPada: typeof mentah.nyawaBerkurangPada === "string" ? mentah.nyawaBerkurangPada : null,
    permata: typeof mentah.permata === "number" ? Math.max(0, Math.round(mentah.permata)) : 250,
    petiDibuka: Array.isArray(mentah.petiDibuka)
      ? mentah.petiDibuka.filter((id): id is string => typeof id === "string")
      : []
  };
}


export type Liga = NamaLiga;
export const NYAVA_MAKS = NYAWA_MAKSIMUM;
export const DAFTAR_LIGA = URUTAN_LIGA;
export const AMBANG_LIGA: Record<NamaLiga, number> = {
  Bronze: 60,
  Silver: 140,
  Gold: 260,
  Sapphire: 420,
  Diamond: 600
};

export function pulihkanNyawaOtomatis(state: GamifikasiState, sekarang = new Date()): GamifikasiState {
  const nyawaBaru = nyawaTerkini(state, sekarang);
  if (nyawaBaru === state.nyawa) return state;
  return {
    ...state,
    nyawa: nyawaBaru,
    nyawaBerkurangPada: nyawaBaru >= NYAWA_MAKSIMUM ? null : state.nyawaBerkurangPada
  };
}

export interface EntriPeringkatKampus {
  nama: string;
  xp: number;
  adalahPengguna?: boolean;
}

export function buatPapanPeringkat(
  state: GamifikasiState,
  namaPengguna = "Anda"
): EntriPeringkatKampus[] {
  const xpUser = xpMingguan(state.xpHarian);
  const rekanKampus: EntriPeringkatKampus[] = [
    { nama: "Nadia Putri (TI)", xp: 180 },
    { nama: "Raka Pratama (SI)", xp: 145 },
    { nama: "Dimas Saputra (DKV)", xp: 110 },
    { nama: "Siti Rahma (MI)", xp: 75 },
    { nama: "Budi Santoso (TI)", xp: 40 },
    { nama: namaPengguna, xp: xpUser, adalahPengguna: true }
  ];
  return rekanKampus.sort((a, b) => b.xp - a.xp);
}
