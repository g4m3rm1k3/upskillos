# Updating beliefs: Bayes' theorem

A defective bearing turns up at final inspection. Three machines make bearings: the big new line makes half of them but rarely errs, an older line makes a third, and a worn machine makes the rest and errs often. Which machine most likely made this one? A vibration monitor raises an alarm. It almost never misses a real fault, yet most of its alarms turn out to be false. Why? Both questions reverse a probability: we know how likely the evidence is given each cause, and we want how likely each cause is given the evidence. **Bayes' theorem** does that reversal, and it is the mathematics of learning from data: start with a belief, observe, update. This lesson derives it from counting, shows the base-rate trap that catches even experts, chains updates as evidence accumulates, and estimates an unknown defect rate from inspection data.

This lesson covers:

- conditional probability, and the law of total probability;
- Bayes' theorem: from P(evidence | cause) to P(cause | evidence);
- the base-rate fallacy, with natural frequencies;
- updating step by step, and the odds form with likelihood ratios;
- a whole distribution of belief: estimating a defect rate on a grid.

## Conditional probability and total probability

::: math
\[ P(A \mid B) = \frac{P(A \text{ and } B)}{P(B)}, \qquad P(D) = \sum_i P(D \mid M_i)\,P(M_i) \]
- $M_i$: machine $i$; $P(M_i)$: its share of output; $P(D \mid M_i)$: its defect rate
- the overall rate is the share-weighted average of the rates
In code: `(share * defect_rate).sum()`
:::


The **conditional probability** P(A | B), "A given B", is the probability of A among the cases where B happens: P(A | B) = P(A and B) / P(B). Counting makes it concrete. Of 10,000 bearings, the new line makes 5,000 with 1% defective (50 bad), the old line 3,000 with 2% (60 bad), the worn machine 2,000 with 5% (100 bad). The overall defect rate is the weighted sum, the **law of total probability**:

\[ P(D) = \sum_i P(D \mid M_i)\,P(M_i) \]

Predict before running: what fraction of all bearings is defective, and which machine made most of the defective ones?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

machines = ["new line", "old line", "worn machine"]
share = np.array([0.5, 0.3, 0.2])
defect_rate = np.array([0.01, 0.02, 0.05])
p_defect = (share * defect_rate).sum()
print(f"overall defect rate P(D) = {p_defect:.4f}")
counts = 10_000 * share * defect_rate
for m, c in zip(machines, counts):
    print(f"of 10,000 bearings, {c:.0f} defective ones come from the {m}")

rng = np.random.default_rng(45)
which = rng.choice(3, size=1_000_000, p=share)
bad = rng.random(1_000_000) < defect_rate[which]
print("simulated P(D):", bad.mean(), "  simulated share of defectives by machine:", np.round(np.bincount(which[bad], minlength=3) / bad.sum(), 4))
```

```output
overall defect rate P(D) = 0.0210
of 10,000 bearings, 50 defective ones come from the new line
of 10,000 bearings, 60 defective ones come from the old line
of 10,000 bearings, 100 defective ones come from the worn machine
simulated P(D): 0.021128   simulated share of defectives by machine: [0.2333 0.2887 0.478 ]
```

`rng.choice(3, p=share)` picks a machine for each simulated bearing with the given probabilities, and each is then defective with its machine's rate.

The overall defect rate is 2.1%. Of every 210 defective bearings, 50 come from the new line, 60 from the old and 100 from the worn machine: although the worn machine makes only a fifth of the output, it makes almost half of the defects. The simulation agrees.

## Bayes' theorem

::: math
\[ P(M_i \mid D) = \frac{P(D \mid M_i)\,P(M_i)}{\sum_j P(D \mid M_j)\,P(M_j)} \]
- prior $P(M_i)$ times likelihood $P(D \mid M_i)$, divided by the total so the posteriors sum to 1
- new independent evidence: multiply by its likelihoods and renormalise again
In code: `bayes(prior, likelihood)` returns `joint / joint.sum()`
:::


The count above already did the reversal: P(worn | defective) = 100/210. In general, writing P(M and D) two ways, P(M | D) P(D) = P(D | M) P(M), gives **Bayes' theorem**:

\[ P(M_i \mid D) = \frac{P(D \mid M_i)\,P(M_i)}{\sum_j P(D \mid M_j)\,P(M_j)} \]

The **prior** P(Mᵢ) is the belief before the evidence (each machine's share); the **likelihood** P(D | Mᵢ) is how well each cause explains the evidence; the **posterior** P(Mᵢ | D) is the updated belief. The denominator just makes the posteriors sum to 1. Predict before running: a second inspection finds the bearing also has a surface flaw, which the worn machine produces on 30% of its defectives, the others on 5%. How do the odds shift?

```python type
def bayes(prior, likelihood):
    joint = np.asarray(prior) * np.asarray(likelihood)
    return joint / joint.sum()

