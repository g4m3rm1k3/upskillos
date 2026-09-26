// Lab 20 runnable cells, typeset formulas and math ↔ code tables, keyed by lesson id.
// Every cell uses the lesson's own numbers (a = 2, b = −3, c = 10; x = 3, y = 4; the playground's neuron),
// so a cell's output can be checked against the paragraph beside it and against the playground.

export const extras = {
  'l20-graph': {
    formulaTex: '$$d = ab \\qquad e = d + c \\qquad L = e^2$$',
    mathCode: {
      rows: [
        ['$d = ab$', 'd = a * b', 'One node: a product of two inputs.'],
        ['$e = d + c$', 'e = d + c', 'The next node reads d’s stored value.'],
        ['$L = e^2$', 'L = e ** 2', 'The output node.'],
      ],
    },
    notebook: {
      title: 'Lab 20.1 · Computations are graphs',
      intro: 'A formula written one elementary step per line: every line is a node, and every value is kept.',
      cells: [
        {
          title: 'The forward pass, one node per line',
          prose: '**Predict** d, e and L before running. **Then change** c to 5: which nodes change?',
          code: `# L = (a·b + c)², one elementary step per line: each line is a node of the graph.
a, b, c = 2.0, -3.0, 10.0
d = a * b          # node d: a product
e = d + c          # node e: a sum
L = e ** 2         # node L: a square
print(f"d = {d}, e = {e}, L = {L}")`,
        },
      ],
    },
  },
  'l20-local': {
    formulaTex: '$$\\frac{\\partial L}{\\partial a} = \\frac{\\partial L}{\\partial e}\\,\\frac{\\partial e}{\\partial d}\\,\\frac{\\partial d}{\\partial a}$$ $$\\bar u \\mathrel{+}= \\bar v\\,\\frac{\\partial v}{\\partial u}$$',
    mathCode: {
      rows: [
        ['$\\partial L/\\partial L = 1$', 'grad_L = 1.0', 'The backward pass starts at the output.'],
        ['$\\partial L/\\partial e = 2e$', 'grad_e = grad_L * 2 * e', 'Upstream gradient times the square’s local derivative.'],
        ['$\\partial d/\\partial a = b$', 'grad_a = grad_d * b', 'A product passes each input the other input’s value.'],
        ['$\\bar v$', 'grad_x', 'Notation: v̄ is ∂L/∂v, the gradient of the output with respect to node v.'],
        ['$\\bar u \\mathrel{+}= \\bar v\\,\\partial v/\\partial u$', 'grad_a += grad_d * b', 'The node rule: an input u of node v receives v’s gradient times the local derivative.'],
      ],
    },
    notebook: {
      title: 'Lab 20.2 · Local derivatives and the chain rule',
      intro: 'The whole backward pass by hand, then an independent check that reruns the formula.',
      cells: [
        {
          title: 'Backward, output first',
          prose: '**Predict** ∂L/∂b before running (it is 2e times a).',
          code: `a, b, c = 2.0, -3.0, 10.0
d = a * b; e = d + c; L = e ** 2              # forward pass: keep every value

# Backward pass: start with dL/dL = 1 and apply each node's local derivative, output first.
grad_L = 1.0
grad_e = grad_L * 2 * e       # L = e²     -> dL/de = 2e
grad_d = grad_e * 1           # e = d + c  -> de/dd = 1
grad_c = grad_e * 1           #               de/dc = 1
grad_a = grad_d * b           # d = a·b    -> dd/da = b
grad_b = grad_d * a           #               dd/db = a
print(f"dL/de = {grad_e}, dL/dd = {grad_d}, dL/dc = {grad_c}")
print(f"dL/da = {grad_a}, dL/db = {grad_b}")`,
        },
        {
          title: 'An independent check',
          prose: 'Finite differences never use your backward code, so they can catch its mistakes.',
          code: `def f(a, b, c):
    return (a * b + c) ** 2

eps = 1e-6
point = {"a": 2.0, "b": -3.0, "c": 10.0}
for name in point:
    up, down = dict(point), dict(point)
    up[name] += eps; down[name] -= eps
    numeric = (f(**up) - f(**down)) / (2 * eps)       # rerun the whole formula twice per input
    print(f"dL/d{name} by finite difference: {numeric:.4f}")`,
        },
      ],
    },
  },
  'l20-accumulate': {
    formulaTex: '$$\\frac{\\partial f}{\\partial x} = \\frac{\\partial f}{\\partial u}\\frac{\\partial u}{\\partial x} + \\frac{\\partial f}{\\partial v}\\frac{\\partial v}{\\partial x}$$',
    mathCode: {
      rows: [
        ['sum over paths', 'grad_x += grad_p * y; grad_x += grad_f * 1', 'Each use of x adds its contribution.'],
        ['reset before a pass', 'grad_x = 0.0', 'What zero_grad() does for every parameter.'],
      ],
    },
    notebook: {
      title: 'Lab 20.3 · Shared inputs and gradient accumulation',
      intro: 'The += bug made visible, and what happens when gradients are not reset.',
      cells: [
        {
          title: '= against +=',
          prose: '**Predict** both printed values.',
          code: `# f = x·y + x: x is used twice. Backward by hand, two ways.
x, y = 3.0, 4.0
p = x * y; f = p + x                        # forward

grad_f = 1.0
grad_p = grad_f * 1                         # f = p + x -> df/dp = 1
# WRONG: each contribution overwrites the last one
grad_x = grad_p * y                         # through the product
grad_x = grad_f * 1                         # through the sum: the product's 4 is lost
print("with '=' :", grad_x)
# RIGHT: contributions add up
grad_x = 0.0
grad_x += grad_p * y
grad_x += grad_f * 1
print("with '+=':", grad_x, "  (expected y + 1 =", y + 1, ")")`,
        },
        {
          title: 'Forgetting to reset',
          prose: '**Predict** grad_x after the second pass. **Then** uncomment the reset.',
          code: `# Forgetting to reset: run the same backward pass twice without zeroing.
x, y = 3.0, 4.0
grad_x = 0.0
for step in range(2):
    # grad_x = 0.0      <- the reset that zero_grad() does
    grad_x += y * 1.0      # product path
    grad_x += 1.0          # sum path
    print(f"pass {step + 1}: grad_x = {grad_x}")`,
        },
      ],
    },
  },
  'l20-neuron': {
    formulaTex: '$$z = w_1x_1 + w_2x_2 + b \\qquad y = \\tanh z$$ $$\\frac{\\partial y}{\\partial z} = 1 - y^2 \\qquad \\frac{\\partial y}{\\partial w_i} = (1 - y^2)\\,x_i$$',
    mathCode: {
      rows: [
        ['$y = \\tanh z$', 'y = math.tanh(z)', 'The neuron’s output.'],
        ['$1 - y^2$', 'local = 1 - y ** 2', 'tanh’s local derivative, computed from its own output.'],
        ['$\\partial y/\\partial w_i$', 'grad_z * x1', 'Error signal times input, as in Labs 01 and 08.'],
        ['$w \\leftarrow w - \\alpha\\,\\partial L/\\partial w$', 'w1 = w1 - lr * g_w1', 'One gradient step.'],
      ],
    },
    notebook: {
      title: 'Lab 20.4 · Backprop through a neuron',
      intro: 'The playground’s neuron by hand, how saturation shrinks the gradient, and three training steps.',
      cells: [
        {
          title: 'The neuron’s gradients',
          prose: 'The playground’s default neuron. **Predict** why ∂y/∂w₂ is 0.',
          code: `import math
x1, w1, x2, w2, b = 2.0, -3.0, 0.0, 1.0, 6.88     # the playground's neuron
z = x1 * w1 + x2 * w2 + b
y = math.tanh(z)
local = 1 - y ** 2                                # tanh's local derivative, from its own output
grad_z = 1.0 * local                              # upstream gradient dy/dy = 1
print(f"z = {z:.2f}, y = {y:.4f}, 1 - y^2 = {local:.4f}")
print(f"dy/dw1 = {grad_z * x1:.4f}, dy/dw2 = {grad_z * x2:.4f}, dy/db = {grad_z:.4f}")`,
        },
        {
          title: 'Saturation',
          prose: '**Predict** the share at z = 5 before running.',
          code: `import math
for z in [0.0, 0.88, 2.0, 5.0, 10.0]:
    y = math.tanh(z)
    print(f"z = {z:5.2f}: y = {y:.6f}, share of the gradient that passes 1 - y^2 = {1 - y ** 2:.6f}")`,
        },
        {
          title: 'Three training steps',
          prose: 'Target t = 0 with squared error. **Then change** b to 10 and rerun: how much does the loss move now?',
          code: `import math
# One training step: make the neuron's output move toward the target t = 0.
x1, x2, t, lr = 2.0, 0.0, 0.0, 0.1
w1, w2, b = -3.0, 1.0, 6.88
for step in range(3):
    z = x1 * w1 + x2 * w2 + b; y = math.tanh(z); loss = (y - t) ** 2        # forward
    g_y = 2 * (y - t); g_z = g_y * (1 - y ** 2)                              # backward
    g_w1, g_w2, g_b = g_z * x1, g_z * x2, g_z
    w1, w2, b = w1 - lr * g_w1, w2 - lr * g_w2, b - lr * g_b                 # update
    print(f"step {step + 1}: loss before {loss:.4f}  ->  w1 = {w1:.4f}, b = {b:.4f}")`,
        },
      ],
    },
  },
  'l20-check': {
    formulaTex: '$$\\frac{\\partial f}{\\partial x} \\approx \\frac{f(x+\\varepsilon) - f(x-\\varepsilon)}{2\\varepsilon}$$ $$r = \\frac{|a - n|}{\\max(1, |a|, |n|)}$$',
    mathCode: {
      rows: [
        ['central difference', '(f(x + eps) - f(x - eps)) / (2 * eps)', 'Two forward passes per input.'],
        ['$a$, $n$', 'exact, numeric', 'Analytic (backprop) and numeric gradients.'],
        ['$r$', 'abs(numeric - exact) / max(1, abs(numeric), abs(exact))', 'The relative error: about 1e-6 or better means the backward code is right.'],
        ['graph order', 'visit(v): parents first, then order.append(v)', 'Topological order; backward runs it in reverse.'],
      ],
    },
    notebook: {
      title: 'Lab 20.5 · Checking gradients and building an engine',
      intro: 'Choose the step size for finite differences, then a complete scalar autodiff engine in about 50 lines.',
      cells: [
        {
          title: 'Too large, too small, about right',
          prose: '**Predict** which ε gives the smallest error.',
          code: `import math
def f(x):
    return math.tanh(x)
x, exact = 0.5, 1 - math.tanh(0.5) ** 2
for eps in [1e-1, 1e-3, 1e-5, 1e-7, 1e-9, 1e-11, 1e-13]:
    numeric = (f(x + eps) - f(x - eps)) / (2 * eps)
    rel = abs(numeric - exact) / max(1, abs(numeric), abs(exact))
    print(f"eps = {eps:.0e}: relative error {rel:.1e}")`,
        },
        {
          title: 'A scalar autodiff engine',
          prose: 'The same design as the playground’s engine and PyTorch’s autograd. It computes `L = e * e`, using e twice. **Predict** why it still gives −24, not −12.',
          code: `import math

class Value:
    """A number that remembers how it was computed, so gradients can flow back through it."""
    def __init__(self, data, parents=()):
        self.data, self.grad, self.parents = data, 0.0, parents
        self._backward = lambda: None
    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data + other.data, (self, other))
        def back():
            self.grad += out.grad            # += : a value used twice collects both contributions
            other.grad += out.grad
        out._backward = back
        return out
    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data * other.data, (self, other))
        def back():
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad
        out._backward = back
        return out
    def tanh(self):
        t = math.tanh(self.data)
        out = Value(t, (self,))
        def back():
            self.grad += (1 - t ** 2) * out.grad
        out._backward = back
        return out
    def backward(self):
        order, seen = [], set()
        def visit(v):                         # depth-first: inputs before the nodes that use them
            if v not in seen:
                seen.add(v)
                for p in v.parents: visit(p)
                order.append(v)
        visit(self)
        for v in order: v.grad = 0.0          # zero_grad
        self.grad = 1.0
        for v in reversed(order): v._backward()

a, b, c = Value(2.0), Value(-3.0), Value(10.0)
e = a * b + c
L = e * e
L.backward()
print("L =", L.data, " dL/da =", a.grad, " dL/db =", b.grad, " dL/dc =", c.grad)
x, y = Value(3.0), Value(4.0)
f = x * y + x
f.backward()
print("f =", f.data, " df/dx =", x.grad, " df/dy =", y.grad)`,
        },
      ],
    },
  },
}
