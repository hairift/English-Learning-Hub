import React from "react";

export type TipeKarakter = "bapak-dosen" | "ibu-dosen" | "mahasiswa" | "mahasiswi";

export interface DataKarakter {
  id: TipeKarakter;
  nama: string;
  peran: string;
  gender: "laki" | "perempuan";
}

export const DAFTAR_KARAKTER: Record<TipeKarakter, DataKarakter> = {
  "bapak-dosen": {
    id: "bapak-dosen",
    nama: "Pak Aris",
    peran: "Dosen Pembimbing",
    gender: "laki",
  },
  "ibu-dosen": {
    id: "ibu-dosen",
    nama: "Bu Sari",
    peran: "Mentor Bahasa",
    gender: "perempuan",
  },
  mahasiswa: {
    id: "mahasiswa",
    nama: "Raka",
    peran: "Mahasiswa Teknik",
    gender: "laki",
  },
  mahasiswi: {
    id: "mahasiswi",
    nama: "Nadia",
    peran: "Mahasiswi Bisnis",
    gender: "perempuan",
  },
};

export function infoKarakter(id?: TipeKarakter): DataKarakter {
  return DAFTAR_KARAKTER[id ?? "ibu-dosen"] ?? DAFTAR_KARAKTER["ibu-dosen"];
}

interface MaskotCendekiaProps {
  ukuran?: number;
  pose?: "santai" | "senang" | "bicara" | "juara";
  className?: string;
}

/**
 * Maskot resmi aplikasi kampus: Burung Hantu Cendekia (UCIC Scholar Owl).
 * Dilengkapi animasi kedipan mata, kepakan sayap, dan ekspresi belajar.
 */
