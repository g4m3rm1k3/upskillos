# Lesson 13 — Phase B Capstone: A Digit Classifier From Scratch

## Concept, in plain English

No new math this lesson — the goal is to point everything from Lessons 8–12
at a real dataset: handwritten digit images. You'll keep this binary (telling
two digits apart) rather than all ten, since your network's output layer is
still a single sigmoid neuron — multi-class output (softmax, more than one
output neuron) is a natural next step but not one this course needs yet to
prove the point: your hand-built backprop can learn something real.

## Type this — Cell 1 (new notebook)

Load a small built-in digit dataset (8×8 pixel images, much smaller than full
MNIST, no download needed) and keep only two digits so it matches your
binary `SimpleNetwork`:

```python
from sklearn.datasets import load_digits

digits = load_digits()
is_binary_subset = (digits.target == 0) | (digits.target == 1)
digit_images = digits.images[is_binary_subset]
digit_labels = digits.target[is_binary_subset].tolist()
```

```python
digit_images.shape, len(digit_labels)
```

## Type this — Cell 2

Look at one, so you know what you're feeding the network:

```python
import matplotlib.pyplot as plt

plt.imshow(digit_images[0], cmap="gray")
plt.title(f"label: {digit_labels[0]}")
```

## What just happened

Each image is an 8×8 grid of pixel brightness values. Your network only
knows how to take a flat list of numbers as input, not a 2D grid — so before
anything else, each image needs to become one long list of 64 numbers.

## Type this — Cell 3

Flatten every image, and scale pixel values down (raw pixel values run
roughly `0`–`16`; dividing by `16` keeps inputs in a small range, which helps
gradient descent converge — large inputs push `hidden_input` far from zero,
straight into the vanishing-gradient territory Lesson 12 showed you):

```python
flattened_inputs = []
for image in digit_images:
    flat = []
    for row in image:
        for pixel in row:
            flat.append(pixel / 16)
    flattened_inputs.append(flat)

len(flattened_inputs), len(flattened_inputs[0])
```

You should see 64 numbers per image.

## Type this — Cell 4

Retype `sigmoid`, `sigmoid_derivative`, and `SimpleNetwork` (the generalized,
swappable-activation version from Lesson 12). Then create a network sized for
64 inputs:

```python
network = SimpleNetwork(num_inputs=64, num_hidden_neurons=16, activation=sigmoid, activation_derivative=sigmoid_derivative)
```

## Type this — Cell 5

Split into training and test sets by hand — the last 20 examples held out,
never trained on, so you can honestly check whether the network generalized
or just memorized:

```python
training_inputs = flattened_inputs[:-20]
training_labels = digit_labels[:-20]
test_inputs = flattened_inputs[-20:]
test_labels = digit_labels[-20:]
```

## Type this — Cell 6

The training loop, same shape as Lesson 11 and 12, just pointed at real data:

```python
for epoch in range(50):
    for inputs, actual_y in zip(training_inputs, training_labels):
        network.backward(inputs, actual_y, learning_rate=0.1)
```

This has more data and more weights than XOR did, so give it a moment.

## Type this — Cell 7

Evaluate on the held-out test set — data the network never trained on:

```python
correct = 0
for inputs, actual_label in zip(test_inputs, test_labels):
    _, _, _, prediction = network.forward(inputs)
    predicted_label = 1 if prediction > 0.5 else 0
    if predicted_label == actual_label:
        correct = correct + 1

accuracy = correct / len(test_labels)
accuracy
```

## What just happened

This number is an honest accuracy — computed on images the network never
adjusted a single weight in response to. If it's high (this binary 0-vs-1
task is easy enough that it usually is), that's real evidence your hand-built
`SimpleNetwork`, trained with backprop you derived on paper in Lesson 10,
generalizes to unseen handwriting, not just memorizes examples it already
saw.

## Checkpoint exercise

1. Print the network's prediction alongside the true label for each of the
   20 test images, and use `plt.imshow` to look at any it got wrong — is the
   handwriting genuinely ambiguous, or does the mistake look avoidable?
2. Try `num_hidden_neurons=4` instead of `16` and compare test accuracy —
   does a smaller hidden layer meaningfully hurt this particular task?
3. Try two harder digits to distinguish (e.g. `4` and `9`, which are visually
   more similar than `0` and `1`) by changing the `is_binary_subset` filter
   in Cell 1, retrain, and compare accuracy against the original 0-vs-1
   result — a concrete look at how task difficulty affects a network you
   otherwise haven't changed at all.

That closes Phase B — every piece of a neural network (neuron, layer,
backprop, training loop, activation functions) built and tested on a real
task without any deep learning framework. Phase C starts by handing this
exact training loop to PyTorch's `autograd`, so you can see precisely what
the library is automating now that you've done it by hand. Say "next lesson"
when ready.
