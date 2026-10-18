// The Python reference for every piece the learner builds, one entry per function.
// These strings are what the lessons show, step through and grade against, and what a later
// lesson's code is built on when the learner hasn't written that piece yet ("your toolbox").
// world.js is the JavaScript twin; pieces.test.js runs these on real Pyodide and compares.

export const CONSTANTS = `import math
import random
ACTIONS = ["left", "up", "right", "down"]
OFFSETS = {"left": (0, -1), "up": (-1, 0), "right": (0, 1), "down": (1, 0)}
STEP, BUMP, GOAL = -0.04, -0.75, 1.0`

export const PIECES = {
  parse_map: {
    lesson: 'maps',
    code: `def parse_map(text):
    lines = [line.strip() for line in text.strip().splitlines() if line.strip()]
    width = len(lines[0])
    cells, start, goal = {}, None, None
    for r, line in enumerate(lines):
        if len(line) != width:
            raise ValueError(f"row {r} has {len(line)} squares, expected {width}")
        for c, ch in enumerate(line):
            if ch not in "#.SG":
                raise ValueError(f"unknown square {ch!r} at row {r}, column {c}")
            cells[(r, c)] = ch
            if ch == "S":
                if start is not None:
                    raise ValueError("more than one S")
                start = (r, c)
            if ch == "G":
                if goal is not None:
                    raise ValueError("more than one G")
                goal = (r, c)
    if start is None or goal is None:
        raise ValueError("a map needs one S and one G")
    return {"rows": len(lines), "cols": width, "cells": cells, "start": start, "goal": goal}`,
  },
  legal_moves: {
    lesson: 'maps',
    code: `def legal_moves(maze, cell):
    r, c = cell
    moves = {}
    for action in ACTIONS:
        dr, dc = OFFSETS[action]
        nxt = (r + dr, c + dc)
        if nxt in maze["cells"] and maze["cells"][nxt] != "#":
            moves[action] = nxt
    return moves`,
  },
  move_chances: {
    lesson: 'moves',
    code: `def move_chances(action, slip):
    chances = {a: slip / 4 for a in ACTIONS}
    chances[action] += 1 - slip
    return chances`,
  },
  build_table: {
    lesson: 'moves',
    code: `def build_table(maze, slip=0.0):
    table = {}
    for cell, ch in maze["cells"].items():
        if ch == "#":
            continue
        table[cell] = {}
        if cell == maze["goal"]:
            continue
        moves = legal_moves(maze, cell)
        for action in ACTIONS:
            merged = {}
            for executed, p in move_chances(action, slip).items():
                if p == 0:
                    continue
                if executed in moves:
                    nxt = moves[executed]
                    reward = GOAL if nxt == maze["goal"] else STEP
                else:
                    nxt, reward = cell, BUMP
                merged[(nxt, reward)] = merged.get((nxt, reward), 0.0) + p
            table[cell][action] = [(p, nxt, reward) for (nxt, reward), p in merged.items()]
    return table`,
  },
  sample_outcome: {
    lesson: 'episodes',
    code: `def sample_outcome(outcomes, u):
    running = 0.0
    for p, nxt, reward in outcomes:
        running += p
        if u < running:
            return nxt, reward
    p, nxt, reward = outcomes[-1]
    return nxt, reward`,
  },
  play_episode: {
    lesson: 'episodes',
    code: `def play_episode(table, start, choose, rng, cap=100):
    state, path, total = start, [start], 0.0
    while table[state] and len(path) <= cap:
        action = choose(state)
        state, reward = sample_outcome(table[state][action], rng.random())
        path.append(state)
        total += reward
    return path, total`,
  },
  expected_value: {
    lesson: 'averages',
    code: `def expected_value(pairs):
    return sum(p * x for p, x in pairs)`,
  },
  option_values: {
    lesson: 'averages',
    code: `def option_values(table, state, values, g=1.0):
    return {action: sum(p * (reward + g * values[nxt]) for p, nxt, reward in outcomes)
            for action, outcomes in table[state].items()}`,
  },
  best_option: {
    lesson: 'averages',
    code: `def best_option(row):
    best_action, best_value = None, None
    for action, value in row.items():
        if best_value is None or value > best_value:
            best_action, best_value = action, value
    return best_action, best_value`,
  },
  steps_to_goal: {
    lesson: 'backfill',
    code: `def steps_to_goal(maze):
    dist = {maze["goal"]: 0}
    queue = [maze["goal"]]
    while queue:
        cell = queue.pop(0)
        for nxt in legal_moves(maze, cell).values():
            if nxt not in dist:
                dist[nxt] = dist[cell] + 1
                queue.append(nxt)
    return dist`,
  },
  sweep_values: {
    lesson: 'backfill',
    code: `def sweep_values(table, g=1.0, tol=1e-9, max_sweeps=1000):
    values = {s: 0.0 for s in table}
    for sweep in range(1, max_sweeps + 1):
        biggest = 0.0
        for s in table:
            if not table[s]:
                continue
            new = best_option(option_values(table, s, values, g))[1]
            biggest = max(biggest, abs(new - values[s]))
            values[s] = new
        if biggest < tol:
            return values, sweep
    return values, max_sweeps`,
  },
  discounted_total: {
    lesson: 'discount',
    code: `def discounted_total(rewards, g):
    total = 0.0
    for t, r in enumerate(rewards):
        total += g ** t * r
    return total`,
  },
  horizon: {
    lesson: 'discount',
    code: `def horizon(g, weight=0.01):
    t = 0
    while g ** t >= weight:
        t += 1
    return t`,
  },
  greedy_plan: {
    lesson: 'plans',
    code: `def greedy_plan(table, values, g=1.0):
    return {s: best_option(option_values(table, s, values, g))[0] for s in table if table[s]}`,
  },
  evaluate_plan: {
    lesson: 'plans',
    code: `def evaluate_plan(table, plan, g=0.9, tol=1e-9, max_sweeps=10000):
    values = {s: 0.0 for s in table}
    for sweep in range(max_sweeps):
        biggest = 0.0
        for s, action in plan.items():
            new = sum(p * (r + g * values[n]) for p, n, r in table[s][action])
            biggest = max(biggest, abs(new - values[s]))
            values[s] = new
        if biggest < tol:
            break
    return values`,
  },
  plan_maze: {
    lesson: 'value-iteration',
    code: `def plan_maze(text, slip=0.0, g=0.9):
    maze = parse_map(text)
    table = build_table(maze, slip)
    values, sweeps = sweep_values(table, g)
    return greedy_plan(table, values, g), values`,
  },
  policy_iteration: {
    lesson: 'value-iteration',
    code: `def policy_iteration(table, g=0.9, start="right"):
    plan = {s: start for s in table if table[s]}
    rounds = 0
    while True:
        rounds += 1
        values = evaluate_plan(table, plan, g)
        better = {}
        for s in plan:
            row = option_values(table, s, values, g)
            best_action, best_value = best_option(row)
            better[s] = plan[s] if row[plan[s]] >= best_value - 1e-12 else best_action
        if better == plan:
            return plan, values, rounds
        plan = better`,
  },
  estimate: {
    lesson: 'sampling',
    code: `def estimate(draw, n, rng):
    total = 0.0
    for _ in range(n):
        total += draw(rng)
    return total / n`,
  },
  estimate_outcomes: {
    lesson: 'sampling',
    code: `def estimate_outcomes(step, state, action, n, rng):
    counts = {}
    for _ in range(n):
        result = step(state, action, rng)
        counts[result] = counts.get(result, 0) + 1
    return [(c / n, nxt, reward) for (nxt, reward), c in counts.items()]`,
  },
  update_mean: {
    lesson: 'running',
    code: `def update_mean(old, x, alpha):
    return old + alpha * (x - old)`,
  },
  running_means: {
    lesson: 'running',
    code: `def running_means(xs, alpha=None):
    guess, out = 0.0, []
    for n, x in enumerate(xs, 1):
        guess = update_mean(guess, x, 1 / n if alpha is None else alpha)
        out.append(guess)
    return out`,
  },
  best: {
    lesson: 'bootstrap',
    code: `def best(row):
    return max(row.values(), default=0.0)`,
  },
  q_update: {
    lesson: 'bootstrap',
    code: `def q_update(q, state, action, reward, nxt, alpha, g):
    target = reward + g * best(q[nxt])
    surprise = target - q[state][action]
    q[state][action] += alpha * surprise
    return surprise`,
  },
  choose: {
    lesson: 'explore',
    code: `def choose(row, eps, rng):
    if rng.random() < eps:
        return rng.choice(ACTIONS)
    top = best(row)
    return rng.choice([a for a in ACTIONS if row[a] == top])`,
  },
  run_bandit: {
    lesson: 'explore',
    code: `def run_bandit(pull, arms, steps, eps, rng):
    guesses = {a: 0.0 for a in arms}
    counts = {a: 0 for a in arms}
    for _ in range(steps):
        if rng.random() < eps:
            arm = rng.choice(arms)
        else:
            arm = max(arms, key=lambda a: guesses[a])
        counts[arm] += 1
        guesses[arm] = update_mean(guesses[arm], pull(arm, rng), 1 / counts[arm])
    return guesses, counts`,
  },
  train: {
    lesson: 'q-learning',
    code: `def train(text, episodes=200, alpha=0.5, g=0.9, eps=0.1, slip=0.0, rng=None):
    rng = rng or random.Random(0)
    maze = parse_map(text)
    table = build_table(maze, slip)
    q = {s: {a: 0.0 for a in table[s]} for s in table}
    for episode in range(episodes):
        state = maze["start"]
        for t in range(200):
            if not table[state]:
                break
            action = choose(q[state], eps, rng)
            nxt, reward = sample_outcome(table[state][action], rng.random())
            q_update(q, state, action, reward, nxt, alpha, g)
            state = nxt
    return q`,
  },
  one_hot: {
    lesson: 'formulas',
    code: `def one_hot(state, states):
    return [1.0 if s == state else 0.0 for s in states]`,
  },
  predict: {
    lesson: 'formulas',
    code: `def predict(w, features):
    return sum(wi * fi for wi, fi in zip(w, features))`,
  },
  nudge: {
    lesson: 'formulas',
    code: `def nudge(w, features, target, alpha):
    error = target - predict(w, features)
    return [wi + alpha * error * fi for wi, fi in zip(w, features)]`,
  },
  slope: {
    lesson: 'slopes',
    code: `def slope(f, x, h=1e-5):
    return (f(x + h) - f(x - h)) / (2 * h)`,
  },
  descend: {
    lesson: 'slopes',
    code: `def descend(f, x, lr, steps):
    xs = [x]
    for _ in range(steps):
        x = x - lr * slope(f, x)
        xs.append(x)
    return xs`,
  },
  fit_step: {
    lesson: 'slopes',
    code: `def fit_step(w, b, data, lr):
    n = len(data)
    dw = sum(2 * (w * x + b - y) * x for x, y in data) / n
    db = sum(2 * (w * x + b - y) for x, y in data) / n
    return w - lr * dw, b - lr * db`,
  },
  forward: {
    lesson: 'layers',
    code: `def forward(params, x):
    hidden = [math.tanh(w * x + b) for w, b in zip(params["w1"], params["b1"])]
    y = sum(v * h for v, h in zip(params["w2"], hidden)) + params["b2"]
    return hidden, y`,
  },
  gradients: {
    lesson: 'layers',
    code: `def gradients(params, x, target):
    hidden, y = forward(params, x)
    dy = 2 * (y - target)
    dz = [dy * v * (1 - h * h) for v, h in zip(params["w2"], hidden)]
    return {"w1": [d * x for d in dz], "b1": dz,
            "w2": [dy * h for h in hidden], "b2": dy}`,
  },
  Replay: {
    lesson: 'batches',
    code: `class Replay:
    def __init__(self, capacity):
        self.capacity = capacity
        self.items = []
    def add(self, item):
        self.items.append(item)
        if len(self.items) > self.capacity:
            self.items.pop(0)
    def sample(self, n, rng):
        return [self.items[int(rng.random() * len(self.items))] for _ in range(n)]`,
  },
  batch_nudge: {
    lesson: 'batches',
    code: `def batch_nudge(w, batch, alpha):
    total = [0.0] * len(w)
    for features, target in batch:
        error = target - predict(w, features)
        for i, f in enumerate(features):
            total[i] += error * f
    return [wi + alpha * t / len(batch) for wi, t in zip(w, total)]`,
  },
  train_formula: {
    lesson: 'deep-q',
    code: `def train_formula(text, features, episodes=300, alpha=0.1, g=0.9, eps=0.2, rng=None, batch=8, capacity=1000):
    rng = rng or random.Random(0)
    maze = parse_map(text)
    table = build_table(maze, 0.0)
    w = {a: [0.0] * len(features(maze["start"])) for a in ACTIONS}
    memory = Replay(capacity)
    def q_row(s):
        return {a: predict(w[a], features(s)) for a in ACTIONS} if table[s] else {}
    for episode in range(episodes):
        state = maze["start"]
        for t in range(200):
            if not table[state]:
                break
            action = choose(q_row(state), eps, rng)
            nxt, reward = sample_outcome(table[state][action], rng.random())
            memory.add((state, action, reward, nxt))
            sample = memory.sample(batch, rng)
            for a in ACTIONS:
                items = [(features(s), r + g * best(q_row(n))) for s, a2, r, n in sample if a2 == a]
                if items:
                    w[a] = batch_nudge(w[a], items, alpha)
            state = nxt
    return w`,
  },
}

