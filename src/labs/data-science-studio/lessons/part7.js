// Part 7: is the difference real? Every test is run where the generator says what is true: web and shop
// customers pay the same, rain never changes the visits, Northern really is better near home, and the
// new home page really lifts clicks by 2 in 100. The permutation test first, then tests from a formula
// (the normal, t and chi-squared areas worked out by hand), then what errors cost: power, many tests,
// peeking. The project reads the website's A/B test (python/significance.py, engine/significance.js).
import * as T from '../engine/tables.js'
import * as C from '../engine/cleaning.js'
import * as S from '../engine/summary.js'
import * as G from '../engine/charts.js'
import * as P from '../engine/patterns.js'
import * as M from '../engine/samples.js'
import * as Q from '../engine/significance.js'
import { ORDERS_CSV, CATALOGUE_CSV, DAYS_CSV, DELIVERIES_CSV, TRIAL_CSV, FAR_TOWNS, TOWNS, makeOrders, Rng } from '../engine/data.js'
import { evaluateFormula } from '../engine/sheet.js'
import { WITH_RNG } from './given.js'

const cases = (fn, inputs) => inputs.map(args => ({ args, expected: fn(...args) }))
const sheet = formula => evaluateFormula('orders', formula).value
const pct = (x, d = 1) => `${(100 * x).toFixed(d)}%`
const money = x => `£${x.toFixed(2)}`
const MEANS = [['summary.py', 'total'], ['summary.py', 'mean']]
const SPREAD = [...MEANS, ['summary.py', 'variance'], ['summary.py', 'std']]
const near = (a, b, tol = 1e-6) => Math.abs(a - b) < tol

const ROWS = T.readCsv(ORDERS_CSV())
const LIST = Object.fromEntries(T.readCsv(CATALOGUE_CSV()).map(r => [r.item, T.toPence(r.list_price)]))
const CLEAN = C.cleanOrders(ROWS, LIST)
const PRICED = CLEAN.filter(r => r.price !== null).map(r => ({ ...r, price: r.price / 100 }))
const LIGHT = 'Lights, front and back'
const priced = (item, channel, town) => PRICED.filter(r => r.item === item && r.channel === channel && (!town || r.town === town)).map(r => r.price)
const LW = priced(LIGHT, 'web'), LS = priced(LIGHT, 'shop'), OBS = S.mean(LW) - S.mean(LS)
const LIGHTS = PRICED.filter(r => r.item === LIGHT).map(r => r.price), POP = PRICED.map(r => r.price)

// 7.1: the lights, and the couriers in the far towns.
const DIFFS = Q.permutationDiffs(LW, LS, 2000, 3), P_LIGHTS = Q.permutationP(DIFFS, OBS)
const TOWN = Object.fromEntries(CLEAN.map(r => [r.order_id, r.town]))
const DELIVERIES = T.readCsv(DELIVERIES_CSV()).map(r => ({ ...r, far: FAR_TOWNS.includes(TOWN[r.order_id]) }))
const onTime = (courier, far) => DELIVERIES.filter(r => r.courier === courier && r.far === far).map(r => (r.on_time === 'yes' ? 1 : 0))
const [NF, SF, NN, SN] = [onTime('Northern', true), onTime('Swift', true), onTime('Northern', false), onTime('Swift', false)]
const P_FAR = Q.permutationP(Q.permutationDiffs(NF, SF, 2000, 7), S.mean(NF) - S.mean(SF))
const P_NEAR = Q.permutationP(Q.permutationDiffs(NN, SN, 2000, 7), S.mean(NN) - S.mean(SN))
const WAYS = M.combBig(LW.length + LS.length, LW.length)
// 7.2
const Z_FAR = Q.twoProportionZ(S.total(SF), SF.length, S.total(NF), NF.length)
// 7.3: A/A tests, and rain against visits.
const NULL_P = Q.simulatedPvalues(500, 0.2, 0.2, 2000, 5), ALT_P = Q.simulatedPvalues(500, 0.2, 0.25, 2000, 6)
const share = (list, test) => list.filter(test).length / list.length
const DAYS = P.numberDays(T.readCsv(DAYS_CSV())), QUIET = DAYS.filter(r => r.visits < 9000)
const WET = QUIET.filter(r => r.rain_mm > 0), DRY = QUIET.filter(r => r.rain_mm === 0)
const [WETV, DRYV] = [WET.map(r => r.visits), DRY.map(r => r.visits)]
const T_RAIN = Q.welchT(WETV, DRYV), P_RAIN = Q.tTwoSided(...T_RAIN)
const COLDER = S.mean(DRY.map(r => r.high_c)) - S.mean(WET.map(r => r.high_c))
// 7.4
const WEEKEND = DAYS.map(r => (M.dayOfYear(r.date) + 2) % 7 >= 5)
const WE = DAYS.filter((_, k) => WEEKEND[k]).map(r => r.riders), WD = DAYS.filter((_, k) => !WEEKEND[k]).map(r => r.riders)
const T_WEEKEND = Q.welchT(WE, WD), T_LIGHTS = Q.welchT(LW, LS)
// 7.5
const T4 = Q.tCritical(4)
const COVER_Z5 = Q.intervalCoverage(LIGHTS, 5, 2000, 31, 1.96), COVER_T5 = Q.intervalCoverage(LIGHTS, 5, 2000, 31, T4)
const COVER_Z3 = Q.intervalCoverage(LIGHTS, 3, 2000, 31, 1.96), COVER_T3 = Q.intervalCoverage(LIGHTS, 3, 2000, 31, Q.tCritical(2))
const COVER_POP_T5 = Q.intervalCoverage(POP, 5, 2000, 31, T4)
// 7.6
const N_NEAR = Q.sampleSize(0.85, 0.97), POWER_14 = Q.simulatedPower(14, 0.85, 0.97, 2000, 5), POWER_86 = Q.simulatedPower(86, 0.85, 0.97, 2000, 6)
// 7.7
const count = (courier, on) => DELIVERIES.filter(r => r.courier === courier && r.on_time === on).length
const COURIER_ON = [[count('Northern', 'yes'), count('Northern', 'no')], [count('Swift', 'yes'), count('Swift', 'no')]]
const CHI_ON = Q.chiSquared(COURIER_ON), EXPECTED_NY = ((COURIER_ON[0][0] + COURIER_ON[0][1]) * (COURIER_ON[0][0] + COURIER_ON[1][0])) / 162
const COURIER_FAR = [['Northern', 'Swift'].map(c => DELIVERIES.filter(r => r.courier === c && r.far).length), ['Northern', 'Swift'].map(c => DELIVERIES.filter(r => r.courier === c && !r.far).length)]
const CHI_FAR = Q.chiSquared(COURIER_FAR)
const TOWN_CHANNEL = TOWNS.map(t => ['web', 'shop'].map(ch => CLEAN.filter(r => r.town === t && r.channel === ch).length)), CHI_TOWN = Q.chiSquared(TOWN_CHANNEL)
const PER_DAY = M.ordersPerDay(CLEAN.map(r => r.date)), DISP = Q.dispersion(PER_DAY), LOW_TAIL = 1 - Q.chi2Tail(...DISP)
// Other years from the same generator: how often is a year's dispersion as low as this one's?
// Each year's seed is drawn from one generator (never seeds 1, 2, 3…: lesson 3.6).
function lowYears(years, seed) {
  const rng = new Rng(seed)
  let low = 0
  for (let y = 0; y < years; y++) if (Q.dispersion(M.ordersPerDay(makeOrders(400, rng.below(2 ** 31)).slice(0, 400).map(r => r[1])))[0] <= DISP[0]) low++
  return low / years
}
const LOW_YEARS = lowYears(300, 12)
// 7.8: every item in every town, web against shop: the truth is no difference anywhere.
const ITEM_TOWN = []
for (const item of [...new Set(PRICED.map(r => r.item))]) for (const town of TOWNS) {
  const a = priced(item, 'web', town), b = priced(item, 'shop', town)
  if (a.length >= 2 && b.length >= 2) ITEM_TOWN.push({ item, town, p: Q.tTwoSided(...Q.welchT(a, b)) })
}
const ITEM_P = ITEM_TOWN.map(t => t.p), SMALL_P = ITEM_TOWN.filter(t => t.p < 0.05)
const MANY = Q.manyTests(100, 10, 30, 0.8, 11)
const tally = flags => ({ found: flags.filter((f, i) => f && i < 10).length, wrong: flags.filter((f, i) => f && i >= 10).length })
const [RAW, BONF, BH] = [tally(MANY.map(p => p < 0.05)), tally(Q.bonferroni(MANY)), tally(Q.benjaminiHochberg(MANY))]
// 7.9
const [PEEK_EVER, PEEK_LAST] = Q.aaPeeking(Array(28).fill(100), 0.2, 400, 9)
// 7.10: the trial.
const TRIAL = T.readCsv(TRIAL_CSV())
const sumOf = (page, k) => S.total(TRIAL.filter(r => r.page === page).map(r => Number(r[k])))
const [NA, CA, NB, CB] = [sumOf('A', 'visitors'), sumOf('A', 'clicks'), sumOf('B', 'visitors'), sumOf('B', 'clicks')]
const Z_TRIAL = Q.twoProportionZ(CA, NA, CB, NB), P_TRIAL = Q.zPValue(Z_TRIAL), LIFT = Q.liftInterval(CA, NA, CB, NB)
const N_TRIAL = Q.sampleSize(0.2, 0.22), POWER_TRIAL = Q.simulatedPower(Math.ceil(N_TRIAL), 0.2, 0.22, 400, 7)
const JUNE = DAYS.slice(152, 152 + 28), JUNE_VISITS = S.total(JUNE.map(r => r.visits))
const TRIAL_DAYS = Array.from({ length: 28 }, (_, k) => [TRIAL[2 * k], TRIAL[2 * k + 1]].flatMap(r => [Number(r.visitors), Number(r.clicks)]))
const RUNNING = Q.runningZ(TRIAL_DAYS), FIRST_CROSS = RUNNING.findIndex(z => Math.abs(z) > 1.96) + 1
const DAILY = TRIAL_DAYS.map(([av, ac, bv, bc], k) => ({ day: k + 1, av, ac, bv, bc }))

