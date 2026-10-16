import { useMemo, useState } from 'react'
import * as T from '../engine/tables.js'
import * as S from '../engine/summary.js'
import * as C from '../engine/cleaning.js'
import { ORDERS_CSV, CATALOGUE_CSV, RETURNS_CSV } from '../engine/data.js'

const ROWS = () => T.readCsv(ORDERS_CSV())
const CATALOGUE = () => T.readCsv(CATALOGUE_CSV())
const RETURNS = () => T.readCsv(RETURNS_CSV())
const LIST = () => Object.fromEntries(CATALOGUE().map(r => [r.item, T.toPence(r.list_price)]))
const f = (x, d = 2) => (x === null || x === undefined || Number.isNaN(x) ? '–' : Number.isInteger(x) ? String(x) : x.toFixed(d))
const n = x => x.toLocaleString('en-GB')
const Slider = ({ label, value, min, max, step = 1, onChange, format = v => v }) =>
  <label className="qm-slider">{label} <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /> <b className="mono">{format(value)}</b></label>
const Toggle = ({ options, value, onChange }) => <div className="qm-fig-controls">{options.map(([id, label]) => <button key={id} className={value === id ? 'active' : ''} onClick={() => onChange(id)}>{label}</button>)}</div>
const TextInput = ({ label, value, onChange }) => <label className="ds-input"><span>{label}</span><input value={value} onChange={e => onChange(e.target.value)} spellCheck={false} /></label>
const shown = text => JSON.stringify(text).replaceAll(' ', '␣')

// 3.1: each fix switched on or off, and the spellings of the towns it leaves.
const FIXES = [['spaces', 'Spaces: split and join'], ['nfc', 'Unicode: NFC'], ['lower', 'Capitals: lower case']]
function applyFixes(text, on) {
  let t = text
  if (on.nfc) t = t.normalize('NFC')
  if (on.spaces) t = t.split(/\s+/).filter(Boolean).join(' ')
  if (on.lower) t = t.toLowerCase()
  return t
}
export function TextCleaner() {
  const towns = useMemo(() => T.column(ROWS(), 'town'), [])
  const [on, setOn] = useState({ spaces: true, nfc: true, lower: false })
  const [text, setText] = useState('  New   YORK ')
  const counts = T.countValues(towns.map(t => applyFixes(t, on)))
  const steps = [['typed', text], ...FIXES.filter(([id]) => on[id]).map(([id], k, list) => [id, applyFixes(text, Object.fromEntries(list.slice(0, k + 1).map(([x]) => [x, true])))])]
  return <div className="qm-fig">
    <div className="qm-fig-controls">{FIXES.map(([id, label]) => <label key={id} className="ds-select"><input type="checkbox" checked={on[id]} onChange={e => setOn(o => ({ ...o, [id]: e.target.checked }))} /> {label}</label>)}</div>
    <p className="qm-small"><b>{Object.keys(counts).length}</b> different spellings of the town (the shop has 4 towns).</p>
    <div className="qm-scroll"><table className="qm-log"><thead><tr><th>Town as it now reads</th><th>Orders</th></tr></thead>
      <tbody>{Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t, c]) => <tr key={t}><td className="mono">{shown(t)}</td><td>{c}</td></tr>)}</tbody></table></div>
    <TextInput label="Your own text: what each fix does to it (␣ is a space)" value={text} onChange={setText} />
    <ol className="qm-small">{steps.map(([id, t]) => <li key={id}><span className="qm-dim">{id}:</span> <span className="mono">{shown(t)}</span> · {[...t].length} characters</li>)}</ol>
  </div>
}

