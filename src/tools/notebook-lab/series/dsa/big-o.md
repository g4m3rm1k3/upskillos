# Big-O

The last lesson counted steps: linear search makes up to n comparisons, checking every pair makes n(n − 1)/2. Exact counts like these are precise but clumsy, and the details rarely matter. What matters is how the count **grows** as n grows: whether doubling the input doubles the work, quadruples it, or barely changes it. **Big-O notation** is the shorthand for exactly that, and it is the language every later lesson uses to compare algorithms.

This lesson covers:

- what O(f(n)) means, and its relatives Ω and Θ;
- the rules for reading the growth rate straight from code;
- the common growth classes, from O(1) to O(2ⁿ), and how far apart they are;
- measuring growth with real timings, using `timeit` and the **doubling experiment**.

## What O means

Say an algorithm makes 3n² + 5n + 20 steps. For large n, the 3n² term dominates: at n = 1,000 it contributes 3,000,000 steps against 5,020 from the rest. And the constant 3 depends on details (what counts as one step, which computer, which language) that say nothing about the algorithm's character. So we keep only the **growth rate**: the cost is "order n squared", written **O(n²)**.

Precisely, a cost T(n) is **O(f(n))** if there are constants c and n₀ such that T(n) ≤ c·f(n) for every n ≥ n₀. In words: beyond some input size, the cost is at most a constant multiple of f(n). For 3n² + 5n + 20, the choice c = 4 and n₀ = 10 works, because n² ≥ 5n + 20 whenever n ≥ 10. Checking that claim numerically:

```python type
def cost(n):
    return 3 * n**2 + 5 * n + 20

for n in [1, 5, 9, 10, 100, 10_000]:
    print(f"n = {n:>6}: cost {cost(n):>12,}   4n² = {4 * n**2:>12,}   cost ≤ 4n²? {cost(n) <= 4 * n**2}")
```

```output
n =      1: cost           28   4n² =            4   cost ≤ 4n²? False
n =      5: cost          120   4n² =          100   cost ≤ 4n²? False
n =      9: cost          308   4n² =          324   cost ≤ 4n²? True
n =     10: cost          370   4n² =          400   cost ≤ 4n²? True
n =    100: cost       30,520   4n² =       40,000   cost ≤ 4n²? True
n =  10000: cost  300,050,020   4n² =  400,000,000   cost ≤ 4n²? True
```

For small n the bound fails, which is why the definition only demands it beyond n₀: Big-O describes behaviour for **large** inputs.

Two relatives complete the picture:

- **Ω(f(n))** (big omega) is a lower bound: the cost is at **least** a constant multiple of f(n) for large n.
- **Θ(f(n))** (big theta) is both: the cost grows **exactly** like f(n), up to constants. 3n² + 5n + 20 is Θ(n²).

Strictly, O is only an upper bound, so linear search is also O(n²), a true but useless statement. In everyday use, people write O to mean the tightest bound, Θ, and this series does too unless the difference matters.

Big-O usually describes the **worst case**, because that is a guarantee. Linear search is O(n): in the worst case it looks at everything. Its best case is O(1), and when the difference matters, say which case you mean.

## Reading growth from code

A few rules cover most code:

1. **Simple statements** (arithmetic, assignment, indexing a list, calling `len`) are O(1): constant time, independent of n.
2. **A loop** multiplies: a loop that runs n times around an O(1) body is O(n).
3. **Nested loops** multiply again: n times around an O(n) loop is O(n²).
4. **Steps one after another** add, and the largest term wins: O(n) followed by O(n²) is O(n²).
5. **A loop that halves** what is left each time runs about log₂ n times: O(log n).

The step counts below confirm each rule. Predict before running: when n goes from 1,000 to 2,000, by what factor will each count change?

```python type
def one_loop(n):
    steps = 0
    for i in range(n):
        steps += 1
    return steps

def nested_loops(n):
    steps = 0
    for i in range(n):
        for j in range(n):
            steps += 1
    return steps

def triangle_loops(n):
    steps = 0
    for i in range(n):
        for j in range(i):
            steps += 1
    return steps

def halving_loop(n):
    steps = 0
    while n > 1:
        n //= 2
        steps += 1
    return steps

for f in [one_loop, nested_loops, triangle_loops, halving_loop]:
    a, b = f(1000), f(2000)
    print(f"{f.__name__:<15} n=1000: {a:>9,}   n=2000: {b:>9,}   ratio {b / a:.2f}")
```

