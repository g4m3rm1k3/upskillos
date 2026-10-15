import { useEffect, useRef, useState } from 'react'
import Markdown from '../qmaze-lab/Markdown.jsx'
import { tokenizePython } from '../a-arcade-python/analysis.js'
import { SOURCES, parse } from './source.js'
import { notesFor } from './lineNotes.js'
import { PROGRAMS } from './programs.js'

// Runs the lab's real Python one line at a time with A-Arcade Python's stepper (desktop app only):
// the program is really paused between lines, and everything drawn in the middle comes from its
// live variables. In the browser the tab still shows the code with each line's lesson note.
const MAX_RECORDED = 2000
const GENERAL = {
  'else:': '`else:` starts the block that runs when the `if` above it was false.',
  'continue': '`continue` skips the rest of this trip round the loop and goes straight to the next one.',
}

// A live Python value (as the stepper describes it) in a few words.
export function show(v, depth = 0) {
  if (!v) return '—'
  switch (v.t) {
    case 'int': case 'float': return String(v.v)
    case 'bool': return v.v ? 'True' : 'False'
    case 'none': return 'None'
    case 'str': return JSON.stringify(v.v)
    case 'function': return `function ${v.v}`
    case 'list': case 'tuple': {
      if (!v.items) return `${v.t} of ${v.len}`
      const inner = v.items.slice(0, 10).map(x => show(x, depth + 1)).join(', ')
      const more = v.len > 10 ? `, … (${v.len} items)` : ''
      return v.t === 'tuple' ? `(${inner}${more})` : `[${inner}${more}]`
    }
    case 'dict': return v.items ? `{${Object.entries(v.items).slice(0, 6).map(([k, x]) => `${k}: ${show(x, depth + 1)}`).join(', ')}${v.len > 6 ? ', …' : ''}}` : `dict of ${v.len}`
    default: return v.v === undefined ? (v.cls ?? v.t) : String(v.v)
  }
}
const plain = v => (!v ? null : v.items ? (Array.isArray(v.items) ? v.items.map(plain) : Object.fromEntries(Object.entries(v.items).map(([k, x]) => [k, plain(x)]))) : v.v)

// The CSV line being read: the character now being looked at, the part inside quotes, and the
// fields so far, with the one being built dashed.
function CsvView({ view, input }) {
  const f = view.stack.at(-1)?.locals ?? {}
  const i = f.i?.t === 'int' ? f.i.v : null
  const chars = [...input]
  let quoted = false
  const inside = chars.map(ch => { if (ch === '"') { quoted = !quoted; return true } return quoted })
  const fields = plain(f.fields) ?? []
  return <div>
    <div className="ds-line">{chars.map((ch, k) => <span key={k} className={`${k === i ? 'now' : ''}${inside[k] ? ' quoted' : ''}${i !== null && k < i ? ' done' : ''}`}>{ch === ' ' ? '␣' : ch}</span>)}</div>
    <p className="qm-hint">Red: the character at <span className="mono">i</span>. Blue: inside quotes, where a comma is just a character.{f.in_quotes ? ' Right now the reader is inside quotes.' : ''}</p>
    <div className="ds-fields">{fields.map((x, k) => <span key={k}>{JSON.stringify(x)}</span>)}{f.field && <span className="building">{JSON.stringify(plain(f.field))} …</span>}</div>
  </div>
}

// A list of numbers (or rows with a numeric column) as bars: for the sorts and quickselect.
function BarsView({ view, program }) {
  const f = view.stack.at(-1)?.locals ?? {}
  const pick = program.bars ?? {}
  const values = (plain(f[pick.list]) ?? []).map(v => (v && typeof v === 'object' ? v[pick.key] : v)).filter(v => typeof v === 'number')
  const max = Math.max(1, ...values.map(Math.abs))
  const i = f[pick.index]?.t === 'int' ? f[pick.index].v : null
  return values.length ? <div>
    <p className="qm-hint"><span className="mono">{pick.list}</span>, as bars{i !== null ? <>; red: position <span className="mono">{pick.index}</span> = {i}</> : null}</p>
    <div className="ds-bars">{values.map((v, k) => <span key={k} className={k === i ? 'now' : ''} style={{ height: `${Math.max(2, (Math.abs(v) / max) * 100)}%` }} title={String(v)} />)}</div>
  </div> : <p className="qm-hint">The list appears here once it has values.</p>
}