post = bayes(share, defect_rate)
for m, p in zip(machines, post):
    print(f"P({m} | defective) = {p:.3f}")
flaw = np.array([0.05, 0.05, 0.30])
post2 = bayes(post, flaw)
print("after also seeing the surface flaw:", {m: round(float(p), 3) for m, p in zip(machines, post2)})
```

```output
P(new line | defective) = 0.238
P(old line | defective) = 0.286
P(worn machine | defective) = 0.476
after also seeing the surface flaw: {'new line': 0.07, 'old line': 0.085, 'worn machine': 0.845}
```

The posterior from the first piece of evidence becomes the prior for the second.

Given only that the bearing is defective, the worn machine is the likeliest source at 47.6%. The surface flaw, six times more common on its defectives, pushes it to 84.5%. Each piece of evidence multiplies the beliefs by its likelihoods and renormalises; the order in which independent evidence arrives does not matter.

## The base-rate fallacy

::: math
\[ P(\text{fault} \mid \text{alarm}) = \frac{s\,p}{s\,p + (1 - c)(1 - p)} \]
- $s$: sensitivity; $c$: specificity; $p$: prevalence (the base rate)
- when $p$ is small, false alarms from healthy bearings outnumber true ones
In code: `sens * prevalence / (sens * prevalence + (1 - spec) * (1 - prevalence))`
:::


A vibration monitor detects a developing bearing fault with probability 99% (its **sensitivity**) and stays silent on a healthy bearing with probability 95% (its **specificity**). Only 0.5% of bearings are actually developing a fault. When the alarm sounds, how likely is a real fault? Intuition says about 95%. Bayes says otherwise, because the 5% false-alarm rate applies to the huge number of healthy bearings. **Natural frequencies** make it obvious: of 10,000 bearings, 50 are faulty and 49.5 of those trigger the alarm; 9,950 are healthy and 497.5 of those trigger it too. Predict before running: what fraction of alarms is real?

```python type
prevalence, sens, spec = 0.005, 0.99, 0.95
p_fault_given_alarm = sens * prevalence / (sens * prevalence + (1 - spec) * (1 - prevalence))
print(f"P(fault | alarm) = {p_fault_given_alarm:.3f}")
print(f"of 10,000 bearings: {10_000 * prevalence * sens:.1f} true alarms, {10_000 * (1 - prevalence) * (1 - spec):.1f} false alarms")
for prev in [0.005, 0.05, 0.2, 0.5]:
    p = sens * prev / (sens * prev + (1 - spec) * (1 - prev))
    print(f"prevalence {prev:>5.1%}: an alarm means a real fault with probability {p:.1%}")
