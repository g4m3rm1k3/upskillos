import math
import random


def make_blobs(n=40, seed=0):
    """Two clouds of made-up points: label 0 around (-1, -1), label 1 around (1, 1), overlapping a little."""
    rng = random.Random(seed)
    points, labels = [], []
    for i in range(n):
        label = i % 2
        centre = 1.0 if label == 1 else -1.0
        points.append((centre + rng.uniform(-1.8, 1.8), centre + rng.uniform(-1.8, 1.8)))
        labels.append(label)
    return points, labels


def make_moons(n=100, seed=0):
    """Two interleaved half-moons of made-up points: no straight line can separate them."""
    rng = random.Random(seed)
    points, labels = [], []
    for i in range(n):
        label = i % 2
        angle = rng.uniform(0, math.pi)
        if label == 0:
            x, y = math.cos(angle), math.sin(angle)
        else:
            x, y = 1 - math.cos(angle), 0.5 - math.sin(angle)
        points.append((x + rng.uniform(-0.15, 0.15), y + rng.uniform(-0.15, 0.15)))
        labels.append(label)
    return points, labels
