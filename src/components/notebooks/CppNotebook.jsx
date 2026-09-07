// CppNotebook.jsx
// PythonNotebook's cell model (prose / typeIt / solution / code), but for
// C++: no in-browser interpreter exists, so cells compile and run for real
// via the Wandbox API (https://wandbox.org/api/compile.json) — the same
// service and call shape already used by src/tools/js-playground/FullPageIDE.jsx.
// Unlike Pyodide, Wandbox is a stateless HTTP call per run: there's no
// shared kernel, so (unlike PythonNotebook) variables do NOT persist between
// cells — every cell is its own complete, independent program.

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Editor from "@monaco-editor/react";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import { parseProse } from "../math/parseProse.jsx";
import { setupOpenCalcMonaco } from "../../utils/monacoThemes.js";
import { useThemeColors, withAlpha } from "../../hooks/useThemeColors";
import { useGlobalTheme } from "../../context/ThemeContext.jsx";
import EnvironmentBanner from "./shared/EnvironmentBanner.jsx";

// Electron only — on the web build this is always false, so every branch
// below that checks it falls through to the existing Wandbox path,
// completely unchanged. See desktop/app/runtimes/cpp.cjs for why the
// Electron build doesn't need Wandbox at all: it compiles for real,
// locally, via a private llvm-mingw install.
const isDesktop = () => typeof window !== "undefined" && !!window.openCalcDesktop;

const CPP_PHASE_LABELS = {
  "downloading-cpp": "Downloading C++ toolchain…",
  "extracting-cpp": "Unpacking C++ toolchain…",
  done: "Ready!",
};

// ── Wandbox API — run C++ code for real ──────────────────────────────────
// Returns { status, compiler_output, compiler_error, program_output, program_error, signal? }
async function runCpp(code) {
  const res = await fetch("https://wandbox.org/api/compile.json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      compiler: "gcc-12.3.0",
      code,
      options: "-std=c++17 -O2",
    }),
  });
  if (!res.ok) throw new Error(`Compiler API error: ${res.status}`);
  return res.json();
}

// ── Reference code block — same treatment as PythonNotebook's typeIt cells ──
function ReferenceCodeBlock({ code, C }) {
  const html = useMemo(() => {
    try {
      return Prism.highlight(code, Prism.languages.cpp, "cpp");
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
          <code className="language-cpp" style={{ fontFamily: "monospace" }} dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <code style={{ fontFamily: "monospace", color: "#d4d4d4" }}>{code}</code>
        )}
      </pre>
    </div>
  );
}

