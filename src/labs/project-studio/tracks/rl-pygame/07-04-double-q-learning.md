---
title: 7.4 — The Maximisation Bias and Double Q-learning
track: Reinforcement Learning in pygame
runtime: python
run: bias_view.py
---

Q-learning's target takes a **maximum** over estimates: `max over a' of Q(s', a')`. Each estimate is noisy. Taking the largest of several noisy numbers systematically picks the ones whose noise happened to be positive, so the maximum of the estimates comes out **larger** than the maximum of the true values. Q-learning therefore tends to think things are better than they are, and it can be lured into actions that only *look* good because of luck.

This lesson builds a tiny world designed to expose that, measures how badly Q-learning is fooled, and fixes it with **Double Q-learning** (van Hasselt, 2010). The same fix, under the name **Double DQN**, became standard in deep reinforcement learning, so this is an idea you'll meet again.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_bias.py** above.

```python file=tests/test_bias.py provided
# Tests for bias.py, DoubleQLearning in learners.py and bias_view.py (lesson 7.4). Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_bias.py
import numpy as np
from pytest import approx


def test_world_left_from_a_leads_to_b():
    from bias import BiasWorld
    env = BiasWorld()
    assert env.reset() == (0, {})
    assert env.step(0) == (1, 0.0, False, False, {})


def test_world_right_from_a_ends_with_nothing():
    from bias import BiasWorld
    env = BiasWorld()
    env.reset()
    assert env.step(3) == (2, 0.0, True, False, {})


def test_world_b_pays_about_minus_a_tenth_and_ends():
    from bias import BiasWorld
    env = BiasWorld()
    env.reset(seed=0)
    rewards = []
    for _ in range(20_000):
        env.state = 1
        _, reward, terminated, _, _ = env.step(int(env.rng.integers(10)))
        assert terminated
        rewards.append(reward)
    assert abs(np.mean(rewards) - (-0.1)) < 0.03
    assert 0.9 < np.std(rewards) < 1.1


def test_world_max_of_noisy_estimates_is_biased_upwards():
    from bias import biased_max
    rng = np.random.default_rng(0)
    one = biased_max(10, 1, 20_000, rng)
    many = biased_max(10, 64, 20_000, rng)
    assert one > 1.0, "the best of ten noisy estimates of -0.1 looks far better than -0.1"
    assert -0.1 < many < one, "more samples shrink the bias, but it stays above the true -0.1"


class Always:
    def __init__(self, action):
        self.action = action

    def act(self, state):
        return self.action

    def learn(self, *transition):
        pass


def test_share_counts_lefts_per_episode():
    from bias import left_share
    assert left_share(lambda env, seed: Always(0), 5, 4).tolist() == [1.0] * 4
    assert left_share(lambda env, seed: Always(2), 5, 4).tolist() == [0.0] * 4


def test_double_updates_one_table_using_the_other():
    from learners import DoubleQLearning
    agent = DoubleQLearning(3, 4, np.random.default_rng(0), gamma=1.0, step=1.0)
    agent.QA[1] = [5.0, 0.0, 0.0, 0.0]          # QA thinks action 0 is best in B
    agent.QB[1] = [-1.0, 9.0, 0.0, 0.0]         # QB thinks action 1 is best in B
    before_a, before_b = agent.QA.copy(), agent.QB.copy()
    agent.learn(0, 0, 0.0, 1, False, False)
    if not np.array_equal(agent.QA, before_a):
        assert np.array_equal(agent.QB, before_b), "only one table changes"
        assert agent.QA[0, 0] == approx(-1.0), "QA picks action 0, QB judges it: -1"
    else:
        assert agent.QB[0, 0] == approx(0.0), "QB picks action 1, QA judges it: 0"


def test_double_acts_on_the_average_of_both_tables():
    from learners import DoubleQLearning
    agent = DoubleQLearning(3, 4, np.random.default_rng(0), step=0.5)
    agent.learn(0, 2, 4.0, 2, True, False)
    assert np.allclose(agent.Q, (agent.QA + agent.QB) / 2)
    assert agent.Q[0, 2] == approx(1.0), "one table moved halfway to 4; the average is 1"


