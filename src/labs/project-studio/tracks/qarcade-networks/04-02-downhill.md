---
title: 4.2 — Downhill
runtime: python
run: downhill.py
---

Trying every setting took 3,721 tries for two knobs and is hopeless for more. The method every neural network actually uses is far cleverer, and it rests on one question you can ask at any setting of the knobs: **if I turn this knob a tiny bit, does the loss go up or down, and how fast?** That rate is the knob's **gradient**, its slope. Knowing it, you can turn every knob a little in the downhill direction, ask again, and repeat. That's **gradient descent**.

This lesson measures the slope by nudging, then works out the exact formula and checks it against the measurement, then walks downhill and finds the line in 100 steps. It also finds out what happens when the steps are too big.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_downhill.py** above.

```python file=tests/test_downhill.py provided
# Tests for downhill.py (lesson 4.2).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_downhill.py
import numpy as np
from pytest import approx


def test_nudged_slope_of_a_simple_case():
    from downhill import nudged_gradient
    x, y = np.array([1.0]), np.array([3.0])
    dw, db = nudged_gradient(0.0, 0.0, x, y)
    assert dw == approx(-6.0, abs=1e-4) and db == approx(-6.0, abs=1e-4), "loss (w + b - 3)^2 slopes by -6 at 0, 0"


def test_exact_gradient_matches_nudging():
    from downhill import gradient, nudged_gradient
    from line import make_points
    x, y = make_points()
    for w, b in [(0.0, 0.0), (1.5, -0.5), (2.0, 1.0)]:
        assert gradient(w, b, x, y) == approx(nudged_gradient(w, b, x, y), abs=1e-4)


def test_exact_gradient_is_zero_at_the_bottom():
    from downhill import gradient
    x = np.array([0.0, 1.0, 2.0])
    assert gradient(2.0, 1.0, x, 2 * x + 1) == approx((0.0, 0.0))


def test_exact_gradient_returns_plain_floats():
    from downhill import gradient
    assert all(type(g) is float for g in gradient(0.0, 0.0, np.array([1.0]), np.array([2.0])))


def test_descend_finds_the_rule():
    from downhill import descend
    from line import make_points
    w, b, losses = descend(*make_points())
    assert (w, b) == approx((2.0, 1.0), abs=0.05) and len(losses) == 100
    assert losses[-1] < losses[0] / 100


def test_descend_with_too_big_a_step_blows_up():
    from downhill import descend
    from line import make_points
    _, _, losses = descend(*make_points(), rate=0.9)
    assert losses[-1] > losses[0] * 1000
```

`test_exact_gradient_matches_nudging` is the important idea: two completely different ways of getting the slope, one by measuring and one by algebra, must agree. Checking a formula against a measurement like this is called a **gradient check**, and it's how people who write neural network code catch their mistakes. The next lesson does it again, for a whole network.

```check
file tests/test_downhill.py -- Click "Create provided tests/test_downhill.py" above.
```

## Which way is downhill?

Create `downhill.py`:

```python file=downhill.py
import numpy as np

from line import make_points, mse, predict


def nudged_gradient(w, b, x, y, h=1e-6):
    loss = mse(predict(w, b, x), y)
    dw = (mse(predict(w + h, b, x), y) - loss) / h
    db = (mse(predict(w, b + h, x), y) - loss) / h
    return dw, db
```

To find the slope for `w`: work out the loss, then nudge `w` by a tiny `h` (10⁻⁶, a millionth), work out the loss again, and divide the change by the size of the nudge. That's "rise over run", the slope you learned for a straight line on a graph, measured over a run too small to see. The same again for `b`, nudging only `b`.

Worked by hand for the first test: one example, x = 1, y = 3, at w = 0, b = 0. The prediction is 0, the miss is −3, the loss is 9. Nudge w to 0.000001: the prediction is 0.000001, the loss (0.000001 − 3)² = 8.999994. The change is −0.000006, and divided by the nudge, 0.000001, that's **−6**. Negative means **increasing w decreases the loss**: downhill is towards bigger w. Which is right, since the line must rise to reach 3.

