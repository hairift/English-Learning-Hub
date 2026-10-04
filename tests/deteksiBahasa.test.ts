import { describe, expect, it } from "vitest";
import {
  deteksiBahasa,
  hitungKeyakinanBahasa,
  pecahKata
} from "../src/domain/deteksiBahasa";

/**
 * Regresi penting: deteksi bahasa dipakai untuk mengunci bahasa recognizer.
 * Bug lama membuat kalimat Indonesia dengan satu kata Inggris ("saya suka
 * belajar English") dikira Inggris, sehingga pengenalan suara Indonesia rusak.
 */
describe("deteksiBahasa", () => {
  it("mengenali kalimat Indonesia biasa", () => {
    expect(deteksiBahasa("Apa kabar hari ini?")).toBe("id");
    expect(deteksiBahasa("Saya mau pergi ke kantor besok.")).toBe("id");
    expect(deteksiBahasa("Terima kasih banyak ya")).toBe("id");
    expect(deteksiBahasa("Bagaimana cara membuat kopi?")).toBe("id");
  });

  it("mengenali kalimat Inggris biasa", () => {
    expect(deteksiBahasa("Hello, how are you today?")).toBe("en");
    expect(deteksiBahasa("I would like to order a coffee")).toBe("en");
    expect(deteksiBahasa("The weather is very nice today")).toBe("en");
  });

  it("TIDAK membalik ke Inggris hanya karena satu kata Inggris", () => {
    // Inilah bug aslinya: satu kata "English" sudah cukup merusak semuanya.
    expect(deteksiBahasa("Saya suka belajar English")).toBe("id");
    expect(deteksiBahasa("Tolong jelaskan grammar ini")).toBe("id");
  });

  it("tidak terpengaruh huruf besar di awal kalimat", () => {
    // Bug lama: pola imbuhan diuji pada teks asli, jadi "Belajar" tidak cocok.
    const kecil = hitungKeyakinanBahasa("belajar bahasa inggris itu menyenangkan");
    const besar = hitungKeyakinanBahasa("Belajar bahasa inggris itu menyenangkan");
    expect(besar.skorId).toBeCloseTo(kecil.skorId, 5);
  });

  it("mengembalikan keyakinan yang berguna untuk memutuskan penguncian", () => {
    const kuat = hitungKeyakinanBahasa("Saya tidak mengerti apa yang kamu bilang");
    const lemah = hitungKeyakinanBahasa("Ya");
    expect(kuat.keyakinan).toBeGreaterThan(lemah.keyakinan);
  });

  it("menganggap teks kosong sebagai Indonesia (bahasa utama aplikasi)", () => {
    expect(deteksiBahasa("")).toBe("id");
    expect(deteksiBahasa("   ")).toBe("id");
  });

  it("memisahkan kata tanpa angka dan tanda baca", () => {
    expect(pecahKata("Halo, dunia! 123")).toEqual(["halo", "dunia"]);
  });
});
