// Part 6: samples and uncertainty. The 400 clean orders are the population, so every parameter is known
// and every interval can be checked. Sampling with and without replacement, the binomial and Poisson
// distributions, the standard error, the bell curve and where it fails, confidence intervals and their
// coverage, the bootstrap, reservoir and stratified sampling, and an interval for every number so far.
// Every random draw comes from the generator of python/data.py (python/samples.py, engine/samples.js).
import * as T from '../engine/tables.js'
import * as C from '../engine/cleaning.js'
import * as S from '../engine/summary.js'
import * as G from '../engine/charts.js'
import * as P from '../engine/patterns.js'
import * as M from '../engine/samples.js'
import { ORDERS_CSV, CATALOGUE_CSV, DAYS_CSV, DELIVERIES_CSV, FAR_TOWNS } from '../engine/data.js'
import { evaluateFormula } from '../engine/sheet.js'
import { WITH_RNG, WITH_MONTHS } from './given.js'

const cases = (fn, inputs) => inputs.map(args => ({ args, expected: fn(...args) }))
const sheet = formula => evaluateFormula('orders', formula).value
const money = x => `£${x.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const pct = (x, d = 1) => `${(100 * x).toFixed(d)}%`
const MEANS = [['summary.py', 'total'], ['summary.py', 'mean']]
const SPREAD = [...MEANS, ['summary.py', 'variance'], ['summary.py', 'std']]

const ROWS = T.readCsv(ORDERS_CSV())
const LIST = Object.fromEntries(T.readCsv(CATALOGUE_CSV()).map(r => [r.item, T.toPence(r.list_price)]))
const CLEAN = C.cleanOrders(ROWS, LIST)
const PRICED = CLEAN.filter(r => r.price !== null).map(r => ({ ...r, price: r.price / 100 }))
const POP = PRICED.map(r => r.price)
const LIGHTS = PRICED.filter(r => r.item === 'Lights, front and back').map(r => r.price)
const IDS = CLEAN.map(r => r.order_id)
const WEB = CLEAN.map(r => (r.channel === 'web' ? 1 : 0)), P_WEB = S.mean(WEB)
const SIGMA = S.std(POP, false), MU = S.mean(POP)

// 6.1
const DISTINCT = new Set(M.sampleWith(IDS, 400, 5)).size
// 6.2
const TWELVE_UP = Array.from({ length: 9 }, (_, i) => M.binomialPmf(12 + i, 20, P_WEB)).reduce((s, p) => s + p, 0)
// 6.3
const LAMBDA = CLEAN.length / 365
const PER_DAY = M.ordersPerDay(CLEAN.map(r => r.date)), TALLY = M.tally(PER_DAY)
const TALLY_ROWS = TALLY.map((days, orders) => ({ orders, days }))
// 6.4, 6.5
const MEANS30 = M.sampleMeans(POP, 30, 1000, 21)
const SD30 = S.std(M.sampleMeans(POP, 30, 2000, 21))
const SKEW = M.skewness(POP)
// 6.6
const COVER5 = M.coverage(POP, 5, 2000, 31), COVER100 = M.coverage(POP, 100, 2000, 31)
// 6.7
const BOOT_MEANS = M.bootstrap(LIGHTS, 'mean', 2000, 41), BOOT_MEDIANS = M.bootstrap(LIGHTS, 'median', 2000, 41)
const MEDIAN_CI = M.percentileInterval(BOOT_MEDIANS)
// 6.8
const SHARE_FIRST = M.reservoirShare(20, 5, 1, 4000, 61), SHARE_LAST = M.reservoirShare(20, 5, 20, 4000, 62)
// 6.9: the law of total variance on the prices, by item (population variances, dividing by n).
const BY_ITEM = S.groupBy(PRICED, 'item')
const WITHIN = [...BY_ITEM.values()].reduce((s, g) => s + (g.length / POP.length) * S.variance(g.map(r => r.price), false), 0)
const BETWEEN = [...BY_ITEM.values()].reduce((s, g) => s + (g.length / POP.length) * (S.mean(g.map(r => r.price)) - MU) ** 2, 0)
const [SPREAD_SIMPLE, SPREAD_STRATA] = M.spreadOfMeans(PRICED, 'price', 'item', 40, 400, 71)
const WEB_MEAN = S.mean(PRICED.filter(r => r.channel === 'web').map(r => r.price))
// 6.10: every number so far, with a bootstrap interval.
const DAYS = P.numberDays(T.readCsv(DAYS_CSV())), QUIET = DAYS.filter(r => r.visits < 9000)
const TOWN = Object.fromEntries(CLEAN.map(r => [r.order_id, r.town]))
const DELIVERIES = T.readCsv(DELIVERIES_CSV()).map(r => ({ ...r, far: FAR_TOWNS.includes(TOWN[r.order_id]) }))
const onTime = (courier, far) => DELIVERIES.filter(r => r.courier === courier && r.far === far).map(r => (r.on_time === 'yes' ? 1 : 0))
const NEAR_DIFF = M.bootstrapDifference(onTime('Northern', false), onTime('Swift', false), 2000, 81)
const FAR_DIFF = M.bootstrapDifference(onTime('Northern', true), onTime('Swift', true), 2000, 82)
const R_CI = M.percentileInterval(M.bootstrapPairs(DAYS.map(r => r.high_c), DAYS.map(r => r.riders), P.correlation, 2000, 83))
const GROWTH_CI = M.percentileInterval(M.bootstrapPairs(QUIET.map(r => r.high_c), QUIET.map(r => r.visits), P.growthPerUnit, 2000, 84))

const near = (a, b, tol = 1e-6) => Math.abs(a - b) < tol
const POISSON_Y = v => G.linearScale(0, 160, 270, 20, v)

export const PART6 = {
  id: 'part6', title: 'Part 6 · Samples and uncertainty', lessons: [
    {
      id: 'population-sample', number: '6.1', title: 'Population and sample',
      goal: 'Tell a parameter from a statistic, draw a sample with and without replacement by a partial shuffle, and derive the chance that a given row is in the sample.',
      builds: ['not-causation'],
      blocks: [
        { h: 'Knowing the answer for once' },
        { md: `Every number so far was worked out from **all** the shop's orders. Usually that is impossible: a pollster can't ask every voter, a factory can't break every part to test it. They take a **sample** and use it to estimate the number for everything, the **population**.

The words matter. A number describing the population is a **parameter**: fixed, usually unknown. A number worked out from a sample is a **statistic**: it changes from sample to sample. The mean price of all ${POP.length} priced clean orders is a parameter, **${money(MU)}**; the mean of 20 of them is a statistic.

