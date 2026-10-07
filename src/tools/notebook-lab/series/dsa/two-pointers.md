# Two pointers

The previous parts of this series built data structures and classic algorithms. This part is about **techniques**: patterns of thinking that turn up again and again in new problems. The first is one of the simplest and most useful. Many problems about pairs or regions of a list look like they need two nested loops, O(n²). When the list is **sorted**, or when you can process it from both ends, two indices moving towards each other (or in the same direction at different speeds) can often do the job in a **single pass**, O(n).

The skill is not memorising problems but seeing **why** moving one pointer is safe: why the values it skips past can never be part of an answer. That is an invariant argument, as in the invariants lesson. This lesson covers:

- pair sums in a sorted list, with pointers moving inwards;
- why each move discards only impossible pairs;
- a **read pointer and a write pointer** for filtering a list in place;
- **fast and slow** pointers;
- merging-style scans over two sorted lists.

## Pair sum in a sorted list

Is there a pair in a sorted list adding up to a target? Checking every pair is O(n²). Instead, put one pointer at each end. If the two values sum to more than the target, the right value is too big to pair with **anything** remaining (its smallest possible partner, the left value, already overshoots), so move the right pointer in. If the sum is too small, the left value is too small to pair with anything remaining (its largest possible partner already falls short), so move the left pointer in. Each step discards one value for good, so the scan takes at most n − 1 steps. Predict before running: how many steps to search 1,000,000 numbers?

```python type
def pair_with_sum(values, target):
    left, right = 0, len(values) - 1
    steps = 0
    while left < right:
        steps += 1
        total = values[left] + values[right]
        if total == target:
            return (values[left], values[right]), steps
        if total > target:
            right -= 1
        else:
            left += 1
    return None, steps

prices = [3, 8, 12, 15, 21, 27, 33, 40]
print(pair_with_sum(prices, 48))
print(pair_with_sum(prices, 100))

big = list(range(0, 2_000_000, 2))
print(pair_with_sum(big, 1_999_996))
print(pair_with_sum(big, 7))
```

```output
((8, 40), 2)
(None, 7)
((0, 1999996), 2)
(None, 999999)
```

The list `big` holds the even numbers below two million, so an odd target can never be reached.

8 + 40 = 48 is found in two steps, and 100 is correctly reported impossible. On a million values, the worst case is the full sweep: just under a million steps, where checking every pair would need about 500 billion. The method needs the list to be **sorted**; for an unsorted list, sorting first (O(n log n)) or the dictionary method from the Big-O lesson (O(n), with extra memory) are the options.

## Why it is correct

It is worth stating the argument as an invariant, because it is the template for every two-pointer proof: **if a pair with the target sum exists, it lies within `values[left..right]`.** It holds at the start (the whole list). When the sum is too big, `values[right]` cannot be in any valid pair inside the range, since even the smallest partner overshoots; dropping it keeps the invariant. Symmetrically for too small. The range shrinks every step, so the loop ends, and if it ends without finding a pair, the invariant says none exists.

## Counting pairs

The same idea counts pairs, not just finds one. How many pairs have a sum **at most** some limit, say the number of pairs of items that fit together under a weight limit? If `values[left] + values[right]` fits, then `values[left]` fits with **every** value from `left + 1` to `right`, since those are all no bigger than `values[right]`: that is `right - left` pairs counted at once, and left moves on. Otherwise right moves in. Predict before running: how many pairs of these 1,000 random weights fit under the limit, and does the brute-force count agree?

```python type
import random

def pairs_at_most(values, limit):
    values = sorted(values)
    left, right, count = 0, len(values) - 1, 0
    while left < right:
        if values[left] + values[right] <= limit:
            count += right - left
            left += 1
        else:
            right -= 1
    return count

random.seed(0)
weights = [random.randint(1, 100) for _ in range(1_000)]
fast = pairs_at_most(weights, 80)
slow = sum(1 for i in range(len(weights)) for j in range(i + 1, len(weights)) if weights[i] + weights[j] <= 80)
print(f"two pointers: {fast:,}  brute force: {slow:,}")
```

