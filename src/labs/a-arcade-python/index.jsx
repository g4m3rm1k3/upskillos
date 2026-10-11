import { useEffect, useMemo, useRef, useState } from 'react'
import Katex from '../../components/concept-explorer/Katex.jsx'
import { useOpenLab } from '../../components/desktop/useOpenLab.js'
import { PROGRAMS } from './programs/index.js'
import { analyseProgram, plain, tokenizePython } from './analysis.js'
import { PY } from './explain/python.js'
import { PIECES, pathTo as piecePath, parentsOf } from './pieces.js'
import { BarsView, Cart, CorridorView, LengthsView, LineView, NetworkView, QTableView, num, obsOf } from './views.jsx'
import './style.css'

const MAX_RECORDED = 1500
// How long Play waits between commands (ms), by what it steps through and its speed.
const PLAY_DELAY = { into: { slow: 900, medium: 300, fast: 40 }, over: { slow: 1200, medium: 450, fast: 80 }, action: { slow: 500, medium: 120, fast: 0 } }

// ── Values ───────────────────────────────────────────────────────────────────────────────────
// A live value from Python, in words: numbers as numbers, arrays by shape and first values.
export function show(s, depth = 0) {
  if (!s) return '—'
  switch (s.t) {
    case 'int': case 'float': return num(s.v)
    case 'bool': return s.v ? 'True' : 'False'
    case 'none': return 'None'
    case 'str': return JSON.stringify(s.v)
    case 'function': return `function ${s.v}`
    case 'ndarray': case 'tensor': {
      const kind = s.t === 'tensor' ? 'tensor' : 'array'
      if (s.shape.length === 0) return num(s.v[0])
      const head = (s.v ?? []).slice(0, s.size <= 8 ? 8 : 6).map(num).join(', ')
      return s.size <= 8 && s.shape.length === 1 ? `${kind}([${head}])` : `${kind} ${s.shape.join(' × ')}: [${head}${s.size > 6 ? ', …' : ''}]`
    }
    case 'list': case 'tuple': {
      if (!s.items) return `${s.t} of ${s.len}`
      if (depth > 0 || s.len > 6) return `${s.t} of ${s.len}${s.items.length ? `: ${show(s.items[0], depth + 1)}, …` : ''}`
      const inner = s.items.map(x => show(x, depth + 1)).join(', ')
      return s.t === 'tuple' ? `(${inner})` : `[${inner}]`
    }
    case 'dict': return s.items ? `{${Object.entries(s.items).slice(0, 4).map(([k, v]) => `${k}: ${show(v, depth + 1)}`).join(', ')}${s.len > 4 ? ', …' : ''}}` : `dict of ${s.len}`
    case 'module': return `${s.cls} (${Object.values(s.params).reduce((n, p) => n + p.size, 0)} weights)`
    case 'object': return s.attrs ? `${s.cls} { ${Object.keys(s.attrs).join(', ')} }` : s.cls
    default: return s.v === undefined ? s.t : String(s.v)
  }
}
// A dotted name (agent.epsilon) read from the innermost running function that has its first part.
function lookup(view, expr) {
  const [root, ...rest] = expr.split('.')
  for (let k = (view?.stack.length ?? 0) - 1; k >= 0; k--) {
    let s = view.stack[k].locals[root]
    if (!s) continue
    for (const part of rest) s = s?.attrs?.[part]
    if (s) return s
  }
  return null
}

// ── Code ─────────────────────────────────────────────────────────────────────────────────────
function CodePanel({ file, info, view, original, selection, onSelect, calcNow }) {
  const box = useRef(null)
  const a = info[file], top = view?.stack.at(-1)
  const current = top?.file === file ? top.line : null
  const callSites = new Set((view?.stack ?? []).slice(0, -1).filter(f => f.file === file).map(f => f.line))
  useEffect(() => { box.current?.querySelector('.ap-line.current')?.scrollIntoView({ block: 'nearest' }) }, [current, file, view])
  const originalLines = original ? new Set(original.split('\n')) : null
  return <div className="ap-code" ref={box} role="region" aria-label={`${file} code`}>
    {a.lines.map((text, i) => {
      const n = i + 1, tokens = tokenizePython(text)
      const selected = selection && selection.file === file && (selection.kind === 'line' || selection.kind === 'token') && selection.line === n
      const edited = originalLines && text.trim() && !originalLines.has(text)
      return <div key={n} className={`ap-line${n === current ? ' current' : ''}${callSites.has(n) ? ' call-site' : ''}${selected ? ' selected' : ''}${edited ? ' edited' : ''}`}
        onClick={e => { if (!e.target.dataset.tok) onSelect({ kind: 'line', file, line: n }) }}>
        <span className="ap-gutter">{n === current ? '▶' : callSites.has(n) ? '↳' : edited ? '✎' : ''}<b>{n}</b></span>
        <code>{tokens.map((t, k) => ['space', 'comment', 'number', 'string'].includes(t.kind)
          ? <span key={k} className={`tk-${t.kind}`}>{t.text}</span>
          : <span key={k} data-tok="1" className={`tk-${t.kind}`} onClick={() => onSelect({ kind: 'token', file, line: n, token: t })}>{t.text}</span>)}</code>
        {n === current && calcNow && <span className="ap-calc-inline">this line will work out: {calcNow[0]} = {Array.isArray(calcNow[1]) ? `[${calcNow[1].map(num).join(', ')}]` : num(calcNow[1])}</span>}
      </div>
    })}
  </div>
}

