// Figures placed between the paragraphs of Lab 19 (19.1–19.5).
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Check, Choice, Readout, Note, MiniPlot, Path, Dots, Table, useStepper, r } from '../../kit/fig.jsx'
import { usage, acf, features, walkForward, FEATURES } from './engine.js'
import { random, normal, mean, range } from '../../kit/math.js'

const Y = usage(), N = Y.length, EVAL = 21 * 24
const dayHour = t => `day ${Math.floor(t / 24)}, ${String(t % 24).padStart(2, '0')}:00`
const dayTicks = v => `d${Math.round(v / 24)}`
// For windows of a few days, where whole-day labels would repeat.
const hourTicks = v => { const t = Math.round(v); return `d${Math.floor(t / 24)} ${String(t % 24).padStart(2, '0')}h` }
const seasonalSource = (t, h) => t + h - 24 * Math.ceil(h / 24)

// The engine's series, rebuilt with each ingredient kept separately (same random draws, same order).
export function parts({ days = 35, seed = 2, noise = 3 } = {}) {
  const rng = random(seed), out = []
  let ar = 0
  for (let t = 0; t < days * 24; t++) {
    const hour = t % 24, dow = Math.floor(t / 24) % 7, weekend = dow >= 5
    ar = 0.75 * ar + noise * normal(rng)
    const spike = rng() < 0.01 ? 25 * rng() : 0
    out.push({ trend: 30 + 0.02 * t, daily: 18 * Math.max(0, Math.sin(Math.PI * (hour - 7) / 13)) * (weekend ? 0.4 : 1), weekly: weekend ? -12 : 0, noise: ar, spike })
  }
  return out
}

// ---------- 19.1 ----------
const PARTS = parts()
export function Components() {
  const [on, setOn] = useState({ trend: true, daily: true, weekly: true, noise: true, spike: true })
  const week = range(14 * 24).map(i => i + 14 * 24)
  const series = week.map(t => [t, Object.keys(on).reduce((s, k) => s + (on[k] ? PARTS[t][k] : 0), 0)])
  const labels = { trend: 'trend', daily: 'daily cycle', weekly: 'quieter weekends', noise: 'short-memory noise', spike: 'spikes' }
  return <div>
    <Controls>{Object.keys(on).map(k => <Check key={k} label={labels[k]} checked={on[k]} onChange={v => setOn(o => ({ ...o, [k]: v }))} />)}</Controls>
    <MiniPlot x={[week[0], week[week.length - 1]]} y={[-15, 75]} xLabel="hour (days 14–27)" yLabel="CPU %" xFormat={dayTicks} label="Two weeks of usage built from its components">{({ X, Y: Yp }) => <>
      <Path X={X} Y={Yp} points={series} stroke="var(--chart-train)" width={1.3} />
    </>}</MiniPlot>
    <Readout>Showing: {Object.keys(on).filter(k => on[k]).map(k => labels[k]).join(' + ') || 'nothing'}. With every box ticked this is the playground’s series (before it is clipped at 0%).</Readout>
  </div>
}

const R = acf(Y, 170)
export function ShiftCorrelate() {
  const [k, setK] = useState(1)
  const window = range(72).map(i => i + 24 * 24)
  return <div>
    <Controls><Slider label="lag k (hours)" value={k} min={0} max={48} step={1} onChange={setK} digits={0} /></Controls>
    <MiniPlot x={[window[0], window[71]]} y={[0, 80]} xLabel="hour (three days)" yLabel="CPU %" xFormat={hourTicks} label={`The series and a copy shifted by ${k} hours`}>{({ X, Y: Yp }) => <>
      <Path X={X} Y={Yp} points={window.map(t => [t, Y[t]])} stroke="var(--chart-train)" width={1.6} />
      <Path X={X} Y={Yp} points={window.map(t => [t, Y[t - k]])} stroke="var(--chart-val)" width={1.6} dash="5 3" />
    </>}</MiniPlot>
    <Readout>Blue: y<sub>t</sub>. Orange dashed: y<sub>t−{k}</sub>, the same series {k} hour{k === 1 ? '' : 's'} earlier. When the two curves move together the correlation is high: r<sub>{k}</sub> = <strong>{r(R[k], 2)}</strong>.</Readout>
  </div>
}

