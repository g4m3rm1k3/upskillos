/**
 * MicroCycleLesson — single-column "Micro-Cycle" lesson layout.
 *
 * Each knowledge section flows vertically in order:
 *   🧠 Intuition  →  📐 Mathematics  →  ∴ Formal Proof  →  📝 Practice
 *
 * Visualizations are embedded full-width inside their section, not in a sidebar.
 * Mathematics starts open; Formal Proof starts collapsed ("prove it when ready").
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { Volume2, Square } from "lucide-react";
import { useSpeech, cleanForSpeech } from "../../utils/useSpeech.js";
import { Link } from "react-router-dom";
import VizFrame from "../viz/VizFrame.jsx";
import Callout from "../ui/Callout.jsx";
import InlineCheck from "./InlineCheck.jsx";
import StepThrough from "./StepThrough.jsx";
import DynamicProof from "./DynamicProof.jsx";
import ScrubbableExample from "./ScrubbableExample.jsx";
import ChallengeBlock from "./ChallengeBlock.jsx";
import NarrativeStory from "./NarrativeStory.jsx";
import FirstPrinciplesLesson from "./FirstPrinciplesLesson.jsx";
import GuidedWalkthrough from "./GuidedWalkthrough.jsx";
import UnifiedLearningDock from "./UnifiedLearningDock.jsx";
import AssessmentBlock from "./AssessmentBlock.jsx";
import { parseProse } from "../math/parseProse.jsx";
import MarkdownProse from "../math/MarkdownProse.jsx";
import KatexBlock from "../math/KatexBlock.jsx";
import { useProgress } from "../../hooks/useProgress.js";
import SVGImage from "./SVGImage.jsx";

// Re-export parseProse so existing imports from IntegratedLesson still work
export { parseProse } from "../math/parseProse.jsx";

// ─── Shared prose utilities ────────────────────────────────────────────────

const HEADING_PREFIX = /^\*\*([^*\n]+)\*\*\s*/;

function ProseParagraph({ text, isFirst }) {
  const { speak, stop } = useSpeech();
  const [isPlaying, setIsPlaying] = useState(false);
  const playingRef = useRef(false);

  const handleRead = useCallback(async () => {
    if (playingRef.current) {
      stop();
      playingRef.current = false;
      setIsPlaying(false);
      return;
    }
    stop();
    playingRef.current = true;
    setIsPlaying(true);
    await speak(cleanForSpeech(text));
    if (playingRef.current) {
      playingRef.current = false;
      setIsPlaying(false);
    }
  }, [speak, stop, text]);

  const match = text.match(HEADING_PREFIX);
  if (match) {
    const heading = match[1];
    const body = text.slice(match[0].length).trim();
    return (
      <div className={`relative group mt-8 mb-4 ${isFirst ? "" : "pt-8 border-t border-slate-200 dark:border-slate-800"}`}>
        <ReadBtn isPlaying={isPlaying} onClick={handleRead} />
        <h3 className="text-xl font-bold text-slate-900 dark:text-sky-400 mb-4 flex items-center gap-3">
          <span className="w-2 h-6 bg-brand-500 dark:bg-brand-400 rounded-full inline-block"></span>
          {parseProse(heading)}
        </h3>
        {body && <MarkdownProse text={body} />}
      </div>
    );
  }
  return (
    <div className="relative group mb-6 last:mb-0">
      <ReadBtn isPlaying={isPlaying} onClick={handleRead} />
      <MarkdownProse text={text} />
    </div>
  );
}

function ReadBtn({ isPlaying, onClick }) {
  return (
    <button
      onClick={onClick}
      title={isPlaying ? 'Stop reading' : 'Read aloud'}
      className={`absolute top-0 right-0 z-10 flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium rounded border transition-all ${
        isPlaying
          ? 'opacity-100 text-cyan-600 border-cyan-300 bg-cyan-50 dark:text-cyan-300 dark:border-cyan-700/60 dark:bg-cyan-900/20'
          : 'opacity-0 group-hover:opacity-100 text-slate-400 border-slate-200 bg-white/90 dark:bg-slate-800/90 dark:border-slate-700 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
      }`}
    >
      {isPlaying
        ? <><Square className="w-2.5 h-2.5 fill-current" />&nbsp;Stop</>
        : <><Volume2 className="w-2.5 h-2.5" />&nbsp;Read</>
      }
    </button>
  );
}

const BULLET_RE = /^[•\-*]\s+/;
const ORDERED_RE = /^\d+\.\s+/;

