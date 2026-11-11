import type { TipeKarakter } from "../components/KarakterAnimasi";
import type { KategoriKemampuan } from "./diagnostikRiset";

export type TingkatCefr = "A1" | "A2" | "B1" | "B2" | "C1";

export type TipeSoal =
  | "susun-kalimat"
  | "isi-rumpang"
  | "pilih-terjemahan"
  | "dengar-ketik"
  | "cocokkan-pasangan"
  | "cocokkan-kata";

export interface PasanganKata {
  en: string;
  id: string;
}

export type Kosakata = ButirKosakata;

export interface Soal {
  id: string;
  tipe: TipeSoal;
  pertanyaan: string;
  petunjuk?: string;
  jawaban: string;
  pilihan?: string[];
  blok?: string[];
  kataPengecoh?: string[];
  pasangan?: PasanganKata[];
  kategori?: KategoriKemampuan;
  labelAtas?: string;
  karakter?: TipeKarakter;
  lawanBicara?: TipeKarakter;
  dialogAtas?: string;
  kalimatSuara?: string;
  bergambar?: boolean;
  petunjukKata?: Record<string, string>;
  penjelasan?: string;
}

export interface ButirKosakata {
  en: string;
  id: string;
  contoh?: string;
}

export interface LevelJalur {
  id: string;
  judul: string;
  ringkasan: string;
  xp: number;
  soal: Soal[];
}

export interface UnitJalur {
  id: string;
  tingkat: TingkatCefr;
  judul: string;
  judulId: string;
  tema: string;
  grammar: string[];
  kosakata: ButirKosakata[];
  skenario: string[];
  level: LevelJalur[];
}

function putarBlok(kata: string[]): string[] {
  if (kata.length <= 1) return [...kata];
  const indeksTengah = Math.max(1, Math.floor(kata.length / 2));
  const hasil = [...kata.slice(indeksTengah), ...kata.slice(0, indeksTengah)];
  if (hasil.join(" ") === kata.join(" ")) {
    return [kata[kata.length - 1], ...kata.slice(0, kata.length - 1)];
  }
  return hasil;
}

const DAFTAR_KARAKTER_URUT: TipeKarakter[] = [
  "ibu-dosen",
  "bapak-dosen",
  "mahasiswa",
  "mahasiswi"
];

function pilihKarakterDariId(id: string): TipeKarakter {
  let total = 0;
  for (let i = 0; i < id.length; i += 1) {
    total += id.charCodeAt(i);
  }
  return DAFTAR_KARAKTER_URUT[total % DAFTAR_KARAKTER_URUT.length];
}

function soalSusun(
  id: string,
  kalimat: string,
  artiIndo: string,
  opsi?: Partial<Soal>
): Soal {
  const kata = kalimat.split(" ");
  return {
    id,
    tipe: "susun-kalimat",
    pertanyaan: "Susun kata-kata ini menjadi kalimat bahasa Inggris yang tepat",
    petunjuk: artiIndo,
    jawaban: kalimat,
    blok: putarBlok(kata),
    kategori: "grammar",
    labelAtas: "TATA BAHASA & STRUKTUR",
    karakter: pilihKarakterDariId(id),
    kalimatSuara: kalimat,
    ...opsi
  };
}

function soalRumpang(
  id: string,
  kalimatRumpang: string,
  jawaban: string,
  pilihan: string[],
  opsi?: Partial<Soal>
): Soal {
  const kalimatUtuh = kalimatRumpang.replace("____", jawaban);
  return {
    id,
    tipe: "isi-rumpang",
    pertanyaan: kalimatRumpang,
    petunjuk: "Pilih kata yang paling tepat untuk melengkapi kalimat.",
    jawaban,
    pilihan,
    kategori: "grammar",
    labelAtas: "TATA BAHASA",
    karakter: pilihKarakterDariId(id),
    kalimatSuara: kalimatUtuh,
    ...opsi
  };
}

