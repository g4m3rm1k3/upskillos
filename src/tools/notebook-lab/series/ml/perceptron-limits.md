# What a perceptron cannot learn

In the last lesson the perceptron always succeeded: every time, it found a line separating the two classes. That was not luck, and it was not a guarantee either. It succeeded because the data **could** be separated by a line, and there is a theorem that says exactly when the perceptron will succeed and how long it will take. There is also a very simple problem, just four points, on which it is guaranteed to fail forever.

That failure mattered historically. In 1969 Marvin Minsky and Seymour Papert published a book, *Perceptrons*, that analysed exactly what a single perceptron cannot do. It helped convince funders that the approach was a dead end, and research into neural networks nearly stopped for over a decade. The way out, which this lesson previews, turned out to be almost embarrassingly simple: connect several perceptrons together. Understanding precisely what one perceptron cannot do is the best way to understand why neural networks have layers.

## Linear separability

Two classes are **linearly separable** if some straight line (in more dimensions, some flat hyperplane) has every example of one class on one side and every example of the other class on the other. The perceptron's boundary is always a line, so it can only ever classify every training example correctly if the data is linearly separable.

Take the logic operations on two inputs that are each 0 or 1. **AND** is true only when both inputs are 1; **OR** is true when at least one is. Plot the four possible inputs, coloured by the output, and a separating line is easy to draw for both:

```python type
import numpy as np
import matplotlib.pyplot as plt

inputs = np.array([[0, 0], [0, 1], [1, 0], [1, 1]])
outputs = {"AND": [0, 0, 0, 1], "OR": [0, 1, 1, 1], "XOR": [0, 1, 1, 0]}

fig, axes = plt.subplots(1, 3, figsize=(11, 3.5))
for ax, (name, out) in zip(axes, outputs.items()):
    out = np.array(out)
    ax.scatter(*inputs[out == 1].T, s=150, marker="o", label="output 1")
    ax.scatter(*inputs[out == 0].T, s=150, marker="x", label="output 0")
    ax.set_title(name)
    ax.set_xlim(-0.5, 1.5)
    ax.set_ylim(-0.5, 1.5)
    ax.set_aspect("equal")
axes[0].plot([0.2, 1.4], [1.4, 0.2], "k--")
axes[1].plot([-0.4, 0.9], [0.9, -0.4], "k--")
axes[0].legend(fontsize=7, loc="upper left")
plt.show()
```

For AND, a line cuts off the top-right corner; for OR, a line cuts off the bottom-left corner. Now look at **XOR** ("exclusive or"), which is true when **exactly one** input is 1. The two 1s sit on one diagonal and the two 0s on the other. Try to draw a single straight line with both circles on one side and both crosses on the other. You cannot.

## Why no line exists for XOR

It is worth seeing that this is impossible, not just hard. Suppose some `w₁`, `w₂` and `b` did work, with a positive score meaning output 1. Then the four inputs require:

- `(0, 0)` → 0: `b ≤ 0`
- `(1, 0)` → 1: `w₁ + b > 0`
- `(0, 1)` → 1: `w₂ + b > 0`
- `(1, 1)` → 0: `w₁ + w₂ + b ≤ 0`

Add the middle two inequalities: `w₁ + w₂ + 2b > 0`, so `w₁ + w₂ + b > −b`. Since `b ≤ 0`, `−b ≥ 0`, which makes `w₁ + w₂ + b > 0`. That contradicts the last inequality. No choice of weights can satisfy all four at once, so no line separates XOR.

## Watching the perceptron fail

Run the perceptron on XOR anyway. Predict what the mistake count will do:

```python type
import numpy as np

X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]], dtype=float)
y = np.array([-1, 1, 1, -1])

w, b = np.zeros(2), 0.0
for epoch in range(1, 5):
    mistakes = 0
    for xi, yi in zip(X, y):
        if (1 if xi @ w + b > 0 else -1) != yi:
            w, b = w + yi * xi, b + yi
            mistakes += 1
            print(f"  epoch {epoch}: fixed {xi} (label {yi:+d}) → w = {w}, b = {b}")
    print(f"epoch {epoch}: mistakes {mistakes}")
```