// The order a program needs them in (each one only uses the ones above it).
export const PIECE_ORDER = ['parse_map', 'legal_moves', 'move_chances', 'build_table', 'sample_outcome', 'play_episode',
  'expected_value', 'option_values', 'best_option', 'steps_to_goal', 'sweep_values', 'discounted_total', 'horizon', 'greedy_plan', 'evaluate_plan', 'plan_maze', 'policy_iteration',
  'estimate', 'estimate_outcomes', 'update_mean', 'running_means', 'best', 'q_update', 'choose', 'run_bandit', 'train',
  'one_hot', 'predict', 'nudge', 'slope', 'descend', 'fit_step', 'forward', 'gradients', 'Replay', 'batch_nudge', 'train_formula']

// The finished learner, lesson 0. Each line carries the lesson that builds it (see FINISH_TAGS).
export const FINISH = `import random

def best(row):
    return max(row.values(), default=0.0)

def choose(row, eps, rng):
    if rng.random() < eps:
        return rng.choice(ACTIONS)
    top = best(row)
    return rng.choice([a for a in ACTIONS if row[a] == top])

def train(text, episodes=200, alpha=0.5, g=0.9, eps=0.1, slip=0.0, seed=0):
    rng = random.Random(seed)
    maze = parse_map(text)
    table = build_table(maze, slip)
    q = {s: {a: 0.0 for a in table[s]} for s in table}
    for episode in range(episodes):
        state = maze["start"]
        for t in range(200):
            if not table[state]:
                break
            action = choose(q[state], eps, rng)
            nxt, reward = sample_outcome(table[state][action], rng.random())
            target = reward + g * best(q[nxt])
            q[state][action] += alpha * (target - q[state][action])
            state = nxt
    return q`

