# Invariants and correctness

Testing shows that code works on the inputs you tried. It cannot show that code works on **every** input, and the bugs that matter most tend to hide in the cases nobody thought to try: the empty list, the single item, the value at the very end. For loops, there is a better tool: a **loop invariant**, a statement about the program's variables that is true before the loop starts and stays true after every iteration. Once you have the right invariant, correctness follows almost mechanically, and the invariant tells you how to write the loop in the first place.

This lesson covers:

- what an invariant is, and the three things to check: **initialisation**, **maintenance** and **termination**;
- using `assert` to check invariants while developing;
- invariants for loops that rearrange data in place;
- proving that a loop **stops**, using a quantity that always decreases;
- how a broken invariant pinpoints a bug.

## The three checks

Take the loop that finds the largest value in a non-empty list. Its invariant: **after looking at the first i items, `best` is the largest of them**. Three checks prove the loop correct:

1. **Initialisation**: the invariant holds before the first iteration. Starting with `best = items[0]` and i = 1, best is the largest of the first 1 item. True.
2. **Maintenance**: if the invariant holds before an iteration, it holds after it. If best is the largest of the first i items, then after comparing with item i and keeping the larger, best is the largest of the first i + 1. True.
3. **Termination**: when the loop ends, the invariant gives the answer. The loop ends with i = n, and best is the largest of all n items. That is exactly what was wanted.

This is the same reasoning as mathematical induction: a base case (initialisation), a step (maintenance), and a conclusion. While developing, an invariant can be written as an `assert` inside the loop, so that the program checks it on every iteration. Predict before running: will any assertion fail?

```python type
def largest(items):
    best = items[0]
    for i in range(1, len(items)):
        assert best == max(items[:i]), f"invariant broken before looking at item {i}"
        if items[i] > best:
            best = items[i]
    assert best == max(items)
    return best

import random
random.seed(0)
for _ in range(1000):
    data = [random.randint(-100, 100) for _ in range(random.randint(1, 10))]
    largest(data)
print("1000 random lists: the invariant held at every step")
```

```output
1000 random lists: the invariant held at every step
```

`max(items[:i])` recomputes the invariant the slow way, which makes the function O(n²) while the check is in place; such asserts are for development, then removed (or Python can be run with `-O`, which skips every `assert`).

No assertion fails. The value of the invariant is not this check, though: it is that the three-step argument holds for **every** list, including ones no test tried.

## Invariants for loops that rearrange data

Invariants become essential for loops that move data around in place, where an off-by-one error silently produces almost-right results. The pattern is to describe **regions** of the list. Take reversing a list in place with two indices: `left` moves right from the start, `right` moves left from the end, and the items at those positions are swapped.

The invariant: **everything before `left` and everything after `right` is already in its final, reversed position**, and the middle part is untouched. Initially both regions are empty (true). Each swap puts two more items in their final places and moves both indices inward (maintained). The loop stops when `left >= right`: the untouched middle has at most one item, which is its own reverse, so the whole list is reversed. Predict before running: for a list of 7 items, how many swaps will happen, and what about the middle item?

```python type
def reverse_in_place(items):
    original = list(items)
    n = len(items)
    left, right = 0, n - 1
    swaps = 0
    while left < right:
        assert items[:left] == original[::-1][:left], "front region not reversed"
        assert items[right + 1:] == original[::-1][right + 1:], "back region not reversed"
        assert items[left:right + 1] == original[left:right + 1], "middle region changed"
        items[left], items[right] = items[right], items[left]
        left += 1
        right -= 1
        swaps += 1
    return swaps

letters = list("ABCDEFG")
print(reverse_in_place(letters), "swaps:", "".join(letters))
evens = list("ABCDEF")
print(reverse_in_place(evens), "swaps:", "".join(evens))
```

```output
3 swaps: GFEDCBA
3 swaps: FEDCBA
```

`original[::-1]` is the fully reversed copy, so `original[::-1][:left]` is what the first `left` positions should hold when the job is done.

Seven items need 3 swaps; the middle item, D, never moves, because the loop stops when the indices meet on it. Six items also need 3 swaps, and the loop stops when the indices cross. The invariant explains why `while left < right` is exactly the right condition: with `<=`, an odd-length list would harmlessly swap its middle item with itself, but with `while left < right - 1` the loop would stop one pair early and the middle two items of an even-length list would never be swapped.

