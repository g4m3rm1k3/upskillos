// Function results checked against Excel. Most expected values are the worked
// examples in Microsoft's Excel function documentation, so a mismatch means
// the lab disagrees with Excel, not with our own idea of the answer.
import { describe, expect, it } from 'vitest'
import { Workbook } from './workbook.js'
import { FUNCTIONS } from './functions/index.js'
import { isMatrix } from './values.js'

function calc(formula, cells = {}) {
  const wb = new Workbook()
  const s = wb.sheets[0].id
  wb.setCells(Object.entries(cells).map(([a, input]) => ({ sheetId: s, row: Number(a.slice(1)) - 1, col: a.charCodeAt(0) - 65, input })))
  wb.setCells([{ sheetId: s, row: 99, col: 25, input: formula }]) // Z100, out of the way
  const v = wb.getCell(s, 99, 25).value
  if (isMatrix(v)) return v.rows.map((r) => r.map((x) => x?.code ?? x))
  return v?.code ?? v
}

const near = (formula, expected, digits = 6, cells) => it(formula + ' ≈ ' + expected, () => expect(calc(formula, cells)).toBeCloseTo(expected, digits))
const is = (formula, expected, cells) => it(formula + ' = ' + JSON.stringify(expected), () => expect(calc(formula, cells)).toEqual(expected))

describe('operators follow Excel', () => {
  is('=-2^2', 4) // negation binds tighter than ^ in Excel
  is('=2^3^2', 64) // left to right
  is('="a"&1', 'a1')
  is('=1+"2"', 3)
  is('="abc"+1', '#VALUE!')
  is('=1/0', '#DIV/0!')
  is('=TRUE+TRUE', 2)
  is('="A"="a"', true)
  is('=50%', 0.5)
  is('="1"<2', false) // text sorts after numbers
  is('={1,2,3}*2', [[2, 4, 6]])
  is('={1;2}+{10,20}', [[11, 21], [12, 22]])
})

describe('math', () => {
  is('=ROUND(2.15, 1)', 2.2)
  is('=ROUND(-1.475, 2)', -1.48)
  is('=ROUND(21.5, -1)', 20)
  is('=ROUNDUP(3.2, 0)', 4)
  is('=MROUND(10, 3)', 9)
  is('=CEILING(2.5, 1)', 3)
  is('=FLOOR(-2.5, -2)', -2)
  is('=MOD(-3, 2)', 1)
  is('=MOD(3, -2)', -1)
  is('=INT(-8.9)', -9)
  is('=TRUNC(-8.9)', -8)
  is('=QUOTIENT(-10, 3)', -3)
  is('=COMBIN(8, 2)', 28)
  is('=FACT(5)', 120)
  is('=GCD(24, 36)', 12)
  is('=LOG(8, 2)', 3)
  is('=EVEN(-1)', -2)
  is('=ODD(2)', 3)
  near('=ATAN2(1, 1)', 0.785398163)
  near('=SQRTPI(1)', 1.772453851)
  near('=POWER(98.6, 3.2)', 2401077.222, 2)
  is('=SUMPRODUCT({3,4;8,6;1,9}, {2,7;6,7;5,3})', 156)
  is('=SUMIF(A1:A4, ">160000", B1:B4)', 63000, { A1: '100000', A2: '200000', A3: '300000', A4: '400000', B1: '7000', B2: '14000', B3: '21000', B4: '28000' })
  is('=SEQUENCE(2, 3, 0, 5)', [[0, 5, 10], [15, 20, 25]])
})

describe('statistics', () => {
  const data = { A1: '1345', A2: '1301', A3: '1368', A4: '1322', A5: '1310', A6: '1370', A7: '1318', A8: '1350', A9: '1303', A10: '1299' }
  near('=STDEV.S(A1:A10)', 27.46391572, 6, data)
  near('=STDEV(A1:A10)', 27.46391572, 6, data)
  near('=STDEV.P(A1:A10)', 26.05455814, 6, data)
  is('=AVERAGE(10, 7, 9, 27, 2)', 11)
  is('=MEDIAN(1, 2, 3, 4, 5, 6)', 3.5)
  near('=PERCENTILE.INC({1,3,2,4}, 0.3)', 1.9)
  is('=QUARTILE.INC({1,2,4,7,8,9,10,12}, 1)', 3.5)
  is('=RANK.EQ(7, {7,3.5,3.5,1,2}, 1)', 5)
  near('=CORREL({3,2,4,5,6}, {9,7,12,15,17})', 0.997054486)
  near('=SLOPE({2,3,9,1,8,7,5}, {6,5,11,7,5,4,4})', 0.305555556)
  near('=INTERCEPT({2,3,9,1,8}, {6,5,11,7,5})', 0.048387097)
  near('=FORECAST.LINEAR(30, {6,7,9,15,21}, {20,28,31,38,40})', 10.607253)
  is('=COUNTIF({"apples","oranges","peaches","apples"}, "apples")', 2)
  is('=COUNTIFS({1,2,3,4}, ">1", {5,6,7,8}, "<8")', 2)
})

