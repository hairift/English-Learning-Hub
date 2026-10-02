/**
 * BrandGuidelines.tsx — elemen identitas visual "Sela Tutor English".
 *
 * Berisi bilah merek (BrandTopBar) yang tampil di seluruh halaman, serta
 * komponen panduan merek (GuideCardGrid, BrandGuideSections) yang memakai
 * palet biru penuh sebagai warna utama.
 */

import { Check, Clipboard, PackageOpen, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

/** Logo merek yang dipakai di bilah atas dan sebagai favicon. */
const LOGO_SELA = "/brand/sela-ai.png";

type GuideCardConfig = {
  id: string;
  title: string;
  description: string;
  cta: string;
  color: string;
  variant: "practice" | "speech" | "coach" | "streak" | "report";
  onClick?: () => void;
};

type ColorToken = {
  name: string;
  hex: string;
  rgb: string;
  cmyk: string;
  pms: string;
};

/** Palet warna merek Sela Tutor English (tema biru penuh). */
const colorTokens: ColorToken[] = [
  { name: "Biru Utama", hex: "#1F7AE0", rgb: "31 122 224", cmyk: "86 46 0 12", pms: "2728 C / 2728 U" },
  { name: "Biru Terang", hex: "#7CB8FF", rgb: "124 184 255", cmyk: "51 28 0 0", pms: "284 C / 284 U" },
  { name: "Biru Gelap", hex: "#145CB0", rgb: "20 92 176", cmyk: "89 48 0 31", pms: "2935 C / 2935 U" },
  { name: "Biru Langit", hex: "#1CB0F6", rgb: "28 176 246", cmyk: "81 2 6 0", pms: "306 C / 306 U" },
  { name: "Merah Peringatan", hex: "#FF4B4B", rgb: "255 75 75", cmyk: "0 83 61 0", pms: "1787 C / Red 032 U" },
  { name: "Kuning Sorot", hex: "#FFC800", rgb: "255 200 0", cmyk: "0 21 93 0", pms: "123 C / 109 U" },
  { name: "Oranye Aksen", hex: "#FF9600", rgb: "255 150 0", cmyk: "0 47 90 0", pms: "1375 C / 123 U" },
  { name: "Tinta Utama", hex: "#4B4B4B", rgb: "75 75 75", cmyk: "3 0 21 88", pms: "418 C / Black 6 U" },
  { name: "Abu Teks", hex: "#777777", rgb: "119 119 119", cmyk: "5 1 1 68", pms: "Cool Gray 9 C / 418 U" },
  { name: "Garis Tepi", hex: "#AFAFAF", rgb: "175 175 175", cmyk: "0 0 3 88", pms: "Cool Gray 5 C / U" },
  { name: "Batas Lembut", hex: "#E5E5E5", rgb: "229 229 229", cmyk: "1 1 2 13", pms: "Cool Gray 1 C / U" },
  { name: "Putih Bersih", hex: "#FFFFFF", rgb: "255 255 255", cmyk: "0 0 0 0", pms: "-" }
];

/** Bilah merek yang tampil di bagian paling atas aplikasi. */
export function BrandTopBar() {
  return (
    <div className="brand-top-bar">
      <div className="brand-top-bar-inner">
        <span className="brand-identity">
          <img className="brand-logo" src={LOGO_SELA} alt="Logo Sela Tutor English" />
          <span className="brand-mark">Sela Tutor English</span>
        </span>
        <span className="brand-top-note">
          <Sparkles size={14} aria-hidden="true" />
          AI English Speaking Tutor
        </span>
      </div>
    </div>
  );
}

export function GuideCardGrid() {
  const cards: GuideCardConfig[] = [
    {
      id: "identity",
      title: "identitas",
      description: "Terapkan elemen visual inti merek beserta aturan penggunaannya secara konsisten.",
      cta: "LIHAT PANDUAN",
      color: "var(--biru-utama)",
      variant: "practice"
    },
    {
      id: "writing",
      title: "tulisan",
      description: "Susun konten sesuai karakter merek dan jaga konsistensinya di semua media.",
      cta: "LIHAT PANDUAN",
      color: "var(--macaw)",
      variant: "speech"
    },
    {
      id: "illustration",
      title: "ilustrasi",
      description: "Buat karya visual yang terasa selaras dengan dunia belajar bahasa Sela.",
      cta: "LIHAT PANDUAN",
      color: "var(--purple)",
      variant: "coach"
    },
    {
      id: "marketing",
      title: "pemasaran",
      description: "Gunakan seluruh elemen penting identitas visual pada materi promosi.",
      cta: "LIHAT PANDUAN",
      color: "var(--bee)",
      variant: "streak"
    },
    {
      id: "resources",
      title: "aset",
      description: "Logo, lembar fakta, gambar, dan semua berkas unduhan yang Anda butuhkan.",
      cta: "LIHAT ASET",
      color: "var(--coral)",
      variant: "report"
    }
  ];

  return (
    <section className="guide-card-grid" aria-label="Bagian panduan merek">
      {cards.map((card) => (
        <GuideCard key={card.id} card={card} />
      ))}
      <div className="guide-card-empty" aria-hidden="true" />
    </section>
  );
}

function GuideCard({ card }: { card: GuideCardConfig }) {
  return (
    <button
      className="guide-card"
      style={{ backgroundColor: card.color }}
      onClick={card.onClick}
      type="button"
      aria-label={`${card.title}: ${card.cta}`}
    >
      <span className="guide-card-title">{card.title}</span>
      <span className="guide-card-description">{card.description}</span>
      <span className="guide-card-cta">{card.cta}</span>
      <GuideIllustration variant={card.variant} />
    </button>
  );
}

function GuideIllustration({ variant }: { variant: GuideCardConfig["variant"] }) {
  if (variant === "practice") {
    return (
      <svg className="guide-illustration practice-sketch" viewBox="0 0 220 170" aria-hidden="true">
        <path d="M36 124c20-54 54-84 102-92 29-5 50 2 63 20" />
        <path d="M60 102c20-28 45-44 76-48 19-2 34 1 45 10" />
        <circle cx="65" cy="70" r="18" />
        <circle cx="138" cy="48" r="13" />
        <path d="M37 126c36 12 79 7 128-16" />
      </svg>
    );
  }

  if (variant === "speech") {
    return (
      <svg className="guide-illustration book-stack" viewBox="0 0 230 170" aria-hidden="true">
        <rect x="72" y="92" width="116" height="26" rx="8" fill="#FFC800" />
        <rect x="56" y="66" width="122" height="26" rx="8" fill="#CE82FF" />
        <rect x="88" y="40" width="104" height="26" rx="8" fill="#FF9600" />
        <rect x="112" y="16" width="70" height="28" rx="9" fill="#1F7AE0" />
        <path d="M92 105h74M76 78h72M112 52h56" />
      </svg>
    );
  }

  if (variant === "coach") {
    return (
      <svg className="guide-illustration people-row" viewBox="0 0 230 170" aria-hidden="true">
        <circle cx="70" cy="66" r="26" fill="#F6B48C" />
        <circle cx="126" cy="50" r="30" fill="#8D5A42" />
        <circle cx="174" cy="74" r="24" fill="#FFD4B8" />
        <path d="M39 142c8-28 27-42 57-42s49 14 57 42" fill="#1F7AE0" />
        <path d="M91 143c6-36 29-55 68-55 33 0 55 18 66 55" fill="#1CB0F6" />
        <path d="M139 144c7-24 24-36 50-36 24 0 40 12 48 36" fill="#FFC800" />
      </svg>
    );
  }

  if (variant === "streak") {
    return (
      <svg className="guide-illustration city-board" viewBox="0 0 230 170" aria-hidden="true">
        <rect x="55" y="48" width="118" height="78" rx="18" fill="#FFFFFF" />
        <rect x="72" y="66" width="82" height="12" rx="6" fill="#1F7AE0" />
        <rect x="72" y="88" width="62" height="12" rx="6" fill="#1CB0F6" />
        <path d="M76 126v28M154 126v28M34 154h166" />
        <path d="M189 78h20v76h-20zM22 98h24v56H22z" fill="#FF9600" />
      </svg>
    );
  }

  return (
    <svg className="guide-illustration resource-box" viewBox="0 0 230 170" aria-hidden="true">
      <path d="M53 76h124l-16 78H69z" fill="#FFC800" />
      <path d="M53 76l33-34h124l-33 34z" fill="#FF9600" />
      <path d="M177 76l33-34-16 78-33 34z" fill="#CE82FF" />
      <rect x="86" y="22" width="58" height="44" rx="10" fill="#FFFFFF" />
      <path d="M98 42h34M98 54h24" />
    </svg>
  );
}

export function BrandGuideSections() {
  return (
    <div className="brand-guide-stack">
      <IllustrationShowcase />
      <LogoGuidelines />
      <TypographyGuidelines />
      <ColorPalette />
      <Footer />
    </div>
  );
}

function SectionHeader({
  label,
  title,
  description
}: {
  label: string;
  title: string;
  description: string;
}) {
  return (
    <div className="section-header">
      <p className="section-label">{label}</p>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function IllustrationShowcase() {
  return (
    <section className="brand-section illustration-showcase" aria-labelledby="illustration-title">
      <SectionHeader
        label="Ilustrasi"
        title="Karakter ramah untuk dunia belajar bahasa"
        description="Gunakan bentuk sederhana, warna tegas, dan pose ekspresif agar setiap sentuhan produk terasa akrab dan mudah didekati."
      />
      <div className="people-stage" aria-hidden="true">
        <FlatPerson skin="#F0B88D" shirt="#1F7AE0" pants="#1CB0F6" hair="#2E2E2E" height={150} />
        <FlatPerson skin="#8D5A42" shirt="#CE82FF" pants="#4B4B4B" hair="#1F1F1F" height={176} />
        <FlatPerson skin="#FFD4B8" shirt="#FFC800" pants="#1F7AE0" hair="#D46B2D" height={138} />
        <FlatPerson skin="#B97753" shirt="#1CB0F6" pants="#FF9600" hair="#111111" height={164} />
        <FlatPerson skin="#F6C7A8" shirt="#FF7A7A" pants="#CE82FF" hair="#5A321F" height={154} />
        <FlatPerson skin="#C88A65" shirt="#7CB8FF" pants="#4B4B4B" hair="#262626" height={168} />
        <FlatPerson skin="#E8A982" shirt="#FF9600" pants="#1CB0F6" hair="#6B3A20" height={145} />
      </div>
    </section>
  );
}

function FlatPerson({
  skin,
  shirt,
  pants,
  hair,
  height
}: {
  skin: string;
  shirt: string;
  pants: string;
  hair: string;
  height: number;
}) {
  return (
    <svg className="flat-person" width="92" height={height} viewBox={`0 0 92 ${height}`} aria-hidden="true">
      <circle cx="46" cy="30" r="22" fill={skin} />
      <path d="M25 30c3-19 17-28 36-23 10 3 17 11 19 23-14-8-34-8-55 0z" fill={hair} />
      <path d="M22 84c4-23 17-35 39-35 17 0 27 12 31 35H22z" fill={shirt} />
      <path d="M31 83h17v56H31zM55 83h17v56H55z" fill={pants} />
      <circle cx="38" cy="31" r="3" fill="#2C2C2C" />
      <circle cx="55" cy="31" r="3" fill="#2C2C2C" />
      <path d="M38 42c6 5 13 5 19 0" fill="none" stroke="#2C2C2C" strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
}

function LogoGuidelines() {
  return (
    <section className="brand-section logo-guidelines">
      <div>
        <p className="section-label">Penggunaan Logo</p>
        <h2>Jaga ketegasan logotype</h2>
        <p>
          Ruang kosong menjaga logotype tetap tegas. Gunakan jarak, perataan, dan skala yang konsisten agar merek mudah
          dikenali di setiap permukaan.
        </p>
      </div>
      <div className="logo-board" aria-label="Panduan ruang kosong logo Sela Tutor English">
        <span className="wordmark">Sela Tutor English</span>
        <span className="guide-line guide-cap" />
        <span className="guide-line guide-x" />
        <span className="guide-line guide-base" />
        <span className="guide-line guide-left" />
        <span className="guide-line guide-right" />
        <span className="guide-label label-x">X</span>
        <span className="guide-label label-y">Y</span>
        <span className="guide-label label-half">1/2Y</span>
      </div>
    </section>
  );
}

function TypographyGuidelines() {
  return (
    <section className="brand-section typography-guidelines">
      <TypographyRow label="Judul panjang">
        <p className="type-long">Ketika bahasa menjadi jembatan, kepercayaan diri tumbuh dari setiap percakapan.</p>
      </TypographyRow>
      <TypographyRow label="Teks pendukung">
        <p className="type-word">berani</p>
        <p className="type-support">
          Pembuka peluang. Pendobrak batas. Penggerak perubahan.
          <br />
          Penyambung dunia. Pembebas bahasa.
        </p>
      </TypographyRow>
      <TypographyRow label="Sub-judul dan isi">
        <p className="type-subhead">MAU BERBICARA BAHASA INGGRIS LEBIH PERCAYA DIRI?</p>
        <p className="type-body">
          Dari mahasiswa yang belajar untuk presentasi, hingga profesional yang menyiapkan wawancara kerja, Sela Tutor
          English membuat latihan berbicara terasa cepat, menyenangkan, dan efektif — sesuatu untuk dinikmati, bukan
          ditakuti.
        </p>
      </TypographyRow>
    </section>
  );
}

function TypographyRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="type-row">
      <div className="type-label">{label}</div>
      <div className="type-content">{children}</div>
    </div>
  );
}

function ColorPalette() {
  return (
    <section className="color-palette">
      <SectionHeader
        label="Palet Warna"
        title="Warna biru yang cerah dan fungsional untuk pengalaman belajar."
        description="Gunakan biru sebagai warna utama merek, didukung warna aksen ekspresif dan abu-abu netral."
      />
      <div className="color-grid">
        {colorTokens.map((token) => (
          <ColorCard key={token.hex} token={token} />
        ))}
      </div>
    </section>
  );
}

function ColorCard({ token }: { token: ColorToken }) {
  const [copied, setCopied] = useState(false);

  async function copyHex() {
    await navigator.clipboard?.writeText(token.hex);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <article className="color-card">
      <div className="color-swatch" style={{ backgroundColor: token.hex }} />
      <div className="color-card-header">
        <div>
          <h3>{token.name}</h3>
          <p>{token.hex}</p>
        </div>
        <button type="button" className="copy-button" onClick={copyHex} aria-label={`Salin ${token.name} Hex`}>
          {copied ? <Check size={16} /> : <Clipboard size={16} />}
          {copied ? "Tersalin" : "Salin"}
        </button>
      </div>
      <dl className="color-meta">
        <div>
          <dt>Hex</dt>
          <dd>{token.hex}</dd>
        </div>
        <div>
          <dt>RGB</dt>
          <dd>{token.rgb}</dd>
        </div>
        <div>
          <dt>CMYK</dt>
          <dd>{token.cmyk}</dd>
        </div>
        <div>
          <dt>PMS</dt>
          <dd>{token.pms}</dd>
        </div>
      </dl>
    </article>
  );
}

function Footer() {
  return (
    <footer className="brand-footer">
      <PackageOpen size={22} />
      <span>Aset merek Sela Tutor English untuk aplikasi latihan berbicara bahasa Inggris.</span>
    </footer>
  );
}
