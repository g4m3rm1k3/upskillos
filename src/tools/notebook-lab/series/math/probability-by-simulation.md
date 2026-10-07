# Probability by simulation

A machine makes 2% defective parts. In a box of 50, what is the chance at least one is bad? An inspector checks 5 parts from a batch of 100 that secretly contains 4 defectives: how likely is she to catch the problem? A pump station has two pumps in parallel: how much more reliable is it than one? These are probability questions, and there are two ways to answer them. One is to reason exactly, with rules for combining chances. The other is to **simulate**: make the computer play out the random process many thousands of times and count. Simulation needs almost no theory, works when the exact reasoning is hard, and gives a check on any formula. This lesson uses both and plays them against each other.

This lesson covers:

- probability as long-run frequency, and random number generators;
- how simulation error shrinks with the number of trials;
- the complement rule: the chance of "at least one";
- sampling without replacement, checked against exact counting;
- independence, and the reliability of series and parallel systems.

## Probability as long-run frequency

::: math
\[ P(A) \approx \frac{\text{number of times } A \text{ happens}}{n}, \qquad \text{typical error} \approx \sqrt{\frac{p(1 - p)}{n}} \]
- the frequency approaches the probability as the number of trials $n$ grows
- error shrinks like $1/\sqrt{n}$: 100 times the trials for one more decimal place
In code: `(rolls == 6).mean()` with `rolls = rng.integers(1, 7, size=n)`
:::


The probability of an event is the fraction of times it happens in a long run of repetitions. A fair die shows a six with probability 1/6: roll it 600 times and you expect about 100 sixes, though rarely exactly 100. A computer simulates randomness with a **pseudo-random number generator**: a deterministic algorithm whose output passes statistical tests for randomness. Seeding it makes a run reproducible, which matters for checking work.

How close does the frequency get to the true probability? Simulation's error shrinks like 1/√n: a hundred times as many trials buys only ten times the accuracy. Predict before running: with 100 rolls the frequency of sixes can easily be off by 0.03. How far off with a million?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(2026)
for n in [100, 10_000, 1_000_000]:
    rolls = rng.integers(1, 7, size=n)
    freq = (rolls == 6).mean()
    print(f"{n:>9} rolls: frequency of six {freq:.5f}, error {freq - 1 / 6:+.5f}, typical error 1/√n scale {math.sqrt((1 / 6) * (5 / 6) / n):.5f}")

rolls = rng.integers(1, 7, size=5000)
running = np.cumsum(rolls == 6) / np.arange(1, 5001)
fig, ax = plt.subplots(figsize=(6, 3))
ax.plot(running)
ax.axhline(1 / 6, color="red", linestyle="--", label="1/6")
ax.set_xscale("log")
ax.set_xlabel("number of rolls")
ax.set_ylabel("frequency of six")
ax.legend()
plt.show()
```

```output
      100 rolls: frequency of six 0.14000, error -0.02667, typical error 1/√n scale 0.03727
    10000 rolls: frequency of six 0.17010, error +0.00343, typical error 1/√n scale 0.00373
  1000000 rolls: frequency of six 0.16648, error -0.00018, typical error 1/√n scale 0.00037
