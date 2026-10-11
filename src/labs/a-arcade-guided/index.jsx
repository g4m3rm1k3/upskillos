import { useEffect, useMemo, useRef, useState } from 'react'
import Katex from '../../components/concept-explorer/Katex.jsx'
import { Runner } from './runner.js'
import { PROGRAMS, ORIGINAL } from './programs/index.js'
import { dataUse, tokenize, jsEntry } from './analysis.js'
import { LESSONS, correct } from './lessons.js'
import { read } from './tracer.js'
import { PIECES, pathTo as piecePath, parentsOf } from './pieces.js'
import { encode } from './engine.js'
import './style.css'

// ── Formatting ──────────────────────────────────────────────────────────────────────────────────
const num = v => Number.isInteger(v) ? String(v) : Math.abs(v) < 1e-3 && v !== 0 ? v.toExponential(2) : v.toFixed(3)
const signed = v => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(4)}`
function show(v, depth = 0) {
  if (v === undefined) return '—'
  if (typeof v === 'number') return num(v)
  if (typeof v === 'boolean' || v === null) return String(v)
  if (typeof v === 'string') return v
  if (Array.isArray(v)) {
    if (v.length > 0 && Array.isArray(v[0]) && v.length > 8) return `${v.length} rows`
    if (depth > 1) return `[${v.length} items]`
    const items = v.slice(0, 11).map(x => show(x, depth + 1))
    return `[${items.join(', ')}${v.length > 11 ? `, … ${v.length} items` : ''}]`
  }
  if (depth > 1) return '{…}'
  return `{ ${Object.entries(v).map(([k, x]) => `${k}: ${show(x, depth + 1)}`).join(', ')} }`
}

// ── The cart ────────────────────────────────────────────────────────────────────────────────────
function Cart({ state, ghost, label }) {
  const draw = (s, faint) => {
    const x = 300 + s[0] * 85, tipX = x + Math.sin(s[2]) * 120, tipY = 150 - Math.cos(s[2]) * 120
    return <g opacity={faint ? .28 : 1}>
      <rect x={x - 30} y="146" width="60" height="22" rx="6" fill={faint ? '#9fb5bf' : '#68dbd0'} />
      <line x1={x} y1="150" x2={tipX} y2={tipY} stroke={faint ? '#c8b3a5' : '#ffb28a'} strokeWidth="7" strokeLinecap="round" />
      <circle cx={x} cy="150" r="4" fill="#0c1d28" />
    </g>
  }
  return <svg viewBox="0 0 600 200" role="img" aria-label={state ? `Cart at ${num(state[0])} m, pole at ${num(state[2])} rad` : 'Cart not started'}>
    <line x1="96" y1="20" x2="96" y2="178" stroke="#ffae7d" strokeDasharray="4 6" opacity=".4" />
    <line x1="504" y1="20" x2="504" y2="178" stroke="#ffae7d" strokeDasharray="4 6" opacity=".4" />
    <line x1="40" y1="176" x2="560" y2="176" stroke="#657887" strokeWidth="2" />
    <text x="96" y="194" textAnchor="middle" fill="#94a8b5" fontSize="11">−2.4 m</text><text x="504" y="194" textAnchor="middle" fill="#94a8b5" fontSize="11">+2.4 m</text>
    {ghost && draw(ghost, true)}
    {state ? draw(state, false) : draw([0, 0, 0, 0], true)}
    <text x="14" y="22" fill="#a8bfca" fontSize="12">{label}</text>
    {state && <text x="586" y="22" textAnchor="end" fill="#a8bfca" fontSize="12">x {num(state[0])} m · θ {num(state[2])} rad ({num(state[2] * 180 / Math.PI)}°)</text>}
    {state && ghost && <text x="14" y="40" fill="#e8ff9e" fontSize="11">moved since the faint copy (0.02 s): x {signed(state[0] - ghost[0])} m · θ {signed(state[2] - ghost[2])} rad</text>}
  </svg>
}

// ── Code panel ──────────────────────────────────────────────────────────────────────────────────
function CodePanel({ info, runner, selection, onSelect, original }) {
  const box = useRef(null)
  const top = runner.stack.at(-1)
  const current = runner.started ? top?.line : null
  const callSites = new Set(runner.stack.slice(0, -1).map(f => f.line))
  useEffect(() => {
    const el = box.current?.querySelector('.ag-line.current')
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [current, runner.tracer.count])
  // Inline values: every variable of the running function, shown on the line that declared it.
  const inline = {}
  if (top && runner.started) {
    for (const [name, thunk] of Object.entries(top.vars)) {
      const got = read(thunk); if (!got || name === 'data') continue
      const fn = info.functions[top.fn]
      for (let n = fn.start; n <= fn.end; n++) {
        const t = info.lines[n - 1]
        if (n === fn.start ? fn.params.includes(name) : new RegExp(`^\\s*(?:const|let|for \\((?:let|const)) \\[?[^=]*\\b${name}\\b`).test(t)) { (inline[n] ??= []).push(`${name} = ${show(got.value)}`); break }
      }
    }
  }
  const next = current ? calcFor(runner, info, current) : null
  return <div className="ag-code" ref={box} role="region" aria-label="Program code">
    {info.lines.map((text, i) => {
      const n = i + 1, tokens = tokenize(text)
      const selected = selection && (selection.kind === 'line' || selection.kind === 'token') && selection.line === n
      const edited = original && text.trim() && !original.has(text)
      return <div key={n} className={`ag-line${n === current ? ' current' : ''}${callSites.has(n) ? ' call-site' : ''}${selected ? ' selected' : ''}${edited ? ' edited' : ''}`}
        onClick={e => { if (!e.target.dataset.tok) onSelect({ kind: 'line', line: n }) }}>
        <span className="ag-gutter">{n === current ? '▶' : callSites.has(n) ? '↳' : edited ? '✎' : ''}<b>{n}</b></span>
        <code>{tokens.map((t, k) => t.kind === 'space' || t.kind === 'comment' || t.kind === 'number'
          ? <span key={k} className={`tk-${t.kind}`}>{t.text}</span>
          : <span key={k} data-tok="1" className={`tk-${t.kind}${info.functions[t.text] && !t.property ? ' tk-fn' : ''}`}
              onClick={() => onSelect({ kind: 'token', line: n, token: t })}>{t.text}</span>)}</code>
        {inline[n] && <span className="ag-inline">{inline[n].join('   ')}</span>}
        {n === current && next && <span className="ag-calc-inline">this line will work out: {next[0]} = {show(next[1])}</span>}
      </div>
    })}
  </div>
}

// ── Explanations (the middle) ───────────────────────────────────────────────────────────────────
function frameFor(runner, fn) {
  for (let k = runner.stack.length - 1; k >= 0; k--) if (runner.stack[k].fn === fn) return runner.stack[k]
  return null
}
function valueOf(runner, fn, name) {
  const frame = frameFor(runner, fn)
  const thunk = frame?.vars?.[name]
  return thunk ? read(thunk) : null
}
// The line's arithmetic with this step's numbers, if `n` is the line about to run.
function calcFor(runner, info, n) {
  const top = runner.stack.at(-1), x = info.extra[n]
  if (!runner.started || !top || top.line !== n || !x?.calc) return null
  const values = Object.fromEntries(Object.entries(top.vars).map(([name, t]) => [name, read(t)?.value]))
  try { return x.calc(values, info.constantValues) } catch { return null }
}
function Origin({ origin, onSelect, pastIndex, onJump }) {
  if (!origin) return null
  const back = pastIndex?.(origin.count)
  return <span className="ag-origin"><button className="ag-link" onClick={() => onSelect({ kind: 'line', line: origin.line })}>line {origin.line}</button>{back !== null && back !== undefined && <button className="ag-link" title="Go back to the moment it was set" onClick={() => onJump(origin.count)}>↶</button>}</span>
}
function Path({ info, fn, onSelect, line }) {
  return <nav className="ag-crumbs" aria-label="Where this fits">{info.pathTo(fn).map((f, i) => <span key={f}>{i > 0 && <b>›</b>}<button className="ag-link" onClick={() => onSelect({ kind: 'function', name: f })}>{f}()</button></span>)}{line && <span><b>·</b> line {line}</span>}</nav>
}
function Chips({ items, onSelect }) {
  return <span className="ag-chips">{items.map(k => <button key={k} className="ag-chip" onClick={() => onSelect({ kind: 'data', key: k })}>data.{k}</button>)}</span>
}

function LineExplain({ n, info, runner, explain, onSelect, onRunTo, live }) {
  const fn = info.lineFn[n], text = info.lines[n - 1], note = info.notes[n]
  if (!fn) return <div className="ag-explain"><p className="ag-eyebrow">LINE {n} · OUTSIDE ANY FUNCTION</p><pre className="ag-bigcode">{text || ' '}</pre><p>{text.startsWith('//') ? 'A comment: a note for people reading the code. JavaScript ignores it.' : 'A constant the whole program can use. Click a name in it to see what it is.'}</p></div>
  const { reads, writes } = dataUse(text)
  const tokens = tokenize(text)
  const names = [...new Set(tokens.filter(t => t.kind === 'name' && !t.property && !info.functions[t.text]).map(t => t.text))]
  const vars = names.filter(name => name !== 'data').map(name => ({ name, got: valueOf(runner, fn, name) ?? (info.constants[name] && { value: info.constants[name].value }), means: explain.VARS[name] })).filter(v => v.got || v.means)
  const calls = (info.lineCalls[n] ?? []).filter((c, i, a) => a.indexOf(c) === i && c !== fn)
  const jsUsed = [...new Map(tokens.filter(t => jsEntry(t)).map(t => [jsEntry(t).title, t])).values()]
  const running = runner.started && runner.stack.at(-1)?.line === n
  const calc = calcFor(runner, info, n), frame = frameFor(runner, fn)
  return <div className="ag-explain">
    <Path info={info} fn={fn} onSelect={onSelect} line={n} />
    {running && <p className="ag-running">▶ This line runs next</p>}
    <pre className="ag-bigcode">{text.trim()}</pre>
    <h3>What this line does</h3>
    <p className="ag-say">{note?.say ?? (/^\s*}/.test(text) ? 'Closes the block above.' : 'Part of the function above; click any word in it.')}</p>
    {note?.tex && <div className="ag-tex"><Katex latex={note.tex} /></div>}
    {calc ? <div className="ag-calc"><h3>With this step's numbers</h3><pre className="mono">{calc[0]}{'\n'}= {show(calc[1])}</pre><p className="ag-hint">The line hasn't run yet: this is what it will work out. Step to watch it happen.</p></div>
      : info.extra[n]?.calc ? <p className="ag-hint">When this line is about to run, it is worked out here with that step's numbers.</p> : null}
    {live && !running && <p><button className="ag-runto" onClick={() => onRunTo(n)}>▶ Run until this line runs</button></p>}
    {vars.length > 0 && <><h3>The names on this line, right now</h3><table className="ag-table"><tbody>{vars.map(v => <tr key={v.name}><td><button className="ag-link mono" onClick={() => onSelect({ kind: 'token', line: n, token: { text: v.name, kind: 'name' } })}>{v.name}</button></td><td>{v.means ?? ''}</td><td className="mono ag-val">{v.got ? show(v.got.value) : 'not set yet'}</td><td>{frame?.origins?.[v.name] && <small>set on <Origin origin={frame.origins[v.name]} onSelect={onSelect} /></small>}</td></tr>)}</tbody></table></>}
    {calls.length > 0 && <><h3>This line calls</h3>{calls.map(c => <FunctionCard key={c} name={c} explain={explain} info={info} onSelect={onSelect} />)}<p className="ag-hint">Step into on this line to go inside; Step over runs the whole call as one step.</p></>}
    {(reads.length > 0 || writes.length > 0) && <><h3>Stored data</h3><p>{reads.length > 0 && <>Reads <Chips items={reads} onSelect={onSelect} /> </>}{writes.length > 0 && <>Changes <Chips items={writes} onSelect={onSelect} /></>}</p></>}
    {jsUsed.length > 0 && <><h3>JavaScript on this line</h3><span className="ag-chips">{jsUsed.map(t => <button key={jsEntry(t).title} className="ag-chip js" onClick={() => onSelect({ kind: 'token', line: n, token: t })}>{jsEntry(t).title}</button>)}</span></>}
    {note?.piece && <><h3>The idea behind it</h3><button className="ag-piece-link" onClick={() => onSelect({ kind: 'piece', id: note.piece })}>{PIECES[note.piece].title} — {PIECES[note.piece].question}</button></>}
  </div>
}

function FunctionCard({ name, explain, info, onSelect }) {
  const f = explain.FUNCTIONS[name], fn = info.functions[name]
  return <button className="ag-fcard" onClick={() => onSelect({ kind: 'function', name })}>
    <strong>{name}({fn.params.join(', ')})</strong><span>{f?.summary}</span><small>gives back: {f?.returns}</small>
  </button>
}

function FunctionExplain({ name, info, runner, explain, onSelect, from }) {
  const f = explain.FUNCTIONS[name] ?? {}, fn = info.functions[name], frame = frameFor(runner, name)
  const last = runner.lastCalls[name]
  return <div className="ag-explain">
    <Path info={info} fn={name} onSelect={onSelect} />
    {frame && <p className="ag-running">▶ Running now{frame === runner.stack.at(-1) ? '' : ' (waiting for a call it made)'}</p>}
    <h2 className="mono">{name}({fn.params.join(', ')})</h2>
    <p className="ag-summary">{f.summary}</p>
    <p className="ag-say">{f.purpose}</p>
    {from && <p className="ag-hint">You clicked it on line {from}.</p>}
    <h3>Inputs</h3>
    <table className="ag-table"><thead><tr><th>Input</th><th>What it is</th><th>{frame ? 'Now' : 'Last call'}</th></tr></thead><tbody>
      {(f.inputs ?? fn.params.map(p => [p, ''])).map(([p, m]) => {
        const got = (frame ?? (last && { vars: last }))?.vars?.[p]
        const v = got && p !== 'data' ? read(got) : null
        return <tr key={p}><td className="mono">{p}</td><td>{m}</td><td className="mono ag-val">{p === 'data' ? 'the panel on the right' : v ? show(v.value) : '—'}</td></tr>
      })}</tbody></table>
    <h3>Gives back</h3><p>{f.returns}</p>
    {(f.reads?.length || f.writes?.length) ? <><h3>Stored data</h3><p>{f.reads?.length ? <>Reads <Chips items={f.reads.filter(k => k in runner.data)} onSelect={onSelect} /> </> : null}{f.writes?.length ? <>Changes <Chips items={f.writes.filter(k => k in runner.data)} onSelect={onSelect} /></> : null}</p></> : null}
    {fn.callers.length > 0 && <><h3>Called from</h3><p>{fn.callers.map(c => <button key={`${c.fn}${c.line}`} className="ag-link" onClick={() => onSelect({ kind: 'line', line: c.line })}>{c.fn}(), line {c.line}</button>)}</p></>}
    {fn.calls.length > 0 && <><h3>It calls</h3>{fn.calls.map(c => <FunctionCard key={c} name={c} explain={explain} info={info} onSelect={onSelect} />)}</>}
    <h3>Its code</h3><p><button className="ag-link" onClick={() => onSelect({ kind: 'line', line: fn.start + 1 })}>Lines {fn.start}–{fn.end}: start at its first line</button></p>
    {f.piece && <><h3>The idea behind it</h3><button className="ag-piece-link" onClick={() => onSelect({ kind: 'piece', id: f.piece })}>{PIECES[f.piece].title} — {PIECES[f.piece].question}</button></>}
  </div>
}

function TokenExplain({ selection, info, runner, explain, onSelect }) {
  const { token, line } = selection, fn = info.lineFn[line]
  if (info.functions[token.text] && !token.property) return <FunctionExplain name={token.text} info={info} runner={runner} explain={explain} onSelect={onSelect} from={line} />
  if (token.property && token.object === 'data') return <DataExplain dataKey={token.text} info={info} runner={runner} explain={explain} onSelect={onSelect} />
  const js = jsEntry(token)
  const back = <p><button className="ag-link" onClick={() => onSelect({ kind: 'line', line })}>← The whole of line {line}</button></p>
  if (js) return <div className="ag-explain">{back}<p className="ag-eyebrow">JAVASCRIPT</p><h2 className="mono">{js.title}</h2><p className="ag-say">{js.say}</p><h3>Example</h3><pre className="ag-bigcode">{js.example}</pre><h3>On this line</h3><pre className="ag-bigcode">{info.lines[line - 1].trim()}</pre></div>
  const name = token.text, means = explain.VARS[name]
  const got = (fn && name !== 'data' ? valueOf(runner, fn, name) : null) ?? (info.constants[name] && !token.property ? { value: info.constants[name].value } : null)
  const fnInfo = fn && info.functions[fn]
  const setOn = [], usedOn = []
  if (fnInfo) for (let n = fnInfo.start; n <= fnInfo.end; n++) {
    const t = info.lines[n - 1]
    if (n === fnInfo.start && fnInfo.params.includes(name)) setOn.push(n)
    else if (new RegExp(`^\\s*(?:(?:const|let) \\[?[^=]*\\b${name}\\b[^=]*\\]?\\s*=|${name}(?:\\[[^\\]]*\\])*\\s*=(?!=)|for \\((?:let|const) ${name}\\b)`).test(t)) setOn.push(n)
    else if (new RegExp(`\\b${name}\\b`).test(t)) usedOn.push(n)
  }
  return <div className="ag-explain">{back}
    <p className="ag-eyebrow">{token.property ? 'A NAMED PART OF AN OBJECT' : fnInfo?.params.includes(name) ? `AN INPUT OF ${fn}()` : 'A NAME'}</p>
    <h2 className="mono">{token.property ? `${token.object}.${name}` : name}</h2>
    <p className="ag-say">{means ?? (token.property ? `The value called "${name}" inside ${token.object}.` : 'A name used on this line.')}</p>
    {got && <><h3>Right now</h3><pre className="ag-bigcode">{show(got.value)}</pre></>}
    {fn && frameFor(runner, fn)?.origins?.[name] && <><h3>Last given its value</h3><p><Origin origin={frameFor(runner, fn).origins[name]} onSelect={onSelect} /></p></>}
    {setOn.length > 0 && <><h3>Gets its value on</h3><p>{setOn.map(n => <button key={n} className="ag-link" onClick={() => onSelect({ kind: 'line', line: n })}>line {n}</button>)}</p></>}
    {usedOn.length > 0 && <><h3>Used on</h3><p>{usedOn.map(n => <button key={n} className="ag-link" onClick={() => onSelect({ kind: 'line', line: n })}>line {n}</button>)}</p></>}
  </div>
}

function DataExplain({ dataKey, info, runner, explain, onSelect }) {
  const d = explain.DATA[dataKey] ?? { label: dataKey, means: '' }
  const uses = info.lines.map((t, i) => ({ n: i + 1, ...dataUse(t) })).filter(u => u.reads.includes(dataKey) || u.writes.includes(dataKey))
  return <div className="ag-explain">
    <p className="ag-eyebrow">STORED DATA</p><h2 className="mono">data.{dataKey}</h2><p className="ag-say">{d.means}</p>
    <h3>Right now</h3><pre className="ag-bigcode">{show(runner.data[dataKey])}</pre>
    <h3>Lines that use it</h3><table className="ag-table"><tbody>{uses.map(u => <tr key={u.n}><td><button className="ag-link" onClick={() => onSelect({ kind: 'line', line: u.n })}>line {u.n}</button></td><td>{info.lineFn[u.n]}()</td><td>{u.writes.includes(dataKey) ? 'changes it' : 'reads it'}</td></tr>)}</tbody></table>
  </div>
}

function PieceExplain({ id, onSelect }) {
  const p = PIECES[id]
  return <div className="ag-explain">
    <nav className="ag-crumbs">{piecePath(id).map((q, i) => <span key={q}>{i > 0 && <b>›</b>}<button className="ag-link" onClick={() => onSelect({ kind: 'piece', id: q })}>{PIECES[q].title}</button></span>)}</nav>
    <p className="ag-eyebrow">THE IDEA BEHIND THE CODE</p><h2>{p.title}</h2><p className="ag-summary">{p.question}</p>
    {p.plain.map((t, i) => <p key={i} className="ag-say">{t}</p>)}
    {p.table && <table className="ag-table"><thead><tr>{p.table.head.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{p.table.rows.map(r => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody></table>}
    <h3>The maths</h3>{p.math.map((m, i) => <div className="ag-tex" key={i}><Katex latex={m.tex} /><p>{m.say}</p></div>)}
    {p.symbols.length > 0 && <><h3>Every symbol</h3><table className="ag-table"><tbody>{p.symbols.map(s => <tr key={s.tex}><td><Katex latex={s.tex} display={false} /></td><td>{s.say}</td><td>{s.means}</td><td className="mono">{s.code ?? ''}</td></tr>)}</tbody></table></>}
    {p.example.steps.length > 0 && <div className="ag-worked"><h3>Work it by hand</h3><p>{p.example.setup}</p><ol>{p.example.steps.map((s, i) => <li key={i}>{s.tex ? <Katex latex={s.tex} /> : s.text}</li>)}</ol></div>}
    {p.parts.length > 0 && <><h3>Made of</h3><span className="ag-chips">{p.parts.map(q => <button key={q} className="ag-chip" onClick={() => onSelect({ kind: 'piece', id: q })}>{PIECES[q].title}</button>)}</span></>}
    {parentsOf(id).length > 0 && <><h3>Part of</h3><span className="ag-chips">{parentsOf(id).map(q => <button key={q} className="ag-chip" onClick={() => onSelect({ kind: 'piece', id: q })}>{PIECES[q].title}</button>)}</span></>}
  </div>
}

// With nothing selected: how the functions fit together, starting from run().
function Overview({ info, runner, explain, onSelect }) {
  const active = new Set(runner.stack.map(f => f.fn)), seen = new Set()
  const node = (name, depth) => {
    const again = seen.has(name); seen.add(name)
    const fn = info.functions[name]
    return <li key={`${name}-${depth}`}>
      <button className={`ag-tree-item${active.has(name) ? ' active' : ''}${runner.stack.at(-1)?.fn === name ? ' top' : ''}`} onClick={() => onSelect({ kind: 'function', name })}>
        <span className="mono">{name}()</span> <span>{explain.FUNCTIONS[name]?.summary}</span>
      </button>
      {!again && fn.calls.length > 0 && <ul>{fn.calls.map(c => node(c, depth + 1))}</ul>}
    </li>
  }
  return <div className="ag-explain">
    <p className="ag-eyebrow">HOW THE PIECES FIT</p>
    <h2>{runner.def.label}: who calls whom</h2>
    <p className="ag-say">Everything starts in <b>run()</b>. Each function below is called by the one above it. Functions running right now are highlighted. Click any of them, or any line or word in the code, to have it explained here. New to this? Start with the guided steps at the top: each one asks you to predict what a line will do, then runs the program to check.</p>
    <ul className="ag-tree">{node('run', 0)}</ul>
    <h3>How to follow it</h3>
    <ul className="ag-howto">
      <li><b>Step into</b> runs one line; if the line calls a function, it goes inside it.</li>
      <li><b>Step over</b> runs one line, including any function it calls, as one step.</li>
      <li><b>Step out</b> finishes the function you're in and returns to the line that called it.</li>
      <li><b>Next action</b> runs until the cart has moved one step (0.02 s). <b>Play</b> keeps doing that.</li>
      <li>The faint cart is where it was one step ago. Values that just changed are highlighted on the right.</li>
    </ul>
  </div>
}

// ── Right-hand panel ────────────────────────────────────────────────────────────────────────────
function DataPanel({ runner, prevView, locked, explain, info, onSelect, onChange, pastIndex, onJump }) {
  const origin = k => runner.dataOrigins?.[k] ? <Origin origin={runner.dataOrigins[k]} onSelect={onSelect} pastIndex={pastIndex} onJump={onJump} /> : null
  const data = runner.data, changed = runner.changes.keys
  const top = runner.started ? runner.stack.at(-1) : null
  const knobs = Object.entries(explain.DATA).filter(([, d]) => d.knob || d.toggle)
  const vars = top ? Object.entries(top.vars).filter(([n]) => n !== 'data').map(([n, t]) => [n, read(t)]).filter(([, g]) => g) : []
  const row = data.Q && data.state ? encode('cartpole', data.state).index : null
  return <aside className="ag-right" aria-label="Data and knobs">
    <section><h3>Knobs</h3>{knobs.map(([k, d]) => d.toggle
      ? <label key={k} className="ag-toggle"><input type="checkbox" disabled={locked} checked={!!data[k]} onChange={e => onChange(k, e.target.checked)} /> {d.label} <small>{d.means}</small></label>
      : <label key={k} className="ag-slider"><span>{d.label}<b>{num(data[k])}</b></span><input aria-label={d.label} disabled={locked} type="range" min={d.knob[0]} max={d.knob[1]} step={d.knob[2]} value={data[k]} onChange={e => onChange(k, Number(e.target.value))} /></label>)}
      <p className="ag-hint">Knobs change data straight away: the program reads them on its next line.</p></section>
    <section><h3>Stored data <small>(data)</small></h3>
      {runner.id === 'q' ? <>
        <DataRow k="state" origin={origin('state')} label="state" value={data.state} changed={changed} onSelect={onSelect} names={['x', 'ẋ', 'θ', 'θ̇']} />
        <DataRow k="steps" origin={origin('steps')} label="steps" value={data.steps} changed={changed} onSelect={onSelect} />
        <DataRow k="total" origin={origin('total')} label="total" value={data.total} changed={changed} onSelect={onSelect} />
        <DataRow k="episode" origin={origin('episode')} label="episode" value={data.episode} changed={changed} onSelect={onSelect} />
        <DataRow k="Q" origin={origin('Q')} label={row === null ? 'Q' : `Q[${row}] (this state's row)`} value={row === null ? undefined : data.Q[row]} changed={changed} onSelect={onSelect} names={['left', 'right']} />
      </> : <>
        <DataRow k="worlds" origin={origin('worlds')} label="world 1 state" value={data.worlds[0].state} changed={changed} onSelect={onSelect} names={['x', 'ẋ', 'θ', 'θ̇']} />
        <DataRow k="worlds" label="world 1 steps" value={data.worlds[0].steps} changed={changed} onSelect={onSelect} />
        <DataRow k="actorWeights" origin={origin('actorWeights')} label="actor weights w_π" value={data.actorWeights} changed={changed} onSelect={onSelect} names={['x', 'ẋ', 'θ', 'θ̇', '1']} />
        <DataRow k="criticWeights" origin={origin('criticWeights')} label="critic weights w_V" value={data.criticWeights} changed={changed} onSelect={onSelect} />
      </>}
      {runner.changes.detail.length > 0 && <div className="ag-changes"><b>Just changed</b>{runner.changes.detail.slice(0, 6).map(d => <div key={d.path} className="mono">{d.path}: {show(d.before)} → {show(d.after)}</div>)}</div>}
    </section>
    <section><h3>Variables in {top ? <button className="ag-link mono" onClick={() => onSelect({ kind: 'function', name: top.fn })}>{top.fn}()</button> : '—'}</h3>
      {vars.length === 0 ? <p className="ag-hint">{runner.started ? 'None yet.' : 'Press Step into to start at run().'}</p> :
        <table className="ag-table ag-vars"><tbody>{vars.map(([n, g]) => <tr key={n} className={changedSince(prevView, top, n, g.value) ? 'changed' : ''}>
          <td><button className="ag-link mono" onClick={() => onSelect({ kind: 'token', line: top.line, token: { text: n, kind: 'name' } })}>{n}</button></td><td className="mono ag-val">{show(g.value)}</td><td><Origin origin={top.origins?.[n]} onSelect={onSelect} pastIndex={pastIndex} onJump={onJump} /></td></tr>)}</tbody></table>}
    </section>
    <section><h3>Call stack</h3>{runner.stack.length === 0 ? <p className="ag-hint">Not started.</p> :
      <ol className="ag-stack">{[...runner.stack].reverse().map((f, i) => <li key={i}><button className="ag-link mono" onClick={() => onSelect({ kind: 'line', line: f.line })}>{f.fn}()</button> <small>line {f.line}</small></li>)}</ol>}</section>
    <section><h3>Trace: the last lines run</h3><ol className="ag-trace">{[...runner.history].reverse().slice(0, 14).map((h, i) => <li key={i} style={{ paddingLeft: Math.min(h.depth - 1, 6) * 8 }}><button className="ag-link mono" onClick={() => onSelect({ kind: 'line', line: h.line })}>{h.line}</button> <code>{h.kind === 'enter' ? `→ ${h.fn}()` : info.lines[h.line - 1].trim().slice(0, 46)}</code></li>)}</ol></section>
    <section><h3>Game lengths</h3><p className="mono ag-games">{runner.games.length ? runner.games.slice(-12).join(' · ') : 'No game finished yet.'}</p></section>
  </aside>
}
// Whether a variable of the running function differs from the step before (same function only).
function changedSince(prevView, top, name, value) {
  const prev = prevView?.stack.at(-1)
  if (!prev || prev.fn !== top.fn) return false
  const before = prev.vars[name] ? read(prev.vars[name]) : null
  return show(before?.value) !== show(value)
}
function DataRow({ k, label, value, changed, onSelect, names, origin }) {
  return <div className="ag-data-wrap"><button className={`ag-data${changed.has(k) ? ' changed' : ''}`} onClick={() => onSelect({ kind: 'data', key: k })}>
    <span>{label}</span>
    {Array.isArray(value) && names ? <span className="ag-data-items">{value.map((v, i) => <span key={i}><small>{names[i]}</small>{num(v)}</span>)}</span> : <span className="mono">{show(value)}</span>}
  </button>{origin && <small className="ag-set-on">set on {origin}</small>}</div>
}

// How often Play repeats its command (ms) and, for cart steps, how many per tick.
const PLAY_SPEEDS = {
  into: { slow: { delay: 900 }, medium: { delay: 300 }, fast: { delay: 60 } },
  over: { slow: { delay: 1200 }, medium: { delay: 450 }, fast: { delay: 120 } },
  action: { slow: { delay: 250, times: 1 }, medium: { delay: 50, times: 1 }, fast: { delay: 40, times: 5 } },
}

// How many steps Step back can go back through.
const MAX_RECORDED = 2000

// ── The lab ─────────────────────────────────────────────────────────────────────────────────────
// The guided steps the learner has got right, kept in this browser only.
const PROGRESS_KEY = 'a-arcade-guided-progress'
function loadProgress() {
  try { const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); return { q: saved.q ?? [], a2c: saved.a2c ?? [] } } catch { return { q: [], a2c: [] } }
}

