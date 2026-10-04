/**
 * Pengujian mesin penilaian kuis.
 *
 * `nilaiSoal` adalah inti dari seluruh mesin kuis: bila fungsi ini salah,
 * pengguna akan dinilai tidak adil. Karena itu fungsi ini sengaja dibuat murni
 * dan diuji terpisah dari tampilan.
 */

import { describe, expect, it } from "vitest";
import { nilaiSoal } from "../src/components/MesinKuis";
import { KURIKULUM, cariLevel, type Soal } from "../src/domain/jalurBelajar";

function soal(patch: Partial<Soal>): Soal {
  return {
    id: "uji",
    tipe: "isi-rumpang",
    pertanyaan: "____",
    jawaban: "benar",
    ...patch
  };
}

describe("nilaiSoal", () => {
  it("menerima jawaban yang persis sama", () => {
    expect(nilaiSoal(soal({ jawaban: "My name is Rina" }), "My name is Rina")).toBe(true);
  });

  it("mengabaikan besar-kecil huruf", () => {
    expect(nilaiSoal(soal({ jawaban: "My name is Rina" }), "my name is rina")).toBe(true);
  });

  it("mengabaikan tanda baca dan spasi berlebih", () => {
    expect(nilaiSoal(soal({ jawaban: "How are you today?" }), "  how   are you today  ")).toBe(true);
  });

  it("menolak jawaban yang berbeda kata", () => {
    expect(nilaiSoal(soal({ jawaban: "My name is Rina" }), "My name is Dina")).toBe(false);
  });

  it("menolak jawaban kosong", () => {
    expect(nilaiSoal(soal({ jawaban: "hello" }), "")).toBe(false);
  });

  describe("cocokkan-kata", () => {
    const cocok = soal({
      tipe: "cocokkan-kata",
      jawaban: "hello=halo|name=nama|friend=teman"
    });

    it("menerima pasangan yang benar tanpa peduli urutan", () => {
      expect(nilaiSoal(cocok, "friend=teman|hello=halo|name=nama")).toBe(true);
    });

    it("menolak bila ada pasangan yang salah", () => {
      expect(nilaiSoal(cocok, "hello=nama|name=halo|friend=teman")).toBe(false);
    });

    it("menolak bila jumlah pasangan kurang", () => {
      expect(nilaiSoal(cocok, "hello=halo|name=nama")).toBe(false);
    });

    it("mengabaikan spasi dan besar-kecil huruf pada pasangan", () => {
      expect(nilaiSoal(cocok, " Hello = Halo | NAME = Nama | Friend = Teman ")).toBe(true);
    });
  });

  it("setiap soal di kurikulum bisa dinilai dengan jawabannya sendiri", () => {
    // Menjamin tidak ada soal yang salah tulis: jawaban resminya harus diterima.
    for (const unit of KURIKULUM) {
      for (const level of unit.level) {
        for (const item of level.soal) {
          expect(nilaiSoal(item, item.jawaban), `soal ${item.id} gagal dinilai`).toBe(true);
        }
      }
    }
  });

  it("setiap soal pilihan tidak boleh menerima pengecoh", () => {
    for (const unit of KURIKULUM) {
      for (const level of unit.level) {
        for (const item of level.soal) {
          if (item.tipe !== "isi-rumpang" && item.tipe !== "pilih-terjemahan") continue;
          for (const salah of item.pilihan ?? []) {
            if (salah === item.jawaban) continue;
            expect(nilaiSoal(item, salah), `soal ${item.id} menerima pengecoh "${salah}"`).toBe(false);
          }
        }
      }
    }
  });

  it("soal susun-kalimat menolak urutan yang salah", () => {
    const susun = cariLevel("lv-perkenalan-1")!.level.soal.find((item) => item.tipe === "susun-kalimat")!;
    const terbalik = (susun.blok ?? []).join(" ");
    // Blok sudah diacak dari jawaban, jadi menyusunnya apa adanya harus salah.
    expect(terbalik).not.toBe(susun.jawaban);
    expect(nilaiSoal(susun, terbalik)).toBe(false);
    expect(nilaiSoal(susun, susun.jawaban)).toBe(true);
  });
});
