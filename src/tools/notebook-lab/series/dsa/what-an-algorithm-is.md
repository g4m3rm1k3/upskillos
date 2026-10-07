# What an algorithm is

An **algorithm** is a precise, finite list of steps that solves a problem: for any valid input, following the steps always stops and always gives a correct output. A recipe is the everyday example, but recipes leave a lot to judgement ("season to taste"). An algorithm leaves nothing to judgement, which is exactly what makes it possible to run on a computer, to prove correct and to compare with other algorithms.

This series is about two related skills: choosing and building the right algorithms and data structures, and organising code so that it stays easy to change. This first lesson sets up the habits everything else uses:

- stating a problem **precisely**, including the awkward cases;
- writing an algorithm for it and checking it on those cases;
- **counting steps** to compare algorithms without a stopwatch;
- seeing that two correct algorithms for the same problem can differ enormously in cost.

## Stating the problem precisely

Most bugs start before any code is written, with a problem that was never stated precisely. A precise statement says what the **input** is, what the **output** must be, and what happens in the edge cases.

Take "find the largest number in a list". Questions a precise statement must answer: what if the list is empty? If the largest value appears twice, does it matter which one? Is the answer the value or its position? One precise version:

- **Input:** a list of numbers, possibly empty.
- **Output:** the largest value in the list, or `None` if the list is empty.

Now an algorithm: remember the first value as the best so far, look at each remaining value in turn, and replace the best whenever a value is larger. Predict before running: what will each of the four calls print?

```python type
def largest(numbers):
    if not numbers:
        return None
    best = numbers[0]
    for value in numbers[1:]:
        if value > best:
            best = value
    return best

print(largest([3, 9, 2, 9, 4]))
print(largest([-5, -2, -8]))
print(largest([7]))
print(largest([]))
```

```output
9
-2
7
None
```

The prints are 9, −2, 7 and `None`. The negative list is a classic trap: an algorithm that started from `best = 0` instead of the first value would wrongly answer 0. The one-element and empty lists are the other two cases worth always trying. Python has `max`, of course; the point is that even this tiny algorithm had decisions in it that only a precise statement settles (`max([])` raises an error instead of returning `None`: a different, equally valid, specification).

## Checking against a simple, obviously correct version

How do you know an algorithm is correct? Later lessons prove correctness with **invariants**. A quick practical check works now: compare the algorithm, on many random inputs, with a **brute-force** version so simple it is obviously right, even if it is slow. Here the obvious version is "the value that no other value is larger than".

```python type
import random

def largest_brute_force(numbers):
    if not numbers:
        return None
    for candidate in numbers:
        if all(candidate >= other for other in numbers):
            return candidate

random.seed(0)
for trial in range(1000):
    numbers = [random.randint(-50, 50) for _ in range(random.randint(0, 8))]
    assert largest(numbers) == largest_brute_force(numbers), numbers
print("largest agrees with the brute-force version on 1000 random lists, including empty ones")
```

```output
largest agrees with the brute-force version on 1000 random lists, including empty ones
```

`assert condition, message` stops with an error showing `message` (here the failing list) if the condition is false. Random lists of length 0 to 8 cover the empty list, single elements, negatives and repeats many times over. If there were a bug, the failing input would be printed, small enough to trace by hand. This habit, a **brute-force oracle**, comes back throughout the series.

## Counting steps

Is an algorithm fast? Timing it with a stopwatch depends on the computer, on what else is running and on the size of the input. A more useful measure is to **count the basic steps** the algorithm performs, and see how that count grows with the input size, written **n**.

For searching an unsorted list, the basic step is a comparison. Here is a search that counts its comparisons. Before running, predict the count when the target is first, last and absent in a list of 1,000 items.

