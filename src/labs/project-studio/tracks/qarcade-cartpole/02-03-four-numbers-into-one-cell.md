---
title: 2.3 — Four Numbers into One Cell
runtime: python
---

Chapter 1's agent keeps a table with one row per state, and it finds a row with a number: `Q[state]`. The corridor's states were the numbers 0 to 4. CartPole's state is four decimals, like `[0.013, 0.173, -0.047, -0.355]`, and there are endlessly many of those: the agent will practically never see exactly the same four numbers twice, so a row per state is impossible.

The fix is to stop asking "exactly which state?" and ask "roughly which state?" Cut each number's range into a few **bins** (slots), such as "angle between 0 and 4° to the right", and treat every state in the same combination of slots as the same row. This is called **discretising** the state. This lesson builds it in three small functions: where the cuts go, which slot a number falls in, and how four slot numbers become one row number.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_bins.py** above.

```python file=tests/test_bins.py provided
# Tests for bins.py (lesson 2.3).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_bins.py
import numpy as np
from pytest import approx


def test_edges_split_the_range_evenly():
    from bins import make_edges
    assert make_edges(4, 2.0).tolist() == approx([-1.0, 0.0, 1.0])
    assert make_edges(6, 3.0).tolist() == approx([-2.0, -1.0, 0.0, 1.0, 2.0])


def test_edges_are_one_fewer_than_the_cells():
    from bins import make_edges
    assert len(make_edges(12, 0.21)) == 11


def test_slot_found_between_two_cuts():
    from bins import bin_index
    edges = np.array([-1.0, 0.0, 1.0])
    assert [bin_index(v, edges) for v in (-0.5, 0.5)] == [1, 2]


def test_slot_for_an_edge_value_is_the_one_above():
    from bins import bin_index
    assert bin_index(0.0, np.array([-1.0, 0.0, 1.0])) == 2


def test_slot_catches_values_beyond_the_limits():
    from bins import bin_index
    edges = np.array([-1.0, 0.0, 1.0])
    assert bin_index(-50.0, edges) == 0 and bin_index(50.0, edges) == 3


def test_slot_is_a_plain_int():
    from bins import bin_index
    assert type(bin_index(0.3, np.array([-1.0, 0.0, 1.0]))) is int


def test_index_combines_like_digits():
    from bins import make_edges, state_index
    edges = [make_edges(3, 3.0), make_edges(4, 2.0)]
    assert state_index([2.0, 1.5], edges, (3, 4)) == 2 * 4 + 3


def test_index_gives_every_combination_its_own_number():
    from bins import make_edges, state_index
    edges = [make_edges(2, 1.0), make_edges(3, 3.0)]
    seen = {state_index([a, b], edges, (2, 3)) for a in (-0.5, 0.5) for b in (-2.0, 0.0, 2.0)}
    assert seen == set(range(6))


def test_index_corners_of_the_cartpole_table():
    from bins import COUNTS, LIMITS, make_edges, state_index
    edges = [make_edges(n, limit) for n, limit in zip(COUNTS, LIMITS)]
    assert state_index([-9.0, -9.0, -9.0, -9.0], edges, COUNTS) == 0
    assert state_index([9.0, 9.0, 9.0, 9.0], edges, COUNTS) == 1 * 1 * 6 * 12 - 1


def test_size_of_the_cartpole_table():
    from bins import COUNTS
    assert int(np.prod(COUNTS)) == 72
```

Two words to keep apart: an **edge** is a cut between two slots, and a **slot** (or bin) is the gap between cuts. Three edges make four slots, which is what `test_edges_are_one_fewer_than_the_cells` says for twelve. `.tolist()` turns an array into a plain list, so it can be compared with `approx([...])`.

`test_index_gives_every_combination_its_own_number` is the important property of the last function: with 2 slots for one number and 3 for the other, there are 2 × 3 = 6 combinations, and they must get the 6 row numbers 0 to 5, each exactly once. Two combinations sharing a row would mix up their values; a row number past 5 wouldn't exist in the table.

```check
file tests/test_bins.py -- Click "Create provided tests/test_bins.py" above.
```

## Where the cuts go

Create `bins.py`:

