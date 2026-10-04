/**
 * cek-deteksi.mjs — membuktikan perbaikan deteksi bahasa pada kasus nyata.
 * Jalankan dengan tsx agar bisa mengimpor TypeScript langsung.
 */
import { deteksiBahasa, hitungKeyakinanBahasa } from "../src/domain/deteksiBahasa.ts";

const kasus = [
  // [teks, harapan]
  ["Apa kabar hari ini?", "id"],
  ["Saya suka belajar bahasa Inggris.", "id"],
  ["Makanan ini enak sekali.", "id"],
  ["Terima kasih banyak ya.", "id"],
  ["Nama saya Rina, saya tinggal di Surabaya.", "id"],
  ["Besok saya mau pergi ke kantor.", "id"],
  ["Belajar bahasa Inggris itu menyenangkan.", "id"],
  ["Saya tidak mengerti apa yang kamu bilang.", "id"],
  ["Bagaimana cara membuat kopi?", "id"],

  ["Hello, how are you today?", "en"],
  ["I would like to order a cup of coffee.", "en"],
  ["My name is Rina and I live in Surabaya.", "en"],
  ["Could you please help me with this?", "en"],
  ["The weather is very nice today.", "en"],
  ["I have been learning English for two years.", "en"],

  // Kasus campuran — inilah yang dulu merusak STT Indonesia.
  ["Saya suka belajar English", "id"],
  ["Tolong jelaskan grammar ini", "id"]
];

let lulus = 0;
const gagal = [];

for (const [teks, harapan] of kasus) {
  const d = hitungKeyakinanBahasa(teks);
  const ok = d.bahasa === harapan;
  if (ok) lulus += 1;
  else gagal.push({ teks, harapan, dapat: d.bahasa, skorId: d.skorId, skorEn: d.skorEn });
  console.log(
    `${ok ? "OK  " : "GAGAL"} | ${d.bahasa} (id=${d.skorId.toFixed(2)} en=${d.skorEn.toFixed(2)} yakin=${d.keyakinan.toFixed(2)}) | ${teks}`
  );
}

console.log(`\n${lulus}/${kasus.length} lulus`);
if (gagal.length) {
  console.log("Gagal:", JSON.stringify(gagal, null, 2));
  process.exit(1);
}