function LessonCard({ lessons, lesson, done, moved, onAnswer, onCheck, onReveal, onRestart, onNext, onEdit }) {
  const l = lessons[lesson.index]
  if (lesson.needsEdit) return <section className="ag-lesson" aria-label="Guided step">
    <p className="ag-eyebrow">STEP {lesson.index + 1} OF {lessons.length}</p><h2>{l.title}</h2><p>{l.goal}</p>
    <div className="ag-task"><b>First, change the code:</b> {l.edit.task}</div>
    <button className="ag-primary-light" onClick={onEdit}>Open the editor</button>
  </section>
  const { ask, given, result } = lesson
  return <section className="ag-lesson" aria-label="Guided step">
    <p className="ag-eyebrow">STEP {lesson.index + 1} OF {lessons.length}{done ? ' · DONE ✓' : ''}</p>
    <h2>{l.title}</h2><p>{l.goal}</p>
    <div className="ag-ask"><b>Predict</b><p>{ask.prompt}</p>
      {ask.kind === 'choice'
        ? <div className="ag-options" role="radiogroup" aria-label="Your prediction">{ask.options.map(o => <label key={o} className={given === o ? 'chosen' : ''}><input type="radio" name="prediction" value={o} checked={given === o} disabled={!!result} onChange={() => onAnswer(o)} /> {o}</label>)}</div>
        : <input className="ag-number" aria-label="Your prediction" inputMode="decimal" value={given} disabled={!!result} onChange={e => onAnswer(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && given !== '') onCheck() }} placeholder="type a number" />}
      <details className="ag-hint-box"><summary>A hint</summary><p>{ask.hint}</p></details>
      {!result && (moved
        ? <p className="ag-hint">You've moved the program since this question was asked. <button className="ag-link" onClick={onRestart}>Put it back and ask again</button></p>
        : <p><button className="ag-primary-light" disabled={given === ''} onClick={onCheck}>Check against the real run</button> <button className="ag-link" onClick={onReveal}>I don't know: show me</button></p>)}
    </div>
    {result && <div className={`ag-result ${result.ok ? 'ok' : 'no'}`} role="status">
      <b>{result.ok ? 'Right.' : result.shown ? 'Here is what the program did.' : 'Not quite.'}</b> The program {result.ok ? 'also got' : 'got'} <span className="mono">{typeof result.actual === 'number' ? num(result.actual) : String(result.actual)}</span>.
      <p>{result.why}</p>
      <p>{lesson.index + 1 < lessons.length && <button className="ag-primary-light" onClick={onNext}>Next step →</button>} <button className="ag-link" onClick={onRestart}>Try this step again</button></p>
    </div>}
  </section>
}

export default function AArcadeGuided() {
  const [runner, setRunner] = useState(() => new Runner('q', true))
  const [, render] = useState(0)
  const [selection, setSelection] = useState(null)
  const [follow, setFollow] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState('medium')
  const [playMode, setPlayMode] = useState('over')
  const [error, setError] = useState(null)
  const [sources, setSources] = useState({ q: null, a2c: null })
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(ORIGINAL.q)
  const [editError, setEditError] = useState(null)
  const [lesson, setLesson] = useState(null)
  const [progress, setProgress] = useState(loadProgress)
  // The record of every step shown so far, for Step back. `at` is which one is on screen:
  // null means the present (the last one), a number means a step in the past.
  const timeline = useRef(null)
  if (!timeline.current) timeline.current = [runner.snapshot()]
  const [at, setAt] = useState(null)
  const info = runner.def.info
  const explain = runner.def.explain
  const lessons = LESSONS[runner.id]
  const refresh = () => render(v => v + 1)
  const steps = timeline.current, index = at ?? steps.length - 1
  const view = steps[index], prevView = steps[index - 1] ?? null
  const rewound = at !== null
  const original = useMemo(() => runner.def.edited ? new Set(ORIGINAL[runner.id].split('\n')) : null, [runner.def])

  const followLine = v => { if (follow && v.started) setSelection({ kind: 'line', line: v.stack.at(-1).line }) }
  // A forward command: in the past, move one recorded step forward; in the present, run the program.
  function act(command) {
    if (at !== null) {
      const next = at + 1 >= steps.length - 1 ? null : at + 1
      setAt(next); followLine(steps[next ?? steps.length - 1]); return
    }
    try { command() } catch (e) { setError(String(e.message ?? e)); setPlaying(false) }
    steps.push(runner.snapshot())
    if (steps.length > MAX_RECORDED) steps.shift()
    followLine(steps.at(-1))
    refresh()
  }
  function stepBack() {
    setPlaying(false)
    if (index === 0) return
    setAt(index - 1); followLine(steps[index - 1])
  }
  function seek(i) {
    setPlaying(false)
    setAt(i >= steps.length - 1 ? null : i); followLine(steps[i])
  }
  // The earliest recorded step at or after a moment (a count of lines run), if it is in the past.
  const pastIndex = count => { const i = steps.findIndex(s => s.tracer.count >= count); return i >= 0 && i < index ? i : null }
  useEffect(() => {
    if (!playing) return
    const { delay, times } = PLAY_SPEEDS[playMode][speed]
    const command = { into: () => runner.stepInto(), over: () => runner.stepOver(), action: () => runner.nextAction(times) }[playMode]
    const timer = setInterval(() => act(command), delay)
    return () => clearInterval(timer)
  }, [playing, speed, playMode, runner, follow, at])

  // Start showing a new run: a fresh record, nothing in the past.
  function begin(r) {
    timeline.current = [r.snapshot()]
    setAt(null); setRunner(r); setPlaying(false); setError(null)
    setSelection(r.started ? { kind: 'line', line: r.stack.at(-1).line } : null)
  }
  function restart(id = runner.id, supplied = runner.supplied) {
    setLesson(null)
    try { begin(new Runner(id, supplied, { source: sources[id] ?? undefined })) } catch (e) { setError(String(e.message ?? e)) }
  }
  function switchProgram(id) { setEditing(false); setEditError(null); setDraft(sources[id] ?? ORIGINAL[id]); restart(id, true) }

  function startLesson(i, id = runner.id, source = sources[id]) {
    const l = LESSONS[id][i]
    setEditError(null)
    if (l.edit && !(source && l.edit.done(source))) { setLesson({ index: i, needsEdit: true }); setEditing(true); setDraft(source ?? ORIGINAL[id]); return }
    let r
    try { r = new Runner(id, l.start.supplied, { data: l.start.data, source: l.edit ? source : undefined }); l.go(r) } catch (e) { setError(String(e.message ?? e)); return }
    r.changes = { keys: new Set(), detail: [] }
    begin(r)
    setEditing(false)
    setLesson({ index: i, ask: l.ask(r), given: '', result: null, count: r.tracer.count })
  }
  function check(show = false) {
    const l = lessons[lesson.index]
    let actual
    try { actual = l.reveal(runner) } catch (e) { setError(String(e.message ?? e)); return }
    steps.push(runner.snapshot()); setAt(null); followLine(steps.at(-1))
    const ok = !show && correct(lesson.ask, lesson.given, actual)
    setLesson({ ...lesson, result: { ok, shown: show, actual, why: l.why(runner, actual) } })
    if (ok && !progress[runner.id].includes(l.id)) {
      const next = { ...progress, [runner.id]: [...progress[runner.id], l.id] }
      setProgress(next)
      try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(next)) } catch { /* progress just isn't kept */ }
    }
    refresh()
  }

  function runDraft() {
    let r
    try { r = new Runner(runner.id, runner.supplied, { source: draft }) } catch (e) { setEditError(String(e.message ?? e)); return }
    const id = runner.id, edited = draft === ORIGINAL[id] ? null : draft
    setSources({ ...sources, [id]: edited }); setEditError(null); setEditing(false)
    if (lesson?.needsEdit) {
      if (lessons[lesson.index].edit.done(draft)) { startLesson(lesson.index, id, draft); return }
      setEditError('That runs, but it isn\'t the change this step asks for yet.'); setEditing(true)
    }
    setLesson(lesson?.needsEdit ? lesson : null)
    begin(r)
  }
  function backToOriginal() {
    setDraft(ORIGINAL[runner.id]); setSources({ ...sources, [runner.id]: null }); setEditError(null); setLesson(null)
    begin(new Runner(runner.id, runner.supplied))
  }

  const onChange = (key, value) => { if (rewound) return; runner.data[key] = value; steps[steps.length - 1] = runner.snapshot(); refresh() }
  const select = s => setSelection(s)
  const stop = fn => () => { setPlaying(false); act(fn) }
  const runTo = n => stop(() => { if (!runner.runToLine(n)) setError(`Line ${n} didn't run within 2,000,000 lines. It may only run in situations that haven't happened yet.`) })()
  const jump = count => { const i = pastIndex(count); if (i !== null) seek(i) }

  return <div className="ag-lab" role="region" aria-label="A-Arcade Guided">
    <header className="ag-header">
      <div><h1>A-Arcade Guided</h1><p>Predict what each line will do, then watch the real program do it.</p></div>
      <div className="ag-program">
        {Object.entries(PROGRAMS).map(([id, p]) => <button key={id} className={runner.id === id ? 'active' : ''} onClick={() => switchProgram(id)}>{p.label}</button>)}
        <button onClick={() => restart(runner.id, true)}>Trained agent</button>
        <button onClick={() => restart(runner.id, false)}>Learn from zero</button>
      </div>
    </header>
    <nav className="ag-path" aria-label="Guided steps">
      <span>Guided steps</span>
      {lessons.map((l, i) => <button key={l.id} className={lesson?.index === i ? 'active' : ''} aria-current={lesson?.index === i ? 'step' : undefined} onClick={() => startLesson(i)}>
        <b>{progress[runner.id].includes(l.id) ? '✓' : i + 1}</b> {l.title}</button>)}
      {lesson && <button className="ag-link" onClick={() => setLesson(null)}>Explore freely</button>}
    </nav>
    <div className="ag-controls" role="toolbar" aria-label="Stepping">
      <button onClick={stepBack} disabled={index === 0} title="Go back one recorded step">◀ Step back</button>
      <button onClick={stop(() => runner.stepInto())} title="Run one line; go inside any function it calls">Step into</button>
      <button onClick={stop(() => runner.stepOver())} title="Run one line, including any function it calls">Step over</button>
      <button onClick={stop(() => runner.stepOut())} title="Finish this function and return to its caller">Step out</button>
      <button onClick={stop(() => runner.nextAction())} title="Run until the cart has moved one step">Next action</button>
      <button className="ag-primary" onClick={() => { if (playing) { setPlaying(false); refresh() } else setPlaying(true) }}>{playing ? 'Ⅱ Pause' : '▶ Play'}</button>
      <label>Play <select aria-label="What Play steps through" value={playMode} onChange={e => setPlayMode(e.target.value)}><option value="over">this function's lines</option><option value="into">every line</option><option value="action">cart steps only</option></select></label>
      <label>Speed <select aria-label="Play speed" value={speed} onChange={e => setSpeed(e.target.value)}><option value="slow">slow</option><option value="medium">medium</option><option value="fast">fast</option></select></label>
      <label className="ag-follow"><input type="checkbox" checked={follow} onChange={e => setFollow(e.target.checked)} /> Explain each line as it runs</label>
      <span className="ag-count">{view.tracer.count.toLocaleString()} lines run</span>
    </div>
    <div className="ag-phases" role="toolbar" aria-label="Parts of the loop">
      {runner.def.phases.map(([key, label, says]) => <button key={key} className={view.phase === key ? 'active' : ''} title={`${says} Click to run to the next ${label.toLowerCase()}.`} disabled={rewound} onClick={stop(() => { if (!runner.runToPhase(key)) setError(`${label} didn't come round within 2,000,000 lines.`) })}>{label}<small>{says}</small></button>)}
    </div>
    <div className="ag-scrub"><label>Recorded steps <input type="range" aria-label="Recorded steps" min="0" max={steps.length - 1} value={index} onChange={e => seek(Number(e.target.value))} /></label><span>{index + 1} of {steps.length}{rewound ? ' · looking back' : ' · now'}</span>
      {rewound && <button className="ag-link" onClick={() => seek(steps.length - 1)}>Back to the present</button>}
      <button className="ag-link" onClick={() => setSelection(null)}>How the pieces fit</button></div>
    {rewound && <p className="ag-past" role="status">Looking back: step {index + 1} of {steps.length} recorded. Stepping forward replays the record, then the program carries on. Knobs are locked here, because changing one would make a different future.</p>}
    {error && <p className="ag-error" role="alert">{error} <button className="ag-link" onClick={() => setError(null)}>Dismiss</button></p>}
    <div className="ag-columns">
      <section className="ag-code-column" aria-label="Program">
        <div className="ag-code-head">
          <span>{runner.def.edited ? '✎ Your version' : 'The program'}{runner.def.edited && <small> (changed lines marked ✎)</small>}</span>
          {!editing ? <button onClick={() => { setDraft(sources[runner.id] ?? ORIGINAL[runner.id]); setEditing(true) }}>✎ Edit the program</button> : <button onClick={() => { setEditing(false); setEditError(null) }}>Close the editor</button>}
        </div>
        {editing ? <div className="ag-editor">
          {lesson?.needsEdit && <p className="ag-task">{lessons[lesson.index].edit.task}</p>}
          <textarea aria-label="Program source" spellCheck="false" value={draft} onChange={e => setDraft(e.target.value)} />
          {editError && <p className="ag-error" role="alert">{editError}</p>}
          <p><button className="ag-primary-light" onClick={runDraft}>Run my version</button> <button className="ag-link" onClick={backToOriginal}>Back to the original program</button></p>
          <p className="ag-hint">Keep each statement on one line, and call this program's own functions only at the start of a line, after "=", or after "return": that is what lets every line be stepped through.</p>
        </div> : <CodePanel info={info} runner={view} selection={selection} onSelect={select} original={original} />}
      </section>
      <main className="ag-middle">
        <div className="ag-cart"><Cart state={view.drawn} ghost={view.ghost} label={view.id === 'a2c' ? 'world 1 of 8' : `game ${view.data.episode} · step ${view.data.steps}`} /></div>
        <div className="ag-explain-box" aria-live="polite">
          {lesson && <LessonCard lessons={lessons} lesson={lesson} done={progress[runner.id].includes(lessons[lesson.index].id)} moved={!lesson.needsEdit && !lesson.result && (rewound || runner.tracer.count !== lesson.count)}
            onAnswer={given => setLesson({ ...lesson, given })} onCheck={() => check(false)} onReveal={() => check(true)}
            onRestart={() => startLesson(lesson.index)} onNext={() => startLesson(lesson.index + 1)} onEdit={() => setEditing(true)} />}
          {!selection && <Overview info={info} runner={view} explain={explain} onSelect={select} />}
          {selection?.kind === 'line' && <LineExplain n={selection.line} info={info} runner={view} explain={explain} onSelect={select} onRunTo={runTo} live={!rewound} />}
          {selection?.kind === 'token' && <TokenExplain selection={selection} info={info} runner={view} explain={explain} onSelect={select} />}
          {selection?.kind === 'function' && <FunctionExplain name={selection.name} info={info} runner={view} explain={explain} onSelect={select} />}
          {selection?.kind === 'data' && <DataExplain dataKey={selection.key} info={info} runner={view} explain={explain} onSelect={select} />}
          {selection?.kind === 'piece' && <PieceExplain id={selection.id} onSelect={select} />}
        </div>
      </main>
      <DataPanel runner={view} prevView={prevView} locked={rewound} explain={explain} info={info} onSelect={select} onChange={onChange} pastIndex={pastIndex} onJump={jump} />
    </div>
  </div>
}