```python file=bins.py
import numpy as np

COUNTS = (1, 1, 6, 12)
LIMITS = (2.4, 3.0, 0.21, 3.5)


def make_edges(count, limit):
    return np.linspace(-limit, limit, count + 1)[1:-1]
```

**`np.linspace(start, stop, n)`** returns `n` evenly spaced numbers from `start` to `stop`, both included. For 6 slots between −3 and 3:

```text
np.linspace(-3, 3, 7)    →  [-3, -2, -1, 0, 1, 2, 3]
                 [1:-1]  →      [-2, -1, 0, 1, 2]
```

Seven numbers mark the boundaries of six equal slots. `[1:-1]` (from position 1 up to, but not including, the last) drops the two outer ones, leaving the five **inner** edges. Dropping them matters: a cart velocity of 5 is beyond the limit of 3, and it must still land in a slot, the last one, instead of falling off the end. The end slots stretch out to infinity.

**`COUNTS`** is how many slots each of the four numbers gets, and **`LIMITS`** is the range they're spread over:

| number | slots | range | each slot is |
|---|---|---|---|
| position | 1 | ±2.4 m (the track) | the whole track |
| velocity | 1 | ±3.0 m/s | every speed |
| angle | 6 | ±0.21 rad (the 12° limit) | 0.07 rad, 4° |
| spin | 12 | ±3.5 rad/s | 0.58 rad/s |

One slot for position and velocity means the table **ignores the cart completely**: every position is the same slot. That's deliberate, for a start. `lean_and_spin` from lesson 2.2 used only the angle and the spin and still reached 500 in 90 of 100 episodes, so those two numbers carry what matters most. Lesson 2.6 measures what happens when the cart gets slots too. The velocity and spin limits aren't hard limits in CartPole. They were chosen from what happens: in 100 random episodes, 99% of spins were between −2.0 and +1.9.

```predict
question: What does `make_edges(4, 2.0)` return?
choice: [-2.0, -1.0, 0.0, 1.0, 2.0]
choice: [-1.0, 0.0, 1.0]
choice: [-1.5, -0.5, 0.5, 1.5]
answer: [-1.0, 0.0, 1.0]
explain: Four slots between −2 and 2 need five boundaries: `np.linspace(-2, 2, 5)` is [−2, −1, 0, 1, 2], one apart. Dropping the outer two leaves the three inner edges, [−1, 0, 1]. The third choice is the four slots' **centres**, which is a different thing.
verify: .venv/Scripts/python -c "from bins import make_edges; print('[-1.0, 0.0, 1.0]' if make_edges(4, 2.0).tolist() == [-1.0, 0.0, 1.0] else make_edges(4, 2.0))"
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_bins.py -k edges" label="make_edges returns the inner cuts of evenly sized slots" -- return np.linspace(-limit, limit, count + 1)[1:-1].
```

## Which slot

Add `bin_index`, which finds the slot a value falls in:

```python file=bins.py
import numpy as np

COUNTS = (1, 1, 6, 12)
LIMITS = (2.4, 3.0, 0.21, 3.5)


def make_edges(count, limit):
    return np.linspace(-limit, limit, count + 1)[1:-1]


def bin_index(value, edges):
    return int(np.digitize(value, edges))
```

**`np.digitize(value, edges)`** counts how many edges are at or below the value. That count *is* the slot number:

```text
edges:          -1          0          1
slots:     0    |     1     |     2    |    3
value -0.5:     1 edge at or below it (-1)                  → slot 1
value  0.5:     2 edges (-1 and 0)                          → slot 2
value  0.0:     2 edges (-1, and 0 itself)                  → slot 2
value -50:      0 edges                                     → slot 0
value  50:      3 edges                                     → slot 3
```

So a value exactly on an edge belongs to the slot **above** it, and anything beyond the outer edges lands in the end slots. NumPy doesn't compare the value with every edge: the edges are sorted, so it can halve the search each time, like looking up a word in a dictionary. With 11 edges that's at most 4 comparisons. With **no** edges, which is what `make_edges(1, ...)` returns for position and velocity, nothing is at or below any value, so every value gets slot 0, exactly what "one slot" should mean.

```check
run ".venv/Scripts/python -m pytest -q tests/test_bins.py -k slot" label="bin_index finds the slot, with edge values going to the slot above" -- return int(np.digitize(value, edges)).
```

