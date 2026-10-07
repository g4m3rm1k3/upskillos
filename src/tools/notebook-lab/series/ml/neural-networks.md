# From perceptron to neural network

The perceptron lessons ended on a hard limit: a single neuron draws one straight line, so it cannot even compute XOR, "one input or the other, but not both". Logistic regression, softmax regression and the linear SVM share the limit: each is one layer of weights followed by a squashing function. This lesson removes it in the simplest possible way. Feed the inputs into **several** neurons, then feed **their** outputs into another neuron. That is a **neural network**, and the idea of stacking simple units in **layers** is the whole basis of deep learning.

The lesson builds a network by hand, computes its **forward pass** with matrices, shows why the units between layers must be **non-linear** (or the whole stack collapses back into one layer), and shows how a single hidden layer can approximate any curve. Training networks, with backpropagation, comes in the following lessons; here the goal is to understand what a network computes.

## XOR with two layers

Recall the logic gates from the perceptron lesson: a single neuron with the right weights computes AND, or OR. XOR is "OR, but not AND". So compute OR and AND first, with two neurons, then combine their answers with a third:

```python type
import numpy as np

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]], dtype=float)

W1 = np.array([[20.0, 20.0],
               [20.0, 20.0]])
b1 = np.array([-10.0, -30.0])
hidden = sigmoid(X @ W1 + b1)

w2 = np.array([20.0, -20.0])
b2 = -10.0
output = sigmoid(hidden @ w2 + b2)

for inputs, h, out in zip(X, hidden, output):
    print(f"inputs {inputs.astype(int)} -> hidden (OR, AND) {h.round(3)} -> output {out:.3f}")
```

```output
inputs [0 0] -> hidden (OR, AND) [0. 0.] -> output 0.000
inputs [0 1] -> hidden (OR, AND) [1. 0.] -> output 1.000
inputs [1 0] -> hidden (OR, AND) [1. 0.] -> output 1.000
inputs [1 1] -> hidden (OR, AND) [1. 1.] -> output 0.000
```

Large weights make each sigmoid behave almost like the perceptron's step: near 0 or near 1. The first column of `W1` with bias −10 gives OR: the score is −10 for no inputs, so its output is near 0, and +10 or more if either input is on. The second column with bias −30 gives AND: the score only becomes positive (+10) when both inputs are on. The output neuron computes "OR and not AND": +20 for OR, −20 for AND, and bias −10, so its score is positive only when OR is on and AND is off. The outputs are 0, 1, 1, 0: XOR.

The two neurons in the middle form a **hidden layer**: their outputs are neither the inputs nor the final answer, but new features computed along the way. The perceptron lesson showed that XOR becomes easy if you add the feature "x₁ AND x₂" by hand. A network **computes** its own features in its hidden layer. When it is trained, as in the coming lessons, it **learns** which features to compute, which is what makes neural networks so powerful.

## The forward pass in matrices

The cell above already used the standard layout. Each example is a row of `X`, with shape (n examples, d inputs). A layer with `h` units has a weight matrix `W` of shape (d, h), with one column per unit, and a bias vector `b` of length h. The layer's output is:

\[
H = \sigma(X W + b)
\]

`X @ W` has shape (n, h): every example's score for every unit, all at once. Broadcasting adds the bias to every row, and σ is applied to every entry. The next layer takes `H` as its input, with its own weights and biases. Computing the layers one after another, from inputs to output, is the **forward pass**.

The shapes must chain: a layer with `h` units produces `h` numbers per example, so the next weight matrix must have `h` rows. A network is often described by its layer sizes, such as 2 → 2 → 1 for the XOR network: 2 inputs, a hidden layer of 2 units, 1 output. Counting parameters follows from the shapes. A layer from `a` units to `b` units has an `a × b` weight matrix plus `b` biases. The XOR network has (2 × 2 + 2) + (2 × 1 + 1) = 9 parameters; the language models of recent years have hundreds of billions.

The function σ between layers is called the **activation function**. The sigmoid is used here because you know it; the next lesson compares it with alternatives that train better.

## Why the activation must be non-linear

Why not skip σ and just stack matrix multiplications? Because a stack of linear layers is just one linear layer in disguise. Multiplying by `A` and then by `B` is the same as multiplying once by the single matrix `AB`:

```python type
import numpy as np

rng = np.random.default_rng(0)
x = rng.normal(size=(5, 3))
A = rng.normal(size=(3, 4))
B = rng.normal(size=(4, 2))
C = rng.normal(size=(2, 6))

layered = ((x @ A) @ B) @ C
single = x @ (A @ B @ C)
print("three linear layers equal one?", np.allclose(layered, single))
print("shape of the single equivalent matrix:", (A @ B @ C).shape)
```

```output
three linear layers equal one? True
shape of the single equivalent matrix: (3, 6)
```

Three linear layers, 3 → 4 → 2 → 6, compute exactly what one 3 × 6 matrix computes. (With biases it is the same story: the result is one matrix plus one bias.) However many linear layers you stack, the network can still only draw straight lines. The activation function is what breaks this: σ(σ(XA)B) cannot be rewritten as a single layer. Every hidden layer must be followed by a non-linear activation, or it adds nothing.

## What hidden units do: carving up the plane

Each hidden unit is a logistic-regression-like neuron, so each draws one line and says which side a point is on. The output neuron then combines those answers. With enough lines, the combination can surround any region. Here is a dataset no line can split, one ring of points inside another, with networks of growing hidden-layer size. scikit-learn's `MLPClassifier` ("multi-layer perceptron") is used here to do the training, which later lessons will do by hand:

```python type
import matplotlib.pyplot as plt
import numpy as np
from sklearn.datasets import make_circles
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier

X, y = make_circles(400, noise=0.1, factor=0.4, random_state=0)
X_train, X_test, y_train, y_test = train_test_split(X, y, random_state=0)
print(f"logistic regression: test accuracy {LogisticRegression().fit(X_train, y_train).score(X_test, y_test):.2f}")

g1, g2 = np.meshgrid(np.linspace(-1.6, 1.6, 150), np.linspace(-1.6, 1.6, 150))
grid = np.column_stack([g1.ravel(), g2.ravel()])
fig, axes = plt.subplots(1, 3, figsize=(11, 3.4))
for units, ax in zip([1, 2, 4], axes):
    net = MLPClassifier(hidden_layer_sizes=(units,), activation="tanh", max_iter=3000, random_state=0).fit(X_train, y_train)
    print(f"{units} hidden unit(s): test accuracy {net.score(X_test, y_test):.2f}")
    ax.contourf(g1, g2, net.predict_proba(grid)[:, 1].reshape(g1.shape), levels=20, cmap="RdBu_r", alpha=0.6)
    ax.scatter(*X_train.T, c=y_train, cmap="coolwarm", s=8)
    ax.set_title(f"{units} hidden unit(s)", fontsize=9)
plt.show()
```

```output
logistic regression: test accuracy 0.35
1 hidden unit(s): test accuracy 0.31
2 hidden unit(s): test accuracy 0.69
4 hidden unit(s): test accuracy 1.00
```

`hidden_layer_sizes=(units,)` means one hidden layer of that many units, and `activation="tanh"` picks an S-shaped activation much like the sigmoid. Logistic regression scores 0.35, about chance or worse (any line leaves rings on both sides; on this split the best line even misclassifies the majority). One hidden unit is still one line (0.31). Two units give two lines, carving out a band (0.69). (Three lines forming a triangle would also do, but training does not always find such a tight solution, as later lessons explore.) Four units surround the inner ring with a four-sided boundary, rounded off by the smooth activations: test accuracy 1.00.

## One hidden layer can approximate anything

How far can this go? A famous result, the **universal approximation theorem**, says that a network with a single hidden layer of sigmoid-like units can approximate any continuous function on a bounded range as closely as you like, given enough hidden units.

The idea is easy to see. The difference of two steep sigmoids, σ(k(x − a)) − σ(k(x − b)), is close to 1 between `a` and `b` and close to 0 elsewhere: a **bump**. Two hidden units make one bump, and the output layer can scale each bump to any height. (Here the output unit has no activation at all: it just adds up the scaled bumps.) Enough narrow bumps, side by side, can trace out any curve. Here is sin(x) built this way. Before running, guess roughly how the worst error changes each time the number of units doubles.

