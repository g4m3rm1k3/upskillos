import { useMemo, useState } from 'react'
import * as T from '../engine/tables.js'
import * as C from '../engine/cleaning.js'
import * as P from '../engine/patterns.js'
import * as M from '../engine/samples.js'
import * as W from '../engine/forecasting.js'
import { ORDERS_CSV, CATALOGUE_CSV, DAYS_CSV, Rng, makeDays } from '../engine/data.js'

const f = (x, d = 2) => (x === null || x === undefined || !Number.isFinite(x) ? '–' : Number.isInteger(x) ? String(x) : x.toFixed(d))
const Slider = ({ label, value, min, max, step = 1, onChange, format = v => v }) =>
  <label className="qm-slider">{label} <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /> <b className="mono">{format(value)}</b></label>
const Toggle = ({ options, value, onChange }) => <div className="qm-fig-controls">{options.map(([id, label]) => <button key={id} className={value === id ? 'active' : ''} onClick={() => onChange(id)}>{label}</button>)}</div>
const BLUE = '#3f5bb5', RED = '#b0413e', GREEN = '#1f6f68', GREY = '#9aa3b2', GOLD = '#b7791f'
const MONTH_STARTS = [[0, 'Jan'], [59, 'Mar'], [120, 'May'], [181, 'Jul'], [243, 'Sep'], [304, 'Nov']]

let daysCache = null
const days = () => (daysCache ??= P.numberDays(T.readCsv(DAYS_CSV())))
const riders = () => days().map(r => r.riders)
const dates = () => days().map(r => r.date)
let quietCache = null
// The visits with the news day's usual value put back (the generator records it).
const quietVisits = () => (quietCache ??= (() => { const truth = {}; makeDays(5, truth); return days().map(r => truth[r.date] ?? r.visits) })())
let ordersCache = null
const ordersPerDay = () => (ordersCache ??= (() => {
  const prices = Object.fromEntries(T.readCsv(CATALOGUE_CSV()).map(r => [r.item, T.toPence(r.list_price)]))
  return M.ordersPerDay(C.cleanOrders(T.readCsv(ORDERS_CSV()), prices).map(r => r.date))
})())
function shuffled(values, seed) {
  const out = [...values], rng = new Rng(seed)
  for (let i = out.length - 1; i > 0; i--) { const j = rng.below(i + 1);[out[i], out[j]] = [out[j], out[i]] }
  return out
}

// A path through the points that have a value (a gap where one is null).
function pathOf(values, X, Y) {
  let d = '', pen = false
  values.forEach((v, k) => { if (v === null || v === undefined || !Number.isFinite(v)) { pen = false; return } d += `${pen ? 'L' : 'M'}${X(k).toFixed(1)},${Y(v).toFixed(1)}`; pen = true })
  return d
}
// A year along the bottom: 365 days across, months marked.
function YearAxis({ X, H }) {
  return MONTH_STARTS.map(([d, name]) => <text key={d} className="qm-tick" x={X(d)} y={H - 6}>{name}</text>)
}
const extent = (lists, pad = 0.05) => {
  const vals = lists.flat().filter(v => v !== null && Number.isFinite(v))
  const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1
  return [lo - pad * span, hi + pad * span]
}

