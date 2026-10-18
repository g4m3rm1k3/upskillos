import React, { useEffect, useMemo, useRef, useState } from 'react'
import { tokenizePython } from '../a-arcade-python/analysis.js'
import Markdown from '../qmaze-lab/Markdown.jsx'

// Watch it run: the real Python on the left with the line that runs lit up, a picture of the data
// in the middle with a sentence saying what that line just did, and every variable on the right
// (a changed value glows). Play, pause, step back and forward, scrub, change speed, arrow keys.
//
// A frame is { line, say, vars: [[name, value]], pic, ask? }. When a frame has an `ask`, stepping
// onto it first asks the learner to predict what the line will do; the frame is shown after a
// right answer or "Show me". An ask is
//   { kind: 'number' | 'choice' | 'cell' | 'text', prompt, answer, options?, tolerance?,
//     misconceptions?: [{ answer, feedback }], explain? }
// ('cell' answers are picked by clicking the picture, which receives onCell).

export const Text = ({ children }) => <Markdown inline>{String(children ?? '')}</Markdown>

function CodePanel({ code, line, nextLine, previous }) {
  const lines = useMemo(() => code.split('\n'), [code])
  const box = useRef(null)
  useEffect(() => {
    const el = box.current?.querySelector('.is-now, .is-next')
    if (el && box.current) {
      const top = el.offsetTop - box.current.clientHeight / 2
      box.current.scrollTop = Math.max(0, top)
    }
  }, [line, nextLine])
  return (
    <div className="mlf-code" ref={box} aria-label="The code">
      {lines.map((text, k) => {
        const n = k + 1
        const cls = n === nextLine ? ' is-next' : n === line ? ' is-now' : n === previous ? ' is-before' : ''
        return (
          <div key={k} className={`mlf-code-row${cls}`} aria-current={n === line ? 'step' : undefined}>
            <span className="mlf-ln">{n}</span>
            <code>{tokenizePython(text).map((t, i) => <span key={i} className={`tk-${t.kind}`}>{t.text}</span>)}{text === '' ? ' ' : ''}</code>
          </div>
        )
      })}
    </div>
  )
}

