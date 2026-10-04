---
title: 7.2 — Judging an Agent Honestly
track: Reinforcement Learning in pygame
runtime: python
run: evaluate_view.py
---

The cliff race ended with a puzzle. Q-learning had learned the best route, yet earned the least. The number you watch while an agent trains, its reward per episode, mixes up two things: **what it has learned** and **how it behaves while exploring**. To know whether learning worked, you have to measure the first on its own.

This lesson builds the habits that make a reinforcement learning result trustworthy:

1. **Judge the greedy policy**, with exploration switched off, in episodes of its own that it doesn't learn from.
2. **Train with many seeds**, because one run is one roll of the dice (lesson 2.1).
3. **Show uncertainty**: means with standard errors (lesson 2.2), and the individual runs.
4. **Compare against known reference points**: a baseline every method must beat, and the best possible, when it's known.

The test bed is the slippery `walls` map from Chapter 5, where you know exactly what perfect is: 0.3014.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_judging.py** above.

```python file=tests/test_judging.py provided
# Tests for train(seed=None), evaluation.py and evaluate_view.py (lesson 7.2). Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_judging.py
import numpy as np
from pytest import approx

from grid import MAPS, GridWorld


def test_resume_training_continues_the_same_random_stream():
    from learners import QLearning
    from training import train

    def fresh():
        env = GridWorld(MAPS["walls"], slip=0.3, max_steps=50)
        return env, QLearning(25, 4, np.random.default_rng(1))

    env, agent = fresh()
    in_parts = np.concatenate([train(env, agent, 15, seed=5), train(env, agent, 15, seed=None)])
    env, agent = fresh()
    all_at_once = train(env, agent, 30, seed=5)
    assert in_parts.tolist() == all_at_once.tolist(), "seed=None carries on where the last call stopped"


def test_greedy_returns_act_greedily_with_no_exploration():
    from evaluation import greedy_returns
    Q = np.zeros((4, 4))
    Q[:, 3] = 1.0
    returns = greedy_returns(GridWorld(["S..G"]), Q, 5, 0.9, seed=0)
    assert returns.tolist() == approx([0.81] * 5)


def test_greedy_returns_are_repeatable_with_a_seed():
    from evaluation import greedy_returns
    Q = np.random.default_rng(0).normal(size=(25, 4))
    env = GridWorld(MAPS["walls"], slip=0.3, max_steps=50)
    assert greedy_returns(env, Q, 30, 0.9, seed=4).tolist() == greedy_returns(env, Q, 30, 0.9, seed=4).tolist()


def test_greedy_returns_agree_with_the_exact_value():
    from evaluation import greedy_returns
    from learners import QLearning
    from training import greedy_value, train
    env = GridWorld(MAPS["walls"], slip=0.2, max_steps=100)
    agent = QLearning(25, 4, np.random.default_rng(3), epsilon=0.1, gamma=0.9)
    train(env, agent, 1000, seed=3)
    played = greedy_returns(GridWorld(MAPS["walls"], slip=0.2, max_steps=100), agent.Q, 2000, 0.9, seed=7)
    exact = greedy_value(env, agent.Q, 0.9)[0]
    assert abs(played.mean() - exact) < 3 * played.std(ddof=1) / np.sqrt(len(played))


def make_env():
    return GridWorld(MAPS["walls"], slip=0.2, max_steps=100)


def make_agent(env, seed):
    from learners import QLearning
    return QLearning(env.n_states, env.n_actions, np.random.default_rng(seed), epsilon=0.1, gamma=0.9)


def test_curve_has_one_point_per_checkpoint():
    from evaluation import learning_curve
    curve = learning_curve(make_env, make_agent, 0, 4, 10, 20, 0.9)
    assert curve.shape == (4,)
    assert ((-1.0 <= curve) & (curve <= 1.0)).all()


def test_curve_same_seed_same_curve():
    from evaluation import learning_curve
    a = learning_curve(make_env, make_agent, 2, 3, 10, 20, 0.9)
    b = learning_curve(make_env, make_agent, 2, 3, 10, 20, 0.9)
    assert a.tolist() == b.tolist()


def test_curve_matches_training_and_judging_by_hand():
    from evaluation import greedy_returns, learning_curve
    from training import train
    curve = learning_curve(make_env, make_agent, 4, 3, 10, 20, 0.9)
    env, judge = make_env(), make_env()
    agent = make_agent(env, 4)
    env.reset(seed=4)
    by_hand = []
    for _ in range(3):
        train(env, agent, 10, seed=None)
        by_hand.append(greedy_returns(judge, agent.Q, 20, 0.9, seed=10_004).mean())
    assert curve.tolist() == approx(by_hand), "train on its own stream, judge on a separate environment and seed"


def test_judge_reference_values_come_from_planning():
    from evaluate_view import reference_values
    best, random = reference_values()
    assert best == approx(0.3014, abs=1e-3)
    assert random == approx(-0.0166, abs=1e-3)


def test_judge_summary_is_mean_and_standard_error():
    from evaluate_view import summary
    mean, error = summary([[0.0, 1.0], [2.0, 3.0]])
    assert mean.tolist() == [1.0, 2.0]
    assert error.tolist() == approx([np.sqrt(2) / np.sqrt(2)] * 2)


def test_judge_window_opens_and_closes():
    from evaluate_view import run
    assert run(max_frames=2) == 2
```