// The watched values, in a table: for programs whose data is dictionaries of counts and scores.
function WatchView({ view }) {
  const entries = Object.entries(view.watch)
  return entries.length ? <table className="qm-log qm-left"><tbody>{entries.map(([k, w]) => <tr key={k}><td className="mono">{w.from}<br /><span className="qm-dim">in {w.function}()</span></td><td className="mono qm-py-val">{show(w.value)}</td></tr>)}</tbody></table> : <p className="qm-hint">Nothing to show yet: step on.</p>
}
const VIEWS = { csv: CsvView, bars: BarsView, watch: WatchView }

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
// The variables of the running function in a fixed order (the program's focus first), each
// marked if the last step changed it, with what it was before.
function Variables({ timeline, index, focus = [] }) {
  const view = timeline[index], top = view.stack.at(-1)
  const before = (() => {
    for (let k = index - 1; k >= 0; k--) {
      const t = timeline[k].stack.at(-1)
      if (t && t.function === top.function && timeline[k].stack.length === view.stack.length) return t.locals
    }
    return {}
  })()
  const locals = Object.entries(top?.locals ?? {}).filter(([, v]) => v.t !== 'function' && v.t !== 'module')
  const order = name => { const k = focus.indexOf(name); return k < 0 ? focus.length : k }
  locals.sort(([a], [b]) => order(a) - order(b))
  const firstOther = locals.findIndex(([n]) => !focus.includes(n))
  return <table className="ds-vars"><tbody>{locals.map(([name, v], k) => {
    const old = before[name], changed = !old ? index > 0 : !same(old, v)
    return [k === firstOther && k > 0 ? <tr key={`${name}-sep`} className="sep"><td colSpan={2} /></tr> : null,
      <tr key={name} className={`${focus.includes(name) ? 'focus' : ''}${changed ? ' changed' : ''}`}>
        <td className="mono">{name}</td>
        <td className="mono qm-py-val">{changed && old ? <span className="was">{show(old)}</span> : null}{show(v)}{changed && !old ? <span className="qm-dim"> (new)</span> : null}</td>
      </tr>]
  })}</tbody></table>
}

