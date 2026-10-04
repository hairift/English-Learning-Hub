/**
 * Panel placement test dan pengulangan berjadwal (SRS).
 *
 * **Placement test** menebak tingkat CEFR pengguna dengan soal bertingkat,
 * supaya mereka tidak perlu mulai dari sapaan bila sudah bisa banyak.
 *
 * **Pengulangan berjadwal** menampilkan kartu kosakata yang sudah jatuh tempo
 * hari ini, memakai interval berbasis kurva lupa dari `domain/srs`.
 */

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarClock, Check, GraduationCap, RotateCcw, X } from "lucide-react";
import {
  BANK_PENEMPATAN,
  URUTAN_TINGKAT,
  jawabKartu,
  kartuJatuhTempo,
  nilaiPenempatan,
  ringkasSrs,
  type HasilPenempatan,
  type KartuSrs
} from "../domain/srs";
import { getShanghaiDate } from "../domain/checkin";

/* ============================ PLACEMENT TEST ============================ */

export interface PlacementTestProps {
  /** Hasil sebelumnya, bila pengguna pernah mengerjakan. */
  hasilTersimpan: HasilPenempatan | null;
  /** Dipanggil setelah tes selesai dinilai. */
  onSelesai: (hasil: HasilPenempatan) => void;
  /** Dijalankan saat pengguna menutup tanpa menyelesaikan. */
  onBatal: () => void;
}

