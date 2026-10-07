# Backpropagation by hand

To train a network by gradient descent you need the gradient of the loss with respect to **every** weight in every layer. For logistic regression you derived it once, by hand: Xᵀ(p − y)/n. A network has many layers, each feeding the next, and a modern one has millions of weights. **Backpropagation** is the method that computes all of those gradients at once, at a cost of roughly one extra pass through the network. It is nothing more than the chain rule from the gradients lesson, applied systematically from the output back towards the input, reusing results along the way.

This lesson does it by hand: first on a tiny expression drawn as a **computational graph**, then on a small network, one example and then a whole batch in matrix form, checked against numerical gradients. Then the network is trained on XOR with gradients you computed yourself.

## A computational graph

Any calculation can be broken into small steps, each a simple operation on one or two values. Take

\[
g = (a \cdot b + c) \cdot d
\]

with a = 2, b = −3, c = 10, d = −2. As steps: e = a·b = −6; f = e + c = 4; g = f·d = −8. Drawn as a graph, values flow forward from the inputs a, b, c, d through e and f to the output g. That is the **forward pass**.

Now the **backward pass**: how much does g change when each input changes? Work backwards from g, where ∂g/∂g = 1. At each step you need only the step's own **local derivative**, then the chain rule multiplies:

- g = f·d, so ∂g/∂f = d = −2, and ∂g/∂d = f = 4.
- f = e + c: adding passes the gradient through unchanged, so ∂g/∂e = ∂g/∂f × 1 = −2, and ∂g/∂c = −2.
- e = a·b: so ∂g/∂a = ∂g/∂e × b = (−2)(−3) = 6, and ∂g/∂b = ∂g/∂e × a = (−2)(2) = −4.

```python type
a, b, c, d = 2.0, -3.0, 10.0, -2.0

e = a * b
f = e + c
g = f * d
print("forward:", e, f, g)

grad_g = 1.0
grad_f = grad_g * d
grad_d = grad_g * f
grad_e = grad_f * 1.0
grad_c = grad_f * 1.0
grad_a = grad_e * b
grad_b = grad_e * a
print("backward: dg/da", grad_a, " dg/db", grad_b, " dg/dc", grad_c, " dg/dd", grad_d)

nudge = 1e-6
print("check dg/da by nudging a:", ((((a + nudge) * b + c) * d) - g) / nudge)
```

```output
forward: -6.0 4.0 -8.0
backward: dg/da 6.0  dg/db -4.0  dg/dc -2.0  dg/dd 4.0
check dg/da by nudging a: 6.000000000838668
```

Two patterns recur everywhere. An **addition** passes the incoming gradient to both inputs unchanged. A **multiplication** sends each input the incoming gradient times the **other** input. And one more rule, for when a value is used in several places: its gradient is the **sum** of the gradients arriving along each path. (If x feeds into both u and v, a change in x changes g through both.)

The crucial efficiency is that each step's gradient is computed once and reused by everything before it. The gradient with respect to f was computed once and then used for both e and c. In a deep network, the gradient at a late layer is computed once and serves every earlier layer.

## One example through a small network

Now a network with 2 inputs, 2 tanh hidden units and a sigmoid output, trained with log loss. For one example `x` with label `y`, the forward pass is:

- z₁ = x W₁ + b₁ (hidden scores), h = tanh(z₁) (hidden outputs)
- z₂ = h · w₂ + b₂ (output score), p = σ(z₂) (predicted probability)
- L = −[y ln p + (1 − y) ln(1 − p)]

Backwards, one step at a time:

