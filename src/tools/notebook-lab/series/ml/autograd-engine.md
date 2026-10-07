# An automatic differentiation engine

The last lesson computed gradients by working out each layer's backward formulas by hand. That works for one kind of network, but every new layer type, loss or activation would need new formulas, each a chance for a mistake. Modern libraries such as PyTorch and JAX do something better: you write only the **forward** calculation, as ordinary code, and the library records each operation as it happens and then runs backpropagation through the record automatically. This is **automatic differentiation**, or **autograd**.

In this lesson you build one, small but complete, in about 50 lines of Python, using the special methods from the Python series. Every number becomes a `Value` object that remembers how it was made. Calling `backward()` on the final result fills in the gradient of every value that contributed to it. Then you train a small neural network with it, without writing a single derivative of the network by hand.

## A number that remembers its history

A `Value` holds four things: its number (`data`); its gradient (`grad`), which starts at 0 and will hold ∂output/∂this-value; the values it was computed from (`parents`); and a small function, `backward_step`, that knows how to pass gradient from this value back to its parents. When two `Value`s are added, `__add__` creates the result **and** attaches to it a `backward_step` encoding the local rule for addition: each parent receives the result's gradient unchanged.

```python type
class Value:
    created = 0

    def __init__(self, data, parents=()):
        self.data = data
        self.grad = 0.0
        self.parents = parents
        self.backward_step = lambda: None
        Value.created += 1
        self.order = Value.created

    def __repr__(self):
        return f"Value(data={self.data:.4f}, grad={self.grad:.4f})"

    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data + other.data, (self, other))
        def step():
            self.grad += out.grad
            other.grad += out.grad
        out.backward_step = step
        return out

    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data * other.data, (self, other))
        def step():
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad
        out.backward_step = step
        return out

a, b = Value(2.0), Value(-3.0)
c = a * b + 10
print(c)
print("c was made from:", c.parents)
```

```output
Value(data=4.0000, grad=0.0000)
c was made from: (Value(data=-6.0000, grad=0.0000), Value(data=10.0000, grad=0.0000))
```

A few pieces need explaining:

- `other if isinstance(other, Value) else Value(other)` lets you mix plain numbers in: `a * b + 10` wraps the 10 as a `Value`.
- `step` is a function defined **inside** `__add__`. It can still use `self`, `other` and `out` later, when it is finally called, because a nested function remembers the variables around it (it is a **closure**, from the functions-as-values lesson). Each result gets its own `step`, tied to its own parents.
- The rules are exactly the local derivatives from the last lesson. Addition passes the gradient through; multiplication sends each parent the gradient times the **other** parent's value.
- The `+=` matters. If a value is used in several places, gradients from each use must **add up**, as the last lesson showed. Starting every `grad` at 0 and adding makes that automatic.
- `order` is a running count of `Value`s created. It looks like bookkeeping, but it is the key to the next step.

## Running the record backwards

To backpropagate, each `backward_step` must run **after** the steps of every value that used it, so that its gradient is complete before it passes it on. In other words, the steps must run from the output back towards the inputs. Here the `order` number makes that easy. A value is always created after its parents (you cannot compute `a * b` before `a` and `b` exist), so running the steps in order of **decreasing** creation number always handles a value after everything built from it.

`backward()` therefore: collects every value the output depends on (a stack-based search through `parents`, like the one in the DBSCAN challenge), sets the output's own gradient to 1, and runs every `backward_step` from newest to oldest.

