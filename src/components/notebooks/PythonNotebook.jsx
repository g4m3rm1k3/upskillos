// PythonNotebook.jsx
// Interactive Python notebook with Pyodide + Monaco Editor.
// Detects opencalc Figure output and renders it via FigureRenderer.
// Drop-in replacement for the provided PythonNotebook component.

import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import Editor from "@monaco-editor/react";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-python";
import FigureRenderer from "./FigureRenderer";
import { compareOutput } from "./compareOutput.js";
import { terminalText } from "./terminalText.js";
import { parseProse } from "../math/parseProse.jsx";
import { proseItems } from "../../tools/notebook-lab/lessonFormat.js";
import { setupOpenCalcMonaco, applyPythonIndentRules } from "../../utils/monacoThemes.js";
import { OPENCALC_LIB_SOURCE } from "./opencalcLibSource.js";
import { useReportBug } from "../../hooks/useReportBug.js";
import { createPyodide as createBundledPyodide } from "../../utils/pyodideRuntime.js";

import { useThemeColors, withAlpha } from '../../hooks/useThemeColors';
import { useGlobalTheme } from '../../context/ThemeContext.jsx';
// ── Colors hook (same as all viz components) ─────────────────────────────────


// ── Detect opencalc figure JSON ───────────────────────────────────────────────
function isFigureOutput(str) {
  if (typeof str !== "string") return false;
  const trimmed = str.trim();
  return (
    trimmed.startsWith('{"type":"opencalc_figure"') ||
    trimmed.startsWith('{"type": "opencalc_figure"')
  );
}

// ── Starter cells ─────────────────────────────────────────────────────────────
const STARTER_CELLS = [
  {
    id: 1,
    code: `# Python Sandbox\n# Type code here and press Shift+Enter to run\n\nimport this`,
    output: "",
    status: "idle",
    figureJson: null,
    matplotlibImages: [],
  },
];

// Pulls the headline ("ExceptionType: message") out of a Python traceback so
// it can be shown prominently, with the full multi-line traceback available
// but secondary — rather than dumping the raw traceback as the only thing a
// student sees.
function tracebackHeadline(output) {
  const lines = output.trim().split('\n')
  return lines[lines.length - 1] || output
}

// The traceback of a cell error with Pyodide's own frames removed: only the
// frames in the learner's code (`File "<exec>"`) and the error itself remain.
function cellTraceback(output) {
  const start = output.indexOf('Traceback (most recent call last):')
  const text = start === -1 ? output.replace(/^[\s\S]*?Error: /, '') : output.slice(start)
  const out = []
  let keep = true
  for (const line of text.split('\n')) {
    const frame = line.match(/^ {2}File "(.+?)"/)
    if (frame) keep = frame[1] === '<exec>'
    else if (!line.startsWith('    ')) keep = true
    if (keep) out.push(line)
  }
  return out.join('\n').trim()
}

// The line of the learner's code where the error happened, if known.
function errorLine(output) {
  const lines = [...output.matchAll(/File "<exec>", line (\d+)/g)]
  return lines.length ? lines[lines.length - 1][1] : null
}

// ── ExpectedOutput ────────────────────────────────────────────────────────────
// A type-along cell (typeIt, from a lesson's ```python type block) can carry the output its
// reference code prints. Before running, it stays folded, so the learner can predict first;
// after a run, it says whether the learner's output matches, and where it first differs.
function ExpectedOutput({ cell, C }) {
  if (!cell.typeIt || cell.expectedOutput == null) return null;
  // A successful run puts the cell back to "idle" with an execution count.
  const ran = cell.status === "error" || (cell.status === "idle" && cell.executionCount != null);
  const result = ran && cell.status !== "error" ? compareOutput(cell.output, cell.expectedOutput) : null;
  const box = { margin: "0 16px 12px", borderRadius: 8, fontSize: 13, lineHeight: 1.6 };
  const pre = (text) => (
    <pre style={{ margin: "6px 0 0", padding: "8px 10px", background: C.surface2, borderRadius: 6, fontSize: 12, overflowX: "auto", whiteSpace: "pre" }}>{text}</pre>
  );
  if (!ran) {
    return (
      <details style={{ ...box, padding: "6px 12px", border: `0.5px solid ${C.border}`, color: C.hint }}>
        <summary style={{ cursor: "pointer" }}>Expected output (predict it first, then run your code)</summary>
        {pre(cell.expectedOutput)}
      </details>
    );
  }
  if (cell.status === "error") {
    return (
      <div style={{ ...box, padding: "8px 12px", border: `1px solid ${C.amberBd}`, background: C.amberBg, color: C.amber }}>
        Your code stopped with an error, so there's no output to compare yet. Read the last line of the error, compare your code with the code above, and run it again.
      </div>
    );
  }
  if (result.matches) {
    return (
      <div role="status" style={{ ...box, padding: "8px 12px", border: `1px solid ${C.tealBd ?? C.border}`, background: C.tealBg ?? C.surface2, color: C.teal }}>
        ✓ Your output matches the expected output.
      </div>
    );
  }
  return (
    <div role="status" style={{ ...box, padding: "8px 12px", border: `1px solid ${C.amberBd}`, background: C.amberBg, color: C.text }}>
      <div style={{ color: C.amber, fontWeight: 600 }}>Your output differs from the expected output, first at line {result.line}.</div>
      <div style={{ fontFamily: "monospace", fontSize: 12, marginTop: 4 }}>
        <div>yours:    {result.yours === undefined ? "(no line)" : JSON.stringify(result.yours)}</div>
        <div>expected: {result.expected === undefined ? "(no line)" : JSON.stringify(result.expected)}</div>
      </div>
      <div style={{ marginTop: 6, color: C.hint }}>Look for a typo in the code you typed: a missing line, a different number, or a print in a different place. The whole expected output:</div>
      {pre(cell.expectedOutput)}
    </div>
  );
}

