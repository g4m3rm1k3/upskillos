---
title: 7.3 — Tuning: Step Size, Exploration and Optimism
track: Reinforcement Learning in pygame
runtime: python
run: tuning_view.py
---

Every learner so far came with settings: ε = 0.1, a step size, a starting value. Change them, and the same algorithm can go from excellent to useless. In practice, most failures of tabular Q-learning are failures of **settings**, not of the algorithm. Settings like these, chosen by the person rather than learned by the agent, are called **hyperparameters**.

This lesson measures their effect systematically: a grid of step sizes × ε values, each scored by the **exact** value of the greedy policy it learns (lesson 6.1's `greedy_value`), over 10 seeds, as a heatmap. Then it tests an idea from the bandit chapter, optimistic starting values, and finds that it behaves differently once values are learned from other values.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_tuning.py** above.

```python file=tests/test_tuning.py provided
# Tests for TabularAgent's initial value, tuning.py and tuning_view.py (lesson 7.3). Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_tuning.py
import numpy as np
import pygame
from pytest import approx

from grid import MAPS, GridWorld


def test_initial_values_fill_the_table():
    from learners import QLearning
    agent = QLearning(3, 4, np.random.default_rng(0), initial=1.5)
    assert agent.Q.tolist() == [[1.5] * 4] * 3


def test_initial_default_is_zero():
    from learners import Sarsa
    assert not Sarsa(3, 4, np.random.default_rng(0)).Q.any()


def make_env():
    return GridWorld(MAPS["walls"], slip=0.2, max_steps=100)


def make_agent(env, seed):
    from learners import QLearning
    return QLearning(env.n_states, env.n_actions, np.random.default_rng(seed), epsilon=0.1, gamma=0.9)


def test_final_value_is_the_exact_value_after_training():
    from training import greedy_value, train
    from tuning import final_value
    env = make_env()
    agent = make_agent(env, 2)
    train(env, agent, 100, seed=2)
    assert final_value(make_env, make_agent, 2, 100, 0.9) == approx(greedy_value(env, agent.Q, 0.9)[0])


def test_final_value_never_beats_the_optimum():
    from tuning import final_value
    for seed in range(3):
        assert final_value(make_env, make_agent, seed, 100, 0.9) <= 0.3015


def test_final_label_reads_like_the_settings():
    from tuning import settings_label
    assert settings_label(None, 0.1) == "step 1/N, epsilon 0.1"
    assert settings_label(0.5, 0.01) == "step 0.5, epsilon 0.01"


def test_heat_colours_run_from_random_to_best():
    from tuning_view import COLD, HOT, colour_for
    assert colour_for(-0.02, -0.02, 0.3) == COLD
    assert colour_for(0.3, -0.02, 0.3) == HOT
    assert colour_for(5.0, -0.02, 0.3) == HOT and colour_for(-5.0, -0.02, 0.3) == COLD


def test_heat_agent_maker_uses_its_settings():
    from tuning_view import agent_maker
    agent = agent_maker(0.2, 0.05)(make_env(), 0)
    assert (agent.step, agent.epsilon, agent.gamma) == (0.2, 0.05, 0.9)


def test_heat_cells_form_a_grid():
    from tuning_view import H, LEFT, TOP, W, cell_rect
    assert cell_rect(2, 3).topleft == (LEFT + 3 * W, TOP + 2 * H)


def test_heat_window_opens_and_closes():
    from tuning_view import run
    assert run(max_frames=2) == 2
```

`test_final_value_never_beats_the_optimum` uses a fact from Chapter 5 as a test: no policy is worth more than the optimal value, 0.3014. Unlike lesson 7.2's played measurements, these are exact, so a score above the optimum here would be a bug, not luck.

```check
file tests/test_tuning.py -- Click "Create provided tests/test_tuning.py" above.
```

## Optimistic starts

Give `TabularAgent` a starting value for its table:

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
```

`np.full((n_states, n_actions), float(initial))` fills the table with `initial`. The default, 0.0, keeps every earlier lesson exactly as it was. Every learner gets the option at once, because they all inherit `__init__`.

```check
run ".venv/Scripts/python -m pytest -q tests/test_tuning.py -k initial" label="TabularAgent can start its table at any value" -- Add initial=0.0 to __init__ and build Q with np.full instead of np.zeros.
```

## One number per setting

```python file=tuning.py
import numpy as np

from training import greedy_value, train


def final_value(make_env, make_agent, seed, episodes, gamma):
    env = make_env()
    agent = make_agent(env, seed)
    train(env, agent, episodes, seed=seed)
    return greedy_value(env, agent.Q, gamma)[0]


def settings_label(step, epsilon):
    return f"step {'1/N' if step is None else step}, epsilon {epsilon}"
```

`final_value` trains a fresh agent with given settings and returns the **exact** value of its greedy policy at the start, using the tables. Exact scores remove the judging noise from lesson 7.2, so the only randomness left in a comparison is the training itself, the thing being compared. `settings_label` writes the settings in words, with `1/N` for the default step.

```check
run ".venv/Scripts/python -m pytest -q tests/test_tuning.py -k final" label="final_value trains and scores one setting exactly" -- Make the env and agent, train for `episodes` with the seed, then return greedy_value(env, agent.Q, gamma)[0].
```

## The heatmap

```python file=tuning_view.py
import numpy as np
import pygame

from chart import mix
from evaluate_view import make_env, reference_values
from learners import QLearning
from tuning import final_value, settings_label

GAMMA = 0.9
STEPS = [0.05, 0.1, 0.2, 0.5, None]
EPSILONS = [0.01, 0.05, 0.1, 0.2, 0.4]
SEEDS = 10
EPISODES = 300
LEFT, TOP, W, H = 110, 70, 100, 62
WIDTH, HEIGHT = LEFT + W * len(EPSILONS) + 40, TOP + H * len(STEPS) + 110
BACKGROUND = (24, 26, 33)
COLD, HOT = (127, 29, 29), (45, 212, 191)
EMPTY = (51, 65, 85)
TEXT = (226, 232, 240)
OUTLINE = (250, 204, 21)


def agent_maker(step, epsilon):
    def make(env, seed):
        return QLearning(env.n_states, env.n_actions, np.random.default_rng(seed), epsilon=epsilon, gamma=GAMMA, step=step)
    return make


def colour_for(value, random, best):
    t = (value - random) / (best - random)
    return mix(COLD, HOT, min(max(t, 0.0), 1.0))


def cell_rect(row, col):
    return pygame.Rect(LEFT + col * W, TOP + row * H, W - 2, H - 2)


def draw(screen, font, results, worst, random, best):
    screen.fill(BACKGROUND)
    title = "worst seed" if worst else "average over seeds"
    screen.blit(font.render(f"greedy policy's exact value after {EPISODES} episodes: {title}", True, TEXT), (LEFT, 16))
    for col, epsilon in enumerate(EPSILONS):
        screen.blit(font.render(f"eps {epsilon}", True, TEXT), (LEFT + col * W + 20, TOP - 22))
    for row, step in enumerate(STEPS):
        screen.blit(font.render(f"step {'1/N' if step is None else step}", True, TEXT), (16, TOP + row * H + 22))
    done = {cell: (min(v) if worst else np.mean(v)) for cell, v in results.items() if len(v) == SEEDS}
    for (row, col), values in results.items():
        rect = cell_rect(row, col)
        if (row, col) in done:
            pygame.draw.rect(screen, colour_for(done[(row, col)], random, best), rect)
            screen.blit(font.render(f"{done[(row, col)]:.2f}", True, TEXT), (rect.x + 30, rect.y + 22))
        else:
            pygame.draw.rect(screen, EMPTY, rect)
            screen.blit(font.render(f"{len(values)}/{SEEDS}", True, TEXT), (rect.x + 30, rect.y + 22))
    if done:
        row, col = max(done, key=done.get)
        pygame.draw.rect(screen, OUTLINE, cell_rect(row, col), 3)
        best_text = f"best: {settings_label(STEPS[row], EPSILONS[col])}"
        screen.blit(font.render(best_text, True, OUTLINE), (LEFT, TOP + H * len(STEPS) + 16))
    screen.blit(font.render(f"best possible {best:.3f}, random {random:.3f}    W: average / worst seed", True, TEXT),
                (LEFT, TOP + H * len(STEPS) + 44))


def run(max_frames=None):
    best, random = reference_values()
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Tuning Q-learning")
    font = pygame.font.Font(None, 22)
    clock = pygame.time.Clock()
    cells = [(row, col) for row in range(len(STEPS)) for col in range(len(EPSILONS))]
    results = {cell: [] for cell in cells}
    worst = False
    frames = 0
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN and event.key == pygame.K_w:
                worst = not worst
        todo = [cell for cell in cells if len(results[cell]) < SEEDS]
        if todo:
            row, col = todo[0]
            make_agent = agent_maker(STEPS[row], EPSILONS[col])
            results[(row, col)].append(final_value(make_env, make_agent, len(results[(row, col)]), EPISODES, GAMMA))
        draw(screen, font, results, worst, random, best)
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

How it works:

- **`agent_maker(step, epsilon)`** returns a function that makes an agent with those settings. A function that builds and returns another function is a **closure**: the inner `make` remembers the `step` and `epsilon` it was created with. `final_value` only needs `make(env, seed)`, so this is how settings travel into it.
- **One run per frame.** 25 settings × 10 seeds is 250 trainings. Each frame does one, filling the cells in order, so the window stays responsive (lesson 3.2's trick). A cell shows its progress, `3/10`, until all its seeds are done.
- **Colour** runs from red at the random policy's value to teal at the best possible value: `colour_for` places a value between the two and clamps it with `min(max(t, 0), 1)`.
- **W** switches between each cell's **average** over seeds and its **worst** seed. The best average is outlined.

Run it, and wait for the grid to fill.

```predict
question: Look along the row for step 0.5 and press **W** for the worst seed. What does the worst seed learn with step 0.5 and ε = 0.1?
choice: A slightly worse route than the best: about 0.25
choice: A policy worth about 0: it never reaches the goal
choice: The optimal policy, like every other seed
answer: A policy worth about 0: it never reaches the goal
explain: With step 0.5, each update moves an estimate halfway to one noisy target, so estimates jump around (lesson 2.3's noise floor), and a slip into the hole drags whole regions of the table down at once. Some seeds end with a greedy policy that loops forever, worth 0. The **average** for step 0.5 doesn't look catastrophic. The worst seed shows how unreliable it is. When an agent will be trained once and then used, the worst case is often the number that matters.
verify: script tuning_big_step.py
```

What the full grid shows, measured over 10 seeds of 300 episodes:

- **The best region** is a small or shrinking step (0.05, or 1/N) with ε between 0.1 and 0.2: averages of about 0.28–0.29, and worst seeds about 0.20, against the optimum of 0.30.
- **Too little exploration** (ε = 0.01): averages of only 0.14–0.22. Some state–action pairs are almost never tried, so the agent never finds out they're good. The bandit trap again.
- **Large steps** (0.5) are unreliable at every ε, for the reason above.
- **Much larger ε** (0.4) costs little in these scores with a small step: 0.27–0.28. They judge the greedy policy without exploration (lesson 7.2). The agent's behaviour *while learning* would suffer badly, as the cliff showed.

**Why 1/N works so well here, and the theory behind it.** Watkins and Dayan proved that tabular Q-learning converges to the optimal values when every state–action pair keeps being tried, and the steps for each pair shrink so that their sum grows without limit while the sum of their squares stays finite. 1/N meets both conditions: 1 + 1/2 + 1/3 + … grows for ever, and 1 + 1/4 + 1/9 + … stays below 2. A constant step never shrinks, so it only ever gets *close*, wobbling, but it keeps tracking a world that changes (lesson 3.3). Both are reasonable, for different problems.

### Optimism, revisited

In lesson 3.2, starting every estimate high made a greedy bandit try every machine. Does it help Q-learning the same way?

```predict
question: Q-learning with step 1/N and ε = 0.1, but every Q starting at 1.0 instead of 0. After 300 episodes, is the greedy policy better or worse than starting at 0?
choice: Better: optimism makes it explore every action
choice: About the same
choice: Much worse
answer: Much worse
explain: About 0.04 on average, against 0.29 when starting at 0. Every pair does get tried. The problem is **bootstrapping**. Q-learning's target uses max Q(next state), which is still inflated while the next state's actions are untried, so estimates learn from other inflated estimates. With step 1/N, every target is averaged in for good, including those early inflated ones. Measured against the true optimal Q, the estimates are still about 0.11 too high after 3000 episodes, and 0.06 too high after 30,000. With a constant step, old targets fade, and the inflation drains away much faster. Bandits have no bootstrapping, which is why optimism worked there. **An idea that helps in one setting can hurt in another, and only measuring tells you.**
verify: script tuning_optimism.py
```

```predict
question: The well-tuned learner (step 1/N, ε = 0.1, starting at 0) after 3000 episodes: how do its Q-values compare with the true optimal Q-values from value iteration?
choice: Almost exactly equal: that's why its policy is good
choice: Well below the truth, yet the policy is close to optimal
choice: Well above the truth
answer: Well below the truth, yet the policy is close to optimal
explain: On average about 0.27 **below** the true values, yet its greedy policy is worth about 0.28 of a possible 0.30. A greedy policy only needs the *order* of each state's action values to be right: which action is best, not by how much. Early targets, built from estimates still near 0, pull the 1/N averages down for a long time, but they pull every action in a state down roughly together, so the order survives. **Wrong values can still give a right policy.** So don't judge a learner by how accurate its Q-values are: judge the policy (lesson 7.2).
verify: script tuning_values_vs_policy.py
```

### Choosing settings honestly

Picking the best cell of a heatmap and reporting its score repeats lesson 7.2's warning: with 25 settings, one of them is likely to be lucky on these 10 seeds. The honest procedure is to choose settings using one set of seeds, then train and report with **fresh** seeds. And report the whole grid, not only the winner: the shape of the map, where it's reliable and where it breaks, is often the most useful result.

Further: decaying ε (explore a lot early, little late), adaptive step sizes, and automatic searches over settings all exist. Sutton & Barto, chapter 2.6 (optimistic initial values) and 6.5, and "learning rate schedules" in any deep-learning text, are the next steps.

```check
run ".venv/Scripts/python -m pytest -q tests/test_tuning.py" label="all lesson 7.3 tests pass" -- colour_for: place value between random (0) and best (1), clamp to that range, and mix from COLD to HOT.
```