def test_double_chooses_each_table_about_half_the_time():
    from learners import DoubleQLearning
    agent = DoubleQLearning(3, 4, np.random.default_rng(1), step=0.5)
    a_updates = 0
    for i in range(2000):
        before = agent.QA.copy()
        agent.learn(0, 1, float(i), 2, True, False)      # a new reward each time, so every update changes something
        a_updates += not np.array_equal(before, agent.QA)
    assert 900 < a_updates < 1100


def test_chart_two_tables_go_left_far_less_often():
    from bias import left_share
    from bias_view import make
    from learners import DoubleQLearning, QLearning
    q = left_share(make(QLearning), 200, 100)
    double = left_share(make(DoubleQLearning), 200, 100)
    assert q.max() > 0.5 and double.max() < 0.3


def test_chart_window_opens_and_closes():
    from bias_view import run
    assert run(max_frames=2) == 2
```

`test_double_updates_one_table_using_the_other` sets up two tables that disagree about which action in B is best, and checks the exact number that results, whichever table the coin picks. It's a precise statement of the Double Q-learning rule. Read it again after the step that writes it.

```check
file tests/test_bias.py -- Click "Create provided tests/test_bias.py" above.
```

## A world built to fool a maximiser

This is Sutton & Barto's Example 6.7. Create `bias.py`:

```python file=bias.py
import numpy as np


class BiasWorld:
    """From A, action 0 goes left to B and every other action ends the episode with 0.
    From B, every action ends the episode with a reward drawn around -0.1."""

    def __init__(self, n_actions=10, mean=-0.1):
        self.n_states = 3            # A, B, and the end
        self.n_actions = n_actions
        self.mean = mean
        self.rng = np.random.default_rng()
        self.state = 0

    def reset(self, seed=None):
        if seed is not None:
            self.rng = np.random.default_rng(seed)
        self.state = 0
        return self.state, {}

    def step(self, action):
        if self.state == 0 and action == 0:
            self.state = 1
            return 1, 0.0, False, False, {}
        reward = 0.0 if self.state == 0 else float(self.rng.normal(self.mean, 1.0))
        self.state = 2
        return 2, reward, True, False, {}


def biased_max(n_actions, samples, trials, rng, mean=-0.1):
    estimates = rng.normal(mean, 1.0, (trials, n_actions, samples)).mean(axis=2)
    return float(estimates.max(axis=1).mean())
```

The world has two decision points:

```text
              right (any action but 0)  →  end, reward 0
        A  ─┤
              left (action 0)  →  B  →  any of 10 actions  →  end, reward ~ normal(−0.1, 1)
```

Going left is **worse** on average: −0.1 against 0. But each of B's ten actions pays a very noisy reward. `BiasWorld` follows the agreement from lesson 4.2: `reset`, and `step` returning the five values. So every learner you've written works on it unchanged. It doesn't need to be a grid.

**`biased_max`** shows the trap directly, without any learning. It makes `trials` sets of ten estimates, each the average of `samples` noisy rewards from an action whose true mean is −0.1, and averages the **largest** estimate in each set. `rng.normal(mean, 1.0, (trials, n_actions, samples))` draws all of them at once as a 3D array, and `.mean(axis=2)` averages each action's samples.

```predict
question: Ten actions all have a true average of −0.1. You estimate each from a single noisy reward (standard deviation 1), then take the largest estimate. On average, how large is it? (One decimal place.)
answer: 1.4
tolerance: 0.1
explain: About +1.44. Every action is worth −0.1, yet the best-looking one appears to be worth +1.4, because the maximum picks whichever estimate was luckiest. With 4 samples per estimate it's about +0.67, with 16 about +0.29, with 64 about +0.09: shrinking like 1/√n (lesson 2.2), but always above the truth. Q-learning's target takes exactly this kind of maximum, at every step, over estimates built from few samples.
verify: .venv/Scripts/python -c "import numpy as np; from bias import biased_max; print(round(biased_max(10, 1, 20000, np.random.default_rng(0)), 1))"
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_bias.py -k world" label="BiasWorld behaves as described, and the max of estimates is biased" -- From A, action 0 moves to B with reward 0; any other action ends with 0. From B, every action ends with rng.normal(mean, 1.0).
```

## Count the left turns

```python file=bias.py
import numpy as np


