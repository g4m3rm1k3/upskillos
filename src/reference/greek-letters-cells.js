// Runnable Python for the Greek letters reference: one cell per worked example (and a few
// meanings that are clearer with a plot). Keyed "letterId:meaningIndex", the meaning's
// position in greek-letters-data.js. `expect` is text the output must contain: the answer
// the example states, so a run checks the example. greek-letters-cells.test.js runs every
// cell on real Python and fails if any expectation isn't printed.
//
// Cells use only numpy, matplotlib and the standard library, so the browser loads little.
// A plot appears where a cell calls plt.show().

export const GREEK_CELLS = {
  'alpha:0': {
    code: `alpha, beta = 50, 60          # the two known angles, in degrees
gamma = 180 - alpha - beta     # the angles of a triangle add up to 180
print(f"gamma = {gamma} degrees")`,
    expect: 'gamma = 70 degrees',
  },
  'alpha:1': {
    code: `import numpy as np
import matplotlib.pyplot as plt

x = np.linspace(0.05, 3, 200)
for alpha in [2, 1, 0.5, -1]:          # alpha is fixed for each curve; x varies
    plt.plot(x, x ** alpha, label=f"alpha = {alpha}")
plt.ylim(0, 5); plt.legend(); plt.title("f(x) = x ** alpha"); plt.show()

print("with alpha = 0.5, f(4) =", 4 ** 0.5)`,
    expect: 'f(4) = 2.0',
  },
  'alpha:2': {
    code: `p = 0.03       # computed from the data
alpha = 0.05   # chosen BEFORE looking at the data
print("reject H0" if p < alpha else "keep H0")`,
    expect: 'reject H0',
  },
  'alpha:3': {
    code: `import matplotlib.pyplot as plt

Q, target, alpha = 2.0, 5.0, 0.1
Q = Q + alpha * (target - Q)          # move 10% of the way to the target
print(f"Q after one update: {Q:.1f}")

# The same update repeated: each step closes 10% of the remaining gap.
for a in [0.1, 0.5]:
    q, history = 2.0, []
    for _ in range(30):
        q += a * (target - q)
        history.append(q)
    plt.plot(history, label=f"alpha = {a}")
plt.axhline(target, color="gray", linestyle="--"); plt.legend(); plt.xlabel("update"); plt.ylabel("Q"); plt.show()`,
    expect: 'Q after one update: 2.3',
  },
  'beta:0': {
    code: `alpha = 35
beta = 90 - alpha      # the two acute angles of a right triangle add to 90
print(f"beta = {beta}")`,
    expect: 'beta = 55',
  },
  'beta:1': {
    code: `import numpy as np
import matplotlib.pyplot as plt

beta0, beta1 = 1, 2
print("y_hat =", beta0 + beta1 * 3)

# Data scattered around the line: the scatter is the error term epsilon.
rng = np.random.default_rng(0)
x = np.linspace(0, 5, 30)
y = beta0 + beta1 * x + rng.normal(0, 1, x.size)
plt.scatter(x, y, s=12, label="data")
plt.plot(x, beta0 + beta1 * x, color="C1", label="y = 1 + 2x")
plt.legend(); plt.show()`,
    expect: 'y_hat = 7',
  },
  'beta:2': {
    code: `beta = 0.2
print(f"power = {1 - beta:.1f}")`,
    expect: 'power = 0.8',
  },
  'beta:3': {
    code: `import math
import numpy as np
import matplotlib.pyplot as plt

a, b = 2, 3
print(f"mean = {a / (a + b)}")

# The density, using the gamma function for the normalising constant.
B = math.gamma(a) * math.gamma(b) / math.gamma(a + b)
x = np.linspace(0, 1, 200)
plt.plot(x, x ** (a - 1) * (1 - x) ** (b - 1) / B)
plt.axvline(0.4, color="gray", linestyle="--"); plt.title("Beta(2, 3)"); plt.show()

samples = np.random.default_rng(0).beta(a, b, 100_000)
print(f"mean of 100,000 samples: {samples.mean():.3f}")`,
    expect: 'mean = 0.4',
  },
  'gamma:1': {
    code: `import matplotlib.pyplot as plt

rewards, gamma = [1, 1, 1], 0.9
G = sum(gamma ** k * r for k, r in enumerate(rewards))   # r1 + gamma r2 + gamma^2 r3
print(f"G = {G:.2f}")

# How much a reward k steps away counts, for three discount factors.
for g in [0.5, 0.9, 0.99]:
    plt.plot([g ** k for k in range(40)], label=f"gamma = {g}")
plt.xlabel("steps away"); plt.ylabel("weight"); plt.legend(); plt.show()`,
    expect: 'G = 2.71',
  },
  'gamma:2': {
    code: `import numpy as np

for n in [10, 1_000, 1_000_000]:
    harmonic = np.sum(1 / np.arange(1, n + 1))
    print(f"n = {n:>9,}: H_n - ln n = {harmonic - np.log(n):.4f}")`,
    expect: '1,000,000: H_n - ln n = 0.5772',
  },
  'gamma:3': {
    code: `import math

v_over_c = 0.6
gamma = 1 / math.sqrt(1 - v_over_c ** 2)
print(f"gamma = {gamma:.2f}")`,
    expect: 'gamma = 1.25',
  },
  'Gamma:0': {
    code: `import math
import numpy as np
import matplotlib.pyplot as plt

print("Gamma(5) =", round(math.gamma(5)))
print(f"Gamma(1/2) = {math.gamma(0.5):.4f}, sqrt(pi) = {math.sqrt(math.pi):.4f}")

x = np.linspace(0.2, 5, 300)
plt.plot(x, [math.gamma(v) for v in x], label="Gamma(x)")
n = np.arange(1, 6)
plt.scatter(n, [math.factorial(k - 1) for k in n], color="C1", zorder=3, label="(n-1)!")
plt.legend(); plt.title("Gamma joins the factorials smoothly"); plt.show()`,
    expect: 'Gamma(5) = 24',
  },
  'delta:0': {
    code: `import numpy as np

epsilon = 0.01
delta = epsilon / 2                     # the choice worked out on paper
x = np.random.default_rng(0).uniform(1 - delta, 1 + delta, 100_000)   # x within delta of 1
print("delta =", delta)
print("all within epsilon:", bool(np.all(np.abs(2 * x - 2) < epsilon)))`,
    expect: 'all within epsilon: True',
  },
  'delta:1': {
    code: `import numpy as np

I = np.eye(3)    # the identity matrix: its entries ARE the Kronecker delta
# Python counts from 0, so delta_22 is I[1, 1] and delta_23 is I[1, 2].
print(f"delta_22 = {int(I[1, 1])}, delta_23 = {int(I[1, 2])}")`,
    expect: 'delta_22 = 1, delta_23 = 0',
  },
  'delta:2': {
    code: `import numpy as np

# Stand-in for the Dirac delta at 3: a very narrow bump of area 1.
width = 0.01
x = np.linspace(2.9, 3.1, 200_001)
bump = np.exp(-((x - 3) / width) ** 2 / 2) / (width * np.sqrt(2 * np.pi))
print(f"area of the bump: {np.trapezoid(bump, x):.3f}")
print(f"integral of x^2 times it: {np.trapezoid(x ** 2 * bump, x):.3f}")`,
    expect: 'integral of x^2 times it: 9.000',
  },
  'delta:3': {
    code: `r, gamma, V_next, V_now = 1, 0.9, 2, 2.5
delta = r + gamma * V_next - V_now
print(f"delta = {delta:.1f}")`,
    expect: 'delta = 0.3',
  },
  'Delta:0': {
    code: `import matplotlib.pyplot as plt

(x1, y1), (x2, y2) = (1, 2), (4, 8)
dx, dy = x2 - x1, y2 - y1
print(f"Delta x = {dx}, Delta y = {dy}, slope = {dy / dx}")

plt.plot([x1, x2], [y1, y2], "o-")
plt.plot([x1, x2, x2], [y1, y1, y2], "--", color="gray")   # the run and the rise
plt.text(2.3, 1.4, "Delta x = 3"); plt.text(4.1, 5, "Delta y = 6"); plt.show()`,
    expect: 'slope = 2.0',
  },
  'Delta:1': {
    code: `import numpy as np
import matplotlib.pyplot as plt

a, b, c = 1, -5, 6
D = b ** 2 - 4 * a * c
print("discriminant =", D)
print("roots:", sorted(np.roots([a, b, c]).tolist()))

x = np.linspace(0, 5, 200)
plt.plot(x, a * x ** 2 + b * x + c); plt.axhline(0, color="gray")
plt.title("D > 0: the parabola crosses zero twice"); plt.show()`,
    expect: 'discriminant = 1',
  },
  'Delta:2': {
    code: `f = lambda x, y: x ** 2 + y ** 2
h, x, y = 1e-3, 0.7, -1.2
# Second derivatives from differences: (f(x+h) - 2 f(x) + f(x-h)) / h^2
fxx = (f(x + h, y) - 2 * f(x, y) + f(x - h, y)) / h ** 2
fyy = (f(x, y + h) - 2 * f(x, y) + f(x, y - h)) / h ** 2
print(f"Laplacian = {fxx + fyy:.4f}")`,
    expect: 'Laplacian = 4.0000',
  },
  'epsilon:2': {
    code: `import numpy as np

epsilon, n_actions, best = 0.1, 4, 0
rng = np.random.default_rng(0)
explore = rng.random(100_000) < epsilon
chosen = np.where(explore, rng.integers(0, n_actions, 100_000), best)
print(f"theory: {(1 - epsilon) + epsilon / n_actions:.3f}")
print(f"simulated: {np.mean(chosen == best):.3f}")`,
    expect: 'theory: 0.925',
  },
  'epsilon:3': {
    code: `import sys

print("machine epsilon:", sys.float_info.epsilon)
print("0.1 + 0.2 == 0.3:", 0.1 + 0.2 == 0.3)
print("close enough:", abs((0.1 + 0.2) - 0.3) < 1e-9)`,
    expect: 'machine epsilon: 2.220446049250313e-16',
  },
  'zeta:0': {
    code: `import math
import numpy as np
import matplotlib.pyplot as plt

n = np.arange(1, 201)
partial = np.cumsum(1 / n ** 2)
print(f"sum of the first 200 terms: {partial[-1]:.4f}")
print(f"pi^2/6 = {math.pi ** 2 / 6:.4f}")
plt.plot(n, partial); plt.axhline(math.pi ** 2 / 6, color="gray", linestyle="--")
plt.xlabel("terms added"); plt.title("Partial sums of zeta(2)"); plt.show()`,
    expect: 'pi^2/6 = 1.6449',
  },
  'zeta:1': {
    code: `import matplotlib.pyplot as plt

# x'' + 2 zeta w x' + w^2 x = 0, stepped forward in small time steps.
w, dt = 2.0, 0.01
for zeta in [0.2, 1.0, 2.0]:
    x, v, xs = 1.0, 0.0, []
    for _ in range(800):
        a = -2 * zeta * w * v - w ** 2 * x
        v += a * dt
        x += v * dt
        xs.append(x)
    plt.plot([i * dt for i in range(800)], xs, label=f"zeta = {zeta}")
plt.axhline(0, color="gray"); plt.legend(); plt.xlabel("time"); plt.show()
print("plotted 3 damping ratios")`,
    expect: 'plotted 3 damping ratios',
  },
  'eta:0': {
    code: `import matplotlib.pyplot as plt

theta, gradient, eta = 4, 2, 0.1
print(f"theta = {theta - eta * gradient:.1f}")

# Minimising L = theta^2 (gradient 2 theta) from theta = 4, with two step sizes.
for e in [0.1, 0.9]:
    t, path = 4.0, [4.0]
    for _ in range(20):
        t -= e * 2 * t
        path.append(t)
    plt.plot(path, "o-", markersize=3, label=f"eta = {e}")
plt.axhline(0, color="gray"); plt.legend(); plt.xlabel("step"); plt.ylabel("theta"); plt.show()`,
    expect: 'theta = 3.8',
  },
  'eta:1': {
    code: `useful_out, energy_in = 30, 100
print(f"efficiency = {useful_out / energy_in:.0%}")`,
    expect: 'efficiency = 30%',
  },
  'theta:0': {
    code: `import math

theta = math.radians(30)     # Python's sin works in radians
print(f"sin(30 deg) = {math.sin(theta):.1f}")`,
    expect: 'sin(30 deg) = 0.5',
  },
  'theta:1': {
    code: `import math
import matplotlib.pyplot as plt

r, theta = 2, math.pi / 3
x, y = r * math.cos(theta), r * math.sin(theta)
print(f"x = {x:.4f}, y = {y:.4f}")

plt.plot([0, x], [0, y], "o-")
plt.plot([2 * math.cos(t / 50 * theta) * 0.3 for t in range(51)],
         [2 * math.sin(t / 50 * theta) * 0.3 for t in range(51)], color="C1")   # the angle
plt.text(0.35, 0.12, "theta"); plt.text(x / 2 - 0.3, y / 2 + 0.1, "r = 2")
plt.gca().set_aspect("equal"); plt.grid(True); plt.show()`,
    expect: 'x = 1.0000, y = 1.7321',
  },
  'theta:2': {
    code: `import numpy as np

x = np.array([0, 1, 2, 3])
y = np.array([1, 3, 5, 7])                 # made with y = 1 + 2x
slope, intercept = np.polyfit(x, y, 1)     # estimate the parameters from the data
theta_hat = [float(round(intercept, 6)) + 0.0, float(round(slope, 6)) + 0.0]   # float(): plain numbers, not np.float64
print("theta_hat =", theta_hat)`,
    expect: 'theta_hat = [1.0, 2.0]',
  },
  'Theta:0': {
    code: `import numpy as np
import matplotlib.pyplot as plt

n = np.arange(1, 1001)
ratio = (3 * n ** 2 + 5 * n) / n ** 2     # stays between 3 and 8: that is Theta(n^2)
print(f"n = 1: ratio = {ratio[0]:.3f}")
print(f"n = 1000: ratio = {ratio[-1]:.3f}")
plt.plot(n, ratio); plt.axhline(3, color="gray", linestyle="--"); plt.axhline(8, color="gray", linestyle="--")
plt.xscale("log"); plt.title("(3n^2 + 5n) / n^2"); plt.show()`,
    expect: 'n = 1000: ratio = 3.005',
  },
  'kappa:0': {
    code: `import math

R, t = 4, 0.8                    # a circle x = R cos t, y = R sin t, at any t
dx, dy = -R * math.sin(t), R * math.cos(t)
ddx, ddy = -R * math.cos(t), -R * math.sin(t)
kappa = abs(dx * ddy - dy * ddx) / (dx ** 2 + dy ** 2) ** 1.5
print(f"kappa = {kappa:.2f}")`,
    expect: 'kappa = 0.25',
  },
  'kappa:1': {
    code: `import numpy as np

A = np.diag([10, 0.1])
print(f"cond = {np.linalg.cond(A):.1f}")

b = np.array([1.0, 1.0])
x = np.linalg.solve(A, b)
x2 = np.linalg.solve(A, b + np.array([0, 0.001]))   # nudge b by 0.1%
print(f"input changed by {0.001 / np.linalg.norm(b):.2%}, answer changed by {np.linalg.norm(x2 - x) / np.linalg.norm(x):.2%}")`,
    expect: 'cond = 100.0',
  },
  'lambda:0': {
    code: `import numpy as np

A = np.array([[2.0, 0.0], [0.0, 3.0]])
v = np.array([1.0, 0.0])
print("A v =", (A @ v).tolist(), " 2 v =", (2 * v).tolist())
print("eigenvalues:", np.linalg.eigvals(A).tolist())`,
    expect: 'eigenvalues: [2.0, 3.0]',
  },
  'lambda:1': {
    code: `v, f = 340, 170
print(f"wavelength = {v / f} m")`,
    expect: 'wavelength = 2.0 m',
  },
  'lambda:2': {
    code: `import math
import numpy as np
import matplotlib.pyplot as plt

lam, N0 = 0.1, 100
half_life = math.log(2) / lam
print(f"half-life = {half_life:.2f} years")

t = np.linspace(0, 40, 200)
plt.plot(t, N0 * np.exp(-lam * t))
plt.axvline(half_life, color="gray", linestyle="--"); plt.axhline(N0 / 2, color="gray", linestyle="--")
plt.xlabel("years"); plt.ylabel("amount left"); plt.show()`,
    expect: 'half-life = 6.93 years',
  },
  'lambda:3': {
    code: `import math
import matplotlib.pyplot as plt

lam = 2
p = [lam ** k * math.exp(-lam) / math.factorial(k) for k in range(9)]
print(f"P(X = 0) = {p[0]:.3f}")
plt.bar(range(9), p); plt.xlabel("emails in an hour"); plt.title("Poisson, lambda = 2"); plt.show()`,
    expect: 'P(X = 0) = 0.135',
  },
  'lambda:4': {
    code: `add_one = lambda x: x + 1     # Python borrowed the name from lambda calculus
print((lambda x: x + 1)(4))`,
    expect: '5',
  },
  'lambda:5': {
    code: `# Maximise f = x y on the line g: x + y = 10. At the best point grad f = lambda grad g:
# (y, x) = lambda (1, 1), so x = y = lambda. Check by trying points along the line.
best = max(((x / 100, 10 - x / 100) for x in range(1001)), key=lambda p: p[0] * p[1])
x, y = best
print(f"x = {x:g}, y = {y:g}, lambda = {y:g}")`,
    expect: 'x = 5, y = 5, lambda = 5',
  },
  'Lambda:0': {
    code: `import numpy as np

A = np.array([[2.0, 1.0], [1.0, 2.0]])
eigenvalues, Q = np.linalg.eigh(A)
Lam = np.diag(eigenvalues)
print("Lambda =", np.round(Lam, 6).tolist())
print("Q Lambda Q^-1 equals A:", np.allclose(Q @ Lam @ np.linalg.inv(Q), A))`,
    expect: 'Q Lambda Q^-1 equals A: True',
  },
  'mu:0': {
    code: `data = [2, 4, 6, 8]
mu = sum(data) / len(data)    # add everything, divide by how many
print("mu =", mu)`,
    expect: 'mu = 5.0',
  },
  'mu:1': {
    code: `mu, N = 0.4, 50
print(f"F = {mu * N} N")`,
    expect: 'F = 20.0 N',
  },
  'mu:2': {
    code: `a, b = 2, 5
print("measure of [2, 5] =", b - a)`,
    expect: 'measure of [2, 5] = 3',
  },
  'nu:1': {
    code: `n = 10
nu = n - 1
print("nu =", nu)`,
    expect: 'nu = 9',
  },
  'xi:0': {
    code: `import numpy as np
import matplotlib.pyplot as plt

f = lambda x: x ** 2
a, b = 0, 2
secant_slope = (f(b) - f(a)) / (b - a)       # = 2
xi = secant_slope / 2                        # f'(xi) = 2 xi must equal it
print("xi =", xi)

x = np.linspace(-0.3, 2.3, 100)
plt.plot(x, f(x), label="f(x) = x^2")
plt.plot([a, b], [f(a), f(b)], "o--", label="secant, slope 2")
plt.plot(x, f(xi) + secant_slope * (x - xi), ":", label="tangent at xi = 1, slope 2")
plt.legend(); plt.show()`,
    expect: 'xi = 1.0',
  },
  'pi:0': {
    code: `import math
import numpy as np

r = 3
print(f"area = {math.pi * r ** 2:.2f}, circumference = {2 * math.pi * r:.2f}")

# pi by throwing darts: the fraction landing inside the quarter circle is pi/4.
points = np.random.default_rng(0).random((1_000_000, 2))
inside = np.mean((points ** 2).sum(axis=1) <= 1)
print(f"darts estimate: {4 * inside:.3f}")`,
    expect: 'area = 28.27',
  },
  'pi:1': {
    code: `import math

print(f"60 degrees = {math.radians(60):.4f} rad, pi/3 = {math.pi / 3:.4f}")`,
    expect: '1.0472 rad',
  },
  'pi:2': {
    code: `import random

# A policy for one state: the probability of each action.
pi = {"up": 0.7, "left": 0.1, "right": 0.1, "down": 0.1}
print("sum of pi(a|s) =", round(sum(pi.values()), 10))

random.seed(0)
picks = random.choices(list(pi), weights=pi.values(), k=10_000)
print("share of 'up' in 10,000 picks:", picks.count("up") / 10_000)`,
    expect: 'sum of pi(a|s) = 1.0',
  },
  'pi:3': {
    code: `def is_prime(n):
    return n >= 2 and all(n % d for d in range(2, int(n ** 0.5) + 1))

print("pi(10) =", sum(is_prime(n) for n in range(11)))
print("pi(100) =", sum(is_prime(n) for n in range(101)))`,
    expect: 'pi(10) = 4',
  },
  'Pi:0': {
    code: `import math

print(math.prod(range(1, 5)))    # 1 * 2 * 3 * 4`,
    expect: '24',
  },
  'rho:0': {
    code: `m, V = 2, 0.001
print(f"rho = {m / V} kg/m^3")`,
    expect: 'rho = 2000.0 kg/m^3',
  },
  'rho:1': {
    code: `import numpy as np

cov, sx, sy = 1, 2, 3
print(f"rho = {cov / (sx * sy):.4f}")

x = np.arange(10)
print("perfect rising line:", np.corrcoef(x, 3 * x + 1)[0, 1].round(6))
print("perfect falling line:", np.corrcoef(x, -x)[0, 1].round(6))`,
    expect: 'rho = 0.1667',
  },
  'rho:2': {
    code: `import numpy as np

A = np.diag([3.0, -5.0])
print("spectral radius =", max(abs(np.linalg.eigvals(A))))
B = A / 6     # spectral radius 5/6 < 1
print("size of B^50 v:", np.linalg.norm(np.linalg.matrix_power(B, 50) @ [1, 1]).round(6))`,
    expect: 'spectral radius = 5.0',
  },
  'rho:3': {
    code: `import math

x, y = 3, 4
print("rho =", math.sqrt(x ** 2 + y ** 2))`,
    expect: 'rho = 5.0',
  },
  'sigma:0': {
    code: `import numpy as np
import matplotlib.pyplot as plt

data = np.array([2, 4, 6, 8])
mu = data.mean()
sigma = np.sqrt(np.mean((data - mu) ** 2))
print(f"sigma = {sigma:.4f}")
print(f"numpy: {np.std(data):.4f}; sample version (divide by N-1): {np.std(data, ddof=1):.4f}")

# Two sets with the same mean and different sigma.
rng = np.random.default_rng(0)
for s in [1, 3]:
    plt.hist(rng.normal(5, s, 5000), bins=60, alpha=0.6, label=f"sigma = {s}")
plt.legend(); plt.show()`,
    expect: 'sigma = 2.2361',
  },
  'sigma:1': {
    code: `import numpy as np
import matplotlib.pyplot as plt

sigmoid = lambda x: 1 / (1 + np.exp(-x))
print("sigma(0) =", sigmoid(0))
x = np.linspace(-8, 8, 200)
plt.plot(x, sigmoid(x)); plt.axhline(0.5, color="gray", linestyle="--"); plt.title("sigmoid"); plt.show()`,
    expect: 'sigma(0) = 0.5',
  },
  'sigma:2': {
    code: `sigma = {1: 2, 2: 3, 3: 1}     # the permutation (1 2 3)
print("sigma(sigma(1)) =", sigma[sigma[1]])`,
    expect: 'sigma(sigma(1)) = 3',
  },
  'sigma:3': {
    code: `F, A = 1000, 0.01
print(f"stress = {F / A:.0f} Pa")`,
    expect: 'stress = 100000 Pa',
  },
  'Sigma:0': {
    code: `print("sum of i =", sum(i for i in range(1, 5)))       # range stops BEFORE 5
print("sum of i^2 =", sum(i ** 2 for i in range(1, 4)))`,
    expect: 'sum of i = 10',
  },
  'Sigma:1': {
    code: `import numpy as np

mu = [0, 0]
Sigma = np.array([[4, 1], [1, 9]])
s1, s2 = np.sqrt(np.diag(Sigma))
print(f"sigma_1 = {s1}, sigma_2 = {s2}, rho = {Sigma[0, 1] / (s1 * s2):.4f}")

sample = np.random.default_rng(0).multivariate_normal(mu, Sigma, 200_000)
print("covariance of 200,000 samples:", np.cov(sample.T).round(1).tolist())`,
    expect: 'rho = 0.1667',
  },
  'Sigma:2': {
    code: `from itertools import product

Sigma = ["0", "1"]
strings = ["".join(p) for n in range(1, 4) for p in product(Sigma, repeat=n)]
print(len(strings), "strings of length 1 to 3:", strings[:6], "...")`,
    expect: '14 strings',
  },
  'tau:0': {
    code: `import math
import numpy as np
import matplotlib.pyplot as plt

print(f"V(tau) / V0 = {math.exp(-1):.3f}")
tau = 2
t = np.linspace(0, 10, 200)
plt.plot(t, np.exp(-t / tau)); plt.axvline(tau, color="gray", linestyle="--"); plt.axhline(math.exp(-1), color="gray", linestyle="--")
plt.xlabel("time"); plt.title("tau = 2: down to 37% after 2 time units"); plt.show()`,
    expect: 'V(tau) / V0 = 0.368',
  },
  'tau:1': {
    code: `import math

r, F, theta = 0.5, 10, math.radians(90)
print(f"torque = {r * F * math.sin(theta):.1f} N*m")`,
    expect: 'torque = 5.0 N*m',
  },
  'tau:2': {
    code: `import math

print(f"tau = 2 pi = {2 * math.pi:.4f}")`,
    expect: 'tau = 2 pi = 6.2832',
  },
  'phi:0': {
    code: `import numpy as np
import matplotlib.pyplot as plt

A, omega = 1, 2 * np.pi
t = np.linspace(0, 2, 400)
for phi in [0, np.pi / 3, np.pi / 2]:
    plt.plot(t, A * np.cos(omega * t + phi), label=f"phi = {phi:.2f}")
plt.legend(); plt.xlabel("t"); plt.show()
print(f"x(0) with phi = pi/3: {np.cos(np.pi / 3):.1f}")`,
    expect: 'x(0) with phi = pi/3: 0.5',
  },
  'phi:1': {
    code: `import matplotlib.pyplot as plt

phi = (1 + 5 ** 0.5) / 2
print(f"phi = {phi:.4f}, phi^2 - phi - 1 = {phi ** 2 - phi - 1:.1e}")

# Ratios of neighbouring Fibonacci numbers approach phi.
fib = [1, 1]
for _ in range(15):
    fib.append(fib[-1] + fib[-2])
plt.plot([b / a for a, b in zip(fib, fib[1:])], "o-"); plt.axhline(phi, color="gray", linestyle="--")
plt.title("F(n+1) / F(n)"); plt.show()`,
    expect: 'phi = 1.6180',
  },
  'phi:2': {
    code: `import math

n = 9
coprime = [k for k in range(1, n + 1) if math.gcd(k, n) == 1]
print(coprime, "-> phi(9) =", len(coprime))`,
    expect: 'phi(9) = 6',
  },
  'phi:3': {
    code: `import numpy as np

x = np.linspace(-2, 2, 20)
y = x ** 2                              # not a straight line in x...
features = np.column_stack([x, x ** 2]) # ...but linear in the features phi(x) = (x, x^2)
weights = np.linalg.lstsq(features, y, rcond=None)[0]
print("weights =", [float(round(w, 6)) + 0.0 for w in weights])`,
    expect: 'weights = [0.0, 1.0]',
  },
  'Phi:0': {
    code: `import math
import numpy as np
import matplotlib.pyplot as plt

Phi = lambda z: 0.5 * (1 + math.erf(z / math.sqrt(2)))
print(f"Phi(1.96) = {Phi(1.96):.3f}")
print(f"P(-1.96 <= Z <= 1.96) = {Phi(1.96) - Phi(-1.96):.3f}")

z = np.linspace(-4, 4, 200)
plt.plot(z, [Phi(v) for v in z]); plt.axvline(1.96, color="gray", linestyle="--"); plt.title("Phi(z)"); plt.show()`,
    expect: 'Phi(1.96) = 0.975',
  },
  'chi:0': {
    code: `observed, expected = [18, 22], [20, 20]
chi2 = sum((o - e) ** 2 / e for o, e in zip(observed, expected))
print(f"chi^2 = {chi2:.1f}")`,
    expect: 'chi^2 = 0.4',
  },
  'chi:1': {
    code: `for name, V, E, F in [("cube", 8, 12, 6), ("tetrahedron", 4, 6, 4), ("octahedron", 6, 12, 8)]:
    print(f"{name}: {V - E + F}")`,
    expect: 'cube: 2',
  },
  'chi:2': {
    code: `A = {1, 3}
chi_A = lambda x: 1 if x in A else 0
print([chi_A(x) for x in range(6)])`,
    expect: '[0, 1, 0, 1, 0, 0]',
  },
  'psi:0': {
    code: `import numpy as np
import matplotlib.pyplot as plt

# A particle in a box from 0 to 1, lowest energy state.
x = np.linspace(0, 1, 100_001)
psi = np.sqrt(2) * np.sin(np.pi * x)
density = psi ** 2
half = x <= 0.5
print(f"total probability = {np.trapezoid(density, x):.3f}")
print(f"P(0 <= x <= 0.5) = {np.trapezoid(density[half], x[half]):.3f}")
plt.plot(x, psi, label="psi(x)"); plt.plot(x, density, label="|psi(x)|^2"); plt.legend(); plt.show()`,
    expect: 'P(0 <= x <= 0.5) = 0.500',
  },
  'psi:1': {
    code: `import math

# psi = Gamma' / Gamma = the derivative of ln Gamma, estimated from nearby values.
h = 1e-5
psi_1 = (math.lgamma(1 + h) - math.lgamma(1 - h)) / (2 * h)
print(f"psi(1) = {psi_1:.4f}")`,
    expect: 'psi(1) = -0.5772',
  },
  'omega:0': {
    code: `import math

f = 50
print(f"omega = {2 * math.pi * f:.2f} rad/s")`,
    expect: 'omega = 314.16 rad/s',
  },
  'omega:1': {
    code: `import cmath
import matplotlib.pyplot as plt

w = cmath.exp(2j * cmath.pi / 3)
print("w^3 is 1:", abs(w ** 3 - 1) < 1e-12)
print("1 + w + w^2 = 0:", abs(1 + w + w ** 2) < 1e-12)

roots = [1, w, w ** 2]
plt.scatter([r.real for r in roots], [r.imag for r in roots], zorder=3)
t = [k / 100 * 2 * cmath.pi for k in range(101)]
plt.plot([cmath.cos(a).real for a in t], [cmath.sin(a).real for a in t], color="gray")
plt.gca().set_aspect("equal"); plt.title("The three cube roots of 1"); plt.show()`,
    expect: '1 + w + w^2 = 0: True',
  },
  'Omega:0': {
    code: `from fractions import Fraction

Omega = {1, 2, 3, 4, 5, 6}
even = {x for x in Omega if x % 2 == 0}
print("P(Omega) =", Fraction(len(Omega), len(Omega)))
print("P(even) =", len(even) / len(Omega))`,
    expect: 'P(even) = 0.5',
  },
  'Omega:1': {
    code: `print("n^2 >= n for n = 1..1000:", all(n ** 2 >= n for n in range(1, 1001)))`,
    expect: 'n^2 >= n for n = 1..1000: True',
  },
  'Omega:2': {
    code: `V, R = 12, 4
print(f"I = {V / R} A")`,
    expect: 'I = 3.0 A',
  },
}