```output
one_loop        n=1000:     1,000   n=2000:     2,000   ratio 2.00
nested_loops    n=1000: 1,000,000   n=2000: 4,000,000   ratio 4.00
triangle_loops  n=1000:   499,500   n=2000: 1,999,000   ratio 4.00
halving_loop    n=1000:         9   n=2000:        10   ratio 1.11
```

`f.__name__` is the name a function was defined with, handy for labelling output.

One loop doubles (O(n)). Both nested versions quadruple, including the triangle, where the inner loop runs only i times: its total n(n − 1)/2 is half of n², and halving is a constant factor, so it is still O(n²). The halving loop goes from 9 to 10 steps: doubling n adds just **one** step, the signature of O(log n). (`n //= 2` is integer division, so 1,000 halves to 500, 250, …, 1 in 9 steps.)

## The common growth classes

The same handful of growth rates appears again and again. From fastest to slowest:

- **O(1)**, constant: indexing a list, a dictionary lookup on average.
- **O(log n)**, logarithmic: binary search in a sorted list.
- **O(n)**, linear: one pass over the data.
- **O(n log n)**: good sorting algorithms.
- **O(n²)**, quadratic: comparing all pairs.
- **O(2ⁿ)**, exponential: trying every subset.

The gaps between them are enormous. Predict before running: for n = 1,000,000, roughly how many steps is n log₂ n, and how does it compare with n²?

```python type
import math

print(f"{'n':>10} {'log n':>7} {'n log n':>14} {'n²':>20} {'2ⁿ':>12}")
for n in [10, 100, 1_000, 1_000_000]:
    exponential = f"{2**n:,}" if n <= 20 else f"~10^{int(n * math.log10(2))}"
    print(f"{n:>10,} {math.log2(n):>7.1f} {round(n * math.log2(n)):>14,} {n**2:>20,} {exponential:>12}")
```

```output
         n   log n        n log n                   n²           2ⁿ
        10     3.3             33                  100        1,024
       100     6.6            664               10,000       ~10^30
     1,000    10.0          9,966            1,000,000      ~10^301
 1,000,000    19.9     19,931,569    1,000,000,000,000   ~10^301029
```

`f"{'n':>10}"` right-aligns a string in 10 characters, so the heading lines up with the numbers.

At a million items, at a billion simple steps per second, n log n is about 20 million steps (a fiftieth of a second), n² is a trillion (about a quarter of an hour, and far longer in Python), and 2ⁿ is a number with 301,030 digits. A plot shows the shapes:

```python type
import numpy as np
import matplotlib.pyplot as plt

n = np.arange(1, 41)
fig, ax = plt.subplots(figsize=(6.5, 3.6))
for label, values in [("log n", np.log2(n)), ("n", n), ("n log n", n * np.log2(n)), ("n²", n**2), ("2ⁿ", 2.0**n)]:
    ax.plot(n, values, label=label)
ax.set_ylim(0, 400)
ax.set_xlabel("n")
ax.set_ylabel("steps")
ax.legend()
plt.show()
```

Even at n = 40, 2ⁿ has shot off the top of the chart, and n² is pulling away from n log n. Improving an algorithm's class (say from O(n²) to O(n log n)) usually matters far more than making its code a few times faster.

## Measuring growth with timeit

Big-O predicts how the time grows; measurement checks it. Python's `timeit` module runs a piece of code many times and reports the total time, which smooths out noise. The **doubling experiment** times the code at n and at 2n: a ratio near 2 suggests O(n), near 4 suggests O(n²), near 1 suggests O(1) or O(log n).

```python type
import timeit

def sum_of_list(values):
    total = 0
    for v in values:
        total += v
    return total

def count_equal_pairs(values):
    count = 0
    for i in range(len(values)):
        for j in range(i + 1, len(values)):
            if values[i] == values[j]:
                count += 1
    return count

for f, sizes, repeats in [(sum_of_list, [100_000, 200_000, 400_000], 5), (count_equal_pairs, [400, 800, 1600], 2)]:
    times = [timeit.timeit(lambda: f(list(range(n))), number=repeats) / repeats for n in sizes]
    ratios = [times[k + 1] / times[k] for k in range(len(times) - 1)]
    print(f"{f.__name__:<18} times {[f'{t * 1000:.1f} ms' for t in times]}  doubling ratios {[round(r, 1) for r in ratios]}")
```

`timeit.timeit(function, number=k)` calls the function k times and returns the total seconds; dividing by k gives the average. The `lambda:` wraps the call into a function of no arguments, which is what `timeit` expects.

The summing loop's time roughly doubles with n, and the pairs loop's roughly quadruples, as predicted. Real timings are noisy, especially for short runs (other programs, memory caches and the interpreter all interfere), so the ratios wander around 2 and 4 rather than hitting them exactly. That is why step counts and Big-O are the main tools, and timing is the check.

