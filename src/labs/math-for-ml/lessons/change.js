// Calculus additions, placed inside the calculus part by lessons/index.js: limits made precise, the
// product and quotient rules, inverse functions, the second derivative, antiderivatives, substitution
// and integration by parts, and Taylor series with a proved error bound.
import { deltaFor, tanh, tanhSlope, logit, logitSlope, secondDerivative, definitePoly, normalMoment, taylor, taylorExp, derivative, sigmoid, area } from '../engine/maths.js'
import { f } from './util.js'

export const CHANGE = [
  {
    id: 'limits-precise', title: 'Limits made precise: ε, δ and continuity',
    goal: 'Read the definition "for every $\\varepsilon > 0$ there exists $\\delta > 0$…", prove a simple limit with it, show a limit fails, and say what continuity means.',
    builds: ['instant', 'logic', 'inequalities'],
    blocks: [
      { md: `Lesson [[#instant]] said the average rates "close in on" $-10$. That phrase does a lot of work, and papers replace it with an exact definition. You have the pieces: $\\forall$ and $\\exists$ (lesson [[#logic]]), absolute value as distance (lesson [[#piecewise]]), and inequalities (lesson [[#inequalities]]).

$$\\lim_{x \\to a} f(x) = L \\quad\\text{means}\\quad \\forall \\varepsilon > 0\\;\\; \\exists \\delta > 0:\\;\\; 0 < |x - a| < \\delta \\;\\Rightarrow\\; |f(x) - L| < \\varepsilon$$

Read it as a **game**. A challenger names a tolerance $\\varepsilon$ (epsilon): "get $f(x)$ within $\\varepsilon$ of $L$". You must answer with a closeness $\\delta$ (delta): "keep $x$ within $\\delta$ of $a$ (but not equal to $a$) and you will be". The limit is $L$ if you can win **every** round, however small the challenger's $\\varepsilon$. Notice the quantifier order: $\\delta$ may depend on $\\varepsilon$, which is the "$\\forall\\exists$" order that lesson [[#logic]] warned matters.

The "$0 < |x - a|$" part says we never look at $x = a$ itself. That is essential: the derivative's fraction $\\frac{f(x+h) - f(x)}{h}$ isn't even defined at $h = 0$, yet its limit as $h \\to 0$ is.

**A proof with it.** Claim: $\\lim_{x \\to 2}(3x + 1) = 7$. Given any $\\varepsilon > 0$, we need $|3x + 1 - 7| < \\varepsilon$, that is $3|x - 2| < \\varepsilon$, that is $|x - 2| < \\varepsilon/3$. So answer $\\delta = \\varepsilon/3$: whenever $|x - 2| < \\delta$, $|f(x) - 7| = 3|x - 2| < 3\\delta = \\varepsilon$. Every round won. $\\blacksquare$

**A limit that fails.** $\\lfloor x \\rfloor$ as $x \\to 1$. Points just right of 1 give 1; points just left give 0. Try $L = 1$ and let the challenger pick $\\varepsilon = \\frac12$: whatever $\\delta$ you answer, $x = 1 - \\delta/2$ is within $\\delta$ of 1 but $|\\lfloor x \\rfloor - 1| = 1 > \\frac12$. Any other $L$ fails the same way on one side or the other. No limit.

**Limits at infinity** work the same way with "large enough" in place of "close enough": $\\lim_{n \\to \\infty} a_n = L$ means for every $\\varepsilon > 0$ there is an $N$ with $|a_n - L| < \\varepsilon$ for all $n > N$. For $a_n = \\frac1n \\to 0$, answer $N = \\frac1\\varepsilon$.

**Continuity.** $f$ is **continuous** at $a$ when $\\lim_{x \\to a} f(x) = f(a)$: the limit exists and equals the actual value. Informally, no jumps or holes. Polynomials, $e^x$, $\\ln x$ (for $x > 0$), the sigmoid and ReLU are continuous everywhere they are defined; floor jumps at every whole number. Continuity is what lesson [[#integral]]'s "squeezed between the lowest and highest value on the strip" argument needed.

**Continuous but not differentiable.** ReLU is continuous at 0 but has a corner: the slope from the left is 0, from the right 1. A derivative is a limit, and a limit must agree from both sides, so ReLU has no derivative at exactly 0. Frameworks simply pick 0 or 1 there; it almost never matters, because an input lands exactly on 0 with essentially zero chance.` },
      { figure: 'EpsilonDeltaFig', caption: 'Pick $\\varepsilon$: the orange band is "within $\\varepsilon$ of $L$". The lab answers with the largest $\\delta$ it can find (the teal band). For the floor function, no $\\delta$ works once $\\varepsilon < 1$.' },
      {
        code: {
          file: 'calculus.py', fn: 'delta_for', notes: [
            ['def delta_for(f, a, limit, eps):', ['Play the game numerically: the challenger\'s `eps` is given; search for a `delta`.']],
            ['delta = 1.0', ['Start generous.']],
            ['while delta > 1e-12:', ['Keep shrinking, but give up eventually.']],
            ['xs = [a + delta * k / 50 for k in range(-50, 51) if k != 0]', ['100 sample points within $\\delta$ of $a$, skipping $a$ itself ($0 < |x - a|$).']],
            ['if all(abs(f(x) - limit) < eps for x in xs):', ['Is every sample within $\\varepsilon$ of $L$?']],
            ['return delta', ['Then this $\\delta$ answers this $\\varepsilon$ (on the samples: evidence, not proof; the algebra above is the proof).']],
            ['delta /= 2', ['Otherwise tighten and try again.']],
            ['return None', ['No $\\delta$ found: evidence that the limit fails.']],
          ],
        },
      },
      {
        predict: {
          prompt: 'For $\\lim_{x\\to2}(3x + 1) = 7$ the proof answers $\\delta = \\varepsilon/3$. What $\\delta$ does it give for $\\varepsilon = 0.06$?',
          answer: 0.02, tolerance: 1e-9, compute: () => 0.06 / 3,
          explain: '$0.06 / 3 = 0.02$. Check: if $|x - 2| < 0.02$ then $|3x + 1 - 7| = 3|x - 2| < 0.06$.',
        },
      },
      {
        predict: {
          prompt: 'The halving search starts at $\\delta = 1$ and halves until it works. For $3x + 1$ near 2 with $\\varepsilon = 0.5$, what $\\delta$ does it return?',
          answer: 0.125, compute: () => deltaFor(x => 3 * x + 1, 2, 7, 0.5),
          explain: 'It needs $\\delta \\le 0.5/3 \\approx 0.167$; the halvings go 1, 0.5, 0.25, 0.125, and 0.125 is the first that fits.',
        },
      },
      {
        choice: {
          prompt: 'Why does the definition say "for every $\\varepsilon$ there exists a $\\delta$" and not "there exists a $\\delta$ for every $\\varepsilon$"?',
          options: [
            { text: 'Because $\\delta$ is allowed to depend on $\\varepsilon$: smaller tolerances may need closer $x$', why: 'Yes. "$\\exists\\delta\\,\\forall\\varepsilon$" would demand one $\\delta$ that works for every tolerance at once, which almost no function can satisfy.' },
            { text: 'They mean the same thing', why: 'Lesson [[#logic]]: swapping $\\forall$ and $\\exists$ changes the meaning.' },
            { text: 'Because $\\varepsilon$ must be smaller than $\\delta$', why: 'There is no required order of size between them; for $3x + 1$, $\\delta = \\varepsilon/3$.' },
          ],
          answer: 0,
        },
      },
      { note: '$\\lim_{x\\to a} f(x) = L$: for every $\\varepsilon > 0$ some $\\delta > 0$ makes $|f(x) - L| < \\varepsilon$ whenever $0 < |x - a| < \\delta$. Continuous: the limit equals the value. A derivative is a limit, so a corner (ReLU at 0) has none.' },
    ],
  },

  {
    id: 'product-quotient', title: 'The product and quotient rules',
    goal: 'Derive $(fg)\' = f\'g + fg\'$ from a growing rectangle, derive the quotient rule from it, and differentiate $\\tanh$.',
    builds: ['derivative-rules', 'limits-precise'],
    blocks: [
      { md: `The sum rule handles $f + g$. What about $f \\cdot g$? It is **not** $f' g'$; a picture shows what it is.

Think of $f(x)\\,g(x)$ as the area of a rectangle with sides $f(x)$ and $g(x)$. Nudge $x$ by $h$: the sides grow by $\\Delta f = f(x + h) - f(x)$ and $\\Delta g = g(x + h) - g(x)$. The new area is the old one plus three pieces: a strip $f\\,\\Delta g$ along one side, a strip $g\\,\\Delta f$ along the other, and a tiny corner $\\Delta f\\,\\Delta g$:

$$\\frac{(f + \\Delta f)(g + \\Delta g) - fg}{h} = f\\,\\frac{\\Delta g}{h} + g\\,\\frac{\\Delta f}{h} + \\Delta f\\cdot\\frac{\\Delta g}{h}$$

As $h \\to 0$: $\\frac{\\Delta g}{h} \\to g'$, $\\frac{\\Delta f}{h} \\to f'$, and in the last term $\\Delta f \\to 0$ (because $f$ has a slope, it is continuous) while $\\frac{\\Delta g}{h}$ stays near $g'$, so the corner vanishes. That leaves the **product rule**:

$$(fg)' = f'g + fg'$$

Example: $\\frac{d}{dx}(x e^x) = 1 \\cdot e^x + x e^x = (1 + x)e^x$.

**The quotient rule** follows. Let $q = f/g$, so $f = q\\,g$. Product rule: $f' = q'g + qg'$. Solve for $q'$: $q' = \\frac{f' - qg'}{g} = \\frac{f' - \\frac fg g'}{g}$, and multiply top and bottom by $g$:

$$\\left(\\frac fg\\right)' = \\frac{f'g - fg'}{g^2}$$

(wherever $g \\ne 0$). Check it on the sigmoid, $\\sigma = \\frac{1}{1 + e^{-z}}$: top $f = 1$ ($f' = 0$), bottom $g = 1 + e^{-z}$ ($g' = -e^{-z}$), so $\\sigma' = \\frac{0 - (-e^{-z})}{(1 + e^{-z})^2} = \\frac{e^{-z}}{(1 + e^{-z})^2}$, the same expression lesson [[#chain-rule]] got another way.

**tanh**, the activation of LSTMs and many older networks: $\\tanh z = \\frac{e^z - e^{-z}}{e^z + e^{-z}}$, an S-curve from $-1$ to $1$. Top $f = e^z - e^{-z}$, $f' = e^z + e^{-z} = g$. Bottom $g = e^z + e^{-z}$, $g' = e^z - e^{-z} = f$. Quotient rule: $\\tanh' = \\frac{g \\cdot g - f \\cdot f}{g^2} = 1 - \\frac{f^2}{g^2} = 1 - \\tanh^2 z$. Like the sigmoid, its slope is built from its own value, and it is largest (1) at $z = 0$.` },
      { figure: 'ProductAreaFig', caption: 'The rectangle $f \\times g$, and what a small nudge adds: two strips (the product rule\'s two terms) and a corner that shrinks much faster than the strips.' },
      {
        code: {
          file: 'calculus.py', fn: 'tanh', notes: [
            ['def tanh(z):', ['A score.']],
            ['return (math.exp(z) - math.exp(-z)) / (math.exp(z) + math.exp(-z))', ['$\\frac{e^z - e^{-z}}{e^z + e^{-z}}$: between $-1$ and $1$.'], { tex: '\\tanh z = \\frac{e^z - e^{-z}}{e^z + e^{-z}}' }],
          ],
        },
      },
      {
        code: {
          file: 'calculus.py', fn: 'tanh_slope', notes: [
            ['def tanh_slope(z):', ['The quotient rule\'s result, ready to use.']],
            ['t = tanh(z)', ['$\\tanh z$, once.']],
            ['return 1 - t * t', ['$1 - \\tanh^2 z$.'], { tex: '\\tanh\'(z) = 1 - \\tanh^2 z' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'What is the slope of $x\\,e^x$ at $x = 1$? (3 decimals)',
          answer: 2 * Math.E, tolerance: 0.0006, compute: () => derivative(x => x * Math.exp(x), 1),
          explain: `$(1 + x)e^x$ at $x = 1$: $2e = ${f(2 * Math.E)}$.`,
          misconceptions: [{ answer: Math.E, tolerance: 0.001, feedback: 'That is $f\'g\'$ (or just one term). The product rule has two terms: $1 \\cdot e^x + x\\,e^x$.' }],
        },
      },
      {
        predict: {
          prompt: 'What is $\\tanh\'(0.5)$? (4 decimals)',
          answer: tanhSlope(0.5), tolerance: 0.00006, compute: () => derivative(tanh, 0.5),
          explain: `$\\tanh 0.5 = ${f(tanh(0.5))}$, so $1 - ${f(tanh(0.5))}^2 = ${f(tanhSlope(0.5))}$. The numerical derivative agrees.`,
        },
      },
      { note: '$(fg)\' = f\'g + fg\'$: two strips of a growing rectangle. $(f/g)\' = \\frac{f\'g - fg\'}{g^2}$. $\\tanh\' = 1 - \\tanh^2$.' },
    ],
  },

  {
    id: 'inverse-derivative', title: 'Slopes of inverse functions, and the logit',
    goal: 'Derive $(f^{-1})\'(y) = \\frac{1}{f\'(f^{-1}(y))}$ from the chain rule, use it for $\\sqrt y$, $\\ln y$ and the logit, and say why a flat spot breaks it.',
    builds: ['chain-rule', 'exp-log-slopes'],
    blocks: [
      { md: `An **inverse function** undoes another: if $f$ takes $x$ to $y$, then $f^{-1}$ takes $y$ back to $x$. $\\ln$ undoes $e^x$; $\\sqrt{\\;}$ undoes squaring (for $x \\ge 0$). Lesson [[#exp-log-slopes]] found the slope of $\\ln$ from the mirror picture. Here is the same result by algebra, for every inverse at once.

Undoing means $f(f^{-1}(y)) = y$ for every $y$. Both sides are functions of $y$, equal everywhere, so their slopes are equal. The right side has slope 1. The left is a composition, so by the chain rule its slope is $f'(f^{-1}(y)) \\cdot (f^{-1})'(y)$. So $f'(f^{-1}(y)) \\cdot (f^{-1})'(y) = 1$, and

$$(f^{-1})'(y) = \\frac{1}{f'\\big(f^{-1}(y)\\big)}$$

"The slope of the inverse is one over the slope of the original, at the matching point": the mirror picture's $1/s$, now proved. (This assumes the inverse has a slope to find; it does wherever $f' \\ne 0$, which a fuller course proves.)

- $\\sqrt y$: here $f(x) = x^2$, $f'(x) = 2x$, so $(\\sqrt y)' = \\frac{1}{2\\sqrt y}$, the power rule's $\\frac12 y^{-1/2}$ again.
- $\\ln y$: $f = e^x$, $f' = e^x$, so $(\\ln y)' = \\frac{1}{e^{\\ln y}} = \\frac1y$.

**Where it breaks.** At a point where $f' = 0$ the formula divides by zero. $x^3$ is flat at 0, and its inverse $\\sqrt[3]y$ has a vertical tangent there: infinitely steep. A flat function can't be undone smoothly.

**The logit.** The sigmoid turns a score $z$ into a probability $p = \\sigma(z)$. Its inverse turns a probability back into a score. Solve $p = \\frac{1}{1 + e^{-z}}$ for $z$: $1 + e^{-z} = \\frac1p$, so $e^{-z} = \\frac{1 - p}{p}$, so $z = \\ln\\frac{p}{1 - p}$. That is the **logit**, the log of the odds. This is why the raw scores a classifier outputs before its sigmoid or softmax are called **logits**. Its slope, by the rule, is one over the sigmoid's slope at the matching point: $\\frac{1}{\\sigma(z)(1 - \\sigma(z))} = \\frac{1}{p(1 - p)}$, huge near $p = 0$ or $1$, where a tiny change of probability needs a big change of score.` },
      { figure: 'InverseFig', caption: 'A function and its inverse, mirrored in $y = x$. The tangents at matching points have slopes $s$ and $1/s$. Slide toward a flat spot of $f$ and watch the inverse\'s tangent stand up.' },
      {
        code: {
          file: 'calculus.py', fn: 'logit', notes: [
            ['def logit(p):', ['A probability strictly between 0 and 1.']],
            ['return math.log(p / (1 - p))', ['The log-odds: $\\ln\\frac{p}{1-p}$, the $z$ with $\\sigma(z) = p$.'], { tex: '\\sigma^{-1}(p) = \\ln\\frac{p}{1 - p}' }],
          ],
        },
      },
      {
        code: {
          file: 'calculus.py', fn: 'logit_slope', notes: [
            ['def logit_slope(p):', ['The inverse-function rule, applied to the sigmoid.']],
            ['return 1 / (p * (1 - p))', ['One over $\\sigma\'(z) = p(1 - p)$.'], { tex: '\\frac{d}{dp}\\,\\text{logit}(p) = \\frac{1}{p(1-p)}' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'A classifier outputs probability 0.8. What logit (score) produced it? (3 decimals)',
          answer: logit(0.8), tolerance: 0.0006, compute: () => logit(0.8),
          explain: `$\\ln\\frac{0.8}{0.2} = \\ln 4 = ${f(logit(0.8))}$; check: $\\sigma(${f(logit(0.8))}) = ${f(sigmoid(logit(0.8)))}$.`,
        },
      },
      {
        predict: {
          prompt: 'What is the slope of the logit at $p = 0.5$?',
          answer: 4, compute: () => derivative(logit, 0.5),
          explain: '$\\frac{1}{0.5 \\times 0.5} = 4$: one over the sigmoid\'s steepest slope, $\\frac14$.',
        },
      },
      { note: '$(f^{-1})\'(y) = 1/f\'(f^{-1}(y))$, from differentiating $f(f^{-1}(y)) = y$. Flat spots of $f$ ($f\' = 0$) give vertical tangents in $f^{-1}$. The logit $\\ln\\frac{p}{1-p}$ undoes the sigmoid; its slope is $\\frac{1}{p(1-p)}$.' },
    ],
  },

  {
    id: 'second-derivative', title: 'The second derivative: curvature',
    goal: 'Compute $f\'\'$, read its sign as bending up or down, use it to tell a minimum from a maximum, and connect curvature to how big a gradient step can be.',
    builds: ['minimum', 'gradient-descent-1d'],
    blocks: [
      { md: `The derivative $f'$ is itself a function, so it has a slope too: the **second derivative** $f''$ (also $\\frac{d^2f}{dx^2}$). For the falling ball, height $h(t) = 20 - 5t^2$ has velocity $h'(t) = -10t$ and **acceleration** $h''(t) = -10$: gravity, the same at every moment.

**What its sign means.** $f'' > 0$ means the slope is **increasing**: the curve bends upward, like a cup (**convex**, or "concave up"). $f'' < 0$: the slope is decreasing, bending down like a cap (**concave**).

**The second-derivative test.** At a flat point, $f'(a) = 0$. If also $f''(a) > 0$, the slope is increasing as it passes through 0, so it is negative just before $a$ and positive just after. Lesson [[#minimum]] said negative slope means going down and positive means going up, so the curve goes down then up: $a$ is a **minimum**. With $f''(a) < 0$ the slope goes from positive to negative: a **maximum**. If $f''(a) = 0$ the test says nothing: $x^4$ has a minimum at 0, $-x^4$ a maximum and $x^3$ neither, and all three have $f'' = 0$ there.

**Curvature limits the step size.** Lesson [[#gradient-descent-1d]] found that on $(w - 3)^2$, rates above 1 fail. Now see where that comes from. On a bowl $f(w) = \\frac c2 w^2$ (curvature $f'' = c$), the slope is $cw$ and a step is $w \\leftarrow w - \\eta c w = (1 - \\eta c)w$. That shrinks toward 0 only if $|1 - \\eta c| < 1$, which means $\\eta < \\frac 2c$. For $(w - 3)^2$, $f'' = 2$, so $\\eta < 1$: exactly what the experiment found. **Sharper curvature, smaller safe steps.** The same rule with many parameters is lesson [[#eigenvectors]]'s "2 ÷ the largest eigenvalue", and it is why Newton's method (later) divides the step by the curvature.

**Computing it numerically**: apply the centred slope twice. The slope just right of $x$ is about $\\frac{f(x+h) - f(x)}{h}$, just left about $\\frac{f(x) - f(x-h)}{h}$; their change over a distance $h$:

$$f''(x) \\approx \\frac{f(x + h) - 2f(x) + f(x - h)}{h^2}$$` },
      { figure: 'CurvatureFig', caption: 'Slide along the curve: the tangent line shows $f\'$, the colour shows the sign of $f\'\'$ (teal: bending up, orange: bending down). At the flat points, the bend decides minimum or maximum.' },
      {
        code: {
          file: 'calculus.py', fn: 'second_derivative', notes: [
            ['def second_derivative(f, x, h=1e-4):', ['A function, a point and a small step. ($h$ is bigger than for first derivatives because dividing by $h^2$ magnifies rounding.)']],
            ['return (f(x + h) - 2 * f(x) + f(x - h)) / (h * h)', ['The change in slope across the point, per unit: a second difference.'], { tex: 'f\'\'(x) \\approx \\frac{f(x+h) - 2f(x) + f(x-h)}{h^2}' }],
          ],
        },
      },
      {
        predict: {
          prompt: '$f(x) = x^3 - 3x$ is flat at $x = 1$. What is $f\'\'(1)$, and so is $x = 1$ a minimum or a maximum? (Type $f\'\'(1)$.)',
          answer: 6, tolerance: 1e-4, compute: () => secondDerivative(x => x ** 3 - 3 * x, 1),
          explain: '$f\' = 3x^2 - 3$, $f\'\' = 6x$, so $f\'\'(1) = 6 > 0$: bending up, a minimum. (At $x = -1$, $f\'\' = -6$: a maximum.)',
        },
      },
      {
        predict: {
          prompt: 'A loss near its minimum looks like $\\frac{c}{2}w^2$ with curvature $c = 40$. What is the largest learning rate that still converges (the cut-off)?',
          answer: 0.05, tolerance: 1e-9, compute: () => 2 / secondDerivative(w => 20 * w * w, 0.3),
          explain: '$\\eta < 2/c = 2/40 = 0.05$. Sharper bowls need smaller steps.',
        },
      },
      { note: '$f\'\'$ is the slope of the slope. $f\'\' > 0$ bends up: at a flat point, a minimum; $f\'\' < 0$: a maximum; $f\'\' = 0$: no verdict. On a bowl of curvature $c$, gradient descent needs $\\eta < 2/c$.' },
    ],
  },

  {
    id: 'fundamental-theorem', title: 'Antiderivatives: exact areas',
    goal: 'Find antiderivatives by reading derivative rules backwards, compute exact areas with $F(b) - F(a)$, handle area below the axis, and compute a continuous expectation.',
    builds: ['integral'],
    blocks: [
      { md: `Lesson [[#integral]] proved the **fundamental theorem**: if $F' = f$, then $\\int_a^b f(x)\\,dx = F(b) - F(a)$. Such an $F$ is an **antiderivative** of $f$. Finding one turns an infinite sum of strips into one subtraction, so it is worth a table. Every line is a derivative rule read backwards, and you can check each by differentiating the right-hand side:

| $f(x)$ | an antiderivative $F(x)$ | check: $F'$ |
|---|---|---|
| $x^n$ ($n \\ne -1$) | $\\dfrac{x^{n+1}}{n+1}$ | power rule: $\\frac{(n+1)x^n}{n+1} = x^n$ |
| $\\dfrac1x$ ($x > 0$) | $\\ln x$ | lesson [[#exp-log-slopes]] |
| $e^x$ | $e^x$ | slope equals height |
| $e^{kx}$ | $\\frac1k e^{kx}$ | chain rule: $\\frac1k \\cdot k e^{kx}$ |
| $c\\,f + g$ | $c\\,F + G$ | constant-multiple and sum rules |

($n = -1$ is excluded because $\\frac{x^0}{0}$ is meaningless; $\\frac1x$ has its own line, and it is the log.)

**The "+ C".** If $F$ works, so does $F + 7$: a constant has slope 0. Antiderivatives come with an arbitrary constant, written "$+ C$". For a definite integral it cancels: $(F(b) + C) - (F(a) + C) = F(b) - F(a)$.

**Area below the axis counts negative.** Each strip is $f(x_i)\\,\\Delta x$, negative where $f$ is negative. So $\\int_{-1}^{1} x\\,dx = \\frac{1}{2} - \\frac{1}{2} = 0$: the two triangles cancel. The integral is a **signed** area. That is exactly right for averages (a mean of $-1$ and $1$ is 0) and wrong for "total area painted", which needs $|f|$.

**An expectation.** For a density $p(x)$ (Part [[#part:part4]]), the mean is $\\int x\\,p(x)\\,dx$. A number chosen uniformly from $[0, 2]$ has density $\\frac12$ there, so its mean is $\\int_0^2 \\frac x2\\,dx = \\left[\\frac{x^2}{4}\\right]_0^2 = 1$, the middle, as it should be. (The square brackets $[F(x)]_a^b$ are shorthand for $F(b) - F(a)$.)` },
      { figure: 'AntiderivativeFig', caption: 'Top: $f$, with the area from $a$ to $b$ shaded (orange where it counts negative). Bottom: an antiderivative $F$. The shaded area always equals the rise of $F$ from $a$ to $b$.' },
      {
        code: {
          file: 'calculus.py', fn: 'eval_poly', notes: [
            ['def eval_poly(coeffs, x):', ['A polynomial as its list of coefficients, lowest power first: `[3, 2, 5]` is $3 + 2x + 5x^2$.']],
            ['total = 0.0', ['Running Σ.']],
            ['for n, a in enumerate(coeffs):', ['Each coefficient $a_n$ with its power $n$.']],
            ['total += a * x ** n', ['Add $a_n x^n$.']],
            ['return total', ['$\\sum_n a_n x^n$.']],
          ],
        },
      },
      {
        code: {
          file: 'calculus.py', fn: 'integrate_poly', notes: [
            ['def integrate_poly(coeffs):', ['Read the power rule backwards, term by term (the sum and constant-multiple rules let us).']],
            ['return [0.0] + [a / (n + 1) for n, a in enumerate(coeffs)]', ['$a_n x^n$ becomes $\\frac{a_n}{n+1}x^{n+1}$: one place higher in the list. The new constant term is 0 (the "+ C" chosen as 0).'], { tex: '\\int x^n\\,dx = \\frac{x^{n+1}}{n+1} + C' }],
          ],
        },
      },
      {
        code: {
          file: 'calculus.py', fn: 'definite_poly', notes: [
            ['def definite_poly(coeffs, a, b):', ['The exact area from $a$ to $b$.']],
            ['F = integrate_poly(coeffs)', ['An antiderivative.']],
            ['return eval_poly(F, b) - eval_poly(F, a)', ['The fundamental theorem: $F(b) - F(a)$.'], { tex: '\\int_a^b f(x)\\,dx = F(b) - F(a)' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'Compute $\\int_0^3 (x^2 - 2x)\\,dx$ exactly.',
          answer: 0, tolerance: 1e-9, compute: () => definitePoly([0, -2, 1], 0, 3),
          explain: '$F = \\frac{x^3}{3} - x^2$: $F(3) - F(0) = 9 - 9 = 0$. The curve dips below the axis on $(0, 2)$ and rises above on $(2, 3)$, and the signed areas cancel exactly.',
        },
      },
      {
        predict: {
          prompt: 'What is $\\int_1^{e} \\frac1x\\,dx$?',
          answer: 1, tolerance: 1e-6, compute: () => area(x => 1 / x, 1, Math.E, 2000),
          explain: '$\\ln e - \\ln 1 = 1 - 0 = 1$. (Strips agree.)',
        },
      },
      { note: 'Antiderivatives are derivative rules backwards: $x^n \\to \\frac{x^{n+1}}{n+1}$, $\\frac1x \\to \\ln x$, $e^x \\to e^x$, plus an arbitrary constant. $\\int_a^b f = F(b) - F(a)$. Area below the axis counts negative. $\\mathbb E[X] = \\int x\\,p(x)\\,dx$.' },
    ],
  },

  {
    id: 'integration-techniques', title: 'Substitution and integration by parts',
    goal: 'Integrate by substitution (the chain rule backwards) and by parts (the product rule backwards), prove that rescaling a density\'s input rescales its area, and prove the standard bell curve has variance 1.',
    builds: ['fundamental-theorem', 'product-quotient', 'chain-rule'],
    blocks: [
      { md: `Most integrals aren't in the table. Two techniques, each a derivative rule run backwards, handle the ones ML meets.

**Substitution (the chain rule backwards).** The chain rule says $\\frac{d}{dx}F(g(x)) = F'(g(x))\\,g'(x)$. Read backwards, with $f = F'$:

$$\\int f(g(x))\\,g'(x)\\,dx = F(g(x)) + C$$

Spot an "inside" $u = g(x)$ whose slope $g'(x)$ is also present, and the integral becomes $\\int f(u)\\,du$. Example: $\\int x\\,e^{-x^2/2}\\,dx$. Inside $u = -x^2/2$ has slope $-x$, nearly what's there. So $\\int x\\,e^{-x^2/2}\\,dx = -e^{-x^2/2} + C$; check by differentiating: $-e^{-x^2/2}\\cdot(-x)$. ✓

**Rescaling an input rescales the area.** The bell curve of lesson [[#normal]] will need this: stretching a curve sideways by $\\sigma$ multiplies its area by $\\sigma$. Prove it now. Let $G$ be an antiderivative of $g$. Substitution with inside $u = (x - \\mu)/\\sigma$ (slope $\\frac1\\sigma$) gives $\\frac{d}{dx}\\big[\\sigma\\,G\\big(\\tfrac{x-\\mu}{\\sigma}\\big)\\big] = \\sigma \\cdot g\\big(\\tfrac{x-\\mu}{\\sigma}\\big)\\cdot\\frac1\\sigma = g\\big(\\tfrac{x-\\mu}{\\sigma}\\big)$, so

$$\\int_a^b g\\Big(\\frac{x - \\mu}{\\sigma}\\Big)dx = \\sigma\\int_{(a-\\mu)/\\sigma}^{(b-\\mu)/\\sigma} g(u)\\,du$$

the area in $x$ is $\\sigma$ times the area in $u$, over the matching range. ($du = \\frac{dx}{\\sigma}$ is the shorthand for this bookkeeping.)

**Integration by parts (the product rule backwards).** $(uv)' = u'v + uv'$. Integrate both sides from $a$ to $b$ and rearrange:

$$\\int_a^b u\\,v'\\,dx = \\big[u\\,v\\big]_a^b - \\int_a^b u'\\,v\\,dx$$

Use it when the integrand is a product where differentiating one factor ($u$) makes it simpler and the other ($v'$) is easy to integrate. Example: $\\int_0^1 x\\,e^x\\,dx$ with $u = x$, $v' = e^x$ ($v = e^x$): $[x e^x]_0^1 - \\int_0^1 e^x\\,dx = e - (e - 1) = 1$.

**The bell curve's variance is 1.** Let $\\varphi(z) = \\frac{1}{\\sqrt{2\\pi}}e^{-z^2/2}$, the standard bell curve, whose total area is 1 (lesson [[#gaussian-integral]] proves it). Its variance is $\\int z^2\\varphi(z)\\,dz$. Write $z^2\\varphi = z \\cdot (z\\varphi)$ and use parts with $u = z$ and $v' = z\\varphi(z)$. By the substitution example, $v = -\\varphi(z)$. So

$$\\int_{-T}^{T} z^2\\varphi\\,dz = \\big[-z\\,\\varphi(z)\\big]_{-T}^{T} + \\int_{-T}^{T}\\varphi(z)\\,dz$$

As $T$ grows, $T\\varphi(T) \\to 0$ (the $e^{-T^2/2}$ crushes the $T$), so the bracket vanishes, and the last integral tends to the total area, 1. **Variance 1, standard deviation 1.** By the rescaling result, $\\mathcal N(\\mu, \\sigma^2)$ then has standard deviation exactly $\\sigma$: the "2" in its formula is what makes this come out right.` },
      { figure: 'SubstitutionFig', caption: 'Stretch a curve sideways by $\\sigma$: every strip gets $\\sigma$ times wider at the same height, so the area is multiplied by $\\sigma$. That is substitution with $u = (x - \\mu)/\\sigma$.' },
      {
        code: {
          file: 'calculus.py', fn: 'normal_moment', notes: [
            ['def normal_moment(k, n=4000):', ['$\\int z^k\\varphi(z)\\,dz$: $k = 0$ is the total area, $k = 1$ the mean, $k = 2$ the variance (since the mean is 0).']],
            ['return area(lambda z: z ** k * math.exp(-z * z / 2) / math.sqrt(2 * math.pi), -10, 10, n)', ['Midpoint strips from $-10$ to $10$; beyond that $\\varphi$ is below $10^{-22}$.'], { tex: '\\int_{-10}^{10} z^k\\,\\varphi(z)\\,dz' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'Measure the variance of the standard bell curve, $\\int z^2\\varphi(z)\\,dz$, with strips. (6 decimals)',
          answer: 1, tolerance: 1e-6, compute: () => normalMoment(2),
          explain: `${f(normalMoment(2))}: 1, as integration by parts proved.`,
        },
      },
      {
        predict: {
          prompt: 'Using substitution: what is $\\int_0^2 x\\,e^{-x^2/2}\\,dx$? (4 decimals)',
          answer: 1 - Math.exp(-2), tolerance: 0.00006, compute: () => area(x => x * Math.exp(-x * x / 2), 0, 2, 4000),
          explain: `$\\big[-e^{-x^2/2}\\big]_0^2 = -e^{-2} + 1 = ${f(1 - Math.exp(-2))}$.`,
        },
      },
      { note: 'Substitution: $\\int f(g(x))g\'(x)\\,dx = F(g(x))$, the chain rule backwards; with $u = (x-\\mu)/\\sigma$, areas scale by $\\sigma$. Parts: $\\int u v\' = [uv] - \\int u\' v$, the product rule backwards; it proves the standard bell curve has variance 1.' },
    ],
  },

  {
    id: 'taylor', title: 'Taylor series: polynomials that hug a function',
    goal: 'Build the Taylor polynomial $\\sum_k \\frac{f^{(k)}(a)}{k!}(x - a)^k$ by matching derivatives, prove its error bound, and use it to justify the series for $e^x$ and first- and second-order approximations.',
    builds: ['second-derivative', 'integration-techniques', 'induction'],
    blocks: [
      { md: `Near a point $a$, a smooth function looks like a line (its tangent), and even more like a parabola that also matches its bend. **Taylor polynomials** continue the idea: the polynomial that matches $f$'s value, slope, bend, and every further derivative at $a$.

**Building it.** Write $p(x) = c_0 + c_1(x - a) + c_2(x - a)^2 + \\dots + c_n(x - a)^n$ and choose each $c_k$ so that $p$ and $f$ have the same $k$-th derivative at $a$ (written $f^{(k)}(a)$; $f^{(0)} = f$). Differentiate $(x - a)^j$ $k$ times with the power rule: if $j < k$ it becomes 0; if $j > k$ a factor $(x - a)$ survives, which is 0 at $x = a$; only $j = k$ survives at $a$, as $k \\times (k-1) \\times \\dots \\times 1 = k!$. So $p^{(k)}(a) = k!\\,c_k$, and matching needs $c_k = \\frac{f^{(k)}(a)}{k!}$:

$$f(x) \\approx f(a) + f'(a)(x - a) + \\frac{f''(a)}{2!}(x - a)^2 + \\dots + \\frac{f^{(n)}(a)}{n!}(x - a)^n$$

That's where the factorials come from. For $e^x$ at $a = 0$ every derivative is $e^0 = 1$, so the polynomial is $1 + x + \\frac{x^2}{2!} + \\dots + \\frac{x^n}{n!}$: lesson [[#number-e]]'s series, found a second way.

**How wrong is it? A proof of the error bound.** Write $R_n(x) = f(x) - p_n(x)$ for the error. Take $a = 0$ and $x > 0$ (other cases are the same with signs). The fundamental theorem says $f(x) = f(0) + \\int_0^x f'(t_1)\\,dt_1$. Apply it again inside, to $f'$: $f'(t_1) = f'(0) + \\int_0^{t_1} f''(t_2)\\,dt_2$. Substituting and integrating the constant $f'(0)$ gives $f(x) = f(0) + f'(0)\\,x + \\int_0^x\\!\\int_0^{t_1} f''(t_2)\\,dt_2\\,dt_1$. Repeat $n + 1$ times: $f(x) = p_n(x) + R_n(x)$, where $R_n$ is $n + 1$ nested integrals of $f^{(n+1)}$. If $|f^{(n+1)}| \\le M$ everywhere on $[0, x]$, each nested integral is at most the same nest with $M$ in place, and integrating the constant 1 nested $n + 1$ times gives $\\frac{x^{n+1}}{(n+1)!}$ (by induction, lesson [[#induction]]: $\\int_0^x \\frac{t^k}{k!}dt = \\frac{x^{k+1}}{(k+1)!}$ by the power rule). So

$$|R_n(x)| \\le M\\,\\frac{|x - a|^{n+1}}{(n + 1)!}$$

**For $e^x$** all derivatives are $e^t \\le e^{|x|}$ on the interval, so $M = e^{|x|}$ and the error is at most $e^{|x|}\\frac{|x|^{n+1}}{(n+1)!}$. Once $n + 1 > 2|x|$, each extra term multiplies that bound by $\\frac{|x|}{n+2} < \\frac12$, so it halves (at least) every step and goes to 0. **The series for $e^x$ converges to $e^x$ for every $x$**, the step lesson [[#number-e]] had to take on trust.

**Why ML uses Taylor all the time.**
- **First order** ($n = 1$): $f(\\theta + \\Delta) \\approx f(\\theta) + f'(\\theta)\\Delta$. A gradient step $\\Delta = -\\eta f'$ changes the loss by about $-\\eta (f')^2$, negative: it goes down, **if $\\eta$ is small enough** for the neglected term to stay small.
- **Second order**: $f(\\theta + \\Delta) \\approx f + f'\\Delta + \\frac12 f''\\Delta^2$, a parabola whose lowest point is at $\\Delta = -f'/f''$: **Newton's method**, which the optimisation lessons build on.
- Handy small-$x$ approximations: $\\ln(1 + x) \\approx x - \\frac{x^2}{2}$, $e^x \\approx 1 + x$, $\\sigma(z) \\approx \\frac12 + \\frac z4$.` },
      { figure: 'TaylorFig', caption: 'A function and its Taylor polynomial at $a$. Raise the degree: the polynomial hugs the curve over a wider stretch. The error bound (orange) always sits above the true error.' },
      {
        code: {
          file: 'calculus.py', fn: 'taylor', notes: [
            ['def taylor(derivatives, a, x):', ['The list $f(a), f\'(a), f\'\'(a), \\dots$, the centre $a$, and where to evaluate.']],
            ['total = 0.0', ['Running Σ.']],
            ['factor = 1.0', ['$\\frac{(x - a)^k}{k!}$ for $k = 0$.']],
            ['for k, d in enumerate(derivatives):', ['Each derivative $d = f^{(k)}(a)$.']],
            ['total += d * factor', ['Add $f^{(k)}(a)\\frac{(x - a)^k}{k!}$.']],
            ['factor *= (x - a) / (k + 1)', ['Turn $\\frac{(x-a)^k}{k!}$ into $\\frac{(x-a)^{k+1}}{(k+1)!}$: no factorials computed.']],
            ['return total', ['The Taylor polynomial at $x$.'], { tex: '\\sum_{k=0}^n \\frac{f^{(k)}(a)}{k!}(x - a)^k' }],
          ],
        },
      },
      {
        code: {
          file: 'calculus.py', fn: 'taylor_exp', notes: [
            ['def taylor_exp(x, n):', ['$e^x$ to degree $n$, with a guaranteed error bound.']],
            ['total = 0.0', ['Running Σ.']],
            ['term = 1.0', ['$\\frac{x^0}{0!}$.']],
            ['for k in range(n + 1):', ['$k = 0, \\dots, n$.']],
            ['total += term', ['Add $\\frac{x^k}{k!}$.']],
            ['term *= x / (k + 1)', ['Next term. After the loop, `term` is $\\frac{x^{n+1}}{(n+1)!}$.']],
            ['return total, math.exp(abs(x)) * abs(term)', ['The approximation, and the proved bound $e^{|x|}\\frac{|x|^{n+1}}{(n+1)!}$.'], { tex: '|R_n| \\le e^{|x|}\\frac{|x|^{n+1}}{(n+1)!}' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'The degree-2 Taylor polynomial of $e^x$ at 0, evaluated at $x = 0.5$? (4 decimals)',
          answer: 1.625, tolerance: 0.00006, compute: () => taylor([1, 1, 1], 0, 0.5),
          explain: `$1 + 0.5 + \\frac{0.25}{2} = 1.625$; the true $e^{0.5} = ${f(Math.exp(0.5))}$, an error of ${f(Math.exp(0.5) - 1.625)}, within the bound $e^{0.5}\\frac{0.5^3}{3!} = ${f(Math.exp(0.5) * 0.125 / 6)}$.`,
        },
      },
      {
        predict: {
          prompt: 'How small does the bound make the error of the degree-10 polynomial for $e^1$? (Give the bound in scientific notation, like 6.8e-8.)',
          answer: taylorExp(1, 10)[1], tolerance: 1e-9, compute: () => taylorExp(1, 10)[1],
          explain: `$e \\cdot \\frac{1}{11!} = ${taylorExp(1, 10)[1].toExponential(2)}$: eleven terms give $e$ to about seven digits, guaranteed.`,
        },
      },
      { note: 'Taylor: $\\sum_k \\frac{f^{(k)}(a)}{k!}(x-a)^k$, with $k!$ because $k$ derivatives of $(x-a)^k$ give $k!$. Error at most $M\\frac{|x-a|^{n+1}}{(n+1)!}$, proved by nesting the fundamental theorem. So $e^x = \\sum x^k/k!$ for every $x$. First order: gradient steps; second order: Newton.' },
    ],
  },
]
