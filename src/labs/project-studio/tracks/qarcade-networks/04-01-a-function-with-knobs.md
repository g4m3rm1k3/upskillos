---
title: 4.1 — A Function with Knobs
track: Q-Arcade — From a Table to a Network
trackOrder: 12.5
runtime: python
run: line.py
---

**Starting a new chapter:** every Q-Arcade chapter uses the same `q-arcade` folder, so your files carry straight on. If the file tree is ever empty, click **Choose folder…** and select `q-arcade`.

### The story so far

Everything so far has kept its knowledge in a **table**: one row per state, one score per action. To decide what to do, the agent finds its state's row and picks the biggest score. To learn, it nudges one score after each move. That worked for the corridor (5 rows), CartPole squashed into 72 rows, and QMaze (100 rows).

Chapters 2 and 3 ended at the same wall: a table looks up a separate row for every state, so it can't generalise, to the CartPole row next door or to a new maze. What's needed instead is a **function**: something that takes the numbers describing a state and *computes* a value from them, so that similar inputs give similar outputs.

A neural network is such a function, and this chapter builds one from nothing. Not by starting with a network, but with the simplest function there is, a straight line, and the two ideas that every network is trained with:

1. **A function with adjustable numbers inside it**, called *parameters*, or here *knobs*. Learning means setting the knobs.
2. **A single number saying how wrong it is**, the *loss*. Setting the knobs well means making the loss small.

This lesson builds both, and finds the right knob settings the slowest possible way, by trying them all, to make the problem the next lesson solves obvious.

### A table and a function, side by side

```text
a table (Chapters 1-3)                     a function (Chapters 4-5)
  input: a row number, 23                    input: numbers describing the state, e.g. QMaze's 100
  looks up row 23                            computes, using its knobs
  output: the 4 scores stored there          output: 4 scores, worked out fresh
  learns by changing row 23 only             learns by turning knobs, which changes the output for EVERY input a little
```

That last line is the point. Turning a knob to fix one example also moves the answers for similar examples, which is generalising. This chapter starts with the smallest function with knobs there is, one input and one output, so every number can be checked by hand.

### How the pieces fit

```text
make_points()              50 examples (x, y): the inputs, and the answers the function should give
predict(w, b, x)           the function: the knobs w and b turn each x into a guess
mse(guesses, answers)      one number: how wrong those guesses are
best_on_a_grid(x, y)       tries 3,721 settings of (w, b) and keeps the one with the smallest mse
```

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_line.py** above.

```python file=tests/test_line.py provided
# Tests for line.py (lesson 4.1).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_line.py
import numpy as np
from pytest import approx


def test_points_follow_a_rule_with_a_little_noise():
    from line import make_points
    x, y = make_points()
    assert x.shape == (50,) and y.shape == (50,)
    assert np.all(np.abs(y - (2 * x + 1)) < 0.5), "close to y = 2x + 1"
    assert np.array_equal(make_points()[1], y), "the same points every time"


def test_predict_is_a_straight_line():
    from line import predict
    assert predict(2.0, 1.0, np.array([0.0, 1.0, -1.5])).tolist() == approx([1.0, 3.0, -2.0])


def test_mse_is_the_average_squared_miss():
    from line import mse
    assert mse(np.array([1.0, 2.0]), np.array([1.0, 4.0])) == approx(2.0), "misses 0 and 2: (0 + 4) / 2"
    assert mse(np.array([3.0, 3.0]), np.array([1.0, 5.0])) == approx(4.0)


def test_mse_returns_a_plain_float():
    from line import mse
    assert type(mse(np.array([1.0]), np.array([2.0]))) is float


def test_mse_is_zero_only_for_a_perfect_fit():
    from line import mse
    assert mse(np.array([1.5, -2.0]), np.array([1.5, -2.0])) == 0.0


def test_grid_finds_the_rule_behind_the_data():
    from line import best_on_a_grid, make_points
    loss, w, b = best_on_a_grid(*make_points())
    assert (w, b) == approx((2.0, 1.0)) and loss < 0.02
```

What each group protects:

| group | it makes sure that… | a bug it would catch |
|---|---|---|
| `points` | there are 50 examples, close to the rule y = 2x + 1, and the same 50 every time | data that changed on every run, so no result could be repeated |
| `predict` | the function really is w × x + b, worked on a whole array at once | `w + x * b`: the knobs swapped |
| `mse` | the loss is the average of the squared misses, a plain `float`, and 0 only when every guess is right | forgetting to square, so a miss of +2 and a miss of −2 cancelled to a perfect 0 |
| `grid` | trying every setting finds w = 2, b = 1, the rule the data was made from | a search that kept the *last* setting tried instead of the best |

`best_on_a_grid(*make_points())`: `make_points()` returns two arrays, `x` and `y`, and the `*` hands them to `best_on_a_grid` as its first two arguments.

