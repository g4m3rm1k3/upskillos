# Markov decision processes

The bandit lesson had actions and rewards but no consequences: pulling an arm did not change the machines. In the grid world, every move changes where the agent is, and so what it can do next and what it can earn. To reason about such problems precisely, reinforcement learning describes them as **Markov decision processes** (MDPs). Once the grid world is written as an MDP, the value of every state under any policy can be **calculated**, not just estimated by running episodes, and the equations that do it, the **Bellman equations**, are the foundation of every method in the rest of the series.

This lesson defines MDPs, writes the slippery grid world as one (a table of transition probabilities), introduces **value functions** V and Q, derives the Bellman expectation equation, and solves it exactly as a system of linear equations, then checks the answer against simulation.

## The ingredients

An MDP consists of:

- a set of **states** S (the 16 squares of the grid);
- a set of **actions** A (up, down, left, right);
- **transition probabilities** P(s' | s, a): the probability of landing in state s' after taking action a in state s;
- **rewards** R(s, a, s'): the reward received for that transition;
- a **discount factor** γ.

The word **Markov** names the key assumption: the next state and reward depend only on the **current** state and action, not on how the agent got there. The state must contain everything relevant. For the grid world, the square is enough; for a game like chess, the board (plus whose turn it is) is enough; for a moving ball, its position alone is not, since you also need its velocity. If the state is chosen well, the past adds nothing.

## The grid world as a table

Here is the slippery grid world from the earlier lesson written out as an MDP. For every state and action, the model lists the possible outcomes as tuples (probability, next state, reward, done). With slip probability 0.2, the intended move happens with probability 0.8 + 0.2/4 = 0.85, and each of the other three moves with 0.05 (a slip picks one of the four moves at random, which may be the intended one).

```python type
import numpy as np

SIZE, PITS, GOAL = 4, {(1, 1), (2, 3)}, (3, 3)
MOVES = [(-1, 0), (1, 0), (0, -1), (0, 1)]
NAMES = ["up", "down", "left", "right"]
states = [(r, c) for r in range(SIZE) for c in range(SIZE)]
terminal = PITS | {GOAL}

def move(state, action):
    dr, dc = MOVES[action]
    return (min(max(state[0] + dr, 0), SIZE - 1), min(max(state[1] + dc, 0), SIZE - 1))

def build_model(slip):
    model = {}
    for s in states:
        model[s] = {}
        for a in range(4):
            outcomes = []
            for actual in range(4):
                p = (1 - slip) * (actual == a) + slip / 4
                nxt = move(s, actual)
                reward = 10.0 if nxt == GOAL else -10.0 if nxt in PITS else -1.0
                outcomes.append((p, nxt, reward, nxt in terminal))
            model[s][a] = outcomes
    return model

model = build_model(0.2)
for p, nxt, reward, done in model[(2, 2)][3]:
    print(f"from (2, 2), trying right: probability {p:.2f} -> {nxt}, reward {reward:+.0f}, episode ends {done}")
print("probabilities add to", sum(p for p, *_ in model[(2, 2)][3]))
```

```output
from (2, 2), trying right: probability 0.05 -> (1, 2), reward -1, episode ends False
from (2, 2), trying right: probability 0.05 -> (3, 2), reward -1, episode ends False
from (2, 2), trying right: probability 0.05 -> (2, 1), reward -1, episode ends False
from (2, 2), trying right: probability 0.85 -> (2, 3), reward -10, episode ends True
probabilities add to 1.0
```

`model[s][a]` is the list of outcomes for taking action a in state s. From square (2, 2), trying to go right lands in the pit at (2, 3) with probability 0.85, ending the episode with −10; with probability 0.05 each, a slip sends the agent up, down or left instead, each costing the usual −1. Writing the world out like this assumes we **know** its rules, which is called having a **model** of the environment. This lesson and the next use the model; later lessons learn without one.

## Value functions

How good is it to be in a state? It depends on what the agent will do from there, so values are defined **for a policy** π:

- The **state value** V^π(s) is the expected return starting from state s and following π.
- The **action value** Q^π(s, a) is the expected return starting from s, taking action a first, and following π afterwards.

"Expected" means averaged over everything random: slips, and the policy's own choices if it is stochastic. Terminal states have value 0: nothing more will happen there. Q tells the agent which action is best in each state; it is the quantity that Q-learning, in a later lesson, learns directly.

## The Bellman expectation equation

The return satisfies Gₜ = rₜ₊₁ + γGₜ₊₁. Taking expectations of both sides gives a relation between the value of a state and the values of the states that can follow it:

\[
V^\pi(s) = \sum_a \pi(a \mid s) \sum_{s'} P(s' \mid s, a)\,\big[ R(s, a, s') + \gamma V^\pi(s') \big]
\]

In words: the value of a state is the average, over the actions the policy might take and the outcomes each might have, of the immediate reward plus the discounted value of where you land. This is the **Bellman expectation equation**. There is one such equation for every non-terminal state, and the unknowns V^π(s) appear linearly. So it is a **system of linear equations**, which the linear systems lesson showed how to solve: with the values of all states as a vector v, it reads v = r + γ P_π v, where P_π[i, j] is the probability of moving from state i to state j under the policy and r[i] the expected immediate reward. Rearranged, (I − γ P_π) v = r.

```python type
import numpy as np

SIZE, PITS, GOAL = 4, {(1, 1), (2, 3)}, (3, 3)
MOVES = [(-1, 0), (1, 0), (0, -1), (0, 1)]
states = [(r, c) for r in range(SIZE) for c in range(SIZE)]
terminal = PITS | {GOAL}
index = {s: i for i, s in enumerate(states)}

def move(state, action):
    dr, dc = MOVES[action]
    return (min(max(state[0] + dr, 0), SIZE - 1), min(max(state[1] + dc, 0), SIZE - 1))

def build_model(slip):
    model = {}
    for s in states:
        model[s] = {}
        for a in range(4):
            outcomes = []
            for actual in range(4):
                p = (1 - slip) * (actual == a) + slip / 4
                nxt = move(s, actual)
                reward = 10.0 if nxt == GOAL else -10.0 if nxt in PITS else -1.0
                outcomes.append((p, nxt, reward, nxt in terminal))
            model[s][a] = outcomes
    return model

def evaluate(model, policy, gamma):
    n = len(states)
    P, r = np.zeros((n, n)), np.zeros(n)
    for s in states:
        if s in terminal:
            continue
        for a, pa in enumerate(policy[s]):
            for p, nxt, reward, done in model[s][a]:
                r[index[s]] += pa * p * reward
                if not done:
                    P[index[s], index[nxt]] += pa * p
    return np.linalg.solve(np.eye(n) - gamma * P, r)

random_policy = {s: [0.25] * 4 for s in states}
planned = {s: [0, 0, 0, 1] if s[1] < 2 else ([0, 1, 0, 0] if s[0] < 3 else [0, 0, 0, 1]) for s in states}
model = build_model(0.2)
for name, policy in [("random", random_policy), ("planned route", planned)]:
    V = evaluate(model, policy, gamma=1.0)
    print(f"{name}: value of the start square {V[0]:.2f}")
    print(V.reshape(4, 4).round(1))
```

```output
random: value of the start square -18.30
[[-18.3 -16.4 -17.9 -18.6]
 [-16.2   0.  -14.6 -15.4]
 [-17.3 -14.1 -12.    0. ]
 [-17.7 -14.   -6.3   0. ]]
planned route: value of the start square -1.16
[[-1.2  0.5  2.3 -9.9]
 [-9.   0.   4.3 -9.4]
 [ 3.5  5.2  7.2  0. ]
 [ 6.8  8.2  9.6  0. ]]
```

A policy is now written as a table of action probabilities per state: the random policy gives each action 0.25, and the planned route from the earlier lesson puts probability 1 on one action. `evaluate` fills in P_π and r by summing over the policy's actions and each action's outcomes; transitions into a terminal state contribute their reward but no future value, so they are left out of P_π. Then `np.linalg.solve` finds all 16 values at once. With γ = 1 the system can still be solved here, because with slipping, every policy eventually ends the episode (without slips, a policy that walked into a wall for ever would never finish).

The printed grids show the value of every square: the start square's value is the first entry. Compare with the earlier lesson, which **estimated** these by running 2,000 episodes: the random policy averaged about −18.2 there (exact: −18.3), and the planned route about −0.8 (exact: −1.16). The second gap is simulation noise: the returns vary so much from episode to episode that an average of 2,000 of them is only accurate to about ±0.2 (40,000 episodes give −1.17 ± 0.04). The exact calculation has no such noise, and needs no episodes at all. The grids also show where the danger is. Under the planned route, the squares whose chosen move heads towards a pit, (1, 0) and (0, 3), are worth only about −9 to −10. Under the random policy the picture differs: squares near any terminal square, pit or goal, score better than the start, because the aimless wandering ends sooner there.

## From values to better actions

Given V^π, the value of each action in a state follows from one step of look-ahead:

\[
Q^\pi(s, a) = \sum_{s'} P(s' \mid s, a)\,\big[ R(s, a, s') + \gamma V^\pi(s') \big]
\]

If, in some state, an action has a higher Q^π than the policy's own choice, then switching to it improves the policy. Repeating "evaluate, then switch to the best action everywhere" is **policy iteration**, and the values it converges to satisfy the **Bellman optimality equation**:

\[
V^*(s) = \max_a \sum_{s'} P(s' \mid s, a)\,\big[ R(s, a, s') + \gamma V^*(s') \big]
\]

The same as before, but taking the **best** action instead of averaging over a policy. Solving it gives the optimal values, and acting greedily with respect to them is an optimal policy. Because of the max, it is no longer a linear system; the next lesson solves it by iteration.

::: challenge Action values from state values [easy]
Write `q_values(model, V, s, gamma)` returning a list of the 4 action values Q(s, a) for state `s`, using the one-step look-ahead formula: for each outcome (p, s', r, done) of action a, add p × (r + γ V[s']), but with V[s'] counted as 0 when `done` is `True`. `V` is a dictionary from states to values.

```python starter
def q_values(model, V, s, gamma):
    return [0.0, 0.0, 0.0, 0.0]
```

```python solution
def q_values(model, V, s, gamma):
    values = []
    for a in range(4):
        total = 0.0
        for p, nxt, reward, done in model[s][a]:
            total += p * (reward + (0.0 if done else gamma * V[nxt]))
        values.append(total)
    return values
```

```python test
import numpy as _np
assert "q_values" in dir(), "Keep the function's name as q_values."
_model = {"A": {0: [(1.0, "B", -1.0, False)], 1: [(0.5, "A", 0.0, False), (0.5, "T", 5.0, True)], 2: [(1.0, "A", 0.0, False)], 3: [(0.2, "T", 10.0, True), (0.8, "B", -1.0, False)]}}
_V = {"A": 2.0, "B": 4.0, "T": 100.0}
_q = q_values(_model, _V, "A", 0.9)
assert len(_q) == 4, "Return one value per action."
assert _np.isclose(_q[0], -1 + 0.9 * 4), "Action 0: reward −1 then the discounted value of B."
assert _np.isclose(_q[1], 0.5 * (0 + 0.9 * 2) + 0.5 * 5.0), "Action 1 mixes two outcomes by their probabilities; the terminal outcome contributes only its reward, whatever V says about T."
assert _np.isclose(_q[3], 0.2 * 10 + 0.8 * (-1 + 0.9 * 4)), "Action 3 is wrong."
"SUCCESS: One step of look-ahead turns state values into action values, telling the agent which move is best."
```

Hint: Loop over the four actions, and inside over the outcomes `(p, nxt, reward, done)`. Use `0.0 if done else gamma * V[nxt]` for the future part.
:::

::: challenge Exact values by linear algebra [medium]
Write `policy_values(model, policy, gamma, states, terminal)` returning a dictionary from each state to its value under `policy` (a dictionary from states to lists of 4 action probabilities), by setting up and solving (I − γ P_π) v = r as in the lesson. Terminal states get value 0.

Then check it against simulation on a **new** world: the starter builds a 3 × 5 cliff-edge world (bottom row middle squares are a cliff, worth −20 and ending the episode; the bottom-right corner is the goal). Store the exact value of the start state (2, 0) under the starter's `cautious` policy, with γ = 1, in `exact_start`, and the starter's Monte Carlo estimate of the same quantity in `simulated_start`.

```python starter
import numpy as np

ROWS, COLS = 3, 5
CLIFF, GOAL = {(2, 1), (2, 2), (2, 3)}, (2, 4)
MOVES = [(-1, 0), (1, 0), (0, -1), (0, 1)]
states = [(r, c) for r in range(ROWS) for c in range(COLS)]
terminal = CLIFF | {GOAL}

def move(s, a):
    dr, dc = MOVES[a]
    return (min(max(s[0] + dr, 0), ROWS - 1), min(max(s[1] + dc, 0), COLS - 1))

def build_model(slip):
    model = {}
    for s in states:
        model[s] = {}
        for a in range(4):
            outs = []
            for actual in range(4):
                nxt = move(s, actual)
                reward = 10.0 if nxt == GOAL else -20.0 if nxt in CLIFF else -1.0
                outs.append(((1 - slip) * (actual == a) + slip / 4, nxt, reward, nxt in terminal))
            model[s][a] = outs
    return model

def policy_values(model, policy, gamma, states, terminal):
    return {s: 0.0 for s in states}

model = build_model(0.1)
cautious = {s: [1, 0, 0, 0] if s[0] == 2 and s[1] == 0 else ([0, 0, 0, 1] if s[1] < 4 else [0, 1, 0, 0]) for s in states}
cautious[(1, 0)] = [1, 0, 0, 0]
cautious[(1, 4)] = [0, 1, 0, 0]

rng = np.random.default_rng(0)
totals = []
for _ in range(20000):
    s, total = (2, 0), 0.0
    for _ in range(200):
        a = rng.choice(4, p=cautious[s])
        outs = model[s][a]
        p, s, reward, done = outs[rng.choice(4, p=[o[0] for o in outs])]
        total += reward
        if done:
            break
    totals.append(total)
simulated_start = float(np.mean(totals))

exact_start = 0.0
print(exact_start, simulated_start)
```

```python solution
import numpy as np

ROWS, COLS = 3, 5
CLIFF, GOAL = {(2, 1), (2, 2), (2, 3)}, (2, 4)
MOVES = [(-1, 0), (1, 0), (0, -1), (0, 1)]
states = [(r, c) for r in range(ROWS) for c in range(COLS)]
terminal = CLIFF | {GOAL}

def move(s, a):
    dr, dc = MOVES[a]
    return (min(max(s[0] + dr, 0), ROWS - 1), min(max(s[1] + dc, 0), COLS - 1))

def build_model(slip):
    model = {}
    for s in states:
        model[s] = {}
        for a in range(4):
            outs = []
            for actual in range(4):
                nxt = move(s, actual)
                reward = 10.0 if nxt == GOAL else -20.0 if nxt in CLIFF else -1.0
                outs.append(((1 - slip) * (actual == a) + slip / 4, nxt, reward, nxt in terminal))
            model[s][a] = outs
    return model

def policy_values(model, policy, gamma, states, terminal):
    index = {s: i for i, s in enumerate(states)}
    n = len(states)
    P, r = np.zeros((n, n)), np.zeros(n)
    for s in states:
        if s in terminal:
            continue
        for a, pa in enumerate(policy[s]):
            for p, nxt, reward, done in model[s][a]:
                r[index[s]] += pa * p * reward
                if not done:
                    P[index[s], index[nxt]] += pa * p
    v = np.linalg.solve(np.eye(n) - gamma * P, r)
    return {s: float(v[index[s]]) for s in states}

model = build_model(0.1)
cautious = {s: [1, 0, 0, 0] if s[0] == 2 and s[1] == 0 else ([0, 0, 0, 1] if s[1] < 4 else [0, 1, 0, 0]) for s in states}
cautious[(1, 0)] = [1, 0, 0, 0]
cautious[(1, 4)] = [0, 1, 0, 0]

rng = np.random.default_rng(0)
totals = []
for _ in range(20000):
    s, total = (2, 0), 0.0
    for _ in range(200):
        a = rng.choice(4, p=cautious[s])
        outs = model[s][a]
        p, s, reward, done = outs[rng.choice(4, p=[o[0] for o in outs])]
        total += reward
        if done:
            break
    totals.append(total)
simulated_start = float(np.mean(totals))

exact_start = policy_values(model, cautious, 1.0, states, terminal)[(2, 0)]
print(exact_start, simulated_start)
```

```python test
import numpy as _np
assert "policy_values" in dir(), "Keep the function's name as policy_values."
_sts = ["A", "B", "T"]
_m = {"A": {a: [(1.0, "B", -1.0, False)] for a in range(4)}, "B": {a: [(0.5, "A", -1.0, False), (0.5, "T", 4.0, True)] for a in range(4)}, "T": {a: [(1.0, "T", 0.0, True)] for a in range(4)}}
_pol = {s: [0.25] * 4 for s in _sts}
_v = policy_values(_m, _pol, 0.9, _sts, {"T"})
_vB = (0.5 * -1 + 0.5 * 4 + 0.5 * 0.9 * -1) / (1 - 0.5 * 0.81)
_vA = -1 + 0.9 * _vB
assert _np.isclose(_v["B"], _vB) and _np.isclose(_v["A"], _vA) and _v["T"] == 0, f"For the small three-state model the values should be A = {_vA:.4f}, B = {_vB:.4f}, T = 0. Transitions into a terminal state add their reward but no future value."
assert abs(exact_start - simulated_start) < 0.15, f"The exact value ({exact_start:.3f}) and the simulation ({simulated_start:.3f}) should agree closely."
assert exact_start != 0.0, "Compute exact_start with policy_values."
f"SUCCESS: The exact value of the start, {exact_start:.2f}, from one linear solve; 20,000 simulated episodes give {simulated_start:.2f}. The Bellman equation and the simulation describe the same thing."
```

Hint: Follow the lesson's `evaluate`, building a state-to-index dictionary first, and turn the solution vector back into a dictionary at the end. Transitions that end the episode add `pa * p * reward` to `r` but nothing to `P`.
:::

::: challenge A corridor model [medium]
Write `corridor_model(n, slip)` for a corridor of `n` squares numbered 0 to n − 1, with the agent able to move left (action 0) or right (action 1). Moving left from square 0 stays at 0. Reaching square n − 1 gives reward +5 and ends the episode; every other move gives −1. With probability `slip` the move goes the **opposite** way to the one chosen. Return a dictionary `model[s][a]` (for squares 0 to n − 2) of outcome lists `(probability, next square, reward, done)`, each list holding the intended outcome first and the slipped outcome second, even when both land on the same square.

```python starter
def corridor_model(n, slip):
    return {}
```

```python solution
def corridor_model(n, slip):
    model = {}
    for s in range(n - 1):
        model[s] = {}
        for a in (0, 1):
            outcomes = []
            for direction, p in ((a, 1 - slip), (1 - a, slip)):
                nxt = max(s - 1, 0) if direction == 0 else s + 1
                done = nxt == n - 1
                outcomes.append((p, nxt, 5.0 if done else -1.0, done))
            model[s][a] = outcomes
    return model
```

```python test
import numpy as _np
assert "corridor_model" in dir(), "Keep the function's name as corridor_model."
_m = corridor_model(4, 0.1)
assert sorted(_m) == [0, 1, 2], "The model should cover squares 0 to n − 2 (the last square is terminal)."
assert all(sorted(_m[s]) == [0, 1] for s in _m), "Each square should have actions 0 (left) and 1 (right)."
assert all(_np.isclose(sum(o[0] for o in _m[s][a]), 1.0) for s in _m for a in (0, 1)), "Each action's outcome probabilities should add to 1."
assert [tuple(o) for o in _m[0][0]] == [(0.9, 0, -1.0, False), (0.1, 1, -1.0, False)], f"From square 0, going left stays at 0 (probability 0.9) or slips right to 1 (0.1); got {_m[0][0]}."
assert [tuple(o) for o in _m[2][1]] == [(0.9, 3, 5.0, True), (0.1, 1, -1.0, False)], f"From square 2, going right reaches the goal 3 (reward 5, done) with 0.9, or slips left to 1; got {_m[2][1]}."
assert [tuple(o) for o in _m[1][0]] == [(0.9, 0, -1.0, False), (0.1, 2, -1.0, False)], "From square 1, going left reaches 0, or slips right to 2."
"SUCCESS: A world written as an MDP: for every state and action, the possible outcomes with their probabilities, rewards and endings."
```

Hint: For each square and action, build two outcomes: the intended direction with probability `1 - slip`, then the opposite direction with probability `slip`. Left is `max(s - 1, 0)`, right is `s + 1`.
:::

## What you learned

- An MDP has states, actions, transition probabilities P(s' | s, a), rewards and a discount; the Markov property says the next state depends only on the current state and action.
- A model lists, for every state and action, the possible outcomes with their probabilities, rewards and whether the episode ends.
- V^π(s) is the expected return from s following π; Q^π(s, a) the expected return taking a first, then following π. Terminal states have value 0.
- The Bellman expectation equation, V^π(s) = Σ π(a|s) Σ P(s'|s,a)[R + γV^π(s')], is a linear system, solvable exactly as (I − γP_π)v = r; its answers matched simulation.
- Q follows from V by one step of look-ahead, and switching to better actions improves a policy. The Bellman optimality equation replaces the average over the policy with a max over actions.

The next lesson solves the optimality equation: policy iteration and value iteration compute the best possible policy for the grid world, and show how its behaviour changes as the world gets more slippery.
