// "This chart in D3": the JavaScript that draws a chart like the selected one with D3, the library
// behind most charts on the web, so a chart made in the sheet can be taken to a web page and read
// line by line. The data is copied in; the scales, axes and marks are the ones D3 users write.
// Histograms use this lab's own bins (the same rule as the chart), so the bars are the same.
import { histogramBins, readSeries } from './chart.js'

const json = (v) => JSON.stringify(v)
const numberOrNull = (v) => (Number.isFinite(v) ? v : null)

const oneLine = (text) => String(text).replace(/\s+/g, ' ') // inside a // comment, a line break would end it
const HEAD = (chart, note) => [
  `// ${chart.title ? oneLine(chart.title) + ': a' : 'A'} ${chart.type} chart, made by the Spreadsheet Lab from ${oneLine(chart.source)}.`,
  '// Paste it into a page that loads D3 (https://d3js.org) and has <svg id="chart"></svg> on it.',
  ...(note ? [`// ${note}`] : []),
]
const FRAME = [
  'const width = 640, height = 400',
  'const margin = { top: 20, right: 20, bottom: 40, left: 56 }',
  "const svg = d3.select('#chart').attr('viewBox', [0, 0, width, height]).style('font', '12px sans-serif')",
]
const AXES = (x, y) => [
  '// The axes are drawn from the scales: D3 picks the ticks.',
  `svg.append('g').attr('transform', \`translate(0,\${height - margin.bottom})\`).call(d3.axisBottom(${x}))`,
  `svg.append('g').attr('transform', \`translate(\${margin.left},0)\`).call(d3.axisLeft(${y}))`,
]
const COLOURS = "const colour = d3.scaleOrdinal(series, d3.schemeTableau10) // one colour per series"

