---
title: 2.5 — Judging an Agent Honestly
runtime: python
run: compare.py
---

Last lesson's agent ended its training averaging 469 steps. Is that a good agent? You can't tell yet, for three reasons:

1. **It was still exploring and learning** while those steps were counted. That's a measure of the training, not of what was learned.
2. **It was one agent.** Lesson 1.4 found that agents trained the same way, with different seeds, can end up anywhere from perfect to stuck. One run could be the lucky one.
3. **Without a measure of spread, two averages can't be compared.** If one setting averages 469 and another 499, is the second really better, or would the order swap with different seeds?

This lesson builds the three tools that answer those questions, and uses them to settle one: which step size α should a table agent use on CartPole?

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_judge.py** above.

```python file=tests/test_judge.py provided
# Tests for judge.py and compare.py (lesson 2.5).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_judge.py
import numpy as np
from pytest import approx


def test_evaluate_plays_greedily_without_learning():
    from cartpole_table import train_cartpole
    from judge import evaluate
    agent, env, _ = train_cartpole(30, seed=0)
    agent.epsilon = 0.4
    before = agent.Q.copy()
    lengths = evaluate(agent, env, episodes=5)
    assert len(lengths) == 5
    assert np.array_equal(agent.Q, before), "judging must not teach it"
    assert agent.epsilon == 0.4, "and puts epsilon back afterwards"


def test_evaluate_is_repeatable():
    from cartpole_table import train_cartpole
    from judge import evaluate
    agent, env, _ = train_cartpole(30, seed=0)
    assert np.array_equal(evaluate(agent, env, episodes=5), evaluate(agent, env, episodes=5))


def test_standard_error_of_a_few_numbers():
    from judge import standard_error
    assert standard_error([1, 2, 3, 4, 5]) == approx(np.std([1, 2, 3, 4, 5], ddof=1) / np.sqrt(5))
    assert standard_error([2.0, 4.0]) == approx(1.0)


def test_standard_error_of_identical_numbers_is_zero():
    from judge import standard_error
    assert standard_error([500, 500, 500]) == 0.0


def test_standard_error_shrinks_with_more_runs():
    from judge import standard_error
    assert standard_error([0, 10] * 50) < standard_error([0, 10])


def test_compare_judges_each_seed_once():
    from compare import judge
    scores = judge(dict(alpha=0.2, alpha_end=0.02), seeds=2, episodes=40)
    assert scores.shape == (2,)
```