`test_greedy_returns_agree_with_the_exact_value` connects two ways of measuring one thing: playing the greedy policy for 2000 episodes, and computing its value exactly from the tables. In real problems you only have the first, so it's worth seeing once that it's trustworthy when used carefully.

```check
file tests/test_judging.py -- Click "Create provided tests/test_judging.py" above.
```

## Keep training where you left off

To judge an agent **during** training, you train for a while, judge it, then train some more. But `train` re-seeds the environment every time it's called, so the second chunk would replay the first chunk's luck. Let `seed=None` mean "carry on":

```python file=training.py
import numpy as np

from mdp import tables
from planning import evaluate_policy, greedy_policy


def train(env, agent, episodes, seed=0):
    if seed is not None:
        env.reset(seed=seed)
    totals = np.zeros(episodes)
    for episode in range(episodes):
        state, _ = env.reset()
        while True:
            action = agent.act(state)
            next_state, reward, terminated, truncated, _ = env.step(action)
            agent.learn(state, action, reward, next_state, terminated, truncated)
            totals[episode] += reward
            state = next_state
            if terminated or truncated:
                break
    return totals


def greedy_value(env, Q, gamma):
    P, R, terminal = tables(env)
    V, _ = evaluate_policy(P, R, terminal, greedy_policy(Q), gamma)
    return V
```

With `seed=None`, the environment keeps its generator, and its random numbers continue from where the last call stopped. The test proves it: two calls of 15 episodes produce exactly the same rewards as one call of 30.

```check
run ".venv/Scripts/python -m pytest -q tests/test_judging.py -k resume" label="train(seed=None) continues the random stream" -- Only reset the environment with a seed when seed is not None.
```

## Judge the greedy policy on its own episodes

Create `evaluation.py`:

```python file=evaluation.py
import numpy as np

from returns import discounted_return


def greedy_returns(env, Q, episodes, gamma, seed):
    env.reset(seed=seed)
    returns = np.zeros(episodes)
    for episode in range(episodes):
        state, _ = env.reset()
        rewards = []
        while True:
            state, reward, terminated, truncated, _ = env.step(int(Q[state].argmax()))
            rewards.append(reward)
            if terminated or truncated:
                break
        returns[episode] = discounted_return(rewards, gamma)
    return returns
```

`greedy_returns` plays the table's greedy policy, `Q[state].argmax()` with **no exploration**, for a number of episodes, and returns each one's discounted return (lesson 4.3).

Three choices make this an honest judgement:

- **No exploration.** The point is to measure what was learned. Exploration is part of *learning*, not of the result.
- **No learning.** It never calls `learn`, so the agent can't improve during its own exam.
- **Its own environment and seed.** The judging episodes don't reuse the training episodes, whose luck the agent has already adapted to. Training on one set of situations and testing on others is the most important habit in all of machine learning. In supervised learning it's called a test set. Here, "other situations" means other random draws of the same world.

`argmax` breaks ties towards the first action. A judge must be deterministic, so the same table always gets the same score.

