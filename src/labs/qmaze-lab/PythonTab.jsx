import { useEffect, useMemo, useRef, useState } from 'react'
import GridMap from './GridMap.jsx'
import Markdown from './Markdown.jsx'
import { GridWorld } from './engine/gridworld.js'
import { MAPS } from './engine/maps.js'
import { tokenizePython } from '../a-arcade-python/analysis.js'
import { SOURCES, parse } from './source.js'
import { notesFor } from './lineNotes.js'
import { PROGRAMS } from './programs.js'

// Runs the lab's real Python programs one line at a time, using A-Arcade Python's stepper and its
// environment (desktop app only): the program is really paused between lines, and every value
// shown, including the map, comes from the live Python objects. In the browser the tab still
// shows the code with the lessons' notes on each line.
const FILE_ORDER = ['experiments.py', 'play.py', 'gym_compare.py', 'policies.py', 'qlearning.py', 'sarsa.py', 'a2c.py', 'a2c_check.py', 'planning.py', 'choosing.py', 'gridworld.py', 'returns.py', 'maps.py']
const MAX_RECORDED = 1500
// Lines that explain themselves, in general terms (lessons/coverage.test.js lets them go without a note).
const GENERAL = {
  'else:': '`else:` starts the block that runs when the `if` (or `elif`) above it was false.',
  'break': '`break` leaves the innermost loop at once; the program carries on after that loop.',
  'continue': '`continue` skips the rest of this trip round the loop and goes straight to the next one.',
}

const fmt = x => typeof x !== 'number' ? String(x) : Number.isInteger(x) ? String(x) : Math.abs(x) < 1e-4 && x !== 0 ? x.toExponential(2) : String(Number(x.toFixed(4)))
// A live Python value (as the stepper describes it) in a few words.
export function show(v, depth = 0) {
  if (!v) return '—'
  switch (v.t) {
    case 'int': case 'float': return fmt(v.v)
    case 'bool': return v.v ? 'True' : 'False'
    case 'none': return 'None'
    case 'str': return JSON.stringify(v.v)
    case 'function': return `function ${v.v}`
    case 'ndarray': case 'tensor': {
      if (v.shape.length === 0) return fmt(v.v[0])
      const head = (v.v ?? []).slice(0, 6).map(fmt).join(', ')
      return `${v.t === 'tensor' ? 'tensor' : 'array'} ${v.shape.join(' × ')}${v.dtype ? ` ${v.dtype}` : ''}: [${head}${v.size > 6 ? ', …' : ''}]`
    }
    case 'list': case 'tuple': {
      if (!v.items) return `${v.t} of ${v.len}`
      const inner = v.items.slice(0, 8).map(x => show(x, depth + 1)).join(', ')
      const more = v.len > 8 ? `, … (${v.len} items)` : ''
      return depth > 0 && v.len > 3 ? `${v.t} of ${v.len}` : v.t === 'tuple' ? `(${inner}${more})` : `[${inner}${more}]`
    }
    case 'dict': return v.items ? `{${Object.entries(v.items).slice(0, 4).map(([k, x]) => `${k}: ${show(x, depth + 1)}`).join(', ')}${v.len > 4 ? ', …' : ''}}` : `dict of ${v.len}`
    case 'module': return `${v.cls} (${Object.values(v.params).reduce((n, p) => n + p.size, 0)} weights)`
    case 'object': return v.attrs ? `${v.cls} object` : v.cls
    default: return v.v === undefined ? v.t : String(v.v)
  }
}

const rowsOf = arr => { const [n, m] = arr.shape; return Array.from({ length: n }, (_, i) => arr.v.slice(i * m, i * m + m)) }
// What the paused program holds that can be drawn on the map.
function overlays(view, env) {
  const w = view?.watch ?? {}, out = {}
  const value = k => w[k]?.value
  if (value('Q')?.t === 'ndarray' && value('Q').shape[0] === env.nStates) out.q = rowsOf(value('Q'))
  if (value('V')?.t === 'ndarray' && value('V').shape[0] === env.nStates) out.values = value('V').v
  if (value('state')?.t === 'int') out.agent = value('state').v
  if (value('trail')?.items) out.trail = value('trail').items.map(x => x.v)
  if (value('states')?.items) out.agents = value('states').items.map(x => x.v)
  const net = value('net')
  if (net?.t === 'module' && net.params['actor.weight'] && !net.params['body.0.weight']) {
    const W = net.params['actor.weight'], C = net.params['critic.weight']
    const nA = W.shape[0], nS = W.shape[1]
    if (nS === env.nStates) {
      out.probs = Array.from({ length: nS }, (_, s) => {
        const logits = Array.from({ length: nA }, (_, a) => W.v[a * nS + s]), top = Math.max(...logits)
        const e = logits.map(l => Math.exp(l - top)), sum = e.reduce((x, y) => x + y, 0)
        return e.map(x => x / sum)
      })
      out.values = C.v.slice(0, nS)
    }
  }
  return out
}