export function AcfPlot() {
  const [noise, setNoise] = useState(3), rk = useMemo(() => acf(usage({ noise }), 170), [noise])
  return <div>
    <Controls><Slider label="noise level" value={noise} min={0.5} max={8} step={0.5} onChange={setNoise} digits={1} /></Controls>
    <MiniPlot x={[0, 170]} y={[-0.4, 1]} xLabel="lag k (hours)" yLabel="r_k" label="Autocorrelation function up to one week">{({ X, Y: Yp }) => <>
      <line x1={X(0)} x2={X(170)} y1={Yp(0)} y2={Yp(0)} stroke="var(--border)" />
      {rk.map((v, k) => <line key={k} x1={X(k)} x2={X(k)} y1={Yp(0)} y2={Yp(v)} stroke={k === 24 || k === 168 ? 'var(--chart-val)' : 'var(--chart-train)'} strokeWidth={k === 24 || k === 168 ? 2.4 : 1.2} />)}
    </>}</MiniPlot>
    <Readout>r₁ = {r(rk[1], 2)}, r₁₂ = {r(rk[12], 2)}, r₂₄ = <strong>{r(rk[24], 2)}</strong>, r₁₆₈ = <strong>{r(rk[168], 2)}</strong> (orange). More noise lowers every bar: the seasonal pattern is still there, but it explains less of the variation.</Readout>
  </div>
}

// ---------- 19.2 ----------
export function OriginHorizon() {
  const [hour, setHour] = useState(9), [h, setH] = useState(5)
  const t = 25 * 24 + hour, target = t + h, src = seasonalSource(t, h)
  const lo = Math.min(src, t - 30) - 2, hi = Math.max(target, t + 26) + 2
  return <div>
    <Controls><Slider label="origin hour of day" value={hour} min={0} max={23} step={1} onChange={setHour} digits={0} /><Slider label="horizon h (hours)" value={h} min={1} max={48} step={1} onChange={setH} digits={0} /></Controls>
    <MiniPlot x={[lo, hi]} y={[0, 80]} xLabel="hour" yLabel="CPU %" xFormat={v => `${Math.round(v)}`} label="Known values up to the origin, and the target">{({ X, Y: Yp }) => <>
      <rect x={X(t)} y={Yp(80)} width={X(hi) - X(t)} height={Yp(0) - Yp(80)} fill="var(--muted)" opacity="0.12" />
      <Path X={X} Y={Yp} points={range(t - lo + 1).map(i => [lo + i, Y[lo + i]])} stroke="var(--chart-train)" width={1.6} />
      <Path X={X} Y={Yp} points={range(hi - t).map(i => [t + i, Y[t + i]])} stroke="var(--muted)" width={1.2} dash="3 3" />
      <Dots X={X} Y={Yp} points={[[t, Y[t], 5, 'var(--chart-train)'], [src, Y[src], 5, 'var(--chart-model)'], [target, Y[target], 6, 'var(--chart-val)']]} />
    </>}</MiniPlot>
    <Readout>Origin t = {t} ({dayHour(t)}); target y<sub>{target}</sub>, orange. Shaded: not yet known. Persistence uses y<sub>{t}</sub> (blue dot). Seasonal naive uses y<sub>{src}</sub> = t + h − 24·{Math.ceil(h / 24)} (purple dot){h > 24 ? ': the same hour one day before the target would be after the origin, so it goes back two days' : ''}.</Readout>
  </div>
}

