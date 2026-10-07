# Regularising networks

Neural networks have far more parameters than the models earlier in the series, often more than there are training examples, and the last two lessons showed what follows: training loss heading to zero while validation loss starts to rise. A network will memorise its training set if it is allowed to. The tools that stop this are called **regularisation**, and four of them are standard in almost every network: **weight decay**, **dropout**, **data augmentation** and **early stopping**. A fifth, **batch normalisation**, is mainly a tool for training deep networks smoothly, but it is usually discussed alongside them because it also has a mild regularising effect.

To see overfitting clearly, this lesson makes it easy to overfit: a network with 256 hidden units, trained on only **200** of the digit images, with the rest held out for validation.

## The baseline, then weight decay and dropout

**Weight decay** is the ridge penalty from the regularisation lesson, applied to a network's weight matrices: add (λ/2) × (sum of squared weights) to the loss, so each weight's gradient gains an extra λ·w. Every step then shrinks every weight slightly towards zero ("decays" it), and only weights that keep earning their place through the data stay large. Biases are usually left out.

**Dropout** is a newer and stranger idea. During training, each hidden unit is switched off at random, with probability `p` (often 0.5), independently for every example in every batch: its output is set to zero. The network can never rely on any one unit being present, so it cannot build fragile, memorised combinations of specific units; it must spread what it knows across many units, each useful on its own. At test time, all units are used.

One detail matters. If half the units are dropped during training, the next layer sees inputs only about half as large as it will at test time. **Inverted dropout**, the standard version, fixes this by multiplying the surviving units by 1/(1 − p) during training, so their expected total is unchanged and nothing needs adjusting at test time.

Both fit into the training loop in a few lines. Predict before running: with only 200 training images, which of these three will reach 100% training accuracy?

```python type
import numpy as np
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split

digits = load_digits()
X, y = digits.data / 16, digits.target
X_pool, X_val, y_pool, y_val = train_test_split(X, y, test_size=0.4, random_state=0)
X_train, y_train = X_pool[:200], y_pool[:200]

def softmax(Z):
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)

def evaluate(params, X, y):
    P = softmax(np.maximum(0, X @ params["W1"] + params["b1"]) @ params["W2"] + params["b2"])
    return -np.mean(np.log(P[np.arange(len(y)), y] + 1e-12)), (P.argmax(axis=1) == y).mean()

def train(X_train, y_train, weight_decay=0.0, dropout=0.0, epochs=100, hidden=256, seed=0):
    rng = np.random.default_rng(seed)
    params = {"W1": rng.normal(0, np.sqrt(2 / 64), (64, hidden)), "b1": np.zeros(hidden),
              "W2": rng.normal(0, np.sqrt(2 / hidden), (hidden, 10)), "b2": np.zeros(10)}
    velocity = {name: np.zeros_like(value) for name, value in params.items()}
    for epoch in range(epochs):
        order = rng.permutation(len(X_train))
        for start in range(0, len(X_train), 32):
            batch = order[start:start + 32]
            Xb = X_train[batch]
            Z1 = Xb @ params["W1"] + params["b1"]
            H = np.maximum(0, Z1)
            if dropout:
                keep = (rng.random(H.shape) > dropout) / (1 - dropout)
                H = H * keep
            P = softmax(H @ params["W2"] + params["b2"])
            D2 = (P - np.eye(10)[y_train[batch]]) / len(batch)
            D1 = (D2 @ params["W2"].T) * (Z1 > 0)
            if dropout:
                D1 = D1 * keep
            grads = {"W1": Xb.T @ D1 + weight_decay * params["W1"], "b1": D1.sum(axis=0),
                     "W2": H.T @ D2 + weight_decay * params["W2"], "b2": D2.sum(axis=0)}
            for name in params:
                velocity[name] = 0.9 * velocity[name] + grads[name]
                params[name] -= 0.1 * velocity[name]
    return params

for label, settings in [("no regularisation", {}), ("weight decay 0.001", {"weight_decay": 1e-3}), ("dropout 0.5", {"dropout": 0.5})]:
    params = train(X_train, y_train, **settings)
    train_loss, train_acc = evaluate(params, X_train, y_train)
    val_loss, val_acc = evaluate(params, X_val, y_val)
    print(f"{label:<20} training accuracy {train_acc:.3f} | validation loss {val_loss:.3f}, accuracy {val_acc:.3f}")
```

