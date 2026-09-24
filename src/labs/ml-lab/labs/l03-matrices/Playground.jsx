import React, { useMemo, useState } from 'react'
import { generate, prepare, curvature, leastSquares, descend, resampledFits, levelCurve, mse, BUILDS, buildMatrix, matVec, transpose, tableLoss } from './engine.js'
import { Plot, Path, extent, equalAspect } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Toggle, Controls, Metrics, Caption, Insight, Table, Legend, Warning, Actions, useTicker } from '../../kit/ui.jsx'
import { fmt } from '../../kit/math.js'

// The experiment follows the lesson. 03.1–03.3 stay on the four builds from the text,
// so the picture matches the arithmetic being taught; the loss bowl arrives in 03.4.
export default function Playground({ lesson }) {
  const id = lesson?.id ?? 'l03-conditioning'
  if (id === 'l03-design') return <DesignTable />
  if (id === 'l03-matmul') return <MatMul />
  if (id === 'l03-gradient') return <GradientTable />
  return <Bowl key={id} lessonId={id} />
}

const COL = ['var(--muted)', 'var(--chart-train)', 'var(--chart-val)']   // ones, size, files
const FEATURE = ['1', 'size (GB)', 'files (100s)'], WEIGHT = ['b', 'w₁', 'w₂']
const n2 = v => Number(v.toFixed(3)).toString()
const signed = v => (v < 0 ? `(${n2(v)})` : n2(v))

// ——— 03.1 · one row with the weights ————————————————————————————————
function DesignTable() {
  const [w, setW] = useState([1, 2, 2]), [row, setRow] = useState(2), [ones, setOnes] = useState(false), [prev, setPrev] = useState(null)
  const X = buildMatrix(), pred = matVec(X, w), t = tableLoss(w)
  const prevPred = prev ? matVec(X, prev.w) : null
  const setWeight = (j, v) => { setPrev({ w, j }); setW(ws => ws.map((x, k) => k === j ? v : x)) }
  const r = X[row], cols = ones ? [0, 1, 2] : [1, 2]
  return <>
    <PanelHeading eyebrow="Live experiment · lesson 03.1" title="Four builds. Read one row with the weights." pill="same table as the lesson" />
    <Caption>Each **row** is one build; each **column** is one feature. Click a row to see its prediction as a multiply-and-add. Each weight belongs to one column — its colour shows which.</Caption>
    <Controls>
      <Slider label="b · intercept (minutes)" value={w[0]} min={0} max={5} step={0.5} onChange={v => setWeight(0, v)} />
      <Slider label="w₁ · minutes per GB" value={w[1]} min={0} max={5} step={0.5} onChange={v => setWeight(1, v)} />
      <Slider label="w₂ · minutes per hundred files" value={w[2]} min={0} max={5} step={0.5} onChange={v => setWeight(2, v)} />
      <div className="ml-toggles"><Toggle label="Show the column of ones (intercept as a weight)" checked={ones} onChange={setOnes} /></div>
    </Controls>
    <div className="ml-table-scroll"><table className="ml-pick-table">
      <thead><tr><th>build</th>{cols.map(j => <th key={j} style={{ color: COL[j] }}>{FEATURE[j]}</th>)}<th>prediction ŷ</th><th>measured y</th><th>error ŷ − y</th>{prev && <th>change from last move</th>}</tr></thead>
      <tbody>{BUILDS.map((b, i) => <tr key={b.name} className={i === row ? 'selected' : ''} onClick={() => setRow(i)} tabIndex={0} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setRow(i)} aria-selected={i === row}>
        <td><strong>{b.name}</strong></td>{cols.map(j => <td key={j} style={{ color: COL[j] }}>{X[i][j]}</td>)}
        <td>{n2(pred[i])}</td><td>{b.time}</td><td>{n2(t.e[i])}</td>{prev && <td>{pred[i] - prevPred[i] > 0 ? '+' : ''}{n2(pred[i] - prevPred[i])}</td>}
      </tr>)}</tbody>
    </table></div>
    <div className="ml-update">
      <h3>Build {BUILDS[row].name}, one multiply-and-add</h3>
      <code>ŷ = {[0, 1, 2].map(j => <React.Fragment key={j}>{j > 0 && ' + '}<span style={{ color: COL[j] }}>{r[j]} × {WEIGHT[j]}({n2(w[j])})</span></React.Fragment>)}</code>
      <code>  = {r.map((x, j) => n2(x * w[j])).join(' + ')} = <strong>{n2(pred[row])}</strong> minutes   (measured {BUILDS[row].time}, error {n2(t.e[row])})</code>
      {ones ? <code>row · w = [{r.join(', ')}] · [{w.map(n2).join(', ')}] = {n2(pred[row])}   — the intercept is just the weight on the column of 1s</code>
        : <code>b + [{r.slice(1).join(', ')}] · [{w.slice(1).map(n2).join(', ')}] = {n2(pred[row])}</code>}
    </div>
    {prev && <Caption>{`You changed ${WEIGHT[prev.j]}. Every prediction moved by the change in ${WEIGHT[prev.j]} times that row's ${FEATURE[prev.j]} value — the weight belongs to the column, not to one row.`}</Caption>}
    <Metrics items={[['X shape', ones ? '(4, 3)' : '(4, 2)', ones ? '4 builds × (ones, size, files)' : '4 builds × (size, files)'], ['w shape', ones ? '(3,)' : '(2,) plus b', 'one weight per column'], ['ŷ and e shape', '(4,)', 'one per build'], ['MSE', n2(t.mse), 'mean of the squared errors']]} />
    <Insight title="What to notice">
      <ul>
        <li>Raise w₂ by 1: build B (4 hundred files) moves by 4, build A by only 1.</li>
        <li>Switch the ones column on: no prediction changes. The intercept is simply the weight on a feature that is always 1.</li>
        <li>The measured times are y. They are never a column of X.</li>
      </ul>
    </Insight>
  </>
}

