# Lesson 5.4's second prediction: which of three unit directions climbs the bowl x² + 10y² fastest from (2, 1).
import math


def bowl(x, y):
    return x ** 2 + 10 * y ** 2


size = math.sqrt(4 ** 2 + 20 ** 2)
directions = {"along x": (1.0, 0.0), "along y": (0.0, 1.0), "gradient's": (4 / size, 20 / size)}
rises = {name: bowl(2 + 0.01 * dx, 1 + 0.01 * dy) - bowl(2, 1) for name, (dx, dy) in directions.items()}
print(max(rises, key=rises.get))
