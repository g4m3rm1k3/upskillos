import { describe, expect, it } from 'vitest'
import { BIN_RULES, chartAdvice, currentRegion, histogramBins, linearFit, niceTicks, readSeries, recommendChart, ruleWidth } from './chart.js'

describe('reading a block of cells as series', () => {
  it('takes names from a header row and categories from a text column', () => {
    const r = readSeries([[null, 'Sales', 'Costs'], ['Jan', 10, 4], ['Feb', 12, 5]])
    expect(r.categories).toEqual(['Jan', 'Feb'])
    expect(r.series).toEqual([{ name: 'Sales', values: [10, 12] }, { name: 'Costs', values: [4, 5] }])
  })

  it('numbers the points when there is no category column', () => {
    const r = readSeries([[3], [1], [4]])
    expect(r.categories).toEqual([1, 2, 3])
    expect(r.series).toEqual([{ name: 'Series 1', values: [3, 1, 4] }])
  })

  it('uses the first column as x for a scatter chart', () => {
    const r = readSeries([['Height', 'Weight'], [150, 50], [170, 65]], 'scatter')
    expect(r.categories).toEqual([150, 170])
    expect(r.series[0]).toEqual({ name: 'Weight', values: [50, 65] })
  })

  it('treats years with a blank corner as categories, as Excel does', () => {
    const r = readSeries([[null, 'Population'], [2000, 6.1], [2010, 6.9]])
    expect(r.categories).toEqual([2000, 2010])
    expect(r.series).toHaveLength(1)
  })

  it('says when text inside the data was left out', () => {
    const r = readSeries([['Name', 'Score'], ['Ann', 9], ['Bo', 'absent']])
    expect(r.series[0].values).toEqual([9, null])
    expect(r.notes.join(' ')).toMatch(/1 text value was left out/)
  })
})

describe('recommending a chart', () => {
  it('suggests a column chart for labelled amounts', () => {
    expect(recommendChart([['Fruit', 'Sold'], ['Apples', 5], ['Pears', 3]]).type).toBe('column')
  })
  it('suggests a scatter chart for two columns of measurements', () => {
    expect(recommendChart([['x', 'y'], [1, 2], [2, 4.1], [3, 5.9]]).type).toBe('scatter')
  })
  it('suggests a line chart over years', () => {
    expect(recommendChart([['Year', 'Rain'], [2020, 5], [2021, 7], [2022, 6]]).type).toBe('line')
  })
  it('suggests a histogram for one long column of numbers', () => {
    expect(recommendChart(Array.from({ length: 30 }, (_, i) => [i % 7])).type).toBe('histogram')
  })
})

describe('chart maths', () => {
  it('chooses round axis ticks', () => {
    expect(niceTicks(0, 23)).toEqual([0, 5, 10, 15, 20, 25])
    expect(niceTicks(0.1, 0.9)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1])
    expect(niceTicks(-3, 7)).toEqual([-4, -2, 0, 2, 4, 6, 8])
  })

  it('bins every value once, the maximum included', () => {
    const values = [1, 2, 2, 3, 3, 3, 4, 4, 5, 10]
    const { bins } = histogramBins(values)
    expect(bins.reduce((s, b) => s + b.count, 0)).toBe(values.length)
    expect(bins[0].from).toBeLessThanOrEqual(1)
    expect(bins.at(-1).to).toBeGreaterThanOrEqual(10)
  })

  it('has three bin-width rules, worked by hand for the numbers 1 to 100', () => {
    const v = Array.from({ length: 100 }, (_, i) => i + 1)
    // Sturges: range 99 over log2(100) rounded up, plus 1: 99 / 8.
    expect(ruleWidth(v, 'sturges')).toBeCloseTo(99 / 8, 10)
    // Scott: 3.5 × the sample standard deviation (√(100·101/12) = 29.0115) over ∛100.
    expect(ruleWidth(v, 'scott')).toBeCloseTo((3.5 * Math.sqrt((100 * 101) / 12)) / Math.cbrt(100), 10)
    // Freedman–Diaconis: the quartiles by PERCENTILE.INC are 25.75 and 75.25, so 2 × 49.5 over ∛100.
    expect(ruleWidth(v, 'fd')).toBeCloseTo((2 * 49.5) / Math.cbrt(100), 10)
    expect(Object.keys(BIN_RULES)).toEqual(['scott', 'fd', 'sturges'])
    expect(histogramBins(v, null, 'sturges').width).toBe(20) // 12.375 rounded up to a readable step
    expect(histogramBins(v).width).toBe(25) // Scott, the default: 21.9 rounded up
  })

  it('Freedman–Diaconis is not thrown by one huge value; Scott is', () => {
    const v = [...Array.from({ length: 100 }, (_, i) => i + 1), 1e6]
    expect(ruleWidth(v, 'scott')).toBeGreaterThan(70000)
    expect(ruleWidth(v, 'fd')).toBeLessThan(25)
    const { bins } = histogramBins(v, null, 'fd')
    expect(bins.reduce((s, b) => s + b.count, 0)).toBe(101)
    expect(bins.length).toBeLessThanOrEqual(201) // capped: a width of 21 over a million would be 47,000 bars
  })

  it('uses a chosen number of bins', () => {
    const { bins } = histogramBins([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5)
    expect(bins.map((b) => b.count)).toEqual([2, 2, 2, 2, 3])
  })

  it('fits a straight line the way Excel\'s SLOPE, INTERCEPT and RSQ do', () => {
    // The examples in Excel's help: SLOPE and RSQ of y {2,3,9,1,8,7,5} on
    // x {6,5,11,7,5,4,4} are 0.305556 and 0.05795; INTERCEPT of y {2,3,9,1,8}
    // on x {6,5,11,7,5} is 0.0483871.
    const fit = linearFit([6, 5, 11, 7, 5, 4, 4], [2, 3, 9, 1, 8, 7, 5])
    expect(fit.slope).toBeCloseTo(0.305556, 5)
    expect(fit.r2).toBeCloseTo(0.05795, 4)
    expect(linearFit([6, 5, 11, 7, 5], [2, 3, 9, 1, 8]).intercept).toBeCloseTo(0.0483871, 6)
  })
})

describe('current region', () => {
  it('grows from one cell to the surrounding block, stopping at empty rows and columns', () => {
    const filled = new Set(['1,1', '1,2', '2,1', '2,2', '3,1', '3,2', '6,6'])
    const has = (r, c) => filled.has(r + ',' + c)
    expect(currentRegion(has, 2, 2)).toEqual({ r1: 1, c1: 1, r2: 3, c2: 2 })
    expect(currentRegion(has, 6, 6)).toEqual({ r1: 6, c1: 6, r2: 6, c2: 6 })
  })
})

describe('advice about the chosen chart', () => {
  it('warns when a line joins things that have no order', () => {
    const data = readSeries([['Fruit', 'Sold'], ['Apples', 5], ['Pears', 3]], 'line')
    expect(chartAdvice('line', data).join(' ')).toMatch(/column chart is more honest/)
    const months = readSeries([['Month', 'Sold'], ['Jan', 5], ['Feb', 3]], 'line')
    expect(chartAdvice('line', months)).toEqual([])
  })

  it('explains what a pie leaves out', () => {
    const data = readSeries([['', 'A', 'B'], ['x', 5, 1], ['y', -2, 1]], 'pie')
    const advice = chartAdvice('pie', data).join(' ')
    expect(advice).toMatch(/only "A" is drawn/)
    expect(advice).toMatch(/Negative values/)
  })
})
