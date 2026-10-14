---
title: 3.3 — Finding the Slow Part
runtime: python
support: tests/conftest.py
---

`count_games()` from lesson 2.4 takes a second or two. That's slow for a game with nine squares. Where does the time go? Make a guess now, before reading on: building the new boards in `play`? Checking for a winner? The recursion itself?

Guesses about speed are wrong surprisingly often, even from experienced programmers, and an hour spent speeding up the wrong function is an hour wasted. So measure first. A **profiler** runs your program and records every function call: how many times each function was called, and how long it took. In this lesson you profile `count_games`, find out why it's slow, and make it about fifty times faster with one line from the standard library. Then you read that line's source code, to see how it works.

## Read the tests first

**This step: create the supplied file and read it. No code yet.**

Click **Create provided tests/test_cache.py**:

```python file=tests/test_cache.py provided
# Tests for making frontier.tictactoe fast (lesson 3.3). A time depends on the computer, so
# these count how often winner is called instead: once for every position worked out.
from frontier import tictactoe

FAST = 10000   # fewer calls than this means the same positions aren't worked out over and over


def winner_calls(monkeypatch, fn):
    """Call fn() and return how many times it called winner."""
    calls = []
    real = tictactoe.winner

    def counting(board):
        calls.append(board)
        return real(board)

    monkeypatch.setattr(tictactoe, "winner", counting)
    fn()
    return len(calls)


def test_counting_works_out_each_position_once(monkeypatch):
    assert winner_calls(monkeypatch, tictactoe.count_games) < FAST
    assert tictactoe.count_games() == 255168


def test_outcomes_works_out_each_position_once(monkeypatch):
    assert winner_calls(monkeypatch, tictactoe.outcomes) < FAST
    assert tictactoe.outcomes() == {"X": 131184, "O": 77904, "draw": 46080}


def test_outcomes_answer_belongs_to_the_caller():
    answer = tictactoe.outcomes()
    answer["X"] = 0
    assert tictactoe.outcomes()["X"] == 131184
```

- **`winner_calls`** counts calls without timing anything. `monkeypatch` is a pytest fixture, like `capsys` and `tmp_path`: `monkeypatch.setattr(tictactoe, "winner", counting)` swaps the module's `winner` for `counting` until the test ends. `counting` notes each call and passes it on to the real `winner`, so the answers don't change.
- **The first two tests** want `count_games` and `outcomes` to call `winner` fewer than 10,000 times, and still give the right answers.
- **The last** changes the dictionary `outcomes()` returned, then checks that the next call isn't affected. That one will make sense by the end of the lesson.

```check
file tests/test_cache.py -- Click "Create provided tests/test_cache.py" above.
```

## Profile it

Python's profiler is the `cProfile` module. `cProfile.Profile()` is a context manager: everything that runs inside its `with` block is recorded. The `pstats` module then reports what it recorded: `pstats.Stats(profiler)` reads the profiler's records. `strip_dirs()` shortens each file's full path to its name, `sort_stats("tottime")` puts the functions that took longest first, and `print_stats(8)` prints the top 8. Create `experiments/profile_games.py`:

```python file=experiments/profile_games.py
"""Where count_games() spends its time, measured by the profiler."""
import cProfile
import pstats

from frontier.tictactoe import count_games

with cProfile.Profile() as profiler:
    count_games()
pstats.Stats(profiler).strip_dirs().sort_stats("tottime").print_stats(8)
```

Before running it, one number in the report can be worked out exactly, because a count of calls doesn't depend on the computer. `count_games` calls `winner` once per call of itself, and it calls itself once for every position in the game tree.

```predict
question: In the profile of `count_games()`, how many times is `winner` called?
choice: 9
choice: 255168
choice: 549946
answer: 549946
explain: One call per position in the tree. Lesson 2.4 counted them: 255,168 games end at the leaves, and with the positions in between there are 549,946 in all. Every one of them asks `winner` whether the game is over.
verify: script winner_calls.py
```

