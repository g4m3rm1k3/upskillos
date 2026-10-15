// The page's engine against the real Python (python/data.py, tables.py, summary.py): the same
// CSV text byte for byte, the same parsing, and the same statistics to within 1e-9.
// Regenerate parity.json with: python src/labs/data-science-studio/tools/make_parity.py
import { describe, expect, it } from 'vitest'
import parity from './parity.json'
import * as D from './data.js'
import * as T from './tables.js'
import * as S from './summary.js'

function close(got, want, where = '') {
  if (typeof want === 'number') {
    expect(typeof got, where).toBe('number')
    return expect(Math.abs(got - want), `${where}: ${got} vs ${want}`).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(want)))
  }
  if (Array.isArray(want)) { expect(got.length, where).toBe(want.length); want.forEach((w, k) => close(got[k], w, `${where}[${k}]`)); return }
  if (want && typeof want === 'object') { expect(Object.keys(got).sort(), where).toEqual(Object.keys(want).sort()); for (const k of Object.keys(want)) close(got[k], want[k], `${where}.${k}`); return }
  expect(got, where).toEqual(want)
}

const p1 = parity.part1, p2 = parity.part2
const rows = T.readCsv(D.ORDERS_CSV())
const numbered = T.withNumbers(rows, ['price', 'quantity'])
const priced = numbered.filter(r => r.price !== null)

describe('Part 1 gives the same answers as the Python', () => {
  it('the shop’s orders: the same CSV text, byte for byte, read back into the same rows', () => {
    expect(D.ORDERS_CSV()).toBe(p1.csv)
    expect(rows.slice(0, 5)).toEqual(p1.rows_head)
    expect(rows.length).toBe(402)
  })
  it('counting, CSV lines (quotes, doubled quotes, empty fields), pence and numbers', () => {
    expect(T.countValues(T.column(rows, 'item'))).toEqual(p1.count_items)
    expect(Object.keys(T.countValues(T.column(rows, 'town')))).toEqual(Object.keys(p1.count_towns))
    for (const [line, fields] of Object.entries(p1.split)) expect(T.splitCsvLine(line), JSON.stringify(line)).toEqual(fields)
    for (const [text, pence] of Object.entries(p1.to_pence)) expect(T.toPence(text), text).toBe(pence)
    for (const [text, n] of Object.entries(p1.to_number)) expect(T.toNumber(text), text).toBe(n)
    close(T.meanOf(T.column(numbered, 'price')), p1.mean_price, 'mean_of')
  })
  it('filtering and sorting, including sorting prices as text, and both sorts stable', () => {
    expect(T.whereAll(rows, { town: 'Leeds', channel: 'web' }).map(r => r.order_id)).toEqual(p1.leeds_web)
    expect(T.rowsWhere(rows, 'item', 'Bike').map(r => r.order_id)).toEqual(p1.bikes)
    const small = [3, 1, 2, 1, 3, 2, 1].map((k, n) => ({ k, n }))
    expect(T.sortBy(small, 'k')).toEqual(p1.sort_small)
    expect(T.mergeSort(small, 'k')).toEqual(p1.merge_small)
    expect(T.sortBy(rows.slice(0, 12), 'price').map(r => r.price)).toEqual(p1.sort_prices_text)
    expect(T.mergeSort(priced.slice(0, 40), 'price').map(r => r.order_id)).toEqual(p1.sort_prices)
  })
})

describe('Part 2 gives the same answers as the Python', () => {
  const prices = priced.map(r => r.price)
  it('the mean, running mean, median, quantiles and quickselect', () => {
    close(prices, p2.prices, 'prices')
    close([S.total(prices), S.mean(prices)], [p2.total, p2.mean], 'mean')
    close(S.runningMean(prices.slice(0, 10)), p2.running_mean, 'running')
    close([S.median(prices), S.median([4, 1, 3, 2])], [p2.median, p2.median_even], 'median')
    close([0, 0.1, 0.25, 0.5, 0.75, 0.9, 1].map(q => S.quantile(prices, q)), p2.quantiles, 'quantiles')
    close([0, 1, 100, 191, 383].map(k => S.quickselect(prices, k)), p2.quickselect, 'quickselect')
  })
  it('the variance three ways, including the shortcut’s cancellation on large numbers', () => {
    const big = [4, 7, 13, 16].map(x => 1e9 + x)
    close([S.variance(prices), S.variance(prices, false), S.std(prices)], p2.variance, 'variance')
    close([S.shortcutVariance(prices), S.shortcutVariance(big)], p2.shortcut, 'shortcut')
    close([S.welford(prices), S.welford(big)], p2.welford, 'welford')
    expect(S.shortcutVariance(big)).toBeLessThan(0)
    expect(S.welford(big)[1]).toBe(30)
  })
  it('errors from a centre, outliers overall and within each item, MAD and z-scores', () => {
    close([S.squaredError(prices.slice(0, 20), 30), S.absoluteError(prices.slice(0, 20), 30)], p2.errors, 'errors')
    close(S.iqrOutliers(prices), p2.iqr_all, 'iqr all')
    const groups = S.groupBy(priced, 'item')
    close(Object.fromEntries([...groups].map(([k, v]) => [k, S.iqrOutliers(v.map(r => r.price))])), p2.iqr_by_item, 'iqr by item')
    close([S.mad(prices), S.zScores(prices).slice(0, 5)], [p2.mad, p2.z_first], 'mad, z')
  })
  it('group-by, every aggregate, and the pivot table', () => {
    const groups = S.groupBy(priced, 'item')
    expect([...groups.keys()]).toEqual(Object.keys(p2.group_sizes))
    close(Object.fromEntries([...groups].map(([k, v]) => [k, v.length])), p2.group_sizes, 'sizes')
    for (const how of Object.keys(S.SUMMARIES)) close(Object.fromEntries(S.aggregate(groups, 'price', how)), p2.aggregate[how], how)
    close(S.pivot(priced, 'town', 'channel', 'quantity'), p2.pivot, 'pivot')
  })
})