```output
no regularisation    training accuracy 1.000 | validation loss 0.252, accuracy 0.922
weight decay 0.001   training accuracy 1.000 | validation loss 0.220, accuracy 0.929
dropout 0.5          training accuracy 1.000 | validation loss 0.241, accuracy 0.935
```

The training uses momentum, from the optimisers lesson. `keep` is the dropout mask: 0 for dropped units and 1/(1 − p) for kept ones, applied to the hidden outputs in the forward pass and, since the dropped units contributed nothing, to their error signals in the backward pass too. `evaluate` uses all the units, with no mask.

All three reach 100% training accuracy: 256 hidden units can memorise 200 images whatever you do. The difference is on unseen data. Unregularised, validation accuracy is 0.922 and validation loss 0.252. Weight decay lowers the validation loss to 0.220 (accuracy 0.929); dropout gives the best accuracy, 0.935. The gains here are a point or so, because the digits are an easy problem; in large networks trained on large, messy datasets, these techniques often make the difference between a model that generalises and one that does not.

## Data augmentation

The most effective regulariser is more data. When you cannot collect more, you can often **manufacture** it: transform each training example in ways that do not change its label. A digit shifted one pixel left is still the same digit. Images are routinely flipped, cropped, rotated slightly and recoloured; audio is sped up or mixed with noise; text has words swapped for synonyms. Each transformation teaches the network something it should ignore.

Here each training image is shifted one pixel left, right, up and down, giving 5 times as much training data. The training runs for 20 epochs instead of 100, so the number of updates is the same:

```python type
import numpy as np
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split

digits = load_digits()
X, y = digits.data / 16, digits.target
X_pool, X_val, y_pool, y_val = train_test_split(X, y, test_size=0.4, random_state=0)
X_train, y_train = X_pool[:200], y_pool[:200]

def softmax(Z):
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)

def evaluate(params, X, y):
    P = softmax(np.maximum(0, X @ params["W1"] + params["b1"]) @ params["W2"] + params["b2"])
    return -np.mean(np.log(P[np.arange(len(y)), y] + 1e-12)), (P.argmax(axis=1) == y).mean()

def train(X_train, y_train, dropout=0.0, epochs=100, hidden=256, seed=0):
    rng = np.random.default_rng(seed)
    params = {"W1": rng.normal(0, np.sqrt(2 / 64), (64, hidden)), "b1": np.zeros(hidden),
              "W2": rng.normal(0, np.sqrt(2 / hidden), (hidden, 10)), "b2": np.zeros(10)}
    velocity = {name: np.zeros_like(value) for name, value in params.items()}
    for epoch in range(epochs):
        order = rng.permutation(len(X_train))
        for start in range(0, len(X_train), 32):
            batch = order[start:start + 32]
            Xb = X_train[batch]
            Z1 = Xb @ params["W1"] + params["b1"]
            H = np.maximum(0, Z1)
            if dropout:
                keep = (rng.random(H.shape) > dropout) / (1 - dropout)
                H = H * keep
            P = softmax(H @ params["W2"] + params["b2"])
            D2 = (P - np.eye(10)[y_train[batch]]) / len(batch)
            D1 = (D2 @ params["W2"].T) * (Z1 > 0)
            if dropout:
                D1 = D1 * keep
            grads = {"W1": Xb.T @ D1, "b1": D1.sum(axis=0), "W2": H.T @ D2, "b2": D2.sum(axis=0)}
            for name in params:
                velocity[name] = 0.9 * velocity[name] + grads[name]
                params[name] -= 0.1 * velocity[name]
    return params

def shift(X, dx, dy):
    images = X.reshape(-1, 8, 8)
    moved = np.zeros_like(images)
    moved[:, max(dy, 0):8 + min(dy, 0), max(dx, 0):8 + min(dx, 0)] = images[:, max(-dy, 0):8 + min(-dy, 0), max(-dx, 0):8 + min(-dx, 0)]
    return moved.reshape(-1, 64)

X_aug = np.vstack([X_train] + [shift(X_train, dx, dy) for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]])
y_aug = np.tile(y_train, 5)
print("augmented training set:", X_aug.shape)

for label, data, settings in [("augmented", (X_aug, y_aug), {}), ("augmented + dropout 0.5", (X_aug, y_aug), {"dropout": 0.5})]:
    params = train(*data, epochs=20, **settings)
    val_loss, val_acc = evaluate(params, X_val, y_val)
    print(f"{label:<24} validation loss {val_loss:.3f}, accuracy {val_acc:.3f}")
```

