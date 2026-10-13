// Part 3 figures: vectors you drag, linear combinations, length by Pythagoras, the dot product as a
// shadow, a matrix times a vector row by row, a matrix transforming the grid, matrix products,
// two lines crossing, least squares with its squared misses, and eigen-directions.
import { useState } from 'react'
import { add, scale, norm, dot, cosine, matvec, matmul, transpose, det2, inverse2, solve2, leastSquares, eigen2, eigenvector2 } from '../engine/maths.js'
import { Graph, Slider, Working, C, fmt } from './ui.jsx'

const snap = v => Math.round(v * 2) / 2
const vec = v => `(${v.map(x => fmt(x, 2)).join(', ')})`

export function VectorFig({ mode = 'one' }) {
  const [u, setU] = useState([3, 2]), [w, setW] = useState([-1, 2]), [a, setA] = useState(1), [b, setB] = useState(1)
  const combo = add(scale(a, u), scale(b, w))
  if (mode === 'one') return <div className="qm-fig">
    <Graph x={[-5, 5]} y={[-5, 5]} equal onDrag={(i, x, y) => setU([snap(x), snap(y)])} arrows={[{ x1: 0, y1: 0, x2: u[0], y2: u[1], label: 'x' }]} points={[{ x: u[0], y: u[1], drag: true, color: C.violet }]} />
    <Working rows={[['as a list', 'x = (x₁, x₂)', vec(u)], ['as a point', `${fmt(u[0])} across, ${fmt(u[1])} up`, ''], ['in Python', 'x = [x1, x2]', `[${u.join(', ')}]`]]} />
  </div>
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="a" value={a} min={-2} max={2} step={0.25} onChange={setA} /><Slider label="b" value={b} min={-2} max={2} step={0.25} onChange={setB} /></div>
    <Graph x={[-6, 6]} y={[-6, 6]} equal onDrag={(i, x, y) => (i === 0 ? setU : setW)([snap(x), snap(y)])}
      arrows={[{ x1: 0, y1: 0, x2: u[0], y2: u[1], label: 'u', color: C.teal }, { x1: 0, y1: 0, x2: w[0], y2: w[1], label: 'v', color: C.orange }, { x1: 0, y1: 0, x2: a * u[0], y2: a * u[1], color: '#7fb3ad', width: 1.6 }, { x1: a * u[0], y1: a * u[1], x2: combo[0], y2: combo[1], color: '#e3a35e', width: 1.6 }, { x1: 0, y1: 0, x2: combo[0], y2: combo[1], label: 'au + bv', color: C.violet }]}
      points={[{ x: u[0], y: u[1], drag: true, color: C.teal }, { x: w[0], y: w[1], drag: true, color: C.orange }]} />
    <Working rows={[['a u', `${fmt(a)} × ${vec(u)}`, vec(scale(a, u))], ['b v', `${fmt(b)} × ${vec(w)}`, vec(scale(b, w))], ['a u + b v', 'tip to tail', vec(combo)]]} />
  </div>
}

export function NormFig() {
  const [u, setU] = useState([3, 4])
  return <div className="qm-fig">
    <Graph x={[-6, 6]} y={[-6, 6]} equal onDrag={(i, x, y) => setU([snap(x), snap(y)])} segments={[{ x1: 0, y1: 0, x2: u[0], y2: 0, color: C.orange }, { x1: u[0], y1: 0, x2: u[0], y2: u[1], color: C.orange }]} arrows={[{ x1: 0, y1: 0, x2: u[0], y2: u[1], label: `‖x‖ = ${fmt(norm(u), 3)}` }]} points={[{ x: u[0], y: u[1], drag: true, color: C.violet }]} />
    <Working rows={[['sum of squares', `${fmt(u[0])}² + ${fmt(u[1])}²`, fmt(u[0] ** 2 + u[1] ** 2)], ['‖x‖', '√ of that', fmt(norm(u), 4)], ['‖x‖₁', `|${fmt(u[0])}| + |${fmt(u[1])}|`, fmt(Math.abs(u[0]) + Math.abs(u[1]))]]} />
  </div>
}

