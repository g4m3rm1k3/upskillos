# Binary search

Looking for a word in a dictionary, nobody starts at "aardvark" and reads forwards. You open the book near the middle, see whether the word comes before or after that page, and throw away the half it cannot be in. Each look halves what is left, so even a dictionary of a million entries needs only about 20 looks. That is **binary search**, and it works on any **sorted** sequence: O(log n) instead of the O(n) of checking items one by one.

The idea is simple; the code is famously easy to get wrong. When Jon Bentley asked professional programmers to write one, about 90% of their versions had bugs, most of them at the boundaries. The cure is the previous lesson's tool: state the invariant precisely, and let it dictate every line. This lesson covers:

- the classic search, with its invariant;
- the **boundary** versions that find the first or last position satisfying a condition, which are what real problems need;
- Python's `bisect` module;
- **binary search on the answer**: searching over possible answers rather than over a list.

## The classic search

Keep two indices, `lo` and `hi`, with the invariant: **if the target is in the list at all, it is at a position from `lo` to `hi`** (both included). Initially that is the whole list. Look at the middle position `mid`. If the item there is the target, done. If it is smaller, the target can only be to its right, so `lo = mid + 1`; if larger, `hi = mid - 1`. Both moves keep the invariant and shrink the range. When `lo > hi` the range is empty, and by the invariant the target is not there. Predict before running: how many steps to search a million sorted numbers, for a number that is present and for one that is not?

```python type
def binary_search(items, target):
    lo, hi = 0, len(items) - 1
    steps = 0
    while lo <= hi:
        steps += 1
        mid = (lo + hi) // 2
        if items[mid] == target:
            return mid, steps
        if items[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1, steps

numbers = list(range(0, 2_000_000, 2))
for target in [0, 777_776, 1_999_998, 777_777, -5]:
    print(f"target {target:>9,}: position {binary_search(numbers, target)[0]:>7,} after {binary_search(numbers, target)[1]} steps")
```

```output
target         0: position       0 after 19 steps
target   777,776: position 388,888 after 19 steps
target 1,999,998: position 999,999 after 20 steps
target   777,777: position      -1 after 20 steps
target        -5: position      -1 after 19 steps
```

The list holds the even numbers below two million: a million items. An odd target is never present.

Every search takes at most 20 steps, because 2²⁰ is just over a million: each step halves the range, and a range of a million is down to nothing after 20 halvings. Searching linearly would take up to a million steps. The `+ 1` and `- 1` matter: `mid` itself has been checked, so it is excluded from the new range. Writing `lo = mid` instead can loop for ever, because when `hi = lo + 1`, `mid` equals `lo` and the range never shrinks.

## Boundary searches

The classic version answers "is it here?" Real questions are more often about **boundaries**: where does the first value of at least 50 start? How many values are below 100? Where should a new value be inserted to keep the list sorted? With duplicates, "find any 7" is less useful than "find the first 7".

All of these are one problem in disguise. For a sorted list and a condition that is false for a while and then true for the rest (like `x >= 50`), find the **first position where it becomes true**. The clean way to write it uses a **half-open** range `[lo, hi)`, which includes `lo` but not `hi`, with the invariant: **the condition is false everywhere before `lo`, true everywhere from `hi` on, and the boundary lies in `[lo, hi]`**. Start with `lo = 0`, `hi = n`; stop when `lo == hi`, which is the answer. Predict before running: in `[1, 3, 3, 3, 5, 8]`, what is the first position whose value is at least 3, and at least 4, and at least 9?

```python type
def first_true(n, condition):
    lo, hi = 0, n
    while lo < hi:
        mid = (lo + hi) // 2
        if condition(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo

values = [1, 3, 3, 3, 5, 8]
for t in [3, 4, 9, 0]:
    at_least = first_true(len(values), lambda i: values[i] >= t)
    above = first_true(len(values), lambda i: values[i] > t)
    print(f"t = {t}: first position >= t is {at_least}, first position > t is {above}, so t occurs {above - at_least} times")
```

```output
t = 3: first position >= t is 1, first position > t is 4, so t occurs 3 times
t = 4: first position >= t is 4, first position > t is 4, so t occurs 0 times
t = 9: first position >= t is 6, first position > t is 6, so t occurs 0 times
t = 0: first position >= t is 0, first position > t is 0, so t occurs 0 times
```

`condition` is a function of a position, so `first_true` works for any condition that switches from false to true once; it never looks at the list directly.

The first value of at least 3 is at position 1; the first value above 3 is at position 4; the difference, 3, counts the 3s. For t = 4 both give position 4 (the count is 0), and that is also exactly where 4 would be inserted. For t = 9 the answer is 6, the length of the list, meaning "nowhere": the half-open range allows that answer naturally. Notice `hi = mid` (not `mid - 1`): position `mid` satisfies the condition, so it may be the answer and must stay in range. The loop still always shrinks the range, because `mid` is strictly less than `hi`.

