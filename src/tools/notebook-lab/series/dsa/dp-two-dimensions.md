# Dynamic programming in two dimensions

The tables in the last lesson had one index: an amount, a position, a number of houses. Many problems need **two**: a position in each of two sequences, or an item number and a remaining capacity. The table becomes a grid, `table[i][j]`, and the same three questions decide everything. What does one entry **mean**? Which neighbouring entries does it depend on? In what order must the grid be filled so those neighbours are ready first?

This lesson covers:

- the longest common subsequence of two sequences, and tracing the subsequence back through the grid;
- edit distance, the fewest insertions, deletions and substitutions turning one string into another, with the edits recovered;
- the 0/1 knapsack: the most value that fits within a weight limit;
- shrinking a two-dimensional table to one row, and why the direction of the inner loop then matters.

## Longest common subsequence

Two versions of a file, two DNA strands, two users' viewing histories: how much do they have in common, **in order**? A **common subsequence** of two sequences is a subsequence of both (items kept in order, gaps allowed). The **longest common subsequence** (LCS) is the backbone of `diff` tools: the lines in the LCS are the unchanged ones.

Let `L[i][j]` be the LCS length of the first `i` items of `a` and the first `j` items of `b`. Look at the last item of each prefix. If `a[i-1] == b[j-1]`, that item can end a common subsequence, so `L[i][j] = L[i-1][j-1] + 1`. If they differ, at least one of the two last items is not used, so `L[i][j] = max(L[i-1][j], L[i][j-1])`. Row 0 and column 0 are empty prefixes, with LCS 0. Each entry needs the entries above, to the left and diagonally up-left, so filling row by row, left to right, always has them ready. Predict before running: how long is the LCS of `ABCBDAB` and `BDCABA`?

```python type
def lcs_table(a, b):
    L = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            if a[i - 1] == b[j - 1]:
                L[i][j] = L[i - 1][j - 1] + 1
            else:
                L[i][j] = max(L[i - 1][j], L[i][j - 1])
    return L

def lcs(a, b):
    L = lcs_table(a, b)
    i, j, kept = len(a), len(b), []
    while i > 0 and j > 0:
        if a[i - 1] == b[j - 1]:
            kept.append(a[i - 1])
            i, j = i - 1, j - 1
        elif L[i - 1][j] >= L[i][j - 1]:
            i -= 1
        else:
            j -= 1
    return "".join(reversed(kept))

a, b = "ABCBDAB", "BDCABA"
L = lcs_table(a, b)
print("     " + "  ".join(b))
for i, row in enumerate(L[1:], start=1):
    print(a[i - 1], " ", "  ".join(str(x) for x in row[1:]))
print("LCS:", lcs(a, b), "length", L[len(a)][len(b)])
```

```output
     B  D  C  A  B  A
A   0  0  0  1  1  1
B   1  1  1  1  2  2
C   1  1  2  2  2  2
B   1  1  2  2  3  3
D   1  2  2  2  3  3
A   1  2  2  3  3  4
B   1  2  2  3  4  4
LCS: BCBA length 4
```

The `[[0] * (len(b) + 1) for _ in range(...)]` builds a separate list for each row. Writing `[[0] * m] * n` instead would make every row the **same** list, the aliasing trap from Python from Zero.

The bottom-right entry is the answer: 4. The traceback starts there and walks back: on a match it takes the diagonal step and keeps the item; otherwise it steps towards whichever neighbour holds the larger value. This one found `BCBA`; `BDAB` and `BCAB` are also length 4, and a different tie rule would find one of those. The grid has (7 + 1) × (6 + 1) entries, each filled in constant time: O(nm) time and memory.

## Edit distance

A spell checker sees `recieve` and must suggest a word. A natural rule: the dictionary word reachable with the fewest single-character edits. The **edit distance** (or Levenshtein distance) between two strings is the fewest **insertions**, **deletions** and **substitutions** turning one into the other.

