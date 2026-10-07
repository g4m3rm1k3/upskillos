# Elementary sorts

Sorting is the most studied problem in computing, and for good reason: sorted data makes searching (binary search), grouping, de-duplicating, merging and ranking easy. Python's `sorted` is excellent and you should use it. But the ideas inside sorting algorithms (invariants, comparisons, swaps, divide and conquer, the difference between average and worst cases) are the foundations of algorithm design, and the simple sorts show them most clearly.

This lesson builds the three classic O(n²) sorts, each with its invariant:

- **selection sort**: repeatedly select the smallest remaining item;
- **insertion sort**: insert each item into the sorted part on its left;
- **bubble sort**: repeatedly swap neighbours that are out of order;

and then compares them by counting comparisons and moves on different kinds of input, and introduces **stability**, a property that matters whenever you sort records by one field.

## Selection sort

Selection sort's invariant: **after i passes, the first i positions hold the i smallest items, in sorted order**, and they never move again. Each pass scans the unsorted part for its smallest item and swaps it into position i. Predict before running: how many comparisons will it make on 8 items, and does it depend on the order of the input?

```python type
def selection_sort(items):
    a = list(items)
    comparisons = swaps = 0
    for i in range(len(a)):
        smallest = i
        for j in range(i + 1, len(a)):
            comparisons += 1
            if a[j] < a[smallest]:
                smallest = j
        if smallest != i:
            a[i], a[smallest] = a[smallest], a[i]
            swaps += 1
        print(f"  after pass {i}: {a[:i + 1]} | {a[i + 1:]}")
    return a, comparisons, swaps

result, comparisons, swaps = selection_sort([5, 2, 8, 1, 9, 3, 7, 4])
print(result, f"{comparisons} comparisons, {swaps} swaps")
print("already sorted input:", selection_sort(list(range(8)))[1:], "(comparisons, swaps)")
```

```output
  after pass 0: [1] | [2, 8, 5, 9, 3, 7, 4]
  after pass 1: [1, 2] | [8, 5, 9, 3, 7, 4]
  after pass 2: [1, 2, 3] | [5, 9, 8, 7, 4]
  after pass 3: [1, 2, 3, 4] | [9, 8, 7, 5]
  after pass 4: [1, 2, 3, 4, 5] | [8, 7, 9]
  after pass 5: [1, 2, 3, 4, 5, 7] | [8, 9]
  after pass 6: [1, 2, 3, 4, 5, 7, 8] | [9]
  after pass 7: [1, 2, 3, 4, 5, 7, 8, 9] | []
[1, 2, 3, 4, 5, 7, 8, 9] 28 comparisons, 5 swaps
  after pass 0: [0] | [1, 2, 3, 4, 5, 6, 7]
  after pass 1: [0, 1] | [2, 3, 4, 5, 6, 7]
  after pass 2: [0, 1, 2] | [3, 4, 5, 6, 7]
  after pass 3: [0, 1, 2, 3] | [4, 5, 6, 7]
  after pass 4: [0, 1, 2, 3, 4] | [5, 6, 7]
  after pass 5: [0, 1, 2, 3, 4, 5] | [6, 7]
  after pass 6: [0, 1, 2, 3, 4, 5, 6] | [7]
  after pass 7: [0, 1, 2, 3, 4, 5, 6, 7] | []
already sorted input: (28, 0) (comparisons, swaps)
```

`a = list(items)` sorts a copy, so the caller's list is unchanged. The `|` in the trace separates the sorted part from the rest.

The sorted part grows by one item per pass, exactly as the invariant says. Selection sort always makes n(n − 1)/2 comparisons, 28 for 8 items, whatever the input, even when it is already sorted: it never notices. Its strength is that it makes at most n − 1 swaps, which matters only when moving items is far more expensive than comparing them.

## Insertion sort

Insertion sort is how most people sort a hand of cards: take the next card and slide it left past the larger ones until it sits in place. Its invariant: **after processing i items, the first i positions hold those same items, in sorted order** (not necessarily the smallest overall; later items may still go in front of them). Predict before running: how many comparisons for a sorted input of 8 items, and for a reversed one?

```python type
def insertion_sort(items):
    a = list(items)
    comparisons = shifts = 0
    for i in range(1, len(a)):
        current = a[i]
        j = i - 1
        while j >= 0:
            comparisons += 1
            if a[j] <= current:
                break
            a[j + 1] = a[j]
            shifts += 1
            j -= 1
        a[j + 1] = current
    return a, comparisons, shifts

for name, data in [("random", [5, 2, 8, 1, 9, 3, 7, 4]), ("sorted", list(range(8))), ("reversed", list(range(8, 0, -1)))]:
    result, comparisons, shifts = insertion_sort(data)
    print(f"{name:<9} {result}  {comparisons:>2} comparisons, {shifts:>2} shifts")
```

