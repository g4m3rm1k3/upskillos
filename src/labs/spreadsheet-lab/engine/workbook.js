// The workbook: sheets of cells, and keeping every formula's value up to date.
//
// How recalculation works (the same idea as Excel's "smart recalculation"):
//   1. Every formula's precedents (the cells and ranges it reads) are indexed,
//      so for any cell we can find its dependents (the formulas that read it).
//   2. When cells change, everything that depends on them, directly or through
//      other formulas, is marked dirty. Volatile formulas (RAND, TODAY,
//      INDIRECT…) are always dirty.
//   3. The dirty formulas are put in an order where each one comes after the
//      formulas it reads (a topological order), and evaluated in that order.
//      Formulas that read each other in a loop cannot be ordered: they are
//      circular references and get #CYCLE!.
//   4. A formula that returns several values spills them into the cells to the
//      right and below. If those cells are not empty, it shows #SPILL!.
//
// This module has no UI: the grid subscribes to it and redraws on changes.
import { evaluate, evalNode } from './evaluate.js'
import { parse, references, walk } from './parser.js'
import { parseInput } from './input.js'
import { FUNCTIONS } from './functions/index.js'
import { Matrix, err, isError, isMatrix } from './values.js'
import { cellKey, keyToPos, parseRange, rangeContains } from './address.js'
import { adjustForCols, adjustForRows, renameSheetRefs } from './rewrite.js'
import { codeReferences, plainValue, shapeForCode, sheetValue } from './code.js'

let sheetCounter = 0

export class Sheet {
  constructor(name) {
    this.id = 'sheet' + ++sheetCounter
    this.name = name
    this.cells = new Map() // A1 key → cell (only cells with something in them)
    this.spills = new Map() // anchor key → region a formula spilled into
    this.spillClaims = new Map() // anchor key → region it tried to spill into (even if blocked)
    this.spillOwner = new Map() // key of a spilled-into cell → anchor key
    // The same cells and spill owners keyed by a number (row × 16384 + col):
    // reading a value is the hottest path in recalculation, and building the
    // text "A123" for every read was most of its cost.
    this.byNum = new Map()
    this.ownerNum = new Map()
    this.colWidths = {}
    this.rowHeights = {}
    // Charts float over the sheet: { id, type, source: 'A1:C10', x, y, w, h, … }.
    this.charts = []
    // An AutoFilter: { source: 'A1:D20', hidden: { [column offset]: [value keys] } } or null.
    this.filter = null
    // Conditional formatting rules (engine/conditional.js), in order.
    this.rules = []
    // Folded tables (engine/folds.js): { id, source: 'A1:G403', state: 'open' | 'peek' | 'closed' }.
    this.folds = []
    // The sample dataset this sheet was made from (datasets/index.js), if any.
    this.dataset = null
  }

  // The last row and column that hold anything, so whole-column references
  // such as A:A only read the part of the sheet in use.
  bounds() {
    let rows = 0, cols = 0
    for (const key of this.cells.keys()) {
      const p = keyToPos(key)
      rows = Math.max(rows, p.row + 1)
      cols = Math.max(cols, p.col + 1)
    }
    for (const r of this.spills.values()) {
      rows = Math.max(rows, r.r2 + 1)
      cols = Math.max(cols, r.c2 + 1)
    }
    return { rows, cols }
  }
}

const num = (row, col) => row * 16384 + col

// Formulas and code cells are both computed from other cells.
const isComputed = (cell) => cell?.kind === 'formula' || cell?.kind === 'code'

const isEmptyCell = (cell) => !cell || (cell.input === '' && !cell.code && !cell.format && !cell.style)

// A formula result as it is stored: a blank reference reads as 0, as in Excel
// (=A1 with A1 empty shows 0).
function settle(v) {
  if (v === null || v === undefined) return 0
  // A function on its own (=SUM, or a LAMBDA never called) is not a value.
  if (typeof v === 'function') return err('#CALC!', 'This formula gives a function rather than a value. To call it, add brackets and its inputs, such as SUM(A1:A5)' + (v.params ? ', or give the LAMBDA its inputs: =LAMBDA(x, x*2)(5).' : '.'))
  if (isMatrix(v)) return v.height === 1 && v.width === 1 ? settle(v.get(0, 0)) : v.map((x) => (x === null || x === undefined ? 0 : x))
  return v
}

export class Workbook {
  constructor({ empty = false } = {}) {
    this.sheets = []
    this.listeners = new Set()
    this.undoStack = []
    this.redoStack = []
    this.random = Math.random
    this.functions = FUNCTIONS
    this.names = new Map()
    // gid ("sheetId!A1") of a formula → its precedents, resolved to sheet ids
    this.precedents = new Map()
    this.cellDeps = new Map() // gid of a single cell → Set of formula gids that read it
    // Range precedents, indexed by column so finding a cell's readers does not
    // mean checking every formula: sheetId → { byCol: Map<col, Set>, wide: Set }
    this.rangeIndex = new Map()
    this.rangeEntries = new Map() // formula gid → its entries, for removal
    this.volatile = new Set()
    this.lastRecalc = { evaluated: 0, ms: 0, cycles: [] }
    // Increases on every change; the page redraws when it changes.
    this.version = 0
    if (!empty) this.addSheet('Sheet1', { record: false })
  }

  // ── Sheets ────────────────────────────────────────────────────────────
  sheet(idOrName) {
    return this.sheets.find((s) => s.id === idOrName) ?? this.sheets.find((s) => s.name.toLowerCase() === String(idOrName).toLowerCase()) ?? null
  }

  addSheet(name, { record = true } = {}) {
    let base = name ?? 'Sheet' + (this.sheets.length + 1)
    let unique = base, i = 2
    while (this.sheet(unique)) unique = base + ' (' + i++ + ')'
    const sheet = new Sheet(unique)
    this.sheets.push(sheet)
    if (record) this.pushHistory({ type: 'addSheet', sheetId: sheet.id })
    this.rebuildIndex() // formulas that named this sheet before it existed now find it
    this.recalcAll()
    return sheet
  }

