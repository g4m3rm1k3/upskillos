---
title: 13.4 — Looking for Shapes: Convolutional Networks
track: PyTorch — Reading Handwritten Digits
runtime: none
concepts: pytorch
revisits: neural-networks, matrices, regularization, web-security, testing
notebook: ml-cnns
lab: 24
problem: The network learned a separate weight for every pixel position, so a digit moved one pixel sideways looks like a different digit to it. A person looks for strokes, loops and corners wherever they are. Can a network be built to do the same, and what does it take to make it really robust?
---

Lesson 13.3's network fell from 97% to about 43% when the digits moved one pixel to the right. It had learned "a dark pixel at position 37 suggests a 3", not "a curve like this suggests a 3". A curve one pixel over is, to it, unrelated.

Images have structure that the network ignored: **nearby pixels belong together**, and **the same shape means the same thing anywhere in the picture**. A convolutional network is built around exactly those two facts.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_vision.py provided
# Tests for vision.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_vision.py
import numpy as np
import torch

import digits

TRAIN_IMAGES, TEST_IMAGES, TRAIN_LABELS, TEST_LABELS = digits.split(*digits.load())
EDGE = np.array([[-1.0, 0.0, 1.0], [-1.0, 0.0, 1.0], [-1.0, 0.0, 1.0]])


def test_convolve_slides_a_small_filter_over_the_image():
    import vision
    line = np.zeros((5, 5))
    line[:, 2] = 1
    assert vision.convolve(line, EDGE)[2].tolist() == [0, 3, 0, -3, 0]


def test_convolve_matches_pytorchs_conv2d():
    import vision
    image = TEST_IMAGES[0]
    theirs = torch.nn.functional.conv2d(torch.tensor(image)[None, None], torch.tensor(EDGE)[None, None], padding=1)
    assert np.allclose(vision.convolve(image, EDGE), theirs[0, 0].numpy())


def test_shift_moves_columns_and_fills_with_blank():
    import vision
    images = np.arange(8.0).reshape(1, 2, 4)
    assert vision.shift(images, 1).tolist() == [[[0, 0, 1, 2], [0, 4, 5, 6]]]
    assert vision.shift(images, -1).tolist() == [[[1, 2, 3, 0], [5, 6, 7, 0]]]


def test_the_cnn_has_fewer_weights_than_the_flat_network():
    import vision
    count = lambda model: sum(p.numel() for p in model.parameters())
    assert count(vision.make_cnn()) == 1898 < count(digits.make_mlp()) == 4810
    assert vision.make_cnn()(torch.zeros(5, 1, 8, 8)).shape == (5, 10)


def test_a_cnn_trained_on_shifts_reads_shifted_digits():
    import vision
    model = vision.make_cnn()
    digits.train(model, *vision.with_shifts(TRAIN_IMAGES, TRAIN_LABELS), epochs=30)
    for columns in [0, 1, -1]:
        assert np.mean(digits.predict(model, vision.shift(TEST_IMAGES, columns)) == TEST_LABELS) >= 0.95


def test_a_saved_model_comes_back_identical(tmp_path):
    import vision
    model = vision.make_cnn()
    digits.train(model, TRAIN_IMAGES, TRAIN_LABELS, epochs=2)
    vision.save(model, tmp_path / "reader.pt")
    again = vision.load(tmp_path / "reader.pt")
    assert np.array_equal(digits.predict(again, TEST_IMAGES), digits.predict(model, TEST_IMAGES))
```

**`tmp_path`** in the last test's parameters is a pytest **fixture**: pytest sees the name and passes in a fresh, empty temporary folder for the test to write in, deleted afterwards, so tests never leave files in your project.

```check
file tests/test_vision.py -- Click "Create provided tests/test_vision.py" above.
```

## Convolution: one small filter, everywhere

> **Convolution** (in image processing and CNNs): sliding a small grid of weights, the **filter** or **kernel** (here 3 × 3), over every position in the image. At each position, multiply the filter by the 3 × 3 patch of pixels under it and add up the nine products. The result is a new image, a **feature map**, that's large wherever the patch looks like the filter.
>
> *Picture it as* a go/no-go template slid across a sheet, position by position. At every position you note how well the template fits; the record of fits is the feature map. The same template is used everywhere, so a feature is found wherever it is.

The test's filter, `EDGE`, has −1s in its left column and +1s in its right: it responds to **vertical edges**, dark on one side and light on the other. Run it over a 5 × 5 image with a vertical line down the middle (column 2):

- centred one column *left* of the line, the line is under the filter's +1s: 3 × 1 = **3**;
- centred *on* the line, it's under the 0s: **0**;
- centred one column *right*, under the −1s: **−3**.

So the middle row of the result is `[0, 3, 0, -3, 0]`: the filter found the line's left edge and right edge.

At the image's border, the 3 × 3 patch would hang over the edge, so the image is first **padded** with a ring of zeros (blank paper). That keeps the output the same size as the input.

Create `vision.py`:

```python file=vision.py
import numpy as np
import torch


