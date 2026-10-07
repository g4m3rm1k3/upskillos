# Monte Carlo methods

Dynamic programming needs the model of the world: every transition probability and reward. A robot, a game opponent or a customer does not hand you that table. What you can do is **try things** and see what happens. **Monte Carlo** (MC) methods learn values from experience alone: play complete episodes, record the return that actually followed each state, and average. The name comes from the casino, as in the probability lessons: use random sampling to estimate what you cannot calculate.

This lesson uses Monte Carlo to **evaluate** a policy without a model, checking the estimate against the exact value from the MDP lesson, and then to **improve** behaviour, learning action values Q(s, a) with ε-greedy exploration until the agent finds a good route through the slippery grid world on its own.

## The idea

The value of a state is the **expected** return from it. An expectation can be estimated by averaging samples. So: run an episode; for every state the agent visited, compute the return that followed that visit (the returns-to-go from the RL problem lesson); add it to that state's list of returns. After many episodes, each state's average return estimates its value.

Two versions differ in what counts when a state is visited more than once in an episode. **First-visit** MC uses only the return after the first visit; **every-visit** MC uses all of them. Both converge to the true values; this lesson uses first-visit.

The environment below is the slippery grid world, now offering only a `reset` and a `step`: the agent never looks inside the model, it only experiences outcomes.

```python type
import numpy as np

SIZE, PITS, GOAL = 4, {(1, 1), (2, 3)}, (3, 3)
MOVES = [(-1, 0), (1, 0), (0, -1), (0, 1)]
states = [(r, c) for r in range(SIZE) for c in range(SIZE)]
terminal = PITS | {GOAL}

class SlipperyGrid:
    def __init__(self, slip=0.2, seed=0):
        self.slip, self.rng = slip, np.random.default_rng(seed)

    def reset(self):
        self.state = (0, 0)
        return self.state

    def step(self, action):
        if self.rng.random() < self.slip:
            action = int(self.rng.integers(4))
        dr, dc = MOVES[action]
        self.state = (min(max(self.state[0] + dr, 0), SIZE - 1), min(max(self.state[1] + dc, 0), SIZE - 1))
        if self.state == GOAL:
            return self.state, 10.0, True
        if self.state in PITS:
            return self.state, -10.0, True
        return self.state, -1.0, False

gamma = 0.95
env, rng = SlipperyGrid(seed=0), np.random.default_rng(1)
returns = {s: [] for s in states}
for episode in range(3000):
    state, trajectory = env.reset(), []
    for _ in range(200):
        action = int(rng.integers(4))
        next_state, reward, done = env.step(action)
        trajectory.append((state, reward))
        state = next_state
        if done:
            break
    G, first_visit_return = 0.0, {}
    for s, reward in reversed(trajectory):
        G = reward + gamma * G
        first_visit_return[s] = G
    for s, G_s in first_visit_return.items():
        returns[s].append(G_s)

estimate = {s: np.mean(r) for s, r in returns.items() if r}
print(f"Monte Carlo estimate of the random policy's value at the start: {estimate[(0, 0)]:.2f} (from {len(returns[(0, 0)])} episodes)")
print("exact value with γ = 0.95, from the MDP lesson's Bellman-equation solver: -12.83")
print("estimated values (blank: never visited or terminal):")
for r in range(SIZE):
    print("  " + " ".join(f"{estimate[(r, c)]:6.1f}" if (r, c) in estimate and (r, c) not in terminal else "     ." for c in range(SIZE)))
```

```output
Monte Carlo estimate of the random policy's value at the start: -12.85 (from 3000 episodes)
exact value with γ = 0.95, from the MDP lesson's Bellman-equation solver: -12.83
estimated values (blank: never visited or terminal):
   -12.8  -12.2  -12.7  -13.1
   -12.0      .  -11.2  -11.8
   -11.8  -10.2   -9.2      .
   -11.4   -9.2   -4.2      .
```

