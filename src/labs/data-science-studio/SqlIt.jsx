import { useEffect, useState } from 'react'
import Markdown from '../qmaze-lab/Markdown.jsx'
import { freshShop, runQuery, sameRows, isOrdered, missingWords } from './engine/sqlRun.js'

// "Query it in SQL": the learner writes a query against the shop's tables in real SQLite (sql.js, in
// the page) and sees its rows. It is right when it gives the same rows as the lab's query (in the
// same order when the lab's query has an ORDER BY), and uses the words the lesson asks for.
//
// spec: { prompt, solution, must: [SQL words it has to use], starter, hint, explain,
//         answer: the rows, from the by-hand engine (only the tests read it) }

const SHOWN = 12
function Rows({ result }) {
  if (!result.columns.length) return <p className="qm-hint">No rows.</p>
  return <div className="ds-sql-rows"><table className="ds-sheet"><thead><tr>{result.columns.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
    <tbody>{result.rows.slice(0, SHOWN).map((row, r) => <tr key={r}>{row.map((v, c) => <td key={c} className={typeof v === 'number' ? 'num' : ''}>{v === null ? <i className="ds-null">NULL</i> : typeof v === 'number' && !Number.isInteger(v) ? Number(v.toFixed(6)) : String(v)}</td>)}</tr>)}</tbody></table>
    {result.rows.length > SHOWN && <p className="qm-hint">… and {result.rows.length - SHOWN} more rows ({result.rows.length} in all).</p>}</div>
}

export default function SqlIt({ spec, done, code, onCode, onDone }) {
  const [text, setText] = useState(code ?? spec.starter ?? 'SELECT * FROM orders LIMIT 5')
  const [state, setState] = useState(done ? { solved: true } : null), [busy, setBusy] = useState(false), [hint, setHint] = useState(false)
  const change = v => { setText(v); onCode?.(v) }
  const run = async (query = text) => {
    setBusy(true)
    try {
      const mine = await freshShop(), theirs = await freshShop()
      const got = runQuery(mine, query), want = runQuery(theirs, spec.solution)
      mine.close(); theirs.close()
      if (got.error) { setState({ error: got.error }); return }
      const missing = missingWords(query, spec.must)
      const solved = !want.error && sameRows(got.rows, want.rows, isOrdered(spec.solution)) && got.columns.length === want.columns.length && !missing.length
      setState({ got, want, missing, solved })
      if (solved && !done) onDone()
    } catch (e) {
      setState({ error: `SQLite could not start here: ${e.message}` })
    } finally { setBusy(false) }
  }
  useEffect(() => { if (done && code) run(code) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const solved = state?.solved
  return <div className={`ds-sql${solved ? ' passed' : ''}`}>
    <span className="qm-eyebrow">Query it in SQL{solved ? ' · ✓ right' : ''}</span>
    <div className="qm-md"><Markdown>{spec.prompt}</Markdown></div>
    <p className="qm-hint">Tables: <span className="mono">orders, catalogue, returns, days, deliveries, trial</span> (the sheets of the spreadsheet lessons). Ctrl+Enter runs the query.</p>
    <textarea className="ds-sql-box mono" aria-label="Your SQL query" value={text} spellCheck={false} rows={Math.min(10, Math.max(3, text.split('\n').length + 1))}
      onChange={e => change(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run() } }} />
    <div className="qm-buttons">
      <button className="qm-primary" disabled={busy} onClick={() => run()}>{busy ? 'Running…' : '▶ Run the query'}</button>
      {spec.hint && <button className="qm-quiet" onClick={() => setHint(true)}>Hint</button>}
      <button className="qm-quiet" onClick={() => { change(spec.solution); run(spec.solution) }}>Show me</button>
    </div>
    {hint && <div className="qm-feedback"><Markdown>{spec.hint}</Markdown></div>}
    {state?.error && <p className="qm-feedback" role="status">SQLite says: <span className="mono">{state.error}</span></p>}
    {state?.got && <div role="status">
      <Rows result={state.got} />
      {!state.solved && <p className="qm-feedback">{state.missing.length ? `Right or not, this one should use ${state.missing.join(', ')}.`
        : state.got.rows.length !== state.want.rows.length ? `${state.got.rows.length} row${state.got.rows.length === 1 ? '' : 's'}; the question’s answer has ${state.want.rows.length}.`
          : state.got.columns.length !== state.want.columns.length ? `${state.got.columns.length} columns; the answer has ${state.want.columns.length}.`
            : 'The right number of rows, but not the same values' + (isOrdered(spec.solution) ? ' in the same order.' : '.')}</p>}
    </div>}
    {solved && spec.explain && <div className="qm-answer"><div className="qm-md"><Markdown>{spec.explain}</Markdown></div></div>}
  </div>
}