  // ── Reading ───────────────────────────────────────────────────────────
  getCell(sheetId, row, col) {
    return this.sheet(sheetId)?.cells.get(cellKey(row, col)) ?? null
  }

  // The value shown at a position, including values spilled there.
  valueAt(sheet, row, col) {
    const n = num(row, col)
    const cell = sheet.byNum.get(n)
    if (cell && cell.kind !== 'blank') {
      if (isComputed(cell) && isMatrix(cell.value)) {
        if (cell.spillBlocked) return err('#SPILL!', 'This formula returns ' + cell.value.height + '×' + cell.value.width + ' values, but some of the cells it would spill into are not empty.')
        return cell.value.get(0, 0)
      }
      return cell.value
    }
    const owner = sheet.ownerNum.get(n)
    if (owner) {
      const region = sheet.spills.get(owner)
      return sheet.cells.get(owner).value.get(row - region.r1, col - region.c1)
    }
    return null
  }

  getValue(sheetId, row, col) {
    const sheet = this.sheet(sheetId)
    return sheet ? this.valueAt(sheet, row, col) : null
  }

  // What a cell displays as its source: the formula text, or the spill anchor
  // for cells filled by a spill (shown greyed in the formula bar, as in Excel).
  describe(sheetId, row, col) {
    const sheet = this.sheet(sheetId)
    const cell = sheet?.cells.get(cellKey(row, col))
    const owner = sheet?.spillOwner.get(cellKey(row, col))
    return { cell, spilledFrom: owner && owner !== cellKey(row, col) ? owner : null, value: sheet ? this.valueAt(sheet, row, col) : null }
  }

  // ── Writing ───────────────────────────────────────────────────────────
  // Change several cells as one step (one undo, one recalculation).
  // changes: [{ sheetId, row, col, input?, format?, style? }]
  setCells(changes, { record = true } = {}) {
    const inverse = []
    const touched = []
    for (const ch of changes) {
      const sheet = this.sheet(ch.sheetId)
      if (!sheet) continue
      const key = cellKey(ch.row, ch.col)
      const old = sheet.cells.get(key)
      const before = { sheetId: sheet.id, row: ch.row, col: ch.col }
      for (const field of ['input', 'format', 'style', 'code']) if (field in ch) before[field] = old?.[field] ?? (field === 'input' ? '' : undefined)
      // Typing over a code cell turns it back into an ordinary cell: undo restores the code.
      if ('input' in ch && !('code' in ch) && old?.code) before.code = old.code
      inverse.push(before)
      // Cells this formula used to spill into lose their values: their readers must update too.
      const oldSpill = 'input' in ch || 'code' in ch ? sheet.spills.get(key) : null
      this.writeCell(sheet, ch.row, ch.col, ch)
      touched.push({ sheet, row: ch.row, col: ch.col })
      if (oldSpill) for (let r = oldSpill.r1; r <= oldSpill.r2; r++) for (let c = oldSpill.c1; c <= oldSpill.c2; c++) touched.push({ sheet, row: r, col: c })
    }
    if (record) this.pushHistory({ type: 'cells', changes: inverse })
    this.recalc(touched)
    return inverse
  }

  setInput(sheetId, row, col, input) {
    return this.setCells([{ sheetId, row, col, input }])
  }

  writeCell(sheet, row, col, patch) {
    const key = cellKey(row, col)
    const gid = sheet.id + '!' + key
    const old = sheet.cells.get(key)
    const cell = { input: old?.input ?? '', format: old?.format, style: old?.style, kind: old?.kind ?? 'blank', value: old?.value ?? null, code: old?.code, output: old?.output, tree: old?.tree, runToken: old?.runToken ?? 0 }
    if ('format' in patch) cell.format = patch.format || undefined
    if ('style' in patch) cell.style = patch.style && Object.keys(patch.style).length ? patch.style : undefined
    if ('input' in patch) {
      const text = patch.input == null ? '' : String(patch.input)
      const parsed = parseInput(text)
      cell.input = text
      cell.kind = parsed.kind
      cell.tree = parsed.tree ?? null
      cell.parseError = parsed.parseError ?? null
      cell.value = parsed.value
      cell.code = undefined
      cell.output = undefined
      // Typing 12% or a date picks a matching format, unless one was set explicitly.
      if (parsed.format && !('format' in patch) && !old?.format) cell.format = parsed.format
      this.unindex(gid)
      this.clearSpill(sheet, key)
      if (cell.kind === 'formula' && cell.tree) this.index(gid, sheet, cell.tree)
    }
    if ('code' in patch && patch.code) {
      // A Python, JavaScript or MATLAB cell: { lang, source }.
      cell.code = { lang: patch.code.lang, source: String(patch.code.source ?? '') }
      cell.input = ''
      cell.kind = 'code'
      cell.tree = null
      cell.parseError = null
      cell.value = null
      cell.output = undefined
      this.unindex(gid)
      this.clearSpill(sheet, key)
      this.indexCode(gid, sheet, cell.code.source, cell.code.lang)
    } else if ('code' in patch && !('input' in patch) && old?.code) {
      cell.code = undefined
      cell.kind = 'blank'
      cell.value = null
      cell.output = undefined
      this.unindex(gid)
      this.clearSpill(sheet, key)
    }
    if (isEmptyCell(cell)) { sheet.cells.delete(key); sheet.byNum.delete(num(row, col)) }
    else { sheet.cells.set(key, cell); sheet.byNum.set(num(row, col), cell) }
  }

  // ── Dependency index ─────────────────────────────────────────────────
  resolveRef(ref, sheet) {
    const target = ref.sheet ? this.sheet(ref.sheet) : sheet
    if (!target) return null
    if (ref.type === 'cell' || ref.type === 'spill') return { sheetId: target.id, r1: ref.row, c1: ref.col, r2: ref.row, c2: ref.col, single: true }
    return { sheetId: target.id, r1: ref.r1, c1: ref.c1, r2: ref.r2, c2: ref.c2, single: false }
  }

