import { useMemo, useState } from 'react'
import * as T from '../engine/tables.js'
import * as C from '../engine/cleaning.js'
import * as S from '../engine/summary.js'
import * as P from '../engine/patterns.js'
import { ORDERS_CSV, CATALOGUE_CSV, DAYS_CSV, DELIVERIES_CSV, FAR_TOWNS, Rng, noise } from '../engine/data.js'

const f = (x, d = 2) => (x === null || x === undefined || !Number.isFinite(x) ? '–' : Number.isInteger(x) ? String(x) : x.toFixed(d))
const Slider = ({ label, value, min, max, step = 1, onChange, format = v => v }) =>
  <label className="qm-slider">{label} <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /> <b className="mono">{format(value)}</b></label>
const Toggle = ({ options, value, onChange }) => <div className="qm-fig-controls">{options.map(([id, label]) => <button key={id} className={value === id ? 'active' : ''} onClick={() => onChange(id)}>{label}</button>)}</div>
const parseList = text => text.split(/[\s,]+/).map(Number).filter(Number.isFinite)
const BLUE = '#3f5bb5', RED = '#b0413e', GREEN = '#1f6f68', GREY = '#9aa3b2'

let daysCache = null
const days = () => (daysCache ??= P.numberDays(T.readCsv(DAYS_CSV())))
const quiet = () => days().filter(r => r.visits < 9000)
const clean = () => C.cleanOrders(T.readCsv(ORDERS_CSV()), Object.fromEntries(T.readCsv(CATALOGUE_CSV()).map(r => [r.item, T.toPence(r.list_price)])))
// A plot area: maps data to a W × H box with a margin, and draws its frame.
function frame(xs, ys, W = 440, H = 220, m = 30) {
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys)
  const X = v => m + (W - m - 10) * (v - x0) / ((x1 - x0) || 1), Y = v => H - m + 10 - (H - m - 10) * (v - y0) / ((y1 - y0) || 1)
  return { X, Y, W, H, x0, x1, y0, y1 }
}

// 5.1: each day's rectangle from the two means; their mean (over n − 1) is the covariance.
export function Quadrants() {
  const rows = days(), xs = rows.map(r => r.high_c), ys = rows.map(r => r.riders)
  const [k, setK] = useState(180)
  const mx = S.mean(xs), my = S.mean(ys), { X, Y, W, H } = frame(xs, ys)
  const day = rows[Math.max(0, Math.min(rows.length - 1, k - 1))], prod = (day.high_c - mx) * (day.riders - my)
  const products = xs.map((x, i) => (x - mx) * (ys[i] - my))
  const plus = products.filter(p => p > 0), minus = products.filter(p => p < 0)
  return <div className="qm-fig">
    <Slider label="Day of the year" value={k} min={1} max={365} onChange={setK} format={() => day.date} />
    <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Riders against temperature, with the means">
      {rows.map((r, i) => <circle key={i} cx={X(r.high_c)} cy={Y(r.riders)} r="2" fill={products[i] > 0 ? BLUE : RED} fillOpacity=".35" />)}
      <line x1={X(mx)} y1="10" x2={X(mx)} y2={H - 20} stroke="currentColor" strokeDasharray="4 3" />
      <line x1="30" y1={Y(my)} x2={W - 10} y2={Y(my)} stroke="currentColor" strokeDasharray="4 3" />
      <rect x={Math.min(X(mx), X(day.high_c))} y={Math.min(Y(my), Y(day.riders))} width={Math.abs(X(day.high_c) - X(mx))} height={Math.abs(Y(day.riders) - Y(my))} fill={prod > 0 ? BLUE : RED} fillOpacity=".3" stroke={prod > 0 ? BLUE : RED} />
      <circle cx={X(day.high_c)} cy={Y(day.riders)} r="5" fill="none" stroke="currentColor" strokeWidth="2" />
      <text className="qm-tick" x={X(mx) + 4} y="20">x̄ = {f(mx, 1)} °C</text><text className="qm-tick" x="34" y={Y(my) - 4}>ȳ = {f(my, 0)} riders</text>
    </svg>
    <p className="qm-small">{day.date}: {f(day.high_c, 1)} °C, {day.riders} riders · ({f(day.high_c - mx, 2)}) × ({f(day.riders - my, 1)}) = <b style={{ color: prod > 0 ? BLUE : RED }}>{f(prod, 1)}</b></p>
    <p className="qm-small">{plus.length} positive products (sum {f(S.total(plus), 0)}), {minus.length} negative (sum {f(S.total(minus), 0)}) · covariance = {f(S.total(products), 0)} / {rows.length - 1} = <b>{f(P.covariance(xs, ys), 2)}</b></p>
  </div>
}

