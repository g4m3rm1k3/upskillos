// Part 12: telling the story. Error bars and what they mean; bands around a forecast and how often
// they hold; absolute and relative change; a dashboard whose views filter each other; reproducible
// work; and the capstone, the shop's year from the raw CSV to a recommendation (python/story.py,
// engine/story.js).
import * as T from '../engine/tables.js'
import * as C from '../engine/cleaning.js'
import * as S from '../engine/summary.js'
import * as G from '../engine/charts.js'
import * as P from '../engine/patterns.js'
import * as F from '../engine/models.js'
import * as Q from '../engine/significance.js'
import * as W from '../engine/forecasting.js'
import * as Y from '../engine/story.js'
import { ORDERS_CSV, CATALOGUE_CSV, DAYS_CSV, TRIAL_CSV } from '../engine/data.js'
import { evaluateFormula } from '../engine/sheet.js'

const cases = (fn, inputs) => inputs.map(args => ({ args, expected: fn(...args) }))
const sheet = formula => evaluateFormula('orders', formula).value
const MEANS = [['summary.py', 'total'], ['summary.py', 'mean']]
const pct = (x, d = 1) => `${(100 * x).toFixed(d)}%`
const f1 = x => x.toFixed(1), f2 = x => x.toFixed(2)
const near = (a, b, tol = 1e-6) => Math.abs(a - b) < tol
const money = x => `£${x.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const DAYS = P.numberDays(T.readCsv(DAYS_CSV())), DATES = DAYS.map(r => r.date), RI = DAYS.map(r => r.riders)
// 12.1
const WD = DATES.map(F.weekday), BY_DAY = Y.groupIntervals(WD, RI)
const SAT = BY_DAY[5], MON = BY_DAY[0]
const WEEKEND = RI.filter((_, i) => WD[i] >= 5), WEEKDAY = RI.filter((_, i) => WD[i] < 5)
const SE_DIFF = Math.sqrt(S.variance(WEEKEND) / WEEKEND.length + S.variance(WEEKDAY) / WEEKDAY.length)
// 12.2
const HW1 = W.holtWinters(RI, 0.1, 0.01, 0.2, 7), HW7 = W.holtWinters(RI, 0.1, 0.01, 0.2, 7, 7)
const ERR1 = RI.slice(91, 273).map((y, k) => y - HW1[91 + k]), ERR7 = RI.slice(91, 273).map((y, k) => y - HW7[91 + k])
const B80 = Y.errorBand(ERR1, 0.8), B95 = Y.errorBand(ERR1, 0.95)
const C80 = Y.coverage(RI.slice(273), HW1.slice(273), B80), C95 = Y.coverage(RI.slice(273), HW1.slice(273), B95)
const C80_7 = Y.coverage(RI.slice(273), HW7.slice(273), Y.errorBand(ERR7, 0.8))
const SD_ERR = S.std(ERR1), NORMAL95 = Y.coverage(RI.slice(273), HW1.slice(273), [-1.96 * SD_ERR, 1.96 * SD_ERR])
const LATE_SD = S.std(RI.slice(273).map((y, k) => y - HW1[273 + k]))
// 12.3: the trial of lesson 7.10.
const TRIAL = T.readCsv(TRIAL_CSV()), tally = page => TRIAL.filter(r => r.page === page).reduce((s, r) => [s[0] + Number(r.clicks), s[1] + Number(r.visitors)], [0, 0])
const [CA, NA] = tally('A'), [CB, NB] = tally('B'), RISK = Y.riskSummary(CA, NA, CB, NB)
const P_TRIAL = Q.zPValue(Q.twoProportionZ(CA, NA, CB, NB)), LIFT = Q.liftInterval(CA, NA, CB, NB)
// 12.4 and 12.6: the cleaned orders.
const PRICES = Object.fromEntries(T.readCsv(CATALOGUE_CSV()).map(r => [r.item, T.toPence(r.list_price)]))
const RAW = T.readCsv(ORDERS_CSV()), CLEAN = C.cleanOrders(RAW, PRICES)
const DASH = CLEAN.filter(r => r.price !== null).map(r => ({ town: r.town, channel: r.channel, price: r.price / 100 }))
const WEB_CHEAP = { channel: ['web'], price: { low: 0, high: 50 } }
const LINKED_TOWN = Y.linkedCounts(DASH, WEB_CHEAP, 'town'), LINKED_CHANNEL = Y.linkedCounts(DASH, WEB_CHEAP, 'channel')
// 12.5
const FP = Y.fingerprint(ORDERS_CSV()), FP_SWAP = Y.fingerprint(ORDERS_CSV().replace('Leeds', 'leeds'))
// 12.6: the year in numbers, each from a lesson's method.
const KNOWN = CLEAN.filter(r => r.price !== null)
const REVENUE = S.total(KNOWN.map(r => r.price * r.quantity)) / 100
const MISSING = CLEAN.length - KNOWN.length
const PER_ORDER = REVENUE / KNOWN.length, REV_FILLED = REVENUE + MISSING * PER_ORDER
const XR = DAYS.map((r, i) => [1, r.high_c, r.rain_mm, WD[i] >= 5 ? 1 : 0]), WR = F.fit(XR, RI)
const NEXT_WEEK = W.holtWintersAhead(RI, 0.1, 0.01, 0.2, 7, 7)
const WEEK_TOTAL = S.total(NEXT_WEEK)

export const PART12 = {
  id: 'part12', title: 'Part 12 · Telling the story', lessons: [
    {
      id: 'error-bars', number: '12.1', title: 'Error bars',
      goal: 'Draw a mean with its uncertainty, say exactly what the bar means, and avoid reading overlapping bars as “no difference”.',
      builds: ['datasheet-project'],
      blocks: [
        { h: 'Every number has an error' },
        { md: `Part 6 put an interval round every number computed from a sample. A chart that shows means without them invites readers to see differences that chance alone would make. An **error bar** draws the uncertainty, but "error bar" means three different things, and a chart must say which:

- **± one standard deviation**: how spread out the **data** are (lesson 2.5);
- **± one standard error**: how uncertain the **mean** is, sd/√n (lesson 6.4), much shorter;
- a **95% confidence interval**: about ± 1.96 standard errors (lesson 6.7).

Here, riders by weekday, each with its 95% interval.` },
        {
          code: { file: 'story.py', fn: 'group_intervals', notes: [['m, se = mean(g), std(g) / math.sqrt(len(g))', ['Lesson 6.4’s standard error of a mean.']], ['out.append([k, len(g), m, m - z * se, m + z * se])', ['z = 1.96 for 95%.']]] },
        },
        {
          write: {
            file: 'story.py', fn: 'group_intervals', also: [...MEANS, ['summary.py', 'variance'], ['summary.py', 'std']], prelude: 'import math',
            prompt: 'Write `group_intervals(keys, values, z=1.96)`: group the values by key; for each key in sorted order, `[key, n, mean, mean - z * se, mean + z * se]` with `se = std(g) / math.sqrt(n)`.',
            starter: 'def group_intervals(keys, values, z=1.96):\n    return []\n',
            cases: cases(Y.groupIntervals, [[['a', 'b', 'a', 'b', 'a'], [1, 2, 3, 5, 2], 2], [WD, RI]]),
            hint: '`groups.setdefault(k, []).append(v)`, then for `k in sorted(groups)` compute `m` and `se`.',
          },
        },
        {
          chart: {
            prompt: 'Draw the seven weekday means as dots with their 95% intervals as vertical lines. `data` holds `{ day, mean, low, high }` with `day` 0 (Monday) to 6. Each interval is a `line` from y(low) to y(high); each mean a `circle`.',
            data: BY_DAY.map(([day, , m, lo, hi]) => ({ day, mean: m, low: lo, high: hi })),
            starter: `const x = d3.scaleLinear().domain([-0.5, 6.5]).range([40, 460])