  index(gid, sheet, tree) {
    const refs = (tree.refs ?? references(tree)).map((r) => this.resolveRef(r, sheet)).filter(Boolean)
    this.precedents.set(gid, refs)
    for (const r of refs) {
      if (!r.single) { this.indexRange(gid, r); continue }
      const target = r.sheetId + '!' + cellKey(r.r1, r.c1)
      if (!this.cellDeps.has(target)) this.cellDeps.set(target, new Set())
      this.cellDeps.get(target).add(gid)
    }
    let isVolatile = false
    if (!tree.refs) walk(tree, (n) => { if (n.type === 'call' && this.functions[n.name]?.volatile) isVolatile = true })
    if (isVolatile) this.volatile.add(gid)
  }

  // Ranges up to WIDE columns wide are filed under each column they cover;
  // wider ones (including whole rows) go in one list that is always checked.
  indexRange(gid, r) {
    const WIDE = 64
    if (!this.rangeIndex.has(r.sheetId)) this.rangeIndex.set(r.sheetId, { byCol: new Map(), wide: new Set() })
    const idx = this.rangeIndex.get(r.sheetId)
    const entry = { gid, r1: r.r1, c1: r.c1, r2: r.r2, c2: r.c2 }
    if (r.c2 - r.c1 >= WIDE) idx.wide.add(entry)
    else for (let c = r.c1; c <= r.c2; c++) {
      if (!idx.byCol.has(c)) idx.byCol.set(c, new Set())
      idx.byCol.get(c).add(entry)
    }
    if (!this.rangeEntries.has(gid)) this.rangeEntries.set(gid, [])
    this.rangeEntries.get(gid).push({ sheetId: r.sheetId, entry })
  }

  // A code cell depends on the cells its xl("…") calls read.
  indexCode(gid, sheet, source, lang) {
    const refs = []
    for (const text of codeReferences(source, lang)) {
      try {
        const node = parse(text)
        if (node.type === 'cell' || node.type === 'range') refs.push(node)
      } catch { /* not a reference: the run reports it */ }
    }
    this.index(gid, sheet, { type: 'group', arg: null, refs })
  }

  unindex(gid) {
    for (const r of this.precedents.get(gid) ?? []) {
      if (r.single) this.cellDeps.get(r.sheetId + '!' + cellKey(r.r1, r.c1))?.delete(gid)
    }
    for (const { sheetId, entry } of this.rangeEntries.get(gid) ?? []) {
      const idx = this.rangeIndex.get(sheetId)
      idx.wide.delete(entry)
      for (let c = entry.c1; c <= entry.c2 && entry.c2 - entry.c1 < 64; c++) idx.byCol.get(c)?.delete(entry)
    }
    this.rangeEntries.delete(gid)
    this.precedents.delete(gid)
    this.volatile.delete(gid)
  }

  rebuildIndex() {
    this.precedents.clear()
    this.cellDeps.clear()
    this.rangeIndex.clear()
    this.rangeEntries.clear()
    this.volatile.clear()
    for (const sheet of this.sheets) {
      for (const [key, cell] of sheet.cells) {
        if (cell.kind === 'formula' && cell.tree) this.index(sheet.id + '!' + key, sheet, cell.tree)
        else if (cell.kind === 'code') this.indexCode(sheet.id + '!' + key, sheet, cell.code.source, cell.code.lang)
      }
    }
  }

  // Where the formulas being recalculated are, filed by sheet and column, so
  // a range can find the ones inside it without checking every one.
  locate(dirty) {
    const bySheet = new Map() // sheetId → Map<col, [{ gid, row }]>
    const spilling = [] // anchors whose spill region may cover other columns
    for (const gid of dirty) {
      const [sid, key] = gid.split('!')
      const { row, col } = keyToPos(key)
      if (!bySheet.has(sid)) bySheet.set(sid, new Map())
      const cols = bySheet.get(sid)
      if (!cols.has(col)) cols.set(col, [])
      cols.get(col).push({ gid, row })
      const region = this.sheet(sid).spills.get(key)
      if (region) spilling.push({ gid, sid, region })
    }
    return { bySheet, spilling, dirty }
  }

  // The formulas that `gid` reads, as gids: formula cells inside its
  // precedents, and the anchors of spills it reads.
  formulaPrecedents(gid, where) {
    const out = new Set()
    for (const r of this.precedents.get(gid) ?? []) {
      const sheet = this.sheet(r.sheetId)
      if (!sheet) continue
      if (r.single) {
        const key = cellKey(r.r1, r.c1)
        if (where.dirty.has(sheet.id + '!' + key)) out.add(sheet.id + '!' + key)
        const owner = sheet.spillOwner.get(key)
        if (owner && where.dirty.has(sheet.id + '!' + owner)) out.add(sheet.id + '!' + owner)
        continue
      }
      for (const [col, list] of where.bySheet.get(sheet.id) ?? []) {
        if (col < r.c1 || col > r.c2) continue
        for (const { gid: g, row } of list) if (row >= r.r1 && row <= r.r2) out.add(g)
      }
      for (const { gid: g, sid, region } of where.spilling) {
        if (sid === sheet.id && region.r1 <= r.r2 && region.r2 >= r.r1 && region.c1 <= r.c2 && region.c2 >= r.c1) out.add(g)
      }
    }
    return [...out]
  }

  // ── Recalculation ─────────────────────────────────────────────────────
  recalcAll() {
    this.recalc([], { everything: true })
  }

