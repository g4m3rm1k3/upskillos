import { useMemo, useState } from 'react'
import * as T from '../engine/tables.js'
import * as S from '../engine/summary.js'
import * as N from '../engine/numbers.js'
import { ORDERS_CSV, HEADER, Rng } from '../engine/data.js'
import { evaluateFormula, show } from '../engine/sheet.js'

const ROWS = () => T.readCsv(ORDERS_CSV())
const f = (x, d = 2) => (x === null || x === undefined ? '–' : Number.isInteger(x) ? String(x) : x.toFixed(d))
const Slider = ({ label, value, min, max, step = 1, onChange, format = v => v }) =>
  <label className="qm-slider">{label} <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /> <b className="mono">{format(value)}</b></label>
const Toggle = ({ options, value, onChange }) => <div className="qm-fig-controls">{options.map(([id, label]) => <button key={id} className={value === id ? 'active' : ''} onClick={() => onChange(id)}>{label}</button>)}</div>
const Rows = ({ rows, names = HEADER, max = 10 }) => <div className="qm-scroll"><table className="qm-log"><thead><tr>{names.map(n => <th key={n}>{n}</th>)}</tr></thead>
  <tbody>{rows.slice(0, max).map((r, i) => <tr key={i}>{names.map(n => <td key={n} className="mono" style={{ textAlign: 'left' }}>{r[n] === null ? 'None' : String(r[n])}</td>)}</tr>)}</tbody></table>
  {rows.length > max && <p className="qm-hint">… and {rows.length - max} more rows.</p>}</div>

// 1.1: the same orders as rows (dictionaries), as columns (lists), and as a sheet (lettered cells).
export function TableView() {
  const rows = useMemo(ROWS, [])
  const [layout, setLayout] = useState('rows')
  const [name, setName] = useState('item')
  const counts = T.countValues(T.column(rows, name))
  const few = rows.slice(0, 3)
  return <div className="qm-fig">
    <p className="qm-small"><b>{rows.length}</b> rows × <b>{HEADER.length}</b> columns = <b>{rows.length * HEADER.length}</b> cells</p>
    <Toggle value={layout} onChange={setLayout} options={[['rows', 'As rows (Python dictionaries)'], ['columns', 'As columns (lists)'], ['sheet', 'As a sheet']]} />
    {layout === 'rows' && <pre className="ds-code-out">{`rows = [\n${few.map(r => `    ${JSON.stringify(r).replaceAll('":"', '": "').replaceAll('","', '", "')},`).join('\n')}\n    … ${rows.length - 3} more\n]`}</pre>}
    {layout === 'columns' && <pre className="ds-code-out">{`columns = {\n${HEADER.map(n => `    "${n}": [${T.column(few, n).map(v => JSON.stringify(v)).join(', ')}, …],`).join('\n')}\n}`}</pre>}
    {layout === 'sheet' && <div className="qm-scroll ds-sheet-wrap"><table className="ds-sheet"><thead><tr><th />{HEADER.map((_, c) => <th key={c}>{String.fromCharCode(65 + c)}</th>)}</tr></thead>
      <tbody><tr><th>1</th>{HEADER.map(h => <td key={h} className="head">{h}</td>)}</tr>{rows.slice(0, 6).map((r, i) => <tr key={i}><th>{i + 2}</th>{HEADER.map(h => <td key={h}>{r[h]}</td>)}</tr>)}</tbody></table></div>}
    <p className="qm-hint">{layout === 'rows' ? 'One dictionary per order: to read one order, take one row.' : layout === 'columns' ? 'One list per column: to add up all the prices, take one list. Lesson 1.7 shows why pandas stores tables this way.' : 'The spreadsheet’s view: columns are letters, rows are numbers, and row 1 holds the names. The price of the first order is cell E2.'}</p>
    <label className="ds-select">Count the values of <select value={name} onChange={e => setName(e.target.value)}>{HEADER.filter(n => n !== 'order_id' && n !== 'date').map(n => <option key={n}>{n}</option>)}</select> with <code>count_values(column(rows, "{name}"))</code></label>
    <div className="qm-scroll"><table className="qm-log"><thead><tr><th>Value</th><th>Count</th></tr></thead><tbody>{Object.entries(counts).map(([v, n]) => <tr key={v}><td className="mono" style={{ textAlign: 'left' }}>{JSON.stringify(v)}</td><td>{n}</td></tr>)}</tbody></table></div>
  </div>
}

