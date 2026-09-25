// Small figures placed between the paragraphs of Lessons 03.1–03.3. Each one shows exactly
// the computation its paragraph describes, on the same four builds, and states its result
// in text as well as in the picture.
import React, { useMemo, useState } from 'react'
import { BUILDS, buildMatrix, matVec, transpose, tableLoss } from './engine.js'

const X = buildMatrix(), Y = BUILDS.map(b => b.time), N = BUILDS.length
const r = (v, d = 2) => Number(v.toFixed(d)).toString()
const COLS = ['ones', 'size (GB)', 'files (hundreds)']

function Slider({ label, value, min, max, step, onChange, unit = '' }) {
  return <label>{label} = <strong>{r(value)}</strong>{unit}<input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} aria-label={label} /></label>
}

// 03.1 ¶2 — the table as X and y: click a cell to read its index.
export function DesignTable() {
  const [cell, setCell] = useState([2, 0]), [ones, setOnes] = useState(false)
  const cols = ones ? [0, 1, 2] : [1, 2]
  const [i, j] = cell, jj = ones ? j : j + 1
  return <div>
    <div className="ml-fig-controls"><label><input type="checkbox" checked={ones} onChange={e => { setOnes(e.target.checked); setCell([i, 0]) }} /> add the column of ones (Lesson 03.1, step 4)</label></div>
    <table className="ml-fig-table" aria-label="Design matrix X and target vector y">
      <thead><tr><th>build (row)</th>{cols.map((c, k) => <th key={c} className={k === j ? 'active' : ''}>X[:, {k}] · {COLS[c]}</th>)}<th>y · minutes</th></tr></thead>
      <tbody>{BUILDS.map((b, row) => <tr key={b.name}>
        <td className={row === i ? 'active' : ''}>{b.name} · X[{row}]</td>
        {cols.map((c, k) => <td key={c} className={row === i && k === j ? 'active' : ''}><button className="ml-link-button" onClick={() => setCell([row, k])} aria-label={`X[${row}, ${k}] = ${X[row][c]}`}>{X[row][c]}</button></td>)}
        <td>{b.time}</td>
      </tr>)}</tbody>
    </table>
    <p className="ml-fig-sum">X[{i}, {j}] = {X[i][jj]} — row {i} is build {BUILDS[i].name}, column {j} is {COLS[jj]}.<br />X has shape ({N}, {cols.length}): {N} rows (builds), {cols.length} columns (features). y has shape ({N},) and is not part of X.</p>
  </div>
}

// 03.1 ¶3 — one row's prediction as a sum of contributions.
export function RowContributions() {
  const [i, setI] = useState(2), [w, setW] = useState([1, 2, 2])
  const parts = [w[0], w[1] * X[i][1], w[2] * X[i][2]], pred = parts[0] + parts[1] + parts[2], y = Y[i]
  const scale = 300 / Math.max(20, pred, y), colors = ['var(--muted)', 'var(--chart-train)', 'var(--chart-val)']
  let x0 = 0
  return <div>
    <div className="ml-fig-controls">
      <label>build <select value={i} onChange={e => setI(Number(e.target.value))} aria-label="Build">{BUILDS.map((b, k) => <option key={b.name} value={k}>{b.name}: {b.size} GB, {b.files}00 files</option>)}</select></label>
      <Slider label="b" value={w[0]} min={-2} max={4} step={0.5} onChange={v => setW([v, w[1], w[2]])} />
      <Slider label="w₁" value={w[1]} min={0} max={4} step={0.5} onChange={v => setW([w[0], v, w[2]])} unit=" min/GB" />
      <Slider label="w₂" value={w[2]} min={0} max={4} step={0.5} onChange={v => setW([w[0], w[1], v])} unit=" min per 100 files" />
    </div>
    <svg viewBox="0 0 340 70" role="img" aria-label={`Prediction ${r(pred)} built from ${r(parts[0])}, ${r(parts[1])} and ${r(parts[2])}; measured ${y}`}>
      {parts.map((v, k) => { const x = x0; x0 += Math.max(0, v) * scale; return <g key={k}><rect x={10 + x} y={14} width={Math.max(0, v) * scale} height={22} fill={colors[k]} opacity="0.85" />{v * scale > 26 && <text x={10 + x + v * scale / 2} y={30} textAnchor="middle" style={{ fontSize: 11, fill: 'white' }}>{r(v)}</text>}</g> })}
      <line x1={10 + y * scale} x2={10 + y * scale} y1={6} y2={46} stroke="var(--text)" strokeWidth="2" strokeDasharray="3 2" />
      <text x={10 + y * scale} y={60} textAnchor="middle" style={{ fontSize: 11, fill: 'var(--text)' }}>measured {y}</text>
    </svg>
    <p className="ml-fig-sum">ŷ = b + w₁·size + w₂·files = {r(w[0])} + {r(w[1])}×{X[i][1]} + {r(w[2])}×{X[i][2]} = <strong>{r(pred)}</strong> minutes; error ŷ − y = {r(pred)} − {y} = <strong>{r(pred - y)}</strong>.</p>
    <p className="ml-caption">Grey is the intercept b, blue the size contribution, orange the files contribution. The dashed line is the measured time.</p>
  </div>
}

