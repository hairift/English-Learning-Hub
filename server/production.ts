/**
 * production.ts — server produksi satu-port untuk Sela Tutor English.
 *
 * Dipakai saat aplikasi di-hosting: satu proses Node melayani DUA hal sekaligus
 *  1. API backend (`/api/*`) dari `createApp()`.
 *  2. Berkas hasil build frontend (`dist/`) sebagai situs statis + fallback SPA.
 *
 * Dengan begitu aplikasi bisa berjalan di balik satu port publik (`PORT`),
 * sesuai syarat lingkungan hosting.
 *
 * Catatan: layanan TTS Python (Supertonic) bersifat opsional. Bila tidak ikut
 * berjalan, frontend otomatis jatuh ke suara bawaan browser sehingga latihan
 * tetap bisa dilakukan.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createApp } from "./app";

const folderIni = path.dirname(fileURLToPath(import.meta.url));
const folderDist = path.resolve(folderIni, "../dist");
const port = Number(process.env.PORT || 5174);
const host = process.env.HOST || "0.0.0.0";

const app = createApp();

// 1) Berkas statis hasil build frontend.
app.use(express.static(folderDist));

// 2) Fallback SPA: seluruh permintaan GET non-API diarahkan ke index.html
//    supaya navigasi sisi klien tetap bekerja saat halaman dimuat ulang.
app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api")) {
    next();
    return;
  }
  res.sendFile(path.join(folderDist, "index.html"));
});

app.listen(port, host, () => {
  console.log(`Sela Tutor English siap di http://${host}:${port}`);
});
