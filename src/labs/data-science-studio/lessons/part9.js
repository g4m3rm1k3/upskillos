// Part 9: time and forecasting. The days table is a time series with a known truth: riders follow
// the temperature (so the seasons) and gain 90 at weekends; visits follow the temperature, with the
// news day in them; orders per day follow nothing. Resampling, moving averages, trend and season,
// autocorrelation, the forecasts to beat and how to score them, smoothing, Holt, Holt–Winters, and
// walk-forward validation (python/forecasting.py, engine/forecasting.js).
import * as T from '../engine/tables.js'
import * as C from '../engine/cleaning.js'
import * as S from '../engine/summary.js'
import * as G from '../engine/charts.js'
import * as P from '../engine/patterns.js'
import * as M from '../engine/samples.js'
import * as F from '../engine/models.js'
import * as W from '../engine/forecasting.js'
import { ORDERS_CSV, CATALOGUE_CSV, DAYS_CSV, Rng, makeDays, dateOf } from '../engine/data.js'
import { evaluateFormula } from '../engine/sheet.js'
import { WITH_MONTHS } from './given.js'

const cases = (fn, inputs) => inputs.map(args => ({ args, expected: fn(...args) }))
const sheet = formula => evaluateFormula('orders', formula).value
const MEANS = [['summary.py', 'total'], ['summary.py', 'mean']]
const near = (a, b, tol = 1e-6) => Math.abs(a - b) < tol
const f1 = x => x.toFixed(1), f2 = x => x.toFixed(2), f3 = x => x.toFixed(3)
const n0 = x => Math.round(x).toLocaleString('en-GB')

const DAYS = P.numberDays(T.readCsv(DAYS_CSV()))
const DATES = DAYS.map(r => r.date), RI = DAYS.map(r => r.riders), H = DAYS.map(r => r.high_c), R = DAYS.map(r => r.rain_mm), V = DAYS.map(r => r.visits)
const TRUTH = {}; makeDays(5, TRUTH)
const QUIET = DAYS.map(r => TRUTH[r.date] ?? r.visits)
const PRICES = Object.fromEntries(T.readCsv(CATALOGUE_CSV()).map(r => [r.item, T.toPence(r.list_price)]))
const OD = M.ordersPerDay(C.cleanOrders(T.readCsv(ORDERS_CSV()), PRICES).map(r => r.date))
function shuffled(values, seed) {
  const out = [...values], rng = new Rng(seed)
  for (let i = out.length - 1; i > 0; i--) { const j = rng.below(i + 1);[out[i], out[j]] = [out[j], out[i]] }
  return out
}
const lag1 = ys => P.correlation(ys.slice(0, -1), ys.slice(1))
const SMALL = [3, 5, 4, 8, 6, 9, 7, 12, 10, 11]
// 9.1
const MONTHS = W.resample(DATES, RI, 'month'), PER_DAY = MONTHS.map(([k, s, n]) => [k, s / n])
const JULY = PER_DAY[6][1], FEB = PER_DAY[1][1], LAG1 = lag1(RI), LAG1_SHUF = lag1(shuffled(RI, 1))
const WEEKS = W.resample(DATES, RI, 'week')
// 9.2
const ops = k => [(365 - k + 1) * k, k + 2 * (365 - k)]
const MA7 = W.movingAverage(RI, 7)
// 9.3
const [TREND, SEASON, REST] = W.decompose(RI, 7), PROFILE = W.weekdayProfile(DATES, RI), MEAN_RI = S.mean(RI)
// Day 0 is a Wednesday, so position 3 is Saturday and 4 is Sunday.
const SAT = SEASON[3], SUN = SEASON[4], WEEKDAYS = [0, 1, 2, 5, 6].map(i => SEASON[i])
// 9.4
const ACF = W.acf(RI, 14), BAND = 1.96 / Math.sqrt(365)
const ACF_V = W.autocorrelation(V, 1), ACF_Q = W.autocorrelation(QUIET, 1), ACF_H = W.autocorrelation(H, 1), ACF_R = W.autocorrelation(R, 1)
const ACF_OD = W.acf(OD, 14), OD_OUT = ACF_OD.filter(v => Math.abs(v) > BAND).length
// 9.5
const score = (ys, fs, from = 7) => { const p = W.scored(ys.slice(from), fs.slice(from)); return { mae: W.mae(p), rmse: W.rmseOf(p), mape: W.mape(p) } }
const NAIVE = score(RI, W.naiveForecasts(RI)), SNAIVE = score(RI, W.seasonalNaive(RI, 7)), MEANF = score(RI, W.meanForecasts(RI))
const V_ALL = score(V, W.naiveForecasts(V)), V_PAIRS = W.scored(V.slice(7), W.naiveForecasts(V).slice(7)).filter(([y, f]) => y !== 9412 && f !== 9412)
const V_QUIET = { mae: W.mae(V_PAIRS), rmse: W.rmseOf(V_PAIRS) }
const OD_ZERO = OD.filter(v => v === 0).length, OD_MEAN = S.mean(OD), OD_MEDIAN = S.median(OD)
const OD_MEANF = (() => { const p = W.scored(OD.slice(91), W.meanForecasts(OD).slice(91)); return { mae: W.mae(p), rmse: W.rmseOf(p) } })()
const OD_ONE = (() => { const p = OD.slice(91).map(y => [y, 1]); return { mae: W.mae(p), rmse: W.rmseOf(p) } })()
// 9.6
const ALPHAS = Array.from({ length: 19 }, (_, k) => (k + 1) / 20)
const BEST = W.bestAlpha(RI, ALPHAS), BEST_EARLY = W.bestAlpha(RI.slice(0, 91), ALPHAS), SES = score(RI, W.exponentialSmoothing(RI, BEST[0]))
const NEXT_LEVEL = W.exponentialSmoothing([...RI, 0], 0.1)[365]
// 9.7
const FULL_WEEKS = WEEKS.filter(w => w[2] === 7), WK = FULL_WEEKS.map(w => w[1]), CUT = 26, AHEAD = W.holtAhead(WK.slice(0, CUT), 0.5, 0.3, 8)
const HOLT_DAILY = score(RI, W.holt(RI, 0.3, 0.1)), WEEK27 = WEEKS.find(w => w[0] === 27)
// WK[k] is week_of k + 1, which starts on day 7(k + 1) - 2.
const PEAK_WEEK = WK.indexOf(Math.max(...WK)), PEAK_MONDAY = dateOf(7 * (PEAK_WEEK + 1) - 2)
// 9.8
const GRID = { alpha: [0.05, 0.1, 0.2, 0.3, 0.5], beta: [0, 0.01, 0.05], gamma: [0.05, 0.1, 0.2, 0.3] }
const TUNED = W.tuneHoltWinters(RI, 91, 7, GRID)
const hwFrom = (h, from = 91) => W.maeFrom(RI, W.holtWinters(RI, TUNED.alpha, TUNED.beta, TUNED.gamma, 7, h), from)
const HW1 = hwFrom(1), HW7 = hwFrom(7)
const LATE = { snaive: W.maeFrom(RI, W.seasonalNaive(RI, 7), 91), naive: W.maeFrom(RI, W.naiveForecasts(RI), 91), mean: W.maeFrom(RI, W.meanForecasts(RI), 91), ses: W.maeFrom(RI, W.exponentialSmoothing(RI, BEST_EARLY[0]), 91) }
// 9.9: a centred average "forecast" (it reads three days ahead), and the weather model refitted day by day.
const CENTRED = W.maeFrom(RI, W.centredAverage(RI, 7), 91), TRAILING = W.maeFrom(RI, [...Array(7).fill(null), ...MA7.slice(0, -1)], 91)
const WKEND = DATES.map(d => (F.weekday(d) >= 5 ? 1 : 0)), XW = DAYS.map((_, i) => [1, H[i], R[i], WKEND[i]])
const WF = (() => {
  const own = [], yesterday = []
  for (const [end, target] of W.walkForward(365, 91, 1)) {
    const w = F.fit(XW.slice(0, end), RI.slice(0, end))
    own.push([RI[target], F.predict([XW[target]], w)[0]])
    yesterday.push([RI[target], F.predict([[1, H[target - 1], R[target - 1], WKEND[target]]], w)[0]])
  }
  return { own: W.mae(own), yesterday: W.mae(yesterday) }
})()
// 9.10: a week ahead, and the orders.
const HW7_FCST = W.holtWinters(RI, TUNED.alpha, TUNED.beta, TUNED.gamma, 7, 7)
const LAST_WEEK = W.holtWintersAhead(RI, TUNED.alpha, TUNED.beta, TUNED.gamma, 7, 7)
const GAIN = 1 - HW7 / LATE.snaive
const OD_LATE = { mean: OD_MEANF.mae, ses: W.maeFrom(OD, W.exponentialSmoothing(OD, 0.1), 91), snaive: W.maeFrom(OD, W.seasonalNaive(OD, 7), 91), hw: W.maeFrom(OD, W.holtWinters(OD, 0.1, 0.01, 0.2, 7), 91) }

