import { useEffect, useRef, useState } from 'react'
import Markdown from '../qmaze-lab/Markdown.jsx'
import { plain, tokenizePython } from '../a-arcade-python/analysis.js'
import { PY } from '../a-arcade-python/explain/python.js'
import { fmt } from './format.js'
import './style.css'

// Runs a lab's real Python programs one line at a time, using A-Arcade Python's stepper and its
// environment (desktop app only): the program is really paused between lines, and every value
// shown comes from the live Python objects. For the line about to run (or any line clicked) it
// explains: what the line does, its maths and its arithmetic with this step's numbers, a condition
// in words, how the program got here (the real call chain, with what each call was given), what the
// line calls, and the value of every name on it. In the browser it still shows the code with every
// explanation that doesn't need a running program.
//
// `lab` gives everything particular to a lab:
//   src        makeSource(...) from ./source.js
//   notes      makeLineNotes(...) from ./lineNotes.js
//   FUNCTIONS  'file:qual' → { summary, inputs: [[name, meaning]], returns, lesson }
//   VARS       name → what it stands for
//   PROGRAMS   id → { label, file, module, function, kwargs(), watch, actions, episodeEnd(), … }
//   lessonById, fileOrder, labReceiver (a regex: the names the programs give their own objects)
//   Picture    ({ program, view, start }) → what the paused program holds, drawn
//   intro      the sentence shown in the browser, where Python can't run
const MAX_RECORDED = 1500
const GENERAL = {
  'else:': '`else:` starts the block that runs when the `if` above it was false.',
  'break': '`break` leaves the innermost loop at once.',
  'continue': '`continue` skips the rest of this trip round the loop.',
  'pass': '`pass` does nothing: Python needs a statement there.',
}

// A live Python value (as the stepper describes it) in a few words.
export function show(v, depth = 0) {
  if (!v) return '—'
  switch (v.t) {
    case 'int': case 'float': return fmt(v.v, 4)
    case 'bool': return v.v ? 'True' : 'False'
    case 'none': return 'None'
    case 'str': return JSON.stringify(v.v)
    case 'function': return `function ${v.v}`
    case 'ndarray': case 'tensor': {
      if (v.shape.length === 0) return `${v.t === 'tensor' ? 'tensor' : ''}(${fmt(v.v[0], 4)})`
      const head = (v.v ?? []).slice(0, 6).map(x => fmt(x, 4)).join(', ')
      return `${v.t === 'tensor' ? 'tensor' : 'array'} ${v.shape.join(' × ')}: [${head}${v.size > 6 ? ', …' : ''}]${v.requires_grad ? ' (tracks gradients)' : ''}`
    }
    case 'list': case 'tuple': {
      if (!v.items) return `${v.t} of ${v.len}`
      const inner = v.items.slice(0, 6).map(x => show(x, depth + 1)).join(', ')
      const more = v.len > 6 ? `, … (${v.len} items)` : ''
      return depth > 0 && v.len > 4 ? `${v.t} of ${v.len}` : v.t === 'tuple' ? `(${inner}${more})` : `[${inner}${more}]`
    }
    case 'dict': return v.items ? `{${Object.entries(v.items).slice(0, 4).map(([k, x]) => `${k}: ${show(x, depth + 1)}`).join(', ')}${v.len > 4 ? ', …' : ''}}` : `dict of ${v.len}`
    case 'module': return `${v.cls} network (${Object.values(v.params).reduce((n, p) => n + p.size, 0)} weights)`
    case 'object': return `${v.cls} object`
    default: return v.v === undefined ? v.t : String(v.v)
  }
}

// A frame's values as plain JavaScript, for the notes' arithmetic: objects become their attributes.
export function valuesOf(frame) {
  const deep = s => s?.t === 'object' && s.attrs ? Object.fromEntries(Object.entries(s.attrs).map(([k, v]) => [k, deep(v)])) : plain(s)
  return Object.fromEntries([...Object.entries(frame?.consts ?? {}), ...Object.entries(frame?.locals ?? {})].map(([k, v]) => [k, deep(v)]))
}
function calcFor(lab, file, line, frame) {
  const { calc } = lab.notes.extrasFor(file, line)
  if (!calc || !frame) return null
  try { const out = calc(valuesOf(frame)); return out && out[1] !== undefined && !Number.isNaN(out[1]) ? out : null } catch { return null }
}
const calcText = r => typeof r === 'boolean' ? (r ? 'True' : 'False') : Array.isArray(r) ? `[${r.map(x => typeof x === 'number' ? fmt(x, 4) : Array.isArray(x) ? `[${x.map(y => fmt(y, 4)).join(', ')}]` : String(x)).join(', ')}]` : typeof r === 'number' ? fmt(r, 6) : String(r)

