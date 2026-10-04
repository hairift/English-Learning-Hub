/**
 * Peta jalur belajar bergaya "skill tree".
 *
 * Tampilannya meniru peta perjalanan: level disusun sebagai node bundar yang
 * berkelok naik-turun mengikuti satu jalur, tiap unit punya spanduk tingginya
 * sendiri, dan progres ditandai oleh posisi pengguna di jalur itu.
 *
 * Semua data berasal dari `domain/jalurBelajar` + `domain/progresJalur`; komponen
 * ini tidak menyimpan keadaan apa pun selain pilihan unit yang sedang dibuka
 * (akordeon). Itu membuatnya mudah dipakai ulang dan mudah diuji.
 */

import { useMemo, useState } from "react";
import { Check, ChevronDown, Lock, Play, Star, Trophy } from "lucide-react";
import type { UnitJalur } from "../domain/jalurBelajar";
import type { LevelBerstatus, StatusLevel } from "../domain/progresJalur";

export interface PetaJalurProps {
  /** Seluruh level beserta status kuncinya. */
  level: LevelBerstatus[];
  /** Dipanggil saat pengguna menekan node yang boleh dikerjakan. */
  onMulaiLevel: (idLevel: string) => void;
  /**
   * Dipakai untuk menyembunyikan unit yang masih terkunci total.
   * Bila `true`, unit yang belum tersentuh ditampilkan sebagai "segera hadir".
   */
  sembunyikanTerkunci?: boolean;
}

/** Geseran horizontal node dalam persen, membentuk jalur berkelok. */
const GESERAN_JALUR = [0, 34, 52, 34, 0, -34, -52, -34];

/** Label tingkat yang ramah dibaca pengguna Indonesia. */
const LABEL_TINGKAT: Record<string, string> = {
  A1: "Pemula",
  A2: "Dasar",
  B1: "Menengah",
  B2: "Menengah atas",
  C1: "Mahir"
};

/** Ambil nomor urut hari ini, dipakai sebagai "seed" posisi node. */
function geseranUntuk(indeks: number): number {
  return GESERAN_JALUR[indeks % GESERAN_JALUR.length];
}

/** Satu node level pada peta. */
function NodeLevel({
  item,
  nomor,
  onMulai
}: {
  item: LevelBerstatus;
  nomor: number;
  onMulai: (idLevel: string) => void;
}) {
  const { status, level, nilai } = item;
  const bisaDikerjakan = status !== "terkunci";

  const kelasStatus: Record<StatusLevel, string> = {
    selesai: "node-jalur-selesai",
    terbuka: "node-jalur-terbuka",
    terkunci: "node-jalur-terkunci"
  };

  const judulTombol =
    status === "terkunci"
      ? `Terkunci — selesaikan level sebelumnya dulu`
      : status === "selesai"
        ? `Ulangi ${level.judul}${nilai !== null ? ` (nilai ${nilai})` : ""}`
        : `Mulai ${level.judul}`;

  return (
    <div className="jalur-node-baris">
      <button
        type="button"
        className={`node-jalur ${kelasStatus[status]}`}
        onClick={() => bisaDikerjakan && onMulai(level.id)}
        disabled={!bisaDikerjakan}
        aria-label={judulTombol}
        title={judulTombol}
      >
        <span className="node-jalur-ikon" aria-hidden="true">
          {status === "selesai" ? (
            <Check size={26} strokeWidth={3.4} />
          ) : status === "terkunci" ? (
            <Lock size={22} strokeWidth={3} />
          ) : (
            <Play size={24} strokeWidth={3} fill="currentColor" />
          )}
        </span>
        {status === "selesai" && nilai !== null && <span className="node-jalur-nilai">{nilai}</span>}
        <span className="node-jalur-nomor" aria-hidden="true">
          {status === "terkunci" ? "Terkunci" : `Level ${nomor}`}
        </span>
      </button>

      <div className={`node-jalur-keterangan ${status === "terkunci" ? "redup" : ""}`}>
        <strong>{level.judul}</strong>
        <span>{level.ringkasan}</span>
        <span className="node-jalur-xp">
          <Star size={13} aria-hidden="true" />
          {level.xp} XP
          {status === "selesai" && <em>· selesai</em>}
        </span>
      </div>
    </div>
  );
}