```output
  epoch 1: fixed [0. 1.] (label +1) → w = [0. 1.], b = 1.0
  epoch 1: fixed [1. 1.] (label -1) → w = [-1.  0.], b = 0.0
epoch 1: mistakes 2
  epoch 2: fixed [0. 1.] (label +1) → w = [-1.  1.], b = 1.0
  epoch 2: fixed [1. 0.] (label +1) → w = [0. 1.], b = 2.0
  epoch 2: fixed [1. 1.] (label -1) → w = [-1.  0.], b = 1.0
epoch 2: mistakes 3
  epoch 3: fixed [0. 0.] (label -1) → w = [-1.  0.], b = 0.0
  epoch 3: fixed [0. 1.] (label +1) → w = [-1.  1.], b = 1.0
  epoch 3: fixed [1. 0.] (label +1) → w = [0. 1.], b = 2.0
  epoch 3: fixed [1. 1.] (label -1) → w = [-1.  0.], b = 1.0
epoch 3: mistakes 4
  epoch 4: fixed [0. 0.] (label -1) → w = [-1.  0.], b = 0.0
  epoch 4: fixed [0. 1.] (label +1) → w = [-1.  1.], b = 1.0
  epoch 4: fixed [1. 0.] (label +1) → w = [0. 1.], b = 2.0
  epoch 4: fixed [1. 1.] (label -1) → w = [-1.  0.], b = 1.0
epoch 4: mistakes 4
```

It never reaches zero mistakes. Follow the printed updates: each one fixes the example it was made for, which pushes the boundary so that another example lands on the wrong side. From the third epoch on, every example is a mistake and the same four updates repeat, epoch after epoch, returning to the same weights. Each update fixes one example by breaking another. On non-separable data the perceptron rule has no stopping point, which is why any practical implementation needs a maximum number of epochs.

## The convergence theorem

For separable data, there is a guarantee. It depends on two numbers:

- the **margin** γ (gamma): how wide a gap the best separating line leaves between itself and the closest example (measured with `w` scaled to length 1);
- the **radius** `R`: the length of the longest example vector.

The **perceptron convergence theorem**, proved by Albert Novikoff in 1962, says the perceptron makes **at most** `(R / γ)²` mistakes in total before it separates the data, whatever order the examples come in. (With a bias, the theorem is applied to each example with an extra constant 1 appended, `(x, 1)`, so the bias becomes an ordinary weight; `R` and `γ` are measured for those extended vectors.) A wide gap means few mistakes; a narrow gap can mean very many. You can see the effect by squeezing two groups closer together:

```python type
import numpy as np

def mistakes_to_converge(gap, seed=0):
    rng = np.random.default_rng(seed)
    X = rng.uniform(-1, 1, size=(400, 2))
    distance = (X[:, 0] + 0.5 * X[:, 1] - 0.3) / np.sqrt(1.25)
    keep = np.abs(distance) > gap
    X, y = X[keep], np.where(distance[keep] > 0, 1, -1)
    w, b, total = np.zeros(2), 0.0, 0
    for _ in range(10_000):
        mistakes = 0
        for xi, yi in zip(X, y):
            if (1 if xi @ w + b > 0 else -1) != yi:
                w, b = w + yi * xi, b + yi
                mistakes += 1
        total += mistakes
        if mistakes == 0:
            return total
    return total

for gap in [0.5, 0.2, 0.05, 0.01]:
    print(f"half-gap {gap}: {mistakes_to_converge(gap)} mistakes in total")
```

```output
half-gap 0.5: 4 mistakes in total
half-gap 0.2: 7 mistakes in total
half-gap 0.05: 15 mistakes in total
half-gap 0.01: 25 mistakes in total
```

The points are scattered in a square, labelled by which side of a slanted line they fall on, and every point closer to the line than `gap` is removed, leaving an empty band of half-width `gap`. (`distance` is each point's distance from the line, from the vectors lesson's geometry.) As the gap narrows, the total number of mistakes before convergence grows: 4, 7, 15, 25. The theorem's ceiling is far higher than these (in the tens of thousands for the narrowest gap), because it is a worst case over every possible order of examples: it guarantees an eventual answer, not a quick one.