// 03.2 ¶1–2, ¶4 — X @ w one row at a time, and X * w for contrast.
export function MatVecStepper() {
  const w = [1, 2, 2], [k, setK] = useState(0), [mode, setMode] = useState('@')
  const pred = matVec(X, w), done = mode === '@' ? k : N
  return <div>
    <div className="ml-fig-controls">
      <button onClick={() => setK(v => Math.min(N, v + 1))} disabled={k >= N || mode !== '@'}>Next row</button>
      <button onClick={() => setK(0)}>Reset</button>
      <label><input type="radio" name="op" checked={mode === '@'} onChange={() => setMode('@')} /> X @ w</label>
      <label><input type="radio" name="op" checked={mode === '*'} onChange={() => setMode('*')} /> X * w</label>
    </div>
    <table className="ml-fig-table" aria-label={mode === '@' ? 'Matrix-vector product, row by row' : 'Elementwise product'}>
      <thead><tr><th>row</th><th colSpan={3}>{mode === '@' ? 'X[i]  ·  w = [1, 2, 2]' : 'X * w  (each entry times its weight, no sum)'}</th><th>{mode === '@' ? '(X @ w)[i]' : 'row sum'}</th></tr></thead>
      <tbody>{X.map((row, i) => <tr key={i} className={mode === '@' && i === k - 1 ? 'active' : ''}>
        <td>{BUILDS[i].name}</td>
        {row.map((x, j) => <td key={j} className={mode === '@' && i >= done ? 'dim' : ''}>{mode === '@' ? (i < done ? `${x}×${w[j]}` : x) : x * w[j]}</td>)}
        <td>{i < done ? r(pred[i]) : '?'}</td>
      </tr>)}</tbody>
    </table>
    <p className="ml-fig-sum">{mode === '@'
      ? (k === 0 ? 'Press Next row: each press computes one dot product.' : `Row ${BUILDS[k - 1].name}: ${X[k - 1].map((x, j) => `${x}×${w[j]}`).join(' + ')} = ${pred[k - 1]}. Result so far: [${pred.slice(0, k).join(', ')}${k < N ? ', …' : ''}], shape (${N},).`)
      : `X * w has shape (4, 3): nothing was added. Summing each row gives [${pred.join(', ')}] — the same as X @ w.`}</p>
  </div>
}

// 03.2 ¶3 — the shape rule.
export function ShapeRule() {
  const [a, setA] = useState(4), [b, setB] = useState(3), [c, setC] = useState(3)
  const ok = b === c
  const pick = (v, set, label) => <select value={v} onChange={e => set(Number(e.target.value))} aria-label={label}>{[1, 2, 3, 4, 5].map(n => <option key={n}>{n}</option>)}</select>
  return <div>
    <div className="ml-fig-controls ml-fig-sum">({pick(a, setA, 'rows of the matrix')}, {pick(b, setB, 'columns of the matrix')}) @ ({pick(c, setC, 'length of the vector')},)</div>
    <p className="ml-fig-sum">{ok
      ? <>({a}, <s>{b}</s>) @ (<s>{c}</s>,) → <strong>({a},)</strong>: the inner {b}s match and disappear; one number per row.</>
      : <>({a}, {b}) @ ({c},) → <strong>error</strong>: each row has {b} entries but the vector has {c}, so they cannot be paired.</>}</p>
  </div>
}

