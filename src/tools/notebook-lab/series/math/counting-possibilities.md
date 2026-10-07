# Counting possibilities

A control panel has 6 settings with 4 options each: testing every combination takes 4,096 runs. A delivery driver has 12 stops: there are 479 million possible orders to visit them. An 8-character password from upper- and lowercase letters and digits can be any of about 218 trillion strings. Counting how many possibilities exist, without listing them, decides whether a brute-force check is feasible, how strong a password is, and how many tests a product really needs. This lesson builds the core counting rules (multiplication, permutations, combinations, inclusion–exclusion), checks each against brute-force enumeration with `itertools`, and ends with a practical payoff: pairwise testing, which catches most configuration bugs with a tiny fraction of the full test matrix.

This lesson covers:

- the multiplication principle, password spaces and entropy in bits;
- permutations, factorial growth and Stirling's approximation;
- combinations, Pascal's triangle and the binomial theorem;
- inclusion–exclusion for counting with rules;
- pairwise testing: covering every pair of settings with few tests.

## The multiplication principle

::: math
\[ N = n_1 \times n_2 \times \dots \times n_k, \qquad \text{passwords: } A^L, \qquad \text{entropy} = \log_2 A^L = L\log_2 A \text{ bits} \]
- independent choices multiply
- $A$: alphabet size; $L$: length; each extra bit doubles the search
In code: `math.prod(settings.values())` and `length * math.log2(alphabet)`
:::


If one choice can be made in a ways and, independently, another in b ways, the pair can be made in a × b ways. For k independent choices from sets of sizes n₁, ..., n_k, the total is the product. A password of length L drawn from an alphabet of size A therefore has Aᴸ possibilities, and its strength is often quoted as **entropy** in bits, log₂(Aᴸ) = L log₂ A: each bit doubles the attacker's work. Predict before running: which is stronger, 8 characters from letters and digits, or 12 lowercase letters?

```python type
import math
import itertools
import numpy as np
import matplotlib.pyplot as plt

settings = {"speed": 4, "mode": 4, "feed": 4, "coolant": 4, "tool": 4, "units": 4}
print("full test matrix:", math.prod(settings.values()), "runs")

for name, alphabet, length in [("8 × [a-zA-Z0-9]", 62, 8), ("12 × [a-z]", 26, 12), ("4-digit PIN", 10, 4), ("16 × [a-z]", 26, 16)]:
    space = alphabet ** length
    bits = length * math.log2(alphabet)
    years = space / 1e10 / 3600 / 24 / 365
    print(f"{name:<16} {space:.2e} possibilities, {bits:5.1f} bits, {years:12.4g} years at 10 billion guesses/s")
```

```output
full test matrix: 4096 runs
8 × [a-zA-Z0-9]  2.18e+14 possibilities,  47.6 bits,    0.0006924 years at 10 billion guesses/s
12 × [a-z]       9.54e+16 possibilities,  56.4 bits,       0.3026 years at 10 billion guesses/s
4-digit PIN      1.00e+04 possibilities,  13.3 bits,    3.171e-14 years at 10 billion guesses/s
16 × [a-z]       4.36e+22 possibilities,  75.2 bits,    1.383e+05 years at 10 billion guesses/s
```

The last column is the time to try every possibility at 10¹⁰ guesses per second, a fast offline attack.

The 6 settings give 4⁶ = 4,096 combinations. The 8-character mixed password has about 2.2 × 10¹⁴ possibilities (47.6 bits), cracked by exhaustive search in about 6 hours at this rate, while 12 lowercase letters give 56.4 bits, about 440 times stronger (a third of a year), and 16 lowercase letters take some 140,000 years. Length beats complexity, because it sits in the exponent.

## Permutations and factorial growth

::: math
\[ n! = n(n - 1)\cdots 1, \qquad P(n, k) = \frac{n!}{(n - k)!}, \qquad n! \approx \sqrt{2\pi n}\left(\frac{n}{e}\right)^n \]
- $n!$: orders of $n$ items; $P(n, k)$: ordered choices of $k$ from $n$
- Stirling's approximation, already within 1% at $n = 10$
In code: `math.factorial(n)` against `math.sqrt(2 * math.pi * n) * (n / math.e) ** n`; `itertools.permutations` to list
:::


