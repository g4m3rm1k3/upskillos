# The reinforcement learning problem

Every model so far learned from a fixed dataset of examples, usually with the right answers attached. Many problems do not come like that. A robot learning to walk, a program learning to play a game, a system deciding how to set prices or route deliveries: none of them is told the correct action. Each **acts**, sees what happens, and receives a **reward** that says how good the outcome was, often only much later. Learning to choose actions that maximise reward over time, by trial and error, is **reinforcement learning** (RL).

This part of the series builds RL from the ground up, ending with deep Q-learning and policy gradients, the methods behind game-playing systems such as AlphaGo and much of modern robotics. This first lesson sets up the problem: **agents** and **environments**, **states**, **actions** and **rewards**, **episodes** and **returns**, the **discount factor**, and **policies**. It builds a small grid world in Python that the following lessons will solve again and again with better and better methods.

## The agent–environment loop

RL has two parts that take turns:

1. The **environment** is in some **state** s and shows it to the agent.
2. The **agent** chooses an **action** a.
3. The environment moves to a new state s' and gives the agent a **reward** r, a number.
4. Repeat.

That loop is the whole interface. The agent does not see the rules of the environment; it only sees states and rewards. Its goal is not the next reward but the **total** reward collected over time, which makes RL hard: an action can look bad now and be essential later, like spending money to learn a skill. Working out which earlier actions deserve credit for a later reward is the **credit assignment problem**.

Many tasks have a natural end, such as winning or losing a game, or reaching a goal. One run from start to end is an **episode**.

## A grid world

Here is the environment for the next several lessons: a 4 × 4 grid. The agent starts in the top-left corner and wants to reach the goal in the bottom-right corner, which ends the episode with a reward of +10. Two squares are **pits**, which end the episode with −10. Every other move costs −1, so dawdling is penalised and shorter routes are better. The four actions move up, down, left or right; moving into a wall leaves the agent where it is.

```python type
import numpy as np

class GridWorld:
    ACTIONS = {0: (-1, 0), 1: (1, 0), 2: (0, -1), 3: (0, 1)}
    NAMES = {0: "up", 1: "down", 2: "left", 3: "right"}

    def __init__(self, size=4, pits=((1, 1), (2, 3)), goal=(3, 3), slip=0.0, seed=0):
        self.size, self.pits, self.goal, self.slip = size, set(pits), goal, slip
        self.rng = np.random.default_rng(seed)
        self.reset()

    def reset(self):
        self.position = (0, 0)
        return self.position

    def step(self, action):
        if self.slip and self.rng.random() < self.slip:
            action = int(self.rng.integers(4))
        dr, dc = self.ACTIONS[action]
        row = min(max(self.position[0] + dr, 0), self.size - 1)
        col = min(max(self.position[1] + dc, 0), self.size - 1)
        self.position = (row, col)
        if self.position == self.goal:
            return self.position, 10.0, True
        if self.position in self.pits:
            return self.position, -10.0, True
        return self.position, -1.0, False

    def render(self):
        for r in range(self.size):
            print(" ".join("A" if (r, c) == self.position else "G" if (r, c) == self.goal
                           else "X" if (r, c) in self.pits else "." for c in range(self.size)))

env = GridWorld()
env.render()
print()
for action in [3, 3, 1, 1, 1, 3]:
    state, reward, done = env.step(action)
    print(f"{GridWorld.NAMES[action]:>5} -> state {state}, reward {reward:+.0f}, finished {done}")
    if done:
        break
```

```output
A . . .
. X . .
. . . X
. . . G

right -> state (0, 1), reward -1, finished False
right -> state (0, 2), reward -1, finished False
 down -> state (1, 2), reward -1, finished False
 down -> state (2, 2), reward -1, finished False
 down -> state (3, 2), reward -1, finished False
right -> state (3, 3), reward +10, finished True
```

