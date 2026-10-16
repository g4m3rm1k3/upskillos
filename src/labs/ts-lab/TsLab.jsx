import { useState, useCallback, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { setupOpenCalcMonaco } from '../../utils/monacoThemes.js'
import { useGlobalTheme } from '../../context/ThemeContext.jsx'
import { SANDBOX_HTML } from './sandbox.js'
import { LESSONS } from './lessons/index.js'
import MissionPanel from './MissionPanel.jsx'
import ConsolePanel from './ConsolePanel.jsx'

const LS_KEY = 'ts-lab-v2'

function loadCode(lessonId, fallback) {
  try { return localStorage.getItem(`${LS_KEY}:${lessonId}`) ?? fallback }
  catch { return fallback }
}

function saveCode(lessonId, code) {
  try { localStorage.setItem(`${LS_KEY}:${lessonId}`, code) } catch {}
}

function getInitialLessonIdx() {
  try {
    const n = parseInt(localStorage.getItem(`${LS_KEY}:lesson-idx`) ?? '0', 10)
    return isNaN(n) ? 0 : Math.max(0, Math.min(LESSONS.length - 1, n))
  } catch { return 0 }
}

export default function TsLab({ onBack }) {
  const { isDarkGlobal: isDark, themeStyles } = useGlobalTheme()

  const [lessonIdx, setLessonIdx] = useState(getInitialLessonIdx)
  const lesson = LESSONS[lessonIdx]

  const [code, setCode] = useState(() => loadCode(lesson.id, lesson.starter))
  const [entries, setEntries] = useState([])
  const [consoleH, setConsoleH] = useState(180)
  const [checkResult, setCheckResult] = useState(null) // { pass, message } | null

  // Column widths — mission is fixed, code takes remaining, preview is resizable
  const [missionW, setMissionW] = useState(310)
  const [previewW, setPreviewW] = useState(440)

  const iframeRef = useRef(null)
  const editorRef = useRef(null)
  const codeRef = useRef(code)
  const isDarkRef = useRef(isDark)

  // Keep refs in sync so the sandbox-ready handler always has current values
  useEffect(() => { codeRef.current = code }, [code])
  useEffect(() => { isDarkRef.current = isDark }, [isDark])

  // Clear stale v1 keys once on mount
  useEffect(() => {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('ts-lab-v1:'))
        .forEach(k => localStorage.removeItem(k))
    } catch {}
  }, [])

  // Persist code as user types
  useEffect(() => {
    saveCode(lesson.id, code)
  }, [code, lesson.id])

  // Handle messages from sandbox iframe — auto-run on sandbox-ready
  useEffect(() => {
    const handler = ({ data }) => {
      if (!data?.type) return
      const ts = Date.now()
      if (data.type === 'sandbox-ready') {
        // Sync theme before running so the initial render uses the right colours
        iframeRef.current?.contentWindow?.postMessage({ type: 'theme', isDark: isDarkRef.current }, '*')
        iframeRef.current?.contentWindow?.postMessage({ type: 'run', code: codeRef.current }, '*')
      } else if (data.type === 'console') {
        setEntries(prev => [...prev, { source: 'console', level: data.level, args: data.args, ts }])
      } else if (data.type === 'error') {
        setEntries(prev => [...prev, { source: 'error', message: data.message, ts }])
      } else if (data.type === 'event') {
        setEntries(prev => [...prev, { source: 'event', ...data, ts: data.ts ?? ts }])
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // Keep sandbox theme in sync with app theme
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'theme', isDark }, '*')
  }, [isDark])

  const handleRun = useCallback(() => {
    setEntries([])
    setCheckResult(null)
    iframeRef.current?.contentWindow?.postMessage({ type: 'run', code }, '*')
  }, [code])

  const handleCheck = useCallback(() => {
    if (!lesson.verify) return
    try {
      const doc = iframeRef.current?.contentDocument
      if (!doc || doc.body.children.length === 0) {
        setCheckResult({ pass: false, message: 'Run your code first, then hit Check' })
        return
      }
      setCheckResult(lesson.verify(doc))
    } catch (e) {
      setCheckResult({ pass: false, message: 'Could not check — run your code first' })
    }
  }, [lesson])

  const goToLesson = useCallback((idx) => {
    const l = LESSONS[idx]
    if (!l) return
    try { localStorage.setItem(`${LS_KEY}:lesson-idx`, String(idx)) } catch {}
    setLessonIdx(idx)
    const nextCode = loadCode(l.id, l.starter)
    codeRef.current = nextCode
    setCode(nextCode)
    setEntries([])
    // Auto-run the new lesson's code immediately
    iframeRef.current?.contentWindow?.postMessage({ type: 'run', code: nextCode }, '*')
  }, [])

  const startResize = useCallback((setter, getStart, min, max, dir = 1) => (e) => {
    const startX = e.clientX
    const startW = getStart()
    const overlay = document.createElement('div')
    overlay.style.cssText = 'position:fixed;inset:0;cursor:col-resize;z-index:9999'
    document.body.appendChild(overlay)
    const onMove = (e) => setter(Math.max(min, Math.min(max, startW + dir * (e.clientX - startX))))
    const onUp = () => { document.body.removeChild(overlay); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  const startConsoleResize = useCallback((e) => {
    const startY = e.clientY
    const startH = consoleH
    const overlay = document.createElement('div')
    overlay.style.cssText = 'position:fixed;inset:0;cursor:row-resize;z-index:9999'
    document.body.appendChild(overlay)
    const onMove = (e) => setConsoleH(Math.max(80, Math.min(400, startH - (e.clientY - startY))))
    const onUp = () => { document.body.removeChild(overlay); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [consoleH])

  const bg      = isDark ? '#0f172a' : '#f1f5f9'
  const border  = isDark ? '#1e293b' : '#e2e8f0'
  const divider = isDark ? '#334155' : '#cbd5e1'
  const accent  = '#2563eb'

  return (
    <div style={{ display: 'flex', height: '100vh', background: bg, overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>

      {/*
        Layout:
        ┌─── Mission ───┬─── Code Editor ────┬─── Preview ───┐
        │               │                    │               │
        │               ├────────────────────┤               │
        │               │ Console / Timeline │               │
        └───────────────┴────────────────────┴───────────────┘

        Mission + (Code + Console) form the left group.
        Preview is independent, full height.
      */}

      {/* Mission panel */}
      <div style={{ width: missionW, flexShrink: 0, borderRight: `1px solid ${border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <MissionPanel
          lesson={lesson}
          lessonIdx={lessonIdx}
          lessons={LESSONS}
          isDark={isDark}
          onSelectLesson={goToLesson}
          onBack={onBack}
        />
      </div>

      {/* Divider: mission / code */}
      <div
        onMouseDown={startResize(setMissionW, () => missionW, 200, 480)}
        style={{ width: 4, cursor: 'col-resize', background: divider, flexShrink: 0, opacity: 0.5 }}
      />

      {/* Code + Console column */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top: editor header */}
        <div style={{ borderBottom: `1px solid ${border}`, padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: isDark ? '#0f172a' : '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 11, fontFamily: 'monospace', padding: '2px 8px', borderRadius: 4,
              background: isDark ? '#1e293b' : '#f1f5f9', color: isDark ? '#94a3b8' : '#475569',
            }}>
              main.ts
            </span>
            <span style={{ fontSize: 10, color: isDark ? '#475569' : '#94a3b8' }}>TypeScript</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: isDark ? '#475569' : '#94a3b8' }}>⌘↵</span>
            {lesson.verify && (
              <button
                onClick={handleCheck}
                style={{
                  padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', letterSpacing: '0.03em',
                  border: `1px solid ${checkResult ? (checkResult.pass ? '#10b981' : '#f59e0b') : (isDark ? '#334155' : '#e2e8f0')}`,
                  background: checkResult ? (checkResult.pass ? '#dcfce7' : '#fef3c7') : 'none',
                  color: checkResult ? (checkResult.pass ? '#166534' : '#92400e') : (isDark ? '#64748b' : '#94a3b8'),
                }}
              >
                {checkResult ? (checkResult.pass ? '✓ Passed' : '✗ Check') : '✓ Check'}
              </button>
            )}
            <button
              onClick={handleRun}
              style={{
                padding: '5px 16px', borderRadius: 6, border: 'none',
                background: accent, color: '#fff', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', letterSpacing: '0.03em',
              }}
            >
              ▶ Run
            </button>
          </div>
        </div>

        {/* Check result banner */}
        {checkResult && (
          <div style={{
            padding: '8px 14px', fontSize: 12, flexShrink: 0, fontFamily: 'system-ui',
            background: checkResult.pass ? (isDark ? 'rgba(16,185,129,0.1)' : '#dcfce7') : (isDark ? 'rgba(245,158,11,0.1)' : '#fef3c7'),
            borderBottom: `1px solid ${checkResult.pass ? (isDark ? '#064e3b' : '#bbf7d0') : (isDark ? '#78350f' : '#fcd34d')}`,
            color: checkResult.pass ? (isDark ? '#34d399' : '#166534') : (isDark ? '#fcd34d' : '#92400e'),
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontWeight: 700 }}>{checkResult.pass ? '✓' : '→'}</span>
            <span>{checkResult.message}</span>
            <button onClick={() => setCheckResult(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 14, padding: '0 2px', lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* Monaco editor */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <Editor
            language="typescript"
            value={code}
            theme={themeStyles.monaco}
            beforeMount={setupOpenCalcMonaco}
            onMount={(editor, monaco) => {
              editorRef.current = editor
              // Let top-level await work without errors — the sandbox wraps code
              // in an async IIFE at runtime so this is always valid.
              // These options are shared by every TypeScript editor in the app, so
              // keep the others' settings. allowNonTsExtensions above all: the
              // editor's model is 'inmemory://model/1', with no .ts, and without
              // it TypeScript leaves the file out ("Could not find source file")
              // and nothing is ever underlined.
              monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
                ...monaco.languages.typescript.typescriptDefaults.getCompilerOptions(),
                allowNonTsExtensions: true,
                target: monaco.languages.typescript.ScriptTarget.ESNext,
                module: monaco.languages.typescript.ModuleKind.ESNext,
                strict: false,
                noEmit: true,
                lib: ['es2022', 'dom'],
              })
              monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
                // 1375: file has no imports/exports (not relevant in sandbox)
                // 1378: top-level await needs module target (we handle this at runtime)
                diagnosticCodesToIgnore: [1375, 1378],
              })
              editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, handleRun)
            }}
            onChange={(val) => setCode(val ?? '')}
            options={{
              fontSize: 13,
              lineHeight: 21,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
              fontLigatures: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              padding: { top: 12, bottom: 12 },
              tabSize: 2,
              wordWrap: 'on',
              lineNumbers: 'on',
              glyphMargin: false,
              folding: true,
              lineDecorationsWidth: 4,
              renderLineHighlight: 'gutter',
            }}
          />
        </div>

        {/* Console resize handle */}
        <div
          onMouseDown={startConsoleResize}
          style={{ height: 4, cursor: 'row-resize', background: divider, flexShrink: 0, opacity: 0.5 }}
        />

        {/* Console / event timeline */}
        <div style={{ height: consoleH, flexShrink: 0, borderTop: `1px solid ${border}`, overflow: 'hidden' }}>
          <ConsolePanel
            entries={entries}
            onClear={() => setEntries([])}
            isDark={isDark}
          />
        </div>
      </div>

      {/* Divider: code / preview */}
      <div
        onMouseDown={startResize(setPreviewW, () => previewW, 280, 800, -1)}
        style={{ width: 4, cursor: 'col-resize', background: divider, flexShrink: 0, opacity: 0.5 }}
      />

      {/* Preview — full height, independent of console */}
      <div style={{ width: previewW, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }}>
        {/* Preview header */}
        <div style={{ padding: '6px 12px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, background: isDark ? '#1e293b' : '#f8fafc' }}>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
          </div>
          <span style={{ fontSize: 11, color: isDark ? '#475569' : '#94a3b8', marginLeft: 4 }}>Preview</span>
        </div>
        <iframe
          ref={iframeRef}
          srcDoc={SANDBOX_HTML}
          sandbox="allow-scripts allow-same-origin"
          style={{ flex: 1, border: 'none', display: 'block' }}
          title="TypeScript preview"
        />
      </div>
    </div>
  )
}
