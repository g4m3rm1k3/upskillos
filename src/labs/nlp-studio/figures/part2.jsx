import { useEffect, useMemo, useState } from 'react'
import * as P from '../engine/parsing.js'
import { respondTrace, REFLECTIONS } from '../engine/eliza.js'
import { CodePane } from './part1.jsx'

// A tree drawn top-down: words along the bottom in order, each phrase centred over its children.
export function TreeView({ tree, compact = false }) {
  const nodes = [], edges = []
  let leaf = 0
  const GAP = compact ? 54 : 66, ROW = compact ? 38 : 46
  const place = (node, depth) => {
    const id = nodes.length
    nodes.push(null)
    if (P.isWord(node)) {
      const x = 30 + leaf++ * GAP
      nodes[id] = { label: node[0], x, y: 18 + depth * ROW, word: node[1] }
      return id
    }
    const kids = node[1].map(child => place(child, depth + 1))
    const x = kids.reduce((s, k) => s + nodes[k].x, 0) / kids.length
    nodes[id] = { label: node[0], x, y: 18 + depth * ROW }
    for (const k of kids) edges.push([id, k])
    return id
  }
  place(tree, 0)
  const depth = Math.max(...nodes.map(n => n.y)), wordY = depth + ROW
  const width = 30 + leaf * GAP
  return <svg className="nlp-tree" viewBox={`0 0 ${width} ${wordY + 14}`} style={{ maxWidth: width * 1.15 }} role="img" aria-label={P.bracket(tree)}>
    {edges.map(([a, b]) => <line key={`${a}-${b}`} x1={nodes[a].x} y1={nodes[a].y + 6} x2={nodes[b].x} y2={nodes[b].y - 11} />)}
    {nodes.filter(n => n.word).map((n, i) => <line key={`w${i}`} className="nlp-tree-word-line" x1={n.x} y1={n.y + 6} x2={n.x} y2={wordY - 12} />)}
    {nodes.map((n, i) => <text key={i} x={n.x} y={n.y} className={n.word ? 'pos' : 'phrase'}>{n.label}</text>)}
    {nodes.filter(n => n.word).map((n, i) => <text key={`t${i}`} x={n.x} y={wordY} className="word">{n.word}</text>)}
  </svg>
}

// Build a sentence from the grammar yourself: always expand the leftmost symbol still waiting.
const fresh = () => ({ label: 'S', children: null })
const toTree = node => (node.word ? [node.label, node.word] : [node.label, (node.children ?? []).map(toTree)])
function leftmostOpen(node) {
  if (node.word) return null
  if (!node.children) return node
  for (const child of node.children) { const open = leftmostOpen(child); if (open) return open }
  return null
}
const form = node => (node.word ? [node.word] : node.children ? node.children.flatMap(form) : [node.label])

export function DeriveSentence() {
  const [root, setRoot] = useState(fresh)
  const [history, setHistory] = useState([])
  const open = leftmostOpen(root)
  const choose = expand => {
    const copy = structuredClone(root), target = leftmostOpen(copy)
    expand(target)
    setHistory(h => [...h, form(root).join(' ')])
    setRoot(copy)
  }
  const randomly = () => {
    let r = structuredClone(root), steps = 0
    const out = []
    for (let t = leftmostOpen(r); t && steps < 60; t = leftmostOpen(r), steps++) {
      out.push(form(r).join(' '))
      if (t.label in P.LEXICON) { const ws = P.LEXICON[t.label]; t.word = ws[Math.floor(Math.random() * ws.length)] }
      else { const rules = P.GRAMMAR[t.label]; t.children = rules[Math.floor(Math.random() * rules.length)].map(label => ({ label, children: null })) }
    }
    setHistory(h => [...h, ...out]); setRoot(r)
  }
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <button onClick={() => { setRoot(fresh()); setHistory([]) }}>↺ Start again from S</button>
      <button onClick={randomly} disabled={!open}>Finish it at random</button>
    </div>
    <p className="nlp-form" aria-label="The sentence so far">{form(root).map((s, i) => <span key={i} className={s in P.GRAMMAR || s in P.LEXICON ? 'sym' : 'w'}>{s}</span>)}</p>
    {open ? <div className="nlp-choices">
      <p className="qm-small">Expand the leftmost symbol, <b className="mono">{open.label}</b>:</p>
      {open.label in P.LEXICON
        ? P.LEXICON[open.label].map(w => <button key={w} onClick={() => choose(t => { t.word = w })}>{open.label} → {w}</button>)
        : P.GRAMMAR[open.label].map((rule, k) => <button key={k} onClick={() => choose(t => { t.children = rule.map(label => ({ label, children: null })) })}>{open.label} → {rule.join(' ')}</button>)}
    </div> : <p className="qm-result">A sentence: <b>{form(root).join(' ')}</b>, in {history.length} steps. Every symbol has been replaced by words.</p>}
    <div className="qm-fig-row">
      <ol className="nlp-derivation">{[...history, form(root).join(' ')].map((line, i) => <li key={i} className="mono">{i ? '⇒ ' : ''}{line}</li>)}</ol>
      <TreeView tree={toTree(root)} compact />
    </div>
  </div>
}

