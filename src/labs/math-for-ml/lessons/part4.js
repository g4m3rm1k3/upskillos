// Part 4: chance and data. Probability by counting, random variables and distributions,
// expectation, variance, conditional probability, Bayes' rule, densities, the normal distribution
// built up, sampling and the standard error, likelihood, maximum likelihood (and why squared error),
// covariance and correlation, and PCA.
import { twoDice, probability, distribution, expectation, variance, bayes, normalPdf, sampleMeans, likelihood, logLikelihood, covariance, correlation, pca2, mean, area } from '../engine/maths.js'
import { f } from './util.js'

const dice = distribution(twoDice())
const FLIPS = [1, 1, 0, 1, 0, 1, 1, 0, 1, 1]
const XS = [1, 2, 3, 4, 5], YS = [2, 3, 5, 4, 6]
const sd = xs => { const m = mean(xs); return Math.sqrt(mean(xs.map(x => (x - m) ** 2))) }

export const PART4 = {
  id: 'part4', title: 'Part [[#part:part4]] · Chance and data: probability and statistics', lessons: [
    {
      id: 'probability', title: 'Probability by counting',
      goal: 'Compute $P(A)$ by counting equally likely outcomes, and use the complement, "or" and "and" rules.',
      builds: ['sigma'],
      blocks: [
        { md: `Roll two dice. There are $6 \\times 6 = 36$ ways they can land, all equally likely. The **probability** of an event is the fraction of those ways in which it happens:

$$P(A) = \\frac{\\text{number of outcomes where } A \\text{ happens}}{\\text{total number of outcomes}}$$

"Total is 7" happens in 6 ways (1+6, 2+5, …, 6+1), so $P(\\text{total} = 7) = \\frac{6}{36} = \\frac16$. Probabilities run from 0 (never) to 1 (certain).

Three rules, each obvious from counting:

- **Not:** $P(\\text{not } A) = 1 - P(A)$. The outcomes where $A$ doesn't happen are the rest.
- **Or** (when $A$ and $B$ can't both happen): $P(A \\text{ or } B) = P(A) + P(B)$.
- **And** (when $A$ and $B$ don't affect each other: **independent**): $P(A \\text{ and } B) = P(A)\\,P(B)$. Two sixes: $\\frac16 \\times \\frac16 = \\frac1{36}$.

That last rule is why the product Π shows up in probability, and why lesson [[#logarithms]]'s logs are needed: the chance of a whole dataset is a product of one chance per example.` },
        {
          code: {
            file: 'stats.py', fn: 'two_dice', notes: [
              ['def two_dice():', ['Every equally likely outcome.']],
              ['totals = []', ['One total per outcome.']],
              ['for a in range(1, 7):', ['The first die…']],
              ['for b in range(1, 7):', ['…and the second: 36 combinations.']],
              ['totals.append(a + b)', ['Record the total.']],
              ['return totals', ['36 totals, with repeats: 7 appears 6 times.']],
            ],
          },
        },
        {
          code: {
            file: 'stats.py', fn: 'probability', notes: [
              ['def probability(event, outcomes):', ['`event` is a function: True when the event happens.']],
              ['hits = 0', ['Count of outcomes in the event.']],
              ['for o in outcomes:', ['Every outcome…']],
              ['if event(o):', ['…where the event happens…']],
              ['hits += 1', ['…counts.']],
              ['return hits / len(outcomes)', ['Favourable over total.'], { tex: 'P(A) = \\frac{|A|}{|\\Omega|}' }],
            ],
          },
        },
        { figure: 'DiceGrid', caption: 'All 36 outcomes. Pick an event: the cells where it happens light up, and the probability is their share.' },
        {
          symbols: [
            ['P(A)', 'P of A', 'the probability that $A$ happens', 'probability(event, outcomes)'],
            ['\\Omega', 'omega', 'the set of all possible outcomes', 'outcomes'],
            ['P(A \\cap B)', 'P of A and B', 'both happen ($\\cap$, "intersection")', ''],
            ['P(A \\cup B)', 'P of A or B', 'at least one happens ($\\cup$, "union")', ''],
          ],
        },
        {
          predict: {
            prompt: 'Two dice: what is the probability that the total is **at least 10**? (3 decimals)',
            answer: probability(t => t >= 10, twoDice()), tolerance: 0.0006, compute: () => probability(t => t >= 10, twoDice()),
            explain: 'Totals 10, 11, 12 happen in 3 + 2 + 1 = 6 ways: $6/36 = 0.167$.',
          },
        },
        {
          predict: {
            prompt: 'What is the probability of **not** rolling a 7?',
            answer: 1 - 1 / 6, tolerance: 1e-6, compute: () => 1 - probability(t => t === 7, twoDice()),
            explain: '$1 - \\frac16 = \\frac56 \\approx 0.833$.',
          },
        },
        { note: '$P(A)$ = favourable ÷ total, for equally likely outcomes. $P(\\text{not }A) = 1 - P(A)$; exclusive "or" adds; independent "and" multiplies.' },
      ],
    },

    {
      id: 'distributions', title: 'Random variables and their distributions',
      goal: 'Describe a random quantity by its distribution $p(x)$, and read $X \\sim p$.',
      builds: ['probability'],
      blocks: [
        { md: `A **random variable** is a number decided by chance: the total of two dice, tomorrow's temperature, the label of a randomly picked photo. Capital letters ($X$) name the random variable, lowercase ($x$) a particular value it can take.

Its **distribution** lists every value with its probability: $p(x) = P(X = x)$. For the dice total, $p(2) = \\frac1{36}$, $p(7) = \\frac6{36}$, and so on: a triangle shape. The probabilities always add to 1: $\\sum_x p(x) = 1$, because something must happen.

"$X \\sim p$" is read "X is distributed as p" or "X is drawn from p". In ML you'll see $x \\sim \\mathcal D$: an example drawn from the data distribution $\\mathcal D$, the (unknown) process that generates the data. A model's job is often to learn something about $\\mathcal D$ from samples of it.` },
        {
          code: {
            file: 'stats.py', fn: 'distribution', notes: [
              ['def distribution(outcomes):', ['Turn a list of equally likely outcomes into $p(x)$.']],
              ['p = {}', ['A dictionary: value → probability.']],
              ['for o in outcomes:', ['Each outcome…']],
              ['p[o] = p.get(o, 0) + 1 / len(outcomes)', ['…adds its share, $\\frac1{36}$, to its value. `p.get(o, 0)` is 0 for a value not yet seen.']],
              ['return p', ['$p(x)$ for every $x$.']],
            ],
          },
        },
        { figure: 'DistributionFig', caption: 'The distribution of the dice total, as bars. The bars\' heights add up to 1.' },
        {
          predict: {
            prompt: 'What is $p(4)$, the probability the total is exactly 4? (4 decimals)',
            answer: dice.get(4), tolerance: 0.00006, compute: () => distribution(twoDice()).get(4),
            explain: '(1,3), (2,2), (3,1): 3 ways, $3/36 = 0.0833$.',
          },
        },
        { note: 'A **random variable** $X$ is a number decided by chance; its **distribution** $p(x)$ gives each value\'s probability, adding to 1. $X \\sim p$: X is drawn from p.' },
      ],
    },

    {
      id: 'expectation', title: 'Expected value: the long-run average',
      goal: 'Compute $\\mathbb E[X] = \\sum_x x\\,p(x)$, use linearity, and read $\\mathbb E_{x \\sim p}[\\cdot]$.',
      builds: ['distributions'],
      blocks: [
        { md: `Roll two dice a million times and average the totals: you get very nearly 7. That long-run average is the **expected value**, and it can be computed exactly without rolling: weight every value by its probability and add.

$$\\mathbb E[X] = \\sum_x x\\,p(x)$$

For the dice: $2 \\cdot \\frac1{36} + 3 \\cdot \\frac2{36} + \\dots + 12 \\cdot \\frac1{36} = 7$. On a bar chart, it is the **balance point**: where a seesaw holding the bars would balance.

Two properties do most of the work in ML derivations:

- **Linearity:** $\\mathbb E[aX + b] = a\\,\\mathbb E[X] + b$ and $\\mathbb E[X + Y] = \\mathbb E[X] + \\mathbb E[Y]$, always. (One die averages 3.5, so two average 7.)
- **Expectation of a function:** $\\mathbb E[g(X)] = \\sum_x g(x)\\,p(x)$. Average $g$, weighted the same way.

Papers write the loss as an expectation: $\\mathcal L(\\theta) = \\mathbb E_{(x, y) \\sim \\mathcal D}\\big[\\ell(f_\\theta(x), y)\\big]$: "the average loss over examples drawn from the data distribution". We can't compute it exactly (we don't know $\\mathcal D$), so we estimate it by averaging over the examples we have: the training loss. Averaging over a small random batch instead is **stochastic** gradient descent (Part [[#part:part5]]).` },
        {
          code: {
            file: 'stats.py', fn: 'expectation', notes: [
              ['def expectation(p):', ['`p` maps values to probabilities.']],
              ['total = 0.0', ['Running total.']],
              ['for x, px in p.items():', ['`.items()` gives (value, probability) pairs.']],
              ['total += x * px', ['Value times its probability.'], { tex: '\\mathbb E[X] = \\sum_x x\\,p(x)' }],
              ['return total', ['The balance point.']],
            ],
          },
        },
        { figure: 'DistributionFig', props: { showMean: true }, caption: 'Reshape the distribution by weighting the faces of one die; the triangle marks $\\mathbb E[X]$, the balance point.' },
        {
          symbols: [
            ['\\mathbb E[X]', 'expected value of X', 'the probability-weighted average', 'expectation(p)'],
            ['\\mathbb E_{x\\sim p}[g(x)]', 'expectation over x drawn from p of g', 'the average of $g$ when $x$ comes from $p$', 'mean of g over samples'],
            ['\\mu', 'mu', 'a common name for a mean, $\\mu = \\mathbb E[X]$', 'mu'],
          ],
        },
        {
          predict: {
            prompt: 'A game pays £10 with probability 0.2 and £0 otherwise. What is the expected payout?',
            answer: expectation(new Map([[10, 0.2], [0, 0.8]])), compute: () => expectation(new Map([[10, 0.2], [0, 0.8]])),
            explain: '$10 \\times 0.2 + 0 \\times 0.8 = 2$. You never win exactly £2; it is the long-run average.',
          },
        },
        {
          predict: {
            prompt: 'If $\\mathbb E[X] = 7$, what is $\\mathbb E[3X - 1]$?',
            answer: 3 * expectation(dice) - 1, tolerance: 1e-9, compute: () => 3 * expectation(distribution(twoDice())) - 1,
            explain: 'Linearity: $3 \\times 7 - 1 = 20$.',
          },
        },
        { note: '$\\mathbb E[X] = \\sum_x x\\,p(x)$: the probability-weighted average, the balance point. Linear: $\\mathbb E[aX + b] = a\\mathbb E[X] + b$. A loss is an expectation over the data.' },
      ],
    },

    {
      id: 'variance', title: 'Spread: variance and standard deviation',
      goal: 'Compute $\\mathrm{Var}(X) = \\mathbb E[(X - \\mu)^2]$ and $\\sigma = \\sqrt{\\mathrm{Var}}$, and say why the square is there.',
      builds: ['expectation', 'powers'],
      blocks: [
        { md: `Two classes both average 60 marks: one has everyone between 55 and 65, the other ranges from 20 to 100. The average hides that difference; **spread** measures it.

How far is $X$ from its mean, on average? The plain average of $X - \\mu$ is always 0 (the ups and downs cancel: that's what a mean is). So square the distances first, which makes them all positive and counts big deviations more (lesson [[#powers]]):

$$\\mathrm{Var}(X) = \\mathbb E\\big[(X - \\mu)^2\\big] = \\sum_x (x - \\mu)^2\\, p(x)$$

The **variance** is in squared units (marks²), so take the square root to get back to marks: the **standard deviation**,

$$\\sigma = \\sqrt{\\mathrm{Var}(X)}$$

"a typical distance from the mean". For the dice total, $\\mathrm{Var} = 5.83$ and $\\sigma = 2.42$. Here $\\sigma$ (sigma) means standard deviation, not the sigmoid; context always tells.

Variance is everywhere in ML: initialising weights with the right variance keeps signals from exploding or vanishing; attention divides by $\\sqrt d$ to control a variance (Part [[#part:part5]]); and "variance" in the bias–variance trade-off is how much a model changes with different training data.` },
        {
          code: {
            file: 'stats.py', fn: 'variance', notes: [
              ['def variance(p):', ['A distribution.']],
              ['mu = expectation(p)', ['The mean, $\\mu$.']],
              ['total = 0.0', ['Running total.']],
              ['for x, px in p.items():', ['Each value…']],
              ['total += (x - mu) ** 2 * px', ['…its squared distance from the mean, weighted by its probability.'], { tex: '\\mathrm{Var} = \\sum_x (x - \\mu)^2 p(x)' }],
              ['return total', ['The variance; `math.sqrt` of it is σ.']],
            ],
          },
        },
        { figure: 'SpreadFig', caption: 'Two sets of numbers with the same mean. Each deviation\'s square is drawn as a square: the variance is their average area.' },
        {
          symbols: [
            ['\\mathrm{Var}(X)', 'variance of X', 'the average squared distance from the mean', 'variance(p)'],
            ['\\sigma', 'sigma', 'standard deviation: $\\sqrt{\\mathrm{Var}}$, a typical distance from the mean', 'math.sqrt(variance(p))'],
            ['\\sigma^2', 'sigma squared', 'another name for the variance', ''],
          ],
        },
        {
          predict: {
            prompt: 'What is the standard deviation of the two-dice total? (3 decimals)',
            answer: Math.sqrt(variance(dice)), tolerance: 0.0006, compute: () => Math.sqrt(variance(distribution(twoDice()))),
            explain: `$\\mathrm{Var} = ${f(variance(dice))}$ (that is $\\frac{35}{6}$), and $\\sqrt{5.833} \\approx 2.415$.`,
            misconceptions: [{ answer: variance(dice), tolerance: 0.001, feedback: 'That is the variance. σ is its square root.' }],
          },
        },
        { note: '$\\mathrm{Var}(X) = \\mathbb E[(X - \\mu)^2]$, $\\sigma = \\sqrt{\\mathrm{Var}}$. Squaring stops ups and downs cancelling; the root returns to the original units.' },
      ],
    },

    {
      id: 'conditional', title: 'Conditional probability: given what we know',
      goal: 'Compute $P(A \\mid B)$ by narrowing the outcomes, and use the product rule $P(A \\cap B) = P(A \\mid B)P(B)$.',
      builds: ['variance'],
      blocks: [
        { md: `Information changes probabilities. Before the dice land, $P(\\text{total} \\ge 10) = \\frac16$. If someone tells you the first die is a 6, only 6 outcomes remain, and 3 of them reach 10 (6+4, 6+5, 6+6): now the chance is $\\frac36 = \\frac12$.

That is a **conditional probability**, written with a vertical bar read "given":

$$P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)}$$

"The probability of $A$ given $B$": restrict attention to the outcomes where $B$ happened, and ask what fraction of those also have $A$. Rearranged, it gives the **product rule**: $P(A \\cap B) = P(A \\mid B)\\,P(B)$. And $A$ and $B$ are **independent** exactly when knowing $B$ changes nothing: $P(A \\mid B) = P(A)$.

Machine learning is full of conditionals. A classifier outputs $p(y \\mid x)$: the probability of each label **given** the input. A language model gives $p(\\text{next word} \\mid \\text{words so far})$.` },
        { figure: 'DiceGrid', props: { conditional: true }, caption: 'Pick a condition $B$ (the shaded region) and an event $A$. $P(A \\mid B)$ counts only inside $B$.' },
        {
          predict: {
            prompt: 'Given that the total is even, what is the probability it is 6 or less? (3 decimals)',
            answer: probability(t => t % 2 === 0 && t <= 6, twoDice()) / probability(t => t % 2 === 0, twoDice()), tolerance: 0.0006, compute: () => probability(t => t % 2 === 0 && t <= 6, twoDice()) / probability(t => t % 2 === 0, twoDice()),
            explain: 'Even totals happen in 18 outcomes; of those, totals 2, 4, 6 account for 1 + 3 + 5 = 9. So $9/18 = 0.5$.',
          },
        },
        { note: '$P(A \\mid B) = P(A \\cap B)/P(B)$: the share of $B$\'s outcomes that also have $A$. Classifiers output $p(y \\mid x)$.' },
      ],
    },

    {
      id: 'bayes', title: 'Bayes\' rule: turning evidence around',
      goal: 'Derive Bayes\' rule from the product rule and use it to update a belief after evidence.',
      builds: ['conditional'],
      blocks: [
        { md: `A disease affects 1% of people. A test catches 90% of cases ($P(+ \\mid \\text{ill}) = 0.9$) but also flags 5% of healthy people ($P(+ \\mid \\text{healthy}) = 0.05$). You test positive. How likely is it that you are ill? Most people guess around 90%. It is about **15%**.

The product rule can be written two ways, $P(\\text{ill} \\cap +) = P(\\text{ill} \\mid +)P(+) = P(+ \\mid \\text{ill})P(\\text{ill})$. Divide by $P(+)$:

$$P(\\text{ill} \\mid +) = \\frac{P(+ \\mid \\text{ill})\\;P(\\text{ill})}{P(+)}$$

That is **Bayes' rule**. It turns "how likely is the evidence if the hypothesis is true" into "how likely is the hypothesis given the evidence". The bottom, $P(+)$, adds up both ways of testing positive: $0.9 \\times 0.01 + 0.05 \\times 0.99 = 0.0585$. So the answer is $0.009 / 0.0585 = 0.154$.

Picture 1,000 people: 10 are ill and 9 of them test positive; 990 are healthy and about 50 of them test positive too. Of the 59 positives, only 9 are ill. The disease is so rare that false alarms outnumber real cases.

The names: $P(\\text{ill})$ is the **prior** (belief before the evidence), $P(+ \\mid \\text{ill})$ the **likelihood**, $P(\\text{ill} \\mid +)$ the **posterior** (belief after). "Posterior ∝ likelihood × prior" ($\\propto$ means "proportional to") is the whole of Bayesian machine learning in one line.` },
        {
          code: {
            file: 'stats.py', fn: 'bayes', notes: [
              ['def bayes(prior, hit_rate, false_alarm):', ['$P(\\text{ill})$, $P(+\\mid\\text{ill})$, $P(+\\mid\\text{healthy})$.']],
              ['positive = hit_rate * prior + false_alarm * (1 - prior)', ['$P(+)$: positive and ill, plus positive and healthy.'], { tex: 'P(+) = P(+\\mid I)P(I) + P(+\\mid H)P(H)', calc: q => [`${q.hit_rate}×${q.prior} + ${q.false_alarm}×${f(1 - q.prior)}`, q.hit_rate * q.prior + q.false_alarm * (1 - q.prior)] }],
              ['return hit_rate * prior / positive', ['Bayes\' rule.'], { tex: 'P(I\\mid +) = \\frac{P(+\\mid I)P(I)}{P(+)}' }],
            ],
          },
        },
        { figure: 'BayesFig', caption: '1,000 people as squares. Change the prevalence and the test\'s accuracy; count who is ill among those who test positive.' },
        {
          symbols: [
            ['P(H)', 'prior', 'belief in hypothesis $H$ before the evidence', 'prior'],
            ['P(E \\mid H)', 'likelihood', 'how probable the evidence is if $H$ is true', 'hit_rate'],
            ['P(H \\mid E)', 'posterior', 'belief after seeing the evidence', 'bayes(…)'],
            ['\\propto', 'proportional to', 'equal up to a constant factor', ''],
          ],
        },
        {
          predict: {
            prompt: 'Same test, but in a clinic where 20% of patients have the disease. $P(\\text{ill} \\mid +)$? (3 decimals)',
            answer: bayes(0.2, 0.9, 0.05), tolerance: 0.0006, compute: () => bayes(0.2, 0.9, 0.05),
            explain: `$0.18 / (0.18 + 0.04) = ${f(bayes(0.2, 0.9, 0.05))}$. The same positive test means far more when the prior is higher.`,
          },
        },
        { note: 'Bayes: $P(H \\mid E) = \\frac{P(E \\mid H)P(H)}{P(E)}$, posterior ∝ likelihood × prior. Rare hypotheses stay unlikely after weak evidence.' },
      ],
    },

    {
      id: 'densities', title: 'Continuous chance: density and area',
      goal: 'Read a probability density, and compute a probability as the area under it.',
      builds: ['bayes', 'integral'],
      blocks: [
        { md: `Heights, temperatures and model weights are **continuous**: they can be any number in a range, not just a list of values. The probability of being **exactly** 172.000… cm is 0 (there are infinitely many possible values). What we can ask is the chance of falling in a **range**.

A **probability density** $p(x)$ describes this as a curve: the probability of landing between $a$ and $b$ is the **area under the curve** between them (lesson [[#integral]]):

$$P(a \\le X \\le b) = \\int_a^b p(x)\\,dx$$

The total area is 1. A density's height is not itself a probability (it can be bigger than 1 if the curve is narrow); only areas are. The expected value becomes an integral too, $\\mathbb E[X] = \\int x\\,p(x)\\,dx$: Σ turned into ∫.

The simplest density: **uniform** on $[0, 1]$, flat at height 1. The chance of landing between 0.2 and 0.5 is the area of a rectangle, $0.3 \\times 1 = 0.3$.` },
        { figure: 'DensityFig', caption: 'Choose a range: the shaded area is the probability of landing in it.' },
        {
          predict: {
            prompt: 'A density on $[0, 2]$ is $p(x) = x/2$ (a rising line). What is $P(X \\le 1)$?',
            answer: 0.25, tolerance: 0.0005, compute: () => area(x => x / 2, 0, 1, 1000),
            explain: 'The area under $x/2$ from 0 to 1 is a triangle: $\\frac12 \\times 1 \\times \\frac12 = 0.25$. Most of the probability is in the upper half.',
          },
        },
        { note: 'For continuous quantities, probability = **area** under the density: $P(a \\le X \\le b) = \\int_a^b p(x)\\,dx$. Heights aren\'t probabilities; areas are.' },
      ],
    },

    {
      id: 'normal', title: 'The bell curve, built up',
      goal: 'Build $\\mathcal N(x; \\mu, \\sigma^2) = \\frac{1}{\\sigma\\sqrt{2\\pi}}e^{-(x-\\mu)^2/(2\\sigma^2)}$ piece by piece, and use the 68–95–99.7 rule.',
      builds: ['densities', 'number-e'],
      blocks: [
        { md: `The **normal** (Gaussian) distribution is the bell curve: measurement errors, heights, test scores and the sum of many small random effects all follow it, and ML assumes it constantly. Its formula looks fierce, but it is four simple steps.

1. **A bump.** $e^{-x^2}$: at $x = 0$ it is $e^0 = 1$; as $x$ moves away either side, $-x^2$ becomes very negative and $e^{-x^2}$ falls quickly to 0. A smooth bump centred on 0.
2. **Move it.** $e^{-(x - \\mu)^2}$: the peak is now where $x = \\mu$, the mean.
3. **Widen it.** $e^{-(x-\\mu)^2/(2\\sigma^2)}$: dividing by $\\sigma^2$ stretches the bump so that its width is controlled by the standard deviation $\\sigma$. (The 2 is there so that $\\sigma$ comes out as exactly the standard deviation: lesson [[#integration-techniques]] proved it by parts, and you can measure it below.)
4. **Make the area 1.** A density's total area must be 1 (lesson [[#densities]]), so divide by the area under step 3. What is it? Moving the bump (step 2) slides every strip sideways without changing its area. Widening it (step 3) is a sideways stretch by $\\sigma$: write $z = (x - \\mu)/\\sigma$, and each strip of the curve $e^{-z^2/2}$ becomes $\\sigma$ times wider at the same height. So the area is $\\sigma$ times the area under $e^{-z^2/2}$ (lesson [[#integration-techniques]] proved this by substitution). That last area is exactly $\\sqrt{2\\pi} = 2.50663\\ldots$, which lesson [[#gaussian-integral]] proved.

The first check below measures it again with thin strips. So the area under step 3 is $\\sigma\\sqrt{2\\pi}$; divide by it:

$$\\mathcal N(x;\\, \\mu, \\sigma^2) = \\frac{1}{\\sigma\\sqrt{2\\pi}}\\, \\exp\\!\\left(-\\frac{(x - \\mu)^2}{2\\sigma^2}\\right)$$

Read $\\mathcal N(\\mu, \\sigma^2)$ as "normal with mean $\\mu$ and variance $\\sigma^2$". Rule of thumb: about **68%** of the area lies within $1\\sigma$ of the mean, **95%** within $2\\sigma$, **99.7%** within $3\\sigma$.` },
        { figure: 'NormalBuilder', caption: 'The bell curve in four steps. Move μ and σ, and switch steps on one at a time.' },
        {
          code: {
            file: 'stats.py', fn: 'normal_pdf', notes: [
              ['def normal_pdf(x, mu=0.0, sigma=1.0):', ['The density at $x$.']],
              ['z = (x - mu) / sigma', ['How many standard deviations from the mean: the **z-score**.'], { tex: 'z = \\frac{x - \\mu}{\\sigma}', calc: q => [`(${f(q.x)} − ${f(q.mu)}) / ${f(q.sigma)}`, (q.x - q.mu) / q.sigma] }],
              ['return math.exp(-z * z / 2) / (sigma * math.sqrt(2 * math.pi))', ['The bump, scaled to area 1.'], { tex: '\\frac{1}{\\sigma\\sqrt{2\\pi}}e^{-z^2/2}' }],
            ],
          },
        },
        {
          predict: {
            prompt: 'Measure the area under $e^{-z^2/2}$ from $z = -8$ to $8$ with 1000 midpoint strips (beyond that the curve is below $10^{-13}$). What do you get? (4 decimals)',
            answer: Math.sqrt(2 * Math.PI), tolerance: 0.00006, compute: () => area(z => Math.exp(-z * z / 2), -8, 8, 1000),
            explain: `${f(area(z => Math.exp(-z * z / 2), -8, 8, 1000), 6)}, and $\\sqrt{2\\pi} = ${f(Math.sqrt(2 * Math.PI), 6)}$. More strips agree to more digits.`,
          },
        },
        {
          predict: {
            prompt: 'Now the "2" in step 3. With $\\mu = 0$ and $\\sigma = 2$, measure the variance $\\int x^2\\,\\mathcal N(x; 0, 2^2)\\,dx$ with strips from $-20$ to $20$. (2 decimals)',
            answer: 4, tolerance: 0.006, compute: () => area(x => x * x * normalPdf(x, 0, 2), -20, 20, 4000),
            explain: 'It is $\\sigma^2 = 4$: with the 2 in place, $\\sigma$ is exactly the standard deviation. Without it (dividing by $\\sigma^2$ alone) the spread would come out as $\\sigma^2/2$.',
          },
        },
        {
          predict: {
            prompt: 'What is the height of the standard normal ($\\mu = 0$, $\\sigma = 1$) at its peak? (4 decimals)',
            answer: normalPdf(0), tolerance: 0.00006, compute: () => normalPdf(0),
            explain: '$1/\\sqrt{2\\pi} = 0.3989$.',
          },
        },
        {
          predict: {
            prompt: 'Using the 68–95–99.7 rule: test scores are $\\mathcal N(60, 10^2)$. Roughly what fraction score above 80?',
            answer: 0.025, tolerance: 0.003, compute: () => 1 - (0.5 + area(x => normalPdf(x, 60, 10), 60, 80, 2000)),
            explain: '80 is $2\\sigma$ above the mean. 95% lie within $2\\sigma$, so 5% outside, half of them above: about 2.5%.',
          },
        },
        { note: '$\\mathcal N(\\mu, \\sigma^2)$: a bump $e^{-(x-\\mu)^2/(2\\sigma^2)}$ centred on μ, width σ, scaled to area 1. 68% within 1σ, 95% within 2σ.' },
      ],
    },

    {
      id: 'sampling', title: 'Averages wobble: sampling and standard error',
      goal: 'See why an average of $n$ samples varies by about $\\sigma/\\sqrt n$, and why that matters for every measurement in ML.',
      builds: ['normal'],
      blocks: [
        { md: `We almost never know a true mean $\\mu$; we estimate it with the **sample mean** $\\bar x$ of the data we have. Different samples give different estimates. How much do they wobble?

Average $n$ independent values, each with mean $\\mu$ and standard deviation $\\sigma$. Two facts, each derived from things you have.

**Variances of independent things add.** Take two, $X$ and $Y$, with means $\\mu_X, \\mu_Y$, and write $A = X - \\mu_X$, $B = Y - \\mu_Y$ for their distances from their means. By linearity $\\mathbb E[A] = \\mathbb E[X] - \\mu_X = 0$, and likewise $\\mathbb E[B] = 0$. Then

$$\\mathrm{Var}(X + Y) = \\mathbb E[(A + B)^2] = \\mathbb E[A^2] + 2\\,\\mathbb E[AB] + \\mathbb E[B^2] = \\mathrm{Var}(X) + 2\\,\\mathbb E[AB] + \\mathrm{Var}(Y)$$

"Independent" means the "and" rule is a plain product, $P(A = a \\text{ and } B = b) = P(A = a)\\,P(B = b)$ (lesson [[#probability]]). So

$$\\mathbb E[AB] = \\sum_a\\sum_b ab\\,P(a)\\,P(b) = \\Big(\\sum_a a\\,P(a)\\Big)\\Big(\\sum_b b\\,P(b)\\Big) = \\mathbb E[A]\\,\\mathbb E[B] = 0$$

(the middle step factors the double sum, as $(a_1 + a_2)(b_1 + b_2)$ multiplies out to every $a_ib_j$). The cross term vanishes: $\\mathrm{Var}(X + Y) = \\mathrm{Var}(X) + \\mathrm{Var}(Y)$. Adding one value at a time, a sum of $n$ independent values has variance $n\\sigma^2$.

**Scaling by $c$ scales variance by $c^2$:** $cX$ has mean $c\\mu$, and $(cX - c\\mu)^2 = c^2(X - \\mu)^2$, so $\\mathrm{Var}(cX) = c^2\\,\\mathrm{Var}(X)$.

The average is the sum times $c = \\frac1n$, so its variance is $\\frac{1}{n^2}\\cdot n\\sigma^2 = \\frac{\\sigma^2}{n}$. Take the square root: the **standard error**,

$$\\mathrm{SE}(\\bar x) = \\frac{\\sigma}{\\sqrt n}$$

Two things follow. Averages get more reliable with more data, but slowly: four times the data halves the error. And whatever the original distribution, the averages pile up into a **bell curve** around $\\mu$: the **central limit theorem**, which is why the normal distribution shows up everywhere. The spread $\\sigma/\\sqrt n$ is proved above, and the bell **shape** is lesson [[#clt]]'s theorem. The figure below shows it again: start from flat, un-bell-like dice and watch the averages take the bell's shape as $n$ grows.

In ML: a test-set accuracy is an average, so it has a standard error. A model scoring 91% on 100 test examples has an SE of about 3 points, so a rival at 89% may not really be worse.` },
        {
          code: {
            file: 'stats.py', fn: 'sample_means', notes: [
              ['def sample_means(n, trials=200, seed=0):', ['Repeat a small experiment many times.']],
              ['rng = random.Random(seed)', ['Seeded dice, so the run repeats exactly.']],
              ['means = []', ['One average per trial.']],
              ['for _ in range(trials):', ['Each trial…']],
              ['rolls = [rng.randint(1, 6) for _ in range(n)]', ['…rolls $n$ dice…']],
              ['means.append(mean(rolls))', ['…and records their average.']],
              ['return means', ['How spread out these are is the standard error.']],
            ],
          },
        },
        { figure: 'SamplingFig', caption: 'Each dot is the average of $n$ dice. Raise $n$: the averages bunch up around 3.5, by $\\sigma/\\sqrt n$.' },
        {
          predict: {
            prompt: 'One die has $\\sigma \\approx 1.708$. What is the standard error of the average of 25 dice? (3 decimals)',
            answer: Math.sqrt(35 / 12) / 5, tolerance: 0.0006, compute: () => sd([1, 2, 3, 4, 5, 6]) / Math.sqrt(25),
            explain: '$1.708 / \\sqrt{25} = 1.708 / 5 = 0.342$.',
          },
        },
        { note: '$\\mathrm{SE}(\\bar x) = \\sigma/\\sqrt n$: averages wobble less with more data, slowly. Averages tend toward a bell curve (central limit theorem).' },
      ],
    },

    {
      id: 'likelihood', title: 'Likelihood: how well do parameters explain the data?',
      goal: 'Compute $L(\\theta) = \\prod_i p(x_i \\mid \\theta)$ for coin flips, and explain how it differs from a probability.',
      builds: ['sampling', 'logarithms'],
      blocks: [
        { md: `Turn the question round. Instead of "given the coin's bias, how likely are these flips?", ask "given these flips, which bias explains them best?"

A coin lands heads with unknown probability $p$. We flip it 10 times: H H T H T H H T H H, 7 heads. If the bias were $p$, the probability of this exact sequence would be, by the "and" rule for independent flips (lesson [[#probability]]),

$$L(p) = p \\cdot p \\cdot (1 - p) \\cdots = \\prod_{i=1}^{10} p(x_i \\mid p) = p^7 (1 - p)^3$$

Read as a function of $p$ with the data fixed, this is the **likelihood**. $L(0.5) = 0.00098$, $L(0.7) = 0.0022$: a coin with $p = 0.7$ explains our data more than twice as well as a fair one. Note what it is not: it is not the probability that $p = 0.7$ (that would need Bayes and a prior). It is "how probable the data would be, if $p$ were this".

And because the product of many small numbers underflows, we take logs (lesson [[#logarithms]]):

$$\\log L(p) = \\sum_{i=1}^{n} \\log p(x_i \\mid p) = 7\\log p + 3 \\log(1 - p)$$

Same peak, a sum instead of a product: the **log-likelihood**.` },
        {
          code: {
            file: 'stats.py', fn: 'likelihood', notes: [
              ['def likelihood(p, flips):', ['`flips` is a list of 1s (heads) and 0s (tails).']],
              ['L = 1.0', ['An empty product.']],
              ['for f in flips:', ['Each flip…']],
              ['L *= p if f == 1 else 1 - p', ['…multiplies in its probability: $p$ for heads, $1 - p$ for tails.'], { tex: 'L = \\prod_i p(x_i \\mid p)' }],
              ['return L', ['The likelihood.']],
            ],
          },
        },
        {
          code: {
            file: 'stats.py', fn: 'log_likelihood', notes: [
              ['def log_likelihood(p, flips):', ['The same, in logs.']],
              ['total = 0.0', ['A sum now.']],
              ['for f in flips:', ['Each flip…']],
              ['total += math.log(p if f == 1 else 1 - p)', ['…adds the log of its probability.'], { tex: '\\log L = \\sum_i \\log p(x_i \\mid p)' }],
              ['return total', ['The log-likelihood: a negative number, highest at the best $p$.']],
            ],
          },
        },
        { figure: 'LikelihoodFig', caption: 'Flip the coin (click the flips to change them). The curve is $L(p)$ for every bias; the log version has its peak in the same place.' },
        {
          predict: {
            prompt: 'With 7 heads in 10 flips, what is $L(0.7)$? (6 decimals)',
            answer: likelihood(0.7, FLIPS), tolerance: 0.0000006, compute: () => likelihood(0.7, FLIPS),
            explain: `$0.7^7 \\times 0.3^3 = 0.0824 \\times 0.027 = ${f(likelihood(0.7, FLIPS))}$.`,
          },
        },
        { note: 'Likelihood $L(\\theta) = \\prod_i p(x_i \\mid \\theta)$: how probable the observed data would be under parameters θ, as a function of θ. Log-likelihood: the same, as a sum.' },
      ],
    },

    {
      id: 'mle', title: 'Maximum likelihood, and why squared error',
      goal: 'Find $\\hat\\theta = \\arg\\max_\\theta \\log L(\\theta)$ with calculus, and derive mean squared error as Gaussian maximum likelihood.',
      builds: ['likelihood', 'minimum'],
      blocks: [
        { md: `**Maximum likelihood estimation** (MLE) picks the parameters that make the data most probable:

$$\\hat\\theta = \\arg\\max_\\theta\\; \\log L(\\theta)$$

For the coin, maximise $\\ell(p) = 7\\log p + 3\\log(1 - p)$. Its derivative (lesson [[#exp-log-slopes]], and the chain rule for the second term) is $\\frac7p - \\frac{3}{1-p}$. Set it to 0: $7(1 - p) = 3p$, so $\\hat p = 0.7$. The best estimate is the fraction of heads: common sense, now with a reason.

Now the big one. Suppose a model predicts $\\hat y_i$, and the true values scatter around the prediction with normal noise: $y_i \\sim \\mathcal N(\\hat y_i, \\sigma^2)$. Each point's log-density (lesson [[#normal]]) is

$$\\log p(y_i) = -\\log(\\sigma\\sqrt{2\\pi}) - \\frac{(y_i - \\hat y_i)^2}{2\\sigma^2}$$

Add over all points. The first term doesn't depend on the model at all. So maximising the log-likelihood means maximising $-\\sum_i (y_i - \\hat y_i)^2$, which is the same as **minimising the sum of squared errors**:

$$\\arg\\max \\log L = \\arg\\min \\sum_i (y_i - \\hat y_i)^2$$

**Mean squared error is maximum likelihood under Gaussian noise.** That is why it is the default regression loss. And in Part [[#part:part5]], cross-entropy will turn out to be maximum likelihood for categories. The losses of ML aren't arbitrary: they are log-likelihoods with a minus sign.` },
        { figure: 'LikelihoodFig', props: { showSlope: true }, caption: 'The log-likelihood and its slope. The slope is zero exactly at the fraction of heads.' },
        {
          predict: {
            prompt: 'A coin gives 3 heads in 12 flips. What is the maximum-likelihood estimate $\\hat p$?',
            answer: 0.25, compute: () => { let best = 0.01; for (let p = 0.01; p < 1; p += 0.0001) if (logLikelihood(p, [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]) > logLikelihood(best, [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0])) best = p; return best }, tolerance: 0.0002,
            explain: '$\\frac{3}{p} = \\frac{9}{1-p}$ gives $p = 3/12 = 0.25$.',
          },
        },
        {
          choice: {
            prompt: 'Why can the $\\log(\\sigma\\sqrt{2\\pi})$ term be ignored when fitting the model?',
            options: [
              { text: 'It is the same whatever the model predicts, so it can\'t change which parameters are best', why: 'Yes. Adding a constant shifts the whole curve up or down; the argmax stays put.' },
              { text: 'Because it is small', why: 'Its size doesn\'t matter; it doesn\'t depend on the parameters.' },
            ],
            answer: 0,
          },
        },
        { note: 'MLE: $\\hat\\theta = \\arg\\max\\log L$. For a coin, $\\hat p$ = fraction of heads. With Gaussian noise, maximising likelihood = **minimising squared error**: that is where MSE comes from.' },
      ],
    },

    {
      id: 'covariance', title: 'Covariance and correlation: do two things move together?',
      goal: 'Compute covariance and correlation, read a covariance matrix, and remember that correlation is not causation.',
      builds: ['variance', 'dot-product'],
      blocks: [
        { md: `Hours studied and test score tend to rise together. **Covariance** measures that: for each point, multiply how far $x$ is above its mean by how far $y$ is above its mean, and average.

$$\\mathrm{Cov}(X, Y) = \\frac1n\\sum_{i=1}^n (x_i - \\bar x)(y_i - \\bar y)$$

When both are above average together (or below together), the product is positive; when one is up while the other is down, negative. So the sign tells the direction of the relationship. Notice it is a dot product of the two centred lists (lesson [[#dot-product]]), divided by $n$.

Covariance has awkward units (hours × marks). Divide by both standard deviations and you get the **correlation**,

$$\\rho = \\frac{\\mathrm{Cov}(X, Y)}{\\sigma_X\\,\\sigma_Y}$$

between −1 and 1: 1 a perfect rising line, −1 a perfect falling line, 0 no straight-line relationship. (It is the cosine similarity of the centred data!) And the classic warning: **correlation is not causation**. Ice-cream sales and drownings correlate because both rise in summer.

With many features, all the covariances form a **covariance matrix** $\\Sigma$: entry $(j, k)$ is $\\mathrm{Cov}(x_j, x_k)$, and the diagonal holds the variances. It is symmetric, and next lesson finds its eigenvectors.` },
        {
          code: {
            file: 'stats.py', fn: 'covariance', notes: [
              ['def covariance(xs, ys):', ['Two lists, paired.']],
              ['mx, my = mean(xs), mean(ys)', ['$\\bar x$ and $\\bar y$.']],
              ['total = 0.0', ['Running total.']],
              ['for x, y in zip(xs, ys):', ['Each point…']],
              ['total += (x - mx) * (y - my)', ['…the product of its two deviations.'], { tex: '(x_i - \\bar x)(y_i - \\bar y)' }],
              ['return total / len(xs)', ['Averaged.']],
            ],
          },
        },
        {
          code: {
            file: 'stats.py', fn: 'correlation', notes: [
              ['def correlation(xs, ys):', ['Covariance without units.']],
              ['return covariance(xs, ys) / math.sqrt(covariance(xs, xs) * covariance(ys, ys))', ['$\\mathrm{Cov}(X, X)$ is the variance, so its root is σ.'], { tex: '\\rho = \\frac{\\mathrm{Cov}(X,Y)}{\\sigma_X\\sigma_Y}' }],
            ],
          },
        },
        { figure: 'ScatterFig', caption: 'Drag the points. Each point\'s rectangle (deviation × deviation) is positive in the teal quadrants and negative in the orange ones; covariance is their average.' },
        {
          symbols: [
            ['\\mathrm{Cov}(X,Y)', 'covariance of X and Y', 'the average product of deviations', 'covariance(xs, ys)'],
            ['\\rho', 'rho', 'correlation, from −1 to 1', 'correlation(xs, ys)'],
            ['\\Sigma', 'capital sigma (not a sum!)', 'a covariance matrix', 'C'],
          ],
        },
        {
          predict: {
            prompt: 'For $x = (1, 2, 3, 4, 5)$ and $y = (2, 3, 5, 4, 6)$, what is the covariance?',
            answer: covariance(XS, YS), tolerance: 1e-9, compute: () => covariance(XS, YS),
            explain: 'Deviations: $x$ −2, −1, 0, 1, 2; $y$ −2, −1, 1, 0, 2. Products 4, 1, 0, 0, 4: sum 9, divided by 5: 1.8.',
          },
        },
        {
          predict: {
            prompt: 'And their correlation? (2 decimals)',
            answer: correlation(XS, YS), tolerance: 0.006, compute: () => correlation(XS, YS),
            explain: 'Both have variance 2, so $\\rho = 1.8 / 2 = 0.9$: a strong rising relationship.',
          },
        },
        { note: 'Covariance: average product of deviations (sign = direction). Correlation: covariance ÷ both σs, in [−1, 1]. Correlation ≠ causation. Σ collects all covariances.' },
      ],
    },

    {
      id: 'pca', title: 'PCA: the directions data spreads along',
      goal: 'Find the principal components of 2D data as eigenvectors of its covariance matrix, and use them to reduce dimensions.',
      builds: ['covariance', 'eigenvectors'],
      blocks: [
        { md: `A cloud of data points usually isn't round: it stretches out more in some directions than others. **Principal component analysis** (PCA) finds those directions. The first principal component is the direction along which the data varies most; the second is the most-varying direction at right angles to the first; and so on.

They are exactly the **eigenvectors of the covariance matrix** (lesson [[#eigenvectors]]), and each eigenvalue is the **variance along its direction**. Why, in two steps.

**Step 1: the variance along a direction is $\\mathbf v^\\top\\Sigma\\mathbf v$.** Centre the data: point $i$ becomes $(a_i, b_i)$, its distances from the mean in each coordinate. Its position along a unit direction $\\mathbf v = (v_1, v_2)$ is the dot product $t_i = v_1a_i + v_2b_i$ (lesson [[#dot-product]]: length 1 times the point's length times $\\cos\\theta$, which is how far along $\\mathbf v$ it reaches). The $t_i$ average to 0, so their variance is the average of $t_i^2$. Multiply out $(v_1a_i + v_2b_i)^2$ and average term by term:

$$\\overline{t^2} = v_1^2\\,\\overline{a^2} + 2v_1v_2\\,\\overline{ab} + v_2^2\\,\\overline{b^2} = v_1^2\\Sigma_{11} + 2v_1v_2\\Sigma_{12} + v_2^2\\Sigma_{22} = \\mathbf v^\\top\\Sigma\\,\\mathbf v$$

(the averages are the variances and the covariance, the entries of $\\Sigma$; the last step is just $\\mathbf v^\\top\\Sigma\\mathbf v$ written out).

**Step 2: the top eigenvector makes it largest.** $\\Sigma$ is symmetric, and a symmetric matrix has eigenvectors at right angles to each other (here you can check: $(1, 1)$ and $(1, -1)$ have dot product 0; in general this is the *spectral theorem*, taken on trust for now). Call the unit eigenvectors $\\mathbf e_1, \\mathbf e_2$, with eigenvalues $\\lambda_1 \\ge \\lambda_2$. Any unit direction is $\\mathbf v = c_1\\mathbf e_1 + c_2\\mathbf e_2$ with $c_1^2 + c_2^2 = 1$ (Pythagoras, since the two are at right angles). Then $\\Sigma\\mathbf v = c_1\\lambda_1\\mathbf e_1 + c_2\\lambda_2\\mathbf e_2$, and dotting with $\\mathbf v$ (the cross terms vanish because $\\mathbf e_1\\cdot\\mathbf e_2 = 0$):

$$\\mathbf v^\\top\\Sigma\\,\\mathbf v = \\lambda_1c_1^2 + \\lambda_2c_2^2 \\le \\lambda_1(c_1^2 + c_2^2) = \\lambda_1$$

with equality exactly when $\\mathbf v = \\pm\\mathbf e_1$. So the most-varying direction is the top eigenvector, and the variance along it is $\\lambda_1$.

For our five points, $\\Sigma = \\begin{pmatrix} 2 & 1.8 \\\\ 1.8 & 2 \\end{pmatrix}$. Its eigenvalues are 3.8 and 0.2: almost all the spread (95%) is along the first direction, the diagonal. So we could describe each point by **one** number (its position along that diagonal) and lose little. That is **dimensionality reduction**: 784 pixel values can often be squeezed into a few dozen principal components that keep most of the variation, for plotting, compressing or speeding up a model.` },
        {
          code: {
            file: 'stats.py', fn: 'pca2', notes: [
              ['def pca2(xs, ys):', ['2D data, as two lists.']],
              ['C = [[covariance(xs, xs), covariance(xs, ys)], [covariance(xs, ys), covariance(ys, ys)]]', ['The covariance matrix Σ: variances on the diagonal, the covariance off it.']],
              ['big, small = eigen2(C)', ['Its eigenvalues: the variance along each principal direction.']],
              ['return eigenvector2(C, big), big, small', ['The first principal direction, and both variances.']],
            ],
          },
        },
        { figure: 'PCAFig', caption: 'Drag the points. The long arrow is the first principal component, the short one the second; their lengths show the spread along each.' },
        { python: { program: 'stats', label: 'Run Part [[#part:part4]] in real Python' } },
        {
          code: {
            file: 'stats.py', fn: 'show_stats', notes: [
              ['def show_stats():', ['What the Python tab runs.']],
              ['p = distribution(two_dice())', ['Lesson [[#distributions]].']],
              ['print("P(total = 7):", probability(lambda t: t == 7, two_dice()), " E[X]:", expectation(p), " Var:", variance(p))', ['Lessons [[#probability]], [[#expectation]], [[#variance]].']],
              ['print("P(ill | positive):", bayes(0.01, 0.9, 0.05))', ['Lesson [[#bayes]].']],
              ['flips = [1, 1, 0, 1, 0, 1, 1, 0, 1, 1]', ['Lesson [[#likelihood]]\'s coin.']],
              ['print("likelihood at 0.5 and 0.7:", likelihood(0.5, flips), likelihood(0.7, flips))', ['Lesson [[#likelihood]]: the biased coin explains the flips better.']],
              ['print("first principal direction:", pca2([1, 2, 3, 4, 5], [2, 3, 5, 4, 6]))', ['This lesson.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'For our five points, what fraction of the total variance lies along the first principal component? (2 decimals)',
            answer: pca2(XS, YS)[1] / (pca2(XS, YS)[1] + pca2(XS, YS)[2]), tolerance: 0.006, compute: () => { const [, a, b] = pca2(XS, YS); return a / (a + b) },
            explain: '$3.8 / (3.8 + 0.2) = 0.95$: one direction explains 95% of the spread.',
          },
        },
        { note: 'PCA: the principal components are the eigenvectors of the covariance matrix, ordered by eigenvalue = variance along them. Keep the top few to reduce dimensions.' },
      ],
    },
  ],
}
