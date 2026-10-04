---
title: 6.2 — Temporal-Difference Learning: Learning from the Next Step
track: Reinforcement Learning in pygame
runtime: python
run: walk_view.py
---

Monte Carlo waits until an episode ends, then learns from the whole return. But think about how you'd judge a move in a game. You don't wait for the final score: if a move takes you into a position you already know is strong, you conclude the move was good, right away. You judge the move by **your current estimate of where it led**.

That's **temporal-difference learning**, or TD. Its target for a state isn't the full return, but the reward just received plus the current estimate of the next state:

```text
Monte Carlo target:   G                        (the whole return, known only at the end)
TD target:            r + γ · V(next state)     (known after one step)
```

Updating an estimate from another estimate is called **bootstrapping**, after the phrase "to pull yourself up by your own bootstraps". It sounds circular, and the first time people meet it they suspect it can't work. This lesson shows that it does, on a problem where the right answer is known exactly, and that it usually beats Monte Carlo. Sutton and Barto call TD "the one idea … central and novel to reinforcement learning". Q-learning, in Chapter 7, is TD.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_bootstrap.py** above.

```python file=tests/test_bootstrap.py provided
# Tests for TDPredictor and MCPredictor in learners.py, walk.py and walk_view.py (lesson 6.2).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_bootstrap.py
import numpy as np
from pytest import approx


def test_td_moves_towards_reward_plus_next_estimate():
    from learners import TDPredictor
    td = TDPredictor(7, 4, np.random.default_rng(0), step=0.1, gamma=1.0)
    td.V[4] = 0.7
    td.learn(3, 2, 0.0, 4, False, False)
    assert td.V[3] == approx(0.5 + 0.1 * (0.0 + 0.7 - 0.5)), "a tenth of the way from 0.5 to 0 + V[4]"


def test_td_an_ending_has_no_next_value():
    from learners import TDPredictor
    td = TDPredictor(7, 4, np.random.default_rng(0), step=0.1)
    td.V[6] = 99.0                          # never used: nothing follows an ending
    td.learn(5, 3, 1.0, 6, True, False)
    assert td.V[5] == approx(0.5 + 0.1 * (1.0 - 0.5))


def test_td_a_time_out_still_counts_the_next_value():
    from learners import TDPredictor
    td = TDPredictor(7, 4, np.random.default_rng(0), step=0.1)
    td.V[4] = 0.9
    td.learn(3, 3, 0.0, 4, False, True)
    assert td.V[3] == approx(0.5 + 0.1 * (0.9 - 0.5)), "the state after a time-out still has a future"


def test_td_acts_at_random():
    from learners import TDPredictor
    td = TDPredictor(7, 4, np.random.default_rng(0))
    counts = np.bincount([td.act(3) for _ in range(4000)], minlength=4)
    assert counts.min() > 850 and type(td.act(3)) is int


def test_mcpred_waits_then_uses_whole_returns():
    from learners import MCPredictor
    mc = MCPredictor(7, 4, np.random.default_rng(0), step=0.5, gamma=1.0)
    mc.learn(4, 3, 0.0, 5, False, False)
    assert mc.V[4] == 0.5, "nothing learned mid-episode"
    mc.learn(5, 3, 1.0, 6, True, False)
    assert mc.V[5] == approx(0.75) and mc.V[4] == approx(0.75), "both saw a return of 1"
    assert mc.episode == []


def test_walk_true_values_come_from_policy_evaluation():
    from mdp import tables
    from planning import evaluate_policy, uniform_policy
    from walk import TRUE_VALUES, make_walk
    env = make_walk()
    V, _ = evaluate_policy(*tables(env), uniform_policy(7, 4), 1.0, tolerance=1e-10)
    assert V[1:6] == approx(TRUE_VALUES, abs=1e-6)


def test_walk_the_hole_ends_with_nothing():
    from walk import make_walk
    env = make_walk()
    env.reset()
    env.cell = (0, 1)
    _, reward, terminated, _, _ = env.step(2)
    assert reward == 0.0 and terminated


def test_walk_rms_error():
    from walk import TRUE_VALUES, rms_error
    perfect = np.zeros(7)
    perfect[1:6] = TRUE_VALUES
    assert rms_error(perfect) == approx(0.0)
    assert rms_error(np.full(7, 0.5)) == approx(np.sqrt(np.mean((0.5 - TRUE_VALUES) ** 2)))


def test_walk_error_falls_with_experience():
    from learners import TDPredictor
    from walk import error_curve
    curves = np.array([error_curve(lambda n, m, r: TDPredictor(n, m, r, step=0.05), 100, s) for s in range(30)])
    mean = curves.mean(axis=0)
    assert mean.shape == (100,)
    assert mean[-10:].mean() < mean[:10].mean() / 2


def test_errors_window_opens_and_closes():
    from walk_view import run
    assert run(max_frames=2) == 2
```