Arranging n distinct items in order: n choices for the first position, n − 1 for the second, and so on, giving **n!** (n factorial) **permutations**. Arranging k of the n in order gives n!/(n − k)!. Factorials grow faster than any exponential; **Stirling's approximation** n! ≈ √(2πn)(n/e)ⁿ estimates them. This is why trying every visiting order of a route (the travelling salesman's brute force from the DSA series) collapses beyond a dozen stops. Predict before running: how good is Stirling's formula at n = 10, and how long would checking every 20-stop route take?

```python type
for n in [5, 10, 12, 20]:
    exact = math.factorial(n)
    stirling = math.sqrt(2 * math.pi * n) * (n / math.e) ** n
    print(f"{n:>2}! = {exact:.4e}, Stirling {stirling:.4e} ({100 * (stirling / exact - 1):+.2f}%)")
print("orders of 4 jobs, by listing:", len(list(itertools.permutations("ABCD"))), "= 4! =", math.factorial(4))
print("ways to pick and order 3 of 8 tools:", len(list(itertools.permutations(range(8), 3))), "= 8!/5! =", math.perm(8, 3))
print(f"checking all 20-stop orders at a billion per second: {math.factorial(20) / 1e9 / 3600 / 24 / 365:.0f} years")
```

```output
 5! = 1.2000e+02, Stirling 1.1802e+02 (-1.65%)
10! = 3.6288e+06, Stirling 3.5987e+06 (-0.83%)
12! = 4.7900e+08, Stirling 4.7569e+08 (-0.69%)
20! = 2.4329e+18, Stirling 2.4228e+18 (-0.42%)
orders of 4 jobs, by listing: 24 = 4! = 24
ways to pick and order 3 of 8 tools: 336 = 8!/5! = 336
checking all 20-stop orders at a billion per second: 77 years
```

`itertools.permutations(items, k)` lists every ordered selection of k items; `math.perm(n, k)` counts them without listing.

Stirling's formula is within 1% at n = 10 (and its relative error keeps shrinking as n grows). Listing confirms 4! = 24 orders of 4 jobs and 336 ordered choices of 3 tools from 8. Twenty stops have 2.4 × 10¹⁸ orders: at a billion per second, checking them all would take 77 years. Problems like this need the smarter algorithms of the optimisation lessons.

## Combinations

::: math
\[ \binom{n}{k} = \frac{n!}{k!\,(n - k)!} = \binom{n - 1}{k - 1} + \binom{n - 1}{k}, \qquad \sum_{k=0}^{n}\binom{n}{k} = 2^n \]
- order does not matter: each set is counted $k!$ times among the ordered choices
- Pascal's rule: the last item is either in the set or not
In code: `math.comb(10, 3)` and `itertools.combinations`; each Pascal row from the one above
:::


When order does not matter, each set of k items chosen from n is counted k! times among the ordered selections, so the number of **combinations** is

\[ \binom{n}{k} = \frac{n!}{k!\,(n-k)!} \]

read "n choose k", already met in the probability lessons. These numbers form **Pascal's triangle**, each entry the sum of the two above it, because a k-subset of n items either includes the last item (C(n − 1, k − 1) ways) or does not (C(n − 1, k) ways). They are also the coefficients of the **binomial theorem**, (x + y)ⁿ = Σ C(n, k) xᵏ yⁿ⁻ᵏ, and summing them gives 2ⁿ, the number of all subsets. Predict before running: a test lab can run any 3 of 10 sensors together. How many different line-ups is that, and how many line-ups of any size exist?

```python type
print("3 of 10 sensors:", math.comb(10, 3), "= listed", len(list(itertools.combinations(range(10), 3))))
row = [1]
for n in range(1, 9):
    row = [1] + [row[i] + row[i + 1] for i in range(len(row) - 1)] + [1]
print("row 8 of Pascal's triangle:", row, "sum", sum(row), "= 2^8")
print("all subsets of 10 sensors:", sum(math.comb(10, k) for k in range(11)), "= 2^10 =", 2 ** 10)
x, y = 1.7, -0.4
print("binomial theorem check:", math.isclose((x + y) ** 6, sum(math.comb(6, k) * x ** k * y ** (6 - k) for k in range(7))))
```

```output
3 of 10 sensors: 120 = listed 120
row 8 of Pascal's triangle: [1, 8, 28, 56, 70, 56, 28, 8, 1] sum 256 = 2^8
all subsets of 10 sensors: 1024 = 2^10 = 1024
binomial theorem check: True
```

