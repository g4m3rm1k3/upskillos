# Monotonic stacks and queues

For each day's temperature, how many days until a warmer one? For each share price, the next day it rises above today's? For every 7-day window, the highest price? Each looks like it needs a scan forward from every position, O(n²), or a scan of every window, O(n × k). A **monotonic stack** (or **monotonic deque**) answers them in O(n): a stack whose contents are always kept in sorted order, by throwing away items that can never be the answer to any future question.

The key is to ask, for each item: **once a better item has arrived, can this one still matter?** If a taller building stands in front of a shorter one, the shorter one can never be the first taller building anyone sees. Remove it, and the stack stays sorted. This lesson covers:

- the next greater element, with a decreasing stack;
- why each item is pushed and popped at most once, so the total work is O(n);
- looking backwards: the previous greater element and the "span";
- the sliding window maximum, with a monotonic deque.

## Next greater element

Scan the list left to right, keeping a stack of positions that are **still waiting** for a greater value. Their values are in **decreasing** order from bottom to top, because when a new value arrives, it is the answer for every waiting position with a smaller value: pop them all, recording the answer, and then push the new position to wait in turn. Positions still on the stack at the end never find a greater value. Predict before running: in `[2, 1, 2, 4, 3, 1, 5]`, what is the next greater value for the 4, and which positions never get one?

```python type
def next_greater(values, trace=False):
    answer = [None] * len(values)
    waiting = []
    for i, v in enumerate(values):
        while waiting and values[waiting[-1]] < v:
            answer[waiting.pop()] = v
        waiting.append(i)
        if trace:
            print(f"  after {v}: waiting values {[values[j] for j in waiting]}")
    return answer

values = [2, 1, 2, 4, 3, 1, 5]
print(next_greater(values, trace=True))
```

```output
  after 2: waiting values [2]
  after 1: waiting values [2, 1]
  after 2: waiting values [2, 2]
  after 4: waiting values [4]
  after 3: waiting values [4, 3]
  after 1: waiting values [4, 3, 1]
  after 5: waiting values [5]
[4, 2, 4, 5, 5, 5, None]
```

The stack holds positions rather than values, so that the answer can be written into the right place; `values[waiting[-1]]` reads the value of the top waiting position.

The 4 waits until the 5 arrives, as do the 3 and the second 1, popped together. The final 5 never finds anything greater. At every moment the waiting values are in decreasing order: that is the monotonic stack. Although there is a loop inside a loop, each position is pushed once and popped at most once, so the total work is at most 2n: O(n). The inner `while` does a lot of work only after a lot of pushing.

## Looking backwards: the span

The same stack, scanned the same way, also answers questions about the **past**. A share's **span** on a given day is the number of consecutive days, ending today, on which the price was at most today's. Equivalently, it is the distance back to the previous day with a **higher** price. Keep a stack of days with decreasing prices; for each new day, pop every day whose price is at most today's (today's price makes them irrelevant for every later day too: anyone looking back past today sees today first, and it is at least as high). Whatever is left on top is the previous higher day. Predict before running: what is the span on the day the price is 85?

```python type
def spans(prices):
    result = []
    higher = []
    for i, p in enumerate(prices):
        while higher and prices[higher[-1]] <= p:
            higher.pop()
        result.append(i - higher[-1] if higher else i + 1)
        higher.append(i)
    return result

prices = [100, 80, 60, 70, 60, 75, 85]
for p, s in zip(prices, spans(prices)):
    print(f"price {p:>3}: span {s}")
```

```output
price 100: span 1
price  80: span 1
price  60: span 1
price  70: span 2
price  60: span 1
price  75: span 4
price  85: span 6
```

When the stack is empty, no earlier price was higher, so the span reaches back to the first day: i + 1 days.

On the day of 85, the six days back to the 100 were all at most 85, so the span is 6. 85 pops 75 and 80 (the 60s and the 70 were already removed by 70 and 75), and all of them are gone for good, which is safe: 85 hides them from every future day.

## The sliding window maximum

The maximum of every window of k consecutive values: the sliding window lesson's add-and-subtract trick does not work for maxima, because when the maximum leaves the window there is no way to "subtract" it. A **monotonic deque** solves it. Keep positions in the window whose values are in **decreasing** order. When a new value arrives, pop from the **back** every position with a smaller or equal value (they can never be a window's maximum again, since the new value is at least as big and will stay in the window longer). Then the **front** holds the window's maximum; pop it from the front once it slides out of the window. Each position enters and leaves once: O(n) for all windows. Predict before running: what are the 3-day maxima of the temperatures below?

