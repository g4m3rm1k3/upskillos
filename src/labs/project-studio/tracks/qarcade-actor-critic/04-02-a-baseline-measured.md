---
title: 4.2 — A Baseline, Measured
runtime: python
run: noise.py
---

### The story so far

Lesson 4.1 built REINFORCE in `policy.py`. `make_policy()` is a network whose two outputs, through softmax, are the probability of each push. `choose(net, obs)` draws a push by those probabilities and returns it with log(its probability). After each game, `discounted_returns` gives every move its **return** (the discounted sum of the rewards from that move to the end), and `reinforce` takes one gradient step on −sum(log probability × return), which makes every move likelier in proportion to what followed it.

It learned, and it was unreliable. Of 10 seeds, 2 finished with a perfect greedy score of 500 (and one at 496), and the average was 228 ± 65. Seed 0 reached 500-step games around episode 100, fell back to around 60, and climbed again.

### What this lesson asks

In CartPole every return is positive, so REINFORCE pushes up **every** move, just some more than others. A move followed by a return of 80 gets pushed up hard, even if 80 is a poor result for that game. What matters is whether a move did **better or worse than usual**, not whether its return was big.

A **baseline** is a number b subtracted from every return before the update: the move is judged by G − b instead of G. Moves that beat the baseline are pushed up; moves that fell short are pushed **down**. This lesson uses the simplest baseline, the game's own average return, measures what it does to the noise in each update, and measures what it does to learning.

### How the pieces fit

```text
policy.py   centre_and_scale(returns)       subtract the average, divide by the spread: average 0, spread 1
            reinforce(..., baseline=True)   uses centre_and_scale(returns) in place of the raw returns
noise.py    episode_gradient(net, env)      play one game, compute its REINFORCE gradient (every knob's slope)
            signal_to_noise(gradients)      how big the average gradient is, compared with how much games disagree
            gradient_spread(net, baseline)  100 games, same policy, with or without the baseline -> one number
```

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_baseline.py** above.

```python file=tests/test_baseline.py provided
# Tests for policy.py's centre_and_scale and baseline option, and noise.py (lesson 4.2).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_baseline.py
import numpy as np
import torch
from pytest import approx


def test_centre_gives_average_zero_and_spread_one():
    from policy import centre_and_scale
    out = centre_and_scale([1.0, 2.0, 3.0, 4.0])
    assert out.mean() == approx(0.0, abs=1e-9) and out.std() == approx(1.0, abs=1e-6)


def test_centre_keeps_the_order():
    from policy import centre_and_scale
    out = centre_and_scale([10.0, 30.0, 20.0])
    assert out[1] > out[2] > out[0], "the best return stays the best"


def test_centre_of_equal_returns_is_all_zero():
    from policy import centre_and_scale
    out = centre_and_scale([5.0, 5.0, 5.0])
    assert np.isfinite(out).all() and out == approx([0.0, 0.0, 0.0]), "no dividing by zero"


def test_option_switches_the_baseline_on():
    from policy import reinforce
    plain = reinforce(episodes=10, seed=1)[1]
    with_baseline = reinforce(episodes=10, seed=1, baseline=True)[1]
    assert len(with_baseline) == 10 and plain != with_baseline, "a different update gives different games"
    assert with_baseline == reinforce(episodes=10, seed=1, baseline=True)[1]


def test_noise_ratio_of_known_gradients():
    from noise import signal_to_noise
    assert signal_to_noise([[1.0, 0.0], [3.0, 0.0]]) == approx(4.0), "average [2, 0], length 2; spreads 1 and 0, average 0.5"


def test_noise_measurement_gives_a_positive_number():
    from noise import gradient_spread
    from policy import make_policy
    torch.manual_seed(0)
    assert gradient_spread(make_policy(), baseline=True, episodes=5) > 0
```

What each group protects:

| group | it makes sure that… | a bug it would catch |
|---|---|---|
| `centre` | the result averages 0 with a spread of 1, keeps the order of the returns, and gives zeros (not `nan`) when every return is equal | dividing by a spread of 0 in a game where every move had the same return |
| `option` | `baseline=True` really changes the update, and is still repeatable with a seed | a switch that's accepted and ignored |
| `noise` | the signal-to-noise measure gives the hand-worked answer, and runs on a real policy | dividing by the total spread instead of the average, which makes bigger networks look noisier |

