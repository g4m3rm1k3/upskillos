import { useState } from 'react'
import Markdown from '../qmaze-lab/Markdown.jsx'
import { parseAnswer } from '../ml-lab/Checkpoint.jsx'
import { tokenizePython } from '../a-arcade-python/analysis.js'
import { FIGURES } from './figures/index.js'
import { codeLines } from './source.js'

// A lesson is an ordered list of blocks:
//   { h }                         a section heading
//   { md }                        Markdown with LaTeX ($…$ inline, $$…$$ display)
//   { figure, props, caption }    an interactive figure from figures/index.js
//   { code: { file, fn | from+to, notes: [[has, [bullets], { tex, calc, logic }?]], caption } }
//                                 real lines of python/<file>, each note's bullets shown under
//                                 the first line (in order) that contains its `has` text; tex and
//                                 logic are shown there too, and the Python tab uses all of it
//   { mathCode: [[tex, code, meaning]] }   every symbol beside the code that holds it
//   { predict: { prompt, answer, compute, tolerance, explain, misconceptions: [{ answer, feedback }] } }
//   { choice: { prompt, options: [{ text, why }], answer } }
//   { note, kind: 'key' | 'warn' | 'try' }   a callout
//   { python: { program, label } }  a button that opens the Python tab on that program

const Md = ({ children }) => <div className="qm-md"><Markdown>{children}</Markdown></div>
const LessonText = ({ children }) => <Markdown inline>{children}</Markdown>

function Code({ spec }) {
  const lines = codeLines(spec)
  const notes = [...(spec.notes ?? [])]
  return <figure className="qm-code">
    <figcaption><span className="mono">{spec.file}</span>{spec.fn ? <> · <span className="mono">{spec.fn}()</span></> : null}{spec.caption ? ` · ${spec.caption}` : ''}</figcaption>
    <div className="qm-code-body">
      {lines.map(({ n, text }) => {
        const k = notes.findIndex(([has]) => text.includes(has))
        const note = k === 0 ? notes.shift() : null
        const extra = note?.[2] ?? {}
        return <div key={n} className={`qm-code-row${note ? ' noted' : ''}`}>
          <pre className="qm-code-line"><span className="qm-ln">{n}</span><code>{tokenizePython(text).map((t, i) => <span key={i} className={`tk-${t.kind}`}>{t.text}</span>)}{text === '' ? ' ' : ''}</code></pre>
          {note && <ul className="qm-code-note">
            {note[1].map((b, i) => <li key={i}><LessonText>{b}</LessonText></li>)}
            {extra.tex && <li className="cp-note-tex"><span className="cp-tag">maths</span> <LessonText>{`$${extra.tex}$`}</LessonText></li>}
            {extra.logic && <li className="cp-note-logic"><span className="cp-tag">in words</span> <LessonText>{extra.logic}</LessonText></li>}
          </ul>}
        </div>
      })}
    </div>
  </figure>
}

function MathCode({ rows }) {
  return <table className="qm-mathcode"><thead><tr><th>Maths</th><th>Code</th><th>What it is</th></tr></thead>
    <tbody>{rows.map(([tex, code, meaning], i) => <tr key={i}><td><LessonText>{`$${tex}$`}</LessonText></td><td className="mono">{code}</td><td><LessonText>{meaning}</LessonText></td></tr>)}</tbody></table>
}