// ── Prose block renderer — same rules as PythonNotebook's cell prose ──────
function ProseBlock({ prose, C }) {
  if (!prose) return null;
  const items = Array.isArray(prose) ? prose : [prose];
  return (
    <div style={{ padding: "10px 16px 10px" }}>
      {items.map((p, i) => {
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
        if (typeof p === "string" && p.trimStart().startsWith("```")) {
          const lines = p.split("\n");
          const inner = lines
            .slice(1, lines[lines.length - 1].trimStart().startsWith("```") ? -1 : undefined)
            .join("\n");
          const lang = lines[0].replace(/^```/, "").trim() || "cpp";
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
        if (typeof p === "string" && p.trimStart().startsWith("- ")) {
          const listItems = p.split("\n").filter((l) => l.trim().startsWith("- "));
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
              {listItems.map((item, j) => (
                <li key={j} style={{ marginBottom: j < listItems.length - 1 ? 3 : 0 }}>
                  {parseProse(item.replace(/^[\s]*-\s*/, ""))}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} style={{ margin: i === 0 ? 0 : "8px 0 0", fontSize: 13, color: C.text, lineHeight: 1.7 }}>
            {parseProse(p)}
          </p>
        );
      })}
    </div>
  );
}

// ── Output panel — compile error vs. program stdout/stderr ────────────────
function CellOutput({ cell, C }) {
  // Electron local-execution path: a plain stream of {stream, text} events
  // (no compile/run distinction in the payload — compiler stderr and
  // program stderr are both just "stderr" lines, in the order they
  // occurred), unlike Wandbox's single structured result object below.
  if (cell.liveOutput) {
    if (cell.liveOutput.length === 0) return null;
    return (
      <div style={{ borderTop: `0.5px solid ${C.border}` }}>
        <div style={{ fontSize: 10, color: C.hint, padding: "6px 14px 2px", fontFamily: "monospace", fontWeight: 500 }}>
          Output
        </div>
        <pre
          style={{
            margin: 0,
            padding: "4px 14px 12px",
            fontFamily: "monospace",
            fontSize: 13,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {cell.liveOutput.map((l, i) => (
            <span key={i} style={{ color: l.stream === "stderr" ? C.red : C.text }}>
              {l.text}
              {"\n"}
            </span>
          ))}
        </pre>
      </div>
    );
  }

  if (!cell.result && cell.status !== "error") return null;

  if (cell.status === "error") {
    return (
      <div style={{ borderTop: `0.5px solid ${C.border}`, padding: "10px 14px 12px" }}>
        <p style={{ margin: "0 0 4px", fontFamily: "monospace", fontSize: 12, color: C.red, fontWeight: 600 }}>
          Compiler request failed
        </p>
        <pre style={{ margin: 0, fontFamily: "monospace", fontSize: 12, color: C.red, whiteSpace: "pre-wrap" }}>
          {cell.result}
        </pre>
      </div>
    );
  }

  const r = cell.result;

  // The live compiler service (Wandbox) was unreachable — fall back to the
  // lesson's documented expected output rather than a bare error. Only
  // presented as "this is what your code does" when what was actually
  // typed matches the reference solution; otherwise it's honest about not
  // being able to verify code it never ran.
  if (r.simulated) {
    return (
      <div style={{ borderTop: `0.5px solid ${C.border}` }}>
        <div
          style={{
            padding: "6px 14px",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: C.amber,
            background: C.amberBg,
            borderBottom: `1px solid ${C.amberBd}`,
          }}
        >
          {r.matches ? "Simulated output — live compiler unavailable" : "Live compiler unavailable"}
        </div>
        {!r.matches && (
          <p style={{ margin: "8px 14px 0", fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
            The live compiler service is down right now, and what you typed doesn't exactly match the
            reference solution, so your specific code can't be verified. Here's what the reference
            solution above produces:
          </p>
        )}
        <pre
          style={{
            margin: 0,
            padding: "8px 14px 12px",
            fontFamily: "monospace",
            fontSize: 13,
            lineHeight: 1.6,
            color: C.text,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {r.output || "(no output)"}
        </pre>
      </div>
    );
  }

  const compileFailed = !!r.compiler_error && r.status !== "0";
  return (
    <div style={{ borderTop: `0.5px solid ${C.border}` }}>
      <div style={{ fontSize: 10, color: C.hint, padding: "6px 14px 2px", fontFamily: "monospace", fontWeight: 500 }}>
        {compileFailed ? "Compiler error" : "Program output"}
      </div>
      {compileFailed ? (
        <pre
          style={{
            margin: 0,
            padding: "4px 14px 12px",
            fontFamily: "monospace",
            fontSize: 12,
            lineHeight: 1.6,
            color: C.red,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {r.compiler_error}
        </pre>
      ) : (
        <>
          <pre
            style={{
              margin: 0,
              padding: "4px 14px 8px",
              fontFamily: "monospace",
              fontSize: 13,
              lineHeight: 1.6,
              color: C.text,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {r.program_output || "(no output)"}
          </pre>
          {r.program_error && (
            <pre
              style={{
                margin: 0,
                padding: "0 14px 12px",
                fontFamily: "monospace",
                fontSize: 12,
                lineHeight: 1.6,
                color: C.amber,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {r.program_error}
            </pre>
          )}
        </>
      )}
    </div>
  );
}

// ── Single cell ────────────────────────────────────────────────────────────
const CellComponent = React.memo(({ cell, C, monacoTheme, onRun, onUpdate, isRunning, envReady = true }) => {
  const lineCount = (cell.code || "").split("\n").length;
  const refLineCount = cell.typeIt && cell.solution ? cell.solution.split("\n").length : 0;
  const editorHeight = `${Math.min(360, Math.max(80, Math.max(lineCount, refLineCount) * 21 + 24))}px`;

  return (
    <div
      style={{
        background: `${withAlpha(C.surface, "dd")}`,
        border: `1.5px solid ${cell.status === "error" ? C.redBd : cell.status === "running" ? C.tealBd : withAlpha(C.blueBd, "55")}`,
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 12,
      }}
    >
      {(cell.cellTitle || cell.prose) && (
        <div style={{ borderBottom: `1px solid ${C.border}` }}>
          {cell.cellTitle && (
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
          <ProseBlock prose={cell.prose} C={C} />
        </div>
      )}

      {cell.typeIt && cell.solution && <ReferenceCodeBlock code={cell.solution} C={C} />}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "5px 10px",
          background: C.surface2,
          borderBottom: `0.5px solid ${C.border}`,
        }}
      >
        <span style={{ fontFamily: "monospace", fontSize: 11, color: C.hint }}>
          {isRunning ? <span>Compiling<span style={{ color: C.teal }}>…</span></span> : <span>main.cpp</span>}
        </span>
        <button
          onClick={() => onRun(cell.id)}
          disabled={isRunning || !envReady}
          title={!envReady ? "Install the C++ toolchain above first" : undefined}
          style={{
            fontSize: 11,
            padding: "3px 10px",
            borderRadius: 6,
            cursor: isRunning || !envReady ? "default" : "pointer",
            border: "none",
            background: C.teal,
            color: "#fff",
            opacity: isRunning || !envReady ? 0.4 : 1,
          }}
        >
          {isRunning ? "..." : "▶ Compile & Run"}
        </button>
      </div>

      <Editor
        height={editorHeight}
        beforeMount={setupOpenCalcMonaco}
        defaultLanguage="cpp"
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
          acceptSuggestionOnEnter: "off",
          scrollbar: { vertical: "hidden", alwaysConsumeMouseWheel: false },
        }}
        onMount={(editor) => {
          // Shift=1024, Enter=3 — see PythonNotebook.jsx for why these are
          // numeric constants instead of referencing a global monaco object.
          editor.addCommand(1024 | 3, () => onRun(cell.id));
        }}
      />

      <CellOutput cell={cell} C={C} />
    </div>
  );
});

// ── Main notebook ──────────────────────────────────────────────────────────
export default function CppNotebook({ params }) {
  const C = useThemeColors();
  const { themeStyles } = useGlobalTheme();
  const monacoTheme = themeStyles?.monaco || (C.dark ? "open-calc-dark" : "open-calc-light");
  const desktop = isDesktop();

  const initial = (params?.initialCells || []).map((c) => ({
    ...c,
    code: c.code ?? "",
    status: c.status ?? "idle",
    result: c.result ?? null,
    liveOutput: null,
  }));
  const [cells, setCells] = useState(initial);
  const [runningId, setRunningId] = useState(null);
  const [runIds, setRunIds] = useState({}); // cellId -> active local runId (desktop only)

  // ── Desktop-only: private local toolchain status (see runtimes/cpp.cjs) ──
  const [envStatus, setEnvStatus] = useState(desktop ? "checking" : "unavailable");
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    if (!desktop) return;
    let cancelled = false;
    window.openCalcDesktop.getRuntimeStatus("cpp").then((res) => {
      if (cancelled) return;
      setEnvStatus(res?.ok && res.status?.installed ? "ready" : "needs-install");
    });
    return () => { cancelled = true; };
  }, [desktop]);

  useEffect(() => {
    if (!desktop) return;
    const unsub = window.openCalcDesktop.onRuntimeProgress((data) => {
      if (data.runtime !== "cpp") return;
      setProgress(data);
      if (data.phase === "done") {
        setEnvStatus("ready");
        setInstalling(false);
      } else if (data.phase === "error") {
        setInstalling(false);
      }
    });
    return unsub;
  }, [desktop]);

  useEffect(() => {
    if (!desktop) return;
    const unsub = window.openCalcDesktop.onScriptOutput((evt) => {
      const cellId = Object.entries(runIds).find(([, id]) => id === evt.runId)?.[0];
      if (cellId == null) return;
      if (evt.stream === "exit") {
        setRunningId((cur) => (String(cur) === cellId ? null : cur));
        return;
      }
      setCells((prev) =>
        prev.map((c) => (String(c.id) === cellId ? { ...c, liveOutput: [...(c.liveOutput || []), evt] } : c)),
      );
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desktop, runIds]);

  const installEnv = useCallback(() => {
    setInstalling(true);
    setProgress({ phase: "downloading-cpp", percent: 0 });
    window.openCalcDesktop.installRuntime("cpp").then((res) => {
      if (!res?.ok) setInstalling(false);
    });
  }, []);

  const updateCode = (id, code) =>
    setCells((prev) => prev.map((c) => (c.id === id ? { ...c, code } : c)));

  const runCellLocal = useCallback(async (id) => {
    if (runningId) return;
    const cell = cells.find((c) => c.id === id);
    if (!cell) return;
    setRunningId(id);
    setCells((prev) => prev.map((c) => (c.id === id ? { ...c, liveOutput: [] } : c)));
    const res = await window.openCalcDesktop.runCode("cpp", cell.code);
    if (!res?.ok) {
      setCells((prev) =>
        prev.map((c) => (c.id === id ? { ...c, liveOutput: [{ stream: "stderr", text: res?.reason || "Failed to launch." }] } : c)),
      );
      setRunningId(null);
      return;
    }
    setRunIds((prev) => ({ ...prev, [id]: res.runId }));
  }, [cells, runningId]);

  const runCellWandbox = async (id) => {
    const cell = cells.find((c) => c.id === id);
    if (!cell || runningId) return;
    setRunningId(id);
    setCells((prev) => prev.map((c) => (c.id === id ? { ...c, status: "running" } : c)));
    try {
      const result = await runCpp(cell.code);
      setCells((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "idle", result } : c)),
      );
    } catch (err) {
      // Wandbox (the only real in-browser-reachable C++ compiler this app
      // has) is a third-party service with no uptime guarantee — confirmed
      // live during development that its execution backend can go down
      // entirely. Rather than a bare error, fall back to the lesson's
      // documented expected output when there is one, clearly labeled as
      // simulated and only presented as "your code's output" when what was
      // actually typed matches the reference solution (normalized).
      if (cell.expectedOutput) {
        const normalize = (s) => s.replace(/\s+/g, " ").trim();
        const matches =
          !!cell.solution && normalize(cell.code) === normalize(cell.solution);
        setCells((prev) =>
          prev.map((c) =>
            c.id === id
              ? { ...c, status: "idle", result: { simulated: true, output: cell.expectedOutput, matches } }
              : c,
          ),
        );
      } else {
        setCells((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: "error", result: err.message } : c)),
        );
      }
    } finally {
      setRunningId(null);
    }
  };

  // On the web build this is always runCellWandbox — desktop is always
  // false there, so this ternary never changes behavior for that path.
  const runCell = desktop ? runCellLocal : runCellWandbox;

  return (
    <div className="px-0 sm:px-3 py-3" style={{ width: "100%", fontFamily: "sans-serif", boxSizing: "border-box" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 4px 12px",
          marginBottom: 8,
          borderBottom: `0.5px solid ${C.border}`,
        }}
      >
        <span style={{ background: C.teal, borderRadius: 6, padding: "3px 7px", fontSize: 12, color: "#fff" }}>{"<>"}</span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: C.text }}>C++ Notebook</div>
          <div style={{ fontSize: 11, color: C.hint, marginTop: 2 }}>
            {desktop
              ? "Compiled and run for real via a private, local toolchain (llvm-mingw, -std=c++17) — each cell is its own independent program."
              : "Compiled and run for real via Wandbox (g++ 12.3.0, -std=c++17) — each cell is its own independent program."}
          </div>
        </div>
      </div>

      {desktop && (
        <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}`, marginBottom: 12 }}>
          <EnvironmentBanner
            status={envStatus}
            installing={installing}
            progress={progress}
            onInstall={installEnv}
            C={C}
            title="C++ toolchain"
            description="This lesson needs a real C/C++ compiler to run. OpenCalc can download and install a private copy automatically — it won't touch any compiler you already have installed."
            phaseLabels={CPP_PHASE_LABELS}
          />
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column" }}>
        {cells.map((cell) => (
          <CellComponent
            key={cell.id}
            cell={cell}
            C={C}
            monacoTheme={monacoTheme}
            onRun={runCell}
            onUpdate={updateCode}
            isRunning={runningId === cell.id}
            envReady={!desktop || envStatus === "ready"}
          />
        ))}
      </div>
    </div>
  );
}