function sentenceProblems(words) {
  const known = new Set(Object.values(P.LEXICON).flat())
  return words.filter(w => !known.has(w))
}

export function ParseExplorer({ sentence: initial = 'i saw the man with the telescope' }) {
  const [sentence, setSentence] = useState(initial)
  const words = P.wordsOf(sentence)
  const { trees, calls } = useMemo(() => { const stats = { calls: 0 }; return { trees: P.parse(sentence, stats), calls: stats.calls } }, [sentence])
  const unknown = sentenceProblems(words)
  return <div className="qm-fig">
    <label className="nlp-input"><span>Sentence (lower case, words from the lexicon)</span><input value={sentence} onChange={e => setSentence(e.target.value)} spellCheck={false} /></label>
    <p className="qm-small"><code>parse()</code> found <b>{trees.length}</b> tree{trees.length === 1 ? '' : 's'} · <code>parse_symbol</code> was called <b>{calls}</b> times</p>
    {unknown.length > 0 && <p className="qm-feedback">Not in the lexicon: {unknown.map(w => <code key={w}>{w}</code>)}. The words it knows: {Object.entries(P.LEXICON).map(([k, ws]) => `${k}: ${ws.join(', ')}`).join(' · ')}.</p>}
    {!unknown.length && !trees.length && words.length > 0 && <p className="qm-feedback">Every word is known, but no way of applying the rules covers the whole sentence: the grammar has no rule for this order of words.</p>}
    <div className="nlp-trees">{trees.map((t, i) => <figure key={i}>
      <figcaption className="qm-small">Tree {i + 1} of {trees.length}</figcaption>
      <TreeView tree={t} />
      <code className="nlp-bracket">{P.bracket(t)}</code>
    </figure>)}</div>
  </div>
}

// All binary bracketings of n items: the Catalan numbers, listed.
function bracketings(items) {
  if (items.length === 1) return [items[0]]
  const out = []
  for (let k = 1; k < items.length; k++) for (const l of bracketings(items.slice(0, k))) for (const r of bracketings(items.slice(k))) out.push(`(${l} ${r})`)
  return out
}
export function Bracketings() {
  const [n, setN] = useState(4)
  const items = 'abcdef'.slice(0, n).split('')
  const all = bracketings(items)
  return <div className="qm-fig">
    <div className="qm-fig-controls">{[2, 3, 4, 5, 6].map(k => <button key={k} className={k === n ? 'active' : ''} onClick={() => setN(k)}>{k} items</button>)}</div>
    <p className="qm-small"><b>{all.length}</b> ways to group {items.join(' ')} two at a time = C<sub>{n - 1}</sub> = <code>catalan({n - 1})</code></p>
    <div className="nlp-chips qm-scroll" style={{ maxHeight: 220 }}>{all.map(b => <span key={b}>{b}</span>)}</div>
  </div>
}

function Cell({ cell }) {
  const entries = Object.entries(cell ?? {})
  return entries.length ? entries.map(([sym, n]) => <span key={sym} className={sym === 'S' ? 'top' : ''}>{sym}{n > 1 ? <sub>×{n}</sub> : null}</span>) : <span className="qm-dim">·</span>
}

