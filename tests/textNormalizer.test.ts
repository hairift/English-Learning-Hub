import { describe, expect, it } from "vitest";
import {
  angkaKeKataEn,
  angkaKeKataId,
  deteksiBahasa,
  ejaDigitId,
  normalisasiTeksEn,
  normalisasiTeksId,
  siapkanTeksTts
} from "../shared/textNormalizer";

describe("normalizer teks TTS — Bahasa Indonesia", () => {
  it("mengubah bilangan bulat menjadi kata", () => {
    expect(angkaKeKataId(0)).toBe("nol");
    expect(angkaKeKataId(11)).toBe("sebelas");
    expect(angkaKeKataId(15)).toBe("lima belas");
    expect(angkaKeKataId(100)).toBe("seratus");
    expect(angkaKeKataId(1000)).toBe("seribu");
    expect(angkaKeKataId(25000)).toBe("dua puluh lima ribu");
    expect(angkaKeKataId(1_500_000)).toBe("satu juta lima ratus ribu");
    expect(angkaKeKataId(-3)).toBe("min tiga");
  });

  it("membaca mata uang rupiah dengan benar", () => {
    // Titik ribuan Indonesia tidak boleh dibaca sebagai desimal.
    expect(normalisasiTeksId("harganya Rp15.000 saja")).toContain("lima belas ribu rupiah");
  });

  it("membaca persen dan jam", () => {
    expect(normalisasiTeksId("diskon 50%")).toContain("lima puluh persen");
    expect(normalisasiTeksId("mulai jam 14:30")).toContain("empat belas lewat tiga puluh");
    // Awalan "jam" tidak boleh terduplikasi menjadi "jam jam".
    expect(normalisasiTeksId("mulai jam 14:30")).not.toContain("jam jam");
    expect(normalisasiTeksId("pukul 09:15")).not.toContain("pukul jam");
  });

  it("mengeja nomor HP satu per satu, bukan diterbilang", () => {
    expect(ejaDigitId("0812")).toBe("nol delapan satu dua");
    const hasil = normalisasiTeksId("hubungi 081234567890");
    expect(hasil).toContain("nol delapan satu dua");
    expect(hasil).not.toContain("delapan puluh satu");
  });

  it("membaca desimal dengan koma", () => {
    expect(normalisasiTeksId("nilainya 3,5 poin")).toContain("tiga koma lima");
  });
});

describe("normalizer teks TTS — Bahasa Inggris", () => {
  it("mengubah bilangan bulat menjadi kata", () => {
    expect(angkaKeKataEn(21)).toBe("twenty-one");
    expect(angkaKeKataEn(1500)).toBe("one thousand five hundred");
  });

  it("menangani singkatan besaran dan mata uang", () => {
    expect(normalisasiTeksEn("raised $5.2M today")).toContain("five point two million");
    expect(normalisasiTeksEn("raised $5.2M today")).toContain("dollars");
  });

  it("menangani persen dan jam", () => {
    expect(normalisasiTeksEn("grew 30%")).toContain("thirty percent");
    expect(normalisasiTeksEn("meeting at 4:45 PM")).toContain("four forty-five");
  });
});

describe("deteksi bahasa otomatis", () => {
  it("mengenali kalimat Indonesia", () => {
    expect(deteksiBahasa("Saya ingin belajar bahasa Inggris hari ini")).toBe("id");
  });

  it("mengenali kalimat Inggris", () => {
    expect(deteksiBahasa("I would like to practice my English speaking with you")).toBe("en");
  });

  it("memilih normalizer yang tepat lewat siapkanTeksTts", () => {
    const indo = siapkanTeksTts("Saya punya 2 apel", "auto");
    expect(indo.lang).toBe("id");
    expect(indo.text).toContain("dua");

    const inggris = siapkanTeksTts("I have 2 apples", "auto");
    expect(inggris.lang).toBe("en");
    expect(inggris.text).toContain("two");
  });

  it("menghormati mode bahasa manual", () => {
    const dipaksaInggris = siapkanTeksTts("Saya punya 2 apel", "en");
    expect(dipaksaInggris.lang).toBe("en");
    expect(dipaksaInggris.text).toContain("two");
  });
});
