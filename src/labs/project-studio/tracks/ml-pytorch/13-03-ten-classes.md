---
title: 13.3 — Ten Answers, Not Two: Reading Digits
track: PyTorch — Reading Handwritten Digits
runtime: none
concepts: pytorch
revisits: logistic-regression, classification-metrics, neural-networks, probability, scikit-learn, testing
notebook: ml-training-a-network
lab: 23
problem: Inspection tags come back with the operator's handwritten count on them, and someone types every one in. A model that reads a handwritten digit has ten possible answers, not pass or fail. How does a network give one probability per class, and what does it minimise?
---

Every classifier so far has answered yes or no. Reading a handwritten digit has **ten** answers. This lesson extends the network to many classes, which needs two new pieces: a way to turn ten scores into ten probabilities that add up to 1, and a loss for them. Both are direct generalisations of the sigmoid and log loss from lesson 8.4.

The data is scikit-learn's built-in **digits** collection: 1,797 handwritten digits, each scanned to an 8 × 8 grid of grey levels. It comes with scikit-learn, so there's nothing to download.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_digits.py provided
# Tests for digits.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_digits.py
import numpy as np
import torch
from pytest import approx


def test_load_gives_8_by_8_images_scaled_from_0_to_1():
    import digits
    images, labels = digits.load()
    assert images.shape == (1797, 8, 8) and labels.shape == (1797,)
    assert images.min() == 0 and images.max() == 1
    assert sorted(set(labels.tolist())) == list(range(10))


def test_split_keeps_every_digit_in_proportion():
    import digits
    train_images, test_images, train_labels, test_labels = digits.split(*digits.load())
    assert (len(train_images), len(test_images)) == (1347, 450)
    assert np.bincount(test_labels).min() >= 43


def test_softmax_turns_scores_into_probabilities():
    import digits
    scores = torch.tensor([[2.0, 1.0, 0.1], [0.0, 0.0, 0.0], [1000.0, 0.0, -1000.0]])
    probabilities = digits.softmax(scores)
    assert probabilities.sum(dim=1).tolist() == approx([1, 1, 1])
    assert probabilities[1].tolist() == approx([1 / 3, 1 / 3, 1 / 3])
    assert torch.allclose(probabilities, torch.softmax(scores, dim=1))


def test_cross_entropy_is_minus_log_of_the_right_answers_probability():
    import digits
    scores = torch.tensor([[2.0, 1.0, 0.1], [0.0, 0.0, 0.0]])
    labels = torch.tensor([0, 2])
    expected = -(np.log(digits.softmax(scores)[0, 0].item()) + np.log(1 / 3)) / 2
    assert digits.cross_entropy(scores, labels).item() == approx(expected, rel=1e-5)
    assert digits.cross_entropy(scores, labels).item() == approx(torch.nn.functional.cross_entropy(scores, labels).item(), rel=1e-5)


def test_the_network_reads_most_digits():
    import digits
    train_images, test_images, train_labels, test_labels = digits.split(*digits.load())
    model = digits.make_mlp()
    history = digits.train(model, train_images, train_labels, epochs=30)
    assert history[-1] < history[0] / 10
    assert np.mean(digits.predict(model, test_images) == test_labels) >= 0.95
```

The softmax test includes scores of 1000 and −1000: in plain arithmetic, $e^{1000}$ overflows to infinity. A correct softmax has to cope, the same trick as lesson 8.3's.

```check
file tests/test_digits.py -- Click "Create provided tests/test_digits.py" above.
```

## The digits

Create `digits.py`:

```python file=digits.py
import numpy as np
import torch
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split


def load() -> tuple[np.ndarray, np.ndarray]:
    """1,797 handwritten digits as 8 × 8 images with values from 0 to 1, and which digit each is."""
    digits = load_digits()
    return digits.images / 16.0, digits.target


def split(images: np.ndarray, labels: np.ndarray):
    return train_test_split(images, labels, test_size=0.25, random_state=0, stratify=labels)
