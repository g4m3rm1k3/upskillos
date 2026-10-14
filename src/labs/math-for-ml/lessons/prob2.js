// Probability additions, part one, placed inside the probability part by lessons/index.js: the axioms
// and inclusion–exclusion, independence, the common distributions and how to sample them, joint and
// marginal distributions, sums of random variables, the law of large numbers, and the central limit
// theorem.
import { inclusionExclusion, independent, poissonPmf, binomialPmf, sampleExponential, PyRandom, marginal, conditionalGivenY, chebyshevBound, runningMeans, standardizedSums } from '../engine/maths.js'
import { f } from './util.js'

const DICE = []
for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) DICE.push([a, b])
const JOINT = new Map([[['sun', 'walk'], 0.4], [['sun', 'bus'], 0.1], [['rain', 'walk'], 0.1], [['rain', 'bus'], 0.4]])

export const PROB2 = [
  {
    id: 'axioms', title: 'The rules of probability, and inclusion–exclusion',
    goal: 'State the three axioms every probability obeys, derive the complement and "or" rules from them, and count "at least one of several" with inclusion–exclusion.',
    builds: ['probability', 'sets', 'combinations'],
    blocks: [
      { md: `Lesson [[#probability]] computed probabilities by counting equally likely outcomes. Most real situations aren't equally likely (a biased coin, tomorrow's weather), so mathematicians boiled probability down to three rules that **every** sensible assignment of chances must obey, counted or not. Everything else is derived from them.

There is a set $\\Omega$ (omega) of all possible outcomes, the **sample space**. An **event** is a set of outcomes (lesson [[#sets]]), and $P$ assigns each event a number:

1. $P(A) \\ge 0$ for every event: no negative chances.
2. $P(\\Omega) = 1$: something certainly happens.
3. If $A$ and $B$ can't both happen ($A \\cap B = \\emptyset$), then $P(A \\cup B) = P(A) + P(B)$. (The full version allows any list, even an endless one, of events that can't overlap.)

**Two rules derived from them.**
- **Complement:** $A$ and "not $A$" ($A^c$) don't overlap and together make $\\Omega$, so axiom 3 then 2: $P(A) + P(A^c) = 1$, so $P(A^c) = 1 - P(A)$.
- **"Or" for overlapping events:** split $A \\cup B$ into three non-overlapping pieces: $A$ only, $B$ only, and both. Then $P(A \\cup B) = P(A \\text{ only}) + P(B \\text{ only}) + P(A \\cap B)$. Since $P(A) = P(A \\text{ only}) + P(A \\cap B)$ and likewise for $B$, adding $P(A) + P(B)$ counts the overlap **twice**, so

$$P(A \\cup B) = P(A) + P(B) - P(A \\cap B)$$

**Inclusion–exclusion** extends this to more events. For three:

$$P(A \\cup B \\cup C) = P(A) + P(B) + P(C) - P(A\\cap B) - P(A \\cap C) - P(B \\cap C) + P(A \\cap B \\cap C)$$

Add the singles, subtract the pairs, add back the triples, and so on with alternating signs. Why it counts correctly: an outcome lying in exactly $m$ of the events is counted $\\binom m1$ times by the singles, subtracted $\\binom m2$ times by the pairs, added $\\binom m3$ times by the triples… In total $\\binom m1 - \\binom m2 + \\binom m3 - \\dots$, and that is exactly 1: by the binomial theorem (lesson [[#binomial]]), $0 = (1 - 1)^m = \\sum_k \\binom mk(-1)^k = 1 - \\left[\\binom m1 - \\binom m2 + \\dots\\right]$. Every outcome in the union is counted exactly once. $\\blacksquare$` },
      { figure: 'InclusionExclusionFig', caption: 'Three overlapping events on two dice. Each outcome shows how many times the singles, pairs and triple count it; the alternating total is always exactly 1 inside the union.' },
      {
        code: {
          file: 'chance.py', fn: 'prob', notes: [
            ['def prob(event, outcomes):', ['Counting, for checking the rules on equally likely outcomes.']],
            ['return Fraction(sum(1 for o in outcomes if event(o)), len(outcomes))', ['Favourable over total, as an exact fraction.']],
          ],
        },
      },
      {
        code: {
          file: 'chance.py', fn: 'inclusion_exclusion', notes: [
            ['def inclusion_exclusion(events, outcomes):', ['Several events, as tests on an outcome.']],
            ['total = Fraction(0)', ['The running alternating sum.']],
            ['for size in range(1, len(events) + 1):', ['Singles, then pairs, then triples, …']],
            ['sign = 1 if size % 2 else -1', ['Add odd-sized groups, subtract even-sized ones.']],
            ['for group in combinations(events, size):', ['Every group of that size (lesson [[#combinations]]: $\\binom{n}{\\text{size}}$ of them).']],
            ['total += sign * prob(lambda o: all(e(o) for e in group), outcomes)', ['$\\pm P(\\text{all events in the group happen})$.']],
            ['return total', ['$P(\\text{at least one})$.'], { tex: 'P\\Big(\\bigcup_i A_i\\Big) = \\sum_{k\\ge1}(-1)^{k+1}\\!\\!\\sum_{|G| = k}\\!P\\Big(\\bigcap_{i\\in G}A_i\\Big)' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'Two dice. What is $P(\\text{first is 6, or second is 6, or the total is 7})$? (as a decimal, 4 places)',
          answer: inclusionExclusion([o => o[0] === 6, o => o[1] === 6, o => o[0] + o[1] === 7], DICE), tolerance: 0.00006,
          compute: () => inclusionExclusion([o => o[0] === 6, o => o[1] === 6, o => o[0] + o[1] === 7], DICE),
          explain: 'Singles $\\frac{6 + 6 + 6}{36}$; pairs: (6, 6) is in the first two, (6, 1) in the first and third, (1, 6) in the second and third: $\\frac3{36}$; no outcome is in all three. $\\frac{18 - 3}{36} = \\frac{15}{36} \\approx 0.4167$.',
        },
      },
      {
        choice: {
          prompt: 'Which follows from the three axioms alone?',
          options: [
            { text: '$P(A) \\le 1$ for every event $A$', why: 'Yes: $P(A) = 1 - P(A^c)$ and $P(A^c) \\ge 0$.' },
            { text: '$P(A \\cap B) = P(A)P(B)$', why: 'Only for independent events (next lesson). It isn\'t a general rule.' },
            { text: 'Every outcome is equally likely', why: 'The axioms deliberately allow unequal chances; equal likelihood is a special case.' },
          ],
          answer: 0,
        },
      },
      { note: 'Axioms: $P \\ge 0$, $P(\\Omega) = 1$, non-overlapping events add. Derived: $P(A^c) = 1 - P(A)$ and $P(A\\cup B) = P(A) + P(B) - P(A \\cap B)$. Inclusion–exclusion: add singles, subtract pairs, add triples…; each outcome in the union counts $1 - (1-1)^m = 1$ time.' },
    ],
  },

  {
    id: 'independence', title: 'Independence, properly',
    goal: 'Define independence by $P(A \\cap B) = P(A)P(B)$, connect it to "knowing $B$ doesn\'t change $A$", and spot events that are pairwise independent but not independent together.',
    builds: ['conditional', 'axioms'],
    blocks: [
      { md: `Lesson [[#probability]] multiplied chances for "two sixes" because the dice "don't affect each other". Now make that exact.

**Definition.** Events $A$ and $B$ are **independent** when

$$P(A \\cap B) = P(A)\\,P(B)$$

**What it means.** By lesson [[#conditional]]'s product rule, $P(A \\cap B) = P(A \\mid B)\\,P(B)$. Comparing (when $P(B) > 0$): independence says exactly $P(A \\mid B) = P(A)$. **Learning that $B$ happened doesn't change the chance of $A$.**

**Independence is about numbers, not causes.** On two dice, "the first die is even" and "the total is 7" are independent, even though the total obviously depends on the first die: $P(\\text{even}) = \\frac12$, $P(\\text{total } 7) = \\frac16$, and $P(\\text{both}) = \\frac{3}{36} = \\frac1{12} = \\frac12\\cdot\\frac16$. Whatever the first die shows, exactly one value of the second makes 7. By contrast "the first die is 6" and "the total is 12" are **dependent**: $P(\\text{both}) = \\frac1{36}$ but $\\frac16\\cdot\\frac1{36}$ is much smaller.

**More than two events.** $A$, $B$, $C$ are (mutually) independent if **every** sub-group multiplies: all three pairs **and** $P(A\\cap B\\cap C) = P(A)P(B)P(C)$. Pairs aren't enough. Flip two fair coins; let $A$ = "first is heads", $B$ = "second is heads", $C$ = "they match". Each pair is independent (check: $P(A \\cap C) = P(\\text{HH}) = \\frac14 = \\frac12\\cdot\\frac12$). But all three together: $P(A \\cap B \\cap C) = P(\\text{HH}) = \\frac14$, not $\\frac18$. Knowing $A$ and $B$ settles $C$.

**Random variables** $X$ and $Y$ are independent when every event about $X$ is independent of every event about $Y$: $P(X = x, Y = y) = P(X = x)P(Y = y)$ for all $x, y$ (for densities, $p(x, y) = p(x)\\,p(y)$).

**In ML** almost every derivation starts "assume the examples are **i.i.d.**": independent and identically distributed. That is what lets lesson [[#likelihood]] multiply the probabilities of the examples, and lesson [[#sampling]] add their variances. When data violates it (time series, repeated measurements of the same person), those formulas mislead.` },
      { figure: 'IndependenceFig', caption: 'The 36 outcomes of two dice. Pick two events: the grid shows $A$, $B$ and their overlap, and compares $P(A \\cap B)$ with $P(A)P(B)$.' },
      {
        code: {
          file: 'chance.py', fn: 'independent', notes: [
            ['def independent(A, B, outcomes):', ['Two events and equally likely outcomes.']],
            ['return prob(lambda o: A(o) and B(o), outcomes) == prob(A, outcomes) * prob(B, outcomes)', ['The definition, with exact fractions so "equal" really means equal.'], { tex: 'P(A\\cap B) = P(A)\\,P(B)' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'Are "the first die is even" and "the total is 7" independent? (1 for yes, 0 for no)',
          answer: 1, compute: () => Number(independent(o => o[0] % 2 === 0, o => o[0] + o[1] === 7, DICE)),
          explain: 'Yes: $\\frac{3}{36} = \\frac12 \\times \\frac16$.',
        },
      },
      {
        predict: {
          prompt: 'Are "the first die is 6" and "the total is 12" independent? (1 for yes, 0 for no)',
          answer: 0, compute: () => Number(independent(o => o[0] === 6, o => o[0] + o[1] === 12, DICE)),
          explain: 'No: $P(\\text{both}) = \\frac1{36}$, but $P(A)P(B) = \\frac16 \\times \\frac1{36}$. Knowing the total is 12 makes the 6 certain.',
        },
      },
      { note: 'Independent: $P(A\\cap B) = P(A)P(B)$, equivalently $P(A\\mid B) = P(A)$. A statement about probabilities, not causes. Three or more events need every sub-group to multiply; pairwise is not enough. i.i.d. data is what lets likelihoods multiply.' },
    ],
  },

  {
    id: 'common-distributions', title: 'The distributions you keep meeting, and how to sample them',
    goal: 'Know the Bernoulli, binomial, categorical, Poisson, uniform and exponential distributions with their means, derive the Poisson as a limit of the binomial, and sample any distribution with the inverse-transform trick.',
    builds: ['normal', 'binomial', 'number-e', 'inverse-derivative'],
    blocks: [
      { md: `A handful of distributions cover most of what papers assume. Each has a story that says when it applies.

**Discrete** (countable values):
- **Bernoulli($p$)**: one yes/no trial; $P(1) = p$, $P(0) = 1 - p$. Mean $p$, variance $p(1 - p)$. A single binary label.
- **Binomial($n$, $p$)**: the number of successes in $n$ independent Bernoulli trials (lesson [[#binomial]]). Mean $np$ (a sum of $n$ Bernoulli means).
- **Categorical($\\mathbf p$)**: one trial with $K$ outcomes, $P(k) = p_k$. A softmax output is a categorical distribution over classes or next tokens.
- **Poisson($\\lambda$)**: the number of events in a fixed window when they happen independently at average rate $\\lambda$ (emails per hour, typos per page). $P(k) = e^{-\\lambda}\\frac{\\lambda^k}{k!}$, mean $\\lambda$.

**Where the Poisson formula comes from.** Chop the window into $n$ tiny slots, each with an event independently with chance $\\lambda/n$: that's Binomial($n$, $\\lambda/n$). Then
$$\\binom nk\\left(\\frac\\lambda n\\right)^k\\left(1 - \\frac\\lambda n\\right)^{n-k} = \\frac{n(n-1)\\cdots(n-k+1)}{n^k}\\cdot\\frac{\\lambda^k}{k!}\\cdot\\left(1 - \\frac\\lambda n\\right)^{n}\\left(1 - \\frac\\lambda n\\right)^{-k}$$
As $n$ grows: the first fraction tends to 1 (as in lesson [[#number-e]]), $\\left(1 - \\frac\\lambda n\\right)^n \\to e^{-\\lambda}$ (lesson [[#number-e]]'s step 1 with $x = -\\lambda$), and the last factor tends to 1. What's left is $e^{-\\lambda}\\frac{\\lambda^k}{k!}$.

**Continuous** (densities):
- **Uniform($a$, $b$)**: density $\\frac{1}{b-a}$ on $[a, b]$. Mean $\\frac{a+b}2$, variance $\\frac{(b-a)^2}{12}$ (from $\\int x^2$, lesson [[#fundamental-theorem]]).
- **Exponential($\\lambda$)**: the waiting time until the next Poisson event. $P(\\text{wait} > t)$ = $P(\\text{no events in } [0, t]) = e^{-\\lambda t}$ (the Poisson formula with $k = 0$ and rate $\\lambda t$). So the density is the slope of $P(\\text{wait} \\le t) = 1 - e^{-\\lambda t}$: $\\lambda e^{-\\lambda t}$. Mean $\\frac1\\lambda$.
- **Normal**: lesson [[#normal]].

**Sampling any distribution: the inverse transform.** A computer gives you uniform numbers $U$ in $(0, 1)$. Let $F(x) = P(X \\le x)$ be the **cumulative distribution function** (CDF) you want; it rises from 0 to 1. Set $X = F^{-1}(U)$. Then $P(X \\le x) = P(U \\le F(x)) = F(x)$, since a uniform $U$ lands below any number $c$ in $[0, 1]$ with chance $c$. So $X$ has exactly the distribution $F$. For the exponential, solve $u = 1 - e^{-\\lambda x}$: $x = -\\frac{\\ln(1 - u)}{\\lambda}$. For a categorical, $F$ is a staircase: walk along the running sums $p_1, p_1 + p_2, \\dots$ until passing $U$. That is how every "sample from the softmax" in a language model works.` },
      { figure: 'DistributionGalleryFig', caption: 'Pick a distribution and its parameters: its probabilities or density, its mean, and a histogram of draws made by the inverse transform, which settles onto the shape as the draws pile up.' },
      {
        code: {
          file: 'chance.py', fn: 'poisson_pmf', notes: [
            ['def poisson_pmf(k, lam):', ['A count and the average rate.']],
            ['return math.exp(-lam) * lam ** k / math.factorial(k)', ['$e^{-\\lambda}\\lambda^k/k!$, the binomial\'s limit.'], { tex: 'P(k) = e^{-\\lambda}\\frac{\\lambda^k}{k!}' }],
          ],
        },
      },
      {
        code: {
          file: 'chance.py', fn: 'exponential_pdf', notes: [
            ['def exponential_pdf(x, rate):', ['A waiting time and the event rate $\\lambda$.']],
            ['return rate * math.exp(-rate * x) if x >= 0 else 0.0', ['$\\lambda e^{-\\lambda x}$ for $x \\ge 0$; no negative waits.']],
          ],
        },
      },
      {
        code: {
          file: 'chance.py', fn: 'sample_exponential', notes: [
            ['def sample_exponential(rate, rng):', ['The rate and a random generator.']],
            ['u = 1.0 - rng.random()', ['A uniform number in $(0, 1]$ (`random()` can return 0 but never 1, so this can\'t be 0, and the log below is safe).']],
            ['return -math.log(u) / rate', ['$F^{-1}$: $-\\ln(u)/\\lambda$ (with $u$ in place of $1 - u$, which is just as uniform).'], { tex: 'X = F^{-1}(U) = -\\frac{\\ln U}{\\lambda}' }],
          ],
        },
      },
      {
        code: {
          file: 'chance.py', fn: 'sample_categorical', notes: [
            ['def sample_categorical(ps, rng):', ['Probabilities adding to 1.']],
            ['u = rng.random()', ['One uniform draw.']],
            ['total = 0.0', ['The running sum: the staircase CDF.']],
            ['for i, p in enumerate(ps):', ['Walk along the categories…']],
            ['total += p', ['…adding each probability…']],
            ['if u < total:', ['…until the staircase passes $u$:']],
            ['return i', ['that category. Category $i$ wins a stretch of length $p_i$, so it wins with chance $p_i$.']],
            ['return len(ps) - 1', ['Rounding can leave the total a hair below 1; then the last category.']],
          ],
        },
      },
      {
        predict: {
          prompt: 'A support desk gets 3 calls an hour on average. What is the chance of no calls in an hour? (4 decimals)',
          answer: poissonPmf(0, 3), tolerance: 0.00006, compute: () => poissonPmf(0, 3),
          explain: `$e^{-3} = ${f(poissonPmf(0, 3))}$. Compare Binomial($1000$, $0.003$) at 0: ${f(binomialPmf(0, 1000, 0.003))}, nearly the same.`,
        },
      },
      {
        predict: {
          prompt: 'Draw 20,000 exponential waiting times with rate 2 by the inverse transform. What is their average? (2 decimals)',
          answer: 0.5, tolerance: 0.011, compute: () => { const rng = new PyRandom(1); let s = 0; for (let i = 0; i < 20000; i++) s += sampleExponential(2, rng); return s / 20000 },
          explain: 'About $\\frac1\\lambda = 0.5$: two events per unit time means half a unit between them on average.',
        },
      },
      { note: 'Bernoulli $p$; binomial $np$; categorical $p_k$ (softmax outputs); Poisson $e^{-\\lambda}\\lambda^k/k!$ = binomial with many tiny slots; uniform $\\frac1{b-a}$; exponential $\\lambda e^{-\\lambda x}$, mean $1/\\lambda$. Inverse transform: $X = F^{-1}(U)$ has CDF $F$.' },
    ],
  },

  {
    id: 'joint-marginal', title: 'Joint, marginal and conditional distributions',
    goal: 'Read a joint distribution $p(x, y)$, get marginals by summing out a variable, get conditionals by slicing and rescaling, and factor a sequence with the chain rule of probability.',
    builds: ['independence', 'double-integrals', 'common-distributions'],
    blocks: [
      { md: `Two random quantities together, the weather $X$ and how you get to work $Y$, are described by their **joint distribution** $p(x, y) = P(X = x, Y = y)$: a table with one probability per pair, all adding to 1.

| | walk | bus |
|---|---|---|
| **sun** | 0.4 | 0.1 |
| **rain** | 0.1 | 0.4 |

**Marginals: sum out the other variable.** $P(\\text{sun}) = P(\\text{sun, walk}) + P(\\text{sun, bus}) = 0.5$, by axiom 3 (the two pairs can't both happen). In general

$$p(x) = \\sum_y p(x, y) \\qquad\\text{or, with densities,}\\qquad p(x) = \\int p(x, y)\\,dy$$

The name comes from writing these sums in the table's margins. "Marginalising out $y$" in a paper means exactly this.

**Conditionals: slice and rescale.** Given that it rained, only the "rain" row is possible; rescale it to add to 1:

$$p(y \\mid x) = \\frac{p(x, y)}{p(x)}$$

$P(\\text{bus} \\mid \\text{rain}) = \\frac{0.4}{0.5} = 0.8$. This is lesson [[#conditional]]'s definition, for whole distributions.

**Independence** (lesson [[#independence]]) is $p(x, y) = p(x)\\,p(y)$ for every cell: the table is an outer product of its margins. This table isn't: $P(\\text{sun, walk}) = 0.4$ but $0.5 \\times 0.5 = 0.25$.

**The chain rule of probability.** Rearranging the conditional: $p(x, y) = p(x)\\,p(y \\mid x)$. Apply it repeatedly to a sequence:

$$p(w_1, w_2, \\dots, w_T) = p(w_1)\\,p(w_2 \\mid w_1)\\,p(w_3 \\mid w_1, w_2)\\cdots = \\prod_{t=1}^{T} p(w_t \\mid w_{<t})$$

where $w_{<t}$ means "all the words before $t$". **This is exactly what a language model computes**: the probability of a whole text, one next-token conditional at a time. Training it with cross-entropy maximises this product (in log form, a sum).

For continuous variables everything is the same with integrals: probabilities are volumes under $p(x, y)$ (lesson [[#double-integrals]]), marginals integrate out a variable, and conditionals are slices rescaled by the marginal.` },
      { figure: 'JointTableFig', caption: 'Edit a 2 × 2 joint table (it renormalises to add to 1). The margins update; pick a row to see the conditional slice; the outer product of the margins shows whether the table is independent.' },
      {
        code: {
          file: 'chance.py', fn: 'marginal', notes: [
            ['def marginal(joint, axis):', ['A joint table as a dict from pairs to probabilities; `axis` 0 keeps $x$, 1 keeps $y$.']],
            ['out = {}', ['The marginal, built up.']],
            ['for xy, p in joint.items():', ['Every cell…']],
            ['out[xy[axis]] = out.get(xy[axis], 0) + p', ['…adds its probability to its row (or column) total.'], { tex: 'p(x) = \\sum_y p(x, y)' }],
            ['return out', ['The margin.']],
          ],
        },
      },
      {
        code: {
          file: 'chance.py', fn: 'conditional_given_y', notes: [
            ['def conditional_given_y(joint, y):', ['The table and the observed value of $Y$.']],
            ['py = sum(p for (a, b), p in joint.items() if b == y)', ['$p(y)$: the size of the slice.']],
            ['return {a: p / py for (a, b), p in joint.items() if b == y}', ['The slice, rescaled to add to 1.'], { tex: 'p(x\\mid y) = \\frac{p(x, y)}{p(y)}' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'From the table: what is $P(\\text{sun} \\mid \\text{walk})$?',
          answer: 0.8, tolerance: 1e-9, compute: () => conditionalGivenY(JOINT, 'walk').get('sun'),
          explain: '$\\frac{0.4}{0.4 + 0.1} = 0.8$: slice the "walk" column and rescale.',
        },
      },
      {
        predict: {
          prompt: 'What is the marginal $P(\\text{bus})$?',
          answer: 0.5, tolerance: 1e-9, compute: () => marginal(JOINT, 1).get('bus'),
          explain: '$0.1 + 0.4 = 0.5$: sum the "bus" column.',
        },
      },
      { note: 'Joint $p(x, y)$. Marginal: sum (or integrate) out the other variable. Conditional: $p(y\\mid x) = p(x, y)/p(x)$. Independent: $p(x, y) = p(x)p(y)$. Chain rule: $p(w_1, \\dots, w_T) = \\prod_t p(w_t \\mid w_{<t})$, what a language model computes.' },
    ],
  },

  {
    id: 'sums-of-variables', title: 'Sums of random variables',
    goal: 'Prove $\\mathbb E[X + Y] = \\mathbb E[X] + \\mathbb E[Y]$ always, derive $\\mathrm{Var}(X + Y) = \\mathrm{Var}X + \\mathrm{Var}Y + 2\\,\\mathrm{Cov}(X, Y)$, and find the whole distribution of a sum by convolution.',
    builds: ['joint-marginal', 'covariance'],
    blocks: [
      { md: `Losses are sums over examples, scores are sums of weighted inputs, returns are sums of rewards. Here is what adding random quantities does.

**Expectations always add.** Using the joint distribution and then the marginals of the last lesson:

$$\\mathbb E[X + Y] = \\sum_{x, y}(x + y)\\,p(x, y) = \\sum_x x\\underbrace{\\sum_y p(x, y)}_{p(x)} + \\sum_y y\\underbrace{\\sum_x p(x, y)}_{p(y)} = \\mathbb E[X] + \\mathbb E[Y]$$

No independence needed: this holds for **any** two random variables, however tangled.

**Variances add only up to a correction.** Write $A = X - \\mu_X$, $B = Y - \\mu_Y$. Then

$$\\mathrm{Var}(X + Y) = \\mathbb E[(A + B)^2] = \\mathbb E[A^2] + 2\\,\\mathbb E[AB] + \\mathbb E[B^2] = \\mathrm{Var}X + \\mathrm{Var}Y + 2\\,\\mathrm{Cov}(X, Y)$$

since $\\mathbb E[AB]$ is the covariance (lesson [[#covariance]]). If $X$ and $Y$ move together, the sum swings more; if they move oppositely, they partly cancel (**hedging**, and the reason averaging **correlated** models helps less than averaging independent ones). Independent variables have covariance 0: with $p(a, b) = p(a)p(b)$ the double sum factors, $\\mathbb E[AB] = \\sum_{a,b}ab\\,p(a)p(b) = \\big(\\sum_a a\\,p(a)\\big)\\big(\\sum_b b\\,p(b)\\big) = \\mathbb E[A]\\,\\mathbb E[B] = 0$, just as $(a_1 + a_2)(b_1 + b_2)$ multiplies out to every $a_ib_j$. So independent variances add exactly.

**Many terms.** For $n$ independent copies with mean $\\mu$ and variance $\\sigma^2$: the sum has mean $n\\mu$ and variance $n\\sigma^2$, so a standard deviation of only $\\sqrt n\\,\\sigma$. Spread grows slower than size. That is the whole reason averages settle down (next lesson).

**The whole distribution of a sum: convolution.** To get $X + Y = s$, $X$ can be any $x$ and then $Y$ must be $s - x$. For independent variables,

$$P(X + Y = s) = \\sum_x P(X = x)\\,P(Y = s - x)$$

the **convolution** of the two distributions. Two dice: each total $s$ collects every way to make it, giving the triangle peaking at 7. Convolve again and again and the shape smooths toward a bell: the central limit theorem, two lessons on. (The "convolution" in a convolutional network is the same sum, sliding one list along another.)` },
      { figure: 'ConvolutionFig', caption: 'Start from one die (flat). Each press adds one more die by convolution. Watch flat become triangle become bell; the mean grows like $n$, the spread only like $\\sqrt n$.' },
      {
        code: {
          file: 'chance.py', fn: 'mean', notes: [
            ['def mean(xs):', ['A list of values.']],
            ['return sum(xs) / len(xs)', ['Their average.']],
          ],
        },
      },
      {
        code: {
          file: 'chance.py', fn: 'variance', notes: [
            ['def variance(xs):', ['A list of values.']],
            ['m = mean(xs)', ['The mean.']],
            ['return sum((x - m) ** 2 for x in xs) / len(xs)', ['The average squared distance from it.']],
          ],
        },
      },
      {
        code: {
          file: 'chance.py', fn: 'covariance', notes: [
            ['def covariance(xs, ys):', ['Two lists, paired.']],
            ['mx, my = mean(xs), mean(ys)', ['Both means.']],
            ['return sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / len(xs)', ['The average product of deviations: $\\mathbb E[AB]$.']],
          ],
        },
      },
      {
        predict: {
          prompt: '$\\mathrm{Var}X = 4$, $\\mathrm{Var}Y = 9$, $\\mathrm{Cov}(X, Y) = -3$. What is $\\mathrm{Var}(X + Y)$?',
          answer: 7, compute: () => 4 + 9 + 2 * -3,
          explain: '$4 + 9 - 6 = 7$: negatively related, so they partly cancel.',
          misconceptions: [{ answer: 13, feedback: 'That would be right only if they were uncorrelated. Add $2\\,\\mathrm{Cov} = -6$.' }],
        },
      },
      {
        predict: {
          prompt: 'The sum of 100 independent dice: what is its standard deviation? (2 decimals; one die has variance $\\frac{35}{12}$)',
          answer: Math.sqrt(100 * 35 / 12), tolerance: 0.006, compute: () => Math.sqrt(100 * 35 / 12),
          explain: `$\\sqrt{100 \\times 35/12} = 10 \\times ${f(Math.sqrt(35 / 12))} = ${f(Math.sqrt(100 * 35 / 12))}$, while the mean is 350.`,
        },
      },
      { note: '$\\mathbb E[X + Y] = \\mathbb E X + \\mathbb E Y$ always. $\\mathrm{Var}(X + Y) = \\mathrm{Var}X + \\mathrm{Var}Y + 2\\mathrm{Cov}(X, Y)$; independent: just add. $n$ i.i.d. copies: mean $n\\mu$, spread $\\sqrt n\\sigma$. Distribution of a sum: convolution, $\\sum_x p(x)q(s - x)$.' },
    ],
  },

  {
    id: 'law-large-numbers', title: 'The law of large numbers, proved',
    goal: 'Prove Markov\'s and Chebyshev\'s inequalities, and use them to prove that an average of $n$ independent samples closes in on the true mean.',
    builds: ['sums-of-variables', 'inequalities'],
    blocks: [
      { md: `Every number you measure in ML (an accuracy, an average loss, a win rate) is an average of samples, used as a stand-in for a true mean. Why should that work? Three short steps.

**1. Markov's inequality.** If $X \\ge 0$ always, then for any $a > 0$:
$$P(X \\ge a) \\le \\frac{\\mathbb E[X]}{a}$$
Proof: the indicator $\\mathbb 1[X \\ge a]$ (lesson [[#piecewise]]) satisfies $a\\,\\mathbb 1[X \\ge a] \\le X$: when $X \\ge a$ the left side is $a \\le X$, and otherwise it is $0 \\le X$. Take expectations (they keep $\\le$, being weighted sums with non-negative weights): $a\\,P(X \\ge a) \\le \\mathbb E[X]$. $\\blacksquare$ (A quantity averaging 1 can exceed 10 at most a tenth of the time.)

**2. Chebyshev's inequality.** Apply Markov to the non-negative $(X - \\mu)^2$ with $a = \\varepsilon^2$: $P(|X - \\mu| \\ge \\varepsilon) = P((X - \\mu)^2 \\ge \\varepsilon^2) \\le \\frac{\\mathbb E[(X-\\mu)^2]}{\\varepsilon^2}$, so
$$P(|X - \\mu| \\ge \\varepsilon) \\le \\frac{\\sigma^2}{\\varepsilon^2}$$
Being $k$ standard deviations away has probability at most $1/k^2$, for **any** distribution with a variance.

**3. The (weak) law of large numbers.** Let $\\bar X_n$ be the average of $n$ independent samples with mean $\\mu$ and variance $\\sigma^2$. It has mean $\\mu$ and variance $\\sigma^2/n$ (last lesson, then scaling by $\\frac1n$). Chebyshev:
$$P\\big(|\\bar X_n - \\mu| \\ge \\varepsilon\\big) \\le \\frac{\\sigma^2}{n\\varepsilon^2} \\;\\xrightarrow{n\\to\\infty}\\; 0$$
For any tolerance $\\varepsilon$, however small, the chance that the average misses by more than $\\varepsilon$ goes to 0. $\\blacksquare$

**What it does and doesn't say.** It guarantees averages settle, and Chebyshev even gives a (pessimistic) sample size: to be within 0.01 of a probability (where $\\sigma^2 \\le \\frac14$) with 95% confidence, $\\frac{1/4}{n\\,(0.01)^2} \\le 0.05$ needs $n \\ge 50{,}000$. The central limit theorem will show far fewer suffice in practice. And it needs **independence and a finite variance**: average heavy-tailed quantities (some reward distributions are like this) and the average can keep lurching.` },
      { figure: 'LargeNumbersFig', caption: 'Running averages of die rolls, several runs at once. Each wanders early and then hugs 3.5. The shaded band is Chebyshev\'s guarantee for that many rolls: its width shrinks like $1/\\sqrt n$.' },
      {
        code: {
          file: 'chance.py', fn: 'chebyshev_bound', notes: [
            ['def chebyshev_bound(sigma, n, eps):', ['One sample\'s spread, the number averaged, and the tolerance.']],
            ['return sigma * sigma / (n * eps * eps)', ['$\\frac{\\sigma^2/n}{\\varepsilon^2}$: Chebyshev with the average\'s variance.'], { tex: 'P(|\\bar X_n - \\mu| \\ge \\varepsilon) \\le \\frac{\\sigma^2}{n\\varepsilon^2}' }],
          ],
        },
      },
      {
        code: {
          file: 'chance.py', fn: 'running_means', notes: [
            ['def running_means(n, seed=0):', ['How many rolls, and a seed for repeatable runs.']],
            ['rng = random.Random(seed)', ['A private random generator.']],
            ['total = 0', ['Running sum.']],
            ['out = []', ['The average after each roll.']],
            ['for i in range(1, n + 1):', ['Roll $i$…']],
            ['total += rng.randint(1, 6)', ['…a die…']],
            ['out.append(total / i)', ['…and record $\\bar X_i$.']],
            ['return out', ['The path of running averages.']],
          ],
        },
      },
      {
        predict: {
          prompt: 'For 100 dice ($\\sigma^2 = \\frac{35}{12}$), what does Chebyshev bound $P(|\\bar X - 3.5| \\ge 0.5)$ by? (3 decimals)',
          answer: chebyshevBound(Math.sqrt(35 / 12), 100, 0.5), tolerance: 0.0006, compute: () => chebyshevBound(Math.sqrt(35 / 12), 100, 0.5),
          explain: `$\\frac{35/12}{100 \\times 0.25} = ${f(chebyshevBound(Math.sqrt(35 / 12), 100, 0.5))}$: at most about 12%. (The true chance is far smaller, about 0.4%.)`,
        },
      },
      {
        predict: {
          prompt: 'One run of 2000 rolls (seed 0): what is the final running average? (2 decimals)',
          answer: runningMeans(2000, 0).at(-1), tolerance: 0.006, compute: () => runningMeans(2000, 0).at(-1),
          explain: `${f(runningMeans(2000, 0).at(-1))}: close to 3.5, as the law promises.`,
        },
      },
      { note: 'Markov: $P(X \\ge a) \\le \\mathbb E X/a$ for $X \\ge 0$. Chebyshev: $P(|X - \\mu| \\ge \\varepsilon) \\le \\sigma^2/\\varepsilon^2$. Law of large numbers: $P(|\\bar X_n - \\mu| \\ge \\varepsilon) \\le \\sigma^2/(n\\varepsilon^2) \\to 0$, for independent samples with finite variance.' },
    ],
  },

  {
    id: 'clt', title: 'The central limit theorem',
    goal: 'State the central limit theorem, watch it happen, and follow why: moment generating functions, Taylor\'s second order, and $e^{t^2/2}$.',
    builds: ['law-large-numbers', 'taylor', 'normal'],
    blocks: [
      { md: `The law of large numbers says averages settle at $\\mu$. The **central limit theorem** says **how they are spread around it** on the way: like a bell curve, whatever the original distribution.

**Statement.** Let $X_1, \\dots, X_n$ be independent copies of a quantity with mean $\\mu$ and finite variance $\\sigma^2$. Standardise their sum, subtracting its mean and dividing by its spread:
$$Z_n = \\frac{X_1 + \\dots + X_n - n\\mu}{\\sigma\\sqrt n}$$
As $n$ grows, $P(Z_n \\le z)$ closes in on $P(Z \\le z)$ for a standard normal $Z$, for every $z$. Flat dice, lopsided coins, skewed waiting times: all become bells.

**Why, in outline.** A clean tool for sums is the **moment generating function** $M_X(t) = \\mathbb E[e^{tX}]$. Two facts make it work:

1. **Sums become products.** For independent $X$ and $Y$: $M_{X+Y}(t) = \\mathbb E[e^{tX}e^{tY}] = \\mathbb E[e^{tX}]\\,\\mathbb E[e^{tY}]$ (expectations of products of independent things factor, lesson [[#sums-of-variables]]).
2. **Matching $M$ means matching distributions** (the *uniqueness theorem*; **taken on trust**, together with the step that limits of $M$ give limits of distributions).

Now let $Y_i = (X_i - \\mu)/\\sigma$, with mean 0 and variance 1, so $Z_n = \\frac{1}{\\sqrt n}\\sum Y_i$ and by fact 1, $M_{Z_n}(t) = \\left(M_Y(t/\\sqrt n)\\right)^n$. Expand $M_Y$ by Taylor (lesson [[#taylor]]): $e^{sY} = 1 + sY + \\frac{s^2Y^2}{2} + \\dots$, so $M_Y(s) = 1 + s\\,\\mathbb E[Y] + \\frac{s^2}{2}\\mathbb E[Y^2] + \\dots = 1 + \\frac{s^2}{2} + (\\text{smaller terms})$. With $s = t/\\sqrt n$:
$$M_{Z_n}(t) \\approx \\left(1 + \\frac{t^2/2}{n}\\right)^n \\;\\longrightarrow\\; e^{t^2/2}$$
by lesson [[#number-e]]'s $\\left(1 + \\frac xn\\right)^n \\to e^x$. And $e^{t^2/2}$ is exactly the $M$ of the standard normal: $\\int e^{tz}\\frac{e^{-z^2/2}}{\\sqrt{2\\pi}}dz$, completing the square $tz - \\frac{z^2}{2} = \\frac{t^2}{2} - \\frac{(z-t)^2}{2}$, is $e^{t^2/2}$ times the area of a shifted bell, 1 (lesson [[#gaussian-integral]]). By fact 2, $Z_n$ becomes normal.

Notice what the argument used: only the mean (0) and variance (1) of $Y$; the higher terms vanish as $n$ grows. **That is why the shape of the original distribution washes out.**

**Using it.** An average of $n$ samples is approximately $\\mathcal N(\\mu, \\sigma^2/n)$. So 95% of the time it lands within $1.96\\,\\sigma/\\sqrt n$ of $\\mu$: the "±" on every accuracy you report, far tighter than Chebyshev's guarantee. It needs independence and enough samples; with very skewed data, "enough" can be large.` },
      { figure: 'CLTFig', caption: 'Standardised sums of $n$ draws from a chosen distribution, as a histogram against the standard bell curve. At $n = 1$ you see the original shape; by $n = 12$ even the lopsided ones are bells.' },
      {
        code: {
          file: 'chance.py', fn: 'standardized_sums', notes: [
            ['def standardized_sums(n, trials, seed=0):', ['$n$ draws per sum, and how many sums.']],
            ['rng = random.Random(seed)', ['Repeatable randomness.']],
            ['mu, sd = n / 2, math.sqrt(n / 12)', ['A uniform(0, 1) draw has mean $\\frac12$ and variance $\\frac1{12}$, so the sum has mean $\\frac n2$ and spread $\\sqrt{n/12}$.']],
            ['return [(sum(rng.random() for _ in range(n)) - mu) / sd for _ in range(trials)]', ['Each trial: add $n$ draws, subtract the mean, divide by the spread: $Z_n$.'], { tex: 'Z_n = \\frac{\\sum X_i - n\\mu}{\\sigma\\sqrt n}' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'Of 5000 standardised sums of 12 uniform draws, what fraction land within $\\pm1$? (3 decimals)',
          answer: (() => { const z = standardizedSums(12, 5000, 0); return z.filter(v => Math.abs(v) <= 1).length / z.length })(), tolerance: 0.0006,
          compute: () => { const z = standardizedSums(12, 5000, 0); return z.filter(v => Math.abs(v) <= 1).length / z.length },
          explain: 'About 0.683, the normal\'s 68%, from sums of perfectly flat draws.',
        },
      },
      {
        predict: {
          prompt: 'A model is right on each of 400 independent test examples with probability 0.9. Using the CLT, what is the ± (1.96 standard deviations) on its measured accuracy? (3 decimals)',
          answer: 1.96 * Math.sqrt(0.9 * 0.1 / 400), tolerance: 0.0006, compute: () => 1.96 * Math.sqrt(0.9 * 0.1 / 400),
          explain: '$1.96\\sqrt{0.9 \\times 0.1/400} = 0.0294$: about ±3 percentage points.',
        },
      },
      { note: 'CLT: $\\frac{\\sum X_i - n\\mu}{\\sigma\\sqrt n}$ becomes standard normal, for independent draws with finite variance. Why: $M_{Z_n}(t) = (1 + \\frac{t^2}{2n} + \\dots)^n \\to e^{t^2/2}$, the normal\'s; only mean and variance survive. Averages: $\\approx\\mathcal N(\\mu, \\sigma^2/n)$, ±$1.96\\sigma/\\sqrt n$.' },
    ],
  },
]
