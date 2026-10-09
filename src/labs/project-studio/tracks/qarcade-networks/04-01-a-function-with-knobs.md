---
title: 4.1 — A Function with Knobs
track: Q-Arcade — From a Table to a Network
trackOrder: 12.5
runtime: python
run: line.py
---

**Starting a new chapter:** every Q-Arcade chapter uses the same `q-arcade` folder, so your files carry straight on. If the file tree is ever empty, click **Choose folder…** and select `q-arcade`.

Chapters 2 and 3 ended at the same wall: a table looks up a separate row for every state, so it can't generalise, to the CartPole row next door or to a new maze. What's needed instead is a **function**: something that takes the numbers describing a state and *computes* a value from them, so that similar inputs give similar outputs.

A neural network is such a function, and this chapter builds one from nothing. Not by starting with a network, but with the simplest function there is, a straight line, and the two ideas that every network is trained with:

1. **A function with adjustable numbers inside it**, called *parameters*, or here *knobs*. Learning means setting the knobs.
2. **A single number saying how wrong it is**, the *loss*. Setting the knobs well means making the loss small.

This lesson builds both, and finds the right knob settings the slowest possible way, by trying them all, to make the problem the next lesson solves obvious.

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

But count the cost. Two knobs at 61 settings each was 3,721 tries. Three knobs would be 61³ = 226,981. The QMaze network's 20,804 knobs would be 61 to the power 20,804: a number with over 37,000 digits. Trying everything is hopeless for any real function. The next lesson finds the best knobs in about 100 steps, by asking, at each setting, **which way is downhill**.

```check
run ".venv/Scripts/python -m pytest -q tests/test_line.py -k grid" label="the grid search finds w = 2 and b = 1"
run ".venv/Scripts/python -m pytest -q tests/test_line.py" label="all lesson 4.1 tests pass"
```

### What you have

A function with knobs (`predict`), a measure of how wrong it is (`mse`), and learning as search (`best_on_a_grid`). Next lesson replaces the search with the method every neural network uses.