```python type
from collections import deque

def window_maxima(values, k):
    candidates = deque()
    result = []
    for i, v in enumerate(values):
        while candidates and values[candidates[-1]] <= v:
            candidates.pop()
        candidates.append(i)
        if candidates[0] <= i - k:
            candidates.popleft()
        if i >= k - 1:
            result.append(values[candidates[0]])
    return result

temps = [12, 15, 11, 9, 14, 18, 16, 10, 8, 13]
print(window_maxima(temps, 3))
print([max(temps[i:i + 3]) for i in range(len(temps) - 2)], "(direct)")

import random, timeit
random.seed(0)
big = [random.random() for _ in range(20_000)]
for k in [10, 1_000]:
    fast = timeit.timeit(lambda: window_maxima(big, k), number=1)
    slow = timeit.timeit(lambda: [max(big[i:i + k]) for i in range(len(big) - k + 1)], number=1)
    print(f"k = {k:>5}: monotonic deque {fast * 1000:6.1f} ms, max of each window {slow * 1000:7.1f} ms")
```

The first window is complete at position k − 1, so results start there; the front is dropped once its position is k or more behind.

The maxima match the direct calculation. The deque's time hardly changes with k, while taking `max` of every window grows with k: at k = 1,000 it does about a thousand times more comparisons. (For small k the direct version is competitive, since `max` and slicing run in fast compiled code.)

::: challenge Days until warmer [easy]
Write `days_until_warmer(temps)` returning, for each day, how many days you must wait for a **strictly** warmer temperature, or 0 if none comes. Use a monotonic stack of waiting days, as in the next greater element.

```python starter
def days_until_warmer(temps):
    return [0] * len(temps)

print(days_until_warmer([73, 74, 75, 71, 69, 72, 76, 73]))
```

```python solution
def days_until_warmer(temps):
    answer = [0] * len(temps)
    waiting = []
    for i, t in enumerate(temps):
        while waiting and temps[waiting[-1]] < t:
            j = waiting.pop()
            answer[j] = i - j
        waiting.append(i)
    return answer

print(days_until_warmer([73, 74, 75, 71, 69, 72, 76, 73]))
```

```python test
import random as _random, time as _time
assert "days_until_warmer" in dir(), "Keep the function's name as days_until_warmer."
assert days_until_warmer([73, 74, 75, 71, 69, 72, 76, 73]) == [1, 1, 4, 2, 1, 1, 0, 0], f"Got {days_until_warmer([73, 74, 75, 71, 69, 72, 76, 73])}."
assert days_until_warmer([]) == [] and days_until_warmer([5, 5, 5]) == [0, 0, 0], "Equal temperatures are not warmer."
_r = _random.Random(1)
for _ in range(300):
    _t = [_r.randint(0, 9) for _ in range(_r.randint(0, 12))]
    _want = [next((j - i for j in range(i + 1, len(_t)) if _t[j] > _t[i]), 0) for i in range(len(_t))]
    assert days_until_warmer(_t) == _want, f"Wrong answer for {_t}."
_big = list(range(5_000, 0, -1)) + [10**9]
_start = _time.perf_counter(); _res = days_until_warmer(_big); _el = _time.perf_counter() - _start
assert _el < 0.3 and _res[0] == 5_000, f"A long cooling spell took {_el:.1f} s: each day should be pushed and popped once, not scanned forward."
"SUCCESS: Each day waits on the stack until a warmer day pops it: every day is pushed once and popped at most once, O(n) in total."
```

Hint: Keep a stack of day indices with no warmer day yet. For each new day, pop every waiting day that is colder and record the difference in indices; then push today.
:::

::: challenge Largest rectangle in a histogram [medium]
Bars of width 1 stand side by side with the given heights. Write `largest_rectangle(heights)` returning the area of the largest rectangle that fits inside the bars. For each bar, the widest rectangle of that bar's height stretches left and right until a **shorter** bar. Use a stack of bar positions with increasing heights: when a shorter bar arrives, pop each taller bar; its rectangle ends just before the new bar, and starts just after the bar now on top of the stack (or at 0 if the stack is empty). Append a height-0 bar at the end so everything gets popped. O(n).

```python starter
def largest_rectangle(heights):
    return 0

print(largest_rectangle([2, 1, 5, 6, 2, 3]))
```

```python solution
def largest_rectangle(heights):
    stack = []
    best = 0
    bars = list(heights) + [0]
    for i, h in enumerate(bars):
        while stack and bars[stack[-1]] > h:
            height = bars[stack.pop()]
            left = stack[-1] + 1 if stack else 0
            best = max(best, height * (i - left))
        stack.append(i)
    return best

print(largest_rectangle([2, 1, 5, 6, 2, 3]))
```