// ——— 03.2 · many dot products, one step at a time ——————————————————————————
const W0 = [1, 2, 2]
const V_PRESETS = { ones: [1, 1, 1, 1], ends: [1, 0, 0, 1], errors: tableLoss(W0).e.map(v => Number(v.toFixed(2))) }
function Matrix({ rows, highlightRow, highlightCell, label, colColors, done }) {
  return <table className="ml-mat" aria-label={label}><tbody>{rows.map((r, i) => <tr key={i} className={i === highlightRow ? 'active' : done?.(i) ? 'done' : ''}>{r.map((v, j) => <td key={j} className={highlightCell?.(i, j) ? 'hit' : ''} style={colColors ? { color: colColors[j] } : undefined}>{v === null ? '·' : n2(v)}</td>)}</tr>)}</tbody></table>
}
function MatMul() {
  const [mode, setMode] = useState('matvec'), [t, setT] = useState(0), [playing, setPlaying] = useState(false), [vKey, setVKey] = useState('ones'), [rowSums, setRowSums] = useState(false)
  const X = buildMatrix(), XT = transpose(X), v = V_PRESETS[vKey]
  const A = mode === 'transpose' ? XT : X, x = mode === 'transpose' ? v : W0
  const R = A.length, C = A[0].length, per = C + 1, total = R * per
  const row = Math.min(Math.floor(t / per), R - 1), phase = t >= total ? per : t % per
  const result = matVec(A, x)
  const shown = i => i < row || t >= total || (i === row && phase === C)
  const advance = () => setT(k => { if (k >= total) { setPlaying(false); return k } return k + 1 })
  useTicker(playing && mode !== 'elementwise', advance, 700)
  const change = m => { setMode(m); setT(0); setPlaying(false) }
  const terms = A[row].map((a, j) => j < (t >= total ? C : phase) ? `${n2(a)}×${signed(x[j])}` : null).filter(Boolean)
  return <>
    <PanelHeading eyebrow="Live experiment · lesson 03.2" title="Matrix multiplication, one dot product at a time." pill={mode === 'transpose' ? 'Xᵀ @ v' : mode === 'elementwise' ? 'X * w' : 'X @ w'} />
    <Caption>The same four builds and weights `w = [1, 2, 2]` as the lesson. Step through: each row of the left matrix meets the vector, pair by pair, and the sum drops into the result.</Caption>
    <Controls>
      <Choice label="Operation" value={mode} onChange={change} options={[['matvec', 'X @ w  (predictions)'], ['elementwise', 'X * w  (elementwise — no adding)'], ['transpose', 'Xᵀ @ v  (one dot product per column)']]} />
      {mode === 'transpose' && <Choice label="Vector v (one entry per build)" value={vKey} onChange={k => { setVKey(k); setT(0) }} options={[['ones', '[1, 1, 1, 1]'], ['ends', '[1, 0, 0, 1]'], ['errors', 'the errors e from lesson 03.3']]} />}
    </Controls>
    {mode === 'elementwise' ? <>
      <div className="ml-matrices"><Matrix rows={X} label="X" colColors={COL} /><span>*</span><Matrix rows={[W0]} label="w as a row" colColors={COL} /><span>=</span><Matrix rows={X.map(r => r.map((a, j) => a * W0[j]))} label="X * w" colColors={COL} />{rowSums && <><span>→ row sums</span><Matrix rows={matVec(X, W0).map(s => [s])} label="row sums" /></>}</div>
      <Controls><Toggle label="Sum each row: (X * w).sum(axis=1)" checked={rowSums} onChange={setRowSums} /></Controls>
      <Caption>{`Broadcasting multiplies each row by w entry by entry and stops: shape (4, 3), not (4,). ${rowSums ? 'Summing each row adds the products — and gives exactly X @ w = [5, 13, 11, 15].' : 'Switch on the row sums to recover X @ w.'}`}</Caption>
    </> : <>
      <div className="ml-matrices">
        <Matrix rows={A} label={mode === 'transpose' ? 'X transposed' : 'X'} highlightRow={t < total ? row : -1} highlightCell={(i, j) => t < total && i === row && j < phase} done={shown} colColors={mode === 'transpose' ? undefined : COL} />
        <span>@</span>
        <Matrix rows={x.map(a => [a])} label={mode === 'transpose' ? 'v' : 'w'} highlightCell={(i) => t < total && i < phase} colColors={undefined} />
        <span>=</span>
        <Matrix rows={result.map((s, i) => [shown(i) ? s : null])} label="result" highlightRow={t < total && phase === C ? row : -1} />
      </div>
      <div className="ml-update">
        <code>{mode === 'transpose' ? `row ${row} of Xᵀ = column ${row} of X (${FEATURE[row]})` : `row ${row} of X = build ${BUILDS[row].name}`}:  {terms.length ? terms.join(' + ') : '…'}{(phase === C || t >= total) && ` = ${n2(result[row])}`}</code>
      </div>
      <Actions>
        <button className="ml-primary" onClick={() => setPlaying(p => !p)} disabled={t >= total}>{playing ? 'Pause' : 'Play'}</button>
        <button onClick={advance} disabled={t >= total}>Next pair</button>
        <button onClick={() => setT(k => { const r = Math.floor(k / per); return Math.min(total, k % per < C ? r * per + C : (r + 1) * per + C) })} disabled={t >= total}>Next row</button>
        <button onClick={() => { setT(total); setPlaying(false) }}>Show all</button>
        <button onClick={() => { setT(0); setPlaying(false) }}>Reset</button>
      </Actions>
    </>}
    <Metrics items={mode === 'transpose' ? [['Xᵀ shape', '(3, 4)'], ['v shape', '(4,)'], ['Xᵀ @ v shape', '(3,)', 'one number per feature column']] : mode === 'elementwise' ? [['X shape', '(4, 3)'], ['w shape', '(3,)'], ['X * w shape', '(4, 3)', 'no sum: not a prediction']] : [['X shape', '(4, 3)'], ['w shape', '(3,)'], ['X @ w shape', '(4,)', 'one prediction per build']]} />
    <Insight title="What to notice">{mode === 'transpose' ? 'Each row of Xᵀ is one feature across all four builds, so each entry of Xᵀ @ v is one feature column dotted with v. With v = the errors, this is the gradient of the next lesson (times 2/n).' : 'Nothing new happens inside matrix multiplication: it is the dot product you already know, repeated once per row with the same w. The inner sizes (3 and 3) must match, and they disappear from the result’s shape.'}</Insight>
  </>
}

