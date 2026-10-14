// Exercises for the optimisation part.
import { checks, py } from './checks.js'

export const EXERCISES = {
  convexity: {
    prompt: py`Write \`is_convex_on(f, lo, hi, n)\` by checking the chord condition on a grid of pairs and the weights 0.25, 0.5, 0.75, and \`second_derivative_test(f, lo, hi, n)\`: true if a numerical $f''$ is $\ge -10^{-6}$ at every grid point. The checks run both on several functions, including the logistic loss $\ln(1 + e^{-z})$ and a two-valley function.`,
    starter: py`import math

def is_convex_on(f, lo, hi, n=30):
    ...

def second_derivative_test(f, lo, hi, n=200, h=1e-4):
    ...
`,
    solution: py`import math

def is_convex_on(f, lo, hi, n=30):
    xs = [lo + (hi - lo) * i / n for i in range(n + 1)]
    for a in xs:
        for b in xs:
            for t in (0.25, 0.5, 0.75):
                if f(t * a + (1 - t) * b) > t * f(a) + (1 - t) * f(b) + 1e-12:
                    return False
    return True

def second_derivative_test(f, lo, hi, n=200, h=1e-4):
    for i in range(n + 1):
        x = lo + (hi - lo) * i / n
        if (f(x + h) - 2 * f(x) + f(x - h)) / (h * h) < -1e-6:
            return False
    return True
`,
    checks: checks(py`
logistic = lambda z: math.log(1 + math.exp(-z))
two_valleys = lambda x: (x * x - 1) ** 2
for name, f, want in [("x²", lambda x: x * x, True), ("|x|", abs, True), ("logistic loss", logistic, True), ("sin", math.sin, False), ("two valleys", two_valleys, False)]:
    expect(is_convex_on(f, -2, 2), want, f"is_convex_on({name})")
for name, f, want in [("e^x", math.exp, True), ("logistic loss", logistic, True), ("two valleys", two_valleys, False)]:
    expect(second_derivative_test(f, -2, 2), want, f"second_derivative_test({name})")
`),
    hints: ['The chord condition: $f(ta + (1-t)b) \\le tf(a) + (1-t)f(b)$, with a hair of tolerance.', '$|x|$ has no second derivative at 0, so test it only with the chord check.'],
  },

  'gd-convergence': {
    prompt: py`Verify the descent lemma numerically. Write \`gd(grad, x, eta, steps)\`, then \`lemma_holds(f, grad, L, eta, points)\`: true if at every point the actual drop $f(x) - f(x - \eta g)$ is at least $\eta(1 - \frac{L\eta}2)g^2$. Then, on the bowl $f = \frac12(x^2 + 25y^2)$ ($L = 25$, $\mu = 1$), set \`steps_needed\` to the number of steps with $\eta = 1/L$ until $\|\mathbf x\| < 10^{-3}$, starting from $(1, 1)$, and compare with the rate $(1 - \mu/L)^t$.`,
    starter: py`import math

def gd(grad, x, eta, steps):
    ...

def lemma_holds(f, grad, L, eta, points):
    ...

steps_needed = None
`,
    solution: py`import math

def gd(grad, x, eta, steps):
    path = [x]
    for _ in range(steps):
        x = x - eta * grad(x)
        path.append(x)
    return path

def lemma_holds(f, grad, L, eta, points):
    for x in points:
        g = grad(x)
        if f(x) - f(x - eta * g) < eta * (1 - L * eta / 2) * g * g - 1e-12:
            return False
    return True

x, y, steps_needed = 1.0, 1.0, 0
while math.hypot(x, y) >= 1e-3:
    x, y = x - x / 25, y - 25 * y / 25
    steps_needed += 1
`,
    checks: checks(py`
f = lambda x: x * x / 2 + math.sin(3 * x) / 30
df = lambda x: x + math.cos(3 * x) / 10
L = 1 + 0.3
pts = [i / 10 for i in range(-30, 31)]
for eta in (0.1, 0.5, 1 / L, 1.5):
    expect(lemma_holds(f, df, L, eta, pts), True, f"the descent lemma with η = {eta}")
expect(gd(lambda x: 2 * x, 1.0, 0.25, 2), [1.0, 0.5, 0.25], "gd on x² with η = 0.25")
expect(steps_needed, math.ceil(math.log(1e-3) / math.log(1 - 1 / 25)), "steps_needed (the rate (1 − μ/L)ᵗ)")
`),
    hints: ['With $\\eta = 1/L = 1/25$, the steep coordinate is solved in one step and the gentle one shrinks by $1 - 1/25$ each step.'],
  },

  newton: {
    prompt: py`Write \`newton(f1, f2, x, steps)\` (return the path) and \`digits_correct(x, true)\` $= -\log_{10}|x - \text{true}|$. Use Newton to find $\sqrt{10}$ as the root of $x^2 - 10$ from $x = 3$: the checks confirm the correct digits roughly **double** each step. Then compare with gradient descent on $f = (x - 2)^4 + x^2$: store in \`gd_steps\` how many gradient-descent steps (η = 0.05, from 0) it takes to get $|f'| < 10^{-8}$.`,
    starter: py`import math

def newton(f1, f2, x, steps):
    ...

def digits_correct(x, true):
    ...

gd_steps = None
`,
    solution: py`import math

def newton(f1, f2, x, steps):
    path = [x]
    for _ in range(steps):
        x = x - f1(x) / f2(x)
        path.append(x)
    return path

def digits_correct(x, true):
    err = abs(x - true)
    return 16.0 if err == 0 else -math.log10(err)

x, gd_steps = 0.0, 0
d = lambda t: 4 * (t - 2) ** 3 + 2 * t
while abs(d(x)) >= 1e-8:
    x -= 0.05 * d(x)
    gd_steps += 1
`,
    checks: checks(py`
path = newton(lambda x: x * x - 10, lambda x: 2 * x, 3.0, 4)
digits = [digits_correct(x, math.sqrt(10)) for x in path]
assert digits[2] > 1.7 * digits[1] and digits[3] > 1.7 * digits[2] or digits[3] >= 15, f"digits should roughly double: {[round(d, 1) for d in digits]}"
expect(path[-1], math.sqrt(10), "Newton's √10 after 4 steps", tol=1e-14)
n = newton(lambda x: 4 * (x - 2) ** 3 + 2 * x, lambda x: 12 * (x - 2) ** 2 + 2, 0.0, 8)
assert abs(4 * (n[-1] - 2) ** 3 + 2 * n[-1]) < 1e-8, "Newton should find the minimum of (x − 2)⁴ + x² in 8 steps"
assert gd_steps > 20, f"gradient descent needs many more steps: {gd_steps}"
`),
    hints: ['To find a root of $g$, pass $g$ as `f1` and $g\'$ as `f2`.'],
  },

  sgd: {
    prompt: py`Show that a random example's gradient is unbiased and that minibatches cut its variance. For the model $y \approx wx$ on the given data, write \`example_grad(w, i)\`, \`full_grad(w)\`, and \`batch_grad_stats(w, B, trials, seed)\`: draw \`trials\` random minibatches of size $B$ (with replacement), and return the mean and variance of their gradients. The checks confirm the mean matches the full gradient and the variance falls like $1/B$.`,
    starter: py`import random

XS = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0]
YS = [2.3, 3.8, 6.4, 7.9, 9.7, 12.4, 13.8, 16.2]

def example_grad(w, i):
    ...

def full_grad(w):
    ...

def batch_grad_stats(w, B, trials=20000, seed=0):
    ...
`,
    solution: py`import random

XS = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0]
YS = [2.3, 3.8, 6.4, 7.9, 9.7, 12.4, 13.8, 16.2]

def example_grad(w, i):
    return 2 * (w * XS[i] - YS[i]) * XS[i]

def full_grad(w):
    return sum(example_grad(w, i) for i in range(len(XS))) / len(XS)

def batch_grad_stats(w, B, trials=20000, seed=0):
    rng = random.Random(seed)
    gs = []
    for _ in range(trials):
        idx = [rng.randrange(len(XS)) for _ in range(B)]
        gs.append(sum(example_grad(w, i) for i in idx) / B)
    m = sum(gs) / len(gs)
    return m, sum((g - m) ** 2 for g in gs) / len(gs)
`,
    checks: checks(py`
w = 1.0
m1, v1 = batch_grad_stats(w, 1)
m8, v8 = batch_grad_stats(w, 8)
expect(m1, full_grad(w), "the mean of single-example gradients", tol=0.03)
expect(m8, full_grad(w), "the mean of batch-8 gradients", tol=0.03)
expect(v1 / v8, 8, "the variance ratio between batch 1 and batch 8", tol=0.08)
`),
    hints: ['Drawing indices with `rng.randrange(len(XS))` makes each example equally likely: exactly the unbiasedness argument.'],
  },

  'momentum-math': {
    prompt: py`Write \`momentum(grad, x, eta, beta, steps)\` for vectors (lists), and \`effective_velocity(beta, t)\` $= \sum_{k=0}^{t-1}\beta^k$, the velocity after $t$ equal unit gradients. Then compare on the narrow valley $f = \frac12(x^2 + 40y^2)$ from $(-9, 1)$ with $\eta = 0.018$: store the distances to the minimum after 45 steps in \`plain\` ($\beta = 0$) and \`with_momentum\` ($\beta = 0.8$).`,
    starter: py`import math

def momentum(grad, x, eta, beta, steps):
    ...

def effective_velocity(beta, t):
    ...

plain = None
with_momentum = None
`,
    solution: py`import math

def momentum(grad, x, eta, beta, steps):
    v = [0.0] * len(x)
    for _ in range(steps):
        g = grad(x)
        v = [beta * vi + gi for vi, gi in zip(v, g)]
        x = [xi - eta * vi for xi, vi in zip(x, v)]
    return x

def effective_velocity(beta, t):
    return sum(beta ** k for k in range(t))

grad = lambda p: [p[0], 40 * p[1]]
plain = math.hypot(*momentum(grad, [-9.0, 1.0], 0.018, 0.0, 45))
with_momentum = math.hypot(*momentum(grad, [-9.0, 1.0], 0.018, 0.8, 45))
`,
    checks: checks(py`
expect(effective_velocity(0.9, 1), 1, "effective_velocity(0.9, 1)")
expect(effective_velocity(0.9, 200), 10, "effective_velocity(0.9, 200) (approaches 1/(1 − β))", tol=1e-6)
expect(effective_velocity(0.9, 5), (1 - 0.9 ** 5) / 0.1, "the geometric series formula")
assert with_momentum < plain / 5, f"momentum should get much closer: plain {plain:.4f}, momentum {with_momentum:.4f}"
`),
    hints: ['Update the velocity first ($\\mathbf v \\leftarrow \\beta\\mathbf v + \\mathbf g$), then move by $\\eta\\mathbf v$.'],
  },

  lagrange: {
    prompt: py`Check Lagrange's condition numerically. Write \`best_on_circle(f, n)\` by searching angles, and \`parallel_gap(grad_f, grad_g, p)\`: the cross product $\partial_xf\,\partial_yg - \partial_yf\,\partial_xg$, which is 0 exactly when the gradients are parallel. Then verify the **maximum entropy** result: \`max_entropy_probs(z, c)\`: among distributions with $\sum_k p_kz_k = c$, find the max-entropy one by searching over the temperature $\tau$ in $p \propto e^{z/\tau}$ (bisection on $\tau$ to hit the average $c$).`,
    starter: py`import math

def best_on_circle(f, n=7200):
    ...

def parallel_gap(grad_f, grad_g, p):
    ...

def max_entropy_probs(z, c):
    ...
`,
    solution: py`import math

def best_on_circle(f, n=7200):
    best = None
    for i in range(n):
        t = 2 * math.pi * i / n
        p = (math.cos(t), math.sin(t))
        if best is None or f(p) < f(best):
            best = p
    return best

def parallel_gap(grad_f, grad_g, p):
    a, b = grad_f(p), grad_g(p)
    return a[0] * b[1] - a[1] * b[0]

def max_entropy_probs(z, c):
    def probs(tau):
        m = max(z)
        e = [math.exp((v - m) / tau) for v in z]
        return [x / sum(e) for x in e]
    lo, hi = 1e-3, 1e3
    for _ in range(200):
        mid = math.sqrt(lo * hi)
        avg = sum(p * v for p, v in zip(probs(mid), z))
        if avg > c:
            lo = mid
        else:
            hi = mid
    return probs(math.sqrt(lo * hi))
`,
    checks: checks(py`
f = lambda p: (p[0] - 2) ** 2 + (p[1] - 1) ** 2
p = best_on_circle(f)
expect(list(p), [2 / math.sqrt(5), 1 / math.sqrt(5)], "the closest point of the circle to (2, 1)", tol=1e-3)
gap = parallel_gap(lambda q: (2 * (q[0] - 2), 2 * (q[1] - 1)), lambda q: (2 * q[0], 2 * q[1]), p)
assert abs(gap) < 1e-2, f"at the best point the gradients should be parallel: cross product {gap}"
z = [1.0, 2.0, 4.0]
p = max_entropy_probs(z, 2.5)
expect(sum(a * b for a, b in zip(p, z)), 2.5, "the average score of the max-entropy distribution", tol=1e-6)
H = lambda q: -sum(x * math.log(x) for x in q if x > 0)
for q in ([0.25, 0.5, 0.25], [0.5, 0.0, 0.5], [0.3, 0.3, 0.35]):
    if abs(sum(a * b for a, b in zip(q, z)) - 2.5) < 1e-9:
        assert H(q) <= H(p) + 1e-9, "another distribution with the same average beat the softmax's entropy"
`),
    hints: ['Raising the temperature $\\tau$ flattens $p$ (the average moves toward the plain mean of $z$); lowering it concentrates on the top score.'],
  },

  kkt: {
    prompt: py`Write \`kkt_box(c, lo, hi)\`: minimise $(x - c)^2$ subject to $lo \le x \le hi$, returning \`(x, lam_lo, lam_hi)\` (each multiplier is 0 unless its bound binds). Then \`projected_gd(grad, project, x, eta, steps)\`, and \`check_kkt(c, lo, hi)\`: true if stationarity $2(x - c) - \lambda_{lo} + \lambda_{hi} = 0$, both multipliers $\ge 0$, and complementary slackness all hold.`,
    starter: py`def kkt_box(c, lo, hi):
    ...

def projected_gd(grad, project, x, eta, steps):
    ...

def check_kkt(c, lo, hi):
    ...
`,
    solution: py`def kkt_box(c, lo, hi):
    if c < lo:
        return lo, 2 * (lo - c), 0.0
    if c > hi:
        return hi, 0.0, 2 * (c - hi)
    return c, 0.0, 0.0

def projected_gd(grad, project, x, eta, steps):
    for _ in range(steps):
        x = project(x - eta * grad(x))
    return x

def check_kkt(c, lo, hi):
    x, a, b = kkt_box(c, lo, hi)
    stationary = abs(2 * (x - c) - a + b) < 1e-12
    feasible = lo <= x <= hi
    signs = a >= 0 and b >= 0
    slack = abs(a * (lo - x)) < 1e-12 and abs(b * (x - hi)) < 1e-12
    return stationary and feasible and signs and slack
`,
    checks: checks(py`
expect(kkt_box(3, 0, 1), (1, 0, 4), "kkt_box(3, 0, 1)")
expect(kkt_box(-2, 0, 1), (0, 4, 0), "kkt_box(−2, 0, 1)")
expect(kkt_box(0.4, 0, 1), (0.4, 0, 0), "kkt_box(0.4, 0, 1) (both slack)")
for c in (-3, -0.1, 0.5, 1.7, 5):
    expect(check_kkt(c, 0, 1), True, f"check_kkt({c}, 0, 1)")
    x = projected_gd(lambda t: 2 * (t - c), lambda t: min(max(t, 0), 1), 0.5, 0.2, 60)
    expect(x, kkt_box(c, 0, 1)[0], f"projected gradient descent for c = {c}", tol=1e-9)
`),
    hints: ['Stationarity with two bounds: $2(x - c) - \\lambda_{lo} + \\lambda_{hi} = 0$; the lower bound pushes up, the upper bound pushes down.'],
  },

  duality: {
    prompt: py`For minimise $(x - 3)^2$ subject to $x \le 1$ (so $g = x - 1 \le 0$), write \`lagrangian(x, lam)\`, \`dual(lam)\` $= \min_x$ of it (find the minimising $x$ by setting the slope to zero), and \`dual_ascent(lam, eta, steps)\`: repeatedly step $\lambda \leftarrow \max(0, \lambda + \eta\,g(x_\lambda))$, where $x_\lambda$ minimises the Lagrangian. The checks confirm weak duality for many $\lambda$, and that dual ascent finds $\lambda = 4$ with $q(4) = 4 = p^*$.`,
    starter: py`def lagrangian(x, lam):
    ...

def dual(lam):
    ...

def dual_ascent(lam, eta, steps):
    ...
`,
    solution: py`def lagrangian(x, lam):
    return (x - 3) ** 2 + lam * (x - 1)

def dual(lam):
    x = 3 - lam / 2
    return lagrangian(x, lam)

def dual_ascent(lam, eta, steps):
    for _ in range(steps):
        x = 3 - lam / 2
        lam = max(0.0, lam + eta * (x - 1))
    return lam
`,
    checks: checks(py`
p_star = 4.0
for lam in [0, 0.5, 1, 2, 3, 4, 5, 8]:
    assert dual(lam) <= p_star + 1e-12, f"weak duality failed at λ = {lam}"
expect(dual(4), p_star, "the dual at λ = 4 (strong duality)")
expect(dual_ascent(0.0, 0.5, 200), 4, "dual ascent's λ", tol=1e-9)
expect(lagrangian(1, 4), 4, "the Lagrangian at the answer")
`),
    hints: ['$\\frac{\\partial}{\\partial x}[(x - 3)^2 + \\lambda(x - 1)] = 2(x - 3) + \\lambda = 0$ gives $x = 3 - \\lambda/2$.', 'Dual ascent raises $\\lambda$ while the constraint is violated ($x > 1$).'],
  },
}