`step` returns the three things an RL agent receives: the new state, the reward, and whether the episode has ended. `min(max(..., 0), size - 1)` keeps the position inside the grid, so walking into a wall does nothing (but still costs −1). The `slip` setting will make the world **random** later: with probability `slip`, the agent's chosen action is replaced by a random one, like a robot on an icy floor. In the grid printout, A is the agent, X a pit and G the goal.

This route, right, right, down, down, down, right, takes 6 steps: five ordinary moves (−1 each) and the final step into the goal (+10), a total of +5. It is one of the shortest safe routes.

## Policies

An agent's behaviour is a **policy**: a rule saying which action to take in each state. A policy can be **deterministic** (always "right" in this square) or **stochastic** (in this square, right with probability 0.8, down with 0.2). Learning in RL means improving the policy.

Compare two policies by running many episodes with each and averaging the total reward: one that picks actions completely at random, and a hand-written one that follows the route above: right until column 2, then down to the bottom row, then right. Before running, predict: what will the random policy's average total reward be, positive or negative?

```python type
import numpy as np

class GridWorld:
    ACTIONS = {0: (-1, 0), 1: (1, 0), 2: (0, -1), 3: (0, 1)}

    def __init__(self, size=4, pits=((1, 1), (2, 3)), goal=(3, 3), slip=0.0, seed=0):
        self.size, self.pits, self.goal, self.slip = size, set(pits), goal, slip
        self.rng = np.random.default_rng(seed)
        self.reset()

    def reset(self):
        self.position = (0, 0)
        return self.position

    def step(self, action):
        if self.slip and self.rng.random() < self.slip:
            action = int(self.rng.integers(4))
        dr, dc = self.ACTIONS[action]
        row = min(max(self.position[0] + dr, 0), self.size - 1)
        col = min(max(self.position[1] + dc, 0), self.size - 1)
        self.position = (row, col)
        if self.position == self.goal:
            return self.position, 10.0, True
        if self.position in self.pits:
            return self.position, -10.0, True
        return self.position, -1.0, False

def run_episode(env, policy, rng, max_steps=100):
    state, total = env.reset(), 0.0
    for _ in range(max_steps):
        state, reward, done = env.step(policy(state, rng))
        total += reward
        if done:
            break
    return total

def random_policy(state, rng):
    return int(rng.integers(4))

def planned_route(state, rng):
    return 3 if state[1] < 2 else (1 if state[0] < 3 else 3)

rng = np.random.default_rng(0)
for slip in [0.0, 0.2]:
    env = GridWorld(slip=slip, seed=1)
    for name, policy in [("random", random_policy), ("planned route", planned_route)]:
        totals = [run_episode(env, policy, rng) for _ in range(2000)]
        print(f"slip {slip}: {name:<16} average total reward {np.mean(totals):6.2f}")
```

```output
slip 0.0: random           average total reward -18.61
slip 0.0: planned route    average total reward   5.00
slip 0.2: random           average total reward -18.20
slip 0.2: planned route    average total reward  -0.83
```

A policy here is a function from a state (and a random generator, for policies that need one) to an action. The planned route goes right while the column is below 2, then down while the row is below 3, then right. `max_steps` stops an episode that wanders forever.

The random policy does badly: it stumbles into pits and wanders, averaging about −18.6. The planned route earns +5 every time in the deterministic world, the best possible here. With 20% slipping, the same route, which passes right beside both pits, sometimes slides into one, and its average drops to about −1: a plan that ignores the risk is no longer good. A better policy for the slippery world keeps away from the pits even at the cost of a longer route. Finding such policies automatically is what the coming lessons do.

## Returns and discounting

The quantity an agent maximises is the **return**: the sum of the rewards from now on. For tasks that may run for a long time, and to express that sooner is better than later, rewards are usually **discounted**: a reward k steps in the future is multiplied by γᵏ (gamma to the power k), with γ between 0 and 1:

\[
G_t = r_{t+1} + \gamma r_{t+2} + \gamma^2 r_{t+3} + \cdots
\]

