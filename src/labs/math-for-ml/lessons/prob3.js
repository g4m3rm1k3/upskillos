// Probability additions, part two: change of variables, the multivariate normal, MAP estimation with
// conjugate priors, estimators and the bootstrap, hypothesis tests, Monte Carlo and importance
// sampling, Jensen's inequality, information in bits, and Markov chains.
import { transformedDensity, normalPdf, mvnPdf, betaBinomial, bootstrapInterval, permutationPValue, mean, monteCarlo, importance, jensenGap, entropyBits, mutualInformation, stationary, markovStep } from '../engine/maths.js'
import { f } from './util.js'

export const PROB3 = [
  {
    id: 'change-of-variables', title: 'Change of variables: transforming a density',
    goal: 'Derive $p_Y(y) = p_X(g^{-1}(y))\\,\\big|\\frac{d}{dy}g^{-1}(y)\\big|$, see why the stretch factor is needed, and extend it to many dimensions with $|\\det J|$, the idea behind normalising flows.',
    builds: ['common-distributions', 'inverse-derivative', 'jacobian', 'determinant-n'],
    blocks: [
      { md: `If $X$ has density $p_X$ and $Y = g(X)$, what is $Y$'s density? The tempting answer, $p_X(g^{-1}(y))$, is wrong, and seeing why is the whole lesson.

**The CDF route.** Take $g$ increasing. Then $Y \\le y$ exactly when $X \\le g^{-1}(y)$, so $P(Y \\le y) = F_X(g^{-1}(y))$. A density is the slope of its CDF (lesson [[#fundamental-theorem]]'s theorem: the CDF is the area so far). Differentiate with the chain rule:

$$p_Y(y) = p_X\\big(g^{-1}(y)\\big)\\cdot\\frac{d}{dy}g^{-1}(y)$$

For decreasing $g$ the inequality flips, giving a minus sign that makes the slope positive again; both cases are $\\big|\\frac{d}{dy}g^{-1}(y)\\big|$.

**Why the extra factor: probability is conserved.** A thin strip of width $dx$ around $x$ holds probability $p_X(x)\\,dx$. $g$ maps it to a strip of width $dy = |g'(x)|\\,dx$, which must hold the **same** probability. So the density there is $p_X(x)\\frac{dx}{dy}$: where $g$ stretches, the density thins; where it squeezes, it piles up. (And $\\frac{dx}{dy}$ is exactly the slope of the inverse, lesson [[#inverse-derivative]].)

**Example: the log-normal.** If $X \\sim \\mathcal N(0, 1)$ and $Y = e^X$ (always positive), then $g^{-1}(y) = \\ln y$ with slope $\\frac1y$, so $p_Y(y) = \\frac{\\varphi(\\ln y)}{y}$: a lopsided curve with a long right tail, the shape of incomes, file sizes and many positive quantities.

**Many dimensions.** For an invertible $\\mathbf g: \\mathbb R^n \\to \\mathbb R^n$, a tiny box around $\\mathbf x$ maps to a tiny parallelogram whose volume is $|\\det J|$ times larger (lesson [[#jacobian]]: near a point every map acts like its Jacobian, and lesson [[#determinant-n]]: $|\\det|$ scales volume). Conservation again:

$$p_Y(\\mathbf y) = p_X(\\mathbf x)\\,\\big|\\det J_{\\mathbf g}(\\mathbf x)\\big|^{-1}, \\qquad \\mathbf x = \\mathbf g^{-1}(\\mathbf y)$$

**Normalising flows** build a complicated density this way: start from a simple Gaussian $\\mathbf z$ and push it through a chain of invertible layers. In logs, each layer contributes one term: $\\log p(\\mathbf y) = \\log p(\\mathbf z) - \\sum_{\\text{layers}}\\log|\\det J|$, with layers designed so the determinant is cheap (triangular Jacobians: the product of the diagonal).` },
      { figure: 'ChangeOfVariablesFig', caption: 'Strips of equal probability under $X$\'s density (left) are mapped by $g$ (right). Where $g$ stretches, the same probability is spread thin, and the new density is lower; the histogram of transformed samples matches the formula, not the naive guess.' },
      {
        code: {
          file: 'chance.py', fn: 'transformed_density', notes: [
            ['def transformed_density(p, g_inverse, g_inverse_slope, y):', ['$X$\'s density, the inverse map and its slope, and where to evaluate $Y$\'s density.']],
            ['return p(g_inverse(y)) * abs(g_inverse_slope(y))', ['The old density at the matching $x$, times the stretch factor $|dx/dy|$.'], { tex: 'p_Y(y) = p_X(g^{-1}(y))\\left|\\tfrac{d}{dy}g^{-1}(y)\\right|' }],
          ],
        },
      },
      {
        predict: {
          prompt: '$X \\sim \\mathcal N(0, 1)$ and $Y = e^X$. What is $p_Y(2)$? (4 decimals)',
          answer: transformedDensity(x => normalPdf(x), Math.log, y => 1 / y, 2), tolerance: 0.00006,
          compute: () => transformedDensity(x => normalPdf(x), Math.log, y => 1 / y, 2),
          explain: `$\\varphi(\\ln 2)/2 = ${f(normalPdf(Math.log(2)))}/2 = ${f(normalPdf(Math.log(2)) / 2)}$.`,
          misconceptions: [{ answer: normalPdf(Math.log(2)), tolerance: 0.001, feedback: 'That forgets the stretch factor $\\frac{d}{dy}\\ln y = \\frac1y$: near $y = 2$, $e^x$ stretches strips to twice their width.' }],
        },
      },
      {
        predict: {
          prompt: 'A flow layer maps $\\mathbb R^2 \\to \\mathbb R^2$ with Jacobian determinant 4 everywhere. By what factor does it change densities?',
          answer: 0.25, tolerance: 1e-9, compute: () => 1 / Math.abs(4),
          explain: 'It multiplies areas by 4, so densities by $\\frac14$: the same probability, spread over 4 times the area.',
        },
      },
      { note: '$Y = g(X)$: $p_Y(y) = p_X(g^{-1}(y))\\,|\\tfrac{d}{dy}g^{-1}(y)|$, because probability in a strip is conserved while its width changes. In $n$ dimensions divide by $|\\det J|$. Flows: $\\log p(\\mathbf y) = \\log p(\\mathbf z) - \\sum\\log|\\det J|$.' },
    ],
  },

  {
    id: 'multivariate-gaussian', title: 'The multivariate normal distribution',
    goal: 'Derive the density $\\frac{1}{(2\\pi)^{d/2}\\sqrt{\\det\\Sigma}}e^{-\\frac12(\\mathbf x - \\boldsymbol\\mu)^\\top\\Sigma^{-1}(\\mathbf x - \\boldsymbol\\mu)}$ from independent normals, and read its contours as ellipses along the eigenvectors of $\\Sigma$.',
    builds: ['change-of-variables', 'positive-definite', 'spectral'],
    blocks: [
        { added: true, kind: 'recall', note: 'The **covariance matrix** $\\Sigma$ of a vector of measurements has entry $(j, k)$ equal to $\\mathrm{Cov}(x_j, x_k)$: how much measurements $j$ and $k$ move together. Its diagonal holds each measurement\'s variance (lesson [[#covariance]]). $\\det\\Sigma$ is how much $\\Sigma$ scales volume (lesson [[#determinant-n]]), and $\\Sigma^{-1}$ undoes it (lesson [[#inverse]]).' },
      { md: `Two heights, a person's height and weight, a word embedding's coordinates: many measurements come together and are related. The **multivariate normal** $\\mathcal N(\\boldsymbol\\mu, \\Sigma)$ is the bell curve for vectors, with a mean vector $\\boldsymbol\\mu$ and a covariance matrix $\\Sigma$ (lesson [[#covariance]]). Its formula:

$$p(\\mathbf x) = \\frac{1}{(2\\pi)^{d/2}\\sqrt{\\det\\Sigma}}\\exp\\!\\Big(-\\tfrac12(\\mathbf x - \\boldsymbol\\mu)^\\top\\Sigma^{-1}(\\mathbf x - \\boldsymbol\\mu)\\Big)$$

Build it in three steps from things you have.

**1. Independent standard normals.** Let $\\mathbf z$ have $d$ independent $\\mathcal N(0, 1)$ entries. Independent densities multiply (lesson [[#joint-marginal]]), and $e^{a}e^{b} = e^{a+b}$:
$$p(\\mathbf z) = \\prod_i\\frac{e^{-z_i^2/2}}{\\sqrt{2\\pi}} = \\frac{1}{(2\\pi)^{d/2}}e^{-\\frac12\\|\\mathbf z\\|^2}$$
Its contours are circles: the height depends only on the distance from the centre.

**2. Stretch, rotate and shift.** Any positive definite $\\Sigma$ factors as $\\Sigma = LL^\\top$ (lesson [[#positive-definite]]'s Cholesky). Set $\\mathbf x = \\boldsymbol\\mu + L\\mathbf z$. Its covariance is $\\mathbb E[L\\mathbf z\\mathbf z^\\top L^\\top] = L\\,I\\,L^\\top = \\Sigma$, as wanted.

**3. Change variables** (last lesson). The inverse is $\\mathbf z = L^{-1}(\\mathbf x - \\boldsymbol\\mu)$, so
$$\\|\\mathbf z\\|^2 = (\\mathbf x - \\boldsymbol\\mu)^\\top L^{-\\top}L^{-1}(\\mathbf x - \\boldsymbol\\mu) = (\\mathbf x - \\boldsymbol\\mu)^\\top\\Sigma^{-1}(\\mathbf x - \\boldsymbol\\mu)$$
(since $\\Sigma^{-1} = (LL^\\top)^{-1} = L^{-\\top}L^{-1}$). The map $\\mathbf z \\mapsto \\mathbf x$ is linear with Jacobian $L$, and $|\\det L| = \\sqrt{\\det\\Sigma}$ (because $\\det\\Sigma = \\det L\\det L^\\top = (\\det L)^2$), so the density gets divided by $\\sqrt{\\det\\Sigma}$. That's the formula. $\\blacksquare$

**Reading it.** The exponent $(\\mathbf x - \\boldsymbol\\mu)^\\top\\Sigma^{-1}(\\mathbf x - \\boldsymbol\\mu)$ is the squared **Mahalanobis distance**: distance measured in standard deviations along each direction. Its contours are **ellipses** whose axes are the eigenvectors of $\\Sigma$ (spectral theorem), with half-lengths proportional to $\\sqrt{\\lambda_i}$: long where the data varies a lot. With $\\Sigma = \\sigma^2 I$ they are circles; with $d = 1$ it is lesson [[#normal]]'s formula.

**In ML**: Gaussian noise in diffusion models and VAEs, Gaussian processes, Kalman filters, the "Gaussian assumption" behind least squares in many dimensions, and sampling with $\\boldsymbol\\mu + L\\mathbf z$.` },
      { figure: 'MultivariateGaussianFig', caption: 'The density of a 2D normal as a contour map, with samples made by $\\boldsymbol\\mu + L\\mathbf z$. Change the variances and the correlation: the ellipses turn to follow the eigenvectors of $\\Sigma$.' },
      {
        code: {
          file: 'chance.py', fn: 'mvn_pdf', notes: [
            ['def mvn_pdf(x, mu, S):', ['A point, the mean, and a $2\\times2$ covariance.']],
            ['det = S[0][0] * S[1][1] - S[0][1] * S[1][0]', ['$\\det\\Sigma$.']],
            ['inv = [[S[1][1] / det, -S[0][1] / det], [-S[1][0] / det, S[0][0] / det]]', ['$\\Sigma^{-1}$ by the $2\\times2$ formula (lesson [[#inverse]]).']],
            ['d = [x[0] - mu[0], x[1] - mu[1]]', ['$\\mathbf x - \\boldsymbol\\mu$.']],
            ['q = d[0] * (inv[0][0] * d[0] + inv[0][1] * d[1]) + d[1] * (inv[1][0] * d[0] + inv[1][1] * d[1])', ['The squared Mahalanobis distance $\\mathbf d^\\top\\Sigma^{-1}\\mathbf d$.']],
            ['return math.exp(-q / 2) / (2 * math.pi * math.sqrt(det))', ['$\\frac{e^{-q/2}}{(2\\pi)^{d/2}\\sqrt{\\det\\Sigma}}$ with $d = 2$.'], { tex: '\\mathcal N(\\mathbf x; \\boldsymbol\\mu, \\Sigma)' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'What is the density of the standard 2D normal ($\\boldsymbol\\mu = \\mathbf 0$, $\\Sigma = I$) at its centre? (4 decimals)',
          answer: 1 / (2 * Math.PI), tolerance: 0.00006, compute: () => mvnPdf([0, 0], [0, 0], [[1, 0], [0, 1]]),
          explain: '$\\frac{1}{2\\pi} = 0.1592$: the square of the 1D peak $\\frac{1}{\\sqrt{2\\pi}}$, since independent densities multiply.',
        },
      },
      {
        predict: {
          prompt: 'With $\\Sigma = \\begin{pmatrix}4&0\\\\0&1\\end{pmatrix}$, is the density higher at $(2, 0)$ or at $(0, 2)$? Give the density at $(2, 0)$. (4 decimals)',
          answer: mvnPdf([2, 0], [0, 0], [[4, 0], [0, 1]]), tolerance: 0.00006, compute: () => mvnPdf([2, 0], [0, 0], [[4, 0], [0, 1]]),
          explain: `Both are 2 away, but $(2, 0)$ is only 1 standard deviation out along the wide axis: ${f(mvnPdf([2, 0], [0, 0], [[4, 0], [0, 1]]))}, against ${f(mvnPdf([0, 2], [0, 0], [[4, 0], [0, 1]]))} at $(0, 2)$, 2 standard deviations out.`,
        },
      },
      { note: '$\\mathcal N(\\boldsymbol\\mu, \\Sigma)$: $\\mathbf x = \\boldsymbol\\mu + L\\mathbf z$ with $\\Sigma = LL^\\top$ and independent normal $\\mathbf z$; change of variables gives $\\frac{1}{(2\\pi)^{d/2}\\sqrt{\\det\\Sigma}}e^{-\\frac12(\\mathbf x - \\boldsymbol\\mu)^\\top\\Sigma^{-1}(\\mathbf x - \\boldsymbol\\mu)}$. Contours: ellipses along $\\Sigma$\'s eigenvectors.' },
    ],
  },

  {
    id: 'map', title: 'MAP estimation and conjugate priors',
    goal: 'Combine a Beta prior with coin flips into a Beta posterior, compute the MAP and posterior mean, and see priors as pseudo-counts (add-one smoothing).',
    builds: ['mle', 'bayes', 'common-distributions'],
    blocks: [
      { md: `Maximum likelihood (lesson [[#mle]]) trusts the data completely. After 3 flips that are all heads, it says $\\hat p = 1$: tails is impossible. That is absurd, and the fix is to include what you believed **before** the data: a **prior**.

**Bayes for a parameter.** Treat the coin's $p$ as uncertain, with a prior density $\\pi(p)$. After seeing data $D$, Bayes' rule (lesson [[#bayes]]) for densities gives the **posterior**:

$$\\pi(p \\mid D) = \\frac{P(D \\mid p)\\,\\pi(p)}{P(D)} \\;\\propto\\; P(D \\mid p)\\,\\pi(p)$$

posterior ∝ likelihood × prior. ($P(D)$ doesn't depend on $p$; it only rescales the area to 1.)

**A prior that fits: the Beta distribution.** $\\text{Beta}(a, b)$ has density $\\propto p^{a-1}(1 - p)^{b-1}$ on $[0, 1]$. $a = b = 1$ is flat (no preference); $a = b = 20$ peaks sharply at $\\frac12$ ("probably a fair coin"). Now multiply by the likelihood of $h$ heads and $t$ tails, $p^h(1 - p)^t$ (lesson [[#likelihood]]):

$$\\pi(p \\mid D) \\propto p^{h}(1 - p)^{t}\\cdot p^{a-1}(1 - p)^{b-1} = p^{(a + h) - 1}(1 - p)^{(b + t) - 1}$$

**Another Beta**: $\\text{Beta}(a + h,\\; b + t)$. When prior and posterior have the same form like this, the prior is called **conjugate**. Updating is just adding counts: the prior behaves like $a - 1$ heads and $b - 1$ tails you had already seen (**pseudo-counts**).

**Point estimates.**
- **MAP** (maximum a posteriori): the peak of the posterior. Set the slope of $\\log$ of the density to zero: $\\frac{a' - 1}{p} - \\frac{b' - 1}{1 - p} = 0$ gives $p = \\frac{a' - 1}{a' + b' - 2}$.
- **Posterior mean**: $\\frac{a'}{a' + b'}$ (from the Beta's integral; **taken on trust**, checked numerically in the figure).

With the flat prior $a = b = 1$, MAP equals the MLE $\\frac{h}{h + t}$. With $a = b = 2$ (one imaginary head and one imaginary tail), three straight heads give MAP $\\frac{4}{5}$ instead of 1. Adding a pseudo-count to every option is **add-one (Laplace) smoothing**, used for word counts so unseen words don't get probability zero. And lesson [[#regularisation]]'s ridge penalty is exactly MAP with a Gaussian prior.` },
      { figure: 'BetaPosteriorFig', caption: 'The prior (grey), the likelihood of the flips (orange, rescaled), and the posterior (teal), which is their product. Add flips and the posterior narrows; a strong prior needs more data to move.' },
      {
        code: {
          file: 'chance.py', fn: 'beta_binomial', notes: [
            ['def beta_binomial(a, b, heads, tails):', ['A Beta($a$, $b$) prior and the observed flips.']],
            ['a2, b2 = a + heads, b + tails', ['Conjugacy: add the counts.']],
            ['return a2, b2, (a2 - 1) / (a2 + b2 - 2), a2 / (a2 + b2)', ['The posterior\'s parameters, its peak (MAP) and its mean.'], { tex: '\\hat p_{\\text{MAP}} = \\frac{a + h - 1}{a + b + h + t - 2}' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'Prior Beta(2, 2), then 3 heads and 0 tails. What is the MAP estimate of $p$?',
          answer: 0.8, tolerance: 1e-9, compute: () => betaBinomial(2, 2, 3, 0)[2],
          explain: 'Posterior Beta(5, 2): MAP $= \\frac{5 - 1}{5 + 2 - 2} = \\frac45$. The MLE would say 1.',
        },
      },
      {
        predict: {
          prompt: 'Same posterior, Beta(5, 2): what is its mean? (4 decimals)',
          answer: 5 / 7, tolerance: 0.00006, compute: () => betaBinomial(2, 2, 3, 0)[3],
          explain: '$\\frac57 = 0.7143$: the mean sits a little further from the edge than the peak.',
        },
      },
      { note: 'Posterior ∝ likelihood × prior. Beta($a$, $b$) prior + $h$ heads, $t$ tails → Beta($a + h$, $b + t$): conjugate, pseudo-counts. MAP $\\frac{a+h-1}{a+b+h+t-2}$; flat prior gives the MLE; add-one smoothing is a prior; ridge is a Gaussian prior.' },
    ],
  },

  {
    id: 'estimation', title: 'Estimators: bias, variance, confidence intervals and the bootstrap',
    goal: 'Split an estimator\'s error into bias² + variance, prove the sample variance needs $n - 1$, read a confidence interval correctly, and get one from the bootstrap when there is no formula.',
    builds: ['clt', 'sums-of-variables', 'map'],
    blocks: [
      { md: `An **estimator** is a recipe that turns data into a guess $\\hat\\theta$ for an unknown $\\theta$: the sample mean for $\\mu$, the MLE, a trained model's accuracy for its true accuracy. Since the data is random, so is $\\hat\\theta$. How good is the recipe?

**Bias and variance.** The **bias** is $\\mathbb E[\\hat\\theta] - \\theta$ (does it aim at the right place?); the **variance** is how much $\\hat\\theta$ jumps from dataset to dataset. The expected squared error splits into exactly these. Write $m = \\mathbb E[\\hat\\theta]$:

$$\\mathbb E[(\\hat\\theta - \\theta)^2] = \\mathbb E[(\\hat\\theta - m + m - \\theta)^2] = \\underbrace{\\mathbb E[(\\hat\\theta - m)^2]}_{\\text{variance}} + 2(m - \\theta)\\underbrace{\\mathbb E[\\hat\\theta - m]}_{0} + \\underbrace{(m - \\theta)^2}_{\\text{bias}^2}$$

The middle term vanishes because $\\hat\\theta$ averages to $m$. **Error = bias² + variance.** A prior or a penalty (last lesson, lesson [[#regularisation]]) deliberately adds a little bias to cut a lot of variance.

**Why the sample variance divides by $n - 1$.** Dividing $\\sum(x_i - \\bar x)^2$ by $n$ comes out too small on average, because $\\bar x$ is fitted to the same data and sits closer to it than the true $\\mu$ does. Exactly how much: expand $x_i - \\mu = (x_i - \\bar x) + (\\bar x - \\mu)$; the cross terms sum to zero (since $\\sum(x_i - \\bar x) = 0$), so
$$\\sum_i(x_i - \\mu)^2 = \\sum_i(x_i - \\bar x)^2 + n(\\bar x - \\mu)^2$$
Take expectations: the left is $n\\sigma^2$, and $\\mathbb E[(\\bar x - \\mu)^2] = \\sigma^2/n$ (lesson [[#sums-of-variables]]). So $\\mathbb E\\big[\\sum(x_i - \\bar x)^2\\big] = n\\sigma^2 - \\sigma^2 = (n - 1)\\sigma^2$. Dividing by $n - 1$ makes it unbiased (**Bessel's correction**). For large $n$ it hardly matters.

**Confidence intervals.** By the CLT, $\\bar x \\approx \\mathcal N(\\mu, \\sigma^2/n)$, so the interval $\\bar x \\pm 1.96\\,\\frac{s}{\\sqrt n}$ (with $s$ the sample standard deviation) captures $\\mu$ in about 95% of datasets. Read it carefully: **the procedure** catches the truth 95% of the time; it is not "a 95% chance $\\mu$ is in this particular interval" (that is a Bayesian statement and needs a prior).

**The bootstrap: intervals without formulas.** For a median, a correlation, an AUC… there may be no handy formula. Pretend the sample **is** the population: draw $n$ points from it **with replacement**, recompute the statistic, repeat 2000 times, and take the middle 95% of the results. It works because resampling mimics the dataset-to-dataset wobble you can't observe directly.` },
      { figure: 'BiasVarianceFig', caption: 'Many datasets drawn from the same source (rows of dots). Each gives an estimate (a tick). Dividing by $n$ aims low (bias); dividing by $n - 1$ is on target. Shrink the estimate toward 0 to trade bias for variance and watch the total error.' },
      {
        code: {
          file: 'chance.py', fn: 'bootstrap_interval', notes: [
            ['def bootstrap_interval(xs, stat, B=2000, seed=0):', ['The data, a statistic (a function of a list), and how many resamples.']],
            ['rng = random.Random(seed)', ['Repeatable randomness.']],
            ['values = sorted(stat([rng.choice(xs) for _ in xs]) for _ in range(B))', ['$B$ times: draw $n$ points with replacement and recompute the statistic; then sort the results.']],
            ['return values[int(0.025 * B)], values[int(0.975 * B) - 1]', ['The 2.5th and 97.5th percentiles: the middle 95%.']],
          ],
        },
      },
      {
        predict: {
          prompt: 'Bootstrap (400 resamples, seed 1) a 95% interval for the mean of $3, 7, 1, 9, 4, 6, 2, 8$. What is its upper end? (2 decimals)',
          answer: bootstrapInterval([3, 7, 1, 9, 4, 6, 2, 8], mean, 400, 1)[1], tolerance: 0.006, compute: () => bootstrapInterval([3, 7, 1, 9, 4, 6, 2, 8], mean, 400, 1)[1],
          explain: `The interval is about (${bootstrapInterval([3, 7, 1, 9, 4, 6, 2, 8], mean, 400, 1).map(v => f(v)).join(', ')}) around the sample mean 5. The CLT formula, $5 \\pm 1.96 \\times 2.93/\\sqrt8 \\approx 5 \\pm 2.0$ (with the $n - 1$ standard deviation, 2.93), gives a similar width.`,
        },
      },
      {
        predict: {
          prompt: 'An estimator has bias 0.3 and variance 0.16. What is its expected squared error?',
          answer: 0.25, tolerance: 1e-9, compute: () => 0.3 ** 2 + 0.16,
          explain: '$0.09 + 0.16 = 0.25$.',
        },
      },
      { note: 'Expected squared error = bias² + variance. $\\mathbb E\\sum(x_i - \\bar x)^2 = (n-1)\\sigma^2$, so divide by $n - 1$. 95% interval $\\bar x \\pm 1.96 s/\\sqrt n$: the procedure is right 95% of the time. Bootstrap: resample with replacement, recompute, take the middle 95%.' },
    ],
  },

  {
    id: 'hypothesis-tests', title: 'Hypothesis tests and p-values, and how they mislead',
    goal: 'Compute a p-value with a permutation test, say exactly what it means and what it doesn\'t, and correct for testing many things at once.',
    builds: ['estimation', 'counting'],
    blocks: [
      { md: `Model B scored higher than model A on a test set. Is B really better, or did it get lucky? A **hypothesis test** asks: **if there were truly no difference, how surprising would a gap this big be?**

1. **Null hypothesis** $H_0$: the boring explanation. "Both models are equally good; any gap is chance."
2. **Test statistic**: a number measuring the effect, like the difference in mean scores.
3. **p-value**: the probability, **assuming $H_0$ is true**, of a statistic at least as extreme as the one observed.

A small p-value (by convention below 0.05) means the data would be unusual under $H_0$, which counts as evidence against it.

**A permutation test makes the null concrete.** If the labels "A" and "B" really don't matter, shuffling them shouldn't change anything. So pool all the scores, shuffle, split into groups of the original sizes, and record the difference in means. Repeat thousands of times: that is the distribution of the gap **under the null**, built from your own data with no assumptions about bell curves. The p-value is the fraction of shuffles whose gap is at least as large as the real one.

**What a p-value is not.**
- It is **not** $P(H_0 \\text{ is true})$. It is $P(\\text{data this extreme} \\mid H_0)$: the conditional is the other way round (lesson [[#bayes]] is exactly how to turn it round, and it needs a prior).
- It is **not** the size or importance of the effect. With a huge test set, a 0.1% improvement can have $p < 0.001$ and still not matter.
- $p = 0.06$ is **not** "no effect"; it is weak evidence.

**Many tests at once.** Test 20 hyperparameter settings, each truly no better, at the 0.05 level. Each has a 5% false-alarm chance, so the chance of at least one false "discovery" is $1 - 0.95^{20} \\approx 0.64$ (complement and independence). This is how "significant" results appear from nothing. The **Bonferroni correction** tests each at $0.05/20$ instead: by the union bound (the "or" rule without the subtraction, $P(A \\cup B) \\le P(A) + P(B)$), the chance of any false alarm is then at most $20 \\times \\frac{0.05}{20} = 0.05$.

In ML papers, beware of results from one random seed, comparisons tuned on the test set, and "state of the art" margins smaller than the run-to-run noise.` },
      { figure: 'PermutationTestFig', caption: 'Two groups of scores. Each shuffle reassigns the labels at random and records the gap in means (grey histogram). The real gap is the orange line; the p-value is the share of shuffles at or beyond it.' },
      {
        code: {
          file: 'chance.py', fn: 'permutation_p_value', notes: [
            ['def permutation_p_value(a, b, trials=5000, seed=0):', ['Two groups, and how many shuffles.']],
            ['rng = random.Random(seed)', ['Repeatable shuffles.']],
            ['observed = abs(mean(a) - mean(b))', ['The real gap (either direction: a two-sided test).']],
            ['pooled = list(a) + list(b)', ['Forget the labels.']],
            ['hits = 0', ['Shuffles at least as extreme as reality.']],
            ['for _ in range(trials):', ['Many times…']],
            ['rng.shuffle(pooled)', ['…reassign labels at random…']],
            ['if abs(mean(pooled[:len(a)]) - mean(pooled[len(a):])) >= observed:', ['…and see whether chance alone made a gap this big.']],
            ['hits += 1', ['Count it.']],
            ['return hits / trials', ['The p-value.'], { tex: 'p = P(|\\text{gap}| \\ge \\text{observed} \\mid H_0)' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'Groups $1, 2, 3, 4$ and $3, 4, 5, 6, 7$: what p-value does the permutation test (400 shuffles, seed 2) give? (3 decimals)',
          answer: permutationPValue([1, 2, 3, 4], [3, 4, 5, 6, 7], 400, 2), tolerance: 0.0006, compute: () => permutationPValue([1, 2, 3, 4], [3, 4, 5, 6, 7], 400, 2),
          explain: `${f(permutationPValue([1, 2, 3, 4], [3, 4, 5, 6, 7], 400, 2))}: a gap of 2.5 arises by chance in about that share of shuffles. Suggestive, not conclusive, with so little data.`,
        },
      },
      {
        predict: {
          prompt: '20 independent tests, each with a 5% false-alarm rate and no real effects. What is the chance of at least one false alarm? (3 decimals)',
          answer: 1 - 0.95 ** 20, tolerance: 0.0006, compute: () => 1 - 0.95 ** 20,
          explain: '$1 - 0.95^{20} = 0.642$. Bonferroni (each at 0.0025) brings it back under 0.05.',
        },
      },
      { note: 'p-value: $P(\\text{a statistic this extreme} \\mid H_0)$, not $P(H_0)$, and not the effect\'s size. Permutation test: shuffle labels to build the null. 20 tests at 0.05 give a 64% chance of a false alarm; Bonferroni divides the threshold by the number of tests.' },
    ],
  },

  {
    id: 'monte-carlo', title: 'Monte Carlo estimation and importance sampling',
    goal: 'Estimate an expectation by averaging samples, know its error shrinks like $1/\\sqrt n$, and derive importance sampling, $\\mathbb E_p[f] = \\mathbb E_q[f\\,p/q]$, with its danger.',
    builds: ['law-large-numbers', 'clt', 'common-distributions'],
    blocks: [
      { md: `Many quantities in ML are expectations you can't compute exactly: the expected return of a policy, the expected loss over all possible inputs, a posterior average. **Monte Carlo** estimation replaces the integral or sum by an average of samples:

$$\\mathbb E_{x \\sim p}[f(x)] \\approx \\frac1n\\sum_{i=1}^n f(x_i), \\qquad x_i \\sim p$$

The law of large numbers says it converges; the CLT says the error is about $\\frac{\\sigma_f}{\\sqrt n}$, where $\\sigma_f$ is the spread of $f(x)$. Notice what is **missing**: the dimension. Grid-based integration needs $k^d$ points in $d$ dimensions; Monte Carlo's error doesn't care about $d$. That is why it rules high-dimensional problems. (The price: $\\frac{1}{\\sqrt n}$ is slow. One more correct digit costs 100 times the samples.)

Example: $\\pi$. Drop points uniformly in the square $[0, 1]^2$; the fraction inside the quarter-circle $x^2 + y^2 \\le 1$ estimates its area, $\\frac\\pi4$. That is $\\mathbb E[f]$ with $f$ the indicator of "inside".

**Importance sampling.** Sometimes you can't sample from $p$, or $p$ rarely visits where $f$ matters. Sample from another distribution $q$ instead and **reweight**:

$$\\mathbb E_p[f(x)] = \\int f(x)\\,p(x)\\,dx = \\int f(x)\\frac{p(x)}{q(x)}\\,q(x)\\,dx = \\mathbb E_q\\!\\left[f(x)\\frac{p(x)}{q(x)}\\right]$$

(multiplying and dividing by $q$, wherever $q > 0$). So average $f(x_i)\\frac{p(x_i)}{q(x_i)}$ over samples $x_i \\sim q$. The weights $\\frac{p}{q}$ correct for sampling from the "wrong" distribution.

**The danger.** If $q$ is small where $p$ is not, a few samples get huge weights and the estimate's variance explodes; it is unbiased but useless. Choose $q$ that covers $p$ everywhere.

**In ML**: off-policy reinforcement learning learns about one policy from another's data, weighting by the ratio $\\frac{\\pi_{\\text{new}}(a \\mid s)}{\\pi_{\\text{old}}(a \\mid s)}$; **PPO clips that ratio** (lesson [[#piecewise]]) precisely to stop huge weights wrecking an update.` },
      { figure: 'MonteCarloFig', caption: 'Estimating π with random points: the estimate wanders, and the error band shrinks like $1/\\sqrt n$. Switch to importance sampling a rare event: sampling from $p$ almost never sees it; sampling from a well-chosen $q$ and reweighting does.' },
      {
        code: {
          file: 'chance.py', fn: 'monte_carlo', notes: [
            ['def monte_carlo(f, sampler, n, seed=0):', ['A function, a way to draw $x \\sim p$, and a sample count.']],
            ['rng = random.Random(seed)', ['Repeatable randomness.']],
            ['return sum(f(sampler(rng)) for _ in range(n)) / n', ['Average $f$ over $n$ draws.'], { tex: '\\mathbb E_p[f] \\approx \\frac1n\\sum f(x_i)' }],
          ],
        },
      },
      {
        code: {
          file: 'chance.py', fn: 'importance', notes: [
            ['def importance(f, p, q, q_sampler, n, seed=0):', ['The target density $p$, the sampling density $q$, and a way to draw from $q$.']],
            ['rng = random.Random(seed)', ['Repeatable randomness.']],
            ['total = 0.0', ['Running sum.']],
            ['for _ in range(n):', ['Each sample…']],
            ['x = q_sampler(rng)', ['…drawn from $q$, not $p$…']],
            ['total += f(x) * p(x) / q(x)', ['…weighted by $p(x)/q(x)$ to correct for that.']],
            ['return total / n', ['$\\approx\\mathbb E_p[f]$.'], { tex: '\\mathbb E_p[f] = \\mathbb E_q\\!\\left[f\\,\\tfrac{p}{q}\\right]' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'Estimate $\\mathbb E[X^2]$ for $X$ uniform on $[0, 1]$ with 1000 samples (seed 6). (3 decimals; the exact value is $\\frac13$)',
          answer: monteCarlo(x => x * x, r => r.random(), 1000, 6), tolerance: 0.0006, compute: () => monteCarlo(x => x * x, r => r.random(), 1000, 6),
          explain: `${f(monteCarlo(x => x * x, r => r.random(), 1000, 6))}, within about $\\sigma_f/\\sqrt{1000} \\approx 0.009$ of $\\frac13$.`,
        },
      },
      {
        predict: {
          prompt: 'Estimate $\\mathbb E_p[X]$ for the density $p(x) = 2x$ on $[0, 1]$ by sampling **uniformly** ($q = 1$) and weighting by $p/q$ (1000 samples, seed 7). (3 decimals; exactly $\\frac23$)',
          answer: importance(x => x, x => (x >= 0 && x <= 1 ? 2 * x : 0), () => 1, r => r.random(), 1000, 7), tolerance: 0.0006,
          compute: () => importance(x => x, x => (x >= 0 && x <= 1 ? 2 * x : 0), () => 1, r => r.random(), 1000, 7),
          explain: `${f(importance(x => x, x => (x >= 0 && x <= 1 ? 2 * x : 0), () => 1, r => r.random(), 1000, 7))}: close to $\\frac23$, without ever sampling from $p$.`,
        },
      },
      { note: 'Monte Carlo: $\\mathbb E_p[f] \\approx \\frac1n\\sum f(x_i)$, error $\\sigma_f/\\sqrt n$ in any dimension. Importance sampling: $\\mathbb E_p[f] = \\mathbb E_q[f\\,p/q]$; weights blow up where $q \\ll p$. PPO clips the ratio for this reason.' },
    ],
  },

  {
    id: 'jensen', title: 'Jensen\'s inequality',
    goal: 'Prove $\\mathbb E[f(X)] \\ge f(\\mathbb E[X])$ for a convex $f$ from its tangent line, and use it for $\\log\\mathbb E \\ge \\mathbb E\\log$ (the ELBO), KL $\\ge 0$, and AM–GM.',
    builds: ['second-derivative', 'expectation', 'logarithms'],
    blocks: [
      { md: `A function is **convex** if it curves upward everywhere: $f'' \\ge 0$ (lesson [[#second-derivative]]). $x^2$, $e^x$ and $-\\ln x$ are convex. Jensen's inequality says that for convex $f$:

$$\\mathbb E[f(X)] \\;\\ge\\; f(\\mathbb E[X])$$

**the average of $f$ is at least $f$ of the average.** Picture two points on a cup: the chord between them lies above the curve, so the average of the heights is above the height at the average.

**Proof from the tangent line.** Let $\\mu = \\mathbb E[X]$, and let $\\ell(x) = f(\\mu) + f'(\\mu)(x - \\mu)$ be the tangent line at $\\mu$.

1. **A convex curve lies above its tangents.** Let $g = f - \\ell$. Then $g(\\mu) = 0$, $g'(\\mu) = 0$, and $g'' = f'' \\ge 0$, so $g'$ never decreases: $g' \\le 0$ left of $\\mu$ and $\\ge 0$ right of it. So $g$ goes down to $\\mu$ and up after (lesson [[#minimum]]): its lowest value is $g(\\mu) = 0$. Hence $f(x) \\ge \\ell(x)$ for every $x$.
2. **Average both sides.** Expectations keep $\\ge$, and $\\ell$ is a line, so by linearity $\\mathbb E[\\ell(X)] = f(\\mu) + f'(\\mu)(\\mathbb E[X] - \\mu) = f(\\mu)$. So $\\mathbb E[f(X)] \\ge f(\\mu)$. $\\blacksquare$

For **concave** $f$ (curving down, like $\\ln$), everything flips: $\\mathbb E[f(X)] \\le f(\\mathbb E[X])$.

**Three uses.**
- **$\\log\\mathbb E \\ge \\mathbb E\\log$.** Since $\\ln$ is concave, $\\ln\\mathbb E[Y] \\ge \\mathbb E[\\ln Y]$. Variational autoencoders and diffusion models can't compute $\\ln p(x) = \\ln\\mathbb E_{q(z)}\\!\\left[\\frac{p(x, z)}{q(z)}\\right]$, so they maximise the **evidence lower bound** $\\mathbb E_q\\!\\left[\\ln\\frac{p(x, z)}{q(z)}\\right]$, which is below it by exactly this inequality.
- **KL ≥ 0.** $-D_{KL}(p\\|q) = \\mathbb E_p\\!\\left[\\ln\\frac qp\\right] \\le \\ln\\mathbb E_p\\!\\left[\\frac qp\\right] = \\ln\\sum_k p_k\\frac{q_k}{p_k} \\le \\ln 1 = 0$. (Lesson [[#entropy-kl]] proves the same with $\\ln t \\le t - 1$; this is the version papers cite.)
- **AM–GM.** For positive numbers, $\\ln$ concave gives $\\frac1n\\sum\\ln x_i \\le \\ln\\left(\\frac1n\\sum x_i\\right)$; exponentiate: the geometric mean $\\sqrt[n]{x_1\\cdots x_n}$ is at most the arithmetic mean.` },
      { figure: 'JensenFig', caption: 'Points on a convex curve, equally likely. The average of their heights (orange) sits above the curve\'s height at their average (teal), by exactly the Jensen gap. The tangent line at the average stays below the curve.' },
      {
        code: {
          file: 'chance.py', fn: 'jensen_gap', notes: [
            ['def jensen_gap(f, xs):', ['A function and equally likely values.']],
            ['return mean([f(x) for x in xs]) - f(mean(xs))', ['$\\mathbb E[f(X)] - f(\\mathbb E[X])$: $\\ge 0$ for convex $f$.'], { tex: '\\mathbb E[f(X)] - f(\\mathbb E X) \\ge 0' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'For $f(x) = x^2$ and values $1, 2, 6$ (equally likely), what is the Jensen gap?',
          answer: jensenGap(x => x * x, [1, 2, 6]), tolerance: 1e-9, compute: () => jensenGap(x => x * x, [1, 2, 6]),
          explain: '$\\mathbb E[X^2] = \\frac{1 + 4 + 36}{3} = \\frac{41}3$, $(\\mathbb E X)^2 = 9$, gap $\\frac{14}{3} \\approx 4.667$: the variance, as for $x^2$ it must be.',
        },
      },
      {
        predict: {
          prompt: 'Geometric mean of $2$ and $8$? (Compare with their average, 5.)',
          answer: 4, tolerance: 1e-9, compute: () => Math.exp((Math.log(2) + Math.log(8)) / 2),
          explain: '$\\sqrt{16} = 4 \\le 5$: AM–GM, from the concavity of $\\ln$.',
        },
      },
      { note: 'Convex $f$ ($f\'\' \\ge 0$): $\\mathbb E f(X) \\ge f(\\mathbb E X)$, because $f$ lies above its tangent at the mean. Concave: reversed. Gives $\\ln\\mathbb E \\ge \\mathbb E\\ln$ (the ELBO), KL $\\ge 0$, and AM–GM.' },
    ],
  },

  {
    id: 'information', title: 'Information: surprise, bits and mutual information',
    goal: 'Derive $-\\log_2 p$ as the surprise of an outcome, read entropy as the average number of yes/no questions, prove $H \\le \\log_2 n$, and compute mutual information.',
    builds: ['jensen', 'joint-marginal', 'logarithms'],
    blocks: [
      { md: `How much information does an outcome carry? A sensible measure of **surprise** $s(p)$ for an outcome of probability $p$ should satisfy:
- certain outcomes carry none: $s(1) = 0$;
- rarer means more surprising: $s$ decreases as $p$ grows;
- for **independent** outcomes, surprises add: $s(pq) = s(p) + s(q)$ (learning two unrelated facts tells you the sum of what each does).

The last property is what a logarithm does (lesson [[#logarithms]]: logs turn products into sums). So $s(p) = -\\log p$; the base only sets the unit. With base 2 the unit is the **bit**: a fair coin flip ($p = \\frac12$) carries $-\\log_2\\frac12 = 1$ bit, one yes/no answer. A 1-in-1024 outcome carries 10 bits: ten halvings.

**Entropy** is the average surprise:

$$H(X) = \\sum_x p(x)\\,(-\\log_2 p(x))$$

Read it as **the average number of yes/no questions an ideal guesser needs** to pin down the outcome. A fair 8-sided die: 3 bits. A loaded coin that lands heads 99% of the time: 0.08 bits, almost no uncertainty. That reading is also literal for codes: give outcome $x$ a codeword about $-\\log_2 p(x)$ bits long, short for common outcomes, and the average length is $H$, the best possible (*Shannon's source coding theorem*, **taken on trust**). Morse code's single dot for "E" is the idea.

**Entropy is largest when all $n$ outcomes are equally likely**: $H \\le \\log_2 n$. Proof by Jensen (last lesson), $\\log_2$ being concave: $H = \\mathbb E\\!\\left[\\log_2\\frac{1}{p(X)}\\right] \\le \\log_2\\mathbb E\\!\\left[\\frac{1}{p(X)}\\right] = \\log_2\\sum_x p(x)\\frac{1}{p(x)} = \\log_2 n$. $\\blacksquare$

**Mutual information**: how many bits knowing $Y$ tells you about $X$:

$$I(X; Y) = \\sum_{x, y} p(x, y)\\log_2\\frac{p(x, y)}{p(x)\\,p(y)}$$

It compares the joint table with what independence would predict (lesson [[#joint-marginal]]). It is 0 exactly when $X$ and $Y$ are independent, and positive otherwise (it is a KL divergence, so Jensen applies). It equals $H(X) - H(X \\mid Y)$: the uncertainty about $X$ removed by seeing $Y$. Contrastive learning (CLIP, InfoNCE) trains representations to keep mutual information between two views of the same thing; feature selection ranks features by it.

Natural logs measure in **nats** instead of bits ($1 \\text{ nat} = \\log_2 e \\approx 1.44$ bits); ML losses usually use nats. Lesson [[#entropy-kl]] builds cross-entropy and KL divergence from here.` },
      { figure: 'EntropyBitsFig', caption: 'Shape a distribution over 8 outcomes. Each bar\'s label is its surprise in bits; entropy is their probability-weighted average. Flatten it to reach the maximum, 3 bits; make one outcome dominate and it falls toward 0.' },
      {
        code: {
          file: 'chance.py', fn: 'entropy_bits', notes: [
            ['def entropy_bits(ps):', ['A distribution.']],
            ['return -sum(p * math.log2(p) for p in ps if p > 0)', ['Average surprise in bits; impossible outcomes contribute nothing.'], { tex: 'H = -\\sum p\\log_2 p' }],
          ],
        },
      },
      {
        code: {
          file: 'chance.py', fn: 'mutual_information', notes: [
            ['def mutual_information(joint):', ['A joint table $\\{(x, y): p\\}$.']],
            ['px, py = marginal(joint, 0), marginal(joint, 1)', ['Both marginals (lesson [[#joint-marginal]]).']],
            ['return sum(p * math.log2(p / (px[x] * py[y])) for (x, y), p in joint.items() if p > 0)', ['Compare each cell with the independent prediction $p(x)p(y)$.'], { tex: 'I(X;Y) = \\sum p(x,y)\\log_2\\frac{p(x,y)}{p(x)p(y)}' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'What is the entropy of a fair six-sided die, in bits? (3 decimals)',
          answer: Math.log2(6), tolerance: 0.0006, compute: () => entropyBits(Array(6).fill(1 / 6)),
          explain: '$\\log_2 6 = 2.585$: between 2 questions (4 outcomes) and 3 (8 outcomes).',
        },
      },
      {
        predict: {
          prompt: 'Two variables that agree 80% of the time: $p(0,0) = p(1,1) = 0.4$, $p(0,1) = p(1,0) = 0.1$. Their mutual information in bits? (3 decimals)',
          answer: mutualInformation(new Map([[[0, 0], 0.4], [[0, 1], 0.1], [[1, 0], 0.1], [[1, 1], 0.4]])), tolerance: 0.0006,
          compute: () => mutualInformation(new Map([[[0, 0], 0.4], [[0, 1], 0.1], [[1, 0], 0.1], [[1, 1], 0.4]])),
          explain: `${f(mutualInformation(new Map([[[0, 0], 0.4], [[0, 1], 0.1], [[1, 0], 0.1], [[1, 1], 0.4]])))} bits of the 1 bit $X$ carries: knowing $Y$ removes about a quarter of the uncertainty.`,
        },
      },
      { note: 'Surprise $-\\log_2 p$ bits (zero for certainty, additive for independent events). Entropy $H = -\\sum p\\log_2 p$: average surprise, average questions, best code length; $H \\le \\log_2 n$ by Jensen. Mutual information: bits $Y$ tells about $X$; 0 iff independent.' },
    ],
  },

  {
    id: 'markov-chains', title: 'Markov chains and stationary distributions',
    goal: 'Describe a process by a transition matrix, evolve a distribution with $\\boldsymbol\\pi_{t+1} = \\boldsymbol\\pi_tP$, find the stationary distribution, and recognise Markov chains in RL, PageRank and MCMC.',
    builds: ['joint-marginal', 'eigenvectors', 'matrix-multiplication'],
    blocks: [
      { md: `A **Markov chain** is a process that moves between **states** at each step, where the chance of the next state depends **only on the current one**, not on the history: $P(s_{t+1} \\mid s_t, s_{t-1}, \\dots) = P(s_{t+1} \\mid s_t)$ (the **Markov property**). Weather (sunny or rainy tomorrow, given today), a board game position, a web surfer clicking links, and the environment in reinforcement learning (given the state and action) are all modelled this way.

**The transition matrix.** $P_{ij}$ = the chance of moving from state $i$ to state $j$. Each row is a distribution over where you go next, so each row adds to 1:

$$P = \\begin{pmatrix} 0.9 & 0.1 \\\\ 0.5 & 0.5\\end{pmatrix} \\quad (\\text{sunny} \\to \\text{sunny } 0.9,\\; \\text{rainy} \\to \\text{sunny } 0.5)$$

**Evolving a distribution.** If today's chances are $\\boldsymbol\\pi_t$ (a row vector), tomorrow's chance of state $j$ adds up every way to get there (marginalising over today's state, lesson [[#joint-marginal]]):
$$\\pi_{t+1}(j) = \\sum_i \\pi_t(i)\\,P_{ij} \\qquad\\text{that is,}\\qquad \\boldsymbol\\pi_{t+1} = \\boldsymbol\\pi_t P$$
a vector times a matrix. After $k$ steps: $\\boldsymbol\\pi_0P^k$.

**The stationary distribution** is a $\\boldsymbol\\pi$ that one step leaves unchanged: $\\boldsymbol\\pi = \\boldsymbol\\pi P$. (Transposed, $P^\\top\\boldsymbol\\pi^\\top = \\boldsymbol\\pi^\\top$: an eigenvector with eigenvalue 1, lesson [[#eigenvectors]].) For the weather: $\\pi_s = 0.9\\pi_s + 0.5\\pi_r$ gives $0.1\\pi_s = 0.5\\pi_r$, and with $\\pi_s + \\pi_r = 1$, $\\boldsymbol\\pi = (\\frac56, \\frac16)$: five sunny days in six, in the long run. For a chain that can reach every state from every state and doesn't cycle rigidly, **any** starting distribution converges to this one (**taken on trust**; the figure shows it). It is also the long-run fraction of time spent in each state.

**Where they appear.**
- **Reinforcement learning**: an environment is a Markov decision process; a fixed policy turns it into a Markov chain, and the Bellman equation (QMaze and CartPole Labs) averages over its transitions.
- **PageRank**: a random surfer following links; pages ranked by the stationary distribution.
- **MCMC** (Markov chain Monte Carlo): design a chain whose stationary distribution is the posterior you want, run it, and use its states as samples (for Monte Carlo, lesson [[#monte-carlo]]).
- **Text**: an $n$-gram language model is a Markov chain on words; a Transformer conditions on the whole history instead, which is exactly what breaks the Markov property and makes it more powerful.` },
      { figure: 'MarkovChainFig', caption: 'A three-state chain. Step the distribution forward from any start: the bars settle on the stationary distribution. Below, one random walk; the fraction of time it spends in each state approaches the same numbers.' },
      {
        code: {
          file: 'chance.py', fn: 'markov_step', notes: [
            ['def markov_step(P, dist):', ['The transition matrix and today\'s distribution.']],
            ['return [sum(dist[i] * P[i][j] for i in range(len(dist))) for j in range(len(dist))]', ['For each next state $j$: add, over today\'s states $i$, the chance of being at $i$ times the chance of moving $i \\to j$.'], { tex: '\\boldsymbol\\pi_{t+1} = \\boldsymbol\\pi_tP' }],
          ],
        },
      },
      {
        code: {
          file: 'chance.py', fn: 'stationary', notes: [
            ['def stationary(P, steps=200):', ['Find the long-run distribution by simply running the chain\'s distribution forward.']],
            ['dist = [1.0 / len(P)] * len(P)', ['Start anywhere: here, uniform.']],
            ['for _ in range(steps):', ['Many steps…']],
            ['dist = markov_step(P, dist)', ['…each one $\\boldsymbol\\pi \\leftarrow \\boldsymbol\\pi P$.']],
            ['return dist', ['Settled: $\\boldsymbol\\pi = \\boldsymbol\\pi P$. (This is power iteration, lesson [[#eigenvectors]]\'s exercise, on $P^\\top$.)']],
          ],
        },
      },
      { python: { program: 'chance', label: 'Run the probability additions in real Python' } },
      {
        code: {
          file: 'chance.py', fn: 'show_chance', notes: [
            ['def show_chance():', ['One line per tool.']],
            ['dice = [(x, y) for x in range(1, 7) for y in range(1, 7)]', ['The 36 outcomes of two dice.']],
            ['print("P(a six on either die), by inclusion–exclusion:", inclusion_exclusion([lambda o: o[0] == 6, lambda o: o[1] == 6], dice))', ['Lesson [[#axioms]]: $\\frac{11}{36}$.']],
            ['print("first die even, total 7: independent?", independent(lambda o: o[0] % 2 == 0, lambda o: o[0] + o[1] == 7, dice))', ['Lesson [[#independence]]: True.']],
            ['print("Poisson(3): P(0), P(3) =", poisson_pmf(0, 3.0), poisson_pmf(3, 3.0))', ['Lesson [[#common-distributions]].']],
            ['print("Chebyshev bound for 100 dice, ε = 0.5:", chebyshev_bound(math.sqrt(35 / 12), 100, 0.5))', ['Lesson [[#law-large-numbers]].']],
            ['print("stationary distribution:", stationary([[0.9, 0.1], [0.5, 0.5]]))', ['This lesson: $(\\frac56, \\frac16)$.']],
            ['print("entropy of a fair coin and a fair die, in bits:", entropy_bits([0.5, 0.5]), entropy_bits([1 / 6] * 6))', ['Lesson [[#information]].']],
            ['print("Beta(1, 1) after 7 heads, 3 tails (a, b, MAP, mean):", beta_binomial(1, 1, 7, 3))', ['Lesson [[#map]].']],
          ],
        },
      },
      {
        predict: {
          prompt: 'Weather chain $P = \\begin{pmatrix}0.9&0.1\\\\0.5&0.5\\end{pmatrix}$. Starting from a rainy day $(0, 1)$, what is the chance of sun two days later?',
          answer: 0.7, tolerance: 1e-9, compute: () => markovStep([[0.9, 0.1], [0.5, 0.5]], markovStep([[0.9, 0.1], [0.5, 0.5]], [0, 1]))[0],
          explain: 'Tomorrow: $(0.5, 0.5)$. The day after: $0.5 \\times 0.9 + 0.5 \\times 0.5 = 0.7$.',
        },
      },
      {
        predict: {
          prompt: 'What is the long-run fraction of sunny days? (4 decimals)',
          answer: 5 / 6, tolerance: 0.00006, compute: () => stationary([[0.9, 0.1], [0.5, 0.5]])[0],
          explain: '$\\frac56 = 0.8333$, from $\\boldsymbol\\pi = \\boldsymbol\\pi P$.',
        },
      },
      { note: 'Markov: the next state depends only on the current one. $P_{ij}$ = chance $i \\to j$, rows add to 1. $\\boldsymbol\\pi_{t+1} = \\boldsymbol\\pi_tP$. Stationary: $\\boldsymbol\\pi = \\boldsymbol\\pi P$, the long-run share of time. RL environments, PageRank, MCMC, $n$-gram models.' },
    ],
  },
]