```python type
def linear_search_counted(items, target):
    comparisons = 0
    for index, item in enumerate(items):
        comparisons += 1
        if item == target:
            return index, comparisons
    return -1, comparisons

items = list(range(1000))
for target in [0, 999, -1]:
    index, comparisons = linear_search_counted(items, target)
    print(f"target {target:>4}: found at index {index:>4} after {comparisons} comparisons")
```

```output
target    0: found at index    0 after 1 comparisons
target  999: found at index  999 after 1000 comparisons
target   -1: found at index   -1 after 1000 comparisons
```

The **best case** is 1 comparison (the target is first), the **worst case** is n comparisons (the target is last or missing). The worst case is usually what matters: it is a guarantee. Doubling the list doubles the worst case, so linear search does work **proportional to n**. The next lesson gives this a name, O(n), and a precise meaning.

## Two correct algorithms, very different costs

Different algorithms for the same problem can differ wildly in cost, and the difference grows with the input. The problem: **does a list contain any value twice?** Three correct algorithms:

1. **Compare every pair**: for each position, compare with every later position. About n²/2 comparisons.
2. **Sort, then compare neighbours**: after sorting, any repeated values sit next to each other, so one pass checks n − 1 neighbouring pairs (plus the cost of sorting, around n log₂ n comparisons).
3. **Remember what has been seen** in a set, checking each new value against it. About n steps, each a set lookup.

Predict before running: for a list of 2,000 distinct values (the worst case, since no early exit happens), how many comparisons will the pairwise method make?

```python type
def has_duplicate_pairs(values):
    comparisons = 0
    for i in range(len(values)):
        for j in range(i + 1, len(values)):
            comparisons += 1
            if values[i] == values[j]:
                return True, comparisons
    return False, comparisons

def has_duplicate_set(values):
    steps = 0
    seen = set()
    for value in values:
        steps += 1
        if value in seen:
            return True, steps
        seen.add(value)
    return False, steps

for n in [500, 1000, 2000]:
    values = list(range(n))
    print(f"n = {n:>4}: pairs {has_duplicate_pairs(values)[1]:>9,} comparisons;  set {has_duplicate_set(values)[1]:>5,} lookups")
```

```output
n =  500: pairs   124,750 comparisons;  set   500 lookups
n = 1000: pairs   499,500 comparisons;  set 1,000 lookups
n = 2000: pairs 1,999,000 comparisons;  set 2,000 lookups
```

The `:>9,` format right-aligns the number in 9 characters and adds thousands separators.

The pairwise method makes n(n − 1)/2 comparisons: 1,999,000 for 2,000 values. Doubling n multiplies its work by about **four**, while the set method's work only doubles. At a million values, the pairwise method would need about 500 billion comparisons, hours of work, while the set method needs a million lookups, well under a second. This is the central fact of the subject: for large inputs, the **growth rate** of an algorithm's cost matters far more than the speed of the computer or small tweaks to the code.

Counting a set lookup as one step hides some detail (it is fast on average, for reasons covered in the hash tables lesson), and sorting has its own cost. Measuring real running time confirms the picture:

```python type
import time

values = list(range(2000))
for method in [has_duplicate_pairs, has_duplicate_set]:
    start = time.perf_counter()
    method(values)
    print(f"{method.__name__}: {time.perf_counter() - start:.4f} seconds")
```

`time.perf_counter()` reads a high-resolution clock; the difference between two readings is the elapsed time. The exact times vary with the computer, but the pairwise method is slower by a factor of hundreds or more, and the gap widens as n grows.

::: challenge Count the steps of a search [easy]
Write `count_matches(items, target)` returning a tuple `(count, comparisons)`: how many times `target` appears in `items`, and how many comparisons were made to find out. Every item must be compared with the target exactly once (unlike a search, counting cannot stop early).

```python starter
def count_matches(items, target):
    return 0, 0

print(count_matches([4, 1, 4, 4, 2], 4))
```

