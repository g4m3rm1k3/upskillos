# Merge sort

The elementary sorts are O(n²): sorting a million items would take around half a trillion comparisons. **Merge sort** needs about 20 million, and it gets there with an idea that runs through the rest of this series: **divide and conquer**. Split the problem into halves, solve each half (recursively, the same way), and combine the two answers. For sorting, the combining step is **merging**: turning two sorted lists into one sorted list, which takes only linear time.

This lesson covers:

- merging two sorted lists in O(n), and why it is stable;
- merge sort itself, traced on a small example;
- its running time, O(n log n), from the recurrence lesson, confirmed by counting;
- the cost: O(n) extra memory;
- the bottom-up version without recursion.

## Merging two sorted lists

Given two lists that are each already sorted, the smallest item overall must be at the front of one of them. So compare the two front items, take the smaller, and repeat; when one list runs out, the rest of the other is already in order and can be copied across. Every step places one item, so merging lists of total length n takes at most n − 1 comparisons. Predict before running: in what order will the items be taken?

```python type
def merge(left, right, trace=False):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
        if trace:
            print(f"  took {result[-1]}: result so far {result}")
    result.extend(left[i:])
    result.extend(right[j:])
    return result

print(merge([1, 4, 7, 9], [2, 3, 8], trace=True))
```

```output
  took 1: result so far [1]
  took 2: result so far [1, 2]
  took 3: result so far [1, 2, 3]
  took 4: result so far [1, 2, 3, 4]
  took 7: result so far [1, 2, 3, 4, 7]
  took 8: result so far [1, 2, 3, 4, 7, 8]
[1, 2, 3, 4, 7, 8, 9]
```

`i` and `j` mark the front of each list; slicing off the leftovers at the end copies whatever remains of the list that did not run out.

The items come out 1, 2, 3, 4, 7, 8, and then the 9 left over in the first list is copied across. The comparison is `<=`, not `<`: when the two front items are equal, the one from the **left** list is taken first. That one character makes merge sort **stable**, since items from the left half were earlier in the original list.

## Divide and conquer

Merge sort is now three lines of thinking: a list of 0 or 1 items is already sorted (the base case); otherwise sort the left half, sort the right half, and merge them. The trace below indents each call by its depth. Predict before running: how many levels deep does it go for 8 items?

```python type
def merge_sort(items, depth=0, trace=False):
    if trace:
        print("    " * depth + f"sort {items}")
    if len(items) <= 1:
        return list(items)
    middle = len(items) // 2
    left = merge_sort(items[:middle], depth + 1, trace)
    right = merge_sort(items[middle:], depth + 1, trace)
    merged = merge(left, right)
    if trace:
        print("    " * depth + f"merged -> {merged}")
    return merged

merge_sort([5, 2, 8, 1, 9, 3, 7, 4], trace=True)
```

```output
sort [5, 2, 8, 1, 9, 3, 7, 4]
    sort [5, 2, 8, 1]
        sort [5, 2]
            sort [5]
            sort [2]
        merged -> [2, 5]
        sort [8, 1]
            sort [8]
            sort [1]
        merged -> [1, 8]
    merged -> [1, 2, 5, 8]
    sort [9, 3, 7, 4]
        sort [9, 3]
            sort [9]
            sort [3]
        merged -> [3, 9]
        sort [7, 4]
            sort [7]
            sort [4]
        merged -> [4, 7]
    merged -> [3, 4, 7, 9]
merged -> [1, 2, 3, 4, 5, 7, 8, 9]
[1, 2, 3, 4, 5, 7, 8, 9]
```

The slices `items[:middle]` and `items[middle:]` copy each half; that copying is part of why merge sort needs extra memory.

The list is split into halves, quarters and single items: 3 levels of splitting below the top, because 8 = 2³. Then the merges come back up: pairs of single items merge into sorted pairs, pairs into fours, and the fours into the final eight. Nothing is "sorted" in the usual sense anywhere: all the work is done by merging. By trusting the recursive calls, the code is as short as the description.

## O(n log n), counted

From the recurrences lesson: merge sort's cost is T(n) = 2T(n/2) + O(n), the balanced case of the master theorem, so O(n log n). Every level of the recursion tree merges n items in total, and there are about log₂ n levels. Counting actual comparisons confirms it. Predict before running: for 100,000 items, roughly how many comparisons, compared with insertion sort's expected n²/4?

