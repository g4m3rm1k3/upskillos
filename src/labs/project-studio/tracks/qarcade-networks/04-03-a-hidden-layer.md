---
title: 4.3 — A Hidden Layer
runtime: python
run: tiny_net.py
---

### The story so far

Lesson 4.1 made a function with two knobs, the straight line `w * x + b`, and a loss, `mse`, saying how wrong its guesses are. Lesson 4.2 found the knobs by **gradient descent**: work out each knob's slope (how fast the loss changes when the knob turns), step every knob a little against its slope, repeat. The slopes came from the **chain rule**: for a calculation done in stages, multiply the rates of each stage. And a **gradient check** confirmed the formula by comparing it with nudging each knob and measuring.

### What this lesson asks

A straight line can only ever be a straight line. Q-values aren't straight lines: in QMaze, the value of a cell rises steeply near the cheese, falls off behind walls, and changes direction with every turn of the route. This lesson gives the function the ability to **bend**.

The trick is surprisingly small. Take many straight lines, **bend each one** at a point (clip it so it can't go below zero), and add them up with weights. The result can follow almost any curve. Those bent lines are a network's **hidden layer**, and adding them up is its **output layer**. You'll build both in NumPy, work out the slopes for every knob with the chain rule (that's **backpropagation**), check them against nudging, and train it.

### How the pieces fit

```text
forward (left to right): compute the guess
   x  ──W1, b1──>  z  ──relu──>  h  ──W2, b2──>  out  ──compare with y──>  loss
   inputs          each unit's   each unit's     the weighted sum
                   straight line  bent line       of the bent lines

backward (right to left): compute every knob's slope, one stage at a time
   W1, b1  <──  d_z  <──through relu──  d_h  <──  d_out  <──  loss
                                         W2, b2 <──┘
```

`train` repeats forward, backward, step, 3,000 times: lesson 4.2's `descend`, for four groups of knobs.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_tiny_net.py** above.

```python file=tests/test_tiny_net.py provided
# Tests for tiny_net.py (lesson 4.3).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_tiny_net.py
import numpy as np
from pytest import approx


def test_relu_keeps_positives_and_zeroes_negatives():
    from tiny_net import relu
    assert relu(np.array([-2.0, 0.0, 3.0])).tolist() == [0.0, 0.0, 3.0]


def test_shapes_of_the_weights():
    from tiny_net import init
    params = init(hidden=5)
    assert {name: value.shape for name, value in params.items()} == {"W1": (1, 5), "b1": (5,), "W2": (5, 1), "b2": (1,)}


def test_forward_with_weights_set_by_hand():
    from tiny_net import forward
    params = {"W1": np.array([[1.0, -1.0]]), "b1": np.array([0.0, 0.0]),
              "W2": np.array([[2.0], [3.0]]), "b2": np.array([0.5])}
    out, _ = forward(params, np.array([1.0, -2.0]))
    assert out.tolist() == approx([2.5, 6.5]), "x=1: relu(1)*2 + relu(-1)*3 + 0.5; x=-2: relu(-2)*2 + relu(2)*3 + 0.5"


def test_forward_gives_one_output_per_input():
    from tiny_net import forward, init
    out, (X, z, h) = forward(init(hidden=8), np.linspace(-1, 1, 7))
    assert out.shape == (7,) and z.shape == (7, 8) and h.shape == (7, 8)


def test_backprop_matches_nudging():
    from tiny_net import backward, init, loss, make_curve
    x, y = make_curve()
    params = init(hidden=4)
    grads = backward(params, x, y)
    h = 1e-6
    for name in params:
        for index in np.ndindex(params[name].shape):
            old = params[name][index]
            base = loss(params, x, y)
            params[name][index] = old + h
            nudged = (loss(params, x, y) - base) / h
            params[name][index] = old
            assert grads[name][index] == approx(nudged, abs=1e-4), f"{name}{index}"


def test_backprop_trains_a_curve_a_line_cannot_fit():
    from downhill import descend
    from tiny_net import make_curve, train
    x, y = make_curve()
    _, _, line_losses = descend(x, y, steps=1000)
    _, losses = train(x, y)
    assert line_losses[-1] > 1.0 and losses[-1] < 0.02
```