```

```output
P(fault | alarm) = 0.090
of 10,000 bearings: 49.5 true alarms, 497.5 false alarms
prevalence  0.5%: an alarm means a real fault with probability 9.0%
prevalence  5.0%: an alarm means a real fault with probability 51.0%
prevalence 20.0%: an alarm means a real fault with probability 83.2%
prevalence 50.0%: an alarm means a real fault with probability 95.2%
```

The denominator is the total probability of an alarm: true alarms plus false ones.

Only about 9% of alarms are real: 49.5 true alarms drown in 497.5 false ones. The test is excellent, yet when the condition is rare, most positives are false. This is the **base-rate fallacy**, ignoring the prior, and it matters in medical screening, fraud detection and maintenance alike. The fix is not a better guess but a better prior or more evidence: where faults are common (20% prevalence), the same alarm is 83% reliable.

## Odds and accumulating evidence

::: math
\[ \text{odds} = \frac{P}{1 - P}, \qquad \text{posterior odds} = \text{prior odds} \times \text{LR}, \qquad \text{LR} = \frac{P(E \mid \text{fault})}{P(E \mid \text{no fault})} \]
- independent evidence multiplies the odds, so log-odds add
- back to probability: $P = \dfrac{\text{odds}}{1 + \text{odds}}$
In code: `odds *= lr` per alarm, then `odds / (1 + odds)`
:::


Repeated updates are simplest in **odds** form. The odds of an event are P/(1 − P). Bayes' theorem becomes: posterior odds = prior odds × **likelihood ratio**, where the likelihood ratio of the evidence is P(evidence | fault)/P(evidence | no fault). For the alarm it is 0.99/0.05 = 19.8. Independent pieces of evidence multiply their ratios, so their **logarithms add**: each alarm adds log₁₀ 19.8 ≈ 1.3 to the log-odds. Predict before running: how many independent alarms (from separate sensors) are needed before a fault is more likely than not?

```python type
lr = sens / (1 - spec)
odds = prevalence / (1 - prevalence)
print(f"prior odds {odds:.4f}, likelihood ratio of an alarm {lr:.1f} (log10 {math.log10(lr):.2f})")
for alarms in range(1, 5):
    odds *= lr
    print(f"after {alarms} alarm(s): odds {odds:8.3f}, probability {odds / (1 + odds):.3f}")
quiet_lr = (1 - sens) / spec
print(f"a silent sensor has likelihood ratio {quiet_lr:.4f}: it divides the odds by {1 / quiet_lr:.0f}")
```

```output
prior odds 0.0050, likelihood ratio of an alarm 19.8 (log10 1.30)
after 1 alarm(s): odds    0.099, probability 0.090
after 2 alarm(s): odds    1.970, probability 0.663
after 3 alarm(s): odds   39.007, probability 0.975
after 4 alarm(s): odds  772.339, probability 0.999
a silent sensor has likelihood ratio 0.0105: it divides the odds by 95
```

A silent sensor is evidence too: its likelihood ratio, P(silent | fault)/P(silent | healthy), is tiny.

One alarm takes the probability to 9%, a second (from an independent sensor) to 66%, a third to 97.5%. Two agreeing sensors make a fault more likely than not. A silent sensor divides the odds by about 95. Evidence adds up on a log scale, the same logarithm that turned multiplication into addition in the logarithms lesson; Bayesian classifiers and many machine-learning models score evidence exactly this way.

## Beliefs about a number

::: math
\[ p(r \mid \text{data}) \propto p(r)\cdot r^3(1 - r)^{197} \]
- a grid of candidate rates $r$; the binomial coefficient cancels on normalising
- the 95% credible interval runs between the 2.5% and 97.5% points of the cumulative posterior
In code: `belief = prior * likelihood`, `belief /= belief.sum()`, `cdf = np.cumsum(belief)`
:::


Bayes' theorem works just as well when the unknown is a number rather than a choice among causes. A new process has an unknown defect rate r. Before any data, every rate between 0 and 10% seems equally plausible. Inspection finds 3 defectives in 200 parts. The likelihood of that, for each candidate r, is binomial: C(200, 3) r³(1 − r)¹⁹⁷. On a **grid** of candidate rates, the posterior is prior × likelihood, renormalised, a whole curve of belief. From it come a best estimate and a **credible interval**: the range that contains the true rate with 95% probability given the data. Predict before running: is the rate likely to be below the 2.5% contract limit?

```python type
grid = np.linspace(0, 0.10, 2001)
prior = np.ones_like(grid)
likelihood = grid ** 3 * (1 - grid) ** 197
belief = prior * likelihood
belief /= belief.sum()
cdf = np.cumsum(belief)
low, high = grid[np.searchsorted(cdf, 0.025)], grid[np.searchsorted(cdf, 0.975)]
print(f"most probable rate {grid[np.argmax(belief)]:.4f}, mean {np.sum(grid * belief):.4f}")
print(f"95% credible interval {low:.4f} to {high:.4f}")
print(f"P(rate < 2.5%) = {belief[grid < 0.025].sum():.3f}")