Let `D[i][j]` be the edit distance from the first `i` characters of `s` to the first `j` of `t`. Turning `i` characters into nothing takes `i` deletions, so `D[i][0] = i`; likewise `D[0][j] = j` insertions. For the rest, consider the last characters. If they are equal, no edit is needed for them: `D[i][j] = D[i-1][j-1]`. Otherwise the last step was one of three edits, and the best is 1 plus the cheapest of:

- `D[i-1][j]`: delete `s[i-1]`;
- `D[i][j-1]`: insert `t[j-1]`;
- `D[i-1][j-1]`: substitute `s[i-1]` with `t[j-1]`.

The same three neighbours as the LCS, so the same fill order. Predict before running: how many edits turn `kitten` into `sitting`, and which ones? And which dictionary word is closest to `recieve`?

```python type
def edit_table(s, t):
    D = [[0] * (len(t) + 1) for _ in range(len(s) + 1)]
    for i in range(len(s) + 1):
        D[i][0] = i
    for j in range(len(t) + 1):
        D[0][j] = j
    for i in range(1, len(s) + 1):
        for j in range(1, len(t) + 1):
            if s[i - 1] == t[j - 1]:
                D[i][j] = D[i - 1][j - 1]
            else:
                D[i][j] = 1 + min(D[i - 1][j], D[i][j - 1], D[i - 1][j - 1])
    return D

def edits(s, t):
    D = edit_table(s, t)
    i, j, steps = len(s), len(t), []
    while i > 0 or j > 0:
        if i > 0 and j > 0 and s[i - 1] == t[j - 1] and D[i][j] == D[i - 1][j - 1]:
            i, j = i - 1, j - 1
        elif i > 0 and j > 0 and D[i][j] == D[i - 1][j - 1] + 1:
            steps.append(f"substitute {s[i - 1]!r} -> {t[j - 1]!r} at {i - 1}")
            i, j = i - 1, j - 1
        elif i > 0 and D[i][j] == D[i - 1][j] + 1:
            steps.append(f"delete {s[i - 1]!r} at {i - 1}")
            i -= 1
        else:
            steps.append(f"insert {t[j - 1]!r} at {i}")
            j -= 1
    return D[len(s)][len(t)], steps[::-1]

print(edits("kitten", "sitting"))
print(edits("intention", "execution")[0])

words = ["receive", "recipe", "relieve", "deceive", "review", "reverse"]
typo = "recieve"
ranked = sorted(words, key=lambda w: edit_table(typo, w)[len(typo)][len(w)])
print([(w, edit_table(typo, w)[len(typo)][len(w)]) for w in ranked])
```

```output
(3, ["substitute 'k' -> 's' at 0", "substitute 'e' -> 'i' at 4", "insert 'g' at 6"])
5
[('relieve', 1), ('receive', 2), ('recipe', 2), ('deceive', 3), ('review', 3), ('reverse', 4)]
```

`kitten` to `sitting` takes 3 edits: substitute k with s, substitute e with i, insert g at the end. The positions in the steps are positions in the string as it is at that moment, read left to right.

`intention` to `execution` takes 5. The typo is the surprise: `relieve` wins at distance 1 (one substitution, c to l), while `receive`, the word the typist meant, is at distance 2. Swapping two neighbouring letters, the commonest typing slip, costs two substitutions here. The **Damerau** variant adds a fourth edit, "transpose two neighbours", by also looking at `D[i-2][j-2]`, and with it `receive` is at distance 1 too. The distance you choose encodes which mistakes you consider likely.

## The 0/1 knapsack

A hiker can carry 10 kg. Each piece of kit has a weight and a value (how much it is worth on the trip), and each can be taken **once** or left (that is the "0/1"). Which kit maximises the total value? Greedy by value per kilogram is tempting, but as the greedy lesson showed, a dense item can crowd out a combination that fills the space better.

