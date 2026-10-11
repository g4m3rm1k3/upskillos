XS = [0.0, 1.0, 2.0, 3.0]
YS = [1.0, 3.0, 5.0, 7.0]


def predict(w, b, x):
    """One neuron with one input: weight times input, plus a bias."""
    return w * x + b


def gradients(w, b):
    """How the average squared error changes when w, and when b, is nudged up."""
    grad_w = 0.0
    grad_b = 0.0
    for x, y in zip(XS, YS):
        error = predict(w, b, x) - y
        grad_w += 2 * error * x / len(XS)
        grad_b += 2 * error / len(XS)
    return grad_w, grad_b


def train(steps=200, rate=0.05):
    """Gradient descent: start anywhere, and step w and b against their gradients again and again."""
    w, b = 0.0, 0.0
    for step in range(steps):
        grad_w, grad_b = gradients(w, b)
        w = w - rate * grad_w
        b = b - rate * grad_b
    return w, b