// ——— 03.3 · Xᵀe, a nudge check and gradient steps on the same table ——————————————
const TABLE_RATES = [0.005, 0.02, 0.05, 0.07]
function GradientTable() {
  const [w, setW] = useState(W0), [alpha, setAlpha] = useState(0.02), [history, setHistory] = useState([tableLoss(W0).mse]), [nudge, setNudge] = useState(null), [which, setWhich] = useState(1), [count, setCount] = useState(0)
  const t = tableLoss(w), cols = transpose(t.X), diverged = !Number.isFinite(t.mse) || t.mse > 1e6
  const step = k => { let cur = w; const hs = []; for (let i = 0; i < k; i++) { const g = tableLoss(cur).grad; cur = cur.map((x, j) => x - alpha * g[j]); hs.push(tableLoss(cur).mse); if (!Number.isFinite(hs.at(-1)) || hs.at(-1) > 1e12) break } setW(cur); setHistory(h => [...h, ...hs].slice(-5000)); setCount(c => c + hs.length); setNudge(null) }
  const reset = () => { setW(W0); setHistory([tableLoss(W0).mse]); setCount(0); setNudge(null) }
  const doNudge = () => { const eps = 0.01, moved = w.map((x, j) => j === which ? x + eps : x), measured = tableLoss(moved).mse - t.mse; setNudge({ j: which, predicted: t.grad[which] * eps, measured, eps }) }
  const logs = history.map(h => Math.log10(Math.max(h, 1e-6)))
  return <>
    <PanelHeading eyebrow="Live experiment · lesson 03.3" title="The gradient, column by column." pill={`MSE ${diverged ? '→ ∞' : n2(t.mse)}`} />
    <Caption>Same four builds. The errors column e = ŷ − y feeds every gradient entry: each entry is one feature column dotted with e, times 2/n = 2/4.</Caption>
    <Table head={['build', '1', 'size', 'files', 'ŷ = row · w', 'y', 'e = ŷ − y']} rows={BUILDS.map((b, i) => [b.name, 1, b.size, b.files, n2(t.pred[i]), b.time, <strong key="e">{n2(t.e[i])}</strong>])} caption={`w = [b, w₁, w₂] = [${w.map(n2).join(', ')}]`} />
    <div className="ml-update"><h3>Xᵀe: one dot product per column</h3>
      {cols.map((col, j) => <code key={j} style={{ color: COL[j] }}>{WEIGHT[j]}: [{col.join(', ')}] · e = {col.map((c, i) => `${c}×${signed(Number(t.e[i].toFixed(3)))}`).join(' + ')} = {n2(t.Xte[j])}  →  ∂J/∂{WEIGHT[j]} = 2/4 × {signed(Number(t.Xte[j].toFixed(3)))} = <strong>{n2(t.grad[j])}</strong></code>)}
      <small>Negative entries mean “increasing this weight lowers the loss”.</small>
    </div>
    <Controls>
      <Choice label="Weight to nudge" value={String(which)} onChange={v => setWhich(Number(v))} options={[['0', 'b'], ['1', 'w₁ (size)'], ['2', 'w₂ (files)']]} />
      <Choice label="Learning rate α" value={String(alpha)} onChange={v => setAlpha(Number(v))} options={TABLE_RATES.map(r => [String(r), String(r)])} />
    </Controls>
    <Actions>
      <button onClick={doNudge} disabled={diverged}>Nudge {WEIGHT[which]} by 0.01</button>
      <button className="ml-primary" onClick={() => step(1)} disabled={diverged}>Take one step</button>
      <button onClick={() => step(5)} disabled={diverged}>5 steps</button>
      <button onClick={() => step(100)} disabled={diverged}>100 steps</button>
      <button onClick={() => step(1000)} disabled={diverged}>1,000 steps</button>
      <button onClick={reset}>Reset to [1, 2, 2]</button>
    </Actions>
    {nudge && <p className="ml-check-result" role="status">{`Raising ${WEIGHT[nudge.j]} by ${nudge.eps}: the gradient predicts an MSE change of ${fmt(nudge.predicted, 5)}; the measured change is ${fmt(nudge.measured, 5)}. They agree to first order — the gap is the curvature, and it shrinks with a smaller nudge.`}</p>}
    {diverged && <Warning>{`α = ${alpha} overshoots: each step lands farther up the opposite side of the bowl, and the MSE explodes. For this table the limit is about 0.066 — Lesson 03.7 shows where such a limit comes from. Reset and pick a smaller α.`}</Warning>}
    <Plot x={[0, Math.max(5, history.length - 1)]} y={extent([...logs, 0], 0.1)} height={200} xLabel="gradient steps taken" yLabel="MSE (log scale)" yFormat={v => fmt(10 ** v, 2)} label="Training MSE after each step">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={logs.map((l, i) => [i, l])} stroke="var(--chart-train)" />
      <line x1={X(0)} x2={X(Math.max(5, history.length - 1))} y1={Y(Math.log10(0.01714))} y2={Y(Math.log10(0.01714))} stroke="var(--muted)" strokeDasharray="4 3" />
    </>}</Plot>
    <Legend items={[['━', 'training MSE', 'var(--chart-train)'], ['┄', 'least-squares minimum (0.017)', 'var(--muted)']]} />
    <Metrics items={[['Steps taken', String(count)], ['b', n2(w[0])], ['w₁ · per GB', n2(w[1])], ['w₂ · per 100 files', n2(w[2])]]} />
    <Insight title="What to notice">Every weight moves in the same step, each by −α times its own gradient entry. The MSE falls fast at first, yet with α = 0.02 reaching the least-squares weights, about [2.16, 2.93, 1.03], takes roughly 1,000 steps: w₁ settles early while b and w₂ creep. Some directions of the loss are much flatter than others — Lessons 03.7 and 03.8 explain why, and what to do about it.</Insight>
  </>
}