```output
random    [1, 2, 3, 4, 5, 7, 8, 9]  18 comparisons, 13 shifts
sorted    [0, 1, 2, 3, 4, 5, 6, 7]   7 comparisons,  0 shifts
reversed  [1, 2, 3, 4, 5, 6, 7, 8]  28 comparisons, 28 shifts
```

Instead of swapping repeatedly, the larger items are **shifted** one place right and `current` is dropped into the gap, which halves the number of writes.

On sorted input each item is compared once with its left neighbour and stays put: 7 comparisons, O(n). On reversed input every item slides all the way to the front: 28 comparisons, O(n²). Insertion sort is **adaptive**: its work depends on how unsorted the input is. Precisely, the number of shifts equals the number of **inversions**, pairs of items in the wrong order relative to each other, which the last challenge explores. That makes insertion sort the best choice for small or nearly sorted data, and real-world sorts (including Python's own) use it for short runs.

## Bubble sort

Bubble sort walks through the list swapping each neighbouring pair that is out of order. After one pass the largest item has "bubbled" to the end; its invariant is **after i passes, the last i positions hold the i largest items, in order**. If a whole pass makes no swaps, the list is sorted and it can stop early. It is easy to state, and makes exactly one swap per inversion, the same number as insertion sort's shifts; but each swap is two writes instead of one, and it makes more comparisons, so it is mostly taught, not used. The first challenge writes it.

## Comparing them

Counting operations on bigger inputs shows the differences clearly. The **nearly sorted** case (a sorted list with a few random swaps) is common in practice: data that was sorted, then lightly edited. Predict before running: which sort does best on nearly sorted data, and by how much?

```python type
import random

random.seed(0)
n = 400
inputs = {"random": random.sample(range(n), n), "sorted": list(range(n)), "reversed": list(range(n, 0, -1))}
nearly = list(range(n))
for _ in range(5):
    i, j = random.randrange(n), random.randrange(n)
    nearly[i], nearly[j] = nearly[j], nearly[i]
inputs["nearly sorted"] = nearly

print(f"{'input':<14} {'selection comparisons':>22} {'insertion comparisons':>22} {'insertion shifts':>17}")
for name, data in inputs.items():
    sel_c = n * (n - 1) // 2
    _, ins_c, ins_s = insertion_sort(data)
    print(f"{name:<14} {sel_c:>22,} {ins_c:>22,} {ins_s:>17,}")
```

```output
input           selection comparisons  insertion comparisons  insertion shifts
random                         79,800                 40,112            39,716
sorted                         79,800                    399                 0
reversed                       79,800                 79,800            79,800
nearly sorted                  79,800                  1,402             1,003
```

Selection sort's printing trace would flood the output at this size, so its count is filled in from the formula n(n − 1)/2, which the first demo showed it always makes.

Selection sort makes 79,800 comparisons every time. Insertion sort ranges from 399 (sorted) to 79,800 (reversed), and about half of that on random input. On the nearly sorted input it makes only about 1,400, under 2% of the worst case: a handful of swaps creates only a few inversions to fix. All three elementary sorts are O(n²) in the worst case, which is why lists of a million items need the O(n log n) sorts of the next lessons. But for small n, or nearly sorted data, insertion sort's low overhead makes it a winner.

## Stability

A sort is **stable** if items that compare equal keep their original relative order. That matters when sorting records by one field: sort people by surname, and those with the same surname should stay in the order they were in, perhaps already sorted by first name. Sorting by several keys can then be done one key at a time, least important first. Predict before running: after sorting by grade, will Ann still come before Cat?

```python type
students = [("Ann", "B"), ("Ben", "A"), ("Cat", "B"), ("Dan", "A"), ("Eve", "C")]

def insertion_sort_by(records, key):
    a = list(records)
    for i in range(1, len(a)):
        current = a[i]
        j = i - 1
        while j >= 0 and key(a[j]) > key(current):
            a[j + 1] = a[j]
            j -= 1
        a[j + 1] = current
    return a

def selection_sort_by(records, key):
    a = list(records)
    for i in range(len(a)):
        smallest = min(range(i, len(a)), key=lambda k: key(a[k]))
        a[i], a[smallest] = a[smallest], a[i]
    return a

grade = lambda record: record[1]
print("insertion:", insertion_sort_by(students, grade))
print("selection:", selection_sort_by(students, grade))
print("sorted():  ", sorted(students, key=grade))
```

```output
insertion: [('Ben', 'A'), ('Dan', 'A'), ('Ann', 'B'), ('Cat', 'B'), ('Eve', 'C')]
selection: [('Ben', 'A'), ('Dan', 'A'), ('Cat', 'B'), ('Ann', 'B'), ('Eve', 'C')]
sorted():   [('Ben', 'A'), ('Dan', 'A'), ('Ann', 'B'), ('Cat', 'B'), ('Eve', 'C')]
```

`key` is a function that extracts what to sort by, the same convention as Python's `sorted(..., key=...)`. `min(range(i, len(a)), key=...)` finds the position of the smallest remaining item.

Insertion sort is stable: it only moves an item past strictly **greater** ones (`>`, not `>=`), so equal grades keep their order: Ben before Dan, Ann before Cat. Selection sort is **not** stable: its long-distance swap moved Ann behind Cat. Python's `sorted` is guaranteed stable, which is why `sorted(sorted(people, key=first_name), key=surname)` gives surname order with first names in order within each surname.

::: challenge Bubble sort with early exit [easy]
Write `bubble_sort(items)` returning a tuple `(sorted_copy, passes)`: repeatedly pass through the list swapping neighbouring items that are out of order (`a[j] > a[j + 1]`), stopping after the first pass that makes **no** swaps. Count every pass, including that final one. Each pass can stop one position earlier than the last, since the largest items are already in place.

```python starter
def bubble_sort(items):
    return list(items), 0

print(bubble_sort([5, 1, 4, 2, 8]), bubble_sort([1, 2, 3]))
```

```python solution
def bubble_sort(items):
    a = list(items)
    passes = 0
    end = len(a) - 1
    while True:
        passes += 1
        swapped = False
        for j in range(end):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
                swapped = True
        end -= 1
        if not swapped:
            return a, passes

print(bubble_sort([5, 1, 4, 2, 8]), bubble_sort([1, 2, 3]))
```

```python test
import random as _random
assert "bubble_sort" in dir(), "Keep the function's name as bubble_sort."
assert bubble_sort([5, 1, 4, 2, 8]) == ([1, 2, 4, 5, 8], 3), f"[5, 1, 4, 2, 8] needs two passes with swaps and a third without: expected ([1, 2, 4, 5, 8], 3), got {bubble_sort([5, 1, 4, 2, 8])}."
assert bubble_sort([1, 2, 3]) == ([1, 2, 3], 1), "A sorted list needs one pass with no swaps."
assert bubble_sort([])[0] == [] and bubble_sort([7]) == ([7], 1), "A one-item list finishes after one pass with no swaps."
assert bubble_sort([3, 2, 1])[0] == [1, 2, 3], "A reversed list should be sorted."
_r = _random.Random(3)
for _ in range(300):
    _xs = [_r.randint(0, 9) for _ in range(_r.randint(0, 10))]
    assert bubble_sort(_xs)[0] == sorted(_xs), f"bubble_sort({_xs}) gave {bubble_sort(_xs)[0]}."
_orig = [3, 1, 2]; bubble_sort(_orig)
assert _orig == [3, 1, 2], "Sort a copy: don't change the caller's list."
assert "sort(" not in _source.replace("bubble_sort(", "") and "sorted(" not in _source, "Write the swapping yourself rather than calling a library sort."
"SUCCESS: The early exit makes bubble sort O(n) on sorted input, but it is still O(n²) in the worst case, and does more comparisons and writes than insertion sort."
```

Hint: Loop `while True`. In each pass set `swapped = False`, compare `a[j]` with `a[j + 1]` for j up to the current end, swapping when needed. After the pass, shrink the end by one; if nothing was swapped, return.
:::

::: challenge Sort by several keys [medium]
Using a **stable** sort, records can be sorted by several fields by sorting on each field in turn, **least important first**. Write `multi_sort(records, keys)` where `keys` is a list of key functions from most to least important, returning the records sorted by the first key, ties broken by the second, and so on. Use the lesson's stable `insertion_sort_by` once per key, in the right order. Don't use `sorted` or `.sort`.

```python starter
def multi_sort(records, keys):
    return list(records)

people = [("Smith", "Zoe", 30), ("Jones", "Amy", 25), ("Smith", "Adam", 41), ("Jones", "Amy", 19)]
print(multi_sort(people, [lambda p: p[0], lambda p: p[1], lambda p: p[2]]))
```

```python solution
def multi_sort(records, keys):
    result = list(records)
    for key in reversed(keys):
        result = insertion_sort_by(result, key)
    return result

people = [("Smith", "Zoe", 30), ("Jones", "Amy", 25), ("Smith", "Adam", 41), ("Jones", "Amy", 19)]
print(multi_sort(people, [lambda p: p[0], lambda p: p[1], lambda p: p[2]]))
```

```python test
import random as _random
assert "multi_sort" in dir(), "Keep the function's name as multi_sort."
_people = [("Smith", "Zoe", 30), ("Jones", "Amy", 25), ("Smith", "Adam", 41), ("Jones", "Amy", 19)]
_k = [lambda p: p[0], lambda p: p[1], lambda p: p[2]]
assert multi_sort(_people, _k) == [("Jones", "Amy", 19), ("Jones", "Amy", 25), ("Smith", "Adam", 41), ("Smith", "Zoe", 30)], f"Got {multi_sort(_people, _k)}."
assert multi_sort(_people, [lambda p: -p[2]]) == [("Smith", "Adam", 41), ("Smith", "Zoe", 30), ("Jones", "Amy", 25), ("Jones", "Amy", 19)], "A single key (age, descending, via a negated key) should work."
_r = _random.Random(2)
for _ in range(200):
    _recs = [(_r.choice("ab"), _r.randint(0, 3), _r.random()) for _ in range(_r.randint(0, 9))]
    _got = multi_sort(_recs, [lambda t: t[0], lambda t: t[1]])
    assert _got == sorted(_recs, key=lambda t: (t[0], t[1])), "Ties on both keys should keep the original order (stability)."
assert "sorted(" not in _source and ".sort(" not in _source, "Use insertion_sort_by, once per key."
"SUCCESS: Least important key first, most important last: each stable pass keeps the previous order among ties. Python's sorted with a tuple key does the same in one go."
```

Hint: Sort by the **last** key first: loop over `reversed(keys)`, replacing the result with `insertion_sort_by(result, key)` each time. Stability means each pass preserves the order from the previous passes among records that tie.
:::

::: challenge Inversions and insertion sort [medium]
An **inversion** is a pair of positions i < j with `a[i] > a[j]`. Write `count_inversions(a)` by brute force (check every pair). Then verify, on 300 random lists, that insertion sort's number of shifts (the third value returned by the lesson's `insertion_sort`) always equals the number of inversions, and set `shifts_equal_inversions` to `True` if it does. Finally, set `max_inversions_8` to the largest possible number of inversions in a list of 8 distinct items.

