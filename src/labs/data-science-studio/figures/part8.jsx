import { useMemo, useState } from 'react'
import * as T from '../engine/tables.js'
import * as C from '../engine/cleaning.js'
import * as S from '../engine/summary.js'
import * as P from '../engine/patterns.js'
import * as M from '../engine/samples.js'
import * as F from '../engine/models.js'
import { ORDERS_CSV, CATALOGUE_CSV, DAYS_CSV, DELIVERIES_CSV, FAR_TOWNS, ON_TIME } from '../engine/data.js'

const f = (x, d = 2) => (x === null || x === undefined || !Number.isFinite(x) ? '–' : Number.isInteger(x) ? String(x) : x.toFixed(d))
const Slider = ({ label, value, min, max, step = 1, onChange, format = v => v }) =>
  <label className="qm-slider">{label} <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /> <b className="mono">{format(value)}</b></label>
const Toggle = ({ options, value, onChange }) => <div className="qm-fig-controls">{options.map(([id, label]) => <button key={id} className={value === id ? 'active' : ''} onClick={() => onChange(id)}>{label}</button>)}</div>
const BLUE = '#3f5bb5', RED = '#b0413e', GREEN = '#1f6f68', GREY = '#9aa3b2'
const ALL = [...Array(365).keys()]

let daysCache = null
const days = () => (daysCache ??= P.numberDays(T.readCsv(DAYS_CSV())))
const temps = () => days().map(r => r.high_c), riders = () => days().map(r => r.riders)
const design = () => days().map(r => [1, r.high_c, r.rain_mm, F.weekday(r.date) >= 5 ? 1 : 0])

// 8.1: a line chosen by hand, its misses and its loss.
export function ModelLoss() {
  const xs = useMemo(temps, []), ys = useMemo(riders, [])
  const [best] = useState(() => F.leastSquares(xs, ys))
  const [a, setA] = useState(300), [b, setB] = useState(20)
  const loss = S.total(xs.map((x, k) => (ys[k] - a - b * x) ** 2)), bestLoss = S.total(xs.map((x, k) => (ys[k] - best[1] - best[0] * x) ** 2))
  const W = 440, H = 220, X = v => 30 + (W - 40) * v / 30, Y = v => H - 20 - (H - 30) * v / 1300
  return <div className="qm-fig">
    <Slider label="Intercept a" value={a} min={0} max={600} onChange={setA} />
    <Slider label="Slope b (riders per °C)" value={b} min={0} max={45} step={0.5} onChange={setB} />
    <div className="qm-fig-controls"><button onClick={() => { setA(Math.round(best[1])); setB(Math.round(best[0] * 2) / 2) }}>Near the least-squares line</button></div>
    <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Riders against temperature with a chosen line">
      {xs.map((x, k) => k % 3 === 0 && <line key={`m${k}`} x1={X(x)} x2={X(x)} y1={Y(ys[k])} y2={Y(a + b * x)} stroke={RED} strokeOpacity=".35" />)}
      {xs.map((x, k) => <circle key={k} cx={X(x)} cy={Y(ys[k])} r="2" fill={BLUE} fillOpacity=".45" />)}
      <line x1={X(0)} x2={X(30)} y1={Y(a)} y2={Y(a + 30 * b)} stroke={RED} strokeWidth="2" />
      {[0, 10, 20, 30].map(v => <text key={v} className="qm-tick" x={X(v)} y={H - 6} textAnchor={v === 30 ? 'end' : 'middle'}>{v} °C</text>)}
    </svg>
    <p className="qm-small">Loss Σ(y − a − bx)² = <b>{Math.round(loss).toLocaleString('en-GB')}</b> · the least-squares line ({f(best[1], 1)} + {f(best[0], 2)}x): <b>{Math.round(bestLoss).toLocaleString('en-GB')}</b> · yours is <b>{f(loss / bestLoss, 3)}</b> times as big (a third of the misses drawn)</p>
  </div>
}