```python type
import math

class Value:
    created = 0

    def __init__(self, data, parents=()):
        self.data = data
        self.grad = 0.0
        self.parents = parents
        self.backward_step = lambda: None
        Value.created += 1
        self.order = Value.created

    def __repr__(self):
        return f"Value(data={self.data:.4f}, grad={self.grad:.4f})"

    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data + other.data, (self, other))
        def step():
            self.grad += out.grad
            other.grad += out.grad
        out.backward_step = step
        return out

    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data * other.data, (self, other))
        def step():
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad
        out.backward_step = step
        return out

    def __radd__(self, other):
        return self + other

    def __rmul__(self, other):
        return self * other

    def tanh(self):
        t = math.tanh(self.data)
        out = Value(t, (self,))
        def step():
            self.grad += (1 - t ** 2) * out.grad
        out.backward_step = step
        return out

    def backward(self):
        nodes, stack, seen = [], [self], {id(self)}
        while stack:
            node = stack.pop()
            nodes.append(node)
            for parent in node.parents:
                if id(parent) not in seen:
                    seen.add(id(parent))
                    stack.append(parent)
        self.grad = 1.0
        for node in sorted(nodes, key=lambda n: n.order, reverse=True):
            node.backward_step()

a, b, c, d = Value(2.0), Value(-3.0), Value(10.0), Value(-2.0)
g = (a * b + c) * d
g.backward()
print("g =", g.data)
print("gradients:", a.grad, b.grad, c.grad, d.grad)

x = Value(0.5)
y = x * x + x * 3
y.backward()
print("d/dx of x² + 3x at x = 0.5:", x.grad)
```

```output
g = -8.0
gradients: 6.0 -4.0 -2.0 4.0
d/dx of x² + 3x at x = 0.5: 4.0
```

`seen` holds the `id` of every value already collected (`id(obj)` is a number unique to each object), so a value reached along several paths is collected once. `sorted(..., key=lambda n: n.order, reverse=True)` puts the newest value first. `__radd__` and `__rmul__` handle a plain number on the **left**, as in `3 * x`, exactly as `__rmul__` did for vectors in the special methods lesson. `tanh` shows how to add any function: compute the result, then attach a step that multiplies by the local derivative 1 − tanh².

The gradients of the expression from the last lesson come out as 6, −4, −2 and 4, exactly as computed by hand, with no derivative written for this particular expression. And for y = x² + 3x, where `x` is used three times, the gradient is 2x + 3 = 4: the `+=` added up the contributions from every use.

## Training a network with it

Now a neural network: 2 inputs, 8 tanh hidden units, 1 output, built entirely from `Value`s, trained on 40 points of the half-moons with labels −1 and +1 and a squared-error loss. The forward pass is written as plain arithmetic; the gradients come from `loss.backward()`. (This is far slower than NumPy, since every single number is a Python object, so the data is kept small; the cell takes a few seconds.)

```python type
import math
import random
from sklearn.datasets import make_moons

class Value:
    created = 0

    def __init__(self, data, parents=()):
        self.data = data
        self.grad = 0.0
        self.parents = parents
        self.backward_step = lambda: None
        Value.created += 1
        self.order = Value.created

    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data + other.data, (self, other))
        def step():
            self.grad += out.grad
            other.grad += out.grad
        out.backward_step = step
        return out

    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data * other.data, (self, other))
        def step():
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad
        out.backward_step = step
        return out

    def __radd__(self, other):
        return self + other

    def __rmul__(self, other):
        return self * other

    def tanh(self):
        t = math.tanh(self.data)
        out = Value(t, (self,))
        def step():
            self.grad += (1 - t ** 2) * out.grad
        out.backward_step = step
        return out

    def backward(self):
        nodes, stack, seen = [], [self], {id(self)}
        while stack:
            node = stack.pop()
            nodes.append(node)
            for parent in node.parents:
                if id(parent) not in seen:
                    seen.add(id(parent))
                    stack.append(parent)
        self.grad = 1.0
        for node in sorted(nodes, key=lambda n: n.order, reverse=True):
            node.backward_step()

X, labels = make_moons(40, noise=0.1, random_state=0)
targets = [2.0 * label - 1 for label in labels]

random.seed(0)
hidden = 8
W1 = [[Value(random.uniform(-1, 1)) for _ in range(hidden)] for _ in range(2)]
b1 = [Value(0.0) for _ in range(hidden)]
W2 = [Value(random.uniform(-1, 1)) for _ in range(hidden)]
b2 = Value(0.0)
params = [w for row in W1 for w in row] + b1 + W2 + [b2]

def predict(x):
    h = [(x[0] * W1[0][j] + x[1] * W1[1][j] + b1[j]).tanh() for j in range(hidden)]
    return sum((hj * wj for hj, wj in zip(h, W2)), b2)

for epoch in range(1, 101):
    loss = Value(0.0)
    for x, t in zip(X, targets):
        error = predict(x) + (-t)
        loss = loss + error * error
    loss = loss * (1 / len(X))

    for p in params:
        p.grad = 0.0
    loss.backward()
    for p in params:
        p.data -= 0.3 * p.grad

    if epoch in (1, 10, 50, 100):
        accuracy = sum((predict(x).data > 0) == (t > 0) for x, t in zip(X, targets)) / len(X)
        print(f"epoch {epoch:>3}: loss {loss.data:.4f}, accuracy {accuracy:.2f}")
print(f"{len(params)} parameters; {Value.created:,} Values created in total")
```