```powershell
.venv\Scripts\python experiments/profile_games.py
```

The run takes a few seconds, longer than without the profiler: recording every call has a cost of its own. Each row of the report is one function, and the columns are:

- **ncalls**: how many times it was called. `549946/1` on `count_games` means 549,946 calls, of which 1 came from outside the function: the rest were it calling itself.
- **tottime**: the time spent inside that function itself, not counting the functions it called.
- **cumtime**: the time from entering it to leaving it, the functions it called included. `count_games`'s cumtime is the whole run.

`<genexpr>` is the generator expression inside `count_games`'s `sum`, which the profiler counts as a function of its own. The exact times change from run to run and computer to computer. What the report shows every time is the ncalls column: `winner`, `play`, `moves` and the generator expression each run hundreds of thousands of times, and each call is quick. No one function is slow. There are just far too many calls.

```check
run ".venv/Scripts/python experiments/profile_games.py" stdout="549946" label="the profile shows the calls" -- Check the imports (cProfile, pstats, count_games) and that count_games() is called inside the with block.
```

## The same position, again and again

Why so many calls? Because different orders of moves reach the same board. X in the top-left corner, O in the middle, then X in the bottom-right, leaves the same board as X bottom-right, O middle, X top-left. `count_games` doesn't know that, so it counts every game from that board twice, and boards deeper down far more often than that.

How many **different** boards are there? This experiment walks the same tree and keeps each board in a set, so each is kept once. Create `experiments/distinct_positions.py`:

```python file=experiments/distinct_positions.py
"""How many different boards count_games() visits."""
from frontier.tictactoe import EMPTY, moves, other, play, winner

seen: set[str] = set()


def visit(board: str, player: str) -> None:
    seen.add(board)
    if winner(board) or "." not in board:
        return
    for i in moves(board):
        visit(play(board, i, player), other(player))


visit(EMPTY, "X")
print(len(seen), "different boards")
```

`visit` has the same shape as `count_games`, but instead of counting games it puts each board it reaches into `seen`. A set ignores a board it already holds. Run it:

```powershell
.venv\Scripts\python experiments/distinct_positions.py
```

It prints `5478 different boards`. `count_games` does the work for 549,946 positions, and only 5,478 of them are different: on average, each board is worked out about a hundred times over.

```check
run ".venv/Scripts/python experiments/distinct_positions.py" stdout="5478 different boards" label="5478 different boards" -- seen.add(board) at the start of visit, and print len(seen) at the end.
```

## Remember the answers

The answer for a board never changes, so work it out once and remember it. This is called **memoising** (from "memo": a note to yourself). The first call for a board does the work and stores the result in a dictionary, keyed by its arguments. Every later call with the same arguments finds the stored result and returns it at once.

`functools.cache` does exactly that. It's a decorator, like `@dataclass`: put `@cache` on the line above a function, and every call goes through the store first. The arguments have to be hashable, since they're dictionary keys, and strings are. Add `from functools import cache` at the top of `src/frontier/tictactoe.py`, and `@cache` above `count_games`:

```python file=src/frontier/tictactoe.py
"""Noughts and crosses: a board, its moves, and every game from a position."""
from functools import cache

EMPTY = "........."
LINES = [(0, 1, 2), (3, 4, 5), (6, 7, 8), (0, 3, 6), (1, 4, 7), (2, 5, 8), (0, 4, 8), (2, 4, 6)]


def winner(board: str) -> str | None:
    """"X" or "O" if they have three in a line, otherwise None."""
    for a, b, c in LINES:
        if board[a] != "." and board[a] == board[b] == board[c]:
            return board[a]
    return None


def moves(board: str) -> list[int]:
    return [i for i, square in enumerate(board) if square == "."]


def play(board: str, i: int, player: str) -> str:
    return board[:i] + player + board[i + 1:]


def other(player: str) -> str:
    return "O" if player == "X" else "X"


@cache
def count_games(board: str = EMPTY, player: str = "X") -> int:
    """How many different games can still happen from here, with player to move."""
    if winner(board) or "." not in board:
        return 1
    return sum(count_games(play(board, i, player), other(player)) for i in moves(board))


def outcomes(board: str = EMPTY, player: str = "X") -> dict[str, int]:
    """How many of the games from here X wins, O wins, and are drawn."""
    won = winner(board)
    if won:
        return {won: 1}
    if "." not in board:
        return {"draw": 1}
    total: dict[str, int] = {}
    for i in moves(board):
        for result, games in outcomes(play(board, i, player), other(player)).items():
            total[result] = total.get(result, 0) + games
    return total
```

The recursive call inside `count_games` goes through the store too, because the name `count_games` now means the decorated function. So each board is worked out once, wherever in the tree it's reached.

```predict
question: With `@cache` on `count_games`, how many times does `count_games()` call `winner`?
choice: 5478
choice: 255168
choice: 549946
answer: 5478
explain: The body runs once per different board, the first time it's reached, and each run calls `winner` once. Every other call finds its board in the store and returns without running the body. There are 5,478 different boards, so 5,478 calls.
verify: script cached_calls.py
```

Run the profiler again:

```powershell
.venv\Scripts\python experiments/profile_games.py
```

The total time at the top of the report drops from seconds to a few hundredths of a second. The answer is the same 255,168: the tests check it.

```check
run ".venv/Scripts/python -m pytest -q tests/test_cache.py -k counting" label="count_games works out each position once" -- Put @cache on the line above def count_games, with from functools import cache at the top.
run ".venv/Scripts/python -m pytest -q tests/test_tictactoe.py" label="every game test still passes" -- @cache changes how fast count_games is, not what it returns.
run ".venv/Scripts/python -m mypy --strict src/frontier/tictactoe.py" stdout="Success" label="mypy --strict still passes" -- The import is from functools import cache.
```

## Read the source

How does `@cache` do it? You don't have to wonder: the standard library is Python code on your computer, and you can read it. `inspect.getsource` returns a function's source as a string:

```powershell
.venv\Scripts\python -c "import functools, inspect; print(inspect.getsource(functools.cache))"
```

`cache` turns out to be three lines: it returns `lru_cache(maxsize=None)(user_function)`. So `cache` is `lru_cache` with no limit on how much it stores. ("LRU" means "least recently used": with a limit, it forgets the answer it used longest ago to make room.) Follow the trail: put `functools.lru_cache` in the same command. Its docstring says the arguments must be hashable, and that it gives your function two methods: `count_games.cache_info()` reports hits and misses, and `count_games.cache_clear()` empties the store. Its code hands the real work to `_lru_cache_wrapper`, and there the trail ends, because CPython runs that part in C for speed. Reading source often goes like that: a few hops, until you reach the answer or the C.

Whenever the documentation leaves a question open, the source answers it, and reading it is a habit worth starting now. Libraries in this series, NumPy and PyTorch included, are read the same way.

One question the docstring doesn't answer: is a stored result handed back as a copy, or as the very same object? Try it.

```predict
question: What does `.venv\Scripts\python -c "from functools import cache; f = cache(lambda: []); f().append(1); print(f())"` print?
choice: []
choice: [1]
answer: [1]
explain: The first call of `f` makes an empty list and stores it. `.append(1)` changes that stored list. The second call finds it in the store and returns it, with the 1 in it. A cached function hands every caller the very same object. For `count_games`'s `int` that's harmless, since an `int` can't change; for a list or a dictionary, it isn't.
verify: script shared_result.py
```

```check
run ".venv/Scripts/python -c \"from frontier.tictactoe import count_games; count_games(); print(count_games.cache_info())\"" stdout="misses=5478" label="cache_info shows one miss per board" -- count_games needs @cache above it.
```

