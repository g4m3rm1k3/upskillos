---
title: 8.2 — FrozenLake: Your Agent on Someone Else's World
track: Reinforcement Learning in pygame
runtime: python
run: lake_view.py
console: true
---

**FrozenLake** is one of Gymnasium's built-in environments: a 4 × 4 frozen lake with holes, a start and a goal. On slippery ice, every move goes the way you aimed only a third of the time; the other two thirds slide you to either side. It's the same kind of world you built, written by other people, with their own conventions.

In this lesson your Q-learning agent learns FrozenLake **unchanged**. Then you read FrozenLake's own rulebook, which Gymnasium exposes, turn it into lesson 4.5's tables, and use value iteration from Chapter 5 to compute the best possible policy, so your learner can be judged against the truth on a world you didn't write. The best policy turns out to be strange, and your agent finds it anyway.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_lake.py** above.

```python file=tests/test_lake.py provided
# Tests for frozen.py and lake_view.py (lesson 8.2). Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_lake.py
import numpy as np
from pytest import approx


def lake_tables():
    from frozen import make_lake, tables_from_gym
    env = make_lake()
    return tables_from_gym(env.unwrapped.P, 16, 4)


def test_tables_hold_gymnasiums_own_rules():
    P, R, terminal = lake_tables()
    assert P.shape == (16, 4, 16) and np.allclose(P.sum(axis=2), 1.0)
    assert P[0, 1].tolist() == approx([1 / 3, 1 / 3, 0, 0, 1 / 3] + [0] * 11), "down from S: stay, right or down"
    assert R[14, 2, 15] == 1.0, "right from 14 into the goal pays 1"
    assert np.flatnonzero(terminal).tolist() == [5, 7, 11, 12, 15], "four holes and the goal"


def test_tables_give_the_known_optimum():
    from planning import value_iteration
    P, R, terminal = lake_tables()
    V, _ = value_iteration(P, R, terminal, 0.99, tolerance=1e-10)
    assert V[0] == approx(0.542, abs=0.001)


def test_trained_agent_learns_close_to_the_optimum():
    from frozen import GAMMA, trained_agent
    from planning import evaluate_policy, greedy_policy
    P, R, terminal = lake_tables()
    agent = trained_agent(seed=0, episodes=3000)
    V, _ = evaluate_policy(P, R, terminal, greedy_policy(agent.Q), GAMMA, tolerance=1e-10)
    assert V[0] > 0.45, f"the learned greedy policy is worth {V[0]:.3f} of a possible 0.542"


def test_success_rate_of_the_optimal_policy():
    from frozen import success_rate
    from planning import q_from_v, value_iteration
    P, R, terminal = lake_tables()
    V, _ = value_iteration(P, R, terminal, 0.99, tolerance=1e-10)
    rate, error = success_rate(q_from_v(P, R, V, 0.99), episodes=3000)
    assert abs(rate - 0.74) < 0.04 and 0 < error < 0.03


def test_arrows_follow_frozenlakes_action_numbers():
    from frozen import arrow_map
    Q = np.zeros((16, 4))
    Q[:, 2] = 1.0                                  # action 2 is "right" in FrozenLake
    assert arrow_map(Q) == [">>>>", ">H>H", ">>>H", "H>>G"]


def test_watch_report_and_window():
    from lake_view import report, watch
    agent = report()
    watch(agent, episodes=1)
```

`test_arrows_follow_frozenlakes_action_numbers` holds the first lesson of using someone else's environment: **actions are just numbers, and what they mean is the environment's choice**. In your grid world 0 is up. In FrozenLake 0 is left. Gymnasium's documentation for every environment has an "Action Space" section saying which is which. Read it before trusting any arrow you draw.

```check
file tests/test_lake.py -- Click "Create provided tests/test_lake.py" above.
```

## Gymnasium's own rules as tables

Create `frozen.py`:

```python file=frozen.py
import gymnasium as gym
import numpy as np

ARROWS = "<v>^"     # FrozenLake's own action numbers: 0 left, 1 down, 2 right, 3 up
GAMMA = 0.99


def make_lake(render_mode=None):
    return gym.make("FrozenLake-v1", is_slippery=True, render_mode=render_mode)


def tables_from_gym(model, n_states, n_actions):
    P = np.zeros((n_states, n_actions, n_states))
    R = np.zeros((n_states, n_actions, n_states))
    terminal = np.zeros(n_states, dtype=bool)
    for state in range(n_states):
        for action in range(n_actions):
            for probability, next_state, reward, done in model[state][action]:
                P[state, action, next_state] += probability
                R[state, action, next_state] = reward
                terminal[next_state] |= done
    return P, R, terminal
```

- **`make_lake`** builds `FrozenLake-v1` with `gym.make`, slippery, with Gymnasium's own time limit of 100 steps (lesson 8.1's `TimeLimit`).
- **`env.unwrapped.P`** is FrozenLake's complete rulebook, which its authors expose for planning algorithms like yours. `.unwrapped` reaches through the wrappers to the environment itself (lesson 8.1). The rulebook is a dictionary of lists: `P[state][action]` is a list of `(probability, next_state, reward, done)` outcomes. For example, `P[0][1]`, down from the start, is "1/3 stay, 1/3 down, 1/3 right".
- **`tables_from_gym`** copies that into the `P`, `R` and `terminal` arrays of lesson 4.5, so lesson 5.2's `value_iteration` can run on it unchanged. A state is terminal if any outcome arriving in it has `done=True`. `terminal[next_state] |= done` uses `|=`, "or-equals", so a state, once marked terminal, stays marked.