```

`rng.integers(1, 7, size=n)` draws n whole numbers from 1 to 6 (the upper limit is excluded). `(rolls == 6).mean()` is the fraction of sixes, since `True` counts as 1. The typical error, √(p(1 − p)/n), is the **standard error** of a frequency, explained in the statistics lessons.

The frequency wanders widely at first and settles towards 1/6; with a million rolls it is within about 0.0004. The error column tracks the 1/√n scale. That slow convergence is the price of simulation: getting one more correct decimal place takes a hundred times as many trials.

## At least one defective

::: math
\[ P(\text{at least one}) = 1 - P(\text{none}) = 1 - (1 - p)^n \]
- complement rule: $P(A) = 1 - P(\text{not } A)$
- independent events multiply: $P(\text{none}) = 0.98^{50}$
In code: `1 - (1 - p) ** box` against `(rng.random((100_000, box)) < p).any(axis=1).mean()`
:::


Parts come off a machine with a 2% chance of each being defective, independently. For a box of 50, the chance that **at least one** is defective is awkward to count directly (exactly one, or two, or ...). Its **complement**, "none defective", is easy: each part is good with probability 0.98, and for independent events the probabilities multiply, so P(none) = 0.98⁵⁰. Then

\[ P(\text{at least one}) = 1 - 0.98^{50} \]

The **complement rule**, P(A) = 1 − P(not A), turns many hard problems into easy ones. Predict before running: is the chance of at least one bad part in 50 closer to 10%, 35% or 65%?

```python type
p, box = 0.02, 50
exact = 1 - (1 - p) ** box
boxes = rng.random((100_000, box)) < p
simulated = boxes.any(axis=1).mean()
print(f"P(at least one defective in {box}): exact {exact:.4f}, simulated {simulated:.4f}")
print(f"average defectives per box: simulated {boxes.sum(axis=1).mean():.3f}, expected n·p = {box * p}")
for n in [10, 50, 100, 200]:
    print(f"box of {n:>3}: {1 - (1 - p) ** n:.1%}")
```

```output
P(at least one defective in 50): exact 0.6358, simulated 0.6365
average defectives per box: simulated 0.999, expected n·p = 1.0
box of  10: 18.3%
box of  50: 63.6%
box of 100: 86.7%
box of 200: 98.2%
```

`rng.random((100_000, 50))` fills a table with uniform numbers in [0, 1); each entry below 0.02 marks a defective part, one row per box. `any(axis=1)` asks, for each row, whether any part is defective.

About 63.6% of boxes contain a bad part, although each part is 98% good. The average box holds exactly one defective (50 × 0.02), yet over a third of boxes hold none, which balances the boxes holding two or more. Small probabilities applied many times add up: with 200 parts per box, 98% of boxes contain a defective.

## Sampling without replacement

::: math
\[ \binom{n}{k} = \frac{n!}{k!\,(n - k)!}, \qquad P(\text{detect}) = 1 - \frac{\binom{N - D}{n}}{\binom{N}{n}} \]
- $N$: batch size; $D$: defectives in it; $n$: sample size, drawn without replacement
- all samples of size $n$ are equally likely, so probability is a ratio of counts
In code: `1 - math.comb(N - D, n) / math.comb(N, n)`, checked by `rng.choice(batch, size=n, replace=False)`
:::


An inspector draws 5 parts from a batch of 100, of which 4 are defective, and rejects the batch if any sampled part is defective. The draws are **not** independent: after removing a good part, the remaining batch is slightly more defective. Exact counting handles this. The number of ways to choose k items from n is the **binomial coefficient** C(n, k) = n!/(k!(n − k)!), `math.comb(n, k)`. All samples of 5 are equally likely, so

\[ P(\text{no defective in the sample}) = \frac{C(96, 5)}{C(100, 5)} \]

Predict before running: does sampling 5 catch the problem more or less than half the time? How large a sample gives a 90% chance?

```python type
N, D = 100, 4

def detect_exact(N, D, n):
    return 1 - math.comb(N - D, n) / math.comb(N, n)

def detect_by_loop(N, D, n, trials, rng):
    batch = np.zeros(N, dtype=bool)
    batch[:D] = True
    hits = 0
    for _ in range(trials):
        sample = rng.choice(batch, size=n, replace=False)
        hits += sample.any()
    return hits / trials

