# Sorting without comparisons

Merge sort and quicksort make about n log₂ n comparisons. Could a cleverer algorithm do fundamentally better? For any algorithm that learns about the data **only by comparing pairs of items**, the answer is no: there is a proof that every such algorithm needs about n log₂ n comparisons in the worst case. But that proof has an escape hatch in its first assumption. If the items are small integers, or strings of digits, an algorithm can use their **values** directly, as positions in an array, and never compare two items at all. Such sorts run in linear time.

This lesson covers:

- the **n log n lower bound** for comparison sorting, and why it holds;
- **counting sort**: sorting small integers by counting them;
- making counting sort **stable**, with prefix sums, so it can sort records by an integer key;
- **radix sort**: sorting large integers or fixed-length strings one digit at a time.

## The lower bound

Think of a comparison sort as a game of yes-or-no questions: each comparison "is a[i] < a[j]?" has two possible answers. The algorithm must end up knowing which of the n! possible orderings of the input it was given, since each ordering needs a different rearrangement to sort it. With k questions, at most 2ᵏ different answer sequences are possible, so to tell n! orderings apart it needs 2ᵏ ≥ n!, that is k ≥ log₂(n!). And log₂(n!) is about n log₂ n − 1.44n. So **every** comparison sort makes at least about n log₂ n comparisons on some input: merge sort is essentially optimal. Predict before running: how close does merge sort come to the bound?

```python type
import math
import random

def merge_sort_count(items):
    if len(items) <= 1:
        return list(items), 0
    mid = len(items) // 2
    left, a = merge_sort_count(items[:mid])
    right, b = merge_sort_count(items[mid:])
    out, i, j, c = [], 0, 0, 0
    while i < len(left) and j < len(right):
        c += 1
        if left[i] <= right[j]:
            out.append(left[i]); i += 1
        else:
            out.append(right[j]); j += 1
    return out + left[i:] + right[j:], a + b + c

random.seed(0)
for n in [10, 1_000, 100_000]:
    bound = math.lgamma(n + 1) / math.log(2)
    worst = max(merge_sort_count(random.sample(range(n), n))[1] for _ in range(3 if n < 100_000 else 1))
    print(f"n = {n:>7,}: lower bound log2(n!) = {bound:>12,.0f}   merge sort used {worst:>10,}   ratio {worst / bound:.3f}")
```

```output
n =      10: lower bound log2(n!) =           22   merge sort used         25   ratio 1.147
n =   1,000: lower bound log2(n!) =        8,529   merge sort used      8,714   ratio 1.022
n = 100,000: lower bound log2(n!) =    1,516,704   merge sort used  1,536,188   ratio 1.013
```

`math.lgamma(n + 1)` computes the natural logarithm of n! without building the enormous number itself; dividing by ln 2 converts it to log₂.

For large n, merge sort uses only 1 to 2 per cent more comparisons than the theoretical minimum. No comparison sort, however clever, can beat merge sort by more than that sliver. To go faster, an algorithm must stop comparing.

## Counting sort

Suppose the values are integers from 0 to k, say exam marks out of 100. Then sorting needs no comparisons: count how many times each value occurs (one pass, using the value as an index into a list of counts), then write each value out as many times as it was counted, in order. That is O(n + k): linear when k is not much larger than n. Predict before running: how will counting sort's time compare with `sorted` on a million marks?

```python type
import random
import timeit

def counting_sort(values, max_value):
    counts = [0] * (max_value + 1)
    for v in values:
        counts[v] += 1
    result = []
    for value, count in enumerate(counts):
        result.extend([value] * count)
    return result

random.seed(1)
marks = [random.randint(0, 100) for _ in range(1_000_000)]
assert counting_sort(marks, 100) == sorted(marks)
t_count = timeit.timeit(lambda: counting_sort(marks, 100), number=1)
t_sorted = timeit.timeit(lambda: sorted(marks), number=1)
print(f"counting sort: {t_count * 1000:6.0f} ms     sorted(): {t_sorted * 1000:6.0f} ms")
```

