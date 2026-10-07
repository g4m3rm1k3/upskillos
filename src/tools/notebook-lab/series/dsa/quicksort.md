# Quicksort and quickselect

Merge sort does its work on the way **up**: the splitting is trivial and the merging does the sorting. **Quicksort** does the opposite. It does its work on the way **down**: it picks one item, the **pivot**, and **partitions** the list so that everything smaller than the pivot comes before it and everything larger after it. The pivot is then in its final position, and the two sides can be sorted independently, with no merging at all. Partitioning happens in place, so quicksort needs no extra list, and in practice it is one of the fastest sorting algorithms there is.

It has one famous weakness, and the way it is fixed, by choosing the pivot at **random**, is the first example in this series of randomness making an algorithm more reliable. This lesson covers:

- partitioning in place, with its invariant;
- quicksort, and its best, worst and expected running times;
- random pivots, and why they make the worst case vanishingly unlikely;
- **quickselect**: finding the k-th smallest item in expected O(n), without sorting.

## Partitioning

The **Lomuto partition** uses the last item of a range as the pivot and one scanning index. Its invariant, for the range `a[lo:hi + 1]` with pivot `p = a[hi]`:

- `a[lo:boundary]` are all **less than** p;
- `a[boundary:j]` are all **at least** p;
- `a[j:hi]` have not been examined yet.

When `a[j]` is less than the pivot, it is swapped to the boundary and the boundary moves right. At the end, the pivot is swapped into the boundary position, between the two groups, where it belongs. Predict before running: after partitioning `[7, 2, 9, 4, 1, 8, 5]` around its last item, where will 5 end up?

```python type
def partition(a, lo, hi):
    pivot = a[hi]
    boundary = lo
    for j in range(lo, hi):
        if a[j] < pivot:
            a[boundary], a[j] = a[j], a[boundary]
            boundary += 1
    a[boundary], a[hi] = a[hi], a[boundary]
    return boundary

data = [7, 2, 9, 4, 1, 8, 5]
position = partition(data, 0, len(data) - 1)
print(data, "-> pivot 5 is now at position", position)
print("left of it:", data[:position], " right of it:", data[position + 1:])
```

```output
[2, 4, 1, 5, 9, 8, 7] -> pivot 5 is now at position 3
left of it: [2, 4, 1]  right of it: [9, 8, 7]
```

`partition` returns the pivot's final position, which the sorting step needs to know where the two sides begin.

The pivot 5 lands at position 3, with 2, 4 and 1 before it and 9, 8 and 7 after. Neither side is sorted, but 5 is exactly where it will be in the sorted list, since three items are smaller than it. Partitioning makes one pass: n − 1 comparisons for a range of n items.

## Quicksort

Quicksort partitions the range, then sorts the two sides by the same method. A range of 0 or 1 items is already sorted. Predict before running: how many comparisons for 1,000 random items, and for 800 items that are **already sorted**?

```python type
import math
import random

def quicksort(a, lo=0, hi=None, counter=None):
    if hi is None:
        hi = len(a) - 1
    if lo < hi:
        if counter is not None:
            counter[0] += hi - lo
        p = partition(a, lo, hi)
        quicksort(a, lo, p - 1, counter)
        quicksort(a, p + 1, hi, counter)

random.seed(0)
for name, data in [("random, n = 1000", random.sample(range(1000), 1000)), ("sorted, n = 800", list(range(800)))]:
    counter = [0]
    quicksort(data, counter=counter)
    assert data == sorted(data)
    n = len(data)
    print(f"{name}: {counter[0]:>7,} comparisons   (n log2 n = {round(n * math.log2(n)):,};  n²/2 = {n * n // 2:,})")
```

```output
random, n = 1000:  10,252 comparisons   (n log2 n = 9,966;  n²/2 = 500,000)
sorted, n = 800: 319,600 comparisons   (n log2 n = 7,715;  n²/2 = 320,000)
```

`counter` is a one-item list so that every recursive call can add to the same count. A partition of a range from lo to hi makes hi − lo comparisons.

On random data quicksort makes close to n log₂ n comparisons (for very large n the average approaches 1.39 n log₂ n). On sorted data it makes n²/2: the worst case. With the last item as pivot, a sorted list's pivot is always the **largest** item, so every partition splits off nothing at all on one side and n − 1 items on the other. The recursion goes n levels deep instead of log n (this run used 800 items so as to stay inside Python's recursion limit), and the work is n + (n − 1) + … = O(n²), the recurrence T(n) = T(n − 1) + n. Sorted and nearly sorted inputs are common in practice, so this is a real problem, not a curiosity.

