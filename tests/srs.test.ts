import { describe, expect, it } from "vitest";
import {
  BANK_PENEMPATAN,
  buatKartu,
  INTERVAL_HARI,
  jawabKartu,
  kartuJatuhTempo,
  normalkanSrs,
  nilaiPenempatan,
  ringkasSrs,
  tambahHari
} from "../src/domain/srs";

describe("placement test", () => {
  it("menghasilkan A1 bila semua jawaban salah", () => {
    expect(nilaiPenempatan({}).tingkat).toBe("A1");
  });

  it("menaikkan tingkat bila seluruh soal dijawab benar", () => {
    const semua: Record<string, string> = {};
    for (const soal of BANK_PENEMPATAN) semua[soal.id] = soal.jawaban;
    expect(nilaiPenempatan(semua).tingkat).toBe("C1");
  });

  it("berhenti di tingkat pertama yang gagal", () => {
    const jawaban: Record<string, string> = {};
    // A1 & A2 benar, B1 sengaja salah semua.
    for (const soal of BANK_PENEMPATAN) {
      if (soal.tingkat === "A1" || soal.tingkat === "A2") jawaban[soal.id] = soal.jawaban;
      else jawaban[soal.id] = "SALAH";
    }
    expect(nilaiPenempatan(jawaban).tingkat).toBe("A2");
  });

  it("menyertakan rincian per tingkat", () => {
    const hasil = nilaiPenempatan({});
    expect(hasil.rincian.length).toBeGreaterThan(0);
    expect(hasil.rincian[0]).toHaveProperty("tingkat");
    expect(hasil.rincian[0]).toHaveProperty("benar");
    expect(hasil.ringkasan.length).toBeGreaterThan(0);
  });
});

describe("SRS", () => {
  it("membuat kartu baru yang langsung jatuh tempo", () => {
    const kartu = buatKartu({ en: "hello", id: "halo" }, "2026-10-03");
    expect(kartu.tingkat).toBe(0);
    expect(kartu.jatuhTempo).toBe("2026-10-03");
  });

  it("menaikkan tingkat dan memanjangkan interval saat benar", () => {
    let kartu = buatKartu({ en: "hello", id: "halo" }, "2026-10-03");
    kartu = jawabKartu(kartu, true, "2026-10-03");
    expect(kartu.tingkat).toBe(1);
    expect(kartu.jatuhTempo).toBe(tambahHari("2026-10-03", INTERVAL_HARI[1]));
  });

  it("menurunkan tingkat dan mengulang besok saat salah", () => {
    let kartu = buatKartu({ en: "hello", id: "halo" }, "2026-10-03");
    kartu = jawabKartu(kartu, true, "2026-10-03");
    kartu = jawabKartu(kartu, true, "2026-10-05");
    const sebelum = kartu.tingkat;
    kartu = jawabKartu(kartu, false, "2026-10-09");
    expect(kartu.tingkat).toBe(sebelum - 1);
    expect(kartu.jatuhTempo).toBe("2026-10-10");
    expect(kartu.jumlahSalah).toBe(1);
  });

  it("tidak menurunkan tingkat di bawah nol", () => {
    let kartu = buatKartu({ en: "hello", id: "halo" }, "2026-10-03");
    kartu = jawabKartu(kartu, false, "2026-10-03");
    expect(kartu.tingkat).toBe(0);
  });

  it("membatasi tingkat pada interval tertinggi", () => {
    let kartu = buatKartu({ en: "hello", id: "halo" }, "2026-10-03");
    for (let i = 0; i < 20; i += 1) kartu = jawabKartu(kartu, true, "2026-10-03");
    expect(kartu.tingkat).toBe(INTERVAL_HARI.length - 1);
  });

  it("mengurutkan kartu yang jatuh tempo", () => {
    const a = { ...buatKartu({ en: "a", id: "a" }, "2026-10-01"), tingkat: 2 };
    const b = { ...buatKartu({ en: "b", id: "b" }, "2026-10-03"), tingkat: 0 };
    const c = { ...buatKartu({ en: "c", id: "c" }, "2026-10-09") };
    const hasil = kartuJatuhTempo([a, b, c], "2026-10-03");
    expect(hasil.map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("meringkas penguasaan kartu", () => {
    const kartu = [
      { ...buatKartu({ en: "a", id: "a" }), tingkat: 5 },
      { ...buatKartu({ en: "b", id: "b" }), tingkat: 0 },
      { ...buatKartu({ en: "c", id: "c" }), tingkat: 1, jumlahSalah: 2 }
    ];
    const ringkas = ringkasSrs(kartu);
    expect(ringkas.total).toBe(3);
    expect(ringkas.dikuasai).toBe(1);
    expect(ringkas.perluDiulang).toBe(1);
    // Hanya satu kartu yang masih tingkat 0 — kartu "c" sudah naik ke tingkat 1.
    expect(ringkas.baru).toBe(1);
  });

  it("menolak data SRS rusak dengan aman", () => {
    expect(normalkanSrs(null)).toEqual([]);
    expect(normalkanSrs("rusak")).toEqual([]);
    expect(normalkanSrs([{ id: "x" }])).toEqual([]);
    const valid = normalkanSrs([{ id: "a", kosakata: { en: "a", id: "b" }, tingkat: 99 }]);
    expect(valid[0].tingkat).toBe(5);
  });

  it("menambah hari melewati batas bulan", () => {
    expect(tambahHari("2026-10-30", 3)).toBe("2026-11-02");
  });
});