## Real data is rarely separable

The iris flowers in the last lesson happened to be perfectly separable. Most real classes overlap: some emails are ambiguous, some tumours look like others. On such data the perceptron's weights keep jumping around forever, and whichever weights it happens to have when you stop may be poor. Two simple fixes are common:

- the **pocket algorithm**: keep, "in your pocket", the best weights seen so far (the ones with the fewest training mistakes), and return those;
- the **averaged perceptron**: return the average of the weights over all the steps, which smooths out the jumping.

Both are small additions to the training loop (the pocket algorithm is one extra `if` that saves `w` and `b` whenever a pass sets a new record for fewest mistakes).

Better still are methods designed for overlapping classes from the start, such as logistic regression in the next lesson, which does not try to get every example right but instead gives each example a probability.

## Way out 1: new features

XOR is not separable in terms of `x₁` and `x₂`. But add a third feature, the product `x₁ x₂`, and look at the data in three dimensions. The four examples become:

- `(0, 0)` → features `(0, 0, 0)`, XOR 0
- `(0, 1)` → features `(0, 1, 0)`, XOR 1
- `(1, 0)` → features `(1, 0, 0)`, XOR 1
- `(1, 1)` → features `(1, 1, 1)`, XOR 0

The new feature is 1 only for the point `(1, 1)`, which lifts that one crossed point up out of the plane, away from the others. Now a flat plane can separate the classes: `x₁ + x₂ − 2x₁x₂` is exactly XOR. This is the same trick as the polynomial features of the overfitting lesson: a linear model on well-chosen features can represent non-linear patterns. The catch is that someone has to know which features to add.

## Way out 2: more perceptrons

XOR can also be built by combining simpler pieces, each of which a perceptron can do. "Exactly one input is on" means "at least one is on" (OR) and "not both are on" (NAND, "not and"):

\[
\text{XOR}(a, b) = \text{AND}\big(\text{OR}(a, b),\ \text{NAND}(a, b)\big)
\]

OR, NAND and AND are each linearly separable, so each is a single perceptron with hand-chosen weights. Feed the outputs of the first two into the third:

```python type
import numpy as np

def unit(x, w, b):
    return 1 if np.dot(x, w) + b > 0 else 0

def xor_network(a, b):
    h1 = unit([a, b], [1, 1], -0.5)
    h2 = unit([a, b], [-1, -1], 1.5)
    return unit([h1, h2], [1, 1], -1.5)

for a in [0, 1]:
    for b in [0, 1]:
        print(a, b, "→", xor_network(a, b))
```

```output
0 0 → 0
0 1 → 1
1 0 → 1
1 1 → 0
```

`h1` is OR (on if the sum is above 0.5), `h2` is NAND (on unless the sum is above 1.5), and the final unit is AND of the two (on only if both are). Three perceptrons, arranged in two **layers**, compute XOR, which one perceptron never can.

This small network contains the central idea of deep learning. The first layer transforms the inputs into new features (`h1` and `h2`) in which the problem **becomes** linearly separable, and the last layer draws a line in that new space. Way out 1 needed a person to invent the right feature; here the first layer computes it. What was still missing in 1969 was a way to **learn** the weights of the hidden layer from data, instead of choosing them by hand. The perceptron rule only works for a single layer, because it needs to know what each unit's output should have been, and nobody tells you that for a hidden unit. The answer, backpropagation, uses gradients, which in turn need a smooth version of the perceptron's all-or-nothing step. Logistic regression, the next lesson, is exactly that smooth version.

::: challenge Weights by hand [easy]
Write a function `separates(X, y, w, b)` that returns `True` if the line `w · x + b = 0` classifies every example correctly (score greater than 0 for label `1`, not greater than 0 for label `−1`), and `False` otherwise. Then find weights by hand for AND and OR on the four inputs `(0,0), (0,1), (1,0), (1,1)`, with labels `1` for true and `−1` for false, and store them as `and_w, and_b` and `or_w, or_b`.

