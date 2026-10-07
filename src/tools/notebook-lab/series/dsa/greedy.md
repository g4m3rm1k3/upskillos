# Greedy algorithms

A **greedy** algorithm builds its answer one step at a time, always taking the choice that looks best **right now**, and never goes back on a decision. Giving change with the largest coin that fits, scheduling the meeting that ends soonest, packing the most valuable item per kilogram first: greedy rules are simple, fast and often what people do instinctively. The catch is that "best right now" is frequently **not** best overall, and a greedy rule that works on one set of inputs can fail on another. The skill this lesson teaches is telling the two apart: trying candidate rules against brute force, and **proving** that a rule is right with an **exchange argument**.

Two algorithms from earlier in the series were greedy and provably correct: Dijkstra's (settle the closest vertex) and Kruskal's (take the cheapest safe edge). This lesson covers:

- interval scheduling, where three plausible rules give different answers and only one is always right;
- the exchange argument that proves it;
- coin change, where greedy works for real currencies but fails for others;
- Huffman coding, a greedy algorithm behind file compression.

## Choosing the most meetings

One room, many requested meetings, each with a start and an end time. Which meetings should be accepted to fit in the **most**, with no two overlapping? Three greedy rules sound reasonable: take the meeting that **starts** first, the **shortest** meeting, or the meeting that **ends** first, each time skipping any that clash with those already taken. Predict before running: which rules always achieve the maximum on random instances, compared with a brute force that tries every subset?

```python type
import itertools
import random

def greedy_schedule(meetings, key):
    chosen = []
    for start, end in sorted(meetings, key=key):
        if all(start >= e or end <= s for s, e in chosen):
            chosen.append((start, end))
    return len(chosen)

def best_possible(meetings):
    for size in range(len(meetings), 0, -1):
        for subset in itertools.combinations(meetings, size):
            ordered = sorted(subset)
            if all(a[1] <= b[0] for a, b in zip(ordered, ordered[1:])):
                return size
    return 0

rules = {"earliest start": lambda m: m[0], "shortest": lambda m: m[1] - m[0], "earliest end": lambda m: m[1]}
wins = {name: 0 for name in rules}
random.seed(0)
trials = 300
for _ in range(trials):
    meetings = []
    for _ in range(8):
        start = random.randint(0, 20)
        meetings.append((start, start + random.randint(1, 8)))
    optimum = best_possible(meetings)
    for name, key in rules.items():
        wins[name] += greedy_schedule(meetings, key) == optimum
for name, count in wins.items():
    print(f"{name:<15} optimal in {count} of {trials} random instances")
```

```output
earliest start  optimal in 193 of 300 random instances
shortest        optimal in 288 of 300 random instances
earliest end    optimal in 300 of 300 random instances
```

`greedy_schedule` takes meetings in the rule's order and keeps each one that clashes with none already chosen. `best_possible` tries subsets from the largest size down, so the first conflict-free one it finds is optimal: exponential, but fine for 8 meetings, and an independent check on the greedy rules.

"Earliest start" fails often (one long early meeting can block many short ones), and "shortest" fails sometimes (a short meeting can straddle two that would both fit). "Earliest end" is optimal on every instance. Testing against brute force like this is the quickest way to kill a wrong greedy rule; it cannot prove a rule right, but the next section can.

## The exchange argument

Why is "earliest end" always optimal? Take any optimal schedule, and compare it with the greedy one meeting by meeting, in order of end time. Suppose they first differ at position k: greedy picked meeting g, the optimal schedule picked meeting o. Greedy chose the compatible meeting that ends first, so g ends no later than o. **Exchange** o for g in the optimal schedule: g starts after meeting k − 1 ends (the two schedules agree before k), and ends no later than o did, so it cannot clash with the meetings after it. The result is still a valid schedule of the same size, now agreeing with greedy one step further. Repeating the exchange turns the optimal schedule into the greedy one without ever losing a meeting, so greedy's schedule is optimal too.

That is the pattern of nearly every greedy proof: show that any optimal solution can be transformed, one exchange at a time, into the greedy solution without getting worse. When no such exchange works, look for a counterexample instead.

With the rule proved, the efficient version needs only one scan after sorting by end time, keeping the end time of the last accepted meeting: O(n log n). The second challenge uses that pattern.

## Coin change