## Random pivots

The fix is to choose the pivot **at random** from the range (swapping it to the end, then partitioning as before). Now no particular input is bad: for any input, a random pivot usually lands somewhere in the middle half, giving a reasonably balanced split. The analysis shows the **expected** number of comparisons is O(n log n) on every input (about 1.39 n log₂ n for large n), and the chance of anything near n² is astronomically small. Predict before running: how will the comparison counts for random, sorted and all-equal inputs compare now?

```python type
import random

def randomized_quicksort(a, lo=0, hi=None, counter=None):
    if hi is None:
        hi = len(a) - 1
    if lo < hi:
        r = random.randint(lo, hi)
        a[r], a[hi] = a[hi], a[r]
        counter[0] += hi - lo
        p = partition(a, lo, hi)
        randomized_quicksort(a, lo, p - 1, counter)
        randomized_quicksort(a, p + 1, hi, counter)

random.seed(1)
n = 800
for name, data in [("random", random.sample(range(n), n)), ("sorted", list(range(n))),
                   ("reversed", list(range(n, 0, -1))), ("all equal", [7] * n)]:
    counter = [0]
    randomized_quicksort(data, counter=counter)
    print(f"{name:<10} {counter[0]:>7,} comparisons")
```

```output
random       7,931 comparisons
sorted       8,530 comparisons
reversed     8,114 comparisons
all equal  319,600 comparisons
```

Sorted and reversed inputs now cost the same as random ones. But the all-equal list is still quadratic. With every item equal to the pivot, `a[j] < pivot` is never true, so each partition puts the pivot at the start and everything else on one side, whatever pivot is chosen. Lists with many duplicates are common (sorting people by age, say), and the cure is the **three-way partition** from the invariants lesson: group the items equal to the pivot in the middle and recurse only on the strictly smaller and strictly larger parts. The third challenge builds it.

In practice, quicksort beats merge sort on arrays because partitioning works in place and scans memory in order, which modern hardware rewards. Its weaknesses are that it is not stable and that its O(n log n) is expected, not guaranteed. Many standard libraries use **introsort**: quicksort that switches to heapsort (a later lesson) if the recursion gets suspiciously deep, guaranteeing O(n log n).

## Quickselect

Sometimes you need only **one** position of the sorted order: the median, the 90th percentile, the 10th largest. Sorting first costs O(n log n). **Quickselect** does better: partition once; the pivot lands at its final position p. If p is the position you want, done. Otherwise the wanted item is on one side only, so continue on **that side alone**. If every pivot halved the range, the work would be n + n/2 + n/4 + … ≈ 2n; random pivots split less evenly, so finding the median takes about 3.4n comparisons on average, but that is still O(n). Predict before running: roughly how many comparisons to find the median of 100,000 numbers?

```python type
import random
import statistics

def quickselect(a, k, counter):
    lo, hi = 0, len(a) - 1
    while True:
        if lo == hi:
            return a[lo]
        r = random.randint(lo, hi)
        a[r], a[hi] = a[hi], a[r]
        counter[0] += hi - lo
        p = partition(a, lo, hi)
        if k == p:
            return a[p]
        if k < p:
            hi = p - 1
        else:
            lo = p + 1

random.seed(2)
data = [random.random() for _ in range(100_001)]
counter = [0]
median = quickselect(list(data), len(data) // 2, counter)
print(f"median {median:.6f} (statistics.median gives {statistics.median(data):.6f}) after {counter[0]:,} comparisons")
print(f"that is {counter[0] / len(data):.2f} comparisons per item; sorting needs about {math.log2(len(data)):.0f} per item")
```

```output
median 0.500791 (statistics.median gives 0.500791) after 431,489 comparisons
that is 4.31 comparisons per item; sorting needs about 17 per item
```

Quickselect is written as a loop rather than recursion, since it only ever continues on one side. `k` is a position in the sorted order counting from 0, so the median of 100,001 items is position 50,000.

Finding the median took about 4n comparisons on this run (the average over random pivots is about 3.4n for the median, and individual runs vary), against about 17 per item to sort. The answer matches the standard library's. Like quicksort, it runs in expected linear time; there is also a more complicated algorithm, "median of medians", that guarantees O(n) in the worst case.

::: challenge Median of three [easy]
A cheap alternative to a random pivot is the **median of three**: look at the first, middle and last items of a range and use whichever value is in the middle. It makes sorted and reversed input easy. Write `median_of_three(a, lo, hi)` returning the **index** (lo, `(lo + hi) // 2` or hi) whose value is the median of those three values. When values tie, any index holding the median value is fine.

