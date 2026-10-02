"""
normalizer.py — lapisan normalisasi teks kedua (defensif) untuk Supertonic TTS.

Kenapa masih ada normalisasi di sisi Python, padahal Node sudah menormalkan?
- Node (`shared/textNormalizer.ts`) adalah sumber utama normalisasi karena dipakai
  juga oleh fallback browser.
- Lapisan ini adalah jaring pengaman: kalau ada klien lain (mis. pemanggilan langsung
  ke service ini) yang mengirim angka mentah, Supertonic tetap membacanya dengan benar.
- Supertonic memang mengklaim bisa menangani angka, tapi normalizer internalnya
  dioptimalkan untuk bahasa Inggris. Untuk `lang="id"` hasilnya sering aneh
  (mis. "15.000" dibaca desimal). Jadi kita bantu dengan `num2words`.

Catatan desain penting:
- Penanda (placeholder) memakai karakter Private Use Area (U+E000..), BUKAN digit,
  supaya regex angka berikutnya tidak merusak penanda itu sendiri.
- Mata uang (Rp, IDR, $, €, £, USD, EUR, GBP) diproses lebih dulu agar angka yang
  menempel pada huruf (mis. "Rp15.000") tetap terbaca benar.
"""

from __future__ import annotations

import re
from typing import Literal

try:  # num2words bersifat opsional; kalau tidak ada, normalizer dilewati dengan aman.
    from num2words import num2words as _num2words
except Exception:  # pragma: no cover - hanya terjadi bila dependensi belum dipasang
    _num2words = None


Bahasa = Literal["id", "en"]

# Karakter penanda (Private Use Area). Sengaja bukan digit agar aman dari regex angka.
_KUNCI_AWAL = "\uE000"
_KUNCI_AKHIR = "\uE001"
_BASIS_INDEKS = 0xE100


# --------------------------------------------------------------------------- #
# Utilitas angka
# --------------------------------------------------------------------------- #
def _angka_ke_kata(nilai: int, lang: Bahasa) -> str:
    """Ubah bilangan bulat menjadi kata memakai num2words."""
    if _num2words is None:
        return str(nilai)
    try:
        return _num2words(nilai, lang="id" if lang == "id" else "en")
    except Exception:
        return str(nilai)


def _bersihkan_ribuan(teks_angka: str, lang: Bahasa) -> str:
    """
    Hapus pemisah ribuan agar tidak dibaca sebagai desimal.

    ID memakai '.' (15.000 -> 15000), EN memakai ',' (1,250 -> 1250).
    """
    pemisah = "." if lang == "id" else ","
    # Catatan: `re.escape(pemisah)` sudah menambahkan backslash, jadi JANGAN ditambah `\` lagi.
    pola = re.compile(rf"(\d){re.escape(pemisah)}(\d{{3}})(?!\d)")
    sebelum = None
    hasil = teks_angka
    while sebelum != hasil:
        sebelum = hasil
        hasil = pola.sub(r"\1\2", hasil)
    return hasil


def _desimal_ke_kata(teks_angka: str, lang: Bahasa) -> str:
    """Ubah angka (termasuk desimal) menjadi kata, mis. "3,5" -> "tiga koma lima"."""
    bersih = _bersihkan_ribuan(teks_angka.strip(), lang)
    bagian = re.split(r"[.,]", bersih)
    if len(bagian) < 2:
        try:
            return _angka_ke_kata(int(float(bersih)), lang)
        except ValueError:
            return bersih

    bulat, desimal = bagian[0], bagian[1]
    try:
        kata_bulat = _angka_ke_kata(int(bulat or "0"), lang)
    except ValueError:
        kata_bulat = bulat
    # Digit desimal dieja satu per satu (3,14 -> tiga koma satu empat).
    kata_desimal = " ".join(_angka_ke_kata(int(d), lang) for d in desimal if d.isdigit())
    kata_pemisah = "koma" if lang == "id" else "point"
    if not kata_desimal:
        return kata_bulat
    return f"{kata_bulat} {kata_pemisah} {kata_desimal}"


def _eja_digit(digit: str, lang: Bahasa) -> str:
    """Eja digit satu per satu untuk nomor telepon, NIK, OTP, dan kode."""
    return " ".join(_angka_ke_kata(int(d), lang) for d in digit if d.isdigit())


# Nama satuan mata uang per bahasa.
_SATUAN_MATA_UANG: dict[str, dict[str, str]] = {
    "id": {"rp": "rupiah", "idr": "rupiah", "usd": "dolar", "eur": "euro", "gbp": "pound",
           "$": "dolar", "€": "euro", "£": "pound"},
    "en": {"rp": "rupiah", "idr": "rupiah", "usd": "dollars", "eur": "euros", "gbp": "pounds",
           "$": "dollars", "€": "euros", "£": "pounds"},
}

# Mata uang berupa simbol (di depan angka).
_POLA_SIMBOL_UANG = re.compile(r"(?P<simbol>[$€£])\s*(?P<angka>\d[\d.,]*)")
# Mata uang berupa kode huruf (di depan angka), mis. "Rp15.000", "IDR 2.500.000".
# Lookbehind mencegah salah cocok di tengah kata (mis. "harpa" tidak dianggap "rp").
_POLA_KODE_UANG = re.compile(
    r"(?<![A-Za-z])(?P<kode>Rp|IDR|USD|EUR|GBP)\.?\s*(?P<angka>\d[\d.,]*)",
    re.IGNORECASE,
)


