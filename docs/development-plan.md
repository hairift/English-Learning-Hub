# Development & Delivery Plan

> **English** | [Bahasa Indonesia](#bahasa-indonesia)

---

## English

### Compliance window

* **Start:** 2026-06-05 00:00 (Asia/Shanghai, UTC+08:00)
* **Deadline:** 2026-06-08 23:59 (Asia/Shanghai, UTC+08:00)
* **Rule:** every commit timestamp must fall inside this window.

### Deliverables

* A publicly accessible GitHub repository (developed as a private repo, made
  public after the deadline).
* Continuous PR and commit history.
* A README covering dependencies, how to run, originality notes, and demo info.
* A demo video showing scenario selection, voice dialogue, correction,
  pronunciation assessment, and the post-session summary.

### PR breakdown

1. Repository initialisation and compliance documents.
2. Project scaffolding and base page shell.
3. Scenario selection and the practice flow.
4. Voice recording and real-time dialogue.
5. Pronunciation assessment and correction feedback.
6. Post-session summary and quantified feedback.
7. Demo video, README reproduction notes, and final acceptance.

### Per-PR checklist

* A PR contains a single feature.
* The PR description covers the feature, the implementation approach, how it was
  tested, dependencies, and sources.
* The main branch stays runnable after merge.
* Any new dependency is documented in the README or the PR description.
* Any reuse of the author's own historical code or public examples must state the
  source and the changes made.

### Continuation phase (this revision)

Beyond the original MVP, this continuation delivered:

| # | Workstream | Scope |
| --- | --- | --- |
| C1 | Rebrand | "AI Speaking Coach" → **Sela Tutor English**; favicon, titles, all copy |
| C2 | Theme | Full blue palette; legacy green tokens aliased; all emojis → `lucide-react` |
| C3 | 3D avatar | Replaced the 2D animation with a GLB model, animation clips, and auto framing |
| C4 | Lip sync | Web Audio analyser → 5 visemes + blink, with a text-driven fallback |
| C5 | Supertonic TTS | Default on-device TTS with 10 voices and auto ID/EN switching |
| C6 | Number normalisation | Dual-layer (TypeScript + Python) with a PUA placeholder scheme |
| C7 | Runtime providers | Five presets, configurable LLM / ASR / TTS from the Settings panel |
| C8 | Docs | Fully bilingual (English + Indonesian) with real screenshots |
| C9 | Typography | Nunito Variable via `@fontsource-variable/nunito` |

### Verification gates

Before any release:

```bash
npm run typecheck   # must exit 0
npm test            # 25 test files must pass
npm run build       # must produce dist/
```

Then run the app and confirm it loads in a browser.

---

## Bahasa Indonesia

### Jendela kepatuhan

* **Mulai:** 2026-06-05 00:00 (Asia/Shanghai, UTC+08:00)
* **Batas akhir:** 2026-06-08 23:59 (Asia/Shanghai, UTC+08:00)
* **Aturan:** setiap stempel waktu commit harus berada di dalam jendela ini.

### Luaran

* Repositori GitHub yang bisa diakses publik (dikembangkan sebagai repo privat,
  dipublikasikan setelah batas akhir).
* Riwayat PR dan commit yang berkelanjutan.
* README yang mencakup dependensi, cara menjalankan, catatan orisinalitas, dan
  info demo.
* Video demo yang menampilkan pemilihan skenario, dialog suara, koreksi, penilaian
  pengucapan, dan ringkasan pasca-sesi.

### Pemecahan PR

1. Inisialisasi repositori dan dokumen kepatuhan.
2. Scaffolding proyek dan kerangka halaman dasar.
3. Pemilihan skenario dan alur latihan.
4. Perekaman suara dan dialog real time.
5. Penilaian pengucapan dan umpan balik koreksi.
6. Ringkasan pasca-sesi dan umpan balik terukur.
7. Video demo, catatan reproduksi README, dan penerimaan akhir.

### Daftar periksa tiap PR

* Satu PR memuat satu fitur.
* Deskripsi PR mencakup fitur, pendekatan implementasi, cara pengujian,
  dependensi, dan sumber.
* Cabang utama tetap bisa dijalankan setelah merge.
* Dependensi baru apa pun didokumentasikan di README atau deskripsi PR.
* Penggunaan ulang kode historis penulis sendiri atau contoh publik harus
  menyebutkan sumber dan perubahannya.

### Fase lanjutan (revisi ini)

Di luar MVP asli, lanjutan ini menghasilkan:

| # | Alur kerja | Cakupan |
| --- | --- | --- |
| C1 | Rebranding | "AI Speaking Coach" → **Sela Tutor English**; favicon, judul, semua teks |
| C2 | Tema | Palet biru penuh; token hijau lama dialias; semua emoji → `lucide-react` |
| C3 | Avatar 3D | Mengganti animasi 2D dengan model GLB, klip animasi, dan pembingkaian otomatis |
| C4 | Lip sync | Analiser Web Audio → 5 viseme + kedip, dengan cadangan dari teks |
| C5 | Supertonic TTS | TTS default di perangkat dengan 10 suara dan ganti ID/EN otomatis |
| C6 | Normalisasi angka | Dua lapis (TypeScript + Python) dengan skema penanda PUA |
| C7 | Provider runtime | Lima preset, LLM / ASR / TTS bisa diatur dari panel Pengaturan |
| C8 | Dokumentasi | Sepenuhnya bilingual (Inggris + Indonesia) dengan tangkapan layar nyata |
| C9 | Tipografi | Nunito Variable lewat `@fontsource-variable/nunito` |

### Gerbang verifikasi

Sebelum rilis apa pun:

```bash
npm run typecheck   # harus keluar 0
npm test            # 25 berkas uji harus lulus
npm run build       # harus menghasilkan dist/
```

Lalu jalankan aplikasi dan pastikan tampil di browser.