describe('distributions', () => {
  near('=NORM.DIST(42, 40, 1.5, TRUE)', 0.9087888)
  near('=NORM.INV(0.908789, 40, 1.5)', 42.000002, 4)
  near('=NORM.S.INV(0.908789)', 1.3333347, 5)
  near('=BINOM.DIST(6, 10, 0.5, FALSE)', 0.2050781)
  near('=POISSON.DIST(2, 5, FALSE)', 0.084224, 5)
  near('=POISSON.DIST(2, 5, TRUE)', 0.124652, 5)
  near('=EXPON.DIST(0.2, 10, TRUE)', 0.86466472)
  near('=CHISQ.DIST.RT(18.307, 10)', 0.0500006, 6)
  near('=T.DIST(60, 1, TRUE)', 0.99469533)
  near('=T.INV(0.75, 2)', 0.8164966)
  near('=F.DIST(15.2069, 6, 4, TRUE)', 0.99, 4)
  near('=F.DIST(15.2069, 6, 4, FALSE)', 0.0012238, 6)
  near('=CONFIDENCE.NORM(0.05, 2.5, 50)', 0.692952, 5)
  near('=CONFIDENCE.T(0.05, 1, 50)', 0.284196, 5)
})

describe('logic', () => {
  is('=IF(5>3, "yes", "no")', 'yes')
  is('=IFS(1>2, "a", 2>1, "b")', 'b')
  is('=SWITCH(2, 1, "one", 2, "two", "other")', 'two')
  is('=IFERROR(1/0, "oops")', 'oops')
  is('=LET(x, 2, y, 3, x*y)', 6)
  is('=MAP({1,2,3}, LAMBDA(x, x*10))', [[10, 20, 30]])
  is('=REDUCE(0, {1,2,3,4}, LAMBDA(acc, x, acc+x))', 10)
  is('=AND(TRUE, 1, 0)', false)
  is('=XOR(TRUE, FALSE, TRUE)', false)
  is('=ISERROR(1/0)', true)
  is('=ISNA(VLOOKUP(9, {1,2}, 1, FALSE))', true)
  is('=IFNA(1/0, "x")', '#DIV/0!')
  is('=SUM(1, 1/0)', '#DIV/0!')
  is('=IF(1/0, 1, 2)', '#DIV/0!')
})

describe('lookup and arrays', () => {
  const table = { A1: '1', B1: 'one', A2: '2', B2: 'two', A3: '3', B3: 'three' }
  is('=VLOOKUP(2, A1:B3, 2, FALSE)', 'two', table)
  is('=VLOOKUP(2.5, A1:B3, 2, TRUE)', 'two', table)
  is('=VLOOKUP(9, A1:B3, 2, FALSE)', '#N/A', table)
  is('=XLOOKUP(3, A1:A3, B1:B3)', 'three', table)
  is('=XLOOKUP(9, A1:A3, B1:B3, "none")', 'none', table)
  is('=INDEX(B1:B3, MATCH(2, A1:A3, 0))', 'two', table)
  is('=FILTER(B1:B3, A1:A3>1)', [['two'], ['three']], table)
  is('=SORT({3;1;2})', [[1], [2], [3]])
  is('=SORT({3;1;2}, 1, -1)', [[3], [2], [1]])
  is('=UNIQUE({"a";"b";"a"})', [['a'], ['b']])
  is('=TRANSPOSE({1,2,3})', [[1], [2], [3]])
  is('=ROWS(A1:B3)', 3)
})

describe('text', () => {
  is('=TEXT(1234.567, "#,##0.00")', '1,234.57')
  is('=TEXT(0.285, "0.0%")', '28.5%')
  is('=TEXT(DATE(2025,3,14), "yyyy-mm-dd")', '2025-03-14')
  is('=LEFT("Sale Price", 4)', 'Sale')
  is('=MID("Fluid Flow", 7, 20)', 'Flow')
  is('=SUBSTITUTE("Sales Data", "Sales", "Cost")', 'Cost Data')
  is('=TEXTJOIN(", ", TRUE, "a", "", "b")', 'a, b')
  is('=PROPER("this is a TITLE")', 'This Is A Title')
  is('=FIND("M", "Miriam McGovern")', 1)
  is('=SEARCH("e", "Statements", 6)', 7)
  is('=LEN("hello")', 5)
  is('=TRIM("  a   b  ")', 'a b')
})