const y = d3.scaleLinear().domain([480, 760]).range([270, 20])
svg.selectAll('line.bar').data(data).join('line').attr('class', 'bar')
  .attr('x1', d => x(d.day)).attr('x2', d => x(d.day)).attr('y1', d => y(d.mean)).attr('y2', d => y(d.mean))
  .attr('stroke', 'firebrick').attr('stroke-width', 2)
svg.selectAll('circle').data(data).join('circle')
  .attr('cx', d => x(d.day)).attr('cy', d => y(d.mean)).attr('r', 4).attr('fill', 'steelblue')
svg.append('g').attr('transform', 'translate(40,0)').call(d3.axisLeft(y))
`,
            solution: `const x = d3.scaleLinear().domain([-0.5, 6.5]).range([40, 460])
const y = d3.scaleLinear().domain([480, 760]).range([270, 20])
svg.selectAll('line.bar').data(data).join('line').attr('class', 'bar')
  .attr('x1', d => x(d.day)).attr('x2', d => x(d.day)).attr('y1', d => y(d.low)).attr('y2', d => y(d.high))
  .attr('stroke', 'firebrick').attr('stroke-width', 2)
svg.selectAll('circle').data(data).join('circle')
  .attr('cx', d => x(d.day)).attr('cy', d => y(d.mean)).attr('r', 4).attr('fill', 'steelblue')
