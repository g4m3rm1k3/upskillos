// The Spreadsheet Lab: a spreadsheet built for learning. It behaves like
// Excel (the same formulas, keys and errors) and explains itself as it goes.
//
// <Spreadsheet> is the whole spreadsheet, given a workbook or a place to keep
// one. The lab is one; a lesson (Data Science Studio's formula exercises) is
// another, with its own workbook, so lessons use the real grid, formula bar
// and explanations rather than copies of them.
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Workbook } from './engine/workbook.js'
import { FUNCTIONS } from './engine/functions/index.js'
import { cellKey, formatRange, indexToCol, parseCell, parseRange, quoteSheet } from './engine/address.js'
import { shiftFormula, transformFormula } from './engine/rewrite.js'
import { fillInputs } from './engine/fill.js'
import { canInsertReference } from './engine/editing.js'
import { adjustDecimals } from './engine/format.js'
import { parseCSV, toCSV } from './engine/csv.js'
import { formatGeneral } from './engine/values.js'
import Grid, { DEFAULT_COL_W, DEFAULT_ROW_H } from './ui/Grid.jsx'
import { CHART_TYPES, currentRegion, recommendChart } from './engine/chart.js'
import { hiddenRows, looksLikeHeader, removeDuplicates, sortRows } from './engine/data.js'
import FilterMenu from './ui/FilterMenu.jsx'
import { DATASETS } from './datasets/index.js'
import { ruleEffect, ruleStats } from './engine/conditional.js'
import { addFold, expandForFolds, foldHiddenRows, makeFold, nextFoldState } from './engine/folds.js'
import FormulaInput from './ui/FormulaInput.jsx'
import Inspector from './ui/Inspector.jsx'
import Toolbar from './ui/Toolbar.jsx'
import SheetTabs from './ui/SheetTabs.jsx'
import { displayCell } from './ui/display.js'
import { MAX_GRID_COLS, MAX_GRID_ROWS, cellSelection, clampPos, jumpTarget, moveSelection, selectionLabel, selectionRange } from './ui/selection.js'
import { sampleWorkbook } from './ui/samples.js'
import { LANGUAGES, codeLanguageFromInput } from './engine/code.js'
import { createCodeRuntime } from './runtime/runtime.js'
import { useEntryLink } from '../../utils/entryLinks.js'
import './spreadsheet.css'

const STORE = 'upskillos.spreadsheet-lab.v1'
const PREFS = 'upskillos.spreadsheet-lab.prefs'
const REF_COLORS = ['#2563eb', '#dc2626', '#7c3aed', '#16a34a', '#c2410c', '#0891b2']
const ARROWS = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }

function readJSON(key) {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}
function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage full or blocked: the workbook lasts this visit */ }
}

function loadBook(store) {
  const saved = readJSON(store)
  if (saved?.workbook) {
    try { return { wb: Workbook.fromJSON(saved.workbook), sheetIndex: saved.sheetIndex ?? 0 } } catch { /* damaged: fall back to the tour */ }
  }
  return { wb: sampleWorkbook('tour'), sheetIndex: 0 }
}

export default function SpreadsheetLab() {
  return <Spreadsheet store={STORE} entryKey="spreadsheet-lab" />
}

