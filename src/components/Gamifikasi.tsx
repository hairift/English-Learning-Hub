/**
 * Widget gamifikasi: rentetan harian, XP, liga mingguan, dan nyawa.
 *
 * Seluruh angka dihitung dari aktivitas nyata pengguna (lihat
 * `domain/gamifikasi`). Tidak ada nama pengguna palsu atau angka contoh:
 * bila pengguna belum berlatih, widget menampilkan keadaan nol apa adanya.
 */

import { Flame, Heart, Shield, Star, TrendingUp, Zap } from "lucide-react";
import {
  AMBANG_PROMOSI_LIGA,
  NYAWA_MAKSIMUM,
  berikutLiga,
  nyawaTerkini,
  papanPeringkatMingguan,
  sisaXpNaikLiga,
  xpMingguBerjalan,
  xpMingguan,
  type GamifikasiState,
  type NamaLiga
} from "../domain/gamifikasi";
import { getShanghaiDate } from "../domain/checkin";

/** Warna khas tiap liga, dipakai pada lencana dan bingkai papan. */
export const WARNA_LIGA: Record<NamaLiga, string> = {
  Bronze: "#c98a4b",
  Silver: "#9aa7b4",
  Gold: "#f2b705",
  Sapphire: "#2f6fdd",
  Diamond: "#41c9d6"
};

/** Nama hari singkat dalam Bahasa Indonesia untuk grafik mingguan. */
const HARI_SINGKAT = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export interface BarRentetanProps {
  gamifikasi: GamifikasiState;
  hariIni?: string;
}

/**
 * Bilah atas bergaya bilah status: rentetan, XP total, nyawa, dan pelindung.
 * Sengaja ringkas agar bisa diletakkan di kepala layar mana pun.
 */
export function BarRentetan({ gamifikasi, hariIni = getShanghaiDate() }: BarRentetanProps) {
  const nyawa = nyawaTerkini(gamifikasi);

  return (
    <div className="bar-status" role="status" aria-label="Ringkasan kemajuan belajar">
      <div className={`status-chip status-rentetan ${gamifikasi.rentetan > 0 ? "aktif" : ""}`}>
        <Flame size={18} aria-hidden="true" />
        <div>
          <strong>{gamifikasi.rentetan}</strong>
          <span>hari beruntun</span>
        </div>
      </div>

      <div className="status-chip status-xp">
        <Star size={18} aria-hidden="true" />
        <div>
          <strong>{gamifikasi.xpTotal}</strong>
          <span>XP total</span>
        </div>
      </div>

      <div className="status-chip status-nyawa">
        <Heart size={18} aria-hidden="true" />
        <div>
          <strong>
            {nyawa}/{NYAWA_MAKSIMUM}
          </strong>
          <span>nyawa</span>
        </div>
      </div>

      <div className="status-chip status-liga" style={{ ["--warna-liga" as string]: WARNA_LIGA[gamifikasi.liga] }}>
        <TrendingUp size={18} aria-hidden="true" />
        <div>
          <strong>Liga {gamifikasi.liga}</strong>
          <span>{xpMingguan(gamifikasi.xpHarian, hariIni)} XP minggu ini</span>
        </div>
      </div>

      <div className="status-chip status-pelindung">
        <Shield size={18} aria-hidden="true" />
        <div>
          <strong>{gamifikasi.pelindungRentetan}</strong>
          <span>pelindung</span>
        </div>
      </div>
    </div>
  );
}

export interface PapanLigaProps {
  gamifikasi: GamifikasiState;
  hariIni?: string;
}

/**
 * Papan liga mingguan.
 *
 * Aplikasi ini tidak punya server akun, jadi papan tidak bisa memuat pengguna
 * lain. Alih-alih menampilkan nama palsu, papan menampilkan tonggak perjalanan
 * menuju liga berikutnya dengan posisi pengguna ditandai jelas.
 */
export function PapanLiga({ gamifikasi, hariIni = getShanghaiDate() }: PapanLigaProps) {
  const baris = papanPeringkatMingguan(gamifikasi, hariIni);
  const sisa = sisaXpNaikLiga(gamifikasi, hariIni);
  const ligaBerikut = berikutLiga(gamifikasi.liga);
  const ambang = AMBANG_PROMOSI_LIGA[gamifikasi.liga];
  const xpSaya = xpMingguan(gamifikasi.xpHarian, hariIni);
  const mingguan = xpMingguBerjalan(gamifikasi.xpHarian, hariIni);
  const puncak = Math.max(1, ...mingguan.map((item) => item.xp));

  return (
    <section className="panel panel-liga">
      <header className="panel-liga-kepala">
        <div>
          <span className="eyebrow">Liga Mingguan</span>
          <h3>
            Liga {gamifikasi.liga}
            <span className="liga-lencana" style={{ ["--warna-liga" as string]: WARNA_LIGA[gamifikasi.liga] }}>
              {gamifikasi.liga}
            </span>
          </h3>
        </div>
        <div className="liga-ringkas">
          <strong>{xpSaya} XP</strong>
          <span>7 hari terakhir</span>
        </div>
      </header>

      <div className="liga-grafik" aria-label="XP tujuh hari terakhir">
        {mingguan.map((item, indeks) => {
          const tinggi = Math.round((item.xp / puncak) * 100);
          return (
            <div className="liga-batang" key={item.tanggal}>
              <span className="liga-batang-nilai">{item.xp > 0 ? item.xp : ""}</span>
              <span className="liga-batang-latar">
                <span className="liga-batang-isi" style={{ height: `${Math.max(4, tinggi)}%` }} />
              </span>
              <span className="liga-batang-hari">{HARI_SINGKAT[indeks]}</span>
            </div>
          );
        })}
      </div>

      <ul className="liga-papan">
        {baris.map((item) => (
          <li key={item.label} className={item.milikSaya ? "baris-saya" : ""}>
            <span className="liga-bar-label">{item.label}</span>
            <span className="liga-bar-xp">{item.xp} XP</span>
          </li>
        ))}
      </ul>

      <p className="liga-catatan">
        <Zap size={15} aria-hidden="true" />
        {sisa === null
          ? "Kamu sudah berada di liga tertinggi. Pertahankan ritmenya!"
          : sisa === 0
            ? `Target Liga ${ligaBerikut} sudah tercapai — terus kumpulkan XP!`
            : `Kumpulkan ${sisa} XP lagi untuk naik ke Liga ${ligaBerikut} (target ${ambang} XP).`}
      </p>
    </section>
  );
}

export interface KartuNyawaProps {
  gamifikasi: GamifikasiState;
}

/** Deretan hati yang menunjukkan sisa nyawa. */
export function KartuNyawa({ gamifikasi }: KartuNyawaProps) {
  const nyawa = nyawaTerkini(gamifikasi);
  return (
    <div className="kartu-nyawa" aria-label={`Nyawa tersisa ${nyawa} dari ${NYAWA_MAKSIMUM}`}>
      {Array.from({ length: NYAWA_MAKSIMUM }, (_, indeks) => (
        <Heart
          key={indeks}
          size={20}
          className={indeks < nyawa ? "hati-penuh" : "hati-kosong"}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export default BarRentetan;
