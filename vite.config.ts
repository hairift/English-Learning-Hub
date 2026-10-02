import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // Cache optimasi dependensi ditaruh di akar proyek (bukan node_modules)
  // agar tidak bentrok dengan proteksi tulis pada folder node_modules.
  cacheDir: ".vite-cache",
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // Jangan pantau berkas dependensi Python & cache agar reload tidak berat.
      ignored: [
        "**/pipecat_service/.venv/**",
        "**/tts_service/.venv/**",
        "**/__pycache__/**",
        "**/.sela-settings.json"
      ]
    },
    proxy: {
      "/api": "http://127.0.0.1:5174"
    }
  },
  preview: {
    port: 4173,
    strictPort: true,
    proxy: {
      "/api": "http://127.0.0.1:5174"
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Three.js dipisah supaya bundel utama tetap ringan (avatar 3D dimuat lazy).
          "vendor-three": ["three", "@react-three/fiber", "@react-three/drei"],
          // Pustaka realtime voice dipisah dari bundel utama.
          "vendor-voice": ["@pipecat-ai/client-js", "@pipecat-ai/small-webrtc-transport"]
        }
      }
    },
    chunkSizeWarningLimit: 1200
  }
});