// 8.3: the elimination of the riders' normal equations, one step at a time.
export function EliminationSteps() {
  const steps = useMemo(() => { const [A, b] = F.normalEquations(design(), riders()); const out = []; const w = F.solve(A, b, out); return { start: A.map((row, i) => [...row, b[i]]), out, w } }, [])
  const [k, setK] = useState(0)
  const step = k === 0 ? null : steps.out[k - 1], M2 = step ? step.matrix : steps.start
  const names = ['1', 'temp', 'rain', 'weekend', '= y']
  return <div className="qm-fig">
    <Slider label="Step" value={k} min={0} max={steps.out.length} onChange={setK} format={v => `${v} of ${steps.out.length}`} />
    <table className="qm-log mono"><thead><tr><th></th>{names.map(n => <th key={n}>{n}</th>)}</tr></thead>
      <tbody>{M2.map((row, r) => <tr key={r} style={step && r === step.row ? { background: 'rgba(176,65,62,.12)' } : step && r === step.column ? { background: 'rgba(63,91,181,.12)' } : null}>
        <td>eq {r + 1}</td>{row.map((v, c) => <td key={c} style={{ textAlign: 'right', color: Math.abs(v) < 1e-9 && c < 4 ? GREY : undefined }}>{Math.abs(v) < 1e-9 ? '0' : Math.abs(v) >= 1000 ? v.toFixed(0) : v.toFixed(3)}</td>)}
      </tr>)}</tbody></table>
    <p className="qm-small">{!step ? 'The normal equations XᵀX w = Xᵀy, as they start.'
      : step.kind === 'swap' ? (step.row === step.column ? `Column ${step.column + 1}: the largest entry from row ${step.column + 1} down is already in row ${step.column + 1}: the pivot.` : `Column ${step.column + 1}: swap rows ${step.column + 1} and ${step.row + 1}, to put the largest entry on the diagonal.`)
        : `Row ${step.row + 1} minus ${f(step.factor, 5)} × row ${step.column + 1}: column ${step.column + 1} becomes 0 there.`}
      {k === steps.out.length && <> Back substitution from the last row up: w = <b>{steps.w.map(v => f(v, 2)).join(', ')}</b>.</>}</p>
  </div>
}

// 8.6: gradient descent on two weights (intercept, weight on temperature), raw or standardised.
export function DescentPath() {
  const [units, setUnits] = useState('standard'), [rate, setRate] = useState(0.5)
  const xs = useMemo(temps, []), ys = useMemo(riders, [])
  const zx = useMemo(() => F.standardise(xs)[0], [xs])
  const X2 = (units === 'standard' ? zx : xs).map(x => [1, x])
  const maxRate = 2 / Math.max(...(() => { const [A] = F.normalEquations(X2, ys); const a = 2 * A[0][0] / 365, b = 2 * A[0][1] / 365, d = 2 * A[1][1] / 365; const tr = a + d, det = a * d - b * b; return [tr / 2 + Math.sqrt(tr * tr / 4 - det)] })())
  const r = units === 'standard' ? rate : (rate * maxRate) / 0.82
  const path = useMemo(() => { const p = [[0, 0]]; F.gradientDescent(X2, ys, r, 60, p); return p }, [units, r])
  const target = F.fit(X2, ys)
  const lossAt = w => S.mean(ys.map((y, k) => (y - w[0] - w[1] * X2[k][1]) ** 2))
  const W = 440, H = 220
  const [w0max, w1lo, w1hi] = units === 'standard' ? [800, -50, 250] : [800, -10, 60]
  const X = v => 30 + (W - 40) * v / w0max, Y = v => H - 20 - (H - 30) * (v - w1lo) / (w1hi - w1lo)
  const grid = []
  for (let i = 0; i <= 24; i++) for (let j = 0; j <= 16; j++) { const w = [w0max * i / 24, w1lo + (w1hi - w1lo) * j / 16]; grid.push([w, Math.log(lossAt(w))]) }
  const lo = Math.min(...grid.map(g => g[1])), hi = Math.max(...grid.map(g => g[1]))
  const shown = path.filter(w => w.every(Number.isFinite) && Math.abs(w[0]) < 1e6 && Math.abs(w[1]) < 1e6)
  return <div className="qm-fig">
    <Toggle value={units} onChange={setUnits} options={[['standard', 'Temperature in standard units'], ['raw', 'Temperature in °C']]} />
    <Slider label={units === 'standard' ? 'Rate' : 'Rate (as a share of the limit)'} value={rate} min={0.05} max={1.2} step={0.05} onChange={setRate} format={v => (units === 'standard' ? v.toFixed(2) : `${f(r, 5)} (${(100 * r / maxRate).toFixed(0)}% of ${f(maxRate, 5)})`)} />
    <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="The path of gradient descent">
      {grid.map(([w, l], k) => <rect key={k} x={X(w[0]) - (W - 40) / 48} y={Y(w[1]) - (H - 30) / 32} width={(W - 40) / 24 + 0.5} height={(H - 30) / 16 + 0.5} fill={BLUE} fillOpacity={0.05 + 0.45 * (hi - l) / (hi - lo)} />)}
      <polyline fill="none" stroke={RED} strokeWidth="1.5" points={shown.map(w => `${X(w[0])},${Y(w[1])}`).join(' ')} />
      {shown.map((w, k) => <circle key={k} cx={X(w[0])} cy={Y(w[1])} r="2" fill={RED} />)}
      <circle cx={X(target[0])} cy={Y(target[1])} r="5" fill="none" stroke={GREEN} strokeWidth="2" />
      <text className="qm-tick" x={W - 10} y={H - 4} textAnchor="end">intercept →</text><text className="qm-tick" x="34" y="14">weight on temperature ↑</text>
    </svg>
    <p className="qm-small">After 60 steps: ({f(path[60]?.[0], 1)}, {f(path[60]?.[1], 2)}) · the answer ({f(target[0], 1)}, {f(target[1], 2)}) · the largest rate that works here: {f(maxRate, 5)}{r > maxRate ? <b style={{ color: RED }}> · above it: the walk diverges</b> : ''}</p>
  </div>
}

