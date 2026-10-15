import { useMemo, useState } from 'react'
import * as T from '../engine/tables.js'
import * as S from '../engine/summary.js'
import { ORDERS_CSV, Rng } from '../engine/data.js'
import { evaluateFormula, show } from '../engine/sheet.js'

const PRICED = () => T.priced(T.readCsv(ORDERS_CSV()))
const f = (x, d = 2) => (x === null || x === undefined || Number.isNaN(x) ? '–' : Number.isInteger(x) ? String(x) : x.toFixed(d))
const Slider = ({ label, value, min, max, step = 1, onChange, format = v => v }) =>
  <label className="qm-slider">{label} <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /> <b className="mono">{format(value)}</b></label>
const Toggle = ({ options, value, onChange }) => <div className="qm-fig-controls">{options.map(([id, label]) => <button key={id} className={value === id ? 'active' : ''} onClick={() => onChange(id)}>{label}</button>)}</div>
const parseList = text => text.split(/[\s,]+/).map(Number).filter(Number.isFinite)
function ListInput({ value, onChange, label = 'Values' }) {
  return <label className="ds-input"><span>{label} (numbers, separated by spaces or commas)</span><input value={value} onChange={e => onChange(e.target.value)} spellCheck={false} /></label>
}
const ITEMS = () => [...new Set(PRICED().map(r => r.item))]

// A number line with dots for the values and marks for named points.
function NumberLine({ values, marks = [], lo, hi }) {
  const W = 420, H = 70, P = 16
  lo ??= Math.min(...values); hi ??= Math.max(...values)
  const span = hi - lo || 1, x = v => P + (W - 2 * P) * (v - lo) / span
  return <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="The values on a number line">
    <line className="qm-axis" x1={P} y1={40} x2={W - P} y2={40} />
    {values.map((v, i) => <circle key={i} cx={x(v)} cy={40 - 8 * (values.slice(0, i).filter(u => Math.abs(x(u) - x(v)) < 4).length)} r="4" fill="#3f5bb5" opacity=".75"><title>{String(v)}</title></circle>)}
    {marks.map(({ v, label, color }) => <g key={label}><line x1={x(v)} y1={14} x2={x(v)} y2={52} stroke={color} strokeWidth="2" /><text className="qm-tick" x={x(v) + 3} y={64} fill={color}>{label}</text></g>)}
    <text className="qm-tick" x={P} y={12}>{f(lo)}</text><text className="qm-tick" x={W - P - 30} y={12}>{f(hi)}</text>
  </svg>
}

