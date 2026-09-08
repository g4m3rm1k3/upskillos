// PySideNotebook.jsx
// PySide6 draws a REAL native OS window — impossible in a browser tab and
// impossible in Pyodide (WASM has no OS windowing access at all). So unlike
// every other notebook component, this one only works inside the Electron
// desktop build, where it can spawn a real python.exe against a private,
// autonomously-installed Python + PySide6 environment (see
// desktop/app/runtimes/python.cjs for the installer).
//
// Two ways to wire a lesson's props:
//   - `initialCells: [...]` — independent cells, each its own script. Each
//     cell can be pre-filled/editable (JSNotebook-style) or typeIt
//     (PythonNotebook/CppNotebook-style: read-only reference above an
//     empty editor).
//   - `steps: [...]` — a PROGRESSIVE sequence sharing ONE persistent
//     editor across every step (see ProgressiveRunner below). Running the
//     current step's code successfully reveals the next step's reference
//     without resetting what the learner already typed — they only ever
//     type or edit the delta each step's prose describes, never retype
//     unchanged code from a previous step. Chapter 2 (the Godot-like-
//     editor project) uses this: an earlier `initialCells`-with-typeIt
//     version required retyping the WHOLE growing script at every cell,
//     which the person this course is for correctly flagged as pointless
//     busywork, not learning.
//
// On the web build (no window.openCalcDesktop), code renders read-only with
// an explanation instead of a Run button — content still teaches, it just
// can't execute here.

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Editor from "@monaco-editor/react";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-python";
import { parseProse } from "../math/parseProse.jsx";
import { setupOpenCalcMonaco } from "../../utils/monacoThemes.js";
import { useThemeColors, withAlpha } from "../../hooks/useThemeColors";
import { useGlobalTheme } from "../../context/ThemeContext.jsx";
import EnvironmentBanner from "./shared/EnvironmentBanner.jsx";

const PHASE_LABELS = {
  "downloading-python": "Downloading Python…",
  "extracting-python": "Unpacking Python…",
  "configuring-python": "Configuring interpreter…",
  "bootstrapping-pip": "Setting up pip…",
  "installing-pyside6": "Installing PySide6 + pygame (this can take a few minutes)…",
  done: "Ready!",
};

const isDesktop = () => typeof window !== "undefined" && !!window.openCalcDesktop;