```python type
import numpy as np
import matplotlib.pyplot as plt

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

x = np.linspace(0, 2 * np.pi, 400)
fig, ax = plt.subplots(figsize=(6.5, 3.5))
ax.plot(x, np.sin(x), "k", linewidth=2, label="sin(x)")
for units in [4, 8, 16, 32, 64]:
    edges = np.linspace(0, 2 * np.pi, units // 2 + 1)
    steepness = 3 * units
    approx = np.zeros_like(x)
    for a, b in zip(edges[:-1], edges[1:]):
        height = np.sin((a + b) / 2)
        approx += height * (sigmoid(steepness * (x - a)) - sigmoid(steepness * (x - b)))
    print(f"{units:>2} hidden units: largest error {np.abs(approx - np.sin(x)).max():.3f}")
    if units in (4, 16, 64):
        ax.plot(x, approx, label=f"{units} units")
ax.legend(fontsize=8)
plt.show()
```

```output
 4 hidden units: largest error 0.718
 8 hidden units: largest error 0.550
16 hidden units: largest error 0.302
32 hidden units: largest error 0.155
64 hidden units: largest error 0.078
```

Each bump uses two hidden units (one rising sigmoid, one falling), and its height is the sine at the middle of its interval, which is what the output weight would be. With 4 units (2 bumps) the approximation is crude, with a worst error of 0.72. From 8 units on, each doubling roughly halves the worst error: 0.55, 0.30, 0.16, and 0.078 with 64 units.

The theorem is reassuring, but it says nothing about **how many** units are needed, or whether training will find the right weights. Hand-placing bumps scales terribly: approximating a function of 10 inputs this way would need bumps along every direction at once. In practice, **deep** networks, with several hidden layers, can represent many functions with far fewer units than one wide layer, because each layer builds on the features of the one before: edges, then shapes, then objects, in an image network. That is the "deep" in deep learning.

::: challenge The forward pass [easy]
Write `forward(X, W1, b1, W2, b2)` for a network with one sigmoid hidden layer and a sigmoid output: return the output `sigmoid(sigmoid(X @ W1 + b1) @ W2 + b2)`. It should work for any number of examples, inputs, hidden units and outputs. Also write `count_parameters(sizes)`, which takes a list of layer sizes such as `[2, 2, 1]` and returns the total number of weights and biases.

```python starter
import numpy as np

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

def forward(X, W1, b1, W2, b2):
    return np.zeros((len(X), W2.shape[1]))

def count_parameters(sizes):
    return 0

print(count_parameters([2, 2, 1]), count_parameters([784, 128, 10]))
```

```python solution
import numpy as np

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

def forward(X, W1, b1, W2, b2):
    hidden = sigmoid(X @ W1 + b1)
    return sigmoid(hidden @ W2 + b2)

def count_parameters(sizes):
    return sum(a * b + b for a, b in zip(sizes[:-1], sizes[1:]))

print(count_parameters([2, 2, 1]), count_parameters([784, 128, 10]))
```

```python test
import numpy as _np
assert "forward" in dir() and "count_parameters" in dir(), "Keep both function names."
_s = lambda z: 1 / (1 + _np.exp(-z))
_X = _np.array([[0, 0], [0, 1], [1, 0], [1, 1]], dtype=float)
_out = forward(_X, _np.full((2, 2), 20.0), _np.array([-10.0, -30.0]), _np.array([[20.0], [-20.0]]), _np.array([-10.0]))
assert _np.shape(_out) == (4, 1), f"With 4 examples and 1 output the result should have shape (4, 1), not {_np.shape(_out)}."
assert _np.allclose(_out.ravel().round(), [0, 1, 1, 0]), "With the lesson's XOR weights, the outputs should be 0, 1, 1, 0."
_r = _np.random.default_rng(2)
_Xr, _W1, _b1, _W2, _b2 = _r.normal(size=(7, 5)), _r.normal(size=(5, 3)), _r.normal(size=3), _r.normal(size=(3, 4)), _r.normal(size=4)
assert _np.allclose(forward(_Xr, _W1, _b1, _W2, _b2), _s(_s(_Xr @ _W1 + _b1) @ _W2 + _b2)), "forward is wrong for 5 inputs, 3 hidden units and 4 outputs."
assert count_parameters([2, 2, 1]) == 9, "The XOR network 2 → 2 → 1 has (2×2 + 2) + (2×1 + 1) = 9 parameters."
assert count_parameters([784, 128, 10]) == 784 * 128 + 128 + 128 * 10 + 10, "A 784 → 128 → 10 network has 101,770 parameters."
assert count_parameters([3, 5, 5, 2]) == 3 * 5 + 5 + 5 * 5 + 5 + 5 * 2 + 2, "count_parameters should work for any number of layers."
"SUCCESS: The forward pass, layer by layer, and its bill of parameters: 101,770 for a small network that reads 28 × 28 images."
```