const baselineMae = (y, h) => { let p = 0, s = 0, c = 0; for (let t = EVAL; t + h < y.length; t++) { p += Math.abs(y[t] - y[t + h]); s += Math.abs(y[seasonalSource(t, h)] - y[t + h]); c++ } return { persistence: p / c, seasonal: s / c } }
export function BaselineForecasts() {
  const [h, setH] = useState('6'), hh = Number(h), times = range(72).map(i => N - 72 + i), m = baselineMae(Y, hh)
  return <div>
    <Controls><Choice label="horizon h" value={h} options={[['1', '1 hour'], ['6', '6 hours'], ['24', '24 hours']]} onChange={setH} /></Controls>
    <MiniPlot x={[times[0], times[71]]} y={[0, 80]} xLabel="hour (last three days)" yLabel="CPU %" xFormat={hourTicks} label={`Persistence and seasonal naive forecasts ${hh} hours ahead`}>{({ X, Y: Yp }) => <>
      <Path X={X} Y={Yp} points={times.map(t => [t, Y[t]])} stroke="var(--chart-train)" width={2} />
      <Path X={X} Y={Yp} points={times.map(t => [t, Y[t - hh]])} stroke="var(--muted)" width={1.4} dash="5 3" />
      <Path X={X} Y={Yp} points={times.map(t => [t, Y[seasonalSource(t - hh, hh)]])} stroke="var(--chart-val)" width={1.4} dash="2 2" />
    </>}</MiniPlot>
    <Readout>Blue: actual. Grey dashed: persistence (the value {hh} h earlier), MAE <strong>{r(m.persistence, 2)}</strong>. Orange dotted: seasonal naive, MAE <strong>{r(m.seasonal, 2)}</strong>. MAE is over the last two weeks, in CPU percentage points. {hh === 24 ? 'At h = 24 the two baselines are the same forecast.' : m.persistence < m.seasonal ? 'Persistence wins at this horizon.' : 'Seasonal naive wins at this horizon.'}</Readout>
  </div>
}

export function BaselineHorizons() {
  const rows = useMemo(() => range(24).map(i => ({ h: i + 1, ...baselineMae(Y, i + 1) })), [])
  const cross = rows.find(x => x.seasonal < x.persistence)?.h
  return <div>
    <MiniPlot x={[1, 24]} y={[0, 12]} xLabel="horizon h (hours)" yLabel="MAE (CPU points)" label="Baseline error against horizon">{({ X, Y: Yp }) => <>
      <Path X={X} Y={Yp} points={rows.map(x => [x.h, x.persistence])} stroke="var(--muted)" />
      <Path X={X} Y={Yp} points={rows.map(x => [x.h, x.seasonal])} stroke="var(--chart-val)" />
    </>}</MiniPlot>
    <Readout>Grey: persistence. Orange: seasonal naive. Seasonal naive stays near {r(rows[0].seasonal, 1)} at every horizon; persistence starts at {r(rows[0].persistence, 1)}, is better up to h = {cross - 1}, then worse, and climbs back until at h = 24 the two are the same forecast (the value exactly one day before the target). A model has to beat the <strong>lower</strong> curve at each horizon.</Readout>
  </div>
}

// ---------- 19.3 ----------
const FEATURE_INDEX = [(t) => t, t => t - 1, t => t - 2, (t, h) => t + h - 24 * Math.ceil(h / 24), (t, h) => t + h - 168, t => `${t - 23}…${t}`]
export function SeriesToRows() {
  const [t, setT] = useState(600), [h, setH] = useState(6), row = features(Y, t, h)
  const rows = FEATURES.map((f, j) => { const idx = FEATURE_INDEX[j](t, h); return [f, String(idx), r(row[j], 2), (typeof idx === 'number' ? idx <= t : true) ? '✓ known' : '✗ future'] })
  return <div>
    <Controls><Slider label="origin t" value={t} min={200} max={N - 30} step={1} onChange={setT} digits={0} /><Slider label="horizon h" value={h} min={1} max={24} step={1} onChange={setH} digits={0} /></Controls>
    <Table head={['feature', 'index used', 'value', 'at origin']} rows={[...rows, ['target y[t+h]', String(t + h), r(Y[t + h], 2), 'to predict']]} active={rows.length} label="One training row" />
    <Readout>One row for origin {t} ({dayHour(t)}) and horizon {h}: six numbers computed from indices ≤ {t}, and the target at {t + h}. Slide t to make the next row: the table of all such rows is the training set.</Readout>
  </div>
}

