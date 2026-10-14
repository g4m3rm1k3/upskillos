"""Optimisation, each idea as a short program: convexity checks, gradient descent with its guarantee,
Newton's method, stochastic gradient descent, momentum and schedules, Lagrange multipliers on a
circle, KKT for a bounded problem with projected gradient descent, and a dual function."""
import math
import random


def chord_above(f, a, b, t):
    """Convexity at one spot: is f(t a + (1 − t) b) ≤ t f(a) + (1 − t) f(b)? (the curve below its chord)"""
    return f(t * a + (1 - t) * b) <= t * f(a) + (1 - t) * f(b) + 1e-12


def is_convex_on(f, lo, hi, n=40):
    """Check the chord condition on a grid of pairs and mixing weights: evidence, not proof."""
    xs = [lo + (hi - lo) * i / n for i in range(n + 1)]
    for a in xs:
        for b in xs:
            for t in (0.25, 0.5, 0.75):
                if not chord_above(f, a, b, t):
                    return False
    return True


def descent_step(f, grad, x, eta, L):
    """One gradient step on a function whose curvature is at most L: the actual decrease, and the guaranteed one, η(1 − Lη/2) g²."""
    g = grad(x)
    actual = f(x) - f(x - eta * g)
    guaranteed = eta * (1 - L * eta / 2) * g * g
    return actual, guaranteed


def newton(f1, f2, x, steps=6):
    """Newton's method for a minimum: jump to the bottom of the parabola that matches the slope and the curvature."""
    path = [x]
    for _ in range(steps):
        x = x - f1(x) / f2(x)
        path.append(x)
    return path


def full_gradient(w, xs, ys):
    """The gradient of the mean squared error of y ≈ w x over all the data."""
    return sum(2 * (w * x - y) * x for x, y in zip(xs, ys)) / len(xs)


def sgd(xs, ys, eta, batch, epochs, seed=0):
    """Stochastic gradient descent on y ≈ w x: each step uses the gradient of a random minibatch."""
    rng = random.Random(seed)
    w = 0.0
    order = list(range(len(xs)))
    path = [w]
    for _ in range(epochs):
        rng.shuffle(order)
        for start in range(0, len(order), batch):
            idx = order[start:start + batch]
            g = sum(2 * (w * xs[i] - ys[i]) * xs[i] for i in idx) / len(idx)
            w = w - eta * g
            path.append(w)
    return path


def momentum(grad, x, eta, beta, steps):
    """Gradient descent with momentum: a velocity that is a moving average of past gradients."""
    v = 0.0
    path = [x]
    for _ in range(steps):
        v = beta * v + grad(x)
        x = x - eta * v
        path.append(x)
    return path


def cosine_schedule(t, total, lr_max, lr_min=0.0, warmup=0):
    """A learning rate that rises linearly during warm-up, then falls along half a cosine wave."""
    if t < warmup:
        return lr_max * (t + 1) / warmup
    progress = (t - warmup) / max(1, total - warmup)
    return lr_min + (lr_max - lr_min) * (1 + math.cos(math.pi * progress)) / 2


def best_on_circle(f, n=3600):
    """The point of the unit circle where f is smallest, by trying n evenly spaced angles."""
    best = None
    for i in range(n):
        t = 2 * math.pi * i / n
        p = (math.cos(t), math.sin(t))
        if best is None or f(p) < f(best):
            best = p
    return best


def kkt_bounded(c, bound):
    """Minimise (x − c)² subject to x ≤ bound: the answer and its multiplier λ (zero when the bound doesn't bind)."""
    if c <= bound:
        return c, 0.0
    return bound, 2 * (c - bound)


def projected_gd(grad, project, x, eta, steps):
    """Gradient descent that steps, then projects back onto the allowed set."""
    path = [x]
    for _ in range(steps):
        x = project(x - eta * grad(x))
        path.append(x)
    return path


def dual_value(lam):
    """For min x² subject to x ≥ 1: q(λ) = min over x of x² + λ(1 − x) = λ − λ²/4, a lower bound on the answer."""
    x = lam / 2
    return x * x + lam * (1 - x)


def show_optimise():
    """Each idea of the optimisation part, once."""
    print("x² convex on [−3, 3]?", is_convex_on(lambda x: x * x, -3, 3), " sin convex?", is_convex_on(math.sin, -3, 3))
    print("descent on x² from 3 with η = 0.25 (actual, guaranteed):", descent_step(lambda x: x * x, lambda x: 2 * x, 3.0, 0.25, 2.0))
    print("Newton on (x − 2)⁴ + x²:", newton(lambda x: 4 * (x - 2) ** 3 + 2 * x, lambda x: 12 * (x - 2) ** 2 + 2, 0.0, 5)[-1])
    print("cosine schedule at the start, middle and end:", [cosine_schedule(t, 100, 0.1) for t in (0, 50, 100)])
    print("KKT for min (x − 3)² with x ≤ 1:", kkt_bounded(3.0, 1.0))
    print("dual values q(1), q(2), q(3):", [dual_value(lam) for lam in (1.0, 2.0, 3.0)])