export const PART9 = {
  id: 'part9', title: 'Part 9 · Time and forecasting', lessons: [
    {
      id: 'time-order', number: '9.1', title: 'Time order is information',
      goal: 'Turn dates into numbers and weeks, add a daily series up by week and by month, and see that the order of the days is information that shuffling destroys.',
      builds: ['cross-validation'],
      blocks: [
        { h: 'The same numbers, in order' },
        { md: `Every table so far could be shuffled without losing anything: the mean of the prices, a correlation, a fitted line are the same in any row order. A **time series** is different. The riders on 365 days are a list where *position matters*: today's count says something about tomorrow's, and the year has a shape. Shuffle the days and the shape is gone, even though every number is still there.` },
        { figure: 'TimeShuffle', caption: 'The riders by day, and each day plotted against the next. Shuffle them: the mean is unchanged, and yesterday stops predicting today.' },
        {
          predict: {
            prompt: 'Today’s riders against tomorrow’s: in time order the correlation is about 0.69. After shuffling the days, about what (to 1 decimal)?',
            answer: LAG1_SHUF, compute: () => lag1(shuffled(RI, 1)), tolerance: 0.15,
            explain: `${f3(LAG1_SHUF)} after this shuffle, against ${f3(LAG1)} in time order. In order, a warm spell is a run of busy days; shuffled, the day after a busy day is any day of the year. **The order was information.** That is the first rule of time series: never shuffle time, not when exploring and especially not when testing a forecast (lesson 9.9).`,
          },
        },
        { h: 'Dates as numbers' },
        { md: `Lesson 6.3's \`day_of_year\` turned a date into its day number, 0 to 364, and lesson 8.2's \`weekday\` into 0 (Monday) to 6 (Sunday). A third number groups days into **weeks**. Weeks start on Monday here, as in most of Europe and in ISO 8601. 1 January 2025 was a Wednesday, so the year's first week is short: Wednesday to Sunday.` },
        {
          derive: {
            title: 'The week of a day',
            intro: 'Shift the day number so that the Monday before 1 January would be day 0, then count whole weeks.',
            steps: [
              { prompt: '1 January is a Wednesday, day 0. The Monday before it would be day −2. Adding 2 makes that Monday 0. Monday 6 January is day 5 of the year: shifted, it is?', number: 7, compute: () => M.dayOfYear('2025-01-06') + 2, why: 'Day 5 + 2 = 7: a whole week after the shifted start.' },
              { prompt: 'Whole weeks: (day + 2) // 7, Python’s division rounded down. The week of Monday 6 January?', number: 1, compute: () => W.weekOf('2025-01-06'), why: 'Week 1. 1 to 5 January give (0 + 2) // 7 = 0 to (4 + 2) // 7 = 0: week 0, five days long.' },
              { prompt: 'And 31 December, day 364?', number: W.weekOf('2025-12-31'), compute: () => W.weekOf('2025-12-31'), why: `(364 + 2) // 7 = 52, a Wednesday: week 52 has three days. 53 weeks touch 2025, ${FULL_WEEKS.length} of them whole.` },
            ],
          },
        },
        {
          code: { file: 'forecasting.py', fn: 'week_of', notes: [['return (day_of_year(date) + 2) // 7', ['`//` divides and rounds down: the number of whole weeks since the shifted start.']]] },
        },
        {
          write: {
            file: 'forecasting.py', fn: 'week_of', also: [['samples.py', 'day_of_year']], prelude: WITH_MONTHS,
            prompt: 'Write `week_of(date)`: weeks start on Monday, and 1 January 2025 (day 0) was a Wednesday, in week 0.',
            starter: 'def week_of(date):\n    return day_of_year(date) // 7\n',
            cases: cases(W.weekOf, [['2025-01-01'], ['2025-01-05'], ['2025-01-06'], ['2025-07-14'], ['2025-12-31']]),
            hint: '`(day_of_year(date) + 2) // 7`',
          },
        },
        { h: 'Resampling: days into weeks and months' },
        { md: `**Resampling** changes the time step: 365 daily counts become 53 weekly totals or 12 monthly ones. It is a group-by (lesson 2.8) whose key comes from the date, with one shortcut: the rows are already in time order, so each group is a run of neighbouring rows, and the code only has to notice when the key changes.` },
        {
          code: { file: 'forecasting.py', fn: 'resample', notes: [['key = date[:7] if by == "month" else week_of(date)', ['"2025-07-14"[:7] is "2025-07": the month is the front of the date.']], ['if out and out[-1][0] == key:', ['Same period as the last row: add to it. A new key starts a new period. This needs the dates in order.']], ['out[-1][2] += 1', ['Count the days too: a total over 31 days and one over 28 can only be compared per day.']]] },
        },
        {
          write: {
            file: 'forecasting.py', fn: 'resample', also: [['forecasting.py', 'week_of'], ['samples.py', 'day_of_year']], prelude: WITH_MONTHS,
            prompt: 'Write `resample(dates, values, by)`: for `by == "month"` the key is `date[:7]`, otherwise `week_of(date)`. Return `[key, total, days]` for each period, in time order.',
            starter: 'def resample(dates, values, by):\n    out = []\n    return out\n',
            cases: cases(W.resample, [[DATES.slice(0, 15), RI.slice(0, 15), 'week'], [DATES.slice(25, 65), RI.slice(25, 65), 'month'], [DATES, RI, 'month']]),
            hint: 'Loop over `zip(dates, values)`. If `out` is not empty and `out[-1][0] == key`, add `v` to `out[-1][1]` and 1 to `out[-1][2]`; otherwise `out.append([key, v, 1])`.',
          },
        },
        {
          formula: {
            table: 'orders', solution: '=SUMIFS(days!D2:D366, days!A2:A366, ">="&DATE(2025,7,1), days!A2:A366, "<="&EOMONTH(DATE(2025,7,1), 0))', must: ['SUMIFS', 'EOMONTH'],
            prompt: 'In the spreadsheet, a month is a range of dates: July’s riders are the riders with a date from `DATE(2025,7,1)` to `EOMONTH(DATE(2025,7,1), 0)`, the month’s last day. Add them with `SUMIFS`.',
            hint: '`=SUMIFS(days!D2:D366, days!A2:A366, ">="&DATE(2025,7,1), days!A2:A366, "<="&EOMONTH(DATE(2025,7,1), 0))`',
            explain: `${sheet('=SUMIFS(days!D2:D366, days!A2:A366, ">="&DATE(2025,7,1), days!A2:A366, "<="&EOMONTH(DATE(2025,7,1), 0))')}: your \`resample\`’s July, ${MONTHS[6][1]}, or ${f1(JULY)} a day against February’s ${f1(FEB)}. The year’s shape, in two numbers.`,
          },
        },
        {
          formula: {
            table: 'orders', solution: '=SUMPRODUCT((WEEKNUM(days!A2:A366, 2)=2)*days!D2:D366)', must: ['WEEKNUM', 'SUMPRODUCT'],
            prompt: 'Weeks: `WEEKNUM(date, 2)` numbers the weeks with Monday as their first day, like `week_of`, but it counts from 1. Total the riders of the week of Monday 6 January.',
            hint: 'That week is WEEKNUM 2: `=SUMPRODUCT((WEEKNUM(days!A2:A366, 2)=2)*days!D2:D366)`',
            explain: `${sheet('=SUMPRODUCT((WEEKNUM(days!A2:A366, 2)=2)*days!D2:D366)')}: your week 1, ${WEEKS[1][1]}. Excel and \`week_of\` agree on where weeks start and differ by one in what they call them. Check that kind of convention every time two tools meet; ISO 8601 has a third (\`ISOWEEKNUM\`), where the week holding 1 January 2025 is week 1 of 2025 only because it has four or more days in the year.`,
          },
        },
        {
          choice: {
            prompt: `January had ${MONTHS[0][1].toLocaleString('en-GB')} riders and February ${MONTHS[1][1].toLocaleString('en-GB')}. Was February quieter per day?`,
            options: [
              { text: `Yes: ${MONTHS[1][1].toLocaleString('en-GB')} is fewer.`, why: 'February has 28 days and January 31: totals over different lengths are not comparable.' },
              { text: `Per day, ${f1(PER_DAY[0][1])} in January against ${f1(PER_DAY[1][1])} in February: slightly quieter, but most of the gap in the totals is the three missing days.`, why: 'Yes. Divide by the days counted, which is why `resample` returns them.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'moving-average', number: '9.2', title: 'Moving averages',
      goal: 'Smooth a daily series with a trailing moving average, compute it with a running sum in two steps a day instead of k, and draw it.',
      builds: ['time-order'],
      blocks: [
        { h: 'Average the last k days' },
        { md: `A day's riders are noisy: weather, the weekend, chance. The average of the **last k days** is steadier, and it moves with the season. Slide the window one day on and average again: a **moving average**. A 7-day window has a second virtue: it always holds exactly one of each weekday, so the weekend's bump is averaged away (lesson 9.3 makes this exact).` },
        { figure: 'WindowSlide', caption: 'The window and the average it gives. A wider window is smoother and later to follow a change; k = 1 is the data itself.' },
        {
          code: { file: 'forecasting.py', fn: 'moving_average_slow', notes: [['for i in range(end - k + 1, end + 1):', ['The window ending on day `end`: k days, all added again for every window.']]] },
        },
        {
          write: {
            file: 'forecasting.py', fn: 'moving_average_slow',
            prompt: 'Write `moving_average_slow(ys, k)`: for each `end` from `k - 1` to the last day, add up `ys[end - k + 1]` to `ys[end]` and divide by k.',
            starter: 'def moving_average_slow(ys, k):\n    return []\n',
            cases: cases(W.movingAverageSlow, [[[1, 2, 3, 4, 5], 2], [SMALL, 3], [RI.slice(0, 30), 7]]),
            hint: 'Two loops: `for end in range(k - 1, len(ys))`, then `s = 0` and `for i in range(end - k + 1, end + 1): s += ys[i]`; append `s / k`.',
          },
        },
        { h: 'The running sum' },
        { md: `Two neighbouring windows share all but two days. Rather than add k numbers again, keep the **sum** of the window and change it by what came in and what dropped out.` },
        {
          derive: {
            title: 'One day in, one day out',
            steps: [
              { prompt: 'The window ending on day t has sum s. The next one ends on day t + 1: it gains n (the value of day t + 1) and loses o (day t + 1 − k). Its sum, in terms of s, n and o?', answer: 's+n-o', vars: { s: [0, 100], n: [0, 10], o: [0, 10] }, why: 'Everything else is in both windows.' },
              { prompt: 'Additions for all the windows of 365 days, the slow way, with k = 28: (365 − k + 1) windows of k additions each?', number: ops(28)[0], compute: () => (365 - 28 + 1) * 28, why: `${ops(28)[0].toLocaleString('en-GB')}.` },
              { prompt: 'The running sum: k additions for the first window, then 2 for each of the other 365 − k. For k = 28?', number: ops(28)[1], compute: () => 28 + 2 * (365 - 28), why: `${ops(28)[1]}: thirteen times fewer, and the gap grows with k. The slow way costs about n·k steps, the running sum about 2n, whatever the window.` },
            ],
          },
        },
        {
          code: { file: 'forecasting.py', fn: 'moving_average', notes: [['s += ys[end] - ys[end - k]', ['In with the new day, out with the day k back: two steps.']], ['out.append(s / k)', ['The same averages as the slow way, in the same order.']]] },
        },
        {
          write: {
            file: 'forecasting.py', fn: 'moving_average',
            prompt: 'Write `moving_average(ys, k)` with a running sum: add the first k values, then for each `end` from k on, `s += ys[end] - ys[end - k]`. Append `s / k` each time, the first window included.',
            starter: 'def moving_average(ys, k):\n    s = 0\n    for i in range(k):\n        s += ys[i]\n    out = [s / k]\n    # move the window along\n    return out\n',
            cases: cases(W.movingAverage, [[[1, 2, 3, 4, 5], 2], [SMALL, 3], [RI, 7]]),
            hint: '`s = 0`, `for i in range(k): s += ys[i]`, `out = [s / k]`, then `for end in range(k, len(ys)): s += ys[end] - ys[end - k]; out.append(s / k)`.',
          },
        },
        { python: { program: 'moving_average', label: 'Step through moving_average in real Python' } },
        {
          note: 'With floats, a running sum can drift: each add-and-subtract rounds, and the errors pile up over a long series (lesson 1.3). Riders are whole numbers, so here it is exact. For long float series, recompute the sum from scratch now and then, or use the compensated sum of lesson 2.5.',
        },
        {
          formula: {
            table: 'orders', solution: '=AVERAGE(OFFSET(days!D2, 113, 0, 7, 1))', must: ['OFFSET', 'AVERAGE'],
            prompt: 'In a spreadsheet, `OFFSET(start, rows, columns, height, width)` makes a range from a starting cell: the window ending on day 119 starts 113 rows below `days!D2` and is 7 high. Average it.',
            hint: '`=AVERAGE(OFFSET(days!D2, 113, 0, 7, 1))`',
            explain: `${f3(sheet('=AVERAGE(OFFSET(days!D2, 113, 0, 7, 1))'))}: your \`moving_average(riders, 7)\` for that window, ${f3(MA7[113])} (the list starts at the window ending on day 6). Copied down a column, \`OFFSET\` moves with the row: the spreadsheet's slow way.`,
          },
        },
        {
          formula: {
            table: 'orders', solution: '=LET(c, SCAN(0, days!D2:D366, LAMBDA(s, y, s + y)), (INDEX(c, 120) - INDEX(c, 113)) / 7)', must: ['SCAN', 'LET'],
            prompt: 'The running sum in one formula. `SCAN(0, range, LAMBDA(s, y, s + y))` is the running total: entry t is the sum of days 0 to t. The window of days 113 to 119 is the total to day 119 minus the total to day 112. (SCAN was added to the Spreadsheet Lab for this part.)',
            hint: 'Entry 120 of the SCAN is the total to day 119, entry 113 to day 112: `=LET(c, SCAN(0, days!D2:D366, LAMBDA(s, y, s + y)), (INDEX(c, 120) - INDEX(c, 113)) / 7)`',
            explain: `${f3(sheet('=LET(c, SCAN(0, days!D2:D366, LAMBDA(s, y, s + y)), (INDEX(c, 120) - INDEX(c, 113)) / 7)'))} again. A window's sum is a difference of two running totals, so every window costs one subtraction: the same idea as the running sum, and how databases compute moving averages over millions of rows.`,
          },
        },
        {
          chart: {
            prompt: 'Draw the riders as dots and the 7-day moving average as one line. `data` has `day`, `riders` and `ma7` (null for the first six days, where no window fits yet). Use `d3.line()` with `.defined(d => d.ma7 !== null)` so the line starts where the average does.',
            data: RI.map((riders, day) => ({ day, riders, ma7: day >= 6 ? MA7[day - 6] : null })),
            starter: `const x = d3.scaleLinear().domain([0, 364]).range([40, 460])
const y = d3.scaleLinear().domain([0, 1200]).range([270, 20])
svg.selectAll('circle').data(data).join('circle')
  .attr('cx', d => x(d.day)).attr('cy', d => y(d.riders)).attr('r', 1.5).attr('fill', 'steelblue').attr('fill-opacity', 0.4)
svg.append('path').attr('class', 'ma').attr('fill', 'none').attr('stroke', 'firebrick').attr('stroke-width', 2)
  .attr('d', d3.line().x(d => x(d.day)).y(d => y(d.riders))(data))
`,
            solution: `const x = d3.scaleLinear().domain([0, 364]).range([40, 460])
const y = d3.scaleLinear().domain([0, 1200]).range([270, 20])
svg.selectAll('circle').data(data).join('circle')
  .attr('cx', d => x(d.day)).attr('cy', d => y(d.riders)).attr('r', 1.5).attr('fill', 'steelblue').attr('fill-opacity', 0.4)
svg.append('path').attr('class', 'ma').attr('fill', 'none').attr('stroke', 'firebrick').attr('stroke-width', 2)
  .attr('d', d3.line().defined(d => d.ma7 !== null).x(d => x(d.day)).y(d => y(d.ma7))(data))
`,
            checks: [{ select: 'path.ma', attrs: ['d'] }],
            verify: marks => { const d = marks['path.ma'][0].d; return d.length === 2 * MA7.length && MA7.every((m, k) => Math.abs(d[2 * k] - G.linearScale(0, 364, 40, 460, k + 6)) <= 5e-4 && Math.abs(d[2 * k + 1] - G.linearScale(0, 1200, 270, 20, m)) <= 5e-4) },
            hint: '`d3.line().defined(d => d.ma7 !== null).x(d => x(d.day)).y(d => y(d.ma7))(data)`',
            explain: 'The line is your `moving_average(riders, 7)`, each value drawn at the last day of its window: the tests check every point against the Python. A trailing average lags: it is a summary of the past week, so at a turn in the season it is about three days behind.',
          },
        },
      ],
    },

    {
      id: 'trend-season', number: '9.3', title: 'Trend and season',
      goal: 'Split a series into a trend, a repeating season and the rest; derive why a full-period average removes the season; and recover the weekend effect the generator put in.',
      builds: ['moving-average'],
      blocks: [
        { h: 'Three parts' },
        { md: `The riders move on two clocks. Slowly, with the seasons: the **trend**, here the year's warm and cold. And weekly: the **season** in the technical sense, any pattern that repeats with a fixed **period** (7 days here; 12 months for monthly sales; 24 hours for electricity). What is left is the **rest** (the residual, or the "irregular" part):

$$y_t = \\text{trend}_t + \\text{season}_t + \\text{rest}_t$$

This is **classical additive decomposition**, from the 1920s, still the first look at any series. The generator's rule is exactly this shape: 300 + 22 × temperature (the trend, through the seasons) + 90 at weekends (the season) + rain and noise (the rest).` },
        {
          derive: {
            title: 'A full period cancels the season',
            intro: 'Let the season repeat every 7 days, with indices $s_0, \\ldots, s_6$ that add up to 0 (any constant part belongs to the trend).',
            steps: [
              { prompt: 'Any 7 days in a row contain each weekday once. The sum of the season over them?', number: 0, compute: () => 0, why: 'Each index appears once, and they add to 0.' },
              { prompt: 'So the average of trend + season over 7 days centred on day t is the average of the trend alone. If the trend is a straight line a + bt, its average over days t − 3 to t + 3 is (in terms of a, b, t)?', answer: 'a+b*t', vars: { a: [0, 10], b: [-2, 2], t: [0, 10] }, why: 'The line’s values are symmetric about the middle day. So a **centred 7-day average** recovers a straight trend exactly and removes the weekly season exactly; a curved trend is bent a little.' },
              { prompt: 'The generator adds 90 on the 2 weekend days and 0 on the other 5. Their mean is 90 × 2/7; an index is the gap from that. The weekend index (to 2 decimals)?', number: 90 * 5 / 7, compute: () => 90 - (90 * 2) / 7, tolerance: 0.005, why: '90 − 25.71 = 64.29.' },
              { prompt: 'And a weekday’s index (to 2 decimals)?', number: -90 * 2 / 7, compute: () => (-90 * 2) / 7, tolerance: 0.005, why: '0 − 25.71: five weekdays at −25.71 and two weekend days at +64.29 add to 0.' },
            ],
          },
        },
        {
          code: { file: 'forecasting.py', fn: 'centred_average', notes: [['h = (k - 1) // 2', ['k must be odd, so the window has a middle day: 3 before, the day, 3 after.']], ['out[t + h] = m', ['`moving_average`’s first window ends on day k − 1; its middle is day h.']]] },
        },
        {
          write: {
            file: 'forecasting.py', fn: 'centred_average', also: [['forecasting.py', 'moving_average']],
            prompt: 'Write `centred_average(ys, k)` for odd k: a list as long as `ys`, `None` where the window does not fit, and otherwise the average of the k days centred on each day. Use `moving_average`: its value number t belongs to day t + (k − 1) // 2.',
            starter: 'def centred_average(ys, k):\n    return moving_average(ys, k)\n',
            cases: cases(W.centredAverage, [[[1, 2, 3, 4, 5], 3], [SMALL, 5], [RI.slice(0, 40), 7]]),
            hint: '`h = (k - 1) // 2`, `out = [None] * len(ys)`, then `for t, m in enumerate(moving_average(ys, k)): out[t + h] = m`.',
          },
        },
        {
          code: { file: 'forecasting.py', fn: 'seasonal_indices', notes: [['gaps[t % period].append(y - m)', ['Day t sits at position t % period of the cycle: 0, 7, 14, … are all Wednesdays here.']], ['shift = mean(raw)', ['The raw averages need not add to 0 (the trend is curved, the noise is noise); shifting them makes the season carry no level of its own.']]] },
        },
        {
          write: {
            file: 'forecasting.py', fn: 'seasonal_indices', also: MEANS,
            prompt: 'Write `seasonal_indices(ys, trend, period)`: for each day with a trend value, put `y - trend` into the list for position `t % period`; average each list, then subtract the mean of those averages from each.',
            starter: 'def seasonal_indices(ys, trend, period):\n    return [0.0] * period\n',
            cases: cases(W.seasonalIndices, [[[1, 5, 1, 5, 1, 5], [3, 3, 3, 3, 3, 3], 2], [[2, 4, 9, 3, 5, 10], [null, 5, 5, 5, 6, null], 3], [RI, TREND, 7]]),
            hint: '`gaps = [[] for _ in range(period)]`; for each `t, (y, m)` in `enumerate(zip(ys, trend))` with `m is not None`, `gaps[t % period].append(y - m)`. Then `raw = [mean(g) for g in gaps]` and return `[r - mean(raw) for r in raw]`.',
          },
        },
        {
          code: { file: 'forecasting.py', fn: 'decompose', notes: [['rest = [None if m is None else y - m - season[t % period] for t, (y, m) in enumerate(zip(ys, trend))]', ['What the trend and the season don’t explain.']]] },
        },
        { figure: 'Decomposition', caption: 'The riders, their centred 7-day trend, the weekly season and the rest. A wrong period finds a "season" in noise and leaves the weekend in the rest.' },
        {
          predict: {
            prompt: `The generator gives the weekend +64.29 against the week. Decomposition measures Saturday at +${f1(SAT)}. Sunday’s index (to 1 decimal)?`,
            answer: SUN, compute: () => W.decompose(RI, 7)[1][4], tolerance: 0.05,
            explain: `+${f1(SUN)}: the two average ${f1((SAT + SUN) / 2)} against the truth 64.29, and the weekdays run from ${f1(Math.min(...WEEKDAYS))} to ${f1(Math.max(...WEEKDAYS))} against −25.71. About 52 of each weekday, each with noise of about 80 riders: a standard error of about 80/√52 ≈ 11 each. The method finds the truth to within its noise, as Part 6 says it should.`,
          },
        },
        {
          code: { file: 'forecasting.py', fn: 'weekday_profile', notes: [['groups[weekday(date)].append(y)', ['Lesson 8.2’s weekday: Monday 0 to Sunday 6.']]] },
        },
        {
          formula: {
            table: 'orders', solution: '=AVERAGE(FILTER(days!D2:D366, WEEKDAY(days!A2:A366, 2)=7)) - AVERAGE(days!D2:D366)', must: ['FILTER', 'WEEKDAY'],
            prompt: 'The quick version, ignoring the trend: Sunday’s average riders minus the year’s average. `WEEKDAY(date, 2)` is 1 for Monday to 7 for Sunday.',
            hint: '`=AVERAGE(FILTER(days!D2:D366, WEEKDAY(days!A2:A366, 2)=7)) - AVERAGE(days!D2:D366)`',
            explain: `${f1(sheet('=AVERAGE(FILTER(days!D2:D366, WEEKDAY(days!A2:A366, 2)=7)) - AVERAGE(days!D2:D366)'))}, your \`weekday_profile\`’s Sunday ${f1(PROFILE[6])} minus ${f1(MEAN_RI)}. Close to the decomposition’s ${f1(SUN)} here, because every weekday comes about equally often in every season. In a short series, or one with a strong trend (52 Sundays mostly in summer, say), the plain profile mixes the trend into the season; subtracting the trend first is what decomposition adds.`,
          },
        },
        { h: 'Differencing' },
        { md: `A second way to remove a trend: forecast **changes** instead of levels. The difference $y_t - y_{t-1}$ takes away a straight trend (its slope becomes a constant); the **seasonal difference** $y_t - y_{t-7}$ takes away the weekly season too, since Saturday is compared with last Saturday. Box and Jenkins built their ARIMA models (1970) on series made steady this way.` },
        {
          code: { file: 'forecasting.py', fn: 'difference', notes: [['return [ys[t] - ys[t - lag] for t in range(lag, len(ys))]', ['lag days shorter than the series: the first lag days have nothing to subtract.']]] },
        },
        {
          write: {
            file: 'forecasting.py', fn: 'difference',
            prompt: 'Write `difference(ys, lag)`: `ys[t] - ys[t - lag]` for every t from `lag` on.',
            starter: 'def difference(ys, lag):\n    return ys\n',
            cases: cases(W.difference, [[[1, 4, 9, 16, 25], 1], [SMALL, 3], [RI.slice(0, 30), 7]]),
            hint: '`[ys[t] - ys[t - lag] for t in range(lag, len(ys))]`',
          },
        },
        {
          choice: {
            prompt: 'The shop compares this Saturday’s riders with last Saturday’s instead of with yesterday’s. Why?',
            options: [
              { text: 'Saturday against Friday always looks like a jump: the weekend’s +90 is in the change. Against last Saturday, the season cancels and what is left is the trend and the noise.', why: 'Yes: the seasonal difference. Retailers compare with the same week last year for the same reason.' },
              { text: 'A week is a longer gap, so the comparison is more accurate.', why: 'A longer gap lets more change in: the season of the year moves on in a week. The point is that the weekday matches.' },
            ],
            answer: 0,
          },
        },
      ],
    },

    {
      id: 'autocorrelation', number: '9.4', title: 'Autocorrelation',
      goal: 'Measure how a series resembles itself k days later, read the ACF and its band of chance, and see a season, a trend and an outlier in it.',
      builds: ['trend-season'],
      blocks: [
        { h: 'A series correlated with itself' },
        { md: `Lesson 9.1 correlated today's riders with tomorrow's. Do the same with the day a week later, two weeks later, and so on: the **autocorrelation** at lag $k$,

$$r_k = \\frac{\\sum_{t=0}^{n-1-k} (y_t - \\bar y)(y_{t+k} - \\bar y)}{\\sum_{t=0}^{n-1} (y_t - \\bar y)^2}$$

Lesson 5.1's correlation, with two differences that make the values of different lags comparable: both factors use the **one mean of the whole series**, and the bottom is the whole series' spread, not the overlap's. All the $r_k$ together are the **ACF** (autocorrelation function). It was introduced by Yule (1927) studying sunspots.` },
        {
          code: { file: 'forecasting.py', fn: 'autocorrelation', notes: [['top = total([(ys[t] - m) * (ys[t + lag] - m) for t in range(len(ys) - lag)])', ['Pairs k apart: n − k of them.']], ['bottom = total([(y - m) ** 2 for y in ys])', ['All n days: so a long lag, with few pairs, gives a smaller r, as it should.']]] },
        },
        {
          write: {
            file: 'forecasting.py', fn: 'autocorrelation', also: MEANS,
            prompt: 'Write `autocorrelation(ys, lag)`: with `m = mean(ys)`, the total of `(ys[t] - m) * (ys[t + lag] - m)` for t from 0 to `len(ys) - lag - 1`, over the total of `(y - m) ** 2` for all y. Use `total`.',
            starter: 'def autocorrelation(ys, lag):\n    return 1.0\n',
            cases: cases(W.autocorrelation, [[[1, 2, 3, 4, 5], 1], [[1, -1, 1, -1, 1, -1], 1], [SMALL, 2], [RI, 7]]),
            hint: '`top = total([(ys[t] - m) * (ys[t + lag] - m) for t in range(len(ys) - lag)])`, `bottom = total([(y - m) ** 2 for y in ys])`.',
          },
        },
        {
          code: { file: 'forecasting.py', fn: 'acf', notes: [['return [autocorrelation(ys, k) for k in range(1, max_lag + 1)]', ['Lag 0 is always 1: left out.']]] },
        },
        { h: 'The band of chance' },
        {
          derive: {
            title: 'How big is big?',
            intro: 'For a series with no pattern at all, each $r_k$ is a statistic with a sampling distribution (Part 6). Bartlett (1946) showed it is close to normal, with mean about 0 and standard error about $1/\\sqrt{n}$.',
            steps: [
              { prompt: 'n = 365 days. The standard error 1/√n (to 4 decimals)?', number: 1 / Math.sqrt(365), compute: () => 1 / Math.sqrt(365), tolerance: 0.00005, why: '0.0523.' },
              { prompt: '95% of a normal lies within 1.96 standard errors (lesson 6.7). The band (to 3 decimals)?', number: BAND, compute: () => 1.96 / Math.sqrt(365), tolerance: 0.0005, why: `±${f3(BAND)}: an $r_k$ outside it is unlikely from chance alone. But with 20 lags, about 1 will be outside by chance: lesson 7.8’s many tests.` },
            ],
          },
        },
        { figure: 'AcfBars', caption: 'The ACF of each series, the grey band of chance, and a red bar at each multiple of 7 when it stands out.' },
        {
          predict: {
            prompt: `The riders: lag 1 is ${f3(ACF[0])} and lag 6 is ${f3(ACF[5])}. Lag 7 (to 2 decimals)?`,
            answer: ACF[6], compute: () => W.autocorrelation(RI, 7), tolerance: 0.005,
            explain: `${f3(ACF[6])}, up from lag 6, and lag 14 (${f3(ACF[13])}) is up from lag 13 (${f3(ACF[12])}): the weekly season, a Saturday resembling the Saturday a week on. Underneath, every bar is high: the trend. Warm days come in a long summer, so any two days a few weeks apart tend to be on the same side of the year’s mean. **A slowly fading ACF means a trend; bumps at a fixed spacing mean a season.**`,
          },
        },
        {
          choice: {
            prompt: `Visits, lag 1: ${f3(ACF_V)}, inside the band. Visits follow the temperature as riders do. Why does their ACF look like no pattern?`,
            options: [
              { text: 'Visits have no day-to-day pattern: the website’s traffic is random.', why: `Fix one day and the ACF is ${f3(ACF_Q)}. The pattern was there all along.` },
              { text: `The news day, 9,412 visits against about 400. Its squared gap from the mean dominates the bottom of the fraction, so every $r_k$ shrinks towards 0. With that day’s usual ${TRUTH['2025-02-11']} put back, lag 1 is ${f3(ACF_Q)}.`, why: 'Yes. One outlier can hide a whole pattern, as it hid the Pearson correlation in lesson 5.3. Look at the series before trusting its ACF.' },
            ],
            answer: 1,
          },
        },
        {
          md: `More of the ACF, all in the figure: the **temperature**'s lag 1 is ${f3(ACF_H)}, a slow seasonal trend; **rain**'s is ${f3(ACF_R)}, inside the band, since the generator draws each day's rain on its own (only the *chance* of rain follows the seasons). **Orders per day** have ${OD_OUT} of 14 lags outside the band. With no pattern, each lag has a 5% chance of landing outside, so 0.7 are expected and 2 or more happen about one time in seven: no evidence of a pattern, and the generator made none (lesson 7.7). A **shuffled** series has none, ever: the test of lesson 9.1 in a picture.`,
        },
        {
          formula: {
            table: 'orders', solution: '=CORREL(days!D2:D365, days!D3:D366)', must: ['CORREL'],
            prompt: 'In a spreadsheet, the lag-1 correlation is `CORREL` of the column against itself shifted one row: days 0 to 363 against days 1 to 364.',
            hint: '`=CORREL(days!D2:D365, days!D3:D366)`',
            explain: `${f3(sheet('=CORREL(days!D2:D365, days!D3:D366)'))} against your \`autocorrelation(riders, 1)\` of ${f3(ACF[0])}. Close, not equal: CORREL gives each of the two ranges its own mean and spread, the ACF one of each for the whole series. For long series the two agree; the ACF's version keeps every lag on the same scale.`,
          },
        },
        {
          chart: {
            prompt: `Draw the riders’ ACF for lags 1 to 28 as bars, and the band as two horizontal lines. \`data\` holds \`{ lag, r }\`; the band is ±${f3(BAND)}. Each bar is a \`rect\` from y(0) to y(r): its \`y\` is the smaller of y(r) and y(0) and its height the difference.`,
            data: W.acf(RI, 28).map((r, k) => ({ lag: k + 1, r })),
            starter: `const band = ${BAND.toFixed(4)}
const x = d3.scaleBand().domain(data.map(d => d.lag)).range([40, 460]).padding(0.2)
const y = d3.scaleLinear().domain([-0.2, 1]).range([270, 20])
svg.selectAll('rect').data(data).join('rect')
  .attr('x', d => x(d.lag)).attr('width', x.bandwidth())
  .attr('y', d => y(0)).attr('height', 0).attr('fill', 'steelblue')
svg.selectAll('line.band').data([band, -band]).join('line').attr('class', 'band')
  .attr('x1', 40).attr('x2', 460).attr('y1', y(0)).attr('y2', y(0)).attr('stroke', 'grey').attr('stroke-dasharray', '4 3')
svg.append('g').attr('transform', \`translate(0,\${y(0)})\`).call(d3.axisBottom(x).tickValues([1, 7, 14, 21, 28]))
`,
            solution: `const band = ${BAND.toFixed(4)}
const x = d3.scaleBand().domain(data.map(d => d.lag)).range([40, 460]).padding(0.2)
const y = d3.scaleLinear().domain([-0.2, 1]).range([270, 20])
svg.selectAll('rect').data(data).join('rect')
  .attr('x', d => x(d.lag)).attr('width', x.bandwidth())
  .attr('y', d => Math.min(y(d.r), y(0))).attr('height', d => Math.abs(y(d.r) - y(0))).attr('fill', 'steelblue')
svg.selectAll('line.band').data([band, -band]).join('line').attr('class', 'band')
  .attr('x1', 40).attr('x2', 460).attr('y1', d => y(d)).attr('y2', d => y(d)).attr('stroke', 'grey').attr('stroke-dasharray', '4 3')
svg.append('g').attr('transform', \`translate(0,\${y(0)})\`).call(d3.axisBottom(x).tickValues([1, 7, 14, 21, 28]))
`,
            checks: [{ select: 'rect', attrs: ['y', 'height'] }, { select: 'line.band', attrs: ['y1', 'y2'] }],
            verify: marks => {
              const acf = W.acf(RI, 28), y = v => G.linearScale(-0.2, 1, 270, 20, v), band = Number(BAND.toFixed(4))
              return marks.rect.length === 28 && marks.rect.every((m, k) => near(m.y, Math.min(y(acf[k]), y(0))) && near(m.height, Math.abs(y(acf[k]) - y(0)))) && near(marks['line.band'][0].y1, y(band)) && near(marks['line.band'][1].y1, y(-band))
            },
            hint: '`.attr(\'y\', d => Math.min(y(d.r), y(0))).attr(\'height\', d => Math.abs(y(d.r) - y(0)))`, and the band lines at `y(d)`.',
            explain: 'Each bar is your `autocorrelation(riders, lag)`: the tests check all 28 against the Python. Every bar is far outside the band, and the ones at 7, 14, 21 and 28 stand a little taller than their neighbours.',
          },
        },
      ],
    },

    {
      id: 'naive-forecasts', number: '9.5', title: 'The forecast to beat',
      goal: 'Make the three simple forecasts every method must beat, and score forecasts with MAE, RMSE and MAPE, knowing what each rewards and where each breaks.',
      builds: ['autocorrelation'],
      blocks: [
        { h: 'Three forecasts that need no model' },
        { md: `A **forecast** is a guess at a value not yet seen, made only from what came before. Before building anything clever, make the forecasts that need no model, because a clever method that loses to them is worse than useless:

- **naive**: tomorrow will be like today, $\\hat y_t = y_{t-1}$;
- **seasonal naive**: like the same day last week, $\\hat y_t = y_{t-7}$;
- **mean**: like the average of every day so far.

Each forecast for day $t$ uses only days before $t$. That is the whole discipline of forecasting, and every method in this part keeps it.` },
        {
          code: { file: 'forecasting.py', fn: 'naive_forecasts', notes: [['return [None] + ys[:-1]', ['Shifted one day: day 0 has no yesterday.']]] },
        },
        {
          code: { file: 'forecasting.py', fn: 'seasonal_naive', notes: [['return [None] * period + ys[:-period]', ['The first week has no last week.']]] },
        },
        {
          code: { file: 'forecasting.py', fn: 'mean_forecasts', notes: [['s += ys[t - 1]', ['A running sum of the days before t: the forecast for t is s / t.']]] },
        },
        {
          write: {
            file: 'forecasting.py', fn: 'mean_forecasts',
            prompt: 'Write `mean_forecasts(ys)`: `None` for day 0, then for each t the mean of `ys[0]` to `ys[t - 1]`, kept as a running sum.',
            starter: 'def mean_forecasts(ys):\n    return [None] + ys[:-1]\n',
            cases: cases(W.meanForecasts, [[[4, 2, 6, 8]], [SMALL], [RI.slice(0, 50)]]),
            hint: '`out, s = [None], 0`, then `for t in range(1, len(ys)): s += ys[t - 1]; out.append(s / t)`.',
          },
        },
        { h: 'Scoring a forecast' },
        { md: `Each forecast misses by $e_t = y_t - \\hat y_t$. Three ways to sum the misses up:

- **MAE**, the mean absolute error, $\\frac1n\\sum |e_t|$: the typical miss, in riders;
- **RMSE**, the root mean squared error, $\\sqrt{\\frac1n\\sum e_t^2}$: also in riders, but a miss twice as big counts four times as much;
- **MAPE**, the mean absolute percentage error, $\\frac{100}{n}\\sum |e_t / y_t|$: in per cent, so a shop and a city can be compared.` },
        {
          code: { file: 'forecasting.py', fn: 'scored', notes: [['return [[y, f] for y, f in zip(ys, forecasts) if f is not None]', ['Only the days that have a forecast: every method is scored on what it could forecast.']]] },
        },
        {
          code: { file: 'forecasting.py', fn: 'mae', notes: [['return mean([abs(y - f) for y, f in pairs])', ['Lesson 2.2’s absolute error, averaged.']]] },
        },
        {
          write: {
            file: 'forecasting.py', fn: 'rmse_of', also: MEANS, prelude: 'import math',
            prompt: 'Write `rmse_of(pairs)`: each pair is `[actual, forecast]`. Square each miss, take the mean, then the square root (`math.sqrt`).',
            starter: 'def rmse_of(pairs):\n    return mean([abs(y - f) for y, f in pairs])\n',
            cases: cases(W.rmseOf, [[[[3, 1], [5, 5], [2, 4]]], [W.scored(RI, W.seasonalNaive(RI, 7))]]),
            hint: '`math.sqrt(mean([(y - f) ** 2 for y, f in pairs]))`',
          },
        },
        {
          code: { file: 'forecasting.py', fn: 'mape', notes: [['return 100 * mean([abs(y - f) / abs(y) for y, f in pairs])', ['Divides by the actual value: a day with 0 makes it impossible.']]] },
        },
        { figure: 'ForecastRace', caption: 'Each simple forecast against the actual riders, and their scores from day 7 on (the first day all three have a forecast).' },
        {
          predict: {
            prompt: `Riders from day 7 on: yesterday misses by ${f1(NAIVE.mae)} on average, the mean so far by ${f1(MEANF.mae)}. The same day last week (to 1 decimal)?`,
            answer: SNAIVE.mae, compute: () => W.mae(W.scored(RI.slice(7), W.seasonalNaive(RI, 7).slice(7))), tolerance: 0.05,
            explain: `${f1(SNAIVE.mae)}: the best of the three, by a little. Last week’s Saturday knows it is a Saturday; yesterday doesn’t. The mean so far is far worse: it remembers January in July. These are the numbers to beat; lesson 9.8’s method beats them by a quarter.`,
          },
        },
        {
          formula: {
            table: 'orders', solution: '=AVERAGE(ABS(days!D9:D366 - days!D2:D359))', must: ['AVERAGE', 'ABS'],
            prompt: 'The seasonal naive forecast’s MAE in one formula: days 7 to 364 (rows 9 to 366) minus the days a week before them (rows 2 to 359), made positive, averaged.',
            hint: '`=AVERAGE(ABS(days!D9:D366 - days!D2:D359))`',
            explain: `${f3(sheet('=AVERAGE(ABS(days!D9:D366 - days!D2:D359))'))}, your ${f3(SNAIVE.mae)}. Two ranges a week apart, subtracted cell by cell: a lagged column.`,
          },
        },
        { h: 'What each score rewards' },
        {
          derive: {
            title: 'MAE wants the median, RMSE the mean',
            intro: 'Forecast the same number c every day. Which c is best depends on the score (lessons 2.1 and 2.2).',
            steps: [
              { prompt: `Orders per day: ${OD_ZERO} days with none, mean ${f3(OD_MEAN)}. Moving c up a little changes Σ|y − c| by (days below c) − (days above c), so the best c has as many days above as below: the median. The median orders per day?`, number: OD_MEDIAN, compute: () => S.median(OD), why: 'The median: half the days had at most 1 order.' },
              { prompt: 'Σ(y − c)² is smallest at the mean. So RMSE prefers forecasting the mean, and MAE prefers the median. The constant 1 every day, from day 91 on: its MAE (to 3 decimals)?', number: OD_ONE.mae, compute: () => W.mae(OD.slice(91).map(y => [y, 1])), tolerance: 0.0005, why: `${f3(OD_ONE.mae)}, better than the mean so far’s ${f3(OD_MEANF.mae)}. On RMSE the two are nearly tied (${f3(OD_ONE.rmse)} and ${f3(OD_MEANF.rmse)}): RMSE wants the mean, ${f2(OD_MEAN)}, and 1 is close to it, while MAE clearly wants the median. With a skewed series the two scores can pick different winners, so choose the score for what a miss costs: if a big miss is much worse than two small ones, RMSE; if every unit of error costs the same, MAE.` },
              { prompt: 'MAPE: a forecast of 0 misses each day by exactly its actual value. Its MAPE, in per cent?', number: 100, compute: () => W.mape([[5, 0], [12, 0]]), why: 'Every term is |y − 0|/y = 1. Under-forecasting can never cost more than 100%, while over-forecasting has no limit: MAPE quietly rewards forecasts that are too low. And with 0s in the actuals (orders per day) it can’t be computed at all.' },
            ],
          },
        },
        {
          choice: {
            prompt: `Visits, yesterday’s value as the forecast: MAE ${f1(V_ALL.mae)}, RMSE ${f1(V_ALL.rmse)}. Leave out the two forecasts the news day touches (that day, and the day after, forecast from it): MAE ${f1(V_QUIET.mae)}, RMSE ${f1(V_QUIET.rmse)}. What happened?`,
            options: [
              { text: 'The news day was a miss of about 9,000 visits twice; squared, those two misses outweigh all the other 356 days together, so RMSE jumps sevenfold. MAE counts them only once each.', why: 'Yes. RMSE is ruled by its biggest misses. Report both, and look at the biggest misses one by one: here they are one day that no method could have forecast.' },
              { text: 'The other days got worse when the news day was left out.', why: 'They are the same 356 forecasts. Only two misses were removed.' },
            ],
            answer: 0,
          },
        },
      ],
    },

    {
      id: 'exponential-smoothing', number: '9.6', title: 'Exponential smoothing',
      goal: 'Forecast with a level that moves a share α towards each new value, derive the weights it puts on the past and their average age, and choose α from the data.',
      builds: ['naive-forecasts'],
      blocks: [
        { h: 'Between yesterday and the mean' },
        { md: `The naive forecast remembers one day; the mean remembers every day equally. **Exponential smoothing** sits between: keep a **level** $\\ell$, and when a new value $y$ arrives, move the level a share $\\alpha$ of the way towards it:

$$\\ell \\leftarrow \\ell + \\alpha (y - \\ell)$$

The forecast for tomorrow is the level. With $\\alpha = 1$ it jumps to each new value (naive); with $\\alpha$ near 0 it barely moves. Robert Brown invented it in the 1950s to forecast spare-parts demand for the US Navy, on machines that could store only a few numbers: it needs only one.` },
        {
          code: { file: 'forecasting.py', fn: 'exponential_smoothing', notes: [['out.append(level)', ['The forecast for day t, made before day t is seen.']], ['level += alpha * (ys[t] - level)', ['Then day t arrives: the level moves a share alpha of the way to it.']]] },
        },
        {
          write: {
            file: 'forecasting.py', fn: 'exponential_smoothing',
            prompt: 'Write `exponential_smoothing(ys, alpha)`: the level starts at `ys[0]`, and the list starts `[None]`. For each later day, first append the level (the forecast), then move it: `level += alpha * (ys[t] - level)`.',
            starter: 'def exponential_smoothing(ys, alpha):\n    return [None] + ys[:-1]\n',
            cases: cases(W.exponentialSmoothing, [[[10, 20, 40], 0.5], [SMALL, 0.3], [RI, 0.1]]),
            hint: '`level = ys[0]`, `out = [None]`, then `for t in range(1, len(ys)): out.append(level); level += alpha * (ys[t] - level)`.',
          },
        },
        { python: { program: 'exponential_smoothing', label: 'Step through exponential_smoothing in real Python' } },
        {
          derive: {
            title: 'The weights on the past',
            intro: 'Unroll the update: $\\ell_t = \\alpha y_t + (1 - \\alpha)\\ell_{t-1} = \\alpha y_t + \\alpha(1 - \\alpha) y_{t-1} + (1 - \\alpha)^2 \\ell_{t-2} = \\ldots$',
            steps: [
              { prompt: 'The weight on the value j days back, in terms of a (for α) and j?', answer: 'a*(1-a)^j', vars: { a: [0.05, 0.95], j: [0, 6] }, why: 'Each step back multiplies by 1 − α: the weights fall off **exponentially**, which names the method.' },
              { prompt: 'Their sum over all j is a geometric series, α × (1 + r + r² + …) with r = 1 − α, which is α/(1 − r). Simplified, in terms of a?', answer: '1', vars: { a: [0.05, 0.95] }, why: 'α/(1 − (1 − α)) = 1. The forecast is a weighted average of the past, with weights that add to 1.' },
              { prompt: 'The average age of the data it uses is Σ j α(1 − α)^j = (1 − α)/α. In terms of a?', answer: '(1-a)/a', vars: { a: [0.05, 0.95] }, why: 'The derivative of the geometric series gives Σ j r^j = r/(1 − r)²; times α, that is (1 − α)/α.' },
              { prompt: 'For α = 0.1, in days?', number: 9, compute: () => (1 - 0.1) / 0.1, why: 'About the age of the middle of a 19-day moving average, (19 − 1)/2 = 9: smoothing with α is like a moving average of about 2/α − 1 days, with no hard edge.' },
            ],
          },
        },
        {
          code: { file: 'forecasting.py', fn: 'smoothing_weights', notes: [['return [alpha * (1 - alpha) ** j for j in range(k)]', ['What the figure’s bars show.']]] },
        },
        { figure: 'SmoothingAlpha', caption: 'α decides how fast the level follows the data, and how much of the past it remembers.' },
        {
          code: { file: 'forecasting.py', fn: 'best_alpha', notes: [['e = rmse_of(scored(ys, exponential_smoothing(ys, a)))', ['Each α scored on its own one-step forecasts: each made before its day was seen.']]] },
        },
        {
          write: {
            file: 'forecasting.py', fn: 'best_alpha', also: [...MEANS, ['forecasting.py', 'scored'], ['forecasting.py', 'rmse_of'], ['forecasting.py', 'exponential_smoothing']], prelude: 'import math',
            prompt: 'Write `best_alpha(ys, alphas)`: the RMSE of each α’s one-step forecasts, `rmse_of(scored(ys, exponential_smoothing(ys, a)))`; return `[alpha, rmse]` for the smallest, the first if tied.',
            starter: 'def best_alpha(ys, alphas):\n    return [alphas[0], 0.0]\n',
            cases: cases(W.bestAlpha, [[[10, 20, 40, 30, 50], [0.2, 0.5, 0.8]], [RI, ALPHAS]]),
            hint: '`best = None`; for each `a`, compute `e`; `if best is None or e < best[1]: best = [a, e]`.',
          },
        },
        {
          predict: {
            prompt: `Over α = 0.05, 0.10, …, 0.95, which α gives the riders’ smallest RMSE?`,
            answer: BEST[0], compute: () => W.bestAlpha(RI, ALPHAS)[0], tolerance: 0.001,
            explain: `α = ${BEST[0]}, with RMSE ${f1(BEST[1])} (MAE ${f1(SES.mae)} from day 7, against the seasonal naive’s ${f1(SNAIVE.mae)}). A small α: a day’s riders are mostly noise around a slowly moving level, so it pays to average about ${f1((1 - BEST[0]) / BEST[0])} days back. The weekly season is still unexplained: smoothing forecasts the same number for Saturday as for Monday. Lesson 9.8 adds it.`,
          },
        },
        {
          formula: {
            table: 'orders', solution: '=INDEX(SCAN(days!D2, days!D3:D366, LAMBDA(s, y, s + 0.1*(y - s))), 364)', must: ['SCAN', 'LAMBDA'],
            prompt: 'Exponential smoothing is exactly what `SCAN` does: start at the first day’s riders, and for each later day move the level: `LAMBDA(s, y, s + 0.1*(y - s))`. The last entry, number 364, is the level after 31 December: the forecast for 1 January 2026.',
            hint: '`=INDEX(SCAN(days!D2, days!D3:D366, LAMBDA(s, y, s + 0.1*(y - s))), 364)`',
            explain: `${f3(sheet('=INDEX(SCAN(days!D2, days!D3:D366, LAMBDA(s, y, s + 0.1*(y - s))), 364)'))} riders, your level ${f3(NEXT_LEVEL)}. One formula, one number carried forward: the spreadsheet as a loop.`,
          },
        },
      ],
    },

    {
      id: 'holt', number: '9.7', title: 'Holt’s trend',
      goal: 'Add a trend to the level, forecast several steps ahead with level + h × trend, and see where a trend carried forward goes wrong.',
      builds: ['exponential-smoothing'],
      blocks: [
        { h: 'A level that is going somewhere' },
        { md: `Smoothing forecasts a flat line: the same level for tomorrow and for next month. In spring the riders are climbing every week, and a flat forecast is always behind. Charles Holt (1957) added a second smoothed number, the **trend** $b$, the change per step:

$$\\ell_t = \\alpha y_t + (1 - \\alpha)(\\ell_{t-1} + b_{t-1}) \\qquad b_t = \\beta(\\ell_t - \\ell_{t-1}) + (1 - \\beta) b_{t-1}$$

The new level is a blend of the new value and where the old level *was heading*; the trend is a smoothed version of how the level just changed. The daily riders are noisy, so this lesson uses the **weekly totals** of the ${FULL_WEEKS.length} whole weeks, where the season of the year is a clear rise and fall.` },
        {
          code: { file: 'forecasting.py', fn: 'holt', notes: [['level, trend = ys[1], ys[1] - ys[0]', ['A start: the second value, and the first change.']], ['out.append(level + trend)', ['One step ahead: where the level is heading.']], ['last = level', ['The old level, kept to measure the change.']], ['trend = beta * (level - last) + (1 - beta) * trend', ['The trend is itself smoothed, with its own share β.']]] },
        },
        {
          write: {
            file: 'forecasting.py', fn: 'holt',
            prompt: 'Write `holt(ys, alpha, beta)`: start with `level = ys[1]`, `trend = ys[1] - ys[0]` and the list `[None, None]`. For each t from 2: append `level + trend`; keep `last = level`; then update the level and the trend as in the formulas.',
            starter: 'def holt(ys, alpha, beta):\n    return [None, None] + ys[1:-1]\n',
            cases: cases(W.holt, [[[10, 12, 15, 15, 20], 0.5, 0.5], [SMALL, 0.3, 0.1], [WK, 0.5, 0.3]]),
            hint: 'Inside the loop: `level = alpha * ys[t] + (1 - alpha) * (level + trend)`, then `trend = beta * (level - last) + (1 - beta) * trend`.',
          },
        },
        {
          derive: {
            title: 'Further ahead',
            steps: [
              { prompt: 'With no new data, each step adds the trend once more. The forecast h steps ahead, in terms of l (level), h and b (trend)?', answer: 'l+h*b', vars: { l: [0, 100], h: [1, 10], b: [-5, 5] }, why: 'A straight line from the latest level: Holt’s method forecasts a **linear trend**.' },
              { prompt: `Holt (α 0.5, β 0.3) on the first ${CUT} whole weeks, to Sunday 6 July: its forecast 8 weeks ahead (to the nearest rider)?`, number: AHEAD[7], compute: () => W.holtAhead(WK.slice(0, CUT), 0.5, 0.3, 8)[7], tolerance: 0.5, why: `${n0(AHEAD[7])}. The actual week was ${n0(WK[CUT + 7])}: the weekly totals peaked in the week of Monday ${PEAK_MONDAY} (${n0(WK[PEAK_WEEK])}) and then fell, and the trend didn’t know. A straight line carried past a turning point overshoots.` },
            ],
          },
        },
        {
          code: { file: 'forecasting.py', fn: 'holt_ahead', notes: [['return [level + j * trend for j in range(1, h + 1)]', ['After the last value: the line level + j × trend.']]] },
        },
        { figure: 'HoltAhead', caption: 'Forecast eight weeks from any week: in spring the trend helps; around the summer peak it overshoots; smoothing alone stays flat.' },
        {
          choice: {
            prompt: `On the daily riders, Holt (0.3, 0.1) misses by ${f1(HOLT_DAILY.mae)} on average; plain smoothing by ${f1(SES.mae)}. Why is the method with more in it worse?`,
            options: [
              { text: 'Day to day, the riders’ changes are mostly weather and weekends, not trend. Holt reads each jump as the start of a trend and carries it forward, so it chases noise.', why: 'Yes. A trend term only helps if the trend is steadier than the noise around it. Weekly totals average the noise away; daily data drowns the trend in it. Gardner and McKenzie (1985) proposed **damping** the trend for this reason: a trend that fades out with each step ahead.' },
              { text: 'Holt is wrong for any series with a season.', why: 'The season is a separate problem (lesson 9.8). The trouble here is the noise.' },
            ],
            answer: 0,
          },
        },
        {
          formula: {
            table: 'orders', solution: '=SUMPRODUCT((WEEKNUM(days!A2:A366, 2)=28)*days!D2:D366)', must: ['WEEKNUM', 'SUMPRODUCT'],
            prompt: 'One of the weekly totals on the sheet: the riders of WEEKNUM 28 (Monday 7 July to Sunday 13 July).',
            hint: '`=SUMPRODUCT((WEEKNUM(days!A2:A366, 2)=28)*days!D2:D366)`',
            explain: `${sheet('=SUMPRODUCT((WEEKNUM(days!A2:A366, 2)=28)*days!D2:D366)')}: \`week_of\`’s week 27, ${WEEK27[1]}: the first week Holt forecast in the derivation (${n0(AHEAD[0])}).`,
          },
        },
      ],
    },

    {
      id: 'holt-winters', number: '9.8', title: 'The weekly season: Holt–Winters',
      goal: 'Add one seasonal index per day of the week to the level and trend, tune the three shares on early data only, and beat every simple forecast.',
      builds: ['holt', 'trend-season'],
      blocks: [
        { h: 'Level, trend and season' },
        { md: `Peter Winters (1960), Holt's student, added the season: one **index** per position in the cycle, here seven, one per weekday. Each day the method takes the season out before updating the level, and updates that day's index from what is left:

$$\\ell_t = \\alpha (y_t - s_{t-7}) + (1 - \\alpha)(\\ell_{t-1} + b_{t-1})$$
$$s_t = \\gamma (y_t - \\ell_t) + (1 - \\gamma) s_{t-7}$$

with the trend updated as in Holt's method. The forecast for a day $h$ steps ahead is level + $h$ × trend + that weekday's index. This is the **additive** form, matching lesson 9.3's decomposition: the weekend adds riders, the same number in winter and summer, as the generator does.` },
        {
          derive: {
            title: 'One update',
            steps: [
              { prompt: 'A Saturday: the level was heading for 600 (ℓ + b), Saturday’s index is 60, and 700 riders come. Take the season out first: the value the level sees, y − s?', number: 640, compute: () => 700 - 60, why: '700 − 60 = 640: what a Saturday of 700 says about the level.' },
              { prompt: 'With α = 0.1, the new level 0.1 × 640 + 0.9 × 600?', number: 604, compute: () => 0.1 * 640 + 0.9 * 600, why: 'Without taking the season out, the level would jump to 610 every Saturday and fall back on Monday.' },
              { prompt: 'The index update, in terms of g (γ), y, l (the new level) and s (the old index)?', answer: 'g*(y-l)+(1-g)*s', vars: { g: [0, 1], y: [0, 100], l: [0, 100], s: [-20, 20] }, why: 'How far this Saturday sat above the new level, blended into the old index: smoothing again, one index at a time.' },
              { prompt: 'With γ = 0.2: 0.2 × (700 − 604) + 0.8 × 60?', number: 0.2 * 96 + 48, compute: () => 0.2 * (700 - 604) + 0.8 * 60, tolerance: 1e-9, why: '19.2 + 48 = 67.2: Saturday’s index creeps up towards what Saturdays do.' },
            ],
          },
        },
        {
          code: { file: 'forecasting.py', fn: 'holt_winters', notes: [['level = mean(ys[:period])', ['Start: the first week’s mean, no trend, and each day’s gap from the mean as its index.']], ['out[t + h - 1] = level + h * trend + season[(t + h - 1) % period]', ['Before day t is seen: the forecast for h − 1 days after it, from what is known up to t − 1.']], ['level = alpha * (ys[t] - season[t % period]) + (1 - alpha) * (level + trend)', ['The season taken out before the level moves.']], ['season[t % period] = gamma * (ys[t] - level) + (1 - gamma) * season[t % period]', ['Only today’s weekday learns.']]] },
        },
        {
          write: {
            file: 'forecasting.py', fn: 'holt_winters', also: MEANS,
            prompt: 'Write `holt_winters(ys, alpha, beta, gamma, period, h=1)` as in the code above: start the level at `mean(ys[:period])`, the trend at 0 and the indices at `y - level`; a list of `None` as long as `ys`; then for each t from `period`, fill in the forecast for `t + h - 1` (if it is in the list) before updating the level, the trend and today’s index.',
            starter: 'def holt_winters(ys, alpha, beta, gamma, period, h=1):\n    return [None] * len(ys)\n',
            cases: cases(W.holtWinters, [[[10, 20, 12, 22, 14, 24, 16, 26], 0.5, 0.1, 0.3, 2], [RI.slice(0, 60), 0.1, 0.01, 0.2, 7], [RI.slice(0, 60), 0.1, 0.01, 0.2, 7, 7]]),
            hint: 'In the loop: `if t + h - 1 < len(ys): out[t + h - 1] = level + h * trend + season[(t + h - 1) % period]`; `last = level`; then the three updates, the level first.',
          },
        },
        { python: { program: 'holt_winters', label: 'Step through holt_winters in real Python' } },
        { h: 'Choosing α, β and γ honestly' },
        { md: `Three shares to choose. Try every combination on a grid (α in 0.05 to 0.5, β in 0 to 0.05, γ in 0.05 to 0.3: ${GRID.alpha.length * GRID.beta.length * GRID.gamma.length} of them) and keep the best RMSE, **on the first 91 days only**, January to March. Then score the chosen method on the rest of the year, which played no part in choosing it. Lesson 9.9 explains why this matters.` },
        {
          predict: {
            prompt: `Tuned on January to March, the best is α ${TUNED.alpha}, β ${TUNED.beta}, γ ${TUNED.gamma}. Its MAE on days 91 to 364 (to 1 decimal)?`,
            answer: HW1, compute: () => hwFrom(1), tolerance: 0.05,
            explain: `${f1(HW1)} riders, against ${f1(LATE.ses)} for smoothing, ${f1(LATE.snaive)} for the seasonal naive, ${f1(LATE.naive)} for the naive forecast and ${f1(LATE.mean)} for the mean, all on the same days. A quarter smaller than the best simple forecast, and the method needs nine numbers of memory. Most of what is left is the weather: rain and the day’s own temperature, which no method that sees only past riders can know (lesson 9.9).`,
          },
        },
        { figure: 'SeasonUpdates', caption: 'The seven indices through the year. γ = 0 keeps the first week’s; a large γ lets one rainy Saturday drag Saturday’s index down.' },
        {
          choice: {
            prompt: 'The visits grow 5% for each degree (lesson 5.6): in summer, the weekly ups and downs of visits would be bigger in riders’ terms too, if visits had them. Which form would suit such a series?',
            options: [
              { text: 'The additive one: a season is a number of visits added.', why: 'A fixed number of visits would be too big in winter and too small in summer.' },
              { text: 'The multiplicative one: a season that scales with the level (Saturday = 1.2 × the level), or the additive one on the logs of the visits.', why: 'Yes. Winters gave both forms. Lesson 5.6’s log turns multiplying into adding, so the additive method on log visits is the multiplicative method in disguise.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'walk-forward', number: '9.9', title: 'Walk-forward validation',
      goal: 'Test a forecast only on days after everything it learned from, and find the three ways the future leaks into a forecast’s score.',
      builds: ['holt-winters', 'cross-validation'],
      blocks: [
        { h: 'Never shuffle time' },
        { md: `Lesson 8.9 held out random folds, and then whole months, and found that the honest split is the one that matches how the model will be used. A forecast is used on the **future**, so it must be tested on days after every day it learned from. **Walk-forward validation** (also called time-series cross-validation, or backtesting): train on days 0 to $e - 1$, forecast day $e$ (or $e + h - 1$, h days ahead), score it; then add day $e$ to the training data and do it again, to the end.` },
        {
          code: { file: 'forecasting.py', fn: 'walk_forward', notes: [['return [[end, end + horizon - 1] for end in range(start, n - horizon + 1)]', ['Each split: the number of days trained on, and the day forecast. Every target is after every training day.']]] },
        },
        {
          write: {
            file: 'forecasting.py', fn: 'walk_forward',
            prompt: 'Write `walk_forward(n, start, horizon)`: a pair `[end, end + horizon - 1]` for each `end` from `start` up to the last that keeps the target inside the n days.',
            starter: 'def walk_forward(n, start, horizon):\n    return [[end, end] for end in range(start, n)]\n',
            cases: cases(W.walkForward, [[10, 7, 1], [10, 7, 2], [365, 300, 7]]),
            hint: 'The target `end + horizon - 1` must be at most `n - 1`, so `end` runs to `n - horizon`: `range(start, n - horizon + 1)`.',
          },
        },
        { figure: 'WalkForwardView', caption: 'Walk-forward: train on everything before the line, forecast past it, move on. Random test days sit between training days, with the future on both sides.' },
        { h: 'Three leaks' },
        { md: `**1. A forecast that reads the future.** The centred 7-day average of lesson 9.3 is a good summary of a day, and a tempting "forecast": it scores ${f1(CENTRED)} from day 91, better than Holt–Winters' ${f1(HW1)}. But three of its seven days are after the day it forecasts. The trailing average, which uses only the past, scores ${f1(TRAILING)}. Anything centred, smoothed in both directions, or filled in from both sides (lesson 3.3's missing values!) leaks the future.

**2. Tuning on the test.** Choosing α, β and γ on the same days the method is scored on lets the score see the answers. Lesson 9.8 chose them on January to March only. Here the honest choice of α for smoothing (${BEST_EARLY[0]}) happens to be the same as the year's (${BEST[0]}), so the leak costs nothing; on a shorter or stranger series it can cost a lot, and nobody can tell which without testing honestly.

**3. An input not known in time.** Lesson 8.4's model of riders from the day's weather is far better than any forecast. Refitted each day on the days before, it misses by **${f1(WF.own)}** riders from day 91. But the day's rain and temperature are only known at the end of the day. Give it what is known the evening before, yesterday's weather, and it misses by **${f1(WF.yesterday)}**: worse than Holt–Winters' ${f1(HW1)}. A weather forecast would do better than yesterday's weather; the model is only as good as the forecast of its inputs (lesson 8.11's leak, in time).` },
        {
          choice: {
            prompt: 'A colleague tests a forecast of daily sales with five-fold cross-validation on randomly chosen days and gets a much better score than walk-forward. Which should the shop believe?',
            options: [
              { text: 'Cross-validation: it uses all the data, five times.', why: 'Each test day sits among training days from after it. The model gets to use the future, which it will never have when it is used.' },
              { text: 'Walk-forward: the forecast will be used on days after all its data, and that is the only test that matches.', why: 'Yes. Bergmeir and Benítez (2012) and Hyndman’s textbook give the same rule: for a time series, test in time order.' },
            ],
            answer: 1,
          },
        },
        { note: 'Walk-forward with refitting is slow: one fit per day. Common shortcuts: refit once a week or a month, or keep the parameters fixed and only let the level and indices update, as Holt–Winters does on its own. What must never change is the rule that each forecast uses only the past.', kind: 'key' },
      ],
    },

    {
      id: 'riders-forecast', number: '9.10', title: 'Project: next week’s riders',
      goal: 'Forecast a week ahead for staffing, score the forecast honestly against the simple ones, report what it is worth, and recognise a series with nothing to forecast.',
      builds: ['walk-forward'],
      blocks: [
        { h: 'The question' },
        { md: `The shop opens a stall on the cycle path at weekends in summer and staffs its workshop by the riders. It plans the rota on Sunday evening for the week ahead, so it needs each day's riders **seven days ahead**, not one. The method: Holt–Winters with the shares chosen on January to March, each forecast made seven days before its day, scored walk-forward from day 91 against the seasonal naive (last week's same day, which is also a forecast seven days ahead).` },
        { figure: 'ForecastRace', props: { methods: ['seasonal', 'hw', 'hw7'], from: 91 }, caption: 'A week ahead against a day ahead and last week’s same day, scored from day 91.' },
        {
          predict: {
            prompt: `A day ahead, Holt–Winters misses by ${f1(HW1)}. Seven days ahead (to 1 decimal)?`,
            answer: HW7, compute: () => hwFrom(7), tolerance: 0.05,
            explain: `${f1(HW7)}: hardly worse. Over a week the level moves little, and the season does not move at all; almost all the error is the day’s weather, which is as unknown a day ahead as a week ahead. Against the seasonal naive’s ${f1(LATE.snaive)}, the error is ${(100 * GAIN).toFixed(0)}% smaller.`,
          },
        },
        {
          choice: {
            prompt: `What should the analysis tell the shop?`,
            options: [
              { text: `“Holt–Winters forecasts each day’s riders a week ahead to within ${f1(HW7)} on average (the error measured on April to December, after tuning on January to March). That is ${(100 * GAIN).toFixed(0)}% better than using last week. Most of the remaining error is the weather: plan for about ±${Math.round(1.25 * HW7)} on a given day, and check the weather forecast for the weekend.”`, why: 'Yes: the method, the honest error and how it was measured, the gain over the simple forecast, and the size of a typical miss, in the shop’s units. (For roughly normal errors, the standard deviation is about 1.25 × the MAE.)' },
              { text: `“Our model is ${(100 - Math.round(100 * HW7 / S.mean(RI.slice(91)))).toFixed(0)}% accurate.”`, why: 'One number with no baseline, no unit and no mention of how it was measured. Is that good? Compared with what? Measured on which days?' },
            ],
            answer: 0,
          },
        },
        { md: `The forecast for the first week of 2026, made from the whole year: ${LAST_WEEK.map(v => n0(v)).join(', ')} riders, Thursday 1 January to Wednesday 7 January. The weekend (the 3rd and 4th) sits higher, and the level is winter's.` },
        { h: 'A series with nothing in it' },
        { md: `The same methods on **orders per day**, from day 91: the mean so far misses by ${f3(OD_LATE.mean)} orders, smoothing by ${f3(OD_LATE.ses)}, Holt–Winters by ${f3(OD_LATE.hw)} and the seasonal naive by ${f3(OD_LATE.snaive)}. Nothing beats the mean, and the constant 1 (the median) does better still on MAE (${f3(OD_ONE.mae)}, lesson 9.5). The ACF (lesson 9.4) said why: there is no pattern to find, because the generator draws every order's day evenly. The honest forecast of a series with no pattern is its average, with its spread, and the clever methods only add noise by chasing chance.` },
        {
          choice: {
            prompt: 'A manager asks for a model that forecasts the number of orders tomorrow. What is the useful answer?',
            options: [
              { text: 'Fit Holt–Winters anyway: some model is better than none.', why: 'It is worse than the average here, measured walk-forward. A method that finds a pattern in noise is worse than none.' },
              { text: `“Orders per day show no pattern by weekday, season or trend; expect about ${OD_MEAN.toFixed(1)} a day, with ${OD_ZERO} of 365 days having none. That is as good as a forecast can get from this data; to do better, find a cause (visits, a promotion) and measure it.”`, why: 'Yes. Knowing that there is nothing to forecast is a result: it saves the shop from trusting a model that only fits noise.' },
            ],
            answer: 1,
          },
        },
        { note: 'Part 10 puts the shop’s tables into a database: SQL next to the spreadsheet, plain Python and pandas, and how a database finds one row among millions.', kind: 'key' },
      ],
    },
  ],
}