// book: a Workbook to show (a lesson's), or store: the localStorage key the
// workbook is kept under (the lab's). entryKey: the deep-link key this
// spreadsheet answers. lesson: inside a lesson, so no New/Open, Enter stays on
// the cell (its worked-out steps stay in view), and preferences are not saved.
// start: the cell selected at first.
export function Spreadsheet({ book: given = null, store = null, entryKey = null, lesson = false, start = null }) {
  const [book, setBook] = useState(() => (given ? { wb: given, sheetIndex: 0 } : loadBook(store)))
  const wb = book.wb
  const subscribe = useCallback((cb) => wb.subscribe(cb), [wb])
  const version = useSyncExternalStore(subscribe, () => wb.version)
  const [sheetId, setSheetId] = useState(() => (wb.sheets[book.sheetIndex] ?? wb.sheets[0]).id)
  const sheet = wb.sheet(sheetId) ?? wb.sheets[0]
  const [sel, setSel] = useState(() => cellSelection(start?.row ?? 0, start?.col ?? 0))
  const [edit, setEdit] = useState(null)
  const [caretRequest, setCaretRequest] = useState(null)
  const [inspectorOpen, setInspectorOpen] = useState(() => (lesson ? true : readJSON(PREFS)?.inspector ?? true))
  const [inspectorTab, setInspectorTab] = useState('cell')
  // The workers that run Python, JavaScript and MATLAB cells: one set for the
  // lab's lifetime, shut down when the lab closes.
  const runtimeRef = useRef(null)
  runtimeRef.current ??= createCodeRuntime()
  const runtime = runtimeRef.current
  const [menu, setMenu] = useState(null)
  const [notice, setNotice] = useState(null)
  const [tracing, setTracing] = useState(false)
  const [selectedChart, setSelectedChart] = useState(null)
  const [filterMenu, setFilterMenu] = useState(null) // { col, anchor } while a filter menu is open
  const [pivotTable, setPivotTable] = useState(null) // the table the pivot panel summarises
  const [nameBox, setNameBox] = useState(null)
  const gridRef = useRef(null)
  const fileRef = useRef(null)
  // Pop-up menus are placed relative to the lab: the window around it may be
  // transformed, which would move anything positioned against the screen.
  const rootRef = useRef(null)
  const toRoot = (x, y) => { const b = rootRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 }; return { x: x - b.left, y: y - b.top } }
  const rootSize = () => ({ width: rootRef.current?.clientWidth ?? window.innerWidth, height: rootRef.current?.clientHeight ?? window.innerHeight })
  const clipboard = useRef(null)

  // Save after each change (debounced), in this browser only.
  useEffect(() => {
    if (!store) return undefined
    const t = setTimeout(() => writeJSON(store, { workbook: wb.toJSON(), sheetIndex: Math.max(0, wb.sheets.indexOf(sheet)) }), 400)
    return () => clearTimeout(t)
  }, [store, wb, version, sheet])
  useEffect(() => { if (!lesson) writeJSON(PREFS, { inspector: inspectorOpen }) }, [lesson, inspectorOpen])
  useEffect(() => () => runtime.release(), [runtime])
  useEffect(() => {
    wb.codeRunner = runtime.run
    // A workbook opened with code cells: run them now that there is a runner.
    if (wb.sheets.some((s) => [...s.cells.values()].some((c) => c.kind === 'code'))) wb.recalcAll()
  }, [wb, runtime])
  useEffect(() => { if (!notice) return undefined; const t = setTimeout(() => setNotice(null), 5000); return () => clearTimeout(t) }, [notice])

  // Immediately, not on the next frame: a delayed focus could land after the
  // learner had already started typing in a new cell and steal the keys.
  const focusGrid = () => gridRef.current?.focus({ preventScroll: true })
  const activeCell = wb.getCell(sheet.id, sel.active.row, sel.active.col)
  const range = selectionRange(sel)
  const activeIsCode = activeCell?.kind === 'code'
  // Selecting a code cell shows its code; leaving it goes back to the cell view.
  useEffect(() => {
    setInspectorTab((t) => (activeIsCode ? (t === 'cell' ? 'code' : t) : (t === 'code' ? 'cell' : t)))
  }, [activeIsCode, sel.active.row, sel.active.col, sheet.id])

  // Trace arrows (Excel's Trace Precedents and Trace Dependents) for the
  // selected cell, on this sheet.
  const traces = useMemo(() => {
    if (!tracing || edit) return null
    const { row, col } = sel.active
    const gid = sheet.id + '!' + cellKey(row, col)
    const reads = wb.precedents.get(gid) ?? []
    const readBy = [...wb.readersOf([{ sheet, row, col }])]
    const here = (g) => g.startsWith(sheet.id + '!')
    return {
      precedents: reads.filter((r) => r.sheetId === sheet.id),
      dependents: readBy.filter(here).map((g) => parseCell(g.slice(sheet.id.length + 1))).filter(Boolean),
      elsewhere: reads.filter((r) => r.sheetId !== sheet.id).length + readBy.filter((g) => !here(g)).length,
    }
  }, [tracing, edit, sel.active.row, sel.active.col, sheet, version]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sort, filter, remove duplicates ──────────────────────────────────
  const read = useCallback((r, c) => wb.valueAt(sheet, r, c), [wb, sheet, version]) // eslint-disable-line react-hooks/exhaustive-deps
  const filterRange = sheet.filter ? parseRange(sheet.filter.source) : null
  const filtered = useMemo(() => (filterRange ? hiddenRows(sheet.filter, filterRange, read) : null), [sheet.filter, read]) // eslint-disable-line react-hooks/exhaustive-deps
  // Rows hidden by the filter, and by folded tables.
  const folded = useMemo(() => foldHiddenRows(sheet.folds), [sheet.folds])
  const hidden = useMemo(() => (folded.size ? new Set([...(filtered ?? []), ...folded]) : filtered), [filtered, folded])
  const isHidden = hidden?.size ? (r) => hidden.has(r) : null
  const cellAt = (r, c) => wb.getCell(sheet.id, r, c)
  const inside = (rg, p) => p.row >= rg.r1 && p.row <= rg.r2 && p.col >= rg.c1 && p.col <= rg.c2
  // The table to work on: the selection, or the block of data around a single
  // selected cell, as Excel does.
  const tableAround = () => {
    const rg = clipped(range)
    if (rg.r1 !== rg.r2 || rg.c1 !== rg.c2) return rg
    return currentRegion((r, c) => wb.valueAt(sheet, r, c) !== null, rg.r1, rg.c1)
  }
  const single = range.r1 === range.r2 && range.c1 === range.c2
  const sortBy = (descending, col = sel.active.col) => {
    let target, header
    // Inside a filtered table, sort the whole table under its headings.
    if (filterRange && single && inside(filterRange, sel.active)) { target = filterRange; header = true }
    else { target = tableAround(); header = looksLikeHeader(wb.rangeValues(sheet, formatRange(target)) ?? []) }
    if (col < target.c1 || col > target.c2) col = target.c1
    const { changes, message } = sortRows({ sheetId: sheet.id, range: target, keys: [{ col, descending }], header, read, cellAt })
    if (changes.length) wb.setCells(changes)
    setNotice(message)
  }
  const toggleFilter = () => {
    if (sheet.filter) { wb.setFilter(sheet.id, null); setNotice('Filter removed: every row shows again.'); return }
    const rg = tableAround()
    if (rg.r1 === rg.r2) { setNotice('A filter needs a row of headings with data below it. Select the table, or a cell in it, first.'); return }
    wb.setFilter(sheet.id, { source: formatRange(rg), hidden: {} })
    setNotice('Added a filter to ' + formatRange(rg) + '. Row ' + (rg.r1 + 1) + ' is treated as the headings: click ▾ on a heading to choose which rows show.')
  }
  const dedupe = () => {
    const inFilter = filterRange && single && inside(filterRange, sel.active)
    const rg = inFilter ? filterRange : tableAround()
    const header = inFilter || looksLikeHeader(wb.rangeValues(sheet, formatRange(rg)) ?? [])
    const { changes, message } = removeDuplicates({ sheetId: sheet.id, range: rg, header, read, cellAt })
    if (changes.length) wb.setCells(changes)
    setNotice(message + (changes.length ? ' Undo (Ctrl+Z) puts them back.' : ''))
  }
  // Pivot tables are GROUPBY / PIVOTBY formulas, built in the inspector.
  const openPivot = () => {
    const rg = tableAround()
    const rows = wb.rangeValues(sheet, formatRange(rg)) ?? []
    const ok = rg.r2 > rg.r1 && looksLikeHeader(rows)
    setPivotTable(ok ? {
      range: rg,
      headers: rows[0].map((v) => String(v ?? '')),
      numeric: rows[0].map((_, c) => rows.slice(1).some((r) => typeof r[c] === 'number')),
    } : null)
    setInspectorOpen(true)
    setInspectorTab('pivot')
  }
  const evaluatePivot = useCallback((text) => wb.previewFormula(sheet, text), [wb, sheet, version]) // eslint-disable-line react-hooks/exhaustive-deps
  const insertPivot = (formula) => {
    const rg = pivotTable.range
    const v = wb.previewFormula(sheet, formula)
    const h = v?.height ?? 1, w = v?.width ?? 1
    // The first place beside the table with room for the whole result.
    let col = rg.c2 + 2
    while (!blockFree(rg.r1, col, h, w) && col < 16000) col++
    wb.setCells([{ sheetId: sheet.id, row: rg.r1, col, input: formula }])
    setSel(cellSelection(rg.r1, col))
    setInspectorTab('cell')
    setNotice('Inserted the pivot table at ' + indexToCol(col) + (rg.r1 + 1) + '. It is a formula, so it updates when the table changes. Click it to see how it is worked out.')
    focusGrid()
  }
  const applyFilter = (col, keys) => {
    const next = { ...sheet.filter, hidden: { ...sheet.filter.hidden, [col - filterRange.c1]: keys } }
    if (!keys.length) delete next.hidden[col - filterRange.c1]
    wb.setFilter(sheet.id, next)
    setFilterMenu(null)
    focusGrid()
  }

  // ── Folded tables ────────────────────────────────────────────────────
  // The fold button on a table's heading row: all rows, then the first few, then the heading only.
  const toggleFold = (fold, state = nextFoldState(fold.state)) => {
    wb.setFolds(sheet.id, sheet.folds.map((f) => (f.id === fold.id ? { ...f, state } : f)))
    focusGrid()
  }
  const foldTable = () => {
    const rg = tableAround()
    if (rg.r1 === rg.r2) { setNotice('Folding needs a table: a row of headings with data below it. Select a cell in the table first.'); return }
    wb.setFolds(sheet.id, addFold(sheet.folds, makeFold(rg)))
    setSel(cellSelection(rg.r1, sel.active.col))
    setNotice('Folded ' + formatRange(rg) + ' to its first rows. The button on row ' + (rg.r1 + 1) + ' folds it further or opens it; copying row ' + (rg.r1 + 1) + ' copies the whole table.')
  }

  // ── Conditional formatting ───────────────────────────────────────────
  // Each rule's statistics (lowest, highest, average…) are worked out once per
  // change; the grid then asks for the effect on each cell it draws.
  const conditional = useMemo(() => {
    const prepared = sheet.rules.map((rule) => {
      const rg = parseRange(rule.source)
      if (!rg) return null
      return { rule, rg, stats: ruleStats(rule, (wb.rangeValues(sheet, rule.source) ?? []).flat()) }
    }).filter(Boolean)
    if (!prepared.length) return null
    return (r, c) => {
      let out = null
      for (const p of prepared) {
        if (r < p.rg.r1 || r > p.rg.r2 || c < p.rg.c1 || c > p.rg.c2) continue
        const fx = ruleEffect(p.rule, wb.valueAt(sheet, r, c), p.stats)
        if (fx) out = out ? { ...fx, ...out } : fx // the rule higher in the list wins
      }
      return out
    }
  }, [sheet.rules, version, sheet]) // eslint-disable-line react-hooks/exhaustive-deps
  const addRule = (rule) => {
    const rg = clipped(range)
    const source = formatRange(rg)
    wb.setRules(sheet.id, [...sheet.rules, { ...rule, id: 'rule' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), source }])
    setNotice('Added the rule to ' + source + '. It is checked again whenever the values change.')
  }

  // ── Sample datasets ──────────────────────────────────────────────────
  const dataset = DATASETS.find((d) => d.id === sheet.dataset) ?? null
  // The lessons' exercises on this dataset, loaded when its sheet is showing.
  const [lessonTries, setLessonTries] = useState(null)
  useEffect(() => {
    let live = true
    setLessonTries(null)
    dataset?.lessons?.().then((m) => { if (live) setLessonTries(m.SHEET_EXERCISES) })
    return () => { live = false }
  }, [dataset])
  const openDataset = async (id) => {
    const ds = DATASETS.find((d) => d.id === id)
    const rows = await ds.rows()
    const target = wb.addSheet(ds.title)
    target.dataset = ds.id
    wb.setCells(rows.flatMap((r, i) => r.map((v, c) => ({ sheetId: target.id, row: i, col: c, input: String(v), ...(i === 0 ? { style: { bold: true } } : {}) }))))
    rows[0].forEach((h, c) => { if (String(h).length > 12) wb.setSize(target.id, 'col', c, Math.min(220, String(h).length * 7 + 16)) })
    wb.setFolds(target.id, [makeFold({ r1: 0, c1: 0, r2: rows.length - 1, c2: rows[0].length - 1 }, 'open')], { record: false })
    // The tables its formulas join to, each on its own sheet, unless the workbook has them already.
    for (const extra of (await ds.sheets?.()) ?? []) {
      if (wb.sheet(extra.name)) continue
      const other = wb.addSheet(extra.name)
      wb.setCells(extra.rows.flatMap((r, i) => r.map((v, c) => ({ sheetId: other.id, row: i, col: c, input: String(v), ...(i === 0 ? { style: { bold: true } } : {}) }))))
    }
    setSheetId(target.id)
    setSel(cellSelection(0, 0))
    setInspectorOpen(true)
    setInspectorTab('data')
    setNotice('Added the sheet "' + target.name + '" with ' + (rows.length - 1) + ' rows' + (ds.sheets ? ', and the sheets it joins to' : '') + '. The panel on the right says what the columns mean and suggests things to try.')
    focusGrid()
  }
  // A deep link opens a dataset, then carries out one of its "things to try" once its sheet is showing:
  // ?dataset=shop-orders&try=2, or a lesson's exercise, with the learner's own formula if they had one
  // (Data Science Studio sends ?dataset=shop-orders&exercise=<lesson id:block>&formula=<formula>).
  const [pendingTry, setPendingTry] = useState(null)
  useEntryLink(entryKey ?? '', (search) => {
    if (!entryKey) return
    const q = new URLSearchParams(search)
    const ds = DATASETS.find((d) => d.id === q.get('dataset'))
    if (!ds) return
    openDataset(ds.id).then(async () => {
      const t = q.get('exercise') && ds.lessons ? (await ds.lessons()).exerciseTry(q.get('exercise'), q.get('formula')) : ds.tries[Number.parseInt(q.get('try') ?? '', 10)]
      if (t) setPendingTry({ id: ds.id, t })
    })
  })
  useEffect(() => {
    if (!pendingTry || sheet.dataset !== pendingTry.id) return
    setPendingTry(null)
    runTry(pendingTry.t)
  }, [pendingTry, sheet]) // eslint-disable-line react-hooks/exhaustive-deps
  // Whether a block of cells is empty and not under a chart, so new cells
  // put there can be seen.
  const blockFree = (r0, c0, h, w) => {
    for (let r = r0; r < r0 + h; r++) for (let c = c0; c < c0 + w; c++) if (wb.getCell(sheet.id, r, c) || sheet.spillOwner.has(cellKey(r, c))) return false
    const x1 = offset(sheet.colWidths, c0, DEFAULT_COL_W), x2 = offset(sheet.colWidths, c0 + w, DEFAULT_COL_W)
    const y1 = offset(sheet.rowHeights, r0, DEFAULT_ROW_H), y2 = offset(sheet.rowHeights, r0 + h, DEFAULT_ROW_H)
    return !sheet.charts.some((ch) => x1 < ch.x + ch.w && ch.x < x2 && y1 < ch.y + ch.h && ch.y < y2)
  }
  // A "thing to try": carried out beside the data, moving right past
  // anything already there.
  const runTry = (t) => {
    let shift = 0
    let selectAt = null
    const placeBlock = (at, h, w) => { let col = at.col; while (!blockFree(at.row, col, h, w) && col < 16000) col++; return col }
    for (const step of t.steps) {
      if (step.kind === 'cells') {
        const at = parseCell(step.at)
        // The block's size, including what its formulas will spill.
        let h = step.rows.length, w = Math.max(...step.rows.map((r) => r.length))
        step.rows.forEach((r, i) => r.forEach((input, c) => {
          if (!input.startsWith('=')) return
          const v = wb.previewFormula(sheet, input, at.row + i, at.col + c)
          if (v?.height) { h = Math.max(h, i + v.height); w = Math.max(w, c + v.width) }
        }))
        const col = placeBlock(at, h, w)
        shift = col - at.col
        wb.setCells(step.rows.flatMap((r, i) => r.map((input, c) => ({ sheetId: sheet.id, row: at.row + i, col: col + c, input }))))
        selectAt ??= { row: at.row, col }
      } else if (step.kind === 'code') {
        const at = parseCell(step.at)
        const [h, w] = step.size ?? [1, 1]
        const col = placeBlock(at, h, w)
        wb.setCells([{ sheetId: sheet.id, row: at.row, col, code: { lang: step.lang, source: step.source } }])
        selectAt ??= { row: at.row, col }
      } else if (step.kind === 'chart') {
        const parts = step.source.split(',').map((p) => parseRange(p))
        const moved = parts.map((p) => ({ ...p, c1: p.c1 + shift, c2: p.c2 + shift }))
        const { x, y } = chartSpot(moved[0], 480, 300)
        const id = wb.addChart(sheet.id, { type: step.type, source: moved.map(formatRange).join(','), x, y, w: 480, h: 300, ...(step.title ? { title: step.title } : {}), ...(step.trendline ? { trendline: true } : {}), ...(step.xTitle ? { xTitle: step.xTitle } : {}), ...(step.yTitle ? { yTitle: step.yTitle } : {}) })
        keepTab.current = true
        setSelectedChart(id)
      } else if (step.kind === 'rule') {
        wb.setRules(sheet.id, [...sheet.rules, { ...step.rule, id: 'rule' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), source: step.source }])
      }
    }
    if (selectAt && !t.steps.some((s) => s.kind === 'chart')) setSel(cellSelection(selectAt.row, selectAt.col))
    setNotice('Done: ' + t.label + '.' + (t.steps.some((s) => s.kind === 'code') ? ' Select the code cell to read and change its code.' : ''))
  }

  // ── Charts ───────────────────────────────────────────────────────────
  const chart = sheet.charts.find((c) => c.id === selectedChart) ?? null
  useEffect(() => { setSelectedChart(null) }, [sheet.id])
  const keepTab = useRef(false) // a chart made from "Things to try" leaves that list open
  useEffect(() => {
    if (keepTab.current) { keepTab.current = false; return }
    if (selectedChart) { setInspectorOpen(true); setInspectorTab('chart') }
    else setInspectorTab((t) => (t === 'chart' ? (activeIsCode ? 'code' : 'cell') : t))
  }, [selectedChart]) // eslint-disable-line react-hooks/exhaustive-deps
  // Each chart's cells, read once per change to the workbook rather than on
  // every redraw while scrolling.
  const chartCache = useMemo(() => new Map(), [version, sheet]) // eslint-disable-line react-hooks/exhaustive-deps
  const chartValues = (c) => {
    if (!chartCache.has(c.source)) chartCache.set(c.source, wb.rangeValues(sheet, c.source))
    return chartCache.get(c.source)
  }
  const offset = (sizes, index, size) => { let p = 0; for (let i = 0; i < index; i++) p += sizes[i] ?? size; return p }
  const insertChart = () => {
    // One cell selected: chart the block of data around it, as Excel does.
    let rg = clipped(range)
    if (rg.r1 === rg.r2 && rg.c1 === rg.c2) rg = currentRegion((r, c) => wb.valueAt(sheet, r, c) !== null, rg.r1, rg.c1)
    const values = wb.rangeValues(sheet, formatRange(rg))
    if (!values || !values.flat().some((v) => typeof v === 'number')) {
      setNotice('Select the numbers to chart first (with their headings), or click a cell inside a table of numbers.')
      return
    }
    const rec = recommendChart(values)
    const source = formatRange(rg)
    const { x, y } = chartSpot(rg, 480, 300)
    const id = wb.addChart(sheet.id, { type: rec.type, source, x, y, w: 480, h: 300 })
    setSelectedChart(id)
    setNotice('Made a ' + CHART_TYPES[rec.type].label.toLowerCase() + ' chart of ' + source + '. ' + rec.why)
  }
  // Beside the data, in the first place that covers no filled cells and no
  // other chart, so a new chart never hides something.
  const chartSpot = (rg, w, h) => {
    const y = offset(sheet.rowHeights, rg.r1, DEFAULT_ROW_H)
    const rowsCovered = Math.ceil(h / DEFAULT_ROW_H) + 1
    const overlapsChart = (x) => sheet.charts.some((c) => x < c.x + c.w + 8 && c.x < x + w + 8 && y < c.y + c.h + 8 && c.y < y + h + 8)
    const last = sheet.bounds().cols
    for (let col = rg.c2 + 1; col <= last + 20; col++) {
      const x = offset(sheet.colWidths, col, DEFAULT_COL_W) + 16
      let c2 = col, width = 16
      while (width < w + 16) width += sheet.colWidths[c2++] ?? DEFAULT_COL_W
      let empty = true
      for (let r = rg.r1; r < rg.r1 + rowsCovered && empty; r++) for (let c = col; c < c2 && empty; c++) if (wb.valueAt(sheet, r, c) !== null) empty = false
      if (empty && !overlapsChart(x)) return { x, y }
    }
    // Everything to the right is taken: go below the data instead.
    return { x: offset(sheet.colWidths, rg.c1, DEFAULT_COL_W) + 24 * sheet.charts.length, y: offset(sheet.rowHeights, rg.r2 + 2, DEFAULT_ROW_H) }
  }
  const deleteChart = (id) => {
    wb.removeChart(sheet.id, id)
    setSelectedChart(null)
    focusGrid()
    setNotice('Deleted the chart. Undo (Ctrl+Z) brings it back.')
  }

  const openCode = () => { setInspectorOpen(true); setInspectorTab('code') }
  const setCode = (row, col, lang, source) => {
    wb.setCells([{ sheetId: sheet.id, row, col, code: { lang, source } }])
    setSel(cellSelection(row, col))
    openCode()
  }

  // A selection of whole rows or columns, clipped to the part of the sheet in use.
  const clipped = (rg) => {
    const b = sheet.bounds()
    return { r1: rg.r1, c1: rg.c1, r2: Math.min(rg.r2, Math.max(b.rows - 1, rg.r1)), c2: Math.min(rg.c2, Math.max(b.cols - 1, rg.c1)) }
  }
  const eachCell = (rg, fn) => { for (let r = rg.r1; r <= rg.r2; r++) for (let c = rg.c1; c <= rg.c2; c++) fn(r, c) }

  // ── Editing ──────────────────────────────────────────────────────────
  const startEdit = (row, col, initial, mode, where = 'cell') => {
    const cell = wb.getCell(sheet.id, row, col)
    // Editing a code cell means editing its code, in the panel.
    if (cell?.kind === 'code' && initial === null) { setSel(cellSelection(row, col)); openCode(); return }
    const draft = initial ?? cell?.input ?? ''
    if (sel.active.row !== row || sel.active.col !== col) setSel(cellSelection(row, col))
    setEdit({ sheetId: sheet.id, row, col, draft, caret: draft.length, mode, where, point: null, pointCell: null })
  }

  const commit = (move = [1, 0], fillSelection = false) => {
    if (!edit) return
    if (fillSelection) {
      // Ctrl+Enter: the same entry in every selected cell, references moved for each.
      const changes = []
      eachCell(clipped(range), (r, c) => changes.push({ sheetId: edit.sheetId, row: r, col: c, input: shiftFormula(edit.draft, r - edit.row, c - edit.col) }))
      wb.setCells(changes)
    } else if (codeLanguageFromInput(edit.draft) && edit.sheetId === sheet.id) {
      // =PY( / =JS( / =MATLAB( turns the cell into a code cell, as =PY( does in Excel.
      const lang = codeLanguageFromInput(edit.draft)
      setEdit(null)
      setCode(edit.row, edit.col, lang, LANGUAGES[lang].starter)
      return
    } else {
      wb.setCells([{ sheetId: edit.sheetId, row: edit.row, col: edit.col, input: edit.draft }])
    }
    if (edit.sheetId !== sheet.id) setSheetId(edit.sheetId)
    setEdit(null)
    if (!fillSelection) setSel(moveSelection(cellSelection(edit.row, edit.col), move[0], move[1], false, isHidden))
    focusGrid()
  }

  const cancel = () => {
    if (edit && edit.sheetId !== sheet.id) setSheetId(edit.sheetId)
    setEdit(null)
    focusGrid()
  }

  const pointMode = !!edit && edit.draft.startsWith('=') && (canInsertReference(edit.draft, edit.caret) || (edit.point !== null && edit.caret === edit.point.end))

  // Clicking (or arrowing to) a cell while writing a formula inserts its address.
  const insertReference = (rg, pointCell = null) => {
    const text = (sheet.id !== edit.sheetId ? quoteSheet(sheet.name) + '!' : '') + formatRange(rg)
    const replacing = edit.point && edit.caret === edit.point.end
    const start = replacing ? edit.point.start : edit.caret
    const end = replacing ? edit.point.end : edit.caret
    const draft = edit.draft.slice(0, start) + text + edit.draft.slice(end)
    const caret = start + text.length
    setEdit({ ...edit, draft, caret, point: { start, end: caret }, pointCell })
    setCaretRequest({ pos: caret })
  }

  const editorKeyDown = (e) => {
    if (!edit) return
    if (e.key === 'Enter') { e.preventDefault(); commit(lesson ? [0, 0] : e.shiftKey ? [-1, 0] : [1, 0], e.ctrlKey || e.metaKey); return }
    if (e.key === 'Tab') { e.preventDefault(); commit(e.shiftKey ? [0, -1] : [0, 1]); return }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); return }
    if (e.key === 'F2') { e.preventDefault(); setEdit({ ...edit, mode: edit.mode === 'enter' ? 'edit' : 'enter' }); return }
    const arrow = ARROWS[e.key]
    if (arrow && edit.mode === 'enter' && edit.where === 'cell') {
      e.preventDefault()
      if (pointMode) {
        // As in Excel: arrows in a formula pick the cell to refer to.
        const from = edit.pointCell ?? { row: edit.row, col: edit.col }
        const p = clampPos(from.row + arrow[0], from.col + arrow[1])
        insertReference({ r1: p.row, c1: p.col, r2: p.row, c2: p.col }, p)
      } else commit(arrow)
    }
  }

  const draftChange = (draft, caret) => setEdit((e) => (e ? { ...e, draft, caret, point: e.point && caret === e.point.end && draft.length === e.draft.length ? e.point : null, pointCell: null } : e))

  // References in the formula being typed, outlined in colour on the grid.
  const refHighlights = useMemo(() => {
    if (!edit?.draft.startsWith('=')) return []
    const out = []
    transformFormula(edit.draft, (ref) => {
      const here = ref.sheet ? ref.sheet.toLowerCase() === sheet.name.toLowerCase() : edit.sheetId === sheet.id
      if (here) out.push({ range: { r1: ref.r1, c1: ref.c1, r2: ref.r2, c2: ref.c2 }, color: REF_COLORS[out.length % REF_COLORS.length] })
      return ref
    })
    return out
  }, [edit?.draft, edit?.sheetId, sheet])

  // ── Selection ────────────────────────────────────────────────────────
  const select = (next) => {
    if (edit && !pointMode) {
      wb.setCells([{ sheetId: edit.sheetId, row: edit.row, col: edit.col, input: edit.draft }])
      setEdit(null)
    }
    setSel(next)
    setSelectedChart(null)
  }

  const hasValue = (r, c) => wb.valueAt(sheet, r, c) !== null

  // ── Changing cells ───────────────────────────────────────────────────
  const applyStyle = (patch) => {
    const changes = []
    eachCell(clipped(range), (r, c) => {
      const style = { ...(wb.getCell(sheet.id, r, c)?.style ?? {}), ...patch }
      for (const k of Object.keys(style)) if (style[k] === undefined || style[k] === false) delete style[k]
      changes.push({ sheetId: sheet.id, row: r, col: c, style })
    })
    wb.setCells(changes)
    focusGrid()
  }

  const applyFormat = (code) => {
    const changes = []
    eachCell(clipped(range), (r, c) => changes.push({ sheetId: sheet.id, row: r, col: c, format: code === 'General' ? undefined : code }))
    wb.setCells(changes)
    focusGrid()
  }

  const changeDecimals = (delta) => {
    const changes = []
    eachCell(clipped(range), (r, c) => {
      const value = wb.valueAt(sheet, r, c)
      if (typeof value !== 'number') return
      changes.push({ sheetId: sheet.id, row: r, col: c, format: adjustDecimals(wb.getCell(sheet.id, r, c)?.format, delta, value) })
    })
    if (changes.length) wb.setCells(changes)
    focusGrid()
  }

  const clearFormat = () => {
    const changes = []
    eachCell(clipped(range), (r, c) => changes.push({ sheetId: sheet.id, row: r, col: c, format: undefined, style: undefined }))
    wb.setCells(changes)
    focusGrid()
  }

  const clearContents = () => {
    const changes = []
    eachCell(clipped(range), (r, c) => { if (wb.getCell(sheet.id, r, c)?.input) changes.push({ sheetId: sheet.id, row: r, col: c, input: '' }) })
    if (changes.length) wb.setCells(changes)
  }

  // Ctrl+D / Ctrl+R: copy the first row (or column) of the selection into the rest.
  const copyAcross = (down) => {
    const rg = clipped(range)
    const changes = []
    eachCell(rg, (r, c) => {
      const fromRow = down ? rg.r1 : r, fromCol = down ? c : rg.c1
      if (r === fromRow && c === fromCol) return
      const src = wb.getCell(sheet.id, fromRow, fromCol)
      changes.push({ sheetId: sheet.id, row: r, col: c, input: shiftFormula(src?.input ?? '', r - fromRow, c - fromCol), format: src?.format, style: src?.style })
    })
    if (changes.length) wb.setCells(changes)
  }

  // The fill handle: continue the selection into the dragged-over cells.
  const fill = (src, target) => {
    const changes = []
    const vertical = target.r1 !== src.r1 || target.r2 !== src.r2
    const forward = vertical ? target.r2 > src.r2 : target.c2 > src.c2
    const count = vertical ? (forward ? target.r2 - src.r2 : src.r1 - target.r1) : (forward ? target.c2 - src.c2 : src.c1 - target.c1)
    const lines = vertical ? [src.c1, src.c2] : [src.r1, src.r2]
    for (let line = lines[0]; line <= lines[1]; line++) {
      const cells = []
      const [a, b] = vertical ? [src.r1, src.r2] : [src.c1, src.c2]
      for (let i = a; i <= b; i++) cells.push(vertical ? wb.getCell(sheet.id, i, line) : wb.getCell(sheet.id, line, i))
      const ordered = forward ? cells : [...cells].reverse()
      const step = forward ? 1 : -1
      const inputs = fillInputs(ordered.map((x) => x?.input ?? ''), count, vertical ? step : 0, vertical ? 0 : step)
      inputs.forEach((input, k) => {
        const at = forward ? b + 1 + k : a - 1 - k
        const from = ordered[k % ordered.length]
        changes.push({ sheetId: sheet.id, row: vertical ? at : line, col: vertical ? line : at, input, format: from?.format, style: from?.style, ...(from?.code ? { code: from.code } : {}) })
      })
    }
    wb.setCells(changes)
    setSel({ active: sel.active, anchor: { row: target.r1, col: target.c1 }, focus: { row: target.r2, col: target.c2 } })
    focusGrid()
  }

  // ── Clipboard ────────────────────────────────────────────────────────
  const copy = (e, cut) => {
    // A folded table's heading row stands for the whole table.
    const rg = expandForFolds(clipped(range), sheet.folds)
    const cells = [], text = []
    for (let r = rg.r1; r <= rg.r2; r++) {
      const row = [], line = []
      for (let c = rg.c1; c <= rg.c2; c++) {
        const cell = wb.getCell(sheet.id, r, c)
        row.push({ input: cell?.input ?? '', format: cell?.format, style: cell?.style, code: cell?.code })
        line.push(displayCell(wb.valueAt(sheet, r, c), cell?.format).text)
      }
      cells.push(row)
      text.push(line)
    }
    const tsv = toCSV(text, '\t')
    clipboard.current = { sheetId: sheet.id, range: rg, cut, tsv, cells }
    e.clipboardData.setData('text/plain', tsv)
    e.preventDefault()
    const grew = rg.r2 > clipped(range).r2 ? ' The folded table came too: ' + (rg.r2 - rg.r1 + 1) + ' rows.' : ''
    setNotice((cut ? 'Cut ' + formatRange(rg) + '. Paste to move it.' : 'Copied ' + formatRange(rg) + '.') + grew)
  }

  const paste = (e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    const at = { row: range.r1, col: range.c1 }
    const clip = clipboard.current
    const changes = []
    let h = 0, w = 0
    if (clip && clip.tsv === text) {
      // From this lab: formulas come along, with references moved (or not, after a cut).
      h = clip.cells.length; w = clip.cells[0]?.length ?? 0
      if (clip.cut) eachCell(clip.range, (r, c) => changes.push({ sheetId: clip.sheetId, row: r, col: c, input: '', format: undefined, style: undefined }))
      clip.cells.forEach((row, i) => row.forEach((c, j) => changes.push({
        sheetId: sheet.id, row: at.row + i, col: at.col + j,
        input: clip.cut ? c.input : shiftFormula(c.input, at.row - clip.range.r1, at.col - clip.range.c1),
        format: c.format, style: c.style,
        ...(c.code ? { code: c.code } : {}),
      })))
      if (clip.cut) clipboard.current = null
    } else {
      // From elsewhere (another spreadsheet, a web page): tab-separated text.
      const rows = parseCSV(text.replace(/\r?\n$/, ''), '\t')
      h = rows.length; w = Math.max(0, ...rows.map((r) => r.length))
      rows.forEach((row, i) => row.forEach((v, j) => changes.push({ sheetId: sheet.id, row: at.row + i, col: at.col + j, input: v })))
    }
    if (!changes.length) return
    wb.setCells(changes)
    setSel({ active: at, anchor: at, focus: { row: at.row + Math.max(0, h - 1), col: at.col + Math.max(0, w - 1) } })
  }

  // The browser sends copy and paste to wherever text is selected on the page,
  // which is not always the grid, so listen on the document while the grid
  // has the focus (and not while a cell is being edited: the editor handles
  // its own text).
  const handlers = useRef({})
  handlers.current = { copy, paste, editing: !!edit }
  useEffect(() => {
    const on = (kind) => (e) => {
      if (handlers.current.editing || document.activeElement !== gridRef.current) return
      if (kind === 'paste') handlers.current.paste(e)
      else handlers.current.copy(e, kind === 'cut')
    }
    const listeners = ['copy', 'cut', 'paste'].map((kind) => [kind, on(kind)])
    for (const [kind, fn] of listeners) document.addEventListener(kind, fn)
    return () => { for (const [kind, fn] of listeners) document.removeEventListener(kind, fn) }
  }, [])

  // ── Keyboard ─────────────────────────────────────────────────────────
  const gridKeyDown = (e) => {
    if (e.target !== e.currentTarget) return // keys typed into the cell editor
    const ctrl = e.ctrlKey || e.metaKey
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
    const run = (fn) => { e.preventDefault(); fn() }
    if (ctrl && key === 'z') return run(() => (e.shiftKey ? wb.redo() : wb.undo()))
    if (ctrl && key === 'y') return run(() => wb.redo())
    if (ctrl && key === 'b') return run(() => applyStyle({ bold: !activeCell?.style?.bold }))
    if (ctrl && key === 'i') return run(() => applyStyle({ italic: !activeCell?.style?.italic }))
    if (ctrl && key === 'u') return run(() => applyStyle({ underline: !activeCell?.style?.underline }))
    if (ctrl && key === 'a') return run(() => setSel({ active: sel.active, anchor: { row: 0, col: 0 }, focus: { row: MAX_GRID_ROWS - 1, col: MAX_GRID_COLS - 1 } }))
    if (ctrl && key === 'd') return run(() => copyAcross(true))
    if (ctrl && key === 'r') return run(() => copyAcross(false))
    const arrow = ARROWS[e.key]
    if (arrow) {
      return run(() => {
        if (ctrl) {
          const b = sheet.bounds()
          const from = e.shiftKey ? sel.focus : sel.active
          const p = jumpTarget(hasValue, from, arrow[0], arrow[1], { rows: Math.max(b.rows, from.row + 1), cols: Math.max(b.cols, from.col + 1) })
          setSel(e.shiftKey ? { ...sel, focus: p } : cellSelection(p.row, p.col))
        } else setSel(moveSelection(sel, arrow[0], arrow[1], e.shiftKey, isHidden))
      })
    }
    if (e.key === 'Home') return run(() => setSel(ctrl ? cellSelection(0, 0) : cellSelection(sel.active.row, 0)))
    if (e.key === 'End' && ctrl) return run(() => { const b = sheet.bounds(); setSel(cellSelection(Math.max(0, b.rows - 1), Math.max(0, b.cols - 1))) })
    if (e.key === 'PageDown') return run(() => setSel(moveSelection(sel, 20, 0, e.shiftKey, isHidden)))
    if (e.key === 'PageUp') return run(() => setSel(moveSelection(sel, -20, 0, e.shiftKey, isHidden)))
    if (e.key === 'Enter') return run(() => setSel(moveSelection(sel, e.shiftKey ? -1 : 1, 0, false, isHidden)))
    if (e.key === 'Tab') return run(() => setSel(moveSelection(sel, 0, e.shiftKey ? -1 : 1, false)))
    if (e.key === 'F2') return run(() => startEdit(sel.active.row, sel.active.col, null, 'edit'))
    if (e.key === 'Delete' || e.key === 'Backspace') return run(clearContents)
    if (e.key.length === 1 && !ctrl && !e.altKey) return run(() => startEdit(sel.active.row, sel.active.col, e.key, 'enter'))
    return undefined
  }

  // ── Workbook-level actions ───────────────────────────────────────────
  const replaceBook = (next, message) => {
    setBook({ wb: next, sheetIndex: 0 })
    setSheetId(next.sheets[0].id)
    setSel(cellSelection(0, 0))
    setEdit(null)
    setNotice(message)
    focusGrid()
  }

  const isEmptyBook = wb.sheets.every((s) => s.cells.size === 0)
  const confirmReplace = () => isEmptyBook || window.confirm('Replace this workbook? It is only saved in this browser, so download any sheet you want to keep first.')

  const importCSV = async (file) => {
    const text = await file.text()
    const rows = parseCSV(text)
    const base = file.name.replace(/\.[^.]+$/, '').replace(/[[\]:*?/\\]/g, ' ').slice(0, 28) || 'Imported'
    const target = wb.addSheet(base)
    const changes = []
    rows.forEach((row, r) => row.forEach((v, c) => { if (v !== '') changes.push({ sheetId: target.id, row: r, col: c, input: v }) }))
    wb.setCells(changes)
    setSheetId(target.id)
    setSel(cellSelection(0, 0))
    setNotice('Imported ' + rows.length + ' rows from ' + file.name + ' into the sheet "' + target.name + '".')
    focusGrid()
  }

  // Excel files replace the workbook (as opening a file does in Excel); CSV
  // files come in as a new sheet.
  const importFile = async (file) => {
    if (/\.xls$/i.test(file.name)) { setNotice('Older .xls files cannot be opened here. In Excel, use File → Save As → Excel Workbook (.xlsx), then open that.'); return }
    if (!/\.(xlsx|xlsm)$/i.test(file.name)) { importCSV(file); return }
    if (!confirmReplace()) return
    try {
      const { importXlsx } = await import('./engine/xlsx.js')
      const { wb: next, notes } = importXlsx(new Uint8Array(await file.arrayBuffer()))
      replaceBook(next, 'Opened ' + file.name + ' (' + next.sheets.length + ' sheet' + (next.sheets.length === 1 ? '' : 's') + '). ' + notes.join(' '))
    } catch (e) {
      setNotice(e.message)
    }
  }

  const download = (blob, name) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  const exportXlsx = async () => {
    const { writeXlsx } = await import('./engine/xlsx.js')
    const { bytes, notes } = writeXlsx(wb)
    const name = (wb.sheets.length === 1 ? wb.sheets[0].name : 'Workbook').replace(/[\\/:*?"<>|]/g, ' ') + '.xlsx'
    download(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), name)
    setNotice('Downloaded ' + name + ', with every sheet, formula and format. ' + notes.join(' '))
  }

  const exportCSV = () => {
    const b = sheet.bounds()
    const rows = []
    for (let r = 0; r < b.rows; r++) {
      const row = []
      for (let c = 0; c < b.cols; c++) {
        const v = wb.valueAt(sheet, r, c)
        row.push(typeof v === 'number' && !wb.getCell(sheet.id, r, c)?.format ? formatGeneral(v) : displayCell(v, wb.getCell(sheet.id, r, c)?.format).text)
      }
      rows.push(row)
    }
    download(new Blob([toCSV(rows)], { type: 'text/csv' }), sheet.name + '.csv')
    setNotice('Downloaded ' + sheet.name + '.csv. A CSV file holds one sheet\'s values only: no formulas or formatting. Use the Excel download to keep those.')
  }

  const jumpTo = (text) => {
    const t = text.trim()
    const rg = parseRange(t.toUpperCase()) ?? (parseCell(t.toUpperCase()) && parseRange(t.toUpperCase() + ':' + t.toUpperCase()))
    if (!rg) { setNotice('"' + t + '" is not a cell address. Try B7 or A1:C10.'); return }
    setSel({ active: { row: rg.r1, col: rg.c1 }, anchor: { row: rg.r1, col: rg.c1 }, focus: { row: rg.r2, col: rg.c2 } })
    focusGrid()
  }

  // ── Context menu ─────────────────────────────────────────────────────
  const openMenu = (e, target) => {
    e.preventDefault()
    if (target.kind === 'cell') {
      const inside = target.row >= range.r1 && target.row <= range.r2 && target.col >= range.c1 && target.col <= range.c2
      if (!inside) setSel(cellSelection(target.row, target.col))
    }
    const p = toRoot(e.clientX, e.clientY)
    const { width, height } = rootSize()
    setMenu({ x: Math.min(p.x, width - 230), y: Math.min(p.y, height - 240), target })
  }

  const menuItems = () => {
    const t = menu.target
    const rows = t.kind === 'row' && t.index >= range.r1 && t.index <= range.r2 ? [range.r1, range.r2] : t.kind === 'row' ? [t.index, t.index] : [sel.active.row, sel.active.row]
    const cols = t.kind === 'col' && t.index >= range.c1 && t.index <= range.c2 ? [range.c1, range.c2] : t.kind === 'col' ? [t.index, t.index] : [sel.active.col, sel.active.col]
    const nRows = rows[1] - rows[0] + 1, nCols = cols[1] - cols[0] + 1
    const rowLabel = nRows === 1 ? 'row ' + (rows[0] + 1) : 'rows ' + (rows[0] + 1) + '–' + (rows[1] + 1)
    const colLabel = nCols === 1 ? 'column ' + indexToCol(cols[0]) : 'columns ' + indexToCol(cols[0]) + '–' + indexToCol(cols[1])
    const items = []
    if (t.kind !== 'col') {
      items.push(['Insert ' + nRows + ' row' + (nRows > 1 ? 's' : '') + ' above', () => wb.insertRows(sheet.id, rows[0], nRows)])
      items.push(['Insert ' + nRows + ' row' + (nRows > 1 ? 's' : '') + ' below', () => wb.insertRows(sheet.id, rows[1] + 1, nRows)])
      items.push(['Delete ' + rowLabel, () => wb.deleteRows(sheet.id, rows[0], nRows), true])
    }
    if (t.kind !== 'row') {
      items.push(['Insert ' + nCols + ' column' + (nCols > 1 ? 's' : '') + ' left', () => wb.insertCols(sheet.id, cols[0], nCols)])
      items.push(['Insert ' + nCols + ' column' + (nCols > 1 ? 's' : '') + ' right', () => wb.insertCols(sheet.id, cols[1] + 1, nCols)])
      items.push(['Delete ' + colLabel, () => wb.deleteCols(sheet.id, cols[0], nCols), true])
    }
    items.push(['Clear contents', clearContents])
    if (t.kind !== 'col') items.push(['Fold this table', foldTable])
    return items
  }

  // ── Status bar: quick statistics of the selection, as in Excel ────────
  const stats = useMemo(() => {
    const rg = clipped(range)
    if (rg.r1 === rg.r2 && rg.c1 === rg.c2) return null
    let count = 0, numeric = 0, sum = 0, min = Infinity, max = -Infinity
    eachCell(rg, (r, c) => {
      const v = wb.valueAt(sheet, r, c)
      if (v === null) return
      count++
      if (typeof v === 'number') { numeric++; sum += v; min = Math.min(min, v); max = Math.max(max, v) }
    })
    return { count, numeric, sum, min, max }
  }, [range.r1, range.c1, range.r2, range.c2, version, sheet]) // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (n) => formatGeneral(+n.toPrecision(10))

  return (
    <div ref={rootRef} className="ss-root relative flex h-full min-h-0 flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Toolbar
        wb={wb} cell={activeCell}
        onStyle={applyStyle} onFormat={applyFormat} onDecimals={changeDecimals} onClearFormat={clearFormat}
        onUndo={() => { wb.undo(); focusGrid() }} onRedo={() => { wb.redo(); focusGrid() }}
        inspectorOpen={inspectorOpen} onToggleInspector={() => setInspectorOpen((o) => !o)}
        onNew={lesson ? undefined : () => { if (confirmReplace()) replaceBook(new Workbook(), 'A new, empty workbook.') }}
        onOpenTour={() => { if (confirmReplace()) replaceBook(sampleWorkbook('tour'), 'The tour workbook is open.') }}
        datasets={DATASETS} onOpenDataset={openDataset}
        onImport={lesson ? undefined : () => fileRef.current?.click()}
        onExport={exportCSV} onExportXlsx={exportXlsx}
        onInsertCode={(lang) => setCode(sel.active.row, sel.active.col, lang, LANGUAGES[lang].starter)}
        onInsertChart={insertChart}
        onColourRules={() => { setInspectorOpen(true); setInspectorTab('rules') }}
        onPivot={openPivot}
        onSort={sortBy} onToggleFilter={toggleFilter} filterOn={!!sheet.filter} onRemoveDuplicates={dedupe}
        tracing={tracing} onToggleTracing={() => { setTracing((t) => !t); focusGrid() }}
      />
      <input ref={fileRef} type="file" accept=".xlsx,.xlsm,.xls,.csv,.tsv,.txt,text/csv" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = '' }} />

      {/* Formula bar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-2 py-1 dark:border-slate-800">
        <input
          aria-label="Name box: the selected cell. Type an address and press Enter to go there."
          title="The selected cell. Type an address such as B7 and press Enter to go there."
          value={nameBox ?? selectionLabel(sel)}
          onFocus={(e) => { setNameBox(selectionLabel(sel)); e.target.select() }}
          onChange={(e) => setNameBox(e.target.value)}
          onBlur={() => setNameBox(null)}
          onKeyDown={(e) => { if (e.key === 'Enter') { jumpTo(e.currentTarget.value); setNameBox(null) } if (e.key === 'Escape') { setNameBox(null); focusGrid() } }}
          className="h-7 w-24 rounded border border-slate-300 bg-white px-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
        />
        <span className="select-none font-serif text-sm italic text-slate-400" title="The formula bar shows what the selected cell contains">fx</span>
        {activeIsCode && !edit ? (
          <button type="button" onClick={openCode}
            title="This cell holds code. Click to edit it in the Code panel."
            className="flex h-7 min-w-0 flex-1 items-center gap-2 rounded border border-slate-300 bg-slate-50 px-2 text-left font-mono text-[13px] dark:border-slate-700 dark:bg-slate-900">
            <span className="rounded bg-emerald-600 px-1 text-[10px] font-bold text-white">{LANGUAGES[activeCell.code.lang].short}</span>
            <span className="truncate text-slate-600 dark:text-slate-300">{activeCell.code.source.split('\n').find((l) => l.trim() && !/^\s*(#|\/\/|%)/.test(l)) ?? ''}</span>
          </button>
        ) : (
        <FormulaInput
          ariaLabel="Formula bar: what the selected cell contains"
          functions={FUNCTIONS}
          value={edit ? edit.draft : (activeCell?.input ?? '')}
          caretRequest={edit?.where === 'bar' ? caretRequest : undefined}
          onFocus={() => {
            if (!edit) startEdit(sel.active.row, sel.active.col, null, 'edit', 'bar')
            else if (edit.where !== 'bar') setEdit({ ...edit, where: 'bar', mode: 'edit' })
          }}
          onChange={draftChange}
          onKeyDown={editorKeyDown}
          wrapperClassName="min-w-0 flex-1"
          className="h-7 w-full rounded border border-slate-300 bg-white px-2 font-mono text-[13px] dark:border-slate-700 dark:bg-slate-900"
        />
        )}
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <Grid
            wb={wb} sheet={sheet} version={version} sel={sel} onSelect={select}
            editing={edit && edit.sheetId === sheet.id ? edit : null}
            pointMode={pointMode}
            onPoint={(rg) => insertReference(rg)}
            refHighlights={refHighlights}
            traces={traces}
            conditional={conditional}
            hiddenRows={hidden} filter={filterRange && { ...filterRange, hidden: sheet.filter.hidden }}
            folds={sheet.folds} onFoldToggle={toggleFold}
            onFilterButton={(col, rect) => { const p = toRoot(rect.left, rect.bottom); setFilterMenu({ col, anchor: { left: p.x, bottom: p.y }, bounds: rootSize() }) }}
            charts={sheet.charts} chartValues={chartValues} selectedChart={selectedChart}
            onSelectChart={(id) => { if (id && edit && !pointMode) commit([0, 0]); setSelectedChart(id) }}
            onChangeChart={(id, patch) => wb.updateChart(sheet.id, id, patch)}
            onDeleteChart={deleteChart}
            onStartEdit={(row, col, initial, mode) => startEdit(row, col, initial, mode)}
            onFill={fill}
            onContextMenu={openMenu}
            onKeyDown={gridKeyDown}
            gridRef={gridRef}
            renderEditor={(box) => (
              <FormulaInput
                key="cell-editor"
                autoFocus
                ariaLabel={'Editing ' + indexToCol(edit.col) + (edit.row + 1)}
                functions={FUNCTIONS}
                value={edit.draft}
                caretRequest={caretRequest}
                onChange={draftChange}
                onKeyDown={editorKeyDown}
                wrapperStyle={{ position: 'absolute', left: box.left, top: box.top, width: box.width, height: box.height, zIndex: 7 }}
                className="ss-editor"
                style={{ position: 'static', width: '100%', height: '100%' }}
              />
            )}
          />
          {notice && (
            <div role="status" className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full border border-slate-600 bg-slate-800 px-4 py-1.5 text-xs text-white shadow-lg">{notice}</div>
          )}
        </div>
        {inspectorOpen && (
          <Inspector wb={wb} sheet={sheet} sel={sel} version={version} tab={inspectorTab} onTab={setInspectorTab} runtime={runtime}
            onApplyCode={(source) => wb.setCells([{ sheetId: sheet.id, row: sel.active.row, col: sel.active.col, code: { lang: activeCell.code.lang, source } }])}
            chart={chart} chartValues={chartValues}
            dataset={dataset} onTry={runTry} lessonTries={lessonTries} lesson={lesson}
            pivotTable={pivotTable} evaluatePivot={evaluatePivot} onInsertPivot={insertPivot}
            rules={sheet.rules} ruleTarget={formatRange(clipped(range))}
            onAddRule={addRule}
            onRemoveRule={(id) => wb.setRules(sheet.id, sheet.rules.filter((r) => r.id !== id))}
            onSelectRule={(r) => { const rg = parseRange(r.source); if (rg) setSel({ active: { row: rg.r1, col: rg.c1 }, anchor: { row: rg.r1, col: rg.c1 }, focus: { row: rg.r2, col: rg.c2 } }) }}
            onChangeChart={(id, patch) => wb.updateChart(sheet.id, id, patch)}
            onDeleteChart={deleteChart}
            onMakeCode={(lang, source) => {
              // Beside the formula, so the two values can be compared.
              const { row } = sel.active
              let col = sel.active.col + 1
              while (col < 16383 && (wb.getCell(sheet.id, row, col) || sheet.spillOwner.has(cellKey(row, col)))) col++
              setCode(row, col, lang, source)
              setNotice('Made a ' + LANGUAGES[lang].label + ' cell in ' + indexToCol(col) + (row + 1) + '. It should show the same value as ' + indexToCol(sel.active.col) + (row + 1) + '.')
            }}
            onJump={(key) => { const p = parseCell(key); if (p) setSel(cellSelection(p.row, p.col)) }} />
        )}
      </div>

      <SheetTabs
        wb={wb} activeId={sheet.id}
        onActivate={(id) => {
          if (edit && !pointMode) commit([0, 0])
          setSheetId(id)
          if (!edit) setSel(cellSelection(0, 0))
        }}
        onAdd={() => { const s = wb.addSheet(); setSheetId(s.id); setSel(cellSelection(0, 0)); focusGrid() }}
        onRename={(id, name) => wb.renameSheet(id, name)}
        onDelete={(id) => {
          if (!window.confirm('Delete the sheet "' + wb.sheet(id).name + '"? Formulas that use it will show #REF!. You can undo this.')) return
          const problem = wb.deleteSheet(id)
          if (problem) setNotice(problem)
          else if (id === sheet.id) setSheetId(wb.sheets[0].id)
        }}
      >
        <div className="flex h-full items-center justify-end gap-4 px-3 text-[11px] text-slate-500 dark:text-slate-400" aria-live="polite">
          {filtered && filterRange && (
            <span title="Rows hidden by the filter are still there: formulas such as SUM still include them.">
              Filter: showing <b>{filterRange.r2 - filterRange.r1 - filtered.size}</b> of {filterRange.r2 - filterRange.r1} rows
            </span>
          )}
          {traces && (
            <span>
              <span style={{ color: 'var(--ss-trace-reads)' }}>■</span> reads {traces.precedents.length}
              {' '}<span style={{ color: 'var(--ss-trace-readby)' }}>■</span> read by {traces.dependents.length}
              {traces.elsewhere > 0 && <> · {traces.elsewhere} on other sheets (see the inspector)</>}
            </span>
          )}
          {stats && stats.numeric > 0 && <span>Average: <b>{fmt(stats.sum / stats.numeric)}</b></span>}
          {stats && <span>Count: <b>{stats.count}</b></span>}
          {stats && stats.numeric > 0 && <span>Sum: <b>{fmt(stats.sum)}</b></span>}
          {stats && stats.numeric > 1 && <span className="hidden lg:inline">Min: <b>{fmt(stats.min)}</b> Max: <b>{fmt(stats.max)}</b></span>}
          {!stats && wb.lastRecalc.evaluated > 0 && (
            <span title="Only the formulas affected by a change are recalculated, in an order where each comes after the cells it reads.">
              Recalculated {wb.lastRecalc.evaluated} formula{wb.lastRecalc.evaluated === 1 ? '' : 's'} in {wb.lastRecalc.ms < 1 ? '<1' : Math.round(wb.lastRecalc.ms)} ms
            </span>
          )}
          {wb.lastRecalc.cycles.length > 0 && <span className="font-semibold text-red-600 dark:text-red-400">Circular reference</span>}
        </div>
      </SheetTabs>

      {filterMenu && filterRange && (
        <FilterMenu
          key={filterMenu.col}
          anchor={filterMenu.anchor} bounds={filterMenu.bounds}
          heading={String(wb.valueAt(sheet, filterRange.r1, filterMenu.col) ?? indexToCol(filterMenu.col))}
          range={filterRange} col={filterMenu.col} read={read}
          hidden={sheet.filter.hidden?.[filterMenu.col - filterRange.c1] ?? []}
          onApply={(keys) => applyFilter(filterMenu.col, keys)}
          onSort={(descending) => { setFilterMenu(null); sortBy(descending, filterMenu.col); focusGrid() }}
          onClose={() => { setFilterMenu(null); focusGrid() }}
        />
      )}
      {menu && (
        <>
          <div className="absolute inset-0 z-[60]" onPointerDown={() => setMenu(null)} onContextMenu={(e) => { e.preventDefault(); setMenu(null) }} />
          <div role="menu" className="absolute z-[61] w-56 rounded-md border border-slate-200 bg-white py-1 text-xs shadow-xl dark:border-slate-700 dark:bg-slate-900" style={{ left: menu.x, top: menu.y }}>
            {menuItems().map(([label, action, danger]) => (
              <button key={label} type="button" role="menuitem"
                className={'block w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 ' + (danger ? 'text-red-700 dark:text-red-300' : '')}
                onClick={() => { action(); setMenu(null); focusGrid() }}>{label}</button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

