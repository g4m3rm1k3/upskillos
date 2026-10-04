---
title: 12.1 — Beyond a Straight Line: Layers
track: Neural Networks — A Tolerance Zone
trackOrder: 32
runtime: none
concepts: neural-networks
revisits: logistic-regression, linear-model, matrices, classification-metrics, numpy, testing
notebook: ml-perceptron-limits
lab: 20
problem: A hole is in tolerance when its position error lies inside a circle. Logistic regression can only draw a straight line between pass and fail, and no straight line separates the inside of a circle from the outside. What kind of model can draw a closed shape, and how is it built from the pieces you already have?
---

Every drilled hole has a **position tolerance**: on the drawing, a circle around the hole's true position, here 0.2 mm across. The hole passes if its actual centre lies anywhere inside that circle. A CMM measures each hole's offset from true position, $(dx, dy)$ in millimetres, and the rule is

$$\text{pass if } \sqrt{dx^2 + dy^2} \le 0.1 \text{ mm}$$

This is GD&T's **true position**, and it's the problem for this chapter, for one reason: the pass region is a **circle**. Pretend nobody had written the rule down, and all you had were 1,000 measured holes, each marked pass or fail by an inspector. Could a model learn the rule?

## A new project

1. **Choose folder…** → in **Documents**, a **New folder** named `tolerance-net`.
2. `python -m venv .venv`
3. `requirements.txt`:

```text file=requirements.txt
pytest==9.1.1
numpy==2.5.3
scikit-learn==1.9.1
```

4. `.venv\Scripts\python -m pip install -r requirements.txt`

```check
run ".venv/Scripts/python -c \"import sklearn, numpy, pytest\"" label="NumPy, scikit-learn and pytest are installed in the project's Python" -- python -m venv .venv, then .venv\Scripts\python -m pip install -r requirements.txt
```

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_layers.py provided
# Tests for holes.py and layers.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_layers.py
import numpy as np
from pytest import approx
from sklearn.linear_model import LogisticRegression


def test_measure_is_repeatable_and_about_a_fifth_pass():
    import holes
    X, y = holes.measure(1000, seed=0)
    assert X.shape == (1000, 2) and y.sum() == 195
    assert np.array_equal(X, holes.measure(1000, seed=0)[0])


def test_measure_marks_holes_by_their_true_position():
    import holes
    X, y = holes.measure(1000, seed=0)
    distance = np.sqrt((X ** 2).sum(axis=1))
    assert y[distance < 0.07].all() and not y[distance > 0.13].any()


def test_a_straight_line_does_no_better_than_rejecting_everything():
    import holes
    X_train, y_train = holes.measure(1000, seed=0)
    X_test, y_test = holes.measure(1000, seed=1)
    line = LogisticRegression().fit(X_train / holes.TOLERANCE, y_train)
    assert line.predict(X_test / holes.TOLERANCE).tolist() == [0] * 1000


def test_relu_keeps_positives_and_zeroes_negatives():
    import layers
    assert layers.relu(np.array([-2.0, 0.0, 3.0])).tolist() == [0, 0, 3]


def test_a_layer_is_weighted_sums_then_relu():
    import layers
    X = np.array([[1.0, 2.0]])
    W = np.array([[1.0, -1.0], [1.0, -1.0]])
    assert layers.layer(X, W, np.array([0.0, 1.0])).tolist() == [[3.0, 0.0]]


def test_the_hand_made_diamond_gets_most_holes_right():
    import holes, layers
    X, y = holes.measure(1000, seed=1)
    assert np.mean(layers.diamond(X / holes.TOLERANCE, size=1.2) == y) == approx(0.948)
```

- The second test checks the labels: every hole well inside the zone (closer than 0.07 mm) passes and every hole well outside (farther than 0.13 mm) fails. Near the edge, it could go either way: the CMM measures with a little error, so a hole measured at 0.098 mm might really be at 0.103.
- The third test is a claim worth reading twice: logistic regression, trained on 1,000 holes, ends up **rejecting every single hole**.

```check
file tests/test_layers.py -- Click "Create provided tests/test_layers.py" above.
```

## The holes

Create `holes.py`, which plays the part of the CMM and the inspector:

```python file=holes.py
import numpy as np

