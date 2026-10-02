import { ArrowRight, BarChart3, BookOpenCheck, MessageSquareText, Mic2, RotateCcw, Target, X } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import type { ConversationTurn, ReportResult, SentenceAnalysis } from "../../shared/schemas";
import type { Scenario } from "../../server/data";
import { createReportDiagnostics } from "../reportDiagnostics";

type ReportDashboardProps = {
  report: ReportResult;
  conversationTurns: ConversationTurn[];
  scenario: Scenario;
  targetGoal: string;
  onChangeTask: () => void;
  onPracticeAgain: () => void;
};

type ReportModal = "none" | "dialogue" | "expression" | "pronunciation" | "drill";

export function ReportDashboard({
  report,
  conversationTurns,
  scenario,
  targetGoal,
  onChangeTask,
  onPracticeAgain
}: ReportDashboardProps) {
  const [modal, setModal] = useState<ReportModal>("none");
  const diagnostics = useMemo(
    () => createReportDiagnostics(report, conversationTurns, targetGoal),
    [conversationTurns, report, targetGoal]
  );
  const primaryAnalysis = diagnostics.primaryAnalysis;
  const weakest = diagnostics.weakestDimension;
  const strongest = diagnostics.strongestDimension;
  const userTurnCount = conversationTurns.filter((turn) => turn.speaker === "user" && turn.text.trim()).length;
  const sourceLabel = report.fallback ? `${report.provider} fallback` : `${report.provider} live`;

  return (
    <section className="one-report" aria-label="Laporan Evaluasi / Practice Report">
      <div className="one-report-hero">
        <div className="one-score-block">
          <span className="one-score-num">{report.totalScore}</span>
          <span className="one-score-denom">/ 100</span>
        </div>
        <div className="one-report-diagnosis">
          <span className="eyebrow">Sesi Latihan · {scenario.nameZh} ({scenario.nameEn})</span>
          <h2>{report.coachCommentZh}</h2>
          <div className="one-report-meta">
            <span>Target: {targetGoal}</span>
            <span>Prioritas Ditingkatkan: {weakest?.labelZh ?? "Detail Ekspresi"}</span>
            <span>Kekuatan Utama: {strongest?.labelZh ?? "Penyelesaian Tugas"}</span>
            <span className={`report-source-chip ${report.fallback ? "fallback" : "live"}`}>
              Sumber Analisis: {sourceLabel} · {userTurnCount} Percakapan Pengguna
            </span>
          </div>
        </div>
        <div className="one-report-actions" aria-label="Aksi Laporan">
          <button className="secondary" onClick={onChangeTask}>
            Ganti Tugas / Change Task
          </button>
          <button className="primary" onClick={onPracticeAgain}>
            <RotateCcw size={17} />
            Latihan Lagi / Practice Again
          </button>
        </div>
      </div>

      <div className="one-report-body">
        <aside className="report-ability-panel">
          <div className="report-panel-head">
            <BarChart3 size={18} />
            <div>
              <span className="eyebrow">Diagnostik Kemampuan / Ability Diagnosis</span>
              <h3>7 Dimensi Kemampuan / 7 Dimensions</h3>
            </div>
          </div>

          <div className="ability-compact-list">
            {report.dimensions.map((dimension) => (
              <div className="ability-compact-row" key={dimension.id}>
                <div>
                  <span>{dimension.labelZh}</span>
                  <strong>{dimension.score}</strong>
                </div>
                <div className="dim-bar">
                  <i style={{ width: `${dimension.score}%` }} />
                </div>
              </div>
            ))}
          </div>

          <AbilityRadar dimensions={report.dimensions} />

          <div className="ability-summary">
            <p>
              <strong>Kekuatan: </strong>
              {strongest?.labelZh ?? "Penyelesaian Tugas"} sudah sangat baik!
            </p>
            <p>
              <strong>Fokus Peningkatan: </strong>
              {weakest?.labelZh ?? "Detail Ekspresi"} dapat diasah pada sesi berikutnya.
            </p>
          </div>
        </aside>

        <section className="report-correction-panel">
          <div className="report-panel-head">
            <MessageSquareText size={18} />
            <div>
              <span className="eyebrow">Koreksi Dialog / Dialogue Feedback</span>
              <h3>Rekomendasi Perbaikan Kalimat / Sentence Fixes</h3>
            </div>
          </div>

          <div className="evidence-stack">
            {diagnostics.evidenceTurns.slice(0, 3).map((turn) => (
              <article className="evidence-card" key={`${turn.text}-${turn.reasonZh}`}>
                <span>Ucapan Anda / Your Speech</span>
                <p>{turn.text}</p>
                <small>{turn.reasonZh}</small>
              </article>
            ))}
          </div>

          {primaryAnalysis ? (
            <CorrectionAnalysis analysis={primaryAnalysis} />
          ) : (
            <p className="muted">Belum ada koreksi spesifik untuk sesi ini.</p>
          )}

          {diagnostics.sentenceAnalyses.length > 1 && (
            <div className="secondary-corrections">
              {diagnostics.sentenceAnalyses.slice(1, 3).map((analysis) => (
                <article className="mini-fix" key={analysis.original}>
                  <span>{analysis.issueType}</span>
                  <p>{analysis.original}</p>
                  <strong>{analysis.improved}</strong>
                </article>
              ))}
            </div>
          )}

          <button className="text-button" onClick={() => setModal("dialogue")}>
            Lihat Dialog Lengkap / View Full Dialogue
          </button>
        </section>

        <aside className="report-guidance-panel">
          <div className="report-panel-head">
            <Target size={18} />
            <div>
              <span className="eyebrow">Panduan Belajar / Action Plan</span>
              <h3>Langkah Selanjutnya / Next Steps</h3>
            </div>
          </div>

          <GuidanceButton
            icon={<BookOpenCheck size={18} />}
            title="Optimasi Ekspresi / Expression Polish"
            summary="Sampaikan hasil terukur & kurangi kata ragu"
            action="Buka / View"
            onClick={() => setModal("expression")}
          />
          <GuidanceButton
            icon={<Mic2 size={18} />}
            title="Tips Pengucapan / Pronunciation"
            summary="Penekanan kata, intonasi menurun di akhir"
            action="Buka / View"
            onClick={() => setModal("pronunciation")}
          />
          <GuidanceButton
            icon={<RotateCcw size={18} />}
            title="Kalimat Latihan Ulang / Drill Sentence"
            summary={diagnostics.nextPractice.targetSentence}
            action="Mulai / Start"
            onClick={() => setModal("drill")}
          />

          <div className="report-summary-note">
            <span className="eyebrow">Catatan Keseluruhan / Overall Summary</span>
            <p>{report.summaryZh}</p>
          </div>
        </aside>
      </div>

      <ReportModalView
        modal={modal}
        report={report}
        turns={conversationTurns}
        diagnostics={diagnostics}
        onClose={() => setModal("none")}
        onPracticeAgain={onPracticeAgain}
      />
    </section>
  );
}