```check
file tests/test_baseline.py -- Click "Create provided tests/test_baseline.py" above.
```

## Your turn: centre and scale

**Build, on your own:** `centre_and_scale(returns)` in `policy.py`, after `discounted_returns`.

Two operations:

1. **Centre: subtract the average.** This is the baseline: b = the average return of this game. Moves that did better than the game's average get a positive number, worse ones a negative number.
2. **Scale: divide by the spread** (the standard deviation, lesson 2.5). A 500-step game's returns go up to about 100; a 20-step game's only to about 18. Dividing by the spread makes every game's numbers about the same size, so a long game doesn't make a far bigger step than a short one.

Worked through for returns [1, 2, 3, 4]:

```text
average            (1 + 2 + 3 + 4) / 4                    = 2.5
minus the average  [-1.5, -0.5, 0.5, 1.5]
spread             √(((-1.5)² + (-0.5)² + 0.5² + 1.5²) / 4)  = √1.25 = 1.118
divided            [-1.342, -0.447, 0.447, 1.342]           average 0, spread 1
```

(NumPy's `.std()` divides by n, not n − 1 as lesson 2.5's standard deviation did. For a whole game's returns, either is fine; the test expects NumPy's default.)

**One trap:** if every return is the same, the spread is 0, and dividing by 0 gives `nan`, which would poison the network's knobs. Add a tiny number to the spread, `+ 1e-8` (0.00000001): too small to change any real result, big enough never to be 0.

Convert first with `np.asarray(returns, dtype=float)`, so a list works too.

**Does subtracting a baseline bend the update in a wrong direction?** No, on average, and there's a short reason. The update for a move is ∇log π(move) × (G − b), so the baseline's contribution is −b × ∇log π(move). Averaged over the moves the policy might pick, weighting each by its probability, that's −b × Σ π(a) ∇log π(a). And π(a) ∇log π(a) = ∇π(a), so the sum is ∇(Σ π(a)) = ∇(1) = 0: the probabilities always add up to 1, so their total can't change. Check it with lesson 4.1's two-move example, where p = [0.25, 0.75]:

```python
p = [0.25, 0.75]
slope_of_log_p = [-p[1], 1 - p[1]]       # slopes of log p0 and log p1 with respect to score 1 (lesson 4.1)
print(sum(pa * s for pa, s in zip(p, slope_of_log_p)))
```

It prints `0.0`: 0.25 × −0.75 + 0.75 × 0.25. The baseline adds nothing on average; what it changes is how much each single game's update wanders around that average.

```hints
nudge: Make an array, then one line: subtract the mean, divide by the standard deviation plus a tiny number.
concept: `returns = np.asarray(returns, dtype=float)`, then `return (returns - returns.mean()) / (returns.std() + 1e-8)`.
answer: Add to `policy.py`, after `discounted_returns`:
~~~python
def centre_and_scale(returns):
    returns = np.asarray(returns, dtype=float)
    return (returns - returns.mean()) / (returns.std() + 1e-8)
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_baseline.py -k centre" label="centre_and_scale gives average 0 and spread 1, keeps the order, and never divides by zero" -- returns = np.asarray(returns, dtype=float); return (returns - returns.mean()) / (returns.std() + 1e-8).
```

## The baseline switch

Make `policy.py` this:

```python file=policy.py
import gymnasium as gym
import numpy as np
import torch
from torch import nn


def make_policy(hidden=64):
    return nn.Sequential(nn.Linear(4, hidden), nn.Tanh(), nn.Linear(hidden, 2))


def probabilities(net, obs):
    with torch.no_grad():
        return torch.softmax(net(torch.tensor(obs, dtype=torch.float32)), dim=-1).numpy()


def choose(net, obs):
    dist = torch.distributions.Categorical(logits=net(torch.tensor(obs, dtype=torch.float32)))
    action = dist.sample()
    return int(action), dist.log_prob(action)


def discounted_returns(rewards, gamma):
    returns = np.zeros(len(rewards))
    running = 0.0
    for t in reversed(range(len(rewards))):
        running = rewards[t] + gamma * running
        returns[t] = running
    return returns


def centre_and_scale(returns):
    returns = np.asarray(returns, dtype=float)
    return (returns - returns.mean()) / (returns.std() + 1e-8)


def reinforce(episodes=300, seed=0, gamma=0.99, rate=0.01, baseline=False):
    torch.manual_seed(seed)
    env = gym.make("CartPole-v1")
    net = make_policy()
    optimiser = torch.optim.Adam(net.parameters(), lr=rate)
    lengths = []
    obs, _ = env.reset(seed=seed)
    for episode in range(episodes):
        if episode > 0:
            obs, _ = env.reset()
        log_probs, rewards = [], []
        while True:
            action, log_prob = choose(net, obs)
            obs, reward, terminated, truncated, _ = env.step(action)
            log_probs.append(log_prob)
            rewards.append(reward)
            if terminated or truncated:
                break
        returns = discounted_returns(rewards, gamma)
        if baseline:
            returns = centre_and_scale(returns)
        loss = -(torch.stack(log_probs) * torch.tensor(returns, dtype=torch.float32)).sum()
        optimiser.zero_grad()
        loss.backward()
        optimiser.step()
        lengths.append(len(rewards))
    return net, lengths


def greedy_lengths(net, episodes=20, seed=1000):
    env = gym.make("CartPole-v1")
    lengths = []
    for i in range(episodes):
        obs, _ = env.reset(seed=seed + i)
        steps = 0
        while True:
            action = int(probabilities(net, obs).argmax())
            obs, _, terminated, truncated, _ = env.step(action)
            steps += 1
            if terminated or truncated:
                break
        lengths.append(steps)
    return np.array(lengths)


if __name__ == "__main__":
    torch.set_num_threads(1)
    net, lengths = reinforce()
    for start in range(0, len(lengths), 25):
        print(f"episodes {start + 1:3}-{start + 25:3}: average length {np.mean(lengths[start:start + 25]):6.1f}")
    print("greedy, 20 new games:", greedy_lengths(net).mean())
```

`reinforce` gains one input, `baseline=False`, and two lines: when it's `True`, the returns go through `centre_and_scale` before the loss. The default is off, so lesson 4.1's runs give exactly the same results as before.

```check
run ".venv/Scripts/python -m pytest -q tests/test_baseline.py -k option" label="reinforce(baseline=True) centres and scales the returns before the update, repeatably"
```

## Measuring the noise

Create `noise.py`:

```python file=noise.py
import gymnasium as gym
import numpy as np
import torch

from policy import centre_and_scale, choose, discounted_returns, reinforce


def episode_gradient(net, env, gamma=0.99, baseline=False):
    obs, _ = env.reset()
    log_probs, rewards = [], []
    while True:
        action, log_prob = choose(net, obs)
        obs, reward, terminated, truncated, _ = env.step(action)
        log_probs.append(log_prob)
        rewards.append(reward)
        if terminated or truncated:
            break
    returns = discounted_returns(rewards, gamma)
    if baseline:
        returns = centre_and_scale(returns)
    net.zero_grad()
    loss = -(torch.stack(log_probs) * torch.tensor(returns, dtype=torch.float32)).sum()
    loss.backward()
    return torch.cat([p.grad.flatten() for p in net.parameters()]).numpy().copy()


def signal_to_noise(gradients):
    gradients = np.asarray(gradients)
    return float(np.linalg.norm(gradients.mean(axis=0)) / gradients.std(axis=0).mean())


def gradient_spread(net, baseline, episodes=100, seed=1):
    torch.manual_seed(seed)
    env = gym.make("CartPole-v1")
    env.reset(seed=seed)
    return signal_to_noise([episode_gradient(net, env, baseline=baseline) for _ in range(episodes)])


if __name__ == "__main__":
    torch.set_num_threads(1)
    net, lengths = reinforce(episodes=80)
    print(f"after 80 episodes of training, the last 10 games averaged {np.mean(lengths[-10:]):.1f} steps")
    for baseline in (False, True):
        print(f"baseline={baseline!s:5}  signal-to-noise {gradient_spread(net, baseline):.2f}")
```

**What "noise" means here.** Hold the policy fixed and play 100 games. Each game gives its own REINFORCE gradient: one slope for every knob, all 450 of them (the first layer has 4 × 64 + 64 = 320 knobs, the second 64 × 2 + 2 = 130). The **average** of the 100 gradients is the direction training should go. How much single games **disagree** with each other is the noise: one update uses one game, so it gets the direction plus whatever that game's disagreement is.