// 3.2: every row against every rule, and each price against its list price on a log scale.
export function RuleChecker() {
  const rows = useMemo(ROWS, []), list = useMemo(LIST, [])
  const [on, setOn] = useState(Object.fromEntries(C.RULES.map(([name]) => [name, true])))
  const rules = C.RULES.filter(([name]) => on[name])
  const problems = C.checkRows(rows, rules)
  const priced = rows.filter(r => r.price.trim() !== '').map(r => ({ id: r.order_id, item: r.item, ratio: T.toPence(r.price) / list[r.item] }))
  const W = 440, H = 120, P = 24, lo = -0.5, hi = 2.5, x = v => P + (W - 2 * P) * (v - lo) / (hi - lo)
  return <div className="qm-fig">
    <div className="qm-fig-controls">{C.RULES.map(([name]) => <label key={name} className="ds-select"><input type="checkbox" checked={on[name]} onChange={e => setOn(o => ({ ...o, [name]: e.target.checked }))} /> {name}</label>)}</div>
    <p className="qm-small"><b>{problems.length}</b> problems in {rows.length} rows: {Object.entries(T.countValues(problems.map(p => p[1]))).map(([rule, c]) => `${c} × ${rule}`).join(', ') || 'none'}.</p>
    <div className="qm-scroll" style={{ maxHeight: 160 }}><table className="qm-log"><thead><tr><th>order_id</th><th>rule broken</th><th>town</th><th>price</th></tr></thead>
      <tbody>{problems.slice(0, 40).map(([id, rule], k) => { const r = rows.find(x => x.order_id === id); return <tr key={k}><td className="mono">{id}</td><td>{rule}</td><td className="mono">{shown(r.town)}</td><td className="mono">{shown(r.price)}</td></tr> })}</tbody></table></div>
    <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Each price over its list price, on a log scale">
      <line className="qm-axis" x1={P} y1={70} x2={W - P} y2={70} />
      {[0, 1, 2].map(t => <g key={t}><line x1={x(t)} y1={64} x2={x(t)} y2={76} stroke="currentColor" /><text className="qm-tick" x={x(t) - 10} y={92}>×{10 ** t}</text></g>)}
      <line x1={x(1)} y1={20} x2={x(1)} y2={80} stroke="#b0413e" strokeDasharray="4 3" /><text className="qm-tick" x={x(1) + 4} y={28} fill="#b0413e">the line: ×10</text>
      {priced.map((p, k) => <circle key={k} cx={x(Math.log10(p.ratio))} cy={60 - (k % 7) * 5} r="3" fill={p.ratio > 10 ? '#b0413e' : '#3f5bb5'} opacity=".7"><title>{`${p.id} ${p.item}: ×${p.ratio.toFixed(3)}`}</title></circle>)}
      <text className="qm-tick" x={P} y={H - 6}>log₁₀(price ÷ list price): real prices sit at 0, prices typed in pence near 2</text>
    </svg>
  </div>
}

// 3.3: one pass with a set against comparing every pair.
export function DuplicateFinder() {
  const rows = useMemo(ROWS, [])
  const [size, setSize] = useState(402)
  const [kept, repeated] = C.dedupe(rows, 'order_id')
  const pairs = size * (size - 1) / 2
  const W = 420, H = 160, P = 34, maxN = 2000, x = m => P + (W - P - 10) * m / maxN, y = v => H - P - (H - P - 10) * Math.min(1, v / (maxN * (maxN - 1) / 2))
  const curve = fn => Array.from({ length: 41 }, (_, k) => { const m = k * 50; return `${x(m)},${y(fn(m))}` }).join(' ')
  return <div className="qm-fig">
    <p className="qm-small">The shop’s {rows.length} rows: <b>{kept.length}</b> kept, repeated keys <b className="mono">{repeated.join(', ')}</b>.</p>
    <Slider label="Rows in the table" value={size} min={2} max={maxN} step={2} onChange={setSize} />
    <table className="qm-kv"><tbody>
      <tr><td>Set: one look-up per row</td><td><b>{n(size)}</b> steps</td></tr>
      <tr><td>Every pair compared</td><td><b>{n(pairs)}</b> comparisons</td><td className="qm-dim">n(n − 1)/2, {f(pairs / size, 1)} per row</td></tr>
    </tbody></table>
    <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Work against the number of rows">
      <line className="qm-axis" x1={P} y1={H - P} x2={W - 5} y2={H - P} /><line className="qm-axis" x1={P} y1={10} x2={P} y2={H - P} />
      <polyline fill="none" stroke="#b0413e" strokeWidth="2" points={curve(m => m * (m - 1) / 2)} />
      <polyline fill="none" stroke="#1f6f68" strokeWidth="2" points={curve(m => m)} />
      <circle cx={x(size)} cy={y(pairs)} r="4" fill="#b0413e" />
      <text className="qm-tick" x={W / 2 - 30} y={H - 8}>rows, up to {n(maxN)}</text>
    </svg>
    <p className="qm-hint">Red: every pair, which grows with the square of the rows. Green: the set, one step per row; on this scale it hugs the axis.</p>
  </div>
}