function renderMixedProse(prose, checksByIndex) {
  const out = [];
  let i = 0;
  const pushChecksFor = (startIdx, endIdx) => {
    if (!checksByIndex) return;
    for (let idx = startIdx; idx <= endIdx; idx++) {
      for (const check of checksByIndex.get(idx) ?? []) {
        out.push(
          <InlineCheck
            key={`check-${idx}-${out.length}`}
            question={check.question}
            options={check.options}
            answer={check.answer}
            explanation={check.explanation}
          />,
        );
      }
    }
  };
  while (i < prose.length) {
    const p = prose[i];
    if (BULLET_RE.test(p)) {
      const start = i;
      const items = [];
      while (i < prose.length && BULLET_RE.test(prose[i])) {
        items.push(prose[i].replace(BULLET_RE, ""));
        i++;
      }
      out.push(
        <ul
          key={`ul-${i}`}
          className="list-disc pl-5 space-y-1.5 mb-4 text-slate-700 dark:text-slate-300"
        >
          {items.map((item, j) => (
            <li key={j} className="leading-relaxed">
              {parseProse(item)}
            </li>
          ))}
        </ul>,
      );
      pushChecksFor(start, i - 1);
    } else if (ORDERED_RE.test(p)) {
      const start = i;
      const items = [];
      while (i < prose.length && ORDERED_RE.test(prose[i])) {
        items.push(prose[i].replace(ORDERED_RE, ""));
        i++;
      }
      out.push(
        <ol
          key={`ol-${i}`}
          className="list-decimal pl-5 space-y-1.5 mb-4 text-slate-700 dark:text-slate-300"
        >
          {items.map((item, j) => (
            <li key={j} className="leading-relaxed">
              {parseProse(item)}
            </li>
          ))}
        </ol>,
      );
      pushChecksFor(start, i - 1);
    } else {
      out.push(
        <ProseParagraph key={`p-${i}`} text={p} isFirst={out.length === 0} />,
      );
      pushChecksFor(i, i);
      i++;
    }
  }
  return out;
}

function buildChecksByIndex(checks = []) {
  const map = new Map();
  const trailing = [];
  for (const check of checks) {
    if (typeof check.afterParagraph === "number" && check.afterParagraph >= 0) {
      if (!map.has(check.afterParagraph)) map.set(check.afterParagraph, []);
      map.get(check.afterParagraph).push(check);
    } else {
      trailing.push(check);
    }
  }
  return { map, trailing };
}

