# Randomised algorithms

The quicksort lesson met a strange idea: making an algorithm **faster** by letting it flip coins. A fixed pivot rule has inputs that make it slow, and anyone who knows the rule can supply them. A random pivot has no bad inputs, only unlucky coin flips, and those are vanishingly rare. This lesson collects the main ways randomness earns its place in algorithms. It defends against bad inputs, it handles data too large to store, and it checks answers far faster than recomputing them, at the price of a tiny, controllable chance of error.

There are two kinds of randomised algorithm. A **Las Vegas** algorithm is always correct, and only its running time depends on luck: randomised quicksort is one. A **Monte Carlo** algorithm always runs fast, but may be wrong with a small probability that you choose. Running it again with fresh coin flips multiplies that probability down.

This lesson covers:

- shuffling correctly with Fisher–Yates, and a plausible-looking shuffle that is biased;
- reservoir sampling: a fair random sample from a stream of unknown length, in fixed memory;
- random hash functions, which no input can defeat in advance;
- Freivalds' check, a Monte Carlo algorithm that verifies a matrix product in O(n²).

Every demo passes a seeded `random.Random(...)` object around instead of using the module-level functions. With the same seed, the "random" choices repeat exactly, which makes experiments and tests reproducible.

## Shuffling fairly

A fair shuffle makes all n! orderings equally likely. The **Fisher–Yates** shuffle walks from the last position down to the second. At each position i, it swaps item i with an item at a random position from 0 to i **inclusive**, which may be i itself. Position i then holds a uniformly random choice from the items not yet placed. That makes n × (n − 1) × … × 1 = n! equally likely paths, one for each ordering.

A common mistake swaps each position with a random position from the **whole** list. That gives nⁿ equally likely paths. For n ≥ 3, nⁿ is not a multiple of n!, because n − 1 divides n! but shares no factor with nⁿ (for n = 3, 27 paths cannot split evenly over 6 orderings). So some orderings must come up more often than others. Predict before running: in 60,000 naive shuffles of `ABC`, how far from 10,000 does the most common ordering get?

```python type
import random
from collections import Counter

def fisher_yates(items, rng):
    for i in range(len(items) - 1, 0, -1):
        j = rng.randint(0, i)
        items[i], items[j] = items[j], items[i]

def naive_shuffle(items, rng):
    for i in range(len(items)):
        j = rng.randrange(len(items))
        items[i], items[j] = items[j], items[i]

rng = random.Random(1)
for shuffle in [fisher_yates, naive_shuffle]:
    counts = Counter()
    for _ in range(60_000):
        items = list("ABC")
        shuffle(items, rng)
        counts["".join(items)] += 1
    print(f"{shuffle.__name__:<13}", dict(sorted(counts.items())))
```

```output
fisher_yates  {'ABC': 9879, 'ACB': 9998, 'BAC': 9952, 'BCA': 9984, 'CAB': 10029, 'CBA': 10158}
naive_shuffle {'ABC': 8926, 'ACB': 11085, 'BAC': 11119, 'BCA': 11082, 'CAB': 8857, 'CBA': 8931}
```

`rng.randint(0, i)` includes both ends; `rng.randrange(n)` gives 0 to n − 1.

Fisher–Yates puts every ordering within about 150 of 10,000, the ordinary wobble of 60,000 random trials. The naive shuffle gives three orderings about 11,100 each (5 of the 27 paths) and the other three about 8,900 (4 of 27): a bias of over 10 percent, built into the method and never fading with more trials. A card game or a randomised experiment using it is unfair. Python's `random.shuffle` uses Fisher–Yates.

## Reservoir sampling

A server writes millions of log lines a day, and an engineer wants 5 lines chosen uniformly at random, reading the log **once**, without storing it, and without knowing in advance how many lines there will be. **Reservoir sampling** does it. Keep the first k items in a list, the reservoir. Then, when item number i arrives (counting from 1), keep it with probability k / i, and if kept, let it replace a uniformly random slot of the reservoir.

