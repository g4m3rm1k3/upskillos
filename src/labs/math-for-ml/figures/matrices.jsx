// Figures for the linear-algebra additions: spans, elimination step by step, rank, determinants as
// signed area, projections, rotations and reflections, the spectral ellipse, quadratic forms, the
// SVD's three steps, trace identities, low-rank pictures, matrix gradients and broadcasting.
import { useMemo, useState } from 'react'
import { coordinates, rowReduce, rank, determinant, project, symmetricEigen, matvec, svd, lowRank, trace, frobenius, matmul, transpose, eigen2 } from '../engine/maths.js'
import { Graph, Slider, Bars, Working, C, fmt } from './ui.jsx'

const polar = (deg, len = 1) => [len * Math.cos(deg * Math.PI / 180), len * Math.sin(deg * Math.PI / 180)]
const circle = (map, n = 96) => Array.from({ length: n + 1 }, (_, i) => map([Math.cos(2 * Math.PI * i / n), Math.sin(2 * Math.PI * i / n)]))
const polyline = (pts, color, dash) => pts.slice(1).map((p, i) => ({ x1: pts[i][0], y1: pts[i][1], x2: p[0], y2: p[1], color, dash }))
const MatrixView = ({ M, pick, digits = 2 }) => <table className="mm-matrix"><tbody>{M.map((row, i) => <tr key={i}>{row.map((v, j) => <td key={j} className={pick?.(i, j) ? 'mm-pick' : ''}>{fmt(Math.abs(v) < 1e-12 ? 0 : v, digits)}</td>)}</tr>)}</tbody></table>

export function SpanFig() {
  const [a1, setA1] = useState(20), [a2, setA2] = useState(80), [l2, setL2] = useState(1.5)
  const b1 = polar(a1, 1.6), b2 = polar(a2, l2), target = [2.5, 2]
  const parallel = Math.abs(b1[0] * b2[1] - b1[1] * b2[0]) < 1e-6
  const lines = []
  if (!parallel) for (let k = -6; k <= 6; k++) { lines.push({ x1: k * b1[0] - 8 * b2[0], y1: k * b1[1] - 8 * b2[1], x2: k * b1[0] + 8 * b2[0], y2: k * b1[1] + 8 * b2[1], color: '#d9cfbd' }); lines.push({ x1: k * b2[0] - 8 * b1[0], y1: k * b2[1] - 8 * b1[1], x2: k * b2[0] + 8 * b1[0], y2: k * b2[1] + 8 * b1[1], color: '#d9cfbd' }) }
  else lines.push({ x1: -8 * b1[0], y1: -8 * b1[1], x2: 8 * b1[0], y2: 8 * b1[1], color: C.orange })
  const c = parallel ? null : coordinates([b1, b2], target)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="angle of b₁" value={a1} min={0} max={180} step={5} onChange={setA1} show={v => `${v}°`} /><Slider label="angle of b₂" value={a2} min={0} max={180} step={5} onChange={setA2} show={v => `${v}°`} /><Slider label="length of b₂" value={l2} min={0.5} max={2.5} step={0.1} onChange={setL2} /></div>
    <Graph x={[-4, 4]} y={[-3, 4]} equal height={280} grid={false} segments={lines} arrows={[{ x1: 0, y1: 0, x2: b1[0], y2: b1[1], color: C.teal, label: 'b₁' }, { x1: 0, y1: 0, x2: b2[0], y2: b2[1], color: C.violet, label: 'b₂' }]} points={[{ x: target[0], y: target[1], color: C.orange, label: 'v' }]} />
    <Working rows={parallel ? [['span', 'b₂ is a multiple of b₁', 'a line: dependent'], ['v = c₁b₁ + c₂b₂', 'no solution unless v is on the line', '—']] : [['span', 'b₁, b₂ not on one line', 'the whole plane: a basis'], ['coordinates of v', 'solve [b₁ b₂] c = v', `(${fmt(c[0], 3)}, ${fmt(c[1], 3)})`]]} />
  </div>
}

