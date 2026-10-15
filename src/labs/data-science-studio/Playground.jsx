import { useMemo, useState } from 'react'
import { readCsv, toNumber } from './engine/tables.js'
import * as S from './engine/summary.js'
import { ORDERS_CSV } from './engine/data.js'

// Your own data through every tool so far: paste a CSV, see it as a table, and every column summed up.
const f = x => (x === null || x === undefined ? '–' : Number.isInteger(x) ? String(x) : x.toFixed(2))
const asNumber = v => { try { return toNumber(v) } catch { return undefined } }

function describe(rows, name) {
  const values = rows.map(r => r[name] ?? '')
  const parsed = values.map(asNumber)
  const missing = parsed.filter(v => v === null).length
  const numbers = parsed.filter(v => typeof v === 'number')
  if (numbers.length && numbers.length + missing === values.length) {
    return { name, kind: 'number', missing, n: numbers.length, mean: S.mean(numbers), median: S.median(numbers), std: numbers.length > 1 ? S.std(numbers) : null, min: Math.min(...numbers), max: Math.max(...numbers) }
  }
  const counts = new Map()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  return { name, kind: 'text', missing: values.filter(v => v.trim() === '').length, distinct: counts.size, top: [...counts].sort((a, b) => b[1] - a[1]).slice(0, 3) }
}

export default function Playground() {
  const [text, setText] = useState(() => ORDERS_CSV().split('\n').slice(0, 41).join('\n'))
  const rows = useMemo(() => { try { return readCsv(text) } catch { return [] } }, [text])
  const names = rows.length ? Object.keys(rows[0]) : []
  const columns = useMemo(() => names.map(n => describe(rows, n)), [rows])  // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="qm-playground">
    <h2 className="qm-h0">Your data</h2>
    <p className="qm-hint">Paste a CSV file (a header line, then one line per row). To start with: the first 40 of the shop’s orders. Everything below is the lab’s own functions, run on what you paste.</p>
    <textarea className="ds-playground-text" aria-label="Your CSV" rows={10} value={text} onChange={e => setText(e.target.value)} spellCheck={false} />
    <p className="qm-small"><b>{rows.length}</b> rows · <b>{names.length}</b> columns · <b>{rows.length * names.length}</b> cells</p>
    <section className="qm-fig"><h3 className="qm-small-h">Each column, summed up</h3>
      <div className="qm-scroll"><table className="qm-log"><thead><tr><th>Column</th><th>Type</th><th>Missing</th><th>Summary</th></tr></thead>
        <tbody>{columns.map(c => <tr key={c.name}><td className="mono" style={{ textAlign: 'left' }}>{c.name}</td><td>{c.kind}</td><td>{c.missing}</td>
          <td style={{ textAlign: 'left' }}>{c.kind === 'number' ? `mean ${f(c.mean)} · median ${f(c.median)} · sd ${f(c.std)} · from ${f(c.min)} to ${f(c.max)}` : `${c.distinct} different values; most common: ${c.top.map(([v, n]) => `“${v}” (${n})`).join(', ')}`}</td></tr>)}</tbody></table></div>
    </section>
    <section className="qm-fig"><h3 className="qm-small-h">The table</h3>
      <div className="qm-scroll" style={{ maxHeight: 360 }}><table className="qm-log"><thead><tr>{names.map(n => <th key={n}>{n}</th>)}</tr></thead>
        <tbody>{rows.slice(0, 100).map((r, i) => <tr key={i}>{names.map(n => <td key={n} className="mono" style={{ textAlign: 'left' }}>{r[n]}</td>)}</tr>)}</tbody></table></div>
    </section>
  </div>
}
