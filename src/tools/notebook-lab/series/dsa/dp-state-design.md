# Designing DP states

Every dynamic programme so far came with its table already designed: an amount, a position, a pair of prefixes. In a new problem, choosing **what a table entry stands for** is the hard part, and the rest is bookkeeping. This lesson is about that choice. The rule behind it: the **state** must record everything about the past that the future depends on, and nothing more. Record too little and the recurrence gives wrong answers. Record too much and the table is too big to fill.

This lesson covers:

- adding information to a state when the obvious one is not enough;
- **interval DP**, where the subproblem is a stretch `i..j` of a sequence, filled by increasing length;
- representing a set of items as the bits of an integer;
- **bitmask DP**, where the subproblem is a subset: the travelling salesman problem in O(2ⁿ n²) instead of O(n!).

## When the obvious state is not enough

Climb a staircase of n steps, one or two at a time. The last lesson counted the ways with `ways[n] = ways[n-1] + ways[n-2]`. Now add a rule: a tired climber never takes **two 2-steps in a row**. `ways[n]` alone cannot enforce that. Whether a 2-step is allowed next depends on the **last** step taken, and the count of ways says nothing about it.

So put the missing fact into the state. Let `end1[n]` count the climbs of n steps ending with a 1-step, and `end2[n]` those ending with a 2-step. A 1-step can follow anything: `end1[n] = end1[n-1] + end2[n-1]`. A 2-step can only follow a 1-step (or start the climb): `end2[n] = end1[n-2]`, with `end2[2] = 1` for the climb that is a single 2-step. A brute-force count over every sequence of steps checks the recurrence. Predict before running: how many climbs of 10 steps are there without the rule, and with it?

```python type
import itertools

def climbs_no_double_two(n):
    if n == 0:
        return 1
    end1 = [0] * (n + 1)
    end2 = [0] * (n + 1)
    end1[1] = 1
    for i in range(2, n + 1):
        end1[i] = end1[i - 1] + end2[i - 1]
        end2[i] = end1[i - 2] + (1 if i == 2 else 0)
    return end1[n] + end2[n]

def brute(n, allow_double_two):
    count = 0
    for length in range(n + 1):
        for steps in itertools.product((1, 2), repeat=length):
            if sum(steps) == n and (allow_double_two or (2, 2) not in zip(steps, steps[1:])):
                count += 1
    return count

print("10 steps, any climb:        ", brute(10, True))
print("10 steps, no two 2s in a row:", brute(10, False), "by brute force,", climbs_no_double_two(10), "by DP")
print("all agree up to 15:", all(climbs_no_double_two(n) == brute(n, False) for n in range(16)))
print("100 steps:", climbs_no_double_two(100))
```

```output
10 steps, any climb:         89
10 steps, no two 2s in a row: 41 by brute force, 41 by DP
all agree up to 15: True
100 steps: 35734758952996318
```

The `zip(steps, steps[1:])` pairs each step with the next one, so `(2, 2) in ...` spots a double two.

Without the rule there are 89 climbs of 10 steps, the Fibonacci number from the last lesson. With it there are 41. The two-part state doubles the table but keeps every entry's meaning exact. This is the most common state-design move: when the recurrence needs to know something about the past, add exactly that something to the state.

## Interval DP: the cheapest order to multiply matrices

Multiplying a p × q matrix by a q × r matrix takes p·q·r multiplications of numbers. Matrix multiplication is associative, so `(AB)C` and `A(BC)` give the same result, but they can cost wildly different amounts. With A 10 × 30, B 30 × 5 and C 5 × 60, `(AB)C` costs 10·30·5 + 10·5·60 = 4,500, while `A(BC)` costs 30·5·60 + 10·30·60 = 27,000.