// Returns { code, marks }: the code, and how many marks (bars, points, slices, lines) it draws, which
// the tests check by running it. null when the chart has nothing to draw.
export function chartToD3(chart, values) {
  const data = readSeries(values ?? [], chart.type)
  const series = data.series.slice(0, 8)
  if (!series.length || series.every((s) => s.values.every((v) => v === null))) return null
  const names = series.map((s) => s.name)
  const labels = data.categories.map((c) => (typeof c === 'number' ? c : String(c)))
  const rows = labels.map((label, i) => ({ label, values: series.map((s) => numberOrNull(s.values[i])) }))
  const lines = []

  if (chart.type === 'histogram') {
    const all = data.series.flatMap((s) => s.values).filter(Number.isFinite)
    const { bins } = histogramBins(all, chart.bins || null, chart.binRule)
    const edges = [bins[0].from, ...bins.map((b) => b.to)]
    lines.push(...HEAD(chart, 'Each bar counts the values in one bin; the bin edges are the ones the spreadsheet chose.'),
      `const values = ${json(all)}`,
      `const edges = ${json(edges)}`,
      ...FRAME,
      '// d3.bin puts each value in the bin whose edges hold it; thresholds are the inside edges.',
      'const bins = d3.bin().domain([edges[0], edges.at(-1)]).thresholds(edges.slice(1, -1))(values)',
      'const x = d3.scaleLinear().domain([edges[0], edges.at(-1)]).range([margin.left, width - margin.right])',
      'const y = d3.scaleLinear().domain([0, d3.max(bins, (b) => b.length)]).nice().range([height - margin.bottom, margin.top])',
      "svg.append('g').attr('fill', 'steelblue').selectAll('rect').data(bins).join('rect')",
      "  .attr('x', (b) => x(b.x0) + 1).attr('width', (b) => Math.max(0, x(b.x1) - x(b.x0) - 1))",
      "  .attr('y', (b) => y(b.length)).attr('height', (b) => y(0) - y(b.length))",
      ...AXES('x', 'y'))
    return { code: lines.join('\n') + '\n', marks: bins.length }
  }

  if (chart.type === 'pie') {
    const slices = rows.filter((r) => r.values[0] > 0)
    lines.push(...HEAD(chart, `Only "${names[0]}" is drawn: a pie shows one series.`),
      `const data = ${json(slices.map((r) => ({ label: r.label, value: r.values[0] })))}`,
      ...FRAME,
      "const colour = d3.scaleOrdinal(data.map((d) => d.label), d3.schemeTableau10)",
      '// d3.pie turns the values into angles; d3.arc turns each angle into a slice shape.',
      'const arcs = d3.pie().value((d) => d.value).sort(null)(data)',
      'const arc = d3.arc().innerRadius(0).outerRadius(Math.min(width, height) / 2 - 20)',
      "svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`)",
      "  .selectAll('path').data(arcs).join('path').attr('d', arc).attr('fill', (a) => colour(a.data.label))",
      "  .append('title').text((a) => `${a.data.label}: ${a.data.value}`)")
    return { code: lines.join('\n') + '\n', marks: slices.length }
  }

  const xNumeric = chart.type === 'scatter' || (chart.type === 'line' && data.xIsNumber && labels.every((l) => typeof l === 'number'))
  lines.push(...HEAD(chart),
    `const series = ${json(names)}`,
    `// One row per ${xNumeric ? 'point: x, then a value for each series' : 'category: its label, then a value for each series'} (null where a cell is empty).`,
    `const data = ${json(rows)}`,
    ...FRAME,
    COLOURS,
    "const values = data.flatMap((d) => d.values).filter((v) => v !== null)")

  if (chart.type === 'column' || chart.type === 'bar') {
    const across = chart.type === 'column'
    const cat = across ? '[margin.left, width - margin.right]' : '[margin.top, height - margin.bottom]'
    const val = across ? '[height - margin.bottom, margin.top]' : '[margin.left, width - margin.right]'
    lines.push('// A band scale gives each category an equal slice of the axis; a second one splits it between the series.',
      `const outer = d3.scaleBand().domain(data.map((d) => d.label)).range(${cat}).padding(0.2)`,
      'const inner = d3.scaleBand().domain(series).range([0, outer.bandwidth()]).padding(0.05)',
      '// Bars start at zero, so their lengths compare honestly.',
      `const value = d3.scaleLinear().domain([Math.min(0, d3.min(values)), Math.max(0, d3.max(values))]).nice().range(${val})`,
      "svg.append('g').selectAll('g').data(data).join('g')",
      `  .attr('transform', (d) => \`translate(${across ? '${outer(d.label)},0' : '0,${outer(d.label)}'})\`)`,
      "  .selectAll('rect').data((d) => d.values.map((v, i) => ({ series: series[i], v })).filter((b) => b.v !== null)).join('rect')",
      ...(across
        ? ["  .attr('x', (b) => inner(b.series)).attr('width', inner.bandwidth())", "  .attr('y', (b) => value(Math.max(0, b.v))).attr('height', (b) => Math.abs(value(b.v) - value(0)))"]
        : ["  .attr('y', (b) => inner(b.series)).attr('height', inner.bandwidth())", "  .attr('x', (b) => value(Math.min(0, b.v))).attr('width', (b) => Math.abs(value(b.v) - value(0)))"]),
      "  .attr('fill', (b) => colour(b.series))",
      ...AXES(across ? 'outer' : 'value', across ? 'value' : 'outer'))
    return { code: lines.join('\n') + '\n', marks: rows.reduce((n, r) => n + r.values.filter((v) => v !== null).length, 0) }
  }

  // Line and scatter: x is a number scale, or (a line over text categories) a point scale.
  lines.push(xNumeric
    ? 'const x = d3.scaleLinear().domain(d3.extent(data, (d) => d.label)).nice().range([margin.left, width - margin.right])'
    : 'const x = d3.scalePoint().domain(data.map((d) => d.label)).range([margin.left, width - margin.right]).padding(0.5)',
  'const y = d3.scaleLinear().domain(d3.extent(values)).nice().range([height - margin.bottom, margin.top])')
  if (chart.type === 'scatter') {
    lines.push('// One circle per row and series, at (x, y).',
      'const points = data.flatMap((d) => d.values.map((v, i) => ({ x: d.label, v, series: series[i] }))).filter((p) => p.v !== null)',
      "svg.append('g').selectAll('circle').data(points).join('circle')",
      "  .attr('cx', (p) => x(p.x)).attr('cy', (p) => y(p.v)).attr('r', 3.5).attr('fill', (p) => colour(p.series))",
      ...AXES('x', 'y'))
    return { code: lines.join('\n') + '\n', marks: rows.reduce((n, r) => n + r.values.filter((v) => v !== null).length, 0) }
  }
  lines.push('// d3.line turns the points into one path per series; .defined leaves a gap at an empty cell.',
    'const line = (i) => d3.line().defined((d) => d.values[i] !== null).x((d) => x(d.label)).y((d) => y(d.values[i]))(data)',
    "svg.append('g').attr('fill', 'none').attr('stroke-width', 2).selectAll('path').data(series).join('path')",
    "  .attr('stroke', (s) => colour(s)).attr('d', (s, i) => line(i))",
    ...AXES('x', 'y'))
  return { code: lines.join('\n') + '\n', marks: series.length }
}
