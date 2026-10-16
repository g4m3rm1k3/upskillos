// Part 4: charts with D3. A chart as a function from data to marks; scales, the data join, ticks and
// axes, histograms and bin widths, log and square-root scales, densities, colour, charts that
// mislead, and small multiples. The maths is written in Python first (python/charts.py, held to
// engine/charts.js by parity.test.js, and to D3 and the Spreadsheet Lab by charts.test.js); then the
// learner draws each chart with D3 in a "chart" block, checked mark by mark against the lab's own.
import * as T from '../engine/tables.js'
import * as C from '../engine/cleaning.js'
import * as G from '../engine/charts.js'
import { ORDERS_CSV, CATALOGUE_CSV } from '../engine/data.js'
import { evaluateFormula } from '../engine/sheet.js'
import { niceTicks as sheetTicks } from '../../spreadsheet-lab/engine/chart.js'

const cases = (fn, inputs) => inputs.map(args => ({ args, expected: fn(...args) }))
const sheet = formula => evaluateFormula('orders', formula).value
const money = x => `£${x.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const ROWS = T.readCsv(ORDERS_CSV())
const LIST = Object.fromEntries(T.readCsv(CATALOGUE_CSV()).map(r => [r.item, T.toPence(r.list_price)]))
const CLEAN = C.cleanOrders(ROWS, LIST)
const PRICED = CLEAN.filter(r => r.price !== null)
const BY_TOWN = C.TOWNS.map(town => ({ town, orders: CLEAN.filter(r => r.town === town).length }))
const WEB_TOP3 = C.TOWNS.map(town => ({ town, orders: CLEAN.filter(r => r.town === town && r.channel === 'web').length })).sort((a, b) => b.orders - a.orders).slice(0, 3)
const LIGHTS = PRICED.filter(r => r.item === 'Lights, front and back').map(r => r.price / 100)
const LIGHTS_PENCE = PRICED.filter(r => r.item === 'Lights, front and back').map(r => r.price)
const ALL_PRICES = PRICED.map(r => r.price / 100)
const TAKINGS = Object.entries(PRICED.reduce((t, r) => ({ ...t, [r.item]: (t[r.item] ?? 0) + (r.price * r.quantity) / 100 }), {})).map(([item, takings]) => ({ item, takings: Math.round(takings * 100) / 100 }))
const MONTHLY = C.TOWNS.flatMap(town => Array.from({ length: 12 }, (_, m) => ({ town, month: m + 1, orders: CLEAN.filter(r => r.town === town && Number(r.date.slice(5, 7)) === m + 1).length })))
const H = Math.round(G.silverman(LIGHTS) * 100) / 100
const LEEDS = BY_TOWN[0].orders, HARROGATE = BY_TOWN.find(t => t.town === 'Harrogate').orders
const LIE = G.lieFactor(HARROGATE, LEEDS, HARROGATE - 80, LEEDS - 80)

// The marks of a chart block's solution, for the tests' `verify` (lessons/charts.test.js runs it).
const y120 = v => G.linearScale(0, 120, 270, 20, v)
const near = (a, b) => Math.abs(a - b) < 1e-6
// Where d3's .nice() ends a domain that starts at 0: the top rounded up to a whole step (about 10 ticks).
const niceTop = top => { const [p, f] = G.stepSize(0, top, 10), step = f * 10 ** p; return Math.ceil(top / step) * step }

const BARS = `const x = d3.scaleBand().domain(data.map(d => d.town)).range([40, 460]).padding(0.2)
const y = d3.scaleLinear().domain([0, 120]).range([270, 20])
svg.selectAll('rect')
  .data(data)
  .join('rect')
  .attr('x', d => x(d.town))
  .attr('width', x.bandwidth())
  .attr('y', d => y(d.orders))
  .attr('height', d => y(0) - y(d.orders))
  .attr('fill', 'steelblue')
`

export const PART4 = {
  id: 'part4', title: 'Part 4 · Charts with D3', lessons: [
    {
      id: 'chart-is-a-function', number: '4.1', title: 'A chart is a function',
      goal: 'Name a chart’s marks and channels, derive a linear scale and its inverse, and draw a bar chart with D3 from the clean orders.',
      builds: ['clean-year'],
      blocks: [
        { h: 'Marks and channels' },
        { md: `A chart turns rows into **marks** (bars, dots, lines, areas) and turns each value into a **channel** of a mark: its position, its length, its area, its colour. A bar chart of orders per town makes one bar per town; the town sets its position along the bottom, and the number of orders sets its length.

