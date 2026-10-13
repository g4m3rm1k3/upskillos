"""Learning to drive with a table: ε-greedy actions and Q-learning, SARSA or Double Q-learning updates."""
import random
from kart import SUNLIT, reset, scripted_traffic, step
from observe import observe, sensor_key

DEFAULTS = {"method": "q", "view": "sector", "episodes": 2500, "alpha": 0.18, "gamma": 0.95,
            "epsilon": 0.9, "floor": 0.04, "penalty": 6, "traffic": True, "seed": 42}


def row(Q, key):
    """The five action values of one observation, made (all 0.0) the first time it is seen."""
    if key not in Q:
        Q[key] = [0.0] * 5
    return Q[key]


def argmax(values):
    """The action with the biggest value. Ties go to Coast (action 1), then to the first in order."""
    best = 1
    for a in range(5):
        if values[a] > values[best]:
            best = a
    return best


def action_values(tables, key):
    """What the driver chooses by: one table's row, or for Double Q-learning the two tables added."""
    total = [0.0] * 5
    for Q in tables:
        if key in Q:
            for a in range(5):
                total[a] += Q[key][a]
    return total


def choose(tables, key, epsilon, rng):
    """ε-greedy: with chance ε a random action, otherwise the best one."""
    if rng.random() < epsilon:
        return rng.randrange(5)
    return argmax(action_values(tables, key))


def update(tables, method, key, action, reward, next_key, done, next_action, alpha, gamma, rng):
    """One learning step: move Q(key, action) toward reward + γ × the value of the next observation."""
    Q = tables[0]
    other = tables[0]
    if method == "double":
        if rng.random() < 0.5:
            Q, other = tables[0], tables[1]
        else:
            Q, other = tables[1], tables[0]
    if method == "sarsa":
        chosen = next_action
    else:
        chosen = argmax(row(Q, next_key))
    future = 0.0 if done else row(other, next_key)[chosen]
    target = reward + gamma * future
    values = row(Q, key)
    before = values[action]
    values[action] = before + alpha * (target - before)
    return {"before": before, "target": target, "after": values[action], "future": future, "chosen": chosen}


def key_of(view, state, cars, track):
    """The observation the table is indexed by: the sector observation, or the sensors."""
    if view == "sensors":
        return sensor_key(state, cars, track)
    return observe(state, cars, track)


def cars_at(tick, seed, config, track):
    """The scripted practice traffic at this tick, or none."""
    return scripted_traffic(tick, seed, track) if config["traffic"] else []


def train_episode(tables, config, episode, rng, track=SUNLIT):
    """One practice lap, learning after every decision. Each lap starts from a random seed and lane."""
    seed = rng.randrange(100000)
    state = reset(seed)
    epsilon = config["floor"] + (config["epsilon"] - config["floor"]) * max(0, 1 - episode / max(1, config["episodes"] * 0.8))
    key = key_of(config["view"], state, cars_at(0, seed, config, track), track)
    action = choose(tables, key, epsilon, rng)
    while not state["done"]:
        next_state = step(state, action, track, cars_at(state["ticks"], seed, config, track), config["penalty"])
        next_key = key_of(config["view"], next_state, cars_at(next_state["ticks"], seed, config, track), track)
        next_action = choose(tables, next_key, epsilon, rng)
        update(tables, config["method"], key, action, next_state["last"]["reward"], next_key,
               next_state["done"], next_action, config["alpha"], config["gamma"], rng)
        state, key, action = next_state, next_key, next_action
    return state


def train(config=DEFAULTS, track=SUNLIT):
    """Train a driver from empty tables. Gives the tables and each practice lap's total reward."""
    config = dict(DEFAULTS, **config)
    rng = random.Random(config["seed"])
    tables = [{}, {}] if config["method"] == "double" else [{}]
    totals = []
    for episode in range(config["episodes"]):
        state = train_episode(tables, config, episode, rng, track)
        totals.append(state["total"])
    return tables, totals


def evaluate(tables, config=DEFAULTS, track=SUNLIT, laps=50):
    """Frozen test laps on seeds training never uses: no exploring, no learning. Finish rate and average hits."""
    config = dict(DEFAULTS, **config)
    finished = 0
    hits = 0
    for i in range(laps):
        seed = 800001 + i * 97
        state = reset(seed)
        while not state["done"]:
            cars = cars_at(state["ticks"], seed, config, track)
            action = argmax(action_values(tables, key_of(config["view"], state, cars, track)))
            state = step(state, action, track, cars, config["penalty"])
        finished += 1 if state["finished"] else 0
        hits += state["crashes"]
    return finished / laps, hits / laps


def driver(tables, view="sector"):
    """A frozen driver from learned tables: always the greedy action, never learning."""
    return lambda state, cars, track: argmax(action_values(tables, key_of(view, state, cars, track)))
