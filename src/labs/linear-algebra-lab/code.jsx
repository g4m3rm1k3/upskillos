// Code surfaces for the lab: an editable Monaco editor and a read-only highlighted view.
// Both use one token palette (keywords, built-ins, numbers, strings, comments), so a line looks
// the same whether the learner is editing it, reading a reference, or reading a line note.
import { useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import Prism from '../../utils/prism.js'
import 'prismjs/components/prism-matlab'
import { setupOpenCalcMonaco } from '../../utils/monacoThemes.js'

const TOKENS = {
  dark: { comment: '7f8796', keyword: 'f472b6', predefined: '67e8f9', 'type.identifier': 'fbbf24', number: 'fdba74', string: '86efac', operator: 'c4b5fd', delimiter: '9ca3af', identifier: 'e5e7eb' },
  light: { comment: '8a8f98', keyword: 'be185d', predefined: '0e7490', 'type.identifier': 'a16207', number: 'c2410c', string: '15803d', operator: '6d28d9', delimiter: '6b7280', identifier: '1f2937' },
}

function defineThemes(monaco) {
  setupOpenCalcMonaco(monaco)
  for (const [mode, colors] of Object.entries(TOKENS)) {
    monaco.editor.defineTheme(`la-${mode}`, {
      base: mode === 'dark' ? 'vs-dark' : 'vs', inherit: true,
      rules: Object.entries(colors).map(([token, foreground]) => ({ token, foreground, ...(token === 'comment' && { fontStyle: 'italic' }), ...(token === 'keyword' && { fontStyle: 'bold' }) })),
      colors: mode === 'dark'
        ? { 'editor.background': '#12141a', 'editor.foreground': '#e5e7eb', 'editorLineNumber.foreground': '#4b5263', 'editorLineNumber.activeForeground': '#c4b5fd', 'editor.lineHighlightBackground': '#1b1e27', 'editor.selectionBackground': '#3b3162', 'editorCursor.foreground': '#f472b6', 'editorIndentGuide.background1': '#262a35' }
        : { 'editor.background': '#fbfbfa', 'editor.foreground': '#1f2937', 'editorLineNumber.foreground': '#b4b8c0', 'editorLineNumber.activeForeground': '#6d28d9', 'editor.lineHighlightBackground': '#f3f1fb', 'editor.selectionBackground': '#ddd6fe', 'editorCursor.foreground': '#be185d', 'editorIndentGuide.background1': '#ececec' },
    })
  }
}

// The editor grows with its content (no inner scrollbar for lesson-sized programs).
// Ctrl/Cmd + Enter runs; the latest run function is read through a ref so the binding never goes stale.
export function CodeEditor({ label, code, onChange, onRun, disabled, dark }) {
  const [height, setHeight] = useState(Math.max(6, code.split('\n').length + 1) * 21 + 24)
  const run = useRef(onRun)
  run.current = disabled ? () => {} : onRun
  return <div className="la-editor">
    <div className="la-editor-bar"><span className="la-dots" aria-hidden="true"><i /><i /><i /></span><span>{label}</span><kbd>Ctrl ↵ to run</kbd></div>
    <Editor height={`${Math.min(height, 620)}px`} language="openmat" value={code} theme={dark ? 'la-dark' : 'la-light'}
      beforeMount={defineThemes} onChange={value => onChange(value ?? '')}
      onMount={(editor, monaco) => {
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => run.current())
        editor.onDidContentSizeChange(event => setHeight(event.contentHeight + 4))
      }}
      loading={<pre className="la-code la-editor-loading">{code}</pre>}
      options={{ ariaLabel: label, minimap: { enabled: false }, fontSize: 13.5, lineHeight: 21, fontFamily: "'JetBrains Mono', 'Cascadia Code', ui-monospace, monospace", fontLigatures: true, padding: { top: 12, bottom: 12 }, scrollBeyondLastLine: false, automaticLayout: true, tabSize: 2, renderLineHighlight: 'line', overviewRulerLanes: 0, hideCursorInOverviewRuler: true, scrollbar: { alwaysConsumeMouseWheel: false, verticalScrollbarSize: 8 }, wordWrap: 'off', guides: { indentation: true } }} />
  </div>
}

// Read-only highlighted code (given data, references, line notes, the syntax guide).
export function CodeView({ code, inline = false, label, copy = false }) {
  const html = Prism.highlight(code, Prism.languages.matlab, 'matlab')
  const [copied, setCopied] = useState(false)
  useEffect(() => { if (!copied) return; const t = setTimeout(() => setCopied(false), 1400); return () => clearTimeout(t) }, [copied])
  if (inline) return <code className="la-code la-code-inline" dangerouslySetInnerHTML={{ __html: html }} />
  return <div className="la-code-block">
    {copy && <button type="button" className="la-copy" onClick={() => { navigator.clipboard?.writeText(code).then(() => setCopied(true), () => {}) }}>{copied ? 'Copied' : 'Copy'}</button>}
    <pre className="la-code" aria-label={label}><code dangerouslySetInnerHTML={{ __html: html }} /></pre>
  </div>
}