function Vars({ vars, before }) {
  const old = Object.fromEntries(before ?? [])
  if (!vars?.length) return <p className="mlf-muted">No variables yet.</p>
  return (
    <table className="mlf-vars">
      <tbody>
        {vars.map(([name, value]) => {
          const changed = before && old[name] !== value
          return (
            <tr key={name} className={changed ? 'changed' : ''}>
              <th scope="row">{name}</th>
              <td><code>{value}</code>{changed && <span className="sr-only"> (changed)</span>}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function judge(ask, value) {
  if (ask.kind === 'cell') {
    const right = [].concat(ask.answer).includes(value)
    return { right, miss: right ? null : ask.misconceptions?.find(m => [].concat(m.answer).includes(value)) }
  }
  if (ask.kind === 'choice') return { right: value === ask.answer, miss: ask.options[value]?.why ? { feedback: ask.options[value].why } : null }
  if (ask.kind === 'text') {
    const tidy = s => String(s).replace(/\s+/g, '').replace(/"/g, "'").toLowerCase()
    const right = [].concat(ask.answer).some(a => tidy(a) === tidy(value))
    return { right, miss: right ? null : ask.misconceptions?.find(m => [].concat(m.answer).some(a => tidy(a) === tidy(value))) }
  }
  const n = Number(String(value).trim())
  if (!String(value).trim() || Number.isNaN(n)) return { error: 'Type a number, like 3 or 0.85.' }
  const tol = ask.tolerance ?? 1e-6
  const right = Math.abs(n - ask.answer) <= tol
  return { right, miss: right ? null : ask.misconceptions?.find(m => Math.abs(n - m.answer) <= (m.tolerance ?? tol)) }
}

function AskPanel({ ask, onRight, onShow, picked }) {
  const [value, setValue] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [tries, setTries] = useState(0)
  useEffect(() => { setValue(''); setFeedback(null); setTries(0) }, [ask])
  useEffect(() => { if (ask.kind === 'cell' && picked) submit(picked) }, [picked]) // eslint-disable-line react-hooks/exhaustive-deps

  function submit(v) {
    const verdict = judge(ask, v)
    if (verdict.error) { setFeedback({ text: verdict.error }); return }
    if (verdict.right) { onRight(tries === 0); return }
    setTries(t => t + 1)
    setFeedback({ text: verdict.miss?.feedback ?? (ask.teach ? 'Not that. Use "What you need to know" with the values on the right, one step at a time.' : 'Not that. Read the highlighted line again and run it in your head with the values on the right.') })
  }

  return (
    <div className="mlf-ask" role="group" aria-label="Predict before it runs">
      <p className="mlf-eyebrow">Predict before it runs</p>
      {ask.teach && <div className="mlf-teach"><p className="mlf-eyebrow">What you need to know</p><Markdown>{ask.teach}</Markdown></div>}
      <div className="mlf-ask-prompt"><Markdown>{ask.prompt}</Markdown></div>
      {ask.kind === 'cell' && <p className="mlf-muted">Click the square on the map.</p>}
      {ask.kind === 'choice' && (
        <div className="mlf-options">
          {ask.options.map((o, i) => <button key={i} type="button" className="mlf-option" onClick={() => submit(i)}><Text>{o.text}</Text></button>)}
        </div>
      )}
      {(ask.kind === 'number' || ask.kind === 'text') && (
        <form onSubmit={e => { e.preventDefault(); submit(value) }} className="mlf-ask-form">
          <input value={value} onChange={e => setValue(e.target.value)} aria-label="Your prediction" placeholder={ask.kind === 'number' ? 'a number' : ask.placeholder ?? 'your answer'} inputMode={ask.kind === 'number' ? 'decimal' : undefined} autoFocus />
          <button type="submit" className="mlf-primary">Check</button>
        </form>
      )}
      {feedback && <div className="mlf-feedback bad" role="status"><Markdown>{feedback.text}</Markdown></div>}
      <button type="button" className="mlf-quiet" onClick={onShow}>{tries ? 'Show me the answer' : 'Skip: show me the answer'}</button>
    </div>
  )
}

export default function Stepper({ code, frames, Picture, title, onFinished, initialAsking = true }) {
  const [i, setI] = useState(0)
  const [pending, setPending] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(700)
  const [asking, setAsking] = useState(initialAsking)
  const [answered, setAnswered] = useState(() => new Set())
  const [score, setScore] = useState({ right: 0, asked: 0 })
  const [picked, setPicked] = useState(null)
  const [lastVerdict, setLastVerdict] = useState(null)
  const finishedOnce = useRef(false)

  // New input, new frames: start over.
  useEffect(() => { setI(0); setPending(null); setPlaying(false); setAnswered(new Set()); setLastVerdict(null); finishedOnce.current = false }, [frames])

  const n = frames.length
  const frame = frames[Math.min(i, n - 1)]

  function go(to, keepVerdict = false) {
    setPending(null); setPicked(null)
    const k = Math.max(0, Math.min(n - 1, to))
    setI(k)
    if (k !== i && !keepVerdict) setLastVerdict(null)
    if (k === n - 1 && !finishedOnce.current) { finishedOnce.current = true; onFinished?.() }
  }

  function next() {
    if (pending !== null) return
    if (i >= n - 1) { setPlaying(false); return }
    const k = i + 1
    if (asking && frames[k].ask && !answered.has(k)) { setPlaying(false); setPending(k); setPicked(null); return }
    go(k)
  }

  function resolve(right, firstTry) {
    const k = pending
    setAnswered(prev => new Set(prev).add(k))
    setScore(s => ({ right: s.right + (right && firstTry ? 1 : 0), asked: s.asked + 1 }))
    setLastVerdict({ k, right, firstTry })
    go(k, true)
  }

  useEffect(() => {
    if (!playing) return
    const t = setTimeout(next, speed)
    return () => clearTimeout(t)
  })

  const onKey = e => {
    if (e.target.closest('input, textarea, select')) return
    if (e.key === 'ArrowRight') { e.preventDefault(); next() }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1) }
    if (e.key === ' ') { e.preventDefault(); setPlaying(p => !p) }
  }

  const askNow = pending !== null ? frames[pending].ask : null
  const shownAsk = lastVerdict && lastVerdict.k === i ? frames[i].ask : null

  return (
    <section className="mlf-stepper" tabIndex={0} onKeyDown={onKey} aria-label={title ?? 'Step through the code'}>
      <div className="mlf-stepper-bar">
        <div className="mlf-stepper-buttons">
          <button type="button" onClick={() => go(0)} aria-label="First step" title="First step">⏮</button>
          <button type="button" onClick={() => go(i - 1)} aria-label="Step back" title="Step back (←)">◀</button>
          <button type="button" className="mlf-primary" onClick={() => setPlaying(p => !p)} disabled={pending !== null} aria-label={playing ? 'Pause' : 'Play'}>{playing ? '⏸ Pause' : '▶ Play'}</button>
          <button type="button" onClick={next} disabled={pending !== null} aria-label="Step forward" title="Step forward (→)">▶|</button>
          <button type="button" onClick={() => go(n - 1)} aria-label="Last step" title="Last step">⏭</button>
        </div>
        <label className="mlf-scrub">
          <span className="sr-only">Step</span>
          <input type="range" min={0} max={n - 1} value={i} onChange={e => go(Number(e.target.value))} aria-label="Scrub through the steps" />
          <span className="mlf-muted">step {i + 1} of {n}</span>
        </label>
        <label className="mlf-speed">
          <span>Speed</span>
          <select value={speed} onChange={e => setSpeed(Number(e.target.value))}>
            <option value={1400}>slow</option><option value={700}>normal</option><option value={250}>fast</option><option value={60}>very fast</option>
          </select>
        </label>
        <label className="mlf-toggle">
          <input type="checkbox" checked={asking} onChange={e => setAsking(e.target.checked)} /> Ask me to predict
        </label>
        {score.asked > 0 && <span className="mlf-score" aria-live="polite">Predictions: {score.right} right first time, of {score.asked}</span>}
      </div>
      <div className="mlf-stepper-body">
        <CodePanel code={code} line={pending !== null ? null : frame.line} nextLine={pending !== null ? frames[pending].line : null} previous={i > 0 ? frames[i - 1].line : null} />
        <div className="mlf-stepper-middle">
          <div className="mlf-picture"><Picture frame={frame} upcoming={pending !== null ? frames[pending] : null} onCell={askNow?.kind === 'cell' ? setPicked : undefined} /></div>
          {askNow
            ? <AskPanel ask={askNow} picked={picked} onRight={first => resolve(true, first)} onShow={() => resolve(false, false)} />
            : <div className="mlf-say" aria-live="polite">
                {shownAsk && <p className={`mlf-verdict ${lastVerdict.right ? 'good' : ''}`}>{lastVerdict.right ? (lastVerdict.firstTry ? '✓ Right first time.' : '✓ Right.') : 'Here is the answer, and why.'}</p>}
                <Text>{frame.say}</Text>
                {shownAsk?.explain && <div className="mlf-explain"><Markdown>{shownAsk.explain}</Markdown></div>}
              </div>}
        </div>
        <div className="mlf-varbox" aria-label="Variables">
          <p className="mlf-eyebrow">Variables</p>
          <Vars vars={frame.vars} before={i > 0 ? frames[i - 1].vars : null} />
        </div>
      </div>
      <p className="mlf-muted mlf-stepper-keys">← → step · Space plays · the lit line is the one that just ran; an amber line is about to run.</p>
    </section>
  )
}
