/**
 * Mesin kuis interaktif.
 *
 * Mendukung lima tipe soal yang dipakai jalur belajar:
 * `susun-kalimat`, `cocokkan-kata`, `isi-rumpang`, `dengar-ketik`, dan
 * `pilih-terjemahan`.
 *
 * Aturan yang berlaku untuk semua tipe:
 * - jawaban salah TIDAK langsung membuka kunci jawaban, pengguna boleh mencoba
 *   lagi sampai benar (pola "belajar tanpa takut salah"),
 * - tiap jawaban salah mengurangi satu nyawa,
 * - kehabisan nyawa menghentikan level dan pengguna harus mengulang.
 *
 * Seluruh penilaian dilakukan di fungsi murni `nilaiSoal` agar bisa diuji
 * terpisah dari tampilan.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Heart,
  RotateCcw,
  Volume2,
  X
} from "lucide-react";
import type { Soal } from "../domain/jalurBelajar";
import { NYAWA_MAKSIMUM } from "../domain/gamifikasi";

/* ============================== PENILAIAN ============================== */

/** Bandingkan jawaban pengguna dengan jawaban benar secara toleran. */
function samakan(teks: string): string {
  return teks
    .toLowerCase()
    .replace(/[.,!?;:"'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalkan satu pasangan cocokkan-kata ("hello=halo").
 *
 * Pemisah `=` harus dibersihkan dari spasi di sekitarnya, karena pengguna
 * (atau format penyimpanan) bisa menulis "hello = halo". Tanpa langkah ini,
 * pasangan yang isinya sama tetap dianggap berbeda.
 */
function samakanPasangan(pasangan: string): string {
  const [kiri, kanan] = pasangan.split("=");
  return `${samakan(kiri ?? "")}=${samakan(kanan ?? "")}`;
}

/**
 * Nilai satu soal.
 * Fungsi murni — tidak menyentuh DOM maupun localStorage.
 */
export function nilaiSoal(soal: Soal, jawaban: string): boolean {
  if (soal.tipe === "cocokkan-kata") {
    // Jawaban berbentuk pasangan "en=id" yang dipisah "|". Urutan pasangan
    // tidak penting, tetapi setiap pasangan harus tepat.
    const benar = new Set(soal.jawaban.split("|").map(samakanPasangan).filter(Boolean));
    const diberikan = new Set(jawaban.split("|").map(samakanPasangan).filter(Boolean));
    if (benar.size !== diberikan.size) return false;
    for (const pasangan of benar) if (!diberikan.has(pasangan)) return false;
    return true;
  }
  return samakan(soal.jawaban) === samakan(jawaban);
}

/* =============================== KOMPONEN =============================== */

export interface MesinKuisProps {
  /** Soal yang harus dikerjakan, sudah berurutan. */
  soal: Soal[];
  /** Judul level, ditampilkan di kepala kuis. */
  judulLevel: string;
  /** Tingkat CEFR level ini, ditampilkan sebagai chip. */
  tingkat: string;
  /** Dijalankan saat semua soal selesai. */
  onSelesai: (hasil: { benar: number; total: number; nyawaTersisa: number }) => void;
  /** Dijalankan saat pengguna menutup kuis di tengah jalan. */
  onBatal: () => void;
  /**
   * Jumlah nyawa awal. Bila 0, level tidak boleh dimulai dan pengguna harus
   * menunggu pemulihan.
   */
  nyawaAwal: number;
  /** Callback tiap jawaban salah, dipakai induk untuk mengurangi nyawa. */
  onSalah?: () => void;
  /** Callback tiap jawaban benar. */
  onBenar?: () => void;
  /** Putar audio untuk soal `dengar-ketik`. */
  ucapkan?: (teks: string) => void;
}

/** Susun daftar blok yang bisa dipilih, sekaligus melacak blok terpakai. */
function PakaiSusun({
  soal,
  onJawab,
  dinilai
}: {
  soal: Soal;
  onJawab: (teks: string) => void;
  dinilai: boolean;
}) {
  const blokAsli = soal.blok ?? [];
  const [terpakai, setTerpakai] = useState<number[]>([]);

  useEffect(() => {
    setTerpakai([]);
  }, [soal.id]);

  const hasil = terpakai.map((indeks) => blokAsli[indeks]);

  return (
    <div className="kuis-susun">
      <div className="kuis-susun-jawaban" aria-label="Susunan jawabanmu">
        {hasil.length === 0 && <span className="kuis-kosong">Ketuk kata di bawah untuk menyusun kalimat.</span>}
        {terpakai.map((indeks, posisi) => (
          <button
            key={`${indeks}-${posisi}`}
            type="button"
            className="blok-kata terpakai"
            disabled={dinilai}
            onClick={() => setTerpakai((lama) => lama.filter((_, i) => i !== posisi))}
          >
            {blokAsli[indeks]}
          </button>
        ))}
      </div>

      <div className="kuis-susun-bank" aria-label="Pilihan kata">
        {blokAsli.map((kata, indeks) => {
          const dipakai = terpakai.includes(indeks);
          return (
            <button
              key={`${kata}-${indeks}`}
              type="button"
              className={`blok-kata ${dipakai ? "sembunyi" : ""}`}
              disabled={dinilai || dipakai}
              onClick={() => setTerpakai((lama) => [...lama, indeks])}
            >
              {kata}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="primary"
        disabled={dinilai || hasil.length === 0}
        onClick={() => onJawab(hasil.join(" "))}
      >
        Periksa
      </button>
    </div>
  );
}

/** Cocokkan kata: pilih satu kata Inggris, lalu satu arti Indonesia. */
function PakaiCocok({
  soal,
  onJawab,
  dinilai
}: {
  soal: Soal;
  onJawab: (teks: string) => void;
  dinilai: boolean;
}) {
  // Pasangan asli disimpan pada `jawaban` dengan format "en=id|en=id".
  const pasangan = useMemo(
    () =>
      soal.jawaban.split("|").map((item) => {
        const [en, id] = item.split("=");
        return { en: en ?? "", id: id ?? "" };
      }),
    [soal.jawaban]
  );

  const kiri = useMemo(() => pasangan.map((item) => item.en), [pasangan]);
  // Daftar kanan diacak secara deterministik (dibalik) agar tidak selalu urut.
  const kanan = useMemo(() => pasangan.map((item) => item.id).reverse(), [pasangan]);

  const [terpilihKiri, setTerpilihKiri] = useState<string | null>(null);
  const [cocok, setCocok] = useState<Array<{ en: string; id: string }>>([]);

  useEffect(() => {
    setTerpilihKiri(null);
    setCocok([]);
  }, [soal.id]);

  function pilihKanan(id: string) {
    if (!terpilihKiri) return;
    const baru = [...cocok.filter((item) => item.en !== terpilihKiri), { en: terpilihKiri, id }];
    setCocok(baru);
    setTerpilihKiri(null);
  }

  const siapDiperiksa = cocok.length === pasangan.length;

  return (
    <div className="kuis-cocok">
      <div className="kuis-cocok-kolom">
        {kiri.map((kata) => {
          const sudah = cocok.some((item) => item.en === kata);
          return (
            <button
              key={kata}
              type="button"
              className={`kartu-cocok ${terpilihKiri === kata ? "terpilih" : ""} ${sudah ? "selesai" : ""}`}
              disabled={dinilai || sudah}
              onClick={() => setTerpilihKiri(kata)}
            >
              {kata}
            </button>
          );
        })}
      </div>

      <div className="kuis-cocok-tengah" aria-hidden="true">
        {cocok.map((item) => (
          <span key={item.en} className="cocok-pasangan">
            {item.en} <ArrowRight size={14} /> {item.id}
          </span>
        ))}
      </div>

      <div className="kuis-cocok-kolom">
        {kanan.map((arti) => {
          const sudah = cocok.some((item) => item.id === arti);
          return (
            <button
              key={arti}
              type="button"
              className={`kartu-cocok ${sudah ? "selesai" : ""}`}
              disabled={dinilai || sudah || !terpilihKiri}
              onClick={() => pilihKanan(arti)}
            >
              {arti}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="primary"
        disabled={dinilai || !siapDiperiksa}
        onClick={() => onJawab(cocok.map((item) => `${item.en}=${item.id}`).join("|"))}
      >
        Periksa
      </button>
    </div>
  );
}

/** Isi rumpang / pilih terjemahan: pilih satu dari beberapa kartu. */
function PakaiPilihan({
  soal,
  onJawab,
  dinilai,
  terpilih,
  setTerpilih
}: {
  soal: Soal;
  onJawab: (teks: string) => void;
  dinilai: boolean;
  terpilih: string;
  setTerpilih: (nilai: string) => void;
}) {
  return (
    <div className="kuis-pilihan">
      <div className="kuis-pilihan-kartu">
        {(soal.pilihan ?? []).map((pilihan) => (
          <button
            key={pilihan}
            type="button"
            className={`kartu-pilihan ${terpilih === pilihan ? "terpilih" : ""}`}
            disabled={dinilai}
            onClick={() => setTerpilih(pilihan)}
          >
            {pilihan}
          </button>
        ))}
      </div>
      <button type="button" className="primary" disabled={dinilai || !terpilih} onClick={() => onJawab(terpilih)}>
        Periksa
      </button>
    </div>
  );
}

/** Dengar lalu ketik. */
function PakaiDengar({
  soal,
  onJawab,
  dinilai,
  ucapkan
}: {
  soal: Soal;
  onJawab: (teks: string) => void;
  dinilai: boolean;
  ucapkan?: (teks: string) => void;
}) {
  const [teks, setTeks] = useState("");
  const teksAudio = soal.teksAudio ?? soal.jawaban;

  useEffect(() => {
    setTeks("");
    // Putar sekali otomatis supaya pengguna langsung mendengar soalnya.
    ucapkan?.(teksAudio);
    // Sengaja hanya bergantung pada id soal: memutar ulang tiap render akan
    // membuat suara saling menimpa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soal.id]);

  return (
    <div className="kuis-dengar">
      <button type="button" className="tombol-dengar" onClick={() => ucapkan?.(teksAudio)}>
        <Volume2 size={34} aria-hidden="true" />
        <span>Putar lagi</span>
      </button>
      <input
        className="kuis-input"
        value={teks}
        disabled={dinilai}
        placeholder="Ketik kalimat yang kamu dengar…"
        onChange={(event) => setTeks(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && teks.trim()) onJawab(teks);
        }}
      />
      <button type="button" className="primary" disabled={dinilai || !teks.trim()} onClick={() => onJawab(teks)}>
        Periksa
      </button>
    </div>
  );
}

export function MesinKuis({
  soal,
  judulLevel,
  tingkat,
  onSelesai,
  onBatal,
  nyawaAwal,
  onSalah,
  onBenar,
  ucapkan
}: MesinKuisProps) {
  const [indeks, setIndeks] = useState(0);
  const [benar, setBenar] = useState(0);
  const [nyawa, setNyawa] = useState(Math.min(NYAWA_MAKSIMUM, Math.max(0, nyawaAwal)));
  const [dinilai, setDinilai] = useState(false);
  const [hasilBenar, setHasilBenar] = useState(false);
  const [terpilih, setTerpilih] = useState("");
  const [kalah, setKalah] = useState(false);
  /** Kunci agar `onSalah` tidak dipanggil berkali-kali untuk satu kesalahan. */
  const sudahDiHitungRef = useRef(false);

  const soalKini = soal[indeks];
  const total = soal.length;
  const kunciRef = useRef(onSelesai);
  kunciRef.current = onSelesai;

  useEffect(() => {
    setIndeks(0);
    setBenar(0);
    setDinilai(false);
    setHasilBenar(false);
    setTerpilih("");
    setKalah(false);
    sudahDiHitungRef.current = false;
  }, [soal]);

  if (!soalKini) {
    return (
      <div className="kuis-kosong-panel">
        <p>Level ini belum punya soal.</p>
        <button type="button" className="primary" onClick={onBatal}>
          Kembali
        </button>
      </div>
    );
  }

  function periksa(jawabanPengguna: string) {
    if (dinilai) return;
    const tepat = nilaiSoal(soalKini, jawabanPengguna);
    setHasilBenar(tepat);
    setDinilai(true);

    if (tepat) {
      if (!sudahDiHitungRef.current) {
        sudahDiHitungRef.current = true;
        setBenar((lama) => lama + 1);
        onBenar?.();
      }
      return;
    }

    // Salah: kurangi nyawa (sekali per percobaan), jangan buka kunci jawaban.
    if (!sudahDiHitungRef.current) {
      sudahDiHitungRef.current = true;
      onSalah?.();
      setNyawa((lama) => {
        const baru = Math.max(0, lama - 1);
        if (baru === 0) setKalah(true);
        return baru;
      });
    }
  }

  function lanjut() {
    sudahDiHitungRef.current = false;
    setDinilai(false);
    setHasilBenar(false);
    setTerpilih("");
    if (indeks + 1 >= total) {
      kunciRef.current({ benar, total, nyawaTersisa: nyawa });
      return;
    }
    setIndeks((lama) => lama + 1);
  }

  function ulangi() {
    sudahDiHitungRef.current = false;
    setIndeks(0);
    setBenar(0);
    setNyawa(Math.min(NYAWA_MAKSIMUM, Math.max(0, nyawaAwal)));
    setDinilai(false);
    setHasilBenar(false);
    setTerpilih("");
    setKalah(false);
  }

  if (kalah) {
    return (
      <div className="kuis-panel kuis-kalah">
        <span className="kuis-kalah-ikon" aria-hidden="true">
          <Heart size={40} />
        </span>
        <h3>Nyawa habis</h3>
        <p className="muted">
          Tidak apa-apa — mengulang adalah bagian dari belajar. Nyawa pulih satu setiap 30 menit, atau ulangi level ini
          sekarang untuk mencoba lagi.
        </p>
        <div className="kuis-aksi">
          <button type="button" className="primary" onClick={ulangi}>
            <RotateCcw size={16} />
            Coba lagi
          </button>
          <button type="button" className="secondary" onClick={onBatal}>
            Kembali ke peta
          </button>
        </div>
      </div>
    );
  }

  const persenProgres = Math.round((indeks / total) * 100);

  return (
    <div className="kuis-panel">
      <header className="kuis-kepala">
        <div className="kuis-kepala-kiri">
          <button type="button" className="kuis-tutup" onClick={onBatal} aria-label="Tutup kuis">
            <X size={20} />
          </button>
          <div>
            <span className="kuis-tingkat">{tingkat}</span>
            <strong>{judulLevel}</strong>
          </div>
        </div>
        <div className="kuis-kepala-kanan">
          <span className="kuis-hitung">
            Soal {indeks + 1}/{total}
          </span>
          <span className="kuis-nyawa" aria-label={`Nyawa tersisa ${nyawa}`}>
            <Heart size={18} aria-hidden="true" />
            {nyawa}
          </span>
        </div>
      </header>

      <div className="kuis-progres" aria-hidden="true">
        <span className="kuis-progres-isi" style={{ width: `${persenProgres}%` }} />
      </div>

      <div className="kuis-isi">
        <h3 className="kuis-pertanyaan">{soalKini.pertanyaan}</h3>

        {soalKini.tipe === "susun-kalimat" && (
          <PakaiSusun soal={soalKini} onJawab={periksa} dinilai={dinilai} />
        )}
        {soalKini.tipe === "cocokkan-kata" && (
          <PakaiCocok soal={soalKini} onJawab={periksa} dinilai={dinilai} />
        )}
        {(soalKini.tipe === "isi-rumpang" || soalKini.tipe === "pilih-terjemahan") && (
          <PakaiPilihan
            soal={soalKini}
            onJawab={periksa}
            dinilai={dinilai}
            terpilih={terpilih}
            setTerpilih={setTerpilih}
          />
        )}
        {soalKini.tipe === "dengar-ketik" && (
          <PakaiDengar soal={soalKini} onJawab={periksa} dinilai={dinilai} ucapkan={ucapkan} />
        )}
      </div>

      {dinilai && (
        <footer className={`kuis-umpan-balik ${hasilBenar ? "benar" : "salah"}`} role="status">
          <div className="kuis-umpan-balik-ikon" aria-hidden="true">
            {hasilBenar ? <Check size={22} /> : <X size={22} />}
          </div>
          <div>
            <strong>{hasilBenar ? "Tepat sekali!" : "Belum tepat — coba lagi."}</strong>
            <span>
              {hasilBenar
                ? "Jawabanmu benar. Lanjut ke soal berikutnya."
                : "Coba susun ulang jawabanmu. Nyawamu berkurang satu."}
            </span>
          </div>
          <button type="button" className="primary" onClick={lanjut} autoFocus>
            {indeks + 1 >= total ? "Selesai" : "Lanjut"}
            <ArrowRight size={16} />
          </button>
        </footer>
      )}
    </div>
  );
}

export default MesinKuis;