```python starter
def median_of_three(a, lo, hi):
    return hi

print(median_of_three([9, 4, 7, 1, 5], 0, 4))
```

```python solution
def median_of_three(a, lo, hi):
    mid = (lo + hi) // 2
    candidates = sorted([(a[lo], lo), (a[mid], mid), (a[hi], hi)])
    return candidates[1][1]

print(median_of_three([9, 4, 7, 1, 5], 0, 4))
```

```python test
import random as _random
assert "median_of_three" in dir(), "Keep the function's name as median_of_three."
assert median_of_three([9, 4, 7, 1, 5], 0, 4) == 2, "First 9, middle 7, last 5: the median value 7 is at index 2."
assert median_of_three(list(range(10)), 0, 9) == 4, "On sorted input the middle index holds the median."
assert median_of_three(list(range(10, 0, -1)), 0, 9) == 4, "On reversed input the middle index holds the median too."
_r = _random.Random(1)
for _ in range(500):
    _a = [_r.randint(0, 5) for _ in range(_r.randint(1, 12))]
    _lo = _r.randint(0, len(_a) - 1); _hi = _r.randint(_lo, len(_a) - 1); _mid = (_lo + _hi) // 2
    _i = median_of_three(_a, _lo, _hi)
    assert _i in (_lo, _mid, _hi), f"Return one of the three indices {_lo}, {_mid}, {_hi}; got {_i}."
    assert _a[_i] == sorted([_a[_lo], _a[_mid], _a[_hi]])[1], f"For {_a[_lo:_hi + 1]} (lo={_lo}, hi={_hi}) the index you returned does not hold the median of the three."
"SUCCESS: On sorted data the median of three is the true median, so the split is perfect where the last-item pivot was at its worst."
```

Hint: Compute `mid = (lo + hi) // 2`, then sort the three pairs `(value, index)` and return the index of the middle pair. Or compare the three values with `if` statements.
:::

::: challenge The k smallest items [medium]
Write `k_smallest(items, k)` returning a sorted list of the k smallest values in `items` (with repeats, as they occur), in expected O(n + k log k): run quickselect-style partitioning on a **copy** of the list until position k − 1 holds its final value (so everything before it is smaller or equal), then sort just the first k items. Use the lesson's `partition` and random pivots. For k = 0 return `[]`; you may assume `0 <= k <= len(items)`.

```python starter
import random

def k_smallest(items, k):
    return []

print(k_smallest([9, 1, 8, 2, 7, 3, 6], 3))
```

```python solution
import random

def k_smallest(items, k):
    if k == 0:
        return []
    a = list(items)
    lo, hi = 0, len(a) - 1
    target = k - 1
    while lo < hi:
        r = random.randint(lo, hi)
        a[r], a[hi] = a[hi], a[r]
        p = partition(a, lo, hi)
        if p == target:
            break
        if target < p:
            hi = p - 1
        else:
            lo = p + 1
    return sorted(a[:k])

print(k_smallest([9, 1, 8, 2, 7, 3, 6], 3))
```

```python test
import random as _random
assert "k_smallest" in dir(), "Keep the function's name as k_smallest."
assert k_smallest([9, 1, 8, 2, 7, 3, 6], 3) == [1, 2, 3], f"Got {k_smallest([9, 1, 8, 2, 7, 3, 6], 3)}."
assert k_smallest([5, 5, 1, 5], 2) == [1, 5] and k_smallest([4, 2], 0) == [] and k_smallest([4, 2], 2) == [2, 4], "Repeats count as separate items; k = 0 and k = n should work."
_r = _random.Random(3)
for _ in range(500):
    _xs = [_r.randint(0, 9) for _ in range(_r.randint(0, 15))]; _k = _r.randint(0, len(_xs))
    _keep = list(_xs)
    assert k_smallest(_xs, _k) == sorted(_xs)[:_k], f"k_smallest({_xs}, {_k}) should be {sorted(_xs)[:_k]}."
    assert _xs == _keep, "Work on a copy: don't reorder the caller's list."
_body = _source.split("def k_smallest")[1].split("\ndef ")[0] if "def k_smallest" in _source else ""
assert "partition(" in _body and ".sort(" not in _body and _body.count("sorted(") <= 1 and ":k])" in _body.replace(" ", ""), "Don't sort the whole list: partition until the first k items are the smallest, then sort only those."
"SUCCESS: Partitioning finds the k smallest in expected linear time; only those k need sorting. (heapq.nsmallest, from the heaps lesson, is the library version.)"
```

