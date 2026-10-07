# Dynamic programming: tabulation

Memoisation keeps the recursive function and adds a table. **Tabulation** removes the recursion: decide in advance an **order** in which the subproblems can be solved so that every subproblem's ingredients are already in the table when it is reached, and fill the table with loops, smallest subproblems first. This is "bottom-up" dynamic programming. It does the same work as memoisation but with no recursion depth to worry about, lower overhead, and often a chance to keep only the last few rows of the table, saving memory.

This lesson covers:

- converting a memoised recursion into a loop that fills a table;
- keeping only what the next step needs (O(1) space for Fibonacci);
- recovering the actual solution (which coins, which items), not just its value, by tracing back through the table;
- one-dimensional classics: fewest coins, counting combinations, and the longest increasing subsequence.

## From recursion to a table

Every memoised function has the shape "answer(state) = combine(answer(smaller states))". Tabulation asks: in what order can the states be visited so that smaller ones always come first? For Fibonacci, increasing n. So allocate a list, fill in the base cases, and loop. Then notice that `fib[i]` only needs the previous two entries, so the whole list can shrink to two variables. Predict before running: how long does each version take for n = 10,000, and does the memoised recursion survive at all?

```python type
import timeit
from functools import cache

def fib_table(n):
    table = [0] * (n + 1)
    if n > 0:
        table[1] = 1
    for i in range(2, n + 1):
        table[i] = table[i - 1] + table[i - 2]
    return table[n]

def fib_two_variables(n):
    previous, current = 0, 1
    for _ in range(n):
        previous, current = current, previous + current
    return previous

assert fib_table(500) == fib_two_variables(500)
for f in [fib_table, fib_two_variables]:
    seconds = timeit.timeit(lambda: f(10_000), number=10) / 10
    print(f"{f.__name__:<18} n = 10,000: {seconds * 1000:6.2f} ms, result has {len(str(f(10_000)))} digits")
```

The memoised version is not run at n = 10,000: it would recurse 10,000 levels deep, far past Python's limit, and in the browser a deep cached recursion can crash the page outright.

Both loops compute the 2,090-digit answer in milliseconds, with no recursion at all. The two-variable version uses O(1) memory instead of O(n): when a step only looks back a fixed distance, only that much of the table needs keeping.

## The fewest coins, and which coins

The memoisation lesson computed the fewest coins recursively. Bottom-up: `best[a]` is the fewest coins making amount a, and it depends only on smaller amounts, so fill it for a = 0, 1, 2, … in order. To recover **which** coins, also record, for each amount, the coin that achieved the best: then walk back from the target, subtracting that coin each time. Predict before running: which coins make 63 from 1, 3 and 4, and can the table handle 10,000?

```python type
def fewest_coins_table(amount, coins):
    INF = float("inf")
    best = [0] + [INF] * amount
    choice = [None] * (amount + 1)
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and best[a - c] + 1 < best[a]:
                best[a] = best[a - c] + 1
                choice[a] = c
    if best[amount] == INF:
        return None, []
    used, a = [], amount
    while a > 0:
        used.append(choice[a])
        a -= choice[a]
    return best[amount], used

print(fewest_coins_table(63, [1, 3, 4]))
print(fewest_coins_table(7, [2, 4]))
count, used = fewest_coins_table(10_000, [1, 3, 4, 7, 23])
print("10,000 from 1, 3, 4, 7, 23:", count, "coins; the coins used:", sorted(set(used)), "with", used.count(23), "of the 23s")
```

```output
(16, [3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4])
(None, [])
10,000 from 1, 3, 4, 7, 23: 437 coins; the coins used: [4, 7, 23] with 434 of the 23s
```

`choice[a]` is the last coin added in a best solution for a; following it backwards rebuilds one optimal set of coins. This "store the decision, trace back afterwards" step is how every DP recovers its solution.

63 is 15 fours and a three: 16 coins. 7 cannot be made from 2s and 4s. And 10,000 is no problem: 10,000 amounts times 5 coins is 50,000 steps, with no recursion depth at all.

## Counting combinations: loop order matters

