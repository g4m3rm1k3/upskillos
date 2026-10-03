# The chain rule and learning

A condition-monitoring system watches a bearing's vibration level and must decide: healthy, or about to fail? Nobody writes that rule by hand; it is **learned** from past bearings whose fate is known. The learning is gradient descent from the walking-downhill lesson, and the gradient comes from one rule of calculus applied over and over: the **chain rule**, which says how to differentiate a function of a function. Every neural network, from this lesson's single neuron to the largest language model, is trained this way, by a systematic application of the chain rule called **backpropagation**. This lesson derives the chain rule, uses it to differentiate a small model by hand, checks the result numerically, trains the model to predict bearing failures, and finally builds a tiny automatic-differentiation engine that applies the chain rule by itself.

This lesson covers:

- the chain rule for compositions of functions;
- computational graphs: forward values, backward derivatives;
- a one-neuron model (logistic regression) and its loss;
- its gradient by the chain rule, and a numerical gradient check;
- training by gradient descent, and reading the learned rule;
- reverse-mode automatic differentiation in a few lines.

## The chain rule

::: math
\[ \frac{d}{dx} f\big(g(x)\big) = f'\big(g(x)\big)\cdot g'(x), \qquad \frac{dy}{dx} = \frac{dy}{du}\,\frac{du}{dx} \]
- outside derivative, evaluated at the inside, times the inside derivative
- $\dfrac{d}{dx}\sin(x^2) = \cos(x^2)\cdot 2x$
In code: `central(lambda x: math.sin(x ** 2), 1.5)` against the formula; `sp.diff` for more
:::


If y = f(g(x)), a small change Δx changes the inner value g by about g′(x)Δx, and that changes f by about f′(g(x)) times that. So

\[ \frac{dy}{dx} = f'(g(x)) \cdot g'(x) \]

the derivative of the outside, evaluated at the inside, times the derivative of the inside. In Leibniz notation, with u = g(x), dy/dx = (dy/du)(du/dx), which looks like fractions cancelling and is a good memory aid. Longer chains multiply more factors: the rate of change passes through each stage, multiplied by that stage's local rate. Predict before running: what is the derivative of sin(x²) at x = 1.5, and does a numerical slope agree?

```python
import math
import numpy as np
import matplotlib.pyplot as plt
import sympy as sp

def central(f, x, h=1e-6):
    return (f(x + h) - f(x - h)) / (2 * h)

x0 = 1.5
chain = math.cos(x0 ** 2) * 2 * x0
print(f"chain rule: cos(x²) · 2x = {chain:.8f}, numerical slope {central(lambda x: math.sin(x ** 2), x0):.8f}")

x = sp.symbols("x")
for expr in [sp.sin(x ** 2), sp.exp(-3 * x ** 2), sp.log(1 + sp.exp(2 * x)), sp.sqrt(1 + sp.sin(x) ** 2)]:
    print(f"d/dx {expr} = {sp.diff(expr, x)}")
```

SymPy applies the chain rule automatically for every nested function.

At x = 1.5 the chain rule gives about −1.885, and the numerical slope agrees to many digits. SymPy's results follow the same pattern: e^(−3x²) differentiates to −6x·e^(−3x²), and log(1 + e^(2x)) to 2e^(2x)/(1 + e^(2x)), outside derivative times inside derivative each time.

## Computational graphs

::: math
\[ a = x^2,\; b = \sin a,\; c = e^{-x},\; y = bc, \qquad \frac{dy}{dx} = \frac{dy}{da}\cdot 2x + \frac{dy}{dc}\cdot\big(-e^{-x}\big) \]
- backward pass: $\dfrac{dy}{db} = c$, $\dfrac{dy}{dc} = b$, $\dfrac{dy}{da} = \dfrac{dy}{db}\cos a$
- $x$ reaches $y$ along two paths, so their contributions add
In code: `dy_db, dy_dc = c, b`, then `dy_da = dy_db * math.cos(a)`, and so on
:::


A computer evaluates a formula as a sequence of simple steps: the **forward pass**. To differentiate, record each step's local derivative and multiply them along the chain, starting from the output and moving backwards: the **backward pass**. For y = sin(x²)·e^(−x), the steps are a = x², b = sin a, c = e^(−x), y = b·c. The backward pass reuses the forward values: dy/db = c, dy/dc = b, then dy/da = (dy/db) cos a, and x receives contributions from both paths, dy/dx = (dy/da)·2x + (dy/dc)·(−e^(−x)), added together because x feeds the output along two routes. Predict before running: does this step-by-step backward pass match the numerical slope?

