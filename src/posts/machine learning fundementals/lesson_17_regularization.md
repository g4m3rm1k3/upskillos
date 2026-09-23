# Lesson 17 — Regularization & Generalization

## Concept, in plain English

Lesson 13's held-out test set existed for a reason: a network can get very
good at its training data while getting *worse* at everything else — it
memorizes specific examples instead of learning the general pattern. That gap
between training performance and test performance is **overfitting**. This
lesson causes it on purpose (small dataset, big network, too many training
epochs), so you see the actual symptom — training loss still falling, test
loss rising — before learning the two standard fixes.

## The math

**Weight decay** adds a penalty to the loss function based on how large the
weights are, so the network is discouraged from relying on any single weight
too heavily:

```
penalized_loss = original_loss + weight_decay_strength * sum(w**2 for w in all_weights)
```

The gradient of that penalty term with respect to any weight `w` is `2 *
weight_decay_strength * w` — added on top of whatever gradient the original
loss already contributed. Concretely: every update step now also nudges
every weight slightly *toward* zero, proportional to its own size, in
addition to whatever the task's actual gradient says. Large weights get
pulled back harder than small ones, since the penalty term is quadratic.

**Dropout** works differently — no formula to derive, just a rule: during
training, randomly zero out a fraction of neurons' outputs at each step
(commonly `p=0.5`, half of them), forcing the network to not depend on any
one neuron being present. Worked intuition: if a hidden neuron detects "has a
loop" for digit `0`, and dropout randomly disables it half the time, the
network is forced to also develop other ways to detect `0` — spreading the
learned pattern across many neurons instead of concentrating it, which tends
to generalize better to new examples.

## Type this — Cell 1 (new notebook)

