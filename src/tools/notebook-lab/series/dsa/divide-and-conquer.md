# Divide and conquer

Merge sort, quicksort, binary search and fast exponentiation share one strategy: **divide** the problem into smaller problems of the same kind, **conquer** each by solving it recursively, and **combine** their answers. The recurrences lesson showed how to work out the cost: T(n) = aT(n/b) + (work to divide and combine). This lesson applies the strategy to problems that have nothing to do with sorting, where a brute-force method checks all pairs, O(n²), and divide and conquer gets O(n log n).

The hard part is always the **combine** step. Solving each half is free, by recursion; the question is what you need to know about the two halves to get the answer for the whole, and how to compute the part of the answer that **crosses** between them, cheaply. This lesson covers:

- **counting inversions** by piggy-backing on merge sort;
- the **closest pair of points**, where a clever observation makes the crossing check linear;
- **Karatsuba multiplication**, where three half-size products replace four;
- how to recognise problems where the strategy pays off.

## Counting inversions

An **inversion** is a pair of positions i < j with `a[i] > a[j]`: a pair out of order. The count measures how far a list is from sorted. Recommendation systems use it to compare two people's rankings (how many pairs of films they order differently), and the elementary sorts lesson showed it is exactly the number of shifts insertion sort makes. Counting by checking every pair is O(n²).

Divide and conquer: split the list in half. The inversions are those entirely in the left half, those entirely in the right half (both counted recursively), and the **crossing** ones, with i in the left half and j in the right. Counting crossing pairs one by one would still be O(n²). The trick: if both halves are **sorted**, the crossing count falls out of the merge step. When an item from the right half is placed before items still waiting in the left half, it is smaller than every one of them, so it forms an inversion with each: add the number of left items remaining. So: sort and count at the same time, exactly merge sort plus one line. Predict before running: how will the times compare for 2,000 and 4,000 items?

```python type
import random
import timeit

def sort_and_count(items):
    if len(items) <= 1:
        return list(items), 0
    mid = len(items) // 2
    left, a = sort_and_count(items[:mid])
    right, b = sort_and_count(items[mid:])
    merged, i, j, crossing = [], 0, 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            merged.append(left[i])
            i += 1
        else:
            merged.append(right[j])
            crossing += len(left) - i
            j += 1
    merged += left[i:] + right[j:]
    return merged, a + b + crossing

def count_brute(items):
    return sum(1 for i in range(len(items)) for j in range(i + 1, len(items)) if items[i] > items[j])

print(sort_and_count([2, 4, 1, 3, 5])[1], "inversions in [2, 4, 1, 3, 5]:", [(x, y) for i, x in enumerate([2, 4, 1, 3, 5]) for y in [2, 4, 1, 3, 5][i + 1:] if x > y])
random.seed(0)
for n in [2_000, 4_000]:
    data = random.sample(range(10 * n), n)
    assert sort_and_count(data)[1] == count_brute(data)
    fast = timeit.timeit(lambda: sort_and_count(data), number=1)
    slow = timeit.timeit(lambda: count_brute(data), number=1)
    print(f"n = {n}: divide and conquer {fast * 1000:6.1f} ms, every pair {slow * 1000:7.1f} ms")
```

`crossing += len(left) - i` is the only new line compared with merge sort: `len(left) - i` is the number of left items not yet placed, all larger than the right item being placed now.

[2, 4, 1, 3, 5] has three inversions: (2, 1), (4, 1) and (4, 3). The two methods agree on the larger lists too, but doubling n roughly doubles the divide-and-conquer time while quadrupling the brute force's: T(n) = 2T(n/2) + O(n) is O(n log n), against O(n²).

## The closest pair of points

Given n points in the plane, which two are closest together? Collision detection, clustering and geography all ask this, and checking every pair is O(n²). Divide and conquer:

1. Sort the points by x, and split them by a vertical line through the middle.
2. Find the closest pair in each half recursively; let d be the smaller of the two distances.
3. **Combine**: the only pairs not yet considered cross the line, and a crossing pair closer than d must have both points within d of the line: a vertical **strip** of width 2d. Sort the strip's points by y. Here is the key fact: each point in the strip only needs comparing with the next **few** points above it (at most 7), because points on the same side of the line are at least d apart, so only a handful can be packed into a d × 2d box above it.

So the combine step is O(n log n) here (sorting the strip; a refined version keeps the points pre-sorted by y to make it O(n)), and the whole is O(n log² n) as written. Predict before running: for 3,000 random points, how many distance calculations will each method make?