```python type
import math
import random

def merge_sort_counted(items):
    if len(items) <= 1:
        return list(items), 0
    middle = len(items) // 2
    left, c1 = merge_sort_counted(items[:middle])
    right, c2 = merge_sort_counted(items[middle:])
    result, i, j, c = [], 0, 0, 0
    while i < len(left) and j < len(right):
        c += 1
        if left[i] <= right[j]:
            result.append(left[i]); i += 1
        else:
            result.append(right[j]); j += 1
    result.extend(left[i:]); result.extend(right[j:])
    return result, c1 + c2 + c

random.seed(0)
for n in [1_000, 10_000, 100_000]:
    data = [random.random() for _ in range(n)]
    result, comparisons = merge_sort_counted(data)
    assert result == sorted(data)
    print(f"n = {n:>7,}: {comparisons:>10,} comparisons;  n log2 n = {round(n * math.log2(n)):>10,};  insertion sort ~ n²/4 = {n * n // 4:>14,}")
```

```output
n =   1,000:      8,721 comparisons;  n log2 n =      9,966;  insertion sort ~ n²/4 =        250,000
n =  10,000:    120,388 comparisons;  n log2 n =    132,877;  insertion sort ~ n²/4 =     25,000,000
n = 100,000:  1,536,207 comparisons;  n log2 n =  1,660,964;  insertion sort ~ n²/4 =  2,500,000,000
```

Writing two statements on one line with `;` keeps the counted merge compact; it is the same merge as before, with a counter.

Merge sort's count sits just below n log₂ n: about 1.5 million comparisons for 100,000 items, against 2.5 **billion** for insertion sort on random data, over 1,500 times more. And merge sort's count stays within a factor of 2 on every input (sorted input needs about half as many): unlike insertion sort, it has no bad cases. Its recursion is only log₂ n deep (17 levels for 100,000 items), so Python's recursion limit is never a problem.

The price is memory. Merging needs somewhere to put the result, so merge sort uses O(n) extra space, whereas the elementary sorts work in place. For data that does not fit in memory, merge sort's other strength takes over: merging reads each input from front to back, so sorted chunks on disk can be merged in a single streaming pass. Databases sort huge tables exactly that way.

## How fast in practice

Counting comparisons ignores the overheads of Python code: function calls, slicing, list appends. Timing shows whether the better growth rate wins anyway. Predict before running: at what size does merge sort overtake insertion sort, and how does it compare with Python's built-in `sorted`?

```python type
import random
import timeit

def insertion_sort(items):
    a = list(items)
    for i in range(1, len(a)):
        current, j = a[i], i - 1
        while j >= 0 and a[j] > current:
            a[j + 1] = a[j]
            j -= 1
        a[j + 1] = current
    return a

random.seed(1)
for n in [16, 128, 1_024, 4_096]:
    data = [random.random() for _ in range(n)]
    repeats = max(1, 4_000 // n)
    times = {f.__name__: timeit.timeit(lambda: f(data), number=repeats) / repeats * 1000
             for f in [insertion_sort, merge_sort, sorted]}
    print(f"n = {n:>5}: " + "   ".join(f"{name} {t:8.3f} ms" for name, t in times.items()))
```

`sorted` is passed like any other function, so all three are timed the same way.

For tiny lists, insertion sort is as fast or faster: it has almost no overhead. By a few hundred items, merge sort is far ahead, and the gap grows with n. Python's `sorted` is faster still, by a large factor, because it is written in C and uses **Timsort**, a merge sort that finds runs already sorted in the data and uses insertion sort on short pieces: the two algorithms of the last two lessons, combined.

## Bottom-up merge sort

The recursion only decides **which** pieces to merge. The same merges can be done directly, with loops: first merge neighbouring single items into sorted pairs, then pairs into fours, then fours into eights, doubling the width each round until one run covers the whole list. This **bottom-up** version uses no recursion at all, and is the second challenge.

::: challenge Union of two sorted lists [easy]
Write `sorted_union(a, b)` that takes two sorted lists, each **without** repeated values, and returns a sorted list of all values that appear in either, each once. Do it in a single merge-like pass, O(len(a) + len(b)): when the two front values are equal, take it once and advance both. Don't use sets or sorting.

```python starter
def sorted_union(a, b):
    return []

print(sorted_union([1, 3, 5, 7], [2, 3, 6, 7, 9]))
```