Hint: Copy the list. Loop like quickselect, aiming for position `k - 1`: after each partition, if the pivot's position is `k - 1` stop, otherwise continue on the side containing `k - 1`. Then everything in `a[:k]` is among the k smallest; return `sorted(a[:k])`.
:::

::: challenge Quicksort with many duplicates [medium]
Write `quicksort3(a, lo, hi, counter)` that sorts `a[lo:hi + 1]` **in place** using a random pivot and a **three-way partition** (less than, equal to, greater than the pivot, as in the invariants lesson's Dutch national flag), then recurses only on the "less" and "greater" parts. Add one to `counter[0]` for every comparison of an item with the pivot (an `if a[mid] < pivot ... elif a[mid] > pivot` counts as up to two). Then sort 2,000 items that take only 3 distinct values, storing the comparison count in `duplicate_comparisons`.

```python starter
import random

def quicksort3(a, lo, hi, counter):
    pass

random.seed(5)
many_duplicates = [random.choice([1, 2, 3]) for _ in range(2000)]
counter = [0]
quicksort3(many_duplicates, 0, len(many_duplicates) - 1, counter)
duplicate_comparisons = counter[0]
print(many_duplicates[:10], duplicate_comparisons)
```

```python solution
import random

def quicksort3(a, lo, hi, counter):
    if lo >= hi:
        return
    pivot = a[random.randint(lo, hi)]
    low, mid, high = lo, lo, hi
    while mid <= high:
        counter[0] += 1
        if a[mid] < pivot:
            a[low], a[mid] = a[mid], a[low]
            low += 1
            mid += 1
        else:
            counter[0] += 1
            if a[mid] > pivot:
                a[mid], a[high] = a[high], a[mid]
                high -= 1
            else:
                mid += 1
    quicksort3(a, lo, low - 1, counter)
    quicksort3(a, high + 1, hi, counter)

random.seed(5)
many_duplicates = [random.choice([1, 2, 3]) for _ in range(2000)]
counter = [0]
quicksort3(many_duplicates, 0, len(many_duplicates) - 1, counter)
duplicate_comparisons = counter[0]
print(many_duplicates[:10], duplicate_comparisons)
```

```python test
import random as _random
assert "quicksort3" in dir(), "Keep the function's name as quicksort3."
_r = _random.Random(6)
for _ in range(300):
    _xs = [_r.randint(0, 6) for _ in range(_r.randint(0, 30))]
    _ys = list(_xs); _c = [0]; quicksort3(_ys, 0, len(_ys) - 1, _c)
    assert _ys == sorted(_xs), f"quicksort3 left {_ys} for input {_xs}."
_part = [9, 9, 1, 5, 3, 7]; quicksort3(_part, 2, 4, [0])
assert _part == [9, 9, 1, 3, 5, 7], "Only the range lo..hi should be sorted; items outside it stay put."
assert many_duplicates == sorted(many_duplicates), "many_duplicates should end up sorted."
assert 0 < duplicate_comparisons < 20_000, f"With only 3 distinct values, 2,000 items should need a few thousand comparisons, not {duplicate_comparisons:,}: use a three-way partition."
_eq = [4] * 500; _c = [0]
try:
    quicksort3(_eq, 0, 499, _c)
except RecursionError:
    _c[0] = 10**9
assert _c[0] <= 2 * 500, "500 equal items should take one pass of the three-way partition, not a recursion as deep as the list."
f"SUCCESS: {duplicate_comparisons:,} comparisons for 2,000 items with 3 distinct values: each distinct value is settled by one partition, so many duplicates make quicksort faster, not slower."
```

Hint: Pick `pivot = a[random.randint(lo, hi)]` (the value, not the index). Run the Dutch national flag loop over `lo..hi` with `low`, `mid`, `high`, counting comparisons. Then recurse on `lo..low - 1` and `high + 1..hi`. The base case is `lo >= hi`.
:::

## What you learned

- Partitioning puts a pivot in its final place with smaller items before it and larger after, in one in-place pass; its invariant names three regions.
- Quicksort partitions and recurses on both sides: O(n log n) comparisons on typical input (about 1.39 n log₂ n for large n), but O(n²) when the pivot is always extreme, as for the last-item pivot on sorted data.
- Random pivots make the expected cost O(n log n) on every input; median of three fixes sorted and reversed input, though carefully built inputs can still defeat it. A three-way partition handles many duplicates. Quicksort is fast in place but not stable.
- Quickselect continues on one side only, finding the k-th smallest in expected O(n).

The next lesson asks whether O(n log n) is the best possible, and shows how to beat it when the values are small integers.
