import React, { Suspense, lazy, useState } from 'react'
import LessonText from './LessonText.jsx'
import StaticCodeBlock from '../../components/markdown/StaticCodeBlock.jsx'
import { resolveLinks, COURSE_NAMES } from './kit/mathLinks.js'


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

// Runnable Python cells, in a worker, with the learner's edits saved as drafts (notebook/).
const LessonNotebook = lazy(() => import('./notebook/LessonNotebook.jsx'))
export function NotebookCells({ id, notebook }) {
  const [open, setOpen] = useState(false)
  if (!notebook) return null
  return <div className="ml-runcells">
    <span className="ml-eyebrow">Run the math</span>
    <p><LessonText>{notebook.intro}</LessonText></p>
    <div className="ml-actions"><button aria-expanded={open} onClick={() => setOpen(o => !o)}>{open ? 'Hide the notebook cells' : `Open ${notebook.cells.length} notebook cells here`}</button></div>
    {open && <Suspense fallback={<p className="ml-caption" role="status">Loading the notebook…</p>}><LessonNotebook id={id} notebook={notebook} /></Suspense>}
    {!open && <p className="ml-caption">Your edits are saved on this device and kept when you hide the cells or change lessons.</p>}
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
