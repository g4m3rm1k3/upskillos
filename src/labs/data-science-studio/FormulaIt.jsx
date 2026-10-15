import { useState } from 'react'
import Markdown from '../qmaze-lab/Markdown.jsx'
import { evaluateFormula, plain, show, tableBook, columnLetters, TABLES } from './engine/sheet.js'
import { useOpenLab } from '../../components/desktop/useOpenLab.js'

// "In a spreadsheet": the learner types a formula over a table of the shop's data; the Spreadsheet
// Lab's own engine works it out, and its step-by-step explanation shows how.
//
// spec: { table: 'orders' | 'small', prompt, solution, must: [function names it has to use],
//         tolerance, hint, explain, sheet: which of the Spreadsheet Lab's "things to try" on the
//         shop's orders to open (datasets/index.js, id 'shop-orders') }

export const same = (a, b, tolerance = 1e-9) => {
  a = plain(a); b = plain(b)
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(b))
  return JSON.stringify(a) === JSON.stringify(b)
}
export const expectedOf = spec => evaluateFormula(spec.table, spec.solution).value

// Opens the Spreadsheet Lab beside the lesson, on the shop's orders, with one of its "things to try" done.
function OpenSheet({ n }) {
  const openLab = useOpenLab()
  return <button type="button" className="qm-quiet" onClick={() => openLab('spreadsheet-lab', `?dataset=shop-orders&try=${n}`)}>📊 Open in the Spreadsheet Lab</button>
}

function Preview({ table, rows = 6 }) {
  const data = TABLES[table]()
  const letters = columnLetters(data[0].length)
  return <div className="qm-scroll ds-sheet-wrap"><table className="ds-sheet">
    <thead><tr><th />{letters.map(l => <th key={l}>{l}</th>)}</tr></thead>
    <tbody>{data.slice(0, rows).map((row, r) => <tr key={r}><th>{r + 1}</th>{row.map((v, c) => <td key={c} className={r === 0 ? 'head' : /^-?\d+(\.\d+)?$/.test(v) ? 'num' : ''}>{v}</td>)}</tr>)}
      <tr><th>⋮</th><td colSpan={letters.length} className="ds-sheet-more">… {data.length - rows} more rows, to row {data.length}</td></tr></tbody>
  </table></div>
}

export default function FormulaIt({ spec, done, onDone }) {
  const [text, setText] = useState('=')
  const [result, setResult] = useState(done ? { solved: true, ...evaluateFormula(spec.table, spec.solution) } : null)
  const [hint, setHint] = useState(false)
  const check = e => {
    e.preventDefault()
    const r = evaluateFormula(spec.table, text)
    const missing = (spec.must ?? []).filter(fn => !text.toUpperCase().includes(fn.toUpperCase() + '('))
    const solved = !r.error && !missing.length && same(r.value, expectedOf(spec), spec.tolerance)
    setResult({ ...r, solved, missing })
    if (solved) onDone()
  }
  tableBook(spec.table)
  return <div className={`ds-formula${result?.solved ? ' passed' : ''}`}>
    <span className="qm-eyebrow">In a spreadsheet{result?.solved ? ' · ✓ right' : ''}</span>
    <div className="qm-md"><Markdown>{spec.prompt}</Markdown></div>
    <Preview table={spec.table} />
    <form onSubmit={check} className="ds-formula-form">
      <span className="mono ds-fx">fx</span>
      <input aria-label="Your formula" className="mono" value={text} onChange={e => setText(e.target.value)} spellCheck={false} autoComplete="off" />
      <button className="qm-primary">Work it out</button>
      {spec.hint && <button type="button" className="qm-quiet" onClick={() => setHint(true)}>Hint</button>}
      <button type="button" className="qm-quiet" onClick={() => { setText(spec.solution); setResult(null) }}>Show me</button>
      {spec.sheet !== undefined && <OpenSheet n={spec.sheet} />}
    </form>
    {hint && <div className="qm-feedback"><Markdown>{spec.hint}</Markdown></div>}
    {result?.error && <p className="qm-feedback" role="status">{result.error}</p>}
    {result && !result.error && <div className="qm-answer" role="status">
      <p><strong>{result.solved ? 'Right: ' : 'It gives '}<span className="mono">{show(result.value)}</span></strong>
        {!result.solved && (result.missing?.length ? ` · This one should use ${result.missing.map(m => `${m}()`).join(', ')}.` : ' · Not the value asked for yet: read the steps below.')}</p>
      <ol className="ds-formula-steps">{result.steps.map((s, i) => <li key={i}><code>{i < result.steps.length - 1 ? '=' : ''}{s.text}</code><span className="qm-hint"> {s.note}</span></li>)}</ol>
      {result.solved && spec.explain && <div className="qm-md"><Markdown>{spec.explain}</Markdown></div>}
    </div>}
  </div>
}
