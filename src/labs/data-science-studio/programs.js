// The programs the Real Python tab can run: an entry function in python/, its JSON arguments, the
// variables it is about (focus: always shown first, in this order), and a "jump" that runs to the
// next interesting line. view: how the middle panel draws the paused program ('csv', 'bars', 'watch').
import { SOURCES, parse } from './source.js'
import { HEADER, makeOrders } from './engine/data.js'
import { readCsv, withNumbers } from './engine/tables.js'
import { ORDERS_CSV, CATALOGUE_CSV } from './engine/data.js'

export const lineOf = (file, text) => SOURCES[file].split('\n').findIndex(l => l.includes(text)) + 1
// The first line holding `text` inside one function: for a line that other functions share.
export function lineIn(file, fn, text) {
  const { start, end } = parse(file).functions.find(f => f.name === fn)
  return SOURCES[file].split('\n').findIndex((l, k) => k + 1 >= start && k + 1 <= end && l.includes(text)) + 1
}

let cached = null
const priced = () => (cached ??= withNumbers(readCsv(ORDERS_CSV()), ['price', 'quantity']).filter(r => r.price !== null))
const firstN = (v, fallback, max) => Math.max(1, Math.min(max, Number.parseInt(v, 10) || fallback))
const numbers = v => v.split(/[\s,]+/).map(Number).filter(Number.isFinite)