For a chain of n matrices, how should the brackets go? The last multiplication done joins some prefix `A_i..A_k` to the suffix `A_{k+1}..A_j`, and each side should itself be bracketed as cheaply as possible. So the state is an **interval**: `cost[i][j]` is the cheapest way to multiply matrices i through j. It depends on shorter intervals inside it, so the table is filled by **increasing interval length**: all intervals of length 1 (cost 0), then 2, then 3, up to the whole chain. Matrix i has shape `dims[i] × dims[i+1]`. Predict before running: how much cheaper is the best bracketing of this six-matrix chain than multiplying left to right?

```python type
def chain_order(dims, names):
    n = len(dims) - 1
    cost = [[0] * n for _ in range(n)]
    split = [[None] * n for _ in range(n)]
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            cost[i][j] = float("inf")
            for k in range(i, j):
                c = cost[i][k] + cost[k + 1][j] + dims[i] * dims[k + 1] * dims[j + 1]
                if c < cost[i][j]:
                    cost[i][j], split[i][j] = c, k
    def bracket(i, j):
        if i == j:
            return names[i]
        k = split[i][j]
        return "(" + bracket(i, k) + bracket(k + 1, j) + ")"
    return cost[0][n - 1], bracket(0, n - 1)

def left_to_right(dims):
    total, rows = 0, dims[0]
    for i in range(1, len(dims) - 1):
        total += rows * dims[i] * dims[i + 1]
    return total

print(chain_order([10, 30, 5, 60], "ABC"))
dims = [30, 35, 15, 5, 10, 20, 25]
print(chain_order(dims, "ABCDEF"), "versus left to right:", left_to_right(dims))
```

```output
(4500, '((AB)C)')
(15125, '((A(BC))((DE)F))') versus left to right: 40500
```

There are n² / 2 intervals and each tries up to n split points: O(n³) time. The number of possible bracketings grows like the Catalan numbers (42 for six matrices, over 1.7 billion for twenty), so trying them all is hopeless beyond a handful.

The first chain confirms `(AB)C` at 4,500. For six matrices the best bracketing costs 15,125 multiplications against 40,500 left to right. Does that matter for real arrays? NumPy multiplies matrices with exactly these p·q·r products. Predict before running: how much faster is the cheap order here?

```python type
import numpy as np, time

rng = np.random.default_rng(0)
A, B, C = rng.random((400, 10)), rng.random((10, 400)), rng.random((400, 10))
print("cost (AB)C:", 400 * 10 * 400 + 400 * 400 * 10, "  cost A(BC):", 10 * 400 * 10 + 400 * 10 * 10)

def best_of_five(f):
    times = []
    for _ in range(5):
        start = time.perf_counter(); f(); times.append(time.perf_counter() - start)
    return min(times)

slow = best_of_five(lambda: (A @ B) @ C)
fast = best_of_five(lambda: A @ (B @ C))
print(f"(AB)C is {slow / fast:.0f} times slower than A(BC)")
print("same result:", np.allclose((A @ B) @ C, A @ (B @ C)))
```

`(AB)C` builds a 400 × 400 intermediate: 3,200,000 multiplications. `A(BC)` builds a 10 × 10 one: 80,000, forty times fewer. The measured speed-up is a little under that, since NumPy has fixed overheads, and it varies from run to run, but it is always large. Machine-learning libraries choose the order of chained products for this reason.

## Sets as integers

The last kind of state is a **subset**: "which of these items have been used". A subset of n items can be stored as an integer whose bit i is 1 when item i is in the set. These are called **bitmasks**; the bit manipulation lesson goes deeper, and three operations are enough for now:

- `1 << i` is the integer with only bit i set (2 to the power i);
- `mask & (1 << i)` is non-zero exactly when item i is in `mask`;
- `mask | (1 << i)` is `mask` with item i added.

Every subset of n items is then one of the integers 0 to 2ⁿ − 1, so a table indexed by subsets is just a list of length 2ⁿ. Predict before running: which items does mask 13 hold?

```python type
items = ["drill", "saw", "clamp", "level"]

def members(mask):
    return [items[i] for i in range(len(items)) if mask & (1 << i)]

print("13 in binary:", bin(13), "->", members(13))
print("13 with the saw added:", members(13 | (1 << 1)))
print("every subset of 4 items is a number from 0 to", (1 << len(items)) - 1)
```