## Your turn: fast outcomes, safely

**Build, on your own:** make `outcomes` work each position out once too, so that the `outcomes` tests in `tests/test_cache.py` pass.

`@cache` on `outcomes` alone isn't enough. `outcomes` returns a dictionary, and as the last prediction showed, a cached dictionary is shared by every caller: the test that sets `answer["X"] = 0` would change the stored answer, and the next caller would get 0. Callers of `outcomes` must each get a dictionary of their own, while the work underneath is done once per board.

To give a caller a dictionary of their own, copy it: `dict(d)` makes a new dictionary with the same keys and values as `d`, and changing the copy leaves `d` alone. The copy has to be made on every call, so it can't happen inside a cached function: there, the copy is what gets stored, and shared.

```hints
nudge: Two functions: a cached one that does the work and whose dictionaries are never changed, and `outcomes`, uncached, that hands each caller a copy.
concept: Rename the current `outcomes` to `shared_outcomes`, put `@cache` on it, and make its recursive call use `shared_outcomes` too. Then a new `outcomes(board=EMPTY, player="X")` returns `dict(shared_outcomes(board, player))`: `dict(...)` of a dictionary is a new dictionary with the same keys and values. A copy made inside the cached function doesn't help: the copy is what gets stored, and shared.
answer: In `src/frontier/tictactoe.py`, in place of `outcomes`:
~~~python
@cache
def shared_outcomes(board: str, player: str) -> dict[str, int]:
    """outcomes, worked out once per board. Its dictionaries are shared, so never change them."""
    won = winner(board)
    if won:
        return {won: 1}
    if "." not in board:
        return {"draw": 1}
    total: dict[str, int] = {}
    for i in moves(board):
        for result, games in shared_outcomes(play(board, i, player), other(player)).items():
            total[result] = total.get(result, 0) + games
    return total


def outcomes(board: str = EMPTY, player: str = "X") -> dict[str, int]:
    """How many of the games from here X wins, O wins, and are drawn: a dictionary of your own."""
    return dict(shared_outcomes(board, player))
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_cache.py -k outcomes" label="outcomes is fast, and its answers belong to the caller" -- Cache a function that does the work, and have outcomes return dict(...) of its result.
run ".venv/Scripts/python -m pytest -q tests/test_cache.py tests/test_tictactoe.py" label="every game test still passes" -- outcomes must keep its defaults: board=EMPTY, player="X".
run ".venv/Scripts/python -m mypy --strict src/frontier/tictactoe.py" stdout="Success" label="mypy --strict still passes" -- Both functions return dict[str, int].
```

## Measure, then change, and onto GitHub

The method from this lesson, for any program that's too slow:

1. **Profile** before changing anything. Your guess at the start of this lesson may have been right, but there was no way to know without measuring.
2. **Read the ncalls column** as well as the times. A function that's called far more often than it should be is a bigger win than one that's slow per call.
3. **Change one thing, and measure again**, with the tests passing before and after.

Memoising is one fix among many. It works when the same question is asked over and over and its answer doesn't change. The next lesson is the other common case: no repeats, just a loop doing a lot of arithmetic in Python, one number at a time.

Commit and push:

```powershell
git add .
git commit -m "Profile count_games, and remember answers with functools.cache"
git push
```

```check
git-clean -- Something isn't committed yet. Run git status to see what.
git-pushed -- Run git push
```

### What you have

```text
src/frontier/
  tictactoe.py           count_games and shared_outcomes cached; outcomes returns a copy
experiments/
  profile_games.py       cProfile on count_games(), the top 8 functions by time
  distinct_positions.py  5,478 different boards
tests/
  test_cache.py          -k counting, outcomes
```

Next lesson: a loop made a hundred times faster, not by doing less work, but by handing all of it to NumPy at once.
