import React, { Suspense, lazy, useState } from 'react'
import LessonText from './LessonText.jsx'
import StaticCodeBlock from '../../components/markdown/StaticCodeBlock.jsx'
import { resolveLinks, COURSE_NAMES } from './kit/mathLinks.js'

const PythonNotebook = lazy(() => import('../../components/notebooks/PythonNotebook.jsx'))

// Each symbol in the lesson's math next to the code that holds it.
// mathCode: { rows: [[math (LaTeX allowed), code, meaning]], code?: { language, source, caption } }
export function MathCode({ mathCode }) {
  if (!mathCode) return null
  return <div className="ml-mathcode">
    <table><thead><tr><th>Math</th><th>Code</th><th>What it is</th></tr></thead>
      <tbody>{mathCode.rows.map(([m, c, meaning], i) => <tr key={i}><td><LessonText>{m}</LessonText></td><td><code>{c}</code></td><td><LessonText>{meaning}</LessonText></td></tr>)}</tbody></table>
    {mathCode.code && <>{mathCode.code.caption && <p className="ml-caption"><LessonText>{mathCode.code.caption}</LessonText></p>}<StaticCodeBlock language={mathCode.code.language ?? 'python'} code={mathCode.code.source} /></>}
  </div>
}

// Runnable Python cells: here in the lesson, or copied into Notebook Lab to keep.
const NOTEBOOK_KEY = 'oc-notebook-lab'
function saveToNotebookLab(title, cells) {
  const id = `nb-ml-${Date.now()}`
  const nb = { id, name: title, createdAt: Date.now(), updatedAt: Date.now(), cells: cells.map((c, i) => ({ id: `cell-${i + 1}`, cellTitle: c.title ?? '', prose: c.prose ?? '', instructions: '', code: c.code, output: '', status: 'idle', figureJson: null })) }
  try { const db = JSON.parse(localStorage.getItem(NOTEBOOK_KEY) ?? '{}'); db[id] = nb; localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(db)); return true } catch { return false }
}
export function NotebookCells({ notebook, lessonTitle }) {
  const [open, setOpen] = useState(false), [saved, setSaved] = useState(null)
  if (!notebook) return null
  const cells = notebook.cells.map((c, i) => ({ id: `cell-${i + 1}`, cellTitle: c.title, prose: c.prose, code: c.code, output: '', status: 'idle', figureJson: null }))
  return <div className="ml-runcells">
    <span className="ml-eyebrow">Run the math</span>
    <p><LessonText>{notebook.intro}</LessonText></p>
    <div className="ml-actions">
      <button onClick={() => setOpen(o => !o)}>{open ? 'Hide the notebook cells' : `Open ${notebook.cells.length} notebook cells here`}</button>
      <button onClick={() => { const ok = saveToNotebookLab(notebook.title ?? lessonTitle, notebook.cells); setSaved(ok); if (ok) window.open('#/notebook-lab', '_blank', 'noopener') }}>Copy to Notebook Lab ↗</button>
    </div>
    {saved === false && <p className="ml-warning" role="status">Could not save to this browser’s storage.</p>}
    {saved && <p className="ml-caption" role="status">Saved as “{notebook.title ?? lessonTitle}” in Notebook Lab, where you can edit it, keep it and export it as .ipynb.</p>}
    {open && <Suspense fallback={<p className="ml-caption" role="status">Loading Python…</p>}><PythonNotebook params={{ initialCells: cells }} /></Suspense>}
  </div>
}

// Where the same math is taught in depth elsewhere in the app.
export function MathLinks({ lessonKeys, labKeys }) {
  const own = resolveLinks(lessonKeys), shared = resolveLinks((labKeys ?? []).filter(k => !(lessonKeys ?? []).includes(k)))
  if (!own.length && !shared.length) return null
  const item = l => <li key={l.key}><a href={`#${l.href}`} target="_blank" rel="noreferrer">{l.kind === 'lesson' ? <><span className="ml-link-course">{COURSE_NAMES[l.course]}</span> · {l.title}</> : <><span className="ml-link-course">{l.kind === 'tool' ? 'Tool' : 'Reference'}</span> · {l.title}</>} ↗</a>{l.note && <span className="ml-caption"> — {l.note}</span>}</li>
  return <details className="ml-mathlinks">
    <summary>Go deeper: where this math is taught in the app ({own.length + shared.length})</summary>
    <p className="ml-caption">This lesson teaches the math it uses. These links open the app’s own courses and tools in a new tab, for practice, proofs and more examples.</p>
    {own.length > 0 && <><h4>For this lesson</h4><ul>{own.map(item)}</ul></>}
    {shared.length > 0 && <><h4>For this whole lab</h4><ul>{shared.map(item)}</ul></>}
  </details>
}
