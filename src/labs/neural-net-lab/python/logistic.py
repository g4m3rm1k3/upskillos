import math

from points2d import make_blobs


def sigmoid(z):
    """Any number into a probability between 0 and 1."""
    return 1 / (1 + math.exp(-z))


def predict_prob(w, b, point):
    """One neuron with two inputs, through sigmoid: the probability that this point is a 1."""
    z = w[0] * point[0] + w[1] * point[1] + b
    return sigmoid(z)


def bce(p, label):
    """Binary cross-entropy: minus the log of the probability the model gave to the right answer."""
    if label == 1:
        return -math.log(p)
    return -math.log(1 - p)


def train_logistic(steps=300, rate=0.5, seed=0):
    """Logistic regression: gradient descent on the cross-entropy, by hand."""
    points, labels = make_blobs(seed=seed)
    w = [0.0, 0.0]
    b = 0.0
    n = len(points)
    history = []
    for step in range(steps):
        grad_w = [0.0, 0.0]
        grad_b = 0.0
        loss = 0.0
        for point, label in zip(points, labels):
            p = predict_prob(w, b, point)
            loss += bce(p, label) / n
            grad_w[0] += (p - label) * point[0] / n
            grad_w[1] += (p - label) * point[1] / n
            grad_b += (p - label) / n
        w[0] -= rate * grad_w[0]
        w[1] -= rate * grad_w[1]
        b -= rate * grad_b
        history.append(loss)
    return w, b, history


def accuracy(w, b, points, labels):
    """The fraction of points on the right side of the boundary."""
    correct = 0
    for point, label in zip(points, labels):
        guess = 1 if predict_prob(w, b, point) >= 0.5 else 0
        if guess == label:
            correct += 1
    return correct / len(points)