The returns are computed backwards through the episode with G ← r + γG, exactly as in the returns-to-go challenge. Because the loop runs backwards, a state visited twice has its dictionary entry overwritten by the **earlier** visit's return, which is the first-visit return. Each state's returns are then averaged.

From 3,000 episodes of random play, the estimate for the start square is −12.85, against the exact −12.83 that the MDP lesson's `evaluate` gives for this policy with γ = 0.95 (that lesson printed the γ = 1 value, −18.3). Monte Carlo got there without ever seeing a transition probability. The price is data: an estimate is only as good as the number of episodes that passed through the state, and its error shrinks like 1/√(number of visits).

## From evaluation to control: learning Q

To **improve** a policy without a model, state values are not enough: choosing the best action from V needs a one-step look-ahead, which needs the model. So model-free methods learn **action values** Q(s, a) directly: the average return after taking action a in state s. Then the best action is simply the one with the largest Q(s, a), with no model required.

Learning Q while acting creates the bandit lesson's dilemma in every state: if the agent always takes its current best action, it never learns the values of the others. The standard fix is the same as there: act **ε-greedily**, taking a random action with probability ε. The loop is:

1. Play an episode with the ε-greedy policy for the current Q.
2. For each (state, action) pair visited, update Q towards the return that followed it, with the incremental mean.
3. Repeat. As Q improves, so does the ε-greedy policy built from it.

This is **on-policy Monte Carlo control**. Before running, predict: after 10,000 episodes, will the greedy policy from the learned Q match the optimal policy computed by dynamic programming?

```python type
import numpy as np

SIZE, PITS, GOAL = 4, {(1, 1), (2, 3)}, (3, 3)
MOVES = [(-1, 0), (1, 0), (0, -1), (0, 1)]
ARROWS = "^v<>"
states = [(r, c) for r in range(SIZE) for c in range(SIZE)]
terminal = PITS | {GOAL}

class SlipperyGrid:
    def __init__(self, slip=0.2, seed=0):
        self.slip, self.rng = slip, np.random.default_rng(seed)

    def reset(self):
        self.state = (0, 0)
        return self.state

    def step(self, action):
        if self.rng.random() < self.slip:
            action = int(self.rng.integers(4))
        dr, dc = MOVES[action]
        self.state = (min(max(self.state[0] + dr, 0), SIZE - 1), min(max(self.state[1] + dc, 0), SIZE - 1))
        if self.state == GOAL:
            return self.state, 10.0, True
        if self.state in PITS:
            return self.state, -10.0, True
        return self.state, -1.0, False

gamma, epsilon = 0.95, 0.1
env, rng = SlipperyGrid(seed=2), np.random.default_rng(3)
Q = {s: np.zeros(4) for s in states}
N = {s: np.zeros(4) for s in states}
for episode in range(1, 10001):
    state, trajectory = env.reset(), []
    for _ in range(200):
        if rng.random() < epsilon:
            action = int(rng.integers(4))
        else:
            action = int(np.argmax(Q[state] + rng.random(4) * 1e-9))
        next_state, reward, done = env.step(action)
        trajectory.append((state, action, reward))
        state = next_state
        if done:
            break
    G, first = 0.0, {}
    for s, a, reward in reversed(trajectory):
        G = reward + gamma * G
        first[(s, a)] = G
    for (s, a), G_sa in first.items():
        N[s][a] += 1
        Q[s][a] += (G_sa - Q[s][a]) / N[s][a]
    if episode in (100, 1000, 10000):
        print(f"after {episode:>5} episodes: best Q at the start {Q[(0, 0)].max():.2f}")

optimal = {(0, 0): 1, (0, 1): 3, (0, 2): 1, (0, 3): 2, (1, 0): 1, (1, 2): 1, (1, 3): 2,
           (2, 0): 1, (2, 1): 1, (2, 2): 1, (3, 0): 3, (3, 1): 3, (3, 2): 3}
learned = {s: int(np.argmax(Q[s])) for s in optimal}
print(f"learned greedy action matches the optimal one in {sum(learned[s] == optimal[s] for s in optimal)} of {len(optimal)} squares")
for r in range(SIZE):
    print("  " + " ".join("G" if (r, c) == GOAL else "X" if (r, c) in PITS else ARROWS[learned[(r, c)]] for c in range(SIZE)))
```