The three `td` tests together state the whole method: move towards reward plus the next estimate; after an **ending**, there is no next estimate; after a **time-out**, there is one. That last one is lesson 4.1's warning, at last put to use.

```check
file tests/test_bootstrap.py -- Click "Create provided tests/test_bootstrap.py" above.
```

## Learn from the next step

This lesson's learners **predict**: they estimate the values V of one fixed policy, the random one, rather than improving it. That makes them easy to compare with the truth. (Lesson 6.3 turns TD into a learner that improves its policy.) Add `TDPredictor` to `learners.py`:

```python file=learners.py
import numpy as np

from averages import update
from chance import bernoulli
from qtable import greedy_action


class TabularAgent:
    def __init__(self, n_states, n_actions, rng, epsilon=0.1, gamma=0.9, step=None):
        self.Q = np.zeros((n_states, n_actions))
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
```

How `learn` works, on every single step:

1. **The target**: the reward just received, plus γ times the current estimate of the state it landed in, `reward + self.gamma * self.V[next_state]`. If the episode **terminated**, nothing follows, so the target is just the reward.
2. **The update**: lesson 2.3's rule, a step of size α towards the target.

The difference `target − V(state)` is called the **TD error**, written δ (delta). It's the surprise: how much better or worse things turned out than this state's estimate predicted, judged one step later. Positive means "better than I thought", and the estimate rises.

**Why a time-out still uses V(next state).** A time-out means *we stopped watching*. The next state still has a future, and its value estimates that future. Using 0 there would teach the agent that wherever time happens to run out is worthless.

All estimates start at 0.5, as in Sutton & Barto's version of this experiment, a neutral guess halfway between the two possible outcomes.

```predict
question: V is 0.5 everywhere except V[4] = 0.7. The learner steps from state 3 to state 4 with reward 0, not an ending. With step 0.1 and γ = 1, what does V[3] become?
answer: 0.52
tolerance: 0.0001
explain: The target is 0 + 1 × 0.7 = 0.7. The TD error is 0.7 − 0.5 = 0.2, and a tenth of it is 0.02, so V[3] = 0.52. State 3 has learned something about its future from state 4's estimate, without waiting for the episode to end.
verify: .venv/Scripts/python -c "import numpy as np; from learners import TDPredictor; td = TDPredictor(7, 4, np.random.default_rng(0), step=0.1, gamma=1.0); td.V[4] = 0.7; td.learn(3, 2, 0.0, 4, False, False); print(round(td.V[3], 4))"
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_bootstrap.py -k td" label="TDPredictor moves each estimate towards reward plus the next estimate" -- target = reward if terminated else reward + gamma * V[next_state]; then update V[state] towards it by self.step.
```

## Monte Carlo, for comparison

To compare fairly, a Monte Carlo predictor that differs **only** in its target:

```python file=learners.py
import numpy as np

from averages import update
from chance import bernoulli
from qtable import greedy_action


class TabularAgent:
    def __init__(self, n_states, n_actions, rng, epsilon=0.1, gamma=0.9, step=None):
        self.Q = np.zeros((n_states, n_actions))
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
```

`MCPredictor` inherits `__init__` and `act` from `TDPredictor`: same starting values, same random policy, same step size. Only `learn` changes. It remembers `(state, reward)` pairs and, at the end, nudges each state towards its actual return, walking backwards as in lesson 6.1. Any difference in the race below comes from the target alone.