// 03.2 ¶5 — Xᵀ v: one dot product per column.
export function TransposeDot() {
  const [v, setV] = useState([1, 1, 1, 1]), [j, setJ] = useState(1)
  const XT = transpose(X), out = matVec(XT, v)
  return <div>
    <div className="ml-fig-controls">v = [{v.map((x, i) => <input key={i} type="number" value={x} style={{ width: 48 }} aria-label={`v[${i}] for build ${BUILDS[i].name}`} onChange={e => setV(v.map((u, k) => (k === i ? Number(e.target.value) || 0 : u)))} />)}]
      <label>column <select value={j} onChange={e => setJ(Number(e.target.value))} aria-label="Column">{COLS.map((c, k) => <option key={c} value={k}>{k}: {c}</option>)}</select></label>
    </div>
    <table className="ml-fig-table" aria-label="Transpose times vector">
      <thead><tr><th>Xᵀ row = X column</th>{BUILDS.map(b => <th key={b.name}>{b.name}</th>)}<th>· v</th></tr></thead>
      <tbody>{XT.map((row, k) => <tr key={k} className={k === j ? 'active' : ''}><td>{COLS[k]}</td>{row.map((x, i) => <td key={i}>{x}</td>)}<td>{r(out[k])}</td></tr>)}</tbody>
    </table>
    <p className="ml-fig-sum">Entry {j} of Xᵀv = {XT[j].map((x, i) => `${x}×${v[i]}`).join(' + ')} = <strong>{r(out[j])}</strong>. Xᵀ @ v = [{out.map(o => r(o)).join(', ')}], shape (3,): one number per feature.</p>
  </div>
}

// 03.3 ¶1 — predictions, targets and errors.
export function ErrorBars() {
  const [w, setW] = useState([1, 2, 2]), L = tableLoss(w), max = 20, sx = 240 / max
  return <div>
    <div className="ml-fig-controls">
      <Slider label="b" value={w[0]} min={-1} max={4} step={0.25} onChange={v => setW([v, w[1], w[2]])} />
      <Slider label="w₁" value={w[1]} min={0} max={4} step={0.25} onChange={v => setW([w[0], v, w[2]])} />
      <Slider label="w₂" value={w[2]} min={0} max={4} step={0.25} onChange={v => setW([w[0], w[1], v])} />
    </div>
    <svg viewBox="0 0 320 128" role="img" aria-label={`Predictions ${L.pred.map(p => r(p)).join(', ')} against measured ${Y.join(', ')}; MSE ${r(L.mse, 3)}`}>
      {BUILDS.map((b, i) => { const yy = 12 + i * 28; return <g key={b.name}>
        <text x={4} y={yy + 12} style={{ fontSize: 11, fill: 'var(--text)' }}>{b.name}</text>
        <rect x={20} y={yy} width={Math.max(0, L.pred[i]) * sx} height={16} fill="var(--chart-train)" opacity="0.8" />
        <line x1={20 + Y[i] * sx} x2={20 + Y[i] * sx} y1={yy - 3} y2={yy + 19} stroke="var(--text)" strokeWidth="2" />
        <text x={270} y={yy + 12} style={{ fontSize: 11, fill: L.e[i] < 0 ? '#ef4444' : 'var(--chart-val)' }}>e = {r(L.e[i])}</text>
      </g> })}
    </svg>
    <p className="ml-fig-sum">e = ŷ − y = [{L.e.map(v => r(v)).join(', ')}]; MSE = mean(e²) = <strong>{r(L.mse, 3)}</strong>. Blue bars are predictions, black ticks the measured times. Negative error: the model predicted too little.</p>
  </div>
}