## Python's bisect

These two boundary searches are in the standard library: `bisect.bisect_left(a, x)` is the first position with value ≥ x, and `bisect.bisect_right(a, x)` the first with value > x. `bisect.insort(a, x)` inserts x in sorted position (finding the place in O(log n), though the insertion itself still shifts items, O(n)). Predict before running: how many scores fall in the range 70 to 79?

```python type
import bisect
import random

random.seed(1)
scores = sorted(random.randint(0, 100) for _ in range(40))
print(scores)
in_70s = bisect.bisect_right(scores, 79) - bisect.bisect_left(scores, 70)
print("scores from 70 to 79:", in_70s, "  check:", sum(70 <= s <= 79 for s in scores))

def grade(score, boundaries=[50, 60, 70, 80], letters="FDCBA"):
    return letters[bisect.bisect_right(boundaries, score)]

print([grade(s) for s in [33, 50, 59, 60, 79, 80, 100]])
```

```output
[0, 1, 2, 3, 3, 3, 8, 12, 13, 15, 17, 26, 27, 29, 32, 34, 40, 48, 48, 49, 55, 57, 57, 60, 62, 63, 69, 72, 75, 77, 83, 83, 87, 89, 92, 97, 97, 97, 98, 100]
scores from 70 to 79: 3   check: 3
['F', 'D', 'D', 'C', 'B', 'A', 'A']
```

The grading function is a classic use: `bisect_right(boundaries, score)` counts how many boundaries the score has reached, which picks the letter.

Counting values in a range is two boundary searches, O(log n), however many values there are; the check by scanning agrees. A score of exactly 80 gets an A, because `bisect_right` counts the boundary 80 as reached. With `bisect_left` it would count only boundaries strictly below the score, and 80 would get a B: choosing between left and right is choosing how ties are treated.

## Binary search on the answer

Binary search does not need a list at all. It needs only a condition that is false up to some point and true after it. Many optimisation problems have that shape. **"What is the smallest x that works?"** If any x that works means every larger x also works, binary search can find the smallest one by testing candidates, even when there is no formula.

Example: a list of jobs, each taking some number of minutes, must be done in order by one machine over a number of days. What is the shortest working day (in minutes) that finishes everything in time? Given a day length, checking it is easy: fill each day greedily until the next job does not fit. A longer day never needs more days, so the condition "finishes within the limit" switches from false to true once. Predict before running: for the jobs below and 5 days, will the answer be closer to the total divided by 5, or to the largest job?

```python type
def days_needed(jobs, day_length):
    days, used = 1, 0
    for job in jobs:
        if used + job > day_length:
            days += 1
            used = 0
        used += job
    return days

def shortest_day(jobs, days):
    lo, hi = max(jobs), sum(jobs)
    tested = 0
    while lo < hi:
        mid = (lo + hi) // 2
        tested += 1
        if days_needed(jobs, mid) <= days:
            hi = mid
        else:
            lo = mid + 1
    return lo, tested

jobs = [120, 45, 300, 80, 15, 200, 60, 90, 240, 30, 110, 75]
answer, tested = shortest_day(jobs, 5)
print(f"total {sum(jobs)} minutes, average {sum(jobs) / 5:.0f} per day, largest job {max(jobs)}")
print(f"shortest workable day: {answer} minutes, found by testing {tested} candidate lengths")
print("check:", days_needed(jobs, answer), "days at", answer, "and", days_needed(jobs, answer - 1), "days at", answer - 1)
```

```output
total 1365 minutes, average 273 per day, largest job 300
shortest workable day: 355 minutes, found by testing 10 candidate lengths
check: 5 days at 355 and 6 days at 354
```

The search range starts at the largest job (no shorter day can fit it) and ends at the total (one day for everything), so the answer is certainly inside.

The shortest workable day is 355 minutes, closer to the largest job than to the average here, and well above both the 273-minute average and the largest job, because jobs must stay in order and cannot be split across days, and the check confirms that one minute less needs a sixth day. Only 10 candidate lengths were tested, out of more than a thousand possible. This "guess the answer, check it, halve" pattern solves many problems that look hard at first: the smallest capacity, the largest minimum distance, the earliest time something becomes possible.

::: challenge First position at least [easy]
Write `lower_bound(items, target)` returning the first position in the sorted list `items` whose value is at least `target` (or `len(items)` if there is none), with your own half-open binary search: no `bisect`, no scanning. Then write `contains(items, target)` using it, in O(log n).