```predict
question: In FrozenLake, which way does action 0 move? (Check the action numbers before you draw any arrows.)
choice: up, as in your grid world
choice: left
choice: down
answer: left
explain: Left: FrozenLake numbers its actions 0 left, 1 down, 2 right, 3 up. Your grid world uses 0 up, 1 down, 2 left, 3 right. The agent doesn't care, since it learns about numbers. But every arrow you draw, and every conclusion you read off a policy, depends on knowing the mapping. That's why `frozen.py` has its own `ARROWS = "<v>^"`.
verify: script lake_action_zero.py
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_lake.py -k tables" label="tables_from_gym copies FrozenLake's rules into P, R and terminal" -- For each (probability, next_state, reward, done) in model[state][action]: add the probability to P, set R, and mark terminal[next_state] when done.
```

## Train your agent on FrozenLake

```python file=frozen.py
import gymnasium as gym
import numpy as np

from learners import QLearning
from training import train

ARROWS = "<v>^"     # FrozenLake's own action numbers: 0 left, 1 down, 2 right, 3 up
GAMMA = 0.99


def make_lake(render_mode=None):
    return gym.make("FrozenLake-v1", is_slippery=True, render_mode=render_mode)


def tables_from_gym(model, n_states, n_actions):
    P = np.zeros((n_states, n_actions, n_states))
    R = np.zeros((n_states, n_actions, n_states))
    terminal = np.zeros(n_states, dtype=bool)
    for state in range(n_states):
        for action in range(n_actions):
            for probability, next_state, reward, done in model[state][action]:
                P[state, action, next_state] += probability
                R[state, action, next_state] = reward
                terminal[next_state] |= done
    return P, R, terminal


def trained_agent(seed, episodes=5000):
    env = make_lake()
    agent = QLearning(env.observation_space.n, env.action_space.n, np.random.default_rng(seed),
                      epsilon=0.1, gamma=GAMMA, step=0.1)
    train(env, agent, episodes, seed=seed)
    env.close()
    return agent
```

`trained_agent` is lesson 8.1's training, pointed at a different environment: the same `QLearning`, sized from the spaces, and the same `train`. Two settings differ from the grid world, both for reasons from earlier chapters:

- **γ = 0.99.** The only reward is +1 at the goal, often reached only after many slips. With γ = 0.9 a route of 30 steps would be worth 0.9²⁹ ≈ 0.05, hardly distinguishable from failing. With 0.99 it's worth 0.75.
- **A constant step of 0.1.** With step 1/N, learners here stall at 0.2–0.5 after 5000 episodes. With 0.1, every seed tried reached 0.53–0.54. The reward is rare, so for a long time every target is 0, and 1/N averages remember those early zeros for good (lesson 7.3). A constant step lets them fade.

```check
run ".venv/Scripts/python -m pytest -q tests/test_lake.py -k trained" label="trained_agent learns FrozenLake close to the optimum" -- QLearning with epsilon 0.1, gamma GAMMA and step 0.1, trained with train(env, agent, episodes, seed=seed).
```

## Judge by success, and draw the policy

```python file=frozen.py
import gymnasium as gym
import numpy as np

from evaluation import greedy_returns
from learners import QLearning
from training import train

ARROWS = "<v>^"     # FrozenLake's own action numbers: 0 left, 1 down, 2 right, 3 up
GAMMA = 0.99


def make_lake(render_mode=None):
    return gym.make("FrozenLake-v1", is_slippery=True, render_mode=render_mode)


def tables_from_gym(model, n_states, n_actions):
    P = np.zeros((n_states, n_actions, n_states))
    R = np.zeros((n_states, n_actions, n_states))
    terminal = np.zeros(n_states, dtype=bool)
    for state in range(n_states):
        for action in range(n_actions):
            for probability, next_state, reward, done in model[state][action]:
                P[state, action, next_state] += probability
                R[state, action, next_state] = reward
                terminal[next_state] |= done
    return P, R, terminal


def trained_agent(seed, episodes=5000):
    env = make_lake()
    agent = QLearning(env.observation_space.n, env.action_space.n, np.random.default_rng(seed),
                      epsilon=0.1, gamma=GAMMA, step=0.1)
    train(env, agent, episodes, seed=seed)
    env.close()
    return agent


def success_rate(Q, episodes=2000, seed=10_000):
    reached = greedy_returns(make_lake(), Q, episodes, 1.0, seed)
    return reached.mean(), 2 * reached.std(ddof=1) / np.sqrt(episodes)


def arrow_map(Q):
    desc = make_lake().unwrapped.desc.astype(str)
    rows, cols = desc.shape
    return ["".join(desc[r][c] if desc[r][c] in "HG" else ARROWS[Q[r * cols + c].argmax()] for c in range(cols))
            for r in range(rows)]
```

