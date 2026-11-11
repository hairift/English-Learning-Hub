import React, { useState } from "react";
import { KURIKULUM, type LevelJalur, type UnitJalur } from "../domain/jalurBelajar";
import {
  hitungStatusLevel,
  levelBerikutnya,
  ringkasJalur,
  type ProgresJalur,
  type StatusLevel
} from "../domain/progresJalur";
import { ucapkan } from "../suaraBrowser";
import { bunyiKlik, bunyiSelesai } from "../efekSuara";
import { Karakter2D, MaskotCendekia, type TipeKarakter } from "./KarakterAnimasi";

export interface PetaJalurProps {
  progres: ProgresJalur;
  petiDibuka?: string[];
  onBukaPeti?: (idPeti: string) => void;
  onPilihLevel: (unit: UnitJalur, level: LevelJalur) => void;
  onLatihSkenario?: (unit: UnitJalur, skenario: string) => void;
}

const WARNA_BANNER_UNIT: Record<string, string> = {
  A1: "duo-unit-banner--hijau",
  A2: "duo-unit-banner--biru",
  B1: "duo-unit-banner--ungu",
  B2: "duo-unit-banner--oranye",
  C1: "duo-unit-banner--emas"
};

const POSISI_ZIGZAG = [0, -48, -24, 36, 0];

const KARAKTER_PENDAMPING: TipeKarakter[] = [
  "ibu-dosen",
  "bapak-dosen",
  "mahasiswa",
  "mahasiswi"
];