```output
augmented training set: (1000, 64)
augmented                validation loss 0.232, accuracy 0.928
augmented + dropout 0.5  validation loss 0.188, accuracy 0.936
```

`shift` reshapes each 64-pixel row into an 8 × 8 image and copies it into a blank image displaced by `dx` columns and `dy` rows; pixels pushed off one edge are lost, and the opposite edge fills with blank pixels. The slices look fiddly, but they only say "copy this rectangle to that one" (a challenge builds the same thing another way, with `np.roll`). `np.tile(y_train, 5)` repeats the labels to match the five copies.

Augmentation alone lowers the validation loss to 0.232; combined with dropout, to 0.188 with accuracy 0.936, the best of all the runs. Regularisers stack: each attacks overfitting in a different way. (Each comparison here is a single training run on about 720 validation images, so differences of a point of accuracy are within the noise of a different random seed; the validation losses are the steadier guide.)

## Early stopping

The training lesson's challenge built **early stopping**: keep the parameters from the epoch with the lowest validation loss, and stop when it has not improved for a set number of epochs. It is the simplest regulariser of all, and it is almost always used: it costs nothing, and it also saves training time.

## Batch normalisation

**Batch normalisation** (batch norm) is a layer usually placed just before an activation. During training, for each unit, it standardises that unit's scores **across the current mini-batch**: subtract the batch mean, divide by the batch standard deviation (plus a tiny ε for safety). Then it scales and shifts the result with two learned parameters per unit, γ (gamma) and β (beta), so the network can still choose any mean and spread it needs. (Their gradients are simple, dγ = Σ upstream gradient × ẑ and dβ = Σ upstream gradient; the gradient back through the normalisation itself is longer, and left to libraries here.)

\[
\hat z = \frac{z - \mu_{\text{batch}}}{\sqrt{\sigma^2_{\text{batch}} + \epsilon}}, \qquad \text{output} = \gamma \hat z + \beta
\]

The effect is that every layer receives inputs with a steady, controlled spread, however the weights before it change during training. Recall from the activation functions lesson how badly scaled weights made signals explode through 20 layers. Batch norm resets the scale at every layer:

```python type
import numpy as np

def batch_norm(Z, gamma=1.0, beta=0.0, eps=1e-5):
    mean = Z.mean(axis=0)
    variance = Z.var(axis=0)
    return gamma * (Z - mean) / np.sqrt(variance + eps) + beta

rng = np.random.default_rng(0)
for use_batch_norm in [False, True]:
    a = rng.normal(size=(256, 100))
    spreads = []
    for layer in range(10):
        Z = a @ rng.normal(0, 1.0, (100, 100))
        if use_batch_norm:
            Z = batch_norm(Z)
        a = np.maximum(0, Z)
        spreads.append(a.std())
    label = "with batch norm" if use_batch_norm else "without"
    print(f"{label:<16} spread of activations after layers 1, 5, 10: {spreads[0]:.3g}, {spreads[4]:.3g}, {spreads[9]:.3g}")
```

```output
without          spread of activations after layers 1, 5, 10: 5.84, 1.49e+04, 2.36e+08
with batch norm  spread of activations after layers 1, 5, 10: 0.584, 0.586, 0.58
```