class BiasWorld:
    """From A, action 0 goes left to B and every other action ends the episode with 0.
    From B, every action ends the episode with a reward drawn around -0.1."""

    def __init__(self, n_actions=10, mean=-0.1):
        self.n_states = 3            # A, B, and the end
        self.n_actions = n_actions
        self.mean = mean
        self.rng = np.random.default_rng()
        self.state = 0

    def reset(self, seed=None):
        if seed is not None:
            self.rng = np.random.default_rng(seed)
        self.state = 0
        return self.state, {}

    def step(self, action):
        if self.state == 0 and action == 0:
            self.state = 1
            return 1, 0.0, False, False, {}
        reward = 0.0 if self.state == 0 else float(self.rng.normal(self.mean, 1.0))
        self.state = 2
        return 2, reward, True, False, {}


def biased_max(n_actions, samples, trials, rng, mean=-0.1):
    estimates = rng.normal(mean, 1.0, (trials, n_actions, samples)).mean(axis=2)
    return float(estimates.max(axis=1).mean())



def left_share(make_agent, runs, episodes, seed=0):
    lefts = np.zeros(episodes)
    for run in range(runs):
        env = BiasWorld()
        env.reset(seed=seed + run)
        agent = make_agent(env, seed + run)
        for episode in range(episodes):
            state, _ = env.reset()
            action = agent.act(state)
            lefts[episode] += action == 0
            while True:
                next_state, reward, terminated, truncated, _ = env.step(action)
                agent.learn(state, action, reward, next_state, terminated, truncated)
                if terminated or truncated:
                    break
                state = next_state
                action = agent.act(state)
    return lefts / runs
```

`left_share` runs many independent learners for many episodes, and records, for each episode number, the share of runs that went left from A. Separate runs give independent estimates (lesson 2.2), so averaging them shows what the *method* tends to do, not what one lucky run did. The episode loop is `run_episode`'s act → step → learn, written out so it can record the first action of each episode.

```check
run ".venv/Scripts/python -m pytest -q tests/test_bias.py -k share" label="left_share records how often each episode goes left" -- For each run and episode, add 1 to lefts[episode] when the first action from A is 0; divide by the number of runs at the end.
```

## Double Q-learning

The bias comes from using the **same** noisy estimates to do two jobs: to **choose** the best next action, and to **value** it. When one estimate is lucky, it gets chosen *because* it's lucky, and then its lucky value is used. Double Q-learning keeps **two** independent tables and splits the jobs:

```python file=learners.py
import numpy as np

from averages import update
from chance import bernoulli
from qtable import greedy_action


class TabularAgent:
    def __init__(self, n_states, n_actions, rng, epsilon=0.1, gamma=0.9, step=None, initial=0.0):
        self.Q = np.full((n_states, n_actions), float(initial))
        self.N = np.zeros((n_states, n_actions), dtype=int)
        self.rng = rng
        self.epsilon = epsilon
        self.gamma = gamma
        self.step = step

    def act(self, state):
        if bernoulli(self.epsilon, self.rng):
            return int(self.rng.integers(self.Q.shape[1]))
        return greedy_action(self.Q[state], self.rng)

    def nudge(self, state, action, target):
        self.N[state, action] += 1
        step = self.step if self.step is not None else 1 / self.N[state, action]
        self.Q[state, action] = update(self.Q[state, action], target, step)


class MonteCarlo(TabularAgent):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.episode = []

    def learn(self, state, action, reward, next_state, terminated, truncated):
        self.episode.append((state, action, reward))
        if terminated or truncated:
            G = 0.0
            for s, a, r in reversed(self.episode):
                G = r + self.gamma * G
                self.nudge(s, a, G)
            self.episode = []


