// PythonNotebook.jsx
// Interactive Python notebook with Pyodide + Monaco Editor.
// Detects opencalc Figure output and renders it via FigureRenderer.
// Drop-in replacement for the provided PythonNotebook component.

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Editor from "@monaco-editor/react";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-python";
import FigureRenderer from "./FigureRenderer";
import { parseProse } from "../math/parseProse.jsx";
import { setupOpenCalcMonaco, applyPythonIndentRules } from "../../utils/monacoThemes.js";
import { OPENCALC_LIB_SOURCE } from "./opencalcLibSource.js";
import { useReportBug } from "../../hooks/useReportBug.js";

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

// ── CellOutput ────────────────────────────────────────────────────────────────
function CellOutput({ cell, C }) {
  const hasMatplotlib = cell.matplotlibImages && cell.matplotlibImages.length > 0;
  const { submit: submitReport, submitting: reportSubmitting, canSubmit: canReport } = useReportBug();
  const [reportStatus, setReportStatus] = useState('idle'); // idle | done | error
  if (!cell.output && !cell.figureJson && !hasMatplotlib) return null;

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
          <p style={{ margin: "0 0 6px", fontFamily: "monospace", fontSize: 13, lineHeight: 1.6, color: C.red, fontWeight: 600, wordBreak: "break-word" }}>
            {tracebackHeadline(cell.output)}
          </p>
          <details>
            <summary style={{ fontSize: 11, color: C.hint, cursor: "pointer" }}>Show full traceback</summary>
            <pre style={{ margin: "6px 0 0", fontFamily: "monospace", fontSize: 12, lineHeight: 1.5, color: C.red, opacity: 0.85, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {cell.output}
            </pre>
          </details>
          {reportStatus === "done" ? (
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
    // 1. Load the script strictly once
    if (!window.loadPyodide) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js";
        script.onload = resolve;
        script.onerror = () => reject(new Error("Failed to load Pyodide CDN"));
        document.head.appendChild(script);
      });
    }

    // 2. Initialize
    const py = await window.loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/",
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
    return py;
  })();

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
                  fontSize: 13,
                  color: C.muted,
                  lineHeight: 1.65,
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
                      ? "6px 16px 10px"
                      : "10px 16px 10px",
                }}
              >
                {(Array.isArray(cell.prose) ? cell.prose : [cell.prose]).map(
                  (p, i) => {
                    // ## Header line
                    if (typeof p === "string" && p.startsWith("## ")) {
                      return (
                        <p
                          key={i}
                          style={{
                            margin: i === 0 ? "0 0 4px" : "14px 0 4px",
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            color: C.blue,
                            lineHeight: 1.4,
                            paddingLeft: 8,
                            borderLeft: `2px solid ${C.blue}`,
                          }}
                        >
                          {p.slice(3)}
                        </p>
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
                      return (
                        <div
                          key={i}
                          style={{
                            margin: i === 0 ? "0 0 4px" : "8px 0 0",
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
                              padding: "10px 12px",
                              fontSize: 12,
                              lineHeight: 1.6,
                              overflowX: "auto",
                              background: C.bg,
                              color: C.text,
                              fontFamily: "monospace",
                            }}
                          >
                            <code>{inner}</code>
                          </pre>
                        </div>
                      );
                    }
                    // - Bullet list: string with lines starting with "- "
                    if (
                      typeof p === "string" &&
                      p.trimStart().startsWith("- ")
                    ) {
                      const items = p
                        .split("\n")
                        .filter((l) => l.trim().startsWith("- "));
                      return (
                        <ul
                          key={i}
                          style={{
                            margin: i === 0 ? 0 : "6px 0 0",
                            paddingLeft: 18,
                            fontSize: 13,
                            color: C.text,
                            lineHeight: 1.7,
                            listStyleType: "disc",
                          }}
                        >
                          {items.map((item, j) => (
                            <li
                              key={j}
                              style={{
                                marginBottom: j < items.length - 1 ? 3 : 0,
                              }}
                            >
                              {parseProse(item.replace(/^[\s]*-\s*/, ""))}
                            </li>
                          ))}
                        </ul>
                      );
                    }
                    // Default: paragraph
                    return (
                      <p
                        key={i}
                        style={{
                          margin: i === 0 ? 0 : "8px 0 0",
                          fontSize: 13,
                          color: C.text,
                          lineHeight: 1.7,
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
                  margin: "0 16px 12px",
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: C.amberBg,
                  border: `1px solid ${C.amberBd}`,
                  fontSize: 12,
                  color: C.amber,
                  lineHeight: 1.65,
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
            // monaco.KeyMod.Shift | monaco.KeyCode.Enter = 1024 | 3
            // We use the numerical constants to avoid referencing a global 'monaco' object
            // which might not be in scope. Shift=1024, Enter=3
            editor.addCommand(1024 | 3, () => onRun(cell.id));
            // Re-apply after mount — see applyPythonIndentRules's comment for
            // why the beforeMount attempt alone loses a race with Monaco's
            // own lazily-loaded Python config.
            applyPythonIndentRules(monacoInstance);
          }}
        />

        {/* Output */}
        <CellOutput cell={cell} C={C} />

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
                {cell.hint}
              </div>
            )}
          </div>
        )}
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

export default function PythonNotebook({ params, onParamChange }) {
  const C = useThemeColors();
  const { themeStyles } = useGlobalTheme();
  const monacoTheme = themeStyles?.monaco || (C.dark ? "open-calc-dark" : "open-calc-light");
  const [pyodide, setPyodide] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  // Use initialCells from params if provided, otherwise fallback to STARTER_CELLS
  const disableRunAll = params?.disableRunAll ?? false;
  const normalizeCells = (raw) =>
    (raw || STARTER_CELLS).map((c, i) =>
      c.id != null ? c : { ...c, id: `cell-${i + 1}`, output: c.output ?? '', status: c.status ?? 'idle', figureJson: c.figureJson ?? null }
    );
  const initialCells = normalizeCells(params?.initialCells);
  const [cells, setCells] = useState(initialCells);
  const [isExecuting, setIsExecuting] = useState(false);
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
  const runCell = useCallback(
    async (cellId) => {
      if (!pyodide || isExecuting) return;
      setIsExecuting(true);
      setCells((prev) =>
        prev.map((c) =>
          c.id === cellId
            ? { ...c, status: "running", output: "", figureJson: null, matplotlibImages: [] }
            : c,
        ),
      );

      const cell = cells.find((c) => c.id === cellId);
      let textOutput = "";

      // Capture stdout
      pyodide.setStdout({
        batched: (msg) => {
          textOutput += msg + "\n";
        },
      });
      pyodide.setStderr({
        batched: (msg) => {
          textOutput += msg + "\n";
        },
      });

      try {
        // 1. Run user code — preprocess to rejoin lines where a real newline was
        // embedded inside a string literal (happens with \n in JS template literals).
        const userCode = fixPythonBrokenStrings(cell.code);
        const result = await pyodide.runPythonAsync(userCode);

        let testFeedback = null;

        // Inject last expression result as `_` so test code can reference it
        // (mirrors Python REPL behaviour where _ holds the last expression value)
        try {
          pyodide.globals.set('_', result ?? null);
        } catch { /* ignore if result is not a transferable type */ }

        // 2. Run test code if provided
        if (cell.testCode) {
          try {
            const testResult = await pyodide.runPythonAsync(fixPythonBrokenStrings(cell.testCode));
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
            testFeedback = {
              success: false,
              message: `Test Error: ${testErr.message}`,
            };
          }
        }

        // Check if the return value is an opencalc figure
        const resultStr =
          result !== undefined && result !== null ? String(result) : "";
        const isFigure = isFigureOutput(resultStr);

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
                  figureJson: isFigure ? resultStr : null,
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
    [pyodide, cells, isExecuting],
  );

  // ── Run all cells in order ─────────────────────────────────────────────────
  const runAll = useCallback(async () => {
    for (const cell of cells) {
      await new Promise((resolve) => {
        // Small delay between cells so state updates render
        setTimeout(resolve, 50);
      });
      await runCell(cell.id);
    }
  }, [cells, runCell]);

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