These weights are deliberately badly scaled (standard deviation 1 instead of He's √(2/100) ≈ 0.14). Without batch norm, the activations grow about sevenfold per layer, to around 10⁸ after 10 layers. With it, every layer's activations have a spread of about 0.58 (a standardised score after ReLU), whatever the weights do.

That stability lets deep networks train with larger learning rates and much less sensitivity to initialisation, which is why batch norm, together with the residual connections of the next lessons, helped make very deep networks practical from 2015. It also regularises a little: each example's normalisation depends on which other examples share its batch, a small random disturbance much like dropout's.

At **test time** there may be just one example, so there is no batch to take statistics from. Instead, during training the layer keeps **running averages** of the batch means and variances, and at test time it normalises with those fixed values. Getting this switch wrong (training mode versus evaluation mode) is a classic bug in real projects. Transformers use a close cousin, **layer normalisation**, which standardises across the units of each single example instead of across the batch, so it behaves the same in training and at test time.

::: challenge Inverted dropout [easy]
Write `dropout(H, rate, rng, training)`. In training mode, return `H` with each entry independently set to zero with probability `rate`, using `rng.random(H.shape) > rate` to decide which to keep, and the kept entries multiplied by `1 / (1 - rate)`. When `training` is `False`, return `H` unchanged.

```python starter
import numpy as np

def dropout(H, rate, rng, training):
    return H

H = np.ones((4, 5))
print(dropout(H, 0.5, np.random.default_rng(0), True))
```

```python solution
import numpy as np

def dropout(H, rate, rng, training):
    if not training:
        return H
    keep = rng.random(H.shape) > rate
    return H * keep / (1 - rate)

H = np.ones((4, 5))
print(dropout(H, 0.5, np.random.default_rng(0), True))
```

```python test
import numpy as _np
assert "dropout" in dir(), "Keep the function's name as dropout."
_H = _np.arange(1.0, 13.0).reshape(3, 4)
assert _np.array_equal(dropout(_H, 0.5, _np.random.default_rng(0), False), _H), "In evaluation mode, dropout should return H unchanged."
_out = dropout(_H, 0.25, _np.random.default_rng(1), True)
_keep = _np.random.default_rng(1).random(_H.shape) > 0.25
assert _np.allclose(_out, _H * _keep / 0.75), "In training mode, keep entries where rng.random(H.shape) > rate and scale them by 1 / (1 − rate)."
_big = dropout(_np.ones((200, 500)), 0.5, _np.random.default_rng(2), True)
assert abs((_big == 0).mean() - 0.5) < 0.01, "About half the entries should be zero with rate 0.5."
assert abs(_big.mean() - 1.0) < 0.01, "Scaling by 1/(1 − rate) should keep the average unchanged (about 1 here)."
"SUCCESS: Half the units silenced at random each step, the rest scaled up so the next layer sees the same total on average."
```

Hint: Draw the mask once: `keep = rng.random(H.shape) > rate` is `True` for kept entries. `H * keep / (1 - rate)` zeroes the rest and rescales the survivors.
:::

::: challenge A batch norm layer [medium]
Write a batch norm layer that also keeps running statistics. `batch_norm_layer(Z, gamma, beta, state, training, momentum=0.9, eps=1e-5)`:

- `state` is a dictionary with keys `"mean"` and `"var"`, arrays with one value per unit (column of `Z`).
- In **training** mode: normalise with the batch's own mean and variance (per column), then update the running values in `state` as `momentum * old + (1 - momentum) * batch value`.
- In **evaluation** mode: normalise with `state["mean"]` and `state["var"]`, and leave `state` unchanged.
- Either way, return γ·ẑ + β, with ẑ = (Z − mean) / √(variance + eps).

Then, starting from `{"mean": zeros, "var": ones}`, feed the starter's 50 batches through the layer in training mode (γ = 1, β = 0), and store the final running mean in `running_mean`.

```python starter
import numpy as np

def batch_norm_layer(Z, gamma, beta, state, training, momentum=0.9, eps=1e-5):
    return Z

rng = np.random.default_rng(0)
batches = [rng.normal(5.0, 2.0, (32, 3)) for _ in range(50)]
state = {"mean": np.zeros(3), "var": np.ones(3)}
running_mean = state["mean"]
print(running_mean)
```

```python solution
import numpy as np

def batch_norm_layer(Z, gamma, beta, state, training, momentum=0.9, eps=1e-5):
    if training:
        mean, var = Z.mean(axis=0), Z.var(axis=0)
        state["mean"] = momentum * state["mean"] + (1 - momentum) * mean
        state["var"] = momentum * state["var"] + (1 - momentum) * var
    else:
        mean, var = state["mean"], state["var"]
    return gamma * (Z - mean) / np.sqrt(var + eps) + beta

rng = np.random.default_rng(0)
batches = [rng.normal(5.0, 2.0, (32, 3)) for _ in range(50)]
state = {"mean": np.zeros(3), "var": np.ones(3)}
for Z in batches:
    batch_norm_layer(Z, 1.0, 0.0, state, True)
running_mean = state["mean"]
print(running_mean)
```

```python test
import numpy as _np
assert "batch_norm_layer" in dir(), "Keep the function's name as batch_norm_layer."
_Z = _np.array([[1.0, 10.0], [3.0, 20.0], [5.0, 30.0]])
_st = {"mean": _np.zeros(2), "var": _np.ones(2)}
_out = batch_norm_layer(_Z, 2.0, 1.0, _st, True)
_zhat = (_Z - _Z.mean(axis=0)) / _np.sqrt(_Z.var(axis=0) + 1e-5)
assert _np.allclose(_out, 2.0 * _zhat + 1.0), "In training mode, normalise each column with the batch's own mean and variance, then apply gamma and beta."
assert _np.allclose(_st["mean"], 0.1 * _Z.mean(axis=0)) and _np.allclose(_st["var"], 0.9 + 0.1 * _Z.var(axis=0)), "In training mode, update state with momentum × old + (1 − momentum) × batch value."
_frozen = {"mean": _np.array([2.0, 15.0]), "var": _np.array([4.0, 25.0])}
_e = batch_norm_layer(_np.array([[4.0, 20.0]]), 1.0, 0.0, _frozen, False)
assert _np.allclose(_e, [[2.0 / _np.sqrt(4.0 + 1e-5), 5.0 / _np.sqrt(25.0 + 1e-5)]]), "In evaluation mode, normalise with the running statistics, so a single example works."
assert _np.allclose(_frozen["mean"], [2.0, 15.0]) and _np.allclose(_frozen["var"], [4.0, 25.0]), "Evaluation mode must not change the running statistics."
_r = _np.random.default_rng(0)
_bs = [_r.normal(5.0, 2.0, (32, 3)) for _ in range(50)]
_s = {"mean": _np.zeros(3), "var": _np.ones(3)}
for _b in _bs:
    _s["mean"] = 0.9 * _s["mean"] + 0.1 * _b.mean(axis=0)
assert _np.allclose(running_mean, _s["mean"]), f"running_mean should be about {_s['mean'].round(3)}."
"SUCCESS: After 50 batches the running mean has climbed from 0 to about 5, the true mean, ready to normalise single examples at test time."
```

Hint: Choose the mean and variance with an `if`: from `Z` (with `axis=0`) in training, from `state` in evaluation. Update `state[...]` only in the training branch. The normalisation line is the same for both.
:::

::: challenge Shift by rolling [medium]
The lesson's `shift` copied rectangles with fiddly slices. Here is another way. `np.roll(images, d, axis=...)` moves every pixel `d` places along an axis, but it **wraps**: pixels pushed off one edge reappear on the other side, which would put bits of a digit where they do not belong. So roll first, then blank the strip that wrapped round.

Write `shift_images(X, dx, dy)` for flattened 8 × 8 images (one per row of `X`) using `np.roll`: move the images `dx` pixels right (left if negative) and `dy` pixels down (up if negative), then set the wrapped-in columns and rows to zero. It must work for any shift from −7 to 7, including 0.

Then store, in `augmented`, the starter's 10 images stacked with all 8 shifts by one pixel in any direction (including diagonals): a `(90, 64)` array with the originals first, then the shifts in the order of `offsets`.

```python starter
import numpy as np
from sklearn.datasets import load_digits

def shift_images(X, dx, dy):
    return X

X = load_digits().data[:10] / 16
offsets = [(dx, dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if (dx, dy) != (0, 0)]
augmented = X
print(augmented.shape)
```

```python solution
import numpy as np
from sklearn.datasets import load_digits

def shift_images(X, dx, dy):
    images = np.roll(X.reshape(-1, 8, 8), (dy, dx), axis=(1, 2))
    if dy > 0:
        images[:, :dy, :] = 0
    elif dy < 0:
        images[:, dy:, :] = 0
    if dx > 0:
        images[:, :, :dx] = 0
    elif dx < 0:
        images[:, :, dx:] = 0
    return images.reshape(-1, 64)

X = load_digits().data[:10] / 16
offsets = [(dx, dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if (dx, dy) != (0, 0)]
augmented = np.vstack([X] + [shift_images(X, dx, dy) for dx, dy in offsets])
print(augmented.shape)
```

```python test
import numpy as _np
assert "shift_images" in dir(), "Keep the function's name as shift_images."
assert "np.roll" in _source, "Use np.roll to move the pixels, then blank the strips that wrapped round."
_img = _np.zeros((8, 8)); _img[0, 7] = 1.0; _img[3, 2] = 0.5; _img[7, 0] = 0.25
_flat = _img.reshape(1, 64)
_right = shift_images(_flat, 1, 0).reshape(8, 8)
assert _right[3, 3] == 0.5, "Shifting right by 1 should move the pixel at row 3, column 2 to column 3."
assert _right[:, 0].sum() == 0, "After shifting right, column 0 should be blank: the last column's pixels wrapped into it and must be zeroed."
_up = shift_images(_flat, 0, -2).reshape(8, 8)
assert _up[1, 2] == 0.5 and _up[6:, :].sum() == 0, "Shifting up by 2 should move row 3 to row 1 and leave the bottom two rows blank."
_diag = shift_images(_flat, -1, 1).reshape(8, 8)
assert _diag[4, 1] == 0.5 and _diag[0, :].sum() == 0 and _diag[:, 7].sum() == 0, "A diagonal shift (left 1, down 1) should blank the top row and the right column."
assert _np.array_equal(shift_images(_flat, 0, 0), _flat), "A shift of (0, 0) should leave the image unchanged."
assert shift_images(_flat, 7, 0).sum() == 0.25 and shift_images(_flat, 7, 0).reshape(8, 8)[7, 7] == 0.25, "Shifting right by 7, only the pixel in column 0 survives, landing in column 7; everything else falls off."
_before = _flat.copy(); shift_images(_flat, 2, 2)
assert _np.array_equal(_flat, _before), "Don't change the array passed in."
_X = __import__("sklearn.datasets", fromlist=["load_digits"]).load_digits().data[:10] / 16
assert _np.shape(augmented) == (90, 64), f"augmented should have shape (90, 64), not {_np.shape(augmented)}."
assert _np.allclose(augmented[:10], _X), "The original 10 images should come first."
assert _np.allclose(augmented[10:20], shift_images(_X, -1, -1)), "Then the shifts in the order of offsets, starting with (−1, −1)."
"SUCCESS: Nine versions of every image, each still the same digit, with nothing wrapped round to the wrong side."
```

Hint: `np.roll(images, (dy, dx), axis=(1, 2))` shifts rows and columns together. For a positive shift `d` the wrapped strip is the first `d` rows or columns (`[:d]`); for a negative one it is the last `|d|` (`[d:]`). Do nothing for 0, since `[:0]` is empty but `[0:]` is everything.
:::

## What you learned

- Large networks memorise small datasets: on 200 digit images every network, regularised or not, reached 100% training accuracy.
- Weight decay adds λ·w to each weight's gradient (the ridge penalty), shrinking weights that the data does not support.
- Dropout zeroes each hidden unit with probability `p` during training, scaling survivors by 1/(1 − p) (inverted dropout); all units are used at test time.
- Data augmentation manufactures new examples with label-preserving changes (shifts, flips, crops, noise); combined with dropout it gave the best validation loss.
- Early stopping keeps the best-validation parameters. Regularisers stack.
- Batch norm standardises each unit's scores over the mini-batch, then scales and shifts with learned γ and β; it stabilises deep networks (10 badly scaled layers stayed at spread 0.58 instead of exploding). At test time it uses running averages; layer norm normalises within each example instead.

All the networks so far treat an image as a flat list of 64 numbers, as if the pixels had no positions. The next lesson builds the operation that respects the grid of an image, the convolution, which is the foundation of the networks that see.