function soalTerjemahan(
  id: string,
  en: string,
  idArti: string,
  pengecoh: string[],
  opsi?: Partial<Soal>
): Soal {
  return {
    id,
    tipe: "pilih-terjemahan",
    pertanyaan: `Pilih arti yang benar untuk "${en}"`,
    jawaban: idArti,
    pilihan: [idArti, ...pengecoh],
    kategori: "vocabulary",
    labelAtas: "KOSAKATA BARU",
    karakter: pilihKarakterDariId(id),
    kalimatSuara: en,
    ...opsi
  };
}

function soalGambarKosakata(
  id: string,
  kataIndo: string,
  jawabanEn: string,
  pengecohEn: string[],
  opsi?: Partial<Soal>
): Soal {
  return {
    id,
    tipe: "pilih-terjemahan",
    pertanyaan: `Mana yang artinya "${kataIndo}"?`,
    jawaban: jawabanEn,
    pilihan: [jawabanEn, ...pengecohEn],
    kategori: "vocabulary",
    labelAtas: "KOSAKATA BARU",
    bergambar: true,
    kalimatSuara: jawabanEn,
    ...opsi
  };
}

function soalDialog(
  id: string,
  ucapanPertama: string,
  jawabanBalasan: string,
  pilihanBalasan: string[],
  karakterPertama: TipeKarakter = "mahasiswa",
  karakterKedua: TipeKarakter = "mahasiswi"
): Soal {
  return {
    id,
    tipe: "isi-rumpang",
    pertanyaan: "Lengkapi kalimatnya",
    dialogAtas: ucapanPertama,
    jawaban: jawabanBalasan,
    pilihan: pilihanBalasan,
    kategori: "grammar",
    labelAtas: "PERCAKAPAN",
    karakter: karakterPertama,
    lawanBicara: karakterKedua,
    kalimatSuara: ucapanPertama
  };
}

function soalDengar(id: string, kalimat: string, opsi?: Partial<Soal>): Soal {
  return {
    id,
    tipe: "dengar-ketik",
    pertanyaan: "Pilih atau ketik yang kamu dengar",
    petunjuk: "Putar suara normal atau lambat (kura-kura), lalu masukkan kalimatnya.",
    jawaban: kalimat,
    kategori: "listening",
    labelAtas: "LATIHAN MENDENGARKAN",
    karakter: pilihKarakterDariId(id),
    kalimatSuara: kalimat,
    ...opsi
  };
}

function soalCocok(id: string, pasangan: PasanganKata[]): Soal {
  return {
    id,
    tipe: "cocokkan-pasangan",
    pertanyaan: "Cocokkan kata bahasa Inggris dengan artinya",
    jawaban: pasangan.map((p) => `${p.en}=${p.id}`).join(";"),
    pasangan,
    kategori: "vocabulary",
    labelAtas: "PASANGKAN KATA"
  };
}