export function PlacementTest({ hasilTersimpan, onSelesai, onBatal }: PlacementTestProps) {
  const [langkah, setLangkah] = useState(0);
  const [jawaban, setJawaban] = useState<Record<string, string>>({});
  const [selesai, setSelesai] = useState(false);

  // Soal dikelompokkan per tingkat agar pengguna melihat "naik tangga".
  const urut = useMemo(
    () =>
      URUTAN_TINGKAT.flatMap((tingkat) => BANK_PENEMPATAN.filter((soal) => soal.tingkat === tingkat)),
    []
  );

  useEffect(() => {
    setLangkah(0);
    setJawaban({});
    setSelesai(false);
  }, []);

  const soalKini = urut[langkah];
  const hasil = useMemo(() => (selesai ? nilaiPenempatan(jawaban) : null), [selesai, jawaban]);

  if (selesai && hasil) {
    return (
      <div className="kuis-panel placement-hasil">
        <span className="placement-lencana" aria-hidden="true">
          <GraduationCap size={40} />
        </span>
        <h3>Tingkatmu: {hasil.tingkat}</h3>
        <p className="placement-ringkasan">{hasil.ringkasan}</p>

        <ul className="placement-rincian">
          {hasil.rincian.map((baris) => (
            <li key={baris.tingkat} className={baris.benar >= Math.ceil(baris.total * 0.67) ? "lulus" : ""}>
              <span className="placement-tingkat">{baris.tingkat}</span>
              <span className="placement-skor">
                {baris.benar}/{baris.total} benar
              </span>
            </li>
          ))}
        </ul>

        <div className="kuis-aksi">
          <button type="button" className="primary" onClick={() => onSelesai(hasil)}>
            Mulai belajar di tingkat ini
            <ArrowRight size={16} />
          </button>
          <button type="button" className="secondary" onClick={onBatal}>
            Nanti saja
          </button>
        </div>
      </div>
    );
  }

  if (!soalKini) {
    return (
      <div className="kuis-panel">
        <p className="muted">Bank soal penempatan kosong.</p>
        <button type="button" className="secondary" onClick={onBatal}>
          Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="kuis-panel placement-panel">
      <header className="kuis-kepala">
        <div className="kuis-kepala-kiri">
          <button type="button" className="kuis-tutup" onClick={onBatal} aria-label="Tutup tes penempatan">
            <X size={20} />
          </button>
          <div>
            <span className="kuis-tingkat">Tes Penempatan</span>
            <strong>
              Tingkat {soalKini.tingkat} · soal {langkah + 1}/{urut.length}
            </strong>
          </div>
        </div>
        {hasilTersimpan && (
          <span className="placement-sebelumnya">Terakhir: {hasilTersimpan.tingkat}</span>
        )}
      </header>

      <div className="kuis-progres" aria-hidden="true">
        <span className="kuis-progres-isi" style={{ width: `${Math.round((langkah / urut.length) * 100)}%` }} />
      </div>

      <div className="kuis-isi">
        <h3 className="kuis-pertanyaan">{soalKini.pertanyaan}</h3>
        <div className="kuis-pilihan-kartu">
          {soalKini.pilihan.map((pilihan) => (
            <button
              key={pilihan}
              type="button"
              className={`kartu-pilihan ${jawaban[soalKini.id] === pilihan ? "terpilih" : ""}`}
              onClick={() => {
                setJawaban((lama) => ({ ...lama, [soalKini.id]: pilihan }));
                if (langkah + 1 >= urut.length) window.setTimeout(() => setSelesai(true), 180);
                else setLangkah((lama) => lama + 1);
              }}
            >
              {pilihan}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================= SRS ================================= */

export interface PanelSrsProps {
  kartu: KartuSrs[];
  /** Simpan hasil jawaban sebuah kartu. */
  onJawab: (kartuBaru: KartuSrs) => void;
  /** Muat kartu dari seluruh kosakata unit tertentu. */
  onMuatKosakata?: () => void;
}

export function PanelSrs({ kartu, onJawab, onMuatKosakata }: PanelSrsProps) {
  const hariIni = getShanghaiDate();
  const ringkasan = useMemo(() => ringkasSrs(kartu), [kartu]);
  const jatuhTempo = useMemo(() => kartuJatuhTempo(kartu, hariIni), [kartu, hariIni]);

  const [indeks, setIndeks] = useState(0);
  const [diBalik, setDiBalik] = useState(false);

  const kartuKini = jatuhTempo[Math.min(indeks, Math.max(0, jatuhTempo.length - 1))];

  useEffect(() => {
    setIndeks(0);
    setDiBalik(false);
  }, [card_key(kartu)]);

  function jawab(benar: boolean) {
    if (!kartuKini) return;
    onJawab(jawabKartu(kartuKini, benar, hariIni));
    setDiBalik(false);
    setIndeks((lama) => lama + 1);
  }

  if (kartu.length === 0) {
    return (
      <section className="panel panel-srs">
        <header className="panel-srs-kepala">
          <div>
            <span className="eyebrow">Pengulangan Berjadwal</span>
            <h3>Kotak Kosakata</h3>
          </div>
        </header>
        <p className="muted">
          Belum ada kartu. Selesaikan level pertamamu, lalu tekan tombol di bawah untuk memasukkan kosakatanya ke kotak
          pengulangan.
        </p>
        {onMuatKosakata && (
          <button type="button" className="primary" onClick={onMuatKosakata}>
            Muat kosakata dari level yang sudah lulus
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="panel panel-srs">
      <header className="panel-srs-kepala">
        <div>
          <span className="eyebrow">Pengulangan Berjadwal</span>
          <h3>Kotak Kosakata</h3>
        </div>
        <div className="srs-ringkas">
          <span className="srs-chip srs-dikuasai">{ringkasan.dikuasai} dikuasai</span>
          <span className="srs-chip srs-perlu">{ringkasan.perluDiulang} perlu diulang</span>
          <span className="srs-chip srs-baru">{ringkasan.baru} baru</span>
        </div>
      </header>

      {jatuhTempo.length === 0 ? (
        <div className="srs-selesai-hari-ini">
          <span className="srs-selesai-ikon" aria-hidden="true">
            <CalendarClock size={32} />
          </span>
          <p>
            <strong>Semua kartu sudah diulang hari ini.</strong>
            <br />
            Kosakata berikutnya akan muncul sesuai jadwal kurva lupa — makin kuat ingatanmu, makin jarang diulang.
          </p>
        </div>
      ) : (
        <div className="srs-kartu">
          <span className="srs-kartu-hitung">
            Kartu {Math.min(indeks + 1, jatuhTempo.length)}/{jatuhTempo.length} · penguasaan{" "}
            {"★".repeat(kartuKini.tingkat)}
            {"☆".repeat(Math.max(0, 5 - kartuKini.tingkat))}
          </span>

          <button type="button" className="srs-kartu-depan" onClick={() => setDiBalik(true)} aria-label="Balik kartu">
            <strong>{kartuKini.kosakata.en}</strong>
            {!diBalik && <span className="srs-petunjuk">Ketuk untuk melihat artinya</span>}
            {diBalik && (
              <span className="srs-jawaban">
                {kartuKini.kosakata.id}
                {kartuKini.kosakata.contoh && <em>{kartuKini.kosakata.contoh}</em>}
              </span>
            )}
          </button>

          {diBalik && (
            <div className="kuis-aksi">
              <button type="button" className="primary" onClick={() => jawab(true)}>
                <Check size={16} />
                Sudah ingat
              </button>
              <button type="button" className="secondary" onClick={() => jawab(false)}>
                <RotateCcw size={16} />
                Ulangi besok
              </button>
            </div>
          )}
        </div>
      )}

      {onMuatKosakata && (
        <button type="button" className="secondary srs-muat" onClick={onMuatKosakata}>
          Tambah kosakata dari level yang sudah lulus
        </button>
      )}
    </section>
  );
}

/**
 * Kunci ringkas untuk mendeteksi perubahan daftar kartu.
 * Dipakai agar posisi kartu direset saat daftar benar-benar berubah, tanpa
 * mereset tiap render.
 */
function card_key(kartu: KartuSrs[]): string {
  return kartu.map((item) => `${item.id}:${item.tingkat}:${item.jatuhTempo}`).join("|");
}

export default PlacementTest;
