import { useMemo, useState } from 'react'
import * as T from '../engine/tables.js'
import * as C from '../engine/cleaning.js'
import * as G from '../engine/charts.js'
import { ORDERS_CSV, CATALOGUE_CSV } from '../engine/data.js'
import { histogramBins, niceTicks as sheetTicks, BIN_RULES } from '../../spreadsheet-lab/engine/chart.js'

const clean = () => C.cleanOrders(T.readCsv(ORDERS_CSV()), Object.fromEntries(T.readCsv(CATALOGUE_CSV()).map(r => [r.item, T.toPence(r.list_price)])))
const f = (x, d = 2) => (x === null || x === undefined || !Number.isFinite(x) ? '–' : Number.isInteger(x) ? String(x) : x.toFixed(d))
const Slider = ({ label, value, min, max, step = 1, onChange, format = v => v }) =>
  <label className="qm-slider">{label} <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /> <b className="mono">{format(value)}</b></label>
const Toggle = ({ options, value, onChange }) => <div className="qm-fig-controls">{options.map(([id, label]) => <button key={id} className={value === id ? 'active' : ''} onClick={() => onChange(id)}>{label}</button>)}</div>
const parseList = text => text.split(/[\s,]+/).map(Number).filter(Number.isFinite)
const BLUE = '#3f5bb5', RED = '#b0413e', GREEN = '#1f6f68'

// 4.1: a value is the same fraction of the way along the domain and the range.
export function ScaleExplorer() {
  const [x, setX] = useState(87), [flip, setFlip] = useState(true)
  const d0 = 0, d1 = 120, r0 = flip ? 270 : 20, r1 = flip ? 20 : 270
  const t = (x - d0) / (d1 - d0), px = G.linearScale(d0, d1, r0, r1, x)
  return <div className="qm-fig">
    <Slider label="Value x" value={x} min={0} max={120} onChange={setX} />
    <label className="ds-select"><input type="checkbox" checked={flip} onChange={e => setFlip(e.target.checked)} /> range 270 → 20 (screen y grows downwards, so up the page is smaller y)</label>
    <svg className="qm-plot" viewBox="0 0 420 300" role="img" aria-label="The domain and the range side by side">
      <line className="qm-axis" x1="80" y1="20" x2="80" y2="270" /><line className="qm-axis" x1="300" y1="20" x2="300" y2="270" />
      <text className="qm-tick" x="40" y="14">domain</text><text className="qm-tick" x="270" y="14">range (pixels)</text>
      {[0, 30, 60, 90, 120].map(v => <g key={v}><text className="qm-tick" x="50" y={G.linearScale(0, 120, 270, 20, v) + 4}>{v}</text><text className="qm-tick" x="308" y={G.linearScale(0, 120, 270, 20, v) + 4}>{f(G.linearScale(d0, d1, r0, r1, v), 0)}</text></g>)}
      <circle cx="80" cy={G.linearScale(0, 120, 270, 20, x)} r="6" fill={BLUE} />
      <circle cx="300" cy={G.linearScale(0, 120, 270, 20, x)} r="6" fill={RED} />
      <line x1="86" y1={G.linearScale(0, 120, 270, 20, x)} x2="294" y2={G.linearScale(0, 120, 270, 20, x)} stroke="currentColor" strokeDasharray="4 3" />
      <text className="qm-tick" x="120" y={G.linearScale(0, 120, 270, 20, x) - 6}>t = {f(t, 3)}</text>
    </svg>
    <p className="qm-small">t = ({x} − {d0}) / ({d1} − {d0}) = <b>{f(t, 3)}</b>; pixel = {r0} + t × ({r1} − {r0}) = <b>{f(px, 2)}</b>; back again: invert({f(px, 2)}) = <b>{f(G.invert(d0, d1, r0, r1, px), 2)}</b>.</p>
  </div>
}

