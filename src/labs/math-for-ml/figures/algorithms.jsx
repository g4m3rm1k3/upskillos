// Figures for the algorithms part: growth curves, loop volumes, recursion trees, binary search,
// floating-point spacing, stable formulas, a weak generator's pattern, an autodiff graph, the
// edit-distance table, walks and PageRank, and hash buckets.
import { useMemo, useState } from 'react'
import { matmulCost, attentionCost, binarySearch, naiveLogsumexp, logsumexp, onePassVariance, variancePop, PyRandom, editDistance, walks, pagerank, polyHash } from '../engine/maths.js'
import { Graph, Slider, Bars, Working, C, fmt } from './ui.jsx'

const RATES = [['log₂ n', n => Math.log2(n), C.violet], ['n', n => n, C.teal], ['n log₂ n', n => n * Math.log2(n), C.blue], ['n²', n => n * n, C.orange], ['2ⁿ', n => 2 ** n, C.red]]
export function GrowthFig() {
  const [n, setN] = useState(16), [log, setLog] = useState(false)
  const y = v => (log ? Math.log10(Math.max(v, 1e-9)) : v), top = log ? Math.log10(2 ** n) + 0.5 : n * n * 1.1
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="n" value={n} min={4} max={40} step={1} onChange={setN} show={v => String(v)} /><label><input type="checkbox" checked={log} onChange={e => setLog(e.target.checked)} /> log scale (powers of 10)</label></div>
    <Graph x={[1, n]} y={[log ? -0.5 : 0, top]} height={240} fns={RATES.map(([label, g, color]) => ({ f: t => y(g(t)), color, label, labelAt: n * 0.9 }))} xlabel="n" />
    <Working rows={RATES.map(([label, g]) => [label, `at n = ${n}`, g(n) < 1e7 ? fmt(g(n), 1) : g(n).toExponential(2)])} />
  </div>
}

export function LoopCostFig() {
  const [n, setN] = useState(3), [m, setM] = useState(4), [p, setP] = useState(2), cell = 54
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="n (rows)" value={n} min={1} max={6} step={1} onChange={setN} show={v => String(v)} /><Slider label="m (shared)" value={m} min={1} max={8} step={1} onChange={setM} show={v => String(v)} /><Slider label="p (columns)" value={p} min={1} max={6} step={1} onChange={setP} show={v => String(v)} /></div>
    <svg viewBox={`0 0 ${p * cell + 10} ${n * cell + 10}`} className="mm-graph" style={{ maxWidth: Math.min(420, p * cell + 10) }} role="img" aria-label={`${n} by ${p} result entries, ${m} multiply-adds each`}>
      {Array.from({ length: n * p }, (_, t) => { const i = Math.floor(t / p), j = t % p; return <g key={t}><rect x={5 + j * cell} y={5 + i * cell} width={cell - 4} height={cell - 4} rx={4} fill="#1f6f6814" stroke={C.teal} />
        {Array.from({ length: m }, (_, k) => <rect key={k} x={9 + j * cell + (k % 4) * 11} y={9 + i * cell + Math.floor(k / 4) * 11} width={8} height={8} fill={C.teal} opacity={0.7} />)}</g> })}
    </svg>
    <p className="qm-hint">One box per entry of the {n} × {p} result; each holds the {m} multiply-adds of its dot product.</p>
    <Graph x={[0, 64]} y={[0, 70]} height={170} fns={[{ f: T => 2 * T * T * 8 / 1000, color: C.orange, label: 'attention, d = 8', labelAt: 30 }]} xlabel="tokens T" ylabel="thousands of multiply-adds" />
    <Working rows={[['multiply-adds', `${n} × ${m} × ${p}`, String(matmulCost(n, m, p))], ['attention at T = 64', '2 T² d', String(attentionCost(64, 8))]]} />
  </div>
}

