# Probability by simulation

Machine learning is full of uncertainty. Data is noisy: two houses with identical features sell for different prices. Predictions are uncertain: a good classifier says "this email is spam with probability 0.93", not just "spam". Training itself is random: data is shuffled, and starting parameters are chosen at random. **Probability** is the mathematics of uncertainty, and you need its basic ideas to understand what models predict and how far to trust them.

This lesson teaches probability the most intuitive way there is: by **simulating** random experiments thousands of times with NumPy and counting what happens. Every rule is first discovered by simulation and then stated as a formula. The lesson ends with Bayes' rule, the most important formula in the subject, through an example whose answer surprises almost everyone, including many doctors.

## Probability as a long-run fraction

A random **experiment** is anything with an uncertain result: flipping a coin, rolling a die, picking a customer. Each possible result is an **outcome**, and a set of outcomes you care about is an **event**, such as "the die shows an even number". The **probability** of an event is a number from 0 (impossible) to 1 (certain) measuring how likely it is.

One useful way to understand probability: it is the fraction of times the event happens if you repeat the experiment a very large number of times. Here is the running fraction of heads as a coin is flipped 5,000 times. Predict what the curve will do.

```python type
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(3)
flips = rng.integers(0, 2, size=5000)
running = np.cumsum(flips) / np.arange(1, 5001)

fig, ax = plt.subplots()
ax.plot(running)
ax.axhline(0.5, color="gray", ls="--")
ax.set_xscale("log")
ax.set_xlabel("number of flips")
ax.set_ylabel("fraction of heads so far")
ax.set_title("The fraction settles towards 0.5")
plt.show()
```

`np.cumsum` gives running totals (the cumulative sum), and dividing by 1, 2, 3, ... gives the running fraction. Early on the fraction swings wildly; after thousands of flips it hugs 0.5. That settling is called the **law of large numbers**, and it is why simulation works: simulate enough times, and the fraction you count gets as close as you like to the true probability. The x-axis uses a logarithmic scale so the early, wild part of the curve is visible too.

## Simulating experiments with NumPy

With arrays, you can run a hundred thousand experiments in one line and count the ones where an event happened, using boolean masks. What is the probability that two dice add up to 7? Make a guess before running the cell.

```python type
import numpy as np

rng = np.random.default_rng(0)
n = 200_000
die1 = rng.integers(1, 7, size=n)
die2 = rng.integers(1, 7, size=n)
total = die1 + die2
print("simulated P(total = 7):", (total == 7).mean())
print("exact:                 ", 6 / 36)
```

```output
simulated P(total = 7): 0.16797
exact:                  0.16666666666666666
```

The exact answer comes from counting. There are 6 × 6 = 36 equally likely pairs of faces, and 6 of them add to 7: (1, 6), (2, 5), (3, 4), (4, 3), (5, 2), (6, 1). When all outcomes are equally likely, the probability of an event is simply

\[
P(\text{event}) = \frac{\text{number of outcomes in the event}}{\text{total number of outcomes}}
\]

Simulation gets you close to that exact answer without any counting, which matters because most real problems are far too complicated to count.

## Not, or, and

Three rules cover most probability calculations. Each is easy to see by simulation.

**Not.** The probability that an event does **not** happen is one minus the probability that it does: P(not A) = 1 − P(A). This is surprisingly useful, because "at least one" questions are usually much easier to answer the other way round. What is the chance of at least one six in four rolls of a die?

```python type
import numpy as np

rng = np.random.default_rng(1)
rolls = rng.integers(1, 7, size=(100_000, 4))
at_least_one_six = (rolls == 6).any(axis=1)
print("simulated:", at_least_one_six.mean())
print("exact:    ", 1 - (5 / 6) ** 4)
```

```output
simulated: 0.51533
exact:     0.5177469135802468
```

Each row is one experiment of four rolls, and `.any(axis=1)` asks whether each row contains a six. The exact answer uses "not": the chance of no six in one roll is 5/6, so the chance of no six in four rolls is (5/6)⁴, and at least one six is 1 minus that, about 0.518. (Why can the chances be multiplied? That is the "and" rule, just below.)

**Or.** For two events that cannot happen together, like rolling a 1 and rolling a 2 on one die, P(A or B) = P(A) + P(B). When they **can** overlap, adding counts the overlap twice, so it must be subtracted once:

\[
P(A \text{ or } B) = P(A) + P(B) - P(A \text{ and } B)
\]

**And, for independent events.** Two events are **independent** if one happening does not change the chance of the other: two separate dice, two separate coin flips. For independent events, the probabilities multiply:

\[
P(A \text{ and } B) = P(A) \times P(B)
\]