// 2.1–2.2: the squared and absolute error of a centre c; their lowest points are the mean and the median.
export function BalancePoint() {
  const [text, setText] = useState('2 3 3 4 5 6 20')
  const values = parseList(text)
  const ok = values.length > 0
  const lo = ok ? Math.min(...values) : 0, hi = ok ? Math.max(...values) : 1
  const [c, setC] = useState(5)
  const W = 420, H = 180, P = 30, N = 80
  const cs = Array.from({ length: N + 1 }, (_, k) => lo + (hi - lo) * k / N)
  const sq = cs.map(x => S.squaredError(values, x)), ab = cs.map(x => S.absoluteError(values, x))
  const top = v => Math.max(...v, 1e-9)
  const X = x => P + (W - 2 * P) * (x - lo) / ((hi - lo) || 1), Y = (v, m) => H - P - (H - 2 * P) * v / m
  return <div className="qm-fig">
    <ListInput value={text} onChange={setText} />
    {ok && <>
      <Slider label="Centre c" value={Math.min(hi, Math.max(lo, c))} min={lo} max={hi} step={(hi - lo) / 200 || 0.01} onChange={setC} format={v => f(v)} />
      <NumberLine values={values} marks={[{ v: S.mean(values), label: 'mean', color: '#b0413e' }, { v: S.median(values), label: 'median', color: '#1f6f68' }, { v: c, label: 'c', color: '#7a3fb0' }]} />
      <p className="qm-small">Squared error Σ(xᵢ − c)² = <b>{f(S.squaredError(values, c))}</b> (smallest at the mean, <b>{f(S.mean(values))}</b>) · absolute error Σ|xᵢ − c| = <b>{f(S.absoluteError(values, c))}</b> (smallest at the median, <b>{f(S.median(values))}</b>)</p>
      <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Both errors against c">
        <line className="qm-axis" x1={P} y1={H - P} x2={W - P} y2={H - P} />
        <polyline fill="none" stroke="#b0413e" strokeWidth="2" points={cs.map((x, k) => `${X(x)},${Y(sq[k], top(sq))}`).join(' ')} />
        <polyline fill="none" stroke="#1f6f68" strokeWidth="2" points={cs.map((x, k) => `${X(x)},${Y(ab[k], top(ab))}`).join(' ')} />
        <line x1={X(c)} y1={10} x2={X(c)} y2={H - P} stroke="#7a3fb0" />
        <text className="qm-tick" x={P} y={H - 10}>c from {f(lo)} to {f(hi)}</text>
      </svg>
      <p className="qm-hint">Red: squared error (each curve scaled to its own height). Green: absolute error, made of straight pieces with corners at the values. Move the 20 further away: the mean follows it, the median doesn’t move.</p>
    </>}
  </div>
}

// 2.2: a quantile, found by position q(n − 1) and a straight line between neighbours.
export function QuantileExplorer() {
  const [text, setText] = useState('3 1 4 1 5 9 2 6')
  const [q, setQ] = useState(0.25)
  const values = parseList(text)
  if (!values.length) return <div className="qm-fig"><ListInput value={text} onChange={setText} /><p className="qm-hint">Type some numbers.</p></div>
  const s = S.sorted(values), pos = q * (s.length - 1), below = Math.floor(pos)
  return <div className="qm-fig">
    <ListInput value={text} onChange={setText} />
    <Slider label="q" value={q} min={0} max={1} step={0.05} onChange={setQ} format={v => v.toFixed(2)} />
    <div className="ds-fields">{s.map((v, i) => <span key={i} className={i === below || i === Math.min(below + 1, s.length - 1) ? 'building' : ''}>{i}: {v}</span>)}</div>
    <p className="qm-small">Position q(n − 1) = {q.toFixed(2)} × {s.length - 1} = <b>{f(pos, 3)}</b>: between sorted[{below}] = {s[below]} and sorted[{Math.min(below + 1, s.length - 1)}] = {s[Math.min(below + 1, s.length - 1)]}, {f(pos - below, 3)} of the way. Quantile = <b>{f(S.quantile(values, q), 4)}</b></p>
    <p className="qm-hint">The spreadsheet’s PERCENTILE.INC and pandas’ quantile use this same rule. (Spreadsheets also have PERCENTILE.EXC, which uses q(n + 1) and gives different answers: always check which rule a tool uses.)</p>
  </div>
}

// 2.3: quickselect, round by round.
export function QuickselectTrace() {
  const [text, setText] = useState('49.05 409.5 30.6 25 36.8 6.37 25 41.2 45.5 7.14 28.05')
  const values = parseList(text)
  const [k, setK] = useState(5)
  if (!values.length) return <div className="qm-fig"><ListInput value={text} onChange={setText} /></div>
  const kk = Math.min(k, values.length - 1)
  const { value, rounds } = S.quickselectTrace(values, kk)
  return <div className="qm-fig">
    <ListInput value={text} onChange={setText} />
    <Slider label="k (0 is the smallest)" value={kk} min={0} max={values.length - 1} onChange={setK} />
    <ol className="ds-rounds">{rounds.map((r, i) => <li key={i}><span className="mono">[{r.items.join(', ')}]</span> · pivot <b>{r.pivot}</b> · {r.smaller} smaller, {r.equal} equal · k = {r.k} → {r.k < r.smaller ? 'keep the smaller ones' : r.k < r.smaller + r.equal ? <b>it is the pivot</b> : `keep the larger ones, k = ${r.k - r.smaller - r.equal}`}</li>)}</ol>
    <p className="qm-small">Answer: <b>{value}</b> (sorted, position {kk} holds {S.sorted(values)[kk]}). Values looked at: <b>{rounds.reduce((s, r) => s + r.compared, 0)}</b>, for n = {values.length}.</p>
  </div>
}