Let `K[i][w]` be the best value using only the first `i` items with capacity `w`. Item `i` is either left behind, giving `K[i-1][w]`, or taken if it fits, giving its value plus `K[i-1][w - weight]`, the best for the rest of the space using the earlier items. Row `i` depends only on row `i-1`, so fill row by row. To recover the kit, walk back up the rows: if `K[i][w] != K[i-1][w]`, item `i` was taken, so subtract its weight. Predict before running: what is the best value for 10 kg, and does packing the densest items first ever do worse?

```python type
kit = [("tent", 5, 60), ("stove", 3, 50), ("food", 4, 70), ("water", 2, 30),
       ("camera", 1, 20), ("book", 1, 10), ("chair", 4, 25)]

def knapsack(items, capacity):
    n = len(items)
    K = [[0] * (capacity + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        name, weight, value = items[i - 1]
        for w in range(capacity + 1):
            K[i][w] = K[i - 1][w]
            if weight <= w and K[i - 1][w - weight] + value > K[i][w]:
                K[i][w] = K[i - 1][w - weight] + value
    taken, w = [], capacity
    for i in range(n, 0, -1):
        if K[i][w] != K[i - 1][w]:
            name, weight, value = items[i - 1]
            taken.append(name)
            w -= weight
    return K[n][capacity], taken[::-1]

for name, weight, value in kit:
    print(f"{name:<7} {weight} kg  value {value:>3}  value per kg {value / weight:5.1f}")
print("best for 10 kg:", knapsack(kit, 10))
print("best for 15 kg:", knapsack(kit, 15))

def greedy_by_density(items, capacity):
    total = 0
    for name, weight, value in sorted(items, key=lambda item: item[2] / item[1], reverse=True):
        if weight <= capacity:
            capacity -= weight
            total += value
    return total

losses = [(c, greedy_by_density(kit, c), knapsack(kit, c)[0]) for c in range(1, 21) if greedy_by_density(kit, c) < knapsack(kit, c)[0]]
print("capacities where greedy loses (capacity, greedy, best):", losses)
```

```output
tent    5 kg  value  60  value per kg  12.0
stove   3 kg  value  50  value per kg  16.7
food    4 kg  value  70  value per kg  17.5
water   2 kg  value  30  value per kg  15.0
camera  1 kg  value  20  value per kg  20.0
book    1 kg  value  10  value per kg  10.0
chair   4 kg  value  25  value per kg   6.2
best for 10 kg: (170, ['stove', 'food', 'water', 'camera'])
best for 15 kg: (230, ['tent', 'stove', 'food', 'water', 'camera'])
capacities where greedy loses (capacity, greedy, best): [(13, 180, 200), (14, 180, 210), (19, 240, 255)]
```

The best 10 kg pack is worth 170: stove, food, water and camera, exactly 10 kg. The tent, the most valuable single item, is left out. At 10 kg greedy happens to find the same pack, but not at every capacity. At 13 kg greedy fills 11 kg with the four densest items and the book, for 180, and no longer has room for the tent. The table instead takes tent, food, stove and camera, exactly 13 kg, for 200. Greedy also loses at 14 and 19 kg. Greedy is only sometimes right; the table is always right.

The table has (items + 1) × (capacity + 1) entries, so the time is O(n × W), where W is the capacity. That looks polynomial, but W is a **number**, not a length: a capacity written with 30 digits would need a table with 10³⁰ columns. Knapsack is believed to have no truly polynomial algorithm. This table is fast only while the capacity is a modest whole number.

## One row is enough, if you loop the right way

Each row of the knapsack table reads only the row above, so one list can hold both: overwrite it in place, row after row. But the inner loop must then run over capacities **downwards**. Reading `best[w - weight]` must see the value from **before** this item was considered. Running downwards, `w - weight` is smaller than `w`, so it has not been overwritten yet in this pass. Running upwards, it already includes this item, so the item could be taken again and again. That is a different problem, the **unbounded** knapsack, where each item has unlimited copies. Predict before running: with capacity 10, how do the two loop directions answer?

