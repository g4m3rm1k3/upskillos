# Lesson 8 — One Neuron Is Logistic Regression

## Concept, in plain English

No new math this lesson — the point is entirely a reframing. Go back to
Lesson 4: you computed a dot product, added an intercept, squashed it through
sigmoid. That entire pipeline has a name in the neural network world: **one
neuron**. "Weights" are still weights, "intercept" gets renamed "bias" (same
thing, same role), and "sigmoid" gets renamed "activation function" (because
it's not always sigmoid — Lesson 12 covers alternatives). A neural network is
just many of these, arranged in layers, feeding into each other. This lesson
proves that to yourself in code before Lesson 9 adds more neurons.

## The math

Unchanged from Lesson 4, just renamed to match standard neural-network
vocabulary you'll see in every paper and library from here on:

```
neuron_output = activation_function( dot_product(weights, inputs) + bias )
```

where, today, `activation_function = sigmoid`. Same formula, same numbers —
only the words around it are new.

## Type this — Cell 1 (new notebook)

Retype your `sigmoid` and `dot_product` functions from Lesson 4 exactly as
they were — no changes:

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

## Type this — Cell 2

A `Neuron` class — this is your first genuine use of a class in this course,
and it's a thin wrapper: a neuron is just its weights and bias, bundled
together with the computation that uses them.

```python
class Neuron:
    def __init__(self, weights, bias):
        self.weights = weights
        self.bias = bias

    def forward(self, inputs):
        weighted_sum = dot_product(self.weights, inputs) + self.bias
        return sigmoid(weighted_sum)
```

## Type this — Cell 3

Recreate the trained weights and bias you got at the end of Lesson 4 (or
Lesson 7's capstone) and confirm a `Neuron` reproduces the exact same
predictions your plain functions gave you:

```python
example_neuron = Neuron(weights=[0.5, -0.3], bias=0.1)
example_neuron.forward([2, 1])
```

Compare this against calling your old `predict_probability([2, 1], [0.5,
-0.3], 0.1)` from Lesson 4 — they should match exactly, since it's the same
arithmetic in a different wrapper.

## What just happened

Nothing computational changed. What changed is that you now have a `Neuron`
object you can create many of, each with its own independent weights and
bias — which is exactly what Lesson 9 needs: a *layer* is just a list of
these objects, each looking at the same inputs but computing something
different.

## Type this — Cell 4

Prove the "many neurons in parallel" idea works by hand, before Lesson 9
formalizes it — create three neurons with different, made-up weights, and run
the same input through all three:

```python
neuron_a = Neuron(weights=[0.5, -0.3], bias=0.1)
neuron_b = Neuron(weights=[-0.2, 0.8], bias=0.0)
neuron_c = Neuron(weights=[0.1, 0.1], bias=-0.5)

sample_input = [2, 1]
[neuron_a.forward(sample_input), neuron_b.forward(sample_input), neuron_c.forward(sample_input)]
```

## Checkpoint exercise

1. Change `neuron_a`'s weights and bias to the values you actually trained in
   Lesson 4 or Lesson 7's Iris logistic regression, and confirm
   `neuron_a.forward(...)` on a real Iris data point matches what
   `predict_probability` gave you back then.
2. Write, in one or two sentences, what "training a neuron" now means in this
   new vocabulary — you already know the answer, it's Lesson 4's gradient
   descent, just applied to `self.weights` and `self.bias` instead of loose
   variables.
3. Add a `__repr__` method to `Neuron` (`def __repr__(self): return
   f"Neuron(weights={self.weights}, bias={self.bias})"`) so printing a neuron
   shows something readable — small OOP habit, useful once you have many of
   these.

Next lesson stacks several of these neurons into an actual layer, computed
all at once with matrix multiplication instead of a Python loop over
individual `Neuron` objects. Say "next lesson" when ready.
