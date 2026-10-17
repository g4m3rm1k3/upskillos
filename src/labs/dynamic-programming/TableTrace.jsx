import React, { useEffect, useMemo, useRef, useState } from 'react'
import { TRACES, INPUTS, show, defaultInput } from './tables.js'
import { formatField, parseInput, randomField } from './traceInputs.js'
import './trace.css'

// The live DP table, three ways:
//   Watch      the recurrence fills the table one cell at a time (play, pause, step, scrub). The cell
//              being written glows; arrows come from the cells it reads; the arithmetic is spelled out.
//   You fill   the learner types each cell before it is revealed. Wrong answers get feedback that
//              names the likely slip; "hard" hides which cells it reads.
//   Fill order the learner clicks cells in any order; a cell fills only once everything it reads is
//              filled, otherwise the missing cells flash. Any order that works is a topological order.
// The input can be changed (or drawn at random), and the table is recomputed from the recurrence.

const key = ([r, c]) => `${r},${c}`
const SPEEDS = [['Slow', 1500], ['Normal', 800], ['Fast', 300]]
const MAX_CELLS = 180

function readStore(id) { try { return JSON.parse(localStorage.getItem(`upskillos.dp-lab.trace.${id}`)) ?? {} } catch { return {} } }
function writeStore(id, value) { try { localStorage.setItem(`upskillos.dp-lab.trace.${id}`, JSON.stringify(value)) } catch { /* private window */ } }

// What the learner typed, as a cell value: numbers, T/F for true/false, ∞ for infinity.
export function parseCell(text) {
  const s = String(text).trim().toLowerCase()
  if (['t', 'true', 'yes', 'y'].includes(s)) return true
  if (['f', 'false', 'no', 'n'].includes(s)) return false
  if (['∞', 'inf', 'infinity'].includes(s)) return Infinity
  if (['-∞', '−∞', '-inf', '-infinity'].includes(s)) return -Infinity
  if (s !== '' && Number.isFinite(Number(s))) return Number(s)
  return undefined
}

// Why a wrong value might have been typed, from the step itself.
export function diagnose(step, t, guess) {
  if (guess === undefined) return 'Type a number (or T / F for yes-or-no tables, ∞ for impossible).'
  const reads = step.reads.map(r => [t.name(...r), t.get(...r)])
  const copied = reads.find(([, v]) => v === guess)
  if (copied && reads.length > 1) return `${guess} is just ${copied[0]}. This cell combines ${reads.map(([n]) => n).join(' and ')}; read the rule again.`
  const nums = reads.map(([, v]) => v).filter(v => typeof v === 'number' && Number.isFinite(v))
  if (nums.length > 1 && typeof step.value === 'number') {
    const total = nums.reduce((a, b) => a + b, 0)
    if (guess === total && guess !== step.value) return `${guess} adds every cell it reads. This recurrence doesn’t simply add them: is it a max, a min, or does it add something else?`
    if (guess === Math.max(...nums) && guess !== step.value) return `${guess} is the biggest cell it reads, but the rule does more than pick it. What gets added?`
  }
  if (typeof guess === 'number' && typeof step.value === 'number' && Math.abs(guess - step.value) === 1) return 'Off by one. Check the base case it builds on, and whether this step adds 1 (one more coin, one more edit, one more letter).'
  return 'Not that. Look at the cells it reads, then apply the rule to their values.'
}