```python test
import random as _random, time as _time
assert "largest_rectangle" in dir(), "Keep the function's name as largest_rectangle."
assert largest_rectangle([2, 1, 5, 6, 2, 3]) == 10, "The bars 5 and 6 make a 5 × 2 rectangle of area 10."
assert largest_rectangle([]) == 0 and largest_rectangle([4]) == 4 and largest_rectangle([3, 3, 3]) == 9, "Edge cases: no bars, one bar, equal bars."
assert largest_rectangle([1, 2, 3, 4, 5]) == 9, "Rising bars: 3 × 3 = 9."
_r = _random.Random(2)
for _ in range(300):
    _h = [_r.randint(0, 8) for _ in range(_r.randint(0, 10))]
    _want = max((min(_h[i:j + 1]) * (j - i + 1) for i in range(len(_h)) for j in range(i, len(_h))), default=0)
    assert largest_rectangle(_h) == _want, f"Wrong area for {_h}: expected {_want}."
_big = list(range(1, 5_001))
_start = _time.perf_counter(); _a = largest_rectangle(_big); _el = _time.perf_counter() - _start
assert _a == 6_252_500 and _el < 0.3, f"5,000 rising bars took {_el:.1f} s (area {_a}): use the stack, not every pair of ends."
"SUCCESS: When a bar is popped, the stack top and the newcomer bound its rectangle (for a run of equal bars, the last one popped gets the full width): its widest rectangle is known in O(1)."
```

Hint: Work on `bars = heights + [0]`. For each i, while the top bar is taller than `bars[i]`, pop it; its width runs from just after the new top (or 0) up to i − 1. Push i afterwards.
:::

::: challenge Steady stretches [medium]
A sensor's readings are steady over a stretch if the largest and smallest reading in it differ by at most `limit`. Write `longest_steady(readings, limit)` returning the length of the longest steady contiguous stretch, in O(n): a sliding window (from the sliding window lesson) whose maximum and minimum are tracked by **two** monotonic deques, one decreasing (front = maximum) and one increasing (front = minimum). When the difference exceeds the limit, move the left edge forward, dropping each deque's front if it falls out of the window.

```python starter
from collections import deque

def longest_steady(readings, limit):
    return 0

print(longest_steady([8, 2, 4, 7, 6, 5, 9, 1], 4))
```

```python solution
from collections import deque

def longest_steady(readings, limit):
    highs, lows = deque(), deque()
    left, best = 0, 0
    for right, x in enumerate(readings):
        while highs and readings[highs[-1]] <= x:
            highs.pop()
        highs.append(right)
        while lows and readings[lows[-1]] >= x:
            lows.pop()
        lows.append(right)
        while readings[highs[0]] - readings[lows[0]] > limit:
            left += 1
            if highs[0] < left:
                highs.popleft()
            if lows[0] < left:
                lows.popleft()
        best = max(best, right - left + 1)
    return best

print(longest_steady([8, 2, 4, 7, 6, 5, 9, 1], 4))
```

```python test
import random as _random, time as _time
assert "longest_steady" in dir(), "Keep the function's name as longest_steady."
assert longest_steady([8, 2, 4, 7, 6, 5, 9, 1], 4) == 4, "4, 7, 6, 5 stays within 4 (max 7, min 4)."
assert longest_steady([], 3) == 0 and longest_steady([5], 0) == 1 and longest_steady([3, 3, 3], 0) == 3, "Edge cases."
_r = _random.Random(3)
for _ in range(300):
    _xs = [_r.randint(0, 10) for _ in range(_r.randint(0, 12))]; _lim = _r.randint(0, 6)
    _want = max((j - i for i in range(len(_xs)) for j in range(i + 1, len(_xs) + 1) if max(_xs[i:j]) - min(_xs[i:j]) <= _lim), default=0)
    assert longest_steady(_xs, _lim) == _want, f"Wrong answer for {_xs} with limit {_lim}."
_big = [_r.randint(0, 40) for _ in range(20_000)]
_start = _time.perf_counter(); longest_steady(_big, 38); _el = _time.perf_counter() - _start
assert _el < 0.5, f"20,000 readings took {_el:.1f} s: track max and min with deques instead of recomputing them."
"SUCCESS: Two monotonic deques give the window's maximum and minimum in O(1) each step, so the whole scan is O(n)."
```

Hint: Push each new index onto both deques after popping from their backs (smaller-or-equal values from `highs`, larger-or-equal from `lows`). While the fronts differ by more than the limit, advance `left` and drop any front index now below `left`. Record `right - left + 1`.
:::

## What you learned

- A monotonic stack keeps its items in sorted order by discarding items that a newer one makes irrelevant; each item is pushed and popped at most once, so a full scan is O(n) despite the inner loop.
- A decreasing stack of waiting positions gives the next greater element (and days until warmer); scanning with the same stack gives the previous greater element and the stock span.
- When a bar is popped from an increasing stack, its nearest shorter neighbours are known, giving the largest histogram rectangle in O(n).
- A monotonic deque gives every sliding window's maximum (or minimum) in O(n) total, which plain add-and-subtract windows cannot.

The next lesson returns to divide and conquer, applying it to problems beyond sorting: counting inversions and finding the closest pair of points.
