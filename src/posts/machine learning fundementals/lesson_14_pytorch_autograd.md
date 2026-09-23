# Lesson 14 — PyTorch Replaces Your Backprop

## Concept, in plain English

Everything you typed by hand in Lessons 10–13 — forward pass, keeping
intermediate values, the chain rule multiplication in `backward()` — is
exactly what PyTorch's `autograd` does automatically. This lesson rebuilds
Lesson 11's XOR network in PyTorch, so you can watch the library take over a
job you already know how to do yourself. No new math — the whole point is
recognizing the same pieces under new names.

## The math — nothing new, just a vocabulary map

| What you built | PyTorch's name |
|---|---|
| a weight/bias number | a `tensor` with `requires_grad=True` |
| your `forward()` method | still called forward — same idea |
| your manual `d_error_d_w1` etc. chain-rule multiplication | `.backward()` — computes every gradient in the graph automatically |
| `new_w1 = w1 - learning_rate * gradient` | an `optimizer.step()` call, doing the same subtraction |
| your `error` calculation | a `loss function` object, e.g. `nn.MSELoss()` |

## Type this — Cell 1 (new notebook)

```python
import torch
```

A tensor is NumPy's array with one addition: it can track the operations done
to it, so it can later compute its own gradient. Make two weights the same
way you'd make plain numbers, but with `requires_grad=True`:

```python
w1 = torch.tensor(0.5, requires_grad=True)
w2 = torch.tensor(0.5, requires_grad=True)
```

## Type this — Cell 2

Retype Lesson 10's exact forward pass, but with tensors instead of plain
floats — the arithmetic is identical, only the types changed:

```python
input_value = torch.tensor(1.0)
actual_y = torch.tensor(1.0)

hidden_input = w1 * input_value
hidden_output = torch.sigmoid(hidden_input)
final_input = w2 * hidden_output
prediction = torch.sigmoid(final_input)
error = (actual_y - prediction) ** 2

error
```

## What just happened

This is line-for-line Lesson 10's `forward_pass`, using `torch.sigmoid`
instead of your hand-written `sigmoid`. Nothing about the computation
changed — what's different is invisible right now: PyTorch was quietly
recording every operation (`*`, `torch.sigmoid`, `**`) as it happened, building
a graph it can walk *backward* through.

## Type this — Cell 3

```python
error.backward()
w1.grad, w2.grad
```

Compare these two numbers against Lesson 10's hand-derived and hand-coded
result: `backward_pass(input_value=1, actual_y=1, w1=0.5, w2=0.5)` gave you
approximately `(-0.02427, -0.1285)`. These should match.

## What just happened

`error.backward()` just did, automatically, exactly what your `backward_pass`
function did by hand: walked back through every operation in Cell 2's forward
pass, applying the chain rule at each step, and stored the result in
`w1.grad`/`w2.grad`. You didn't write a single derivative — PyTorch derived
each one from the operations you performed, because every PyTorch operation
(`*`, `sigmoid`, `**`) already knows its own local derivative and how to chain
it with what came before.

## Type this — Cell 4

The update step — same subtraction as always, wrapped in `torch.no_grad()` so
PyTorch doesn't try to track the update itself as part of the graph:

```python
learning_rate = 0.5
with torch.no_grad():
    w1 -= learning_rate * w1.grad
    w2 -= learning_rate * w2.grad
    w1.grad.zero_()
    w2.grad.zero_()

w1, w2
```

`.grad.zero_()` matters: gradients *accumulate* by default in PyTorch (each
`.backward()` call adds to whatever's already in `.grad` rather than
replacing it) — skip this and your next training step would silently use a
wrong, inflated gradient.

## Type this — Cell 5

Now the full XOR network from Lesson 11, rebuilt with `torch.nn` — PyTorch's
layer/network building blocks, matching your `Layer`/`SimpleNetwork` classes
almost line for line:

```python
import torch.nn as nn

class XORNetwork(nn.Module):
    def __init__(self):
        super().__init__()
        self.hidden_layer = nn.Linear(2, 4)
        self.output_layer = nn.Linear(4, 1)

    def forward(self, inputs):
        hidden_output = torch.sigmoid(self.hidden_layer(inputs))
        prediction = torch.sigmoid(self.output_layer(hidden_output))
        return prediction
```

`nn.Linear(2, 4)` is exactly your Lesson 9 `Layer` class — a weight matrix and
bias, sized 4 neurons × 2 inputs — except PyTorch initializes and stores the
weights for you.

## Type this — Cell 6

```python
xor_inputs = torch.tensor([[0.0, 0.0], [0.0, 1.0], [1.0, 0.0], [1.0, 1.0]])
xor_labels = torch.tensor([[0.0], [1.0], [1.0], [0.0]])

network = XORNetwork()
loss_function = nn.MSELoss()
optimizer = torch.optim.SGD(network.parameters(), lr=0.5)

for epoch in range(5000):
    predictions = network(xor_inputs)
    loss = loss_function(predictions, xor_labels)
    optimizer.zero_grad()
    loss.backward()
    optimizer.step()

network(xor_inputs)
```

## What just happened

`optimizer.zero_grad()` is Cell 4's `.grad.zero_()`, generalized to every
weight in the network at once. `loss.backward()` is Cell 3's `error.backward()`.
`optimizer.step()` is Cell 4's subtraction, generalized to every weight. This
entire loop is Lesson 11's training loop, with every hand-written piece now
delegated to a library call whose internals you've already built yourself.

## Checkpoint exercise

1. Change `nn.MSELoss()` to a raw computation you write yourself
   (`((predictions - xor_labels) ** 2).mean()`) and confirm training still
   works identically — `nn.MSELoss` is not magic, just this formula.
2. Swap `torch.optim.SGD` for `torch.optim.Adam` (same constructor
   arguments) and compare convergence speed on the same XOR problem — Adam
   is a smarter step-size strategy than plain gradient descent, a detail
   worth knowing exists even without deriving it here.
3. Print `network.hidden_layer.weight` and compare its shape (`4 × 2`)
   against what you'd expect from Lesson 9's `weight_matrix` for a 4-neuron,
   2-input hidden layer — same shape, PyTorch just filled in the numbers.

Next lesson: convolutions — reusing the same small set of weights across an
entire image, which is what lets a network handle real photos instead of
64-pixel toy digits. Say "next lesson" when ready.