function Arrows({ from, to, W, H, tone = 'read' }) {
  if (!to) return null
  const [tx, ty] = [to[1] * W + W / 2, to[0] * H + H / 2]
  return from.map((f, i) => {
    const [fx, fy] = [f[1] * W + W / 2, f[0] * H + H / 2]
    const dx = tx - fx, dy = ty - fy, len = Math.hypot(dx, dy)
    if (len < 1) return null
    const ux = dx / len, uy = dy / len, cut = Math.min(16, len / 3)
    const [x1, y1, x2, y2] = [fx + ux * cut, fy + uy * cut, tx - ux * cut, ty - uy * cut]
    // Bow the curve sideways so arrows along one row don't run through the cells in between.
    const bow = Math.min(26, len * 0.22)
    const [cx, cy] = [(x1 + x2) / 2 - uy * bow, (y1 + y2) / 2 + ux * bow]
    return <path key={i} className={`dp-tt-arrow is-${tone}`} d={`M${x1},${y1} Q${cx},${cy} ${x2},${y2}`} markerEnd={`url(#dp-tt-head-${tone})`} />
  })
}

// The table drawn as a grid. `values` maps "r,c" to what is shown; `marks` maps "r,c" to class names.
function Grid({ t, values, marks = {}, arrows = [], onCell, W, H, popKey, title }) {
  const R = t.rowLabels.length, C = t.colLabels.length
  const hasRowLabels = t.rowLabels.some(Boolean)
  const used = useMemo(() => new Set([...t.base.map(b => key(b.at)), ...t.steps.map(s => key(s.at))]), [t])
  return <div className="dp-tt-scroll">
    <div className="dp-tt-grid" style={{ gridTemplateColumns: hasRowLabels ? 'max-content max-content' : 'max-content' }} role="table" aria-label={title}>
      {hasRowLabels && <span />}
      <div className="dp-tt-cols" style={{ width: C * W }} role="row">
        {t.colLabels.map((label, c) => <span key={c} role="columnheader" style={{ width: W }}>{label}</span>)}
      </div>
      {hasRowLabels && <div className="dp-tt-rows" role="presentation">{t.rowLabels.map((label, r) => <span key={r} style={{ height: H }}>{label}</span>)}</div>}
      <div className="dp-tt-cells" style={{ width: C * W, height: R * H }}>
        {Array.from({ length: R }, (_, r) => Array.from({ length: C }, (_, c) => {
          const k = `${r},${c}`, inUse = used.has(k), v = values[k]
          const cls = ['dp-tt-cell', inUse ? '' : 'is-unused', v !== undefined ? 'is-filled' : '', marks[k] ?? ''].join(' ')
          const label = `${t.name(r, c)}${v !== undefined ? ` = ${show(v)}` : inUse ? ' empty' : ' not used'}`
          const style = { left: c * W, top: r * H, width: W, height: H }
          return onCell && inUse
            ? <button key={k} type="button" className={cls} style={style} aria-label={label} onClick={() => onCell([r, c])}><span key={marks[k]?.includes('is-current') ? popKey : 0}>{v !== undefined ? show(v) : ''}</span></button>
            : <div key={k} className={cls} style={style} role="cell" aria-label={label}><span key={marks[k]?.includes('is-current') ? popKey : 0}>{v !== undefined ? show(v) : marks[k]?.includes('is-ask') ? '?' : ''}</span></div>
        }))}
        <svg className="dp-tt-svg" width={C * W} height={R * H} aria-hidden="true">
          <defs>{['read', 'missing'].map(tone => <marker key={tone} id={`dp-tt-head-${tone}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" className={`dp-tt-head is-${tone}`} /></marker>)}</defs>
          {arrows.map((a, i) => <Arrows key={i} {...a} W={W} H={H} />)}
        </svg>
      </div>
    </div>
  </div>
}

const baseValues = t => Object.fromEntries(t.base.map(b => [key(b.at), b.value]))
const formula = (t, step) => `${t.name(...step.at)} = ${step.rule} → ${show(step.value)}`

function Watch({ trace, W, H }) {
  const t = trace.table, N = t.steps.length
  const [k, setK] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  useEffect(() => {
    if (!playing) return
    if (k >= N) { setPlaying(false); return }
    const id = setTimeout(() => setK(x => Math.min(N, x + 1)), SPEEDS[speed][1])
    return () => clearTimeout(id)
  }, [playing, k, N, speed])
  const values = { ...baseValues(t) }
  t.steps.slice(0, k).forEach(s => { values[key(s.at)] = s.value })
  const step = k > 0 ? t.steps[k - 1] : null
  const marks = {}
  if (k === 0) t.base.forEach(b => { marks[key(b.at)] = 'is-base' })
  if (step) { step.reads.forEach(r => { marks[key(r)] = 'is-read' }); marks[key(step.at)] = 'is-current' }
  if (k === N && trace.answer) marks[key(trace.answer)] = 'is-answer'
  const go = n => { setPlaying(false); setK(Math.max(0, Math.min(N, n))) }
  const onKey = e => {
    if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return
    if (e.key === 'ArrowRight') { e.preventDefault(); go(k + 1) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(k - 1) }
  }
  const bases = [...new Set(t.base.map(b => b.why))]
  return <div className="dp-tt-mode" onKeyDown={onKey}>
    <Grid t={t} values={values} marks={marks} arrows={step ? [{ from: step.reads, to: step.at }] : []} W={W} H={H} popKey={k} title={trace.title} />
    <div className="dp-tt-controls" role="group" aria-label="Playback">
      <button type="button" onClick={() => go(0)} disabled={k === 0} aria-label="Back to the start">⏮</button>
      <button type="button" onClick={() => go(k - 1)} disabled={k === 0} aria-label="Previous cell">◀</button>
      <button type="button" className="dp-tt-play" onClick={() => { if (k >= N) setK(0); setPlaying(p => !p) }} aria-label={playing ? 'Pause' : 'Play'}>{playing ? '❚❚ Pause' : k >= N ? '↻ Replay' : '▶ Play'}</button>
      <button type="button" onClick={() => go(k + 1)} disabled={k === N} aria-label="Next cell">▶</button>
      <button type="button" onClick={() => go(N)} disabled={k === N} aria-label="Jump to the end">⏭</button>
      <input type="range" min={0} max={N} value={k} onChange={e => go(Number(e.target.value))} aria-label="Scrub through the steps" />
      <span className="dp-tt-count">{k} / {N}</span>
      <select value={speed} onChange={e => setSpeed(Number(e.target.value))} aria-label="Speed">{SPEEDS.map(([label], i) => <option key={label} value={i}>{label}</option>)}</select>
    </div>
    <div className="dp-tt-explain" aria-live="polite">
      {k === 0 && <><strong>Base cases first.</strong> These are known without reading anything: <ul>{bases.slice(0, 6).map(b => <li key={b}>{b}</li>)}{bases.length > 6 && <li>…and {bases.length - 6} more like them</li>}</ul>Press ▶ (or the → key) to fill the next cell.</>}
      {step && <><span className="dp-tt-formula">{formula(t, step)}</span>{step.reads.length > 0 ? <p>It reads {step.reads.map(r => t.name(...r)).join(', ')} (blue), all filled already. That’s why the table is filled in this order.</p> : <p>It reads nothing: this cell is decided by the input alone.</p>}</>}
      {k === N && trace.answer && <p className="dp-tt-answer">Answer: <strong>{t.name(...trace.answer)} = {show(t.get(...trace.answer))}</strong> (purple).</p>}
    </div>
  </div>
}

function Fill({ trace, W, H, id, onFinish }) {
  const t = trace.table, N = t.steps.length
  const [k, setK] = useState(0)
  const [guess, setGuess] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [wrongHere, setWrongHere] = useState(0)
  const [stats, setStats] = useState({ mistakes: 0, revealed: 0, ruled: 0 })
  const [help, setHelp] = useState(true)
  const [showRule, setShowRule] = useState(false)
  const inputRef = useRef(null)
  const step = t.steps[k]
  const values = { ...baseValues(t) }
  t.steps.slice(0, k).forEach(s => { values[key(s.at)] = s.value })
  const marks = {}
  if (step) { if (help) step.reads.forEach(r => { marks[key(r)] = 'is-read' }); marks[key(step.at)] = 'is-ask is-current' }
  const advance = () => {
    const next = k + 1
    setK(next); setGuess(''); setWrongHere(0); setShowRule(false)
    requestAnimationFrame(() => inputRef.current?.focus())
  }
  const check = e => {
    e.preventDefault()
    const g = parseCell(guess)
    if (g !== undefined && (g === step.value || (typeof g === 'number' && typeof step.value === 'number' && Math.abs(g - step.value) < 1e-9))) {
      setFeedback({ good: true, text: `Yes: ${formula(t, step)}` }); advance(); return
    }
    setWrongHere(w => w + 1)
    if (g !== undefined) setStats(s => ({ ...s, mistakes: s.mistakes + 1 }))
    setFeedback({ good: false, text: diagnose(step, t, g) })
  }
  const reveal = () => { setStats(s => ({ ...s, revealed: s.revealed + 1 })); setFeedback({ good: false, text: `Revealed: ${formula(t, step)}` }); advance() }
  const done = k === N
  useEffect(() => {
    if (!done) return
    const record = readStore(id), clean = stats.revealed === 0 && stats.ruled === 0
    if (clean && (record.best === undefined || stats.mistakes < record.best || (!help && !record.hard))) writeStore(id, { ...record, best: Math.min(stats.mistakes, record.best ?? Infinity), hard: record.hard || !help })
    onFinish?.()
  }, [done]) // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="dp-tt-mode">
    <label className="dp-tt-toggle"><input type="checkbox" checked={help} onChange={e => setHelp(e.target.checked)} /> Show which cells it reads {help ? '' : <em>(hard mode: you must know the recurrence)</em>}</label>
    <Grid t={t} values={values} marks={marks} arrows={step && help ? [{ from: step.reads, to: step.at }] : []} W={W} H={H} popKey={k} title={trace.title} />
    <div className="dp-tt-progress" aria-hidden="true"><span style={{ width: `${(k / N) * 100}%` }} /></div>
    {!done ? <form className="dp-tt-ask" onSubmit={check}>
      <label>What goes in <strong>{t.name(...step.at)}</strong>?
        <input ref={inputRef} value={guess} onChange={e => setGuess(e.target.value)} placeholder="value" autoComplete="off" aria-label={`Value of ${t.name(...step.at)}`} />
      </label>
      <button type="submit" className="dp-primary">Check</button>
      {wrongHere >= 1 && !showRule && <button type="button" onClick={() => { setShowRule(true); setStats(s => ({ ...s, ruled: s.ruled + 1 })) }}>Show the rule</button>}
      {wrongHere >= 2 && <button type="button" onClick={reveal}>Reveal this cell</button>}
      <span className="dp-tt-count">{k} of {N} filled · {stats.mistakes} mistake{stats.mistakes === 1 ? '' : 's'}</span>
    </form> : <div className="dp-tt-done" role="status">
      <strong>Table complete.</strong> {N} cells, {stats.mistakes} mistake{stats.mistakes === 1 ? '' : 's'}{stats.revealed ? `, ${stats.revealed} revealed` : ''}{stats.ruled ? `, rule shown ${stats.ruled}×` : ''}{!help ? ', in hard mode' : ''}.
      {trace.answer && <> The answer is <strong>{t.name(...trace.answer)} = {show(t.get(...trace.answer))}</strong>.</>}
      {stats.revealed + stats.ruled === 0 && stats.mistakes === 0 && help && <> Now try it again with “Show which cells it reads” off.</>}
      {stats.revealed + stats.ruled === 0 && stats.mistakes === 0 && !help && <> Every cell from the recurrence alone. You own this one.</>}
      <button type="button" onClick={() => { setK(0); setStats({ mistakes: 0, revealed: 0, ruled: 0 }); setFeedback(null) }}>Start again</button>
    </div>}
    {showRule && step && <p className="dp-tt-rule">Rule for this cell: <span className="dp-tt-formula">{t.name(...step.at)} = {step.rule}</span></p>}
    {feedback && <p className={`dp-tt-feedback ${feedback.good ? 'is-good' : 'is-bad'}`} role="status">{feedback.text}</p>}
  </div>
}

function Order({ trace, W, H }) {
  const t = trace.table
  const byCell = useMemo(() => Object.fromEntries(t.steps.map(s => [key(s.at), s])), [t])
  const [values, setValues] = useState(() => baseValues(t))
  const [last, setLast] = useState(null)
  const [missing, setMissing] = useState(null)
  const [wrong, setWrong] = useState(0)
  const [hint, setHint] = useState(null)
  const remaining = t.steps.filter(s => values[key(s.at)] === undefined)
  const click = at => {
    const step = byCell[key(at)]
    setHint(null)
    if (!step || values[key(at)] !== undefined) return
    const need = step.reads.filter(r => values[key(r)] === undefined)
    if (need.length) { setWrong(w => w + 1); setMissing({ at, need }); setLast(null); return }
    setValues(v => ({ ...v, [key(at)]: step.value })); setLast(step); setMissing(null)
  }
  const marks = {}
  t.base.forEach(b => { marks[key(b.at)] = 'is-base' })
  if (last) { last.reads.forEach(r => { marks[key(r)] = 'is-read' }); marks[key(last.at)] = 'is-current' }
  if (missing) { missing.need.forEach(r => { marks[key(r)] = 'is-missing' }); marks[key(missing.at)] = 'is-blocked' }
  if (hint) marks[key(hint)] = 'is-hint'
  const arrows = missing ? [{ from: missing.need, to: missing.at, tone: 'missing' }] : last ? [{ from: last.reads, to: last.at }] : []
  const ready = remaining.find(s => s.reads.every(r => values[key(r)] !== undefined))
  return <div className="dp-tt-mode">
    <p className="dp-muted">Click the empty cells in any order you like. A cell can only be filled once every cell it reads is filled. The green cells are base cases. Can you find an order different from left-to-right?</p>
    <Grid t={t} values={values} marks={marks} arrows={arrows} onCell={click} W={W} H={H} popKey={last ? key(last.at) : 0} title={trace.title} />
    <div className="dp-tt-explain" aria-live="polite">
      {missing && <p className="dp-tt-bad"><strong>{t.name(...missing.at)} can’t be filled yet.</strong> It reads {missing.need.map(r => t.name(...r)).join(', ')} (red), and {missing.need.length === 1 ? 'that is' : 'those are'} still empty.</p>}
      {last && !missing && <span className="dp-tt-formula">{formula(t, last)}</span>}
      {!remaining.length && <p className="dp-tt-answer"><strong>Every cell filled, with {wrong} blocked click{wrong === 1 ? '' : 's'}.</strong> Any order that puts each cell after the cells it reads gives the same table: that is a topological order of the dependency graph. Loops in code are just one such order written down.</p>}
    </div>
    <div className="dp-tt-controls">
      {remaining.length > 0 && <button type="button" onClick={() => setHint(ready?.at ?? null)}>Which cell is ready?</button>}
      <button type="button" onClick={() => { setValues(baseValues(t)); setLast(null); setMissing(null); setWrong(0); setHint(null) }}>Start again</button>
      <span className="dp-tt-count">{t.steps.length - remaining.length} of {t.steps.length} filled · {wrong} blocked</span>
    </div>
  </div>
}

function InputEditor({ id, input, onApply }) {
  const spec = INPUTS[id]
  const texts0 = () => Object.fromEntries(spec.fields.map(f => [f.key, formatField(f, input[f.key])]))
  const [texts, setTexts] = useState(texts0)
  const [error, setError] = useState(null)
  useEffect(() => { setTexts(texts0()) }, [input]) // eslint-disable-line react-hooks/exhaustive-deps
  const apply = (nextTexts = texts) => {
    const { value, error: bad } = parseInput(spec, nextTexts)
    if (bad) { setError(bad); return }
    const trace = TRACES[id](value), t = trace.table
    if (t.rowLabels.length * t.colLabels.length > MAX_CELLS) { setError('That table is too big to draw here. Try smaller numbers.'); return }
    setError(null); onApply(value)
  }
  const surprise = () => {
    for (let attempt = 0; attempt < 30; attempt++) {
      const value = Object.fromEntries(spec.fields.map(f => [f.key, f.kind === 'words' ? input[f.key] : randomField(f)]))
      const { error: bad } = parseInput(spec, Object.fromEntries(spec.fields.map(f => [f.key, formatField(f, value[f.key])])))
      if (bad) continue
      const t = TRACES[id](value).table
      if (t.rowLabels.length * t.colLabels.length > MAX_CELLS || t.steps.length < 3) continue
      setError(null); onApply(value); return
    }
  }
  return <form className="dp-tt-input" onSubmit={e => { e.preventDefault(); apply() }}>
    {spec.fields.map(f => <label key={f.key}><span>{f.label}</span>
      <input value={texts[f.key]} onChange={e => setTexts(x => ({ ...x, [f.key]: e.target.value }))} spellCheck={false} autoComplete="off"
        placeholder={f.kind === 'grid' ? 'e.g. 000; 010; 000' : f.kind === 'matrix' || f.kind === 'triangle' ? 'rows split by ;' : ''} />
    </label>)}
    <div className="dp-tt-input-actions">
      <button type="submit" className="dp-primary">Rebuild the table</button>
      <button type="button" onClick={surprise}>🎲 Surprise me</button>
      <button type="button" onClick={() => onApply(defaultInput(id))}>Lesson example</button>
    </div>
    {error && <p className="dp-tt-feedback is-bad" role="alert">{error}</p>}
  </form>
}

export default function TableTrace({ id }) {
  const [input, setInput] = useState(() => defaultInput(id))
  const [mode, setMode] = useState('watch')
  const [finished, setFinished] = useState(() => readStore(id))
  const trace = useMemo(() => TRACES[id](input), [id, input])
  const t = trace.table
  const widest = Math.max(...t.cells.flat().map(v => show(v).length), 1)
  const W = Math.max(50, Math.min(80, widest * 9 + 24)), H = 40
  const inputKey = JSON.stringify(input)
  return <section className="dp-tt" aria-label="Live table">
    <div className="dp-section-heading">
      <div>
        <p className="dp-eyebrow">LIVE TABLE · WATCH IT, THEN DO IT</p>
        <h3>{trace.title}</h3>
      </div>
      {finished.best !== undefined && <span className="dp-passed-tag" title="Filled every cell yourself, without reveals">✓ Filled by you{finished.hard ? ' · hard mode' : ''}</span>}
    </div>
    <p className="dp-tt-setup">{trace.setup}</p>
    <div className="dp-tt-tabs" role="tablist" aria-label="How to use the table">
      {[['watch', '▶ Watch it fill'], ['fill', '✎ You fill it'], ['order', '⇄ Fill order']].map(([m, label]) =>
        <button key={m} type="button" role="tab" aria-selected={mode === m} className={mode === m ? 'is-active' : ''} onClick={() => setMode(m)}>{label}</button>)}
    </div>
    {mode === 'watch' && <Watch key={inputKey} trace={trace} W={W} H={H} />}
    {mode === 'fill' && <Fill key={inputKey} trace={trace} W={W} H={H} id={id} onFinish={() => setFinished(readStore(id))} />}
    {mode === 'order' && <Order key={inputKey} trace={trace} W={W} H={H} />}
    {INPUTS[id] && <details className="dp-tt-details">
      <summary>Change the input and rebuild the table</summary>
      <InputEditor id={id} input={input} onApply={setInput} />
    </details>}
  </section>
}
