# Backtracking

The recursion lesson generated every ordering and every subset by building new lists. That works, but many real searches are only interested in a few of the possibilities: the seatings where no two rivals sit together, the timetables with no clashes, the Sudoku grid that obeys every rule. **Backtracking** builds a solution one choice at a time, and the moment a partial solution breaks a rule, it abandons it and every completion of it. Then it undoes the last choice and tries the next. A search over billions of possibilities can finish after a few thousand steps, because whole branches of the tree are never entered.

This lesson covers:

- the backtracking template: choose, explore, un-choose, on one shared partial solution;
- **pruning**: rejecting a partial solution early, and measuring how much work it saves;
- the N-queens puzzle;
- a Sudoku solver, and why the order in which choices are made matters as much as the pruning.

## Choose, explore, un-choose

A coach must pick a team of 3 from 5 players. Backtracking keeps **one** list, `chosen`, holding the current partial team. At each step it chooses a player (appends), explores everything that follows from that choice (a recursive call), then un-chooses (pops) so the list is ready for the next option. Each player is only considered after the previously chosen one, so each team appears once, not once per ordering.

One trap: when a complete team is found, the code must record a **copy**, `chosen[:]`. Recording `chosen` itself stores a reference to the one shared list, which the pops later empty. Predict before running: what does the buggy version return?

```python type
players = ["Ada", "Ben", "Cy", "Di", "Eve"]

def teams(size, record_copy=True):
    found, chosen = [], []
    def explore(start):
        if len(chosen) == size:
            found.append(chosen[:] if record_copy else chosen)
            return
        for i in range(start, len(players)):
            chosen.append(players[i])
            explore(i + 1)
            chosen.pop()
    explore(0)
    return found

print(len(teams(3)), "teams:", teams(3)[:4], "...")
print("without copying:", teams(3, record_copy=False)[:4], "...")
```

```output
10 teams: [['Ada', 'Ben', 'Cy'], ['Ada', 'Ben', 'Di'], ['Ada', 'Ben', 'Eve'], ['Ada', 'Cy', 'Di']] ...
without copying: [[], [], [], []] ...
```

All ten entries of the buggy list are the **same** list object, emptied by the final pops. This is the aliasing lesson from Python from Zero in a new disguise, and it is the commonest backtracking bug.

The template has three parts, and every backtracking search in this lesson follows it: a **base case** that records a complete solution, a loop over the **choices** available next, and a matched pair of **choose** and **un-choose** around the recursive call. Because the partial solution is shared and restored, the memory used is only the depth of the search, not the number of possibilities.

## Pruning

A workshop has £100 to spend and a price list. Which sets of items cost exactly £100? Without pruning, the search builds every subset: 2ⁿ of them. But if the items are sorted by price and the running total already exceeds the budget, adding more items can only make it worse, so the whole branch can be abandoned. And once one item is too expensive for the remaining money, every later (more expensive) item is too, so the loop can stop. Count the calls to `explore` to see the difference. Predict before running: how many calls does each version make for these 20 prices?

```python type
prices = [3, 5, 7, 8, 9, 12, 14, 15, 18, 20, 22, 25, 27, 30, 33, 35, 40, 45, 50, 60]

def exact_spends(prices, budget, prune):
    prices = sorted(prices)
    found, chosen, calls = [], [], 0
    def explore(start, total):
        nonlocal calls
        calls += 1
        if total == budget:
            found.append(chosen[:])
        if start == len(prices):
            return
        for i in range(start, len(prices)):
            if prune and total + prices[i] > budget:
                break
            chosen.append(prices[i])
            explore(i + 1, total + prices[i])
            chosen.pop()
    explore(0, 0)
    return found, calls

for prune in [False, True]:
    found, calls = exact_spends(prices, 100, prune)
    print(f"prune={prune!s:<5}: {len(found)} ways, {calls:,} calls")
print("for example:", found[:3])
```