// 4.2: data changes, and each bar enters, updates or exits, joined by position or by key.
const STATES = {
  year: { label: 'The year', rows: rows => C.TOWNS.map(town => ({ town, orders: rows.filter(r => r.town === town).length })) },
  web: { label: 'Top 3 on the web', rows: rows => C.TOWNS.map(town => ({ town, orders: rows.filter(r => r.town === town && r.channel === 'web').length })).sort((a, b) => b.orders - a.orders).slice(0, 3) },
  shop: { label: 'In the shop, A to Z', rows: rows => C.TOWNS.map(town => ({ town, orders: rows.filter(r => r.town === town && r.channel === 'shop').length })).sort((a, b) => (a.town < b.town ? -1 : 1)) },
}
export function JoinStepper() {
  const rows = useMemo(clean, [])
  const [from, setFrom] = useState('year'), [to, setTo] = useState('web'), [byKey, setByKey] = useState(true)
  const old = STATES[from].rows(rows), next = STATES[to].rows(rows)
  // Which old bar each new row takes, and what happens to each old bar.
  const pairs = next.map((d, k) => ({ d, old: byKey ? old.findIndex(o => o.town === d.town) : (k < old.length ? k : -1) }))
  const exits = old.map((o, k) => k).filter(k => !pairs.some(p => p.old === k))
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <label className="ds-select">from <select value={from} onChange={e => setFrom(e.target.value)}>{Object.entries(STATES).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}</select></label>
      <label className="ds-select">to <select value={to} onChange={e => setTo(e.target.value)}>{Object.entries(STATES).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}</select></label>
      <label className="ds-select"><input type="checkbox" checked={byKey} onChange={e => setByKey(e.target.checked)} /> join by key (town)</label>
    </div>
    <table className="qm-log"><thead><tr><th>New row</th><th>Gets</th><th>Means</th></tr></thead><tbody>
      {pairs.map(({ d, old: k }) => <tr key={d.town} className={k < 0 ? 'pass' : ''}><td>{d.town}: {d.orders}</td><td>{k < 0 ? 'a new bar (enter)' : `bar ${k + 1}, which showed ${old[k].town} (update)`}</td><td className="qm-dim">{k >= 0 && old[k].town !== d.town ? `the ${old[k].town} bar now shows ${d.town}` : k >= 0 ? 'the same town' : ''}</td></tr>)}
      {exits.map(k => <tr key={`x${k}`} className="fail"><td>–</td><td>bar {k + 1}, {old[k].town}: removed (exit)</td><td /></tr>)}
    </tbody></table>
    <p className="qm-hint">{byKey ? 'By key, every bar keeps its town: only towns that appear or vanish enter or exit.' : 'By position, bar 1 takes the first new row whatever its town: when the order changes, bars swap towns.'}</p>
  </div>
}

// 4.3: D3's ticks and the spreadsheet's for the same range.
export function TickExplorer() {
  const [lo, setLo] = useState(0), [hi, setHi] = useState(114), [count, setCount] = useState(5)
  const top = Math.max(lo + 0.001, hi)
  const d3Ticks = G.niceTicks(lo, top, count), sheet = sheetTicks(lo, top, count)
  const [p, factor] = G.stepSize(lo, top, count), raw = (top - lo) / count
  const W = 440, x = v => 56 + 370 * (v - Math.min(lo, sheet[0])) / ((Math.max(top, sheet.at(-1)) - Math.min(lo, sheet[0])) || 1)
  return <div className="qm-fig">
    <Slider label="From" value={lo} min={-50} max={100} onChange={setLo} />
    <Slider label="To" value={hi} min={-49} max={1000} onChange={setHi} />
    <Slider label="About this many ticks" value={count} min={2} max={15} onChange={setCount} />
    <p className="qm-small">Ideal step ({f(top, 0)} − {f(lo, 0)}) / {count} = <b>{f(raw, 3)}</b> = {f(raw / 10 ** p, 3)} × 10<sup>{p}</sup> → D3’s step <b>{factor} × 10<sup>{p}</sup> = {f(factor * 10 ** p, 4)}</b>.</p>
    <svg className="qm-plot" viewBox={`0 0 ${W} 110`} role="img" aria-label="Both rules' ticks on one line">
      <rect x={x(lo)} y="38" width={Math.max(1, x(top) - x(lo))} height="8" fill="#d5dbe5" />
      <text className="qm-tick" x="4" y="22">D3</text>
      {d3Ticks.map(t => <g key={`d${t}`}><line x1={x(t)} y1="26" x2={x(t)} y2="38" stroke={BLUE} strokeWidth="2" /><text className="qm-tick" x={x(t) - 8} y="20" fill={BLUE}>{f(t, 2)}</text></g>)}
      <text className="qm-tick" x="4" y="92">sheet</text>
      {sheet.map(t => <g key={`s${t}`}><line x1={x(t)} y1="46" x2={x(t)} y2="58" stroke={RED} strokeWidth="2" /><text className="qm-tick" x={x(t) - 8} y="72" fill={RED}>{f(t, 2)}</text></g>)}
    </svg>
    <p className="qm-hint">Grey: the data. D3 (blue) picks the nearest of 1, 2, 5 × 10ᵏ on a log scale and stays inside the data; the Spreadsheet Lab (red) rounds up, allows 2.5, and covers the data.</p>
  </div>
}