export function DotFig() {
  const [u, setU] = useState([4, 1]), [w, setW] = useState([2, 3])
  const d = dot(u, w), proj = scale(d / dot(u, u), u)
  return <div className="qm-fig">
    <Graph x={[-6, 6]} y={[-6, 6]} equal onDrag={(i, x, y) => (i === 0 ? setU : setW)([snap(x), snap(y)])} segments={[{ x1: w[0], y1: w[1], x2: proj[0], y2: proj[1], dash: true, color: C.grey }, { x1: 0, y1: 0, x2: proj[0], y2: proj[1], color: C.gold, width: 5 }]}
      arrows={[{ x1: 0, y1: 0, x2: u[0], y2: u[1], label: 'u', color: C.teal }, { x1: 0, y1: 0, x2: w[0], y2: w[1], label: 'v', color: C.orange }]} points={[{ x: u[0], y: u[1], drag: true, color: C.teal }, { x: w[0], y: w[1], drag: true, color: C.orange }]} />
    <Working rows={[['Σ uᵢvᵢ', `${fmt(u[0])}×${fmt(w[0])} + ${fmt(u[1])}×${fmt(w[1])}`, fmt(d, 3)], ['‖u‖ ‖v‖ cos θ', `${fmt(norm(u), 3)} × ${fmt(norm(w), 3)} × ${fmt(cosine(u, w), 3)}`, fmt(norm(u) * norm(w) * cosine(u, w), 3)], ['cosine similarity', 'cos θ', fmt(cosine(u, w), 3)], ['angle θ', '', `${fmt(Math.acos(Math.max(-1, Math.min(1, cosine(u, w)))) * 180 / Math.PI, 1)}°`]]} />
    <p className="qm-hint">Gold: the shadow of v on u's line. Its length times ‖u‖ is the dot product (negative when the shadow points backwards).</p>
  </div>
}

export function MatVecFig() {
  const [M, setM] = useState([[2, 1], [1, 3]]), [x, setX] = useState([3, 4]), [row, setRow] = useState(0)
  const out = matvec(M, x)
  const cell = (val, set) => <input className="mm-cell" type="number" step="0.5" value={val} onChange={e => set(Number(e.target.value) || 0)} />
  return <div className="qm-fig">
    <div className="mm-matrix-row">
      <table className="mm-matrix"><tbody>{M.map((r, i) => <tr key={i} className={i === row ? 'mm-pick' : ''} onClick={() => setRow(i)}>{r.map((v, j) => <td key={j}>{cell(v, nv => setM(m => m.map((rr, a) => a === i ? rr.map((q, b) => b === j ? nv : q) : rr)))}</td>)}</tr>)}</tbody></table>
      <span>×</span>
      <table className="mm-matrix"><tbody>{x.map((v, j) => <tr key={j}><td>{cell(v, nv => setX(q => q.map((qq, b) => b === j ? nv : qq)))}</td></tr>)}</tbody></table>
      <span>=</span>
      <table className="mm-matrix"><tbody>{out.map((v, i) => <tr key={i} className={i === row ? 'mm-pick' : ''} onClick={() => setRow(i)}><td>{fmt(v, 3)}</td></tr>)}</tbody></table>
    </div>
    <Working rows={[[`row ${row + 1} · x`, M[row].map((v, j) => `${fmt(v)}×${fmt(x[j])}`).join(' + '), fmt(out[row], 3)]]} />
    <p className="qm-hint">Click a row. As a layer: row i holds neuron i's weights, and output i is its weighted sum.</p>
  </div>
}