def convolve(image: np.ndarray, kernel: np.ndarray) -> np.ndarray:
    """Slide a square kernel over every position of a padded image; one sum of products per position."""
    size = kernel.shape[0]
    pad = size // 2
    padded = np.pad(image, pad)
    out = np.zeros_like(image, dtype=float)
    for row in range(image.shape[0]):
        for col in range(image.shape[1]):
            out[row, col] = (padded[row:row + size, col:col + size] * kernel).sum()
    return out
```

- **`np.pad(image, pad)`** adds `pad` rows and columns of zeros on every side: an 8 × 8 image becomes 10 × 10.
- **`padded[row:row + size, col:col + size]`** is the 3 × 3 patch under the filter when it's centred on `(row, col)` of the original image. Multiplied element by element by the kernel and summed: one output pixel.

`torch.nn.functional.conv2d` computes exactly this, and the second test checks they agree on a real digit. (Strictly, sliding without flipping the filter is called *cross-correlation*; deep learning calls it convolution anyway.)

```check
run ".venv/Scripts/python -m pytest -q tests/test_vision.py -k convolve" label="convolution by hand finds the line's edges, and equals PyTorch's conv2d" -- pad with zeros; for each (row, col): (padded[row:row+3, col:col+3] * kernel).sum()
```

## A convolutional network

In a **convolutional layer**, the filters aren't designed by hand: their nine weights are **learned**, by backpropagation, like any other weights. A layer has several filters, each producing its own feature map, so the network can learn to find several kinds of stroke.

Between convolutions, a **pooling** layer shrinks each feature map: **max pooling** with size 2 replaces each 2 × 2 block with its largest value. That halves the width and height, and makes the result care less about exactly where in the block a feature was found: a small built-in tolerance for shifts.

The model for this lesson:

| layer | output shape (per image) | what it does |
|---|---|---|
| input | 1 × 8 × 8 | one grey channel |
| `Conv2d(1, 8, kernel_size=3, padding=1)` + ReLU | 8 × 8 × 8 | 8 learned filters, 8 feature maps |
| `MaxPool2d(2)` | 8 × 4 × 4 | keep the strongest response in each 2 × 2 block |
| `Conv2d(8, 16, kernel_size=3, padding=1)` + ReLU | 16 × 4 × 4 | 16 filters, each looking across all 8 maps: combinations of strokes |
| `MaxPool2d(2)` | 16 × 2 × 2 | |
| `Flatten` + `Linear(64, 10)` | 10 | a score per digit |

The weights: the first layer's 8 filters have 3 × 3 weights each plus a bias, 80 in all. The second layer's 16 filters each look across 8 maps, 16 × (8 × 9 + 1) = 1,168. The last layer is 64 × 10 + 10 = 650. That's **1,898** in total, against the flat network's 4,810. Fewer weights, because each filter's 9 weights are **shared** across every position instead of every position having its own.

> **Convolutional neural network** (CNN): a network whose early layers are convolutions (shared filters slid over the image) and pooling, usually followed by ordinary layers that make the final decision. The early layers learn local features (edges, strokes); deeper ones combine them into larger shapes.
>
> *Picture it as* an inspection procedure that first scans the whole part for a few small defect signatures (a burr, a scratch, a chip) wherever they are, and only then judges the part from what it found and roughly where.

Add the model, and the shifting functions, to `vision.py`:

```python file=vision.py
import numpy as np
import torch


def convolve(image: np.ndarray, kernel: np.ndarray) -> np.ndarray:
    """Slide a square kernel over every position of a padded image; one sum of products per position."""
    size = kernel.shape[0]
    pad = size // 2
    padded = np.pad(image, pad)
    out = np.zeros_like(image, dtype=float)
    for row in range(image.shape[0]):
        for col in range(image.shape[1]):
            out[row, col] = (padded[row:row + size, col:col + size] * kernel).sum()
    return out


