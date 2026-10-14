// Part 2 exercises: the falling ball, then calculus, each idea written as code you could check by hand.
import { checks, py } from './checks.js'

// The ball of Part 2, as every exercise below defines it.
const BALL = py`def height(t):
    return 20 - 5 * t * t
`

export const EXERCISES = {
  observe: {
    prompt: py`The ball starts 20 m up and its height after $t$ seconds is \`height(t)\` (already written). Write \`heights(times)\`, the list of heights at the given times, and \`always_falling(hs)\`, true when every height in the list is lower than the one before it.`,
    starter: BALL + py`
def heights(times):
    ...

def always_falling(hs):
    ...
`,
    solution: BALL + py`
def heights(times):
    return [height(t) for t in times]

def always_falling(hs):
    return all(b < a for a, b in zip(hs, hs[1:]))
`,
    checks: checks(py`
expect(heights([0, 1, 2]), [20, 15, 0], "heights([0, 1, 2])")
expect(always_falling(heights([0, 0.5, 1, 1.5, 2])), True, "always_falling(heights at 0, 0.5, 1, 1.5, 2)")
expect(always_falling([20, 15, 15, 0]), False, "always_falling([20, 15, 15, 0]) (a pause is not a fall)")
expect(always_falling([5, 8]), False, "always_falling([5, 8])")
`),
    hints: ['Pair each height with the next one: `zip(hs, hs[1:])`.'],
  },

  measure: {
    prompt: py`A sensor reports time in **milliseconds**, but \`height\` expects **seconds**. Write \`height_at_ms(ms)\`, which converts and returns the height in metres, and \`describe(t)\`, which returns a string like \`"1.5 s: 8.75 m"\` (the number then its unit, for both).`,
    starter: BALL + py`
def height_at_ms(ms):
    ...

def describe(t):
    ...
`,
    solution: BALL + py`
def height_at_ms(ms):
    return height(ms / 1000)

def describe(t):
    return f"{t} s: {height(t)} m"
`,
    checks: checks(py`
expect(height_at_ms(1000), 15, "height_at_ms(1000)")
expect(height_at_ms(1500), 8.75, "height_at_ms(1500)")
expect(height_at_ms(0), 20, "height_at_ms(0)")
expect(describe(1.5), "1.5 s: 8.75 m", "describe(1.5)")
`),
    hints: ['There are 1000 milliseconds in a second.', 'An f-string: `f"{t} s: {height(t)} m"`.'],
  },

  record: {
    prompt: py`Write \`record(step, end)\`: a table of \`(t, height(t))\` rows for $t = 0, \text{step}, 2\,\text{step}, \dots$ up to and including \`end\`. Compute each time as $k \times \text{step}$ rather than adding \`step\` repeatedly: adding 0.1 ten times in floating point does not give exactly 1.0, and the checks will notice.`,
    starter: BALL + py`
def record(step, end):
    ...
`,
    solution: BALL + py`
def record(step, end):
    rows = []
    k = 0
    while k * step <= end + 1e-12:
        t = k * step
        rows.append((t, height(t)))
        k = k + 1
    return rows
`,
    checks: checks(py`
expect(record(0.5, 2), [(0, 20), (0.5, 18.75), (1, 15), (1.5, 8.75), (2, 0)], "record(0.5, 2)")
r = record(0.1, 1)
expect(len(r), 11, "len(record(0.1, 1))")
assert r[-1][0] == 1.0 or abs(r[-1][0] - 1.0) < 1e-12, f"the last time should be 1.0, got {r[-1][0]!r}"
assert r[3][0] == 3 * 0.1, f"row 3's time should be 3 * 0.1 = {3 * 0.1!r}, got {r[3][0]!r}: compute k * step, don't keep adding"
`),
    hints: ['Loop over a whole-number counter `k` and set `t = k * step`.', '`k * step` can land a hair above `end` (0.30000000000000004); compare against `end` plus a tiny allowance.'],
  },

  graph: {
    prompt: py`A point on the graph is $(t, h(t))$. Write \`point(t)\`, which returns that tuple, and the reverse, \`time_at(h)\`: **when** is the ball at height $h$? Solve $20 - 5t^2 = h$ for $t \ge 0$ by hand first, then code it with \`math.sqrt\`.`,
    starter: BALL + py`import math

def point(t):
    ...

def time_at(h):
    ...
`,
    solution: BALL + py`import math

def point(t):
    return (t, height(t))

def time_at(h):
    return math.sqrt((20 - h) / 5)
`,
    checks: checks(py`
expect(point(1), (1, 15), "point(1)")
expect(time_at(15), 1, "time_at(15)")
expect(time_at(0), 2, "time_at(0)")
expect(time_at(20), 0, "time_at(20)")
for t in [0.3, 1.2, 1.9]:
    expect(time_at(height(t)), t, f"time_at(height({t}))")
`),
    hints: ['$20 - 5t^2 = h$ gives $5t^2 = 20 - h$, so $t^2 = (20 - h)/5$.'],
  },

  change: {
    prompt: py`Change is **ending minus starting**. Write \`change(start, end)\`, then \`changes(values)\`, the list of changes between each value and the next. Check your understanding: starting value plus every change must give the final value.`,
    starter: py`def change(start, end):
    ...

def changes(values):
    ...
`,
    solution: py`def change(start, end):
    return end - start

def changes(values):
    return [change(a, b) for a, b in zip(values, values[1:])]
`,
    checks: checks(py`
expect(change(15, 0), -15, "change(15, 0)")
expect(change(0, 15), 15, "change(0, 15)")
hs = [20, 18.75, 15, 8.75, 0]
expect(changes(hs), [-1.25, -3.75, -6.25, -8.75], "changes(heights every half second)")
expect(hs[0] + sum(changes(hs)), hs[-1], "start + sum of changes")
`),
    hints: ['`end - start`, not the other way round: a fall is a negative change.'],
  },

  rate: {
    prompt: py`Write \`average_velocity(f, t0, t1)\`: the change in $f$ divided by the time taken. Then write \`speeding_up(f, times)\`: true when the average velocity over each interval between consecutive times is more negative than over the one before (the ball falls faster and faster).`,
    starter: BALL + py`
def average_velocity(f, t0, t1):
    ...

def speeding_up(f, times):
    ...
`,
    solution: BALL + py`
def average_velocity(f, t0, t1):
    return (f(t1) - f(t0)) / (t1 - t0)

def speeding_up(f, times):
    vs = [average_velocity(f, a, b) for a, b in zip(times, times[1:])]
    return all(b < a for a, b in zip(vs, vs[1:]))
`,
    checks: checks(py`
expect(average_velocity(height, 1, 2), -15, "average_velocity(height, 1, 2)")
expect(average_velocity(height, 0, 1), -5, "average_velocity(height, 0, 1)")
expect(average_velocity(height, 1, 1.5), -12.5, "average_velocity(height, 1, 1.5)")
expect(speeding_up(height, [0, 0.5, 1, 1.5, 2]), True, "speeding_up(height, every half second)")
expect(speeding_up(lambda t: 20 - 3 * t, [0, 1, 2]), False, "speeding_up(a steady fall)")
`),
    hints: ['Change in height over change in time: `(f(t1) - f(t0)) / (t1 - t0)`.'],
  },

  slope: {
    prompt: py`Write \`slope(p, q)\` for two points \`(x, y)\`: rise over run. Then \`line_through(p, q)\`, which returns $(m, c)$ for the line $y = mx + c$ through both points. Solve for $c$ by putting one point into $y = mx + c$.`,
    starter: py`def slope(p, q):
    ...

def line_through(p, q):
    ...
`,
    solution: py`def slope(p, q):
    return (q[1] - p[1]) / (q[0] - p[0])

def line_through(p, q):
    m = slope(p, q)
    return m, p[1] - m * p[0]
`,
    checks: checks(py`
expect(slope((1, 15), (2, 0)), -15, "slope((1, 15), (2, 0))")
expect(slope((0, 1), (4, 9)), 2, "slope((0, 1), (4, 9))")
expect(line_through((0, 1), (4, 9)), (2, 1), "line_through((0, 1), (4, 9))")
expect(line_through((2, 5), (4, 4)), (-0.5, 6), "line_through((2, 5), (4, 4))")
`),
    hints: ['Rise is the change in $y$; run is the change in $x$.', 'From $y = mx + c$: $c = y - mx$, using either point.'],
  },

  instant: {
    prompt: py`Write \`closing_in(f, x)\`: the list of average rates of $f$ over $[x, x + h]$ for $h = 1, 0.1, 0.01, \dots, 10^{-6}$ (seven values). For the ball at $t = 1$ they close in on $-10$. Then write \`gap(f, x, h, limit)\`, the distance between one average rate and the value it closes in on; the checks confirm that each tenfold smaller $h$ gives a tenfold smaller gap for the ball.`,
    starter: BALL + py`
def closing_in(f, x):
    ...

def gap(f, x, h, limit):
    ...
`,
    solution: BALL + py`
def closing_in(f, x):
    return [(f(x + 10.0 ** -k) - f(x)) / 10.0 ** -k for k in range(7)]

def gap(f, x, h, limit):
    return abs((f(x + h) - f(x)) / h - limit)
`,
    checks: checks(py`
rates = closing_in(height, 1)
expect(len(rates), 7, "len(closing_in(height, 1))")
expect(rates[0], -15, "the rate over [1, 2]")
expect(rates[1], -10.5, "the rate over [1, 1.1]", tol=1e-9)
expect(rates[-1], -10, "the rate over [1, 1.000001]", tol=1e-4)
expect(gap(height, 1, 0.1, -10), 0.5, "gap(height, 1, 0.1, -10)", tol=1e-9)
expect(gap(height, 1, 0.01, -10) * 10, gap(height, 1, 0.1, -10), "10 × gap at h = 0.01, compared with the gap at h = 0.1", tol=1e-6)
`),
    hints: ['$h = 10^{-k}$ for $k = 0, 1, \\dots, 6$: `10.0 ** -k`.', 'For this ball the gap is exactly $5h$: the algebra of the next lesson shows why.'],
  },

  derivative: {
    prompt: py`The lab's \`derivative\` uses an interval **centred** on $x$: $\frac{f(x+h) - f(x-h)}{2h}$. Write \`forward(f, x, h)\`, the one-sided version $\frac{f(x+h) - f(x)}{h}$, and \`centred(f, x, h)\`. For $f(x) = x^3$ at $x = 2$ (exact slope 12), compare their errors at $h = 0.01$: store the two errors in \`forward_error\` and \`centred_error\`. Which shrinks faster?`,
    starter: py`def forward(f, x, h):
    ...

def centred(f, x, h):
    ...

cube = lambda x: x ** 3
forward_error = None
centred_error = None
`,
    solution: py`def forward(f, x, h):
    return (f(x + h) - f(x)) / h

def centred(f, x, h):
    return (f(x + h) - f(x - h)) / (2 * h)

cube = lambda x: x ** 3
forward_error = abs(forward(cube, 2, 0.01) - 12)
centred_error = abs(centred(cube, 2, 0.01) - 12)
`,
    checks: checks(py`
expect(forward(lambda x: x * x, 3, 0.1), 6.1, "forward(x², 3, 0.1)", tol=1e-9)
expect(centred(lambda x: x * x, 3, 0.1), 6.0, "centred(x², 3, 0.1)", tol=1e-9)
expect(forward_error, 0.0601, "forward_error", tol=1e-6)
expect(centred_error, 0.0001, "centred_error", tol=1e-6)
assert centred_error < forward_error / 100, "the centred error should be hundreds of times smaller"
`),
    hints: ['Expand $(2 + h)^3 = 8 + 12h + 6h^2 + h^3$ to see the forward error is $6h + h^2$.', 'For the centred version the $6h^2$ terms cancel, leaving only $h^2$.'],
  },

  'derivative-rules': {
    prompt: py`Store a polynomial as its list of coefficients, lowest power first: $3 + 2x + 5x^2$ is \`[3, 2, 5]\`. Write \`differentiate(coeffs)\` using the power rule ($x^n \to n x^{n-1}$), the constant-multiple rule and the sum rule, and \`evaluate(coeffs, x)\`. The checks compare your derivative with a numerical one.`,
    starter: py`def differentiate(coeffs):
    ...

def evaluate(coeffs, x):
    ...
`,
    solution: py`def differentiate(coeffs):
    return [n * a for n, a in enumerate(coeffs)][1:]

def evaluate(coeffs, x):
    return sum(a * x ** n for n, a in enumerate(coeffs))
`,
    checks: checks(py`
expect(differentiate([3, 2, 5]), [2, 10], "differentiate([3, 2, 5])  (3 + 2x + 5x²)")
expect(differentiate([7]), [], "differentiate([7]) (a constant)")
expect(differentiate([0, 0, 0, 1]), [0, 0, 3], "differentiate([0, 0, 0, 1])  (x³)")
expect(evaluate([3, 2, 5], 2), 27, "evaluate([3, 2, 5], 2)")
p = [1, -4, 0, 2, -1]
for x in [-1.5, 0.5, 2]:
    numeric = (evaluate(p, x + 1e-6) - evaluate(p, x - 1e-6)) / 2e-6
    expect(evaluate(differentiate(p), x), numeric, f"the derivative of {p} at {x}", tol=1e-6)
`),
    hints: ['The coefficient of $x^n$ is `coeffs[n]`; `enumerate` gives you `n` and the coefficient together.', 'Each term $a x^n$ becomes $na x^{n-1}$: multiply by its power, then shift every coefficient down one place.'],
  },

  'exp-log-slopes': {
    prompt: py`The slope of $e^x$ at $x$ is $e^x \cdot \frac{e^h - 1}{h}$ for small $h$: the factor $\frac{e^h - 1}{h}$ doesn't depend on $x$. Write \`factor(h)\` for it and confirm it approaches 1. Then write \`ln_slope(x, h)\`, a centred numerical slope of \`math.log\` at $x$, and set \`matches\` to true when it agrees with $1/x$ to 6 decimal places at every $x$ in \`[0.5, 1, 2, 10]\`.`,
    starter: py`import math

def factor(h):
    ...

def ln_slope(x, h=1e-5):
    ...

matches = None
`,
    solution: py`import math

def factor(h):
    return (math.exp(h) - 1) / h

def ln_slope(x, h=1e-5):
    return (math.log(x + h) - math.log(x - h)) / (2 * h)

matches = all(abs(ln_slope(x) - 1 / x) < 1e-6 for x in [0.5, 1, 2, 10])
`,
    checks: checks(py`
expect(factor(1), math.e - 1, "factor(1)")
expect(factor(1e-6), 1, "factor(1e-6)", tol=1e-5)
assert abs(factor(0.01) - 1) < abs(factor(0.1) - 1), "factor(h) should get closer to 1 as h shrinks"
expect(ln_slope(4), 0.25, "ln_slope(4)", tol=1e-8)
expect(matches, True, "matches")
`),
    hints: ['`math.exp(h)` is $e^h$.', 'A centred slope: `(math.log(x + h) - math.log(x - h)) / (2 * h)`.'],
  },

  'chain-rule': {
    prompt: py`Write \`chain(f_slope, g, g_slope)\`, which returns a **function** giving the slope of $f(g(x))$ by the chain rule: $f'(g(x)) \cdot g'(x)$. Use it to build \`sigmoid_slope\` from $\sigma(z) = 1/u$ with $u = 1 + e^{-z}$, and check it equals $\sigma(z)(1 - \sigma(z))$.`,
    starter: py`import math

def chain(f_slope, g, g_slope):
    ...

def sigmoid(z):
    return 1 / (1 + math.exp(-z))

# σ(z) = outer(inner(z)), with inner(z) = 1 + e^(−z) and outer(u) = 1/u
inner = lambda z: 1 + math.exp(-z)
inner_slope = None   # the slope of 1 + e^(−z)
outer_slope = None   # the slope of 1/u
sigmoid_slope = None
`,
    solution: py`import math

def chain(f_slope, g, g_slope):
    return lambda x: f_slope(g(x)) * g_slope(x)

def sigmoid(z):
    return 1 / (1 + math.exp(-z))

inner = lambda z: 1 + math.exp(-z)
inner_slope = lambda z: -math.exp(-z)
outer_slope = lambda u: -1 / u ** 2
sigmoid_slope = chain(outer_slope, inner, inner_slope)
`,
    checks: checks(py`
sq = chain(lambda u: 2 * u, lambda x: 3 * x + 1, lambda x: 3)
expect(sq(2), 42, "chain for (3x + 1)² at x = 2")
expect(inner_slope(0), -1, "inner_slope(0)")
expect(outer_slope(2), -0.25, "outer_slope(2)")
for z in [-3, 0, 0.7, 4]:
    s = sigmoid(z)
    expect(sigmoid_slope(z), s * (1 - s), f"sigmoid_slope({z})")
`),
    hints: ['The slope of $e^{-z}$ is $-e^{-z}$ (the chain rule again, with the inside $-z$).', 'The slope of $1/u = u^{-1}$ is $-u^{-2}$ by the power rule.'],
  },

  minimum: {
    prompt: py`For a parabola $f(x) = ax^2 + bx + c$ with $a > 0$, the slope is $2ax + b$. Write \`lowest(a, b, c)\`, which returns the $x$ where that slope is zero, and \`downhill(slope, x)\`, which returns \`-1\` if decreasing $x$ goes downhill, \`+1\` if increasing $x$ does, and \`0\` at a flat point.`,
    starter: py`def lowest(a, b, c):
    ...

def downhill(slope, x):
    ...
`,
    solution: py`def lowest(a, b, c):
    return -b / (2 * a)

def downhill(slope, x):
    s = slope(x)
    return -1 if s > 0 else 1 if s < 0 else 0
`,
    checks: checks(py`
expect(lowest(1, -6, 10), 3, "lowest(1, -6, 10)")
expect(lowest(2, 4, 0), -1, "lowest(2, 4, 0)")
s = lambda x: 2 * (x - 3)
expect(downhill(s, 5), -1, "downhill at x = 5 for a dip at 3")
expect(downhill(s, 0), 1, "downhill at x = 0 for a dip at 3")
expect(downhill(s, 3), 0, "downhill at the bottom")
`),
    hints: ['Solve $2ax + b = 0$.', 'Downhill is always **against** the slope\'s sign.'],
  },

  'gradient-descent-1d': {
    prompt: py`Write \`descend(slope, w, eta, steps)\`, returning the list of all positions $w_0, w_1, \dots$ under $w \leftarrow w - \eta f'(w)$. Then, for $f(w) = (w - 3)^2$, find by experiment the learning rates that converge: set \`converges\` to the list of rates from \`[0.1, 0.5, 0.9, 1.0, 1.1]\` whose final position after 100 steps is within 0.001 of 3. Can you explain the cut-off?`,
    starter: py`def descend(slope, w, eta, steps):
    ...

slope = lambda w: 2 * (w - 3)
converges = None
`,
    solution: py`def descend(slope, w, eta, steps):
    path = [w]
    for _ in range(steps):
        w = w - eta * slope(w)
        path.append(w)
    return path

slope = lambda w: 2 * (w - 3)
converges = [eta for eta in [0.1, 0.5, 0.9, 1.0, 1.1] if abs(descend(slope, 0, eta, 100)[-1] - 3) < 0.001]
`,
    checks: checks(py`
p = descend(lambda w: 2 * (w - 3), 0, 0.1, 3)
expect(p, [0, 0.6, 1.08, 1.464], "descend(slope, 0, 0.1, 3)", tol=1e-9)
expect(descend(lambda w: 2 * (w - 3), 0, 0.5, 1), [0, 3], "descend at eta = 0.5 (one step lands exactly)")
expect(converges, [0.1, 0.5, 0.9], "converges")
`),
    hints: ['Each step multiplies the distance to 3 by $1 - 2\\eta$.', 'That factor has size below 1 only when $0 < \\eta < 1$: at $\\eta = 1$ it bounces between 0 and 6 forever.'],
  },

  'partial-derivatives': {
    prompt: py`Write \`partial(f, point, i, h)\`: the slope of $f$ along input number \`i\` alone, holding every other input fixed (a centred difference). \`point\` is a list; \`f\` takes a list. Check it against the partial derivatives you work out by hand for $f(x, y) = x^2 y + y^3$: $\frac{\partial f}{\partial x} = 2xy$, $\frac{\partial f}{\partial y} = x^2 + 3y^2$.`,
    starter: py`def partial(f, point, i, h=1e-5):
    ...
`,
    solution: py`def partial(f, point, i, h=1e-5):
    up = list(point)
    down = list(point)
    up[i] += h
    down[i] -= h
    return (f(up) - f(down)) / (2 * h)
`,
    checks: checks(py`
f = lambda p: p[0] ** 2 * p[1] + p[1] ** 3
for x, y in [(1, 2), (-2, 0.5), (3, -1)]:
    expect(partial(f, [x, y], 0), 2 * x * y, f"∂f/∂x at ({x}, {y})", tol=1e-6)
    expect(partial(f, [x, y], 1), x * x + 3 * y * y, f"∂f/∂y at ({x}, {y})", tol=1e-6)
pt = [1.0, 2.0]
partial(f, pt, 0)
expect(pt, [1.0, 2.0], "the point after calling partial (it must not be changed)")
`),
    hints: ['Copy the point twice, nudge only entry `i` up in one copy and down in the other.', 'Don\'t change the caller\'s list: `list(point)` makes a copy.'],
  },

  gradient: {
    prompt: py`Write \`gradient(f, point)\`: the list of all partial derivatives (centred differences). Then write \`uphill_check(f, point)\`: take a tiny step of length 0.001 along the normalised gradient and along 50 other random unit directions; return true if no other direction raises $f$ more than the gradient's direction does. (\`random\` and \`math\` are available.)`,
    starter: py`import math, random

def gradient(f, point, h=1e-5):
    ...

def uphill_check(f, point, seed=0):
    ...
`,
    solution: py`import math, random

def gradient(f, point, h=1e-5):
    g = []
    for i in range(len(point)):
        up, down = list(point), list(point)
        up[i] += h
        down[i] -= h
        g.append((f(up) - f(down)) / (2 * h))
    return g

def uphill_check(f, point, seed=0):
    rng = random.Random(seed)
    def rise(d):
        n = math.sqrt(sum(v * v for v in d))
        return f([p + 0.001 * v / n for p, v in zip(point, d)]) - f(point)
    best = rise(gradient(f, point))
    others = [rise([rng.gauss(0, 1) for _ in point]) for _ in range(50)]
    return all(r <= best + 1e-12 for r in others)
`,
    checks: checks(py`
bowl = lambda p: (p[0] - 3) ** 2 + 2 * (p[1] + 1) ** 2
expect(gradient(bowl, [0, 0]), [-6, 4], "gradient(bowl, [0, 0])", tol=1e-6)
expect(gradient(lambda p: p[0] * p[1] * p[2], [1, 2, 3]), [6, 3, 2], "gradient(xyz, [1, 2, 3])", tol=1e-6)
expect(uphill_check(bowl, [0, 0]), True, "uphill_check(bowl, [0, 0])")
expect(uphill_check(lambda p: math.sin(p[0]) + p[0] * p[1], [0.4, -1.2]), True, "uphill_check(sin x + xy, [0.4, -1.2])")
`),
    hints: ['`gradient` is `partial` from the last lesson, once for each input.', 'Normalise a direction by dividing each entry by its length $\\sqrt{\\sum d_i^2}$, so every step has the same length.'],
  },

  'gradient-descent-2d': {
    prompt: py`Write \`descend(grad, theta, eta, steps)\` for any number of parameters: \`theta\` is a list, \`grad(theta)\` returns a list, and each step is $\theta \leftarrow \theta - \eta\nabla\mathcal L$. Return the final θ. Then minimise the stretched bowl $\mathcal L(a, b) = (a - 1)^2 + 10(b + 2)^2$: find the largest rate in \`[0.01, 0.05, 0.09, 0.11]\` that still converges, and store it in \`best_eta\`.`,
    starter: py`def descend(grad, theta, eta, steps):
    ...

grad = lambda t: [2 * (t[0] - 1), 20 * (t[1] + 2)]
best_eta = None
`,
    solution: py`def descend(grad, theta, eta, steps):
    theta = list(theta)
    for _ in range(steps):
        g = grad(theta)
        theta = [t - eta * gi for t, gi in zip(theta, g)]
    return theta

grad = lambda t: [2 * (t[0] - 1), 20 * (t[1] + 2)]
ok = [eta for eta in [0.01, 0.05, 0.09, 0.11] if all(abs(a - b) < 1e-3 for a, b in zip(descend(grad, [0, 0], eta, 2000), [1, -2]))]
best_eta = max(ok)
`,
    checks: checks(py`
expect(descend(lambda t: [2 * t[0]], [5.0], 0.25, 1), [2.5], "one step on t² from 5 at eta 0.25")
expect(descend(grad, [0, 0], 0.05, 500), [1, -2], "descend(grad, [0, 0], 0.05, 500)", tol=1e-6)
expect(best_eta, 0.09, "best_eta")
`),
    hints: ['The steep direction ($b$, curvature 20) limits the rate: each step multiplies $b + 2$ by $1 - 20\\eta$.', 'That stays below 1 in size only while $\\eta < 0.1$.'],
  },

  integral: {
    prompt: py`Write \`area(f, a, b, n)\` with $n$ rectangles whose heights are taken at the **left** edge of each slice, and \`midpoint_area\` with heights at each slice's **middle**. For $\int_0^1 x^2\,dx = \frac13$, set \`left_error\` and \`mid_error\` to the errors of each with $n = 100$. Then use \`midpoint_area\` to find how far the ball falls in its first 2 seconds from its velocity $v(t) = -10t$; store it in \`fall\` (a negative number: a change in height).`,
    starter: py`def area(f, a, b, n):
    ...

def midpoint_area(f, a, b, n):
    ...

left_error = None
mid_error = None
fall = None
`,
    solution: py`def area(f, a, b, n):
    w = (b - a) / n
    return sum(f(a + i * w) * w for i in range(n))

def midpoint_area(f, a, b, n):
    w = (b - a) / n
    return sum(f(a + (i + 0.5) * w) * w for i in range(n))

sq = lambda x: x * x
left_error = abs(area(sq, 0, 1, 100) - 1 / 3)
mid_error = abs(midpoint_area(sq, 0, 1, 100) - 1 / 3)
fall = midpoint_area(lambda t: -10 * t, 0, 2, 100)
`,
    checks: checks(py`
expect(area(lambda x: 1, 0, 3, 10), 3, "area of height 1 from 0 to 3")
expect(area(lambda x: x, 0, 1, 4), 0.375, "area(x, 0, 1, 4) with left edges")
expect(left_error, 0.004983333, "left_error", tol=1e-6)
expect(mid_error, 0.0000083333, "mid_error", tol=1e-6)
expect(fall, -20, "fall")
`),
    hints: ['Slice $i$ starts at $a + i w$ and its middle is at $a + (i + 0.5)w$, where $w = (b - a)/n$.', 'Adding up velocity × time slices gives the total change in height: $20 \\to 0$.'],
  },
}
