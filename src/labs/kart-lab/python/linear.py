"""Q-learning with a linear function instead of a table: each action's value is weights times features."""
import random
from kart import SUNLIT, reset, step
from observe import sensors
from tabular import DEFAULTS, argmax, cars_at


def features(state, cars, track):
    """15 numbers describing the situation relative to the kart: speed, and how close danger is on the left, ahead, right."""
    near = sensors(state, cars, track)
    x = [1.0]
    for s in range(3):
        x.append(1.0 if state["speed"] == s else 0.0)
    for side in (-1, 0, 1):
        lane = state["lane"] + side
        for level in range(3):
            x.append(1.0 if 0 <= lane <= 2 and near[lane] == level else 0.0)
    x.append(1.0 if state["lane"] == 0 else 0.0)
    x.append(1.0 if state["lane"] == 2 else 0.0)
    return x


def q_values(weights, x):
    """Every action's value: the dot product of its weights with the features."""
    values = []
    for a in range(5):
        total = 0.0
        for w, xi in zip(weights[a], x):
            total += w * xi
        values.append(total)
    return values


def train(episodes=2500, alpha=0.02, gamma=0.95, epsilon=0.9, floor=0.04, penalty=6, seed=42, track=SUNLIT):
    """Semi-gradient Q-learning: after each decision, move the chosen action's weights by α × TD error × features."""
    config = dict(DEFAULTS, traffic=True)
    rng = random.Random(seed)
    weights = [[0.0] * 15 for _ in range(5)]
    for episode in range(episodes):
        lap_seed = rng.randrange(100000)
        state = reset(lap_seed)
        eps = floor + (epsilon - floor) * max(0, 1 - episode / max(1, episodes * 0.8))
        x = features(state, cars_at(0, lap_seed, config, track), track)
        while not state["done"]:
            if rng.random() < eps:
                action = rng.randrange(5)
            else:
                action = argmax(q_values(weights, x))
            next_state = step(state, action, track, cars_at(state["ticks"], lap_seed, config, track), penalty)
            next_x = features(next_state, cars_at(next_state["ticks"], lap_seed, config, track), track)
            future = 0.0 if next_state["done"] else max(q_values(weights, next_x))
            error = next_state["last"]["reward"] + gamma * future - q_values(weights, x)[action]
            for i in range(15):
                weights[action][i] += alpha * error * x[i]
            state, x = next_state, next_x
    return weights


def evaluate(weights, track=SUNLIT, laps=50, penalty=6):
    """Frozen test laps on held-out seeds: the fraction finished and the average hits."""
    config = dict(DEFAULTS, traffic=True)
    finished = 0
    hits = 0
    for i in range(laps):
        seed = 800001 + i * 97
        state = reset(seed)
        while not state["done"]:
            cars = cars_at(state["ticks"], seed, config, track)
            action = argmax(q_values(weights, features(state, cars, track)))
            state = step(state, action, track, cars, penalty)
        finished += 1 if state["finished"] else 0
        hits += state["crashes"]
    return finished / laps, hits / laps


def driver(weights):
    """A frozen driver from learned weights."""
    return lambda state, cars, track: argmax(q_values(weights, features(state, cars, track)))
