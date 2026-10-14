// The optimisation part: convexity, why gradient descent converges (the descent lemma and 2/L),
// Newton's method, stochastic gradient descent, momentum and schedules, Lagrange multipliers, the
// KKT conditions, and duality.
import { isConvexOn, descentStep, newton, sgd, fullGradient, momentum, cosineSchedule, bestOnCircle, kktBounded, projectedGd, dualValue } from '../engine/maths.js'
import { f } from './util.js'

const XS = [1, 2, 3, 4, 5], YS = [2.1, 3.9, 6.2, 7.8, 10.1]

export const OPTIM = {
  id: 'optimisation', title: 'Part [[#part:optimisation]] · Optimisation', lessons: [
    {
      id: 'convexity', title: 'Convex functions: one valley, no traps',
      goal: 'Define convex functions by the chord, test convexity with $f\'\' \\ge 0$ or a positive semidefinite Hessian, and prove that for a convex function every flat point is the global minimum.',
      builds: ['jensen', 'hessian', 'positive-definite'],
      blocks: [
        { md: `Training means minimising a loss. The worry is always: will we get **stuck** in a dip that isn't the bottom? For one family of functions, the answer is a guaranteed no.

**Convex.** A function is convex if the straight line (**chord**) between any two points of its graph lies on or above the graph:

$$f\\big(t\\,a + (1 - t)\\,b\\big) \\;\\le\\; t\\,f(a) + (1 - t)\\,f(b) \\qquad\\text{for all } a, b \\text{ and } 0 \\le t \\le 1$$

The left side is the curve's height at a point between $a$ and $b$; the right side is the chord's height there. (Jensen's inequality, lesson [[#jensen]], is this with $t$ replaced by probabilities.)

**Tests you can use.**
- One input: $f'' \\ge 0$ everywhere. Lesson [[#jensen]] showed this keeps the curve above its tangents, and the same argument gives the chord condition.
- Many inputs: the Hessian is positive semidefinite everywhere (lesson [[#positive-definite]]); along any line $g(t) = f(\\mathbf x + t\\mathbf d)$ has $g'' = \\mathbf d^\\top H\\mathbf d \\ge 0$ (lesson [[#hessian]]).
- Building blocks: sums of convex functions are convex, as are convex functions of linear expressions ($f(W\\mathbf x + \\mathbf b)$ in $\\mathbf x$), and maxima of convex functions (so ReLU, $\\max(0, z)$, and $|x|$ are convex though they have corners).

Convex: $x^2$, $e^x$, $|x|$, $-\\ln x$, squared error, logistic loss, cross-entropy as a function of the logits, $\\|\\mathbf w\\|^2$. **Not** convex: $\\sin x$, and the loss of any neural network with a hidden layer as a function of its weights (swapping two hidden neurons gives the same loss, so there are several separate bottoms).

**The payoff: every flat point is the global minimum.** Suppose $f$ is convex and differentiable, and $\\nabla f(\\mathbf x^*) = \\mathbf 0$. Lesson [[#jensen]]'s step 1 says a convex function lies above every tangent: $f(\\mathbf y) \\ge f(\\mathbf x^*) + \\nabla f(\\mathbf x^*)\\cdot(\\mathbf y - \\mathbf x^*) = f(\\mathbf x^*)$ for every $\\mathbf y$. $\\blacksquare$ No traps: gradient descent on a convex loss (linear regression, logistic regression, an SVM) can't get stuck anywhere but the bottom.

Deep networks aren't convex, yet in practice their many minima tend to be about equally good, and their flat points are mostly saddles (lesson [[#hessian]]), which noisy gradient steps escape. Convex analysis is still the foundation every optimiser's theory starts from.` },
        { figure: 'ConvexityFig', caption: 'Drag the two chord ends along the curve. For a convex function the chord never dips below it; for a non-convex one you can find a chord that does, and a second valley where descent can stop.' },
        {
          code: {
            file: 'optimise.py', fn: 'chord_above', notes: [
              ['def chord_above(f, a, b, t):', ['Two points and a mixing weight $t$.']],
              ['return f(t * a + (1 - t) * b) <= t * f(a) + (1 - t) * f(b) + 1e-12', ['Is the curve at the mixed point no higher than the chord? (A hair of slack for rounding.)'], { tex: 'f(ta + (1-t)b) \\le tf(a) + (1-t)f(b)' }],
            ],
          },
        },
        {
          code: {
            file: 'optimise.py', fn: 'is_convex_on', notes: [
              ['def is_convex_on(f, lo, hi, n=40):', ['Check an interval by brute force.']],
              ['xs = [lo + (hi - lo) * i / n for i in range(n + 1)]', ['A grid of points.']],
              ['for a in xs:', ['Every pair of points…']],
              ['for b in xs:', ['…on the grid…']],
              ['for t in (0.25, 0.5, 0.75):', ['…and a few mixing weights.']],
              ['if not chord_above(f, a, b, t):', ['One chord dipping below…']],
              ['return False', ['…disproves convexity (a counterexample, lesson [[#proof]]).']],
              ['return True', ['None found: evidence of convexity on this interval, not proof.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'Does the grid check find $\\sin x$ convex on $[-3, 3]$? (1 for yes, 0 for no)',
            answer: 0, compute: () => Number(isConvexOn(Math.sin, -3, 3)),
            explain: 'No: on $(0, \\pi)$ the sine bends downward, so the curve rises above its chords there. One such chord is enough.',
          },
        },
        {
          choice: {
            prompt: 'Which loss is convex in its parameters?',
            options: [
              { text: 'Logistic regression\'s cross-entropy in $(\\mathbf w, b)$', why: 'Yes: $-\\log\\sigma(z)$ is convex in $z$ (its second derivative is $\\sigma(1 - \\sigma) > 0$), and $z = \\mathbf w^\\top\\mathbf x + b$ is linear in the parameters.' },
              { text: 'A two-layer network\'s squared error in its weights', why: 'Not convex: swapping hidden neurons gives several separate minima with the same loss.' },
              { text: '$\\sin(w)$', why: 'It bends both ways.' },
            ],
            answer: 0,
          },
        },
        { note: 'Convex: chords lie above the graph; $f\'\' \\ge 0$, or a positive semidefinite Hessian. Sums, maxima and convex-of-linear stay convex. For convex $f$, $\\nabla f = 0$ means global minimum (the tangent is a floor). Linear and logistic regression are convex; neural networks are not.' },
      ],
    },

    {
      id: 'gd-convergence', title: 'Why gradient descent works: the descent lemma',
      goal: 'Prove that a gradient step lowers the loss by at least $\\eta(1 - \\tfrac{L\\eta}{2})\\|\\nabla f\\|^2$ when curvature is at most $L$, derive the step limit $2/L$ and the best step $1/L$, and see the convergence rate on a convex bowl.',
      builds: ['convexity', 'taylor', 'second-derivative'],
      blocks: [
        { md: `Lessons [[#gradient-descent-1d]] and [[#eigenvectors]] found by experiment and on bowls that the learning rate must stay below $2/(\\text{curvature})$. Here is the general reason, for any smooth function, not only bowls.

**Smoothness.** Say the curvature of $f$ is at most $L$ everywhere: $f'' \\le L$ (with many inputs: the Hessian's eigenvalues are at most $L$). $L$ is the **smoothness constant**: how fast the slope can change.

**The descent lemma.** Take a step of size $\\eta$ against the slope $g = f'(x)$. Taylor's theorem with the error bound (lesson [[#taylor]], to second order) says the true value is at most the tangent line plus the worst possible bend:

$$f(x - \\eta g) \\;\\le\\; f(x) - \\eta g^2 + \\frac L2(\\eta g)^2 = f(x) - \\eta\\left(1 - \\frac{L\\eta}{2}\\right)g^2$$

(the tangent predicts a drop of $\\eta g\\cdot g$; the curvature can claw back at most $\\frac L2$ times the step squared). Read off everything:

- If $0 < \\eta < \\frac2L$, the bracket is positive, so **every step lowers the loss** (unless $g = 0$: already flat).
- The guaranteed drop $\\eta(1 - \\frac{L\\eta}2)$ is a parabola in $\\eta$, largest at $\\eta = \\frac1L$, where it is $\\frac{g^2}{2L}$. Hence the textbook rule "learning rate $= 1/L$".
- At $\\eta = \\frac2L$ the guarantee is zero, and beyond it the loss can **rise**: lesson [[#gradient-descent-1d]]'s divergence.

**How fast?** Add the guaranteed drops over $T$ steps with $\\eta = \\frac1L$: the total drop $\\frac1{2L}\\sum g_t^2$ can't exceed $f(x_0) - f_{\\min}$. So the smallest gradient seen is at most $\\sqrt{2L(f(x_0) - f_{\\min})/T}$: steps get flatter like $1/\\sqrt T$, even for non-convex $f$. For a **strongly convex** bowl, curvature at least $\\mu > 0$ everywhere, the distance to the minimum shrinks by a factor of at most $1 - \\frac\\mu L$ per step (lesson [[#eigenvectors]]'s $|1 - \\eta\\lambda|$ with $\\eta = \\frac1L$). That ratio $\\kappa = L/\\mu$, the **condition number**, decides everything: a round bowl ($\\kappa = 1$) is solved in one step; a long narrow valley ($\\kappa = 1000$) takes thousands. Momentum, Adam and preconditioning all exist to fight a large $\\kappa$.` },
        { figure: 'DescentLemmaFig', caption: 'One gradient step from $x$. The orange parabola is the descent lemma\'s worst case; the real function (grey) always lies below it. Slide $\\eta$: the guaranteed drop peaks at $1/L$ and vanishes at $2/L$.' },
        {
          code: {
            file: 'optimise.py', fn: 'descent_step', notes: [
              ['def descent_step(f, grad, x, eta, L):', ['A function, its slope, where we are, the step size, and the curvature bound $L$.']],
              ['g = grad(x)', ['The slope here.']],
              ['actual = f(x) - f(x - eta * g)', ['How much one step really lowers $f$.']],
              ['guaranteed = eta * (1 - L * eta / 2) * g * g', ['The descent lemma\'s promise.'], { tex: 'f(x) - f(x - \\eta g) \\ge \\eta\\left(1 - \\tfrac{L\\eta}{2}\\right)g^2' }],
              ['return actual, guaranteed', ['The first is never smaller than the second.']],
            ],
          },
        },
        {
          predict: {
            prompt: '$f(x) = x^2$ ($L = 2$), from $x = 3$ with $\\eta = 0.25$. What drop does the descent lemma guarantee?',
            answer: descentStep(x => x * x, x => 2 * x, 3, 0.25, 2)[1], tolerance: 1e-9, compute: () => descentStep(x => x * x, x => 2 * x, 3, 0.25, 2)[1],
            explain: `$0.25 \\times (1 - 0.25) \\times 36 = 6.75$. The actual drop is ${f(descentStep(x => x * x, x => 2 * x, 3, 0.25, 2)[0])}: here the bound is exact, since $x^2$'s curvature is exactly $L$ everywhere.`,
          },
        },
        {
          predict: {
            prompt: 'A loss has curvature at most $L = 50$. What learning rate gives the largest guaranteed drop?',
            answer: 0.02, tolerance: 1e-9, compute: () => 1 / 50,
            explain: '$\\eta = 1/L = 0.02$, guaranteeing a drop of $g^2/(2L)$; anything at or above $2/L = 0.04$ guarantees nothing.',
          },
        },
        { note: 'If curvature $\\le L$: $f(x - \\eta g) \\le f(x) - \\eta(1 - \\frac{L\\eta}2)g^2$. So $\\eta < 2/L$ always helps, $\\eta = 1/L$ is the safest best, and gradients shrink like $1/\\sqrt T$. On a bowl with curvature in $[\\mu, L]$, distance shrinks by $1 - \\mu/L$ per step: the condition number $L/\\mu$ sets the pace.' },
      ],
    },

    {
      id: 'newton', title: 'Newton\'s method: use the curvature',
      goal: 'Derive Newton\'s step $x \\leftarrow x - f\'(x)/f\'\'(x)$ from the second-order Taylor parabola, see its digits double each step, and know why deep learning approximates it instead of using it.',
      builds: ['gd-convergence', 'hessian'],
      blocks: [
        { md: `Gradient descent uses only the slope, so it must guess a step size. **Newton's method** also uses the curvature, and the step size comes for free.

**The step.** Near $x$, Taylor's second-order approximation (lesson [[#taylor]]) is a parabola:
$$f(x + \\Delta) \\approx f(x) + f'(x)\\,\\Delta + \\tfrac12 f''(x)\\,\\Delta^2$$
If $f''(x) > 0$ it has a lowest point, where its slope $f'(x) + f''(x)\\Delta$ is zero: $\\Delta = -\\frac{f'(x)}{f''(x)}$. Jump there, and repeat:
$$x \\leftarrow x - \\frac{f'(x)}{f''(x)}$$
It is gradient descent with the learning rate $\\frac{1}{f''(x)}$: lesson [[#gd-convergence]]'s ideal $1/L$, measured locally at every step. On a parabola it lands on the minimum in **one** step. With many inputs, $\\boldsymbol\\theta \\leftarrow \\boldsymbol\\theta - H^{-1}\\nabla f$, which undoes the bad condition number of a narrow valley entirely.

**Quadratic convergence.** Close to the minimum, the parabola is an excellent fit, and the error after a step is roughly proportional to the **square** of the error before: $10^{-2} \\to 10^{-4} \\to 10^{-8} \\to 10^{-16}$. The number of correct digits doubles each step (the proof expands one Taylor term further; the figure shows it).

**The same idea finds roots.** To solve $g(x) = 0$, follow the tangent to where it crosses zero: $x \\leftarrow x - \\frac{g(x)}{g'(x)}$. (Minimising $f$ is finding a root of $g = f'$.) With $g(x) = x^2 - 2$ this is the ancient square-root method: $x \\leftarrow \\frac12\\left(x + \\frac2x\\right)$.

**Why not always?** Three problems:
- **Cost.** With $n$ parameters the Hessian has $n^2$ entries and solving with it costs about $n^3/3$ (lesson [[#gaussian-elimination]]). For a model with $10^9$ parameters that is impossible.
- **Non-convexity.** Where $f'' < 0$ the parabola is upside down, and the "step to its peak" goes **uphill**; at a saddle, Newton is attracted to it.
- **Far from the minimum**, the parabola can be a poor guide and the step can overshoot wildly.

So deep learning uses cheap stand-ins for curvature: Adam's per-parameter scaling (lesson [[#optimisers]]) is a rough diagonal estimate of it, and quasi-Newton methods like L-BFGS build one from recent gradients.` },
        { figure: 'NewtonFig', caption: 'Each Newton step fits the parabola that matches slope and curvature (orange) and jumps to its bottom. Watch the error column: the number of zeros doubles. Start where the curve bends down and see it go wrong.' },
        {
          code: {
            file: 'optimise.py', fn: 'newton', notes: [
              ['def newton(f1, f2, x, steps=6):', ['The first and second derivatives, and a start.']],
              ['path = [x]', ['Record every position.']],
              ['for _ in range(steps):', ['A few steps are usually plenty.']],
              ['x = x - f1(x) / f2(x)', ['Jump to the bottom of the matching parabola.'], { tex: 'x \\leftarrow x - \\frac{f\'(x)}{f\'\'(x)}' }],
              ['path.append(x)', ['Record it.']],
              ['return path', ['Every position visited.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'Newton on $f(x) = (x - 2)^4 + x^2$ from $x = 0$: where is it after 6 steps? (4 decimals)',
            answer: newton(x => 4 * (x - 2) ** 3 + 2 * x, x => 12 * (x - 2) ** 2 + 2, 0, 6).at(-1), tolerance: 0.00006,
            compute: () => newton(x => 4 * (x - 2) ** 3 + 2 * x, x => 12 * (x - 2) ** 2 + 2, 0, 6).at(-1),
            explain: `${f(newton(x => 4 * (x - 2) ** 3 + 2 * x, x => 12 * (x - 2) ** 2 + 2, 0, 6).at(-1))}, where $f' = 4(x-2)^3 + 2x$ is zero to machine precision.`,
          },
        },
        {
          predict: {
            prompt: 'Square roots by Newton: $x \\leftarrow \\frac12(x + 2/x)$ from $x = 1$. What is $x$ after 3 steps? (6 decimals)',
            answer: (() => { let x = 1; for (let i = 0; i < 3; i++) x = (x + 2 / x) / 2; return x })(), tolerance: 0.0000006,
            compute: () => newton(x => x * x - 2, x => 2 * x, 1, 3).at(-1),
            explain: '1 → 1.5 → 1.416667 → 1.414216, already $\\sqrt2$ to 5 decimals. (Here `newton` is given $g = x^2 - 2$ and its slope, so it finds a root.)',
          },
        },
        { note: 'Newton: $x \\leftarrow x - f\'/f\'\'$ (many inputs: $\\boldsymbol\\theta - H^{-1}\\nabla f$), the minimum of the local parabola. Digits double near the answer. Roots: $x - g/g\'$. Too costly ($n^3$) and unsafe where curvature is negative for big networks; Adam and L-BFGS approximate it.' },
      ],
    },

    {
      id: 'sgd', title: 'Stochastic gradient descent and minibatches',
      goal: 'Show a random example\'s gradient is an unbiased estimate of the full gradient, that a minibatch of $B$ cuts its variance by $B$, and why SGD needs a shrinking learning rate to settle.',
      builds: ['gd-convergence', 'sums-of-variables', 'least-squares'],
      blocks: [
        { md: `A training loss is an average over $n$ examples: $\\mathcal L(\\theta) = \\frac1n\\sum_{i=1}^n \\ell_i(\\theta)$, and so is its gradient. With $n$ in the millions, computing the full gradient for **every** step is far too slow. **Stochastic gradient descent** (SGD) uses the gradient of one random example, or a small random **minibatch**, instead.

**It aims at the right place on average.** Pick an index $I$ uniformly at random. Then
$$\\mathbb E[\\nabla\\ell_I(\\theta)] = \\sum_{i=1}^n \\frac1n\\nabla\\ell_i(\\theta) = \\nabla\\mathcal L(\\theta)$$
(an expectation is a probability-weighted sum, lesson [[#expectation]]). The random gradient is an **unbiased estimate** of the true one (lesson [[#estimation]]): each step is the right step plus noise with mean zero.

**Minibatches cut the noise.** Average $B$ independently chosen examples' gradients. The mean is unchanged, and by lesson [[#sums-of-variables]] the variance of an average of $B$ independent copies is $\\frac{\\sigma^2}{B}$: standard deviation down by $\\sqrt B$. A batch of 256 is 16 times less noisy than a single example, and computing 256 gradients together on a GPU costs barely more than one. That trade-off is why batch sizes are what they are. (Practical SGD shuffles the data and takes batches without replacement, one **epoch** per pass; the same average argument holds.)

**The noise floor.** With a fixed learning rate, SGD doesn't settle exactly at the minimum: near it the true gradient is tiny but the noise isn't, so the weights keep jittering in a cloud whose size grows with $\\eta$ (and shrinks with $B$). To converge you must **decrease $\\eta$** over time; the classical condition is $\\sum_t\\eta_t = \\infty$ (you can still travel any distance) but $\\sum_t\\eta_t^2 < \\infty$ (the accumulated noise stays finite), met by $\\eta_t \\propto \\frac1t$. Next lesson's schedules are the modern answer.

**The noise is not all bad.** In non-convex losses it shakes the weights out of saddles and sharp, narrow dips, and there is evidence that the wider minima SGD prefers generalise better.` },
        { figure: 'SGDFig', caption: 'Fitting $y \\approx wx$. Full gradient descent (grey) slides smoothly; SGD with batch size $B$ (teal) zig-zags around it. Raise $B$ and the zig-zag calms like $1/\\sqrt B$; the bars show the spread of the random gradients against the true one.' },
        {
          code: {
            file: 'optimise.py', fn: 'full_gradient', notes: [
              ['def full_gradient(w, xs, ys):', ['The weight and all the data.']],
              ['return sum(2 * (w * x - y) * x for x, y in zip(xs, ys)) / len(xs)', ['The average of every example\'s gradient: what each SGD step estimates.'], { tex: '\\nabla\\mathcal L = \\frac1n\\sum_i\\nabla\\ell_i' }],
            ],
          },
        },
        {
          code: {
            file: 'optimise.py', fn: 'sgd', notes: [
              ['def sgd(xs, ys, eta, batch, epochs, seed=0):', ['Data, learning rate, minibatch size, and how many passes.']],
              ['rng = random.Random(seed)', ['Repeatable shuffles.']],
              ['w = 0.0', ['Start at zero.']],
              ['order = list(range(len(xs)))', ['The example indices.']],
              ['path = [w]', ['Record every weight.']],
              ['for _ in range(epochs):', ['Each epoch is one pass over the data…']],
              ['rng.shuffle(order)', ['…in a fresh random order.']],
              ['for start in range(0, len(order), batch):', ['Cut the order into minibatches.']],
              ['idx = order[start:start + batch]', ['This minibatch\'s examples.']],
              ['g = sum(2 * (w * xs[i] - ys[i]) * xs[i] for i in idx) / len(idx)', ['The minibatch\'s average gradient: unbiased for the full gradient.']],
              ['w = w - eta * g', ['An ordinary gradient step with the noisy estimate.']],
              ['path.append(w)', ['Record it.']],
              ['return path', ['Every weight visited.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'For the data $x = 1..5$, $y = 2.1, 3.9, 6.2, 7.8, 10.1$, what is the full gradient at $w = 1$?',
            answer: fullGradient(1, XS, YS), tolerance: 1e-9, compute: () => fullGradient(1, XS, YS),
            explain: `${f(fullGradient(1, XS, YS))}: negative, so $w$ should grow (the best $w$ is about 2).`,
          },
        },
        {
          predict: {
            prompt: 'SGD with $\\eta = 0.01$, batch 2, 3 epochs (seed 1), from $w = 0$: where does it end? (3 decimals)',
            answer: sgd(XS, YS, 0.01, 2, 3, 1).at(-1), tolerance: 0.0006, compute: () => sgd(XS, YS, 0.01, 2, 3, 1).at(-1),
            explain: `${f(sgd(XS, YS, 0.01, 2, 3, 1).at(-1))}, close to the least-squares answer, after only nine noisy steps.`,
          },
        },
        { note: 'SGD: step with the gradient of a random minibatch. It is unbiased, $\\mathbb E[\\nabla\\ell_I] = \\nabla\\mathcal L$, with variance $\\sigma^2/B$. A fixed $\\eta$ leaves a noise floor; shrinking $\\eta$ (schedules) settles it. The noise also helps escape saddles.' },
      ],
    },

    {
      id: 'momentum-math', title: 'Momentum and learning-rate schedules',
      goal: 'Write momentum as an exponentially weighted sum of past gradients, show it multiplies a steady gradient by $\\frac1{1-\\beta}$, see why it helps in narrow valleys, and read warm-up and cosine schedules.',
      builds: ['sgd', 'induction'],
      blocks: [
        { md: `Plain gradient descent in a long narrow valley zig-zags across it and creeps along it (a large condition number, lesson [[#gd-convergence]]). **Momentum** fixes that by giving the weights a velocity:

$$\\mathbf v_t = \\beta\\,\\mathbf v_{t-1} + \\nabla\\mathcal L(\\theta_{t-1}), \\qquad \\theta_t = \\theta_{t-1} - \\eta\\,\\mathbf v_t$$

with $\\beta$ around 0.9.

**What the velocity is.** Unroll it from $\\mathbf v_0 = \\mathbf 0$: $\\mathbf v_t = \\mathbf g_t + \\beta\\mathbf g_{t-1} + \\beta^2\\mathbf g_{t-2} + \\dots + \\beta^{t-1}\\mathbf g_1$. A sum of all past gradients, older ones weighted down geometrically (an **exponentially weighted** sum).

**On a steady slope it speeds up.** If every gradient is the same $\\mathbf g$, then $\\mathbf v_t = \\mathbf g(1 + \\beta + \\dots + \\beta^{t-1}) = \\mathbf g\\frac{1 - \\beta^t}{1 - \\beta}$ by lesson [[#induction]]'s geometric series, which tends to $\\frac{\\mathbf g}{1 - \\beta}$. With $\\beta = 0.9$ the effective step along a consistent direction is **ten times** larger.

**Across a valley it cancels.** Zig-zag gradients alternate in sign, $+\\mathbf g, -\\mathbf g, +\\mathbf g, \\dots$; their weighted sum is $\\mathbf g(1 - \\beta + \\beta^2 - \\dots) \\to \\frac{\\mathbf g}{1 + \\beta}$, about half a step. So momentum amplifies the consistent direction (along the valley) and damps the oscillating one (across it). A ball rolling downhill does the same: momentum carries it along the valley floor.

(Adam's $\\mathbf m_t$ is the same average with weights $(1 - \\beta)$ in front, so it estimates the gradient itself rather than $\\frac{1}{1-\\beta}$ times it; lesson [[#optimisers]] corrects its start-up bias with the same geometric series.)

**Schedules.** Lesson [[#sgd]] showed the learning rate must shrink for SGD to settle. Modern training uses:
- **Warm-up**: start tiny and grow linearly for the first few hundred or thousand steps, because at the start Adam's variance estimates are unreliable and the weights are far from anything sensible; big early steps can wreck a Transformer.
- **Cosine decay**: then follow half a cosine wave from the peak rate down to (nearly) zero: $\\eta_t = \\eta_{\\min} + (\\eta_{\\max} - \\eta_{\\min})\\frac{1 + \\cos(\\pi\\,p)}{2}$, where $p$ runs from 0 to 1 over training. Big steps early to travel, small steps late to settle into the minimum.` },
        { figure: 'MomentumFig', caption: 'A narrow valley. Plain gradient descent (grey) zig-zags; momentum (teal) builds speed along the floor and damps the zig-zag. Below, a warm-up plus cosine schedule.' },
        {
          code: {
            file: 'optimise.py', fn: 'momentum', notes: [
              ['def momentum(grad, x, eta, beta, steps):', ['The slope, a start, the learning rate and momentum $\\beta$.']],
              ['v = 0.0', ['The velocity starts at rest.']],
              ['path = [x]', ['Every position.']],
              ['for _ in range(steps):', ['Each step…']],
              ['v = beta * v + grad(x)', ['…keep a fraction $\\beta$ of the old velocity and add the new gradient.'], { tex: '\\mathbf v_t = \\beta\\mathbf v_{t-1} + \\nabla\\mathcal L' }],
              ['x = x - eta * v', ['Move by the velocity, not the raw gradient.']],
              ['path.append(x)', ['Record.']],
              ['return path', ['The whole path.']],
            ],
          },
        },
        {
          code: {
            file: 'optimise.py', fn: 'cosine_schedule', notes: [
              ['def cosine_schedule(t, total, lr_max, lr_min=0.0, warmup=0):', ['The step number, the total, the peak and floor rates, and the warm-up length.']],
              ['if t < warmup:', ['During warm-up…']],
              ['return lr_max * (t + 1) / warmup', ['…rise linearly to the peak.']],
              ['progress = (t - warmup) / max(1, total - warmup)', ['$p$: how far through the decay, from 0 to 1.']],
              ['return lr_min + (lr_max - lr_min) * (1 + math.cos(math.pi * progress)) / 2', ['Half a cosine wave from the peak down to the floor.'], { tex: '\\eta_t = \\eta_{\\min} + (\\eta_{\\max} - \\eta_{\\min})\\tfrac{1 + \\cos\\pi p}{2}' }],
            ],
          },
        },
        {
          predict: {
            prompt: 'With $\\beta = 0.9$ and the same gradient $g = 1$ every step, what does the velocity approach?',
            answer: 10, tolerance: 1e-9, compute: () => 1 / (1 - 0.9),
            explain: '$\\frac{1}{1 - 0.9} = 10$: the geometric series $1 + 0.9 + 0.81 + \\dots$.',
          },
        },
        {
          predict: {
            prompt: 'A schedule with peak 0.1, floor 0.001, 10 warm-up steps and 100 in total: what is the rate at step 55, halfway through the decay? (4 decimals)',
            answer: cosineSchedule(55, 100, 0.1, 0.001, 10), tolerance: 0.00006, compute: () => cosineSchedule(55, 100, 0.1, 0.001, 10),
            explain: `Halfway, $\\cos(\\pi/2) = 0$, so it is the midpoint of peak and floor: ${f(cosineSchedule(55, 100, 0.1, 0.001, 10))}.`,
          },
        },
        { note: 'Momentum: $\\mathbf v_t = \\beta\\mathbf v_{t-1} + \\mathbf g_t$, an exponentially weighted sum of past gradients; a steady gradient is amplified to $\\mathbf g/(1-\\beta)$, an alternating one damped to about $\\mathbf g/(1+\\beta)$. Schedules: warm up linearly, then cosine-decay to settle.' },
      ],
    },

    {
      id: 'lagrange', title: 'Constrained optimisation: Lagrange multipliers',
      goal: 'Derive the condition $\\nabla f = \\lambda\\nabla g$ for the best point on a constraint $g = 0$, solve examples with it, and use it to show that maximum entropy with a fixed average score gives the softmax.',
      builds: ['gradient', 'dot-product', 'information'],
      blocks: [
        { md: `Often the best point must obey a constraint: probabilities must add to 1, a weight vector must have length 1, a budget must be met. Minimise $f(\\mathbf x)$ subject to $g(\\mathbf x) = 0$.

**The geometric condition.** The constraint $g = 0$ is a curve (or surface). Stand at the best point $\\mathbf x^*$ on it and take a tiny step **along** the curve. Since $g$ stays 0 along the curve, the step $\\mathbf d$ satisfies $\\nabla g\\cdot\\mathbf d = 0$ (lesson [[#gradient]]: a step along a contour is perpendicular to the gradient). And since $\\mathbf x^*$ is best, the step can't lower $f$ to first order in **either** direction along the curve, so $\\nabla f\\cdot\\mathbf d = 0$ too. Both gradients are perpendicular to every direction along the curve; in two dimensions that leaves only one direction, so they are parallel:

$$\\nabla f(\\mathbf x^*) = \\lambda\\,\\nabla g(\\mathbf x^*)$$

for some number $\\lambda$, the **Lagrange multiplier**. (In more dimensions the same argument applies to every direction in the constraint surface.) Picture it: at the best point, the contour of $f$ just **touches** the constraint curve.

**The recipe.** Form the **Lagrangian** $\\mathcal L(\\mathbf x, \\lambda) = f(\\mathbf x) - \\lambda\\,g(\\mathbf x)$ and set all its partial derivatives to zero: the $\\mathbf x$ ones give $\\nabla f = \\lambda\\nabla g$, and the $\\lambda$ one gives back $g = 0$.

**Example.** Maximise $xy$ with $x + y = 10$. $\\nabla f = (y, x)$, $\\nabla g = (1, 1)$, so $y = \\lambda$, $x = \\lambda$: $x = y = 5$, product 25.

**Example: the softmax is maximum entropy.** Among all distributions $\\mathbf p$ over $K$ options with a given average score $\\sum_k p_kz_k = c$, which is the **least committal**, the one with the most entropy (lesson [[#information]])? Maximise $-\\sum p_k\\ln p_k$ subject to $\\sum p_k = 1$ and $\\sum p_kz_k = c$, with two multipliers $\\alpha$ and $\\beta$. Setting $\\frac{\\partial}{\\partial p_k}$ of $-\\sum p\\ln p - \\alpha(\\sum p - 1) - \\beta(\\sum pz - c)$ to zero: $-\\ln p_k - 1 - \\alpha - \\beta z_k = 0$, so $p_k = e^{-1-\\alpha}e^{-\\beta z_k} \\propto e^{-\\beta z_k}$. Normalising to add to 1: $p_k = \\frac{e^{-\\beta z_k}}{\\sum_j e^{-\\beta z_j}}$. With $\\tau = -1/\\beta$ that is $\\frac{e^{z_k/\\tau}}{\\sum_j e^{z_j/\\tau}}$, the **softmax** with **temperature** $\\tau$, which Part [[#part:part5]] uses to turn a classifier's scores into probabilities. Softmax isn't an arbitrary choice: it is the most uncertain distribution consistent with the scores.` },
        { figure: 'LagrangeFig', caption: 'Contours of $f$ and the constraint circle. Slide along the circle: at the best point the contour just touches it, and the two gradient arrows line up: $\\nabla f = \\lambda\\nabla g$.' },
        {
          code: {
            file: 'optimise.py', fn: 'best_on_circle', notes: [
              ['def best_on_circle(f, n=3600):', ['Brute force, to check the Lagrange answer.']],
              ['best = None', ['Nothing tried yet.']],
              ['for i in range(n):', ['$n$ evenly spaced angles…']],
              ['t = 2 * math.pi * i / n', ['…in radians (lesson [[#double-integrals]]).']],
              ['p = (math.cos(t), math.sin(t))', ['The point on the unit circle at that angle: the constraint $x^2 + y^2 = 1$ holds automatically.']],
              ['if best is None or f(p) < f(best):', ['Keep the lowest so far.']],
              ['best = p', ['New best.']],
              ['return best', ['The constrained minimum, to the grid\'s precision.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'Closest point of the unit circle to $(2, 1)$: minimise $(x - 2)^2 + (y - 1)^2$ on $x^2 + y^2 = 1$. What is its $x$-coordinate? (4 decimals)',
            answer: 2 / Math.sqrt(5), tolerance: 0.0006, compute: () => bestOnCircle(p => (p[0] - 2) ** 2 + (p[1] - 1) ** 2)[0],
            explain: 'Lagrange: $(x - 2, y - 1) = \\lambda(x, y)$ makes $(x, y)$ parallel to $(2, 1)$, so it is $(2, 1)/\\sqrt5$: $x = 0.8944$. The search agrees.',
          },
        },
        {
          predict: {
            prompt: 'Maximise $xy$ with $x + 2y = 8$. What is the largest product?',
            answer: 8, tolerance: 1e-9, compute: () => 4 * 2,
            explain: '$(y, x) = \\lambda(1, 2)$ gives $x = 2y$; then $4y = 8$, so $y = 2$, $x = 4$, product 8.',
          },
        },
        { note: 'At the best point on $g = 0$, $\\nabla f = \\lambda\\nabla g$: the contour of $f$ touches the constraint. Lagrangian $f - \\lambda g$: set every partial to zero. Maximum entropy with a fixed average score gives the softmax.' },
      ],
    },

    {
      id: 'kkt', title: 'Inequality constraints: the KKT conditions',
      goal: 'Handle constraints $g(\\mathbf x) \\le 0$: either the constraint is slack ($\\lambda = 0$) or it binds ($\\lambda \\ge 0$), summarised by the KKT conditions; and solve such problems with projected gradient descent.',
      builds: ['lagrange', 'convexity'],
      blocks: [
        { md: `Most real constraints are inequalities: a probability is at least 0, a weight's norm is at most 1, a margin is at least 1 (SVMs, next lesson). Minimise $f(\\mathbf x)$ subject to $g(\\mathbf x) \\le 0$. At the best point, one of two things is true.

**The constraint is slack**: $g(\\mathbf x^*) < 0$, so the best point is strictly inside the allowed region, and small moves in any direction stay allowed. Then it is an ordinary minimum: $\\nabla f = \\mathbf 0$. Call that $\\lambda = 0$.

**The constraint binds**: $g(\\mathbf x^*) = 0$, the best point is on the boundary. As in the last lesson, $\\nabla f$ and $\\nabla g$ are parallel. But now the **direction** matters: we can move inward (where $g$ decreases) freely, so $f$ must not decrease inward, which means $f$ wants to go **outward**, the way $g$ increases: $-\\nabla f = \\lambda\\nabla g$ with $\\lambda \\ge 0$. The multiplier measures how hard the constraint pushes back.

**The KKT conditions** (Karush–Kuhn–Tucker) package both cases:

1. **Stationarity**: $\\nabla f(\\mathbf x^*) + \\lambda\\nabla g(\\mathbf x^*) = \\mathbf 0$
2. **Feasibility**: $g(\\mathbf x^*) \\le 0$
3. **Dual feasibility**: $\\lambda \\ge 0$
4. **Complementary slackness**: $\\lambda\\,g(\\mathbf x^*) = 0$: either the constraint binds or its multiplier is zero.

For convex problems (convex $f$ and convex $g$), a point satisfying all four is the global answer; in general they are necessary conditions (**taken on trust**: the general proof needs care about the boundary's shape).

**Example.** Minimise $(x - 3)^2$ with $x \\le 1$ (so $g = x - 1$). The unconstrained best, $x = 3$, is not allowed, so the constraint binds: $x = 1$. Stationarity: $2(1 - 3) + \\lambda = 0$ gives $\\lambda = 4 \\ge 0$. ✓ The 4 means: relaxing the bound by a tiny $\\delta$ would lower the minimum by about $4\\delta$. Multipliers are prices.

**Projected gradient descent.** A simple way to solve such problems: take an ordinary gradient step, then **project** back to the nearest allowed point (clip into a box, rescale to unit length, set negatives to zero). Weight clipping, non-negative matrix factorisation and many constrained training methods are this.` },
        { figure: 'KKTFig', caption: 'Minimise $(x - c)^2$ with $x \\le 1$. Move $c$: while $c \\le 1$ the bound is slack and $\\lambda = 0$; once $c > 1$ the answer sticks to the wall and $\\lambda = 2(c - 1)$ grows. Projected gradient descent (dots) gets there by stepping and clipping.' },
        {
          code: {
            file: 'optimise.py', fn: 'kkt_bounded', notes: [
              ['def kkt_bounded(c, bound):', ['Minimise $(x - c)^2$ with $x \\le$ `bound`.']],
              ['if c <= bound:', ['The unconstrained best is allowed:']],
              ['return c, 0.0', ['the constraint is slack, $\\lambda = 0$.']],
              ['return bound, 2 * (c - bound)', ['Otherwise it binds: $x$ = bound, and stationarity $2(x - c) + \\lambda = 0$ gives $\\lambda = 2(c - \\text{bound}) > 0$.'], { tex: '\\lambda\\,g(x^*) = 0' }],
            ],
          },
        },
        {
          code: {
            file: 'optimise.py', fn: 'projected_gd', notes: [
              ['def projected_gd(grad, project, x, eta, steps):', ['The slope, a projection onto the allowed set, a start, a rate.']],
              ['path = [x]', ['Every position.']],
              ['for _ in range(steps):', ['Each step…']],
              ['x = project(x - eta * grad(x))', ['…an ordinary gradient step, then back to the nearest allowed point.']],
              ['path.append(x)', ['Record.']],
              ['return path', ['The path.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'Minimise $(x - 3)^2$ with $x \\le 1$: what is the multiplier $\\lambda$?',
            answer: 4, tolerance: 1e-9, compute: () => kktBounded(3, 1)[1],
            explain: '$x = 1$ and $\\lambda = 2(3 - 1) = 4$.',
          },
        },
        {
          predict: {
            prompt: 'Projected gradient descent on the same problem, from 0 with $\\eta = 0.2$ and projection $\\min(x, 1)$: where is it after 10 steps?',
            answer: 1, tolerance: 1e-9, compute: () => projectedGd(x => 2 * (x - 3), x => Math.min(x, 1), 0, 0.2, 10).at(-1),
            explain: 'One step overshoots to 1.2, the projection clips it to 1, and it stays: every later step pushes right and gets clipped back.',
          },
        },
        { note: 'Inequality constraints: slack ($\\lambda = 0$, ordinary minimum) or binding ($-\\nabla f = \\lambda\\nabla g$, $\\lambda \\ge 0$). KKT: stationarity, feasibility, $\\lambda \\ge 0$, $\\lambda g = 0$. Multipliers price the constraint. Projected gradient descent: step, then project.' },
      ],
    },

    {
      id: 'duality', title: 'Duality: lower bounds, and the SVM',
      goal: 'Build the dual function $q(\\lambda) = \\min_{\\mathbf x}\\mathcal L(\\mathbf x, \\lambda)$, prove it is always a lower bound (weak duality), see the bound become exact for convex problems, and follow how the SVM\'s dual leads to the kernel trick.',
      builds: ['kkt'],
      blocks: [
        { md: `Every constrained problem has a twin, its **dual**, which often turns out easier and always gives a guarantee.

Take the problem: minimise $f(\\mathbf x)$ subject to $g(\\mathbf x) \\le 0$, with best value $p^*$. For $\\lambda \\ge 0$, the Lagrangian is $\\mathcal L(\\mathbf x, \\lambda) = f(\\mathbf x) + \\lambda g(\\mathbf x)$, and the **dual function** is its lowest value over all $\\mathbf x$, allowed or not:

$$q(\\lambda) = \\min_{\\mathbf x}\\;\\big[f(\\mathbf x) + \\lambda\\,g(\\mathbf x)\\big]$$

**Weak duality: $q(\\lambda) \\le p^*$ for every $\\lambda \\ge 0$.** Take the best allowed point $\\mathbf x^*$. Since $g(\\mathbf x^*) \\le 0$ and $\\lambda \\ge 0$, the extra term $\\lambda g(\\mathbf x^*)$ is $\\le 0$, so $\\mathcal L(\\mathbf x^*, \\lambda) \\le f(\\mathbf x^*) = p^*$. And $q(\\lambda)$, a minimum over all $\\mathbf x$, is at most $\\mathcal L$ at this particular one. $\\blacksquare$ So each $\\lambda$ gives a **certified lower bound**, and the best bound is the **dual problem**: maximise $q(\\lambda)$ over $\\lambda \\ge 0$, value $d^* \\le p^*$.

**Strong duality.** For convex problems (with a mild condition, that some point satisfies the constraints strictly: *Slater's condition*), the bound is tight: $d^* = p^*$, and the best $\\lambda$ is the KKT multiplier. (**Taken on trust.**) Example: minimise $x^2$ with $x \\ge 1$, i.e. $g = 1 - x \\le 0$, so $p^* = 1$. Then $\\mathcal L = x^2 + \\lambda(1 - x)$ is smallest at $x = \\lambda/2$, giving $q(\\lambda) = \\lambda - \\frac{\\lambda^2}{4}$. That is largest at $\\lambda = 2$, where $q = 1 = p^*$. ✓

**The support vector machine.** An SVM finds the widest margin separating two classes: minimise $\\frac12\\|\\mathbf w\\|^2$ subject to $y_i(\\mathbf w^\\top\\mathbf x_i + b) \\ge 1$ for every example. Its dual (one multiplier $\\alpha_i \\ge 0$ per example, from the same recipe) is

$$\\max_{\\boldsymbol\\alpha \\ge 0}\\;\\sum_i\\alpha_i - \\frac12\\sum_{i,j}\\alpha_i\\alpha_jy_iy_j\\,\\mathbf x_i^\\top\\mathbf x_j \\quad\\text{with}\\quad \\sum_i\\alpha_iy_i = 0$$

and $\\mathbf w = \\sum_i\\alpha_iy_i\\mathbf x_i$. Two things fall out. By complementary slackness most $\\alpha_i$ are 0: only the examples **on** the margin (the **support vectors**) matter. And the data appears **only through dot products** $\\mathbf x_i^\\top\\mathbf x_j$. Replace them by a **kernel** $k(\\mathbf x_i, \\mathbf x_j)$, a dot product in some richer feature space never computed explicitly, and the same algorithm draws curved boundaries: the **kernel trick**.` },
        { figure: 'DualityFig', caption: 'For minimise $x^2$ with $x \\ge 1$: each $\\lambda$ gives a Lagrangian (thin curves) whose minimum $q(\\lambda)$ sits below the true answer 1. Slide $\\lambda$: the bound rises to meet the answer exactly at $\\lambda = 2$.' },
        {
          code: {
            file: 'optimise.py', fn: 'dual_value', notes: [
              ['def dual_value(lam):', ['A multiplier $\\lambda \\ge 0$.']],
              ['x = lam / 2', ['The $x$ minimising $x^2 + \\lambda(1 - x)$: its slope $2x - \\lambda$ is zero there.']],
              ['return x * x + lam * (1 - x)', ['$q(\\lambda) = \\lambda - \\lambda^2/4$: a lower bound on the constrained minimum.'], { tex: 'q(\\lambda) = \\min_x\\,[x^2 + \\lambda(1 - x)]' }],
            ],
          },
        },
        { python: { program: 'optimise', label: 'Run the optimisation part in real Python' } },
        {
          code: {
            file: 'optimise.py', fn: 'show_optimise', notes: [
              ['def show_optimise():', ['One line per idea.']],
              ['print("x² convex on [−3, 3]?", is_convex_on(lambda x: x * x, -3, 3), " sin convex?", is_convex_on(math.sin, -3, 3))', ['Lesson [[#convexity]].']],
              ['print("descent on x² from 3 with η = 0.25 (actual, guaranteed):", descent_step(lambda x: x * x, lambda x: 2 * x, 3.0, 0.25, 2.0))', ['Lesson [[#gd-convergence]].']],
              ['print("Newton on (x − 2)⁴ + x²:", newton(lambda x: 4 * (x - 2) ** 3 + 2 * x, lambda x: 12 * (x - 2) ** 2 + 2, 0.0, 5)[-1])', ['Lesson [[#newton]].']],
              ['print("cosine schedule at the start, middle and end:", [cosine_schedule(t, 100, 0.1) for t in (0, 50, 100)])', ['Lesson [[#momentum-math]].']],
              ['print("KKT for min (x − 3)² with x ≤ 1:", kkt_bounded(3.0, 1.0))', ['Lesson [[#kkt]].']],
              ['print("dual values q(1), q(2), q(3):", [dual_value(lam) for lam in (1.0, 2.0, 3.0)])', ['This lesson: all at most 1, with equality at $\\lambda = 2$.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'For minimise $x^2$ with $x \\ge 1$: what lower bound does $\\lambda = 1$ certify?',
            answer: 0.75, tolerance: 1e-9, compute: () => dualValue(1),
            explain: '$q(1) = 1 - \\frac14 = 0.75 \\le p^* = 1$.',
          },
        },
        {
          choice: {
            prompt: 'Why does the SVM dual make the kernel trick possible?',
            options: [
              { text: 'The training points appear only through dot products $\\mathbf x_i^\\top\\mathbf x_j$, which can be swapped for a kernel', why: 'Yes: and predictions $\\mathbf w^\\top\\mathbf x = \\sum\\alpha_iy_i\\mathbf x_i^\\top\\mathbf x$ need only dot products too.' },
              { text: 'The dual has fewer variables', why: 'It has one per example, often more than the primal. The point is how the data enters.' },
              { text: 'Strong duality makes any function a kernel', why: 'Only functions that act as dot products in some feature space (positive semidefinite kernels) qualify.' },
            ],
            answer: 0,
          },
        },
        { note: 'Dual function $q(\\lambda) = \\min_{\\mathbf x}[f + \\lambda g]$; weak duality: $q(\\lambda) \\le p^*$ for $\\lambda \\ge 0$, always. Convex (+ Slater): equal at the best $\\lambda$. SVM dual: support vectors (nonzero $\\alpha_i$) and data only through dot products, hence kernels.' },
      ],
    },
  ],
}