// 03.3 ¶2–3 — one gradient entry per column: column · e × 2/n.
export function GradientColumns() {
  const L = tableLoss([1, 2, 2]), [j, setJ] = useState(1)
  const prods = X.map((row, i) => row[j] * L.e[i]), sum = prods.reduce((a, b) => a + b, 0)
  return <div>
    <div className="ml-fig-controls"><label>weight <select value={j} onChange={e => setJ(Number(e.target.value))} aria-label="Weight">{['b (ones column)', 'w₁ (size column)', 'w₂ (files column)'].map((c, k) => <option key={c} value={k}>{c}</option>)}</select></label></div>
    <table className="ml-fig-table" aria-label="Error times column">
      <thead><tr><th>build</th><th>eᵢ</th><th>xᵢ{j}</th><th>eᵢ·xᵢ{j}</th></tr></thead>
      <tbody>{BUILDS.map((b, i) => <tr key={b.name}><td>{b.name}</td><td>{r(L.e[i])}</td><td>{X[i][j]}</td><td>{r(prods[i])}</td></tr>)}</tbody>
    </table>
    <p className="ml-fig-sum">Σ eᵢ·xᵢ{j} = {r(sum)}; × 2/n = × 2/4 → ∂J/∂w{j === 0 ? '₀ (b)' : j === 1 ? '₁' : '₂'} = <strong>{r(2 * sum / N, 3)}</strong>.<br />All three at once: (2/n)·Xᵀe = [{L.grad.map(g => r(g, 3)).join(', ')}]. {sum < 0 ? 'Negative: raising this weight lowers the loss.' : 'Positive: lowering this weight lowers the loss.'}</p>
  </div>
}

// 03.3 ¶4 — check a gradient entry with a nudge.
export function NudgeCheck() {
  const [p, setP] = useState(-2), eps = 10 ** p, w = [1, 2, 2], g = tableLoss(w).grad[1]
  const J = d => tableLoss([1, 2 + d, 2]).mse, forward = J(eps) - J(0), centered = (J(eps) - J(-eps)) / 2
  return <div>
    <div className="ml-fig-controls"><label>nudge ε = <strong>{eps}</strong><input type="range" min={-5} max={-1} step={1} value={p} onChange={e => setP(Number(e.target.value))} aria-label="Nudge size, as a power of ten" /></label></div>
    <table className="ml-fig-table" aria-label="Predicted versus measured change">
      <tbody>
        <tr><td>gradient predicts ΔJ ≈ ∂J/∂w₁ × ε</td><td>{r(g, 3)} × {eps} = {(g * eps).toPrecision(6)}</td></tr>
        <tr><td>measured J(w₁ + ε) − J(w₁)</td><td>{forward.toPrecision(6)}</td></tr>
        <tr><td>centered [J(w₁ + ε) − J(w₁ − ε)] / 2</td><td>{centered.toPrecision(6)}</td></tr>
      </tbody>
    </table>
    <p className="ml-fig-sum">The one-sided difference is off by {Math.abs(forward - g * eps).toPrecision(2)} — a curvature term that shrinks with ε². The centered difference matches the gradient almost exactly.</p>
  </div>
}

// 03.3 ¶5 — gradient descent steps at two rates.
export function DescentSteps() {
  const [alpha, setAlpha] = useState(0.02), [hist, setHist] = useState([[1, 2, 2]])
  const w = hist[hist.length - 1], losses = hist.map(h => tableLoss(h).mse)
  const step = k => setHist(h => { let out = [...h]; for (let t = 0; t < k; t++) { const cur = out[out.length - 1], g = tableLoss(cur).grad; out.push(cur.map((v, i) => v - alpha * g[i])) } return out })
  const lmax = Math.max(...losses.map(l => Math.log10(Math.max(l, 1e-3)))), lmin = -2, W = 300, H = 90
  const px = i => 10 + (i / Math.max(1, hist.length - 1)) * (W - 20), py = l => H - 10 - ((Math.log10(Math.max(l, 1e-3)) - lmin) / Math.max(1e-9, lmax - lmin)) * (H - 20)
  return <div>
    <div className="ml-fig-controls">
      <label>α <select value={alpha} onChange={e => { setAlpha(Number(e.target.value)); setHist([[1, 2, 2]]) }} aria-label="Learning rate">{[0.02, 0.05, 0.07].map(a => <option key={a} value={a}>{a}</option>)}</select></label>
      <button onClick={() => step(1)}>1 step</button><button onClick={() => step(10)}>10 steps</button><button onClick={() => setHist([[1, 2, 2]])}>Reset</button>
    </div>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`MSE over ${hist.length - 1} steps, now ${r(losses[losses.length - 1], 3)}`}>
      <polyline points={losses.map((l, i) => `${px(i)},${py(l)}`).join(' ')} fill="none" stroke="var(--chart-model)" strokeWidth="2" />
      <text x={10} y={10} style={{ fontSize: 10, fill: 'var(--muted)' }}>MSE (log scale)</text>
    </svg>
    <p className="ml-fig-sum">step {hist.length - 1}: w = [{w.map(v => r(v, 3)).join(', ')}], MSE = <strong>{Number.isFinite(losses[losses.length - 1]) ? r(losses[losses.length - 1], 4) : '∞'}</strong>{hist.length > 1 && ` (started at 2.475)`}.</p>
  </div>
}