// Excel looks up each value when given several (its dynamic-array behaviour), one result each.
describe('lookups of several values at once', () => {
  is('=XLOOKUP({"b";"z";"a"}, {"a";"b"}, {1;2}, "none")', [[2], ['none'], [1]])
  is('=XLOOKUP({"b";"z"}, {"a";"b"}, {1;2})', [[2], ['#N/A']])
  is('=XMATCH({"b";"a";"q"}, {"a";"b"})', [[2], [1], ['#N/A']])
  is('=ISNA(XMATCH({"B";" a"}, {"a";"b"}))', [[false], [true]]) // capitals are ignored, spaces are not
  is('=MATCH({"b";"a"}, {"a";"b"}, 0)', [[2], [1]])
  is('=SUMPRODUCT(--(XLOOKUP(A1:A3, B1:B2, C1:C2)="kit"))', 2, { A1: 'Lock', A2: 'Bike', A3: 'Lock', B1: 'Lock', B2: 'Bike', C1: 'kit', C2: 'bikes' })
  is('=XLOOKUP("b", {"a";"b"}, {1;2})', 2) // one value still gives one result
  is('=XLOOKUP(A1, B1:B2, C1:D2)', [[3, 4]], { A1: 'y', B1: 'x', B2: 'y', C1: '1', D1: '2', C2: '3', D2: '4' }) // a whole row for one cell
})

// Not an Excel function: the expected values are the textbook examples of edit distance.
describe('LEVENSHTEIN', () => {
  is('=LEVENSHTEIN("kitten", "sitting")', 3)
  is('=LEVENSHTEIN("Helmit", "Helmet")', 1)
  is('=LEVENSHTEIN("", "abc")', 3)
  is('=LEVENSHTEIN("abc", "")', 3)
  is('=LEVENSHTEIN("same", "same")', 0)
  is('=LEVENSHTEIN("ab", "ba")', 2) // a swap is two changes
  is('=LEVENSHTEIN("York", "york")', 1)
  is('=LEVENSHTEIN("York", "york", TRUE)', 0)
  is('=LEVENSHTEIN("flaw", "lawn")', 2)
  is('=LEVENSHTEIN("café", "cafe")', 1)
  is('=LEVENSHTEIN(12, 123)', 1) // numbers are compared as their text
  is('=LEVENSHTEIN("Lok", {"Lock";"Look";"Bike"})', [[1], [1], [3]])
  is('=XMATCH(MIN(LEVENSHTEIN("Harogate", A1:A4)), LEVENSHTEIN("Harogate", A1:A4))', 3, { A1: 'Leeds', A2: 'York', A3: 'Harrogate', A4: 'Wakefield' })
  it('is symmetric, and never more than the longer text', () => {
    const words = ['', 'a', 'Bike', 'Helmet', 'Inner tube', 'Lights, front and back', 'Servise']
    for (const a of words) for (const b of words) {
      const ab = calc(`=LEVENSHTEIN("${a}", "${b}")`)
      expect(ab).toBe(calc(`=LEVENSHTEIN("${b}", "${a}")`))
      expect(ab).toBeLessThanOrEqual(Math.max(a.length, b.length))
      expect(ab).toBeGreaterThanOrEqual(Math.abs(a.length - b.length))
    }
  })
})

describe('dates', () => {
  is('=DATE(2008, 7, 8)', 39637)
  is('=DATE(2025, 13, 1)', 46023) // rolls over to 1 Jan 2026
  is('=WEEKDAY(DATE(2008, 2, 14))', 5)
  is('=EOMONTH(DATE(2011, 1, 1), 1)', 40602)
  is('=EDATE(DATE(2011, 1, 15), -1)', 40527)
  is('=DATEDIF(DATE(2001,1,1), DATE(2003,1,1), "Y")', 2)
  is('=DATEDIF(DATE(2001,6,1), DATE(2002,8,15), "D")', 440)
  is('=DATEDIF(DATE(2001,6,1), DATE(2002,8,15), "YD")', 75)
  is('=DATEDIF(DATE(2001,6,1), DATE(2002,8,15), "MD")', 14)
  near('=YEARFRAC(DATE(2012,1,1), DATE(2012,7,30))', 0.58055556)
  is('=NETWORKDAYS(DATE(2012,10,1), DATE(2013,3,1))', 110)
  is('=NETWORKDAYS(DATE(2012,10,1), DATE(2013,3,1), DATE(2012,11,22))', 109)
  is('=WORKDAY(DATE(2008,10,1), 151) = DATE(2009,4,30)', true)
  is('=WORKDAY(DATE(2008,10,1), 151, {39778,39786,39834}) = DATE(2009,5,5)', true)
  is('=YEAR("2025-03-14")', 2025)
  is('=HOUR(TIME(18, 30, 0))', 18)
  is('=ISOWEEKNUM(DATE(2012,3,9))', 10)
  is('=DAYS("2021-03-15", "2021-02-01")', 42)
})