export const PROGRAMS = {
  split_csv_line: {
    label: 'Reading a CSV line (1.2)', file: 'tables.py', module: 'tables', function: 'split_csv_line', view: 'csv',
    about: 'Lesson 1.2: one line of a CSV file, read one character at a time. Watch `in_quotes` switch on and off, and `field` grow until a comma outside quotes ends it.',
    input: { name: 'line', label: 'Line', value: 'A1004,2025-05-11,Harrogate,"Lights, front and back",25.00,1,shop' },
    kwargs: v => ({ line: v }),
    focus: ['ch', 'i', 'in_quotes', 'field', 'fields'],
    jump: { label: 'Next field', targets: () => [['tables.py', lineOf('tables.py', '            fields.append(field)')]] },
  },
  mean_of: {
    label: 'The mean with missing values (1.4)', file: 'tables.py', module: 'tables', function: 'mean_of', view: 'watch',
    about: 'Lesson 1.4: the mean of a column with empty prices. The blanks (None) are left out, and counted.',
    input: { name: 'values', label: 'Values (blank = missing)', value: '49.05, 409.50, , 30.60, 25.00, , 36.80' },
    kwargs: v => ({ values: v.split(',').map(x => (x.trim() === '' ? null : Number(x))) }),
    focus: ['present', 'values'],
    watch: { present: ['present'] },
    jump: { label: 'To the division', targets: () => [['tables.py', lineOf('tables.py', '    return sum(present) / len(present)')]] },
  },
  sort_by: {
    label: 'Insertion sort (1.6)', file: 'tables.py', module: 'tables', function: 'sort_by', view: 'bars',
    about: 'Lesson 1.6: insertion sort on the first prices of the shop’s orders. Each row walks left past every larger value, then is put in.',
    input: { name: 'n', label: 'How many orders', value: '12' },
    kwargs: v => ({ rows: priced().slice(0, firstN(v, 12, 40)), name: 'price' }),
    bars: { list: 'out', key: 'price', index: 'i' },
    focus: ['row', 'i', 'out'],
    jump: { label: 'Next row placed', targets: () => [['tables.py', lineOf('tables.py', '        out.insert(i, row)')]] },
  },
  merge_sort: {
    label: 'Merge sort (1.6)', file: 'tables.py', module: 'tables', function: 'merge_sort', view: 'bars',
    about: 'Lesson 1.6: merge sort splits the list in half until each part has one row, then merges the parts back in order. Watch `out` fill up in each merge.',
    input: { name: 'n', label: 'How many orders', value: '8' },
    kwargs: v => ({ rows: priced().slice(0, firstN(v, 8, 32)), name: 'price' }),
    bars: { list: 'out', key: 'price', index: null },
    focus: ['left', 'right', 'i', 'j', 'out'],
    jump: { label: 'Next merge', targets: () => [['tables.py', lineOf('tables.py', '    return out + left[i:] + right[j:]')]] },
  },
  quickselect: {
    label: 'Quickselect (2.3)', file: 'summary.py', module: 'summary', function: 'quickselect', view: 'bars',
    about: 'Lesson 2.3: the k-th smallest value without sorting. Each round splits around the middle item and keeps only the part that holds position k.',
    input: { name: 'values', label: 'Values, then k is the middle', value: '49.05 409.5 30.6 25 36.8 6.37 25 41.2 45.5 7.14 28.05' },
    kwargs: v => { const values = numbers(v); return { values: values.length ? values : [1], k: Math.floor(Math.max(1, values.length) / 2) } },
    bars: { list: 'items', key: null, index: null },
    focus: ['k', 'pivot', 'smaller', 'equal', 'items'],
    jump: { label: 'Next round', targets: () => [['summary.py', lineOf('summary.py', '        pivot = items[len(items) // 2]')]] },
  },
  welford: {
    label: 'Welford’s one-pass variance (2.5)', file: 'summary.py', module: 'summary', function: 'welford', view: 'watch',
    about: 'Lesson 2.5: the mean and variance in one pass. Each value moves the mean by delta / n, and adds delta × (x − new mean) to m2.',
    input: { name: 'values', label: 'Values', value: '1000000004 1000000007 1000000013 1000000016' },
    kwargs: v => ({ values: numbers(v).length > 1 ? numbers(v) : [1, 2] }),
    focus: ['x', 'n', 'delta', 'm', 'm2'],
    watch: { m: ['m'], m2: ['m2'] },
    jump: { label: 'Next value', targets: () => [['summary.py', lineOf('summary.py', '        m2 += delta * (x - m)')]] },
  },
  group_by: {
    label: 'Group-by (2.7)', file: 'summary.py', module: 'summary', function: 'group_by', view: 'watch',
    about: 'Lesson 2.7: split the orders into groups by one column, in one pass. Each row goes into the list for its value, which the dictionary finds straight away.',
    input: { name: 'key', label: 'Group by (town, item or channel)', value: 'item' },
    kwargs: v => ({ rows: priced().slice(0, 20), key: HEADER.includes(v.trim()) ? v.trim() : 'item' }),
    focus: ['row', 'groups'],
    watch: { groups: ['{k: len(v) for k, v in groups.items()}'] },
    jump: { label: 'Next row', targets: () => [['summary.py', lineOf('summary.py', '        groups[row[key]].append(row)')]] },
  },
}
// Part 3
const orderRows = () => readCsv(ORDERS_CSV())
const catalogueRows = () => readCsv(CATALOGUE_CSV())
PROGRAMS.dedupe = {
  label: 'Removing duplicates (3.3)', file: 'cleaning.py', module: 'cleaning', function: 'dedupe', view: 'watch',
  about: 'Lesson 3.3: one pass over the orders with a set of the keys seen so far. A key already in the set is a repeat.',
  input: { name: 'n', label: 'The orders from row 12 to', value: '22' },
  // A few orders around A1018 (row 17), then its copy, the last row but one.
  kwargs: v => { const rows = orderRows(); return { rows: [...rows.slice(12, firstN(v, 22, 60)), rows[400]], key: 'order_id' } },
  focus: ['row', 'k', 'seen', 'repeated', 'kept'],
  watch: { seen: ['sorted(seen)'], repeated: ['repeated'] },
  jump: { label: 'Next row', targets: () => [['cleaning.py', lineOf('cleaning.py', '        k = row[key]')]] },
}
PROGRAMS.edit_distance = {
  label: 'Edit distance (3.4)', file: 'cleaning.py', module: 'cleaning', function: 'edit_distance', view: 'table',
  about: 'Lesson 3.4: the table of edit distances, filled row by row. Each cell is the cheapest of the cell above + 1, the cell to the left + 1, and the diagonal + 0 or 1.',
  input: { name: 'pair', label: 'Two words, separated by a comma', value: 'Lck, Lock' },
  kwargs: v => { const [a = '', b = ''] = v.split(','); return { a: a.trim().slice(0, 20), b: b.trim().slice(0, 20) } },
  table: { grid: 'table', i: 'i', j: 'j', rows: 'a', cols: 'b' },
  focus: ['i', 'j', 'change', 'a', 'b'],
  jump: { label: 'Next cell', targets: () => [['cleaning.py', lineOf('cleaning.py', '            change = 0 if a[i - 1] == b[j - 1] else 1')]] },
}
PROGRAMS.hash_join = {
  label: 'A hash join (3.7)', file: 'joins.py', module: 'joins', function: 'hash_join', view: 'watch',
  about: 'Lesson 3.7: first every catalogue row is filed in a dictionary under its item (build), then each order looks its item up there (probe).',
  input: { name: 'n', label: 'How many orders', value: '8' },
  kwargs: v => ({ left: orderRows().slice(0, firstN(v, 8, 40)).map(({ order_id, item }) => ({ order_id, item })), right: catalogueRows(), key: 'item' }),
  focus: ['a', 'b', 'index', 'out'],
  watch: { index: ['{k: len(v) for k, v in index.items()}'], out: ['[(r["order_id"], r["category"]) for r in out]'] },
  jump: { label: 'Next match', targets: () => [['joins.py', lineIn('joins.py', 'hash_join', 'out.append({**a, **b})')]] },
}
PROGRAMS.nice_ticks = {
  label: 'Choosing the ticks (4.3)', file: 'charts.py', module: 'charts', function: 'nice_ticks', view: 'watch',
  about: 'Lesson 4.3: the step D3 chooses (1, 2 or 5 × a power of ten, the nearest on a log scale), then the ticks counted as whole numbers of steps.',
  input: { name: 'range', label: 'From, to, about how many ticks', value: '0, 114, 5' },
  kwargs: v => { const [lo = 0, hi = 114, count = 5] = numbers(v); return { lo, hi: hi > lo ? hi : lo + 1, count: Math.max(1, Math.min(20, Math.round(count) || 5)) } },
  focus: ['power', 'factor', 'step', 'per_unit', 'first', 'last'],
  watch: { step: ['(10 ** power) * factor'] },
  jump: { label: 'Next decision', targets: () => [['charts.py', lineIn('charts.py', 'step_size', 'error = raw / 10 ** power')], ['charts.py', lineIn('charts.py', 'nice_ticks', 'power, factor = step_size(lo, hi, count)')]] },
}

export const SAMPLE_ORDERS = () => makeOrders().slice(0, 5)
