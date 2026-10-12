import csv
import os

from softmax import cross_entropy, one_hot, softmax

HERE = os.path.dirname(os.path.abspath(__file__))
SPECIES = ["setosa", "versicolor", "virginica"]


def load_iris(columns=("petal_length", "petal_width")):
    """Each flower's chosen measurements, in centimetres, and its species as a number 0, 1 or 2."""
    rows, labels = [], []
    with open(os.path.join(HERE, "iris.csv"), encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            rows.append([float(row[name]) for name in columns])
            labels.append(SPECIES.index(row["species"]))
    return rows, labels


def scores_for(weights, biases, x):
    """One score per species: that species' weights times the measurements, plus its bias."""
    return [sum(w * v for w, v in zip(row, x)) + b for row, b in zip(weights, biases)]


def train_softmax(steps=500, rate=0.1):
    """Softmax regression by hand: one layer of 3 neurons, trained on the cross-entropy."""
    rows, labels = load_iris()
    n, k, m = len(rows), len(SPECIES), len(rows[0])
    weights = [[0.0] * m for c in range(k)]
    biases = [0.0] * k
    history = []
    for step in range(steps):
        grad_w = [[0.0] * m for c in range(k)]
        grad_b = [0.0] * k
        loss = 0.0
        for x, label in zip(rows, labels):
            probs = softmax(scores_for(weights, biases, x))
            loss += cross_entropy(probs, label) / n
            target = one_hot(label, k)
            for c in range(k):
                slope = probs[c] - target[c]
                grad_b[c] += slope / n
                for j in range(m):
                    grad_w[c][j] += slope * x[j] / n
        for c in range(k):
            biases[c] -= rate * grad_b[c]
            for j in range(m):
                weights[c][j] -= rate * grad_w[c][j]
        history.append(loss)
    return weights, biases, history


def predict_species(weights, biases, x):
    """The most probable species for these measurements, and all three probabilities."""
    probs = softmax(scores_for(weights, biases, x))
    best = probs.index(max(probs))
    return SPECIES[best], probs