print(f"sample of 5: exact {detect_exact(N, D, 5):.4f}, simulated {detect_by_loop(N, D, 5, 20_000, rng):.4f}")
print(f"if draws were independent (with replacement): {1 - 0.96 ** 5:.4f}")
n90 = next(n for n in range(1, N + 1) if detect_exact(N, D, n) >= 0.9)
print(f"smallest sample with a 90% chance of detection: {n90}")
```

```output
sample of 5: exact 0.1881, simulated 0.1875
if draws were independent (with replacement): 0.1846
smallest sample with a 90% chance of detection: 44
```

`rng.choice(batch, size=n, replace=False)` draws n different items, like taking parts out of a box without putting them back.

A sample of 5 catches the bad batch only about 19% of the time; inspection by small samples is weak against low defect rates. Treating the draws as independent gives nearly the same answer here (18.5%), because removing 5 parts barely changes a batch of 100. To reach 90% detection the inspector must check 44 parts, almost half the batch. Exact counting and simulation agree, which is the point: either one checks the other.

## Independence and reliability

::: math
\[ R_\text{series} = R_1 R_2 \cdots, \qquad R_\text{parallel} = 1 - (1 - R_1)(1 - R_2)\cdots \]
- independent: $P(A \text{ and } B) = P(A)\,P(B)$
- the station: $R = R_\text{ctrl}\,\big(1 - (1 - R_\text{pump})^2\big)$
In code: `R_ctrl * (1 - (1 - R_pump) ** 2)`, and `ctrl_ok & pumps_ok.any(axis=1)` in simulation
:::


Two events are **independent** when one happening does not change the chance of the other; then P(A and B) = P(A) P(B). Reliability engineering is built on this. A **series** system (every component must work, like links in a chain) works with probability R₁R₂...: always less reliable than its weakest part. A **parallel** system (it works if any component works, like redundant pumps) fails only if all fail: R = 1 − (1 − R₁)(1 − R₂)....

A pumping station needs its controller **and** at least one of two pumps. The controller is 99% reliable over a year and each pump 90%. Predict before running: is the station more or less reliable than a single pump?

```python type
R_ctrl, R_pump = 0.99, 0.90
exact = R_ctrl * (1 - (1 - R_pump) ** 2)
trials = 200_000
ctrl_ok = rng.random(trials) < R_ctrl
pumps_ok = rng.random((trials, 2)) < R_pump
works = ctrl_ok & pumps_ok.any(axis=1)
print(f"station reliability: exact {exact:.4f}, simulated {works.mean():.4f}")
print(f"single pump with the controller: {R_ctrl * R_pump:.4f}")
print(f"three pumps in parallel: {R_ctrl * (1 - (1 - R_pump) ** 3):.4f}  (the controller limits it to at most {R_ctrl})")
```

```output
station reliability: exact 0.9801, simulated 0.9800
single pump with the controller: 0.8910
three pumps in parallel: 0.9890  (the controller limits it to at most 0.99)
```

Each row of `pumps_ok` is one simulated year for the two pumps; the station works when the controller works and either pump does.

Two parallel pumps lift the pump stage from 90% to 99%, and the whole station reaches 98.0%, against 89.1% with one pump. A third pump adds little, because the series controller now caps the system at 99%: redundancy helps only where the weakness is. The independence assumption is the weak point in practice: two pumps fed by one power supply, or of one faulty batch, fail together, and real reliability analyses look hard for such **common-cause** failures.

::: challenge At least one [easy]
Write `at_least_one(p, n)`, the probability that at least one of n independent trials with probability p each succeeds, rounded to 6 decimal places. Raise `ValueError` unless 0 ≤ p ≤ 1 and n is a non-negative integer (n = 0 gives 0.0). Then write `trials_needed(p, target)`: the smallest n for which `at_least_one(p, n)` (unrounded) is at least `target`, raising `ValueError` unless 0 < p ≤ 1 and 0 < target < 1. Compute it directly with logarithms rather than by counting up (it may be large): n is the ceiling of ln(1 − target) / ln(1 − p), but check the neighbouring values to guard against rounding.

```python starter
def at_least_one(p, n):
    return p * n

def trials_needed(p, target):
    return 1

print(at_least_one(0.02, 50), trials_needed(0.02, 0.9))
```

```python solution
def _prob(p, n):
    return 1 - (1 - p) ** n

def at_least_one(p, n):
    if not 0 <= p <= 1 or not isinstance(n, int) or n < 0:
        raise ValueError("need 0 <= p <= 1 and a whole number n >= 0")
    return round(_prob(p, n), 6)

def trials_needed(p, target):
    if not 0 < p <= 1 or not 0 < target < 1:
        raise ValueError("need 0 < p <= 1 and 0 < target < 1")
    if p == 1:
        return 1
    n = max(1, math.ceil(math.log(1 - target) / math.log(1 - p)))
    while n > 1 and _prob(p, n - 1) >= target:
        n -= 1
    while _prob(p, n) < target:
        n += 1
    return n

