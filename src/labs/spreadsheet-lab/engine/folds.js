// Folding a table: a block of rows (a heading row and the data under it) that
// can be shown whole, cut down to its first few rows, or closed to its heading.
// Clicking the fold button on the heading row goes open → peek → closed → open.
// Folded rows are still there: formulas still read them, and copying the
// heading row of a folded table copies every row of it.
//
// A fold is { id, source: 'A1:G403', state: 'open' | 'peek' | 'closed' }.
import { formatRange, parseRange } from './address.js'

export const PEEK_ROWS = 5
export const FOLD_STATES = ['open', 'peek', 'closed']
export const nextFoldState = (state) => FOLD_STATES[(FOLD_STATES.indexOf(state) + 1) % FOLD_STATES.length]

export const makeFold = (rg, state = 'peek') => ({ id: 'fold' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), source: formatRange(rg), state })

// The first and last row a fold hides, or null when it hides none.
export function foldedSpan(fold) {
  const rg = parseRange(fold.source)
  if (!rg || fold.state === 'open') return null
  const from = rg.r1 + 1 + (fold.state === 'peek' ? PEEK_ROWS : 0)
  return from <= rg.r2 ? { from, to: rg.r2 } : null
}

export function foldHiddenRows(folds) {
  const hidden = new Set()
  for (const f of folds) {
    const span = foldedSpan(f)
    if (span) for (let r = span.from; r <= span.to; r++) hidden.add(r)
  }
  return hidden
}

// The fold whose heading is on this row.
export const foldAt = (folds, row) => folds.find((f) => parseRange(f.source)?.r1 === row) ?? null

// A new fold replaces any fold it overlaps: tables don't nest.
export function addFold(folds, fold) {
  const rg = parseRange(fold.source)
  const overlaps = (f) => { const o = parseRange(f.source); return o && o.r1 <= rg.r2 && rg.r1 <= o.r2 && o.c1 <= rg.c2 && rg.c1 <= o.c2 }
  return [...folds.filter((f) => !overlaps(f)), fold]
}

// Copying rows that include a folded table's heading takes the whole table,
// hidden rows too: the folded table stands for all its data.
export function expandForFolds(rg, folds) {
  let r2 = rg.r2
  for (const f of folds) {
    if (f.state === 'open') continue
    const t = parseRange(f.source)
    if (t && t.r1 >= rg.r1 && t.r1 <= rg.r2) r2 = Math.max(r2, t.r2)
  }
  return { ...rg, r2 }
}
