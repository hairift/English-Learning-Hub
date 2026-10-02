/**
 * useLipsync.ts — hook React untuk membaca state lip sync.
 *
 * Memakai `useSyncExternalStore` supaya pembaruan viseme dari loop audio
 * (di luar React) tetap terbaca dengan benar dan efisien.
 */

import { useSyncExternalStore } from "react";
import { ambilStateLipsync, langgananLipsync, type StateLipsync } from "./lipsyncStore";

export function useLipsync(): StateLipsync {
  return useSyncExternalStore(langgananLipsync, ambilStateLipsync, ambilStateLipsync);
}