Why is this fair? Suppose that after i − 1 items, each has probability k / (i − 1) of being in the reservoir. The new item gets in with probability k / i. An item already there survives this step unless the new item is kept **and** lands on its slot: probability (k / i) × (1 / k) = 1 / i. So it remains with probability k / (i − 1) × (1 − 1/i) = k / i. Every item seen so far is in the reservoir with probability k / i, the same for all, and by induction this holds at every step. The memory is k items, however long the stream. Predict before running: in 30,000 samples of 2 from a stream of 5 items, how often should each item be chosen?

```python type
def reservoir_sample(stream, k, rng):
    reservoir = []
    for i, item in enumerate(stream, start=1):
        if i <= k:
            reservoir.append(item)
        elif rng.random() < k / i:
            reservoir[rng.randrange(k)] = item
    return reservoir

def log_lines(n):
    for number in range(1, n + 1):
        yield f"request {number}: GET /parts/{number % 977}"

rng = random.Random(2)
print(reservoir_sample(log_lines(1_000_000), 5, rng))

counts = Counter()
for _ in range(30_000):
    counts.update(reservoir_sample(iter("VWXYZ"), 2, rng))
print(dict(sorted(counts.items())))
```

```output
['request 970443: GET /parts/282', 'request 315316: GET /parts/722', 'request 235635: GET /parts/178', 'request 305393: GET /parts/569', 'request 924166: GET /parts/901']
{'V': 11874, 'W': 12049, 'X': 12110, 'Y': 12045, 'Z': 11922}
```

`log_lines` is a generator, so the million lines are produced one at a time and never stored: the sample is chosen from a stream that never exists all at once.

Each of the five items should be in 2 / 5 of the samples: 12,000 of 30,000. The counts land within a couple of hundred of that. Fixing k in advance and reading once is exactly the constraint of streams, network monitors and very large files, and reservoir sampling meets it with O(k) memory.

## Random hash functions

The hash tables lesson warned that a bad hash function collapses a table to O(n). A fixed hash function is like a fixed pivot rule: someone who knows it can choose keys that all collide. Here, a table with 1,000 slots uses `key % 1000`, and the keys are order numbers that all happen to be multiples of 1,000. Every key lands in slot 0.

The cure is a **random** hash function, chosen when the table is created, from a family where any two different keys collide with probability about 1 / m. A classic family uses a large prime p and random numbers a and b, with h(x) = ((a·x + b) mod p) mod m. An attacker who does not know a and b cannot pick keys that are likely to collide. Python does the same for strings: their hashes are randomised per process, so the same string gets a different `hash` in each run. Predict before running: how full is the fullest slot under each hash?

```python type
P = (1 << 61) - 1

def make_random_hash(m, rng):
    a, b = rng.randrange(1, P), rng.randrange(P)
    return lambda x: ((a * x + b) % P) % m

keys = [1000 * i for i in range(1, 5001)]
m = 1000
fixed = Counter(k % m for k in keys)
h = make_random_hash(m, random.Random(3))
randomised = Counter(h(k) for k in keys)
print("fixed hash:  slots used", len(fixed), " fullest slot", max(fixed.values()))
print("random hash: slots used", len(randomised), " fullest slot", max(randomised.values()))
print("average keys per slot:", len(keys) / m)
```

```output
fixed hash:  slots used 1  fullest slot 5000
random hash: slots used 1000  fullest slot 6
average keys per slot: 5.0
```

With `key % 1000`, all 5,000 keys share one slot, and every lookup is a search through 5,000 items. The random hash uses all 1,000 slots, with at most 6 keys in any one. That is even better than truly random placement would manage (which leaves a few slots empty and puts a dozen or so in the fullest), because these keys are evenly spaced and the hash spreads an evenly spaced sequence evenly. Most importantly, the attacker's carefully chosen keys are now ordinary keys.

## Monte Carlo: checking a matrix product

Someone claims that C = A × B for three n × n matrices. Recomputing A × B costs about n³ multiplications. **Freivalds' algorithm** checks the claim in O(n²). Pick a random vector r of 0s and 1s, and compare A(Br) with Cr. Each side is just matrix-times-vector products, n² work each. If C really is A × B, the two always agree. If C is wrong, then D = AB − C is a non-zero matrix, and a random 0/1 vector has at most a 1/2 chance of landing where Dr = 0. So each trial catches a wrong C with probability at least 1/2. Twenty independent trials miss it with probability at most 2⁻²⁰, about one in a million.