const SYSTEM = [[2, 1, -1, 8], [-3, -1, 2, -11], [-2, 1, 2, -3]]
function eliminationSteps(M0) {
  const steps = [{ M: M0.map(r => [...r]), text: 'The augmented matrix [A | b].', pivot: null }]
  let M = M0.map(r => [...r])
  for (let c = 0; c < 3; c++) {
    let best = c; for (let i = c + 1; i < 3; i++) if (Math.abs(M[i][c]) > Math.abs(M[best][c])) best = i
    if (best !== c) { M = M.map(r => [...r]); [M[c], M[best]] = [M[best], M[c]]; steps.push({ M, text: `Swap rows ${c + 1} and ${best + 1}: the largest entry in column ${c + 1} becomes the pivot.`, pivot: [c, c] }) }
    for (let i = c + 1; i < 3; i++) { const k = M[i][c] / M[c][c]; if (Math.abs(k) < 1e-15) continue; M = M.map(r => [...r]); M[i] = M[i].map((a, j) => a - k * M[c][j]); steps.push({ M, text: `Row ${i + 1} − (${fmt(k, 3)}) × row ${c + 1}: zero below the pivot.`, pivot: [c, c] }) }
  }
  const x = [0, 0, 0]
  for (let i = 2; i >= 0; i--) { let rest = 0; for (let j = i + 1; j < 3; j++) rest += M[i][j] * x[j]; x[i] = (M[i][3] - rest) / M[i][i] }
  steps.push({ M, text: `Back-substitution, bottom row first: x = (${x.map(v => fmt(v, 3)).join(', ')}).`, pivot: null })
  return steps
}
export function EliminationFig() {
  const steps = useMemo(() => eliminationSteps(SYSTEM), []), [k, setK] = useState(0), s = steps[k]
  return <div className="qm-fig">
    <div className="qm-buttons"><button disabled={k === 0} onClick={() => setK(k - 1)}>←</button><button disabled={k === steps.length - 1} onClick={() => setK(k + 1)}>Next step →</button><button onClick={() => setK(0)}>Restart</button></div>
    <div className="mm-matrix-row"><MatrixView M={s.M} pick={(i, j) => s.pivot && i === s.pivot[0] && j === s.pivot[1]} digits={3} /></div>
    <p className="qm-hint">Step {k + 1} of {steps.length}: {s.text}</p>
  </div>
}

const RANKS = { full: ['independent rows', [[2, 1, 0], [1, 3, 1], [0, 1, 2]]], sum: ['row 3 = row 1 + row 2', [[1, 0, 2], [0, 1, 1], [1, 1, 3]]], counting: ['1 to 9', [[1, 2, 3], [4, 5, 6], [7, 8, 9]]], one: ['every row a multiple of one', [[1, 2, 3], [2, 4, 6], [-1, -2, -3]]] }
export function RankFig() {
  const [which, setWhich] = useState('counting'), [, A] = RANKS[which], [E, pivots] = rowReduce(A), r = rank(A)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Matrix <select value={which} onChange={e => setWhich(e.target.value)}>{Object.entries(RANKS).map(([k, [n]]) => <option key={k} value={k}>{n}</option>)}</select></label></div>
    <div className="mm-matrix-row"><MatrixView M={A} /><span>→ eliminate →</span><MatrixView M={E} pick={(i, j) => pivots[i] === j} /></div>
    <Working rows={[['rank', 'number of pivots (highlighted)', String(r)], ['rank of the transpose', 'the same, as promised', String(rank(transpose(A)))], ['null space dimension', `3 − ${r}`, String(3 - r)], ['invertible?', r === 3 ? 'full rank' : 'some input is squashed to 0', r === 3 ? 'yes' : 'no']]} />
  </div>
}