// 3.4: the edit-distance table, filled one cell at a time, and the path of edits read back from it.
export function EditTable() {
  const [a, setA] = useState('Lck'), [b, setB] = useState('Lock')
  const A = a.slice(0, 14), B = b.slice(0, 14)
  const t = C.editTable(A, B)
  const cells = t.a.length * t.b.length
  const [step, setStep] = useState(1000)
  const filled = Math.min(step, cells)
  const now = filled > 0 && filled <= cells && filled < cells ? { i: Math.floor((filled - 1) / Math.max(1, t.b.length)) + 1, j: ((filled - 1) % Math.max(1, t.b.length)) + 1 } : null
  const done = filled >= cells
  const path = done ? C.editPath(t) : []
  const onPath = new Set(path.map(p => `${p.i},${p.j}`))
  const isFilled = (i, j) => i === 0 || j === 0 || (i - 1) * t.b.length + j <= filled
  return <div className="qm-fig">
    <div className="qm-fig-controls"><TextInput label="a (rows)" value={a} onChange={setA} /><TextInput label="b (columns)" value={b} onChange={setB} /></div>
    <Slider label="Cells filled" value={filled} min={0} max={cells} onChange={setStep} format={v => `${v} of ${cells}`} />
    <div className="qm-scroll"><table className="qm-log ds-edit">
      <thead><tr><th></th><th>“”</th>{t.b.map((ch, j) => <th key={j} className="mono">{ch === ' ' ? '␣' : ch}</th>)}</tr></thead>
      <tbody>{t.table.map((row, i) => <tr key={i}><th className="mono">{i === 0 ? '“”' : t.a[i - 1] === ' ' ? '␣' : t.a[i - 1]}</th>{row.map((v, j) => {
        const isNow = now && now.i === i && now.j === j
        const source = now && ((i === now.i - 1 && j === now.j) || (i === now.i && j === now.j - 1) || (i === now.i - 1 && j === now.j - 1))
        return <td key={j} className={`mono${isNow ? ' now' : ''}${source ? ' source' : ''}${onPath.has(`${i},${j}`) ? ' path' : ''}`}>{isFilled(i, j) ? v : ''}</td>
      })}</tr>)}</tbody>
    </table></div>
    {now && <p className="qm-small">Cell D({now.i}, {now.j}): min(above {t.table[now.i - 1][now.j]} + 1, left {t.table[now.i][now.j - 1]} + 1, diagonal {t.table[now.i - 1][now.j - 1]} + {t.a[now.i - 1] === t.b[now.j - 1] ? '0 (same letter)' : '1 (different letters)'}) = <b>{t.table[now.i][now.j]}</b>, by {t.from[now.i][now.j]}.</p>}
    {done && <p className="qm-small">Distance <b>{t.table.at(-1).at(-1)}</b>. The edits, read back from the corner: {path.filter(p => p.how !== 'keep').map((p, k) => <span key={k} className="mono">{k ? ', ' : ''}{p.how === 'substitute' ? `${p.a} → ${p.b}` : p.how === 'delete' ? `delete ${p.a}` : `insert ${p.b}`}</span>)}{path.every(p => p.how === 'keep') ? 'none: the words are the same' : ''}.</p>}
    <p className="qm-hint">Marked: the cell being filled and the three it comes from; when the table is full, the path of one cheapest set of edits. Only the first 14 letters of each word are used.</p>
  </div>
}

// 3.5: the returns form matched to the catalogue, with a threshold to move.
export function FuzzyMatcher() {
  const items = useMemo(() => CATALOGUE().map(r => r.item), [])
  const returns = useMemo(RETURNS, [])
  const [most, setMost] = useState(0.34)
  const [own, setOwn] = useState('Look, Pmup, helmit, Bk')
  const words = [...returns.map(r => r.item), ...own.split(',').map(w => w.trim()).filter(Boolean).slice(0, 8)]
  // The nearest item with no threshold, then whether it is near enough for its length.
  const rows = words.map((w, k) => {
    const [nearest, d] = C.closest(w, items, Infinity)
    const allowed = nearest === null ? null : most * Math.max([...C.normalise(w)].length, [...C.normalise(nearest)].length)
    return { w, own: k >= returns.length, nearest, d, allowed, m: C.closest(w, items, most) }
  })
  const unmatched = rows.filter(r => !r.own && r.m[0] === null).length
  return <div className="qm-fig">
    <Slider label="Threshold (share of the longer word)" value={most} min={0} max={1} step={0.02} onChange={setMost} format={v => v.toFixed(2)} />
    <p className="qm-small">Of the {returns.length} returns, <b>{returns.length - unmatched}</b> matched, <b>{unmatched}</b> left for a person to read.</p>
    <TextInput label="Your own words, separated by commas" value={own} onChange={setOwn} />
    <div className="qm-scroll" style={{ maxHeight: 220 }}><table className="qm-log"><thead><tr><th>Typed</th><th>Nearest item</th><th>Edits</th><th>Allowed</th></tr></thead>
      <tbody>{rows.map((r, k) => <tr key={k} className={r.m[0] === null ? 'fail' : ''}><td className="mono">{r.own ? <b>{r.w}</b> : r.w}</td><td>{r.m[0] ?? <span className="qm-dim">no match{r.nearest ? ` (nearest: ${r.nearest})` : ''}</span>}</td><td>{r.d ?? '–'}</td><td className="qm-dim">{r.allowed === null ? '–' : f(r.allowed, 2)}</td></tr>)}</tbody></table></div>
    <p className="qm-hint">Set the threshold to 0: only exact matches (after normalising) remain. Raise it to 1: everything matches something, even nonsense. Your words are in bold.</p>
  </div>
}