## Termination: proving the loop stops

The three checks prove a loop gives the right answer **if it stops**. Proving it stops needs a **variant** (also called a measure): a whole number that is never negative and strictly decreases on every iteration. A whole number cannot decrease for ever without going negative, so the loop must end.

For the reversing loop, the variant is `right - left`: it drops by 2 each time. For **Euclid's algorithm**, which finds the greatest common divisor (gcd) of two numbers, the argument is more interesting. Euclid's insight: the gcd of a and b equals the gcd of b and a % b, since any number dividing both a and b also divides the remainder, and any number dividing b and the remainder also divides a, so the two pairs have exactly the same common divisors. Repeating that until the second number is 0 gives the answer. The invariant is "gcd(a, b) is the gcd of the original pair", and the variant is b, which strictly decreases because a % b is always smaller than b. Predict before running: how many steps for gcd(1071, 462), and for two consecutive Fibonacci numbers?

```python type
import math

def gcd_traced(a, b):
    target = math.gcd(a, b)
    steps = 0
    while b != 0:
        assert math.gcd(a, b) == target, "invariant broken"
        new_b = a % b
        assert 0 <= new_b < b, "variant did not decrease"
        a, b = b, new_b
        steps += 1
    return a, steps

print("gcd(1071, 462) =", *gcd_traced(1071, 462), "steps")
print("gcd(832040, 514229) =", *gcd_traced(832040, 514229), "steps")
print("gcd(10**12, 6) =", *gcd_traced(10**12, 6), "steps")
```

```output
gcd(1071, 462) = 21 3 steps
gcd(832040, 514229) = 1 28 steps
gcd(10**12, 6) = 2 3 steps
```

`*gcd_traced(…)` unpacks the returned pair into two separate arguments of `print`. Python's own `math.gcd` is used here only to check the invariant.

gcd(1071, 462) takes 3 steps and gives 21. Consecutive Fibonacci numbers are Euclid's worst case: 832,040 and 514,229 need 28 steps. Even so, the number of steps grows only with the number of **digits**: the remainder at least halves every two steps, so Euclid's algorithm is O(log min(a, b)). The variant proved that it stops; a slightly sharper argument about how fast it decreases proved how quickly.

## Using an invariant to locate a bug

Invariants are also a debugging tool. A broken invariant points at the exact iteration where things went wrong; an invariant that holds rules the loop out, and points at the code around it. Here is a function meant to move all the zeros in a list to the end, keeping the other values in order, with one subtle bug. Its intended invariant: **`items[:write]` holds the non-zero values seen so far, in order**. The check reads the global `original`, a copy of the input made before each call. Predict before running: will the invariant check fire? Which results come out wrong, and where must the bug be?

```python type
def move_zeros_buggy(items):
    write = 0
    for read in range(len(items)):
        if items[read] != 0:
            items[write] = items[read]
            write += 1
        expected = [x for x in original[:read + 1] if x != 0]
        if items[:write] != expected:
            print(f"  invariant broken at read = {read}: items[:write] = {items[:write]}, expected {expected}")
            return
    for i in range(write + 1, len(items)):
        items[i] = 0

for test in [[0, 1, 0, 3, 12], [1, 2, 0], [4, 0, 5]]:
    original = list(test)
    move_zeros_buggy(test)
    print(original, "->", test, "correct" if test == [x for x in original if x] + [0] * original.count(0) else "WRONG")
```

```output
[0, 1, 0, 3, 12] -> [1, 3, 12, 3, 0] WRONG
[1, 2, 0] -> [1, 2, 0] correct
[4, 0, 5] -> [4, 5, 5] WRONG
```

The invariant is checked with an `if` instead of an `assert` here, so the cell can report the failure and carry on.

The invariant holds on every step of the main loop, so the first part is right. Yet two of the three results are wrong: [1, 2, 0] is fine by luck, but [0, 1, 0, 3, 12] keeps a stale 3 and [4, 0, 5] keeps a stale 5. With the main loop proven correct, the bug must be in what follows. The termination step needs "everything from `write` onwards becomes zero", and the code starts at `write + 1`: an off-by-one error. The invariant narrowed the search to a single line, which is exactly what it is for. The second challenge fixes this function properly.