```check
run ".venv/Scripts/python -m pytest -q tests/test_judging.py -k greedy" label="greedy_returns plays the greedy policy and returns each episode's return" -- Reset with the seed once, then for each episode act with int(Q[state].argmax()) until the episode ends, and store discounted_return of its rewards.
```

## A learning curve that measures the right thing

```python file=evaluation.py
import numpy as np

from returns import discounted_return
from training import train


def greedy_returns(env, Q, episodes, gamma, seed):
    env.reset(seed=seed)
    returns = np.zeros(episodes)
    for episode in range(episodes):
        state, _ = env.reset()
        rewards = []
        while True:
            state, reward, terminated, truncated, _ = env.step(int(Q[state].argmax()))
            rewards.append(reward)
            if terminated or truncated:
                break
        returns[episode] = discounted_return(rewards, gamma)
    return returns


def learning_curve(make_env, make_agent, seed, checkpoints, every, eval_episodes, gamma):
    env = make_env()
    judge = make_env()
    agent = make_agent(env, seed)
    env.reset(seed=seed)
    curve = np.zeros(checkpoints)
    for i in range(checkpoints):
        train(env, agent, every, seed=None)
        curve[i] = greedy_returns(judge, agent.Q, eval_episodes, gamma, seed=10_000 + seed).mean()
    return curve
```

`learning_curve` alternates: train for `every` episodes (continuing the same random stream), then judge the greedy policy on `eval_episodes` episodes in a separate environment, `judge`. It does this `checkpoints` times, giving one score per checkpoint. The judging seed, `10_000 + seed`, is different for every training seed and never overlaps a training seed: an evaluation that shared randomness with training would flatter the agent.