// 3.6: three ways of losing values, three ways of handling the gaps, scored against the truth.
export function MissingnessLab() {
  const [mechanism, setMechanism] = useState('mar')
  const [share, setShare] = useState(0.2)
  const r = useMemo(() => C.missingnessExperiment(mechanism, share, 200), [mechanism, share])
  const methods = [['drop', 'Leave the gaps out'], ['fill', 'Fill with the mean'], ['group', 'Fill with the item’s mean']]
  const W = 420, H = 130, P = 120, max = Math.max(1, ...methods.map(([k]) => Math.abs(r[k].error))), x = v => P + (W - P - 20) / 2 * (1 + v / max)
  return <div className="qm-fig">
    <Toggle value={mechanism} onChange={setMechanism} options={Object.entries(C.MECHANISMS).map(([id, m]) => [id, m.label])} />
    <Slider label="Share hidden" value={share} min={0.05} max={0.5} step={0.05} onChange={setShare} format={v => `${Math.round(v * 100)}%`} />
    <p className="qm-small">True mean price £{f(r.truth.mean)} over the 400 orders · {f(r.missing, 0)} prices hidden on average · 200 repeats.</p>
    <table className="qm-log"><thead><tr><th>Method</th><th>Mean: error on average</th><th>Variance kept</th></tr></thead>
      <tbody>{methods.map(([k, label]) => <tr key={k}><td>{label}</td><td className="mono">{r[k].error >= 0 ? '+' : '−'}£{f(Math.abs(r[k].error))}</td><td className="mono">{Math.round(r[k].varianceShare * 100)}%</td></tr>)}</tbody></table>
    <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Each method's error in the mean">
      <line x1={x(0)} y1={10} x2={x(0)} y2={H - 20} stroke="currentColor" />
      {methods.map(([k, label], i) => <g key={k}><text className="qm-tick" x={4} y={32 + i * 32}>{label}</text><rect x={Math.min(x(0), x(r[k].error))} y={20 + i * 32} width={Math.abs(x(r[k].error) - x(0))} height="16" fill={Math.abs(r[k].error) < 0.5 ? '#1f6f68' : '#b0413e'} /></g>)}
      <text className="qm-tick" x={x(0) - 30} y={H - 4}>0 = the truth</text>
    </svg>
    <p className="qm-hint">{mechanism === 'mcar' ? 'MCAR: the remaining prices are a fair sample, so leaving them out gives the right mean. Filling with the mean keeps the mean but shrinks the variance.' : mechanism === 'mar' ? 'MAR: bikes go missing more, so the mean is too low, and filling with it changes nothing. The item explains the gaps, so filling within each item recovers the truth.' : 'MNAR: prices above list go missing. Within each item the remaining prices are the cheaper ones, and nothing in the data shows it: every method stays too low.'}</p>
  </div>
}