// 4.4: the prices binned by each rule.
export function BinExplorer() {
  const rows = useMemo(() => clean().filter(r => r.price !== null), [])
  const [which, setWhich] = useState('lights'), [rule, setRule] = useState('fd')
  const values = rows.filter(r => which === 'all' || r.item === 'Lights, front and back').map(r => r.price / 100)
  const { bins, width } = histogramBins(values, null, rule)
  const top = Math.max(1, ...bins.map(b => b.count)), W = 440, H = 180
  const raw = rule === 'fd' ? G.freedmanDiaconisWidth(values) : rule === 'sturges' ? (Math.max(...values) - Math.min(...values)) / G.sturges(values.length) : G.scottWidth(values)
  return <div className="qm-fig">
    <Toggle value={which} onChange={setWhich} options={[['lights', 'The lights'], ['all', 'Every item']]} />
    <Toggle value={rule} onChange={setRule} options={Object.entries(BIN_RULES).map(([id, r]) => [id, r.label])} />
    <p className="qm-small">{values.length} prices · {BIN_RULES[rule].formula} = <b>£{f(raw, 2)}</b>, rounded up to a readable £{f(width, 2)} · <b>{bins.length}</b> bins</p>
    <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="The histogram">
      {bins.map((b, k) => { const w = (W - 20) / bins.length; return <rect key={k} x={10 + k * w + 0.5} width={Math.max(0.5, w - 1)} y={H - 20 - (H - 30) * b.count / top} height={(H - 30) * b.count / top} fill={BLUE}><title>{`£${f(b.from)} to £${f(b.to)}: ${b.count}`}</title></rect> })}
      <text className="qm-tick" x="10" y={H - 4}>£{f(bins[0]?.from ?? 0)}</text><text className="qm-tick" x={W - 60} y={H - 4}>£{f(bins.at(-1)?.to ?? 0)}</text>
    </svg>
    <p className="qm-hint">{which === 'all' ? 'Every item: the bikes make the standard deviation huge, so Scott’s bins are wide and most items share one or two bars. Freedman and Diaconis look at the middle half only.' : 'The lights alone: a bell-like spread, where the three rules roughly agree.'} The Spreadsheet Lab’s histogram uses this same code.</p>
  </div>
}

// 4.5: radius in proportion to the value, against area in proportion.
export function AreaLie() {
  const [a, setA] = useState(1), [b, setB] = useState(4)
  const big = Math.max(a, b, 0.001), R = 70
  const linear = v => R * v / big, sqrt = v => G.radiusFor(v, big, R)
  const Pair = ({ r, label }) => <g>
    <text className="qm-tick" x="10" y="16">{label}</text>
    <circle cx="80" cy="100" r={Math.max(0.5, r(a))} fill={BLUE} opacity=".8" /><circle cx="220" cy="100" r={Math.max(0.5, r(b))} fill={RED} opacity=".8" />
  </g>
  return <div className="qm-fig">
    <Slider label="Value a" value={a} min={0.1} max={10} step={0.1} onChange={setA} />
    <Slider label="Value b" value={b} min={0.1} max={10} step={0.1} onChange={setB} />
    <div className="ds-drawings">
      <svg className="qm-plot" viewBox="0 0 300 180" role="img" aria-label="Radius in proportion"><Pair r={linear} label="radius ∝ value (wrong)" /></svg>
      <svg className="qm-plot" viewBox="0 0 300 180" role="img" aria-label="Area in proportion"><Pair r={sqrt} label="area ∝ value (scaleSqrt)" /></svg>
    </div>
    <p className="qm-small">b is <b>{f(b / a, 2)}</b> times a. Radius ∝ value: the red area is <b>{f((linear(b) / Math.max(linear(a), 1e-9)) ** 2, 2)}</b> times the blue. Area ∝ value: <b>{f((sqrt(b) / Math.max(sqrt(a), 1e-9)) ** 2, 2)}</b> times.</p>
  </div>
}

