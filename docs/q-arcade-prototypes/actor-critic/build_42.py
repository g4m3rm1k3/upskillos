import json
import os

from build_common import blocks, fence, join, read, write_answer, write_lesson, write_verify

M = json.load(open(os.path.join(os.path.dirname(__file__), "measured.json"), encoding="utf8"))
b = blocks(read("policy.py"))
nb = blocks(read("noise.py"))
tests = read("tests/test_baseline.py")
reinforce_41 = b["reinforce"].replace(", baseline=False):", "):").replace("""        if baseline:
            returns = centre_and_scale(returns)
""", "")
v_centre = join(b["header"], b["make_policy"], b["probabilities"], b["choose"], b["discounted_returns"], b["centre_and_scale"], reinforce_41, b["greedy_lengths"], b["main"])
v_full = read("policy.py")
assert join(b["header"], b["make_policy"], b["probabilities"], b["choose"], b["discounted_returns"], b["centre_and_scale"], b["reinforce"], b["greedy_lengths"], b["main"]) == v_full
write_answer("policy_centre.py", v_centre)
noise_code = read("noise.py")
write_verify("noise_ratio.py", '''
# Does centring and scaling raise the signal-to-noise ratio of REINFORCE's gradient, after 80 episodes of training?
import torch

from noise import gradient_spread
from policy import reinforce

torch.set_num_threads(1)
net, _ = reinforce(episodes=80)
print("Yes: higher" if gradient_spread(net, True) > gradient_spread(net, False) else "No: about the same or lower")
''')

plain, base = M["plain"], M["baseline"]
rows = "\n".join(f"| {s} | {p['greedy20']:.0f} | {q['greedy20']:.0f} |" for s, (p, q) in enumerate(zip(plain, base)))

lesson = f'''
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

{fence("tests/test_baseline.py", tests, provided=True)}

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

{fence("policy.py", v_full)}

`reinforce` gains one input, `baseline=False`, and two lines: when it's `True`, the returns go through `centre_and_scale` before the loss. The default is off, so lesson 4.1's runs give exactly the same results as before.

```check
run ".venv/Scripts/python -m pytest -q tests/test_baseline.py -k option" label="reinforce(baseline=True) centres and scales the returns before the update, repeatably"
```

## Measuring the noise

Create `noise.py`:

{fence("noise.py", noise_code)}

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

Predict, then run it with `.venv\\Scripts\\python noise.py`:

```predict
question: Will centring and scaling the returns raise the signal-to-noise ratio of the updates?
choice: Yes: higher
choice: No: about the same or lower
answer: Yes: higher
explain: {M["noise_explain"]}
verify: script noise_ratio.py
```

```text
{M["noise_output"]}
```

**And does it learn better?** Measured on the same 10 seeds as lesson 4.1, 300 episodes each, judged by the greedy score over 20 new games:

| seed | plain REINFORCE | with the baseline |
|---|---|---|
{rows}

{M["baseline_summary"]}

**Is that difference real, or luck?** The difference in averages is {M["diff"]:.0f}. Each average has a standard error of about 64, so the difference has a standard error of about √(65² + 64²) = 91 (errors of independent measurements add as squares). {M["diff"]:.0f} is about {M["diff"] / 91:.1f} times that: suggestive, not conclusive. Ten seeds aren't enough to be sure. That's worth knowing for your paper: report the number of seeds and the error bars, and say "suggests" when the difference is only one or two standard errors.

Two things the baseline didn't fix:

1. **Seed 5 fails either way, at once**: games of 9 steps from the first episode to the last. The policy became certain of one push before it learned anything, and a certain policy never tries the other push, so it never finds out. Lesson 4.3's **entropy bonus** is aimed at exactly this.
2. **One baseline per game.** The game's average return says nothing about *this* position: whether, from here, a return of 60 is good or bad. A baseline that knew the value of each position would judge each move far more fairly. That's the **critic**, next lesson.

```check
run ".venv/Scripts/python -m pytest -q tests/test_baseline.py -k noise" label="signal_to_noise compares the average gradient with how much single games disagree"
run ".venv/Scripts/python -m pytest -q tests/test_baseline.py" label="all lesson 4.2 tests pass"
```

### What you have

A baseline (the game's own average return, with scaling), a proof by numbers that it doesn't bend the average update, a measurement that it makes single updates less noisy (signal-to-noise {M["noise_plain"]} → {M["noise_base"]}), and a 10-seed comparison that suggests it learns more reliably. Next: a baseline for every position, learned by a second head on the network.
'''
write_lesson("04-02-a-baseline-measured.md", lesson)
print("ok")
