import { useEffect, useMemo, useRef, useState } from 'react'
import Katex from '../../components/concept-explorer/Katex.jsx'
import { Runner } from './runner.js'
import { PROGRAMS } from './programs/index.js'
import { analyse, dataUse, tokenize, jsEntry } from './analysis.js'
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
function CodePanel({ info, runner, selection, onSelect }) {
  const box = useRef(null)
  const top = runner.stack.at(-1)
  const current = runner.started ? top?.line : null
  const callSites = new Set(runner.stack.slice(0, -1).map(f => f.line))
  useEffect(() => {
    const el = box.current?.querySelector('.at-line.current')
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
  return <div className="at-code" ref={box} role="region" aria-label="Program code">
    {info.lines.map((text, i) => {
      const n = i + 1, tokens = tokenize(text)
      const selected = selection && (selection.kind === 'line' || selection.kind === 'token') && selection.line === n
      return <div key={n} className={`at-line${n === current ? ' current' : ''}${callSites.has(n) ? ' call-site' : ''}${selected ? ' selected' : ''}`}
        onClick={e => { if (!e.target.dataset.tok) onSelect({ kind: 'line', line: n }) }}>
        <span className="at-gutter">{n === current ? '▶' : callSites.has(n) ? '↳' : ''}<b>{n}</b></span>
        <code>{tokens.map((t, k) => t.kind === 'space' || t.kind === 'comment' || t.kind === 'number'
          ? <span key={k} className={`tk-${t.kind}`}>{t.text}</span>
          : <span key={k} data-tok="1" className={`tk-${t.kind}${info.functions[t.text] && !t.property ? ' tk-fn' : ''}`}
              onClick={() => onSelect({ kind: 'token', line: n, token: t })}>{t.text}</span>)}</code>
        {inline[n] && <span className="at-inline">{inline[n].join('   ')}</span>}
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
function Path({ info, fn, onSelect, line }) {
  return <nav className="at-crumbs" aria-label="Where this fits">{info.pathTo(fn).map((f, i) => <span key={f}>{i > 0 && <b>›</b>}<button className="at-link" onClick={() => onSelect({ kind: 'function', name: f })}>{f}()</button></span>)}{line && <span><b>·</b> line {line}</span>}</nav>
}
function Chips({ items, onSelect }) {
  return <span className="at-chips">{items.map(k => <button key={k} className="at-chip" onClick={() => onSelect({ kind: 'data', key: k })}>data.{k}</button>)}</span>
}

function LineExplain({ n, info, runner, explain, onSelect }) {
  const fn = info.lineFn[n], text = info.lines[n - 1], note = info.notes[n]
  if (!fn) return <div className="at-explain"><p className="at-eyebrow">LINE {n} · OUTSIDE ANY FUNCTION</p><pre className="at-bigcode">{text || ' '}</pre><p>{text.startsWith('//') ? 'A comment: a note for people reading the code. JavaScript ignores it.' : 'A constant the whole program can use. Click a name in it to see what it is.'}</p></div>
  const { reads, writes } = dataUse(text)
  const tokens = tokenize(text)
  const names = [...new Set(tokens.filter(t => t.kind === 'name' && !t.property && !info.functions[t.text]).map(t => t.text))]
  const vars = names.filter(name => name !== 'data').map(name => ({ name, got: valueOf(runner, fn, name) ?? (info.constants[name] && { value: info.constants[name].value }), means: explain.VARS[name] })).filter(v => v.got || v.means)
  const calls = (info.lineCalls[n] ?? []).filter((c, i, a) => a.indexOf(c) === i && c !== fn)
  const jsUsed = [...new Map(tokens.filter(t => jsEntry(t)).map(t => [jsEntry(t).title, t])).values()]
  const running = runner.started && runner.stack.at(-1)?.line === n
  return <div className="at-explain">
    <Path info={info} fn={fn} onSelect={onSelect} line={n} />
    {running && <p className="at-running">▶ This line runs next</p>}
    <pre className="at-bigcode">{text.trim()}</pre>
    <h3>What this line does</h3>
    <p className="at-say">{note?.say ?? (/^\s*}/.test(text) ? 'Closes the block above.' : 'Part of the function above; click any word in it.')}</p>
    {note?.tex && <div className="at-tex"><Katex latex={note.tex} /></div>}
    {vars.length > 0 && <><h3>The names on this line, right now</h3><table className="at-table"><tbody>{vars.map(v => <tr key={v.name}><td><button className="at-link mono" onClick={() => onSelect({ kind: 'token', line: n, token: { text: v.name, kind: 'name' } })}>{v.name}</button></td><td>{v.means ?? ''}</td><td className="mono at-val">{v.got ? show(v.got.value) : 'not set yet'}</td></tr>)}</tbody></table></>}
    {calls.length > 0 && <><h3>This line calls</h3>{calls.map(c => <FunctionCard key={c} name={c} explain={explain} info={info} onSelect={onSelect} />)}<p className="at-hint">Step into on this line to go inside; Step over runs the whole call as one step.</p></>}
    {(reads.length > 0 || writes.length > 0) && <><h3>Stored data</h3><p>{reads.length > 0 && <>Reads <Chips items={reads} onSelect={onSelect} /> </>}{writes.length > 0 && <>Changes <Chips items={writes} onSelect={onSelect} /></>}</p></>}
    {jsUsed.length > 0 && <><h3>JavaScript on this line</h3><span className="at-chips">{jsUsed.map(t => <button key={jsEntry(t).title} className="at-chip js" onClick={() => onSelect({ kind: 'token', line: n, token: t })}>{jsEntry(t).title}</button>)}</span></>}
    {note?.piece && <><h3>The idea behind it</h3><button className="at-piece-link" onClick={() => onSelect({ kind: 'piece', id: note.piece })}>{PIECES[note.piece].title} — {PIECES[note.piece].question}</button></>}
  </div>
}

function FunctionCard({ name, explain, info, onSelect }) {
  const f = explain.FUNCTIONS[name], fn = info.functions[name]
  return <button className="at-fcard" onClick={() => onSelect({ kind: 'function', name })}>
    <strong>{name}({fn.params.join(', ')})</strong><span>{f?.summary}</span><small>gives back: {f?.returns}</small>
  </button>
}

function FunctionExplain({ name, info, runner, explain, onSelect, from }) {
  const f = explain.FUNCTIONS[name] ?? {}, fn = info.functions[name], frame = frameFor(runner, name)
  const last = runner.lastCalls[name]
  return <div className="at-explain">
    <Path info={info} fn={name} onSelect={onSelect} />
    {frame && <p className="at-running">▶ Running now{frame === runner.stack.at(-1) ? '' : ' (waiting for a call it made)'}</p>}
    <h2 className="mono">{name}({fn.params.join(', ')})</h2>
    <p className="at-summary">{f.summary}</p>
    <p className="at-say">{f.purpose}</p>
    {from && <p className="at-hint">You clicked it on line {from}.</p>}
    <h3>Inputs</h3>
    <table className="at-table"><thead><tr><th>Input</th><th>What it is</th><th>{frame ? 'Now' : 'Last call'}</th></tr></thead><tbody>
      {(f.inputs ?? fn.params.map(p => [p, ''])).map(([p, m]) => {
        const got = (frame ?? (last && { vars: last }))?.vars?.[p]
        const v = got && p !== 'data' ? read(got) : null
        return <tr key={p}><td className="mono">{p}</td><td>{m}</td><td className="mono at-val">{p === 'data' ? 'the panel on the right' : v ? show(v.value) : '—'}</td></tr>
      })}</tbody></table>
    <h3>Gives back</h3><p>{f.returns}</p>
    {(f.reads?.length || f.writes?.length) ? <><h3>Stored data</h3><p>{f.reads?.length ? <>Reads <Chips items={f.reads.filter(k => k in runner.data)} onSelect={onSelect} /> </> : null}{f.writes?.length ? <>Changes <Chips items={f.writes.filter(k => k in runner.data)} onSelect={onSelect} /></> : null}</p></> : null}
    {fn.callers.length > 0 && <><h3>Called from</h3><p>{fn.callers.map(c => <button key={`${c.fn}${c.line}`} className="at-link" onClick={() => onSelect({ kind: 'line', line: c.line })}>{c.fn}(), line {c.line}</button>)}</p></>}
    {fn.calls.length > 0 && <><h3>It calls</h3>{fn.calls.map(c => <FunctionCard key={c} name={c} explain={explain} info={info} onSelect={onSelect} />)}</>}
    <h3>Its code</h3><p><button className="at-link" onClick={() => onSelect({ kind: 'line', line: fn.start + 1 })}>Lines {fn.start}–{fn.end}: start at its first line</button></p>
    {f.piece && <><h3>The idea behind it</h3><button className="at-piece-link" onClick={() => onSelect({ kind: 'piece', id: f.piece })}>{PIECES[f.piece].title} — {PIECES[f.piece].question}</button></>}
  </div>
}

function TokenExplain({ selection, info, runner, explain, onSelect }) {
  const { token, line } = selection, fn = info.lineFn[line]
  if (info.functions[token.text] && !token.property) return <FunctionExplain name={token.text} info={info} runner={runner} explain={explain} onSelect={onSelect} from={line} />
  if (token.property && token.object === 'data') return <DataExplain dataKey={token.text} info={info} runner={runner} explain={explain} onSelect={onSelect} />
  const js = jsEntry(token)
  const back = <p><button className="at-link" onClick={() => onSelect({ kind: 'line', line })}>← The whole of line {line}</button></p>
  if (js) return <div className="at-explain">{back}<p className="at-eyebrow">JAVASCRIPT</p><h2 className="mono">{js.title}</h2><p className="at-say">{js.say}</p><h3>Example</h3><pre className="at-bigcode">{js.example}</pre><h3>On this line</h3><pre className="at-bigcode">{info.lines[line - 1].trim()}</pre></div>
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
  return <div className="at-explain">{back}
    <p className="at-eyebrow">{token.property ? 'A NAMED PART OF AN OBJECT' : fnInfo?.params.includes(name) ? `AN INPUT OF ${fn}()` : 'A NAME'}</p>
    <h2 className="mono">{token.property ? `${token.object}.${name}` : name}</h2>
    <p className="at-say">{means ?? (token.property ? `The value called "${name}" inside ${token.object}.` : 'A name used on this line.')}</p>
    {got && <><h3>Right now</h3><pre className="at-bigcode">{show(got.value)}</pre></>}
    {setOn.length > 0 && <><h3>Gets its value on</h3><p>{setOn.map(n => <button key={n} className="at-link" onClick={() => onSelect({ kind: 'line', line: n })}>line {n}</button>)}</p></>}
    {usedOn.length > 0 && <><h3>Used on</h3><p>{usedOn.map(n => <button key={n} className="at-link" onClick={() => onSelect({ kind: 'line', line: n })}>line {n}</button>)}</p></>}
  </div>
}

function DataExplain({ dataKey, info, runner, explain, onSelect }) {
  const d = explain.DATA[dataKey] ?? { label: dataKey, means: '' }
  const uses = info.lines.map((t, i) => ({ n: i + 1, ...dataUse(t) })).filter(u => u.reads.includes(dataKey) || u.writes.includes(dataKey))
  return <div className="at-explain">
    <p className="at-eyebrow">STORED DATA</p><h2 className="mono">data.{dataKey}</h2><p className="at-say">{d.means}</p>
    <h3>Right now</h3><pre className="at-bigcode">{show(runner.data[dataKey])}</pre>
    <h3>Lines that use it</h3><table className="at-table"><tbody>{uses.map(u => <tr key={u.n}><td><button className="at-link" onClick={() => onSelect({ kind: 'line', line: u.n })}>line {u.n}</button></td><td>{info.lineFn[u.n]}()</td><td>{u.writes.includes(dataKey) ? 'changes it' : 'reads it'}</td></tr>)}</tbody></table>
  </div>
}

function PieceExplain({ id, onSelect }) {
  const p = PIECES[id]
  return <div className="at-explain">
    <nav className="at-crumbs">{piecePath(id).map((q, i) => <span key={q}>{i > 0 && <b>›</b>}<button className="at-link" onClick={() => onSelect({ kind: 'piece', id: q })}>{PIECES[q].title}</button></span>)}</nav>
    <p className="at-eyebrow">THE IDEA BEHIND THE CODE</p><h2>{p.title}</h2><p className="at-summary">{p.question}</p>
    {p.plain.map((t, i) => <p key={i} className="at-say">{t}</p>)}
    {p.table && <table className="at-table"><thead><tr>{p.table.head.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{p.table.rows.map(r => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody></table>}
    <h3>The maths</h3>{p.math.map((m, i) => <div className="at-tex" key={i}><Katex latex={m.tex} /><p>{m.say}</p></div>)}
    {p.symbols.length > 0 && <><h3>Every symbol</h3><table className="at-table"><tbody>{p.symbols.map(s => <tr key={s.tex}><td><Katex latex={s.tex} display={false} /></td><td>{s.say}</td><td>{s.means}</td><td className="mono">{s.code ?? ''}</td></tr>)}</tbody></table></>}
    {p.example.steps.length > 0 && <div className="at-worked"><h3>Work it by hand</h3><p>{p.example.setup}</p><ol>{p.example.steps.map((s, i) => <li key={i}>{s.tex ? <Katex latex={s.tex} /> : s.text}</li>)}</ol></div>}
    {p.parts.length > 0 && <><h3>Made of</h3><span className="at-chips">{p.parts.map(q => <button key={q} className="at-chip" onClick={() => onSelect({ kind: 'piece', id: q })}>{PIECES[q].title}</button>)}</span></>}
    {parentsOf(id).length > 0 && <><h3>Part of</h3><span className="at-chips">{parentsOf(id).map(q => <button key={q} className="at-chip" onClick={() => onSelect({ kind: 'piece', id: q })}>{PIECES[q].title}</button>)}</span></>}
  </div>
}

// With nothing selected: how the functions fit together, starting from run().
function Overview({ info, runner, explain, onSelect }) {
  const active = new Set(runner.stack.map(f => f.fn)), seen = new Set()
  const node = (name, depth) => {
    const again = seen.has(name); seen.add(name)
    const fn = info.functions[name]
    return <li key={`${name}-${depth}`}>
      <button className={`at-tree-item${active.has(name) ? ' active' : ''}${runner.stack.at(-1)?.fn === name ? ' top' : ''}`} onClick={() => onSelect({ kind: 'function', name })}>
        <span className="mono">{name}()</span> <span>{explain.FUNCTIONS[name]?.summary}</span>
      </button>
      {!again && fn.calls.length > 0 && <ul>{fn.calls.map(c => node(c, depth + 1))}</ul>}
    </li>
  }
  return <div className="at-explain">
    <p className="at-eyebrow">HOW THE PIECES FIT</p>
    <h2>{runner.def.label}: who calls whom</h2>
    <p className="at-say">Everything starts in <b>run()</b>. Each function below is called by the one above it. Functions running right now are highlighted. Click any of them, or any line or word in the code, to have it explained here.</p>
    <ul className="at-tree">{node('run', 0)}</ul>
    <h3>How to follow it</h3>
    <ul className="at-howto">
      <li><b>Step into</b> runs one line; if the line calls a function, it goes inside it.</li>
      <li><b>Step over</b> runs one line, including any function it calls, as one step.</li>
      <li><b>Step out</b> finishes the function you're in and returns to the line that called it.</li>
      <li><b>Next action</b> runs until the cart has moved one step (0.02 s). <b>Play</b> keeps doing that.</li>
      <li>The faint cart is where it was one step ago. Values that just changed are highlighted on the right.</li>
    </ul>
  </div>
}

// ── Right-hand panel ────────────────────────────────────────────────────────────────────────────
function DataPanel({ runner, prevView, locked, explain, info, onSelect, onChange }) {
  const data = runner.data, changed = runner.changes.keys
  const top = runner.started ? runner.stack.at(-1) : null
  const knobs = Object.entries(explain.DATA).filter(([, d]) => d.knob || d.toggle)
  const vars = top ? Object.entries(top.vars).filter(([n]) => n !== 'data').map(([n, t]) => [n, read(t)]).filter(([, g]) => g) : []
  const row = data.Q && data.state ? encode('cartpole', data.state).index : null
  return <aside className="at-right" aria-label="Data and knobs">
    <section><h3>Knobs</h3>{knobs.map(([k, d]) => d.toggle
      ? <label key={k} className="at-toggle"><input type="checkbox" disabled={locked} checked={!!data[k]} onChange={e => onChange(k, e.target.checked)} /> {d.label} <small>{d.means}</small></label>
      : <label key={k} className="at-slider"><span>{d.label}<b>{num(data[k])}</b></span><input aria-label={d.label} disabled={locked} type="range" min={d.knob[0]} max={d.knob[1]} step={d.knob[2]} value={data[k]} onChange={e => onChange(k, Number(e.target.value))} /></label>)}
      <p className="at-hint">Knobs change data straight away: the program reads them on its next line.</p></section>
    <section><h3>Stored data <small>(data)</small></h3>
      {runner.id === 'q' ? <>
        <DataRow k="state" label="state" value={data.state} changed={changed} onSelect={onSelect} names={['x', 'ẋ', 'θ', 'θ̇']} />
        <DataRow k="steps" label="steps" value={data.steps} changed={changed} onSelect={onSelect} />
        <DataRow k="total" label="total" value={data.total} changed={changed} onSelect={onSelect} />
        <DataRow k="episode" label="episode" value={data.episode} changed={changed} onSelect={onSelect} />
        <DataRow k="Q" label={row === null ? 'Q' : `Q[${row}] (this state's row)`} value={row === null ? undefined : data.Q[row]} changed={changed} onSelect={onSelect} names={['left', 'right']} />
      </> : <>
        <DataRow k="worlds" label="world 1 state" value={data.worlds[0].state} changed={changed} onSelect={onSelect} names={['x', 'ẋ', 'θ', 'θ̇']} />
        <DataRow k="worlds" label="world 1 steps" value={data.worlds[0].steps} changed={changed} onSelect={onSelect} />
        <DataRow k="actorWeights" label="actor weights w_π" value={data.actorWeights} changed={changed} onSelect={onSelect} names={['x', 'ẋ', 'θ', 'θ̇', '1']} />
        <DataRow k="criticWeights" label="critic weights w_V" value={data.criticWeights} changed={changed} onSelect={onSelect} />
      </>}
      {runner.changes.detail.length > 0 && <div className="at-changes"><b>Just changed</b>{runner.changes.detail.slice(0, 6).map(d => <div key={d.path} className="mono">{d.path}: {show(d.before)} → {show(d.after)}</div>)}</div>}
    </section>
    <section><h3>Variables in {top ? <button className="at-link mono" onClick={() => onSelect({ kind: 'function', name: top.fn })}>{top.fn}()</button> : '—'}</h3>
      {vars.length === 0 ? <p className="at-hint">{runner.started ? 'None yet.' : 'Press Step into to start at run().'}</p> :
        <table className="at-table at-vars"><tbody>{vars.map(([n, g]) => <tr key={n} className={changedSince(prevView, top, n, g.value) ? 'changed' : ''}>
          <td><button className="at-link mono" onClick={() => onSelect({ kind: 'token', line: top.line, token: { text: n, kind: 'name' } })}>{n}</button></td><td className="mono at-val">{show(g.value)}</td></tr>)}</tbody></table>}
    </section>
    <section><h3>Call stack</h3>{runner.stack.length === 0 ? <p className="at-hint">Not started.</p> :
      <ol className="at-stack">{[...runner.stack].reverse().map((f, i) => <li key={i}><button className="at-link mono" onClick={() => onSelect({ kind: 'line', line: f.line })}>{f.fn}()</button> <small>line {f.line}</small></li>)}</ol>}</section>
    <section><h3>Trace: the last lines run</h3><ol className="at-trace">{[...runner.history].reverse().slice(0, 14).map((h, i) => <li key={i} style={{ paddingLeft: Math.min(h.depth - 1, 6) * 8 }}><button className="at-link mono" onClick={() => onSelect({ kind: 'line', line: h.line })}>{h.line}</button> <code>{h.kind === 'enter' ? `→ ${h.fn}()` : info.lines[h.line - 1].trim().slice(0, 46)}</code></li>)}</ol></section>
    <section><h3>Game lengths</h3><p className="mono at-games">{runner.games.length ? runner.games.slice(-12).join(' · ') : 'No game finished yet.'}</p></section>
  </aside>
}
// Whether a variable of the running function differs from the step before (same function only).
function changedSince(prevView, top, name, value) {
  const prev = prevView?.stack.at(-1)
  if (!prev || prev.fn !== top.fn) return false
  const before = prev.vars[name] ? read(prev.vars[name]) : null
  return show(before?.value) !== show(value)
}
function DataRow({ k, label, value, changed, onSelect, names }) {
  return <button className={`at-data${changed.has(k) ? ' changed' : ''}`} onClick={() => onSelect({ kind: 'data', key: k })}>
    <span>{label}</span>
    {Array.isArray(value) && names ? <span className="at-data-items">{value.map((v, i) => <span key={i}><small>{names[i]}</small>{num(v)}</span>)}</span> : <span className="mono">{show(value)}</span>}
  </button>
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
export default function AArcadeTrace() {
  const [runner, setRunner] = useState(() => new Runner('q', true))
  const [, render] = useState(0)
  const [selection, setSelection] = useState(null)
  const [follow, setFollow] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState('medium')
  const [playMode, setPlayMode] = useState('over')
  const [error, setError] = useState(null)
  // The record of every step shown so far, for Step back. `at` is which one is on screen:
  // null means the present (the last one), a number means a step in the past.
  const timeline = useRef(null)
  if (!timeline.current) timeline.current = [runner.snapshot()]
  const [at, setAt] = useState(null)
  const info = useMemo(() => analyse(runner.def.program, runner.def.explain), [runner.def])
  const explain = runner.def.explain
  const refresh = () => render(v => v + 1)
  const steps = timeline.current, index = at ?? steps.length - 1
  const view = steps[index], prevView = steps[index - 1] ?? null
  const rewound = at !== null

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
  useEffect(() => {
    if (!playing) return
    const { delay, times } = PLAY_SPEEDS[playMode][speed]
    const command = { into: () => runner.stepInto(), over: () => runner.stepOver(), action: () => runner.nextAction(times) }[playMode]
    const timer = setInterval(() => act(command), delay)
    return () => clearInterval(timer)
  }, [playing, speed, playMode, runner, follow, at])
  function restart(id = runner.id, supplied = runner.supplied) {
    setPlaying(false); setSelection(null); setError(null); setAt(null)
    const next = new Runner(id, supplied)
    timeline.current = [next.snapshot()]
    setRunner(next)
  }
  // Knobs change the live data, so the present's record is retaken; in the past they are locked.
  const onChange = (key, value) => { if (rewound) return; runner.data[key] = value; steps[steps.length - 1] = runner.snapshot(); refresh() }
  const select = s => setSelection(s)
  const stop = fn => () => { setPlaying(false); act(fn) }

  return <div className="at-lab" role="region" aria-label="A-Arcade Trace">
    <header className="at-header">
      <div><h1>A-Arcade Trace</h1><p>Follow the program from run(): every line, every name, explained where it runs.</p></div>
      <div className="at-program">
        {Object.entries(PROGRAMS).map(([id, p]) => <button key={id} className={runner.id === id ? 'active' : ''} onClick={() => restart(id, true)}>{p.label}</button>)}
        <button onClick={() => restart(runner.id, true)}>Trained agent</button>
        <button onClick={() => restart(runner.id, false)}>Learn from zero</button>
      </div>
    </header>
    <div className="at-controls" role="toolbar" aria-label="Stepping">
      <button onClick={stepBack} disabled={index === 0} title="Go back one recorded step">◀ Step back</button>
      <button onClick={stop(() => runner.stepInto())} title="Run one line; go inside any function it calls">Step into</button>
      <button onClick={stop(() => runner.stepOver())} title="Run one line, including any function it calls">Step over</button>
      <button onClick={stop(() => runner.stepOut())} title="Finish this function and return to its caller">Step out</button>
      <button onClick={stop(() => runner.nextAction())} title="Run until the cart has moved one step">Next action</button>
      <button className="at-primary" onClick={() => { if (playing) { setPlaying(false); refresh() } else setPlaying(true) }}>{playing ? 'Ⅱ Pause' : '▶ Play'}</button>
      <label>Play <select aria-label="What Play steps through" value={playMode} onChange={e => setPlayMode(e.target.value)}><option value="over">this function's lines</option><option value="into">every line</option><option value="action">cart steps only</option></select></label>
      <label>Speed <select aria-label="Play speed" value={speed} onChange={e => setSpeed(e.target.value)}><option value="slow">slow</option><option value="medium">medium</option><option value="fast">fast</option></select></label>
      <label className="at-follow"><input type="checkbox" checked={follow} onChange={e => setFollow(e.target.checked)} /> Explain each line as it runs</label>
      <button className="at-link" onClick={() => setSelection(null)}>How the pieces fit</button>
      <span className="at-count">{view.tracer.count.toLocaleString()} lines run</span>
    </div>
    {rewound && <p className="at-past" role="status">Looking back: step {index + 1} of {steps.length} recorded. Stepping forward replays the record, then the program carries on. Knobs are locked here, because changing one would make a different future. <button className="at-link" onClick={() => { setAt(null); followLine(steps.at(-1)) }}>Back to the present</button></p>}
    {error && <p className="at-error" role="alert">{error}</p>}
    <div className="at-columns">
      <CodePanel info={info} runner={view} selection={selection} onSelect={select} />
      <main className="at-middle">
        <div className="at-cart"><Cart state={view.drawn} ghost={view.ghost} label={view.id === 'a2c' ? 'world 1 of 8' : `game ${view.data.episode} · step ${view.data.steps}`} /></div>
        <div className="at-explain-box" aria-live="polite">
          {!selection && <Overview info={info} runner={view} explain={explain} onSelect={select} />}
          {selection?.kind === 'line' && <LineExplain n={selection.line} info={info} runner={view} explain={explain} onSelect={select} />}
          {selection?.kind === 'token' && <TokenExplain selection={selection} info={info} runner={view} explain={explain} onSelect={select} />}
          {selection?.kind === 'function' && <FunctionExplain name={selection.name} info={info} runner={view} explain={explain} onSelect={select} />}
          {selection?.kind === 'data' && <DataExplain dataKey={selection.key} info={info} runner={view} explain={explain} onSelect={select} />}
          {selection?.kind === 'piece' && <PieceExplain id={selection.id} onSelect={select} />}
        </div>
      </main>
      <DataPanel runner={view} prevView={prevView} locked={rewound} explain={explain} info={info} onSelect={select} onChange={onChange} />
    </div>
  </div>
}
