import { describe, expect, it } from "vitest";
import {
  AMBANG_PROMOSI_LIGA,
  buatGamifikasiKosong,
  hitungLiga,
  hitungRentetan,
  isiPenuhNyawa,
  kurangiNyawa,
  normalkanGamifikasi,
  nyawaTerkini,
  papanPeringkatMingguan,
  SELANG_PEMULIHAN_NYAWA_MS,
  selisihHari,
  sisaXpNaikLiga,
  tambahXp,
  xpMingguan,
  NYAWA_MAKSIMUM
} from "../src/domain/gamifikasi";

describe("rentetan (streak)", () => {
  it("menghitung hari berurutan", () => {
    expect(hitungRentetan(["2026-10-01", "2026-10-02", "2026-10-03"], "2026-10-03")).toBe(3);
  });

  it("tetap dihitung bila latihan terakhir kemarin", () => {
    expect(hitungRentetan(["2026-10-01", "2026-10-02"], "2026-10-03")).toBe(2);
  });

  it("putus bila bolong lebih dari satu hari", () => {
    expect(hitungRentetan(["2026-10-01"], "2026-10-03")).toBe(0);
  });

  it("mengabaikan urutan masukan yang berantakan", () => {
    expect(hitungRentetan(["2026-10-03", "2026-10-01", "2026-10-02"], "2026-10-03")).toBe(3);
  });

  it("nol bila belum pernah latihan", () => {
    expect(hitungRentetan([], "2026-10-03")).toBe(0);
  });

  it("menghitung selisih hari dengan benar", () => {
    expect(selisihHari("2026-10-01", "2026-10-03")).toBe(2);
    expect(selisihHari("2026-10-03", "2026-10-01")).toBe(-2);
  });
});

describe("XP dan liga", () => {
  it("menambahkan XP dan mencatat tanggal", () => {
    const next = tambahXp(buatGamifikasiKosong(), 25, "2026-10-03");
    expect(next.xpTotal).toBe(25);
    expect(next.rentetan).toBe(1);
    expect(next.terakhirLatihan).toBe("2026-10-03");
  });

  it("menumpuk XP pada hari yang sama", () => {
    const sekali = tambahXp(buatGamifikasiKosong(), 20, "2026-10-03");
    const dua = tambahXp(sekali, 30, "2026-10-03");
    expect(dua.xpTotal).toBe(50);
    expect(dua.xpHarian).toHaveLength(1);
    expect(dua.xpHarian[0].xp).toBe(50);
  });

  it("memperpanjang rentetan pada hari berikutnya", () => {
    const hari1 = tambahXp(buatGamifikasiKosong(), 20, "2026-10-03");
    const hari2 = tambahXp(hari1, 20, "2026-10-04");
    expect(hari2.rentetan).toBe(2);
    expect(hari2.rentetanTerpanjang).toBe(2);
  });

  it("memakai pelindung rentetan untuk menyelamatkan satu hari bolong", () => {
    // Mulai tanpa nyawa agar "berlatih memulihkan nyawa" tidak menutupi efek
    // pelindung — yang diuji di sini adalah pelindung, bukan pemulihan nyawa.
    const awal = { ...buatGamifikasiKosong(), nyawa: 0 };
    const hari1 = tambahXp(awal, 20, "2026-10-03");
    const hari3 = tambahXp(hari1, 20, "2026-10-05");
    // Jeda dua hari + ada pelindung → pelindung terpakai dan rentetan lanjut.
    expect(hari3.pelindungRentetan).toBe(1);
    expect(hari3.rentetan).toBe(2);
    expect(hari3.terakhirLatihan).toBe("2026-10-05");
  });

  it("memulihkan satu nyawa setiap kali berlatih", () => {
    const kurang = kurangiNyawa(buatGamifikasiKosong(), new Date("2026-10-03T00:00:00Z"));
    const setelahLatihan = tambahXp(kurang, 10, "2026-10-03");
    expect(setelahLatihan.nyawa).toBe(NYAWA_MAKSIMUM - 1 + 1);
  });

  it("mengabaikan XP negatif", () => {
    expect(tambahXp(buatGamifikasiKosong(), -50, "2026-10-03").xpTotal).toBe(0);
  });

  it("menghitung XP mingguan tujuh hari terakhir", () => {
    let state = buatGamifikasiKosong();
    state = tambahXp(state, 30, "2026-10-01");
    state = tambahXp(state, 40, "2026-10-03");
    expect(xpMingguan(state.xpHarian, "2026-10-03")).toBe(70);
  });

  it("naik liga setelah melewati ambang", () => {
    const ambang = AMBANG_PROMOSI_LIGA.Bronze;
    const state = tambahXp(buatGamifikasiKosong(), ambang, "2026-10-03");
    expect(state.liga).toBe("Silver");
  });

  it("tidak turun liga walau XP minggu baru kosong", () => {
    expect(hitungLiga([], "Gold")).toBe("Gold");
  });

  it("menghitung sisa XP menuju liga berikutnya", () => {
    const state = tambahXp(buatGamifikasiKosong(), 20, "2026-10-03");
    expect(sisaXpNaikLiga(state, "2026-10-03")).toBe(AMBANG_PROMOSI_LIGA.Bronze - 20);
  });

  it("tidak punya target lagi di liga tertinggi", () => {
    const state = { ...buatGamifikasiKosong(), liga: "Diamond" as const };
    expect(sisaXpNaikLiga(state)).toBeNull();
  });
});

