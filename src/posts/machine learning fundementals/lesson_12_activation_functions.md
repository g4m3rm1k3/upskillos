# Lesson 12 — Activation Functions & Why They Matter

## Concept, in plain English

Sigmoid has been your only activation function so far. It has a real flaw:
look at its shape — for large positive or negative inputs, it flattens out
almost completely (its output barely changes as the input changes a lot).
That flatness means its *derivative* is nearly zero out there. Lesson 10's
backward pass multiplies these derivatives together across layers — chain a
few near-zero numbers together and the gradient reaching early layers shrinks
toward nothing. That's the **vanishing gradient problem**, and this lesson
makes you cause it on purpose so it stops being an abstract warning.

## The math

Sigmoid's derivative, which you already coded in Lesson 10:

```
sigmoid_derivative(z) = sigmoid(z) * (1 - sigmoid(z))
```

Its maximum value is at `z=0`: `sigmoid(0)*(1-sigmoid(0)) = 0.5*0.5 = 0.25`.
It only gets smaller from there — at `z=5`, `sigmoid(5)≈0.993`, so the
derivative is `≈0.993*0.007≈0.0069`. Already tiny, and Lesson 11's backward
pass *multiplies* several such derivatives together across layers — three
layers each contributing `≈0.007` gives a combined factor around
`0.0000003`, which is effectively zero: the gradient update becomes too small
to move the weight at all.

**ReLU** (Rectified Linear Unit) sidesteps this for positive inputs entirely:

```
relu(z) = max(0, z)
relu_derivative(z) = 1 if z > 0 else 0
```

Its derivative is either exactly `1` (no shrinking at all) or exactly `0` (a
different problem — a "dead" neuron that stops learning entirely, since a
`0` gradient never updates it). Worked comparison at `z=5`: `sigmoid_derivative(5)
≈ 0.0069` versus `relu_derivative(5) = 1` — a network using ReLU keeps a full
gradient signal here where sigmoid nearly kills it.

**tanh** is sigmoid rescaled to output between `-1` and `1` instead of `0` and
`1`:

```
tanh_derivative(z) = 1 - tanh(z)**2
```

Its maximum derivative is `1` (at `z=0`), higher than sigmoid's `0.25` — a
genuine improvement, though it still flattens (vanishes) for large `|z|`
exactly like sigmoid does, just less severely.

## Type this — Cell 1 (new notebook)

```python
import math

def sigmoid(z):
    return 1 / (1 + math.exp(-z))

def sigmoid_derivative(z):
    s = sigmoid(z)
    return s * (1 - s)

def relu(z):
    return max(0, z)

def relu_derivative(z):
    return 1 if z > 0 else 0

def tanh(z):
    return math.tanh(z)

def tanh_derivative(z):
    return 1 - math.tanh(z) ** 2
```

## Type this — Cell 2

Reproduce the comparison from the math section directly:

```python
for z in [-5, -1, 0, 1, 5]:
    print(z, sigmoid_derivative(z), relu_derivative(z), tanh_derivative(z))
```

## What just happened

Look at the `z=5` and `z=-5` rows: `sigmoid_derivative` and `tanh_derivative`
are both near zero, while `relu_derivative` is a clean `1` or `0` with no
in-between shrinking. This printed table *is* the vanishing gradient problem,
made visible as plain numbers instead of an abstract warning.

## Type this — Cell 3

Retype `SimpleNetwork` from Lesson 11 (forward and backward methods), but
generalize it to accept an activation function and its derivative as
arguments, instead of hardcoding sigmoid everywhere:

```python
import random

class SimpleNetwork:
    def __init__(self, num_inputs, num_hidden_neurons, activation, activation_derivative):
        self.hidden_weights = [[random.uniform(-1, 1) for _ in range(num_inputs)] for _ in range(num_hidden_neurons)]
        self.hidden_biases = [random.uniform(-1, 1) for _ in range(num_hidden_neurons)]
        self.output_weights = [random.uniform(-1, 1) for _ in range(num_hidden_neurons)]
        self.output_bias = random.uniform(-1, 1)
        self.activation = activation
        self.activation_derivative = activation_derivative

    def forward(self, inputs):
        hidden_inputs = []
        hidden_outputs = []
        for weights, bias in zip(self.hidden_weights, self.hidden_biases):
            weighted_sum = sum(w * x for w, x in zip(weights, inputs)) + bias
            hidden_inputs.append(weighted_sum)
            hidden_outputs.append(self.activation(weighted_sum))
        final_input = sum(w * h for w, h in zip(self.output_weights, hidden_outputs)) + self.output_bias
        prediction = sigmoid(final_input)
        return hidden_inputs, hidden_outputs, final_input, prediction

    def backward(self, inputs, actual_y, learning_rate):
        hidden_inputs, hidden_outputs, final_input, prediction = self.forward(inputs)
        d_error_d_prediction = 2 * (actual_y - prediction) * (-1)
        d_prediction_d_final_input = sigmoid_derivative(final_input)
        output_error_signal = d_error_d_prediction * d_prediction_d_final_input

        new_output_weights = []
        for i in range(len(self.output_weights)):
            gradient = output_error_signal * hidden_outputs[i]
            new_output_weights.append(self.output_weights[i] - learning_rate * gradient)

        new_hidden_weights = []
        new_hidden_biases = []
        for i in range(len(self.hidden_weights)):
            hidden_error_signal = output_error_signal * self.output_weights[i] * self.activation_derivative(hidden_inputs[i])
            new_weights_for_this_neuron = []
            for j, input_value in enumerate(inputs):
                gradient = hidden_error_signal * input_value
                new_weights_for_this_neuron.append(self.hidden_weights[i][j] - learning_rate * gradient)
            new_hidden_weights.append(new_weights_for_this_neuron)
            new_hidden_biases.append(self.hidden_biases[i] - learning_rate * hidden_error_signal)

        self.output_weights = new_output_weights
        self.output_bias = self.output_bias - learning_rate * output_error_signal
        self.hidden_weights = new_hidden_weights
        self.hidden_biases = new_hidden_biases
        return prediction
```

(Note: the output layer still always uses `sigmoid`, on purpose — its output
needs to stay a `0`-to-`1` probability regardless of what the hidden layer
uses. Only `self.activation`/`self.activation_derivative`, used for the
hidden layer, are swappable.)

## Type this — Cell 4

Retype `xor_inputs`/`xor_labels` from Lesson 11, then train two networks
identically except for hidden-layer activation:

```python
xor_inputs = [[0, 0], [0, 1], [1, 0], [1, 1]]
xor_labels = [0, 1, 1, 0]

sigmoid_network = SimpleNetwork(num_inputs=2, num_hidden_neurons=4, activation=sigmoid, activation_derivative=sigmoid_derivative)
relu_network = SimpleNetwork(num_inputs=2, num_hidden_neurons=4, activation=relu, activation_derivative=relu_derivative)

for epoch in range(2000):
    for inputs, actual_y in zip(xor_inputs, xor_labels):
        sigmoid_network.backward(inputs, actual_y, learning_rate=0.1)
        relu_network.backward(inputs, actual_y, learning_rate=0.1)

print("sigmoid network:")
for inputs in xor_inputs:
    print(inputs, sigmoid_network.forward(inputs)[3])

print("relu network:")
for inputs in xor_inputs:
    print(inputs, relu_network.forward(inputs)[3])
```

## What just happened

With a low learning rate and few epochs, you may already see the `relu_network`
learning faster than `sigmoid_network` on this small problem — ReLU's constant
`1` derivative for positive inputs pushes gradient through more efficiently.
On this tiny 1-hidden-layer network the difference is modest; the effect
becomes dramatic in deep networks with many layers, which is exactly why
essentially every modern deep network (Phase C onward) uses ReLU or a
variant, not sigmoid, for hidden layers.

## Checkpoint exercise

1. Deliberately break `sigmoid_network`'s training: initialize weights with
   `random.uniform(-10, 10)` instead of `-1, 1` (edit and rerun `__init__`'s
   range), retrain, and watch it fail to learn at all — large starting
   weights push `hidden_inputs` far from zero immediately, straight into
   sigmoid's near-flat region, so gradients vanish from step one.
2. Try `tanh` as the hidden activation (same pattern as the `relu_network`
   setup in Cell 4) and compare its convergence speed against both the
   sigmoid and ReLU versions.
3. In your own words: why does the *output* layer keep using sigmoid even
   when the hidden layer switches to ReLU? (Tie your answer back to what
   sigmoid's `0`-to-`1` range represents for this problem — a probability —
   and what ReLU's unbounded `0`-to-infinity range would mean instead.)

Next lesson is the Phase B capstone: a digit classifier trained with your own
from-scratch backprop, no framework yet. Say "next lesson" when ready.