1. From the logistic regression lesson, the loss and sigmoid together give ∂L/∂z₂ = p − y. Call this δ₂, the output's **error signal**.
2. z₂ = h · w₂ + b₂ is a weighted sum, so ∂L/∂w₂ = δ₂ · h (each weight's gradient is the error times the input it multiplied), ∂L/∂b₂ = δ₂, and the gradient flowing back to each hidden output is ∂L/∂h = δ₂ · w₂.
3. Through the tanh, multiply by its local derivative, tanh′(z₁) = 1 − tanh(z₁)² = 1 − h²: δ₁ = (δ₂ · w₂) ⊙ (1 − h²). Here ⊙ means multiplying element by element.
4. z₁ = x W₁ + b₁, so by the same "error times the input it multiplied" rule as step 2, ∂L/∂W₁ = the outer product of x and δ₁ (entry [i, j] is xᵢ × δ₁ⱼ), and ∂L/∂b₁ = δ₁.

```python type
import numpy as np

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

def loss(x, y, W1, b1, w2, b2):
    p = sigmoid(np.tanh(x @ W1 + b1) @ w2 + b2)
    return -(y * np.log(p) + (1 - y) * np.log(1 - p))

rng = np.random.default_rng(1)
W1, b1 = rng.normal(size=(2, 2)), rng.normal(size=2)
w2, b2 = rng.normal(size=2), 0.1
x, y = np.array([0.5, -1.0]), 1.0

h = np.tanh(x @ W1 + b1)
p = sigmoid(h @ w2 + b2)

delta2 = p - y
grad_w2 = delta2 * h
grad_b2 = delta2
delta1 = (delta2 * w2) * (1 - h ** 2)
grad_W1 = np.outer(x, delta1)
grad_b1 = delta1
print("backprop gradient for W1:\n", grad_W1.round(6))

numeric = np.zeros_like(W1)
for i in range(2):
    for j in range(2):
        up, down = W1.copy(), W1.copy()
        up[i, j] += 1e-6
        down[i, j] -= 1e-6
        numeric[i, j] = (loss(x, y, up, b1, w2, b2) - loss(x, y, down, b1, w2, b2)) / 2e-6
print("numerical gradient for W1:\n", numeric.round(6))
```

```output
backprop gradient for W1:
 [[ 0.067358 -0.006308]
 [-0.134715  0.012617]]
numerical gradient for W1:
 [[ 0.067358 -0.006308]
 [-0.134715  0.012617]]
```

`np.outer(x, delta1)` makes the 2 × 2 table of products xᵢ δ₁ⱼ. The two printouts agree to six decimal places. Notice how the computation reused δ₂ for everything in the output layer and for building δ₁, and δ₁ for everything in the hidden layer. Each layer passes its error signal back to the one before, which is the whole algorithm.

## A batch in matrix form

For a batch of `n` examples, stack them as rows, exactly as in the forward pass. The loss is the **mean** of the per-example losses, so its gradient is the mean of the per-example gradients. Matrix products compute exactly those sums: Hᵀ Δ₂, for instance, adds up every example's outer product of hᵢ and δ₂ᵢ, and putting the 1/n into Δ₂ turns the sum into the mean. So the same four steps become matrix operations:

- Δ₂ = (P − Y) / n, one row per example
- ∂L/∂W₂ = Hᵀ Δ₂, and ∂L/∂b₂ = the column sums of Δ₂
- Δ₁ = (Δ₂ W₂ᵀ) ⊙ (1 − H²)
- ∂L/∂W₁ = Xᵀ Δ₁, and ∂L/∂b₁ = the column sums of Δ₁

The pattern for every layer is the same: the weight gradient is (the layer's input)ᵀ times (its error signal); the signal sent back is (the error signal) times (the weights)ᵀ, multiplied by the activation's derivative. The transposes are exactly what make the shapes fit: `Hᵀ Δ₂` has the shape of `W₂`. The factor 1/n appears once, in Δ₂, and flows through everything else. The first step should look familiar: for a network with no hidden layer, it is exactly logistic regression's gradient, Xᵀ(p − y)/n.

## Training XOR with your own gradients

Put it all together: a 2 → 3 → 1 network with tanh hidden units, trained on the four XOR cases by gradient descent using the batch formulas. Before running, predict: will both random starting points learn XOR?

```python type
import numpy as np

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]], dtype=float)
Y = np.array([[0], [1], [1], [0]], dtype=float)

for seed in [0, 2]:
    rng = np.random.default_rng(seed)
    W1, b1 = rng.normal(size=(2, 3)), np.zeros(3)
    W2, b2 = rng.normal(size=(3, 1)), np.zeros(1)
    for epoch in range(1, 2001):
        H = np.tanh(X @ W1 + b1)
        P = sigmoid(H @ W2 + b2)
        loss = -np.mean(Y * np.log(P) + (1 - Y) * np.log(1 - P))

        D2 = (P - Y) / len(X)
        grad_W2, grad_b2 = H.T @ D2, D2.sum(axis=0)
        D1 = (D2 @ W2.T) * (1 - H ** 2)
        grad_W1, grad_b1 = X.T @ D1, D1.sum(axis=0)

        W1 -= 1.0 * grad_W1
        b1 -= 1.0 * grad_b1
        W2 -= 1.0 * grad_W2
        b2 -= 1.0 * grad_b2
        if epoch in (1, 100, 2000):
            print(f"seed {seed}, epoch {epoch:>4}: loss {loss:.4f}")
    print(f"seed {seed}: predictions {P.ravel().round(3)}\n")
```

```output
seed 0, epoch    1: loss 0.7435
seed 0, epoch  100: loss 0.0494
seed 0, epoch 2000: loss 0.0013
seed 0: predictions [0.    0.998 0.998 0.002]

seed 2, epoch    1: loss 0.8420
seed 2, epoch  100: loss 0.3799
seed 2, epoch 2000: loss 0.3474
seed 2: predictions [0.001 0.499 0.999 0.5  ]
```

Each pass through the four examples is called an **epoch**. From seed 0, the loss falls from 0.74 to 0.05 within 100 epochs and keeps falling; the predictions are essentially 0, 1, 1, 0. The network has learned XOR, with every gradient computed by the four lines in the middle of the loop.

From seed 2, the loss falls at first and then stalls around 0.35, with predictions of 0, 0.5, 1 and 0.5: half the cases are left at "no idea". The network is stuck in a poor solution that small gradient steps cannot escape. Unlike logistic regression, whose loss is a single bowl, a network's loss surface has many hollows and flat regions, and where training ends up can depend on where it starts. The training lessons ahead deal with this in practice: larger networks, better initialisation and better optimisers make such failures rare.

## Why it is efficient

You could get every gradient numerically instead: nudge each weight, rerun the network, measure the change. That costs one or two forward passes **per weight**: for a million weights, millions of passes per training step. Backpropagation gets all of them for about the cost of two passes (one forward, one backward), because each layer's error signal is computed once and shared. That difference is what makes training large networks possible at all. Numerical gradients remain useful for one thing: **checking** a backpropagation implementation, as in this lesson.

::: challenge Gradients through a small graph [easy]
For f(x, y, z) = (x + y) · z + x · y, compute the gradients by hand-written backpropagation. Write `forward_backward(x, y, z)` returning a tuple `(f, df_dx, df_dy, df_dz)`. Break it into steps: s = x + y, t = s · z, u = x · y, f = t + u. Remember that x and y each feed into **two** places, so their gradients are sums.

```python starter
def forward_backward(x, y, z):
    return 0.0, 0.0, 0.0, 0.0

print(forward_backward(1.0, 2.0, 3.0))
```

```python solution
def forward_backward(x, y, z):
    s = x + y
    t = s * z
    u = x * y
    f = t + u
    grad_t = 1.0
    grad_u = 1.0
    grad_s = grad_t * z
    grad_z = grad_t * s
    grad_x = grad_s + grad_u * y
    grad_y = grad_s + grad_u * x
    return f, grad_x, grad_y, grad_z

print(forward_backward(1.0, 2.0, 3.0))
```

```python test
import math as _math
assert "forward_backward" in dir(), "Keep the function's name as forward_backward."
_f = lambda x, y, z: (x + y) * z + x * y
for _p in [(1.0, 2.0, 3.0), (-2.0, 0.5, 4.0), (3.0, -1.0, -2.0)]:
    _v, _dx, _dy, _dz = forward_backward(*_p)
    assert _math.isclose(_v, _f(*_p)), f"f{_p} should be {_f(*_p)}."
    assert _math.isclose(_dx, _p[2] + _p[1]), f"df/dx at {_p} should be z + y = {_p[2] + _p[1]}: x reaches f through s (gradient z) and through u (gradient y), and the two add."
    assert _math.isclose(_dy, _p[2] + _p[0]), f"df/dy at {_p} should be z + x = {_p[2] + _p[0]}."
    assert _math.isclose(_dz, _p[0] + _p[1]), f"df/dz at {_p} should be x + y = {_p[0] + _p[1]}."
"SUCCESS: Local derivatives, multiplied backwards, summed where paths meet: that is all backpropagation is."
```

Hint: Go backwards from f, where the gradient is 1. Both t and u receive gradient 1 (addition passes it through). From t = s · z: s gets `z`, z gets `s`. From u = x · y: x gets `y`, y gets `x`. From s = x + y, x and y each get s's gradient. Add up what arrives at x, and at y.
:::

::: challenge Backward for regression [medium]
Derive and code the backward pass for a network that predicts **numbers**: one ReLU hidden layer and a **linear** output (no activation), trained with the mean squared error L = (1/n) Σ (pᵢ − yᵢ)² over the batch, where `P = H @ W2 + b2` has shape `(n, 1)` and `Y` holds the targets with the same shape.

The output layer is new: with no sigmoid and a squared error instead of log loss, its error signal is no longer P − Y. Work out ∂L/∂P yourself (it is not quite P − Y), then pass it back through the layers as in the lesson. Write `backward(X, Y, W1, b1, W2, b2)` returning a dictionary of gradients `"W1"`, `"b1"`, `"W2"`, `"b2"`, each the shape of its parameter. The check compares them with numerical gradients.

```python starter
import numpy as np

def backward(X, Y, W1, b1, W2, b2):
    return {"W1": np.zeros_like(W1), "b1": np.zeros_like(b1), "W2": np.zeros_like(W2), "b2": np.zeros_like(b2)}
```

```python solution
import numpy as np

def backward(X, Y, W1, b1, W2, b2):
    Z1 = X @ W1 + b1
    H = np.maximum(0, Z1)
    P = H @ W2 + b2
    D2 = 2 * (P - Y) / len(X)
    D1 = (D2 @ W2.T) * (Z1 > 0)
    return {"W1": X.T @ D1, "b1": D1.sum(axis=0), "W2": H.T @ D2, "b2": D2.sum(axis=0)}
```

```python test
import numpy as _np
assert "backward" in dir(), "Keep the function's name as backward."
def _loss(X, Y, W1, b1, W2, b2):
    P = _np.maximum(0, X @ W1 + b1) @ W2 + b2
    return _np.mean((P - Y) ** 2)
_r = _np.random.default_rng(5)
_X = _r.normal(size=(8, 3))
_Y = _r.normal(size=(8, 1))
_params = {"W1": _r.normal(size=(3, 4)), "b1": _r.normal(size=4), "W2": _r.normal(size=(4, 1)), "b2": _r.normal(size=1)}
_g = backward(_X, _Y, _params["W1"], _params["b1"], _params["W2"], _params["b2"])
for _name in ["W2", "b2", "W1", "b1"]:
    assert _name in _g and _np.shape(_g[_name]) == _params[_name].shape, f"The gradient for {_name} should have shape {_params[_name].shape}."
    _num = _np.zeros_like(_params[_name])
    for _idx in _np.ndindex(_params[_name].shape):
        _up = {k: v.copy() for k, v in _params.items()}
        _dn = {k: v.copy() for k, v in _params.items()}
        _up[_name][_idx] += 1e-6
        _dn[_name][_idx] -= 1e-6
        _num[_idx] = (_loss(_X, _Y, **_up) - _loss(_X, _Y, **_dn)) / 2e-6
    _ratio = _np.median(_g[_name] / _np.where(_num == 0, 1, _num))
    assert _np.allclose(_g[_name], _num, atol=1e-5), f"The gradient for {_name} does not match the numerical gradient" + (" (yours is half of it: the derivative of (p − y)² is 2(p − y))." if _np.isclose(_ratio, 0.5) else ".")
"SUCCESS: A new output layer and loss changed only the first line of the backward pass, to D2 = 2(P − Y)/n; everything behind it is the same machinery."
```

Hint: The derivative of (p − y)² with respect to p is 2(p − y), and the mean divides by n, so D2 = 2(P − Y)/n. With no output activation there is nothing else to multiply by. From there on, follow the lesson's batch formulas, using `(Z1 > 0)` for the ReLU.
:::

::: challenge A gradient checker [medium]
Write a reusable tool. `numerical_gradients(loss_fn, params, eps=1e-6)` takes a function `loss_fn(params)` returning a number, and a dictionary of NumPy arrays; it returns a dictionary of the same shapes holding the central-difference estimate (L(p + ε) − L(p − ε)) / 2ε for every entry. Leave the original arrays unchanged when you return.

Then write `max_relative_error(a, b)` that returns the largest value of |a − b| / max(|a| + |b|, 1e-12) over all entries of two dictionaries of arrays with the same keys. A relative error below about 1e-6 means a backpropagation implementation is almost certainly right.

```python starter
import numpy as np

def numerical_gradients(loss_fn, params, eps=1e-6):
    return {name: np.zeros_like(value) for name, value in params.items()}

def max_relative_error(a, b):
    return 1.0

params = {"w": np.array([1.0, -2.0]), "c": np.array([0.5])}
loss_fn = lambda p: float(np.sum(p["w"] ** 2) * p["c"][0])
print(numerical_gradients(loss_fn, params))
```

```python solution
import numpy as np

def numerical_gradients(loss_fn, params, eps=1e-6):
    grads = {}
    for name, value in params.items():
        grad = np.zeros_like(value, dtype=float)
        for index in np.ndindex(value.shape):
            original = value[index]
            value[index] = original + eps
            up = loss_fn(params)
            value[index] = original - eps
            down = loss_fn(params)
            value[index] = original
            grad[index] = (up - down) / (2 * eps)
        grads[name] = grad
    return grads

def max_relative_error(a, b):
    return max(float(np.max(np.abs(a[k] - b[k]) / np.maximum(np.abs(a[k]) + np.abs(b[k]), 1e-12))) for k in a)

params = {"w": np.array([1.0, -2.0]), "c": np.array([0.5])}
loss_fn = lambda p: float(np.sum(p["w"] ** 2) * p["c"][0])
print(numerical_gradients(loss_fn, params))
```

```python test
import numpy as _np
assert "numerical_gradients" in dir() and "max_relative_error" in dir(), "Keep both function names."
_p = {"w": _np.array([1.0, -2.0]), "c": _np.array([0.5])}
_f = lambda p: float(_np.sum(p["w"] ** 2) * p["c"][0])
_g = numerical_gradients(_f, _p)
assert _np.allclose(_g["w"], [1.0, -2.0], atol=1e-5) and _np.allclose(_g["c"], [5.0], atol=1e-5), f"For L = c·Σw², the gradients are 2c·w = [1, −2] and Σw² = 5, but got {_g}."
assert _np.array_equal(_p["w"], [1.0, -2.0]) and _np.array_equal(_p["c"], [0.5]), "numerical_gradients changed the parameters. Put each value back after nudging it."
_M = {"m": _np.array([[1.0, 2.0], [3.0, 4.0]])}
_gm = numerical_gradients(lambda p: float(_np.sum(p["m"] ** 3)), _M)
assert _np.allclose(_gm["m"], 3 * _M["m"] ** 2, rtol=1e-5), "numerical_gradients should handle 2-D arrays (np.ndindex visits every position)."
assert _np.isclose(max_relative_error({"a": _np.array([1.0, 2.0])}, {"a": _np.array([1.0, 2.2])}), 0.2 / 4.2), "max_relative_error should be the largest |a − b| / (|a| + |b|)."
assert max_relative_error({"a": _np.zeros(2)}, {"a": _np.zeros(2)}) == 0.0, "Two zero gradients should give error 0, not a division by zero."
assert _np.isclose(max_relative_error({"a": _np.array([1.0]), "b": _np.array([3.0])}, {"a": _np.array([1.0]), "b": _np.array([1.0])}), 0.5), "Take the maximum over all keys."
_big = numerical_gradients(lambda p: float(_np.sum(p["m"] ** 3)), {"m": _np.array([[1.0, 2.0]])}, eps=0.1)
assert _np.allclose(_big["m"], 3 * _np.array([[1.0, 2.0]]) ** 2 + 0.01), "With eps = 0.1 the central difference for m³ is exactly 3m² + eps² = [3.01, 12.01]. Use (L(p + eps) − L(p − eps)) / (2 eps), with the eps you are given."
"SUCCESS: A gradient checker you can point at any backpropagation code: if the relative error is below about 1e-6, the gradients are right."
```

Hint: `np.ndindex(value.shape)` yields every index tuple of an array of any shape. Change `value[index]` in place, call `loss_fn(params)`, and restore the original value afterwards. For the relative error, `np.maximum(np.abs(a) + np.abs(b), 1e-12)` avoids dividing by zero.
:::

## What you learned

- A computational graph breaks a calculation into simple steps. The backward pass starts from gradient 1 at the output and multiplies by each step's local derivative (the chain rule).
- Addition passes a gradient through unchanged; multiplication sends each input the gradient times the other input; a value used in several places adds up the gradients from each path.
- For a layer, the weight gradient is (input)ᵀ × (error signal), and the error signal sent back is (signal) × (weights)ᵀ, times the activation's derivative. With a sigmoid output and log loss, the output signal is (P − Y)/n.
- Backpropagation computes every gradient for roughly the cost of one extra pass; numerical gradients cost a pass per weight, but are the standard way to check backpropagation code.
- A 2 → 3 → 1 network learned XOR with hand-computed gradients from one start and stalled from another: network losses are not single bowls.

Writing backward passes by hand for every new kind of layer is tedious and error-prone. The next lesson builds a small automatic differentiation engine: you write only the forward calculation, and the gradients come out by themselves.
