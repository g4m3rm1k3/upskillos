# Sliding window

Many questions are about **contiguous** stretches of a list or string: the best week of sales (7 consecutive days), the longest run of a password without a repeated character, the shortest stretch of a DNA sequence containing every type of base. A stretch is fixed by its two ends, so checking them all means O(n²) windows, and if each is then summed or scanned, O(n³). A **sliding window** keeps a window `[left, right]` and moves its edges forward, updating a summary of the window (a sum, a count of characters) **incrementally** as one item enters on the right and another leaves on the left. Each item enters once and leaves once: O(n).

This lesson covers:

- **fixed-size** windows: slide the whole window one step at a time;
- **variable-size** windows: grow on the right, shrink on the left, keeping a condition true;
- keeping counts inside the window with a dictionary;
- when the technique works and when it does not (it needs a condition that shrinking can only help).

## Fixed-size windows

The best 7-day total in a year of daily sales: computing each window's sum from scratch costs 7 additions per window. Sliding instead, the next window's sum is the previous sum, plus the day entering, minus the day leaving: two operations, whatever the window size. Predict before running: how many additions will each method make for 365 days and a 30-day window?

```python type
import random

random.seed(0)
sales = [random.randint(50, 150) + (40 if d % 7 in (5, 6) else 0) for d in range(365)]

def best_window_naive(values, k):
    work, best, where = 0, None, None
    for start in range(len(values) - k + 1):
        total = 0
        for v in values[start:start + k]:
            total += v
            work += 1
        if best is None or total > best:
            best, where = total, start
    return best, where, work

def best_window_sliding(values, k):
    total = sum(values[:k])
    work = k
    best, where = total, 0
    for right in range(k, len(values)):
        total += values[right] - values[right - k]
        work += 2
        if total > best:
            best, where = total, right - k + 1
    return best, where, work

for k in [7, 30]:
    print(f"k = {k:>2}: naive {best_window_naive(sales, k)},  sliding {best_window_sliding(sales, k)}   (best total, start day, operations)")
```

```output
k =  7: naive (967, 298, 2513),  sliding (967, 298, 723)   (best total, start day, operations)
k = 30: naive (3604, 264, 10080),  sliding (3604, 264, 700)   (best total, start day, operations)
```

The weekend bonus (days where `d % 7` is 5 or 6) gives the data a weekly rhythm, as real sales data has.

Both find the same best window; the naive version does about k/2 times as much work, over 10,000 additions for 30-day windows against about 700. The sliding version's cost does not depend on k at all. The same update works for averages, counts of items meeting a condition, and anything else that can be adjusted by adding the new item and removing the old.

## Variable-size windows

Harder questions have no fixed size: "the **shortest** stretch whose total reaches at least 300", for a list of positive numbers. Here both edges move. Extend the right edge one item at a time; whenever the window's sum reaches the target, record its length and then shrink from the left as long as the sum stays at or above the target, since a shorter window is better. Each item is added once and removed at most once: O(n), even though the window changes size.

This works because the values are **positive**: adding an item can only increase the sum and removing one can only decrease it. So once a window starting at some left edge reaches the target, extending it further can only make it longer, and it is safe to move on. With negative numbers that reasoning fails; the next lesson shows how prefix sums handle exact-sum questions with negatives. Predict before running: what is the shortest stretch of the sales data with a total of at least 1,000?

```python type
def shortest_reaching(values, target):
    left, total = 0, 0
    best = None
    for right, v in enumerate(values):
        total += v
        while total >= target:
            if best is None or right - left + 1 < best[1] - best[0] + 1:
                best = (left, right)
            total -= values[left]
            left += 1
    return best

span = shortest_reaching(sales, 1000)
print("shortest stretch reaching 1000:", span, "length", span[1] - span[0] + 1, "total", sum(sales[span[0]:span[1] + 1]))
print(shortest_reaching([2, 3, 1, 2, 4, 3], 7))
print(shortest_reaching([1, 1, 1], 10))
```

```output
shortest stretch reaching 1000: (5, 12) length 8 total 1016
(4, 5)
None
```

The inner `while` shrinks the window as far as it can while the sum still reaches the target, recording each candidate on the way.

The shortest stretch has 8 days (days 5 to 12, totalling 1,016), and for the small example, `[4, 3]` (positions 4 to 5) reaches 7 with just two items. When nothing reaches the target the result is `None`. Notice the shape of the loop: an outer `for` that always grows the window on the right, and an inner `while` that shrinks it on the left. Despite the nested loops it is O(n), because `left` only ever moves forward, at most n times in total.

## Counting inside the window

When the condition depends on **which** items are in the window, keep a dictionary of counts. The classic problem: the longest stretch of a string with no repeated character. Extend the right edge; if the new character already appears in the window, shrink from the left until it does not. Predict before running: what is the longest stretch without repeats in "abcabcbb" and in "the quick brown fox"?