export function ChartPlayer({ sentence: initial = 'i saw the man with the telescope' }) {
  const [sentence, setSentence] = useState(initial)
  const words = P.wordsOf(sentence)
  const { steps } = useMemo(() => P.ckyTrace(words), [sentence])  // eslint-disable-line react-hooks/exhaustive-deps
  const [k, setK] = useState(0)
  useEffect(() => setK(0), [sentence])
  const n = words.length
  const step = k > 0 ? steps[k - 1] : null
  const shown = {}
  for (const s of steps.slice(0, k)) shown[`${s.i},${s.j}`] = s.cell
  const nextCell = () => { let x = k; const key = steps[x] && `${steps[x].i},${steps[x].j}`; while (x < steps.length && `${steps[x].i},${steps[x].j}` === key) x++; setK(x) }
  const line = step?.phase === 'word' ? 'table[(i, i + 1)] = ' : step ? 'for parent, trees in combine(' : null
  const found = step?.phase === 'split' ? Object.entries(step.found) : []
  const top = shown[`0,${n}`]
  return <div className="qm-fig">
    <label className="nlp-input"><span>Sentence</span><input value={sentence} onChange={e => setSentence(e.target.value)} spellCheck={false} /></label>
    <div className="qm-fig-controls">
      <button onClick={() => setK(0)} disabled={!k}>⏮ Start</button>
      <button onClick={() => setK(x => Math.max(0, x - 1))} disabled={!k}>◀ Back</button>
      <button className="qm-primary" onClick={() => setK(x => Math.min(steps.length, x + 1))} disabled={k >= steps.length}>Next step ▶</button>
      <button onClick={nextCell} disabled={k >= steps.length}>Finish this cell ⏭</button>
      <button onClick={() => setK(steps.length)} disabled={k >= steps.length}>Fill it all</button>
      <span className="qm-hint">Step {k} of {steps.length}</span>
    </div>
    <div className="qm-fig-row">
      <div className="nlp-chart-wrap">
        <table className="nlp-chart" aria-label="The chart: row i is where a span starts, column j where it ends">
          <thead><tr><th></th>{words.map((w, j) => <th key={j}>j={j + 1}<br /><span className="mono">{w}</span></th>)}</tr></thead>
          <tbody>{words.map((w, i) => <tr key={i}><th>i={i}</th>{words.map((_, jj) => {
            const j = jj + 1
            if (j <= i) return <td key={j} className="off" />
            const key = `${i},${j}`
            const cls = step && step.i === i && step.j === j ? 'now' : step?.phase === 'split' && ((step.i === i && step.k === j) || (step.k === i && step.j === j)) ? 'part' : ''
            return <td key={j} className={cls} title={`words ${i}–${j - 1}: “${words.slice(i, j).join(' ')}”`}>{key in shown ? <Cell cell={shown[key]} /> : null}</td>
          })}</tr>)}</tbody>
        </table>
        {k >= steps.length && n > 0 && <p className="qm-result">The top cell, (0, {n}), {top?.S ? <>holds <b>S×{top.S}</b>: the whole sentence parses, in {top.S} different way{top.S > 1 ? 's' : ''}.</> : <>has no S: the grammar can’t make this sentence.</>}</p>}
      </div>
      <div className="qm-fig-side">
        <CodePane file="parsing.py" fn="cky" line={line} />
        <p className="nlp-explain">{!step ? 'Each cell (i, j) will hold every symbol that can cover the words from i up to j, with how many trees it has. Press “Next step”: first each word gets its own cell, then longer and longer spans.'
          : step.phase === 'word' ? `Word ${step.i}, “${words[step.i]}”: the lexicon says ${Object.keys(step.cell).length ? Object.keys(step.cell).join(', ') : 'nothing (an unknown word)'}. Cell (${step.i}, ${step.j}).`
            : <>Cell ({step.i}, {step.j}), “{words.slice(step.i, step.j).join(' ')}”, split at k = {step.k}: left “{words.slice(step.i, step.k).join(' ')}” (cell {step.i},{step.k}), right “{words.slice(step.k, step.j).join(' ')}” (cell {step.k},{step.j}). {found.length ? <>A rule fits: {found.map(([p, t]) => `${p} ×${t}`).join(', ')}{found.some(([, t]) => t > 1) ? ' (trees multiply: left count × right count)' : ''}.</> : 'No rule takes these two halves.'}</>}</p>
      </div>
    </div>
  </div>
}