export function PetaJalur({
  progres,
  petiDibuka = [],
  onBukaPeti,
  onPilihLevel,
  onLatihSkenario
}: PetaJalurProps) {
  const daftarStatus = hitungStatusLevel(progres);
  const petaStatus = new Map<string, { status: StatusLevel; nilai: number }>();
  for (const item of daftarStatus) {
    petaStatus.set(item.level.id, { status: item.status, nilai: item.nilai ?? 0 });
  }

  const ringkasan = ringkasJalur(progres);
  const berikutnya = levelBerikutnya(progres);
  const [unitPanduanAktif, setUnitPanduanAktif] = useState<UnitJalur | null>(null);
  const [notifPeti, setNotifPeti] = useState<string | null>(null);

  return (
    <section className="duo-peta-jalur" aria-label="Peta Jalur Belajar Bahasa Inggris">
      {/* Ringkasan progres atas & tombol lanjut cepat */}
      <div className="duo-peta-ringkasan-atas">
        <div className="duo-peta-progres-kapsul">
          <span>
            Level Selesai: <strong>{ringkasan.selesai}/{ringkasan.total}</strong> ({ringkasan.persen}%)
          </span>
          <span>
            XP Kurikulum: <strong>⚡ {progres.xpTotal}</strong>
          </span>
        </div>

        {berikutnya && (
          <button
            type="button"
            className="duo-tombol-lanjut-cepat"
            onClick={() => {
              bunyiKlik();
              onPilihLevel(berikutnya.unit, berikutnya.level);
            }}
          >
            ▶ Lanjutkan: {berikutnya.level.judul}
          </button>
        )}
      </div>

      {notifPeti && (
        <div className="duo-notif-peti" role="status">
          <span>🎁 {notifPeti}</span>
          <button type="button" onClick={() => setNotifPeti(null)}>
            Tutup
          </button>
        </div>
      )}

      {/* Daftar Unit Bergaya Pohon Jalur Duolingo */}
      <div className="duo-daftar-unit">
        {KURIKULUM.map((unit, indeksUnit) => {
          const kelasWarna = WARNA_BANNER_UNIT[unit.tingkat] ?? "duo-unit-banner--hijau";
          const levelPertamaInfo = petaStatus.get(unit.level[0]?.id ?? "");
          const semuaLevelSelesai = unit.level.every(
            (lv) => petaStatus.get(lv.id)?.status === "selesai"
          );
          const idPeti = `peti-${unit.id}`;
          const sudahBukaPeti = petiDibuka.includes(idPeti);
          const bisaBukaPeti =
            !sudahBukaPeti &&
            unit.level.some((lv) => petaStatus.get(lv.id)?.status === "selesai");
          const karakterUnit =
            KARAKTER_PENDAMPING[indeksUnit % KARAKTER_PENDAMPING.length];

          return (
            <article key={unit.id} className="duo-unit-blok">
              {/* Banner Hijau/Warna Unit + Tombol Buku Panduan (Screenshot 8) */}
              <header className={`duo-unit-banner ${kelasWarna}`}>
                <div className="duo-unit-banner-teks">
                  <span className="duo-unit-bagian">
                    BAGIAN {indeksUnit + 1}, UNIT {indeksUnit + 1} · CEFR {unit.tingkat}
                  </span>
                  <h3 className="duo-unit-judul">{unit.judulId}</h3>
                  <p className="duo-unit-tema">{unit.tema}</p>
                </div>

                <button
                  type="button"
                  className="duo-tombol-panduan"
                  onClick={() => {
                    bunyiKlik();
                    setUnitPanduanAktif(unit);
                  }}
                >
                  <span aria-hidden="true">📖</span> BUKU PANDUAN
                </button>
              </header>

              {/* Jalur Melingkar Bertingkat dengan Maskot & Peti Hadiah */}
              <div className="duo-jalur-simpul">
                {unit.level.map((lv, idxLv) => {
                  const info = petaStatus.get(lv.id) ?? {
                    status: "terkunci" as StatusLevel,
                    nilai: 0
                  };
                  const adalahBerikutnya = berikutnya?.level.id === lv.id;
                  const geserX = POSISI_ZIGZAG[idxLv % POSISI_ZIGZAG.length];

                  return (
                    <React.Fragment key={lv.id}>
                      <div
                        className="duo-baris-simpul"
                        style={{ transform: `translateX(${geserX}px)` }}
                      >
                        <div className="duo-wadah-tombol-simpul">
                          {adalahBerikutnya && (
                            <div className="duo-gelembung-mulai" aria-hidden="true">
                              MULAI
                            </div>
                          )}

                          <button
                            type="button"
                            className={`duo-simpul-bulat duo-simpul-bulat--${info.status} ${
                              adalahBerikutnya ? "duo-simpul-bulat--aktif-utama" : ""
                            }`}
                            disabled={info.status === "terkunci"}
                            onClick={() => {
                              bunyiKlik();
                              onPilihLevel(unit, lv);
                            }}
                            aria-label={`${lv.judul} (${info.status})`}
                          >
                            <span className="duo-simpul-ikon" aria-hidden="true">
                              {info.status === "selesai"
                                ? "✓"
                                : info.status === "terbuka"
                                  ? "★"
                                  : "🔒"}
                            </span>
                          </button>

                          <div className="duo-label-simpul">
                            <strong>{lv.judul}</strong>
                            <small>
                              +{lv.xp} XP
                              {info.status === "selesai" ? ` · ${info.nilai}%` : ""}
                            </small>
                          </div>
                        </div>
                      </div>

                      {/* Sisipkan Peti Harta Karun & Maskot setelah level pertama */}
                      {idxLv === 0 && (
                        <div className="duo-baris-simpul duo-baris-simpul--tengah">
                          <button
                            type="button"
                            className={`duo-simpul-peti ${
                              sudahBukaPeti
                                ? "duo-simpul-peti--terbuka"
                                : bisaBukaPeti
                                  ? "duo-simpul-peti--siap"
                                  : "duo-simpul-peti--terkunci"
                            }`}
                            onClick={() => {
                              if (!bisaBukaPeti) return;
                              bunyiSelesai();
                              onBukaPeti?.(idPeti);
                              setNotifPeti(
                                `Peti ${unit.judulId} terbuka! Kamu mendapat +25 Permata 💎`
                              );
                            }}
                            disabled={!bisaBukaPeti}
                            title={
                              sudahBukaPeti
                                ? "Peti sudah dibuka (+25 Permata)"
                                : bisaBukaPeti
                                  ? "Klik untuk membuka Peti Hadiah (+25 Permata)"
                                  : "Selesaikan pelajaran pertama untuk membuka peti"
                            }
                          >
                            <span className="duo-ikon-peti" aria-hidden="true">
                              {sudahBukaPeti ? "💎" : "🧰"}
                            </span>
                            <small>
                              {sudahBukaPeti
                                ? "Peti Terbuka"
                                : bisaBukaPeti
                                  ? "Buka Peti +25 💎"
                                  : "Peti Hadiah"}
                            </small>
                          </button>

                          <div className="duo-pendamping-jalur">
                            {indeksUnit === 0 ? (
                              <MaskotCendekia
                                ukuran={104}
                                pose={
                                  levelPertamaInfo?.status === "selesai"
                                    ? "senang"
                                    : "santai"
                                }
                              />
                            ) : (
                              <Karakter2D
                                karakter={karakterUnit}
                                ukuran={96}
                                ekspresi={semuaLevelSelesai ? "senang" : "normal"}
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Simpul Piala Praktek Percakapan AI di ujung setiap Unit */}
                {onLatihSkenario && unit.skenario[0] && (
                  <div className="duo-baris-simpul">
                    <button
                      type="button"
                      className={`duo-simpul-piala ${
                        semuaLevelSelesai ? "duo-simpul-piala--emas" : ""
                      }`}
                      onClick={() => {
                        bunyiKlik();
                        onLatihSkenario(unit, unit.skenario[0]);
                      }}
                    >
                      <span className="duo-ikon-piala" aria-hidden="true">
                        🏆
                      </span>
                      <div className="duo-teks-piala">
                        <strong>Praktek Ngobrol AI 3D</strong>
                        <small>{unit.skenario[0]}</small>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              <div className="duo-pembatas-unit">
                <span>{unit.judul}</span>
              </div>
            </article>
          );
        })}
      </div>

      {/* Modal Buku Panduan Unit (Kosakata + Suara + Catatan Grammar) */}
      {unitPanduanAktif && (
        <div
          className="duo-modal-latar"
          role="dialog"
          aria-modal="true"
          aria-label={`Buku Panduan ${unitPanduanAktif.judulId}`}
        >
          <div className="duo-modal-panduan">
            <div className="duo-modal-panduan-kepala">
              <div>
                <span className="duo-lencana-cefr">
                  BUKU PANDUAN · CEFR {unitPanduanAktif.tingkat}
                </span>
                <h3>{unitPanduanAktif.judulId}</h3>
                <p>{unitPanduanAktif.tema}</p>
              </div>
              <button
                type="button"
                className="duo-modal-tutup"
                onClick={() => setUnitPanduanAktif(null)}
                aria-label="Tutup buku panduan"
              >
                ✕
              </button>
            </div>

            <div className="duo-panduan-bagian">
              <h4>🔊 Ungkapan & Kosakata Utama (Klik untuk mendengar)</h4>
              <div className="duo-panduan-kosakata-grid">
                {unitPanduanAktif.kosakata.map((k) => (
                  <button
                    key={k.en}
                    type="button"
                    className="duo-kartu-kosakata-panduan"
                    onClick={() => ucapkan(`${k.en}. ${k.contoh}`, { gender: "perempuan" })}
                  >
                    <div className="duo-kartu-kosakata-baris">
                      <strong>🔊 {k.en}</strong>
                      <span>{k.id}</span>
                    </div>
                    <small>{k.contoh}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="duo-panduan-bagian">
              <h4>📐 Fokus Tata Bahasa (Grammar)</h4>
              <div className="duo-panduan-chip-list">
                {unitPanduanAktif.grammar.map((g) => (
                  <span key={g} className="duo-chip-grammar">
                    ✓ {g}
                  </span>
                ))}
              </div>
            </div>

            {onLatihSkenario && (
              <div className="duo-panduan-bagian">
                <h4>🎙️ Latihan Percakapan dengan Tutor 3D</h4>
                <div className="duo-panduan-skenario-list">
                  {unitPanduanAktif.skenario.map((sk) => (
                    <button
                      key={sk}
                      type="button"
                      className="duo-tombol-skenario-panduan"
                      onClick={() => {
                        const targetUnit = unitPanduanAktif;
                        setUnitPanduanAktif(null);
                        onLatihSkenario(targetUnit, sk);
                      }}
                    >
                      🗣️ Mulai Ngobrol: {sk}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
