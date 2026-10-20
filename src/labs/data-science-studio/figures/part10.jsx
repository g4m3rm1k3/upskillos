import { useMemo, useState } from 'react'
import * as B from '../engine/database.js'
import * as W from '../engine/forecasting.js'
import { SHOP_TABLES, typedRows } from '../engine/sqlRun.js'

const f = (x, d = 2) => (x === null || x === undefined || !Number.isFinite(x) ? '–' : Number.isInteger(x) ? String(x) : x.toFixed(d))
const Slider = ({ label, value, min, max, step = 1, onChange, format = v => v }) =>
  <label className="qm-slider">{label} <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /> <b className="mono">{format(value)}</b></label>
const Toggle = ({ options, value, onChange }) => <div className="qm-fig-controls">{options.map(([id, label]) => <button key={id} className={value === id ? 'active' : ''} onClick={() => onChange(id)}>{label}</button>)}</div>
const BLUE = '#3f5bb5', RED = '#b0413e', GREY = '#9aa3b2', GOLD = '#b7791f', PURPLE = '#6a4fb3'

let shopCache = null
const shop = () => (shopCache ??= (() => { const t = SHOP_TABLES(); return { orders: typedRows(t.orders), returns: typedRows(t.returns), days: typedRows(t.days) } })())

// 10.2: what a condition does to each row: true, false, or unknown (NULL), and the logic of unknown.
const T3 = [true, null, false], word = v => (v === null ? 'unknown' : v ? 'true' : 'false')
const and3 = (a, b) => (a === false || b === false ? false : a === null || b === null ? null : true)
const or3 = (a, b) => (a === true || b === true ? true : a === null || b === null ? null : false)
const CONDITIONS = {
  gt: ['price > 50', p => (p === null ? null : p > 50)],
  le: ['price <= 50', p => (p === null ? null : p <= 50)],
  eqnull: ['price = NULL', () => null],
  isnull: ['price IS NULL', p => p === null],
  not: ['NOT (price > 50)', p => (p === null ? null : !(p > 50))],
}
export function NullLogic() {
  const [cond, setCond] = useState('gt'), [op, setOp] = useState('and')
  const prices = useMemo(() => shop().orders.map(r => r.price), [])
  const verdicts = prices.map(CONDITIONS[cond][1])
  const count = v => verdicts.filter(x => x === v).length
  const table = op === 'and' ? and3 : or3
  return <div className="qm-fig">
    <Toggle options={Object.entries(CONDITIONS).map(([id, [label]]) => [id, label])} value={cond} onChange={setCond} />
    <p className="qm-small">WHERE <b className="mono">{CONDITIONS[cond][0]}</b> on the 402 orders: true for <b>{count(true)}</b> (kept), false for <b>{count(false)}</b>, unknown for <b>{count(null)}</b> (left out with the false ones). {cond === 'gt' || cond === 'le' ? <>Together, <span className="mono">price &gt; 50</span> and <span className="mono">price &lt;= 50</span> keep {prices.filter(p => p !== null).length} rows, not 402: the {count(null)} missing prices are in neither.</> : cond === 'eqnull' ? 'NULL means “not known”, so “is it equal to not known?” is not known either, for every row.' : cond === 'isnull' ? 'IS NULL is the one test that is true for a missing value.' : 'NOT of unknown is still unknown: the missing prices are not kept by the condition or by its opposite.'}</p>
    <Toggle options={[['and', 'AND'], ['or', 'OR']]} value={op} onChange={setOp} />
    <table className="qm-log mono"><thead><tr><th>{op.toUpperCase()}</th>{T3.map(b => <th key={word(b)}>{word(b)}</th>)}</tr></thead>
      <tbody>{T3.map(a => <tr key={word(a)}><td><b>{word(a)}</b></td>{T3.map(b => { const v = table(a, b); return <td key={word(b)} style={{ color: v === null ? PURPLE : v ? BLUE : RED }}>{word(v)}</td> })}</tr>)}</tbody></table>
  </div>
}

// 10.4: a join is every pair of rows, kept where the keys match.
export function JoinCross() {
  const [n, setN] = useState(6)
  const { returns, orders } = useMemo(() => {
    const s = shop(), ret = s.returns.slice(0, 5)
    const ids = new Set(ret.map(r => r.order_id))
    const matching = s.orders.filter(o => ids.has(o.order_id)), others = s.orders.filter(o => !ids.has(o.order_id))
    return { returns: ret, orders: [...matching, ...others].slice(0, 10) }
  }, [])
  const shown = orders.slice(0, Math.max(1, Math.min(10, n)))
  const hits = returns.flatMap(r => shown.filter(o => o.order_id === r.order_id).map(o => [r.return_id, o.order_id]))
  return <div className="qm-fig">
    <Slider label="Orders shown" value={shown.length} min={1} max={10} onChange={setN} />
    <table className="qm-log mono"><thead><tr><th>returns ↓ · orders →</th>{shown.map(o => <th key={o.order_id + o.date}>{o.order_id}</th>)}</tr></thead>
      <tbody>{returns.map(r => <tr key={r.return_id}><td>{r.return_id} ({r.order_id})</td>{shown.map((o, k) => { const hit = o.order_id === r.order_id; return <td key={k} style={{ textAlign: 'center', background: hit ? 'rgba(63,91,181,.18)' : undefined, color: hit ? BLUE : GREY }}>{hit ? '✓' : '·'}</td> })}</tr>)}</tbody></table>
    <p className="qm-small">{returns.length} × {shown.length} = <b>{returns.length * shown.length}</b> pairs in the cross product; ON r.order_id = o.order_id keeps <b>{hits.length}</b>. On the full tables: 25 × 402 = 10,050 pairs. A database never builds them all: it reads a hash table or an index (lessons 3.6 and 10.5) and goes straight to the matches.</p>
  </div>
}

