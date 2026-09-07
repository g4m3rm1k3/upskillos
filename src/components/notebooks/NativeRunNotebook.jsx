// NativeRunNotebook.jsx
// A single component covering Common Lisp, Java, and .NET — three
// languages with no existing web-build equivalent at all (nothing in this
// app currently teaches them interactively), so unlike CppNotebook there's
// no third-party API to fall back to on the web build; on web these
// lessons simply show read-only code with an explanation, matching
// PySideNotebook's pattern. Parameterized by `params.runtime` purely for
// labels/syntax highlighting/install copy — the actual run call is the
// same generic `window.openCalcDesktop.runCode(runtime, code)` used by
// CppNotebook's desktop path (see desktop/app/runtimes/{lisp,java,dotnet}.cjs).
//
// Unlike PySideNotebook (a long-lived detached GUI process you watch
// appear as its own window), these are ordinary run-to-completion console
// programs — the console panel below the editor IS the primary feedback,
// not a secondary channel next to a real window.

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Editor from "@monaco-editor/react";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-lisp";
import "prismjs/components/prism-java";
import "prismjs/components/prism-csharp";
import { parseProse } from "../math/parseProse.jsx";
import { setupOpenCalcMonaco } from "../../utils/monacoThemes.js";
import { useThemeColors, withAlpha } from "../../hooks/useThemeColors";
import { useGlobalTheme } from "../../context/ThemeContext.jsx";
import EnvironmentBanner from "./shared/EnvironmentBanner.jsx";

const isDesktop = () => typeof window !== "undefined" && !!window.openCalcDesktop;

const RUNTIME_CONFIG = {
  lisp: {
    title: "Common Lisp (SBCL)",
    monacoLang: "scheme",
    prismLang: "lisp",
    defaultFilename: "lesson.lisp",
    description: "This lesson needs a real Common Lisp interpreter (SBCL) to run. OpenCalc can download and install a private copy automatically — it won't touch anything else on your machine.",
    phaseLabels: {
      "downloading-lisp": "Downloading SBCL…",
      "extracting-lisp": "Unpacking SBCL…",
      done: "Ready!",
    },
  },
  java: {
    title: "Java (Temurin JDK)",
    monacoLang: "java",
    prismLang: "java",
    defaultFilename: "Main.java",
    description: "This lesson needs a real Java runtime (Eclipse Temurin) to run. OpenCalc can download and install a private copy automatically — it won't touch any Java you already have installed. The top-level class must be named Main.",
    phaseLabels: {
      "downloading-java": "Downloading Java…",
      "extracting-java": "Unpacking Java…",
      done: "Ready!",
    },
  },
  dotnet: {
    title: ".NET (C#)",
    monacoLang: "csharp",
    prismLang: "csharp",
    defaultFilename: "Program.cs",
    description: "This lesson needs a real .NET SDK to run. OpenCalc can download and install a private copy automatically — it won't touch any .NET install you already have.",
    phaseLabels: {
      "downloading-dotnet": "Downloading .NET SDK…",
      "extracting-dotnet": "Unpacking .NET SDK…",
      done: "Ready!",
    },
  },
};

function CodeBlock({ code, C, prismLang, label }) {
  const html = useMemo(() => {
    try {
      return Prism.highlight(code, Prism.languages[prismLang] || Prism.languages.clike, prismLang);
    } catch {
      return null;
    }
  }, [code, prismLang]);

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
          <code style={{ fontFamily: "monospace" }} dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <code style={{ fontFamily: "monospace", color: "#d4d4d4" }}>{code}</code>
        )}
      </pre>
    </div>
  );
}

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