```python starter
import numpy as np

def separates(X, y, w, b):
    return False

and_w, and_b = np.array([0.0, 0.0]), 0.0
or_w, or_b = np.array([0.0, 0.0]), 0.0
```

```python solution
import numpy as np

def separates(X, y, w, b):
    predictions = np.where(X @ w + b > 0, 1, -1)
    return bool(np.all(predictions == y))

and_w, and_b = np.array([1.0, 1.0]), -1.5
or_w, or_b = np.array([1.0, 1.0]), -0.5
```

```python test
import numpy as _np
assert "separates" in dir(), "Keep the function's name as separates."
_X = _np.array([[0, 0], [0, 1], [1, 0], [1, 1]], dtype=float)
_and = _np.array([-1, -1, -1, 1])
_or = _np.array([-1, 1, 1, 1])
_xor = _np.array([-1, 1, 1, -1])
assert separates(_X, _and, _np.array([1.0, 1.0]), -1.5) == True, "w = (1, 1), b = −1.5 separates AND, so separates should return True."
assert not separates(_X, _and, _np.array([1.0, 1.0]), -0.5), "w = (1, 1), b = −0.5 does not separate AND."
assert separates(_X, _and, _np.asarray(and_w, dtype=float), float(and_b)), "Your and_w and and_b do not separate AND."
assert separates(_X, _or, _np.asarray(or_w, dtype=float), float(or_b)), "Your or_w and or_b do not separate OR."
_rng = _np.random.default_rng(0)
assert not any(separates(_X, _xor, _rng.normal(size=2), _rng.normal()) for _ in range(2000)), "No weights separate XOR."
"SUCCESS: AND and OR each need just one line. XOR, as the lesson proved, has none."
```

Hint: For AND, the score should be positive only when both inputs are 1: try weights of 1 each and a bias that puts the threshold between a sum of 1 and a sum of 2. OR needs the threshold between 0 and 1. `bool(np.all(...))` turns a whole-array check into `True` or `False`.
:::

::: challenge XOR with a new feature [medium]
Write a function `xor_features(X)` that takes the 4 by 2 array of XOR inputs and returns a 4 by 3 array with the product `x₁ x₂` added as a third column. Then train a perceptron on those three features (labels `−1, 1, 1, −1` as in the lesson), starting from zeros and passing over the examples in order until a pass makes no mistakes (at most 100 passes). Store the final weights in `xor_w`, the bias in `xor_b`, and the number of passes in `xor_epochs`.

```python starter
import numpy as np

def xor_features(X):
    return X

X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]], dtype=float)
y = np.array([-1, 1, 1, -1])

xor_w, xor_b, xor_epochs = np.zeros(3), 0.0, 0
print(xor_w, xor_b, xor_epochs)
```

```python solution
import numpy as np

def xor_features(X):
    return np.column_stack([X, X[:, 0] * X[:, 1]])

X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]], dtype=float)
y = np.array([-1, 1, 1, -1])

F = xor_features(X)
xor_w, xor_b = np.zeros(3), 0.0
for xor_epochs in range(1, 101):
    mistakes = 0
    for xi, yi in zip(F, y):
        if (1 if xi @ xor_w + xor_b > 0 else -1) != yi:
            xor_w, xor_b = xor_w + yi * xi, xor_b + yi
            mistakes += 1
    if mistakes == 0:
        break
print(xor_w, xor_b, xor_epochs)
```

```python test
import numpy as _np
assert "xor_features" in dir(), "Keep the function's name as xor_features."
_X = _np.array([[0, 0], [0, 1], [1, 0], [1, 1]], dtype=float)
_F = _np.asarray(xor_features(_X))
assert _F.shape == (4, 3) and _np.allclose(_F[:, 2], [0, 0, 0, 1]) and _np.allclose(_F[:, :2], _X), "xor_features should keep the two inputs and add their product as a third column."
_y = _np.array([-1, 1, 1, -1])
assert _np.all(_np.where(_F @ _np.asarray(xor_w, dtype=float) + float(xor_b) > 0, 1, -1) == _y), f"The trained weights w = {xor_w}, b = {xor_b} do not classify all four XOR examples correctly."
_w, _b = _np.zeros(3), 0.0
for _e in range(1, 101):
    _k = 0
    for _xi, _yi in zip(_F, _y):
        if (1 if _xi @ _w + _b > 0 else -1) != _yi:
            _w, _b = _w + _yi * _xi, _b + _yi
            _k += 1
    if _k == 0:
        break
assert xor_epochs == _e, f"The perceptron needs {_e} passes on the new features, but xor_epochs is {xor_epochs}."
"SUCCESS: One extra feature made XOR separable, and the perceptron learned it."
```