// 10.5: finding one order id in the sorted index by halving, against reading every row.
export function IndexSearch() {
  const orders = useMemo(() => shop().orders, [])
  const index = useMemo(() => B.buildIndex(orders, 'order_id'), [orders])
  const [id, setId] = useState('A1100'), [fanout, setFanout] = useState(100)
  const steps = [], [found, count] = B.binarySearch(index, id.trim().toUpperCase(), steps)
  const scanned = orders.length
  return <div className="qm-fig">
    <label className="ds-input"><span>Order id</span><input value={id} onChange={e => setId(e.target.value)} spellCheck={false} /></label>
    <table className="qm-log mono"><thead><tr><th>step</th><th>looking between</th><th>middle</th><th>middle id</th><th>then</th></tr></thead>
      <tbody>{steps.map(([lo, mid, hi], k) => <tr key={k}><td>{k + 1}</td><td>{lo} to {hi - 1}</td><td>{mid}</td><td>{index[mid][0]}</td><td>{index[mid][0] < id.trim().toUpperCase() ? 'go right' : 'go left (or here)'}</td></tr>)}</tbody></table>
    <p className="qm-small">{found.length ? <>Found at row{found.length > 1 ? 's' : ''} <b>{found.join(', ')}</b> of the table{found.length > 1 ? ' (a duplicated id)' : ''}</> : 'Not in the table'} after <b>{count}</b> comparisons. Without the index SQLite reads all <b>{scanned}</b> rows: log₂ {scanned} ≈ {f(Math.log2(scanned), 1)}.</p>
    <Slider label="B-tree page holds" value={fanout} min={2} max={500} onChange={setFanout} format={v => `${v} keys`} />
    <table className="qm-log mono"><thead><tr><th>rows</th><th>scan reads</th><th>binary search</th><th>B-tree levels</th></tr></thead>
      <tbody>{[402, 1e4, 1e6, 1e9].map(n => <tr key={n}><td>{n.toLocaleString('en-GB')}</td><td>{n.toLocaleString('en-GB')}</td><td>{Math.ceil(Math.log2(n + 1))}</td><td>{B.btreeLevels(n, fanout)}</td></tr>)}</tbody></table>
  </div>
}

// 10.7: a window frame sliding down the days, and lesson 9.2's moving average beside it.
export function WindowFrame() {
  const riders = useMemo(() => shop().days.map(r => r.riders), [])
  const [preceding, setPreceding] = useState(6), [row, setRow] = useState(3)
  const p = Math.max(0, Math.min(30, preceding)), r = Math.max(0, Math.min(40, row))
  const sqlAvg = B.windowAverage(riders, p), part9 = [...Array(p).fill(null), ...W.movingAverage(riders, p + 1)]
  const start = Math.max(0, r - p)
  return <div className="qm-fig">
    <Slider label="ROWS BETWEEN … PRECEDING" value={p} min={0} max={30} onChange={setPreceding} />
    <Slider label="Current row (day)" value={r} min={0} max={40} onChange={setRow} />
    <div className="ds-line">{riders.slice(0, 41).map((v, k) => <span key={k} title={`day ${k}: ${v}`} className={k === r ? 'now' : k >= start && k <= r ? 'quoted' : ''}>{k}</span>)}</div>
    <p className="qm-small">Frame: days {start} to {r}, {r - start + 1} row{r - start ? 's' : ''}. SQL’s AVG(riders) OVER (ORDER BY date ROWS BETWEEN {p} PRECEDING AND CURRENT ROW) = <b>{f(sqlAvg[r], 2)}</b>; lesson 9.2’s {p + 1}-day average = <b>{part9[r] === null ? 'none yet' : f(part9[r], 2)}</b>{r < p ? ': SQL averages the rows it has; the moving average waits for a full window.' : ': the same once the window is full.'}</p>
    <svg className="qm-plot" viewBox="0 0 440 60" role="img" aria-label="The frame on the first 41 days">
      {riders.slice(0, 41).map((v, k) => <rect key={k} x={4 + k * 10.6} width="9" y={56 - v / 25} height={v / 25} fill={k === r ? RED : k >= start && k <= r ? GOLD : GREY} />)}
    </svg>
  </div>
}