::: challenge Integer square root, with an invariant [easy]
Write `isqrt_linear(n)` returning the largest integer r with r × r ≤ n, for n ≥ 0, by counting up from r = 0 while (r + 1)² ≤ n. Inside the loop, `assert` the invariant `r * r <= n`. Then set `invariant`, `variant` and `stop_condition` to the matching strings from this list, describing your loop: `"r * r <= n"`, `"n - r * r"`, `"(r + 1) * (r + 1) > n"`.

```python starter
def isqrt_linear(n):
    return 0

invariant = ""
variant = ""
stop_condition = ""
print([isqrt_linear(n) for n in [0, 1, 8, 9, 10]])
```

```python solution
def isqrt_linear(n):
    r = 0
    while (r + 1) * (r + 1) <= n:
        assert r * r <= n
        r += 1
    return r

invariant = "r * r <= n"
variant = "n - r * r"
stop_condition = "(r + 1) * (r + 1) > n"
print([isqrt_linear(n) for n in [0, 1, 8, 9, 10]])
```

```python test
import math as _math
assert "isqrt_linear" in dir(), "Keep the function's name as isqrt_linear."
for _n in list(range(0, 200)) + [10_000, 99_999]:
    assert isqrt_linear(_n) == _math.isqrt(_n), f"isqrt_linear({_n}) should be {_math.isqrt(_n)}, got {isqrt_linear(_n)}."
assert "assert" in _source.split("def isqrt_linear")[1].split("invariant =")[0], "Assert the invariant r * r <= n inside the loop."
assert invariant == "r * r <= n", "The invariant is the fact that stays true on every iteration: r * r <= n."
assert variant == "n - r * r", "The variant is the non-negative whole number that shrinks on every iteration: n - r * r."
assert stop_condition == "(r + 1) * (r + 1) > n", "The loop stops when the next r would be too big: (r + 1) * (r + 1) > n."
"SUCCESS: At the end, r * r <= n (the invariant) and (r + 1)² > n (the stop condition): together, exactly the definition of the answer."
```

Hint: Start at r = 0 (0 × 0 ≤ n always holds). Loop `while (r + 1) * (r + 1) <= n`, asserting `r * r <= n` and increasing r. The loop ends when the invariant and the stop condition together say r is the answer.
:::

::: challenge Move the zeros, correctly [medium]
Write `move_zeros(items)` that moves every 0 in the list to the end **in place**, keeping the other values in their original order, using the two-index idea from the lesson: a `read` index scanning every position and a `write` index marking where the next non-zero value goes (invariant: `items[:write]` holds the non-zero values seen so far, in order). Then fill the rest with zeros. Return nothing.

```python starter
def move_zeros(items):
    pass

data = [0, 1, 0, 3, 12]
move_zeros(data)
print(data)
```

```python solution
def move_zeros(items):
    write = 0
    for read in range(len(items)):
        if items[read] != 0:
            items[write] = items[read]
            write += 1
    for i in range(write, len(items)):
        items[i] = 0

data = [0, 1, 0, 3, 12]
move_zeros(data)
print(data)
```

```python test
import random as _random
assert "move_zeros" in dir(), "Keep the function's name as move_zeros."
for _xs in [[0, 1, 0, 3, 12], [4, 0, 5], [], [0], [7], [0, 0, 0], [1, 2, 3], [0, 0, 1]]:
    _copy = list(_xs); _ret = move_zeros(_copy)
    _want = [x for x in _xs if x != 0] + [0] * _xs.count(0)
    assert _copy == _want, f"move_zeros({_xs}) should leave {_want}, got {_copy}."
    assert _ret is None, "Change the list in place and return nothing."
_r = _random.Random(4)
for _ in range(500):
    _xs = [_r.choice([0, 0, 1, 2, -3]) for _ in range(_r.randint(0, 12))]
    _copy = list(_xs); move_zeros(_copy)
    assert _copy == [x for x in _xs if x != 0] + [0] * _xs.count(0), f"Wrong result for {_xs}: {_copy}."
_lst = [0, 5]; _same = _lst; move_zeros(_lst)
assert _same is _lst and _lst == [5, 0], "Modify the list itself rather than building a new one."
"SUCCESS: Every non-zero value is written once, in order, then the tail from write onwards is zeroed: the termination step the buggy version got wrong by one."
```