To give change in the fewest coins, the greedy rule is: use the largest coin that fits, repeatedly. For UK coins (1, 2, 5, 10, 20, 50, 100, 200 pence) it always gives the fewest coins. For other coin systems it can fail. Predict before running: with coins 1, 3 and 4, how many coins does greedy use for 6, and what is the true minimum?

```python type
def greedy_coins(amount, coins):
    used = []
    for c in sorted(coins, reverse=True):
        while amount >= c:
            amount -= c
            used.append(c)
    return used

def fewest_coins(amount, coins):
    best = [0] + [None] * amount
    for a in range(1, amount + 1):
        options = [best[a - c] for c in coins if c <= a and best[a - c] is not None]
        best[a] = min(options) + 1 if options else None
    return best[amount]

uk = [1, 2, 5, 10, 20, 50, 100, 200]
odd = [1, 3, 4]
print("UK, 289p: greedy", greedy_coins(289, uk), "->", len(greedy_coins(289, uk)), "coins; minimum", fewest_coins(289, uk))
print("1/3/4, 6: greedy", greedy_coins(6, odd), "->", len(greedy_coins(6, odd)), "coins; minimum", fewest_coins(6, odd))
uk_fails = [a for a in range(1, 500) if len(greedy_coins(a, uk)) != fewest_coins(a, uk)]
odd_fails = [a for a in range(1, 500) if len(greedy_coins(a, odd)) != fewest_coins(a, odd)]
print("amounts below 500 where greedy is not optimal: UK", len(uk_fails), "; 1/3/4:", len(odd_fails), odd_fails[:6])
```

```output
UK, 289p: greedy [200, 50, 20, 10, 5, 2, 2] -> 7 coins; minimum 7
1/3/4, 6: greedy [4, 1, 1] -> 3 coins; minimum 2
amounts below 500 where greedy is not optimal: UK 0 ; 1/3/4: 124 [6, 10, 14, 18, 22, 26]
```

`fewest_coins` computes the true minimum for every amount up to the target, building each from smaller amounts: a first taste of the dynamic programming in the next lessons.

For 6 with coins 1, 3 and 4, greedy takes 4 + 1 + 1 (three coins) while 3 + 3 needs two. Taking the 4 looked best but ruled out the better combination, and greedy never reconsiders. For UK coins, greedy is optimal for every amount: a property of that particular set of coins (called a "canonical" coin system), which the exchange argument can prove for it but which fails for 1, 3, 4. When greedy is not provably right, dynamic programming finds the true optimum.

## Huffman coding

Text is stored with a fixed number of bits per character, 8 for plain ASCII. But letters are not equally common: in English, "e" is far more frequent than "z". **Huffman coding** gives frequent characters short codes and rare ones long codes, so the total is smaller. The codes are **prefix-free** (no code is the start of another), so the bits can be decoded unambiguously.

The greedy construction: put every character in a heap, weighted by its frequency. Repeatedly take the **two least frequent** items, merge them into one item whose frequency is their sum, and put it back. The merges form a binary tree; each character's code is its path from the root (0 for left, 1 for right). Merging the rarest items first pushes them deepest, giving them the longest codes. An exchange argument proves the result is optimal among prefix-free codes. Predict before running: how many bits will this sentence need, compared with 8 per character?

```python type
import heapq
from collections import Counter

def huffman_codes(text):
    counts = Counter(text)
    if len(counts) == 1:
        return {next(iter(counts)): "0"}
    heap = [(count, i, {ch: ""}) for i, (ch, count) in enumerate(counts.items())]
    heapq.heapify(heap)
    tie = len(heap)
    while len(heap) > 1:
        c1, _, codes1 = heapq.heappop(heap)
        c2, _, codes2 = heapq.heappop(heap)
        merged = {ch: "0" + code for ch, code in codes1.items()}
        merged.update({ch: "1" + code for ch, code in codes2.items()})
        heapq.heappush(heap, (c1 + c2, tie, merged))
        tie += 1
    return heap[0][2]

text = "this is an example of a huffman tree built from a short sentence"
codes = huffman_codes(text)
for ch, code in sorted(codes.items(), key=lambda item: (len(item[1]), item[0]))[:6]:
    print(f"{ch!r}: {code}  (appears {text.count(ch)} times)")
encoded = "".join(codes[ch] for ch in text)
print(f"{len(text)} characters: {len(text) * 8} bits at 8 per character, {len(encoded)} bits with Huffman codes")

decode = {code: ch for ch, code in codes.items()}
out, current = [], ""
for bit in encoded:
    current += bit
    if current in decode:
        out.append(decode[current])
        current = ""
print("decodes correctly:", "".join(out) == text)
```