`[value] * count` makes a list of `count` copies of `value`, and `extend` adds them all at once.

Counting sort, written in plain Python, is in the same league as `sorted`, which is written in C: with only 101 distinct values, a single counting pass replaces about 20 comparisons per item. The catch is k. Sorting arbitrary 32-bit integers this way would need a counts list of four billion entries. Counting sort is for **small ranges**.

## Stable counting sort, with prefix sums

The version above writes out bare values, so it cannot sort **records** by an integer key (orders by priority, students by year). For that, the counts must say **where** each key's records go. The trick is a **prefix sum**: if there are 3 records with key 0 and 2 with key 1, then key-0 records occupy positions 0–2 and key-1 records start at position 3. Turning counts into starting positions is one pass, and then each record is placed at its key's next free position. Going through the records in their original order makes the sort **stable**. Predict before running: in what order will the two priority-1 orders come out?

```python type
def counting_sort_by(records, key, max_key):
    counts = [0] * (max_key + 1)
    for r in records:
        counts[key(r)] += 1
    starts = [0] * (max_key + 1)
    for k in range(1, max_key + 1):
        starts[k] = starts[k - 1] + counts[k - 1]
    result = [None] * len(records)
    for r in records:
        k = key(r)
        result[starts[k]] = r
        starts[k] += 1
    return result

orders = [("tea", 2), ("bread", 0), ("milk", 1), ("jam", 2), ("eggs", 1), ("salt", 0)]
print(counting_sort_by(orders, key=lambda o: o[1], max_key=2))
```

```output
[('bread', 0), ('salt', 0), ('milk', 1), ('eggs', 1), ('tea', 2), ('jam', 2)]
```

`starts[k]` begins as the first position for key k and moves forward as each record with that key is placed.

The orders come out grouped by priority, and within each priority in their original order: milk before eggs, tea before jam. Stability is not a nicety here: it is the property that makes the next algorithm work.

## Radix sort

To sort large integers without a huge counts list, sort them **one digit at a time**, starting with the **least significant** digit, using a stable counting sort on that digit alone (a key from 0 to 9). After sorting by the last digit, then stably by the tens digit, numbers with the same tens digit stay ordered by their last digit, and so on. After the final, most significant digit, the whole list is sorted. With d digits and base b, that is d passes of O(n + b): linear in n for numbers of fixed size. Predict before running: what does the list look like after the first pass?

```python type
def radix_sort(values, base=10, trace=False):
    result = list(values)
    largest = max(result, default=0)
    place = 1
    while place <= largest:
        result = counting_sort_by(result, key=lambda v: (v // place) % base, max_key=base - 1)
        if trace:
            print(f"  after sorting by the digit worth {place:>3}: {result}")
        place *= base
    return result

print(radix_sort([170, 45, 75, 90, 802, 24, 2, 66], trace=True))
```

```output
  after sorting by the digit worth   1: [170, 90, 802, 2, 24, 45, 75, 66]
  after sorting by the digit worth  10: [802, 2, 24, 45, 66, 170, 75, 90]
  after sorting by the digit worth 100: [2, 24, 45, 66, 75, 90, 170, 802]
[2, 24, 45, 66, 75, 90, 170, 802]
```

`(v // place) % base` extracts one digit: with `place = 10`, it is the tens digit.

After the first pass, the numbers are ordered by their last digit only: 170 and 90 (ending in 0) first, then 802 and 2, and so on. After the tens pass, they are ordered by their last two digits; after the hundreds pass, completely. Three passes for three-digit numbers. Real radix sorts use base 256 (one byte per pass), sorting 32-bit integers in four passes; they beat comparison sorts on large arrays of integers, and the same idea sorts fixed-length strings character by character.

