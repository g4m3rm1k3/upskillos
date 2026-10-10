---
title: 2.2 — Simple Rules, Measured
runtime: python
run: baselines.py
---

Before training an agent, find out what "good" means. This lesson measures four simple rules for playing CartPole, each over 100 episodes. Two are deliberately bad. One is the common-sense rule from last lesson's prediction. The last one is a single line of code, and it's very good.

### The story so far

Lesson 2.1 met CartPole. `env = gym.make("CartPole-v1")` makes it; `obs, info = env.reset(seed=0)` starts a game; `obs, reward, terminated, truncated, info = env.step(action)` pushes the cart, left (0) or right (1). Every step survived pays 1, so a game's total reward is how many steps it lasted. A game ends when the pole tips past 12° or the cart leaves the track, or is cut off at 500 steps.

**`obs`, the observation**, is a NumPy array of four numbers. Each has a position in the array, and this lesson reads them by position:

| position | name | meaning |
|---|---|---|
| `obs[0]` | position | where the cart is on the track (metres; 0 is the middle) |
| `obs[1]` | velocity | how fast the cart moves (positive is rightwards) |
| `obs[2]` | angle | the pole's tilt (radians; 0 is upright, positive leans right) |
| `obs[3]` | spin | how fast the angle is changing (positive is tipping rightwards) |

### Why measure simple rules first

These are **baselines**: results that any learned agent must be compared with. If Q-learning can't beat a random agent, it hasn't learned anything; if a one-line rule beats it, it hasn't learned much. Without baselines, a number like "it lasted 150 steps" means nothing.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_baselines.py** above.

```python file=tests/test_baselines.py provided
# Tests for baselines.py (lesson 2.2).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_baselines.py
import numpy as np


def test_play_returns_one_length_per_episode():
    from baselines import always_right, play
    lengths = play(always_right, episodes=5)
    assert len(lengths) == 5 and all(8 <= n <= 11 for n in lengths)


def test_play_random_lasts_about_twenty_steps():
    from baselines import play, random_policy
    assert 15 < play(random_policy, episodes=100).mean() < 30


def test_play_is_repeatable_with_a_seed():
    from baselines import play, random_policy
    assert np.array_equal(play(random_policy, 20, seed=1), play(random_policy, 20, seed=1))


def test_lean_pushes_towards_the_lean():
    from baselines import lean
    rng = np.random.default_rng(0)
    assert lean(np.array([0.0, 0.0, 0.1, 0.0]), rng) == 1
    assert lean(np.array([0.0, 0.0, -0.1, 0.0]), rng) == 0


def test_lean_ignores_everything_but_the_angle():
    from baselines import lean
    rng = np.random.default_rng(0)
    assert lean(np.array([2.0, -3.0, 0.05, -2.0]), rng) == 1


def test_lean_lasts_twice_as_long_as_random():
    from baselines import lean, play
    assert play(lean, episodes=50).mean() > 35


def test_spin_counts_the_spin_too():
    from baselines import lean_and_spin
    rng = np.random.default_rng(0)
    assert lean_and_spin(np.array([0.0, 0.0, 0.05, -0.2]), rng) == 0
    assert lean_and_spin(np.array([0.0, 0.0, -0.05, 0.2]), rng) == 1


def test_spin_nearly_solves_it():
    from baselines import lean_and_spin, play
    assert play(lean_and_spin, episodes=50).mean() > 400
```

A **policy** here is a function: given an observation (the four numbers) and a random generator, it returns an action. Every rule in this lesson has that same shape, `policy(obs, rng)`, so one function, `play`, can measure any of them. Most of them ignore `rng`, but the random policy needs one, and giving all of them the same shape is what lets `play` call whichever it's handed.

```check
file tests/test_baselines.py -- Click "Create provided tests/test_baselines.py" above.
```

## Playing many episodes

Create `baselines.py`:

```python file=baselines.py
import gymnasium as gym
import numpy as np


def random_policy(obs, rng):
    return int(rng.integers(2))


def always_right(obs, rng):
    return 1


def play(policy, episodes=100, seed=0):
    env = gym.make("CartPole-v1")
    rng = np.random.default_rng(seed)
    lengths = []
    obs, _ = env.reset(seed=seed)
    for i in range(episodes):
        if i > 0:
            obs, _ = env.reset()
        steps = 0
        while True:
            obs, reward, terminated, truncated, _ = env.step(policy(obs, rng))
            steps += 1
            if terminated or truncated:
                break
        lengths.append(steps)
    return np.array(lengths)


if __name__ == "__main__":
    for policy in (random_policy, always_right):
        lengths = play(policy)
        print(f"{policy.__name__:14} mean {lengths.mean():6.1f}  shortest {lengths.min()}  longest {lengths.max()}")
```

