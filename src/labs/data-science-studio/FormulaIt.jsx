import { Suspense, lazy, useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import Markdown from '../qmaze-lab/Markdown.jsx'
import { answerCell, checkAnswer, lessonBook, show } from './engine/sheet.js'
import { useOpenLab } from '../../components/desktop/useOpenLab.js'

// "In a spreadsheet": the real Spreadsheet Lab, inside the lesson, with the shop's data in it (its
// rows folded to the first few: the button on row 1 opens them). The learner writes the formula
// in the answer cell; the lab's own formula bar suggests functions, and its side panel works the
// formula out step by step. This block only checks the answer.
//
// spec: { table: 'orders' | 'small', prompt, solution, must: [function names it has to use],
//         tolerance, hint, explain }
// exercise: the block's id. The Spreadsheet Lab lists every exercise (lessons/exercises.js), and
// this block's button opens it there, with the learner's own formula if they wrote one.

const Spreadsheet = lazy(() => import('../spreadsheet-lab/SpreadsheetLab.jsx').then(m => ({ default: m.Spreadsheet })))

// Opens the full Spreadsheet Lab beside the lesson, on the shop's orders, with this exercise in it.
function OpenSheet({ exercise, formula }) {
  const openLab = useOpenLab()
  const query = `?dataset=shop-orders&exercise=${encodeURIComponent(exercise)}${formula ? `&formula=${encodeURIComponent(formula)}` : ''}`
  return <button type="button" className="qm-quiet" onClick={() => openLab('spreadsheet-lab', query)}>📊 Open in the Spreadsheet Lab</button>
}

export default function FormulaIt({ spec, exercise, done, onDone }) {
  const [book] = useState(() => lessonBook(spec, done))
  const { wb, sheet, at } = book
  const subscribe = useCallback(cb => wb.subscribe(cb), [wb])
  const version = useSyncExternalStore(subscribe, () => wb.version)
  const result = checkAnswer(spec, book)
  const [hint, setHint] = useState(false)
  useEffect(() => { if (result?.solved && !done) onDone() }, [result?.solved]) // eslint-disable-line react-hooks/exhaustive-deps
  const place = answerCell(at)
  return <div className={`ds-formula${result?.solved ? ' passed' : ''}`} data-version={version}>
    <span className="qm-eyebrow">In a spreadsheet{result?.solved ? ' · ✓ right' : ''}</span>
    <div className="qm-md"><Markdown>{spec.prompt}</Markdown></div>
    <p className="qm-hint">Type your formula in <b className="mono">{place}</b> and press Enter. The panel on the right works it out step by step; the button on row 1 folds and opens the data.</p>
    <div className="ds-sheet-embed">
      <Suspense fallback={<p className="qm-hint">Loading the spreadsheet…</p>}>
        <Spreadsheet book={wb} lesson start={at} />
      </Suspense>
    </div>
    <div className="ds-formula-form">
      {spec.hint && <button type="button" className="qm-quiet" onClick={() => setHint(true)}>Hint</button>}
      <button type="button" className="qm-quiet" onClick={() => wb.setCells([{ sheetId: sheet.id, row: at.row, col: at.col, input: spec.solution }])}>Show me</button>
      {exercise && <OpenSheet exercise={exercise} formula={wb.getCell(sheet.id, at.row, at.col)?.input} />}
    </div>
    {hint && <div className="qm-feedback"><Markdown>{spec.hint}</Markdown></div>}
    {result?.error && <p className="qm-feedback" role="status">{result.error}</p>}
    {result && !result.error && <div className="qm-answer" role="status">
      <p><strong>{result.solved ? 'Right: ' : `${place} gives `}<span className="mono">{show(result.value)}</span></strong>
        {!result.solved && (result.missing?.length ? ` · This one should use ${result.missing.map(m => `${m}()`).join(', ')}.` : ' · Not the value asked for yet: read the steps in the panel.')}</p>
      {result.solved && spec.explain && <div className="qm-md"><Markdown>{spec.explain}</Markdown></div>}
    </div>}
  </div>
}