print(at_least_one(0.02, 50), trials_needed(0.02, 0.9))
```

```python test
for _n in ["at_least_one", "trials_needed"]:
    assert _n in dir(), f"Define {_n}."
assert at_least_one(0.02, 50) == 0.635830 and at_least_one(0.5, 1) == 0.5 and at_least_one(0.3, 0) == 0.0, f"Got {at_least_one(0.02, 50)}."
assert at_least_one(1, 3) == 1.0 and at_least_one(0, 100) == 0.0, "Certain and impossible."
for _bad in [(-0.1, 5), (1.1, 5), (0.5, -1), (0.5, 2.5)]:
    try:
        at_least_one(*_bad)
        assert False, f"at_least_one{_bad} should raise ValueError."
    except ValueError:
        pass
assert trials_needed(0.02, 0.9) == 114 and trials_needed(0.5, 0.75) == 2 and trials_needed(0.5, 0.74) == 2, f"Got {trials_needed(0.02, 0.9)}."
assert abs(trials_needed(1e-9, 0.5) - 693147181) <= 100, f"Rare events need many trials (about 693 million; floating point blurs the last digits); got {trials_needed(1e-9, 0.5)}."
assert trials_needed(1, 0.99) == 1, "A certain event needs one trial."
for _bad in [(0, 0.5), (0.1, 1), (0.1, 0)]:
    try:
        trials_needed(*_bad)
        assert False, f"trials_needed{_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: The complement rule turns 'at least one' into '1 minus none', and a logarithm turns it around into how many tries are needed."
```

Hint: P(at least one) = 1 − (1 − p)ⁿ. Setting it equal to the target and taking logarithms gives n = ln(1 − target)/ln(1 − p); round up, then nudge n down or up while the condition says so.
:::

::: challenge Inspection plans [medium]
Write `detect_exact(N, D, n)`, the probability that a sample of n drawn without replacement from N items containing D defectives includes at least one defective, using `math.comb`; raise `ValueError` unless 0 ≤ D ≤ N and 0 ≤ n ≤ N. Write `detect_simulated(N, D, n, trials, seed)`: simulate the sampling `trials` times with `np.random.default_rng(seed)` and return the fraction of samples with a defective. It must handle 200,000 trials quickly, so avoid a Python loop over the trials: instead loop over the n draws, handling all trials at once with arrays. Before draw k (counting from 0) each trial has `bad` defectives among N − k remaining parts, so the draw is defective when `rng.random(trials) < bad / (N - k)`; after it, reduce `bad` where a defective was drawn and record which trials have found one. Then write `sample_size_for(N, D, confidence)`, the smallest n with `detect_exact` at least `confidence` (raise `ValueError` if no sample size reaches it).

```python starter
def detect_exact(N, D, n):
    return 1 - (1 - D / N) ** n

def detect_simulated(N, D, n, trials, seed):
    return detect_exact(N, D, n)

def sample_size_for(N, D, confidence):
    return N

print(detect_exact(100, 4, 5))
```

```python solution
def detect_exact(N, D, n):
    if not (0 <= D <= N and 0 <= n <= N):
        raise ValueError("need 0 <= D <= N and 0 <= n <= N")
    return 1 - math.comb(N - D, n) / math.comb(N, n)

def detect_simulated(N, D, n, trials, seed):
    rng = np.random.default_rng(seed)
    bad = np.full(trials, float(D))
    found = np.zeros(trials, dtype=bool)
    for k in range(n):
        hit = rng.random(trials) < bad / (N - k)
        found |= hit
        bad -= hit
    return float(found.mean())

def sample_size_for(N, D, confidence):
    for n in range(N + 1):
        if detect_exact(N, D, n) >= confidence:
            return n
    raise ValueError("no sample size reaches that confidence")

print(detect_exact(100, 4, 5))
```

```python test
import time as _time
for _n in ["detect_exact", "detect_simulated", "sample_size_for"]:
    assert _n in dir(), f"Define {_n}."