Hint: The first loop is the same as the buggy version. The fix is in the second loop: every position from `write` (not `write + 1`) to the end must become 0.
:::

::: challenge Three-way partition [medium]
The **Dutch national flag** problem: rearrange a list **in place** so that all values less than `pivot` come first, then all values equal to it, then all values greater, in one pass. Use three indices with this invariant:

- `items[:low]` are less than the pivot;
- `items[low:mid]` are equal to it;
- `items[mid:high + 1]` have not been examined yet;
- `items[high + 1:]` are greater than it.

Start with `low = mid = 0` and `high = len(items) - 1`, and loop while `mid <= high`, examining `items[mid]`. Write `three_way_partition(items, pivot)`, returning the pair `(low, mid)` at the end (where the equal region starts and ends).

```python starter
def three_way_partition(items, pivot):
    return 0, 0

data = [3, 1, 2, 3, 3, 0, 5, 2, 4]
print(three_way_partition(data, 3), data)
```

```python solution
def three_way_partition(items, pivot):
    low, mid, high = 0, 0, len(items) - 1
    while mid <= high:
        if items[mid] < pivot:
            items[low], items[mid] = items[mid], items[low]
            low += 1
            mid += 1
        elif items[mid] > pivot:
            items[mid], items[high] = items[high], items[mid]
            high -= 1
        else:
            mid += 1
    return low, mid

data = [3, 1, 2, 3, 3, 0, 5, 2, 4]
print(three_way_partition(data, 3), data)
```

```python test
import random as _random
assert "three_way_partition" in dir(), "Keep the function's name as three_way_partition."
def _ok(_orig, _after, _p, _res):
    _lo, _mid = _res
    return (sorted(_orig) == sorted(_after) and all(x < _p for x in _after[:_lo]) and all(x == _p for x in _after[_lo:_mid]) and all(x > _p for x in _after[_mid:]))
_d = [3, 1, 2, 3, 3, 0, 5, 2, 4]; _r0 = three_way_partition(_d, 3)
assert _ok([3, 1, 2, 3, 3, 0, 5, 2, 4], _d, 3, _r0) and _r0 == (4, 7), f"Expected the equal region to be positions 4 to 6, so (4, 7); got {_r0} with {_d}."
_r = _random.Random(9)
for _ in range(1000):
    _xs = [_r.randint(0, 5) for _ in range(_r.randint(0, 12))]; _p = _r.randint(-1, 6)
    _ys = list(_xs); _res = three_way_partition(_ys, _p)
    assert _ok(_xs, _ys, _p, _res), f"three_way_partition({_xs}, {_p}) left {_ys} and returned {_res}: check the invariant regions."
_cnt = [0]
class _Spy(list):
    def __getitem__(self, i):
        _cnt[0] += 1
        return list.__getitem__(self, i)
_s = _Spy([_r.randint(0, 9) for _ in range(300)]); three_way_partition(_s, 5)
assert "sort" not in _source and "bisect" not in _source and "count(" not in _source, "Partition with the three indices in one pass, not by sorting or counting."
assert _cnt[0] <= 6 * 300, "Examine each item a constant number of times: a single pass, not repeated scans."
"SUCCESS: Each step shrinks the unexamined region by one (the variant high − mid + 1), and the four regions keep their meaning throughout: the partition step of three-way quicksort."
```

Hint: If `items[mid]` is smaller, swap it to position `low` and advance both `low` and `mid`. If larger, swap it with `items[high]` and decrease `high` only (the value swapped in from `high` has not been examined yet). If equal, just advance `mid`.
:::

## What you learned

- A loop invariant is true before the loop and after every iteration. Check initialisation, maintenance and termination, and the loop is correct for every input, not just the tested ones.
- For in-place rearrangements, describe the regions of the list each index marks off; the invariant then dictates the loop condition and each swap.
- A variant, a non-negative whole number that strictly decreases each iteration, proves the loop stops; Euclid's algorithm even stops in O(log n) steps.
- `assert`ing an invariant during development pinpoints the iteration, or the step, where a bug lives.

The next lesson applies all of this to one of the most error-prone loops in programming: binary search.
