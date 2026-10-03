/**
 * Sela3DScene.tsx — pemandangan 3D Sela (bagian berat).
 *
 * Berkas ini sengaja dipisahkan dari `Sela3DAvatar.tsx` dan dimuat secara
 * "lazy" (dynamic import) supaya pustaka Three.js tidak ikut masuk ke bundel
 * utama dan tidak ikut dieksekusi saat render di server / pengujian.
 *
 * Isi:
 * - Kanvas React Three Fiber.
 * - Pemuatan model GLB Sela.
 * - Lip sync via morph target viseme (a, i, u, e, o) + kedip mata.
 * - Animasi klip Idle / Talking / Thinking / Greeting.
 */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { CoachState } from "../../shared/schemas";
import { ambilStateLipsync } from "../lipsync/lipsyncStore";

/** Lokasi model 3D Sela. */
export const JALUR_MODEL_SELA = "/models/sela-tutor.glb";

/** Nama morph target viseme pada model. */
const TARGET_VISEME = ["a", "i", "u", "e", "o"] as const;

/** Nama morph target untuk kedip mata. */
const TARGET_KEDIP = ["blink.all", "blink.l", "blink.r"] as const;

/** Klip animasi yang tersedia di model (nama persis dari Blender). */
const KLIP = {
  idle: "Idle",
  bicara: "Talking",
  berpikir: "Thinking",
  sapaan: "Greeting"
} as const;

/** Klip yang sengaja tidak dipakai (animasi morph eksperimental). */
const KLIP_DILEWATI = new Set(["Talking_%temp"]);

/**
 * Kait diagnostik (opt-in).
 *
 * Bila `window.__SELA_DEBUG__ = true` diset SEBELUM aplikasi dimuat, nilai
 * morph target yang benar-benar diterapkan ke mesh wajah dipaparkan lewat
 * `window.__selaMorph()`. Ini memungkinkan pemeriksaan otomatis memastikan
 * mulut avatar benar-benar bergerak, bukan hanya "state-nya berubah".
 */
declare global {
  interface Window {
    __SELA_DEBUG__?: boolean;
    __selaMorph?: () => Record<string, number>;
  }
}

/** Menentukan klip animasi berdasarkan status pelatih. */
function pilihKlip(state: CoachState, bersuara: boolean): string {
  if (state === "celebrating") return KLIP.sapaan;
  if (state === "reviewing" || state === "thinking") return KLIP.berpikir;
  if (state === "asking" || bersuara) return KLIP.bicara;
  return KLIP.idle;
}

/** Kumpulan mesh yang punya morph target (wajah). */
type MeshMorph = {
  kamus: Record<string, number>;
  pengaruh: number[];
};

/** Mengumpulkan seluruh mesh ber-morph target dari model. */
function kumpulkanMeshMorph(akar: THREE.Object3D): MeshMorph[] {
  const hasil: MeshMorph[] = [];
  akar.traverse((anak) => {
    const mesh = anak as THREE.Mesh;
    if (!mesh.isMesh) return;
    const kamus = (mesh as unknown as { morphTargetDictionary?: Record<string, number> }).morphTargetDictionary;
    const pengaruh = (mesh as unknown as { morphTargetInfluences?: number[] }).morphTargetInfluences;
    if (kamus && pengaruh) hasil.push({ kamus, pengaruh });
  });
  return hasil;
}

/** Menerapkan bobot viseme & kedip ke seluruh mesh wajah. */
function terapkanMorph(
  daftar: MeshMorph[],
  viseme: Record<string, number>,
  kebukaan: number,
  berkedip: boolean
) {
  for (const item of daftar) {
    for (const nama of TARGET_VISEME) {
      const indeks = item.kamus[nama];
      if (indeks === undefined) continue;
      item.pengaruh[indeks] = viseme[nama] ?? 0;
    }
    for (const nama of TARGET_KEDIP) {
      const indeks = item.kamus[nama];
      if (indeks === undefined) continue;
      item.pengaruh[indeks] = berkedip ? 1 : 0;
    }
    // Cadangan bila model tidak punya morph jaw terpisah.
    if (kebukaan > 0 && item.kamus.a !== undefined) {
      item.pengaruh[item.kamus.a] = Math.max(item.pengaruh[item.kamus.a], kebukaan * 0.85);
    }
  }
}