How many **ways** can an amount be made from coins, if the order of the coins does not matter (1 + 2 and 2 + 1 are the same way)? Let `ways[a]` count the combinations making a. Process the coins **one at a time**, in the outer loop: after the outer loop has handled coin c, `ways[a]` counts the combinations using only the coins seen so far. Adding coin c, every combination for a − c extends to one for a. Swapping the loops (amounts outer, coins inner) counts **sequences** instead, where order matters, as in the climbing-stairs problem. Predict before running: how many ways to make 10 from coins 1, 2 and 5, counting combinations and counting sequences?

```python type
def combinations(amount, coins):
    ways = [1] + [0] * amount
    for c in coins:
        for a in range(c, amount + 1):
            ways[a] += ways[a - c]
    return ways[amount]

def sequences(amount, coins):
    ways = [1] + [0] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                ways[a] += ways[a - c]
    return ways[amount]

print("10 from 1, 2, 5 as combinations:", combinations(10, [1, 2, 5]))
print("10 from 1, 2, 5 as ordered sequences:", sequences(10, [1, 2, 5]))
print("£1 (100p) from UK coins up to 50p:", combinations(100, [1, 2, 5, 10, 20, 50]))
```

```output
10 from 1, 2, 5 as combinations: 10
10 from 1, 2, 5 as ordered sequences: 128
£1 (100p) from UK coins up to 50p: 4562
```

`ways[0] = 1` counts the single way to make 0: use no coins.

There are 10 combinations but 128 ordered sequences for the same amount and coins: the two loop orders answer genuinely different questions. A pound can be made from coins up to 50p in 4,562 ways. Getting the loop order right by thinking about what each table entry **means** after each step is the core skill of tabulation.

## Longest increasing subsequence

A **subsequence** keeps some items of a list in their original order, not necessarily next to each other. The **longest increasing subsequence** (LIS) of a sequence of prices, heights or scores measures its longest upward trend. Let `length[i]` be the length of the longest increasing subsequence **ending at position i**. It is 1 plus the largest `length[j]` over earlier positions j with a smaller value (or just 1 if there are none). Filling the table left to right takes O(n²), and storing each position's best predecessor lets the subsequence itself be traced back. Predict before running: how long is the longest increasing subsequence of these daily prices (the days need not be consecutive)?

```python type
def longest_increasing(values):
    n = len(values)
    if n == 0:
        return []
    length = [1] * n
    previous = [None] * n
    for i in range(n):
        for j in range(i):
            if values[j] < values[i] and length[j] + 1 > length[i]:
                length[i] = length[j] + 1
                previous[i] = j
    end = max(range(n), key=lambda i: length[i])
    result = []
    while end is not None:
        result.append(values[end])
        end = previous[end]
    return result[::-1]

prices = [10, 9, 2, 5, 3, 7, 101, 18, 4, 19, 20]
print(longest_increasing(prices))
```

```output
[2, 5, 7, 18, 19, 20]
```

`previous[i]` records which earlier position the best subsequence ending at i came from.

The longest increasing subsequence here has 6 items: 2, 5, 7, 18, 19, 20 (other subsequences of the same length exist; this is the one the table found). There is a cleverer O(n log n) method using binary search on "the smallest possible ending value for each length", which is how it is done for long sequences, but the O(n²) table shows the DP thinking plainly.

::: challenge Rob the houses [easy]
A burglar can rob any houses along a street, but never two **next to each other** (the alarms are linked). Write `best_haul(values)` returning the largest total that can be taken, with a bottom-up table or, better, two running variables: the best total for the houses so far, with or without the latest house taken. For each house, the best is either the best up to the previous house (skip this one), or this house's value plus the best up to the house before that.

```python starter
def best_haul(values):
    return 0

print(best_haul([2, 7, 9, 3, 1]))
```

```python solution
def best_haul(values):
    before_previous, previous = 0, 0
    for v in values:
        before_previous, previous = previous, max(previous, before_previous + v)
    return previous

print(best_haul([2, 7, 9, 3, 1]))
```

