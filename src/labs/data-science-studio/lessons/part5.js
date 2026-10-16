// Part 5: looking for patterns. Two columns at a time: covariance and correlation (and correlation as
// a cosine), ranks and Spearman, the line that follows from the correlation, Anscombe's quartet, logs
// that straighten a curve, overplotting, the correlation matrix, Simpson's paradox, and why correlation
// is not causation. The data is the shop's days (temperature, rain, riders, website visits) and its
// deliveries, made by the generator with the truth behind them known (python/data.py).
import * as T from '../engine/tables.js'
import * as C from '../engine/cleaning.js'
import * as S from '../engine/summary.js'
import * as G from '../engine/charts.js'
import * as P from '../engine/patterns.js'
import { ORDERS_CSV, CATALOGUE_CSV, DAYS_CSV, DELIVERIES_CSV, FAR_TOWNS, makeDays, Rng } from '../engine/data.js'
import { evaluateFormula } from '../engine/sheet.js'
import { WITH_RNG } from './given.js'

const cases = (fn, inputs) => inputs.map(args => ({ args, expected: fn(...args) }))
const sheet = formula => evaluateFormula('orders', formula).value
const pct = (x, d = 1) => `${(100 * x).toFixed(d)}%`
// The functions of summary.py these exercises build on (lesson 2.1–2.4).
const MEANS = [['summary.py', 'total'], ['summary.py', 'mean']]
const SPREAD = [...MEANS, ['summary.py', 'variance'], ['summary.py', 'std']]

const ROWS = T.readCsv(ORDERS_CSV())
const LIST = Object.fromEntries(T.readCsv(CATALOGUE_CSV()).map(r => [r.item, T.toPence(r.list_price)]))
const CLEAN = C.cleanOrders(ROWS, LIST)
const DAYS = P.numberDays(T.readCsv(DAYS_CSV()))
const QUIET = DAYS.filter(r => r.visits < 9000)
const col = (rows, k) => rows.map(r => r[k])
const [H, R, RI, V] = ['high_c', 'rain_mm', 'riders', 'visits'].map(k => col(DAYS, k))
const [HQ, RQ, RIQ, VQ] = ['high_c', 'rain_mm', 'riders', 'visits'].map(k => col(QUIET, k))
const NEWS = DAYS.find(r => r.visits >= 9000)
const USUAL = (() => { const truth = {}; makeDays(5, truth); return Object.values(truth)[0] })()

const COV = P.covariance(H, RI), R_HR = P.correlation(H, RI)
const F = H.map(h => 1.8 * h + 32)
const [SLOPE, INTERCEPT] = P.fitLine(H, RI), [BACK] = P.fitLine(RI, H)
const ANGLE = (Math.acos(R_HR) * 180) / Math.PI
const DRY = R.filter(r => r === 0).length

const GROWTH = P.growthPerUnit(HQ, VQ), TRUE_GROWTH = Math.exp(0.05) - 1
const [LIN_SLOPE] = P.fitLine(HQ, VQ)
const LIN_SPREAD = (() => { const res = P.residuals(HQ, VQ), sd = keep => S.std(res.filter((_, i) => keep(HQ[i]))); return { cold: sd(h => h < 10), warm: sd(h => h > 18) } })()

// 5.7: every clean order as a dot at (quantity, item), and the same dots jittered (seeded).
const ITEMS = ['Bike', 'Helmet', 'Lights, front and back', 'Lock', 'Inner tube', 'Service']
const JX = P.jitter(CLEAN.map(() => 0), 0.3, 17), JY = P.jitter(CLEAN.map(() => 0), 12, 23)
const DOTS = CLEAN.map((r, k) => ({ item: r.item, quantity: r.quantity, jx: JX[k], jy: JY[k] }))
const SPOTS = new Set(CLEAN.map(r => `${r.item}|${r.quantity}`)).size

// 5.8: the matrix of the quiet days' four columns.
const NAMES = ['high_c', 'rain_mm', 'riders', 'visits']
const MATRIX = P.correlationMatrix([HQ, RQ, RIQ, VQ])
const CELLS = NAMES.flatMap((a, i) => NAMES.map((b, j) => ({ a, b, r: MATRIX[i][j] })))

// 5.9: each delivery with the town joined from the clean orders, and whether that town is far.
const TOWN = Object.fromEntries(CLEAN.map(r => [r.order_id, r.town]))
const DELIVERIES = T.readCsv(DELIVERIES_CSV()).map(r => { const far = FAR_TOWNS.includes(TOWN[r.order_id]) ? 'far' : 'near'; return { order_id: r.order_id, courier: r.courier, on_time: r.on_time, far, group: `${r.courier} ${far}` } })
const BY_COURIER = P.rateBy(DELIVERIES, 'courier', 'on_time', 'yes'), BY_GROUP = P.rateBy(DELIVERIES, 'group', 'on_time', 'yes')
const rate = ([hits, n]) => hits / n
const [NF, NN, SF, SN] = ['Northern far', 'Northern near', 'Swift far', 'Swift near'].map(g => BY_GROUP[g])

// 5.10: the three simulated worlds.
const SIMS = Object.fromEntries(['confounder', 'collider', 'independent'].map(kind => [kind, P.simulate(kind, 2000, 3)]))
const simR = rows => P.correlation(col(rows.map(([x, y, z]) => ({ x, y, z })), 'x'), col(rows.map(([x, y, z]) => ({ x, y, z })), 'y'))
const SELECTED = SIMS.collider.filter(r => r[2] > 1)
const PARTIAL = P.partialCorrelation(RIQ, VQ, HQ)
// How far the partial correlation moves from one year to the next: the days resampled (lesson 6.10's bootstrap).
const PARTIAL_CI = (() => {
  const rng = new Rng(8), n = HQ.length, out = []
  for (let r = 0; r < 1000; r++) { const k = Array.from({ length: n }, () => rng.below(n)); out.push(P.partialCorrelation(k.map(i => RIQ[i]), k.map(i => VQ[i]), k.map(i => HQ[i]))) }
  return [S.quantile(out, 0.025), S.quantile(out, 0.975)]
})()

// The D3 blocks' scales, for the tests' `verify`.
const near = (a, b, tol = 1e-6) => Math.abs(a - b) < tol
const xDeg = v => G.linearScale(0, 30, 40, 460, v), yRiders = v => G.linearScale(0, 1100, 270, 20, v)
const RED = [176, 65, 62], WHITE = [255, 255, 255], BLUE = [8, 48, 107]

const SCATTER = `const x = d3.scaleLinear().domain([0, 30]).range([40, 460])
const y = d3.scaleLinear().domain([0, 1100]).range([270, 20])
svg.selectAll('circle')
  .data(data)
  .join('circle')
  .attr('cx', d => x(d.high_c))
  .attr('cy', d => y(d.riders))
  .attr('r', 2.5)
  .attr('fill', 'steelblue').attr('fill-opacity', 0.6)
svg.append('g').attr('transform', 'translate(0,270)').call(d3.axisBottom(x))
svg.append('g').attr('transform', 'translate(40,0)').call(d3.axisLeft(y))
`

