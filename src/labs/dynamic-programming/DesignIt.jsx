// "Design it yourself": before the explanation, the learner solves a small case by hand, then builds
// the DP one decision at a time (what a cell means, the last choice, the recurrence, base cases, fill
// order, where the answer is), then computes one cell with the design they chose. Content: lessons/designs.js.
import React, { useMemo, useState } from 'react'
import { KINDS, applyCell, displayOrder } from './lessons/designs.js'
import { TRACES, show } from './tables.js'
import { TREE_FOR } from './trees.js'
import { diagnose, parseCell } from './TableTrace.jsx'
import { readProgress, saveProgress } from './progress.js'

const LABEL = Object.fromEntries(KINDS)
const same = (a, b) => a === b || (typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 1e-9)

export function NumberCheck({ spec, label, onSolved, onShown, diagnoseGuess }) {
  const [text, setText] = useState('')
  const [state, setState] = useState(null)
  const [misses, setMisses] = useState(0)
  const done = state === 'solved' || state === 'shown'

  function submit(guess) {
    if (guess === undefined) { setState({ feedback: 'Type a number.' }); return }
    if (same(guess, spec.answer)) { setState('solved'); onSolved(misses); return }
    setMisses(m => m + 1)
    const hit = spec.misconceptions?.find(m => same(m.answer, guess))
    setState({ feedback: hit?.feedback || diagnoseGuess?.(guess) || 'Not yet. Work through it once more.' })
  }

  return (
    <div className="dp-di-check">
      <p className="dp-di-ask">{spec.prompt}</p>
      {!done && (spec.kind === 'yesno' ? (
        <div className="dp-di-yesno">
          <button type="button" className="dp-di-secondary" onClick={() => submit(true)}>Yes</button>
          <button type="button" className="dp-di-secondary" onClick={() => submit(false)}>No</button>
        </div>
      ) : (
        <form className="dp-di-form" onSubmit={e => { e.preventDefault(); submit(parseCell(text)) }}>
          <input aria-label={label} value={text} onChange={e => { setText(e.target.value); setState(null) }} placeholder="Your answer" inputMode="numeric" />
          <button type="submit" className="dp-primary">Check</button>
          {misses > 0 && <button type="button" className="dp-di-quiet" onClick={() => { setState('shown'); onShown() }}>Show me</button>}
        </form>
      ))}
      {state?.feedback && <p className="dp-tt-feedback is-bad" role="status">{state.feedback}</p>}
      {done && (
        <div className="dp-tt-feedback is-good" role="status">
          <strong>{state === 'solved' ? 'Right: ' : 'Answer: '}{spec.kind === 'yesno' ? (spec.answer ? 'yes' : 'no') : show(spec.answer)}. </strong>
          {spec.explain}
        </div>
      )}
    </div>
  )
}

export function Decision({ step, order, onRight }) {
  const [tried, setTried] = useState([])
  const right = step.options.findIndex(o => o.right)
  const solved = tried.includes(right)
  const last = tried[tried.length - 1]
  return (
    <div className="dp-di-check">
      <p className="dp-di-ask">{step.ask}</p>
      <div className="dp-di-options">
        {order.map(i => [step.options[i], i]).map(([o, i]) => (
          <button
            key={i}
            type="button"
            className={`dp-di-option ${tried.includes(i) ? (i === right ? 'is-right' : 'is-wrong') : ''}`}
            aria-pressed={tried.includes(i)}
            disabled={solved || tried.includes(i)}
            onClick={() => { const next = [...tried, i]; setTried(next); if (i === right) onRight(next.length - 1) }}
          >
            <span className="dp-di-mark" aria-hidden="true">{tried.includes(i) ? (i === right ? '✓' : '✗') : '○'}</span>
            <span>{o.text}</span>
          </button>
        ))}
      </div>
      {last !== undefined && (
        <p className={`dp-tt-feedback ${last === right ? 'is-good' : 'is-bad'}`} role="status">
          <strong>{last === right ? 'Yes. ' : 'Not this one. '}</strong>{step.options[last].why}
        </p>
      )}
    </div>
  )
}

