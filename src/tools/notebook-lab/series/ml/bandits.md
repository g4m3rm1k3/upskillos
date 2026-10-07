# Multi-armed bandits

Imagine a row of ten slot machines (in old slang, "one-armed bandits"). Each pays out a random amount when you pull its arm, and each has a different average payout, but you do not know which is best. You have 1,000 pulls. Every pull earns money, and every pull also teaches you something about the machine you chose. Pull only the machine that has looked best so far, and you may never discover that another is better. Spend too many pulls testing the others, and you waste money on machines you already suspect are worse.

This is the **multi-armed bandit** problem, reinforcement learning stripped to its core: there are actions and rewards, but no states and no consequences beyond the immediate reward. That leaves one difficulty in pure form, the **exploration–exploitation trade-off**. It is also directly useful: choosing which version of a web page, advert or treatment to show next, while still learning which is best, is a bandit problem. This lesson builds the standard testbed and compares four strategies: **greedy**, **ε-greedy**, **optimistic initial values** and **upper confidence bounds**, then meets **Thompson sampling**, a Bayesian approach.

## The testbed

Each of 10 arms has a true mean payout, drawn from a standard normal; each pull of arm a pays its mean plus noise with standard deviation 1. The agent keeps an **estimate** Q(a) of each arm's mean, the average of the rewards it has received from that arm. Instead of storing every reward, the average can be updated each time with the **incremental mean** rule:

\[
Q(a) \leftarrow Q(a) + \frac{1}{N(a)}\big(r - Q(a)\big)
\]

where N(a) is the number of times arm a has been pulled, including this one. Read it as: move the estimate a fraction of the way towards the new reward, a fraction that shrinks as evidence accumulates. This "estimate += step × (target − estimate)" pattern returns in every learning method of the coming lessons.

A strategy's performance is judged over many independent bandit problems, since any single run is luck-dominated. The simulation below runs **2,000 bandit problems at once**, as rows of NumPy arrays, for 1,000 pulls each.

## Greedy and ε-greedy

The **greedy** strategy always pulls the arm with the highest estimate. Its flaw: an arm that has a couple of unlucky early pulls gets a low estimate and may never be tried again, even if it is the best. **ε-greedy** fixes this crudely: with a small probability ε, pull a **random** arm instead; otherwise act greedily. Every arm keeps being sampled occasionally, so every estimate eventually becomes accurate. Before running, predict: in what fraction of the 2,000 problems will pure greedy end up pulling the best arm, and will ε-greedy do much better?

```python type
import numpy as np

def run_bandits(method, runs=2000, steps=1000, k=10, epsilon=0.1, c=2.0, initial=0.0, seed=0):
    rng = np.random.default_rng(seed)
    true_means = rng.normal(0, 1, (runs, k))
    best = true_means.argmax(axis=1)
    Q = np.full((runs, k), initial)
    N = np.zeros((runs, k))
    rows = np.arange(runs)
    rewards, optimal = np.zeros(steps), np.zeros(steps)
    for t in range(steps):
        if method == "ucb":
            bonus = c * np.sqrt(np.log(t + 1) / np.maximum(N, 1e-12))
            action = np.where(N == 0, np.inf, Q + bonus).argmax(axis=1)
        else:
            greedy = (Q + rng.random(Q.shape) * 1e-9).argmax(axis=1)
            explore = rng.random(runs) < epsilon if method == "epsilon" else np.zeros(runs, dtype=bool)
            action = np.where(explore, rng.integers(0, k, runs), greedy)
        reward = rng.normal(true_means[rows, action], 1.0)
        N[rows, action] += 1
        Q[rows, action] += (reward - Q[rows, action]) / N[rows, action]
        rewards[t], optimal[t] = reward.mean(), (action == best).mean()
    regret = true_means.max(axis=1).mean() * steps - rewards.sum()
    return rewards, optimal, regret

for name, settings in [("greedy", dict(method="greedy")), ("epsilon-greedy 0.1", dict(method="epsilon", epsilon=0.1)),
                       ("epsilon-greedy 0.01", dict(method="epsilon", epsilon=0.01))]:
    rewards, optimal, regret = run_bandits(**settings)
    print(f"{name:<20} last 100 pulls: average reward {rewards[-100:].mean():.2f}, best arm chosen {optimal[-100:].mean():.0%}; total regret {regret:.0f}")
```

