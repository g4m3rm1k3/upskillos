---
title: 4.3 — Returns and Discounting
track: Reinforcement Learning in pygame
runtime: python
run: compare_policies.py
console: true
---

In the bandit room, one pull was the whole story: one action, one reward. In the grid world, the reward for a good move may come many steps later, at the goal, and a careless move may cost nothing now and lose everything three steps on. So an agent can't judge actions by their immediate reward. It has to judge them by everything they lead to.

That "everything" needs a single number. This lesson defines it, the **return**, and the **discount** that makes it work. Then it uses the return to compare policies fairly: by playing many episodes and averaging, with the standard error you know from lesson 2.2.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_returns.py** above.

```python file=tests/test_returns.py provided
# Tests for returns.py and compare_policies.py (lesson 4.3). Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_returns.py
import numpy as np
from pytest import approx

from grid import MAPS, GridWorld


def test_discount_later_rewards_count_less():
    from returns import discounted_return
    assert discounted_return([0.0, 0.0, 0.0, 1.0], 0.9) == approx(0.9 ** 3)
    assert discounted_return([1.0, 1.0, 1.0], 0.5) == approx(1 + 0.5 + 0.25)


def test_discount_gamma_one_is_the_plain_sum():
    from returns import discounted_return
    assert discounted_return([0.0, -1.0, 2.0, 0.5], 1.0) == approx(1.5)


def test_discount_of_nothing_is_zero():
    from returns import discounted_return
    assert discounted_return([], 0.9) == 0.0


class Right:
    """Always moves right, and counts how often it is told about a step."""

    def __init__(self):
        self.lessons = 0

    def act(self, state):
        return 3

    def learn(self, *transition):
        self.lessons += 1


def test_episode_collects_every_reward_until_the_end():
    from returns import run_episode
    agent = Right()
    assert run_episode(GridWorld(["S.G"]), agent) == [0.0, 1.0]
    assert agent.lessons == 2, "the agent hears about every step"


def test_episode_stops_when_time_runs_out():
    from returns import run_episode
    rewards = run_episode(GridWorld(["S..", "..G"], max_steps=5), Right())
    assert rewards == [0.0, 0.0, 0.0, 0.0, 0.0], "right, right, then bumping the edge until truncated"


def test_episode_same_seed_same_episode():
    from returns import run_episode
    env = GridWorld(MAPS["open"], slip=0.5)
    assert run_episode(env, Right(), seed=4) == run_episode(env, Right(), seed=4)


def test_evaluate_a_certain_policy_has_no_spread():
    from agents import FixedPolicy
    from returns import evaluate
    env = GridWorld(["S..G"])
    mean, error = evaluate(env, FixedPolicy([3, 3, 3, 3]), 20, 0.9)
    assert mean == approx(0.9 ** 2) and error == approx(0.0)


def test_evaluate_same_seed_same_answer():
    from agents import RandomAgent
    from returns import evaluate
    env = GridWorld(MAPS["walls"])
    a = evaluate(env, RandomAgent(4, np.random.default_rng(0)), 200, 0.9, seed=1)
    b = evaluate(env, RandomAgent(4, np.random.default_rng(0)), 200, 0.9, seed=1)
    assert a == b


def test_arrows_become_actions():
    from returns import policy_from_arrows
    assert policy_from_arrows(["v>", "<^"]).tolist() == [1, 3, 2, 0]
    assert policy_from_arrows(["#G"]).tolist() == [0, 0], "cells without an arrow get action 0"


def test_compare_routes_tie_without_slip():
    from compare_policies import table
    rows = {(slip, name): mean for slip, name, mean, _ in table(slips=(0.0,), episodes=20)}
    assert rows[(0.0, "top route")] == approx(0.9 ** 7)
    assert rows[(0.0, "bottom route")] == approx(0.9 ** 7)


def test_compare_routes_both_reach_the_goal():
    from agents import FixedPolicy
    from compare_policies import BOTTOM, TOP
    from returns import policy_from_arrows, run_episode
    for arrows in (TOP, BOTTOM):
        rewards = run_episode(GridWorld(MAPS["walls"]), FixedPolicy(policy_from_arrows(arrows)))
        assert rewards[-1] == 1.0 and len(rewards) == 8
```

`test_evaluate_a_certain_policy_has_no_spread` uses a map with no slip and a policy that always moves right. Every episode is identical, so the standard error must be exactly 0. A test built on a case whose answer you know exactly is the strongest kind.

```check
file tests/test_returns.py -- Click "Create provided tests/test_returns.py" above.
```

## Adding up a whole episode

An episode produces a list of rewards, one per step: r₁, r₂, r₃, … The **return** adds them up, with each reward shrunk a little more the later it comes:

```text
G = r₁ + γ·r₂ + γ²·r₃ + γ³·r₄ + …
```

γ (gamma) is the **discount factor**, a number from 0 to 1. With γ = 0.9, a reward one step later is worth 90% as much, two steps later 81%, and so on. Reaching the goal on the 4th step, with rewards `[0, 0, 0, 1]`, gives G = 0.9³ = 0.729. Reaching it on the 8th gives 0.9⁷ ≈ 0.478.

