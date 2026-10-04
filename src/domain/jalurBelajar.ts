/**
 * Kurikulum jalur belajar bahasa Inggris bertingkat CEFR.
 *
 * Struktur ini meniru "skill tree" Duolingo: unit disusun dari A1 sampai C1,
 * setiap unit berisi beberapa level, dan level terbuka setelah level sebelumnya
 * selesai. Semua kosakata di sini disusun sendiri (bukan salinan dari aplikasi
 * lain) dan dipilih dari kosakata yang paling sering dipakai dalam percakapan
 * sehari-hari.
 *
 * Setiap unit menyimpan:
 * - `grammar`  : poin tata bahasa yang dilatih,
 * - `kosakata` : daftar kata target beserta artinya,
 * - `skenario` : situasi percakapan untuk tutor suara AI,
 * - `latihan`  : soal kuis yang dipakai di layar kuis interaktif.
 */

/** Tingkat kemampuan berdasarkan kerangka CEFR. */
export type TingkatCefr = "A1" | "A2" | "B1" | "B2" | "C1";

/** Satu butir kosakata beserta artinya dalam Bahasa Indonesia. */
export interface Kosakata {
  /** Kata/frasa bahasa Inggris. */
  en: string;
  /** Arti dalam Bahasa Indonesia. */
  id: string;
  /** Contoh pemakaian dalam kalimat. */
  contoh?: string;
}

/** Tipe soal yang didukung mesin kuis. */
export type TipeSoal =
  | "susun-kalimat"
  | "cocokkan-kata"
  | "isi-rumpang"
  | "dengar-ketik"
  | "pilih-terjemahan";

/** Satu butir soal kuis. */
export interface Soal {
  id: string;
  tipe: TipeSoal;
  /** Pertanyaan yang ditampilkan ke pengguna. */
  pertanyaan: string;
  /** Untuk `susun-kalimat`: blok kata yang harus disusun. */
  blok?: string[];
  /** Untuk `isi-rumpang` & `pilih-terjemahan`: pilihan jawaban. */
  pilihan?: string[];
  /** Jawaban benar. Untuk `susun-kalimat` berupa kalimat utuh. */
  jawaban: string;
  /** Teks yang diucapkan untuk tipe `dengar-ketik`. */
  teksAudio?: string;
}

/** Satu level di dalam sebuah unit. */
export interface LevelJalur {
  id: string;
  /** Judul level, ditampilkan pada node peta. */
  judul: string;
  /** Ringkasan singkat isi level. */
  ringkasan: string;
  /** Soal kuis yang harus diselesaikan. */
  soal: Soal[];
  /** XP yang diberikan setelah level selesai. */
  xp: number;
}

/** Satu unit pembelajaran. */
export interface UnitJalur {
  id: string;
  tingkat: TingkatCefr;
  judul: string;
  /** Bahasa Indonesia untuk judul, agar pelajar paham konteksnya. */
  judulId: string;
  tema: string;
  /** Poin tata bahasa yang dilatih di unit ini. */
  grammar: string[];
  kosakata: Kosakata[];
  skenario: string[];
  level: LevelJalur[];
}

/**
 * Bangun soal "susun kalimat" dari sebuah kalimat benar.
 * Blok kata diacak secara deterministik agar urutannya selalu berbeda dari
 * jawaban, tanpa bergantung pada `Math.random()` (yang membuat tes tidak stabil).
 */
function soalSusun(id: string, kalimat: string, pertanyaan: string): Soal {
  const kata = kalimat.split(" ");
  // Putar daftar satu posisi: cukup untuk mengacak tanpa membuat tes goyah.
  const blok = [...kata.slice(1), kata[0]];
  return { id, tipe: "susun-kalimat", pertanyaan, blok, jawaban: kalimat };
}

/** Bangun soal isi rumpang dari kalimat yang satu katanya dihilangkan. */
function soalRumpang(
  id: string,
  kalimat: string,
  kataHilang: string,
  pilihan: string[]
): Soal {
  return {
    id,
    tipe: "isi-rumpang",
    pertanyaan: kalimat.replace(kataHilang, "____"),
    pilihan,
    jawaban: kataHilang
  };
}

/** Bangun soal dengar-lalu-ketik. */
function soalDengar(id: string, teks: string): Soal {
  return {
    id,
    tipe: "dengar-ketik",
    pertanyaan: "Dengarkan, lalu ketik kalimat yang kamu dengar.",
    teksAudio: teks,
    jawaban: teks
  };
}

/** Bangun soal pilih terjemahan. */
function soalTerjemahan(id: string, kata: string, jawaban: string, pengecoh: string[]): Soal {
  return {
    id,
    tipe: "pilih-terjemahan",
    pertanyaan: `Apa arti "${kata}"?`,
    pilihan: [jawaban, ...pengecoh].sort(),
    jawaban
  };
}

/**
 * Bangun soal cocokkan kata dari daftar kosakata.
 * Pasangan disembunyikan dari pengguna; UI hanya menerima daftar kosakata.
 */
function soalCocok(id: string, kosakata: Kosakata[]): Soal {
  return {
    id,
    tipe: "cocokkan-kata",
    pertanyaan: "Cocokkan kata bahasa Inggris dengan artinya.",
    jawaban: kosakata.map((k) => `${k.en}=${k.id}`).join("|")
  };
}

/**
 * Kurikulum lengkap.
 *
 * Disusun berurutan: makin ke bawah makin sulit. Urutan array inilah yang
 * menentukan urutan pembukaan level.
 */