// 8.7–8.8: a curve through 20 days, its errors, and ridge's shrinking.
const curveOn = (degree, lam) => {
  const H = temps(), RI = riders(), tr = M.sampleWithout(ALL, 20, 3), inTr = new Set(tr), te = ALL.filter(i => !inTr.has(i))
  const m = S.mean(tr.map(i => H[i])), s = S.std(tr.map(i => H[i])), z = H.map(h => (h - m) / s)
  const Q = F.scaledPowers(z, degree, tr), w = F.ridge(tr.map(i => Q[i]), tr.map(i => RI[i]), lam)
  const grid = Array.from({ length: 121 }, (_, k) => 0 + 30 * k / 120)
  const Qg = (() => { const P2 = F.polynomial(grid.map(h => (h - m) / s), degree), base = F.polynomial(tr.map(i => z[i]), degree); const st = Array.from({ length: degree }, (_, j) => { const col = base.map(r => r[j + 1]); return [S.mean(col), S.std(col)] }); return P2.map(r => [1, ...st.map(([mm, ss], j) => (r[j + 1] - mm) / ss)]) })()
  return { tr, te, w, curve: grid.map((h, k) => [h, F.predict([Qg[k]], w)[0]]), train: F.rmse(tr.map(i => RI[i]), F.predict(tr.map(i => Q[i]), w)), test: F.rmse(te.map(i => RI[i]), F.predict(te.map(i => Q[i]), w)) }
}
function CurvePlot({ fit }) {
  const H = temps(), RI = riders(), W = 440, HH = 220, X = v => 30 + (W - 40) * v / 30, Y = v => HH - 20 - (HH - 30) * (v + 200) / 1500
  const clip = v => Math.max(-200, Math.min(1300, v))
  return <svg className="qm-plot" viewBox={`0 0 ${W} ${HH}`} role="img" aria-label="A curve through 20 days">
    {fit.te.map(i => <circle key={i} cx={X(H[i])} cy={Y(RI[i])} r="1.8" fill={GREY} fillOpacity=".5" />)}
    {fit.tr.map(i => <circle key={`t${i}`} cx={X(H[i])} cy={Y(RI[i])} r="4" fill={BLUE} />)}
    <polyline fill="none" stroke={RED} strokeWidth="2" points={fit.curve.map(([h, p]) => `${X(h)},${Y(clip(p))}`).join(' ')} />
    {[0, 10, 20, 30].map(v => <text key={v} className="qm-tick" x={X(v)} y={HH - 6} textAnchor={v === 30 ? 'end' : 'middle'}>{v} °C</text>)}
  </svg>
}
export function Overfit() {
  const [degree, setDegree] = useState(1)
  const fit = useMemo(() => curveOn(degree, 0), [degree])
  return <div className="qm-fig">
    <Slider label="Degree" value={degree} min={0} max={9} onChange={setDegree} />
    <CurvePlot fit={fit} />
    <p className="qm-small">Error on the 20 days: <b>{f(fit.train, 1)}</b> riders · on the other 345: <b style={{ color: fit.test > 2 * fit.train ? RED : undefined }}>{f(fit.test, 1)}</b> · largest weight {f(Math.max(0, ...fit.w.slice(1).map(Math.abs)), 0)}</p>
  </div>
}
export function RidgePath() {
  const [logLam, setLogLam] = useState(1)
  const lam = logLam <= -3 ? 0 : 10 ** logLam
  const fit = useMemo(() => curveOn(9, lam), [lam])
  return <div className="qm-fig">
    <Slider label="λ" value={logLam} min={-3} max={3} step={0.25} onChange={setLogLam} format={() => (lam === 0 ? '0' : lam < 1 ? lam.toFixed(3) : lam.toFixed(1))} />
    <CurvePlot fit={fit} />
    <p className="qm-small">Degree 9 · error on the 20 days <b>{f(fit.train, 1)}</b> · on the other 345 <b>{f(fit.test, 1)}</b> · weights (after the intercept): <span className="mono">{fit.w.slice(1).map(v => f(v, 0)).join(' ')}</span></p>
  </div>
}