// ——— 03.4–03.8 · weight space ——————————————————————————————————————
const small = v => (v > 0 && v < 0.001 ? v.toExponential(2) : fmt(v, 3))
const RATES = [0.0001, 0.001, 0.01, 0.05, 0.1, 0.2, 0.4, 0.6, 0.9, 1.2]
const BOWL = {
  'l03-bowl': { title: 'Every point is a model. The height is its loss.', defaults: { rate: '0.1', steps: 40 }, show: [], caption: 'Target `y = 5 + 3·x1 + 2·x2 + noise` for 60 synthetic builds. Each point of the plot is one model (w1, w2); the ellipses are contours of equal training MSE; the dashed curve is gradient descent from (0, 0).' },
  'l03-projection': { title: 'Descend to the bottom, where the residual is orthogonal.', defaults: { rate: '0.1', steps: 40 }, show: ['table', 'orth'], caption: 'The same bowl. As gradient descent reaches ✕, the residual becomes orthogonal to every column: mean(e), mean(e·x1) and mean(e·x2) all go to zero.' },
  'l03-rank': { title: 'Correlated features stretch the bowl into a valley.', defaults: { rate: '0.1', steps: 40, showFits: true }, show: ['corr', 'fits', 'table'], caption: 'Raise the correlation between x1 and x2. The dots are least-squares fits on 30 resampled copies of the data: how much would the weights move with different data?' },
  'l03-scaling': { title: 'Change the units of x2. Watch the path.', defaults: { rate: 'stable', steps: 400, scale: 1000 }, show: ['scale', 'standardize', 'table', 'limit'], caption: 'x2 can be recorded in larger units (× 1000 ≈ KB instead of MB). “Largest stable rate” is computed from the current data, so the path cannot diverge — watch how far it gets.' },
  'l03-conditioning': { title: 'Curvature, eigenvalues and κ.', defaults: { rate: 'stable', steps: 400, standardize: true }, show: ['corr', 'scale', 'standardize', 'fits', 'table', 'limit', 'eigen'], caption: 'Everything at once. The contour axes are the eigenvectors of A = XᵀX/n; their lengths are proportional to 1/√λ.' },
}
function Bowl({ lessonId }) {
  const spec = BOWL[lessonId] ?? BOWL['l03-conditioning'], d = spec.defaults, has = k => spec.show.includes(k)
  const [corr, setCorr] = useState(0.3), [scale, setScale] = useState(d.scale ?? 1), [standardize, setStandardize] = useState(d.standardize ?? false)
  const [rateKey, setRateKey] = useState(d.rate), [steps, setSteps] = useState(d.steps), [seed, setSeed] = useState(3), [showFits, setShowFits] = useState(d.showFits ?? has('fits'))
  const rows = useMemo(() => generate({ seed, corr, scale }), [seed, corr, scale])
  const { X, y, stats } = useMemo(() => prepare(rows, standardize), [rows, standardize])
  const curve = useMemo(() => curvature(X), [X])
  // Centered features: the intercept's curvature is 1, so the limit is 1 / max(λmax, 1).
  const lmax = Math.max(curve.eigen.values[0], 1), maxRate = 1 / lmax
  const rate = rateKey === 'stable' ? 0.95 * maxRate : Number(rateKey)
  const ls = useMemo(() => leastSquares(X, y), [X, y])
  const gd = useMemo(() => descend(X, y, rate, steps), [X, y, rate, steps])
  const fits = useMemo(() => showFits && has('fits') ? resampledFits(rows, standardize) : [], [rows, standardize, showFits]) // eslint-disable-line react-hooks/exhaustive-deps
  const last = gd.path.at(-1)
  const start = ls.w ? ls.w[0] * ls.w[0] * curve.A[0][0] + 2 * ls.w[0] * ls.w[1] * curve.A[0][1] + ls.w[1] * ls.w[1] * curve.A[1][1] : 0
  const curves = ls.w ? [0.03, 0.12, 0.3, 0.6, 1].map(f => levelCurve(ls.w, curve.eigen, Math.max(start * f, 1e-9))) : []
  const pts = [...curves.flat(), ...gd.path.map(p => p.w), ...fits, [0, 0], ...(ls.w ? [ls.w] : [])].filter(p => Math.abs(p[0]) < 1e6 && Math.abs(p[1]) < 1e6)
  const [xr, yr] = equalAspect(extent(pts.map(p => p[0]), 0.08), extent(pts.map(p => p[1]), 0.08))
  const orig = w => w && [w[0] / stats.s1, w[1] / stats.s2]
  const origB = (w, b) => w && b - (w[0] / stats.s1) * stats.m1 - (w[1] / stats.s2) * stats.m2
  const e = X.map((r, i) => r[0] * last.w[0] + r[1] * last.w[1] + last.b - y[i]), meanOf = f => e.reduce((t, v, i) => t + f(v, i), 0) / e.length
  const pill = has('eigen') ? `κ = ${Number.isFinite(curve.condition) ? fmt(curve.condition, 1) : '∞'}` : `MSE ${fmt(last.loss, 3)}`
  return <>
    <PanelHeading eyebrow={`Live experiment · lesson ${lessonId === 'l03-bowl' ? '03.4' : lessonId === 'l03-projection' ? '03.5' : lessonId === 'l03-rank' ? '03.6' : lessonId === 'l03-scaling' ? '03.7' : '03.8'}`} title={spec.title} pill={pill} />
    <Caption>{spec.caption}</Caption>
    <Controls>
      {has('corr') && <Slider label="Correlation of x1 and x2" value={corr} min={0} max={1} step={0.01} onChange={setCorr} format={v => v.toFixed(2)} />}
      {has('scale') && <Choice label="Units of x2 (scale)" value={String(scale)} onChange={v => setScale(Number(v))} options={[['1', '× 1 (MB)'], ['10', '× 10'], ['100', '× 100'], ['1000', '× 1000 (≈ KB)']]} />}
      <Choice label="Learning rate α" value={rateKey} onChange={setRateKey} options={[['stable', `largest stable rate ≈ ${small(0.95 * maxRate)}`], ...RATES.map(r => [String(r), String(r)])]} />
      <Slider label="Gradient steps" value={steps} min={0} max={400} step={5} onChange={setSteps} />
      <label>Seed<input type="number" min="0" max="9999" value={seed} onChange={e => e.target.value !== '' && setSeed(Math.max(0, Math.min(9999, Math.trunc(+e.target.value))))} /></label>
      {(has('standardize') || has('fits')) && <div className="ml-toggles">{has('standardize') && <Toggle label="Standardize features (training mean and std)" checked={standardize} onChange={setStandardize} />}{has('fits') && <Toggle label="Show 30 refits on resampled data" checked={showFits} onChange={setShowFits} />}</div>}
    </Controls>
    {ls.rank < 2 && <Warning>Rank 1: x2 is an exact multiple of x1. XᵀX is singular, so infinitely many (w1, w2) pairs give the same minimal loss. There is no unique solution to draw — the bowl became a valley with a flat floor.</Warning>}
    {gd.diverged && <Warning>Gradient descent diverged: α = {small(rate)} is above the stable limit ≈ {small(maxRate)} for this data. Choose “largest stable rate”, or standardize the features.</Warning>}
    <Legend items={[['┄', 'gradient descent path', 'var(--chart-train)'], ['✕', 'least-squares solution', 'var(--text)'], ...(fits.length ? [['●', 'refits on resampled data', 'var(--chart-val)']] : []), ['◯', 'loss contours', 'var(--muted)']]} />
    <Plot x={xr} y={yr} xLabel={`w1 (weight on x1${standardize ? ', standardized' : ''})`} yLabel={`w2 (weight on x2${standardize ? ', standardized' : ''})`} label="Loss contours in weight space with gradient descent path">{({ X: SX, Y: SY }) => <>
      {curves.map((c, i) => <Path key={i} X={SX} Y={SY} points={c} stroke="var(--muted)" width={1} opacity={0.7} />)}
      {fits.map((w, i) => <circle key={i} cx={SX(w[0])} cy={SY(w[1])} r="2.3" fill="var(--chart-val)" opacity="0.7" />)}
      <Path X={SX} Y={SY} points={gd.path.map(p => p.w)} stroke="var(--chart-train)" width={2} dash="4 3" />
      {gd.path.map((p, i) => i % Math.max(1, Math.floor(gd.path.length / 25)) === 0 && <circle key={`p${i}`} cx={SX(p.w[0])} cy={SY(p.w[1])} r="2.2" fill="var(--chart-train)" />)}
      {ls.w && <path d={`M ${SX(ls.w[0]) - 6} ${SY(ls.w[1]) - 6} l 12 12 m -12 0 l 12 -12`} stroke="var(--text)" strokeWidth="2.5" />}
    </>}</Plot>
    <Metrics items={[
      ...(has('eigen') ? [['λmax · λmin of XᵀX/n', `${fmt(curve.eigen.values[0], 2)} · ${fmt(curve.eigen.values[1], 3)}`], ['Condition number κ', Number.isFinite(curve.condition) ? fmt(curve.condition, 1) : '∞ (rank 1)']] : []),
      ...(has('limit') ? [['Stable α below', small(maxRate)], ['α in use', small(rate)]] : [['α in use', small(rate)]]),
      [`MSE after ${steps} steps`, fmt(last.loss, 3)],
      ...(has('eigen') ? [] : [['Least-squares MSE', ls.w ? fmt(mse(X, y, ls.w, ls.b), 3) : '—']]),
    ]} />
    {has('orth') && <Metrics items={[['mean(e)', fmt(meanOf(v => v), 4), 'ones column · e / n'], ['mean(e·x1)', fmt(meanOf((v, i) => v * X[i][0]), 4), 'x1 column · e / n'], ['mean(e·x2)', fmt(meanOf((v, i) => v * X[i][1]), 4), 'x2 column · e / n']]} />}
    {has('table') && <Table head={['', 'w1 (per unit x1)', 'w2 (per unit x2)', 'intercept']} rows={[
      ['least squares', ls.w ? fmt(orig(ls.w)[0], 4) : 'not unique', ls.w ? fmt(orig(ls.w)[1], 5) : 'not unique', ls.w ? fmt(origB(ls.w, ls.b), 3) : '—'],
      [`gradient descent · ${steps} steps`, fmt(orig(last.w)[0], 4), fmt(orig(last.w)[1], 5), fmt(origB(last.w, last.b), 3)],
      ['data-generating truth', '3', fmt(2 / scale, 5), '5'],
    ]} caption="Weights converted back to the original units (divide by the training standard deviation; recover the intercept from the training means). Truth is shown for reference only — real data never tells you this." />}
    <Insight title="What to notice">{INSIGHT[lessonId] ?? INSIGHT['l03-conditioning']}</Insight>
  </>
}
const INSIGHT = {
  'l03-bowl': 'At α = 0.1 the path cuts across the contours toward ✕. At α = 0.01 it heads the same way but needs ten times as many steps. At α = 0.6 it overshoots and zig-zags across the valley — each step still goes downhill from where it starts, just too far.',
  'l03-projection': 'The three orthogonality readouts are the entries of Xᵀe / n. They shrink toward zero exactly as the path reaches ✕: the zero-gradient condition and “the residual is orthogonal to every column” are the same statement.',
  'l03-rank': 'As the correlation approaches 1, the ellipses stretch along a diagonal and the refits spread along it: many (w1, w2) pairs predict almost equally well. At exactly 1 the rank drops and no unique solution exists.',
  'l03-scaling': 'With × 1000 units and no standardization, the largest stable rate is tiny, so after 400 steps w1 has barely moved from 0. Standardize and the same choice of rate is large, the contours are nearly round, and the path goes almost straight to ✕.',
  'l03-conditioning': 'With standardization on, κ depends only on the correlation: about (1 + ρ)/(1 − ρ). The largest stable rate is set by λmax; the number of steps the path needs is set by λmin.',
}
