import { useMemo, useState } from 'react'
import * as T from '../engine/tables.js'
import * as C from '../engine/cleaning.js'
import * as P from '../engine/patterns.js'
import * as W from '../engine/forecasting.js'
import * as Y from '../engine/story.js'
import { ORDERS_CSV, CATALOGUE_CSV, DAYS_CSV } from '../engine/data.js'

const f = (x, d = 2) => (x === null || x === undefined || !Number.isFinite(x) ? '–' : Number.isInteger(x) ? String(x) : x.toFixed(d))
const pct = x => `${(100 * x).toFixed(1)}%`
const Slider = ({ label, value, min, max, step = 1, onChange, format = v => v }) =>
  <label className="qm-slider">{label} <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /> <b className="mono">{format(value)}</b></label>
const BLUE = '#3f5bb5', RED = '#b0413e', GREY = '#9aa3b2'

let ridersCache = null
const riders = () => (ridersCache ??= P.numberDays(T.readCsv(DAYS_CSV())).map(r => r.riders))

// 12.2: Holt–Winters' forecasts for October to December with bands learned from January to September's errors.
export function FanChart() {
  const ys = useMemo(riders, [])
  const [h, setH] = useState(1), [level, setLevel] = useState(80)
  const hh = Math.max(1, Math.min(7, h)), lev = Math.max(50, Math.min(99, level)) / 100
  const fc = useMemo(() => W.holtWinters(ys, 0.1, 0.01, 0.2, 7, hh), [ys, hh])
  const errors = ys.slice(91, 273).map((y, k) => y - fc[91 + k]), band = Y.errorBand(errors, lev)
  const narrow = Y.errorBand(errors, lev / 2)
  const held = Y.coverage(ys.slice(273), fc.slice(273), band)
  const Wd = 440, H = 200, from = 273, n = 92
  const lo = Math.min(...ys.slice(from)) - 80, hi = Math.max(...ys.slice(from)) + 80
  const X = t => 20 + (Wd - 30) * (t - from) / (n - 1), Yv = v => H - 16 - (H - 26) * (v - lo) / (hi - lo)
  const t = [...Array(n).keys()].map(k => from + k)
  const area = (a, b) => `M${t.map(q => `${X(q).toFixed(1)},${Yv(fc[q] + b).toFixed(1)}`).join('L')}L${[...t].reverse().map(q => `${X(q).toFixed(1)},${Yv(fc[q] + a).toFixed(1)}`).join('L')}Z`
  return <div className="qm-fig">
    <Slider label="Forecast made how many days ahead" value={hh} min={1} max={7} onChange={setH} />
    <Slider label="Band level" value={Math.round(lev * 100)} min={50} max={99} onChange={setLevel} format={v => `${v}%`} />
    <svg className="qm-plot" viewBox={`0 0 ${Wd} ${H}`} role="img" aria-label="Forecast with a band, and the actual riders">
      <path d={area(band[0], band[1])} fill={RED} fillOpacity=".15" />
      <path d={area(narrow[0], narrow[1])} fill={RED} fillOpacity=".15" />
      <path d={`M${t.map(q => `${X(q).toFixed(1)},${Yv(fc[q]).toFixed(1)}`).join('L')}`} fill="none" stroke={RED} strokeWidth="1.5" />
      {t.map(q => { const inside = ys[q] >= fc[q] + band[0] && ys[q] <= fc[q] + band[1]; return <circle key={q} cx={X(q)} cy={Yv(ys[q])} r="2.2" fill={inside ? BLUE : '#111'} /> })}
      <text className="qm-tick" x={20} y={H - 2}>1 Oct</text><text className="qm-tick" x={Wd - 10} y={H - 2} textAnchor="end">31 Dec</text>
    </svg>
    <p className="qm-small">The band is the forecast plus the middle {Math.round(lev * 100)}% of its errors from April to September ({f(band[0], 0)} to +{f(band[1], 0)} riders); the darker inner band holds half that share. It held on <b>{pct(held)}</b> of October to December’s days (black dots fell outside).</p>
  </div>
}

// 12.4: three views of the cleaned orders that filter each other: towns, channels and a price range.
const TOWNS = ['Harrogate', 'Leeds', 'Wakefield', 'York']
export function Dashboard() {
  const rows = useMemo(() => {
    const prices = Object.fromEntries(T.readCsv(CATALOGUE_CSV()).map(r => [r.item, T.toPence(r.list_price)]))
    return C.cleanOrders(T.readCsv(ORDERS_CSV()), prices).filter(r => r.price !== null).map(r => ({ town: r.town, channel: r.channel, price: r.price / 100 }))
  }, [])
  const [towns, setTowns] = useState(TOWNS), [channels, setChannels] = useState(['shop', 'web']), [most, setMost] = useState(500)
  const filters = { town: towns, channel: channels, price: { low: 0, high: most } }
  const toggle = (list, set, v) => set(list.includes(v) ? (list.length > 1 ? list.filter(x => x !== v) : list) : [...list, v])
  const byTown = Y.linkedCounts(rows, filters, 'town'), byChannel = Y.linkedCounts(rows, filters, 'channel')
  const kept = rows.filter(r => Y.passes(r, filters))
  const Bars = ({ data, chosen, onPick, label }) => {
    const top = Math.max(1, ...data.map(([, n]) => n))
    return <div className="ds-dash-view"><span className="qm-eyebrow">{label} (click to filter)</span>
      {data.map(([k, n]) => <button key={k} className="ds-dash-bar" onClick={() => onPick(k)} style={{ opacity: chosen.includes(k) ? 1 : 0.35 }}>
        <span className="mono">{k}</span><span style={{ display: 'inline-block', width: `${(140 * n) / top}px`, height: 10, background: BLUE, margin: '0 6px' }} />{n}</button>)}</div>
  }
  return <div className="qm-fig">
    <div className="ds-dash">
      <Bars label="Orders by town" data={byTown} chosen={towns} onPick={v => toggle(towns, setTowns, v)} />
      <Bars label="Orders by channel" data={byChannel} chosen={channels} onPick={v => toggle(channels, setChannels, v)} />
    </div>
    <Slider label="Price up to (£)" value={most} min={1} max={500} onChange={setMost} />
    <p className="qm-small">Selected: <b>{kept.length}</b> orders, revenue <b>£{kept.reduce((s, r) => s + r.price, 0).toFixed(2)}</b> (price × 1 each; quantities left out). Each view counts the orders that pass the <i>other</i> filters, so a greyed bar still shows how many it would add.</p>
  </div>
}
