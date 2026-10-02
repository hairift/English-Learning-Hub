import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Font merek Sela Tutor English (Nunito, bobot variabel 200-1000).
import "@fontsource-variable/nunito";
import App from "./App";
import "./styles.css";

/**
 * three@0.186 menandai `THREE.Clock` sebagai usang dan menyarankan `THREE.Timer`.
 * Namun `@react-three/fiber` 9.x masih membuat `new THREE.Clock()` di dalam
 * `createStore`-nya, dan seluruh paket Three.js (three, fiber, drei) sudah
 * berada di versi terbaru sehingga tidak ada pembaruan yang bisa menutupnya.
 *
 * Karena itu kita menyaring HANYA peringatan spesifik ini agar konsol tetap
 * bersih, tanpa menyembunyikan peringatan lain yang mungkin penting.
 */
const peringatanAsli = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  const pesan = typeof args[0] === "string" ? args[0] : "";
  if (pesan.includes("THREE.Clock") && pesan.includes("deprecated")) return;
  peringatanAsli(...args);
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