function normalizeProse(paragraphs = []) {
  const merged = [];
  for (const raw of paragraphs) {
    const current = String(raw ?? "").trim();
    if (!current) continue;
    const isListLike = /^(?:\d+\.|[•*-])\s/.test(current);
    const isHeadingLike = current.startsWith("**");
    const words = current.split(/\s+/).filter(Boolean);
    const isTinyFragment = words.length <= 2 && current.length <= 18;
    if (!isListLike && !isHeadingLike && isTinyFragment && merged.length > 0) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${current}`;
    } else {
      merged.push(current);
    }
  }
  return merged;
}

function SectionContent({ data }) {
  if (!data) return null;

  // Blocks format — render all block types in natural order
  const rawBlocks = data.blocks ?? [];
  const contentBlocks = rawBlocks.filter((b) => b.type !== "callout" || true); // include all types
  if (contentBlocks.length > 0) {
    return (
      <div className="space-y-4">
        {contentBlocks.map((block, i) => {
          if (block.type === "prose") {
            return (
              <div
                key={i}
                className="prose-content text-slate-700 dark:text-slate-300"
              >
                {renderMixedProse(normalizeProse(block.paragraphs ?? []))}
              </div>
            );
          }
          // Block callouts carry their style as callout.type (nested), kind or variant — block.type is always "callout".
          if (block.type === "callout") return <Callout key={i} {...(block.callout ?? { ...block, type: block.kind ?? block.variant })} />;
          if (block.type === "stepthrough")
            return <StepThrough key={i} {...block} />;
          if (block.type === "viz") {
            const norm = normalizeViz(block);
            return norm ? <VizCard key={i} viz={norm} /> : null;
          }
          if (block.type === "math") {
            return (
              <div key={i} className="my-6">
                <KatexBlock expr={block.tex} />
                {block.caption && (
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 italic text-center">{block.caption}</p>
                )}
              </div>
            );
          }
          if (block.type === "image") {
            return (
              <SVGImage
                key={i}
                src={block.src}
                alt={block.alt}
                caption={block.caption}
              />
            );
          }
          if (block.type === "check") {
            return (
              <InlineCheck
                key={i}
                question={block.question}
                options={block.options}
                answer={block.answer}
                explanation={block.explanation}
              />
            );
          }
          return null;
        })}
        {(data.callouts ?? []).map((c, i) => (
          <Callout key={`extra-${i}`} {...c} />
        ))}
        {(data.checks ?? []).map((c, i) => (
          <InlineCheck key={`check-extra-${i}`} question={c.question} options={c.options} answer={c.answer} explanation={c.explanation} />
        ))}
      </div>
    );
  }

  // Legacy format (prose + callouts arrays, no blocks)
  const prose = normalizeProse(data.prose);
  const { map: checksByIndex, trailing: trailingChecks } = buildChecksByIndex(data.checks);
  return (
    <div className="space-y-4">
      {renderMixedProse(prose, checksByIndex)}
      {(data.callouts ?? []).map((c, i) => (
        <Callout key={i} {...c} />
      ))}
      {(data.images ?? []).map((img, i) => (
        <SVGImage key={`img-${i}`} src={img.src} alt={img.alt} caption={img.caption} />
      ))}
      {trailingChecks.map((c, i) => (
        <InlineCheck key={`check-trailing-${i}`} question={c.question} options={c.options} answer={c.answer} explanation={c.explanation} />
      ))}
    </div>
  );
}

// Normalize a visualization entry — supports {id} and legacy {vizId}
function normalizeViz(v) {
  if (!v) return null;
  const id = v.id ?? v.vizId;
  if (!id) return null;
  return {
    id,
    initialProps: v.initialProps,
    props: v.props ?? v.visualizationProps ?? {},
    title: v.title,
    caption: v.caption,
    mathBridge: v.mathBridge,
  };
}

function getSectionVizzes(section) {
  if (!section) return [];
  const vizzes = [];
  if (section.visualizationId) {
    vizzes.push({
      id: section.visualizationId,
      props: section.visualizationProps ?? {},
    });
  }
  for (const v of section.visualizations ?? []) {
    const norm = normalizeViz(v);
    if (norm) vizzes.push(norm);
  }
  // De-duplicate by ID + props (allows multiple VideoEmbed with different URLs)
  const seen = new Set();
  return vizzes.filter((v) => {
    const key = `${v.id}:${JSON.stringify(v.initialProps ?? v.props ?? {})}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Section divider ───────────────────────────────────────────────────────

function SectionDivider({ icon, label, color = "slate", noteId }) {
  const themes = {
    slate:
      "from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300",
    brand:
      "from-brand-50 to-white dark:from-brand-950/40 dark:to-slate-950 border-brand-100 dark:border-brand-900/60 text-brand-700 dark:text-brand-300",
    emerald:
      "from-emerald-50 to-white dark:from-emerald-950/40 dark:to-slate-950 border-emerald-100 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300",
    purple:
      "from-purple-50 to-white dark:from-purple-950/40 dark:to-slate-950 border-purple-100 dark:border-purple-900/60 text-purple-700 dark:text-purple-300",
  };

  return (
    <div
      id={noteId ? noteId.replace(/:/g, "-") : undefined}
      className={`group relative flex items-center gap-4 mb-8 p-1.5 pr-6 rounded-full border shadow-sm bg-gradient-to-r transition-all duration-300 hover:shadow-md ${themes[color]}`}
    >
      <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 border border-inherit flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <span className="font-black text-[11px] uppercase tracking-[0.2em]">
        {label}
      </span>
      <div className="flex-1" />
    </div>
  );
}

// ─── Full-width viz card ───────────────────────────────────────────────────

function VizCard({
  viz,
  noteId,
  borderColor = "border-slate-200 dark:border-slate-700",
}) {
  return (
    <div
      id={noteId ? noteId.replace(/:/g, "-") : undefined}
      className={`rounded-2xl overflow-hidden border ${borderColor} shadow-sm bg-slate-50 dark:bg-slate-900`}
    >
      <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        {viz.title ? (
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {viz.title}
          </p>
        ) : (
          <span />
        )}
      </div>
      {viz.mathBridge && (
        <div className="px-4 py-3 bg-brand-50 dark:bg-brand-950/40 border-b border-brand-100 dark:border-brand-900/50 [&_p]:text-sm [&_p]:text-brand-900 [&_p]:dark:text-brand-200 [&_strong]:text-brand-800 [&_strong]:dark:text-brand-100">
          <MarkdownProse text={viz.mathBridge} />
        </div>
      )}
      <VizFrame
        id={viz.id}
        initialProps={viz.initialProps ?? viz.props ?? {}}
        title={viz.title}
      />
      {viz.caption && (
        <p className="text-xs text-slate-400 dark:text-slate-500 px-4 py-2.5 italic text-center leading-relaxed border-t border-slate-200 dark:border-slate-800">
          {parseProse(viz.caption)}
        </p>
      )}
    </div>
  );
}

// ─── Viz group — always stacked ───────────────────────────────────────────

function VizTabGroup({ vizzes, lessonId }) {
  if (vizzes.length === 0) return null;
  return (
    <div className="flex flex-col gap-4">
      {vizzes.map((viz, i) => (
        <VizCard
          key={i}
          viz={viz}
          noteId={lessonId ? `${lessonId}:viz:${viz.id}:${i}` : undefined}
          borderColor="border-slate-200 dark:border-slate-700"
        />
      ))}
    </div>
  );
}

// ─── 📘 Semantic Layer ─────────────────────────────────────────────────────

function SemanticsBlock({ semantics }) {
  if (!semantics) return null;
  return (
    <div className="mb-12 mt-4">
      <h3 className="text-[13px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-6 flex items-center gap-3">
        <span className="w-8 h-px bg-slate-200 dark:bg-slate-700"></span>
        Symbols & Meaning
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {semantics.core?.map((item, i) => (
            <div
              key={i}
              className="flex flex-col items-stretch gap-3 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-200"
            >
              <div className="flex-shrink-0 w-full flex justify-center mb-1">
                <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center font-mono text-lg font-bold text-slate-800 dark:text-slate-200 shadow-sm w-full">
                  <KatexBlock expr={item.symbol} />
                </div>
              </div>
              <div className="flex-1 min-h-[2.5rem] text-[16px] text-slate-700 dark:text-slate-300 leading-relaxed text-center">
                <MarkdownProse text={item.meaning} />
              </div>
            </div>
          ))}
        </div>
        {semantics.rulesOfThumb?.length > 0 && (
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-5 mt-6 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">
              Rules of Thumb
            </p>
            <ul className="space-y-3">
              {semantics.rulesOfThumb.map((rule, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300"
                >
                  <span className="text-slate-400 mt-0.5">→</span>
                  <span className="flex-1">{parseProse(rule)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
    </div>
  );
}

// ─── 🌉 Multi-Perspective Synchronization ──────────────────────────────────

function PerspectiveSync({ perspectives, bridge }) {
  if (!perspectives?.length) return null;
  return (
    <div className="mb-12 mt-8">
      <h3 className="text-[13px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-6 flex items-center gap-3">
        <span className="w-8 h-px bg-slate-200 dark:bg-slate-700"></span>
        Perspective Synchronization
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {perspectives.map((p, i) => (
          <div
            key={i}
            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-sky-100 dark:border-sky-800 shadow-sm"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-sky-500 dark:text-sky-400 mb-1">
              {p.type}
            </p>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {p.statement}
            </p>
          </div>
        ))}
      </div>
      {bridge && (
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center">
          <p className="text-[16px] text-slate-800 dark:text-slate-200 font-medium">
            {bridge}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── ⚠️ Failure Modes ───────────────────────────────────────────────────────

function FailureModes({ modes }) {
  if (!modes?.length) return null;
  return (
    <div className="mb-12 mt-8">
      <h3 className="text-[13px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-6 flex items-center gap-3">
        <span className="w-8 h-px bg-slate-200 dark:bg-slate-700"></span>
        Failure Modes: Where Logic Breaks
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200 dark:border-slate-800">
              <th className="pb-3 font-semibold text-slate-700 dark:text-slate-300">
                Case
              </th>
              <th className="pb-3 font-semibold text-slate-700 dark:text-slate-300">
                Example
              </th>
              <th className="pb-3 font-semibold text-slate-700 dark:text-slate-300">
                Internal Logic Failure
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {modes.map((m, i) => (
              <tr
                key={i}
                className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
              >
                <td className="py-4 pr-4 font-medium text-slate-800 dark:text-slate-200">
                  {m.case}
                </td>
                <td className="py-4 pr-4 text-slate-700 dark:text-slate-300">
                  <KatexBlock expr={m.example} />
                </td>
                <td className="py-4 text-slate-600 dark:text-slate-400">
                  {m.reason}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 🔍 Local Linearity ────────────────────────────────────────────────────

function LocalLinearity({ config }) {
  if (!config) return null;
  return (
    <div className="mb-10 mt-8">
      <h3 className="text-[13px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-6 flex items-center gap-3">
        <span className="w-8 h-px bg-slate-200 dark:bg-slate-700"></span>
        Local Linearity Principle
      </h3>
      <div className="pl-6 border-l-4 border-slate-200 dark:border-slate-800">
        <p className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4 leading-relaxed font-serif">
          {config.statement}
        </p>
        <div className="mb-4">
          <KatexBlock expr={config.formula} />
        </div>
        <p className="text-[16px] text-slate-600 dark:text-slate-400 font-serif">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Meaning:</span> {config.meaning}
        </p>
      </div>
    </div>
  );
}

// ─── 🎯 Recall Triggers ───────────────────────────────────────────────────

function TriggerSystem({ triggers }) {
  if (!triggers?.length) return null;
  return (
    <div className="mt-12 space-y-3">
      <h3 className="text-[13px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-6 flex items-center gap-3">
        <span className="w-8 h-px bg-slate-200 dark:bg-slate-700"></span>
        Internal Trigger & Recall System
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {triggers.map((p, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 transition-colors"
          >
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-2">
              Trigger
            </p>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
              "{p.prompt}"
            </p>
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/60">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-2">
                Recall
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 italic leading-relaxed">
                {p.recall}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 🧠 Intuition block ────────────────────────────────────────────────────

function IntuitionBlock({ data, lesson }) {
  const hasAlternate =
    data?.alternate?.prose?.length > 0 ||
    data?.alternate?.callouts?.length > 0 ||
    data?.alternate?.visualizations?.length > 0;

  const isBlocksFormat = (data?.blocks?.length ?? 0) > 0;
  // If blocks format, vizzes are already rendered inline by SectionContent — don't render them again
  const primaryVizzes = isBlocksFormat ? [] : getSectionVizzes(data);
  const hasPrimary =
    data?.prose?.length > 0 ||
    data?.callouts?.length > 0 ||
    primaryVizzes.length > 0 ||
    isBlocksFormat;
  const alternateVizzes = hasAlternate ? getSectionVizzes(data.alternate) : [];
  if (!hasPrimary && !hasAlternate) return null;

  return (
    <div className="mb-16" id={lesson?.id ? `${lesson.id}-intuition` : undefined}>
      <div className="mb-8 flex items-center gap-4">
        <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 font-serif">
          Conceptual Intuition
        </h2>
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
      </div>

      <div className="py-2">
        <SemanticsBlock semantics={data.semantics ?? lesson?.semantics} />
        <SectionContent data={data} />
        {data.perspectives?.length > 0 && (
          <PerspectiveSync
            perspectives={data.perspectives}
            bridge={data.bridge}
          />
        )}
        {data.localLinearity && <LocalLinearity config={data.localLinearity} />}
        {primaryVizzes.length > 0 && (
          <div className="mt-6">
            <VizTabGroup vizzes={primaryVizzes} lessonId={lesson?.id} />
          </div>
        )}
        {data.failureModes?.length > 0 && (
          <FailureModes modes={data.failureModes} />
        )}
        {hasAlternate && (
          <>
            <div className="my-10 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                Another Perspective
              </span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>
            <SectionContent data={data.alternate} />
            {alternateVizzes.length > 0 && (
              <div className="mt-6 space-y-4">
                {alternateVizzes.map((viz, i) => (
                  <VizCard
                    key={`alt-${viz.id}-${i}`}
                    viz={viz}
                    noteId={
                      lesson?.id ? `${lesson.id}:viz:alt-${viz.id}` : undefined
                    }
                    borderColor="border-slate-200 dark:border-slate-700"
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── 📐 Mathematics block ──────────────────────────────────────────────────

function MathBlock({ data, lessonId }) {
  const isBlocksFormat = (data?.blocks?.length ?? 0) > 0;
  const vizzes = isBlocksFormat ? [] : getSectionVizzes(data);
  const hasProse = data?.prose?.length > 0 || isBlocksFormat;
  const hasCallouts = data?.callouts?.length > 0;
  if (!hasProse && !hasCallouts && !vizzes.length) return null;

  return (
    <div
      id={lessonId ? `${lessonId}-math` : undefined}
      className="mb-16 group"
    >
      <div className="mb-8 flex items-center gap-4">
        <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 font-serif">
          Operational Mathematics
        </h2>
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="py-2 space-y-6">
          {data.processDefinition?.length > 0 && (
            <div className="mb-6 p-4 rounded-xl bg-brand-600 text-white shadow-xl shadow-brand-500/20">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-200 mb-3">
                Operational Thinking: Finding the Derivative
              </p>
              <ol className="space-y-3">
                {data.processDefinition.map((step, i) => (
                  <li
                    key={i}
                    className="flex gap-4 text-sm font-semibold border-l-2 border-brand-400/30 pl-4 items-center"
                  >
                    <span className="w-5 h-5 rounded-full bg-brand-700 flex items-center justify-center text-[10px] text-brand-300 flex-shrink-0">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
          <SectionContent data={data} />
          {vizzes.length > 0 && (
            <div className="mt-4 space-y-4">
              {vizzes.map((viz, i) => (
                <VizCard
                  key={`${viz.id}-${i}`}
                  viz={viz}
                  noteId={lessonId ? `${lessonId}:viz:${viz.id}` : undefined}
                  borderColor="border-brand-100 dark:border-brand-900"
                />
              ))}
            </div>
          )}
        </div>
    </div>
  );
}

// ─── ∴ Rigor / Formal Proof block ─────────────────────────────────────────

function RigorBlock({ data, lessonId }) {
  const isBlocksFormat = (data?.blocks?.length ?? 0) > 0;
  const vizzes = isBlocksFormat ? [] : getSectionVizzes(data);
  const proofVizId = data?.visualizationId;
  const proofVizPropsKey = JSON.stringify(data?.visualizationProps ?? {});
  const extraVizzes = vizzes.filter((viz) => {
    if (!proofVizId) return true;
    if (viz.id !== proofVizId) return true;
    return (
      JSON.stringify(viz.initialProps ?? viz.props ?? {}) !== proofVizPropsKey
    );
  });
  const hasProse = data?.prose?.length > 0 || isBlocksFormat;
  const hasCallouts = data?.callouts?.length > 0;
  const hasProofSteps = data?.proofSteps?.length > 0;
  if (!hasProse && !hasCallouts && !vizzes.length && !hasProofSteps)
    return null;

  return (
    <div
      id={lessonId ? `${lessonId}-rigor` : undefined}
      className="mb-16 group"
    >
      <div className="mb-8 flex items-center gap-4">
        <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 font-serif">
          Formal Rigor & Proof
        </h2>
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="py-2 space-y-6">
          {hasProse || hasCallouts || isBlocksFormat ? (
            <SectionContent data={data} />
          ) : null}
          {hasProofSteps ? (
            <DynamicProof
              steps={data.proofSteps}
              visualizationId={data.visualizationId}
              visualizationProps={data.visualizationProps ?? {}}
            />
          ) : null}
          {extraVizzes.length > 0 && (
            <div className="mt-4 space-y-4">
              {extraVizzes.map((viz, i) => (
                <VizCard
                  key={`${viz.id}-${i}`}
                  viz={viz}
                  noteId={lessonId ? `${lessonId}:viz:${viz.id}` : undefined}
                  borderColor="border-purple-100 dark:border-purple-900"
                />
              ))}
            </div>
          )}
        </div>
    </div>
  );
}

// ─── 📝 Practice block ─────────────────────────────────────────────────────

function PracticeBlock({ examples, challenges, triggers, lessonId }) {
  const hasExamples = examples?.length > 0;
  const hasChallenges = challenges?.length > 0;
  if (!hasExamples && !hasChallenges) return null;

  return (
    <div className="mt-10">
      {hasExamples && (
        <div className="mb-10">
          <SectionDivider icon="📝" label="Worked Examples" color="emerald" />
          <div className="space-y-6">
            {examples.map((ex, i) => (
              <ScrubbableExample
                key={ex.id ?? i}
                example={ex}
                number={i + 1}
                lessonId={lessonId}
              />
            ))}
          </div>
        </div>
      )}
      {hasChallenges && (
        <div>
          <SectionDivider icon="🎯" label="Challenge Problems" color="slate" />
          <p className="text-sm text-slate-500 dark:text-slate-400 italic mb-5">
            Try each problem before revealing the walkthrough — the struggle is
            where learning happens.
          </p>
          <div className="space-y-4">
            {challenges.map((ch, i) => (
              <ChallengeBlock key={ch.id ?? i} challenge={ch} number={i + 1} />
            ))}
          </div>
        </div>
      )}
      {triggers?.length > 0 && <TriggerSystem triggers={triggers} />}
    </div>
  );
}

// ─── 🔗 Spiral Links block ─────────────────────────────────────────────────

function SpiralBlock({ spiral }) {
  if (!spiral) return null;
  const { recoveryPoints = [], futureLinks = [] } = spiral;
  if (!recoveryPoints.length && !futureLinks.length) return null;
  return (
    <div className="mt-12 mb-10 rounded-3xl border border-amber-200 dark:border-amber-900/40 bg-white dark:bg-slate-900 overflow-hidden shadow-premium">
      <div className="px-6 py-4 oc-header-gradient border-b border-amber-100 dark:border-amber-900/40 flex items-center gap-3">
        <span className="text-lg">🔗</span>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-800 dark:text-amber-300">
          Spiral Learning: Context & Progression
        </h3>
      </div>
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
        {recoveryPoints.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-3">
              ↩ Recovering From
            </p>
            <div className="space-y-3">
              {recoveryPoints.map((pt, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-800/50 shadow-sm"
                >
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-1">
                    {pt.label}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {pt.note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        {futureLinks.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-3">
              → Unlocking Next
            </p>
            <div className="space-y-3">
              {futureLinks.map((pt, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-800/50 shadow-sm"
                >
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-1">
                    {pt.label}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {pt.note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ✅ Assessment block ──────────────────────────────────────────────────────

// Notebook IDs that should render in the labs section (after examples), not inside Math/Rigor
const LAB_VIZ_IDS = new Set([
  "PythonNotebook",
  "OpenMatNotebook",
  "GcodeNotebook",
]);

function extractLabVizzes(section) {
  if (!section?.visualizations?.length) return { section, labs: [] };
  const labs = section.visualizations.filter((v) =>
    LAB_VIZ_IDS.has(v.id ?? v.vizId),
  );
  const remaining = section.visualizations.filter(
    (v) => !LAB_VIZ_IDS.has(v.id ?? v.vizId),
  );
  return { section: { ...section, visualizations: remaining }, labs };
}

// ─── Main export ───────────────────────────────────────────────────────────

export default function MicroCycleLesson({ lesson }) {
  // Pull notebook vizzes out of math so they render after examples instead of mid-lesson
  const { section: mathWithoutLabs, labs: mathLabs } = extractLabVizzes(
    lesson.math,
  );
  const openmatFromMath = mathLabs.filter(
    (v) => (v.id ?? v.vizId) === "OpenMatNotebook",
  );
  const pythonFromMath = mathLabs.filter(
    (v) => (v.id ?? v.vizId) === "PythonNotebook",
  );

  return (
    <div className="w-full">
      <IntuitionBlock data={lesson.intuition} lesson={lesson} />
      {lesson.mentalModel?.length > 0 && (
        <div className="mb-10 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-b-4 border-b-brand-500 shadow-md dark:shadow-2xl overflow-hidden">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-600 dark:text-brand-400 pt-5 pb-4 text-center">
            Final Mental Model Compression
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y divide-slate-200 dark:divide-slate-800 sm:divide-y-0 sm:divide-x border-t border-slate-200 dark:border-slate-800">
            {lesson.mentalModel.map((item, i) => (
              <div
                key={i}
                className={`px-5 py-4 ${i > 0 ? "sm:border-t-0" : ""}`}
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-400 dark:text-brand-500 block mb-1.5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <MarkdownProse
                  text={item}
                  className="[&_p]:text-sm [&_p]:font-semibold [&_p]:leading-snug [&_p]:text-slate-800 [&_p]:dark:text-slate-300 [&_p]:mb-0"
                />
              </div>
            ))}
          </div>
        </div>
      )}
      {lesson.applications && (
        <div className="mb-8">
          <SectionDivider
            icon="🧩"
            label="Applying the Theorem"
            color="emerald"
            noteId={lesson.id ? `${lesson.id}:applications` : undefined}
          />
          <SectionContent data={lesson.applications} />
          {getSectionVizzes(lesson.applications).map((viz, i) => (
            <VizCard
              key={`app-viz-${i}`}
              viz={viz}
              borderColor="border-emerald-200 dark:border-emerald-800"
            />
          ))}
        </div>
      )}
      <MathBlock data={mathWithoutLabs} lessonId={lesson.id} />
      <RigorBlock data={lesson.rigor} lessonId={lesson.id} />
      {lesson.walkthroughs?.length > 0 && (
        <div className="mb-2">
          <SectionDivider
            icon="🗺"
            label="Guided Walkthroughs"
            color="brand"
            noteId={lesson.id ? `${lesson.id}:walkthroughs` : undefined}
          />
          <GuidedWalkthrough walkthroughs={lesson.walkthroughs} />
        </div>
      )}
      <UnifiedLearningDock lesson={lesson} />
      {lesson.discovery &&
        (Array.isArray(lesson.discovery) ? (
          lesson.discovery.map((d, i) => (
            <FirstPrinciplesLesson
              key={`${lesson.id}-discovery-${i}`}
              discovery={d}
            />
          ))
        ) : (
          <FirstPrinciplesLesson
            key={`${lesson.id}-discovery`}
            discovery={lesson.discovery}
          />
        ))}
      {lesson.story &&
        (Array.isArray(lesson.story) ? (
          lesson.story.map((s, i) => (
            <NarrativeStory key={`${lesson.id}-story-${i}`} story={s} />
          ))
        ) : (
          <NarrativeStory key={`${lesson.id}-story`} story={lesson.story} />
        ))}
      <PracticeBlock
        examples={lesson.examples}
        challenges={lesson.challenges}
        triggers={lesson.triggers}
        lessonId={lesson.id}
      />
      {lesson.homelab && (
        <div className="mb-10">
          <SectionDivider
            icon="🏠"
            label={lesson.homelab.title ?? 'HomeLab — Try It At Home'}
            color="emerald"
            noteId={lesson.id ? `${lesson.id}:homelab` : undefined}
          />
          {lesson.homelab.intro && (
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {lesson.homelab.intro}
            </p>
          )}
          {(lesson.homelab.experiments ?? []).map((exp, i) => (
            <div key={exp.id ?? i} className="mb-8 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/50">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">
                  Experiment {i + 1}
                </p>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-snug">
                  {exp.title}
                </h3>
                {exp.tagline && (
                  <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300 font-medium italic">
                    {exp.tagline}
                  </p>
                )}
              </div>
              {exp.equipment && (
                <div className="px-5 py-3 bg-amber-50/60 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900/30 flex items-start gap-2">
                  <span className="text-base mt-0.5">🔧</span>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 mr-2">Equipment</span>
                    <span className="text-xs text-slate-700 dark:text-slate-300">{exp.equipment}</span>
                  </div>
                </div>
              )}
              {exp.overview && (
                <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{exp.overview}</p>
                </div>
              )}
              {exp.visualizationId && (
                <div className="min-h-[520px]">
                  <VizCard
                    viz={{ id: exp.visualizationId, title: exp.title }}
                    noteId={lesson.id ? `${lesson.id}:homelab:${exp.id ?? i}` : undefined}
                    borderColor="border-emerald-200 dark:border-emerald-800"
                  />
                </div>
              )}
              {(exp.physicsConnection || exp.expectedAccuracy || exp.followUp) && (
                <div className="px-5 py-4 space-y-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800">
                  {exp.physicsConnection && (
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 block mb-1">Physics connection</span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{exp.physicsConnection}</p>
                    </div>
                  )}
                  {exp.expectedAccuracy && (
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block mb-1">Expected accuracy</span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{exp.expectedAccuracy}</p>
                    </div>
                  )}
                  {exp.followUp && (
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 block mb-1">Try next</span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{exp.followUp}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {(() => {
        // OpenMAT / MATLAB lab — from top-level lesson.openmat field OR extracted from math.visualizations
        const openmatRaw = lesson.openmat ?? lesson.openmatLab ?? lesson.notebooks?.matlab;
        const cells = openmatRaw?.cells ?? openmatRaw?.initialCells;
        let visualizations = openmatRaw?.visualizations ?? [];
        if (visualizations.length === 0 && cells?.length > 0) {
          visualizations = [
            {
              id: "OpenMatNotebook",
              initialProps: { initialCells: cells },
              title: openmatRaw.title ?? "OpenMAT / MATLAB Lab",
            },
          ];
        }
        // Append any notebooks extracted from math.visualizations
        const allOpenmat = [...visualizations, ...openmatFromMath];
        if (!allOpenmat.length) return null;
        return (
          <div className="mb-8">
            <SectionDivider
              icon="⚙️"
              label={openmatRaw?.title ?? "OpenMAT / MATLAB Lab"}
              color="amber"
              noteId={lesson.id ? `${lesson.id}:openmat` : undefined}
            />
            {(openmatRaw?.description ?? openmatRaw?.intro) && (
              <p className="mb-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {openmatRaw.description ?? openmatRaw.intro}
              </p>
            )}
            {allOpenmat.map((v, i) => (
              <div key={i} className="mb-6">
                <VizFrame
                  id={v.id ?? v.vizId}
                  initialProps={v.initialProps ?? v.props ?? {}}
                  title={v.title}
                />
              </div>
            ))}
          </div>
        );
      })()}
      {(() => {
        // Python lab — from top-level lesson.python field OR extracted from math.visualizations
        const pythonRaw = lesson.python ?? lesson.pythonLab ?? lesson.notebooks?.python;
        const cells = pythonRaw?.cells ?? pythonRaw?.initialCells;
        let visualizations = pythonRaw?.visualizations ?? [];
        if (visualizations.length === 0 && cells?.length > 0) {
          visualizations = [
            {
              id: "PythonNotebook",
              props: { initialCells: cells },
              title: pythonRaw.title ?? "Python Lab",
            },
          ];
        }
        // Append any notebooks extracted from math.visualizations
        const allPython = [...visualizations, ...pythonFromMath];
        if (!allPython.length) return null;
        return (
          <div className="mb-8">
            <SectionDivider
              icon="🐍"
              label={pythonRaw?.title ?? "Python Lab"}
              color="brand"
              noteId={lesson.id ? `${lesson.id}:python` : undefined}
            />
            {(pythonRaw?.description ?? pythonRaw?.intro) && (
              <p className="mb-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {pythonRaw.description ?? pythonRaw.intro}
              </p>
            )}
            {allPython.map((v, i) => (
              <div key={i} className="mb-6">
                <VizFrame
                  id={v.id ?? v.vizId}
                  initialProps={v.initialProps ?? v.props ?? {}}
                  title={v.title}
                />
              </div>
            ))}
          </div>
        );
      })()}
      <SpiralBlock spiral={lesson.spiral} />
      {lesson.assessment?.questions?.length > 0 && (
        <AssessmentBlock assessment={lesson.assessment} />
      )}
      {lesson.supplementalVisualizations?.length > 0 && (
        <div className="mt-12 space-y-8">
          <SectionDivider icon="🚀" label="Guided Walkthroughs" color="brand" />
          {lesson.supplementalVisualizations.map((v, i) => (
            <VizCard
              key={i}
              viz={v}
              noteId={`${lesson.id}:viz:supp-${v.id ?? i}`}
              borderColor="border-brand-200 dark:border-brand-900/60"
            />
          ))}
        </div>
      )}
      {lesson.tools?.length > 0 && (
        <div className="mt-12">
          <SectionDivider icon="🧪" label="Interactive Labs" color="brand" />
          <div className="grid gap-4 sm:grid-cols-2">
            {lesson.tools.map((tool) => (
              <Link
                key={tool.id}
                to={tool.href}
                className="group block rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-5 shadow-sm hover:shadow-md hover:border-sky-300 dark:hover:border-sky-700 transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="text-2xl">🧪</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-900/40 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                    Lab
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1 leading-snug group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                  {tool.title}
                </h3>
                {tool.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                    {tool.description}
                  </p>
                )}
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 group-hover:gap-2.5 transition-all">
                  Launch Lab
                  <span className="transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