```output
after   100 episodes: best Q at the start -11.14
after  1000 episodes: best Q at the start -2.69
after 10000 episodes: best Q at the start -0.69
learned greedy action matches the optimal one in 12 of 13 squares
  v > v v
  v X v <
  v v v X
  > > > G
```

`optimal` holds the actions found by value iteration in the dynamic programming lesson for this world (slip 0.2, γ = 0.95), for comparison only: the learner never sees it. `rng.random(4) * 1e-9` breaks ties randomly, since every Q starts at 0.

The learned greedy policy agrees with the optimal one in most squares, including the important ones: the start heads down the safe left column, and the squares beside the pits steer away from them. The one square where it disagrees, the top-right corner, is rarely visited, so its estimates are still rough. Notice also that the best Q at the start stays below the optimal value of 0.83: Monte Carlo is estimating the value of the **ε-greedy** policy it is actually following, and taking a random action 10% of the time, sometimes into a pit, costs something. Reducing ε over time (for example ε = 1/episode^0.5) lets the policy become greedy in the limit.

## Strengths and weaknesses

Monte Carlo methods need no model, make no assumptions about the world (not even the Markov property is needed for evaluation), and their estimates are **unbiased**: each sample is a real return. But they have two drawbacks:

- **They must wait until the end of an episode** to update anything, which is slow for long episodes and impossible for tasks that never end.
- **Their estimates are noisy**: a return adds up many random rewards, so its variance is high, and many episodes are needed.

The next lesson fixes both with **temporal-difference learning**, which updates after every single step by combining one real reward with the current estimate of what comes next.

::: challenge First-visit returns [easy]
Write `first_visit_returns(states, rewards, gamma)` for one episode, where `states[t]` is the state at step t and `rewards[t]` the reward received after it. Return a dictionary mapping each distinct state to the discounted return following its **first** visit.

```python starter
def first_visit_returns(states, rewards, gamma):
    return {}

print(first_visit_returns(["A", "B", "A", "C"], [1.0, 2.0, 3.0, 4.0], 0.5))
```

```python solution
def first_visit_returns(states, rewards, gamma):
    G, result = 0.0, {}
    for s, r in zip(reversed(states), reversed(rewards)):
        G = r + gamma * G
        result[s] = G
    return result

print(first_visit_returns(["A", "B", "A", "C"], [1.0, 2.0, 3.0, 4.0], 0.5))
```

```python test
import math as _m
assert "first_visit_returns" in dir(), "Keep the function's name as first_visit_returns."
_g = first_visit_returns(["A", "B", "A", "C"], [1.0, 2.0, 3.0, 4.0], 0.5)
assert set(_g) == {"A", "B", "C"}, "There should be one entry per distinct state."
assert _m.isclose(_g["C"], 4.0) and _m.isclose(_g["B"], 2 + 0.5 * 3 + 0.25 * 4), "C's return is 4; B's is 2 + 0.5 × 3 + 0.25 × 4 = 4.5."
assert _m.isclose(_g["A"], 1 + 0.5 * 2 + 0.25 * 3 + 0.125 * 4), "A was visited twice: use the return after its FIRST visit, 1 + 0.5 × 2 + 0.25 × 3 + 0.125 × 4 = 3.25 (the second visit's return would be 5)."
assert first_visit_returns([], [], 0.9) == {}, "An empty episode has no returns."
"SUCCESS: One pass backwards gives every state's first-visit return, the raw material of Monte Carlo learning."
```

Hint: Go backwards through the episode, updating G = r + γG at each step and writing it into the dictionary for that state. A later write (from an earlier step) overwrites any earlier one, leaving the first visit's return.
:::

