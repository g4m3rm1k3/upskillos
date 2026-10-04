---
title: 3.3 — Exploring Where You're Unsure, and Machines That Change
track: Reinforcement Learning in pygame
runtime: python
run: rooms_view.py
---

ε-greedy explores **blindly**: when it explores, it picks any machine at random, including ones it already knows are bad after hundreds of pulls. This lesson builds a smarter explorer, **UCB** (upper confidence bound), which explores the machines it's *unsure* about. It turns lesson 2.2's standard error into a decision rule.

Then the room changes. Real problems rarely stand still: a recommendation's appeal fades, a market shifts, an opponent adapts. You'll build machines whose averages slowly drift, and see why lesson 2.3's constant step size is what keeps a learner up to date.

Along the way you'll refactor `compare_view.py` so one window can run any comparison. That's a small taste of how working code is reshaped without breaking what already uses it.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_uncertainty.py** above.

```python file=tests/test_uncertainty.py provided
# Tests for lesson 3.3: UCB, drifting machines and the reusable comparison. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_uncertainty.py
import numpy as np


def test_ucb_tries_every_machine_once_first():
    from bandit import UCBLearner
    learner = UCBLearner(5, np.random.default_rng(0))
    tried = []
    for _ in range(5):
        arm = learner.choose()
        tried.append(arm)
        learner.learn(arm, 10.0)     # even a great payout must not stop the others being tried
    assert sorted(tried) == [0, 1, 2, 3, 4]


def test_ucb_prefers_the_less_tried_of_two_equal_machines():
    from bandit import UCBLearner
    learner = UCBLearner(2, np.random.default_rng(0))
    learner.Q[:] = [1.0, 1.0]
    learner.N[:] = [10, 1]
    assert learner.choose() == 1


def test_ucb_bonus_is_c_times_root_log_total_over_count():
    from bandit import UCBLearner
    learner = UCBLearner(2, np.random.default_rng(0), c=2.0)
    learner.N[:] = [4, 1]                  # 5 pulls in total
    learner.Q[:] = [0.0, -1.5]             # bonuses: 2*sqrt(ln 5 / 4) = 1.27 and 2*sqrt(ln 5 / 1) = 2.54
    assert learner.choose() == 0, "0 + 1.27 beats -1.5 + 2.54 = 1.04"
    learner.Q[:] = [0.0, -1.2]
    assert learner.choose() == 1, "-1.2 + 2.54 = 1.34 beats 0 + 1.27"


def test_ucb_is_a_learner():
    from bandit import Learner, UCBLearner
    learner = UCBLearner(3, np.random.default_rng(0))
    assert isinstance(learner, Learner)
    learner.learn(2, 4.0)
    assert learner.Q[2] == 4.0 and learner.N[2] == 1, "learn is inherited unchanged"
    assert type(learner.choose()) is int


def test_drift_machines_start_equal_and_wander():
    from bandit import DriftingBandit
    bandit = DriftingBandit(5, np.random.default_rng(0), drift=0.01)
    assert bandit.means.tolist() == [0.0] * 5
    for _ in range(10_000):
        bandit.pull(0)
    spread = bandit.means.std()
    assert 0.2 < spread < 3.0, f"after 10,000 steps of 0.01 the means should have wandered about 1 apart, got {spread:.2f}"


def test_drift_pull_still_pays_around_the_current_mean():
    from bandit import DriftingBandit
    bandit = DriftingBandit(3, np.random.default_rng(1), drift=0.0)
    bandit.means[:] = [5.0, 0.0, 0.0]
    assert abs(np.mean([bandit.pull(0) for _ in range(4000)]) - 5.0) < 0.1


def test_anyroom_run_once_uses_the_room_it_is_given():
    from bandit import DriftingBandit, Learner
    from experiment import run_once
    made = []

    def make_room(k, rng):
        room = DriftingBandit(k, rng)
        made.append(room)
        return room

    rewards, best = run_once(lambda k, rng: Learner(k, rng, epsilon=0.1), 5, 300, 0, make_bandit=make_room)
    assert rewards.shape == (300,)
    assert len(made) == 1, "one room per run"
    assert made[0].means.std() > 0, "the machines drifted apart during the run"


def test_anyroom_experiment_passes_the_room_on():
    from bandit import DriftingBandit, Learner
    from experiment import Experiment
    exp = Experiment(lambda k, rng: Learner(k, rng), steps=50, make_bandit=DriftingBandit)
    exp.add_runs(3)
    assert exp.runs == 3 and exp.curves()[0].shape == (50,)


def test_compare_runs_any_list_of_strategies():
    from bandit import Learner
    import compare_view
    mine = [("only greedy", (255, 255, 255), lambda k, rng: Learner(k, rng))]
    assert compare_view.run(mine, steps=20, target=2, title="test", max_frames=3) == 3


def test_compare_draws_the_strategies_it_is_given():
    import pygame
    import compare_view
    from bandit import Learner
    from experiment import Experiment
    pygame.font.init()
    magenta = (255, 0, 255)
    mine = [("mine", magenta, lambda k, rng: Learner(k, rng))]
    exp = Experiment(mine[0][2], steps=20)
    exp.add_runs(3)
    screen = pygame.Surface((compare_view.WIDTH, compare_view.HEIGHT))
    compare_view.draw(screen, pygame.font.Font(None, 22), mine, [exp], 0, 3)
    pixels = pygame.surfarray.array3d(screen)
    assert (pixels == magenta).all(axis=2).any(), "the line and label should be drawn in the given strategy's colour"


def test_rooms_both_windows_open_and_close():
    import rooms_view
    assert rooms_view.run(drifting=False, max_frames=2) == 2
    assert rooms_view.run(drifting=True, max_frames=2) == 2
```

