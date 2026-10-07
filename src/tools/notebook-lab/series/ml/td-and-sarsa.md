# Temporal-difference learning and SARSA

Monte Carlo methods learn from complete episodes: the agent must wait until the end to know what return followed each state. Imagine predicting how long your drive home will take. A Monte Carlo learner would only update its prediction after arriving. But if, ten minutes in, you hit a traffic jam, you already know your original estimate was too optimistic; you can update **now**, using the time already spent plus a fresh estimate of the time remaining. That is **temporal-difference** (TD) learning: update a guess using a later guess.

TD learning is the central idea of reinforcement learning. It learns after every single step, works for tasks that never end, and in practice usually learns faster than Monte Carlo. This lesson introduces TD prediction, compares it with Monte Carlo on a problem whose true answer is known, and then builds **SARSA**, a TD control method, on a world with a cliff, where the way it learns turns out to shape the route it chooses.

## The TD update

Monte Carlo moves a state's value towards the actual return Gₜ:

\[
V(s_t) \leftarrow V(s_t) + \alpha\,[G_t - V(s_t)]
\]

TD(0), the simplest TD method, replaces the full return with one real reward plus the **current estimate** of the next state's value:

\[
V(s_t) \leftarrow V(s_t) + \alpha\,[r_{t+1} + \gamma V(s_{t+1}) - V(s_t)]
\]

