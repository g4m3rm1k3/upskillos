// Part 2: summing it up. The mean and the median as the best single numbers for two different
// errors, quantiles, quickselect, the variance and why a sample divides by n − 1, Welford's
// one-pass method, outliers, group-by and pivot tables. Numbers come from engine/summary.js
// (held to python/summary.py by parity.test.js) and from the Spreadsheet Lab's engine.
import * as T from '../engine/tables.js'
import * as S from '../engine/summary.js'
import { ORDERS_CSV } from '../engine/data.js'
import { evaluateFormula } from '../engine/sheet.js'

const cases = (fn, inputs) => inputs.map(args => ({ args, expected: fn(...args) }))
const asDict = fn => (...args) => Object.fromEntries(fn(...args))
const PRICED = T.priced(T.readCsv(ORDERS_CSV()))
const PRICES = PRICED.map(r => r.price)
const LIGHTS = PRICED.filter(r => r.item === 'Lights, front and back').map(r => r.price)
const HELMETS = PRICED.filter(r => r.item === 'Helmet').map(r => r.price)
const sheet = formula => evaluateFormula('orders', formula).value
const BIG = [4, 7, 13, 16].map(x => 1e9 + x)
const QS = S.quickselectTrace(PRICES, Math.floor(PRICES.length / 2))
const QS_LOOKED = QS.rounds.reduce((s, r) => s + r.compared, 0)
const GROUPS = S.groupBy(PRICED, 'item')
const LIGHT_OUTLIERS = S.iqrOutliers(LIGHTS)
const small = [{ item: 'Bike', town: 'York', price: 400, quantity: 1 }, { item: 'Lock', town: 'Leeds', price: 30, quantity: 2 }, { item: 'Bike', town: 'Leeds', price: 450, quantity: 1 }, { item: 'Lock', town: 'York', price: 28, quantity: 3 }, { item: 'Lock', town: 'York', price: 31, quantity: 1 }]
const maxZ = n => (n - 1) / Math.sqrt(n)