```python type
import math
import random

def closest_brute(points):
    best, checks = float("inf"), 0
    for i in range(len(points)):
        for j in range(i + 1, len(points)):
            checks += 1
            best = min(best, math.dist(points[i], points[j]))
    return best, checks

def closest(points):
    checks = [0]

    def solve(pts):
        if len(pts) <= 3:
            best = float("inf")
            for i in range(len(pts)):
                for j in range(i + 1, len(pts)):
                    checks[0] += 1
                    best = min(best, math.dist(pts[i], pts[j]))
            return best
        mid = len(pts) // 2
        line = pts[mid][0]
        d = min(solve(pts[:mid]), solve(pts[mid:]))
        strip = sorted((p for p in pts if abs(p[0] - line) < d), key=lambda p: p[1])
        for i in range(len(strip)):
            for j in range(i + 1, min(i + 8, len(strip))):
                if strip[j][1] - strip[i][1] >= d:
                    break
                checks[0] += 1
                d = min(d, math.dist(strip[i], strip[j]))
        return d

    return solve(sorted(points)), checks[0]

random.seed(1)
points = [(random.random() * 1000, random.random() * 1000) for _ in range(3_000)]
fast, fast_checks = closest(points)
slow, slow_checks = closest_brute(points)
print(f"divide and conquer: {fast:.4f} after {fast_checks:,} distance checks")
print(f"every pair:         {slow:.4f} after {slow_checks:,} distance checks")
```

```output
divide and conquer: 0.3338 after 4,180 distance checks
every pair:         0.3338 after 4,498,500 distance checks
```

`sorted(points)` sorts by x (and by y for equal x). The inner loop over the strip stops early once points are d or more apart vertically, since everything further up is too.

Both find the same distance, but divide and conquer computes about 4,200 distances against about 4.5 million. The cleverness is entirely in the combine step: without the "at most 7 neighbours in the strip" argument, the strip could need O(n²) comparisons and the recursion would gain nothing.

## Karatsuba multiplication

Multiplying two n-digit numbers the school way takes about n² single-digit multiplications. Split each number into a high and a low half: x = a·B + b and y = c·B + d, where B is a power of 10. Then xy = ac·B² + (ad + bc)·B + bd, which needs four half-size products: T(n) = 4T(n/2) + O(n), still O(n²) by the master theorem. In 1960, Anatoly Karatsuba noticed that **three** suffice: compute ac, bd and (a + b)(c + d); then ad + bc = (a + b)(c + d) − ac − bd. With T(n) = 3T(n/2) + O(n), the master theorem gives O(n^log₂3) ≈ O(n^1.585). Predict before running: how many single-digit multiplications for two 64-digit numbers, with four half-products and with three?

```python type
def multiply(x, y, three_products, count):
    if x < 10 and y < 10:
        count[0] += 1
        return x * y
    n = max(len(str(x)), len(str(y)))
    half = n // 2
    B = 10 ** half
    a, b = divmod(x, B)
    c, d = divmod(y, B)
    ac = multiply(a, c, three_products, count)
    bd = multiply(b, d, three_products, count)
    if three_products:
        middle = multiply(a + b, c + d, three_products, count) - ac - bd
    else:
        middle = multiply(a, d, three_products, count) + multiply(b, c, three_products, count)
    return ac * B * B + middle * B + bd

random.seed(2)
for digits in [16, 64, 256]:
    x = random.randrange(10 ** (digits - 1), 10 ** digits)
    y = random.randrange(10 ** (digits - 1), 10 ** digits)
    four, three = [0], [0]
    assert multiply(x, y, False, four) == x * y == multiply(x, y, True, three)
    print(f"{digits:>3} digits: four products {four[0]:>7,} digit multiplications, Karatsuba {three[0]:>6,}")
```

```output
 16 digits: four products     256 digit multiplications, Karatsuba    157
 64 digits: four products   4,048 digit multiplications, Karatsuba  1,375
256 digits: four products  64,924 digit multiplications, Karatsuba 12,835
```

`divmod(x, B)` splits x into its high part (the quotient) and its low part (the remainder). Each call measures its numbers' length with `len(str(...))`, because a + b can have one more digit than a; the recursion stops when both numbers are single digits.