export const PART5 = {
  id: 'part5', title: 'Part 5 · Looking for patterns', lessons: [
    {
      id: 'two-columns', number: '5.1', title: 'Two columns at once',
      goal: 'Draw two columns of the same rows as a scatter plot, derive the covariance and read its sign from the four quadrants around the means, and compute it by hand and in the spreadsheet.',
      builds: ['small-multiples'],
      blocks: [
        { h: 'A new table: the shop’s days' },
        { md: `Until now every question was about one column at a time: the mean price, the spread, the shape of a histogram. Most questions people really ask are about **two**: do more people ride on warm days? Do web visits follow? To answer them, the shop kept a log of 2025, one row per day: the day's highest temperature, its rain, the riders counted on the cycle path outside, and the visits to its website.

Like the orders, the log is made by the lab's generator, so **we know what made it**. The temperature follows the seasons; riders rise with the temperature and fall with rain; visits rise with the temperature and nothing else. Every number in this part can be checked against that truth, which real data never allows.` },
        {
          code: {
            file: 'data.py', fn: 'make_days', notes: [
              ['season = -math.cos(2 * math.pi * (day - 15) / 365)', ['A wave over the year: −1 in mid-January (day 15), +1 in mid-July.']],
              ['high_text = tenths(14 + 7 * season + 2.5 * noise(rng))', ['14 °C on average, 7 above or below with the seasons, plus a day’s random noise (lesson 6.5 builds `noise`).']],
              ['wet = rng.below(100) < 45 - 15 * season', ['Rain on 60 days in 100 in winter, 30 in summer.']],
              ['riders = math.floor(300 + 22 * high - 12 * rain', ['The rule for riders: 22 more per degree, 12 fewer per mm of rain, 90 more at weekends.']],
              ['visits = math.floor(180 * math.exp(0.05 * high', ['Visits are **multiplied** by $e^{0.05}$ for each degree (lesson 5.6), and nothing else changes them.']],
              ['visits = 9412', ['One day a news site linked to the shop. Lesson 5.3 finds it.']],
            ],
          },
        },
        { h: 'The scatter plot' },
        { md: `A **scatter plot** draws each row as one dot: one column across, the other up. Each of the ${DAYS.length} days is a dot at (temperature, riders). The cloud slopes upwards: warm days have more riders. To put a number on "moves together", measure each day from the **means**: $\\bar x = ${S.mean(H).toFixed(2)}$ °C and $\\bar y = ${S.mean(RI).toFixed(1)}$ riders.

A day warmer than average **and** busier than average has both distances positive; colder and quieter, both negative. Either way, their **product** is positive. A warm, quiet day (or a cold, busy one) gives a negative product.` },
        { figure: 'Quadrants', caption: 'Lines through the two means cut the cloud into four quadrants. Pick a day: its rectangle has area (x − x̄)(y − ȳ), blue when positive, red when negative. Their mean is the covariance.' },
        {
          derive: {
            title: 'Covariance, from the products',
            intro: 'The covariance adds up every day’s product and divides by $n - 1$, as the sample variance does (lesson 2.4): $\\text{cov}(x, y) = \\frac{1}{n-1} \\sum (x_i - \\bar x)(y_i - \\bar y)$.',
            steps: [
              { prompt: 'A day 3 °C warmer than average with 50 more riders than average. Its product?', number: 150, compute: () => 3 * 50, why: 'Both distances positive: it pushes the covariance up.' },
              { prompt: 'A day 2 °C colder with 40 fewer riders. Its product?', number: 80, compute: () => -2 * -40, why: 'Both negative, so the product is positive too: “below with below” agrees as much as “above with above”.' },
              { prompt: 'Put $y = x$: the covariance of a column with itself. It is the sample variance $v$ of lesson 2.4. Write it in terms of $v$.', answer: 'v', vars: { v: [0, 100] }, why: '$\\frac{1}{n-1}\\sum (x_i - \\bar x)^2$ is the variance: covariance is variance for two columns.' },
              { prompt: 'The covariance of the temperatures with themselves: the variance of the temperatures (to 3 decimals)?', number: P.covariance(H, H), compute: () => S.variance(H), tolerance: 5e-4, why: `${S.variance(H).toFixed(3)} °C².` },
            ],
          },
        },
        {
          code: {
            file: 'patterns.py', fn: 'covariance', notes: [
              ['mx, my = mean(xs), mean(ys)', ['The centre of the cloud: where the two lines of the figure cross.']],
              ['products = total([(x - mx) * (y - my) for x, y in zip(xs, ys)])', ['`zip` walks the two columns together, row by row: each day’s rectangle, added up.']],
            ],
          },
        },
        {
          write: {
            file: 'patterns.py', fn: 'covariance', also: MEANS,
            prompt: 'Write `covariance(xs, ys)`: the sum of $(x - \\bar x)(y - \\bar y)$ over the pairs, divided by $n - 1$. `mean` and `total` are given.',
            starter: 'def covariance(xs, ys):\n    # the products of the distances from the two means, added, over n - 1\n    return 0.0\n',
            cases: cases(P.covariance, [[[1, 2, 3], [6, 4, 2]], [H.slice(0, 10), RI.slice(0, 10)], [[0, 1, 2, 3], [1, 1, 1, 5]]]),
            hint: '`mx, my = mean(xs), mean(ys)`, then `total([(x - mx) * (y - my) for x, y in zip(xs, ys)]) / (len(xs) - 1)`.',
          },
        },
        {
          formula: {
            table: 'orders', solution: '=COVARIANCE.S(days!B2:B366, days!D2:D366)', must: ['COVARIANCE.S'],
            prompt: 'The days are on their own sheet, `days`: column B is the temperature, D the riders. Work out their covariance (`.S` for a sample: dividing by n − 1).',
            hint: '`=COVARIANCE.S(days!B2:B366, days!D2:D366)`',
            explain: `${sheet('=COVARIANCE.S(days!B2:B366, days!D2:D366)').toFixed(2)}: your \`covariance\` gives the same (the tests hold the two together). Positive: warm goes with busy.`,
          },
        },
        {
          predict: {
            prompt: `The covariance is ${COV.toFixed(2)}, in °C × riders. The shop’s American supplier reads the temperatures in Fahrenheit ($F = 1.8C + 32$). What covariance do they get?`,
            answer: P.covariance(F, RI), compute: () => P.covariance(F, RI), tolerance: 0.01,
            explain: `${P.covariance(F, RI).toFixed(2)}: 1.8 times as much (adding 32 moves the mean too, so the distances don’t change). Same days, same relationship, a different number. Covariance carries the units of both columns, so its size says nothing about how **strong** the relationship is. Lesson 5.2 fixes that.`,
            misconceptions: [{ answer: COV, feedback: 'Every distance from the mean temperature is multiplied by 1.8 in Fahrenheit, so every product is too.' }],
          },
        },
        { h: 'Draw it' },
        {
          chart: {
            prompt: 'Draw the scatter plot: one circle per day, at its temperature across (`d.high_c`) and its riders up (`d.riders`). The scales and axes are written; give each circle its `cy`.',
            data: DAYS,
            starter: SCATTER.replace("  .attr('cy', d => y(d.riders))\n", "  .attr('cy', 150)   // the riders, through the y scale\n"),
            solution: SCATTER,
            checks: [{ select: 'circle', attrs: ['cx', 'cy'] }],
            verify: marks => marks.circle.length === 365 && marks.circle.every((m, k) => near(m.cx, xDeg(DAYS[k].high_c)) && near(m.cy, yRiders(DAYS[k].riders))),
            hint: '`.attr(\'cy\', d => y(d.riders))`',
            explain: 'Each dot is a day. Transparency (`fill-opacity`) lets crowded parts look darker: lesson 5.7 comes back to it.',
          },
        },
        {
          choice: {
            prompt: 'Covariance is in °C × riders. Which question can its size alone **not** answer?',
            options: [
              { text: 'Do warm days tend to have more riders?', why: 'Its sign answers that: positive.' },
              { text: 'Is temperature more closely tied to riders than rain is?', why: 'Yes, this is the one. The two covariances are in different units (°C × riders, mm × riders): their sizes can’t be compared. Dividing out the spreads (lesson 5.2) makes them comparable.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'correlation', number: '5.2', title: 'Correlation',
      goal: 'Divide the covariance by both standard deviations to get Pearson’s r, show it is the cosine of the angle between the two centred columns, and so why it lies between −1 and 1.',
      builds: ['two-columns'],
      blocks: [
        { h: 'Taking the units out' },
        { md: `Divide each distance by its column's standard deviation first: the **z-scores** of lesson 2.6, in "standard deviations from the mean", with no units. The covariance of the z-scores is **Pearson's correlation** $r$:

$$r = \\frac{1}{n-1} \\sum \\frac{x_i - \\bar x}{s_x} \\cdot \\frac{y_i - \\bar y}{s_y} = \\frac{\\text{cov}(x, y)}{s_x\\, s_y}$$

Now Celsius or Fahrenheit, riders or thousands of riders, $r$ is the same.` },
        {
          derive: {
            title: 'r without units, and its range',
            intro: `For the days: covariance ${COV.toFixed(2)}, $s_x = ${S.std(H).toFixed(3)}$ °C, $s_y = ${S.std(RI).toFixed(2)}$ riders.`,
            steps: [
              { prompt: 'The covariance of $z_x = (x - \\bar x)/s$ and $z_y = (y - \\bar y)/t$, if the covariance of $x$ and $y$ is $c$? (Each product is divided by $s$ and by $t$.)', answer: 'c/(s*t)', vars: { c: [-100, 100], s: [0.5, 10], t: [0.5, 10] }, why: '$r = \\frac{c}{st}$: the covariance shrunk by both spreads.' },
              { prompt: 'r for temperature and riders (to 4 decimals)?', number: R_HR, compute: () => P.correlation(H, RI), tolerance: 5e-5, why: `$${COV.toFixed(2)} / (${S.std(H).toFixed(3)} \\times ${S.std(RI).toFixed(2)}) = ${R_HR.toFixed(4)}$.` },
              { prompt: 'And with the temperatures in Fahrenheit?', number: P.correlation(F, RI), compute: () => P.correlation(F, RI), tolerance: 5e-5, why: 'The same: the 1.8 is in the covariance and in $s_x$, and cancels.' },
            ],
          },
        },
        {
          code: { file: 'patterns.py', fn: 'correlation', notes: [['return covariance(xs, ys) / (std(xs) * std(ys))', ['Both `covariance` and `std` divide by $n - 1$, so the $n - 1$ cancels too: $r = \\frac{\\sum ab}{\\sqrt{\\sum a^2}\\sqrt{\\sum b^2}}$ with $a, b$ the distances from the means.']]] },
        },
        {
          write: {
            file: 'patterns.py', fn: 'correlation', given: ['covariance'], also: SPREAD, prelude: 'import math',
            prompt: 'Write `correlation(xs, ys)`: the covariance over the product of the two standard deviations. `covariance` (yours, from 5.1) and `std` are given.',
            starter: 'def correlation(xs, ys):\n    # take the units out\n    return covariance(xs, ys)\n',
            cases: cases(P.correlation, [[[1, 2, 3], [2, 4, 7]], [[1, 2, 3], [3, 2, 1]], [H, RI]]),
            hint: '`covariance(xs, ys) / (std(xs) * std(ys))`',
          },
        },
        { h: 'Correlation is a cosine' },
        { md: `Write the column's distances from its mean as one list, $a = (x_1 - \\bar x, \\dots, x_n - \\bar x)$: the column **centred**. Do the same for $y$, giving $b$. Then

$$r = \\frac{\\sum a_i b_i}{\\sqrt{\\sum a_i^2}\\,\\sqrt{\\sum b_i^2}} = \\frac{a \\cdot b}{|a|\\,|b|} = \\cos\\theta$$

Read each centred column as an arrow in a space with one direction per day (${DAYS.length} of them). $r$ is the cosine of the **angle between the two arrows**: the cosine similarity of NLP Studio, on centred columns. A cosine can't be above 1 or below −1, so neither can $r$. Arrows pointing the same way (θ = 0°) give 1: an exact rising straight line. At right angles (90°), 0: no straight-line relationship. Opposite (180°), −1.` },
        {
          code: {
            file: 'patterns.py', fn: 'centred', notes: [['return [x - m for x in values]', ['The arrow from the mean to each value.']]],
          },
        },
        {
          write: {
            file: 'patterns.py', fn: 'cosine', also: [['summary.py', 'total']], prelude: 'import math',
            prompt: 'Write `cosine(a, b)`: the dot product $\\sum a_i b_i$ over the product of the two lengths $\\sqrt{\\sum a_i^2}$ and $\\sqrt{\\sum b_i^2}$.',
            starter: 'def cosine(a, b):\n    # dot product over the two lengths\n    return 0.0\n',
            cases: cases(P.cosine, [[[1, 0], [1, 1]], [[3, 4], [4, 3]], [P.centred(H.slice(0, 20)), P.centred(RI.slice(0, 20))]]),
            hint: '`dot = total([x * y for x, y in zip(a, b)])`, then `dot / (math.sqrt(total([x * x for x in a])) * math.sqrt(total([y * y for y in b])))`.',
          },
        },
        {
          predict: {
            prompt: `$r = ${R_HR.toFixed(4)}$ is the cosine of the angle between the centred temperatures and the centred riders. What is the angle, in degrees?`,
            answer: ANGLE, compute: () => (Math.acos(P.cosine(P.centred(H), P.centred(RI))) * 180) / Math.PI, tolerance: 0.05,
            explain: `${ANGLE.toFixed(1)}°: $\\arccos ${R_HR.toFixed(4)}$. In ${DAYS.length} dimensions, the two arrows point within 30° of each other.`,
          },
        },
        { figure: 'CorrelationShapes', caption: 'Clouds made with a chosen correlation. Slide r from −1 to 1 and watch the cloud, the measured r and the angle between the centred columns.' },
        {
          formula: {
            table: 'orders', solution: '=CORREL(days!C2:C366, days!D2:D366)', must: ['CORREL'],
            prompt: 'Rain (column C of the days sheet) and riders (D): their correlation?',
            hint: '`=CORREL(days!C2:C366, days!D2:D366)`',
            explain: `${sheet('=CORREL(days!C2:C366, days!D2:D366)').toFixed(4)}: negative, and weaker than temperature’s ${R_HR.toFixed(2)}. Now the two can be compared, because neither has units.`,
          },
        },
        { note: '$r$ measures how close the dots are to **a straight line**, and only that. A perfect U shape has $r$ near 0, and one far-off dot can make $r$ almost anything: lessons 5.3 and 5.5.', kind: 'warn' },
      ],
    },

    {
      id: 'ranks-spearman', number: '5.3', title: 'Ranks and Spearman’s correlation',
      goal: 'Find the day that breaks Pearson’s correlation, rank a column with ties by hand, and measure a relationship with Spearman’s correlation, which one far-off value can’t break.',
      builds: ['correlation'],
      blocks: [
        { h: 'One day breaks r' },
        { md: `Visits to the website should follow the temperature too. But $r$ for temperature and visits is only **${P.correlation(H, V).toFixed(3)}**. A scatter plot shows why at once: one dot at ${NEWS.visits.toLocaleString('en-GB')} visits, when every other day had under ${Math.max(...VQ) + 1}.` },
        {
          formula: {
            table: 'orders', solution: '=MATCH(MAX(days!E2:E366), days!E2:E366, 0)', must: ['MATCH', 'MAX'],
            prompt: 'Which day was it? Find the position of the most visits within column E of the days sheet: `MATCH` the `MAX`.',
            hint: '`=MATCH(MAX(days!E2:E366), days!E2:E366, 0)`',
            explain: `${sheet('=MATCH(MAX(days!E2:E366), days!E2:E366, 0)')}: day number ${sheet('=MATCH(MAX(days!E2:E366), days!E2:E366, 0)')} of the year, ${NEWS.date}. That was the day a news site linked to the shop: ${NEWS.visits.toLocaleString('en-GB')} visits, against about ${USUAL} on a usual February day (the generator kept the truth).`,
          },
        },
        { md: `That single day sits so far up that it outweighs the other ${DAYS.length - 1}: its distance from the mean visits, squared into the variance and multiplied into the covariance, is enormous. Without it, $r$ = ${P.correlation(HQ, VQ).toFixed(3)}.

Deleting it is one answer (the news day is real but isn't about the weather). Another is a measure that only asks about **order**: does a warmer day have more visits, by any amount? Replace each value by its **rank**, its place in sorted order, and the news day is simply 365th: one place above the second-busiest day, not ${Math.round(NEWS.visits / Math.max(...VQ))} times as many visits.` },
        { h: 'Ranking with ties' },
        { md: `Sorting gives each value its place: 1 for the smallest. Ties need a rule. **${DRY}** of the days had no rain at all; they take places 1 to ${DRY} between them, and none of them is "first". The fair rule gives each the **mean** of the places they share: RANK.AVG in a spreadsheet, and \`rank\` here.` },
        { figure: 'RankTies', caption: 'Type some values: they are sorted, each run of equal values is found, and its members share the mean of their places.' },
        {
          derive: {
            title: 'The shared rank of a run of ties',
            intro: 'Sorted, a run of equal values fills the places from $i + 1$ to $j + 1$ (counting the sorted list from 0, as Python does).',
            steps: [
              { prompt: 'Four equal values take places 1, 2, 3 and 4. Their shared rank?', number: 2.5, compute: () => P.rank([7, 7, 7, 7])[0], why: '$(1 + 2 + 3 + 4)/4 = 2.5$.' },
              { prompt: 'The places $i + 1$ to $j + 1$ are evenly spaced, so their mean is halfway between the first and the last. In terms of $i$ and $j$?', answer: '(i+j)/2+1', vars: { i: [0, 50], j: [50, 100] }, why: '$\\frac{(i + 1) + (j + 1)}{2} = \\frac{i + j}{2} + 1$: the line `shared = (i + j) / 2 + 1`.' },
              { prompt: `The ${DRY} dry days fill places 1 to ${DRY}. Their shared rank?`, number: P.rank(R)[R.indexOf(0)], compute: () => P.rank(R)[R.indexOf(0)], why: `$\\frac{0 + ${DRY - 1}}{2} + 1 = ${P.rank(R)[R.indexOf(0)]}$: every dry day gets ${P.rank(R)[R.indexOf(0)]}.` },
            ],
          },
        },
        {
          code: {
            file: 'patterns.py', fn: 'rank', notes: [
              ['order = sorted(range(len(values)), key=lambda k: values[k])', ['Sort the **positions**, not the values: `order[0]` is where the smallest value is, so each rank can be written back in its own row.']],
              ['while j + 1 < len(order) and values[order[j + 1]] == values[order[i]]:', ['Walk `j` forward while the next value equals this one: `i` to `j` is one run of ties.']],
              ['shared = (i + j) / 2 + 1', ['The derivation’s mean place.']],
              ['i = j + 1', ['The next run starts after this one: every position is visited once, so after the sort this is one pass.']],
            ],
          },
        },
        {
          write: {
            file: 'patterns.py', fn: 'rank', forbid: [['scipy', 'Write the ranking yourself: this lesson takes scipy’s `rankdata` apart.']],
            prompt: 'Finish `rank(values)`: walk along `order`; for each run of equal values from `i` to `j`, write the shared rank $(i + j)/2 + 1$ into `ranks` at each position `order[k]`.',
            starter: 'def rank(values):\n    order = sorted(range(len(values)), key=lambda k: values[k])\n    ranks = [0.0] * len(values)\n    # each run of equal values shares the mean of its places\n    return ranks\n',
            cases: cases(P.rank, [[[5, 1, 1, 3, 5, 5]], [[10, 20, 30]], [[2, 2, 2]], [R.slice(0, 40)]]),
            hint: '`i = 0`; `while i < len(order):` set `j = i`, move `j` on while `values[order[j + 1]] == values[order[i]]`; `shared = (i + j) / 2 + 1`; `for k in range(i, j + 1): ranks[order[k]] = shared`; then `i = j + 1`.',
          },
        },
        { python: { program: 'rank', label: 'Step through rank in real Python' } },
        { h: 'Spearman’s correlation' },
        { md: `**Spearman's correlation** is Pearson's $r$ of the two columns' ranks. It is 1 when $y$ rises whenever $x$ rises, by any amount, and −1 when it always falls. A far-off value moves it only as far as one rank.` },
        {
          code: { file: 'patterns.py', fn: 'spearman', notes: [['return correlation(rank(xs), rank(ys))', ['Nothing new: two functions you have written, one after the other.']]] },
        },
        {
          write: {
            file: 'patterns.py', fn: 'spearman', given: ['covariance', 'correlation', 'rank'], also: SPREAD, prelude: 'import math',
            prompt: 'Write `spearman(xs, ys)`, with `correlation` and `rank` given.',
            starter: 'def spearman(xs, ys):\n    # Pearson on the ranks\n    return correlation(xs, ys)\n',
            cases: cases(P.spearman, [[[1, 2, 3, 4, 100], [2, 4, 5, 9, 10]], [[1, 2, 3], [3, 1, 2]], [H, V]]),
            hint: '`correlation(rank(xs), rank(ys))`',
          },
        },
        {
          formula: {
            table: 'orders', solution: '=CORREL(RANK.AVG(days!B2:B366, days!B2:B366, 1), RANK.AVG(days!E2:E366, days!E2:E366, 1))', must: ['CORREL', 'RANK.AVG'],
            prompt: 'Spearman’s correlation in the spreadsheet: `RANK.AVG(range, range, 1)` ranks every value of a range at once (1: smallest first), and `CORREL` correlates the two lists of ranks.',
            hint: '`=CORREL(RANK.AVG(days!B2:B366, days!B2:B366, 1), RANK.AVG(days!E2:E366, days!E2:E366, 1))`',
            explain: `${sheet('=CORREL(RANK.AVG(days!B2:B366, days!B2:B366, 1), RANK.AVG(days!E2:E366, days!E2:E366, 1))').toFixed(4)}, with the news day still in. Pearson’s gave ${P.correlation(H, V).toFixed(4)}. (Building this lesson found that the Spreadsheet Lab’s RANK.AVG could rank only one value at a time; it now ranks a whole range, as Excel does, with tests.)`,
          },
        },
        {
          predict: {
            prompt: `Without the news day, Pearson’s $r$ for temperature and visits is ${P.correlation(HQ, VQ).toFixed(3)}. What is Spearman’s without it (to 3 decimals)?`,
            answer: P.spearman(HQ, VQ), compute: () => P.spearman(HQ, VQ), tolerance: 5e-4,
            explain: `${P.spearman(HQ, VQ).toFixed(3)}, against ${P.spearman(H, V).toFixed(3)} with it. The news day cost Pearson ${(P.correlation(HQ, VQ) - P.correlation(H, V)).toFixed(2)} and Spearman ${(P.spearman(HQ, VQ) - P.spearman(H, V)).toFixed(3)}.`,
          },
        },
        {
          choice: {
            prompt: 'When is Spearman’s correlation the better measure?',
            options: [
              { text: 'Always: it is Pearson’s, improved.', why: 'It answers a different question. When the relationship really is a straight line, Pearson’s uses the sizes of the values and says more.' },
              { text: 'When a few values are far out, or the relationship rises steadily but not in a straight line.', why: 'Yes. Ranks keep only the order, so one extreme value moves one place, and any steadily rising curve has Spearman 1.' },
              { text: 'When there are ties.', why: 'Ties are what the average rank handles; they are no reason to choose it.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'regression-line', number: '5.4', title: 'The line from the correlation',
      goal: 'Derive the line that predicts y from x out of r and the two spreads, see why predictions regress to the mean, and show that R² is r².',
      builds: ['ranks-spearman'],
      blocks: [
        { h: 'Predicting riders from the temperature' },
        { md: `On a day of 20 °C, how many riders should the shop expect? $r$ says how tightly the dots follow a line; the line itself answers the question. Work in standard units first, where both columns have mean 0 and standard deviation 1.

Among all lines, the best in squared error (lesson 2.1's measure, Part 8 derives it in full) goes through the centre $(\\bar x, \\bar y)$ and, in standard units, has slope $r$:

$$\\hat z_y = r\\, z_x$$

A day one standard deviation warmer than average is predicted $r$ standard deviations busier, not a full one.` },
        {
          derive: {
            title: 'From standard units back to riders',
            intro: `$\\bar x = ${S.mean(H).toFixed(3)}$, $s_x = ${S.std(H).toFixed(3)}$, $\\bar y = ${S.mean(RI).toFixed(2)}$, $s_y = ${S.std(RI).toFixed(2)}$, $r = ${R_HR.toFixed(4)}$.`,
            steps: [
              { prompt: 'Write $\\hat z_y = r z_x$ in the original units: $\\frac{\\hat y - \\bar y}{s_y} = r \\frac{x - \\bar x}{s_x}$. The slope, riders per degree, in terms of $r$, $s$ (for $s_y$) and $t$ (for $s_x$)?', answer: 'r*s/t', vars: { r: [-1, 1], s: [1, 100], t: [1, 10] }, why: '$\\hat y = \\bar y + r\\frac{s_y}{s_x}(x - \\bar x)$: slope $b = r s_y / s_x$.' },
              { prompt: 'The slope for the days (riders per degree)?', number: SLOPE, compute: () => P.fitLine(H, RI)[0], tolerance: 5e-4, why: `${SLOPE.toFixed(3)}. The generator’s rule says 22. The slope is higher because cold days are also wet days (rain costs riders), and a line in temperature alone can’t tell the two apart. Measured: give each day back the 12 riders per mm its rain cost, and the slope drops to ${P.fitLine(H, RI.map((v, i) => v + 12 * R[i]))[0].toFixed(2)}. Lesson 5.10 comes back to this.` },
              { prompt: 'The line passes through $(\\bar x, \\bar y)$. Its intercept $a = \\bar y - b \\bar x$?', number: INTERCEPT, compute: () => P.fitLine(H, RI)[1], tolerance: 5e-3, why: `${INTERCEPT.toFixed(2)} riders at 0 °C: a day the data never saw (the coldest was ${Math.min(...H)} °C), so trust it only as part of the line.` },
              { prompt: 'Predict the other way, temperature from riders: slope $b\' = r s_x / s_y$. What is $b \\times b\'$, in terms of $r$?', answer: 'r^2', vars: { r: [-1, 1] }, why: `$r^2$. If the two lines were one, $b' = 1/b$ and $bb' = 1$. They are the same line only when $r = \\pm 1$: here $b' = ${BACK.toFixed(4)}$, not $1/b = ${(1 / SLOPE).toFixed(4)}$.` },
            ],
          },
        },
        {
          code: { file: 'patterns.py', fn: 'fit_line', notes: [['slope = correlation(xs, ys) * std(ys) / std(xs)', ['The derivation’s slope.']], ['return [slope, mean(ys) - slope * mean(xs)]', ['Through the centre: $a = \\bar y - b\\bar x$.']]] },
        },
        {
          write: {
            file: 'patterns.py', fn: 'fit_line', given: ['covariance', 'correlation'], also: SPREAD, prelude: 'import math',
            prompt: 'Write `fit_line(xs, ys)`: return `[slope, intercept]`, the slope $r\\,s_y/s_x$ and the intercept that puts the line through the two means.',
            starter: 'def fit_line(xs, ys):\n    # the slope from r, then through the centre\n    return [0.0, 0.0]\n',
            cases: cases(P.fitLine, [[[1, 2, 3], [2, 4, 6]], [[0, 1, 2, 3], [1, 3, 2, 4]], [H, RI]]),
            hint: '`slope = correlation(xs, ys) * std(ys) / std(xs)`, then `[slope, mean(ys) - slope * mean(xs)]`.',
          },
        },
        { h: 'Regression to the mean' },
        { md: `Because $|r| < 1$, the prediction is always **closer to the mean** (in standard units) than the day it comes from. That is where the word *regression* comes from: Galton (1886) found that very tall parents had children who were tall, but less extremely so. Nothing pulls the children back; a prediction from an imperfect relationship simply can't be as extreme as its input. Reading it as a force is a classic mistake: a shop's worst month is usually followed by a better one, whatever the manager did.` },
        { figure: 'LineFit', caption: 'The line and every residual (the dashed gaps). Drag the slope away from the fitted one: the squared error grows on either side.' },
        {
          code: { file: 'patterns.py', fn: 'residuals', notes: [['return [y - (intercept + slope * x) for x, y in zip(xs, ys)]', ['What the line misses, day by day: the dashed lines of the figure.']]] },
        },
        {
          predict: {
            prompt: 'The variance of the residuals over the variance of the riders is the share of the riders’ variation the line **doesn’t** explain. One minus it is $R^2$. What is $R^2$ for riders on temperature (to 4 decimals)?',
            answer: 1 - S.variance(P.residuals(H, RI)) / S.variance(RI), compute: () => 1 - S.variance(P.residuals(H, RI)) / S.variance(RI), tolerance: 5e-5,
            explain: `${(1 - S.variance(P.residuals(H, RI)) / S.variance(RI)).toFixed(4)}, which is $r^2 = ${R_HR.toFixed(4)}^2$. For a straight line fitted by least squares, $R^2 = r^2$ always: “the temperature explains ${pct(R_HR ** 2, 0)} of the variation in riders”, in this narrow sense.`,
          },
        },
        {
          formula: {
            table: 'orders', solution: '=SLOPE(days!D2:D366, days!B2:B366)', must: ['SLOPE'],
            prompt: 'The slope in the spreadsheet: `SLOPE(known_ys, known_xs)`, the riders first.',
            hint: '`=SLOPE(days!D2:D366, days!B2:B366)`',
            explain: `${sheet('=SLOPE(days!D2:D366, days!B2:B366)').toFixed(4)} riders per degree, your \`fit_line\`’s slope. \`INTERCEPT\` gives ${sheet('=INTERCEPT(days!D2:D366, days!B2:B366)').toFixed(2)}, and \`RSQ\` gives ${sheet('=RSQ(days!D2:D366, days!B2:B366)').toFixed(4)}. In the Spreadsheet Lab, a scatter chart’s trendline shows the same line.`,
          },
        },
        {
          chart: {
            prompt: 'Add the line to the scatter plot. The means are worked out for you; compute the slope `b` as $\\frac{\\sum (x - \\bar x)(y - \\bar y)}{\\sum (x - \\bar x)^2}$ (it equals $r s_y / s_x$: the $n - 1$’s and one $s_x$ cancel), then draw a `line` with class `fit` from 0 °C to 30 °C.',
            data: DAYS,
            starter: `${SCATTER}const mx = d3.mean(data, d => d.high_c), my = d3.mean(data, d => d.riders)
const b = 0   // the slope
const a = my - b * mx
// a line of class 'fit', from (0, a) to (30, a + 30b), through the scales
`,
            solution: `${SCATTER}const mx = d3.mean(data, d => d.high_c), my = d3.mean(data, d => d.riders)
const b = d3.sum(data, d => (d.high_c - mx) * (d.riders - my)) / d3.sum(data, d => (d.high_c - mx) ** 2)
const a = my - b * mx
svg.append('line').attr('class', 'fit')
  .attr('x1', x(0)).attr('y1', y(a))
  .attr('x2', x(30)).attr('y2', y(a + 30 * b))
  .attr('stroke', '#b0413e').attr('stroke-width', 2)
`,
            checks: [{ select: 'line.fit', attrs: ['x1', 'y1', 'x2', 'y2'] }],
            verify: marks => { const m = marks['line.fit'][0]; return near(m.y1, yRiders(INTERCEPT), 1e-6) && near(m.y2, yRiders(INTERCEPT + 30 * SLOPE), 1e-6) },
            hint: '`const b = d3.sum(data, d => (d.high_c - mx) * (d.riders - my)) / d3.sum(data, d => (d.high_c - mx) ** 2)`, then `svg.append(\'line\').attr(\'class\', \'fit\').attr(\'x1\', x(0)).attr(\'y1\', y(a)).attr(\'x2\', x(30)).attr(\'y2\', y(a + 30 * b))`.',
            explain: `The line runs from ${INTERCEPT.toFixed(1)} riders at 0 °C to ${(INTERCEPT + 30 * SLOPE).toFixed(1)} at 30 °C: your \`fit_line\`, checked by the tests at both ends.`,
          },
        },
      ],
    },

    {
      id: 'anscombe', number: '5.5', title: 'Anscombe’s quartet',
      goal: 'Summarise four data sets with the same means, variances, correlation and line, draw them, and see why a summary is never enough on its own.',
      builds: ['regression-line'],
      blocks: [
        { h: 'Four sets, one summary' },
        { md: `In 1973 the statistician Frank Anscombe published four small data sets, eleven points each, to make one point: **numbers alone can't tell you what data looks like**. Here they are, exactly as published.` },
        { code: { file: 'patterns.py', assign: 'ANSCOMBE', caption: 'Anscombe (1973), The American Statistician 27(1)' } },
        {
          code: { file: 'patterns.py', fn: 'describe_pair', notes: [['return [mean(xs), mean(ys), std(xs) ** 2, std(ys) ** 2, correlation(xs, ys), slope, intercept]', ['Every summary of Parts 2 and 5 at once.']]] },
        },
        {
          write: {
            file: 'patterns.py', fn: 'describe_pair', given: ['covariance', 'correlation', 'fit_line'], also: SPREAD, prelude: 'import math',
            prompt: 'Write `describe_pair(xs, ys)`: `[mean x, mean y, variance x, variance y, r, slope, intercept]`, with the sample variances. Then run it on the quartet in your head: the checks run it on all four.',
            starter: 'def describe_pair(xs, ys):\n    slope, intercept = fit_line(xs, ys)\n    # both means, both variances, r, the line\n    return [mean(xs), mean(ys)]\n',
            cases: cases(P.describePair, Object.values(P.ANSCOMBE)),
            hint: '`[mean(xs), mean(ys), std(xs) ** 2, std(ys) ** 2, correlation(xs, ys), slope, intercept]`',
          },
        },
        {
          predict: {
            prompt: 'Set I has $r$ = 0.8164. What is $r$ for set IV, where ten of the eleven points share the same x (to 3 decimals)?',
            answer: P.correlation(...P.ANSCOMBE.IV), compute: () => P.correlation(...P.ANSCOMBE.IV), tolerance: 5e-4,
            explain: `${P.correlation(...P.ANSCOMBE.IV).toFixed(3)}, the same. In set IV, x says nothing at all about y for ten of the points; one point at x = 19 makes the whole “relationship”.`,
          },
        },
        { figure: 'Anscombe', caption: 'The four sets, each with its line, and their summaries side by side. Switch on the residuals.' },
        { md: `What the pictures show, and the numbers hide:

- **I**: a noisy straight line. The summary describes it well.
- **II**: a smooth curve. A straight line is the wrong model; its residuals rise and fall in a pattern.
- **III**: an exact line with one outlier, which tilts the fitted line away from the other ten. Spearman's correlation is ${P.spearman(...P.ANSCOMBE.III).toFixed(3)}.
- **IV**: no relationship at all, plus one point of high **leverage**.

The lesson is older than computers and still the first rule of data analysis: **plot it**.` },
        {
          chart: {
            prompt: 'Draw the quartet as small multiples (lesson 4.9), two by two, every panel on the same scales. The points are drawn; in each panel, work out that set’s least-squares line (as in 5.4) and draw it as a `line` of class `fit` from x = 2 to x = 20.',
            data: Object.entries(P.ANSCOMBE).flatMap(([set, [xs, ys]]) => xs.map((x, k) => ({ set, x, y: ys[k] }))),
            starter: `const sets = ['I', 'II', 'III', 'IV']
const x = d3.scaleLinear().domain([2, 20]).range([24, 230])
const y = d3.scaleLinear().domain([2, 14]).range([140, 12])
const g = svg.selectAll('g.panel').data(sets).join('g')
  .attr('class', 'panel')
  .attr('transform', (s, i) => 'translate(' + (i % 2) * 240 + ',' + Math.floor(i / 2) * 150 + ')')
g.append('text').attr('x', 4).attr('y', 16).text(s => s)
g.each(function (s) {
  const points = data.filter(d => d.set === s)
  d3.select(this).selectAll('circle').data(points).join('circle')
    .attr('cx', d => x(d.x)).attr('cy', d => y(d.y)).attr('r', 3).attr('fill', 'steelblue')
  // this set's line: the means, the slope, the intercept, then a line of class 'fit'
})
`,
            solution: `const sets = ['I', 'II', 'III', 'IV']
const x = d3.scaleLinear().domain([2, 20]).range([24, 230])
const y = d3.scaleLinear().domain([2, 14]).range([140, 12])
const g = svg.selectAll('g.panel').data(sets).join('g')
  .attr('class', 'panel')
  .attr('transform', (s, i) => 'translate(' + (i % 2) * 240 + ',' + Math.floor(i / 2) * 150 + ')')
g.append('text').attr('x', 4).attr('y', 16).text(s => s)
g.each(function (s) {
  const points = data.filter(d => d.set === s)
  d3.select(this).selectAll('circle').data(points).join('circle')
    .attr('cx', d => x(d.x)).attr('cy', d => y(d.y)).attr('r', 3).attr('fill', 'steelblue')
  const mx = d3.mean(points, d => d.x), my = d3.mean(points, d => d.y)
  const b = d3.sum(points, d => (d.x - mx) * (d.y - my)) / d3.sum(points, d => (d.x - mx) ** 2)
  const a = my - b * mx
  d3.select(this).append('line').attr('class', 'fit')
    .attr('x1', x(2)).attr('y1', y(a + 2 * b))
    .attr('x2', x(20)).attr('y2', y(a + 20 * b))
    .attr('stroke', '#b0413e')
})
`,
            checks: [{ select: 'circle', attrs: ['cx', 'cy'] }, { select: 'line.fit', attrs: ['y1', 'y2'] }],
            verify: marks => marks['line.fit'].length === 4 && Object.values(P.ANSCOMBE).every(([xs, ys], k) => { const [b, a] = P.fitLine(xs, ys), y = v => G.linearScale(2, 14, 140, 12, v); return near(marks['line.fit'][k].y1, y(a + 2 * b)) && near(marks['line.fit'][k].y2, y(a + 20 * b)) }),
            hint: 'Inside `g.each`: `const mx = d3.mean(points, d => d.x), my = d3.mean(points, d => d.y)`, the slope `b` as in 5.4, `a = my - b * mx`, then `d3.select(this).append(\'line\').attr(\'class\', \'fit\')` from `(x(2), y(a + 2 * b))` to `(x(20), y(a + 20 * b))`.',
            explain: 'Four lines, all $y = 3 + 0.5x$ to two decimals: the tests check each against your `fit_line`. Four different pictures under one line.',
          },
        },
        {
          choice: {
            prompt: 'A report gives r = 0.82 and a fitted line, and no chart. What can you conclude?',
            options: [
              { text: 'That y rises with x along a fairly tight straight line.', why: 'Sets II, III and IV have the same r and line, and none of them is that.' },
              { text: 'Very little about the shape: ask for the scatter plot, and the residuals.', why: 'Yes. The same summary fits a curve, a line with an outlier, and a single far-off point. Look before you summarise.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'log-transforms', number: '5.6', title: 'Logs straighten curves',
      goal: 'Recognise an effect that multiplies, straighten it with a log, read the slope as a percentage per unit, and recover the generator’s 5% per degree.',
      builds: ['anscombe'],
      blocks: [
        { h: 'A curve, and a spread that grows' },
        { md: `Plot the visits against the temperature (without the news day) and fit a straight line: ${LIN_SLOPE.toFixed(1)} more visits per degree. But the cloud bends upwards, and it fans out: the residuals spread by about ${LIN_SPREAD.cold.toFixed(0)} visits on days below 10 °C and about ${LIN_SPREAD.warm.toFixed(0)} on days above 18 °C. Both are signs of an effect that **multiplies**: each degree adds not a fixed number of visits but a fixed **share** of the visits already there, so the noise grows with the visits too.

Such an effect is a straight line on a log scale (lesson 4.5): the logarithm turns multiplying into adding.` },
        { figure: 'LogStraightens', caption: 'The visits against the temperature, on an ordinary axis and on a log axis, with the fitted line and its residuals.' },
        {
          derive: {
            title: 'A percentage from a slope',
            intro: 'Suppose $y = A e^{bx}$: each step of $x$ multiplies $y$ by the same factor.',
            steps: [
              { prompt: 'Take the natural log of both sides: $\\ln y$ in terms of $A$, $b$ and $x$?', answer: 'ln(A)+b*x', vars: { A: [1, 100], b: [-1, 1], x: [0, 10] }, why: 'A straight line in $x$, with slope $b$ and intercept $\\ln A$: fit a line to $(x, \\ln y)$ and read off $b$.' },
              { prompt: 'One step from $x$ to $x + 1$ multiplies $y$ by what, in terms of $b$?', answer: 'exp(b)', vars: { b: [-1, 1] }, why: '$\\frac{Ae^{b(x+1)}}{Ae^{bx}} = e^b$. As a change: $e^b - 1$; for small $b$ about $b$ itself, which is why a log slope of 0.05 is read as “about 5% per step”.' },
              { prompt: 'The generator multiplies the visits by $e^{0.05}$ per degree. As a percentage change per degree (to 2 decimals)?', number: 100 * TRUE_GROWTH, compute: () => 100 * (Math.exp(0.05) - 1), tolerance: 0.005, why: `${(100 * TRUE_GROWTH).toFixed(2)}%: the truth the fit should find.` },
            ],
          },
        },
        {
          code: { file: 'patterns.py', fn: 'growth_per_unit', notes: [['slope, _ = fit_line(xs, [math.log(y) for y in ys])', ['A straight line through $(x, \\ln y)$: the derivation’s first step. `_` is the intercept, not needed.']], ['return math.exp(slope) - 1', ['Its second: the factor per step, as a change.']]] },
        },
        {
          write: {
            file: 'patterns.py', fn: 'growth_per_unit', given: ['covariance', 'correlation', 'fit_line'], also: SPREAD, prelude: 'import math',
            prompt: 'Write `growth_per_unit(xs, ys)`: fit a line to `xs` and the natural logs of `ys` (`math.log`), and return $e^{\\text{slope}} - 1$.',
            starter: 'def growth_per_unit(xs, ys):\n    slope, _ = fit_line(xs, ys)\n    return slope\n',
            cases: cases(P.growthPerUnit, [[[0, 1, 2], [100, 110, 121]], [[0, 1, 2, 3], [8, 4, 2, 1]], [HQ, VQ]]),
            hint: '`slope, _ = fit_line(xs, [math.log(y) for y in ys])`, then `math.exp(slope) - 1`.',
          },
        },
        {
          predict: {
            prompt: 'Run it on the quiet days: how many percent more visits per degree does the fit find (to 2 decimals)?',
            answer: 100 * GROWTH, compute: () => 100 * P.growthPerUnit(HQ, VQ), tolerance: 0.005,
            explain: `${(100 * GROWTH).toFixed(2)}%, against the truth’s ${(100 * TRUE_GROWTH).toFixed(2)}%: the gap is the noise of one year of days (Part 6 puts an interval round it). On the log scale the residuals have the same spread on cold and hot days, and the correlation of temperature with log visits is ${P.correlation(HQ, VQ.map(Math.log)).toFixed(3)}.`,
          },
        },
        {
          formula: {
            table: 'orders', solution: '=EXP(SLOPE(LN(FILTER(days!E2:E366, days!E2:E366<9000)), FILTER(days!B2:B366, days!E2:E366<9000)))-1', must: ['EXP', 'SLOPE', 'LN', 'FILTER'],
            prompt: 'In the spreadsheet: leave out the news day with `FILTER(…, days!E2:E366<9000)`, take `LN` of the visits, find the `SLOPE` against the temperature, and turn it into a change with `EXP(…)-1`.',
            hint: '`=EXP(SLOPE(LN(FILTER(days!E2:E366, days!E2:E366<9000)), FILTER(days!B2:B366, days!E2:E366<9000)))-1`',
            explain: `${pct(sheet('=EXP(SLOPE(LN(FILTER(days!E2:E366, days!E2:E366<9000)), FILTER(days!B2:B366, days!E2:E366<9000)))-1'), 2)} per degree, your \`growth_per_unit\`. With the news day in, it gives ${pct(P.growthPerUnit(H, V), 2)}: on a log scale 9,412 is only ${(Math.log(NEWS.visits) - Math.log(USUAL)).toFixed(1)} above an ordinary day, so it does much less harm than on an ordinary axis.`,
          },
        },
        {
          choice: {
            prompt: 'Why report “5% more visits per degree” rather than “20 more visits per degree”?',
            options: [
              { text: 'Percentages always sound better.', why: 'Not a reason.' },
              { text: 'Because the effect really multiplies: 20 visits is a big change in January and a small one in July, but 5% is the same every day of the year.', why: 'Yes. The right scale is the one on which the effect is constant: the straight line, with an even spread of residuals, says the log scale is it.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'overplotting', number: '5.7', title: 'Too many dots',
      goal: 'Recognise overplotting, count how many dots a chart hides, and reveal them with transparency and seeded jitter.',
      builds: ['log-transforms'],
      blocks: [
        { h: 'Four hundred orders, sixteen dots' },
        { md: `Plot every clean order as a dot at its quantity (1, 2 or 3) and its item. There are ${CLEAN.length} orders, but most of them land **exactly on top of each other**: a chart of ${CLEAN.length} dots shows only a handful. This is **overplotting**, and it hides the very thing the chart should show: where most of the data is.` },
        {
          predict: {
            prompt: 'Six items, quantities 1 to 3. How many different spots (quantity, item) do the clean orders actually land on? Lesson 1.1’s `make_orders` decides which quantities each item can have.',
            answer: SPOTS, compute: () => new Set(CLEAN.map(r => `${r.item}|${r.quantity}`)).size,
            explain: `${SPOTS}: five items under £50 in quantities 1 to 3, and bikes only one at a time. ${CLEAN.length} orders drawn as ${SPOTS} dots: on average ${(CLEAN.length / SPOTS).toFixed(0)} hidden under each.`,
            misconceptions: [{ answer: 18, feedback: 'Bikes cost £450: the generator sells them one at a time.' }],
          },
        },
        { figure: 'Overplotting', caption: 'The orders with no help, with transparency, and with jitter. Slide the jitter and the opacity.' },
        { h: 'Two fixes' },
        { md: `- **Transparency**: draw each dot faint (\`fill-opacity\` 0.2, say). Where many overlap, they add up to dark; a lone dot stays pale. The darkness now shows how many are there, up to about $1/\\text{opacity}$ of them.
- **Jitter**: move each dot by a small random amount, so piles spread into clouds whose size shows their count. The amount must stay smaller than half the gap between levels, or a 2 could be read as a 1. And the jitter should be **seeded**, so the same chart is drawn every time.` },
        {
          derive: {
            title: 'How much jitter',
            intro: 'Quantities 1, 2 and 3 are one unit apart. Jitter moves a dot by up to $a$ either way.',
            steps: [
              { prompt: 'A jittered 1 can reach $1 + a$ and a jittered 2 as low as $2 - a$. For the two clouds not to meet, $1 + a < 2 - a$. The largest $a$?', number: 0.5, compute: () => (2 - 1) / 2, why: 'Half the gap between levels. This lesson uses 0.3, leaving a clear space between the clouds.' },
            ],
          },
        },
        {
          code: { file: 'patterns.py', fn: 'jitter', notes: [['return [x + amount * (2 * rng.random() - 1) for x in values]', ['`rng.random()` is between 0 and 1, so `2 * rng.random() - 1` is between −1 and 1: each value moves at most `amount` either way.']]] },
        },
        {
          write: {
            file: 'patterns.py', fn: 'jitter', prelude: WITH_RNG,
            prompt: 'Write `jitter(values, amount, seed)`: each value plus `amount × (2u − 1)`, with `u` from one generator `Rng(seed)`, drawn in order. (`Rng`, the shop’s generator, is given.)',
            starter: 'def jitter(values, amount, seed):\n    rng = Rng(seed)\n    # each value moved by up to amount, either way\n    return list(values)\n',
            cases: cases(P.jitter, [[[1, 2, 3, 3, 3], 0.3, 4], [[0, 0], 1, 9]]),
            hint: '`[x + amount * (2 * rng.random() - 1) for x in values]`',
          },
        },
        {
          chart: {
            prompt: 'Each order’s jitter is in the data, worked out by your `jitter` (`d.jx` in quantity units, `d.jy` in pixels). Move each circle by it, and draw them faint: `fill-opacity` 0.25.',
            data: DOTS,
            starter: `const items = ['Bike', 'Helmet', 'Lights, front and back', 'Lock', 'Inner tube', 'Service']
const x = d3.scaleLinear().domain([0.5, 3.5]).range([160, 460])
const y = d3.scalePoint().domain(items).range([30, 250])
svg.selectAll('circle')
  .data(data)
  .join('circle')
  .attr('cx', d => x(d.quantity))
  .attr('cy', d => y(d.item))
  .attr('r', 3)
  .attr('fill', 'steelblue').attr('fill-opacity', 1)
svg.append('g').attr('transform', 'translate(160,0)').call(d3.axisLeft(y))
svg.append('g').attr('transform', 'translate(0,270)').call(d3.axisBottom(x).ticks(3))
`,
            solution: `const items = ['Bike', 'Helmet', 'Lights, front and back', 'Lock', 'Inner tube', 'Service']
const x = d3.scaleLinear().domain([0.5, 3.5]).range([160, 460])
const y = d3.scalePoint().domain(items).range([30, 250])
svg.selectAll('circle')
  .data(data)
  .join('circle')
  .attr('cx', d => x(d.quantity + d.jx))
  .attr('cy', d => y(d.item) + d.jy)
  .attr('r', 3)
  .attr('fill', 'steelblue').attr('fill-opacity', 0.25)
svg.append('g').attr('transform', 'translate(160,0)').call(d3.axisLeft(y))
svg.append('g').attr('transform', 'translate(0,270)').call(d3.axisBottom(x).ticks(3))
`,
            checks: [{ select: 'circle', attrs: ['cx', 'cy', 'fill-opacity'] }],
            verify: marks => marks.circle.every((m, k) => near(m.cx, G.linearScale(0.5, 3.5, 160, 460, DOTS[k].quantity + DOTS[k].jx)) && m['fill-opacity'] === 0.25),
            hint: '`.attr(\'cx\', d => x(d.quantity + d.jx))`, `.attr(\'cy\', d => y(d.item) + d.jy)` and `.attr(\'fill-opacity\', 0.25)`.',
            explain: `Now each pile is a cloud whose size is its count. The biggest is ${(() => { const c = S.groupBy(CLEAN.map(r => ({ k: `${r.item} × ${r.quantity}` })), 'k'); const [k, v] = [...c].sort((a, b) => b[1].length - a[1].length)[0]; return `${k} (${v.length} orders)` })()}.`,
          },
        },
      ],
    },

    {
      id: 'correlation-matrix', number: '5.8', title: 'The correlation matrix',
      goal: 'Correlate every column with every other at once, count the pairs, and read a correlation matrix drawn as a diverging heat map.',
      builds: ['overplotting'],
      blocks: [
        { h: 'Every pair at once' },
        { md: `The days have four numeric columns. Rather than ask about one pair at a time, compute $r$ for **every** pair and lay them out in a square: the **correlation matrix**. Row $i$, column $j$ holds $r$ for columns $i$ and $j$. The news day is left out (lesson 5.3).` },
        {
          derive: {
            title: 'How many pairs',
            intro: 'A matrix for $k$ columns has $k^2$ cells.',
            steps: [
              { prompt: 'The diagonal holds each column with itself. Its value?', number: 1, compute: () => P.correlation(HQ, HQ), tolerance: 1e-12, why: 'A column is a perfect straight line of itself.' },
              { prompt: '$r(x, y) = r(y, x)$, so the cells above the diagonal repeat those below. How many different pairs, in terms of $k$?', answer: 'k*(k-1)/2', vars: { k: [2, 30] }, why: '$k^2$ cells, minus the $k$ on the diagonal, halved.' },
              { prompt: 'For a table of 20 numeric columns?', number: 190, compute: () => (20 * 19) / 2, why: '190 correlations: and at that scale, a few will look strong by chance alone (Part 7 comes back to many tests at once).' },
            ],
          },
        },
        {
          code: { file: 'patterns.py', fn: 'correlation_matrix', notes: [['return [[correlation(a, b) for b in columns] for a in columns]', ['A list of rows: one per column, holding its r with every column. It works out every cell, both halves; halving it would save time, not change an answer.']]] },
        },
        {
          write: {
            file: 'patterns.py', fn: 'correlation_matrix', given: ['covariance', 'correlation'], also: SPREAD, prelude: 'import math',
            prompt: 'Write `correlation_matrix(columns)`: for a list of columns, a list of rows, row `i` holding the correlation of column `i` with each column in turn.',
            starter: 'def correlation_matrix(columns):\n    # one row per column\n    return []\n',
            cases: cases(P.correlationMatrix, [[[[1, 2, 3], [3, 2, 1]]], [[HQ, RQ, RIQ, VQ]]]),
            hint: '`[[correlation(a, b) for b in columns] for a in columns]`',
          },
        },
        {
          chart: {
            prompt: 'Draw the matrix as a heat map. The cells are placed for you, one per pair (`d.a`, `d.b`, `d.r`). Colour them with a **diverging** scale (lesson 4.7): red at −1, white at 0, dark blue at 1, and write each r in its cell as text of class `r`, to 2 decimals.',
            data: CELLS,
            starter: `const names = ['high_c', 'rain_mm', 'riders', 'visits']
const x = d3.scaleBand().domain(names).range([120, 440])
const y = d3.scaleBand().domain(names).range([20, 270])
svg.selectAll('rect')
  .data(data)
  .join('rect')
  .attr('x', d => x(d.b)).attr('y', d => y(d.a))
  .attr('width', x.bandwidth()).attr('height', y.bandwidth())
  .attr('fill', 'steelblue')
svg.append('g').attr('transform', 'translate(120,0)').call(d3.axisLeft(y).tickSize(0))
svg.append('g').attr('transform', 'translate(0,270)').call(d3.axisBottom(x).tickSize(0))
`,
            solution: `const names = ['high_c', 'rain_mm', 'riders', 'visits']
const x = d3.scaleBand().domain(names).range([120, 440])
const y = d3.scaleBand().domain(names).range([20, 270])
const colour = d3.scaleLinear().domain([-1, 0, 1]).range(['#b0413e', 'white', '#08306b'])
svg.selectAll('rect')
  .data(data)
  .join('rect')
  .attr('x', d => x(d.b)).attr('y', d => y(d.a))
  .attr('width', x.bandwidth()).attr('height', y.bandwidth())
  .attr('fill', d => colour(d.r))
svg.selectAll('text.r')
  .data(data)
  .join('text')
  .attr('class', 'r')
  .attr('x', d => x(d.b) + x.bandwidth() / 2).attr('y', d => y(d.a) + y.bandwidth() / 2)
  .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
  .attr('fill', d => (Math.abs(d.r) > 0.5 ? 'white' : 'black'))
  .text(d => d.r.toFixed(2))
svg.append('g').attr('transform', 'translate(120,0)').call(d3.axisLeft(y).tickSize(0))
svg.append('g').attr('transform', 'translate(0,270)').call(d3.axisBottom(x).tickSize(0))
`,
            checks: [{ select: 'rect', attrs: ['fill'] }, { select: 'text.r', attrs: ['#text', 'x', 'y'] }],
            verify: marks => marks.rect.every((m, k) => { const r = CELLS[k].r; return m.fill === `rgb(${(r < 0 ? G.mix(RED, WHITE, r + 1) : G.mix(WHITE, BLUE, r)).join(', ')})` }),
            hint: '`const colour = d3.scaleLinear().domain([-1, 0, 1]).range([\'#b0413e\', \'white\', \'#08306b\'])`, `.attr(\'fill\', d => colour(d.r))`; then a `text.r` per cell, in its middle, with `.text(d => d.r.toFixed(2))`.',
            explain: 'With three colours, a linear scale has two pieces: −1 to 0 mixes red into white (your `mix`, lesson 4.7), 0 to 1 white into blue. The tests check every fill against `mix`.',
          },
        },
        {
          predict: {
            prompt: 'Read the matrix: the correlation of rain and visits?',
            answer: MATRIX[1][3], compute: () => P.correlation(RQ, VQ), tolerance: 0.005,
            explain: `${MATRIX[1][3].toFixed(3)}: wet days have fewer visits. Yet the generator never lets rain touch the visits (lesson 5.1’s code). The link is the temperature: it rains on more days in winter, and winter days have fewer visits. A correlation between two columns can come entirely from a third. Lessons 5.9 and 5.10 are about that third column.`,
          },
        },
        {
          formula: {
            table: 'orders', solution: '=CORREL(days!B2:B366, days!C2:C366)', must: ['CORREL'],
            prompt: 'One cell of the matrix in the spreadsheet: temperature (B) and rain (C).',
            hint: '`=CORREL(days!B2:B366, days!C2:C366)`',
            explain: `${sheet('=CORREL(days!B2:B366, days!C2:C366)').toFixed(4)}: warmer days are a little drier. Small, but it is the path that links rain to visits.`,
          },
        },
      ],
    },

    {
      id: 'simpsons-paradox', number: '5.9', title: 'Simpson’s paradox',
      goal: 'Find a rate that reverses when the data is split into groups, explain it as a weighted average, and find the confounder by joining another table.',
      builds: ['correlation-matrix'],
      blocks: [
        { h: 'Which courier is better?' },
        { md: `The shop posts its web orders with two couriers, Northern and Swift. The deliveries table records, for each of the ${DELIVERIES.length} parcels, the courier and whether it arrived on time (within two days). The manager wants to drop the worse courier.` },
        {
          formula: {
            table: 'orders', solution: '=COUNTIFS(deliveries!B2:B163, "Northern", deliveries!D2:D163, "yes")/COUNTIF(deliveries!B2:B163, "Northern")', must: ['COUNTIFS', 'COUNTIF'],
            prompt: 'On the deliveries sheet (B: courier, D: on time): what share of Northern’s parcels were on time?',
            hint: '`=COUNTIFS(deliveries!B2:B163, "Northern", deliveries!D2:D163, "yes")/COUNTIF(deliveries!B2:B163, "Northern")`',
            explain: `${pct(sheet('=COUNTIFS(deliveries!B2:B163, "Northern", deliveries!D2:D163, "yes")/COUNTIF(deliveries!B2:B163, "Northern")'))}: ${BY_COURIER.Northern[0]} of ${BY_COURIER.Northern[1]}.`,
          },
        },
        {
          predict: {
            prompt: 'And Swift’s share (as a fraction, to 3 decimals)?',
            answer: rate(BY_COURIER.Swift), compute: () => rate(P.rateBy(DELIVERIES, 'courier', 'on_time', 'yes').Swift), tolerance: 5e-4,
            explain: `${rate(BY_COURIER.Swift).toFixed(3)}: ${BY_COURIER.Swift[0]} of ${BY_COURIER.Swift[1]}. Swift looks better by ${(100 * (rate(BY_COURIER.Swift) - rate(BY_COURIER.Northern))).toFixed(1)} points. Drop Northern?`,
          },
        },
        { h: 'Join the town' },
        { md: `The deliveries table has no town; the orders do. Join them by order id (lesson 3.7), and split the parcels into **near** towns (Leeds, Wakefield) and **far** ones (${FAR_TOWNS.join(', ')}).` },
        {
          code: {
            file: 'patterns.py', fn: 'rate_by', notes: [
              ['hits, n = counts.get(row[key], [0, 0])', ['The counts so far for this group, or none yet: a group-by (lesson 2.7) that keeps two numbers per group.']],
              ['counts[row[key]] = [hits + (1 if row[column] == yes else 0), n + 1]', ['Counts, not rates: two groups’ counts can be added to give the combined rate, two rates can’t (the derivation shows why).']],
            ],
          },
        },
        {
          write: {
            file: 'patterns.py', fn: 'rate_by',
            prompt: 'Write `rate_by(rows, key, column, yes)`: a dictionary from each value of `key` to `[hits, rows]`, where a hit is a row whose `column` equals `yes`.',
            starter: 'def rate_by(rows, key, column, yes):\n    counts = {}\n    # [hits, rows] for each value of key\n    return counts\n',
            cases: cases(P.rateBy, [[[{ k: 'a', ok: 'yes' }, { k: 'a', ok: 'no' }, { k: 'b', ok: 'yes' }], 'k', 'ok', 'yes'], [DELIVERIES, 'group', 'on_time', 'yes']]),
            hint: 'For each row: `hits, n = counts.get(row[key], [0, 0])`, then `counts[row[key]] = [hits + (1 if row[column] == yes else 0), n + 1]`.',
          },
        },
        { figure: 'Simpson', caption: 'The four groups, and the overall rate of each courier as a weighted average of its two. Move the share of far parcels each courier takes.' },
        { md: `Within the far towns: Northern ${NF[0]}/${NF[1]} (${pct(rate(NF))}), Swift ${SF[0]}/${SF[1]} (${pct(rate(SF))}). Within the near towns: Northern ${NN[0]}/${NN[1]} (${pct(rate(NN))}), Swift ${SN[0]}/${SN[1]} (${pct(rate(SN))}). **Northern is better in both groups, and worse overall.** That is **Simpson's paradox** (named by Simpson in 1951, seen by Yule in 1903).` },
        {
          derive: {
            title: 'An overall rate is a weighted average',
            intro: `Northern’s parcels: ${NF[1]} far at ${pct(rate(NF))}, ${NN[1]} near at ${pct(rate(NN))}.`,
            steps: [
              { prompt: 'Northern’s overall rate: the on-time parcels of both groups over all its parcels (to 3 decimals)?', number: rate(BY_COURIER.Northern), compute: () => (NF[0] + NN[0]) / (NF[1] + NN[1]), tolerance: 5e-4, why: `$(${NF[0]} + ${NN[0]})/(${NF[1]} + ${NN[1]}) = ${rate(BY_COURIER.Northern).toFixed(3)}$.` },
              { prompt: 'Write it with $w$, the share of the courier’s parcels that are far, $f$ the far rate and $n$ the near rate.', answer: 'w*f+(1-w)*n', vars: { w: [0, 1], f: [0, 1], n: [0, 1] }, why: 'A weighted average of the two rates, weighted by where the parcels went. Each courier has its own weights.' },
              { prompt: 'Northern’s $w$ (to 3 decimals)?', number: NF[1] / BY_COURIER.Northern[1], compute: () => NF[1] / (NF[1] + NN[1]), tolerance: 5e-4, why: `${(NF[1] / BY_COURIER.Northern[1]).toFixed(3)}, against Swift’s ${(SF[1] / BY_COURIER.Swift[1]).toFixed(3)}. Northern carries most of the hard parcels, so its average leans towards the far rate. Better in each group, its weights drag it down.` },
            ],
          },
        },
        {
          code: {
            file: 'data.py', fn: 'make_deliveries', notes: [
              ['courier = "Northern" if rng.below(100) < (80 if far else 20) else "Swift"', ['The truth: the shop gives Northern 80 in 100 far parcels and 20 in 100 near ones. Distance decides the courier.']],
              ['on_time = rng.below(100) < ON_TIME[courier][0 if far else 1]', ['And distance decides lateness: `ON_TIME` is Northern 70 far and 97 near, Swift 50 and 85. Northern really is better, everywhere.']],
            ],
          },
        },
        {
          formula: {
            table: 'orders', solution: '=SUMPRODUCT((deliveries!B2:B163="Northern")*(deliveries!D2:D163="yes")*ISNUMBER(MATCH(PROPER(TRIM(XLOOKUP(deliveries!A2:A163, A2:A403, C2:C403))), {"York","Harrogate"}, 0)))', must: ['SUMPRODUCT', 'XLOOKUP'],
            prompt: 'The join, in one formula: for each delivery, `XLOOKUP` its order id in column A of the orders and return the town (C), cleaned with `PROPER(TRIM(…))`; it is far if `MATCH` finds it in `{"York","Harrogate"}`. Count Northern’s on-time far parcels with `SUMPRODUCT`.',
            hint: '`=SUMPRODUCT((deliveries!B2:B163="Northern")*(deliveries!D2:D163="yes")*ISNUMBER(MATCH(PROPER(TRIM(XLOOKUP(deliveries!A2:A163, A2:A403, C2:C403))), {"York","Harrogate"}, 0)))`',
            explain: `${sheet('=SUMPRODUCT((deliveries!B2:B163="Northern")*(deliveries!D2:D163="yes")*ISNUMBER(MATCH(PROPER(TRIM(XLOOKUP(deliveries!A2:A163, A2:A403, C2:C403))), {"York","Harrogate"}, 0)))')}, as \`rate_by\` found (${NF[0]}). Three lessons in one formula: a join (3.7), cleaning (3.1), and a count with conditions (1.5).`,
          },
        },
        {
          choice: {
            prompt: 'Which courier should take the far parcels?',
            options: [
              { text: 'Swift: it is on time more often overall.', why: 'Overall, Swift carries mostly easy parcels. Compare like with like: on far parcels Swift was on time 6 times in 16.' },
              { text: 'Northern: it is better on far parcels and on near ones; it only looks worse because it carries most of the far ones.', why: 'Yes. Distance is a **confounder**: it decides both the courier and the lateness. Splitting by it compares like with like.' },
            ],
            answer: 1,
          },
        },
        { note: 'Splitting is not always right. Split by a confounder, which comes **before** the choice (distance decided the courier). Don’t split by something the choice itself **causes**: if one courier’s parcels were late because they went by a slower depot, splitting by depot would hide the very effect you want to measure. The data alone can’t tell the two apart; knowing how the data was made can.', kind: 'warn' },
      ],
    },

    {
      id: 'not-causation', number: '5.10', title: 'Project: correlation is not causation',
      goal: 'Simulate a confounder, a collider and selection bias with the truth known, hold a third column fixed with a partial correlation, and answer whether riders bring visits to the website.',
      builds: ['simpsons-paradox'],
      blocks: [
        { h: 'The manager’s question' },
        { md: `Riders and website visits are strongly correlated: $r$ = ${P.correlation(RIQ, VQ).toFixed(3)} on the quiet days. The manager proposes sponsoring the cycle path: more riders, more visits. Does the data support it?

We know the answer, because we know the generator: visits depend on the temperature and on nothing else. But real data comes without its generator. This project builds three small worlds where the truth is set, to learn what each kind of false correlation looks like, and then a tool that sees through one of them.` },
        {
          code: {
            file: 'patterns.py', fn: 'simulate', notes: [
              ['x, y = z + noise(rng), z + noise(rng)', ['**Confounder**: $z$ is in both $x$ and $y$, so they rise and fall together, and neither causes the other. Temperature, riders and visits.']],
              ['z = x + y + 0.5 * noise(rng)', ['**Collider**: $x$ and $y$ are unrelated, and both cause $z$. Harmless, until you keep only some values of $z$.']],
              ['x, y, z = noise(rng), noise(rng), noise(rng)', ['Nothing related to anything: the baseline.']],
            ],
          },
        },
        { figure: 'CausalSims', caption: 'Each world, 2,000 rows. The dots are coloured by z. Hold z fixed (a band of z) or keep only z > 1, and watch r.' },
        {
          derive: {
            title: 'The confounder’s correlation, by hand',
            intro: '$z$, $e_1$ and $e_2$ are independent, each with variance 1. $x = z + e_1$, $y = z + e_2$.',
            steps: [
              { prompt: 'The covariance of $x$ and $y$: the only part they share is $z$. In terms of $v$, the variance of $z$?', answer: 'v', vars: { v: [0.1, 5] }, why: '$\\text{cov}(z + e_1, z + e_2) = \\text{var}(z) + 0 + 0 + 0$: the noises are independent of everything.' },
              { prompt: 'The variance of $x$ when $z$ and $e_1$ both have variance 1?', number: 2, compute: () => 1 + 1, why: 'Independent variances add (lesson 6.4 derives it).' },
              { prompt: '$r = \\frac{1}{\\sqrt 2 \\sqrt 2}$?', number: 0.5, compute: () => 1 / (Math.sqrt(2) * Math.sqrt(2)), tolerance: 1e-12, why: `0.5. The simulation measures ${simR(SIMS.confounder).toFixed(3)} on its 2,000 rows: x and y look related, and neither touches the other.` },
            ],
          },
        },
        { h: 'Holding a third column fixed' },
        { md: `If $z$ makes $x$ and $y$ move together, take $z$'s part **out of each**: fit a line of $x$ on $z$ and keep the residuals (lesson 5.4), do the same for $y$, and correlate what is left. That is the **partial correlation** of $x$ and $y$ given $z$: the correlation that remains when $z$ is held fixed.` },
        {
          write: {
            file: 'patterns.py', fn: 'partial_correlation', given: ['covariance', 'correlation', 'fit_line', 'residuals'], also: SPREAD, prelude: 'import math',
            prompt: 'Write `partial_correlation(xs, ys, zs)`: the correlation of the residuals of `xs` on `zs` with the residuals of `ys` on `zs`. (`residuals(xs, ys)` gives what a line in `xs` leaves of `ys`: here `zs` comes first.)',
            starter: 'def partial_correlation(xs, ys, zs):\n    # take z out of each, then correlate\n    return correlation(xs, ys)\n',
            cases: cases(P.partialCorrelation, [[RIQ, VQ, HQ], ...['confounder', 'collider'].map(kind => { const s = P.simulate(kind, 300, 3); return [s.map(r => r[0]), s.map(r => r[1]), s.map(r => r[2])] })]),
            hint: '`correlation(residuals(zs, xs), residuals(zs, ys))`',
          },
        },
        {
          predict: {
            prompt: `Riders and visits on the quiet days, with the temperature held fixed: their partial correlation (to 3 decimals)?`,
            answer: PARTIAL, compute: () => P.partialCorrelation(RIQ, VQ, HQ), tolerance: 5e-4,
            explain: `${PARTIAL.toFixed(3)}, from ${P.correlation(RIQ, VQ).toFixed(3)}. Once the temperature is accounted for, riders say almost nothing more about visits: the generator’s truth, found from the data. Why not exactly 0? One year of days is a sample. Resampling the days 1,000 times (the bootstrap of lesson 6.7) moves this number between ${PARTIAL_CI[0].toFixed(2)} and ${PARTIAL_CI[1].toFixed(2)}: what is left is chance.`,
          },
        },
        {
          formula: {
            table: 'orders', solution: '=CORREL(FILTER(days!D2:D366, days!E2:E366<9000), FILTER(days!E2:E366, days!E2:E366<9000))', must: ['CORREL', 'FILTER'],
            prompt: 'The raw correlation the manager saw: riders (D) and visits (E) on the quiet days, without the news day.',
            hint: '`=CORREL(FILTER(days!D2:D366, days!E2:E366<9000), FILTER(days!E2:E366, days!E2:E366<9000))`',
            explain: `${sheet('=CORREL(FILTER(days!D2:D366, days!E2:E366<9000), FILTER(days!E2:E366, days!E2:E366<9000))').toFixed(4)}. Strong, and entirely the temperature’s doing.`,
          },
        },
        { h: 'Colliders and selection bias' },
        {
          predict: {
            prompt: `In the collider world, $x$ and $y$ are unrelated: $r$ = ${simR(SIMS.collider).toFixed(3)} over all 2,000 rows. Keep only the rows with $z > 1$ (${SELECTED.length} of them). What is $r$ now (to 2 decimals)?`,
            answer: simR(SELECTED), compute: () => simR(SIMS.collider.filter(r => r[2] > 1)), tolerance: 0.005,
            explain: `${simR(SELECTED).toFixed(2)}. Among rows with a high $z = x + y$, a low $x$ must be made up for by a high $y$: selecting on a common effect **creates** a correlation. This is **selection bias**, and it hides in plain sight: study only customers who left a review (a review needs either a great or an awful experience), only bikes that came in for repair, only cyclists who survived a crash. Holding $z$ fixed by partial correlation does the same damage here: ${P.partialCorrelation(...[0, 1, 2].map(i => SIMS.collider.map(r => r[i]))).toFixed(2)}.`,
          },
        },
        {
          choice: {
            prompt: 'So when should you hold a third column fixed?',
            options: [
              { text: 'Always: the more columns held fixed, the safer.', why: 'Holding a collider fixed creates a correlation that isn’t there, as the last question showed.' },
              { text: 'When it is a common cause of both (a confounder), and never when it is a common effect (a collider); which it is comes from knowing how the data was made, not from the data.', why: 'Yes. The same partial correlation removes a false link in one world and creates one in the other, and the numbers look alike. Causal questions need a picture of what causes what, or an experiment (Part 7).' },
            ],
            answer: 1,
          },
        },
        {
          choice: {
            prompt: 'Should the shop sponsor the cycle path to bring visitors to its website?',
            options: [
              { text: 'Yes: r = 0.78 is strong.', why: 'Strong, and all of it the temperature’s. Held fixed, the link is gone.' },
              { text: 'Not for that reason: riders and visits move together because warm weather brings both. More riders on a cold day would not bring more visits.', why: 'Yes: a confounder. To know what sponsoring would do, change the riders and watch the visits, with everything else equal: an experiment, Part 7.' },
            ],
            answer: 1,
          },
        },
        { note: 'Part 6 asks how sure any of these numbers is: a correlation from 364 days, a 5.26% growth, a courier’s 13 of 14. Samples and uncertainty.', kind: 'key' },
      ],
    },
  ],
}