def make_cnn(seed: int = 0) -> torch.nn.Module:
    """Two rounds of 3 × 3 convolution, ReLU and 2 × 2 max pooling, then a score per digit."""
    torch.manual_seed(seed)
    return torch.nn.Sequential(
        torch.nn.Conv2d(1, 8, kernel_size=3, padding=1),
        torch.nn.ReLU(),
        torch.nn.MaxPool2d(2),
        torch.nn.Conv2d(8, 16, kernel_size=3, padding=1),
        torch.nn.ReLU(),
        torch.nn.MaxPool2d(2),
        torch.nn.Flatten(),
        torch.nn.Linear(16 * 2 * 2, 10),
    )


def shift(images: np.ndarray, columns: int) -> np.ndarray:
    """Every image moved sideways by the given number of columns (right if positive), blank where it moved from."""
    moved = np.roll(images, columns, axis=2)
    if columns > 0:
        moved[:, :, :columns] = 0
    elif columns < 0:
        moved[:, :, columns:] = 0
    return moved


def with_shifts(images: np.ndarray, labels: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """The images plus copies moved one column right and one column left."""
    return np.concatenate([images, shift(images, 1), shift(images, -1)]), np.concatenate([labels] * 3)
```

- **`np.roll(images, columns, axis=2)`** slides every image's columns sideways; whatever falls off one edge comes back on the other. The next lines blank out those wrapped-around columns, so the effect is a real shift.
- **`np.concatenate([a, b, c])`** joins arrays end to end: three times as many training images, and the labels repeated to match.

`digits.train` and `digits.predict` from lesson 13.3 work on this model unchanged; that's the payoff of `torch.nn.Module`.

```check
run ".venv/Scripts/python -m pytest -q tests/test_vision.py -k \"shift or fewer or reads\"" label="shifting works; the CNN has 1,898 weights; trained on shifts it reads moved digits"
```

## Teaching robustness: augmentation

Sharing filters makes a CNN *notice* a stroke anywhere, but the final layer still learned from centred digits. The direct fix is to show it moved digits while training: every training image, plus a copy moved left and a copy moved right. That's `with_shifts`.

> **Data augmentation**: enlarging the training set with altered copies of the training examples (shifted, rotated, brightened…) that should get the same label. It teaches the model which changes *don't* matter.
>
> *Picture it as* training an inspector on parts photographed from slightly different angles, so a part that arrives a little crooked in the fixture doesn't fool them.

**Where the picture stops working:** only augment with changes that really don't change the answer. Rotate a 6 by half a turn and it's a 9. Flip a 2 left to right and it isn't a 2 any more. Augmentation encodes what you *know* about the problem, and getting it wrong teaches the model something false.

Create `compare.py` to train all four combinations and test each on centred and shifted digits:

```python file=compare.py
import numpy as np

import digits
import vision

train_images, test_images, train_labels, test_labels = digits.split(*digits.load())

print(f"{'model':<44}{'weights':>8}{'centred':>9}{'right':>7}{'left':>7}")
for name, make in [("network (64 -> 64 -> 10)", digits.make_mlp), ("convolutional network", vision.make_cnn)]:
    for shifted_training in [False, True]:
        model = make()
        images, labels = vision.with_shifts(train_images, train_labels) if shifted_training else (train_images, train_labels)
        digits.train(model, images, labels, epochs=30)
        scores = [np.mean(digits.predict(model, vision.shift(test_images, columns)) == test_labels) for columns in [0, 1, -1]]
        weights = sum(p.numel() for p in model.parameters())
        label = name + (", trained on shifts" if shifted_training else "")
        print(f"{label:<44}{weights:>8}{scores[0]:>9.3f}{scores[1]:>7.3f}{scores[2]:>7.3f}")
```

```powershell
.venv\Scripts\python compare.py
```

It trains four networks, so give it half a minute.

```text
model                                        weights  centred  right   left
network (64 -> 64 -> 10)                        4810    0.967  0.429  0.438
network (64 -> 64 -> 10), trained on shifts     4810    0.962  0.953  0.971
convolutional network                           1898    0.967  0.553  0.687
convolutional network, trained on shifts        1898    0.980  0.978  0.980
```

- **Without augmentation**, both networks fall apart on shifted digits, but the CNN less badly (55–69% against 43–44%): shared filters and pooling give it some tolerance for free.
- **With augmentation**, both recover. The CNN is best everywhere: **98% on centred and shifted digits alike**, with fewer than half the weights. Building in what's true about images (local shapes, shared everywhere) *plus* teaching which changes don't matter beats either alone.

```check
run ".venv/Scripts/python compare.py" stdout="model                                        weights  centred  right   left" label="compare.py trains and tests both networks with and without shifted training"
```

## Keeping the trained model

Training took seconds here, but real models take hours or days. A trained model must be saved and loaded, which Chapter 15 will build a whole system around. PyTorch saves a model's **state dict**: a dictionary of every parameter tensor by name. To load, build the same architecture and pour the saved values in. Add to `vision.py`:

```python file=vision.py
import numpy as np
import torch


def convolve(image: np.ndarray, kernel: np.ndarray) -> np.ndarray:
    """Slide a square kernel over every position of a padded image; one sum of products per position."""
    size = kernel.shape[0]
    pad = size // 2
    padded = np.pad(image, pad)
    out = np.zeros_like(image, dtype=float)
    for row in range(image.shape[0]):
        for col in range(image.shape[1]):
            out[row, col] = (padded[row:row + size, col:col + size] * kernel).sum()
    return out


def make_cnn(seed: int = 0) -> torch.nn.Module:
    """Two rounds of 3 × 3 convolution, ReLU and 2 × 2 max pooling, then a score per digit."""
    torch.manual_seed(seed)
    return torch.nn.Sequential(
        torch.nn.Conv2d(1, 8, kernel_size=3, padding=1),
        torch.nn.ReLU(),
        torch.nn.MaxPool2d(2),
        torch.nn.Conv2d(8, 16, kernel_size=3, padding=1),
        torch.nn.ReLU(),
        torch.nn.MaxPool2d(2),
        torch.nn.Flatten(),
        torch.nn.Linear(16 * 2 * 2, 10),
    )


def shift(images: np.ndarray, columns: int) -> np.ndarray:
    """Every image moved sideways by the given number of columns (right if positive), blank where it moved from."""
    moved = np.roll(images, columns, axis=2)
    if columns > 0:
        moved[:, :, :columns] = 0
    elif columns < 0:
        moved[:, :, columns:] = 0
    return moved


def with_shifts(images: np.ndarray, labels: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """The images plus copies moved one column right and one column left."""
    return np.concatenate([images, shift(images, 1), shift(images, -1)]), np.concatenate([labels] * 3)


def save(model: torch.nn.Module, path) -> None:
    torch.save(model.state_dict(), path)


def load(path) -> torch.nn.Module:
    model = make_cnn()
    model.load_state_dict(torch.load(path, weights_only=True))
    return model
```

**`weights_only=True`** is a security setting, and it matters. A PyTorch file is saved with Python's **pickle** format, which can contain *instructions*, not just numbers, and loading a malicious pickle can run any code on your machine: Chapter 6's injection problem in a new form. `weights_only=True` (the default in recent PyTorch, written out here so nobody turns it off) refuses anything but tensors and plain data. Never load a model file from a source you don't trust without it.

```check
run ".venv/Scripts/python -m pytest -q tests/test_vision.py" label="a saved model loads back and makes identical predictions"
```

```predict
question: The digits here are 8 × 8. For 28 × 28 digits, or 224 × 224 photographs, which kind of network grows more in size, and why?
choice: The CNN: more pixels means bigger filters
choice: The flat network: every pixel needs its own weight to every hidden unit, while a CNN's 3 × 3 filters stay 9 weights each however big the image is
choice: Neither changes
answer: The flat network: every pixel needs its own weight to every hidden unit, while a CNN's 3 × 3 filters stay 9 weights each however big the image is
explain: A 224 × 224 colour photo has 150,528 inputs; a flat layer of 1,000 units needs 150 million weights for its first layer alone. A convolutional layer of 64 filters needs 64 × 3 × 9 = 1,728, whatever the image size. Weight sharing is why CNNs, not flat networks, made computer vision work, from reading digits to inspecting welds on a production line.
```

That's PyTorch: tensors and autograd, the five-piece training loop, many classes, and convolution. The same skills scale to any network you'll meet. The last modelling chapter goes back to text, where Chapter 0 began, with what you now know.
