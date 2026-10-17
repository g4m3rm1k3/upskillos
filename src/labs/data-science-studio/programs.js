// The programs the Real Python tab can run: an entry function in python/, its JSON arguments, the
// variables it is about (focus: always shown first, in this order), and a "jump" that runs to the
// next interesting line. view: how the middle panel draws the paused program ('csv', 'bars', 'watch').
import { SOURCES, parse } from './source.js'
import { HEADER, makeOrders } from './engine/data.js'
import { readCsv, withNumbers, toPence } from './engine/tables.js'
import { cleanOrders } from './engine/cleaning.js'
import { ORDERS_CSV, CATALOGUE_CSV, DAYS_CSV } from './engine/data.js'
import { normalEquations, weekday, standardise } from './engine/models.js'

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

// Parts 5 and 6
PROGRAMS.rank = {
  label: 'Ranking with ties (5.3)', file: 'patterns.py', module: 'patterns', function: 'rank', view: 'watch',
  about: 'Lesson 5.3: sort the positions by value, then walk along them. Each run of equal values, from i to j, shares the mean of its places, (i + j) / 2 + 1.',
  input: { name: 'values', label: 'Values', value: '3 0 0 2.5 0 7 2.5 1' },
  kwargs: v => ({ values: numbers(v).slice(0, 30).length ? numbers(v).slice(0, 30) : [1] }),
  focus: ['i', 'j', 'shared', 'order', 'ranks'],
  watch: { ranks: ['ranks'] },
  jump: { label: 'Next run of ties', targets: () => [['patterns.py', lineOf('patterns.py', '        shared = (i + j) / 2 + 1')]] },
}
// The clean lights' prices (lesson 3.10): the raw ones hold the two typed in pence.
const lightsPrices = () => cleanOrders(readCsv(ORDERS_CSV()), Object.fromEntries(catalogueRows().map(r => [r.item, toPence(r.list_price)])))
  .filter(r => r.item === 'Lights, front and back' && r.price !== null).map(r => r.price / 100)
PROGRAMS.bootstrap = {
  label: 'The bootstrap (6.7)', file: 'samples.py', module: 'samples', function: 'bootstrap', view: 'watch',
  about: 'Lesson 6.7: resample the lights’ prices with replacement, as many as there are, and keep the median of each resample. `out` collects the medians.',
  input: { name: 'repeats', label: 'How many resamples', value: '8' },
  kwargs: v => ({ values: lightsPrices(), stat: 'median', repeats: firstN(v, 8, 50), seed: 41 }),
  focus: ['out', 'summary', 'stat', 'repeats'],
  watch: { out: ['out'] },
  jump: { label: 'Next resample', targets: () => [['samples.py', lineOf('samples.py', '        out.append(summary([values[rng.below(len(values))]')]] },
}
PROGRAMS.reservoir = {
  label: 'Reservoir sampling (6.8)', file: 'samples.py', module: 'samples', function: 'reservoir', view: 'watch',
  about: 'Lesson 6.8: a stream of items read once into a reservoir of 5. After the first 5, item i is kept with chance 5/i, in the place of a random kept item.',
  input: { name: 'n', label: 'How many items in the stream', value: '20' },
  kwargs: v => ({ stream: Array.from({ length: firstN(v, 20, 200) }, (_, i) => i + 1), k: 5, seed: 61 }),
  focus: ['i', 'item', 'j', 'kept'],
  watch: { kept: ['kept'] },
  jump: { label: 'Next item after the first 5', targets: () => [['samples.py', lineOf('samples.py', '            j = rng.below(i)')]] },
}

// The lights' prices by channel (lesson 7.1), and a hundred tests' p-values (lesson 7.8).
const lightsBy = channel => cleanOrders(readCsv(ORDERS_CSV()), Object.fromEntries(catalogueRows().map(r => [r.item, toPence(r.list_price)])))
  .filter(r => r.item === 'Lights, front and back' && r.price !== null && r.channel === channel).map(r => r.price / 100)