```python
x0 = 1.2
a = x0 ** 2
b = math.sin(a)
c = math.exp(-x0)
y = b * c
dy_db, dy_dc = c, b
dy_da = dy_db * math.cos(a)
dy_dx = dy_da * 2 * x0 + dy_dc * (-math.exp(-x0))
print(f"forward: a = {a:.4f}, b = {b:.4f}, c = {c:.4f}, y = {y:.6f}")
print(f"backward: dy/dx = {dy_dx:.8f}, numerical {central(lambda t: math.sin(t ** 2) * math.exp(-t), x0):.8f}")
```

Each backward line multiplies the derivative arriving from the output side by one step's local derivative; where two paths meet at x, their contributions add.

The backward pass gives the same derivative as the numerical slope. This bookkeeping, each node passing back "how much does the output change per unit change in me", is backpropagation. Its cost is a small multiple (typically two to three times) of one forward pass, however many inputs there are, which is why it can compute gradients with respect to billions of parameters.

## A one-neuron model

::: math
\[ p = \sigma(wv + b), \qquad \sigma(z) = \frac{1}{1 + e^{-z}}, \qquad L = -\overline{y\log p + (1 - y)\log(1 - p)} \]
- $v$: vibration level; $y$: 1 if the bearing failed, else 0; $w$ and $b$: the parameters to learn
- an overline is the mean over all bearings in the data
- $\sigma'(z) = \sigma(z)\big(1 - \sigma(z)\big)$, so the chain rule simplifies
- $\dfrac{\partial L}{\partial w} = \overline{(p - y)\,v}$ and $\dfrac{\partial L}{\partial b} = \overline{p - y}$
In code: `sigmoid(z)`, `loss(w, b)` and `grad(w, b)`, checked against central differences
:::


To predict whether a bearing will fail within a month from its vibration level v (in mm/s), use a single **neuron**: a weighted input w·v + b passed through the **sigmoid** σ(z) = 1/(1 + e^(−z)), which squashes any number into (0, 1):

\[ p = \sigma(w v + b) \]

p is the predicted probability of failure; w and b are the parameters to learn. Training data are past bearings with label y = 1 (failed) or 0 (survived). A good loss for probabilities is the **cross-entropy**, L = −mean(y log p + (1 − y) log(1 − p)), which heavily penalises confident wrong predictions. Its gradient comes from the chain rule through three stages (z = wv + b, then p = σ(z), then L), and simplifies beautifully because σ′(z) = σ(z)(1 − σ(z)):

\[ \frac{\partial L}{\partial w} = \text{mean}\big((p - y)\, v\big), \qquad \frac{\partial L}{\partial b} = \text{mean}(p - y) \]

The error p − y, the gap between prediction and outcome, drives every update. Predict before running: do the formula and a numerical gradient agree?

```python
rng = np.random.default_rng(48)
n = 200
vib = rng.uniform(1, 12, n)
risk = 1 / (1 + np.exp(-(1.1 * vib - 7.5)))
failed = (rng.random(n) < risk).astype(float)

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

def loss(w, b):
    p = np.clip(sigmoid(w * vib + b), 1e-12, 1 - 1e-12)
    return -np.mean(failed * np.log(p) + (1 - failed) * np.log(1 - p))

def grad(w, b):
    p = sigmoid(w * vib + b)
    return np.mean((p - failed) * vib), np.mean(p - failed)

w0, b0 = 0.3, -1.0
gw, gb = grad(w0, b0)
nw = (loss(w0 + 1e-6, b0) - loss(w0 - 1e-6, b0)) / 2e-6
nb = (loss(w0, b0 + 1e-6) - loss(w0, b0 - 1e-6)) / 2e-6
print(f"chain-rule gradient ({gw:.6f}, {gb:.6f}), numerical ({nw:.6f}, {nb:.6f})")
print(f"failed bearings in the data: {int(failed.sum())} of {n}")
```

The labels are simulated: a bearing's chance of failing rises with vibration along a sigmoid curve, and each bearing then fails or not at random. The clip keeps the logarithm finite if a prediction reaches exactly 0 or 1.