::: challenge How noisy is Monte Carlo? [medium]
Estimate the random policy's value at the start square from batches of episodes, and see how the error shrinks with more data. Write `mc_start_value(episodes, seed)` that runs `episodes` episodes of random play in `SlipperyGrid(seed=seed)` (the starter's class) with `rng = np.random.default_rng(seed + 100)` choosing each action as `int(rng.integers(4))`, and returns the average discounted return from the start (γ = 0.95, at most 200 steps per episode).

Then, for each episode count in `[30, 300, 3000]`, compute the estimate for seeds 0 to 9 and store in `spread` a dictionary from the count to the standard deviation of those 10 estimates.

```python starter
import numpy as np

SIZE, PITS, GOAL = 4, {(1, 1), (2, 3)}, (3, 3)
MOVES = [(-1, 0), (1, 0), (0, -1), (0, 1)]

class SlipperyGrid:
    def __init__(self, slip=0.2, seed=0):
        self.slip, self.rng = slip, np.random.default_rng(seed)

    def reset(self):
        self.state = (0, 0)
        return self.state

    def step(self, action):
        if self.rng.random() < self.slip:
            action = int(self.rng.integers(4))
        dr, dc = MOVES[action]
        self.state = (min(max(self.state[0] + dr, 0), SIZE - 1), min(max(self.state[1] + dc, 0), SIZE - 1))
        if self.state == GOAL:
            return self.state, 10.0, True
        if self.state in PITS:
            return self.state, -10.0, True
        return self.state, -1.0, False

def mc_start_value(episodes, seed):
    return 0.0

spread = {}
print(spread)
```

```python solution
import numpy as np

SIZE, PITS, GOAL = 4, {(1, 1), (2, 3)}, (3, 3)
MOVES = [(-1, 0), (1, 0), (0, -1), (0, 1)]

class SlipperyGrid:
    def __init__(self, slip=0.2, seed=0):
        self.slip, self.rng = slip, np.random.default_rng(seed)

    def reset(self):
        self.state = (0, 0)
        return self.state

    def step(self, action):
        if self.rng.random() < self.slip:
            action = int(self.rng.integers(4))
        dr, dc = MOVES[action]
        self.state = (min(max(self.state[0] + dr, 0), SIZE - 1), min(max(self.state[1] + dc, 0), SIZE - 1))
        if self.state == GOAL:
            return self.state, 10.0, True
        if self.state in PITS:
            return self.state, -10.0, True
        return self.state, -1.0, False

def mc_start_value(episodes, seed):
    env, rng = SlipperyGrid(seed=seed), np.random.default_rng(seed + 100)
    totals = []
    for _ in range(episodes):
        env.reset()
        G, discount = 0.0, 1.0
        for _ in range(200):
            _, reward, done = env.step(int(rng.integers(4)))
            G += discount * reward
            discount *= 0.95
            if done:
                break
        totals.append(G)
    return float(np.mean(totals))

spread = {n: float(np.std([mc_start_value(n, seed) for seed in range(10)])) for n in [30, 300, 3000]}
print(spread)
```

```python test
import numpy as _np
assert "mc_start_value" in dir(), "Keep the function's name as mc_start_value."
def _ref(n, seed):
    env, g = SlipperyGrid(seed=seed), _np.random.default_rng(seed + 100); tot = []
    for _ in range(n):
        env.reset(); G, disc = 0.0, 1.0
        for _ in range(200):
            _, r, d = env.step(int(g.integers(4))); G += disc * r; disc *= 0.95
            if d:
                break
        tot.append(G)
    return float(_np.mean(tot))
assert _np.isclose(mc_start_value(50, 3), _ref(50, 3)), "mc_start_value(50, 3) differs from the expected estimate. Use SlipperyGrid(seed=seed) and np.random.default_rng(seed + 100) for the actions, discounting each reward by 0.95 per step."
assert sorted(spread) == [30, 300, 3000], "spread should have keys 30, 300 and 3000."
assert spread[30] > spread[300] > spread[3000], "More episodes should give less spread."
assert 2 < spread[30] / spread[3000] < 30, "The spread should shrink roughly like 1/√(episodes): about 10 times from 30 to 3000 episodes."
f"SUCCESS: The estimate's spread falls from {spread[30]:.2f} with 30 episodes to {spread[300]:.2f} with 300 and {spread[3000]:.2f} with 3000: shrinking roughly like 1/√n, the rule from the estimation lesson (with only 10 seeds per size, the spreads are themselves noisy, so the ratios are rough)."
```

