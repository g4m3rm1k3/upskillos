import math
import random


def make_line(n=20, seed=0):
    """n made-up points near the line y = 2x + 1: x between 0 and 5, each y off the line by up to 1."""
    rng = random.Random(seed)
    xs, ys = [], []
    for i in range(n):
        x = rng.uniform(0, 5)
        y = 2 * x + 1 + rng.uniform(-1, 1)
        xs.append(x)
        ys.append(y)
    return xs, ys


def make_curve(n=40, seed=0):
    """n made-up points near the curve y = sin(x), x between -3 and 3: no straight line fits them."""
    rng = random.Random(seed)
    xs, ys = [], []
    for i in range(n):
        x = rng.uniform(-3, 3)
        y = math.sin(x) + rng.uniform(-0.1, 0.1)
        xs.append(x)
        ys.append(y)
    return xs, ys