```output
13 in binary: 0b1101 -> ['drill', 'clamp', 'level']
13 with the saw added: ['drill', 'saw', 'clamp', 'level']
every subset of 4 items is a number from 0 to 15
```

13 is `0b1101`: bits 0, 2 and 3, so drill, clamp and level. Adding bit 1 gives 15, all four.

## Bitmask DP: the travelling salesman

A delivery driver must visit n stops and return to the depot (stop 0) by the shortest route. Trying every order means (n − 1)! routes: 39,916,800 for twelve stops. The **Held–Karp** algorithm notices that the cost of finishing a route depends only on **which stops have been visited** and **where the driver is now**, not on the order the visited ones came in. So the state is `(visited set, current stop)`: `best[mask][last]` is the shortest path that starts at the depot, visits exactly the stops in `mask`, and ends at `last`. Extend it by one unvisited stop at a time. Masks only grow, so filling them in increasing numeric order has every smaller subset ready. That gives 2ⁿ × n states with n choices each: O(2ⁿ n²). Predict before running: does Held–Karp agree with brute force on nine stops, and how long does it take for thirteen?

```python type
import itertools, math, random, time

def random_stops(n, seed):
    rng = random.Random(seed)
    points = [(rng.uniform(0, 100), rng.uniform(0, 100)) for _ in range(n)]
    return [[math.dist(p, q) for q in points] for p in points]

def brute_force_tour(D):
    n = len(D)
    best = float("inf")
    for order in itertools.permutations(range(1, n)):
        route = (0,) + order + (0,)
        best = min(best, sum(D[a][b] for a, b in zip(route, route[1:])))
    return best

def held_karp(D):
    n = len(D)
    INF = float("inf")
    best = [[INF] * n for _ in range(1 << n)]
    best[1][0] = 0
    for mask in range(1 << n):
        for last in range(n):
            here = best[mask][last]
            if here == INF:
                continue
            for nxt in range(n):
                if not mask & (1 << nxt):
                    new = mask | (1 << nxt)
                    if here + D[last][nxt] < best[new][nxt]:
                        best[new][nxt] = here + D[last][nxt]
    full = (1 << n) - 1
    return min(best[full][last] + D[last][0] for last in range(1, n))

D9 = random_stops(9, seed=1)
start = time.perf_counter(); b = brute_force_tour(D9); t_brute = time.perf_counter() - start
start = time.perf_counter(); h = held_karp(D9); t_hk = time.perf_counter() - start
print(f"9 stops: brute force {b:.2f} in {t_brute:.2f} s, Held-Karp {h:.2f} in {t_hk:.2f} s")

D13 = random_stops(13, seed=2)
start = time.perf_counter(); h = held_karp(D13); t_hk = time.perf_counter() - start
print(f"13 stops: Held-Karp {h:.2f} in {t_hk:.1f} s; brute force would try {math.factorial(12):,} routes")
```

`best[1][0] = 0` is the starting state: only the depot (bit 0) visited, standing at the depot. The answer closes the loop: the best full tour ending at each stop, plus the drive home.

Both methods agree on nine stops, and Held–Karp is already faster. At thirteen stops brute force would try 479,001,600 routes, while Held–Karp's table has 8,192 × 13 entries. O(2ⁿ n²) is still exponential: each extra stop doubles the work, so around 20 stops is the practical limit, and larger instances need heuristics that give good tours without a guarantee of the best one. But going from n! to 2ⁿ n² turns "impossible at 13" into "a fraction of a second at 13". The trick was choosing a state that forgets the one thing that does not matter: the order the visited stops came in.