With γ = 0.9, a reward of 10 three steps away is worth 10 × 0.9² = 8.1 now (the first reward counts in full). With γ close to 1, the agent is far-sighted; with γ = 0, it only cares about the immediate reward. Discounting also keeps the return finite when an episode could go on forever. The return satisfies a simple recursion, Gₜ = rₜ₊₁ + γ Gₜ₊₁, which every method in the following lessons relies on.

```python type
import numpy as np

rewards = [-1, -1, -1, -1, -1, 10]
for gamma in [1.0, 0.9, 0.5, 0.0]:
    G = sum(gamma ** k * r for k, r in enumerate(rewards))
    print(f"gamma {gamma}: return from the start of the 6-step route = {G:.2f}")
```

```output
gamma 1.0: return from the start of the 6-step route = 5.00
gamma 0.9: return from the start of the 6-step route = 1.81
gamma 0.5: return from the start of the 6-step route = -1.62
gamma 0.0: return from the start of the 6-step route = -1.00
```

For the 6-step route with five −1s then +10, the undiscounted return is +5. With γ = 0.9 it is about 1.8: the +10 at the end is shrunk to 5.9 by five steps of discounting. With γ = 0.5 the distant goal hardly matters, and the return is negative; with γ = 0, only the first −1 counts. The discount factor is part of the problem's definition: it decides what the agent should care about.

## What makes RL hard

Compared with supervised learning, RL adds three difficulties:

- **No labels**: nobody says which action was right, only how much reward followed.
- **Delayed consequences**: a reward may depend on actions taken long before (credit assignment).
- **Exploration**: the agent only learns about actions it tries. Always taking the best-known action can mean never discovering a better one; trying new actions costs reward in the meantime. This **exploration–exploitation trade-off** is the subject of the next lesson, in its simplest setting: a row of slot machines.

::: challenge Discounted return [easy]
Write `discounted_return(rewards, gamma)` returning r₁ + γr₂ + γ²r₃ + … for a list of rewards, where the first reward is not discounted.

```python starter
def discounted_return(rewards, gamma):
    return sum(rewards)

print(discounted_return([-1, -1, -1, -1, -1, 10], 0.9))
```

```python solution
def discounted_return(rewards, gamma):
    total = 0.0
    for k, r in enumerate(rewards):
        total += gamma ** k * r
    return total

print(discounted_return([-1, -1, -1, -1, -1, 10], 0.9))
```

```python test
import math as _m
assert "discounted_return" in dir(), "Keep the function's name as discounted_return."
assert _m.isclose(discounted_return([1, 1, 1], 1.0), 3.0), "With gamma 1 the return is the plain sum."
assert _m.isclose(discounted_return([0, 0, 10], 0.9), 8.1), "A reward of 10 two steps after the first is worth 10 × 0.9² = 8.1."
assert _m.isclose(discounted_return([5, 100], 0.0), 5.0), "With gamma 0 only the first reward counts."
assert _m.isclose(discounted_return([-1, -1, -1, -1, -1, 10], 0.9), sum(0.9 ** k * r for k, r in enumerate([-1, -1, -1, -1, -1, 10]))), "Wrong for the lesson's route."
assert discounted_return([], 0.9) == 0, "No rewards, no return."
"SUCCESS: The quantity every RL agent tries to maximise."
```

Hint: `enumerate(rewards)` gives each reward with its position k, starting from 0; weight it by `gamma ** k`.
:::

::: challenge Returns at every step [medium]
Learning methods need the return from **every** step of an episode, not just the first. Write `returns_to_go(rewards, gamma)` returning a list (or array) the same length as `rewards`, whose entry t is the discounted return from step t onwards. Here `rewards[t]` is the reward received **after** step t's action, the lesson's rₜ₊₁, so entry t is `rewards[t] + γ·rewards[t+1] + γ²·rewards[t+2] + …`. Compute them all in one pass **backwards** through the episode, using the lesson's recursion Gₜ = rₜ₊₁ + γ Gₜ₊₁, which in list terms is `G[t] = rewards[t] + gamma * G[t+1]` (with the return after the last step being 0), rather than summing from scratch at every step.