// 9.1: the riders in time order, and shuffled: the same values, and yesterday no longer says anything.
export function TimeShuffle() {
  const ys = useMemo(riders, [])
  const [order, setOrder] = useState('time'), [seed, setSeed] = useState(1)
  const shown = useMemo(() => (order === 'time' ? ys : shuffled(ys, seed)), [order, seed, ys])
  const r = P.correlation(shown.slice(0, -1), shown.slice(1))
  const W1 = 300, W2 = 150, H = 200, [lo, hi] = extent([ys])
  const X = k => 26 + (W1 - 32) * k / 364, Y = v => H - 18 - (H - 28) * (v - lo) / (hi - lo)
  const SX = v => W1 + 14 + (W2 - 20) * (v - lo) / (hi - lo)
  return <div className="qm-fig">
    <Toggle options={[['time', 'In time order'], ['shuffled', 'Shuffled']]} value={order} onChange={setOrder} />
    {order === 'shuffled' && <div className="qm-fig-controls"><button onClick={() => setSeed(s => s + 1)}>Shuffle again</button></div>}
    <svg className="qm-plot" viewBox={`0 0 ${W1 + W2 + 10} ${H}`} role="img" aria-label="Riders by day, and each day against the next">
      <path d={pathOf(shown, X, Y)} fill="none" stroke={BLUE} strokeWidth="1" />
      {order === 'time' && <YearAxis X={X} H={H} />}
      {shown.slice(0, -1).map((v, k) => <circle key={k} cx={SX(v)} cy={Y(shown[k + 1])} r="1.6" fill={RED} fillOpacity=".4" />)}
      <text className="qm-tick" x={W1 + 14} y={H - 6}>today →</text>
      <text className="qm-tick" x={W1 + 14} y={12}>↑ tomorrow</text>
    </svg>
    <p className="qm-small">Mean {f(ys.reduce((s, v) => s + v, 0) / ys.length, 1)} riders either way: the same 365 numbers. Today against tomorrow: r = <b>{f(r, 3)}</b>{order === 'time' ? ': a warm day tends to follow a warm day.' : ': the order was the information.'}</p>
  </div>
}

// 9.2: a window of k days slides along; the slow way adds every day of it, the running sum two.
export function WindowSlide() {
  const ys = useMemo(riders, [])
  const [k, setK] = useState(7), [end, setEnd] = useState(120)
  const kk = Math.max(1, Math.min(90, k)), e = Math.max(kk - 1, Math.min(364, end))
  const ma = useMemo(() => [...Array(kk - 1).fill(null), ...W.movingAverage(ys, kk)], [kk, ys])
  const slow = (365 - kk + 1) * kk, fast = kk + 2 * (365 - kk)
  const Wd = 440, H = 200, [lo, hi] = extent([ys])
  const X = d => 26 + (Wd - 32) * d / 364, Y = v => H - 18 - (H - 28) * (v - lo) / (hi - lo)
  return <div className="qm-fig">
    <Slider label="Window k (days)" value={kk} min={1} max={90} onChange={setK} />
    <Slider label="Window ends on day" value={e} min={0} max={364} onChange={setEnd} />
    <svg className="qm-plot" viewBox={`0 0 ${Wd} ${H}`} role="img" aria-label="Riders by day with a moving average">
      <rect x={X(e - kk + 1) - 1} width={X(e) - X(e - kk + 1) + 2} y={8} height={H - 26} fill={GOLD} fillOpacity=".15" />
      {ys.map((v, d) => <circle key={d} cx={X(d)} cy={Y(v)} r="1.4" fill={BLUE} fillOpacity=".35" />)}
      <path d={pathOf(ma, X, Y)} fill="none" stroke={RED} strokeWidth="2" />
      <YearAxis X={X} H={H} />
    </svg>
    <p className="qm-small">Days {e - kk + 1} to {e}: average <b>{f(ma[e], 1)}</b> riders. All {365 - kk + 1} windows: the slow way <b>{slow.toLocaleString('en-GB')}</b> additions, the running sum <b>{fast.toLocaleString('en-GB')}</b> (the first window, then one in and one out per day).</p>
  </div>
}

// 9.3: riders = trend + season + rest, the season one index per weekday.
export function Decomposition() {
  const ys = useMemo(riders, [])
  const [period, setPeriod] = useState(7)
  const [trend, season, rest] = useMemo(() => W.decompose(ys, period), [period, ys])
  const names = ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue']
  const Wd = 440, h = 80
  const panel = (values, top, colour, label) => {
    const [lo, hi] = extent([values]), X = d => 26 + (Wd - 32) * d / 364, Y = v => top + h - 6 - (h - 14) * (v - lo) / (hi - lo)
    return <g key={label}><text className="qm-tick" x={4} y={top + 12}>{label}</text><path d={pathOf(values, X, Y)} fill="none" stroke={colour} strokeWidth="1" /></g>
  }
  const seasonal = ys.map((_, t) => season[t % period])
  return <div className="qm-fig">
    <Toggle options={[[7, 'Period 7 (a week)'], [5, 'Period 5 (wrong)'], [29, 'Period 29']]} value={period} onChange={setPeriod} />
    <svg className="qm-plot" viewBox={`0 0 ${Wd} ${4 * h + 14}`} role="img" aria-label="Riders split into trend, season and rest">
      {panel(ys, 0, BLUE, 'riders')}{panel(trend, h, RED, 'trend')}{panel(seasonal, 2 * h, GREEN, 'season')}{panel(rest, 3 * h, GREY, 'rest')}
      <YearAxis X={d => 26 + (Wd - 32) * d / 364} H={4 * h + 14} />
    </svg>
    <p className="qm-small">{period === 7 ? <>The seven indices: {season.map((s, i) => <span key={i}>{names[i]} <b>{f(s, 1)}</b>{i < 6 ? ' · ' : ''}</span>)}. Day 0 is Wednesday 1 January.</> : <>With a period of {period}, the indices range from {f(Math.min(...season), 1)} to {f(Math.max(...season), 1)}: no real cycle that long, so the "season" is noise and the weekend stays in the rest.</>}</p>
  </div>
}