```python solution
def sorted_union(a, b):
    result = []
    i = j = 0
    while i < len(a) and j < len(b):
        if a[i] < b[j]:
            result.append(a[i]); i += 1
        elif b[j] < a[i]:
            result.append(b[j]); j += 1
        else:
            result.append(a[i]); i += 1; j += 1
    result.extend(a[i:])
    result.extend(b[j:])
    return result

print(sorted_union([1, 3, 5, 7], [2, 3, 6, 7, 9]))
```

```python test
import random as _random
assert "sorted_union" in dir(), "Keep the function's name as sorted_union."
assert sorted_union([1, 3, 5, 7], [2, 3, 6, 7, 9]) == [1, 2, 3, 5, 6, 7, 9], f"Got {sorted_union([1, 3, 5, 7], [2, 3, 6, 7, 9])}."
assert sorted_union([], [1, 2]) == [1, 2] and sorted_union([4], []) == [4] and sorted_union([], []) == [], "If one list is empty, the result is the other."
assert sorted_union([1, 2, 3], [1, 2, 3]) == [1, 2, 3], "Identical lists give each value once."
_r = _random.Random(1)
for _ in range(300):
    _a = sorted(_r.sample(range(30), _r.randint(0, 10))); _b = sorted(_r.sample(range(30), _r.randint(0, 10)))
    assert sorted_union(_a, _b) == sorted(set(_a) | set(_b)), f"sorted_union({_a}, {_b}) is wrong."
assert "set(" not in _source and "sorted(" not in _source and ".sort(" not in _source, "Use a single merge-like pass, not sets or sorting."
"SUCCESS: The merge pattern works for union, intersection and difference of sorted lists alike, all in linear time."
```

Hint: Like `merge`, with a third case: if `a[i] == b[j]`, append it once and advance **both** indices. Copy whatever remains at the end.
:::

::: challenge Bottom-up merge sort [medium]
Write `merge_sort_bottom_up(items)` returning a sorted copy **without recursion**: start with runs of width 1; in each round, merge each neighbouring pair of runs (`a[start:start + width]` and `a[start + width:start + 2 * width]`) using the lesson's `merge`, then double the width, until the width reaches the length of the list. Also return how many rounds were needed, as a tuple `(sorted_list, rounds)`.

```python starter
def merge_sort_bottom_up(items):
    return list(items), 0

print(merge_sort_bottom_up([5, 2, 8, 1, 9, 3, 7, 4, 6]))
```

```python solution
def merge_sort_bottom_up(items):
    a = list(items)
    width = 1
    rounds = 0
    while width < len(a):
        merged = []
        for start in range(0, len(a), 2 * width):
            merged.extend(merge(a[start:start + width], a[start + width:start + 2 * width]))
        a = merged
        width *= 2
        rounds += 1
    return a, rounds

print(merge_sort_bottom_up([5, 2, 8, 1, 9, 3, 7, 4, 6]))
```

```python test
import ast as _ast, random as _random
assert "merge_sort_bottom_up" in dir(), "Keep the function's name as merge_sort_bottom_up."
assert merge_sort_bottom_up([5, 2, 8, 1, 9, 3, 7, 4, 6]) == ([1, 2, 3, 4, 5, 6, 7, 8, 9], 4), f"9 items need widths 1, 2, 4 and 8: 4 rounds. Got {merge_sort_bottom_up([5, 2, 8, 1, 9, 3, 7, 4, 6])}."
assert merge_sort_bottom_up([]) == ([], 0) and merge_sort_bottom_up([3]) == ([3], 0), "Empty and one-item lists need no rounds."
assert merge_sort_bottom_up(list(range(8, 0, -1))) == (list(range(1, 9)), 3), "8 items need exactly 3 rounds."
_r = _random.Random(7)
for _ in range(300):
    _xs = [_r.randint(0, 20) for _ in range(_r.randint(0, 40))]
    assert merge_sort_bottom_up(_xs)[0] == sorted(_xs), f"Wrong result for {_xs}."
_recs = [(_r.randint(0, 3), _i) for _i in range(50)]
class _Rec(tuple):
    def __le__(self, o): return self[0] <= o[0]
    def __lt__(self, o): return self[0] < o[0]
    def __gt__(self, o): return self[0] > o[0]
_out = merge_sort_bottom_up([_Rec(x) for x in _recs])[0]
assert [tuple(x) for x in _out] == sorted(_recs, key=lambda t: t[0]), "Records with equal keys should keep their original order: merge neighbouring runs left then right."
_fn = [_x for _x in _ast.walk(_ast.parse(_source)) if isinstance(_x, _ast.FunctionDef) and _x.name == "merge_sort_bottom_up"][0]
assert not any(isinstance(_c, _ast.Call) and getattr(_c.func, "id", "") in ("merge_sort_bottom_up", "merge_sort") for _c in _ast.walk(_fn)), "Use loops, not recursion."
"SUCCESS: The same merges as the recursive version, ordered by loops: ⌈log₂ n⌉ rounds of O(n) merging each, and still stable."
```