```output
' ': 111  (appears 12 times)
'e': 010  (appears 7 times)
'a': 1101  (appears 5 times)
'f': 1001  (appears 4 times)
'h': 0000  (appears 3 times)
'i': 0001  (appears 3 times)
64 characters: 512 bits at 8 per character, 249 bits with Huffman codes
decodes correctly: True
```

Each heap entry carries a dictionary of codes for the characters merged into it; merging prepends 0 to one side's codes and 1 to the other's. The middle number in each entry is a unique tie-breaker, so Python never compares two dictionaries.

The space and the most common letters get the shortest codes, and the sentence needs 249 bits instead of 512: under half. Decoding reads bits until they form a complete code: because no code is a prefix of another, the first match is always right. Huffman coding is part of ZIP, PNG, JPEG and MP3 compression.

::: challenge Pack the most value [easy]
A thief's bag holds `capacity` kilograms. Each item is `(value, weight)`, and **any fraction** of an item may be taken (gold dust, not gold bars). Write `fractional_knapsack(items, capacity)` returning the largest total value, greedily: take items in order of value per kilogram, highest first, taking as much of each as fits. (This greedy rule is optimal for fractions; for whole items only, it is not, which is the knapsack problem of a later lesson.)

```python starter
def fractional_knapsack(items, capacity):
    return 0.0

print(fractional_knapsack([(60, 10), (100, 20), (120, 30)], 50))
```

```python solution
def fractional_knapsack(items, capacity):
    total = 0.0
    for value, weight in sorted(items, key=lambda it: it[0] / it[1], reverse=True):
        if capacity <= 0:
            break
        take = min(weight, capacity)
        total += value * take / weight
        capacity -= take
    return total

print(fractional_knapsack([(60, 10), (100, 20), (120, 30)], 50))
```

```python test
import random as _random
assert "fractional_knapsack" in dir(), "Keep the function's name as fractional_knapsack."
assert abs(fractional_knapsack([(60, 10), (100, 20), (120, 30)], 50) - 240) < 1e-9, "Take the first two whole (160) and 20 of the 30 kg of the third (80): 240."
assert fractional_knapsack([], 10) == 0 and fractional_knapsack([(10, 5)], 0) == 0, "Nothing to take, or no room."
assert abs(fractional_knapsack([(10, 5)], 100) - 10) < 1e-9, "Everything fits: take it all."
_r = _random.Random(1)
for _ in range(200):
    _its = [(_r.randint(1, 50), _r.randint(1, 20)) for _ in range(_r.randint(0, 6))]; _cap = _r.randint(0, 40)
    _best, _left = 0.0, _cap
    _w = [0.0] * len(_its)
    for _k in sorted(range(len(_its)), key=lambda k: -_its[k][0] / _its[k][1]):
        _take = min(_its[_k][1], _left); _best += _its[_k][0] * _take / _its[_k][1]; _left -= _take
    assert abs(fractional_knapsack(_its, _cap) - _best) < 1e-9, f"Wrong value for {_its} with capacity {_cap}."
"SUCCESS: With fractions allowed, the best value per kilogram always deserves the space first: swapping any of it for a worse-ratio item can only lose value."
```

Hint: Sort by `value / weight`, highest first. For each item take `min(weight, capacity)` kilograms, adding the matching fraction of its value, and reduce the capacity.
:::

::: challenge Fewest arrows [medium]
Balloons are stretched horizontally along a wall; balloon `(start, end)` covers that range of x positions, ends included. An arrow shot vertically at position x bursts every balloon with start ≤ x ≤ end. Write `fewest_arrows(balloons)` returning the minimum number of arrows that burst them all. Greedy: sort by **end**; shoot an arrow at the end of the first balloon not yet burst, which bursts every balloon starting at or before that point; repeat. (The exchange argument is the same as for meetings: moving any arrow right, to the smallest end among the balloons it bursts, can only burst more.)

```python starter
def fewest_arrows(balloons):
    return 0

print(fewest_arrows([(10, 16), (2, 8), (1, 6), (7, 12)]))
```

```python solution
def fewest_arrows(balloons):
    arrows, last = 0, float("-inf")
    for start, end in sorted(balloons, key=lambda b: b[1]):
        if start > last:
            arrows += 1
            last = end
    return arrows

print(fewest_arrows([(10, 16), (2, 8), (1, 6), (7, 12)]))
```