svg.append('g').attr('transform', 'translate(40,0)').call(d3.axisLeft(y))
`,
            checks: [{ select: 'line.bar', attrs: ['y1', 'y2'] }, { select: 'circle', attrs: ['cy'] }],
            verify: marks => { const y = v => G.linearScale(480, 760, 270, 20, v); return marks['line.bar'].length === 7 && BY_DAY.every(([, , m, lo, hi], k) => near(marks['line.bar'][k].y1, y(lo)) && near(marks['line.bar'][k].y2, y(hi)) && near(marks.circle[k].cy, y(m))) },
            hint: 'The lines go from `y(d.low)` to `y(d.high)`.',
            explain: 'Each line is your `group_intervals` for that weekday, checked against the Python. Saturday and Sunday sit clearly above; the weekdays’ intervals all overlap one another, so the data can’t rank Monday against Thursday.',
          },
        },
        {
          derive: {
            title: 'Overlapping, and still different',
            intro: `Saturday’s interval is ${f1(SAT[3])} to ${f1(SAT[4])}; Monday’s ${f1(MON[3])} to ${f1(MON[4])}. They overlap. Yet lesson 7.4 found the weekend’s extra riders very clear (p = 4 × 10⁻⁶).`,
            steps: [
              { prompt: 'Two means with standard errors a and b. The standard error of their difference (lesson 6.6: variances add), in terms of a and b?', answer: 'sqrt(a^2+b^2)', vars: { a: [1, 20], b: [1, 20] }, why: 'Var(X − Y) = Var X + Var Y for independent X and Y.' },
              { prompt: 'Two intervals just touch when the gap is 1.96(a + b). The difference is clear when the gap is above 1.96 √(a² + b²). For a = b = 1, how many times bigger is a + b than √(a² + b²) (to 3 decimals)?', number: Math.SQRT2, compute: () => 2 / Math.sqrt(2), tolerance: 0.0005, why: '√2 = 1.414: intervals can overlap by a good deal and the difference still be clear. Compare the difference with its own interval, not two bars by eye.' },
            ],
          },
        },
        {
          formula: {
            table: 'orders', solution: '=CONFIDENCE.T(0.05, STDEV.S(FILTER(days!D2:D366, WEEKDAY(days!A2:A366, 2)=6)), 52)', must: ['CONFIDENCE.T', 'FILTER'],
            prompt: 'In the spreadsheet, the half-width of Saturday’s interval: `CONFIDENCE.T(alpha, sd, n)` uses the t distribution (lesson 7.5) rather than 1.96.',
            hint: '`=CONFIDENCE.T(0.05, STDEV.S(FILTER(days!D2:D366, WEEKDAY(days!A2:A366, 2)=6)), 52)`',
            explain: `${f2(sheet('=CONFIDENCE.T(0.05, STDEV.S(FILTER(days!D2:D366, WEEKDAY(days!A2:A366, 2)=6)), 52)'))}, against 1.96 standard errors’ ${f2((SAT[4] - SAT[3]) / 2)}: with 52 days, t and z hardly differ.`,
          },
        },
        {
          choice: {
            prompt: 'A chart shows two means with error bars, and a caption that says only “error bars shown”. What should a reader ask first?',
            options: [
              { text: 'Whether the bars overlap.', why: 'Overlap means different things for each kind of bar, and doesn’t settle a difference for any of them.' },
              { text: 'What the bars are (sd, standard error, 95% interval) and how many observations each mean has.', why: 'Yes. The same data give bars of very different lengths, and only an interval says how uncertain the mean is. Every chart in a report should say which.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'fan-charts', number: '12.2', title: 'Fan charts',
      goal: 'Put a band round a forecast from its own past errors, check how often it held on later days, and say what the band can’t know.',
      builds: ['error-bars', 'riders-forecast'],
      blocks: [
        { h: 'A forecast is a range' },
        { md: `Lesson 9.10 told the shop a week's riders to within about ${Math.round(W.maeFrom(RI, HW7, 91))} a day. A chart of one forecast line hides that. A **fan chart** draws bands round the forecast. The Bank of England has drawn its inflation forecasts this way since 1996, the bands widening with the horizon. The simplest honest band uses the forecast's **own past errors**: if 80% of the misses from April to September were between ${f1(B80[0])} and +${f1(B80[1])}, draw that band round each later forecast.` },
        {
          code: { file: 'story.py', fn: 'error_band', notes: [['return [quantile(errors, (1 - level) / 2), quantile(errors, (1 + level) / 2)]', ['For 80%: the 10th and 90th percentiles of the misses (lesson 2.4’s rule). The band need not be symmetric: it follows the errors.']]] },
        },
        {
          code: { file: 'story.py', fn: 'coverage', notes: [['if f + lo <= y <= f + hi:', ['The band held on this day.']]] },
        },
        {
          write: {
            file: 'story.py', fn: 'coverage',
            prompt: 'Write `coverage(actuals, forecasts, band)`: the share of days where `forecast + band[0] <= actual <= forecast + band[1]`.',
            starter: 'def coverage(actuals, forecasts, band):\n    return 0.8\n',
            cases: cases(Y.coverage, [[[1, 2, 3], [1, 1, 1], [0, 1]], [[10, 20, 30, 40], [12, 18, 35, 40], [-3, 2]], [RI.slice(273), HW1.slice(273), B80]]),
            hint: 'Count the days inside, then divide by `len(actuals)`.',
          },
        },
        { figure: 'FanChart', caption: 'Holt–Winters for October to December, with bands from its April to September errors. Dots outside the band are black.' },
        {
          predict: {
            prompt: `The 80% band from April to September’s errors (Holt–Winters a day ahead), applied to October to December: on what share of those days did it hold (in %, to 1 decimal)?`,
            answer: 100 * C80, compute: () => 100 * C80, tolerance: 0.05,
            explain: `${pct(C80)}, a little under 80; the 95% band held on ${pct(C95)}. A week ahead, the 80% band held on ${pct(C80_7)}. The bands assume the future misses like the past, but the autumn misses were larger (sd ${f1(LATE_SD)} against ${f1(SD_ERR)}). Bands from past errors are honest about the past; say so, and widen them when conditions change. A band of ± 1.96 sd, which assumes normal errors, held on ${pct(NORMAL95)}: no better.`,
          },
        },
        {
          choice: {
            prompt: 'The shop asks for “the forecast” for the first Saturday of January. What should the report give?',
            options: [
              { text: 'One number: the forecast.', why: 'A single number is read as a promise. The staff need to know how far off it might be.' },
              { text: `The forecast and a band (“about ${Math.round(NEXT_WEEK[2])} riders on Saturday 3 January; 8 Saturdays in 10, between ${Math.round(NEXT_WEEK[2] + B80[0])} and ${Math.round(NEXT_WEEK[2] + B80[1])}”), with where the band comes from.`, why: 'Yes: a number, its range in plain words, and the source of the range. People make better plans with ranges, and stop trusting forecasts that are “wrong” only because they were read as exact.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'absolute-relative', number: '12.3', title: 'Absolute and relative',
      goal: 'Tell one change as an absolute difference, a relative change and a number needed, and know which framing misleads.',
      builds: ['fan-charts', 'ab-test'],
      blocks: [
        { h: 'Ten per cent of what?' },
        { md: `The A/B test of lesson 7.10: page A, ${pct(RISK[0], 2)} of visitors clicked; page B, ${pct(RISK[1], 2)}. Three true sentences:

