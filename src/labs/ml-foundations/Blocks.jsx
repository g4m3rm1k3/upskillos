import React, { useState } from 'react'
import Markdown from '../qmaze-lab/Markdown.jsx'
import { tokenizePython } from '../a-arcade-python/analysis.js'
import { PIECES } from './python/pieces.js'

// The Understand stage is an ordered list of blocks:
//   { h }                                   a heading
//   { md }                                  Markdown with LaTeX
//   { note, kind: 'key' | 'warn' | 'ml' }   a callout ('ml' = what this is called in machine learning)
//   { code: { piece | text, notes: [[lineText, note]] } }   real code, with a note beside lines that matter
//   { mathCode: [[tex, code, meaning]] }    each symbol beside the variable that holds it
//   { names: [[here, ml, why]] }            this lab's words beside the ML words
//   { predict: { id, prompt, answer, tolerance, misconceptions, explain } }
//   { choice: { id, prompt, options: [{ text, why }], answer, explain } }
//   { figure: Component, props }            any interactive picture
const Md = ({ children }) => <div className="mlf-md"><Markdown>{children}</Markdown></div>
const Inline = ({ children }) => <Markdown inline>{String(children)}</Markdown>

function Code({ spec }) {
  const text = spec.text ?? PIECES[spec.piece].code
  const notes = spec.notes ?? []
  const used = new Set()
  return (
    <figure className="mlf-annotated">
      {text.split('\n').map((line, k) => {
        const n = notes.findIndex(([has], i) => !used.has(i) && line.includes(has))
        if (n >= 0) used.add(n)
        return (
          <div key={k} className={`mlf-annotated-row${n >= 0 ? ' noted' : ''}`}>
            <pre><span className="mlf-ln">{k + 1}</span><code>{tokenizePython(line).map((t, i) => <span key={i} className={`tk-${t.kind}`}>{t.text}</span>)}{line === '' ? ' ' : ''}</code></pre>
            {n >= 0 && <div className="mlf-annotated-note"><Inline>{notes[n][1]}</Inline></div>}
          </div>
        )
      })}
    </figure>
  )
}

// "What you need to know": the rule or worked example a question can be reasoned from. Every
// question should be answerable from what comes just before it, so a try is an educated guess.
export const Teach = ({ children }) => children ? (
  <div className="mlf-teach"><p className="mlf-eyebrow">What you need to know</p><Md>{children}</Md></div>
) : null

export function Predict({ spec, done, onDone }) {
  const [value, setValue] = useState('')
  const [state, setState] = useState(done ? 'solved' : null)
  const [tries, setTries] = useState(0)
  function check(e) {
    e.preventDefault()
    const n = Number(value.trim())
    if (!value.trim() || Number.isNaN(n)) { setState({ feedback: 'Type a number, like 12 or 0.85.' }); return }
    const tol = spec.tolerance ?? 1e-6
    if (Math.abs(n - spec.answer) <= tol) { setState('solved'); onDone?.(); return }
    setTries(t => t + 1)
    const miss = spec.misconceptions?.find(m => Math.abs(n - m.answer) <= (m.tolerance ?? tol))
    setState({ feedback: miss?.feedback ?? 'Not yet. Go back to "What you need to know" and work it through step by step, or press “Show me the answer”.' })
  }
  const open = state !== 'solved' && state !== 'shown'
  return (
    <div className="mlf-check">
      <p className="mlf-eyebrow">Predict, then check</p>
      <Teach>{spec.teach}</Teach>
      <Md>{spec.prompt}</Md>
      {open && <form onSubmit={check} className="mlf-ask-form">
        <input aria-label="Your answer" value={value} onChange={e => setValue(e.target.value)} placeholder="a number" inputMode="decimal" />
        <button className="mlf-primary">Check</button>
        <button type="button" className="mlf-quiet" onClick={() => { setState('shown'); onDone?.() }}>{tries ? 'Show me the answer' : 'Skip: show me the answer'}</button>
      </form>}
      {state?.feedback && <div className="mlf-feedback bad" role="status"><Md>{state.feedback}</Md></div>}
      {!open && <div className="mlf-feedback good" role="status"><strong>{state === 'solved' ? '✓ Right: ' : 'The answer: '}{spec.answer}</strong><p className="mlf-why-label">Why:</p><Md>{spec.explain}</Md></div>}
    </div>
  )
}