```output
two pointers: 167,693  brute force: 167,693
```

The brute-force count checks all 499,500 pairs; the two-pointer count takes at most 999 steps after sorting.

Both give the same count. Counting a whole block of pairs in one step is what makes this fast: the answer can be close to n² pairs, but the work is O(n log n) for the sort plus O(n) for the scan.

## Read and write pointers

Two pointers can also move in the **same** direction. To filter a list in place (remove items, compact it, de-duplicate it), a **read** pointer looks at every item, and a **write** pointer marks where the next kept item goes. The invariant: everything before `write` is the kept items seen so far, in order. The invariants lesson used this to move zeros to the end. Here it removes duplicates from a sorted list in place. Predict before running: what will the first `length` items be?

```python type
def dedupe_sorted(values):
    if not values:
        return 0
    write = 1
    for read in range(1, len(values)):
        if values[read] != values[write - 1]:
            values[write] = values[read]
            write += 1
    return write

data = [1, 1, 2, 3, 3, 3, 4, 7, 7, 9]
length = dedupe_sorted(data)
print(length, data[:length], "(the rest is leftover:", data[length:], ")")
```

```output
6 [1, 2, 3, 4, 7, 9] (the rest is leftover: [4, 7, 7, 9] )
```

Each new value is compared with the last value **kept**, `values[write - 1]`, not with its neighbour in the original list.

The first six items are 1, 2, 3, 4, 7, 9. Nothing is shifted, so it is O(n), against O(n²) for repeatedly calling `remove` or `pop(i)`. The leftover tail can be cut off with `del data[length:]`.

## Fast and slow pointers

Pointers moving at **different speeds** answer questions about a sequence's shape. The linked lists lesson used a slow pointer (one step) and a fast pointer (two steps) to detect a cycle. The same pair finds the **middle** of a linked sequence in one pass: when the fast pointer reaches the end, the slow one is halfway. It also detects cycles in sequences defined by a function, x → f(x), without storing the values seen, which is how Floyd's algorithm finds loops in random number generators. Here it finds the cycle in "repeatedly replace a number by the sum of the squares of its digits". Predict before running: starting from 4, does the sequence reach 1, or loop forever?

```python type
def digit_square_sum(n):
    return sum(int(d) ** 2 for d in str(n))

def reaches_one(n):
    slow, fast = n, digit_square_sum(n)
    while fast != 1 and slow != fast:
        slow = digit_square_sum(slow)
        fast = digit_square_sum(digit_square_sum(fast))
    return fast == 1

sequence, x = [4], 4
for _ in range(9):
    x = digit_square_sum(x)
    sequence.append(x)
print("from 4:", sequence)
print("numbers below 50 that reach 1:", [n for n in range(1, 50) if reaches_one(n)])
```

```output
from 4: [4, 16, 37, 58, 89, 145, 42, 20, 4, 16]
numbers below 50 that reach 1: [1, 7, 10, 13, 19, 23, 28, 31, 32, 44, 49]
```

`str(n)` turns the number into its digits, which are squared and added. The slow pointer applies the function once per step, the fast one twice.

From 4 the sequence goes 16, 37, 58, 89, 145, 42, 20, 4: a loop that never reaches 1. The fast pointer either reaches 1 or catches the slow one inside a loop, without storing anything. Numbers that reach 1 are called "happy numbers", and the list shows the first few.

::: challenge Closest pair sum [easy]
Write `closest_pair_sum(values, target)` for a sorted list of at least two numbers, returning the sum of the pair (two different positions) whose sum is **closest** to target. Use two pointers from the ends: record the best sum seen, then move right in if the sum is above the target, left in if below, and stop early on an exact match. If two sums are equally close, either is fine.

```python starter
def closest_pair_sum(values, target):
    return 0

print(closest_pair_sum([1, 4, 9, 13, 20], 16))
```