```python type
def knapsack_one_row(items, capacity, downward=True):
    best = [0] * (capacity + 1)
    for name, weight, value in items:
        order = range(capacity, weight - 1, -1) if downward else range(weight, capacity + 1)
        for w in order:
            best[w] = max(best[w], best[w - weight] + value)
    return best[capacity]

print("downward (each item once):     ", knapsack_one_row(kit, 10, downward=True))
print("upward (unlimited copies):     ", knapsack_one_row(kit, 10, downward=False))
print("matches the full table:        ", knapsack_one_row(kit, 10) == knapsack(kit, 10)[0])
```

```output
downward (each item once):      170
upward (unlimited copies):      200
matches the full table:         True
```

Downward reproduces 170. Upward gives 200: ten cameras, 20 each. That is right for unlimited copies, and wrong for this hiker. The coin-combinations count from the last lesson ran its amounts upwards for exactly this reason: each coin could be used any number of times. One row saves memory (O(W) instead of O(nW)), but it loses the information the traceback needs. When you need the chosen items, keep the full table.

::: challenge Paths through a workshop floor [easy]
A robot starts at the top-left cell of a grid and moves only **right** or **down** to reach the bottom-right cell. Some cells hold machines (`1`) and cannot be entered; free cells are `0`. Write `count_paths(grid)` returning the number of different routes. If the start or the end is blocked, the answer is 0. Let `paths[r][c]` be the number of routes reaching cell (r, c): the routes arriving from above plus those arriving from the left.

```python starter
def count_paths(grid):
    return 0

floor = [[0, 0, 0],
         [0, 1, 0],
         [0, 0, 0]]
print(count_paths(floor))
```

```python solution
def count_paths(grid):
    rows, cols = len(grid), len(grid[0])
    paths = [[0] * cols for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 1:
                continue
            if r == 0 and c == 0:
                paths[r][c] = 1
                continue
            above = paths[r - 1][c] if r > 0 else 0
            left = paths[r][c - 1] if c > 0 else 0
            paths[r][c] = above + left
    return paths[rows - 1][cols - 1]

floor = [[0, 0, 0],
         [0, 1, 0],
         [0, 0, 0]]
print(count_paths(floor))
```

```python test
import random as _random, time as _time
assert "count_paths" in dir(), "Keep the function's name as count_paths."
assert count_paths([[0, 0, 0], [0, 1, 0], [0, 0, 0]]) == 2, "Around the middle machine: over the top or along the bottom, 2 routes."
assert count_paths([[0]]) == 1, "A 1 × 1 floor: one route, staying put."
assert count_paths([[1, 0], [0, 0]]) == 0 and count_paths([[0, 0], [0, 1]]) == 0, "A blocked start or end means no routes."
assert count_paths([[0] * 3 for _ in range(3)]) == 6, "An empty 3 × 3 floor has 6 routes."
def _brute(_g, _r=0, _c=0):
    if _r >= len(_g) or _c >= len(_g[0]) or _g[_r][_c] == 1:
        return 0
    if (_r, _c) == (len(_g) - 1, len(_g[0]) - 1):
        return 1
    return _brute(_g, _r + 1, _c) + _brute(_g, _r, _c + 1)
_rng = _random.Random(4)
for _ in range(150):
    _g = [[1 if _rng.random() < 0.2 else 0 for _ in range(_rng.randint(1, 6))]]
    _g += [[1 if _rng.random() < 0.2 else 0 for _ in range(len(_g[0]))] for _ in range(_rng.randint(0, 5))]
    assert count_paths(_g) == _brute(_g), f"Wrong count for {_g}: expected {_brute(_g)}."
_mid = [[0] * 12 for _ in range(12)]
_start = _time.perf_counter(); _n = count_paths(_mid); _el = _time.perf_counter() - _start
assert _n == 705432, f"An empty 12 × 12 floor has 705,432 routes; got {_n}."
assert _el < 0.2, f"12 × 12 took {_el:.1f} s. Following every route one by one is too slow; fill a table of counts once."
_big = [[0] * 18 for _ in range(18)]
_start = _time.perf_counter(); _n = count_paths(_big); _el = _time.perf_counter() - _start
assert _n == 2333606220, f"An empty 18 × 18 floor has 2,333,606,220 routes; got {_n}."
assert _el < 0.2, f"18 × 18 took {_el:.1f} s: fill a table once instead of following every route."
_big = [[0] * 300 for _ in range(300)]
_start = _time.perf_counter(); _n = count_paths(_big); _el = _time.perf_counter() - _start
assert _n > 10**170, "A 300 × 300 floor has an enormous number of routes; Python's integers hold it exactly."
assert _el < 1.5, f"300 × 300 took {_el:.1f} s: one pass over the grid."
"SUCCESS: Each cell's count is the sum of the cell above and the cell to the left: 90,000 cells, one addition each, for a number with over 170 digits."
```

