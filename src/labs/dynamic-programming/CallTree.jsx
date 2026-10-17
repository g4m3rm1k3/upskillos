import React, { useEffect, useMemo, useState } from 'react'
import { TREES, MAX_NODES, buildTree, countCalls, layout } from './trees.js'
import './trace.css'

// "Break it down": the recursion behind a recurrence, drawn as the tree of calls it makes.
// Play it call by call (the active path is the call stack), see the same question asked again and
// again (repeats share a colour), predict how many calls there will be, then switch on the memo and
// watch the tree collapse. The order in which states first return is the order a table fills them.

const SPEEDS = [['Slow', 900], ['Normal', 450], ['Fast', 150]]
const HUES = ['#f59e0b', '#38bdf8', '#f472b6', '#a3e635', '#c084fc', '#fb923c', '#2dd4bf', '#facc15', '#60a5fa', '#f87171']
const NW = 56, NH = 30, GX = 62, GY = 64

export default function CallTree({ id }) {
  const spec = TREES[id]
  const [input, setInput] = useState(() => Object.fromEntries(spec.params.map(p => [p.key, p.value])))
  const [memo, setMemo] = useState(false)
  const [k, setK] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [focus, setFocus] = useState(null)
  const [guess, setGuess] = useState('')
  const [verdict, setVerdict] = useState(null)
  const [shown, setShown] = useState(false)

  const plain = useMemo(() => buildTree(spec, input), [spec, input])
  const memoTree = useMemo(() => buildTree(spec, input, { memo: true }), [spec, input])
  const totalCalls = useMemo(() => (plain.tooBig ? countCalls(spec, input) : plain.nodes.length), [spec, input, plain])
  const tree = memo ? memoTree : plain
  const drawable = !tree.tooBig
  const { x, width } = useMemo(() => layout(tree.nodes), [tree])
  const N = tree.events.length

  // How often each state is asked in the plain recursion: the repeats are what a memo saves.
  const asked = useMemo(() => {
    const m = new Map()
    if (!plain.tooBig) plain.nodes.forEach(n => m.set(n.label, (m.get(n.label) ?? 0) + 1))
    return m
  }, [plain])
  const hueOf = useMemo(() => {
    const m = new Map(); let i = 0
    for (const n of memoTree.nodes) if ((asked.get(n.label) ?? 0) > 1 && !m.has(n.label)) m.set(n.label, HUES[i++ % HUES.length])
    return m
  }, [memoTree, asked])
  // States in the order they first return: the bottom-up order.
  const returnOrder = useMemo(() => {
    const seen = new Set(), out = []
    for (const e of memoTree.events) if (e.type === 'return') { const n = memoTree.nodes[e.node]; if (!seen.has(n.label)) { seen.add(n.label); out.push(n) } }
    return out
  }, [memoTree])

  useEffect(() => { setK(0); setPlaying(false); setFocus(null) }, [input, memo])
  useEffect(() => { setShown(false) }, [input])
  useEffect(() => {
    if (!playing) return
    if (k >= N) { setPlaying(false); return }
    const t = setTimeout(() => setK(v => Math.min(N, v + 1)), SPEEDS[speed][1])
    return () => clearTimeout(t)
  }, [playing, k, N, speed])

  // Replay state after k events: which nodes have been called, which have returned, the current stack.
  const called = new Set(), returned = new Set(), stack = []
  tree.events.slice(0, k).forEach(e => {
    if (e.type === 'call') { called.add(e.node); stack.push(e.node) } else { returned.add(e.node); stack.pop() }
  })
  const onStack = new Set(stack)
  // The counts (and the outline of the whole tree) would give the prediction away, so they appear
  // once it is answered, the tree has been played to the end, the memo is on, or the learner asks.
  const revealed = shown || memo || verdict?.good || k >= N
  const last = k > 0 ? tree.events[k - 1] : null
  const current = last ? tree.nodes[last.node] : null
  const go = n => { setPlaying(false); setK(Math.max(0, Math.min(N, n))) }

  const repeatsAsked = [...asked.entries()].filter(([, c]) => c > 1)
  const distinct = memoTree.nodes.filter(n => !n.cached).length
  const check = e => {
    e.preventDefault()
    const g = Number(guess)
    if (!Number.isFinite(g)) { setVerdict({ good: false, text: 'Type a whole number.' }); return }
    if (g === totalCalls) setVerdict({ good: true, text: `Yes: ${totalCalls} calls, for only ${distinct} different questions.` })
    else if (g === distinct) setVerdict({ good: false, text: `${g} is how many different questions there are. The plain recursion asks some of them more than once. Count every call.` })
    else setVerdict({ good: false, text: `Not ${g}. ${g < totalCalls ? 'More than that: every call makes its own calls, even when the question was asked before.' : 'Fewer than that. Count the root too, and remember base cases make no further calls.'} Press play and count, or try a smaller input first.` })
  }

  const W = Math.max(1, width) * GX, H = (Math.max(0, ...tree.nodes.map(n => n.depth)) + 1) * GY
  const px = id => x[id] * GX + GX / 2, py = id => tree.nodes[id].depth * GY + NH / 2 + 6

  return <section className="dp-ct" aria-label="Recursion tree">
    <div className="dp-section-heading">
      <div><p className="dp-eyebrow">BREAK IT DOWN · THE TREE OF SMALLER QUESTIONS</p><h3>What does {spec.label(spec.root(input))} ask?</h3></div>
    </div>
    <p className="dp-tt-setup">{spec.question} {spec.fixed}</p>

    <div className="dp-ct-params">
      {spec.params.map(p => <label key={p.key}>{p.label} = <strong>{input[p.key]}</strong>
        <input type="range" min={p.min} max={p.max} value={input[p.key]} onChange={e => { setInput(v => ({ ...v, [p.key]: Number(e.target.value) })); setVerdict(null); setGuess('') }} />
      </label>)}
      <label className="dp-tt-toggle"><input type="checkbox" checked={memo} onChange={e => setMemo(e.target.checked)} /> Memo: remember answers</label>
    </div>

    {!memo && <form className="dp-tt-ask" onSubmit={check}>
      <label>Predict first: how many calls does the plain recursion make for {spec.label(spec.root(input))}?
        <input value={guess} onChange={e => setGuess(e.target.value)} inputMode="numeric" placeholder="calls" aria-label="Predicted number of calls" />
      </label>
      <button type="submit" className="dp-primary">Check</button>
    </form>}
    {verdict && !memo && <p className={`dp-tt-feedback ${verdict.good ? 'is-good' : 'is-bad'}`} role="status">{verdict.text}</p>}

    {drawable ? <>
      <div className="dp-ct-scroll">
        <svg className="dp-ct-svg" width={W} height={H} role="img" aria-label={`Call tree with ${tree.nodes.length} calls`}>
          {tree.nodes.map(n => n.parent !== null && called.has(n.id) && <line key={`e${n.id}`} className={`dp-ct-edge${onStack.has(n.id) ? ' is-stack' : ''}`} x1={px(n.parent)} y1={py(n.parent) + NH / 2} x2={px(n.id)} y2={py(n.id) - NH / 2} />)}
          {tree.nodes.map(n => {
            if (!called.has(n.id)) return revealed && <rect key={n.id} className="dp-ct-ghost" x={px(n.id) - NW / 2} y={py(n.id) - NH / 2} width={NW} height={NH} rx="8" />
            const hue = hueOf.get(n.label), isFocus = focus === n.label
            const cls = ['dp-ct-node', returned.has(n.id) ? 'is-done' : '', onStack.has(n.id) ? 'is-stack' : '', current?.id === n.id ? 'is-current' : '', n.cached ? 'is-cached' : '', isFocus ? 'is-focus' : ''].join(' ')
            return <g key={n.id} className={cls} style={hue ? { '--hue': hue } : undefined} onClick={() => setFocus(f => (f === n.label ? null : n.label))}>
              <title>{`${n.label}${returned.has(n.id) ? ` = ${n.value}` : ''}${n.cached ? ' (from the memo)' : ''}`}</title>
              <rect x={px(n.id) - NW / 2} y={py(n.id) - NH / 2} width={NW} height={NH} rx="8" />
              <text x={px(n.id)} y={py(n.id) + 4} textAnchor="middle">{n.label}</text>
              {returned.has(n.id) && <text className="dp-ct-value" x={px(n.id)} y={py(n.id) + NH / 2 + 13} textAnchor="middle">{n.cached ? '⟲ ' : '= '}{n.value}</text>}
            </g>
          })}
        </svg>
      </div>
      <div className="dp-tt-controls" role="group" aria-label="Playback">
        <button type="button" onClick={() => go(0)} disabled={k === 0} aria-label="Back to the start">⏮</button>
        <button type="button" onClick={() => go(k - 1)} disabled={k === 0} aria-label="Previous event">◀</button>
        <button type="button" className="dp-tt-play" onClick={() => { if (k >= N) setK(0); setPlaying(p => !p) }}>{playing ? '❚❚ Pause' : k >= N ? '↻ Replay' : '▶ Play'}</button>
        <button type="button" onClick={() => go(k + 1)} disabled={k === N} aria-label="Next event">▶</button>
        <button type="button" onClick={() => go(N)} disabled={k === N} aria-label="Show the whole tree">⏭</button>
        <input type="range" min={0} max={N} value={k} onChange={e => go(Number(e.target.value))} aria-label="Scrub through the calls" />
        <select value={speed} onChange={e => setSpeed(Number(e.target.value))} aria-label="Speed">{SPEEDS.map(([label], i) => <option key={label} value={i}>{label}</option>)}</select>
      </div>
      <div className="dp-tt-explain" aria-live="polite">
        {!last && <p>Press ▶ to make the first call. Each box is one call; the highlighted path is the call stack, the calls still waiting for answers.</p>}
        {last?.type === 'call' && !current.cached && <p><strong>Call {current.label}.</strong> {tree.nodes[current.id].children.length ? `It can’t answer yet: it asks ${tree.nodes[current.id].children.map(c => tree.nodes[c].label).join(' and ')} first.` : 'A base case: it answers straight away.'} Stack depth {stack.length}.</p>}
        {last?.type === 'call' && current.cached && <p><strong>Call {current.label}: already answered.</strong> The memo hands back {current.value} without asking anything.</p>}
        {last?.type === 'return' && <p><strong>{current.label} returns {current.value}</strong>{current.cached ? ' from the memo.' : current.parent !== null ? ` to ${tree.nodes[current.parent].label}.` : ': the answer.'}</p>}
      </div>
    </> : <p className="dp-tt-feedback is-bad" role="status">{memo ? 'Even with the memo this is too big to draw.' : `The plain recursion makes ${totalCalls.toLocaleString()} calls here, too many to draw (the limit is ${MAX_NODES}). Switch on the memo, or make the input smaller.`}</p>}

    {!revealed && <p className="dp-muted">The call counts appear once you have predicted, played the tree to the end, or switched on the memo. <button type="button" className="dp-link-btn" onClick={() => setShown(true)}>Show them now</button></p>}
    {revealed && <div className="dp-ct-stats">
      <div><strong>{totalCalls.toLocaleString()}</strong><span>calls without memo</span></div>
      <div><strong>{memoTree.nodes.length}</strong><span>calls with memo</span></div>
      <div><strong>{distinct}</strong><span>different questions</span></div>
    </div>}

    {revealed && repeatsAsked.length > 0 && <div className="dp-ct-repeats">
      <p className="dp-muted">Asked more than once (click one to light up every copy in the plain tree):</p>
      <div>{repeatsAsked.map(([label, c]) => <button key={label} type="button" className={focus === label ? 'is-active' : ''} style={{ '--hue': hueOf.get(label) }} onClick={() => { setMemo(false); setFocus(f => (f === label ? null : label)) }}>{label} ×{c}</button>)}</div>
    </div>}

    <div className="dp-ct-order">
      <p className="dp-muted"><strong>From tree to table.</strong> These are the different questions in the order they first return an answer. Small questions come back first, so this is an order in which a table can be filled, with each cell after the cells it needs:</p>
      <ol>{returnOrder.map(n => <li key={n.label} style={hueOf.get(n.label) ? { '--hue': hueOf.get(n.label) } : undefined}><span>{n.label}</span><strong>{n.value}</strong></li>)}</ol>
    </div>
  </section>
}