```check
run ".venv/Scripts/python -m pytest -q tests/test_bootstrap.py -k mcpred" label="MCPredictor waits for the end and uses whole returns" -- Remember (state, reward) each step; when the episode ends, walk backwards with G = reward + gamma * G and update V[state] towards G.
```

## A walk with known answers

The test problem is Sutton & Barto's **random walk**, built from your own `GridWorld`:

```text
H . . S . . G
```

A random walker starts in the middle. Up and down bump the edges and stay put. Reaching G pays 1, and reaching H pays 0, so H ends the episode with nothing. With γ = 1, a cell's value is simply **the probability of reaching G before H** from there, which for this walk is 1/6, 2/6, 3/6, 4/6, 5/6 from left to right. You'd expect the middle to be 1/2, by symmetry. And you don't have to take the rest on trust:

```python file=walk.py
import numpy as np

from grid import GridWorld

WALK = ["H..S..G"]
TRUE_VALUES = np.arange(1, 6) / 6          # cells 1 to 5: the chance of reaching G before H


def make_walk():
    return GridWorld(WALK, rewards={"G": 1.0, "H": 0.0}, max_steps=1000)


def rms_error(V):
    return float(np.sqrt(np.mean((V[1:6] - TRUE_VALUES) ** 2)))


def error_curve(make_learner, episodes, seed):
    env = make_walk()
    env.reset(seed=seed)
    learner = make_learner(env.n_states, env.n_actions, np.random.default_rng([seed, 1]))
    errors = np.zeros(episodes)
    for episode in range(episodes):
        state, _ = env.reset()
        while True:
            action = learner.act(state)
            next_state, reward, terminated, truncated, _ = env.step(action)
            learner.learn(state, action, reward, next_state, terminated, truncated)
            state = next_state
            if terminated or truncated:
                break
        errors[episode] = rms_error(learner.V)
    return errors
```