Hint: Make `paths` a grid of zeros the same size, with `paths[0][0] = 1` if the start is free. Fill row by row, left to right; a machine cell stays 0; every other cell adds the value above (if there is a row above) and the value to the left (if there is a column to the left).
:::

::: challenge A line diff [medium]
Version control shows how a file changed as a list of lines, each marked: `"  "` (two spaces) for a line kept, `"- "` for a line removed from the old version, `"+ "` for a line added in the new one. Write `diff(old, new)`, taking two lists of lines and returning that list of marked strings, for example `"- print(x)"`. The kept lines must be a **longest** common subsequence of the two versions, so the diff shows as few changes as possible. Build the LCS table over lines instead of characters, then trace back from the bottom-right corner, emitting a mark at each step, and reverse.

```python starter
def diff(old, new):
    return []

old = ["def area(r):", "    return 3.14 * r * r", "", "print(area(2))"]
new = ["import math", "def area(r):", "    return math.pi * r * r", "", "print(area(2))"]
print("\n".join(diff(old, new)))
```

```python solution
def diff(old, new):
    L = [[0] * (len(new) + 1) for _ in range(len(old) + 1)]
    for i in range(1, len(old) + 1):
        for j in range(1, len(new) + 1):
            if old[i - 1] == new[j - 1]:
                L[i][j] = L[i - 1][j - 1] + 1
            else:
                L[i][j] = max(L[i - 1][j], L[i][j - 1])
    i, j, out = len(old), len(new), []
    while i > 0 or j > 0:
        if i > 0 and j > 0 and old[i - 1] == new[j - 1]:
            out.append("  " + old[i - 1])
            i, j = i - 1, j - 1
        elif j > 0 and (i == 0 or L[i][j - 1] >= L[i - 1][j]):
            out.append("+ " + new[j - 1])
            j -= 1
        else:
            out.append("- " + old[i - 1])
            i -= 1
    return out[::-1]

old = ["def area(r):", "    return 3.14 * r * r", "", "print(area(2))"]
new = ["import math", "def area(r):", "    return math.pi * r * r", "", "print(area(2))"]
print("\n".join(diff(old, new)))
```