  recalc(touched, { everything = false, exclude = null } = {}) {
    const started = performance.now()
    let evaluated = 0
    const cycles = []
    let positions = touched
    // A spill can grow onto cells that other formulas read, even ones already
    // recalculated, so repeat for the cells whose spill changed (bounded, in
    // case two spills keep pushing each other).
    for (let round = 0; round < 20 && (positions.length || (everything && round === 0)); round++) {
      const dirty = everything && round === 0 ? this.allFormulas() : this.collectDirty(positions, exclude)
      if (round === 0) for (const g of this.volatile) dirty.add(g)
      if (!dirty.size) break
      const before = new Map()
      for (const gid of dirty) {
        const [sid, key] = gid.split('!')
        before.set(gid, this.sheet(sid).spills.get(key))
      }
      for (const group of this.evaluationOrder(dirty)) {
        if (group.cycle) {
          cycles.push(group.gids)
          for (const gid of group.gids) this.setCycle(gid, group.gids)
          continue
        }
        this.evaluateFormula(group.gids[0])
        evaluated++
      }
      // Cells newly covered or uncovered by a spill: their readers may need recalculating.
      positions = []
      for (const gid of dirty) {
        const [sid, key] = gid.split('!')
        const sheet = this.sheet(sid)
        const now = sheet.spills.get(key)
        const was = before.get(gid)
        for (const region of [was, now]) {
          if (!region || (was && now && was.r1 === now.r1 && was.c1 === now.c1 && was.r2 === now.r2 && was.c2 === now.c2)) continue
          for (let r = region.r1; r <= region.r2; r++) for (let c = region.c1; c <= region.c2; c++) positions.push({ sheet, row: r, col: c })
        }
      }
    }
    this.lastRecalc = { evaluated, ms: performance.now() - started, cycles }
    this.notify()
  }

  allFormulas() {
    const out = new Set()
    for (const sheet of this.sheets) for (const [key, cell] of sheet.cells) if (isComputed(cell)) out.add(sheet.id + '!' + key)
    return out
  }

  // The formulas to recalculate when these positions changed: formulas at the
  // positions themselves, and everything that reads them, transitively. Works
  // level by level so a large paste is grouped by column (see readersOf).
  collectDirty(positions, exclude = null) {
    const dirty = new Set()
    let found = [...this.readersOf(positions)]
    for (const { sheet, row, col } of positions) if (isComputed(sheet.cells.get(cellKey(row, col)))) found.push(sheet.id + '!' + cellKey(row, col))
    while (found.length) {
      const covered = []
      for (const gid of found) {
        if (dirty.has(gid) || exclude?.has(gid)) continue
        const [sid, key] = gid.split('!')
        const sheet = this.sheet(sid)
        if (!isComputed(sheet?.cells.get(key))) continue
        dirty.add(gid)
        // Readers of this formula's cell, or of any cell it spills into.
        const p = keyToPos(key)
        const region = sheet.spills.get(key) ?? sheet.spillClaims.get(key) ?? { r1: p.row, c1: p.col, r2: p.row, c2: p.col }
        for (let r = region.r1; r <= region.r2; r++) for (let c = region.c1; c <= region.c2; c++) covered.push({ sheet, row: r, col: c })
      }
      found = [...this.readersOf(covered)]
    }
    return dirty
  }

  // Formulas that read any of these positions directly. Positions are grouped
  // by sheet and column, and each range is tested against that column's
  // changed rows with a binary search, so pasting thousands of cells under
  // thousands of range formulas is not thousands × thousands checks.
  readersOf(positions) {
    const out = new Set()
    const groups = new Map() // sheetId → Map<col, rows[]>
    for (const { sheet, row, col } of positions) {
      for (const g of this.cellDeps.get(sheet.id + '!' + cellKey(row, col)) ?? []) out.add(g)
      if (sheet.spillClaims.size) for (const [anchor, region] of sheet.spillClaims) if (rangeContains(region, row, col)) out.add(sheet.id + '!' + anchor)
      if (!groups.has(sheet.id)) groups.set(sheet.id, new Map())
      const cols = groups.get(sheet.id)
      if (!cols.has(col)) cols.set(col, [])
      cols.get(col).push(row)
    }
    for (const [sheetId, cols] of groups) {
      const idx = this.rangeIndex.get(sheetId)
      if (!idx) continue
      for (const [col, rows] of cols) {
        rows.sort((a, b) => a - b)
        const hits = (e) => {
          let lo = 0, hi = rows.length
          while (lo < hi) { const mid = (lo + hi) >> 1; if (rows[mid] < e.r1) lo = mid + 1; else hi = mid }
          return lo < rows.length && rows[lo] <= e.r2
        }
        for (const e of idx.byCol.get(col) ?? []) if (!out.has(e.gid) && hits(e)) out.add(e.gid)
        for (const e of idx.wide) if (col >= e.c1 && col <= e.c2 && !out.has(e.gid) && hits(e)) out.add(e.gid)
      }
    }
    return out
  }

  // Tarjan's algorithm (iterative, so long chains such as a running total down
  // 10,000 rows cannot overflow the call stack). It yields groups in an order
  // where every formula comes after the formulas it reads; a group of more
  // than one formula, or one that reads itself, is a circular reference.
  *evaluationOrder(dirty) {
    const indexOf = new Map(), low = new Map(), onStack = new Set()
    const stack = []
    let counter = 0
    const edges = new Map()
    const where = this.locate(dirty)
    const edgesOf = (g) => { if (!edges.has(g)) edges.set(g, this.formulaPrecedents(g, where)); return edges.get(g) }
    for (const start of dirty) {
      if (indexOf.has(start)) continue
      const work = [[start, 0]]
      indexOf.set(start, counter); low.set(start, counter); counter++
      stack.push(start); onStack.add(start)
      while (work.length) {
        const frame = work[work.length - 1]
        const [v, i] = frame
        const succ = edgesOf(v)
        if (i < succ.length) {
          frame[1]++
          const w = succ[i]
          if (!indexOf.has(w)) {
            indexOf.set(w, counter); low.set(w, counter); counter++
            stack.push(w); onStack.add(w)
            work.push([w, 0])
          } else if (onStack.has(w)) low.set(v, Math.min(low.get(v), indexOf.get(w)))
          continue
        }
        work.pop()
        if (work.length) { const parent = work[work.length - 1][0]; low.set(parent, Math.min(low.get(parent), low.get(v))) }
        if (low.get(v) === indexOf.get(v)) {
          const group = []
          let w
          do { w = stack.pop(); onStack.delete(w); group.push(w) } while (w !== v)
          const selfLoop = group.length === 1 && edgesOf(v).includes(v)
          yield { gids: group, cycle: group.length > 1 || selfLoop }
        }
      }
    }
  }

