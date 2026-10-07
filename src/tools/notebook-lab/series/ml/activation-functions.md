# Activation functions

The last lesson showed that the non-linear function between layers is what makes depth worth having. It used the sigmoid because you knew it from logistic regression. For training deep networks, the sigmoid turns out to be a poor choice, and the reason why is one of the most important practical facts about neural networks: **gradients have to travel backwards through every layer**, and the activation function decides whether they arrive intact, shrink to nothing, or blow up.

This lesson compares the main activation functions (sigmoid, tanh, ReLU and its variants), works out their derivatives, and runs a 20-layer network to watch gradients **vanish** and **explode**. It ends with how the choice of starting weights interacts with the activation, and which activation to use where.

## The candidates

- **Sigmoid**: σ(z) = 1/(1 + e^(−z)), from 0 to 1.
- **tanh** (hyperbolic tangent): (e^z − e^(−z))/(e^z + e^(−z)), from −1 to 1. It is a stretched and shifted sigmoid, tanh(z) = 2σ(2z) − 1, but centred on zero.
- **ReLU** (rectified linear unit): max(0, z). Zero for negative inputs, the identity for positive ones.
- **Leaky ReLU**: max(0.01z, z), a ReLU with a small slope for negative inputs.

Training needs their **derivatives**, since gradients pass through each activation on the way back (the next lesson does this in full):

- σ′(z) = σ(z)(1 − σ(z)), which is at most 0.25, at z = 0.
- tanh′(z) = 1 − tanh(z)², at most 1, at z = 0.
- ReLU′(z) = 1 for z > 0 and 0 for z < 0 (at exactly 0 either value is used, by convention 0).

```python type
import numpy as np
import matplotlib.pyplot as plt

z = np.linspace(-5, 5, 400)
sigmoid = 1 / (1 + np.exp(-z))
tanh = np.tanh(z)
relu = np.maximum(0, z)
leaky = np.maximum(0.01 * z, z)

fig, axes = plt.subplots(1, 2, figsize=(10, 3.5))
for values, name in [(sigmoid, "sigmoid"), (tanh, "tanh"), (relu, "ReLU"), (leaky, "leaky ReLU")]:
    axes[0].plot(z, values, label=name)
for values, name in [(sigmoid * (1 - sigmoid), "sigmoid"), (1 - tanh ** 2, "tanh"), ((z > 0).astype(float), "ReLU")]:
    axes[1].plot(z, values, label=name)
axes[0].set_ylim(-1.5, 3)
axes[0].set_title("activation", fontsize=9)
axes[1].set_title("derivative", fontsize=9)
for ax in axes:
    ax.legend(fontsize=8)
    ax.axhline(0, color="grey", linewidth=0.5)
plt.show()
```

Look at the right-hand plot. The sigmoid's derivative never exceeds 0.25, and both it and tanh's derivative fall to almost zero once |z| is more than about 3: the curves are flat there, or **saturated**. ReLU's derivative is exactly 1 for every positive input, however large.

## Why small derivatives are a problem

By the chain rule, the gradient that reaches an early layer is a **product** with one factor per layer above it, and each factor includes the activation's derivative. Multiply many numbers below 1 and the product shrinks exponentially. Predict before running: if each of 20 layers contributes the sigmoid's best-case factor of 0.25, how big is the product?

```python type
for layers in [1, 5, 10, 20]:
    print(f"{layers:>2} layers: 0.25 ** {layers} = {0.25 ** layers:.1e}")
```

```output
 1 layers: 0.25 ** 1 = 2.5e-01
 5 layers: 0.25 ** 5 = 9.8e-04
10 layers: 0.25 ** 10 = 9.5e-07
20 layers: 0.25 ** 20 = 9.1e-13
```

After 20 layers, even in the best case, the factor is about 10⁻¹². The gradient for the first layers is a trillion times smaller than for the last: those layers barely learn at all. This is the **vanishing gradient problem**, and for years it made networks deeper than a few layers nearly impossible to train.

## Watching it in a 20-layer network