// 9.4: autocorrelation bars for several series, with the band chance alone stays inside 95% of the time.
const SERIES = {
  riders: ['Riders', () => riders()],
  high: ['Temperature', () => days().map(r => r.high_c)],
  rain: ['Rain', () => days().map(r => r.rain_mm)],
  visits: ['Visits', () => days().map(r => r.visits)],
  quiet: ['Visits, news day fixed', quietVisits],
  orders: ['Orders per day', ordersPerDay],
  shuffled: ['Riders shuffled', () => shuffled(riders(), 1)],
}
export function AcfBars() {
  const [series, setSeries] = useState('riders'), [lags, setLags] = useState(21)
  const ys = useMemo(() => SERIES[series][1](), [series])
  const L = Math.max(1, Math.min(60, lags)), r = useMemo(() => W.acf(ys, L), [ys, L])
  const band = 1.96 / Math.sqrt(ys.length), outside = r.filter(v => Math.abs(v) > band).length
  const Wd = 440, H = 180, X = k => 30 + (Wd - 40) * (k - 0.5) / L, Y = v => H / 2 - (H / 2 - 10) * v
  return <div className="qm-fig">
    <label className="qm-slider">Series <select value={series} onChange={e => setSeries(e.target.value)}>{Object.entries(SERIES).map(([id, [label]]) => <option key={id} value={id}>{label}</option>)}</select></label>
    <Slider label="Lags" value={L} min={1} max={60} onChange={setLags} />
    <svg className="qm-plot" viewBox={`0 0 ${Wd} ${H}`} role="img" aria-label="Autocorrelation bars">
      <rect x={30} width={Wd - 40} y={Y(band)} height={Y(-band) - Y(band)} fill={GREY} fillOpacity=".2" />
      <line x1={30} x2={Wd - 10} y1={Y(0)} y2={Y(0)} stroke={GREY} />
      {r.map((v, k) => <rect key={k} x={X(k + 1) - Math.max(1, 140 / L) / 2} width={Math.max(1, 140 / L)} y={Math.min(Y(v), Y(0))} height={Math.abs(Y(v) - Y(0))} fill={Math.abs(v) > band ? ((k + 1) % 7 === 0 ? RED : BLUE) : GREY} />)}
      {[1, 7, 14, 21, 28, 35, 42, 49, 56].filter(k => k <= L).map(k => <text key={k} className="qm-tick" x={X(k)} y={H - 2} textAnchor="middle">{k}</text>)}
    </svg>
    <p className="qm-small">Lag 1: <b>{f(r[0], 3)}</b>{L >= 7 && <>, lag 7: <b>{f(r[6], 3)}</b></>}. Band ±{f(band, 3)}; {outside} of {L} bars outside it (with no pattern at all, about {f(0.05 * L, 1)} would be).</p>
  </div>
}