  setCycle(gid, group) {
    const [sid, key] = gid.split('!')
    const sheet = this.sheet(sid)
    const cell = sheet.cells.get(key)
    this.clearSpill(sheet, key)
    const names = group.map((g) => { const [s, k] = g.split('!'); return s === sid ? k : this.sheet(s).name + '!' + k })
    cell.value = err('#CYCLE!', names.length === 1 ? key + ' refers to itself.' : 'These cells depend on each other in a loop: ' + names.join(' → ') + '.')
  }

  evaluateFormula(gid) {
    const [sid, key] = gid.split('!')
    const sheet = this.sheet(sid)
    const cell = sheet.cells.get(key)
    if (cell?.kind === 'code') return this.startCode(gid, sheet, key, cell)
    if (!cell || cell.kind !== 'formula' || !cell.tree) return
    const { row, col } = keyToPos(key)
    const value = settle(evaluate(cell.tree, this.context(sheet, row, col)))
    cell.value = value
    this.placeSpill(sheet, key, row, col, value)
  }

  // ── Code cells ────────────────────────────────────────────────────────
  // Code runs in a worker, so its result arrives later: the cell shows #BUSY!
  // until then, and the cells that read it recalculate when it arrives.
  // `codeRunner({ lang, source, inputs })` resolves with
  //   { value } | { rows } | { error, detail }  plus { stdout, figures, ms }.
  startCode(gid, sheet, key, cell) {
    const { row, col } = keyToPos(key)
    const ctx = this.context(sheet, row, col)
    const inputs = {}
    for (const text of codeReferences(cell.code.source, cell.code.lang)) {
      let v
      try { v = evalNode(parse(text), ctx) } catch { v = err('#REF!', '"' + text + '" is not a cell or range.') }
      const rows = isMatrix(v) ? v.rows.map((r) => r.map(plainValue)) : [[plainValue(v)]]
      const bad = rows.flat().find((x) => x && typeof x === 'object' && 'error' in x)
      if (bad) {
        // As with formulas, an error in an input is passed on rather than run on.
        cell.value = err(bad.error, text + ' contains ' + bad.error + ', so this ' + (cell.code.lang === 'py' ? 'Python' : cell.code.lang === 'js' ? 'JavaScript' : 'MATLAB') + ' cell was not run.')
        cell.output = { skipped: true }
        this.clearSpill(sheet, key)
        return
      }
      inputs[text] = shapeForCode(rows)
    }
    this.clearSpill(sheet, key)
    if (!this.codeRunner) {
      cell.value = err('#CALC!', 'Code cells run in the Spreadsheet Lab.')
      return
    }
    const token = ++cell.runToken
    cell.value = err('#BUSY!')
    cell.output = { running: true }
    Promise.resolve()
      .then(() => this.codeRunner({ lang: cell.code.lang, source: cell.code.source, inputs }))
      .catch((e) => ({ error: '#CODE!', detail: String(e?.message ?? e) }))
      .then((result) => this.finishCode(sheet, key, token, result))
  }

  finishCode(sheet, key, token, result) {
    const cell = sheet.cells.get(key)
    // A newer run started, the code changed, or the sheet was deleted: drop this result.
    if (!cell || cell.kind !== 'code' || cell.runToken !== token || !this.sheets.includes(sheet)) return
    const { row, col } = keyToPos(key)
    let value
    // Workers send rows or a value; a value that is a list or table becomes rows too.
    const converted = result.error ? result : result.rows ? { rows: result.rows } : sheetValue(result.value)
    if (converted.error) value = err(converted.error, converted.detail ?? '')
    else if (converted.rows) value = settle(new Matrix(converted.rows.map((r) => r.map((x) => (x && typeof x === 'object' && 'error' in x ? err(x.error) : x)))))
    else value = converted.value ?? null
    cell.value = value
    cell.output = { stdout: result.stdout ?? '', figures: result.figures ?? [], traceback: result.traceback ?? '', ms: result.ms, error: result.error ? result.detail : null }
    const before = sheet.spills.get(key)
    this.placeSpill(sheet, key, row, col, value)
    const after = sheet.spills.get(key)
    const positions = [{ sheet, row, col }]
    for (const region of [before, after]) {
      if (region) for (let r = region.r1; r <= region.r2; r++) for (let c = region.c1; c <= region.c2; c++) positions.push({ sheet, row: r, col: c })
    }
    this.recalc(positions, { exclude: new Set([sheet.id + '!' + key]) })
  }

  // ── Spills ────────────────────────────────────────────────────────────
  clearSpill(sheet, key) {
    const region = sheet.spills.get(key)
    if (region) {
      for (let r = region.r1; r <= region.r2; r++) for (let c = region.c1; c <= region.c2; c++) {
        const k = cellKey(r, c)
        if (sheet.spillOwner.get(k) === key) { sheet.spillOwner.delete(k); sheet.ownerNum.delete(num(r, c)) }
      }
    }
    sheet.spills.delete(key)
    sheet.spillClaims.delete(key)
    const cell = sheet.cells.get(key)
    if (cell) cell.spillBlocked = false
  }

  placeSpill(sheet, key, row, col, value) {
    this.clearSpill(sheet, key)
    if (!isMatrix(value)) return
    const region = { r1: row, c1: col, r2: row + value.height - 1, c2: col + value.width - 1 }
    sheet.spillClaims.set(key, region)
    const cell = sheet.cells.get(key)
    for (let r = region.r1; r <= region.r2; r++) {
      for (let c = region.c1; c <= region.c2; c++) {
        if (r === row && c === col) continue
        const k = cellKey(r, c)
        const other = sheet.cells.get(k)
        const owner = sheet.spillOwner.get(k)
        if ((other && other.input !== '') || (owner && owner !== key)) { cell.spillBlocked = true; return }
      }
    }
    sheet.spills.set(key, region)
    for (let r = region.r1; r <= region.r2; r++) for (let c = region.c1; c <= region.c2; c++) { sheet.spillOwner.set(cellKey(r, c), key); sheet.ownerNum.set(num(r, c), key) }
  }