Hint: Compute the hidden layer first, then the output from it. For the count, pair each layer size with the next using `zip(sizes[:-1], sizes[1:])`: each pair `(a, b)` contributes `a * b` weights and `b` biases.
:::

::: challenge A square by hand [medium]
Design a network by hand that outputs (nearly) 1 for points **inside** the square −1 < x < 1, −1 < y < 1, and (nearly) 0 outside. Use 4 hidden sigmoid units, one for each side of the square, each close to 1 when the point is on the inner side of that edge (for example "x > −1" or "x < 1"), and an output unit that is 1 only when **all four** are on, like the AND neuron. Use large weights, around 20 or more, so the sigmoids act like steps.

Store your weights in `W1` (shape `(2, 4)`), `b1` (length 4), `W2` (shape `(4, 1)`) and `b2` (length 1). The check measures your network on a grid of points, ignoring a thin strip around the square's edge.

```python starter
import numpy as np

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

W1 = np.zeros((2, 4))
b1 = np.zeros(4)
W2 = np.zeros((4, 1))
b2 = np.zeros(1)

points = np.array([[0.0, 0.0], [0.5, -0.5], [2.0, 0.0], [0.0, -1.5]])
print(sigmoid(sigmoid(points @ W1 + b1) @ W2 + b2).round(3).ravel())
```

```python solution
import numpy as np

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

k = 30.0
W1 = np.array([[k, -k, 0.0, 0.0],
               [0.0, 0.0, k, -k]])
b1 = np.array([k, k, k, k])
W2 = np.full((4, 1), 20.0)
b2 = np.array([-70.0])

points = np.array([[0.0, 0.0], [0.5, -0.5], [2.0, 0.0], [0.0, -1.5]])
print(sigmoid(sigmoid(points @ W1 + b1) @ W2 + b2).round(3).ravel())
```

```python test
import numpy as _np
_s = lambda z: 1 / (1 + _np.exp(-z))
assert _np.shape(W1) == (2, 4) and _np.shape(b1) == (4,) and _np.shape(W2) == (4, 1) and _np.shape(b2) == (1,), "Keep the shapes: W1 (2, 4), b1 (4,), W2 (4, 1), b2 (1,)."
_g = _np.linspace(-2, 2, 81)
_P = _np.array([[a, b] for a in _g for b in _g])
_inside = (_np.abs(_P) < 1).all(axis=1)
_edge = (_np.abs(_np.abs(_P) - 1) < 0.15).any(axis=1)
_out = _s(_s(_P @ W1 + b1) @ W2 + b2).ravel()
_ok = ((_out > 0.5) == _inside)[~_edge]
assert _ok.mean() == 1.0, f"Away from the edges, your network is right on {_ok.mean():.1%} of the grid. Each hidden unit should switch on for one inner half-plane (for example 30·x + 30 > 0 means x > −1), and the output should need all four."
assert (_out[_inside & ~_edge] > 0.9).all() and (_out[~_inside & ~_edge] < 0.1).all(), "Make the outputs decisive (above 0.9 inside, below 0.1 outside) by using larger weights."
"SUCCESS: Four lines and an AND: a network that draws a region no single neuron could."
```

Hint: The unit for "x > −1" can have weights (k, 0) and bias k, since k·x + k > 0 exactly when x > −1. Work out the other three edges the same way. For the output, give each hidden unit the same weight and choose a bias so the score is positive only when all four are near 1, not when three are.
:::