function Predict({ spec, done, onDone }) {
  const [value, setValue] = useState(''), [state, setState] = useState(done ? 'solved' : null)
  const check = e => {
    e.preventDefault()
    const { value: n, error } = parseAnswer(value)
    if (error) { setState({ error }); return }
    const tol = spec.tolerance ?? 1e-6
    const hit = spec.misconceptions?.find(m => Math.abs(n - m.answer) <= (m.tolerance ?? tol))
    if (Math.abs(n - spec.answer) <= tol) { setState('solved'); onDone() } else setState(hit ? { feedback: hit.feedback } : 'wrong')
  }
  const open = state !== 'solved' && state !== 'shown'
  return <div className="qm-check">
    <span className="qm-eyebrow">Predict, then check</span>
    <Md>{spec.prompt}</Md>
    {open && <form onSubmit={check}>
      <input aria-label="Your answer" value={value} onChange={e => setValue(e.target.value)} placeholder="Your number" inputMode="decimal" />
      <button>Check</button>
      <button type="button" className="qm-quiet" onClick={() => setState('shown')}>Show me</button>
    </form>}
    {state?.error && <p className="qm-feedback" role="status"><LessonText>{state.error}</LessonText></p>}
    {state === 'wrong' && <p className="qm-feedback" role="status">Not yet. Work through it once more, or press “Show me”.</p>}
    {state?.feedback && <div className="qm-feedback" role="status"><Md>{state.feedback}</Md></div>}
    {!open && <div className="qm-answer" role="status"><strong>{state === 'solved' ? 'Right: ' : 'Answer: '}{Number.isInteger(spec.answer) ? spec.answer : Number(spec.answer.toFixed(4))}</strong><Md>{spec.explain}</Md></div>}
  </div>
}

function Choice({ spec, done, onDone }) {
  const [picked, setPicked] = useState(done ? spec.answer : null), [submitted, setSubmitted] = useState(done)
  const right = submitted && picked === spec.answer
  return <div className="qm-check">
    <span className="qm-eyebrow">Check your understanding</span>
    <Md>{spec.prompt}</Md>
    <div className="qm-options" role="radiogroup">
      {spec.options.map((o, i) => <label key={i} className={`qm-option${submitted && i === picked ? (right ? ' right' : ' wrong') : ''}`}>
        <input type="radio" name={spec.prompt} checked={picked === i} onChange={() => { setPicked(i); setSubmitted(false) }} disabled={right} />
        <span><LessonText>{o.text}</LessonText></span>
      </label>)}
    </div>
    {!right && <button disabled={picked === null} onClick={() => { setSubmitted(true); if (picked === spec.answer) onDone() }}>Check</button>}
    {submitted && picked !== null && <div className={`qm-feedback${right ? ' good' : ''}`} role="status"><strong>{right ? 'Right. ' : 'Not this one. '}</strong><Md>{spec.options[picked].why}</Md></div>}
  </div>
}

function Figure({ block }) {
  const Component = FIGURES[block.figure]
  return <figure className="qm-figure">
    {Component ? <Component {...(block.props ?? {})} /> : <p className="qm-feedback">Missing figure: {block.figure}</p>}
    {block.caption && <figcaption><LessonText>{block.caption}</LessonText></figcaption>}
  </figure>
}

export default function Blocks({ lesson, saved, onSolved, onPython }) {
  const solved = saved?.solved ?? []
  return lesson.blocks.map((b, k) => {
    const key = `${lesson.id}:${k}`
    if (b.h) return <h2 key={k} className="qm-h">{b.h}</h2>
    if (b.md) return <Md key={k}>{b.md}</Md>
    if (b.figure) return <Figure key={k} block={b} />
    if (b.code) return <Code key={k} spec={b.code} />
    if (b.mathCode) return <MathCode key={k} rows={b.mathCode} />
    if (b.predict) return <Predict key={key} spec={b.predict} done={solved.includes(k)} onDone={() => onSolved(k)} />
    if (b.choice) return <Choice key={key} spec={b.choice} done={solved.includes(k)} onDone={() => onSolved(k)} />
    if (b.note) return <aside key={k} className={`qm-note ${b.kind ?? 'key'}`}><span className="qm-eyebrow">{{ key: 'Key idea', warn: 'Watch out', try: 'Try it' }[b.kind ?? 'key']}</span><Md>{b.note}</Md></aside>
    if (b.python) return <div key={k} className="qm-python-link"><button onClick={() => onPython?.(b.python)}>🐍 {b.python.label ?? 'Step through it in real Python'}</button><span>Desktop app: runs the real program one line at a time, every line explained.</span></div>
    return null
  })
}