export function RollingMean() {
  const [w, setW] = useState(24), times = range(7 * 24).map(i => 14 * 24 + i)
  const roll = t => mean(Y.slice(t - w + 1, t + 1))
  const rough = mean(times.slice(1).map((t, i) => Math.abs(roll(t) - roll(times[i]))))
  return <div>
    <Controls><Slider label="window w (hours)" value={w} min={1} max={72} step={1} onChange={setW} digits={0} /></Controls>
    <MiniPlot x={[times[0], times[times.length - 1]]} y={[0, 80]} xLabel="hour (one week)" yLabel="CPU %" xFormat={dayTicks} label={`Trailing ${w}-hour mean`}>{({ X, Y: Yp }) => <>
      <Path X={X} Y={Yp} points={times.map(t => [t, Y[t]])} stroke="var(--chart-train)" width={1} opacity={0.5} />
      <Path X={X} Y={Yp} points={times.map(t => [t, roll(t)])} stroke="var(--chart-val)" width={2.2} />
    </>}</MiniPlot>
    <Readout>The mean at t averages y<sub>t−{w - 1}</sub> … y<sub>t</sub>: only the past, so it is a legal feature. Average hour-to-hour change of the orange line: <strong>{r(rough, 2)}</strong> points. {w >= 24 ? 'A window of a day or more removes the daily cycle and keeps the level.' : 'A short window still follows the daily cycle.'}</Readout>
  </div>
}

const byHorizon = leaky => [1, 3, 6, 12, 24].map(h => ({ h, ...walkForward(Y, h, { leaky }).mae }))
export function HorizonCurve({ leakOption = false }) {
  const [leaky, setLeaky] = useState(false), rows = useMemo(() => byHorizon(leaky), [leaky])
  const best = x => Math.min(x.persistence, x.seasonal)
  return <div>
    {leakOption && <Controls><Check label="add the leaky feature" checked={leaky} onChange={setLeaky} /></Controls>}
    <MiniPlot x={[1, 24]} y={[0, 12]} xLabel="horizon h (hours)" yLabel="walk-forward MAE" label="Error by horizon for baselines and the lag regression">{({ X, Y: Yp }) => <>
      <Path X={X} Y={Yp} points={rows.map(x => [x.h, best(x)])} stroke="var(--muted)" />
      <Path X={X} Y={Yp} points={rows.map(x => [x.h, x.regression])} stroke={leaky ? '#ef4444' : 'var(--chart-val)'} />
      <Dots X={X} Y={Yp} points={rows.map(x => [x.h, x.regression, 3.5, leaky ? '#ef4444' : 'var(--chart-val)'])} />
    </>}</MiniPlot>
    <Table head={['h', 'better baseline', 'lag regression']} rows={rows.map(x => [x.h, r(best(x), 2), r(x.regression, 2)])} label="Walk-forward MAE by horizon" />
    <Readout>Grey: the better of the two baselines at each horizon. {leaky ? <>Red: the regression <strong>with the leaky feature</strong>. Its error barely changes from 1 hour to 24 — an honest forecast gets harder further ahead.</> : <>Orange: the lag regression. It gains most at medium horizons, where neither baseline has the right information.</>}</Readout>
  </div>
}

// ---------- 19.4 ----------
export function WalkForwardStepper() {
  const [h, setH] = useState(6), [k, controls] = useStepper(13)
  const t = EVAL + 24 * k, lastTrain = t - h
  return <div>
    <Controls><Slider label="horizon h" value={h} min={1} max={24} step={1} onChange={setH} digits={0} />{controls}</Controls>
    <MiniPlot x={[0, N]} y={[0, 80]} xLabel="hour" yLabel="CPU %" xFormat={dayTicks} label="Walk-forward: training data, origin and target">{({ X, Y: Yp }) => <>
      <rect x={X(168)} y={Yp(80)} width={X(t) - X(168)} height={Yp(0) - Yp(80)} fill="var(--chart-train)" opacity="0.1" />
      <Path X={X} Y={Yp} points={Y.map((v, i) => [i, v])} stroke="var(--chart-train)" width={0.8} opacity={0.6} />
      <line x1={X(t)} x2={X(t)} y1={Yp(0)} y2={Yp(80)} stroke="var(--text)" strokeDasharray="4 3" />
      <Dots X={X} Y={Yp} points={[[t + h, Y[t + h], 5, 'var(--chart-val)']]} />
    </>}</MiniPlot>
    <Readout>Refit {k + 1} of 14 at origin t = {t} ({dayHour(t)}). Training rows: origins j = 168 … {lastTrain}, so every target j + {h} ≤ {t}: <strong>{lastTrain - 168 + 1}</strong> rows. The next 24 origins reuse this fit, then the window grows by a day and the model is refit.</Readout>
  </div>
}

