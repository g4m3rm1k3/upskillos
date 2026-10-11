# Gradient descent: one neuron (a weight w and a bias b) learns the line y = 2x + 1 from 4 points.
# Each step works out how the average squared error changes with w and with b (the gradient),
# then moves both a little the other way. Every network in A2C learns by this same idea.
XS = [0.0, 1.0, 2.0, 3.0]
YS = [1.0, 3.0, 5.0, 7.0]


def predict(w, b, x):
    return w * x + b


def train(steps=40, rate=0.05):
    w = 0.0
    b = 0.0
    for step in range(steps):
        loss = 0.0
        grad_w = 0.0
        grad_b = 0.0
        for x, y in zip(XS, YS):
            error = predict(w, b, x) - y
            loss = loss + error * error / len(XS)
            grad_w = grad_w + 2 * error * x / len(XS)
            grad_b = grad_b + 2 * error / len(XS)
        w = w - rate * grad_w
        b = b - rate * grad_b
    return w, b