::: challenge Count without looping [easy]
For the loop below, write `exact_steps(n)` that returns the **exact** number of times `steps += 1` runs, using a formula rather than running the loop. Then set `growth` to one of the strings `"O(1)"`, `"O(log n)"`, `"O(n)"`, `"O(n log n)"`, `"O(n^2)"` or `"O(2^n)"`.

```text
for i in range(n):
    for j in range(i, n):
        steps += 1
```

```python starter
def exact_steps(n):
    return 0

growth = ""
print(exact_steps(4), growth)
```

```python solution
def exact_steps(n):
    return n * (n + 1) // 2

growth = "O(n^2)"
print(exact_steps(4), growth)
```

```python test
assert "exact_steps" in dir(), "Keep the function's name as exact_steps."
def _run(_n):
    _s = 0
    for _i in range(_n):
        for _j in range(_i, _n):
            _s += 1
    return _s
for _n in [0, 1, 2, 3, 10, 57]:
    assert exact_steps(_n) == _run(_n), f"For n = {_n} the loop runs {_run(_n)} times, but exact_steps gave {exact_steps(_n)}. Count how many j values there are for each i, then add them up."
assert exact_steps(10**6) == 500000500000, "The formula should work for large n too, without looping."
_fn_src = _source.split("def exact_steps")[1].split("\ngrowth")[0].split("\ndef ")[0] if "def exact_steps" in _source else ""
assert "for " not in _fn_src and "while " not in _fn_src, "Use a formula in exact_steps, not a loop."
assert growth == "O(n^2)", f"The count grows like n²/2, so the growth class is O(n^2); you wrote {growth!r}."
"SUCCESS: n + (n − 1) + … + 1 = n(n + 1)/2: half of n², so still O(n²)."
```

Hint: For a given i, j runs from i up to n − 1, which is n − i values. Adding n − i for i = 0, 1, …, n − 1 gives n + (n − 1) + … + 1.
:::

::: challenge Diagnose by doubling [medium]
Write `doubling_exponent(step_count, n)` that returns log₂(step_count(2n) / step_count(n)): the exponent k for which the cost behaves like nᵏ (1 for linear, 2 for quadratic, close to 0 for constant or logarithmic). Then use it, with n = 2000, to classify the three mystery functions in the starter (each returns its own step count), storing the classes in the dictionary `diagnosis` with the same strings as the previous challenge.

```python starter
import math

def mystery_a(n):
    steps = 0
    i = 1
    while i < n:
        steps += 1
        i *= 2
    return steps

def mystery_b(n):
    steps = 0
    for i in range(n):
        for j in range(0, n, 10):
            steps += 1
    return steps

def mystery_c(n):
    steps = 0
    for i in range(n):
        steps += 1
    for i in range(n):
        steps += 1
    return steps

def doubling_exponent(step_count, n):
    return 0.0

diagnosis = {"mystery_a": "", "mystery_b": "", "mystery_c": ""}
```

```python solution
import math

def mystery_a(n):
    steps = 0
    i = 1
    while i < n:
        steps += 1
        i *= 2
    return steps

def mystery_b(n):
    steps = 0
    for i in range(n):
        for j in range(0, n, 10):
            steps += 1
    return steps

def mystery_c(n):
    steps = 0
    for i in range(n):
        steps += 1
    for i in range(n):
        steps += 1
    return steps

def doubling_exponent(step_count, n):
    return math.log2(step_count(2 * n) / step_count(n))

for f in [mystery_a, mystery_b, mystery_c]:
    print(f.__name__, round(doubling_exponent(f, 2000), 2))
diagnosis = {"mystery_a": "O(log n)", "mystery_b": "O(n^2)", "mystery_c": "O(n)"}
```

```python test
import math as _math
assert "doubling_exponent" in dir(), "Keep the function's name as doubling_exponent."
assert abs(doubling_exponent(lambda _n: 5 * _n, 100) - 1) < 1e-9, "A cost of 5n doubles when n doubles: exponent 1."
assert abs(doubling_exponent(lambda _n: _n**3, 50) - 3) < 1e-9, "A cost of n³ grows 8-fold: exponent 3."
assert abs(doubling_exponent(lambda _n: 7, 50)) < 1e-9, "A constant cost does not change: exponent 0."
assert diagnosis.get("mystery_a") == "O(log n)", "mystery_a doubles i each time, so its count goes up by one when n doubles: its exponent is near 0, and it is logarithmic."
assert diagnosis.get("mystery_b") == "O(n^2)", "mystery_b's inner loop takes steps of 10, but n/10 is still proportional to n: exponent 2."
assert diagnosis.get("mystery_c") == "O(n)", "Two loops one after the other add: 2n is still O(n)."
"SUCCESS: The exponents come out near 0.13, 2 and 1. Constant factors (the step of 10, the two loops) never change the class."
```

