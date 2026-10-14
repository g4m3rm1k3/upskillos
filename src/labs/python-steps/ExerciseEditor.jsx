// The exercise editor: Monaco, sized to the code. The labs keep one light palette whatever the app's
// theme, so the editor always uses the light theme to match the page around it.
import Editor from '@monaco-editor/react'
import { setupOpenCalcMonaco } from '../../utils/monacoThemes.js'

export default function ExerciseEditor({ code, onChange }) {
  const lines = Math.min(28, Math.max(6, code.split('\n').length + 2))
  return <div className="ps-exercise-editor">
    <Editor height={`${lines * 19 + 24}px`} language="python" value={code} onChange={v => onChange(v ?? '')} beforeMount={setupOpenCalcMonaco}
      theme="open-calc-light"
      loading={<p className="qm-hint">Loading the editor…</p>}
      options={{ ariaLabel: 'Your Python', minimap: { enabled: false }, lineNumbers: 'on', tabSize: 4, insertSpaces: true, automaticLayout: true, scrollBeyondLastLine: false, fontSize: 13, padding: { top: 8, bottom: 8 } }} />
  </div>
}