export function Choice({ spec, done, onDone }) {
  const [picked, setPicked] = useState(done ? spec.answer : null)
  const [submitted, setSubmitted] = useState(done)
  const [shown, setShown] = useState(false)
  const right = submitted && picked === spec.answer
  const finished = right || shown
  // Why the right answer is right: its own reason, plus the question's general explanation if any.
  const whyRight = [spec.options[spec.answer].why?.replace(/^(Right|Yes)[.:,]?\s*/, ''), spec.explain].filter(Boolean).join('\n\n')
  return (
    <div className="mlf-check">
      <p className="mlf-eyebrow">Check your understanding</p>
      <Teach>{spec.teach}</Teach>
      <Md>{spec.prompt}</Md>
      <div className="mlf-options" role="radiogroup" aria-label={spec.prompt}>
        {spec.options.map((o, i) => (
          <label key={i} className={`mlf-option${(submitted && picked === i) || (shown && i === spec.answer) ? (i === spec.answer ? ' right' : ' wrong') : ''}`}>
            <input type="radio" name={spec.id} checked={picked === i} onChange={() => { setPicked(i); setSubmitted(false) }} disabled={finished} />
            <span><Inline>{o.text}</Inline></span>
          </label>
        ))}
      </div>
      {!finished && (
        <div className="mlf-ask-form">
          <button type="button" className="mlf-primary" disabled={picked === null} onClick={() => { setSubmitted(true); if (picked === spec.answer) onDone?.() }}>Check</button>
          {submitted && <button type="button" className="mlf-quiet" onClick={() => { setShown(true); onDone?.() }}>Show me the answer</button>}
        </div>
      )}
      {submitted && picked !== null && picked !== spec.answer && !shown && (
        <div className="mlf-feedback bad" role="status"><strong>Not this one. </strong><Md>{spec.options[picked].why ?? 'Read "What you need to know" again and try another.'}</Md></div>
      )}
      {finished && (
        <div className="mlf-feedback good" role="status">
          <strong>{right ? '✓ Right.' : <>The answer: <Inline>{spec.options[spec.answer].text}</Inline></>}</strong>
          <p className="mlf-why-label">Why:</p>
          <Md>{whyRight}</Md>
        </div>
      )}
    </div>
  )
}

export default function Blocks({ blocks, solved = [], onSolved, custom }) {
  return blocks.map((b, k) => {
    if (custom && b.custom) return <React.Fragment key={k}>{custom(b.custom)}</React.Fragment>
    if (b.h) return <h3 key={k} className="mlf-h">{b.h}</h3>
    if (b.md) return <Md key={k}>{b.md}</Md>
    if (b.note) return <aside key={k} className={`mlf-note ${b.kind ?? 'key'}`}><p className="mlf-eyebrow">{{ key: 'Key idea', warn: 'Watch out', ml: 'In machine learning', how: 'How it works' }[b.kind ?? 'key']}</p><Md>{b.note}</Md></aside>
    if (b.code) return <Code key={k} spec={b.code} />
    if (b.mathCode) return (
      <table key={k} className="mlf-table"><thead><tr><th>Maths</th><th>Code</th><th>What it is</th></tr></thead>
        <tbody>{b.mathCode.map(([tex, code, meaning], i) => <tr key={i}><td><Inline>{`$${tex}$`}</Inline></td><td><code>{code}</code></td><td><Inline>{meaning}</Inline></td></tr>)}</tbody></table>
    )
    if (b.names) return (
      <table key={k} className="mlf-table"><thead><tr><th>In this lab</th><th>In machine learning</th><th>Why that name</th></tr></thead>
        <tbody>{b.names.map(([here, ml, why], i) => <tr key={i}><td><Inline>{here}</Inline></td><td><strong>{ml}</strong></td><td><Inline>{why}</Inline></td></tr>)}</tbody></table>
    )
    if (b.predict) return <Predict key={b.predict.id} spec={b.predict} done={solved.includes(b.predict.id)} onDone={() => onSolved?.(b.predict.id)} />
    if (b.choice) return <Choice key={b.choice.id} spec={b.choice} done={solved.includes(b.choice.id)} onDone={() => onSolved?.(b.choice.id)} />
    if (b.figure) { const F = b.figure; return <figure key={k} className="mlf-figure"><F {...(b.props ?? {})} />{b.caption && <figcaption><Inline>{b.caption}</Inline></figcaption>}</figure> }
    return null
  })
}

// Every check id in a list of blocks (for counting what is left).
export const checkIds = blocks => blocks.flatMap(b => (b.predict ? [b.predict.id] : b.choice ? [b.choice.id] : []))