The lesson overall: the n log n bound is real for algorithms that only compare, and the way around it is to exploit the structure of the keys. When keys are arbitrary objects with only an ordering, comparison sorts are the right tool.

::: challenge Sort exam marks [easy]
Write `sort_marks(marks)` that sorts a list of whole-number marks from 0 to 100 **with counting sort** (count each mark, then write them out in order), without `sorted`, `.sort` or any comparison between marks. Also return the most common mark (the smallest one, if several tie), as a tuple `(sorted_marks, most_common)`. Assume the list is not empty.

```python starter
def sort_marks(marks):
    return list(marks), 0

print(sort_marks([70, 55, 70, 100, 0, 55, 70]))
```

```python solution
def sort_marks(marks):
    counts = [0] * 101
    for m in marks:
        counts[m] += 1
    result = []
    for value, count in enumerate(counts):
        result.extend([value] * count)
    most_common = counts.index(max(counts))
    return result, most_common

print(sort_marks([70, 55, 70, 100, 0, 55, 70]))
```

```python test
import random as _random
assert "sort_marks" in dir(), "Keep the function's name as sort_marks."
assert sort_marks([70, 55, 70, 100, 0, 55, 70]) == ([0, 55, 55, 70, 70, 70, 100], 70), f"Got {sort_marks([70, 55, 70, 100, 0, 55, 70])}."
assert sort_marks([5]) == ([5], 5), "A single mark."
assert sort_marks([3, 9, 9, 3]) == ([3, 3, 9, 9], 3), "When marks tie for most common, return the smallest."
_r = _random.Random(0)
for _ in range(200):
    _m = [_r.randint(0, 100) for _ in range(_r.randint(1, 50))]
    _res = sort_marks(_m)
    assert _res[0] == sorted(_m), "The marks should come out sorted."
    _c = [_m.count(_v) for _v in range(101)]
    assert _res[1] == _c.index(max(_c)), "Wrong most common mark."
assert "sorted(" not in _source and ".sort(" not in _source, "Use counting, not a library sort."
"SUCCESS: Counting replaced comparing: one pass to count, one pass over 101 counts to write out, and the counts answer other questions (like the mode) for free."
```

Hint: `counts = [0] * 101`; add one at `counts[m]` for each mark. Write each value out `counts[value]` times. The most common mark is the index of the largest count: `counts.index(max(counts))` finds the first, which is the smallest mark.
:::

::: challenge Sort words of equal length [medium]
Radix sort works on strings too. Write `radix_sort_words(words)` that sorts a list of lowercase words, **all the same length**, using LSD radix sort: for each character position, from the **last** to the first, do a stable counting sort with the lesson's `counting_sort_by`, keyed on that character (`ord(ch) - ord("a")`, a number from 0 to 25). Return the sorted list. Don't compare words with each other.

```python starter
def radix_sort_words(words):
    return list(words)

print(radix_sort_words(["cab", "abc", "bca", "acb", "bac", "cba", "aaa"]))
```

```python solution
def radix_sort_words(words):
    result = list(words)
    if not result:
        return result
    for position in range(len(result[0]) - 1, -1, -1):
        result = counting_sort_by(result, key=lambda w: ord(w[position]) - ord("a"), max_key=25)
    return result

print(radix_sort_words(["cab", "abc", "bca", "acb", "bac", "cba", "aaa"]))
```

```python test
import random as _random, string as _string
assert "radix_sort_words" in dir(), "Keep the function's name as radix_sort_words."
assert radix_sort_words(["cab", "abc", "bca", "acb", "bac", "cba", "aaa"]) == ["aaa", "abc", "acb", "bac", "bca", "cab", "cba"], f"Got {radix_sort_words(['cab', 'abc', 'bca', 'acb', 'bac', 'cba', 'aaa'])}."
assert radix_sort_words([]) == [] and radix_sort_words(["zz"]) == ["zz"], "Empty input and a single word."
_r = _random.Random(9)
for _ in range(100):
    _ln = _r.randint(1, 5)
    _ws = ["".join(_r.choice("abcz") for _ in range(_ln)) for _ in range(_r.randint(0, 20))]
    assert radix_sort_words(_ws) == sorted(_ws), f"radix_sort_words({_ws}) is wrong."
assert "sorted(" not in _source and ".sort(" not in _source and "min(" not in _source, "Sort by characters with counting_sort_by, without comparing words."
"SUCCESS: Last character first, each pass stable: after the pass on the first character, the words are in dictionary order, with no two words ever compared."
```

