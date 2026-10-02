/**
 * CoachAvatar.tsx — pembungkus avatar Sela beserta label statusnya.
 *
 * Sejak versi ini, avatar memakai model 3D (`Sela3DAvatar`) yang punya
 * lip sync. Avatar 2D berbasis SVG sudah dihapus.
 */

import type { CoachState } from "../../shared/schemas";
import { Sela3DAvatar } from "./Sela3DAvatar";

/** Label status pelatih dalam bahasa Indonesia dan Inggris. */
const LABEL_STATUS: Record<CoachState, string> = {
  idle: "Siap mendengarkan / Ready to practice",
  listening: "Mendengarkan ucapanmu / Listening",
  thinking: "Menganalisis jawaban / Thinking",
  asking: "Merespons ucapan / Speaking",
  reviewing: "Menyusun laporan / Reviewing",
  celebrating: "Laporan siap / Completed"
};

export function CoachAvatar({ state, size }: { state: CoachState; size?: number }) {
  return (
    <div className={`coach-stage coach-${state}`} aria-label={`Status AI Coach: ${state}`}>
      <Sela3DAvatar state={state} size={size} />
      <div className="coach-status">{LABEL_STATUS[state]}</div>
    </div>
  );
}
