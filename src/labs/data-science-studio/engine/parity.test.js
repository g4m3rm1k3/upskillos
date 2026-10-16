// The page's engine against the real Python (python/data.py, tables.py, summary.py): the same
// CSV text byte for byte, the same parsing, and the same statistics to within 1e-9.
// Regenerate parity.json with: python src/labs/data-science-studio/tools/make_parity.py
import { describe, expect, it } from 'vitest'
import parity from './parity.json'
import * as D from './data.js'
import * as T from './tables.js'
import * as S from './summary.js'
import * as C from './cleaning.js'
import * as G from './charts.js'

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

describe('Part 3 gives the same answers as the Python', () => {
  const p3 = parity.part3
  const orders = D.makeOrders()
  const catalogue = T.readCsv(D.CATALOGUE_CSV())
  const returns = T.readCsv(D.RETURNS_CSV())
  const listPrices = Object.fromEntries(catalogue.map(r => [r.item, T.toPence(r.list_price)]))
  const clean = C.cleanOrders(rows, listPrices)
  const cleanPriced = clean.filter(r => r.price !== null).map(r => ({ ...r, price: r.price / 100 }))
  const withGaps = clean.map(r => ({ ...r, price: r.price === null ? null : r.price / 100 }))
  const ACUTE = String.fromCharCode(0x301), E_ACUTE = String.fromCharCode(0xe9)
  const texts = ['  leeds ', 'York ', 'harrogate', 'WAKEFIELD', 'Cafe' + ACUTE, 'caf' + E_ACUTE, 'new  york', "o'neil", 'a' + String.fromCharCode(9) + 'b', '']
  const pairs = [['kitten', 'sitting'], ['Helmit', 'Helmet'], ['', 'abc'], ['ab', 'ba'], ['Lights, fron tand back', 'Lights, front and back'], ['Cafe' + ACUTE, 'caf' + E_ACUTE]]
  const items = catalogue.map(r => r.item)
  const returned = returns.map(r => ({ ...r, order_id: C.normalise(r.order_id).toUpperCase() }))
  const wide = [{ town: 'Leeds', web: 3, shop: 5 }, { town: 'York', web: 1, shop: null }]

  it('the catalogue and the returns form: the same text, and the same truth behind them', () => {
    expect(D.CATALOGUE_CSV()).toBe(p3.catalogue_csv)
    expect(D.RETURNS_CSV()).toBe(p3.returns_csv)
    const prices = {}, ids = []
    expect(D.makeOrders(400, 7, prices)).toEqual(orders)
    D.makeReturns(orders, 24, 11, ids)
    expect(prices).toEqual(p3.truth_prices)
    expect(ids).toEqual(p3.truth_returns)
  })
  it('cleaning text, the rules, the pence typos, duplicates', () => {
    expect(texts.map(C.normalise)).toEqual(p3.normalise)
    expect(texts.map(C.cleanTown)).toEqual(p3.clean_town)
    expect(C.checkRows(rows, C.RULES)).toEqual(p3.problems)
    expect(['25.00', '2375', '', '24.5', '250.00', '251.00'].map(x => C.fixPence(x, 2500))).toEqual(p3.fix_pence)
    const [kept, repeated] = C.dedupe(rows, 'order_id')
    expect([kept.map(r => r.order_id), repeated]).toEqual(p3.dedupe)
  })
  it('edit distance, fuzzy matching, filling the gaps, the whole cleaning', () => {
    expect(pairs.map(([a, b]) => C.editDistance(a, b))).toEqual(p3.edit_distance)
    expect([...returns.map(r => C.closest(r.item, items)), ...['Look', 'Pmup', '', 'bike'].map(x => C.closest(x, items))]).toEqual(p3.closest)
    expect(C.fillMissing([1, null, 3], 2)).toEqual(p3.fill_missing)
    close(C.fillByGroup(withGaps, 'price', 'item').map(r => r.price), p3.fill_by_group, 'fill by group')
    expect(clean.map(r => [r.order_id, r.town, r.price, r.quantity])).toEqual(p3.clean)
  })
  it('the three joins, left and anti-joins, the size of a join, wide to long', () => {
    const pick = list => list.map(r => [r.order_id, r.category])
    expect(pick(C.nestedLoopJoin(cleanPriced.slice(0, 60), catalogue, 'item'))).toEqual(p3.nested)
    expect(pick(C.hashJoin(cleanPriced, catalogue, 'item'))).toEqual(p3.hash)
    expect(pick(C.sortMergeJoin(cleanPriced, catalogue, 'item'))).toEqual(p3.sort_merge)
    expect(C.leftJoin(returned, rows, 'order_id').map(r => [r.return_id, r.order_id, r.item, r.date])).toEqual(p3.left)
    expect(C.antiJoin(returned, rows, 'order_id').map(r => r.return_id)).toEqual(p3.anti)
    expect([C.joinSize(returned, rows, 'order_id'), C.joinSize(rows, returned, 'order_id'), C.joinSize(cleanPriced, catalogue, 'item')]).toEqual(p3.join_size)
    expect(C.toLong(wide, 'town')).toEqual(p3.to_long)
  })
  it('the pandas versions', () => {
    close(C.townCounts(rows), p3.town_counts, 'town counts')
    close(C.filledPrices(withGaps), p3.filled_prices, 'filled prices')
    close(C.revenueByCategory(cleanPriced, catalogue), p3.revenue, 'revenue')
    expect(C.unmatched(returned, rows, 'order_id')).toEqual(p3.unmatched)
    close(C.melted(wide, 'town'), p3.melted, 'melted')
  })
})

describe('Part 4 gives the same answers as the Python', () => {
  const p4 = parity.part4
  const listPrices = Object.fromEntries(T.readCsv(D.CATALOGUE_CSV()).map(r => [r.item, T.toPence(r.list_price)]))
  const clean = C.cleanOrders(rows, listPrices).filter(r => r.price !== null)
  const pence = clean.map(r => r.price)
  const lights = clean.filter(r => r.item === 'Lights, front and back').map(r => r.price / 100)
  const tickCases = [[0, 114, 5], [0, 1, 10], [0.03, 0.97, 5], [6.37, 409.5, 8], [-3.2, 7.9, 6], [0, 0.002, 4], [1000, 98765, 7]]
  it('scales, ticks and bins', () => {
    close([G.linearScale(0, 120, 300, 20, 87), G.invert(0, 120, 300, 20, 200), G.logScale(1, 1000, 0, 300, 45), G.radiusFor(87, 114, 40)], p4.scales, 'scales')
    expect(tickCases.map(c => G.niceTicks(...c))).toEqual(p4.ticks)
    expect(tickCases.map(c => G.stepSize(...c))).toEqual(p4.steps)
    expect([G.histogram(pence, 0, 2500, 20), G.histogram([0, 5, 10], 0, 5, 2)]).toEqual(p4.histogram)
    close([G.sturges(400), G.sturges(1024), G.scottWidth(lights), G.freedmanDiaconisWidth(lights)], p4.widths, 'widths')
  })
  it('densities, colours and the lie factor', () => {
    close([...[20, 22.5, 25, 27.5, 30].map(x => G.kde(lights, 1, x)), G.silverman(lights)], p4.kde, 'kde')
    expect([0, 0.25, 0.5, 1].map(t => G.mix([255, 255, 255], [8, 48, 107], t))).toEqual(p4.mix)
    close(G.lieFactor(87, 114, 7, 34), p4.lie, 'lie factor')
  })
})