// 2.4: spread, the deviations from the mean, and dividing by n or n − 1.
export function SpreadExplorer() {
  const [text, setText] = useState('45 49 41 47 43 45 46')
  const values = parseList(text)
  if (values.length < 2) return <div className="qm-fig"><ListInput value={text} onChange={setText} /><p className="qm-hint">Type at least two numbers.</p></div>
  const m = S.mean(values), dev = values.map(x => x - m)
  return <div className="qm-fig">
    <ListInput value={text} onChange={setText} />
    <div className="qm-scroll"><table className="qm-log"><thead><tr><th>x</th><th>x − mean</th><th>(x − mean)²</th></tr></thead>
      <tbody>{values.map((x, i) => <tr key={i}><td>{x}</td><td>{f(dev[i], 3)}</td><td>{f(dev[i] ** 2, 3)}</td></tr>)}
        <tr className="pass"><td>mean {f(m, 3)}</td><td>sum {f(S.total(dev), 6)}</td><td>sum {f(S.total(dev.map(d => d * d)), 3)}</td></tr></tbody></table></div>
    <p className="qm-small">Variance ÷ n = <b>{f(S.variance(values, false), 4)}</b> · ÷ (n − 1) = <b>{f(S.variance(values), 4)}</b> · standard deviation (n − 1) = <b>{f(S.std(values), 4)}</b></p>
    <p className="qm-hint">The deviations always add up to 0 (up to rounding), so their plain mean says nothing about spread: squaring makes every one count.</p>
  </div>
}

// 2.4: why n − 1: draw many samples and average their variances.
export function BesselSimulator() {
  const population = useMemo(() => PRICED().filter(r => r.item === 'Helmet').map(r => r.price), [])
  const [n, setN] = useState(3)
  const truth = S.variance(population, false)
  const result = useMemo(() => {
    const rng = new Rng(5 + n), runs = 4000
    let byN = 0, byN1 = 0
    for (let r = 0; r < runs; r++) {
      const sample = Array.from({ length: n }, () => population[rng.below(population.length)])
      byN += S.variance(sample, false); byN1 += S.variance(sample)
    }
    return { byN: byN / runs, byN1: byN1 / runs, runs }
  }, [n, population])
  return <div className="qm-fig">
    <Slider label="Sample size n" value={n} min={2} max={30} onChange={setN} />
    <table className="qm-kv"><tbody>
      <tr><td>The population’s variance (all {population.length} helmet prices, ÷ N)</td><td><b>{f(truth, 3)}</b></td></tr>
      <tr><td>Average of {result.runs.toLocaleString('en-GB')} samples’ variances, ÷ n</td><td><b>{f(result.byN, 3)}</b> ({f(100 * result.byN / truth, 1)}% of the truth)</td></tr>
      <tr><td>The same samples, ÷ (n − 1)</td><td><b>{f(result.byN1, 3)}</b> ({f(100 * result.byN1 / truth, 1)}%)</td></tr>
      <tr><td>The derivation’s prediction for ÷ n: (n − 1)/n</td><td>{f(100 * (n - 1) / n, 1)}%</td></tr>
    </tbody></table>
    <p className="qm-hint">Each sample is {n} prices drawn at random (with replacement) from the {population.length} helmet prices. Dividing by n comes out too small on average, by exactly the factor the derivation gives; dividing by n − 1 comes out right, give or take the randomness of {result.runs.toLocaleString('en-GB')} samples.</p>
  </div>
}