`test_ucb_bonus_is_c_times_root_log_total_over_count` sets the estimates and counts by hand (`learner.Q[:] = …` writes into the existing array) and works the formula out in its comments. Read it alongside the next step: it's a worked example of the rule you're about to write.

```check
file tests/test_uncertainty.py -- Click "Create provided tests/test_uncertainty.py" above.
```

## Explore where you're unsure

Add `UCBLearner` to `bandit.py`:

```python file=bandit.py
import numpy as np

from averages import update
from chance import bernoulli
from qtable import greedy_action


class Bandit:
    def __init__(self, k, rng):
        self.rng = rng
        self.means = rng.normal(0.0, 1.0, k)

    def pull(self, arm):
        return float(self.rng.normal(self.means[arm], 1.0))

    def best_arm(self):
        return int(self.means.argmax())

    def regret(self, arm):
        return float(self.means.max() - self.means[arm])


class Learner:
    def __init__(self, k, rng, epsilon=0.0, initial=0.0, step=None):
        self.Q = np.full(k, float(initial))
        self.N = np.zeros(k, dtype=int)
        self.rng = rng
        self.epsilon = epsilon
        self.step = step

    def choose(self):
        if bernoulli(self.epsilon, self.rng):
            return int(self.rng.integers(len(self.Q)))
        return greedy_action(self.Q, self.rng)

    def learn(self, arm, reward):
        self.N[arm] += 1
        step = self.step if self.step is not None else 1 / self.N[arm]
        self.Q[arm] = update(self.Q[arm], reward, step)


class UCBLearner(Learner):
    def __init__(self, k, rng, c=2.0, step=None):
        super().__init__(k, rng, step=step)
        self.c = c

    def choose(self):
        untried = np.flatnonzero(self.N == 0)
        if len(untried):
            return int(self.rng.choice(untried))
        bonus = self.c * np.sqrt(np.log(self.N.sum()) / self.N)
        return greedy_action(self.Q + bonus, self.rng)
```

**How the rule works.** For each machine, UCB adds a **bonus** to the estimate and picks the largest total:

```text
choose the machine with the largest   Q[a] + c × √( ln(t) / N[a] )
```

where `t` is the total number of pulls so far (`self.N.sum()`), `N[a]` is this machine's pulls, and `c` sets how much the bonus counts.