export const PART7 = {
  id: 'part7', title: 'Part 7 · Is the difference real?', lessons: [
    {
      id: 'could-it-be-chance', number: '7.1', title: 'Could it be chance?',
      goal: 'State a null hypothesis, test it by shuffling the labels, and read the permutation p-value: how often chance alone makes a difference this big.',
      builds: ['every-number-has-error'],
      blocks: [
        { h: 'A difference in the data' },
        { md: `Web customers paid **${money(S.mean(LW))}** for the lights on average (${LW.length} orders); shop customers **${money(S.mean(LS))}** (${LS.length} orders). The web paid ${money(OBS)} more. Is the web really dearer, or is ${money(OBS)} the kind of gap two random groups of lights orders would show anyway?

Part 6 asked *how big is the uncertainty?* This part asks a sharper question: **could the difference be nothing at all?** Write down the "nothing" explicitly. The **null hypothesis**: the channel makes no difference to what people paid; the labels "web" and "shop" are just tags on prices that would have been the same either way.` },
        { h: 'Shuffling the labels' },
        { md: `If the null is true, the tags carry no information, so any other assignment of the same ${LW.length} "web" tags to the same ${LW.length + LS.length} prices was just as likely. Shuffle the prices, call the first ${LW.length} "web", and work out the difference again. Do it thousands of times: that is what differences look like **when the null is true**. Then see where the real one falls.

This is the **permutation test** (Fisher, 1935). It assumes nothing about the shape of the prices: no bell curve, no formula. Only that, under the null, the labels could have been swapped.` },
        { figure: 'ShuffleTest', caption: 'The lights’ prices, shuffled: each shuffle’s difference joins the histogram. The red lines are the real difference, on both sides.' },
        {
          derive: {
            title: 'Why not try every split?',
            intro: `${LW.length + LS.length} prices, ${LW.length} of them labelled web.`,
            steps: [
              { prompt: 'Start small: 4 prices, 2 of them labelled web. In how many ways can the 2 web labels be placed (lesson 6.2’s $\\binom{n}{k}$)?', number: 6, compute: () => M.comb(4, 2), why: '$\\binom42 = 6$: the web pair is {1, 2}, {1, 3}, {1, 4}, {2, 3}, {2, 4} or {3, 4}.' },
              { prompt: `For the lights, $\\binom{${LW.length + LS.length}}{${LW.length}}$: how many digits does it have?`, number: String(WAYS).length, compute: () => String(M.combBig(LW.length + LS.length, LW.length)).length, why: `It is about $${Number(WAYS).toExponential(2).replace('e+', ' \\times 10^{')}}$: listing them is out of the question. 2,000 random shuffles estimate the share that are extreme, as a poll estimates a vote.` },
            ],
          },
        },
        {
          code: {
            file: 'significance.py', fn: 'permutation_diffs', notes: [
              ['pooled = list(a) + list(b)', ['Under the null, all the prices are one pool.']],
              ['j = i + rng.below(len(pooled) - i)', ['The partial shuffle of lesson 6.1: only the first `k` places need choosing, and they are a fair random set of `k` whatever order the pool was left in by the last shuffle.']],
              ['out.append(mean(pooled[:k]) - mean(pooled[k:]))', ['The difference this shuffle gives: “web” minus “shop” for made-up labels.']],
            ],
          },
        },
        {
          write: {
            file: 'significance.py', fn: 'permutation_diffs', also: MEANS, prelude: WITH_RNG,
            prompt: 'Write `permutation_diffs(a, b, repeats, seed)`: pool the two lists; `repeats` times, shuffle the first `len(a)` places (a partial shuffle with one `Rng(seed)`, as in `sample_without`) and keep `mean(pooled[:k]) - mean(pooled[k:])`.',
            starter: 'def permutation_diffs(a, b, repeats, seed):\n    rng = Rng(seed)\n    pooled = list(a) + list(b)\n    k = len(a)\n    out = []\n    # shuffle, split, compare: repeats times\n    return out\n',
            cases: cases(Q.permutationDiffs, [[[1, 2, 3], [4, 5], 4, 1], [LW.slice(0, 10), LS.slice(0, 8), 5, 3]]),
            hint: '`for _ in range(repeats):` then `for i in range(k): j = i + rng.below(len(pooled) - i)` and swap, then `out.append(mean(pooled[:k]) - mean(pooled[k:]))`. Don’t reset `pooled`: each shuffle starts from the last.',
          },
        },
        { python: { program: 'permutation_diffs', label: 'Step through permutation_diffs in real Python' } },
        { h: 'The p-value' },
        { md: `The **p-value** is the share of shuffles that came out **at least as far from 0** as the real difference, on either side: how often chance alone, with the null true, does this well or better. One detail: the real split is itself one of the possible shuffles, so count it too, once on top and once below. That keeps the p-value from ever being exactly 0 (2,000 shuffles can't prove that something never happens).

$$p = \\frac{1 + \\#\\{\\,|d_i| \\ge |d_{\\text{obs}}|\\,\\}}{1 + R}$$` },
        {
          code: { file: 'significance.py', fn: 'permutation_p', notes: [['if abs(d) >= abs(observed) - 1e-12:', ['Both tails: a shuffle with the shop dearer by as much is just as surprising. The `1e-12` lets an equal difference count as equal: the same prices in another order can add up to a float that differs in the last digit.']]] },
        },
        {
          write: {
            file: 'significance.py', fn: 'permutation_p',
            prompt: 'Write `permutation_p(diffs, observed)`: start the count at 1, add 1 for each `d` with `abs(d) >= abs(observed) - 1e-12`, and divide by `len(diffs) + 1`.',
            starter: 'def permutation_p(diffs, observed):\n    hits = 0\n    return hits / len(diffs)\n',
            cases: cases(Q.permutationP, [[[0.5, -0.2, 0.1], 0.2], [[0.3, -0.3, 0.1, 0], 0.3], [DIFFS.slice(0, 200), OBS]]),
            hint: '`hits = 1`, then `for d in diffs: if abs(d) >= abs(observed) - 1e-12: hits += 1`, and `return hits / (len(diffs) + 1)`.',
          },
        },
        {
          predict: {
            prompt: `Shuffle the lights’ prices 2,000 times (seed 3). What is the permutation p-value of the real difference, ${money(OBS)} (to 3 decimals)?`,
            answer: P_LIGHTS, compute: () => Q.permutationP(Q.permutationDiffs(LW, LS, 2000, 3), OBS), tolerance: 5e-4,
            explain: `${P_LIGHTS.toFixed(3)}: about ${Math.round(100 * P_LIGHTS)} shuffles in 100 give a gap at least this big. A ${money(OBS)} difference is exactly what random groups of lights orders show: the data give no reason to doubt the null. And here we know the null is **true**: the generator draws every price from 90% to 110% of the list price, whatever the channel.`,
          },
        },
        {
          chart: {
            prompt: `The 2,000 shuffled differences are binned for you. Mark the real difference, ${OBS.toFixed(4)}, with two lines of class \`observed\` (at +observed and −observed, from y = 20 to y = 270), and write the p-value, to 3 decimals, in a \`text\` of class \`p\`. Work it out from \`data\` as \`permutation_p\` does.`,
            data: DIFFS,
            starter: `const observed = ${OBS.toFixed(4)}
const x = d3.scaleLinear().domain([-2, 2]).range([40, 460])
const bins = d3.bin().domain([-2, 2]).thresholds(d3.range(-2, 2, 0.1))(data)
const y = d3.scaleLinear().domain([0, d3.max(bins, b => b.length)]).range([270, 20])
svg.selectAll('rect').data(bins).join('rect')
  .attr('x', b => x(b.x0) + 1).attr('width', b => x(b.x1) - x(b.x0) - 2)
  .attr('y', b => y(b.length)).attr('height', b => y(0) - y(b.length)).attr('fill', 'steelblue')
// the two lines, and the p-value
svg.append('g').attr('transform', 'translate(0,270)').call(d3.axisBottom(x))
`,
            solution: `const observed = ${OBS.toFixed(4)}
const x = d3.scaleLinear().domain([-2, 2]).range([40, 460])
const bins = d3.bin().domain([-2, 2]).thresholds(d3.range(-2, 2, 0.1))(data)
const y = d3.scaleLinear().domain([0, d3.max(bins, b => b.length)]).range([270, 20])
svg.selectAll('rect').data(bins).join('rect')
  .attr('x', b => x(b.x0) + 1).attr('width', b => x(b.x1) - x(b.x0) - 2)
  .attr('y', b => y(b.length)).attr('height', b => y(0) - y(b.length)).attr('fill', 'steelblue')
svg.selectAll('line.observed').data([observed, -observed]).join('line').attr('class', 'observed')
  .attr('x1', d => x(d)).attr('x2', d => x(d)).attr('y1', 20).attr('y2', 270)
  .attr('stroke', '#b0413e').attr('stroke-width', 2)
const hits = data.filter(d => Math.abs(d) >= Math.abs(observed) - 1e-12).length
svg.append('text').attr('class', 'p').attr('x', 460).attr('y', 30).attr('text-anchor', 'end')
  .text(((hits + 1) / (data.length + 1)).toFixed(3))
svg.append('g').attr('transform', 'translate(0,270)').call(d3.axisBottom(x))
`,
            checks: [{ select: 'line.observed', attrs: ['x1', 'x2', 'y1', 'y2'] }, { select: 'text.p', attrs: ['#text'] }],
            verify: marks => marks['text.p'][0]['#text'] === Q.permutationP(DIFFS, Number(OBS.toFixed(4))).toFixed(3) && near(marks['line.observed'][0].x1, G.linearScale(-2, 2, 40, 460, Number(OBS.toFixed(4))), 1e-9),
            hint: '`svg.selectAll(\'line.observed\').data([observed, -observed]).join(\'line\').attr(\'class\', \'observed\')`, with `x1` and `x2` both `x(d)`. For the text: count `data.filter(d => Math.abs(d) >= Math.abs(observed) - 1e-12)`, add 1, divide by `data.length + 1`.',
            explain: 'The text is your `permutation_p`, worked out in JavaScript on the same 2,000 shuffles: the tests check it against the Python’s. The lines fall in the thick of the histogram: an ordinary difference.',
          },
        },
        { h: 'A difference that isn’t ordinary' },
        { md: `Lesson 5.9 found Northern on time more often than Swift in the far towns: ${NF.reduce((s, x) => s + x, 0)} of ${NF.length} parcels against ${SF.reduce((s, x) => s + x, 0)} of ${SF.length}. The same test, on 0s and 1s (on time or not): shuffle which parcels are "Northern".` },
        {
          predict: {
            prompt: 'The far towns: Northern minus Swift, 2,000 shuffles (seed 7). The p-value (to 3 decimals)?',
            answer: P_FAR, compute: () => Q.permutationP(Q.permutationDiffs(NF, SF, 2000, 7), S.mean(NF) - S.mean(SF)), tolerance: 5e-4,
            explain: `${P_FAR.toFixed(3)}: only about ${Math.round(2000 * P_FAR)} shuffles in 2,000 were as extreme. Chance alone rarely does this, so we have evidence against the null. In the near towns, the 2-point edge out of ${NN.length} parcels has p = ${P_NEAR.toFixed(3)}: no evidence at all, though the generator says Northern is better there too (97 against 85 in 100). Lesson 7.6 asks why the test missed it.`,
          },
        },
        {
          choice: {
            prompt: `p = ${P_LIGHTS.toFixed(2)} for the lights. What may we conclude?`,
            options: [
              { text: 'The null is true: web and shop customers pay the same.', why: 'A large p-value says the data are what the null would produce; it doesn’t prove the null. A small real difference, too small for 85 orders to show, would give a large p-value too.' },
              { text: 'The data give no evidence of a difference; a difference too small to see here can’t be ruled out.', why: 'Yes. “Not shown” isn’t “shown not”. (Here we happen to know the truth: no difference.)' },
              { text: `There is a ${Math.round(100 * P_LIGHTS)}% chance the null is true.`, why: 'The p-value is computed **assuming** the null is true; it can’t also be the chance that it is. Lesson 7.3 takes this apart.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'test-from-formula', number: '7.2', title: 'A test from a formula',
      goal: 'Work out the normal curve’s area by Simpson’s rule, derive the z test for two proportions, and find the normal’s quantiles by halving an interval.',
      builds: ['could-it-be-chance'],
      blocks: [
        { h: 'Areas without a computer’s help' },
        { md: `Shuffling needs a computer. Before computers, statisticians used a shortcut: if the difference, divided by its standard error, is close to a standard normal value when the null is true (the central limit theorem of lesson 6.5), then the p-value is just an **area under the bell curve**. No table or library is needed to find it: lesson 4.6 added up strips. This lesson uses a better strip rule, then builds the test.` },
        {
          derive: {
            title: 'The rule named after Simpson',
            intro: 'Two strips of width $h$, with heights $y_0, y_1, y_2$ at $-h$, $0$ and $h$. Fit the parabola $y = A + Bx + Cx^2$ through the three points and take the area under it.',
            steps: [
              { prompt: 'The area under $A + Bx + Cx^2$ from $-h$ to $h$, in terms of A, C and h (the $Bx$ part cancels)?', answer: '2*A*h+2*C*h^3/3', vars: { A: [-3, 3], C: [-3, 3], h: [0.1, 2] }, why: '$\\int_{-h}^{h} (A + Bx + Cx^2)\\,dx = 2Ah + \\frac{2}{3}Ch^3$.' },
              { prompt: 'The parabola passes through the points: $y_1 = A$ and $y_0 + y_2 = 2A + 2Ch^2$. Write the area in terms of a (for $y_0$), b ($y_1$), c ($y_2$) and h.', answer: 'h/3*(a+4*b+c)', vars: { a: [-3, 3], b: [-3, 3], c: [-3, 3], h: [0.1, 2] }, why: '$2h y_1 + \\frac h3 (y_0 + y_2 - 2y_1) = \\frac h3 (y_0 + 4y_1 + y_2)$. Pairs of strips share their ends, so over many strips the weights run 1, 4, 2, 4, 2, …, 4, 1.' },
            ],
          },
        },
        {
          code: { file: 'significance.py', fn: 'simpson', notes: [['s += (4 if k % 2 else 2) * f(a + k * h)', ['Odd points are the middles of strip pairs (weight 4); even ones are shared ends (2).']], ['return s * h / 3', ['Exact for any parabola, and so for straight lines; its error shrinks like $h^4$: double the strips, a sixteenth of the error.']]] },
        },
        {
          code: { file: 'significance.py', fn: 'normal_cdf', notes: [['half = simpson(lambda u: math.exp(-u * u / 2), 0, abs(z)) / math.sqrt(2 * math.pi)', ['The area between 0 and $|z|$; half the whole bell lies below 0.']]] },
        },
        {
          write: {
            file: 'significance.py', fn: 'normal_cdf', given: ['simpson'], prelude: 'import math',
            prompt: 'Write `normal_cdf(z)`: the area under $e^{-u^2/2}$ from 0 to $|z|$ by `simpson`, divided by $\\sqrt{2\\pi}$; add it to 0.5 for $z \\ge 0$, take it from 0.5 below.',
            starter: 'def normal_cdf(z):\n    return 0.5\n',
            cases: cases(Q.normalCdf, [[1.96], [-1.2], [0], [3]]),
            hint: '`half = simpson(lambda u: math.exp(-u * u / 2), 0, abs(z)) / math.sqrt(2 * math.pi)`, then `return 0.5 + half if z >= 0 else 0.5 - half`.',
          },
        },
        {
          formula: {
            table: 'orders', solution: '=NORM.S.DIST(1.96, TRUE)', must: ['NORM.S.DIST'],
            prompt: 'The spreadsheet’s normal area below 1.96: `NORM.S.DIST(z, TRUE)` (`TRUE` for the area, `FALSE` for the curve’s height).',
            hint: '`=NORM.S.DIST(1.96, TRUE)`',
            explain: `${sheet('=NORM.S.DIST(1.96, TRUE)').toFixed(12)}; your Simpson’s rule with 1,000 strips gives ${Q.normalCdf(1.96).toFixed(12)}. The tests hold the two together to 9 digits.`,
          },
        },
        { h: 'Going backwards: the quantile' },
        { md: 'Lesson 6.6 needed the $z$ with 97.5% below it. The area only grows as $z$ grows, so **halving** finds it: start with $-10$ to $10$, look at the middle, keep the half where the answer is. Each step halves the interval: after 60 steps it is $20/2^{60} \\approx 2 \\times 10^{-17}$ wide, below the precision of a float.' },
        {
          code: { file: 'significance.py', fn: 'normal_quantile', notes: [['if normal_cdf(mid) < p:', ['Too little area below the middle: the answer is to its right.']]] },
        },
        {
          write: {
            file: 'significance.py', fn: 'normal_quantile', given: ['simpson', 'normal_cdf'], prelude: 'import math',
            prompt: 'Write `normal_quantile(p)` by halving: `lo, hi = -10.0, 10.0`; 60 times, move `lo` or `hi` to the middle; return the final middle.',
            starter: 'def normal_quantile(p):\n    lo, hi = -10.0, 10.0\n    return (lo + hi) / 2\n',
            cases: cases(Q.normalQuantile, [[0.975], [0.8], [0.025]]),
            hint: '`for _ in range(60): mid = (lo + hi) / 2`, then `lo = mid` if `normal_cdf(mid) < p`, else `hi = mid`.',
          },
        },
        { h: 'The z test for two proportions' },
        {
          derive: {
            title: 'The standard error of a difference of rates',
            intro: 'Group A: $n_A$ tries, rate $\\hat p_A$; group B: $n_B$, $\\hat p_B$. Under the null both have the same true rate $p$.',
            steps: [
              { prompt: 'A rate is a mean of 0s and 1s (lesson 6.2), so its variance is $p(1 - p)/n$. Independent groups: the variance of $\\hat p_B - \\hat p_A$, in terms of p, a (for $n_A$) and b (for $n_B$)?', answer: 'p*(1-p)*(1/a+1/b)', vars: { p: [0.05, 0.95], a: [5, 500], b: [5, 500] }, why: 'Variances of independent quantities add, even for a difference.' },
              { prompt: `The null gives no $p$: estimate it by the **pooled** rate, all hits over all tries. In the far towns, ${S.total(NF) + S.total(SF)} of ${NF.length + SF.length} parcels were on time. The pooled rate (to 4 decimals)?`, number: (S.total(NF) + S.total(SF)) / (NF.length + SF.length), compute: () => (S.total(NF) + S.total(SF)) / (NF.length + SF.length), tolerance: 5e-5, why: 'Under the null, the two groups are one.' },
              { prompt: 'The z statistic, $(\\hat p_N - \\hat p_S)/\\text{SE}$ (to 3 decimals)?', number: Z_FAR, compute: () => Q.twoProportionZ(S.total(SF), SF.length, S.total(NF), NF.length), tolerance: 5e-4, why: `${Z_FAR.toFixed(3)} standard errors from 0.` },
            ],
          },
        },
        {
          code: { file: 'significance.py', fn: 'two_proportion_z', notes: [['pooled = (hits_a + hits_b) / (n_a + n_b)', ['The rate both groups would share if the null were true.']], ['if se == 0:', ['Everyone on time in both groups (or no one): the rates are equal and nothing can be told apart. Simulations hit this with small groups.']]] },
        },
        {
          write: {
            file: 'significance.py', fn: 'two_proportion_z', prelude: 'import math',
            prompt: 'Write `two_proportion_z(hits_a, n_a, hits_b, n_b)`: the pooled rate, the standard error $\\sqrt{p(1-p)(1/n_A + 1/n_B)}$, then the rate of B minus the rate of A over it. Return `0.0` when the standard error is 0.',
            starter: 'def two_proportion_z(hits_a, n_a, hits_b, n_b):\n    return hits_b / n_b - hits_a / n_a\n',
            cases: cases(Q.twoProportionZ, [[6, 16, 48, 67], [0, 5, 0, 5], [1434, 7381, 1588, 7425]]),
            hint: '`pooled = (hits_a + hits_b) / (n_a + n_b)`, `se = math.sqrt(pooled * (1 - pooled) * (1 / n_a + 1 / n_b))`, `if se == 0: return 0.0`, then `(hits_b / n_b - hits_a / n_a) / se`.',
          },
        },
        {
          code: { file: 'significance.py', fn: 'z_p_value', notes: [['return 2 * (1 - normal_cdf(abs(z)))', ['Both tails, as the permutation test counted both.']]] },
        },
        {
          predict: {
            prompt: `z = ${Z_FAR.toFixed(3)}. Its two-sided p-value from the normal curve (to 3 decimals)?`,
            answer: Q.zPValue(Z_FAR), compute: () => Q.zPValue(Q.twoProportionZ(S.total(SF), SF.length, S.total(NF), NF.length)), tolerance: 5e-4,
            explain: `${Q.zPValue(Z_FAR).toFixed(3)}, against the permutation test’s ${P_FAR.toFixed(3)}. The formula is twice as confident. It assumed the difference is bell-shaped, which needs plenty of hits **and** misses in each group; Swift had only ${SF.length} far parcels. The shuffle assumed nothing. With small groups, trust the permutation test; with thousands (lesson 7.10), the two agree.`,
          },
        },
        {
          formula: {
            table: 'orders', solution: '=NORM.S.INV(0.975)', must: ['NORM.S.INV'],
            prompt: 'The quantile in the spreadsheet: `NORM.S.INV(p)`, the $z$ with area $p$ below it.',
            hint: '`=NORM.S.INV(0.975)`',
            explain: `${sheet('=NORM.S.INV(0.975)').toFixed(10)}; your halving gives ${Q.normalQuantile(0.975).toFixed(10)}.`,
          },
        },
      ],
    },

    {
      id: 'what-p-means', number: '7.3', title: 'What a p-value is and isn’t',
      goal: 'See that p-values are spread evenly when the null is true, derive P(p ≤ α) = α, and avoid the three common misreadings, with rain and the website’s visits as the warning.',
      builds: ['test-from-formula'],
      blocks: [
        { h: 'p-values when nothing is going on' },
        { md: 'Run an **A/A test**: two groups of 500 visitors, both clicking with chance 20 in 100. The null is true by construction. Each test still produces a p-value. What do they look like over 2,000 such tests?' },
        {
          code: { file: 'significance.py', fn: 'simulated_pvalues', notes: [['if rng.random() < rate_a:', ['Each visitor clicks with chance `rate_a`; the next loop draws group B.']], ['out.append(z_p_value(two_proportion_z(a, n, b, n)))', ['Lesson 7.2’s test, on made-up groups whose truth we set.']]] },
        },
        {
          write: {
            file: 'significance.py', fn: 'simulated_pvalues', given: ['simpson', 'normal_cdf', 'two_proportion_z', 'z_p_value'], prelude: WITH_RNG,
            prompt: 'Write `simulated_pvalues(n, rate_a, rate_b, repeats, seed)`: one `Rng(seed)`; each repeat, count the clicks of `n` visitors with chance `rate_a` (`rng.random() < rate_a`), then of `n` with `rate_b`, and keep `z_p_value(two_proportion_z(a, n, b, n))`.',
            starter: 'def simulated_pvalues(n, rate_a, rate_b, repeats, seed):\n    rng = Rng(seed)\n    out = []\n    return out\n',
            cases: cases(Q.simulatedPvalues, [[30, 0.2, 0.2, 5, 1], [100, 0.2, 0.3, 4, 2]]),
            hint: 'Inside `for _ in range(repeats):` set `a = b = 0`, loop `n` times adding to `a` when `rng.random() < rate_a`, then the same for `b`, then append the p-value.',
          },
        },
        { figure: 'PValueRain', caption: 'Two thousand simulated tests. With no real difference the p-values spread evenly from 0 to 1; with one, they pile up near 0.' },
        {
          derive: {
            title: 'Why they spread evenly',
            intro: 'Under the null, a test statistic $Z$ is standard normal. Its two-sided p-value is $p = 2(1 - \\Phi(|Z|))$, which shrinks as $|Z|$ grows.',
            steps: [
              { prompt: 'p ≤ α exactly when $|Z| \\ge z_\\alpha$, the value with two-sided tail α. So $P(p \\le \\alpha) = P(|Z| \\ge z_\\alpha)$, which is, by the definition of $z_\\alpha$ (in terms of alpha):', answer: 'alpha', vars: { alpha: [0.001, 0.999] }, why: 'The chance of a p-value below α is α, for every α: the definition of an even (uniform) spread.' },
              { prompt: `Measured: the share of the 2,000 A/A p-values below 0.05 (to 4 decimals)?`, number: share(NULL_P, p => p < 0.05), compute: () => share(Q.simulatedPvalues(500, 0.2, 0.2, 2000, 5), p => p < 0.05), tolerance: 5e-5, why: `${pct(share(NULL_P, p => p < 0.05), 2)}; below 0.5: ${pct(share(NULL_P, p => p < 0.5), 2)}. Clicks are whole numbers, so the spread is slightly lumpy, but even.` },
            ],
          },
        },
        { md: `So "significant at 5%" means: **if nothing were going on, a result this extreme would turn up 1 time in 20.** In 1 A/A test in 20, you will "find" an effect that isn't there: a **false positive**. With a real effect (20 against 25 in 100, 500 each), ${pct(share(ALT_P, p => p < 0.05), 1)} of tests come out below 0.05: the rest miss it (lesson 7.6).` },
        { h: 'Small p, no cause' },
        { md: `Rainy days had **${S.mean(WETV).toFixed(1)}** visits to the website on average; dry days **${S.mean(DRYV).toFixed(1)}** (the news day left out). Welch's t test (lesson 7.4) gives p = ${P_RAIN.toExponential(1)}: very strong evidence that rainy days differ.

But the generator never lets rain touch the visits (lesson 5.8): only temperature does. Rainy days are colder, by **${COLDER.toFixed(2)} °C** on average, and each degree multiplies visits by $e^{0.05}$: $e^{0.05 \\times ${COLDER.toFixed(2)}} = ${Math.exp(0.05 * COLDER).toFixed(3)}$, while dry days had ${(S.mean(DRYV) / S.mean(WETV)).toFixed(3)} times the visits. The test was right that the groups differ. It says nothing about **why**.` },
        {
          choice: {
            prompt: `p = ${P_RAIN.toExponential(1)} for rainy against dry days. Which statement is right?`,
            options: [
              { text: 'Rain causes fewer visits.', why: 'The generator proves otherwise. A test compares groups; it can’t tell a cause from a confounder (lesson 5.10).' },
              { text: `There is a ${P_RAIN.toExponential(1)} chance that rain and visits are unrelated.`, why: 'The p-value assumes the null and measures the data; it isn’t the chance of the null.' },
              { text: 'If rainy and dry days had the same mean visits, a gap this big would almost never happen by chance.', why: 'Yes: that, and only that. Here the gap is real, and caused by temperature.' },
              { text: 'The difference is large and important.', why: 'A p-value mixes size with sample size: a tiny difference becomes “significant” with enough data (lesson 7.6).' },
            ],
            answer: 2,
          },
        },
        { note: 'The American Statistical Association’s 2016 statement on p-values says it plainly: a p-value is not the probability that the hypothesis is true, it does not measure the size of an effect, and on its own it is not good evidence for a model. Report the size of the difference and its interval as well (lesson 7.10).', kind: 'key' },
      ],
    },

    {
      id: 't-statistic', number: '7.4', title: 'The t statistic',
      goal: 'Derive the standard error of a difference of two means, build Welch’s t statistic and its degrees of freedom, and test the weekend riders and the lights.',
      builds: ['what-p-means'],
      blocks: [
        { h: 'Two means, two spreads' },
        { md: 'For numbers rather than yes/no, the same recipe: the difference of the means, over its standard error. Each group keeps its own variance: the weekend days may vary more than the weekdays.' },
        {
          derive: {
            title: 'The standard error of a difference of means',
            intro: 'Group $x$: $n$ values with sample variance $a$; group $y$: $m$ values with sample variance $b$.',
            steps: [
              { prompt: 'The variance of $\\bar x$ is $a/n$ (lesson 6.4). Of $\\bar x - \\bar y$, for independent groups (in terms of a, b, n, m)?', answer: 'a/n+b/m', vars: { a: [0.1, 10], b: [0.1, 10], n: [2, 100], m: [2, 100] }, why: 'Subtracting doesn’t subtract variances: each group’s noise adds to the uncertainty.' },
              { prompt: 'Welch’s t is the difference over the square root of that. With $\\bar x - \\bar y = d$, in terms of d, a, b, n, m?', answer: 'd/sqrt(a/n+b/m)', vars: { d: [-5, 5], a: [0.1, 10], b: [0.1, 10], n: [2, 100], m: [2, 100] }, why: 'Welch, 1947. Student’s older t pooled the two variances, assuming they were equal.' },
            ],
          },
        },
        {
          code: { file: 'significance.py', fn: 'welch_t', notes: [['va, vb = variance(a) / len(a), variance(b) / len(b)', ['Each mean’s squared standard error, from its own group.']], ['df = (va + vb) ** 2 / (va ** 2 / (len(a) - 1) + vb ** 2 / (len(b) - 1))', ['How many independent values the estimate of the standard error is worth: the Welch–Satterthwaite formula. Between the smaller group’s $n - 1$ and $n + m - 2$. Lesson 7.5 uses it.']]] },
        },
        {
          write: {
            file: 'significance.py', fn: 'welch_t', also: SPREAD, prelude: 'import math',
            prompt: 'Write `welch_t(a, b)`: `va` and `vb` (each sample variance over its size), `t = (mean(a) - mean(b)) / sqrt(va + vb)`, the degrees of freedom by the formula above; return `[t, df]`.',
            starter: 'def welch_t(a, b):\n    t = mean(a) - mean(b)\n    return [t, len(a) + len(b) - 2]\n',
            cases: cases(Q.welchT, [[[1, 2, 3, 4], [2, 4, 6, 9, 11]], [LW, LS]]),
            hint: '`va, vb = variance(a) / len(a), variance(b) / len(b)`, `t = (mean(a) - mean(b)) / math.sqrt(va + vb)`, `df = (va + vb) ** 2 / (va ** 2 / (len(a) - 1) + vb ** 2 / (len(b) - 1))`.',
          },
        },
        {
          predict: {
            prompt: `Weekend days against weekdays: riders on the cycle path. Welch’s t (to 2 decimals)?`,
            answer: T_WEEKEND[0], compute: () => Q.welchT(WE, WD)[0], tolerance: 0.005,
            explain: `t = ${T_WEEKEND[0].toFixed(2)} with ${T_WEEKEND[1].toFixed(1)} degrees of freedom: the weekend’s ${(S.mean(WE) - S.mean(WD)).toFixed(1)} extra riders are ${T_WEEKEND[0].toFixed(1)} standard errors from 0. The generator adds 90 at weekends. For the lights, web against shop: t = ${T_LIGHTS[0].toFixed(2)}.`,
          },
        },
        {
          formula: {
            table: 'orders', solution: '=T.TEST(FILTER(days!D2:D366, WEEKDAY(days!A2:A366, 2)>5), FILTER(days!D2:D366, WEEKDAY(days!A2:A366, 2)<=5), 2, 3)', must: ['T.TEST', 'FILTER', 'WEEKDAY'],
            prompt: 'The p-value of the weekend test: `T.TEST(group1, group2, 2, 3)`: two tails, type 3 (Welch’s, unequal variances). `WEEKDAY(date, 2)` numbers Monday 1 to Sunday 7, so the weekend is `>5`.',
            hint: '`=T.TEST(FILTER(days!D2:D366, WEEKDAY(days!A2:A366, 2)>5), FILTER(days!D2:D366, WEEKDAY(days!A2:A366, 2)<=5), 2, 3)`',
            explain: `${sheet('=T.TEST(FILTER(days!D2:D366, WEEKDAY(days!A2:A366, 2)>5), FILTER(days!D2:D366, WEEKDAY(days!A2:A366, 2)<=5), 2, 3)').toExponential(2)}: about 4 in a million. Lesson 7.5 builds this area by hand, and the tests hold yours to the spreadsheet’s.`,
          },
        },
        {
          choice: {
            prompt: 'Why compare the means with a t statistic rather than just looking at the difference, 86 riders?',
            options: [
              { text: 'Because 86 riders could be large or small depending on how much days vary and how many there are: the standard error is the yardstick.', why: 'Yes. 86 riders on days that vary by 200, from 3 days each, would mean little; from 100 days each, a lot.' },
              { text: 'Because the t statistic is more accurate than the difference.', why: 'It isn’t a better estimate of anything; it is the difference measured in standard errors.' },
            ],
            answer: 0,
          },
        },
      ],
    },

    {
      id: 't-distribution', number: '7.5', title: 'Small samples: the t distribution',
      goal: 'See why an estimated standard error gives heavier tails, derive the t curve’s area as the area under cosⁿ, and repair lesson 6.6’s intervals for small samples.',
      builds: ['t-statistic'],
      blocks: [
        { h: 'The yardstick is a guess too' },
        { md: `A z statistic divides by the true standard error. A t statistic divides by an **estimate** of it, from the sample's own standard deviation. With 5 values the estimate is often too small, and then $t$ comes out too big: the tails are heavier than the normal's. W. S. Gosset worked out the right curve in 1908 while testing barley for Guinness, publishing as "Student":

$$f(t) \\propto \\left(1 + \\frac{t^2}{\\nu}\\right)^{-\\frac{\\nu+1}{2}}$$

with $\\nu$ (nu) **degrees of freedom**: $n - 1$ for one sample, Welch's formula for two. As $\\nu$ grows the curve becomes the bell.` },
        { figure: 'TvsNormal', caption: 'The t curve for ν degrees of freedom against the normal, and the critical values that leave 5% in the two tails.' },
        {
          derive: {
            title: 'The area under the t curve, by a change of variable',
            intro: 'The area under $(1 + t^2/\\nu)^{-(\\nu+1)/2}$ has no simple formula. Put $t = \\sqrt{\\nu}\\tan u$.',
            steps: [
              { prompt: 'Then $1 + t^2/\\nu = 1 + \\tan^2 u$. As a function of u?', answer: '1/cos(u)^2', vars: { u: [-1.4, 1.4] }, why: '$1 + \\tan^2 u = \\sec^2 u = 1/\\cos^2 u$.' },
              { prompt: '$dt = \\sqrt{\\nu}\\, d(\\tan u)$. The derivative of $\\tan u$ is $1/\\cos^2 u$, so $dt/du$ is (in terms of nu and u):', answer: 'sqrt(nu)/cos(u)^2', vars: { nu: [1, 30], u: [-1.4, 1.4] }, why: 'The chain rule.' },
              { prompt: 'Put both in: $(1/\\cos^2 u)^{-(\\nu+1)/2} \\cdot \\sqrt{\\nu}/\\cos^2 u$. Simplify (in terms of nu and u):', answer: 'sqrt(nu)*cos(u)^(nu-1)', vars: { nu: [1, 30], u: [0, 1.4] }, why: '$\\cos^{\\nu+1} u \\cdot \\cos^{-2} u = \\cos^{\\nu-1} u$. A smooth, bounded curve from $u = 0$ to $\\pi/2$: Simpson’s rule handles it easily. $t$ from 0 to $\\infty$ becomes $u$ from 0 to $\\pi/2$, so the whole tail fits in a finite interval.' },
            ],
          },
        },
        {
          code: { file: 'significance.py', fn: 't_two_sided', notes: [['top = math.atan(abs(t) / math.sqrt(df))', ['Where $u$ ends when $t$ does.']], ['return 1 - simpson(curve, 0, top, 2000) / simpson(curve, 0, math.pi / 2, 2000)', ['The share of the half curve between 0 and $|t|$, from 1: the two tails together. The $\\sqrt\\nu$ cancels, so no constant is needed.']]] },
        },
        {
          write: {
            file: 'significance.py', fn: 't_two_sided', given: ['simpson'], prelude: 'import math',
            prompt: 'Write `t_two_sided(t, df)`: with `curve = lambda u: math.cos(u) ** (df - 1)`, return 1 minus the area of `curve` from 0 to `atan(|t| / sqrt(df))` over its area from 0 to $\\pi/2$ (2,000 strips each).',
            starter: 'def t_two_sided(t, df):\n    top = math.atan(abs(t) / math.sqrt(df))\n    return 1.0\n',
            cases: cases(Q.tTwoSided, [[2.1, 7], [1, 1], [T_LIGHTS[0], T_LIGHTS[1]], [0, 5]]),
            hint: '`curve = lambda u: math.cos(u) ** (df - 1)`, then `1 - simpson(curve, 0, top, 2000) / simpson(curve, 0, math.pi / 2, 2000)`.',
          },
        },
        {
          predict: {
            prompt: `The lights, web against shop: t = ${T_LIGHTS[0].toFixed(3)} with ${T_LIGHTS[1].toFixed(2)} degrees of freedom. The two-sided p-value (to 3 decimals)?`,
            answer: Q.tTwoSided(...T_LIGHTS), compute: () => Q.tTwoSided(...Q.welchT(LW, LS)), tolerance: 5e-4,
            explain: `${Q.tTwoSided(...T_LIGHTS).toFixed(3)}, against the permutation test’s ${P_LIGHTS.toFixed(3)} (lesson 7.1): two methods, one answer, as they should with ${LW.length + LS.length} fairly symmetric prices.`,
          },
        },
        {
          formula: {
            table: 'orders', solution: '=T.DIST.2T(2.1, 7)', must: ['T.DIST.2T'],
            prompt: 'The spreadsheet’s two tails of the t curve: `T.DIST.2T(t, df)`. Note that Excel cuts the degrees of freedom down to a whole number; your function takes any.',
            hint: '`=T.DIST.2T(2.1, 7)`',
            explain: `${sheet('=T.DIST.2T(2.1, 7)').toFixed(10)}; yours ${Q.tTwoSided(2.1, 7).toFixed(10)}. The normal would give ${Q.zPValue(2.1).toFixed(4)}: with 7 degrees of freedom the tails are almost twice as heavy.`,
          },
        },
        { h: 'Intervals that hold the truth' },
        { md: 'Lesson 6.6’s interval used 1.96 standard errors. With an estimated standard error, the multiplier must come from the t curve: the $t$ with 5% in the two tails, found by halving as `normal_quantile` was.' },
        {
          code: { file: 'significance.py', fn: 't_critical', notes: [['if t_two_sided(mid, df) > 1 - level:', ['Still more than 5% beyond the middle: the critical value is further out.']]] },
        },
        {
          write: {
            file: 'significance.py', fn: 't_critical', given: ['simpson', 't_two_sided'], prelude: 'import math',
            prompt: 'Write `t_critical(df, level=0.95)` by halving between 0 and 1000, 60 times: move `lo` up while `t_two_sided(mid, df) > 1 - level`.',
            starter: 'def t_critical(df, level=0.95):\n    return 1.96\n',
            cases: cases(Q.tCritical, [[4], [30], [1, 0.9]]),
            hint: '`lo, hi = 0.0, 1000.0`; `for _ in range(60): mid = (lo + hi) / 2`; `lo = mid` if `t_two_sided(mid, df) > 1 - level` else `hi = mid`.',
          },
        },
        {
          predict: {
            prompt: `Samples of 5 lights’ prices, 2,000 of them (seed 31). With 1.96 standard errors, the interval holds the true mean ${pct(COVER_Z5)} of the time. With $t$ = ${T4.toFixed(3)} (4 degrees of freedom), what share (to 3 decimals)?`,
            answer: COVER_T5, compute: () => Q.intervalCoverage(LIGHTS, 5, 2000, 31, Q.tCritical(4)), tolerance: 5e-4,
            explain: `${COVER_T5.toFixed(3)}, close to the promised 95%. With samples of 3: ${pct(COVER_Z3)} with 1.96, ${pct(COVER_T3)} with $t$. But for **all** prices, so skewed that most samples of 5 hold no bike, $t$ gives only ${pct(COVER_POP_T5)}: the t curve fixes the guessed yardstick, not a lopsided population (lesson 6.6’s failure stands).`,
            misconceptions: [{ answer: 0.95, tolerance: 0.005, feedback: 'Close, but measure it: the lights’ prices aren’t exactly normal, and 2,000 samples have their own luck.' }],
          },
        },
        {
          formula: {
            table: 'orders', solution: '=T.INV.2T(0.05, 4)', must: ['T.INV.2T'],
            prompt: 'The multiplier for a 95% interval from 5 values: `T.INV.2T(0.05, n − 1)`.',
            hint: '`=T.INV.2T(0.05, 4)`',
            explain: `${sheet('=T.INV.2T(0.05, 4)').toFixed(6)} standard errors, not 1.96. At 30 degrees of freedom it is ${Q.tCritical(30).toFixed(3)}; the bell’s 1.960 is the limit.`,
          },
        },
      ],
    },

    {
      id: 'errors-power', number: '7.6', title: 'Errors and power',
      goal: 'Name the two kinds of error, measure an effect’s size, find a test’s power by simulation, and derive how many observations a test needs: the near-town couriers of lesson 6.10.',
      builds: ['t-distribution'],
      blocks: [
        { h: 'Two ways to be wrong' },
        {
          md: `| | The null is true | The null is false |
|---|---|---|
| p < 0.05: "a difference" | **type I error** (false positive), chance α = 0.05 | right: a **discovery** |
| p ≥ 0.05: "no evidence" | right | **type II error** (missed), chance β |

The **power** of a test is $1 - \\beta$: the chance it finds a difference that is really there. α is chosen; β depends on the size of the real difference, the noise, and how much data there is. A test with low power mostly says "no evidence", whatever the truth.` },
        { h: 'How big is the difference?' },
        { md: 'A t statistic grows with the sample: double the data and $t$ grows by $\\sqrt 2$ for the same difference. To describe the difference itself, divide it by the spread **within** the groups, not by the standard error: **Cohen’s d**. Around 0.2 is small, 0.5 medium, 0.8 large (Cohen’s own rough guide).' },
        {
          code: { file: 'significance.py', fn: 'cohens_d', notes: [['pooled = ((na - 1) * variance(a) + (nb - 1) * variance(b)) / (na + nb - 2)', ['The two variances averaged, weighted by their degrees of freedom.']]] },
        },
        {
          write: {
            file: 'significance.py', fn: 'cohens_d', also: SPREAD, prelude: 'import math',
            prompt: 'Write `cohens_d(a, b)`: the pooled variance $\\frac{(n_a - 1)s_a^2 + (n_b - 1)s_b^2}{n_a + n_b - 2}$, then the difference of means over its square root.',
            starter: 'def cohens_d(a, b):\n    return mean(a) - mean(b)\n',
            cases: cases(Q.cohensD, [[[1, 2, 3], [2, 3, 4, 5]], [WE, WD], [LW, LS]]),
            hint: '`na, nb = len(a), len(b)`, `pooled = ((na - 1) * variance(a) + (nb - 1) * variance(b)) / (na + nb - 2)`, `return (mean(a) - mean(b)) / math.sqrt(pooled)`.',
          },
        },
        { md: `The weekend riders: d = **${Q.cohensD(WE, WD).toFixed(2)}**, a medium effect, seen clearly with 365 days. The lights: d = ${Q.cohensD(LW, LS).toFixed(3)}, nothing. Statistical significance answers "is it there?"; the effect size answers "does it matter?". With a million visitors, a click rate of 20.0% against 20.1% is "significant" and worth nothing.` },
        { h: 'Power by simulation' },
        {
          code: { file: 'significance.py', fn: 'simulated_power', notes: [['return len([p for p in pvalues if p < alpha]) / repeats', ['Simulate the world where the difference is real, and count how often the test sees it.']]] },
        },
        {
          write: {
            file: 'significance.py', fn: 'simulated_power', given: ['simpson', 'normal_cdf', 'two_proportion_z', 'z_p_value', 'simulated_pvalues'], prelude: WITH_RNG,
            prompt: 'Write `simulated_power(n, rate_a, rate_b, repeats, seed, alpha=0.05)`: the share of `simulated_pvalues(n, rate_a, rate_b, repeats, seed)` below `alpha`.',
            starter: 'def simulated_power(n, rate_a, rate_b, repeats, seed, alpha=0.05):\n    return alpha\n',
            cases: cases(Q.simulatedPower, [[14, 0.85, 0.97, 50, 5], [200, 0.2, 0.3, 20, 3]]),
            hint: '`pvalues = simulated_pvalues(n, rate_a, rate_b, repeats, seed)`, then `len([p for p in pvalues if p < alpha]) / repeats`.',
          },
        },
        {
          predict: {
            prompt: 'The near towns: the generator’s truth is 85 in 100 on time for Swift, 97 for Northern. With 14 parcels per courier, what share of 2,000 simulated tests (seed 5) find the difference (to 3 decimals)?',
            answer: POWER_14, compute: () => Q.simulatedPower(14, 0.85, 0.97, 2000, 5), tolerance: 5e-4,
            explain: `${POWER_14.toFixed(3)}: about 1 test in ${Math.round(1 / POWER_14)}. Lesson 7.1’s p = ${P_NEAR.toFixed(2)} wasn’t evidence that the couriers are alike near home; the test could hardly ever have seen a 12-point difference with so few parcels.`,
          },
        },
        { figure: 'PowerCurve', caption: 'Power against the number per group, for a chosen pair of rates: the formula’s curve, and simulated tests (dots).' },
        {
          derive: {
            title: 'How many per group?',
            intro: 'Rates $p_1$ and $p_2$, a difference $\\delta = p_2 - p_1$, $n$ per group. Write $v = p_1(1 - p_1) + p_2(1 - p_2)$.',
            steps: [
              { prompt: 'The standard error of the difference with $n$ in each group (in terms of v and n)?', answer: 'sqrt(v/n)', vars: { v: [0.01, 0.5], n: [5, 5000] }, why: 'Lesson 7.2’s variance, each group with its own rate.' },
              { prompt: 'The test says "different" when the estimate is more than $z_a$ standard errors (1.96) from 0. To find it with chance $1 - \\beta$, the true δ must sit $z_b$ further out (0.84 for 80% power): $\\delta = (z_a + z_b)\\sqrt{v/n}$. Solve for n (in terms of a for $z_a$, b for $z_b$, v and d for δ):', answer: '(a+b)^2*v/d^2', vars: { a: [1, 3], b: [0.1, 2], v: [0.01, 0.5], d: [0.01, 0.3] }, why: 'Square both sides. Halving the difference to look for **quadruples** the data needed.' },
              { prompt: 'The near-town couriers: $p_1 = 0.85$, $p_2 = 0.97$, 80% power at α = 0.05. Parcels per courier (to 1 decimal)?', number: N_NEAR, compute: () => Q.sampleSize(0.85, 0.97), tolerance: 0.05, why: `${N_NEAR.toFixed(1)}: ${Math.ceil(N_NEAR)} each. The shop sent Northern only ${NN.length}.` },
            ],
          },
        },
        {
          code: { file: 'significance.py', fn: 'sample_size', notes: [['za, zb = normal_quantile(1 - alpha / 2), normal_quantile(power)', ['Your halving of lesson 7.2: 1.960 and 0.842.']]] },
        },
        {
          write: {
            file: 'significance.py', fn: 'sample_size', given: ['simpson', 'normal_cdf', 'normal_quantile'], prelude: 'import math',
            prompt: 'Write `sample_size(rate_a, rate_b, alpha=0.05, power=0.8)`: $(z_a + z_b)^2 v / \\delta^2$, with $z_a$ = `normal_quantile(1 - alpha / 2)` and $z_b$ = `normal_quantile(power)`.',
            starter: 'def sample_size(rate_a, rate_b, alpha=0.05, power=0.8):\n    return 0.0\n',
            cases: cases(Q.sampleSize, [[0.85, 0.97], [0.2, 0.22], [0.5, 0.6, 0.01, 0.9]]),
            hint: '`spread = rate_a * (1 - rate_a) + rate_b * (1 - rate_b)`, then `(za + zb) ** 2 * spread / (rate_b - rate_a) ** 2`.',
          },
        },
        {
          predict: {
            prompt: `So simulate ${Math.ceil(N_NEAR)} parcels per courier: the power (2,000 tests, seed 6, to 3 decimals)?`,
            answer: POWER_86, compute: () => Q.simulatedPower(Math.ceil(Q.sampleSize(0.85, 0.97)), 0.85, 0.97, 2000, 6), tolerance: 5e-4,
            explain: `${POWER_86.toFixed(3)}, against the 0.80 the formula aimed for: close, and a little above, as the normal approximation is rough at rates near 1. To tell the observed gap (${pct(S.mean(NN))} against ${pct(S.mean(SN))}) from 0 would take about ${Math.round(Q.sampleSize(S.mean(SN), S.mean(NN))).toLocaleString('en-GB')} parcels each: years of deliveries.`,
          },
        },
        {
          formula: {
            table: 'orders', solution: '=(NORM.S.INV(0.975)+NORM.S.INV(0.8))^2*(0.85*0.15+0.97*0.03)/0.12^2', must: ['NORM.S.INV'],
            prompt: 'The sample size in the spreadsheet: $(z_a + z_b)^2 \\, (p_1 q_1 + p_2 q_2) / \\delta^2$ for 0.85 against 0.97.',
            hint: '`=(NORM.S.INV(0.975)+NORM.S.INV(0.8))^2*(0.85*0.15+0.97*0.03)/0.12^2`',
            explain: `${sheet('=(NORM.S.INV(0.975)+NORM.S.INV(0.8))^2*(0.85*0.15+0.97*0.03)/0.12^2').toFixed(2)} parcels per courier.`,
          },
        },
      ],
    },

    {
      id: 'chi-squared', number: '7.7', title: 'Counts in a table: chi-squared',
      goal: 'Test whether two categories go together: expected counts from the margins, the chi-squared statistic and its degrees of freedom, its tail by a recurrence, and the orders per day’s spread (lesson 6.3’s question).',
      builds: ['errors-power'],
      blocks: [
        { h: 'Do two columns go together?' },
        {
          md: `The deliveries in a table of counts:

| | on time | late |
|---|---|---|
| Northern | ${COURIER_ON[0][0]} | ${COURIER_ON[0][1]} |
| Swift | ${COURIER_ON[1][0]} | ${COURIER_ON[1][1]} |

If the courier had nothing to do with being on time, each row would split in the same proportion as the whole column: ${COURIER_ON[0][0] + COURIER_ON[1][0]} of 162 on time. Compare each cell with what that would give.` },
        {
          derive: {
            title: 'Expected counts and degrees of freedom',
            intro: 'A table with $r$ rows and $c$ columns; a cell in a row with total $R$ and a column with total $K$; grand total $N$.',
            steps: [
              { prompt: 'With rows and columns independent, the cell expects its row’s share of the column. In terms of R, K and N?', answer: 'R*K/N', vars: { R: [1, 100], K: [1, 100], N: [100, 500] }, why: 'Row total × column total / grand total.' },
              { prompt: `Northern, on time: expected (to 1 decimal)?`, number: EXPECTED_NY, compute: () => ((COURIER_ON[0][0] + COURIER_ON[0][1]) * (COURIER_ON[0][0] + COURIER_ON[1][0])) / 162, tolerance: 0.05, why: `${COURIER_ON[0][0] + COURIER_ON[0][1]} × ${COURIER_ON[0][0] + COURIER_ON[1][0]} / 162 = ${EXPECTED_NY.toFixed(1)}. Observed: ${COURIER_ON[0][0]}.` },
              { prompt: 'With the margins fixed, how many cells can be chosen freely before the rest are forced? For $r \\times c$ (in terms of r and c):', answer: '(r-1)*(c-1)', vars: { r: [2, 10], c: [2, 10] }, why: 'The last row and the last column are whatever makes the totals right: the degrees of freedom. A 2 × 2 table has 1.' },
            ],
          },
        },
        {
          code: { file: 'significance.py', fn: 'chi_squared', notes: [['expected = rows[i] * cols[j] / grand', ['What independence predicts for this cell.']], ['stat += (table[i][j] - expected) ** 2 / expected', ['A squared gap, scaled by the size of the count: a count of 100 varies by about 10, one of 4 by about 2 (Poisson, lesson 6.3).']]] },
        },
        {
          write: {
            file: 'significance.py', fn: 'chi_squared', also: MEANS,
            prompt: 'Write `chi_squared(table)`: the row totals, column totals and grand total (use `total`), then add $(O - E)^2/E$ over every cell; return `[statistic, (rows − 1)(columns − 1)]`.',
            starter: 'def chi_squared(table):\n    stat = 0.0\n    return [stat, 1]\n',
            cases: cases(Q.chiSquared, [[COURIER_ON], [[[1, 2, 3], [4, 5, 6]]], [TOWN_CHANNEL]]),
            hint: '`rows = [total(row) for row in table]`, `cols = [total([row[j] for row in table]) for j in range(len(table[0]))]`, then a double loop with `expected = rows[i] * cols[j] / grand`.',
          },
        },
        { h: 'The tail of chi-squared' },
        {
          derive: {
            title: 'Two degrees of freedom: a tail you can integrate',
            intro: 'With independent standard normals $Z_1, Z_2$, the statistic with 2 degrees of freedom behaves like $Z_1^2 + Z_2^2 = R^2$, the squared distance of a point from the centre of a two-dimensional bell.',
            steps: [
              { prompt: 'In polar coordinates the bell’s density is $\\frac{1}{2\\pi}e^{-r^2/2}$, and a ring of radius $r$ has length $2\\pi r$. So $P(R > s) = \\int_s^\\infty r e^{-r^2/2}\\,dr$. Its value, in terms of s?', answer: 'exp(-s^2/2)', vars: { s: [0, 4] }, why: 'The antiderivative of $re^{-r^2/2}$ is $-e^{-r^2/2}$.' },
              { prompt: 'So $P(R^2 > x)$, with $x = s^2$ (in terms of x)?', answer: 'exp(-x/2)', vars: { x: [0, 20] }, why: 'The tail for 2 degrees of freedom: no area to find at all.' },
              { prompt: 'The tail at x = 5.99 (to 4 decimals)?', number: Math.exp(-5.99 / 2), compute: () => Q.chi2Tail(5.99, 2), tolerance: 5e-5, why: '0.0500: why 5.99 is the 5% cut-off for 2 degrees of freedom.' },
            ],
          },
        },
        { md: 'Each two more degrees of freedom add one term to the tail, and each term is the one before times $\\frac{x/2}{k/2 + 1}$. For even degrees of freedom the sum is exactly the Poisson sum of lesson 6.3: the chance of fewer than $k/2$ events at rate $x/2$. For odd ones, start from 1 degree of freedom, which is $Z^2$: the normal’s two tails beyond $\\sqrt x$.' },
        {
          code: { file: 'significance.py', fn: 'chi2_tail', notes: [['q, term, k = 0.0, math.exp(-x / 2), 0', ['Even: nothing yet, and the first term is $e^{-x/2}$, the 2-degree tail.']], ['q = 2 * (1 - normal_cdf(math.sqrt(x)))', ['Odd: the 1-degree tail, from your `normal_cdf`.']], ['term *= (x / 2) / (k / 2 + 1)', ['The next term from this one: the Poisson’s step of lesson 6.3, $\\lambda / i$ with $\\lambda = x/2$.']]] },
        },
        {
          write: {
            file: 'significance.py', fn: 'chi2_tail', given: ['simpson', 'normal_cdf'], prelude: 'import math',
            prompt: 'Write `chi2_tail(x, df)`: for even `df` start with `q = 0`, `term = exp(-x/2)`, `k = 0`; for odd, `q = 2(1 − normal_cdf(√x))`, `term = sqrt(x/2) * exp(-x/2) / (sqrt(pi)/2)`, `k = 1`. Then while `k < df`: add `term` to `q`, multiply `term` by `(x/2)/(k/2 + 1)`, add 2 to `k`.',
            starter: 'def chi2_tail(x, df):\n    return math.exp(-x / 2)\n',
            cases: cases(Q.chi2Tail, [[CHI_ON[0], 1], [5, 3], [10, 4], [DISP[0], DISP[1]]]),
            hint: 'Two branches to set `q, term, k`, then `while k < df: q += term; term *= (x / 2) / (k / 2 + 1); k += 2`.',
          },
        },
        {
          formula: {
            table: 'orders', solution: '=CHISQ.TEST(COUNTIFS(deliveries!B2:B163, {"Northern";"Swift"}, deliveries!D2:D163, {"yes","no"}), MMULT(COUNTIF(deliveries!B2:B163, {"Northern";"Swift"}), COUNTIF(deliveries!D2:D163, {"yes","no"}))/162)', must: ['CHISQ.TEST', 'COUNTIFS', 'MMULT'],
            prompt: 'The whole test in one formula. `COUNTIFS` with a column of couriers and a row of answers gives the 2 × 2 table; `MMULT` of the row totals (a column) by the column totals (a row), over 162, gives the expected table; `CHISQ.TEST(observed, expected)` gives the p-value.',
            hint: '`=CHISQ.TEST(COUNTIFS(deliveries!B2:B163, {"Northern";"Swift"}, deliveries!D2:D163, {"yes","no"}), MMULT(COUNTIF(deliveries!B2:B163, {"Northern";"Swift"}), COUNTIF(deliveries!D2:D163, {"yes","no"}))/162)`',
            explain: `p = ${sheet('=CHISQ.TEST(COUNTIFS(deliveries!B2:B163, {"Northern";"Swift"}, deliveries!D2:D163, {"yes","no"}), MMULT(COUNTIF(deliveries!B2:B163, {"Northern";"Swift"}), COUNTIF(deliveries!D2:D163, {"yes","no"}))/162)').toFixed(4)}, as your χ² = ${CHI_ON[0].toFixed(3)} with 1 degree of freedom gives. Overall, courier and lateness look unrelated: Simpson’s paradox again (lesson 5.9). Building this lesson found that the Spreadsheet Lab’s COUNTIFS counted only the first of an array of criteria; it now gives one count per criterion, as Excel does.`,
          },
        },
        {
          predict: {
            prompt: 'Which courier takes the far parcels? The table of courier against far or near town. Its χ² (to 1 decimal)?',
            answer: CHI_FAR[0], compute: () => Q.chiSquared(COURIER_FAR)[0], tolerance: 0.05,
            explain: `χ² = ${CHI_FAR[0].toFixed(1)}: the p-value is about 10⁻¹⁵, so small that 1 − normal_cdf rounds it to ${Q.chi2Tail(...CHI_FAR)}. The shop gives Northern the far parcels on purpose (80 in 100 against 20): this is the confounder behind lesson 5.9. Town against channel: χ² = ${CHI_TOWN[0].toFixed(2)} with ${CHI_TOWN[1]} degrees of freedom, p = ${Q.chi2Tail(...CHI_TOWN).toFixed(2)}, and indeed the generator picks town and channel separately.`,
          },
        },
        { h: 'Lesson 6.3’s question: too even?' },
        {
          code: { file: 'significance.py', fn: 'dispersion', notes: [['return [total([(c - m) ** 2 for c in counts]) / m, len(counts) - 1]', ['$\\sum (x - \\bar x)^2 / \\bar x$: each day’s squared gap over the mean, the χ² of “expected = the mean” with Poisson’s variance (equal to the mean).']]] },
        },
        {
          predict: {
            prompt: `The 365 days’ orders: dispersion ${DISP[0].toFixed(2)} with ${DISP[1]} degrees of freedom, where Poisson counts would give about 364. The chance of a value this **low** or lower, $1 -$ \`chi2_tail\` (to 3 decimals)?`,
            answer: LOW_TAIL, compute: () => 1 - Q.chi2Tail(...Q.dispersion(M.ordersPerDay(CLEAN.map(r => r.date)))), tolerance: 5e-4,
            explain: `${LOW_TAIL.toFixed(3)}; counting both tails, p = ${(2 * LOW_TAIL).toFixed(3)}: "significant" at 5%. Yet the generator gives each order a day chosen evenly at random, which is exactly Poisson-like. The shop’s year is a fluke: of 300 other years made by the same generator, ${pct(LOW_YEARS)} were as even as this one. A test at 5% is wrong 1 time in 20 when the null is true; here we caught it, because we know the truth.`,
          },
        },
      ],
    },

    {
      id: 'many-tests', number: '7.8', title: 'Many tests at once',
      goal: 'Work out the chance of a false alarm among many tests, control it with Bonferroni, and keep the false discovery rate with Benjamini–Hochberg; test every item in every town.',
      builds: ['chi-squared'],
      blocks: [
        { h: 'Look in enough places' },
        { md: `Do web customers pay differently from shop customers for some item in some town? There are ${ITEM_TOWN.length} item-and-town pairs with at least two orders each way. Test them all with Welch's t: **${SMALL_P.length}** come out below 0.05 (${SMALL_P.map(t => `${t.item.toLowerCase()} in ${t.town}, p = ${t.p.toFixed(3)}`).join('; ')}). The generator gives no item a channel effect anywhere: all ${SMALL_P.length} are false alarms.` },
        {
          derive: {
            title: 'The chance of at least one false alarm',
            intro: '$m$ independent tests, every null true, each at level α.',
            steps: [
              { prompt: 'One test gives no false alarm with chance $1 - \\alpha$. None of $m$ do, with chance $(1 - \\alpha)^m$. So at least one false alarm, in terms of alpha and m?', answer: '1-(1-alpha)^m', vars: { alpha: [0.001, 0.2], m: [1, 50] }, why: 'The chances of independent tests multiply.' },
              { prompt: `For the ${ITEM_TOWN.length} tests at α = 0.05 (to 3 decimals)?`, number: 1 - 0.95 ** ITEM_TOWN.length, compute: () => 1 - 0.95 ** ITEM_TOWN.length, tolerance: 5e-4, why: `${(1 - 0.95 ** ITEM_TOWN.length).toFixed(3)}: more likely than not. Expected false alarms: ${ITEM_TOWN.length} × 0.05 = ${(ITEM_TOWN.length * 0.05).toFixed(1)}.` },
              { prompt: 'Bonferroni: test each at α/m instead. The chance of any false alarm is then at most $m \\cdot \\alpha/m$, which is (in terms of alpha):', answer: 'alpha', vars: { alpha: [0.001, 0.2] }, why: 'The chance of a union is at most the sum of the chances, whether or not the tests are independent.' },
            ],
          },
        },
        {
          code: { file: 'significance.py', fn: 'bonferroni', notes: [['return [p <= alpha / m for p in pvalues]', ['A much stricter bar: for 22 tests, 0.0023 each.']]] },
        },
        {
          write: {
            file: 'significance.py', fn: 'bonferroni',
            prompt: 'Write `bonferroni(pvalues, alpha=0.05)`: for each p-value, whether it is at most `alpha / m`.',
            starter: 'def bonferroni(pvalues, alpha=0.05):\n    return [p <= alpha for p in pvalues]\n',
            cases: cases(Q.bonferroni, [[[0.001, 0.02, 0.04]], [ITEM_P]]),
            hint: '`m = len(pvalues)`, then `[p <= alpha / m for p in pvalues]`.',
          },
        },
        { h: 'Discoveries, most of them right' },
        { md: `Bonferroni protects against **any** false alarm, and pays in missed effects. Often a looser promise is enough: among the effects you report, keep the share that are false below $q$. That share is the **false discovery rate**, and Benjamini and Hochberg's procedure (1995) keeps it below $q$: sort the $m$ p-values; find the largest rank $k$ with $p_{(k)} \\le q k / m$; report the $k$ smallest. The bar rises with the rank: the smallest p-value faces $q/m$ (Bonferroni's), the largest faces $q$.` },
        {
          code: {
            file: 'significance.py', fn: 'benjamini_hochberg', notes: [
              ['order = sorted(range(m), key=lambda i: pvalues[i])', ['The tests from smallest p-value to largest.']],
              ['if pvalues[i] <= q * rank / m:', ['Under the rising line. Not the first that fails, the **last** that passes: a p-value above its line can still be reported if a later one is under its own.']],
              ['for i in order[:cutoff]:', ['The k smallest are discoveries.']],
            ],
          },
        },
        {
          write: {
            file: 'significance.py', fn: 'benjamini_hochberg',
            prompt: 'Write `benjamini_hochberg(pvalues, q=0.05)`: order the tests by p-value; the cutoff is the largest rank (from 1) whose p-value is at most `q * rank / m`; return a list of `True` for the tests at ranks up to the cutoff, `False` for the rest, in the original order.',
            starter: 'def benjamini_hochberg(pvalues, q=0.05):\n    return [p <= q for p in pvalues]\n',
            cases: cases(Q.benjaminiHochberg, [[[0.01, 0.04, 0.03, 0.2]], [[0.001, 0.008, 0.039, 0.041, 0.042, 0.06, 0.074, 0.205]], [MANY.slice(0, 30)]]),
            hint: '`order = sorted(range(m), key=lambda i: pvalues[i])`; `for rank, i in enumerate(order, start=1): if pvalues[i] <= q * rank / m: cutoff = rank`; then mark `order[:cutoff]`.',
          },
        },
        { python: { program: 'benjamini_hochberg', label: 'Step through benjamini_hochberg in real Python' } },
        { figure: 'ManyTests', caption: 'A hundred tests, ten with a real effect: what each method reports, coloured by the truth.' },
        {
          code: { file: 'significance.py', fn: 'many_tests', notes: [['b = [noise(rng) + (effect if i < real else 0) for _ in range(n)]', ['The first `real` tests have a true shift; the others are pure noise. We know which.']]] },
        },
        {
          predict: {
            prompt: 'A hundred tests (30 values per group), the first ten with a real shift of 0.8 standard deviations (`many_tests(100, 10, 30, 0.8, 11)`). How many real effects does Benjamini–Hochberg (q = 0.05) find?',
            answer: BH.found, compute: () => tally(Q.benjaminiHochberg(Q.manyTests(100, 10, 30, 0.8, 11))).found,
            explain: `${BH.found} real, ${BH.wrong} false. Taking every p < 0.05: ${RAW.found} real and ${RAW.wrong} false. Bonferroni: ${BONF.found} real, ${BONF.wrong} false. Strict control misses most real effects; no control lets false ones in; the false discovery rate is the middle way, and the usual choice when screening many genes, products or pages.`,
          },
        },
        {
          choice: {
            prompt: `Back to the ${ITEM_TOWN.length} item-and-town tests, with ${SMALL_P.length} below 0.05. What do Bonferroni and Benjamini–Hochberg report?`,
            options: [
              { text: `Both report the ${SMALL_P.length}.`, why: `The smallest p-value is ${Math.min(...ITEM_P).toFixed(3)}; Bonferroni’s bar is ${(0.05 / ITEM_TOWN.length).toFixed(4)}, and BH’s bar for the smallest is the same.` },
              { text: 'Neither reports anything.', why: `Yes: ${Q.bonferroni(ITEM_P).filter(Boolean).length} and ${Q.benjaminiHochberg(ITEM_P).filter(Boolean).length}. Right, since the truth is no effect anywhere.` },
              { text: 'Bonferroni reports none; BH reports one.', why: 'BH’s first bar is Bonferroni’s, and the next ones are only 2q/m, 3q/m…: none of these p-values is under its bar.' },
            ],
            answer: 1, verify: () => Q.bonferroni(ITEM_P).every(f => !f) && Q.benjaminiHochberg(ITEM_P).every(f => !f),
          },
        },
        { note: 'The garden of forking paths (Gelman and Loken): even one test can be many in disguise, if the choice of which groups, which outliers to drop or which measure to report was made after looking at the data. Decide the test before seeing the results, and say how many you ran.', kind: 'key' },
      ],
    },

    {
      id: 'peeking', number: '7.9', title: 'Peeking',
      goal: 'Measure how checking a test every day and stopping at the first p < 0.05 multiplies false positives, and fix the sample size in advance.',
      builds: ['many-tests'],
      blocks: [
        { h: 'Stopping when it looks good' },
        { md: `The website's A/B test ran for 28 days (lesson 7.10). The analyst could look at the p-value every evening. Day ${FIRST_CROSS} was the first with $|z| > 1.96$. Stop there and announce a winner?

Each look is another test. And the looks are not independent: the running z wanders, and 28 chances to cross 1.96 are far more than one. With a true difference this is harmless (the test is right to stop), but the same habit applied to tests with **no** difference produces false winners. How often?` },
        {
          code: { file: 'significance.py', fn: 'aa_peeking', notes: [['page = rng.below(2)', ['A coin flip for each visitor.']], ['z = two_proportion_z(hits[0], n[0], hits[1], n[1])', ['The evening check, on everything so far.']], ['if abs(z) > 1.96:', ['Crossed on some day: a peeker would have stopped and declared a winner.']]] },
        },
        {
          write: {
            file: 'significance.py', fn: 'aa_peeking', given: ['two_proportion_z'], prelude: WITH_RNG,
            prompt: 'Write `aa_peeking(visitors, rate, repeats, seed)`: one `Rng(seed)`; for each repeat, go through the days; each visitor is sent to page `rng.below(2)` and clicks if `rng.random() < rate`; after each day work out `z`, and note whether `|z| > 1.96` on any day. Return `[share that crossed on some day, share with |z| > 1.96 on the last day]`.',
            starter: 'def aa_peeking(visitors, rate, repeats, seed):\n    rng = Rng(seed)\n    ever = last = 0\n    return [ever / repeats, last / repeats]\n',
            cases: cases(Q.aaPeeking, [[[30, 30, 30], 0.2, 10, 9], [Array(10).fill(30), 0.2, 20, 9]]),
            hint: 'Per repeat: `n, hits = [0, 0], [0, 0]`, `crossed = False`; per day loop the visitors, then `z = two_proportion_z(hits[0], n[0], hits[1], n[1])` and `if abs(z) > 1.96: crossed = True`. After the days, add to `ever` and `last`.',
          },
        },
        { figure: 'Peeking', caption: 'The trial’s running z, day by day; and 60 A/A tests (100 visitors a day, no real difference), each line a test, those that ever crossed ±1.96 in red.' },
        {
          predict: {
            prompt: 'Four hundred A/A tests, 28 days of 100 visitors, 20 in 100 clicking on both pages (seed 9). What share would a daily peeker have stopped as “significant” (to 3 decimals)?',
            answer: PEEK_EVER, compute: () => Q.aaPeeking(Array(28).fill(100), 0.2, 400, 9)[0], tolerance: 5e-4,
            explain: `${PEEK_EVER.toFixed(3)}: almost 1 in 4, though every one of them is a false positive. Judged once, on the last day, ${pct(PEEK_LAST)} were significant: the 5% the test promises (give or take 400 tests’ luck).`,
            misconceptions: [{ answer: 0.05, tolerance: 0.02, feedback: '5% is the chance for one look. Each of the 28 evenings is another chance to cross the line.' }],
          },
        },
        {
          choice: {
            prompt: 'How should the shop run its test?',
            options: [
              { text: 'Check every day, but only stop if p < 0.05 two days in a row.', why: 'Still many looks; it lowers the false-positive rate a little and keeps no promise at all.' },
              { text: 'Decide the number of visitors in advance from the power calculation (lesson 7.6), and test once when it is reached.', why: 'Yes: one look, the 5% it promises. Methods that allow planned early looks exist (sequential tests, which spend the 5% across the looks), but they are designed in advance too.' },
              { text: 'Stop as soon as the new page is ahead.', why: 'That is peeking with no test at all.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'ab-test', number: '7.10', title: 'Project: the website’s A/B test',
      goal: 'Design, check and read the shop’s A/B test of its new home page: the sample size, the coin flip’s split, the z test, the interval for the lift, and a report that says what it means.',
      builds: ['peeking'],
      blocks: [
        { h: 'The question' },
        { md: `The shop has a new home page, B. Does it get more visitors to click through to a product than the old one, A? About 20 in 100 visitors click on A. The shop would switch for a lift of 2 points or more; less is not worth the work. (The generator's truth, which the analysis doesn't see: A 20, B 22.)` },
        { h: '1 · Design' },
        {
          predict: {
            prompt: 'How many visitors per page to find a lift from 20% to 22% with 80% power, at α = 0.05 (`sample_size(0.2, 0.22)`, to the nearest whole number)?',
            answer: Math.round(N_TRIAL), compute: () => Math.round(Q.sampleSize(0.2, 0.22)), tolerance: 0.5,
            explain: `${Math.round(N_TRIAL).toLocaleString('en-GB')} per page, ${(2 * Math.ceil(N_TRIAL)).toLocaleString('en-GB')} in all. June brings about ${Math.round(JUNE_VISITS / 28)} visits a day (the days table), so ${Math.ceil(2 * Math.ceil(N_TRIAL) / (JUNE_VISITS / 28))} days; rounded up to whole weeks so every weekday counts the same: **28 days from Monday 2 June**, decided before the test starts. Simulated at that size, the test finds a true 2-point lift ${pct(POWER_TRIAL)} of the time (400 tests).`,
          },
        },
        {
          code: {
            file: 'data.py', fn: 'make_trial', notes: [
              ['for _ in range(int(days[day][4])):', ['Every visit of the day, from the days table: the trial runs on the website’s real traffic.']],
              ['page = "AB"[rng.below(2)]', ['The coin flip. Nothing about the visitor is looked at.']],
              ['if rng.below(1000) < CLICK_RATE[page]:', ['The truth the analysis can’t see: 200 in 1000 on A, 220 on B.']],
            ],
          },
        },
        { md: 'Each visitor is sent to A or B by a coin flip. That is the whole point of an experiment: nothing about the visitor (the weather, the day, where they came from) can decide the page, so the only systematic difference between the groups is the page. No confounder can hide in a coin flip (lesson 5.10).' },
        { h: '2 · Check the split' },
        {
          code: { file: 'significance.py', fn: 'split_check', notes: [['return z_p_value((n_a - n / 2) / (math.sqrt(n) / 2))', ['A fair coin’s count on A is binomial: mean $n/2$, variance $n \\cdot \\frac12 \\cdot \\frac12$, so sd $\\sqrt n / 2$.']]] },
        },
        {
          write: {
            file: 'significance.py', fn: 'split_check', given: ['simpson', 'normal_cdf', 'z_p_value'], prelude: 'import math',
            prompt: 'Write `split_check(n_a, n_b)`: the p-value of a split this uneven from a fair coin: `z_p_value` of $(n_A - n/2)/(\\sqrt n / 2)$.',
            starter: 'def split_check(n_a, n_b):\n    return 1.0\n',
            cases: cases(Q.splitCheck, [[NA, NB], [60, 40], [5000, 5400]]),
            hint: '`n = n_a + n_b`, then `z_p_value((n_a - n / 2) / (math.sqrt(n) / 2))`.',
          },
        },
        {
          predict: {
            prompt: `${NA.toLocaleString('en-GB')} visitors saw A and ${NB.toLocaleString('en-GB')} saw B. The p-value of the split (to 3 decimals)?`,
            answer: Q.splitCheck(NA, NB), compute: () => Q.splitCheck(NA, NB), tolerance: 5e-4,
            explain: `${Q.splitCheck(NA, NB).toFixed(3)}: an ordinary coin. A very small p-value here (a “sample ratio mismatch”) would mean the split itself is broken (a page that crashes for some browsers, say) and the test can’t be trusted, whatever it shows.`,
          },
        },
        { h: '3 · Read the result' },
        {
          md: `| Page | Visitors | Clicked | Rate |
|---|---|---|---|
| A (old) | ${NA.toLocaleString('en-GB')} | ${CA.toLocaleString('en-GB')} | ${pct(CA / NA, 2)} |
| B (new) | ${NB.toLocaleString('en-GB')} | ${CB.toLocaleString('en-GB')} | ${pct(CB / NB, 2)} |` },
        {
          chart: {
            prompt: 'The trial day by day (`data`: one row per day with `av`, `ac` for page A’s visitors and clicks, `bv`, `bc` for B’s). Draw each page’s **running** click rate, all clicks so far over all visitors so far, as a `path` of class `rate`: A first, then B. `d3.cumsum` gives running totals.',
            data: DAILY,
            starter: `const x = d3.scaleLinear().domain([1, 28]).range([40, 460])
const y = d3.scaleLinear().domain([0.15, 0.27]).range([270, 20])
const running = (visits, clicks) => data.map(d => 0.2)   // all clicks so far / all visitors so far
const rates = [running('av', 'ac'), running('bv', 'bc')]
svg.selectAll('path.rate').data(rates).join('path').attr('class', 'rate')
  .attr('fill', 'none').attr('stroke', (_, k) => (k ? '#b0413e' : 'steelblue')).attr('stroke-width', 2)
  .attr('d', d3.line().x((_, k) => x(k + 1)).y(r => y(r)))
svg.append('g').attr('transform', 'translate(0,270)').call(d3.axisBottom(x))
svg.append('g').attr('transform', 'translate(40,0)').call(d3.axisLeft(y).tickFormat(d3.format('.0%')))
`,
            solution: `const x = d3.scaleLinear().domain([1, 28]).range([40, 460])
const y = d3.scaleLinear().domain([0.15, 0.27]).range([270, 20])
const running = (visits, clicks) => {
  const v = d3.cumsum(data, d => d[visits]), c = d3.cumsum(data, d => d[clicks])
  return data.map((_, k) => c[k] / v[k])
}
const rates = [running('av', 'ac'), running('bv', 'bc')]
svg.selectAll('path.rate').data(rates).join('path').attr('class', 'rate')
  .attr('fill', 'none').attr('stroke', (_, k) => (k ? '#b0413e' : 'steelblue')).attr('stroke-width', 2)
  .attr('d', d3.line().x((_, k) => x(k + 1)).y(r => y(r)))
svg.append('g').attr('transform', 'translate(0,270)').call(d3.axisBottom(x))
svg.append('g').attr('transform', 'translate(40,0)').call(d3.axisLeft(y).tickFormat(d3.format('.0%')))
`,
            checks: [{ select: 'path.rate', attrs: ['d'] }],
            verify: marks => {
              const want = (vi, ci) => { let v = 0, c = 0; return TRIAL_DAYS.map(d => { v += d[vi]; c += d[ci]; return G.linearScale(0.15, 0.27, 270, 20, c / v) }) }
              return [want(0, 1), want(2, 3)].every((ys, p) => ys.every((yv, k) => Math.abs(marks['path.rate'][p].d[2 * k + 1] - yv) <= 5e-4))
            },
            hint: '`const v = d3.cumsum(data, d => d[visits]), c = d3.cumsum(data, d => d[clicks])`, then `data.map((_, k) => c[k] / v[k])`.',
            explain: 'The first days jump about (a few hundred visitors), then the lines settle and B stays above A. The tests check every point against the running totals of the trial table.',
          },
        },
        {
          predict: {
            prompt: 'The z statistic for B against A (`two_proportion_z`, to 2 decimals)?',
            answer: Z_TRIAL, compute: () => Q.twoProportionZ(CA, NA, CB, NB), tolerance: 0.005,
            explain: `z = ${Z_TRIAL.toFixed(2)}, p = ${P_TRIAL.toFixed(4)}. With thousands per group the normal approximation is excellent; CHISQ.TEST on the 2 × 2 table gives the same p-value, because for two groups χ² = z² (${(Z_TRIAL ** 2).toFixed(2)}).`,
          },
        },
        {
          code: { file: 'significance.py', fn: 'lift_interval', notes: [['se = math.sqrt(pa * (1 - pa) / n_a + pb * (1 - pb) / n_b)', ['No null here: each group with its own rate, as the interval is about the real difference, whatever it is.']]] },
        },
        {
          predict: {
            prompt: 'The 95% interval for the lift (B minus A): its lower end, in percentage points (to 2 decimals)?',
            answer: 100 * LIFT[0], compute: () => 100 * Q.liftInterval(CA, NA, CB, NB)[0], tolerance: 0.005,
            explain: `${(100 * LIFT[0]).toFixed(2)} to ${(100 * LIFT[1]).toFixed(2)} points, around ${(100 * (CB / NB - CA / NA)).toFixed(2)}. The interval excludes 0 (that is the p < 0.05), and it includes both 2 points (the truth) and values well below the 2 points the shop wanted.`,
          },
        },
        {
          formula: {
            table: 'orders', solution: '=CHISQ.TEST(HSTACK(SUMIFS(trial!D2:D57, trial!B2:B57, {"A";"B"}), SUMIFS(trial!C2:C57, trial!B2:B57, {"A";"B"})-SUMIFS(trial!D2:D57, trial!B2:B57, {"A";"B"})), MMULT(SUMIFS(trial!C2:C57, trial!B2:B57, {"A";"B"}), HSTACK(SUM(trial!D2:D57), SUM(trial!C2:C57)-SUM(trial!D2:D57)))/SUM(trial!C2:C57))', must: ['CHISQ.TEST', 'SUMIFS', 'MMULT'],
            prompt: 'The trial’s p-value from its sheet: clicks and non-clicks for A and B (`SUMIFS` with `{"A";"B"}`), and the expected table from the margins (`MMULT`), into `CHISQ.TEST`.',
            hint: 'Observed: `HSTACK(SUMIFS(trial!D2:D57, trial!B2:B57, {"A";"B"}), SUMIFS(trial!C2:C57, trial!B2:B57, {"A";"B"})-SUMIFS(trial!D2:D57, trial!B2:B57, {"A";"B"}))`. Expected: `MMULT(SUMIFS(trial!C2:C57, trial!B2:B57, {"A";"B"}), HSTACK(SUM(trial!D2:D57), SUM(trial!C2:C57)-SUM(trial!D2:D57)))/SUM(trial!C2:C57)`.',
            explain: `p = ${sheet('=CHISQ.TEST(HSTACK(SUMIFS(trial!D2:D57, trial!B2:B57, {"A";"B"}), SUMIFS(trial!C2:C57, trial!B2:B57, {"A";"B"})-SUMIFS(trial!D2:D57, trial!B2:B57, {"A";"B"})), MMULT(SUMIFS(trial!C2:C57, trial!B2:B57, {"A";"B"}), HSTACK(SUM(trial!D2:D57), SUM(trial!C2:C57)-SUM(trial!D2:D57)))/SUM(trial!C2:C57))').toFixed(5)}, your z test’s ${P_TRIAL.toFixed(5)}. The Spreadsheet Lab has this as a thing to try on the shop’s data.`,
          },
        },
        { h: '4 · The report' },
        {
          choice: {
            prompt: 'What should the report to the shop say?',
            options: [
              { text: `B wins: p = ${P_TRIAL.toFixed(3)}, so there is a ${(100 * (1 - P_TRIAL)).toFixed(1)}% chance it is better.`, why: 'Lesson 7.3: the p-value isn’t the chance of anything being true.' },
              { text: `B raised click-through from ${pct(CA / NA)} to ${pct(CB / NB)}, ${(100 * (CB / NB - CA / NA)).toFixed(1)} points (95% interval ${(100 * LIFT[0]).toFixed(1)} to ${(100 * LIFT[1]).toFixed(1)}); a gap this big would be rare by chance (p = ${P_TRIAL.toFixed(3)}). The lift is probably real; whether it reaches the 2 points wanted is uncertain. Switching costs little, so switch, and keep measuring.`, why: 'Yes: the size, its uncertainty, the evidence, and the decision, each said plainly. The test was run as designed: one look, at the planned size.' },
              { text: `B wins: on day ${FIRST_CROSS} the test was already significant.`, why: 'Lesson 7.9: that look was one of 28. The planned single look at 28 days is the one that counts.' },
            ],
            answer: 1,
          },
        },
        { note: 'Part 8 builds models: not “is there a difference?” but “how much does each thing matter, all at once?”, starting from the days table, where the generator’s rule for riders waits to be found.', kind: 'key' },
      ],
    },
  ],
}