::: challenge Painting the fence [easy]
A fence has `n` posts and there are `k` colours of paint. Each post is painted one colour, and the only rule is that **no three posts in a row** may share a colour. Write `fence_ways(n, k)` counting the valid paintings. Design the state: let `same[i]` count paintings of the first i posts whose last two posts share a colour, and `diff[i]` those whose last two differ. A new post either differs from the last (any of k − 1 colours, after either kind), or matches it, which is only allowed when the last two differed.

```python starter
def fence_ways(n, k):
    return 0

print(fence_ways(3, 2))
```

```python solution
def fence_ways(n, k):
    if n == 0:
        return 1
    if n == 1:
        return k
    same, diff = k, k * (k - 1)
    for _ in range(3, n + 1):
        same, diff = diff, (same + diff) * (k - 1)
    return same + diff

print(fence_ways(3, 2))
```

```python test
import itertools as _it, time as _time
assert "fence_ways" in dir(), "Keep the function's name as fence_ways."
assert fence_ways(3, 2) == 6, f"3 posts, 2 colours: 8 paintings minus the 2 with all three equal = 6; got {fence_ways(3, 2)}."
assert fence_ways(1, 5) == 5 and fence_ways(2, 3) == 9, "One post: k ways. Two posts: k × k ways, since two equal posts are allowed."
assert fence_ways(0, 4) == 1, "No posts: one way, paint nothing."
assert fence_ways(5, 1) == 0 and fence_ways(2, 1) == 1, "With one colour, at most two posts can be painted."
for _n in range(0, 8):
    for _k in range(1, 4):
        _want = sum(1 for _p in _it.product(range(_k), repeat=_n) if not any(_p[_i] == _p[_i + 1] == _p[_i + 2] for _i in range(_n - 2)))
        assert fence_ways(_n, _k) == _want, f"{_n} posts, {_k} colours: expected {_want}, got {fence_ways(_n, _k)}."
_start = _time.perf_counter(); _big = fence_ways(2000, 3); _el = _time.perf_counter() - _start
assert _big > 10**800 and _el < 0.5, f"2,000 posts should be counted in one pass (took {_el:.1f} s)."
"SUCCESS: Knowing only the count was not enough; knowing whether the last two posts match was. Two numbers per post, one pass."
```

Hint: Start with `same = k` and `diff = k * (k - 1)` for two posts. For each further post: the new `same` is the old `diff` (repeat the last colour, allowed only after a change), and the new `diff` is `(same + diff) * (k - 1)`.
:::

::: challenge Cutting a steel bar [medium]
A steel bar of length `length` must be cut at the positions in the list `cuts` (distances from the left end). The saw charges the **length of the piece being cut** for each cut, so the order matters: cutting a 10 m bar at 2 first costs 10, and then cutting the 8 m right piece at 7 costs 8. Write `cheapest_cutting(length, cuts)` returning the smallest total charge over all orders of cutting. Use interval DP: add the two ends to the sorted cut list, so `points = [0] + sorted(cuts) + [length]`. Let `cost[i][j]` be the cheapest way to make every cut strictly between `points[i]` and `points[j]`. The first cut made in that piece is some `points[m]` with i < m < j; it costs `points[j] - points[i]` and leaves the two sub-pieces.

```python starter
def cheapest_cutting(length, cuts):
    return 0

print(cheapest_cutting(7, [1, 3, 4, 5]))
```

```python solution
def cheapest_cutting(length, cuts):
    points = [0] + sorted(cuts) + [length]
    n = len(points)
    cost = [[0] * n for _ in range(n)]
    for gap in range(2, n):
        for i in range(n - gap):
            j = i + gap
            cost[i][j] = min(cost[i][m] + cost[m][j] for m in range(i + 1, j)) + points[j] - points[i]
    return cost[0][n - 1]

print(cheapest_cutting(7, [1, 3, 4, 5]))
```