// ── Read-only code block — used both for the web fallback and as the
// "here's the code" header on desktop before Run is pressed ────────────────
function CodeBlock({ code, C, label }) {
  const html = useMemo(() => {
    try {
      return Prism.highlight(code, Prism.languages.python, "python");
    } catch {
      return null;
    }
  }, [code]);

  return (
    <div style={{ margin: "0 16px 12px", borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}` }}>
      {label && (
        <div
          style={{
            padding: "6px 12px",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: C.muted,
            background: C.surface2,
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          {label}
        </div>
      )}
      <pre style={{ margin: 0, padding: "12px 14px", fontSize: 13, lineHeight: 1.6, overflowX: "auto", background: "#1e1e1e" }}>
        {html ? (
          <code className="language-python" style={{ fontFamily: "monospace" }} dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <code style={{ fontFamily: "monospace", color: "#d4d4d4" }}>{code}</code>
        )}
      </pre>
    </div>
  );
}

// ── Reference code block — shown above an EMPTY editor for typeIt cells, so
// the learner types the code themselves instead of pressing Run on
// something they never wrote (same pattern as PythonNotebook/CppNotebook's
// typeIt mode) ─────────────────────────────────────────────────────────────
function ReferenceCodeBlock({ code, C }) {
  const html = useMemo(() => {
    try {
      return Prism.highlight(code, Prism.languages.python, "python");
    } catch {
      return null;
    }
  }, [code]);

  return (
    <div style={{ margin: "0 16px 12px", borderRadius: 8, overflow: "hidden", border: `1px solid ${C.purpleBd ?? C.blueBd}` }}>
      <div
        style={{
          padding: "6px 12px",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: C.purple ?? C.blue,
          background: C.purpleBg ?? C.blueBg,
          borderBottom: `1px solid ${C.purpleBd ?? C.blueBd}`,
        }}
      >
        Type this into the editor below
      </div>
      <pre style={{ margin: 0, padding: "12px 14px", fontSize: 13, lineHeight: 1.6, overflowX: "auto", background: "#1e1e1e" }}>
        {html ? (
          <code className="language-python" style={{ fontFamily: "monospace" }} dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <code style={{ fontFamily: "monospace", color: "#d4d4d4" }}>{code}</code>
        )}
      </pre>
    </div>
  );
}

// ── Prose block — same conventions as CppNotebook's ProseBlock ────────────
function ProseBlock({ prose, C }) {
  if (!prose) return null;
  const items = Array.isArray(prose) ? prose : [prose];
  return (
    <div style={{ padding: "10px 16px 10px" }}>
      {items.map((p, i) => (
        <p key={i} style={{ margin: i === 0 ? 0 : "8px 0 0", fontSize: 13, color: C.text, lineHeight: 1.7 }}>
          {parseProse(p)}
        </p>
      ))}
    </div>
  );
}

// ── Output panel — streamed stdout/stderr for this cell's active run ──────
function CellOutput({ lines, C }) {
  if (!lines || lines.length === 0) return null;
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
        {lines.map((l, i) => (
          <span key={i} style={{ color: l.stream === "stderr" ? C.red : C.text }}>
            {l.text}
            {"\n"}
          </span>
        ))}
      </pre>
    </div>
  );
}

// ── Single cell ────────────────────────────────────────────────────────────
const CellComponent = React.memo(({ cell, C, monacoTheme, onRun, onUpdate, isRunning, envReady, output }) => {
  const lineCount = (cell.code || "").split("\n").length;
  const refLineCount = cell.typeIt && cell.solution ? cell.solution.split("\n").length : 0;
  const editorHeight = `${Math.min(420, Math.max(120, Math.max(lineCount, refLineCount) * 21 + 24))}px`;

  return (
    <div
      style={{
        background: withAlpha(C.surface, "dd"),
        border: `1.5px solid ${isRunning ? C.tealBd : withAlpha(C.blueBd, "55")}`,
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
          {isRunning ? <span>Running<span style={{ color: C.teal }}>…</span></span> : <span>{cell.filename || "lesson.py"}</span>}
        </span>
        <button
          onClick={() => onRun(cell.id)}
          disabled={isRunning || !envReady}
          title={!envReady ? "Install Python + PySide6 above first" : undefined}
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
          {isRunning ? "..." : "▶ Run"}
        </button>
      </div>

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
          acceptSuggestionOnEnter: "off",
          scrollbar: { vertical: "hidden", alwaysConsumeMouseWheel: false },
        }}
      />

      <CellOutput lines={output} C={C} />
    </div>
  );
});

// ── Progressive stepper — ONE persistent editor shared across every step,
// instead of N independent cells that each have to repeat the whole
// growing script. The learner's typed code is never reset between steps:
// running the current step's code successfully reveals the next step's
// reference (still the full target script, so there's something concrete
// to compare against) while leaving what they already typed exactly as it
// is — they only ever type or edit the delta the step's prose describes,
// never retype unchanged code. "Successfully" for a PySide6 GUI (which has
// no clean exit to wait for — app.exec() blocks until the user closes the
// window) means no stderr arrived within a short grace window after
// launch, not a clean process exit — the closest honest proxy available.
const RUN_SUCCESS_GRACE_MS = 2500;

function ProgressiveRunner({ steps, filename, C, monacoTheme, envReady }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [code, setCode] = useState("");
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState([]);
  const [runId, setRunId] = useState(null);
  const [stepStatus, setStepStatus] = useState("idle"); // idle | success | error
  const [justAdvanced, setJustAdvanced] = useState(false);

  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const lineCount = code.split("\n").length;
  const refLineCount = (step.solution || "").split("\n").length;
  const editorHeight = `${Math.min(420, Math.max(120, Math.max(lineCount, refLineCount) * 21 + 24))}px`;

  useEffect(() => {
    if (!runId) return;
    const unsub = window.openCalcDesktop.onScriptOutput((evt) => {
      if (evt.runId !== runId) return;
      if (evt.stream === "exit") {
        setRunning(false);
        return;
      }
      setOutput((prev) => [...prev, evt]);
      if (evt.stream === "stderr") setStepStatus("error");
    });
    return unsub;
  }, [runId]);

  const run = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setOutput([]);
    setStepStatus("idle");
    setJustAdvanced(false);
    const res = await window.openCalcDesktop.runPythonScript(code);
    if (!res?.ok) {
      setOutput([{ stream: "stderr", text: res?.reason || "Failed to launch." }]);
      setRunning(false);
      setStepStatus("error");
      return;
    }
    setRunId(res.runId);
    // Grace period: no stderr by now means no traceback on startup — the
    // best available "it worked" signal for a long-lived GUI process that
    // has no other clean success signal to wait for.
    setTimeout(() => {
      setStepStatus((cur) => {
        if (cur === "error") return cur;
        if (!isLastStep) {
          setStepIndex((i) => i + 1);
          setJustAdvanced(true);
        }
        return "success";
      });
    }, RUN_SUCCESS_GRACE_MS);
  }, [code, running, isLastStep]);

  return (
    <div
      style={{
        background: withAlpha(C.surface, "dd"),
        border: `1.5px solid ${stepStatus === "error" ? C.redBd : running ? C.tealBd : withAlpha(C.blueBd, "55")}`,
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
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
        <span>Step {stepIndex + 1} of {steps.length}{step.cellTitle ? ` — ${step.cellTitle}` : ""}</span>
        {justAdvanced && (
          <span style={{ color: C.teal, textTransform: "none", letterSpacing: "normal", fontWeight: 600 }}>
            ✓ Previous step ran clean — new step unlocked below
          </span>
        )}
      </div>

      <ProseBlock prose={step.prose} C={C} />

      {step.solution && <ReferenceCodeBlock code={step.solution} C={C} />}

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
          {running ? <span>Running<span style={{ color: C.teal }}>…</span></span> : <span>{filename || "lesson.py"}</span>}
        </span>
        <button
          onClick={run}
          disabled={running || !envReady}
          title={!envReady ? "Install Python + PySide6 above first" : undefined}
          style={{
            fontSize: 11,
            padding: "3px 10px",
            borderRadius: 6,
            cursor: running || !envReady ? "default" : "pointer",
            border: "none",
            background: C.teal,
            color: "#fff",
            opacity: running || !envReady ? 0.4 : 1,
          }}
        >
          {running ? "..." : "▶ Run"}
        </button>
      </div>

      <Editor
        height={editorHeight}
        beforeMount={setupOpenCalcMonaco}
        defaultLanguage="python"
        theme={monacoTheme || (C.dark ? "open-calc-dark" : "open-calc-light")}
        value={code}
        onChange={(val) => setCode(val || "")}
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
      />

      <CellOutput lines={output} C={C} />

      {isLastStep && stepStatus === "success" && (
        <div style={{ padding: "8px 16px", fontSize: 12, color: C.teal, borderTop: `0.5px solid ${C.border}` }}>
          ✓ Final step ran clean — that's the complete project artifact for this lesson.
        </div>
      )}
    </div>
  );
}

// ── Main notebook ──────────────────────────────────────────────────────────
export default function PySideNotebook({ params }) {
  const C = useThemeColors();
  const { themeStyles } = useGlobalTheme();
  const monacoTheme = themeStyles?.monaco || (C.dark ? "open-calc-dark" : "open-calc-light");
  const desktop = isDesktop();

  const initial = (params?.initialCells || []).map((c) => ({ ...c, code: c.code ?? "" }));
  const [cells, setCells] = useState(initial);
  const [runningId, setRunningId] = useState(null);
  const [runIds, setRunIds] = useState({}); // cellId -> active runId
  const [outputs, setOutputs] = useState({}); // cellId -> [{stream, text}]

  const [envStatus, setEnvStatus] = useState(desktop ? "checking" : "unavailable");
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    if (!desktop) return;
    let cancelled = false;
    window.openCalcDesktop.getRuntimeStatus("python").then((res) => {
      if (cancelled) return;
      const ready = !!(res?.ok && res.status?.pythonInstalled && res.status?.pysideInstalled && res.status?.pygameInstalled);
      setEnvStatus(ready ? "ready" : "needs-install");
    });
    return () => { cancelled = true; };
  }, [desktop]);

  useEffect(() => {
    if (!desktop) return;
    const unsub = window.openCalcDesktop.onRuntimeProgress((data) => {
      if (data.runtime !== "python") return;
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
      setOutputs((prev) => ({ ...prev, [cellId]: [...(prev[cellId] || []), evt] }));
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desktop, runIds]);

  const updateCode = (id, code) =>
    setCells((prev) => prev.map((c) => (c.id === id ? { ...c, code } : c)));

  const installEnv = useCallback(() => {
    setInstalling(true);
    setProgress({ phase: "downloading-python", percent: 0 });
    window.openCalcDesktop.installRuntime("python").then((res) => {
      if (!res?.ok) setInstalling(false);
    });
  }, []);

  const runCell = useCallback(async (id) => {
    if (runningId) return;
    const cell = cells.find((c) => c.id === id);
    if (!cell) return;
    setRunningId(id);
    setOutputs((prev) => ({ ...prev, [id]: [] }));
    const res = await window.openCalcDesktop.runPythonScript(cell.code);
    if (!res?.ok) {
      setOutputs((prev) => ({ ...prev, [id]: [{ stream: "stderr", text: res?.reason || "Failed to launch." }] }));
      setRunningId(null);
      return;
    }
    setRunIds((prev) => ({ ...prev, [id]: res.runId }));
  }, [cells, runningId]);

  const steps = Array.isArray(params?.steps) ? params.steps : null;

  if (!desktop) {
    const readOnlyItems = steps || cells;
    return (
      <div className="px-0 sm:px-3 py-3" style={{ width: "100%", fontFamily: "sans-serif", boxSizing: "border-box" }}>
        <div
          style={{
            padding: "12px 16px",
            marginBottom: 12,
            borderRadius: 10,
            border: `1px solid ${C.border}`,
            background: C.surface2,
          }}
        >
          <p style={{ margin: 0, fontSize: 13, color: C.text, fontWeight: 600 }}>🖥️ This lesson requires the OpenCalc desktop app</p>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: C.hint, lineHeight: 1.6 }}>
            PySide6 opens a real native window on your computer — something a browser tab can't do. You can
            read the code below now, and run it for real once you're in the desktop app.
          </p>
        </div>
        {readOnlyItems.map((item, i) => (
          <div key={item.id ?? i} style={{ marginBottom: 12 }}>
            {(item.cellTitle || steps) && (
              <p style={{ margin: "0 0 6px 16px", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: C.blue }}>
                {steps ? `Step ${i + 1} of ${steps.length}${item.cellTitle ? ` — ${item.cellTitle}` : ""}` : item.cellTitle}
              </p>
            )}
            <ProseBlock prose={item.prose} C={C} />
            <CodeBlock code={item.typeIt || steps ? item.solution : item.code} C={C} label={item.filename || params?.filename || "lesson.py"} />
          </div>
        ))}
      </div>
    );
  }

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
        <span style={{ background: C.teal, borderRadius: 6, padding: "3px 7px", fontSize: 12, color: "#fff" }}>Py</span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: C.text }}>PySide6 Notebook</div>
          <div style={{ fontSize: 11, color: C.hint, marginTop: 2 }}>
            Runs for real via a private Python interpreter — a native window opens outside this app.
          </div>
        </div>
      </div>

      <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}`, marginBottom: 12 }}>
        <EnvironmentBanner
          status={envStatus}
          installing={installing}
          progress={progress}
          onInstall={installEnv}
          C={C}
          title="Python + PySide6 + pygame"
          description="This lesson needs a real Python interpreter with PySide6 and pygame to run. OpenCalc can download and install a private copy automatically — it won't touch any Python you already have installed."
          phaseLabels={PHASE_LABELS}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {steps ? (
          <ProgressiveRunner
            steps={steps}
            filename={params?.filename}
            C={C}
            monacoTheme={monacoTheme}
            envReady={envStatus === "ready"}
          />
        ) : (
          cells.map((cell) => (
            <CellComponent
              key={cell.id}
              cell={cell}
              C={C}
              monacoTheme={monacoTheme}
              onRun={runCell}
              onUpdate={updateCode}
              isRunning={runningId === cell.id}
              envReady={envStatus === "ready"}
              output={outputs[cell.id]}
            />
          ))
        )}
      </div>
    </div>
  );
}
