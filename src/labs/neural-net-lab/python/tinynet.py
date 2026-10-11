import math
import random

from data import make_curve
from layer import relu


def init_net(hidden=8, seed=0):
    """A 1 -> hidden -> 1 network, its weights drawn the way PyTorch draws them: uniform in ±1/sqrt(inputs)."""
    rng = random.Random(seed)
    w1 = [rng.uniform(-1, 1) for j in range(hidden)]
    b1 = [rng.uniform(-1, 1) for j in range(hidden)]
    bound = 1 / math.sqrt(hidden)
    w2 = [rng.uniform(-bound, bound) for j in range(hidden)]
    b2 = rng.uniform(-bound, bound)
    return {"w1": w1, "b1": b1, "w2": w2, "b2": b2}


def forward(net, x):
    """One input through the network, keeping the numbers in between: backpropagation needs them."""
    z = [w * x + b for w, b in zip(net["w1"], net["b1"])]
    h = relu(z)
    y_hat = net["b2"]
    for w, h_j in zip(net["w2"], h):
        y_hat += w * h_j
    return y_hat, z, h


def backward(net, x, y, y_hat, z, h):
    """The slope of this point's loss (y_hat - y)**2 for every weight: the chain rule, from the output back."""
    d_y_hat = 2 * (y_hat - y)
    grads = {"w1": [], "b1": [], "w2": [], "b2": d_y_hat}
    for j in range(len(h)):
        grads["w2"].append(d_y_hat * h[j])
        d_h = d_y_hat * net["w2"][j]
        d_z = d_h if z[j] > 0 else 0.0
        grads["w1"].append(d_z * x)
        grads["b1"].append(d_z)
    return grads


def train_step(net, xs, ys, rate):
    """One step of gradient descent on the mean squared error over all the points."""
    n = len(xs)
    total = {"w1": [0.0] * len(net["w1"]), "b1": [0.0] * len(net["b1"]), "w2": [0.0] * len(net["w2"]), "b2": 0.0}
    loss = 0.0
    for x, y in zip(xs, ys):
        y_hat, z, h = forward(net, x)
        loss += (y_hat - y) ** 2 / n
        grads = backward(net, x, y, y_hat, z, h)
        for name in ("w1", "b1", "w2"):
            for j in range(len(net[name])):
                total[name][j] += grads[name][j] / n
        total["b2"] += grads["b2"] / n
    for name in ("w1", "b1", "w2"):
        for j in range(len(net[name])):
            net[name][j] -= rate * total[name][j]
    net["b2"] -= rate * total["b2"]
    return loss


def train_net(hidden=8, steps=2000, rate=0.05, seed=0):
    """Fit the curve: a new network, then train_step again and again."""
    xs, ys = make_curve(seed=seed)
    net = init_net(hidden, seed)
    history = []
    for step in range(steps):
        loss = train_step(net, xs, ys, rate)
        history.append(loss)
    return net, history
