# Q-learning

SARSA learns the value of the policy it follows, exploration and all, which is why it kept away from the cliff edge. **Q-learning**, introduced in 1989, changes one term of the update and learns something different: the values of the **optimal** policy, no matter how the agent behaves while it learns. It became the most famous algorithm in reinforcement learning, and its deep version, in the next lesson, was the first to learn to play dozens of Atari games from the screen pixels alone.

This lesson builds Q-learning, compares it with SARSA on the cliff (where the difference between learning the optimal policy and behaving well while learning becomes visible), checks that it finds the optimal policy of the slippery grid world without a model, and looks at a subtle flaw, **maximisation bias**, and its fix, double Q-learning.

## One term changes

SARSA's target uses the next action the agent actually chooses, a'. Q-learning uses the **best** next action instead:

\[
Q(s, a) \leftarrow Q(s, a) + \alpha\,\big[r + \gamma \max_{a'} Q(s', a') - Q(s, a)\big]
\]

That max is the Bellman optimality equation from the MDP lesson, turned into a sampled update: Q-learning estimates Q*, the value of acting optimally from the next step on, whatever the agent actually does next. The agent can explore as wildly as it likes (ε-greedy, or anything that keeps trying every action), and Q still converges to the optimal action values, given enough visits and a suitably shrinking step size. Learning about one policy (the greedy one) while following another (the exploring one) is called **off-policy** learning.

## Q-learning on the cliff

Train both methods on the cliff world, with the same ε = 0.1, and compare two things: the route each learns (its greedy policy), and the reward it collects per episode **while learning**. Before running, predict: which method will earn more per episode during training?

```python type
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

def train(method, episodes=500, alpha=0.5, epsilon=0.1, seed=0):
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
            if done:
                future = 0.0
            elif method == "Q-learning":
                future = Q[nxt].max()
            else:
                future = Q[nxt][next_action]
            Q[state][action] += alpha * (reward + future - Q[state][action])
            state, action = nxt, next_action
            if done:
                break
        totals.append(total)
    return Q, np.array(totals)

for method in ["SARSA", "Q-learning"]:
    Q, totals = train(method)
    state, route = START, [START]
    for _ in range(50):
        state, _, done = cliff_step(state, int(np.argmax(Q[state])))
        route.append(state)
        if done:
            break
    print(f"{method:<10}: reward per episode while learning (last 100) {totals[-100:].mean():6.1f}; greedy route {len(route) - 1} steps, highest row {min(r for r, c in route)}")
    for r in range(ROWS):
        print("   " + "".join("S" if (r, c) == START else "G" if (r, c) == GOAL else "C" if r == 3 else
                             ("*" if (r, c) in route else ".") for c in range(COLS)))
```

```output
SARSA     : reward per episode while learning (last 100)  -37.7; greedy route 19 steps, highest row 0
   ..***..*****
   .**.****...*
   **.........*
   SCCCCCCCCCCG
Q-learning: reward per episode while learning (last 100)  -44.5; greedy route 13 steps, highest row 2
   ............
   ............
   ************
   SCCCCCCCCCCG
```

The two methods share all their code except the `future` term: the best next value for Q-learning, the chosen next action's value for SARSA. (The next action is chosen in both cases, so that the random number sequences match and the comparison is fair.)

Q-learning's greedy route runs straight along the cliff edge in 13 steps, the optimal route. SARSA's climbs away from the edge and takes 19. Yet **while learning**, Q-learning earns less per episode: about −44 against SARSA's −38. It learned the optimal route, but its behaviour still explores 10% of the time, and exploring on the cliff edge means occasionally stepping off it (−100). SARSA's values priced that risk in, so it chose a route where random steps are harmless. Neither is wrong: Q-learning answers "what is the best route?" and SARSA answers "what is the best route for an agent that keeps exploring?". If exploration stops after training, Q-learning's route is better; if the agent must keep exploring (or its actions are unreliable), SARSA's is safer.

## Without a model, the optimal policy

On the slippery grid world, dynamic programming computed the optimal policy from the model. Q-learning should reach the same policy from experience alone:

```python type
import numpy as np

SIZE, PITS, GOAL = 4, {(1, 1), (2, 3)}, (3, 3)
MOVES = [(-1, 0), (1, 0), (0, -1), (0, 1)]
ARROWS = "^v<>"

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

env, rng = SlipperyGrid(seed=4), np.random.default_rng(5)
Q = np.zeros((SIZE, SIZE, 4))
for episode in range(5000):
    state = env.reset()
    for _ in range(200):
        action = int(rng.integers(4)) if rng.random() < 0.2 else int(np.argmax(Q[state] + rng.random(4) * 1e-9))
        nxt, reward, done = env.step(action)
        target = reward + (0.0 if done else 0.95 * Q[nxt].max())
        Q[state][action] += 0.1 * (target - Q[state][action])
        state = nxt
        if done:
            break

optimal = {(0, 0): 1, (0, 1): 3, (0, 2): 1, (0, 3): 2, (1, 0): 1, (1, 2): 1, (1, 3): 2,
           (2, 0): 1, (2, 1): 1, (2, 2): 1, (3, 0): 3, (3, 1): 3, (3, 2): 3}
learned = {s: int(np.argmax(Q[s])) for s in optimal}
print(f"greedy action matches dynamic programming's optimal action in {sum(learned[s] == optimal[s] for s in optimal)} of {len(optimal)} squares")
print(f"learned value of the start: {Q[(0, 0)].max():.2f} (optimal: 0.83)")
for r in range(SIZE):
    print("  " + " ".join("G" if (r, c) == GOAL else "X" if (r, c) in PITS else ARROWS[learned[(r, c)]] for c in range(SIZE)))
```

```output
greedy action matches dynamic programming's optimal action in 13 of 13 squares
learned value of the start: 0.92 (optimal: 0.83)
  v > v <
  v X v <
  v v v X
  > > > G
```

`optimal` again holds the actions computed by value iteration, for comparison only. Q-learning explored with ε = 0.2, yet its greedy policy matches the optimal one in every square, and its estimate of the start's value, 0.92, is close to the optimal 0.83 rather than the lower value of the exploring behaviour that Monte Carlo and SARSA estimate. That is off-policy learning at work. (It is even slightly too high: the constant step size leaves the estimates noisy, and the max in the target turns noise into overestimation, the subject of the next section.)

## Maximisation bias

Q-learning has a quiet flaw. Its target takes the **max** of several estimates, and the maximum of noisy estimates is biased upwards: if ten actions are all truly worth −0.1 but their estimates are noisy, the largest estimate is very likely above −0.1. Q-learning then believes the state is better than it is.

A small example shows the damage. From the start state, action "right" ends the episode with reward 0. Action "left" leads to a state B with ten actions, each ending the episode with a random reward averaging −0.1. So "left" is truly worse. Watch how often Q-learning chooses it in each of the first 300 episodes, averaged over 300 runs (with ε = 0.1, the best possible rate is 5%, from random exploration):

```python type
import numpy as np

def maximisation_bias(runs=300, episodes=300, actions_in_b=10, alpha=0.1, epsilon=0.1):
    chose_left = np.zeros(episodes)
    for run in range(runs):
        rng = np.random.default_rng(run)
        Q_start, Q_b = np.zeros(2), np.zeros(actions_in_b)
        for episode in range(episodes):
            if rng.random() < epsilon:
                action = int(rng.integers(2))
            else:
                action = int(np.argmax(Q_start + rng.random(2) * 1e-9))
            chose_left[episode] += action == 0
            if action == 1:
                Q_start[1] += alpha * (0.0 - Q_start[1])
                continue
            b_action = int(rng.integers(actions_in_b)) if rng.random() < epsilon else int(np.argmax(Q_b + rng.random(actions_in_b) * 1e-9))
            reward = rng.normal(-0.1, 1.0)
            Q_start[0] += alpha * (Q_b.max() - Q_start[0])
            Q_b[b_action] += alpha * (reward - Q_b[b_action])
    return chose_left / runs

left = maximisation_bias()
for episode in [1, 10, 20, 50, 100, 300]:
    print(f"episode {episode:>3}: Q-learning chooses the worse action in {left[episode - 1]:.0%} of runs")
```

```output
episode   1: Q-learning chooses the worse action in 50% of runs
episode  10: Q-learning chooses the worse action in 88% of runs
episode  20: Q-learning chooses the worse action in 95% of runs
episode  50: Q-learning chooses the worse action in 88% of runs
episode 100: Q-learning chooses the worse action in 45% of runs
episode 300: Q-learning chooses the worse action in 11% of runs
```

Action 0 is "left" and action 1 "right". Going left gives no reward at first; the start's value for "left" is updated towards the max of B's estimates, and B's own estimates are then updated with the random reward.

Early in training, Q-learning chooses the worse action far more often than chance: in 95% of runs at episode 20, and still 45% at episode 100. Each time a lucky reward pushes one of B's estimates above zero, the max picks it up and "left" looks attractive. Only after many visits do B's estimates all settle near −0.1 and the preference fade. In problems with many actions and noisy rewards, this overestimation can seriously slow learning or mislead it.

The fix, **double Q-learning**, keeps **two** independent sets of estimates, Q₁ and Q₂. On each update, flip a coin: to update Q₁, use Q₁ to **choose** the best next action but Q₂ to **evaluate** it, Q₂(s', argmax Q₁(s', ·)); and the other way round to update Q₂. Because the noise in the two sets is independent, an action that looks best by luck in one is not systematically overrated by the other. Act ε-greedily on Q₁ + Q₂. You will implement it in the last challenge. The next lesson's deep Q-networks use the same idea.

::: challenge The Q-learning update [easy]
Write `q_update(Q, s, a, reward, s_next, done, alpha, gamma)` that applies one Q-learning update in place to `Q`, a dictionary from states to NumPy arrays of action values, and returns the TD error. The target uses the largest value at `s_next`, or 0 if `done`.

```python starter
import numpy as np

def q_update(Q, s, a, reward, s_next, done, alpha, gamma):
    return 0.0

Q = {"A": np.zeros(2), "B": np.array([1.0, 3.0])}
print(q_update(Q, "A", 0, -1.0, "B", False, 0.5, 0.9), Q["A"])
```

```python solution
import numpy as np

def q_update(Q, s, a, reward, s_next, done, alpha, gamma):
    target = reward + (0.0 if done else gamma * np.max(Q[s_next]))
    delta = target - Q[s][a]
    Q[s][a] += alpha * delta
    return delta

Q = {"A": np.zeros(2), "B": np.array([1.0, 3.0])}
print(q_update(Q, "A", 0, -1.0, "B", False, 0.5, 0.9), Q["A"])
```

```python test
import numpy as _np
assert "q_update" in dir(), "Keep the function's name as q_update."
_Q = {"A": _np.zeros(2), "B": _np.array([1.0, 3.0])}
_d = q_update(_Q, "A", 0, -1.0, "B", False, 0.5, 0.9)
assert _np.isclose(_d, -1 + 0.9 * 3), "The target uses the BEST value at the next state: −1 + 0.9 × 3 = 1.7."
assert _np.allclose(_Q["A"], [0.85, 0.0]) and _np.allclose(_Q["B"], [1.0, 3.0]), "Only Q[A][0] should change, by α × δ = 0.85."
_Q2 = {"A": _np.array([2.0, 0.0]), "T": _np.array([50.0, 50.0])}
assert _np.isclose(q_update(_Q2, "A", 0, 1.0, "T", True, 0.1, 0.9), -1.0) and _np.isclose(_Q2["A"][0], 1.9), "When the episode ends, the target is just the reward."
"SUCCESS: The update that learns optimal action values while the agent explores: reward plus the best value one step ahead."
```

Hint: `np.max(Q[s_next])` gives the best next value. Compute the target, the error, then `Q[s][a] += alpha * delta`.
:::

::: challenge Expected SARSA [medium]
A third method sits between SARSA and Q-learning. **Expected SARSA** uses, as its future term, the **average** of the next state's action values under the ε-greedy policy: each action has probability ε/4, plus 1 − ε more for the greedy one. Write `expected_value(q, epsilon)` returning that average for one state's array of 4 action values `q` (with ties for the best going to the first, as `np.argmax` does).

Then train expected SARSA on the cliff for 500 episodes with the starter's `train` (which takes the future-term function as an argument), and store its average reward per episode over the last 100 episodes in `expected_reward`, and the length of its greedy route in `expected_route_length`.

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

def train(future, episodes=500, alpha=0.5, epsilon=0.1, seed=0):
    rng = np.random.default_rng(seed)
    Q = np.zeros((ROWS, COLS, 4))
    totals = []
    for _ in range(episodes):
        state, total = START, 0.0
        for _ in range(1000):
            action = int(rng.integers(4)) if rng.random() < epsilon else int(np.argmax(Q[state] + rng.random(4) * 1e-9))
            nxt, reward, done = cliff_step(state, action)
            total += reward
            Q[state][action] += alpha * (reward + (0.0 if done else future(Q[nxt], epsilon)) - Q[state][action])
            state = nxt
            if done:
                break
        totals.append(total)
    return Q, np.array(totals)

def route_length(Q):
    state = START
    for step in range(1, 51):
        state, _, done = cliff_step(state, int(np.argmax(Q[state])))
        if done:
            return step
    return 50

def expected_value(q, epsilon):
    return float(np.max(q))

expected_reward = 0.0
expected_route_length = 0
print(expected_reward, expected_route_length)
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

def train(future, episodes=500, alpha=0.5, epsilon=0.1, seed=0):
    rng = np.random.default_rng(seed)
    Q = np.zeros((ROWS, COLS, 4))
    totals = []
    for _ in range(episodes):
        state, total = START, 0.0
        for _ in range(1000):
            action = int(rng.integers(4)) if rng.random() < epsilon else int(np.argmax(Q[state] + rng.random(4) * 1e-9))
            nxt, reward, done = cliff_step(state, action)
            total += reward
            Q[state][action] += alpha * (reward + (0.0 if done else future(Q[nxt], epsilon)) - Q[state][action])
            state = nxt
            if done:
                break
        totals.append(total)
    return Q, np.array(totals)

def route_length(Q):
    state = START
    for step in range(1, 51):
        state, _, done = cliff_step(state, int(np.argmax(Q[state])))
        if done:
            return step
    return 50

def expected_value(q, epsilon):
    probs = np.full(len(q), epsilon / len(q))
    probs[int(np.argmax(q))] += 1 - epsilon
    return float(probs @ q)

Q, totals = train(expected_value)
expected_reward = float(totals[-100:].mean())
expected_route_length = route_length(Q)
print(expected_reward, expected_route_length)
```

```python test
import numpy as _np
assert "expected_value" in dir(), "Keep the function's name as expected_value."
assert _np.isclose(expected_value(_np.array([1.0, 5.0, 3.0, 1.0]), 0.2), 0.05 * (1 + 5 + 3 + 1) + 0.8 * 5), "With ε = 0.2, each action has probability 0.05 and the greedy one 0.8 more: 0.05 × 10 + 0.8 × 5 = 4.5."
assert _np.isclose(expected_value(_np.array([2.0, 2.0, 0.0, 0.0]), 0.0), 2.0), "With ε = 0 it is just the greedy value."
assert _np.isclose(expected_value(_np.array([4.0, 0.0, 0.0, 0.0]), 1.0), 1.0), "With ε = 1 it is the plain average."
_Q, _t = train(lambda q, e: float((_np.full(4, e / 4) + (1 - e) * (_np.arange(4) == _np.argmax(q))) @ q))
assert _np.isclose(expected_reward, float(_t[-100:].mean())), "expected_reward should be the average over the last 100 episodes of train(expected_value)."
assert expected_route_length == route_length(_Q), "expected_route_length should be route_length of the trained Q."
f"SUCCESS: Expected SARSA earns {expected_reward:.1f} per episode while learning, with a greedy route of {expected_route_length} steps. Like SARSA it accounts for its own exploration, but averaging over the next action instead of sampling one makes its updates less noisy."
```

Hint: Start with every action having probability `epsilon / len(q)`, add `1 - epsilon` to the greedy one, and take the dot product with `q`.
:::

::: challenge Double Q-learning [medium]
Fix the maximisation bias. Write `double_q_bias(runs, episodes, seed_offset=0)` returning, like the lesson's `maximisation_bias`, the fraction of runs choosing "left" at each episode, but using double Q-learning: keep two copies of each value array (`Q1_start`, `Q2_start`, `Q1_b`, `Q2_b`), act ε-greedily on the **sums** (in both states), and after going left, flip a coin with `rng.random() < 0.5`: if heads, update `Q1_start[0]` towards `Q2_b[argmax(Q1_b)]` and `Q1_b[b_action]` towards the reward; if tails, the same with 1 and 2 swapped. Going right updates `Q1_start[1]` or `Q2_start[1]` (by the same kind of coin flip) towards 0. Use α = 0.1, ε = 0.1, 10 actions in B, and `rng = np.random.default_rng(run + seed_offset)` for each run. Draw random numbers in this order each episode: the ε test, then (if exploring) the random action; then, if going right, the coin; if going left, the ε test and action in B, the reward with `rng.normal(-0.1, 1.0)`, then the coin.

Store the result for 300 runs of 300 episodes in `double_left`.

```python starter
import numpy as np

def double_q_bias(runs, episodes, seed_offset=0):
    return np.zeros(episodes)

double_left = double_q_bias(300, 300)
print(double_left[[0, 19, 99, 299]])
```

```python solution
import numpy as np

def double_q_bias(runs, episodes, seed_offset=0):
    chose_left = np.zeros(episodes)
    for run in range(runs):
        rng = np.random.default_rng(run + seed_offset)
        Q1_start, Q2_start = np.zeros(2), np.zeros(2)
        Q1_b, Q2_b = np.zeros(10), np.zeros(10)
        for episode in range(episodes):
            combined = Q1_start + Q2_start
            action = int(rng.integers(2)) if rng.random() < 0.1 else int(np.argmax(combined + rng.random(2) * 1e-9))
            chose_left[episode] += action == 0
            if action == 1:
                if rng.random() < 0.5:
                    Q1_start[1] += 0.1 * (0.0 - Q1_start[1])
                else:
                    Q2_start[1] += 0.1 * (0.0 - Q2_start[1])
                continue
            combined_b = Q1_b + Q2_b
            b_action = int(rng.integers(10)) if rng.random() < 0.1 else int(np.argmax(combined_b + rng.random(10) * 1e-9))
            reward = rng.normal(-0.1, 1.0)
            if rng.random() < 0.5:
                Q1_start[0] += 0.1 * (Q2_b[int(np.argmax(Q1_b))] - Q1_start[0])
                Q1_b[b_action] += 0.1 * (reward - Q1_b[b_action])
            else:
                Q2_start[0] += 0.1 * (Q1_b[int(np.argmax(Q2_b))] - Q2_start[0])
                Q2_b[b_action] += 0.1 * (reward - Q2_b[b_action])
    return chose_left / runs

double_left = double_q_bias(300, 300)
print(double_left[[0, 19, 99, 299]])
```

```python test
import numpy as _np
assert "double_q_bias" in dir(), "Keep the function's name as double_q_bias."
def _ref(runs, episodes, off=0):
    cl = _np.zeros(episodes)
    for run in range(runs):
        g = _np.random.default_rng(run + off); Q1s, Q2s, Q1b, Q2b = _np.zeros(2), _np.zeros(2), _np.zeros(10), _np.zeros(10)
        for ep in range(episodes):
            a = int(g.integers(2)) if g.random() < 0.1 else int(_np.argmax(Q1s + Q2s + g.random(2) * 1e-9))
            cl[ep] += a == 0
            if a == 1:
                if g.random() < 0.5:
                    Q1s[1] += 0.1 * (0 - Q1s[1])
                else:
                    Q2s[1] += 0.1 * (0 - Q2s[1])
                continue
            b = int(g.integers(10)) if g.random() < 0.1 else int(_np.argmax(Q1b + Q2b + g.random(10) * 1e-9))
            r = g.normal(-0.1, 1.0)
            if g.random() < 0.5:
                Q1s[0] += 0.1 * (Q2b[int(_np.argmax(Q1b))] - Q1s[0]); Q1b[b] += 0.1 * (r - Q1b[b])
            else:
                Q2s[0] += 0.1 * (Q1b[int(_np.argmax(Q2b))] - Q2s[0]); Q2b[b] += 0.1 * (r - Q2b[b])
    return cl / runs
assert _np.allclose(double_q_bias(20, 50, 7), _ref(20, 50, 7)), "Your double Q-learning differs from the expected one on a small test (20 runs, 50 episodes, seed offset 7). Check the order of random draws and that each copy is updated using the OTHER copy to evaluate."
assert _np.allclose(double_left, _ref(300, 300)), "double_left should be double_q_bias(300, 300)."
assert double_left[19] < 0.5, "Double Q-learning should not be fooled into preferring the worse action."
f"SUCCESS: At episode 20, double Q-learning chooses the worse action in {double_left[19]:.0%} of runs (plain Q-learning: 95%), and by episode 300 in {double_left[299]:.0%}, close to the 5% that ε-greedy exploration alone produces."
```

Hint: The structure is the lesson's `maximisation_bias`. The changes: act on `Q1 + Q2`; after each transition, draw the coin with `rng.random() < 0.5` and update one copy, using the other copy's value at the action that maximises the updated copy.
:::

## What you learned

- Q-learning updates towards the best next action: Q(s, a) ← Q(s, a) + α[r + γ maxₐ' Q(s', a') − Q(s, a)]. It estimates the optimal action values Q* while following any exploring policy (off-policy).
- On the cliff, Q-learning found the optimal 13-step edge route but earned less while learning (about −44 against SARSA's −38), because its exploration near the edge sometimes fell off; SARSA learned a safer route for an exploring agent.
- On the slippery grid, Q-learning's greedy policy matched dynamic programming's optimal policy in every square, from experience alone.
- Expected SARSA averages over the next action's probabilities instead of sampling it.
- Taking the max over noisy estimates overestimates values (maximisation bias); double Q-learning uses one set of estimates to choose the best action and the other to evaluate it.

Tables of Q values work for 16 or 48 states. A video game screen has more possible states than there are atoms in the universe. The next lesson replaces the table with a neural network, and adds the tricks that make that combination stable: deep Q-learning.