```python starter
def lower_bound(items, target):
    return 0

def contains(items, target):
    return False

data = [2, 4, 4, 4, 7, 9]
print(lower_bound(data, 4), lower_bound(data, 5), lower_bound(data, 10), contains(data, 7), contains(data, 8))
```

```python solution
def lower_bound(items, target):
    lo, hi = 0, len(items)
    while lo < hi:
        mid = (lo + hi) // 2
        if items[mid] >= target:
            hi = mid
        else:
            lo = mid + 1
    return lo

def contains(items, target):
    i = lower_bound(items, target)
    return i < len(items) and items[i] == target

data = [2, 4, 4, 4, 7, 9]
print(lower_bound(data, 4), lower_bound(data, 5), lower_bound(data, 10), contains(data, 7), contains(data, 8))
```

```python test
import bisect as _bisect, random as _random
assert "lower_bound" in dir() and "contains" in dir(), "Keep both function names."
_d = [2, 4, 4, 4, 7, 9]
for _t, _want in [(4, 1), (5, 4), (10, 6), (1, 0), (2, 0), (9, 5)]:
    assert lower_bound(_d, _t) == _want, f"lower_bound({_d}, {_t}) should be {_want}, got {lower_bound(_d, _t)}."
assert lower_bound([], 3) == 0 and contains([], 3) is False, "An empty list: position 0, and nothing is contained."
_r = _random.Random(6)
for _ in range(1000):
    _xs = sorted(_r.randint(0, 20) for _ in range(_r.randint(0, 15))); _t = _r.randint(-2, 22)
    assert lower_bound(_xs, _t) == _bisect.bisect_left(_xs, _t), f"lower_bound({_xs}, {_t}) is wrong."
    assert contains(_xs, _t) == (_t in _xs), f"contains({_xs}, {_t}) is wrong."
_cnt = [0]
class _Spy:
    def __len__(self):
        return 1_000_000
    def __getitem__(self, i):
        _cnt[0] += 1
        if _cnt[0] > 1000:
            raise AssertionError("Your functions read more than 1,000 items of a million-item list: use binary search, not a scan.")
        if not 0 <= i < 1_000_000:
            raise IndexError(i)
        return i
_s = _Spy(); lower_bound(_s, 765_432); contains(_s, 765_432)
assert _cnt[0] <= 50, f"Your functions read {_cnt[0]} items from a million-item list: binary search needs about 20 per search."
assert "bisect" not in _source, "Write the binary search yourself rather than using the bisect module."
"SUCCESS: About 20 reads for a million items. contains is then one extra comparison: is the value at the boundary the target?"
```

Hint: `lo, hi = 0, len(items)`; while `lo < hi`, if `items[mid] >= target` the answer is at `mid` or before (`hi = mid`), otherwise after it (`lo = mid + 1`). For `contains`, check the position is inside the list and holds the target.
:::

::: challenge Square root by bisection [medium]
Binary search works on real numbers too, by halving an interval until it is small enough. Write `bisect_root(f, lo, hi, tolerance)` that finds x with f(x) = 0, given that f is increasing and f(lo) < 0 < f(hi): repeatedly test the midpoint and keep the half where the sign changes, until `hi - lo < tolerance`; return the midpoint and the number of halvings as a tuple `(x, steps)`.

Then use it to find √2 (the root of x² − 2 between 0 and 2) to a tolerance of 1e-12, storing the tuple in `root2`.

```python starter
def bisect_root(f, lo, hi, tolerance):
    return 0.0, 0

root2 = (0.0, 0)
print(root2)
```

```python solution
def bisect_root(f, lo, hi, tolerance):
    steps = 0
    while hi - lo >= tolerance:
        mid = (lo + hi) / 2
        if f(mid) < 0:
            lo = mid
        else:
            hi = mid
        steps += 1
    return (lo + hi) / 2, steps

root2 = bisect_root(lambda x: x * x - 2, 0, 2, 1e-12)
print(root2)
```

```python test
import math as _math
assert "bisect_root" in dir(), "Keep the function's name as bisect_root."
_x, _n = bisect_root(lambda x: x - 0.3, 0, 1, 1e-6)
assert abs(_x - 0.3) < 1e-6, f"For f(x) = x − 0.3 the root is 0.3; got {_x}."
assert _n == 20, f"Halving an interval of length 1 below 1e-6 takes 20 steps (2^-20 < 1e-6 < 2^-19); got {_n}."
_x3, _ = bisect_root(lambda x: x ** 3 - 27, 0, 10, 1e-9)
assert abs(_x3 - 3) < 1e-8, "The cube root of 27 should come out as 3."
assert abs(root2[0] - _math.sqrt(2)) < 1e-11, f"root2 should be close to √2 = {_math.sqrt(2)}; got {root2[0]}."
assert root2[1] == 41, f"An interval of length 2 needs 41 halvings to get below 1e-12; got {root2[1]}."
f"SUCCESS: √2 ≈ {root2[0]:.12f} after {root2[1]} halvings. Each halving adds one binary digit of accuracy, whatever the function."
```

