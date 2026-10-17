import { useState } from 'react'
import Markdown from '../qmaze-lab/Markdown.jsx'
import { parseAnswer } from '../ml-lab/Checkpoint.jsx'

// A lesson in the Discrete Math Lab is an ordered list of blocks:
//   { h }                         a section heading
//   { md }                        Markdown with LaTeX ($…$ inline, $$…$$ display)
//   { symbols: [[tex, say, means, example]] }
//                                 every symbol of a definition/formula: how to say it, what it means, and a concrete example
//   { worked: { title, steps: [[step, math, why]] } }
//                                 a line-by-line worked derivation or algebraic trace
//   { figure, props, caption }    an interactive figure from the lab's FIGURES
//   { predict: { prompt, answer, compute, tolerance, explain, misconceptions: [{ answer, feedback }] } }
//   { choice: { prompt, options: [{ text, why }], answer } }
//   { proof: { title, claim, strategy, givens, steps: [{ prompt, line, options: [{ text, why }], answer }], qed } }
//                                 an interactive step-by-step mathematical proof / derivation builder
//   { puzzle: { id, title, desc } }
//                                 a direct launch card to the matching interactive challenge in the Puzzles & Challenges tab
//   { note, kind: 'key' | 'warn' | 'try' | 'recall' }

const Md = ({ children }) => <div className="qm-md"><Markdown>{children}</Markdown></div>
const LessonText = ({ children }) => <Markdown inline>{children}</Markdown>
const dollars = tex => '$' + tex + '$'

export const BLOCK_KINDS = ['h', 'md', 'symbols', 'worked', 'figure', 'predict', 'choice', 'proof', 'puzzle', 'note']
export const isCheck = b => Boolean(b.predict || b.choice || b.proof)
export const checkKey = b => {
  if (b.predict) return b.predict.prompt
  if (b.choice) return b.choice.prompt
  if (b.proof) return `proof:${b.proof.title ?? b.proof.claim}`
  return undefined
}

function Symbols({ rows }) {
  return <table className="qm-mathcode ps-symbols">
    <thead><tr><th>Symbol</th><th>Say it</th><th>What it means</th><th>Concrete example</th></tr></thead>
    <tbody>
      {rows.map(([tex, say, means, example], i) => (
        <tr key={i}>
          <td><LessonText>{dollars(tex)}</LessonText></td>
          <td><i>{say}</i></td>
          <td><LessonText>{means}</LessonText></td>
          <td><LessonText>{example ?? ''}</LessonText></td>
        </tr>
      ))}
    </tbody>
  </table>
}

