import math


def softmax(scores):
    """Scores into probabilities that add up to 1: e to the power of each, divided by the total."""
    top = max(scores)
    powers = [math.exp(s - top) for s in scores]
    total = sum(powers)
    return [p / total for p in powers]


def cross_entropy(probs, label):
    """Minus the log of the probability given to the true class."""
    return -math.log(probs[label])


def one_hot(label, n_classes):
    """A class number as a list with a 1 in that place and 0 everywhere else."""
    row = [0.0] * n_classes
    row[label] = 1.0
    return row