// 2.5: the shortcut formula against Welford, as the values get bigger.
export function CancellationDemo() {
  const [power, setPower] = useState(9)
  const base = [4, 7, 13, 16], offset = 10 ** power
  const values = base.map(x => offset + x)
  const [, w] = S.welford(values)
  return <div className="qm-fig">
    <Slider label="Add 10 to the power" value={power} min={0} max={15} onChange={setPower} format={v => `${v} (${(10 ** v).toLocaleString('en-GB')})`} />
    <p className="qm-small mono">{values.map(v => v.toLocaleString('en-GB', { maximumFractionDigits: 0 })).join(', ')}</p>
    <table className="qm-kv"><tbody>
      <tr><td>True sample variance (adding a constant changes nothing)</td><td><b>30</b></td></tr>
      <tr><td>Two passes: mean first, then squared distances</td><td><b>{f(S.variance(values), 6)}</b></td></tr>
      <tr><td>Shortcut: (Σx² − (Σx)²/n) / (n − 1)</td><td><b className={Math.abs(S.shortcutVariance(values) - 30) > 1e-6 ? 'qm-yes' : ''}>{f(S.shortcutVariance(values), 6)}</b></td></tr>
      <tr><td>Welford, one pass</td><td><b>{f(w, 6)}</b></td></tr>
    </tbody></table>
    <p className="qm-hint">Σx² is about {(4 * offset * offset).toExponential(2)}; a double keeps about 16 significant digits, so anything past the 16th digit of that sum is lost before the subtraction even starts.</p>
  </div>
}

// 2.6: outliers by z-score and by the IQR rule, over all prices or within one item.
export function OutlierFinder() {
  const rows = useMemo(PRICED, [])
  const [item, setItem] = useState('')
  const [k, setK] = useState(1.5)
  const values = (item ? rows.filter(r => r.item === item) : rows).map(r => r.price)
  const { q1, q3, low, high } = S.iqrFences(values, k)
  const iqr = S.iqrOutliers(values, k), z = S.zScores(values), zFlag = values.filter((_, i) => Math.abs(z[i]) > 3)
  return <div className="qm-fig">
    <label className="ds-select">Prices of <select value={item} onChange={e => setItem(e.target.value)}><option value="">every item together</option>{ITEMS().map(i => <option key={i}>{i}</option>)}</select></label>
    <Slider label="k" value={k} min={0.5} max={3} step={0.5} onChange={setK} />
    <NumberLine values={values} marks={[{ v: q1, label: 'Q1', color: '#1f6f68' }, { v: q3, label: 'Q3', color: '#1f6f68' }, { v: Math.max(low, Math.min(...values)), label: 'low fence', color: '#b0413e' }, { v: Math.min(high, Math.max(...values)), label: 'high fence', color: '#b0413e' }]} />
    <p className="qm-small">{values.length} prices · Q1 {f(q1)} · Q3 {f(q3)} · fences {f(low)} and {f(high)} · median {f(S.median(values))} · MAD {f(S.mad(values))}</p>
    <p className="qm-small">IQR rule flags <b>{iqr.length}</b>: {iqr.slice(0, 12).map(v => f(v)).join(', ')}{iqr.length > 12 ? ', …' : ''} · |z| &gt; 3 flags <b>{zFlag.length}</b>: {zFlag.slice(0, 12).map(v => f(v)).join(', ')}</p>
  </div>
}