```output
prune=False: 627 ways, 1,048,576 calls
prune=True : 627 ways, 14,006 calls
for example: [[3, 5, 7, 8, 9, 12, 14, 15, 27], [3, 5, 7, 8, 9, 12, 14, 20, 22], [3, 5, 7, 8, 9, 15, 18, 35]]
```

`nonlocal calls` lets the inner function update the counter in the enclosing function, as in the closures lesson.

Both versions find the same 627 ways. The unpruned one visits all 2²⁰ = 1,048,576 subsets, the pruned one 14,006, about one seventy-fifth of the work. Pruning never changes the answer, only the work. The test that cuts a branch must be **safe**: it may only reject partial solutions that genuinely cannot be completed. The test here is safe because prices are positive and sorted. With negative prices it would be wrong.

## N-queens

Place n queens on an n × n chessboard so that no two attack each other: no two in the same row, column or diagonal. There is exactly one queen per row, so place them row by row, choosing a column for each. A column is ruled out if a queen above uses it, or shares one of its diagonals. On the diagonals running down to the right, `row - col` is constant; on the others, `row + col` is. Three sets record the columns and diagonals already used, so each check is O(1). Predict before running: how many solutions does the classic 8 × 8 board have, and how many partial placements does the search try?

```python type
def queens(n):
    solutions, cols, down, up, placed = [], set(), set(), set(), []
    tried = 0
    def place(row):
        nonlocal tried
        if row == n:
            solutions.append(placed[:])
            return
        for col in range(n):
            tried += 1
            if col in cols or row - col in down or row + col in up:
                continue
            cols.add(col); down.add(row - col); up.add(row + col); placed.append(col)
            place(row + 1)
            cols.remove(col); down.remove(row - col); up.remove(row + col); placed.pop()
    place(0)
    return solutions, tried

solutions, tried = queens(8)
print(len(solutions), "solutions on 8 x 8; squares tried:", tried, "versus 8^8 =", 8 ** 8, "full placements")
for col in solutions[0]:
    print(" ".join("Q" if c == col else "." for c in range(8)))
for n in [4, 6, 10]:
    print(n, "queens:", len(queens(n)[0]), "solutions")
```

```output
92 solutions on 8 x 8; squares tried: 15720 versus 8^8 = 16777216 full placements
Q . . . . . . .
. . . . Q . . .
. . . . . . . Q
. . . . . Q . .
. . Q . . . . .
. . . . . . Q .
. Q . . . . . .
. . . Q . . . .
4 queens: 2 solutions
6 queens: 4 solutions
10 queens: 724 solutions
```

The 8 × 8 board has 92 solutions. The search tries 15,720 squares; placing one queen per row without pruning would mean 8⁸ = 16,777,216 complete boards to check. Each queen placed rules out squares in **every** later row, so most branches die within a few rows. 4 queens have 2 solutions, 6 have 4 and 10 have 724.

## Sudoku, and choosing what to choose

A Sudoku grid is 9 × 9; each row, column and 3 × 3 box must hold the digits 1 to 9 once each. A backtracking solver picks an empty cell, tries each digit that does not clash with its row, column and box, and recurses. **Which** empty cell to fill next is a choice the template leaves open, and it matters enormously. Filling cells in reading order often guesses in a cell with seven options. The **most-constrained** rule picks the empty cell with the **fewest** legal digits. If a cell has one option there is no guess at all, and if a cell has none, the branch is dead immediately, long before the grid fills up. Predict before running: how many digits does each strategy place on this puzzle?