// 9.5 and 9.10: each forecaster against the actual riders, and its scores.
const METHODS = {
  naive: ['Yesterday', ys => W.naiveForecasts(ys)],
  seasonal: ['Same day last week', ys => W.seasonalNaive(ys, 7)],
  mean: ['Mean so far', ys => W.meanForecasts(ys)],
  smooth: ['Smoothing, α 0.1', ys => W.exponentialSmoothing(ys, 0.1)],
  hw: ['Holt–Winters', ys => W.holtWinters(ys, 0.1, 0.01, 0.2, 7)],
  hw7: ['Holt–Winters, a week ahead', ys => W.holtWinters(ys, 0.1, 0.01, 0.2, 7, 7)],
}
const FIRST_METHODS = ['naive', 'seasonal', 'mean']
export function ForecastRace({ methods = FIRST_METHODS, from = 7 }) {
  const ys = useMemo(riders, [])
  const [method, setMethod] = useState(methods[0]), [start, setStart] = useState(150)
  const all = useMemo(() => Object.fromEntries(methods.map(m => [m, METHODS[m][1](ys)])), [methods, ys])
  const fs = all[method] ?? all[methods[0]], s = Math.max(from, Math.min(305, start))
  const Wd = 440, H = 190, [lo, hi] = extent([ys.slice(s, s + 60)], 0.15)
  const X = k => 26 + (Wd - 32) * (k - s) / 59, Y = v => H - 18 - (H - 28) * (v - lo) / (hi - lo)
  const window = [...Array(60).keys()].map(i => s + i)
  return <div className="qm-fig">
    <Toggle options={methods.map(m => [m, METHODS[m][0]])} value={method} onChange={setMethod} />
    <Slider label="First day shown" value={s} min={from} max={305} onChange={setStart} />
    <svg className="qm-plot" viewBox={`0 0 ${Wd} ${H}`} role="img" aria-label="Actual riders and the forecast">
      {window.map(k => fs[k] !== null && <line key={k} x1={X(k)} x2={X(k)} y1={Y(ys[k])} y2={Y(fs[k])} stroke={RED} strokeOpacity=".35" />)}
      <path d={pathOf(window.map(k => ys[k]), i => X(s + i), Y)} fill="none" stroke={BLUE} strokeWidth="1.5" />
      <path d={pathOf(window.map(k => fs[k]), i => X(s + i), Y)} fill="none" stroke={RED} strokeWidth="1.5" strokeDasharray="4 2" />
      <text className="qm-tick" x={26} y={H - 4}>day {s}</text><text className="qm-tick" x={Wd - 6} y={H - 4} textAnchor="end">day {s + 59}</text>
    </svg>
    <table className="qm-log mono"><thead><tr><th>Forecast (days {from} on)</th><th>MAE</th><th>RMSE</th><th>MAPE</th></tr></thead>
      <tbody>{methods.map(m => { const p = W.scored(ys.slice(from), all[m].slice(from)); return <tr key={m} style={m === method ? { background: 'rgba(63,91,181,.10)' } : null}><td>{METHODS[m][0]}</td><td>{f(W.mae(p), 1)}</td><td>{f(W.rmseOf(p), 1)}</td><td>{f(W.mape(p), 1)}%</td></tr> })}</tbody></table>
  </div>
}

// 9.6: exponential smoothing: the level chasing the data, and the weights it puts on the past.
export function SmoothingAlpha() {
  const ys = useMemo(riders, [])
  const [alpha, setAlpha] = useState(0.1)
  const a = Math.max(0.01, Math.min(1, alpha))
  const fs = useMemo(() => W.exponentialSmoothing(ys, a), [a, ys])
  const weights = W.smoothingWeights(a, 20), e = W.rmseOf(W.scored(ys, fs))
  const Wd = 440, H = 170, [lo, hi] = extent([ys])
  const X = d => 26 + (Wd - 32) * d / 364, Y = v => H - 18 - (H - 28) * (v - lo) / (hi - lo)
  const BX = j => 30 + j * 20, BY = v => 80 - 70 * v / Math.max(...weights)
  return <div className="qm-fig">
    <Slider label="α" value={a} min={0.01} max={1} step={0.01} onChange={setAlpha} format={v => v.toFixed(2)} />
    <svg className="qm-plot" viewBox={`0 0 ${Wd} ${H}`} role="img" aria-label="Riders and the smoothed forecast">
      {ys.map((v, d) => <circle key={d} cx={X(d)} cy={Y(v)} r="1.3" fill={BLUE} fillOpacity=".3" />)}
      <path d={pathOf(fs, X, Y)} fill="none" stroke={RED} strokeWidth="1.8" />
      <YearAxis X={X} H={H} />
    </svg>
    <svg className="qm-plot" viewBox={`0 0 ${Wd} 100`} role="img" aria-label="The weight on each day back">
      {weights.map((w, j) => <rect key={j} x={BX(j)} width="14" y={BY(w)} height={80 - BY(w)} fill={GREEN} />)}
      {[0, 5, 10, 15].map(j => <text key={j} className="qm-tick" x={BX(j) + 7} y={96} textAnchor="middle">{j === 0 ? 'today' : `${j} back`}</text>)}
    </svg>
    <p className="qm-small">Weight on the latest day <b>{f(a, 2)}</b>, then ×{f(1 - a, 2)} for each day further back; the average age of what it remembers (1 − α)/α = <b>{f((1 - a) / a, 1)}</b> days. One-step RMSE <b>{f(e, 1)}</b>.</p>
  </div>
}