```

- **`load_digits()`** returns an object holding `images` (1,797 × 8 × 8) and `target`, the true digit of each. Grey levels run from 0 (white) to 16 (black), so dividing by 16 scales them to 0–1, which suits a network (lesson 12.1's point about scale).
- **`stratify=labels`** (lesson 8.2) keeps each digit's share the same in the training and test sets.

```check
run ".venv/Scripts/python -m pytest -q tests/test_digits.py -k \"load or split\"" label="1,797 images of 8 × 8 pixels, split 1,347 / 450 with every digit in proportion"
```

## Ten scores, ten probabilities

The network's last layer has **ten** outputs, one score per digit. To make them probabilities, each must be positive and together they must add up to 1. The standard way:

> **Softmax**: turns a list of scores $z_1, \dots, z_K$ into probabilities $p_k = \dfrac{e^{z_k}}{\sum_j e^{z_j}}$. Raising $e$ to each score makes it positive; dividing by the total makes them add up to 1. A higher score always gets a higher probability, and a score far above the others takes almost all of it.
>
> *Picture it as* sharing out a budget by votes, where each vote counts exponentially: a candidate one point ahead gets about 2.7 times the share, two points ahead about 7.4 times. Equal scores share equally.

With two classes and scores $(z, 0)$, softmax gives $\frac{e^z}{e^z + 1} = \frac{1}{1 + e^{-z}}$: exactly the sigmoid. Softmax *is* the many-class sigmoid.

The loss generalises the same way:

> **Cross-entropy loss**: the average, over examples, of $-\log(\text{the probability given to the correct class})$. With two classes it's lesson 8.4's log loss. Confidently right costs nearly 0; confidently wrong costs a lot.

Work the test's example. Scores `[2.0, 1.0, 0.1]`: $e^2 = 7.39$, $e^1 = 2.72$, $e^{0.1} = 1.11$; total 11.21; probabilities 0.659, 0.242, 0.099. The correct class is 0, so the loss is $-\log 0.659 = 0.417$. The second example has three equal scores, so each gets 1/3 and the loss is $-\log \frac{1}{3} = 1.099$. The average is 0.758.

Add both to `digits.py`, written out by hand so you can see them. In training you'll use PyTorch's built-in versions, which the test confirms agree:

```python file=digits.py
import numpy as np
import torch
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split


def load() -> tuple[np.ndarray, np.ndarray]:
    """1,797 handwritten digits as 8 × 8 images with values from 0 to 1, and which digit each is."""
    digits = load_digits()
    return digits.images / 16.0, digits.target


def split(images: np.ndarray, labels: np.ndarray):
    return train_test_split(images, labels, test_size=0.25, random_state=0, stratify=labels)


def softmax(scores: torch.Tensor) -> torch.Tensor:
    exps = torch.exp(scores - scores.max(dim=1, keepdim=True).values)
    return exps / exps.sum(dim=1, keepdim=True)


def cross_entropy(scores: torch.Tensor, labels: torch.Tensor) -> torch.Tensor:
    probabilities = softmax(scores)
    return -torch.log(probabilities[torch.arange(len(labels)), labels]).mean()
```

- **`scores - scores.max(dim=1, keepdim=True).values`**: subtract each row's largest score first (lesson 8.3's trick). It doesn't change the probabilities, since every $e^{z}$ in the row is divided by the same $e^{\max}$, and the largest becomes $e^0 = 1$, so nothing overflows. In PyTorch, `dim=` plays the part of NumPy's `axis=`, and `.max(...)` returns both the values and their positions, so `.values` picks the values.
- **`probabilities[torch.arange(len(labels)), labels]`** picks, for each row, the probability of its correct class: row 0's entry at `labels[0]`, row 1's at `labels[1]`, and so on (fancy indexing with two index arrays).

```check
run ".venv/Scripts/python -m pytest -q tests/test_digits.py -k \"softmax or cross_entropy\"" label="softmax copes with huge scores and matches torch.softmax; cross-entropy matches PyTorch's" -- softmax: exp(scores - row max) / row sum; cross_entropy: mean of -log(probability of the correct class)
```

## A network for images

An 8 × 8 image is 64 numbers. The simplest network **flattens** it into a row of 64 and treats each pixel as an input feature, exactly like the two inputs of the tolerance network. Add the model and training to `digits.py`:

```python file=digits.py
import numpy as np
import torch
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split


def load() -> tuple[np.ndarray, np.ndarray]:
    """1,797 handwritten digits as 8 × 8 images with values from 0 to 1, and which digit each is."""
    digits = load_digits()
    return digits.images / 16.0, digits.target