The bracket, δ = r + γV(s') − V(s), is the **TD error**: the difference between what the agent predicted and a slightly better-informed prediction one step later. Using an estimate to update an estimate is called **bootstrapping**, as in pulling yourself up by your own bootstraps. It looks circular, but it works: the real reward r brings in new information at every step, and over many updates the estimates are pulled towards the truth. (For the terminal state, the value is 0, so the target is just r.)

Compared with Monte Carlo, TD's target uses only one random reward instead of a whole episode's worth, so it has much **lower variance**; but it uses V(s'), which is still wrong early on, so it is **biased** until the estimates improve.

## A test with known answers: the random walk

Five states in a row, A to E, with an exit at each end. Every episode starts in the middle, C, and moves left or right with equal probability until it exits. Exiting on the right gives reward 1; every other step gives 0; γ = 1. The value of each state is then the probability of exiting on the right, which is exactly 1/6, 2/6, 3/6, 4/6 and 5/6 for A to E. Start every estimate at 0.5 and compare how fast TD and Monte Carlo approach the truth, averaging the error over 100 independent runs. Before running, predict: which will be closer after 50 episodes?

```python type
import numpy as np
import matplotlib.pyplot as plt

true_values = np.arange(1, 6) / 6

def random_walk(rng):
    state, steps = 2, []
    while True:
        nxt = state + (1 if rng.random() < 0.5 else -1)
        reward = 1.0 if nxt == 5 else 0.0
        steps.append((state, reward, nxt))
        state = nxt
        if nxt in (-1, 5):
            return steps

def learning_curve(method, alpha, episodes=100, runs=100):
    error = np.zeros(episodes)
    for run in range(runs):
        rng = np.random.default_rng(run)
        V = np.full(5, 0.5)
        for episode in range(episodes):
            steps = random_walk(rng)
            if method == "TD":
                for s, r, nxt in steps:
                    target = r + (0.0 if nxt in (-1, 5) else V[nxt])
                    V[s] += alpha * (target - V[s])
            else:
                G = steps[-1][1]
                for s, r, nxt in steps:
                    V[s] += alpha * (G - V[s])
            error[episode] += np.sqrt(np.mean((V - true_values) ** 2))
    return error / runs

fig, ax = plt.subplots(figsize=(6.5, 3.6))
for method, alpha in [("TD", 0.05), ("TD", 0.1), ("MC", 0.01), ("MC", 0.03)]:
    curve = learning_curve(method, alpha)
    ax.plot(curve, label=f"{method}, α = {alpha}")
    print(f"{method} α = {alpha:<5}: error after 10 episodes {curve[9]:.3f}, after 50 {curve[49]:.3f}, after 100 {curve[99]:.3f}")
ax.set_xlabel("episodes")
ax.set_ylabel("root mean squared error")
ax.legend(fontsize=8)
plt.show()
```

```output
TD α = 0.05 : error after 10 episodes 0.175, after 50 0.053, after 100 0.036
TD α = 0.1  : error after 10 episodes 0.129, after 50 0.050, after 100 0.057
MC α = 0.01 : error after 10 episodes 0.213, after 50 0.142, after 100 0.097
MC α = 0.03 : error after 10 episodes 0.190, after 50 0.097, after 100 0.096
```

States A to E are numbered 0 to 4, and positions −1 and 5 are the exits. Each step is stored as (state, reward, next state). For TD, each step's target uses the next state's current estimate. For Monte Carlo, with γ = 1 and a single reward at the very end, every state visited in the episode has the same return, the final reward. (This MC version updates on every visit, a constant-α variant.)

TD's error falls faster: after 50 episodes it is about 0.05, against about 0.10 for Monte Carlo at its best step size. Monte Carlo must see whole episodes play out, and a single lucky or unlucky episode moves all its estimates a lot; TD spreads information through the chain one link at a time, each step adding a little real evidence. Notice also that the larger TD step size (0.1) learns faster at first but levels off at a higher error than 0.05: big steps keep jittering around the answer, the constant-step-size trade-off from the bandit lesson.

## SARSA: TD control

To improve behaviour without a model, TD learns action values. After taking action a in state s, observing reward r and next state s', and choosing the **next** action a' with the current policy, the update is:

\[
Q(s, a) \leftarrow Q(s, a) + \alpha\,[r + \gamma Q(s', a') - Q(s, a)]
\]

The name comes from the five things each update uses: **S**tate, **A**ction, **R**eward, next **S**tate, next **A**ction. The agent acts ε-greedily with respect to Q, so SARSA is **on-policy**: it learns the value of the policy it is actually following, exploration included.

## The cliff

The **cliff walking** world makes that last point matter. On a 4 × 12 grid, the agent starts at the bottom-left and must reach the bottom-right. The squares between them along the bottom row are a cliff: stepping onto one costs −100 and sends the agent back to the start. Every other step costs −1. The shortest route runs along the cliff edge, 13 steps; a safer route climbs to the top and back down, a few steps longer.

```python type
import numpy as np

ROWS, COLS = 4, 12
MOVES = [(-1, 0), (1, 0), (0, -1), (0, 1)]
ARROWS = "^v<>"
START, GOAL = (3, 0), (3, 11)

def cliff_step(state, action):
    dr, dc = MOVES[action]
    nxt = (min(max(state[0] + dr, 0), ROWS - 1), min(max(state[1] + dc, 0), COLS - 1))
    if nxt[0] == 3 and 0 < nxt[1] < 11:
        return START, -100.0, False
    return nxt, -1.0, nxt == GOAL

def sarsa(episodes=500, alpha=0.5, epsilon=0.1, seed=0):
    rng = np.random.default_rng(seed)
    Q = np.zeros((ROWS, COLS, 4))

    def choose(state):
        if rng.random() < epsilon:
            return int(rng.integers(4))
        return int(np.argmax(Q[state] + rng.random(4) * 1e-9))

    totals = []
    for episode in range(episodes):
        state, total = START, 0.0
        action = choose(state)
        for _ in range(1000):
            nxt, reward, done = cliff_step(state, action)
            total += reward
            next_action = choose(nxt)
            target = reward + (0.0 if done else Q[nxt][next_action])
            Q[state][action] += alpha * (target - Q[state][action])
            state, action = nxt, next_action
            if done:
                break
        totals.append(total)
    return Q, np.array(totals)

Q, totals = sarsa()
print(f"average reward per episode over the last 100 episodes: {totals[-100:].mean():.1f}")

state, route = START, [START]
for _ in range(50):
    state, _, done = cliff_step(state, int(np.argmax(Q[state])))
    route.append(state)
    if done:
        break
print(f"greedy route: {len(route) - 1} steps, highest row reached {min(r for r, c in route)}")
for r in range(ROWS):
    print("  " + "".join("S" if (r, c) == START else "G" if (r, c) == GOAL else "C" if r == 3 else
                         ("*" if (r, c) in route else ".") for c in range(COLS)))
```

```output
average reward per episode over the last 100 episodes: -37.7
greedy route: 19 steps, highest row reached 0
  ..***..*****
  .**.****...*
  **.........*
  SCCCCCCCCCCG
```

`Q` is a 4 × 12 × 4 array, one value per square and action, and `Q[state]` (with state a (row, column) tuple) gives a square's four action values. γ = 1 here (the cliff task is episodic and the −1 per step already rewards speed). After training, the cell follows the greedy policy and marks its route with stars; C marks the cliff.

SARSA's route climbs away from the edge, going up towards the top row before crossing: 19 steps instead of the shortest 13. (The route wanders a little, dropping back a row and climbing again, because after 500 episodes the Q values are still rough; a clean top-row detour would take 17.) Why? SARSA learns the value of its ε-greedy behaviour, and with ε = 0.1 an agent walking along the edge would occasionally take a random step into the cliff. SARSA's Q values include that risk, so squares beside the cliff look bad, and it learns to keep its distance. Its average reward per episode while training, around −38, includes the cost of its own exploration. The next lesson's Q-learning learns the same task differently, and finds the edge route, with surprising consequences for how much it earns while learning.

::: challenge One TD update [easy]
Write `td_update(V, s, reward, s_next, done, alpha, gamma)` that applies one TD(0) update to the dictionary `V` (in place) and returns the TD error δ = r + γV(s') − V(s), with V(s') taken as 0 when `done` is `True`.

```python starter
def td_update(V, s, reward, s_next, done, alpha, gamma):
    return 0.0

V = {"A": 0.0, "B": 2.0}
print(td_update(V, "A", 1.0, "B", False, 0.5, 0.9), V)
```

```python solution
def td_update(V, s, reward, s_next, done, alpha, gamma):
    target = reward + (0.0 if done else gamma * V[s_next])
    delta = target - V[s]
    V[s] += alpha * delta
    return delta

V = {"A": 0.0, "B": 2.0}
print(td_update(V, "A", 1.0, "B", False, 0.5, 0.9), V)
```

```python test
import math as _m
assert "td_update" in dir(), "Keep the function's name as td_update."
_V = {"A": 0.0, "B": 2.0}
_d = td_update(_V, "A", 1.0, "B", False, 0.5, 0.9)
assert _m.isclose(_d, 1 + 0.9 * 2 - 0), "The TD error is r + γV(s') − V(s) = 1 + 1.8 − 0 = 2.8."
assert _m.isclose(_V["A"], 0.5 * 2.8) and _V["B"] == 2.0, "V(A) should move by α × δ = 1.4; V(B) is unchanged."
_V2 = {"A": 1.0, "T": 50.0}
_d2 = td_update(_V2, "A", 3.0, "T", True, 0.1, 0.9)
assert _m.isclose(_d2, 2.0) and _m.isclose(_V2["A"], 1.2), "When the episode ends, the target is just the reward: δ = 3 − 1 = 2, whatever V says about the terminal state."
"SUCCESS: Learning from a single step: nudge the estimate towards one real reward plus the estimate of what comes next."
```

Hint: The target is `reward + (0.0 if done else gamma * V[s_next])`; δ is the target minus `V[s]`; then `V[s] += alpha * delta`.
:::

::: challenge TD on a longer walk [medium]
The random walk's true values are easy to work out for any length: with n states and exits at both ends (reward 1 only for exiting on the right), state i (counting from 0) has value (i + 1)/(n + 1). Write `td_random_walk(n, episodes, alpha, seed)` that runs TD(0) with γ = 1 on an n-state walk starting in the middle state `n // 2`, with all estimates starting at 0.5 and `rng = np.random.default_rng(seed)` choosing each move (`rng.random() < 0.5` means right). Return the final estimates as an array.

Then store the root mean squared error against the true values for a 19-state walk after 1,000 episodes with α = 0.05 and seed 0 in `error_19`.

```python starter
import numpy as np

def td_random_walk(n, episodes, alpha, seed):
    return np.full(n, 0.5)

error_19 = 1.0
print(error_19)
```

```python solution
import numpy as np

def td_random_walk(n, episodes, alpha, seed):
    rng = np.random.default_rng(seed)
    V = np.full(n, 0.5)
    for _ in range(episodes):
        state = n // 2
        while True:
            nxt = state + (1 if rng.random() < 0.5 else -1)
            reward = 1.0 if nxt == n else 0.0
            target = reward + (0.0 if nxt in (-1, n) else V[nxt])
            V[state] += alpha * (target - V[state])
            if nxt in (-1, n):
                break
            state = nxt
    return V

true_19 = np.arange(1, 20) / 20
error_19 = float(np.sqrt(np.mean((td_random_walk(19, 1000, 0.05, 0) - true_19) ** 2)))
print(error_19)
```

```python test
import numpy as _np
assert "td_random_walk" in dir(), "Keep the function's name as td_random_walk."
def _ref(n, episodes, alpha, seed):
    g = _np.random.default_rng(seed); V = _np.full(n, 0.5)
    for _ in range(episodes):
        s = n // 2
        while True:
            nx = s + (1 if g.random() < 0.5 else -1)
            r = 1.0 if nx == n else 0.0
            V[s] += alpha * (r + (0.0 if nx in (-1, n) else V[nx]) - V[s])
            if nx in (-1, n):
                break
            s = nx
    return V
assert _np.allclose(td_random_walk(5, 50, 0.1, 3), _ref(5, 50, 0.1, 3)), "Your 5-state walk differs from the expected TD estimates. Start in state n // 2, and use the next state's estimate (0 at the exits) in each target."
_want = float(_np.sqrt(_np.mean((_ref(19, 1000, 0.05, 0) - _np.arange(1, 20) / 20) ** 2)))
assert _np.isclose(error_19, _want), "error_19 should be the root mean squared error of your 19-state estimates after 1,000 episodes."
assert error_19 < 0.1, "After 1,000 episodes the estimates should be close to the true values."
f"SUCCESS: On a walk of 19 states, TD's estimates are within {error_19:.3f} (RMS) of the true values after 1,000 episodes: the reward at one end has propagated, one step at a time, all the way back."
```

Hint: Write the episode as a `while True` loop: draw the move, compute the reward and target, update `V[state]`, and break when the next position is an exit (−1 or n).
:::

::: challenge The price of exploration [medium]
SARSA's caution comes from its own exploration: its values include the cost of the random steps it will take. Using the lesson's `cliff_step` (provided), write `sarsa_start_value(epsilon, seed)` that trains SARSA for 500 episodes (α = 0.5, γ = 1, `rng = np.random.default_rng(seed)`, with the lesson's ε-greedy choice, including its tiny random tie-breaking) and returns the best Q value at the start square, `float(Q[START].max())`. Then store the results for ε = 0.01, 0.1 and 0.3 (seed 0) in a dictionary `start_values`. Before running, predict how the value will change as ε grows.

```python starter
import numpy as np

ROWS, COLS = 4, 12
MOVES = [(-1, 0), (1, 0), (0, -1), (0, 1)]
START, GOAL = (3, 0), (3, 11)

def cliff_step(state, action):
    dr, dc = MOVES[action]
    nxt = (min(max(state[0] + dr, 0), ROWS - 1), min(max(state[1] + dc, 0), COLS - 1))
    if nxt[0] == 3 and 0 < nxt[1] < 11:
        return START, -100.0, False
    return nxt, -1.0, nxt == GOAL

def sarsa_start_value(epsilon, seed):
    return 0.0

start_values = {}
print(start_values)
```

```python solution
import numpy as np

ROWS, COLS = 4, 12
MOVES = [(-1, 0), (1, 0), (0, -1), (0, 1)]
START, GOAL = (3, 0), (3, 11)

def cliff_step(state, action):
    dr, dc = MOVES[action]
    nxt = (min(max(state[0] + dr, 0), ROWS - 1), min(max(state[1] + dc, 0), COLS - 1))
    if nxt[0] == 3 and 0 < nxt[1] < 11:
        return START, -100.0, False
    return nxt, -1.0, nxt == GOAL

def sarsa_start_value(epsilon, seed):
    rng = np.random.default_rng(seed)
    Q = np.zeros((ROWS, COLS, 4))

    def choose(state):
        if rng.random() < epsilon:
            return int(rng.integers(4))
        return int(np.argmax(Q[state] + rng.random(4) * 1e-9))

    for _ in range(500):
        state = START
        action = choose(state)
        for _ in range(1000):
            nxt, reward, done = cliff_step(state, action)
            next_action = choose(nxt)
            target = reward + (0.0 if done else Q[nxt][next_action])
            Q[state][action] += 0.5 * (target - Q[state][action])
            state, action = nxt, next_action
            if done:
                break
    return float(Q[START].max())

start_values = {eps: round(sarsa_start_value(eps, 0), 1) for eps in [0.01, 0.1, 0.3]}
print(start_values)
```

```python test
import numpy as _np
assert "sarsa_start_value" in dir(), "Keep the function's name as sarsa_start_value."
def _ref(eps, seed):
    g = _np.random.default_rng(seed); Q = _np.zeros((4, 12, 4))
    def ch(s):
        return int(g.integers(4)) if g.random() < eps else int(_np.argmax(Q[s] + g.random(4) * 1e-9))
    for _ in range(500):
        s = (3, 0); a = ch(s)
        for _ in range(1000):
            n, r, d = cliff_step(s, a); a2 = ch(n)
            Q[s][a] += 0.5 * (r + (0.0 if d else Q[n][a2]) - Q[s][a]); s, a = n, a2
            if d:
                break
    return float(Q[(3, 0)].max())
assert sorted(start_values) == [0.01, 0.1, 0.3], "start_values should have keys 0.01, 0.1 and 0.3."
for _e in (0.01, 0.1, 0.3):
    assert abs(start_values[_e] - _ref(_e, 0)) < 0.06, f"start_values[{_e}] should be about {_ref(_e, 0):.1f}. Train SARSA exactly as in the lesson (same random calls in the same order) and return Q[START].max()."
assert sarsa_start_value(0.1, 0) < 0, "The function itself should return the trained start value."
f"SUCCESS: Start values {start_values}: the more SARSA explores, the lower it values the start, because it prices in its own random steps, some of them off the cliff. That same pricing makes squares beside the cliff look bad, which is why SARSA keeps its distance."
```

Hint: Copy the lesson's `sarsa` training loop into the function, with `epsilon` as given and 500 episodes. Then return `float(Q[START].max())`.
:::

## What you learned

- TD learning updates after every step towards a bootstrapped target: V(s) ← V(s) + α[r + γV(s') − V(s)]; the bracket is the TD error.
- TD has lower variance than Monte Carlo (one random reward instead of a whole return) but is biased early on; on the random walk it learned faster (error about 0.05 after 50 episodes against about 0.10).
- SARSA is on-policy TD control: Q(s, a) ← Q(s, a) + α[r + γQ(s', a') − Q(s, a)], using the next action actually chosen.
- Because SARSA learns the value of its exploring behaviour, on the cliff it learned a safe route away from the edge (19 steps instead of 13).

The next lesson changes one term of the SARSA update, using the best next action instead of the one actually taken. That change gives Q-learning, which learns the optimal policy whatever the agent does while exploring.