// 9.7: Holt's level and trend on the weekly totals, forecasting from a chosen week.
export function HoltAhead() {
  const weeks = useMemo(() => W.resample(dates(), riders(), 'week').filter(w => w[2] === 7).map(w => w[1]), [])
  const [cut, setCut] = useState(26), [alpha, setAlpha] = useState(0.5), [beta, setBeta] = useState(0.3)
  const c = Math.max(3, Math.min(weeks.length - 1, cut)), h = Math.min(8, weeks.length - c)
  const ahead = W.holtAhead(weeks.slice(0, c), alpha, beta, h), smooth = W.exponentialSmoothing(weeks.slice(0, c + 1), alpha)[c]
  const Wd = 440, H = 200, [lo, hi] = extent([weeks, ahead])
  const X = k => 30 + (Wd - 40) * k / (weeks.length - 1), Y = v => H - 18 - (H - 28) * (v - lo) / (hi - lo)
  const miss = ahead.map((v, j) => weeks[c + j] - v)
  return <div className="qm-fig">
    <Slider label="Forecast from week" value={c} min={3} max={weeks.length - 1} onChange={setCut} />
    <Slider label="α (level)" value={alpha} min={0.05} max={1} step={0.05} onChange={setAlpha} format={v => v.toFixed(2)} />
    <Slider label="β (trend)" value={beta} min={0} max={1} step={0.05} onChange={setBeta} format={v => v.toFixed(2)} />
    <svg className="qm-plot" viewBox={`0 0 ${Wd} ${H}`} role="img" aria-label="Weekly riders and Holt's forecast">
      <path d={pathOf(weeks, X, Y)} fill="none" stroke={BLUE} strokeWidth="1.5" />
      {weeks.map((v, k) => <circle key={k} cx={X(k)} cy={Y(v)} r="2" fill={k < c ? BLUE : GREY} />)}
      <path d={pathOf(ahead, j => X(c + j), Y)} fill="none" stroke={RED} strokeWidth="2" strokeDasharray="5 3" />
      <line x1={X(c) - 0.5} x2={X(c + h - 1)} y1={Y(smooth)} y2={Y(smooth)} stroke={GREEN} strokeWidth="1.5" strokeDasharray="2 2" />
      <line x1={X(c - 0.5)} x2={X(c - 0.5)} y1={6} y2={H - 16} stroke={GREY} />
    </svg>
    <p className="qm-small">From the {c} weeks before the line: Holt (red) says <b>{f(ahead[0], 0)}</b> next week and <b>{f(ahead[h - 1], 0)}</b> in {h} weeks; smoothing alone (green) stays at {f(smooth, 0)}. Holt's misses: {miss.map(m => f(m, 0)).join(', ')}.</p>
  </div>
}

