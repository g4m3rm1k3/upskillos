# Lesson 9 — Stacking Neurons: The Hidden Layer

## Concept, in plain English

Lesson 8 ended with three separate `Neuron` objects, each looking at the same
input, each computed with its own `.forward()` call in a loop. That's a
**layer** — a group of neurons that all see the same inputs and each produce
one output number. Run those outputs into *another* layer, and you have a
network with a **hidden layer**: hidden because its outputs aren't the final
answer, just intermediate values the next layer uses.

The loop-over-neurons approach works but is slow and doesn't match how every
real library does it. Real networks compute a whole layer's outputs in one
matrix multiplication. This lesson shows why that's the same computation,
just reorganized.

## The math

A layer with 3 neurons, each taking 2 inputs, has 3 weight vectors of length
2 — stack them into a 3×2 matrix, one row per neuron:

```
weight_matrix = [ [w1_1, w1_2],
                   [w2_1, w2_2],
                   [w3_1, w3_2] ]
```

Multiplying this matrix by the input vector `[x1, x2]` computes all three
neurons' weighted sums in one operation — row `i` of the result is exactly
`dot_product(weight_matrix[i], [x1, x2])`, which is precisely what
`Neuron.forward` computed one at a time in Lesson 8. Matrix multiplication by
a vector is nothing but "do the dot product once per row."

Worked example, weight_matrix `[[1, 2], [3, 4]]`, input `[5, 6]`:

```
row 0: 1*5 + 2*6 = 17
row 1: 3*5 + 4*6 = 39
result = [17, 39]
```

## Type this — Cell 1 (new notebook)

Retype `sigmoid` and `dot_product` from Lesson 8. Then, a `Layer` class —
this replaces looping over separate `Neuron` objects with one matrix (a list
of weight lists) and one bias list:

```python
import math

def sigmoid(z):
    return 1 / (1 + math.exp(-z))

def dot_product(weights, inputs):
    total = 0
    for weight, input_value in zip(weights, inputs):
        total = total + weight * input_value
    return total
```

```python
class Layer:
    def __init__(self, weight_matrix, biases):
        self.weight_matrix = weight_matrix
        self.biases = biases

    def forward(self, inputs):
        outputs = []
        for neuron_weights, neuron_bias in zip(self.weight_matrix, self.biases):
            weighted_sum = dot_product(neuron_weights, inputs) + neuron_bias
            outputs.append(sigmoid(weighted_sum))
        return outputs
```

## Type this — Cell 2

Check this reproduces Lesson 8's three-neuron-by-hand result exactly:

```python
hidden_layer = Layer(
    weight_matrix=[[0.5, -0.3], [-0.2, 0.8], [0.1, 0.1]],
    biases=[0.1, 0.0, -0.5]
)
hidden_layer.forward([2, 1])
```

Compare this list of three numbers against Lesson 8 Cell 4's
`[neuron_a.forward(...), neuron_b.forward(...), neuron_c.forward(...)]` — they
should match exactly.

## What just happened

`Layer.forward` is doing the same loop Lesson 8 did manually with three
separate objects — the only difference is the weights live together in one
`weight_matrix` (a list of lists, one row per neuron) instead of scattered
across separate `Neuron` objects. This is a stepping stone toward real matrix
multiplication in Cell 4.

## Type this — Cell 3

Now chain two layers — the hidden layer's 3 outputs become the next layer's
3 inputs. A second layer with a *single* neuron (for a final yes/no decision)
taking those 3 hidden outputs:

```python
output_layer = Layer(
    weight_matrix=[[0.4, -0.6, 0.2]],
    biases=[0.05]
)

hidden_outputs = hidden_layer.forward([2, 1])
final_output = output_layer.forward(hidden_outputs)
final_output
```

## What just happened

This is a complete, working 2-layer neural network — 2 inputs → hidden layer
of 3 neurons → output layer of 1 neuron. Every number in it is something you
computed by hand in earlier lessons; only the *chaining* (one layer's output
feeding the next layer's input) is new, and even that is just calling
`.forward` twice.

## Type this — Cell 4 — now bring in NumPy for real matrix multiplication

```python
import numpy as np

weight_matrix_np = np.array([[0.5, -0.3], [-0.2, 0.8], [0.1, 0.1]])
biases_np = np.array([0.1, 0.0, -0.5])
inputs_np = np.array([2, 1])

weighted_sums = weight_matrix_np @ inputs_np + biases_np
weighted_sums
```

`@` between a matrix and a vector computes every row's dot product at once —
compare `weighted_sums` (before sigmoid) against what your `Layer.forward`
computed internally, before its `sigmoid` call, for the same inputs.

## Checkpoint exercise

1. Rewrite `Layer.forward` to use `weight_matrix_np @ inputs_np + biases_np`
   instead of the hand-written loop, apply `sigmoid` to each element of the
   result (a Python list comprehension works fine — `[sigmoid(z) for z in
   weighted_sums]`), and confirm it still matches Cell 2's output.
2. Add a fourth neuron to `hidden_layer` (one more row in `weight_matrix`,
   one more entry in `biases`, made-up numbers) and confirm `forward` now
   returns 4 numbers instead of 3, with no other code changes — that's the
   payoff of writing it generically.
3. In your own words: what determines how many rows `output_layer`'s
   `weight_matrix` needs? (Answer to check against: one row per output
   neuron, and each row must have as many entries as `hidden_layer` has
   neurons, since that's what it receives as input.)

Next lesson is the conceptual core of this whole phase: backpropagation,
derived by hand on a tiny 2-weight network on paper before any code. Say
"next lesson" when ready — take your time on that one.