- **The bonus shrinks like 1/√N.** That's the shape of the standard error from lesson 2.2: an average of N payouts is uncertain by about σ/√N. So `Q + bonus` is a **plausible upper limit** for the machine's true mean: "it's probably no better than this". UCB pulls the machine whose best plausible value is highest. A machine with a mediocre estimate but few pulls can still win, because it *might* be the best. This principle is called **optimism in the face of uncertainty**.
- **The `ln(t)` makes sure nobody is abandoned for ever.** A machine that isn't pulled keeps its N, while t keeps growing, so its bonus slowly rises until it gets pulled again. The logarithm grows very slowly (ln 100 ≈ 4.6, ln 10,000 ≈ 9.2), so neglected machines are revisited less and less often, but always eventually.
- **Untried machines come first.** With `N = 0` the bonus would divide by zero, and in a sense an untried machine is infinitely uncertain. `np.flatnonzero(self.N == 0)` lists the untried machines, and one of them is pulled at random until every machine has been tried once.

Worked through with the test's numbers: `c = 2`, counts `N = [4, 1]`, so `t = 5` and ln 5 ≈ 1.609:

```text
machine 0:  bonus = 2 × √(1.609 / 4) = 1.27     estimate  0.0  → total  1.27
machine 1:  bonus = 2 × √(1.609 / 1) = 2.54     estimate −1.5  → total  1.04
```

Machine 0 wins, but only just: machine 1's single pull leaves it so uncertain that a bad estimate is nearly forgiven.

```predict
question: Same counts, but machine 1's estimate is −1.2 instead of −1.5. Which machine does UCB pull?
choice: machine 0
choice: machine 1
answer: machine 1
explain: Machine 1's total is −1.2 + 2.54 = 1.34, which beats machine 0's 0 + 1.27. A 0.3 rise in one estimate flipped the choice. An estimate from one pull is the least trustworthy kind, and UCB gives it the most room.
verify: .venv/Scripts/python -c "import numpy as np; from bandit import UCBLearner; l = UCBLearner(2, np.random.default_rng(0)); l.N[:] = [4, 1]; l.Q[:] = [0.0, -1.2]; print('machine', l.choose())"
```

**How inheritance works.** `class UCBLearner(Learner)` makes a new class based on `Learner`. When you call a method on a `UCBLearner`, Python looks for it in `UCBLearner` first, then in `Learner`. `learn` isn't defined in `UCBLearner`, so the learner's own `learn`, the running average, is used unchanged. `choose` *is* defined, so it **overrides** the parent's. `super().__init__(k, rng, step=step)` runs `Learner.__init__` on this same object, which sets up `Q`, `N` and the rest, and then the new `__init__` adds `c`. Only what's different is written down.

```check
run ".venv/Scripts/python -m pytest -q tests/test_uncertainty.py -k ucb" label="UCBLearner explores where it is uncertain" -- Pull an untried machine first; otherwise choose greedily on Q + c * sqrt(ln(N.sum()) / N).
```

## Machines that drift

Now a room where the machines change. Add `DriftingBandit` to `bandit.py`:

```python file=bandit.py
import numpy as np

from averages import update
from chance import bernoulli
from qtable import greedy_action


class Bandit:
    def __init__(self, k, rng):
        self.rng = rng
        self.means = rng.normal(0.0, 1.0, k)

    def pull(self, arm):
        return float(self.rng.normal(self.means[arm], 1.0))

    def best_arm(self):
        return int(self.means.argmax())

    def regret(self, arm):
        return float(self.means.max() - self.means[arm])


class Learner:
    def __init__(self, k, rng, epsilon=0.0, initial=0.0, step=None):
        self.Q = np.full(k, float(initial))
        self.N = np.zeros(k, dtype=int)
        self.rng = rng
        self.epsilon = epsilon
        self.step = step

    def choose(self):
        if bernoulli(self.epsilon, self.rng):
            return int(self.rng.integers(len(self.Q)))
        return greedy_action(self.Q, self.rng)

    def learn(self, arm, reward):
        self.N[arm] += 1
        step = self.step if self.step is not None else 1 / self.N[arm]
        self.Q[arm] = update(self.Q[arm], reward, step)


class UCBLearner(Learner):
    def __init__(self, k, rng, c=2.0, step=None):
        super().__init__(k, rng, step=step)
        self.c = c

    def choose(self):
        untried = np.flatnonzero(self.N == 0)
        if len(untried):
            return int(self.rng.choice(untried))
        bonus = self.c * np.sqrt(np.log(self.N.sum()) / self.N)
        return greedy_action(self.Q + bonus, self.rng)


class DriftingBandit(Bandit):
    def __init__(self, k, rng, drift=0.01):
        super().__init__(k, rng)
        self.means = np.zeros(k)
        self.drift = drift

    def pull(self, arm):
        reward = super().pull(arm)
        self.means += self.rng.normal(0.0, self.drift, len(self.means))
        return reward
```