The analytic gradient matches the numerical one to six decimals: the **gradient check**, the standard test that a hand-derived (or hand-coded) gradient is right. It is worth doing whenever a gradient is written by hand, because a wrong gradient still lets training run, just badly.

## Training the neuron

::: math
\[ w \leftarrow w - \eta\,\frac{\partial L}{\partial w}, \qquad b \leftarrow b - \eta\,\frac{\partial L}{\partial b}, \qquad \text{boundary: } v = -\frac{b}{w} \]
- gradient descent on the loss; $\eta$: the learning rate (0.02 here)
- predicted risk crosses 50% where $wv + b = 0$
In code: `w -= 0.02 * gw` and `b -= 0.02 * gb`, repeated 20,000 times
:::


With the gradient in hand, training is the descent loop of the walking-downhill lesson: w ← w − η ∂L/∂w, b ← b − η ∂L/∂b, repeated. As the loss falls, the predicted probabilities line up with the outcomes. The learned rule is easy to read: the predicted risk crosses 50% where wv + b = 0, at v = −b/w, the **decision boundary**. Predict before running: after training, above what vibration level does the model predict failure as more likely than not?

```python
w, b = 0.0, 0.0
history = []
for step in range(20_000):
    gw, gb = grad(w, b)
    w -= 0.02 * gw
    b -= 0.02 * gb
    if step % 4000 == 0:
        history.append((step, loss(w, b)))
for step, L in history:
    print(f"step {step:>5}: loss {L:.4f}")
print(f"learned w = {w:.3f}, b = {b:.3f}; decision boundary at {-b / w:.2f} mm/s (true risk crosses 50% at {7.5 / 1.1:.2f})")
acc = np.mean((sigmoid(w * vib + b) > 0.5) == (failed == 1))
print(f"training accuracy {acc:.1%}")

vs = np.linspace(0, 13, 200)
fig, ax = plt.subplots(figsize=(6, 3))
ax.plot(vib, failed, "o", alpha=0.3, markersize=4, label="bearings (1 = failed)")
ax.plot(vs, sigmoid(w * vs + b), label="learned risk")
ax.plot(vs, sigmoid(1.1 * vs - 7.5), "--", label="true risk")
ax.set_xlabel("vibration (mm/s)")
ax.legend(fontsize=8)
plt.show()
```

The inputs are not standardised here, so a small learning rate and many steps are needed; standardising would speed things up, as the walking-downhill lesson showed.

The loss falls steadily and the learned risk curve settles close to the true one, with the 50% boundary near 6.8 mm/s, about where the true risk crosses 50%. The model classifies most training bearings correctly; the rest are genuinely unlucky or lucky bearings that no rule based on vibration alone could predict. Everything here generalises: more inputs mean more weights, more layers mean longer chains, and the chain rule handles all of it.

## Automatic differentiation

::: math
\[ \frac{\partial y}{\partial x} = \sum_{\text{paths } x \to y}\; \prod_{\text{edges on the path}} \frac{\partial(\text{child})}{\partial(\text{parent})} \]
- every operation records its parents and the local derivatives
- the backward sweep multiplies along paths and adds across them
In code: `class Var` stores `parents` with local derivatives; `backward()` accumulates `grad`
:::


Deriving gradients by hand does not scale. **Automatic differentiation** (autodiff) does what the backward pass above did, mechanically: every arithmetic operation records its inputs and its local derivatives, building the computational graph as the forward pass runs; then a backward sweep multiplies and adds derivatives along every path. This is how PyTorch, JAX and TensorFlow compute gradients. A minimal version fits in a few lines. Predict before running: does it reproduce the hand-derived gradient of the neuron's loss for one data point?