This is the Monte Carlo trade: an answer of "correct" might be wrong with a probability you choose, but an answer of "wrong" is always right. Predict before running: does a single wrong entry among 360,000 get caught?

```python type
import numpy as np, time

def freivalds(A, B, C, trials, rng):
    n = C.shape[1]
    for _ in range(trials):
        r = rng.integers(0, 2, size=n)
        if not np.array_equal(A @ (B @ r), C @ r):
            return False
    return True

nrng = np.random.default_rng(4)
n = 600
A = nrng.integers(-9, 10, size=(n, n))
B = nrng.integers(-9, 10, size=(n, n))
C = A @ B
C_wrong = C.copy()
C_wrong[123, 456] += 1

start = time.perf_counter(); A @ B; t_full = time.perf_counter() - start
start = time.perf_counter(); ok = freivalds(A, B, C, 20, nrng); t_check = time.perf_counter() - start
print(f"recompute A @ B: {t_full:.3f} s;  20 Freivalds trials: {t_check:.3f} s, verdict {ok}")
print("wrong C caught:", not freivalds(A, B, C_wrong, 20, nrng))
caught = sum(not freivalds(A, B, C_wrong, 1, nrng) for _ in range(1000))
print("single trials that catch the wrong entry:", caught, "of 1000")
```

The matrices hold whole numbers, so the comparison can be exact with `np.array_equal`; with floating-point values a check would need a tolerance.

Twenty trials check the true product faster than recomputing it, and the gap widens as n grows, n² against n³. The wrong C is caught. One wrong entry is caught by any trial whose random vector has a 1 in the wrong column. That happens half the time, and the count of about 500 in 1,000 trials shows exactly the 1/2 the argument promised. The same pattern, a fast random test with one-sided error repeated until the doubt is negligible, is how computers check that 300-digit numbers are prime (the Miller–Rabin test) before using them in encryption.

::: challenge A fair shuffle [easy]
Write `fisher_yates_shuffle(items, rng)` that shuffles the list `items` **in place** fairly, using only `rng.randint` (or `rng.randrange`) from the `random.Random` object passed in. Do not call `random.shuffle`, `rng.shuffle` or `sample`: the test checks that every ordering is equally likely, so write the algorithm yourself. Return nothing.

```python starter
import random

def fisher_yates_shuffle(items, rng):
    pass

cards = ["A", "K", "Q", "J"]
fisher_yates_shuffle(cards, random.Random(5))
print(cards)
```

```python solution
import random

def fisher_yates_shuffle(items, rng):
    for i in range(len(items) - 1, 0, -1):
        j = rng.randint(0, i)
        items[i], items[j] = items[j], items[i]

cards = ["A", "K", "Q", "J"]
fisher_yates_shuffle(cards, random.Random(5))
print(cards)
```

```python test
import random as _random
from collections import Counter as _Counter
assert "fisher_yates_shuffle" in dir(), "Keep the function's name as fisher_yates_shuffle."
for _banned in [".shuffle(", "sample(", "permutations"]:
    assert _banned not in _source, f"Write the swaps yourself instead of using {_banned.strip('.(')}."
_items = list(range(10))
assert fisher_yates_shuffle(_items, _random.Random(1)) is None, "Shuffle in place and return nothing."
assert sorted(_items) == list(range(10)), f"A shuffle must keep every item exactly once; got {_items}."
_e = []; fisher_yates_shuffle(_e, _random.Random(1)); _one = [7]; fisher_yates_shuffle(_one, _random.Random(1))
assert _e == [] and _one == [7], "Empty and one-item lists stay as they are."
_rng = _random.Random(2)
_counts = _Counter()
for _ in range(48_000):
    _x = list("ABCD")
    fisher_yates_shuffle(_x, _rng)
    _counts["".join(_x)] += 1
assert len(_counts) == 24, f"All 24 orderings of ABCD should appear; only {len(_counts)} did."
_lo, _hi = min(_counts.values()), max(_counts.values())
assert _lo > 1700 and _hi < 2300, f"Each of the 24 orderings should come up about 2,000 times in 48,000 shuffles; counts ranged from {_lo} to {_hi}. Swap position i with a random position from 0 to i, working down from the end."
"SUCCESS: Every ordering came up about 2,000 times in 48,000 shuffles: n! equally likely swap paths, one per ordering."
```