Hint: Inside each episode, keep a running `discount` that starts at 1 and is multiplied by 0.95 after each step, adding `discount * reward` to the return. Then compute the standard deviation of the 10 estimates for each episode count.
:::

::: challenge Decaying exploration [medium]
On-policy Monte Carlo with a fixed ε learns the value of an ε-greedy policy, which keeps exploring for ever. Write `mc_control(episodes, epsilon_schedule, seed)` returning `Q` (a dictionary from states to arrays of 4 action values), following the lesson's algorithm but choosing ε for episode k (counting from 1) as `epsilon_schedule(k)`. Use `SlipperyGrid(seed=seed)` and `rng = np.random.default_rng(seed + 1)` for the agent's choices, and in each episode draw `rng.random()` for the ε test, then `rng.integers(4)` if exploring, or the greedy action with random tie-breaking (`Q[state] + rng.random(4) * 1e-9`) if not.

Then run 6,000 episodes with seed 0 and the schedule ε = 1/√k, and store the best Q value at the start in `start_value_decaying`.

```python starter
import numpy as np

SIZE, PITS, GOAL = 4, {(1, 1), (2, 3)}, (3, 3)
MOVES = [(-1, 0), (1, 0), (0, -1), (0, 1)]
states = [(r, c) for r in range(SIZE) for c in range(SIZE)]

class SlipperyGrid:
    def __init__(self, slip=0.2, seed=0):
        self.slip, self.rng = slip, np.random.default_rng(seed)

    def reset(self):
        self.state = (0, 0)
        return self.state

    def step(self, action):
        if self.rng.random() < self.slip:
            action = int(self.rng.integers(4))
        dr, dc = MOVES[action]
        self.state = (min(max(self.state[0] + dr, 0), SIZE - 1), min(max(self.state[1] + dc, 0), SIZE - 1))
        if self.state == GOAL:
            return self.state, 10.0, True
        if self.state in PITS:
            return self.state, -10.0, True
        return self.state, -1.0, False

def mc_control(episodes, epsilon_schedule, seed):
    return {s: np.zeros(4) for s in states}

start_value_decaying = 0.0
print(start_value_decaying)
```

```python solution
import numpy as np

SIZE, PITS, GOAL = 4, {(1, 1), (2, 3)}, (3, 3)
MOVES = [(-1, 0), (1, 0), (0, -1), (0, 1)]
states = [(r, c) for r in range(SIZE) for c in range(SIZE)]

class SlipperyGrid:
    def __init__(self, slip=0.2, seed=0):
        self.slip, self.rng = slip, np.random.default_rng(seed)

    def reset(self):
        self.state = (0, 0)
        return self.state

    def step(self, action):
        if self.rng.random() < self.slip:
            action = int(self.rng.integers(4))
        dr, dc = MOVES[action]
        self.state = (min(max(self.state[0] + dr, 0), SIZE - 1), min(max(self.state[1] + dc, 0), SIZE - 1))
        if self.state == GOAL:
            return self.state, 10.0, True
        if self.state in PITS:
            return self.state, -10.0, True
        return self.state, -1.0, False

def mc_control(episodes, epsilon_schedule, seed):
    env, rng = SlipperyGrid(seed=seed), np.random.default_rng(seed + 1)
    Q = {s: np.zeros(4) for s in states}
    N = {s: np.zeros(4) for s in states}
    for k in range(1, episodes + 1):
        epsilon = epsilon_schedule(k)
        state, trajectory = env.reset(), []
        for _ in range(200):
            if rng.random() < epsilon:
                action = int(rng.integers(4))
            else:
                action = int(np.argmax(Q[state] + rng.random(4) * 1e-9))
            next_state, reward, done = env.step(action)
            trajectory.append((state, action, reward))
            state = next_state
            if done:
                break
        G, first = 0.0, {}
        for s, a, reward in reversed(trajectory):
            G = reward + 0.95 * G
            first[(s, a)] = G
        for (s, a), G_sa in first.items():
            N[s][a] += 1
            Q[s][a] += (G_sa - Q[s][a]) / N[s][a]
    return Q

Q = mc_control(6000, lambda k: 1 / np.sqrt(k), 0)
start_value_decaying = float(Q[(0, 0)].max())
print(start_value_decaying)
```