Retype Lesson 13's data-loading (digits, 0-vs-1 subset, flattened, scaled) and
`SimpleNetwork` (Lesson 12's swappable-activation version). Then deliberately
create the overfitting setup: keep only a *small* training set, but a
*large* hidden layer:

```python
from sklearn.datasets import load_digits

digits = load_digits()
is_binary_subset = (digits.target == 0) | (digits.target == 1)
digit_images = digits.images[is_binary_subset]
digit_labels = digits.target[is_binary_subset].tolist()

flattened_inputs = []
for image in digit_images:
    flat = []
    for row in image:
        for pixel in row:
            flat.append(pixel / 16)
    flattened_inputs.append(flat)

# deliberately tiny training set, larger held-out test set, to encourage overfitting
training_inputs = flattened_inputs[:15]
training_labels = digit_labels[:15]
test_inputs = flattened_inputs[15:60]
test_labels = digit_labels[15:60]
```

## Type this — Cell 2

```python
def evaluate_accuracy(network, inputs_list, labels_list):
    correct = 0
    for inputs, actual_label in zip(inputs_list, labels_list):
        _, _, _, prediction = network.forward(inputs)
        predicted_label = 1 if prediction > 0.5 else 0
        if predicted_label == actual_label:
            correct = correct + 1
    return correct / len(labels_list)
```

Train a large, overfit-prone network, checking both accuracies every 100
epochs:

```python
overfit_network = SimpleNetwork(num_inputs=64, num_hidden_neurons=32, activation=sigmoid, activation_derivative=sigmoid_derivative)

for epoch in range(2000):
    for inputs, actual_y in zip(training_inputs, training_labels):
        overfit_network.backward(inputs, actual_y, learning_rate=0.1)
    if epoch % 100 == 0:
        train_acc = evaluate_accuracy(overfit_network, training_inputs, training_labels)
        test_acc = evaluate_accuracy(overfit_network, test_inputs, test_labels)
        print(epoch, "train:", train_acc, "test:", test_acc)
```

## What just happened

Watch the printed columns: training accuracy should climb to `1.0` quickly
and stay there, while test accuracy likely climbs early, then plateaus or
even dips — the network has started memorizing its 15 training examples
rather than learning the general 0-vs-1 pattern. That gap is overfitting, now
something you've watched happen rather than been told about.

## Type this — Cell 3 — add weight decay

Add weight decay to `backward` by hand — a small addition to each weight's
gradient before the update:

```python
    def backward_with_weight_decay(self, inputs, actual_y, learning_rate, weight_decay_strength):
        hidden_inputs, hidden_outputs, final_input, prediction = self.forward(inputs)
        d_error_d_prediction = 2 * (actual_y - prediction) * (-1)
        d_prediction_d_final_input = sigmoid_derivative(final_input)
        output_error_signal = d_error_d_prediction * d_prediction_d_final_input

        new_output_weights = []
        for i in range(len(self.output_weights)):
            gradient = output_error_signal * hidden_outputs[i] + 2 * weight_decay_strength * self.output_weights[i]
            new_output_weights.append(self.output_weights[i] - learning_rate * gradient)

        new_hidden_weights = []
        new_hidden_biases = []
        for i in range(len(self.hidden_weights)):
            hidden_error_signal = output_error_signal * self.output_weights[i] * self.activation_derivative(hidden_inputs[i])
            new_weights_for_this_neuron = []
            for j, input_value in enumerate(inputs):
                gradient = hidden_error_signal * input_value + 2 * weight_decay_strength * self.hidden_weights[i][j]
                new_weights_for_this_neuron.append(self.hidden_weights[i][j] - learning_rate * gradient)
            new_hidden_weights.append(new_weights_for_this_neuron)
            new_hidden_biases.append(self.hidden_biases[i] - learning_rate * hidden_error_signal)

        self.output_weights = new_output_weights
        self.output_bias = self.output_bias - learning_rate * output_error_signal
        self.hidden_weights = new_hidden_weights
        self.hidden_biases = new_hidden_biases
        return prediction
```

(Add this as a second method inside `SimpleNetwork`, alongside the original
`backward` — compare them side by side; the only difference is the `+ 2 *
weight_decay_strength * weight` term added to each gradient, exactly matching
the math section above.)

## Type this — Cell 4

Retrain with weight decay and compare the train/test gap:

```python
decayed_network = SimpleNetwork(num_inputs=64, num_hidden_neurons=32, activation=sigmoid, activation_derivative=sigmoid_derivative)

for epoch in range(2000):
    for inputs, actual_y in zip(training_inputs, training_labels):
        decayed_network.backward_with_weight_decay(inputs, actual_y, learning_rate=0.1, weight_decay_strength=0.01)
    if epoch % 100 == 0:
        train_acc = evaluate_accuracy(decayed_network, training_inputs, training_labels)
        test_acc = evaluate_accuracy(decayed_network, test_inputs, test_labels)
        print(epoch, "train:", train_acc, "test:", test_acc)
```

## What just happened

Compare this printout against Cell 2's. Weight decay typically closes the
train/test gap somewhat — training accuracy may rise a little slower, but
test accuracy tends to hold up better, since the penalty discourages the
network from leaning hard on a few large weights that happen to fit the 15
training examples precisely.

## Type this — Cell 5 — dropout, in PyTorch

Dropout's random-zeroing behavior is awkward to hand-roll cleanly into your
existing backward pass, so this piece uses PyTorch directly:

```python
import torch
import torch.nn as nn

class DropoutNetwork(nn.Module):
    def __init__(self):
        super().__init__()
        self.hidden_layer = nn.Linear(64, 32)
        self.dropout = nn.Dropout(p=0.5)
        self.output_layer = nn.Linear(32, 1)

    def forward(self, inputs):
        hidden_output = torch.sigmoid(self.hidden_layer(inputs))
        hidden_output = self.dropout(hidden_output)
        prediction = torch.sigmoid(self.output_layer(hidden_output))
        return prediction
```

`nn.Dropout(p=0.5)` only actually zeroes neurons while the model is in
training mode (`model.train()`); calling `model.eval()` before evaluating on
test data turns dropout off, since at prediction time you want the network's
full capacity, not a randomly weakened version of it.

## Checkpoint exercise

1. Train `DropoutNetwork` on the same tiny 15-example training set (converted
   to tensors) for 2000 epochs, calling `.eval()` before each test-accuracy
   check and `.train()` before resuming training, and compare its train/test
   gap against Cell 2's plain network and Cell 4's weight-decay network.
2. Try `weight_decay_strength=0.1` (10x stronger) in Cell 4's training loop
   and see what happens to *training* accuracy — this is regularization
   pushed too far, a concrete look at the opposite failure mode
   (underfitting).
3. In your own words, using this lesson's printed numbers as evidence: why
   does a *larger* training set (try changing Cell 1's slice from `[:15]` to
   `[:100]`) reduce overfitting even with no regularization technique added
   at all?

Next lesson is the Phase C capstone: an image CNN and a small sequence RNN,
both in PyTorch, both compared against your Phase B from-scratch network. Say
"next lesson" when ready.