describe('financial', () => {
  near('=PMT(5%/12, 36, 10000)', -299.7089, 3)
  near('=FV(5%/12, 120, -100)', 15528.2279, 3)
  near('=PV(4%, 10, -1000)', 8110.8958, 3)
  near('=IPMT(10%/12, 1, 3*12, 8000)', -66.6667, 3)
  near('=IPMT(10%, 3, 3, 8000)', -292.4471, 3)
  near('=PPMT(10%/12, 1, 2*12, 2000)', -75.6231, 3)
  near('=CUMIPMT(9%/12, 30*12, 125000, 13, 24, 0)', -11135.23213, 3)
  near('=NPER(12%/12, -100, -1000, 10000, 1)', 59.6738657, 4)
  near('=RATE(4*12, -200, 8000)', 0.007701472, 7)
  near('=NPV(10%, -10000, 3000, 4200, 6800)', 1188.4434, 3)
  near('=IRR({-70000,12000,15000,18000,21000,26000})', 0.086630948, 6)
  near('=XNPV(0.09, {-10000,2750,4250,3250,2750}, {39448,39508,39751,39859,39904})', 2086.647602, 3)
  near('=XIRR({-10000,2750,4250,3250,2750}, {39448,39508,39751,39859,39904})', 0.373362535, 6)
  near('=EFFECT(5.25%, 4)', 0.053542667)
  near('=NOMINAL(5.3543%, 4)', 0.05250032, 6)
  is('=SLN(30000, 7500, 10)', 2250)
  is('=DDB(2400, 300, 10, 1)', 480)
  near('=DDB(2400, 300, 10, 10)', 22.1225, 3)
})

describe('errors explain themselves', () => {
  it('an unknown function says so', () => {
    const wb = new Workbook()
    const s = wb.sheets[0].id
    wb.setInput(s, 0, 0, '=SUMM(1,2)')
    expect(wb.getValue(s, 0, 0).detail).toMatch(/no function called SUMM/)
  })

  it('a wrong number of arguments shows the syntax', () => {
    const wb = new Workbook()
    const s = wb.sheets[0].id
    wb.setInput(s, 0, 0, '=ROUND(1)')
    expect(wb.getValue(s, 0, 0).detail).toMatch(/ROUND\(number, num_digits\)/)
  })
})

describe('the library', () => {
  it('documents every function', () => {
    for (const [name, f] of Object.entries(FUNCTIONS)) {
      expect(f.syntax, name).toMatch(/\(/)
      expect(f.summary.length, name).toBeGreaterThan(10)
      expect(typeof f.fn, name).toBe('function')
    }
  })
})

describe('LINEST with several x columns (multiple regression)', () => {
  // The office-building example in Microsoft's LINEST documentation.
  const data = [
    [2310, 2, 2, 20, 142000], [2333, 2, 2, 12, 144000], [2356, 3, 1.5, 33, 151000], [2379, 3, 2, 43, 150000],
    [2402, 2, 3, 53, 139000], [2425, 4, 2, 23, 169000], [2448, 2, 1.5, 99, 126000], [2471, 2, 2, 34, 142900],
    [2494, 3, 3, 23, 163000], [2517, 4, 4, 55, 169000], [2540, 2, 3, 22, 149000],
  ]
  function linest(formula) {
    const wb = new Workbook()
    const s = wb.sheets[0]
    wb.setCells(data.flatMap((r, i) => r.map((v, c) => ({ sheetId: s.id, row: i, col: c, input: String(v) }))))
    wb.setCells([{ sheetId: s.id, row: 20, col: 0, input: formula }])
    return wb.getCell(s.id, 20, 0).value.rows
  }

  it('finds the coefficients, last input first, then the intercept', () => {
    const [row] = linest('=LINEST(E1:E11, A1:D11)')
    const expected = [-234.2371645, 2553.21066, 12529.76817, 27.64138737, 52317.83051]
    row.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 4))
  })

  it('gives the statistics block', () => {
    const rows = linest('=LINEST(E1:E11, A1:D11, TRUE, TRUE)')
    expect(rows[1][0]).toBeCloseTo(13.26801148, 5) // standard error of the age coefficient
    expect(rows[1][4]).toBeCloseTo(12237.3616, 2) // of the intercept
    expect(rows[2][0]).toBeCloseTo(0.996747993, 8) // R²
    expect(rows[2][1]).toBeCloseTo(970.5784629, 4) // standard error of y
    expect(rows[3][0]).toBeCloseTo(459.7536742, 4) // F
    expect(rows[3][1]).toBe(6) // degrees of freedom
    expect(rows[4][0]).toBeCloseTo(1732393319, -1)
    expect(rows[4][1]).toBeCloseTo(5652135.316, 1)
    expect(rows[2][2].code).toBe('#N/A')
  })
})