```python test
import numpy as _np
assert "mc_control" in dir(), "Keep the function's name as mc_control."
def _ref(episodes, sched, seed):
    env, g = SlipperyGrid(seed=seed), _np.random.default_rng(seed + 1)
    Q = {s: _np.zeros(4) for s in states}; N = {s: _np.zeros(4) for s in states}
    for k in range(1, episodes + 1):
        eps = sched(k); s, traj = env.reset(), []
        for _ in range(200):
            a = int(g.integers(4)) if g.random() < eps else int(_np.argmax(Q[s] + g.random(4) * 1e-9))
            n, r, d = env.step(a); traj.append((s, a, r)); s = n
            if d:
                break
        G, first = 0.0, {}
        for st, a, r in reversed(traj):
            G = r + 0.95 * G; first[(st, a)] = G
        for (st, a), Gv in first.items():
            N[st][a] += 1; Q[st][a] += (Gv - Q[st][a]) / N[st][a]
    return Q
_small = mc_control(200, lambda k: 0.2, 5)
_rs = _ref(200, lambda k: 0.2, 5)
assert all(_np.allclose(_small[s], _rs[s]) for s in states), "With a constant ε your Q values differ from the lesson's algorithm. Check the order of random draws and that only first visits update Q."
_want = float(_ref(6000, lambda k: 1 / _np.sqrt(k), 0)[(0, 0)].max())
assert _np.isclose(start_value_decaying, _want), "start_value_decaying should be the best Q value at the start after running your function for 6,000 episodes with seed 0 and ε = 1/√k."
f"SUCCESS: With ε shrinking as 1/√k, the agent explores heavily at first and acts almost greedily later; after 6,000 episodes its estimate at the start is {start_value_decaying:.2f}. That is lower than the fixed-ε run, not higher: the incremental mean averages over **every** return ever seen, including the early, almost random episodes (ε starts at 1), and never forgets them. The policy does become greedy, but plain averaging makes the values catch up very slowly. A constant step size, as in the next lesson's TD methods, forgets old episodes and fixes this."
```

Hint: The only change from the lesson's loop is computing `epsilon = epsilon_schedule(k)` at the start of each episode. Pass the schedule as `lambda k: 1 / np.sqrt(k)`.
:::

## What you learned

- Monte Carlo methods learn from complete episodes without a model: a state's value is estimated by averaging the returns that followed visits to it (first-visit or every-visit).
- Returns are computed in one backwards pass with G ← r + γG. The random policy's estimate (−12.85 from 3,000 episodes) matched the exact −12.83.
- Without a model, control needs action values Q(s, a); acting ε-greedily on Q and updating it with first-visit returns (on-policy MC control) learned a good route through the slippery grid.
- With fixed ε, MC estimates the value of the exploring policy, which is lower than the optimum; decaying ε lets the policy become greedy.
- MC estimates are unbiased but noisy (error shrinks like 1/√n) and must wait for episodes to end.

The next lesson's temporal-difference methods learn after every step, by bootstrapping from their own estimates, and lead directly to SARSA and Q-learning.