// 5.2: clouds with a chosen correlation, and two that r misreads.
export function CorrelationShapes() {
  const [target, setTarget] = useState(0.6), [shape, setShape] = useState('line')
  const points = useMemo(() => {
    const rng = new Rng(8), out = []
    for (let i = 0; i < 200; i++) {
      const x = noise(rng), e = noise(rng)
      if (shape === 'line') out.push([x, target * x + Math.sqrt(Math.max(0, 1 - target * target)) * e])
      else if (shape === 'curve') out.push([x, x * x + 0.3 * e])
      else out.push(i === 0 ? [6, 6] : [x, e])
    }
    return out
  }, [target, shape])
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]), r = P.correlation(xs, ys)
  const { X, Y, W, H } = frame(xs, ys)
  return <div className="qm-fig">
    <Toggle value={shape} onChange={setShape} options={[['line', 'A straight-line cloud'], ['curve', 'A U shape'], ['outlier', 'No relation, one far point']]} />
    {shape === 'line' && <Slider label="r chosen" value={target} min={-1} max={1} step={0.05} onChange={setTarget} format={v => v.toFixed(2)} />}
    <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="A cloud of points">
      {points.map(([x, y], i) => <circle key={i} cx={X(x)} cy={Y(y)} r="2.5" fill={BLUE} fillOpacity=".5" />)}
    </svg>
    <p className="qm-small">r measured = <b>{f(r, 3)}</b> · angle between the centred columns = <b>{f((Math.acos(Math.max(-1, Math.min(1, r))) * 180) / Math.PI, 1)}°</b> · Spearman = {f(P.spearman(xs, ys), 3)}</p>
    <p className="qm-hint">{shape === 'line' ? 'y = r·x + √(1 − r²)·noise: the closer |r| is to 1, the closer the cloud is to a line, and the smaller the angle (or the closer to 180°).' : shape === 'curve' ? 'y is exactly x² plus a little noise: a perfect relationship, and r is near 0, because it isn’t a straight line.' : 'Two hundred unrelated points, and one far away at (6, 6): that one point makes r look like a relationship.'}</p>
  </div>
}

// 5.3: values sorted, runs of ties found, each run sharing its mean place.
export function RankTies() {
  const [text, setText] = useState('3 0 0 2.5 0 7 2.5 1')
  const values = parseList(text).slice(0, 30)
  const ranks = P.rank(values), order = values.map((_, k) => k).sort((a, b) => values[a] - values[b])
  return <div className="qm-fig">
    <label className="ds-input"><span>Values (numbers, separated by spaces or commas)</span><input value={text} onChange={e => setText(e.target.value)} spellCheck={false} /></label>
    {values.length === 0 ? <p className="qm-hint">Type some numbers.</p> : <>
      <table className="qm-log"><thead><tr><th>Place</th>{order.map((_, i) => <th key={i}>{i + 1}</th>)}</tr></thead><tbody>
        <tr><td>Value</td>{order.map((k, i) => <td key={i} className="mono">{values[k]}</td>)}</tr>
        <tr><td>Rank</td>{order.map((k, i) => <td key={i} className="mono" style={{ color: values.filter(v => v === values[k]).length > 1 ? RED : undefined }}>{ranks[k]}</td>)}</tr>
      </tbody></table>
      <p className="qm-small">In the order typed: <span className="mono">[{ranks.join(', ')}]</span>. Ties (in red) share the mean of the places they fill.</p>
    </>}
  </div>
}