export function DeterminantFig() {
  const [M, setM] = useState([[2, 0.5], [0.5, 1.5]])
  const c1 = [M[0][0], M[1][0]], c2 = [M[0][1], M[1][1]], d = determinant(M)
  const shape = [[0, 0], c1, [c1[0] + c2[0], c1[1] + c2[1]], c2, [0, 0]]
  const act = (label, f) => <button onClick={() => setM(f(M))}>{label}</button>
  return <div className="qm-fig">
    <div className="qm-buttons">{act('Shear: c₂ += ½ c₁', m => [[m[0][0], m[0][1] + 0.5 * m[0][0]], [m[1][0], m[1][1] + 0.5 * m[1][0]]])}{act('Scale c₁ × 2', m => [[2 * m[0][0], m[0][1]], [2 * m[1][0], m[1][1]]])}{act('Swap columns', m => [[m[0][1], m[0][0]], [m[1][1], m[1][0]]])}{act('Reset', () => [[2, 0.5], [0.5, 1.5]])}</div>
    <Graph x={[-3, 6]} y={[-2, 5]} equal height={260} segments={polyline(shape, d >= 0 ? C.teal : C.orange)} arrows={[{ x1: 0, y1: 0, x2: c1[0], y2: c1[1], color: C.teal, label: 'c₁' }, { x1: 0, y1: 0, x2: c2[0], y2: c2[1], color: C.violet, label: 'c₂' }]} />
    <div className="mm-matrix-row"><MatrixView M={M} /></div>
    <Working rows={[['det A', `${fmt(M[0][0])}×${fmt(M[1][1])} − ${fmt(M[0][1])}×${fmt(M[1][0])}`, fmt(d, 4)], ['orientation', d >= 0 ? 'c₂ is anticlockwise from c₁' : 'flipped: c₂ is clockwise from c₁', d >= 0 ? '+' : '−']]} />
  </div>
}

export function ProjectionFig() {
  const [va, setVa] = useState(60), [vl, setVl] = useState(2.5), [ua, setUa] = useState(15)
  const v = polar(va, vl), u = polar(ua, 1.2), p = project(v, u), r = [v[0] - p[0], v[1] - p[1]]
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="angle of v" value={va} min={0} max={180} step={5} onChange={setVa} show={x => `${x}°`} /><Slider label="length of v" value={vl} min={0.5} max={3} step={0.1} onChange={setVl} /><Slider label="angle of u" value={ua} min={-30} max={90} step={5} onChange={setUa} show={x => `${x}°`} /></div>
    <Graph x={[-3, 3.5]} y={[-1.5, 3.2]} equal height={260} segments={[{ x1: -5 * u[0], y1: -5 * u[1], x2: 5 * u[0], y2: 5 * u[1], color: '#d9cfbd' }, { x1: p[0], y1: p[1], x2: v[0], y2: v[1], color: C.orange, dash: true }]}
      arrows={[{ x1: 0, y1: 0, x2: v[0], y2: v[1], color: C.violet, label: 'v' }, { x1: 0, y1: 0, x2: u[0], y2: u[1], color: C.grey, label: 'u' }, { x1: 0, y1: 0, x2: p[0], y2: p[1], color: C.teal, label: 'shadow' }]} />
    <Working rows={[['k = v·u / u·u', `${fmt(v[0] * u[0] + v[1] * u[1], 3)} / ${fmt(u[0] ** 2 + u[1] ** 2, 3)}`, fmt((v[0] * u[0] + v[1] * u[1]) / (u[0] ** 2 + u[1] ** 2), 3)], ['leftover · u', 'perpendicular', fmt(r[0] * u[0] + r[1] * u[1], 6)],
      ['Pythagoras', `${fmt(p[0] ** 2 + p[1] ** 2, 3)} + ${fmt(r[0] ** 2 + r[1] ** 2, 3)}`, `${fmt(v[0] ** 2 + v[1] ** 2, 3)} = ‖v‖²`]]} />
  </div>
}