// 4.6: a bell on every value, added up.
export function KdeExplorer() {
  const [text, setText] = useState('22.5 23 24.75 25 25.25 25.5 26 27.5')
  const [h, setH] = useState(0.6)
  const values = parseList(text).slice(0, 200)
  if (!values.length) return <div className="qm-fig"><label className="ds-input"><span>Values</span><input value={text} onChange={e => setText(e.target.value)} /></label><p className="qm-hint">Type some numbers.</p></div>
  const lo = Math.min(...values) - 3 * h, hi = Math.max(...values) + 3 * h
  const xs = Array.from({ length: 121 }, (_, k) => lo + (hi - lo) * k / 120)
  const ys = xs.map(x => G.kde(values, h, x)), top = Math.max(...ys, 1e-9)
  const W = 440, H = 180, X = x => 10 + (W - 20) * (x - lo) / ((hi - lo) || 1), Y = y => H - 20 - (H - 40) * y / top
  const bell = v => xs.map(x => { const u = (x - v) / h; return Math.exp(-u * u / 2) / Math.sqrt(2 * Math.PI) / (values.length * h) })
  return <div className="qm-fig">
    <label className="ds-input"><span>Values (numbers, separated by spaces or commas)</span><input value={text} onChange={e => setText(e.target.value)} spellCheck={false} /></label>
    <Slider label="Bandwidth h" value={h} min={0.05} max={3} step={0.05} onChange={setH} format={v => v.toFixed(2)} />
    <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="The density and its bells">
      {values.slice(0, 40).map((v, k) => <polyline key={k} fill="none" stroke={RED} strokeOpacity=".45" points={bell(v).map((y, i) => `${X(xs[i])},${Y(y)}`).join(' ')} />)}
      <polyline fill="none" stroke={BLUE} strokeWidth="2.5" points={ys.map((y, i) => `${X(xs[i])},${Y(y)}`).join(' ')} />
      {values.map((v, k) => <line key={k} x1={X(v)} y1={H - 18} x2={X(v)} y2={H - 8} stroke="currentColor" />)}
    </svg>
    <p className="qm-small">Silverman’s rule for these values: h = <b>{values.length > 1 ? f(G.silverman(values), 3) : '–'}</b> · area under the curve: <b>{f(G.kdeArea(values, h), 4)}</b></p>
  </div>
}

// 4.7: the same counts as categorical, sequential and diverging colours.
export function ColourScales() {
  const rows = useMemo(clean, [])
  const [kind, setKind] = useState('sequential')
  const counts = C.TOWNS.map(town => Array.from({ length: 12 }, (_, m) => rows.filter(r => r.town === town && Number(r.date.slice(5, 7)) === m + 1).length))
  const all = counts.flat(), most = Math.max(...all), mean = all.reduce((s, v) => s + v, 0) / all.length
  const HUES = [[63, 91, 181], [176, 65, 62], [31, 111, 104], [122, 63, 176]]
  const fill = (v, town) => {
    if (kind === 'categorical') return `rgb(${HUES[town].join(',')})`
    if (kind === 'sequential') return `rgb(${G.mix([255, 255, 255], [8, 48, 107], v / most).join(',')})`
    const t = (v - mean) / Math.max(most - mean, mean)
    return `rgb(${(t < 0 ? G.mix([255, 255, 255], [176, 65, 62], -t) : G.mix([255, 255, 255], [8, 48, 107], t)).join(',')})`
  }
  return <div className="qm-fig">
    <Toggle value={kind} onChange={setKind} options={[['categorical', 'Categorical'], ['sequential', 'Sequential'], ['diverging', 'Diverging']]} />
    <svg className="qm-plot" viewBox="0 0 440 150" role="img" aria-label="Orders by town and month">
      {counts.map((row, t) => <g key={t}><text className="qm-tick" x="2" y={t * 32 + 26}>{C.TOWNS[t]}</text>{row.map((v, m) => <rect key={m} x={90 + m * 28} y={t * 32 + 8} width="27" height="30" fill={fill(v, t)}><title>{`${C.TOWNS[t]}, month ${m + 1}: ${v}`}</title></rect>)}</g>)}
    </svg>
    <p className="qm-hint">{kind === 'categorical' ? 'A hue per town: it says which town, and nothing about the counts. Right for categories, useless for amounts.' : kind === 'sequential' ? `White for 0, dark blue for ${most} (Leeds in January): lightness carries the amount. Each colour is mix(white, blue, count / ${most}).` : `Red below the mean month (${f(mean, 1)} orders), blue above, white at it: for values either side of a meaningful middle.`}</p>
  </div>
}