fig, ax = plt.subplots(figsize=(6, 3))
ax.plot(grid * 100, belief / (grid[1] - grid[0]) / 100)
ax.axvline(2.5, color="red", linestyle="--", label="contract limit")
ax.set_xlabel("defect rate (%)")
ax.set_ylabel("belief density (per %)")
ax.legend()
plt.show()
```

```output
most probable rate 0.0150, mean 0.0198
95% credible interval 0.0054 to 0.0430
P(rate < 2.5%) = 0.741
```

The constant C(200, 3) cancels in the normalisation, so it is left out. `np.searchsorted(cdf, 0.025)` finds where the cumulative belief reaches 2.5%.

The most probable rate is 1.5% (3/200), with a mean of 2%, and the 95% credible interval runs from about 0.5% to 4.3%: three defectives are not much data. There is about a 74% probability that the rate is under the 2.5% limit: likely, but far from certain. That is a direct, usable answer to the question a manager actually asks, and more inspection would narrow the curve.

::: challenge Posterior probabilities [easy]
Write `total_probability(priors, likelihoods)`: Σ P(E | Hᵢ) P(Hᵢ), as a plain float. Write `posterior(priors, likelihoods)`: the list of posterior probabilities (plain floats summing to 1). Raise `ValueError` from both if the lists differ in length, the priors do not sum to 1 within 1e-9, any value is outside [0, 1], or (for `posterior`) the total probability of the evidence is 0. Then write `most_likely(names, priors, likelihoods)`: the name with the highest posterior (the first one on a tie).

```python starter
def total_probability(priors, likelihoods):
    return 0.0

def posterior(priors, likelihoods):
    return list(priors)

def most_likely(names, priors, likelihoods):
    return names[0]

print(posterior([0.5, 0.3, 0.2], [0.01, 0.02, 0.05]))
```

```python solution
def _check(priors, likelihoods):
    if len(priors) != len(likelihoods):
        raise ValueError("priors and likelihoods must match")
    if abs(sum(priors) - 1) > 1e-9:
        raise ValueError("priors must sum to 1")
    if any(not 0 <= v <= 1 for v in list(priors) + list(likelihoods)):
        raise ValueError("probabilities must be between 0 and 1")

def total_probability(priors, likelihoods):
    _check(priors, likelihoods)
    return float(sum(p * l for p, l in zip(priors, likelihoods)))

def posterior(priors, likelihoods):
    total = total_probability(priors, likelihoods)
    if total == 0:
        raise ValueError("the evidence is impossible under every hypothesis")
    return [float(p * l / total) for p, l in zip(priors, likelihoods)]

def most_likely(names, priors, likelihoods):
    post = posterior(priors, likelihoods)
    return names[max(range(len(post)), key=lambda i: (post[i], -i))]

print(posterior([0.5, 0.3, 0.2], [0.01, 0.02, 0.05]))
```

```python test
for _n in ["total_probability", "posterior", "most_likely"]:
    assert _n in dir(), f"Define {_n}."