const LETTER_F = [[0, 0], [0, 2], [1.2, 2], [1.2, 1.6], [0.4, 1.6], [0.4, 1.2], [1, 1.2], [1, 0.8], [0.4, 0.8], [0.4, 0], [0, 0]]
export function OrthogonalFig() {
  const [kind, setKind] = useState('rotation'), [angle, setAngle] = useState(40)
  const t = angle * Math.PI / 180
  const Q = kind === 'rotation' ? [[Math.cos(t), -Math.sin(t)], [Math.sin(t), Math.cos(t)]] : (() => { const u = [Math.cos(t), Math.sin(t)]; return [[1 - 2 * u[0] * u[0], -2 * u[0] * u[1]], [-2 * u[0] * u[1], 1 - 2 * u[1] * u[1]]] })()
  const moved = LETTER_F.map(p => matvec(Q, p))
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Matrix <select value={kind} onChange={e => setKind(e.target.value)}><option value="rotation">rotation by θ</option><option value="reflection">reflection, mirror normal at θ</option></select></label><Slider label="θ" value={angle} min={0} max={180} step={5} onChange={setAngle} show={x => `${x}°`} /></div>
    <Graph x={[-3, 3]} y={[-2.5, 2.5]} equal height={260} segments={[...polyline(LETTER_F, C.grey), ...polyline(moved, kind === 'rotation' ? C.teal : C.orange), ...(kind === 'reflection' ? [{ x1: -3 * Math.sin(t), y1: 3 * Math.cos(t), x2: 3 * Math.sin(t), y2: -3 * Math.cos(t), color: '#d9cfbd', dash: true }] : [])]} />
    <Working rows={[['Q', `[[${fmt(Q[0][0], 3)}, ${fmt(Q[0][1], 3)}], [${fmt(Q[1][0], 3)}, ${fmt(Q[1][1], 3)}]]`, ''], ['QᵀQ', 'the identity', JSON.stringify(matmul(transpose(Q), Q).map(r => r.map(v => Number(v.toFixed(6)))))], ['det Q', kind === 'rotation' ? 'a rotation' : 'a reflection', fmt(determinant(Q), 4)], ['length of the top edge', 'before → after', `${fmt(1.2, 3)} → ${fmt(Math.hypot(moved[2][0] - moved[1][0], moved[2][1] - moved[1][1]), 3)}`]]} />
  </div>
}

export function SpectralFig() {
  const [a, setA] = useState(2), [b, setB] = useState(0.8), [c, setC] = useState(1), [sym, setSym] = useState(true)
  const S = [[a, b], [sym ? b : -b, c]]
  const ellipse = circle(p => matvec(S, p))
  const [vals, vecs] = sym ? symmetricEigen(S) : [[], []]
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="a" value={a} min={-2} max={3} step={0.1} onChange={setA} /><Slider label="b" value={b} min={-2} max={2} step={0.1} onChange={setB} /><Slider label="c" value={c} min={-2} max={3} step={0.1} onChange={setC} /><label><input type="checkbox" checked={sym} onChange={e => setSym(e.target.checked)} /> symmetric</label></div>
    <Graph x={[-3.5, 3.5]} y={[-3.5, 3.5]} equal height={280} segments={[...polyline(circle(p => p), '#d9cfbd'), ...polyline(ellipse, C.teal)]} arrows={vecs.map((v, i) => ({ x1: 0, y1: 0, x2: vals[i] * v[0], y2: vals[i] * v[1], color: i ? C.violet : C.orange, label: `λ${i + 1}q${i + 1}` }))} />
    <Working rows={sym ? [['eigenvalues', 'from Jacobi rotations', vals.map(v => fmt(v, 3)).join(', ')], ['q₁ · q₂', 'perpendicular', fmt(vecs[0][0] * vecs[1][0] + vecs[0][1] * vecs[1][1], 6)]] : [['not symmetric', `S = [[${fmt(a)}, ${fmt(b)}], [${fmt(-b)}, ${fmt(c)}]]`, 'its eigenvectors need not be perpendicular, or even exist']]} />
  </div>
}