Both give the correct product (checked against Python's own multiplication). With four products the count is about n² (4,048 for 64 digits); Karatsuba needs far fewer (1,375), and the gap widens with n, as the exponent 1.585 promises. Python itself switches to Karatsuba for very large integers; big-number libraries such as GMP use Karatsuba and its generalisation, Toom–Cook, switching to FFT-based methods only for enormous numbers.

## When it pays

Divide and conquer helps when:

- the problem splits into **independent** subproblems of the same kind, ideally of equal size (unequal splits, like quicksort's worst case, lose the benefit);
- the **combine** step is cheaper than solving the problem directly, usually because the subproblems' answers carry extra information (sortedness, a distance bound d) that makes the crossing part easy;
- the subproblems do **not overlap**. When the same subproblems recur again and again (like the naive Fibonacci), divide and conquer repeats work exponentially, and **dynamic programming**, coming soon in this series, is the right tool.

::: challenge Maximum subarray, divided [easy]
Write `max_subarray(values)` returning the largest sum of a non-empty contiguous stretch of a non-empty list, by divide and conquer: the best stretch lies in the left half, in the right half, or **crosses** the middle. The best crossing stretch is the best sum ending exactly at the middle's left side (scanning leftwards from `mid - 1`) plus the best sum starting exactly at the right side (scanning rightwards from `mid`). A one-item list is its own answer.

```python starter
def max_subarray(values):
    return 0

print(max_subarray([2, -5, 3, 4, -1, 2, -6, 1]))
```

```python solution
def max_subarray(values):
    if len(values) == 1:
        return values[0]
    mid = len(values) // 2
    left_best = max_subarray(values[:mid])
    right_best = max_subarray(values[mid:])
    total, best_left_part = 0, float("-inf")
    for i in range(mid - 1, -1, -1):
        total += values[i]
        best_left_part = max(best_left_part, total)
    total, best_right_part = 0, float("-inf")
    for i in range(mid, len(values)):
        total += values[i]
        best_right_part = max(best_right_part, total)
    return max(left_best, right_best, best_left_part + best_right_part)

print(max_subarray([2, -5, 3, 4, -1, 2, -6, 1]))
```

```python test
import random as _random
assert "max_subarray" in dir(), "Keep the function's name as max_subarray."
assert max_subarray([2, -5, 3, 4, -1, 2, -6, 1]) == 8, "3 + 4 − 1 + 2 = 8, a stretch crossing the middle."
assert max_subarray([-3, -1, -7]) == -1 and max_subarray([5]) == 5, "All negative: the largest single value; one item: itself."
_r = _random.Random(1)
for _ in range(300):
    _xs = [_r.randint(-9, 9) for _ in range(_r.randint(1, 14))]
    _want = max(sum(_xs[i:j]) for i in range(len(_xs)) for j in range(i + 1, len(_xs) + 1))
    assert max_subarray(_xs) == _want, f"Wrong answer for {_xs}: expected {_want}."
import time as _time
_mid = [_r.randint(-100, 100) for _ in range(2_000)]
_best = _here = _mid[0]
for _x in _mid[1:]:
    _here = max(_x, _here + _x)
    _best = max(_best, _here)
_start = _time.perf_counter(); _got = max_subarray(_mid); _el = _time.perf_counter() - _start
assert _got == _best, f"Wrong answer for a 2,000-value list: expected {_best}."
assert _el < 0.5, f"2,000 values took {_el:.1f} s: split in half, recurse, and combine with the best stretch crossing the middle, O(n log n)."
"SUCCESS: Left, right, or crossing: the crossing case costs one linear scan each way, so T(n) = 2T(n/2) + O(n) = O(n log n). (A cleverer scan, Kadane's algorithm, does it in O(n); the dynamic programming lessons explain why.)"
```

Hint: Recurse on both halves. For the crossing sum, scan from `mid - 1` down to 0 keeping the best running total, and from `mid` up to the end the same way; add the two bests. Return the largest of the three candidates.
:::

::: challenge Majority vote [medium]
A **majority** value appears in more than half the positions of a list. Write `majority(values)` returning it, or `None` if there is none, by divide and conquer: a majority of the whole list must be a majority of at least one half (if it were at most half of each, it would be at most half of the total). So find the candidates from both halves recursively and count how often each appears in the **whole** range. Write the recursion on index ranges `(lo, hi)` rather than slices.

```python starter
def majority(values):
    return None

print(majority([3, 1, 3, 3, 2, 3, 3]), majority([1, 2, 3, 1]))
```

```python solution
def majority(values):
    def solve(lo, hi):
        if hi - lo == 1:
            return values[lo]
        mid = (lo + hi) // 2
        for candidate in {solve(lo, mid), solve(mid, hi)}:
            if candidate is not None:
                count = sum(1 for i in range(lo, hi) if values[i] == candidate)
                if count * 2 > hi - lo:
                    return candidate
        return None

    return solve(0, len(values)) if values else None

print(majority([3, 1, 3, 3, 2, 3, 3]), majority([1, 2, 3, 1]))
```

```python test
import random as _random, time as _time
assert "majority" in dir(), "Keep the function's name as majority."
assert majority([3, 1, 3, 3, 2, 3, 3]) == 3 and majority([1, 2, 3, 1]) is None, "3 is a majority (5 of 7); in [1, 2, 3, 1] nothing is (1 is exactly half)."
assert majority([]) is None and majority([7]) == 7 and majority([4, 4]) == 4, "Edge cases."
_r = _random.Random(2)
for _ in range(400):
    _xs = [_r.choice([1, 2, 3, 3, 3]) for _ in range(_r.randint(0, 12))]
    _want = next((v for v in set(_xs) if _xs.count(v) * 2 > len(_xs)), None)
    assert majority(_xs) == _want, f"Wrong answer for {_xs}: expected {_want}."
_big = [5] * 30_001 + [_r.randint(0, 1000) for _ in range(30_000)]
_r.shuffle(_big)
_start = _time.perf_counter(); _m = majority(_big); _el = _time.perf_counter() - _start
assert _m == 5 and _el < 3, f"60,001 values took {_el:.1f} s: count candidates only, O(n log n) overall."
"SUCCESS: A majority must win one of the halves, so at most two candidates need counting at each level: O(n log n). (The Boyer-Moore voting algorithm does it in O(n) with a single counter.)"
```

Hint: An inner `solve(lo, hi)` returns the majority of `values[lo:hi]` or `None`. One item is its own majority. Otherwise get the two halves' answers, and for each (not `None`) count its occurrences in `lo..hi`; return it if the count is more than half.
:::

::: challenge Count inversions in rankings [medium]
Two people rank the same films from favourite to least favourite. Write `ranking_distance(first, second)` returning how many **pairs** of films the two order differently (the "Kendall tau distance"), in O(n log n): replace each film in `second` by its position in `first`, and count the inversions of that list with the lesson's `sort_and_count`. Then store in `distance_reversed` the distance between a 10-film ranking and its exact reverse.

```python starter
def ranking_distance(first, second):
    return 0

distance_reversed = 0
print(ranking_distance(["A", "B", "C", "D"], ["B", "A", "D", "C"]))
```

```python solution
def ranking_distance(first, second):
    position = {film: i for i, film in enumerate(first)}
    return sort_and_count([position[film] for film in second])[1]

films = [f"film {i}" for i in range(10)]
distance_reversed = ranking_distance(films, films[::-1])
print(ranking_distance(["A", "B", "C", "D"], ["B", "A", "D", "C"]))
```

```python test
import itertools as _it, random as _random, time as _time
assert "ranking_distance" in dir(), "Keep the function's name as ranking_distance."
assert ranking_distance(["A", "B", "C", "D"], ["B", "A", "D", "C"]) == 2, "A/B and C/D are swapped: 2 pairs differ."
assert ranking_distance(["x", "y"], ["x", "y"]) == 0 and ranking_distance([], []) == 0, "Identical rankings agree on every pair."
assert distance_reversed == 45, "Reversing 10 films flips all 10 × 9 / 2 = 45 pairs."
_r = _random.Random(3)
for _ in range(200):
    _f = list("abcdefg")[:_r.randint(0, 7)]; _s = _f[:]; _r.shuffle(_s)
    _want = sum(1 for x, y in _it.combinations(_f, 2) if (_f.index(x) < _f.index(y)) != (_s.index(x) < _s.index(y)))
    assert ranking_distance(_f, _s) == _want, f"Wrong distance between {_f} and {_s}."
_mid = list(range(5_000)); _mid2 = _mid[:]; _r.shuffle(_mid2)
_start = _time.perf_counter(); ranking_distance(_mid, _mid2); _el = _time.perf_counter() - _start
assert _el < 1, f"5,000 films took {_el:.1f} s: comparing every pair is 12.5 million comparisons; count inversions while merge sorting."
_big = list(range(30_000)); _big2 = _big[:]; _r.shuffle(_big2)
_start = _time.perf_counter(); ranking_distance(_big, _big2); _el = _time.perf_counter() - _start
assert _el < 3, f"30,000 films took {_el:.1f} s: count inversions by divide and conquer, not every pair."
"SUCCESS: Relabelling one ranking by the other turns 'pairs ordered differently' into 'inversions', which merge sort counts in O(n log n)."
```

Hint: Build `position = {film: i for i, film in enumerate(first)}`, turn `second` into `[position[f] for f in second]`, and return the count part of `sort_and_count` on that list.
:::

## What you learned

- Divide and conquer splits a problem, solves the parts recursively and combines them; the combine step, especially the part of the answer that crosses between halves, is where the thinking goes.
- Counting inversions rides on merge sort: when a right item is placed, it is inverted with every left item still waiting. O(n log n).
- The closest pair of points needs only a narrow strip around the dividing line, and each strip point only a few neighbours: O(n log² n) as written, O(n log n) with care.
- Karatsuba multiplies with three half-size products instead of four, O(n^1.585). Divide and conquer suits independent, non-overlapping subproblems; overlapping ones call for dynamic programming.

The next lesson looks at algorithms that make the locally best choice at every step, and how to prove that this gives the best overall answer: greedy algorithms.