## Your turn: four slots, one row number

**Build, on your own:** `state_index(obs, edges, counts)` in `bins.py`.

Now each of the four numbers has a slot: say position slot 0 (of 1), velocity slot 0 (of 1), angle slot 4 (of 6) and spin slot 5 (of 12). The table needs **one** row number for that combination, different from every other combination's.

Numbers already do this every day. Write the slots side by side, like the digits of a number:

```text
digits of 347:   3, 4, 7    each from 10 possibilities    3 × 10 × 10  +  4 × 10  +  7  =  347
a clock 2:05:09  2, 5, 9    minutes and seconds have 60   2 × 60 × 60  +  5 × 60  +  9  =  7509 seconds
```

The rule, from left to right: start at 0, and for each slot, **multiply what you have by that number's slot count, then add the slot**. For 347: 0 × 10 + 3 = 3, then 3 × 10 + 4 = 34, then 34 × 10 + 7 = 347. Every combination gets its own number, and they fill 0 up to (total combinations − 1) with no gaps.

For CartPole's counts (1, 1, 6, 12) and slots (0, 0, 4, 5):

```text
start            0
position (1):    0 × 1  + 0  =  0
velocity (1):    0 × 1  + 0  =  0
angle (6):       0 × 6  + 4  =  4
spin (12):       4 × 12 + 5  =  53     → row 53
```

Write `state_index` so it does this for any number of values: `obs`, `edges` and `counts` are three lists of the same length, one entry per number. `zip(obs, edges, counts)` walks through all three together, giving one `(value, value_edges, count)` at a time. Use `bin_index` for each slot.

```hints
nudge: The rule needs one running number, and one line inside a loop over the three lists.
concept: `index = index * count + bin_index(value, value_edges)` inside `for value, value_edges, count in zip(obs, edges, counts):`, starting from `index = 0`.
answer: Add to `bins.py`:
~~~python
def state_index(obs, edges, counts):
    index = 0
    for value, value_edges, count in zip(obs, edges, counts):
        index = index * count + bin_index(value, value_edges)
    return index
~~~
For the test's `state_index([2.0, 1.5], ..., (3, 4))`: 2.0 is in slot 2 of 3 and 1.5 in slot 3 of 4, so 0 × 3 + 2 = 2, then 2 × 4 + 3 = 11.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_bins.py -k index" label="state_index gives every combination of slots its own row, from 0 to the last" -- index = 0; for each (value, value_edges, count): index = index * count + bin_index(value, value_edges).
```

## How big is the table?

```predict
question: With COUNTS = (1, 1, 6, 12), how many rows will CartPole's Q-table have?
answer: 72
tolerance: 0
explain: One row per combination of slots: 1 × 1 × 6 × 12 = 72. Each row holds two values (push left, push right), so the agent's whole knowledge of CartPole will be 144 numbers. The corner test checks the highest row number is 71: every number in its last slot gives 0, 0, 5 and 11, and 5 × 12 + 11 = 71.
verify: .venv/Scripts/python -c "import numpy as np; from bins import COUNTS; print(int(np.prod(COUNTS)))"
```

72 rows is tiny: the corridor had 5. Each row now stands for a whole **region** of states. Every state with the pole leaning between 0 and 4° right and spinning between 0 and 0.58 rad/s right shares one row, wherever the cart is and however fast it's moving. The agent can't tell them apart, so it must learn one action that works well enough for all of them.

That's the trade-off of discretising, and lesson 2.6 measures it. Fewer, bigger slots mean fewer rows to learn, and each row gets more experience, but the states sharing a row may need different actions. More, smaller slots tell states apart, but each row is visited less often, so it learns more slowly.

```check
run ".venv/Scripts/python -m pytest -q tests/test_bins.py -k size" label="the CartPole table has 72 rows"
run ".venv/Scripts/python -m pytest -q tests/test_bins.py" label="all lesson 2.3 tests pass"
```

### What you have

A way to turn CartPole's four decimals into a row number from 0 to 71: cuts (`make_edges`), slots (`bin_index`), and one number for the combination (`state_index`). Next lesson wraps CartPole so it hands out row numbers, and Chapter 1's agent learns to balance it.