```python test
import random as _random, time as _time
assert "diff" in dir(), "Keep the function's name as diff."
def _lcs_len(_a, _b):
    _row = [0] * (len(_b) + 1)
    for _x in _a:
        _new = [0]
        for _j, _y in enumerate(_b, start=1):
            _new.append(_row[_j - 1] + 1 if _x == _y else max(_row[_j], _new[_j - 1]))
        _row = _new
    return _row[-1]
def _check(_old, _new):
    _d = diff(_old, _new)
    assert isinstance(_d, list) and all(isinstance(_s, str) and _s[:2] in ("  ", "- ", "+ ") for _s in _d), f"Every entry must be a string starting with '  ', '- ' or '+ '; got {_d!r}."
    _rebuilt_old = [_s[2:] for _s in _d if _s[:2] in ("  ", "- ")]
    _rebuilt_new = [_s[2:] for _s in _d if _s[:2] in ("  ", "+ ")]
    assert _rebuilt_old == _old, f"The kept and removed lines, in order, should rebuild the old version {_old!r}; they give {_rebuilt_old!r}."
    assert _rebuilt_new == _new, f"The kept and added lines, in order, should rebuild the new version {_new!r}; they give {_rebuilt_new!r}."
    _kept = sum(1 for _s in _d if _s[:2] == "  ")
    assert _kept == _lcs_len(_old, _new), f"For {_old!r} -> {_new!r}, {_kept} lines are kept, but {_lcs_len(_old, _new)} could be: the kept lines must be a longest common subsequence."
_old = ["def area(r):", "    return 3.14 * r * r", "", "print(area(2))"]
_new = ["import math", "def area(r):", "    return math.pi * r * r", "", "print(area(2))"]
_check(_old, _new)
_check([], []); _check(["a"], []); _check([], ["b"]); _check(["x", "y"], ["x", "y"])
_rng = _random.Random(5)
for _ in range(300):
    _a = [_rng.choice("abcd") for _ in range(_rng.randint(0, 9))]
    _b = [_rng.choice("abcd") for _ in range(_rng.randint(0, 9))]
    _check(_a, _b)
_a = [f"line {_rng.randint(0, 40)}" for _ in range(500)]
_b = list(_a)
for _ in range(60):
    _b[_rng.randrange(len(_b))] = f"changed {_rng.randint(0, 9)}"
_start = _time.perf_counter(); _check(_a, _b); _el = _time.perf_counter() - _start
assert _el < 3, f"Two 500-line files took {_el:.1f} s: one table fill and one walk back."
"SUCCESS: The LCS table finds the most lines that can stay; walking back from the corner turns each step into a kept, removed or added line. This is the idea inside diff and git."
```

Hint: Fill the LCS table exactly as in the lesson, comparing whole lines. Walk back from `(len(old), len(new))`: equal lines go diagonally and are kept; otherwise move towards the larger neighbour, emitting `"+ "` for a step left (a line of `new`) or `"- "` for a step up (a line of `old`). When one list is used up, the rest of the other is all additions or all removals. Reverse at the end.
:::

::: challenge Packing the delivery van [hard]
A van can carry `capacity` kg. Each parcel is a tuple `(name, weight, fee)`, weights whole kilograms. Write `load_van(parcels, capacity)` returning a tuple `(total_fee, names)`: the largest total fee from parcels that fit together, and the list of names of one best choice, each parcel used at most once, in their original order. Use the knapsack table with the traceback; a search through every subset will be far too slow for the larger tests.

```python starter
def load_van(parcels, capacity):
    return 0, []

parcels = [("A", 12, 40), ("B", 7, 30), ("C", 11, 32), ("D", 8, 30), ("E", 9, 28)]
print(load_van(parcels, 26))
```

```python solution
def load_van(parcels, capacity):
    n = len(parcels)
    K = [[0] * (capacity + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        _, weight, fee = parcels[i - 1]
        above, row = K[i - 1], K[i]
        for w in range(capacity + 1):
            row[w] = above[w]
            if weight <= w and above[w - weight] + fee > row[w]:
                row[w] = above[w - weight] + fee
    names, w = [], capacity
    for i in range(n, 0, -1):
        if K[i][w] != K[i - 1][w]:
            names.append(parcels[i - 1][0])
            w -= parcels[i - 1][1]
    return K[n][capacity], names[::-1]

parcels = [("A", 12, 40), ("B", 7, 30), ("C", 11, 32), ("D", 8, 30), ("E", 9, 28)]
print(load_van(parcels, 26))
```