`make_env` and `make_agent` are passed in as functions (lesson 3.2's `make_learner`), so the same curve-maker works for any environment and any agent.

```check
run ".venv/Scripts/python -m pytest -q tests/test_judging.py -k curve" label="learning_curve alternates training and judging" -- Make a training env and a separate judge env; each checkpoint: train(env, agent, every, seed=None), then judge with greedy_returns(judge, agent.Q, eval_episodes, gamma, seed=10_000 + seed).
```

## Twenty seeds, one honest chart

```python file=evaluate_view.py
import numpy as np
import pygame

from chart import draw_frame, draw_series, mix
from evaluation import learning_curve
from grid import MAPS, GridWorld
from learners import QLearning
from mdp import tables
from planning import evaluate_policy, uniform_policy, value_iteration

GAMMA = 0.9
CHECKPOINTS, EVERY, EVAL_EPISODES, TARGET_SEEDS = 30, 20, 100, 20
WIDTH, HEIGHT = 840, 470
PLOT = pygame.Rect(70, 50, 520, 320)
LOW, HIGH = -0.1, 0.4
BACKGROUND = (24, 26, 33)
FRAME = (100, 116, 139)
TEXT = (226, 232, 240)
LEARNER = (94, 234, 212)
BEST = (250, 204, 21)
RANDOM = (248, 113, 113)


def make_env():
    return GridWorld(MAPS["walls"], slip=0.2, max_steps=100)


def make_agent(env, seed):
    return QLearning(env.n_states, env.n_actions, np.random.default_rng(seed), epsilon=0.1, gamma=GAMMA)


def reference_values():
    P, R, terminal = tables(make_env())
    best, _ = value_iteration(P, R, terminal, GAMMA)
    random, _ = evaluate_policy(P, R, terminal, uniform_policy(len(P), P.shape[1]), GAMMA)
    return best[0], random[0]


def summary(curves):
    runs = np.array(curves)
    mean = runs.mean(axis=0)
    error = runs.std(axis=0, ddof=1) / np.sqrt(len(runs)) if len(runs) > 1 else np.zeros(runs.shape[1])
    return mean, error


def draw(screen, font, curves, best, random):
    screen.fill(BACKGROUND)
    draw_frame(screen, font, PLOT, LOW, HIGH, FRAME, "greedy policy's return, judged on separate episodes")
    draw_series(screen, PLOT, np.full(CHECKPOINTS, best), BEST, LOW, HIGH)
    draw_series(screen, PLOT, np.full(CHECKPOINTS, random), RANDOM, LOW, HIGH)
    faint = mix(BACKGROUND, LEARNER, 0.3)
    for curve in curves:
        draw_series(screen, PLOT, curve, faint, LOW, HIGH)
    lines = [(f"best possible {best:+.3f}", BEST), (f"random policy {random:+.3f}", RANDOM)]
    if curves:
        mean, error = summary(curves)
        draw_series(screen, PLOT, mean, LEARNER, LOW, HIGH, band=2 * error)
        lines.append((f"Q-learning {mean[-1]:+.3f} +/- {2 * error[-1]:.3f}", LEARNER))
    lines.append((f"seeds {len(curves)} of {TARGET_SEEDS}", TEXT))
    lines.append((f"{EVERY * CHECKPOINTS} training episodes", TEXT))
    for row, (text, colour) in enumerate(lines):
        screen.blit(font.render(text, True, colour), (PLOT.right + 16, PLOT.top + row * 26))


def run(max_frames=None):
    best, random = reference_values()
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Judging Q-learning honestly")
    font = pygame.font.Font(None, 22)
    clock = pygame.time.Clock()
    curves = []
    frames = 0
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
        if len(curves) < TARGET_SEEDS:
            curves.append(learning_curve(make_env, make_agent, len(curves), CHECKPOINTS, EVERY, EVAL_EPISODES, GAMMA))
        draw(screen, font, curves, best, random)
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

What's on the chart, and how it's made:

- **Reference lines.** `reference_values` computes, exactly, from the tables, the best possible value (lesson 5.2) and the random policy's (lesson 5.1). They're drawn as flat lines with lesson 3.2's `draw_series` on an array of identical values (`np.full`). Every result now has a floor and a ceiling to be read against.
- **Every seed, faintly.** Each seed's curve is drawn in a pale version of the learner's colour, so you see the spread, not only the average.
- **The mean with a band of ±2 standard errors** (lesson 2.2), across seeds. A narrow band says the *average* is well known. It doesn't say every run is good: that's what the faint lines are for.
- One seed per frame, as in lesson 3.2.

Run it, and predict as the seeds come in.

```predict
question: The best possible value is 0.301. Can a seed's measured final score come out **above** 0.301?
choice: No: nothing can beat the optimum
choice: Yes: a few measure above it
answer: Yes: a few measure above it
explain: Several seeds measure 0.32 or 0.33. No policy's **true** value can exceed the optimum, but these are *measurements*: averages of 100 random episodes, each uncertain by about ±0.03 (lesson 2.2). A lucky set of judging episodes lifts the score. Whenever a result beats a proven limit, suspect the measurement first. More judging episodes shrink the noise, as 1/√n.
verify: script judge_above_best.py
```

```predict
question: After 600 training episodes, how widely spread are the 20 seeds' scores?
choice: All within 0.01 of each other
choice: Over about 0.15: from below 0.2 to above 0.3
choice: Over the whole range, from −1 to +1
answer: Over about 0.15: from below 0.2 to above 0.3
explain: From about 0.18 to 0.33. Most seeds find the optimal policy or one close to it, and their scores scatter only by judging noise. A seed near 0.18 learned something worse, and stayed with it, settled on a sub-optimal route. That's why one run proves nothing. The mean across seeds, about 0.285 ± 0.016, is the result to report, alongside the worst run.
verify: script judge_spread.py
```

### A checklist for honest results

When you report how well an agent learned, or read someone else's report, check:

- **What was measured?** The greedy policy, without exploration, on episodes it didn't learn from. Or the reward while training, which mixes in exploration.
- **How many seeds,** and is the uncertainty shown? A curve from one seed is an anecdote.
- **Compared with what?** At least a random or simple baseline, and the best possible if it's known.
- **What were the settings?** ε, step size, γ, episodes, map, slip. Results change with each (lesson 7.3).
- **Were the settings chosen by looking at the same results being reported?** Trying 50 settings and reporting the best one flatters the result, just as a lucky seed does. Choose settings with one set of seeds and report on fresh ones.

This is also how to check work done for you, by a colleague or an AI assistant: a claim that an agent "works" is only as good as these answers.

```check
run ".venv/Scripts/python -m pytest -q tests/test_judging.py" label="all lesson 7.2 tests pass" -- summary: the mean of the curves down axis 0, and their standard deviation (ddof=1) divided by the square root of the number of curves.
```