What each group protects:

| group | it makes sure that… | a bug it would catch |
|---|---|---|
| `relu` | negative numbers become 0 and the rest pass unchanged | `np.max` instead of `np.maximum`: one number for the whole array instead of one per element |
| `shapes` | the four knob arrays have the shapes the matrix multiplications need | `W1` made (hidden, 1) instead of (1, hidden), which fails with a confusing error later |
| `forward` | a tiny network with hand-chosen weights gives the answers you can work out in your head, and every input gets one output | forgetting the bend, so the network was a straight line again |
| `backprop` | every single knob's slope matches nudging, and training fits the U shape that a straight line can't | a slope with a missing transpose: the shapes might still work out, and only the check would show it |

`test_forward_with_weights_set_by_hand` uses a network of two hidden units with weights chosen so you can do it in your head; its message is the arithmetic. `test_backprop_matches_nudging` is last lesson's gradient check, done for every single weight of a 4-unit network: `np.ndindex(shape)` loops over every position in an array of that shape, `(0, 0)`, `(0, 1)` and so on.

```check
file tests/test_tiny_net.py -- Click "Create provided tests/test_tiny_net.py" above.
```

## A curve, and a bend

Create `tiny_net.py`:

```python file=tiny_net.py
import numpy as np


def make_curve(n=64, seed=0):
    rng = np.random.default_rng(seed)
    x = rng.uniform(-2.0, 2.0, n)
    y = x ** 2 + rng.normal(0.0, 0.05, n)
    return x, y


def relu(z):
    return np.maximum(z, 0.0)


def init(hidden=16, seed=0):
    rng = np.random.default_rng(seed)
    return {
        "W1": rng.normal(0.0, 1.0, (1, hidden)),
        "b1": np.zeros(hidden),
        "W2": rng.normal(0.0, 1.0 / np.sqrt(hidden), (hidden, 1)),
        "b2": np.zeros(1),
    }
```

- **The data** is now y = x², a parabola, a U shape. The best straight line through a U is flat, and misses badly at both ends and the middle: lesson 4.2's `descend` on this data ends with a loss of 1.514.
- **`relu(z)`**, the *rectified linear unit*, is the bend: `np.maximum(z, 0.0)` keeps positive numbers and turns negative ones into 0, element by element. Applied to a straight line `w·x + b`, it gives a line that's flat at 0 on one side of a point and rises on the other: a hockey stick. Try it, and see how two bends make a shape no straight line can:

  ```python
  import numpy as np

  x = np.array([-2.0, -1.0, 0.0, 1.0, 2.0])
  print("relu(x - 1):           ", np.maximum(x - 1, 0.0))
  print("relu(x) + relu(-x):    ", np.maximum(x, 0.0) + np.maximum(-x, 0.0))
  ```

  ```text
  relu(x - 1):            [0. 0. 0. 0. 1.]
  relu(x) + relu(-x):     [2. 1. 0. 1. 2.]
  ```

  The first is a hockey stick: flat at 0 until x = 1, then rising. The second adds a hockey stick rising to the right and one rising to the left, and gets a V: down, then up. That's already the start of a U. More units, bending at different points with different weights, smooth the V into a curve.
- **`init`** makes the knobs. Now there are four groups of them, stored by name in a dictionary:

| name | shape | what it is |
|---|---|---|
| `W1` | (1, hidden) | one weight per hidden unit: the slope of each unit's line |
| `b1` | (hidden,) | one bias per hidden unit: where each line crosses, so where it bends |
| `W2` | (hidden, 1) | how much of each bent line goes into the output |
| `b2` | (1,) | the output's own bias |