```python test
import itertools as _it, random as _random, time as _time
assert "load_van" in dir(), "Keep the function's name as load_van."
def _brute(_ps, _cap):
    _best = 0
    for _k in range(len(_ps) + 1):
        for _combo in _it.combinations(_ps, _k):
            if sum(_p[1] for _p in _combo) <= _cap:
                _best = max(_best, sum(_p[2] for _p in _combo))
    return _best
def _check(_ps, _cap, _want):
    _r = load_van(_ps, _cap)
    assert isinstance(_r, tuple) and len(_r) == 2, f"Return a tuple (total_fee, names); got {_r!r}."
    _fee, _names = _r
    assert _fee == _want, f"Capacity {_cap}: the best total fee is {_want}, not {_fee}."
    _by_name = {_p[0]: _p for _p in _ps}
    assert len(set(_names)) == len(_names) and all(_n in _by_name for _n in _names), f"Each name must be a parcel's name, at most once; got {_names!r}."
    assert _names == [_p[0] for _p in _ps if _p[0] in set(_names)], f"List the names in the parcels' original order; got {_names!r}."
    assert sum(_by_name[_n][1] for _n in _names) <= _cap, f"{_names!r} weighs more than {_cap} kg."
    assert sum(_by_name[_n][2] for _n in _names) == _fee, f"The fees of {_names!r} do not add up to {_fee}."
_ps = [("A", 12, 40), ("B", 7, 30), ("C", 11, 32), ("D", 8, 30), ("E", 9, 28)]
_check(_ps, 26, 92)
_check(_ps, 0, 0); _check([], 10, 0); _check([("X", 5, 9)], 4, 0); _check([("X", 5, 9)], 5, 9)
_rng = _random.Random(6)
for _ in range(120):
    _ps = [(f"p{_i}", _rng.randint(1, 10), _rng.randint(1, 40)) for _i in range(_rng.randint(0, 8))]
    _cap = _rng.randint(0, 30)
    _check(_ps, _cap, _brute(_ps, _cap))
_ps = [(f"q{_i}", _rng.randint(5, 60), _rng.randint(10, 200)) for _i in range(18)]
_start = _time.perf_counter(); load_van(_ps, 300); _el = _time.perf_counter() - _start
assert _el < 0.3, f"18 parcels took {_el:.1f} s. Trying every subset is 262,144 choices; a table of 19 × 301 entries is enough."
_ps = [(f"r{_i}", _rng.randint(20, 400), _rng.randint(10, 500)) for _i in range(80)]
_start = _time.perf_counter(); _fee, _names = load_van(_ps, 4000); _el = _time.perf_counter() - _start
_one = [0] * 4001
for _n, _w, _f in _ps:
    for _c in range(4000, _w - 1, -1):
        _one[_c] = max(_one[_c], _one[_c - _w] + _f)
_check(_ps, 4000, _one[4000])
assert _el < 4, f"80 parcels and 4,000 kg took {_el:.1f} s: the table has 320,000 entries, one comparison each."
"SUCCESS: Each entry decides one parcel at one capacity: take it or leave it. The table finds the best fee, and walking back up its rows recovers which parcels earn it."
```

Hint: Build `K` with `len(parcels) + 1` rows and `capacity + 1` columns, all zeros. For row i, copy the row above, then wherever the parcel fits and `K[i-1][w - weight] + fee` is larger, use that. To recover the names, start at `w = capacity` and go from the last row up: when `K[i][w] != K[i-1][w]`, parcel i-1 was loaded, so record it and subtract its weight. Reverse the names at the end.
:::

## What you learned

- A two-dimensional DP table is still defined by what one entry means, which neighbours it depends on, and a fill order that has those neighbours ready.
- Longest common subsequence: a match extends the diagonal; otherwise take the larger of the entries above and to the left. Walking back from the corner recovers the subsequence, and the same walk produces a line diff.
- Edit distance: the first row and column count pure insertions and deletions; every other entry is free on a match, otherwise 1 plus the cheapest of delete, insert or substitute.
- The 0/1 knapsack decides each item at each capacity, in O(n × W) time. That is fast only while the capacity W is a modest number. A changed entry between consecutive rows shows the item was taken.
- A table whose rows depend only on the row above can shrink to one row, but the loop direction then decides the problem: downward for each item once, upward for unlimited copies. The traceback needs the full table.

The next lesson designs DP states for harder problems, where the subproblem is an interval of a sequence or a subset of items stored as the bits of an integer.
