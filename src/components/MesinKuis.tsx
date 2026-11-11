import React, { useEffect, useMemo, useState } from "react";
import type { LevelJalur, PasanganKata, Soal, UnitJalur } from "../domain/jalurBelajar";
import { NYAVA_MAKS } from "../domain/gamifikasi";
import { bersihkanSuara, ucapkan } from "../suaraBrowser";
import { bunyiBenar, bunyiKlik, bunyiSalah, bunyiSelesai } from "../efekSuara";
import { simpanPercobaanKuis } from "../storage";
import {
  IlustrasiKosakata,
  Karakter2D,
  MaskotCendekia,
  infoKarakter
} from "./KarakterAnimasi";

export interface MesinKuisProps {
  unit: UnitJalur;
  level: LevelJalur;
  nyawa: number;
  onSalahJawab?: () => void;
  onSelesai: (hasil: { benar: number; total: number; xpDapat: number }) => void;
  onKeluar: () => void;
}

export function normalkanTeks(teks: string): string {
  return teks
    .toLowerCase()
    .replace(/[.,!?;:'"()\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalkanPasangan(teks: string): string[] {
  return teks
    .split(/[|;]/)
    .map((bagian) =>
      bagian
        .split("=")
        .map((s) => s.trim().toLowerCase())
        .join("=")
    )
    .filter((s) => s.includes("=") && !s.endsWith("="))
    .sort();
}

export function nilaiSoal(soal: Soal, jawabanPengguna: string): boolean {
  if (!jawabanPengguna.trim()) return false;
  if (soal.tipe === "cocokkan-pasangan" || soal.tipe === "cocokkan-kata") {
    const target = normalkanPasangan(soal.jawaban);
    const jawab = normalkanPasangan(jawabanPengguna);
    if (target.length === 0 || target.length !== jawab.length) return false;
    return target.every((item, idx) => item === jawab[idx]);
  }
  return normalkanTeks(jawabanPengguna) === normalkanTeks(soal.jawaban);
}

interface CatatanUlasanSoal {
  soal: Soal;
  jawabanPengguna: string;
  benar: boolean;
}

export function MesinKuis({
  unit,
  level,
  nyawa,
  onSalahJawab,
  onSelesai,
  onKeluar
}: MesinKuisProps) {
  const daftarSoal = level.soal;
  const [indeks, setIndeks] = useState(0);
  const [jumlahBenar, setJumlahBenar] = useState(0);
  const [statusJawab, setStatusJawab] = useState<"belum" | "benar" | "salah">("belum");
  const [selesai, setSelesai] = useState(false);
  const [sedangBicara, setSedangBicara] = useState(false);
  const [riwayatUlasan, setRiwayatUlasan] = useState<CatatanUlasanSoal[]>([]);
  const [bukaModalUlasan, setBukaModalUlasan] = useState(false);
  const [indeksKartuTerbuka, setIndeksKartuTerbuka] = useState<number | null>(null);

  // State khusus per tipe soal
  const [blokTerpilih, setBlokTerpilih] = useState<number[]>([]);
  const [pilihanTerpilih, setPilihanTerpilih] = useState<string>("");
  const [ketikanDengar, setKetikanDengar] = useState<string>("");
  const [modeKetikManual, setModeKetikManual] = useState<boolean>(false);
  const [kiriTerpilih, setKiriTerpilih] = useState<string | null>(null);
  const [pasanganCocok, setPasanganCocok] = useState<Record<string, string>>({});
  const [pasanganSalah, setPasanganSalah] = useState<string | null>(null);

  const soalAktif: Soal | undefined = daftarSoal[indeks];
  const dataKarakterUtama = infoKarakter(soalAktif?.karakter);

  // Daftar blok kata untuk soal susun-kalimat atau dengar-ketik (bank kata)
  const daftarKataBank = useMemo(() => {
    if (!soalAktif) return [];
    if (soalAktif.tipe === "susun-kalimat") {
      return [...(soalAktif.blok ?? []), ...(soalAktif.kataPengecoh ?? [])];
    }
    if (soalAktif.tipe === "dengar-ketik") {
      const kataUtama = soalAktif.jawaban.replace(/[.,!?]/g, "").split(" ");
      const pengecoh = soalAktif.kataPengecoh ?? ["water", "please", "today"];
      const gabungan = [...kataUtama, ...pengecoh];
      // Putar deterministik berdasarkan id soal
      const geser = soalAktif.id.length % Math.max(1, gabungan.length);
      return [...gabungan.slice(geser), ...gabungan.slice(0, geser)];
    }
    return [];
  }, [soalAktif]);

  // Reset state lokal setiap kali berpindah soal
  useEffect(() => {
    setStatusJawab("belum");
    setBlokTerpilih([]);
    setPilihanTerpilih("");
    setKetikanDengar("");
    setModeKetikManual(false);
    setKiriTerpilih(null);
    setPasanganCocok({});
    setPasanganSalah(null);
  }, [indeks, level.id]);

  function putarSuaraKalimat(teks: string, lambat = false) {
    setSedangBicara(true);
    ucapkan(teks, {
      gender: dataKarakterUtama.gender,
      rate: lambat ? 0.6 : 0.95,
      onEnd: () => setSedangBicara(false)
    });
  }

  // Otomatis bacakan kalimat bahasa Inggris saat soal baru muncul
  useEffect(() => {
    if (!soalAktif || selesai) return;
    const teksBaca =
      soalAktif.tipe === "dengar-ketik"
        ? soalAktif.jawaban
        : soalAktif.kalimatSuara;
    if (teksBaca) {
      putarSuaraKalimat(teksBaca, false);
    }
    return () => {
      bersihkanSuara();
      setSedangBicara(false);
    };
  }, [indeks, soalAktif?.id, selesai]);

  const kolomKananCocok = useMemo(() => {
    if (!soalAktif || soalAktif.tipe !== "cocokkan-pasangan" || !soalAktif.pasangan) {
      return [];
    }
    const asli = soalAktif.pasangan.map((p) => p.id);
    if (asli.length <= 1) return asli;
    return [...asli.slice(1), asli[0]];
  }, [soalAktif]);

  if (selesai) {
    const total = daftarSoal.length;
    const persen = total > 0 ? Math.round((jumlahBenar / total) * 100) : 0;
    const xpDapat = Math.max(5, Math.round((jumlahBenar / Math.max(1, total)) * level.xp));
    const labelAkurasi = persen >= 90 ? "SEMPURNA" : persen >= 70 ? "BAGUS" : "LUMAYAN";

    return (
      <div className="duo-layar-kuis duo-layar-selesai">
        <div className="duo-selesai-isi">
          <div className="duo-panggung-selebrasi">
            <MaskotCendekia ukuran={128} pose="juara" />
            <Karakter2D
              karakter="bapak-dosen"
              ukuran={118}
              ekspresi="senang"
              sedangBicara={false}
            />
          </div>

          <h2 className="duo-judul-selesai">Pelajaran Selesai!</h2>
          <p className="duo-subjudul-selesai">
            {unit.judulId} · {level.judul}
          </p>

          <div className="duo-kartu-stat-grid">
            <div className="duo-kartu-stat duo-kartu-stat--emas">
              <div className="duo-kartu-stat-kepala">TOTAL XP</div>
              <div className="duo-kartu-stat-nilai">
                <span aria-hidden="true">⚡</span> {xpDapat}
              </div>
            </div>

            <div className="duo-kartu-stat duo-kartu-stat--hijau">
              <div className="duo-kartu-stat-kepala">{labelAkurasi}</div>
              <div className="duo-kartu-stat-nilai">
                <span aria-hidden="true">🎯</span> {persen}%
              </div>
            </div>
          </div>
        </div>

        <footer className="duo-bilah-bawah">
          <div className="duo-bilah-bawah-dalam">
            <button
              type="button"
              className="duo-tombol-sekunder"
              onClick={() => {
                bunyiKlik();
                setBukaModalUlasan(true);
              }}
            >
              ULAS PELAJARAN
            </button>

            <button
              type="button"
              className="duo-tombol-utama"
              onClick={() => {
                bunyiKlik();
                onSelesai({ benar: jumlahBenar, total, xpDapat });
              }}
            >
              LANJUTKAN
            </button>
          </div>
        </footer>

        {bukaModalUlasan && (
          <div
            className="duo-modal-latar"
            role="dialog"
            aria-modal="true"
            aria-label="Cek kartu skormu"
          >
            <div className="duo-modal-ulasan">
              <button
                type="button"
                className="duo-modal-tutup"
                onClick={() => setBukaModalUlasan(false)}
                aria-label="Tutup ulasan"
              >
                ✕
              </button>
              <h3 className="duo-modal-judul">Cek kartu skormu!</h3>
              <p className="duo-modal-subjudul">
                Klik kotak-kotak di bawah ini untuk membuka solusinya
              </p>

              <div className="duo-grid-kartu-skor">
                {riwayatUlasan.map((item, idx) => {
                  const terbuka = indeksKartuTerbuka === idx;
                  return (
                    <button
                      key={item.soal.id}
                      type="button"
                      className={`duo-kartu-skor ${
                        item.benar ? "duo-kartu-skor--benar" : "duo-kartu-skor--salah"
                      } ${terbuka ? "duo-kartu-skor--terbuka" : ""}`}
                      onClick={() => {
                        bunyiKlik();
                        setIndeksKartuTerbuka(terbuka ? null : idx);
                        if (item.soal.kalimatSuara) {
                          putarSuaraKalimat(item.soal.kalimatSuara, false);
                        }
                      }}
                    >
                      <div className="duo-kartu-skor-atas">
                        <span className="duo-kartu-skor-tanya">
                          {item.soal.dialogAtas
                            ? `A: ${item.soal.dialogAtas}`
                            : item.soal.pertanyaan}
                        </span>
                        <span className="duo-kartu-skor-ikon">
                          {item.benar ? "✓" : "✕"}
                        </span>
                      </div>

                      <div className="duo-kartu-skor-isi">
                        {terbuka ? (
                          <>
                            <small>Solusi tepat:</small>
                            <strong>{item.soal.jawaban}</strong>
                            {!item.benar && item.jawabanPengguna && (
                              <small className="duo-kartu-skor-jawabanmu">
                                Jawabanmu: {item.jawabanPengguna}
                              </small>
                            )}
                          </>
                        ) : (
                          <span>{item.soal.kalimatSuara ?? item.soal.jawaban}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!soalAktif) return null;

  function ambilJawabanSaatIni(): string {
    if (!soalAktif) return "";
    if (soalAktif.tipe === "susun-kalimat") {
      return blokTerpilih.map((i) => daftarKataBank[i]).join(" ");
    }
    if (soalAktif.tipe === "isi-rumpang" || soalAktif.tipe === "pilih-terjemahan") {
      return pilihanTerpilih;
    }
    if (soalAktif.tipe === "dengar-ketik") {
      if (modeKetikManual) return ketikanDengar;
      if (blokTerpilih.length > 0) {
        return blokTerpilih.map((i) => daftarKataBank[i]).join(" ");
      }
      return ketikanDengar;
    }
    if (soalAktif.tipe === "cocokkan-pasangan") {
      const pasangan = soalAktif.pasangan ?? [];
      return pasangan.map((p) => `${p.en}=${pasanganCocok[p.en] ?? ""}`).join(";");
    }
    return "";
  }

  function periksaJawaban() {
    if (!soalAktif || statusJawab !== "belum") return;
    const jawaban = ambilJawabanSaatIni();
    const benar = nilaiSoal(soalAktif, jawaban);

    simpanPercobaanKuis({
      kategori: soalAktif.kategori ?? "grammar",
      benar,
      pertanyaan: soalAktif.pertanyaan,
      jawabanPengguna: jawaban,
      jawabanBenar: soalAktif.jawaban
    });

    setRiwayatUlasan((lama) => [
      ...lama,
      { soal: soalAktif, jawabanPengguna: jawaban, benar }
    ]);

    if (benar) {
      bunyiBenar();
      setJumlahBenar((n) => n + 1);
      setStatusJawab("benar");
    } else {
      bunyiSalah();
      setStatusJawab("salah");
      onSalahJawab?.();
    }
  }

  function lompatiSoal() {
    if (!soalAktif || statusJawab !== "belum") return;
    bunyiSalah();
    simpanPercobaanKuis({
      kategori: soalAktif.kategori ?? "listening",
      benar: false,
      pertanyaan: soalAktif.pertanyaan,
      jawabanPengguna: "(dilompati)",
      jawabanBenar: soalAktif.jawaban
    });
    setRiwayatUlasan((lama) => [
      ...lama,
      { soal: soalAktif, jawabanPengguna: "(dilompati)", benar: false }
    ]);
    setStatusJawab("salah");
  }

  function lanjutSoalBerikutnya() {
    bunyiKlik();
    if (indeks + 1 >= daftarSoal.length) {
      bunyiSelesai();
      setSelesai(true);
    } else {
      setIndeks((i) => i + 1);
    }
  }

  function pilihBlok(indeksBlok: number) {
    if (statusJawab !== "belum") return;
    bunyiKlik();
    const kata = daftarKataBank[indeksBlok];
    if (kata && /^[a-zA-Z']+$/i.test(kata)) {
      ucapkan(kata, { gender: dataKarakterUtama.gender, rate: 0.98 });
    }
    setBlokTerpilih((sebelum) =>
      sebelum.includes(indeksBlok)
        ? sebelum.filter((i) => i !== indeksBlok)
        : [...sebelum, indeksBlok]
    );
  }

  function pilihKataCocok(sisi: "kiri" | "kanan", nilai: string) {
    if (statusJawab !== "belum" || !soalAktif) return;
    bunyiKlik();
    setPasanganSalah(null);
    if (sisi === "kiri") {
      if (pasanganCocok[nilai]) return;
      ucapkan(nilai, { gender: dataKarakterUtama.gender, rate: 0.98 });
      setKiriTerpilih(nilai === kiriTerpilih ? null : nilai);
      return;
    }
    if (!kiriTerpilih) return;
    const pasanganAsli: PasanganKata | undefined = soalAktif.pasangan?.find(
      (p) => p.en === kiriTerpilih
    );
    if (pasanganAsli && pasanganAsli.id === nilai) {
      const baru = { ...pasanganCocok, [kiriTerpilih]: nilai };
      setPasanganCocok(baru);
      setKiriTerpilih(null);
      if (
        soalAktif.pasangan &&
        Object.keys(baru).length === soalAktif.pasangan.length
      ) {
        bunyiBenar();
        setJumlahBenar((n) => n + 1);
        setStatusJawab("benar");
        setRiwayatUlasan((lama) => [
          ...lama,
          { soal: soalAktif, jawabanPengguna: soalAktif.jawaban, benar: true }
        ]);
      }
    } else {
      bunyiSalah();
      setPasanganSalah(`${kiriTerpilih}:${nilai}`);
      setKiriTerpilih(null);
      onSalahJawab?.();
    }
  }

  const siapPeriksa = (() => {
    if (soalAktif.tipe === "susun-kalimat") return blokTerpilih.length > 0;
    if (soalAktif.tipe === "isi-rumpang" || soalAktif.tipe === "pilih-terjemahan") {
      return pilihanTerpilih.length > 0;
    }
    if (soalAktif.tipe === "dengar-ketik") {
      return modeKetikManual
        ? ketikanDengar.trim().length > 0
        : blokTerpilih.length > 0 || ketikanDengar.trim().length > 0;
    }
    return false;
  })();

  // Pintasan keyboard angka 1-4 dan Enter seperti di Duolingo Web
  useEffect(() => {
    function tanganiTombol(e: KeyboardEvent) {
      if (selesai || !soalAktif) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === "Enter") {
          e.preventDefault();
          if (statusJawab === "belum" && siapPeriksa) periksaJawaban();
          else if (statusJawab !== "belum") lanjutSoalBerikutnya();
        }
        return;
      }

      if (
        statusJawab === "belum" &&
        (soalAktif.tipe === "pilih-terjemahan" || soalAktif.tipe === "isi-rumpang") &&
        soalAktif.pilihan
      ) {
        const angka = Number(e.key);
        if (angka >= 1 && angka <= soalAktif.pilihan.length) {
          const opsi = soalAktif.pilihan[angka - 1];
          if (opsi) {
            bunyiKlik();
            setPilihanTerpilih(opsi);
            if (/^[a-zA-Z\s.,!?']+$/i.test(opsi)) {
              ucapkan(opsi, { gender: dataKarakterUtama.gender, rate: 0.96 });
            }
          }
        }
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (statusJawab === "belum" && siapPeriksa) periksaJawaban();
        else if (statusJawab !== "belum") lanjutSoalBerikutnya();
      }
    }

    window.addEventListener("keydown", tanganiTombol);
    return () => window.removeEventListener("keydown", tanganiTombol);
  });

  const persenKemajuan = Math.round(((indeks + (statusJawab !== "belum" ? 1 : 0)) / daftarSoal.length) * 100);

  return (
    <div className="duo-layar-kuis">
      {/* Bilah progres dan nyawa di bagian atas */}
      <header className="duo-kepala-kuis">
        <button
          type="button"
          className="duo-tombol-keluar"
          onClick={onKeluar}
          aria-label="Keluar dari kuis"
        >
          ✕
        </button>

        <div
          className="duo-batang-progres"
          role="progressbar"
          aria-valuenow={indeks + 1}
          aria-valuemin={1}
          aria-valuemax={daftarSoal.length}
        >
          <div
            className="duo-isi-progres"
            style={{ width: `${Math.max(8, persenKemajuan)}%` }}
          >
            <div className="duo-kilau-progres" />
          </div>
        </div>

        <div className="duo-indikator-nyawa" aria-label={`Nyawa tersisa ${nyawa} dari ${NYAVA_MAKS}`}>
          <span className="duo-ikon-hati" aria-hidden="true">❤️</span>
          <span className="duo-angka-hati">{nyawa}</span>
        </div>
      </header>

      {/* Panggung Utama Soal */}
      <main className="duo-panggung-soal">
        {soalAktif.labelAtas && (
          <div className="duo-lencana-kategori">
            <span className="duo-lencana-ikon" aria-hidden="true">✦</span>
            <span>{soalAktif.labelAtas}</span>
          </div>
        )}

        <h2 className="duo-judul-pertanyaan">{soalAktif.pertanyaan}</h2>

        {/* Tampilan Dialog Dua Karakter (seperti Screenshot 4 "Lengkapi kalimatnya") */}
        {soalAktif.dialogAtas && soalAktif.lawanBicara ? (
          <div className="duo-panggung-dialog">
            <div className="duo-baris-dialog duo-baris-dialog--kiri">
              <Karakter2D
                karakter={soalAktif.karakter ?? "mahasiswa"}
                ukuran={92}
                sedangBicara={sedangBicara}
                menghadap="kanan"
              />
              <div className="duo-balon-bicara">
                <button
                  type="button"
                  className="duo-tombol-suara-mini"
                  onClick={() => putarSuaraKalimat(soalAktif.dialogAtas!, false)}
                  aria-label="Dengarkan kalimat"
                >
                  🔊
                </button>
                <span className="duo-teks-balon">{soalAktif.dialogAtas}</span>
              </div>
            </div>

            <div className="duo-baris-dialog duo-baris-dialog--kanan">
              <div className="duo-balon-bicara duo-balon-bicara--balasan">
                <span className="duo-isian-balon">
                  {pilihanTerpilih || "________"}
                </span>
              </div>
              <Karakter2D
                karakter={soalAktif.lawanBicara}
                ukuran={92}
                ekspresi={statusJawab === "benar" ? "senang" : "normal"}
                menghadap="kiri"
              />
            </div>
          </div>
        ) : soalAktif.tipe !== "dengar-ketik" &&
          soalAktif.tipe !== "cocokkan-pasangan" &&
          !soalAktif.bergambar ? (
          /* Tampilan Karakter 2D Tunggal + Balon Ucapan (seperti Screenshot 2 & 3) */
          <div className="duo-baris-karakter">
            <Karakter2D
              karakter={soalAktif.karakter ?? "ibu-dosen"}
              ukuran={106}
              sedangBicara={sedangBicara}
              ekspresi={statusJawab === "benar" ? "senang" : "normal"}
            />
            {(soalAktif.kalimatSuara || soalAktif.petunjuk) && (
              <div className="duo-balon-bicara">
                {soalAktif.kalimatSuara && (
                  <button
                    type="button"
                    className="duo-tombol-suara-mini"
                    onClick={() => putarSuaraKalimat(soalAktif.kalimatSuara!, false)}
                    aria-label="Putar suara"
                  >
                    🔊
                  </button>
                )}
                <div className="duo-konten-balon">
                  <span className="duo-teks-balon-utama">
                    {soalAktif.petunjuk ?? soalAktif.kalimatSuara}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* 1. SOAL KARTU KOSAKATA BERGAMBAR (Screenshot 1) */}
        {soalAktif.tipe === "pilih-terjemahan" && soalAktif.bergambar && (
          <div className="duo-grid-kartu-gambar" role="radiogroup" aria-label="Pilihan gambar kosakata">
            {(soalAktif.pilihan ?? []).map((opsi, idx) => {
              const aktif = pilihanTerpilih === opsi;
              return (
                <button
                  key={opsi}
                  type="button"
                  className={`duo-kartu-gambar ${aktif ? "duo-kartu-gambar--aktif" : ""}`}
                  onClick={() => {
                    if (statusJawab !== "belum") return;
                    bunyiKlik();
                    setPilihanTerpilih(opsi);
                    ucapkan(opsi, { gender: dataKarakterUtama.gender, rate: 0.95 });
                  }}
                >
                  <div className="duo-ilustrasi-wadah">
                    <IlustrasiKosakata kata={opsi} ukuran={96} />
                  </div>
                  <div className="duo-kartu-gambar-bawah">
                    <span className="duo-kartu-gambar-kata">{opsi}</span>
                    <span className="duo-lencana-angka">{idx + 1}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* 2. SOAL PILIHAN GANDA BERNOMOR (Screenshot 3 & 4) */}
        {(soalAktif.tipe === "isi-rumpang" ||
          (soalAktif.tipe === "pilih-terjemahan" && !soalAktif.bergambar)) && (
          <div className="duo-daftar-pilihan" role="radiogroup" aria-label="Pilihan jawaban">
            {(soalAktif.pilihan ?? []).map((opsi, idx) => {
              const aktif = pilihanTerpilih === opsi;
              return (
                <button
                  key={opsi}
                  type="button"
                  className={`duo-opsi-baris ${aktif ? "duo-opsi-baris--aktif" : ""}`}
                  onClick={() => {
                    if (statusJawab !== "belum") return;
                    bunyiKlik();
                    setPilihanTerpilih(opsi);
                    if (/^[a-zA-Z\s.,!?']+$/i.test(opsi)) {
                      ucapkan(opsi, { gender: dataKarakterUtama.gender, rate: 0.95 });
                    }
                  }}
                >
                  <span className="duo-lencana-angka">{idx + 1}</span>
                  <span className="duo-opsi-teks">{opsi}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* 3. SOAL SUSUN KALIMAT (Screenshot 2) */}
        {soalAktif.tipe === "susun-kalimat" && (
          <div className="duo-wadah-susun">
            <div className="duo-garis-jawaban" aria-label="Kalimat yang disusun">
              {blokTerpilih.length === 0 ? (
                <span className="duo-placeholder-garis">
                  Klik kata-kata di bawah untuk menyusun kalimat...
                </span>
              ) : (
                blokTerpilih.map((idxBlok) => (
                  <button
                    key={`terpilih-${idxBlok}`}
                    type="button"
                    className="duo-keping-kata duo-keping-kata--terpilih"
                    onClick={() => pilihBlok(idxBlok)}
                  >
                    {daftarKataBank[idxBlok]}
                  </button>
                ))
              )}
            </div>

            <div className="duo-bank-kata" aria-label="Bank kata">
              {daftarKataBank.map((kata, idxBlok) => {
                const sudahDipakai = blokTerpilih.includes(idxBlok);
                return (
                  <button
                    key={`bank-${idxBlok}-${kata}`}
                    type="button"
                    className={`duo-keping-kata ${sudahDipakai ? "duo-keping-kata--kosong" : ""}`}
                    onClick={() => pilihBlok(idxBlok)}
                    disabled={sudahDipakai || statusJawab !== "belum"}
                  >
                    {kata}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. SOAL DENGAR & KETIK / PILIH KATA (Screenshot 5) */}
        {soalAktif.tipe === "dengar-ketik" && (
          <div className="duo-wadah-dengar">
            <div className="duo-pasangan-speaker">
              <button
                type="button"
                className="duo-tombol-speaker-besar"
                onClick={() => putarSuaraKalimat(soalAktif.jawaban, false)}
                aria-label="Putar kalimat kecepatan normal"
              >
                🔊
              </button>
              <button
                type="button"
                className="duo-tombol-speaker-lambat"
                onClick={() => putarSuaraKalimat(soalAktif.jawaban, true)}
                aria-label="Putar kalimat dengan lambat"
                title="Putar lambat (0.6x)"
              >
                🐢
              </button>
            </div>

            {modeKetikManual ? (
              <input
                type="text"
                className="duo-input-dengar"
                placeholder="Ketik kalimat bahasa Inggris yang kamu dengar..."
                value={ketikanDengar}
                onChange={(e) => setKetikanDengar(e.target.value)}
                disabled={statusJawab !== "belum"}
                aria-label="Ketik kalimat yang didengar"
              />
            ) : (
              <div className="duo-wadah-susun">
                <div className="duo-garis-jawaban">
                  {blokTerpilih.length === 0 ? (
                    <span className="duo-placeholder-garis">
                      Pilih kata yang kamu dengar atau gunakan keyboard...
                    </span>
                  ) : (
                    blokTerpilih.map((idxBlok) => (
                      <button
                        key={`dengar-terpilih-${idxBlok}`}
                        type="button"
                        className="duo-keping-kata duo-keping-kata--terpilih"
                        onClick={() => pilihBlok(idxBlok)}
                      >
                        {daftarKataBank[idxBlok]}
                      </button>
                    ))
                  )}
                </div>

                <div className="duo-bank-kata">
                  {daftarKataBank.map((kata, idxBlok) => {
                    const sudahDipakai = blokTerpilih.includes(idxBlok);
                    return (
                      <button
                        key={`dengar-bank-${idxBlok}-${kata}`}
                        type="button"
                        className={`duo-keping-kata ${sudahDipakai ? "duo-keping-kata--kosong" : ""}`}
                        onClick={() => pilihBlok(idxBlok)}
                        disabled={sudahDipakai || statusJawab !== "belum"}
                      >
                        {kata}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. SOAL COCOKKAN PASANGAN KATA */}
        {soalAktif.tipe === "cocokkan-pasangan" && soalAktif.pasangan && (
          <div className="duo-grid-pasangan">
            <div className="duo-kolom-pasangan">
              {soalAktif.pasangan.map((p) => {
                const sudah = Boolean(pasanganCocok[p.en]);
                const aktif = kiriTerpilih === p.en;
                return (
                  <button
                    key={`kiri-${p.en}`}
                    type="button"
                    className={`duo-kartu-pasangan ${aktif ? "duo-kartu-pasangan--aktif" : ""} ${
                      sudah ? "duo-kartu-pasangan--selesai" : ""
                    }`}
                    onClick={() => pilihKataCocok("kiri", p.en)}
                    disabled={sudah}
                  >
                    {p.en}
                  </button>
                );
              })}
            </div>
            <div className="duo-kolom-pasangan">
              {kolomKananCocok.map((idArti) => {
                const sudah = Object.values(pasanganCocok).includes(idArti);
                const salah = pasanganSalah?.endsWith(`:${idArti}`);
                return (
                  <button
                    key={`kanan-${idArti}`}
                    type="button"
                    className={`duo-kartu-pasangan ${
                      sudah ? "duo-kartu-pasangan--selesai" : ""
                    } ${salah ? "duo-kartu-pasangan--salah" : ""}`}
                    onClick={() => pilihKataCocok("kanan", idArti)}
                    disabled={sudah}
                  >
                    {idArti}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Bilah Aksi & Umpan Balik di Bagian Bawah (Persis Duolingo Web) */}
      <footer
        className={`duo-bilah-bawah ${
          statusJawab === "benar"
            ? "duo-bilah-bawah--benar"
            : statusJawab === "salah"
              ? "duo-bilah-bawah--salah"
              : ""
        }`}
      >
        <div className="duo-bilah-bawah-dalam">
          {statusJawab === "belum" ? (
            <>
              <button
                type="button"
                className="duo-tombol-sekunder"
                onClick={lompatiSoal}
              >
                {soalAktif.tipe === "dengar-ketik"
                  ? "TAK BISA DENGAR SEKARANG"
                  : "LOMPATI"}
              </button>

              {soalAktif.tipe === "dengar-ketik" && (
                <button
                  type="button"
                  className="duo-tombol-keyboard"
                  onClick={() => {
                    bunyiKlik();
                    setModeKetikManual((m) => !m);
                  }}
                >
                  ⌨️ {modeKetikManual ? "GUNAKAN BANK KATA" : "GUNAKAN KEYBOARD"}
                </button>
              )}

              {soalAktif.tipe !== "cocokkan-pasangan" && (
                <button
                  type="button"
                  className="duo-tombol-utama"
                  onClick={periksaJawaban}
                  disabled={!siapPeriksa}
                >
                  PERIKSA
                </button>
              )}
            </>
          ) : (
            <>
              <div className="duo-info-umpan-balik" role="status">
                <div
                  className={`duo-ikon-umpan-balik ${
                    statusJawab === "benar"
                      ? "duo-ikon-umpan-balik--benar"
                      : "duo-ikon-umpan-balik--salah"
                  }`}
                >
                  {statusJawab === "benar" ? "✓" : "✕"}
                </div>
                <div className="duo-teks-umpan-balik">
                  <strong>
                    {statusJawab === "benar" ? "Mantap!" : "Belum tepat"}
                  </strong>
                  {statusJawab === "salah" && (
                    <p>
                      Solusi tepat: <b>{soalAktif.jawaban}</b>
                    </p>
                  )}
                  {soalAktif.penjelasan && (
                    <small className="duo-catatan-grammar">{soalAktif.penjelasan}</small>
                  )}
                </div>
              </div>

              <button
                type="button"
                className={`duo-tombol-utama ${
                  statusJawab === "salah" ? "duo-tombol-utama--merah" : ""
                }`}
                onClick={lanjutSoalBerikutnya}
              >
                {indeks + 1 >= daftarSoal.length ? "SELESAI" : "LANJUTKAN"}
              </button>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}