**Why random starting weights?** If every hidden unit started with the same weights, every unit would compute the same thing, get the same slope, and change in the same way, forever. Measured: started at 0.5 everywhere, the 16 units are still identical after 3,000 steps of training, and the network is no better than one unit (loss 1.106). Started at **zero**, it's worse: the slopes for `W1` are always zero (they're multiplied by `W2`, which is zero), so the network only ever learns `b2`, the average of y, loss 1.537. Random weights make the units different from the start. Scaling `W2`'s randomness by 1/√hidden keeps the sum of many units from starting out huge.

```check
run ".venv/Scripts/python -m pytest -q tests/test_tiny_net.py -k relu" label="relu zeroes negative numbers and keeps the rest"
run ".venv/Scripts/python -m pytest -q tests/test_tiny_net.py -k shapes" label="init makes W1, b1, W2 and b2 with the right shapes"
```

## Your turn: the forward pass

**Build, on your own:** `forward(params, x)` in `tiny_net.py`.

The **forward pass** computes the network's output from its input. With `x` an array of n inputs, it does three things, all with matrices so that every input and every unit is handled at once:

```text
X   = x as one column                      shape (n, 1)
z   = X @ W1 + b1                          shape (n, hidden)    every unit's straight line, for every input
h   = relu(z)                              shape (n, hidden)    bent
out = h @ W2 + b2                          shape (n, 1)         the weighted sum of the bent lines
```

**See `@` on the hand test's numbers**: two inputs, 1 and −2, and two units with weights 1 and −1:

```python
import numpy as np

X = np.array([[1.0], [-2.0]])          # shape (2, 1): two inputs, as a column
W1 = np.array([[1.0, -1.0]])           # shape (1, 2): one weight per unit
print((X @ W1).shape)
print(X @ W1)
```

```text
(2, 2)
[[ 1. -1.]
 [-2.  2.]]
```

Row 0 is input 1 times each unit's weight; row 1 is input −2 times each. One row per input, one column per unit.

- **`@`** is matrix multiplication. For `X @ W1`, an (n, 1) array times a (1, hidden) one, each entry of the result is x times one unit's weight: row i, column j is `x[i] * W1[0, j]`. For `h @ W2`, an (n, hidden) times a (hidden, 1), each row's result is the sum over all units of `h[i, j] * W2[j, 0]`: one weighted sum per input. The rule: the inner sizes must match (1 and 1, hidden and hidden), and the result has the outer sizes.
- **`+ b1`** adds a (hidden,) array to an (n, hidden) one. NumPy **broadcasts**: it adds the same row of biases to every one of the n rows.
- **`x.reshape(-1, 1)`** turns the n inputs into one column, shape (n, 1).

Return two things: the outputs as a flat array of n values, `out[:, 0]` (column 0, every row), and a tuple of the in-between results `(X, z, h)`, which the next step needs.

Check yourself against the hand test: units with weights 1 and −1 and no biases, output weights 2 and 3, output bias 0.5. For x = 1: z = [1, −1], h = [1, 0], out = 1·2 + 0·3 + 0.5 = **2.5**. For x = −2: z = [−2, 2], h = [0, 2], out = 0·2 + 2·3 + 0.5 = **6.5**.

```hints
nudge: Four lines: the column, the lines, the bend, the sum. Then return two things.
concept: `X = x.reshape(-1, 1)`, `z = X @ params["W1"] + params["b1"]`, `h = relu(z)`, `out = h @ params["W2"] + params["b2"]`, then `return out[:, 0], (X, z, h)`.
answer: Add to `tiny_net.py`:
~~~python
def forward(params, x):
    X = x.reshape(-1, 1)
    z = X @ params["W1"] + params["b1"]
    h = relu(z)
    out = h @ params["W2"] + params["b2"]
    return out[:, 0], (X, z, h)
~~~
```

**Why must there be a bend?** Without `relu`, the output would be `(X @ W1 + b1) @ W2 + b2`, which is `X @ (W1 @ W2) + (b1 @ W2 + b2)`: one weight times x, plus one bias. A straight line again, however many units. Lines added to lines are lines. The bend is what lets a sum of them be a curve: each unit contributes a hockey stick that starts rising at its own point, and enough hockey sticks, added with the right weights, can follow a U.

