# Dynamic programming

The last lesson computed the value of a **given** policy exactly, by solving the Bellman expectation equation. The real goal is the **best** policy. When the model of the world is known (all the transition probabilities and rewards), the best policy can be computed outright, by repeatedly applying the Bellman equations until they stop changing. These methods are called **dynamic programming** (DP), a name for solving a big problem by building it from the solutions of smaller, overlapping ones: here, the value of each state from the values of its neighbours.

This lesson builds the two classic DP algorithms, **value iteration** and **policy iteration**, solves the slippery grid world exactly, and watches how the optimal behaviour and its value change as the floor gets more slippery. DP needs a model, which most real problems do not provide; the lessons after this one learn from experience instead. But they all aim at the answer DP computes here.

## Value iteration

The Bellman optimality equation says the optimal value of each state is the best one-step look-ahead:

\[
V^*(s) = \max_a \sum_{s'} P(s' \mid s, a)\,\big[R + \gamma V^*(s')\big]
\]

**Value iteration** turns this equation into an update. Start with any values (zeros). Sweep through the states, replacing each value by the right-hand side computed from the current values. Repeat until the largest change in a sweep is tiny. Each sweep spreads information one step further: after the first, states next to the goal know about it; after the second, states two steps away; and so on. With γ < 1, the process is guaranteed to converge to V*, because each sweep shrinks the error by at least a factor γ.

Once V* is known, an optimal policy simply takes, in each state, the action with the best one-step look-ahead: it is **greedy** with respect to V*.

```python type
import numpy as np

SIZE, PITS, GOAL = 4, {(1, 1), (2, 3)}, (3, 3)
MOVES = [(-1, 0), (1, 0), (0, -1), (0, 1)]
ARROWS = "^v<>"
states = [(r, c) for r in range(SIZE) for c in range(SIZE)]
terminal = PITS | {GOAL}

def move(s, a):
    dr, dc = MOVES[a]
    return (min(max(s[0] + dr, 0), SIZE - 1), min(max(s[1] + dc, 0), SIZE - 1))

def build_model(slip):
    model = {}
    for s in states:
        model[s] = {}
        for a in range(4):
            outcomes = []
            for actual in range(4):
                nxt = move(s, actual)
                reward = 10.0 if nxt == GOAL else -10.0 if nxt in PITS else -1.0
                outcomes.append(((1 - slip) * (actual == a) + slip / 4, nxt, reward, nxt in terminal))
            model[s][a] = outcomes
    return model

def q_values(model, V, s, gamma):
    return [sum(p * (r + (0.0 if done else gamma * V[nxt])) for p, nxt, r, done in model[s][a]) for a in range(4)]

def value_iteration(model, gamma, tolerance=1e-6):
    V = {s: 0.0 for s in states}
    sweeps = 0
    while True:
        sweeps += 1
        largest_change = 0.0
        for s in states:
            if s in terminal:
                continue
            new_value = max(q_values(model, V, s, gamma))
            largest_change = max(largest_change, abs(new_value - V[s]))
            V[s] = new_value
        if largest_change < tolerance:
            return V, sweeps

def show_policy(model, V, gamma):
    for r in range(SIZE):
        row = []
        for c in range(SIZE):
            s = (r, c)
            row.append("G" if s == GOAL else "X" if s in PITS else ARROWS[int(np.argmax(q_values(model, V, s, gamma)))])
        print("  " + " ".join(row))

model = build_model(slip=0.0)
V, sweeps = value_iteration(model, gamma=0.95)
print(f"no slipping: converged in {sweeps} sweeps; value of the start {V[(0, 0)]:.2f}")
show_policy(model, V, 0.95)
```

```output
no slipping: converged in 7 sweeps; value of the start 3.21
  v > v v
  v X v <
  v v v X
  > > > G
```

`value_iteration` updates each state's value in place, so later states in the same sweep already use the new values of earlier ones (this speeds things up and still converges). `show_policy` prints the greedy action in every square as an arrow.

In the deterministic world, value iteration converges in 7 sweeps. The arrows form a shortest route to the goal from every square, steering around the pits. From the start, the value is 3.21: five steps costing −1 and the +10, all discounted by γ = 0.95.

## When the floor gets slippery

Now the same computation at increasing slip probabilities. Before running, predict: as the world gets more random, will the optimal policy change much, and what will happen to the value of the start square?

```python type
import numpy as np

SIZE, PITS, GOAL = 4, {(1, 1), (2, 3)}, (3, 3)
MOVES = [(-1, 0), (1, 0), (0, -1), (0, 1)]
ARROWS = "^v<>"
states = [(r, c) for r in range(SIZE) for c in range(SIZE)]
terminal = PITS | {GOAL}

def move(s, a):
    dr, dc = MOVES[a]
    return (min(max(s[0] + dr, 0), SIZE - 1), min(max(s[1] + dc, 0), SIZE - 1))

def build_model(slip):
    model = {}
    for s in states:
        model[s] = {}
        for a in range(4):
            outcomes = []
            for actual in range(4):
                nxt = move(s, actual)
                reward = 10.0 if nxt == GOAL else -10.0 if nxt in PITS else -1.0
                outcomes.append(((1 - slip) * (actual == a) + slip / 4, nxt, reward, nxt in terminal))
            model[s][a] = outcomes
    return model

def q_values(model, V, s, gamma):
    return [sum(p * (r + (0.0 if done else gamma * V[nxt])) for p, nxt, r, done in model[s][a]) for a in range(4)]

def value_iteration(model, gamma, tolerance=1e-6):
    V = {s: 0.0 for s in states}
    sweeps = 0
    while True:
        sweeps += 1
        largest_change = 0.0
        for s in states:
            if s in terminal:
                continue
            new_value = max(q_values(model, V, s, gamma))
            largest_change = max(largest_change, abs(new_value - V[s]))
            V[s] = new_value
        if largest_change < tolerance:
            return V, sweeps

for slip in [0.0, 0.2, 0.4, 0.6]:
    model = build_model(slip)
    V, sweeps = value_iteration(model, gamma=0.95)
    print(f"slip {slip}: {sweeps:>2} sweeps, value of the start {V[(0, 0)]:6.2f}")
    for r in range(SIZE):
        print("   " + " ".join("G" if (r, c) == GOAL else "X" if (r, c) in PITS
                             else ARROWS[int(np.argmax(q_values(model, V, (r, c), 0.95)))] for c in range(SIZE)))
```

```output
slip 0.0:  7 sweeps, value of the start   3.21
   v > v v
   v X v <
   v v v X
   > > > G
slip 0.2: 20 sweeps, value of the start   0.83
   v > v <
   v X v <
   v v v X
   > > > G
slip 0.4: 29 sweeps, value of the start  -2.53
   v > v <
   v X v <
   v v v X
   > > > G
slip 0.6: 40 sweeps, value of the start  -6.76
   v > v <
   v X v <
   v v v X
   > > > G
```

The value of the start falls steadily, from 3.21 with no slipping to 0.83 at slip 0.2, −2.53 at 0.4 and −6.76 at 0.6: every slip adds steps, and some send the agent into a pit. Value iteration also needs more sweeps as the world gets more random (7, 20, 29, 40), because values now depend on long, uncertain paths.

Without slipping, many moves tie exactly: at the start, down and right both lead to the goal in the same number of steps, and `argmax` simply takes the first (down). That is why the deterministic arrows look cautious; it is the tie-break, not foresight. With slipping, the ties break for real: going down from the start and left from the top-right corner become strictly better, because those routes stay away from the squares beside the pits, where a slip can be fatal. A policy computed with the real probabilities knows where the dangers are.

## Policy iteration

**Policy iteration** alternates two steps:

1. **Evaluate** the current policy exactly (the linear solve from the last lesson).
2. **Improve** it: in every state, switch to the action that is greedy with respect to those values.

Repeat until the policy stops changing. The improvement step can never make the policy worse (the policy improvement theorem), and there are only finitely many deterministic policies, so it must stop, at an optimal policy. Policy iteration typically needs only a handful of iterations, each more expensive (a linear solve) than a value iteration sweep. You will build it in a challenge and confirm it reaches the same answer.

## The curse of dimensionality, again

DP updates every state in every sweep. For 16 squares that is nothing. For backgammon, with around 10²⁰ positions, it is impossible, and for problems with continuous states, such as a robot's joint angles, there is not even a list of states to sweep. DP also needs the model. The rest of the series removes both limitations: Monte Carlo and temporal-difference methods learn from sampled experience without a model, and deep Q-learning replaces the table of values with a neural network that generalises across states.

::: challenge Act greedily [easy]
Write `greedy_policy(model, V, gamma, states, terminal)` returning a dictionary from each **non-terminal** state to its greedy action: the index of the largest one-step look-ahead value Σ p (r + γ V[s']), with V[s'] counted as 0 for outcomes that end the episode. Ties go to the lowest action index (`np.argmax` does this).

```python starter
import numpy as np

def greedy_policy(model, V, gamma, states, terminal):
    return {s: 0 for s in states if s not in terminal}
```

```python solution
import numpy as np

def greedy_policy(model, V, gamma, states, terminal):
    policy = {}
    for s in states:
        if s in terminal:
            continue
        values = [sum(p * (r + (0.0 if done else gamma * V[nxt])) for p, nxt, r, done in model[s][a]) for a in range(4)]
        policy[s] = int(np.argmax(values))
    return policy
```

```python test
import numpy as _np
assert "greedy_policy" in dir(), "Keep the function's name as greedy_policy."
_m = {"A": {0: [(1.0, "B", -1.0, False)], 1: [(1.0, "T", 3.0, True)], 2: [(1.0, "A", -1.0, False)], 3: [(0.5, "B", -1.0, False), (0.5, "T", 3.0, True)]},
      "B": {a: [(1.0, "T", 10.0 if a == 2 else 0.0, True)] for a in range(4)}}
_pol = greedy_policy(_m, {"A": 0.0, "B": 9.0, "T": 100.0}, 0.9, ["A", "B", "T"], {"T"})
assert set(_pol) == {"A", "B"}, "Include only non-terminal states."
assert _pol["A"] == 0, "From A, action 0 is worth −1 + 0.9 × 9 = 7.1, the best; the terminal T's value must count as 0."
assert _pol["B"] == 2, "From B, action 2 earns 10."
_pol2 = greedy_policy(_m, {"A": 0.0, "B": 0.0, "T": 0.0}, 0.9, ["A", "B", "T"], {"T"})
assert _pol2["A"] == 1, "With V(B) = 0, going straight to T for +3 is best from A."
"SUCCESS: Values become behaviour: in each state, take the action with the best one-step look-ahead."
```

Hint: For each non-terminal state, compute the four look-ahead values with a list comprehension and take `int(np.argmax(...))`.
:::

::: challenge Policy iteration [medium]
Write `policy_iteration(model, gamma, states, terminal)` returning `(policy, V, iterations)`: start from the policy that always moves right (action 3) in every non-terminal state; then repeat (1) evaluate the current deterministic policy **exactly**, by solving the linear system (I − γ P_π) v = r as in the last lesson, and (2) replace it with the greedy policy for those values; stop when the policy no longer changes. `policy` maps non-terminal states to actions, `V` maps every state to its value (0 for terminal states), and `iterations` counts the evaluate-and-improve rounds.

Run it on the slippery grid world (slip 0.2, γ = 0.95) built in the starter, and store the results in `policy`, `V` and `iterations`. The test checks the values against value iteration.

```python starter
import numpy as np

SIZE, PITS, GOAL = 4, {(1, 1), (2, 3)}, (3, 3)
MOVES = [(-1, 0), (1, 0), (0, -1), (0, 1)]
states = [(r, c) for r in range(SIZE) for c in range(SIZE)]
terminal = PITS | {GOAL}

def move(s, a):
    dr, dc = MOVES[a]
    return (min(max(s[0] + dr, 0), SIZE - 1), min(max(s[1] + dc, 0), SIZE - 1))

def build_model(slip):
    model = {}
    for s in states:
        model[s] = {}
        for a in range(4):
            outcomes = []
            for actual in range(4):
                nxt = move(s, actual)
                reward = 10.0 if nxt == GOAL else -10.0 if nxt in PITS else -1.0
                outcomes.append(((1 - slip) * (actual == a) + slip / 4, nxt, reward, nxt in terminal))
            model[s][a] = outcomes
    return model

def policy_iteration(model, gamma, states, terminal):
    return {s: 3 for s in states if s not in terminal}, {s: 0.0 for s in states}, 0

policy, V, iterations = policy_iteration(build_model(0.2), 0.95, states, terminal)
print(iterations, V[(0, 0)])
```

```python solution
import numpy as np

SIZE, PITS, GOAL = 4, {(1, 1), (2, 3)}, (3, 3)
MOVES = [(-1, 0), (1, 0), (0, -1), (0, 1)]
states = [(r, c) for r in range(SIZE) for c in range(SIZE)]
terminal = PITS | {GOAL}

def move(s, a):
    dr, dc = MOVES[a]
    return (min(max(s[0] + dr, 0), SIZE - 1), min(max(s[1] + dc, 0), SIZE - 1))

def build_model(slip):
    model = {}
    for s in states:
        model[s] = {}
        for a in range(4):
            outcomes = []
            for actual in range(4):
                nxt = move(s, actual)
                reward = 10.0 if nxt == GOAL else -10.0 if nxt in PITS else -1.0
                outcomes.append(((1 - slip) * (actual == a) + slip / 4, nxt, reward, nxt in terminal))
            model[s][a] = outcomes
    return model

def policy_iteration(model, gamma, states, terminal):
    index = {s: i for i, s in enumerate(states)}
    n = len(states)
    policy = {s: 3 for s in states if s not in terminal}
    iterations = 0
    while True:
        iterations += 1
        P, r = np.zeros((n, n)), np.zeros(n)
        for s, a in policy.items():
            for p, nxt, reward, done in model[s][a]:
                r[index[s]] += p * reward
                if not done:
                    P[index[s], index[nxt]] += p
        v = np.linalg.solve(np.eye(n) - gamma * P, r)
        V = {s: float(v[index[s]]) for s in states}
        new_policy = {}
        for s in policy:
            values = [sum(p * (rw + (0.0 if done else gamma * V[nxt])) for p, nxt, rw, done in model[s][a]) for a in range(4)]
            new_policy[s] = int(np.argmax(values))
        if new_policy == policy:
            return policy, V, iterations
        policy = new_policy

policy, V, iterations = policy_iteration(build_model(0.2), 0.95, states, terminal)
print(iterations, V[(0, 0)])
```

```python test
import numpy as _np
assert "policy_iteration" in dir(), "Keep the function's name as policy_iteration."
_m = build_model(0.2)
_V = {s: 0.0 for s in states}
for _ in range(500):
    for _s in states:
        if _s not in terminal:
            _V[_s] = max(sum(p * (r + (0.0 if d else 0.95 * _V[n])) for p, n, r, d in _m[_s][a]) for a in range(4))
assert all(abs(V[s] - _V[s]) < 1e-6 for s in states), "Your values should match value iteration's optimal values in every state."
assert all(V[s] == 0 for s in terminal), "Terminal states should have value 0."
assert all(policy[s] == int(_np.argmax([sum(p * (r + (0.0 if d else 0.95 * _V[n])) for p, n, r, d in _m[s][a]) for a in range(4)])) for s in policy), "Your policy should be greedy with respect to the optimal values."
assert 1 < iterations < 10, f"Policy iteration usually needs only a handful of rounds; you reported {iterations}."
f"SUCCESS: Policy iteration reached the optimal policy in {iterations} evaluate-and-improve rounds, matching value iteration exactly: value of the start {V[(0, 0)]:.2f}."
```

Hint: Inside a `while True` loop: build P and r for the current policy (each state uses its single chosen action), solve for v, turn it into a dictionary, compute the greedy policy, and return if it equals the current one.
:::

::: challenge The price of slipping [medium]
Using value iteration, find how slippery the world can get before the start square's optimal value drops below zero, meaning the best possible behaviour now expects to lose. Write `start_value(slip, gamma=0.95)` that builds the model, runs value iteration (in-place sweeps, until the largest change is below 1e-6), and returns the optimal value of (0, 0). Then store, in `threshold`, the smallest slip in `np.round(np.arange(0, 1.0001, 0.05), 2)` whose start value is negative.

```python starter
import numpy as np

SIZE, PITS, GOAL = 4, {(1, 1), (2, 3)}, (3, 3)
MOVES = [(-1, 0), (1, 0), (0, -1), (0, 1)]
states = [(r, c) for r in range(SIZE) for c in range(SIZE)]
terminal = PITS | {GOAL}

def move(s, a):
    dr, dc = MOVES[a]
    return (min(max(s[0] + dr, 0), SIZE - 1), min(max(s[1] + dc, 0), SIZE - 1))

def build_model(slip):
    model = {}
    for s in states:
        model[s] = {}
        for a in range(4):
            outcomes = []
            for actual in range(4):
                nxt = move(s, actual)
                reward = 10.0 if nxt == GOAL else -10.0 if nxt in PITS else -1.0
                outcomes.append(((1 - slip) * (actual == a) + slip / 4, nxt, reward, nxt in terminal))
            model[s][a] = outcomes
    return model

def start_value(slip, gamma=0.95):
    return 0.0

threshold = None
print(threshold)
```

```python solution
import numpy as np

SIZE, PITS, GOAL = 4, {(1, 1), (2, 3)}, (3, 3)
MOVES = [(-1, 0), (1, 0), (0, -1), (0, 1)]
states = [(r, c) for r in range(SIZE) for c in range(SIZE)]
terminal = PITS | {GOAL}

def move(s, a):
    dr, dc = MOVES[a]
    return (min(max(s[0] + dr, 0), SIZE - 1), min(max(s[1] + dc, 0), SIZE - 1))

def build_model(slip):
    model = {}
    for s in states:
        model[s] = {}
        for a in range(4):
            outcomes = []
            for actual in range(4):
                nxt = move(s, actual)
                reward = 10.0 if nxt == GOAL else -10.0 if nxt in PITS else -1.0
                outcomes.append(((1 - slip) * (actual == a) + slip / 4, nxt, reward, nxt in terminal))
            model[s][a] = outcomes
    return model

def start_value(slip, gamma=0.95):
    model = build_model(slip)
    V = {s: 0.0 for s in states}
    while True:
        change = 0.0
        for s in states:
            if s in terminal:
                continue
            new = max(sum(p * (r + (0.0 if d else gamma * V[n])) for p, n, r, d in model[s][a]) for a in range(4))
            change = max(change, abs(new - V[s]))
            V[s] = new
        if change < 1e-6:
            return V[(0, 0)]

threshold = next(float(slip) for slip in np.round(np.arange(0, 1.0001, 0.05), 2) if start_value(slip) < 0)
print(threshold)
```

```python test
import numpy as _np
assert "start_value" in dir(), "Keep the function's name as start_value."
def _sv(slip, gamma=0.95):
    m = build_model(slip); V = {s: 0.0 for s in states}
    while True:
        ch = 0.0
        for s in states:
            if s in terminal:
                continue
            nv = max(sum(p * (r + (0.0 if d else gamma * V[n])) for p, n, r, d in m[s][a]) for a in range(4))
            ch = max(ch, abs(nv - V[s])); V[s] = nv
        if ch < 1e-6:
            return V[(0, 0)]
for _sl in (0.0, 0.3):
    assert abs(start_value(_sl) - _sv(_sl)) < 1e-4, f"start_value({_sl}) should be about {_sv(_sl):.3f}."
_grid = _np.round(_np.arange(0, 1.0001, 0.05), 2)
_want = next(float(x) for x in _grid if _sv(x) < 0)
assert threshold is not None and _np.isclose(threshold, _want), f"threshold should be the first slip in the grid with a negative start value."
f"SUCCESS: Once the floor slips {threshold:.0%} of the time, even perfect play expects to lose from the start square: the goal's +10 no longer pays for the extra steps and the pits."
```

Hint: Value iteration returns as soon as a sweep changes no value by more than 1e-6. For the threshold, loop over the slips in order and stop at the first with a negative start value (`next(...)` with a generator does this neatly).
:::

## What you learned

- Dynamic programming computes optimal values and policies when the model is known, by applying the Bellman equations repeatedly.
- Value iteration sweeps all states with V(s) ← maxₐ Σ P (R + γV(s')) until values stop changing; acting greedily on V* gives an optimal policy.
- Policy iteration alternates exact evaluation (a linear solve) and greedy improvement, and stops in a few rounds.
- In the grid world, slipping lowered the start's optimal value from 3.21 (no slip) to −6.76 (slip 0.6) and slowed convergence; the optimal policy kept away from the pits throughout.
- DP needs a model and a sweep over every state: impractical for large or unknown worlds, which the next lessons address by learning from experience.

The next lesson learns values with no model at all: Monte Carlo methods play complete episodes and average the returns that actually followed each state.