// `name` on a line, as `obj.attr.attr`: read through a frame's objects.
function lookupDotted(frame, dotted) {
  const [root, ...rest] = dotted.split('.')
  let s = frame?.locals[root]
  for (const part of rest) s = s?.attrs?.[part]
  return s ?? null
}

// The program functions a line calls, as 'file:qual' keys. A method call's receiver is looked up in
// the paused frame when there is one; without a running program its class is read from where it was
// made (`env = CartPole()`, `self.world = …`), and a receiver the programs don't name (optimizer,
// self.rng …) is taken to be a library's, so `optimizer.step()` isn't taken for a lab method.
function callsOn(lab, text, frame, file, line) {
  const { SOURCES, functionsOf, fnAt } = lab.src
  const where = file && fnAt(file, line)
  const body = where ? SOURCES[file].split(/\n/).slice(where.start - 1, where.end) : []
  const madeAs = receiver => (receiver.startsWith('self.') ? SOURCES[file].split(/\n/) : body).map(l => l.trim()).find(l => l.startsWith(`${receiver} = `))?.match(/^\S+ = (\w+)\(/)?.[1]
  const code = text.split('#')[0], out = []
  for (const f of Object.keys(SOURCES)) for (const fn of functionsOf(f)) {
    const name = fn.name === '__init__' ? fn.className : fn.name
    if (!name || ['forward', '__len__'].includes(fn.name)) continue
    const m = new RegExp(`([\\w.]*?)\\.?\\b${name}\\(`).exec(code)
    if (!m || /^\s*(def|class)\s/.test(code)) continue
    const isMethod = code[m.index + m[0].length - name.length - 2] === '.'
    if (fn.className && fn.name !== '__init__' && !isMethod) continue
    if (!fn.className && isMethod) continue
    if (isMethod) {
      const receiver = code.slice(0, m.index + m[0].length - name.length - 2).match(/[\w.\][]+$/)?.[0] ?? ''
      const cls = (frame && lookupDotted(frame, receiver)?.cls) || madeAs(receiver)
      if (cls ? cls !== fn.className : !lab.labReceiver.test(receiver)) continue
    }
    out.push(fn.key)
  }
  return [...new Set(out)]
}
function pyKey(t) {
  if (!t || t.kind === 'space') return null
  if (t.property && ['np', 'torch', 'nn', 'gym', 'random', 'math', 'F'].includes(t.object)) return PY[`${t.object}.${t.text}`] ? `${t.object}.${t.text}` : PY[t.text] ? t.text : null
  return PY[t.text] ? t.text : null
}

function FunctionCard({ lab, fnKey, onLesson, onOpen, open = false }) {
  const f = lab.FUNCTIONS[fnKey]
  if (!f) return null
  const [file, qual] = fnKey.split(':')
  const lesson = lab.lessonById(f.lesson)
  return <details className="ps-fcard" open={open}>
    <summary><span className="mono">{qual}()</span> <small>{file}</small> — <Markdown inline>{f.summary}</Markdown></summary>
    {f.inputs.length > 0 && <table className="qm-log qm-left"><tbody>{f.inputs.map(([n, m]) => <tr key={n}><td className="mono">{n}</td><td><Markdown inline>{m}</Markdown></td></tr>)}</tbody></table>}
    <p><b>Gives back:</b> <Markdown inline>{f.returns}</Markdown></p>
    <p className="qm-hint">{onOpen && <button className="qm-link" onClick={() => onOpen(file, lab.src.functionsOf(file).find(x => x.qual === qual)?.start)}>Show its code</button>}{lesson && <> · taught in <button className="qm-link" onClick={() => onLesson?.(lesson.id)}>{lesson.number} {lesson.title}</button></>}</p>
  </details>
}

function CodePanel({ lab, file, current, callSites, selected, onSelect, calcNow }) {
  const box = useRef(null)
  useEffect(() => { box.current?.querySelector('.qm-py-line.current, .qm-py-line.selected')?.scrollIntoView({ block: 'nearest' }) }, [current, file, selected])
  const lines = lab.src.SOURCES[file].split('\n')
  return <div className="qm-py-code" ref={box}>
    {lines.map((text, i) => {
      const n = i + 1, noted = lab.notes.notesFor(file, n).length > 0
      return <div key={n} className={`qm-py-line${n === current ? ' current' : ''}${callSites.has(n) ? ' call-site' : ''}${n === selected ? ' selected' : ''}`} onClick={() => onSelect(n)}>
        <span className="qm-ln">{n === current ? '▶' : callSites.has(n) ? '↳' : ''}{n}</span>
        <code>{tokenizePython(text).map((t, k) => <span key={k} className={`tk-${t.kind}`}>{t.text}</span>)}{text === '' ? ' ' : ''}</code>
        {noted && <span className="qm-py-dot" title="explained in a lesson" />}
        {n === current && calcNow && <span className="ps-calc-inline">will work out: {calcNow[0]} = {calcText(calcNow[1])}</span>}
      </div>
    })}
  </div>
}

function PyChips({ text }) {
  const [open, setOpen] = useState(null)
  const used = [...new Map(tokenizePython(text).map(t => [pyKey(t), t]).filter(([k]) => k)).keys()]
  if (!used.length) return null
  return <><h4>Python on this line</h4>
    <span className="ps-chips">{used.map(k => <button key={k} className={open === k ? 'active' : ''} onClick={() => setOpen(open === k ? null : k)}>{PY[k].title}</button>)}</span>
    {open && <div className="ps-chip-say"><p>{PY[open].say}</p>{PY[open].example && <pre className="mono">{PY[open].example}</pre>}</div>}</>
}

function LineExplain({ lab, file, line, view, onLesson, onOpen, onRunTo, live }) {
  const { SOURCES, fnAt, functionsOf, callSitesOf } = lab.src
  const text = SOURCES[file].split('\n')[line - 1] ?? ''
  const trimmed = text.trim()
  const notes = lab.notes.notesFor(file, line)
  const { tex, logic } = lab.notes.extrasFor(file, line)
  const fn = fnAt(file, line)
  const stack = view?.stack ?? []
  const top = stack.at(-1)
  const depth = stack.findLastIndex(f => f.file === file && fnAt(f.file, f.line)?.key === fn?.key)
  const frame = depth >= 0 ? stack[depth] : null
  const running = top?.file === file && top?.line === line
  const waiting = !running && frame && frame.line === line && depth < stack.length - 1
  const calcNow = running ? calcFor(lab, file, line, frame) : null
  const tokens = tokenizePython(text)
  const names = [...new Set(tokens.filter(t => t.kind === 'name' && !t.property).map(t => t.text))]
  const attrs = [...new Set(tokens.filter((t, i) => t.property && t.object === 'self' && tokens[i + 1]?.text !== '(').map(t => `self.${t.text}`))]
  const rows = [...names.map(n => ({ n, value: frame?.locals[n], means: lab.VARS[n] })), ...attrs.map(n => ({ n, value: frame ? lookupDotted(frame, n) : null, means: lab.VARS[n.slice(5)] }))]
    .filter(r => r.value || r.means).filter(r => !['function', 'module'].includes(r.value?.t) || r.value?.t === 'module')
  const calls = callsOn(lab, text, frame, file, line)
  const fnKey = fn?.key
  const params = fn?.params ?? []
  // A method name more than one class has (reset, step): its static call sites mix them.
  const shared = fn?.className && Object.keys(SOURCES).some(f => functionsOf(f).some(g => g.name === fn.name && g.className && g.key !== fn.key))
  return <div className="qm-py-explain ps-explain">
    <p className="qm-hint">{file}{fn ? ` · ${fn.qual}()` : ''} · line {line}{running ? ' · ▶ runs next' : waiting ? ' · ↳ waiting for a call to return' : ''}</p>
    <pre className="qm-py-big">{trimmed || ' '}</pre>

    <h4>What it does</h4>
    {notes.length ? notes.map((n, i) => <div key={i}>
      <ul className="qm-code-note qm-py-note">{n.bullets.map((b, k) => <li key={k}><Markdown inline>{b}</Markdown></li>)}</ul>
      <p className="qm-hint">From lesson <button className="qm-link" onClick={() => onLesson?.(n.lesson.id)}>{n.lesson.number} {n.lesson.title}</button></p>
    </div>) : <p>{GENERAL[trimmed] ?? (trimmed === '' ? 'A blank line, for reading.' : trimmed.startsWith('#') ? 'A comment: for people reading the code. Python ignores it.' : trimmed.startsWith('"""') ? 'A docstring: the function\'s description, for people. Python stores it but never runs it.' : /^(import|from)\s/.test(trimmed) ? 'Loads another module, so this file can use the names it defines.' : 'This line continues the statement above it.')}</p>}

    {tex && <><h4>In maths</h4><div className="ps-tex"><Markdown>{`$$${tex}$$`}</Markdown></div></>}
    {calcNow && <><h4>With this step's numbers</h4><pre className="ps-calc mono">{calcNow[0]}{'\n'}= {calcText(calcNow[1])}</pre><p className="qm-hint">Python hasn't run this line yet: this is what it is about to work out, from the values below. Step to watch it happen.</p></>}
    {!calcNow && lab.notes.extrasFor(file, line).calc && <p className="qm-hint">When this line is about to run, its arithmetic is written out here with that step's numbers.</p>}
    {logic && <><h4>The logic, in words</h4><div className="ps-logic"><Markdown>{logic}</Markdown>{calcNow && typeof calcNow[1] === 'boolean' && <p><b>Right now it is {calcNow[1] ? 'True' : 'False'}.</b></p>}</div></>}

    {view && frame && <><h4>How the program got here</h4>
      <ol className="ps-chain">{stack.slice(0, depth + 1).map((f, i) => {
        const q = fnAt(f.file, f.line)?.qual ?? f.function
        const callText = SOURCES[f.file]?.split('\n')[f.line - 1]?.trim()
        return <li key={i} className={i === depth ? 'here' : ''}>
          <button className="qm-link mono" onClick={() => onOpen(f.file, f.line)}>{q}()</button> <small>{f.file}, line {f.line}</small>
          {i < depth ? <div className="mono ps-callline">{callText}</div> : <div className="qm-hint">{running ? 'this line runs next' : waiting ? 'this line is waiting: the call it made is still running' : 'you are looking at this function'}</div>}
        </li>
      })}</ol>
      {depth > 0 && <p className="qm-hint">Each line above called the function below it. When <span className="mono">{fn?.qual}()</span> returns, Python goes back to line {stack[depth - 1].line} of {stack[depth - 1].file} and finishes that line with the value it gives back.</p>}
      {params.length > 0 && <><p><b><span className="mono">{fn.qual}()</span> was called with</b> (values now):</p>
        <table className="qm-log qm-left"><tbody>{params.map(p => <tr key={p}><td className="mono">{p}</td><td className="mono qm-py-val">{show(frame.locals[p])}</td><td><Markdown inline>{lab.FUNCTIONS[fnKey]?.inputs.find(([n]) => n === p)?.[1] ?? ''}</Markdown></td></tr>)}</tbody></table></>}
      {view.returned && depth === stack.length - 1 && <p className="ps-returned"><span className="mono">{view.returned.function}()</span> just returned <span className="mono">{show(view.returned.value)}</span> to this line.</p>}
    </>}
    {!frame && fnKey && callSitesOf(fnKey).length > 0 && <><h4>Called from</h4>
      <ul className="ps-sites">{callSitesOf(fnKey).map((s, i) => <li key={i}><button className="qm-link mono" onClick={() => onOpen(s.file, s.line)}>{s.file}:{s.line}</button> {s.caller ? <small>in {s.caller}()</small> : null}<div className="mono ps-callline">{s.text}</div></li>)}</ul>
      {shared && <p className="qm-hint">Read from the code by name, so it lists every <span className="mono">.{fn.name}(</span>, whichever class it belongs to. Run the program to see the real caller.</p>}</>}

    {calls.length > 0 && <><h4>This line calls</h4>{calls.map(k => <FunctionCard key={k} lab={lab} fnKey={k} onLesson={onLesson} onOpen={onOpen} />)}
      <p className="qm-hint">Step into goes inside {calls.length > 1 ? 'the first of them' : 'it'}; Step over runs the whole line as one step.</p></>}

    {rows.length > 0 && <><h4>The names on this line{frame ? ', right now' : ''}</h4>
      <table className="qm-log qm-left"><tbody>{rows.map(r => <tr key={r.n}><td className="mono">{r.n}</td><td className="mono qm-py-val">{r.value ? show(r.value) : ''}</td><td>{r.means ? <Markdown inline>{r.means}</Markdown> : null}</td></tr>)}</tbody></table></>}

    <PyChips text={text} />

    {fnKey && lab.FUNCTIONS[fnKey] && <><h4>The function this line is in</h4><FunctionCard lab={lab} fnKey={fnKey} onLesson={onLesson} open /></>}
    {live && !running && fn && <p><button onClick={() => onRunTo(file, line)}>▶ Run until this line is about to run</button></p>}
  </div>
}

export default function PythonTab({ lab, request, onLesson }) {
  const { SOURCES, fnAt, filesFor, midStatement } = lab.src
  const { PROGRAMS, Picture } = lab
  const api = typeof window !== 'undefined' ? window.openCalcDesktop?.aarcade : null
  const [programId, setProgramId] = useState(request?.program ?? Object.keys(PROGRAMS)[0])
  const program = PROGRAMS[programId]
  const [opts, setOpts] = useState({})
  const [status, setStatus] = useState(null), [setupLog, setSetupLog] = useState(''), [settingUp, setSettingUp] = useState(false)
  const [timeline, setTimeline] = useState([]), [at, setAt] = useState(null)
  const [busy, setBusy] = useState(false), [ended, setEnded] = useState(null), [error, setError] = useState(null)
  const [file, setFile] = useState(program.file), [selected, setSelected] = useState(null)
  const [knob, setKnob] = useState({})

  useEffect(() => { if (api) api.status().then(setStatus).catch(e => setError(String(e))) }, [api])
  useEffect(() => api?.onOutput?.(m => { if (m.type === 'setup') setSetupLog(log => (log + m.text).slice(-8000)) }), [api])
  useEffect(() => { if (request) { setProgramId(request.program); setFile(PROGRAMS[request.program].file); reset() } }, [request])

  const index = at ?? timeline.length - 1
  const view = timeline[index] ?? null
  const top = view?.stack.at(-1)
  const callSites = new Set((view?.stack ?? []).slice(0, -1).filter(f => f.file === file).map(f => f.line))
  const own = filesFor(program.module)
  const files = lab.fileOrder.filter(f => SOURCES[f] && (own.has(f) || f === program.file || f === file))

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
  const kwargs = { ...program.kwargs(), ...opts }
  const load = () => { reset(); return send({ cmd: 'load', files: { ...SOURCES, ...(lab.dataFiles ?? {}) }, entry: { module: program.module, function: program.function, kwargs }, watch: program.watch, actions: program.actions }) }
  // One statement is one step: Step into and Step over carry on past the extra pauses Python makes
  // inside a statement written over several lines.
  async function step(mode, extra = {}) {
    if (mode !== 'into' && mode !== 'over') return send({ cmd: 'step', mode, ...extra })
    setBusy(true); setError(null)
    try {
      const before = timeline.at(-1)
      let r = await api.send({ cmd: 'step', mode, ...extra })
      for (let k = 0; k < 6 && r.type === 'pause' && midStatement(before?.stack.at(-1), r.stack.at(-1), before?.stack.length, r.stack.length); k++) r = await api.send({ cmd: 'step', mode: 'over' })
      accept(r)
    } catch (e) { setError(String(e.message ?? e)) } finally { setBusy(false) }
  }
  const setValue = (target, value) => send({ cmd: 'set', target, value })
  async function setup() {
    setSettingUp(true); setSetupLog('')
    try { const r = await api.setup(); if (!r.ok) setError(r.reason); setStatus(await api.status()) } finally { setSettingUp(false) }
  }
  const openAt = (f, line) => { setFile(f); setSelected(line ?? null) }

  const live = api && status?.ready && timeline.length > 0 && !ended && at === null
  const showLine = selected ?? (top?.file === file ? top.line : null)
  const calcNow = top?.file === file ? calcFor(lab, file, top.line, top) : null
  return <div className="qm-py ps-py">
    <div className="qm-py-bar">
      <label>Program <select value={programId} onChange={e => { setProgramId(e.target.value); setFile(PROGRAMS[e.target.value].file); setOpts({}); reset() }}>{Object.entries(PROGRAMS).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}</select></label>
      {Object.entries(program.choices ?? {}).map(([k, values]) => <label key={k}>{k} <select value={kwargs[k]} onChange={e => { const value = values.find(v => String(v) === e.target.value); setOpts(o => ({ ...o, [k]: value })); reset() }}>{values.map(v => <option key={v}>{v}</option>)}</select></label>)}
      {'seed' in kwargs && <label>seed <input type="number" value={kwargs.seed} style={{ width: 56 }} onChange={e => { setOpts(o => ({ ...o, seed: Number(e.target.value) || 0 })); reset() }} /></label>}
      {api && status?.ready && <>
        <button className="qm-primary" disabled={busy} onClick={load}>{timeline.length ? '↺ Restart' : '▶ Load and pause at the first line'}</button>
        <button disabled={!live || busy} onClick={() => step('into')} title="Run one line; go inside any function it calls">Step into</button>
        <button disabled={!live || busy} onClick={() => step('over')} title="Run one line, including any function it calls">Step over</button>
        <button disabled={!live || busy} onClick={() => step('out')} title="Run until this function returns">Step out</button>
        {program.actions.length > 0 && <button disabled={!live || busy} onClick={() => step('action')} title={program.actionTitle ?? 'Run until the world has answered the next move'}>{program.actionLabel ?? 'Next move'}</button>}
        {program.episodeEnd().length > 0 && <button disabled={!live || busy} onClick={() => step('lines', { targets: program.episodeEnd() })}>{program.endLabel ?? 'Next game'}</button>}
        <button disabled={!live || busy || !selected} onClick={() => step('line', { file, line: selected })} title="Run until the selected line is about to run">Run to selected line</button>
      </>}
      {timeline.length > 1 && <span className="qm-py-history">
        <button disabled={index <= 0} onClick={() => setAt(Math.max(0, index - 1))}>◀ Back</button>
        <button disabled={at === null} onClick={() => setAt(at + 1 >= timeline.length - 1 ? null : at + 1)}>Forward ▶</button>
        <span className="qm-hint">{at === null ? `pause ${timeline.length}` : `looking at pause ${index + 1} of ${timeline.length} (a record: Python isn't rewound)`}</span>
      </span>}
    </div>
    {!api && <p className="qm-py-banner">Running real Python needs the UpSkillOS desktop app. Here you can still read every program and click any line: what it does, its maths and logic, where it is called from, what it calls, and the lesson that teaches it. {lab.intro}</p>}
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
        <CodePanel lab={lab} file={file} current={top?.file === file ? top.line : null} callSites={callSites} selected={selected} onSelect={setSelected} calcNow={calcNow} />
      </section>
      <section className="qm-py-mid">
        <Picture program={program} view={view} start={timeline[0]} />
        {program.knobs && live && <div className="qm-py-knobs">{program.knobs.filter(([k]) => top?.locals[k]).map(([k, label]) => <label key={k}>{label} <input type="number" step="0.01" value={knob[k] ?? top.locals[k].v} onChange={e => setKnob(o => ({ ...o, [k]: e.target.value }))} /><button disabled={busy} onClick={() => setValue(k, Number(knob[k] ?? top.locals[k].v))}>set</button></label>)}</div>}
        {view && <><h4>Running: {view.stack.map(f => `${fnAt(f.file, f.line)?.qual ?? f.function}()`).join(' → ')}</h4>
          <table className="qm-log qm-left"><tbody>{Object.entries(top?.locals ?? {}).filter(([, v]) => v.t !== 'function').map(([k, v]) => <tr key={k}><td className="mono">{k}</td><td className="mono qm-py-val">{show(v)}</td></tr>)}</tbody></table>
          {view.output && <pre className="qm-py-log">{view.output}</pre>}</>}
      </section>
      <section className="qm-py-right">
        {showLine ? <LineExplain lab={lab} file={file} line={showLine} view={view} onLesson={onLesson} onOpen={openAt} live={live} onRunTo={(f, line) => step('line', { file: f, line })} />
          : <div className="qm-py-explain"><p>{program.about}</p><p className="qm-hint">Click any line of code to see it explained. Lines with a dot are explained in a lesson.</p>
            <FunctionCard lab={lab} fnKey={`${program.module}.py:${program.function}`} onLesson={onLesson} onOpen={openAt} open /></div>}
      </section>
    </div>
  </div>
}