def split(images: np.ndarray, labels: np.ndarray):
    return train_test_split(images, labels, test_size=0.25, random_state=0, stratify=labels)


def softmax(scores: torch.Tensor) -> torch.Tensor:
    exps = torch.exp(scores - scores.max(dim=1, keepdim=True).values)
    return exps / exps.sum(dim=1, keepdim=True)


def cross_entropy(scores: torch.Tensor, labels: torch.Tensor) -> torch.Tensor:
    probabilities = softmax(scores)
    return -torch.log(probabilities[torch.arange(len(labels)), labels]).mean()


def make_mlp(seed: int = 0) -> torch.nn.Module:
    """64 pixels → 64 hidden ReLU units → 10 scores, one per digit."""
    torch.manual_seed(seed)
    return torch.nn.Sequential(
        torch.nn.Flatten(),
        torch.nn.Linear(64, 64),
        torch.nn.ReLU(),
        torch.nn.Linear(64, 10),
    )


def train(model: torch.nn.Module, images: np.ndarray, labels: np.ndarray, epochs: int,
          rate: float = 0.001, batch: int = 32, seed: int = 0) -> list[float]:
    """Mini-batch training with Adam and cross-entropy; returns the average loss of each epoch."""
    data = torch.utils.data.TensorDataset(torch.tensor(images, dtype=torch.float32)[:, None], torch.tensor(labels))
    loader = torch.utils.data.DataLoader(data, batch_size=batch, shuffle=True, generator=torch.Generator().manual_seed(seed))
    optimiser = torch.optim.Adam(model.parameters(), lr=rate)
    loss_function = torch.nn.CrossEntropyLoss()
    history = []
    for _ in range(epochs):
        model.train()
        total = 0.0
        for X_batch, y_batch in loader:
            optimiser.zero_grad()
            loss = loss_function(model(X_batch), y_batch)
            loss.backward()
            optimiser.step()
            total += loss.item() * len(y_batch)
        history.append(total / len(labels))
    return history


def predict(model: torch.nn.Module, images: np.ndarray) -> np.ndarray:
    """The digit with the highest score, for each image."""
    model.eval()
    with torch.no_grad():
        return model(torch.tensor(images, dtype=torch.float32)[:, None]).argmax(dim=1).numpy()
```

What's new compared with lesson 13.2:

- **`torch.nn.Flatten()`** turns each image into a flat row of 64 numbers, so `Linear(64, 64)` can take it.
- **`[:, None]`** adds a **channel** axis: the images become 1,347 × **1** × 8 × 8. Images in PyTorch are (count, channels, height, width); a colour photo has 3 channels (red, green, blue), a grey scan has 1. The MLP flattens it away, but the next lesson's model needs it.
- **`torch.tensor(labels)`**: class numbers stay **whole numbers** (64-bit integers). `CrossEntropyLoss` uses them to pick each row's correct-class probability, as your `cross_entropy` did.
- **`torch.nn.CrossEntropyLoss()`** takes raw scores and applies softmax itself, safely, for the same reason `BCEWithLogitsLoss` applied the sigmoid.
- **`torch.optim.Adam`**: lesson 12.3's momentum, plus a step size adjusted for each parameter separately. Its default learning rate, 0.001, works for most problems, which is why it's the usual first choice.
- **`loss.item()`** gets a one-number tensor's value as a plain Python float.
- **`model.train()` / `model.eval()`** tell the model whether it's training or being used. The layers here behave the same either way, but some (lesson 13.4 mentions one) don't, so the habit matters.
- **`.argmax(dim=1)`**: the position of each row's highest score is the digit read.

```check
run ".venv/Scripts/python -m pytest -q tests/test_digits.py" label="the network reads at least 95% of the 450 test digits"
```

## How well does it read?

Create `read_digits.py`. It compares the network with logistic regression on the same 64 pixels, prints a **confusion matrix** (lesson 8.5's, with ten rows instead of two), and draws one digit the network got wrong:

```python file=read_digits.py
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import confusion_matrix

import digits

images, labels = digits.load()
train_images, test_images, train_labels, test_labels = digits.split(images, labels)
print(f"{len(train_images)} training and {len(test_images)} test images, {images.shape[1]} × {images.shape[2]} pixels")