```python type
import numpy as np

rng = np.random.default_rng(2)
n = 200_000
d1 = rng.integers(1, 7, size=n)
d2 = rng.integers(1, 7, size=n)
A = d1 == 6
B = d2 % 2 == 0
print("P(A and B):", (A & B).mean(), " P(A) × P(B):", A.mean() * B.mean())
print("P(A or B): ", (A | B).mean(), " exact: 1/6 + 1/2 − 1/12 =", round(1 / 6 + 1 / 2 - 1 / 12, 4))
```

```output
P(A and B): 0.083615  P(A) × P(B): 0.08370875
P(A or B):  0.584635  exact: 1/6 + 1/2 − 1/12 = 0.5833
```

Here `A` is "the first die is a six" (probability 1/6) and `B` is "the second die is even" (probability 1/2). They are independent, so P(A and B) = 1/6 × 1/2 = 1/12, and the "or" rule gives the exact value on the last line.

Independence is an assumption, and it is often false. Whether it rains today and whether it rains tomorrow are not independent. Several machine learning methods assume independence to make the maths simple, knowing it is not quite true, and you will see one, naive Bayes, later in the series.

## Conditional probability

Often you already know something, and want the probability **given** that information. If you know the first die showed a 5, what is the chance the total is at least 10? This is a **conditional probability**, written with a vertical bar read as "given":

\[
P(A \mid B) = \frac{P(A \text{ and } B)}{P(B)}
\]

The idea: restrict attention to the experiments where `B` happened, and ask how often `A` happened among those. With simulation that is literally what you do: filter with a mask, then take a fraction.

```python type
import numpy as np

rng = np.random.default_rng(4)
n = 200_000
d1 = rng.integers(1, 7, size=n)
d2 = rng.integers(1, 7, size=n)
total = d1 + d2

print("P(total ≥ 10):              ", (total >= 10).mean())
given = d1 == 5
print("P(total ≥ 10 | first is 5): ", (total[given] >= 10).mean())
print("using the formula:          ", ((total >= 10) & given).mean() / given.mean())
```

```output
P(total ≥ 10):               0.167715
P(total ≥ 10 | first is 5):  0.333113099885879
using the formula:           0.33311309988587906
```

Without any information, a total of 10 or more has probability 6/36 ≈ 0.167. Knowing the first die is a 5, you only need a 5 or 6 on the second, so the probability rises to 2/6 ≈ 0.333. `total[given]` keeps only the experiments where the condition held. The last line computes the formula instead, P(A and B) divided by P(B), and gets the same number: filtering and then taking a fraction **is** the formula.

In machine learning, almost every prediction is a conditional probability: the probability that an email is spam **given** its words, that a patient has a disease **given** their test results, that the next word is "cat" **given** the words so far.

## Bayes' rule, and a surprise

A disease affects 1 in 100 people. A test for it is 95% accurate in both directions: it correctly detects 95% of people who have the disease, and correctly clears 95% of people who do not. You take the test and it comes back positive. What is the probability that you have the disease?

Most people answer 95%. Simulate a population and count instead:

```python type
import numpy as np

rng = np.random.default_rng(5)
n = 1_000_000
has_disease = rng.random(n) < 0.01
test_positive = np.where(has_disease, rng.random(n) < 0.95, rng.random(n) < 0.05)

print("people who test positive:", test_positive.sum())
print("of those, actually ill:  ", (has_disease & test_positive).sum())
print("P(disease | positive):   ", has_disease[test_positive].mean().round(3))
```

```output
people who test positive: 58782
of those, actually ill:   9505
P(disease | positive):    0.162
```

`rng.random(n) < 0.01` makes each person ill with probability 1%. For each person, `np.where` then chooses which test result to draw: positive with probability 0.95 if they are ill, and with probability 0.05 (a false alarm) if they are not.

The answer is about **16%**, not 95%. The reason is in the counts. The disease is rare, so the healthy people vastly outnumber the ill ones: out of a million people, about 10,000 are ill and 990,000 are healthy. The test catches 95% of the ill, about 9,500 true positives. But it also wrongly flags 5% of the healthy, about 49,500 false alarms. So among everyone who tests positive, the false alarms outnumber the real cases five to one.

The formula behind this is **Bayes' rule**. It turns a probability one way round, P(positive | disease), which the test's accuracy tells you, into the probability you actually want, P(disease | positive):

\[
P(D \mid +) = \frac{P(+ \mid D)\, P(D)}{P(+)}
\]

The bottom line, the overall chance of a positive test, adds up both ways of getting one: P(+) = P(+ | D) P(D) + P(+ | not D) P(not D). With the numbers: (0.95 × 0.01) / (0.95 × 0.01 + 0.05 × 0.99) ≈ 0.161. The probability you started with, P(D) = 0.01 here, is called the **prior**; the updated one, after seeing the evidence, is the **posterior**. Ignoring the prior, as the "95%" answer does, is called **base rate neglect**, and it is one of the most common reasoning errors there is. Bayes' rule underlies a whole family of machine learning methods, including naive Bayes, and a later lesson on Bayesian inference.