```output
greedy               last 100 pulls: average reward 1.04, best arm chosen 36%; total regret 501
epsilon-greedy 0.1   last 100 pulls: average reward 1.37, best arm chosen 80%; total regret 234
epsilon-greedy 0.01  last 100 pulls: average reward 1.29, best arm chosen 58%; total regret 351
```

Each row of `Q` and `N` belongs to one bandit problem, so `Q[rows, action]` picks, in every row at once, the estimate of the arm chosen there. The tiny random amount added before `argmax` breaks ties at random (all estimates start equal, and plain `argmax` would always pick arm 0). **Regret** is the total reward lost compared with always pulling the best arm: the cost of not knowing.

The greedy strategy settles on the best arm in only about 36% of problems: it locks onto whichever arm looked good early. ε-greedy with ε = 0.1 finds the best arm about 80% of the time, earning more per pull and losing less than half as much in total regret. With ε = 0.01 it explores ten times less: it learns more slowly (about 58% best arm by the end), but in the very long run it would waste less, since it pulls random arms only 1% of the time once its estimates are good. How much to explore depends on how long you will be playing.

## Optimism and confidence bounds

Random exploration is wasteful: ε-greedy keeps trying arms it is already sure are bad. Two cleverer ideas:

- **Optimistic initial values**: start every estimate absurdly high, say Q = 5 when real means are rarely above 2. A greedy agent then tries an arm, is "disappointed" by its real reward, and moves on to the next still-optimistic arm. Every arm gets tried several times before the estimates settle, with no randomness at all. It is a simple trick that only helps at the start.
- **Upper confidence bound** (UCB) selection: pull the arm with the highest **optimistic estimate**, its average plus a bonus for uncertainty:

\[
a = \arg\max_a \left( Q(a) + c\sqrt{\frac{\ln t}{N(a)}} \right)
\]

An arm pulled rarely (small N) has a large bonus and gets tried; one pulled often has a small bonus and is judged mostly on its average. The ln t term slowly raises everyone's bonus over time, so no arm is abandoned for ever. Arms never pulled get an infinite bonus and are tried first. UCB embodies "optimism in the face of uncertainty": prefer actions that **might** be best. Before running, predict which of these two will do best.

```python type
import numpy as np

def run_bandits(method, runs=2000, steps=1000, k=10, epsilon=0.1, c=2.0, initial=0.0, seed=0):
    rng = np.random.default_rng(seed)
    true_means = rng.normal(0, 1, (runs, k))
    best = true_means.argmax(axis=1)
    Q = np.full((runs, k), initial)
    N = np.zeros((runs, k))
    rows = np.arange(runs)
    rewards, optimal = np.zeros(steps), np.zeros(steps)
    for t in range(steps):
        if method == "ucb":
            bonus = c * np.sqrt(np.log(t + 1) / np.maximum(N, 1e-12))
            action = np.where(N == 0, np.inf, Q + bonus).argmax(axis=1)
        else:
            greedy = (Q + rng.random(Q.shape) * 1e-9).argmax(axis=1)
            explore = rng.random(runs) < epsilon if method == "epsilon" else np.zeros(runs, dtype=bool)
            action = np.where(explore, rng.integers(0, k, runs), greedy)
        reward = rng.normal(true_means[rows, action], 1.0)
        N[rows, action] += 1
        Q[rows, action] += (reward - Q[rows, action]) / N[rows, action]
        rewards[t], optimal[t] = reward.mean(), (action == best).mean()
    regret = true_means.max(axis=1).mean() * steps - rewards.sum()
    return rewards, optimal, regret

for name, settings in [("epsilon-greedy 0.1", dict(method="epsilon", epsilon=0.1)),
                       ("optimistic, Q starts at 5", dict(method="greedy", initial=5.0)),
                       ("UCB, c = 2", dict(method="ucb", c=2.0))]:
    rewards, optimal, regret = run_bandits(**settings)
    print(f"{name:<26} last 100 pulls: average reward {rewards[-100:].mean():.2f}, best arm chosen {optimal[-100:].mean():.0%}; total regret {regret:.0f}")
```