// 4.8: three tricks and their honest versions.
export function Misleading() {
  const rows = useMemo(clean, [])
  const [trick, setTrick] = useState('axis')
  const towns = C.TOWNS.map(town => ({ town, orders: rows.filter(r => r.town === town).length }))
  const W = 440, H = 200
  const bars = from => { const top = 120, y = v => H - 30 - (H - 50) * (v - from) / (top - from); return towns.map((t, k) => <g key={t.town}><rect x={40 + k * 100} width="70" y={y(t.orders)} height={H - 30 - y(t.orders)} fill={BLUE} /><text className="qm-tick" x={40 + k * 100} y={H - 14}>{t.town}</text><text className="qm-tick" x={40 + k * 100} y={y(t.orders) - 4}>{t.orders}</text></g>) }
  const leeds = towns[0].orders, harrogate = towns[2].orders
  return <div className="qm-fig">
    <Toggle value={trick} onChange={setTrick} options={[['axis', 'Truncated axis'], ['area', 'The area trick'], ['dual', 'Two y axes']]} />
    {trick === 'axis' && <div className="ds-drawings">
      <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Axis from 80">{bars(80)}<text className="qm-tick" x="4" y="14">axis from 80: lie factor {f(G.lieFactor(harrogate, leeds, harrogate - 80, leeds - 80), 1)}</text></svg>
      <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Axis from 0">{bars(0)}<text className="qm-tick" x="4" y="14">axis from 0: lie factor 1</text></svg>
    </div>}
    {trick === 'area' && <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Squares scaled by side and by area">
      <text className="qm-tick" x="4" y="14">Leeds is {f(leeds / harrogate, 2)}× Harrogate. Side scaled (left pair) shows {f((leeds / harrogate) ** 2, 2)}×; area scaled (right pair) shows {f(leeds / harrogate, 2)}×.</text>
      <rect x="20" y={H - 20 - 100 * harrogate / leeds} width={100 * harrogate / leeds} height={100 * harrogate / leeds} fill={RED} /><rect x="120" y={H - 120} width="100" height="100" fill={RED} />
      <rect x="260" y={H - 20 - 100 * Math.sqrt(harrogate / leeds)} width={100 * Math.sqrt(harrogate / leeds)} height={100 * Math.sqrt(harrogate / leeds)} fill={GREEN} /><rect x="340" y={H - 120} width="100" height="100" fill={GREEN} />
    </svg>}
    {trick === 'dual' && (() => {
      const web = Array.from({ length: 12 }, (_, m) => rows.filter(r => r.channel === 'web' && Number(r.date.slice(5, 7)) === m + 1).length)
      const shop = Array.from({ length: 12 }, (_, m) => rows.filter(r => r.channel === 'shop' && Number(r.date.slice(5, 7)) === m + 1).length)
      const line = (v, lo, hi) => v.map((x, m) => `${40 + m * 34},${H - 30 - (H - 50) * (x - lo) / ((hi - lo) || 1)}`).join(' ')
      return <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Two series, two axes">
        <text className="qm-tick" x="4" y="14">Web (blue) and shop (red) orders per month, each on its own axis stretched to fill the chart: they seem to move together and to be the same size.</text>
        <polyline fill="none" stroke={BLUE} strokeWidth="2" points={line(web, Math.min(...web), Math.max(...web))} />
        <polyline fill="none" stroke={RED} strokeWidth="2" points={line(shop, Math.min(...shop), Math.max(...shop))} />
        <text className="qm-tick" x="40" y={H - 8}>On one axis from 0, the shop’s {shop.reduce((s, v) => s + v, 0)} orders are clearly above the web’s {web.reduce((s, v) => s + v, 0)}.</text>
      </svg>
    })()}
  </div>
}
