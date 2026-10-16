// The lessons' by-hand statistics (engine/summary.js, held to the Python by parity.test.js) and the
// Spreadsheet Lab's own functions, on the same prices: each checks the other. A lesson that says
// "VAR.S is the variance you derived" is true because this passes.
import { describe, expect, it } from 'vitest'
import * as S from './summary.js'
import { priced, readCsv } from './tables.js'
import { ORDERS_CSV } from './data.js'
import { evaluateFormula } from './sheet.js'

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
