---
title: 1.2 — The Q-table
runtime: python
---

When you played the corridor, you decided each move by thinking ahead: "the treasure is three steps right, the coin is one step left, the treasure is worth more". An agent can't think ahead like that at first. It has never seen the corridor. Instead, it keeps a **score** for every choice it could make, and improves those scores from experience.

The score has a precise meaning. **Q(s, a)** (the *quality* of action `a` in state `s`) is:

> the total reward the agent expects to collect from now until the episode ends, if it takes action `a` in state `s` and then carries on choosing well.

In the corridor, standing in cell 3 and stepping right reaches the treasure, so Q(3, right) should end up close to 1. Standing in cell 1 and stepping left takes the coin, so Q(1, left) should end up 0.1. Q-learning is a way of discovering all of these numbers without being told them.

There are 5 states and 2 actions, so there are 10 numbers to keep: a **table** with one row per state and one column per action. This lesson builds that table, and the rule for reading the best action out of it.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_qtable.py** above.

```python file=tests/test_qtable.py provided
# Tests for qtable.py (lesson 1.2).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_qtable.py
import numpy as np


def test_shape_has_a_row_per_state_and_a_column_per_action():
    from qtable import make_table
    Q = make_table(5, 2)
    assert Q.shape == (5, 2)
    assert (Q == 0).all() and Q.dtype == np.float64


def test_shape_cells_can_be_written_one_at_a_time():
    from qtable import make_table
    Q = make_table(5, 2)
    Q[3, 1] = 0.5
    assert Q.sum() == 0.5 and Q[3].tolist() == [0.0, 0.5]


def test_greedy_picks_the_biggest_value():
    from qtable import greedy
    rng = np.random.default_rng(0)
    assert greedy(np.array([0.1, 0.8]), rng) == 1
    assert greedy(np.array([0.3, -0.2, 0.1]), rng) == 0


def test_greedy_returns_a_plain_int():
    from qtable import greedy
    assert type(greedy(np.array([0.1, 0.8]), np.random.default_rng(0))) is int


def test_greedy_breaks_ties_at_random():
    from qtable import greedy
    rng = np.random.default_rng(0)
    picks = [greedy(np.array([0.0, 0.0]), rng) for _ in range(200)]
    assert 60 < picks.count(0) < 140, "each tied action should be picked about half the time"


def test_greedy_ties_only_among_the_best():
    from qtable import greedy
    rng = np.random.default_rng(0)
    picks = {greedy(np.array([0.5, 0.1, 0.5]), rng) for _ in range(100)}
    assert picks == {0, 2}
```

Two new things here, both from **NumPy**, the package for arrays of numbers you installed in lesson 0.1:

- `np.array([0.1, 0.8])` makes a NumPy array from a list. `(Q == 0).all()` compares every number in `Q` with 0 at once and asks whether all of the answers were `True`.
- `np.random.default_rng(0)` makes a **random number generator**, explained in the last step.

`test_greedy_breaks_ties_at_random` is a test about randomness. It can't demand an exact answer, so it asks for a range: in 200 picks between two tied actions, action 0 should come up between 61 and 139 times. A fair choice lands outside that range far less often than once in a million runs, so a correct `greedy` passes every time, and one that always picks the same action fails every time.

```check
file tests/test_qtable.py -- Click "Create provided tests/test_qtable.py" above.
```

## A table of zeros

With plain Python, a table is a list of lists. Try it in the terminal. Type `.venv\Scripts\python` to start Python, then:

```python
>>> table = [[0.0, 0.0] for _ in range(5)]
>>> table[3][1] = 0.5
>>> table
[[0.0, 0.0], [0.0, 0.0], [0.0, 0.0], [0.0, 0.5], [0.0, 0.0]]
```

`table[3]` is row 3 (a list), and `table[3][1]` is column 1 of it. This works, but every number is a separate Python object somewhere in memory, and the lists only hold references to them. The later chapters need tables with thousands of rows, and operations on whole rows at once, which is what NumPy is for. Type `exit()` to leave Python.

Create `qtable.py`:

```python file=qtable.py
import numpy as np


def make_table(n_states, n_actions):
    return np.zeros((n_states, n_actions))
```

- **`np.zeros((5, 2))`** makes an **array** of 5 rows and 2 columns, every value 0.0. The argument is a tuple, `(rows, columns)`, called the array's **shape**. `Q.shape` gives it back.
- **How a NumPy array is stored.** Unlike the list of lists, it's one solid block of memory holding the ten numbers side by side, row after row, each as a raw 8-byte floating-point number (`dtype` `float64`). To find `Q[3, 1]`, NumPy doesn't follow any references: it computes the position, row 3 × 2 columns + column 1 = position 7, and reads 8 bytes from there. That's why array operations are fast, and why every number in one array has the same type.
- **`Q[3, 1]`** is row 3, column 1: one number. **`Q[3]`** is all of row 3: a smaller array of 2 numbers. It's a **view**, not a copy: it points into the same memory, so `Q[3][1] = 0.5` and `Q[3, 1] = 0.5` change the same number.

In the agent's table, row `s` holds the scores of every action in state `s`, so **`Q[state]` is "everything the agent believes about this state"**, and `Q[state, action]` is one belief.