- "B raises clicks by ${(100 * RISK[2]).toFixed(2)} percentage points" (the **absolute** difference);
- "B raises clicks by ${pct(RISK[3])}" (the **relative** change, as a share of A's rate);
- "B gets one more click for every ${Math.round(RISK[4])} visitors" (the **number needed**).

The second sounds biggest and is the one headlines choose. Medicine learned this the hard way: "halves your risk" can mean from 2 in 10,000 to 1 in 10,000.` },
        {
          code: { file: 'story.py', fn: 'risk_summary', notes: [['diff = b - a', ['The absolute difference: in the units of the rates.']], ['return [a, b, diff, diff / a, 1 / diff if diff else None]', ['The relative change divides by the starting rate; the number needed is 1 / difference (none if nothing changed).']]] },
        },
        {
          write: {
            file: 'story.py', fn: 'risk_summary',
            prompt: 'Write `risk_summary(hits_a, n_a, hits_b, n_b)`: the rates a and b, the difference b − a, the relative change (b − a)/a, and 1/(b − a), or `None` if the difference is 0.',
            starter: 'def risk_summary(hits_a, n_a, hits_b, n_b):\n    a, b = hits_a / n_a, hits_b / n_b\n    return [a, b, b / a, b / a, None]\n',
            cases: cases(Y.riskSummary, [[CA, NA, CB, NB], [5, 100, 5, 100], [2, 10000, 1, 10000]]),
            hint: '`diff = b - a`, then `[a, b, diff, diff / a, 1 / diff if diff else None]`.',
          },
        },
        {
          derive: {
            title: 'The number needed',
            steps: [
              { prompt: 'Out of N visitors, page B gets N(b − a) more clicks. For one more click, N (in terms of a and b)?', answer: '1/(b-a)', vars: { a: [0.1, 0.2], b: [0.25, 0.4] }, why: 'Doctors call it the **number needed to treat**: how many people must take a drug for one to benefit.' },
              { prompt: `For the trial (to the nearest visitor)?`, number: RISK[4], compute: () => 1 / (CB / NB - CA / NA), tolerance: 0.5, why: `${Math.round(RISK[4])} visitors per extra click. With the interval of lesson 7.10 (a lift of ${(100 * LIFT[0]).toFixed(2)} to ${(100 * LIFT[1]).toFixed(2)} points), anywhere from ${Math.round(1 / LIFT[1])} to ${Math.round(1 / LIFT[0])}.` },
            ],
          },
        },
        {
          choice: {
            prompt: 'Which sentence should the shop’s report use for the new page?',
            options: [
              { text: `“The new page increased clicks by ${pct(RISK[3], 0)}!”`, why: 'True, and the least informative: it hides the base rate and the uncertainty.' },
              { text: `“Clicks rose from ${pct(RISK[0])} to ${pct(RISK[1])} of visitors (+${(100 * RISK[2]).toFixed(1)} points, between ${(100 * LIFT[0]).toFixed(1)} and ${(100 * LIFT[1]).toFixed(1)} with 95% confidence; p = ${P_TRIAL.toFixed(4)}): about one extra click per ${Math.round(RISK[4])} visitors.”`, why: 'Yes: both rates, the absolute change with its interval, and the number needed. Give the relative change too if you like, but never alone.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'linked-views', number: '12.4', title: 'A dashboard with linked views',
      goal: 'Build the counts behind a dashboard whose views filter each other, and know why each view ignores its own filter.',
      builds: ['absolute-relative'],
      blocks: [
        { h: 'Click a bar, everything changes' },
        { md: `A **dashboard** puts several views of one table side by side. **Linked views** (or "crossfiltering") make them talk: click "web" in the channel chart and the town chart shows only web orders. The trick that makes it usable: each view shows the rows that pass every filter **except its own**. Otherwise, clicking "web" would make "shop" vanish from the channel chart, and you couldn't click back.` },
        {
          code: { file: 'story.py', fn: 'passes', notes: [['if column == skip:', ['The view’s own filter is skipped.']], ['if isinstance(rule, dict):', ['A number filter is a range, `{"low": …, "high": …}`; any other is a list of allowed values.']]] },
        },
        {
          code: { file: 'story.py', fn: 'linked_counts', notes: [['if passes(row, filters, skip=key):', ['Count a row if it passes the other views’ filters.']]] },
        },
        {
          write: {
            file: 'story.py', fn: 'linked_counts', also: [['story.py', 'passes']],
            prompt: 'Write `linked_counts(rows, filters, key)`: count each value of `row[key]` over the rows where `passes(row, filters, skip=key)`; return `[value, count]` pairs, values sorted.',
            starter: 'def linked_counts(rows, filters, key):\n    counts = {}\n    for row in rows:\n        if passes(row, filters):\n            counts[row[key]] = counts.get(row[key], 0) + 1\n    return [[k, counts[k]] for k in sorted(counts)]\n',
            cases: cases(Y.linkedCounts, [[DASH, WEB_CHEAP, 'channel'], [DASH, WEB_CHEAP, 'town'], [DASH, { town: ['York'] }, 'town']]),
            hint: 'The starter checks every filter, the view’s own included: pass `skip=key`.',
          },
        },
        { figure: 'Dashboard', caption: 'Click towns and channels, drag the price limit: every view filters the others, never itself.' },
        {
          predict: {
            prompt: 'Filters: channel = web, price up to £50. The channel view skips its own filter, so it counts orders up to £50 in each channel. How many shop orders does it show?',
            answer: LINKED_CHANNEL.find(([k]) => k === 'shop')[1], compute: () => Y.linkedCounts(DASH, WEB_CHEAP, 'channel').find(([k]) => k === 'shop')[1], tolerance: 0,
            explain: `${LINKED_CHANNEL.find(([k]) => k === 'shop')[1]} shop orders (and ${LINKED_CHANNEL.find(([k]) => k === 'web')[1]} web): what clicking “shop” would add. The town view meanwhile shows web orders up to £50 only: ${LINKED_TOWN.map(([t, n]) => `${t} ${n}`).join(', ')}.`,
          },
        },
        {
          sql: {
            prompt: 'A view of a dashboard is a query: the town view’s counts, with the other filters as a WHERE (channel web, price up to £50). In the raw table prices are pounds and towns need cleaning, so group by `LOWER(TRIM(town))` and keep prices that are known.',
            solution: "SELECT LOWER(TRIM(town)) AS t, COUNT(*) FROM orders WHERE channel = 'web' AND price <= 50 GROUP BY t ORDER BY t", must: ['WHERE', 'GROUP BY'],
            hint: "`SELECT LOWER(TRIM(town)) AS t, COUNT(*) FROM orders WHERE channel = 'web' AND price <= 50 GROUP BY t ORDER BY t`",
            explain: 'The raw table still holds the duplicates and the prices typed in pence, so the counts differ a little from the dashboard’s cleaned ones. A dashboard runs one such query per view, on every click; that is what databases with indexes (lesson 10.5) are for.',
          },
        },
      ],
    },

    {
      id: 'reproducible', number: '12.5', title: 'Reproducible work',
      goal: 'Make an analysis that someone else can rerun and get the same numbers: read-only raw data, code for every step, seeds, versions, and a fingerprint of the data.',
      builds: ['linked-views'],
      blocks: [
        { h: 'Could someone else get your numbers?' },
        { md: `A result nobody can reproduce is an anecdote. The rules this lab has followed all along, stated:

1. **Raw data is read-only.** Cleaning makes a new table (Part 3); the raw CSV is never edited by hand.
2. **Every step is code.** No numbers typed from one tool into another; each number in a report comes from a function that can be rerun.
3. **Randomness has a seed.** Every shuffle, sample and fold here takes one (lesson 6.1), so the same seed gives the same folds.
4. **Versions are written down.** This lab's Python in the page has pandas 2; the machine it was written on, pandas 3. The lessons use only what behaves the same in both, and the checks compare plain values.
5. **The data has a fingerprint.** A hash of the file (lesson 11.4's FNV-1a) says whether two people have the same data, byte for byte.` },
        {
          code: { file: 'story.py', fn: 'fingerprint', notes: [['return format(fnv1a(text), "08x")', ['8 hexadecimal digits, easy to compare by eye. (For security, where someone might forge a match, use SHA-256 instead; FNV is for spotting accidents.)']]] },
        },
        {
          predict: {
            prompt: `The orders file’s fingerprint is ${FP}. Change one letter (the first “Leeds” to “leeds”). How many of the 8 hex digits do you expect to stay the same?`,
            answer: [...FP].filter((ch, k) => ch === FP_SWAP[k]).length, compute: () => { const a = Y.fingerprint(ORDERS_CSV()), b = Y.fingerprint(ORDERS_CSV().replace('Leeds', 'leeds')); return [...a].filter((ch, k) => ch === b[k]).length }, tolerance: 1,
            explain: `The new fingerprint is ${FP_SWAP}: ${[...FP].filter((ch, k) => ch === FP_SWAP[k]).length} of 8 digits match, about what chance gives (1 in 16 each, so half a digit on average). One changed byte scrambles the whole hash. Two analyses with the same fingerprint used the same data; any difference in their numbers is in the code.`,
          },
        },
        {
          choice: {
            prompt: 'Two analysts report different average order values from “the same” data. What do you check first?',
            options: [
              { text: 'Who is the more experienced analyst.', why: 'Reproducibility replaces trust in people with checks anyone can run.' },
              { text: 'The data’s fingerprints; then each step of their code: duplicates removed or not, missing prices left out or filled, prices typed in pence fixed or not.', why: 'Yes. Part 3’s choices alone move the mean by pounds. With the same fingerprint, the difference is in the code, and code can be read.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'capstone', number: '12.6', title: 'Capstone: the shop’s year',
      goal: 'Take the shop’s year from the raw CSV to a recommendation, each number from a method of this lab, with its uncertainty.',
      builds: ['reproducible'],
      blocks: [
        { h: 'From raw CSV to a decision' },
        { md: `The shop's owner asks four questions: *How did the year go? What drives the cycle path's riders, our customers? Should we switch to the new home page? How many staff for the first week of January?* Every answer below comes from a lesson's method, on the data this lab has used since lesson 1.1. The point is the chain: a reader can follow each number back to the code that made it.` },
        { h: '1. How did the year go?' },
        {
          predict: {
            prompt: `Cleaned (Part 3: duplicates removed, towns fixed, the prices typed in pence corrected), ${KNOWN.length} orders have a price. Their revenue, price × quantity (to the nearest pound)?`,
            answer: REVENUE, compute: () => S.total(C.cleanOrders(T.readCsv(ORDERS_CSV()), PRICES).filter(r => r.price !== null).map(r => r.price * r.quantity)) / 100, tolerance: 0.5,
            explain: `${money(REVENUE)}, from orders with a known price. ${MISSING} orders have none: at the average order (${money(PER_ORDER)}) that is about ${money(MISSING * PER_ORDER)} more, so “between ${money(REVENUE)} and about ${money(REV_FILLED)}” is the honest sentence (lesson 3.3: filling hides that it was a guess).`,
          },
        },
        { h: '2. What drives the riders?' },
        { md: `Lesson 8.3's model, fitted to the year: **${f1(WR[0])} + ${f2(WR[1])} per °C − ${f2(-WR[2])} per mm of rain + ${f1(WR[3])} at weekends**, R² ${f2(F.rSquared(RI, F.predict(XR, WR)))}. The truth the generator used was 300, 22, −12 and 90: the method recovered it. What it means for the shop: weather drives custom far more than anything the shop controls; a warm Saturday brings about ${Math.round(WR[1] * 10 + WR[3])} more riders than a weekday 10 °C colder.` },
        { h: '3. The new home page?' },
        { md: `Lesson 7.10's test and lesson 12.3's sentence: clicks rose from ${pct(RISK[0])} to ${pct(RISK[1])} (+${(100 * RISK[2]).toFixed(1)} points, 95% interval ${(100 * LIFT[0]).toFixed(1)} to ${(100 * LIFT[1]).toFixed(1)}; p = ${P_TRIAL.toFixed(4)}), one extra click per ${Math.round(RISK[4])} visitors, from a properly randomised test that was not stopped early (lesson 7.9).` },
        { h: '4. Staff for the first week of January' },
        { md: `Holt–Winters on the whole year (lesson 9.8), seven days ahead: **${NEXT_WEEK.map(v => Math.round(v)).join(', ')}** riders, Thursday 1 to Wednesday 7 January, ${Math.round(WEEK_TOTAL).toLocaleString('en-GB')} for the week. Each day ± about ${Math.round((B80[1] - B80[0]) / 2)} riders for 8 days in 10 (lesson 12.2), and winter misses have run larger than summer's.` },
        {
          choice: {
            prompt: 'Which summary should go to the owner?',
            options: [
              { text: '“Revenue was strong, the model is 93.5% accurate, the new page is 10% better, and we forecast 3,000 riders next week.”', why: 'Every number is stripped of its unit, its uncertainty or its meaning: R² called accuracy, a relative change with no base rate, a forecast with no range.' },
              { text: `“Revenue: ${money(REVENUE)} from priced orders (${MISSING} more had no price). Riders follow the weather: about ${Math.round(WR[1])} per °C and ${Math.round(WR[3])} more at weekends. Switch to the new page: +${(100 * RISK[2]).toFixed(1)} points of clicks (${(100 * LIFT[0]).toFixed(1)} to ${(100 * LIFT[1]).toFixed(1)}). First week of January: about ${Math.round(WEEK_TOTAL / 100) * 100} riders, ± ${Math.round((B80[1] - B80[0]) / 2)} a day; staff for the weekend of the 3rd and 4th.” Each number links to its notebook.`, why: 'Yes: units, uncertainty, the decision each number supports, and a way back to the code. That is the whole lab in one paragraph.' },
            ],
            answer: 1,
          },
        },
        {
          md: `This is the end of Data Science Studio. Twelve parts took one shop's data from a CSV read character by character to a recommendation with its uncertainty: tables, summaries, cleaning, charts, patterns, samples, tests, models, time, databases, machine-learning data and the story. The methods are the field's; the habit underneath them is the lab's real subject: **know where every number came from, how sure it is, and what it can't tell you.** Project Studio goes deeper into the code; the other labs (Math for ML, NLP Studio, Frontier) go further into the models.`,
        },
      ],
    },
  ],
}