```python
class Var:
    def __init__(self, value, parents=()):
        self.value, self.parents, self.grad = value, parents, 0.0
    def __add__(self, other):
        other = other if isinstance(other, Var) else Var(other)
        return Var(self.value + other.value, ((self, 1.0), (other, 1.0)))
    __radd__ = __add__
    def __mul__(self, other):
        other = other if isinstance(other, Var) else Var(other)
        return Var(self.value * other.value, ((self, other.value), (other, self.value)))
    __rmul__ = __mul__
    def __neg__(self):
        return self * -1.0
    def exp(self):
        e = math.exp(self.value)
        return Var(e, ((self, e),))
    def log(self):
        return Var(math.log(self.value), ((self, 1 / self.value),))
    def recip(self):
        return Var(1 / self.value, ((self, -1 / self.value ** 2),))
    def backward(self):
        order, seen = [], set()
        def visit(node):
            if id(node) not in seen:
                seen.add(id(node))
                for parent, _ in node.parents:
                    visit(parent)
                order.append(node)
        visit(self)
        self.grad = 1.0
        for node in reversed(order):
            for parent, local in node.parents:
                parent.grad += node.grad * local

wv, bv = Var(0.3), Var(-1.0)
v_i, y_i = 8.0, 1.0
p = ((-(wv * v_i + bv)).exp() + 1).recip()
L = -(y_i * p.log() + (1 - y_i) * (1 + -p).log())
L.backward()
pv = 1 / (1 + math.exp(-(0.3 * 8.0 - 1.0)))
print(f"autodiff: dL/dw = {wv.grad:.6f}, dL/db = {bv.grad:.6f}")
print(f"formula:  dL/dw = {(pv - y_i) * v_i:.6f}, dL/db = {pv - y_i:.6f}")
```

Each `Var` stores its value and, for each input, the local derivative of this operation with respect to that input. `backward` orders the graph so every node is processed after everything that depends on it, then pushes gradients back, adding contributions from every path.

The engine reproduces the formula exactly, without anyone deriving it. It never looks at the formula as a whole, only at each step's local derivative; the chain rule does the rest. Building such an engine for more operations is the hard challenge.

::: challenge Sigmoid and the chain rule [easy]
Write `sigmoid(z)` and `sigmoid_prime(z)` (= σ(z)(1 − σ(z))) for numbers or NumPy arrays. Then write `chain(outer_prime, inner, inner_prime, x)`: the derivative of outer(inner(x)) at x by the chain rule, outer′(inner(x)) × inner′(x), as a plain float. Finally write `check_gradient(f, f_prime, x, h=1e-6, tol=1e-6)`: True (a plain bool) when the central-difference slope of f at x agrees with `f_prime(x)` within `tol` relative to max(1, |f_prime(x)|).

```python starter
def sigmoid(z):
    return z

def sigmoid_prime(z):
    return 1.0

def chain(outer_prime, inner, inner_prime, x):
    return 0.0

def check_gradient(f, f_prime, x, h=1e-6, tol=1e-6):
    return True

print(sigmoid(0.0), sigmoid_prime(0.0))
```

```python solution
def sigmoid(z):
    return 1 / (1 + np.exp(-np.asarray(z, dtype=float)))

def sigmoid_prime(z):
    s = sigmoid(z)
    return s * (1 - s)

def chain(outer_prime, inner, inner_prime, x):
    return float(outer_prime(inner(x)) * inner_prime(x))

def check_gradient(f, f_prime, x, h=1e-6, tol=1e-6):
    numeric = (f(x + h) - f(x - h)) / (2 * h)
    exact = f_prime(x)
    return bool(abs(numeric - exact) <= tol * max(1.0, abs(exact)))

print(sigmoid(0.0), sigmoid_prime(0.0))
```

```python test
for _n in ["sigmoid", "sigmoid_prime", "chain", "check_gradient"]:
    assert _n in dir(), f"Define {_n}."
assert abs(float(sigmoid(0.0)) - 0.5) < 1e-15 and abs(float(sigmoid(2.0)) - 1 / (1 + math.exp(-2))) < 1e-15, "σ(0) = 0.5."
assert np.allclose(sigmoid(np.array([-1.0, 0, 1])) + sigmoid(np.array([1.0, 0, -1])), 1), "σ(−z) = 1 − σ(z), on arrays."
assert abs(float(sigmoid_prime(0.0)) - 0.25) < 1e-15 and abs(float(sigmoid_prime(1.3)) - (float(sigmoid(1.3 + 1e-6)) - float(sigmoid(1.3 - 1e-6))) / 2e-6) < 1e-8, "σ′ = σ(1 − σ)."
_d = chain(math.cos, lambda t: t * t, lambda t: 2 * t, 1.5)
assert abs(_d - math.cos(2.25) * 3) < 1e-12 and type(_d) is float, "d/dx sin(x²)."
assert abs(chain(math.exp, math.sin, math.cos, 0.7) - math.exp(math.sin(0.7)) * math.cos(0.7)) < 1e-12, "d/dx e^(sin x)."
assert check_gradient(lambda t: math.sin(t * t), lambda t: math.cos(t * t) * 2 * t, 1.5) is True, "A correct derivative passes."
assert check_gradient(lambda t: math.sin(t * t), lambda t: math.cos(t * t), 1.5) is False, "Forgetting the inner derivative fails the check."
"SUCCESS: Outside derivative at the inside, times the inside derivative, confirmed by a numerical gradient check."
```