const PRESETS = { stretch: [[2, 0], [0, 1]], rotate: [[0, -1], [1, 0]], shear: [[1, 1], [0, 1]], flip: [[1, 0], [0, -1]], ours: [[2, 1], [1, 3]], collapse: [[1, 2], [0.5, 1]] }
export function TransformFig({ showInverse = false }) {
  const [M, setM] = useState(showInverse ? PRESETS.ours : PRESETS.shear)
  const T = p => matvec(M, p), d = det2(M)
  const lines = []
  for (let k = -3; k <= 3; k++) { lines.push([[k, -3], [k, 3]]); lines.push([[-3, k], [3, k]]) }
  const square = [[0, 0], [1, 0], [1, 1], [0, 1]].map(T)
  const set = (i, j) => v => setM(m => m.map((r, a) => a === i ? r.map((q, b) => b === j ? v : q) : r))
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Preset <select onChange={e => { if (PRESETS[e.target.value]) setM(PRESETS[e.target.value]) }} defaultValue=""><option value="" disabled>choose…</option>{Object.keys(PRESETS).map(k => <option key={k} value={k}>{k}</option>)}</select></label>
      {[[0, 0], [0, 1], [1, 0], [1, 1]].map(([i, j]) => <Slider key={`${i}${j}`} label={`A${i + 1}${j + 1}`} value={M[i][j]} min={-3} max={3} step={0.25} onChange={set(i, j)} />)}</div>
    <Graph x={[-6, 6]} y={[-6, 6]} equal segments={lines.map(([p, q]) => { const a = T(p), b = T(q); return { x1: a[0], y1: a[1], x2: b[0], y2: b[1], color: '#c6d7d4', width: 1 } })}
      arrows={[{ x1: 0, y1: 0, x2: M[0][0], y2: M[1][0], label: 'column 1', color: C.teal }, { x1: 0, y1: 0, x2: M[0][1], y2: M[1][1], label: 'column 2', color: C.orange }]}>
      {({ X, Y }) => <polygon points={square.map(p => `${X(p[0])},${Y(p[1])}`).join(' ')} fill={C.violet} opacity="0.25" />}
    </Graph>
    <Working rows={[['A', `[[${M[0].map(v => fmt(v)).join(', ')}], [${M[1].map(v => fmt(v)).join(', ')}]]`, ''], ['det A (area of the violet square)', `${fmt(M[0][0])}×${fmt(M[1][1])} − ${fmt(M[0][1])}×${fmt(M[1][0])}`, fmt(d, 3)], ...(showInverse ? [['A⁻¹', Math.abs(d) < 1e-9 ? 'none: the plane collapsed' : JSON.stringify(inverse2(M).map(r => r.map(v => Number(v.toFixed(3))))), '']] : [])]} />
  </div>
}

export function MatMulFig() {
  const A = [[1, 2], [3, 4]], B = [[0, 1], [1, 0]]
  const [order, setOrder] = useState('AB'), [pick, setPick] = useState([0, 0])
  const [L, R] = order === 'AB' ? [A, B] : [B, A], P = matmul(L, R), [i, j] = pick
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Product <select value={order} onChange={e => setOrder(e.target.value)}><option value="AB">A B</option><option value="BA">B A</option></select></label></div>
    <div className="mm-matrix-row">
      <table className="mm-matrix"><tbody>{L.map((r, a) => <tr key={a} className={a === i ? 'mm-pick' : ''}>{r.map((v, b) => <td key={b}>{v}</td>)}</tr>)}</tbody></table><span>×</span>
      <table className="mm-matrix"><tbody>{R.map((r, a) => <tr key={a}>{r.map((v, b) => <td key={b} className={b === j ? 'mm-pick' : ''}>{v}</td>)}</tr>)}</tbody></table><span>=</span>
      <table className="mm-matrix"><tbody>{P.map((r, a) => <tr key={a}>{r.map((v, b) => <td key={b} className={a === i && b === j ? 'mm-pick' : ''}><button className="qm-link" onClick={() => setPick([a, b])}>{fmt(v)}</button></td>)}</tr>)}</tbody></table>
    </div>
    <Working rows={[[`(${order})${i + 1}${j + 1}`, `row ${i + 1} · column ${j + 1} = ${L[i].map((v, k) => `${v}×${R[k][j]}`).join(' + ')}`, fmt(P[i][j])]]} />
  </div>
}

export function SystemFig() {
  const [M, setM] = useState([[2, 1], [1, 3]]), [b, setB] = useState([3, 5])
  const d = det2(M), sol = Math.abs(d) > 1e-9 ? solve2(M, b) : null
  const line = (r, c) => Math.abs(r[1]) > 1e-9 ? { f: x => (c - r[0] * x) / r[1] } : null
  return <div className="qm-fig">
    <div className="qm-fig-controls">{[0, 1].map(i => <span key={i} className="mm-eq">{[0, 1].map(j => <Slider key={j} label={`A${i + 1}${j + 1}`} value={M[i][j]} min={-3} max={4} step={0.5} onChange={v => setM(m => m.map((r, a) => a === i ? r.map((q, c) => c === j ? v : q) : r))} />)}<Slider label={`b${i + 1}`} value={b[i]} min={-5} max={8} step={0.5} onChange={v => setB(q => q.map((x, a) => a === i ? v : x))} /></span>)}</div>
    <Graph x={[-4, 6]} y={[-4, 6]} equal fns={[line(M[0], b[0]), line(M[1], b[1])].filter(Boolean).map((g, k) => ({ ...g, color: k ? C.orange : C.teal }))} points={sol ? [{ x: sol[0], y: sol[1], color: C.violet, label: `x = ${vec(sol)}` }] : []} xlabel="x₁" ylabel="x₂" />
    <p>{sol ? <>The lines cross at <b>{vec(sol)}</b>: x = A⁻¹b.</> : 'det A = 0: the lines are parallel, so there is no single crossing.'}</p>
  </div>
}