// ---------- 03.4–03.8: weight space, projection, rank, scaling, eigenvalues ----------
import { generate, prepare, curvature, leastSquares, descend, resampledFits, levelCurve } from './engine.js'
import { Controls as FC, Slider as FS, Check as FCheck, Radio as FRadio, Readout as FR, Bars as FBars, MiniPlot, Path as FPath, Dots as FDots, Table as FTable, r as fr } from '../../kit/fig.jsx'

// Loss contours over (w1, w2) with a gradient-descent path from (0, 0).
export function WeightSpace({ corr: c0 = 0.3, scale: s0 = 1, standardize: z0 = false, show = ['rate'], rate: a0 = 0.1, steps = 40, cloud = false }) {
  const [corr, setCorr] = useState(c0), [scale, setScale] = useState(s0), [std, setStd] = useState(z0), [rate, setRate] = useState(a0), [stable, setStable] = useState(false)
  const data = useMemo(() => { const rows = generate({ corr, scale }), P = prepare(rows, std), C = curvature(P.X), fit = leastSquares(P.X, P.y); return { rows, P, C, fit } }, [corr, scale, std])
  const { P, C, fit } = data, lmax = C.eigen.values[0], alpha = stable ? 0.95 / lmax : rate
  const run = descend(P.X, P.y, alpha, steps), path = run.path.map(p => p.w)
  const fits = cloud && fit.w ? resampledFits(data.rows, std) : []
  const shown = run.diverged ? path.slice(0, 3) : path, center = fit.w ?? [0, 0], span = Math.max(1.5, ...shown.map(w => Math.max(Math.abs(w[0] - center[0]), Math.abs(w[1] - center[1]))), ...fits.map(w => Math.max(Math.abs(w[0] - center[0]), Math.abs(w[1] - center[1])))) * 1.15
  // Equal scale on both axes (plot area 384 × 220 px), so right angles look like right angles.
  const box = [[center[0] - span * 384 / 220, center[0] + span * 384 / 220], [center[1] - span, center[1] + span]]
  const levels = fit.w ? [0.25, 1, 2.5, 5, 10, 20].map(k => k * Math.max(1e-6, C.eigen.values[1]) * span * span / 25) : []
  return <div>
    <FC>
      {show.includes('corr') && <FS label="correlation of x₁ and x₂" value={corr} min={0} max={0.99} step={0.01} onChange={setCorr} />}
      {show.includes('scale') && <FRadio name="wsscale" value={String(scale)} onChange={v => setScale(Number(v))} options={[['1', 'x₂ in MB'], ['1000', 'x₂ in KB (×1000)']]} />}
      {show.includes('std') && <FCheck label="standardize with training statistics" checked={std} onChange={setStd} />}
      {show.includes('rate') && <FS label="α" value={rate} min={0.01} max={1.2} step={0.01} onChange={v => { setRate(v); setStable(false) }} />}
      {show.includes('stable') && <FCheck label="use the largest stable rate, 0.95/λmax" checked={stable} onChange={setStable} />}
    </FC>
    <MiniPlot x={box[0]} y={box[1]} xLabel="w₁" yLabel="w₂" height={280} label={`Loss contours in weight space; ${path.length - 1} gradient steps`}>{({ X, Y }) => <>
      {levels.map((lv, i) => <FPath key={i} X={X} Y={Y} points={levelCurve(center, C.eigen, lv)} stroke="var(--muted)" width={1} />)}
      {fits.length > 0 && <FDots X={X} Y={Y} points={fits.map(w => [w[0], w[1]])} color="var(--chart-val)" rad={2.5} opacity={0.6} />}
      <FPath X={X} Y={Y} points={shown} stroke="var(--chart-model)" width={1.8} dash="4 3" />
      <FDots X={X} Y={Y} points={shown.map((w, i) => [w[0], w[1], i === shown.length - 1 ? 4 : 2.2])} color="var(--chart-model)" />
      {fit.w && <text x={X(center[0])} y={Y(center[1]) + 5} textAnchor="middle" style={{ fontSize: 15, fill: '#ef4444' }}>✕</text>}
    </>}</MiniPlot>
    <FR>{fit.w ? <>✕ = least-squares weights ({fr(center[0], 3)}, {fr(center[1], 3)}). Eigenvalues of XᵀX/n: {fr(C.eigen.values[0], 4)} and {fr(C.eigen.values[1], 6)}; condition number κ = <strong>{fr(C.condition, 1)}</strong>; stable rates satisfy α &lt; 1/λmax = {fr(1 / lmax, 5)}.</> : 'The columns are collinear: no unique minimum.'} After {path.length - 1} steps at α = {fr(alpha, 6)}: {run.diverged ? <strong>diverged.</strong> : <>MSE {fr(run.path[run.path.length - 1].loss, 3)}.</>}{cloud && fits.length ? ` Orange: ${fits.length} refits on resampled data.` : ''}</FR>
  </div>
}