PROGRAMS.permutation_diffs = {
  label: 'The permutation test (7.1)', file: 'significance.py', module: 'significance', function: 'permutation_diffs', view: 'watch',
  about: 'Lesson 7.1: pool the lights’ web and shop prices, shuffle the first 52 places, and take “web” minus “shop” again. `out` collects the differences the null hypothesis would give.',
  input: { name: 'repeats', label: 'How many shuffles', value: '5' },
  kwargs: v => ({ a: lightsBy('web'), b: lightsBy('shop'), repeats: firstN(v, 5, 40), seed: 3 }),
  focus: ['i', 'j', 'out', 'k'],
  watch: { out: ['[round(d, 4) for d in out]'] },
  jump: { label: 'Next shuffle', targets: () => [['significance.py', lineOf('significance.py', '        out.append(mean(pooled[:k]) - mean(pooled[k:]))')]] },
}
PROGRAMS.benjamini_hochberg = {
  label: 'Benjamini–Hochberg (7.8)', file: 'significance.py', module: 'significance', function: 'benjamini_hochberg', view: 'watch',
  about: 'Lesson 7.8: the p-values in order, each against its rising bar q × rank / m. `cutoff` is the last rank under its bar; everything up to it is a discovery.',
  input: { name: 'pvalues', label: 'p-values', value: '0.001 0.008 0.039 0.041 0.042 0.06 0.074 0.205' },
  kwargs: v => ({ pvalues: numbers(v).length ? numbers(v).slice(0, 40) : [0.5], q: 0.05 }),
  focus: ['rank', 'i', 'cutoff', 'order', 'found'],
  watch: { bar: ['q * rank / m'] },
  jump: { label: 'Next rank', targets: () => [['significance.py', lineOf('significance.py', '        if pvalues[i] <= q * rank / m:')]] },
}

// The days as rows of numbers (lessons 8.3 and 8.6): the normal equations of riders on temperature,
// rain and the weekend, and the first days in standard units for gradient descent.
const daysDesign = () => readCsv(DAYS_CSV()).map(r => [1, Number(r.high_c), Number(r.rain_mm), weekday(r.date) >= 5 ? 1 : 0])
const dayRiders = () => readCsv(DAYS_CSV()).map(r => Number(r.riders))
PROGRAMS.solve = {
  label: 'Gaussian elimination (8.3)', file: 'models.py', module: 'models', function: 'solve', view: 'watch',
  about: 'Lesson 8.3: the normal equations of riders on temperature, rain and the weekend. Each column: the pivot row swapped up, then a multiple of it taken from each row below. Then back substitution, from the last row up.',
  input: { name: 'days', label: 'How many days to fit on', value: '365' },
  kwargs: v => { const n = firstN(v, 365, 365); const [A, b] = normalEquations(daysDesign().slice(0, n), dayRiders().slice(0, n)); return { A, b } },
  focus: ['c', 'p', 'r', 'f', 'i', 'w'],
  watch: { M: ['[[round(v, 2) for v in row] for row in M]'] },
  jump: { label: 'Next row eliminated', targets: () => [['models.py', lineOf('models.py', '            f = M[r][c] / M[c][c]')], ['models.py', lineOf('models.py', '        w[i] = s / M[i][i]')]] },
}
PROGRAMS.gradient_descent = {
  label: 'Gradient descent (8.6)', file: 'models.py', module: 'models', function: 'gradient_descent', view: 'watch',
  about: 'Lesson 8.6: riders on temperature in standard units, by walking downhill. Each step: the misses, the gradient, and a step of the rate against it. Watch `w` approach the least-squares answer.',
  input: { name: 'rate', label: 'Learning rate', value: '0.5' },
  kwargs: v => { const rate = Math.min(2, Math.max(0.001, Number.parseFloat(v) || 0.5)); const z = standardise(daysDesign().map(r => r[1]))[0]; return { X: z.slice(0, 60).map(x => [1, x]), y: dayRiders().slice(0, 60), rate, steps: 20 } },
  focus: ['w', 'grad'],
  watch: { w: ['[round(v, 3) for v in w]'] },
  jump: { label: 'Next step', targets: () => [['models.py', lineOf('models.py', '        w = [w[j] - rate * grad[j] for j in range(k)]')]] },
}

export const SAMPLE_ORDERS = () => makeOrders().slice(0, 5)