```python starter
import random

def count_inversions(a):
    return 0

shifts_equal_inversions = False
max_inversions_8 = 0
print(count_inversions([3, 1, 2]))
```

```python solution
import random

def count_inversions(a):
    return sum(1 for i in range(len(a)) for j in range(i + 1, len(a)) if a[i] > a[j])

random.seed(4)
shifts_equal_inversions = True
for _ in range(300):
    data = [random.randint(0, 20) for _ in range(random.randint(0, 15))]
    if insertion_sort(data)[2] != count_inversions(data):
        shifts_equal_inversions = False
max_inversions_8 = 8 * 7 // 2
print(count_inversions([3, 1, 2]))
```

```python test
import random as _random
assert "count_inversions" in dir(), "Keep the function's name as count_inversions."
for _xs, _want in [([3, 1, 2], 2), ([], 0), ([1, 2, 3], 0), ([3, 2, 1], 3), ([2, 2, 1], 2), ([1, 1], 0)]:
    assert count_inversions(_xs) == _want, f"count_inversions({_xs}) should be {_want}, got {count_inversions(_xs)}."
_r = _random.Random(5)
for _ in range(200):
    _xs = [_r.randint(0, 9) for _ in range(_r.randint(0, 12))]
    assert count_inversions(_xs) == insertion_sort(_xs)[2], f"count_inversions({_xs}) disagrees with insertion sort's shifts."
assert shifts_equal_inversions is True, "Set shifts_equal_inversions to True after checking the claim on random lists."
assert max_inversions_8 == 28, "The most inversions comes from a reversed list: every one of the 8 × 7 / 2 = 28 pairs is out of order."
"SUCCESS: Each shift fixes exactly one inversion, so insertion sort does O(n + inversions) work: fast when the data is nearly sorted, n(n − 1)/2 shifts when it is reversed."
```

Hint: A double loop over i < j counting `a[i] > a[j]`. Equal values are not inversions (that is why insertion sort uses `<=` to stop). The maximum is when every pair is inverted: a reversed list.
:::

## What you learned

- Selection sort grows a sorted prefix of the smallest items: always n(n − 1)/2 comparisons, but at most n − 1 swaps; it is not stable.
- Insertion sort inserts each item into the sorted part on its left: O(n) on sorted input, O(n²) on reversed, and its shifts equal the number of inversions, so it excels on small or nearly sorted data. It is stable.
- Bubble sort swaps neighbours until a pass makes no swaps; easy to state, rarely the best choice.
- A stable sort keeps equal items in their original order, which allows sorting by several keys one at a time, least important first. Python's `sorted` is stable.

The next lesson breaks the O(n²) barrier with merge sort, using divide and conquer.