export function LeastSquaresFig({ showGradient = false }) {
  const [pts, setPts] = useState([[0, 1], [1, 3], [2, 4], [4, 4.5], [5, 7]].slice(0, showGradient ? 3 : 5))
  const [wTry, setW] = useState(1), [cTry, setC] = useState(1)
  const [w, c] = leastSquares(pts.map(p => p[0]), pts.map(p => p[1]))
  const lw = showGradient ? wTry : w, lc = showGradient ? cTry : c
  const misses = pts.map(([x, y]) => lw * x + lc - y), sse = misses.reduce((s, r) => s + r * r, 0)
  const X = pts.map(([x]) => [x, 1]), grad = scale(2, matvec(transpose(X), misses))
  return <div className="qm-fig">
    {showGradient && <div className="qm-fig-controls"><Slider label="w" value={wTry} min={-1} max={4} step={0.1} onChange={setW} /><Slider label="c" value={cTry} min={-2} max={4} step={0.1} onChange={setC} /></div>}
    <Graph x={[-1, 7]} y={[-1, 9]} equal onDrag={(i, x, y) => setPts(p => p.map((q, k) => k === i ? [snap(x), snap(y)] : q))} fns={[{ f: t => lw * t + lc, label: showGradient ? 'your line' : 'least-squares line' }, ...(showGradient ? [{ f: t => w * t + c, dash: true, color: C.grey }] : [])]}
      rects={pts.map(([x, y], k) => ({ x, y, w: Math.abs(misses[k]), h: misses[k], color: C.orange, opacity: 0.18 }))} segments={pts.map(([x, y], k) => ({ x1: x, y1: y, x2: x, y2: y + misses[k], color: C.red }))} points={pts.map(([x, y]) => ({ x, y, drag: true }))} />
    <Working rows={[['line', 'y = w x + c', `w = ${fmt(lw, 3)}, c = ${fmt(lc, 3)}`], ['total squared miss', '‖Xθ − y‖²', fmt(sse, 4)], ...(showGradient ? [['gradient', '2Xᵀ(Xθ − y)', vec(grad)], ['least squares (dashed)', 'gradient = 0 there', `w = ${fmt(w, 3)}, c = ${fmt(c, 3)}`]] : [])]} />
  </div>
}

export function EigenFig() {
  const [M] = useState([[2, 1], [1, 3]]), [ang, setAng] = useState(20)
  const t = ang * Math.PI / 180, v = [Math.cos(t), Math.sin(t)], Av = matvec(M, v)
  const [l1, l2] = eigen2(M), e1 = eigenvector2(M, l1), e2 = eigenvector2(M, l2)
  const aligned = Math.abs(cosine(v, Av)) > 0.999
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="direction of v (degrees)" value={ang} min={0} max={180} step={1} onChange={setAng} /></div>
    <Graph x={[-4, 4]} y={[-4, 4]} equal fns={[{ f: x => x * e1[1] / e1[0], color: '#d9cfe9', dash: true }, { f: x => x * e2[1] / e2[0], color: '#d9cfe9', dash: true }]}
      arrows={[{ x1: 0, y1: 0, x2: v[0], y2: v[1], label: 'v', color: C.teal }, { x1: 0, y1: 0, x2: Av[0], y2: Av[1], label: 'Av', color: C.violet }]} />
    <Working rows={[['angle between v and Av', '', `${fmt(Math.acos(Math.min(1, cosine(v, Av))) * 180 / Math.PI, 1)}°`], ['eigenvalues', 'det(A − λI) = 0', `${fmt(l1, 3)} and ${fmt(l2, 3)}`], ['eigen-directions (dashed)', '', `${fmt(Math.atan2(e1[1], e1[0]) * 180 / Math.PI, 1)}° and ${fmt((Math.atan2(e2[1], e2[0]) * 180 / Math.PI + 180) % 180, 1)}°`]]} />
    <p>{aligned ? <b>v is (very nearly) an eigenvector: Av lies on the same line, stretched by {fmt(norm(Av), 3)}.</b> : 'Rotate v until Av lines up with it.'}</p>
  </div>
}