// 1.2: split_csv_line, one character at a time, next to the naive split.
export function CsvScanner() {
  const [line, setLine] = useState('A1004,2025-05-11,Harrogate,"Lights, front and back",25.00,1,shop')
  const steps = useMemo(() => T.splitCsvTrace(line), [line])
  const [at, setAt] = useState(steps.length - 1)
  const k = Math.min(at, steps.length - 1), step = steps[k]
  const chars = [...line]
  return <div className="qm-fig">
    <label className="ds-input"><span>A line of a CSV file</span><input value={line} onChange={e => { setLine(e.target.value); setAt(10 ** 6) }} spellCheck={false} /></label>
    <Slider label="Step" value={k} min={0} max={steps.length - 1} onChange={setAt} format={v => `${v + 1} of ${steps.length}`} />
    <div className="ds-line">{chars.map((ch, i) => <span key={i} className={`${i === step.at ? 'now' : ''}${i < step.at ? ' done' : ''}`}>{ch === ' ' ? '␣' : ch}</span>)}</div>
    <p className="qm-small">{step.ch === null ? 'End of the line.' : <>Character <b className="mono">{JSON.stringify(step.ch)}</b>: {step.did}.</>} State: <b>{step.inQuotes ? 'inside quotes' : 'outside quotes'}</b>.</p>
    <div className="ds-fields">{step.fields.map((x, i) => <span key={i}>{JSON.stringify(x)}</span>)}{step.ch !== null && <span className="building">{JSON.stringify(step.field)} …</span>}</div>
    <p className="qm-small"><b>{T.splitCsvLine(line).length}</b> fields from <code>split_csv_line</code>; <b>{line.split(',').length}</b> from <code>line.split(",")</code>: {JSON.stringify(line.split(','))}</p>
  </div>
}

// 1.3: what a float really stores, and money in floats against money in pence.
export function FloatExplorer() {
  const [text, setText] = useState('0.1')
  const x = Number(text)
  const bits = N.bitsOf(x)
  const prices = useMemo(() => ROWS().map(r => r.price).filter(Boolean), [])
  const floatTotal = S.total(prices.map(Number)), penceTotal = prices.map(T.toPence).reduce((a, b) => a + b, 0)
  return <div className="qm-fig">
    <label className="ds-input"><span>A number</span><input value={text} onChange={e => setText(e.target.value)} /></label>
    {Number.isFinite(x) ? <>
      <p className="qm-small">Stored exactly as: <code className="ds-wrap">{N.exactDecimal(x)}</code></p>
      <p className="qm-small mono ds-wrap">sign {bits.sign} · exponent {bits.exponent} · fraction {bits.fraction}</p>
      {x > 0 && x < 1 && <p className="qm-small">In binary: 0.<span className="mono">{N.binaryDigits(x, 40).map(s => s.digit).join('')}</span>…</p>}
    </> : <p className="qm-hint">Not a number.</p>}
    <table className="qm-kv"><tbody>
      <tr><td><code>0.1 + 0.2</code></td><td className="mono">{N.exactDecimal(0.1 + 0.2)}</td></tr>
      <tr><td><code>0.3</code></td><td className="mono">{N.exactDecimal(0.3)}</td></tr>
      <tr><td>The {prices.length} prices added as floats</td><td className="mono">{floatTotal}</td></tr>
      <tr><td>The same prices added in whole pence</td><td className="mono">{penceTotal} pence = £{Math.floor(penceTotal / 100)}.{String(penceTotal % 100).padStart(2, '0')}</td></tr>
    </tbody></table>
  </div>
}

// 1.4: the blanks in the price column, skipped or counted as 0.
export function MissingDemo() {
  const rows = useMemo(() => T.withNumbers(ROWS(), ['price', 'quantity']), [])
  const [mode, setMode] = useState('skip')
  const prices = T.column(rows, 'price')
  const [skipped, missing] = T.meanOf(prices)
  const zero = S.mean(prices.map(p => p ?? 0))
  const sheet = evaluateFormula('orders', mode === 'skip' ? '=AVERAGE(E2:E403)' : '=SUM(E2:E403)/COUNTA(A2:A403)').value
  return <div className="qm-fig">
    <Toggle value={mode} onChange={setMode} options={[['skip', 'Skip the blanks'], ['zero', 'Count the blanks as 0']]} />
    <p className="qm-small"><b>{missing}</b> of {prices.length} prices are missing. Mean: <b>{f(mode === 'skip' ? skipped : zero, 4)}</b> (spreadsheet: <span className="mono">{mode === 'skip' ? '=AVERAGE(E2:E403)' : '=SUM(E2:E403)/COUNTA(A2:A403)'}</span> gives {show(sheet)})</p>
    <Rows rows={rows.filter(r => r.price === null)} max={8} />
  </div>
}

// 1.5: filters, with the text exactly as typed or tidied, against the spreadsheet's COUNTIFS.
export function QueryBuilder() {
  const rows = useMemo(ROWS, [])
  const [town, setTown] = useState('Leeds'), [channel, setChannel] = useState('web'), [tidy, setTidy] = useState(false)
  const norm = v => (tidy ? v.trim().toLowerCase() : v)
  const found = rows.filter(r => (!town || norm(r.town) === norm(town)) && (!channel || r.channel === channel))
  const formula = `=COUNTIFS(${town ? `C2:C403,"${town}"` : 'A2:A403,"<>"'}${channel ? `,G2:G403,"${channel}"` : ''})`
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <label className="ds-select">town = <select value={town} onChange={e => setTown(e.target.value)}><option value="">(any)</option>{Object.keys(T.countValues(T.column(rows, 'town'))).map(t => <option key={t} value={t}>{JSON.stringify(t)}</option>)}</select></label>
      <label className="ds-select">and channel = <select value={channel} onChange={e => setChannel(e.target.value)}><option value="">(any)</option><option>web</option><option>shop</option></select></label>
      <label className="ds-select"><input type="checkbox" checked={tidy} onChange={e => setTidy(e.target.checked)} /> tidy the text first (strip spaces, lower case)</label>
    </div>
    <p className="qm-small">Python: <b>{found.length}</b> rows · Spreadsheet <span className="mono">{formula}</span>: <b>{show(evaluateFormula('orders', formula).value)}</b></p>
    <Rows rows={found} max={8} />
  </div>
}

