import { describe, expect, it } from 'vitest'
import { columnSummary, fitLinearModel, numericCell, parseDataset, tableCSV } from './dataset'

describe('scientific data workflow', () => {
  it('reads quoted delimiters, multiline cells and escaped quotes', () => {
    expect(parseDataset('x,y\r\n1,"two,\n""three"""').rows).toEqual([['1', 'two,\n"three"']])
    expect(parseDataset('x\ty\n1\t2').rows).toEqual([['1', '2']])
    expect(parseDataset('1;2\n3;4', { header: false }).columns).toEqual(['Column 1', 'Column 2'])
    expect(parseDataset('x,x,\n1,2,').columns).toEqual(['x', 'x (2)', 'Column 3'])
    expect(parseDataset('x\n""\n2').rows).toEqual([[''], ['2']])
  })
  it('rejects malformed records without guessing', () => {
    for (const input of ['x,y\n1', 'x,y\n1,"oops', 'x,y\n1,"a"b']) expect(() => parseDataset(input)).toThrow()
  })
  it('does not convert missing values or arbitrary strings to numbers', () => {
    for (const value of ['', ' ', '0x10', 'Infinity', '2kg']) expect(numericCell(value)).toBeNull()
    expect(numericCell('-2e2')).toBe(-200)
    const summary = columnSummary(parseDataset('x,y\n0,1\n,2\ntext,3\n2,4'), 0)
    expect(summary).toMatchObject({ count: 2, missing: 1, nonnumeric: 1, mean: 1, median: 1 })
    expect(summary.sampleSD).toBeCloseTo(Math.sqrt(2))
  })
  it('fits only training rows and reports held-out performance', () => {
    const model = fitLinearModel(parseDataset('x,y\n0,1\n1,3\n2,5\n3,7\n4,100\n,4'), 0, 1)
    expect(model).toMatchObject({ slope: 2, intercept: 1, rmse: 91, trainCount: 4, testCount: 1, excluded: 1 })
    expect(model.predictions[4]).toMatchObject({ prediction: 9, split: 'test', row: 4 })
    expect(() => fitLinearModel(parseDataset('x,y\n1,1\n1,2\n1,3\n1,4\n1,5'), 0, 1)).toThrow(/constant/)
  })
  it('exports exact CSV when requested and spreadsheet-safe text by default', () => {
    const d = parseDataset('x,y\n-2,"a,b"\n3,=1+2')
    expect(parseDataset(tableCSV(d.columns, d.rows, false))).toEqual(d)
    expect(tableCSV(d.columns, d.rows)).toContain("3,'=1+2")
    expect(tableCSV(d.columns, d.rows)).toContain('-2,')
  })
})