export function QuadraticFormFig() {
  const [a, setA] = useState(2), [b, setB] = useState(1), [c, setC] = useState(1)
  const q = t => { const v = [Math.cos(t), Math.sin(t)]; return a * v[0] * v[0] + 2 * b * v[0] * v[1] + c * v[1] * v[1] }
  const [big, small] = eigen2([[a, b], [b, c]])
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="a" value={a} min={-2} max={3} step={0.1} onChange={setA} /><Slider label="b" value={b} min={-2} max={2} step={0.1} onChange={setB} /><Slider label="c" value={c} min={-2} max={3} step={0.1} onChange={setC} /></div>
    <Graph x={[0, Math.PI]} y={[Math.min(-1, small - 0.5), Math.max(1, big + 0.5)]} height={230} fns={[{ f: q, label: 'vᵀSv' }, { f: () => big, dash: true, color: C.orange, label: 'λ₁' }, { f: () => small, dash: true, color: C.violet, label: 'λ₂', labelAt: 0.3 }]} xlabel="angle of the unit vector v (radians)" />
    <Working rows={[['S', `[[${fmt(a)}, ${fmt(b)}], [${fmt(b)}, ${fmt(c)}]]`, ''], ['eigenvalues', 'the highest and lowest values of the curve', `${fmt(big, 3)}, ${fmt(small, 3)}`], ['positive definite?', small > 0 ? 'every direction positive' : 'some direction ≤ 0', small > 0 ? 'yes' : 'no']]} />
  </div>
}

export function SVDFig() {
  const [m, setM] = useState([[3, 0], [4, 5]]), [stage, setStage] = useState(3)
  const [us, sig, vs] = svd(m)
  const V = transpose(vs.length === 2 ? vs : [vs[0], [-vs[0][1], vs[0][0]]]), Ut = us.length === 2 ? us : [us[0], [-us[0][1], us[0][0]]]
  const s2 = sig[1] ?? 0
  const stepMap = p => { let q = matvec(transpose(V), p); if (stage >= 2) q = [sig[0] * q[0], s2 * q[1]]; if (stage >= 3) q = matvec(transpose(Ut), q); return q }
  const R = 1.2 * Math.max(sig[0], 1.5)
  const set = (i, j) => v => setM(M => M.map((r, a) => r.map((x, b) => (a === i && b === j ? v : x))))
  return <div className="qm-fig">
    <div className="qm-fig-controls">{[[0, 0], [0, 1], [1, 0], [1, 1]].map(([i, j]) => <Slider key={`${i}${j}`} label={`a${i + 1}${j + 1}`} value={m[i][j]} min={-5} max={5} step={0.5} onChange={set(i, j)} />)}</div>
    <div className="qm-buttons">{['1: rotate by Vᵀ', '2: stretch by Σ', '3: rotate by U'].map((t, i) => <button key={t} className={stage === i + 1 ? 'qm-primary' : ''} onClick={() => setStage(i + 1)}>{t}</button>)}</div>
    <Graph x={[-R, R]} y={[-R, R]} equal height={280} segments={[...polyline(circle(p => p), '#d9cfbd'), ...polyline(circle(stepMap), C.teal)]}
      arrows={stage === 3 ? us.map((u, i) => ({ x1: 0, y1: 0, x2: sig[i] * u[0], y2: sig[i] * u[1], color: i ? C.violet : C.orange, label: `σ${i + 1}u${i + 1}` })) : []} />
    <Working rows={[['singular values', '√ eigenvalues of AᵀA', sig.map(s => fmt(s, 4)).join(', ')], ['σ₁ σ₂', '= |det A|', `${fmt(sig[0] * s2, 4)} = ${fmt(Math.abs(determinant(m)), 4)}`]]} />
  </div>
}