// Xᵀe → 0 as gradient descent converges on the four builds.
export function OrthogonalResiduals() {
  const [k, setK] = useState(0)
  const path = useMemo(() => { const out = [[1, 2, 2]]; for (let t = 0; t < 400; t++) { const w = out[out.length - 1], g = tableLoss(w).grad; out.push(w.map((v, i) => v - 0.05 * g[i])) } return out }, [])
  const L = tableLoss(path[k])
  return <div>
    <FC><FS label="gradient steps (α = 0.05)" value={k} min={0} max={400} step={5} onChange={setK} digits={0} /></FC>
    <FTable head={['column', 'Σ eᵢ·xᵢⱼ', 'meaning']} rows={[['ones', fr(L.Xte[0], 4), 'residuals sum to zero'], ['size', fr(L.Xte[1], 4), 'uncorrelated with size'], ['files', fr(L.Xte[2], 4), 'uncorrelated with files']]} label="Dot products of each column with the residuals" />
    <FR>w = [{path[k].map(v => fr(v, 3)).join(', ')}], MSE {fr(L.mse, 4)}. {Math.max(...L.Xte.map(Math.abs)) < 1e-3 ? 'At the optimum every column is perpendicular to the residual vector.' : 'Keep stepping: every entry heads to zero.'}</FR>
  </div>
}

// Projection of y onto one column, drawn in the 2D space of two observations.
export function ProjectionPicture() {
  const [y1, setY1] = useState(3), [y2, setY2] = useState(1), x = [1, 2]
  const c = (x[0] * y1 + x[1] * y2) / (x[0] ** 2 + x[1] ** 2), p = [c * x[0], c * x[1]], e = [y1 - p[0], y2 - p[1]]
  return <div>
    <FC><FS label="y₁" value={y1} min={-1} max={4} step={0.1} onChange={setY1} digits={1} /><FS label="y₂" value={y2} min={-1} max={4} step={0.1} onChange={setY2} digits={1} /></FC>
    <MiniPlot x={[-1.5, 4.5]} y={[-1.5, 4.17]} width={330} height={300} xLabel="observation 1" yLabel="observation 2" label="Projection of y onto the column x">{({ X, Y }) => <>
      <FPath X={X} Y={Y} points={[[-0.75, -1.5], [2.25, 4.5]]} stroke="var(--muted)" width={1.5} />
      <FPath X={X} Y={Y} points={[[0, 0], [y1, y2]]} stroke="var(--chart-train)" />
      <FPath X={X} Y={Y} points={[[0, 0], p]} stroke="var(--chart-model)" width={3} />
      <FPath X={X} Y={Y} points={[p, [y1, y2]]} stroke="#ef4444" dash="4 3" />
      <FDots X={X} Y={Y} points={[[y1, y2, 5, 'var(--chart-train)'], [p[0], p[1], 5, 'var(--chart-model)']]} />
    </>}</MiniPlot>
    <FR>The grey line is every prediction w·x for x = (1, 2). Best w = x·y / x·x = {fr(c, 3)}; ŷ = ({fr(p[0], 2)}, {fr(p[1], 2)}); residual e = ({fr(e[0], 2)}, {fr(e[1], 2)}); x·e = <strong>{fr(x[0] * e[0] + x[1] * e[1], 6)}</strong> — the red segment meets the line at a right angle.</FR>
  </div>
}