class TDPredictor:
    def __init__(self, n_states, n_actions, rng, step=0.1, gamma=1.0, initial=0.5):
        self.V = np.full(n_states, float(initial))
        self.n_actions = n_actions
        self.rng = rng
        self.step = step
        self.gamma = gamma

    def act(self, state):
        return int(self.rng.integers(self.n_actions))

    def learn(self, state, action, reward, next_state, terminated, truncated):
        target = reward if terminated else reward + self.gamma * self.V[next_state]
        self.V[state] = update(self.V[state], target, self.step)


class MCPredictor(TDPredictor):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.episode = []

    def learn(self, state, action, reward, next_state, terminated, truncated):
        self.episode.append((state, reward))
        if terminated or truncated:
            G = 0.0
            for s, r in reversed(self.episode):
                G = r + self.gamma * G
                self.V[s] = update(self.V[s], G, self.step)
            self.episode = []


class Sarsa(TabularAgent):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.next_action = None

    def act(self, state):
        if self.next_action is not None:
            action, self.next_action = self.next_action, None
            return action
        return super().act(state)

    def learn(self, state, action, reward, next_state, terminated, truncated):
        if terminated:
            target = reward
        else:
            self.next_action = super().act(next_state)
            target = reward + self.gamma * self.Q[next_state, self.next_action]
        self.nudge(state, action, target)
        if terminated or truncated:
            self.next_action = None


class QLearning(TabularAgent):
    def learn(self, state, action, reward, next_state, terminated, truncated):
        target = reward if terminated else reward + self.gamma * self.Q[next_state].max()
        self.nudge(state, action, target)


class ExpectedSarsa(TabularAgent):
    def policy(self, state):
        row = self.Q[state]
        best = (row == row.max()) / np.sum(row == row.max())
        return (1 - self.epsilon) * best + self.epsilon / len(row)

    def learn(self, state, action, reward, next_state, terminated, truncated):
        expected = np.dot(self.policy(next_state), self.Q[next_state])
        target = reward if terminated else reward + self.gamma * expected
        self.nudge(state, action, target)


class DoubleQLearning(TabularAgent):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.QA = self.Q.copy()
        self.QB = self.Q.copy()

    def learn(self, state, action, reward, next_state, terminated, truncated):
        if bernoulli(0.5, self.rng):
            update, other = self.QA, self.QB
        else:
            update, other = self.QB, self.QA
        if terminated:
            target = reward
        else:
            best = greedy_action(update[next_state], self.rng)
            target = reward + self.gamma * other[next_state, best]
        step = self.step if self.step is not None else 0.1
        update[state, action] += step * (target - update[state, action])
        self.Q = (self.QA + self.QB) / 2
```

How each update works:

1. **Flip a coin** to choose which table to update this time; the other table becomes the judge.
2. **Choose** the next action with the table being updated: `best = greedy_action(update[next_state], …)`.
3. **Value** that action with the *other* table: `target = reward + γ · other[next_state, best]`.
4. Move the updated table's entry towards the target.

Each table is trained on roughly half of the experience, so their noise is **independent**. If `update` picks an action because its noise happened to be high, `other`'s estimate of that same action has no reason to be high too, so on average it values it fairly. The upward bias goes away. (Double Q-learning can slightly *under*-estimate instead, which turns out to be far less harmful.)

The agent **acts** on the average of the two tables, `self.Q = (QA + QB) / 2`, so `act`, the workbench's arrows and `greedy_value` all keep working unchanged. It defaults to a constant step of 0.1, because each table sees only about half the experience, which makes counting visits per table more trouble than it's worth here.

```check
run ".venv/Scripts/python -m pytest -q tests/test_bias.py -k double" label="DoubleQLearning chooses with one table and values with the other" -- Flip a coin for which table to update; pick best = greedy_action(update[next_state]); target = reward + gamma * other[next_state, best]; then set self.Q to the average of the two.
```

## Watch the bias

```python file=bias_view.py
import numpy as np
import pygame

from bias import left_share
from chart import draw_frame, draw_series
from learners import DoubleQLearning, QLearning

WIDTH, HEIGHT = 820, 440
PLOT = pygame.Rect(60, 50, 500, 300)
EPISODES = 300
TARGET_RUNS = 1000
RUNS_PER_FRAME = 25
BACKGROUND = (24, 26, 33)
FRAME = (100, 116, 139)
TEXT = (226, 232, 240)
FLOOR = (148, 163, 184)
LEARNERS = [("Q-learning", (248, 113, 113), QLearning), ("Double Q-learning", (94, 234, 212), DoubleQLearning)]


