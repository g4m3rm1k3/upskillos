// Part 2: change. The opening chapter's falling ball (lessons/fall.js, kept as written), then the
// slope of a line, limits, the derivative from its definition, the rules, e^x and ln x, the chain
// rule, minima, gradient descent, partial derivatives, the gradient, and the integral.
import { FALL_LESSONS } from './fall.js'
import { height, averageRate, shrinking, derivative, sigmoidSlope, descend, bowlGradient, descend2d, area } from '../engine/maths.js'
import { f } from './util.js'

const FALL = FALL_LESSONS.map((l, i) => ({ ...l, number: `2.${i + 1}`, builds: i === 0 ? ['functions'] : [FALL_LESSONS[i - 1].id] }))
const dx2 = x => 2 * x

export const PART2 = {
  id: 'part2', title: 'Part 2 · Change: calculus', lessons: [
    ...FALL,
    {
      id: 'slope', number: '2.7', title: 'The slope of a line',
      goal: 'Compute a slope as rise over run, read $y = mx + c$, and connect slope to "how much the output changes per unit of input".',
      builds: ['rate'],
      blocks: [
        { md: `Lesson 2.6 divided a change in height by a change in time and got a rate. That division works for **any** two quantities. The **slope** between two points $(x_1, y_1)$ and $(x_2, y_2)$ is

$$m = \\frac{\\Delta y}{\\Delta x} = \\frac{y_2 - y_1}{x_2 - x_1}$$

"rise over run": how much $y$ goes up for each 1 that $x$ goes across. $\\Delta$ (capital delta) means "change in".

A straight line has the **same slope everywhere**, and that is what makes it straight. Every line can be written $y = mx + c$: $m$ is the slope and $c$ is where it crosses the vertical axis (the value at $x = 0$). That is lesson 1.1's model, $\\hat y = wx + b$, with different letter names: the weight $w$ **is** a slope. It says how much the prediction changes per unit of input.` },
        { figure: 'SlopeFig', caption: 'Drag the two points. The triangle shows the rise and the run; their ratio is the slope.' },
        {
          symbols: [
            ['\\Delta y', 'delta y', 'the change in $y$: later minus earlier', 'y2 - y1'],
            ['m = \\frac{\\Delta y}{\\Delta x}', 'm equals delta y over delta x', 'slope: rise per unit of run', '(y2 - y1) / (x2 - x1)'],
            ['y = mx + c', 'y equals m x plus c', 'a straight line: slope $m$, crossing the axis at $c$', ''],
          ],
        },
        {
          code: {
            file: 'calculus.py', fn: 'average_rate', notes: [
              ['def average_rate(f, a, b):', ['Any function `f`, any two inputs.']],
              ['return (f(b) - f(a)) / (b - a)', ['Rise over run between the points $(a, f(a))$ and $(b, f(b))$.'], { tex: '\\frac{f(b) - f(a)}{b - a}' }],
            ],
          },
        },
        {
          predict: {
            prompt: 'What is the slope of the line through $(1, 3)$ and $(4, 12)$?',
            answer: (12 - 3) / (4 - 1), compute: () => averageRate(x => 3 * x, 1, 4),
            explain: 'Rise $12 - 3 = 9$, run $4 - 1 = 3$: slope $9/3 = 3$.',
          },
        },
        { note: 'Slope $= \\Delta y / \\Delta x$. A line $y = mx + c$ has slope $m$ everywhere. A model weight is a slope: change in prediction per unit of input.' },
      ],
    },

    {
      id: 'instant', number: '2.8', title: 'Speed at one instant: limits',
      goal: 'Compute average rates over shrinking intervals and read $\\lim_{h \\to 0}$ as "what they close in on".',
      builds: ['slope'],
      blocks: [
        { md: `How fast is the ball falling **at exactly 1 second**? An instant has no length, so "change in height ÷ change in time" would be $0 \\div 0$: meaningless. But we can ask about **very short** intervals starting at 1 s, and watch what happens as they shrink:

| Interval | Average velocity |
|---|---|
${shrinking(height, 1).map(([h, r]) => `| 1 s to ${f(1 + h)} s | ${f(r)} m/s |`).join('\n')}

The averages close in on **−10 m/s**. Not because we ever use an interval of length 0, but because we can get as close to −10 as we like by making the interval short enough. That target is called a **limit**:

$$v(1) = \\lim_{h \\to 0} \\frac{h(1 + h) - h(1)}{h} = -10$$

Read "$\\lim_{h \\to 0}$" as "what this closes in on as $h$ gets closer and closer to 0". On the graph, the line through two points (a **secant**) turns, as the second point slides toward the first, into the line that just touches the curve: the **tangent**. Its slope is the **instantaneous rate**.` },
        { figure: 'ZoomFig', caption: 'Shrink $h$: the secant line swings toward the tangent, and its slope toward −10.' },
        {
          code: {
            file: 'calculus.py', fn: 'shrinking', notes: [
              ['def shrinking(f, x, steps=6):', ['Average rates over smaller and smaller intervals.']],
              ['rates = []', ['Pairs (interval length, average rate).']],
              ['h = 1.0', ['Start with an interval 1 long.']],
              ['for _ in range(steps):', ['Six times…']],
              ['rates.append((h, average_rate(f, x, x + h)))', ['…the average rate over $[x, x + h]$…']],
              ['h = h / 10', ['…then a ten-times-shorter interval.'], { calc: q => [`${q.h} / 10`, q.h / 10] }],
              ['return rates', ['They approach the instantaneous rate.']],
            ],
          },
        },
        {
          code: {
            file: 'calculus.py', fn: 'height', notes: [
              ['def height(t):', ['The falling ball of lessons 2.1–2.6, as a function.']],
              ['return 20 - 5 * t * t', ['$h(t) = 20 - 5t^2$: 20 m at $t = 0$, 0 m at $t = 2$.'], { tex: 'h(t) = 20 - 5t^2', calc: q => [`20 − 5 × ${f(q.t)}²`, 20 - 5 * q.t * q.t] }],
            ],
          },
        },
        {
          predict: {
            prompt: 'Average velocity from 1 s to 1.01 s? (4 decimals)',
            answer: averageRate(height, 1, 1.01), tolerance: 0.0001, compute: () => averageRate(height, 1, 1.01),
            explain: `$h(1.01) = 20 - 5 \\times 1.0201 = 14.8995$; change $-0.1005$ over $0.01$ s: $${f(averageRate(height, 1, 1.01))}$. Almost −10.`,
          },
        },
        { note: 'An instantaneous rate is the **limit** of average rates over shrinking intervals: $\\lim_{h\\to0}\\frac{f(x+h) - f(x)}{h}$. On a graph, it is the slope of the **tangent** line.' },
      ],
    },

    {
      id: 'derivative', number: '2.9', title: 'The derivative, from its definition',
      goal: 'Derive the derivative of $x^2$ with algebra, and read $f\'(x)$, $\\frac{dy}{dx}$ and $\\frac{d}{dx}$.',
      builds: ['instant', 'powers'],
      blocks: [
        { md: `The limit of lesson 2.8 gets a name. The **derivative** of $f$ at $x$ is

$$f'(x) = \\lim_{h \\to 0} \\frac{f(x + h) - f(x)}{h}$$

the slope of $f$'s graph at $x$: how fast the output changes per unit of input, right there. Instead of computing it number by number, we can often do the algebra once for every $x$. For $f(x) = x^2$:

1. $f(x + h) = (x + h)^2 = x^2 + 2xh + h^2$ (multiply out the brackets).
2. Subtract $f(x) = x^2$: the $x^2$ cancels, leaving $2xh + h^2$.
3. Divide by $h$: $2x + h$.
4. Let $h$ shrink to 0: $2x$.

So the derivative of $x^2$ is $2x$. At $x = 3$ the slope is 6; at $x = -1$ it is $-2$ (the curve goes down there); at $x = 0$ it is 0 (the bottom of the bowl). One line of algebra gave the slope **everywhere**.

The ball: $h(t) = 20 - 5t^2$. The same steps give $h'(t) = -10t$, so at $t = 1$: $-10$ m/s, the number lesson 2.8 closed in on.` },
        {
          symbols: [
            ['f\'(x)', 'f prime of x', 'the derivative of $f$ at $x$: its slope there', 'derivative(f, x)'],
            ['\\frac{dy}{dx}', 'd y by d x', 'the same thing, written as "tiny change in $y$ over tiny change in $x$"', ''],
            ['\\frac{d}{dx}\\,f', 'd by d x of f', 'an instruction: "take the derivative with respect to $x$"', ''],
            ['\\lim_{h \\to 0}', 'the limit as h goes to 0', 'what the expression closes in on as $h$ shrinks', ''],
          ],
        },
        { figure: 'DerivativeFig', caption: 'A function (top) and its derivative (bottom). The tangent\'s slope at your point is the height of the lower curve there.' },
        { md: `Computers usually don't do the algebra; they either use the rules of the next lessons automatically (that's what PyTorch's \`backward()\` does, Part 5), or estimate the slope numerically with a tiny $h$ on both sides:` },
        {
          code: {
            file: 'calculus.py', fn: 'derivative', notes: [
              ['def derivative(f, x, h=1e-5):', ['`1e-5` is $10^{-5} = 0.00001$.']],
              ['return (f(x + h) - f(x - h)) / (2 * h)', ['The average rate over $[x - h, x + h]$: centred on $x$, which makes it much more accurate than $[x, x + h]$.'], { tex: 'f\'(x) \\approx \\frac{f(x+h) - f(x-h)}{2h}' }],
            ],
          },
        },
        {
          predict: {
            prompt: 'Using $\\frac{d}{dx} x^2 = 2x$, what is the slope of $x^2$ at $x = 3.5$?',
            answer: dx2(3.5), compute: () => derivative(x => x * x, 3.5), tolerance: 1e-6,
            explain: '$2 \\times 3.5 = 7$. The numerical estimate agrees to many digits.',
          },
        },
        {
          predict: {
            prompt: 'The ball\'s velocity at $t = 1.5$ s, from $h\'(t) = -10t$?',
            answer: -15, compute: () => derivative(height, 1.5), tolerance: 1e-6,
            explain: '$-10 \\times 1.5 = -15$ m/s: faster than at 1 s, as the table of lesson 2.3 suggested.',
          },
        },
        { note: '$f\'(x) = \\lim_{h\\to0}\\frac{f(x+h)-f(x)}{h}$, the slope at $x$. Also written $\\frac{df}{dx}$. $\\frac{d}{dx}x^2 = 2x$, found by expanding $(x+h)^2$.' },
      ],
    },

    {
      id: 'derivative-rules', number: '2.10', title: 'Shortcuts: the derivative rules',
      goal: 'Differentiate any polynomial with the power, constant-multiple and sum rules, and say why each holds.',
      builds: ['derivative'],
      blocks: [
        { md: `Doing the limit every time would be slow. Three rules cover every polynomial, and each comes from the definition:

1. **Power rule:** $\\frac{d}{dx}\\, x^n = n\\,x^{n-1}$. Expanding $(x+h)^n$, the only term that survives dividing by $h$ and shrinking $h$ is $n x^{n-1}h$ (all others have $h^2$ or more). We saw $n = 2$: $2x$. For $x^3$: $3x^2$. For $x^1 = x$: $1$ (a line of slope 1). For a constant ($x^0$): 0, because a flat line has no slope.
2. **Constant multiple:** $\\frac{d}{dx}\\, c f(x) = c f'(x)$. Stretching a graph vertically by 3 makes every slope 3 times steeper.
3. **Sum rule:** $\\frac{d}{dx}\\,(f + g) = f' + g'$. The change in a sum is the sum of the changes.

Together: $\\frac{d}{dx}(4x^3 - 2x + 7) = 12x^2 - 2$. Term by term: $4 \\times 3x^2$, then $-2 \\times 1$, then $0$ for the constant.

Back to ML: the derivative of a model with respect to its weight. For $\\hat y = wx + b$, treat $x$ and $b$ as fixed numbers: $\\frac{d\\hat y}{dw} = x$. The bigger the input, the more a change in its weight moves the prediction.` },
        { figure: 'RulesFig', caption: 'Build a polynomial term by term; its derivative is built term by term too.' },
        {
          predict: {
            prompt: 'What is the slope of $f(x) = x^3 - 4x$ at $x = 2$?',
            answer: 3 * 4 - 4, compute: () => derivative(x => x ** 3 - 4 * x, 2), tolerance: 1e-6,
            explain: '$f\'(x) = 3x^2 - 4$, so $f\'(2) = 12 - 4 = 8$.',
            misconceptions: [{ answer: 0, feedback: '$f(2) = 8 - 8 = 0$ is the **value**. The slope is $f\'(2)$.' }],
          },
        },
        { note: '$\\frac{d}{dx}x^n = nx^{n-1}$; constants multiply through; sums differentiate term by term. A constant on its own has slope 0.' },
      ],
    },

    {
      id: 'exp-log-slopes', number: '2.11', title: 'The slopes of $e^x$ and $\\ln x$',
      goal: 'Explain why $\\frac{d}{dx}e^x = e^x$ and $\\frac{d}{dx}\\ln x = \\frac1x$.',
      builds: ['derivative-rules', 'logarithms'],
      blocks: [
        { md: `Lesson 1.6 built $e$ from growth that is always proportional to the current amount. That is exactly the statement "slope equals height":

$$\\frac{d}{dx}\\, e^x = e^x$$

At $x = 0$ the curve is at height 1 and its slope is 1; at $x = 2$ the height is 7.39 and so is the slope. You can also see it from the series: differentiate $1 + x + \\frac{x^2}{2} + \\frac{x^3}{6} + \\dots$ term by term with the power rule and you get $0 + 1 + x + \\frac{x^2}{2} + \\dots$, the same series again.

The log is the mirror image of the exponential (lesson 1.7), so its slopes are the mirror image too: where $e^x$ has slope $s$, the reflected curve has slope $1/s$. That gives

$$\\frac{d}{dx}\\, \\ln x = \\frac{1}{x}$$

Steep near 0, flatter and flatter as $x$ grows. This is the derivative behind every cross-entropy gradient in Part 5.` },
        { figure: 'ExpSlopeFig', caption: 'At every point of $e^x$, the tangent\'s slope equals the height. Slide along and compare.' },
        {
          predict: {
            prompt: 'What is the slope of $\\ln x$ at $x = 4$?',
            answer: 0.25, compute: () => derivative(Math.log, 4), tolerance: 1e-6,
            explain: '$1/x = 1/4 = 0.25$.',
          },
        },
        { note: '$\\frac{d}{dx}e^x = e^x$ (slope = height). $\\frac{d}{dx}\\ln x = \\frac1x$.' },
      ],
    },

    {
      id: 'chain-rule', number: '2.12', title: 'The chain rule: rates multiply',
      goal: 'Differentiate a composition $f(g(x))$ by multiplying rates, and derive $\\sigma\'(z) = \\sigma(z)(1 - \\sigma(z))$.',
      builds: ['exp-log-slopes', 'composition'],
      blocks: [
        { md: `Composition (lesson 1.8) chains machines; the **chain rule** chains their rates. Think of gears: if gear A turns 3 times for each turn of B, and B turns 2 times for each turn of C, then A turns $3 \\times 2 = 6$ times for each turn of C. **Rates of change multiply along a chain.**

If $y = f(u)$ and $u = g(x)$:

$$\\frac{dy}{dx} = \\frac{dy}{du} \\cdot \\frac{du}{dx}$$

Example: $y = (2x + 1)^2$. Inside, $u = 2x + 1$ with $\\frac{du}{dx} = 2$. Outside, $y = u^2$ with $\\frac{dy}{du} = 2u$. Multiply: $\\frac{dy}{dx} = 2u \\times 2 = 4(2x + 1)$.

This one rule is how every neural network learns. A network is a long chain of compositions, and **backpropagation** (Part 5) is the chain rule applied from the output back to each weight, multiplying rates as it goes.` },
        { md: `Now the sigmoid, $\\sigma(z) = (1 + e^{-z})^{-1}$, one link at a time:

1. $u = 1 + e^{-z}$: by the chain rule on $e^{-z}$, $\\frac{du}{dz} = -e^{-z}$.
2. $\\sigma = u^{-1}$: power rule, $\\frac{d\\sigma}{du} = -u^{-2}$.
3. Multiply: $\\frac{d\\sigma}{dz} = -u^{-2} \\times (-e^{-z}) = \\dfrac{e^{-z}}{(1 + e^{-z})^2}$.

Split that fraction as $\\dfrac{1}{1 + e^{-z}} \\times \\dfrac{e^{-z}}{1 + e^{-z}}$. The first factor is $\\sigma$. The second is $\\dfrac{(1 + e^{-z}) - 1}{1 + e^{-z}} = 1 - \\sigma$. So:

$$\\sigma'(z) = \\sigma(z)\\,\\big(1 - \\sigma(z)\\big)$$

The slope of the sigmoid is built from the sigmoid itself: largest (0.25) at $z = 0$, nearly 0 far out on either side. That flatness far out is the "vanishing gradient" that made deep sigmoid networks hard to train.` },
        { figure: 'ChainFig', caption: 'Each link has its own rate; the whole chain\'s rate is their product. Check it against the measured slope.' },
        {
          code: {
            file: 'calculus.py', fn: 'sigmoid_slope', notes: [
              ['def sigmoid_slope(z):', ['The chain rule\'s result, ready to use.']],
              ['s = sigmoid(z)', ['$\\sigma(z)$, computed once.']],
              ['return s * (1 - s)', ['$\\sigma(1 - \\sigma)$.'], { tex: '\\sigma\'(z) = \\sigma(z)(1 - \\sigma(z))', calc: q => [`${f(q.s)} × (1 − ${f(q.s)})`, q.s * (1 - q.s)] }],
            ],
          },
        },
        {
          predict: {
            prompt: 'What is $\\frac{d}{dx}(2x + 1)^2$ at $x = 1$?',
            answer: 4 * (2 * 1 + 1), compute: () => derivative(x => (2 * x + 1) ** 2, 1), tolerance: 1e-5,
            explain: '$4(2x + 1) = 4 \\times 3 = 12$.',
            misconceptions: [{ answer: 6, feedback: 'That is $2u$, the outer rate alone. Multiply by the inner rate, 2.' }],
          },
        },
        {
          predict: {
            prompt: 'What is $\\sigma\'(2)$? (4 decimals)',
            answer: sigmoidSlope(2), tolerance: 0.00006, compute: () => derivative(z => 1 / (1 + Math.exp(-z)), 2),
            explain: `$\\sigma(2) = 0.8808$, so $0.8808 \\times 0.1192 = ${f(sigmoidSlope(2))}$.`,
          },
        },
        { note: 'Chain rule: $\\frac{dy}{dx} = \\frac{dy}{du}\\frac{du}{dx}$, rates multiply. It gives $\\sigma\' = \\sigma(1 - \\sigma)$, and backpropagation is the chain rule run backwards through a network.' },
      ],
    },

    {
      id: 'minimum', number: '2.13', title: 'Where the slope is zero',
      goal: 'Find a minimum by solving $f\'(x) = 0$, and use the sign of the slope to tell which way is downhill.',
      builds: ['chain-rule', 'argmin'],
      blocks: [
        { md: `At the bottom of a valley the ground is flat: the slope is **zero**. To the left of the bottom the slope is negative (going down as you move right); to the right it is positive. So, for a smooth function:

**At a minimum, $f'(x) = 0$.** To find $\\arg\\min$ (lesson 1.10), solve $f'(x) = 0$.

Example. Fit a single number $w$ to the data $y = (3, 5, 10)$ by minimising the squared error $L(w) = (w - 3)^2 + (w - 5)^2 + (w - 10)^2$. Differentiate (chain rule on each term): $L'(w) = 2(w - 3) + 2(w - 5) + 2(w - 10) = 6w - 36$. Set it to 0: $w = 6$, the **mean** of the data. That is no coincidence: the mean is the number with the smallest total squared distance to the data, and this is the first "learning" we have done with calculus.

Slope 0 can also mean a maximum (top of a hill) or a flat step. The **second derivative** $f''(x)$, the slope of the slope, tells them apart: positive means the curve bends upward like a bowl, so a minimum.` },
        { figure: 'MinimumFig', caption: 'The curve coloured by the sign of its slope: going down (orange) or up (teal). The minimum is where they meet.' },
        {
          predict: {
            prompt: 'Which $w$ minimises $L(w) = (w - 2)^2 + (w - 4)^2 + (w - 9)^2$?',
            answer: 5, compute: () => (2 + 4 + 9) / 3,
            explain: '$L\'(w) = 2(3w - 15) = 0$ gives $w = 5$, the mean of 2, 4 and 9.',
          },
        },
        { note: 'Minimum ⇒ slope 0. Negative slope: downhill is to the right; positive: to the left. The number closest (in squared distance) to some data is their mean.' },
      ],
    },

    {
      id: 'gradient-descent-1d', number: '2.14', title: 'Gradient descent: walking downhill',
      goal: 'Run the update $w \\leftarrow w - \\eta f\'(w)$ by hand, and predict what too small and too large a learning rate do.',
      builds: ['minimum'],
      blocks: [
        { md: `Solving $f'(x) = 0$ by algebra works for small problems. A neural network's loss has millions of parameters and no formula for the solution. So instead we **walk downhill**: start anywhere, look at the slope, take a small step the other way, repeat.

$$w \\leftarrow w - \\eta\\, f'(w)$$

The arrow means "replace $w$ with". If the slope is positive, downhill is to the left, and subtracting a positive amount moves left. If it is negative, we move right. $\\eta$ (eta) is the **learning rate**: how big a step. This is **gradient descent**, the engine inside nearly all of machine learning.

Steep slope, big step; nearly flat, tiny step: so it slows down automatically near the bottom. But the learning rate matters. Too small, and progress is painfully slow. Too large, and each step overshoots the bottom, maybe further than it started: it can bounce higher and higher and **diverge**.` },
        {
          code: {
            file: 'calculus.py', fn: 'descend', notes: [
              ['def descend(slope, x, rate=0.1, steps=20):', ['`slope` is the derivative function, `rate` is $\\eta$.']],
              ['path = [x]', ['Every position visited.']],
              ['for _ in range(steps):', ['Repeat…']],
              ['x = x - rate * slope(x)', ['…one downhill step.'], { tex: 'x \\leftarrow x - \\eta f\'(x)' }],
              ['path.append(x)', ['Record it.']],
              ['return path', ['The walk.']],
            ],
          },
        },
        { figure: 'Descent1D', caption: 'Gradient descent on a bowl. Change the learning rate: crawl, glide, zig-zag, or blow up.' },
        {
          predict: {
            prompt: 'Minimise $f(x) = (x - 3)^2$, slope $2(x - 3)$, starting at $x = 0$ with $\\eta = 0.1$. Where are you after **one** step?',
            answer: descend(x => 2 * (x - 3), 0, 0.1, 1)[1], tolerance: 1e-9, compute: () => descend(x => 2 * (x - 3), 0, 0.1, 1)[1],
            explain: 'Slope at 0: $2(0 - 3) = -6$. Step: $0 - 0.1 \\times (-6) = 0.6$.',
            misconceptions: [{ answer: -0.6, tolerance: 1e-9, feedback: 'Minus a negative is plus: the slope is negative, so downhill is to the right.' }],
          },
        },
        {
          predict: {
            prompt: 'And after 10 steps? (3 decimals)',
            answer: descend(x => 2 * (x - 3), 0, 0.1, 10)[10], tolerance: 0.0006, compute: () => descend(x => 2 * (x - 3), 0, 0.1, 10)[10],
            explain: `${f(descend(x => 2 * (x - 3), 0, 0.1, 10)[10])}: each step closes 20% of the remaining gap to 3.`,
          },
        },
        { note: '**Gradient descent**: $w \\leftarrow w - \\eta f\'(w)$. Steps shrink as the slope flattens. The learning rate $\\eta$ trades speed against stability.' },
      ],
    },

    {
      id: 'partial-derivatives', number: '2.15', title: 'Partial derivatives: one input at a time',
      goal: 'Compute $\\frac{\\partial f}{\\partial x}$ and $\\frac{\\partial f}{\\partial y}$ by holding the other input fixed.',
      builds: ['gradient-descent-1d'],
      blocks: [
        { md: `A model has many parameters ($w$ **and** $b$, or millions), so its loss is a function of many inputs. Picture a function of two inputs, $f(x, y)$, as a **landscape**: $x$ and $y$ are east and north, $f$ is the height. Contour lines (as on a hiking map) join points of equal height.

Standing somewhere, you can ask how steep it is going east, or going north. Walking east, $y$ doesn't change, so treat $y$ as a fixed number and differentiate in $x$ as usual. That is the **partial derivative** with respect to $x$:

$$\\frac{\\partial f}{\\partial x} \\quad (\\text{"partial f by partial x"})$$

The curly $\\partial$ says "other inputs held fixed". Example: $f(x, y) = (x - 3)^2 + 2(y + 1)^2$, a bowl lowest at $(3, -1)$.

- $\\frac{\\partial f}{\\partial x} = 2(x - 3)$: the $y$ term is a constant, slope 0.
- $\\frac{\\partial f}{\\partial y} = 4(y + 1)$: the $x$ term is a constant.` },
        { figure: 'SurfaceFig', caption: 'The bowl as a contour map. Slice it east–west or north–south through your point: each slice is an ordinary curve with an ordinary slope.' },
        {
          code: {
            file: 'calculus.py', fn: 'bowl', notes: [
              ['def bowl(x, y):', ['A loss with two inputs.']],
              ['return (x - 3) ** 2 + 2 * (y + 1) ** 2', ['Lowest, 0, at $x = 3$, $y = -1$.'], { tex: 'f(x, y) = (x-3)^2 + 2(y+1)^2' }],
            ],
          },
        },
        {
          code: {
            file: 'calculus.py', fn: 'bowl_gradient', notes: [
              ['def bowl_gradient(x, y):', ['Both partial derivatives.']],
              ['return 2 * (x - 3), 4 * (y + 1)', ['$\\partial f/\\partial x$ and $\\partial f/\\partial y$, returned as a pair.'], { tex: '\\left(\\frac{\\partial f}{\\partial x}, \\frac{\\partial f}{\\partial y}\\right) = (2(x-3),\\; 4(y+1))' }],
            ],
          },
        },
        {
          predict: {
            prompt: 'At $(x, y) = (1, 0)$, what is $\\frac{\\partial f}{\\partial y}$ for the bowl?',
            answer: bowlGradient(1, 0)[1], compute: () => bowlGradient(1, 0)[1],
            explain: '$4(y + 1) = 4 \\times 1 = 4$. Going north here, the bowl rises 4 per step.',
          },
        },
        { note: '$\\frac{\\partial f}{\\partial x}$: the slope in the $x$ direction, every other input held fixed. One partial per input.' },
      ],
    },

    {
      id: 'gradient', number: '2.16', title: 'The gradient ∇: all the slopes at once',
      goal: 'Assemble the gradient vector $\\nabla f$ and explain why it points uphill.',
      builds: ['partial-derivatives'],
      blocks: [
        { md: `Put all the partial derivatives in one list and you have the **gradient**:

$$\\nabla f(x, y) = \\left(\\frac{\\partial f}{\\partial x},\\; \\frac{\\partial f}{\\partial y}\\right)$$

$\\nabla$ is "nabla" (or "del", or just "grad"). A list of numbers like this is a **vector** (Part 3), and we can draw it as an arrow on the map. Remarkably, that arrow always points **straight uphill**: the direction of steepest ascent, at right angles to the contour lines. Its length says how steep. (Part 3's dot product will show why.)

For the bowl at $(0, 0)$: $\\nabla f = (2(0 - 3), 4(0 + 1)) = (-6, 4)$: uphill is west and north. So **downhill** is $-\\nabla f = (6, -4)$: east and south, toward the bottom at $(3, -1)$.

When a paper writes $\\nabla_\\theta \\mathcal L$ it means "the gradient of the loss with respect to the parameters θ": one partial derivative for every single parameter.` },
        { figure: 'GradientFig', caption: 'Gradient arrows on the bowl\'s map: every one points uphill, across the contours. Drag your point.' },
        {
          predict: {
            prompt: 'For the bowl, what is the first entry of $\\nabla f$ at $(5, 2)$?',
            answer: bowlGradient(5, 2)[0], compute: () => bowlGradient(5, 2)[0],
            explain: '$2(5 - 3) = 4$: east is uphill here, so downhill is west, toward $x = 3$.',
          },
        },
        { note: '$\\nabla f$ = the list of partial derivatives = an arrow pointing **uphill**, as long as the slope is steep. $\\nabla_\\theta \\mathcal L$: the loss\'s gradient with respect to the parameters.' },
      ],
    },

    {
      id: 'gradient-descent-2d', number: '2.17', title: 'Gradient descent in many dimensions',
      goal: 'Run $\\theta \\leftarrow \\theta - \\eta \\nabla_\\theta \\mathcal L$ on a two-parameter loss and read the update in a paper.',
      builds: ['gradient'],
      blocks: [
        { md: `Lesson 2.14 stepped against the slope in one dimension. With many inputs, step against the **gradient**: every parameter moves against its own partial derivative, all at once.

$$\\theta \\leftarrow \\theta - \\eta\\, \\nabla_\\theta \\mathcal L(\\theta)$$

You can now read every symbol: the parameters θ are replaced by themselves minus the learning rate η times the gradient of the loss. Written out for our two inputs:

$$x \\leftarrow x - \\eta \\frac{\\partial f}{\\partial x}, \\qquad y \\leftarrow y - \\eta \\frac{\\partial f}{\\partial y}$$

This is exactly how a neural network trains, with millions of entries in θ instead of two. Everything else (momentum, Adam, Part 5) is a refinement of this line.` },
        {
          code: {
            file: 'calculus.py', fn: 'descend_2d', notes: [
              ['def descend_2d(x, y, rate=0.1, steps=30):', ['Two parameters.']],
              ['path = [(x, y)]', ['Every point visited.']],
              ['for _ in range(steps):', ['Each step…']],
              ['gx, gy = bowl_gradient(x, y)', ['…the gradient here: two partial derivatives, unpacked into two names…']],
              ['x = x - rate * gx', ['…move $x$ against its slope…'], { tex: 'x \\leftarrow x - \\eta\\,\\partial f/\\partial x', calc: q => [`${f(q.x)} − ${q.rate} × ${f(q.gx)}`, q.x - q.rate * q.gx] }],
              ['y = y - rate * gy', ['…and $y$ against its own.'], { tex: 'y \\leftarrow y - \\eta\\,\\partial f/\\partial y', calc: q => [`${f(q.y)} − ${q.rate} × ${f(q.gy)}`, q.y - q.rate * q.gy] }],
              ['path.append((x, y))', ['Record.']],
              ['return path', ['The route downhill.']],
            ],
          },
        },
        { figure: 'Descent2D', caption: 'Gradient descent on the map. Click anywhere to start there; change the learning rate. Notice the zig-zag across the narrow direction when η is large.' },
        { python: { program: 'change', label: 'Step through Part 2\'s calculus in real Python' } },
        {
          code: {
            file: 'calculus.py', fn: 'show_change', notes: [
              ['def show_change():', ['What the Python tab runs.']],
              ['for h, rate in shrinking(height, 1.0):', ['Lesson 2.8\'s table.']],
              ['print("h =", h, " average rate =", rate)', ['One row of the table: interval length and average rate.']],
              ['print("descent on (x - 3)^2 from 0:", descend(lambda x: 2 * (x - 3), 0.0, 0.1, 10)[-1])', ['Lesson 2.14. `[-1]` is the last item of a list.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'Start at $(0, 0)$ with $\\eta = 0.1$. Where is $y$ after one step on the bowl?',
            answer: descend2d(0, 0, 0.1, 1)[1][1], tolerance: 1e-9, compute: () => descend2d(0, 0, 0.1, 1)[1][1],
            explain: '$\\partial f/\\partial y = 4(0 + 1) = 4$, so $y \\leftarrow 0 - 0.1 \\times 4 = -0.4$: south, toward $-1$.',
          },
        },
        { note: '$\\theta \\leftarrow \\theta - \\eta\\nabla_\\theta\\mathcal L$: every parameter steps against its own slope. This one line trains almost every model in machine learning.' },
      ],
    },

    {
      id: 'integral', number: '2.18', title: 'Adding up tiny pieces: the integral',
      goal: 'Approximate an area by thin rectangles, read $\\int_a^b f(x)\\,dx$, and say why ML needs it.',
      builds: ['gradient-descent-2d', 'sigma'],
      blocks: [
        { md: `The derivative chops change into tiny pieces. The **integral** does the opposite: it **adds up** tiny pieces. The area under a curve from $a$ to $b$ can be approximated by thin rectangles: width $\\Delta x$, height $f(x)$ at the middle of each strip. Add their areas:

$$\\text{area} \\approx \\sum_{i=1}^{n} f(x_i)\\,\\Delta x$$

More, thinner strips give a better answer, and in the limit the Σ becomes an elongated S, the **integral sign**:

$$\\int_a^b f(x)\\,dx = \\lim_{n \\to \\infty} \\sum_{i=1}^n f(x_i)\\,\\Delta x$$

The $dx$ is what's left of $\\Delta x$: "a tiny width". For $f(x) = x^2$ from 0 to 1 the strips close in on $\\frac13$.

Why ML cares: in Part 4, probabilities of continuous quantities are **areas under a curve**, and an average over a continuous distribution, $\\mathbb E[X] = \\int x\\, p(x)\\, dx$, is an integral. Whenever you see $\\int$ in a paper, read it as "a Σ over infinitely many, infinitely thin pieces". (And the two operations undo each other: the slope of the area-so-far is the curve's height. That is the **fundamental theorem of calculus**.)` },
        { figure: 'AreaFig', caption: 'More strips, thinner strips: the total closes in on the true area.' },
        {
          code: {
            file: 'calculus.py', fn: 'area', notes: [
              ['def area(f, a, b, n=100):', ['`n` strips from `a` to `b`.']],
              ['width = (b - a) / n', ['$\\Delta x$.'], { calc: q => [`(${q.b} − ${q.a}) / ${q.n}`, (q.b - q.a) / q.n] }],
              ['s = 0.0', ['Running total.']],
              ['for i in range(n):', ['Each strip…']],
              ['s += f(a + (i + 0.5) * width) * width', ['…height at its middle, times its width.'], { tex: 's \\mathrel{+}= f(x_i)\\,\\Delta x' }],
              ['return s', ['The area, approximately: $\\int_a^b f(x)\\,dx$.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'With 10 strips, what does the sum give for the area under $x^2$ from 0 to 1? (4 decimals)',
            answer: area(x => x * x, 0, 1, 10), tolerance: 0.00006, compute: () => area(x => x * x, 0, 1, 10),
            explain: `${f(area(x => x * x, 0, 1, 10))}, already close to the exact $\\frac13 = 0.3333$.`,
          },
        },
        { note: '$\\int_a^b f(x)\\,dx$: the area under $f$, the limit of $\\sum f(x_i)\\Delta x$. Read $\\int$ as a continuous Σ. Derivatives and integrals undo each other.' },
      ],
    },
  ],
}
