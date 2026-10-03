/**
 * bahasaAsr.test.ts — uji penyimpanan preferensi bahasa pengenalan suara.
 *
 * Pengguna kini bisa memilih bahasa ASR (Otomatis / Indonesia / Inggris).
 * Pilihannya harus bertahan antar sesi dan selalu jatuh ke nilai aman
 * ("auto") bila data tersimpan rusak atau tidak dikenal.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { loadBahasaAsr, saveBahasaAsr } from "../src/storage";

function pasangLocalStorage(seed: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(seed));
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear()
    }
  });
}

describe("preferensi bahasa ASR", () => {
  beforeEach(() => {
    pasangLocalStorage();
  });

  it("memakai mode otomatis sebagai default", () => {
    expect(loadBahasaAsr()).toBe("auto");
  });

  it("menyimpan dan membaca kembali pilihan pengguna", () => {
    saveBahasaAsr("id-ID");
    expect(loadBahasaAsr()).toBe("id-ID");

    saveBahasaAsr("en-US");
    expect(loadBahasaAsr()).toBe("en-US");
  });

  it("mengabaikan nilai tersimpan yang tidak dikenal", () => {
    pasangLocalStorage({ "sela-asr-language": "klingon" });
    expect(loadBahasaAsr()).toBe("auto");
  });
});