assert abs(detect_exact(100, 4, 5) - (1 - math.comb(96, 5) / math.comb(100, 5))) < 1e-12, "Without replacement, by counting."
assert detect_exact(10, 0, 5) == 0.0 and detect_exact(10, 3, 8) == 1.0 and detect_exact(10, 3, 0) == 0.0, "No defectives; a sample too large to miss them; no sample."
for _bad in [(10, 11, 2), (10, 2, 11), (10, -1, 2)]:
    try:
        detect_exact(*_bad)
        assert False, f"detect_exact{_bad} should raise ValueError."
    except ValueError:
        pass
_start = _time.perf_counter()
_s = detect_simulated(100, 4, 5, 200_000, 7)
_el = _time.perf_counter() - _start
_e = detect_exact(100, 4, 5)
assert abs(_s - _e) < 4 * math.sqrt(_e * (1 - _e) / 200_000), f"Simulation {_s:.4f} should be within a few standard errors of {_e:.4f}."
assert detect_simulated(100, 4, 5, 1000, 3) == detect_simulated(100, 4, 5, 1000, 3), "The same seed gives the same result."
assert _el < 3, f"200,000 trials took {_el:.1f} s: avoid a Python loop over the trials."
assert sample_size_for(100, 4, 0.9) == 44 and sample_size_for(100, 4, 0.5) == 16 and sample_size_for(50, 1, 0.5) == 25, f"Got {sample_size_for(100, 4, 0.9)}."
try:
    sample_size_for(100, 0, 0.5)
    assert False, "With no defectives, detection is impossible: raise ValueError."
except ValueError:
    pass
"SUCCESS: Counting and simulation agree, and both say the same uncomfortable thing: catching a 4% defect rate reliably needs a big sample."
```

Hint: The probability of a clean sample is C(N − D, n)/C(N, n). For the simulation, keep two arrays over the trials, `bad` (defectives still in the batch) and `found`, and update them draw by draw: `hit = rng.random(trials) < bad / (N - k)`, then `found |= hit` and `bad -= hit`.
:::

::: challenge System reliability [hard]
Describe a system as nested tuples: a number is a component's reliability; `("series", [parts])` works only if every part works; `("parallel", [parts])` works if any part works; parts may themselves be nested systems. Write `reliability(system)`, the exact reliability, assuming every component fails independently, rounded to 6 decimal places. Raise `ValueError` for a component reliability outside [0, 1], an unknown kind, or an empty list of parts. Then write `simulate(system, trials, seed)`: draw all the random numbers at once with `np.random.default_rng(seed).random((trials, number_of_components))`, where component j (counting components in the order they appear when reading the description left to right) works in trial i when `draws[i, j] < R_j`; evaluate the system for every trial with array operations, and return the fraction of trials in which it works. Finally write `weakest_upgrade(system)`: try replacing each component, one at a time, with a perfect one (reliability 1), and return the 0-based index (in reading order) of the component whose upgrade gives the largest system reliability; the earliest index wins ties.

```python starter
def reliability(system):
    return 1.0

def simulate(system, trials, seed):
    return 1.0

def weakest_upgrade(system):
    return 0

station = ("series", [0.99, ("parallel", [0.9, 0.9])])
print(reliability(station))
```

```python solution
def _check(system):
    if isinstance(system, (int, float)):
        if not 0 <= system <= 1:
            raise ValueError(f"reliability {system} is outside [0, 1]")
        return
    kind, parts = system
    if kind not in ("series", "parallel"):
        raise ValueError(f"unknown kind {kind!r}")
    if not parts:
        raise ValueError("a system needs at least one part")
    for part in parts:
        _check(part)

def _exact(system):
    if isinstance(system, (int, float)):
        return float(system)
    kind, parts = system
    values = [_exact(p) for p in parts]
    if kind == "series":
        return math.prod(values)
    return 1 - math.prod(1 - v for v in values)

def reliability(system):
    _check(system)
    return round(_exact(system), 6)

def _leaves(system):
    if isinstance(system, (int, float)):
        return [float(system)]
    return [leaf for part in system[1] for leaf in _leaves(part)]