The data is **made up on purpose**. It follows a rule you know, y = 2x + 1, plus a little noise, so you can check whether learning found the rule. Real data never tells you its rule; that's why it has to be learned. But to see that a method works, start where you know the answer.

```check
file tests/test_line.py -- Click "Create provided tests/test_line.py" above.
```

## Points that follow a rule

Create `line.py`:

```python file=line.py
import numpy as np


def make_points(n=50, seed=0):
    rng = np.random.default_rng(seed)
    x = rng.uniform(-2.0, 2.0, n)
    y = 2.0 * x + 1.0 + rng.normal(0.0, 0.1, n)
    return x, y
```

- **`rng.uniform(-2.0, 2.0, n)`** gives `n` numbers anywhere between −2 and 2, all equally likely.
- **`rng.normal(0.0, 0.1, n)`** gives `n` numbers from the bell-shaped **normal distribution**, centred on 0 with a **standard deviation** of 0.1 (lesson 2.5): most are within 0.1 of zero, almost all within 0.3. That's the noise, standing in for measurement error.
- **`2.0 * x + 1.0 + …`** works on the whole array at once: NumPy multiplies, adds and adds again for every one of the 50 values. Writing arithmetic on arrays like this, instead of a loop, is called **vectorised** code.

The pairs (x, y) are **examples**: inputs, and the output the function should give for each. Everything this chapter learns is learned from examples like these. In Chapter 5, the inputs are QMaze's 100-number observations and the outputs are Q-values.

```check
run ".venv/Scripts/python -m pytest -q tests/test_line.py -k points" label="make_points makes 50 repeatable points near y = 2x + 1" -- x = rng.uniform(-2.0, 2.0, n); y = 2.0 * x + 1.0 + rng.normal(0.0, 0.1, n).
```

## A straight line

Add the function with knobs:

```python file=line.py
import numpy as np


def make_points(n=50, seed=0):
    rng = np.random.default_rng(seed)
    x = rng.uniform(-2.0, 2.0, n)
    y = 2.0 * x + 1.0 + rng.normal(0.0, 0.1, n)
    return x, y


def predict(w, b, x):
    return w * x + b
```

**`predict`'s inputs, and what it gives back:**

| | what it is | example |
|---|---|---|
| input `w` | the **weight**, a knob: how steep the line is | `2.0` |
| input `b` | the **bias**, a knob: where the line crosses x = 0 | `1.0` |
| input `x` | the inputs, a NumPy array of any length | `np.array([0.0, 1.0, -1.5])` |
| returns | one guess for each input, an array the same length as `x` | `[1.0, 3.0, -2.0]` |

See what the knobs do with a loop, in a scratch file:

```python
import numpy as np

x = np.array([-1.0, 0.0, 1.0, 2.0])
for w, b in [(1.0, 0.0), (2.0, 0.0), (2.0, 1.0), (-1.0, 3.0)]:
    print(f"w = {w:+}, b = {b:+}:", w * x + b)
```

```text
w = +1.0, b = +0.0: [-1.  0.  1.  2.]
w = +2.0, b = +0.0: [-2.  0.  2.  4.]
w = +2.0, b = +1.0: [-1.  1.  3.  5.]
w = -1.0, b = +3.0: [4. 3. 2. 1.]
```

Doubling `w` doubles every step between neighbouring outputs. Adding 1 to `b` lifts every output by 1. A negative `w` makes the line go downhill. Same code, four different functions: the knobs are the only difference.

`predict(w, b, x)` is a straight line. `w` (the **weight**) sets how steep it is: how much the output changes when the input grows by 1. `b` (the **bias**) sets where it crosses x = 0. The two knobs are the line's **parameters**. Every setting of them is a different function, and learning will mean choosing the setting whose predictions match the examples.

These are exactly the names a neural network uses. A network is built out of many little weighted sums like this one, `w × input + b`, and Chapter 5's QMaze network has 20,804 knobs instead of 2. The ideas in this chapter are the same at any size.

```check
run ".venv/Scripts/python -m pytest -q tests/test_line.py -k predict" label="predict(w, b, x) is w times x plus b, for a whole array at once"
```

## Your turn: how wrong is it?

**Build, on your own:** `mse(predictions, targets)` in `line.py`.

To choose between settings, you need one number for how wrong a setting's predictions are. For each example, the **miss** is the prediction minus the target. Square each miss, then take the average. That's the **mean squared error**, the most common loss there is:

```text
predictions:   1.0   2.0
targets:       1.0   4.0
misses:        0.0  -2.0
squared:       0.0   4.0
mean:              2.0
```

Why square? A miss of −2 is as bad as a miss of +2, and squaring makes both 4, so misses in opposite directions can't cancel out. It also makes big misses count far more than small ones: a miss of 3 costs 9, nine times a miss of 1. And, as the next lesson shows, a squared loss is easy to slide downhill on.

