// @vitest-environment happy-dom
// "This chart in D3": the generated code is run with the real d3 into a page, and what it draws is
// counted: one bar per value, one point per row, one line per series, and a histogram's bars holding
// exactly the counts of the spreadsheet chart's own bins.
import { describe, expect, it } from 'vitest'
import * as d3 from 'd3'
import { chartToD3 } from './chartCode.js'
import { histogramBins } from './chart.js'

function draw(code) {
  document.body.innerHTML = '<svg id="chart"></svg>'
  new Function('d3', code)(d3)
  return document.getElementById('chart')
}
const TOWNS = [['town', 'web', 'shop'], ['Leeds', 51, 63], ['York', 45, 55], ['Harrogate', 40, 47], ['Wakefield', null, 54]]

describe('This chart in D3', () => {
  it('a column chart: one bar per filled cell, every bar inside the chart and starting at zero', () => {
    const { code, marks } = chartToD3({ type: 'column', source: 'A1:C5' }, TOWNS)
    const svg = draw(code)
    const bars = [...svg.querySelectorAll('rect')]
    expect(bars.length).toBe(7)
    expect(marks).toBe(7)
    const bottoms = bars.map(b => Number(b.getAttribute('y')) + Number(b.getAttribute('height')))
    expect(new Set(bottoms.map(b => b.toFixed(6))).size).toBe(1) // all from one baseline
    expect(bars.every(b => Number(b.getAttribute('x')) >= 0)).toBe(true)
    expect(code).toContain('"Wakefield"')
  })

  it('a bar chart runs sideways: the widths carry the values', () => {
    const svg = draw(chartToD3({ type: 'bar', source: 'A1:B5' }, TOWNS.map(r => r.slice(0, 2))).code)
    const widths = [...svg.querySelectorAll('rect')].map(b => Number(b.getAttribute('width')))
    expect(widths.length).toBe(3)
    expect(widths[0] / widths[1]).toBeCloseTo(51 / 45, 6)
  })

  it('a line chart: one path per series (besides the two axis lines), with a gap for the empty cell', () => {
    const svg = draw(chartToD3({ type: 'line', source: 'A1:C5' }, TOWNS).code)
    const lines = [...svg.querySelectorAll('g[stroke-width="2"] path')] // the axes' groups have fill none too
    expect(lines.length).toBe(2)
    expect(lines[0].getAttribute('d')).toMatch(/^M.*L.*L/)
  })

  it('a scatter chart: one circle per row and series, x from a number scale', () => {
    const rows = [['x', 'y'], ...Array.from({ length: 30 }, (_, i) => [i, i * i])]
    const { code, marks } = chartToD3({ type: 'scatter', source: 'A1:B31' }, rows)
    const circles = [...draw(code).querySelectorAll('circle')]
    expect(circles.length).toBe(30)
    expect(marks).toBe(30)
    expect(Number(circles[29].getAttribute('cx'))).toBeGreaterThan(Number(circles[0].getAttribute('cx')))
    expect(Number(circles[29].getAttribute('cy'))).toBeLessThan(Number(circles[0].getAttribute('cy'))) // up the page
  })

  it('a histogram: the same bins as the spreadsheet’s chart, by each rule', () => {
    const values = Array.from({ length: 200 }, (_, i) => Math.round(100 * Math.sin(i) ** 2 + i / 4))
    for (const binRule of [undefined, 'fd', 'sturges']) {
      const { code, marks } = chartToD3({ type: 'histogram', source: 'A1:A201', binRule }, [['v'], ...values.map(v => [v])])
      const bars = [...draw(code).querySelectorAll('rect')]
      const { bins } = histogramBins(values, null, binRule)
      expect(bars.length, binRule).toBe(bins.length)
      expect(marks).toBe(bins.length)
      expect(bars.map(b => b.__data__.length), binRule).toEqual(bins.map(b => b.count))
    }
  })

  it('a pie: one slice per positive value, none for the empty cell', () => {
    const svg = draw(chartToD3({ type: 'pie', source: 'A1:B5' }, TOWNS.map(r => r.slice(0, 2))).code)
    expect(svg.querySelectorAll('path').length).toBe(3)
  })

  it('nothing to draw gives null, and awkward names stay text', () => {
    expect(chartToD3({ type: 'column', source: 'A1:A2' }, [['a'], ['b']])).toBeNull()
    const { code } = chartToD3({ type: 'column', source: 'A1:B2', title: 'It\'s "fine"\nsvg.remove()' }, [['name', 'n'], ['</script>`${x}`', 3]])
    expect(draw(code).querySelectorAll('rect').length).toBe(1)
  })
})