export function MaskotCendekia({
  ukuran = 120,
  pose = "santai",
  className = "",
}: MaskotCendekiaProps) {
  const angkatSayap = pose === "senang" || pose === "juara";
  const mulutTerbuka = pose === "bicara" || pose === "senang" || pose === "juara";

  return (
    <svg
      width={ukuran}
      height={ukuran}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`maskot-cendekia maskot-pose-${pose} ${className}`.trim()}
      role="img"
      aria-label="Maskot Cendekia"
    >
      {/* Bayangan bawah */}
      <ellipse cx="80" cy="148" rx="44" ry="8" fill="currentColor" opacity="0.14" />

      {/* Bintang perayaan saat juara atau senang */}
      {(pose === "juara" || pose === "senang") && (
        <g className="maskot-bintang">
          <path
            d="M26 36L29 42L35 43L30 47L32 53L26 50L20 53L22 47L17 43L23 42L26 36Z"
            fill="#FFC800"
          />
          <path
            d="M136 30L138 35L143 36L139 39L140 44L136 41L132 44L133 39L129 36L134 35L136 30Z"
            fill="#FFC800"
          />
          <circle cx="38" cy="22" r="4" fill="#58CC02" />
          <circle cx="125" cy="20" r="3.5" fill="#1CB0F6" />
        </g>
      )}

      {/* Sayap kiri */}
      <g className={angkatSayap ? "sayap-kiri-angkat" : "sayap-kiri-normal"}>
        <path
          d={
            angkatSayap
              ? "M36 86C18 68 14 44 26 36C36 30 46 52 46 74Z"
              : "M38 72C22 82 20 108 32 118C40 124 46 106 46 86Z"
          }
          fill="#46A302"
        />
      </g>

      {/* Sayap kanan */}
      <g className={angkatSayap ? "sayap-kanan-angkat" : "sayap-kanan-normal"}>
        <path
          d={
            angkatSayap
              ? "M124 86C142 68 146 44 134 36C124 30 114 52 114 74Z"
              : "M122 72C138 82 140 108 128 118C120 124 114 106 114 86Z"
          }
          fill="#46A302"
        />
      </g>

      {/* Kaki */}
      <rect x="58" y="132" width="14" height="10" rx="5" fill="#FF9600" />
      <rect x="88" y="132" width="14" height="10" rx="5" fill="#FF9600" />

      {/* Badan utama */}
      <rect x="36" y="40" width="88" height="96" rx="42" fill="#58CC02" />
      <path
        d="M52 42C58 32 68 38 72 42M108 42C102 32 92 38 88 42"
        stroke="#58CC02"
        strokeWidth="8"
        strokeLinecap="round"
      />

      {/* Perut cerah dengan aksen bulu */}
      <ellipse cx="80" cy="106" rx="30" ry="24" fill="#89E219" />
      <path
        d="M68 98Q74 104 80 98M80 98Q86 104 92 98M72 110Q80 116 88 110"
        stroke="#58CC02"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Lingkar mata burung hantu */}
      <circle cx="62" cy="72" r="18" fill="#B8F28B" />
      <circle cx="98" cy="72" r="18" fill="#B8F28B" />
      <circle cx="62" cy="72" r="14" fill="#FFFFFF" />
      <circle cx="98" cy="72" r="14" fill="#FFFFFF" />

      {/* Pupil mata dengan animasi kedip */}
      <g className="mata-kedip">
        <circle cx="64" cy="72" r="7.5" fill="#1F2937" />
        <circle cx="96" cy="72" r="7.5" fill="#1F2937" />
        <circle cx="66.5" cy="69" r="2.8" fill="#FFFFFF" />
        <circle cx="98.5" cy="69" r="2.8" fill="#FFFFFF" />
      </g>

      {/* Alis ekspresif */}
      <path d="M46 54C52 49 64 50 70 55" stroke="#378700" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M114 54C108 49 96 50 90 55" stroke="#378700" strokeWidth="4.5" strokeLinecap="round" />

      {/* Paruh */}
      {mulutTerbuka ? (
        <g>
          <path d="M72 78Q80 73 88 78L80 91Z" fill="#FFC800" />
          <path d="M75 83L80 92L85 83Z" fill="#EA2B2B" />
        </g>
      ) : (
        <path d="M73 78Q80 74 87 78L80 87Z" fill="#FFC800" />
      )}

      {/* Topi Toga Kampus UCIC */}
      <g className="topi-toga">
        <polygon points="80,14 122,28 80,42 38,28" fill="#1CB0F6" />
        <polygon points="80,16 116,28 80,39 44,28" fill="#2BD4FF" />
        <rect x="60" y="34" width="40" height="10" rx="4" fill="#0F82BA" />
        <path d="M112 31V49" stroke="#FFC800" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="112" cy="51" r="4" fill="#FFC800" />
      </g>

      {/* Dasi kupu-kupu akademik */}
      <path d="M70 88L80 93L70 98Z" fill="#1CB0F6" />
      <path d="M90 88L80 93L90 98Z" fill="#1CB0F6" />
      <circle cx="80" cy="93" r="3" fill="#0F82BA" />
    </svg>
  );
}

interface Karakter2DProps {
  karakter: TipeKarakter;
  ukuran?: number;
  sedangBicara?: boolean;
  ekspresi?: "normal" | "senang" | "berpikir";
  menghadap?: "kanan" | "kiri";
  className?: string;
}

/**
 * Karakter 2D bergaya Duolingo (Pak Aris, Bu Sari, Raka, Nadia)
 * untuk mendampingi soal kuis, dialog, dan layar perayaan.
 */