// 9.8: the seven seasonal indices of Holt–Winters, learning through the year.
export function SeasonUpdates() {
  const ys = useMemo(riders, [])
  const [gamma, setGamma] = useState(0.2)
  const g = Math.max(0, Math.min(1, gamma))
  const { seasons, mae } = useMemo(() => { const s = []; const fs = W.holtWinters(ys, 0.1, 0.01, g, 7, 1, s); return { seasons: s, mae: W.maeFrom(ys, fs, 91) } }, [g, ys])
  const names = ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'], colours = [GREY, GREY, GREY, RED, GOLD, GREY, GREY]
  const Wd = 440, H = 200, [lo, hi] = extent([seasons.flat()])
  const X = d => 26 + (Wd - 60) * d / 364, Y = v => H - 18 - (H - 28) * (v - lo) / (hi - lo)
  const last = seasons[seasons.length - 1]
  return <div className="qm-fig">
    <Slider label="γ (how fast the indices learn)" value={g} min={0} max={1} step={0.01} onChange={setGamma} format={v => v.toFixed(2)} />
    <svg className="qm-plot" viewBox={`0 0 ${Wd} ${H}`} role="img" aria-label="The seven seasonal indices over the year">
      <line x1={26} x2={Wd - 34} y1={Y(0)} y2={Y(0)} stroke={GREY} strokeDasharray="2 2" />
      {names.map((n, i) => <g key={n}><path d={pathOf(seasons.map(s => s[i]), d => X(d + 7), Y)} fill="none" stroke={colours[i]} strokeWidth={colours[i] === GREY ? 1 : 1.8} />{colours[i] !== GREY && <text className="qm-tick" x={Wd - 30} y={Y(last[i]) + 3}>{n}</text>}</g>)}
      <text className="qm-tick" x={Wd - 30} y={Y(Math.min(...last)) + 12} fill={GREY}>weekdays</text>
      <YearAxis X={X} H={H} />
    </svg>
    <p className="qm-small">At the end of the year: Saturday <b>{f(last[3], 1)}</b>, Sunday <b>{f(last[4], 1)}</b>; the weekdays from {f(Math.min(...last.filter((_, i) => i !== 3 && i !== 4)), 1)} to {f(Math.max(...last.filter((_, i) => i !== 3 && i !== 4)), 1)}. One-step MAE from day 91: <b>{f(mae, 1)}</b>.{g === 0 ? ' With γ = 0 the indices never move from the first week’s.' : ''}</p>
  </div>
}

// 9.9: walk-forward splits: everything before the line is training, the forecast is past it.
export function WalkForwardView() {
  const ys = useMemo(riders, [])
  const [end, setEnd] = useState(120), [horizon, setHorizon] = useState(1), [kind, setKind] = useState('walk')
  const hz = Math.max(1, Math.min(14, horizon)), e = Math.max(14, Math.min(365 - hz, end))
  const rng = useMemo(() => new Rng(3), [])
  const test = useMemo(() => new Set(Array.from({ length: 73 }, () => rng.below(365))), [rng])
  const Wd = 440, H = 120, X = d => 20 + (Wd - 30) * d / 364
  return <div className="qm-fig">
    <Toggle options={[['walk', 'Walk-forward'], ['random', 'Random test days']]} value={kind} onChange={setKind} />
    {kind === 'walk' && <><Slider label="Train on days 0 to" value={e - 1} min={13} max={364 - hz} onChange={v => setEnd(v + 1)} />
      <Slider label="Forecast how far ahead" value={hz} min={1} max={14} onChange={setHorizon} format={v => `${v} day${v > 1 ? 's' : ''}`} /></>}
    <svg className="qm-plot" viewBox={`0 0 ${Wd} ${H}`} role="img" aria-label="Which days train and which are forecast">
      {ys.map((_, d) => {
        const role = kind === 'random' ? (test.has(d) ? 'test' : 'train') : d < e ? 'train' : d === e + hz - 1 ? 'test' : 'unused'
        return <rect key={d} x={X(d)} width={Math.max(0.8, (Wd - 30) / 365 - 0.2)} y={30} height={50} fill={role === 'train' ? BLUE : role === 'test' ? RED : GREY} fillOpacity={role === 'unused' ? 0.2 : 0.8} />
      })}
      <YearAxis X={X} H={H} />
    </svg>
    <p className="qm-small">{kind === 'walk' ? <>Train on days 0–{e - 1}, forecast day {e + hz - 1}; then move one day on and do it again: {W.walkForward(365, e, hz).length} forecasts from here to the end, each made only from the past.</> : <>{test.size} random test days, scattered: each sits between training days on both sides, so a model can lean on the days after it, which a real forecast never has.</>}</p>
  </div>
}