// ── CellOutput ────────────────────────────────────────────────────────────────
function CellOutput({ cell, C }) {
  const hasMatplotlib = cell.matplotlibImages && cell.matplotlibImages.length > 0;
  const { submit: submitReport, submitting: reportSubmitting, canSubmit: canReport } = useReportBug();
  const [reportStatus, setReportStatus] = useState('idle'); // idle | done | error
  if (!cell.output && !cell.figureJson && !hasMatplotlib) return null;
  // Lessons mark deliberate error demonstrations with expectError: "NameError" etc.
  const isExpectedError =
    cell.status === "error" &&
    !!cell.expectError &&
    tracebackHeadline(cell.output).includes(cell.expectError);

  const report = async () => {
    try {
      await submitReport({
        title: `Notebook cell error: ${tracebackHeadline(cell.output)}`.slice(0, 120),
        description: `Cell "${cell.cellTitle ?? cell.id}" failed:\n\n${cell.output}`,
        category: 'bug',
      });
      setReportStatus('done');
    } catch {
      setReportStatus('error');
    }
  };

  return (
    <div style={{ borderTop: `0.5px solid ${C.border}` }}>
      <div
        style={{
          fontSize: 10,
          color: C.hint,
          padding: "6px 14px 2px",
          fontFamily: "monospace",
          fontWeight: 500,
        }}
      >
        Out [{cell.id}]
      </div>

      {/* opencalc Figure canvas */}
      {cell.figureJson && (
        <div style={{ padding: "0 14px 10px" }}>
          <FigureRenderer figureJson={cell.figureJson} C={C} />
        </div>
      )}

      {/* matplotlib figures — captured as PNG via Agg backend */}
      {hasMatplotlib && (
        <div style={{ padding: "6px 14px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
          {cell.matplotlibImages.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`Figure ${i + 1}`}
              style={{ maxWidth: "100%", borderRadius: 8, display: "block", border: `1px solid ${C.border}` }}
            />
          ))}
        </div>
      )}

      {/* Text output */}
      {cell.output && cell.status !== "error" && (
        <pre
          style={{
            margin: 0,
            padding: "4px 14px 12px",
            fontFamily: "monospace",
            fontSize: 13,
            lineHeight: 1.6,
            color: C.text,
            background: "transparent",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {cell.output}
        </pre>
      )}

      {/* Error output — headline first, full traceback collapsed, with a report action */}
      {cell.output && cell.status === "error" && (
        <div style={{ padding: "4px 14px 12px" }}>
          {cell.printedBeforeError && (
            <pre style={{ margin: "0 0 8px", fontFamily: "monospace", fontSize: 13, lineHeight: 1.6, color: C.text, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {cell.printedBeforeError}
            </pre>
          )}
          {isExpectedError && (
            <p style={{ margin: "0 0 6px", fontSize: 12, lineHeight: 1.5, color: C.amber, fontWeight: 600 }}>
              Expected error — this cell is meant to fail so you can read the message. Follow the instructions above to fix it.
            </p>
          )}
          <p style={{ margin: "0 0 6px", fontFamily: "monospace", fontSize: 13, lineHeight: 1.6, color: C.red, fontWeight: 600, wordBreak: "break-word" }}>
            {errorLine(cell.output) && `Line ${errorLine(cell.output)}: `}
            {tracebackHeadline(cell.output)}
          </p>
          <details>
            <summary style={{ fontSize: 11, color: C.hint, cursor: "pointer" }}>Show full traceback</summary>
            <pre style={{ margin: "6px 0 0", fontFamily: "monospace", fontSize: 12, lineHeight: 1.5, color: C.red, opacity: 0.85, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {cellTraceback(cell.output)}
            </pre>
          </details>
          {isExpectedError ? null : reportStatus === "done" ? (
            <p style={{ fontSize: 11, color: C.teal, marginTop: 6 }}>✓ Reported — thanks for flagging it.</p>
          ) : canReport ? (
            <button
              onClick={report}
              disabled={reportSubmitting}
              style={{ fontSize: 11, color: C.hint, background: "none", border: "none", padding: 0, marginTop: 6, cursor: "pointer", textDecoration: "underline" }}
            >
              {reportSubmitting ? "Reporting…" : reportStatus === "error" ? "Couldn't report — try again?" : "Report this"}
            </button>
          ) : (
            <p style={{ fontSize: 11, color: C.hint, marginTop: 6 }}>Sign in to report this error.</p>
          )}
        </div>
      )}

      {/* Test Feedback Banner */}
      {cell.testResult && (
        <div
          style={{
            margin: "0 14px 14px",
            padding: "12px 16px",
            borderRadius: 10,
            background: cell.testResult.success ? C.tealBg : C.redBg,
            border: `1px solid ${cell.testResult.success ? C.tealBd : C.redBd}`,
            display: "flex",
            alignItems: "center",
            gap: 12,
            animation: "slideIn 0.3s ease-out",
          }}
        >
          <span style={{ fontSize: 20 }}>
            {cell.testResult.success ? "🎉" : "❌"}
          </span>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: cell.testResult.success ? C.teal : C.red,
              }}
            >
              {cell.testResult.success
                ? "Challenge Complete!"
                : "Not quite there yet"}
            </div>
            <div
              style={{
                fontSize: 12,
                color: cell.testResult.success ? C.teal : C.red,
                opacity: 0.8,
              }}
            >
              {cell.testResult.message}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pyodide Singleton Management ──────────────────────────────────────────
// We use a global promise to ensure Pyodide is only loaded ONCE even if
// multiple notebook components are mounted (e.g. lesson sandbox + global sandbox).
let pyodidePromise = null;

async function getPyodide() {
  if (pyodidePromise) return pyodidePromise;

  pyodidePromise = (async () => {
    const py = await createBundledPyodide({
      fullStdLib: false,
    });

    // 3. Setup filesystem
    py.FS.writeFile("/home/pyodide/opencalc.py", OPENCALC_LIB_SOURCE);

    // 4. Pre-load necessary packages. micropip is NOT auto-available just
    // because Pyodide ships it — `import micropip` in a cell throws
    // ModuleNotFoundError unless `loadPackage("micropip")` has already run
    // once (confirmed live: a lesson cell doing `import micropip` with no
    // JS-side preload failed this way in production).
    await py.loadPackage([
      "micropip",
      "numpy",
      "pandas",
      "matplotlib",
      "scikit-learn",
      "scipy",
      "statsmodels",
      "sqlite3",
      "sympy",
    ]);

    // Force Agg backend so matplotlib never injects HTML into the DOM
    await py.runPythonAsync(`
import warnings
# scikit-learn's threadpoolctl calls a Pyodide API deprecated in 0.29; the
# RuntimeWarning it prints on first use (e.g. KMeans) means nothing to learners.
warnings.filterwarnings('ignore', message='JsProxy.as_object_map', category=RuntimeWarning)
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io as _io, base64 as _base64

# Override plt.show() so figures are never closed before we can capture them
plt.show = lambda *_a, **_k: None

def _capture_matplotlib_figs():
    nums = plt.get_fignums()
    if not nums:
        return []
    result = []
    for n in nums:
        fig = plt.figure(n)
        buf = _io.BytesIO()
        fig.savefig(buf, format='png', bbox_inches='tight', dpi=120)
        buf.seek(0)
        result.append('data:image/png;base64,' + _base64.b64encode(buf.read()).decode())
    plt.close('all')
    return result
`);
    await py.runPythonAsync(
      'from opencalc import Figure; print("Python stack ready")',
    );
    // Names present at startup survive "Reset variables"; everything a learner
    // defines afterwards is cleared by it.
    await py.runPythonAsync("_oc_base_names = set(globals()) | {'_oc_base_names'}");
    return py;
  })().catch(error => { pyodidePromise = null; throw error });

  return pyodidePromise;
}

// ── Challenge difficulty color map ────────────────────────────────────────────
function difficultyStyle(difficulty, C) {
  if (difficulty === "easy")
    return { bg: C.greenBg, border: C.greenBd, text: C.green };
  if (difficulty === "hard")
    return { bg: C.redBg, border: C.redBd, text: C.red };
  return { bg: C.amberBg, border: C.amberBd, text: C.amber }; // medium default
}

// ── Reference code block ──────────────────────────────────────────────────
// Read-only, syntax-highlighted display of a cell's `solution` — used by
// `typeIt` cells (see below) to show the target code between the prose and
// the editor without ever writing it into the editor for the learner.
function ReferenceCodeBlock({ code, C }) {
  const html = useMemo(() => {
    try {
      return Prism.highlight(code, Prism.languages.python, "python");
    } catch {
      return null;
    }
  }, [code]);

  return (
    <div
      style={{
        margin: "0 16px 12px",
        borderRadius: 8,
        overflow: "hidden",
        border: `1px solid ${C.purpleBd}`,
      }}
    >
      <div
        style={{
          padding: "6px 12px",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: C.purple,
          background: C.purpleBg,
          borderBottom: `1px solid ${C.purpleBd}`,
        }}
      >
        Type this into the editor below
      </div>
      <pre
        style={{
          margin: 0,
          padding: "12px 14px",
          fontSize: 13,
          lineHeight: 1.6,
          overflowX: "auto",
          background: "#1e1e1e",
        }}
      >
        {html ? (
          <code className="language-python" style={{ fontFamily: "monospace" }} dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <code style={{ fontFamily: "monospace", color: "#d4d4d4" }}>{code}</code>
        )}
      </pre>
    </div>
  );
}

// ── Prose code block ──────────────────────────────────────────────────────
// A Markdown table ("| a | b |" rows, then a "|---|---|" separator) as an HTML
// table. A "|" inside `code` or escaped as "\|" does not split a cell.
export function splitTableRow(row) {
  const cells = [];
  let cell = "", inCode = false;
  const s = row.trim().replace(/^\|/, "").replace(/\|$/, "");
  for (let k = 0; k < s.length; k++) {
    const ch = s[k];
    if (ch === "\\" && s[k + 1] === "|") { cell += "|"; k++; continue; }
    if (ch === "`") inCode = !inCode;
    if (ch === "|" && !inCode) { cells.push(cell.trim()); cell = ""; continue; }
    cell += ch;
  }
  cells.push(cell.trim());
  return cells;
}

function ProseTable({ text, C, first }) {
  const rows = text.split("\n").map(splitTableRow);
  const isSeparator = (r) => r.every((c) => /^:?-{2,}:?$/.test(c));
  const hasHead = rows.length > 1 && isSeparator(rows[1]);
  const head = hasHead ? rows[0] : null;
  const body = rows.filter((r, k) => !isSeparator(r) && !(hasHead && k === 0));
  const cellStyle = { padding: "7px 12px", borderBottom: `1px solid ${C.border}`, textAlign: "left", verticalAlign: "top" };
  return (
    <div style={{ margin: first ? 0 : "14px 0 0", overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", fontSize: 14, color: C.text, lineHeight: 1.6, minWidth: "60%" }}>
        {head && (
          <thead>
            <tr style={{ background: C.surface2 }}>
              {head.map((c, k) => <th key={k} style={{ ...cellStyle, fontWeight: 650 }}>{parseProse(c)}</th>)}
            </tr>
          </thead>
        )}
        <tbody>
          {body.map((r, k) => (
            <tr key={k}>{r.map((c, j) => <td key={j} style={cellStyle}>{parseProse(c)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProseCodeBlock({ lang, code, C, index }) {
  const html = useMemo(() => {
    try {
      if (Prism.languages[lang]) {
        return Prism.highlight(code, Prism.languages[lang], lang);
      }
      return null;
    } catch {
      return null;
    }
  }, [code, lang]);

  return (
    <div
      style={{
        margin: index === 0 ? "0 0 4px" : "14px 0 4px",
        borderRadius: 7,
        overflow: "hidden",
        border: `1px solid ${C.border}`,
      }}
    >
      {lang && (
        <div
          style={{
            padding: "3px 10px",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: C.muted,
            background: `linear-gradient(90deg, ${C.surface2} 0%, ${C.surface} 100%)`,
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          {lang}
        </div>
      )}
      <pre
        style={{
          margin: 0,
          padding: "10px 14px",
          fontSize: 13.5,
          lineHeight: 1.6,
          overflowX: "auto",
          background: C.bg,
          color: C.text,
          fontFamily: "monospace",
        }}
      >
        {html ? (
          <code className={`language-${lang}`} dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <code>{code}</code>
        )}
      </pre>
    </div>
  );
}

// ── Memoized Cell Component ──────────────────────────────────────────────
const CellComponent = React.memo(
  ({
    cell,
    C,
    monacoTheme,
    onRun,
    onClear,
    onRemove,
    onUpdate,
    isExecuting,
    isOnlyCell,
  }) => {
    const [copied, setCopied] = useState(false);
    const [hintOpen, setHintOpen] = useState(false);
    // Shift+Enter is wired up once, when the editor mounts, but must run the cell with the
    // notebook as it is now (Python loaded, the code just typed), so it calls through a ref.
    const runRef = useRef((code) => onRun(cell.id, code));
    runRef.current = (code) => onRun(cell.id, code);

    const isChallenge = !!cell.challengeType;
    const isFillIn = cell.challengeType === "fill-in";
    const dc = difficultyStyle(cell.difficulty, C);

    const handleCopy = () => {
      navigator.clipboard.writeText(cell.starterBlock || "").then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    };

    // Compute Monaco height from line count
    const lineCount = (cell.code || "").split("\n").length;
    const editorHeight = `${Math.min(320, Math.max(80, lineCount * 21 + 24))}px`;

    return (
      <div
        style={{
          background: `${withAlpha(C.surface, "dd")}`,
          border: `1.5px solid ${cell.status === "error" ? C.redBd : cell.status === "running" ? C.tealBd : isChallenge ? C.purpleBd : withAlpha(C.blueBd, "55")}`,
          borderRadius: 12,
          overflow: "hidden",
          transition: "border-color .2s, box-shadow .2s",
          boxShadow:
            cell.status === "error"
              ? `0 6px 28px ${withAlpha(C.redBd, "33")}, 0 2px 8px ${withAlpha(C.redBd, "18")}`
              : cell.status === "running"
                ? `0 6px 28px ${withAlpha(C.tealBd, "33")}, 0 2px 8px ${withAlpha(C.tealBd, "18")}`
                : isChallenge
                  ? `0 6px 28px ${withAlpha(C.purpleBd, "28")}, 0 2px 8px ${withAlpha(C.purpleBd, "14")}, 0 1px 3px #0004`
                  : `0 6px 24px ${withAlpha(C.blueBd, "18")}, 0 2px 6px #0003`,
        }}
      >
        {/* ── Challenge header ────────────────────────────────────────────── */}
        {isChallenge && (
          <div
            style={{
              padding: "12px 16px",
              background: `linear-gradient(135deg, ${C.purpleBg} 0%, ${C.blueBg} 100%)`,
              borderBottom: `1px solid ${C.purpleBd}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: cell.prompt ? 8 : 0,
              }}
            >
              {/* Number badge */}
              {cell.challengeNumber != null && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: C.purple,
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {cell.challengeNumber}
                </span>
              )}
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.text,
                  flex: 1,
                }}
              >
                {cell.challengeTitle || "Challenge"}
              </span>
              {/* Type badge */}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  padding: "2px 7px",
                  borderRadius: 5,
                  background: isFillIn ? C.blueBg : C.tealBg,
                  border: `1px solid ${isFillIn ? C.blueBd : C.tealBd}`,
                  color: isFillIn ? C.blue : C.teal,
                }}
              >
                {isFillIn ? "Fill In" : "Write"}
              </span>
              {/* Difficulty badge */}
              {cell.difficulty && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 7px",
                    borderRadius: 5,
                    background: dc.bg,
                    border: `1px solid ${dc.border}`,
                    color: dc.text,
                  }}
                >
                  {cell.difficulty}
                </span>
              )}
            </div>
            {/* Prompt */}
            {cell.prompt && (
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: C.muted,
                  lineHeight: 1.7,
                }}
              >
                {cell.prompt}
              </p>
            )}
          </div>
        )}

        {/* ── Demo prose / instructions box ── */}
        {(cell.prose ||
          cell.instructions ||
          (!isChallenge && cell.cellTitle)) && (
          <div style={{ borderBottom: `1px solid ${C.border}` }}>
            {/* Title bar (only for non-challenges, challenges have their own header) */}
            {!isChallenge && cell.cellTitle && (
              <div
                style={{
                  padding: "7px 16px",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: C.blue,
                  background: `linear-gradient(90deg, ${C.blueBg} 0%, ${C.surface2} 60%, ${C.surface} 100%)`,
                  borderBottom: `1px solid ${withAlpha(C.blueBd, "44")}`,
                  borderLeft: `3px solid ${C.blue}`,
                }}
              >
                {cell.cellTitle}
              </div>
            )}
            {/* Prose */}
            {cell.prose && (
              <div
                style={{
                  padding:
                    !isChallenge && cell.cellTitle
                      ? "8px 22px 16px"
                      : "16px 22px 16px",
                  maxWidth: 860,
                  "--nb-accent": C.blue,
                  "--nb-strong": C.text,
                  "--nb-code": C.purple,
                  "--nb-code-bg": C.purpleBg,
                }}
                className="nb-prose"
              >
                <style>{NB_PROSE_CSS}</style>
                {(Array.isArray(cell.prose) ? cell.prose : proseItems((cell.prose || '').split('\n'))).map(
                  (p, i, all) => {
                    // ::: math box — the concept's mathematics before its code
                    if (typeof p === "string" && p.startsWith("::: math")) {
                      return <MathBox key={i} text={p} C={C} first={i === 0} />;
                    }
                    // ### (and deeper) header: a smaller heading inside a section
                    if (typeof p === "string" && /^#{3,6}\s/.test(p)) {
                      return (
                        <h4 key={i} style={{ margin: i === 0 ? "2px 0 8px" : "22px 0 8px", fontSize: 16, fontWeight: 650, color: C.text, lineHeight: 1.4 }}>
                          {parseProse(p.replace(/^#+\s+/, ""))}
                        </h4>
                      );
                    }
                    // | table | rows |
                    if (typeof p === "string" && p.startsWith("|")) {
                      return <ProseTable key={i} text={p} C={C} first={i === 0} />;
                    }
                    // # and ## header line (a notebook's "# Part A" is a section too)
                    if (typeof p === "string" && /^#{1,2}\s/.test(p)) {
                      p = "## " + p.replace(/^#+\s+/, "");
                      return (
                        (() => {
                          const learned = /^what you learned/i.test(p.slice(3));
                          const fg = learned ? C.green : C.blue;
                          const bg = learned ? C.greenBg : C.blueBg;
                          return (
                            <h3
                              key={i}
                              style={{
                                margin: i === 0 ? "2px 0 12px" : "30px 0 12px",
                                fontSize: 19,
                                fontWeight: 650,
                                color: fg,
                                lineHeight: 1.35,
                                padding: "8px 14px",
                                borderRadius: 8,
                                borderLeft: `4px solid ${fg}`,
                                background: `linear-gradient(90deg, ${bg} 0%, transparent 85%)`,
                              }}
                            >
                              {p.slice(3)}
                            </h3>
                          );
                        })()
                      );
                    }
                    // ``` fenced code block
                    if (
                      typeof p === "string" &&
                      p.trimStart().startsWith("```")
                    ) {
                      const lines = p.split("\n");
                      // strip opening fence (```lang) and closing fence (```)
                      const inner = lines
                        .slice(
                          1,
                          lines[lines.length - 1].trimStart().startsWith("```")
                            ? -1
                            : undefined,
                        )
                        .join("\n");
                      const lang =
                        lines[0].replace(/^```/, "").trim() || "bash";
                      return <ProseCodeBlock key={i} index={i} lang={lang} code={inner} C={C} />;
                    }
                    // - Bullet list: string with lines starting with "- "
                    if (
                      typeof p === "string" &&
                      p.trimStart().startsWith("- ")
                    ) {
                      const items = p
                        .split("\n")
                        .filter((l) => l.trim().startsWith("- "));
                      const covers = i > 0 && typeof all[i - 1] === "string" && /lesson covers:?$/i.test(all[i - 1].trim());
                      return (
                        <ul
                          key={i}
                          style={{
                            margin: i === 0 ? 0 : covers ? "8px 0 0" : "12px 0 0",
                            ...(covers ? { padding: "12px 16px 12px 36px", borderRadius: 10, background: C.tealBg, border: `1px solid ${withAlpha(C.tealBd, "55")}` } : {}),
                            paddingLeft: covers ? 36 : 24,
                            fontSize: 15,
                            color: C.text,
                            lineHeight: 1.7,
                            listStyleType: "disc",
                          }}
                        >
                          {items.map((item, j) => (
                            <li
                              key={j}
                              style={{
                                marginBottom: j < items.length - 1 ? 7 : 0,
                                paddingLeft: 2,
                              }}
                            >
                              {parseProse(item.replace(/^[\s]*-\s*/, ""))}
                            </li>
                          ))}
                        </ul>
                      );
                    }
                    // 1. Numbered list: every line starts with "N. "
                    if (
                      typeof p === "string" &&
                      p.split("\n").every((l) => /^\s*\d+\.\s/.test(l))
                    ) {
                      const items = p.split("\n");
                      return (
                        <ol
                          key={i}
                          start={parseInt(items[0], 10)}
                          style={{
                            margin: i === 0 ? 0 : "12px 0 0",
                            paddingLeft: 26,
                            fontSize: 15,
                            color: C.text,
                            lineHeight: 1.7,
                            listStyleType: "decimal",
                          }}
                        >
                          {items.map((item, j) => (
                            <li key={j} style={{ marginBottom: j < items.length - 1 ? 7 : 0, paddingLeft: 2 }}>
                              {parseProse(item.replace(/^\s*\d+\.\s*/, ""))}
                            </li>
                          ))}
                        </ol>
                      );
                    }
                    // "This lesson covers:" label
                    if (typeof p === "string" && /^this lesson covers:?$/i.test(p.trim())) {
                      return (
                        <p key={i} style={{ margin: "18px 0 0", fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.teal }}>
                          {p.replace(/:$/, "")}
                        </p>
                      );
                    }
                    // "Predict before running: ..." becomes its own callout
                    if (typeof p === "string" && p.includes("Predict before running:")) {
                      const at = p.indexOf("Predict before running:");
                      const before = p.slice(0, at).trim();
                      const rest = p.slice(at + "Predict before running:".length).trim();
                      const question = rest.charAt(0).toUpperCase() + rest.slice(1);
                      return (
                        <div key={i}>
                          {before && (
                            <p style={{ margin: i === 0 ? 0 : "14px 0 0", fontSize: 15, color: C.text, lineHeight: 1.75 }}>
                              {parseProse(before)}
                            </p>
                          )}
                          <div
                            style={{
                              margin: "14px 0 0",
                              padding: "10px 14px",
                              borderRadius: 8,
                              background: C.amberBg,
                              borderLeft: `4px solid ${C.amber}`,
                              fontSize: 15,
                              lineHeight: 1.7,
                              color: C.text,
                            }}
                          >
                            <span style={{ display: "block", marginBottom: 2, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: C.amber }}>
                              Predict before running
                            </span>
                            {parseProse(question)}
                          </div>
                        </div>
                      );
                    }
                    // Default: paragraph
                    return (
                      <p
                        key={i}
                        style={{
                          margin: i === 0 ? 0 : "14px 0 0",
                          fontSize: 15,
                          color: C.text,
                          lineHeight: 1.75,
                        }}
                      >
                        {parseProse(p)}
                      </p>
                    );
                  },
                )}
              </div>
            )}
            {/* Instructions highlight (amber) */}
            {cell.instructions && (
              <div
                style={{
                  margin: "0 22px 14px",
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: C.amberBg,
                  border: `1px solid ${C.amberBd}`,
                  fontSize: 14,
                  color: C.amber,
                  lineHeight: 1.75,
                }}
                className="notebook-instructions"
              >
                {parseProse(cell.instructions)}
              </div>
            )}
          </div>
        )}

        {/* ── typeIt: read-only reference code, editor starts empty ──────── */}
        {cell.typeIt && cell.solution && (
          <ReferenceCodeBlock code={cell.solution} C={C} />
        )}

        {/* ── Fill-in: copyable starter block ─────────────────────────────── */}
        {isFillIn && cell.starterBlock && (
          <div
            style={{
              padding: "10px 16px",
              background: C.blueBg,
              borderBottom: `0.5px solid ${C.blueBd}`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: C.blue,
                }}
              >
                Starter — copy &amp; paste into the cell, then fill in the ___
              </span>
              <button
                onClick={handleCopy}
                style={{
                  fontSize: 11,
                  padding: "2px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                  border: `1px solid ${C.blueBd}`,
                  background: copied ? C.blue : "transparent",
                  color: copied ? "#fff" : C.blue,
                  transition: "all 0.2s",
                }}
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <pre
              style={{
                margin: 0,
                fontFamily: "monospace",
                fontSize: 12.5,
                color: C.blue,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {cell.starterBlock}
            </pre>
          </div>
        )}

        {/* An OpenMAT cell is shown as an embedded OpenMAT (MATLAB-style) notebook. */}
        {cell.lang === "openmat" && !cell.proseOnly && (
          <div style={{ padding: "4px 16px 16px" }}>
            <EmbeddedOpenMat code={cell.code} C={C} />
          </div>
        )}

        {/* A prose-only cell is lesson text: no editor, run button or output. */}
        {!cell.proseOnly && cell.lang !== "openmat" && (<>
        {/* ── Cell header (In [n] label + buttons) ────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 4,
            padding: "5px 10px",
            background: C.surface2,
            borderBottom: `0.5px solid ${C.border}`,
          }}
        >
          <span
            style={{ fontFamily: "monospace", fontSize: 11, color: C.hint }}
          >
            {cell.status === "running" ? (
              <span>
                In [<span style={{ color: C.teal }}>*</span>]
              </span>
            ) : (
              <span>In [{cell.executionCount ?? " "}]</span>
            )}
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            <button
              onClick={() => onRun(cell.id)}
              disabled={isExecuting}
              style={{
                fontSize: 11,
                padding: "3px 10px",
                borderRadius: 6,
                cursor: isExecuting ? "default" : "pointer",
                border: "none",
                background: C.teal,
                color: "#fff",
                opacity: isExecuting ? 0.5 : 1,
              }}
            >
              {cell.status === "running" ? "..." : "▶ Run"}
            </button>
            <button
              onClick={() => onClear(cell.id)}
              style={{
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 6,
                cursor: "pointer",
                border: `0.5px solid ${C.border}`,
                background: "transparent",
                color: C.hint,
              }}
            >
              Clear
            </button>
            <button
              onClick={() => onRemove(cell.id)}
              disabled={isOnlyCell}
              style={{
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 6,
                cursor: isOnlyCell ? "default" : "pointer",
                border: `0.5px solid ${C.border}`,
                background: "transparent",
                color: C.hint,
                opacity: isOnlyCell ? 0.3 : 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Monaco Editor */}
        <Editor
          height={editorHeight}
          beforeMount={setupOpenCalcMonaco}
          defaultLanguage="python"
          theme={monacoTheme || (C.dark ? "open-calc-dark" : "open-calc-light")}
          value={cell.code}
          onChange={(val) => onUpdate(cell.id, val || "")}
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            lineNumbers: "on",
            padding: { top: 10, bottom: 10 },
            automaticLayout: true,
            // Enter must always insert a newline, never silently accept a
            // suggestion — confirmed live: typing a fresh multi-line
            // function (typeIt cells) hit the word-based suggestion widget
            // mid-line, and it ate an Enter meant as a newline, dropping a
            // line without any visible error. Tab still accepts suggestions.
            acceptSuggestionOnEnter: "off",
            scrollbar: {
              vertical: "hidden",
              alwaysConsumeMouseWheel: false,
            },
          }}
          onMount={(editor, monacoInstance) => {
            // Shift+Enter runs this cell. Not editor.addCommand: Monaco keeps those in one
            // registry for every editor on the page, so the last cell mounted would win; and
            // its handler would keep the onRun from mount time, from before Python loaded.
            editor.onKeyDown((e) => {
              if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && e.keyCode === monacoInstance.KeyCode.Enter) {
                e.preventDefault();
                e.stopPropagation();
                // The code straight from the editor: the notebook's copy of it can still be a
                // keystroke or two behind when Shift+Enter follows the typing at once.
                const code = editor.getValue();
                onUpdate(cell.id, code);
                runRef.current(code);
              }
            });
            // Re-apply after mount — see applyPythonIndentRules's comment for
            // why the beforeMount attempt alone loses a race with Monaco's
            // own lazily-loaded Python config.
            applyPythonIndentRules(monacoInstance);
          }}
        />

        {/* Output */}
        <CellOutput cell={cell} C={C} />
        <ExpectedOutput cell={cell} C={C} />

        {/* Hint toggle (challenge cells only) */}
        {isChallenge && cell.hint && (
          <div style={{ borderTop: `0.5px solid ${C.border}` }}>
            <button
              onClick={() => setHintOpen((h) => !h)}
              style={{
                width: "100%",
                padding: "8px 16px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                fontSize: 12,
                color: C.amber,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>{hintOpen ? "▾" : "▸"}</span>
              {hintOpen ? "Hide hint" : "Show hint"}
            </button>
            {hintOpen && (
              <div
                style={{
                  padding: "8px 16px 12px",
                  background: C.amberBg,
                  borderTop: `0.5px solid ${C.amberBd}`,
                  fontSize: 13,
                  color: C.amber,
                  lineHeight: 1.6,
                }}
              >
                {parseProse(cell.hint)}
              </div>
            )}
          </div>
        )}
        </>)}
      </div>
    );
  },
);

// ── Main notebook ─────────────────────────────────────────────────────────────
// Rejoin lines broken inside Python string literals due to real \n in JS template literals.
// Handles single-quoted, double-quoted strings. Skips triple-quoted strings (they're fine).
function fixPythonBrokenStrings(src) {
  const rawLines = src.split(/\r?\n/);
  const out = [];
  let pending = null;
  let strCh = null; // '"' or "'"

  for (const line of rawLines) {
    const working = pending !== null ? pending + "\\n" + line : line;
    let inStr = false, ch = null;
    let i = 0;
    while (i < working.length) {
      const c = working[i];
      if (inStr) {
        if (c === "\\") { i += 2; continue; } // skip escape
        if (c === ch) { inStr = false; ch = null; }
      } else {
        if (c === "#") break; // comment
        // check for triple quote first
        if ((c === '"' || c === "'") && working[i + 1] === c && working[i + 2] === c) {
          // triple-quoted string — find its end (may span actual lines, but those are fine)
          const tripleQ = c + c + c;
          const end = working.indexOf(tripleQ, i + 3);
          if (end !== -1) { i = end + 3; continue; }
          else { i = working.length; break; } // unclosed triple — pass through as-is
        }
        if (c === '"' || c === "'") { inStr = true; ch = c; }
      }
      i++;
    }
    if (inStr) { pending = working; strCh = ch; }
    else { out.push(working); pending = null; strCh = null; }
  }
  if (pending !== null) out.push(pending);
  return out.join("\n");
}

// OpenMAT notebook embedded in a lesson. Loaded on demand, and its cells are
// memoised on the code so re-renders of the lesson keep the cell's output.
const OpenMatNotebookLazy = lazy(() => import("./OpenMatNotebook"));
function EmbeddedOpenMat({ code, C }) {
  const initialCells = useMemo(() => [{ id: 1, cellTitle: "OpenMAT", prose: [], code }], [code]);
  return (
    <Suspense fallback={<div style={{ padding: 12, fontSize: 13, color: C.muted }}>Loading OpenMAT…</div>}>
      <OpenMatNotebookLazy params={{ initialCells }} />
    </Suspense>
  );
}

// "The math" box: lines inside a ::: math block. "- " lines are a list of
// symbols, an "In code:" line bridges to the code, other lines (usually
// display math) are paragraphs.
function MathBox({ text, C, first }) {
  const lines = text.split("\n").slice(1);
  const blocks = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { blocks.push(null); continue; }
    const last = blocks[blocks.length - 1];
    if (line.startsWith("- ")) {
      if (last && last.kind === "list") last.items.push(line.slice(2));
      else blocks.push({ kind: "list", items: [line.slice(2)] });
    } else if (/^in code:/i.test(line)) {
      blocks.push({ kind: "code", text: line.replace(/^in code:\s*/i, "") });
    } else if (last && last.kind === "para") {
      last.text += " " + line;
    } else {
      blocks.push({ kind: "para", text: line });
    }
  }
  return (
    <div
      style={{
        margin: first ? "0 0 4px" : "16px 0 4px",
        padding: "12px 16px 12px",
        borderRadius: 10,
        background: C.purpleBg,
        border: `1px solid ${withAlpha(C.purpleBd, "44")}`,
        borderLeft: `4px solid ${C.purple}`,
        color: C.text,
        fontSize: 15,
        lineHeight: 1.7,
      }}
    >
      <span style={{ display: "block", marginBottom: 4, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: C.purple }}>
        The math
      </span>
      {blocks.filter(Boolean).map((b, j) =>
        b.kind === "list" ? (
          <ul key={j} style={{ margin: "6px 0 0", paddingLeft: 22, listStyleType: "disc" }}>
            {b.items.map((it, k) => (
              <li key={k} style={{ marginBottom: 3 }}>{parseProse(it)}</li>
            ))}
          </ul>
        ) : b.kind === "code" ? (
          <div key={j} style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${withAlpha(C.purpleBd, "55")}`, fontSize: 14 }}>
            <span style={{ fontWeight: 700, color: C.purple }}>In code: </span>
            {parseProse(b.text)}
          </div>
        ) : (
          <div key={j} style={{ marginTop: j === 0 ? 0 : 6 }}>{parseProse(b.text)}</div>
        ),
      )}
    </div>
  );
}

// Inline colours for lesson prose; the values come from CSS variables set on
// the prose container, so they follow the light/dark theme.
const NB_PROSE_CSS = `
.nb-prose strong { color: var(--nb-strong); font-weight: 700; }
.nb-prose li::marker { color: var(--nb-accent); }
.nb-prose p code, .nb-prose li code, .nb-prose div > code {
  color: var(--nb-code); background: var(--nb-code-bg);
  padding: 0.1em 0.35em; border-radius: 4px; font-size: 0.88em;
}
`;

export default function PythonNotebook({ params, onParamChange, onCellsChange }) {
  const C = useThemeColors();
  const { themeStyles } = useGlobalTheme();
  const monacoTheme = themeStyles?.monaco || (C.dark ? "open-calc-dark" : "open-calc-light");
  const [pyodide, setPyodide] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  // Use initialCells from params if provided, otherwise fallback to STARTER_CELLS
  const disableRunAll = params?.disableRunAll ?? false;
  // Code written as real notebook text (Notebook Lab) runs exactly as typed.
  // Lesson cells authored in JS template literals need their broken strings
  // rejoined first (see fixPythonBrokenStrings).
  const rawCode = params?.rawCode ?? false;
  const prepare = rawCode ? (src) => src : fixPythonBrokenStrings;
  const normalizeCells = (raw) =>
    (raw || STARTER_CELLS).map((c, i) =>
      c.id != null ? c : { ...c, id: `cell-${i + 1}`, output: c.output ?? '', status: c.status ?? 'idle', figureJson: c.figureJson ?? null }
    );
  const initialCells = normalizeCells(params?.initialCells);
  const [cells, setCells] = useState(initialCells);
  const [isExecuting, setIsExecuting] = useState(false);
  // In the desktop app, cells can run on the learner's own Python (desktop/app/runtimes/
  // notebook-kernel.cjs) instead of Pyodide: for TensorFlow, gymnasium, long training runs
  // and their own files. The choice is remembered.
  const desktopKernel = typeof window !== "undefined" ? window.openCalcDesktop?.kernel : undefined;
  const [runLocal, setRunLocal] = useState(() => {
    try { return !!desktopKernel && localStorage.getItem("notebook-run-local") === "1"; } catch { return false; }
  });
  const [kernelInfo, setKernelInfo] = useState(null);
  const refreshKernelInfo = useCallback(async () => {
    if (desktopKernel) setKernelInfo(await desktopKernel.status());
  }, [desktopKernel]);
  useEffect(() => { if (runLocal) refreshKernelInfo(); }, [runLocal, refreshKernelInfo]);
  // The app's own notebook environment (numpy ... TensorFlow, in a private virtual environment):
  // set up automatically the first time "this computer" is chosen, with its log shown here.
  const [setupLog, setupLogSet] = useState("");
  const [setupBusy, setSetupBusy] = useState(false);
  const [setupError, setSetupError] = useState(null);
  const setupTried = useRef(false);
  const setupEnvironment = useCallback(async () => {
    if (!desktopKernel?.setupEnvironment) return;
    setSetupBusy(true);
    setSetupError(null);
    setupLogSet("");
    const stop = desktopKernel.onOutput((msg) => {
      if (msg.type === "setup") setupLogSet((log) => (log + msg.text).slice(-20000));
    });
    try {
      const result = await desktopKernel.setupEnvironment();
      if (!result?.ok) setSetupError(result?.reason ?? "The setup did not finish.");
    } catch (err) {
      setSetupError(err.message);
    } finally {
      stop();
      setSetupBusy(false);
      refreshKernelInfo();
    }
  }, [desktopKernel, refreshKernelInfo]);
  useEffect(() => {
    if (!runLocal || !kernelInfo || setupTried.current) return;
    if (kernelInfo.env && !kernelInfo.env.ready && !kernelInfo.env.installing && !kernelInfo.python?.chosen) {
      setupTried.current = true;
      setupEnvironment();
    }
  }, [runLocal, kernelInfo, setupEnvironment]);
  const chooseRunLocal = (local) => {
    setRunLocal(local);
    try { localStorage.setItem("notebook-run-local", local ? "1" : "0"); } catch { /* private window */ }
  };
  const execCounterRef = useRef(0); // global execution counter — increments each time any cell runs

  // ── Uploaded data files ─────────────────────────────────────────────────
  // Written straight into Pyodide's in-memory virtual filesystem, so
  // pd.read_csv/read_excel etc. can open them by path like any local file —
  // nothing ever leaves the browser.
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadError, setUploadError] = useState(null);
  const dataFileInputRef = useRef(null);
  const UPLOAD_DIR = "/home/pyodide/uploads";

  // Update cells if params.initialCells changes (mostly for HMR or switching lessons)
  useEffect(() => {
    if (params?.initialCells) {
      setCells(normalizeCells(params.initialCells));
    }
  }, [params?.initialCells]);

  // Report edits, run results and test outcomes to a host that persists them
  // (Notebook Lab). Skips the first render so opening a notebook isn't a save,
  // and skips while a cell is mid-run so a half-finished state isn't stored.
  const onCellsChangeRef = useRef(onCellsChange);
  onCellsChangeRef.current = onCellsChange;
  const cellsReportedRef = useRef(false);
  useEffect(() => {
    if (!cellsReportedRef.current) { cellsReportedRef.current = true; return; }
    if (cells.some((c) => c.status === "running")) return;
    onCellsChangeRef.current?.(cells);
  }, [cells]);

  // ── Load Pyodide via Singleton ─────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const py = await getPyodide();
        if (mounted) {
          setPyodide(py);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          console.error("Pyodide init failed:", err);
          setLoadError(err.message);
          setIsLoading(false);
        }
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, []);

  // ── Run a cell ─────────────────────────────────────────────────────────────
  // A cell on the learner's own Python: output appears as it is printed (a training loop's
  // progress), and plots come back as images. Results show the same way as a Pyodide run.
  const runCellLocal = useCallback(
    async (cellId, codeNow) => {
      if (isExecuting || !desktopKernel) return;
      const found = cells.find((c) => c.id === cellId);
      if (!found) return;
      const cell = codeNow == null ? found : { ...found, code: codeNow };
      setIsExecuting(true);
      setCells((prev) => prev.map((c) => (c.id === cellId ? { ...c, status: "running", output: "", figureJson: null, matplotlibImages: [] } : c)));
      let streamed = "";
      const stop = desktopKernel.onOutput((msg) => {
        if (msg.type !== "stream") return;
        streamed += msg.text;
        const now = terminalText(streamed);
        setCells((prev) => prev.map((c) => (c.id === cellId ? { ...c, output: now } : c)));
      });
      const textOf = (messages, type) => messages.filter((m) => m.type === type).map((m) => m.text).join("");
      try {
        const run = await desktopKernel.run(cell.code);
        if (!run.ok) throw new Error(run.reason);
        const printed = terminalText(textOf(run.messages, "stream"));
        const error = textOf(run.messages, "error");
        const result = textOf(run.messages, "result");
        const images = run.messages.filter((m) => m.type === "figure").map((m) => `data:image/png;base64,${m.png}`);
        let testFeedback = null;
        if (!error && cell.testCode) {
          // The same names a Pyodide run gives the test: what the cell printed, and its code.
          await desktopKernel.run(`_stdout = ${JSON.stringify(printed)}\n_source = ${JSON.stringify(cell.code)}`);
          const test = await desktopKernel.run(cell.testCode);
          const testError = test.ok ? textOf(test.messages, "error") : test.reason;
          const said = test.ok ? textOf(test.messages, "result") : "";
          const success = !testError && (said === "true" || said.includes("SUCCESS"));
          testFeedback = {
            success,
            message: testError
              ? tracebackHeadline(testError).replace(/^AssertionError:?\s*/, "") || "The test failed. Try again!"
              : said && said !== "true" && said !== "false" ? said.replace("SUCCESS:", "").trim()
              : success ? "Great job! Your code passed the test." : "The test failed. Try again!",
          };
        }
        execCounterRef.current += 1;
        const count = execCounterRef.current;
        setCells((prev) => prev.map((c) => (c.id === cellId ? {
          ...c,
          status: error ? "error" : "idle",
          executionCount: error ? c.executionCount : count,
          output: error ? [printed.trimEnd(), error].filter(Boolean).join("\n") : [printed.trimEnd(), result].filter(Boolean).join("\n"),
          printedBeforeError: error ? printed.trimEnd() : undefined,
          matplotlibImages: images,
          testResult: testFeedback,
        } : c)));
      } catch (err) {
        setCells((prev) => prev.map((c) => (c.id === cellId ? { ...c, status: "error", output: `Could not run on this computer: ${err.message}` } : c)));
      } finally {
        stop();
        setIsExecuting(false);
        refreshKernelInfo();
      }
    },
    [cells, isExecuting, desktopKernel, refreshKernelInfo],
  );

  // codeNow: the cell's code, when the caller has it fresher than the notebook's state
  // (Shift+Enter reads it from the editor).
  const runCell = useCallback(
    async (cellId, codeNow) => {
      // OpenMAT cells run inside their embedded OpenMAT notebook, not here.
      if (cells.find((c) => c.id === cellId)?.lang === "openmat") return;
      if (runLocal && desktopKernel) return runCellLocal(cellId, codeNow);
      if (!pyodide || isExecuting) return;
      // Python runs on the page's thread, so code that never finishes freezes
      // the tab before React renders again. Hand the host the current cells
      // now, so it can save them before the run starts.
      onCellsChangeRef.current?.(cells, { beforeRun: true });
      setIsExecuting(true);
      setCells((prev) =>
        prev.map((c) =>
          c.id === cellId
            ? { ...c, status: "running", output: "", figureJson: null, matplotlibImages: [] }
            : c,
        ),
      );

      const found = cells.find((c) => c.id === cellId);
      const cell = codeNow == null ? found : { ...found, code: codeNow };
      let textOutput = "";

      // Capture stdout and stderr exactly as written. Python keeps text that
      // does not end in a new line (print(x, end=" ")) in its own buffer, so
      // flushOutput pushes it out after each run; the "batched" handler would
      // drop it until some later line ended.
      const decoder = new TextDecoder();
      const capture = {
        write: (buf) => {
          textOutput += decoder.decode(buf, { stream: true });
          return buf.length;
        },
      };
      pyodide.setStdout(capture);
      pyodide.setStderr(capture);
      const flushOutput = async () => {
        try {
          await pyodide.runPythonAsync("__import__('sys').stdout.flush(); __import__('sys').stderr.flush()");
        } catch { /* nothing to flush */ }
      };

      try {
        // 1. Run user code — preprocess to rejoin lines where a real newline was
        // embedded inside a string literal (happens with \n in JS template literals).
        const userCode = prepare(cell.code);
        let result;
        try {
          result = await pyodide.runPythonAsync(userCode);
        } finally {
          await flushOutput();
        }

        let testFeedback = null;

        // Inject last expression result as `_` so test code can reference it
        // (mirrors Python REPL behaviour where _ holds the last expression value)
        try {
          pyodide.globals.set('_', result ?? null);
        } catch { /* ignore if result is not a transferable type */ }

        // 2. Run test code if provided. Tests can also read what the cell
        // printed (`_stdout`) and its source (`_source`), so a challenge can
        // check output, not only the values it leaves behind.
        if (cell.testCode) {
          try {
            pyodide.globals.set('_stdout', textOutput);
            pyodide.globals.set('_source', cell.code);
            const testResult = await pyodide.runPythonAsync(prepare(cell.testCode));
            await flushOutput();
            // Look for 'SUCCESS' or True
            const isSuccess =
              testResult === true ||
              (typeof testResult === "string" &&
                testResult.includes("SUCCESS"));
            testFeedback = {
              success: isSuccess,
              message:
                typeof testResult === "string"
                  ? testResult.replace("SUCCESS:", "").trim()
                  : isSuccess
                    ? "Great job! Your code passed the test."
                    : "The test failed. Try again!",
            };
          } catch (testErr) {
            // Show the assertion's own message (the traceback's last line),
            // not the whole Pyodide traceback.
            testFeedback = {
              success: false,
              message: tracebackHeadline(String(testErr.message)).replace(/^AssertionError:?\s*/, "") || "The test failed. Try again!",
            };
          }
        }

        // Check if the return value is an opencalc figure
        const resultStr =
          result !== undefined && result !== null ? String(result) : "";
        const isFigure = isFigureOutput(resultStr);
        // A figure can also be printed — print(fig.show()) is used in lessons and taught in the
        // Help guide. Without this the printed figure appeared as a wall of raw JSON. The cell has
        // one figure slot: the returned figure wins, otherwise the last printed one is drawn and
        // its line removed from the text output.
        let printedFigure = null;
        if (!isFigure) {
          const lines = textOutput.split("\n");
          const idx = lines.map((l) => isFigureOutput(l)).lastIndexOf(true);
          if (idx !== -1) {
            printedFigure = lines[idx].trim();
            lines.splice(idx, 1);
            textOutput = lines.join("\n");
          }
        }

        // Capture any matplotlib figures rendered during the cell run
        let matplotlibImages = [];
        try {
          const proxy = await pyodide.runPythonAsync('_capture_matplotlib_figs()');
          if (proxy && proxy.toJs) {
            matplotlibImages = proxy.toJs({ create_proxies: false }) ?? [];
            proxy.destroy?.();
          }
        } catch { /* ignore if helper not available */ }

        execCounterRef.current += 1;
        setCells((prev) =>
          prev.map((c) =>
            c.id === cellId
              ? {
                  ...c,
                  status: "idle",
                  executionCount: execCounterRef.current,
                  output:
                    // Printed/warned text and the last expression's value are
                    // independent — a warning (e.g. pandas' pyarrow
                    // DeprecationWarning on every read_csv) must not hide the
                    // actual result, like a trailing df.head().
                    [textOutput.trimEnd(), !isFigure && resultStr ? resultStr : ""]
                      .filter(Boolean)
                      .join("\n"),
                  figureJson: isFigure ? resultStr : printedFigure,
                  matplotlibImages,
                  testResult: testFeedback,
                }
              : c,
          ),
        );
      } catch (err) {
        setCells((prev) =>
          prev.map((c) =>
            c.id === cellId
              ? {
                  ...c,
                  status: "error",
                  output:
                    (textOutput ? textOutput + "\n" : "") +
                    "Error: " +
                    err.message,
                  // What the cell printed before it failed, shown above the error.
                  printedBeforeError: textOutput.trimEnd(),
                  figureJson: null,
                  matplotlibImages: [],
                }
              : c,
          ),
        );
      } finally {
        setIsExecuting(false);
      }
    },
    [pyodide, cells, isExecuting, rawCode, runLocal, desktopKernel, runCellLocal],
  );

  // ── Run all cells in order ─────────────────────────────────────────────────
  // Challenge cells hold unfinished starter code, so Run All skips them;
  // learners run each challenge themselves once they have written it.
  const runAll = useCallback(async () => {
    for (const cell of cells.filter((c) => !c.challengeType && !c.proseOnly && c.lang !== "openmat")) {
      await new Promise((resolve) => {
        // Small delay between cells so state updates render
        setTimeout(resolve, 50);
      });
      await runCell(cell.id);
    }
  }, [cells, runCell]);

  // ── Reset variables (a notebook "restart") ────────────────────────────────
  // All notebooks on a page share one Pyodide kernel, so this clears every
  // name learners defined anywhere in it, then resets this notebook's outputs
  // and execution counts so the next run starts from a known-empty state.
  const resetVariables = useCallback(async () => {
    if (isExecuting) return;
    if (runLocal && desktopKernel) {
      await desktopKernel.restart();
      refreshKernelInfo();
    } else {
      if (!pyodide) return;
      await pyodide.runPythonAsync(
        "(lambda g: [g.pop(n) for n in [n for n in list(g) if n not in g.get('_oc_base_names', g)]])(globals())",
      );
    }
    execCounterRef.current = 0;
    setCells((prev) =>
      prev.map((c) => ({ ...c, output: "", status: "idle", figureJson: null, matplotlibImages: [], executionCount: undefined, testResult: null })),
    );
  }, [pyodide, isExecuting, runLocal, desktopKernel, refreshKernelInfo]);

  const addCell = () => {
    const newId =
      cells.length > 0 ? Math.max(...cells.map((c) => c.id)) + 1 : 1;
    setCells([
      ...cells,
      {
        id: newId,
        code: "# New cell\n",
        output: "",
        status: "idle",
        figureJson: null,
        matplotlibImages: [],
      },
    ]);
  };

  const updateCode = (id, code) =>
    setCells((prev) => prev.map((c) => (c.id === id ? { ...c, code } : c)));

  const addCellWithCode = (code) => {
    const newId = cells.length > 0 ? Math.max(...cells.map((c) => c.id)) + 1 : 1;
    setCells([
      ...cells,
      { id: newId, code, output: "", status: "idle", figureJson: null, matplotlibImages: [] },
    ]);
  };

  const loadSnippetFor = (name, ext) => {
    const path = `${UPLOAD_DIR}/${name}`;
    if (ext === "xlsx" || ext === "xls") {
      return `import pandas as pd\ndf = pd.read_excel("${path}")\ndf.head()`;
    }
    if (ext === "json") {
      return `import pandas as pd\ndf = pd.read_json("${path}")\ndf.head()`;
    }
    if (ext === "tsv") {
      return `import pandas as pd\ndf = pd.read_csv("${path}", sep="\\t")\ndf.head()`;
    }
    if (ext === "csv") {
      return `import pandas as pd\ndf = pd.read_csv("${path}")\ndf.head()`;
    }
    return `with open("${path}") as f:\n    text = f.read()\ntext[:500]`;
  };

  const handleDataFileUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !pyodide) return;
    setUploadError(null);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      try {
        pyodide.FS.mkdirTree(UPLOAD_DIR);
      } catch { /* already exists */ }
      if (ext === "xls") {
        // Legacy .xls — xlrd is a built Pyodide package, no micropip needed.
        await pyodide.loadPackage("xlrd");
      } else if (ext === "xlsx") {
        // openpyxl isn't in Pyodide's own built package set, but it's pure
        // Python, so micropip can pull the wheel straight from PyPI.
        await pyodide.loadPackage("micropip");
        const micropip = pyodide.pyimport("micropip");
        await micropip.install("openpyxl");
      }
      pyodide.FS.writeFile(`${UPLOAD_DIR}/${file.name}`, buf);
      setUploadedFiles((prev) => [
        ...prev.filter((f) => f.name !== file.name),
        { name: file.name, ext, size: file.size },
      ]);
    } catch (err) {
      setUploadError(`Could not load "${file.name}": ${err.message}`);
    }
  };

  const removeCell = (id) => {
    if (cells.length > 1) setCells((prev) => prev.filter((c) => c.id !== id));
  };

  const clearOutput = (id) =>
    setCells((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, output: "", figureJson: null, matplotlibImages: [] } : c,
      ),
    );

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 60,
          gap: 16,
          fontFamily: "sans-serif",
        }}
      >
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            borderWidth: 3,
            borderStyle: "solid",
            borderRightColor: C.teal,
            borderBottomColor: C.teal,
            borderLeftColor: C.teal,
            borderTopColor: "transparent",
            animation: "spin 1s linear infinite",
          }}
        />
        <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>
          Loading Python runtime...
        </div>
        <div style={{ fontSize: 12, color: C.hint }}>
          Downloading Pyodide (WebAssembly) — first load takes ~10s
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ padding: 24, fontFamily: "sans-serif" }}>
        <div
          style={{
            background: C.redBg,
            border: `1px solid ${C.redBd}`,
            borderRadius: 10,
            padding: "12px 16px",
            color: C.red,
          }}
        >
          <div style={{ fontWeight: 500, marginBottom: 4 }}>
            Failed to load Python runtime
          </div>
          <div style={{ fontSize: 12 }}>{loadError}</div>
        </div>
      </div>
    );
  }

  // ── Main UI ────────────────────────────────────────────────────────────────
  return (
    <div
      className="px-0 sm:px-3 py-3"
      style={{
        width: "100%",
        fontFamily: "sans-serif",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          padding: "4px 4px 12px",
          marginBottom: 8,
          borderBottom: `0.5px solid ${C.border}`,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: C.text,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                background: C.teal,
                borderRadius: 6,
                padding: "3px 7px",
                fontSize: 12,
                color: "#fff",
              }}
            >
              {"<>"}
            </span>
            Python Notebook
          </div>
          <div style={{ fontSize: 11, color: C.hint, marginTop: 2 }}>
            Python 3.x · WebAssembly · opencalc visualisation library loaded
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <button
            onClick={() => setShowHelp(!showHelp)}
            style={{
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 8,
              cursor: "pointer",
              border: `0.5px solid ${showHelp ? C.teal : C.border}`,
              background: showHelp ? C.tealBg : "transparent",
              color: showHelp ? C.teal : C.muted,
              transition: "all 0.2s",
            }}
          >
            {showHelp ? "✕ Close Help" : "Help & API"}
          </button>
          {!disableRunAll && (
            <button
              onClick={runAll}
              disabled={isExecuting}
              title="Runs every cell in order, except challenge cells"
              style={{
                fontSize: 12,
                padding: "6px 10px",
                borderRadius: 8,
                cursor: "pointer",
                border: "none",
                background: C.teal,
                color: "#fff",
                opacity: isExecuting ? 0.5 : 1,
              }}
            >
              ▶ Run all
            </button>
          )}
          {desktopKernel && runLocal && (setupBusy || setupError || (kernelInfo?.env && !kernelInfo.env.ready && !kernelInfo.python?.chosen)) && (
            <div style={{ flexBasis: "100%", order: 99, marginTop: 4, padding: "8px 10px", borderRadius: 8, border: `0.5px solid ${setupError ? C.amberBd : C.border}`, background: C.surface2, fontSize: 12, color: C.text, lineHeight: 1.5 }}>
              <div>
                {setupBusy ? "Setting up this computer's notebook environment: " : "This computer's notebook environment is not set up yet: "}
                {(kernelInfo?.env?.packages ?? []).join(", ")}, in a private Python environment (about 1 GB to download; a few minutes).
                {" "}Until it is ready, cells run on {kernelInfo?.python ? `your Python ${kernelInfo.python.version}` : "your Python"}.
              </div>
              {setupError && <div style={{ color: C.amber, marginTop: 4 }}>{setupError}</div>}
              {!setupBusy && (
                <button
                  onClick={setupEnvironment}
                  style={{ marginTop: 6, fontSize: 12, padding: "4px 10px", borderRadius: 8, cursor: "pointer", border: `0.5px solid ${C.border}`, background: "transparent", color: C.text }}
                >
                  {setupError ? "Try again" : "Set it up"}
                </button>
              )}
              {setupLog && (
                <pre style={{ margin: "6px 0 0", maxHeight: 160, overflow: "auto", fontSize: 11, color: C.muted, whiteSpace: "pre-wrap" }}>
                  {terminalText(setupLog).split("\n").slice(-12).join("\n")}
                </pre>
              )}
            </div>
          )}
          {desktopKernel && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: C.muted }}>
              Runs on
              <select
                value={runLocal ? "local" : "browser"}
                onChange={(e) => chooseRunLocal(e.target.value === "local")}
                disabled={isExecuting}
                title="The browser's Python (Pyodide) runs anywhere; your computer's Python has your installed packages (TensorFlow, gymnasium) and your files"
                style={{ fontSize: 12, padding: "5px 6px", borderRadius: 8, border: `0.5px solid ${C.border}`, background: "transparent", color: C.text }}
              >
                <option value="browser">this page (Pyodide)</option>
                <option value="local">this computer</option>
              </select>
              {runLocal && kernelInfo && (
                <>
                  <span
                    title={`Python: ${kernelInfo.python?.exe ?? "none found"}\nFolder: ${kernelInfo.cwd}\nImports and open() find files in the folder.`}
                    style={{ fontSize: 11, color: kernelInfo.python ? C.muted : C.amber }}
                  >
                    {kernelInfo.python ? `Python ${kernelInfo.python.version}` : "no Python found"} · {String(kernelInfo.cwd ?? "").split(/[\\/]/).pop()}
                  </span>
                  <button
                    onClick={async () => { await desktopKernel.chooseFolder(); refreshKernelInfo(); }}
                    disabled={isExecuting}
                    title="Choose the folder the cells run in (restarts Python)"
                    style={{ fontSize: 11, padding: "4px 8px", borderRadius: 8, cursor: "pointer", border: `0.5px solid ${C.border}`, background: "transparent", color: C.muted }}
                  >
                    Folder…
                  </button>
                  <button
                    onClick={async () => { await desktopKernel.choosePython(); refreshKernelInfo(); }}
                    disabled={isExecuting}
                    title="Choose which python.exe runs the cells, e.g. a virtual environment with TensorFlow (restarts Python)"
                    style={{ fontSize: 11, padding: "4px 8px", borderRadius: 8, cursor: "pointer", border: `0.5px solid ${C.border}`, background: "transparent", color: C.muted }}
                  >
                    Python…
                  </button>
                  {kernelInfo.env?.ready && !kernelInfo.python?.chosen && !setupBusy && (
                    <button
                      onClick={setupEnvironment}
                      disabled={isExecuting}
                      title="Install the notebook packages again, or update them"
                      style={{ fontSize: 11, padding: "4px 8px", borderRadius: 8, cursor: "pointer", border: `0.5px solid ${C.border}`, background: "transparent", color: C.muted }}
                    >
                      Reinstall packages
                    </button>
                  )}
                  {kernelInfo.python?.chosen && (
                    <button
                      onClick={async () => { await desktopKernel.useSystemPython(); refreshKernelInfo(); }}
                      disabled={isExecuting}
                      title="Go back to the Python on PATH"
                      style={{ fontSize: 11, padding: "4px 8px", borderRadius: 8, cursor: "pointer", border: `0.5px solid ${C.border}`, background: "transparent", color: C.muted }}
                    >
                      Use PATH Python
                    </button>
                  )}
                </>
              )}
            </span>
          )}
          <button
            onClick={resetVariables}
            disabled={isExecuting}
            title="Clears every variable defined in this page's Python session, like restarting a Jupyter kernel"
            style={{
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 8,
              cursor: "pointer",
              border: `0.5px solid ${C.border}`,
              background: "transparent",
              color: C.muted,
              opacity: isExecuting ? 0.5 : 1,
            }}
          >
            ↺ Reset variables
          </button>
          <button
            onClick={addCell}
            style={{
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 8,
              cursor: "pointer",
              border: `0.5px solid ${C.border}`,
              background: "transparent",
              color: C.muted,
            }}
          >
            + Add cell
          </button>
          <button
            onClick={() => dataFileInputRef.current?.click()}
            title="Upload a CSV, Excel, JSON, or text file to use in your code"
            style={{
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 8,
              cursor: "pointer",
              border: `0.5px solid ${C.border}`,
              background: "transparent",
              color: C.muted,
            }}
          >
            ⇧ Upload data
          </button>
          <input
            ref={dataFileInputRef}
            type="file"
            accept=".csv,.tsv,.xlsx,.xls,.json,.txt"
            style={{ display: "none" }}
            onChange={handleDataFileUpload}
          />
        </div>
      </div>

      {/* Uploaded data files */}
      {(uploadedFiles.length > 0 || uploadError) && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 6,
            padding: "8px 4px",
            marginBottom: 8,
            marginTop: -4,
          }}
        >
          <span style={{ fontSize: 11, color: C.hint, marginRight: 2 }}>Files:</span>
          {uploadedFiles.map((f) => (
            <button
              key={f.name}
              onClick={() => addCellWithCode(loadSnippetFor(f.name, f.ext))}
              title={`Insert a cell that loads ${f.name} (${UPLOAD_DIR}/${f.name})`}
              style={{
                fontSize: 11,
                padding: "4px 8px",
                borderRadius: 999,
                cursor: "pointer",
                border: `0.5px solid ${C.tealBd}`,
                background: C.tealBg,
                color: C.teal,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              📄 {f.name} <span style={{ opacity: 0.7 }}>+ insert load code</span>
            </button>
          ))}
          {uploadError && (
            <span style={{ fontSize: 11, color: C.red }}>{uploadError}</span>
          )}
        </div>
      )}

      {/* API Help Panel */}
      {showHelp && (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.tealBd}`,
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
            animation: "fadeIn 0.3s ease-out",
            boxShadow: "0 10px 25px -5px rgba(45,212,191,0.1)",
          }}
        >
          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: C.teal,
              marginBottom: 16,
            }}
          >
            opencalc Visualization Library
          </h3>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}
          >
            <div>
              <h4
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.text,
                  marginBottom: 8,
                }}
              >
                The Figure Engine
              </h4>
              <p
                style={{
                  fontSize: 12,
                  color: C.muted,
                  lineHeight: 1.5,
                  marginBottom: 12,
                }}
              >
                Create a <code>Figure</code> object and chain methods to draw.
                End with <code>.show()</code>.
              </p>
              <pre
                style={{
                  fontSize: 11,
                  background: C.surface2,
                  padding: 12,
                  borderRadius: 8,
                  color: C.blue,
                  border: `0.5px solid ${C.border}`,
                  overflowX: "auto",
                }}
              >
                {`from opencalc import Figure
fig = Figure(xmin=-5, xmax=5)
fig.grid().axes()
fig.plot(lambda x: x**2, color='teal')
fig.point([2, 4], label="(2,4)")
fig.show()`}
              </pre>
            </div>
            <div style={{ fontSize: 12, color: C.text }}>
              <h4
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.text,
                  marginBottom: 8,
                }}
              >
                Common Methods
              </h4>
              <ul style={{ paddingLeft: 16, spaceY: 6, color: C.muted }}>
                <li>
                  <code>.grid(step=1)</code>: Draw a background grid
                </li>
                <li>
                  <code>.axes()</code>: Draw X/Y coordinate axes
                </li>
                <li>
                  <code>.vector([x,y], origin=[0,0])</code>: Draw an arrow
                </li>
                <li>
                  <code>.plot(fn, color='blue')</code>: Plot math functions
                </li>
                <li>
                  <code>.parametric(xfn, yfn, steps=300)</code>: Parametric
                  curves
                </li>
                <li>
                  <code>.riemann(fn, a, b, n=10)</code>: Draw integral rects
                </li>
                <li>
                  <code>.transformed_grid(matrix)</code>: Linear transformations
                </li>
              </ul>
              <h4
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.text,
                  marginTop: 16,
                  marginBottom: 8,
                }}
              >
                Quick Helpers
              </h4>
              <p style={{ fontSize: 11, color: C.muted }}>
                <code>quick_plot(fn)</code>
                <br />
                <code>quick_vectors(v1, v2, ...)</code>
                <br />
                <code>quick_transform(matrix, vector=v)</code>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cells */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {cells.map((cell) => (
          <CellComponent
            key={cell.id}
            cell={cell}
            C={C}
            monacoTheme={monacoTheme}
            onRun={runCell}
            onClear={clearOutput}
            onRemove={removeCell}
            onUpdate={updateCode}
            isExecuting={isExecuting}
            isOnlyCell={cells.length <= 1}
          />
        ))}
      </div>

      {/* Add cell button */}
      <button
        onClick={addCell}
        style={{
          width: "100%",
          marginTop: 12,
          padding: 16,
          border: `1.5px dashed ${C.border}`,
          borderRadius: 12,
          background: "transparent",
          color: C.hint,
          fontSize: 13,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        + Add cell
      </button>

      {/* Footer */}
      <div
        style={{
          marginTop: 24,
          paddingTop: 16,
          borderTop: `0.5px solid ${C.border}`,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 12, color: C.hint, marginBottom: 8 }}>
          All cells share a single Python kernel. Variables persist between
          cells.
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 12,
            fontSize: 11,
            color: C.hint,
          }}
        >
          {[
            "Python 3.11+",
            "WebAssembly",
            "opencalc viz library",
            "Shift+Enter to run",
          ].map((t) => (
            <span
              key={t}
              style={{ display: "flex", alignItems: "center", gap: 4 }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: C.teal,
                  display: "inline-block",
                }}
              />
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