export function Karakter2D({
  karakter,
  ukuran = 108,
  sedangBicara = false,
  ekspresi = "normal",
  menghadap = "kanan",
  className = "",
}: Karakter2DProps) {
  const balik = menghadap === "kiri" ? "scale(-1, 1)" : undefined;
  const kelasBicara = sedangBicara ? "karakter-sedang-bicara" : "";

  if (karakter === "bapak-dosen") {
    return (
      <svg
        width={ukuran}
        height={ukuran}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`karakter-2d karakter-bapak ${kelasBicara} ${className}`.trim()}
        role="img"
        aria-label="Pak Aris"
      >
        <g transform={balik} style={{ transformOrigin: "60px 60px" }}>
          {/* Baju hangat magenta/ungu khas bapak ramah */}
          <path d="M24 114C26 88 40 78 60 78C80 78 94 88 96 114H24Z" fill="#CE82FF" />
          <path d="M46 86L52 91L58 86M62 86L68 91L74 86M54 96L60 101L66 96" stroke="#9B42D8" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          {/* Leher & Wajah */}
          <rect x="51" y="64" width="18" height="16" rx="6" fill="#C68652" />
          <rect x="38" y="30" width="44" height="42" rx="20" fill="#C68652" />
          {/* Telinga */}
          <circle cx="38" cy="52" r="6" fill="#B57442" />
          <circle cx="82" cy="52" r="6" fill="#B57442" />
          {/* Topi/Turban biru cerah */}
          <path d="M34 42C34 22 48 14 60 14C72 14 86 22 86 42C76 34 66 34 60 38C54 34 44 34 34 42Z" fill="#1CB0F6" />
          <path d="M40 28C48 22 60 24 68 34" stroke="#0F82BA" strokeWidth="3" strokeLinecap="round" />
          {/* Mata */}
          <g className="mata-kedip">
            <ellipse cx="52" cy="48" rx="5.5" ry="6.5" fill="#FFFFFF" />
            <ellipse cx="68" cy="48" rx="5.5" ry="6.5" fill="#FFFFFF" />
            <circle cx="53.5" cy="48" r="3" fill="#1F2937" />
            <circle cx="69.5" cy="48" r="3" fill="#1F2937" />
          </g>
          {/* Janggut lebat bapak-bapak */}
          <path d="M35 56C35 52 46 52 60 52C74 52 85 52 85 56C85 70 74 78 60 78C46 78 35 70 35 56Z" fill="#4B5563" />
          {/* Mulut di balik janggut */}
          {sedangBicara || ekspresi === "senang" ? (
            <path d="M53 59C53 64 67 64 67 59Z" fill="#FFFFFF" className="mulut-bicara" />
          ) : (
            <path d="M54 60Q60 64 66 60" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
          )}
        </g>
      </svg>
    );
  }

  if (karakter === "ibu-dosen") {
    return (
      <svg
        width={ukuran}
        height={ukuran}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`karakter-2d karakter-ibu ${kelasBicara} ${className}`.trim()}
        role="img"
        aria-label="Bu Sari"
      >
        <g transform={balik} style={{ transformOrigin: "60px 60px" }}>
          {/* Kemeja putih dan kardigan coklat keemasan hangat */}
          <path d="M26 114C28 88 41 78 60 78C79 78 92 88 94 114H26Z" fill="#D97706" />
          <rect x="50" y="78" width="20" height="36" fill="#FFFFFF" />
          <path d="M50 78L42 114M70 78L78 114" stroke="#B45309" strokeWidth="3" />
          {/* Leher & Wajah */}
          <rect x="52" y="64" width="16" height="16" rx="6" fill="#F3C19D" />
          <rect x="39" y="30" width="42" height="40" rx="19" fill="#F3C19D" />
          {/* Anting mutiara */}
          <circle cx="38" cy="56" r="3" fill="#FFC800" />
          <circle cx="82" cy="56" r="3" fill="#FFC800" />
          {/* Rambut sanggul dua warna elegan khas ibu-ibu */}
          <circle cx="48" cy="24" r="14" fill="#4B5563" />
          <path d="M36 42C36 26 48 20 62 22C74 24 82 32 82 44C74 36 62 36 36 42Z" fill="#9CA3AF" />
          <circle cx="52" cy="30" r="11" fill="#4B5563" />
          {/* Kacamata bundar */}
          <g className="mata-kedip">
            <circle cx="52" cy="49" r="6" fill="#FFFFFF" stroke="#374151" strokeWidth="2.2" />
            <circle cx="68" cy="49" r="6" fill="#FFFFFF" stroke="#374151" strokeWidth="2.2" />
            <line x1="58" y1="49" x2="62" y2="49" stroke="#374151" strokeWidth="2.2" />
            <circle cx="53" cy="49" r="2.6" fill="#1F2937" />
            <circle cx="69" cy="49" r="2.6" fill="#1F2937" />
          </g>
          {/* Mulut ramah */}
          {sedangBicara || ekspresi === "senang" ? (
            <path d="M54 60C54 65 66 65 66 60Z" fill="#EA2B2B" className="mulut-bicara" />
          ) : (
            <path d="M55 60Q60 64 65 60" stroke="#B91C1C" strokeWidth="2.8" strokeLinecap="round" />
          )}
        </g>
      </svg>
    );
  }

  if (karakter === "mahasiswa") {
    return (
      <svg
        width={ukuran}
        height={ukuran}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`karakter-2d karakter-mahasiswa ${kelasBicara} ${className}`.trim()}
        role="img"
        aria-label="Raka"
      >
        <g transform={balik} style={{ transformOrigin: "60px 60px" }}>
          {/* Jaket kampus biru */}
          <path d="M26 114C28 88 42 78 60 78C78 78 92 88 94 114H26Z" fill="#1CB0F6" />
          <path d="M48 78L60 94L72 78" fill="#FFFFFF" />
          {/* Leher & Wajah */}
          <rect x="52" y="64" width="16" height="16" rx="6" fill="#E0A378" />
          <rect x="38" y="30" width="44" height="40" rx="19" fill="#E0A378" />
          {/* Rambut mahasiswa */}
          <path d="M36 44C34 26 46 18 60 18C74 18 86 26 84 44C76 34 68 32 60 34C50 32 42 36 36 44Z" fill="#1F2937" />
          {/* Kacamata kotak putih bergaya modern */}
          <g className="mata-kedip">
            <rect x="43" y="43" width="14" height="11" rx="3" fill="#FFFFFF" stroke="#F3F4F6" strokeWidth="2.5" />
            <rect x="63" y="43" width="14" height="11" rx="3" fill="#FFFFFF" stroke="#F3F4F6" strokeWidth="2.5" />
            <line x1="57" y1="48" x2="63" y2="48" stroke="#FFFFFF" strokeWidth="2.5" />
            <circle cx="51" cy="48.5" r="2.8" fill="#111827" />
            <circle cx="71" cy="48.5" r="2.8" fill="#111827" />
          </g>
          {/* Senyum / Mulut */}
          {sedangBicara || ekspresi === "senang" ? (
            <path d="M52 59C52 65 68 65 68 59Z" fill="#FFFFFF" className="mulut-bicara" />
          ) : (
            <path d="M53 60Q60 64 67 60" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
          )}
        </g>
      </svg>
    );
  }

  // Default: Mahasiswi (Nadia)
  return (
    <svg
      width={ukuran}
      height={ukuran}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`karakter-2d karakter-mahasiswi ${kelasBicara} ${className}`.trim()}
      role="img"
      aria-label="Nadia"
    >
      <g transform={balik} style={{ transformOrigin: "60px 60px" }}>
        {/* Blazer hijau zamrud */}
        <path d="M26 114C28 88 42 78 60 78C78 78 92 88 94 114H26Z" fill="#58CC02" />
        {/* Hijab / kerudung ungu pastel rapi */}
        <path d="M34 50C34 26 45 18 60 18C75 18 86 26 86 50C86 72 78 88 60 90C42 88 34 72 34 50Z" fill="#CE82FF" />
        {/* Wajah */}
        <ellipse cx="60" cy="50" rx="18" ry="19" fill="#F6C8A6" />
        {/* Mata */}
        <g className="mata-kedip">
          <ellipse cx="53" cy="48" rx="4.2" ry="5" fill="#FFFFFF" />
          <ellipse cx="67" cy="48" rx="4.2" ry="5" fill="#FFFFFF" />
          <circle cx="53.8" cy="48" r="2.5" fill="#1F2937" />
          <circle cx="67.8" cy="48" r="2.5" fill="#1F2937" />
        </g>
        {/* Pipi merona */}
        <circle cx="47" cy="54" r="3" fill="#FF9600" opacity="0.35" />
        <circle cx="73" cy="54" r="3" fill="#FF9600" opacity="0.35" />
        {/* Mulut */}
        {sedangBicara || ekspresi === "senang" ? (
          <path d="M54 57C54 62 66 62 66 57Z" fill="#EA2B2B" className="mulut-bicara" />
        ) : (
          <path d="M55 58Q60 62 65 58" stroke="#991B1B" strokeWidth="2.5" strokeLinecap="round" />
        )}
      </g>
    </svg>
  );
}