Hint: Loop while `width < len(a)`. Inside, build a new list by stepping `start` through `range(0, len(a), 2 * width)` and extending it with `merge` of the two neighbouring slices (the second may be short or empty at the end). Replace `a`, double `width`, count the round.
:::

::: challenge Merge many sorted lists [medium]
A program has k sorted lists (sorted chunks of a big file, say) and needs them as one sorted list. Write `merge_many(lists)` that merges them in **rounds**: pair up the lists and merge each pair (with the lesson's `merge`; an odd one out passes to the next round unchanged), repeating until one list remains. With n items in total, this is O(n log k), because there are about log₂ k rounds, each touching every item once. Return `[]` for no lists.

```python starter
def merge_many(lists):
    return []

print(merge_many([[1, 5, 9], [2, 6], [0, 3, 4, 8], [7]]))
```

```python solution
def merge_many(lists):
    if not lists:
        return []
    current = [list(x) for x in lists]
    while len(current) > 1:
        next_round = []
        for k in range(0, len(current) - 1, 2):
            next_round.append(merge(current[k], current[k + 1]))
        if len(current) % 2 == 1:
            next_round.append(current[-1])
        current = next_round
    return current[0]

print(merge_many([[1, 5, 9], [2, 6], [0, 3, 4, 8], [7]]))
```

```python test
import random as _random
assert "merge_many" in dir(), "Keep the function's name as merge_many."
assert merge_many([[1, 5, 9], [2, 6], [0, 3, 4, 8], [7]]) == list(range(10)), f"Got {merge_many([[1, 5, 9], [2, 6], [0, 3, 4, 8], [7]])}."
assert merge_many([]) == [] and merge_many([[]]) == [] and merge_many([[3, 4]]) == [3, 4], "No lists, one empty list, or one list."
assert merge_many([[2], [1], [3]]) == [1, 2, 3], "An odd number of lists: the odd one out joins the next round."
_r = _random.Random(4)
for _ in range(200):
    _ls = [sorted(_r.randint(0, 50) for _ in range(_r.randint(0, 6))) for _ in range(_r.randint(1, 9))]
    assert merge_many(_ls) == sorted(_x for _l in _ls for _x in _l), f"merge_many({_ls}) is wrong."
_calls = [0]
_orig_merge = merge
def merge(a, b, trace=False):
    _calls[0] += len(a) + len(b)
    return _orig_merge(a, b)
try:
    merge_many([[_i] for _i in range(64)])
finally:
    merge = _orig_merge
assert _calls[0] > 0, "Use the lesson's merge function to combine the lists."
assert _calls[0] <= 64 * 6, f"Merging 64 one-item lists moved {_calls[0]} items: in rounds it should be 64 × log₂ 64 = 384 at most (merging one list at a time into a growing result costs far more)."
assert "sorted(" not in _source and ".sort(" not in _source, "Merge, don't sort."
"SUCCESS: Pairing the lists up in rounds keeps every merge balanced: n log k work, the same reason merge sort itself splits evenly."
```

Hint: Keep a list `current` of lists. While it has more than one, build the next round by merging `current[0]` with `current[1]`, `current[2]` with `current[3]`, and so on, carrying an unpaired last list over unchanged.
:::

## What you learned

- Merging two sorted lists takes one comparison per item placed; taking from the left list on ties makes it stable.
- Merge sort splits in half, sorts each half recursively and merges: O(n log n) comparisons on every input, about 1.5 million for 100,000 items against billions for insertion sort.
- It needs O(n) extra memory, recursion only log n deep, and merging streams through its inputs, which suits data on disk.
- For tiny inputs insertion sort's low overhead wins; Python's `sorted` (Timsort) combines both ideas in C. The bottom-up version does the same merges with loops.

The next lesson covers the other great O(n log n) sort, quicksort, which sorts in place by partitioning instead of merging.