// 3.7: the three joins, counted, as the tables grow.
export function JoinRace() {
  const orders = useMemo(() => C.dedupe(ROWS(), 'order_id')[0], []), catalogue = useMemo(CATALOGUE, [])
  const [left, setLeft] = useState(400), [right, setRight] = useState(7)
  // A right table of `right` rows: the catalogue, then made-up items no order names.
  const rightRows = Array.from({ length: right }, (_, k) => catalogue[k] ?? { item: `Item ${k}`, category: 'other' })
  const leftRows = Array.from({ length: left }, (_, k) => orders[k % orders.length])
  const c = C.joinCosts(leftRows, rightRows, 'item')
  const out = C.joinSize(leftRows, rightRows, 'item')
  const bars = [['Nested loops', c.nested, '#b0413e', 'n × m'], ['Hash join', c.hash, '#1f6f68', 'n + m'], ['Sort-merge join', c.sortMerge, '#7a3fb0', `sort ${n(c.sortLeft)} + ${n(c.sortRight)}, walk ${n(c.walk)}`]]
  const max = Math.max(...bars.map(b => b[1]))
  return <div className="qm-fig">
    <Slider label="Orders (n)" value={left} min={10} max={4000} step={10} onChange={setLeft} />
    <Slider label="Catalogue rows (m)" value={right} min={1} max={200} onChange={setRight} />
    <p className="qm-small">Every join gives the same <b>{n(out)}</b> rows. The work:</p>
    <table className="qm-log"><tbody>{bars.map(([label, v, color, how]) => <tr key={label}><td>{label}</td><td style={{ width: '50%' }}><span style={{ display: 'inline-block', height: 12, width: `${Math.max(1, 100 * v / max)}%`, background: color }} /></td><td className="mono">{n(v)}</td><td className="qm-dim">{how}</td></tr>)}</tbody></table>
    <p className="qm-hint">Past the shop’s 400 orders, the table repeats them. The extra catalogue rows are items nobody ordered: they cost the nested loop a comparison per order each, the hash join one step each.</p>
  </div>
}

// 3.8: pick two tables and see what the join does to the rows.
const PAIRS = {
  'orders-catalogue': { label: 'orders ⋈ catalogue on item', left: 'orders', right: 'catalogue', key: 'item' },
  'returns-orders': { label: 'returns ⋈ orders on order_id', left: 'returns', right: 'orders', key: 'order_id' },
  'orders-returns': { label: 'orders ⟕ returns on order_id (left join)', left: 'orders', right: 'returns', key: 'order_id', how: 'left' },
}
export function Cardinality() {
  const tables = useMemo(() => {
    const orders = C.dedupe(ROWS(), 'order_id')[0], returns = RETURNS()
    return { orders, catalogue: CATALOGUE(), returns, returnsClean: returns.map(r => ({ ...r, order_id: C.normalise(r.order_id).toUpperCase() })) }
  }, [])
  const [pair, setPair] = useState('returns-orders'), [cleanKeys, setCleanKeys] = useState(true)
  const p = PAIRS[pair]
  const pick = name => (name === 'returns' && cleanKeys ? tables.returnsClean : tables[name])
  const left = pick(p.left), right = pick(p.right)
  const rows = p.how === 'left' ? C.leftJoin(left, right, p.key) : C.hashJoin(left, right, p.key)
  const lost = C.antiJoin(left, right, p.key)
  const counts = T.countValues(rows.map(r => r[p.key]))
  const repeated = Object.entries(counts).filter(([, c]) => c > 1)
  return <div className="qm-fig">
    <Toggle value={pair} onChange={setPair} options={Object.entries(PAIRS).map(([id, x]) => [id, x.label])} />
    <label className="ds-select"><input type="checkbox" checked={cleanKeys} onChange={e => setCleanKeys(e.target.checked)} /> clean the order ids on the returns form first</label>
    <table className="qm-kv"><tbody>
      <tr><td>Rows in</td><td><b>{left.length}</b> {p.left} · <b>{right.length}</b> {p.right}</td></tr>
      <tr><td>Rows out</td><td><b>{rows.length}</b> <span className="qm-dim">(join_size says {p.how === 'left' ? `${C.joinSize(left, right, p.key)} matched + ${lost.length} kept without a partner` : C.joinSize(left, right, p.key)})</span></td></tr>
      <tr><td>Left rows with no partner</td><td><b>{lost.length}</b> {lost.length ? <span className="mono">{lost.slice(0, 6).map(r => shown(r[p.key])).join(', ')}{lost.length > 6 ? ', …' : ''}</span> : ''} {p.how === 'left' ? '(kept, with None)' : '(dropped)'}</td></tr>
      <tr><td>Keys appearing more than once</td><td><b>{repeated.length}</b> {repeated.slice(0, 6).map(([k, c]) => `${k} × ${c}`).join(', ')}</td></tr>
    </tbody></table>
    <p className="qm-hint">{pair === 'orders-catalogue' ? 'Many-to-one: every order finds exactly one item, so rows out = orders in. The pump finds no order; it is on the right, so it simply isn’t in the result.' : pair === 'returns-orders' ? 'Each return finds its order, if its key is right: switch the cleaning off and the lower-case and spaced ids are lost too.' : 'A left join keeps every order. The ones returned twice appear twice: sum the takings here and they count double.'}</p>
  </div>
}