```python solution
def closest_pair_sum(values, target):
    left, right = 0, len(values) - 1
    best = values[left] + values[right]
    while left < right:
        total = values[left] + values[right]
        if abs(total - target) < abs(best - target):
            best = total
        if total == target:
            return total
        if total > target:
            right -= 1
        else:
            left += 1
    return best

print(closest_pair_sum([1, 4, 9, 13, 20], 16))
```

```python test
import random as _random, time as _time
assert "closest_pair_sum" in dir(), "Keep the function's name as closest_pair_sum."
assert closest_pair_sum([1, 4, 9, 13, 20], 16) == 17, "4 + 13 = 17 is 1 away from 16, closer than any other pair."
assert closest_pair_sum([1, 4, 9, 13, 20], 13) == 13, "4 + 9 hits 13 exactly."
assert closest_pair_sum([5, 5], 3) == 10, "With only two values, their sum is the answer."
_r = _random.Random(1)
for _ in range(300):
    _xs = sorted(_r.randint(-30, 30) for _ in range(_r.randint(2, 10))); _t = _r.randint(-60, 60)
    _best = min(abs(_xs[i] + _xs[j] - _t) for i in range(len(_xs)) for j in range(i + 1, len(_xs)))
    assert abs(closest_pair_sum(_xs, _t) - _t) == _best, f"For {_xs} and target {_t}, the closest sum is {_best} away."
_big = list(range(0, 600_000, 3))
_start = _time.perf_counter(); closest_pair_sum(_big, 7); _el = _time.perf_counter() - _start
assert _el < 1.0, f"200,000 values took {_el:.1f} s: one inward sweep, not every pair."
"SUCCESS: Each move discards a value that cannot do better, so the closest sum is found in one pass over a sorted list."
```

Hint: Start with `best` as the sum of the two ends. In the loop, update `best` if the current sum is closer; return at once on an exact match; otherwise move right in if the sum is too big, left in if too small.
:::

::: challenge Three numbers summing to zero [medium]
Write `zero_triples(values)` returning a sorted list of all **distinct** triples `(a, b, c)` with a ≤ b ≤ c taken from different positions of `values` and a + b + c = 0. Sort a copy of the list; for each position i (skipping a value equal to the previous one), run the two-pointer pair search for target −values[i] on the part after i, collecting every match and skipping duplicate values as the pointers move. That is O(n²), against O(n³) for checking every triple.

```python starter
def zero_triples(values):
    return []

print(zero_triples([-1, 0, 1, 2, -1, -4]))
```

```python solution
def zero_triples(values):
    a = sorted(values)
    result = []
    for i in range(len(a) - 2):
        if i > 0 and a[i] == a[i - 1]:
            continue
        left, right = i + 1, len(a) - 1
        while left < right:
            total = a[i] + a[left] + a[right]
            if total == 0:
                result.append((a[i], a[left], a[right]))
                left += 1
                while left < right and a[left] == a[left - 1]:
                    left += 1
                right -= 1
            elif total < 0:
                left += 1
            else:
                right -= 1
    return result

print(zero_triples([-1, 0, 1, 2, -1, -4]))
```

```python test
import itertools as _it, random as _random, time as _time
assert "zero_triples" in dir(), "Keep the function's name as zero_triples."
assert zero_triples([-1, 0, 1, 2, -1, -4]) == [(-1, -1, 2), (-1, 0, 1)], f"Got {zero_triples([-1, 0, 1, 2, -1, -4])}."
assert zero_triples([0, 0, 0, 0]) == [(0, 0, 0)], "Four zeros give the triple (0, 0, 0) once."
assert zero_triples([1, 2]) == [] and zero_triples([]) == [], "Fewer than three numbers: no triples."
_r = _random.Random(2)
for _ in range(200):
    _xs = [_r.randint(-6, 6) for _ in range(_r.randint(0, 9))]
    _want = sorted({tuple(sorted(t)) for t in _it.combinations(_xs, 3) if sum(t) == 0})
    assert sorted(zero_triples(_xs)) == _want and len(zero_triples(_xs)) == len(_want), f"Wrong triples for {_xs}: expected {_want}."
_big = [_r.randint(-10_000, 10_000) for _ in range(300)]
_start = _time.perf_counter(); zero_triples(_big); _el = _time.perf_counter() - _start
assert _el < 1.0, f"300 numbers took {_el:.1f} s: fix one number and run a two-pointer pair search for the rest."
"SUCCESS: Fixing one number turns three-sum into two-sum, which two pointers solve in O(n): O(n²) overall, with duplicates skipped by comparing neighbours in the sorted list."
```