// Rank of small matrices by elimination.
function rankOf(M) {
  const A = M.map(r2 => [...r2]), rows = A.length, cols = A[0].length
  let rank = 0
  for (let c = 0; c < cols && rank < rows; c++) {
    let p = rank; for (let i = rank; i < rows; i++) if (Math.abs(A[i][c]) > Math.abs(A[p][c])) p = i
    if (Math.abs(A[p][c]) < 1e-9) continue
    ;[A[rank], A[p]] = [A[p], A[rank]]
    for (let i = 0; i < rows; i++) if (i !== rank) { const f = A[i][c] / A[rank][c]; for (let j = 0; j < cols; j++) A[i][j] -= f * A[rank][j] }
    rank++
  }
  return rank
}
const RANK_CASES = {
  independent: { name: 'ones, size, files (the builds)', cols: [[1, 1, 1, 1], [1, 2, 3, 4], [1, 4, 2, 3]] },
  duplicate: { name: 'ones, size in MB, size in KB', cols: [[1, 1, 1, 1], [1, 2, 3, 4], [1024, 2048, 3072, 4096]] },
  constant: { name: 'ones, size, a constant column of 5s', cols: [[1, 1, 1, 1], [1, 2, 3, 4], [5, 5, 5, 5]] },
  onehot: { name: 'ones, is_main, is_dev (every row is one of the two)', cols: [[1, 1, 1, 1], [1, 0, 1, 0], [0, 1, 0, 1]] },
}
export function RankCheck() {
  const [k, setK] = useState('duplicate'), cols = RANK_CASES[k].cols, M = cols[0].map((_, i) => cols.map(c => c[i])), rk = rankOf(M)
  return <div>
    <FC><label>columns <select value={k} onChange={e => setK(e.target.value)} aria-label="Columns">{Object.entries(RANK_CASES).map(([key, c]) => <option key={key} value={key}>{c.name}</option>)}</select></label></FC>
    <FTable head={['row', 'col 0', 'col 1', 'col 2']} rows={M.map((row, i) => [i, ...row])} label="Design matrix" />
    <FR>rank = <strong>{rk}</strong> of 3 columns. {rk === 3 ? 'Unique least-squares weights.' : k === 'duplicate' ? 'Column 2 = 1024 × column 1: the credit between them cannot be divided.' : k === 'constant' ? 'Column 2 = 5 × the ones column: it cannot be separated from the intercept.' : 'is_main + is_dev = ones: keeping every category and an intercept loses a rank.'}</FR>
  </div>
}

// Distance to w* multiplied by (1 − 2α·mean(x²)) every step.
export function StepFactor() {
  const [m2, setM2] = useState(4), [alpha, setAlpha] = useState(0.1)
  const f = 1 - 2 * alpha * m2, d = Array.from({ length: 8 }, (_, k) => f ** k)
  return <div>
    <FC><FS label="mean(x²)" value={m2} min={0.5} max={8} step={0.5} onChange={setM2} digits={1} /><FS label="α" value={alpha} min={0.01} max={0.4} step={0.01} onChange={setAlpha} /></FC>
    <FBars items={d.map((v, k) => ({ label: `step ${k}`, value: Math.max(-5, Math.min(5, v)), color: Math.abs(f) >= 1 ? '#ef4444' : undefined }))} min={-1} max={1.2} digits={2} label="Distance to the best weight after each step" />
    <FR>factor = 1 − 2 × {fr(alpha, 2)} × {fr(m2, 1)} = <strong>{fr(f, 3)}</strong>. {Math.abs(f) < 1 ? (f < 0 ? 'Negative: the weight overshoots and bounces, but the bounces shrink.' : 'Between 0 and 1: a steady approach.') : Math.abs(f) === 1 ? 'Exactly ±1: bounces forever.' : 'Larger than 1 in size: every step moves further away (bars clipped at ±5).'} Stable while α &lt; 1/mean(x²) = {fr(1 / m2, 3)}.</FR>
  </div>
}