  // ── Evaluation context ───────────────────────────────────────────────
  context(sheet, row, col) {
    const wb = this
    const ctx = {
      sheet: sheet.name, row, col,
      functions: this.functions,
      names: this.names,
      random: this.random,
      getCell(name, r, c) {
        const s = name ? wb.sheet(name) : sheet
        if (!s) return err('#REF!', 'There is no sheet called "' + name + '".')
        return wb.valueAt(s, r, c)
      },
      getRange(name, r1, c1, r2, c2) {
        const s = name ? wb.sheet(name) : sheet
        if (!s) return err('#REF!', 'There is no sheet called "' + name + '".')
        if (r2 === Infinity || c2 === Infinity) {
          const b = s.bounds()
          if (r2 === Infinity) r2 = Math.max(r1, b.rows - 1)
          if (c2 === Infinity) c2 = Math.max(c1, b.cols - 1)
        }
        const rows = []
        for (let r = r1; r <= r2; r++) {
          const out = []
          for (let c = c1; c <= c2; c++) out.push(wb.valueAt(s, r, c))
          rows.push(out)
        }
        return new Matrix(rows, { sheet: s.name, r1, c1, r2, c2 })
      },
      getSpill(name, r, c) {
        const s = name ? wb.sheet(name) : sheet
        const cell = s?.cells.get(cellKey(r, c))
        if (!isComputed(cell)) return err('#REF!', cellKey(r, c) + '# refers to a cell that does not contain a formula.')
        if (isMatrix(cell.value) && cell.spillBlocked) return err('#SPILL!')
        return cell.value
      },
      resolveText(text) {
        try {
          const node = parse(text)
          if (!['cell', 'range'].includes(node.type)) return err('#REF!', '"' + text + '" is not a reference.')
          return evalNode(node, ctx)
        } catch {
          return err('#REF!', '"' + text + '" is not a reference.')
        }
      },
      isFormula(ref) {
        const s = ref.sheet ? wb.sheet(ref.sheet) : sheet
        return s?.cells.get(cellKey(ref.r1, ref.c1))?.kind === 'formula'
      },
    }
    return ctx
  }

  // Column widths and row heights (in pixels). Not undoable: they change
  // how the sheet looks, not what it calculates.
  setSize(sheetId, axis, index, size) {
    const sheet = this.sheet(sheetId)
    if (!sheet) return
    const map = axis === 'col' ? sheet.colWidths : sheet.rowHeights
    if (size == null) delete map[index]
    else map[index] = Math.max(axis === 'col' ? 24 : 16, Math.round(size))
    this.notify()
  }

  notify() {
    this.version++
    for (const fn of this.listeners) fn(this)
  }

  // ── Structure: rows, columns and sheets ──────────────────────────────
  // These change many cells at once, so their undo restores a snapshot.
  snapshot() {
    return this.sheets.map((s) => ({
      id: s.id, name: s.name, colWidths: { ...s.colWidths }, rowHeights: { ...s.rowHeights }, charts: s.charts.map((c) => ({ ...c })), filter: s.filter, rules: s.rules.map((r) => ({ ...r })), folds: s.folds.map((f) => ({ ...f })), dataset: s.dataset,
      cells: [...s.cells].map(([k, c]) => [k, { input: c.input, format: c.format, style: c.style, code: c.code }]),
    }))
  }

  restoreSnapshot(snap) {
    this.sheets = snap.map((d) => {
      const sheet = new Sheet(d.name)
      sheet.id = d.id
      sheet.colWidths = { ...d.colWidths }
      sheet.rowHeights = { ...d.rowHeights }
      sheet.charts = (d.charts ?? []).map((c) => ({ ...c }))
      sheet.filter = d.filter ?? null
      sheet.rules = (d.rules ?? []).map((r) => ({ ...r }))
      sheet.folds = (d.folds ?? []).map((f) => ({ ...f }))
      sheet.dataset = d.dataset ?? null
      return sheet
    })
    snap.forEach((d, i) => { for (const [k, c] of d.cells) { const p = keyToPos(k); this.writeCell(this.sheets[i], p.row, p.col, c) } })
    this.rebuildIndex()
    this.recalcAll()
  }

  structural(change) {
    const before = this.snapshot()
    change()
    this.pushHistory({ type: 'snapshot', snap: before })
    this.rebuildIndex()
    this.recalcAll()
  }

  // Rewrites every formula's text with fn(input, sheet) → new input.
  rewriteFormulas(fn) {
    for (const sheet of this.sheets) {
      for (const [key, cell] of [...sheet.cells]) {
        if (cell.kind !== 'formula') continue
        const next = fn(cell.input, sheet)
        if (next !== cell.input) { const p = keyToPos(key); this.writeCell(sheet, p.row, p.col, { input: next }) }
      }
    }
  }

  // Moves a sheet's cells along one axis: from `at`, by `count` (negative deletes).
  shiftCells(sheet, axis, at, count) {
    const entries = [...sheet.cells].map(([k, c]) => [keyToPos(k), { input: c.input, format: c.format, style: c.style, code: c.code }])
    for (const [k] of [...sheet.cells]) { const p = keyToPos(k); this.unindex(sheet.id + '!' + k); sheet.byNum.delete(num(p.row, p.col)) }
    sheet.cells.clear(); sheet.spills.clear(); sheet.spillClaims.clear(); sheet.spillOwner.clear(); sheet.ownerNum.clear()
    const sizes = axis === 'row' ? sheet.rowHeights : sheet.colWidths
    const movedSizes = {}
    for (const [i, size] of Object.entries(sizes)) {
      const n = Number(i)
      if (count < 0 && n >= at && n < at - count) continue
      movedSizes[n >= at ? n + count : n] = size
    }
    if (axis === 'row') sheet.rowHeights = movedSizes
    else sheet.colWidths = movedSizes
    for (const [p, c] of entries) {
      const v = axis === 'row' ? p.row : p.col
      if (count < 0 && v >= at && v < at - count) continue // deleted
      const moved = v >= at ? v + count : v
      this.writeCell(sheet, axis === 'row' ? moved : p.row, axis === 'row' ? p.col : moved, c)
    }
  }

