import React, { Suspense, lazy, useEffect, useState } from 'react'
import LessonText from './LessonText.jsx'
import { useNotebook, NotebookCell, NotebookToolbar } from './notebook/LessonNotebook.jsx'
const Ladder = lazy(() => import('./Ladder.jsx'))

// A lesson told in order: each paragraph followed by what makes it concrete — a small
// interactive figure, the runnable cell that computes it, or a prediction to commit to.
//
// lesson.blocks: [
//   { p: 2 }                                    paragraph 2 with its section heading
//   { figure: 'rowDot', props: {…}, caption }   a component from the lab's figures module
//   { cell: 1 }                                  notebook cell 1, runnable in place
//   { predict: { prompt, answer, tolerance, explain } }   commit to a number, then see why
//   { math: true } / { derivation: true }        place the Math ↔ code block or the derivation
//   { ladder: 'prediction' }                     the lab's coding ladder of that name (lab.ladders)
// ]
// Paragraphs, cells, the math block and the derivation that a lesson does not place still
// appear, after the placed blocks, so nothing is lost. The full notebook stays available
// at the end, sharing the same drafts and variables as the inline cells.

const figureModules = {}
function useFigures(lab) {
  const [mod, setMod] = useState(() => figureModules[lab.number] ?? null)
  useEffect(() => {
    if (mod || !lab.figures) return undefined
    let live = true
    lab.figures().then(m => { figureModules[lab.number] = m; if (live) setMod(m) })
    return () => { live = false }
  }, [lab, mod])
  return mod
}

function Figure({ figures, block }) {
  const Component = figures?.[block.figure]
  return <figure className="ml-inline-figure">
    {Component ? <Component {...(block.props ?? {})} /> : <p className="ml-caption" role="status">Loading the figure…</p>}
    {block.caption && <figcaption className="ml-caption"><LessonText>{block.caption}</LessonText></figcaption>}
  </figure>
}

export function Predict({ spec, done, onDone }) {
  const [value, setValue] = useState(''), [state, setState] = useState(done ? 'solved' : 'open')
  const tolerance = spec.tolerance ?? 1e-6
  const check = e => {
    e.preventDefault()
    const n = Number(value)
    if (value.trim() === '' || !Number.isFinite(n)) return
    const hit = spec.misconceptions?.find(m => Math.abs(n - m.answer) <= tolerance)
    if (Math.abs(n - spec.answer) <= tolerance) { setState('solved'); onDone() } else setState(hit ? { feedback: hit.feedback } : 'wrong')
  }
  return <div className="ml-predict">
    <span className="ml-eyebrow">Predict before you read on</span>
    <p><LessonText>{spec.prompt}</LessonText></p>
    {state !== 'solved' && state !== 'shown' && <form onSubmit={check}>
      <input aria-label="Your prediction" value={value} onChange={e => setValue(e.target.value)} placeholder="Your number" inputMode="decimal" />
      <button>Check</button>
      <button type="button" onClick={() => setState('shown')}>Show me</button>
    </form>}
    {state === 'wrong' && <p className="ml-caption" role="status">Not yet. Work it through once more, or press “Show me”.</p>}
    {state?.feedback && <p className="ml-caption" role="status"><LessonText>{state.feedback}</LessonText></p>}
    {(state === 'solved' || state === 'shown') && <p role="status"><strong>{state === 'solved' ? 'Right: ' : 'Answer: '}{spec.answer}.</strong> <LessonText>{spec.explain}</LessonText></p>}
  </div>
}

function Prose({ lesson, i }) {
  return <section className="ml-reading-section"><h3><LessonText>{lesson.sections?.[i] || `Step ${i + 1}`}</LessonText></h3><p><LessonText>{lesson.paragraphs[i]}</LessonText></p></section>
}

function Flow({ lab, lesson, nb, saved, onSave, onUpdate, renderMath, renderDerivation }) {
  const figures = useFigures(lab)
  const blocks = lesson.blocks
  const placed = { p: new Set(), cell: new Set(), math: false, derivation: false }
  blocks.forEach(b => { if (b.p != null) placed.p.add(b.p); if (b.cell != null) placed.cell.add(b.cell); if (b.math) placed.math = true; if (b.derivation) placed.derivation = true })
  const solved = saved.predicted ?? []
  const markSolved = k => { if (!solved.includes(k)) onSave({ ...saved, predicted: [...solved, k] }) }
  const render = (b, k) => {
    if (b.p != null) return <Prose key={k} lesson={lesson} i={b.p} />
    if (b.figure) return <Figure key={k} figures={figures} block={b} />
    if (b.cell != null) return nb ? <NotebookCell key={k} nb={nb} i={b.cell} inline /> : null
    if (b.predict) return <Predict key={k} spec={b.predict} done={solved.includes(k)} onDone={() => markSolved(k)} />
    if (b.math) return <React.Fragment key={k}>{renderMath()}</React.Fragment>
    if (b.derivation) return <React.Fragment key={k}>{renderDerivation()}</React.Fragment>
    if (b.ladder) return lab.ladders?.[b.ladder] ? <Suspense key={k} fallback={<p className="ml-caption">Loading the practice ladder…</p>}><Ladder name={b.ladder} spec={lab.ladders[b.ladder]} saved={saved} onUpdate={onUpdate} /></Suspense> : null
    return null
  }
  const leftover = lesson.paragraphs.map((_, i) => i).filter(i => !placed.p.has(i))
  return <>
    <div className="ml-reading ml-flow">{blocks.map(render)}{leftover.map(i => <Prose key={`p${i}`} lesson={lesson} i={i} />)}</div>
    {!placed.math && renderMath()}
    {!placed.derivation && renderDerivation()}
    {nb && <WholeNotebook nb={nb} placedCells={placed.cell} />}
  </>
}

// The notebook's controls stay visible (Run all, Stop, restart, download, course-update notice);
// the complete list of cells renders only when opened, so no editor is created twice.
function WholeNotebook({ nb, placedCells }) {
  const [open, setOpen] = useState(false), n = nb.notebook.cells.length, unplaced = n - [...placedCells].filter(i => i < n).length
  return <section className="ml-runcells" aria-label="The whole notebook">
    <span className="ml-eyebrow">The whole notebook</span>
    <p className="ml-caption">The cells above belong to one notebook: they share variables and your edits are saved on this device.{unplaced ? ` ${unplaced} more cell${unplaced === 1 ? ' is' : 's are'} only in the full list.` : ''}</p>
    <NotebookToolbar nb={nb} />
    <div className="ml-actions"><button aria-expanded={open} onClick={() => setOpen(o => !o)}>{open ? 'Hide the full list of cells' : `Show all ${n} cells in order`}</button></div>
    {open && <div className="ml-nb">{nb.notebook.cells.map((_, i) => <NotebookCell key={i} nb={nb} i={i} />)}</div>}
  </section>
}

function FlowWithNotebook(props) {
  const nb = useNotebook(props.lesson.id, props.lesson.notebook)
  return <Flow {...props} nb={nb} />
}

export default function LessonFlow(props) {
  return props.lesson.notebook ? <FlowWithNotebook {...props} /> : <Flow {...props} nb={null} />
}