This part treats the 400 clean orders as the population. Unlike real life, we know every parameter, so every estimate can be checked.` },
        { figure: 'SampleDrawer', caption: 'Draw a sample of orders, with or without replacement. The sample’s mean (a statistic) against the population’s (the parameter), and the rows picked twice.' },
        { h: 'Drawing without replacement: a partial shuffle' },
        { md: `A fair sample of $k$ from $n$ gives every set of $k$ rows the same chance. Shuffling the whole list and taking the first $k$ does it, but only the first $k$ places need shuffling: place 0 gets a random row from all $n$; place 1 a random row from the $n - 1$ left; and so on. This is the first $k$ steps of the **Fisher–Yates shuffle** (1938; Durstenfeld's version for computers, 1964).` },
        {
          code: {
            file: 'samples.py', fn: 'sample_without', notes: [
              ['j = i + rng.below(len(items) - i)', ['A random place from `i` to the end: only rows not chosen yet.']],
              ['items[i], items[j] = items[j], items[i]', ['Swap it into place `i`. The rows before `i` are the sample so far; the rest are still to choose from.']],
            ],
          },
        },
        {
          write: {
            file: 'samples.py', fn: 'sample_without', prelude: WITH_RNG,
            prompt: 'Write `sample_without(values, k, seed)`: copy the values, then for each place `i` from 0 to `k − 1` swap it with a random place from `i` to the end (`i + rng.below(len(items) - i)`), and return the first `k`. `Rng`, the shop’s generator, is given; make one with `Rng(seed)` and draw in this order.',
            starter: 'def sample_without(values, k, seed):\n    rng = Rng(seed)\n    items = list(values)\n    # the first k steps of a shuffle\n    return items[:k]\n',
            cases: cases(M.sampleWithout, [[[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 4, 1], [IDS.slice(0, 30), 5, 2], [['a', 'b', 'c'], 3, 7]]),
            hint: '`for i in range(k):` then `j = i + rng.below(len(items) - i)` and `items[i], items[j] = items[j], items[i]`.',
          },
        },
        {
          code: { file: 'samples.py', fn: 'sample_with', notes: [['return [values[rng.below(len(values))] for _ in range(k)]', ['Each draw from all of them: nothing is set aside, so a row can come up again.']]] },
        },
        {
          write: {
            file: 'samples.py', fn: 'sample_with', prelude: WITH_RNG,
            prompt: 'Write `sample_with(values, k, seed)`: `k` draws, each `values[rng.below(len(values))]`, from one `Rng(seed)`.',
            starter: 'def sample_with(values, k, seed):\n    rng = Rng(seed)\n    # k draws, each from all the values\n    return []\n',
            cases: cases(M.sampleWith, [[[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 6, 1], [IDS.slice(0, 30), 5, 2]]),
            hint: '`[values[rng.below(len(values))] for _ in range(k)]`',
          },
        },
        {
          derive: {
            title: 'Is a given row in the sample?',
            intro: 'A population of $n$ rows, a sample of $k$.',
            steps: [
              { prompt: 'Without replacement, every set of $k$ rows is equally likely, so every row has the same chance to be among the $k$. What chance, in terms of $k$ and $n$?', answer: 'k/n', vars: { k: [1, 50], n: [50, 500] }, why: 'The $k$ places are shared fairly among $n$ rows.' },
              { prompt: 'With replacement: one draw misses a given row with chance $1 - 1/n$. All $k$ draws miss it with what chance? So it is in the sample with what chance (in terms of $k$, $n$)?', answer: '1-(1-1/n)^k', vars: { k: [1, 50], n: [50, 500] }, why: 'The draws are independent, so their chances multiply.' },
              { prompt: 'Draw 400 with replacement from the 400 orders. The chance a given order is in the sample (to 4 decimals)?', number: 1 - (1 - 1 / 400) ** 400, compute: () => 1 - (1 - 1 / 400) ** 400, tolerance: 5e-5, why: `${(1 - (1 - 1 / 400) ** 400).toFixed(4)}: close to $1 - 1/e = 0.6321$, which it tends to as $n$ grows. About 63% of the rows appear; the rest are replaced by repeats. Lesson 6.7 builds on exactly this.` },
            ],
          },
        },
        {
          predict: {
            prompt: 'So 400 draws with replacement from the 400 order ids should give about 400 × 0.6326 = 253 different orders. Draw them with `sample_with(ids, 400, 5)`: how many different orders come up?',
            answer: DISTINCT, compute: () => new Set(M.sampleWith(IDS, 400, 5)).size,
            explain: `${DISTINCT}, against 253.0 expected: one sample, close to the average. The other ${400 - DISTINCT} draws were repeats.`,
          },
        },
        {
          formula: {
            table: 'orders', solution: '=COMBIN(400, 20)', must: ['COMBIN'],
            prompt: 'How many different samples of 20 orders can be drawn from 400 (without replacement)? `COMBIN(n, k)`.',
            hint: '`=COMBIN(400, 20)`',
            explain: `About ${sheet('=COMBIN(400, 20)').toExponential(3)}, a ${String(M.combBig(400, 20)).length}-digit number. Nobody could list them; a random sample picks one of them, each with the same chance. (Lesson 6.2 builds COMBIN by hand. Past 2⁵³ a spreadsheet keeps 15 significant digits: the tests compare it with the exact number.)`,
          },
        },
      ],
    },

    {
      id: 'binomial', number: '6.2', title: 'Counting successes',
      goal: 'Describe a yes-or-no column as a Bernoulli variable, count the ways to choose k of n, and derive the binomial distribution with its mean np and variance np(1 − p).',
      builds: ['population-sample'],
      blocks: [
        { h: 'A column of yes and no' },
        { md: `Pick one order at random: is it a web order? It is, with chance $p = ${P_WEB}$ (${WEB.reduce((s, x) => s + x, 0)} of the 400). A variable that is 1 with chance $p$ and 0 otherwise is a **Bernoulli** variable. Draw $n$ orders, with replacement, and count the web orders: that count is **binomial**. How likely is each count?` },
        {
          derive: {
            title: 'One try, then n',
            intro: '$X$ is 1 with chance $p$ and 0 with chance $1 - p$.',
            steps: [
              { prompt: 'The mean, $E[X] = 1 \\cdot p + 0 \\cdot (1 - p)$?', answer: 'p', vars: { p: [0, 1] }, why: 'The mean of a 0/1 column is the share of 1s: lesson 1.7’s “a mask’s mean is a fraction”.' },
              { prompt: '$X^2 = X$ (as $0^2 = 0$, $1^2 = 1$), so $E[X^2] = p$. The variance $E[X^2] - E[X]^2$?', answer: 'p*(1-p)', vars: { p: [0, 1] }, why: '$p - p^2 = p(1 - p)$: largest at $p = 0.5$, zero when the answer is always the same.' },
              { prompt: 'Add $n$ independent tries. Means add; for independent tries, variances add too (lesson 6.4). The variance of the count?', answer: 'n*p*(1-p)', vars: { n: [1, 100], p: [0, 1] }, why: '$n$ copies of $p(1 - p)$. The mean count is $np$.' },
              { prompt: 'For 20 orders, the standard deviation of the number of web orders (to 3 decimals)?', number: Math.sqrt(20 * P_WEB * (1 - P_WEB)), compute: () => Math.sqrt(20 * P_WEB * (1 - P_WEB)), tolerance: 5e-4, why: `$\\sqrt{20 \\times ${P_WEB} \\times ${1 - P_WEB}} = ${Math.sqrt(20 * P_WEB * (1 - P_WEB)).toFixed(3)}$, around a mean of ${20 * P_WEB}.` },
            ],
          },
        },
        { h: 'The chance of exactly k' },
        { md: `One particular order of results, say web, web, shop, …, with $k$ web orders among $n$, has chance $p^k (1 - p)^{n-k}$. Every arrangement of the $k$ web orders among the $n$ places has the same chance, and there are $\\binom{n}{k}$ of them:

$$P(K = k) = \\binom{n}{k} p^k (1 - p)^{n - k}$$

$\\binom{n}{k}$, "n choose k", counts the ways to choose $k$ places of $n$. As a formula, $\\frac{n!}{k!(n-k)!}$; but $n!$ for $n = 400$ has 869 digits. Built up one factor at a time it stays small.` },
        {
          code: {
            file: 'samples.py', fn: 'comb', notes: [
              ['result = result * (n - k + i) // i', ['Multiply first, then divide: after step $i$ the result is $\\binom{n-k+i}{i}$, a whole number, so `//` is exact. Python’s whole numbers have no upper limit: `comb(400, 20)` is exact to the last of its 34 digits.']],
            ],
          },
        },
        {
          write: {
            file: 'samples.py', fn: 'comb', forbid: [['math.comb', 'Build it yourself: `math.comb` is what this exercise opens up.'], ['factorial', 'No factorials: they grow far bigger than the answer. Multiply and divide one step at a time.']],
            prompt: 'Write `comb(n, k)`: start at 1; for `i` from 1 to `k`, multiply by `n - k + i` and divide by `i` (whole-number division `//`).',
            starter: 'def comb(n, k):\n    result = 1\n    # k steps, each a whole number\n    return result\n',
            cases: cases(M.comb, [[20, 9], [10, 0], [52, 5], [6, 3]]),
            hint: '`for i in range(1, k + 1): result = result * (n - k + i) // i`',
          },
        },
        {
          write: {
            file: 'samples.py', fn: 'binomial_pmf', given: ['comb'],
            prompt: 'Write `binomial_pmf(k, n, p)`: the number of arrangements times the chance of one.',
            starter: 'def binomial_pmf(k, n, p):\n    # arrangements × the chance of one arrangement\n    return 0.0\n',
            cases: cases(M.binomialPmf, [[9, 20, P_WEB], [0, 5, 0.5], [3, 3, 0.9]]),
            hint: '`comb(n, k) * p ** k * (1 - p) ** (n - k)`',
          },
        },
        { figure: 'BinomialExplorer', caption: 'The binomial’s chances (bars) and the share of 2,000 simulated samples with each count (dots). Change n and p.' },
        {
          formula: {
            table: 'orders', solution: '=BINOM.DIST(9, 20, 0.4675, FALSE)', must: ['BINOM.DIST'],
            prompt: 'The chance that a sample of 20 orders holds exactly 9 web orders: `BINOM.DIST(k, n, p, FALSE)` (`FALSE`: exactly k; `TRUE` would give k or fewer).',
            hint: '`=BINOM.DIST(9, 20, 0.4675, FALSE)`',
            explain: `${sheet('=BINOM.DIST(9, 20, 0.4675, FALSE)').toFixed(4)}: the most likely count, and still under 1 in 5.`,
          },
        },
        {
          predict: {
            prompt: 'The chance that 20 orders hold 12 or more web orders (add the chances for 12 to 20, to 4 decimals)?',
            answer: TWELVE_UP, compute: () => Array.from({ length: 9 }, (_, i) => M.binomialPmf(12 + i, 20, P_WEB)).reduce((s, p) => s + p, 0), tolerance: 5e-5,
            explain: `${TWELVE_UP.toFixed(4)}: about one sample in ${Math.round(1 / TWELVE_UP)} would show 60% web orders or more, though the population has ${pct(P_WEB, 2)}. A sample that looks surprising may be ordinary luck. Part 7 builds tests on exactly this kind of sum.`,
          },
        },
      ],
    },

    {
      id: 'poisson', number: '6.3', title: 'Counting events',
      goal: 'Derive the Poisson distribution as a binomial with many tries and a small chance each, and compare it with the shop’s orders per day.',
      builds: ['binomial'],
      blocks: [
        { h: 'Orders per day' },
        { md: `The shop had ${CLEAN.length} orders in 365 days: $\\lambda = ${LAMBDA.toFixed(4)}$ a day on average. Some days had none, some had four. How many days should have had 0, 1, 2…?

Think of each day as a huge number $n$ of potential customers, each ordering with a tiny chance $p$, so that $np = \\lambda$. The count is binomial, but $n$ is unknown and enormous. Let $n$ grow with $np = \\lambda$ fixed, and the binomial settles into the **Poisson distribution**, which needs only $\\lambda$.` },
        {
          derive: {
            title: 'The Poisson as a limit',
            intro: 'Binomial with $n$ tries and $p = \\lambda / n$.',
            steps: [
              { prompt: 'No events: $P(0) = (1 - \\lambda/n)^n$. As $n$ grows this tends to (in terms of lambda):', answer: 'exp(-lambda)', vars: { lambda: [0.1, 5] }, why: 'The limit $(1 + x/n)^n \\to e^x$, with $x = -\\lambda$.' },
              { prompt: 'Each step up: $\\frac{P(k)}{P(k-1)} = \\frac{n - k + 1}{k} \\cdot \\frac{p}{1 - p}$. With $p = \\lambda/n$ and $n$ huge, this tends to (in terms of lambda and $k$):', answer: 'lambda/k', vars: { lambda: [0.1, 5], k: [1, 10] }, why: '$\\frac{n-k+1}{n} \\to 1$ and $1 - p \\to 1$. So $P(k) = e^{-\\lambda} \\frac{\\lambda^k}{k!}$: each step multiplies by $\\lambda / k$.' },
              { prompt: `For the shop, $\\lambda = ${LAMBDA.toFixed(4)}$: the chance of a day with no orders (to 4 decimals)?`, number: M.poissonPmf(0, LAMBDA), compute: () => Math.exp(-LAMBDA), tolerance: 5e-5, why: `$e^{-${LAMBDA.toFixed(4)}} = ${M.poissonPmf(0, LAMBDA).toFixed(4)}$: one day in three.` },
            ],
          },
        },
        {
          code: { file: 'samples.py', fn: 'poisson_pmf', notes: [['p *= lam / i', ['The derivation’s step: no factorial and no power is ever worked out on its own, so nothing overflows.']]] },
        },
        {
          write: {
            file: 'samples.py', fn: 'poisson_pmf', prelude: 'import math',
            prompt: 'Write `poisson_pmf(k, lam)`: start at $e^{-\\lambda}$ and multiply by $\\lambda / i$ for $i$ from 1 to $k$.',
            starter: 'def poisson_pmf(k, lam):\n    p = math.exp(-lam)\n    # k steps up\n    return p\n',
            cases: cases(M.poissonPmf, [[0, LAMBDA], [2, LAMBDA], [5, 3], [0, 0.5]]),
            hint: '`for i in range(1, k + 1): p *= lam / i`',
          },
        },
        { h: 'Counting the days' },
        {
          code: { file: 'samples.py', fn: 'day_of_year', notes: [['return sum(MONTH_DAYS[:month - 1]) + day - 1', ['The months before, then the day: 1 March is 31 + 28 + 1 − 1 = day 59. Whole numbers, so Python’s `sum` is exact here.']]] },
        },
        {
          write: {
            file: 'samples.py', fn: 'orders_per_day', given: ['day_of_year'], prelude: WITH_MONTHS,
            prompt: 'Write `orders_per_day(dates)`: a list of 365 zeros, then 1 added at `day_of_year(date)` for each date.',
            starter: 'def orders_per_day(dates):\n    counts = [0] * 365\n    # one more on each order’s day\n    return counts\n',
            cases: cases(M.ordersPerDay, [[['2025-01-01', '2025-01-01', '2025-12-31']], [CLEAN.map(r => r.date)]]),
            hint: '`for date in dates: counts[day_of_year(date)] += 1`',
          },
        },
        {
          code: { file: 'samples.py', fn: 'tally', notes: [['out[c] += 1', ['A count of counts: `tally[2]` is how many days had exactly 2 orders.']]] },
        },
        {
          predict: {
            prompt: `How many of the 365 days should have exactly 2 orders, by the Poisson (365 × P(2), to 2 decimals)?`,
            answer: 365 * M.poissonPmf(2, LAMBDA), compute: () => 365 * M.poissonPmf(2, LAMBDA), tolerance: 0.005,
            explain: `${(365 * M.poissonPmf(2, LAMBDA)).toFixed(2)}. The data has ${TALLY[2]}. All of them: ${TALLY.map((d, k) => `${k} order${k === 1 ? '' : 's'}: ${d} days (Poisson ${(365 * M.poissonPmf(k, LAMBDA)).toFixed(1)})`).join('; ')}.`,
          },
        },
        {
          chart: {
            prompt: 'Draw the days with each number of orders as bars (done), and the Poisson’s expected number of days as a circle on each bar: `365 × P(k)`, with $P(k) = e^{-\\lambda}\\lambda^k / k!$ and $\\lambda$ = 400/365. Give each circle its `cy`.',
            data: TALLY_ROWS,
            starter: `const lam = 400 / 365
const x = d3.scaleBand().domain(data.map(d => d.orders)).range([40, 460]).padding(0.2)
const y = d3.scaleLinear().domain([0, 160]).range([270, 20])
svg.selectAll('rect').data(data).join('rect')
  .attr('x', d => x(d.orders)).attr('width', x.bandwidth())
  .attr('y', d => y(d.days)).attr('height', d => y(0) - y(d.days))
  .attr('fill', 'steelblue')
const expected = k => 0   // 365 × the Poisson's chance of k
svg.selectAll('circle').data(data).join('circle')
  .attr('cx', d => x(d.orders) + x.bandwidth() / 2)
  .attr('cy', d => y(expected(d.orders)))
  .attr('r', 5).attr('fill', '#b0413e')
svg.append('g').attr('transform', 'translate(0,270)').call(d3.axisBottom(x))
`,
            solution: `const lam = 400 / 365
const x = d3.scaleBand().domain(data.map(d => d.orders)).range([40, 460]).padding(0.2)
const y = d3.scaleLinear().domain([0, 160]).range([270, 20])
svg.selectAll('rect').data(data).join('rect')
  .attr('x', d => x(d.orders)).attr('width', x.bandwidth())
  .attr('y', d => y(d.days)).attr('height', d => y(0) - y(d.days))
  .attr('fill', 'steelblue')
const factorial = k => d3.range(1, k + 1).reduce((p, i) => p * i, 1)
const expected = k => 365 * Math.exp(-lam) * lam ** k / factorial(k)
svg.selectAll('circle').data(data).join('circle')
  .attr('cx', d => x(d.orders) + x.bandwidth() / 2)
  .attr('cy', d => y(expected(d.orders)))
  .attr('r', 5).attr('fill', '#b0413e')
svg.append('g').attr('transform', 'translate(0,270)').call(d3.axisBottom(x))
`,
            checks: [{ select: 'rect', attrs: ['y', 'height'] }, { select: 'circle', attrs: ['cx', 'cy'] }],
            verify: marks => marks.circle.every((m, k) => near(m.cy, POISSON_Y(365 * M.poissonPmf(k, LAMBDA)), 1e-9)),
            hint: '`const factorial = k => d3.range(1, k + 1).reduce((p, i) => p * i, 1)` and `const expected = k => 365 * Math.exp(-lam) * lam ** k / factorial(k)`.',
            explain: 'Each circle is your `poisson_pmf(k, 400/365)` × 365: the tests check all six against it. The bars follow the circles closely, a little taller at 1 and shorter at 0.',
          },
        },
        {
          formula: {
            table: 'orders', solution: '=365*POISSON.DIST(0, 400/365, FALSE)', must: ['POISSON.DIST'],
            prompt: 'The expected number of days with no orders: 365 × `POISSON.DIST(0, λ, FALSE)`.',
            hint: '`=365*POISSON.DIST(0, 400/365, FALSE)`',
            explain: `${sheet('=365*POISSON.DIST(0, 400/365, FALSE)').toFixed(1)} days expected; the data has ${TALLY[0]}.`,
          },
        },
        { note: `A Poisson count has its variance equal to its mean, λ. The days’ counts have mean ${S.mean(PER_DAY).toFixed(3)} and variance ${S.variance(PER_DAY, false).toFixed(3)}: a little less spread than Poisson. The year’s total was fixed at 400, which on its own would give each day the variance $np(1 - p)$ with $p = 1/365$, ${(400 * (1 / 365) * (364 / 365)).toFixed(3)}: almost no difference. The rest is the luck of one year. Is a gap that size surprising? Part 7 has the tools to ask.`, kind: 'key' },
      ],
    },

    {
      id: 'standard-error', number: '6.4', title: 'The standard error',
      goal: 'Derive the variance of a sum and of a mean, show that the mean of n values varies as σ/√n, and measure it on the shop’s prices.',
      builds: ['poisson'],
      blocks: [
        { h: 'A statistic has a distribution' },
        { md: `Draw a sample of 30 orders and take its mean price. Draw another: a different mean. Draw a thousand samples and the thousand means have a distribution of their own: the **sampling distribution** of the mean. Its spread says how far one sample's mean is likely to be from the parameter, ${money(MU)}. That spread can be derived.` },
        {
          derive: {
            title: 'The variance of a mean',
            intro: '$X_1, \\dots, X_n$ are independent draws, each with mean $\\mu$ and variance $\\sigma^2$.',
            steps: [
              { prompt: 'For two variables, $\\text{var}(X + Y) = \\text{var}(X) + \\text{var}(Y) + 2\\,\\text{cov}(X, Y)$ (expand $E[(X + Y - \\mu_X - \\mu_Y)^2]$). Independent draws have covariance 0. The variance of the sum of $n$ draws, in terms of $n$ and sigma?', answer: 'n*sigma^2', vars: { n: [1, 100], sigma: [0.1, 10] }, why: 'The variances add: $n\\sigma^2$.' },
              { prompt: 'The mean is the sum divided by $n$, and dividing by $n$ divides the variance by $n^2$. The variance of the mean?', answer: 'sigma^2/n', vars: { n: [1, 100], sigma: [0.1, 10] }, why: '$\\frac{n\\sigma^2}{n^2} = \\frac{\\sigma^2}{n}$.' },
              { prompt: 'Its standard deviation, the **standard error** of the mean?', answer: 'sigma/sqrt(n)', vars: { n: [1, 100], sigma: [0.1, 10] }, why: 'Four times the data halves the error: precision is expensive.' },
              { prompt: `The prices have σ = ${money(SIGMA)}. The standard error of a mean of 30 (to the penny)?`, number: SIGMA / Math.sqrt(30), compute: () => SIGMA / Math.sqrt(30), tolerance: 0.006, why: `${money(SIGMA / Math.sqrt(30))}: a sample of 30 typically misses ${money(MU)} by about that much.` },
            ],
          },
        },
        {
          code: { file: 'samples.py', fn: 'sample_means', notes: [['rng = Rng(seed)', ['**One** generator for every sample. Seeds next to each other (1, 2, 3…) give nearly the same first draws with this generator, which once made 200 “independent” samples almost identical (lesson 3.6).']], ['t += values[rng.below(len(values))]', ['With replacement, so the draws are independent, as the derivation assumed.']]] },
        },
        {
          write: {
            file: 'samples.py', fn: 'sample_means', prelude: WITH_RNG,
            prompt: 'Write `sample_means(values, n, repeats, seed)`: one `Rng(seed)`; for each repeat, add up `n` draws `values[rng.below(len(values))]` and keep their mean.',
            starter: 'def sample_means(values, n, repeats, seed):\n    rng = Rng(seed)\n    means = []\n    # repeats samples of n, with replacement\n    return means\n',
            cases: cases(M.sampleMeans, [[[1, 2, 3, 4], 2, 5, 7], [POP, 30, 10, 21]]),
            hint: '`for _ in range(repeats):` set `t = 0.0`, add `values[rng.below(len(values))]` `n` times, then `means.append(t / n)`.',
          },
        },
        { figure: 'SamplingDistribution', caption: 'A thousand samples of n prices: the histogram of their means, the measured spread, and σ/√n.' },
        {
          predict: {
            prompt: `σ/√30 = ${money(SIGMA / Math.sqrt(30))}. Draw 2,000 samples of 30 (seed 21): what is the standard deviation of their means (to the penny)?`,
            answer: SD30, compute: () => S.std(M.sampleMeans(POP, 30, 2000, 21)), tolerance: 0.006,
            explain: `${money(SD30)}: the derivation, measured.`,
          },
        },
        {
          code: { file: 'samples.py', fn: 'standard_error', notes: [['return std(values) / math.sqrt(len(values))', ['From one sample, σ is unknown: its own standard deviation `s` stands in. Part 7 asks what that costs for small samples.']]] },
        },
        {
          write: {
            file: 'samples.py', fn: 'standard_error', also: SPREAD, prelude: 'import math',
            prompt: 'Write `standard_error(values)`: the sample’s standard deviation over √n.',
            starter: 'def standard_error(values):\n    return std(values)\n',
            cases: cases(M.standardError, [[[1, 2, 3, 4]], [LIGHTS]]),
            hint: '`std(values) / math.sqrt(len(values))`',
          },
        },
        {
          formula: {
            table: 'orders', solution: '=STDEV.S(days!D2:D366)/SQRT(COUNT(days!D2:D366))', must: ['STDEV.S', 'SQRT', 'COUNT'],
            prompt: 'The standard error of the mean riders per day (the days sheet, column D).',
            hint: '`=STDEV.S(days!D2:D366)/SQRT(COUNT(days!D2:D366))`',
            explain: `${sheet('=STDEV.S(days!D2:D366)/SQRT(COUNT(days!D2:D366))').toFixed(2)} riders, around a mean of ${sheet('=AVERAGE(days!D2:D366)').toFixed(1)}. (Days next to each other are alike, so they aren’t quite independent draws; a time series needs more care, Part 9.)`,
          },
        },
        { note: 'Without replacement the draws are not quite independent: taking one row out changes what is left. The variance of the mean shrinks by the factor $(N - n)/(N - 1)$, the **finite population correction**. For a sample of 30 from 382 it is 0.92; sampling everything (n = N), it is 0: the mean of the whole population has no error.', kind: 'key' },
      ],
    },

    {
      id: 'bell-curve', number: '6.5', title: 'The bell curve and its limits',
      goal: 'See the sampling distribution of the mean become a bell curve (the central limit theorem), measure skewness, derive why the generator’s noise has variance 1, and find where the theorem fails.',
      builds: ['standard-error'],
      blocks: [
        { h: 'Means become bell-shaped' },
        { md: `The prices are anything but bell-shaped: most under £50, the bikes near £450. Yet the means of samples of 30 form a near-symmetric hump. This is the **central limit theorem**: the mean of $n$ independent draws, from almost any population, is close to the **normal distribution** with mean $\\mu$ and standard deviation $\\sigma/\\sqrt n$, and closer as $n$ grows.

$$\\varphi(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-\\frac{1}{2}\\left(\\frac{x - \\mu}{\\sigma}\\right)^2}$$

The same bell lesson 4.6 put on every price.` },
        {
          code: { file: 'samples.py', fn: 'normal_pdf', notes: [['u = (x - mu) / sigma', ['How many standard deviations from the mean: a z-score.']], ['return math.exp(-u * u / 2) / (sigma * math.sqrt(2 * math.pi))', ['Divided by σ so the area stays 1 however wide the bell (lesson 4.6’s derivation).']]] },
        },
        {
          write: {
            file: 'samples.py', fn: 'normal_pdf', prelude: 'import math',
            prompt: 'Write `normal_pdf(x, mu, sigma)`.',
            starter: 'def normal_pdf(x, mu, sigma):\n    u = (x - mu) / sigma\n    return 0.0\n',
            cases: cases(M.normalPdf, [[0, 0, 1], [25, 25, 1.4], [27.5, 25, 1.4]]),
            hint: '`math.exp(-u * u / 2) / (sigma * math.sqrt(2 * math.pi))`',
          },
        },
        { figure: 'CltExplorer', caption: 'Pick a population and n: a thousand sample means, and the normal curve the theorem predicts.' },
        { h: 'How lopsided?' },
        { md: `**Skewness** measures lopsidedness: the mean of the cubed z-scores. Cubes keep the sign, so a long tail to the right gives a positive skew; a symmetric spread gives 0. The prices have skewness **${SKEW.toFixed(2)}**. The skewness of a mean of $n$ shrinks as $\\gamma/\\sqrt n$: that is the theorem at work, and why skewed data needs bigger samples before the bell is a good guide.` },
        {
          code: { file: 'samples.py', fn: 'skewness', notes: [['return n / ((n - 1) * (n - 2)) * cubes', ['The factor $\\frac{n}{(n-1)(n-2)}$ corrects small samples, as $n - 1$ does in the variance; spreadsheets’ SKEW uses it.']]] },
        },
        {
          write: {
            file: 'samples.py', fn: 'skewness', also: SPREAD, prelude: 'import math',
            prompt: 'Write `skewness(values)`: the sum of the cubed z-scores, $\\left(\\frac{x - m}{s}\\right)^3$, times $\\frac{n}{(n-1)(n-2)}$.',
            starter: 'def skewness(values):\n    n, m, s = len(values), mean(values), std(values)\n    return 0.0\n',
            cases: cases(M.skewness, [[[1, 2, 3]], [[1, 1, 1, 10]], [POP]]),
            hint: '`cubes = total([((x - m) / s) ** 3 for x in values])`, then `n / ((n - 1) * (n - 2)) * cubes`.',
          },
        },
        {
          predict: {
            prompt: `The prices’ skewness is ${SKEW.toFixed(2)}. If the skewness of a mean of $n$ is $\\gamma / \\sqrt n$, what should the means of samples of 30 have (to 2 decimals)?`,
            answer: SKEW / Math.sqrt(30), compute: () => M.skewness(POP) / Math.sqrt(30), tolerance: 0.005,
            explain: `${(SKEW / Math.sqrt(30)).toFixed(2)}. Measured on 2,000 sample means: ${M.skewness(M.sampleMeans(POP, 30, 2000, 21)).toFixed(2)}. Still visibly lopsided at n = 30, the size often quoted as “enough”: for data this skewed it isn’t (lesson 6.6 measures the cost).`,
          },
        },
        {
          formula: {
            table: 'orders', solution: '=SKEW(days!C2:C366)', must: ['SKEW'],
            prompt: 'The skewness of the daily rain (the days sheet, column C): many dry days, a few very wet ones.',
            hint: '`=SKEW(days!C2:C366)`',
            explain: `${sheet('=SKEW(days!C2:C366)').toFixed(3)}: a long tail to the right, as your \`skewness\` finds.`,
          },
        },
        { h: 'The generator’s own bell' },
        { md: `The shop's generator needs bell-shaped noise for the temperatures and riders. It makes it from the theorem: **twelve** uniform draws added, minus 6.` },
        {
          code: { file: 'data.py', fn: 'noise', notes: [['for _ in range(12):', ['Twelve draws between 0 and 1, added: a sum, so the theorem applies.']], ['return t - 6', ['Each draw has mean ½; twelve have mean 6. Subtracting it centres the noise on 0.']]] },
        },
        {
          derive: {
            title: 'Why twelve',
            intro: '$U$ is uniform between 0 and 1: every value equally likely.',
            steps: [
              { prompt: 'Its mean, $E[U] = \\int_0^1 u\\,du$?', number: 0.5, compute: () => 0.5, why: '$\\left[\\frac{u^2}{2}\\right]_0^1 = \\frac12$.' },
              { prompt: '$E[U^2] = \\int_0^1 u^2\\,du$?', number: 1 / 3, compute: () => 1 / 3, tolerance: 1e-6, why: '$\\left[\\frac{u^3}{3}\\right]_0^1 = \\frac13$.' },
              { prompt: 'Its variance, $E[U^2] - E[U]^2$?', number: 1 / 12, compute: () => 1 / 3 - 1 / 4, tolerance: 1e-6, why: '$\\frac13 - \\frac14 = \\frac{1}{12}$.' },
              { prompt: 'The variance of the sum of twelve independent draws?', number: 1, compute: () => 12 / 12, why: 'Variances add: $12 \\times \\frac{1}{12} = 1$. Twelve draws give exactly the standard deviation 1 the generator wants, with only additions, so Python and JavaScript draw the same numbers.' },
            ],
          },
        },
        { h: 'Where the theorem fails' },
        { md: `The theorem needs the population to have a finite variance. Some don't. Take $1/u$, with $u$ uniform: half the values are below 2, but a value above a million comes once in a million draws, and the mean is infinite. The mean of a sample never settles: every so often one huge value drags it up, and more data makes it worse, not better. City sizes, word frequencies, insurance claims and the wealth of individuals have tails like this.` },
        {
          code: { file: 'samples.py', fn: 'heavy_tailed', notes: [['return [1 / (1 - rng.random()) for _ in range(n)]', ['$1 - u$ is uniform too, and never exactly 0.']]] },
        },
        { figure: 'HeavyTail', caption: 'The running mean of 100,000 heavy-tailed values, against the running mean of the shop’s prices drawn with replacement. One settles; the other never does.' },
        {
          chart: {
            prompt: `A thousand sample means (n = 30) are binned for you. Draw the normal curve the theorem predicts over them: mean μ = ${MU.toFixed(4)}, standard error se = σ/√30 with σ = ${SIGMA.toFixed(4)}. To compare it with counts, scale the density by the number of means × the bin width.`,
            data: MEANS30,
            starter: `const mu = ${MU.toFixed(4)}, se = ${SIGMA.toFixed(4)} / Math.sqrt(30)
const x = d3.scaleLinear().domain([0, 160]).range([40, 460])
const bins = d3.bin().domain([0, 160]).thresholds(d3.range(10, 160, 10))(data)
const y = d3.scaleLinear().domain([0, 250]).range([270, 20])
svg.selectAll('rect').data(bins).join('rect')
  .attr('x', b => x(b.x0) + 1).attr('width', b => x(b.x1) - x(b.x0) - 2)
  .attr('y', b => y(b.length)).attr('height', b => y(0) - y(b.length))
  .attr('fill', 'steelblue').attr('fill-opacity', 0.6)
const expected = v => 0   // the normal density at v, × 1000 means × the bin width 10
const xs = d3.range(0, 160.001, 2)
svg.append('path')
  .attr('fill', 'none').attr('stroke', '#b0413e').attr('stroke-width', 2)
  .attr('d', d3.line().x(v => x(v)).y(v => y(expected(v)))(xs))
`,
            solution: `const mu = ${MU.toFixed(4)}, se = ${SIGMA.toFixed(4)} / Math.sqrt(30)
const x = d3.scaleLinear().domain([0, 160]).range([40, 460])
const bins = d3.bin().domain([0, 160]).thresholds(d3.range(10, 160, 10))(data)
const y = d3.scaleLinear().domain([0, 250]).range([270, 20])
svg.selectAll('rect').data(bins).join('rect')
  .attr('x', b => x(b.x0) + 1).attr('width', b => x(b.x1) - x(b.x0) - 2)
  .attr('y', b => y(b.length)).attr('height', b => y(0) - y(b.length))
  .attr('fill', 'steelblue').attr('fill-opacity', 0.6)
const density = v => Math.exp(-(((v - mu) / se) ** 2) / 2) / (se * Math.sqrt(2 * Math.PI))
const expected = v => density(v) * 1000 * 10
const xs = d3.range(0, 160.001, 2)
svg.append('path')
  .attr('fill', 'none').attr('stroke', '#b0413e').attr('stroke-width', 2)
  .attr('d', d3.line().x(v => x(v)).y(v => y(expected(v)))(xs))
`,
            checks: [{ select: 'path', attrs: ['d'] }],
            verify: marks => { const d = marks.path[0].d, se = Number(SIGMA.toFixed(4)) / Math.sqrt(30); return d.length === 162 && Array.from({ length: 81 }, (_, k) => 2 * k).every((v, k) => Math.abs(d[2 * k + 1] - G.linearScale(0, 250, 270, 20, 10000 * M.normalPdf(v, Number(MU.toFixed(4)), se))) <= 5e-4) },
            hint: '`const density = v => Math.exp(-(((v - mu) / se) ** 2) / 2) / (se * Math.sqrt(2 * Math.PI))` and `const expected = v => density(v) * 1000 * 10`.',
            explain: 'The curve is your `normal_pdf(v, μ, σ/√30)` × 10,000: the tests check all 81 points against it. The bars lean a little to the left of it, with a longer right tail: the leftover skewness of the means.',
          },
        },
      ],
    },

    {
      id: 'confidence-intervals', number: '6.6', title: 'Confidence intervals',
      goal: 'Build the interval mean ± 1.96 standard errors, say exactly what “95%” means, and measure how often the interval holds the truth, for bell-shaped and for skewed data.',
      builds: ['bell-curve'],
      blocks: [
        { h: 'A range instead of a number' },
        { md: `One sample gives one mean. The standard error says how far it is likely to be off. Put the two together: if the sample mean is close to normal with standard deviation SE around the true mean $\\mu$, then 95% of the time it lands within $z$ standard errors of $\\mu$, and then $\\mu$ is within $z$ standard errors of **it**. So

$$\\bar x \\pm z \\cdot \\text{SE}$$

is a **95% confidence interval**, for the right $z$.` },
        {
          derive: {
            title: 'Where 1.96 comes from',
            intro: '$Z$ is standard normal (mean 0, standard deviation 1).',
            steps: [
              { prompt: 'We want $P(-z < Z < z) = 0.95$. By symmetry, the area below $z$ is then?', number: 0.975, compute: () => 1 - 0.05 / 2, tolerance: 1e-9, why: '0.95 in the middle, 0.025 in each tail: 0.975 below $z$.' },
              { prompt: 'The $z$ with 97.5% of the normal below it, `NORM.S.INV(0.975)` (to 4 decimals)?', number: sheet('=NORM.S.INV(0.975)'), compute: () => sheet('=NORM.S.INV(0.975)'), tolerance: 5e-5, why: '1.9600: the 1.96 of every 95% interval.' },
            ],
          },
        },
        {
          code: { file: 'samples.py', fn: 'mean_interval', notes: [['return [m - z * se, m + z * se]', ['Give or take $z$ standard errors.']]] },
        },
        {
          write: {
            file: 'samples.py', fn: 'mean_interval', given: ['standard_error'], also: SPREAD, prelude: 'import math',
            prompt: 'Write `mean_interval(values, z=1.96)`: `[mean − z·SE, mean + z·SE]`.',
            starter: 'def mean_interval(values, z=1.96):\n    m, se = mean(values), standard_error(values)\n    return [m, m]\n',
            cases: cases(M.meanInterval, [[[1, 2, 3, 4]], [LIGHTS], [POP, 2.576]]),
            hint: '`[m - z * se, m + z * se]`',
          },
        },
        {
          formula: {
            table: 'orders', solution: '=CONFIDENCE.NORM(0.05, STDEV.S(days!D2:D366), COUNT(days!D2:D366))', must: ['CONFIDENCE.NORM'],
            prompt: 'The spreadsheet gives the half-width, $z \\cdot$ SE, directly: `CONFIDENCE.NORM(alpha, sd, n)`, with alpha = 0.05 for 95%. For the mean riders per day?',
            hint: '`=CONFIDENCE.NORM(0.05, STDEV.S(days!D2:D366), COUNT(days!D2:D366))`',
            explain: `± ${sheet('=CONFIDENCE.NORM(0.05, STDEV.S(days!D2:D366), COUNT(days!D2:D366))').toFixed(2)} riders: 1.96 × the standard error of lesson 6.4.`,
          },
        },
        { h: 'What 95% means' },
        { md: `The interval is random: a new sample moves it. "95%" describes the **method**, not one interval: if you drew sample after sample and built an interval from each, 95% of them would contain $\\mu$. One particular interval either contains it or doesn't; you just can't tell which. Here, unusually, we **can** tell: the population is known. So the method can be tested.` },
        { figure: 'CoverageRuns', caption: 'A hundred samples, a hundred intervals. Those that miss the true mean (the line) are red. Change n and the population.' },
        {
          code: {
            file: 'samples.py', fn: 'coverage', notes: [
              ['truth = mean(values)', ['The parameter, known only because the population is.']],
              ['if low <= truth <= high:', ['Did this interval catch it?']],
            ],
          },
        },
        {
          write: {
            file: 'samples.py', fn: 'coverage', given: ['standard_error', 'mean_interval'], also: SPREAD, prelude: WITH_RNG,
            prompt: 'Write `coverage(values, n, repeats, seed, z=1.96)`: one `Rng(seed)`; for each repeat draw `n` values with replacement, build `mean_interval(sample, z)`, and count the intervals that hold `mean(values)`. Return the share.',
            starter: 'def coverage(values, n, repeats, seed, z=1.96):\n    rng = Rng(seed)\n    truth = mean(values)\n    hits = 0\n    # repeats samples, an interval each\n    return hits / repeats\n',
            cases: cases(M.coverage, [[LIGHTS, 10, 50, 31], [POP, 5, 50, 31]]),
            hint: '`sample = [values[rng.below(len(values))] for _ in range(n)]`, then `low, high = mean_interval(sample, z)` and `if low <= truth <= high: hits += 1`.',
          },
        },
        {
          predict: {
            prompt: 'For all the prices, with samples of 5: what share of 2,000 “95%” intervals hold the true mean (seed 31, to 3 decimals)?',
            answer: COVER5, compute: () => M.coverage(POP, 5, 2000, 31), tolerance: 5e-4,
            explain: `${COVER5.toFixed(3)}: about one in three, not 95 in 100. With n = 100 it reaches ${COVER100.toFixed(3)}. Most samples of 5 hold no bike: their mean is low **and** their spread is small, so the interval is short and far below the truth. The formula assumed a bell shape the means of so skewed a population don’t have yet. For the lights, whose prices are nearly symmetric, samples of 10 already cover ${pct(M.coverage(LIGHTS, 10, 2000, 31))}.`,
            misconceptions: [{ answer: 0.95, tolerance: 0.02, feedback: '95% is what the method promises when its assumptions hold. Here, with heavily skewed data and n = 5, they don’t: try it in the figure.' }],
          },
        },
        {
          choice: {
            prompt: 'A report says “the mean basket is £58, 95% CI £41 to £75.” Which statement is right?',
            options: [
              { text: 'There is a 95% chance the true mean is between £41 and £75.', why: 'The true mean is fixed; it is in this interval or not. The 95% belongs to the method that made the interval.' },
              { text: 'Intervals made this way hold the true mean 95% of the time, if the method’s assumptions hold; this is one of them.', why: `Yes, and the last clause matters: this lesson just measured ${pct(COVER5, 0)} for very skewed data and samples of 5.` },
              { text: '95% of baskets cost between £41 and £75.', why: 'That would be a range for single baskets, far wider. A confidence interval is about the mean.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'bootstrap', number: '6.7', title: 'The bootstrap',
      goal: 'Estimate the uncertainty of any statistic by resampling the sample, build a percentile interval, and give an interval for a median, which has no formula.',
      builds: ['confidence-intervals'],
      blocks: [
        { h: 'Pulling yourself up by your bootstraps' },
        { md: `The standard error of a mean has a formula. A median doesn't, nor does a correlation of ranks, a ratio of two means, or most things a real analysis computes. Efron's **bootstrap** (1979) needs no formula: treat the sample as if it were the population, and draw from **it**, with replacement, samples of the same size. Each resample gives the statistic again; their spread stands in for the sampling distribution.

Each resample holds about 63% of the rows, some twice or more: the derivation of lesson 6.1.` },
        { code: { file: 'samples.py', assign: 'STATS' } },
        {
          code: { file: 'samples.py', fn: 'bootstrap', notes: [['out.append(summary([values[rng.below(len(values))] for _ in range(len(values))]))', ['A resample as big as the sample, with replacement: `sample_with` of 6.1, from one generator.']]] },
        },
        {
          write: {
            file: 'samples.py', fn: 'bootstrap', also: [...MEANS, ['summary.py', 'median']], constants: ['STATS'], prelude: WITH_RNG,
            prompt: 'Write `bootstrap(values, stat, repeats, seed)`: one `Rng(seed)`; `repeats` times, draw `len(values)` values with replacement and keep `STATS[stat]` of them.',
            starter: 'def bootstrap(values, stat, repeats, seed):\n    rng = Rng(seed)\n    summary = STATS[stat]\n    out = []\n    # resample, summarise, repeat\n    return out\n',
            cases: cases(M.bootstrap, [[[1, 2, 3, 4, 5], 'mean', 5, 1], [LIGHTS, 'median', 20, 41]]),
            hint: '`for _ in range(repeats): out.append(summary([values[rng.below(len(values))] for _ in range(len(values))]))`',
          },
        },
        { python: { program: 'bootstrap', label: 'Step through bootstrap in real Python' } },
        {
          code: { file: 'samples.py', fn: 'percentile_interval', notes: [['return [quantile(stats, (1 - level) / 2), quantile(stats, (1 + level) / 2)]', ['The middle 95% of the resampled statistics: the quantiles of lesson 2.2 at 0.025 and 0.975.']]] },
        },
        {
          write: {
            file: 'samples.py', fn: 'percentile_interval', also: [['summary.py', 'quantile']], prelude: 'import math',
            prompt: 'Write `percentile_interval(stats, level=0.95)`: the `quantile`s at $(1 - \\text{level})/2$ and $(1 + \\text{level})/2$.',
            starter: 'def percentile_interval(stats, level=0.95):\n    return [min(stats), max(stats)]\n',
            cases: cases(M.percentileInterval, [[[...Array(101).keys()], 0.9], [BOOT_MEDIANS.slice(0, 200)]]),
            hint: '`[quantile(stats, (1 - level) / 2), quantile(stats, (1 + level) / 2)]`',
          },
        },
        { figure: 'BootstrapView', caption: 'Two thousand resamples of the lights’ prices: their means or medians, and the middle 95%.' },
        {
          predict: {
            prompt: `For the mean price of the ${LIGHTS.length} lights, the formula gives a standard error of ${money(M.standardError(LIGHTS))}. The standard deviation of 2,000 bootstrapped means (seed 41), to 4 decimals?`,
            answer: S.std(BOOT_MEANS), compute: () => S.std(M.bootstrap(LIGHTS, 'mean', 2000, 41)), tolerance: 5e-5,
            explain: `${S.std(BOOT_MEANS).toFixed(4)} against the formula’s ${M.standardError(LIGHTS).toFixed(4)}: the bootstrap rediscovers σ/√n without being told it.`,
          },
        },
        {
          predict: {
            prompt: `The lights’ median price is ${money(S.median(LIGHTS))}. What is the lower end of its bootstrap 95% interval (2,000 resamples, seed 41)?`,
            answer: MEDIAN_CI[0], compute: () => M.percentileInterval(M.bootstrap(LIGHTS, 'median', 2000, 41))[0], tolerance: 0.005,
            explain: `${money(MEDIAN_CI[0])} to ${money(MEDIAN_CI[1])}. A median can only be one of the prices (or halfway between two), so its bootstrap distribution is lumpy, and its interval falls on prices.`,
          },
        },
        {
          choice: {
            prompt: 'What can’t the bootstrap fix?',
            options: [
              { text: 'A statistic with no formula for its standard error.', why: 'That is exactly what it is for.' },
              { text: 'A sample that is unlike the population: too small to hold the rare values, or drawn with a bias. Resampling it only repeats what it holds.', why: 'Yes. Five prices without a bike resample into more prices without a bike: the bootstrap can’t see what the sample never saw (lesson 6.6’s failure, again).' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'reservoir-sampling', number: '6.8', title: 'Reservoir sampling',
      goal: 'Keep a fair random sample of a stream whose length is unknown, and prove by induction that every item ends up in it with chance k/n.',
      builds: ['bootstrap'],
      blocks: [
        { h: 'A stream you see once' },
        { md: `The shop's website logs every visit: millions a year, arriving one at a time. To keep a random sample of 1,000 for a survey, the shop can't wait for the year to end, and can't store everything. It needs a method that, at **every** moment, holds a fair sample of what has arrived so far, reading each item once. **Reservoir sampling** (Waterman; Knuth's *The Art of Computer Programming*, 1969) does it in a few lines.` },
        {
          code: {
            file: 'samples.py', fn: 'reservoir', notes: [
              ['if i <= k:', ['The first k items fill the reservoir.']],
              ['j = rng.below(i)', ['A random number from 0 to i − 1: it is below k with chance k/i.']],
              ['kept[j] = item', ['If so, the new item takes a random kept item’s place: the j-th, which is itself random.']],
            ],
          },
        },
        {
          derive: {
            title: 'Every item has the same chance, k/n',
            intro: 'Follow item number $i$ (with $i > k$) from its arrival to the end of a stream of $n$.',
            steps: [
              { prompt: 'When it arrives, it is kept with chance (in terms of $k$ and $i$):', answer: 'k/i', vars: { k: [1, 10], i: [11, 50] }, why: '`j = rng.below(i)` is below $k$ with chance $k/i$.' },
              { prompt: 'At a later step $j$, the new item is kept with chance $k/j$ and, if so, replaces our item with chance $1/k$. Our item survives step $j$ with chance (in terms of $j$):', answer: '(j-1)/j', vars: { j: [2, 100] }, why: '$1 - \\frac{k}{j} \\cdot \\frac1k = 1 - \\frac1j = \\frac{j-1}{j}$.' },
              { prompt: 'Multiply: $\\frac{k}{i} \\cdot \\frac{i}{i+1} \\cdot \\frac{i+1}{i+2} \\cdots \\frac{n-1}{n}$. Each top cancels the bottom before it. The product, in terms of $k$ and $n$?', answer: 'k/n', vars: { k: [1, 10], n: [11, 100] }, why: 'The same for every $i > k$. The first $k$ items start in the reservoir and face the same survival steps from $k+1$ on: $1 \\cdot \\frac{k}{k+1} \\cdots \\frac{n-1}{n} = \\frac kn$ too.' },
            ],
          },
        },
        {
          write: {
            file: 'samples.py', fn: 'reservoir', prelude: WITH_RNG,
            prompt: 'Write `reservoir(stream, k, seed)`: number the items from 1; keep the first `k`; after that, draw `j = rng.below(i)` and, if `j < k`, put the item at `kept[j]`.',
            starter: 'def reservoir(stream, k, seed):\n    rng = Rng(seed)\n    kept = []\n    # one pass over the stream\n    return kept\n',
            cases: cases(M.reservoir, [[Array.from({ length: 20 }, (_, i) => i + 1), 5, 61], [['a', 'b'], 5, 1], [IDS.slice(0, 50), 3, 9]]),
            hint: '`for i, item in enumerate(stream, start=1):` if `i <= k`, append; else `j = rng.below(i)` and `if j < k: kept[j] = item`.',
          },
        },
        { python: { program: 'reservoir', label: 'Step through reservoir in real Python' } },
        { figure: 'ReservoirRun', caption: 'A stream of 20 orders arrives one at a time into a reservoir of 5. Step through it; the bars show how often each item was kept in 1,000 runs.' },
        {
          predict: {
            prompt: 'Run a reservoir of 5 over a stream of 20 items, 4,000 times. How often does the **last** item, number 20, end up kept (to 3 decimals)?',
            answer: SHARE_LAST, compute: () => M.reservoirShare(20, 5, 20, 4000, 62), tolerance: 5e-4,
            explain: `${SHARE_LAST.toFixed(3)}, against 5/20 = 0.25. The first item was kept ${SHARE_FIRST.toFixed(3)} of the time: the first and the last have the same chance, as the derivation says, though one had to survive 15 steps and the other arrived at the end.`,
          },
        },
      ],
    },

    {
      id: 'strata-bias', number: '6.9', title: 'Strata and bias',
      goal: 'Draw a stratified sample, derive why stratifying by item steadies the mean price (the law of total variance), and recognise a sample biased by how it was drawn.',
      builds: ['reservoir-sampling'],
      blocks: [
        { h: 'Sampling within groups' },
        { md: `A simple random sample of 40 orders might hold no bike, or five: and with bikes at £450 and everything else under £50, that alone moves the sample mean by a lot. A **stratified** sample fixes the groups' shares in advance: split the population into **strata** (here, items), and sample each in proportion to its size. Only the variation **within** items is left to chance.` },
        {
          code: {
            file: 'samples.py', fn: 'stratified_sample', notes: [
              ['for members in group_by(rows, key).values():', ['Split (lesson 2.7).']],
              ['take = math.floor(k * len(members) / len(rows) + 0.5)', ['Each group’s fair share of the k, rounded (halves up): the total can be off by one or two.']],
              ['j = i + rng.below(len(items) - i)', ['Then a partial shuffle within the group, as in `sample_without`.']],
            ],
          },
        },
        {
          write: {
            file: 'samples.py', fn: 'stratified_sample', also: [['summary.py', 'group_by']], prelude: WITH_RNG,
            prompt: 'Write `stratified_sample(rows, key, k, seed)`: one `Rng(seed)`; for each group of `group_by(rows, key)`, in order, take `math.floor(k * len(group) / len(rows) + 0.5)` rows by a partial shuffle of a copy of the group, and add them to the sample.',
            starter: 'def stratified_sample(rows, key, k, seed):\n    rng = Rng(seed)\n    out = []\n    # each group in proportion to its size\n    return out\n',
            cases: cases(M.stratifiedSample, [[[{ g: 'a', v: 1 }, { g: 'a', v: 2 }, { g: 'b', v: 3 }, { g: 'b', v: 4 }], 'g', 2, 3], [PRICED.map(r => ({ item: r.item, price: r.price })).slice(0, 120), 'item', 20, 71]]),
            hint: 'For each group: `take = math.floor(k * len(members) / len(rows) + 0.5)`, `items = list(members)`, the partial shuffle for `i in range(take)`, then `out.extend(items[:take])`.',
          },
        },
        {
          derive: {
            title: 'The law of total variance',
            intro: `The price variance of all ${POP.length} orders splits into a part **within** items and a part **between** them. With $w_g$ the share of group $g$: $\\sigma^2 = \\sum_g w_g \\sigma_g^2 + \\sum_g w_g (\\mu_g - \\mu)^2$.`,
            steps: [
              { prompt: 'The population variance of the prices (dividing by n), to the nearest whole number?', number: SIGMA ** 2, compute: () => S.variance(POP, false), tolerance: 0.5, why: `${(SIGMA ** 2).toFixed(1)} £².` },
              { prompt: 'Within items: each item’s variance, weighted by its share. To 1 decimal?', number: WITHIN, compute: () => WITHIN, tolerance: 0.05, why: `${WITHIN.toFixed(1)} £²: prices vary little within an item (90% to 110% of its base).` },
              { prompt: 'Between items: the items’ means’ spread around μ, weighted. To the nearest whole number?', number: BETWEEN, compute: () => BETWEEN, tolerance: 0.5, why: `${BETWEEN.toFixed(1)} £², and ${WITHIN.toFixed(1)} + ${BETWEEN.toFixed(1)} = ${(WITHIN + BETWEEN).toFixed(1)}: the whole. ${pct(BETWEEN / (SIGMA ** 2))} of the variance is **which item** an order is for.` },
              { prompt: 'A proportional stratified sample removes the between part from the chance. Roughly, its standard error over a simple sample’s is $\\sqrt{\\text{within}/\\text{total}}$. To 3 decimals?', number: Math.sqrt(WITHIN / SIGMA ** 2), compute: () => Math.sqrt(WITHIN / S.variance(POP, false)), tolerance: 5e-4, why: `${Math.sqrt(WITHIN / SIGMA ** 2).toFixed(3)}: the same sample size, a small fraction of the error.` },
            ],
          },
        },
        { figure: 'StrataLab', caption: 'Four hundred samples of 40 orders, simple and stratified by item: the spread of their mean prices. And a sample of web orders only.' },
        {
          predict: {
            prompt: 'Measured: over 400 samples of 40 (seed 71), the standard deviation of the mean price for stratified samples divided by that for simple random samples (to 2 decimals)?',
            answer: SPREAD_STRATA / SPREAD_SIMPLE, compute: () => { const [a, b] = M.spreadOfMeans(PRICED, 'price', 'item', 40, 400, 71); return b / a }, tolerance: 0.005,
            explain: `${(SPREAD_STRATA / SPREAD_SIMPLE).toFixed(3)}: ${money(SPREAD_STRATA)} against ${money(SPREAD_SIMPLE)}, close to the derivation’s ${Math.sqrt(WITHIN / SIGMA ** 2).toFixed(3)}. The same 40 orders, about a fifteenth of the error. (The derivation is approximate: each item’s share is rounded, so a bike share of 40 × ${(BY_ITEM.get('Bike').length / POP.length).toFixed(3)} = ${(40 * BY_ITEM.get('Bike').length / POP.length).toFixed(2)} becomes ${Math.floor(40 * BY_ITEM.get('Bike').length / POP.length + 0.5)} bikes.)`,
          },
        },
        { h: 'Bias: how the sample was drawn' },
        { md: `More data doesn't fix a sample drawn the wrong way. Suppose the shop surveys only its **web** customers, because they are easy to email. Their mean price is ${money(WEB_MEAN)}, against ${money(MU)} for all orders. A sample of a million web customers would pin down ${money(WEB_MEAN)} very precisely: precisely wrong. The error comes from **who could be chosen**, not from chance, so no standard error measures it.

Common sources: who answers (people with strong views), who is easy to reach (web customers, people at home at noon), who survived (lesson 5.10's selection), and when you sampled (a week in December).` },
        {
          choice: {
            prompt: 'A survey of 5,000 people who chose to reply to an email finds 70% happy with the shop. A random sample of 200 customers finds 55%. Which is the better estimate?',
            options: [
              { text: 'The 5,000: its standard error is much smaller.', why: 'Its standard error measures chance only. The people who choose to reply differ from those who don’t, and that bias doesn’t shrink with size.' },
              { text: 'The 200: a random sample’s error is chance, which the standard error measures; a self-selected sample’s is bias, which nothing measures.', why: 'Yes. Size buys precision; only the method of drawing buys accuracy.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'every-number-has-error', number: '6.10', title: 'Project: every number has an error',
      goal: 'Put a bootstrap interval round numbers from Parts 2 to 5, and decide which of the deliveries’ differences could be chance.',
      builds: ['strata-bias'],
      blocks: [
        { h: 'Going back over the numbers' },
        { md: `Every number in Parts 1 to 5 came from one year of data, one sample of what the shop could have seen. Another year would give other numbers. This project goes back and puts an interval round some of them, with the one method that works for all of them: the bootstrap.` },
        { figure: 'ErrorBars', caption: 'Numbers from earlier lessons, each with its bootstrap 95% interval (2,000 resamples).' },
        {
          md: `- The lights' mean price (2.2): **${money(S.mean(LIGHTS))}**, 95% interval ${money(M.percentileInterval(BOOT_MEANS)[0])} to ${money(M.percentileInterval(BOOT_MEANS)[1])}.
- The correlation of temperature and riders (5.2): **${P.correlation(DAYS.map(r => r.high_c), DAYS.map(r => r.riders)).toFixed(3)}**, interval ${R_CI[0].toFixed(3)} to ${R_CI[1].toFixed(3)}. Resampled as **pairs** of columns: a day's temperature stays with its riders.
- The growth of visits per degree (5.6): **${pct(P.growthPerUnit(QUIET.map(r => r.high_c), QUIET.map(r => r.visits)), 2)}**, interval ${pct(GROWTH_CI[0], 2)} to ${pct(GROWTH_CI[1], 2)}: the generator's true ${pct(Math.exp(0.05) - 1, 2)} is inside.`,
        },
        { h: 'The couriers again' },
        { md: `Lesson 5.9 found Northern better than Swift in both groups. But near towns, Northern had only 14 parcels. Is a 2-point edge out of 14 parcels evidence of anything? Resample each courier's parcels from its own, and look at the difference each time.` },
        {
          code: { file: 'samples.py', fn: 'bootstrap_difference', notes: [['ra = [a[rng.below(len(a))] for _ in range(len(a))]', ['Each group resampled from itself, at its own size: the 14 stay 14, the 65 stay 65.']]] },
        },
        {
          write: {
            file: 'samples.py', fn: 'bootstrap_difference', also: MEANS, prelude: WITH_RNG,
            prompt: 'Write `bootstrap_difference(a, b, repeats, seed)`: one `Rng(seed)`; each repeat, resample `a` from itself (`len(a)` draws), then `b` from itself, and keep `mean(ra) - mean(rb)`.',
            starter: 'def bootstrap_difference(a, b, repeats, seed):\n    rng = Rng(seed)\n    out = []\n    # resample each group from itself\n    return out\n',
            cases: cases(M.bootstrapDifference, [[[1, 1, 0], [0, 0, 1, 1], 4, 3], [onTime('Northern', false), onTime('Swift', false), 20, 81]]),
            hint: '`ra = [a[rng.below(len(a))] for _ in range(len(a))]`, the same for `rb`, then `out.append(mean(ra) - mean(rb))`.',
          },
        },
        {
          predict: {
            prompt: 'Near towns: Northern minus Swift, 2,000 bootstrap differences (seed 81). The lower end of the 95% interval, in percentage points (to 1 decimal)?',
            answer: 100 * M.percentileInterval(NEAR_DIFF)[0], compute: () => 100 * M.percentileInterval(M.bootstrapDifference(onTime('Northern', false), onTime('Swift', false), 2000, 81))[0], tolerance: 0.05,
            explain: `${(100 * M.percentileInterval(NEAR_DIFF)[0]).toFixed(1)} to ${(100 * M.percentileInterval(NEAR_DIFF)[1]).toFixed(1)} points: the interval holds 0 comfortably. With these near-town parcels alone, Northern’s edge could be luck. In the far towns: ${(100 * M.percentileInterval(FAR_DIFF)[0]).toFixed(1)} to ${(100 * M.percentileInterval(FAR_DIFF)[1]).toFixed(1)} points, nowhere near 0. The generator’s truth (97 against 85 near) says the near edge is real, but this much data can’t show it: honest analysis reports both.`,
          },
        },
        {
          choice: {
            prompt: 'What should the report to the manager say about the couriers?',
            options: [
              { text: 'Northern is better everywhere; switch all parcels to Northern.', why: 'The far towns support that strongly. The near towns don’t, yet: 14 parcels can’t tell a 2-point difference from chance.' },
              { text: `Northern is clearly better for far towns (by ${Math.round(100 * M.percentileInterval(FAR_DIFF)[0])} to ${Math.round(100 * M.percentileInterval(FAR_DIFF)[1])} points); for near towns the data can’t tell them apart yet. Send far parcels with Northern, and keep counting the near ones.`, why: 'Yes: the decision the data supports, with the uncertainty said out loud. Part 7 asks how many parcels it would take to tell.' },
            ],
            answer: 1,
          },
        },
        { note: 'Part 7 turns the question round: not “how big is the interval?” but “could this difference be nothing at all?”: permutation tests, p-values, and an A/B test on the shop’s website.', kind: 'key' },
      ],
    },
  ],
}