export function DependencyArcs({ sentence = 'i saw the man with the telescope' }) {
  const trees = useMemo(() => P.parse(sentence), [sentence])
  const [which, setWhich] = useState(0)
  const words = P.wordsOf(sentence)
  const [heads, setHeads] = useState(() => (trees[0] ? P.dependencies(trees[0]) : words.map(() => 0)))
  const check = P.treeCheck(heads), crossings = P.crossingArcs(heads)
  const X = i => 40 + i * 92, BASE = 150
  const arcs = heads.map((h, i) => [h, i + 1]).filter(([h]) => h !== 0)
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      {trees.map((t, i) => <button key={i} className={i === which ? 'active' : ''} onClick={() => { setWhich(i); setHeads(P.dependencies(t)) }}>From tree {i + 1}</button>)}
      <span className="qm-hint">Then change any word’s head below.</span>
    </div>
    <svg className="nlp-arcs" viewBox={`0 0 ${X(words.length - 1) + 50} ${BASE + 26}`} role="img" aria-label="Dependency arcs">
      <defs><marker id="nlp-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" /></marker></defs>
      {arcs.map(([h, d]) => { const x1 = X(h - 1), x2 = X(d - 1), height = 18 + Math.abs(d - h) * 16; return <path key={d} d={`M ${x1} ${BASE - 16} C ${x1} ${BASE - 16 - height}, ${x2} ${BASE - 16 - height}, ${x2} ${BASE - 18}`} markerEnd="url(#nlp-arrow)" /> })}
      {heads.map((h, i) => h === 0 && <g key={`r${i}`}><line x1={X(i)} y1={8} x2={X(i)} y2={BASE - 18} markerEnd="url(#nlp-arrow)" className="root" /><text x={X(i) + 6} y={16} className="rootlabel">root</text></g>)}
      {words.map((w, i) => <text key={i} x={X(i)} y={BASE} className="word">{w}</text>)}
      {words.map((_, i) => <text key={`n${i}`} x={X(i)} y={BASE + 18} className="num">{i + 1}</text>)}
    </svg>
    <div className="nlp-heads">{words.map((w, i) => <label key={i}>{w} <select value={heads[i]} onChange={e => setHeads(hs => hs.map((x, k) => (k === i ? Number(e.target.value) : x)))}>
      <option value={0}>root (0)</option>{words.map((v, k) => k !== i && <option key={k} value={k + 1}>{v} ({k + 1})</option>)}</select></label>)}</div>
    <p className="qm-small mono">heads = [{heads.join(', ')}]</p>
    <p className={check.ok ? 'qm-result' : 'qm-feedback'}><b>is_tree: {check.ok ? 'True' : 'False'}</b>, because {check.reason}. Crossing arcs: <b>{crossings}</b>{crossings ? ' (a non-projective tree: it can’t come from a phrase tree)' : ''}.</p>
  </div>
}

const STARTERS = ['I need a holiday', "I'm worried about you", 'My mother calls me every day', 'my dog bit me', 'Are you a real person?']

export function ChatBot() {
  const [log, setLog] = useState([{ who: 'bot', text: 'Hello. What is on your mind?' }])
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState(null)
  const turn = log.filter(m => m.who === 'you').length
  const send = text => {
    if (!text.trim()) return
    const trace = respondTrace(text, turn)
    setLog(l => [...l, { who: 'you', text }, { who: 'bot', text: trace.reply, trace }])
    setOpen(log.length + 1); setDraft('')
  }
  return <div className="qm-fig nlp-chat">
    <div className="nlp-chat-log" aria-live="polite">{log.map((m, i) => <div key={i} className={`nlp-msg ${m.who}`}>
      <p>{m.text}</p>
      {m.trace && <button className="qm-quiet" onClick={() => setOpen(open === i ? null : i)}>{open === i ? 'Hide' : 'How was this reply made?'}</button>}
      {m.trace && open === i && <ol className="nlp-how">
        <li>Your message, lower-cased, trailing . and ! removed: <code>{JSON.stringify(m.trace.text)}</code></li>
        <li>Rules tried, in order: {m.trace.tried.map((p, k) => <code key={k} className={k === m.trace.rule ? 'hit' : 'miss'}>{k === m.trace.rule ? '✓ ' : '✗ '}{p}</code>)}</li>
        {m.trace.groups.length > 0 && <li>The part in brackets <code>(.*)</code> captured <code>{JSON.stringify(m.trace.groups[0])}</code>; reflected word by word: {m.trace.groups[0].split(/\s+/).filter(Boolean).map((w, k) => <code key={k}>{w}{REFLECTIONS[w] ? ` → ${REFLECTIONS[w]}` : ''}</code>)}</li>}
        <li>{m.trace.template ? <>The rule’s replies take turns (<code>replies[turn % len(replies)]</code>); this time: <code>{m.trace.template}</code></> : 'No rule matched'} → <b>{m.trace.reply}</b></li>
      </ol>}
    </div>)}</div>
    <form onSubmit={e => { e.preventDefault(); send(draft) }} className="nlp-chat-form">
      <input aria-label="Your message" value={draft} onChange={e => setDraft(e.target.value)} placeholder="Type to the bot…" />
      <button className="qm-primary">Send</button>
    </form>
    <div className="qm-fig-controls">{STARTERS.map(s => <button key={s} className="qm-quiet" onClick={() => send(s)}>“{s}”</button>)}</div>
  </div>
}