/** Satu unit berisi beberapa node level. */
function KartuUnit({
  unit,
  level,
  dibuka,
  onToggle,
  onMulai
}: {
  unit: UnitJalur;
  level: LevelBerstatus[];
  dibuka: boolean;
  onToggle: () => void;
  onMulai: (idLevel: string) => void;
}) {
  const selesai = level.filter((item) => item.status === "selesai").length;
  const total = level.length;
  const persen = total === 0 ? 0 : Math.round((selesai / total) * 100);
  const semuaTerkunci = level.every((item) => item.status === "terkunci");

  return (
    <section className={`unit-jalur ${semuaTerkunci ? "unit-terkunci" : ""}`}>
      <header className="unit-jalur-kepala">
        <button
          type="button"
          className="unit-jalur-judul"
          onClick={onToggle}
          aria-expanded={dibuka}
          aria-label={`${dibuka ? "Tutup" : "Buka"} unit ${unit.judulId}`}
        >
          <span className={`unit-jalur-lencana tingkatan-${unit.tingkat.toLowerCase()}`}>{unit.tingkat}</span>
          <span className="unit-jalur-teks">
            <strong>{unit.judul}</strong>
            <span>
              {unit.judulId} · {LABEL_TINGKAT[unit.tingkat] ?? unit.tingkat}
            </span>
          </span>
          <span className="unit-jalur-progres" aria-hidden="true">
            <span className="unit-jalur-progres-batang">
              <span className="unit-jalur-progres-isi" style={{ width: `${persen}%` }} />
            </span>
            <em>
              {selesai}/{total}
            </em>
          </span>
          <ChevronDown size={20} className={`unit-jalur-panah ${dibuka ? "terbuka" : ""}`} aria-hidden="true" />
        </button>
        <p className="unit-jalur-tema">{unit.tema}</p>
      </header>

      <div className="unit-jalur-isi" hidden={!dibuka}>
        <div className="unit-jalur-baris-info">
          <div className="unit-jalur-blok">
            <span className="unit-jalur-blok-label">Tata bahasa</span>
            <ul className="unit-jalur-daftar">
              {unit.grammar.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="unit-jalur-blok">
            <span className="unit-jalur-blok-label">Kosakata kunci</span>
            <ul className="unit-jalur-kosakata">
              {unit.kosakata.slice(0, 6).map((kata) => (
                <li key={kata.en}>
                  <strong>{kata.en}</strong>
                  <span>{kata.id}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="unit-jalur-blok">
            <span className="unit-jalur-blok-label">Skenario bicara</span>
            <ul className="unit-jalur-daftar">
              {unit.skenario.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="jalur-peta">
          {level.map((item, posisi) => (
            <div
              key={item.level.id}
              className="jalur-peta-baris"
              style={{ ["--geser" as string]: `${geseranUntuk(item.indeks)}%` }}
            >
              {posisi > 0 && <span className="jalur-penghubung" aria-hidden="true" />}
              <NodeLevel item={item} nomor={posisi + 1} onMulai={onMulai} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PetaJalur({ level, onMulaiLevel, sembunyikanTerkunci = false }: PetaJalurProps) {
  // Unit pertama yang masih berjalan dibuka otomatis supaya pengguna langsung
  // melihat "di mana saya sekarang" tanpa harus menebak.
  const idAktif = useMemo(() => {
    const berikut = level.find((item) => item.status === "terbuka");
    return berikut?.unit.id ?? level[0]?.unit.id ?? null;
  }, [level]);

  const [dibuka, setDibuka] = useState<Set<string>>(() => new Set(idAktif ? [idAktif] : []));

  const perUnit = useMemo(() => {
    const peta = new Map<string, { unit: UnitJalur; level: LevelBerstatus[] }>();
    for (const item of level) {
      const ada = peta.get(item.unit.id);
      if (ada) ada.level.push(item);
      else peta.set(item.unit.id, { unit: item.unit, level: [item] });
    }
    return Array.from(peta.values());
  }, [level]);

  function toggle(idUnit: string) {
    setDibuka((lama) => {
      const baru = new Set(lama);
      if (baru.has(idUnit)) baru.delete(idUnit);
      else baru.add(idUnit);
      return baru;
    });
  }

  return (
    <div className="peta-jalur">
      <div className="peta-jalur-kepala">
        <div>
          <span className="eyebrow">Jalur Belajar</span>
          <h3>Peta Kemampuan Bahasa Inggris</h3>
          <p className="muted">
            Delapan unit dari A1 sampai C1. Selesaikan satu level untuk membuka level berikutnya — persis seperti
            menaiki anak tangga.
          </p>
        </div>
        <div className="peta-jalur-legenda" aria-label="Keterangan status level">
          <span>
            <span className="legenda-titik legenda-selesai" aria-hidden="true" />
            Selesai
          </span>
          <span>
            <span className="legenda-titik legenda-terbuka" aria-hidden="true" />
            Bisa dikerjakan
          </span>
          <span>
            <span className="legenda-titik legenda-terkunci" aria-hidden="true" />
            Terkunci
          </span>
        </div>
      </div>

      <div className="peta-jalur-daftar">
        {perUnit.map((item) => {
          const semuaTerkunci = item.level.every((lvl) => lvl.status === "terkunci");
          if (sembunyikanTerkunci && semuaTerkunci) return null;
          return (
            <KartuUnit
              key={item.unit.id}
              unit={item.unit}
              level={item.level}
              dibuka={dibuka.has(item.unit.id)}
              onToggle={() => toggle(item.unit.id)}
              onMulai={onMulaiLevel}
            />
          );
        })}
      </div>

      <p className="peta-jalur-catatan">
        <Trophy size={15} aria-hidden="true" />
        Total {level.length} level tersedia. Setiap level yang lulus menambah XP dan memperpanjang rentetan harian.
      </p>
    </div>
  );
}

export default PetaJalur;