```python test
import itertools as _it, random as _random
assert "fewest_arrows" in dir(), "Keep the function's name as fewest_arrows."
assert fewest_arrows([(10, 16), (2, 8), (1, 6), (7, 12)]) == 2, "Arrows at 6 and 12 burst all four."
assert fewest_arrows([]) == 0 and fewest_arrows([(1, 2)]) == 1, "No balloons, or one."
assert fewest_arrows([(1, 2), (2, 3)]) == 1, "Ends are included: one arrow at 2 bursts both."
assert fewest_arrows([(1, 2), (3, 4), (5, 6)]) == 3, "Separate balloons need one arrow each."
_r = _random.Random(2)
for _ in range(150):
    _bs = []
    for _ in range(_r.randint(0, 6)):
        _s = _r.randint(0, 12); _bs.append((_s, _s + _r.randint(0, 5)))
    _points = sorted({e for _, e in _bs})
    _want = next((k for k in range(len(_bs) + 1) for _c in _it.combinations(_points, k) if all(any(s <= x <= e for x in _c) for s, e in _bs)), 0)
    assert fewest_arrows(_bs) == _want, f"Wrong answer for {_bs}: expected {_want}."
"SUCCESS: Shooting at the earliest end is never worse than shooting anywhere else for that balloon: the meeting-scheduling exchange argument again, in disguise."
```

Hint: Sort by end. Keep the position of the last arrow (start with minus infinity). A balloon starting after it needs a new arrow, placed at that balloon's end.
:::

::: challenge The cost of a Huffman code [medium]
The total length of a Huffman encoding equals the sum, over all the merges, of the merged frequencies (each merge adds one bit to every character inside it). Write `huffman_bits(counts)` that takes a list of character frequencies and returns the total number of bits, using a heap of plain numbers: repeatedly pop the two smallest, add their sum to the total, and push the sum back. A single character (or none) needs 0 merges; return its count times 1 for one character (each needs one bit) and 0 for none.

```python starter
import heapq

def huffman_bits(counts):
    return 0

print(huffman_bits([45, 13, 12, 16, 9, 5]))
```

```python solution
import heapq

def huffman_bits(counts):
    if not counts:
        return 0
    if len(counts) == 1:
        return counts[0]
    heap = list(counts)
    heapq.heapify(heap)
    total = 0
    while len(heap) > 1:
        merged = heapq.heappop(heap) + heapq.heappop(heap)
        total += merged
        heapq.heappush(heap, merged)
    return total

print(huffman_bits([45, 13, 12, 16, 9, 5]))
```

```python test
from collections import Counter as _C
import random as _random
assert "huffman_bits" in dir(), "Keep the function's name as huffman_bits."
assert huffman_bits([45, 13, 12, 16, 9, 5]) == 224, f"The classic six-letter example needs 224 bits; got {huffman_bits([45, 13, 12, 16, 9, 5])}."
assert huffman_bits([]) == 0 and huffman_bits([7]) == 7 and huffman_bits([3, 5]) == 8, "Edge cases: nothing, one character, two characters (one bit each)."
_r = _random.Random(3)
for _ in range(100):
    _t = "".join(_r.choice("aaabbcdef ") for _ in range(_r.randint(2, 40)))
    if len(set(_t)) < 2:
        continue
    _codes = huffman_codes(_t)
    assert huffman_bits(list(_C(_t).values())) == sum(len(_codes[ch]) for ch in _t), f"For {_t!r} the encoding has {sum(len(_codes[ch]) for ch in _t)} bits."
"SUCCESS: Each merge adds one bit to everything inside it, so summing the merged weights gives the encoded length without building any codes."
```

Hint: `heapify` a copy of the counts. While more than one remains, pop two, add their sum to the total and push it back. Handle zero and one characters first.
:::

## What you learned

- A greedy algorithm takes the locally best choice at each step and never revisits it: simple and fast, but only right for problems with the right structure.
- Test candidate rules against brute force on small random inputs; for interval scheduling, "earliest end" survives while "earliest start" and "shortest" fail.
- Prove a greedy rule with an exchange argument: transform any optimal solution into the greedy one, step by step, without making it worse.
- Greedy change-making works for canonical coin systems like UK coins but fails for 1, 3, 4; Huffman coding's "merge the two rarest" is a provably optimal greedy algorithm.

The next lesson tackles the problems where greedy fails, by remembering the answers to subproblems: dynamic programming with memoisation.