function CorrectionAnalysis({ analysis }: { analysis: SentenceAnalysis }) {
  return (
    <article className="primary-fix">
      <div className="fix-label-row">
        <span>{analysis.issueType}</span>
        <strong>{analysis.explanationZh}</strong>
      </div>
      <div className="fix-compare">
        <div>
          <span>Original (Asli)</span>
          <p>{renderHighlightedText(analysis.original, analysis.highlights.map((item) => item.originalText), "report-diff-bad")}</p>
        </div>
        <div>
          <span>Better (Lebih Alami)</span>
          <p>{renderHighlightedText(analysis.improved, analysis.highlights.map((item) => item.improvedText), "report-diff-good")}</p>
        </div>
      </div>
      <div className="phrase-diff-list">
        {analysis.highlights.map((highlight) => (
          <div className="phrase-diff" key={`${highlight.originalText}-${highlight.improvedText}`}>
            <div>
              <span className="report-diff-bad">{highlight.originalText}</span>
              <span className="diff-arrow">
                <ArrowRight size={16} aria-hidden="true" />
              </span>
              <span className="report-diff-good">{highlight.improvedText}</span>
            </div>
            <p>{highlight.reasonZh}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function GuidanceButton({
  icon,
  title,
  summary,
  action,
  onClick
}: {
  icon: ReactNode;
  title: string;
  summary: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <button className="report-guide-button" onClick={onClick}>
      <span className="guide-icon">{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{summary}</small>
      </span>
      <em>{action}</em>
    </button>
  );
}

function ReportModalView({
  modal,
  report,
  turns,
  diagnostics,
  onClose,
  onPracticeAgain
}: {
  modal: ReportModal;
  report: ReportResult;
  turns: ConversationTurn[];
  diagnostics: ReturnType<typeof createReportDiagnostics>;
  onClose: () => void;
  onPracticeAgain: () => void;
}) {
  if (modal === "none") return null;

  const titleMap: Record<Exclude<ReportModal, "none">, string> = {
    dialogue: "Dialog Lengkap / Full Dialogue",
    expression: "Optimasi Ekspresi / Expression Polish",
    pronunciation: "Tips Pengucapan / Pronunciation Tips",
    drill: "Latihan Kalimat Target / Drill Sentence"
  };

  return (
    <div className="report-modal-backdrop" role="presentation">
      <div className="report-modal-card" role="dialog" aria-modal="true" aria-label={titleMap[modal]}>
        <button className="modal-close" onClick={onClose} aria-label="Tutup / Close">
          <X size={18} />
        </button>
        <span className="eyebrow">Diagnostik Sesi / Session Diagnostics</span>
        <h3>{titleMap[modal]}</h3>

        {modal === "dialogue" && <DialogueModal turns={turns} />}
        {modal === "expression" && <ExpressionModal report={report} diagnostics={diagnostics} />}
        {modal === "pronunciation" && <PronunciationModal diagnostics={diagnostics} />}
        {modal === "drill" && <DrillModal diagnostics={diagnostics} onPracticeAgain={onPracticeAgain} />}
      </div>
    </div>
  );
}

function DialogueModal({ turns }: { turns: ConversationTurn[] }) {
  if (!turns.length) return <p className="muted">Belum ada riwayat dialog pada sesi ini.</p>;

  return (
    <div className="modal-dialogue-list">
      {turns.map((turn) => (
        <article className={`conversation-row ${turn.speaker}`} key={turn.id}>
          <span>{turn.speaker === "ai" ? "AI Coach" : turn.speaker === "user" ? "You (Anda)" : "System"}</span>
          <p>{turn.text}</p>
          <small>{new Date(turn.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</small>
        </article>
      ))}
    </div>
  );
}

function ExpressionModal({
  report,
  diagnostics
}: {
  report: ReportResult;
  diagnostics: ReturnType<typeof createReportDiagnostics>;
}) {
  const analysis = diagnostics.primaryAnalysis;
  return (
    <div className="modal-section-stack">
      <section>
        <strong>Fokus Peningkatan Kalimat</strong>
        <p>{analysis?.explanationZh || "Jawaban sudah baik, tingkatkan dengan menyebutkan hasil yang lebih spesifik dan terukur."}</p>
      </section>
      <section>
        <strong>Rekomendasi Struktur Jawaban</strong>
        <p>
          <span className="answer-structure">
            Result
            <ArrowRight size={14} aria-hidden="true" />
            Action
            <ArrowRight size={14} aria-hidden="true" />
            Impact
          </span>
          : Sebutkan hasil utama, jelaskan tindakan Anda, lalu sertakan angka atau manfaat nyata bagi tim/pengguna.
        </p>
      </section>
      <section>
        <strong>Rekomendasi Kalimat Alternatif</strong>
        <ul>
          {report.suggestions.slice(0, 3).map((suggestion) => (
            <li key={suggestion}>{suggestion}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function PronunciationModal({ diagnostics }: { diagnostics: ReturnType<typeof createReportDiagnostics> }) {
  return (
    <div className="modal-section-stack">
      {diagnostics.pronunciationTips.map((tip) => (
        <section key={tip.wordOrPhrase}>
          <strong>{tip.wordOrPhrase}</strong>
          <p>{tip.issueZh}</p>
          <p>{tip.tipZh}</p>
          <small>{tip.example}</small>
        </section>
      ))}
    </div>
  );
}

function DrillModal({
  diagnostics,
  onPracticeAgain
}: {
  diagnostics: ReturnType<typeof createReportDiagnostics>;
  onPracticeAgain: () => void;
}) {
  const nextPractice = diagnostics.nextPractice;
  return (
    <div className="modal-section-stack">
      <section className="target-sentence-box">
        <strong>Target Sentence (Kalimat Target)</strong>
        <p>{nextPractice.targetSentence}</p>
      </section>
      <section>
        <strong>Latihan Potongan Kalimat (Chunk Practice)</strong>
        <div className="chunk-list">
          {nextPractice.chunks.map((chunk, index) => (
            <span key={`${chunk}-${index}`}>{chunk}</span>
          ))}
        </div>
      </section>
      <section>
        <strong>Panduan Langkah Latihan</strong>
        <ul>
          {nextPractice.drills.map((drill) => (
            <li key={drill}>{drill}</li>
          ))}
        </ul>
      </section>
      <button className="primary" onClick={onPracticeAgain}>
        Latihan Lagi dengan Kalimat Ini
      </button>
    </div>
  );
}

function AbilityRadar({ dimensions }: { dimensions: ReportResult["dimensions"] }) {
  const size = 190;
  const center = size / 2;
  const maxRadius = 60;
  const angleStep = (Math.PI * 2) / dimensions.length;
  const points = dimensions.map((dimension, index) => {
    const angle = -Math.PI / 2 + angleStep * index;
    const radius = (dimension.score / 100) * maxRadius;
    return `${center + Math.cos(angle) * radius},${center + Math.sin(angle) * radius}`;
  });
  const grid = [0.34, 0.68, 1].map((scale) =>
    dimensions
      .map((_, index) => {
        const angle = -Math.PI / 2 + angleStep * index;
        return `${center + Math.cos(angle) * maxRadius * scale},${center + Math.sin(angle) * maxRadius * scale}`;
      })
      .join(" ")
  );

  return (
    <div className="radar-wrap compact">
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Grafik Radar 7 Dimensi Kemampuan">
        {grid.map((polygon) => (
          <polygon className="radar-grid" key={polygon} points={polygon} />
        ))}
        {dimensions.map((dimension, index) => {
          const angle = -Math.PI / 2 + angleStep * index;
          const x = center + Math.cos(angle) * (maxRadius + 22);
          const y = center + Math.sin(angle) * (maxRadius + 22);
          return (
            <g key={dimension.id}>
              <line
                className="radar-axis"
                x1={center}
                y1={center}
                x2={center + Math.cos(angle) * maxRadius}
                y2={center + Math.sin(angle) * maxRadius}
              />
              <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: "10px" }}>
                {dimension.labelEn || dimension.labelZh}
              </text>
            </g>
          );
        })}
        <polygon className="radar-score" points={points.join(" ")} />
      </svg>
    </div>
  );
}

function renderHighlightedText(text: string, phrases: string[], className: string) {
  const validPhrases = phrases.filter(Boolean);
  if (!validPhrases.length) return text;

  const nodes: ReactNode[] = [];
  let cursor = 0;
  validPhrases.forEach((phrase, index) => {
    const found = text.indexOf(phrase, cursor);
    if (found === -1) return;
    if (found > cursor) nodes.push(text.slice(cursor, found));
    nodes.push(
      <mark className={className} key={`${phrase}-${index}`}>
        {phrase}
      </mark>
    );
    cursor = found + phrase.length;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));

  return nodes.length ? nodes : text;
}
