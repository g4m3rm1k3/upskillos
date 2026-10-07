# Prefix sums

If you will ask many questions of the form "what is the total from position i to position j?", add things up **once**, in advance. A **prefix sum** array stores, at each position, the total of everything before it. Then any range's total is the difference of two stored numbers: O(1) per question after O(n) of preparation. The idea is tiny, but it powers a surprising range of techniques: two-dimensional range sums on images, counting stretches with an exact sum (even with negative numbers, which defeated the sliding window), and its mirror image, the **difference array**, which applies many range updates cheaply.

This lesson covers:

- building prefix sums, and answering range sums with one subtraction;
- two-dimensional prefix sums (summed-area tables);
- counting subarrays with a given sum, using a dictionary of prefix sums seen so far;
- difference arrays: adding to whole ranges in O(1) each.

## One subtraction per range

Define `prefix[0] = 0` and `prefix[i + 1] = prefix[i] + values[i]`, so `prefix[i]` is the sum of the first i values. Then the sum of `values[lo:hi]` (positions lo up to hi − 1, in Python's half-open style) is `prefix[hi] - prefix[lo]`: everything before hi, minus everything before lo. The extra 0 at the front means no special case is needed for ranges starting at 0. Predict before running: what is the total rainfall for days 10 to 19, and how does the prefix-sum answer compare with summing directly?

```python type
from itertools import accumulate
import random

random.seed(1)
rain = [round(max(0, random.gauss(2, 3)), 1) for _ in range(365)]

prefix = [0]
for r in rain:
    prefix.append(prefix[-1] + r)

def range_total(lo, hi):
    return prefix[hi] - prefix[lo]

print(f"days 10-19: {range_total(10, 20):.1f} mm  (direct sum {sum(rain[10:20]):.1f})")
print(f"whole year: {range_total(0, 365):.1f} mm")
print("accumulate gives the same running totals:", list(accumulate(rain, initial=0))[:5] == prefix[:5])

monthly_lengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
month_starts = list(accumulate(monthly_lengths, initial=0))
wettest = max(range(12), key=lambda m: range_total(month_starts[m], month_starts[m + 1]))
print("wettest month:", wettest + 1, f"with {range_total(month_starts[wettest], month_starts[wettest + 1]):.1f} mm")
```

```output
days 10-19: 27.4 mm  (direct sum 27.4)
whole year: 974.7 mm
accumulate gives the same running totals: True
wettest month: 6 with 100.9 mm
```

`itertools.accumulate(values, initial=0)` builds the same running totals in one call. Note that prefix sums of the month lengths are the day each month starts: prefix sums turn up everywhere.

The prefix-sum answer equals the direct sum (both rounded to one decimal place, since floating-point additions can differ in the last digits). Twelve month totals cost twelve subtractions. The catch, from the segment trees lesson, is updates: changing one day's rainfall changes every prefix after it, O(n). Prefix sums are for data that is fixed while it is being questioned.

## Two dimensions

The same idea works on a grid: let `P[r][c]` be the sum of every cell above and to the left of (r, c), that is, rows 0 to r − 1 and columns 0 to c − 1. Building it uses **inclusion-exclusion**: `P[r + 1][c + 1] = grid[r][c] + P[r][c + 1] + P[r + 1][c] - P[r][c]`, because the top-left block is counted twice by the two neighbours. Any rectangle's sum is then four lookups: the whole block to its bottom-right corner, minus the block above it, minus the block to its left, plus the top-left block that was subtracted twice. This **summed-area table** is how image-processing code blurs and detects features quickly. Predict before running: which 3 × 3 region of this field has the most plants?

```python type
field = [
    [1, 0, 2, 0, 1, 3],
    [0, 4, 1, 0, 0, 2],
    [2, 1, 5, 3, 0, 0],
    [0, 0, 4, 6, 2, 1],
    [1, 2, 0, 1, 0, 0],
]
rows, cols = len(field), len(field[0])
P = [[0] * (cols + 1) for _ in range(rows + 1)]
for r in range(rows):
    for c in range(cols):
        P[r + 1][c + 1] = field[r][c] + P[r][c + 1] + P[r + 1][c] - P[r][c]

def rectangle(r1, c1, r2, c2):
    return P[r2][c2] - P[r1][c2] - P[r2][c1] + P[r1][c1]

best = max(((rectangle(r, c, r + 3, c + 3), r, c) for r in range(rows - 2) for c in range(cols - 2)))
print("best 3 × 3 region: total", best[0], "with its top-left corner at row", best[1], "column", best[2])
print("check by direct sum:", sum(field[r][c] for r in range(best[1], best[1] + 3) for c in range(best[2], best[2] + 3)))
```

```output
best 3 × 3 region: total 24 with its top-left corner at row 1 column 1
check by direct sum: 24
```

`rectangle(r1, c1, r2, c2)` sums rows r1 to r2 − 1 and columns c1 to c2 − 1, half-open in both directions.

The richest 3 × 3 region has 24 plants, with its corner at row 1, column 1, and the direct sum agrees. Every one of the 12 regions cost four lookups, however large the regions are.

## Subarrays with an exact sum

How many contiguous stretches of a list add up to exactly k? With negative numbers allowed, the sliding window fails (a window can stop and start matching again as it grows). Prefix sums give a clean O(n) answer. A stretch from position i to j − 1 sums to k exactly when `prefix[j] - prefix[i] == k`, that is, `prefix[i] == prefix[j] - k`. So scan j from left to right, keeping a dictionary counting how many times each prefix sum has been seen so far; at each j, the number of stretches ending there with sum k is how many earlier prefix sums equal `prefix[j] - k`. Predict before running: how many stretches of `[3, 4, -7, 1, 3, 3, 1, -4]` sum to 7?

```python type
def count_sum_k(values, k):
    seen = {0: 1}
    running, count = 0, 0
    for v in values:
        running += v
        count += seen.get(running - k, 0)
        seen[running] = seen.get(running, 0) + 1
    return count

values = [3, 4, -7, 1, 3, 3, 1, -4]
brute = [(i, j) for i in range(len(values)) for j in range(i + 1, len(values) + 1) if sum(values[i:j]) == 7]
print("prefix-sum count:", count_sum_k(values, 7))
print("brute force finds", len(brute), "stretches:", [values[i:j] for i, j in brute])
```

```output
prefix-sum count: 4
brute force finds 4 stretches: [[3, 4], [3, 4, -7, 1, 3, 3], [1, 3, 3], [3, 3, 1]]
```

`seen` starts with `{0: 1}`: the empty prefix, before any value, so that stretches starting at position 0 are counted.

Four stretches sum to 7, including one that runs through the −7. The method is the same "remember what you have seen" pattern as the two-sum dictionary from the Big-O lesson, applied to running totals instead of values.

## Difference arrays: many range updates

Now the reverse problem: many **updates** to whole ranges ("add 5 to every day from 30 to 60"), and then the final values. Doing each update directly costs the length of the range. A **difference array** stores, at each position, how much the value changes from the previous position. Adding x to the range lo to hi − 1 then changes just two entries: `diff[lo] += x` (the values jump up at lo) and `diff[hi] -= x` (and drop back at hi). After all the updates, a prefix sum of `diff` rebuilds the values. Predict before running: on a 10-seat train, if these bookings each reserve seats over a range of stops, which stretch is busiest?

```python type
stops = 8
bookings = [(0, 3, 4), (1, 5, 2), (2, 6, 3), (4, 8, 5), (5, 7, 1)]
diff = [0] * (stops + 1)
for first, last_exclusive, seats in bookings:
    diff[first] += seats
    diff[last_exclusive] -= seats
on_board = list(accumulate(diff[:stops]))
print("passengers on board between each stop:", on_board)
print("busiest leg:", on_board.index(max(on_board)), "with", max(on_board), "passengers")

direct = [0] * stops
for first, last_exclusive, seats in bookings:
    for s in range(first, last_exclusive):
        direct[s] += seats
print("direct calculation agrees:", direct == on_board)
```

```output
passengers on board between each stop: [4, 6, 9, 5, 10, 9, 6, 5]
busiest leg: 4 with 10 passengers
direct calculation agrees: True
```

Each booking `(first, last_exclusive, seats)` occupies seats from stop `first` up to, but not including, stop `last_exclusive`, where the passengers get off.

Each booking touched two entries, and one prefix sum at the end gave the load on every leg: the busiest leg, from stop 4 to stop 5, carries 10 passengers, filling the train. With m bookings over n stops, that is O(m + n) instead of O(m × n). Prefix sums and difference arrays are inverses: one turns values into running totals, the other turns running totals back into changes.

::: challenge A range-sum helper [easy]
Write a class `RangeSums` whose constructor builds the prefix sums of a list of numbers, with a method `total(lo, hi)` returning the sum of positions lo up to and including hi, in O(1), and `average(lo, hi)` returning the average of those positions. Don't keep or sum the original list in the methods.

```python starter
class RangeSums:
    def __init__(self, values):
        pass

    def total(self, lo, hi):
        return 0

    def average(self, lo, hi):
        return 0.0

r = RangeSums([4, 8, 15, 16, 23, 42])
print(r.total(1, 3), r.average(0, 5))
```

```python solution
class RangeSums:
    def __init__(self, values):
        self.prefix = [0]
        for v in values:
            self.prefix.append(self.prefix[-1] + v)

    def total(self, lo, hi):
        return self.prefix[hi + 1] - self.prefix[lo]

    def average(self, lo, hi):
        return self.total(lo, hi) / (hi - lo + 1)

r = RangeSums([4, 8, 15, 16, 23, 42])
print(r.total(1, 3), r.average(0, 5))
```

```python test
import random as _random, time as _time
assert "RangeSums" in dir(), "Keep the class name RangeSums."
_r = RangeSums([4, 8, 15, 16, 23, 42])
assert _r.total(1, 3) == 39 and _r.total(0, 0) == 4 and _r.total(0, 5) == 108, "Totals of positions 1-3, 0-0 and 0-5 should be 39, 4 and 108."
assert abs(_r.average(0, 5) - 18) < 1e-9 and abs(_r.average(4, 5) - 32.5) < 1e-9, "Averages should be 18 and 32.5."
_g = _random.Random(1); _vals = [_g.randint(-50, 50) for _ in range(60)]; _rs = RangeSums(_vals)
for _ in range(300):
    _lo = _g.randrange(60); _hi = _g.randint(_lo, 59)
    assert _rs.total(_lo, _hi) == sum(_vals[_lo:_hi + 1]), f"total({_lo}, {_hi}) is wrong."
_big = RangeSums(list(range(200_000)))
_start = _time.perf_counter()
for _ in range(20_000):
    _big.total(0, 199_999)
    if _time.perf_counter() - _start > 1:
        break
assert _time.perf_counter() - _start < 1, "20,000 full-range totals should be instant: one subtraction each."
"SUCCESS: O(n) once to build, O(1) for every question afterwards: the trade at the heart of all precomputation."
```

Hint: Build `self.prefix` with a leading 0. The inclusive range lo..hi is `prefix[hi + 1] - prefix[lo]`.
:::

::: challenge Longest balanced stretch [medium]
A sequence of match results is a list of `"W"` (win) and `"L"` (loss). Write `longest_balanced(results)` returning the length of the longest contiguous stretch with **equally many** wins and losses. Count W as +1 and L as −1: a stretch is balanced when its sum is 0, that is, when the running total at its end equals the running total at its start. Keep a dictionary of the **first** position at which each running total appeared (with total 0 at position 0), so that each later return to the same total gives the longest balanced stretch ending there. O(n).

```python starter
def longest_balanced(results):
    return 0

print(longest_balanced(list("WWLLWLLLW")))
```

```python solution
def longest_balanced(results):
    first_seen = {0: 0}
    running, best = 0, 0
    for i, r in enumerate(results, start=1):
        running += 1 if r == "W" else -1
        if running in first_seen:
            best = max(best, i - first_seen[running])
        else:
            first_seen[running] = i
    return best

print(longest_balanced(list("WWLLWLLLW")))
```

```python test
import random as _random, time as _time
assert "longest_balanced" in dir(), "Keep the function's name as longest_balanced."
assert longest_balanced(list("WWLLWLLLW")) == 6, "W W L L W L is balanced (3 each) and nothing longer is."
assert longest_balanced([]) == 0 and longest_balanced(["W", "W"]) == 0, "No balanced stretch: 0."
assert longest_balanced(list("WL")) == 2 and longest_balanced(list("LLWW")) == 4, "Whole sequences can be balanced."
_r = _random.Random(2)
for _ in range(300):
    _xs = [_r.choice("WL") for _ in range(_r.randint(0, 14))]
    _want = max((j - i for i in range(len(_xs) + 1) for j in range(i, len(_xs) + 1) if _xs[i:j].count("W") * 2 == j - i), default=0)
    assert longest_balanced(_xs) == _want, f"Wrong answer for {''.join(_xs)}: expected {_want}."
_big = [_r.choice("WL") for _ in range(5_000)]
_start = _time.perf_counter(); longest_balanced(_big); _el = _time.perf_counter() - _start
assert _el < 0.3, f"5,000 results took {_el:.1f} s: one pass with a dictionary of first positions."
"SUCCESS: Equal running totals at two positions mean a zero-sum stretch between them; remembering each total's first appearance gives the longest."
```

Hint: Walk through the results keeping the running total. If the total has been seen before, the stretch from its first position to here is balanced; otherwise record this as its first position. Start the dictionary with `{0: 0}`.
:::

::: challenge Busiest moment [medium]
Visits to a website are given as `(arrive, leave)` pairs of whole-number minutes from 0 to 1,439, with a visitor present from `arrive` up to but not including `leave` (at most 1,440). Write `peak_visitors(visits)` returning a pair `(most_present, first_minute)`: the largest number of visitors present at once, and the first minute at which it happens. Use a difference array of length 1,441 and one prefix sum; don't loop over each visit's minutes.

```python starter
from itertools import accumulate

def peak_visitors(visits):
    return 0, 0

print(peak_visitors([(10, 20), (15, 25), (18, 19), (24, 30)]))
```

```python solution
from itertools import accumulate

def peak_visitors(visits):
    diff = [0] * 1441
    for arrive, leave in visits:
        diff[arrive] += 1
        diff[leave] -= 1
    present = list(accumulate(diff[:1440]))
    most = max(present)
    return most, present.index(most)

print(peak_visitors([(10, 20), (15, 25), (18, 19), (24, 30)]))
```

```python test
import random as _random, time as _time
assert "peak_visitors" in dir(), "Keep the function's name as peak_visitors."
assert peak_visitors([(10, 20), (15, 25), (18, 19), (24, 30)]) == (3, 18), "Three visitors overlap at minute 18."
assert peak_visitors([]) == (0, 0), "No visits: nobody present, first at minute 0."
assert peak_visitors([(0, 1440)]) == (1, 0) and peak_visitors([(5, 6), (6, 7)]) == (1, 5), "A visitor leaving at minute 6 is gone when the next arrives at 6."
_r = _random.Random(3)
for _ in range(100):
    _vs = []
    for _ in range(_r.randint(0, 12)):
        _a = _r.randint(0, 1430); _vs.append((_a, _r.randint(_a + 1, min(1440, _a + 60))))
    _counts = [sum(1 for a, b in _vs if a <= m < b) for m in range(1440)]
    assert peak_visitors(_vs) == (max(_counts), _counts.index(max(_counts))), f"Wrong answer for {_vs}."
_many = [(_a, _a + 600) for _a in (_r.randint(0, 800) for _ in range(50_000))]
_start = _time.perf_counter(); peak_visitors(_many); _el = _time.perf_counter() - _start
assert _el < 1.0, f"50,000 long visits took {_el:.1f} s: mark two entries per visit, not every minute."
"SUCCESS: Two marks per visit and one running total: the busiest minute of a day of traffic in O(visits + minutes)."
```

Hint: For each visit, `diff[arrive] += 1` and `diff[leave] -= 1`. The prefix sums of `diff[:1440]` give the number present each minute; take the maximum and the first index where it occurs.
:::

## What you learned

- A prefix sum array (with a leading 0) gives any range's total as one subtraction, after O(n) preparation; `itertools.accumulate` builds it.
- In two dimensions, a summed-area table gives any rectangle's sum from four lookups, using inclusion-exclusion.
- Counting or finding stretches with an exact sum works even with negative numbers: look up earlier prefix sums in a dictionary.
- A difference array applies a range update by changing two entries; one prefix sum at the end rebuilds the values. It is the inverse of the prefix sum.

The next lesson keeps a stack or deque in a special sorted order to answer "next greater element" and "maximum in every window" in linear time: monotonic stacks and queues.