Hint: After sorting, loop i over positions, skipping repeats of the previous value. For each, use left = i + 1 and right = end: on a hit, record it and move both pointers, skipping equal values on the left; on a sum below zero move left, above zero move right.
:::

::: challenge Most water between two walls [medium]
Walls of heights `heights[0], heights[1], …` stand one unit apart. Any two walls with the floor between them hold water up to the shorter wall's height: the amount is `min(heights[i], heights[j]) * (j - i)`. Write `most_water(heights)` returning the largest amount any pair holds, in O(n): start with the two outermost walls, and always move the pointer at the **shorter** wall inward. (Moving the taller one could never help: the width shrinks and the height is still limited by the same shorter wall.)

```python starter
def most_water(heights):
    return 0

print(most_water([1, 8, 6, 2, 5, 4, 8, 3, 7]))
```

```python solution
def most_water(heights):
    left, right = 0, len(heights) - 1
    best = 0
    while left < right:
        best = max(best, min(heights[left], heights[right]) * (right - left))
        if heights[left] < heights[right]:
            left += 1
        else:
            right -= 1
    return best

print(most_water([1, 8, 6, 2, 5, 4, 8, 3, 7]))
```

```python test
import random as _random, time as _time
assert "most_water" in dir(), "Keep the function's name as most_water."
assert most_water([1, 8, 6, 2, 5, 4, 8, 3, 7]) == 49, "Walls 8 (position 1) and 7 (position 8) hold 7 × 7 = 49."
assert most_water([1, 1]) == 1 and most_water([5]) == 0 and most_water([]) == 0, "Two walls of height 1 hold 1; fewer than two walls hold nothing."
assert most_water([4, 3, 2, 1, 4]) == 16, "The two outer 4s hold 4 × 4 = 16."
_r = _random.Random(3)
for _ in range(300):
    _h = [_r.randint(0, 20) for _ in range(_r.randint(0, 12))]
    _want = max((min(_h[i], _h[j]) * (j - i) for i in range(len(_h)) for j in range(i + 1, len(_h))), default=0)
    assert most_water(_h) == _want, f"Wrong answer for {_h}: expected {_want}."
_big = [_r.randint(0, 10_000) for _ in range(200_000)]
_start = _time.perf_counter(); most_water(_big); _el = _time.perf_counter() - _start
assert _el < 1.5, f"200,000 walls took {_el:.1f} s: one inward sweep, moving the shorter wall."
"SUCCESS: Moving the shorter wall is the only move that might find more water, so one sweep checks every pair that could be best."
```

Hint: Compute the water for the current pair and keep the maximum. Then move whichever pointer is at the shorter wall (either one if they are equal).
:::

## What you learned

- Two pointers from the ends of a sorted list find or count pairs in O(n): each move discards a value that cannot be part of any answer. The invariant "any answer lies between the pointers" proves it.
- Counting can add whole blocks of pairs in one step; fixing one element turns three-sum into two-sum, O(n²) instead of O(n³).
- Read and write pointers moving the same way filter or de-duplicate a list in place in O(n).
- Fast and slow pointers find middles and detect cycles without extra memory, even in sequences defined by a function.

The next lesson uses two pointers that both move forward to track a **window** over a list: the sliding window.