TOLERANCE = 0.1  # the position tolerance zone is 0.2 mm across: radius 0.1 mm


def measure(n: int, seed: int) -> tuple[np.ndarray, np.ndarray]:
    """n holes' measured (dx, dy) offsets in mm, and 1 if the hole is truly in tolerance, else 0."""
    rng = np.random.default_rng(seed)
    offsets = rng.uniform(-0.2, 0.2, (n, 2))
    true_distance = np.sqrt((offsets ** 2).sum(axis=1))
    measured = offsets + rng.normal(0, 0.01, (n, 2))
    return measured, (true_distance <= TOLERANCE).astype(int)
```

- **`rng.uniform(-0.2, 0.2, (n, 2))`**: true offsets spread evenly across a 0.4 mm square around true position, two numbers per hole.
- **The label comes from the true offset; the features are the measured one**, with 0.01 mm of gauge error added. That's how real data works: the model only ever sees the measurement.
- About a fifth pass: the circle covers π × 0.1² ≈ 0.031 mm² of the 0.16 mm² square, about 19.6%.

```check
run ".venv/Scripts/python -m pytest -q tests/test_layers.py -k measure" label="1,000 holes, 195 in tolerance, labelled by true position"
```

## Why one neuron fails

Logistic regression (lesson 8.4) computes $z = w_1\,dx + w_2\,dy + b$ and passes the hole if $z > 0$. The boundary, $w_1\,dx + w_2\,dy + b = 0$, is a **straight line**. Everything on one side passes, everything on the other fails.

The pass region is a circle in the middle, with fails on *every* side. Any straight line puts some fails on the pass side. The best a line can do is give up and put every hole on the fail side, which is right 80% of the time because 80% of holes fail. That's what training finds: the third test checks it.

This is the classic limit of a single neuron. The famous small example is **XOR** (pass if exactly one of two switches is on): four points that no line can separate. A tolerance zone is the same problem with a real drawing behind it.

## Building a shape out of lines

A single line can't enclose anything. But several lines can: four lines make a square, eight make an octagon, and enough make a good circle. The way to combine lines is to compute several straight-line scores *first*, then make the decision from those.

Each of those first scores is a **hidden unit**: a weighted sum of the inputs plus a bias, like logistic regression's $z$. Then something has to bend it, or combining them would just make another straight line (a weighted sum of weighted sums is a weighted sum). The most common bend is:

> **ReLU** (rectified linear unit): $\text{relu}(z) = \max(0, z)$. Negative values become 0; positive values pass through unchanged. It's the **activation function** most networks use between layers.
>
> *Picture it as* a one-way valve. Pressure on one side flows through as it is; pressure the other way is blocked completely. Simple, but it's the blocking that lets the network make corners.

> **Neural network** (a multilayer perceptron): a model built in **layers**. Each layer computes weighted sums of its inputs plus biases, then applies an activation function; the next layer does the same with those results. The layers between input and output are **hidden layers**.
>
> *Picture it as* a two-stage inspection. The first stage has several gauges, each checking one simple thing ("how far right of centre?", "how far below centre?"). The second stage doesn't look at the part at all; it makes the pass/fail call from the first stage's readings.

Here's a tiny network, with weights chosen by hand rather than learned, that draws a diamond. Four hidden units, each one a line through the middle:

| hidden unit | weighted sum | after ReLU |
|---|---|---|
| 1 | $+dx$ | how far right of centre (0 if left) |
| 2 | $-dx$ | how far left of centre (0 if right) |
| 3 | $+dy$ | how far above centre (0 if below) |
| 4 | $-dy$ | how far below centre (0 if above) |

For any hole, two of the four are 0 and the other two are $|dx|$ and $|dy|$. Their sum is $|dx| + |dy|$, and "pass if $|dx| + |dy| \le$ size" is a diamond: a square standing on its corner. Not a circle, but a lot closer to one than a line is.

The test for `layer` works one example. `X = [[1, 2]]`, two hidden units with weights `[[1, -1], [1, -1]]` (one column per unit) and biases `[0, 1]`:

- unit 1: 1 × 1 + 2 × 1 + 0 = 3, ReLU leaves 3;
- unit 2: 1 × (−1) + 2 × (−1) + 1 = −2, ReLU makes it 0.

Create `layers.py`:

```python file=layers.py
import numpy as np


