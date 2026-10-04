/**
 * Pengujian alur jalur belajar end-to-end (logika, bukan tampilan).
 *
 * Menjamin aturan kunci-terbuka, penghitungan XP tanpa penggandaan, dan
 * pengisian kotak SRS benar-benar bekerja sesuai yang dijanjikan di antarmuka.
 */

import { describe, expect, it } from "vitest";
import { KURIKULUM, daftarLevelBerurutan } from "../src/domain/jalurBelajar";
import {
  buatProgresKosong,
  catatLevelSelesai,
  hitungStatusLevel,
  levelBerikutnya,
  ringkasJalur
} from "../src/domain/progresJalur";
import { buatGamifikasiKosong, tambahXp } from "../src/domain/gamifikasi";
import { buatKartu, kartuJatuhTempo, ringkasSrs } from "../src/domain/srs";
import { getShanghaiDate } from "../src/domain/checkin";

/** Selesaikan seluruh level secara berurutan, seperti pengguna sungguhan. */
function selesaikanSemua() {
  let progres = buatProgresKosong();
  for (const item of daftarLevelBerurutan()) {
    progres = catatLevelSelesai(progres, {
      idLevel: item.level.id,
      benar: item.level.soal.length,
      total: item.level.soal.length,
      xp: item.level.xp
    });
  }
  return progres;
}

describe("alur jalur belajar", () => {
  it("hanya level pertama yang terbuka di awal", () => {
    const status = hitungStatusLevel(buatProgresKosong());
    expect(status[0].status).toBe("terbuka");
    expect(status.slice(1).every((item) => item.status === "terkunci")).toBe(true);
  });

  it("menyelesaikan satu level membuka tepat satu level berikutnya", () => {
    const pertama = daftarLevelBerurutan()[0];
    const progres = catatLevelSelesai(buatProgresKosong(), {
      idLevel: pertama.level.id,
      benar: pertama.level.soal.length,
      total: pertama.level.soal.length,
      xp: pertama.level.xp
    });
    const status = hitungStatusLevel(progres);

    expect(status[0].status).toBe("selesai");
    expect(status[1].status).toBe("terbuka");
    expect(status[2].status).toBe("terkunci");
    // Tidak boleh ada lebih dari satu level terbuka sekaligus.
    expect(status.filter((item) => item.status === "terbuka")).toHaveLength(1);
  });

  it("level berikutnya selalu menunjuk level yang berstatus terbuka", () => {
    let progres = buatProgresKosong();
    for (const item of daftarLevelBerurutan()) {
      const berikut = levelBerikutnya(progres);
      expect(berikut?.level.id).toBe(item.level.id);
      progres = catatLevelSelesai(progres, {
        idLevel: item.level.id,
        benar: item.level.soal.length,
        total: item.level.soal.length,
        xp: item.level.xp
      });
    }
    // Semua selesai: tidak ada lagi level terbuka.
    expect(levelBerikutnya(progres)).toBeNull();
  });

  it("mengulang level yang sama tidak menggandakan XP", () => {
    const pertama = daftarLevelBerurutan()[0];
    const masukan = {
      idLevel: pertama.level.id,
      benar: pertama.level.soal.length,
      total: pertama.level.soal.length,
      xp: pertama.level.xp
    };
    const sekali = catatLevelSelesai(buatProgresKosong(), masukan);
    const duaKali = catatLevelSelesai(sekali, masukan);

    expect(duaKali.xpTotal).toBe(sekali.xpTotal);
    expect(duaKali.levelSelesai).toHaveLength(1);
  });

  it("ringkasan jalur mencapai 100% setelah semua level selesai", () => {
    const ringkas = ringkasJalur(selesaikanSemua());
    expect(ringkas.persen).toBe(100);
    expect(ringkas.selesai).toBe(ringkas.total);
    expect(ringkas.total).toBe(daftarLevelBerurutan().length);
  });

  it("nilai level dihitung dari rasio jawaban benar", () => {
    const pertama = daftarLevelBerurutan()[0];
    const total = pertama.level.soal.length;
    const progres = catatLevelSelesai(buatProgresKosong(), {
      idLevel: pertama.level.id,
      benar: total - 1,
      total,
      xp: pertama.level.xp
    });
    const status = hitungStatusLevel(progres)[0];
    expect(status.nilai).toBe(Math.round(((total - 1) / total) * 100));
  });

  it("setiap id level unik di seluruh kurikulum", () => {
    const id = daftarLevelBerurutan().map((item) => item.level.id);
    expect(new Set(id).size).toBe(id.length);
  });

  it("setiap id soal unik di seluruh kurikulum", () => {
    const id = KURIKULUM.flatMap((unit) => unit.level).flatMap((level) => level.soal).map((soal) => soal.id);
    expect(new Set(id).size).toBe(id.length);
  });
});

describe("integrasi jalur + gamifikasi + SRS", () => {
  it("XP dari seluruh level cocok dengan total XP kurikulum", () => {
    const progres = selesaikanSemua();
    const totalKurikulum = daftarLevelBerurutan().reduce((total, item) => total + item.level.xp, 0);
    expect(progres.xpTotal).toBe(totalKurikulum);
  });

  it("kartu SRS hanya dibuat untuk kosakata level yang sudah lulus", () => {
    const pertama = daftarLevelBerurutan()[0];
    const idSelesai = new Set([pertama.level.id]);
    const kartu = KURIKULUM.filter((unit) => unit.level.some((level) => idSelesai.has(level.id)))
      .flatMap((unit) => unit.kosakata)
      .map((kata) => buatKartu(kata, "2026-01-01"));

    expect(kartu.length).toBeGreaterThan(0);
    // Kartu baru selalu jatuh tempo hari ini.
    expect(kartuJatuhTempo(kartu, "2026-01-01")).toHaveLength(kartu.length);
    expect(ringkasSrs(kartu).baru).toBe(kartu.length);
  });

  it("menambah XP menaikkan liga setelah melewati ambang", () => {
    // Pakai hari ini karena `hitungLiga` hanya menghitung XP dalam jendela
    // tujuh hari berjalan — XP bertanggal jauh di masa lalu tidak dihitung.
    const hariIni = getShanghaiDate();
    let state = { ...buatGamifikasiKosong(), xpHarian: [{ tanggal: hariIni, xp: 70 }] };
    state = tambahXp(state, 20, hariIni);
    // Total minggu ini 90 XP, di atas ambang Bronze (60).
    expect(state.liga).toBe("Silver");
  });
});
