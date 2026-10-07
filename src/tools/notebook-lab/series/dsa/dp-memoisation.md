# Dynamic programming: memoisation

Some problems have a natural recursive solution that is hopelessly slow, not because the recursion is wrong, but because it solves the **same subproblems over and over**. The naive Fibonacci function from the recursion lesson made about 250,000 calls for n = 25, nearly all of them repeats. **Dynamic programming** (DP) is the remedy: solve each distinct subproblem once, and reuse the answer. The **top-down** way to do that is **memoisation**: keep the recursive function exactly as it is, and add a table that remembers every result it has computed.

Dynamic programming applies when a problem has two properties:

- **optimal substructure**: the answer can be built from answers to smaller instances of the same problem;
- **overlapping subproblems**: those smaller instances recur many times.

Divide and conquer has the first property without the second (merge sort's halves never overlap), which is why it needs no table. This lesson covers:

- memoising a recursive function by hand with a dictionary, and with `functools.cache`;
- counting how much work memoisation saves;
- choosing the **state**: what the recursive function's arguments must capture;
- three classic problems: counting paths, the fewest coins, and decoding messages.

## Remember what you computed

The recipe: write the recursive solution; then, at the start of the function, look up its arguments in a dictionary and return the stored answer if there is one; at the end, store the answer before returning it. The function's logic does not change at all. Predict before running: how many calls will the memoised version make for n = 30, and the plain one?

```python type
calls = 0

def fib_plain(n):
    global calls
    calls += 1
    return n if n < 2 else fib_plain(n - 1) + fib_plain(n - 2)

memo = {}
def fib_memo(n):
    global calls
    calls += 1
    if n in memo:
        return memo[n]
    result = n if n < 2 else fib_memo(n - 1) + fib_memo(n - 2)
    memo[n] = result
    return result

for f in [fib_memo, fib_plain]:
    calls = 0
    print(f"{f.__name__}(30) = {f(30):,} using {calls:,} calls")
```

```output
fib_memo(30) = 832,040 using 59 calls
fib_plain(30) = 832,040 using 2,692,537 calls
```

`memo` lives outside the function so that it survives between calls; every call either finds its answer there or computes and stores it.

The plain version makes 2,692,537 calls; the memoised one makes 59, because each n from 0 to 30 is computed once and every other call is a dictionary lookup. Exponential time has become linear: there are n distinct subproblems, each costing O(1) beyond its recursive calls. That is the general rule for memoised DP: **running time = number of distinct states × work per state**.

## functools.cache

Python can add the table for you. Decorating a function with `@functools.cache` (or `@functools.lru_cache(maxsize=None)` in older Pythons) stores every result, keyed by the arguments, which must therefore be hashable: numbers, strings, tuples, not lists. `cache_info()` reports how often the table was used. Predict before running: how many "hits" (answers found in the table) and "misses" (answers computed) for n = 80?

```python type
from functools import cache

@cache
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)

print(f"fib(80) = {fib(80):,}")
print(fib.cache_info())
fib.cache_clear()
```

```output
fib(80) = 23,416,728,348,467,685
CacheInfo(hits=78, misses=81, maxsize=None, currsize=81)
```

`cache_clear()` empties the table, so the demo can be run again from scratch.

There are 81 misses, one per distinct n from 0 to 80, and 78 hits, the second call of each pair finding its answer already computed. One caution, specific to running Python in a browser: a cached recursive function nests calls inside the cache's own machinery, and a recursion a few hundred levels deep can exhaust the browser's stack and crash the notebook, before Python's own limit even applies. Keep memoised recursion shallow (this lesson stays under 200 levels), or use the next lesson's **tabulation**, which needs no recursion at all.

## Choosing the state

The hard part of dynamic programming is not the table: it is deciding what a subproblem **is**. The **state** is the information the recursive function needs, and it becomes the function's arguments and the table's key. It must capture everything that affects the answer from here on, and nothing more (every extra detail multiplies the number of states).

Example: how many routes are there through a city grid from the top-left corner to the bottom-right, moving only right or down, avoiding blocked squares? From any square, the routes to the goal are the routes from the square to its right plus the routes from the square below. So the state is just the current square, `(row, col)`: how you got there does not matter. Predict before running: how many routes through the 6 × 8 grid below?

```python type
from functools import cache

city = [
    "........",
    "..#.....",
    "....#...",
    ".#......",
    "...#..#.",
    "........",
]
rows, cols = len(city), len(city[0])

@cache
def routes(r, c):
    if r >= rows or c >= cols or city[r][c] == "#":
        return 0
    if (r, c) == (rows - 1, cols - 1):
        return 1
    return routes(r, c + 1) + routes(r + 1, c)

print("routes:", routes(0, 0))
print("distinct calls computed:", routes.cache_info().misses, "(squares reached, blocked ones included, plus a few just off the grid)")
routes.cache_clear()
```

```output
routes: 59
distinct calls computed: 60 (squares reached, blocked ones included, plus a few just off the grid)
```

Stepping off the grid or onto a blocked square is a base case with 0 routes; reaching the goal is the base case with 1.

There are 59 routes, found by computing each square's count once. Without the cache, the recursion would follow every route separately, and on an open 16 × 16 grid that is over 150 million routes; with it, 256 states. The recursion depth is at most rows + cols, so it is safe even with the cache.

## The fewest coins

The greedy lesson showed that "largest coin first" fails for coins 1, 3 and 4. Dynamic programming gets it right by trying **every** coin as the first and keeping the best: the fewest coins for amount a is 1 plus the fewest for a − c, minimised over every coin c that fits. The state is the remaining amount. Predict before running: what is the fewest number of coins for 6, and for 63?

```python type
from functools import cache

def fewest_coins(amount, coins):
    @cache
    def best(a):
        if a == 0:
            return 0
        options = [best(a - c) for c in coins if c <= a]
        options = [o for o in options if o is not None]
        return 1 + min(options) if options else None
    return best(amount)

for amount in [6, 63]:
    print(f"{amount}: fewest coins from 1, 3, 4 = {fewest_coins(amount, (1, 3, 4))}")
print("7 from coins 2 and 4:", fewest_coins(7, (2, 4)))
```

```output
6: fewest coins from 1, 3, 4 = 2
63: fewest coins from 1, 3, 4 = 16
7 from coins 2 and 4: None
```

`best` is defined inside `fewest_coins` so that it can see `coins`, and so each call to `fewest_coins` gets its own fresh cache. `None` marks an amount that cannot be made at all.

6 takes two coins (3 + 3), where greedy used three, and 63 takes 16. Seven cannot be made from 2s and 4s, so the answer is `None`. With A amounts and C coins there are A states, each trying C coins: O(A × C). Note the recursion depth: up to A levels, since `best(a)` can call `best(a - 1)`. For amounts in the hundreds that is too deep for the cache in a browser, which is exactly the case the next lesson's bottom-up table solves.

::: challenge Climbing with hops of 1, 2 or 3 [easy]
A child climbs a staircase of n steps, taking 1, 2 or 3 steps at a time. Write `ways_to_climb(n)` returning the number of different sequences of hops that reach exactly step n, using memoisation (`functools.cache` or a dictionary). There is 1 way to climb 0 steps (do nothing). You may assume n ≤ 100.

```python starter
def ways_to_climb(n):
    return 0

print([ways_to_climb(n) for n in range(7)])
```

```python solution
from functools import cache

@cache
def ways_to_climb(n):
    if n < 0:
        return 0
    if n == 0:
        return 1
    return ways_to_climb(n - 1) + ways_to_climb(n - 2) + ways_to_climb(n - 3)

print([ways_to_climb(n) for n in range(7)])
```

```python test
import itertools as _it, time as _time
assert "ways_to_climb" in dir(), "Keep the function's name as ways_to_climb."
assert [ways_to_climb(_n) for _n in range(7)] == [1, 1, 2, 4, 7, 13, 24], f"Expected [1, 1, 2, 4, 7, 13, 24], got {[ways_to_climb(_n) for _n in range(7)]}."
for _n in range(1, 9):
    _count = sum(1 for _k in range(1, _n + 1) for _seq in _it.product((1, 2, 3), repeat=_k) if sum(_seq) == _n)
    assert ways_to_climb(_n) == _count, f"For {_n} steps there are {_count} sequences."
_start = _time.perf_counter(); ways_to_climb(25); _el = _time.perf_counter() - _start
assert _el < 0.5, f"ways_to_climb(25) took {_el:.1f} s: without memoisation it makes millions of calls. Store each answer the first time it is computed."
_start = _time.perf_counter()
_v = ways_to_climb(100)
_el = _time.perf_counter() - _start
assert _v == 180396380815100901214157639 and _el < 1, f"ways_to_climb(100) should be fast with memoisation (took {_el:.1f} s)."
"SUCCESS: Without memoisation, ways_to_climb(100) would make about 10²⁶ calls; with it, 101 states. The answer has 27 digits."
```

Hint: The ways to reach n are the ways to reach n − 1, n − 2 and n − 3, added (the last hop was 1, 2 or 3). Negative n has 0 ways; 0 has 1. Decorate with `@cache`.
:::

::: challenge Decode a message [medium]
A message of letters A to Z was encoded as numbers, A → 1, B → 2, …, Z → 26, and the numbers written together without spaces, so "12" could be "AB" (1, 2) or "L" (12). Write `decodings(digits)` returning the number of ways a string of digits can be decoded. A "0" cannot stand alone (only as part of 10 or 20), and a two-digit code must be between 10 and 26. An empty string has 1 decoding (there is nothing left to decode). Use memoisation on the **position** in the string: from position i, either read one digit (if it is not "0") or two digits (if they form 10 to 26). Assume the string has at most 150 digits.

```python starter
def decodings(digits):
    return 0

print(decodings("12"), decodings("226"), decodings("06"))
```

```python solution
from functools import cache

def decodings(digits):
    @cache
    def ways(i):
        if i == len(digits):
            return 1
        if digits[i] == "0":
            return 0
        total = ways(i + 1)
        if i + 1 < len(digits) and 10 <= int(digits[i:i + 2]) <= 26:
            total += ways(i + 2)
        return total
    return ways(0)

print(decodings("12"), decodings("226"), decodings("06"))
```

```python test
import random as _random
assert "decodings" in dir(), "Keep the function's name as decodings."
for _d, _want in [("12", 2), ("226", 3), ("06", 0), ("10", 1), ("27", 1), ("", 1), ("0", 0), ("100", 0), ("1111", 5), ("2611055971756562", 4)]:
    assert decodings(_d) == _want, f"decodings({_d!r}) should be {_want}, got {decodings(_d)}."
def _brute(_s):
    if not _s:
        return 1
    _t = 0
    if _s[0] != "0":
        _t += _brute(_s[1:])
        if len(_s) > 1 and 10 <= int(_s[:2]) <= 26:
            _t += _brute(_s[2:])
    return _t
_r = _random.Random(1)
for _ in range(200):
    _s = "".join(_r.choice("0112226") for _ in range(_r.randint(0, 12)))
    assert decodings(_s) == _brute(_s), f"decodings({_s!r}) should be {_brute(_s)}."
_start = _time.perf_counter(); decodings("1" * 30); _el = _time.perf_counter() - _start
assert _el < 0.5, f"30 ones took {_el:.1f} s: without memoisation the calls grow like the Fibonacci numbers. Memoise on the position."
assert decodings("1" * 120) == 8670007398507948658051921, "120 ones: the count is a Fibonacci number, found instantly with memoisation."
"SUCCESS: The state is just the position: what remains to decode. 120 ones have about 8.7 × 10²⁴ decodings, counted with 121 states."
```

Hint: Define `ways(i)` inside `decodings` with `@cache`. At the end of the string there is 1 way; a "0" at position i gives 0 ways; otherwise add `ways(i + 1)`, plus `ways(i + 2)` when the two digits from i form 10 to 26.
:::

::: challenge The cheapest path down a triangle [medium]
A triangle of numbers has 1 number in its first row, 2 in its second, and so on. Starting at the top, each step moves down to one of the two numbers directly below (from position j in row r to position j or j + 1 in row r + 1). Write `cheapest_descent(triangle)` returning the smallest total of a path from the top to the bottom row, memoised on the state `(row, position)`. Assume at most 100 rows.

```python starter
def cheapest_descent(triangle):
    return 0

print(cheapest_descent([[2], [3, 4], [6, 5, 7], [4, 1, 8, 3]]))
```

```python solution
from functools import cache

def cheapest_descent(triangle):
    @cache
    def best(r, j):
        if r == len(triangle) - 1:
            return triangle[r][j]
        return triangle[r][j] + min(best(r + 1, j), best(r + 1, j + 1))
    return best(0, 0)

print(cheapest_descent([[2], [3, 4], [6, 5, 7], [4, 1, 8, 3]]))
```

```python test
import itertools as _it, random as _random, time as _time
assert "cheapest_descent" in dir(), "Keep the function's name as cheapest_descent."
assert cheapest_descent([[2], [3, 4], [6, 5, 7], [4, 1, 8, 3]]) == 11, "2 + 3 + 5 + 1 = 11."
assert cheapest_descent([[7]]) == 7 and cheapest_descent([[1], [-5, 2]]) == -4, "One row; negative numbers are allowed."
_r = _random.Random(2)
for _ in range(100):
    _n = _r.randint(1, 7)
    _tri = [[_r.randint(-9, 9) for _ in range(_row + 1)] for _row in range(_n)]
    _want = min(sum(_tri[_row][sum(_moves[:_row])] for _row in range(_n)) for _moves in _it.product((0, 1), repeat=_n - 1))
    assert cheapest_descent(_tri) == _want, f"Wrong total for {_tri}: expected {_want}."
_mid = [[(_row * 7 + _j * 13) % 10 for _j in range(_row + 1)] for _row in range(22)]
_start = _time.perf_counter(); cheapest_descent(_mid); _el = _time.perf_counter() - _start
assert _el < 0.5, f"22 rows took {_el:.1f} s: there are 2^21 paths, but only 253 positions. Memoise on (row, position)."
_big = [[(_row * 7 + _j * 13) % 10 for _j in range(_row + 1)] for _row in range(100)]
_start = _time.perf_counter(); cheapest_descent(_big); _el = _time.perf_counter() - _start
assert _el < 1, f"100 rows took {_el:.1f} s: memoise on (row, position); there are only 5,050 states, but 2^99 paths."
"SUCCESS: 2^99 paths, but only 5,050 (row, position) states, each settled once: memoisation turns an impossible search into an instant one."
```

Hint: Define `best(r, j)` with `@cache`: on the bottom row it is just the number there; otherwise the number plus the smaller of `best(r + 1, j)` and `best(r + 1, j + 1)`. The answer is `best(0, 0)`.
:::

## What you learned

- Dynamic programming applies when a problem has optimal substructure and overlapping subproblems; memoisation solves each distinct subproblem once by remembering results in a table.
- The recipe: write the recursion, then look up arguments before computing and store results after. `functools.cache` does it automatically for hashable arguments.
- Running time is the number of distinct states times the work per state: Fibonacci falls from exponential to linear, grid routes and triangle paths from exponential to the number of squares.
- Choosing the state (what the function's arguments must capture) is the real design work. Deep memoised recursion is risky in the browser; the next lesson builds the same table bottom-up, without recursion.

The next lesson fills the table from the smallest subproblems upwards, with loops instead of recursion: tabulation.