def _evaluate(system, draws, counter):
    if isinstance(system, (int, float)):
        works = draws[:, counter[0]] < system
        counter[0] += 1
        return works
    kind, parts = system
    results = [_evaluate(p, draws, counter) for p in parts]
    out = results[0]
    for r in results[1:]:
        out = (out & r) if kind == "series" else (out | r)
    return out

def simulate(system, trials, seed):
    _check(system)
    rng = np.random.default_rng(seed)
    draws = rng.random((trials, len(_leaves(system))))
    return float(_evaluate(system, draws, [0]).mean())

def _replace(system, index, counter):
    if isinstance(system, (int, float)):
        counter[0] += 1
        return 1.0 if counter[0] - 1 == index else system
    kind, parts = system
    return (kind, [_replace(p, index, counter) for p in parts])

def weakest_upgrade(system):
    _check(system)
    n = len(_leaves(system))
    gains = [_exact(_replace(system, i, [0])) for i in range(n)]
    return max(range(n), key=lambda i: (gains[i], -i))

station = ("series", [0.99, ("parallel", [0.9, 0.9])])
print(reliability(station))
```

```python test
for _n in ["reliability", "simulate", "weakest_upgrade"]:
    assert _n in dir(), f"Define {_n}."
_station = ("series", [0.99, ("parallel", [0.9, 0.9])])
assert reliability(_station) == 0.9801, f"The lesson's station; got {reliability(_station)}."
assert reliability(0.7) == 0.7 and reliability(("series", [0.9, 0.8, 0.5])) == 0.36 and reliability(("parallel", [0.5, 0.5, 0.5])) == 0.875, "Series and parallel."
_bridge = ("parallel", [("series", [0.95, 0.9]), ("series", [0.8, ("parallel", [0.7, 0.6])])])
assert reliability(_bridge) == round(1 - (1 - 0.855) * (1 - 0.8 * 0.88), 6), "Nested systems."
for _bad in [1.2, ("series", []), ("chain", [0.5]), ("parallel", [0.5, -0.1])]:
    try:
        reliability(_bad)
        assert False, f"reliability({_bad!r}) should raise ValueError."
    except ValueError:
        pass
_s = simulate(_station, 200_000, 11)
assert abs(_s - 0.9801) < 0.002, f"Simulation {_s} should be close to 0.9801."
assert simulate(_bridge, 1000, 5) == simulate(_bridge, 1000, 5), "Same seed, same result."
_d = np.random.default_rng(12).random((10, 3))
assert simulate(("series", [0.5, 0.5, 0.5]), 10, 12) == float(((_d[:, 0] < 0.5) & (_d[:, 1] < 0.5) & (_d[:, 2] < 0.5)).mean()), "One random number per component per trial, in reading order."
assert weakest_upgrade(_station) == 0, "Upgrading the controller helps the station most."
assert weakest_upgrade(("series", [0.9, 0.8, 0.95])) == 1 and weakest_upgrade(("parallel", [0.6, 0.6])) == 0, "The weakest series link; ties go to the earliest."
assert weakest_upgrade(_bridge) == 1, f"Got {weakest_upgrade(_bridge)}."
"SUCCESS: Series multiplies reliabilities, parallel multiplies unreliabilities, and the best upgrade is usually the single point of failure."
```

Hint: Recurse on the description: a number is a leaf; for "series" multiply the parts' reliabilities; for "parallel" compute 1 − Π(1 − Rᵢ). For simulation, draw a table of random numbers with one column per leaf and evaluate recursively, keeping a counter of which column the next leaf uses, combining columns with `&` (series) and `|` (parallel).
:::

## What you learned

- Probability is long-run frequency. Simulated frequencies converge to it with error proportional to 1/√n, so each extra digit costs 100 times the trials.
- The complement rule, P(at least one) = 1 − P(none), with independent probabilities multiplying, handles "at least one" problems; small chances add up over many tries.
- Sampling without replacement is counted with binomial coefficients; simulation (random orderings) checks the formula.
- Independent events multiply. Series systems multiply reliabilities; parallel systems multiply unreliabilities; redundancy helps only where the weakness is.
- Simulation and exact reasoning check each other; when they disagree, one of them is wrong.

The next lesson describes random quantities by their distributions: random variables.