export const KURIKULUM: UnitJalur[] = [
  {
    id: "unit-perkenalan",
    tingkat: "A1",
    judul: "Greetings, Drinks & Self-Introduction",
    judulId: "Sapaan, Minuman & Perkenalan Diri",
    tema: "Menyapa, menawarkan minuman, dan memperkenalkan diri dengan ramah",
    grammar: ["To be (am/is/are)", "Kata ganti subjek (I, you, we)", "Ungkapan sopan (please, thank you)"],
    kosakata: [
      { en: "coffee", id: "kopi", contoh: "Coffee, please." },
      { en: "tea", id: "teh", contoh: "Tea or coffee?" },
      { en: "milk", id: "susu", contoh: "Water and milk, please." },
      { en: "welcome", id: "selamat datang", contoh: "Hello, welcome!" },
      { en: "hello", id: "halo", contoh: "Hello, I am Sari." },
      { en: "good morning", id: "selamat pagi", contoh: "Good morning, everyone." },
      { en: "nice to meet you", id: "senang berkenalan", contoh: "Nice to meet you, Budi." },
      { en: "friend", id: "teman", contoh: "He is my friend." }
    ],
    skenario: ["Menawarkan kopi atau teh ke tamu", "Menyapa teman baru di kampus"],
    level: [
      {
        id: "lv-perkenalan-1",
        judul: "Menawarkan Minuman & Sapaan",
        ringkasan: "Kosakata kopi, teh, susu, dan sapaan hangat",
        xp: 20,
        soal: [
          soalGambarKosakata("s1-0", "kopi", "coffee", ["tea", "milk"]),
          soalTerjemahan("s1-1", "good morning", "selamat pagi", ["selamat malam", "terima kasih", "sampai jumpa"], {
            karakter: "ibu-dosen",
            petunjukKata: { good: "selamat / baik", morning: "pagi" }
          }),
          soalSusun("s1-2", "My name is Sari", "Nama saya adalah Sari.", {
            karakter: "ibu-dosen",
            kataPengecoh: ["coffee", "are"],
            petunjukKata: { My: "milik saya", name: "nama", is: "adalah" }
          }),
          soalRumpang("s1-3", "I ____ a student", "am", ["am", "is", "are"], {
            karakter: "mahasiswa",
            penjelasan: "Subjek 'I' selalu berpasangan dengan 'am' dalam Simple Present."
          }),
          soalDialog(
            "s1-dialog",
            "Coffee or tea?",
            "Coffee, please.",
            ["Welcome.", "Coffee, please."],
            "mahasiswa",
            "bapak-dosen"
          ),
          soalCocok("s1-4", [
            { en: "hello", id: "halo" },
            { en: "name", id: "nama" },
            { en: "friend", id: "teman" }
          ])
        ]
      },
      {
        id: "lv-perkenalan-2",
        judul: "Memperkenalkan Diri",
        ringkasan: "Menyebut nama, asal, dan kabar",
        xp: 30,
        soal: [
          soalGambarKosakata("s2-0", "teh", "tea", ["coffee", "milk"]),
          soalTerjemahan("s2-1", "nice to meet you", "senang berkenalan", ["sampai jumpa", "selamat pagi", "apa kabar"], {
            karakter: "mahasiswi"
          }),
          soalSusun("s2-2", "I am from Surabaya", "Saya berasal dari Surabaya.", {
            karakter: "bapak-dosen",
            kataPengecoh: ["tea", "please"]
          }),
          soalDengar("s2-3", "Good morning, nice to meet you", {
            kataPengecoh: ["tea", "water", "night"]
          }),
          soalRumpang("s2-4", "____ are you today?", "How", ["How", "What", "Where"], {
            penjelasan: "'How are you?' digunakan untuk menanyakan kabar seseorang."
          })
        ]
      }
    ]
  },
  {
    id: "unit-keluarga",
    tingkat: "A1",
    judul: "Family & People",
    judulId: "Keluarga & Orang Terdekat",
    tema: "Membicarakan keluarga dan orang di sekitar",
    grammar: ["Possessive (my/your/his/her)", "Plural nouns", "Have/has"],
    kosakata: [
      { en: "family", id: "keluarga", contoh: "I have a small family." },
      { en: "father", id: "ayah", contoh: "My father is a teacher." },
      { en: "mother", id: "ibu", contoh: "My mother cooks well." },
      { en: "brother", id: "saudara laki-laki", contoh: "I have one brother." },
      { en: "sister", id: "saudara perempuan", contoh: "My sister is older." },
      { en: "married", id: "menikah", contoh: "They are married." },
      { en: "child", id: "anak", contoh: "She has two children." },
      { en: "live", id: "tinggal", contoh: "We live in Bandung." }
    ],
    skenario: ["Memperkenalkan foto keluarga", "Menjelaskan anggota keluarga ke teman"],
    level: [
      {
        id: "lv-keluarga-1",
        judul: "Anggota Keluarga",
        ringkasan: "Menyebut anggota keluarga",
        xp: 20,
        soal: [
          soalTerjemahan("f1-1", "mother", "ibu", ["ayah", "saudara", "anak"], { karakter: "ibu-dosen" }),
          soalSusun("f1-2", "I have two sisters", "Saya punya dua saudara perempuan.", {
            kataPengecoh: ["has", "brother"]
          }),
          soalCocok("f1-3", [
            { en: "father", id: "ayah" },
            { en: "mother", id: "ibu" },
            { en: "family", id: "keluarga" }
          ]),
          soalRumpang("f1-4", "My ____ is a teacher", "father", ["father", "family", "live"], {
            penjelasan: "'My father' adalah subjek tunggal yang diikuti 'is a teacher'."
          })
        ]
      },
      {
        id: "lv-keluarga-2",
        judul: "Menceritakan Keluarga",
        ringkasan: "Menyusun kalimat tentang keluarga",
        xp: 30,
        soal: [
          soalSusun("f2-1", "We live in Bandung", "Kami tinggal di Bandung."),
          soalDengar("f2-2", "My sister has two children", {
            kataPengecoh: ["brother", "three"]
          }),
          soalRumpang("f2-3", "He ____ one brother", "has", ["has", "have", "is"], {
            penjelasan: "Subjek tunggal orang ketiga (He/She) menggunakan 'has', bukan 'have'."
          }),
          soalTerjemahan("f2-4", "married", "menikah", ["lajang", "keluarga", "tinggal"])
        ]
      }
    ]
  },
  {
    id: "unit-harian",
    tingkat: "A2",
    judul: "Daily Routines",
    judulId: "Rutinitas Harian",
    tema: "Menceritakan kegiatan sehari-hari",
    grammar: ["Simple present tense", "Adverb of frequency", "Preposisi waktu (at/on/in)"],
    kosakata: [
      { en: "wake up", id: "bangun tidur", contoh: "I wake up at six." },
      { en: "breakfast", id: "sarapan", contoh: "I have breakfast with my family." },
      { en: "always", id: "selalu", contoh: "She always comes early." },
      { en: "sometimes", id: "kadang-kadang", contoh: "Sometimes I walk to work." },
      { en: "usually", id: "biasanya", contoh: "I usually study at night." },
      { en: "work", id: "bekerja", contoh: "He works in a bank." },
      { en: "go to bed", id: "pergi tidur", contoh: "I go to bed at ten." },
      { en: "busy", id: "sibuk", contoh: "I am busy on Mondays." }
    ],
    skenario: ["Menceritakan jadwal harian", "Menjelaskan kebiasaan pagi"],
    level: [
      {
        id: "lv-harian-1",
        judul: "Kegiatan Pagi",
        ringkasan: "Menyebut rutinitas pagi",
        xp: 25,
        soal: [
          soalGambarKosakata("d1-0", "sarapan", "breakfast", ["coffee", "work"]),
          soalTerjemahan("d1-1", "breakfast", "sarapan", ["makan siang", "tidur", "bekerja"]),
          soalSusun("d1-2", "I wake up at six", "Saya bangun tidur pukul enam."),
          soalRumpang("d1-3", "She ____ comes early", "always", ["always", "breakfast", "busy"]),
          soalDengar("d1-4", "I have breakfast with my family")
        ]
      },
      {
        id: "lv-harian-2",
        judul: "Kebiasaan Sehari-hari",
        ringkasan: "Memakai kata keterangan frekuensi",
        xp: 35,
        soal: [
          soalCocok("d2-1", [
            { en: "always", id: "selalu" },
            { en: "sometimes", id: "kadang-kadang" },
            { en: "usually", id: "biasanya" }
          ]),
          soalSusun("d2-2", "I usually study at night", "Saya biasanya belajar pada malam hari."),
          soalRumpang("d2-3", "He ____ in a bank", "works", ["works", "work", "working"], {
            penjelasan: "Simple Present untuk 'He' menambahkan akhiran -s pada kata kerja ('works')."
          }),
          soalTerjemahan("d2-4", "busy", "sibuk", ["santai", "cepat", "malas"])
        ]
      }
    ]
  },
  {
    id: "unit-belajar",
    tingkat: "A2",
    judul: "Learning & Campus",
    judulId: "Belajar & Kampus",
    tema: "Membicarakan kegiatan belajar dan perkuliahan",
    grammar: ["Present continuous", "Kata tanya (what/why/how)", "Because clause"],
    kosakata: [
      { en: "study", id: "belajar", contoh: "I study English every day." },
      { en: "assignment", id: "tugas", contoh: "I finish my assignment tonight." },
      { en: "lecture", id: "kuliah", contoh: "The lecture starts at eight." },
      { en: "library", id: "perpustakaan", contoh: "We study in the library." },
      { en: "deadline", id: "tenggat", contoh: "The deadline is tomorrow." },
      { en: "understand", id: "memahami", contoh: "I understand the lesson." },
      { en: "difficult", id: "sulit", contoh: "This topic is difficult." },
      { en: "improve", id: "meningkatkan", contoh: "I want to improve my speaking." }
    ],
    skenario: ["Berdiskusi tugas kelompok", "Bertanya ke dosen tentang materi"],
    level: [
      {
        id: "lv-belajar-1",
        judul: "Di Kampus",
        ringkasan: "Kosakata perkuliahan",
        xp: 25,
        soal: [
          soalTerjemahan("b1-1", "assignment", "tugas", ["kuliah", "tenggat", "ujian"]),
          soalSusun("b1-2", "I study English every day", "Saya belajar bahasa Inggris setiap hari."),
          soalRumpang("b1-3", "The ____ is tomorrow", "deadline", ["deadline", "library", "lecture"]),
          soalCocok("b1-4", [
            { en: "library", id: "perpustakaan" },
            { en: "lecture", id: "kuliah" },
            { en: "study", id: "belajar" }
          ])
        ]
      },
      {
        id: "lv-belajar-2",
        judul: "Membahas Tugas",
        ringkasan: "Menyampaikan pendapat tentang materi",
        xp: 35,
        soal: [
          soalSusun("b2-1", "I understand the lesson now", "Saya memahami pelajarannya sekarang."),
          soalDengar("b2-2", "I want to improve my speaking"),
          soalRumpang("b2-3", "This topic is ____", "difficult", ["difficult", "improve", "understand"]),
          soalTerjemahan("b2-4", "improve", "meningkatkan", ["menurunkan", "memahami", "membaca"])
        ]
      }
    ]
  },
  {
    id: "unit-kerja",
    tingkat: "B1",
    judul: "Work & Career",
    judulId: "Pekerjaan & Karier",
    tema: "Dunia kerja dan wawancara",
    grammar: ["Past tense", "Present perfect", "Modals (can/would/should)"],
    kosakata: [
      { en: "experience", id: "pengalaman", contoh: "I have two years of experience." },
      { en: "interview", id: "wawancara", contoh: "The interview is next week." },
      { en: "responsible", id: "bertanggung jawab", contoh: "I am responsible for the report." },
      { en: "colleague", id: "rekan kerja", contoh: "My colleague helps me a lot." },
      { en: "skill", id: "keterampilan", contoh: "Communication is an important skill." },
      { en: "achieve", id: "mencapai", contoh: "We achieved the target." },
      { en: "team", id: "tim", contoh: "I work in a small team." },
      { en: "salary", id: "gaji", contoh: "The salary is negotiable." }
    ],
    skenario: ["Wawancara kerja pertama", "Rapat membahas target tim"],
    level: [
      {
        id: "lv-kerja-1",
        judul: "Wawancara Kerja",
        ringkasan: "Menjawab pertanyaan wawancara",
        xp: 40,
        soal: [
          soalSusun("k1-1", "I have two years of experience", "Saya memiliki pengalaman dua tahun."),
          soalTerjemahan("k1-2", "colleague", "rekan kerja", ["atasan", "pelanggan", "gaji"]),
          soalRumpang("k1-3", "The interview is ____ week", "next", ["next", "last", "every"]),
          soalDengar("k1-4", "I work in a small team")
        ]
      },
      {
        id: "lv-kerja-2",
        judul: "Target & Pencapaian",
        ringkasan: "Membicarakan hasil kerja",
        xp: 50,
        soal: [
          soalCocok("k2-1", [
            { en: "skill", id: "keterampilan" },
            { en: "team", id: "tim" },
            { en: "salary", id: "gaji" }
          ]),
          soalSusun("k2-2", "We achieved the target last month", "Kami mencapai target bulan lalu."),
          soalRumpang("k2-3", "I am responsible ____ the report", "for", ["for", "to", "with"]),
          soalTerjemahan("k2-4", "achieve", "mencapai", ["meninggalkan", "meminta", "menolak"])
        ]
      }
    ]
  },
  {
    id: "unit-perjalanan",
    tingkat: "B1",
    judul: "Travel & Directions",
    judulId: "Perjalanan & Arah",
    tema: "Bepergian dan menanyakan arah",
    grammar: ["Imperative", "Preposisi tempat", "Future (will/going to)"],
    kosakata: [
      { en: "airport", id: "bandara", contoh: "The airport is far from here." },
      { en: "ticket", id: "tiket", contoh: "I booked a ticket online." },
      { en: "luggage", id: "bagasi", contoh: "My luggage is heavy." },
      { en: "turn left", id: "belok kiri", contoh: "Turn left at the corner." },
      { en: "straight", id: "lurus", contoh: "Go straight for 200 meters." },
      { en: "near", id: "dekat", contoh: "The hotel is near the station." },
      { en: "book", id: "memesan", contoh: "I will book a room." },
      { en: "arrive", id: "tiba", contoh: "We arrive at nine." }
    ],
    skenario: ["Menanyakan arah ke stasiun", "Check-in di bandara"],
    level: [
      {
        id: "lv-perjalanan-1",
        judul: "Menanyakan Arah",
        ringkasan: "Meminta dan memberi arah",
        xp: 40,
        soal: [
          soalSusun("t1-1", "Turn left at the corner", "Belok kiri di sudut jalan."),
          soalTerjemahan("t1-2", "luggage", "bagasi", ["tiket", "bandara", "hotel"]),
          soalRumpang("t1-3", "Go ____ for 200 meters", "straight", ["straight", "near", "left"]),
          soalCocok("t1-4", [
            { en: "airport", id: "bandara" },
            { en: "ticket", id: "tiket" },
            { en: "near", id: "dekat" }
          ])
        ]
      },
      {
        id: "lv-perjalanan-2",
        judul: "Di Bandara",
        ringkasan: "Check-in dan keberangkatan",
        xp: 50,
        soal: [
          soalSusun("t2-1", "I will book a room tonight", "Saya akan memesan kamar malam ini."),
          soalDengar("t2-2", "We arrive at nine in the morning"),
          soalRumpang("t2-3", "The hotel is ____ the station", "near", ["near", "book", "arrive"]),
          soalTerjemahan("t2-4", "arrive", "tiba", ["pergi", "memesan", "menunggu"])
        ]
      }
    ]
  },
  {
    id: "unit-opini",
    tingkat: "B2",
    judul: "Opinions & Discussion",
    judulId: "Opini & Diskusi",
    tema: "Menyampaikan dan membantah pendapat",
    grammar: ["Complex sentence", "Conjunction (although/however)", "Passive voice"],
    kosakata: [
      { en: "agree", id: "setuju", contoh: "I agree with your opinion." },
      { en: "however", id: "namun", contoh: "However, the cost is high." },
      { en: "although", id: "walaupun", contoh: "Although it is hard, I try." },
      { en: "point of view", id: "sudut pandang", contoh: "From my point of view, it works." },
      { en: "argue", id: "berargumen", contoh: "They argue about the budget." },
      { en: "evidence", id: "bukti", contoh: "We need strong evidence." },
      { en: "conclusion", id: "kesimpulan", contoh: "In conclusion, it is worth it." },
      { en: "persuade", id: "meyakinkan", contoh: "She persuaded the team." }
    ],
    skenario: ["Debat ringan tentang kebijakan kampus", "Diskusi kelompok mengambil keputusan"],
    level: [
      {
        id: "lv-opini-1",
        judul: "Menyampaikan Pendapat",
        ringkasan: "Mengutarakan sudut pandang",
        xp: 55,
        soal: [
          soalSusun("o1-1", "I agree with your opinion", "Saya setuju dengan pendapat Anda."),
          soalTerjemahan("o1-2", "however", "namun", ["karena", "walaupun", "sehingga"]),
          soalRumpang("o1-3", "____ it is hard, I still try", "Although", ["Although", "However", "Because"]),
          soalDengar("o1-4", "From my point of view it works well")
        ]
      },
      {
        id: "lv-opini-2",
        judul: "Menyimpulkan Diskusi",
        ringkasan: "Menyusun argumen dan kesimpulan",
        xp: 65,
        soal: [
          soalCocok("o2-1", [
            { en: "agree", id: "setuju" },
            { en: "evidence", id: "bukti" },
            { en: "conclusion", id: "kesimpulan" }
          ]),
          soalSusun("o2-2", "We need strong evidence for this", "Kita membutuhkan bukti kuat untuk ini."),
          soalRumpang("o2-3", "In ____, it is worth it", "conclusion", ["conclusion", "evidence", "argue"]),
          soalTerjemahan("o2-4", "persuade", "meyakinkan", ["melarang", "menolak", "mendengar"])
        ]
      }
    ]
  },
  {
    id: "unit-profesional",
    tingkat: "C1",
    judul: "Professional Communication",
    judulId: "Komunikasi Profesional",
    tema: "Presentasi dan negosiasi tingkat lanjut",
    grammar: ["Formal register", "Conditional (if/would)", "Hedging language"],
    kosakata: [
      { en: "negotiate", id: "bernegosiasi", contoh: "We need to negotiate the terms." },
      { en: "stakeholder", id: "pemangku kepentingan", contoh: "The stakeholder approved the plan." },
      { en: "implement", id: "menerapkan", contoh: "We will implement it next quarter." },
      { en: "feasible", id: "layak", contoh: "The plan is feasible." },
      { en: "sustainable", id: "berkelanjutan", contoh: "We need a sustainable solution." },
      { en: "leverage", id: "memanfaatkan", contoh: "We can leverage existing data." },
      { en: "mitigate", id: "meredam", contoh: "We mitigate the risk early." },
      { en: "align", id: "menyelaraskan", contoh: "Let us align our goals." }
    ],
    skenario: ["Presentasi proposal ke manajemen", "Negosiasi kontrak dengan klien"],
    level: [
      {
        id: "lv-profesional-1",
        judul: "Presentasi Proposal",
        ringkasan: "Menyampaikan usulan secara formal",
        xp: 70,
        soal: [
          soalSusun("p1-1", "We will implement it next quarter", "Kami akan menerapkannya kuartal depan."),
          soalTerjemahan("p1-2", "feasible", "layak", ["mahal", "rumit", "mustahil"]),
          soalRumpang("p1-3", "If we had more data, we ____ decide faster", "would", ["would", "will", "are"]),
          soalDengar("p1-4", "The stakeholder approved the plan yesterday")
        ]
      },
      {
        id: "lv-profesional-2",
        judul: "Negosiasi & Risiko",
        ringkasan: "Membahas syarat dan risiko",
        xp: 80,
        soal: [
          soalCocok("p2-1", [
            { en: "negotiate", id: "bernegosiasi" },
            { en: "mitigate", id: "meredam" },
            { en: "sustainable", id: "berkelanjutan" }
          ]),
          soalSusun("p2-2", "We need to align our goals first", "Kita perlu menyelaraskan tujuan kita terlebih dahulu."),
          soalRumpang("p2-3", "We can ____ existing data", "leverage", ["leverage", "mitigate", "align"]),
          soalTerjemahan("p2-4", "stakeholder", "pemangku kepentingan", ["pelanggan", "pesaing", "karyawan"])
        ]
      }
    ]
  }
];

export function cariUnit(id: string): UnitJalur | null {
  return KURIKULUM.find((unit) => unit.id === id) ?? null;
}

export function cariLevel(idLevel: string): { unit: UnitJalur; level: LevelJalur } | null {
  for (const unit of KURIKULUM) {
    const level = unit.level.find((item) => item.id === idLevel);
    if (level) return { unit, level };
  }
  return null;
}

export function daftarLevelBerurutan(): Array<{ unit: UnitJalur; level: LevelJalur; indeks: number }> {
  const hasil: Array<{ unit: UnitJalur; level: LevelJalur; indeks: number }> = [];
  let indeks = 0;
  for (const unit of KURIKULUM) {
    for (const level of unit.level) {
      hasil.push({ unit, level, indeks });
      indeks += 1;
    }
  }
  return hasil;
}

export function totalXpKurikulum(): number {
  return KURIKULUM.reduce(
    (total, unit) => total + unit.level.reduce((sub, level) => sub + level.xp, 0),
    0
  );
}