```python solution
def count_matches(items, target):
    count = 0
    comparisons = 0
    for item in items:
        comparisons += 1
        if item == target:
            count += 1
    return count, comparisons

print(count_matches([4, 1, 4, 4, 2], 4))
```

```python test
assert "count_matches" in dir(), "Keep the function's name as count_matches."
assert count_matches([4, 1, 4, 4, 2], 4) == (3, 5), f"For [4, 1, 4, 4, 2] and 4, expected (3, 5); got {count_matches([4, 1, 4, 4, 2], 4)}."
assert count_matches([], 7) == (0, 0), "An empty list has no matches and needs no comparisons."
assert count_matches(["a", "b"], "c") == (0, 2), "When the target is absent, the count is 0 but every item was still compared."
assert count_matches([5] * 10, 5) == (10, 10), "Every item matches: count and comparisons are both 10."
assert ".count(" not in _source, "Count the matches with your own loop, so you can count the comparisons too."
"SUCCESS: Counting always makes exactly n comparisons: no best case, no early exit."
```

Hint: Loop over every item, adding 1 to `comparisons` each time, and 1 to `count` when the item equals the target.
:::

::: challenge Sort, then compare neighbours [medium]
Write `has_duplicate_sorted(values)` using the second method from the lesson: sort a **copy** of the list (use `sorted`, so the caller's list is not changed), then compare each neighbouring pair. Return a tuple `(answer, comparisons)` where `answer` is `True` or `False` and `comparisons` counts the neighbour comparisons only (stop at the first equal pair).

Then check your function against the lesson's `has_duplicate_set` on 500 random lists (any sizes from 0 to 10, values from 0 to 9), and set `agree` to `True` if the answers always matched.

```python starter
import random

def has_duplicate_sorted(values):
    return False, 0

agree = False
print(has_duplicate_sorted([3, 1, 4, 1, 5]), agree)
```

```python solution
import random

def has_duplicate_sorted(values):
    ordered = sorted(values)
    comparisons = 0
    for i in range(len(ordered) - 1):
        comparisons += 1
        if ordered[i] == ordered[i + 1]:
            return True, comparisons
    return False, comparisons

random.seed(1)
agree = True
for _ in range(500):
    values = [random.randint(0, 9) for _ in range(random.randint(0, 10))]
    if has_duplicate_sorted(values)[0] != has_duplicate_set(values)[0]:
        agree = False
print(has_duplicate_sorted([3, 1, 4, 1, 5]), agree)
```

```python test
assert "has_duplicate_sorted" in dir(), "Keep the function's name as has_duplicate_sorted."
assert has_duplicate_sorted([3, 1, 4, 1, 5]) == (True, 1), f"[3, 1, 4, 1, 5] sorts to [1, 1, 3, 4, 5]: the first neighbour pair is equal, so (True, 1); got {has_duplicate_sorted([3, 1, 4, 1, 5])}."
assert has_duplicate_sorted([5, 2, 8, 1]) == (False, 3), "Four distinct values need 3 neighbour comparisons and give False."
assert has_duplicate_sorted([]) == (False, 0) and has_duplicate_sorted([7]) == (False, 0), "Empty and one-element lists have no neighbours to compare: (False, 0)."
assert has_duplicate_sorted([2, 9, 4, 9]) == (True, 3), "[2, 9, 4, 9] sorts to [2, 4, 9, 9]: the duplicate is found at the third comparison."
_keep = [3, 1, 2]
has_duplicate_sorted(_keep)
assert _keep == [3, 1, 2], "Don't sort the caller's list in place: use sorted(values), which returns a new list."
import random as _random
_rr = _random.Random(11)
for _ in range(500):
    _vs = [_rr.randint(0, 9) for _ in range(_rr.randint(0, 10))]
    assert has_duplicate_sorted(_vs)[0] == (len(set(_vs)) < len(_vs)), f"has_duplicate_sorted({_vs}) gave the wrong answer."
assert agree is True, "Set agree to True after checking your function against has_duplicate_set on random lists (they should always agree)."
"SUCCESS: Sorting brings equal values together, so one pass of n − 1 neighbour comparisons is enough: a third correct algorithm with yet another cost."
```

Hint: `ordered = sorted(values)`, then loop `i` from 0 to `len(ordered) - 2` comparing `ordered[i]` with `ordered[i + 1]`. For the check, generate lists with `random.randint` and compare the first element of each function's result.
:::

::: challenge Second largest, precisely [medium]
"The second largest value" is ambiguous. Use this precise statement: **input** a list of numbers; **output** the largest value that is strictly smaller than the maximum, or `None` if there is no such value (an empty list, one element, or all values equal). So `[5, 9, 9, 3]` gives 5, not 9.

Write `second_largest(numbers)` using a **single pass** over the list without sorting (keep the best and second-best seen so far). Then write `second_largest_brute_force(numbers)` the obvious way (for example with a set and `sorted`), and use it to check your function on many random lists.

```python starter
def second_largest(numbers):
    return None

def second_largest_brute_force(numbers):
    return None

print(second_largest([5, 9, 9, 3]))
```

```python solution
def second_largest(numbers):
    best = None
    second = None
    for value in numbers:
        if best is None or value > best:
            second = best
            best = value
        elif value < best and (second is None or value > second):
            second = value
    return second

def second_largest_brute_force(numbers):
    distinct = sorted(set(numbers))
    return distinct[-2] if len(distinct) >= 2 else None

print(second_largest([5, 9, 9, 3]))
```

```python test
import random as _random
assert "second_largest" in dir() and "second_largest_brute_force" in dir(), "Keep both function names."
assert second_largest([5, 9, 9, 3]) == 5, f"[5, 9, 9, 3] should give 5 (the second distinct value), got {second_largest([5, 9, 9, 3])}."
assert second_largest([]) is None and second_largest([4]) is None and second_largest([2, 2, 2]) is None, "Empty lists, single values and all-equal lists have no second largest: return None."
assert second_largest([-3, -1, -7]) == -3, "Negative numbers: the second largest of [-3, -1, -7] is -3."
assert second_largest([1, 2, 3, 4]) == 3 and second_largest([4, 3, 2, 1]) == 3, "Check increasing and decreasing orders."
assert second_largest_brute_force([5, 9, 9, 3]) == 5 and second_largest_brute_force([2, 2]) is None, "The brute-force version should follow the same specification."
_r = _random.Random(3)
for _ in range(2000):
    _xs = [_r.randint(-5, 5) for _ in range(_r.randint(0, 7))]
    _d = sorted(set(_xs)); _want = _d[-2] if len(_d) >= 2 else None
    assert second_largest(_xs) == _want, f"second_largest({_xs}) returned {second_largest(_xs)}; the specification gives {_want}."
assert "sort" not in (_source.split("def second_largest(")[1].split("\ndef ")[0] if "def second_largest(" in _source else ""), "Write second_largest in a single pass, without sorting (sorting is fine in the brute-force version)."
"SUCCESS: One pass, two remembered values, and every awkward case handled because the specification named them first."
```

Hint: Keep `best` and `second`, both starting as `None`. A value larger than `best` pushes the old `best` down to `second`. A value strictly between `second` and `best` replaces `second`. A value equal to `best` changes nothing.
:::

## What you learned

- An algorithm is a finite, unambiguous procedure that gives a correct output for every valid input. Stating the problem precisely, including empty, single-element, negative and repeated inputs, comes first.
- A brute-force version that is obviously correct makes a strong test: compare on many small random inputs and any bug shows up with a small failing example.
- Counting basic steps measures an algorithm independently of the computer: linear search makes up to n comparisons; checking every pair makes about n²/2.
- Correct algorithms for the same problem can differ enormously in cost, and the gap grows with n. The next lesson makes "how cost grows" precise with Big-O notation.