def make(cls):
    return lambda env, seed: cls(env.n_states, env.n_actions, np.random.default_rng([seed, 1]), epsilon=0.1, gamma=1.0, step=0.1)


def draw(screen, font, shares, runs):
    screen.fill(BACKGROUND)
    draw_frame(screen, font, PLOT, 0.0, 1.0, FRAME, "share of episodes that go left from A")
    draw_series(screen, PLOT, np.full(EPISODES, 0.01), FLOOR, 0.0, 1.0)
    for row, ((name, colour, _), total) in enumerate(zip(LEARNERS, shares)):
        label = name
        if runs:
            curve = total / runs
            draw_series(screen, PLOT, curve, colour, 0.0, 1.0)
            label = f"{name}: peak {curve.max():.0%}"
        screen.blit(font.render(label, True, colour), (PLOT.right + 16, PLOT.top + row * 26))
    screen.blit(font.render("grey: 1%, what exploration alone causes", True, FLOOR), (PLOT.right + 16, PLOT.top + 70))
    screen.blit(font.render(f"runs {runs} of {TARGET_RUNS}", True, TEXT), (PLOT.left, PLOT.bottom + 24))


def run(max_frames=None):
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Maximisation bias")
    font = pygame.font.Font(None, 22)
    clock = pygame.time.Clock()
    shares = [np.zeros(EPISODES) for _ in LEARNERS]
    runs = 0
    frames = 0
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
        if runs < TARGET_RUNS:
            for total, (_, _, cls) in zip(shares, LEARNERS):
                total += left_share(make(cls), RUNS_PER_FRAME, EPISODES, seed=runs) * RUNS_PER_FRAME
            runs += RUNS_PER_FRAME
        draw(screen, font, shares, runs)
        pygame.display.flip()
        clock.tick(60)
        frames += 1
        if max_frames is not None and frames >= max_frames:
            running = False
    pygame.quit()
    return frames


if __name__ == "__main__":
    run()
```

It runs 1000 learners of each kind, 25 per frame, with Sutton & Barto's settings (ε = 0.1, step 0.1, γ = 1), and plots the share going left at each episode. The grey line at 1% is the floor: with ε = 0.1 and 10 actions, a random exploratory move picks "left" one time in ten, so even a perfect learner goes left in 1% of episodes.

```predict
question: At its worst, in what share of episodes does Q-learning go left, the worse choice?
choice: About 1%, the exploration floor
choice: About 15%
choice: Q-learning: in about 3 episodes of 4
answer: Q-learning: in about 3 episodes of 4
explain: Around 75%, at about episode 50. Each visit to B updates one of its ten actions with a noisy reward, and the max over B's estimates (A's target for going left) is usually positive, even though every action in B is worth −0.1. So "left" looks better than "right" (worth 0), and Q-learning goes left again and again. Only after many visits do B's estimates settle below 0 and the lure fade. Double Q-learning peaks at about 17%: its judge table doesn't share the chooser's luck.
verify: script bias_peaks.py
```

Notice that both curves come down eventually. Q-learning isn't *wrong* in the long run: given enough experience every estimate becomes accurate and the bias vanishes. But "eventually" can be very long when there are many noisy actions, and in deep reinforcement learning, where estimates come from a neural network rather than counts, the overestimation compounds and can wreck learning entirely. That's why Double DQN matters.

### Further reading

- Sutton & Barto, section 6.7, "Maximization bias and double learning" (this lesson's example is their Figure 6.5).
- van Hasselt (2010), *Double Q-learning*; van Hasselt, Guez & Silver (2016), *Deep Reinforcement Learning with Double Q-learning*: the same idea in deep RL.

```check
run ".venv/Scripts/python -m pytest -q tests/test_bias.py" label="all lesson 7.4 tests pass" -- make(cls) returns a function building a learner with epsilon 0.1, gamma 1 and step 0.1, seeded from [seed, 1].
```