assert abs(total_probability([0.5, 0.3, 0.2], [0.01, 0.02, 0.05]) - 0.021) < 1e-12, "Law of total probability."
assert type(total_probability([1.0], [0.3])) is float, "Return a plain Python float (wrap NumPy results with float(...))."
_p = posterior([0.5, 0.3, 0.2], [0.01, 0.02, 0.05])
assert np.allclose(_p, [50 / 210, 60 / 210, 100 / 210]) and abs(sum(_p) - 1) < 1e-12 and all(type(_x) is float for _x in _p), f"Got {_p}."
assert np.allclose(posterior(_p, [0.05, 0.05, 0.30]), np.array([50 * 0.05, 60 * 0.05, 100 * 0.30]) / np.sum([50 * 0.05, 60 * 0.05, 100 * 0.30])), "Chained updates."
assert most_likely(["new", "old", "worn"], [0.5, 0.3, 0.2], [0.01, 0.02, 0.05]) == "worn" and most_likely(["a", "b"], [0.5, 0.5], [0.3, 0.3]) == "a", "Highest posterior; ties to the first."
for _bad in [([0.5, 0.5], [0.1]), ([0.5, 0.6], [0.1, 0.1]), ([0.5, 0.5], [0.1, 1.2]), ([0.5, 0.5], [0, 0])]:
    try:
        posterior(*_bad)
        assert False, f"posterior{_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Multiply priors by likelihoods and renormalise: the worn machine, a fifth of the output, is the likeliest culprit."
```

Hint: Total probability is Σ priorᵢ × likelihoodᵢ; each posterior is its term divided by that total.
:::

::: challenge Alarms and the base rate [medium]
Write `alarm_posterior(prevalence, sensitivity, specificity)`: the probability of a real fault given one alarm, rounded to 4 decimal places; raise `ValueError` unless all three are in [0, 1] and the probability of an alarm is positive. Write `likelihood_ratio(sensitivity, specificity, alarm=True)`: for an alarm, sensitivity / (1 − specificity); for silence, (1 − sensitivity) / specificity (raise `ValueError` on a zero denominator). Then write `alarms_needed(prevalence, sensitivity, specificity, target)`: the smallest number of independent alarms after which the probability of a fault reaches at least `target`, updating in odds form; raise `ValueError` if the likelihood ratio is not above 1 (alarms would never help) or more than 1,000 alarms would be needed.

```python starter
def alarm_posterior(prevalence, sensitivity, specificity):
    return sensitivity

def likelihood_ratio(sensitivity, specificity, alarm=True):
    return 1.0

def alarms_needed(prevalence, sensitivity, specificity, target):
    return 1

print(alarm_posterior(0.005, 0.99, 0.95))
```

```python solution
def alarm_posterior(prevalence, sensitivity, specificity):
    if any(not 0 <= v <= 1 for v in (prevalence, sensitivity, specificity)):
        raise ValueError("probabilities must be in [0, 1]")
    p_alarm = sensitivity * prevalence + (1 - specificity) * (1 - prevalence)
    if p_alarm == 0:
        raise ValueError("an alarm is impossible")
    return round(sensitivity * prevalence / p_alarm, 4)

def likelihood_ratio(sensitivity, specificity, alarm=True):
    num, den = (sensitivity, 1 - specificity) if alarm else (1 - sensitivity, specificity)
    if den == 0:
        raise ValueError("the likelihood ratio is infinite")
    return num / den

def alarms_needed(prevalence, sensitivity, specificity, target):
    lr = likelihood_ratio(sensitivity, specificity, True)
    if lr <= 1:
        raise ValueError("alarms carry no evidence for a fault")
    odds = prevalence / (1 - prevalence)
    target_odds = target / (1 - target)
    for k in range(0, 1001):
        if odds >= target_odds:
            return k
        odds *= lr
    raise ValueError("more than 1000 alarms would be needed")

print(alarm_posterior(0.005, 0.99, 0.95))
```

```python test
for _n in ["alarm_posterior", "likelihood_ratio", "alarms_needed"]:
    assert _n in dir(), f"Define {_n}."
