// Exercises for the calculus additions, the many-variable lessons and the volume lessons.
import { checks, py } from './checks.js'

export const EXERCISES = {
  'limits-precise': {
    prompt: py`Play the ε–δ game in code. Write \`works(f, a, L, eps, delta)\`: true if every one of 1000 evenly spaced sample points $x$ with $0 < |x - a| < \delta$ has $|f(x) - L| < \varepsilon$. Then write \`delta_for_line(eps)\`, the δ from the lesson's proof for $3x + 1 \to 7$ as $x \to 2$, and \`N_for(eps)\`: the smallest whole $N$ such that $\frac1n < \varepsilon$ for every $n > N$.`,
    starter: py`def works(f, a, L, eps, delta):
    ...

def delta_for_line(eps):
    ...

def N_for(eps):
    ...
`,
    solution: py`def works(f, a, L, eps, delta):
    for k in range(1, 501):
        for x in (a - delta * k / 501, a + delta * k / 501):
            if not abs(f(x) - L) < eps:
                return False
    return True

def delta_for_line(eps):
    return eps / 3

def N_for(eps):
    N = 1
    while not 1 / (N + 1) < eps:
        N += 1
    return N
`,
    checks: checks(py`
line = lambda x: 3 * x + 1
for eps in (1, 0.1, 0.001):
    expect(works(line, 2, 7, eps, delta_for_line(eps)), True, f"works with δ = delta_for_line({eps})")
    expect(works(line, 2, 7, eps, 2 * delta_for_line(eps)), False, f"works with twice that δ (too generous) for ε = {eps}")
hole = lambda x: (x * x - 1) / (x - 1)
expect(works(hole, 1, 2, 0.01, 0.005), True, "the hole function near 1 (its limit is 2 although f(1) is undefined)")
expect(works(math.floor, 1, 1, 0.5, 0.001), False, "floor near 1 with L = 1 (no δ works)")
expect(N_for(0.1), 10, "N_for(0.1)")
expect(N_for(0.003), 333, "N_for(0.003)")
`),
    hints: ['Sample points at $a \\pm \\delta k/501$ for $k = 1, \\dots, 500$: never exactly $a$, always within $\\delta$.', 'For $\\frac1n < \\varepsilon$ for all $n > N$ it is enough that $\\frac{1}{N+1} < \\varepsilon$, since $\\frac1n$ only shrinks.'],
  },

  'product-quotient': {
    prompt: py`Write derivative **combinators**: \`product_rule(f, df, g, dg)\` returns a function giving $(fg)'$, and \`quotient_rule(f, df, g, dg)\` returns $(f/g)'$. Use them to build \`tanh_slope\` from $\tanh = \frac{e^z - e^{-z}}{e^z + e^{-z}}$, and \`sigmoid_slope\` from $\sigma = \frac{1}{1 + e^{-z}}$. The checks compare everything with numerical slopes.`,
    starter: py`import math

def product_rule(f, df, g, dg):
    ...

def quotient_rule(f, df, g, dg):
    ...

tanh_slope = None
sigmoid_slope = None
`,
    solution: py`import math

def product_rule(f, df, g, dg):
    return lambda x: df(x) * g(x) + f(x) * dg(x)

def quotient_rule(f, df, g, dg):
    return lambda x: (df(x) * g(x) - f(x) * dg(x)) / g(x) ** 2

top = lambda z: math.exp(z) - math.exp(-z)
bottom = lambda z: math.exp(z) + math.exp(-z)
tanh_slope = quotient_rule(top, bottom, bottom, top)
sigmoid_slope = quotient_rule(lambda z: 1.0, lambda z: 0.0, lambda z: 1 + math.exp(-z), lambda z: -math.exp(-z))
`,
    checks: checks(py`
slope = lambda f, x: (f(x + 1e-6) - f(x - 1e-6)) / 2e-6
xe = product_rule(lambda x: x, lambda x: 1.0, math.exp, math.exp)
for x in (-1, 0, 1.5):
    expect(xe(x), slope(lambda t: t * math.exp(t), x), f"(x eˣ)′ at {x}", tol=1e-6)
    expect(tanh_slope(x), 1 - math.tanh(x) ** 2, f"tanh_slope({x})", tol=1e-9)
    s = 1 / (1 + math.exp(-x))
    expect(sigmoid_slope(x), s * (1 - s), f"sigmoid_slope({x})", tol=1e-9)
q = quotient_rule(lambda x: x * x, lambda x: 2 * x, lambda x: x + 1, lambda x: 1.0)
expect(q(2.0), slope(lambda t: t * t / (t + 1), 2.0), "(x²/(x + 1))′ at 2", tol=1e-6)
`),
    hints: ['Return a `lambda x: …` that calls the four functions at `x`.', 'For tanh, the top\'s derivative is the bottom and the bottom\'s derivative is the top.'],
  },

  'inverse-derivative': {
    prompt: py`Write \`inverse(f, y, lo, hi)\`: the $x$ in $[\text{lo}, \text{hi}]$ with $f(x) = y$, for an **increasing** $f$, by **bisection** (halve the interval 100 times, keeping the half that contains the answer). Then \`inverse_slope(f, df, y, lo, hi)\` $= \frac{1}{f'(f^{-1}(y))}$. The checks compare your numerical inverse of the sigmoid with the logit $\ln\frac{p}{1-p}$, and its slope with $\frac{1}{p(1-p)}$.`,
    starter: py`import math

def inverse(f, y, lo, hi):
    ...

def inverse_slope(f, df, y, lo, hi):
    ...
`,
    solution: py`import math

def inverse(f, y, lo, hi):
    for _ in range(100):
        mid = (lo + hi) / 2
        if f(mid) < y:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2

def inverse_slope(f, df, y, lo, hi):
    return 1 / df(inverse(f, y, lo, hi))
`,
    checks: checks(py`
sig = lambda z: 1 / (1 + math.exp(-z))
dsig = lambda z: sig(z) * (1 - sig(z))
for p in (0.1, 0.5, 0.8, 0.99):
    expect(inverse(sig, p, -20, 20), math.log(p / (1 - p)), f"inverse of the sigmoid at {p}", tol=1e-9)
    expect(inverse_slope(sig, dsig, p, -20, 20), 1 / (p * (1 - p)), f"its slope at {p}", tol=1e-7)
expect(inverse(lambda x: x * x, 2.0, 0, 2), math.sqrt(2), "inverse of x² at 2")
expect(inverse_slope(math.exp, math.exp, 5.0, -10, 10), 1 / 5, "slope of ln at 5")
`),
    hints: ['If $f(\\text{mid}) < y$ the answer is to the right of mid (since $f$ increases), so move `lo` up.', 'After 100 halvings the interval is narrower than any float can tell apart.'],
  },

  'second-derivative': {
    prompt: py`Write \`second_derivative(f, x, h)\` with the second difference, and \`classify(f, critical_points)\`: for each $x$ where $f'(x) = 0$, return \`"min"\`, \`"max"\` or \`"unknown"\` from the sign of $f''(x)$ (treat $|f''| < 10^{-3}$ as zero). Then, for the bowl $f(w) = 7w^2$, set \`max_rate\` to the largest safe learning rate $2/f''$ computed from your numerical $f''$.`,
    starter: py`def second_derivative(f, x, h=1e-4):
    ...

def classify(f, critical_points):
    ...

max_rate = None
`,
    solution: py`def second_derivative(f, x, h=1e-4):
    return (f(x + h) - 2 * f(x) + f(x - h)) / (h * h)

def classify(f, critical_points):
    out = []
    for x in critical_points:
        c = second_derivative(f, x)
        out.append("min" if c > 1e-3 else "max" if c < -1e-3 else "unknown")
    return out

max_rate = 2 / second_derivative(lambda w: 7 * w * w, 0.5)
`,
    checks: checks(py`
expect(second_derivative(lambda x: x ** 3, 2), 12, "second_derivative(x³, 2)", tol=1e-5)
expect(second_derivative(math.exp, 1), math.e, "second_derivative(eˣ, 1)", tol=1e-5)
expect(classify(lambda x: x ** 3 - 3 * x, [1, -1]), ["min", "max"], "classify x³ − 3x at 1 and −1")
expect(classify(lambda x: x ** 4, [0]), ["unknown"], "classify x⁴ at 0 (f″ = 0 there)")
expect(max_rate, 2 / 14, "max_rate", tol=1e-6)
`),
    hints: ['The curvature of $7w^2$ is $14$ everywhere.'],
  },

  'fundamental-theorem': {
    prompt: py`Write \`antiderivative(coeffs)\` for a polynomial (coefficients lowest power first; the constant term of the result is 0) and \`exact_area(coeffs, a, b)\` by $F(b) - F(a)$. Then use it for a **continuous expectation**: \`mean_of_density(coeffs, a, b)\` $= \int_a^b x\,p(x)\,dx$ for a polynomial density $p$ on $[a, b]$ (multiply the polynomial by $x$ first: shift the coefficients).`,
    starter: py`def evaluate(coeffs, x):
    return sum(c * x ** n for n, c in enumerate(coeffs))

def antiderivative(coeffs):
    ...

def exact_area(coeffs, a, b):
    ...

def mean_of_density(coeffs, a, b):
    ...
`,
    solution: py`def evaluate(coeffs, x):
    return sum(c * x ** n for n, c in enumerate(coeffs))

def antiderivative(coeffs):
    return [0.0] + [c / (n + 1) for n, c in enumerate(coeffs)]

def exact_area(coeffs, a, b):
    F = antiderivative(coeffs)
    return evaluate(F, b) - evaluate(F, a)

def mean_of_density(coeffs, a, b):
    return exact_area([0.0] + list(coeffs), a, b)
`,
    checks: checks(py`
expect(antiderivative([3, 2, 5]), [0, 3, 1, 5 / 3], "antiderivative([3, 2, 5])")
expect(exact_area([0, 0, 1], 0, 1), 1 / 3, "∫₀¹ x² dx")
expect(exact_area([0, -2, 1], 0, 3), 0, "∫₀³ (x² − 2x) dx (signed areas cancel)", tol=1e-12)
expect(exact_area([0, 1], -1, 1), 0, "∫ x dx from −1 to 1")
expect(mean_of_density([0.5], 0, 2), 1, "the mean of the uniform density ½ on [0, 2]")
expect(exact_area([0, 2], 0, 1), 1, "the density 2x on [0, 1] has total area 1")
expect(mean_of_density([0, 2], 0, 1), 2 / 3, "the mean of the density 2x on [0, 1]")
`),
    hints: ['Multiplying a polynomial by $x$ raises every power by one: put a 0 at the front of the list.'],
  },

  'integration-techniques': {
    prompt: py`Check the techniques numerically. Write \`strips(f, a, b, n)\` (midpoint sum). Then fill in the exact answers you get **by hand** with the two techniques, as Python expressions using \`math\`: \`by_parts\` $= \int_0^1 x e^x\,dx$, \`by_parts_log\` $= \int_1^e \ln x\,dx$ (take $u = \ln x$, $v' = 1$), \`by_substitution\` $= \int_0^1 2x\,e^{x^2}dx$. Finally \`variance\` $= \int_{-10}^{10} z^2\varphi(z)\,dz$ with strips, where $\varphi(z) = e^{-z^2/2}/\sqrt{2\pi}$.`,
    starter: py`import math

def strips(f, a, b, n=10000):
    ...

by_parts = None
by_parts_log = None
by_substitution = None
variance = None
`,
    solution: py`import math

def strips(f, a, b, n=10000):
    w = (b - a) / n
    return sum(f(a + (i + 0.5) * w) for i in range(n)) * w

by_parts = 1.0
by_parts_log = 1.0
by_substitution = math.e - 1
phi = lambda z: math.exp(-z * z / 2) / math.sqrt(2 * math.pi)
variance = strips(lambda z: z * z * phi(z), -10, 10)
`,
    checks: checks(py`
expect(strips(lambda x: x, 0, 2), 2, "strips(x, 0, 2)")
expect(by_parts, strips(lambda x: x * math.exp(x), 0, 1), "by_parts", tol=1e-7)
expect(by_parts_log, strips(math.log, 1, math.e), "by_parts_log", tol=1e-7)
expect(by_substitution, strips(lambda x: 2 * x * math.exp(x * x), 0, 1), "by_substitution", tol=1e-7)
expect(variance, 1, "variance", tol=1e-9)
`),
    hints: ['$\\int x e^x = xe^x - e^x$; from 0 to 1 that is $e - e - (0 - 1) = 1$.', '$\\int \\ln x\\,dx = x\\ln x - x$.', 'With $u = x^2$: $\\int 2x e^{x^2}dx = e^{x^2}$.'],
  },

  taylor: {
    prompt: py`Write \`taylor(derivatives, a, x)\` from the list $f(a), f'(a), f''(a), \dots$. Then find, for $e^x$ at $x = 2$, the smallest degree \`n_needed\` whose **proved bound** $e^{|x|}\frac{|x|^{n+1}}{(n+1)!}$ is below $10^{-6}$, and confirm the true error is below it. Finally write \`log1p_approx(x)\`, the degree-2 Taylor polynomial of $\ln(1 + x)$ at 0.`,
    starter: py`import math

def taylor(derivatives, a, x):
    ...

n_needed = None

def log1p_approx(x):
    ...
`,
    solution: py`import math

def taylor(derivatives, a, x):
    total, factor = 0.0, 1.0
    for k, d in enumerate(derivatives):
        total += d * factor
        factor *= (x - a) / (k + 1)
    return total

n_needed = 0
while math.exp(2) * 2 ** (n_needed + 1) / math.factorial(n_needed + 1) >= 1e-6:
    n_needed += 1

def log1p_approx(x):
    return taylor([0.0, 1.0, -1.0], 0.0, x)
`,
    checks: checks(py`
expect(taylor([1, 1, 1], 0, 0.5), 1.625, "taylor([1, 1, 1], 0, 0.5)")
expect(taylor([5], 3, 100), 5, "a degree-0 Taylor polynomial is constant")
expect(taylor([0, 1, 0, -1, 0, 1], 0, 0.3), math.sin(0.3), "sin from its derivatives 0, 1, 0, −1, 0, 1", tol=1e-5)
expect(n_needed, 14, "n_needed")
approx = taylor([1] * (n_needed + 1), 0, 2)
assert abs(approx - math.exp(2)) < 1e-6, f"the degree-{n_needed} error is {abs(approx - math.exp(2))}"
expect(log1p_approx(0.1), 0.1 - 0.005, "log1p_approx(0.1)")
assert abs(log1p_approx(0.01) - math.log(1.01)) < 1e-6, "the approximation should be very close for small x"
`),
    hints: ['Keep `factor` as $\\frac{(x - a)^k}{k!}$ and update it by multiplying by $\\frac{x - a}{k + 1}$.', '$\\ln(1 + x)$ at 0: value 0, slope 1, second derivative $-1$.'],
  },

  'multivariable-chain': {
    prompt: py`A small computation graph where one value is used twice: $a = x^2$, $b = a + x$, $L = a \cdot b$. Write \`forward(x)\` returning $L$, and \`backward(x)\` computing $\frac{dL}{dx}$ by **summing over paths**: $x$ reaches $L$ through $a$ directly, through $b$ directly, and through $a$ into $b$. Also write \`along_path(t)\`: $\frac{d}{dt}f(x(t), y(t))$ for $f = x^2 y$, $x = \cos t$, $y = \sin t$, via $\nabla f\cdot\mathbf x'(t)$.`,
    starter: py`import math

def forward(x):
    ...

def backward(x):
    ...

def along_path(t):
    ...
`,
    solution: py`import math

def forward(x):
    a = x * x
    b = a + x
    return a * b

def backward(x):
    a = x * x
    b = a + x
    dL_da = b
    dL_db = a
    da_dx = 2 * x
    db_da = 1.0
    db_dx = 1.0
    return dL_da * da_dx + dL_db * db_da * da_dx + dL_db * db_dx

def along_path(t):
    x, y = math.cos(t), math.sin(t)
    grad = (2 * x * y, x * x)
    velocity = (-math.sin(t), math.cos(t))
    return grad[0] * velocity[0] + grad[1] * velocity[1]
`,
    checks: checks(py`
slope = lambda f, x: (f(x + 1e-6) - f(x - 1e-6)) / 2e-6
expect(forward(2), 4 * 6, "forward(2)")
for x in (-1.5, 0.5, 2):
    expect(backward(x), slope(forward, x), f"backward({x})", tol=1e-6)
for t in (0.3, 1.0, 2.5):
    expect(along_path(t), slope(lambda s: math.cos(s) ** 2 * math.sin(s), t), f"along_path({t})", tol=1e-6)
`),
    hints: ['Three paths from $x$ to $L$: $x \\to a \\to L$, $x \\to b \\to L$, and $x \\to a \\to b \\to L$. Multiply the local rates along each, then add.', '$\\nabla(x^2y) = (2xy, x^2)$; the velocity of $(\\cos t, \\sin t)$ is $(-\\sin t, \\cos t)$.'],
  },

  jacobian: {
    prompt: py`Write \`jacobian(f, x)\` numerically (rows = outputs, columns = inputs) and \`matmul(A, B)\`. Then check the matrix chain rule: for the given \`g\` and \`h\`, the Jacobian of $h(g(\mathbf x))$ should equal $J_h(g(\mathbf x))\,J_g(\mathbf x)$. Finally write \`softmax_jacobian(p)\` from the formula $p_i(\mathbb 1[i = j] - p_j)$ and \`softmax_ce_grad(z, c)\`: the cross-entropy gradient $J^\top\mathbf g$ with $\mathbf g$ having $-1/p_c$ in slot $c$ and 0 elsewhere. The checks confirm it equals $\mathbf p - \mathbf y$.`,
    starter: py`import math

def softmax(z):
    m = max(z)
    e = [math.exp(v - m) for v in z]
    return [v / sum(e) for v in e]

g = lambda v: [v[0] * v[1], v[0] + v[1], v[1] ** 2]
h = lambda u: [u[0] + u[1] * u[2], math.exp(u[0] / 10)]

def jacobian(f, x, eps=1e-6):
    ...

def matmul(A, B):
    ...

def softmax_jacobian(p):
    ...

def softmax_ce_grad(z, c):
    ...
`,
    solution: py`import math

def softmax(z):
    m = max(z)
    e = [math.exp(v - m) for v in z]
    return [v / sum(e) for v in e]

g = lambda v: [v[0] * v[1], v[0] + v[1], v[1] ** 2]
h = lambda u: [u[0] + u[1] * u[2], math.exp(u[0] / 10)]

def jacobian(f, x, eps=1e-6):
    rows = None
    for j in range(len(x)):
        up, dn = list(x), list(x)
        up[j] += eps
        dn[j] -= eps
        col = [(a - b) / (2 * eps) for a, b in zip(f(up), f(dn))]
        if rows is None:
            rows = [[] for _ in col]
        for i, v in enumerate(col):
            rows[i].append(v)
    return rows

def matmul(A, B):
    return [[sum(A[i][k] * B[k][j] for k in range(len(B))) for j in range(len(B[0]))] for i in range(len(A))]

def softmax_jacobian(p):
    return [[p[i] * ((1.0 if i == j else 0.0) - p[j]) for j in range(len(p))] for i in range(len(p))]

def softmax_ce_grad(z, c):
    p = softmax(z)
    J = softmax_jacobian(p)
    gvec = [(-1 / p[c]) if i == c else 0.0 for i in range(len(p))]
    return [sum(J[i][j] * gvec[i] for i in range(len(p))) for j in range(len(p))]
`,
    checks: checks(py`
expect(jacobian(lambda v: [v[0] * v[1], v[0] + v[1] ** 2], [1.0, 2.0]), [[2, 1], [1, 4]], "jacobian at (1, 2)", tol=1e-6)
x = [0.7, -1.2]
expect(jacobian(lambda v: h(g(v)), x), matmul(jacobian(h, g(x)), jacobian(g, x)), "J of h∘g compared with J_h J_g", tol=1e-5)
z = [1.0, 0.5, -0.3, 2.0]
expect(softmax_jacobian(softmax(z)), jacobian(softmax, z), "softmax_jacobian compared with the numerical one", tol=1e-6)
for c in range(4):
    p = softmax(z)
    expect(softmax_ce_grad(z, c), [pi - (1 if i == c else 0) for i, pi in enumerate(p)], f"softmax_ce_grad(z, {c})", tol=1e-9)
`),
    hints: ['Build columns (one per input), then arrange them so each row is one output.', '$(J^\\top\\mathbf g)_j = \\sum_i J_{ij}\\,g_i$.'],
  },

  hessian: {
    prompt: py`Write \`hessian(f, x)\` numerically and \`eigen2(H)\` for a symmetric 2×2 matrix (from $\det(H - \lambda I) = 0$, largest first). Then \`classify(f, x)\` returns \`"min"\`, \`"max"\` or \`"saddle"\` at a flat point from the eigenvalues. The checks also confirm the least-squares Hessian is $2X^\top X$.`,
    starter: py`import math

def hessian(f, x, h=1e-4):
    ...

def eigen2(H):
    ...

def classify(f, x):
    ...
`,
    solution: py`import math

def hessian(f, x, h=1e-4):
    n = len(x)
    H = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            def at(di, dj):
                p = list(x)
                p[i] += di
                p[j] += dj
                return f(p)
            H[i][j] = (at(h, h) - at(h, -h) - at(-h, h) + at(-h, -h)) / (4 * h * h)
    return H

def eigen2(H):
    tr = H[0][0] + H[1][1]
    det = H[0][0] * H[1][1] - H[0][1] * H[1][0]
    root = math.sqrt(max(0.0, tr * tr / 4 - det))
    return tr / 2 + root, tr / 2 - root

def classify(f, x):
    big, small = eigen2(hessian(f, x))
    if small > 0:
        return "min"
    if big < 0:
        return "max"
    return "saddle"
`,
    checks: checks(py`
expect(hessian(lambda v: v[0] ** 2 * v[1] + v[1] ** 3, [1.0, 2.0]), [[4, 2], [2, 12]], "hessian of x²y + y³ at (1, 2)", tol=1e-5)
expect(eigen2([[2, 1], [1, 2]]), (3, 1), "eigen2([[2, 1], [1, 2]])")
expect(classify(lambda v: v[0] ** 2 + 3 * v[1] ** 2, [0.0, 0.0]), "min", "classify a bowl")
expect(classify(lambda v: -(v[0] ** 2) - v[1] ** 2 + v[0] * v[1], [0.0, 0.0]), "max", "classify a cap")
expect(classify(lambda v: v[0] ** 2 + 4 * v[0] * v[1] + v[1] ** 2, [0.0, 0.0]), "saddle", "classify x² + 4xy + y²")
X, y = [[1, 2], [3, 1], [0, 1]], [1, 2, 3]
loss = lambda t: sum((r[0] * t[0] + r[1] * t[1] - yi) ** 2 for r, yi in zip(X, y))
XtX2 = [[2 * sum(r[i] * r[j] for r in X) for j in range(2)] for i in range(2)]
expect(hessian(loss, [0.3, -0.7]), XtX2, "the least-squares Hessian compared with 2XᵀX", tol=1e-4)
`),
    hints: ['A mixed second difference: $\\frac{f(+,+) - f(+,-) - f(-,+) + f(-,-)}{4h^2}$ (on the diagonal it still works, with step $2h$).', 'The eigenvalues of a symmetric 2×2 are $\\frac{\\mathrm{tr}}{2} \\pm \\sqrt{\\frac{\\mathrm{tr}^2}{4} - \\det}$.'],
  },

  'double-integrals': {
    prompt: py`Write \`double_integral(f, ax, bx, ay, by, n)\` with an $n \times n$ grid of midpoint columns, and \`ring_sum(g, r_max, n)\` for functions of the distance alone. Then check three facts from the lesson: the iterated integral of $xy + 1$ over $[0, 1]\times[0, 2]$ is 3; an independent product $p(x)q(y)$ integrates to $(\int p)(\int q)$; and the disc of radius 3 has area $9\pi$ in rings.`,
    starter: py`import math

def double_integral(f, ax, bx, ay, by, n=100):
    ...

def ring_sum(g, r_max, n=2000):
    ...
`,
    solution: py`import math

def double_integral(f, ax, bx, ay, by, n=100):
    wx, wy = (bx - ax) / n, (by - ay) / n
    total = 0.0
    for i in range(n):
        for j in range(n):
            total += f(ax + (i + 0.5) * wx, ay + (j + 0.5) * wy) * wx * wy
    return total

def ring_sum(g, r_max, n=2000):
    dr = r_max / n
    return sum(g((i + 0.5) * dr) * 2 * math.pi * (i + 0.5) * dr * dr for i in range(n))
`,
    checks: checks(py`
expect(double_integral(lambda x, y: x * y + 1, 0, 1, 0, 2, 40), 3, "∬ (xy + 1)", tol=1e-9)
p, q = (lambda x: 2 * x), (lambda y: 3 * y * y)
expect(double_integral(lambda x, y: p(x) * q(y), 0, 1, 0, 1, 200), 1, "∬ p(x) q(y) for two densities on [0, 1]", tol=1e-4)
expect(ring_sum(lambda r: 1.0, 3), 9 * math.pi, "the disc of radius 3", tol=1e-6)
expect(double_integral(lambda x, y: 1.0 if x * x + y * y <= 1 else 0.0, -1, 1, -1, 1, 300), math.pi, "the unit disc by square columns", tol=2e-3)
`),
    hints: ['Each column: height at its centre times $\\Delta x\\,\\Delta y$.', 'A ring at radius $r$ and width $dr$ has area $2\\pi r\\,dr$.'],
  },

  'gaussian-integral': {
    prompt: py`Carry out the lesson's proof numerically. Compute \`I\` $= \int_{-12}^{12} e^{-x^2/2}dx$ with midpoint strips, \`I_squared_grid\`, the double integral of $e^{-(x^2+y^2)/2}$ over $[-8, 8]^2$ with a $200\times200$ grid, and \`I_squared_rings\` with rings out to $r = 12$. All three should agree with $\sqrt{2\pi}$ or $2\pi$. Then use the same trick to find \`area_e_minus_x2\` $= \int e^{-x^2}dx$ **exactly**, as a Python expression.`,
    starter: py`import math

I = None
I_squared_grid = None
I_squared_rings = None
area_e_minus_x2 = None
`,
    solution: py`import math

def strips(f, a, b, n=20000):
    w = (b - a) / n
    return sum(f(a + (i + 0.5) * w) for i in range(n)) * w

I = strips(lambda x: math.exp(-x * x / 2), -12, 12)

n, L = 200, 8.0
w = 2 * L / n
I_squared_grid = sum(math.exp(-((-L + (i + 0.5) * w) ** 2 + (-L + (j + 0.5) * w) ** 2) / 2) * w * w for i in range(n) for j in range(n))

dr = 12 / 4000
I_squared_rings = sum(math.exp(-((k + 0.5) * dr) ** 2 / 2) * 2 * math.pi * (k + 0.5) * dr * dr for k in range(4000))

area_e_minus_x2 = math.sqrt(math.pi)
`,
    checks: checks(py`
expect(I, math.sqrt(2 * math.pi), "I", tol=1e-9)
expect(I_squared_grid, 2 * math.pi, "I_squared_grid", tol=1e-6)
expect(I_squared_rings, 2 * math.pi, "I_squared_rings", tol=1e-6)
expect(area_e_minus_x2, math.sqrt(math.pi), "area_e_minus_x2")
`),
    hints: ['$\\int e^{-x^2}dx$ squared is $\\int_0^\\infty e^{-r^2}2\\pi r\\,dr = \\pi$.'],
  },
}
