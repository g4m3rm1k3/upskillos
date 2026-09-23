export default {
  filename: 'autodiff.py', packages: ['numpy'],
  title: 'Build your own automatic differentiation.',
  intro: 'Complete a scalar `Value` class: each operation returns a new node that remembers its inputs and how to send gradients back to them; `backward()` visits nodes in reverse topological order. The checks compare against finite differences, test shared inputs, and train a tiny neuron with your engine.',
  steps: [
    'Store `data`, `grad = 0.0`, the input nodes `_prev`, and a `_backward` function (initially doing nothing).',
    'Implement `__add__`, `__mul__` (accepting plain numbers too), `__pow__` for a numeric exponent, and `tanh()` — each sets its output\'s `_backward` to **add** to its inputs\' `grad`.',
    '`backward()`: build a topological order with depth-first search, set `self.grad = 1`, then call `_backward` on every node in reverse order.',
    'The provided helpers `__neg__`, `__sub__`, `__radd__`, `__rmul__` are built from your operations.',
  ],
  hints: [
    ['Multiplication', '`out = Value(self.data * other.data, (self, other))`; in its backward: `self.grad += other.data * out.grad` and `other.grad += self.data * out.grad`.'],
    ['tanh', '`t = math.tanh(self.data)`; backward: `self.grad += (1 - t ** 2) * out.grad`.'],
    ['Topological order', 'Recursive `build(v)`: if v not visited, mark it, `build` each input, then append v. Reverse the list.'],
  ],
  starter: `import math

class Value:
    def __init__(self, data, _prev=()):
        raise NotImplementedError

    def __add__(self, other):
        raise NotImplementedError

    def __mul__(self, other):
        raise NotImplementedError

    def __pow__(self, k):
        raise NotImplementedError

    def tanh(self):
        raise NotImplementedError

    def backward(self):
        raise NotImplementedError

    # Provided, built from the operations above:
    def __neg__(self): return self * -1
    def __sub__(self, other): return self + (-other if isinstance(other, Value) else -other)
    def __radd__(self, other): return self + other
    def __rmul__(self, other): return self * other
`,
  solution: `import math

class Value:
    def __init__(self, data, _prev=()):
        self.data = float(data)
        self.grad = 0.0
        self._prev = tuple(_prev)
        self._backward = lambda: None

    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data + other.data, (self, other))
        def _backward():
            self.grad += out.grad
            other.grad += out.grad
        out._backward = _backward
        return out

    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data * other.data, (self, other))
        def _backward():
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad
        out._backward = _backward
        return out

    def __pow__(self, k):
        out = Value(self.data ** k, (self,))
        def _backward():
            self.grad += k * self.data ** (k - 1) * out.grad
        out._backward = _backward
        return out

    def tanh(self):
        t = math.tanh(self.data)
        out = Value(t, (self,))
        def _backward():
            self.grad += (1 - t ** 2) * out.grad
        out._backward = _backward
        return out

    def backward(self):
        order, seen = [], set()
        def build(v):
            if id(v) not in seen:
                seen.add(id(v))
                for p in v._prev:
                    build(p)
                order.append(v)
        build(self)
        self.grad = 1.0
        for v in reversed(order):
            v._backward()

    def __neg__(self): return self * -1
    def __sub__(self, other): return self + (-other if isinstance(other, Value) else -other)
    def __radd__(self, other): return self + other
    def __rmul__(self, other): return self * other
`,
  solutionNote: 'Every `_backward` closure uses `+=`, so a node that feeds several others collects all of their contributions. The topological sort guarantees each node\'s gradient is complete before it is passed further back.',
  checkSummary: 'Forward values and gradients of (a·b + c)² against hand calculation; accumulation for a shared input (x·y + x); a tanh neuron against finite differences; mixing plain numbers; and 200 steps of gradient descent with your engine that fit a single tanh neuron to OR-like data.',
  checks: `
import math
_a, _b, _c = Value(2), Value(-3), Value(10)
_L = (_a * _b + _c) ** 2
_L.backward()
assert _L.data == 16 and _a.grad == -24 and _b.grad == 16 and _c.grad == 8, f"Got L={_L.data}, grads {(_a.grad, _b.grad, _c.grad)}"
_x, _y = Value(3), Value(4)
_f = _x * _y + _x
_f.backward()
assert _x.grad == 5 and _y.grad == 3, f"Shared input must accumulate: dx={_x.grad} (want 5)"
print("PASS: chain rule and accumulation")
def _neuron(vals):
    x1, w1, x2, w2, b = [Value(v) for v in vals]
    return (x1 * w1 + x2 * w2 + b).tanh(), (x1, w1, x2, w2, b)
_vals = [2.0, -3.0, 0.5, 1.0, 6.2]
_out, _leaves = _neuron(_vals)
_out.backward()
for _i in range(5):
    _up, _dn = list(_vals), list(_vals); _up[_i] += 1e-6; _dn[_i] -= 1e-6
    _num = (_neuron(_up)[0].data - _neuron(_dn)[0].data) / 2e-6
    assert abs(_num - _leaves[_i].grad) < 1e-6, f"Input {_i}: backprop {_leaves[_i].grad} vs numeric {_num}"
_m = Value(2) * 3 + 1
assert _m.data == 7
print("PASS: tanh neuron matches finite differences")
_data = [((0, 0), -1), ((0, 1), 1), ((1, 0), 1), ((1, 1), 1)]
_w1, _w2, _bb = Value(0.1), Value(-0.2), Value(0.0)
for _step in range(200):
    _loss = Value(0)
    for (_p, _q), _t in _data:
        _loss = _loss + ((_w1 * _p + _w2 * _q + _bb).tanh() - _t) ** 2
    for _v in (_w1, _w2, _bb): _v.grad = 0.0
    _loss.backward()
    for _v in (_w1, _w2, _bb): _v.data -= 0.1 * _v.grad
assert _loss.data < 0.1, f"Training with your engine should fit OR (final loss {_loss.data:.3f})"
print(f"PASS: trained a neuron with your own autodiff (loss {_loss.data:.4f})")
`,
}