// 5.4: the fitted line, its residuals, and the squared error of other slopes.
export function LineFit() {
  const rows = days(), xs = rows.map(r => r.high_c), ys = rows.map(r => r.riders)
  const [b0, a0] = P.fitLine(xs, ys)
  const [b, setB] = useState(Math.round(b0 * 10) / 10)
  const mx = S.mean(xs), my = S.mean(ys), a = my - b * mx
  const sse = slope => S.total(xs.map((x, i) => (ys[i] - (my - slope * mx) - slope * x) ** 2))
  const { X, Y, W, H } = frame(xs, ys)
  return <div className="qm-fig">
    <Slider label="Slope (riders per °C)" value={b} min={0} max={50} step={0.5} onChange={setB} format={v => v.toFixed(1)} />
    <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="The line and its residuals">
      {rows.map((r, i) => i % 3 === 0 && <line key={`r${i}`} x1={X(r.high_c)} y1={Y(r.riders)} x2={X(r.high_c)} y2={Y(a + b * r.high_c)} stroke={GREY} strokeDasharray="2 2" />)}
      {rows.map((r, i) => <circle key={i} cx={X(r.high_c)} cy={Y(r.riders)} r="2" fill={BLUE} fillOpacity=".5" />)}
      <line x1={X(Math.min(...xs))} y1={Y(a + b * Math.min(...xs))} x2={X(Math.max(...xs))} y2={Y(a + b * Math.max(...xs))} stroke={RED} strokeWidth="2.5" />
    </svg>
    <p className="qm-small">riders ≈ {f(a, 1)} + {f(b, 1)} × °C · squared error <b>{f(sse(b) / 1e6, 3)} million</b> · at the fitted slope {f(b0, 3)}: <b>{f(sse(b0) / 1e6, 3)} million</b> (intercept {f(a0, 1)})</p>
    <p className="qm-hint">Every third day’s residual is drawn dashed. Each line here passes through the centre (x̄, ȳ); of those, the fitted slope r·s_y/s_x makes the squared error smallest.</p>
  </div>
}