```python starter
def returns_to_go(rewards, gamma):
    return list(rewards)

print(returns_to_go([-1, -1, -1, 10], 0.9))
```

```python solution
def returns_to_go(rewards, gamma):
    returns = [0.0] * len(rewards)
    G = 0.0
    for t in reversed(range(len(rewards))):
        G = rewards[t] + gamma * G
        returns[t] = G
    return returns

print(returns_to_go([-1, -1, -1, 10], 0.9))
```

```python test
import numpy as _np
import ast as _ast
assert "returns_to_go" in dir(), "Keep the function's name as returns_to_go."
_got = _np.asarray(returns_to_go([-1, -1, -1, 10], 0.9), dtype=float)
_want = _np.array([sum(0.9 ** k * r for k, r in enumerate([-1, -1, -1, 10][t:])) for t in range(4)])
assert _np.shape(_got) == (4,), "Return one value per step."
assert _np.allclose(_got, _want), f"For rewards [−1, −1, −1, 10] and gamma 0.9 the returns are {_want.round(3).tolist()}, but got {_got.round(3).tolist()}."
_r = _np.random.default_rng(0).normal(size=50)
_w = [sum(0.95 ** k * x for k, x in enumerate(_r[t:])) for t in range(50)]
assert _np.allclose(returns_to_go(list(_r), 0.95), _w), "Wrong for a long random episode."
_fn = [n for n in _ast.walk(_ast.parse(_source)) if isinstance(n, _ast.FunctionDef) and n.name == "returns_to_go"][0]
_loops = [n for n in _ast.walk(_fn) if isinstance(n, (_ast.For, _ast.While))]
assert len(_loops) == 1, "Use a single backwards loop with G = r + gamma × G, not a separate sum for every step."
"SUCCESS: Every step's return in one backwards pass, the recursion G_t = r_t + γ G_(t+1) that the coming lessons build on."
```

Hint: Start with `G = 0`, loop `for t in reversed(range(len(rewards)))`, update `G = rewards[t] + gamma * G`, and store it at position `t`.
:::

::: challenge A safer route [medium]
In the slippery world (slip 0.2), the lesson's planned route passes right beside both pits, through (1, 2) next to (1, 1) and (2, 2) next to (2, 3). Write a policy `safe_route(state, rng)` that does better on average: for example, go **down** the left column first, then **right** along the bottom row, which spends less time next to the pits. Then evaluate both policies with the starter's `average_total` (2,000 episodes each, in a slippery world with seed 1) and store the results in `risky` and `safe`.

```python starter
import numpy as np

class GridWorld:
    ACTIONS = {0: (-1, 0), 1: (1, 0), 2: (0, -1), 3: (0, 1)}

    def __init__(self, size=4, pits=((1, 1), (2, 3)), goal=(3, 3), slip=0.0, seed=0):
        self.size, self.pits, self.goal, self.slip = size, set(pits), goal, slip
        self.rng = np.random.default_rng(seed)
        self.reset()

    def reset(self):
        self.position = (0, 0)
        return self.position

    def step(self, action):
        if self.slip and self.rng.random() < self.slip:
            action = int(self.rng.integers(4))
        dr, dc = self.ACTIONS[action]
        row = min(max(self.position[0] + dr, 0), self.size - 1)
        col = min(max(self.position[1] + dc, 0), self.size - 1)
        self.position = (row, col)
        if self.position == self.goal:
            return self.position, 10.0, True
        if self.position in self.pits:
            return self.position, -10.0, True
        return self.position, -1.0, False

def average_total(policy, episodes=2000, slip=0.2, seed=1):
    env, rng, totals = GridWorld(slip=slip, seed=seed), np.random.default_rng(0), []
    for _ in range(episodes):
        state, total = env.reset(), 0.0
        for _ in range(100):
            state, reward, done = env.step(policy(state, rng))
            total += reward
            if done:
                break
        totals.append(total)
    return float(np.mean(totals))

def planned_route(state, rng):
    return 3 if state[1] < 2 else (1 if state[0] < 3 else 3)

def safe_route(state, rng):
    return 3

risky = average_total(planned_route)
safe = average_total(safe_route)
print(risky, safe)
```