Hint: Loop `i` from `len(items) - 1` down to 1. Pick `j = rng.randint(0, i)`, which includes i itself, and swap `items[i]` with `items[j]`. Picking j from the whole list instead looks similar but is biased.
:::

::: challenge Sampling a stream [medium]
Write `sample_stream(stream, k, rng)` returning a list of `k` items chosen uniformly at random from the iterable `stream`, which may be far too long to store and whose length is not known in advance. Read it once, keep at most `k` items, and use only `rng.random()` and `rng.randrange()`. If the stream has fewer than k items, return all of them.

```python starter
import random

def sample_stream(stream, k, rng):
    return []

print(sample_stream(range(1, 1_000_001), 3, random.Random(6)))
```

```python solution
import random

def sample_stream(stream, k, rng):
    reservoir = []
    for i, item in enumerate(stream, start=1):
        if i <= k:
            reservoir.append(item)
        elif rng.random() < k / i:
            reservoir[rng.randrange(k)] = item
    return reservoir

print(sample_stream(range(1, 1_000_001), 3, random.Random(6)))
```

```python test
import random as _random, tracemalloc as _tm
from collections import Counter as _Counter
assert "sample_stream" in dir(), "Keep the function's name as sample_stream."
_r = sample_stream(iter([1, 2]), 5, _random.Random(1))
assert sorted(_r) == [1, 2], f"With fewer than k items, return them all; got {_r}."
_r = sample_stream(iter(range(100)), 10, _random.Random(1))
assert len(_r) == 10 and len(set(_r)) == 10 and all(0 <= _x < 100 for _x in _r), f"Return 10 different items from the stream; got {_r}."
_rng = _random.Random(3)
_counts = _Counter()
for _ in range(20_000):
    _counts.update(sample_stream(iter("PQRSTUVW"), 3, _rng))
assert set(_counts) == set("PQRSTUVW"), "Every item should sometimes be chosen."
_lo, _hi = min(_counts.values()), max(_counts.values())
assert _lo > 7_000 and _hi < 8_000, f"Each of 8 items should be in 3/8 of 20,000 samples (7,500 times); counts ranged from {_lo} to {_hi}."
def _endless():
    _n = 0
    while _n < 500_000:
        _n += 1
        yield _n
_tm.start()
_r = sample_stream(_endless(), 5, _random.Random(4))
_peak = _tm.get_traced_memory()[1]
_tm.stop()
assert len(_r) == 5 and _peak < 2_000_000, f"Sampling 5 items from 500,000 used {_peak / 1e6:.1f} MB at its peak. Keep only the reservoir, not the stream."
"SUCCESS: Each item ends up in the sample with probability k / n, using memory for k items however long the stream."
```

Hint: Number the items from 1 with `enumerate(stream, start=1)`. Fill the reservoir with the first k. After that, keep item i when `rng.random() < k / i`, and put it in slot `rng.randrange(k)`.
:::

::: challenge Counting distinct visitors [hard]
A website wants the number of **distinct** visitors in a stream of millions of visits, without storing every visitor ID. The **k-minimum values** sketch does it with memory for only k numbers. Hash each ID to a number in [0, 1) that looks uniformly random (the provided `unit_hash`). The same ID always gives the same number, so repeats do not matter. If there are D distinct IDs, their D hash values are spread evenly over [0, 1), so the k-th smallest of them is close to k / (D + 1). Keep only the k **smallest distinct** hash values seen. At the end, if the k-th smallest is v, estimate D as (k − 1) / v (using k − 1 rather than k makes the estimate unbiased). If fewer than k distinct values were seen, the count is exact: return how many there are. Write `estimate_distinct(stream, k)`, using a heap to keep the k smallest values (a max-heap of size k, by storing negated values in `heapq`) and a set of the values currently kept, so a repeated ID is not added twice.

```python starter
import hashlib, heapq

def unit_hash(item):
    digest = hashlib.blake2b(str(item).encode(), digest_size=8).digest()
    return int.from_bytes(digest, "big") / 2**64

def estimate_distinct(stream, k):
    return 0

visits = (f"user{(i * 7919) % 30_000}" for i in range(200_000))
print(round(estimate_distinct(visits, 256)))
```