const seeded = seed => () => { seed = (seed * 16807) % 2147483647; return (seed / 2147483647) * 4 - 2 }
export function TraceFig() {
  const [seed, setSeed] = useState(7)
  const rnd = seeded(seed), A = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => Math.round(rnd() * 10) / 10)), B = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => Math.round(rnd() * 10) / 10)), x = [1, -1, 2]
  const xxT = x.map(a => x.map(b => a * b)), quad = x.reduce((s, xi, i) => s + xi * matvec(A, x)[i], 0)
  return <div className="qm-fig">
    <div className="qm-buttons"><button onClick={() => setSeed(s => s + 1)}>Re-roll A and B</button></div>
    <div className="mm-matrix-row">A = <MatrixView M={A} digits={1} /> B = <MatrixView M={B} digits={1} /></div>
    <Working rows={[['tr(AB)', 'Σᵢ Σₖ AᵢₖBₖᵢ', fmt(trace(matmul(A, B)), 4)], ['tr(BA)', 'the same products, reordered', fmt(trace(matmul(B, A)), 4)], ['AB = BA?', '', JSON.stringify(matmul(A, B)) === JSON.stringify(matmul(B, A)) ? 'yes' : 'no'],
      ['xᵀAx, x = (1, −1, 2)', 'a number', fmt(quad, 4)], ['tr(A x xᵀ)', 'the trace trick', fmt(trace(matmul(A, xxT)), 4)], ['‖A‖²_F', 'sum of squared entries', fmt(frobenius(A) ** 2, 4)], ['Σ σᵢ²', 'sum of squared singular values', fmt(svd(A)[1].reduce((s, v) => s + v * v, 0), 4)]]} />
  </div>
}

const PICTURE = Array.from({ length: 32 }, (_, i) => Array.from({ length: 32 }, (_, j) => {
  const x = (j - 15.5) / 16, y = (i - 15.5) / 16, r = Math.hypot(x, y)
  const face = r < 0.9 ? 0.85 : 0.1, eye = Math.hypot(Math.abs(x) - 0.35, y + 0.3) < 0.13 ? -0.7 : 0, mouth = Math.abs(Math.hypot(x, y + 0.05) - 0.5) < 0.07 && y > 0.15 ? -0.7 : 0
  return face + eye + mouth + 0.05 * Math.sin(5 * x + 3 * y)
}))
export function LowRankFig() {
  const [k, setK] = useState(3)
  const full = useMemo(() => svd(PICTURE), [])
  const approx = useMemo(() => lowRank(PICTURE, k), [k])
  const err = Math.sqrt(full[1].slice(k).reduce((s, v) => s + v * v, 0)), size = 6
  const draw = M => <svg viewBox={`0 0 ${32 * size} ${32 * size}`} width={32 * size} height={32 * size} role="img" aria-label="a 32 by 32 picture">{M.flatMap((row, i) => row.map((v, j) => <rect key={`${i}-${j}`} x={j * size} y={i * size} width={size} height={size} fill={`rgb(${Array(3).fill(Math.round(255 * Math.max(0, Math.min(1, v)))).join(',')})`} />))}</svg>
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="rank k" value={k} min={1} max={16} step={1} onChange={setK} show={v => String(v)} /></div>
    <div className="mm-matrix-row">{draw(PICTURE)}<span>→</span>{draw(approx)}</div>
    <Bars rows={full[1].slice(0, 12).map((s, i) => ({ label: `σ${i + 1}`, value: s, color: i < k ? C.teal : C.grey }))} digits={2} />
    <Working rows={[['kept', `${k} of ${full[1].length} singular values`, `${k * (32 + 32 + 1)} of ${32 * 32} numbers`], ['error ‖A − Aₖ‖_F', '√(Σ dropped σ²)', fmt(err, 4)]]} />
  </div>
}

