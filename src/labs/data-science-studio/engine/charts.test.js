// The lessons' hand-written chart maths against the tools: D3's own scales, ticks and colour
// interpolation, and the Spreadsheet Lab's chart engine (its bin-width rules and nice ticks).
import { describe, expect, it } from 'vitest'
import * as d3 from 'd3'
import * as G from './charts.js'
import { Rng } from './data.js'
import { niceTicks as sheetTicks, ruleWidth } from '../../spreadsheet-lab/engine/chart.js'

describe('the chart maths agrees with D3', () => {
  it('ticks: exactly d3.ticks, on a thousand random ranges and counts', () => {
    const rng = new Rng(4)
    for (let k = 0; k < 1000; k++) {
      const lo = (rng.random() - 0.5) * 10 ** (rng.below(8) - 3), span = rng.random() * 10 ** (rng.below(8) - 3) + 1e-6, count = 2 + rng.below(12)
      expect(G.niceTicks(lo, lo + span, count), `${lo} ${lo + span} ${count}`).toEqual(d3.ticks(lo, lo + span, count))
    }
  })
  it('scales: linear, log and square root, and the inverse', () => {
    const y = d3.scaleLinear([0, 120], [300, 20]), log = d3.scaleLog([1, 1000], [0, 300]), r = d3.scaleSqrt([0, 114], [0, 40])
    for (const x of [0, 13, 87, 114, 120]) expect(G.linearScale(0, 120, 300, 20, x)).toBeCloseTo(y(x), 10)
    for (const p of [20, 155.5, 300]) expect(G.invert(0, 120, 300, 20, p)).toBeCloseTo(y.invert(p), 10)
    for (const x of [1, 6.37, 45, 409.5, 1000]) expect(G.logScale(1, 1000, 0, 300, x)).toBeCloseTo(log(x), 10)
    for (const v of [0, 87, 100, 114]) expect(G.radiusFor(v, 114, 40)).toBeCloseTo(r(v), 10)
  })
  it('colour: mix gives what d3.interpolateRgb gives', () => {
    const blue = d3.interpolateRgb('rgb(255, 255, 255)', 'rgb(8, 48, 107)')
    for (const t of [0, 0.1, 0.25, 0.5, 0.77, 1]) expect(`rgb(${G.mix([255, 255, 255], [8, 48, 107], t).join(', ')})`).toBe(blue(t))
  })
  it('bins: d3.bin with the same edges counts what histogram counts', () => {
    const rng = new Rng(9), values = Array.from({ length: 500 }, () => rng.below(10000))
    const edges = d3.range(0, 10001, 500)
    const bins = d3.bin().domain([0, 10000]).thresholds(edges.slice(1, -1))(values)
    expect(bins.map(b => b.length)).toEqual(G.histogram(values, 0, 500, 20))
  })
})

describe('the chart maths agrees with the Spreadsheet Lab', () => {
  const rng = new Rng(21), values = Array.from({ length: 300 }, () => 20 + rng.random() * 10)
  it('its bin-width rules are the ones the lessons derive', () => {
    expect(ruleWidth(values, 'scott')).toBeCloseTo(G.scottWidth(values), 10)
    expect(ruleWidth(values, 'fd')).toBeCloseTo(G.freedmanDiaconisWidth(values), 10)
    expect(ruleWidth(values, 'sturges')).toBeCloseTo((Math.max(...values) - Math.min(...values)) / G.sturges(values.length), 10)
  })
  it('its ticks use the same steps, plus 2.5, rounding up instead of to the nearest', () => {
    // 0 to 114 in about 5: D3 takes 20 (nearest to 22.8 on a log scale), the spreadsheet 25 (the first step ≥ 22.8).
    expect(G.niceTicks(0, 114, 5)).toEqual([0, 20, 40, 60, 80, 100])
    expect(sheetTicks(0, 114, 5)).toEqual([0, 25, 50, 75, 100, 125])
  })
  it('a density integrates to 1', () => {
    expect(G.kdeArea(values, G.silverman(values))).toBeCloseTo(1, 4)
    expect(G.kdeArea([1, 2, 50], 0.5)).toBeCloseTo(1, 4)
  })
})