line = LogisticRegression(max_iter=2000).fit(train_images.reshape(len(train_images), -1), train_labels)
print(f"logistic regression on 64 pixels: {line.score(test_images.reshape(len(test_images), -1), test_labels):.3f}")

model = digits.make_mlp()
history = digits.train(model, train_images, train_labels, epochs=30)
predictions = digits.predict(model, test_images)
print(f"network (64 -> 64 -> 10), after 30 epochs: {np.mean(predictions == test_labels):.3f}")

print("\nrows: the real digit; columns: what the network read")
print("   " + " ".join(f"{d:>3}" for d in range(10)))
for digit, row in enumerate(confusion_matrix(test_labels, predictions)):
    print(f"{digit:>2} " + " ".join(f"{n:>3}" for n in row))

wrong = np.flatnonzero(predictions != test_labels)[0]
print(f"\nimage {wrong}: really {test_labels[wrong]}, read as {predictions[wrong]}")
for row in test_images[wrong]:
    print("".join(" .:-=+*#%@"[int(value * 9.99)] * 2 for value in row))
```

- **`.reshape(len(train_images), -1)`** flattens for scikit-learn: `-1` means "whatever size makes it fit", here 64.
- **`" .:-=+*#%@"[int(value * 9.99)]`** picks one of ten characters by darkness, from a space for white to `@` for black. Each pixel prints twice, so the digit isn't squashed sideways.

```powershell
.venv\Scripts\python read_digits.py
```

```text
1347 training and 450 test images, 8 × 8 pixels
logistic regression on 64 pixels: 0.969
network (64 -> 64 -> 10), after 30 epochs: 0.967

rows: the real digit; columns: what the network read
     0   1   2   3   4   5   6   7   8   9
 0  45   0   0   0   0   0   0   0   0   0
 1   0  45   0   0   0   0   0   0   1   0
 2   0   1  43   0   0   0   0   0   0   0
 3   0   0   0  45   0   0   0   1   0   0
 4   0   1   0   0  43   0   0   0   0   1
 5   0   0   0   1   0  45   0   0   0   0
 6   0   1   0   0   0   0  44   0   0   0
 7   0   0   0   0   0   0   0  45   0   0
 8   0   5   0   0   0   1   0   0  37   0
 9   0   1   0   0   0   1   0   0   0  43

image 12: really 8, read as 1
      ..##**    
      %%--@@    
      @@--**    
      %%@@..    
    ..%%@@..    
    @@::++++    
    ::%%::====  
      ..****@@..
```

(Your network's numbers may differ by a digit or two: PyTorch's arithmetic can differ very slightly between computers, and a small difference early in training can change which way a borderline digit goes.)

Three things to read from it:

- **The diagonal** is digits read correctly. Off the diagonal, the biggest cell is **8 read as 1**, five times: thin, upright 8s look a lot like 1s at 8 × 8 pixels.
- **The network is no better than logistic regression here** (96.7% against 96.9%). With 64 clean, centred pixels, a straight-line boundary in 64 dimensions is already very good. A network isn't automatically better; it earns its keep when the pattern is too complicated for a line, as the tolerance zone was.
- **The network ignores that it's looking at a picture.** It treats pixel 37 as just "input 37", with no idea which pixels are neighbours. Shuffle the 64 pixels the same way in every image and it would learn just as well. That's a waste of what we know about images, and the next lesson's model uses it.

```predict
question: You shift every test image one pixel to the right. What happens to the network's accuracy?
choice: Almost no change: it's still the same digit
choice: It falls a long way: every pixel's value moves to a different input, which the network has learned to treat completely differently
choice: It improves
answer: It falls a long way: every pixel's value moves to a different input, which the network has learned to treat completely differently
explain: To you, a shifted 3 is obviously still a 3. To the network, it's 64 inputs with values in different places, and it learned a separate weight for each place. Shifted one pixel right, its accuracy drops to about 43%. The next lesson builds a network that looks for the same small shapes everywhere in the image, and measures how much better it copes.
```

```check
run ".venv/Scripts/python read_digits.py" stdout="1347 training and 450 test images, 8 × 8 pixels" label="read_digits.py compares the network with logistic regression and shows its mistakes"
```