  insertRows(sheetId, at, count = 1) { this.changeAxis(sheetId, 'row', at, count) }
  deleteRows(sheetId, at, count = 1) { this.changeAxis(sheetId, 'row', at, -count) }
  insertCols(sheetId, at, count = 1) { this.changeAxis(sheetId, 'col', at, count) }
  deleteCols(sheetId, at, count = 1) { this.changeAxis(sheetId, 'col', at, -count) }

  changeAxis(sheetId, axis, at, count) {
    const target = this.sheet(sheetId)
    if (!target) return
    const adjust = axis === 'row' ? adjustForRows : adjustForCols
    this.structural(() => {
      this.rewriteFormulas((input, sheet) => adjust(input, { formulaSheet: sheet.name, sheetName: target.name, at, count }))
      this.shiftCells(target, axis, at, count)
      // A chart's data range moves with its cells, as a formula's would.
      for (const chart of target.charts) chart.source = chart.source.split(',').map((part) => adjust('=' + part.trim(), { formulaSheet: target.name, sheetName: target.name, at, count }).slice(1)).join(',')
      if (target.filter) {
        const source = adjust('=' + target.filter.source, { formulaSheet: target.name, sheetName: target.name, at, count }).slice(1)
        // Columns inserted or deleted inside the filter shift which column each condition is on.
        const hidden = {}
        const was = parseRange(target.filter.source)
        for (const [offset, keys] of Object.entries(target.filter.hidden ?? {})) {
          let c = was.c1 + Number(offset)
          if (axis === 'col') { if (count < 0 && c >= at && c < at - count) continue; if (c >= at) c += count }
          const now = parseRange(source)
          if (now) hidden[c - now.c1] = keys
        }
        target.filter = source.includes('#REF!') ? null : { source, hidden }
      }
      target.rules = target.rules
        .map((r) => ({ ...r, source: adjust('=' + r.source, { formulaSheet: target.name, sheetName: target.name, at, count }).slice(1) }))
        .filter((r) => !r.source.includes('#REF!'))
      target.folds = target.folds
        .map((f) => ({ ...f, source: adjust('=' + f.source, { formulaSheet: target.name, sheetName: target.name, at, count }).slice(1) }))
        .filter((f) => !f.source.includes('#REF!'))
    })
  }

  // Returns an explanation if the name is not allowed, or null if it is fine.
  checkSheetName(name, exceptId = null) {
    const n = String(name ?? '').trim()
    if (!n) return 'A sheet needs a name.'
    if (n.length > 31) return 'Sheet names can be at most 31 characters (as in Excel).'
    if (/[[\]:*?/\\]/.test(n)) return 'Sheet names cannot contain [ ] : * ? / or \\.'
    if (this.sheets.some((s) => s.id !== exceptId && s.name.toLowerCase() === n.toLowerCase())) return 'There is already a sheet called "' + n + '".'
    return null
  }

  renameSheet(sheetId, name) {
    const sheet = this.sheet(sheetId)
    const problem = sheet ? this.checkSheetName(name, sheet.id) : 'No such sheet.'
    if (problem) return problem
    const oldName = sheet.name
    this.structural(() => {
      this.rewriteFormulas((input) => renameSheetRefs(input, oldName, name.trim()))
      sheet.name = name.trim()
    })
    return null
  }

  deleteSheet(sheetId) {
    if (this.sheets.length <= 1) return 'A workbook needs at least one sheet.'
    const sheet = this.sheet(sheetId)
    if (!sheet) return 'No such sheet.'
    this.structural(() => {
      this.sheets = this.sheets.filter((s) => s !== sheet)
      this.rewriteFormulas((input) => renameSheetRefs(input, sheet.name, null))
    })
    return null
  }

  // ── Charts ────────────────────────────────────────────────────────────
  // A formula's result without putting it in a cell (for previews), as a
  // cell would show it: errors explained, a lone function as #CALC!.
  previewFormula(sheet, text, row = 0, col = 0) {
    try { return settle(evaluate(parse(text.replace(/^=/, '')), this.context(sheet, row, col))) } catch (e) { return err('#NAME?', e.message) }
  }

  // The values in a range such as "A1:C10" on a sheet, row by row, or null if
  // the text is not a range (a chart whose rows were all deleted reads #REF!).
  rangeValues(sheet, text) {
    // Several ranges ("A1:A9,D1:D9", as when columns that are not side by side
    // are charted) are put side by side; they must be the same height.
    if (text.includes(',')) {
      const parts = text.split(',').map((t) => this.rangeValues(sheet, t.trim()))
      if (parts.some((p) => !p) || parts.some((p) => p.length !== parts[0].length)) return null
      return parts[0].map((_, r) => parts.flatMap((p) => p[r]))
    }
    let v
    try { v = evalNode(parse(text), this.context(sheet, 0, 0)) } catch { return null }
    if (isMatrix(v)) return v.rows
    return isError(v) ? null : [[v]]
  }

  // Every change replaces the sheet's list of charts, so undo puts the old
  // list back.
  setCharts(sheetId, next, { record = true } = {}) {
    const sheet = this.sheet(sheetId)
    if (!sheet) return
    if (record) this.pushHistory({ type: 'charts', sheetId, charts: sheet.charts })
    sheet.charts = next
    this.notify()
  }

  addChart(sheetId, chart) {
    const id = 'chart' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    this.setCharts(sheetId, [...(this.sheet(sheetId)?.charts ?? []), { ...chart, id }])
    return id
  }