Channels are not equally easy to read. Cleveland and McGill (1984) measured how well people compare values shown each way: **position on a common scale** is read most accurately, then length, then angle and area, and colour worst. So the most important comparison in a chart goes on position. That is why bars beat pies (lesson 4.5 measures why).` },
        { h: 'A scale is a function' },
        { md: `To draw the bars, each count needs a pixel. A **scale** is the function that does it: it maps the **domain** (the data, 0 to 120 orders) onto the **range** (the pixels, here from 270 at the bottom to 20 at the top, because screen y grows downwards). A value a fraction $t$ of the way along the domain lands the same fraction $t$ along the range.` },
        { figure: 'ScaleExplorer', caption: 'Drag the value: it is the same fraction of the way along the domain and along the range. Flip the range to see why bars use 270 → 20.' },
        {
          derive: {
            title: 'The linear scale, and back again',
            intro: 'Domain $a$ to $b$, range $p$ to $q$.',
            steps: [
              { prompt: 'How far along the domain is $x$, as a fraction $t$ (0 at $a$, 1 at $b$)?', answer: '(x-a)/(b-a)', vars: { x: [-10, 10], a: [-10, 0], b: [1, 10] }, why: 'The distance from $a$ over the whole length.' },
              { prompt: 'The pixel: the same fraction $t$ of the way from $p$ to $q$. Write it in terms of $x$, $a$, $b$, $p$, $q$.', answer: 'p+(x-a)/(b-a)*(q-p)', vars: { x: [-10, 10], a: [-10, 0], b: [1, 10], p: [0, 100], q: [200, 400] }, why: '$p + t(q - p)$. With $q < p$ (screen y) the same formula runs upwards.' },
              { prompt: 'Run it backwards: the value at pixel $y$, in terms of $y$, $a$, $b$, $p$, $q$.', answer: 'a+(y-p)/(q-p)*(b-a)', vars: { y: [0, 300], a: [-10, 0], b: [1, 10], p: [0, 100], q: [200, 400] }, why: 'The fraction along the range, then the same fraction along the domain: `invert`. D3 uses it to turn a mouse position back into a value.' },
              { prompt: `On the domain 0 to 120 and the range 270 to 20: at which pixel does the top of Leeds’ bar (${LEEDS} orders) go?`, number: y120(LEEDS), compute: () => G.linearScale(0, 120, 270, 20, LEEDS), tolerance: 1e-9, why: `$270 + \\frac{${LEEDS}}{120}(20 - 270) = ${y120(LEEDS)}$: ${(270 - y120(LEEDS)).toFixed(2)} pixels above the bottom.` },
            ],
          },
        },
        {
          code: {
            file: 'charts.py', fn: 'linear_scale', notes: [
              ['t = (x - d0) / (d1 - d0)', ['The fraction along the domain.']],
              ['return r0 + t * (r1 - r0)', ['The same fraction along the range.']],
            ],
          },
        },
        {
          write: {
            file: 'charts.py', fn: 'linear_scale',
            prompt: 'Write `linear_scale(d0, d1, r0, r1, x)`: the pixel for `x` on the domain `d0`…`d1` and the range `r0`…`r1`.',
            starter: 'def linear_scale(d0, d1, r0, r1, x):\n    # the fraction along the domain, then along the range\n    return r0\n',
            cases: cases(G.linearScale, [[0, 120, 270, 20, 114], [0, 120, 270, 20, 0], [0, 10, 0, 500, 2.5], [-5, 5, 100, 0, 1]]),
            hint: '`t = (x - d0) / (d1 - d0)`, then `r0 + t * (r1 - r0)`.',
          },
        },
        {
          code: {
            file: 'charts.py', fn: 'invert', notes: [
              ['t = (y - r0) / (r1 - r0)', ['The derivation’s last step: the fraction along the range first.']],
            ],
          },
        },
        {
          formula: {
            table: 'orders', solution: '=SUMPRODUCT(--(PROPER(TRIM(C2:C403))="Leeds"))', must: ['SUMPRODUCT', 'TRIM'],
            prompt: 'Each bar’s length comes from a count. In the spreadsheet, count the Leeds orders with the town cleaned first, as in lesson 3.1. (The two repeated rows are both from Wakefield, so they don’t touch this count.)',
            hint: '`=SUMPRODUCT(--(PROPER(TRIM(C2:C403))="Leeds"))`',
            explain: `${sheet('=SUMPRODUCT(--(PROPER(TRIM(C2:C403))="Leeds"))')}: the height of the first bar, in orders. The y scale turns it into pixels.`,
          },
        },
        { h: 'Draw it' },
        { md: `D3 has the scales built in. \`d3.scaleLinear().domain([0, 120]).range([270, 20])\` is your \`linear_scale\`, made into a function of one value. \`d3.scaleBand\` splits the width into equal bands, one per town, with a gap between (\`padding\`).

Then the bars: \`svg.selectAll('rect').data(data).join('rect')\` makes one \`<rect>\` per row of \`data\` (lesson 4.2 explains how), and each \`.attr(name, d => …)\` sets an attribute from that row. An SVG rectangle is placed by its top-left corner (\`x\`, \`y\`) and its size; since y grows downwards, the top of a bar is \`y(d.orders)\` and its height is \`y(0) - y(d.orders)\`.` },
        {
          chart: {
            prompt: 'Draw the orders per town as bars. The x scale is written for you. Make the y scale (0 orders at pixel 270, 120 orders at pixel 20), then give each bar its `y` and `height`.',
            data: BY_TOWN,
            starter: `const x = d3.scaleBand().domain(data.map(d => d.town)).range([40, 460]).padding(0.2)
// y: 0 orders at pixel 270 (the bottom), 120 orders at pixel 20 (the top)
const y = null
svg.selectAll('rect')
  .data(data)
  .join('rect')
  .attr('x', d => x(d.town))
  .attr('width', x.bandwidth())
  // the top of the bar, and its height down to 0
  .attr('fill', 'steelblue')
`,
            solution: BARS,
            checks: [{ select: 'rect', attrs: ['x', 'y', 'width', 'height'] }],
            verify: marks => marks.rect.every((m, k) => near(m.y, y120(BY_TOWN[k].orders)) && near(m.y + m.height, 270)),
            hint: '`const y = d3.scaleLinear().domain([0, 120]).range([270, 20])`, then `.attr(\'y\', d => y(d.orders)).attr(\'height\', d => y(0) - y(d.orders))`.',
            explain: `Each bar’s top is at \`y(orders)\`, exactly your \`linear_scale(0, 120, 270, 20, orders)\`: Leeds at ${y120(LEEDS)}. The tests check every bar against the Python.`,
          },
        },
        {
          choice: {
            prompt: 'You want readers to compare the four towns’ orders as accurately as possible. Which channel should carry the number?',
            options: [
              { text: 'Colour: four shades of blue.', why: 'Colour is the channel people judge least accurately: four shades are hard to put in order, let alone compare.' },
              { text: 'Position along a common scale, as the tops of bars on one axis.', why: 'Yes: Cleveland and McGill’s experiments put position on a common scale first. Bars use it twice: the top’s position, and the length from zero.' },
              { text: 'Area: a circle per town.', why: 'Area is judged poorly, and people underestimate how much bigger a larger area is (lesson 4.5).' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'data-join', number: '4.2', title: 'The data join',
      goal: 'Explain how D3 matches rows to marks (enter, update, exit), and give a join a key so each mark stays with its row when the data changes.',
      builds: ['chart-is-a-function'],
      blocks: [
        { h: 'Rows meet marks' },
        { md: `\`svg.selectAll('rect').data(data)\` **joins** the rows to the rectangles already there. D3 pairs them up and sorts them into three groups:

- **update**: a row that found a rectangle: it keeps it, and the attributes are set again;
- **enter**: a row with no rectangle yet: one is made (\`.join('rect')\` appends it);
- **exit**: a rectangle with no row left: it is removed.

The first time, every row enters. The point of the join shows when the data **changes**: only what changed is added or removed, and an animation can move each bar from where it was to where it goes.` },
        { figure: 'JoinStepper', caption: 'Change the data and watch each bar enter, update or exit. Switch between joining by position and by key.' },
        { h: 'Joining by key' },
        { md: `Without a key, the join pairs by **position**: the first row with the first rectangle, and so on. If the new data is in a different order, or one row is missing, the rectangle that showed Harrogate is now given Wakefield's row: the marks are reused, but for different things, and an animation would show bars changing into other bars.

A **key function**, \`.data(data, d => d.town)\`, pairs by name: Wakefield's row finds Wakefield's rectangle wherever it is. That is a join in the sense of Part 3: the marks are one table, the rows another, and the key is \`town\`. Rows with no partner enter; marks with no partner exit (an anti-join, lesson 3.8).` },
        {
          chart: {
            prompt: `This code is drawn twice: first with the year’s orders per town, then with the three towns with the most web orders (${WEB_TOP3.map(t => t.town).join(', ')}). It joins by position, so when the data changes, a bar for one town is handed to another. Give the join a key, so every bar stays with its town.`,
            runs: [BY_TOWN, WEB_TOP3], keep: 'town',
            starter: BARS,
            solution: BARS.replace(".data(data)\n", ".data(data, d => d.town)\n"),
            checks: [{ select: 'rect', attrs: ['x', 'y', 'width', 'height'] }],
            hint: 'The second argument of `.data` is the key: `.data(data, d => d.town)`.',
            explain: 'Both versions draw the same final picture: the difference is *which* rectangle shows which town. With the key, Harrogate’s rectangle exits and the other three update, each in its new place. Without it, the third rectangle (Harrogate’s) was given Wakefield, and Wakefield’s own rectangle was removed.',
          },
        },
        {
          predict: {
            prompt: `With the key, how many rectangles **exit** when the data changes from the four towns to the three with the most web orders?`,
            answer: 1, compute: () => C.antiJoin(BY_TOWN, WEB_TOP3, 'town').length,
            explain: `One: ${C.antiJoin(BY_TOWN, WEB_TOP3, 'town').map(t => t.town).join('')}, the anti-join of the old rows with the new. None enter (every new town already had a bar), three update.`,
          },
        },
        {
          choice: {
            prompt: 'Why not just remove every bar and draw the new ones each time?',
            options: [
              { text: 'It would give a different picture.', why: 'The final picture is the same. What is lost is continuity.' },
              { text: 'The marks would lose their identity: nothing could move smoothly from old to new, hover states and focus would be lost, and every redraw would rebuild the whole page part.', why: 'Yes. The join keeps each mark with its datum, so an update is a change to a mark that persists: the basis of every animated or interactive D3 chart.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'ticks-axes', number: '4.3', title: 'Ticks and axes',
      goal: 'Derive how D3 chooses a readable step between ticks, compare it with the spreadsheet’s rule, and draw an axis from a scale.',
      builds: ['data-join'],
      blocks: [
        { h: 'Readable numbers' },
        { md: `An axis needs a few labelled ticks at round numbers: 0, 20, 40, not 0, 22.8, 45.6. Round means a **step** of 1, 2 or 5 times a power of ten. To get about $c$ ticks over a span, the ideal step is span ÷ $c$; the chosen step is the round one nearest to it.

"Nearest" here means on a **log scale**, where 1 → 2 is as far as 5 → 10 (both double): the lines between the choices are halfway on that scale, the square roots of 1×2, 2×5 and 5×10.` },
        {
          derive: {
            title: 'The step for 0 to 114 in about 5 ticks',
            intro: 'D3 writes the ideal step as $e \\times 10^k$ with $1 \\le e < 10$, then rounds $e$ to 1, 2, 5 or 10.',
            steps: [
              { prompt: 'The ideal step, 114 / 5?', number: 22.8, compute: () => 114 / 5, tolerance: 1e-9, why: 'Five equal steps over the span.' },
              { prompt: 'Written as $e \\times 10^k$: what is $e$?', number: 2.28, compute: () => 22.8 / 10 ** Math.floor(Math.log10(22.8)), tolerance: 1e-9, why: '$22.8 = 2.28 \\times 10^1$.' },
              { prompt: 'The line between 2 and 5 is halfway on a log scale: their geometric mean. In terms of $a$ and $b$?', answer: 'sqrt(a*b)', vars: { a: [1, 10], b: [1, 10] }, why: 'On a log scale the midpoint of $\\log a$ and $\\log b$ is $\\frac{\\log a + \\log b}{2} = \\log\\sqrt{ab}$. Between 2 and 5 that is $\\sqrt{10} \\approx 3.16$.' },
              { prompt: '$e = 2.28$ is between $\\sqrt 2 \\approx 1.41$ and $\\sqrt{10} \\approx 3.16$. What step does D3 choose?', number: 20, compute: () => { const [p, f] = G.stepSize(0, 114, 5); return f * 10 ** p }, why: '$2 \\times 10^1 = 20$: ticks 0, 20, …, 100.' },
            ],
          },
        },
        {
          code: {
            file: 'charts.py', fn: 'step_size', notes: [
              ['power = math.floor(math.log10(raw))', ['$k$: how many digits before the point, minus one.']],
              ['error = raw / 10 ** power', ['$e$, between 1 and 10.']],
              ['if error >= math.sqrt(50):', ['Past the midpoint of 5 and 10: round up to 10 (one more power of ten).']],
            ],
          },
        },
        {
          write: {
            file: 'charts.py', fn: 'step_size', prelude: 'import math',
            prompt: 'Write `step_size(lo, hi, count)`: the power $k$ and the factor (1, 2, 5 or 10) of the step, as a pair `power, factor`. Compare $e$ with √50, √10 and √2, largest first.',
            starter: 'def step_size(lo, hi, count):\n    raw = (hi - lo) / count\n    power = math.floor(math.log10(raw))\n    error = raw / 10 ** power\n    # 10, 5, 2 or 1, by the square-root lines\n    return power, 1\n',
            cases: cases(G.stepSize, [[0, 114, 5], [0, 1, 10], [0.03, 0.97, 5], [6.37, 409.5, 8], [1000, 98765, 7]]),
            hint: '`if error >= math.sqrt(50): return power, 10`, then √10 gives 5, √2 gives 2, otherwise 1.',
          },
        },
        {
          code: {
            file: 'charts.py', fn: 'nice_ticks', notes: [
              ['per_unit = 10 ** -power / factor', ['For steps below 1 (0.2, 0.05…), divide by a whole number instead: 0.1 can’t be stored exactly, but 10 can.']],
              ['first, last = js_round(lo / step), js_round(hi / step)', ['Count in whole steps: tick $k$ is $k \\times$ step. Rounding the ends, then nudging them inwards so no tick falls outside lo…hi.']],
              ['return [k * step for k in range(first, last + 1)]', ['Each tick made from its whole number $k$, not by adding the step again and again, which would pile up float errors (lesson 1.3).']],
            ],
          },
        },
        {
          code: { file: 'charts.py', fn: 'js_round', notes: [['return math.floor(x + 0.5)', ['JavaScript’s `Math.round(2.5)` is 3; Python’s `round(2.5)` is 2 (it rounds halves to the even number). To give D3’s answers, Python rounds the way JavaScript does.']]] },
        },
        { figure: 'TickExplorer', caption: 'Pick a range and a tick count: D3’s ticks, and the Spreadsheet Lab’s for the same range.' },
        {
          predict: {
            prompt: 'The Spreadsheet Lab (like Excel) also allows a step of 2.5, and takes the smallest step **at least** the ideal one, then covers the data. For 0 to 114 in about 5 ticks, what is its step?',
            answer: sheetTicks(0, 114, 5)[1] - sheetTicks(0, 114, 5)[0], compute: () => sheetTicks(0, 114, 5)[1] - sheetTicks(0, 114, 5)[0],
            explain: `25: 20 is below 22.8, so it rounds up to 25, and its ticks run 0, 25, …, 125 to cover the 114. D3’s 0, 20, …, 100 stops inside the data and leaves the top unlabelled. Two reasonable rules, two answers: when two tools disagree, look for the rule. (charts.test.js holds both to these numbers.)`,
            misconceptions: [{ answer: 20, feedback: 'That is D3’s choice, the nearest on a log scale. The spreadsheet rounds up instead, and allows 2.5.' }],
          },
        },
        { h: 'An axis is drawn from a scale' },
        { md: `\`d3.axisLeft(y)\` asks the scale for its ticks and draws a small line and a label at each, in a group you place with a \`transform\`. \`.nice()\` first extends the domain to the next tick, so the axis ends on a labelled number: \`[0, 114]\` becomes \`[0, 120]\`.` },
        {
          chart: {
            prompt: 'Draw a y axis for the orders per town: make the domain `[0, 114]` end on a tick with `.nice()`, and draw `d3.axisLeft(y)` with about 5 ticks, in a group moved 50 pixels right (`translate(50,0)`).',
            data: BY_TOWN,
            starter: `const y = d3.scaleLinear().domain([0, 114]).range([270, 20])
// a group at x = 50, then .call(d3.axisLeft(y).ticks(5)) on it
`,
            solution: `const y = d3.scaleLinear().domain([0, 114]).nice().range([270, 20])
svg.append('g')
  .attr('transform', 'translate(50,0)')
  .call(d3.axisLeft(y).ticks(5))
`,
            checks: [{ select: '.tick text', attrs: ['#text'] }, { select: '.tick', attrs: ['transform'] }],
            verify: marks => JSON.stringify(marks['.tick text'].map(m => Number(m['#text']))) === JSON.stringify(G.niceTicks(0, 120, 5)),
            hint: 'Add `.nice()` after `.domain([0, 114])`. Then `svg.append(\'g\').attr(\'transform\', \'translate(50,0)\').call(d3.axisLeft(y).ticks(5))`.',
            explain: `Ticks ${G.niceTicks(0, 120, 5).join(', ')}: your \`nice_ticks(0, 120, 5)\`. Each tick is a group moved to \`y(value)\`, holding a line and the label.`,
          },
        },
      ],
    },

    {
      id: 'histograms', number: '4.4', title: 'Histograms and bin widths',
      goal: 'Count values into bins by hand and with pandas, derive Sturges’ rule, and choose a bin width by Scott’s or Freedman and Diaconis’ rule.',
      builds: ['ticks-axes'],
      blocks: [
        { h: 'A shape from counts' },
        { md: `A **histogram** shows how one column's values are spread: cut the number line into **bins** of equal width, count the values in each, and draw a bar per bin. Its shape depends on the bins: too wide and the shape is hidden in a few bars; too narrow and it is lost in noise.

The bins are half-open: a bin from 24 to 25 holds 24 and not 25, so a value on an edge is counted once. With prices in whole pence (lesson 1.3), the bin of a price is a whole-number division: no rounding can move a value into the wrong bin.` },
        {
          code: {
            file: 'charts.py', fn: 'histogram', notes: [
              ['k = (x - start) // width', ['Which bin: the whole number of widths from the start. With whole pence this is exact.']],
              ['if k == count and x == start + count * width:', ['The very right edge of the last bin goes in the last bin, so the largest value isn’t lost.']],
            ],
          },
        },
        {
          write: {
            file: 'charts.py', fn: 'histogram',
            prompt: 'Write `histogram(values, start, width, count)`: a list of `count` counts; value `x` goes in bin `(x - start) // width`; the right edge of the last bin goes in the last bin; values outside are not counted.',
            starter: 'def histogram(values, start, width, count):\n    counts = [0] * count\n    # the bin of each value\n    return counts\n',
            cases: cases(G.histogram, [[[0, 5, 9, 10], 0, 5, 2], [LIGHTS_PENCE, 2000, 100, 10], [[1, 2, 99], 0, 10, 3]]),
            hint: '`k = (x - start) // width`; if `k == count and x == start + count * width`, use `count - 1`; if `0 <= k < count`, add 1 to `counts[k]`.',
          },
        },
        { figure: 'BinExplorer', caption: 'The prices, binned by each rule or by a width you choose. Switch between the lights and all the items.' },
        { h: 'How many bins?' },
        {
          derive: {
            title: 'Sturges’ rule (1926)',
            intro: 'Sturges imagined ideal data: $k$ bins whose counts are the binomial coefficients $\\binom{k-1}{0}, \\binom{k-1}{1}, \\dots, \\binom{k-1}{k-1}$, the bell shape of coin tosses.',
            steps: [
              { prompt: 'The total count $n$ is the sum of a row of Pascal’s triangle. In terms of $k$?', answer: '2^(k-1)', vars: { k: [1, 12] }, why: '$\\sum_i \\binom{k-1}{i} = 2^{k-1}$: each of $k - 1$ tosses doubles the number of outcomes.' },
              { prompt: 'Solve $n = 2^{k-1}$ for $k$.', answer: 'log2(n)+1', vars: { n: [1, 5000] }, why: '$k = \\log_2 n + 1$, rounded up: Sturges’ rule.' },
              { prompt: `For the ${LIGHTS.length} lights?`, number: G.sturges(LIGHTS.length), compute: () => G.sturges(LIGHTS.length), why: `$\\lceil\\log_2 ${LIGHTS.length}\\rceil + 1 = ${G.sturges(LIGHTS.length)}$. It grows only with $\\log n$: a million values get 21 bins, too few to show their detail. Its assumption, a bell shape, is also its weakness.` },
            ],
          },
        },
        { md: `Two rules set the **width** instead, from the spread, shrinking like $n^{-1/3}$: more data supports finer bins.

- **Scott (1979):** $h = 3.5\\,s / n^{1/3}$, from the standard deviation $s$. The Spreadsheet Lab's histograms use it by default, as Excel does.
- **Freedman and Diaconis (1981):** $h = 2\\,\\text{IQR} / n^{1/3}$, from the interquartile range (lesson 2.6), which ignores how far out the largest values are.` },
        {
          code: { file: 'charts.py', fn: 'sturges', notes: [['return math.ceil(math.log2(n)) + 1', ['The derivation’s answer, rounded up.']]] },
        },
        {
          code: { file: 'charts.py', fn: 'scott_width', notes: [['return 3.5 * std(values) / len(values) ** (1 / 3)', ['`std` from lesson 2.4 (dividing by n − 1).']]] },
        },
        {
          write: {
            file: 'charts.py', fn: 'freedman_diaconis_width', also: [['summary.py', 'quantile']], prelude: 'import math',
            prompt: 'Write `freedman_diaconis_width(values)`: twice the interquartile range (`quantile(values, 0.75) - quantile(values, 0.25)`) over the cube root of n.',
            starter: 'def freedman_diaconis_width(values):\n    # 2 * IQR / n ** (1 / 3)\n    return 0.0\n',
            cases: cases(G.freedmanDiaconisWidth, [[LIGHTS], [ALL_PRICES], [[1, 2, 3, 4, 100]]]),
            hint: '`iqr = quantile(values, 0.75) - quantile(values, 0.25)`, then `2 * iqr / len(values) ** (1 / 3)`.',
          },
        },
        {
          predict: {
            prompt: `Over all ${ALL_PRICES.length} prices (bikes included), Scott’s rule gives a bin width of ${money(G.scottWidth(ALL_PRICES))}. What width does Freedman and Diaconis’ rule give (to the penny)?`,
            answer: G.freedmanDiaconisWidth(ALL_PRICES), compute: () => G.freedmanDiaconisWidth(ALL_PRICES), tolerance: 0.006,
            explain: `${money(G.freedmanDiaconisWidth(ALL_PRICES))}, about a tenth of Scott’s. The bikes (about £450) make the standard deviation huge, so Scott’s bins swallow every other item into one or two bars. The IQR is set by the middle half of the prices, which are all accessories. For skewed data with a long tail, Freedman and Diaconis is the safer rule; the Spreadsheet Lab’s histogram now offers both (and Sturges).`,
          },
        },
        {
          formula: {
            table: 'orders', solution: '=COUNTIFS(D2:D403,"Lights, front and back",E2:E403,">=25",E2:E403,"<26")', must: ['COUNTIFS'],
            prompt: 'One bin in the spreadsheet: how many lights cost at least £25 and less than £26? Two conditions on the same column count values in a half-open bin.',
            hint: '`=COUNTIFS(D2:D403,"Lights, front and back",E2:E403,">=25",E2:E403,"<26")`',
            explain: `${sheet('=COUNTIFS(D2:D403,"Lights, front and back",E2:E403,">=25",E2:E403,"<26")')} on this raw sheet. Your \`histogram\` of the clean prices puts ${G.histogram(LIGHTS_PENCE, 2000, 100, 10)[5]} in the same bin: the price typed in pence as 2575 is £25.75 once cleaned, so it joins this bin. To draw a histogram in the Spreadsheet Lab, choose Chart → Histogram; its panel offers the three rules and shows the D3 code for the chart.`,
          },
        },
        {
          write: {
            file: 'frames.py', fn: 'bin_counts', packages: ['pandas'], prelude: 'import pandas as pd',
            prompt: 'In pandas: `pd.cut(series, edges, right=False)` labels each value with its bin (holding its left edge, not its right); `.value_counts(sort=False)` counts them in the bins’ order. Return the counts as a list of ints.',
            starter: 'def bin_counts(values, edges):\n    # cut, then count in the order of the bins\n    return []\n',
            cases: cases(G.binCounts, [[LIGHTS, [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]], [[1, 2, 2, 3], [0, 2, 4]]]),
            hint: '`bins = pd.cut(pd.Series(values), edges, right=False)`, then `[int(n) for n in bins.value_counts(sort=False)]`.',
          },
        },
        {
          chart: {
            prompt: 'Draw the histogram of the lights’ prices in £1 bins from £20 to £30. `d3.bin()` does the binning: `.domain([20, 30])` and `.thresholds(d3.range(21, 30))` (the inside edges) give ten bins, each an array of its values with `x0` and `x1`, its edges. Draw a bar per bin, 1 pixel in from each edge.',
            data: LIGHTS,
            starter: `const bins = d3.bin().domain([20, 30]).thresholds(d3.range(21, 30))(data)
const x = d3.scaleLinear().domain([20, 30]).range([40, 460])
const y = d3.scaleLinear().domain([0, d3.max(bins, b => b.length)]).nice().range([270, 20])
svg.selectAll('rect')
  .data(bins)
  .join('rect')
  // x from x(b.x0) + 1, width x(b.x1) - x(b.x0) - 2; y and height from b.length
`,
            solution: `const bins = d3.bin().domain([20, 30]).thresholds(d3.range(21, 30))(data)
const x = d3.scaleLinear().domain([20, 30]).range([40, 460])
const y = d3.scaleLinear().domain([0, d3.max(bins, b => b.length)]).nice().range([270, 20])
svg.selectAll('rect')
  .data(bins)
  .join('rect')
  .attr('x', b => x(b.x0) + 1)
  .attr('width', b => x(b.x1) - x(b.x0) - 2)
  .attr('y', b => y(b.length))
  .attr('height', b => y(0) - y(b.length))
`,
            checks: [{ select: 'rect', attrs: ['x', 'y', 'width', 'height'] }],
            verify: marks => { const counts = G.histogram(LIGHTS_PENCE, 2000, 100, 10), top = niceTop(Math.max(...counts)); return marks.rect.length === 10 && marks.rect.every((m, k) => near(m.y, G.linearScale(0, top, 270, 20, counts[k]))) },
            hint: '`.attr(\'x\', b => x(b.x0) + 1).attr(\'width\', b => x(b.x1) - x(b.x0) - 2).attr(\'y\', b => y(b.length)).attr(\'height\', b => y(0) - y(b.length))`',
            explain: `The counts, ${G.histogram(LIGHTS_PENCE, 2000, 100, 10).join(', ')}, are your \`histogram(prices_in_pence, 2000, 100, 10)\`: the tests check every bar against it. The prices sit between £22.50 and £27.50, the generator’s 90% to 110% of £25.`,
          },
        },
      ],
    },

    {
      id: 'log-sqrt-scales', number: '4.5', title: 'Log and square-root scales',
      goal: 'Use a log scale for values that span powers of ten, and size circles by area with a square-root scale, deriving why the radius goes with the square root.',
      builds: ['histograms'],
      blocks: [
        { h: 'When values span powers of ten' },
        { md: `The shop's list prices run from £7 (an inner tube) to £450 (a bike). On a linear axis the cheap items are squashed into the bottom few pixels. A **log scale** places $\\log_{10}$ of the value: then every tenfold step, £1 to £10 to £100, takes the same room, and equal *ratios* look like equal distances.` },
        {
          formula: {
            table: 'orders', solution: '=LOG10(MAX(catalogue!C2:C8)/MIN(catalogue!C2:C8))', must: ['LOG10'],
            prompt: 'How many powers of ten do the catalogue’s list prices span? `LOG10` of the dearest over the cheapest (the catalogue sheet’s column C).',
            hint: '`=LOG10(MAX(catalogue!C2:C8)/MIN(catalogue!C2:C8))`',
            explain: `${sheet('=LOG10(MAX(catalogue!C2:C8)/MIN(catalogue!C2:C8))').toFixed(3)}: almost two powers of ten. On a log axis the inner tube sits 1.8 decades below the bike, instead of being crushed against zero.`,
          },
        },
        {
          code: { file: 'charts.py', fn: 'log_scale', notes: [['return linear_scale(math.log10(d0), math.log10(d1), r0, r1, math.log10(x))', ['A log scale is a linear scale on the logarithms. It can’t show 0 or negative values: $\\log 0$ is minus infinity.']]] },
        },
        { h: 'Area must follow the value' },
        { md: `A circle's **area**, $\\pi r^2$, is what the eye takes in. If a value twice as large gets a radius twice as large, its area is four times as large, and the chart exaggerates every difference. So the radius must grow with the **square root** of the value.` },
        { figure: 'AreaLie', caption: 'The same two values drawn as circles two ways: radius in proportion to the value, and area in proportion to it.' },
        {
          derive: {
            title: 'Why the radius goes with the square root',
            intro: 'Make the area proportional to the value: $\\pi r^2 = c\\,v$ for some constant $c$.',
            steps: [
              { prompt: 'Solve for $r$ in terms of $c$ and $v$ (use pi).', answer: 'sqrt(c*v/pi)', vars: { c: [0.1, 10], v: [0, 100] }, why: '$r = \\sqrt{cv/\\pi}$: a constant times $\\sqrt v$. D3’s `scaleSqrt` is exactly this.' },
              { prompt: 'One value is 4 times another. How many times larger is its radius?', number: 2, compute: () => G.radiusFor(4, 4, 1) / G.radiusFor(1, 4, 1), why: '$\\sqrt 4 = 2$. With radius ∝ value it would be 4, and the area 16 times: the chart would show a 16-fold difference for a 4-fold one.' },
            ],
          },
        },
        {
          write: {
            file: 'charts.py', fn: 'radius_for', prelude: 'import math',
            prompt: 'Write `radius_for(value, largest, max_radius)`: the radius whose area is in proportion to `value`, with `largest` getting `max_radius`.',
            starter: 'def radius_for(value, largest, max_radius):\n    # area in proportion to the value\n    return max_radius * value / largest\n',
            cases: cases(G.radiusFor, [[12690, 12690, 50], [936.74, 12690, 50], [0, 10, 50], [25, 100, 40]]),
            hint: '`max_radius * math.sqrt(value / largest)`',
          },
        },
        {
          chart: {
            prompt: 'Draw one circle per item for its year’s takings, centred on y = 150, spaced along x by `d3.scalePoint`. The starter sizes the radius in proportion to the takings (`scaleLinear`), which exaggerates the bikes. Use `d3.scaleSqrt` so the **area** is in proportion, the largest radius 50.',
            data: TAKINGS,
            starter: `const x = d3.scalePoint().domain(data.map(d => d.item)).range([60, 420])
const r = d3.scaleLinear().domain([0, d3.max(data, d => d.takings)]).range([0, 50])
svg.selectAll('circle')
  .data(data)
  .join('circle')
  .attr('cx', d => x(d.item))
  .attr('cy', 150)
  .attr('r', d => r(d.takings))
  .attr('fill', 'steelblue').attr('fill-opacity', 0.7)
`,
            solution: `const x = d3.scalePoint().domain(data.map(d => d.item)).range([60, 420])
const r = d3.scaleSqrt().domain([0, d3.max(data, d => d.takings)]).range([0, 50])
svg.selectAll('circle')
  .data(data)
  .join('circle')
  .attr('cx', d => x(d.item))
  .attr('cy', 150)
  .attr('r', d => r(d.takings))
  .attr('fill', 'steelblue').attr('fill-opacity', 0.7)
`,
            checks: [{ select: 'circle', attrs: ['cx', 'cy', 'r'] }],
            verify: marks => { const top = Math.max(...TAKINGS.map(t => t.takings)); return marks.circle.every((m, k) => near(m.r, G.radiusFor(TAKINGS[k].takings, top, 50))) },
            hint: 'Change `d3.scaleLinear()` to `d3.scaleSqrt()` for `r`.',
            explain: `Each radius is your \`radius_for(takings, ${Math.max(...TAKINGS.map(t => t.takings))}, 50)\`. The inner tubes took ${money(TAKINGS.find(t => t.item === 'Inner tube').takings)}, ${(100 * TAKINGS.find(t => t.item === 'Inner tube').takings / Math.max(...TAKINGS.map(t => t.takings))).toFixed(1)}% of the bikes: with a linear radius their circle would have ${(100 * (TAKINGS.find(t => t.item === 'Inner tube').takings / Math.max(...TAKINGS.map(t => t.takings))) ** 2).toFixed(2)}% of the bikes’ area, a speck.`,
          },
        },
      ],
    },

    {
      id: 'densities', number: '4.6', title: 'Densities',
      goal: 'Build a kernel density estimate from a bell curve on every value, show that its area is 1, and choose its bandwidth by Silverman’s rule.',
      builds: ['log-sqrt-scales'],
      blocks: [
        { h: 'A histogram without edges' },
        { md: `A histogram's shape changes when its bins move. A **kernel density estimate** (KDE) has no edges: put a small bell curve (the **kernel**) on every value, add them up, and divide so the total area is 1:

$$\\hat f(x) = \\frac{1}{nh} \\sum_{i=1}^{n} \\varphi\\!\\left(\\frac{x - x_i}{h}\\right), \\qquad \\varphi(u) = \\frac{e^{-u^2/2}}{\\sqrt{2\\pi}}$$

$h$, the **bandwidth**, is the bell's width: the KDE's version of the bin width.` },
        { figure: 'KdeExplorer', caption: 'A bell on every price, added up. Slide the bandwidth: too small and every price is its own spike; too large and the shape melts into one hump.' },
        {
          derive: {
            title: 'Why the area is 1',
            intro: 'The standard bell $\\varphi(u)$ has area 1: $\\int \\varphi(u)\\,du = 1$.',
            steps: [
              { prompt: 'Substitute $u = (x - x_i)/h$, so $dx = h\\,du$. What is $\\int \\varphi\\big((x - x_i)/h\\big)\\,dx$, in terms of $h$?', answer: 'h', vars: { h: [0.1, 10] }, why: 'Stretching the bell by $h$ multiplies its area by $h$.' },
              { prompt: 'Adding $n$ such bells gives what area, in terms of $n$ and $h$?', answer: 'n*h', vars: { n: [1, 100], h: [0.1, 10] }, why: 'Each has area $h$. Dividing by $nh$ in the formula makes the total exactly 1.' },
              { prompt: 'The engine adds the KDE of the lights’ prices in 2,000 thin strips. What area does it measure (to 4 decimals)?', number: 1, compute: () => G.kdeArea(LIGHTS, G.silverman(LIGHTS)), tolerance: 5e-5, why: `${G.kdeArea(LIGHTS, G.silverman(LIGHTS)).toFixed(6)}: 1, up to the strips’ rounding. A density’s height is not a probability; its *area* over a range is.` },
            ],
          },
        },
        {
          code: {
            file: 'charts.py', fn: 'kde', notes: [
              ['u = (x - v) / h', ['How many bandwidths from this value.']],
              ['total += math.exp(-u * u / 2) / math.sqrt(2 * math.pi)', ['The bell’s height there.']],
              ['return total / (len(values) * h)', ['Divided by $nh$: area 1.']],
            ],
          },
        },
        {
          write: {
            file: 'charts.py', fn: 'kde', prelude: 'import math',
            prompt: 'Write `kde(values, h, x)`: the sum over the values of $\\varphi((x - v)/h)$, divided by $nh$.',
            starter: 'def kde(values, h, x):\n    total = 0.0\n    # a bell on every value\n    return total\n',
            cases: cases(G.kde, [[[0], 1, 0], [[1, 2, 3], 0.5, 2], [LIGHTS, H, 25], [LIGHTS, H, 22]]),
            hint: 'For each `v`: `u = (x - v) / h`; `total += math.exp(-u * u / 2) / math.sqrt(2 * math.pi)`. Return `total / (len(values) * h)`.',
          },
        },
        {
          code: { file: 'charts.py', fn: 'silverman', notes: [['return 1.06 * std(values) * len(values) ** -0.2', ['Silverman’s rule of thumb (1986): best for a bell-shaped spread; narrower for more data, like $n^{-1/5}$.']]] },
        },
        {
          chart: {
            prompt: `Draw the density of the lights’ prices as one path. Use the bandwidth $h = ${H}$ (Silverman’s rule, rounded), evaluate the density at \`d3.range(20, 30.001, 0.25)\`, and draw it with \`d3.line()\` on the scales given.`,
            data: LIGHTS,
            starter: `const h = ${H}
const kernel = u => Math.exp(-u * u / 2) / Math.sqrt(2 * Math.PI)
const density = x => 0   // the KDE at x
const xs = d3.range(20, 30.001, 0.25)
const x = d3.scaleLinear().domain([20, 30]).range([40, 460])
const y = d3.scaleLinear().domain([0, 0.5]).range([270, 20])
svg.append('path')
  .attr('fill', 'none').attr('stroke', 'steelblue').attr('stroke-width', 2)
  .attr('d', d3.line().x(v => x(v)).y(v => y(density(v)))(xs))
`,
            solution: `const h = ${H}
const kernel = u => Math.exp(-u * u / 2) / Math.sqrt(2 * Math.PI)
const density = x => d3.sum(data, v => kernel((x - v) / h)) / (data.length * h)
const xs = d3.range(20, 30.001, 0.25)
const x = d3.scaleLinear().domain([20, 30]).range([40, 460])
const y = d3.scaleLinear().domain([0, 0.5]).range([270, 20])
svg.append('path')
  .attr('fill', 'none').attr('stroke', 'steelblue').attr('stroke-width', 2)
  .attr('d', d3.line().x(v => x(v)).y(v => y(density(v)))(xs))
`,
            checks: [{ select: 'path', attrs: ['d'] }],
            verify: marks => { const d = marks.path[0].d, xs = Array.from({ length: 41 }, (_, k) => 20 + k * 0.25); return d.length === 82 && xs.every((v, k) => Math.abs(d[2 * k + 1] - G.linearScale(0, 0.5, 270, 20, G.kde(LIGHTS, H, v))) <= 5e-4) }, // d3.line writes 3 decimals
            hint: '`const density = x => d3.sum(data, v => kernel((x - v) / h)) / (data.length * h)`',
            explain: 'The path’s points are your `kde(prices, h, x)` at each x, put through the y scale: the tests check all 41 against the Python.',
          },
        },
      ],
    },

    {
      id: 'colour-scales', number: '4.7', title: 'Colour as a scale',
      goal: 'Choose a categorical, sequential or diverging colour scale, mix two colours by linear interpolation, and draw a heat map of orders by town and month.',
      builds: ['densities'],
      blocks: [
        { h: 'Three kinds of colour scale' },
        { md: `- **Categorical:** different hues for things with no order (towns, items). Keep to a handful: past about seven, hues can't be told apart.
- **Sequential:** light to dark for amounts. Lightness carries the order, so it still reads in greyscale and for most colour-blind readers.
- **Diverging:** two hues from a meaningful middle (above and below average, profit and loss).

A colour scale is a scale like any other: a domain of values mapped onto a range of colours. Between two colours it moves each channel, red, green and blue, the same fraction of the way.` },
        { figure: 'ColourScales', caption: 'The same counts in a categorical, a sequential and a diverging scale. The sequential one is mixed by your `mix`.' },
        {
          derive: {
            title: 'Mixing two colours',
            intro: 'White is (255, 255, 255); a dark blue is (8, 48, 107).',
            steps: [
              { prompt: 'The red channel a fraction $t$ of the way from $a$ to $b$?', answer: 'a+t*(b-a)', vars: { a: [0, 255], b: [0, 255], t: [0, 1] }, why: 'The linear scale again, on one channel.' },
              { prompt: 'Halfway from white to the blue, the red channel is $255 + 0.5(8 - 255) = 131.5$. Rounded as JavaScript does (halves up)?', number: G.mix([255, 255, 255], [8, 48, 107], 0.5)[0], compute: () => G.mix([255, 255, 255], [8, 48, 107], 0.5)[0], why: '132. Python’s `round` would give 132 too here (132 is even); `js_round` makes them agree on every half.' },
            ],
          },
        },
        {
          code: { file: 'charts.py', fn: 'mix', notes: [['return [js_round(a + t * (b - a)) for a, b in zip(c0, c1)]', ['`zip` pairs the channels: red with red, green with green, blue with blue.']]] },
        },
        {
          write: {
            file: 'charts.py', fn: 'mix', given: ['js_round'], prelude: 'import math',
            prompt: 'Write `mix(c0, c1, t)`: each channel moved the fraction `t` from `c0` to `c1`, rounded with `js_round`, as a list `[r, g, b]`.',
            starter: 'def mix(c0, c1, t):\n    # each channel the same fraction of the way\n    return list(c0)\n',
            cases: cases(G.mix, [[[255, 255, 255], [8, 48, 107], 0.5], [[255, 255, 255], [8, 48, 107], 0], [[0, 0, 0], [255, 128, 1], 0.25]]),
            hint: '`[js_round(a + t * (b - a)) for a, b in zip(c0, c1)]`',
          },
        },
        {
          chart: {
            prompt: 'Draw a heat map: one rectangle per town and month, coloured from white (0 orders) to `#08306b` (the most in any month). The bands are given; set each rectangle’s `fill` with a linear colour scale: `d3.scaleLinear().domain([0, most]).range([\'white\', \'#08306b\'])`.',
            data: MONTHLY,
            starter: `const x = d3.scaleBand().domain(d3.range(1, 13)).range([90, 470])
const y = d3.scaleBand().domain(['Leeds', 'York', 'Harrogate', 'Wakefield']).range([20, 260])
const most = d3.max(data, d => d.orders)
svg.selectAll('rect')
  .data(data)
  .join('rect')
  .attr('x', d => x(d.month)).attr('y', d => y(d.town))
  .attr('width', x.bandwidth()).attr('height', y.bandwidth())
  .attr('fill', 'steelblue')
svg.append('g').attr('transform', 'translate(90,0)').call(d3.axisLeft(y).tickSize(0))
svg.append('g').attr('transform', 'translate(0,260)').call(d3.axisBottom(x).tickSize(0))
`,
            solution: `const x = d3.scaleBand().domain(d3.range(1, 13)).range([90, 470])
const y = d3.scaleBand().domain(['Leeds', 'York', 'Harrogate', 'Wakefield']).range([20, 260])
const most = d3.max(data, d => d.orders)
const colour = d3.scaleLinear().domain([0, most]).range(['white', '#08306b'])
svg.selectAll('rect')
  .data(data)
  .join('rect')
  .attr('x', d => x(d.month)).attr('y', d => y(d.town))
  .attr('width', x.bandwidth()).attr('height', y.bandwidth())
  .attr('fill', d => colour(d.orders))
svg.append('g').attr('transform', 'translate(90,0)').call(d3.axisLeft(y).tickSize(0))
svg.append('g').attr('transform', 'translate(0,260)').call(d3.axisBottom(x).tickSize(0))
`,
            checks: [{ select: 'rect', attrs: ['x', 'y', 'width', 'height', 'fill'] }],
            verify: marks => { const most = Math.max(...MONTHLY.map(m => m.orders)); return marks.rect.every((m, k) => m.fill === `rgb(${G.mix([255, 255, 255], [8, 48, 107], MONTHLY[k].orders / most).join(', ')})`) },
            hint: 'Add `const colour = d3.scaleLinear().domain([0, most]).range([\'white\', \'#08306b\'])` and set `.attr(\'fill\', d => colour(d.orders))`.',
            explain: `Every fill is your \`mix(white, blue, orders / ${Math.max(...MONTHLY.map(m => m.orders))})\`: D3 mixes colours in a linear scale channel by channel, exactly so. The darkest cell, Leeds in January, had ${Math.max(...MONTHLY.map(m => m.orders))} orders.`,
          },
        },
        {
          choice: {
            prompt: 'You colour four towns with a sequential scale, light to dark. What goes wrong?',
            options: [
              { text: 'Nothing: they are different colours.', why: 'They are, but light to dark says “less to more”. Readers will look for an order the towns don’t have.' },
              { text: 'Lightness implies an order the towns don’t have: use distinct hues of similar lightness for categories.', why: 'Yes. Match the scale to the data: categories get hues, amounts get lightness, and values either side of a middle get two hues.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'misleading-charts', number: '4.8', title: 'Charts that mislead',
      goal: 'Reproduce the truncated axis, the area trick and the dual axis on the shop’s data, measure each with Tufte’s lie factor, and fix the truncated axis.',
      builds: ['colour-scales'],
      blocks: [
        { h: 'Honest charts can lie' },
        { md: `Every chart here so far was honest by construction: bars from zero, area for area. Three common tricks break that, and each can happen by accident:

- **The truncated axis:** bars that start at 80 instead of 0. A bar's length then shows the value minus 80, and small differences look huge.
- **The area trick:** a picture scaled in both directions for a value that doubled, so its area quadruples (lesson 4.5).
- **The dual axis:** two series with two y axes, each scaled to fill the chart: by choosing the scales, any two series can be made to cross, or to move together.

Tufte (1983) put a number on it: the **lie factor** is how big the change looks divided by how big it is.` },
        { figure: 'Misleading', caption: 'Each trick, on the shop’s data, beside the honest version.' },
        {
          derive: {
            title: 'The lie factor of a truncated axis',
            intro: `Harrogate had ${HARROGATE} orders, Leeds ${LEEDS}. A bar chart starts its axis at 80.`,
            steps: [
              { prompt: 'How much bigger is Leeds in the data, as a change ($\\frac{114}{87} - 1$)?', number: LEEDS / HARROGATE - 1, compute: () => LEEDS / HARROGATE - 1, tolerance: 1e-6, why: `${(100 * (LEEDS / HARROGATE - 1)).toFixed(1)}% more.` },
              { prompt: 'The bars show $114 - 80$ and $87 - 80$. How much bigger does the Leeds bar look, as a change?', number: (LEEDS - 80) / (HARROGATE - 80) - 1, compute: () => (LEEDS - 80) / (HARROGATE - 80) - 1, tolerance: 1e-6, why: `$34 / 7 - 1 \\approx ${((LEEDS - 80) / (HARROGATE - 80) - 1).toFixed(2)}$: nearly five times as big.` },
              { prompt: 'The lie factor: the shown change over the real one?', number: LIE, compute: () => G.lieFactor(HARROGATE, LEEDS, HARROGATE - 80, LEEDS - 80), tolerance: 1e-6, why: `${LIE.toFixed(1)}. Tufte suggested anything outside 0.95 to 1.05 is a distortion. Starting the axis at 0 gives exactly 1.` },
            ],
          },
        },
        {
          code: { file: 'charts.py', fn: 'lie_factor', notes: [['return (shown_b / shown_a - 1) / (data_b / data_a - 1)', ['Both changes as “how much more”, so the units of the chart and the data cancel.']]] },
        },
        {
          write: {
            file: 'charts.py', fn: 'lie_factor',
            prompt: 'Write `lie_factor(data_a, data_b, shown_a, shown_b)`: the change shown, $\\frac{\\text{shown}_b}{\\text{shown}_a} - 1$, over the change in the data.',
            starter: 'def lie_factor(data_a, data_b, shown_a, shown_b):\n    # shown change over real change\n    return 1.0\n',
            cases: cases(G.lieFactor, [[HARROGATE, LEEDS, HARROGATE - 80, LEEDS - 80], [10, 20, 1, 4], [87, 114, 87, 114]]),
            hint: '`(shown_b / shown_a - 1) / (data_b / data_a - 1)`',
          },
        },
        {
          chart: {
            prompt: 'This bar chart starts its y axis at 80, so Harrogate looks a fraction of Leeds. Fix it: the bars must start at zero, with the domain `[0, 120]`.',
            data: BY_TOWN,
            starter: BARS.replace('.domain([0, 120])', '.domain([80, 120])').replace("d => y(0) - y(d.orders)", "d => y(80) - y(d.orders)"),
            solution: BARS,
            checks: [{ select: 'rect', attrs: ['x', 'y', 'width', 'height'] }],
            verify: marks => near(marks.rect[0].height / marks.rect[2].height, LEEDS / HARROGATE),
            hint: 'Change the domain to `[0, 120]` and measure the height from `y(0)`.',
            explain: `Now Leeds’ bar is ${(LEEDS / HARROGATE).toFixed(3)} times Harrogate’s, as in the data: a lie factor of 1.`,
          },
        },
        {
          choice: {
            prompt: 'A line chart of a share price starts its y axis at £95, not £0. Is that a truncated-axis lie?',
            options: [
              { text: 'Yes: every axis must start at zero.', why: 'For bars, yes: their length is the value. A line shows change through position, and zero may be far below anything that happened.' },
              { text: 'Not necessarily: a line is read by position, not length, so a non-zero axis can be honest, if the axis is labelled and the scale of the changes isn’t hidden.', why: 'Yes. The rule “start at zero” is about bars and areas, where length or area is the value. For lines and dots, choose the range that shows the changes that matter, and label it.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'small-multiples', number: '4.9', title: 'Project: small multiples',
      goal: 'Draw one small chart per town on shared scales, and say why the scales must be shared.',
      builds: ['misleading-charts'],
      blocks: [
        { h: 'One chart per town' },
        { md: `Four towns' months on one chart is 48 bars, or four tangled lines. **Small multiples** (Tufte again) draw one small chart per town, side by side, the same in every way except the data. The eye learns one chart and then compares four.

The rule that makes it work: **every panel uses the same scales**. If each panel scales to its own largest month, Harrogate's quiet months fill its panel as tall as Leeds' busy ones, and the comparison the layout invites is false.` },
        {
          chart: {
            prompt: 'Draw one panel per town: a group per town, moved along by the `panel` band scale, with its name and its 12 monthly bars. The starter gives every panel **its own** y scale. Make one y scale for all of them, from 0 to the largest month of any town (`d3.max(data, d => d.orders)`), with `.nice()`.',
            data: MONTHLY,
            starter: `const towns = ['Leeds', 'York', 'Harrogate', 'Wakefield']
const panel = d3.scaleBand().domain(towns).range([0, 480]).paddingInner(0.1)
const x = d3.scaleBand().domain(d3.range(1, 13)).range([0, panel.bandwidth()]).padding(0.1)
const g = svg.selectAll('g.panel').data(towns).join('g')
  .attr('class', 'panel')
  .attr('transform', t => 'translate(' + panel(t) + ',0)')
g.append('text').attr('x', 4).attr('y', 20).text(t => t)
g.each(function (t) {
  const months = data.filter(d => d.town === t)
  const y = d3.scaleLinear().domain([0, d3.max(months, d => d.orders)]).nice().range([270, 40])
  d3.select(this).selectAll('rect').data(months).join('rect')
    .attr('x', d => x(d.month)).attr('width', x.bandwidth())
    .attr('y', d => y(d.orders)).attr('height', d => y(0) - y(d.orders))
    .attr('fill', 'steelblue')
})
`,
            solution: `const towns = ['Leeds', 'York', 'Harrogate', 'Wakefield']
const panel = d3.scaleBand().domain(towns).range([0, 480]).paddingInner(0.1)
const x = d3.scaleBand().domain(d3.range(1, 13)).range([0, panel.bandwidth()]).padding(0.1)
const y = d3.scaleLinear().domain([0, d3.max(data, d => d.orders)]).nice().range([270, 40])
const g = svg.selectAll('g.panel').data(towns).join('g')
  .attr('class', 'panel')
  .attr('transform', t => 'translate(' + panel(t) + ',0)')
g.append('text').attr('x', 4).attr('y', 20).text(t => t)
g.each(function (t) {
  const months = data.filter(d => d.town === t)
  d3.select(this).selectAll('rect').data(months).join('rect')
    .attr('x', d => x(d.month)).attr('width', x.bandwidth())
    .attr('y', d => y(d.orders)).attr('height', d => y(0) - y(d.orders))
    .attr('fill', 'steelblue')
})
`,
            checks: [{ select: 'g.panel', attrs: ['transform'] }, { select: 'g.panel text', attrs: ['#text'] }, { select: 'rect', attrs: ['x', 'y', 'width', 'height'] }],
            verify: marks => { const top = niceTop(Math.max(...MONTHLY.map(m => m.orders))); return marks.rect.length === 48 && marks.rect.every((m, k) => near(m.y, G.linearScale(0, top, 270, 40, MONTHLY[k].orders))) },
            hint: 'Move the y scale out of `g.each`, above it, built from all the data: `d3.max(data, d => d.orders)`.',
            explain: `Now a bar of 10 orders is the same height in every panel, and Leeds’ January (${MONTHLY[0].orders} orders) stands out as the year’s busiest month anywhere. With a scale per panel, each town’s busiest month reached the top, and Harrogate’s ${Math.max(...MONTHLY.filter(m => m.town === 'Harrogate').map(m => m.orders))} looked like Leeds’ ${MONTHLY[0].orders}.`,
          },
        },
        {
          predict: {
            prompt: 'How many rectangles does the small-multiples chart draw?',
            answer: MONTHLY.length, compute: () => C.TOWNS.length * 12,
            explain: `${C.TOWNS.length} towns × 12 months: the same count a long table (lesson 3.9) of town, month and orders has rows. Each panel is a group-by (lesson 2.7) drawn: split by town, draw each group the same way.`,
          },
        },
        { note: 'Part 5 looks for patterns: two columns at a time, correlation, and the shop’s Simpson’s paradox.', kind: 'key' },
      ],
    },
  ],
}