// 2.7: group-by: split the rows by one column, then summarise each group.
export function GroupByView() {
  const rows = useMemo(PRICED, [])
  const [key, setKey] = useState('item'), [how, setHow] = useState('mean'), [name, setName] = useState('price')
  const groups = S.groupBy(rows, key)
  const result = S.aggregate(groups, name, how)
  const spreadsheet = { mean: 'AVERAGEIF', sum: 'SUMIF', count: 'COUNTIF' }[how]
  const col = { item: 'D', town: 'C', channel: 'G' }[key], valCol = { price: 'E', quantity: 'F' }[name]
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <label className="ds-select">Group by <select value={key} onChange={e => setKey(e.target.value)}>{['item', 'town', 'channel'].map(k => <option key={k}>{k}</option>)}</select></label>
      <label className="ds-select">then <select value={how} onChange={e => setHow(e.target.value)}>{Object.keys(S.SUMMARIES).map(h => <option key={h}>{h}</option>)}</select></label>
      <label className="ds-select">of <select value={name} onChange={e => setName(e.target.value)}><option>price</option><option>quantity</option></select></label>
    </div>
    <div className="qm-scroll"><table className="qm-log"><thead><tr><th>{key}</th><th>rows</th><th>{how} of {name}</th>{spreadsheet && <th>spreadsheet {spreadsheet}</th>}</tr></thead>
      <tbody>{[...result].map(([k, v]) => { const formula = spreadsheet && (how === 'count' ? `=COUNTIF(${col}2:${col}403,"${k}")` : `=${spreadsheet}(${col}2:${col}403,"${k}",${valCol}2:${valCol}403)`); return <tr key={k}><td className="mono" style={{ textAlign: 'left' }}>{JSON.stringify(k)}</td><td>{groups.get(k).length}</td><td><b>{f(v, 3)}</b></td>{spreadsheet && <td className="mono" title={formula}>{show(evaluateFormula('orders', formula).value)}</td>}</tr> })}</tbody></table></div>
    <p className="qm-hint">The spreadsheet column runs AVERAGEIF, SUMIF or COUNTIF on all 402 rows, missing prices included as blanks it skips: so its counts can be larger than the rows column, and it ignores capitals when it matches.</p>
  </div>
}

// 2.8: a pivot table: two keys, totals both ways.
export function PivotBuilder() {
  const rows = useMemo(PRICED, [])
  const [rowKey, setRowKey] = useState('item'), [colKey, setColKey] = useState('channel'), [name, setName] = useState('quantity')
  const keys = ['item', 'town', 'channel']
  const table = S.pivot(rows, rowKey, colKey, name)
  const rowNames = Object.keys(table), colNames = rowNames.length ? Object.keys(table[rowNames[0]]) : []
  const rowTotal = r => S.total(colNames.map(c => table[r][c])), colTotal = c => S.total(rowNames.map(r => table[r][c]))
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <label className="ds-select">Rows <select value={rowKey} onChange={e => setRowKey(e.target.value)}>{keys.map(k => <option key={k}>{k}</option>)}</select></label>
      <label className="ds-select">Columns <select value={colKey} onChange={e => setColKey(e.target.value)}>{keys.map(k => <option key={k}>{k}</option>)}</select></label>
      <label className="ds-select">Total of <select value={name} onChange={e => setName(e.target.value)}><option>quantity</option><option>price</option></select></label>
    </div>
    <div className="qm-scroll"><table className="qm-log"><thead><tr><th>{rowKey} \ {colKey}</th>{colNames.map(c => <th key={c}>{c}</th>)}<th>total</th></tr></thead>
      <tbody>{rowNames.map(r => <tr key={r}><td className="mono" style={{ textAlign: 'left' }}>{JSON.stringify(r)}</td>{colNames.map(c => <td key={c}>{f(table[r][c])}</td>)}<td><b>{f(rowTotal(r))}</b></td></tr>)}
        <tr className="pass"><td>total</td>{colNames.map(c => <td key={c}><b>{f(colTotal(c))}</b></td>)}<td><b>{f(S.total(rowNames.map(rowTotal)))}</b></td></tr></tbody></table></div>
    <p className="qm-hint">Try rows = town: the misspelt towns get rows of their own. A pivot table shows the categories exactly as they are typed, which makes it a good way to find messy ones.</p>
  </div>
}