function CodePanel({ file, current, callSites, selected, onSelect }) {
  const box = useRef(null)
  useEffect(() => { box.current?.querySelector('.qm-py-line.current')?.scrollIntoView({ block: 'nearest' }) }, [current, file])
  const lines = SOURCES[file].split('\n')
  return <div className="qm-py-code" ref={box}>
    {lines.map((text, i) => {
      const n = i + 1, noted = notesFor(file, n).length > 0
      return <div key={n} className={`qm-py-line${n === current ? ' current' : ''}${callSites.has(n) ? ' call-site' : ''}${n === selected ? ' selected' : ''}`} onClick={() => onSelect(n)}>
        <span className="qm-ln">{n === current ? '▶' : callSites.has(n) ? '↳' : ''}{n}</span>
        <code>{tokenizePython(text).map((t, k) => <span key={k} className={`tk-${t.kind}`}>{t.text}</span>)}{text === '' ? ' ' : ''}</code>
        {noted && <span className="qm-py-dot" title="explained in a lesson" />}
      </div>
    })}
  </div>
}

function LineExplain({ file, line, running, frame, onLesson }) {
  const text = SOURCES[file].split('\n')[line - 1] ?? ''
  const notes = notesFor(file, line)
  const fn = parse(file).lineFn[line]
  const names = [...new Set(tokenizePython(text).filter(t => t.kind === 'name' && !t.property).map(t => t.text))].filter(n => frame?.locals[n])
  return <div className="qm-py-explain">
    <p className="qm-hint">{file}{fn ? ` · ${fn.name}()` : ''} · line {line}{running ? ' · ▶ runs next' : ''}</p>
    <pre className="qm-py-big">{text.trim() || ' '}</pre>
    {notes.length ? notes.map((n, i) => <div key={i}>
      <ul className="qm-code-note qm-py-note">{n.bullets.map((b, k) => <li key={k}><Markdown inline>{b}</Markdown></li>)}</ul>
      <p className="qm-hint">From lesson <button className="qm-link" onClick={() => onLesson?.(n.lesson.id)}>{n.lesson.number} {n.lesson.title}</button></p>
    </div>) : <p className="qm-hint">{GENERAL[text.trim()] ?? (text.trim() === '' ? 'A blank line.' : text.trim().startsWith('#') || text.trim().startsWith('"""') || text.trim().endsWith('"""') ? 'A comment or docstring: a description for people reading the code. Python stores docstrings but never runs them.' : 'This line continues the statement above it; see that line.')}</p>}
    {names.length > 0 && <><h4>On this line, right now</h4><table className="qm-log qm-left"><tbody>{names.map(n => <tr key={n}><td className="mono">{n}</td><td className="mono">{show(frame.locals[n])}</td></tr>)}</tbody></table></>}
  </div>
}