**`play`'s inputs, and what it gives back:**

| | what it is |
|---|---|
| input `policy` | the rule to measure: a function that takes `(obs, rng)` and returns 0 or 1 |
| input `episodes` | how many games to play (100 by default) |
| input `seed` | makes the 100 starting positions, and any random choices, the same every run |
| returns | a NumPy array of the games' lengths, one number per game: how many steps each lasted |

From that array, `.mean()` is the average length, `.min()` the shortest game and `.max()` the longest. Looking at all three matters: an average alone hides whether every game was similar or some were great and others terrible.

- **Functions are values.** `play(random_policy)` passes the function itself, without calling it (no brackets after its name), and `play` calls it each step as `policy(obs, rng)`. `policy.__name__` is the name it was defined with, used to label the output.
- **Seeding once.** The first `reset` gets the seed and every later one doesn't, as in lesson 1.4's `train`. The environment's own generator then continues from where it was, so the 100 starting positions are all different, and the same 100 every time you run it. `test_play_is_repeatable_with_a_seed` checks exactly that.
- **`np.array(lengths)`** turns the list into an array, so `.mean()`, `.min()` and `.max()` work on it directly.

Predict, then press **Run**:

```predict
question: What will the random policy's average episode length be, over 100 episodes?
answer: 21.6
tolerance: 4
explain: 21.6 steps, less than half a second. Measured on 100 episodes from seed 0, the shortest was 10 steps and the longest 72. Random pushes don't keep the pole up, but they do partly cancel out (left, right, left…), which is why random lasts twice as long as always pushing right (9.5 steps on average, 8 to 11). Pushing right every time tips the pole left at full rate, as lesson 2.1 showed.
verify: .venv/Scripts/python -c "from baselines import play, random_policy; print(play(random_policy).mean())"
```

```text
random_policy  mean   21.6  shortest 10  longest 72
always_right   mean    9.5  shortest 8  longest 11
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_baselines.py -k play" label="play measures any policy over many episodes, repeatably" -- Seed the environment and the generator once; count steps until terminated or truncated; return np.array(lengths).
```

## Your turn: push towards the lean

**Build, on your own:** a policy called `lean`, in `baselines.py`.

Lesson 2.1's prediction ended with the rule for a falling broom: to stand a leaning pole back up, move the cart **under** it. If the pole leans right (angle `obs[2]` positive), push right (action 1). Otherwise push left (action 0).

Write `lean(obs, rng)` and add it to the `for policy in (...)` line in the `__main__` block, so that **Run** measures it too.

```hints
nudge: The angle is the third of the four numbers. What index is that?
concept: `obs[2]` is the angle. One `if` (or a conditional expression) chooses between 1 and 0.
answer: Add to `baselines.py`, after `always_right`:
~~~python
def lean(obs, rng):
    return 1 if obs[2] > 0 else 0
~~~
and measure it: `for policy in (random_policy, always_right, lean):`. `1 if condition else 0` is Python's **conditional expression**: it's 1 when the condition holds and 0 otherwise, in one line.
```

```predict
question: How will `lean` compare with random?
choice: About the same as random
choice: About twice as long as random
choice: Nearly 500, almost always
answer: About twice as long as random
explain: 42.8 steps on average (25 to 60), about twice random, and still under a second. And in all 100 episodes it ended the same way: the pole past 12°. Watching the angle in one episode shows why: the swings **grow**, 2.7°, then 4.8°, then 11.4°, then over. `lean` only reacts to which side the pole is on, so it keeps pushing right until the pole has crossed upright, by which time the pole is already swinging left quickly, and then it pushes left until it's swinging right even faster. It's always correcting too late.
verify: .venv/Scripts/python -c "from baselines import lean, play; m = play(lean).mean(); print('About twice as long as random' if 35 < m < 55 else m)"
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_baselines.py -k lean" label="lean pushes towards the side the pole leans to" -- return 1 if obs[2] > 0 else 0.
```