- `make_walk` builds the world, with `rewards` overriding the usual −1 for H (lesson 4.1's `rewards` parameter, waiting for exactly this). `max_steps=1000` is so large that episodes in practice always end properly.
- `TRUE_VALUES` are the five answers, and `test_walk_true_values_come_from_policy_evaluation` checks them with your own lesson 5.1 code, from the tables: three independent routes to the same numbers.
- `rms_error` measures how far a learner's estimates are from the truth, as one number: the **root mean square** error. Square each cell's error, take the mean, then the square root, so that big misses count more than small ones and the result is back in the units of a value.
- `error_curve` trains one learner and records its error after every episode, with the environment and learner given separate random streams (lesson 3.2's fair comparison).

```check
run ".venv/Scripts/python -m pytest -q tests/test_bootstrap.py -k walk" label="the random walk, its true values and the error measure" -- rms_error: square the differences between V[1:6] and TRUE_VALUES, average them, then take the square root.
```

## Race them

`walk_view.py` runs both learners at three step sizes each, 100 runs of 100 episodes, and plots the average error after each episode, adding runs a frame at a time (lesson 3.2's trick):

```python file=walk_view.py
import numpy as np
import pygame

from chart import draw_frame, draw_series
from learners import MCPredictor, TDPredictor
from walk import WALK, error_curve

WIDTH, HEIGHT = 780, 470
PLOT = pygame.Rect(60, 110, 480, 290)
EPISODES = 100
TARGET_RUNS = 100
BACKGROUND = (24, 26, 33)
FRAME = (100, 116, 139)
TEXT = (226, 232, 240)
CELL_COLOURS = {"H": (8, 12, 20), "G": (250, 204, 21), "S": (30, 41, 59), ".": (30, 41, 59)}

LEARNERS = [
    ("TD step 0.05", (94, 234, 212), lambda n, m, rng: TDPredictor(n, m, rng, step=0.05)),
    ("TD step 0.1", (45, 212, 191), lambda n, m, rng: TDPredictor(n, m, rng, step=0.1)),
    ("TD step 0.15", (20, 184, 166), lambda n, m, rng: TDPredictor(n, m, rng, step=0.15)),
    ("MC step 0.01", (250, 204, 21), lambda n, m, rng: MCPredictor(n, m, rng, step=0.01)),
    ("MC step 0.02", (251, 146, 60), lambda n, m, rng: MCPredictor(n, m, rng, step=0.02)),
    ("MC step 0.04", (248, 113, 113), lambda n, m, rng: MCPredictor(n, m, rng, step=0.04)),
]


def draw_walk(screen, font):
    for i, tile in enumerate(WALK[0]):
        rect = pygame.Rect(60 + i * 56, 20, 52, 40)
        pygame.draw.rect(screen, CELL_COLOURS[tile], rect)
        screen.blit(font.render(tile, True, TEXT), (rect.x + 20, rect.y + 12))


def draw(screen, font, curves):
    screen.fill(BACKGROUND)
    draw_walk(screen, font)
    draw_frame(screen, font, PLOT, 0.0, 0.25, FRAME, "error of the estimates (RMS) after each episode")
    for row, ((name, colour, _), runs) in enumerate(zip(LEARNERS, curves)):
        label = name
        if runs:
            mean = np.mean(runs, axis=0)
            draw_series(screen, PLOT, mean, colour, 0.0, 0.25)
            label = f"{name}: {mean[-1]:.3f}"
        screen.blit(font.render(label, True, colour), (PLOT.right + 16, PLOT.top + row * 26))
    status = f"runs averaged: {len(curves[0])} of {TARGET_RUNS}    episodes 1 to {EPISODES}"
    screen.blit(font.render(status, True, TEXT), (PLOT.left, PLOT.bottom + 24))


def run(max_frames=None):
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("TD against Monte Carlo on the random walk")
    font = pygame.font.Font(None, 22)
    clock = pygame.time.Clock()
    curves = [[] for _ in LEARNERS]
    frames = 0
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
        if len(curves[0]) < TARGET_RUNS:
            seed = len(curves[0])
            for runs, (_, _, make) in zip(curves, LEARNERS):
                runs.append(error_curve(make, EPISODES, seed))
        draw(screen, font, curves)
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

Run it and make two predictions as the curves form.

```predict
question: After 50 episodes, which has the lower error?
choice: Monte Carlo, at every step size tried
choice: TD, at every step size tried
choice: Neither: they end up the same
answer: TD, at every step size tried
explain: After 50 episodes, TD's error is around 0.05–0.07, and Monte Carlo's 0.11–0.17, depending on the step size. Every TD curve beats every Monte Carlo curve. TD's target, r + γV(s'), contains the randomness of **one** step. Monte Carlo's target, the whole return, contains the randomness of **every** step to the end of the episode, so its updates are much noisier, and noise must be averaged away slowly. This is Figure 6.2 of Sutton & Barto, reproduced by your code.
verify: script td_vs_mc.py
```

```predict
question: Look at TD with step 0.1 between episode 50 and episode 100. Does its error keep falling?
choice: It keeps falling
choice: It bottoms out and creeps back up
answer: It bottoms out and creeps back up
explain: About 0.048 at episode 50, and 0.056 at episode 100. With a constant step, an estimate never fully settles. Each new step shoves it around, so it ends up wobbling around the truth (lesson 2.3: the noise floor of a constant step). Early on, the shrinking error from learning hides that wobble. Once learning is done, the wobble is what's left, and for step 0.1 it ends slightly above the lowest point the curve passed through. Smaller steps settle lower, but more slowly: the same trade-off as lesson 2.3's tracker.
verify: script td_floor.py
```

### Bias and variance

TD isn't simply better. The two methods make opposite trade-offs:

- **Monte Carlo** targets are **unbiased**: the actual return, on average, is exactly the true value. But they have **high variance**: noisy.
- **TD** targets have **low variance**: one step of randomness. But they're **biased**: they lean on V(next state), which is wrong at first. If V starts badly wrong, TD spreads the wrongness around until real rewards correct it.

On most problems, TD's lower variance wins. Between the two lie **n-step** methods, which use n real rewards and then bootstrap, and **TD(λ)**, which blends all n at once. They're named here so you'll recognise them in the literature (Sutton & Barto, chapters 7 and 12).

```check
run ".venv/Scripts/python -m pytest -q tests/test_bootstrap.py" label="all lesson 6.2 tests pass" -- walk_view: each frame, add one more error_curve run for every learner until TARGET_RUNS.
```
