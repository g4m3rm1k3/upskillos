# Lesson 11 — The Training Loop

## Concept, in plain English

No new math this lesson — you already derived everything you need in Lessons
8–10. This lesson is assembly: wrap the forward pass and backward pass into
classes that hold their own state, extend backprop from the 1-weight toy
network to a real 2-input/3-hidden-neuron/1-output network, and wrap the
whole thing in a training loop you can watch converge on a plottable 2D
dataset.

## The math — extending Lesson 10 to a real-sized network

Lesson 10 derived `d(error)/d(w1)` and `d(error)/d(w2)` for one weight each.
With a full hidden layer, every hidden neuron has its own weights, and each
one gets its *own* copy of the same derivation — the chain rule doesn't
change shape, it just gets applied once per weight, same as Lesson 3 extended
Lesson 2 from one weight to many. The one new bookkeeping fact: the output
neuron's error signal (`d_error_d_prediction * d_prediction_d_final_input`
from Lesson 10) gets reused for *every* hidden neuron's gradient, multiplied
by that hidden neuron's own weight into the output layer. This is why you'll
see this quantity given a name — call it `output_error_signal` — since it's
computed once and reused several times, exactly like Lesson 10's shared
prefix.

## Type this — Cell 1 (new notebook, or continue Lesson 9's)

Retype `sigmoid` and `sigmoid_derivative` from Lesson 10.

```python
import math

def sigmoid(z):
    return 1 / (1 + math.exp(-z))

def sigmoid_derivative(z):
    s = sigmoid(z)
    return s * (1 - s)
```

## Type this — Cell 2

A `SimpleNetwork` class: 2 inputs, one hidden layer of a chosen size, one
output neuron. Weights start as small random numbers (never all zero — if
every hidden neuron starts identical, they'd all learn the exact same thing
forever, a real and instructive failure mode you'll explore in the checkpoint):

```python
import random

class SimpleNetwork:
    def __init__(self, num_inputs, num_hidden_neurons):
        self.hidden_weights = [[random.uniform(-1, 1) for _ in range(num_inputs)] for _ in range(num_hidden_neurons)]
        self.hidden_biases = [random.uniform(-1, 1) for _ in range(num_hidden_neurons)]
        self.output_weights = [random.uniform(-1, 1) for _ in range(num_hidden_neurons)]
        self.output_bias = random.uniform(-1, 1)
```

## Type this — Cell 3

The forward pass method, keeping every intermediate value (same reason as
Lesson 10 — the backward pass needs them):

```python
    def forward(self, inputs):
        hidden_inputs = []
        hidden_outputs = []
        for weights, bias in zip(self.hidden_weights, self.hidden_biases):
            weighted_sum = sum(w * x for w, x in zip(weights, inputs)) + bias
            hidden_inputs.append(weighted_sum)
            hidden_outputs.append(sigmoid(weighted_sum))

        final_input = sum(w * h for w, h in zip(self.output_weights, hidden_outputs)) + self.output_bias
        prediction = sigmoid(final_input)

        return hidden_inputs, hidden_outputs, final_input, prediction
```

(Paste this as a new method inside `SimpleNetwork` — same indentation level as
`__init__`, both inside the class body.)

## What just happened

Compare this line by line against Lesson 10's `forward_pass` — it's the exact
same computation, just looped once per hidden neuron instead of hardcoded for
one. `hidden_inputs`/`hidden_outputs` are now lists instead of single
numbers, everything else is identical in shape.

## Type this — Cell 4

The backward pass, following Lesson 11's math section above — `output_error_signal`
computed once, then reused per hidden neuron:

```python
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
            hidden_error_signal = output_error_signal * self.output_weights[i] * sigmoid_derivative(hidden_inputs[i])
            new_weights_for_this_neuron = []
            for input_value in inputs:
                gradient = hidden_error_signal * input_value
                new_weights_for_this_neuron.append(0)  # placeholder, filled below
            for j, input_value in enumerate(inputs):
                gradient = hidden_error_signal * input_value
                new_weights_for_this_neuron[j] = self.hidden_weights[i][j] - learning_rate * gradient
            new_hidden_weights.append(new_weights_for_this_neuron)
            new_hidden_biases.append(self.hidden_biases[i] - learning_rate * hidden_error_signal)

        new_output_bias = self.output_bias - learning_rate * output_error_signal

        self.output_weights = new_output_weights
        self.output_bias = new_output_bias
        self.hidden_weights = new_hidden_weights
        self.hidden_biases = new_hidden_biases

        return prediction
```

Type this exactly once, then in the checkpoint you'll clean up the
placeholder-list awkwardness yourself — it's left slightly rough on purpose
so there's something concrete to improve.

## What just happened

`hidden_error_signal` is `output_error_signal` (computed once) multiplied by
that specific hidden neuron's weight into the output, multiplied by that
hidden neuron's own sigmoid derivative — precisely Lesson 10's `d(error)/d(w1)`
chain, just written generically for neuron `i` instead of hardcoded for one
neuron. Every hidden neuron reuses the same `output_error_signal`, which is
the efficiency insight from Lesson 10's checkpoint made concrete.

## Type this — Cell 5

A toy 2D dataset with a non-linear boundary (a shape a single-layer logistic
regression genuinely cannot separate — this is *why* the hidden layer
exists):

```python
xor_inputs = [[0, 0], [0, 1], [1, 0], [1, 1]]
xor_labels = [0, 1, 1, 0]
```

The training loop:

```python
network = SimpleNetwork(num_inputs=2, num_hidden_neurons=4)

for epoch in range(5000):
    for inputs, actual_y in zip(xor_inputs, xor_labels):
        network.backward(inputs, actual_y, learning_rate=0.5)

for inputs in xor_inputs:
    _, _, _, prediction = network.forward(inputs)
    print(inputs, prediction)
```

## What just happened

XOR (`0,0→0`, `0,1→1`, `1,0→1`, `1,1→0`) is the textbook example of a pattern
no straight line can separate — Lesson 4's logistic regression alone cannot
learn this, no matter how it's trained. Your network should converge to
predictions near `0` for the two matching-input cases and near `1` for the
two differing-input cases, entirely from the backprop you derived by hand.

## Checkpoint exercise

1. Clean up the awkward double-loop in the hidden-weights section of
   `backward` (the placeholder-then-overwrite pattern) into a single clean
   loop — same result, better code.
2. Change `num_hidden_neurons` to `1` and retrain. It should fail to learn
   XOR (get stuck around `0.5` for everything) — this is a concrete
   demonstration of *why* you need more than one hidden neuron for a
   non-linear pattern.
3. Print the average error across all four XOR points every 500 epochs (not
   every step) so you can watch the loss curve descend, similar to Lesson
   2's checkpoint.

Next lesson looks at *why* sigmoid isn't always the right activation
function, and breaks your own network on purpose to show what goes wrong.
Say "next lesson" when ready.