// 8.9: the folds of the year, random or by month.
export function FoldView() {
  const [kind, setKind] = useState('random'), [held, setHeld] = useState(0)
  const folds = useMemo(() => (kind === 'random' ? F.kFolds(365, 12, 5) : F.groupFolds(days().map(r => r.date.slice(5, 7)))), [kind])
  const inFold = new Set(folds[held])
  return <div className="qm-fig">
    <Toggle value={kind} onChange={setKind} options={[['random', '12 random folds'], ['month', 'One fold per month']]} />
    <Slider label="Fold held out" value={held} min={0} max={11} onChange={setHeld} format={v => v + 1} />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(31, 1fr)', gap: 1 }}>
      {ALL.map(i => <span key={i} title={days()[i].date} style={{ height: 9, background: inFold.has(i) ? RED : BLUE, opacity: inFold.has(i) ? 0.9 : 0.25 }} />)}
    </div>
    <p className="qm-small">Red: the {folds[held].length} days held out and predicted; blue: the days the model learns from. {kind === 'random' ? 'Each red day has blue neighbours.' : 'A whole month at once: the model must bridge the gap.'}</p>
  </div>
}

// 8.10: the four groups of parcels as the logistic fit runs.
export function LogisticFit() {
  const data = useMemo(() => {
    const clean = C.cleanOrders(T.readCsv(ORDERS_CSV()), Object.fromEntries(T.readCsv(CATALOGUE_CSV()).map(r => [r.item, T.toPence(r.list_price)])))
    const town = Object.fromEntries(clean.map(r => [r.order_id, r.town])), del = T.readCsv(DELIVERIES_CSV())
    return del.map(r => { const n = r.courier === 'Northern' ? 1 : 0, fa = FAR_TOWNS.includes(town[r.order_id]) ? 1 : 0; return { x: [1, n, fa, n * fa], y: r.on_time === 'yes' ? 1 : 0, n, fa } })
  }, [])
  const [steps, setSteps] = useState(200)
  const w = useMemo(() => F.logisticFit(data.map(d => d.x), data.map(d => d.y), 1, steps), [data, steps])
  const groups = [[1, 1, 'Northern, far'], [1, 0, 'Northern, near'], [0, 1, 'Swift, far'], [0, 0, 'Swift, near']].map(([n, fa, label]) => {
    const rows = data.filter(d => d.n === n && d.fa === fa)
    return { label, count: rows.length, rate: S.mean(rows.map(d => d.y)), p: F.sigmoid(w[0] + w[1] * n + w[2] * fa + w[3] * n * fa), truth: ON_TIME[n ? 'Northern' : 'Swift'][fa ? 0 : 1] / 100 }
  })
  const loss = F.logLoss(data.map(d => d.y), data.map(d => F.sigmoid(d.x.reduce((s, x, j) => s + x * w[j], 0))))
  const W = 440, H = 200, X = k => 50 + k * 100, Y = v => H - 24 - (H - 34) * v
  return <div className="qm-fig">
    <Slider label="Steps of gradient descent" value={steps} min={0} max={5000} step={50} onChange={setSteps} />
    <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Probabilities of being on time">
      {groups.map((g, k) => <g key={g.label}>
        <rect x={X(k)} width="50" y={Y(g.p)} height={H - 24 - Y(g.p)} fill={BLUE} fillOpacity=".6" />
        <line x1={X(k) - 6} x2={X(k) + 56} y1={Y(g.rate)} y2={Y(g.rate)} stroke="currentColor" strokeWidth="2" />
        <circle cx={X(k) + 25} cy={Y(g.truth)} r="5" fill={RED} />
        <text className="qm-tick" x={X(k) + 25} y={H - 8} textAnchor="middle">{g.label} ({g.count})</text>
      </g>)}
    </svg>
    <p className="qm-small">Bars: the model’s probability · black lines: the share on time in the data · red: the generator’s truth · log loss <b>{f(loss, 4)}</b> · weights <span className="mono">{w.map(v => f(v, 2)).join(', ')}</span></p>
  </div>
}