Hint: σ(z) = 1/(1 + e^(−z)) with `np.exp`. The chain rule is `outer_prime(inner(x)) * inner_prime(x)`. For the check, compare the central difference with `f_prime(x)`.
:::

::: challenge Training a neuron [medium]
Write `cross_entropy(w, b, xs, ys)`: the mean cross-entropy loss of predictions σ(w x + b) against 0/1 labels, clipping predictions to [1e-12, 1 − 1e-12], as a plain float. Write `gradient(w, b, xs, ys)`: the tuple (mean((p − y)x), mean(p − y)) of plain floats. Then write `train(xs, ys, lr=0.1, steps=2000, standardise=True)`: when `standardise` is True, first transform x to z = (x − mean)/std (population std), train w, b from 0 on z by gradient descent, and convert back so that the returned `(w, b)` apply to the **original** x (w_x = w_z/std, b_x = b_z − w_z·mean/std); with `standardise` False, train on x directly. Return plain floats. Finally `boundary(w, b)`: the x where the predicted probability is 0.5.

```python starter
def cross_entropy(w, b, xs, ys):
    return 0.0

def gradient(w, b, xs, ys):
    return (0.0, 0.0)

def train(xs, ys, lr=0.1, steps=2000, standardise=True):
    return (0.0, 0.0)

def boundary(w, b):
    return 0.0

print(gradient(0.0, 0.0, [1.0, 2.0], [0.0, 1.0]))
```

```python solution
def _sig(z):
    return 1 / (1 + np.exp(-z))

def cross_entropy(w, b, xs, ys):
    x, y = np.asarray(xs, dtype=float), np.asarray(ys, dtype=float)
    p = np.clip(_sig(w * x + b), 1e-12, 1 - 1e-12)
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))

def gradient(w, b, xs, ys):
    x, y = np.asarray(xs, dtype=float), np.asarray(ys, dtype=float)
    err = _sig(w * x + b) - y
    return (float(np.mean(err * x)), float(np.mean(err)))

def train(xs, ys, lr=0.1, steps=2000, standardise=True):
    x = np.asarray(xs, dtype=float)
    mu, sd = (x.mean(), x.std()) if standardise else (0.0, 1.0)
    z = (x - mu) / sd
    w = b = 0.0
    for _ in range(steps):
        gw, gb = gradient(w, b, z, ys)
        w -= lr * gw
        b -= lr * gb
    return (float(w / sd), float(b - w * mu / sd))

def boundary(w, b):
    return -b / w

print(gradient(0.0, 0.0, [1.0, 2.0], [0.0, 1.0]))
```

```python test
for _n in ["cross_entropy", "gradient", "train", "boundary"]:
    assert _n in dir(), f"Define {_n}."
assert abs(cross_entropy(0, 0, [1.0, 2.0], [0, 1]) - math.log(2)) < 1e-12 and type(cross_entropy(0, 0, [1.0], [1])) is float, "At w = b = 0 every prediction is 0.5: loss ln 2."
assert gradient(0.0, 0.0, [1.0, 2.0], [0.0, 1.0]) == (0.5 * (0.5 * 1 - 0.5 * 2), 0.0), "mean((p − y)x), mean(p − y)."
_rng = np.random.default_rng(481)
_x = _rng.uniform(1, 12, 300)
_y = (_rng.random(300) < 1 / (1 + np.exp(-(1.1 * _x - 7.5)))).astype(float)
_gw, _gb = gradient(0.2, -1.0, _x, _y)
_nw = (cross_entropy(0.2 + 1e-6, -1.0, _x, _y) - cross_entropy(0.2 - 1e-6, -1.0, _x, _y)) / 2e-6
assert abs(_gw - _nw) < 1e-6, "The gradient must pass a numerical check."
_w, _b = train(_x, _y)
assert type(_w) is float and 0.7 < _w < 1.6 and 5.8 < boundary(_w, _b) < 7.6, f"The learned boundary should be near 6.8 mm/s; got w = {_w:.3f}, boundary {boundary(_w, _b):.2f}."
assert cross_entropy(_w, _b, _x, _y) < cross_entropy(0, 0, _x, _y) * 0.7, "Training must lower the loss substantially."
_w2, _b2 = train(_x, _y, lr=0.02, steps=2000, standardise=False)
assert cross_entropy(_w2, _b2, _x, _y) > cross_entropy(_w, _b, _x, _y), "Without standardising, the same number of steps gets less far."
assert boundary(2.0, -10.0) == 5.0, "p = 0.5 where w x + b = 0."
"SUCCESS: The error p − y drives every update; a few thousand chain-rule gradients turn past bearings into a failure-risk rule."
```