**Why not just use nudging for everything?** It costs one extra loss calculation **per knob**. For 2 knobs that's nothing. For QMaze's 20,804 knobs it's 20,805 passes over all the data for every single step downhill. And the answer is slightly off, because `h` isn't truly zero. Next step: the exact slope for all knobs at once, from a formula.

```check
run ".venv/Scripts/python -m pytest -q tests/test_downhill.py -k nudged" label="nudged_gradient measures each knob's slope by nudging it" -- For each knob: (loss with the knob nudged by h - loss) / h.
```

## Your turn: the slope by formula

**Build, on your own:** `gradient(w, b, x, y)` in `downhill.py`, returning the exact slopes `(dw, db)` as plain floats.

Here's the algebra. Start with **one** example. Its loss is the squared miss:

```text
loss = e²        where the miss  e = w·x + b − y
```

A square changes at twice the size of what's being squared: if e grows by a tiny amount, e² grows by 2e times that amount. (For e = −3, as above: e² = 9 changes at 2 × −3 = −6 per unit of e.) So the question becomes how fast e changes when you turn each knob:

- Turning **w** by a tiny amount changes `w·x` by **x** times that amount, so e changes at rate x. Together: **d loss / d w = 2e · x**.
- Turning **b** by a tiny amount changes e by exactly that amount, rate 1: **d loss / d b = 2e**.

This "rate of the outside times rate of the inside" is called the **chain rule**, and it's the whole of the mathematics behind training neural networks. Next lesson uses it through two layers.

The loss you're minimising is the **mean** over all examples, and the slope of an average is the average of the slopes. So:

```text
dw = mean of 2 · e · x        db = mean of 2 · e        over all the examples
```

With NumPy, `error = predict(w, b, x) - y` gives every example's e at once.

```hints
nudge: Compute every miss with one line. Then each slope is one np.mean.
concept: `error = predict(w, b, x) - y`; `dw = np.mean(2 * error * x)`; `db = np.mean(2 * error)`. Wrap each in float(...).
answer: Add to `downhill.py`:
~~~python
def gradient(w, b, x, y):
    error = predict(w, b, x) - y
    return float(np.mean(2 * error * x)), float(np.mean(2 * error))
~~~
For the hand-worked case (x = 1, y = 3, w = b = 0): error is −3, so dw = 2 × −3 × 1 = −6 and db = 2 × −3 = −6, as measured by nudging.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_downhill.py -k exact" label="your formula's slopes match nudging, and are zero at the bottom" -- error = predict(w, b, x) - y; return float(np.mean(2 * error * x)), float(np.mean(2 * error)).
```

## Going downhill

Make `downhill.py` this:

```python file=downhill.py
import numpy as np

from line import make_points, mse, predict


def nudged_gradient(w, b, x, y, h=1e-6):
    loss = mse(predict(w, b, x), y)
    dw = (mse(predict(w + h, b, x), y) - loss) / h
    db = (mse(predict(w, b + h, x), y) - loss) / h
    return dw, db


def gradient(w, b, x, y):
    error = predict(w, b, x) - y
    return float(np.mean(2 * error * x)), float(np.mean(2 * error))


def descend(x, y, rate=0.1, steps=100):
    w, b = 0.0, 0.0
    losses = []
    for _ in range(steps):
        dw, db = gradient(w, b, x, y)
        w -= rate * dw
        b -= rate * db
        losses.append(mse(predict(w, b, x), y))
    return w, b, losses


if __name__ == "__main__":
    x, y = make_points()
    print("at w = 0, b = 0:  nudged", np.round(nudged_gradient(0.0, 0.0, x, y), 4), " exact", np.round(gradient(0.0, 0.0, x, y), 4))
    for rate in (0.01, 0.1, 0.5, 0.7):
        w, b, losses = descend(x, y, rate)
        print(f"rate {rate}: w = {w:.3f}, b = {b:.3f}, loss after 1, 10, 100 steps: {losses[0]:.3g}, {losses[9]:.3g}, {losses[-1]:.3g}")
```