```python type
from collections import defaultdict

def longest_without_repeats(text):
    counts = defaultdict(int)
    left, best = 0, (0, 0)
    for right, ch in enumerate(text):
        counts[ch] += 1
        while counts[ch] > 1:
            counts[text[left]] -= 1
            left += 1
        if right + 1 - left > best[1] - best[0]:
            best = (left, right + 1)
    return text[best[0]:best[1]]

for text in ["abcabcbb", "bbbbb", "the quick brown fox", ""]:
    print(repr(text), "->", repr(longest_without_repeats(text)))
```

```output
'abcabcbb' -> 'abc'
'bbbbb' -> 'b'
'the quick brown fox' -> 'quick brown'
'' -> ''
```

`best` holds the start and end (exclusive) of the longest window seen, so the answer can be returned as text.

"abc" for the first string; "b" for the second; and "quick brown" (11 characters, all different, including one space) for the third: extending it either way would repeat a character. The dictionary keeps the window's contents up to date in O(1) per step, so the whole scan is O(n).

## When a sliding window applies

The technique applies when the window's condition is **monotone**: if a window is valid, every smaller window inside it is valid too (or, for "at least" conditions like the sum target, every larger window containing it). That is what makes it safe to only ever move the edges forward. "No repeated characters", "at most k distinct values", "sum at most S with non-negative numbers" all have this property. "Sum exactly S with negative numbers allowed" does not: a window can stop being valid and become valid again as it grows, and prefix sums handle it instead.

::: challenge Best average rating [easy]
Write `best_average(ratings, k)` returning the highest average of any k consecutive ratings (a float), with a fixed-size sliding window in O(n). Assume `1 <= k <= len(ratings)`.

```python starter
def best_average(ratings, k):
    return 0.0

print(best_average([1, 12, -5, -6, 50, 3], 4))
```

```python solution
def best_average(ratings, k):
    total = sum(ratings[:k])
    best = total
    for right in range(k, len(ratings)):
        total += ratings[right] - ratings[right - k]
        best = max(best, total)
    return best / k

print(best_average([1, 12, -5, -6, 50, 3], 4))
```

```python test
import random as _random, time as _time
assert "best_average" in dir(), "Keep the function's name as best_average."
assert abs(best_average([1, 12, -5, -6, 50, 3], 4) - 12.75) < 1e-9, "The best window is 12, -5, -6, 50, averaging 12.75."
assert best_average([5], 1) == 5 and abs(best_average([3, 3, 3], 3) - 3) < 1e-9, "A single window."
_r = _random.Random(1)
for _ in range(200):
    _xs = [_r.randint(-20, 20) for _ in range(_r.randint(1, 15))]; _k = _r.randint(1, len(_xs))
    _want = max(sum(_xs[i:i + _k]) for i in range(len(_xs) - _k + 1)) / _k
    assert abs(best_average(_xs, _k) - _want) < 1e-9, f"Wrong answer for {_xs} with k = {_k}."
_big = [_r.randint(1, 5) for _ in range(20_000)]
_start = _time.perf_counter(); best_average(_big, 1_000); _el = _time.perf_counter() - _start
assert _el < 0.3, f"20,000 ratings with k = 1,000 took {_el:.1f} s: slide the window instead of summing each one."
"SUCCESS: Add the newcomer, subtract the leaver: every window's sum in O(1), so the scan costs O(n) whatever k is."
```

Hint: Sum the first k ratings. Then for each new position `right`, add `ratings[right]` and subtract `ratings[right - k]`, keeping the largest total. Divide by k at the end.
:::

::: challenge At most k different kinds [medium]
A fruit picker walks along a row of trees, picking one fruit from each tree in a contiguous stretch, but can carry at most k **kinds** of fruit. Write `longest_with_k_kinds(trees, k)` returning the length of the longest stretch containing at most k distinct values, using a variable window and a dictionary of counts (delete a kind from the dictionary when its count drops to 0, so `len(counts)` is the number of kinds in the window).

```python starter
def longest_with_k_kinds(trees, k):
    return 0

print(longest_with_k_kinds(["apple", "pear", "apple", "plum", "plum", "pear", "plum"], 2))
```

```python solution
def longest_with_k_kinds(trees, k):
    counts = {}
    left, best = 0, 0
    for right, kind in enumerate(trees):
        counts[kind] = counts.get(kind, 0) + 1
        while len(counts) > k:
            old = trees[left]
            counts[old] -= 1
            if counts[old] == 0:
                del counts[old]
            left += 1
        best = max(best, right - left + 1)
    return best

print(longest_with_k_kinds(["apple", "pear", "apple", "plum", "plum", "pear", "plum"], 2))
```