// 1.6: insertion sort against merge sort, counted, on the same list.
export function SortRace() {
  const [n, setN] = useState(400), [order, setOrder] = useState('random')
  const values = useMemo(() => {
    const rng = new Rng(11), v = Array.from({ length: n }, () => rng.below(10000))
    return order === 'sorted' ? S.sorted(v) : order === 'reversed' ? S.sorted(v).reverse() : v
  }, [n, order])
  const ins = T.insertionComparisons(values), mer = T.mergeComparisons(values).compared
  const W = 420, H = 200, P = 34, maxN = 2000, top = maxN * (maxN - 1) / 2
  const x = m => P + (W - P - 10) * m / maxN, y = c => H - P - (H - P - 10) * Math.min(1, c / top)
  const curve = fn => Array.from({ length: 41 }, (_, k) => { const m = Math.max(1, k * 50); return `${x(m)},${y(fn(m))}` }).join(' ')
  return <div className="qm-fig">
    <Slider label="Values to sort" value={n} min={10} max={maxN} step={10} onChange={setN} />
    <Toggle value={order} onChange={setOrder} options={[['random', 'Random'], ['sorted', 'Already sorted'], ['reversed', 'Reversed']]} />
    <table className="qm-kv"><tbody>
      <tr><td>Insertion sort</td><td><b>{ins.toLocaleString('en-GB')}</b> comparisons</td><td className="qm-dim">n(n−1)/2 = {(n * (n - 1) / 2).toLocaleString('en-GB')} at worst</td></tr>
      <tr><td>Merge sort</td><td><b>{mer.toLocaleString('en-GB')}</b> comparisons</td><td className="qm-dim">n log₂ n ≈ {Math.round(n * Math.log2(n)).toLocaleString('en-GB')}</td></tr>
    </tbody></table>
    <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Comparisons against the number of values">
      <line className="qm-axis" x1={P} y1={H - P} x2={W - 5} y2={H - P} /><line className="qm-axis" x1={P} y1={10} x2={P} y2={H - P} />
      <text className="qm-tick" x={W / 2 - 20} y={H - 8}>n, up to {maxN}</text><text className="qm-tick" x={4} y={14}>comparisons</text>
      <polyline fill="none" stroke="#b0413e" strokeWidth="2" points={curve(m => m * (m - 1) / 2)} />
      <polyline fill="none" stroke="#1f6f68" strokeWidth="2" points={curve(m => m * Math.log2(m))} />
      <circle cx={x(n)} cy={y(ins)} r="4" fill="#b0413e" /><circle cx={x(n)} cy={y(mer)} r="4" fill="#1f6f68" />
    </svg>
    <p className="qm-hint">Red: insertion sort’s worst case, n(n−1)/2. Green: n log₂ n. The dots are this list’s real counts. On an already sorted list insertion sort needs only n − 1 comparisons: each value is checked once against its neighbour.</p>
  </div>
}

// 1.7: a boolean mask, made from whole columns at once.
export function RowsVsColumns() {
  const rows = useMemo(() => T.priced(ROWS()), [])
  const [threshold, setThreshold] = useState(100)
  const totals = rows.map(r => r.price * r.quantity), mask = totals.map(t => t >= threshold)
  const count = mask.filter(Boolean).length
  return <div className="qm-fig">
    <Slider label="Order total at least £" value={threshold} min={0} max={500} step={5} onChange={setThreshold} />
    <p className="qm-small"><code>mask = frame["price"] * frame["quantity"] &gt;= {threshold}</code> · <code>mask.sum()</code> = <b>{count}</b> · <code>mask.mean()</code> = <b>{f(count / rows.length, 4)}</b></p>
    <div className="qm-scroll"><table className="qm-log"><thead><tr><th>order_id</th><th>price</th><th>quantity</th><th>price × quantity</th><th>mask</th></tr></thead>
      <tbody>{rows.slice(0, 10).map((r, i) => <tr key={r.order_id} className={mask[i] ? 'pass' : ''}><td className="mono">{r.order_id}</td><td>{f(r.price)}</td><td>{r.quantity}</td><td>{f(totals[i])}</td><td className="mono">{mask[i] ? 'True' : 'False'}</td></tr>)}</tbody></table></div>
    <p className="qm-hint">True counts as 1 and False as 0, so adding up the mask counts the matching rows, and its mean is the fraction that match ({count} of the {rows.length} orders with a price).</p>
  </div>
}
