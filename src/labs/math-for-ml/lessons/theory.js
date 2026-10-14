// The learning-theory part: why training error flatters a model and how held-out data measures it,
// Hoeffding's inequality, the union bound and a first generalisation guarantee, PAC learning and the
// VC dimension, and double descent with the minimum-norm fit that gradient descent finds by itself.
import { trainAndTest, chebyshevTail, hoeffdingTail, samplesNeeded, finiteClassGap, intervalPatterns, sauerBound, fitFirstP } from '../engine/maths.js'
import { f } from './util.js'

export const THEORY = {
  id: 'theory', title: 'Part [[#part:theory]] · Learning theory: why learning works at all', lessons: [
    {
      id: 'generalisation', title: 'Training error, test error and generalisation',
      goal: 'Define true risk and empirical risk, prove that the chosen model\'s training error is optimistic on average, and measure true error honestly with held-out data and cross-validation.',
      builds: ['expectation', 'law-large-numbers', 'argmin', 'bias-variance'],
      blocks: [
        { md: `Every ML paper reports a number like "92.4% test accuracy". This part asks what that number means, why it can be trusted, and when it can't. It starts with two kinds of error.

**True risk.** A model $h$ makes predictions $h(x)$; a **loss** $\\ell(h(x), y) \\ge 0$ measures each miss (squared error, or 0/1 for wrong/right). The data come from some distribution $P$ over pairs $(x, y)$. The **true risk** (or test error, or generalisation error) is the expected loss on a fresh pair:
$$R(h) = \\mathbb E_{(x, y) \\sim P}\\big[\\ell(h(x), y)\\big]$$
This is the number we care about, and we can never compute it: $P$ is unknown.

**Empirical risk.** What we can compute is the average loss on $n$ training pairs drawn from $P$:
$$\\hat R_n(h) = \\frac1n\\sum_{i=1}^n \\ell(h(x_i), y_i)$$

**For a model fixed in advance, the empirical risk is honest.** If $h$ was chosen before the data were drawn, each $\\ell(h(x_i), y_i)$ is an independent random number with mean $R(h)$. By linearity of expectation (lesson [[#expectation]]), $\\mathbb E[\\hat R_n(h)] = \\frac1n \\cdot nR(h) = R(h)$: no bias. And the law of large numbers (lesson [[#law-large-numbers]]) says it closes in on $R(h)$ as $n$ grows.

**For the model training chose, it is optimistic.** Training picks the model with the lowest empirical risk, $\\hat h = \\arg\\min_h \\hat R_n(h)$ (lesson [[#argmin]]), using the same data. Take any model $h$ fixed in advance. Since $\\hat h$ won on this data, $\\hat R_n(\\hat h) \\le \\hat R_n(h)$, whatever the data. Take expectations of both sides:
$$\\mathbb E[\\hat R_n(\\hat h)] \\;\\le\\; \\mathbb E[\\hat R_n(h)] = R(h)$$
That holds for every fixed $h$, so it holds for the best one, $h^*$ with the lowest true risk. And $h^*$ is the best, so it beats whatever $\\hat h$ turned out to be: $R(h^*) \\le R(\\hat h)$ for every dataset, and so $R(h^*) \\le \\mathbb E[R(\\hat h)]$. Chain the two:
$$\\mathbb E\\big[\\hat R_n(\\hat h)\\big] \\;\\le\\; R(h^*) \\;\\le\\; \\mathbb E\\big[R(\\hat h)\\big]$$
On average, **the winner's training error is below even the best achievable true error**, which is below the winner's true error. The difference $R(\\hat h) - \\hat R_n(\\hat h)$ is the **generalisation gap**, and it is not negative on average. Why: the winner won partly by luck, by fitting the noise in this particular sample, and that luck does not carry over to new data.

**Overfitting, formally,** is a large gap: low training error, high true error. The richer the set of models training can choose from, the more ways it has to fit noise and the bigger the gap tends to be. A polynomial of degree 19 can pass exactly through 20 points, noise and all (lesson [[#bias-variance]] measured the same effect as variance).

**Measuring honestly: a test set.** Hold back $m$ pairs that training never sees. Given the training data, $\\hat h$ is fixed, and the test pairs are independent of it, so the test average is an unbiased estimate of $R(\\hat h)$, by the same linearity argument as before. The catch: **use it once**. If you try several models and keep the one with the best test score, you have trained on the test set, and the optimism argument above applies to the test score too (lesson [[#union-bound]] measures how much).

**Choosing settings: a validation set.** To choose a polynomial degree, a learning rate or an architecture, split off a third set, the **validation** set, and choose by validation error. The test set stays sealed until the end. Train / validation / test splits like 80/10/10 are standard.

**Cross-validation** reuses scarce data. Split it into $k$ **folds**. For each fold, train on the other $k - 1$ and measure error on the held-out fold; average the $k$ errors. Every point is held out exactly once, so all the data serve as both training and validation. It costs $k$ fits. With $k = n$ it is **leave-one-out**.

**The assumption underneath.** All of this assumes training and test pairs come from the same $P$, independently: **i.i.d.** (independent and identically distributed). When deployment data differ from training data (**distribution shift**: a new hospital's scanner, next year's slang), none of these guarantees apply, and papers on "out-of-distribution" generalisation are about exactly that.` },
        { figure: 'GeneralisationFig', caption: 'Twenty noisy points from $\\sin 3x$. Left: the least-squares polynomial of the chosen degree. Right: training error (teal) keeps falling as the degree rises; test error on 200 fresh points (orange, log scale) falls, flattens, then shoots up once the curve starts threading the noise.' },
        {
          code: {
            file: 'theory.py', fn: 'make_data', notes: [
              ['def make_data(n, noise, rng):', ['How many points, the noise\'s standard deviation, and a random generator (so the training and test sets come from one seed).']],
              ['xs = [rng.uniform(-1, 1) for _ in range(n)]', ['Inputs spread evenly over $[-1, 1]$.']],
              ['ys = [math.sin(3 * x) + rng.gauss(0, noise) for x in xs]', ['The true curve plus normal noise: $y = \\sin 3x + \\varepsilon$.']],
              ['return xs, ys', ['One sample from $P$.']],
            ],
          },
        },
        {
          code: {
            file: 'theory.py', fn: 'mean_squared_error', notes: [
              ['def mean_squared_error(coeffs, xs, ys):', ['A polynomial (its coefficients) and some points.']],
              ['return sum((poly_value(coeffs, x) - y) ** 2 for x, y in zip(xs, ys)) / len(xs)', ['The empirical risk with squared loss.'], { tex: '\\hat R = \\frac1n\\sum_i (h(x_i) - y_i)^2' }],
            ],
          },
        },
        {
          code: {
            file: 'theory.py', fn: 'train_and_test', notes: [
              ['def train_and_test(degree, n_train=20, n_test=200, noise=0.2, seed=1):', ['The model family (polynomials of this degree) and the experiment\'s sizes.']],
              ['rng = random.Random(seed)', ['One generator for everything, so the run is repeatable.']],
              ['xs, ys = make_data(n_train, noise, rng)', ['The training set…']],
              ['tx, ty = make_data(n_test, noise, rng)', ['…and a test set from the same distribution, drawn independently.']],
              ['coeffs = fit_poly(xs, ys, degree)', ['Training: least squares (lesson [[#bias-variance]]) sees only the training set.']],
              ['return mean_squared_error(coeffs, xs, ys), mean_squared_error(coeffs, tx, ty)', ['The training error $\\hat R_n(\\hat h)$ and an unbiased estimate of the true error $R(\\hat h)$.']],
            ],
          },
        },
        {
          code: {
            file: 'theory.py', fn: 'k_fold_error', notes: [
              ['def k_fold_error(xs, ys, degree, k):', ['Data, a model family, and how many folds.']],
              ['total = 0.0', ['The sum of the held-out errors.']],
              ['for fold in range(k):', ['Each fold takes its turn as the held-out part.']],
              ['train = [(x, y) for i, (x, y) in enumerate(zip(xs, ys)) if i % k != fold]', ['Points whose position isn\'t in this fold: the training part.']],
              ['held = [(x, y) for i, (x, y) in enumerate(zip(xs, ys)) if i % k == fold]', ['Every $k$-th point: the held-out part. Over all folds, each point is held out exactly once.']],
              ['coeffs = fit_poly([x for x, _ in train], [y for _, y in train], degree)', ['Fit without the held-out points…']],
              ['total += mean_squared_error(coeffs, [x for x, _ in held], [y for _, y in held])', ['…and measure on them: an honest error for this fold.']],
              ['return total / k', ['The average over folds: the cross-validation error.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'With the figure\'s data, what is the **test** error of the degree-3 fit? (4 decimals)',
            answer: trainAndTest(3)[1], tolerance: 0.00006, compute: () => trainAndTest(3)[1],
            explain: `${f(trainAndTest(3)[1])}, against a training error of ${f(trainAndTest(3)[0])}. The noise alone contributes $0.2^2 = 0.04$ to both, so degree 3 is already close to as good as it gets.`,
          },
        },
        {
          predict: {
            prompt: 'And the degree-12 fit\'s training error? (4 decimals)',
            answer: trainAndTest(12)[0], tolerance: 0.00006, compute: () => trainAndTest(12)[0],
            explain: `${f(trainAndTest(12)[0])}: below the noise level $0.04$, which no honest model can reach on new data. Its test error is ${f(trainAndTest(12)[1])}. Training error below the noise level is a sign of fitting the noise.`,
          },
        },
        {
          choice: {
            prompt: 'A team tries 50 hyperparameter settings, scores each on the test set, and reports the best test accuracy. What\'s wrong?',
            options: [
              { text: 'The reported number is optimistic: the test set was used to choose, so the winner\'s score includes luck', why: 'Right. The optimism argument applies to any data used for choosing. They should choose on a validation set and report the test score of the one chosen model.' },
              { text: 'Nothing, as long as the test set was never used for training the weights', why: 'Choosing among settings by test score is a form of training: the selection step fits the test set\'s noise.' },
              { text: 'Only that 50 settings is too few', why: 'More settings make it worse, not better: more chances for one to win by luck.' },
            ],
            answer: 0,
          },
        },
        { note: 'True risk $R(h) = \\mathbb E[\\ell]$ (unknowable); empirical risk $\\hat R_n(h)$ = average training loss. For a fixed $h$, $\\hat R_n$ is unbiased; for the trained $\\hat h$, $\\mathbb E[\\hat R_n(\\hat h)] \\le R(h^*) \\le \\mathbb E[R(\\hat h)]$. The gap is overfitting. Choose on validation data (or cross-validation), report test once. All assumes i.i.d. data.' },
      ],
    },

    {
      id: 'concentration', title: 'Hoeffding\'s inequality: averages concentrate exponentially fast',
      goal: 'Prove Hoeffding\'s inequality $P(|\\bar X - \\mu| \\ge \\varepsilon) \\le 2e^{-2n\\varepsilon^2}$ step by step from Markov\'s inequality, and turn it into a sample size.',
      builds: ['law-large-numbers', 'convexity', 'clt', 'fundamental-theorem', 'axioms', 'minimum'],
      blocks: [
        { md: `A test score is an average of $n$ per-example losses. How far can it be from the true risk? Lesson [[#law-large-numbers]] gave one answer, Chebyshev's inequality. This lesson proves a much stronger one.

**Chebyshev, for numbers in $[0, 1]$.** If each $X_i$ lies in $[0, 1]$ (a 0/1 loss, an accuracy), its variance is at most $\\frac14$: since $X^2 \\le X$ on $[0, 1]$, $\\text{Var}(X) = \\mathbb E[X^2] - \\mu^2 \\le \\mu - \\mu^2 = \\mu(1 - \\mu)$, and $\\mu(1 - \\mu) = \\frac14 - (\\mu - \\frac12)^2 \\le \\frac14$. The average $\\bar X$ of $n$ independent ones has variance at most $\\frac1{4n}$, so Chebyshev gives
$$P(|\\bar X - \\mu| \\ge \\varepsilon) \\le \\frac{1}{4n\\varepsilon^2}$$
It falls like $1/n$. To be wrong only once in a thousand, you'd need $n = 250/\\varepsilon^2$. The truth is far better.

**Hoeffding's inequality.** If $X_1, \\dots, X_n$ are independent, each in $[0, 1]$, with mean $\\mu$, then
$$P(\\bar X - \\mu \\ge \\varepsilon) \\le e^{-2n\\varepsilon^2} \\qquad\\text{and}\\qquad P(|\\bar X - \\mu| \\ge \\varepsilon) \\le 2e^{-2n\\varepsilon^2}$$
Exponential in $n$. Five steps.

**Step 1: the exponential trick (Chernoff).** Let $Y_i = X_i - \\mu$, which has mean 0 and lies in $[a, b] = [-\\mu, 1 - \\mu]$, an interval of width 1. Then $\\bar X - \\mu \\ge \\varepsilon$ means $\\sum Y_i \\ge n\\varepsilon$. For any $s > 0$, $e^{sz}$ is increasing, so this is the same event as $e^{s\\sum Y_i} \\ge e^{sn\\varepsilon}$. That is a non-negative random variable, so Markov's inequality applies:
$$P\\Big(\\sum Y_i \\ge n\\varepsilon\\Big) \\le \\frac{\\mathbb E\\big[e^{s\\sum Y_i}\\big]}{e^{sn\\varepsilon}}$$
We may pick any $s > 0$ we like at the end.

**Step 2: independence factorises.** $e^{s\\sum Y_i} = \\prod_i e^{sY_i}$, and the expectation of a product of independent things is the product of the expectations (as in lesson [[#clt]]): $\\mathbb E[e^{s\\sum Y_i}] = \\prod_i \\mathbb E[e^{sY_i}]$. So we need a bound on one factor.

**Step 3: Hoeffding's lemma.** *If $\\mathbb E[Y] = 0$ and $Y \\in [a, b]$, then $\\mathbb E[e^{sY}] \\le e^{s^2(b - a)^2/8}$.*

First, $a \\le 0 \\le b$ (if $a > 0$, $Y$ would always be positive and its mean couldn't be 0; likewise for $b$). Write any $y \\in [a, b]$ as a mixture of the ends: $y = \\lambda a + (1 - \\lambda) b$ with $\\lambda = \\frac{b - y}{b - a} \\in [0, 1]$. The function $e^{sy}$ is convex (its second derivative $s^2e^{sy}$ is positive), so its chord lies above it (lesson [[#convexity]]):
$$e^{sy} \\le \\frac{b - y}{b - a}e^{sa} + \\frac{y - a}{b - a}e^{sb}$$
Put $y = Y$ and take expectations; $\\mathbb E[Y] = 0$ leaves $\\mathbb E[e^{sY}] \\le \\frac{b}{b - a}e^{sa} - \\frac{a}{b - a}e^{sb}$. Name $\\theta = \\frac{-a}{b - a} \\in [0, 1]$ and $u = s(b - a) \\ge 0$. Then $\\frac{b}{b-a} = 1 - \\theta$, $sa = -\\theta u$ and $sb = (1 - \\theta)u$, so the bound is
$$(1 - \\theta)e^{-\\theta u} + \\theta e^{(1 - \\theta)u} = e^{-\\theta u}\\big(1 - \\theta + \\theta e^u\\big) = e^{\\varphi(u)}, \\qquad \\varphi(u) = -\\theta u + \\ln\\big(1 - \\theta + \\theta e^u\\big)$$
Now show $\\varphi(u) \\le u^2/8$. Differentiate (chain rule):
- $\\varphi(0) = \\ln 1 = 0$.
- $\\varphi'(u) = -\\theta + \\frac{\\theta e^u}{1 - \\theta + \\theta e^u} = -\\theta + q(u)$, where $q(u) = \\frac{\\theta e^u}{1 - \\theta + \\theta e^u}$ is a number in $[0, 1]$. At $u = 0$, $q = \\theta$, so $\\varphi'(0) = 0$.
- $\\varphi''(u) = q'(u)$; by the quotient rule, $q' = \\frac{\\theta e^u(1 - \\theta + \\theta e^u) - \\theta e^u \\cdot \\theta e^u}{(1 - \\theta + \\theta e^u)^2} = \\frac{\\theta e^u(1 - \\theta)}{(1 - \\theta + \\theta e^u)^2} = q(1 - q)$. And $q(1 - q) = \\frac14 - (q - \\frac12)^2 \\le \\frac14$.

Integrate twice with the fundamental theorem (lesson [[#fundamental-theorem]]): $\\varphi'(t) = \\varphi'(0) + \\int_0^t \\varphi'' \\le \\frac t4$ for $t \\ge 0$, then $\\varphi(u) = \\varphi(0) + \\int_0^u \\varphi'(t)\\,dt \\le \\int_0^u \\frac t4\\,dt = \\frac{u^2}{8}$. So $\\mathbb E[e^{sY}] \\le e^{u^2/8} = e^{s^2(b - a)^2/8}$. $\\blacksquare$

**Step 4: choose $s$.** Each of our $Y_i$ has $b - a = 1$, so Steps 1–3 give
$$P(\\bar X - \\mu \\ge \\varepsilon) \\le e^{-sn\\varepsilon}\\big(e^{s^2/8}\\big)^n = e^{-sn\\varepsilon + ns^2/8}$$
The exponent is a parabola in $s$, $\\frac n8 s^2 - n\\varepsilon s$, lowest where its derivative $\\frac n4 s - n\\varepsilon$ is 0 (lesson [[#minimum]]): $s = 4\\varepsilon$. There it equals $2n\\varepsilon^2 - 4n\\varepsilon^2 = -2n\\varepsilon^2$. So $P(\\bar X - \\mu \\ge \\varepsilon) \\le e^{-2n\\varepsilon^2}$.

**Step 5: both sides.** Apply the same to $1 - X_i$ (also in $[0, 1]$) for the lower tail, and combine with $P(A \\cup B) \\le P(A) + P(B)$ (lesson [[#axioms]]): $P(|\\bar X - \\mu| \\ge \\varepsilon) \\le 2e^{-2n\\varepsilon^2}$. $\\blacksquare$ (For values in $[a, b]$ instead of $[0, 1]$, the same steps give $2e^{-2n\\varepsilon^2/(b - a)^2}$.)

**The sample size.** Setting $2e^{-2n\\varepsilon^2} \\le \\delta$ and taking logs: $n \\ge \\frac{\\ln(2/\\delta)}{2\\varepsilon^2}$. The confidence enters only through $\\ln\\frac1\\delta$: going from 95% to 99.9% confidence multiplies $n$ by $\\ln 2000 / \\ln 40 \\approx 2.1$, where Chebyshev would multiply it by 50. That is why papers can say "with probability at least $1 - \\delta$" cheaply.

**In papers.** "With high probability" (w.h.p.) means with probability at least $1 - \\delta$ for a $\\delta$ you choose, at a cost of $\\log(1/\\delta)$. "Concentration inequalities" is the family name: Hoeffding, Bernstein (which also uses the variance), McDiarmid (for functions of many independent inputs).` },
        { figure: 'HoeffdingFig', caption: 'The chance that the mean of $n$ fair coin flips lands $\\varepsilon$ or more from ½, on a log scale. Dots: measured from 400 simulated runs at each $n$ (missing once no run strayed). Orange: Hoeffding\'s $2e^{-2n\\varepsilon^2}$. Grey: Chebyshev\'s $1/(4n\\varepsilon^2)$. Both bounds hold; Hoeffding\'s falls as fast as the truth does.' },
        {
          code: {
            file: 'theory.py', fn: 'chebyshev_tail', notes: [
              ['def chebyshev_tail(n, eps):', ['Sample size and distance.']],
              ['return min(1.0, 1 / (4 * n * eps * eps))', ['$\\sigma^2 \\le \\frac14$, so $\\text{Var}(\\bar X) \\le \\frac1{4n}$; capped at 1, since a probability can\'t exceed it.'], { tex: 'P(|\\bar X - \\mu| \\ge \\varepsilon) \\le \\frac{1}{4n\\varepsilon^2}' }],
            ],
          },
        },
        {
          code: {
            file: 'theory.py', fn: 'hoeffding_tail', notes: [
              ['def hoeffding_tail(n, eps):', ['The same question.']],
              ['return min(1.0, 2 * math.exp(-2 * n * eps * eps))', ['Steps 1–5\'s answer.'], { tex: 'P(|\\bar X - \\mu| \\ge \\varepsilon) \\le 2e^{-2n\\varepsilon^2}' }],
            ],
          },
        },
        {
          code: {
            file: 'theory.py', fn: 'simulated_tail', notes: [
              ['def simulated_tail(n, eps, p=0.5, trials=2000, seed=0):', ['Measure the true probability instead of bounding it.']],
              ['rng = random.Random(seed)', ['Repeatable randomness.']],
              ['hits = 0', ['Runs that strayed $\\varepsilon$ or more.']],
              ['for _ in range(trials):', ['Many independent experiments…']],
              ['heads = sum(1 for _ in range(n) if rng.random() < p)', ['…each $n$ coin flips, counting heads.']],
              ['if abs(heads - n * p) >= n * eps:', ['$|\\bar X - p| \\ge \\varepsilon$, multiplied through by $n$. Comparing counts avoids rounding trouble: $30/50 - 0.5$ comes out as $0.0999\\ldots$ in floating point (lesson [[#floating-point]]), which would wrongly fail $\\ge 0.1$.']],
              ['hits += 1', ['Count it.']],
              ['return hits / trials', ['The measured probability.']],
            ],
          },
        },
        {
          code: {
            file: 'theory.py', fn: 'samples_needed', notes: [
              ['def samples_needed(eps, delta):', ['Accuracy $\\varepsilon$, failure chance $\\delta$.']],
              ['return math.ceil(math.log(2 / delta) / (2 * eps * eps))', ['Solve $2e^{-2n\\varepsilon^2} \\le \\delta$ for $n$, rounded up to a whole number.'], { tex: 'n \\ge \\frac{\\ln(2/\\delta)}{2\\varepsilon^2}' }],
            ],
          },
        },
        {
          predict: {
            prompt: 'How many test examples guarantee an accuracy estimate within 0.05 of the truth with 95% confidence (Hoeffding)?',
            answer: samplesNeeded(0.05, 0.05), compute: () => samplesNeeded(0.05, 0.05),
            explain: `$\\ln(40)/(2 \\times 0.0025) = 737.8$, so ${samplesNeeded(0.05, 0.05)}. Chebyshev would ask for $1/(4 \\times 0.0025 \\times 0.05) = 2000$.`,
          },
        },
        {
          predict: {
            prompt: 'Hoeffding\'s bound for $n = 200$ and $\\varepsilon = 0.1$? (4 decimals)',
            answer: hoeffdingTail(200, 0.1), tolerance: 0.00006, compute: () => hoeffdingTail(200, 0.1),
            explain: `$2e^{-4} = ${f(hoeffdingTail(200, 0.1))}$, against Chebyshev's ${f(chebyshevTail(200, 0.1))}.`,
          },
        },
        {
          choice: {
            prompt: 'You want 99.99% confidence instead of 99%, with the same $\\varepsilon$. Roughly how many more test examples does Hoeffding say you need?',
            options: [
              { text: 'About twice as many', why: 'Right: $n \\propto \\ln(2/\\delta)$, and $\\ln 20000 / \\ln 200 \\approx 9.9/5.3 \\approx 1.9$.' },
              { text: 'About 100 times as many', why: 'That is Chebyshev\'s $1/\\delta$ scaling. Hoeffding\'s is logarithmic in $1/\\delta$.' },
              { text: 'The same number', why: 'Confidence isn\'t free, just cheap: it enters through $\\ln(1/\\delta)$.' },
            ],
            answer: 0,
          },
        },
        { note: 'Hoeffding: independent $X_i \\in [0, 1]$, $P(|\\bar X - \\mu| \\ge \\varepsilon) \\le 2e^{-2n\\varepsilon^2}$. Proof: Markov on $e^{s\\sum Y_i}$; independence factorises; Hoeffding\'s lemma $\\mathbb E e^{sY} \\le e^{s^2(b-a)^2/8}$ (chord, then $\\varphi\'\' \\le \\frac14$ integrated twice); best $s = 4\\varepsilon$. Sample size $n \\ge \\ln(2/\\delta)/(2\\varepsilon^2)$: confidence costs only a log.' },
      ],
    },

    {
      id: 'union-bound', title: 'The union bound and a first generalisation guarantee',
      goal: 'Prove the union bound, use it to make Hoeffding hold for every model in a finite class at once, and derive the guarantee $R(\\hat h) \\le R(h^*) + 2\\varepsilon$ for the trained model.',
      builds: ['concentration', 'generalisation', 'axioms', 'induction', 'logarithms', 'hypothesis-tests'],
      blocks: [
        { md: `Hoeffding's inequality (lesson [[#concentration]]) is about **one model fixed in advance**. But lesson [[#generalisation]] showed the trained model $\\hat h$ is not fixed in advance: it was chosen because it did well on this very data. The fix is to ask for more: make the training error close to the true error **for every model in the class at the same time**. Then it is close for whichever one training picks.

**The union bound.** For any events $A_1, \\dots, A_k$:
$$P(A_1 \\cup A_2 \\cup \\dots \\cup A_k) \\le P(A_1) + P(A_2) + \\dots + P(A_k)$$
Proof by induction (lesson [[#induction]]). For $k = 1$ it is an equality. For two events, inclusion–exclusion (lesson [[#axioms]]) gives $P(A \\cup B) = P(A) + P(B) - P(A \\cap B) \\le P(A) + P(B)$. If it holds for $k$ events, treat $A_1 \\cup \\dots \\cup A_k$ as one event $A$: $P(A \\cup A_{k+1}) \\le P(A) + P(A_{k+1}) \\le P(A_1) + \\dots + P(A_k) + P(A_{k+1})$. $\\blacksquare$ It is crude, since it counts overlaps twice, but it needs no independence at all.

**Every model at once.** Let $\\mathcal H$ be a finite class of $|\\mathcal H|$ models, with a loss in $[0, 1]$. For each model $h$, let $A_h$ be the bad event "$|\\hat R_n(h) - R(h)| > \\varepsilon$". Each $h$ is fixed in advance, so Hoeffding gives $P(A_h) \\le 2e^{-2n\\varepsilon^2}$. The union bound then gives
$$P\\big(\\text{some } h \\in \\mathcal H \\text{ has } |\\hat R_n(h) - R(h)| > \\varepsilon\\big) \\le 2|\\mathcal H|\\,e^{-2n\\varepsilon^2}$$
Set the right side equal to $\\delta$ and solve for $\\varepsilon$: $\\ln(2|\\mathcal H|) - 2n\\varepsilon^2 = \\ln\\delta$, so
$$\\varepsilon = \\sqrt{\\frac{\\ln|\\mathcal H| + \\ln(2/\\delta)}{2n}}$$
**With probability at least $1 - \\delta$, every model's training error is within this $\\varepsilon$ of its true error.**

**What it buys the trained model.** On that good event, let $h^*$ be the class's best model by true risk. Three steps, each using one fact:
$$R(\\hat h) \\;\\le\\; \\hat R_n(\\hat h) + \\varepsilon \\;\\le\\; \\hat R_n(h^*) + \\varepsilon \\;\\le\\; R(h^*) + 2\\varepsilon$$
The first and last use "every model is within $\\varepsilon$"; the middle uses "$\\hat h$ has the lowest training error". So **training by minimising training error (empirical risk minimisation, ERM) comes within $2\\varepsilon$ of the best model in the class**, with probability $1 - \\delta$.

**Reading the formula.**
- $\\varepsilon$ shrinks like $1/\\sqrt n$: four times the data halves the gap.
- The class size enters only as $\\ln|\\mathcal H|$. A million models cost $\\ln 10^6 \\approx 13.8$, as if $\\delta$ were a million times smaller. $\\ln|\\mathcal H|$ is about the number of bits needed to name a model, times $\\ln 2$: richer classes need more data, in proportion to their description length.
- A model with $k$ parameters stored as 32-bit floats lies in a class of at most $2^{32k}$ models, so $\\ln|\\mathcal H| \\le 22.2k$. The bound needs $n$ to be large compared with $k$. For a network with more parameters than training examples it says nothing useful (lesson [[#double-descent]] returns to this).

**Reusing a test set has the same price.** Score $k$ models on one test set of size $m$ and keep the best: the winner's score can be off by up to $\\sqrt{(\\ln k + \\ln(2/\\delta))/(2m)}$. This is why public leaderboards overfit over time, and why, with many hypothesis tests, a p-value threshold must be divided by the number of tests (the Bonferroni correction of lesson [[#hypothesis-tests]] is this same union bound).` },
        { figure: 'UnionBoundFig', caption: 'Threshold classifiers ("predict 1 when $x > t$") on noisy data whose true boundary is 0.3. Over 100 training sets: the chosen threshold\'s average training error sits below its true error (the optimism of lesson [[#generalisation]]), and the union bound\'s $\\varepsilon$ covers every model\'s gap. More thresholds raise $\\varepsilon$ only through $\\ln|\\mathcal H|$.' },
        {
          code: {
            file: 'theory.py', fn: 'finite_class_gap', notes: [
              ['def finite_class_gap(size, n, delta):', ['How many models, how much data, what failure chance.']],
              ['return math.sqrt((math.log(size) + math.log(2 / delta)) / (2 * n))', ['Solve $2|\\mathcal H|e^{-2n\\varepsilon^2} = \\delta$ for $\\varepsilon$.'], { tex: '\\varepsilon = \\sqrt{\\frac{\\ln|\\mathcal H| + \\ln(2/\\delta)}{2n}}' }],
            ],
          },
        },
        {
          code: {
            file: 'theory.py', fn: 'threshold_true_error', notes: [
              ['def threshold_true_error(t, boundary=0.3, flip=0.1):', ['A threshold model, the true boundary, and the label-noise rate.']],
              ['return flip + (1 - 2 * flip) * abs(t - boundary)', ['Between $t$ and the boundary (a stretch of length $|t - 0.3|$) the model is wrong unless the label was flipped: error $1 - \\text{flip}$. Elsewhere it is wrong only when flipped: error flip. Averaging over $x$ uniform: $\\text{flip}(1 - |t - 0.3|) + (1 - \\text{flip})|t - 0.3|$, which simplifies to this.'], { tex: 'R(h_t) = 0.1 + 0.8\\,|t - 0.3|' }],
            ],
          },
        },
        {
          code: {
            file: 'theory.py', fn: 'threshold_train_error', notes: [
              ['def threshold_train_error(t, xs, ys):', ['A threshold and a training set.']],
              ['return sum(1 for x, y in zip(xs, ys) if (1 if x > t else 0) != y) / len(xs)', ['The fraction of points it gets wrong: $\\hat R_n(h_t)$ with 0/1 loss.']],
            ],
          },
        },
        {
          code: {
            file: 'theory.py', fn: 'erm_thresholds', notes: [
              ['def erm_thresholds(n, size, trials=200, seed=0):', ['Run ERM on many training sets, with a class of `size` thresholds.']],
              ['rng = random.Random(seed)', ['Repeatable randomness.']],
              ['ts = [i / (size - 1) for i in range(size)]', ['The class: thresholds evenly spaced from 0 to 1.']],
              ['eps = finite_class_gap(size, n, 0.05)', ['The union bound\'s $\\varepsilon$ for $\\delta = 0.05$.']],
              ['train_sum = true_sum = 0.0', ['Running totals of the winner\'s training and true error.']],
              ['bad = 0', ['Training sets where some model\'s gap exceeded $\\varepsilon$.']],
              ['for _ in range(trials):', ['Each trial is a fresh training set.']],
              ['xs = [rng.random() for _ in range(n)]', ['Inputs uniform on $[0, 1]$.']],
              ['ys = [(1 if x > 0.3 else 0) ^ (1 if rng.random() < 0.1 else 0) for x in xs]', ['The true label, flipped 10% of the time (`^` is exclusive or: $1 \\oplus 1 = 0$).']],
              ['errs = [threshold_train_error(t, xs, ys) for t in ts]', ['Every model\'s training error.']],
              ['best = 0', ['ERM: find the lowest…']],
              ['for i in range(1, size):', ['…by checking each model in turn…']],
              ['if errs[i] < errs[best]:', ['…against the best so far…']],
              ['best = i', ['…and keeping the better one (ties go to the earlier).']],
              ['train_sum += errs[best]', ['The winner\'s training error…']],
              ['true_sum += threshold_true_error(ts[best])', ['…and its true error, known exactly here.']],
              ['if max(abs(e - threshold_true_error(t)) for e, t in zip(errs, ts)) > eps:', ['Did **any** model\'s gap exceed $\\varepsilon$?']],
              ['bad += 1', ['The bound says this happens at most 5% of the time.']],
              ['return train_sum / trials, true_sum / trials, bad / trials', ['Averages, and the measured failure rate.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'The union bound\'s $\\varepsilon$ for a million models, $n = 10{,}000$ examples and $\\delta = 0.05$? (4 decimals)',
            answer: finiteClassGap(1e6, 10000, 0.05), tolerance: 0.00006, compute: () => finiteClassGap(1e6, 10000, 0.05),
            explain: `$\\sqrt{(13.82 + 3.69)/20000} = ${f(finiteClassGap(1e6, 10000, 0.05))}$: a million candidates cost only about 3 percentage points of guaranteed accuracy.`,
          },
        },
        {
          predict: {
            prompt: 'With the same $n$ and $\\delta$ but a **single** model, what is $\\varepsilon$? (4 decimals)',
            answer: finiteClassGap(1, 10000, 0.05), tolerance: 0.00006, compute: () => finiteClassGap(1, 10000, 0.05),
            explain: `$\\sqrt{3.69/20000} = ${f(finiteClassGap(1, 10000, 0.05))}$, which is plain Hoeffding: $\\ln 1 = 0$.`,
          },
        },
        {
          choice: {
            prompt: 'Why can\'t Hoeffding\'s inequality alone be applied to the trained model $\\hat h$?',
            options: [
              { text: '$\\hat h$ was chosen using the same data, so its losses on that data aren\'t independent samples with mean $R(\\hat h)$', why: 'Right. Hoeffding needs the model fixed before the data are drawn. The union bound sidesteps this by covering every model the data could have picked.' },
              { text: 'Because the losses of $\\hat h$ are not in $[0, 1]$', why: 'With 0/1 loss they are. The problem is the selection, not the range.' },
              { text: 'Because $n$ is too small', why: 'The issue would remain for any $n$.' },
            ],
            answer: 0,
          },
        },
        { note: 'Union bound: $P(\\cup A_i) \\le \\sum P(A_i)$, no independence needed. Finite class: with probability $1 - \\delta$, every $h$ has $|\\hat R_n - R| \\le \\varepsilon = \\sqrt{(\\ln|\\mathcal H| + \\ln(2/\\delta))/(2n)}$, so ERM gets $R(\\hat h) \\le R(h^*) + 2\\varepsilon$. Class size costs a log; data cost $1/\\sqrt n$. Reusing a test set, or many tests, pays the same $\\ln k$.' },
      ],
    },

    {
      id: 'pac-vc', title: 'PAC learning, shattering and the VC dimension',
      goal: 'State what it means to learn a class "probably approximately correctly", count the labellings a class can make, compute VC dimensions with proofs, and prove Sauer\'s lemma.',
      builds: ['union-bound', 'combinations', 'induction', 'convexity', 'logistic-regression'],
      blocks: [
        { md: `**PAC learning.** A class $\\mathcal H$ is **PAC learnable** ("probably approximately correct") if there is an algorithm and a sample size $n(\\varepsilon, \\delta)$ such that, for **every** distribution $P$ and every $\\varepsilon, \\delta > 0$, given $n(\\varepsilon, \\delta)$ examples the algorithm returns a model with
$$R(\\hat h) \\le \\min_{h \\in \\mathcal H} R(h) + \\varepsilon \\quad\\text{with probability at least } 1 - \\delta$$
"Approximately" is $\\varepsilon$, "probably" is $1 - \\delta$. Lesson [[#union-bound]] proved every finite class is PAC learnable by ERM, with $n = O\\big((\\ln|\\mathcal H| + \\ln\\frac1\\delta)/\\varepsilon^2\\big)$ (big-O as in lesson [[#big-o]]; the $2\\varepsilon$ there becomes $\\varepsilon$ by halving).

**Infinite classes.** "Predict 1 when $x > t$" has infinitely many thresholds $t$, so $\\ln|\\mathcal H| = \\infty$ and that bound is useless. But on $n$ given numbers, only finitely many thresholds behave differently. Sort the points: $t$ below them all labels everything 1; $t$ between the 1st and 2nd point labels all but the first 1; and so on, up to $t$ above them all. That is just $n + 1$ different **labellings**. On the data, the infinite class acts like a class of $n + 1$ models.

**Growth function.** $\\Pi_{\\mathcal H}(n)$ is the largest number of distinct labellings $\\mathcal H$ can produce on any $n$ points. Always $\\Pi_{\\mathcal H}(n) \\le 2^n$, since each point gets 0 or 1.

**Shattering and VC dimension.** $\\mathcal H$ **shatters** a set of points if it produces all $2^n$ labellings of them. The **VC dimension** $d$ (after Vapnik and Chervonenkis) is the size of the largest set it can shatter. To show $d = k$, you need two things: **some** set of $k$ points that is shattered, and a proof that **no** set of $k + 1$ points is.

**Thresholds: $d = 1$.** One point gets either label (put $t$ below or above it). Two points $x_1 < x_2$: the labelling $(1, 0)$ would need $x_1 > t$ and $x_2 \\le t$, so $x_1 > x_2$. Impossible.

**Intervals** ("1 when $l < x < u$"): **$d = 2$.** Two points get all four labellings (an interval around neither, either one, or both). Three points $x_1 < x_2 < x_3$ can't get $(1, 0, 1)$: an interval containing $x_1$ and $x_3$ contains everything between them, including $x_2$. On $n$ points, intervals give $\\binom{n+1}{2} + 1$ labellings: choose 2 of the $n + 1$ gaps for the ends (lesson [[#combinations]]), plus "all 0".

**Half-planes in the plane** (a linear classifier "1 when $w_1x + w_2y + b > 0$", as in lesson [[#logistic-regression]]): **$d = 3$.**
- *Three points not on a line are shattered.* All the same label: put the line far away. One point different from the other two: a line close to that point, separating it from the segment joining the others, does it.
- *No four points are shattered.* The key fact: a half-plane is **convex**: if two points are in it, so is the segment between them (a linear expression that is positive at both ends of a segment is positive all along it). The other side, where the expression is $\\le 0$, is convex too. Now there are three cases. (a) Three of the points lie on a line: label the middle one differently from the two ends; the ends' side contains the segment between them, middle included. (b) One point lies inside the triangle of the other three: label it 0 and the corners 1; the 1-side contains all three corners, so it contains the triangle (segments of segments), inside point included. (c) The four form a convex quadrilateral: label one diagonal's ends 1 and the other's 0. The diagonals cross at a point $c$. Then $c$ is on the 1-diagonal, so on the 1-side, and also on the 0-diagonal, so on the 0-side. Contradiction. $\\blacksquare$

Linear classifiers in $\\mathbb R^k$ have $d = k + 1$, one more than the number of inputs (the general proof uses the same convexity idea; **taken on trust** here).

**Sauer's lemma.** If $\\mathcal H$ has VC dimension $d$, then
$$\\Pi_{\\mathcal H}(n) \\le \\sum_{i=0}^d \\binom ni$$
which is at most $(n + 1)^d$: polynomial in $n$, not exponential.

*Proof,* by induction on $n$ (for every $d$ at once). Write $\\Phi_d(n) = \\sum_{i \\le d}\\binom ni$, and let $H$ be any set of labellings of $n$ points that shatters no set bigger than $d$. If $n = 0$ there is one (empty) labelling and $\\Phi_d(0) = 1$. If $d = 0$, no single point gets both labels, so every point's label is fixed and $|H| = 1 = \\Phi_0(n)$. Otherwise, split off the last point $x_n$:
- $H'$: the labellings of the first $n - 1$ points obtained by deleting $x_n$'s label from each member of $H$.
- $H''$: those labellings of the first $n - 1$ points that appear in $H$ **with both** labels on $x_n$.

Every member of $H'$ comes from one or two members of $H$, and the ones that come from two are exactly $H''$. So $|H| = |H'| + |H''|$. A set that $H'$ shatters, $H$ shatters too, so $H'$ shatters nothing bigger than $d$. If $H''$ shattered a set $T$, then $H$ would shatter $T$ plus $x_n$ (every pattern on $T$ comes with both labels for $x_n$), so $|T| + 1 \\le d$ and $H''$ shatters nothing bigger than $d - 1$. By induction, $|H| \\le \\Phi_d(n - 1) + \\Phi_{d-1}(n - 1) = \\sum_{i \\le d}\\Big[\\binom{n-1}{i} + \\binom{n-1}{i-1}\\Big] = \\sum_{i \\le d}\\binom ni$ by Pascal's rule (lesson [[#combinations]]). $\\blacksquare$

For the polynomial form: $\\binom ni \\le \\frac{n^i}{i!}$, and $(n + 1)^d = \\sum_i \\binom di n^i$ by the binomial theorem, where every $\\binom di \\ge 1 \\ge \\frac1{i!}$, so $\\Phi_d(n) \\le (n + 1)^d$.

**The VC bound.** Replacing $|\\mathcal H|$ in the union bound by the growth function gives, with probability at least $1 - \\delta$, for every $h \\in \\mathcal H$,
$$R(h) \\le \\hat R_n(h) + O\\left(\\sqrt{\\frac{d\\ln n + \\ln(1/\\delta)}{n}}\\right)$$
The step that justifies the replacement (comparing the training set with an imaginary second "ghost" sample, called **symmetrisation**) is **taken on trust** here. The shape is what matters: $d$ plays the part of $\\ln|\\mathcal H|$, and a class is PAC learnable exactly when its VC dimension is finite.

**And deep networks?** Their VC dimension grows roughly with the number of weights (times a log). With millions of weights and thousands of examples, the bound promises nothing, yet such networks generalise well. Lesson [[#double-descent]] shows part of why.` },
        { figure: 'ShatterFig', caption: 'Pick a family and a number of points. Every one of the $2^n$ labellings is listed: dark if the family can produce it, faded if it can\'t. The count is compared with $2^n$ and with Sauer\'s bound for the family\'s VC dimension.' },
        {
          code: {
            file: 'theory.py', fn: 'threshold_patterns', notes: [
              ['def threshold_patterns(xs):', ['Some numbers on a line.']],
              ['s = sorted(xs)', ['In order, to find the gaps.']],
              ['cuts = [s[0] - 1] + [(a + b) / 2 for a, b in zip(s, s[1:])] + [s[-1] + 1]', ['One threshold from each place that makes a difference: below all, each gap\'s midpoint, above all. Any other $t$ behaves like one of these.']],
              ['return {tuple(1 if x > t else 0 for x in xs) for t in cuts}', ['A set of labellings, so duplicates count once: $n + 1$ of them.']],
            ],
          },
        },
        {
          code: {
            file: 'theory.py', fn: 'interval_patterns', notes: [
              ['def interval_patterns(xs):', ['The same, for intervals.']],
              ['s = sorted(xs)', ['In order.']],
              ['cuts = [s[0] - 1] + [(a + b) / 2 for a, b in zip(s, s[1:])] + [s[-1] + 1]', ['The same candidate places for each end.']],
              ['return {tuple(1 if lo < x < hi else 0 for x in xs) for lo in cuts for hi in cuts}', ['Every pair of ends. Pairs with $lo \\ge hi$ give "all 0".'], { tex: '\\binom{n+1}{2} + 1' }],
            ],
          },
        },
        {
          code: {
            file: 'theory.py', fn: 'halfplane_patterns', notes: [
              ['def halfplane_patterns(points, directions=360):', ['Points in the plane, and how many directions to try.']],
              ['found = set()', ['The labellings seen so far.']],
              ['for k in range(directions):', ['Each direction $(\\cos a, \\sin a)$ for the line\'s normal $\\mathbf w$…']],
              ['a = 2 * math.pi * k / directions', ['…evenly around the circle.']],
              ['proj = [x * math.cos(a) + y * math.sin(a) for x, y in points]', ['Each point\'s position along that direction: $\\mathbf w\\cdot\\mathbf p$.']],
              ['s = sorted(proj)', ['In order along it.']],
              ['cuts = [s[0] - 1] + [(u + v) / 2 for u, v in zip(s, s[1:])] + [s[-1] + 1]', ['A half-plane with this normal is a threshold on the projections, so the same cuts as before.']],
              ['for t in cuts:', ['Each one…']],
              ['found.add(tuple(1 if v > t else 0 for v in proj))', ['…labels the points $\\mathbf w\\cdot\\mathbf p > t$.']],
              ['return found', ['Every labelling found. For points in general position, enough directions find them all; this is a search, so a missing labelling is evidence, and the proofs above are the guarantee.']],
            ],
          },
        },
        {
          code: {
            file: 'theory.py', fn: 'sauer_bound', notes: [
              ['def sauer_bound(n, d):', ['Number of points and VC dimension.']],
              ['return sum(math.comb(n, i) for i in range(d + 1))', ['$\\Phi_d(n)$.'], { tex: '\\Pi_{\\mathcal H}(n) \\le \\sum_{i=0}^d\\binom ni' }],
            ],
          },
        },
        {
          predict: {
            prompt: 'How many labellings can intervals produce on 5 points?',
            answer: intervalPatterns([1, 2, 3, 4, 5]).size, compute: () => intervalPatterns([1, 2, 3, 4, 5]).size,
            explain: '$\\binom 62 + 1 = 16$, of the $2^5 = 32$ possible. Sauer allows up to $\\binom50 + \\binom51 + \\binom52 = 16$: intervals meet the bound exactly.',
          },
        },
        {
          predict: {
            prompt: 'Sauer\'s bound for $n = 10$ points and VC dimension 3?',
            answer: sauerBound(10, 3), compute: () => sauerBound(10, 3),
            explain: `$1 + 10 + 45 + 120 = ${sauerBound(10, 3)}$, against $2^{10} = 1024$. The gap widens fast: at $n = 100$ it is about $1.7 \\times 10^5$ against $1.3 \\times 10^{30}$.`,
          },
        },
        {
          choice: {
            prompt: 'To prove a class has VC dimension exactly 3, what must you show?',
            options: [
              { text: 'Some set of 3 points is shattered, and no set of 4 points is', why: 'Right: "some" for the lower bound (one example suffices), "no" for the upper bound (a proof covering every 4-point set).' },
              { text: 'Every set of 3 points is shattered', why: 'Too strong: three points on a line aren\'t shattered by half-planes, yet their VC dimension is 3. One good set suffices.' },
              { text: 'Some set of 4 points isn\'t shattered', why: 'One failing set proves nothing about the others: three points on a line aren\'t shattered by half-planes, yet a triangle\'s corners are. You need every 4-point set to fail.' },
            ],
            answer: 0,
          },
        },
        { note: 'PAC: for every $P$, $n(\\varepsilon, \\delta)$ examples give $R(\\hat h) \\le \\min R + \\varepsilon$ with probability $1 - \\delta$. Growth function $\\Pi(n)$ counts labellings; shattered = all $2^n$; VC dimension = largest shattered set (thresholds 1, intervals 2, half-planes 3, linear in $\\mathbb R^k$: $k + 1$). Sauer: $\\Pi(n) \\le \\sum_{i \\le d}\\binom ni \\le (n+1)^d$. VC bound: gap $\\approx \\sqrt{(d\\ln n + \\ln\\frac1\\delta)/n}$.' },
      ],
    },

    {
      id: 'double-descent', title: 'Double descent, and the regularisation gradient descent does by itself',
      goal: 'Reproduce double descent in least squares, prove that the minimum-norm exact fit is $F^\\top(FF^\\top)^{-1}\\mathbf y$ and that gradient descent from zero finds it, and see why test error spikes where the model can just fit the data.',
      builds: ['pac-vc', 'bias-variance', 'regularisation', 'least-squares', 'orthogonality', 'svd', 'covariance', 'gd-convergence'],
      blocks: [
        { md: `The classical story so far: richer models fit training data better but generalise worse once they start fitting noise, so test error traces a U against model size (lesson [[#bias-variance]], and the polynomial figure in lesson [[#generalisation]]). The bounds of lessons [[#union-bound]] and [[#pac-vc]] agree: they need many more examples than parameters. Yet modern networks have far more parameters than examples, are trained until their training error is zero, and generalise well. This lesson shows the same surprise in a model small enough to analyse completely.

**The experiment.** Each input $\\mathbf x$ has $D = 60$ features, each an independent standard normal number. The truth is $y = \\mathbf x^\\top\\boldsymbol\\beta + \\varepsilon$ with noise $\\varepsilon \\sim \\mathcal N(0, 0.2^2)$ and weights $\\beta_j \\propto 0.95^j$ (early features matter most), scaled so $\\|\\boldsymbol\\beta\\| = 1$. We get only $n = 20$ training examples. The model uses the **first $p$ features** and fits them by least squares, for $p = 1, 2, \\dots, 60$. Write $F$ for the $n \\times p$ matrix of the features used.

**The test error, exactly.** For a fresh $\\mathbf x$, the model predicts $\\sum_{j \\le p} w_jx_j$ and the truth (before noise) is $\\sum_j \\beta_jx_j$. Their difference is $\\sum_j c_jx_j$ with $c_j = \\beta_j - w_j$ for $j \\le p$ and $c_j = \\beta_j$ for $j > p$. Its expected square is $\\sum_j\\sum_k c_jc_k\\,\\mathbb E[x_jx_k]$, and $\\mathbb E[x_jx_k]$ is 1 when $j = k$ and 0 otherwise (independent, mean 0, variance 1; lesson [[#covariance]]). So
$$\\text{excess risk} = \\sum_{j \\le p}(\\beta_j - w_j)^2 + \\sum_{j > p}\\beta_j^2$$
the weights the model gets wrong, plus the weights it leaves out. The noise adds a fixed $0.04$ on top, which we leave out.

**$p < n$: ordinary least squares.** More equations than unknowns; the usual solution of lesson [[#least-squares]], $\\mathbf w = (F^\\top F)^{-1}F^\\top\\mathbf y$.

**$p \\ge n$: too many exact fits.** Now there are at least as many unknowns as equations, and (for random features) infinitely many $\\mathbf w$ fit the training data exactly. Which one? The natural choice is the **shortest**: the minimum-norm solution.

*Claim:* $\\mathbf w^* = F^\\top(FF^\\top)^{-1}\\mathbf y$ fits exactly and is the shortest exact fit. ($FF^\\top$ is $n \\times n$, and invertible when the $n$ rows of $F$ are independent, which random rows are.)
- Exact: $F\\mathbf w^* = FF^\\top(FF^\\top)^{-1}\\mathbf y = \\mathbf y$.
- Shortest: let $\\mathbf w$ be any exact fit and $\\mathbf v = \\mathbf w - \\mathbf w^*$. Then $F\\mathbf v = \\mathbf y - \\mathbf y = \\mathbf 0$: $\\mathbf v$ is perpendicular to every row of $F$. And $\\mathbf w^* = F^\\top\\boldsymbol\\alpha$ (with $\\boldsymbol\\alpha = (FF^\\top)^{-1}\\mathbf y$) is a combination of those rows. So $\\mathbf w^*\\cdot\\mathbf v = \\boldsymbol\\alpha^\\top F\\mathbf v = 0$, and by Pythagoras (lesson [[#orthogonality]]) $\\|\\mathbf w\\|^2 = \\|\\mathbf w^*\\|^2 + \\|\\mathbf v\\|^2 \\ge \\|\\mathbf w^*\\|^2$. $\\blacksquare$

It is also ridge regression (lesson [[#regularisation]]) with the penalty shrunk to nothing. From $F^\\top(FF^\\top + \\lambda I) = F^\\top FF^\\top + \\lambda F^\\top = (F^\\top F + \\lambda I)F^\\top$, multiply on the left by $(F^\\top F + \\lambda I)^{-1}$ and on the right by $(FF^\\top + \\lambda I)^{-1}$: $(F^\\top F + \\lambda I)^{-1}F^\\top = F^\\top(FF^\\top + \\lambda I)^{-1}$. The left side times $\\mathbf y$ is ridge; as $\\lambda \\to 0$ the right side becomes $\\mathbf w^*$.

**What happens.** The figure plots the excess risk against $p$, averaged over 20 training sets. Three regimes appear:
1. **Small $p$:** the classical U. Adding the important early features helps, until extra features add more variance than they remove bias.
2. **$p = n$, the interpolation threshold:** a huge spike. With exactly as many features as examples, there is exactly one exact fit, and it must thread every noisy $y_i$. In the SVD $F = U\\Sigma V^\\top$ (lesson [[#svd]]), $\\mathbf w^* = V\\Sigma^{-1}U^\\top\\mathbf y$: each component of $\\mathbf y$ is divided by a singular value. A random **square** matrix typically has a smallest singular value very close to 0 (**taken on trust**; the figure's weight-length curve shows the consequence), so the noise gets divided by almost nothing and the weights explode.
3. **$p > n$: the second descent.** Each extra feature gives the fit more room, the smallest singular value moves away from 0, and the shortest exact fit gets shorter. The noise is spread thinly over many features, each contributing a little at test time. Here the risk falls **below** the best of the classical regime: the most overparameterised fits are the best ones, despite fitting the training data perfectly, noise and all. This is called **benign overfitting**.

**Implicit regularisation: gradient descent finds $\\mathbf w^*$ by itself.** Run gradient descent on the squared error starting from $\\mathbf w = \\mathbf 0$. The gradient is $\\frac2nF^\\top(F\\mathbf w - \\mathbf y)$: a combination of the rows of $F$. Starting at $\\mathbf 0$ and only ever adding combinations of rows, every iterate stays a combination of rows. With a small enough rate it converges to an exact fit (lesson [[#gd-convergence]]). Among exact fits there is only one that is a combination of the rows: if $\\mathbf w_1, \\mathbf w_2$ both are, their difference $\\mathbf v$ is too, and also satisfies $F\\mathbf v = \\mathbf 0$, so $\\mathbf v\\cdot\\mathbf v = \\boldsymbol\\gamma^\\top F\\mathbf v = 0$, so $\\mathbf v = \\mathbf 0$. And $\\mathbf w^*$ is one. So **gradient descent from zero returns the minimum-norm fit**, though nothing in the loss asked for it. The algorithm itself prefers small weights.

**For deep learning.** Large networks trained by SGD from small random weights are believed to enjoy similar implicit preferences, which, not the parameter count, control how well they generalise. Double descent has been measured in real networks as width grows, and even as training time grows (Nakkiran et al., 2019). Exactly what SGD prefers in a deep network is still open research. In papers: "interpolation regime", "overparameterised", "implicit bias", "benign overfitting", "minimum-norm interpolant".` },
        { figure: 'DoubleDescentFig', caption: 'Excess test risk (log scale) against the number of features $p$, with $n = 20$ training examples, averaged over 12 training sets. The classical U on the left, the spike at $p = n$, and the second descent beyond. Slide $p$ to read off the risk and the length of the fitted weights on one training set.' },
        {
          code: {
            file: 'theory.py', fn: 'fit_first_p', notes: [
              ['def fit_first_p(X, ys, p):', ['All features of the training inputs, the targets, and how many features to use.']],
              ['F = [row[:p] for row in X]', ['Keep the first $p$ columns: $F$ is $n \\times p$.']],
              ['n = len(F)', ['The number of examples.']],
              ['if p < n:', ['Fewer unknowns than equations…']],
              ['G = [[sum(f[i] * f[j] for f in F) for j in range(p)] for i in range(p)]', ['…$F^\\top F$ ($p \\times p$)…']],
              ['return solve(G, [sum(f[i] * y for f, y in zip(F, ys)) for i in range(p)])', ['…and the normal equations $F^\\top F\\mathbf w = F^\\top\\mathbf y$ (lesson [[#least-squares]]).']],
              ['G = [[sum(a * b for a, b in zip(F[i], F[j])) for j in range(n)] for i in range(n)]', ['Otherwise $FF^\\top$ ($n \\times n$): dot products between examples.']],
              ['alpha = solve(G, ys)', ['$\\boldsymbol\\alpha = (FF^\\top)^{-1}\\mathbf y$.']],
              ['return [sum(alpha[i] * F[i][k] for i in range(n)) for k in range(p)]', ['$\\mathbf w^* = F^\\top\\boldsymbol\\alpha$: a combination of the rows, so the shortest exact fit.'], { tex: '\\mathbf w^* = F^\\top(FF^\\top)^{-1}\\mathbf y' }],
            ],
          },
        },
        {
          code: {
            file: 'theory.py', fn: 'excess_risk', notes: [
              ['def excess_risk(w, beta):', ['Fitted weights for the first $p$ features, and all the true ones.']],
              ['p = len(w)', ['How many features the model used.']],
              ['return sum((b - a) ** 2 for a, b in zip(w, beta[:p])) + sum(b * b for b in beta[p:])', ['Wrong weights on the used features, plus the weight on the unused ones.'], { tex: '\\sum_{j \\le p}(\\beta_j - w_j)^2 + \\sum_{j > p}\\beta_j^2' }],
            ],
          },
        },
        {
          code: {
            file: 'theory.py', fn: 'double_descent', notes: [
              ['def double_descent(D=60, n=20, noise=0.2, trials=20, seed=0):', ['The experiment\'s sizes.']],
              ['raw = [0.95 ** j for j in range(D)]', ['True weights shrinking along the features…']],
              ['size = math.sqrt(sum(b * b for b in raw))', ['…their length…']],
              ['beta = [b / size for b in raw]', ['…scaled to 1.']],
              ['rng = random.Random(seed)', ['Repeatable randomness.']],
              ['risks = [0.0] * D', ['The average risk for each $p$.']],
              ['for _ in range(trials):', ['Several training sets, to average out luck.']],
              ['X = [[rng.gauss(0, 1) for _ in range(D)] for _ in range(n)]', ['$n$ inputs, each $D$ standard normal features.']],
              ['ys = [sum(a * b for a, b in zip(row, beta)) + rng.gauss(0, noise) for row in X]', ['$y = \\mathbf x^\\top\\boldsymbol\\beta + \\varepsilon$.']],
              ['for p in range(1, D + 1):', ['Every model size, on the same data…']],
              ['risks[p - 1] += excess_risk(fit_first_p(X, ys, p), beta) / trials', ['…fitted and scored exactly, then averaged.']],
              ['return risks', ['The curve the figure draws.']],
            ],
          },
        },
        {
          code: {
            file: 'theory.py', fn: 'gd_least_squares', notes: [
              ['def gd_least_squares(F, ys, rate, steps):', ['Plain gradient descent on the mean squared error.']],
              ['n, p = len(F), len(F[0])', ['Examples and features.']],
              ['w = [0.0] * p', ['Start at zero: the start that makes the implicit preference work.']],
              ['for _ in range(steps):', ['Each step…']],
              ['r = [sum(a * b for a, b in zip(f, w)) - y for f, y in zip(F, ys)]', ['…the residuals $F\\mathbf w - \\mathbf y$…']],
              ['w = [wk - rate * 2 / n * sum(r[i] * F[i][k] for i in range(n)) for k, wk in enumerate(w)]', ['…and the step $-\\eta\\frac2nF^\\top\\mathbf r$, a combination of rows.'], { tex: '\\mathbf w \\leftarrow \\mathbf w - \\eta\\,\\tfrac2nF^\\top(F\\mathbf w - \\mathbf y)' }],
              ['return w', ['Converges to $\\mathbf w^*$ when $p \\ge n$.']],
            ],
          },
        },
        { python: { program: 'theory', label: 'Run the learning-theory part in real Python' } },
        {
          code: {
            file: 'theory.py', fn: 'show_theory', notes: [
              ['def show_theory():', ['One line per result.']],
              ['print("training and test error of a degree-9 fit:", train_and_test(9, 20, 50))', ['Lesson [[#generalisation]].']],
              ['print("Chebyshev and Hoeffding bounds, n = 200, ε = 0.1:", chebyshev_tail(200, 0.1), hoeffding_tail(200, 0.1))', ['Lesson [[#concentration]].']],
              ['print("samples for ε = 0.05 with 95% confidence:", samples_needed(0.05, 0.05))', ['738.']],
              ['print("union-bound ε for a million models, n = 10,000:", finite_class_gap(10 ** 6, 10000, 0.05))', ['Lesson [[#union-bound]].']],
              ['print("labellings of 4 points by thresholds, intervals:", len(threshold_patterns([1, 2, 3, 4])), len(interval_patterns([1, 2, 3, 4])))', ['Lesson [[#pac-vc]]: $n + 1$ and $\\binom{n+1}2 + 1$.']],
              ['print("labellings of a square\'s corners by half-planes:", len(halfplane_patterns([(0, 0), (1, 0), (1, 1), (0, 1)], 72)), "of", 2 ** 4)', ['14 of 16: the two diagonal labellings are missing, case (c) of the proof.']],
              ['print("Sauer\'s bound for n = 4, d = 3:", sauer_bound(4, 3))', ['15: half-planes come within one of it.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'For the training data $F = \\begin{pmatrix}1 & 2 & 0.5\\\\ 0.3 & -1 & 2\\end{pmatrix}$, $\\mathbf y = (1, -1)$, what is the first weight of the minimum-norm exact fit? (4 decimals)',
            answer: fitFirstP([[1, 2, 0.5], [0.3, -1, 2]], [1, -1], 3)[0], tolerance: 0.00006, compute: () => fitFirstP([[1, 2, 0.5], [0.3, -1, 2]], [1, -1], 3)[0],
            explain: `$FF^\\top = \\begin{pmatrix}5.25 & 0.3\\\\ 0.3 & 5.09\\end{pmatrix}$, $\\boldsymbol\\alpha = (FF^\\top)^{-1}\\mathbf y$, then $\\mathbf w^* = F^\\top\\boldsymbol\\alpha$ = (${fitFirstP([[1, 2, 0.5], [0.3, -1, 2]], [1, -1], 3).map(x => f(x)).join(', ')}). Gradient descent from zero lands on the same vector (the exercise checks it).`,
          },
        },
        {
          choice: {
            prompt: 'Why does the test error spike when the number of features equals the number of examples?',
            options: [
              { text: 'There is exactly one exact fit, and with a nearly singular square $F$ it needs huge weights to thread the noise', why: 'Right: dividing by a tiny singular value magnifies the noise. With more features there are many exact fits, and the shortest one is much smaller.' },
              { text: 'Because the model has too few parameters to fit the data', why: 'At $p = n$ it fits the training data exactly. The trouble is how.' },
              { text: 'Because gradient descent fails to converge there', why: 'The fit here is computed exactly, without gradient descent, and the spike is still there.' },
            ],
            answer: 0,
          },
        },
        { note: 'Double descent: risk falls, spikes at the interpolation threshold $p = n$, then falls again, here below the classical best. For $p \\ge n$, the minimum-norm exact fit is $F^\\top(FF^\\top)^{-1}\\mathbf y$ (perpendicular to every other solution\'s difference; the ridgeless limit of ridge). The spike: tiny singular values amplify noise. Gradient descent from zero stays among combinations of the rows, so it finds the minimum-norm fit: implicit regularisation.' },
      ],
    },
  ],
}