export function MatrixGradientFig() {
  const [a1, setA1] = useState(1), [a2, setA2] = useState(2), [b1, setB1] = useState(3), [b2, setB2] = useState(-1), [cell, setCell] = useState([0, 1])
  const a = [a1, a2], b = [b1, b2], W = [[0.5, -1], [2, 1]], f = M => a.reduce((s, ai, i) => s + ai * b.reduce((t, bj, j) => t + M[i][j] * bj, 0), 0)
  const h = 0.01, nudged = W.map((r, i) => r.map((v, j) => (i === cell[0] && j === cell[1] ? v + h : v)))
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="a₁" value={a1} min={-3} max={3} step={0.5} onChange={setA1} /><Slider label="a₂" value={a2} min={-3} max={3} step={0.5} onChange={setA2} /><Slider label="b₁" value={b1} min={-3} max={3} step={0.5} onChange={setB1} /><Slider label="b₂" value={b2} min={-3} max={3} step={0.5} onChange={setB2} /></div>
    <div className="mm-matrix-row">∇_W = a bᵀ = <table className="mm-matrix"><tbody>{a.map((ai, i) => <tr key={i}>{b.map((bj, j) => <td key={j} className={cell[0] === i && cell[1] === j ? 'mm-pick' : ''}><button className="qm-link" onClick={() => setCell([i, j])}>{fmt(ai * bj)}</button></td>)}</tr>)}</tbody></table></div>
    <Working rows={[[`nudge W${cell[0] + 1}${cell[1] + 1} by ${h}`, `f changes by ${fmt(f(nudged) - f(W), 5)}`, `÷ ${h} = ${fmt((f(nudged) - f(W)) / h, 4)}`], ['the gradient entry', `a${cell[0] + 1} b${cell[1] + 1}`, fmt(a[cell[0]] * b[cell[1]], 4)]]} />
  </div>
}

const SHAPES = { btd: [8, 128, 64], d: [64], t1: [128, 1], t: [128], bt1: [8, 128, 1], one: [1], img: [32, 3, 224, 224], c11: [3, 1, 1] }
const broadcast = (s, t) => { const n = Math.max(s.length, t.length), out = [], cols = []; for (let i = 0; i < n; i++) { const a = s[s.length - n + i] ?? null, b = t[t.length - n + i] ?? null; const ok = a === null || b === null || a === b || a === 1 || b === 1; cols.push([a, b, ok]); out.push(ok ? Math.max(a ?? 1, b ?? 1) : null) } return [out, cols] }
export function TensorFig() {
  const [x, setX] = useState('btd'), [y, setY] = useState('d')
  const [out, cols] = broadcast(SHAPES[x], SHAPES[y]), ok = cols.every(c => c[2])
  const pick = (v, set) => <select value={v} onChange={e => set(e.target.value)}>{Object.entries(SHAPES).map(([k, s]) => <option key={k} value={k}>({s.join(', ')})</option>)}</select>
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>First {pick(x, setX)}</label><label>Second {pick(y, setY)}</label></div>
    <table className="mm-dice mm-truth"><tbody>
      <tr><th>first</th>{cols.map(([a], i) => <td key={i}>{a ?? '·'}</td>)}</tr>
      <tr><th>second</th>{cols.map(([, b], i) => <td key={i}>{b ?? '·'}</td>)}</tr>
      <tr><th>result</th>{cols.map(([, , good], i) => <td key={i} className={good ? '' : 'mm-false'}>{good ? out[i] : '✗'}</td>)}</tr>
    </tbody></table>
    <Working rows={[['lined up from the right', ok ? 'every column matches or has a 1' : 'a column clashes', ok ? `(${out.join(', ')})` : 'error']]} />
  </div>
}