interface IlustrasiKosakataProps {
  kata: string;
  ukuran?: number;
}

/**
 * Ilustrasi vektor SVG untuk kartu kosakata bergambar seperti di Duolingo Web.
 */
export function IlustrasiKosakata({ kata, ukuran = 92 }: IlustrasiKosakataProps) {
  const kunci = kata.toLowerCase().trim();

  if (kunci.includes("coffee") || kunci.includes("kopi")) {
    return (
      <svg width={ukuran} height={ukuran} viewBox="0 0 100 100" fill="none">
        {/* Teko kopi kaca Duolingo */}
        <path d="M35 24H63L67 32H31L35 24Z" fill="#4B5563" />
        <path d="M62 28H76C80 28 83 31 83 36V56C83 60 79 62 76 62H72" stroke="#4B5563" strokeWidth="6" strokeLinecap="round" />
        <ellipse cx="49" cy="56" rx="26" ry="22" fill="#BAE6FD" />
        <path d="M26 54C26 67 36 75 49 75C62 75 72 67 72 54H26Z" fill="#78350F" />
        <line x1="42" y1="50" x2="48" y2="50" stroke="#451A03" strokeWidth="3" strokeLinecap="round" />
        <line x1="42" y1="58" x2="50" y2="58" stroke="#451A03" strokeWidth="3" strokeLinecap="round" />
        <line x1="42" y1="66" x2="48" y2="66" stroke="#451A03" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (kunci.includes("tea") || kunci.includes("teh")) {
    return (
      <svg width={ukuran} height={ukuran} viewBox="0 0 100 100" fill="none">
        {/* Cangkir teh dengan kantong teh */}
        <path d="M68 42H77C81 42 84 45 84 49C84 53 81 56 77 56H68" stroke="#FFC800" strokeWidth="5" strokeLinecap="round" />
        <path d="M26 38H72L66 64C64 70 58 72 50 72C42 72 34 70 32 64L26 38Z" fill="#E5E7EB" />
        <line x1="24" y1="38" x2="74" y2="38" stroke="#FFC800" strokeWidth="5" strokeLinecap="round" />
        <line x1="54" y1="38" x2="54" y2="48" stroke="#9CA3AF" strokeWidth="2" />
        <rect x="49" y="46" width="10" height="12" rx="2" fill="#FFFFFF" />
        <rect x="20" y="70" width="60" height="6" rx="3" fill="#FFC800" />
        <rect x="26" y="76" width="48" height="4" rx="2" fill="#E5E7EB" />
      </svg>
    );
  }

  if (kunci.includes("milk") || kunci.includes("susu")) {
    return (
      <svg width={ukuran} height={ukuran} viewBox="0 0 100 100" fill="none">
        {/* Kotak susu & gelas susu */}
        <path d="M24 34L32 22H56L64 34V78H24V34Z" fill="#E0F2FE" />
        <path d="M32 22H56L64 34H24L32 22Z" fill="#38BDF8" />
        <rect x="24" y="64" width="40" height="14" fill="#0284C7" />
        <circle cx="44" cy="48" r="8" fill="#0369A1" />
        <circle cx="41" cy="47" r="1.5" fill="#FFFFFF" />
        <circle cx="47" cy="47" r="1.5" fill="#FFFFFF" />
        <rect x="58" y="44" width="20" height="34" rx="3" fill="#BAE6FD" />
        <rect x="60" y="50" width="16" height="26" rx="2" fill="#FFFFFF" />
      </svg>
    );
  }

  if (kunci.includes("water") || kunci.includes("air")) {
    return (
      <svg width={ukuran} height={ukuran} viewBox="0 0 100 100" fill="none">
        <path d="M32 24H68L64 78C63 82 59 84 50 84C41 84 37 82 36 78L32 24Z" fill="#BAE6FD" />
        <path d="M34 42H66L63 76C62 79 58 81 50 81C42 81 38 79 37 76L34 42Z" fill="#38BDF8" />
        <path d="M40 34Q50 38 60 34" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (kunci.includes("breakfast") || kunci.includes("food") || kunci.includes("makan") || kunci.includes("menu")) {
    return (
      <svg width={ukuran} height={ukuran} viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="54" r="28" fill="#E5E7EB" />
        <circle cx="50" cy="54" r="21" fill="#FFFFFF" />
        <circle cx="46" cy="52" r="9" fill="#FFC800" />
        <path d="M56 42C62 44 65 50 62 58" stroke="#EA2B2B" strokeWidth="5" strokeLinecap="round" />
      </svg>
    );
  }

  if (kunci.includes("book") || kunci.includes("study") || kunci.includes("belajar") || kunci.includes("buku")) {
    return (
      <svg width={ukuran} height={ukuran} viewBox="0 0 100 100" fill="none">
        <rect x="26" y="22" width="48" height="58" rx="6" fill="#58CC02" />
        <rect x="32" y="22" width="42" height="54" rx="4" fill="#89E219" />
        <rect x="38" y="34" width="28" height="8" rx="3" fill="#FFFFFF" />
        <rect x="38" y="48" width="20" height="5" rx="2.5" fill="#FFFFFF" opacity="0.8" />
      </svg>
    );
  }

  if (kunci.includes("work") || kunci.includes("office") || kunci.includes("job") || kunci.includes("kerja") || kunci.includes("project")) {
    return (
      <svg width={ukuran} height={ukuran} viewBox="0 0 100 100" fill="none">
        <rect x="22" y="36" width="56" height="42" rx="8" fill="#D97706" />
        <path d="M40 36V28C40 25 42 23 45 23H55C58 23 60 25 60 28V36" stroke="#92400E" strokeWidth="5" />
        <rect x="22" y="52" width="56" height="6" fill="#B45309" />
        <rect x="45" y="49" width="10" height="12" rx="3" fill="#FFC800" />
      </svg>
    );
  }

  if (kunci.includes("hello") || kunci.includes("welcome") || kunci.includes("morning") || kunci.includes("friend")) {
    return (
      <svg width={ukuran} height={ukuran} viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="28" fill="#FFC800" />
        <circle cx="41" cy="44" r="4" fill="#1F2937" />
        <circle cx="59" cy="44" r="4" fill="#1F2937" />
        <path d="M39 56Q50 66 61 56" stroke="#1F2937" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }

  // Ilustrasi default bintang kosakata
  return (
    <svg width={ukuran} height={ukuran} viewBox="0 0 100 100" fill="none">
      <rect x="22" y="22" width="56" height="56" rx="16" fill="#CE82FF" />
      <path
        d="M50 32L55 43L67 45L58 53L60 65L50 59L40 65L42 53L33 45L45 43L50 32Z"
        fill="#FFC800"
      />
    </svg>
  );
}

