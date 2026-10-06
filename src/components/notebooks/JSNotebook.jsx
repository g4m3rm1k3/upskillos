/**
 * JSNotebook.jsx
 * CodePen-style interactive JavaScript learning environment.
 * Fully theme-aware — adapts to light/dark mode automatically.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { setupOpenCalcMonaco } from "../../utils/monacoThemes.js";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import PrismInlineCode from "./PrismInlineCode";

import { makeNotebookTokens } from '../../utils/themeTokens';
import { useGlobalTheme } from '../../context/ThemeContext.jsx';
import { withAlpha } from '../../hooks/useThemeColors';
// ── Theme hook ────────────────────────────────────────────────────────────────
function useIsDark() {
  const isDark = () =>
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");
  const [dark, setDark] = useState(isDark);
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(isDark()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

// ── Colour tokens — computed per theme ───────────────────────────────────────
function makeT(dark) {
  return {
    ...makeNotebookTokens(dark),
    green:    dark ? "#34d399"  : "#16a34a",
    red:      dark ? "#f87171"  : "#dc2626",
    yellow:   dark ? "#fbbf24"  : "#d97706",
    editorBg: dark ? "#0c1222"  : "#f8fafc",
    runBtn:   "#0ea5e9",
    tabBar:   dark ? "#0c1520"  : "#f1f5f9",
    iframeBg: dark ? "#0f1923"  : "#ffffff",
    iframeText: dark ? "#e2e8f0" : "#1e293b",
  };
}

// CSS vars injected into every iframe so lesson CSS (var(--color-*)) resolves correctly
function iframeThemeVars(dark) {
  return dark ? `
    --color-background-primary:   #0f172a;
    --color-background-secondary: #1e293b;
    --color-background-tertiary:  #0f172a;
    --color-background-info:      #172554;
    --color-border-primary:       #334155;
    --color-border-secondary:     #475569;
    --color-border-tertiary:      #334155;
    --color-text-primary:         #e2e8f0;
    --color-text-secondary:       #94a3b8;
    --color-text-tertiary:        #64748b;
    --color-text-info:            #93c5fd;
  ` : `
    --color-background-primary:   #ffffff;
    --color-background-secondary: #f8fafc;
    --color-background-tertiary:  #f1f5f9;
    --color-background-info:      #eff6ff;
    --color-border-primary:       #e2e8f0;
    --color-border-secondary:     #cbd5e1;
    --color-border-tertiary:      #e2e8f0;
    --color-text-primary:         #1e293b;
    --color-text-secondary:       #475569;
    --color-text-tertiary:        #64748b;
    --color-text-info:            #1d4ed8;
  `;
}

const TABS = ["html", "css", "js"];
const TAB_LABEL = { html: "HTML", css: "CSS", js: "JavaScript" };
const MONACO_LANG = { html: "html", css: "css", js: "javascript" };

// ── Build sandboxed iframe document ──────────────────────────────────────────
function buildIframeDoc(html = "", css = "", js = "", cellIndex, dark) {
  const uid = Math.random().toString(36).slice(2);
  const escapedJs = js.replace(/<\/script>/gi, "<\\/script>");
  const iframeBg   = dark ? "#0f1923" : "#ffffff";
  const iframeText = dark ? "#e2e8f0" : "#1e293b";

  // Feedback colors accessible to lesson JS as window.__theme
  const theme = dark ? {
    ok:    { bg:"#052e16", border:"#10b981", color:"#4ade80" },
    err:   { bg:"#450a0a", border:"#ef4444", color:"#f87171" },
    warn:  { bg:"#451a03", border:"#f59e0b", color:"#fbbf24" },
  } : {
    ok:    { bg:"#d1fae5", border:"#10b981", color:"#065f46" },
    err:   { bg:"#fee2e2", border:"#ef4444", color:"#991b1b" },
    warn:  { bg:"#fef3c7", border:"#f59e0b", color:"#92400e" },
  };

  return `<!DOCTYPE html>
<html class="${dark ? "dark" : ""}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root {
  ${iframeThemeVars(dark)}
}
*, *::before, *::after { box-sizing: border-box; }
body {
  margin: 0; padding: 14px;
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: 14px;
  background: ${iframeBg};
  color: ${iframeText};
}
/* ── Dark-mode overrides for common lesson CSS patterns ── */
html.dark .ch1 { background: #052e16 !important; border-color: #166534 !important; }
html.dark .ch1 .ch-label { color: #4ade80 !important; }
html.dark .ch2 { background: #172554 !important; border-color: #1e40af !important; }
html.dark .ch2 .ch-label { color: #93c5fd !important; }
html.dark .ch3 { background: #2e1065 !important; border-color: #7c3aed !important; }
html.dark .ch3 .ch-label { color: #c4b5fd !important; }
html.dark .ch4 { background: #431407 !important; border-color: #c2410c !important; }
html.dark .ch4 .ch-label { color: #fdba74 !important; }
html.dark .burns  { background: #451a03 !important; color: #fbbf24 !important; }
html.dark .stable { background: #052e16 !important; color: #4ade80 !important; }
html.dark .dissolves { background: #052e16 !important; color: #4ade80 !important; }
html.dark .separates { background: #450a0a !important; color: #f87171 !important; }
html.dark .atom-card { background: #1e293b !important; border-color: #334155 !important; }
html.dark .fact-card  { background: #1e293b !important; border-color: #334155 !important; }
html.dark .result-box { background: #1e293b !important; border-color: #334155 !important; }
html.dark .comp-item  { background: #1e293b !important; border-color: #334155 !important; }
html.dark .demo       { background: #1e293b !important; border-color: #334155 !important; }
${css}
</style>
</head>
<body>
${html}
<script>
window.__cellId = '${uid}';
window.__theme = ${JSON.stringify(theme)};
// localStorage mock — sandbox lacks allow-same-origin so the getter throws.
// window.localStorage = {...} silently fails (no setter); Object.defineProperty bypasses the accessor.
(function() {
  try { window.localStorage; } catch(_) {
    var _store = {};
    var _mock = {
      getItem:    function(k)    { return Object.prototype.hasOwnProperty.call(_store, k) ? _store[k] : null; },
      setItem:    function(k, v) { _store[String(k)] = String(v); },
      removeItem: function(k)    { delete _store[k]; },
      clear:      function()     { _store = {}; },
      key:        function(i)    { return Object.keys(_store)[i] || null; },
      get length(){ return Object.keys(_store).length; }
    };
    try { Object.defineProperty(window, 'localStorage', { value: _mock, writable: true, configurable: true }); } catch(__) {}
  }
})();
(function() {
  const _log = console.log.bind(console);
  const _err = console.error.bind(console);
  const _warn = console.warn.bind(console);
  function post(level, args) {
    const msg = args.map(a => {
      try { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); }
      catch(_) { return String(a); }
    }).join(' ');
    window.parent.postMessage({ type: 'jsnb_console', level, msg, id: window.__cellId, cellIndex: ${cellIndex} }, '*');
  }
  console.log   = (...a) => { _log(...a);  post('log',  a); };
  console.error = (...a) => { _err(...a);  post('error',a); };
  console.warn  = (...a) => { _warn(...a); post('warn', a); };
  window.addEventListener('error', e => {
    if (e.error) post('error', [e.message]);
    e.preventDefault();
  }, true);
})();
try {
  (function() {
${escapedJs}
  })();
} catch(e) {
  console.error('Runtime error: ' + e.message);
}
<\/script>
</body>
</html>`;
}

// ── Markdown instruction text ─────────────────────────────────────────────────
function InstructionText({ text, T }) {
  if (!text) return null;
  // Use lighter blue for prose and darker blue bold in dark mode
  const isDark = T.text === "#e2e8f0";
  const proseColor = isDark ? "#7dd3fc" : T.text; // Tailwind sky-300
  const boldColor = isDark ? "#0ea5e9" : T.text; // Tailwind sky-500
  return (
    <div style={{ fontSize: 14, lineHeight: 1.8, color: proseColor }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...p }) => <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", color: T.accent }} {...p} />,
          h2: ({ node, ...p }) => <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.75rem", color: T.accent }} {...p} />,
          h3: ({ node, ...p }) => <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem", color: T.accent }} {...p} />,
          h4: ({ node, ...p }) => <h4 style={{ fontSize: "1rem", fontWeight: 600, margin: "1.25rem 0 0.5rem", color: T.accent }} {...p} />,
          // A fenced code block: a box that scrolls sideways, so a long line is never cut off.
          pre: ({ node, ...p }) => <pre style={{ background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", margin: "8px 0 12px", overflowX: "auto", lineHeight: 1.6 }} {...p} />,
          p:  ({ node, ...p }) => <p style={{ marginBottom: "1rem" }} {...p} />,
          ul: ({ node, ...p }) => <ul style={{ listStyleType: "disc", paddingLeft: "1.5rem", marginBottom: "1rem" }} {...p} />,
          ol: ({ node, ...p }) => <ol style={{ listStyleType: "decimal", paddingLeft: "1.5rem", marginBottom: "1rem" }} {...p} />,
          li: ({ node, ...p }) => <li style={{ marginBottom: "0.25rem" }} {...p} />,
          code: ({ node, inline, children, ...p }) => (
            <PrismInlineCode>{children}</PrismInlineCode>
          ),
          strong: ({ node, ...p }) => <strong style={{ color: boldColor, fontWeight: 700 }} {...p} />, 
          blockquote: ({ node, ...p }) => (
            <blockquote style={{ borderLeft: `3px solid ${T.accent}`, paddingLeft: 14, color: T.muted, margin: "12px 0" }} {...p} />
          ),
          table: ({ node, ...p }) => <table style={{ borderCollapse: 'collapse', width: '100%', margin: '12px 0', fontSize: 13 }} {...p} />, 
          th: ({ node, ...p }) => <th style={{ padding: '6px 12px', borderBottom: `2px solid ${T.accent}`, textAlign: 'left', color: T.accent, fontWeight: 600 }} {...p} />, 
          td: ({ node, ...p }) => <td style={{ padding: '6px 12px', borderBottom: `1px solid rgba(255,255,255,0.08)`, color: T.text }} {...p} />, 
          tr: ({ node, ...p }) => <tr {...p} />, 
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

// ── Console panel ─────────────────────────────────────────────────────────────
function ConsolePanel({ logs, T }) {
  const color = { log: T.text, error: T.red, warn: T.yellow };
  const icon  = { log: ">", error: "✗", warn: "⚠" };
  return (
    <div style={{ background: T.panel2, borderTop: `1px solid ${T.border}`, padding: "8px 14px", height: 120, overflowY: "auto" }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: T.muted, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6 }}>Console</div>
      {logs.length === 0 ? (
        <div style={{ fontFamily: "monospace", fontSize: 12, lineHeight: 1.6, color: T.muted }}>Run the cell to stream output here.</div>
      ) : (
        logs.map((log, i) => (
          <div key={i} style={{ fontFamily: "monospace", fontSize: 12, lineHeight: 1.6, color: color[log.level] || T.text, display: "flex", gap: 8 }}>
            <span style={{ color: T.muted, flexShrink: 0 }}>{icon[log.level]}</span>
            <span style={{ wordBreak: "break-all" }}>{log.msg}</span>
          </div>
        ))
      )}
    </div>
  );
}

// ── Single notebook cell ──────────────────────────────────────────────────────
function NotebookCell({ cell, cellIndex, T, dark, monacoTheme }) {
  const iframeRef = useRef(null);
  const defaultTab = cell.html ? "html" : "js";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [html, setHtml] = useState(cell.html || "");
  const [css,  setCss]  = useState(cell.css  || "");
  const [js,   setJs]   = useState(cell.startCode || "");
  const [logs, setLogs] = useState([]);
  const [hasRun, setHasRun] = useState(false);
  const [challengeState, setChallengeState] = useState(null);
  const [challengeMessage, setChallengeMessage] = useState(null);
  const [showSolution, setShowSolution] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const [showPreview, setShowPreview] = useState(!!cell.showPreviewByDefault);

  useEffect(() => {
    const handler = (e) => {
      if (!e.data || e.data.type !== "jsnb_console") return;
      if (e.data.cellIndex !== cellIndex) return;
      setLogs(prev => [...prev, { level: e.data.level, msg: e.data.msg }]);
      setShowConsole(true);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [cellIndex]);

  const run = useCallback(() => {
    setLogs([]);
    setHasRun(true);
    const needsPreview = html.trim() || css.trim();
    if (needsPreview) setShowPreview(true);
    setShowConsole(true);
    const activeJs = showSolution ? (cell.solutionCode || js) : js;
    if (iframeRef.current) {
      iframeRef.current.srcdoc = buildIframeDoc(html, css, activeJs, cellIndex, dark);
    }
    if (cell.type === "challenge" && cell.check) {
      setTimeout(() => {
        try {
          // check() may return a plain boolean, or { pass, message } to say
          // WHY it failed. "Not quite — try again" on its own leaves the
          // reader guessing, which is the opposite of what a challenge is
          // for. Booleans keep behaving exactly as they did.
          const result = cell.check(activeJs, logs, html);
          const detailed = result && typeof result === "object";
          setChallengeState((detailed ? result.pass : result) ? "pass" : "fail");
          setChallengeMessage(detailed && result.message ? result.message : null);
        } catch (_) {
          setChallengeState("fail");
          setChallengeMessage(null);
        }
      }, 300);
    }
  }, [html, css, js, showSolution, cell, logs, cellIndex, dark]);

  const reset = () => {
    setHtml(cell.html || "");
    setCss(cell.css || "");
    setJs(cell.startCode || "");
    setLogs([]);
    setHasRun(false);
    setShowConsole(false);
    setChallengeState(null);
    setChallengeMessage(null);
    setShowSolution(false);
    if (iframeRef.current) iframeRef.current.srcdoc = "";
  };

  // Markdown-only cells
  if (cell.type === "markdown") {
    return (
      <div style={{ background: T.panel, borderRadius: 12, border: `1px solid ${T.border}`, padding: "20px 22px", marginBottom: 20 }}>
        <InstructionText text={cell.instruction} T={T} />
      </div>
    );
  }

  const visibleTabs = TABS.filter(t => {
    if (t === "html") return !!(cell.html);
    if (t === "css")  return !!(cell.css);
    return true;
  });

  const editorValue = showSolution
    ? (activeTab === "js" ? (cell.solutionCode || js) : activeTab === "html" ? html : css)
    : (activeTab === "js" ? js : activeTab === "html" ? html : css);

  const handleEditorChange = (val = "") => {
    if (showSolution) return;
    if (activeTab === "js")   setJs(val);
    if (activeTab === "html") setHtml(val);
    if (activeTab === "css")  setCss(val);
  };

  const lineCount = editorValue.split("\n").length;
  const editorHeight = Math.min(360, Math.max(120, lineCount * 20 + 28));

  return (
    <div style={{ marginBottom: 24, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden", background: T.panel }}>

      {/* Instruction */}
      {cell.instruction && (
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}` }}>
          {cell.type === "challenge" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: withAlpha(T.yellow, "22"), border: `1.5px solid ${T.yellow}`, color: T.yellow, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {cellIndex + 1}
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.yellow, background: withAlpha(T.yellow, "18"), padding: "2px 8px", borderRadius: 10, border: `0.5px solid ${T.yellow}` }}>Challenge</span>
            </div>
          )}
          <InstructionText text={cell.instruction} T={T} />
        </div>
      )}

      {/* Live preview */}
      <div style={{ background: T.iframeBg, borderBottom: `1px solid ${T.border}`, display: showPreview ? "block" : "none" }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: T.muted, letterSpacing: ".08em", textTransform: "uppercase", padding: "7px 14px 0" }}>Preview</div>
        <iframe
          ref={iframeRef}
          sandbox="allow-scripts"
          style={{ width: "100%", height: cell.outputHeight || 160, border: "none", display: "block" }}
          title={`preview-${cellIndex}`}
        />
      </div>

      {/* Tab bar + action buttons */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: T.tabBar, borderBottom: `1px solid ${T.border}`, padding: "0 10px" }}>
        <div style={{ display: "flex" }}>
          {visibleTabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "8px 16px", background: "transparent", border: "none",
              borderBottom: activeTab === tab ? `2px solid ${T.accent}` : "2px solid transparent",
              color: activeTab === tab ? T.accent : T.muted,
              fontSize: 12, fontWeight: 600, cursor: "pointer", letterSpacing: ".04em", transition: "color .15s",
            }}>
              {TAB_LABEL[tab]}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, padding: "6px 0" }}>
          {["Show Preview", "Show Console"].map((label, i) => {
            const isVisible = i === 0 ? showPreview : showConsole;
            const toggle = i === 0 ? () => setShowPreview(s => !s) : () => setShowConsole(s => !s);
            return (
              <button key={label} onClick={toggle} style={{
                padding: "4px 11px", borderRadius: 6, border: `0.5px solid ${T.border}`,
                background: "transparent", color: T.muted, fontSize: 11, cursor: "pointer",
              }}>
                {isVisible ? label.replace("Show", "Hide") : label}
              </button>
            );
          })}
          {cell.solutionCode && (
            <button onClick={() => setShowSolution(s => !s)} style={{
              padding: "4px 11px", borderRadius: 6, border: `0.5px solid ${T.muted}`,
              background: "transparent", color: T.muted, fontSize: 11, cursor: "pointer",
            }}>
              {showSolution ? "Hide solution" : "Show solution"}
            </button>
          )}
          <button onClick={reset} style={{
            padding: "4px 11px", borderRadius: 6, border: `0.5px solid ${T.border}`,
            background: "transparent", color: T.muted, fontSize: 11, cursor: "pointer",
          }}>Reset</button>
          <button onClick={run} style={{
            padding: "5px 16px", borderRadius: 6, border: "none",
            background: T.runBtn, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>▶ Run</button>
        </div>
      </div>

      {/* Monaco editor */}
      <div style={{ background: T.editorBg }}>
        <Editor
          key={`${activeTab}-${dark}`}
          height={editorHeight}
          beforeMount={setupOpenCalcMonaco}
          language={MONACO_LANG[activeTab]}
          value={editorValue}
          onChange={handleEditorChange}
          theme={monacoTheme || (dark ? "open-calc-dark" : "open-calc-light")}
          options={{
            fontSize: 13, lineHeight: 20,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: "on", tabSize: 2,
            readOnly: showSolution && activeTab === "js",
            renderLineHighlight: "none",
            overviewRulerLanes: 0, folding: false,
            lineDecorationsWidth: 6, lineNumbersMinChars: 3,
            padding: { top: 10, bottom: 10 },
          }}
        />
      </div>

      {/* Console */}
      {showConsole && <ConsolePanel logs={logs} T={T} />}

      {/* Challenge feedback */}
      {cell.type === "challenge" && (
        <div style={{
          minHeight: 44, padding: "10px 16px", borderTop: `1px solid ${T.border}`,
          background: !hasRun || !challengeState ? "transparent" : (challengeState === "pass" ? withAlpha(T.green, "14") : withAlpha(T.red, "12")),
          color: challengeState === "pass" ? T.green : (challengeState === "fail" ? T.red : T.muted),
          fontSize: 13, fontWeight: 500,
        }}>
          {!hasRun || !challengeState
            ? "Run your solution to unlock the next step."
            : (challengeState === "pass" ? (cell.successMessage || "✓ Challenge complete!") : (cell.failMessage || "✗ Not quite — try again."))}
          {challengeMessage && (
            <div style={{ marginTop: 6, fontWeight: 400, opacity: 0.9, whiteSpace: "pre-wrap" }}>
              {challengeMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main JSNotebook component ─────────────────────────────────────────────────
export default function JSNotebook({ lesson: lessonProp, params = {} }) {
  const lesson = lessonProp ?? params.lesson;
  const { title, subtitle, cells = [] } = lesson || {};
  const dark = useIsDark();
  const T = makeT(dark);
  const { themeStyles } = useGlobalTheme();
  const monacoTheme = themeStyles?.monaco || (dark ? "open-calc-dark" : "open-calc-light");

  if (!lesson) return null;

  return (
    <div style={{ fontFamily: "var(--font-sans, system-ui)", color: T.text, padding: "4px 0" }}>
      {title && (
        <div style={{ marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: T.accent, marginBottom: 5 }}>
            Interactive Lesson
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: T.text, marginBottom: subtitle ? 6 : 0 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 14, color: T.muted, lineHeight: 1.6 }}>{subtitle}</div>}
        </div>
      )}
      {cells.map((cell, i) => (
        <NotebookCell key={`${title}-${i}`} cell={cell} cellIndex={i} T={T} dark={dark} monacoTheme={monacoTheme} />
      ))}
    </div>
  );
}