```python type
puzzle = """
4 . . | . . . | 8 . 5
. 3 . | . . . | . . .
. . . | 7 . . | . . .
------+-------+------
. 2 . | . . . | . 6 .
. . . | . 8 . | 4 . .
. . . | . 1 . | . . .
------+-------+------
. . . | 6 . 3 | . 7 .
5 . . | 2 . . | . . .
1 . 4 | . . . | . . .
"""

def parse(text):
    digits = [ch for ch in text if ch.isdigit() or ch == "."]
    return [[0 if ch == "." else int(ch) for ch in digits[r * 9:(r + 1) * 9]] for r in range(9)]

def options(grid, r, c):
    used = set(grid[r]) | {grid[i][c] for i in range(9)}
    br, bc = 3 * (r // 3), 3 * (c // 3)
    used |= {grid[i][j] for i in range(br, br + 3) for j in range(bc, bc + 3)}
    return [d for d in range(1, 10) if d not in used]

def solve(grid, most_constrained, limit=50_000):
    placements = 0
    def fill():
        nonlocal placements
        if placements >= limit:
            return False
        empties = [(r, c) for r in range(9) for c in range(9) if grid[r][c] == 0]
        if not empties:
            return True
        if most_constrained:
            r, c = min(empties, key=lambda cell: len(options(grid, *cell)))
        else:
            r, c = empties[0]
        for d in options(grid, r, c):
            grid[r][c] = d
            placements += 1
            if fill():
                return True
            grid[r][c] = 0
        return False
    solved = fill()
    return solved, placements

import time
for most_constrained in [False, True]:
    grid = parse(puzzle)
    start = time.perf_counter()
    solved, placements = solve(grid, most_constrained)
    result = "solved" if solved else "gave up"
    print(f"most_constrained={most_constrained!s:<5}: {result} after {placements:,} placements, {time.perf_counter() - start:.2f} s")
print("\n".join(" ".join(map(str, row)) for row in grid))
```

`fill` returns True as soon as the grid is complete, and each caller passes that True straight up without undoing its digit, so the solved grid is left in place. Only a False (a dead end) triggers the un-choose. The `limit` stops a search that runs too long; reaching it counts as a dead end everywhere, so the search unwinds and gives up.

This puzzle, with only 17 clues, is a deliberately hard one. The most-constrained version solves it after 481 placements, in a fraction of a second. Reading order hits its limit of 50,000 placements and gives up; left to run, it needs nearly ten million (about four minutes in the browser). Measuring each cell's options costs a little extra per step, and it pays for itself many times over. The same idea, "decide the most constrained thing first", powers industrial constraint solvers that build timetables and allocate resources.

::: challenge Balanced brackets [easy]
Write `bracket_strings(n)` returning a list of every string of `n` pairs of correctly matched brackets, such as `"(())"` and `"()()"` for n = 2. Build them one character at a time with backtracking, and prune: an opening bracket may be added while fewer than n have been used, and a closing bracket only while there are more opening than closing brackets so far. Every string completed that way is valid, so no final check is needed.

```python starter
def bracket_strings(n):
    return []

print(bracket_strings(3))
```

```python solution
def bracket_strings(n):
    found, chosen = [], []
    def explore(opened, closed):
        if len(chosen) == 2 * n:
            found.append("".join(chosen))
            return
        if opened < n:
            chosen.append("(")
            explore(opened + 1, closed)
            chosen.pop()
        if closed < opened:
            chosen.append(")")
            explore(opened, closed + 1)
            chosen.pop()
    explore(0, 0)
    return found

print(bracket_strings(3))
```

```python test
import itertools as _it, time as _time
assert "bracket_strings" in dir(), "Keep the function's name as bracket_strings."
def _valid(_s):
    _depth = 0
    for _ch in _s:
        _depth += 1 if _ch == "(" else -1
        if _depth < 0:
            return False
    return _depth == 0
for _n in range(0, 7):
    _want = sorted("".join(_p) for _p in _it.product("()", repeat=2 * _n) if _valid(_p))
    _got = bracket_strings(_n)
    assert isinstance(_got, list), "Return a list of strings."
    assert len(_got) == len(set(_got)), f"n = {_n}: some strings appear twice."
    assert sorted(_got) == _want, f"n = {_n}: expected the {len(_want)} valid strings, got {len(_got)} strings (first few: {sorted(_got)[:3]})."
_start = _time.perf_counter(); _got = bracket_strings(10); _el = _time.perf_counter() - _start
assert len(_got) == 16796, f"10 pairs give 16,796 strings; got {len(_got)}."
assert _el < 0.5, f"10 pairs took {_el:.1f} s. Generating all 1,048,576 strings and filtering is too slow; prune as you build."
"SUCCESS: The two pruning rules mean every branch leads to a valid string: 16,796 strings built with no wasted work."
```