# --------------------------------------------------------------------------- #
# Normalisasi utama
# --------------------------------------------------------------------------- #
def normalisasi(teks: str, lang: Bahasa = "id") -> str:
    """Normalisasi angka, mata uang, persen, dan waktu sebelum dikirim ke mesin TTS."""
    if not teks:
        return teks

    penampung: list[str] = []

    def simpan(nilai: str) -> str:
        penampung.append(nilai)
        return f"{_KUNCI_AWAL}{chr(_BASIS_INDEKS + len(penampung) - 1)}{_KUNCI_AKHIR}"

    hasil = re.sub(r"\s+", " ", teks)

    # 1. Mata uang (simbol & kode) -> "lima belas ribu rupiah" / "one thousand dollars".
    def _mata_uang(m: re.Match[str]) -> str:
        grup = m.groupdict()
        kunci = (grup.get("simbol") or grup.get("kode") or "").strip().lower()
        satuan = _SATUAN_MATA_UANG[lang].get(kunci, "")
        nilai = _desimal_ke_kata(m.group("angka"), lang)
        return simpan(f"{nilai} {satuan}".strip())

    hasil = _POLA_SIMBOL_UANG.sub(_mata_uang, hasil)
    hasil = _POLA_KODE_UANG.sub(_mata_uang, hasil)

    # 2. Persen.
    hasil = re.sub(
        r"(\d+(?:[.,]\d+)?)\s*%",
        lambda m: simpan(
            f"{_desimal_ke_kata(m.group(1), lang)} {'persen' if lang == 'id' else 'percent'}"
        ),
        hasil,
    )

    # 3. Jam "14:30". Kata "jam"/"pukul" biasanya sudah ada di teks, jadi tidak diulang.
    def _jam(m: re.Match[str]) -> str:
        jam, menit = int(m.group(1)), int(m.group(2))
        if lang == "id":
            return simpan(f"{_angka_ke_kata(jam, lang)} lewat {_angka_ke_kata(menit, lang)}")
        return simpan(f"{_angka_ke_kata(jam, lang)} {_angka_ke_kata(menit, lang)}")

    hasil = re.sub(r"\b(\d{1,2}):(\d{2})\b", _jam, hasil)

    # 4. Nomor telepon / NIK / OTP panjang -> eja per digit.
    hasil = re.sub(r"\b\d{6,}\b", lambda m: simpan(_eja_digit(m.group(0), lang)), hasil)

    # 5. Hapus pemisah ribuan agar tidak dibaca desimal.
    pemisah = "." if lang == "id" else ","
    pola_ribuan = re.compile(rf"(\d){re.escape(pemisah)}(\d{{3}})(?!\d)")
    sebelum = None
    while sebelum != hasil:
        sebelum = hasil
        hasil = pola_ribuan.sub(r"\1\2", hasil)

    # 6. Desimal.
    hasil = re.sub(r"\d+[.,]\d+", lambda m: simpan(_desimal_ke_kata(m.group(0), lang)), hasil)

    # 7. Sisa bilangan bulat.
    hasil = re.sub(r"\d+", lambda m: simpan(_angka_ke_kata(int(m.group(0)), lang)), hasil)

    # 8. Kembalikan isi penanda.
    for indeks, nilai in enumerate(penampung):
        hasil = hasil.replace(f"{_KUNCI_AWAL}{chr(_BASIS_INDEKS + indeks)}{_KUNCI_AKHIR}", nilai)

    # 9. Bersihkan sisa penanda (jaga-jaga) dan rapikan spasi.
    hasil = re.sub(rf"[{_KUNCI_AWAL}{_KUNCI_AKHIR}]", " ", hasil)
    return re.sub(r"\s+", " ", hasil).strip()


# --------------------------------------------------------------------------- #
# Deteksi bahasa
# --------------------------------------------------------------------------- #
# Kata umum untuk deteksi bahasa sederhana.
_KATA_ID = {
    "yang", "dan", "saya", "kamu", "anda", "tidak", "bisa", "dengan", "untuk", "adalah",
    "ini", "itu", "akan", "sudah", "belum", "terima", "kasih", "tolong", "bagaimana",
    "apa", "siapa", "kenapa", "sekarang", "hari", "sangat", "juga", "atau", "karena",
    "kalau", "mau", "ingin", "punya", "dari", "ada", "baik", "bagus", "latihan", "belajar",
}
_KATA_EN = {
    "the", "and", "you", "your", "is", "are", "was", "were", "have", "has", "can", "could",
    "would", "should", "will", "to", "of", "in", "on", "at", "for", "with", "about", "this",
    "that", "hello", "please", "thank", "what", "why", "how", "when", "where", "who",
    "because", "but", "very", "good", "great", "project", "team", "work", "practice",
    "learn", "english",
}


def deteksi_bahasa(teks: str) -> Bahasa:
    """Tebak bahasa dominan teks: 'id' atau 'en'."""
    kata = re.findall(r"[a-zA-Z]+", (teks or "").lower())
    if not kata:
        return "id"
    skor_id = sum(1 for k in kata if k in _KATA_ID)
    skor_en = sum(1 for k in kata if k in _KATA_EN)
    return "en" if skor_en > skor_id else "id"


def siapkan_teks(teks: str, mode: str = "auto") -> tuple[str, Bahasa]:
    """Kembalikan (teks_ternormalisasi, bahasa)."""
    bersih = re.sub(r"\s+", " ", teks or "").strip()
    lang: Bahasa = deteksi_bahasa(bersih) if mode not in ("id", "en") else mode  # type: ignore[assignment]
    return normalisasi(bersih, lang), lang