```python solution
import numpy as np

class GridWorld:
    ACTIONS = {0: (-1, 0), 1: (1, 0), 2: (0, -1), 3: (0, 1)}

    def __init__(self, size=4, pits=((1, 1), (2, 3)), goal=(3, 3), slip=0.0, seed=0):
        self.size, self.pits, self.goal, self.slip = size, set(pits), goal, slip
        self.rng = np.random.default_rng(seed)
        self.reset()

    def reset(self):
        self.position = (0, 0)
        return self.position

    def step(self, action):
        if self.slip and self.rng.random() < self.slip:
            action = int(self.rng.integers(4))
        dr, dc = self.ACTIONS[action]
        row = min(max(self.position[0] + dr, 0), self.size - 1)
        col = min(max(self.position[1] + dc, 0), self.size - 1)
        self.position = (row, col)
        if self.position == self.goal:
            return self.position, 10.0, True
        if self.position in self.pits:
            return self.position, -10.0, True
        return self.position, -1.0, False

def average_total(policy, episodes=2000, slip=0.2, seed=1):
    env, rng, totals = GridWorld(slip=slip, seed=seed), np.random.default_rng(0), []
    for _ in range(episodes):
        state, total = env.reset(), 0.0
        for _ in range(100):
            state, reward, done = env.step(policy(state, rng))
            total += reward
            if done:
                break
        totals.append(total)
    return float(np.mean(totals))

def planned_route(state, rng):
    return 3 if state[1] < 2 else (1 if state[0] < 3 else 3)

def safe_route(state, rng):
    return 1 if state[0] < 3 else 3

risky = average_total(planned_route)
safe = average_total(safe_route)
print(risky, safe)
```

```python test
import numpy as _np
assert "safe_route" in dir(), "Keep the function's name as safe_route."
_r = _np.random.default_rng(0)
_seen = {safe_route((r, c), _r) for r in range(4) for c in range(4) if (r, c) not in {(1, 1), (2, 3), (3, 3)}}
assert _seen <= {0, 1, 2, 3}, "safe_route must return an action number from 0 to 3."
assert _np.isclose(risky, average_total(planned_route)), "risky should be average_total(planned_route)."
assert _np.isclose(safe, average_total(safe_route)), "safe should be average_total(safe_route)."
assert safe > risky + 0.5, f"Your route averages {safe:.2f}, not clearly better than the risky route's {risky:.2f}. Keep away from the pits at (1, 1) and (2, 3)."
f"SUCCESS: In the slippery world your route averages {safe:.2f} against {risky:.2f} for hugging the pit. The best policy depends on the risks, not only the distance."
```

Hint: The left column and the bottom row are both away from the pits at (1, 1) and (2, 3). "Down while the row is below 3, then right" is one such policy.
:::

## What you learned

- In reinforcement learning an agent acts in an environment, receiving a new state and a reward after each action; it learns from rewards, not labels.
- An episode runs from a start to an ending state. A policy maps states to actions (deterministically or with probabilities).
- The return is the sum of future rewards, usually discounted: Gₜ = rₜ₊₁ + γ rₜ₊₂ + …, with the recursion Gₜ = rₜ₊₁ + γ Gₜ₊₁. γ sets how far ahead the agent looks.
- In the grid world, the planned route earned +5 every time, but in a slippery world (20% random moves) its average fell to about −1 while a route further from the pits kept about +1.9; good policies account for risk.
- RL's difficulties: no labels, delayed consequences (credit assignment), and the need to explore.

The next lesson isolates the exploration problem in its purest form: a row of slot machines with unknown payouts, where every pull is both a chance to earn and a chance to learn.