const CASES = { merge: ['merge sort: 2T(n/2) + n', 2, 2, 1], top: ['T(n) = T(n/2) + n (top-heavy)', 1, 2, 1], bottom: ['T(n) = 4T(n/2) + n (bottom-heavy)', 4, 2, 1] }
export function RecursionTreeFig() {
  const [which, setWhich] = useState('merge'), [, a, b, c] = CASES[which], n = 32, levels = Math.round(Math.log(n) / Math.log(b)) + 1
  const level = k => a ** k * (n / b ** k) ** c
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Recurrence <select value={which} onChange={e => setWhich(e.target.value)}>{Object.entries(CASES).map(([k, [nm]]) => <option key={k} value={k}>{nm}</option>)}</select></label></div>
    <div className="mm-tree">{Array.from({ length: levels }, (_, k) => <div key={k} className="mm-tree-row">{Array.from({ length: Math.min(a ** k, 64) }, (_, i) => <span key={i} className="mm-tree-box" style={{ flex: 1 }}>{a ** k <= 16 ? fmt(n / b ** k) : ''}</span>)}{a ** k > 64 ? <span className="qm-hint"> ({a ** k} boxes)</span> : null}</div>)}</div>
    <Bars rows={Array.from({ length: levels }, (_, k) => ({ label: `level ${k}`, value: level(k), color: C.teal }))} digits={0} />
    <Working rows={[['total work', 'sum of the levels', fmt(Array.from({ length: levels }, (_, k) => level(k)).reduce((s, v) => s + v, 0), 0)], ['ratio a / bᶜ', `${a} / ${b}^${c}`, fmt(a / b ** c, 3)]]} />
  </div>
}

export function BinarySearchFig() {
  const xs = useMemo(() => Array.from({ length: 64 }, (_, i) => i * 3 + (i % 5)), []), [target, setTarget] = useState(xs[41]), [k, setK] = useState(0)
  const ranges = []
  { let lo = 0, hi = xs.length - 1; while (lo <= hi) { const mid = Math.floor((lo + hi) / 2); ranges.push([lo, hi, mid]); if (xs[mid] === target) break; if (xs[mid] < target) lo = mid + 1; else hi = mid - 1 } }
  const [lo, hi, mid] = ranges[Math.min(k, ranges.length - 1)]
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Target <select value={target} onChange={e => { setTarget(Number(e.target.value)); setK(0) }}>{xs.filter((_, i) => i % 4 === 1).map(v => <option key={v} value={v}>{v}</option>)}</select></label>
      <div className="qm-buttons"><button disabled={k >= ranges.length - 1} onClick={() => setK(k + 1)}>Halve →</button><button onClick={() => setK(0)}>Restart</button></div></div>
    <div className="mm-chips">{xs.map((v, i) => <span key={i} className={`mm-chip${i >= lo && i <= hi ? ' mm-chosen' : ''}`} style={i === mid ? { outline: `2px solid ${C.orange}` } : undefined}>{v}</span>)}</div>
    <Working rows={[['step', `${Math.min(k, ranges.length - 1) + 1} of ${binarySearch(xs, target)[1]}`, `live range ${hi - lo + 1} items`], ['bound', '⌊log₂ 64⌋ + 1', '7']]} />
  </div>
}

export function FloatLineFig() {
  const [bits, setBits] = useState(3)
  const values = []
  for (let e = -2; e <= 3; e++) for (let k = 0; k < 2 ** bits; k++) values.push((1 + k / 2 ** bits) * 2 ** e)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="mantissa bits" value={bits} min={1} max={5} step={1} onChange={setBits} show={v => String(v)} /></div>
    <Graph x={[0, 16]} y={[-0.5, 1]} height={120} yaxis={false} grid={false} points={values.map(v => ({ x: v, y: 0, r: 2.5, color: C.teal }))} segments={[1, 2, 4, 8].map(v => ({ x1: v, y1: -0.4, x2: v, y2: 0.8, color: C.grey, dash: true }))} xlabel="every number this toy format can hold" />
    <Working rows={[['between 1 and 2', `2^${bits} numbers, spaced`, fmt(2 ** -bits, 4)], ['between 8 and 16', 'the same count, spaced', fmt(8 * 2 ** -bits, 4)], ['float64', '52 mantissa bits', `spacing near 1: ${(2 ** -52).toExponential(2)}`]]} />
  </div>
}