## Lean and spin

`lean` fails because it ignores **where the pole is going**. That's the fourth number, the spin. Add the spin to the angle: then a pole that leans right but is already swinging back left fast counts as "going left", and the push starts early enough. Make `baselines.py` this:

```python file=baselines.py
import gymnasium as gym
import numpy as np


def random_policy(obs, rng):
    return int(rng.integers(2))


def always_right(obs, rng):
    return 1


def lean(obs, rng):
    return 1 if obs[2] > 0 else 0


def lean_and_spin(obs, rng):
    return 1 if obs[2] + obs[3] > 0 else 0


def play(policy, episodes=100, seed=0):
    env = gym.make("CartPole-v1")
    rng = np.random.default_rng(seed)
    lengths = []
    obs, _ = env.reset(seed=seed)
    for i in range(episodes):
        if i > 0:
            obs, _ = env.reset()
        steps = 0
        while True:
            obs, reward, terminated, truncated, _ = env.step(policy(obs, rng))
            steps += 1
            if terminated or truncated:
                break
        lengths.append(steps)
    return np.array(lengths)


if __name__ == "__main__":
    print("policy           mean  shortest  longest  reached 500")
    for policy in (random_policy, always_right, lean, lean_and_spin):
        lengths = play(policy)
        print(f"{policy.__name__:14} {lengths.mean():6.1f}  {lengths.min():8}  {lengths.max():7}  {int((lengths == 500).sum()):11}")
```

`obs[2] + obs[3]` is roughly "where the angle will be soon". It's lesson 2.1's Euler rule, new angle = angle + time × spin, used to look ahead by **one second**: angle + 1 × spin. A guess that far ahead isn't accurate, because the spin itself keeps changing, but its **sign** says which side the pole is heading for, and that's all the rule needs. If the angle is +0.05 (leaning right) and the spin is −0.2 (swinging left at 0.2 radians a second), the sum is −0.15, so the rule pushes left, getting under the pole on the side it's heading to. `(lengths == 500).sum()` compares every length with 500 and counts the `True`s: how many episodes reached the limit.

```predict
question: Out of 100 episodes, how many will `lean_and_spin` keep going all the way to the 500-step limit?
answer: 90
tolerance: 10
explain: 90 of 100 reach 500, and the average is 484.8. The other 10 didn't drop the pole at all: every one of them ended with the **cart** past the edge of the track. The rule never looks at the cart's position, so it can drift steadily one way while balancing perfectly. One line of code, and CartPole is nearly solved. (Gymnasium registers CartPole-v1 with a "reward threshold" of 475: an average above 475 over 100 episodes counts as solving it. 484.8 is above.)
verify: .venv/Scripts/python -c "from baselines import lean_and_spin, play; print(int((play(lean_and_spin) == 500).sum()))"
```

```text
policy           mean  shortest  longest  reached 500
random_policy    21.6        10       72            0
always_right      9.5         8       11            0
lean             42.8        25       60            0
lean_and_spin   484.8       319      500           90
```

Look at what the 90 mean. Those episodes didn't **fail**: they were **truncated**, stopped at 500 steps with the pole still up, exactly the corridor's time limit from lesson 1.1. To an agent learning from these episodes, a truncated ending must not look like a fall: the last state was fine, and the future would have gone on paying 1 per step. That's why `learn` takes `terminated` and not `truncated`.

So here's the question for the rest of this chapter. *You* know the rule, because you understand physics. A Q-learning agent knows nothing: not what the four numbers mean, not which one is the angle, not that pushing right tips the pole left. It only gets a 1 for each step it survives. Can it discover something as good as `lean_and_spin` from that alone?

```check
run ".venv/Scripts/python -m pytest -q tests/test_baselines.py -k spin" label="lean_and_spin pushes towards where the pole is heading" -- return 1 if obs[2] + obs[3] > 0 else 0.
run ".venv/Scripts/python -m pytest -q tests/test_baselines.py" label="all lesson 2.2 tests pass"
```

### What you have

Four baselines, measured: random 21.6 steps, always right 9.5, lean 42.8, lean and spin 484.8. Any agent from now on gets compared with these. Next lesson solves the problem that stops Chapter 1's agent playing CartPole at all: its table needs a row number, and CartPole gives it four decimals.
