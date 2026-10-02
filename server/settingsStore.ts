/**
 * settingsStore.ts — penyimpanan pengaturan runtime ke berkas lokal.
 *
 * Pengaturan yang diisi pengguna di panel "Pengaturan API" disimpan ke berkas
 * `.sela-settings.json` di root proyek. Berkas ini sudah masuk `.gitignore`,
 * jadi kunci API tidak akan pernah ikut ter-commit ke repositori.
 *
 * Catatan keamanan: berkas ini berisi kunci API dalam bentuk teks biasa dan
 * hanya boleh berada di komputer pengguna sendiri.
 */

import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { RuntimeSettingsInput } from "./config";

/** Nama berkas penyimpanan pengaturan. */
const NAMA_BERKAS = ".sela-settings.json";

/** Lokasi berkas pengaturan (root proyek). */
function jalurPengaturan() {
  return path.resolve(process.cwd(), NAMA_BERKAS);
}

/** Kunci yang boleh disimpan. Selain ini akan diabaikan. */
const KUNCI_DIIZINKAN: Array<keyof RuntimeSettingsInput> = [
  "apiMode",
  "providerPreset",
  "asrProvider",
  "asrApiKey",
  "asrModel",
  "deepgramApiKey",
  "llmProvider",
  "llmApiKey",
  "llmBaseUrl",
  "llmModel",
  "openaiApiKey",
  "openaiModel",
  "ttsProvider",
  "ttsApiKey",
  "ttsModel",
  "ttsLanguageMode",
  "ttsVoiceId",
  "ttsSpeed",
  "ttsSteps",
  "ttsServiceUrl",
  "cartesiaApiKey",
  "cartesiaVersion",
  "cartesiaModel",
  "cartesiaVoiceId",
  "pronunciationProvider"
];

/** Membaca pengaturan tersimpan. Mengembalikan null bila belum ada. */
export function muatPengaturanTersimpan(): RuntimeSettingsInput | null {
  const jalur = jalurPengaturan();
  if (!existsSync(jalur)) return null;
  try {
    const mentah = JSON.parse(readFileSync(jalur, "utf8")) as Record<string, unknown>;
    const bersih: Record<string, unknown> = {};
    for (const kunci of KUNCI_DIIZINKAN) {
      if (kunci in mentah) bersih[kunci] = mentah[kunci];
    }
    return bersih as RuntimeSettingsInput;
  } catch {
    return null;
  }
}

/** Menyimpan pengaturan ke berkas lokal (menimpa yang lama). */
export function simpanPengaturan(input: RuntimeSettingsInput) {
  const bersih: Record<string, unknown> = {};
  for (const kunci of KUNCI_DIIZINKAN) {
    const nilai = input[kunci];
    if (nilai === undefined) continue;
    bersih[kunci] = nilai;
  }
  writeFileSync(jalurPengaturan(), `${JSON.stringify(bersih, null, 2)}\n`, "utf8");
}

/** Menghapus berkas pengaturan tersimpan. */
export function hapusPengaturanTersimpan() {
  const jalur = jalurPengaturan();
  if (existsSync(jalur)) rmSync(jalur, { force: true });
}

/** True bila berkas pengaturan tersimpan ada. */
export function adaPengaturanTersimpan() {
  return existsSync(jalurPengaturan());
}
