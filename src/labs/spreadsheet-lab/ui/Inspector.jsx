// The side panel that explains the selected cell: what was typed, what is
// stored, how it is shown, what an error means, and the functions it uses.
// It also lets learners browse every function.
import { useMemo, useState } from 'react'
import { cellKey, formatRange, indexToCol } from '../engine/address.js'
import { ERRORS, CellError, isMatrix, literal, typeName } from '../engine/values.js'
import { walk } from '../engine/parser.js'
import { CATEGORIES, FUNCTIONS } from '../engine/functions/index.js'
import { PRESET_FORMATS } from '../engine/format.js'
import { displayCell } from './display.js'
import CodePanel from './CodePanel.jsx'
import FormulaLearn from './FormulaLearn.jsx'
import ChartPanel from './ChartPanel.jsx'
import RulesPanel from './RulesPanel.jsx'
import PivotPanel from './PivotPanel.jsx'
import DatasetPanel from './DatasetPanel.jsx'
import LessonLinks from './LessonLinks.jsx'

const TYPE_TEXT = {
  blank: 'Empty',
  number: 'Number',
  text: 'Text',
  logical: 'Logical (TRUE or FALSE)',
  error: 'Error',
  array: 'Array (several values)',
}

function Section({ title, children }) {
  return (
    <section className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
      <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</h3>
      {children}
    </section>
  )
}

function FunctionHelp({ name, open = false }) {
  const f = FUNCTIONS[name]
  if (!f) return null
  return (
    <details open={open} className="group rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/60">
      <summary className="cursor-pointer list-none">
        <span className="font-mono text-[12px] font-semibold text-slate-900 dark:text-slate-100">{f.syntax}</span>
        <span className="mt-0.5 block text-xs text-slate-600 dark:text-slate-300">{f.summary}</span>
      </summary>
      <div className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
        {f.aliasOf && <p>An older name for <b>{f.aliasOf}</b>, which works the same. Prefer {f.aliasOf} in new sheets.</p>}
        {f.example && <p><span className="font-mono text-slate-800 dark:text-slate-100">{f.example[0]}</span> → {f.example[1]}</p>}
        {f.learn && <p>{f.learn}</p>}
        <LessonLinks name={name} />
        <p className="text-[11px] text-slate-400">Category: {f.category}</p>
      </div>
    </details>
  )
}

function CellView({ wb, sheet, row, col, onJump, onMakeCode, lesson }) {
  const key = cellKey(row, col)
  const cell = sheet.cells.get(key)
  const value = wb.valueAt(sheet, row, col)
  const owner = sheet.spillOwner.get(key)
  const spilledFrom = owner && owner !== key ? owner : null
  const shown = displayCell(value, cell?.format)
  const type = typeName(value)
  const format = cell?.format && cell.format !== 'General' ? (PRESET_FORMATS.find((p) => p.code === cell.format) ?? { label: cell.format, learn: '' }) : null

  const functionsUsed = useMemo(() => {
    const names = new Set()
    if (cell?.tree) walk(cell.tree, (n) => { if (n.type === 'call' && FUNCTIONS[n.name]) names.add(n.name) })
    return [...names]
  }, [cell?.tree])

  const uses = (wb.precedents.get(sheet.id + '!' + key) ?? []).map((r) => {
    const other = r.sheetId !== sheet.id ? wb.sheet(r.sheetId)?.name + '!' : ''
    return other + formatRange({ ...r, r2: Math.min(r.r2, 1048575), c2: Math.min(r.c2, 16383) })
  })
  const usedBy = [...wb.readersOf([{ sheet, row, col }])].map((g) => {
    const [sid, k] = g.split('!')
    return sid === sheet.id ? k : wb.sheet(sid)?.name + '!' + k
  })

  const error = value instanceof CellError ? value : null

  return (
    <>
      <Section title={'Cell ' + indexToCol(col) + (row + 1)}>
        <dl className="grid grid-cols-[6.5rem_1fr] gap-x-2 gap-y-1 text-xs">
          <dt className="text-slate-500">You typed</dt>
          <dd className="break-all font-mono text-slate-900 dark:text-slate-100">{cell?.code ? '(' + (cell.code.lang === 'py' ? 'Python' : cell.code.lang === 'js' ? 'JavaScript' : 'MATLAB') + ' code: see the Code tab)' : cell?.input ? cell.input : spilledFrom ? '(nothing: spilled here)' : '(nothing)'}</dd>
          <dt className="text-slate-500">It holds</dt>
          <dd className="text-slate-900 dark:text-slate-100">{TYPE_TEXT[type] ?? type}{type !== 'blank' && type !== 'error' && <span className="ml-1 font-mono text-slate-500">{literal(value)}</span>}</dd>
          {format && (<><dt className="text-slate-500">Shown as</dt><dd className="text-slate-900 dark:text-slate-100">{shown.text} <span className="text-slate-500">({format.label})</span></dd></>)}
        </dl>
        {format && format.learn && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{format.learn} The format changes only how the value looks; formulas use the stored value.</p>}
        {spilledFrom && (
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
            This value was <b>spilled</b> by the formula in <button type="button" className="font-mono text-sky-700 underline dark:text-sky-300" onClick={() => onJump(spilledFrom)}>{spilledFrom}</button>, which returns several values. To change it, edit that formula. Other formulas can use the whole block as {spilledFrom}#.
          </p>
        )}
        {cell?.kind === 'formula' && isMatrix(cell.value) && !cell.spillBlocked && (
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">This formula returns {cell.value.height} × {cell.value.width} values, so they <b>spill</b> into the cells beside and below it (outlined). Refer to all of them as <span className="font-mono">{key}#</span>.</p>
        )}
        {!cell?.input && !spilledFrom && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Type a number or some text, or start with <b>=</b> to write a formula, then press Enter.</p>
        )}
      </Section>

      {error && (
        <Section title={'What ' + error.code + ' means'}>
          <p className="text-xs font-semibold text-red-700 dark:text-red-300">{ERRORS[error.code]?.title ?? error.code}</p>
          {error.detail && <p className="mt-1 text-xs text-slate-800 dark:text-slate-100">{error.detail}</p>}
          {ERRORS[error.code] && (
            <>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">{ERRORS[error.code].why}</p>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300"><b>How to fix it:</b> {ERRORS[error.code].fix}</p>
            </>
          )}
        </Section>
      )}

      <FormulaLearn wb={wb} sheet={sheet} row={row} col={col} cell={cell} onMakeCode={onMakeCode} lesson={lesson} />

      {(uses.length > 0 || usedBy.length > 0) && (
        <Section title="Connections">
          {uses.length > 0 && <p className="text-xs text-slate-600 dark:text-slate-300"><b>Reads</b> (precedents): <span className="font-mono">{uses.join(', ')}</span></p>}
          {usedBy.length > 0 && <p className="mt-1 text-xs text-slate-600 dark:text-slate-300"><b>Read by</b> (dependents): <span className="font-mono">{usedBy.slice(0, 12).join(', ')}{usedBy.length > 12 ? ' and ' + (usedBy.length - 12) + ' more' : ''}</span></p>}
          <p className="mt-1.5 text-[11px] text-slate-400">When this cell changes, its dependents recalculate, and theirs, and so on.</p>
        </Section>
      )}

      {functionsUsed.length > 0 && (
        <Section title="Functions in this formula">
          <div className="space-y-2">{functionsUsed.map((n, i) => <FunctionHelp key={n} name={n} open={i === 0} />)}</div>
        </Section>
      )}
    </>
  )
}