Real networks also multiply by weight matrices on the way back, which can enlarge or shrink the gradient, so the full story depends on the weights too. Here is a 20-layer network with 100 units per layer. The weights start random, and the cell runs 500 random inputs forward, then sends a gradient backwards (the gradient of the sum of the outputs with respect to each layer's input) and measures its average size when it reaches the network's input:

```python type
import numpy as np

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

activations = {
    "sigmoid": (sigmoid, lambda z: sigmoid(z) * (1 - sigmoid(z))),
    "tanh": (np.tanh, lambda z: 1 - np.tanh(z) ** 2),
    "ReLU": (lambda z: np.maximum(0, z), lambda z: (z > 0).astype(float)),
}

def run(name, weight_scale, layers=20, width=100):
    f, df = activations[name]
    rng = np.random.default_rng(0)
    a = rng.normal(size=(500, width))
    weights, scores = [], []
    for _ in range(layers):
        W = rng.normal(0, weight_scale, (width, width))
        z = a @ W
        a = f(z)
        weights.append(W)
        scores.append(z)
    gradient = np.ones_like(a)
    for W, z in zip(reversed(weights), reversed(scores)):
        gradient = (gradient * df(z)) @ W.T
    return a.std(), np.abs(gradient).mean()

for name, scale, label in [("sigmoid", np.sqrt(1 / 100), "scaled 1/√n"), ("tanh", np.sqrt(1 / 100), "scaled 1/√n"),
                           ("ReLU", np.sqrt(2 / 100), "scaled √(2/n)"), ("ReLU", 1.0, "standard deviation 1")]:
    spread, gradient = run(name, scale)
    print(f"{name:<8} weights {label:<21} last layer's spread {spread:9.3g}, gradient reaching the input {gradient:9.3g}")
```

```output
sigmoid  weights scaled 1/√n           last layer's spread     0.109, gradient reaching the input  1.83e-13
tanh     weights scaled 1/√n           last layer's spread     0.151, gradient reaching the input     0.135
ReLU     weights scaled √(2/n)         last layer's spread      1.21, gradient reaching the input      3.19
ReLU     weights standard deviation 1  last layer's spread  1.19e+17, gradient reaching the input  3.12e+17
```

Going backwards, `gradient * df(z)` multiplies by the activation's derivative, and `@ W.T` carries the gradient back through the weights; the next lesson derives both steps. The weights are drawn with a standard deviation that shrinks with the layer's width `n` (100 here), for a reason explained below.

The results:

- **Sigmoid**: the gradient reaching the input is about 2 × 10⁻¹³. It has vanished.
- **tanh**: about 0.14, much healthier. tanh's derivative is 1 near zero, four times the sigmoid's, and its outputs are centred on zero, which keeps later layers' inputs balanced.
- **ReLU** with weights scaled by √(2/n): the gradient arrives at about 3, and the activations keep a steady spread through all 20 layers.
- **ReLU** with weights of standard deviation 1: the activations grow by about a factor of 7 per layer, reaching around 10¹⁷, and the gradient explodes just as badly. This is the opposite failure, **exploding gradients**: every training step would be enormous.

## Initialisation matters as much as the activation

The last two lines differ only in how big the starting weights are. A unit with `n` inputs adds up `n` products, so if every weight has standard deviation s, its score has a spread of roughly s√n times its inputs' spread. To keep the spread the same from layer to layer, s should be about 1/√n. ReLU zeroes out half its inputs on average, losing half the variance, so it needs s = √(2/n) to compensate. These rules are called **Xavier** (or Glorot) initialisation, for tanh and sigmoid, and **He** initialisation, for ReLU. (Strictly, Glorot's rule averages a layer's inputs and outputs, √(2/(n_in + n_out)); for a square layer it is 1/√n.) With rules like these, a deep network starts in a state where signals and gradients can travel through every layer. Libraries default to rules of this kind: Keras uses Glorot's, PyTorch a close variant.

## Dead ReLUs

ReLU has its own failure. A unit whose score is negative for **every** input outputs 0 always, and its derivative is 0 always, so no gradient ever reaches its weights: it can never recover. It is a **dead** unit. This happens when a large training step pushes a unit's bias far negative, and a network can lose a large fraction of its units this way. **Leaky ReLU** keeps a small slope (0.01) for negative inputs, so a unit with only negative scores still gets a little gradient and can climb back. Smooth variants such as **SiLU** (also called swish), z·σ(z), and the similar **GELU** behave like ReLU for large inputs but are smooth near zero; they are the usual choice in modern transformer models.

## Which activation where

- **Hidden layers**: ReLU, with He initialisation, is the default: cheap to compute, no saturation for positive inputs, and it trains deep networks well. Try leaky ReLU if many units die; GELU or SiLU in transformer-style models.
- **Output layer**: chosen by the task, not for gradients. Sigmoid for a yes/no probability, softmax for one of several classes, and **no activation** (the identity) for predicting a number, so that any value can be produced.
- **Sigmoid and tanh inside a network** survive mainly in special roles: the sigmoid as a "gate" that must output a value between 0 and 1, and tanh to squash values into −1 to 1 (you will see both in the LSTM lesson).

::: challenge Activations and their slopes [easy]
Write the four activations `sigmoid(z)`, `tanh(z)`, `relu(z)` and `leaky_relu(z)` (slope 0.01 for negative inputs), and their derivatives `d_sigmoid(z)`, `d_tanh(z)`, `d_relu(z)` (0 for z ≤ 0) and `d_leaky_relu(z)` (0.01 for z ≤ 0). All must work on NumPy arrays. Write tanh from exponentials rather than calling `np.tanh`.

```python starter
import numpy as np

def sigmoid(z):
    return z

def tanh(z):
    return z

def relu(z):
    return z

def leaky_relu(z):
    return z

def d_sigmoid(z):
    return np.ones_like(z)

def d_tanh(z):
    return np.ones_like(z)

def d_relu(z):
    return np.ones_like(z)

def d_leaky_relu(z):
    return np.ones_like(z)
```

```python solution
import numpy as np

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

def tanh(z):
    return (np.exp(z) - np.exp(-z)) / (np.exp(z) + np.exp(-z))

def relu(z):
    return np.maximum(0, z)

def leaky_relu(z):
    return np.where(z > 0, z, 0.01 * z)

def d_sigmoid(z):
    s = sigmoid(z)
    return s * (1 - s)

def d_tanh(z):
    return 1 - tanh(z) ** 2

def d_relu(z):
    return (z > 0).astype(float)

def d_leaky_relu(z):
    return np.where(z > 0, 1.0, 0.01)
```

```python test
import numpy as _np
_names = ["sigmoid", "tanh", "relu", "leaky_relu", "d_sigmoid", "d_tanh", "d_relu", "d_leaky_relu"]
_defined = dir()
assert all(n in _defined for n in _names), "Keep all eight function names."
assert "np.tanh" not in _source, "Write tanh from exponentials rather than calling np.tanh."
_z = _np.array([-3.0, -0.5, 0.7, 2.0])
assert _np.allclose(sigmoid(_z), 1 / (1 + _np.exp(-_z))), "sigmoid is wrong."
assert _np.allclose(tanh(_z), _np.tanh(_z)), "tanh is wrong: (e^z − e^(−z)) / (e^z + e^(−z))."
assert _np.allclose(relu(_z), [0, 0, 0.7, 2.0]), "relu should be max(0, z)."
assert _np.allclose(leaky_relu(_z), [-0.03, -0.005, 0.7, 2.0]), "leaky_relu should be z for positive z and 0.01·z otherwise."
for _f, _df in [(sigmoid, d_sigmoid), (tanh, d_tanh), (relu, d_relu), (leaky_relu, d_leaky_relu)]:
    _num = (_f(_z + 1e-6) - _f(_z - 1e-6)) / 2e-6
    assert _np.allclose(_df(_z), _num, atol=1e-5), f"{_df.__name__} does not match the numerical slope of {_f.__name__}."
assert _np.isclose(d_sigmoid(_np.array([0.0]))[0], 0.25) and _np.isclose(d_tanh(_np.array([0.0]))[0], 1.0), "At z = 0 the sigmoid's slope is 0.25 and tanh's is 1."
assert d_relu(_np.array([0.0]))[0] == 0 and _np.isclose(d_leaky_relu(_np.array([0.0]))[0], 0.01), "At exactly 0, use slope 0 for ReLU and 0.01 for leaky ReLU."
"SUCCESS: Four activations and the slopes that decide how gradients flow back through them."
```

Hint: `np.maximum(0, z)` is ReLU; `np.where(z > 0, a, b)` picks between two values element by element, which suits the leaky versions. The derivatives can reuse the activations: `s * (1 - s)` and `1 - tanh(z) ** 2`.
:::

::: challenge A gradient down a chain [medium]
Take the simplest deep network: one unit per layer, so each layer computes aₖ₊₁ = f(wₖ · aₖ), with input a₀ = x. Write `chain_gradient(x, weights, f, df)` that returns the derivative of the final output with respect to x, using the chain rule: run forward, remembering each layer's score zₖ = wₖ · aₖ, and multiply together the factors `df(z) * w` for every layer.

Then, with x = 0.5, compute the derivative through 20 layers whose weights are all 1, for the sigmoid (store in `grad_sigmoid`) and for tanh (`grad_tanh`); and through 20 layers whose weights are all 1.2 for ReLU (`grad_relu`). The starter defines the activations.

```python starter
import numpy as np

sigmoid = lambda z: 1 / (1 + np.exp(-z))
d_sigmoid = lambda z: sigmoid(z) * (1 - sigmoid(z))
d_tanh = lambda z: 1 - np.tanh(z) ** 2
relu = lambda z: np.maximum(0, z)
d_relu = lambda z: float(z > 0)

def chain_gradient(x, weights, f, df):
    return 1.0

grad_sigmoid = chain_gradient(0.5, [1.0] * 20, sigmoid, d_sigmoid)
grad_tanh = chain_gradient(0.5, [1.0] * 20, np.tanh, d_tanh)
grad_relu = chain_gradient(0.5, [1.2] * 20, relu, d_relu)
print(grad_sigmoid, grad_tanh, grad_relu)
```

```python solution
import numpy as np

sigmoid = lambda z: 1 / (1 + np.exp(-z))
d_sigmoid = lambda z: sigmoid(z) * (1 - sigmoid(z))
d_tanh = lambda z: 1 - np.tanh(z) ** 2
relu = lambda z: np.maximum(0, z)
d_relu = lambda z: float(z > 0)

def chain_gradient(x, weights, f, df):
    a = x
    gradient = 1.0
    for w in weights:
        z = w * a
        gradient *= df(z) * w
        a = f(z)
    return float(gradient)

grad_sigmoid = chain_gradient(0.5, [1.0] * 20, sigmoid, d_sigmoid)
grad_tanh = chain_gradient(0.5, [1.0] * 20, np.tanh, d_tanh)
grad_relu = chain_gradient(0.5, [1.2] * 20, relu, d_relu)
print(grad_sigmoid, grad_tanh, grad_relu)
```

```python test
import numpy as _np
assert "chain_gradient" in dir(), "Keep the function's name as chain_gradient."
_s = lambda z: 1 / (1 + _np.exp(-z))
def _out(x, ws, f):
    for w in ws:
        x = f(w * x)
    return x
for _ws, _f, _df in [([0.8, -1.3, 2.0], _s, lambda z: _s(z) * (1 - _s(z))), ([1.5, 0.7, -0.9, 1.1], _np.tanh, lambda z: 1 - _np.tanh(z) ** 2)]:
    _num = (_out(0.3 + 1e-6, _ws, _f) - _out(0.3 - 1e-6, _ws, _f)) / 2e-6
    assert _np.isclose(chain_gradient(0.3, _ws, _f, _df), _num, rtol=1e-4), "chain_gradient disagrees with the numerical derivative of the chain. Multiply df(z) * w for each layer, with z computed from that layer's input."
assert _np.isclose(grad_sigmoid, chain_gradient(0.5, [1.0] * 20, _s, lambda z: _s(z) * (1 - _s(z)))), "grad_sigmoid is wrong."
assert grad_sigmoid < 1e-12, "Through 20 sigmoid layers the derivative should be tiny."
assert _np.isclose(grad_tanh, chain_gradient(0.5, [1.0] * 20, _np.tanh, lambda z: 1 - _np.tanh(z) ** 2)), "grad_tanh is wrong."
assert _np.isclose(grad_relu, 1.2 ** 20), "For ReLU with positive inputs every factor is 1 × 1.2, so the gradient is 1.2²⁰."
f"SUCCESS: Through 20 layers: sigmoid {grad_sigmoid:.1e} (vanished), tanh {grad_tanh:.1e} (shrinking), ReLU with weights 1.2 {grad_relu:.0f} (exploding). Keeping gradients near 1 is what good activations and initialisation are for."
```

Hint: Keep two running values: the current activation and the gradient so far. Each layer contributes one factor to the chain rule: the derivative of f(w·a) with respect to a. Remember that it depends on that layer's own score.
:::

::: challenge Count the dead [medium]
A ReLU unit is **dead** on a dataset if its score is at or below zero for every example, so it always outputs 0 and never receives gradient. Write `dead_fraction(X, W, b)` returning the fraction of the layer's units (columns of `W`) that are dead on the data `X`, where the scores are `X @ W + b`.

The starter has a layer whose biases were pushed strongly negative by a bad training step. Store its dead fraction in `dead_before`. Then make a fixed copy of the biases, `fixed_b`: add 3 to the bias of every dead unit and leave the others alone. Store the dead fraction with the fixed biases in `dead_after`.

```python starter
import numpy as np

def dead_fraction(X, W, b):
    return 0.0

rng = np.random.default_rng(3)
X = rng.normal(size=(200, 10))
W = rng.normal(0, 0.3, (10, 50))
b = rng.normal(-1.5, 1.0, 50)

dead_before = dead_fraction(X, W, b)
dead_after = dead_before
print(dead_before, dead_after)
```

```python solution
import numpy as np

def dead_fraction(X, W, b):
    scores = X @ W + b
    return float(np.mean((scores <= 0).all(axis=0)))

rng = np.random.default_rng(3)
X = rng.normal(size=(200, 10))
W = rng.normal(0, 0.3, (10, 50))
b = rng.normal(-1.5, 1.0, 50)

dead_before = dead_fraction(X, W, b)
dead = ((X @ W + b) <= 0).all(axis=0)
fixed_b = b + 3 * dead
dead_after = dead_fraction(X, W, fixed_b)
print(dead_before, dead_after)
```

```python test
import numpy as _np
assert "dead_fraction" in dir(), "Keep the function's name as dead_fraction."
_X = _np.array([[1.0], [2.0], [-1.0]])
_W = _np.array([[1.0, -1.0, 0.0]])
_b = _np.array([0.0, -5.0, -1.0])
assert _np.isclose(dead_fraction(_X, _W, _b), 2 / 3), "In the small example, units 2 and 3 never score above 0, so 2 of 3 are dead. A unit is dead only if it is at or below zero for EVERY example (check each column)."
assert _np.isclose(dead_fraction(_X, _W, _np.array([0.0, 10.0, 0.5])), 0.0), "With these biases every unit fires for some example, so none are dead."
_r = _np.random.default_rng(3)
_XX = _r.normal(size=(200, 10))
_WW = _r.normal(0, 0.3, (10, 50))
_bb = _r.normal(-1.5, 1.0, 50)
_dead = ((_XX @ _WW + _bb) <= 0).all(axis=0)
assert _np.isclose(dead_before, _dead.mean()), f"dead_before should be {_dead.mean():.2f}."
assert "fixed_b" in dir() and _np.allclose(fixed_b, _bb + 3 * _dead), "fixed_b should be b with 3 added to the dead units' biases only."
assert _np.isclose(dead_after, (((_XX @ _WW + _bb + 3 * _dead) <= 0).all(axis=0)).mean()), "dead_after should be the dead fraction with fixed_b."
assert dead_after < dead_before, "Raising the dead units' biases should revive some of them."
f"SUCCESS: {dead_before:.0%} of the units were dead; with their biases raised, {dead_after:.0%}. In training nothing would ever raise them, since dead units get no gradient: that is why leaky ReLU keeps a small slope."
```

Hint: `(scores <= 0).all(axis=0)` is `True` for each column that is never positive; its mean is the dead fraction. Adding `3 * dead` (a boolean array, so 3 or 0) to `b` raises only the dead units' biases.
:::

## What you learned

- Sigmoid (0 to 1, slope at most 0.25), tanh (−1 to 1, zero-centred, slope at most 1), ReLU (max(0, z), slope 0 or 1) and leaky ReLU (slope 0.01 for negatives) are the main activations.
- Gradients reaching early layers are products of per-layer factors. Factors below 1 make them vanish (0.25²⁰ ≈ 10⁻¹²); factors above 1 make them explode.
- In a 20-layer network, sigmoid gradients vanished (10⁻¹³); ReLU with He initialisation kept them healthy; ReLU with unscaled weights exploded to 10¹⁷.
- Initialise weights with standard deviation 1/√n (Xavier, for tanh) or √(2/n) (He, for ReLU) so signals keep their spread layer to layer.
- ReLU units can die (never active, never updated); leaky ReLU, GELU and SiLU make this much rarer.
- Use ReLU-family activations in hidden layers; choose the output activation by the task (sigmoid, softmax, or none for numbers).

The lesson kept saying "the gradient flows backwards". The next lesson makes that precise: backpropagation, worked through by hand on a small network, step by step with the chain rule.
