"""Drivers written by hand, to measure the learners against: random, flat out, and a careful rule."""
import random
from kart import SUNLIT, drive
from observe import sensors


def random_driver(seed=0):
    """A driver that picks any of the five actions, all equally likely."""
    rng = random.Random(seed)
    return lambda state, cars, track: rng.randrange(5)


def flat_out(state, cars, track):
    """Always accelerate."""
    return 3


def careful(state, cars, track):
    """Look ahead in every lane. If this lane is in danger, move to the safest lane next to it; otherwise speed up."""
    near = sensors(state, cars, track)
    lane = state["lane"]
    if near[lane] == 0:
        return 3
    best = lane
    for side in (lane - 1, lane + 1):
        if 0 <= side <= 2 and near[side] < near[best]:
            best = side
    if best < lane:
        return 0
    if best > lane:
        return 2
    return 4 if state["speed"] > 0 else 1


def measure(driver, laps=30, track=SUNLIT, seed=800001):
    """How a driver does over many single laps: the fraction finished and the average hits."""
    finished = 0
    hits = 0
    for i in range(laps):
        state = drive(driver, seed + i * 97, track)
        finished += 1 if state["finished"] else 0
        hits += state["crashes"]
    return finished / laps, hits / laps


def try_careful(laps=30):
    """The careful driver on held-out laps of Sunlit Circuit: its finish rate and average hits."""
    return measure(careful, laps)