`agent.Q.copy()` makes a separate copy of the table. Without `.copy()`, `before` would be another name for the **same** array (lesson 1.2's views), and it would change whenever the table did, so the comparison would always pass. `[0, 10] * 50` repeats the list 50 times: 100 numbers, half of them 0 and half 10.

```check
file tests/test_judge.py -- Click "Create provided tests/test_judge.py" above.
```

## Greedy, and on new starts

Create `judge.py`:

```python file=judge.py
import numpy as np

from train import run_episode


def evaluate(agent, env, episodes=20, seed=1000):
    saved = agent.epsilon
    agent.epsilon = 0.0
    lengths = [run_episode(env, agent, learn=False, seed=seed if i == 0 else None) for i in range(episodes)]
    agent.epsilon = saved
    return np.array(lengths)
```

`evaluate` measures what the agent has **learned**, with nothing else mixed in:

- **`epsilon = 0.0`** and **`learn=False`**: no random pushes, and no changes to the table while it's being judged. That's its **greedy policy**, as in lesson 1.4's `greedy_finds_treasure`. `saved` puts ε back afterwards, so judging an agent doesn't change it.
- **`seed=1000`**: training used seeds 0, 1, 2… Judging on starting positions from a different seed checks that the agent works on situations it didn't happen to practise on.
- **20 episodes**, because one greedy episode depends on its starting position.
- The list is built with a **list comprehension**, `[expression for i in range(episodes)]`, Python's one-line way of saying "make a list by doing this for each i".

```check
run ".venv/Scripts/python -m pytest -q tests/test_judge.py -k evaluate" label="evaluate plays greedily without learning, repeatably, and restores epsilon" -- Save agent.epsilon, set it to 0.0, run the episodes with learn=False (seeding only the first), then put epsilon back.
```

## Your turn: how much to trust an average

**Build, on your own:** `standard_error(values)` in `judge.py`.

Say you train 10 agents with different seeds and judge each one. You get 10 scores and their average. If you trained 10 **other** agents, you'd get a somewhat different average. The **standard error** says how far an average of this many runs typically is from the average you'd get with endlessly many: the true one.

It's built from the **standard deviation**, which measures how spread out the scores are. Roughly, it's the typical distance of a score from their mean. For the scores 2 and 4, the mean is 3 and each score is 1 away, so the standard deviation is about 1. NumPy computes it as `values.std(ddof=1)`.

Then: **standard error = standard deviation ÷ √(number of values)**. Dividing by √n is how averaging tames spread. One score could be anywhere in the spread, but in an average of n scores, the high and low ones partly cancel, and the more there are, the more they cancel. With 4 times as many runs, the standard error halves, because √4 = 2.

`ddof=1` means "divide by n − 1 instead of n" inside the standard deviation. The scores are a sample, and their own mean sits closer to them than the true mean does, so dividing by n would understate the spread slightly; n − 1 corrects that. For the test's `[2.0, 4.0]`: squared distances from the mean 3 are 1 and 1; divided by n − 1 = 1 that's 2; √2 = 1.414 is the standard deviation; ÷ √2 gives a standard error of **1.0**.

Write `standard_error(values)`. It should accept a list as well as an array, so start by converting: `np.asarray(values, dtype=float)`.

```hints
nudge: Two NumPy operations and one division. Which two numbers do you need?
concept: The standard deviation, `values.std(ddof=1)`, and the square root of how many values there are, `np.sqrt(len(values))`.
answer: Add to `judge.py`:
~~~python
def standard_error(values):
    values = np.asarray(values, dtype=float)
    return values.std(ddof=1) / np.sqrt(len(values))
~~~
`np.asarray` turns a list into an array, and leaves an array as it is.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_judge.py -k standard" label="standard_error is the sample standard deviation divided by the square root of n" -- values = np.asarray(values, dtype=float); return values.std(ddof=1) / np.sqrt(len(values)).
```

## Ten agents, three step sizes

Now the experiment. Create `compare.py`:

```python file=compare.py
import numpy as np

from cartpole_table import train_cartpole
from judge import evaluate, standard_error

SETTINGS = {
    "step 0.1": dict(alpha=0.1),
    "step 0.5": dict(alpha=0.5),
    "step 0.2 shrinking to 0.02": dict(alpha=0.2, alpha_end=0.02),
}


def judge(settings, seeds=10, episodes=500):
    scores = []
    for seed in range(seeds):
        agent, env, _ = train_cartpole(episodes, seed, **settings)
        scores.append(evaluate(agent, env).mean())
    return np.array(scores)


if __name__ == "__main__":
    for name, settings in SETTINGS.items():
        scores = judge(settings)
        print(f"{name:27} mean {scores.mean():5.1f} +- {standard_error(scores):4.1f}   {np.round(scores).astype(int).tolist()}")
```

- **`dict(alpha=0.1)`** is another way of writing `{"alpha": 0.1}`. **`**settings`** unpacks a dictionary into keyword arguments: `train_cartpole(500, seed, **dict(alpha=0.2, alpha_end=0.02))` is the same call as `train_cartpole(500, seed, alpha=0.2, alpha_end=0.02)`. So each setting is just its list of arguments, kept under a name.
- **`judge`** trains 10 agents per setting, seeds 0 to 9, and gives each one a score: the average of its 20 greedy episodes.
- The printout is **mean ± standard error**, then all ten scores, so you can see the spread behind each mean.

It trains 30 agents, so it takes about two and a half minutes. Predict while it runs:

```predict
question: Which setting will have the best mean score?
choice: step 0.1
choice: step 0.5
choice: step 0.2 shrinking to 0.02
answer: step 0.2 shrinking to 0.02
explain: The shrinking step wins: 499.9 ± 0.1, with every one of the 10 agents at 499 or 500. A fixed 0.1 is good but not reliable, 469.2 ± 30.8: nine agents at 500, and one stuck at 192. A fixed 0.5 is poor, 135.0 ± 47.0, and its scores are all over the place, from 15 to 500.
verify: .venv/Scripts/python -c "from compare import SETTINGS, judge; m = {name: judge(s).mean() for name, s in SETTINGS.items()}; print(max(m, key=m.get))"
```

```text
step 0.1                    mean 469.2 +- 30.8   [500, 500, 500, 500, 500, 500, 500, 192, 500, 500]
step 0.5                    mean 135.0 +- 47.0   [55, 206, 40, 500, 107, 224, 142, 24, 15, 38]
step 0.2 shrinking to 0.02  mean 499.9 +-  0.1   [499, 500, 500, 500, 500, 500, 500, 500, 500, 500]
```

Read the standard errors before the means, and compare each gap with them:

- **Step 0.5 against the shrinking step:** the means differ by 365, more than seven times step 0.5's standard error of 47. Step 0.5 is worse; luck doesn't explain a gap that size.
- **Step 0.1 against the shrinking step:** the means differ by 30.7, which is about **one** standard error of step 0.1's mean (30.8). Ten seeds aren't enough to show that step 0.1 is worse *on average*: another ten might narrow the gap. What they do show is **reliability**: one step-0.1 agent in ten got stuck at 192, and no shrinking-step agent did. To settle the average, you'd train more seeds, and the standard error would shrink like 1 / √n.

Saying "499.9 beats 469.2" without the ± would have claimed more than the data shows. And look at what the single run in lesson 2.4 would have told you: seed 0 with step 0.1 scores 500 here. Judged on that one run, step 0.1 would have looked perfect.

**Why does a shrinking step win?** Go back to lesson 1.3's `nudge`: each update moves the estimate a fraction α of the way to the latest target.

- **α = 0.5** moves halfway each time, so the estimate is mostly the last two or three targets. In CartPole those targets are noisy: one row covers many different states (lesson 2.3), and the same action from the same row can lead to a long survival or a quick fall. With α this big, the table keeps swinging with the latest luck.
- **A fixed α = 0.1** averages over more targets (roughly the last ten or so), which is steadier, but it never stops: late in training, a run of unlucky episodes can still drag a good value down. (Seed 7's agent, the one at 192, failed differently, and lesson 2.6 finds out how.)
- **A shrinking α** learns fast early, when the table is all wrong and big moves help. By the end, at 0.02, each new target only nudges the estimate a little, so the estimate is an average over many experiences, and a few bad episodes can't undo it. It's the running average idea from lesson 1.3 again: when every experience should count equally, the step size must shrink.

One more honest measurement. The same shrinking schedule stretched over **1,000** episodes did *worse*: 423.5 ± 37.0. More training isn't automatically better. The likely cause is again the slots. ε and α now shrink more slowly, so the agent explores more states that need different actions within one row, and the shared values get pulled around for longer. The way to find out would be to test that idea, for example by training longer with more slots. That's next lesson's subject.

```check
run ".venv/Scripts/python -m pytest -q tests/test_judge.py -k compare" label="judge trains and scores one agent per seed"
run ".venv/Scripts/python -m pytest -q tests/test_judge.py" label="all lesson 2.5 tests pass"
```

### What you have

Three habits that every result in this series will follow from now on. Judge greedily, on new starts. Train several agents with different seeds. Report mean ± standard error, and compare gaps with it before believing them. And a table agent that balances CartPole reliably: 499.9 ± 0.1 over 10 seeds. Next lesson changes the table's size, and finds where tables stop working.