const CellComponent = React.memo(({ cell, config, C, monacoTheme, onRun, onUpdate, isRunning, envReady, output }) => {
  const lineCount = (cell.code || "").split("\n").length;
  const editorHeight = `${Math.min(420, Math.max(120, lineCount * 21 + 24))}px`;

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
          {isRunning ? <span>Running<span style={{ color: C.teal }}>…</span></span> : <span>{cell.filename || config.defaultFilename}</span>}
        </span>
        <button
          onClick={() => onRun(cell.id)}
          disabled={isRunning || !envReady}
          title={!envReady ? `Install ${config.title} above first` : undefined}
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
        defaultLanguage={config.monacoLang}
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

export default function NativeRunNotebook({ params }) {
  const C = useThemeColors();
  const { themeStyles } = useGlobalTheme();
  const monacoTheme = themeStyles?.monaco || (C.dark ? "open-calc-dark" : "open-calc-light");
  const desktop = isDesktop();

  const runtime = params?.runtime;
  const config = RUNTIME_CONFIG[runtime];

  const initial = (params?.initialCells || []).map((c) => ({ ...c, code: c.code ?? "" }));
  const [cells, setCells] = useState(initial);
  const [runningId, setRunningId] = useState(null);
  const [runIds, setRunIds] = useState({});
  const [outputs, setOutputs] = useState({});

  const [envStatus, setEnvStatus] = useState(desktop ? "checking" : "unavailable");
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    if (!desktop || !runtime) return;
    let cancelled = false;
    window.openCalcDesktop.getRuntimeStatus(runtime).then((res) => {
      if (cancelled) return;
      setEnvStatus(res?.ok && res.status?.installed ? "ready" : "needs-install");
    });
    return () => { cancelled = true; };
  }, [desktop, runtime]);

  useEffect(() => {
    if (!desktop || !runtime) return;
    const unsub = window.openCalcDesktop.onRuntimeProgress((data) => {
      if (data.runtime !== runtime) return;
      setProgress(data);
      if (data.phase === "done") {
        setEnvStatus("ready");
        setInstalling(false);
      } else if (data.phase === "error") {
        setInstalling(false);
      }
    });
    return unsub;
  }, [desktop, runtime]);

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
    setProgress({ phase: `downloading-${runtime}`, percent: 0 });
    window.openCalcDesktop.installRuntime(runtime).then((res) => {
      if (!res?.ok) setInstalling(false);
    });
  }, [runtime]);

  const runCell = useCallback(async (id) => {
    if (runningId) return;
    const cell = cells.find((c) => c.id === id);
    if (!cell) return;
    setRunningId(id);
    setOutputs((prev) => ({ ...prev, [id]: [] }));
    const res = await window.openCalcDesktop.runCode(runtime, cell.code);
    if (!res?.ok) {
      setOutputs((prev) => ({ ...prev, [id]: [{ stream: "stderr", text: res?.reason || "Failed to launch." }] }));
      setRunningId(null);
      return;
    }
    setRunIds((prev) => ({ ...prev, [id]: res.runId }));
  }, [cells, runningId, runtime]);

  if (!config) {
    return (
      <div style={{ padding: 16, fontSize: 13, color: C.red }}>
        NativeRunNotebook: unknown runtime "{String(runtime)}"
      </div>
    );
  }

  if (!desktop) {
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
            {config.title} runs for real via a local compiler/interpreter — something a browser tab can't do. You
            can read the code below now, and run it for real once you're in the desktop app.
          </p>
        </div>
        {cells.map((cell) => (
          <div key={cell.id} style={{ marginBottom: 12 }}>
            {cell.cellTitle && (
              <p style={{ margin: "0 0 6px 16px", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: C.blue }}>
                {cell.cellTitle}
              </p>
            )}
            <ProseBlock prose={cell.prose} C={C} />
            <CodeBlock code={cell.code} C={C} prismLang={config.prismLang} label={cell.filename || config.defaultFilename} />
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
        <span style={{ background: C.teal, borderRadius: 6, padding: "3px 7px", fontSize: 12, color: "#fff" }}>{"</>"}</span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: C.text }}>{config.title} Notebook</div>
          <div style={{ fontSize: 11, color: C.hint, marginTop: 2 }}>
            Compiled/run for real via a private, local toolchain — no third-party service involved.
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
          title={config.title}
          description={config.description}
          phaseLabels={config.phaseLabels}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {cells.map((cell) => (
          <CellComponent
            key={cell.id}
            cell={cell}
            config={config}
            C={C}
            monacoTheme={monacoTheme}
            onRun={runCell}
            onUpdate={updateCode}
            isRunning={runningId === cell.id}
            envReady={envStatus === "ready"}
            output={outputs[cell.id]}
          />
        ))}
      </div>
    </div>
  );
}