export function StabilityFig() {
  const [shift, setShift] = useState(10), [offset, setOffset] = useState(4)
  const zs = [shift, shift + 1, shift - 2], data = [1, 2, 3].map(v => 10 ** offset + v)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="scores around" value={shift} min={0} max={1000} step={10} onChange={setShift} show={v => String(v)} /><Slider label="data near 10^k, k" value={offset} min={0} max={12} step={1} onChange={setOffset} show={v => String(v)} /></div>
    <Working rows={[['log Σ eᶻ naive', `z = ${zs.join(', ')}`, String(naiveLogsumexp(zs))], ['log Σ eᶻ stable', 'm + log Σ e^(z − m)', fmt(logsumexp(zs), 6)],
      ['variance, one pass', `of 10^${offset} + 1, 2, 3`, fmt(onePassVariance(data), 6)], ['variance, two pass', 'subtract the mean first', fmt(variancePop(data), 6)], ['true variance', '', fmt(2 / 3, 6)]]} />
  </div>
}

export function PRNGFig() {
  const [which, setWhich] = useState('small')
  const pts = useMemo(() => {
    if (which === 'small') { let x = 1; const out = []; for (let i = 0; i < 400; i++) { x = (65 * x + 1) % 2048; out.push(x / 2048) } return out }
    const r = new PyRandom(1); return Array.from({ length: 400 }, () => r.random())
  }, [which])
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Generator <select value={which} onChange={e => setWhich(e.target.value)}><option value="small">LCG: x ← (65x + 1) mod 2048</option><option value="mt">Mersenne Twister (Python)</option></select></label></div>
    <Graph x={[0, 1]} y={[0, 1]} equal height={260} points={pts.slice(1).map((v, i) => ({ x: pts[i], y: v, r: 1.8, color: C.teal }))} xlabel="uₖ" ylabel="uₖ₊₁" />
    <Working rows={[['mean of the 400 numbers', 'should be near 0.5', fmt(pts.reduce((s, v) => s + v, 0) / pts.length, 4)], ['pattern in pairs', which === 'small' ? 'points fall on a few lines' : 'no visible structure', '']]} />
  </div>
}

export function AutodiffFig() {
  const [mode, setMode] = useState('backward'), [step, setStep] = useState(0), x = 2
  const nodes = [['x', 2, 120, 200, x, 4 + Math.exp(x)], ['x²', 1, 30, 110, x * x, 1], ['eˣ', 1, 210, 110, Math.exp(x), 1], ['y = x² + eˣ', 0, 120, 20, x * x + Math.exp(x), 1]]
  const edges = [[0, 1, `2x = ${fmt(2 * x)}`, 40, 175], [0, 2, `eˣ = ${fmt(Math.exp(x), 3)}`, 230, 175], [1, 3, '1', 80, 80], [2, 3, '1', 230, 80]]
  const shown = mode === 'forward' ? [0, 1, 2, 3].slice(0, step + 1) : [3, 1, 2, 0].slice(0, step + 1)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Pass <select value={mode} onChange={e => { setMode(e.target.value); setStep(0) }}><option value="forward">forward: values</option><option value="backward">backward: gradients</option></select></label><div className="qm-buttons"><button disabled={step >= 3} onClick={() => setStep(step + 1)}>Next node →</button><button onClick={() => setStep(0)}>Restart</button></div></div>
    <svg viewBox="0 0 330 240" className="mm-graph" style={{ maxWidth: 460 }} role="img" aria-label="computation graph">
      {edges.map(([a, b, lab, lx, ly]) => <g key={`${a}${b}`}><line x1={nodes[a][2] + 40} y1={nodes[a][3]} x2={nodes[b][2] + 40} y2={nodes[b][3] + 26} stroke={C.grey} /><text x={lx} y={ly} fontSize="9" fill={C.violet}>{lab}</text></g>)}
      {nodes.map(([name, , cx, cy, val, grad], i) => <g key={name}><rect x={cx} y={cy} width={80} height={26} rx={5} fill={shown.includes(i) ? (mode === 'forward' ? '#1f6f6833' : '#c26a1233') : '#f4efe4'} stroke={C.grey} /><text x={cx + 40} y={cy + 11} fontSize="9" textAnchor="middle">{name}</text>
        <text x={cx + 40} y={cy + 22} fontSize="8" textAnchor="middle" fill={mode === 'forward' ? C.teal : C.orange}>{shown.includes(i) ? (mode === 'forward' ? `= ${fmt(val, 3)}` : `grad ${fmt(grad, 3)}`) : ''}</text></g>)}
    </svg>
    <Working rows={mode === 'backward' ? [['x\'s gradient', 'sum over its two paths: 2x · 1 + eˣ · 1', fmt(4 + Math.exp(2), 4)]] : [['y', 'computed bottom to top', fmt(4 + Math.exp(2), 4)]]} />
  </div>
}

