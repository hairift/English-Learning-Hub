import React, { useState } from "react";
import {
  AMBANG_LIGA,
  DAFTAR_LIGA,
  NYAVA_MAKS,
  buatPapanPeringkat,
  xpMingguan,
  type GamifikasiState,
  type Liga
} from "../domain/gamifikasi";
import { jawabKartu, kartuJatuhTempo, type KartuSrs } from "../domain/srs";
import { ucapkan } from "../suaraBrowser";
import { bunyiBenar, bunyiKlik, bunyiSelesai } from "../efekSuara";

const WARNA_LIGA: Record<Liga, string> = {
  Bronze: "#cd7f32",
  Silver: "#94a3b8",
  Gold: "#eab308",
  Sapphire: "#3b82f6",
  Diamond: "#38bdf8"
};

export interface BilahGamifikasiProps {
  state: GamifikasiState;
  namaPengguna?: string;
}

export function BilahGamifikasi({ state }: BilahGamifikasiProps) {
  const xpMinggu = xpMingguan(state.xpHarian);
  const indeksLiga = DAFTAR_LIGA.indexOf(state.liga);
  const ligaBerikut: Liga | null =
    indeksLiga < DAFTAR_LIGA.length - 1 ? DAFTAR_LIGA[indeksLiga + 1] : null;
  const targetBerikut = ligaBerikut ? AMBANG_LIGA[ligaBerikut] : AMBANG_LIGA.Diamond;
  const persenLiga = Math.min(100, Math.round((xpMinggu / Math.max(1, targetBerikut)) * 100));

  return (
    <div className="bilah-gamifikasi" aria-label="Status belajar">
      <div className="chip-gamifikasi" title="Kursus Bahasa Inggris">
        <span className="ikon-chip" aria-hidden="true">🇺🇸</span>
        <div>
          <strong>EN</strong>
          <small>Inggris</small>
        </div>
      </div>

      <div className="chip-gamifikasi" title="Rentetan hari belajar berturut-turut">
        <span className="ikon-chip" aria-hidden="true">🔥</span>
        <div>
          <strong>{state.rentetan}</strong>
          <small>hari beruntun</small>
        </div>
      </div>

      <div className="chip-gamifikasi" title="Permata untuk membeli item di Toko">
        <span className="ikon-chip" aria-hidden="true">💎</span>
        <div>
          <strong>{state.permata ?? 500}</strong>
          <small>Permata</small>
        </div>
      </div>

      <div className="chip-gamifikasi" title="Total poin pengalaman">
        <span className="ikon-chip" aria-hidden="true">⚡</span>
        <div>
          <strong>{state.xpTotal} XP</strong>
          <small>{xpMinggu} XP minggu ini</small>
        </div>
      </div>

      <div className="chip-gamifikasi" title="Nyawa tersisa untuk kuis">
        <span className="ikon-chip" aria-hidden="true">❤️</span>
        <div>
          <strong>
            {state.nyawa}/{NYAVA_MAKS}
          </strong>
          <small>nyawa</small>
        </div>
      </div>

      <div className="chip-gamifikasi chip-liga" title="Liga mingguan">
        <span
          className="lencana-liga"
          style={{ background: WARNA_LIGA[state.liga] }}
          aria-hidden="true"
        />
        <div className="detail-liga">
          <strong>Liga {state.liga}</strong>
          <small>
            {ligaBerikut
              ? `${xpMinggu}/${targetBerikut} XP ke ${ligaBerikut}`
              : "Puncak liga tercapai"}
          </small>
          <div className="bar-liga" aria-hidden="true">
            <div style={{ width: `${persenLiga}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PapanPeringkatLiga({
  state,
  namaPengguna = "Anda"
}: BilahGamifikasiProps) {
  const entri = buatPapanPeringkat(state, namaPengguna);
  return (
    <section className="papan-liga" aria-label={`Papan peringkat Liga ${state.liga}`}>
      <header className="kepala-papan-liga">
        <div>
          <span className="subjudul-kecil">KOMPETISI MINGGUAN KAMPUS</span>
          <h4>🏆 Papan Skor Liga {state.liga}</h4>
        </div>
        <small>3 teratas promosi ke liga berikutnya</small>
      </header>
      <ol className="daftar-peringkat">
        {entri.map((baris, idx) => (
          <li
            key={baris.nama}
            className={baris. adalahPengguna ? "baris-peringkat adalah-pengguna" : "baris-peringkat"}
          >
            <span className={`nomor-peringkat nomor-peringkat--${idx + 1}`}>
              {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
            </span>
            <span className="nama-peringkat">{baris.nama}</span>
            <span className="xp-peringkat">⚡ {baris.xp} XP</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export interface KartuMisiHarianProps {
  state: GamifikasiState;
  jumlahPercobaanRiset: number;
  jumlahLevelSelesai: number;
}

export function KartuMisiHarian({
  state,
  jumlahPercobaanRiset,
  jumlahLevelSelesai
}: KartuMisiHarianProps) {
  const xpMinggu = xpMingguan(state.xpHarian);
  const misi = [
    {
      id: "misi-xp",
      ikon: "⚡",
      judul: "Dapatkan 20 XP hari ini",
      sekarang: Math.min(20, xpMinggu),
      target: 20,
      hadiah: "+10 💎"
    },
    {
      id: "misi-level",
      ikon: "🎯",
      judul: "Selesaikan 2 pelajaran di jalur belajar",
      sekarang: Math.min(2, jumlahLevelSelesai),
      target: 2,
      hadiah: "+15 💎"
    },
    {
      id: "misi-soal",
      ikon: "🔥",
      judul: "Jawab 10 latihan kosakata atau grammar",
      sekarang: Math.min(10, jumlahPercobaanRiset),
      target: 10,
      hadiah: "+20 💎"
    }
  ];

  return (
    <section className="duo-kartu-samping" aria-label="Misi Harian">
      <div className="duo-kartu-samping-kepala">
        <h4>Misi Harian</h4>
        <span className="duo-tautan-kecil"> AKTIF </span>
      </div>

      <div className="duo-daftar-misi">
        {misi.map((m) => {
          const persen = Math.min(100, Math.round((m.sekarang / m.target) * 100));
          const tuntas = m.sekarang >= m.target;
          return (
            <div key={m.id} className="duo-item-misi">
              <span className="duo-ikon-misi" aria-hidden="true">
                {m.ikon}
              </span>
              <div className="duo-badan-misi">
                <div className="duo-judul-misi-baris">
                  <strong>{m.judul}</strong>
                  <small>{m.hadiah}</small>
                </div>
                <div className="duo-batang-misi">
                  <div
                    className={`duo-isi-misi ${tuntas ? "duo-isi-misi--tuntas" : ""}`}
                    style={{ width: `${persen}%` }}
                  />
                  <span className="duo-label-batang-misi">
                    {m.sekarang} / {m.target}
                  </span>
                </div>
              </div>
              <span className="duo-peti-misi" aria-hidden="true">
                {tuntas ? "✅" : "🧰"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export interface TokoPermataProps {
  state: GamifikasiState;
  onBeliNyawa: () => void;
  onBeliPelindung: () => void;
}

export function TokoPermata({
  state,
  onBeliNyawa,
  onBeliPelindung
}: TokoPermataProps) {
  const [pesanToko, setPesanToko] = useState<string | null>(null);

  return (
    <section className="duo-toko-permata" aria-label="Toko Permata">
      <header className="duo-toko-kepala">
        <div>
          <span className="subjudul-kecil">TOKO KAMPUS CENDEKIA</span>
          <h3>🏪 Tukarkan Permata Belajar</h3>
          <p>Gunakan permata dari kuis dan peti hadiah untuk menjaga kelancaran belajarmu.</p>
        </div>
        <div className="duo-saldo-permata">
          <span aria-hidden="true">💎</span>
          <strong>{state.permata ?? 500}</strong>
          <small>Permata</small>
        </div>
      </header>

      {pesanToko && (
        <div className="duo-notif-peti" role="status">
          <span>{pesanToko}</span>
          <button type="button" onClick={() => setPesanToko(null)}>
            Tutup
          </button>
        </div>
      )}

      <div className="duo-grid-toko">
        <article className="duo-item-toko">
          <div className="duo-ikon-toko" aria-hidden="true">❤️</div>
          <div className="duo-info-toko">
            <h4>Isi Penuh Nyawa ({state.nyawa}/{NYAVA_MAKS})</h4>
            <p>Pulihkan seluruh 5 hati agar kamu bisa terus berlatih kuis tanpa jeda.</p>
          </div>
          <button
            type="button"
            className="duo-tombol-toko"
            disabled={state.nyawa >= NYAVA_MAKS || (state.permata ?? 0) < 100}
            onClick={() => {
              bunyiSelesai();
              onBeliNyawa();
              setPesanToko("Nyawa berhasil diisi penuh menjadi 5 ❤️!");
            }}
          >
            {state.nyawa >= NYAVA_MAKS ? "PENUH" : "💎 100"}
          </button>
        </article>

        <article className="duo-item-toko">
          <div className="duo-ikon-toko" aria-hidden="true">🛡️</div>
          <div className="duo-info-toko">
            <h4>Pembeku Rentetan ({state.pelindungRentetan}/3)</h4>
            <p>Melindungi streak harianmu tetap aman walaupun kamu absen latihan satu hari.</p>
          </div>
          <button
            type="button"
            className="duo-tombol-toko"
            disabled={state.pelindungRentetan >= 3 || (state.permata ?? 0) < 150}
            onClick={() => {
              bunyiSelesai();
              onBeliPelindung();
              setPesanToko("Pembeku Rentetan berhasil ditambahkan 🛡️!");
            }}
          >
            {state.pelindungRentetan >= 3 ? "MAKSIMAL" : "💎 150"}
          </button>
        </article>
      </div>
    </section>
  );
}

const DAFTAR_BUNYI_FONETIK = [
  {
    simbol: "/iː/",
    contoh: "tea",
    arti: "teh",
    kalimat: "Tea, please.",
    kategori: "Vokal Panjang"
  },
  {
    simbol: "/ɪ/",
    contoh: "milk",
    arti: "susu",
    kalimat: "Fresh milk every morning.",
    kategori: "Vokal Pendek"
  },
  {
    simbol: "/ɒ/",
    contoh: "coffee",
    arti: "kopi",
    kalimat: "Coffee or tea?",
    kategori: "Vokal Bulat"
  },
  {
    simbol: "/æ/",
    contoh: "family",
    arti: "keluarga",
    kalimat: "I love my family.",
    kategori: "Vokal Depan"
  },
  {
    simbol: "/ʌ/",
    contoh: "study",
    arti: "belajar",
    kalimat: "I study English every day.",
    kategori: "Vokal Tengah"
  },
  {
    simbol: "/ɜː/",
    contoh: "work",
    arti: "bekerja",
    kalimat: "We work together in a team.",
    kategori: "Vokal R-Warna"
  },
  {
    simbol: "/θ/",
    contoh: "thank you",
    arti: "terima kasih",
    kalimat: "Thank you very much.",
    kategori: "Konsonan Dental"
  },
  {
    simbol: "/ð/",
    contoh: "brother",
    arti: "saudara laki-laki",
    kalimat: "My brother is a student.",
    kategori: "Konsonan Bersuara"
  },
  {
    simbol: "/ʃ/",
    contoh: "share",
    arti: "berbagi",
    kalimat: "Let us share our opinion.",
    kategori: "Konsonan Geser"
  }
];

export function LabBunyiBahasa() {
  const [bunyiAktif, setBunyiAktif] = useState(DAFTAR_BUNYI_FONETIK[0]);
  const [modeSuaraGender, setModeSuaraGender] = useState<"perempuan" | "laki">("perempuan");

  return (
    <section className="duo-lab-bunyi" aria-label="Lab Bunyi dan Pelafalan Bahasa Inggris">
      <header className="duo-lab-kepala">
        <div>
          <span className="subjudul-kecil">FONETIK & LISTENING</span>
          <h3>👄 Pelajari Bunyi Bahasa Inggris</h3>
          <p>
            Latih telinga dan pengucapanmu dengan mendengarkan bunyi vokal serta konsonan
            bahasa Inggris dari suara penutur pria maupun wanita.
          </p>
        </div>

        <div className="duo-pemilih-suara" role="group" aria-label="Pilih karakter suara">
          <button
            type="button"
            className={`duo-pil-suara ${modeSuaraGender === "perempuan" ? "aktif" : ""}`}
            onClick={() => {
              bunyiKlik();
              setModeSuaraGender("perempuan");
            }}
          >
            👩 Suara Bu Sari (Wanita)
          </button>
          <button
            type="button"
            className={`duo-pil-suara ${modeSuaraGender === "laki" ? "aktif" : ""}`}
            onClick={() => {
              bunyiKlik();
              setModeSuaraGender("laki");
            }}
          >
            🧔 Suara Pak Aris (Pria)
          </button>
        </div>
      </header>

      <div className="duo-grid-bunyi">
        {DAFTAR_BUNYI_FONETIK.map((item) => {
          const dipilih = bunyiAktif.simbol === item.simbol;
          return (
            <button
              key={item.simbol}
              type="button"
              className={`duo-kartu-bunyi ${dipilih ? "duo-kartu-bunyi--aktif" : ""}`}
              onClick={() => {
                bunyiKlik();
                setBunyiAktif(item);
                ucapkan(`${item.contoh}. ${item.kalimat}`, {
                  gender: modeSuaraGender,
                  rate: 0.92
                });
              }}
            >
              <span className="duo-simbol-ipa">{item.simbol}</span>
              <strong className="duo-contoh-ipa">{item.contoh}</strong>
              <small className="duo-arti-ipa">{item.arti}</small>
              <span className="duo-bar-ipa" />
            </button>
          );
        })}
      </div>

      <div className="duo-detail-bunyi">
        <div>
          <span className="duo-lencana-cefr">{bunyiAktif.kategori}</span>
          <h4>
            Bunyi {bunyiAktif.simbol} pada kata &ldquo;{bunyiAktif.contoh}&rdquo; ({bunyiAktif.arti})
          </h4>
          <p className="duo-kalimat-contoh-ipa">&ldquo;{bunyiAktif.kalimat}&rdquo;</p>
        </div>
        <div className="duo-aksi-bunyi">
          <button
            type="button"
            className="duo-tombol-utama"
            onClick={() =>
              ucapkan(`${bunyiAktif.contoh}. ${bunyiAktif.kalimat}`, {
                gender: modeSuaraGender,
                rate: 0.95
              })
            }
          >
            🔊 Putar Normal
          </button>
          <button
            type="button"
            className="duo-tombol-sekunder"
            onClick={() =>
              ucapkan(`${bunyiAktif.contoh}. ${bunyiAktif.kalimat}`, {
                gender: modeSuaraGender,
                rate: 0.6
              })
            }
          >
            🐢 Putar Lambat
          </button>
        </div>
      </div>
    </section>
  );
}

export interface PanelUlasanSrsProps {
  semuaKartu: KartuSrs[];
  onPerbarui: (kartuBaru: KartuSrs[]) => void;
}

export function PanelUlasanSrs({ semuaKartu, onPerbarui }: PanelUlasanSrsProps) {
  const jatuhTempo = kartuJatuhTempo(semuaKartu);
  const [terbuka, setTerbuka] = useState(false);

  if (semuaKartu.length === 0) {
    return (
      <section className="panel-srs kosong">
        <h4>🗂️ Kartu Ulasan Kosakata (Spaced Repetition)</h4>
        <p>Selesaikan satu level di jalur belajar untuk mulai mengisi kartu kosakatamu.</p>
      </section>
    );
  }

  if (jatuhTempo.length === 0) {
    return (
      <section className="panel-srs selesai">
        <h4>🗂️ Kartu Ulasan Kosakata</h4>
        <p>
          Semua {semuaKartu.length} kartu sudah diulas hari ini. Kembalilah besok untuk menjaga
          ingatan jangka panjang!
        </p>
      </section>
    );
  }

  const aktif = jatuhTempo[0];
  const kataEn = aktif.kosakata?.en ?? aktif.id;
  const kataId = aktif.kosakata?.id ?? "";
  const kataContoh = aktif.kosakata?.contoh ?? "";

  function nilai(benar: boolean) {
    bunyiBenar();
    const diperbarui = jawabKartu(aktif, benar);
    const daftarBaru = semuaKartu.map((k) => (k.id === diperbarui.id ? diperbarui : k));
    setTerbuka(false);
    onPerbarui(daftarBaru);
  }

  return (
    <section className="panel-srs" aria-label="Ulasan kosakata jatuh tempo">
      <header className="kepala-srs">
        <h4>🗂️ Ulasan Kosakata (Spaced Repetition)</h4>
        <span>{jatuhTempo.length} kartu menunggu</span>
      </header>

      <div className="kartu-srs">
        <div className="depan-srs">
          <span className="kata-srs">{kataEn}</span>
          <button
            type="button"
            className="tombol-ucap"
            onClick={() => ucapkan(`${kataEn}. ${kataContoh}`, { gender: "perempuan" })}
          >
            🔊 Dengarkan
          </button>
        </div>

        {terbuka ? (
          <div className="belakang-srs">
            <p className="arti-srs">{kataId}</p>
            {kataContoh && <p className="contoh-srs">&ldquo;{kataContoh}&rdquo;</p>}
            <div className="tombol-nilai-srs">
              <button type="button" className="nilai-ulang" onClick={() => nilai(false)}>
                Ulang Besok
              </button>
              <button type="button" className="nilai-baik" onClick={() => nilai(true)}>
                Sudah Hafal
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="tombol-balik-srs"
            onClick={() => {
              bunyiKlik();
              setTerbuka(true);
            }}
          >
            Tampilkan Arti & Contoh
          </button>
        )}
      </div>
    </section>
  );
}