```python test
import random as _random, time as _time
assert "longest_with_k_kinds" in dir(), "Keep the function's name as longest_with_k_kinds."
_t = ["apple", "pear", "apple", "plum", "plum", "pear", "plum"]
assert longest_with_k_kinds(_t, 2) == 4, "plum, plum, pear, plum is the longest stretch with 2 kinds."
assert longest_with_k_kinds(_t, 1) == 2 and longest_with_k_kinds(_t, 3) == 7, "With 1 kind: plum, plum. With 3: the whole row."
assert longest_with_k_kinds([], 2) == 0 and longest_with_k_kinds(["a", "b"], 0) == 0, "Empty row, or room for no kinds."
_r = _random.Random(2)
for _ in range(300):
    _xs = [_r.choice("abcd") for _ in range(_r.randint(0, 14))]; _k = _r.randint(0, 4)
    _want = max((j - i for i in range(len(_xs) + 1) for j in range(i, len(_xs) + 1) if len(set(_xs[i:j])) <= _k), default=0)
    assert longest_with_k_kinds(_xs, _k) == _want, f"Wrong answer for {_xs} with k = {_k}."
_big = [_r.randrange(11) for _ in range(20_000)]
_start = _time.perf_counter(); longest_with_k_kinds(_big, 10); _el = _time.perf_counter() - _start
assert _el < 0.5, f"20,000 trees took {_el:.1f} s: move left forward only; don't restart the window."
"SUCCESS: 'At most k kinds' stays true when the window shrinks, so the edges only ever move forward: O(n) with a dictionary of counts."
```

Hint: Add the new kind's count. While the dictionary has more than k keys, decrease the count of `trees[left]` (deleting it at 0) and move left forward. Then record the window length.
:::

::: challenge Smallest window containing a pattern [medium]
Write `smallest_window(text, pattern)` returning the shortest substring of `text` that contains every character of `pattern`, **including repeats** (if pattern has two "a"s, the window needs at least two), or `""` if none exists. If several shortest windows exist, return the leftmost. Keep `need`, a count of each pattern character, and `missing`, how many required characters the window still lacks; grow the window on the right, and whenever `missing` is 0, shrink from the left as far as possible, recording the window.

```python starter
def smallest_window(text, pattern):
    return ""

print(repr(smallest_window("ADOBECODEBANC", "ABC")), repr(smallest_window("aa", "aa")), repr(smallest_window("a", "b")))
```

```python solution
from collections import Counter

def smallest_window(text, pattern):
    if not pattern:
        return ""
    need = Counter(pattern)
    missing = len(pattern)
    left, best = 0, None
    for right, ch in enumerate(text):
        if need[ch] > 0:
            missing -= 1
        need[ch] -= 1
        while missing == 0:
            if best is None or right - left + 1 < best[1] - best[0]:
                best = (left, right + 1)
            need[text[left]] += 1
            if need[text[left]] > 0:
                missing += 1
            left += 1
    return "" if best is None else text[best[0]:best[1]]

print(repr(smallest_window("ADOBECODEBANC", "ABC")), repr(smallest_window("aa", "aa")), repr(smallest_window("a", "b")))
```

```python test
from collections import Counter as _C
import random as _random, time as _time
assert "smallest_window" in dir(), "Keep the function's name as smallest_window."
assert smallest_window("ADOBECODEBANC", "ABC") == "BANC", "BANC is the shortest window holding A, B and C."
assert smallest_window("aa", "aa") == "aa" and smallest_window("a", "aa") == "", "Repeats in the pattern must be matched by repeats in the window."
assert smallest_window("a", "b") == "" and smallest_window("", "a") == "", "No window: empty string."
assert smallest_window("abcab", "ab") == "ab", "Two shortest windows: return the leftmost."
_r = _random.Random(3)
for _ in range(300):
    _t = "".join(_r.choice("abc") for _ in range(_r.randint(0, 10))); _p = "".join(_r.choice("abc") for _ in range(_r.randint(1, 3)))
    _need = _C(_p); _want = ""
    for _L in range(1, len(_t) + 1):
        _hits = [_t[i:i + _L] for i in range(len(_t) - _L + 1) if not (_need - _C(_t[i:i + _L]))]
        if _hits:
            _want = _hits[0]; break
    assert smallest_window(_t, _p) == _want, f"smallest_window({_t!r}, {_p!r}) should be {_want!r}."
_big = "".join(_r.choice("abcdefghij") for _ in range(50_000))
_start = _time.perf_counter(); smallest_window(_big, "jjjaaa"); _el = _time.perf_counter() - _start
assert _el < 1.5, f"50,000 characters took {_el:.1f} s: keep a running 'missing' count instead of recounting each window."
"SUCCESS: A running count of what is still missing makes each step O(1): grow until complete, shrink while still complete, record the best."
```

Hint: Use `need = Counter(pattern)` and `missing = len(pattern)`. Adding `ch`: if `need[ch] > 0` it was required, so decrease `missing`; then decrease `need[ch]` (it can go negative for surplus). While `missing == 0`, record the window, then give back `text[left]` (increase its `need`; if that makes it positive, the window now lacks it, so increase `missing`) and move left.
:::

## What you learned

- A sliding window updates a summary of a contiguous stretch as items enter on the right and leave on the left, so each item is handled twice at most: O(n) instead of O(n²) or worse.
- Fixed-size windows add the newcomer and subtract the leaver; variable-size windows grow on the right and shrink on the left while a condition holds.
- A dictionary of counts tracks which items are in the window, for conditions like "no repeats", "at most k kinds" or "contains every character of a pattern".
- The technique needs a monotone condition (shrinking a valid window keeps it valid, or growing keeps it valid); sums with negative numbers break it.

The next lesson precomputes running totals so that any range's sum is one subtraction, which handles exact-sum questions even with negative numbers: prefix sums.