def relu(z: np.ndarray) -> np.ndarray:
    return np.maximum(0, z)


def layer(X: np.ndarray, W: np.ndarray, b: np.ndarray) -> np.ndarray:
    """One layer: every unit's weighted sum of the inputs plus its bias, then ReLU."""
    return relu(X @ W + b)


def diamond(X: np.ndarray, size: float) -> np.ndarray:
    """A hand-made network: four hidden units measuring |dx| and |dy|, then pass if they add up to at most size."""
    W = np.array([[1.0, -1.0, 0.0, 0.0], [0.0, 0.0, 1.0, -1.0]])
    hidden = layer(X, W, np.zeros(4))
    return (hidden.sum(axis=1) <= size).astype(int)
```

- **`np.maximum(0, z)`** compares each element with 0 and keeps the larger: ReLU for every element at once. (Not `np.max`, which would return the single largest value of the whole array.)
- **`X @ W + b`**: `X` has one row per hole and one column per input (2); `W` has one row per input and one column per hidden unit (2 × 4). The product has one row per hole and one column per unit: every unit's weighted sum for every hole, in one multiplication. `+ b` adds each unit's bias (broadcasting, lesson 2.2).
- **`hidden.sum(axis=1)`**: the second layer here is the simplest possible, every hidden unit weighted 1, compared with `size`.

```check
run ".venv/Scripts/python -m pytest -q tests/test_layers.py" label="ReLU, a layer, and a hand-made diamond network" -- relu: np.maximum(0, z); layer: relu(X @ W + b)
```

## Line against diamond

The network works in units of the tolerance radius (`X / holes.TOLERANCE`), so the zone has radius 1 and the inputs are numbers around −2 to 2. Lesson 3.2's lesson about scale applies to every gradient-trained model, and networks most of all.

Create `zone.py`:

```python file=zone.py
import numpy as np
from sklearn.linear_model import LogisticRegression

import holes
import layers

X_train, y_train = holes.measure(1000, seed=0)
X_test, y_test = holes.measure(1000, seed=1)
Z_train, Z_test = X_train / holes.TOLERANCE, X_test / holes.TOLERANCE

print(f"holes in tolerance: {y_train.mean():.1%} of training parts")
print(f"reject everything:        {np.mean(y_test == 0):.3f}")
line = LogisticRegression().fit(Z_train, y_train)
print(f"a straight line:          {np.mean(line.predict(Z_test) == y_test):.3f}")
for size in [1.0, 1.2]:
    print(f"hand-made diamond, {size}:  {np.mean(layers.diamond(Z_test, size) == y_test):.3f}")
```

```powershell
.venv\Scripts\python zone.py
```

```text
holes in tolerance: 19.5% of training parts
reject everything:        0.796
a straight line:          0.796
hand-made diamond, 1.0:  0.916
hand-made diamond, 1.2:  0.948
```

```predict
question: The diamond of size 1.0 has its corners exactly on the circle. Why does a bigger diamond, size 1.2, score better?
choice: Because bigger is always better
choice: The size-1.0 diamond lies entirely inside the circle and fails the good holes between its edges and the circle; a slightly bigger one trades a few bad holes at its corners for many good holes along its edges
choice: Measurement noise
answer: The size-1.0 diamond lies entirely inside the circle and fails the good holes between its edges and the circle; a slightly bigger one trades a few bad holes at its corners for many good holes along its edges
explain: A diamond with corners on the circle cuts off four big slices of the circle along its flat sides: about 36% of the pass area. Growing it lets those good holes in, at the cost of its corners poking outside the circle and letting a few bad holes in. Somewhere in between is a best size, but no diamond can match a circle exactly. More hidden units mean more sides, and a better approximation.
```

```check
run ".venv/Scripts/python zone.py" stdout="hand-made diamond, 1.2:  0.948" label="zone.py: a straight line can only reject everything; four hidden units already make a useful shape"
```

Four hidden units, weights picked by hand, and the model goes from useless to 95%. The obvious next question: instead of designing the hidden units, can the network **learn** them, along with the final decision, from the 1,000 inspected holes? That needs the gradient of the loss with respect to every weight in every layer, and the method that computes it is the subject of the next lesson.