// Lines of FINISH (matched by the text they contain) and the lesson that builds that idea.
export const FINISH_TAGS = [
  ['maze = parse_map(text)', 'maps', 'Read the map from text'],
  ['table = build_table(maze, slip)', 'moves', 'What every move does, with chances'],
  ['sample_outcome(table[state][action], rng.random())', 'episodes', 'Let chance pick what happens'],
  ['for t in range(200):', 'episodes', 'Play one game, step by step'],
  ['if not table[state]:', 'episodes', 'The goal ends the game'],
  ['rng = random.Random(seed)', 'episodes', 'A seed makes chance repeatable'],
  ['target = reward + g * best(q[nxt])', 'backfill', 'Worth = what you get now + what comes after'],
  ['def best(row):', 'averages', 'Pick the best-looking option'],
  ['g=0.9', 'discount', 'Later rewards count for less'],
  ['q[state][action] += alpha * (target - q[state][action])', 'running', 'Nudge an estimate toward new evidence'],
  ['q = {s: {a: 0.0 for a in table[s]} for s in table}', 'bootstrap', 'A table of guesses that improve each other'],
  ['def choose(row, eps, rng):', 'explore', 'Try something new, or repeat what works'],
]

// Helpers every check program gets: the lesson maps, a loaded dice, and a way to compare answers
// the same way in both languages (tuples as lists, tuple keys as "r,c", numbers rounded).
export const HARNESS = `TINY = """
S.#
#..
##G
"""
SMALL = """
S...
.##.
...G
"""
ICY = """
.#..
.S..
...G
"""
SEVEN = """
S.#....
#.#.##.
....#..
.####.#
....#..
###...#
...##.G
"""

class Dice:
    """A loaded dice: rng.random() hands out these numbers in order."""
    def __init__(self, values):
        self.values = list(values)
    def random(self):
        if not self.values:
            raise RuntimeError("the dice ran out of numbers")
        return self.values.pop(0)
    def choice(self, items):
        return items[int(self.random() * len(items))]

class Seeded:
    """A seeded random generator that gives exactly the same numbers as the lab's page (mulberry32),
    so the checks can replay a whole learning run. Use it like random.Random: .random() and .choice()."""
    def __init__(self, seed):
        self.a = seed & 0xFFFFFFFF
    def random(self):
        self.a = (self.a + 0x6D2B79F5) & 0xFFFFFFFF
        t = self.a
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    def choice(self, items):
        return items[int(self.random() * len(items))]

def error_of(make):
    try:
        make()
    except Exception as e:
        return type(e).__name__
    return None

def sorted_table(table):
    return {cell: {a: sorted(outs, key=repr) for a, outs in moves.items()} for cell, moves in table.items()}

def black_box(table):
    """A world you can only try: step(state, action, rng) gives (next, reward). The table stays hidden."""
    def step(state, action, rng):
        return sample_outcome(table[state][action], rng.random())
    return step

def greedy_route(q, text, cap=100):
    """Follow the highest guess from S with no slips: the squares visited."""
    maze = parse_map(text)
    state, route = maze["start"], [maze["start"]]
    while state != maze["goal"] and len(route) <= cap:
        action = max(ACTIONS, key=lambda a: q[state][a])
        state = legal_moves(maze, state).get(action, state)
        route.append(state)
    return route

def table_features(text):
    """Features that make a formula into a table: a 1 for this square, 0 for every other."""
    maze = parse_map(text)
    squares = [c for c, ch in maze["cells"].items() if ch != "#"]
    return lambda s: one_hot(s, squares)

def coord_features(text):
    """Three features for any square: its row and column scaled to 0..1, and a constant 1."""
    maze = parse_map(text)
    return lambda s: [s[0] / (maze["rows"] - 1), s[1] / (maze["cols"] - 1), 1.0]

def formula_route(w, features, text, cap=100):
    """greedy_route for a formula: the guesses come from predict(w[a], features(s))."""
    maze = parse_map(text)
    q = {s: {a: predict(w[a], features(s)) for a in ACTIONS} for s, ch in maze["cells"].items() if ch != "#"}
    return greedy_route(q, text, cap)`