export default function DesignIt({ id, design, revision, onProgress, onFinish }) {
  const saved = readProgress(id, revision).design
  const [phase, setPhase] = useState(saved?.done ? 'summary' : 0)
  const [misses, setMisses] = useState(saved?.misses ?? 0)
  const [assisted, setAssisted] = useState(saved?.assisted ?? false)
  const [ready, setReady] = useState(false)
  const applyTrace = useMemo(() => (design.apply.cell ? applyCell(id, design.apply) : null), [id, design])
  const total = design.steps.length + 2
  const index = phase === 'summary' ? total : phase

  function advance() {
    setReady(false)
    if (phase + 1 < total) { setPhase(phase + 1); return }
    setPhase('summary')
    const record = readProgress(id, revision)
    record.design = { done: true, misses, assisted }
    saveProgress(id, record)
    onProgress?.(id, record)
  }
  const solved = n => { setMisses(m => m + n); setReady(true) }
  const shown = () => { setAssisted(true); setReady(true) }

  const recurrence = design.steps.find(s => s.kind === 'recurrence')?.options.find(o => o.right)?.text
  const applySpec = applyTrace
    ? { prompt: `Use your design. The cells it reads are filled; what is ${applyTrace.trace.table.name(...design.apply.cell)}?`, answer: applyTrace.step.value, misconceptions: design.apply.misconceptions, explain: `${applyTrace.trace.table.name(...applyTrace.step.at)} = ${applyTrace.step.rule} → ${show(applyTrace.step.value)}.` }
    : design.apply

  const pills = ['Try it', ...design.steps.map(s => LABEL[s.kind]), 'Use it']
  return (
    <section className="dp-di" aria-label="Design it yourself">
      <div>
        <p className="dp-eyebrow">DESIGN IT YOURSELF · BEFORE THE EXPLANATION</p>
        <h3>Build the DP, one decision at a time</h3>
        <p className="dp-di-problem">{design.problem}</p>
      </div>

      <ol className="dp-di-pills" aria-label="Design steps">
        {pills.map((p, i) => (
          <li key={p} className={i < index ? 'is-done' : i === index ? 'is-now' : ''} aria-current={i === index ? 'step' : undefined}>{p}</li>
        ))}
      </ol>

      {index > 1 && (
        <div className="dp-di-card" aria-label="Your design so far">
          <p className="dp-eyebrow">YOUR DESIGN SO FAR</p>
          <dl>
            {design.steps.slice(0, Math.min(index - 1, design.steps.length)).map(s => (
              <React.Fragment key={s.kind}>
                <dt>{LABEL[s.kind]}</dt>
                <dd>{s.options.find(o => o.right).text}</dd>
              </React.Fragment>
            ))}
          </dl>
        </div>
      )}

      {phase === 0 && (
        <>
          <p className="dp-muted">No method yet: solve it by hand, any way you like. Notice how you did it.</p>
          <NumberCheck key="try" spec={design.tryFirst} label="Your answer to the small case" onSolved={solved} onShown={shown} />
        </>
      )}

      {typeof phase === 'number' && phase >= 1 && phase <= design.steps.length && (
        <>
          <p className="dp-eyebrow">DECISION {phase} OF {design.steps.length} · {LABEL[design.steps[phase - 1].kind].toUpperCase()}</p>
          <Decision key={phase} step={design.steps[phase - 1]} order={displayOrder(id, phase - 1, design.steps[phase - 1].options)} onRight={solved} />
        </>
      )}

      {phase === total - 1 && (
        <>
          {applyTrace && (
            <div className="dp-di-known" aria-label="Cells already filled">
              <p className="dp-muted">Your recurrence: {recurrence}</p>
              <ul>
                {applyTrace.known.map(([name, value]) => <li key={name}><code>{name} = {show(value)}</code></li>)}
              </ul>
            </div>
          )}
          <NumberCheck
            key="apply"
            spec={applySpec}
            label="Your value for the cell"
            onSolved={solved}
            onShown={shown}
            diagnoseGuess={applyTrace ? guess => diagnose(applyTrace.step, applyTrace.trace.table, guess) : undefined}
          />
        </>
      )}

      {ready && (
        <div className="dp-di-next">
          <button type="button" className="dp-primary" onClick={advance}>
            {phase === total - 1 ? 'Finish the design →' : phase === 0 ? 'Start designing →' : 'Next decision →'}
          </button>
        </div>
      )}

      {phase === 'summary' && (
        <div className="dp-tt-feedback is-good" role="status">
          <strong>✓ You designed it{assisted ? ' (with a shown answer)' : ''}. </strong>
          {misses === 0 ? 'Every choice right the first time.' : `${misses} wrong ${misses === 1 ? 'pick' : 'picks'} on the way, each one a real mistake people make.`}
          {' '}{TRACES[id] ? 'The explanation and the live table use exactly this design.' : 'The explanation and the worked example use exactly this design.'}
          <div className="dp-di-next">
            <button type="button" className="dp-primary" onClick={() => onFinish('walk')}>{TRACES[id] || TREE_FOR[id] ? 'Watch it fill →' : 'See it worked through →'}</button>
            <button type="button" className="dp-di-secondary" onClick={() => onFinish('understand')}>Read why it works</button>
            <button type="button" className="dp-di-quiet" onClick={() => { setPhase(0); setMisses(0); setAssisted(false); setReady(false) }}>Design it again</button>
          </div>
        </div>
      )}
    </section>
  )
}