export const PART2 = {
  id: 'part2', title: 'Part 2 · Summing it up', lessons: [
    {
      id: 'the-mean', number: '2.1', title: 'The mean, and what it is best at',
      goal: 'Write the mean with sigma notation and as a loop, derive it as the number that makes the squared error smallest, and update it one value at a time.',
      builds: ['pandas-columns'],
      blocks: [
        { h: 'One number for many' },
        { md: `A column of ${PRICES.length} prices is too much to take in. A **summary statistic** squeezes it into one number. The most used is the **mean**: add them all up, divide by how many. In **sigma notation**, for values $x_1, x_2, \\dots, x_n$:

$$\\bar x = \\frac{1}{n} \\sum_{i=1}^{n} x_i$$

$\\sum_{i=1}^{n} x_i$ reads “the sum of $x_i$ for $i$ from 1 to $n$”: it is exactly a \`for\` loop that adds.` },
        {
          mathCode: [
            ['\\sum_{i=1}^{n} x_i', '`for x in values: t += x`', 'the loop in `total`, one value at a time'],
            ['n', '`len(values)`', 'how many values'],
            ['\\bar x', '`total(values) / len(values)`', 'the mean, “x bar”'],
          ],
        },
        {
          code: {
            file: 'summary.py', fn: 'total', notes: [
              ['t += x', ['Left to right, one addition at a time, each one rounded to a double (lesson 1.3).']],
            ],
          },
        },
        {
          code: {
            file: 'summary.py', fn: 'mean', notes: [
              ['return total(values) / len(values)', ['The sum over the count. With an empty list this divides by zero, which is right: an empty column has no mean.']],
            ],
          },
        },
        {
          write: {
            file: 'summary.py', fn: 'total', forbid: [['sum(', 'Write the loop yourself.']],
            prompt: 'Write `total(values)`: start from `0.0` and add the values one at a time, left to right.',
            starter: 'def total(values):\n    t = 0.0\n    # add each value\n    return t\n',
            cases: cases(S.total, [[[1, 2, 3.5]], [PRICES.slice(0, 20)], [[]]]),
            hint: '`for x in values: t += x`',
          },
        },
        { h: 'The balance point' },
        { md: `Put a weight at each value on a ruler: the mean is where the ruler balances. Another way to say it, which turns out to be the most useful: **the mean is the single number that is closest to all the values at once**, when “closest” means the smallest sum of *squared* differences:

$$E(c) = \\sum_{i=1}^{n} (x_i - c)^2$$` },
        { figure: 'BalancePoint', caption: 'Slide the centre c and watch both errors. The squared error’s lowest point is always the mean; the absolute error’s (lesson 2.2) is the median. Change the 20 to 200.' },
        {
          derive: {
            title: 'Why the mean makes the squared error smallest',
            intro: 'At the lowest point of $E(c) = \\sum (x_i - c)^2$ the slope is zero.',
            steps: [
              { prompt: 'The slope of one term $(x - c)^2$ with respect to $c$ (by the chain rule)?', answer: '-2*(x-c)', vars: { x: [-5, 5], c: [-5, 5] }, why: 'The outside gives $2(x - c)$, the inside $(x - c)$ has slope $-1$ in $c$.' },
              { prompt: 'Set the total slope $\\sum -2(x_i - c)$ to 0. It splits into $-2\\sum x_i + 2nc = 0$. Solve for $c$, writing $s$ for $\\sum x_i$.', answer: 's/n', vars: { s: [-100, 100], n: [1, 50] }, why: '$2nc = 2s$, so $c = s/n$: the mean. And the curve opens upwards (its second slope is $2n > 0$), so this is a lowest point, not a highest.' },
              { prompt: 'For the values 2, 3, 3, 4, 5, 6, 20: what is the mean?', number: S.mean([2, 3, 3, 4, 5, 6, 20]), compute: () => S.mean([2, 3, 3, 4, 5, 6, 20]), tolerance: 1e-9, why: '$43 / 7 \\approx 6.14$: pulled up by the 20. Squaring makes a far-away value count a lot, so the mean leans towards it.' },
            ],
          },
        },
        {
          formula: {
            table: 'orders', solution: '=AVERAGEIF(D2:D403,"Helmet",E2:E403)', must: ['AVERAGEIF'],
            prompt: 'The mean price of a helmet in a spreadsheet: `AVERAGEIF(range to test, value, range to average)` averages the prices (E) on the rows whose item (D) is Helmet.',
            hint: '`=AVERAGEIF(D2:D403,"Helmet",E2:E403)`',
            explain: `£${S.mean(HELMETS).toFixed(2)}, from ${HELMETS.length} helmets with a price. Lesson 2.7 does this for every item at once.`,
          },
        },
        { h: 'The mean, one value at a time' },
        { md: `To keep a mean up to date as orders arrive, you don't need to add everything up again. If $m$ is the mean of the first $k - 1$ values, the mean of the first $k$ is

$$m_k = m_{k-1} + \\frac{x_k - m_{k-1}}{k}$$

Each new value pulls the mean a $1/k$ share of the way towards itself.` },
        {
          derive: {
            title: 'The running mean',
            intro: 'Start from $m_k = \\frac{1}{k}\\sum_{i=1}^{k} x_i$.',
            steps: [
              { prompt: 'The sum of the first $k - 1$ values is $(k - 1)\\,m_{k-1}$. So $m_k = \\frac{(k-1)m + x}{k}$. Rewrite it as $m$ plus something, in terms of $m$, $x$ and $k$.', answer: 'm+(x-m)/k', vars: { m: [-10, 10], x: [-10, 10], k: [1, 20] }, why: '$\\frac{(k-1)m + x}{k} = m - \\frac{m}{k} + \\frac{x}{k} = m + \\frac{x - m}{k}$.' },
            ],
          },
        },
        {
          code: {
            file: 'summary.py', fn: 'running_mean', notes: [
              ['m += (x - m) / k', ['The update from the derivation: no running total is kept, so it never grows huge.']],
            ],
          },
        },
        {
          write: {
            file: 'summary.py', fn: 'running_mean', forbid: [['sum(', 'Use the update, not a sum.'], ['total(', 'Use the update, not a sum.']],
            prompt: 'Write `running_mean(values)`: the list of the mean after each value, using $m \\leftarrow m + (x - m)/k$.',
            starter: 'def running_mean(values):\n    means, m = [], 0.0\n    # k counts from 1\n    return means\n',
            cases: cases(S.runningMean, [[[2, 4, 6]], [PRICES.slice(0, 8)], [[]]]),
            hint: '`for k, x in enumerate(values, start=1): m += (x - m) / k; means.append(m)`',
          },
        },
      ],
    },

    {
      id: 'median-quantiles', number: '2.2', title: 'The median and quantiles',
      goal: 'Find the median and any quantile by hand, prove the median makes the absolute error smallest, and say why it isn’t fooled by the prices typed in pence.',
      builds: ['the-mean'],
      blocks: [
        { h: 'When the mean lies' },
        { md: `The shop sells front and back lights for about £25. Yet the mean price of the ${LIGHTS.length} lights with a price is **£${S.mean(LIGHTS).toFixed(2)}**. Two of the prices were typed in pence (2375 and 2575, lesson 1.1), and squaring made them dominate.

The **median**, the middle value once sorted, is **£${S.median(LIGHTS).toFixed(2)}**. Two wild values at the top just move the middle one place. A statistic that bad values can't drag far is called **robust**.` },
        {
          code: {
            file: 'summary.py', fn: 'median', notes: [
              ['middle = len(s) // 2', ['For 7 values, index 3 (the fourth); for 8, index 4.']],
              ['return (s[middle - 1] + s[middle]) / 2', ['An even count has no single middle: take the mean of the two in the middle.']],
            ],
          },
        },
        {
          write: {
            file: 'summary.py', fn: 'median', forbid: [['statistics', 'Write it yourself.']],
            prompt: 'Write `median(values)`: sort them; with an odd count return the middle one, with an even count the mean of the two middle ones.',
            starter: 'def median(values):\n    s = sorted(values)\n    # odd: the middle one; even: the mean of the two middle ones\n    pass\n',
            cases: cases(S.median, [[[3, 1, 2]], [[4, 1, 3, 2]], [LIGHTS.slice(0, 15)], [[7]]]),
            hint: '`middle = len(s) // 2`; if `len(s) % 2 == 1` return `s[middle]`, else `(s[middle - 1] + s[middle]) / 2`.',
          },
        },
        {
          derive: {
            title: 'Why the median makes the absolute error smallest',
            intro: 'Look at $A(c) = \\sum |x_i - c|$ as $c$ moves right by a small step $h$ (not past any value).',
            steps: [
              { prompt: 'Each value below $c$ gets $h$ further away; each value above gets $h$ closer. With $b$ values below and $a$ above, by how much does $A$ change?', answer: 'h*(b-a)', vars: { h: [0.01, 1], b: [0, 20], a: [0, 20] }, why: '$+h$ for each of the $b$ below, $-h$ for each of the $a$ above: $h(b - a)$.' },
              { prompt: 'So $A$ goes down while fewer values are below than above, and up once more are below. With 7 values, how many must be below $c$ at the lowest point?', number: 3, compute: () => [2, 3, 3, 4, 5, 6, 20].filter(x => x < S.median([2, 3, 3, 4, 5, 6, 20])).length, why: 'Three below and three above: $c$ is the middle value, the median. How *far* the values are never entered the slope, only how many: that is why moving the 20 to 200 doesn’t move the median.' },
            ],
          },
        },
        { h: 'Quantiles' },
        { md: `The median is the value halfway through the sorted list. A **quantile** generalises it: the value $q$ of the way through. The **quartiles** are $q = 0.25, 0.5, 0.75$ (Q1, the median, Q3); **percentiles** are quantiles in hundredths.

$q$ of the way through $n$ sorted values is position $q(n - 1)$, counting from 0. When that isn't a whole number, draw a straight line between the two neighbours:

$$Q(q) = s_{\\lfloor p \\rfloor} + (p - \\lfloor p \\rfloor)\\,(s_{\\lfloor p \\rfloor + 1} - s_{\\lfloor p \\rfloor}), \\qquad p = q(n-1)$$` },
        { figure: 'QuantileExplorer', caption: 'Pick q and see the position and the two neighbours used.' },
        {
          predict: {
            prompt: 'The sorted values are 1, 1, 2, 3, 4, 5, 6, 9 (eight of them). What is the 0.25 quantile?',
            answer: S.quantile([1, 1, 2, 3, 4, 5, 6, 9], 0.25), compute: () => S.quantile([3, 1, 4, 1, 5, 9, 2, 6], 0.25),
            explain: 'Position $0.25 \\times 7 = 1.75$: between $s_1 = 1$ and $s_2 = 2$, three quarters of the way: $1 + 0.75 \\times 1 = 1.75$.',
            misconceptions: [{ answer: 1, feedback: 'That is $s_1$, the value at position 1. The position is 1.75: go three quarters of the way to the next one.' }, { answer: 2, feedback: 'Position $q(n-1) = 0.25 \\times 7 = 1.75$, not 2: count from 0, and the last position is 7.' }],
          },
        },
        {
          code: {
            file: 'summary.py', fn: 'quantile', notes: [
              ['position = q * (len(s) - 1)', ['$p = q(n - 1)$: 0 is the smallest, $n - 1$ the largest.']],
              ['above = min(below + 1, len(s) - 1)', ['At $q = 1$ there is no next value: stay on the last.']],
              ['return s[below] + (position - below) * (s[above] - s[below])', ['The straight line between the neighbours.']],
            ],
          },
        },
        {
          write: {
            file: 'summary.py', fn: 'quantile', prelude: 'import math',
            prompt: 'Write `quantile(values, q)` with the rule above: sort, find $p = q(n-1)$, and interpolate between `s[floor(p)]` and the next value (or the last one, at the end).',
            starter: 'def quantile(values, q):\n    s = sorted(values)\n    position = q * (len(s) - 1)\n    # the two neighbours, then a straight line between them\n    pass\n',
            cases: cases(S.quantile, [[[3, 1, 4, 1, 5, 9, 2, 6], 0.25], [[3, 1, 4, 1, 5, 9, 2, 6], 1], [PRICES.slice(0, 50), 0.9], [[5], 0.5]]),
            hint: '`below = math.floor(position)`, `above = min(below + 1, len(s) - 1)`, then `s[below] + (position - below) * (s[above] - s[below])`.',
          },
        },
        {
          formula: {
            table: 'orders', solution: '=PERCENTILE.INC(E2:E403,0.25)', must: ['PERCENTILE.INC'],
            prompt: 'The first quartile of all the prices in a spreadsheet: `PERCENTILE.INC(range, q)`.',
            hint: '`=PERCENTILE.INC(E2:E403,0.25)`',
            explain: `${S.quantile(PRICES, 0.25)}, exactly what your \`quantile(prices, 0.25)\` gives: PERCENTILE.INC uses the same $q(n-1)$ rule (and skips the blanks). So does pandas' \`.quantile\`. PERCENTILE.EXC uses another rule and gives different answers on the same data.`,
          },
        },
        {
          choice: {
            prompt: 'You report the “typical” price of lights. The mean is £82; the median £25. Which do you report?',
            options: [
              { text: 'The mean: it uses every value.', why: 'It does, including two that are wrong by a factor of 100. A value that one typo can quadruple isn’t “typical”.' },
              { text: 'The median, and investigate the values that pull the mean so far.', why: 'Yes. The gap between mean and median is itself a finding: something at the top is very large. Lesson 2.6 finds exactly which values.' },
              { text: 'The average of the two.', why: 'That still carries half the typos’ effect, and means nothing on its own.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'quickselect', number: '2.3', title: 'Quickselect: the median without sorting',
      goal: 'Find the k-th smallest value with quickselect, and work out why it takes about 2n steps when sorting takes n log n.',
      builds: ['median-quantiles'],
      blocks: [
        { h: 'Sorting does too much' },
        { md: `To find the median, \`median\` sorts everything: about $n \\log_2 n$ comparisons (lesson 1.6). But we only need *one* position. **Quickselect** (Hoare, 1961) finds it without putting anything else in order:

1. Pick a **pivot** value.
2. Split the values into those smaller, equal and larger.
3. If position $k$ is among the smaller ones, carry on with only those; if among the equal ones, the pivot is the answer; otherwise carry on with the larger ones, with $k$ moved down.` },
        {
          code: {
            file: 'summary.py', fn: 'quickselect', notes: [
              ['pivot = items[len(items) // 2]', ['The middle item of the current list: the same pivot every run, so the steps can be followed. (Libraries choose at random, so no input is reliably slow.)']],
              ['smaller = [x for x in items if x < pivot]', ['Each round looks at every remaining value once against the pivot.']],
              ['elif k < len(smaller) + len(equal):', ['Position $k$ falls among the copies of the pivot: done.']],
              ['k -= len(smaller) + len(equal)', ['Carrying on among the larger values: skip the positions of everything smaller or equal.']],
            ],
          },
        },
        { figure: 'QuickselectTrace', caption: 'Each round: the list, the pivot, and which part is kept. Pick k and edit the values.' },
        { python: { program: 'quickselect', label: 'Step through quickselect in real Python' } },
        {
          write: {
            file: 'summary.py', fn: 'quickselect', forbid: [['sorted(', 'Find it without sorting.'], ['.sort(', 'Find it without sorting.']],
            prompt: 'Write `quickselect(values, k)`: the k-th smallest value (k from 0), by repeatedly splitting around the middle item of the current list as above.',
            starter: 'def quickselect(values, k):\n    items = list(values)\n    # repeat: pivot = items[len(items) // 2]; split into smaller, equal and larger;\n    # keep the part that holds position k, or return the pivot\n    return None\n',
            cases: cases(S.quickselect, [[[3, 1, 4, 1, 5, 9, 2, 6], 0], [[3, 1, 4, 1, 5, 9, 2, 6], 5], [PRICES.slice(0, 60), 30], [[7, 7, 7], 1]]),
            hint: 'If `k < len(smaller)`: `items = smaller`. Elif `k < len(smaller) + len(equal)`: `return pivot`. Else: `k -= len(smaller) + len(equal)` and `items = [x for x in items if x > pivot]`.',
          },
        },
        {
          derive: {
            title: 'How much work quickselect does',
            intro: 'Suppose every pivot splits the list exactly in half. Round 1 looks at $n$ values, round 2 at $n/2$, then $n/4$, …',
            steps: [
              { prompt: 'The total $n + n/2 + n/4 + \\dots$ never reaches what, in terms of $n$?', answer: '2*n', vars: { n: [1, 1000] }, why: 'Each term is half the one before, so the sum closes half the remaining gap to $2n$ each time: $n(1 + \\frac12 + \\frac14 + \\dots) = 2n$.' },
              { prompt: `On the ${PRICES.length} shop prices, finding the median, how many values did quickselect really look at, over all its rounds?`, number: QS_LOOKED, compute: () => S.quickselectTrace(PRICES, Math.floor(PRICES.length / 2)).rounds.reduce((s, r) => s + r.compared, 0), why: `${QS_LOOKED} in ${QS.rounds.length} rounds: about ${(QS_LOOKED / PRICES.length).toFixed(1)}n. Real pivots don't split exactly in half; with a random pivot, finding the median takes about $2(1 + \\ln 2)\\,n \\approx 3.4n$ on average. Still a constant times $n$, where sorting is $n \\log_2 n \\approx ${Math.round(PRICES.length * Math.log2(PRICES.length))}$ here and grows faster.` },
            ],
          },
        },
        {
          choice: {
            prompt: 'When is quickselect slow?',
            options: [
              { text: 'When the list is long.', why: 'Its work grows only like $n$ on average: a long list is fine.' },
              { text: 'When the pivots keep being the smallest or largest value, so each round removes only one item: about $n^2/2$ steps.', why: 'Yes. With the middle item as pivot, a carefully arranged list can do this; choosing the pivot at random makes it vanishingly unlikely, which is what libraries do (numpy’s partition uses introselect, which also falls back to a guaranteed method).' },
              { text: 'When many values are equal.', why: 'The three-way split puts all copies of the pivot in `equal` at once, so repeats make it faster, not slower.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'spread', number: '2.4', title: 'Spread: variance and standard deviation',
      goal: 'Measure how spread out values are, explain why the distances are squared, and derive why a sample’s variance divides by n − 1.',
      builds: ['quickselect'],
      blocks: [
        { h: 'Same centre, different spread' },
        { md: `Two shops both sell helmets at a mean of £45. In one, every helmet is £44 to £46; in the other, £20 to £70. The mean can't tell them apart. **Spread** measures how far the values typically are from their centre.

The obvious idea, the mean distance from the mean, fails: the distances above and below always cancel. So square them first, and take the mean of the squares. That is the **variance**; its square root, back in the original units (pounds, not pounds squared), is the **standard deviation**:

$$s^2 = \\frac{1}{n-1}\\sum_{i=1}^{n} (x_i - \\bar x)^2 \\qquad s = \\sqrt{s^2}$$` },
        {
          derive: {
            title: 'Why the plain distances cancel',
            intro: 'Add up the signed distances from the mean, $\\sum (x_i - \\bar x)$.',
            steps: [
              { prompt: 'It splits into $\\sum x_i - n\\bar x$. Since $\\bar x = s/n$ with $s = \\sum x_i$, what is it?', number: 0, compute: () => Math.round(S.total([45, 49, 41, 47, 43, 45, 46].map(x => x - S.mean([45, 49, 41, 47, 43, 45, 46]))) * 1e9) / 1e9, why: '$s - n \\cdot \\frac{s}{n} = 0$, always: the mean is the balance point. Squaring makes every distance positive, so they add up instead of cancelling.' },
            ],
          },
        },
        { figure: 'SpreadExplorer', caption: 'Each value’s distance from the mean, and its square. Edit the values: the plain distances always add up to 0.' },
        {
          code: {
            file: 'summary.py', fn: 'variance', notes: [
              ['squares = total([(x - m) ** 2 for x in values])', ['First pass: the mean. Second: the squared distances from it.']],
              ['return squares / (len(values) - 1 if sample else len(values))', ['Divide by $n - 1$ for a sample, by $n$ for a whole population. Why: below.']],
            ],
          },
        },
        {
          code: {
            file: 'summary.py', fn: 'std', notes: [
              ['return math.sqrt(variance(values, sample))', ['Back to the units of the data: “helmet prices are typically about £2 from their mean”.']],
            ],
          },
        },
        {
          write: {
            file: 'summary.py', fn: 'variance', given: ['total', 'mean'],
            prompt: 'Write `variance(values, sample=True)`: the sum of squared distances from the mean, divided by `n - 1` if `sample` is true, by `n` otherwise.',
            starter: 'def variance(values, sample=True):\n    m = mean(values)\n    # the squared distances from m, added up, then divided\n    pass\n',
            cases: cases(S.variance, [[[2, 4, 4, 4, 5, 5, 7, 9]], [[2, 4, 4, 4, 5, 5, 7, 9], false], [HELMETS.slice(0, 20)]]),
            hint: '`squares = total([(x - m) ** 2 for x in values])`, then divide by `len(values) - 1 if sample else len(values)`.',
          },
        },
        { h: 'Why n − 1' },
        { md: `Usually the values are a **sample** from something bigger (these orders, out of all the orders the shop will ever have), and we want the variance of the whole **population**, $\\sigma^2$. The sample's own mean $\\bar x$ is pulled towards the sample's values (it is their balance point), so distances from $\\bar x$ come out a little smaller than distances from the true mean $\\mu$ would. Dividing by $n$ is therefore too small on average. By how much?` },
        { figure: 'BesselSimulator', caption: 'The 75 helmet prices as a population. Thousands of small samples drawn from it, each sample’s variance computed both ways, and the averages compared with the truth.' },
        {
          derive: {
            title: 'The expected sample variance',
            intro: 'Draw $x_1, \\dots, x_n$ independently from a population with mean $\\mu$ and variance $\\sigma^2$.',
            steps: [
              { prompt: 'Each $(x_i - \\mu)^2$ is $\\sigma^2$ on average. So what is the average of $\\sum (x_i - \\mu)^2$?', answer: 'n*sigma^2', vars: { n: [1, 50], sigma: [0.1, 10] }, why: '$n$ terms, each $\\sigma^2$ on average.' },
              { prompt: 'Algebra (expand $x_i - \\mu = (x_i - \\bar x) + (\\bar x - \\mu)$; the cross terms add to 0 as in the last derivation) gives $\\sum (x_i - \\mu)^2 = \\sum (x_i - \\bar x)^2 + n(\\bar x - \\mu)^2$. The mean of $n$ independent values has variance $\\sigma^2/n$. What is the average of $n(\\bar x - \\mu)^2$?', answer: 'sigma^2', vars: { sigma: [0.1, 10] }, why: '$n \\cdot \\frac{\\sigma^2}{n} = \\sigma^2$. (Lesson 6 derives why the mean’s variance is $\\sigma^2/n$.)' },
              { prompt: 'So the average of $\\sum (x_i - \\bar x)^2$ is $n\\sigma^2 - \\sigma^2$. What must we divide it by to get $\\sigma^2$ on average?', answer: 'n-1', vars: { n: [2, 50] }, why: '$(n - 1)\\sigma^2 / (n - 1) = \\sigma^2$. Dividing by $n$ gives $\\frac{n-1}{n}\\sigma^2$ instead: for $n = 3$, two thirds of the truth, as the simulation shows. This is **Bessel’s correction**.' },
            ],
          },
        },
        {
          formula: {
            table: 'orders', solution: '=VAR.S(E2:E403)', must: ['VAR.S'],
            prompt: 'A spreadsheet has both: `VAR.S` divides by $n - 1$ (a sample), `VAR.P` by $n$ (a population). Find the sample variance of all the prices.',
            hint: '`=VAR.S(E2:E403)`',
            explain: `${S.variance(PRICES).toFixed(2)}, the same as \`variance(prices)\`. Its square root, the standard deviation, is £${S.std(PRICES).toFixed(2)}: larger than the mean itself, because bikes and the two typos sit far above everything else. One spread for every item together means little; lesson 2.7 splits it by item.`,
          },
        },
        {
          choice: {
            prompt: 'You have the prices of every helmet the shop ever sold, and want their variance. Divide by n or n − 1?',
            options: [
              { text: 'n − 1, always.', why: 'n − 1 corrects for estimating the mean from a sample of a bigger population. If you have the whole population, its mean is the true mean.' },
              { text: 'n: this is the whole population, so there is nothing to correct for.', why: 'Yes. If instead you use these helmets to say something about helmets the shop *will* sell, they become a sample, and n − 1 is right. The question decides, not the data.' },
              { text: 'It makes no difference.', why: 'For large n hardly any (n/(n−1) → 1); for 5 values it is 25%.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'welford', number: '2.5', title: 'One pass, without cancelling: Welford',
      goal: 'See the textbook one-pass variance formula return a negative variance, derive Welford’s update, and write it.',
      builds: ['spread'],
      blocks: [
        { h: 'A formula that is right on paper' },
        { md: `\`variance\` reads the data twice: once for the mean, once for the distances. For data that streams past (sensor readings, a log file too big for memory) you get **one** look. Expanding the square gives a famous one-pass formula:

$$\\sum (x_i - \\bar x)^2 = \\sum x_i^2 - \\frac{\\left(\\sum x_i\\right)^2}{n}$$

so keep two running sums, $\\sum x$ and $\\sum x^2$. It is exactly right on paper. On a computer it can be badly wrong.` },
        {
          code: {
            file: 'summary.py', fn: 'shortcut_variance', notes: [
              ['s2 += x * x', ['For values around a billion, each square is about $10^{18}$.']],
              ['return (s2 - s * s / n) / (n - 1)', ['Two numbers around $4 \\times 10^{18}$ subtracted to give about 90. A double keeps about 16 significant digits, so the digits that make up 90 were never stored: only rounding error is left. This is **catastrophic cancellation**.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'The values 1,000,000,004, 1,000,000,007, 1,000,000,013 and 1,000,000,016 have sample variance exactly 30 (adding a billion to 4, 7, 13, 16 changes nothing). What does `shortcut_variance` return? (One decimal place.)',
            answer: S.shortcutVariance(BIG), compute: () => S.shortcutVariance(BIG), tolerance: 0.05,
            explain: `${S.shortcutVariance(BIG).toFixed(2)}: a **negative** variance, which is impossible for real data. Nothing in the code is wrong; the arithmetic ran out of digits.`,
            misconceptions: [{ answer: 30, feedback: 'That is the true answer, and what `variance` and Welford return. Try it in the figure below: the shortcut loses all its digits first.' }],
          },
        },
        { figure: 'CancellationDemo', caption: 'Add bigger and bigger constants to 4, 7, 13, 16. The true variance stays 30; watch where the shortcut breaks.' },
        { h: 'Welford’s method' },
        { md: `B. P. Welford (1962) keeps the running mean $m$ (lesson 2.1) and $M_2$, the running sum of squared distances *from the current mean*, and updates both for each new value. Nothing large is ever subtracted.` },
        {
          derive: {
            title: 'Welford’s update',
            intro: 'Let $\\delta = x - m_{k-1}$, the new value’s distance from the old mean.',
            steps: [
              { prompt: 'From lesson 2.1, the new mean $m_k$ in terms of $m$ (the old mean), $\\delta$ and $k$?', answer: 'm+d/k', vars: { m: [-10, 10], d: [-10, 10], k: [1, 20] }, why: '$m_k = m_{k-1} + \\delta/k$.' },
              { prompt: 'The sum of squared distances grows by $\\delta \\cdot (x - m_k)$: the distance from the old mean times the distance from the new. With $x - m_k = \\delta - \\delta/k$, write the growth in terms of $\\delta$ and $k$.', answer: 'd^2*(k-1)/k', vars: { d: [-10, 10], k: [1, 20] }, why: '$\\delta(\\delta - \\delta/k) = \\delta^2 \\frac{k-1}{k}$. (It is the exact change in $\\sum (x_i - m)^2$ when one value is added and the mean moves.) Both factors are small numbers, so nothing cancels.' },
              { prompt: 'Add the values 4, 7 to an empty start. After both, what is $M_2$?', number: 4.5, compute: () => S.welford([4, 7])[1] * 1, why: 'First value: $m = 4$, $M_2 = 0$. Second: $\\delta = 3$, $m = 5.5$, $M_2 = 0 + 3 \\times (7 - 5.5) = 4.5$. Sample variance $= M_2/(n-1) = 4.5$.' },
            ],
          },
        },
        {
          code: {
            file: 'summary.py', fn: 'welford', notes: [
              ['delta = x - m', ['Distance from the old mean.']],
              ['m += delta / n', ['The running mean.']],
              ['m2 += delta * (x - m)', ['Old distance times new distance: the growth in the sum of squares.']],
              ['return m, (m2 / (n - 1) if n > 1 else 0.0)', ['The mean and the sample variance, from one pass.']],
            ],
          },
        },
        { python: { program: 'welford', label: 'Step through Welford in real Python, on the billion-sized values' } },
        {
          write: {
            file: 'summary.py', fn: 'welford',
            prompt: 'Write `welford(values)`: return `(mean, sample variance)` in one pass, with the update $\\delta = x - m$; $m \\mathrel{+}= \\delta/n$; $M_2 \\mathrel{+}= \\delta(x - m)$. With fewer than two values the variance is 0.0.',
            starter: 'def welford(values):\n    n, m, m2 = 0, 0.0, 0.0\n    for x in values:\n        n += 1\n        # the three lines of the update\n    return m, (m2 / (n - 1) if n > 1 else 0.0)\n',
            cases: cases(S.welford, [[BIG], [[2, 4, 4, 4, 5, 5, 7, 9]], [PRICES.slice(0, 30)], [[5]]]),
            hint: '`delta = x - m`, then `m += delta / n`, then `m2 += delta * (x - m)`: in that order, so the last line uses the new mean.',
          },
        },
        {
          choice: {
            prompt: 'Which values make the shortcut formula fail?',
            options: [
              { text: 'Values that are very spread out.', why: 'Then $\\sum x^2$ and $(\\sum x)^2/n$ are far apart, and their difference keeps its digits.' },
              { text: 'Values that are large compared with their spread: big numbers close together.', why: 'Yes: timestamps in milliseconds, prices with a big fixed part, sensor readings near a large offset. Subtracting the mean first (two passes) or Welford avoids it.' },
              { text: 'Negative values.', why: 'Signs don’t matter; squaring removes them. Size relative to spread does.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'outliers', number: '2.6', title: 'Outliers and robust statistics',
      goal: 'Flag unusual values with z-scores and with the IQR rule, see why z-scores miss them in small samples, and find the two prices typed in pence.',
      builds: ['welford'],
      blocks: [
        { h: 'Unusual compared with what?' },
        { md: `An **outlier** is a value far from the rest. It might be a mistake (a price typed in pence) or real and important (a customer who bought ten bikes). Either way, find it before trusting any mean or variance. Two common rules:

- **z-score**: how many standard deviations from the mean, $z_i = (x_i - \\bar x)/s$. Flag $|z| > 3$.
- **IQR rule** (Tukey, the one box plots use): with $\\text{IQR} = Q_3 - Q_1$, flag anything below $Q_1 - 1.5\\,\\text{IQR}$ or above $Q_3 + 1.5\\,\\text{IQR}$.

The z-score is built from the mean and standard deviation, which the outliers themselves pull around. The IQR rule is built from quartiles, which they barely move: it is **robust**.` },
        {
          code: {
            file: 'summary.py', fn: 'z_scores', notes: [
              ['return [(x - m) / s for x in values]', ['Distance from the mean, in standard deviations.']],
            ],
          },
        },
        {
          code: {
            file: 'summary.py', fn: 'iqr_outliers', notes: [
              ['low, high = q1 - k * (q3 - q1), q3 + k * (q3 - q1)', ['The **fences**: 1.5 times the middle half’s width beyond each quartile.']],
            ],
          },
        },
        {
          code: {
            file: 'summary.py', fn: 'mad', notes: [
              ['return median([abs(x - m) for x in values])', ['A robust spread: the median of the distances from the median. Half the values are within one MAD of the median.']],
            ],
          },
        },
        { figure: 'OutlierFinder', caption: 'All prices together, then one item at a time. Compare what the IQR rule and the z-score flag, and choose “Lights, front and back”.' },
        {
          write: {
            file: 'summary.py', fn: 'iqr_outliers', given: ['quantile'], prelude: 'import math',
            prompt: 'Write `iqr_outliers(values, k=1.5)`: the values below $Q_1 - k\\,\\text{IQR}$ or above $Q_3 + k\\,\\text{IQR}$, in their original order. `quantile` is given.',
            starter: 'def iqr_outliers(values, k=1.5):\n    q1, q3 = quantile(values, 0.25), quantile(values, 0.75)\n    # the fences, then the values outside them\n    pass\n',
            cases: cases(S.iqrOutliers, [[LIGHTS], [[1, 2, 3, 4, 100]], [HELMETS], [[1, 2, 3, 4, 100], 30]]),
            hint: '`low, high = q1 - k * (q3 - q1), q3 + k * (q3 - q1)`, then `[x for x in values if x < low or x > high]`.',
          },
        },
        {
          derive: {
            title: 'Why |z| > 3 can miss everything in a small sample',
            intro: 'With $n$ values, put one very large value and $n - 1$ equal ones. It turns out its z-score can never exceed $(n-1)/\\sqrt n$, however large it is (Shiffler, 1988).',
            steps: [
              { prompt: 'The largest z-score possible in 5 values? (2 decimal places)', number: maxZ(5), compute: () => Math.max(...S.zScores([0, 0, 0, 0, 1e6])), tolerance: 0.005, why: '$4/\\sqrt 5 \\approx 1.79$: one value of a million among four zeros scores only 1.79, because it inflates the very standard deviation it is measured with.' },
              { prompt: 'The smallest $n$ for which $|z| > 3$ is possible at all?', number: 11, compute: () => { let n = 2; while (maxZ(n) <= 3) n++; return n }, why: '$(n-1)/\\sqrt n > 3$ first at $n = 11$ ($10/\\sqrt{11} \\approx 3.02$). With 10 values or fewer, the rule can never flag anything.' },
            ],
          },
        },
        {
          predict: {
            prompt: 'Within the lights alone, how many prices does the IQR rule flag?',
            answer: LIGHT_OUTLIERS.length, compute: () => S.iqrOutliers(LIGHTS).length,
            explain: `${LIGHT_OUTLIERS.length}: exactly ${LIGHT_OUTLIERS.join(' and ')}, the two prices typed in pence. Over *all* prices together the rule flags ${S.iqrOutliers(PRICES).length} values instead, mostly bikes: not mistakes, just expensive. “Unusual” only means something compared with the right group, which is what group-by (next lesson) gives you.`,
          },
        },
        {
          choice: {
            prompt: 'You find the two prices typed in pence. What do you do with them?',
            options: [
              { text: 'Delete the two rows.', why: 'The orders happened; deleting them loses two real sales from every count and total.' },
              { text: 'Fix them (divide by 100) if the mistake is certain, record the fix, and check the result against the item’s usual price.', why: 'Yes: £23.75 and £25.75 sit right among the other lights. Every change to data should be written down so the analysis can be repeated (Part 3 makes that a habit).' },
              { text: 'Leave them: the median isn’t affected.', why: 'The median isn’t, but every total, mean and model that uses the column is.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'group-by', number: '2.7', title: 'Group-by: split, apply, combine',
      goal: 'Split rows into groups with a dictionary in one pass, summarise each group, and match the result in a spreadsheet and in pandas.',
      builds: ['outliers'],
      blocks: [
        { h: 'One summary per group' },
        { md: `"The mean price" mixes bikes and inner tubes. The useful question is "the mean price **of each item**". That is a **group-by**, in three steps (Wickham's *split–apply–combine*):

1. **Split** the rows into groups by the value of a key column.
2. **Apply** a summary to each group: count, sum, mean, median…
3. **Combine** the results into a table, one row per group.` },
        {
          code: {
            file: 'summary.py', fn: 'group_by', notes: [
              ['if row[key] not in groups:', ['A dictionary answers “is this key here?” in about the same time whether it holds 5 keys or 5 million. It turns the key into a number (its **hash**) that says where to look, instead of searching. So the whole split is one pass over the rows.']],
              ['groups[row[key]].append(row)', ['The row joins its group’s list.']],
            ],
          },
        },
        { python: { program: 'group_by', label: 'Watch rows go into their groups in real Python' } },
        {
          write: {
            file: 'summary.py', fn: 'group_by',
            prompt: 'Write `group_by(rows, key)`: a dictionary from each value of `row[key]` to the list of rows with that value, in the order the values were first seen.',
            starter: 'def group_by(rows, key):\n    groups = {}\n    # one pass: put each row in its group\n    return groups\n',
            cases: cases(asDict(S.groupBy), [[small, 'item'], [small, 'town'], [[], 'item']]),
            hint: 'For each row: if `row[key]` is not in `groups`, start it with `[]`; then `groups[row[key]].append(row)`.',
          },
        },
        {
          code: {
            file: 'summary.py', fn: 'aggregate', notes: [
              ['summary = SUMMARIES[how]', ['Functions are values too: look the summary up by name in a dictionary of functions.']],
              ['return {k: summary([row[name] for row in rows]) for k, rows in groups.items()}', ['Apply and combine in one comprehension.']],
            ],
          },
        },
        {
          code: {
            file: 'summary.py', assign: 'SUMMARIES', notes: [
              ['SUMMARIES = {"count": len', ['Each summary is a function from a list of numbers to one number; `len`, `min` and `max` are Python’s own, the others yours.']],
            ],
          },
        },
        {
          write: {
            file: 'summary.py', fn: 'aggregate', given: ['total', 'mean', 'median'], constants: ['SUMMARIES'],
            prompt: 'Write `aggregate(groups, name, how)`: for each group, the summary `SUMMARIES[how]` of its rows’ values in column `name`, as a dictionary from group to number.',
            starter: 'def aggregate(groups, name, how):\n    summary = SUMMARIES[how]\n    # one number per group\n    return {}\n',
            cases: cases(asDict((rows, name, how) => S.aggregate(S.groupBy(rows, 'item'), name, how)), [[small, 'price', 'mean'], [small, 'quantity', 'sum'], [small, 'price', 'max']]).map(c => ({ ...c, args: [Object.fromEntries(S.groupBy(c.args[0], 'item')), c.args[1], c.args[2]] })),
            hint: '`{k: summary([row[name] for row in rows]) for k, rows in groups.items()}`',
          },
        },
        { figure: 'GroupByView', caption: 'Group by item, town or channel; summarise price or quantity. The last column is the same thing in a spreadsheet, with AVERAGEIF, SUMIF or COUNTIF.' },
        {
          formula: {
            table: 'orders', solution: '=SUMIFS(F2:F403,C2:C403,"York",G2:G403,"web")', must: ['SUMIFS'],
            prompt: 'A spreadsheet does one group at a time. `SUMIFS(sum range, range1, value1, range2, value2)` adds up the quantities (F) on the rows that match both tests. How many items were sold to York on the web?',
            hint: '`=SUMIFS(F2:F403,C2:C403,"York",G2:G403,"web")`',
            explain: `${sheet('=SUMIFS(F2:F403,C2:C403,"York",G2:G403,"web")')} (including “york”, which the spreadsheet matches regardless of capitals; “York ” with a space is missed). One formula per group: group-by does them all at once, which is why pandas has \`frame.groupby("item")["price"].mean()\`, the same three steps in one line.`,
          },
        },
        {
          predict: {
            prompt: 'Grouped by item, what is the mean price of lights? (2 decimal places)',
            answer: S.mean(LIGHTS), compute: () => S.aggregate(GROUPS, 'price', 'mean').get('Lights, front and back'), tolerance: 0.005,
            explain: `£${S.mean(LIGHTS).toFixed(2)}, against a median of £${S.median(LIGHTS).toFixed(2)}: the two typos again. Choose “median” in the figure: group-by and a robust summary together.`,
          },
        },
      ],
    },

    {
      id: 'pivot-tables', number: '2.8', title: 'Pivot tables',
      goal: 'Summarise by two keys at once in a pivot table, check its totals add up, and use one to find messy categories.',
      builds: ['group-by'],
      blocks: [
        { h: 'Two keys at once' },
        { md: `A **pivot table** groups by two columns at once, one along the rows and one along the columns, with a summary in each cell: items sold, by item and by channel. Add a total for each row, each column, and the whole table.` },
        {
          code: {
            file: 'summary.py', fn: 'pivot', notes: [
              ['row_values = sorted({row[row_key] for row in rows})', ['A **set** comprehension: each value once. Sorted, so the table always comes out in the same order.']],
              ['table = {r: {c: 0.0 for c in col_values} for r in row_values}', ['Every cell starts at 0, so a pair that never happens shows 0 instead of being missing.']],
              ['table[row[row_key]][row[col_key]] += row[name]', ['One pass: each row adds its value to its cell.']],
            ],
          },
        },
        {
          write: {
            file: 'summary.py', fn: 'pivot',
            prompt: 'Write `pivot(rows, row_key, col_key, name)`: a dictionary of dictionaries, `table[r][c]` = the total of column `name` over the rows with `row[row_key] == r` and `row[col_key] == c`, with every pair present (0.0 if none).',
            starter: 'def pivot(rows, row_key, col_key, name):\n    row_values = sorted({row[row_key] for row in rows})\n    col_values = sorted({row[col_key] for row in rows})\n    # every cell starts at 0.0, then one pass adds each row\n    pass\n',
            cases: cases(S.pivot, [[small, 'item', 'town', 'quantity'], [small, 'town', 'item', 'price'], [small.slice(0, 1), 'item', 'town', 'price']]),
            hint: '`table = {r: {c: 0.0 for c in col_values} for r in row_values}`, then `for row in rows: table[row[row_key]][row[col_key]] += row[name]`.',
          },
        },
        { figure: 'PivotBuilder', caption: 'Choose the rows, the columns and what to total. Then put the towns along the rows.' },
        {
          derive: {
            title: 'The totals agree',
            intro: 'Write $t_{rc}$ for the cell in row $r$ and column $c$.',
            steps: [
              { prompt: 'The grand total is $\\sum_r \\sum_c t_{rc}$. Adding the row totals first, or the column totals first: do they give the same? (1 for yes, 0 for no)', number: 1, compute: () => { const t = S.pivot(PRICED, 'item', 'channel', 'quantity'); const rs = S.total(Object.values(t).map(r => S.total(Object.values(r)))); const cs = S.total(Object.keys(Object.values(t)[0]).map(c => S.total(Object.values(t).map(r => r[c])))); return rs === cs ? 1 : 0 }, why: 'Yes: both add every cell exactly once, in a different order. (With whole numbers exactly; with floats, up to rounding: lesson 1.3.) Checking that the totals match is a quick test that nothing was lost.' },
              { prompt: `With item along the rows and channel along the columns, what is the grand total of quantity?`, number: S.total(PRICED.map(r => r.quantity)), compute: () => S.total(Object.values(S.pivot(PRICED, 'item', 'channel', 'quantity')).flatMap(r => Object.values(r))), why: 'Every item sold in an order with a price, counted once.' },
            ],
          },
        },
        {
          predict: {
            prompt: 'With town along the rows, how many rows does the pivot table have?',
            answer: Object.keys(S.pivot(PRICED, 'town', 'channel', 'quantity')).length, compute: () => Object.keys(S.pivot(PRICED, 'town', 'channel', 'quantity')).length,
            explain: `${Object.keys(S.pivot(PRICED, 'town', 'channel', 'quantity')).length} for four towns: every spelling gets a row of its own. A pivot table is one of the quickest ways to *see* messy categories. Part 3 cleans them, and then every count in Parts 1 and 2 can be redone properly.`,
            misconceptions: [{ answer: 4, feedback: 'Four real towns: but the pivot table groups by the text exactly as typed. Put town along the rows in the figure.' }],
          },
        },
        { md: `**What aggregation hides.** A pivot table of totals says nothing about *how* each total was made: a cell of 10 could be ten single items or one order of ten. And a total by town hides that some towns' orders are mostly cheap tubes. Every summary throws information away. That is its purpose, but keep the rows, and look at them when a number surprises you.

**Part 2 in one table:**

| Question | Statistic | Robust? | Lesson |
|---|---|---|---|
| Where is the centre? | mean | no | 2.1 |
| | median | yes | 2.2, 2.3 |
| How spread out? | variance, standard deviation | no | 2.4, 2.5 |
| | IQR, MAD | yes | 2.6 |
| Which values are unusual? | z-score (needs n ≥ 11) | no | 2.6 |
| | IQR fences | yes | 2.6 |
| How does it differ by group? | group-by, pivot table | – | 2.7, 2.8 |` },
        {
          formula: {
            table: 'orders', solution: '=PIVOTBY(D1:D403,G1:G403,F1:F403,SUM)', must: ['PIVOTBY'],
            prompt: 'A whole pivot table in one spreadsheet formula: `PIVOTBY(row keys, column keys, values, SUM)`, with the headings included in each range. Items (D) along the rows, channels (G) along the columns, quantities (F) totalled.',
            hint: '`=PIVOTBY(D1:D403,G1:G403,F1:F403,SUM)`',
            explain: 'The result spills into a block of cells: the same table as your `pivot`, with the totals added. Open it in the Spreadsheet Lab to see the whole block, and change SUM to AVERAGE or COUNT.',
          },
        },
      ],
    },
  ],
}