  updateChart(sheetId, id, patch) {
    const sheet = this.sheet(sheetId)
    if (!sheet?.charts.some((c) => c.id === id)) return
    this.setCharts(sheetId, sheet.charts.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  removeChart(sheetId, id) {
    const sheet = this.sheet(sheetId)
    if (sheet) this.setCharts(sheetId, sheet.charts.filter((c) => c.id !== id))
  }

  // ── Filter ────────────────────────────────────────────────────────────
  setFilter(sheetId, filter, { record = true } = {}) {
    const sheet = this.sheet(sheetId)
    if (!sheet) return
    if (record) this.pushHistory({ type: 'filter', sheetId, filter: sheet.filter })
    sheet.filter = filter
    this.notify()
  }

  // ── Conditional formatting ───────────────────────────────────────────
  setRules(sheetId, rules, { record = true } = {}) {
    const sheet = this.sheet(sheetId)
    if (!sheet) return
    if (record) this.pushHistory({ type: 'rules', sheetId, rules: sheet.rules })
    sheet.rules = rules
    this.notify()
  }

  // ── Folded tables ─────────────────────────────────────────────────────
  setFolds(sheetId, folds, { record = true } = {}) {
    const sheet = this.sheet(sheetId)
    if (!sheet) return
    if (record) this.pushHistory({ type: 'folds', sheetId, folds: sheet.folds })
    sheet.folds = folds
    this.notify()
  }

  // ── Undo / redo ───────────────────────────────────────────────────────
  pushHistory(entry) {
    this.undoStack.push(entry)
    if (this.undoStack.length > 500) this.undoStack.shift()
    this.redoStack = []
  }

  undo() { return this.replay(this.undoStack, this.redoStack) }
  redo() { return this.replay(this.redoStack, this.undoStack) }

  replay(from, to) {
    const entry = from.pop()
    if (!entry) return false
    if (entry.type === 'cells') {
      const inverse = this.setCells(entry.changes, { record: false })
      to.push({ type: 'cells', changes: inverse })
    } else if (entry.type === 'snapshot') {
      const now = this.snapshot()
      this.restoreSnapshot(entry.snap)
      to.push({ type: 'snapshot', snap: now })
    } else if (entry.type === 'charts') {
      const sheet = this.sheet(entry.sheetId)
      if (sheet) { to.push({ type: 'charts', sheetId: sheet.id, charts: sheet.charts }); this.setCharts(sheet.id, entry.charts, { record: false }) }
    } else if (entry.type === 'filter') {
      const sheet = this.sheet(entry.sheetId)
      if (sheet) { to.push({ type: 'filter', sheetId: sheet.id, filter: sheet.filter }); this.setFilter(sheet.id, entry.filter, { record: false }) }
    } else if (entry.type === 'rules') {
      const sheet = this.sheet(entry.sheetId)
      if (sheet) { to.push({ type: 'rules', sheetId: sheet.id, rules: sheet.rules }); this.setRules(sheet.id, entry.rules, { record: false }) }
    } else if (entry.type === 'folds') {
      const sheet = this.sheet(entry.sheetId)
      if (sheet) { to.push({ type: 'folds', sheetId: sheet.id, folds: sheet.folds }); this.setFolds(sheet.id, entry.folds, { record: false }) }
    } else if (entry.type === 'addSheet') {
      const index = this.sheets.findIndex((s) => s.id === entry.sheetId)
      const [sheet] = this.sheets.splice(index, 1)
      to.push({ type: 'restoreSheet', sheet, index })
      this.rebuildIndex()
      this.recalcAll()
    } else if (entry.type === 'restoreSheet') {
      this.sheets.splice(entry.index, 0, entry.sheet)
      to.push({ type: 'addSheet', sheetId: entry.sheet.id })
      this.rebuildIndex()
      this.recalcAll()
    }
    return true
  }

  // ── Subscriptions and saving ─────────────────────────────────────────
  subscribe(fn) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  toJSON() {
    return {
      version: 1,
      sheets: this.sheets.map((s) => ({
        name: s.name,
        colWidths: s.colWidths,
        rowHeights: s.rowHeights,
        ...(s.charts.length ? { charts: s.charts } : {}),
        ...(s.filter ? { filter: s.filter } : {}),
        ...(s.rules.length ? { rules: s.rules } : {}),
        ...(s.folds.length ? { folds: s.folds } : {}),
        ...(s.dataset ? { dataset: s.dataset } : {}),
        cells: Object.fromEntries([...s.cells].map(([k, c]) => [k, Object.fromEntries(Object.entries({ input: c.input || undefined, format: c.format, style: c.style, code: c.code }).filter(([, v]) => v !== undefined))])),
      })),
    }
  }

  static fromJSON(data) {
    const wb = new Workbook({ empty: true })
    for (const s of data?.sheets ?? []) {
      const sheet = new Sheet(s.name)
      sheet.colWidths = { ...s.colWidths }
      sheet.rowHeights = { ...s.rowHeights }
      sheet.charts = Array.isArray(s.charts) ? s.charts.map((c) => ({ ...c })) : []
      sheet.filter = s.filter?.source ? { source: s.filter.source, hidden: s.filter.hidden ?? {} } : null
      sheet.rules = Array.isArray(s.rules) ? s.rules.filter((r) => r?.source && r.kind).map((r) => ({ ...r })) : []
      sheet.folds = Array.isArray(s.folds) ? s.folds.filter((f) => f?.source && f.state).map((f) => ({ ...f })) : []
      sheet.dataset = typeof s.dataset === 'string' ? s.dataset : null
      wb.sheets.push(sheet)
    }
    if (!wb.sheets.length) wb.sheets.push(new Sheet('Sheet1'))
    data?.sheets?.forEach((s, i) => {
      for (const [key, c] of Object.entries(s.cells ?? {})) {
        const p = keyToPos(key)
        if (p) wb.writeCell(wb.sheets[i], p.row, p.col, { input: c.input ?? '', format: c.format, style: c.style, ...(c.code ? { code: c.code } : {}) })
      }
    })
    wb.rebuildIndex()
    wb.recalcAll()
    return wb
  }
}