```python test
import itertools as _it, random as _random, time as _time
assert "cheapest_cutting" in dir(), "Keep the function's name as cheapest_cutting."
def _brute(_length, _cuts):
    _best = float("inf")
    for _order in _it.permutations(_cuts):
        _pieces, _total = [(0, _length)], 0
        for _c in _order:
            for _idx, (_a, _b) in enumerate(_pieces):
                if _a < _c < _b:
                    _total += _b - _a
                    _pieces[_idx:_idx + 1] = [(_a, _c), (_c, _b)]
                    break
        _best = min(_best, _total)
    return _best
assert cheapest_cutting(7, [1, 3, 4, 5]) == 16, f"Bar of 7 cut at 1, 3, 4, 5: the best order costs 16; got {cheapest_cutting(7, [1, 3, 4, 5])}."
assert cheapest_cutting(10, []) == 0 and cheapest_cutting(10, [4]) == 10, "No cuts cost 0; one cut costs the whole bar."
assert cheapest_cutting(9, [5, 6, 1, 4, 2]) == _brute(9, [5, 6, 1, 4, 2]), "The cuts may arrive unsorted."
_rng = _random.Random(7)
for _ in range(80):
    _length = _rng.randint(2, 30)
    _cuts = _rng.sample(range(1, _length), min(_length - 1, _rng.randint(0, 5)))
    assert cheapest_cutting(_length, _cuts) == _brute(_length, _cuts), f"Bar {_length} cut at {_cuts}: expected {_brute(_length, _cuts)}."
_cuts = _rng.sample(range(1, 200), 8)
_start = _time.perf_counter(); cheapest_cutting(200, _cuts); _el = _time.perf_counter() - _start
assert _el < 0.2, f"8 cuts took {_el:.1f} s. Trying all 40,320 orders is too slow; an interval table has only 55 entries."
_cuts = _rng.sample(range(1, 500), 13)
_start = _time.perf_counter(); cheapest_cutting(500, _cuts); _el = _time.perf_counter() - _start
assert _el < 0.2, f"13 cuts took {_el:.1f} s. Recursing on each piece without remembering answers makes about 3^12 calls; memoise, or fill a table by increasing gap."
_cuts = _rng.sample(range(1, 10_000), 90)
_start = _time.perf_counter(); _r = cheapest_cutting(10_000, _cuts); _el = _time.perf_counter() - _start
assert _el < 3, f"90 cuts took {_el:.1f} s: the interval table is about 92 × 92, with up to 90 split points each."
"SUCCESS: The state is a piece of bar between two cut points; its first cut splits it into two smaller pieces. Filled by increasing gap, that is O(n³) instead of n! orders."
```

Hint: Fill `cost` by increasing `gap = j - i`, starting at 2 (a gap of 1 holds no cut, cost 0). For each interval, try every middle point m between i and j, take the cheapest `cost[i][m] + cost[m][j]`, and add the piece's length `points[j] - points[i]`.
:::

::: challenge Assigning jobs to machines [hard]
A workshop has n jobs and n machines, and `cost[m][j]` is the cost of running job j on machine m. Each machine runs exactly one job and each job runs on exactly one machine. Write `cheapest_assignment(cost)` returning the smallest total cost. Use a bitmask over **jobs**: let `best[mask]` be the cheapest way to give the jobs in `mask` to the first `popcount(mask)` machines, where `bin(mask).count("1")` is the popcount (the number of 1 bits). Machine m = popcount(mask) takes the next job, any job not yet in `mask`. Trying every permutation is n!, which is far too slow for the larger tests.

```python starter
def cheapest_assignment(cost):
    return 0

cost = [[9, 2, 7, 8],
        [6, 4, 3, 7],
        [5, 8, 1, 8],
        [7, 6, 9, 4]]
print(cheapest_assignment(cost))
```

```python solution
def cheapest_assignment(cost):
    n = len(cost)
    INF = float("inf")
    best = [INF] * (1 << n)
    best[0] = 0
    for mask in range(1 << n):
        if best[mask] == INF:
            continue
        machine = bin(mask).count("1")
        if machine == n:
            continue
        for job in range(n):
            if not mask & (1 << job):
                new = mask | (1 << job)
                if best[mask] + cost[machine][job] < best[new]:
                    best[new] = best[mask] + cost[machine][job]
    return best[(1 << n) - 1]

cost = [[9, 2, 7, 8],
        [6, 4, 3, 7],
        [5, 8, 1, 8],
        [7, 6, 9, 4]]
print(cheapest_assignment(cost))
```