**Why discount at all?**

- **Sooner is better.** Without a discount (γ = 1), reaching the goal in 8 steps and in 80 steps score the same, 1. With γ < 1, the agent prefers short routes, without anyone telling it to.
- **Endless episodes stay finite.** A task that never ends could collect a reward forever, and with γ = 1 its return would be infinite and couldn't be compared. With γ < 1 the sum is limited: even a reward of 1 on every step forever adds up to 1 / (1 − γ), which is 10 for γ = 0.9 (a geometric series, as in lesson 2.3).
- **The far future is uncertain.** A reward 100 steps away may never come. Discounting is a way of trusting nearby rewards more.

Create `returns.py`:

```python file=returns.py
def discounted_return(rewards, gamma):
    total = 0.0
    for reward in reversed(rewards):
        total = reward + gamma * total
    return total
```

**How the loop computes it, backwards.** Writing the return out reveals a pattern: everything after the first reward is the *next* step's return, discounted once:

```text
G = r₁ + γ·(r₂ + γ·r₃ + γ²·r₄ + …) = r₁ + γ·G_next
```

So start from the **last** reward, where nothing follows, and work back, one `total = reward + gamma * total` per step. `reversed(rewards)` walks the list from the end. Traced for `[0, 0, 0, 1]`, γ = 0.9:

```text
reward 1:  total = 1 + 0.9 × 0     = 1
reward 0:  total = 0 + 0.9 × 1     = 0.9
reward 0:  total = 0 + 0.9 × 0.9   = 0.81
reward 0:  total = 0 + 0.9 × 0.81  = 0.729
```

Each line's `total` is the return **from that step on**. The rule "a step's return is its reward plus γ times the next step's return" is the seed of everything in Chapter 5: the Bellman equations are exactly this rule, with probabilities added.

```predict
question: An agent reaches the goal on its 8th step and earns nothing before that. With γ = 0.9, what is its return? (Three decimal places.)
answer: 0.478
tolerance: 0.001
explain: The +1 arrives on step 8, so it's discounted 7 times: 0.9⁷ ≈ 0.478. Shortest paths on the `walls` map are 8 steps (lesson 4.1), so 0.478 is the best return any policy can get there.
verify: .venv/Scripts/python -c "from returns import discounted_return; print(round(discounted_return([0.0] * 7 + [1.0], 0.9), 3))"
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_returns.py -k discount" label="discounted_return adds rewards, discounting later ones" -- Work backwards: start at 0, and for each reward from the last to the first, total = reward + gamma * total.
```

## Playing one episode

Add `run_episode`, the agent–environment loop from lesson 4.2's workbench without the window:

```python file=returns.py
def discounted_return(rewards, gamma):
    total = 0.0
    for reward in reversed(rewards):
        total = reward + gamma * total
    return total


def run_episode(env, agent, seed=None):
    state, _ = env.reset(seed=seed)
    rewards = []
    while True:
        action = agent.act(state)
        next_state, reward, terminated, truncated, _ = env.step(action)
        agent.learn(state, action, reward, next_state, terminated, truncated)
        rewards.append(reward)
        state = next_state
        if terminated or truncated:
            return rewards
```

It resets, then repeats act → step → learn until the episode ends either way, and returns every reward it collected. It reports each step to the agent's `learn`, exactly as the workbench does, so later lessons can train agents with this same function.

```check
run ".venv/Scripts/python -m pytest -q tests/test_returns.py -k episode" label="run_episode plays to the end and returns every reward" -- Loop until terminated or truncated, appending each reward; call agent.learn with the step's six values before moving on.
```

## Judging a policy

```python file=returns.py
import numpy as np

from stats import sample_mean, standard_error

ARROWS = "^v<>"      # the arrow for each action number


def discounted_return(rewards, gamma):
    total = 0.0
    for reward in reversed(rewards):
        total = reward + gamma * total
    return total


def run_episode(env, agent, seed=None):
    state, _ = env.reset(seed=seed)
    rewards = []
    while True:
        action = agent.act(state)
        next_state, reward, terminated, truncated, _ = env.step(action)
        agent.learn(state, action, reward, next_state, terminated, truncated)
        rewards.append(reward)
        state = next_state
        if terminated or truncated:
            return rewards


def evaluate(env, agent, episodes, gamma, seed=0):
    env.reset(seed=seed)
    returns = [discounted_return(run_episode(env, agent), gamma) for _ in range(episodes)]
    return sample_mean(returns), standard_error(returns)


def policy_from_arrows(rows):
    return np.array([max(ARROWS.find(ch), 0) for row in rows for ch in row])
```