```check
run ".venv/Scripts/python -m pytest -q tests/test_tiny_net.py -k forward" label="forward computes every unit's bent line and their weighted sum, for every input at once" -- X = x.reshape(-1, 1); z = X @ W1 + b1; h = relu(z); out = h @ W2 + b2; return out[:, 0], (X, z, h).
```

## Backpropagation

Now the slopes for every knob, from the chain rule (lesson 4.2), working **backwards** from the loss through each step of the forward pass. That direction gives the method its name. Make `tiny_net.py` this:

```python file=tiny_net.py
import numpy as np


def make_curve(n=64, seed=0):
    rng = np.random.default_rng(seed)
    x = rng.uniform(-2.0, 2.0, n)
    y = x ** 2 + rng.normal(0.0, 0.05, n)
    return x, y


def relu(z):
    return np.maximum(z, 0.0)


def init(hidden=16, seed=0):
    rng = np.random.default_rng(seed)
    return {
        "W1": rng.normal(0.0, 1.0, (1, hidden)),
        "b1": np.zeros(hidden),
        "W2": rng.normal(0.0, 1.0 / np.sqrt(hidden), (hidden, 1)),
        "b2": np.zeros(1),
    }


def forward(params, x):
    X = x.reshape(-1, 1)
    z = X @ params["W1"] + params["b1"]
    h = relu(z)
    out = h @ params["W2"] + params["b2"]
    return out[:, 0], (X, z, h)


def loss(params, x, y):
    out, _ = forward(params, x)
    return float(np.mean((out - y) ** 2))


def backward(params, x, y):
    out, (X, z, h) = forward(params, x)
    d_out = (2 * (out - y) / len(x)).reshape(-1, 1)
    d_h = d_out @ params["W2"].T
    d_z = d_h * (z > 0)
    return {
        "W2": h.T @ d_out,
        "b2": d_out.sum(axis=0),
        "W1": X.T @ d_z,
        "b1": d_z.sum(axis=0),
    }


def train(x, y, hidden=16, rate=0.05, steps=3000, seed=0):
    params = init(hidden, seed)
    losses = []
    for _ in range(steps):
        grads = backward(params, x, y)
        for name in params:
            params[name] -= rate * grads[name]
        losses.append(loss(params, x, y))
    return params, losses


if __name__ == "__main__":
    from downhill import descend
    x, y = make_curve()
    w, b, line_losses = descend(x, y, rate=0.1, steps=3000)
    print(f"the best straight line: loss {line_losses[-1]:.3f}")
    params, losses = train(x, y)
    print(f"one hidden layer of 16: loss {losses[0]:.3f} after 1 step, {losses[-1]:.4f} after {len(losses)}")
```

`backward` follows the forward pass in reverse, one line per step. Each name `d_something` means "the slope of the loss with respect to something":

1. **`d_out`**: the loss is the mean of (out − y)², so, exactly as in lesson 4.2, its slope for each output is **2 × miss ÷ n**.
2. **`W2` and `b2`**: `out = h @ W2 + b2`. For one input, out is the sum over units of h[j] × W2[j], so turning W2[j] changes out at the rate h[j]. Multiply by d_out and add up over every input: that sum over inputs is what `h.T @ d_out` computes. (`.T` is the transpose, from lesson 3.4.) The bias changes out at rate 1, so its slope is just the sum of d_out.
3. **`d_h`**: the same sum, read the other way: turning h[j] changes out at the rate W2[j]. So `d_h = d_out @ W2.T`, an (n, hidden) array: how much each unit's output, for each input, affects the loss.
4. **`d_z`, through the bend**: relu passes a change straight through where z > 0 (slope 1) and blocks it where z ≤ 0 (the flat part, slope 0). `(z > 0)` is an array of True/False, which multiplies as 1/0.
5. **`W1` and `b1`**: `z = X @ W1 + b1`, the same shape of calculation as step 2, so the same pattern: `X.T @ d_z`, and the sum of d_z for the biases.

