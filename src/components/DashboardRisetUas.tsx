import React, { useState } from "react";
import {
  buatRingkasanDiagnostik,
  eksporCsvRiset,
  type DataDiagnostikRiset,
  type ProfilMahasiswa
} from "../domain/diagnostikRiset";
import { MaskotCendekia } from "./KarakterAnimasi";
import { bunyiBenar, bunyiKlik } from "../efekSuara";

export interface DashboardRisetUasProps {
  diagnostik: DataDiagnostikRiset;
  profil: ProfilMahasiswa;
  onSimpanProfil: (profilBaru: ProfilMahasiswa) => void;
  onMulaiLatihanFokus?: (kategori: "grammar" | "listening" | "speaking" | "vocabulary") => void;
  onMuatDataContohRiset?: () => void;
}

export function DashboardRisetUas({
  diagnostik,
  profil,
  onSimpanProfil,
  onMulaiLatihanFokus,
  onMuatDataContohRiset
}: DashboardRisetUasProps) {
  const ringkasan = buatRingkasanDiagnostik(diagnostik);
  const [sedangEditProfil, setSedangEditProfil] = useState(false);
  const [formProfil, setFormProfil] = useState<ProfilMahasiswa>(profil);
  const [pesanUnduh, setPesanUnduh] = useState<string | null>(null);

  function unduhBerkas(isi: string, namaBerkas: string, tipeMime: string) {
    if (typeof window === "undefined") return;
    const blob = new Blob([isi], { type: tipeMime });
    const url = URL.createObjectURL(blob);
    const tautan = document.createElement("a");
    tautan.href = url;
    tautan.download = namaBerkas;
    tautan.click();
    URL.revokeObjectURL(url);
    setPesanUnduh(`Berkas ${namaBerkas} berhasil diunduh untuk lampiran UAS.`);
  }

  return (
    <section className="duo-riset-dashboard" aria-label="Diagnostik Riset Mahasiswa UAS">
      {/* Header Riset & Profil Mahasiswa */}
      <div className="duo-riset-banner">
        <div className="duo-riset-banner-kiri">
          <span className="duo-lencana-cefr">MINI-RISET UAS · PEMETAAN KOMPETENSI</span>
          <h3>📊 Analitik Kelemahan Bahasa Inggris Mahasiswa</h3>
          <p>
            Memetakan tingkat penguasaan <strong>Grammar</strong>, <strong>Listening</strong>,{" "}
            <strong>Speaking</strong>, dan <strong>Vocabulary</strong> secara otomatis dari
            aktivitas belajar kuis serta percakapan AI.
          </p>

          <div className="duo-riset-identitas">
            <span>👤 {profil.nama}</span>
            <span>🎓 NIM: {profil.nim}</span>
            <span>🏛️ {profil.prodi} (Sem. {profil.semester})</span>
          </div>
        </div>

        <div className="duo-riset-banner-kanan">
          <MaskotCendekia ukuran={96} pose="senang" />
          <div className="duo-riset-aksi-kolom">
            <button
              type="button"
              className="duo-tombol-sekunder"
              onClick={() => {
                bunyiKlik();
                setFormProfil(profil);
                setSedangEditProfil((v) => !v);
              }}
            >
              ✏️ {sedangEditProfil ? "Tutup Form Profil" : "Ubah Profil Mahasiswa"}
            </button>

            <button
              type="button"
              className="duo-tombol-utama"
              onClick={() => {
                bunyiBenar();
                const csv = eksporCsvRiset(profil, diagnostik);
                unduhBerkas(csv, `data-riset-uas-${profil.nim}.csv`, "text/csv;charset=utf-8");
              }}
            >
              📥 Unduh Data CSV Riset
            </button>
          </div>
        </div>
      </div>

      {pesanUnduh && (
        <div className="duo-notif-peti" role="status">
          <span>✅ {pesanUnduh}</span>
          <button type="button" onClick={() => setPesanUnduh(null)}>
            Tutup
          </button>
        </div>
      )}

      {/* Form Edit Profil Mahasiswa (Tersimpan di Browser tanpa biaya database) */}
      {sedangEditProfil && (
        <form
          className="duo-form-profil"
          onSubmit={(e) => {
            e.preventDefault();
            bunyiBenar();
            onSimpanProfil(formProfil);
            setSedangEditProfil(false);
          }}
        >
          <h4>Identitas Responden Mahasiswa (Tersimpan Lokal di Perangkat)</h4>
          <div className="duo-form-profil-grid">
            <label>
              <span>Nama Mahasiswa</span>
              <input
                type="text"
                value={formProfil.nama}
                onChange={(e) => setFormProfil({ ...formProfil, nama: e.target.value })}
                required
              />
            </label>
            <label>
              <span>NIM</span>
              <input
                type="text"
                value={formProfil.nim}
                onChange={(e) => setFormProfil({ ...formProfil, nim: e.target.value })}
                required
              />
            </label>
            <label>
              <span>Program Studi</span>
              <input
                type="text"
                value={formProfil.prodi}
                onChange={(e) => setFormProfil({ ...formProfil, prodi: e.target.value })}
                required
              />
            </label>
            <label>
              <span>Semester</span>
              <select
                value={formProfil.semester}
                onChange={(e) => setFormProfil({ ...formProfil, semester: e.target.value })}
              >
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
                <option value="3">Semester 3</option>
                <option value="4">Semester 4</option>
                <option value="5">Semester 5</option>
                <option value="6">Semester 6</option>
                <option value="7">Semester 7</option>
                <option value="8">Semester 8</option>
              </select>
            </label>
          </div>
          <div className="duo-form-profil-aksi">
            <button type="submit" className="duo-tombol-utama">
              Simpan Identitas
            </button>
          </div>
        </form>
      )}

      {/* Temuan Utama Diagnosis Kelemahan */}
      <div className="duo-temuan-utama">
        <div className="duo-temuan-teks">
          <span className="subjudul-kecil">KESIMPULAN DIAGNOSTIK OTOMATIS</span>
          <h4>
            {ringkasan.totalSemuaPercobaan > 0
              ? `Kelemahan Prioritas: ${ringkasan.terlemah.labelId} (${ringkasan.terlemah.skor}%)`
              : "Belum Ada Sampel Latihan yang Cukup"}
          </h4>
          <p>{ringkasan.rekomendasiUtama}</p>
        </div>

        <div className="duo-temuan-tombol">
          {onMulaiLatihanFokus && (
            <button
              type="button"
              className="duo-tombol-utama"
              onClick={() => {
                bunyiKlik();
                onMulaiLatihanFokus(ringkasan.terlemah.kategori);
              }}
            >
              🎯 Latih Fokus {ringkasan.terlemah.labelId}
            </button>
          )}
          {ringkasan.totalSemuaPercobaan === 0 && onMuatDataContohRiset && (
            <button
              type="button"
              className="duo-tombol-sekunder"
              onClick={() => {
                bunyiBenar();
                onMuatDataContohRiset();
              }}
            >
              🧪 Isi Simulasi Data Riset
            </button>
          )}
        </div>
      </div>

      {/* Grafik Batang & Kartu 4 Aspek Kemampuan */}
      <div className="duo-grid-empat-aspek">
        {ringkasan.daftar.map((item) => {
          const adalahTerlemah =
            ringkasan.totalSemuaPercobaan > 0 &&
            item.kategori === ringkasan.terlemah.kategori;

          return (
            <article
              key={item.kategori}
              className={`duo-kartu-aspek ${adalahTerlemah ? "duo-kartu-aspek--fokus" : ""}`}
            >
              <div className="duo-kartu-aspek-atas">
                <div>
                  <span className="duo-label-aspek-en">{item.labelEn}</span>
                  <h4>{item.labelId}</h4>
                </div>
                <span className={`duo-lencana-level duo-lencana-level--${item.level}`}>
                  {item.level === "perlu-bimbingan"
                    ? "Perlu Latihan"
                    : item.level === "cukup"
                      ? "Cukup"
                      : "Kuat"}
                </span>
              </div>

              <div className="duo-angka-aspek">
                <strong>{item.skor}%</strong>
                <small>{item.totalPercobaan} sampel uji</small>
              </div>

              <div className="duo-batang-aspek" aria-hidden="true">
                <div
                  className={`duo-isi-aspek duo-isi-aspek--${item.kategori}`}
                  style={{ width: `${Math.max(6, item.skor)}%` }}
                />
              </div>

              <p className="duo-catatan-aspek">
                Benar: {item.benar} dari {item.totalPercobaan} percobaan
              </p>

              {onMulaiLatihanFokus && (
                <button
                  type="button"
                  className="duo-tombol-aspek"
                  onClick={() => {
                    bunyiKlik();
                    onMulaiLatihanFokus(item.kategori);
                  }}
                >
                  Latih {item.labelId} →
                </button>
              )}
            </article>
          );
        })}
      </div>

      {/* Riwayat Kesalahan Terbaru untuk Analisis Kualitatif UAS */}
      {diagnostik.riwayatKesalahan.length > 0 && (
        <div className="duo-kotak-kesalahan">
          <div className="duo-kotak-kesalahan-kepala">
            <h4>🔍 Catatan Kesalahan Terbaru (Bahan Evaluasi Dosen & Mahasiswa)</h4>
            <span>{diagnostik.riwayatKesalahan.length} temuan tercatat</span>
          </div>

          <div className="duo-daftar-kesalahan">
            {diagnostik.riwayatKesalahan.slice(0, 6).map((err, idx) => (
              <div key={`${err.tanggal}-${idx}`} className="duo-baris-kesalahan">
                <span className="duo-tag-kategori">{err.kategori.toUpperCase()}</span>
                <div className="duo-isi-kesalahan">
                  <strong>{err.pertanyaan}</strong>
                  <small>
                    Jawaban mahasiswa: <em>{err.jawabanPengguna || "(kosong)"}</em> · Seharusnya:{" "}
                    <b>{err.jawabanBenar}</b>
                  </small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