Hint: `math.log2(step_count(2 * n) / step_count(n))`. Print the exponent for each mystery function, then match: near 2 is O(n^2), near 1 is O(n), near 0 is O(log n) here because the count still creeps up.
:::

::: challenge From O(n²) to O(n) [medium]
The starter's `count_pairs_slow` counts the pairs of positions i < j whose values add up to `target`, checking every pair: O(n²). Write `count_pairs_fast(values, target)` that gives the same answers in O(n): walk through the list once, keeping a dictionary of how many times each value has been seen so far; each new value v pairs with every earlier value equal to `target - v`.

```python starter
def count_pairs_slow(values, target):
    count = 0
    for i in range(len(values)):
        for j in range(i + 1, len(values)):
            if values[i] + values[j] == target:
                count += 1
    return count

def count_pairs_fast(values, target):
    return 0

print(count_pairs_slow([1, 5, 3, 3, 7, 1], 8), count_pairs_fast([1, 5, 3, 3, 7, 1], 8))
```

```python solution
def count_pairs_slow(values, target):
    count = 0
    for i in range(len(values)):
        for j in range(i + 1, len(values)):
            if values[i] + values[j] == target:
                count += 1
    return count

def count_pairs_fast(values, target):
    seen = {}
    count = 0
    for v in values:
        count += seen.get(target - v, 0)
        seen[v] = seen.get(v, 0) + 1
    return count

print(count_pairs_slow([1, 5, 3, 3, 7, 1], 8), count_pairs_fast([1, 5, 3, 3, 7, 1], 8))
```

```python test
import random as _random, time as _time
assert "count_pairs_fast" in dir(), "Keep the function's name as count_pairs_fast."
def _slow(_xs, _t):
    return sum(1 for _i in range(len(_xs)) for _j in range(_i + 1, len(_xs)) if _xs[_i] + _xs[_j] == _t)
assert count_pairs_fast([1, 5, 3, 3, 7, 1], 8) == 4, f"[1, 5, 3, 3, 7, 1] with target 8 has 4 pairs (1+7 twice, 5+3 twice); got {count_pairs_fast([1, 5, 3, 3, 7, 1], 8)}."
assert count_pairs_fast([4, 4, 4], 8) == 3, "[4, 4, 4] with target 8 has 3 pairs: each value pairs with every earlier 4."
assert count_pairs_fast([], 5) == 0 and count_pairs_fast([5], 10) == 0, "Empty and one-element lists have no pairs; a value never pairs with itself."
_r = _random.Random(2)
for _ in range(300):
    _xs = [_r.randint(-4, 4) for _ in range(_r.randint(0, 9))]
    _t = _r.randint(-6, 6)
    assert count_pairs_fast(_xs, _t) == _slow(_xs, _t), f"count_pairs_fast({_xs}, {_t}) gave {count_pairs_fast(_xs, _t)}, expected {_slow(_xs, _t)}."
_big = [_r.randint(0, 1000) for _ in range(8_000)]
_start = _time.perf_counter(); count_pairs_fast(_big, 1000); _elapsed = _time.perf_counter() - _start
assert _elapsed < 0.5, f"8,000 values took {_elapsed:.1f} s: the function should make one pass, not compare every pair."
f"SUCCESS: 8,000 values in {_elapsed * 1000:.1f} ms. The slow version needs 32 million comparisons for the same list."
```

Hint: Before recording v, add `seen.get(target - v, 0)` to the count (those are the earlier partners); then increase `seen[v]` by one. Doing it in that order stops a value pairing with itself.
:::

## What you learned

- O(f(n)) means the cost is at most a constant times f(n) for large n; Ω is the matching lower bound and Θ means both. Constants and lower-order terms are dropped, and the worst case is the usual default.
- Read growth from code: loops multiply, sequences add with the largest term winning, and halving loops are O(log n).
- The classes O(1), O(log n), O(n), O(n log n), O(n²), O(2ⁿ) are vastly far apart for large n; changing class beats tuning code.
- Measure with `timeit` and the doubling experiment: ratios near 2 or 4 point to linear or quadratic growth. Timings are noisy, so treat them as a check on the analysis.

The next lesson applies all this to Python itself: what list, dictionary and string operations actually cost, and the hidden O(n) operations that make innocent-looking code slow.