// The note's arithmetic for the line about to run, with that function's live values.
function calcFor(view, info) {
  const top = view?.stack.at(-1)
  const note = top && info[top.file]?.notes[top.line]
  if (!note?.calc) return null
  const values = Object.fromEntries([...Object.entries(top.consts ?? {}), ...Object.entries(top.locals)].map(([k, v]) => [k, plain(v)]))
  try { const out = note.calc(values); return out && out[1] !== undefined && !Number.isNaN(out[1]) ? out : null } catch { return null }
}

// ── Explanations ─────────────────────────────────────────────────────────────────────────────
function frameAt(view, file, fnName) {
  for (let k = (view?.stack.length ?? 0) - 1; k >= 0; k--) if (view.stack[k].file === file && view.stack[k].function === fnName) return view.stack[k]
  return null
}
function PieceLink({ id, onSelect }) {
  return id && PIECES[id] ? <><h3>The idea behind it</h3><button className="ap-piece-link" onClick={() => onSelect({ kind: 'piece', id })}>{PIECES[id].title} — {PIECES[id].question}</button></> : null
}
function FunctionCard({ fileFn, program, onSelect }) {
  const f = program.explain.FUNCTIONS[fileFn]; if (!f) return null
  const [file, name] = fileFn.split(':')
  return <button className="ap-fcard" onClick={() => onSelect({ kind: 'function', key: fileFn })}><strong>{name}() <small>{file}</small></strong><span>{f.summary}</span><small>gives back: {f.returns}</small></button>
}
// Which program functions a line calls, as file:function keys.
function callsOn(text, info) {
  const out = []
  for (const [file, a] of Object.entries(info)) for (const fn of a.functions) if (new RegExp(`(^|[^\\w.])${fn.name}\\(|\\.${fn.name}\\(`).test(text) && fn.name !== '__init__') out.push(`${file}:${fn.name}`)
  if (/\bTableCartPole\(/.test(text)) out.push('cartpole_table.py:__init__')
  if (/\bQAgent\(/.test(text)) out.push('agent.py:__init__')
  if (/\bActorCritic\(/.test(text)) out.push('actor_critic.py:__init__')
  if (/\bnet\(/.test(text)) out.push('actor_critic.py:forward')
  return [...new Set(out)]
}

function LineExplain({ sel, info, view, program, onSelect, onRunTo, live, calcNow }) {
  const a = info[sel.file], text = a.lines[sel.line - 1] ?? '', note = a.notes[sel.line], fn = a.lineFn[sel.line]
  const top = view?.stack.at(-1), running = top?.file === sel.file && top?.line === sel.line
  const frame = fn && frameAt(view, sel.file, fn.name)
  const names = [...new Set(tokenizePython(text).filter(t => t.kind === 'name' && !t.property).map(t => t.text))]
  const rows = names.map(n => ({ n, value: frame?.locals[n], means: program.explain.VARS[n] })).filter(r => r.value || r.means)
  const pyUsed = [...new Map(tokenizePython(text).map(t => [pyKey(t), t]).filter(([k]) => k && PY[k])).entries()]
  return <div className="ap-explain">
    <p className="ap-crumbs">{sel.file}{fn ? <> · <button className="ap-link" onClick={() => onSelect({ kind: 'function', key: `${sel.file}:${fn.name}` })}>{fn.name}()</button></> : ''} · line {sel.line}{note?.phase ? <> · <span className="ap-phase-chip">{program.phases.find(p => p[0] === note.phase)?.[1]}</span></> : null}</p>
    {running && <p className="ap-running">▶ This line runs next</p>}
    <pre className="ap-bigcode">{text.trim() || ' '}</pre>
    <h3>What this line does</h3>
    <p className="ap-say">{note?.say ?? (fn ? (a.continuation[sel.line] ? 'This continues the statement on the line above.' : 'Part of the function above; click any word in it.') : text.trim().startsWith('#') ? 'A comment: for people reading the code. Python ignores it.' : 'Top-level code: it runs once, when the file is first imported.')}</p>
    {note?.tex && <div className="ap-tex"><Katex latex={note.tex} /></div>}
    {running && calcNow && <div className="ap-calc"><h3>With this step's numbers</h3><pre className="mono">{calcNow[0]}{'\n'}= {Array.isArray(calcNow[1]) ? `[${calcNow[1].map(num).join(', ')}]` : num(calcNow[1])}</pre><p className="ap-hint">Python hasn't run this line yet: this is what it will work out. Step to watch it happen.</p></div>}
    {!running && note?.calc && <p className="ap-hint">When this line is about to run, it is worked out here with that step's numbers.</p>}
    {live && !running && fn && <p><button className="ap-runto" onClick={() => onRunTo(sel.file, sel.line)}>▶ Run until this line runs</button></p>}
    {rows.length > 0 && <><h3>The names on this line{frame ? ', right now' : ''}</h3><table className="ap-table"><tbody>{rows.map(r => <tr key={r.n}><td><button className="ap-link mono" onClick={() => onSelect({ kind: 'token', file: sel.file, line: sel.line, token: { text: r.n, kind: 'name' } })}>{r.n}</button></td><td>{r.means ?? ''}</td><td className="mono ap-val">{r.value ? show(r.value) : ''}</td></tr>)}</tbody></table></>}
    {callsOn(text, info).length > 0 && <><h3>This line calls</h3>{callsOn(text, info).map(k => <FunctionCard key={k} fileFn={k} program={program} onSelect={onSelect} />)}<p className="ap-hint">Step into goes inside; Step over runs the whole call as one step.</p></>}
    {pyUsed.length > 0 && <><h3>Python on this line</h3><span className="ap-chips">{pyUsed.map(([k, t]) => <button key={k} className="ap-chip" onClick={() => onSelect({ kind: 'token', file: sel.file, line: sel.line, token: t })}>{PY[k].title}</button>)}</span></>}
    <PieceLink id={note?.piece} onSelect={onSelect} />
  </div>
}
// The PY entry for a token: library calls by module.name, methods by their name.
function pyKey(t) {
  if (!t) return null
  if (t.property && ['np', 'torch', 'nn', 'gym'].includes(t.object)) return PY[`${t.object}.${t.text}`] ? `${t.object}.${t.text}` : PY[t.text] ? t.text : null
  if (t.property) return PY[t.text] ? t.text : null
  if (t.kind === 'keyword' || t.kind === 'op') return PY[t.text] ? t.text : null
  return PY[t.text] && ['range', 'reversed', 'zip', 'int', 'float', 'len', 'min', 'print', 'super', 'self', 'time', 'SyncVectorEnv', 'Categorical', 'Adam', 'default_rng'].includes(t.text) ? t.text : null
}

function FunctionExplain({ fkey, info, view, program, onSelect }) {
  const [file, name] = fkey.split(':'), f = program.explain.FUNCTIONS[fkey] ?? {}, fn = info[file]?.functions.find(x => x.name === name)
  const frame = frameAt(view, file, name)
  return <div className="ap-explain">
    <p className="ap-crumbs">{file} · {program.explain.FILES[file]?.about}</p>
    {frame && <p className="ap-running">▶ Running now</p>}
    <h2 className="mono">{name}({fn?.params.join(', ')})</h2>
    <p className="ap-summary">{f.summary}</p><p className="ap-say">{f.purpose}</p>
    <h3>Inputs</h3><table className="ap-table"><thead><tr><th>Input</th><th>What it is</th><th>{frame ? 'Now' : ''}</th></tr></thead><tbody>
      {(f.inputs ?? []).map(([p, m]) => <tr key={p}><td className="mono">{p}</td><td>{m}</td><td className="mono ap-val">{frame?.locals[p] ? show(frame.locals[p]) : ''}</td></tr>)}</tbody></table>
    <h3>Gives back</h3><p>{f.returns}</p>
    {fn && <><h3>Its code</h3><p><button className="ap-link" onClick={() => onSelect({ kind: 'line', file, line: fn.header + 1 })}>{file}, lines {fn.start}–{fn.end}: start at its first line</button></p></>}
    <PieceLink id={f.piece} onSelect={onSelect} />
  </div>
}

function TokenExplain({ sel, info, view, program, onSelect }) {
  const { token, file, line } = sel, key = pyKey(token)
  const back = <p><button className="ap-link" onClick={() => onSelect({ kind: 'line', file, line })}>← The whole of line {line}</button></p>
  const fn = info[file].lineFn[line]
  const own = Object.entries(info).flatMap(([f, a]) => a.functions.filter(x => x.name === token.text).map(x => `${f}:${x.name}`))
  if (own.length && !token.property || (token.property && own.length && token.object === 'self')) return <FunctionExplain fkey={own[0]} info={info} view={view} program={program} onSelect={onSelect} />
  const frame = fn && frameAt(view, file, fn.name)
  const value = frame?.locals[token.text] ?? (token.property ? null : lookup(view, token.text))
  const means = program.explain.VARS[token.text]
  if (key && !(value && means)) return <div className="ap-explain">{back}<p className="ap-eyebrow">PYTHON</p><h2 className="mono">{PY[key].title}</h2><p className="ap-say">{PY[key].say}</p><h3>Example</h3><pre className="ap-bigcode">{PY[key].example}</pre></div>
  const attr = token.property && token.object && lookup(view, `${token.object}.${token.text}`)
  return <div className="ap-explain">{back}<p className="ap-eyebrow">{token.property ? `PART OF ${token.object}` : 'A NAME'}</p>
    <h2 className="mono">{token.property ? `${token.object}.${token.text}` : token.text}</h2>
    <p className="ap-say">{means ?? (token.property ? `The value called "${token.text}" belonging to ${token.object}.` : 'A name used on this line.')}</p>
    {(value || attr) && <><h3>Right now</h3><pre className="ap-bigcode">{show(value || attr)}</pre></>}
  </div>
}

function PieceExplain({ id, onSelect }) {
  const p = PIECES[id]
  return <div className="ap-explain">
    <p className="ap-crumbs">{piecePath(id).map((q, i) => <span key={q}>{i > 0 && ' › '}<button className="ap-link" onClick={() => onSelect({ kind: 'piece', id: q })}>{PIECES[q].title}</button></span>)}</p>
    <p className="ap-eyebrow">THE IDEA BEHIND THE CODE</p><h2>{p.title}</h2><p className="ap-summary">{p.question}</p>
    {p.plain.map((t, i) => <p key={i} className="ap-say">{t}</p>)}
    <h3>The maths</h3>{p.math.map((m, i) => <div className="ap-tex" key={i}><Katex latex={m.tex} /><p>{m.say}</p></div>)}
    {p.symbols.length > 0 && <><h3>Every symbol</h3><table className="ap-table"><tbody>{p.symbols.map(s => <tr key={s.tex}><td><Katex latex={s.tex} display={false} /></td><td>{s.say}</td><td>{s.means}</td></tr>)}</tbody></table></>}
    {p.example.steps.length > 0 && <div className="ap-worked"><h3>Work it by hand</h3><p>{p.example.setup}</p><ol>{p.example.steps.map((x, i) => <li key={i}>{x.tex ? <Katex latex={x.tex} /> : x.text}</li>)}</ol></div>}
    {p.parts.length > 0 && <><h3>Made of</h3><span className="ap-chips">{p.parts.map(q => <button key={q} className="ap-chip" onClick={() => onSelect({ kind: 'piece', id: q })}>{PIECES[q].title}</button>)}</span></>}
    {parentsOf(id).length > 0 && <><h3>Part of</h3><span className="ap-chips">{parentsOf(id).map(q => <button key={q} className="ap-chip" onClick={() => onSelect({ kind: 'piece', id: q })}>{PIECES[q].title}</button>)}</span></>}
  </div>
}

// One table placing every method in the lab: they differ in the number that multiplies
// ∇log π (or the target a value moves to) and in when they update.
const FAMILY = [
  ['Q-learning (programs 3, your Ch 1–2)', 'no policy network: Q(s, a) moves towards r + γ max Q(s′, ·)', 'every step', 'the table is the critic'],
  ['REINFORCE (8)', 'G_t, the whole return after step t', 'once per game, after it ends', 'none'],
  ['REINFORCE with a baseline (7, and 8 normalised)', 'G_t − b: the return minus what is usual', 'once per game (or per pull)', 'a baseline: an average'],
  ['One-step actor-critic (9)', 'δ = r + γV(s′) − V(s), the TD error', 'every step', 'V(s), trained on δ²'],
  ['A2C, your Chapter 4', 'G_t^(n) − V(s): n = 5 real rewards, then V', 'every 5 steps, from 8 worlds at once (40 moves)', 'V(s), trained on (G − V)²'],
]
function FamilyMap({ onSelect }) {
  return <section className="ap-family" aria-label="One family of methods">
    <h3>One family: what changes from method to method</h3>
    <p className="ap-say">Every policy-gradient method makes the same move: raise log π(a | s) for the action taken, scaled by a number saying how good it turned out. Read any article, book or codebase by asking two questions: <b>what number multiplies ∇log π?</b> and <b>when does it update?</b> The rest is detail.</p>
    <table className="ap-table"><thead><tr><th>Method</th><th>Multiplies ∇log π by</th><th>Updates</th><th>Critic</th></tr></thead>
      <tbody>{FAMILY.map(row => <tr key={row[0]}>{row.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody></table>
    <p className="ap-hint">The equation underneath all of them: <button className="ap-link" onClick={() => onSelect({ kind: 'piece', id: 'policy-gradient' })}>the policy gradient</button>. Program 6 checks it with real numbers.</p>
  </section>
}

function Overview({ program, info, view, onSelect }) {
  const running = new Set((view?.stack ?? []).map(f => `${f.file}:${f.function}`))
  return <div className="ap-explain">
    <p className="ap-eyebrow">{program.group.toUpperCase()}</p><h2>{program.label}</h2>
    <p className="ap-say">{program.intro} Everything starts in <b>{program.entry.function}()</b> in {program.entry.module}.py. Press Step into to start, or {program.actionLabel ?? 'Next action'} to jump ahead one move at a time. Click any line, function or name to have it explained here.</p>
    {program.order.map(file => <div key={file} className="ap-file-card"><b className="mono">{file}</b><p>{program.explain.FILES[file].about}</p>
      <span className="ap-chips">{info[file].functions.map(fn => <button key={fn.name} className={`ap-chip${running.has(`${file}:${fn.name}`) ? ' running' : ''}`} onClick={() => onSelect({ kind: 'function', key: `${file}:${fn.name}` })}>{fn.name}()</button>)}</span></div>)}
    <FamilyMap onSelect={onSelect} />
  </div>
}

// ── The lab ──────────────────────────────────────────────────────────────────────────────────
export default function AArcadePython() {
  const api = typeof window !== 'undefined' ? window.openCalcDesktop?.aarcade : null
  const openLab = useOpenLab()
  const [programId, setProgramId] = useState('q')
  const program = PROGRAMS[programId]
  const [sources, setSources] = useState(() => Object.fromEntries(Object.entries(PROGRAMS).map(([id, p]) => [id, p.files])))
  const files = sources[programId]
  const info = useMemo(() => analyseProgram(files, program.explain), [files, program])
  const [status, setStatus] = useState(null)
  const [setupLog, setSetupLog] = useState('')
  const [settingUp, setSettingUp] = useState(false)
  const [timeline, setTimeline] = useState([])
  const [at, setAt] = useState(null)
  const [busy, setBusy] = useState(false)
  const [ended, setEnded] = useState(null)
  const [selection, setSelection] = useState(null)
  const [tab, setTab] = useState(program.order[0])
  const [follow, setFollow] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [playMode, setPlayMode] = useState('action')
  const [speed, setSpeed] = useState('medium')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState(null)
  const baseline = useRef(null)
  const criticBaseline = useRef(null)
  const playingRef = useRef(false)
  // Play's loop calls the latest step(), which sees the latest record (not the one from when Play began).
  const stepRef = useRef(null)

  const index = at ?? timeline.length - 1
  const view = timeline[index] ?? null, prevView = timeline[index - 1] ?? null
  const rewound = at !== null
  const calcNow = calcFor(view, info)

  useEffect(() => { if (api) api.status().then(setStatus).catch(e => setError(String(e))) }, [api])
  useEffect(() => api?.onOutput?.(m => { if (m.type === 'setup') setSetupLog(log => (log + m.text).slice(-8000)) }), [api])

  const followView = v => { const top = v?.stack.at(-1); if (follow && top) { setTab(top.file); setSelection({ kind: 'line', file: top.file, line: top.line }) } }
  function accept(r, replace = false) {
    if (r.type === 'pause') {
      if (!baseline.current && r.watch?.network?.value?.params) baseline.current = r.watch.network.value
      if (!criticBaseline.current && r.watch?.critic?.value?.params) criticBaseline.current = r.watch.critic.value
      setTimeline(t => (replace ? [...t.slice(0, -1), r] : [...t, r]).slice(-MAX_RECORDED))
      setAt(null); setEnded(null); followView(r)
      if (r.hitLimit) setError('Stopped after 2,000,000 lines without reaching that point.')
      return true
    }
    setPlaying(false); playingRef.current = false
    setEnded(r)
    if (r.type === 'error' && r.file) { setTab(r.file); setSelection({ kind: 'line', file: r.file, line: r.line }) }
    return false
  }
  async function send(command, replace) {
    setBusy(true); setError(null)
    try { return accept(await api.send(command), replace) } catch (e) { setError(String(e.message ?? e)); return false } finally { setBusy(false) }
  }
  async function load(nextFiles = files, id = programId) {
    baseline.current = null; criticBaseline.current = null; setTimeline([]); setAt(null); setEnded(null); setSelection(null)
    const p = PROGRAMS[id]
    return send({ cmd: 'load', files: nextFiles, entry: p.entry, watch: p.watch, actions: p.actions })
  }
  // A forward command: in the past, replay the record; in the present, Python runs.
  async function step(mode, extra = {}) {
    if (rewound) { const next = at + 1 >= timeline.length - 1 ? null : at + 1; setAt(next); followView(timeline[next ?? timeline.length - 1]); return true }
    if (!timeline.length && !ended) return load()
    if (ended) return false
    return send({ cmd: 'step', mode, ...extra })
  }
  stepRef.current = step
  function stepBack() { setPlaying(false); playingRef.current = false; if (index > 0) { setAt(index - 1); followView(timeline[index - 1]) } }
  function runToPhase(key) {
    const targets = Object.entries(info).flatMap(([file, a]) => a.notes.map((n, line) => n?.phase === key ? [file, line] : null).filter(Boolean))
    step('lines', { targets })
  }
  async function setKnob(target, value) { if (!rewound && view) await send({ cmd: 'set', target, value }, true) }
  function switchProgram(id) {
    setPlaying(false); playingRef.current = false; setProgramId(id); setTab(PROGRAMS[id].order[0]); setEditing(false)
    if (status?.ready) load(sources[id], id)
  }
  async function runDraft() {
    const next = { ...files, [tab]: draft }
    setSources(s => ({ ...s, [programId]: next })); setEditing(false)
    await load(next)
  }

  // Play: repeat a command, waiting for Python each time, until paused or the program ends.
  useEffect(() => {
    playingRef.current = playing
    if (!playing) return
    let cancelled = false
    ;(async () => {
      while (playingRef.current && !cancelled) {
        const ok = await stepRef.current(playMode)
        if (!ok) break
        await new Promise(r => setTimeout(r, PLAY_DELAY[playMode][speed]))
      }
    })()
    return () => { cancelled = true }
  }, [playing])

  if (!api) return <div className="ap-lab ap-browser" role="region" aria-label="A-Arcade Python">
    <h1>A-Arcade Python</h1>
    <p>This lab runs your real Q-Arcade code in real Python (NumPy, Gymnasium, PyTorch), one line at a time, so it needs the UpSkillOS desktop app. Open it there.</p>
    <p>In the browser, <button className="ap-link" onClick={() => openLab('a-arcade-guided')}>A-Arcade Guided</button> teaches the same ideas with the programs written in JavaScript.</p>
  </div>

  const top = view?.stack.at(-1)
  const here = program.view === 'qtable' ? plain(lookup(view, 'state')) : undefined
  const writing = top?.function === 'q_update' ? { state: plain(top.locals.state), action: plain(top.locals.action) } : null
  const phase = (() => { for (let k = (view?.stack.length ?? 0) - 1; k >= 0; k--) { const f = view.stack[k], p = info[f.file]?.notes[f.line]?.phase; if (p) return p } return null })()
  const changedVars = top && prevView?.stack.at(-1)?.function === top.function ? new Set(Object.keys(top.locals).filter(k => show(top.locals[k]) !== show(prevView.stack.at(-1).locals[k]))) : new Set()

  return <div className="ap-lab" role="region" aria-label="A-Arcade Python">
    <header className="ap-header">
      <div><h1>A-Arcade Python</h1><p>Your real code, in real Python, one line at a time. {status?.versions && <span className="mono">{status.versions}</span>}</p></div>
      <div className="ap-program"><label className="ap-picker">Program <select aria-label="Program" value={programId} onChange={e => switchProgram(e.target.value)} disabled={busy}>
          {[...new Set(Object.values(PROGRAMS).map(p => p.group))].map(g => <optgroup key={g} label={g}>{Object.entries(PROGRAMS).filter(([, p]) => p.group === g).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}</optgroup>)}
        </select></label>
        <button onClick={() => load()} disabled={!status?.ready || busy}>{timeline.length ? 'Start again' : 'Start'}</button>
        <button onClick={() => api.restart().then(() => { setTimeline([]); setEnded(null) })} title="End the Python process (also stops a long run)">Stop Python</button></div>
    </header>
    {status && !status.ready && <section className="ap-setup">
      <h2>One-time setup</h2><p>This lab uses its own Python environment with NumPy, Gymnasium and the CPU build of PyTorch (about 300 MB to download), kept separate from the notebooks' environment.</p>
      <button className="ap-primary-light" disabled={settingUp} onClick={async () => { setSettingUp(true); const r = await api.setup(); setSettingUp(false); if (!r.ok) setError(r.reason); setStatus(await api.status()) }}>{settingUp ? 'Setting up…' : 'Set up Python for this lab'}</button>
      {setupLog && <pre className="ap-log">{setupLog}</pre>}
    </section>}
    <div className="ap-controls" role="toolbar" aria-label="Stepping">
      <button onClick={stepBack} disabled={index <= 0}>◀ Step back</button>
      {[['into', 'Step into'], ['over', 'Step over'], ['out', 'Step out'], ['action', program.actionLabel ?? 'Next action']].map(([mode, label]) =>
        <button key={mode} disabled={busy || !status?.ready} onClick={() => { setPlaying(false); step(mode) }}>{label}</button>)}
      <button className="ap-primary" disabled={!status?.ready} onClick={() => setPlaying(p => !p)}>{playing ? 'Ⅱ Pause' : '▶ Play'}</button>
      <label>Play <select aria-label="What Play steps through" value={playMode} onChange={e => setPlayMode(e.target.value)}><option value="action">{(program.actionLabel ?? 'Next action').replace('Next ', 'one ')} at a time</option><option value="over">this function's lines</option><option value="into">every line</option></select></label>
      <label>Speed <select aria-label="Play speed" value={speed} onChange={e => setSpeed(e.target.value)}><option value="slow">slow</option><option value="medium">medium</option><option value="fast">fast</option></select></label>
      <label className="ap-follow"><input type="checkbox" checked={follow} onChange={e => setFollow(e.target.checked)} /> Explain each line as it runs</label>
      <span className="ap-count">{busy ? 'Python is running…' : view ? `${view.linesRun.toLocaleString()} lines run` : 'not started'}</span>
    </div>
    {program.phases.length > 0 && <div className="ap-phases" role="toolbar" aria-label="Parts of the loop">
      {program.phases.map(([key, label, says]) => <button key={key} className={phase === key ? 'active' : ''} disabled={busy || rewound || !view} title={`${says} Click to run to the next ${label.toLowerCase()}.`} onClick={() => runToPhase(key)}>{label}<small>{says}</small></button>)}
    </div>}
    {timeline.length > 1 && <div className="ap-scrub"><label>Recorded steps <input type="range" aria-label="Recorded steps" min="0" max={timeline.length - 1} value={index} onChange={e => { const i = Number(e.target.value); setPlaying(false); setAt(i >= timeline.length - 1 ? null : i); followView(timeline[i]) }} /></label><span>{index + 1} of {timeline.length}{rewound ? ' · looking back (Python is paused at the last one)' : ' · now'}</span>{rewound && <button className="ap-link" onClick={() => { setAt(null); followView(timeline.at(-1)) }}>Back to the present</button>}</div>}
    {error && <p className="ap-error" role="alert">{error} <button className="ap-link" onClick={() => setError(null)}>Dismiss</button></p>}
    {ended && <p className={ended.type === 'error' ? 'ap-error' : 'ap-past'} role="status">{ended.type === 'error' ? <>Python stopped with an error{ended.file ? ` in ${ended.file}, line ${ended.line}` : ''}: <b className="mono">{ended.error}</b></> : ended.type === 'finished' ? `The program finished: ${show(ended.result)}` : 'Stopped.'} <button className="ap-link" onClick={() => load()}>Start again</button></p>}
    <div className="ap-columns">
      <section className="ap-code-column" aria-label="Program">
        <div className="ap-tabs" role="tablist" aria-label="Files">{program.order.map(f => <button key={f} role="tab" aria-selected={tab === f} className={top?.file === f ? 'has-current' : ''} onClick={() => { setTab(f); setEditing(false) }}>{f}{files[f] !== program.files[f] ? ' ✎' : ''}</button>)}
          {!editing ? <button className="ap-edit" onClick={() => { setDraft(files[tab]); setEditing(true) }}>✎ Edit</button> : <button className="ap-edit" onClick={() => setEditing(false)}>Close the editor</button>}</div>
        {editing ? <div className="ap-editor">
          <textarea aria-label={`Edit ${tab}`} spellCheck="false" value={draft} onChange={e => setDraft(e.target.value)} />
          <p><button className="ap-primary-light" onClick={runDraft}>Run my version</button> <button className="ap-link" onClick={() => { const next = { ...files, [tab]: program.files[tab] }; setSources(s => ({ ...s, [programId]: next })); setEditing(false); load(next) }}>Back to the original {tab}</button></p>
          <p className="ap-hint">Your change runs in real Python. If it has a mistake, Python's error is shown with its file and line.</p>
        </div> : <CodePanel file={tab} info={info} view={view} original={files[tab] !== program.files[tab] ? program.files[tab] : null} selection={selection} onSelect={setSelection} calcNow={calcNow} />}
      </section>
      <main className="ap-middle">
        {(program.view === 'qtable' || program.view === 'network') && <div className="ap-cart"><Cart obs={obsOf(view)} ghost={obsOf(prevView)} label={program.files['a2c.py'] ? 'world 1 of 8' : 'Gymnasium CartPole'} /></div>}
        <section className="ap-memory" aria-label={program.view === 'qtable' ? 'Q-table' : program.view === 'network' ? 'Network' : 'What the program holds'}>
          <h3>{program.view === 'qtable' ? 'The Q-table, live from Python' : program.view === 'network' ? 'The network, live from PyTorch' : 'What the program holds, live from Python'}</h3>
          {program.view === 'qtable' && <QTableView table={view?.watch?.table?.value} prev={prevView?.watch?.table?.value} here={typeof here === 'number' ? here : undefined} writing={writing} />}
          {program.view === 'network' && <>
            <NetworkView net={view?.watch?.network?.value} prev={prevView?.watch?.network?.value} baseline={baseline.current} />
            {view?.watch?.critic && <><h3>The critic</h3><NetworkView net={view.watch.critic.value} prev={prevView?.watch?.critic?.value} baseline={criticBaseline.current} /></>}
            <LengthsView view={view} />
          </>}
          {program.view === 'corridor' && <CorridorView view={view} prev={prevView} />}
          {program.view === 'bars' && <BarsView view={view} prev={prevView} bars={program.bars} item={program.barItem} />}
          {program.view === 'line' && <LineView view={view} />}
        </section>
        <div className="ap-explain-box" aria-live="polite">
          {!selection && <Overview program={program} info={info} view={view} onSelect={setSelection} />}
          {selection?.kind === 'line' && <LineExplain sel={selection} info={info} view={view} program={program} onSelect={s => { if (s.file) setTab(s.file); setSelection(s) }} onRunTo={(file, line) => step('line', { file, line })} live={!rewound && !busy && !!view} calcNow={calcNow} />}
          {selection?.kind === 'token' && <TokenExplain sel={selection} info={info} view={view} program={program} onSelect={s => { if (s.file) setTab(s.file); setSelection(s) }} />}
          {selection?.kind === 'function' && <FunctionExplain fkey={selection.key} info={info} view={view} program={program} onSelect={s => { if (s.file) setTab(s.file); setSelection(s) }} />}
          {selection?.kind === 'piece' && <PieceExplain id={selection.id} onSelect={setSelection} />}
        </div>
      </main>
      <aside className="ap-right" aria-label="Data and knobs">
        {program.knobs.length > 0 && <section><h3>Knobs</h3>{program.knobs.map(([target, label, means, min, max, stepBy]) => {
          const value = plain(lookup(view, target))
          return <label key={target} className="ap-slider"><span>{label}<b>{typeof value === 'number' ? num(value) : '—'}</b></span>
            <input type="range" aria-label={label} min={min} max={max} step={stepBy} value={typeof value === 'number' ? value : min} disabled={rewound || busy || typeof value !== 'number'} onChange={e => setKnob(target, Number(e.target.value))} /><small>{means}. Changes the live object: <code>{target}</code></small></label>
        })}</section>}
        {view?.returned && <section className="ap-returned"><h3>Just returned</h3><p><span className="mono">{view.returned.function}()</span> gave back <span className="mono ap-val">{show(view.returned.value)}</span></p></section>}
        <section><h3>Variables in {top ? <button className="ap-link mono" onClick={() => setSelection({ kind: 'function', key: `${top.file}:${top.function}` })}>{top.function}()</button> : '—'}</h3>
          {!top ? <p className="ap-hint">Press Step into to start.</p> : <table className="ap-table ap-vars"><tbody>{Object.entries(top.locals).map(([k, v]) => <tr key={k} className={changedVars.has(k) ? 'changed' : ''}><td><button className="ap-link mono" onClick={() => setSelection({ kind: 'token', file: top.file, line: top.line, token: { text: k, kind: 'name' } })}>{k}</button></td><td className="mono ap-val">{show(v)}</td></tr>)}</tbody></table>}
        </section>
        <section><h3>Call stack</h3>{!view ? <p className="ap-hint">Not started.</p> : <ol className="ap-stack">{[...view.stack].reverse().map((f, i) => <li key={i}><button className="ap-link mono" onClick={() => { setTab(f.file); setSelection({ kind: 'line', file: f.file, line: f.line }) }}>{f.function}()</button> <small>{f.file}:{f.line}</small></li>)}</ol>}</section>
        {view?.output && <section><h3>Printed</h3><pre className="ap-log">{view.output}</pre></section>}
      </aside>
    </div>
  </div>
}
