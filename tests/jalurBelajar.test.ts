import { describe, expect, it } from "vitest";
import {
  daftarLevelBerurutan,
  KURIKULUM,
  cariLevel,
  totalXpKurikulum
} from "../src/domain/jalurBelajar";
import {
  buatProgresKosong,
  catatLevelSelesai,
  hitungStatusLevel,
  levelBerikutnya,
  normalkanProgres,
  ringkasJalur
} from "../src/domain/progresJalur";

describe("kurikulum jalur belajar", () => {
  it("disusun berurutan dari A1 ke C1", () => {
    const tingkat = KURIKULUM.map((unit) => unit.tingkat);
    const urutan = ["A1", "A2", "B1", "B2", "C1"];
    let posisiTerakhir = -1;
    for (const t of tingkat) {
      const posisi = urutan.indexOf(t);
      expect(posisi).toBeGreaterThanOrEqual(posisiTerakhir);
      posisiTerakhir = posisi;
    }
  });

  it("setiap unit punya kosakata, grammar, skenario, dan minimal satu level", () => {
    for (const unit of KURIKULUM) {
      expect(unit.kosakata.length).toBeGreaterThan(0);
      expect(unit.grammar.length).toBeGreaterThan(0);
      expect(unit.skenario.length).toBeGreaterThan(0);
      expect(unit.level.length).toBeGreaterThan(0);
    }
  });

  it("setiap level punya soal dengan jawaban yang ada di pilihannya", () => {
    for (const unit of KURIKULUM) {
      for (const level of unit.level) {
        expect(level.soal.length).toBeGreaterThan(0);
        for (const soal of level.soal) {
          if (soal.tipe === "isi-rumpang" || soal.tipe === "pilih-terjemahan") {
            expect(soal.pilihan).toBeDefined();
            expect(soal.pilihan).toContain(soal.jawaban);
          }
          if (soal.tipe === "susun-kalimat") {
            expect(soal.blok?.length).toBeGreaterThan(0);
            // Blok kata harus memuat semua kata jawaban (hanya urutannya beda).
            const jawabanTerurut = soal.jawaban.split(" ").sort().join(" ");
            const blokTerurut = [...(soal.blok ?? [])].sort().join(" ");
            expect(blokTerurut).toBe(jawabanTerurut);
          }
        }
      }
    }
  });

  it("id level unik di seluruh kurikulum", () => {
    const semua = daftarLevelBerurutan().map((item) => item.level.id);
    expect(new Set(semua).size).toBe(semua.length);
  });

  it("bisa mencari level beserta unit induknya", () => {
    const hasil = cariLevel("lv-perkenalan-1");
    expect(hasil?.unit.id).toBe("unit-perkenalan");
  });

  it("menghitung total XP kurikulum", () => {
    expect(totalXpKurikulum()).toBeGreaterThan(0);
  });
});

describe("progres jalur belajar", () => {
  it("hanya level pertama yang terbuka pada progres kosong", () => {
    const status = hitungStatusLevel(buatProgresKosong());
    expect(status[0].status).toBe("terbuka");
    expect(status.slice(1).every((item) => item.status === "terkunci")).toBe(true);
  });

  it("membuka level berikutnya setelah level sebelumnya selesai", () => {
    const berurutan = daftarLevelBerurutan();
    const progres = catatLevelSelesai(buatProgresKosong(), {
      idLevel: berurutan[0].level.id,
      benar: 4,
      total: 4,
      xp: berurutan[0].level.xp
    });
    const status = hitungStatusLevel(progres);
    expect(status[0].status).toBe("selesai");
    expect(status[1].status).toBe("terbuka");
    expect(status[2].status).toBe("terkunci");
  });

  it("menghitung nilai persentase dari jawaban benar", () => {
    const berurutan = daftarLevelBerurutan();
    const progres = catatLevelSelesai(buatProgresKosong(), {
      idLevel: berurutan[0].level.id,
      benar: 3,
      total: 4,
      xp: 20
    });
    expect(hitungStatusLevel(progres)[0].nilai).toBe(75);
  });

  it("tidak menggandakan XP bila level yang sama diulang", () => {
    const berurutan = daftarLevelBerurutan();
    const id = berurutan[0].level.id;
    const sekali = catatLevelSelesai(buatProgresKosong(), { idLevel: id, benar: 4, total: 4, xp: 20 });
      const duaKali = catatLevelSelesai(sekali, { idLevel: id, benar: 4, total: 4, xp: 20 });
    expect(duaKali.xpTotal).toBe(20);
    expect(duaKali.levelSelesai).toHaveLength(1);
  });

  it("menemukan level berikutnya yang harus dikerjakan", () => {
    const berurutan = daftarLevelBerurutan();
    const progres = catatLevelSelesai(buatProgresKosong(), {
      idLevel: berurutan[0].level.id,
      benar: 4,
      total: 4,
      xp: 20
    });
    expect(levelBerikutnya(progres)?.level.id).toBe(berurutan[1].level.id);
  });

  it("meringkas kemajuan jalur", () => {
    const berurutan = daftarLevelBerurutan();
    const progres = catatLevelSelesai(buatProgresKosong(), {
      idLevel: berurutan[0].level.id,
      benar: 4,
      total: 4,
      xp: 20
    });
    const ringkas = ringkasJalur(progres);
    expect(ringkas.selesai).toBe(1);
    expect(ringkas.total).toBe(berurutan.length);
    expect(ringkas.persen).toBeGreaterThan(0);
  });

  it("menolak data rusak dengan aman", () => {
    expect(normalkanProgres(null).levelSelesai).toEqual([]);
    expect(normalkanProgres({ levelSelesai: "bukan array" }).levelSelesai).toEqual([]);
    const sebagian = normalkanProgres({
      levelSelesai: [
        { idLevel: "x", benar: 1, total: 2, xp: 10 },
        { idLevel: 123, benar: "a", total: 2, xp: 10 }
      ]
    });
    expect(sebagian.levelSelesai).toHaveLength(1);
    expect(sebagian.xpTotal).toBe(10);
  });
});