Hint: p = σ(w x + b); the gradient is the mean of (p − y)x and of (p − y). For standardised training, descend on z = (x − μ)/σ, then substitute back: w z + b = (w/σ)x + (b − wμ/σ).
:::

::: challenge A tiny autodiff engine [hard]
Write a class `Node` for reverse-mode automatic differentiation with a `.value`, a `.grad` (starting at 0.0), and support for `+`, `-`, `*`, `/` (each with a plain number on either side), unary minus, `**` with a plain-number exponent, and the methods `.exp()`, `.log()`, `.sin()` and `.tanh()`. Each operation returns a new `Node` that records its parents and the local derivative with respect to each. A method `.backward()` sets the output's gradient to 1 and propagates gradients to every node it depends on, **adding** contributions when a node is used more than once, and visiting nodes in an order where each node is processed only after all nodes that use it (a topological order). Then write `grad(f, *values)`: build `Node`s for the inputs, call `f` on them, run backward, and return a tuple of the inputs' gradients as plain floats. Test graphs can be more than a thousand operations deep, so build the order without recursion (an explicit stack), unlike the lesson's `Var`.

```python starter
class Node:
    def __init__(self, value, parents=()):
        self.value = value
        self.grad = 0.0
        self.parents = parents

    def backward(self):
        self.grad = 1.0

def grad(f, *values):
    return tuple(0.0 for _ in values)

print(grad(lambda a, b: a * b + a, 3.0, 4.0))
```

```python solution
class Node:
    def __init__(self, value, parents=()):
        self.value = float(value)
        self.grad = 0.0
        self.parents = parents

    @staticmethod
    def _wrap(other):
        return other if isinstance(other, Node) else Node(other)

    def __add__(self, other):
        other = Node._wrap(other)
        return Node(self.value + other.value, ((self, 1.0), (other, 1.0)))

    def __radd__(self, other):
        return self + other

    def __neg__(self):
        return Node(-self.value, ((self, -1.0),))

    def __sub__(self, other):
        return self + (-Node._wrap(other))

    def __rsub__(self, other):
        return Node._wrap(other) + (-self)

    def __mul__(self, other):
        other = Node._wrap(other)
        return Node(self.value * other.value, ((self, other.value), (other, self.value)))

    def __rmul__(self, other):
        return self * other

    def __truediv__(self, other):
        other = Node._wrap(other)
        return self * other ** -1

    def __rtruediv__(self, other):
        return Node._wrap(other) * self ** -1

    def __pow__(self, k):
        return Node(self.value ** k, ((self, k * self.value ** (k - 1)),))

    def exp(self):
        e = math.exp(self.value)
        return Node(e, ((self, e),))

    def log(self):
        return Node(math.log(self.value), ((self, 1 / self.value),))

    def sin(self):
        return Node(math.sin(self.value), ((self, math.cos(self.value)),))

    def tanh(self):
        t = math.tanh(self.value)
        return Node(t, ((self, 1 - t * t),))

    def backward(self):
        order, seen = [], set()
        stack = [(self, False)]
        while stack:
            node, done = stack.pop()
            if done:
                order.append(node)
                continue
            if id(node) in seen:
                continue
            seen.add(id(node))
            stack.append((node, True))
            for parent, _ in node.parents:
                if id(parent) not in seen:
                    stack.append((parent, False))
        self.grad = 1.0
        for node in reversed(order):
            for parent, local in node.parents:
                parent.grad += node.grad * local

def grad(f, *values):
    nodes = [Node(v) for v in values]
    out = f(*nodes)
    out.backward()
    return tuple(float(n.grad) for n in nodes)

print(grad(lambda a, b: a * b + a, 3.0, 4.0))
```