- All machines start equal, at 0, because nothing is known yet and none is better.
- After every pull, **every** machine's mean takes a small random step: `rng.normal(0.0, self.drift, k)` draws one step per machine, with standard deviation 0.01, and `+=` adds them in place. This is a **random walk**: each mean wanders, without a pull back to where it started.
- `super().pull(arm)` pays out exactly as an ordinary `Bandit` does, from the machine's *current* mean, before the means move.

**How far do the means wander?** Lesson 2.2's rule: variances of independent steps add. After t pulls, each mean has moved by a sum of t steps, each with variance 0.01², so its standard deviation is 0.01 × √t. After 2000 pulls that's 0.01 × 44.7 ≈ 0.45, about the gap between good and ordinary machines in a normal room. So in a drifting room the best machine **changes** over time, and a learner has to notice.

```check
run ".venv/Scripts/python -m pytest -q tests/test_uncertainty.py -k drift" label="DriftingBandit pays from wandering means" -- After paying out with super().pull(arm), add a normal step with standard deviation drift to every machine's mean.
```

## Experiments in any room

`run_once` always built a plain `Bandit`. Give it a parameter for which kind of room to build:

```python file=experiment.py
import numpy as np

from bandit import Bandit


def run_once(make_learner, k, steps, seed, make_bandit=Bandit):
    world_rng = np.random.default_rng([seed, 0])
    agent_rng = np.random.default_rng([seed, 1])
    bandit = make_bandit(k, world_rng)
    learner = make_learner(k, agent_rng)
    rewards = np.zeros(steps)
    best = np.zeros(steps, dtype=bool)
    for t in range(steps):
        arm = learner.choose()
        best[t] = arm == bandit.best_arm()
        rewards[t] = bandit.pull(arm)
        learner.learn(arm, rewards[t])
    return rewards, best


class Experiment:
    def __init__(self, make_learner, k=5, steps=500, make_bandit=Bandit):
        self.make_learner = make_learner
        self.make_bandit = make_bandit
        self.k = k
        self.steps = steps
        self.rewards = []
        self.best = []

    @property
    def runs(self):
        return len(self.rewards)

    def add_runs(self, n):
        for _ in range(n):
            rewards, best = run_once(self.make_learner, self.k, self.steps, self.runs, self.make_bandit)
            self.rewards.append(rewards)
            self.best.append(best)

    def curves(self):
        rewards = np.array(self.rewards)
        mean = rewards.mean(axis=0)
        error = rewards.std(axis=0, ddof=1) / np.sqrt(self.runs)
        share_best = np.array(self.best).mean(axis=0)
        return mean, error, share_best
```

- `make_bandit=Bandit` is a parameter whose default is the class itself. In Python, a class is a value like any other: you can pass it around and call it later, and calling it makes an object. `make_bandit(k, world_rng)` builds whatever kind of room was passed in. Every existing caller passes nothing, so it still gets a plain `Bandit`, and lesson 3.2's experiments behave exactly as before.
- The line recording `best[t]` has moved **before** the pull. In a drifting room, a pull moves the means, so "was this the best machine?" must be asked about the room as it was when the choice was made. In a still room the order makes no difference.

```check
run ".venv/Scripts/python -m pytest -q tests/test_uncertainty.py -k anyroom" label="run_once and Experiment build the room they are given" -- Pass make_bandit through: run_once builds the room with make_bandit(k, world_rng), and Experiment stores make_bandit and passes it to run_once.
```

## One comparison window for every experiment