export default function PythonTab({ request, onLesson }) {
  const api = typeof window !== 'undefined' ? window.openCalcDesktop?.aarcade : null
  const [programId, setProgramId] = useState(request?.program ?? 'q')
  const [map, setMap] = useState(request?.map ?? 'cheese_and_cat')
  const program = PROGRAMS[programId]
  const env = useMemo(() => new GridWorld(map), [map])
  const [status, setStatus] = useState(null), [setupLog, setSetupLog] = useState(''), [settingUp, setSettingUp] = useState(false)
  const [timeline, setTimeline] = useState([]), [at, setAt] = useState(null)
  const [busy, setBusy] = useState(false), [ended, setEnded] = useState(null), [error, setError] = useState(null)
  const [file, setFile] = useState(program.file), [selected, setSelected] = useState(null)
  const [knob, setKnob] = useState({})

  useEffect(() => { if (api) api.status().then(setStatus).catch(e => setError(String(e))) }, [api])
  useEffect(() => api?.onOutput?.(m => { if (m.type === 'setup') setSetupLog(log => (log + m.text).slice(-8000)) }), [api])
  useEffect(() => { if (request) { setProgramId(request.program); if (request.map) setMap(request.map); setFile(PROGRAMS[request.program].file); reset() } }, [request])

  const index = at ?? timeline.length - 1
  const view = timeline[index] ?? null
  const top = view?.stack.at(-1)
  const callSites = new Set((view?.stack ?? []).slice(0, -1).filter(f => f.file === file).map(f => f.line))
  const shown = overlays(view, env)
  const files = FILE_ORDER.filter(f => SOURCES[f] && (f === program.file || ['experiments.py', 'choosing.py', 'gridworld.py'].includes(f) || (view?.stack ?? []).some(fr => fr.file === f)))

  function reset() { setTimeline([]); setAt(null); setEnded(null); setError(null); setSelected(null) }
  function accept(r) {
    if (r.type === 'pause') {
      setTimeline(t => [...t, r].slice(-MAX_RECORDED)); setAt(null); setEnded(null)
      const t = r.stack.at(-1); if (t) { setFile(t.file); setSelected(null) }
      if (r.hitLimit) setError('Stopped after 2,000,000 lines without reaching that point.')
      return
    }
    setEnded(r)
    if (r.type === 'error' && r.file) { setFile(r.file); setSelected(r.line) }
  }
  async function send(command) {
    setBusy(true); setError(null)
    try { accept(await api.send(command)) } catch (e) { setError(String(e.message ?? e)) } finally { setBusy(false) }
  }
  const load = () => { reset(); return send({ cmd: 'load', files: SOURCES, entry: { module: program.module, function: program.function, kwargs: program.kwargs(map) }, watch: program.watch, actions: ['env.step('] }) }
  const step = (mode, extra = {}) => send({ cmd: 'step', mode, ...extra })
  const setValue = (target, value) => send({ cmd: 'set', target, value })
  async function setup() {
    setSettingUp(true); setSetupLog('')
    try { const r = await api.setup(); if (!r.ok) setError(r.reason); setStatus(await api.status()) } finally { setSettingUp(false) }
  }

  const live = api && status?.ready && timeline.length > 0 && !ended && at === null
  const frame = top
  return <div className="qm-py">
    <div className="qm-py-bar">
      <label>Program <select value={programId} onChange={e => { setProgramId(e.target.value); setFile(PROGRAMS[e.target.value].file); reset() }}>{Object.entries(PROGRAMS).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}</select></label>
      <label>Map <select value={map} onChange={e => { setMap(e.target.value); reset() }}>{Object.keys(MAPS).filter(m => m !== 'custom').map(m => <option key={m} value={m}>{MAPS[m].title}</option>)}</select></label>
      {api && status?.ready && <>
        <button className="qm-primary" disabled={busy} onClick={load}>{timeline.length ? '↺ Restart' : '▶ Load and pause at the first line'}</button>
        <button disabled={!live || busy} onClick={() => step('into')} title="Run one line; go inside any function it calls">Step into</button>
        <button disabled={!live || busy} onClick={() => step('over')} title="Run one line, including any function it calls">Step over</button>
        <button disabled={!live || busy} onClick={() => step('out')} title="Run until this function returns">Step out</button>
        <button disabled={!live || busy} onClick={() => step('action')} title="Run until the world has answered the next move">Next move</button>
        {program.episodeEnd().length > 0 && <button disabled={!live || busy} onClick={() => step('lines', { targets: program.episodeEnd() })}>{program.endLabel ?? 'Next episode'}</button>}
        <button disabled={!live || busy || !selected} onClick={() => step('line', { file, line: selected })} title="Run until the selected line is about to run">Run to selected line</button>
      </>}
      {timeline.length > 1 && <span className="qm-py-history">
        <button disabled={index <= 0} onClick={() => setAt(Math.max(0, index - 1))}>◀ Back</button>
        <button disabled={at === null} onClick={() => setAt(at + 1 >= timeline.length - 1 ? null : at + 1)}>Forward ▶</button>
        <span className="qm-hint">{at === null ? `pause ${timeline.length}` : `looking at pause ${index + 1} of ${timeline.length} (a record: Python isn't rewound)`}</span>
      </span>}
    </div>
    {!api && <p className="qm-py-banner">Running real Python needs the UpSkillOS desktop app. Here you can still read every program, with each line's explanation from the lessons: click any line. The Playground tab runs the same algorithms in the browser, with the same random numbers.</p>}
    {api && status && !status.ready && <div className="qm-py-banner">
      <p>This tab uses A-Arcade Python's environment (Python with NumPy, Gymnasium and PyTorch for CPU, about 300 MB, in {status.folder}). It isn't set up yet.</p>
      <button className="qm-primary" disabled={settingUp} onClick={setup}>{settingUp ? 'Setting up…' : 'Set up Python'}</button>
      {setupLog && <pre className="qm-py-log">{setupLog}</pre>}
    </div>}
    {api && status?.ready && !timeline.length && <p className="qm-py-banner">{program.about} Press <b>Load</b>: Python imports the files and pauses before the first line of <span className="mono">{program.function}()</span>. Using {status.versions}.</p>}
    {error && <p className="qm-py-error">{error}</p>}
    {ended && <div className={`qm-py-banner ${ended.type === 'error' ? 'qm-py-error' : ''}`}>
      {ended.type === 'finished' ? <>The program finished after {ended.linesRun?.toLocaleString()} lines. It returned <span className="mono">{show(ended.result)}</span>.</> : ended.type === 'error' ? <><b>{ended.error}</b>{ended.file ? ` (${ended.file}, line ${ended.line})` : ''}</> : 'Stopped.'}
      {ended.output && <pre className="qm-py-log">{ended.output}</pre>}
    </div>}
    <div className="qm-py-grid">
      <section className="qm-py-left">
        <div className="qm-py-files">{files.map(f => <button key={f} className={f === file ? 'active' : ''} onClick={() => { setFile(f); setSelected(null) }}>{f}</button>)}</div>
        <CodePanel file={file} current={top?.file === file ? top.line : null} callSites={callSites} selected={selected} onSelect={setSelected} />
      </section>
      <section className="qm-py-mid">
        <GridMap env={env} size={env.nCols > 8 ? 30 : 46} showNumbers={!shown.q || env.nCols <= 6} {...shown} />
        {view && <p className="qm-hint">The map is drawn from the paused program's own values: {Object.entries(view.watch).map(([k, w]) => <span key={k} className="mono">{w.from} </span>)}{view.watch.net && !shown.probs ? ' (with a hidden layer the policy can\'t be read off the weights, so it isn\'t drawn)' : ''}</p>}
        {program.knobs && live && <div className="qm-py-knobs">{program.knobs.filter(([k]) => frame?.locals[k]).map(([k, label]) => <label key={k}>{label} <input type="number" step="0.01" value={knob[k] ?? frame.locals[k].v} onChange={e => setKnob(o => ({ ...o, [k]: e.target.value }))} /><button disabled={busy} onClick={() => setValue(k, Number(knob[k] ?? frame.locals[k].v))}>set</button></label>)}</div>}
        {view && <><h4>Running: {view.stack.map(f => `${f.function}()`).join(' → ')}</h4>
          <table className="qm-log qm-left"><tbody>{Object.entries(frame?.locals ?? {}).filter(([, v]) => !['function', 'module'].includes(v.t) || v.t === 'module').map(([k, v]) => <tr key={k}><td className="mono">{k}</td><td className="mono qm-py-val">{show(v)}</td></tr>)}</tbody></table>
          {view.output && <pre className="qm-py-log">{view.output}</pre>}
          {view.returned && <p className="qm-hint"><span className="mono">{view.returned.function}()</span> just returned <span className="mono">{show(view.returned.value)}</span></p>}</>}
      </section>
      <section className="qm-py-right">
        {(selected || (top?.file === file && top.line)) ? <LineExplain file={file} line={selected ?? top.line} running={!selected || selected === top?.line} frame={frame?.file === file ? frame : null} onLesson={onLesson} /> : <div className="qm-py-explain"><p>{program.about}</p><p className="qm-hint">Click any line of code to see it explained. Lines with a dot are explained in a lesson.</p></div>}
      </section>
    </div>
  </div>
}