```predict
question: After `Q = make_table(5, 2)` and `Q[3, 1] = 0.5`, what is `Q[3]`?
choice: [0.5, 0.5]
choice: [0.0, 0.5]
choice: [0.5, 0.0]
answer: [0.0, 0.5]
explain: Row 3 holds two numbers, one per action. Only column 1 (the second, RIGHT) was set, so the row is `[0.0, 0.5]`: "in cell 3, stepping right is worth 0.5; stepping left, as far as I know, 0". Python prints it as `array([0. , 0.5])`, NumPy's way of showing an array.
verify: .venv/Scripts/python -c "from qtable import make_table; Q = make_table(5, 2); Q[3, 1] = 0.5; print('[0.0, 0.5]' if Q[3].tolist() == [0.0, 0.5] else Q[3])"
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_qtable.py -k shape" label="make_table makes a states-by-actions table of zeros" -- return np.zeros((n_states, n_actions)).
```

## The best action

Once the table holds good scores, choosing well is simple: in state `s`, take the action with the biggest score in row `s`. Taking the action that looks best right now is called acting **greedily**. Add `greedy`:

```python file=qtable.py
import numpy as np


def make_table(n_states, n_actions):
    return np.zeros((n_states, n_actions))


def greedy(row, rng):
    return int(np.argmax(row))
```

- **`np.argmax(row)`** returns the **position** of the biggest value, not the value itself. For `[0.1, 0.8]` the biggest is 0.8, at position 1, so it returns 1: RIGHT. "Arg" is short for argument: the input that gives the maximum.
- **`int(...)`**: `np.argmax` returns a NumPy integer type, `np.int64`. It behaves like a number, but the rest of the series passes actions to code that expects ordinary Python numbers, so `greedy` converts it. `test_greedy_returns_a_plain_int` checks this.
- **`rng`** isn't used yet. The next step needs it.

```predict
question: A brand-new agent's table is all zeros. In cell 1, `np.argmax([0.0, 0.0])` returns what?
choice: 0 (LEFT), every time
choice: 1 (RIGHT), every time
choice: 0 or 1, at random
answer: 0 (LEFT), every time
explain: When several values tie for the biggest, `argmax` returns the **first** of them. NumPy scans the row from position 0 and only moves its answer when it finds something strictly bigger. So a new agent that acts greedily always steps left, always takes the coin, and gets 0.1, which makes LEFT look better than the 0 that RIGHT still has, so it steps left again, forever. It never even finds out that the treasure exists. Ties are everywhere at the start of learning, so how they're broken matters.
verify: .venv/Scripts/python -c "import numpy as np; print('0 (LEFT), every time' if {int(np.argmax(np.zeros(2))) for _ in range(50)} == {0} else 'no')"
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_qtable.py -k greedy_picks" label="greedy picks the action with the biggest value" -- return int(np.argmax(row)).
```

## Your turn: break ties at random

**Build, on your own:** make `greedy` choose randomly among the tied best actions.

First, the random number generator the tests pass in. `rng = np.random.default_rng(0)` makes an object that produces random numbers, starting from the **seed** 0. Random numbers in a computer are computed: a generator holds some internal numbers, and every request scrambles them by a fixed recipe and hands out part of the result. The same seed gives the same starting numbers, so the same sequence every time. Two of its methods:

- `rng.choice(array)` returns one item from the array, each equally likely.
- `rng.integers(n)` returns a whole number from 0 up to, but not including, `n`.

Passing `rng` in, instead of using one generator hidden inside `greedy`, means the caller decides the seed. An agent made with seed 0 then behaves identically every run, which is what makes an experiment repeatable and a bug reproducible.

Now the task. Change `greedy(row, rng)` so that:

1. it finds **every** position whose value equals the biggest value in the row, and
2. returns one of those positions, chosen with `rng`, as a plain `int`.

Two NumPy tools you'll need: `row.max()` is the biggest value in the row. `row == row.max()` compares every value with it, giving an array of `True`/`False`, one per position. And `np.flatnonzero(that)` returns the positions where it's `True`. Try them in the terminal first (`.venv\Scripts\python`, then `import numpy as np`).

```hints
nudge: What does `row == row.max()` give for `np.array([0.5, 0.1, 0.5])`?
concept: `row == row.max()` is `[True, False, True]`, and `np.flatnonzero` of that is `[0, 2]`: the positions of the best actions. `rng.choice([0, 2])` picks one of them, each with probability one half.
shape: Two lines: find the positions of the best values; return `int(rng.choice(...))` of them.
answer: `greedy` becomes:
~~~python
def greedy(row, rng):
    best = np.flatnonzero(row == row.max())
    return int(rng.choice(best))
~~~
With one clear best action, `best` has a single position, so `rng.choice` must return it: random tie-breaking changes nothing when there's no tie.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_qtable.py -k greedy" label="greedy breaks ties at random, among the best actions only" -- best = np.flatnonzero(row == row.max()); return int(rng.choice(best)).
run ".venv/Scripts/python -m pytest -q tests/test_qtable.py" label="all lesson 1.2 tests pass"
```

### What you have

A table of beliefs, `Q[state, action]`, and a way to act on them, `greedy`. The table is all zeros, so the agent believes nothing yet. Next lesson: the rule that changes one number in the table after every step. It's the heart of Q-learning, and you'll follow it by hand.