**`descend`** is gradient descent. Start the knobs at 0. Every step: get the slopes, then move each knob **against** its slope (`w -= rate * dw`). If the slope is negative, turning the knob up lowers the loss, and subtracting a negative number turns it up. **`rate`**, the **learning rate**, says how far to move per unit of slope.

It's lesson 1.3's `nudge` in a new form. There, an estimate moved a fraction α of the way towards a target. Here, each knob moves a fraction (the rate) of its slope downhill. Both are small steps in the right direction, repeated.

Predict, then press **Run**:

```predict
question: With the learning rate 0.1, after 100 steps, what will w be (to 1 decimal place)?
answer: 2.0
tolerance: 0.05
explain: 2.013, with b = 1.002: the rule behind the data, found in 100 steps instead of 3,721 tries. It's not exactly 2 because of the noise: with these 50 particular points, w = 2.013 really does fit slightly better than w = 2. The loss, 0.00993, is a little below the true rule's 0.0102. Learning finds the best fit to the examples it was given, not the rule behind them.
verify: .venv/Scripts/python -c "from downhill import descend; from line import make_points; print(round(descend(*make_points())[0], 1))"
```

```text
at w = 0, b = 0:  nudged [-5.7336 -2.436 ]  exact [-5.7336 -2.436 ]
rate 0.01: w = 1.905, b = 0.908, loss after 1, 10, 100 steps: 6.62, 3.99, 0.037
rate 0.1: w = 2.013, b = 1.002, loss after 1, 10, 100 steps: 3.66, 0.0221, 0.00993
rate 0.5: w = 2.013, b = 1.002, loss after 1, 10, 100 steps: 1.1, 0.00993, 0.00993
rate 0.7: w = 1.980, b = 0.993, loss after 1, 10, 100 steps: 6.29, 2.97, 0.0116
```

**The learning rate decides everything.** 0.01 is too timid: after 100 steps it's still on the way. 0.1 and 0.5 arrive. At 0.7 something strange happens: the loss after one step (6.29) is **worse** than at 0.1 and 10 steps later is still 2.97. Each step overshoots the bottom and lands on the far side of the valley, slightly lower than it started, so it zig-zags down slowly.

```predict
question: What happens with a learning rate of 0.9?
choice: It arrives faster than 0.5
choice: It zig-zags slowly, like 0.7
choice: It gets worse and worse, without limit
answer: It gets worse and worse, without limit
explain: Each step now overshoots so far that it lands **higher** up the other side than it started, and the next step, being proportional to the (now bigger) slope, overshoots further still. After 100 steps the loss is about 10³⁷. The loss even rises for 0.8 (about 10¹⁹). This is called **divergence**, and it's one of the first things to suspect when a network's loss suddenly explodes or becomes `nan` ("not a number": what a computer gets when numbers grow too large to store). The usual cure is a smaller learning rate.
verify: .venv/Scripts/python -c "from downhill import descend; from line import make_points; l = descend(*make_points(), rate=0.9)[2]; print('It gets worse and worse, without limit' if l[-1] > 1e30 else l[-1])"
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_downhill.py -k descend" label="descend finds w = 2 and b = 1, and blows up with too big a step" -- Each step: get the gradient, then w -= rate * dw and b -= rate * db; record the loss after the step.
run ".venv/Scripts/python -m pytest -q tests/test_downhill.py" label="all lesson 4.2 tests pass"
```

### What you have

The slope of the loss, measured by nudging and computed exactly by the chain rule (and checked to agree), and gradient descent with its one crucial setting, the learning rate. Next lesson: a function that a straight line can't fit, and a network with a hidden layer that can.