## A surprising simulation: shared birthdays

Simulation is especially valuable when intuition fails. In a room of 23 people, what is the chance that at least two share a birthday? (Assume 365 equally likely birthdays and ignore leap years.) Write your guess down before running the cell.

```python type
import numpy as np

rng = np.random.default_rng(6)
trials = 20_000
for people in [10, 23, 40, 60]:
    birthdays = rng.integers(0, 365, size=(trials, people))
    sorted_days = np.sort(birthdays, axis=1)
    has_shared = (np.diff(sorted_days, axis=1) == 0).any(axis=1)
    print(f"{people} people: {has_shared.mean():.3f}")
```

```output
10 people: 0.118
23 people: 0.509
40 people: 0.896
60 people: 0.993
```

With just 23 people it is already about 50%, and with 60 it is nearly certain. The trick for spotting a shared birthday: sort each row, and a repeat shows up as two equal neighbours, which `np.diff` (the difference between each element and the next) turns into a zero. Intuition goes wrong because it thinks about one person matching you, but there are 253 different **pairs** of people in a room of 23 (each of the 23 people pairs with 22 others, which counts every pair twice, so 23 × 22 / 2), and any of them could match.

::: challenge At least one six [easy]
Write a function `chance_of_six(rolls, trials, seed)` that estimates by simulation the probability of getting at least one six in `rolls` rolls of a die. Create a generator with `np.random.default_rng(seed)`, draw all the dice at once with `rng.integers(1, 7, size=(trials, rolls))`, and return the fraction of rows containing a six.

Then write `exact_chance_of_six(rolls)` returning the exact answer, using the "not" rule.

```python starter
import numpy as np

def chance_of_six(rolls, trials, seed):
    return 0.0

def exact_chance_of_six(rolls):
    return 0.0

print(chance_of_six(4, 100_000, 0), exact_chance_of_six(4))
```

```python solution
import numpy as np

def chance_of_six(rolls, trials, seed):
    rng = np.random.default_rng(seed)
    dice = rng.integers(1, 7, size=(trials, rolls))
    return float((dice == 6).any(axis=1).mean())

def exact_chance_of_six(rolls):
    return 1 - (5 / 6) ** rolls

print(chance_of_six(4, 100_000, 0), exact_chance_of_six(4))
```

```python test
import numpy as _np
assert "chance_of_six" in dir() and "exact_chance_of_six" in dir(), "Keep both function names."
for _r in [1, 2, 4, 10]:
    assert _np.isclose(exact_chance_of_six(_r), 1 - (5 / 6) ** _r), f"exact_chance_of_six({_r}) should be 1 − (5/6)^{_r} = {1 - (5 / 6) ** _r:.4f}, but got {exact_chance_of_six(_r)}."
for _r, _t, _s in [(4, 50_000, 0), (1, 20_000, 3)]:
    _want = (_np.random.default_rng(_s).integers(1, 7, size=(_t, _r)) == 6).any(axis=1).mean()
    assert _np.isclose(chance_of_six(_r, _t, _s), _want), f"chance_of_six({_r}, {_t}, {_s}) should be {_want}. Draw the dice in one call with size=(trials, rolls)."
"SUCCESS: Simulation and the 'not' rule agree."
```

Hint: `(dice == 6)` is a boolean array; `.any(axis=1)` asks whether each row has a six; `.mean()` gives the fraction. For the exact version, work out the chance of **no** six in all the rolls, and subtract it from 1.
:::

::: challenge A conditional probability [medium]
Two dice are rolled. Write a function `p_double_given_total(total, trials, seed)` that estimates, by simulation, the probability that both dice show the **same** number, **given** that they add up to `total`. Draw the dice with one generator: first `die1 = rng.integers(1, 7, size=trials)`, then `die2 = rng.integers(1, 7, size=trials)`.

If no simulated roll had that total (for example, a total of 13), return `nan`, which is what the mean of an empty array would be anyway; make sure no warning is printed.

For a total of 8, the exact answer is 1/5: of the five ways to make 8, only (4, 4) is a double.

```python starter
import numpy as np

def p_double_given_total(total, trials, seed):
    return 0.0

print(p_double_given_total(8, 200_000, 0))
```

```python solution
import numpy as np

def p_double_given_total(total, trials, seed):
    rng = np.random.default_rng(seed)
    die1 = rng.integers(1, 7, size=trials)
    die2 = rng.integers(1, 7, size=trials)
    given = die1 + die2 == total
    if not given.any():
        return float("nan")
    return float((die1[given] == die2[given]).mean())

print(p_double_given_total(8, 200_000, 0))
```

