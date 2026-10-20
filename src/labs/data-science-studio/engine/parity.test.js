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
import * as P from './patterns.js'
import * as M from './samples.js'
import * as Q from './significance.js'
import * as F from './models.js'
import * as W from './forecasting.js'
import * as B from './database.js'
import * as L from './mlData.js'
import * as Y from './story.js'
import { MESSAGES } from '../../nlp-studio/engine/data.js'
import { SHOP_TABLES, typedRows } from './sqlRun.js'

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

describe('Parts 5 and 6 give the same answers as the Python', () => {
  const p5 = parity.part5, p6 = parity.part6
  const listPrices = Object.fromEntries(T.readCsv(D.CATALOGUE_CSV()).map(r => [r.item, T.toPence(r.list_price)]))
  const clean = C.cleanOrders(rows, listPrices)
  const days = P.numberDays(T.readCsv(D.DAYS_CSV())), quiet = days.filter(r => r.date !== P.NEWS_DATE)
  const col = (list, k) => list.map(r => r[k])
  const [H, R, RI, V] = ['high_c', 'rain_mm', 'riders', 'visits'].map(k => col(days, k))
  const [HQ, RQ, RIQ, VQ] = ['high_c', 'rain_mm', 'riders', 'visits'].map(k => col(quiet, k))
  const towns = Object.fromEntries(clean.map(r => [r.order_id, r.town]))
  const deliveries = T.readCsv(D.DELIVERIES_CSV()).map(r => { const far = D.FAR_TOWNS.includes(towns[r.order_id]) ? 'far' : 'near'; return { ...r, far, group: `${r.courier} ${far}` } })
  const pop = clean.filter(r => r.price !== null).map(r => r.price / 100)
  const lights = clean.filter(r => r.price !== null && r.item === 'Lights, front and back').map(r => r.price / 100)

  it('the days and the deliveries: the same text, the same news day, the same noise', () => {
    expect(D.DAYS_CSV()).toBe(p5.days_csv)
    expect(D.DELIVERIES_CSV()).toBe(p5.deliveries_csv)
    const news = {}; D.makeDays(5, news); expect(news).toEqual(p5.news)
    const rng = new D.Rng(9); close([D.noise(rng), D.noise(rng), D.noise(rng)], p5.noise, 'noise')
    expect([13.25, -0.04, -0.05, 0, 9.96, -12.35].map(D.tenths)).toEqual(p5.tenths)
  })
  it('covariance, correlation, the cosine, ranks and Spearman', () => {
    close([P.covariance(H, RI), P.covariance(H, H), P.covariance([1, 2, 3], [6, 4, 2])], p5.covariance, 'covariance')
    close([P.correlation(H, RI), P.correlation(H, V), P.correlation(HQ, VQ), P.correlation(R, RI)], p5.correlation, 'correlation')
    close([P.cosine(P.centred(H), P.centred(RI)), P.cosine([1, 0], [1, 1])], p5.cosine, 'cosine')
    close(P.centred([1, 2, 6]), p5.centred, 'centred')
    expect([P.rank([5, 1, 1, 3, 5, 5]), P.rank(R).slice(0, 20), P.rank([])]).toEqual(p5.rank)
    close([P.spearman(H, V), P.spearman(HQ, VQ), P.spearman(R, RI)], p5.spearman, 'spearman')
  })
  it('the line, Anscombe, growth on a log scale, jitter, the matrix, rates, the simulations', () => {
    close([P.fitLine(H, RI), P.fitLine(RI, H), P.fitLine(HQ, VQ)], p5.fit_line, 'fit')
    close(P.residuals(H, RI).slice(0, 10), p5.residuals, 'residuals')
    close(Object.fromEntries(Object.entries(P.ANSCOMBE).map(([k, [xs, ys]]) => [k, P.describePair(xs, ys)])), p5.anscombe, 'anscombe')
    close([P.growthPerUnit(HQ, VQ), P.growthPerUnit(H, V), P.growthPerUnit([0, 1, 2], [100, 110, 121])], p5.growth, 'growth')
    close(P.jitter([1, 2, 3, 3, 3], 0.3, 4), p5.jitter, 'jitter')
    close(P.correlationMatrix([HQ, RQ, RIQ, VQ]), p5.matrix, 'matrix')
    expect(['courier', 'group', 'far'].map(k => P.rateBy(deliveries, k, 'on_time', 'yes'))).toEqual(p5.rate_by)
    const sims = ['confounder', 'collider', 'independent'].map(kind => P.simulate(kind, 300, 3))
    close(Object.fromEntries(['confounder', 'collider', 'independent'].map((k, i) => [k, sims[i].slice(0, 5)])), p5.simulate, 'simulate')
    close([...sims.map(s => P.partialCorrelation(s.map(r => r[0]), s.map(r => r[1]), s.map(r => r[2]))), P.partialCorrelation(RIQ, VQ, HQ)], p5.partial, 'partial')
  })
  it('samples, counting, the binomial and the Poisson', () => {
    expect([M.sampleWithout([...Array(10).keys()], 4, 1), M.sampleWithout(pop, 5, 2)]).toEqual(p6.sample_without)
    expect([M.sampleWith([...Array(10).keys()], 6, 1), M.sampleWith(pop, 5, 2)]).toEqual(p6.sample_with)
    expect([M.comb(20, 9), M.comb(10, 0), M.comb(52, 5), Number(M.combBig(400, 20) % 1000000007n)]).toEqual(p6.comb)
    close(Array.from({ length: 21 }, (_, k) => M.binomialPmf(k, 20, 0.4675)), p6.binomial, 'binomial')
    close(Array.from({ length: 7 }, (_, k) => M.poissonPmf(k, 400 / 365)), p6.poisson, 'poisson')
    expect(['2025-01-01', '2025-03-01', '2025-12-31'].map(M.dayOfYear)).toEqual(p6.day_of_year)
    const perDay = M.ordersPerDay(clean.map(r => r.date))
    expect([perDay, M.tally(perDay)]).toEqual([p6.per_day, p6.tally])
  })
  it('sample means, the standard error, the bell curve, skewness, intervals and coverage', () => {
    close(M.sampleMeans(pop, 30, 50, 21), p6.sample_means, 'sample means')
    close([M.standardError(pop), M.standardError(lights)], p6.standard_error, 'se')
    close([22, 25, 27.5].map(x => M.normalPdf(x, 25, 1.4)), p6.normal_pdf, 'normal')
    close([M.skewness(pop), M.skewness(lights), M.skewness([1, 2, 3])], p6.skewness, 'skewness')
    close(M.heavyTailed(20, 51), p6.heavy, 'heavy')
    close([M.meanInterval(lights), M.meanInterval(pop, 2.576)], p6.mean_interval, 'interval')
    close([M.coverage(pop, 5, 400, 31), M.coverage(lights, 10, 400, 31)], p6.coverage, 'coverage')
  })
  it('the bootstrap, the reservoir, strata', () => {
    close([M.bootstrap(lights, 'median', 40, 41), M.bootstrap(lights, 'mean', 40, 41)], p6.bootstrap, 'bootstrap')
    close([M.percentileInterval(M.bootstrap(lights, 'median', 400, 41)), M.percentileInterval([...Array(101).keys()], 0.9)], p6.percentile, 'percentile')
    const near = deliveries.filter(r => r.far === 'near'), on = c => near.filter(r => r.courier === c).map(r => (r.on_time === 'yes' ? 1 : 0))
    close(M.bootstrapDifference(on('Northern'), on('Swift'), 40, 81), p6.difference, 'difference')
    expect([M.reservoir(Array.from({ length: 20 }, (_, k) => k + 1), 5, 61), M.reservoir(['a', 'b'], 5, 1)]).toEqual(p6.reservoir)
    expect(M.stratifiedSample(clean.filter(r => r.price !== null), 'item', 40, 71).map(r => r.order_id)).toEqual(p6.stratified)
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

describe('Parts 7 and 8 give the same answers as the Python', () => {
  const p7 = parity.part7, p8 = parity.part8
  const listPrices = Object.fromEntries(T.readCsv(D.CATALOGUE_CSV()).map(r => [r.item, T.toPence(r.list_price)]))
  const clean = C.cleanOrders(rows, listPrices)
  const lights = ch => clean.filter(r => r.price !== null && r.item === 'Lights, front and back' && r.channel === ch).map(r => r.price / 100)
  const [web, shop] = [lights('web'), lights('shop')]
  const days = P.numberDays(T.readCsv(D.DAYS_CSV()))
  const H = days.map(r => r.high_c), RI = days.map(r => r.riders)
  const towns = Object.fromEntries(clean.map(r => [r.order_id, r.town]))
  const deliveries = T.readCsv(D.DELIVERIES_CSV())
  const many = Q.manyTests(10, 3, 12, 0.8, 3)

  it('the trial: the same text, byte for byte', () => {
    expect(D.TRIAL_CSV()).toBe(p7.trial_csv)
  })
  it('the permutation test, Simpson’s rule, the normal and the z test', () => {
    close(Q.permutationDiffs(web, shop, 30, 3), p7.perm, 'perm')
    close([Q.permutationP(Q.permutationDiffs(web, shop, 300, 3), S.mean(web) - S.mean(shop)), Q.permutationP([0.5, -0.2, 0.1], 0.2)], p7.perm_p, 'perm p')
    close([Q.simpson(u => u * u, 0, 3, 10), Q.simpson(u => 1 / (1 + u * u), 0, 1)], p7.simpson, 'simpson')
    close([-3, -1.2, 0, 0.5, 1.96, 6].map(Q.normalCdf), p7.normal_cdf, 'normal cdf')
    close([0.025, 0.5, 0.8, 0.975].map(Q.normalQuantile), p7.normal_quantile, 'quantile')
    close([Q.twoProportionZ(1434, 7381, 1588, 7425), Q.twoProportionZ(0, 5, 0, 5), Q.twoProportionZ(13, 14, 59, 65)], p7.z, 'z')
    close([2.957, -1.0, 0].map(Q.zPValue), p7.z_p, 'z p')
    close(Q.simulatedPvalues(50, 0.2, 0.2, 20, 5), p7.simulated_pvalues, 'simulated p')
  })
  it('the t test, effect size, power and the sample size', () => {
    close([Q.welchT(web, shop), Q.welchT([1, 2, 3, 4], [2, 4, 6, 9, 11])], p7.welch, 'welch')
    close([[2.1, 7.5], [0.352, 76.06], [1.0, 1], [3.0, 2], [0, 5]].map(([t, df]) => Q.tTwoSided(t, df)), p7.t_two_sided, 't')
    close([1, 4, 30].map(df => Q.tCritical(df)), p7.t_critical, 't critical')
    close([Q.cohensD(web, shop), Q.cohensD([1, 2, 3], [2, 3, 4, 5])], p7.cohens_d, 'd')
    close(Q.simulatedPower(14, 0.85, 0.97, 100, 5), p7.power, 'power')
    close([Q.sampleSize(0.2, 0.22), Q.sampleSize(0.85, 0.97, 0.05, 0.9)], p7.sample_size, 'n')
  })
  it('chi-squared, dispersion, many tests, peeking and the trial’s checks', () => {
    close([Q.chiSquared([[61, 20], [65, 16]]), Q.chiSquared([[1, 2, 3], [4, 5, 6]])], p7.chi_squared, 'chi squared')
    close([[3.84, 1], [5.99, 2], [5.0, 3], [10, 4], [311.75, 364]].map(([x, df]) => Q.chi2Tail(x, df)), p7.chi2_tail, 'chi2 tail')
    close(Q.dispersion(M.ordersPerDay(clean.map(r => r.date))), p7.dispersion, 'dispersion')
    close(many, p7.many, 'many')
    expect([Q.bonferroni(many), Q.benjaminiHochberg(many, 0.1)]).toEqual([p7.bonferroni, p7.bh])
    close(Q.aaPeeking(Array(10).fill(30), 0.2, 20, 9), p7.peeking, 'peeking')
    close([Q.splitCheck(7381, 7425), Q.liftInterval(1434, 7381, 1588, 7425)], [p7.split, p7.lift], 'split, lift')
  })

  const drows = days.map(r => ({ ...r, weekend: F.weekday(r.date) >= 5 ? 1 : 0 }))
  const X = F.designMatrix(drows, ['high_c', 'rain_mm', 'weekend'])
  const [A, b] = F.normalEquations(X, RI), w = F.fit(X, RI)
  const dows = days.map(r => F.weekday(r.date))
  const Xd = days.map((r, k) => [1, r.high_c, r.rain_mm, ...F.oneHot([dows[k]], [0, 1, 2, 3, 4, 5, 6])[0].slice(1)])
  const Xt = X.map((row, k) => [...row, ...F.oneHot([dows[k]], [0, 1, 2, 3, 4, 5, 6])[0]])
  const cols = [1, 2, 3].map(j => F.standardise(X.map(row => row[j]))[0]), Z = X.map((_, i) => [1, ...cols.map(c => c[i])])
  const months = days.map(r => r.date.slice(5, 7))
  const LX = deliveries.map(r => [1, r.courier === 'Northern' ? 1 : 0, D.FAR_TOWNS.includes(towns[r.order_id]) ? 1 : 0])
  const LY = deliveries.map(r => (r.on_time === 'yes' ? 1 : 0))
  it('least squares, the weekday, matrices and Gaussian elimination', () => {
    close([F.leastSquares(H, RI), F.leastSquares([1, 2, 3], [2, 4, 7])], p8.least_squares, 'least squares')
    expect(['2025-01-01', '2025-06-02', '2025-12-31'].map(F.weekday)).toEqual(p8.weekday)
    close(X.slice(0, 3), p8.design, 'design')
    close([F.transpose([[1, 2, 3], [4, 5, 6]]), F.matMul([[1, 2], [3, 4]], [[5, 6], [7, 8]])], [p8.transpose, p8.mat_mul], 'matrices')
    close([A, b], p8.normal_equations, 'normal equations')
    expect(F.solve([[2, 1], [4, 2]], [1, 2])).toBeNull()
    close([F.solve(A, b), F.solve([[0, 1], [1, 0]], [3, 4])], [p8.solve[0], p8.solve[2]], 'solve')
    expect(p8.solve[1]).toBeNull()
    close([w, F.predict(X.slice(0, 5), w), F.rSquared(RI, F.predict(X, w))], [p8.fit, p8.predict, p8.r2], 'fit')
  })
  it('one-hot columns and the trap, standardising, gradient descent, polynomials, ridge', () => {
    close(F.oneHot([0, 2, 1], [0, 1, 2]), p8.one_hot, 'one hot')
    close(F.fit(Xd, RI), p8.dummies, 'dummies')
    expect(F.fit(Xt, RI)).toBeNull()
    expect(p8.trap).toBeNull()
    close(F.standardise([1, 2, 3, 4]), p8.standardise, 'standardise')
    close(F.gradientDescent(Z, RI, 0.5, 30), p8.gd, 'gradient descent')
    close(F.polynomial([0.5, -1, 2], 3), p8.polynomial, 'polynomial')
    close([F.rmse(RI, F.predict(X, w)), F.ridge(X, RI, 10)], [p8.rmse, p8.ridge], 'rmse, ridge')
  })
  it('folds, cross-validation, logistic regression and the leak', () => {
    expect([F.kFolds(10, 3, 5), F.groupFolds(months.slice(0, 70))]).toEqual([p8.k_folds, p8.group_folds])
    close([F.crossValidate(X, RI, F.kFolds(365, 5, 5)), F.crossValidate(X, RI, F.groupFolds(months), 10)], p8.cv, 'cv')
    close([[-2, 0, 3].map(F.sigmoid), F.logLoss([1, 0, 1], [0.9, 0.2, 0.6])], [p8.sigmoid, p8.log_loss], 'sigmoid, log loss')
    close(F.logisticFit(LX, LY, 1, 200), p8.logistic, 'logistic')
    close([F.thresholdAccuracy(deliveries.map(r => Number(r.days)), LY), F.thresholdAccuracy([1, 2, 3], [1, 0, 1])], p8.threshold, 'threshold')
  })

  const p9 = parity.part9, dates = days.map(r => r.date), VI = days.map(r => r.visits)
  it('dates, resampling, moving averages, decomposition and autocorrelation', () => {
    expect(['2025-01-01', '2025-01-05', '2025-01-06', '2025-12-31'].map(W.weekOf)).toEqual(p9.week_of)
    close([W.resample(dates, RI, 'month'), W.resample(dates.slice(0, 20), RI.slice(0, 20), 'week')], p9.resample, 'resample')
    close([W.movingAverageSlow(RI, 7).slice(0, 20), W.movingAverage(RI, 7), W.movingAverage([1, 2, 3, 4], 2)], p9.moving, 'moving')
    close(W.centredAverage(RI.slice(0, 30), 7), p9.centred, 'centred')
    close(W.decompose(RI, 7), p9.decompose, 'decompose')
    close(W.difference(RI.slice(0, 20), 7), p9.difference, 'difference')
    close([W.acf(RI, 14), W.acf(VI, 3), W.autocorrelation([1, 2, 3, 4, 5], 1)], p9.acf, 'acf')
  })
  it('naive forecasts, scores, smoothing, Holt, Holt–Winters and walk-forward splits', () => {
    close([W.naiveForecasts(RI.slice(0, 10)), W.seasonalNaive(RI.slice(0, 10), 7), W.meanForecasts(RI.slice(0, 10))], p9.naive, 'naive')
    const pairs = W.scored(RI, W.seasonalNaive(RI, 7))
    close([W.mae(pairs), W.rmseOf(pairs), W.mape(pairs)], p9.scores, 'scores')
    close([W.exponentialSmoothing(RI, 0.1), W.smoothingWeights(0.3, 6), W.bestAlpha(RI, [0.05, 0.1, 0.3, 0.5])], p9.smoothing, 'smoothing')
    close([W.holt(RI, 0.3, 0.1), W.holtAhead(RI.slice(0, 200), 0.5, 0.3, 8)], p9.holt, 'holt')
    close([W.holtWinters(RI, 0.1, 0.01, 0.2, 7), W.holtWinters(RI, 0.1, 0.01, 0.2, 7, 7)], p9.holt_winters, 'holt winters')
    expect(W.walkForward(10, 7, 2)).toEqual(p9.walk_forward)
    close(W.weekdayProfile(dates, RI), p9.profile, 'profile')
  })

  const p10 = parity.part10, SHOP = SHOP_TABLES(), TO = typedRows(SHOP.orders), TD = typedRows(SHOP.days)
  const shop4 = { orders: SHOP.orders, catalogue: SHOP.catalogue, returns: SHOP.returns, days: SHOP.days }
  it('column types, tables, projection, selection with NULL, aggregates and groups (and SQLite agrees)', () => {
    expect([['1', '', '3'], ['1', '2.5'], ['x', '1'], ['', ''], ['25.00', '2500']].map(B.columnType)).toEqual(p10.types)
    expect(Object.entries(shop4).map(([n, t]) => B.createSql(n, t[0], t.slice(1)))).toEqual(p10.create)
    expect([B.project(TO.slice(0, 6), ['town', 'item']), B.project(TO, ['channel'], true)]).toEqual(p10.project)
    expect([B.where(TO, 'price', 'is null').length, B.where(TO, 'price', '=', null).length, B.where(TO, 'price', '>', 1000).map(r => r.order_id)]).toEqual(p10.where)
    close([...['count_all', 'count', 'sum', 'avg', 'min', 'max'].map(h => B.aggregate([1, null, 3], h)), B.aggregate([null], 'sum')], p10.aggregate, 'aggregate')
    const groups = ['count_all', 'count', 'avg'].map(h => B.groupAggregate(TO, 'item', 'price', h))
    close(groups, p10.group, 'group')
    close(groups, p10.group_sql, 'group against SQLite')
  })
  it('the index and binary search, B-tree levels, windows, ranks, dependencies, normalising, the transaction', () => {
    const idx = B.buildIndex(TO, 'order_id')
    expect([idx.slice(0, 5), B.binarySearch(idx, 'A1100'), B.binarySearch(idx, 'A1018'), B.binarySearch(idx, 'Z')]).toEqual(p10.index)
    expect([[402, 100], [1e6, 100], [1e9, 100], [1e6, 2], [1, 100]].map(([n, f]) => B.btreeLevels(n, f))).toEqual(p10.btree)
    close(B.windowAverage(TD.map(r => r.riders), 6).slice(0, 20), p10.window[0], 'window')
    close(B.windowAverage(TD.map(r => r.riders), 6).slice(0, 20), p10.window[1].map(r => r[0]), 'window against SQLite')
    expect(B.rankWithin([{ g: 'a', v: 3 }, { g: 'a', v: 5 }, { g: 'b', v: 1 }, { g: 'a', v: 5 }], 'g', 'v')).toEqual(p10.rank)
    expect([B.determines(TO, 'order_id', 'item'), B.determines(TO, 'item', 'channel')]).toEqual(p10.determines)
    expect(B.splitOut([{ id: 1, item: 'Lock', cat: 'kit' }, { id: 2, item: 'Bike', cat: 'bikes' }, { id: 3, item: 'Lock', cat: 'kit' }], 'item', ['cat'])).toEqual(p10.split)
    const monthly = B.monthlyRevenue(TO)
    close([monthly, monthly, monthly], p10.monthly, 'monthly revenue: by hand, pandas, SQLite')
    expect([B.placeOrders({ Bike: 3, Helmet: 5 }, [['Bike', 2], ['Helmet', 1]]), B.placeOrders({ Bike: 3, Helmet: 5 }, [['Bike', 2], ['Bike', 2]]), B.placeOrders({ Lock: 1 }, [['Pump', 4]])]).toEqual(p10.orders)
  })

  const p11 = parity.part11, msgTokens = MESSAGES.map(([text]) => L.tokens(text)), msgLabels = MESSAGES.map(([, lab]) => (lab === 'spam' ? 1 : 0))
  it('date features, the circle, target encoding in and out of fold, hashing, tokens and TF-IDF', () => {
    expect(['2025-01-01', '2025-06-07', '2025-12-31'].map(L.dateFeatures)).toEqual(p11.dates)
    close([[0, 365], [364, 365], [91, 365], [6, 12]].map(([v, p]) => L.cyclical(v, p)), p11.cyclical, 'cyclical')
    close([0, 2].map(m => L.targetMeans(['a', 'b', 'a', 'c'], [1, 0, 0, 1], m)), p11.target, 'target')
    close(L.outOfFoldEncode(days.slice(0, 40).map(r => r.date), days.slice(0, 40).map(r => (r.riders > 600 ? 1 : 0)), F.kFolds(40, 4, 3), 1), p11.oof, 'out of fold')
    expect(['', 'a', 'bike', 'Café', 'free prize'].map(L.fnv1a)).toEqual(p11.fnv)
    expect([L.featureHash(msgTokens[0], 8), L.featureHash(msgTokens[5], 64)]).toEqual(p11.hash)
    expect([...msgTokens.slice(0, 6), L.tokens("Don't  stop--now, 2 bikes!")]).toEqual(p11.tokens)
    close(L.tfIdf(msgTokens.slice(0, 8)), p11.tf_idf, 'tf-idf')
  })
  it('scaling, nearest neighbours, the confusion matrix and its scores, stratified folds', () => {
    const sc = L.fitScaler([[1, 10], [2, 30], [3, 20], [4, 20]])
    close([sc, L.scale([[1, 10], [5, 0]], sc)], [p11.scaler, p11.scale], 'scaler')
    close([...[1, 2, 3].map(k => L.knnPredict([[0, 0], [1, 0], [0, 1], [5, 5]], [1, 2, 3, 10], [0.2, 0.1], k)), L.knnPredict(days.slice(0, 300).map(r => [r.high_c, r.rain_mm]), RI.slice(0, 300), [20, 0], 10)], p11.knn, 'knn')
    close([L.confusion([1, 0, 1, 1, 0], [1, 1, 0, 1, 0]), L.precisionRecallF1([[2, 1], [1, 1]]), L.precisionRecallF1([[0, 3], [0, 5]])], p11.confusion, 'confusion')
    expect([L.stratifiedFolds(msgLabels, 5, 1), L.stratifiedFolds([1, 0, 0, 0, 1, 0, 0, 0, 0, 1], 3, 2)]).toEqual(p11.folds)
    expect(L.positivesPerFold(msgLabels, L.stratifiedFolds(msgLabels, 5, 1))).toEqual(p11.per_fold)
  })

  const p12 = parity.part12
  it('intervals, error bands and their coverage, risk told four ways, linked views, fingerprints', () => {
    const hw1 = W.holtWinters(RI, 0.1, 0.01, 0.2, 7), errs = RI.slice(91, 273).map((y, k) => y - hw1[91 + k])
    close([Y.groupIntervals(days.map(r => F.weekday(r.date)), RI), Y.groupIntervals(['a', 'b', 'a', 'b', 'a'], [1, 2, 3, 5, 2], 2)], p12.intervals, 'intervals')
    close([Y.errorBand(errs, 0.8), Y.errorBand(errs, 0.95), Y.errorBand([3, -1, 2, 0, -4], 0.5)], p12.band, 'band')
    close([Y.coverage(RI.slice(273), hw1.slice(273), Y.errorBand(errs, 0.8)), Y.coverage([1, 2, 3], [1, 1, 1], [0, 1])], p12.coverage, 'coverage')
    close([Y.riskSummary(1434, 7381, 1588, 7425), Y.riskSummary(5, 100, 5, 100)], p12.risk, 'risk')
    const rule = { a: { low: 1, high: 5 }, b: ['x'] }
    expect([Y.passes({ a: 3, b: 'x' }, rule), Y.passes({ a: 3, b: 'y' }, rule), Y.passes({ a: 3, b: 'y' }, rule, 'b')]).toEqual(p12.passes)
    const prices12 = Object.fromEntries(T.readCsv(D.CATALOGUE_CSV()).map(r => [r.item, T.toPence(r.list_price)]))
    const dash = C.cleanOrders(T.readCsv(D.ORDERS_CSV()), prices12).filter(r => r.price !== null).map(r => ({ town: r.town, channel: r.channel, price: r.price }))
    expect(['town', 'channel'].map(k => Y.linkedCounts(dash, { channel: ['web'], price: { low: 0, high: 5000 } }, k))).toEqual(p12.linked)
    expect([Y.fingerprint(''), Y.fingerprint(D.ORDERS_CSV()), Y.fingerprint(['a,b', '1,2', ''].join(String.fromCharCode(10)))]).toEqual(p12.fingerprint)
  })
})