export const KURIKULUM: UnitJalur[] = [
  {
    id: "unit-perkenalan",
    tingkat: "A1",
    judul: "Greetings & Introductions",
    judulId: "Sapaan & Perkenalan",
    tema: "Menyapa orang baru dan memperkenalkan diri",
    grammar: ["To be (am/is/are)", "Kata ganti orang", "Possessive adjective (my/your)"],
    kosakata: [
      { en: "hello", id: "halo", contoh: "Hello, my name is Rina." },
      { en: "good morning", id: "selamat pagi", contoh: "Good morning, sir." },
      { en: "name", id: "nama", contoh: "What is your name?" },
      { en: "nice to meet you", id: "senang berkenalan", contoh: "Nice to meet you too." },
      { en: "I am from", id: "saya berasal dari", contoh: "I am from Surabaya." },
      { en: "How are you", id: "apa kabar", contoh: "How are you today?" },
      { en: "fine", id: "baik", contoh: "I am fine, thank you." },
      { en: "friend", id: "teman", contoh: "He is my friend." }
    ],
    skenario: ["Berkenalan dengan tetangga baru", "Menyapa rekan kerja di pagi hari"],
    level: [
      {
        id: "lv-perkenalan-1",
        judul: "Sapaan Dasar",
        ringkasan: "Menyapa dan menjawab sapaan",
        xp: 20,
        soal: [
          soalTerjemahan("s1-1", "hello", "halo", ["selamat", "terima kasih", "maaf"]),
          soalSusun("s1-2", "My name is Rina", "Susun menjadi kalimat yang benar."),
          soalRumpang("s1-3", "How are you? I am ____", "fine", ["fine", "name", "from"]),
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
          soalTerjemahan("s2-1", "nice to meet you", "senang berkenalan", ["sampai jumpa", "selamat pagi", "apa kabar"]),
          soalSusun("s2-2", "I am from Surabaya", "Susun menjadi kalimat yang benar."),
          soalDengar("s2-3", "Good morning, nice to meet you"),
          soalRumpang("s2-4", "____ are you today?", "How", ["How", "What", "Where"])
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
          soalTerjemahan("f1-1", "mother", "ibu", ["ayah", "saudara", "anak"]),
          soalSusun("f1-2", "I have two sisters", "Susun menjadi kalimat yang benar."),
          soalCocok("f1-3", [
            { en: "father", id: "ayah" },
            { en: "mother", id: "ibu" },
            { en: "family", id: "keluarga" }
          ]),
          soalRumpang("f1-4", "My ____ is a teacher", "father", ["father", "family", "live"])
        ]
      },
      {
        id: "lv-keluarga-2",
        judul: "Menceritakan Keluarga",
        ringkasan: "Menyusun kalimat tentang keluarga",
        xp: 30,
        soal: [
          soalSusun("f2-1", "We live in Bandung", "Susun menjadi kalimat yang benar."),
          soalDengar("f2-2", "My sister has two children"),
          soalRumpang("f2-3", "He ____ one brother", "has", ["has", "have", "is"]),
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
          soalTerjemahan("d1-1", "breakfast", "sarapan", ["makan siang", "tidur", "bekerja"]),
          soalSusun("d1-2", "I wake up at six", "Susun menjadi kalimat yang benar."),
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
          soalSusun("d2-2", "I usually study at night", "Susun menjadi kalimat yang benar."),
          soalRumpang("d2-3", "He ____ in a bank", "works", ["works", "work", "working"]),
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
          soalSusun("b1-2", "I study English every day", "Susun menjadi kalimat yang benar."),
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
          soalSusun("b2-1", "I understand the lesson now", "Susun menjadi kalimat yang benar."),
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
          soalSusun("k1-1", "I have two years of experience", "Susun menjadi kalimat yang benar."),
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
          soalSusun("k2-2", "We achieved the target last month", "Susun menjadi kalimat yang benar."),
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
          soalSusun("t1-1", "Turn left at the corner", "Susun menjadi kalimat yang benar."),
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
          soalSusun("t2-1", "I will book a room tonight", "Susun menjadi kalimat yang benar."),
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
          soalSusun("o1-1", "I agree with your opinion", "Susun menjadi kalimat yang benar."),
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
          soalSusun("o2-2", "We need strong evidence for this", "Susun menjadi kalimat yang benar."),
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
          soalSusun("p1-1", "We will implement it next quarter", "Susun menjadi kalimat yang benar."),
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
          soalSusun("p2-2", "We need to align our goals first", "Susun menjadi kalimat yang benar."),
          soalRumpang("p2-3", "We can ____ existing data", "leverage", ["leverage", "mitigate", "align"]),
          soalTerjemahan("p2-4", "stakeholder", "pemangku kepentingan", ["pelanggan", "pesaing", "karyawan"])
        ]
      }
    ]
  }
];

/** Cari unit berdasarkan id. */
export function cariUnit(id: string): UnitJalur | null {
  return KURIKULUM.find((unit) => unit.id === id) ?? null;
}

/** Cari level beserta unit induknya. */
export function cariLevel(idLevel: string): { unit: UnitJalur; level: LevelJalur } | null {
  for (const unit of KURIKULUM) {
    const level = unit.level.find((item) => item.id === idLevel);
    if (level) return { unit, level };
  }
  return null;
}

/** Daftar seluruh level secara berurutan — inilah urutan kunci-terbuka. */
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

/** Total XP yang bisa dikumpulkan dari seluruh kurikulum. */
export function totalXpKurikulum(): number {
  return KURIKULUM.reduce(
    (total, unit) => total + unit.level.reduce((sub, level) => sub + level.xp, 0),
    0
  );
}