```output
epoch   1: loss 1.5821, accuracy 0.55
epoch  10: loss 0.4947, accuracy 0.80
epoch  50: loss 0.4095, accuracy 0.80
epoch 100: loss 0.2446, accuracy 0.90
33 parameters; 315,853 Values created in total
```

`sum(generator, b2)` starts the sum at `b2` instead of 0, so the output is the weighted sum plus the bias. The error is written `predict(x) + (-t)` because this `Value` has no subtraction yet (the first challenge adds it).

Each epoch builds a fresh graph for the whole loss (thousands of `Value`s), resets every gradient to 0 (otherwise the `+=` would keep adding to last epoch's gradients), backpropagates, and takes a gradient descent step. The loss falls from 1.58 to 0.24, and accuracy rises from 0.55 to 0.90. Every gradient for all 33 parameters came from the engine. (With a learning rate of 0.5 instead of 0.3, this run blows up: the loss reaches astronomical values. Choosing step sizes is the subject of the optimisers lesson.)

## From scalars to tensors

Your engine handles one number at a time, which is why it is slow. PyTorch's autograd works exactly the same way, but each node is a whole **array** (a tensor): one node for a matrix multiplication of a batch, with a backward step like the batch formulas of the last lesson, `Xᵀ Δ`. The graph has a few dozen nodes instead of millions, and each step runs in fast compiled code. When you write `loss.backward()` in PyTorch, this is what happens. From here on, the series uses NumPy with hand-written batch gradients when the formulas are short, and points out where libraries take over.

::: challenge More operations for free [easy]
The starter has the lesson's `Value` with `+`, `*`, `__radd__` and `__rmul__`, plus `__pow__` for a plain number exponent. Add `__neg__` (for `-x`), `__sub__` (for `x - y`), `__rsub__` (for `5 - x`) and `__truediv__` (for `x / y`), **using only the existing operations**, so that you need no new backward steps: −x is x · (−1); x − y is x + (−y); a number minus x is −x plus the number; and x / y is x · y⁻¹.

```python starter
class Value:
    created = 0

    def __init__(self, data, parents=()):
        self.data = data
        self.grad = 0.0
        self.parents = parents
        self.backward_step = lambda: None
        Value.created += 1
        self.order = Value.created

    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data + other.data, (self, other))
        def step():
            self.grad += out.grad
            other.grad += out.grad
        out.backward_step = step
        return out

    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data * other.data, (self, other))
        def step():
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad
        out.backward_step = step
        return out

    def __pow__(self, exponent):
        out = Value(self.data ** exponent, (self,))
        def step():
            self.grad += exponent * self.data ** (exponent - 1) * out.grad
        out.backward_step = step
        return out

    def __radd__(self, other):
        return self + other

    def __rmul__(self, other):
        return self * other

    def backward(self):
        nodes, stack, seen = [], [self], {id(self)}
        while stack:
            node = stack.pop()
            nodes.append(node)
            for parent in node.parents:
                if id(parent) not in seen:
                    seen.add(id(parent))
                    stack.append(parent)
        self.grad = 1.0
        for node in sorted(nodes, key=lambda n: n.order, reverse=True):
            node.backward_step()

x, y = Value(3.0), Value(4.0)
```

```python solution
class Value:
    created = 0

    def __init__(self, data, parents=()):
        self.data = data
        self.grad = 0.0
        self.parents = parents
        self.backward_step = lambda: None
        Value.created += 1
        self.order = Value.created

    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data + other.data, (self, other))
        def step():
            self.grad += out.grad
            other.grad += out.grad
        out.backward_step = step
        return out

    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data * other.data, (self, other))
        def step():
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad
        out.backward_step = step
        return out

    def __pow__(self, exponent):
        out = Value(self.data ** exponent, (self,))
        def step():
            self.grad += exponent * self.data ** (exponent - 1) * out.grad
        out.backward_step = step
        return out

    def __radd__(self, other):
        return self + other

    def __rmul__(self, other):
        return self * other

    def __neg__(self):
        return self * -1

    def __sub__(self, other):
        return self + (-other)

    def __rsub__(self, other):
        return (-self) + other

    def __truediv__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        return self * other ** -1

    def backward(self):
        nodes, stack, seen = [], [self], {id(self)}
        while stack:
            node = stack.pop()
            nodes.append(node)
            for parent in node.parents:
                if id(parent) not in seen:
                    seen.add(id(parent))
                    stack.append(parent)
        self.grad = 1.0
        for node in sorted(nodes, key=lambda n: n.order, reverse=True):
            node.backward_step()

x, y = Value(3.0), Value(4.0)
```

```python test
import math as _m
_x, _y = Value(3.0), Value(4.0)
_f = (_x - _y) / _y + 5 - _x
assert _m.isclose(_f.data, (3 - 4) / 4 + 5 - 3), f"(x − y)/y + 5 − x should be {(3 - 4) / 4 + 5 - 3} for x = 3, y = 4, but got {_f.data}."
_f.backward()
assert _m.isclose(_x.grad, 1 / 4 - 1), f"∂/∂x of (x − y)/y + 5 − x is 1/y − 1 = −0.75, but got {_x.grad}."
assert _m.isclose(_y.grad, -_x.data / _y.data ** 2), f"∂/∂y is −x/y² = −0.1875, but got {_y.grad}."
_a = Value(2.0)
_g = 10 - _a
_g.backward()
assert _m.isclose(_g.data, 8.0) and _m.isclose(_a.grad, -1.0), "10 − a should give 8 with gradient −1 for a = 2. Add __rsub__."
_b = Value(5.0)
_h = -_b
_h.backward()
assert _m.isclose(_h.data, -5.0) and _m.isclose(_b.grad, -1.0), "-b should give −5 with gradient −1."
_c = Value(2.0)
_k = 1 / (_c * _c) if hasattr(Value, "__rtruediv__") else (_c * _c) ** -1
_k.backward()
assert _m.isclose(_c.grad, -2 / 8), "The gradient of 1/c² at c = 2 should be −2/c³ = −0.25."
"SUCCESS: Four new operations, zero new derivatives: they are built from operations the engine already knows how to differentiate."
```

Hint: Each method is one line returning a combination of existing operations, such as `return self * -1`. In `__truediv__`, wrap a plain number as a `Value` first, then multiply by `other ** -1`.
:::

::: challenge exp and log [medium]
Add two new operations, each with its own backward step: `exp()` (the derivative of eˣ is eˣ) and `log()` (the derivative of ln x is 1/x), using `math.exp` and `math.log`. Follow the pattern of `tanh` in the lesson.

Then use your engine to compute a logistic regression loss: with `w = Value(0.5)`, `b = Value(-1.0)` and one example x = 2, label y = 1, compute p = 1/(1 + e^(−(w·x + b))) and the loss −ln p, call `backward()`, and store `w.grad` in `grad_w` and `b.grad` in `grad_b`. (The logistic regression lesson says they should be (p − y)·x and p − y.)

```python starter
import math

class Value:
    created = 0

    def __init__(self, data, parents=()):
        self.data = data
        self.grad = 0.0
        self.parents = parents
        self.backward_step = lambda: None
        Value.created += 1
        self.order = Value.created

    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data + other.data, (self, other))
        def step():
            self.grad += out.grad
            other.grad += out.grad
        out.backward_step = step
        return out

    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data * other.data, (self, other))
        def step():
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad
        out.backward_step = step
        return out

    def __pow__(self, exponent):
        out = Value(self.data ** exponent, (self,))
        def step():
            self.grad += exponent * self.data ** (exponent - 1) * out.grad
        out.backward_step = step
        return out

    def __radd__(self, other):
        return self + other

    def __rmul__(self, other):
        return self * other

    def exp(self):
        return self

    def log(self):
        return self

    def backward(self):
        nodes, stack, seen = [], [self], {id(self)}
        while stack:
            node = stack.pop()
            nodes.append(node)
            for parent in node.parents:
                if id(parent) not in seen:
                    seen.add(id(parent))
                    stack.append(parent)
        self.grad = 1.0
        for node in sorted(nodes, key=lambda n: n.order, reverse=True):
            node.backward_step()

w, b = Value(0.5), Value(-1.0)
grad_w = 0.0
grad_b = 0.0
print(grad_w, grad_b)
```

```python solution
import math

class Value:
    created = 0

    def __init__(self, data, parents=()):
        self.data = data
        self.grad = 0.0
        self.parents = parents
        self.backward_step = lambda: None
        Value.created += 1
        self.order = Value.created

    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data + other.data, (self, other))
        def step():
            self.grad += out.grad
            other.grad += out.grad
        out.backward_step = step
        return out

    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data * other.data, (self, other))
        def step():
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad
        out.backward_step = step
        return out

    def __pow__(self, exponent):
        out = Value(self.data ** exponent, (self,))
        def step():
            self.grad += exponent * self.data ** (exponent - 1) * out.grad
        out.backward_step = step
        return out

    def __radd__(self, other):
        return self + other

    def __rmul__(self, other):
        return self * other

    def exp(self):
        e = math.exp(self.data)
        out = Value(e, (self,))
        def step():
            self.grad += e * out.grad
        out.backward_step = step
        return out

    def log(self):
        out = Value(math.log(self.data), (self,))
        def step():
            self.grad += (1 / self.data) * out.grad
        out.backward_step = step
        return out

    def backward(self):
        nodes, stack, seen = [], [self], {id(self)}
        while stack:
            node = stack.pop()
            nodes.append(node)
            for parent in node.parents:
                if id(parent) not in seen:
                    seen.add(id(parent))
                    stack.append(parent)
        self.grad = 1.0
        for node in sorted(nodes, key=lambda n: n.order, reverse=True):
            node.backward_step()

w, b = Value(0.5), Value(-1.0)
p = (1 + (-1 * (w * 2 + b)).exp()) ** -1
loss = -1 * p.log()
loss.backward()
grad_w = w.grad
grad_b = b.grad
print(grad_w, grad_b)
```

```python test
import math as _m
_t = Value(1.5)
_e = _t.exp()
_e.backward()
assert _m.isclose(_e.data, _m.exp(1.5)) and _m.isclose(_t.grad, _m.exp(1.5)), "exp should give e^x, with gradient e^x."
_u = Value(4.0)
_l = _u.log()
_l.backward()
assert _m.isclose(_l.data, _m.log(4.0)) and _m.isclose(_u.grad, 0.25), "log should give ln x, with gradient 1/x."
_s = Value(2.0)
_both = _s.exp() + _s.log()
_both.backward()
assert _m.isclose(_s.grad, _m.exp(2.0) + 0.5), "When one value feeds both exp and log, its gradient should be e² + 1/2. Use += in the backward steps so contributions add up."
_v = Value(0.7)
_comp = (_v * _v).exp().log()
_comp.backward()
assert _m.isclose(_v.grad, 2 * 0.7), "log(exp(v²)) is v², so its gradient should be 2v: the backward steps must chain correctly."
_p = 1 / (1 + _m.exp(-(0.5 * 2 - 1.0)))
assert isinstance(w, Value) and _m.isclose(w.grad, grad_w), "grad_w should be read from w.grad after calling backward() on the loss built with Value arithmetic."
assert _m.isclose(grad_w, (_p - 1) * 2), f"grad_w should be (p − y)·x = {(_p - 1) * 2:.4f}."
assert _m.isclose(grad_b, _p - 1), f"grad_b should be p − y = {_p - 1:.4f}."
"SUCCESS: Two new local derivatives, and the engine reproduced logistic regression's famous (p − y)·x gradient without being told it."
```

Hint: In `exp`, compute `e = math.exp(self.data)` once and use it in the step: `self.grad += e * out.grad`. For `log`, the step adds `(1 / self.data) * out.grad`. With no subtraction or division available, write the sigmoid as `(1 + (-1 * z).exp()) ** -1`.
:::

::: challenge Check the engine against NumPy [medium]
Use your engine to compute the gradient of a tiny **linear regression** loss and compare it with the matrix formula from the gradient descent lessons. The starter has `Value` (with `+`, `*`, `__pow__`, `__radd__`, `__rmul__`), a 5 × 2 data matrix `X`, targets `y` and weights `w` (no bias).

Write `engine_gradient(X, y, w)` that wraps each weight as a `Value`, builds the mean squared error (1/n) Σ (xᵢ · w − yᵢ)² with `Value` arithmetic, calls `backward()`, and returns a NumPy array of the two weight gradients. Store the result for the starter's data in `from_engine`, and the formula's answer, (2/n) Xᵀ(Xw − y), in `from_formula`.

```python starter
import numpy as np

class Value:
    created = 0

    def __init__(self, data, parents=()):
        self.data = data
        self.grad = 0.0
        self.parents = parents
        self.backward_step = lambda: None
        Value.created += 1
        self.order = Value.created

    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data + other.data, (self, other))
        def step():
            self.grad += out.grad
            other.grad += out.grad
        out.backward_step = step
        return out

    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data * other.data, (self, other))
        def step():
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad
        out.backward_step = step
        return out

    def __pow__(self, exponent):
        out = Value(self.data ** exponent, (self,))
        def step():
            self.grad += exponent * self.data ** (exponent - 1) * out.grad
        out.backward_step = step
        return out

    def __radd__(self, other):
        return self + other

    def __rmul__(self, other):
        return self * other

    def backward(self):
        nodes, stack, seen = [], [self], {id(self)}
        while stack:
            node = stack.pop()
            nodes.append(node)
            for parent in node.parents:
                if id(parent) not in seen:
                    seen.add(id(parent))
                    stack.append(parent)
        self.grad = 1.0
        for node in sorted(nodes, key=lambda n: n.order, reverse=True):
            node.backward_step()

def engine_gradient(X, y, w):
    return np.zeros(len(w))

rng = np.random.default_rng(2)
X = rng.normal(size=(5, 2))
y = rng.normal(size=5)
w = np.array([0.3, -0.7])
from_engine = engine_gradient(X, y, w)
from_formula = np.zeros(2)
print(from_engine, from_formula)
```

```python solution
import numpy as np

class Value:
    created = 0

    def __init__(self, data, parents=()):
        self.data = data
        self.grad = 0.0
        self.parents = parents
        self.backward_step = lambda: None
        Value.created += 1
        self.order = Value.created

    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data + other.data, (self, other))
        def step():
            self.grad += out.grad
            other.grad += out.grad
        out.backward_step = step
        return out

    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data * other.data, (self, other))
        def step():
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad
        out.backward_step = step
        return out

    def __pow__(self, exponent):
        out = Value(self.data ** exponent, (self,))
        def step():
            self.grad += exponent * self.data ** (exponent - 1) * out.grad
        out.backward_step = step
        return out

    def __radd__(self, other):
        return self + other

    def __rmul__(self, other):
        return self * other

    def backward(self):
        nodes, stack, seen = [], [self], {id(self)}
        while stack:
            node = stack.pop()
            nodes.append(node)
            for parent in node.parents:
                if id(parent) not in seen:
                    seen.add(id(parent))
                    stack.append(parent)
        self.grad = 1.0
        for node in sorted(nodes, key=lambda n: n.order, reverse=True):
            node.backward_step()

def engine_gradient(X, y, w):
    weights = [Value(float(v)) for v in w]
    loss = Value(0.0)
    for row, target in zip(X, y):
        prediction = sum((float(xj) * wj for xj, wj in zip(row, weights)), Value(0.0))
        loss = loss + (prediction + (-float(target))) ** 2
    loss = loss * (1 / len(X))
    loss.backward()
    return np.array([wj.grad for wj in weights])

rng = np.random.default_rng(2)
X = rng.normal(size=(5, 2))
y = rng.normal(size=5)
w = np.array([0.3, -0.7])
from_engine = engine_gradient(X, y, w)
from_formula = 2 / len(X) * X.T @ (X @ w - y)
print(from_engine, from_formula)
```

```python test
import numpy as _np
assert "engine_gradient" in dir(), "Keep the function's name as engine_gradient."
_r = _np.random.default_rng(2)
_X = _r.normal(size=(5, 2))
_y = _r.normal(size=5)
_w = _np.array([0.3, -0.7])
_want = 2 / 5 * _X.T @ (_X @ _w - _y)
assert _np.allclose(from_formula, _want), "from_formula should be (2/n) Xᵀ(Xw − y)."
assert _np.allclose(from_engine, _want), f"from_engine should match the formula, {_want.round(4)}, but got {_np.round(from_engine, 4)}. Build the mean of the squared errors with Value arithmetic and call backward() on it."
_r2 = _np.random.default_rng(9)
_X2, _y2, _w2 = _r2.normal(size=(7, 3)), _r2.normal(size=7), _r2.normal(size=3)
_before = Value.created
_eg = engine_gradient(_X2, _y2, _w2)
assert Value.created - _before > 7, "engine_gradient created almost no Values. Build the loss from Value objects and let backward() compute the gradient."
assert _np.allclose(_eg, 2 / 7 * _X2.T @ (_X2 @ _w2 - _y2)), "engine_gradient should work for any number of rows and weights."
"SUCCESS: The scalar engine, never told the formula, reproduces (2/n) Xᵀ(Xw − y) exactly. Libraries do the same with whole arrays as nodes."
```

Hint: Wrap each weight with `Value(float(v))` (`float` turns a NumPy number into a plain Python one, which keeps the arithmetic simple). For each row, the prediction is a sum of `float(xj) * wj` (start the sum at `Value(0.0)`); add `(prediction + (-target)) ** 2` to the running loss, multiply by `1 / n`, call `backward()`, and read each weight's `.grad`.
:::

## What you learned

- Automatic differentiation records each operation of the forward calculation as a graph, then runs backpropagation through it, so only the forward code has to be written.
- A `Value` stores its data, gradient, parents and a `backward_step` closure with the operation's local derivative. Special methods (`__add__`, `__mul__`, `__radd__`, …) let `Value`s be used like numbers.
- Gradients accumulate with `+=`, which handles values used in several places, and must be reset to 0 before each new backward pass.
- Running the backward steps from newest to oldest (here by creation order) guarantees each value's gradient is complete before it is passed on.
- New operations either get their own backward step (tanh, exp, log) or are built from existing ones and differentiate for free (subtraction, division).
- The engine trained a small network and reproduced the logistic and linear regression gradients exactly. PyTorch's autograd is the same idea with arrays as nodes.

You can now compute gradients for any network. The next lesson puts it all together into proper training: mini-batches, sensible initialisation, watching loss curves, and a network that reads handwritten digits.