**Worked through on the hand test's network**, with one example, x = 1 and the answer y = 2. The forward pass gave z = [1, −1], h = [1, 0], out = 2.5:

```text
d_out = 2 × (2.5 − 2) / 1          = 1.0         the guess is 0.5 too high
W2:   h.T @ d_out                  = [1.0, 0.0]  unit 0 (h = 1) gets the blame; unit 1 (h = 0) contributed nothing
b2:   sum of d_out                 = 1.0
d_h = d_out @ W2.T  = 1.0 × [2, 3] = [2.0, 3.0]  how much each unit's output would move the loss
d_z = d_h × (z > 0) = [2, 3] × [1, 0] = [2.0, 0.0]  unit 1 is on relu's flat part: changes there do nothing
W1:   X.T @ d_z     = 1 × [2, 0]   = [2.0, 0.0]
b1:   sum of d_z                   = [2.0, 0.0]
```

All positive, so gradient descent turns every one of those knobs **down**, making the guess smaller, towards 2. Unit 1 gets slope 0 everywhere: it was switched off for this input, so it can't be blamed. Check it in a scratch file in your project folder:

```python
import numpy as np
from tiny_net import backward

params = {"W1": np.array([[1.0, -1.0]]), "b1": np.array([0.0, 0.0]),
          "W2": np.array([[2.0], [3.0]]), "b2": np.array([0.5])}
for name, slope in backward(params, np.array([1.0]), np.array([2.0])).items():
    print(name, slope.tolist())
```

Every line is "how fast the outside changes, times how fast the inside changes", the chain rule, applied once per step of the forward pass. A network of a hundred layers is this, a hundred times. `train` is lesson 4.2's `descend`, for four groups of knobs. Its inputs: the examples `x` and `y`, `hidden` (how many units, 16), `rate` (0.05), `steps` (3,000) and `seed` (which random starting weights). It returns the trained knobs and the list of losses.

The gradient check runs as part of the tests: for each of this 4-unit network's 13 knobs, your formulas against nudging. Measured on the 16-unit network, the largest difference over all 49 knobs was 0.000004, which is nudging's own error, since `h` isn't zero.

Run it. It takes about a tenth of a second.

```predict
question: The best straight line through the U has a loss of 1.514. After 3,000 steps, the 16-unit network's loss will be…
choice: About 1, a little better than the line
choice: About 0.1
choice: Below 0.01
answer: Below 0.01
explain: 0.0043, about 350 times better than the line, and close to the noise's own size (0.05² = 0.0025), below which no function can go. The 16 hockey sticks have arranged themselves to follow the U. With fewer units it fits less closely: measured, 2 units reach 0.020, 4 units 0.014, 16 units 0.0043 and 64 units 0.0039. More units means more bends available, with diminishing returns once there are enough.
verify: .venv/Scripts/python -c "from tiny_net import make_curve, train; l = train(*make_curve())[1][-1]; print('Below 0.01' if l < 0.01 else l)"
```

```text
the best straight line: loss 1.514
one hidden layer of 16: loss 0.983 after 1 step, 0.0043 after 3000
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_tiny_net.py -k backprop" label="backward's slopes match nudging for every knob, and training fits the curve" -- d_out = 2 * (out - y) / n as a column; W2: h.T @ d_out; d_h = d_out @ W2.T; d_z = d_h * (z > 0); W1: X.T @ d_z; biases: the sums.
run ".venv/Scripts/python -m pytest -q tests/test_tiny_net.py" label="all lesson 4.3 tests pass"
```

### What you have

A neural network, every line of it yours: a hidden layer of bent lines, an output layer that adds them up, backpropagation by the chain rule (checked against nudging), and gradient descent to train it. That's the whole idea. Real networks add only scale and convenience, and the next lesson brings in the library that provides both: **PyTorch**, which will compute `backward` for you.
