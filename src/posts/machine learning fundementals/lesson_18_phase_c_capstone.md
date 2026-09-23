# Lesson 18 — Phase C Capstone

## Concept, in plain English

No new math this lesson. Bring together Lessons 14–17: build a real CNN and a
real RNN in PyTorch, and compare both against your Phase B from-scratch
`SimpleNetwork` on tasks each is suited for. The point is a direct,
side-by-side feel for what convolution and recurrence actually buy you over
a plain fully-connected network, on real data rather than toy examples.

## Type this — Cell 1 (new notebook)

Load the full 10-digit dataset this time (not just 0-vs-1) — a proper
multi-class task, which needs one new piece: an output layer with 10 neurons
instead of 1, and `softmax` instead of `sigmoid` on the output, so the 10
outputs form a valid probability distribution that sums to `1`. This is a
direct generalization of Lesson 4's sigmoid to more than two classes —
`nn.CrossEntropyLoss` in PyTorch actually combines the softmax and the loss
calculation internally, so you don't call softmax by hand here.

```python
from sklearn.datasets import load_digits
import torch
import numpy as np

digits = load_digits()
all_images = digits.images
all_labels = digits.target

flattened = np.array([image.flatten() / 16 for image in all_images])
inputs_tensor = torch.tensor(flattened, dtype=torch.float32)
labels_tensor = torch.tensor(all_labels, dtype=torch.long)

training_inputs = inputs_tensor[:1500]
training_labels = labels_tensor[:1500]
test_inputs = inputs_tensor[1500:]
test_labels = labels_tensor[1500:]
```

## Type this — Cell 2 — plain fully-connected network (your Phase B design, in PyTorch)

```python
import torch.nn as nn

class FullyConnectedNetwork(nn.Module):
    def __init__(self):
        super().__init__()
        self.hidden_layer = nn.Linear(64, 32)
        self.output_layer = nn.Linear(32, 10)

    def forward(self, inputs):
        hidden_output = torch.relu(self.hidden_layer(inputs))
        return self.output_layer(hidden_output)
```

```python
def train_and_evaluate(model, epochs, learning_rate):
    loss_function = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)

    for epoch in range(epochs):
        predictions = model(training_inputs)
        loss = loss_function(predictions, training_labels)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

    model.eval()
    with torch.no_grad():
        test_predictions = model(test_inputs)
        predicted_labels = test_predictions.argmax(dim=1)
        accuracy = (predicted_labels == test_labels).float().mean().item()
    return accuracy
```

```python
fc_network = FullyConnectedNetwork()
train_and_evaluate(fc_network, epochs=200, learning_rate=0.001)
```

## What just happened

`test_predictions.argmax(dim=1)` picks, for each test image, whichever of
the 10 output numbers is largest — that's the network's predicted digit.
This `FullyConnectedNetwork` is structurally your Phase B `SimpleNetwork`
(one hidden layer, dot products, an activation), just extended from 1 output
to 10 and trained with `CrossEntropyLoss`, the proper multi-class
generalization of Lesson 4's log-loss.

## Type this — Cell 3 — CNN version

```python
class CNNNetwork(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv_layer = nn.Conv2d(in_channels=1, out_channels=8, kernel_size=3)
        self.output_layer = nn.Linear(8 * 6 * 6, 10)

    def forward(self, inputs):
        images = inputs.view(-1, 1, 8, 8)
        conv_output = torch.relu(self.conv_layer(images))
        flattened = conv_output.view(conv_output.size(0), -1)
        return self.output_layer(flattened)
```

`inputs.view(-1, 1, 8, 8)` reshapes the flat 64-number input back into an
8×8 image with 1 channel, since `nn.Conv2d` (Lesson 15) needs a real 2D
grid, not a flat vector — the opposite reshape from Lesson 13's flattening.
`8 * 6 * 6` is 8 filters × the 6×6 output size Lesson 15 showed a 3×3 filter
produces on an 8×8 image.

```python
cnn_network = CNNNetwork()
train_and_evaluate(cnn_network, epochs=200, learning_rate=0.001)
```

## What just happened

Compare this accuracy against Cell 2's. On this particular easy, small,
already-centered dataset the two often land close together — convolution's
real advantage (fewer parameters, translation invariance) shows up more
clearly on larger, less curated image datasets, but you're now equipped to
recognize that advantage when you meet it, since you built the mechanism by
hand in Lesson 15.

## Type this — Cell 4 — a sequence task for the RNN

Digits don't have a natural sequence structure, so give the RNN a task suited
to it instead: reading each image row by row (8 timesteps of 8 numbers each)
and classifying based on the sequence of rows — an artificial but genuine
use of order:

```python
class RNNNetwork(nn.Module):
    def __init__(self):
        super().__init__()
        self.rnn_layer = nn.RNN(input_size=8, hidden_size=32, batch_first=True)
        self.output_layer = nn.Linear(32, 10)

    def forward(self, inputs):
        row_sequences = inputs.view(-1, 8, 8)
        _, final_hidden_state = self.rnn_layer(row_sequences)
        return self.output_layer(final_hidden_state.squeeze(0))
```

`inputs.view(-1, 8, 8)` reshapes each flat 64-number image into a sequence of
8 rows of 8 numbers — the RNN reads one row at a time, carrying its hidden
state forward exactly as in Lesson 16, then the final hidden state (a
summary of the whole image, read top to bottom) feeds the output layer.

```python
rnn_network = RNNNetwork()
train_and_evaluate(rnn_network, epochs=200, learning_rate=0.001)
```

## What just happened

This is a genuinely awkward use of an RNN — images aren't naturally
sequences — and you may see it underperform both other networks here. That's
an honest, useful result: RNNs earn their advantage on data that's actually
sequential (text, audio, time series), not on data forced into a sequence
shape. You've now seen all three architectures on identical data, which is
the fairest comparison this course can offer.

## Checkpoint exercise

1. Print all three accuracies together and rank them for this specific
   dataset — then write one sentence per architecture on what task it would
   likely win on instead (tie back to Lessons 15 and 16's "why" sections).
2. Add a `dropout` layer (Lesson 17) to `FullyConnectedNetwork` and see
   whether it changes the train/test gap on this larger, less overfit-prone
   1500-image training set compared to Lesson 17's deliberately tiny
   15-image example.
3. Time each of the three `train_and_evaluate` calls (`import time; start =
   time.time()` before, `time.time() - start` after) and compare — parameter
   count and computation per step differ meaningfully across these three
   architectures even when accuracy is similar.

That closes Phase C — you've now built a neuron, a layer, backprop, a CNN,
and an RNN, first by hand and then in a real framework. Phase D is the
capstone topic: attention and transformers, the architecture behind every
modern large language model, starting from "attention as a weighted lookup"
before any code. Say "next lesson" when ready.