assert alarm_posterior(0.005, 0.99, 0.95) == 0.0905, f"Only about 9% of alarms are real; got {alarm_posterior(0.005, 0.99, 0.95)}."
assert alarm_posterior(0.2, 0.99, 0.95) == 0.8319 and alarm_posterior(0.5, 0.9, 0.9) == 0.9, "Higher prevalence, more reliable alarms."
for _bad in [(1.2, 0.9, 0.9), (0, 0, 1)]:
    try:
        alarm_posterior(*_bad)
        assert False, f"alarm_posterior{_bad} should raise ValueError."
    except ValueError:
        pass
assert abs(likelihood_ratio(0.99, 0.95) - 19.8) < 1e-9 and abs(likelihood_ratio(0.99, 0.95, alarm=False) - 0.01 / 0.95) < 1e-12, "Alarm and silence ratios."
try:
    likelihood_ratio(0.99, 1.0)
    assert False, "A perfect specificity gives an infinite ratio: raise ValueError."
except ValueError:
    pass
assert alarms_needed(0.005, 0.99, 0.95, 0.5) == 2 and alarms_needed(0.005, 0.99, 0.95, 0.95) == 3 and alarms_needed(0.6, 0.99, 0.95, 0.5) == 0, "Odds multiply by 19.8 per alarm; already above target needs 0."
for _bad in [(0.01, 0.5, 0.5, 0.9), (1e-12, 0.51, 0.5, 0.999999)]:
    try:
        alarms_needed(*_bad)
        assert False, f"alarms_needed{_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Rare faults make lone alarms unreliable, but independent alarms multiply the odds: two agreeing sensors usually settle it."
```

Hint: P(alarm) = sens × prev + (1 − spec)(1 − prev). In odds form, start from prev/(1 − prev), multiply by the likelihood ratio once per alarm, and compare with target/(1 − target).
:::

::: challenge Estimating a defect rate [hard]
Write `rate_posterior(defects, inspected, grid, prior=None)`: on a NumPy grid of candidate rates in [0, 1], return the posterior as a NumPy array summing to 1, proportional to prior × r^defects (1 − r)^(inspected − defects); a missing prior means uniform. Compute the likelihood with logarithms (subtract the maximum before exponentiating) so that large counts do not underflow. Raise `ValueError` if defects > inspected, either is negative, or the posterior is zero everywhere. Write `credible_interval(grid, post, mass=0.95)`: the central interval, from the grid value where the cumulative posterior first reaches (1 − mass)/2 to where it first reaches (1 + mass)/2, as a tuple of plain floats. Then write `prob_below(grid, post, limit)`: the posterior probability that the rate is below `limit`, as a plain float.

```python starter
def rate_posterior(defects, inspected, grid, prior=None):
    return np.full(len(grid), 1 / len(grid))

def credible_interval(grid, post, mass=0.95):
    return (float(grid[0]), float(grid[-1]))

def prob_below(grid, post, limit):
    return 0.5

g = np.linspace(0, 0.1, 2001)
print(credible_interval(g, rate_posterior(3, 200, g)))
```

```python solution
def rate_posterior(defects, inspected, grid, prior=None):
    if defects < 0 or inspected < 0 or defects > inspected:
        raise ValueError("need 0 <= defects <= inspected")
    r = np.asarray(grid, dtype=float)
    with np.errstate(divide="ignore", invalid="ignore"):
        logl = defects * np.log(r) + (inspected - defects) * np.log1p(-r)
    if defects == 0:
        logl = np.where(r == 0, 0.0, logl)
    if inspected - defects == 0:
        logl = np.where(r == 1, 0.0, logl)
    logl = np.where(np.isnan(logl), -np.inf, logl)
    if not np.any(np.isfinite(logl)):
        raise ValueError("the data are impossible on this grid")
    like = np.exp(logl - np.max(logl[np.isfinite(logl)]))
    p = like * (np.ones_like(r) if prior is None else np.asarray(prior, dtype=float))
    if p.sum() == 0:
        raise ValueError("the posterior is zero everywhere")
    return p / p.sum()