Return a plain `float`, as the tests ask: wrap the NumPy result in `float(...)`.

```hints
nudge: Three operations, done to whole arrays: subtract, square, average.
concept: `predictions - targets` gives every miss; `** 2` squares each; `np.mean` averages them.
answer: Add to `line.py`:
~~~python
def mse(predictions, targets):
    return float(np.mean((predictions - targets) ** 2))
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_line.py -k mse" label="mse is the average of the squared misses, as a float" -- return float(np.mean((predictions - targets) ** 2)).
```

## Learning by trying everything

Now find the best knobs the most direct way: try every setting on a grid and keep the best. Make `line.py` this:

```python file=line.py
import numpy as np


def make_points(n=50, seed=0):
    rng = np.random.default_rng(seed)
    x = rng.uniform(-2.0, 2.0, n)
    y = 2.0 * x + 1.0 + rng.normal(0.0, 0.1, n)
    return x, y


def predict(w, b, x):
    return w * x + b


def mse(predictions, targets):
    return float(np.mean((predictions - targets) ** 2))


def best_on_a_grid(x, y, values=np.linspace(-3.0, 3.0, 61)):
    best = None
    for w in values:
        for b in values:
            loss = mse(predict(w, b, x), y)
            if best is None or loss < best[0]:
                best = (loss, float(w), float(b))
    return best


if __name__ == "__main__":
    x, y = make_points()
    for w, b in [(0.0, 0.0), (1.0, 0.0), (2.0, 0.0), (2.0, 1.0)]:
        print(f"w = {w}, b = {b}: loss {mse(predict(w, b, x), y):.4f}")
    loss, w, b = best_on_a_grid(x, y)
    print(f"best of 3,721 tries: w = {w:.1f}, b = {b:.1f}, loss {loss:.4f}")
```

**`best_on_a_grid`'s inputs, and what it gives back:** the examples `x` and `y`, and `values`, the settings to try for each knob. It returns a tuple of three numbers, `(loss, w, b)`: the smallest loss found and the knob settings that gave it. The loss comes first so that the line `loss < best[0]` reads naturally: `best[0]` is the best loss so far.

`np.linspace(-3.0, 3.0, 61)` is the 61 values −3.0, −2.9, … 3.0, so the two loops try 61 × 61 = **3,721** settings and keep the one with the smallest loss. `best is None` is true only on the first try, when there's nothing to compare with yet.

Predict, then press **Run**:

```predict
question: With w = 2 and b = 0 the line has the right slope but crosses at the wrong height. Its loss will be about…
choice: About 0.01, almost perfect
choice: About 1
choice: About 7, as bad as no line at all
answer: About 1
explain: 1.0168. Every prediction is 1 too low (the missing bias), so every miss is about −1, and its square about 1. The noise adds a little: the loss of the true rule itself, w = 2 and b = 1, is 0.0102, which is the noise's own size, 0.1², and can never be beaten. No line at all (w = 0, b = 0) costs 7.0013.
verify: .venv/Scripts/python -c "from line import make_points, mse, predict; x, y = make_points(); l = mse(predict(2.0, 0.0, x), y); print('About 1' if 0.8 < l < 1.2 else l)"
```

```text
w = 0.0, b = 0.0: loss 7.0013
w = 1.0, b = 0.0: loss 2.6384
w = 2.0, b = 0.0: loss 1.0168
w = 2.0, b = 1.0: loss 0.0102
best of 3,721 tries: w = 2.0, b = 1.0, loss 0.0102
```

Trying everything found the rule. **That is learning**, stripped to its definition: search for the parameters that make the loss smallest on the examples.

But count the cost. Each knob's 61 settings must be tried with **every** setting of every other knob, so the counts multiply: 61 × 61 for two knobs, 61 × 61 × 61 for three. It's lesson 2.6's multiplying again:

```python
for knobs in (1, 2, 3, 10):
    print(f"{knobs:2} knobs: {61 ** knobs:,} settings to try")
```

```text
 1 knobs: 61 settings to try
 2 knobs: 3,721 settings to try
 3 knobs: 226,981 settings to try
10 knobs: 713,342,911,662,882,601 settings to try
```

Ten knobs is already about 713 quadrillion tries: 713 followed by 15 zeros. The QMaze network's 20,804 knobs would be 61 to the power 20,804: a number with 37,143 digits. Trying everything is hopeless for any real function. The next lesson finds the best knobs in about 100 steps, by asking, at each setting, **which way is downhill**.

```check
run ".venv/Scripts/python -m pytest -q tests/test_line.py -k grid" label="the grid search finds w = 2 and b = 1"
run ".venv/Scripts/python -m pytest -q tests/test_line.py" label="all lesson 4.1 tests pass"
```

### What you have

A function with knobs (`predict`), a measure of how wrong it is (`mse`), and learning as search (`best_on_a_grid`). Next lesson replaces the search with the method every neural network uses.