```python test
import itertools as _it, random as _random, time as _time
assert "best_haul" in dir(), "Keep the function's name as best_haul."
assert best_haul([2, 7, 9, 3, 1]) == 12, "Houses 1, 3 and 5: 2 + 9 + 1 = 12."
assert best_haul([]) == 0 and best_haul([5]) == 5 and best_haul([5, 9]) == 9, "Edge cases."
_r = _random.Random(1)
for _ in range(200):
    _v = [_r.randint(0, 20) for _ in range(_r.randint(0, 10))]
    _want = max(sum(_v[i] for i in range(len(_v)) if _m[i]) for _m in _it.product((0, 1), repeat=len(_v)) if not any(_m[i] and _m[i + 1] for i in range(len(_v) - 1))) if _v else 0
    assert best_haul(_v) == _want, f"Wrong haul for {_v}: expected {_want}."
def _names_in(_f):
    _names, _codes = set(), [getattr(_f, "__wrapped__", _f).__code__]
    while _codes:
        _c = _codes.pop()
        _names.update(_c.co_names)
        _codes.extend(_k for _k in _c.co_consts if hasattr(_k, "co_names"))
    return _names
assert not hasattr(best_haul, "cache_info") and not ({"cache", "lru_cache"} & _names_in(best_haul)), "Use a loop here, not a cached recursion: the large input is far deeper than the browser's stack allows."
_big = [_r.randint(0, 100) for _ in range(200_000)]
_start = _time.perf_counter(); best_haul(_big); _el = _time.perf_counter() - _start
assert _el < 1.5, f"200,000 houses took {_el:.1f} s: one pass with two running values."
"SUCCESS: Each house's best depends only on the two before it, so two variables replace the whole table: O(n) time, O(1) memory, any street length."
```

Hint: Keep `before_previous` and `previous`, both starting at 0. For each value, the new best is `max(previous, before_previous + v)`; then shift: `before_previous, previous = previous, new`.
:::

::: challenge Ways to score [medium]
In a game, a play scores 2, 3 or 7 points. Write `score_ways(total, order_matters)` returning the number of ways to reach exactly `total` points: as **combinations** of plays when `order_matters` is False (2 + 3 and 3 + 2 are the same), or as **sequences** when it is True. Use a bottom-up table of length `total + 1` and the loop order from the lesson that matches each question; no recursion.

```python starter
def score_ways(total, order_matters):
    return 0

print(score_ways(12, False), score_ways(12, True))
```

```python solution
def score_ways(total, order_matters):
    plays = [2, 3, 7]
    ways = [1] + [0] * total
    if order_matters:
        for a in range(1, total + 1):
            for p in plays:
                if p <= a:
                    ways[a] += ways[a - p]
    else:
        for p in plays:
            for a in range(p, total + 1):
                ways[a] += ways[a - p]
    return ways[total]

print(score_ways(12, False), score_ways(12, True))
```

```python test
import itertools as _it
assert "score_ways" in dir(), "Keep the function's name as score_ways."
assert score_ways(12, False) == 4 and score_ways(12, True) == 18, f"12 points: 4 combinations (2×6, 3×4, 2×3+3×2, 2+3+7), 18 sequences; got {score_ways(12, False)} and {score_ways(12, True)}."
assert score_ways(0, False) == 1 and score_ways(0, True) == 1 and score_ways(1, False) == 0, "0 points: one way (no plays); 1 point: none."
for _t in range(0, 16):
    _combos = sum(1 for a in range(_t // 2 + 1) for b in range(_t // 3 + 1) for c in range(_t // 7 + 1) if 2 * a + 3 * b + 7 * c == _t)
    _seqs = sum(1 for k in range(_t // 2 + 1) for s in _it.product((2, 3, 7), repeat=k) if sum(s) == _t) if _t <= 14 else None
    assert score_ways(_t, False) == _combos, f"{_t} points should have {_combos} combinations."
    if _seqs is not None:
        assert score_ways(_t, True) == _seqs, f"{_t} points should have {_seqs} sequences."
_c1000 = sum(1 for c in range(1000 // 7 + 1) for b in range((1000 - 7 * c) // 3 + 1) if (1000 - 7 * c - 3 * b) % 2 == 0)
assert score_ways(1000, False) == _c1000 and score_ways(300, True) > 10**30, "Large totals should work instantly with a table."
"SUCCESS: Plays in the outer loop count each combination once; totals in the outer loop count every ordering. The table entries mean different things, so the answers differ."
```

