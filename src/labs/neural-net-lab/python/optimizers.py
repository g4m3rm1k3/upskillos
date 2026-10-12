import math


def valley(w):
    """A long, narrow valley: the error is 100 times steeper across it (w[1]) than along it (w[0])."""
    return 0.5 * (w[0] ** 2 + 100 * w[1] ** 2)


def valley_gradient(w):
    """The slope of the valley for each of the two weights."""
    return [w[0], 100 * w[1]]


def sgd_step(w, grad, state, rate):
    """Plain gradient descent: every weight a step against its slope."""
    return [wi - rate * gi for wi, gi in zip(w, grad)]


def momentum_step(w, grad, state, rate, beta=0.9):
    """Momentum: keep a running velocity of past slopes, and step along it instead."""
    if "velocity" not in state:
        state["velocity"] = [0.0] * len(w)
    state["velocity"] = [beta * v + g for v, g in zip(state["velocity"], grad)]
    return [wi - rate * v for wi, v in zip(w, state["velocity"])]


def adam_step(w, grad, state, rate, beta1=0.9, beta2=0.999, eps=1e-8):
    """Adam: a running average of slopes (direction) and of squared slopes (size), so every weight
    gets a step of about the same size, however steep its own slope is."""
    if "m" not in state:
        state["m"] = [0.0] * len(w)
        state["v"] = [0.0] * len(w)
        state["t"] = 0
    state["t"] += 1
    t = state["t"]
    state["m"] = [beta1 * m + (1 - beta1) * g for m, g in zip(state["m"], grad)]
    state["v"] = [beta2 * v + (1 - beta2) * g * g for v, g in zip(state["v"], grad)]
    new_w = []
    for wi, m, v in zip(w, state["m"], state["v"]):
        m_hat = m / (1 - beta1 ** t)
        v_hat = v / (1 - beta2 ** t)
        new_w.append(wi - rate * m_hat / (math.sqrt(v_hat) + eps))
    return new_w


def race(step, rate, steps=60, start=(-9.0, 1.5)):
    """Run one optimiser down the valley from the same start; the path it takes, and its final error."""
    w = list(start)
    state = {}
    path = [w]
    for i in range(steps):
        w = step(w, valley_gradient(w), state, rate)
        path.append(w)
    return path, valley(w)


def race_all():
    """All three, each with about the best learning rate it can take (measured)."""
    results = {"sgd": race(sgd_step, 0.019), "momentum": race(momentum_step, 0.004), "adam": race(adam_step, 0.5)}
    for name, (path, error) in results.items():
        print(name, "error after 60 steps", round(error, 6))
    return results