```python solution
import hashlib, heapq

def unit_hash(item):
    digest = hashlib.blake2b(str(item).encode(), digest_size=8).digest()
    return int.from_bytes(digest, "big") / 2**64

def estimate_distinct(stream, k):
    heap, kept = [], set()
    for item in stream:
        v = unit_hash(item)
        if v in kept:
            continue
        if len(heap) < k:
            heapq.heappush(heap, -v)
            kept.add(v)
        elif v < -heap[0]:
            kept.discard(-heapq.heappushpop(heap, -v))
            kept.add(v)
    if len(heap) < k:
        return len(heap)
    return (k - 1) / -heap[0]

visits = (f"user{(i * 7919) % 30_000}" for i in range(200_000))
print(round(estimate_distinct(visits, 256)))
```

```python test
import tracemalloc as _tm
assert "estimate_distinct" in dir() and "unit_hash" in dir(), "Keep the names estimate_distinct and unit_hash."
assert estimate_distinct(iter(["a", "b", "a", "c", "b"]), 10) == 3, "Fewer than k distinct IDs: return the exact count, 3."
assert estimate_distinct(iter([]), 5) == 0, "An empty stream has no visitors."
assert estimate_distinct(iter(["x"] * 1000), 4) == 1, "One visitor seen 1,000 times is one visitor."
for _d, _visits in [(5_000, 40_000), (20_000, 60_000), (50_000, 50_000)]:
    _stream = (f"v{(_i * 104729) % _d}" for _i in range(_visits))
    _est = estimate_distinct(_stream, 256)
    assert abs(_est - _d) / _d < 0.2, f"With {_d:,} distinct visitors the estimate was {_est:,.0f}, more than 20% off. Estimate (k - 1) / v from the k-th smallest distinct hash v."
_est_dup = estimate_distinct((f"v{_i % 5_000}" for _i in range(40_000)), 256)
_est_once = estimate_distinct((f"v{_i}" for _i in range(5_000)), 256)
assert abs(_est_dup - _est_once) < 1e-9, "Repeating the same IDs must not change the estimate: skip a hash value already kept."
def _gen():
    for _i in range(120_000):
        yield f"u{_i % 40_000}"
_tm.start()
_est = estimate_distinct(_gen(), 256)
_peak = _tm.get_traced_memory()[1]
_tm.stop()
assert abs(_est - 40_000) / 40_000 < 0.2, f"40,000 distinct visitors were estimated as {_est:,.0f}."
assert _peak < 1_000_000, f"The sketch used {_peak / 1e6:.1f} MB at its peak. Keep only the k smallest hash values, not every ID."
"SUCCESS: 256 numbers estimate counts in the tens of thousands to within about 10 percent: the smallest hash values reveal how densely the distinct IDs fill [0, 1)."
```

Hint: Keep `heap` (negated values, so `-heap[0]` is the largest of the k kept) and `kept` (a set of those values). For each ID, compute `v = unit_hash(item)` and skip it if `v in kept`. While the heap has fewer than k values, push. Otherwise, if v is smaller than the largest kept, `heappushpop` it in, and remove the value that comes out from `kept`. At the end, return `len(heap)` if it never filled up, else `(k - 1) / -heap[0]`.
:::

## What you learned

- Las Vegas algorithms are always right and only their time is random; Monte Carlo algorithms are always fast and wrong with a probability you can drive down by repeating them.
- Fisher–Yates swaps position i with a random position from 0 to i, giving n! equally likely paths. Swapping with any position gives nⁿ paths and a built-in bias.
- Reservoir sampling keeps item i with probability k / i in a random slot, so every item of a stream of unknown length ends up in the sample with probability k / n, in O(k) memory.
- A hash function chosen at random, such as ((a·x + b) mod p) mod m, has no bad inputs that can be prepared in advance.
- Freivalds' check compares A(Br) with Cr for random 0/1 vectors: O(n²) per trial, never rejects a correct product, and misses a wrong one with probability at most 1/2 per trial.

The next lesson leaves algorithms for design: why some code is easy to change and some resists every change, and the ideas of coupling and cohesion that explain the difference.