Each new row of Pascal's triangle is built by adding neighbouring pairs of the previous row, with a 1 at each end.

There are 120 three-sensor line-ups and 1,024 line-ups of any size (2¹⁰, since each sensor is either in or out). Pascal's row 8 sums to 256 = 2⁸, and the binomial expansion of (1.7 − 0.4)⁶ matches the direct power. The symmetry C(n, k) = C(n, n − k) shows in every row: choosing 3 to include is choosing 7 to leave out.

## Counting with rules: inclusion–exclusion

::: math
\[ |A \cup B| = |A| + |B| - |A \cap B|, \qquad \#\text{good} = \sum_{k=0}^{3} (-1)^k \sum_{|S| = k} \big(62 - \textstyle\sum S\big)^L \]
- count the strings that break rules, adding and subtracting overlaps
- $S$: a set of excluded character classes, of sizes 26, 26 and 10
In code: `good += (-1) ** k * (62 - sum(excluded)) ** L` over `itertools.combinations`
:::


Password rules ("at least one digit and at least one capital") make counting harder: the easy count is of strings that **break** a rule. **Inclusion–exclusion** combines such counts. For two rules, |A ∪ B| = |A| + |B| − |A ∩ B|: adding the two sets counts their overlap twice, so subtract it once. In general, alternately add and subtract the intersections. The number of passwords obeying every rule is the total minus the number breaking at least one. Predict before running: of all 6-character strings from lowercase, uppercase and digits, what fraction contains at least one of each class?

```python type
lower, upper, digits = 26, 26, 10
L = 6
total = 62 ** L
good = 0
for k in range(4):
    for excluded in itertools.combinations([lower, upper, digits], k):
        good += (-1) ** k * (62 - sum(excluded)) ** L
print(f"total {total:,}, with all three classes {good:,} ({good / total:.1%})")

small = "ab" + "C" + "1"
classes = [set("ab"), set("C"), set("1")]
brute = sum(1 for s in itertools.product(small, repeat=4) if all(set(s) & c for c in classes))
formula = sum((-1) ** k * (4 - sum(len(c) for c in excl)) ** 4 for k in range(4) for excl in itertools.combinations(classes, k))
print("check on a tiny alphabet (a, b, C, 1), length 4: brute force", brute, "formula", formula)
```

```output
total 56,800,235,584, with all three classes 33,294,892,800 (58.6%)
check on a tiny alphabet (a, b, C, 1), length 4: brute force 96 formula 96
```

For each set of classes to leave out (none, one, two or all three), count the strings avoiding them all and add or subtract by the parity of the set's size.

About 59% of 6-character strings already contain all three classes, so the rule removes about 41% of the space, slightly **weakening** the password space it is meant to protect (though it forces users away from all-lowercase words). On a tiny alphabet, where every string can be listed, the brute-force count and the formula agree exactly, which is the standard way to trust a counting formula.

## Pairwise testing

::: math
\[ \#\text{pairs to cover} = \binom{6}{2} \times 4^2 = 240, \qquad \text{tests} \ge \frac{240}{\binom{6}{2}} = 16 \]
- each test covers $\binom{6}{2} = 15$ value pairs at once
- greedy: repeatedly add the candidate test covering the most uncovered pairs
In code: `pairwise_suite(levels)` with `uncovered` holding every `(i, j, a, b)`
:::


The control panel's 4,096 combinations are too many to test. Experience shows that most configuration bugs are triggered by a single setting or by an interaction between **two** settings. **Pairwise testing** therefore covers every pair of values for every pair of settings at least once. There are C(6, 2) × 16 = 240 such value pairs, and each test covers C(6, 2) = 15 of them at once, so no suite can have fewer than 16 tests (for six 4-value settings the true minimum is known to be 19). A simple **greedy** construction gets close: repeatedly pick, from a set of candidate tests, the one that covers the most still-uncovered pairs. Predict before running: how many tests does the greedy method need for the 6 settings?

```python type
def pairwise_suite(levels, candidates_per_step=200, seed=0):
    rng = np.random.default_rng(seed)
    k = len(levels)
    uncovered = {(i, j, a, b) for i, j in itertools.combinations(range(k), 2) for a in range(levels[i]) for b in range(levels[j])}
    tests = []
    while uncovered:
        best, best_gain = None, -1
        i, j, a, b = next(iter(sorted(uncovered)))
        for _ in range(candidates_per_step):
            t = [int(rng.integers(n)) for n in levels]
            t[i], t[j] = a, b
            gain = sum((p, q, t[p], t[q]) in uncovered for p, q in itertools.combinations(range(k), 2))
            if gain > best_gain:
                best, best_gain = t, gain
        tests.append(best)
        uncovered -= {(p, q, best[p], best[q]) for p, q in itertools.combinations(range(k), 2)}
    return tests

suite = pairwise_suite([4] * 6)
print(f"pairwise suite: {len(suite)} tests instead of {4 ** 6}; lower bound 16")
covered = {(p, q, t[p], t[q]) for t in suite for p, q in itertools.combinations(range(6), 2)}
print("every one of the 240 value pairs covered:", len(covered) == 240)
```

```output
pairwise suite: 24 tests instead of 4096; lower bound 16
every one of the 240 value pairs covered: True
```

Each candidate test is random except that it is forced to cover one specific uncovered pair, which guarantees progress; the best of 200 candidates is kept.

The greedy suite covers all 240 value pairs with roughly two dozen tests instead of 4,096, about 0.6% of the full matrix. Against the lower bound of 16 (two settings with 4 values each already need 16 tests) and the known optimum of 19, greedy is within about 1.3 times of the best possible. Combinatorial design theory constructs optimal suites (**covering arrays**) for many cases; the greedy method is what most practical tools use.

::: challenge Password spaces [easy]
Write `space(alphabet, length)`, the number of strings (an int), and `entropy_bits(alphabet, length)`, length × log₂(alphabet) rounded to 1 decimal place; raise `ValueError` unless alphabet ≥ 1 and length ≥ 0. Then write `crack_time_years(alphabet, length, guesses_per_second)`: the time to try every possibility, in years (365 days), rounded to 3 significant figures (`float(f"{x:.3g}")`). Finally write `length_needed(alphabet, bits)`: the smallest length whose entropy is at least `bits`.

```python starter
def space(alphabet, length):
    return alphabet * length

def entropy_bits(alphabet, length):
    return 0.0

def crack_time_years(alphabet, length, guesses_per_second):
    return 0.0

def length_needed(alphabet, bits):
    return 1

print(space(62, 8), entropy_bits(62, 8))
```

```python solution
def space(alphabet, length):
    if alphabet < 1 or length < 0:
        raise ValueError("need alphabet >= 1 and length >= 0")
    return alphabet ** length

def entropy_bits(alphabet, length):
    space(alphabet, length)
    return round(length * math.log2(alphabet), 1)

def crack_time_years(alphabet, length, guesses_per_second):
    years = space(alphabet, length) / guesses_per_second / (3600 * 24 * 365)
    return float(f"{years:.3g}")

def length_needed(alphabet, bits):
    if alphabet < 2:
        raise ValueError("an alphabet of one symbol gives no entropy")
    return max(0, math.ceil(bits / math.log2(alphabet) - 1e-12))

print(space(62, 8), entropy_bits(62, 8))
```

```python test
for _n in ["space", "entropy_bits", "crack_time_years", "length_needed"]:
    assert _n in dir(), f"Define {_n}."
assert space(62, 8) == 62 ** 8 and space(10, 4) == 10000 and space(5, 0) == 1 and type(space(26, 12)) is int, "Integer counts."
for _bad in [(0, 3), (10, -1)]:
    try:
        space(*_bad)
        assert False, f"space{_bad} should raise ValueError."
    except ValueError:
        pass
assert entropy_bits(62, 8) == 47.6 and entropy_bits(26, 12) == 56.4 and entropy_bits(2, 10) == 10.0, "Bits = length × log2(alphabet)."
assert crack_time_years(62, 8, 1e10) == float(f"{62 ** 8 / 1e10 / 31536000:.3g}") and crack_time_years(26, 16, 1e10) > 1e5, "Years to exhaust the space."
assert length_needed(26, 56.4) == 12 and length_needed(2, 128) == 128 and length_needed(62, 128) == 22 and length_needed(10, 0) == 0, f"Got {length_needed(62, 128)}."
"SUCCESS: Possibilities multiply, so length sits in the exponent: a few more characters buy far more than a bigger alphabet."
```

Hint: The space is alphabet ** length. Entropy is length × log₂(alphabet), so the length needed for b bits is b / log₂(alphabet), rounded up.
:::

::: challenge Counting with rules [medium]
Write `strings_with_all(class_sizes, length)`: the number of strings of the given length over an alphabet made of disjoint character classes (sizes given as a list) that contain **at least one character from every class**, by inclusion–exclusion (sum over subsets S of classes of (−1)^|S| × (total − size of S)^length). Return an int. Raise `ValueError` for an empty list or non-positive sizes. Then write `brute_force_count(class_sizes, length)`: the same number by listing every string with `itertools.product` (use only for small cases), and `rule_fraction(class_sizes, length)`, the fraction of all strings that satisfy the rule, rounded to 4 decimal places.

```python starter
def strings_with_all(class_sizes, length):
    return sum(class_sizes) ** length

def brute_force_count(class_sizes, length):
    return 0

def rule_fraction(class_sizes, length):
    return 1.0

print(strings_with_all([26, 26, 10], 6))
```

```python solution
def strings_with_all(class_sizes, length):
    if not class_sizes or any(s <= 0 for s in class_sizes):
        raise ValueError("need a non-empty list of positive class sizes")
    total = sum(class_sizes)
    count = 0
    for k in range(len(class_sizes) + 1):
        for excluded in itertools.combinations(class_sizes, k):
            count += (-1) ** k * (total - sum(excluded)) ** length
    return int(count)

def brute_force_count(class_sizes, length):
    labels = [c for c, size in enumerate(class_sizes) for _ in range(size)]
    needed = set(range(len(class_sizes)))
    return sum(1 for s in itertools.product(labels, repeat=length) if set(s) == needed)

def rule_fraction(class_sizes, length):
    return round(strings_with_all(class_sizes, length) / sum(class_sizes) ** length, 4)

print(strings_with_all([26, 26, 10], 6))
```

```python test
for _n in ["strings_with_all", "brute_force_count", "rule_fraction"]:
    assert _n in dir(), f"Define {_n}."
for _sizes, _len in [([2, 1, 1], 4), ([3, 2], 3), ([1, 1, 1], 3), ([2, 2, 1], 5), ([4], 2)]:
    assert strings_with_all(_sizes, _len) == brute_force_count(_sizes, _len), f"Formula and brute force must agree for {_sizes}, length {_len}."
assert strings_with_all([1, 1, 1], 3) == 6 and strings_with_all([1, 1, 1], 2) == 0, "Three classes need at least three characters."
assert type(strings_with_all([26, 26, 10], 6)) is int, "Return an int."
_g = strings_with_all([26, 26, 10], 6)
assert _g == 62 ** 6 - 2 * 36 ** 6 - 52 ** 6 + 10 ** 6 + 2 * 26 ** 6, "Inclusion–exclusion for the lesson's rule."
assert rule_fraction([26, 26, 10], 6) == round(_g / 62 ** 6, 4) and rule_fraction([5], 3) == 1.0, "Fractions."
for _bad in [[], [3, 0]]:
    try:
        strings_with_all(_bad, 3)
        assert False, f"{_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Count what breaks the rules, correct for the overlaps, and subtract: inclusion–exclusion, confirmed by brute force."
```

Hint: Loop over every subset of the classes with `itertools.combinations` for each size k. For the brute force, label every character by its class and keep strings whose set of labels includes every class.
:::

::: challenge Pairwise test suites [hard]
Write `all_pairs(levels)`: the set of tuples `(i, j, a, b)` with i < j for every pair of parameters and every pair of their values (parameter i has `levels[i]` values numbered 0..levels[i]−1). Write `covers_all_pairs(levels, tests)`: True (a plain bool) when every such pair appears in at least one test (a test is a list of values, one per parameter); raise `ValueError` if a test has the wrong length or a value out of range. Then write `greedy_suite(levels, seed=0, candidates=100)` that builds a suite greedily as in the lesson: while pairs remain, take the smallest uncovered pair (sorted order), generate `candidates` random tests with that pair forced, keep the one covering the most uncovered pairs, and add it. Use `np.random.default_rng(seed)`. It must cover all pairs; the test checks its size against the lower bound (the product of the two largest level counts).

```python starter
def all_pairs(levels):
    return set()

def covers_all_pairs(levels, tests):
    return True

def greedy_suite(levels, seed=0, candidates=100):
    return [list(t) for t in itertools.product(*[range(n) for n in levels])]

print(len(all_pairs([4] * 6)))
```

```python solution
def all_pairs(levels):
    return {(i, j, a, b) for i, j in itertools.combinations(range(len(levels)), 2)
            for a in range(levels[i]) for b in range(levels[j])}

def _pairs_of(test):
    return {(p, q, test[p], test[q]) for p, q in itertools.combinations(range(len(test)), 2)}

def covers_all_pairs(levels, tests):
    for t in tests:
        if len(t) != len(levels) or any(not 0 <= v < n for v, n in zip(t, levels)):
            raise ValueError(f"test {t} does not match the parameter levels")
    covered = set()
    for t in tests:
        covered |= _pairs_of(t)
    return bool(all_pairs(levels) <= covered)

def greedy_suite(levels, seed=0, candidates=100):
    rng = np.random.default_rng(seed)
    uncovered = all_pairs(levels)
    tests = []
    while uncovered:
        i, j, a, b = min(uncovered)
        best, best_gain = None, -1
        for _ in range(candidates):
            t = [int(rng.integers(n)) for n in levels]
            t[i], t[j] = a, b
            gain = len(_pairs_of(t) & uncovered)
            if gain > best_gain:
                best, best_gain = t, gain
        tests.append(best)
        uncovered -= _pairs_of(best)
    return tests

print(len(all_pairs([4] * 6)))
```

```python test
for _n in ["all_pairs", "covers_all_pairs", "greedy_suite"]:
    assert _n in dir(), f"Define {_n}."
assert len(all_pairs([4] * 6)) == 240 and len(all_pairs([2, 3, 2])) == 6 + 4 + 6, "Value pairs for every parameter pair."
assert (0, 2, 1, 1) in all_pairs([2, 3, 2]) and (2, 0, 1, 1) not in all_pairs([2, 3, 2]), "i < j."
_full = [list(t) for t in itertools.product(range(2), range(3), range(2))]
assert covers_all_pairs([2, 3, 2], _full) is True and covers_all_pairs([2, 3, 2], _full[:3]) is False, "The full matrix covers everything; three tests do not."
for _bad in [[[0, 0]], [[0, 3, 0]]]:
    try:
        covers_all_pairs([2, 3, 2], _bad)
        assert False, f"{_bad} should raise ValueError."
    except ValueError:
        pass
_s = greedy_suite([4] * 6)
assert covers_all_pairs([4] * 6, _s) is True, "The suite must cover all 240 pairs."
assert 16 <= len(_s) <= 30, f"Near the lower bound of 16, far below 4096; got {len(_s)} tests."
_s2 = greedy_suite([3, 2, 5, 2, 3])
assert covers_all_pairs([3, 2, 5, 2, 3], _s2) and len(_s2) <= 22 and len(_s2) >= 15, f"Mixed levels: lower bound 5 × 3 = 15; got {len(_s2)}."
assert greedy_suite([2, 2], seed=1) and covers_all_pairs([2, 2], greedy_suite([2, 2], seed=1)) and len(greedy_suite([2, 2], seed=1)) == 4, "Two parameters need the full 2 × 2."
"SUCCESS: Cover every pair, not every combination: two dozen well-chosen tests stand in for four thousand."
```

Hint: A test with values t covers the pairs (p, q, t[p], t[q]) for all p < q. In the greedy loop, force the smallest uncovered pair into each candidate and count how many still-uncovered pairs it covers.
:::

## What you learned

- Independent choices multiply: a password of length L over A symbols has Aᴸ possibilities, L log₂ A bits; length matters more than alphabet size.
- n items have n! orders and n!/(n − k)! ordered k-selections; factorials outgrow exponentials (Stirling: √(2πn)(n/e)ⁿ), so brute-force ordering fails fast.
- Combinations C(n, k) = n!/(k!(n − k)!) count unordered choices; they form Pascal's triangle and sum to 2ⁿ.
- Inclusion–exclusion counts objects obeying several rules by alternately adding and subtracting the counts that break them.
- Pairwise testing covers every pair of settings with a tiny fraction of the full test matrix; a greedy construction comes close to the lower bound.

The next lesson updates beliefs with evidence: Bayes' theorem, to find which machine caused a fault.