Hint: `X[:, 0] * X[:, 1]` is the product column; `np.column_stack` adds it. Then run the perceptron loop from the lesson on the three-feature data.
:::

::: challenge A network for XNOR [medium]
**XNOR** is the opposite of XOR: it is 1 when both inputs are the **same** (both 0 or both 1), and 0 otherwise. Build it from perceptron units, as the lesson built XOR. Write `unit(x, w, b)` (1 if `x · w + b > 0`, else 0) and `xnor_network(a, b)` returning 0 or 1, using only calls to `unit`, with two units in a hidden layer and one output unit, and no `if` on the inputs themselves.

Think about which two simple conditions, both linearly separable, together describe "the same".

```python starter
import numpy as np

def unit(x, w, b):
    return 1 if np.dot(x, w) + b > 0 else 0

def xnor_network(a, b):
    return 0

for a in [0, 1]:
    for b in [0, 1]:
        print(a, b, "→", xnor_network(a, b))
```

```python solution
import numpy as np

def unit(x, w, b):
    return 1 if np.dot(x, w) + b > 0 else 0

def xnor_network(a, b):
    both_on = unit([a, b], [1, 1], -1.5)
    both_off = unit([a, b], [-1, -1], 0.5)
    return unit([both_on, both_off], [1, 1], -0.5)

for a in [0, 1]:
    for b in [0, 1]:
        print(a, b, "→", xnor_network(a, b))
```

```python test
import ast as _ast
assert "xnor_network" in dir() and "unit" in dir(), "Define unit and xnor_network."
for _a in [0, 1]:
    for _b in [0, 1]:
        _want = 1 if _a == _b else 0
        assert xnor_network(_a, _b) == _want, f"xnor_network({_a}, {_b}) should be {_want}, but returned {xnor_network(_a, _b)}."
_fn = [n for n in _ast.walk(_ast.parse(_source)) if isinstance(n, _ast.FunctionDef) and n.name == "xnor_network"][0]
assert not any(isinstance(n, (_ast.If, _ast.IfExp, _ast.Compare)) for n in _ast.walk(_fn)), "Build xnor_network only from calls to unit, without if statements or comparisons of your own."
_calls = [n for n in _ast.walk(_fn) if isinstance(n, _ast.Call) and getattr(n.func, "id", "") == "unit"]
assert len(_calls) == 3, f"Use exactly three units (two hidden, one output), but xnor_network calls unit {len(_calls)} times."
"SUCCESS: A two-layer network for a function no single perceptron can compute."
```

Hint: "The same" means "both on" or "both off".
:::

## What you learned

- Data is linearly separable if one straight line (hyperplane) puts each class entirely on its own side. A single perceptron can only classify every example correctly on separable data.
- AND and OR are separable; XOR is not, and a short argument with inequalities proves no weights can work.
- On non-separable data the perceptron never stops making mistakes; its weights cycle. Use a maximum number of epochs, the pocket algorithm or the averaged perceptron.
- The convergence theorem: on separable data, the perceptron makes at most (R/γ)² mistakes; a narrower margin γ can mean many more.
- A new feature (such as `x₁x₂`) can make a non-separable problem separable.
- Several perceptrons in layers can compute XOR: the hidden layer creates features in which the problem is separable. Learning the hidden layer's weights needs gradients, and so a smooth version of the perceptron.

The perceptron's hard, all-or-nothing prediction gives no sense of confidence and no gradient to learn from. Next you will replace it with a smooth one: logistic regression, which predicts a probability.