`signal_to_noise` makes that one number: the length of the average gradient (`np.linalg.norm`: the square root of the sum of the squares, Pythagoras for 450 numbers instead of 2) divided by the average, over knobs, of each knob's spread across games. Worked through with the test's two "games" of two knobs each, [1, 0] and [3, 0]:

```text
average gradient           [2, 0]           its length: √(2² + 0²) = 2
each knob's spread         [1, 0]           (1 and 3 are each 1 from their average; the second knob never varies)
average spread             0.5
signal-to-noise            2 / 0.5 = 4
```

Bigger is better: the update points more reliably the right way.

- **`episode_gradient`** plays one game with `choose`, builds REINFORCE's loss, runs `backward`, and collects every knob's slope into one long array (`torch.cat` joins the flattened slope tensors end to end). `.copy()` matters: the next call's `zero_grad` would otherwise overwrite the numbers.
- **`gradient_spread`** seeds the random generators so both versions see the same games, then measures 100 of them.
- The main block trains for 80 episodes first, so the policy is partly trained (games of about 77 steps), then measures without and with the baseline.

Predict, then run it with `.venv\Scripts\python noise.py`:

```predict
question: Will centring and scaling the returns raise the signal-to-noise ratio of the updates?
choice: Yes: higher
choice: No: about the same or lower
answer: Yes: higher
explain: Higher: 6.68 without the baseline, 10.20 with it, measured on the same 100 games from the same partly trained policy. Each update now points more reliably in the direction the average of many games would. Measured on a brand-new, untrained policy, the difference was much smaller: all its games are short and alike, so there's little for a baseline to remove.
verify: script noise_ratio.py
```

```text
after 80 episodes of training, the last 10 games averaged 76.8 steps
baseline=False  signal-to-noise 6.68
baseline=True   signal-to-noise 10.20
```

**And does it learn better?** Measured on the same 10 seeds as lesson 4.1, 300 episodes each, judged by the greedy score over 20 new games:

| seed | plain REINFORCE | with the baseline |
|---|---|---|
| 0 | 496 | 500 |
| 1 | 500 | 500 |
| 2 | 123 | 265 |
| 3 | 265 | 500 |
| 4 | 69 | 500 |
| 5 | 9 | 9 |
| 6 | 74 | 500 |
| 7 | 9 | 171 |
| 8 | 500 | 500 |
| 9 | 234 | 76 |

With the baseline, 6 of 10 seeds finished at 500, against 2 of 10 without. The averages: 352 ± 64 with the baseline, 228 ± 65 without. With the baseline, the first 500-step game came at episode 76 to 223. A baseline run takes longer (about 39 seconds on average, against 19), only because its games are longer.

**Is that difference real, or luck?** The difference in averages is 124. Each average has a standard error of about 64, so the difference has a standard error of about √(65² + 64²) = 91 (errors of independent measurements add as squares). 124 is about 1.4 times that: suggestive, not conclusive. Ten seeds aren't enough to be sure. That's worth knowing for your paper: report the number of seeds and the error bars, and say "suggests" when the difference is only one or two standard errors.

Two things the baseline didn't fix:

1. **Seed 5 fails either way, at once**: games of 9 steps from the first episode to the last. The policy became certain of one push before it learned anything, and a certain policy never tries the other push, so it never finds out. Lesson 4.3's **entropy bonus** is aimed at exactly this.
2. **One baseline per game.** The game's average return says nothing about *this* position: whether, from here, a return of 60 is good or bad. A baseline that knew the value of each position would judge each move far more fairly. That's the **critic**, next lesson.

```check
run ".venv/Scripts/python -m pytest -q tests/test_baseline.py -k noise" label="signal_to_noise compares the average gradient with how much single games disagree"
run ".venv/Scripts/python -m pytest -q tests/test_baseline.py" label="all lesson 4.2 tests pass"
```

### What you have

A baseline (the game's own average return, with scaling), a proof by numbers that it doesn't bend the average update, a measurement that it makes single updates less noisy (signal-to-noise 6.68 → 10.20), and a 10-seed comparison that suggests it learns more reliably. Next: a baseline for every position, learned by a second head on the network.
