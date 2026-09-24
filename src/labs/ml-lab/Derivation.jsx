import React, { useState } from 'react'
import LessonText from './LessonText.jsx'
import { equivalent } from './kit/expr.js'

// "Derive it yourself": a sequence of steps, each answered with a formula
// (checked by evaluation at many random points) or a number. A step unlocks
// once the previous one is solved or revealed; progress saves with the lesson.
export default function Derivation({ derivation, saved, onSave }) {
  const state = saved.derivation ?? {}, solved = state.solved ?? [], revealed = state.revealed ?? []
  const [inputs, setInputs] = useState({}), [feedback, setFeedback] = useState({}), [hints, setHints] = useState({})
  const done = i => solved.includes(i) || revealed.includes(i)
  const record = (key, i) => onSave({ ...saved, derivation: { solved, revealed, [key]: [...new Set([...(state[key] ?? []), i])] } })
  const visible = derivation.steps.findIndex((_, i) => !done(i))
  const shown = visible < 0 ? derivation.steps.length : visible + 1
  const check = (step, i) => {
    const value = (inputs[i] ?? '').trim()
    if (!value) return setFeedback(f => ({ ...f, [i]: 'Type your answer first.' }))
    let ok, message
    if (step.number !== undefined) {
      ok = Number.isFinite(Number(value)) && Math.abs(Number(value) - step.number) <= (step.tolerance ?? 1e-6)
      message = ok ? '' : 'Not quite — recompute the numbers.'
    } else {
      const r = equivalent(value, step.answer, step.vars)
      ok = r.ok
      message = r.error ? r.error : ok ? '' : r.at ? `Not equal to the correct expression — at ${Object.entries(r.at).map(([k, v]) => `${k} = ${v.toFixed(2)}`).join(', ')} yours gives ${Number.isFinite(r.got) ? r.got.toFixed(4) : 'no number'}, the correct one ${r.expected.toFixed(4)}.` : 'Not equal to the correct expression.'
    }
    setFeedback(f => ({ ...f, [i]: ok ? 'Correct.' : message }))
    if (ok) record('solved', i)
  }
  const complete = derivation.steps.every((_, i) => done(i))
  return <section className="ml-derivation">
    <span className="ml-eyebrow">Derive it yourself · {solved.length}/{derivation.steps.length} steps solved</span>
    <h3><LessonText>{derivation.title}</LessonText></h3>
    {derivation.intro && <p><LessonText>{derivation.intro}</LessonText></p>}
    <p className="ml-caption">{`Type formulas with * or implicit multiplication (2x), ^ for powers, and exp( ), log( ), log2( ), sqrt( ), σ( ). Variables: ${[...new Set(derivation.steps.flatMap(s => Object.keys(s.vars ?? {})))].join(', ') || 'none'}. Greek letters can be typed as words (phi, eta, theta, tau, lambda, mu). Any algebraically equal form is accepted.`}</p>
    <ol>{derivation.steps.slice(0, shown).map((step, i) => <li key={i} className={done(i) ? 'done' : ''}>
      <p><LessonText>{step.prompt}</LessonText></p>
      {done(i) ? <p className="ml-derivation-answer"><span>{solved.includes(i) ? '✓ ' : 'Shown: '}</span><LessonText>{step.show ?? `\`${step.answer ?? step.number}\``}</LessonText>{step.why && <> — <LessonText>{step.why}</LessonText></>}</p> : <>
        <form onSubmit={e => { e.preventDefault(); check(step, i) }}>
          <input aria-label={`Derivation step ${i + 1}`} value={inputs[i] ?? ''} onChange={e => setInputs(v => ({ ...v, [i]: e.target.value }))} placeholder={step.number !== undefined ? 'A number' : 'A formula, e.g. 2(wx + b − y)x'} autoComplete="off" spellCheck={false} />
          <button>Check step</button>
        </form>
        {feedback[i] && <p role="status" className="ml-caption">{feedback[i]}</p>}
        <div className="ml-actions">
          {step.hint && <button type="button" onClick={() => setHints(h => ({ ...h, [i]: true }))}>Hint</button>}
          <button type="button" onClick={() => record('revealed', i)}>Show this step</button>
        </div>
        {hints[i] && <p className="ml-caption"><LessonText>{step.hint}</LessonText></p>}
      </>}
    </li>)}</ol>
    {complete && derivation.result && <p className="ml-derivation-result"><LessonText>{derivation.result}</LessonText></p>}
  </section>
}