function Worked({ spec }) {
  return <div className="dm-worked">
    {spec.title && <div className="dm-worked-title"><span className="qm-eyebrow">Worked derivation</span><strong><LessonText>{spec.title}</LessonText></strong></div>}
    <table className="qm-mathcode dm-worked-table">
      <thead><tr><th>Step</th><th>Expression / Statement</th><th>Why it holds</th></tr></thead>
      <tbody>
        {spec.steps.map(([step, expr, why], i) => (
          <tr key={i}>
            <td className="dm-step-badge">{step}</td>
            <td><LessonText>{expr}</LessonText></td>
            <td><LessonText>{why}</LessonText></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
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
    {state === 'wrong' && <p className="qm-feedback" role="status">Not yet. Work through the definition once more, or press “Show me”.</p>}
    {state?.feedback && <div className="qm-feedback" role="status"><Md>{state.feedback}</Md></div>}
    {!open && <div className="qm-answer" role="status"><strong>{state === 'solved' ? 'Right: ' : 'Answer: '}{Number.isInteger(spec.answer) ? spec.answer : Number(spec.answer.toFixed(4))}</strong><Md>{spec.explain}</Md></div>}
  </div>
}

function Choice({ id, spec, done, onDone }) {
  const [picked, setPicked] = useState(done ? spec.answer : null), [submitted, setSubmitted] = useState(done)
  const right = submitted && picked === spec.answer
  return <div className="qm-check">
    <span className="qm-eyebrow">Check your understanding</span>
    <Md>{spec.prompt}</Md>
    <div className="qm-options" role="radiogroup">
      {spec.options.map((o, i) => <label key={i} className={`qm-option${submitted && i === picked ? (right ? ' right' : ' wrong') : ''}`}>
        <input type="radio" name={id} checked={picked === i} onChange={() => { setPicked(i); setSubmitted(false) }} disabled={right} />
        <span><LessonText>{o.text}</LessonText></span>
      </label>)}
    </div>
    {!right && <button disabled={picked === null} onClick={() => { setSubmitted(true); if (picked === spec.answer) onDone() }}>Check</button>}
    {submitted && picked !== null && <div className={`qm-feedback${right ? ' good' : ''}`} role="status"><strong>{right ? 'Right. ' : 'Not this one. '}</strong><Md>{spec.options[picked].why}</Md></div>}
  </div>
}

function ProofBuilder({ id, spec, done, onDone }) {
  const total = spec.steps.length
  const [stepIdx, setStepIdx] = useState(done ? total : 0)
  const [picked, setPicked] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const finished = stepIdx >= total || revealed
  const currentStep = !finished ? spec.steps[stepIdx] : null
  const right = submitted && currentStep && picked === currentStep.answer

  const verifyStep = () => {
    if (picked === null || !currentStep) return
    setSubmitted(true)
    if (picked === currentStep.answer) {
      if (stepIdx + 1 >= total) onDone()
    }
  }

  const advance = () => {
    const next = stepIdx + 1
    setStepIdx(next)
    setPicked(null)
    setSubmitted(false)
    if (next >= total) onDone()
  }

  return <div className="qm-check dm-proof-builder">
    <div className="dm-proof-header">
      <div>
        <span className="qm-eyebrow">Interactive Proof & Derivation Builder</span>
        <h3 className="dm-proof-title"><LessonText>{spec.title}</LessonText></h3>
      </div>
      <span className="dm-proof-badge">{finished ? `✓ Complete (${total}/${total} steps)` : `Step ${stepIdx + 1} of ${total}`}</span>
    </div>
    <div className="dm-proof-claim">
      <div><b>Claim:</b> <LessonText>{spec.claim}</LessonText></div>
      {spec.strategy && <div className="dm-proof-meta"><b>Proof strategy:</b> <LessonText>{spec.strategy}</LessonText></div>}
      {spec.givens && <div className="dm-proof-meta"><b>Setup / Givens:</b> <LessonText>{spec.givens}</LessonText></div>}
    </div>

    {(stepIdx > 0 || finished) && (
      <ol className="dm-proof-chain" aria-label="Completed proof steps">
        {spec.steps.slice(0, finished ? total : stepIdx).map((s, i) => {
          const winner = s.options[s.answer]
          return <li key={i} className="dm-proof-step-done">
            <span className="dm-proof-step-num">Step {i + 1} ✓</span>
            <div className="dm-proof-step-body">
              <div><LessonText>{s.line ?? winner.text}</LessonText></div>
              <div className="dm-proof-step-why"><LessonText>{winner.why}</LessonText></div>
            </div>
          </li>
        })}
      </ol>
    )}

    {!finished && currentStep && (
      <div className="dm-proof-active">
        <p className="dm-proof-prompt"><b>Step {stepIdx + 1}:</b> <LessonText>{currentStep.prompt}</LessonText></p>
        <div className="qm-options" role="radiogroup">
          {currentStep.options.map((o, i) => (
            <label key={i} className={`qm-option${submitted && i === picked ? (right ? ' right' : ' wrong') : ''}`}>
              <input type="radio" name={`${id}-step-${stepIdx}`} checked={picked === i} onChange={() => { setPicked(i); setSubmitted(false) }} disabled={right} />
              <span><LessonText>{o.text}</LessonText></span>
            </label>
          ))}
        </div>
        <div className="qm-buttons">
          {!right && <button disabled={picked === null} onClick={verifyStep}>Verify step</button>}
          {right && <button className="qm-primary" onClick={advance}>{stepIdx + 1 < total ? 'Next proof step →' : 'Complete proof ∎'}</button>}
          <button type="button" className="qm-quiet" onClick={() => { setRevealed(true); onDone() }}>Show full proof</button>
        </div>
        {submitted && picked !== null && (
          <div className={`qm-feedback${right ? ' good' : ''}`} role="status">
            <strong>{right ? 'Valid step. ' : 'Logical gap. '}</strong>
            <Md>{currentStep.options[picked].why}</Md>
          </div>
        )}
      </div>
    )}

    {finished && (
      <div className="dm-proof-qed" role="status">
        <strong>∎ Proof complete:</strong> <LessonText>{spec.qed}</LessonText>
      </div>
    )}
  </div>
}

function Figure({ block, FIGURES }) {
  const Component = FIGURES[block.figure]
  return <figure className="qm-figure">
    {Component ? <Component {...(block.props ?? {})} /> : <p className="qm-feedback">Missing figure: {block.figure}</p>}
    {block.caption && <figcaption><LessonText>{block.caption}</LessonText></figcaption>}
  </figure>
}

export default function Blocks({ lesson, saved, onSolved, onPuzzle, FIGURES }) {
  const solved = saved?.solved ?? []
  return lesson.blocks.map((b, k) => {
    const key = `${lesson.id}:${k}`, check = checkKey(b)
    if (b.h) return <h2 key={k} className="qm-h">{b.h}</h2>
    if (b.md) return <Md key={k}>{b.md}</Md>
    if (b.symbols) return <Symbols key={k} rows={b.symbols} />
    if (b.worked) return <Worked key={k} spec={b.worked} />
    if (b.figure) return <Figure key={k} block={b} FIGURES={FIGURES} />
    if (b.predict) return <Predict key={key} spec={b.predict} done={solved.includes(check)} onDone={() => onSolved(check)} />
    if (b.choice) return <Choice key={key} id={key} spec={b.choice} done={solved.includes(check)} onDone={() => onSolved(check)} />
    if (b.proof) return <ProofBuilder key={key} id={key} spec={b.proof} done={solved.includes(check)} onDone={() => onSolved(check)} />
    if (b.puzzle) return <div key={k} className="qm-python-link dm-puzzle-link">
      <button onClick={() => onPuzzle?.(b.puzzle.id)}>🧩 {b.puzzle.title ?? 'Play the interactive puzzle'}</button>
      <span><LessonText>{b.puzzle.desc ?? 'Hands-on challenge in the Puzzles & Challenges workbench.'}</LessonText></span>
    </div>
    if (b.note) return <aside key={k} className={`qm-note ${b.kind ?? 'key'}`}><span className="qm-eyebrow">{{ key: 'Key idea', warn: 'Watch out', try: 'Try it', recall: 'Remember' }[b.kind ?? 'key']}</span><Md>{b.note}</Md></aside>
    return null
  })
}
