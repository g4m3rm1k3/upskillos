// The lessons' by-hand statistics (engine/summary.js, held to the Python by parity.test.js) and the
// Spreadsheet Lab's own functions, on the same prices: each checks the other. A lesson that says
// "VAR.S is the variance you derived" is true because this passes.
import { describe, expect, it } from 'vitest'
import * as S from './summary.js'
import { priced, readCsv } from './tables.js'
import { ORDERS_CSV, DAYS_CSV } from './data.js'
import { evaluateFormula } from './sheet.js'
import * as P from './patterns.js'
import * as M from './samples.js'

const prices = priced(readCsv(ORDERS_CSV())).map(r => r.price)
const sheet = formula => evaluateFormula('orders', formula).value
const close = (a, b) => expect(Math.abs(a - b)).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(b)))

describe('by hand and in the spreadsheet: the same answers', () => {
  it('the prices the two read are the same', () => {
    expect(sheet('=COUNT(E2:E403)')).toBe(prices.length)
    close(sheet('=SUM(E2:E403)'), S.total(prices))
  })
  const pairs = [
    ['mean', '=AVERAGE(E2:E403)', () => S.mean(prices)],
    ['median', '=MEDIAN(E2:E403)', () => S.median(prices)],
    ['first quartile', '=PERCENTILE.INC(E2:E403,0.25)', () => S.quantile(prices, 0.25)],
    ['third quartile', '=QUARTILE.INC(E2:E403,3)', () => S.quantile(prices, 0.75)],
    ['sample variance (n − 1)', '=VAR.S(E2:E403)', () => S.variance(prices)],
    ['population variance (n)', '=VAR.P(E2:E403)', () => S.variance(prices, false)],
    ['standard deviation', '=STDEV.S(E2:E403)', () => S.std(prices)],
    ['smallest', '=MIN(E2:E403)', () => Math.min(...prices)],
    ['largest', '=MAX(E2:E403)', () => Math.max(...prices)],
  ]
  for (const [name, formula, byHand] of pairs) it(`${name}: ${formula}`, () => close(sheet(formula), byHand()))
})

// Parts 5 and 6: the days sheet's columns against patterns.js, and the distributions against samples.js.
const days = P.numberDays(readCsv(DAYS_CSV()))
const col = k => days.map(r => r[k])
const [H, R, RI, V] = ['high_c', 'rain_mm', 'riders', 'visits'].map(col)
const quiet = days.filter(r => r.visits < 9000)
describe('patterns and samples: by hand and in the spreadsheet', () => {
  const pairs = [
    ['covariance', '=COVARIANCE.S(days!B2:B366, days!D2:D366)', () => P.covariance(H, RI)],
    ['correlation', '=CORREL(days!B2:B366, days!D2:D366)', () => P.correlation(H, RI)],
    ['correlation with the news day', '=CORREL(days!B2:B366, days!E2:E366)', () => P.correlation(H, V)],
    ['Spearman: the correlation of the ranks', '=CORREL(RANK.AVG(days!B2:B366, days!B2:B366, 1), RANK.AVG(days!E2:E366, days!E2:E366, 1))', () => P.spearman(H, V)],
    ['a tied rank: every dry day', '=RANK.AVG(0, days!C2:C366, 1)', () => P.rank(R)[R.indexOf(0)]],
    ['the slope', '=SLOPE(days!D2:D366, days!B2:B366)', () => P.fitLine(H, RI)[0]],
    ['the intercept', '=INTERCEPT(days!D2:D366, days!B2:B366)', () => P.fitLine(H, RI)[1]],
    ['R² is r²', '=RSQ(days!D2:D366, days!B2:B366)', () => P.correlation(H, RI) ** 2],
    ['growth per degree, on a log scale', '=EXP(SLOPE(LN(FILTER(days!E2:E366, days!E2:E366<9000)), FILTER(days!B2:B366, days!E2:E366<9000)))-1', () => P.growthPerUnit(quiet.map(r => r.high_c), quiet.map(r => r.visits))],
    ['choosing 9 of 20', '=COMBIN(20, 9)', () => M.comb(20, 9)],
    ['the binomial', '=BINOM.DIST(9, 20, 0.4675, FALSE)', () => M.binomialPmf(9, 20, 0.4675)],
    ['the Poisson', '=POISSON.DIST(2, 400/365, FALSE)', () => M.poissonPmf(2, 400 / 365)],
    ['skewness', '=SKEW(days!C2:C366)', () => M.skewness(R)],
    ['the standard error', '=STDEV.S(days!D2:D366)/SQRT(COUNT(days!D2:D366))', () => M.standardError(RI)],
  ]
  for (const [name, formula, byHand] of pairs) it(`${name}: ${formula}`, () => close(sheet(formula), byHand()))
  it('COMBIN(400, 20), past 2^53: the spreadsheet is right to 15 digits', () => {
    const exact = Number(M.combBig(400, 20))
    expect(Math.abs(sheet('=COMBIN(400, 20)') - exact) / exact).toBeLessThan(1e-12)
  })
})
