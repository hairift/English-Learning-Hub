/**
 * lipsyncMulut.test.ts — uji mesin gerak mulut & pemilihan suara browser.
 *
 * Fokus pengujian ini adalah logika murni yang tidak butuh browser:
 * - penyusunan bingkai gerakan mulut dari teks,
 * - perkiraan durasi ucapan,
 * - pemilihan suara `speechSynthesis` terbaik,
 * - pemulihan state lip sync setelah dihentikan.
 *
 * Semua ini dulu menjadi sumber masalah "mulut tidak bergerak sama sekali",
 * jadi perilakunya dikunci lewat uji agar tidak terulang.
 */

import { describe, expect, it } from "vitest";
import { perkirakanDurasiUcapanMs, mulaiGerakMulut, susunBingkaiMulut } from "../src/lipsync/gerakMulut";
import { ambilStateLipsync } from "../src/lipsync/lipsyncStore";
import { browserPunyaSuara, pilihSuaraTerbaik } from "../src/suaraBrowser";

describe("susunBingkaiMulut", () => {
  it("memberi viseme mulut lebar untuk huruf a", () => {
    const bingkai = susunBingkaiMulut("a", 1000);
    expect(bingkai).toHaveLength(1);
    expect(bingkai[0].viseme.a).toBeGreaterThan(0.8);
  });

  it("menutup bibir untuk konsonan bilabial (m, b, p)", () => {
    const bingkai = susunBingkaiMulut("m", 1000);
    const bobot = bingkai[0].viseme;
    expect(Math.max(bobot.a, bobot.i, bobot.u, bobot.e, bobot.o)).toBeLessThan(0.1);
  });

  it("membedakan viseme vokal i dan u", () => {
    const i = susunBingkaiMulut("i", 1000)[0].viseme;
    const u = susunBingkaiMulut("u", 1000)[0].viseme;
    expect(i.i).toBeGreaterThan(i.u);
    expect(u.u).toBeGreaterThan(u.i);
  });

  it("menjumlahkan durasi bingkai mendekati durasi total", () => {
    const bingkai = susunBingkaiMulut("hello world", 2000);
    const total = bingkai.reduce((jumlah, item) => jumlah + item.durasiMs, 0);
    expect(total).toBeGreaterThan(1900);
    expect(total).toBeLessThan(2100);
  });

  it("tetap menghasilkan satu bingkai untuk teks kosong", () => {
    expect(susunBingkaiMulut("   ", 1000)).toHaveLength(1);
  });
});

describe("perkirakanDurasiUcapanMs", () => {
  it("memberi durasi minimum untuk teks sangat pendek", () => {
    expect(perkirakanDurasiUcapanMs("hi")).toBeGreaterThanOrEqual(500);
  });

  it("memanjang seiring bertambahnya kata", () => {
    const pendek = perkirakanDurasiUcapanMs("one two");
    const panjang = perkirakanDurasiUcapanMs("one two three four five six seven eight");
    expect(panjang).toBeGreaterThan(pendek);
  });
});

describe("mulaiGerakMulut", () => {
  it("mengembalikan kendali lengkap dan tidak melempar galat", () => {
    const kendali = mulaiGerakMulut("hello there, how are you?");
    expect(typeof kendali.hentikan).toBe("function");
    expect(typeof kendali.lompatKeKarakter).toBe("function");
    expect(typeof kendali.setelDurasi).toBe("function");

    // Tidak boleh melempar galat meski dipanggil dengan nilai ekstrem.
    expect(() => kendali.lompatKeKarakter(9999)).not.toThrow();
    expect(() => kendali.setelDurasi(1200)).not.toThrow();
    kendali.hentikan();
  });

  it("mengembalikan mulut ke posisi diam setelah dihentikan", () => {
    const kendali = mulaiGerakMulut("Sela sedang berbicara sekarang");
    kendali.hentikan();

    const state = ambilStateLipsync();
    expect(state.bersuara).toBe(false);
    expect(state.kebukaan).toBe(0);
    expect(state.viseme.a).toBe(0);
  });
});

describe("pemilihan suara browser", () => {
  it("melaporkan tidak ada suara saat mesin suara tidak tersedia", () => {
    expect(browserPunyaSuara()).toBe(false);
    expect(pilihSuaraTerbaik("id")).toBeNull();
    expect(pilihSuaraTerbaik("en")).toBeNull();
  });
});