// 3.9: the same counts, wide and long.
export function WideLong() {
  const rows = useMemo(() => C.cleanOrders(ROWS(), LIST()), [])
  const [shape, setShape] = useState('wide')
  const months = ['2025-01', '2025-02', '2025-03']
  const wide = C.TOWNS.map(town => ({ town, ...Object.fromEntries(months.map(m => [m, rows.filter(r => r.town === town && r.date.startsWith(m)).length])) }))
  const long = C.toLong(wide, 'town', 'month', 'orders')
  return <div className="qm-fig">
    <Toggle value={shape} onChange={setShape} options={[['wide', `Wide: ${wide.length} rows × ${months.length} value columns`], ['long', `Long: ${long.length} rows`]]} />
    <div className="qm-scroll"><table className="qm-log">
      {shape === 'wide'
        ? <><thead><tr><th>town</th>{months.map(m => <th key={m}>{m}</th>)}</tr></thead><tbody>{wide.map(r => <tr key={r.town}><td>{r.town}</td>{months.map(m => <td key={m}>{r[m]}</td>)}</tr>)}</tbody></>
        : <><thead><tr><th>town</th><th>month</th><th>orders</th></tr></thead><tbody>{long.map((r, k) => <tr key={k}><td>{r.town}</td><td>{r.month}</td><td>{r.orders}</td></tr>)}</tbody></>}
    </table></div>
    <p className="qm-hint">Wide is easy to read across; long is what group-by, filters and charts want: “the month” is a column again, so <span className="mono">rows where month is 2025-02</span> is one filter.</p>
  </div>
}

// 3.10: every count the flaws touched, raw and clean.
export function CleanReport() {
  const r = useMemo(() => {
    const raw = ROWS(), clean = C.cleanOrders(raw, LIST())
    const rawPriced = T.priced(raw), cleanPriced = clean.filter(x => x.price !== null).map(x => ({ ...x, price: x.price / 100 }))
    const lights = rows => rows.filter(x => x.item === 'Lights, front and back').map(x => x.price)
    const takings = rows => rows.reduce((s, x) => s + x.price * x.quantity, 0)
    return [
      ['Rows', raw.length, clean.length, '1.1, 3.3'],
      ['Different towns', new Set(raw.map(x => x.town)).size, new Set(clean.map(x => x.town)).size, '1.1, 3.1'],
      ['Leeds web orders (exact match)', raw.filter(x => x.town === 'Leeds' && x.channel === 'web').length, clean.filter(x => x.town === 'Leeds' && x.channel === 'web').length, '1.5, 3.1'],
      ['Mean price of lights', S.mean(lights(rawPriced)), S.mean(lights(cleanPriced)), '2.2, 3.2'],
      ['Median price of lights', S.median(lights(rawPriced)), S.median(lights(cleanPriced)), '2.2'],
      ['Lights the IQR rule flags', S.iqrOutliers(lights(rawPriced)).length, S.iqrOutliers(lights(cleanPriced)).length, '2.6'],
      ['Mean price, all orders', S.mean(rawPriced.map(x => x.price)), S.mean(cleanPriced.map(x => x.price)), '2.1'],
      ['Takings, £', takings(rawPriced), takings(cleanPriced), '3.7'],
      ['Missing prices', raw.filter(x => x.price.trim() === '').length, clean.filter(x => x.price === null).length, '1.4, 3.6'],
    ]
  }, [])
  return <div className="qm-fig">
    <table className="qm-log"><thead><tr><th></th><th>Raw</th><th>Clean</th><th>Lessons</th></tr></thead>
      <tbody>{r.map(([label, a, b, where]) => <tr key={label} className={a !== b ? 'pass' : ''}><td>{label}</td><td className="mono">{typeof a === 'number' && !Number.isInteger(a) ? n(Number(a.toFixed(2))) : a}</td><td className="mono">{typeof b === 'number' && !Number.isInteger(b) ? n(Number(b.toFixed(2))) : b}</td><td className="qm-dim">{where}</td></tr>)}</tbody></table>
    <p className="qm-hint">Marked: what cleaning changed. The missing prices stay missing: the 18 blanks are not filled (lesson 3.6), and are left out of the means and the takings on both sides.</p>
  </div>
}