// 5.5: the four sets, their lines, their identical summaries.
export function Anscombe() {
  const [resid, setResid] = useState(false)
  const W = 220, H = 160, x = v => 20 + (W - 30) * (v - 2) / 18, y = v => H - 20 - (H - 30) * (v - 2) / 12
  return <div className="qm-fig">
    <label className="ds-select"><input type="checkbox" checked={resid} onChange={e => setResid(e.target.checked)} /> show the residuals</label>
    <div className="ds-drawings">
      {Object.entries(P.ANSCOMBE).map(([name, [xs, ys]]) => { const [b, a] = P.fitLine(xs, ys); return <svg key={name} className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Set ${name}`}>
        <text className="qm-tick" x="24" y="14">{name}</text>
        <line x1={x(2)} y1={y(a + 2 * b)} x2={x(20)} y2={y(a + 20 * b)} stroke={RED} />
        {resid && xs.map((v, i) => <line key={`r${i}`} x1={x(v)} y1={y(ys[i])} x2={x(v)} y2={y(a + b * v)} stroke={GREY} />)}
        {xs.map((v, i) => <circle key={i} cx={x(v)} cy={y(ys[i])} r="3" fill={BLUE} />)}
      </svg> })}
    </div>
    <table className="qm-log"><thead><tr><th>Set</th><th>mean x</th><th>mean y</th><th>var x</th><th>var y</th><th>r</th><th>line</th><th>Spearman</th></tr></thead><tbody>
      {Object.entries(P.ANSCOMBE).map(([name, [xs, ys]]) => { const d = P.describePair(xs, ys); return <tr key={name}><td>{name}</td>{d.slice(0, 5).map((v, i) => <td key={i} className="mono">{f(v, i < 2 ? 2 : 3)}</td>)}<td className="mono">{f(d[6], 2)} + {f(d[5], 3)}x</td><td className="mono">{f(P.spearman(xs, ys), 3)}</td></tr> })}
    </tbody></table>
  </div>
}

// 5.6: visits against temperature, on an ordinary and a log axis.
export function LogStraightens() {
  const rows = quiet(), xs = rows.map(r => r.high_c), raw = rows.map(r => r.visits)
  const [scale, setScale] = useState('linear')
  const ys = scale === 'log' ? raw.map(Math.log) : raw
  const [b, a] = P.fitLine(xs, ys), res = P.residuals(xs, ys)
  const spread = keep => S.std(res.filter((_, i) => keep(xs[i])))
  const { X, Y, W, H } = frame(xs, ys)
  return <div className="qm-fig">
    <Toggle value={scale} onChange={setScale} options={[['linear', 'Visits'], ['log', 'ln(visits)']]} />
    <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Visits against temperature">
      {xs.map((x, i) => <circle key={i} cx={X(x)} cy={Y(ys[i])} r="2" fill={BLUE} fillOpacity=".5" />)}
      <line x1={X(Math.min(...xs))} y1={Y(a + b * Math.min(...xs))} x2={X(Math.max(...xs))} y2={Y(a + b * Math.max(...xs))} stroke={RED} strokeWidth="2" />
    </svg>
    <p className="qm-small">{scale === 'log' ? <>ln(visits) ≈ {f(a, 3)} + {f(b, 4)} × °C: each degree multiplies the visits by e<sup>{f(b, 4)}</sup> = <b>{f(Math.exp(b), 4)}</b></> : <>visits ≈ {f(a, 1)} + {f(b, 2)} × °C</>} · spread of the residuals below 10 °C: <b>{f(spread(x => x < 10), 3)}</b>, above 18 °C: <b>{f(spread(x => x > 18), 3)}</b></p>
    <p className="qm-hint">{scale === 'log' ? 'On the log scale the cloud is straight and its spread is the same on cold and warm days: the effect multiplies.' : 'On the ordinary scale the cloud bends upwards and fans out: the residuals of warm days spread about twice as far as those of cold days.'}</p>
  </div>
}

// 5.7: the orders by quantity and item, plain, faint and jittered.
const ITEMS = ['Bike', 'Helmet', 'Lights, front and back', 'Lock', 'Inner tube', 'Service']
export function Overplotting() {
  const rows = useMemo(clean, [])
  const [amount, setAmount] = useState(0), [opacity, setOpacity] = useState(1)
  const jx = useMemo(() => P.jitter(rows.map(() => 0), 1, 17), [rows]), jy = useMemo(() => P.jitter(rows.map(() => 0), 1, 23), [rows])
  const W = 440, H = 220, X = q => 170 + 250 * (q - 0.5) / 3, Y = item => 24 + 34 * ITEMS.indexOf(item)
  const counts = S.groupBy(rows.map(r => ({ k: `${r.item}|${r.quantity}` })), 'k')
  return <div className="qm-fig">
    <Slider label="Jitter (quantity units)" value={amount} min={0} max={0.5} step={0.05} onChange={setAmount} format={v => v.toFixed(2)} />
    <Slider label="Opacity" value={opacity} min={0.05} max={1} step={0.05} onChange={setOpacity} format={v => v.toFixed(2)} />
    <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Orders by quantity and item">
      {ITEMS.map(item => <text key={item} className="qm-tick" x="4" y={Y(item) + 4}>{item}</text>)}
      {[1, 2, 3].map(q => <text key={q} className="qm-tick" x={X(q) - 3} y={H - 6}>{q}</text>)}
      {rows.map((r, i) => <circle key={i} cx={X(r.quantity + amount * jx[i])} cy={Y(r.item) + 28 * amount * jy[i]} r="3" fill={BLUE} fillOpacity={opacity} />)}
    </svg>
    <p className="qm-small">{rows.length} orders on <b>{counts.size}</b> spots · the fullest: {[...counts].sort((a, b) => b[1].length - a[1].length).slice(0, 3).map(([k, v]) => `${k.replace('|', ' × ')}: ${v.length}`).join(' · ')}</p>
  </div>
}

// 5.9: each courier's overall rate as a weighted average of its far and near rates.
export function Simpson() {
  const towns = useMemo(() => Object.fromEntries(clean().map(r => [r.order_id, r.town])), [])
  const rows = useMemo(() => T.readCsv(DELIVERIES_CSV()).map(r => ({ ...r, far: FAR_TOWNS.includes(towns[r.order_id]) ? 'far' : 'near' })).map(r => ({ ...r, group: `${r.courier} ${r.far}` })), [towns])
  const g = P.rateBy(rows, 'group', 'on_time', 'yes'), rate = ([h, n]) => h / n
  const actual = c => g[`${c} far`][1] / (g[`${c} far`][1] + g[`${c} near`][1])
  const [wN, setWN] = useState(Math.round(1000 * actual('Northern')) / 10), [wS, setWS] = useState(Math.round(1000 * actual('Swift')) / 10)
  const overall = (c, w) => (w / 100) * rate(g[`${c} far`]) + (1 - w / 100) * rate(g[`${c} near`])
  const W = 440, bar = (v, i, colour, label) => <g key={label}><rect x="150" y={14 + i * 26} width={260 * v} height="18" fill={colour} /><text className="qm-tick" x="4" y={27 + i * 26}>{label}</text><text className="qm-tick" x={156 + 260 * v} y={27 + i * 26}>{(100 * v).toFixed(1)}%</text></g>
  return <div className="qm-fig">
    <Slider label="Northern’s parcels that are far" value={wN} min={0} max={100} step={0.1} onChange={setWN} format={v => `${v.toFixed(1)}%`} />
    <Slider label="Swift’s parcels that are far" value={wS} min={0} max={100} step={0.1} onChange={setWS} format={v => `${v.toFixed(1)}%`} />
    <svg className="qm-plot" viewBox={`0 0 ${W} 170`} role="img" aria-label="On-time rates">
      {bar(rate(g['Northern far']), 0, GREEN, `Northern, far (${g['Northern far'][0]}/${g['Northern far'][1]})`)}
      {bar(rate(g['Swift far']), 1, BLUE, `Swift, far (${g['Swift far'][0]}/${g['Swift far'][1]})`)}
      {bar(rate(g['Northern near']), 2, GREEN, `Northern, near (${g['Northern near'][0]}/${g['Northern near'][1]})`)}
      {bar(rate(g['Swift near']), 3, BLUE, `Swift, near (${g['Swift near'][0]}/${g['Swift near'][1]})`)}
      {bar(overall('Northern', wN), 4.3, GREEN, 'Northern, overall')}
      {bar(overall('Swift', wS), 5.3, BLUE, 'Swift, overall')}
    </svg>
    <p className="qm-hint">The four group rates are the data’s and don’t move. The overall rates are w × far + (1 − w) × near. At the real shares (Northern {(100 * actual('Northern')).toFixed(1)}% far, Swift {(100 * actual('Swift')).toFixed(1)}%), Northern wins both groups and loses overall. Give both couriers the same share and the paradox is gone.</p>
  </div>
}

// 5.10: three worlds, and what holding z fixed or selecting on it does to r.
const WORLDS = { confounder: 'Confounder: z → x, z → y', collider: 'Collider: x → z ← y', independent: 'Nothing related' }
export function CausalSims() {
  const [world, setWorld] = useState('confounder'), [mode, setMode] = useState('all')
  const rows = useMemo(() => P.simulate(world, 2000, 3), [world])
  const shown = mode === 'band' ? rows.filter(r => Math.abs(r[2]) < 0.25) : mode === 'selected' ? rows.filter(r => r[2] > 1) : rows
  const r = shown.length > 2 ? P.correlation(shown.map(p => p[0]), shown.map(p => p[1])) : NaN
  const partial = P.partialCorrelation(rows.map(p => p[0]), rows.map(p => p[1]), rows.map(p => p[2]))
  const W = 440, H = 220, X = v => W / 2 + 45 * v, Y = v => H / 2 - 25 * v
  const colour = z => (z > 0.5 ? BLUE : z < -0.5 ? RED : GREY)
  return <div className="qm-fig">
    <Toggle value={world} onChange={setWorld} options={Object.entries(WORLDS)} />
    <Toggle value={mode} onChange={setMode} options={[['all', 'All rows'], ['band', 'z held fixed (|z| < 0.25)'], ['selected', 'Only rows with z > 1']]} />
    <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="y against x, coloured by z">
      {shown.slice(0, 800).map(([x, y, z], i) => <circle key={i} cx={X(x)} cy={Y(y)} r="2" fill={colour(z)} fillOpacity=".45" />)}
    </svg>
    <p className="qm-small">{shown.length} rows shown · r(x, y) = <b>{f(r, 3)}</b> · over all 2,000 rows, partial r given z = <b>{f(partial, 3)}</b></p>
    <p className="qm-hint">Blue: z above 0.5, red: below −0.5. {world === 'confounder' ? 'x and y share z, so they rise together; within a thin band of z the link is almost gone.' : world === 'collider' ? 'x and y are unrelated; but among rows with high z (= x + y), a low x needs a high y. Selecting on z, or holding it fixed, creates a link.' : 'Whatever you do, r stays near 0.'}</p>
  </div>
}
