// The programs the Real Python tab can run: an entry function in python/, its JSON arguments, the
// variables it is about (focus: always shown first, in this order), and a "jump" that runs to the
// next interesting line. view: how the middle panel draws the paused program ('csv', 'bars', 'watch').
import { SOURCES } from './source.js'
import { HEADER, makeOrders } from './engine/data.js'
import { readCsv, withNumbers } from './engine/tables.js'
import { ORDERS_CSV } from './engine/data.js'

export const lineOf = (file, text) => SOURCES[file].split('\n').findIndex(l => l.includes(text)) + 1

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
export const SAMPLE_ORDERS = () => makeOrders().slice(0, 5)