export function EditDistanceFig() {
  const [a, setA] = useState('kitten'), [b, setB] = useState('sitting')
  const D = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)))
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  const path = new Set(); { let i = a.length, j = b.length; path.add(`${i},${j}`); while (i > 0 || j > 0) { const diag = i > 0 && j > 0 ? D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1) : Infinity; if (diag === D[i][j]) { i--; j-- } else if (i > 0 && D[i - 1][j] + 1 === D[i][j]) i--; else j--; path.add(`${i},${j}`) } }
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>a <input value={a} maxLength={10} onChange={e => setA(e.target.value)} /></label><label>b <input value={b} maxLength={10} onChange={e => setB(e.target.value)} /></label></div>
    <table className="mm-dice mm-truth"><thead><tr><th></th><th>·</th>{[...b].map((ch, j) => <th key={j}>{ch}</th>)}</tr></thead>
      <tbody>{D.map((row, i) => <tr key={i}><th>{i ? a[i - 1] : '·'}</th>{row.map((v, j) => <td key={j} className={path.has(`${i},${j}`) ? 'mm-pick' : ''}>{v}</td>)}</tr>)}</tbody></table>
    <Working rows={[['edit distance', `${a} → ${b}`, String(editDistance(a, b))]]} />
  </div>
}

const LINKS = [[0, 1, 1, 0], [1, 0, 0, 1], [1, 1, 0, 0], [0, 0, 1, 0]], POS = [[60, 30], [200, 40], [120, 150], [230, 160]]
export function GraphFig() {
  const [k, setK] = useState(2), Ak = walks(LINKS, k), pr = pagerank(LINKS)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="walk length k" value={k} min={1} max={6} step={1} onChange={setK} show={v => String(v)} /></div>
    <svg viewBox="0 0 280 200" className="mm-graph" style={{ maxWidth: 380 }} role="img" aria-label="a directed graph of four pages">
      <defs><marker id="mm-arrow-g" markerWidth="8" markerHeight="8" refX="14" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={C.grey} /></marker></defs>
      {LINKS.flatMap((row, i) => row.map((v, j) => (v ? <line key={`${i}${j}`} x1={POS[i][0]} y1={POS[i][1]} x2={POS[j][0]} y2={POS[j][1]} stroke={C.grey} markerEnd="url(#mm-arrow-g)" /> : null)))}
      {POS.map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r={8 + 40 * pr[i]} fill={C.teal} opacity={0.35} /><text x={x} y={y + 4} textAnchor="middle" fontSize="11">{i + 1}</text></g>)}
    </svg>
    <table className="mm-dice mm-truth"><thead><tr><th>A^{k}</th>{POS.map((_, j) => <th key={j}>→{j + 1}</th>)}</tr></thead><tbody>{Ak.map((row, i) => <tr key={i}><th>{i + 1}</th>{row.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody></table>
    <Bars rows={pr.map((v, i) => ({ label: `PageRank of page ${i + 1}`, value: v, color: C.teal }))} digits={4} max={1} />
  </div>
}

const WORDS = 'the cat sat on the mat while a dog ran past the old red barn and every bird in the tall green tree sang loud songs at dawn near our quiet small town by the river'.split(' ')
export function HashingFig() {
  const [m, setM] = useState(16), [n, setN] = useState(20)
  const counts = Array(m).fill(0); for (const w of WORDS.slice(0, n)) counts[polyHash(w, m)] += 1
  const distinct = [...new Set(WORDS.slice(0, n))], buckets = Array(m).fill(0); for (const w of distinct) buckets[polyHash(w, m)] += 1
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="buckets m" value={m} min={4} max={32} step={1} onChange={setM} show={v => String(v)} /><Slider label="words" value={n} min={1} max={WORDS.length} step={1} onChange={setN} show={v => String(v)} /></div>
    <Bars rows={buckets.map((c, i) => ({ label: `bucket ${i}: ${distinct.filter(w => polyHash(w, m) === i).join(', ')}`, value: c, color: c > 1 ? C.orange : C.teal }))} digits={0} />
    <Working rows={[['distinct words', `in ${m} buckets`, String(distinct.length)], ['average per bucket', 'n / m', fmt(distinct.length / m, 3)], ['buckets with a collision', '', String(buckets.filter(c => c > 1).length)]]} />
  </div>
}