Hint: Track `opened` and `closed`. In `explore`, if the string has 2n characters, record `"".join(chosen)`. Otherwise, if `opened < n`, append `"("`, recurse with `opened + 1`, pop; and if `closed < opened`, append `")"`, recurse with `closed + 1`, pop.
:::

::: challenge Equal shifts [medium]
A workshop has a list of job lengths (whole hours) and `k` workers. Write `split_shifts(jobs, k)` that gives every job to one worker so that every worker gets exactly the same total hours. Return a list of `k` lists of job lengths (the shifts), or `None` if it cannot be done. Backtrack over the jobs, giving each one to a worker whose total would not pass the target `sum(jobs) // k`. Two prunings make it fast. Sort the jobs longest first, so impossible branches fail early. And never try two workers who currently have the **same** total for the same job: the branches are mirror images, so if one fails the other fails too.

```python starter
def split_shifts(jobs, k):
    return None

print(split_shifts([4, 3, 2, 3, 5, 2, 1], 4))
```

```python solution
def split_shifts(jobs, k):
    total = sum(jobs)
    if k <= 0 or total % k:
        return None
    target = total // k
    jobs = sorted(jobs, reverse=True)
    if jobs and jobs[0] > target:
        return None
    shifts = [[] for _ in range(k)]
    loads = [0] * k
    def place(i):
        if i == len(jobs):
            return True
        tried = set()
        for w in range(k):
            if loads[w] + jobs[i] > target or loads[w] in tried:
                continue
            tried.add(loads[w])
            loads[w] += jobs[i]; shifts[w].append(jobs[i])
            if place(i + 1):
                return True
            loads[w] -= jobs[i]; shifts[w].pop()
        return False
    return shifts if place(0) else None

print(split_shifts([4, 3, 2, 3, 5, 2, 1], 4))
```

```python test
import itertools as _it, random as _random, time as _time
assert "split_shifts" in dir(), "Keep the function's name as split_shifts."
def _possible(_jobs, _k):
    if sum(_jobs) % _k:
        return False
    _t = sum(_jobs) // _k
    for _a in _it.product(range(_k), repeat=len(_jobs)):
        _loads = [0] * _k
        for _j, _w in zip(_jobs, _a):
            _loads[_w] += _j
        if all(_l == _t for _l in _loads):
            return True
    return False
def _check(_jobs, _k, _expect_possible):
    _r = split_shifts(list(_jobs), _k)
    if not _expect_possible:
        assert _r is None, f"split_shifts({_jobs}, {_k}) should be None: no equal split exists. Got {_r}."
        return
    assert isinstance(_r, list) and len(_r) == _k, f"split_shifts({_jobs}, {_k}): return {_k} shifts; got {_r!r}."
    assert sorted(_x for _s in _r for _x in _s) == sorted(_jobs), f"Every job must be given out exactly once; got {_r}."
    assert len({sum(_s) for _s in _r}) == 1, f"The shifts {_r} have different totals."
_check([4, 3, 2, 3, 5, 2, 1], 4, True)
_check([1, 2, 3, 4], 3, False)
_check([2, 2, 2, 2, 3, 4, 5], 4, False)
_check([5, 5], 1, True); _check([], 2, True)
_rng = _random.Random(9)
for _ in range(80):
    _k = _rng.randint(1, 3)
    _jobs = [_rng.randint(1, 6) for _ in range(_rng.randint(0, 7))]
    _check(_jobs, _k, _possible(_jobs, _k))
_start = _time.perf_counter(); _r = split_shifts([3, 7, 7, 7, 2, 7, 3, 9, 3, 9, 7, 2], 3); _el = _time.perf_counter() - _start
assert _r is None, f"[3, 7, 7, 7, 2, 7, 3, 9, 3, 9, 7, 2] totals 66, but no split into three shifts of 22 exists; got {_r}."
assert _el < 0.3, f"Proving 12 jobs can't be split took {_el:.1f} s. Trying all 3^12 = 531,441 assignments is too slow; prune."
_check([10, 9, 8, 7, 7, 6, 5, 4, 3, 3, 2, 2], 3, True)
_start = _time.perf_counter(); _r = split_shifts([3] * 12 + [4], 4); _el = _time.perf_counter() - _start
assert _r is None, f"Twelve 3-hour jobs and one 4-hour job total 40, but no worker can make exactly 10 from them; got {_r}."
assert _el < 0.3, f"Proving that took {_el:.1f} s. Many workers have equal loads here: trying the same job on two workers with equal totals repeats the same failed search, so skip them."
_big = []
for _ in range(6):
    _left = 30
    while _left > 0:
        _piece = min(_left, _rng.randint(1, 12))
        _big.append(_piece)
        _left -= _piece
_rng.shuffle(_big)
_start = _time.perf_counter(); _r = split_shifts(_big, 6); _el = _time.perf_counter() - _start
_check(_big, 6, True)
assert _el < 2, f"{len(_big)} jobs and 6 workers took {_el:.1f} s: sort longest first and skip workers whose totals are equal."
"SUCCESS: Longest jobs first and skipping mirror-image workers cut a search of billions of assignments to a few thousand steps."
```