```output
epsilon-greedy 0.1         last 100 pulls: average reward 1.37, best arm chosen 80%; total regret 234
optimistic, Q starts at 5  last 100 pulls: average reward 1.42, best arm chosen 70%; total regret 136
UCB, c = 2                 last 100 pulls: average reward 1.49, best arm chosen 86%; total regret 148
```

In UCB, `np.maximum(N, 1e-12)` avoids dividing by zero for unpulled arms, whose scores `np.where` then replaces with infinity.

Both clever strategies earn more and lose less than ε-greedy. Optimistic greedy picks the best arm less often by the end (about 70%, against ε-greedy's 80%), yet it has the lowest total regret, about 136, because its forced early tour of all the arms is efficient and it then stops exploring. UCB chooses the best arm most often by the end (about 86%) and earns the most per pull, with total regret about 148, against about 234 for ε-greedy. UCB also comes with a guarantee: its regret grows only logarithmically with the number of pulls, which is the best possible rate.

## Thompson sampling

A Bayesian approach, from the last part of the series, handles exploration naturally. Keep a **posterior** for each arm's mean. Each turn, draw one sample from each arm's posterior and pull the arm whose sample is highest. An arm with a wide posterior sometimes produces a high sample and gets tried; an arm confidently known to be poor almost never does. Exploration fades automatically as the posteriors sharpen. This is **Thompson sampling**, dating from 1933, and one of the most effective bandit strategies in practice. For payouts that are 0 or 1 (a click or no click), each arm's posterior is a Beta distribution updated by counting successes and failures, exactly as in the Bayesian inference lesson; you will implement it in the last challenge.

## Beyond bandits

Bandits have no states: pulling an arm does not change the machines. Full reinforcement learning adds the consequence that actions change the situation, so a good action now must also lead somewhere good. The next lesson formalises that with Markov decision processes and the Bellman equations, and the exploration methods here (ε-greedy above all) come along to every later algorithm.

::: challenge The incremental mean [easy]
Write `incremental_means(rewards)` returning a list of the running averages after each reward, computed with the incremental rule Q ← Q + (r − Q)/n (starting from Q = 0), **without** summing the list again at each step. The result should match the ordinary running average.

```python starter
def incremental_means(rewards):
    return []

print(incremental_means([2.0, 4.0, 0.0, 6.0]))
```

```python solution
def incremental_means(rewards):
    Q, means = 0.0, []
    for n, r in enumerate(rewards, start=1):
        Q += (r - Q) / n
        means.append(Q)
    return means

print(incremental_means([2.0, 4.0, 0.0, 6.0]))
```

```python test
import numpy as _np
assert "incremental_means" in dir(), "Keep the function's name as incremental_means."
assert _np.allclose(incremental_means([2.0, 4.0, 0.0, 6.0]), [2.0, 3.0, 2.0, 3.0]), "The running averages of [2, 4, 0, 6] are [2, 3, 2, 3]."
_r = _np.random.default_rng(0).normal(size=200)
assert _np.allclose(incremental_means(list(_r)), _np.cumsum(_r) / _np.arange(1, 201)), "Wrong on a long random list."
assert "sum(" not in _source and "mean(" not in _source, "Use the incremental update rather than summing or averaging the list."
"SUCCESS: The average, kept up to date in constant time and memory: estimate += (target − estimate) / n."
```

Hint: Keep `Q` and update it with `Q += (r - Q) / n`, where `n` counts the rewards so far (`enumerate(rewards, start=1)` gives it).
:::

::: challenge Tracking a moving target [medium]
The incremental mean weights every past reward equally. If an arm's payout **drifts** over time, old rewards mislead. Replacing 1/n with a **constant** step size α gives an estimate that forgets the past exponentially: Q ← Q + α(r − Q).

Write `track(rewards, alpha)` returning the list of estimates after each reward (starting from Q = 0), using step size `alpha`, or 1/n when `alpha` is `None`. Then, for the starter's drifting arm (its true mean takes a random walk), store in `error_average` and `error_constant` the mean absolute difference between the estimates and the true means over the last 5,000 of 10,000 steps, for the sample average and for α = 0.1.

```python starter
import numpy as np

def track(rewards, alpha):
    return [0.0] * len(rewards)

rng = np.random.default_rng(2)
true_mean = np.cumsum(rng.normal(0, 0.01, 10000))
rewards = true_mean + rng.normal(0, 1, 10000)
error_average = 0.0
error_constant = 0.0
print(error_average, error_constant)
```

```python solution
import numpy as np

def track(rewards, alpha):
    Q, estimates = 0.0, []
    for n, r in enumerate(rewards, start=1):
        step = 1 / n if alpha is None else alpha
        Q += step * (r - Q)
        estimates.append(Q)
    return estimates

rng = np.random.default_rng(2)
true_mean = np.cumsum(rng.normal(0, 0.01, 10000))
rewards = true_mean + rng.normal(0, 1, 10000)
error_average = np.mean(np.abs(np.array(track(rewards, None))[5000:] - true_mean[5000:]))
error_constant = np.mean(np.abs(np.array(track(rewards, 0.1))[5000:] - true_mean[5000:]))
print(error_average, error_constant)
```

```python test
import numpy as _np
assert "track" in dir(), "Keep the function's name as track."
assert _np.allclose(track([2.0, 4.0, 0.0], None), [2.0, 3.0, 2.0]), "With alpha None, track should give the running averages."
assert _np.allclose(track([1.0, 1.0, 1.0], 0.5), [0.5, 0.75, 0.875]), "With alpha 0.5 from Q = 0 and rewards of 1: 0.5, 0.75, 0.875."
_g = _np.random.default_rng(2)
_tm = _np.cumsum(_g.normal(0, 0.01, 10000))
_rw = _tm + _g.normal(0, 1, 10000)
def _tr(rs, a):
    q, out = 0.0, []
    for n, r in enumerate(rs, start=1):
        q += (1 / n if a is None else a) * (r - q); out.append(q)
    return _np.array(out)
_ea = _np.mean(_np.abs(_tr(_rw, None)[5000:] - _tm[5000:]))
_ec = _np.mean(_np.abs(_tr(_rw, 0.1)[5000:] - _tm[5000:]))
assert _np.isclose(error_average, _ea) and _np.isclose(error_constant, _ec), "Compute both errors over the last 5,000 steps, as mean absolute differences from the true means."
assert error_constant < error_average, "On a drifting arm, the constant step size should track better."
f"SUCCESS: On a drifting arm the sample average lags far behind (error {_ea:.2f}); a constant step size follows the drift (error {_ec:.2f}). Most RL methods use a constant step size for exactly this reason: what they estimate keeps changing."
```

Hint: The only difference between the two cases is the step: `1 / n` or `alpha`. Convert the list to an array to subtract the true means.
:::

::: challenge Thompson sampling [medium]
Write `thompson(true_probs, steps, seed)` for arms that pay 1 with probability `true_probs[a]` and 0 otherwise. Give each arm a Beta(1, 1) prior, stored as arrays of successes + 1 and failures + 1. Each step, using `rng = np.random.default_rng(seed)`: draw one sample per arm with `rng.beta(alpha, beta)` (vectors in, vector out), pull the arm with the largest sample, draw its reward with `rng.random() < true_probs[arm]`, and update that arm's counts. Return the array of pull counts per arm.

Then run it on the starter's three arms (true click rates 4%, 5% and 7%) for 5,000 steps with seed 0, and store the fraction of pulls that went to the best arm in `best_share`.

```python starter
import numpy as np

def thompson(true_probs, steps, seed):
    return np.zeros(len(true_probs), dtype=int)

true_probs = np.array([0.04, 0.05, 0.07])
counts = thompson(true_probs, 5000, 0)
best_share = 0.0
print(counts, best_share)
```

```python solution
import numpy as np

def thompson(true_probs, steps, seed):
    rng = np.random.default_rng(seed)
    k = len(true_probs)
    alpha, beta = np.ones(k), np.ones(k)
    pulls = np.zeros(k, dtype=int)
    for _ in range(steps):
        arm = int(np.argmax(rng.beta(alpha, beta)))
        reward = rng.random() < true_probs[arm]
        alpha[arm] += reward
        beta[arm] += 1 - reward
        pulls[arm] += 1
    return pulls

true_probs = np.array([0.04, 0.05, 0.07])
counts = thompson(true_probs, 5000, 0)
best_share = counts[2] / counts.sum()
print(counts, best_share)
```

```python test
import numpy as _np
assert "thompson" in dir(), "Keep the function's name as thompson."
def _ref(tp, steps, seed):
    g = _np.random.default_rng(seed); k = len(tp); a, b = _np.ones(k), _np.ones(k); p = _np.zeros(k, dtype=int)
    for _ in range(steps):
        arm = int(_np.argmax(g.beta(a, b))); r = g.random() < tp[arm]
        a[arm] += r; b[arm] += 1 - r; p[arm] += 1
    return p
_tp = _np.array([0.2, 0.5, 0.3])
assert _np.array_equal(_np.asarray(thompson(_tp, 300, 4)), _ref(_tp, 300, 4)), "Your pull counts differ from the expected ones. Each step: rng.beta(alpha, beta) for all arms, argmax, then rng.random() < p for the reward, then update that arm's alpha (success) or beta (failure)."
_c = _ref(_np.array([0.04, 0.05, 0.07]), 5000, 0)
assert _np.array_equal(_np.asarray(counts), _c), "counts should be thompson(true_probs, 5000, 0)."
assert _np.isclose(best_share, _c[2] / _c.sum()), "best_share should be the best arm's pulls divided by all pulls."
f"SUCCESS: With click rates of only 4%, 5% and 7%, Thompson sampling sent {best_share:.0%} of 5,000 pulls to the best arm, exploring exactly as much as its uncertainty required."
```

Hint: Initialise `alpha` and `beta` as arrays of ones. A reward of `True` adds 1 to `alpha[arm]`; `1 - reward` adds 1 to `beta[arm]` when it is `False`.
:::

## What you learned

- A multi-armed bandit has actions and immediate rewards but no states; it isolates the exploration–exploitation trade-off.
- Estimate each arm's mean with the incremental rule Q ← Q + (r − Q)/N; with a drifting target, use a constant step size α instead.
- Greedy play can lock onto a poor arm (best arm in about 36% of problems). ε-greedy explores at random a fraction ε of the time (about 80% with ε = 0.1).
- Optimistic initial values force early exploration without randomness; UCB adds an uncertainty bonus c√(ln t / N(a)) and found the best arm about 86% of the time, with logarithmic regret.
- Regret measures the reward lost to not knowing the best arm.
- Thompson sampling draws from each arm's posterior and pulls the best draw, exploring exactly as much as uncertainty warrants.

The next lesson adds what bandits lack: states that change with every action. Markov decision processes describe such worlds, and the Bellman equations relate the value of a state to the values of the states that follow it.
