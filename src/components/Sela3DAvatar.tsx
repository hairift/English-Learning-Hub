/**
 * Sela3DAvatar.tsx — pembungkus ringan untuk avatar 3D Sela.
 *
 * Tugas berkas ini:
 * 1. Memastikan browser mendukung WebGL.
 * 2. Memuat `Sela3DScene` secara lazy (dynamic import) agar Three.js tidak
 *    membebani bundel utama dan tidak dieksekusi saat render di server.
 * 3. Menyediakan cadangan aman (foto statis) bila WebGL tidak ada atau model
 *    gagal dimuat, sehingga UI tidak pernah kosong.
 *
 * Detail lip sync ada di `Sela3DScene.tsx` dan modul `src/lipsync/*`.
 */

import { Component, Suspense, lazy, useState, type ReactNode } from "react";
import type { CoachState } from "../../shared/schemas";

/** Pemandangan 3D dimuat hanya saat dibutuhkan (di browser). */
const Sela3DScene = lazy(() => import("./Sela3DScene"));

/** Foto cadangan bila WebGL tidak tersedia. */
const FOTO_CADANGAN = "/brand/sela-ai.png";

/** Memeriksa dukungan WebGL di browser. */
export function dukungWebgl(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const kanvas = document.createElement("canvas");
    return Boolean(kanvas.getContext("webgl2") || kanvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Kelas pembatas galat: bila model gagal dimuat, tampilkan foto cadangan. */
class BatasGalat extends Component<{ children: ReactNode; cadangan: ReactNode }, { gagal: boolean }> {
  constructor(props: { children: ReactNode; cadangan: ReactNode }) {
    super(props);
    this.state = { gagal: false };
  }

  static getDerivedStateFromError() {
    return { gagal: true };
  }

  render() {
    if (this.state.gagal) return this.props.cadangan;
    return this.props.children;
  }
}

/** Tampilan cadangan berbasis foto statis dengan animasi denyut saat bicara. */
export function AvatarCadangan({ state, size }: { state: CoachState; size: number }) {
  const aktif = state === "asking" || state === "listening";
  return (
    <div className="avatar-cadangan" style={{ width: size, height: size }} data-state={state}>
      <img src={FOTO_CADANGAN} alt="Sela — Tutor Bahasa Inggris" className={aktif ? "aktif" : ""} />
    </div>
  );
}

export type Sela3DAvatarProps = {
  /** Status pelatih untuk memilih animasi. */
  state: CoachState;
  /** Ukuran sisi kotak avatar dalam piksel. */
  size?: number;
  /** Kelas tambahan. */
  className?: string;
};

export function Sela3DAvatar({ state, size = 240, className = "" }: Sela3DAvatarProps) {
  const [webglSiap] = useState(() => dukungWebgl());

  // Tanpa WebGL (atau saat render di server): pakai foto cadangan.
  if (!webglSiap) {
    return (
      <div className={`sela-3d ${className}`} style={{ width: size, height: size }}>
        <AvatarCadangan state={state} size={size} />
      </div>
    );
  }

  return (
    <div className={`sela-3d ${className}`} style={{ width: size, height: size }}>
      <BatasGalat cadangan={<AvatarCadangan state={state} size={size} />}>
        <Suspense fallback={<AvatarCadangan state={state} size={size} />}>
          <Sela3DScene state={state} />
        </Suspense>
      </BatasGalat>
    </div>
  );
}