- **`evaluate`** plays many episodes and returns the average return, with its standard error from lesson 2.2. That average estimates the policy's **expected return**, the number every method in the coming chapters tries to make as large as possible. It seeds the environment once, at the start, so the whole evaluation can be repeated exactly.
- **`policy_from_arrows`** turns a picture into a policy. You draw the action for every cell, using `^ v < >`, and it becomes the action numbers 0 to 3. `ARROWS.find(ch)` gives the position of the arrow in `"^v<>"`, which is its action number, or −1 for any other character (walls, holes, the goal), where `max(…, 0)` puts a harmless 0. The comprehension `for row in rows for ch in row` reads the rows in order and the characters in each row in order, which is the state numbering from lesson 1.1, so the array lines up with state numbers.

```check
run ".venv/Scripts/python -m pytest -q tests/test_returns.py -k \"evaluate or arrows\"" label="evaluate and policy_from_arrows work" -- policy_from_arrows: each arrow's position in "^v<>" is its action; any other character becomes 0.
```

## Which route is better?

`compare_policies.py` draws two complete policies for the `walls` map as arrow pictures and evaluates them, with the random agent as a baseline:

```python file=compare_policies.py
import sys

import numpy as np

from agents import FixedPolicy, RandomAgent
from grid import MAPS, GridWorld
from returns import evaluate, policy_from_arrows

GAMMA = 0.9
EPISODES = 2000

TOP = [">>v#v",
       "^#v#v",
       "^#>>v",
       "^##Hv",
       ">>>>G"]
BOTTOM = ["v<<#v",
          "v#^#v",
          "v#^<v",
          "v##Hv",
          ">>>>G"]


def agents():
    return {
        "random": RandomAgent(4, np.random.default_rng(1)),
        "top route": FixedPolicy(policy_from_arrows(TOP)),
        "bottom route": FixedPolicy(policy_from_arrows(BOTTOM)),
    }


def table(slips=(0.0, 0.2), episodes=EPISODES):
    rows = []
    for slip in slips:
        for name, agent in agents().items():
            env = GridWorld(MAPS["walls"], slip=slip, max_steps=100)
            mean, error = evaluate(env, agent, episodes, GAMMA, seed=0)
            rows.append((slip, name, mean, error))
    return rows


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "watch":
        from workbench import Workbench
        slip = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0
        env = GridWorld(MAPS["walls"], slip=slip, max_steps=100)
        Workbench(env, agents()[sys.argv[2] + " route"]).run(f"{sys.argv[2]} route, slip {slip}")
    else:
        print(f"discounted return with gamma {GAMMA}, {EPISODES} episodes each")
        for slip, name, mean, error in table():
            print(f"slip {slip:.1f}  {name:<13} {mean:+.3f} +/- {2 * error:.3f}")
```

Read the two arrow maps. Each says what to do in **every** cell, not only on its route. A policy has to, because a slip can push the agent off its route, and it then needs to know what to do from wherever it lands. `TOP` heads along the top and down the right-hand side, past the hole. `BOTTOM` heads down the left side and along the bottom. From the middle of the map it even turns back up and round, to keep away from the hole.

`agents()` builds fresh agents each time it's called, so one evaluation can't affect another.

Run it (it's a console program, so its output appears in the output pane).

```predict
question: With no slip, both routes take 8 steps. With slip 0.2, which route will earn the higher average discounted return?
choice: the top route
choice: the bottom route
choice: neither: both are 8 steps long
answer: the bottom route
explain: Measured over 2000 episodes each: the bottom route about +0.30, the top route about +0.20, each ±0.02 at most. That's a real difference. Along the top, two moves have the hole right beside them (lesson 4.1's slip prediction), and along the bottom only one. Each slide into the hole costs −1 and ends the episode. Slides that hit walls cost time, which γ turns into a smaller return. Without slip both score exactly 0.478. **Which policy is best depends on the world's randomness**, and you only see it by averaging over many episodes.
verify: script safer_route.py
```

The output:

```text
discounted return with gamma 0.9, 2000 episodes each
slip 0.0  random        -0.014 +/- 0.003
slip 0.0  top route     +0.478 +/- 0.000
slip 0.0  bottom route  +0.478 +/- 0.000
slip 0.2  random        -0.017 +/- 0.003
slip 0.2  top route     +0.199 +/- 0.016
slip 0.2  bottom route  +0.302 +/- 0.011
```

The random agent's return is near zero: its holes (−1, discounted) and its rare, late goals (+1, discounted a lot) nearly cancel. Without slip the routes have no spread at all, because every episode is identical.

Watch either route on the ice in the workbench:

```text
.venv\Scripts\python compare_policies.py watch bottom 0.2
.venv\Scripts\python compare_policies.py watch top 0.2
```

You wrote these policies by hand, from your own understanding of the map. That doesn't scale: a bigger map, or different slip, needs new pictures. The next chapters find the best policy automatically: Chapter 5 by computing it from the rules, Chapters 6 and 7 by learning it from experience. First, though, you'll make sure the world they'll compute and learn from is right.

```check
run ".venv/Scripts/python -m pytest -q tests/test_returns.py" label="all lesson 4.3 tests pass" -- Both arrow maps must reach the goal in 8 steps without slip; check each row of TOP and BOTTOM against the map.
```