// A = [[1, ρ], [ρ, 1]] acting on a unit vector.
export function EigenStretch() {
  const [rho, setRho] = useState(0.9), [deg, setDeg] = useState(20)
  const t = deg * Math.PI / 180, v = [Math.cos(t), Math.sin(t)], Av = [v[0] + rho * v[1], rho * v[0] + v[1]]
  const cross = v[0] * Av[1] - v[1] * Av[0], aligned = Math.abs(cross) < 0.02 * Math.hypot(...Av)
  return <div>
    <FC><FS label="ρ" value={rho} min={0} max={0.99} step={0.01} onChange={setRho} /><FS label="direction of v (degrees)" value={deg} min={0} max={180} step={1} onChange={setDeg} digits={0} /></FC>
    <MiniPlot x={[-2, 2]} y={[-1.96, 1.96]} width={300} height={280} xLabel="" yLabel="" label="A vector v and its image Av">{({ X, Y }) => <>
      <FPath X={X} Y={Y} points={[[0, 0], v]} stroke="var(--chart-train)" width={3} />
      <FPath X={X} Y={Y} points={[[0, 0], Av]} stroke="var(--chart-val)" width={3} />
      <FDots X={X} Y={Y} points={[[v[0], v[1], 4, 'var(--chart-train)'], [Av[0], Av[1], 4, 'var(--chart-val)']]} />
    </>}</MiniPlot>
    <FR>v = ({fr(v[0], 2)}, {fr(v[1], 2)}) in blue; Av = ({fr(Av[0], 2)}, {fr(Av[1], 2)}) in orange. {aligned ? <strong>Av points along v: v is an eigenvector, λ = {fr((Av[0] * v[0] + Av[1] * v[1]), 3)}.</strong> : 'Av turned away from v. Find the two angles where it does not turn (hint: 45° and 135°).'} Eigenvalues: 1 + ρ = {fr(1 + rho, 2)} and 1 − ρ = {fr(1 - rho, 2)}.</FR>
  </div>
}

// Per-direction factors (1 − 2αλ) and steps per factor of ten.
export function EigenDecay() {
  const [rho, setRho] = useState(0.9), [alpha, setAlpha] = useState(0.4), l = [1 + rho, 1 - rho], f = l.map(v => Math.abs(1 - 2 * alpha * v))
  const steps = f.map(v => (v < 1 ? Math.log(10) / -Math.log(Math.max(v, 1e-12)) : Infinity))
  return <div>
    <FC><FS label="ρ" value={rho} min={0} max={0.99} step={0.01} onChange={setRho} /><FS label="α" value={alpha} min={0.05} max={1} step={0.01} onChange={setAlpha} /></FC>
    <FTable head={['direction', 'λ', '|1 − 2αλ|', 'steps per ×10 closer']} rows={[['steep (1, 1)', fr(l[0], 2), fr(f[0], 3), Number.isFinite(steps[0]) ? fr(steps[0], 1) : 'never — diverges'], ['flat (1, −1)', fr(l[1], 2), fr(f[1], 3), Number.isFinite(steps[1]) ? fr(steps[1], 1) : 'never — diverges']]} label="Convergence per eigen-direction" />
    <FR>condition number κ = λmax/λmin = <strong>{fr(l[0] / l[1], 1)}</strong>; stable while α &lt; 1/λmax = {fr(1 / l[0], 3)}. The flat direction sets the pace, the steep one sets the limit.</FR>
  </div>
}