Hint: Compute `target = sum(jobs) // k` (return None if it does not divide evenly). Sort longest first. `place(i)` tries to give job i to each worker in turn, skipping a worker if the job would overshoot the target or if a worker with the same load was already tried for this job (keep a set of loads tried). Choose, recurse, un-choose; return True as soon as all jobs are placed.
:::

::: challenge Exam timetable [hard]
Some students take several exams, so those exams cannot share a time slot. Write `timetable(exams, clashes, slots)`. `exams` is a list of names, `clashes` a list of pairs of exams that share a student, and `slots` the number of time slots. Return a dict mapping every exam to a slot number from 0 to `slots - 1`, so that no clashing pair shares a slot, or `None` if that is impossible. (This is **graph colouring**: exams are vertices, clashes are edges, slots are colours.) Backtrack exam by exam. Two choices make it fast: schedule the exam with the **most** clashes first (the most-constrained idea from the Sudoku solver), and only try slots not already used by a clashing exam.

```python starter
def timetable(exams, clashes, slots):
    return None

exams = ["maths", "physics", "chemistry", "biology", "history"]
clashes = [("maths", "physics"), ("maths", "chemistry"), ("physics", "chemistry"), ("chemistry", "biology"), ("biology", "history")]
print(timetable(exams, clashes, 3))
```

```python solution
def timetable(exams, clashes, slots):
    neighbours = {e: set() for e in exams}
    for a, b in clashes:
        neighbours[a].add(b)
        neighbours[b].add(a)
    order = sorted(exams, key=lambda e: len(neighbours[e]), reverse=True)
    slot = {}
    def assign(i):
        if i == len(order):
            return True
        exam = order[i]
        taken = {slot[n] for n in neighbours[exam] if n in slot}
        for s in range(slots):
            if s not in taken:
                slot[exam] = s
                if assign(i + 1):
                    return True
                del slot[exam]
        return False
    return dict(slot) if assign(0) else None

exams = ["maths", "physics", "chemistry", "biology", "history"]
clashes = [("maths", "physics"), ("maths", "chemistry"), ("physics", "chemistry"), ("chemistry", "biology"), ("biology", "history")]
print(timetable(exams, clashes, 3))
```