Hint: Start with `ways = [1] + [0] * total`. For combinations, loop over plays outside and totals inside (from the play's value upward). For sequences, loop over totals outside and plays inside.
:::

::: challenge Maximum subarray in one pass [medium]
The divide and conquer lesson found the largest sum of a contiguous stretch in O(n log n). Dynamic programming does it in O(n): let `best_ending_here` be the largest sum of a stretch **ending** at the current position. It is either the current value alone, or the current value added to the best stretch ending at the previous position, whichever is larger. The answer is the largest `best_ending_here` seen. (This is **Kadane's algorithm**.) Write `max_subarray(values)` for a non-empty list, returning a tuple `(best_sum, start, end)` with the stretch `values[start:end + 1]`; if several stretches tie, return the one that ends earliest, and among those the shortest.

```python starter
def max_subarray(values):
    return 0, 0, 0

print(max_subarray([2, -5, 3, 4, -1, 2, -6, 1]))
```

```python solution
def max_subarray(values):
    best = (values[0], 0, 0)
    current, current_start = values[0], 0
    for i in range(1, len(values)):
        if current + values[i] > values[i]:
            current += values[i]
        else:
            current, current_start = values[i], i
        if current > best[0]:
            best = (current, current_start, i)
    return best

print(max_subarray([2, -5, 3, 4, -1, 2, -6, 1]))
```

```python test
import random as _random, time as _time
assert "max_subarray" in dir(), "Keep the function's name as max_subarray."
assert max_subarray([2, -5, 3, 4, -1, 2, -6, 1]) == (8, 2, 5), "3 + 4 − 1 + 2 = 8, positions 2 to 5."
assert max_subarray([-3, -1, -7]) == (-1, 1, 1) and max_subarray([5]) == (5, 0, 0), "All negative: the largest single value."
_r = _random.Random(3)
for _ in range(300):
    _xs = [_r.randint(-9, 9) for _ in range(_r.randint(1, 12))]
    _s, _a, _b = max_subarray(_xs)
    _want = max(sum(_xs[i:j]) for i in range(len(_xs)) for j in range(i + 1, len(_xs) + 1))
    assert _s == _want, f"Wrong best sum for {_xs}: expected {_want}."
    assert 0 <= _a <= _b < len(_xs) and sum(_xs[_a:_b + 1]) == _s, f"For {_xs}, positions {_a} to {_b} don't add up to {_s}."
assert max_subarray([1, -1, 1]) == (1, 0, 0) and max_subarray([0, 3, -3, 3]) == (3, 1, 1), "Ties: the stretch that ends earliest, and among those the shortest."
_start = _time.perf_counter(); max_subarray([_r.randint(-100, 100) for _ in range(500)]); _el = _time.perf_counter() - _start
assert _el < 0.3, f"500 values took {_el:.1f} s: one pass, keeping the best stretch ending at each position."
_big = [_r.randint(-100, 100) for _ in range(5_000)]
_start = _time.perf_counter(); max_subarray(_big); _el = _time.perf_counter() - _start
assert _el < 0.3, f"5,000 values took {_el:.1f} s: one pass, keeping the best stretch ending at each position."
"SUCCESS: The best stretch ending here either extends the previous best or starts afresh: one pass, O(n), the DP view of a problem divide and conquer solved in O(n log n)."
```

Hint: Track `current` (best sum ending here) and where that stretch starts. If adding the new value to `current` beats the value alone, extend; otherwise start a new stretch at i. Update the overall best only when `current` is strictly larger, which keeps the earliest-ending answer.
:::

## What you learned

- Tabulation fills the DP table with loops in an order where every subproblem's ingredients come first: no recursion, no depth limit, lower overhead.
- When each entry looks back only a fixed distance, keep only those entries: Fibonacci and the house robber need O(1) memory.
- Store each entry's best decision and trace back from the answer to recover the solution itself (which coins, which subsequence).
- Loop order changes the meaning: coins outer counts combinations, amounts outer counts ordered sequences. The longest increasing subsequence and Kadane's maximum subarray are one-dimensional tables too.

The next lesson moves to tables with two dimensions, for problems about two sequences or an item limit and a capacity: longest common subsequence, edit distance and knapsack.