Hint: Loop while the interval is at least the tolerance. If `f(mid) < 0` the root is to the right (`lo = mid`), otherwise to the left (`hi = mid`). Count each halving.
:::

::: challenge Spread out the stations [medium]
Charging stations can be built only at certain positions along a road (a sorted list of kilometre marks). You must build exactly `count` of them, and want them as far apart as possible: maximise the **smallest** distance between neighbouring stations. Write `widest_spacing(positions, count)` returning that largest possible minimum distance (a whole number), using binary search on the answer.

The check: for a candidate distance d, place a station at the first position, then greedily at each next position at least d beyond the last one placed; d works if that places at least `count` stations. A smaller d always works if a larger one does, so the condition flips once, from "works" to "doesn't work". Assume `2 <= count <= len(positions)`.

```python starter
def widest_spacing(positions, count):
    return 0

print(widest_spacing([1, 2, 4, 8, 9], 3))
```

```python solution
def widest_spacing(positions, count):
    def fits(d):
        placed, last = 1, positions[0]
        for p in positions[1:]:
            if p - last >= d:
                placed += 1
                last = p
        return placed >= count

    lo, hi = 0, positions[-1] - positions[0]
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if fits(mid):
            lo = mid
        else:
            hi = mid - 1
    return lo

print(widest_spacing([1, 2, 4, 8, 9], 3))
```

```python test
import itertools as _it, random as _random
assert "widest_spacing" in dir(), "Keep the function's name as widest_spacing."
def _brute(_ps, _c):
    return max(min(_b - _a for _a, _b in zip(_combo, _combo[1:])) for _combo in _it.combinations(_ps, _c))
assert widest_spacing([1, 2, 4, 8, 9], 3) == 3, f"Stations at 1, 4 and 8 (or 9) are at least 3 apart; got {widest_spacing([1, 2, 4, 8, 9], 3)}."
assert widest_spacing([0, 10], 2) == 10, "Two stations at the two ends: distance 10."
assert widest_spacing([5, 6, 7, 8], 4) == 1, "Using every position, the closest pair is 1 apart."
_r = _random.Random(8)
for _ in range(300):
    _ps = sorted(_r.sample(range(0, 60), _r.randint(2, 8))); _c = _r.randint(2, len(_ps))
    assert widest_spacing(_ps, _c) == _brute(_ps, _c), f"widest_spacing({_ps}, {_c}) should be {_brute(_ps, _c)}, got {widest_spacing(_ps, _c)}."
class _Road(list):
    _reads = 0
    def __iter__(self):
        _Road._reads += 1
        if _Road._reads > 200:
            raise AssertionError("Too many passes over the positions: binary search over the distance d instead of trying each d.")
        return list.__iter__(self)
    def __getitem__(self, i):
        _r_ = list.__getitem__(self, i)
        if isinstance(i, slice):
            _Road._reads += 1
            if _Road._reads > 200:
                raise AssertionError("Too many passes over the positions: binary search over the distance d instead of trying each d.")
        return _r_
_far = _Road(range(0, 10**9, 10**4))
assert widest_spacing(_far, 50) == 20_400_000, "Large coordinates should work quickly: the number of candidates tested grows only with log of the road's length."
"SUCCESS: A greedy check plus binary search over distances: the largest d for which the check still succeeds, found in about log₂(road length) checks."
```

Hint: Here the condition is true for small d and false for large d, the mirror image of the lesson. Search for the **last** d that works: with `lo` always working, use `mid = (lo + hi + 1) // 2` (rounding up, so the range always shrinks), set `lo = mid` if it fits, else `hi = mid - 1`.
:::

## What you learned

- Binary search halves a sorted range each step, O(log n): about 20 steps for a million items. Its invariant, "if the target is anywhere, it is between `lo` and `hi`", dictates the `+ 1` and `- 1`.
- The boundary form finds the first position where a false-then-true condition becomes true, using a half-open range `[lo, hi)` and `hi = mid`; `bisect_left` and `bisect_right` are its library versions, and their difference counts duplicates.
- Choosing left or right decides how ties are treated, as in grading by boundaries.
- Binary search on the answer finds the smallest (or largest) value that works whenever "works" flips only once, with a cheap check for each candidate; bisection does the same for real numbers.

The next lesson starts on sorting, with the simple algorithms whose invariants every faster one builds on.