::: challenge Collapse a linear stack [medium]
Show the collapse with biases included. Write `collapse(layers)`, where `layers` is a list of `(W, b)` pairs describing a stack of **linear** layers (no activation): each layer computes `X @ W + b`. Return a single pair `(W, b)` that computes exactly the same thing as the whole stack. Then write `run_stack(X, layers)` that applies the layers one after another, so you can compare.

```python starter
import numpy as np

def run_stack(X, layers):
    return X

def collapse(layers):
    W, b = layers[0]
    return W, b

rng = np.random.default_rng(0)
layers = [(rng.normal(size=(3, 5)), rng.normal(size=5)),
          (rng.normal(size=(5, 4)), rng.normal(size=4)),
          (rng.normal(size=(4, 2)), rng.normal(size=2))]
X = rng.normal(size=(6, 3))
W, b = collapse(layers)
print(np.allclose(run_stack(X, layers), X @ W + b))
```

```python solution
import numpy as np

def run_stack(X, layers):
    for W, b in layers:
        X = X @ W + b
    return X

def collapse(layers):
    W_total, b_total = layers[0]
    for W, b in layers[1:]:
        W_total = W_total @ W
        b_total = b_total @ W + b
    return W_total, b_total

rng = np.random.default_rng(0)
layers = [(rng.normal(size=(3, 5)), rng.normal(size=5)),
          (rng.normal(size=(5, 4)), rng.normal(size=4)),
          (rng.normal(size=(4, 2)), rng.normal(size=2))]
X = rng.normal(size=(6, 3))
W, b = collapse(layers)
print(np.allclose(run_stack(X, layers), X @ W + b))
```

```python test
import numpy as _np
assert "collapse" in dir() and "run_stack" in dir(), "Keep both function names."
_r = _np.random.default_rng(4)
_L = [(_r.normal(size=(3, 5)), _r.normal(size=5)), (_r.normal(size=(5, 4)), _r.normal(size=4)), (_r.normal(size=(4, 2)), _r.normal(size=2))]
_X = _r.normal(size=(6, 3))
_ref = ((_X @ _L[0][0] + _L[0][1]) @ _L[1][0] + _L[1][1]) @ _L[2][0] + _L[2][1]
assert _np.allclose(run_stack(_X, _L), _ref), "run_stack should apply each layer in turn: X @ W + b."
_W, _b = collapse(_L)
assert _np.shape(_W) == (3, 2) and _np.shape(_b) == (2,), f"The single layer should map 3 inputs to 2 outputs: W of shape (3, 2) and b of length 2, not {_np.shape(_W)} and {_np.shape(_b)}."
assert _np.allclose(_X @ _W + _b, _ref), "The collapsed layer gives different results. Each later layer multiplies the bias so far by its W and adds its own b."
_one = [(_r.normal(size=(2, 2)), _r.normal(size=2))]
assert _np.allclose(collapse(_one)[0], _one[0][0]) and _np.allclose(collapse(_one)[1], _one[0][1]), "A stack of one layer collapses to itself."
"SUCCESS: Any stack of linear layers, biases included, is one linear layer. Only a non-linear activation between layers makes depth worth having."
```

Hint: Write out two layers: `(X @ W1 + b1) @ W2 + b2 = X @ (W1 @ W2) + (b1 @ W2 + b2)`. Keep a running `W_total` and `b_total`, updating both for each further layer.
:::

## What you learned

- A neural network stacks layers of neurons; the hidden layers compute new features from the inputs. Two layers compute XOR (OR and not AND), which no single neuron can.
- A layer computes σ(XW + b): `W` has one column per unit, shapes must chain from layer to layer, and a layer from `a` to `b` units has `a·b + b` parameters. Computing layers in order is the forward pass.
- Without a non-linear activation, any stack of linear layers collapses into one linear layer.
- Each hidden unit draws a line; the output combines them into regions. Four hidden units surrounded the inner ring that logistic regression could not.
- A single hidden layer can approximate any continuous function (bumps from pairs of sigmoids), but may need very many units; deeper networks are usually far more efficient.

The networks here used the sigmoid because it was familiar. Before training networks, the next lesson compares activation functions (sigmoid, tanh and ReLU), their gradients, and why the choice matters so much for learning.