```python test
import itertools as _it, random as _random, time as _time
assert "timetable" in dir(), "Keep the function's name as timetable."
def _possible(_ex, _cl, _s):
    _idx = {_e: _i for _i, _e in enumerate(_ex)}
    return any(all(_a[_idx[_x]] != _a[_idx[_y]] for _x, _y in _cl) for _a in _it.product(range(_s), repeat=len(_ex)))
def _check(_ex, _cl, _s, _expect):
    _r = timetable(list(_ex), list(_cl), _s)
    if not _expect:
        assert _r is None, f"{len(_ex)} exams with clashes {_cl} cannot fit in {_s} slots: return None. Got {_r}."
        return
    assert isinstance(_r, dict) and set(_r) == set(_ex), f"Return a dict with every exam as a key; got {_r!r}."
    assert all(isinstance(_v, int) and 0 <= _v < _s for _v in _r.values()), f"Slots must be whole numbers from 0 to {_s - 1}; got {_r}."
    _bad = [(_x, _y) for _x, _y in _cl if _r[_x] == _r[_y]]
    assert not _bad, f"Clashing exams share a slot: {_bad[:3]}."
_ex = ["maths", "physics", "chemistry", "biology", "history"]
_cl = [("maths", "physics"), ("maths", "chemistry"), ("physics", "chemistry"), ("chemistry", "biology"), ("biology", "history")]
_check(_ex, _cl, 3, True); _check(_ex, _cl, 2, False)
_k4 = ["a", "b", "c", "d"]
_check(_k4, list(_it.combinations(_k4, 2)), 3, False); _check(_k4, list(_it.combinations(_k4, 2)), 4, True)
_check(["solo"], [], 1, True); _check([], [], 2, True)
_rng = _random.Random(10)
for _ in range(80):
    _n = _rng.randint(1, 7)
    _ex = [f"e{_i}" for _i in range(_n)]
    _cl = [(_x, _y) for _x, _y in _it.combinations(_ex, 2) if _rng.random() < 0.45]
    _s = _rng.randint(1, 4)
    _check(_ex, _cl, _s, _possible(_ex, _cl, _s))
def _planted(_n, _s, _p, _seed):
    _g = _random.Random(_seed)
    _ex = [f"x{_i}" for _i in range(_n)]
    _hidden = {_e: _g.randrange(_s) for _e in _ex}
    _cl = [(_x, _y) for _x, _y in _it.combinations(_ex, 2) if _hidden[_x] != _hidden[_y] and _g.random() < _p]
    return _ex, _cl
_ex, _cl = _planted(12, 3, 0.4, 11)
_cl += [(_x, _y) for _x, _y in _it.combinations(_ex[8:], 2) if (_x, _y) not in _cl]
_start = _time.perf_counter(); _r = timetable(list(_ex), list(_cl), 3); _el = _time.perf_counter() - _start
assert _r is None, "These 12 exams include four that all clash with each other, so 3 slots cannot work: return None."
assert _el < 0.3, f"Proving 12 exams don't fit took {_el:.1f} s. Trying all 3^12 = 531,441 timetables is too slow; backtrack and skip slots a clashing exam already uses."
_ex, _cl = _planted(35, 4, 0.35, 12)
_start = _time.perf_counter(); _check(_ex, _cl, 4, True); _el = _time.perf_counter() - _start
assert _el < 0.3, f"35 exams in 4 slots took {_el:.1f} s: schedule the exams with the most clashes first, so dead ends show up early."
"SUCCESS: Exams with the most clashes go first, and each one only tries slots its clashing exams left free: the 35-exam timetable takes a moment, where going through the exams in list order can take seconds."
```

Hint: Build a dict of each exam's clashing exams (both directions). Sort the exams by number of clashes, most first. `assign(i)` collects the slots already used by exam i's scheduled neighbours, tries each other slot (choose, recurse, un-choose with `del`), and returns True once every exam has a slot. Return a copy of the dict, or None.
:::

## What you learned

- Backtracking extends one shared partial solution: choose, explore, un-choose. Record a **copy** of each complete solution, never the shared list itself.
- Pruning abandons a partial solution that cannot be completed, removing its whole subtree. A pruning test must be safe: it may only reject what truly cannot succeed. Sorting the choices often makes early rejection possible.
- N-queens places one queen per row and checks columns and both diagonals in O(1) with sets. The search touches thousands of squares instead of millions of boards.
- The order of choices matters as much as pruning: filling the most-constrained cell or exam first finds dead ends early and turns long searches into short ones.

The next lesson looks at integers as rows of bits, and the tricks that bit operations make possible: masks, subsets as integers, and constant-time set operations.