`compare_view.py` used its module-level `STRATEGIES` and `TARGET_RUNS` directly. A value used that way is a **hidden input**: to compare different strategies, you'd have to edit the file. Turn the hidden inputs into parameters:

```python file=compare_view.py
import pygame

from bandit import Bandit, Learner
from chart import draw_frame, draw_series, smooth
from experiment import Experiment

WIDTH, HEIGHT = 760, 460
PLOT = pygame.Rect(60, 50, 520, 330)
TARGET_RUNS = 500
SMOOTH = 10
BACKGROUND = (24, 26, 33)
FRAME = (100, 116, 139)
TEXT = (226, 232, 240)

STRATEGIES = [
    ("greedy", (148, 163, 184), lambda k, rng: Learner(k, rng)),
    ("epsilon 0.1", (94, 234, 212), lambda k, rng: Learner(k, rng, epsilon=0.1)),
    ("epsilon 0.01", (250, 204, 21), lambda k, rng: Learner(k, rng, epsilon=0.01)),
    ("optimistic 5", (248, 113, 113), lambda k, rng: Learner(k, rng, initial=5.0, step=0.1)),
]
VIEWS = [("average reward per pull", -0.5, 1.5), ("share of pulls on the best machine", 0.0, 1.0)]


def draw(screen, font, strategies, experiments, view, target):
    screen.fill(BACKGROUND)
    title, low, high = VIEWS[view]
    draw_frame(screen, font, PLOT, low, high, FRAME, title)
    for row, ((name, colour, _), experiment) in enumerate(zip(strategies, experiments)):
        if experiment.runs > 1:
            mean, error, share_best = experiment.curves()
            if view == 0:
                draw_series(screen, PLOT, smooth(mean, SMOOTH), colour, low, high, band=2 * smooth(error, SMOOTH))
            else:
                draw_series(screen, PLOT, smooth(share_best, SMOOTH), colour, low, high)
            label = f"{name}: {mean[-100:].mean():+.2f} reward, {share_best[-100:].mean():.0%} best"
        else:
            label = name
        screen.blit(font.render(label, True, colour), (PLOT.right + 16, PLOT.top + row * 26))
    runs = experiments[0].runs
    status = f"rooms played: {runs} of {target}    keys 1 / 2: reward / best machine"
    screen.blit(font.render(status, True, TEXT), (PLOT.left, PLOT.bottom + 24))


def run(strategies=STRATEGIES, make_bandit=Bandit, steps=500, target=TARGET_RUNS,
        title="Explore or exploit", max_frames=None, runs_per_frame=1):
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption(title)
    font = pygame.font.Font(None, 22)
    clock = pygame.time.Clock()
    experiments = [Experiment(make, steps=steps, make_bandit=make_bandit) for _, _, make in strategies]
    view = 0
    frames = 0
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN and event.key in (pygame.K_1, pygame.K_2):
                view = event.key - pygame.K_1
        if experiments[0].runs < target:
            for experiment in experiments:
                experiment.add_runs(runs_per_frame)
        draw(screen, font, strategies, experiments, view, target)
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

What changed, and how it keeps old behaviour:

- `run` now takes the strategies, the kind of room, the number of pulls, the target number of rooms and the window title. Each has a **default** equal to the old fixed value, so `compare_view.run()` with no arguments still shows exactly the lesson 3.2 comparison, and `python compare_view.py` still works.
- `draw` receives `strategies` and `target` as arguments instead of reading the globals. A function that only uses its arguments can be called with anything. That's what makes the new test, which passes in its own one-strategy list, possible.
- Everything is **keyword arguments** after the first: callers write `steps=2000, target=200`, which reads clearly and doesn't depend on the order of parameters.

Changing code's structure without changing what it does is called **refactoring**. Lesson 3.2's tests still pass unchanged, and that's what tells you the refactor kept the old behaviour.

```check
run ".venv/Scripts/python -m pytest -q tests/test_uncertainty.py tests/test_explore.py -k \"compare\"" label="compare_view runs any comparison, and lesson 3.2's still works" -- Every place that read STRATEGIES or TARGET_RUNS inside draw and run should use the strategies and target parameters instead.
```

## Run both rooms

`rooms_view.py` holds the two new comparisons and passes them to the reusable window:

```python file=rooms_view.py
import sys