```python test
import numpy as _np
import warnings as _w
assert "p_double_given_total" in dir(), "Keep the function's name as p_double_given_total."
for _t, _n, _s in [(8, 200_000, 0), (2, 50_000, 1), (7, 50_000, 2)]:
    _rng = _np.random.default_rng(_s)
    _d1 = _rng.integers(1, 7, size=_n)
    _d2 = _rng.integers(1, 7, size=_n)
    _g = _d1 + _d2 == _t
    _want = (_d1[_g] == _d2[_g]).mean()
    _got = p_double_given_total(_t, _n, _s)
    assert _np.isclose(_got, _want), f"For a total of {_t} the simulated answer should be {_want:.4f}, but got {_got}. Filter to the rolls with that total, then take the fraction of doubles."
assert _np.isclose(p_double_given_total(8, 200_000, 0), 0.2, atol=0.01), "For a total of 8 the answer should be close to 1/5."
with _w.catch_warnings():
    _w.simplefilter("error")
    try:
        _r = p_double_given_total(13, 1000, 0)
    except Warning:
        raise AssertionError("A total of 13 is impossible; return nan without triggering a warning (check whether any roll matched first).")
assert _np.isnan(_r), "For an impossible total, return nan."
"SUCCESS: A conditional probability is just a fraction within the filtered experiments."
```

Hint: Build the mask `given` of rolls with the right total, and use it on both dice. If `given.any()` is false, return `float("nan")` before trying to take a mean.
:::

::: challenge Bayes' rule [medium]
Write a function `posterior(prior, sensitivity, false_positive_rate)` that returns the probability of having a condition given a positive test, using Bayes' rule, where:

- `prior` is P(condition),
- `sensitivity` is P(positive | condition),
- `false_positive_rate` is P(positive | no condition).

`posterior(0.01, 0.95, 0.05)` is about 0.161. Then use it to find how much a **second** positive test changes things, assuming the second test's result is independent of the first once you know whether the person has the condition: the posterior after the first test becomes the prior for the second. Store the probability after two positive tests in `after_two_tests`, for the lesson's disease and test.

```python starter
def posterior(prior, sensitivity, false_positive_rate):
    return sensitivity

after_two_tests = 0.0
print(round(posterior(0.01, 0.95, 0.05), 3), round(after_two_tests, 3))
```

```python solution
def posterior(prior, sensitivity, false_positive_rate):
    p_positive = sensitivity * prior + false_positive_rate * (1 - prior)
    return sensitivity * prior / p_positive

after_one_test = posterior(0.01, 0.95, 0.05)
after_two_tests = posterior(after_one_test, 0.95, 0.05)
print(round(posterior(0.01, 0.95, 0.05), 3), round(after_two_tests, 3))
```

```python test
import numpy as _np
assert "posterior" in dir(), "Keep the function's name as posterior."
def _post(p, s, f):
    return s * p / (s * p + f * (1 - p))
for _args in [(0.01, 0.95, 0.05), (0.5, 0.9, 0.1), (0.001, 0.99, 0.01), (0.2, 0.7, 0.3)]:
    assert _np.isclose(posterior(*_args), _post(*_args)), f"posterior{_args} should be {_post(*_args):.4f}, but got {posterior(*_args)}."
assert _np.isclose(after_two_tests, _post(_post(0.01, 0.95, 0.05), 0.95, 0.05)), f"After two positive tests the probability should be about {_post(_post(0.01, 0.95, 0.05), 0.95, 0.05):.3f}; use the first posterior as the prior for the second test."
"SUCCESS: Bayes' rule, applied twice. One test says 16%, two say about 78%."
```

Hint: The bottom of Bayes' rule is the total chance of a positive result, adding the true positives (`sensitivity × prior`) and the false alarms (`false_positive_rate × (1 − prior)`).
:::

## What you learned

- The probability of an event is a number from 0 to 1; it can be understood as the long-run fraction of times the event happens. The law of large numbers says simulated fractions settle towards the true probability.
- With NumPy you can simulate many experiments at once and count events with boolean masks. When outcomes are equally likely, probability = favourable outcomes / total outcomes.
- P(not A) = 1 − P(A), which makes "at least one" questions easy.
- P(A or B) = P(A) + P(B) − P(A and B). For independent events, P(A and B) = P(A) × P(B).
- Conditional probability P(A | B) = P(A and B) / P(B): the fraction of the experiments where `B` happened in which `A` also happened. Most model predictions are conditional probabilities.
- Bayes' rule, P(D | +) = P(+ | D) P(D) / P(+), turns the prior into the posterior. Ignoring the prior (the base rate) gives badly wrong answers.

So far each experiment's outcome has been a yes-or-no event. Next you will study random numbers themselves: distributions, which describe how likely each value is, including the normal distribution that appears everywhere in data.