describe("nyawa", () => {
  it("berkurang satu saat salah", () => {
    const next = kurangiNyawa(buatGamifikasiKosong());
    expect(next.nyawa).toBe(NYAWA_MAKSIMUM - 1);
  });

  it("tidak bisa kurang dari nol", () => {
    let state = buatGamifikasiKosong();
    for (let i = 0; i < 10; i += 1) state = kurangiNyawa(state);
    expect(state.nyawa).toBe(0);
  });

  it("pulih seiring waktu", () => {
    // Kurangi dua nyawa supaya hasilnya tetap di bawah batas maksimum.
    const satu = kurangiNyawa(buatGamifikasiKosong(), new Date("2026-10-03T00:00:00Z"));
    const dua = kurangiNyawa(satu, new Date("2026-10-03T00:00:00Z"));
    const nanti = new Date(Date.parse(dua.nyawaBerkurangPada as string) + SELANG_PEMULIHAN_NYAWA_MS);
    expect(nyawaTerkini(dua, nanti)).toBe(NYAWA_MAKSIMUM - 2 + 1);
  });

  it("tidak melebihi maksimum", () => {
    expect(nyawaTerkini(buatGamifikasiKosong())).toBe(NYAWA_MAKSIMUM);
  });

  it("penuh kembali setelah diisi", () => {
    const kurang = kurangiNyawa(buatGamifikasiKosong());
    expect(isiPenuhNyawa(kurang).nyawa).toBe(NYAWA_MAKSIMUM);
  });
});

describe("papan peringkat", () => {
  it("memuat baris milik pengguna dengan XP nyata", () => {
    const state = tambahXp(buatGamifikasiKosong(), 45, "2026-10-03");
    const papan = papanPeringkatMingguan(state, "2026-10-03");
    const milikSaya = papan.find((baris) => baris.milikSaya);
    expect(milikSaya?.xp).toBe(45);
  });

  it("terurut dari XP terbesar", () => {
    const state = tambahXp(buatGamifikasiKosong(), 45, "2026-10-03");
    const papan = papanPeringkatMingguan(state, "2026-10-03");
    const nilaiXp = papan.map((baris) => baris.xp);
    expect([...nilaiXp].sort((a, b) => b - a)).toEqual(nilaiXp);
  });
});

describe("normalisasi data gamifikasi", () => {
  it("mengembalikan keadaan kosong untuk data tidak valid", () => {
    expect(normalkanGamifikasi(null).xpTotal).toBe(0);
    expect(normalkanGamifikasi("rusak").rentetan).toBe(0);
  });

  it("membatasi nyawa pada nilai maksimum", () => {
    expect(normalkanGamifikasi({ nyawa: 99 }).nyawa).toBe(NYAWA_MAKSIMUM);
  });

  it("menolak nama liga yang tidak dikenal", () => {
    expect(normalkanGamifikasi({ liga: "Platinum" }).liga).toBe("Bronze");
  });

  it("menghitung ulang total XP bila tidak ada", () => {
    const hasil = normalkanGamifikasi({
      xpHarian: [{ tanggal: "2026-10-01", xp: 10 }]
    });
    expect(hasil.xpHarian).toHaveLength(1);
    expect(hasil.xpTotal).toBe(0);
  });
});