function CodePanel({ file, current, callSites, selected, onSelect }) {
  const box = useRef(null)
  useEffect(() => { box.current?.querySelector('.qm-py-line.current')?.scrollIntoView?.({ block: 'nearest' }) }, [current, file])
  return <div className="qm-py-code" ref={box}>
    {SOURCES[file].split('\n').map((text, i) => {
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
    </div>) : <p className="qm-hint">{GENERAL[text.trim()] ?? (text.trim() === '' ? 'A blank line.' : /^(#|"""|def |import )/.test(text.trim()) || text.trim().endsWith('"""') ? 'A comment, docstring, import or the start of a function: read it as a description of what follows.' : 'Click a line with a dot for its explanation from the lessons.')}</p>}
    {names.length > 0 && <><h4>On this line, right now</h4><table className="qm-log qm-left"><tbody>{names.map(n => <tr key={n}><td className="mono">{n}</td><td className="mono">{show(frame.locals[n])}</td></tr>)}</tbody></table></>}
  </div>
}

export default function PythonTab({ request, onLesson }) {
  const api = typeof window !== 'undefined' ? window.openCalcDesktop?.aarcade : null
  const [programId, setProgramId] = useState(request?.program ?? 'split_csv_line')
  const program = PROGRAMS[programId]
  const [input, setInput] = useState(program.input.value)
  const [status, setStatus] = useState(null), [setupLog, setSetupLog] = useState(''), [settingUp, setSettingUp] = useState(false)
  const [timeline, setTimeline] = useState([]), [at, setAt] = useState(null)
  const [busy, setBusy] = useState(false), [ended, setEnded] = useState(null), [error, setError] = useState(null)
  const [file, setFile] = useState(program.file), [selected, setSelected] = useState(null)

  useEffect(() => { if (api) api.status().then(setStatus).catch(e => setError(String(e))) }, [api])
  useEffect(() => api?.onOutput?.(m => { if (m.type === 'setup') setSetupLog(log => (log + m.text).slice(-8000)) }), [api])
  useEffect(() => { if (request) choose(request.program) }, [request])  // eslint-disable-line react-hooks/exhaustive-deps

  const index = at ?? timeline.length - 1
  const view = timeline[index] ?? null
  const top = view?.stack.at(-1)
  const callSites = new Set((view?.stack ?? []).slice(0, -1).filter(f => f.file === file).map(f => f.line))
  const View = VIEWS[program.view]

  function reset() { setTimeline([]); setAt(null); setEnded(null); setError(null); setSelected(null) }
  function choose(id) { setProgramId(id); setInput(PROGRAMS[id].input.value); setFile(PROGRAMS[id].file); reset() }
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
  const load = () => { reset(); return send({ cmd: 'load', files: SOURCES, entry: { module: program.module, function: program.function, kwargs: program.kwargs(input) }, watch: program.watch, actions: [] }) }
  const step = (mode, extra = {}) => send({ cmd: 'step', mode, ...extra })
  async function setup() {
    setSettingUp(true); setSetupLog('')
    try { const r = await api.setup(); if (!r.ok) setError(r.reason); setStatus(await api.status()) } finally { setSettingUp(false) }
  }

  const live = api && status?.ready && timeline.length > 0 && !ended && at === null
  const files = Object.keys(SOURCES).filter(f => f === program.file || (view?.stack ?? []).some(fr => fr.file === f))
  return <div className="qm-py">
    <div className="qm-py-bar">
      <label>Program <select value={programId} onChange={e => choose(e.target.value)}>{Object.entries(PROGRAMS).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}</select></label>
      <label>{program.input.label} <input className="ds-py-input" value={input} onChange={e => { setInput(e.target.value); reset() }} spellCheck={false} /></label>
      {api && status?.ready && <>
        <button className="qm-primary" disabled={busy} onClick={load}>{timeline.length ? '↺ Restart' : '▶ Load and pause at the first line'}</button>
        <button disabled={!live || busy} onClick={() => step('into')} title="Run one line; go inside any function it calls">Step into</button>
        <button disabled={!live || busy} onClick={() => step('over')} title="Run one line, including any function it calls">Step over</button>
        <button disabled={!live || busy} onClick={() => step('out')} title="Run until this function returns">Step out</button>
        <button disabled={!live || busy} onClick={() => step('lines', { targets: program.jump.targets() })}>{program.jump.label}</button>
        <button disabled={!live || busy || !selected} onClick={() => step('line', { file, line: selected })} title="Run until the selected line is about to run">Run to selected line</button>
      </>}
      {timeline.length > 1 && <span className="qm-py-history">
        <button disabled={index <= 0} onClick={() => setAt(Math.max(0, index - 1))}>◀ Back</button>
        <button disabled={at === null} onClick={() => setAt(at + 1 >= timeline.length - 1 ? null : at + 1)}>Forward ▶</button>
        <span className="qm-hint">{at === null ? `pause ${timeline.length}` : `looking at pause ${index + 1} of ${timeline.length} (a record: Python isn't rewound)`}</span>
      </span>}
    </div>
    {!api && <p className="qm-py-banner">Running real Python line by line needs the UpSkillOS desktop app. Here you can still read every program, with each line’s explanation from the lessons: click any line. The lessons’ “Write it yourself” blocks run real Python in the browser.</p>}
    {api && status && !status.ready && <div className="qm-py-banner">
      <p>This tab uses A-Arcade Python’s environment (in {status.folder}). It isn’t set up yet.</p>
      <button className="qm-primary" disabled={settingUp} onClick={setup}>{settingUp ? 'Setting up…' : 'Set up Python'}</button>
      {setupLog && <pre className="qm-py-log">{setupLog}</pre>}
    </div>}
    {api && status?.ready && !timeline.length && <p className="qm-py-banner"><Markdown inline>{program.about}</Markdown> Press <b>Load</b>: Python imports the files and pauses before the first line of <span className="mono">{program.function}()</span>.</p>}
    {error && <p className="qm-py-error">{error}</p>}
    {ended && <div className={`qm-py-banner ${ended.type === 'error' ? 'qm-py-error' : ''}`}>
      {ended.type === 'finished' ? <>The program finished after {ended.linesRun?.toLocaleString()} lines. It returned <span className="mono">{show(ended.result)}</span>.</> : ended.type === 'error' ? <><b>{ended.error}</b>{ended.file ? ` (${ended.file}, line ${ended.line})` : ''}</> : 'Stopped.'}
    </div>}
    <div className="qm-py-grid">
      <section className="qm-py-left">
        <div className="qm-py-files">{files.map(f => <button key={f} className={f === file ? 'active' : ''} onClick={() => { setFile(f); setSelected(null) }}>{f}</button>)}</div>
        <CodePanel file={file} current={top?.file === file ? top.line : null} callSites={callSites} selected={selected} onSelect={setSelected} />
      </section>
      <section className="qm-py-mid">
        {view ? <>
          <View view={view} input={input} program={program} />
          <h4>Running: {view.stack.map(f => `${f.function}()`).slice(-4).join(' → ')}{view.stack.length > 4 ? ` (${view.stack.length} calls deep)` : ''}</h4>
          <p className="qm-hint">● and yellow: changed by the line that just ran, with the old value crossed out. The variables this program is about come first.</p>
          <Variables timeline={timeline} index={index} focus={program.focus} />
          {view.returned && <p className="qm-hint"><span className="mono">{view.returned.function}()</span> just returned <span className="mono">{show(view.returned.value)}</span></p>}
        </> : <p className="qm-hint">The paused program’s values appear here.</p>}
      </section>
      <section className="qm-py-right">
        {(selected || (top?.file === file && top.line)) ? <LineExplain file={file} line={selected ?? top.line} running={!selected || selected === top?.line} frame={top?.file === file ? top : null} onLesson={onLesson} /> : <div className="qm-py-explain"><Markdown>{program.about}</Markdown><p className="qm-hint">Click any line of code to see it explained. Lines with a dot are explained in a lesson.</p></div>}
      </section>
    </div>
  </div>
}