Hint: Return early for an empty list. Otherwise loop `position` from `len(words[0]) - 1` down to 0. Each pass replaces the list with `counting_sort_by(result, key=..., max_key=25)` using the character at that position. Inside the loop, the lambda reads `position` when it is called, which is during that same pass, so it sees the right value.
:::

::: challenge Choosing the base [medium]
Radix sort's base is a trade-off: a bigger base means fewer passes, but each pass has a bigger counts list. Write `radix_passes(max_value, base)` returning how many digit passes the lesson's `radix_sort` makes for numbers up to `max_value` (the number of base-`base` digits in `max_value`, with 1 for values 0 to base − 1 and 0 when `max_value` is 0). Then compute `work`, a dictionary mapping each base in `[2, 10, 256, 65536]` to the estimated work `passes × (n + base)` for sorting n = 100,000 numbers up to 2³² − 1, and set `best_base` to the base with the least work.

```python starter
def radix_passes(max_value, base):
    return 0

work = {}
best_base = 0
print(radix_passes(999, 10), work, best_base)
```

```python solution
def radix_passes(max_value, base):
    passes = 0
    place = 1
    while place <= max_value:
        passes += 1
        place *= base
    return passes

n = 100_000
work = {b: radix_passes(2**32 - 1, b) * (n + b) for b in [2, 10, 256, 65536]}
best_base = min(work, key=work.get)
print(radix_passes(999, 10), work, best_base)
```

```python test
assert "radix_passes" in dir(), "Keep the function's name as radix_passes."
for (_m, _b), _want in [((999, 10), 3), ((1000, 10), 4), ((0, 10), 0), ((9, 10), 1), ((255, 256), 1), ((256, 256), 2), ((2**32 - 1, 2), 32), ((2**32 - 1, 256), 4), ((2**32 - 1, 65536), 2)]:
    assert radix_passes(_m, _b) == _want, f"radix_passes({_m}, {_b}) should be {_want}, got {radix_passes(_m, _b)}."
_n = 100_000
assert work == {2: 32 * (_n + 2), 10: 10 * (_n + 10), 256: 4 * (_n + 256), 65536: 2 * (_n + 65536)}, f"work should be passes × (n + base) for each base; got {work}."
assert best_base == 65536, "With n = 100,000, two passes with 65,536 counts each is the least estimated work."
f"SUCCESS: Estimated work {', '.join(f'base {b}: {w:,}' for b, w in work.items())}. Base 65,536 wins on paper here, but its counts list no longer fits in fast memory, which is why real implementations usually choose 256."
```

Hint: Count passes by starting `place = 1` and multiplying by the base while `place <= max_value`, exactly as `radix_sort` does. `min(work, key=work.get)` finds the key with the smallest value.
:::

## What you learned

- Any sort that learns only by comparing needs at least log₂(n!) ≈ n log₂ n comparisons in the worst case; merge sort comes within a few per cent of that.
- Counting sort uses values as indices: O(n + k) for integers from 0 to k, ideal for small ranges.
- Prefix sums turn counts into starting positions, giving a stable counting sort that can sort records by an integer key.
- Radix sort applies a stable counting sort to one digit at a time, least significant first: d passes of O(n + base) for d-digit keys, for integers and fixed-length strings alike.

That completes searching and sorting. The next part of the series moves from lists to trees, starting with binary trees.