def credible_interval(grid, post, mass=0.95):
    cdf = np.cumsum(post)
    lo = np.asarray(grid)[np.searchsorted(cdf, (1 - mass) / 2)]
    hi = np.asarray(grid)[min(np.searchsorted(cdf, (1 + mass) / 2), len(cdf) - 1)]
    return (float(lo), float(hi))

def prob_below(grid, post, limit):
    return float(np.asarray(post)[np.asarray(grid) < limit].sum())

g = np.linspace(0, 0.1, 2001)
print(credible_interval(g, rate_posterior(3, 200, g)))
```

```python test
for _n in ["rate_posterior", "credible_interval", "prob_below"]:
    assert _n in dir(), f"Define {_n}."
_g = np.linspace(0, 0.1, 2001)
_p = rate_posterior(3, 200, _g)
assert isinstance(_p, np.ndarray) and abs(_p.sum() - 1) < 1e-12 and abs(_g[np.argmax(_p)] - 0.015) < 1e-9, "Peak at 3/200."
_lo, _hi = credible_interval(_g, _p)
assert 0.003 < _lo < 0.007 and 0.039 < _hi < 0.047 and type(_lo) is float, f"Got {(_lo, _hi)}."
assert 0.70 < prob_below(_g, _p, 0.025) < 0.78 and type(prob_below(_g, _p, 0.025)) is float, "About 74% below the 2.5% limit."
_big = rate_posterior(300, 20000, _g)
assert abs(_g[np.argmax(_big)] - 0.015) < 1e-4 and np.all(np.isfinite(_big)), "Large counts must not underflow: use logarithms."
_l2, _h2 = credible_interval(_g, _big)
assert _h2 - _l2 < 0.005, "A hundred times more data narrows the interval roughly tenfold."
_g01 = np.linspace(0, 1, 1001)
_p0 = rate_posterior(0, 50, _g01)
assert _g01[np.argmax(_p0)] == 0.0 and abs(_p0.sum() - 1) < 1e-12, "Zero defects: the most probable rate is 0."
_prior = np.where(_g < 0.02, 2.0, 1.0)
assert prob_below(_g, rate_posterior(3, 200, _g, _prior), 0.025) > prob_below(_g, _p, 0.025), "A prior favouring low rates raises the probability below the limit."
for _bad in [(5, 3), (-1, 10)]:
    try:
        rate_posterior(*_bad, _g)
        assert False, f"rate_posterior{_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: A grid of candidate rates, weighted by how well each explains the data, gives a full curve of belief and a direct answer to 'is it below the limit?'"
```

Hint: The log-likelihood is d log r + (n − d) log(1 − r); use `np.log1p(-r)` for log(1 − r), handle the grid ends where a logarithm is −∞ (r = 0 with d > 0, r = 1 with n − d > 0) by leaving those cells at zero belief; when d = 0 the term d log r is 0 even at r = 0 (and likewise for n − d = 0 at r = 1), so use `np.where` (or `scipy.special.xlogy`) rather than letting 0 × (−∞) become NaN; subtract the largest finite value, exponentiate, multiply by the prior and normalise.
:::

## What you learned

- P(A | B) = P(A and B)/P(B); the law of total probability sums P(E | Hᵢ)P(Hᵢ) over all causes.
- Bayes' theorem reverses conditioning: posterior ∝ likelihood × prior, normalised over the causes.
- When the condition is rare, even an accurate test produces mostly false positives (the base-rate fallacy); natural frequencies make this obvious.
- In odds form each independent piece of evidence multiplies the odds by its likelihood ratio, so log-odds add up.
- Beliefs about a number update the same way on a grid, giving a credible interval and direct probabilities such as P(rate < limit).

The next lesson finds the directions in which measurements vary most: principal component analysis.