```python test
import itertools as _it, random as _random, time as _time
assert "cheapest_assignment" in dir(), "Keep the function's name as cheapest_assignment."
def _brute(_c):
    _n = len(_c)
    return min(sum(_c[_m][_p[_m]] for _m in range(_n)) for _p in _it.permutations(range(_n))) if _n else 0
_cost = [[9, 2, 7, 8], [6, 4, 3, 7], [5, 8, 1, 8], [7, 6, 9, 4]]
assert cheapest_assignment(_cost) == 13, f"The example's best is 13 (machine 0 job 1, machine 1 job 0, machine 2 job 2, machine 3 job 3); got {cheapest_assignment(_cost)}."
assert cheapest_assignment([[5]]) == 5, "One machine, one job."
_rng = _random.Random(8)
for _ in range(60):
    _n = _rng.randint(1, 6)
    _c = [[_rng.randint(0, 30) for _ in range(_n)] for _ in range(_n)]
    assert cheapest_assignment(_c) == _brute(_c), f"For {_c}: expected {_brute(_c)}, got {cheapest_assignment(_c)}."
_c = [[_rng.randint(0, 100) for _ in range(9)] for _ in range(9)]
_start = _time.perf_counter(); cheapest_assignment(_c); _el = _time.perf_counter() - _start
assert _el < 0.3, f"9 machines took {_el:.1f} s. Trying all 362,880 assignments is too slow; 512 subsets × 9 jobs is enough."
_c = [[_rng.randint(0, 100) for _ in range(14)] for _ in range(14)]
_start = _time.perf_counter(); _r = cheapest_assignment(_c); _el = _time.perf_counter() - _start
assert _el < 4, f"14 machines took {_el:.1f} s: 16,384 subsets × 14 jobs."
_best = [float("inf")] * (1 << 14)
_best[0] = 0
for _mask in range(1 << 14):
    if _best[_mask] == float("inf"):
        continue
    _m = bin(_mask).count("1")
    if _m == 14:
        continue
    for _j in range(14):
        if not _mask & (1 << _j) and _best[_mask] + _c[_m][_j] < _best[_mask | (1 << _j)]:
            _best[_mask | (1 << _j)] = _best[_mask] + _c[_m][_j]
assert _r == _best[-1], f"14 machines: the cheapest assignment costs {_best[-1]}, not {_r}."
"SUCCESS: Which machine is next follows from how many jobs are taken, so the subset of jobs alone is the state: 2ⁿ × n steps instead of n! assignments."
```

Hint: `best = [inf] * (1 << n)` with `best[0] = 0`. Visit masks in increasing order; skip unreachable ones. The machine to fill next is `bin(mask).count("1")`. For each job not in the mask, update `best[mask | (1 << job)]`. The answer is `best[(1 << n) - 1]`, every job assigned.
:::

## What you learned

- A DP state must capture everything about the past that the future depends on. When the obvious state gives wrong answers, add the missing fact (the last step, whether the last two posts match) as an extra dimension.
- Interval DP takes a stretch `i..j` as the state, splits it at every possible point, and fills by increasing length: the best matrix-chain bracketing and the cheapest cutting order in O(n³) instead of exponentially many orders.
- A subset of n items fits in an integer's bits: `1 << i`, `mask & (1 << i)` to test, `mask | (1 << i)` to add.
- Bitmask DP uses the subset as the state, deliberately forgetting the order the items were used in: the travelling salesman in O(2ⁿ n²) and the assignment problem in O(2ⁿ n), both still exponential but feasible up to about 20 items.

The next lesson explores every possibility in a different way: backtracking builds a solution one choice at a time and abandons a partial solution as soon as it cannot succeed.
