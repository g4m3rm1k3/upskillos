from data import make_line


def predict(w, b, x):
    """One neuron with one input: weight times input, plus bias."""
    return w * x + b


def mse(w, b, xs, ys):
    """The mean squared error: the average of (prediction - truth) squared, over all the points."""
    total = 0.0
    for x, y in zip(xs, ys):
        error = predict(w, b, x) - y
        total += error ** 2
    return total / len(xs)


def gradients(w, b, xs, ys):
    """How fast the error grows as w, and as b, is nudged up: the two slopes."""
    grad_w = 0.0
    grad_b = 0.0
    for x, y in zip(xs, ys):
        error = predict(w, b, x) - y
        grad_w += 2 * error * x / len(xs)
        grad_b += 2 * error / len(xs)
    return grad_w, grad_b


def fit_line(steps=500, rate=0.02, seed=0):
    """Gradient descent: start at w = b = 0 and step both against their slopes, again and again."""
    xs, ys = make_line(seed=seed)
    w, b = 0.0, 0.0
    history = []
    for step in range(steps):
        grad_w, grad_b = gradients(w, b, xs, ys)
        w = w - rate * grad_w
        b = b - rate * grad_b
        history.append(mse(w, b, xs, ys))
    return w, b, history