export function RefitSchedule() {
  const [refit, setRefit] = useState('24'), rows = useMemo(() => [1, 6, 24].map(h => ({ h, ...walkForward(Y, h, { refit: Number(refit) }).mae })), [refit])
  return <div>
    <Controls><Choice label="refit every" value={refit} options={[['1', 'origin (every hour)'], ['24', '24 origins (daily)'], ['168', '168 origins (weekly)']]} onChange={setRefit} /></Controls>
    <Table head={['h', 'persistence', 'seasonal naive', 'lag regression']} rows={rows.map(x => [x.h, r(x.persistence, 2), r(x.seasonal, 2), r(x.regression, 2)])} label="Walk-forward MAE by horizon and refit schedule" />
    <Readout>The baselines have nothing to fit, so they do not change. On this series the regression’s error moves only in the second or third decimal, yet the number of model fits at h = 6 ranges from {Math.ceil((N - 6 - EVAL) / 168)} (weekly) to {Math.ceil((N - 6 - EVAL) / 24)} (daily) to {N - 6 - EVAL} (hourly). The pattern here is stable; on a series whose behaviour shifts, frequent refits matter more. Either way the schedule is part of the method, so report it.</Readout>
  </div>
}

export function DelayEffect() {
  const [d, setD] = useState(0), h = 1
  const mae = delay => { let s = 0, c = 0; for (let t = EVAL; t + h < N; t++) { s += Math.abs(Y[t - delay] - Y[t + h]); c++ } return s / c }
  return <div>
    <Controls><Slider label="data delay (hours)" value={d} min={0} max={12} step={1} onChange={setD} digits={0} /></Controls>
    <Readout>A 1-hour-ahead persistence forecast whose latest available value is y<sub>t−{d}</sub>: MAE <strong>{r(mae(d), 2)}</strong>, against {r(mae(0), 2)} if the data were instant. {d ? `It behaves like a ${h + d}-hour forecast, because the gap to the target is really ${h + d} hours.` : 'No delay: the evaluation assumes y_t is available at time t.'}</Readout>
    <Note>An evaluation that ignores the delay reports the right-hand number while production delivers the left-hand one.</Note>
  </div>
}

// ---------- 19.5 ----------
export function CenteredWindow() {
  const [mode, setMode] = useState('centered'), [w, setW] = useState(5), t = 12
  const half = Math.floor(w / 2), idx = mode === 'centered' ? range(w).map(i => t - half + i) : range(w).map(i => t - w + 1 + i)
  const future = idx.filter(i => i > t).length
  return <div>
    <Controls><Choice label="window" value={mode} options={[['trailing', 'trailing (ends at t)'], ['centered', 'centred on t']]} onChange={setMode} /><Slider label="width" value={w} min={3} max={9} step={2} onChange={setW} digits={0} /></Controls>
    <svg viewBox="0 0 460 60" role="img" aria-label={`A ${mode} window of ${w} hours around origin t uses ${future} future values`}>
      {range(21).map(i => { const x = 10 + i * 21.5, inWin = idx.includes(i + 2), isFuture = i + 2 > t
        return <g key={i}><rect x={x} y={14} width={18} height={18} rx={3} fill={inWin ? (isFuture ? '#ef4444' : 'var(--chart-val)') : 'var(--surface)'} stroke="var(--border)" opacity={isFuture && !inWin ? 0.5 : 1} />
          {i + 2 === t && <text x={x + 9} y={50} textAnchor="middle" style={{ fontSize: 11, fill: 'var(--text)' }}>t</text>}</g> })}
    </svg>
    <Readout>{mode === 'centered' ? <>The centred {w}-hour mean at t uses y<sub>t−{half}</sub> … y<sub>t+{half}</sub>: <strong>{future}</strong> value{future === 1 ? '' : 's'} from after the origin (red). It is fine for describing history and illegal as a forecasting feature.</> : <>The trailing mean uses y<sub>t−{w - 1}</sub> … y<sub>t</sub>: no future values.</>}</Readout>
  </div>
}