/** Komponen isi: memuat model, mengatur kamera, dan menjalankan animasi. */
function ModelSela({ state }: { state: CoachState }) {
  const grup = useRef<THREE.Group>(null);
  const gltf = useGLTF(JALUR_MODEL_SELA) as unknown as {
    scene: THREE.Group;
    animations: THREE.AnimationClip[];
  };
  const { scene, animations } = gltf;
  const kamera = useThree((s) => s.camera);

  // Klip yang layak dipakai (buang animasi morph eksperimental).
  const klipBersih = useMemo(
    () => animations.filter((klip) => !KLIP_DILEWATI.has(klip.name)),
    [animations]
  );
  const { actions } = useAnimations(klipBersih, grup);

  // Daftar mesh wajah ber-morph target.
  const meshMorph = useMemo(() => kumpulkanMeshMorph(scene), [scene]);

  // Bingkai kamera otomatis: fokus pada kepala & bahu (potret tutor).
  useEffect(() => {
    const kotak = new THREE.Box3().setFromObject(scene);
    const ukuran = kotak.getSize(new THREE.Vector3());
    const tengah = kotak.getCenter(new THREE.Vector3());
    const fokus = new THREE.Vector3(tengah.x, kotak.min.y + ukuran.y * 0.865, tengah.z);
    const tinggiTerlihat = ukuran.y * 0.46;
    const fov = 32;
    const jarak = tinggiTerlihat / 2 / Math.tan((fov / 2) * (Math.PI / 180));

    if ((kamera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const kameraPerspektif = kamera as THREE.PerspectiveCamera;
      kameraPerspektif.fov = fov;
      kameraPerspektif.updateProjectionMatrix();
    }
    kamera.position.set(fokus.x, fokus.y + 0.01, fokus.z + jarak);
    kamera.lookAt(fokus);
    kamera.updateMatrixWorld();
  }, [kamera, scene]);

  // Perpindahan klip animasi sesuai status pelatih.
  const klipTerakhir = useRef<string>("");
  useEffect(() => {
    const namaKlip = pilihKlip(state, ambilStateLipsync().bersuara);
    if (klipTerakhir.current === namaKlip) return;

    const berikutnya = actions[namaKlip];
    const sebelumnya = actions[klipTerakhir.current];
    if (!berikutnya) return;

    berikutnya.reset().setEffectiveWeight(1).fadeIn(0.35).play();
    if (sebelumnya && sebelumnya !== berikutnya) sebelumnya.fadeOut(0.35);
    klipTerakhir.current = namaKlip;
  }, [actions, state]);

  // Berkedip otomatis agar avatar terasa hidup.
  const waktuKedipBerikutnya = useRef(2.5);
  const kedipSampai = useRef(0);

  useFrame(() => {
    const waktu = performance.now() / 1000;
    const lipsync = ambilStateLipsync();

    if (waktu > waktuKedipBerikutnya.current) {
      kedipSampai.current = waktu + 0.12;
      waktuKedipBerikutnya.current = waktu + 2.4 + Math.random() * 2.6;
    }
    const sedangKedip = waktu < kedipSampai.current || lipsync.berkedip;

    terapkanMorph(
      meshMorph,
      lipsync.viseme as unknown as Record<string, number>,
      lipsync.kebukaan,
      sedangKedip
    );

    // Kait diagnostik: laporkan nilai morph yang BENAR-BENAR diterapkan.
    if (typeof window !== "undefined" && window.__SELA_DEBUG__) {
      const pertama = meshMorph[0];
      if (pertama) {
        window.__selaMorph = () => ({
          a: Number((pertama.pengaruh[pertama.kamus.a] ?? 0).toFixed(3)),
          i: Number((pertama.pengaruh[pertama.kamus.i] ?? 0).toFixed(3)),
          u: Number((pertama.pengaruh[pertama.kamus.u] ?? 0).toFixed(3)),
          e: Number((pertama.pengaruh[pertama.kamus.e] ?? 0).toFixed(3)),
          o: Number((pertama.pengaruh[pertama.kamus.o] ?? 0).toFixed(3)),
          kebukaan: Number(lipsync.kebukaan.toFixed(3))
        });
      }
    }

    // Gerakan halus kepala & tubuh agar tidak terlihat kaku.
    if (grup.current) {
      const amplitudo = lipsync.bersuara ? 0.028 : 0.014;
      grup.current.rotation.y = Math.sin(waktu * 0.7) * amplitudo;
      grup.current.rotation.x = Math.sin(waktu * 0.9) * amplitudo * 0.4;
      grup.current.position.y = Math.sin(waktu * 1.3) * 0.004;
    }
  });

  return (
    <group ref={grup} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}

/** Pencahayaan studio sederhana (tanpa berkas HDR eksternal). */
function Pencahayaan() {
  return (
    <>
      <ambientLight intensity={0.85} color="#eaf2ff" />
      <hemisphereLight intensity={0.7} color="#dceaff" groundColor="#9fb6d4" />
      <directionalLight position={[1.4, 2.2, 2.4]} intensity={2.1} color="#ffffff" />
      <directionalLight position={[-2, 1.4, 1.2]} intensity={0.8} color="#cfe2ff" />
      <pointLight position={[0, 1.4, 2.2]} intensity={0.6} color="#ffffff" />
    </>
  );
}

/**
 * Komponen default yang dimuat secara lazy.
 * Menerima `state` (status pelatih) dari pembungkus ringan.
 */
export default function Sela3DScene({ state }: { state: CoachState }) {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      camera={{ position: [0, 1.16, 1.05], fov: 32, near: 0.05, far: 50 }}
      style={{ background: "transparent", width: "100%", height: "100%" }}
    >
      <Pencahayaan />
      <ModelSela state={state} />
    </Canvas>
  );
}