export const NORMALIZE = `def _ml_key(k):
    if isinstance(k, tuple):
        return ",".join(str(_ml_norm(x)) for x in k)
    return str(_ml_norm(k)) if not isinstance(k, str) else k

def _ml_norm(x):
    if isinstance(x, bool) or x is None or isinstance(x, str):
        return x
    if isinstance(x, (int, float)):
        y = round(float(x), 6)
        if y == 0:
            y = 0.0
        return int(y) if y == int(y) else y
    if isinstance(x, (list, tuple)):
        return [_ml_norm(v) for v in x]
    if isinstance(x, (set, frozenset)):
        return sorted((_ml_norm(v) for v in x), key=repr)
    if isinstance(x, dict):
        return {_ml_key(k): _ml_norm(v) for k, v in x.items()}
    return repr(x)

def _ml_same(a, b):
    # Numbers within 1.5e-6 count as equal: Python and JavaScript round a value that lies exactly
    # half way at the 6th decimal in opposite directions.
    if isinstance(a, bool) or isinstance(b, bool) or a is None or b is None:
        return a == b
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return abs(a - b) <= 1.5e-6
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(_ml_same(x, y) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict):
        return set(a) == set(b) and all(_ml_same(a[k], b[k]) for k in a)
    return a == b`

// For CodeLens, where every line is stepped: only the helpers and maps that the code or the call
// mentions, so the learner reaches their own code quickly.
export function lensPrelude(uses = [], mine = {}, text = '') {
  const blocks = []
  for (const line of HARNESS.split('\n')) {
    if (/^(\w+ = |class |def )/.test(line) || !blocks.length) blocks.push(line)
    else blocks[blocks.length - 1] += `\n${line}`
  }
  const named = blocks.map(b => [(/^(?:class |def )?(\w+)/.exec(b) ?? [])[1], b.trimEnd()])
  const pieces = PIECE_ORDER.filter(p => uses.includes(p)).map(p => mine[p] ?? PIECES[p].code)
  // A helper can call another helper (formula_route calls greedy_route): keep adding until nothing new is needed.
  let all = [text, ...pieces].join('\n')
  const keep = new Set()
  for (let grew = true; grew;) {
    grew = false
    for (const [name, block] of named) {
      if (name && !keep.has(name) && new RegExp(`\\b${name}\\b`).test(all)) { keep.add(name); all += `\n${block}`; grew = true }
    }
  }
  const wanted = named.filter(([name]) => keep.has(name)).map(([, b]) => b)
  return [CONSTANTS, ...wanted, ...pieces].join('\n\n')
}

// The program a lesson's code builds on: constants, the harness, and the pieces it uses,
// each either the learner's own passed version or the reference.
export function prelude(uses = [], mine = {}) {
  const parts = [CONSTANTS, HARNESS]
  for (const name of PIECE_ORDER) if (uses.includes(name)) parts.push(mine[name] ?? PIECES[name].code)
  return parts.join('\n\n')
}