```python test
for _n in ["Node", "grad"]:
    assert _n in dir(), f"Define {_n}."
def _num(f, vals, i, h=1e-6):
    up, dn = list(vals), list(vals)
    up[i] += h; dn[i] -= h
    return (f(*up) - f(*dn)) / (2 * h)
assert grad(lambda a, b: a * b + a, 3.0, 4.0) == (5.0, 3.0), "d(ab + a)/da = b + 1, /db = a."
assert grad(lambda a: a * a * a, 2.0) == (12.0,), "A node used several times accumulates its gradient."
def _shared(a, b):
    u = a * b
    return u * u + u.sin() - u / 2
assert abs(grad(_shared, 0.7, 1.3)[0] - (2 * 0.91 + math.cos(0.91) - 0.5) * 1.3) < 1e-9, "An intermediate node used several times must collect all its gradient before passing it on: process nodes in topological order."
_cases = [
    (lambda a, b: (a * b).sin() + (a / b).exp(), lambda a, b: math.sin(a * b) + math.exp(a / b), (1.3, 0.7)),
    (lambda a, b: (a ** 3 - 2 * b).tanh() * a, lambda a, b: math.tanh(a ** 3 - 2 * b) * a, (0.6, 0.2)),
    (lambda a, b: (1 + (-a * b).exp()).log() - 3 / a, lambda a, b: math.log(1 + math.exp(-a * b)) - 3 / a, (0.9, -1.4)),
    (lambda a, b: 1 / (1 + (-(a * 2.5 + b)).exp()), lambda a, b: 1 / (1 + math.exp(-(a * 2.5 + b))), (0.4, -0.3)),
    (lambda a, b: (5 - a) * (b - 2) / (a ** 2 + 1), lambda a, b: (5 - a) * (b - 2) / (a * a + 1), (1.7, 3.1)),
]
for _f, _plain, _vals in _cases:
    _g = grad(_f, *_vals)
    for _i in range(len(_vals)):
        assert abs(_g[_i] - _num(_plain, _vals, _i)) < 1e-6, f"Gradient mismatch for argument {_i} at {_vals}: {_g[_i]} vs {_num(_plain, _vals, _i)}."
    assert all(type(_v) is float for _v in _g), "Plain floats."
_chain_f = lambda a: (((a.sin() * 1.1).sin() * 1.1).sin() * 1.1).sin()
_chain_p = lambda a: math.sin(math.sin(math.sin(math.sin(a) * 1.1) * 1.1) * 1.1)
assert abs(grad(_chain_f, 0.8)[0] - _num(_chain_p, (0.8,), 0)) < 1e-6, "A long chain of compositions."
def _long(a):
    s = a
    for _ in range(600):
        s = s * 0.99 + a * 0.01
    return s
assert abs(grad(_long, 2.0)[0] - 1.0) < 1e-6, "A 600-step graph: avoid a recursive traversal, which can hit the recursion limit on deep graphs."
"SUCCESS: Every operation knows only its own local derivative; a topological backward sweep chains them all into exact gradients."
```

Hint: Store `parents` as pairs `(node, local_derivative)`. In `backward`, collect the nodes in topological order with an explicit stack (to avoid deep recursion), set the output's grad to 1, then walk the order in reverse doing `parent.grad += node.grad * local`.
:::

## What you learned

- The chain rule: the derivative of f(g(x)) is f′(g(x)) g′(x); longer chains multiply more local derivatives.
- A computational graph evaluates a formula forwards; the backward pass multiplies local derivatives from the output back, adding contributions where paths meet. That is backpropagation.
- A one-neuron model p = σ(wv + b) with cross-entropy loss has the simple gradient mean((p − y)v), mean(p − y); a numerical gradient check confirms hand-derived gradients.
- Gradient descent on that loss learns a decision rule from data; the boundary is where wv + b = 0.
- Automatic differentiation records each operation's local derivatives and applies the chain rule mechanically, as deep-learning frameworks do.

The next lesson solves equations that algebra cannot, by bisection, Newton's method and their relatives.