function FunctionBrowser() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const q = query.trim().toUpperCase()
  const names = Object.keys(FUNCTIONS).filter((n) => {
    const f = FUNCTIONS[n]
    if (category !== 'All' && f.category !== category) return false
    if (!q) return true
    return n.includes(q) || f.summary.toUpperCase().includes(q)
  }).sort()
  return (
    <div className="px-4 py-3">
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={'Search ' + Object.keys(FUNCTIONS).length + ' functions, e.g. "average" or "date"'}
        className="mb-2 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900" />
      <div className="mb-3 flex flex-wrap gap-1">
        {['All', ...CATEGORIES].map((c) => (
          <button key={c} type="button" onClick={() => setCategory(c)}
            className={'rounded-full px-2 py-0.5 text-[11px] ' + (c === category ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300')}>{c}</button>
        ))}
      </div>
      <p className="mb-2 text-[11px] text-slate-400">{names.length} function{names.length === 1 ? '' : 's'}. Type = and the first letters of a name in a cell to insert one.</p>
      <div className="space-y-1.5">{names.slice(0, 80).map((n) => <FunctionHelp key={n} name={n} />)}</div>
      {names.length > 80 && <p className="mt-2 text-[11px] text-slate-400">Showing 80. Search to narrow the list.</p>}
    </div>
  )
}

export default function Inspector({ wb, sheet, sel, onJump, tab, onTab, runtime, onApplyCode, onMakeCode, chart, chartValues, onChangeChart, onDeleteChart, rules = [], ruleTarget, onAddRule, onRemoveRule, onSelectRule, pivotTable, evaluatePivot, onInsertPivot, dataset, onTry, lessonTries = null, lesson = false }) {
  const isCode = sheet.cells.get(cellKey(sel.active.row, sel.active.col))?.kind === 'code'
  const tabs = [...(chart ? [['chart', 'Chart']] : []), ...(isCode ? [['code', 'Code']] : []), ['cell', 'This cell'], ...(rules.length || tab === 'rules' ? [['rules', 'Rules']] : []), ...(tab === 'pivot' ? [['pivot', 'Pivot']] : []), ...(dataset ? [['data', 'About data']] : []), ['functions', 'Functions']]
  const current = (tab === 'code' && !isCode) || (tab === 'chart' && !chart) || (tab === 'data' && !dataset) ? 'cell' : tab
  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950" aria-label="Inspector">
      <div className="flex shrink-0 border-b border-slate-200 text-xs dark:border-slate-800" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={current === id} onClick={() => onTab(id)}
            className={'flex-1 px-3 py-2 font-semibold ' + (current === id ? 'border-b-2 border-sky-600 text-sky-700 dark:text-sky-300' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200')}>{label}</button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {current === 'chart' && <ChartPanel key={chart.id} chart={chart} values={chartValues(chart)} onChange={(patch) => onChangeChart(chart.id, patch)} onDelete={() => onDeleteChart(chart.id)} />}
        {current === 'code' && <CodePanel wb={wb} sheet={sheet} row={sel.active.row} col={sel.active.col} runtime={runtime} onApply={onApplyCode} />}
        {current === 'cell' && <CellView wb={wb} sheet={sheet} row={sel.active.row} col={sel.active.col} onJump={onJump} onMakeCode={onMakeCode} lesson={lesson} />}
        {current === 'functions' && <FunctionBrowser />}
        {current === 'data' && <DatasetPanel dataset={dataset} onTry={onTry} lessonTries={lessonTries} />}
        {current === 'pivot' && <PivotPanel key={pivotTable ? formatRange(pivotTable.range) : 'none'} table={pivotTable} evaluate={evaluatePivot} onInsert={onInsertPivot} />}
        {current === 'rules' && <RulesPanel rules={rules} target={ruleTarget} onAdd={onAddRule} onRemove={onRemoveRule} onSelect={onSelectRule} />}
      </div>
    </aside>
  )
}