import compare_view
from bandit import DriftingBandit, Learner, UCBLearner

STEADY = [
    ("epsilon 0.1", (94, 234, 212), lambda k, rng: Learner(k, rng, epsilon=0.1)),
    ("UCB c=2", (192, 132, 252), lambda k, rng: UCBLearner(k, rng, c=2.0)),
    ("UCB c=0.5", (250, 204, 21), lambda k, rng: UCBLearner(k, rng, c=0.5)),
]
DRIFTING = [
    ("epsilon 0.1, step 1/N", (148, 163, 184), lambda k, rng: Learner(k, rng, epsilon=0.1)),
    ("epsilon 0.1, step 0.1", (94, 234, 212), lambda k, rng: Learner(k, rng, epsilon=0.1, step=0.1)),
]


def run(drifting=False, max_frames=None):
    if drifting:
        return compare_view.run(DRIFTING, DriftingBandit, steps=2000, target=200,
                                title="Drifting machines", max_frames=max_frames)
    return compare_view.run(STEADY, steps=500, title="UCB against epsilon-greedy", max_frames=max_frames)


if __name__ == "__main__":
    run(drifting="drift" in sys.argv)
```

- `sys.argv` is the list of words on the command line: `python rooms_view.py drift` gives `["rooms_view.py", "drift"]`. **Run** passes no extra words, so it shows the still room. For the drifting one, type in the terminal: `.venv\Scripts\python rooms_view.py drift`.
- The drifting comparison plays 2000 pulls per room, so drift has time to matter, over 200 rooms.

Run the still room first.

```predict
question: In the still room over 500 pulls, which earns more: UCB with c = 2, or UCB with c = 0.5?
choice: c = 2
choice: c = 0.5
choice: The same: c only matters at the start
answer: c = 0.5
explain: Over 300 rooms, c = 0.5 earned about 580 per room, c = 2 about 549, and ε-greedy 515. Both UCBs beat random exploration, but c = 2 explores too much here. The textbook value of 2 comes from a guarantee proved for rewards between 0 and 1. These payouts scatter with a standard deviation of 1 around means near 0, which is a different scale, so the best c is different too. A theoretical constant gives you a guarantee, not the best setting for your problem. That's why parameters like c get measured.
verify: script ucb_c.py
```

Now the drifting room, from the terminal: `.venv\Scripts\python rooms_view.py drift`. Press **2** for the best-machine chart.

```predict
question: Late in the run, which learner picks the best machine more often: step 1/N or a constant step of 0.1?
choice: step 1/N
choice: step 0.1
answer: step 0.1
explain: In the last 500 pulls, the constant step picked the current best machine about 66% of the time, and step 1/N about 52%. With step 1/N, after hundreds of pulls a new payout barely moves an estimate, so it reports the machine's *average over its whole history*, not what it pays now. When the best machine changes, it takes ages to notice. The constant step forgets old payouts exponentially (lesson 2.3) and keeps up. In a world that changes, a learner must keep forgetting.
verify: script drift_step.py
```

This last point carries straight into Q-learning. Chapter 2 said the "truth" an agent learns about changes as the agent itself improves. Q-learning lives in a drifting room of its own making, which is why it uses a constant step size.

### Further reading

These are the ideas from this chapter in the field's own words, now that you can read them:

- Sutton & Barto, *Reinforcement Learning: An Introduction* (2nd ed., free online), chapter 2: the 10-armed testbed, ε-greedy, optimistic initial values, UCB, and gradient bandits, which this series skips.
- **Thompson sampling** keeps a whole probability distribution for each machine's mean, and pulls each machine with the probability that it's the best. It often beats UCB in practice. Russo et al., *A Tutorial on Thompson Sampling*, explains it with the ideas you now know: Bernoulli rewards, averages and uncertainty.

```check
run ".venv/Scripts/python -m pytest -q tests/test_uncertainty.py tests/test_explore.py" label="all lesson 3.2 and 3.3 tests pass" -- rooms_view.run(drifting=True) passes DRIFTING, DriftingBandit and steps=2000 to compare_view.run.
```