- **`success_rate`** judges the greedy policy (lesson 7.2's `greedy_returns`) with γ = 1. Then each episode's return is exactly 1 if it reached the goal and 0 if not, so the average is the share of episodes that succeed, with its ±2 standard errors. "Reaches the goal 75% of the time" is easier to grasp than a discounted value.
- **`arrow_map`** draws the greedy policy as lesson 4.3's arrow pictures, using FrozenLake's own arrows. `desc` is the map, which Gymnasium also exposes, as an array of letters.

```check
run ".venv/Scripts/python -m pytest -q tests/test_lake.py -k \"success or arrows\"" label="success_rate and arrow_map judge and draw a policy" -- success_rate: greedy_returns with gamma 1.0, then the mean and 2 * std / sqrt(episodes). arrow_map: FrozenLake's ARROWS, with H and G kept as letters.
```

## Watch it on the ice

```python file=lake_view.py
import sys

from frozen import GAMMA, arrow_map, make_lake, success_rate, tables_from_gym, trained_agent
from planning import q_from_v, value_iteration


def report(seed=0):
    env = make_lake()
    P, R, terminal = tables_from_gym(env.unwrapped.P, env.observation_space.n, env.action_space.n)
    V, _ = value_iteration(P, R, terminal, GAMMA, tolerance=1e-10)
    best_Q = q_from_v(P, R, V, GAMMA)
    agent = trained_agent(seed)
    for name, Q in (("learned", agent.Q), ("optimal", best_Q)):
        rate, error = success_rate(Q)
        print(f"{name} policy: reaches the goal {rate:.1%} +/- {error:.1%}")
        print("\n".join("    " + row for row in arrow_map(Q)))
    return agent


def watch(agent, episodes=5):
    env = make_lake(render_mode="human")
    for _ in range(episodes):
        state, _ = env.reset()
        while True:
            state, _, terminated, truncated, _ = env.step(int(agent.Q[state].argmax()))
            if terminated or truncated:
                break
    env.close()


if __name__ == "__main__":
    agent = report()
    if "quiet" not in sys.argv:
        watch(agent)
```

`report` computes the optimal policy from the tables and trains your agent, then prints both arrow maps and success rates. `watch` plays the learned policy in FrozenLake's own `"human"` window, which Gymnasium draws with pygame, the library you've been using since lesson 0.3.

Make two predictions before running it.

```predict
question: The best possible policy: from the start (top left), which way does it move first?
choice: right, towards the goal
choice: down, towards the goal
choice: left, into the wall
answer: left, into the wall
explain: Left, into the wall. On ice that slides a third of the time to each side, walking into a wall is a way to stay safe: aiming left from the corner, you either bump the wall and stay put, or slide down or up. Neither can reach a hole. The whole optimal policy is like this: it pushes against walls next to holes so that a slide can never go the wrong way. It's slow, and much safer. Nobody would design it by hand, and value iteration found it from the rules alone.
verify: .venv/Scripts/python -c "from frozen import GAMMA, make_lake, tables_from_gym, ARROWS; from planning import value_iteration, q_from_v; e = make_lake(); P, R, T = tables_from_gym(e.unwrapped.P, 16, 4); V, _ = value_iteration(P, R, T, GAMMA, tolerance=1e-10); print({'<': 'left, into the wall', '>': 'right, towards the goal', 'v': 'down, towards the goal', '^': 'up'}[ARROWS[q_from_v(P, R, V, GAMMA)[0].argmax()]])"
```

```predict
question: How often does even the best possible policy reach the goal? (A share between 0 and 1, two decimal places.)
answer: 0.75
tolerance: 0.04
explain: About 75%. A quarter of the time, the ice wins: unlucky slides, or running out of the 100 steps while being careful. No policy can do better on this lake. Without the yardstick from value iteration, a learner reaching 75% might look like it was failing a quarter of the time. It isn't. It's as good as possible.
verify: script lake_best_rate.py
```

Run it.

```predict
question: Your Q-learner (seed 0, 5000 episodes): how does its policy compare with the optimal one?
choice: The same arrows, cell for cell
choice: Mostly the same, but it heads straight for the goal at the start
choice: Very different: it hasn't learned the wall trick
answer: The same arrows, cell for cell
explain: Identical, wall-hugging and all, with a success rate of about 76% ± 2%, matching the optimum's within noise. Your agent, unchanged from Chapter 7, learned from experience alone, on a world someone else wrote, the same strange policy that value iteration computes from the rulebook. That's the promise of reinforcement learning, kept.
verify: script lake_learned_vs_best.py
```

Try `gym.make("FrozenLake-v1", map_name="8x8", is_slippery=True)` at the prompt: 64 states, and the same code. It needs many more episodes, which hints at lesson 8.3's problem: what happens when states can't be listed at all?

```check
run ".venv/Scripts/python -m pytest -q tests/test_lake.py" label="all lesson 8.2 tests pass" -- report: value iteration on tables_from_gym(env.unwrapped.P, ...), a trained_agent, then success_rate and arrow_map for both.
```
