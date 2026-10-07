# Autoencoders

PCA, back in the unsupervised part of the series, compressed each 64-pixel digit into a few numbers and rebuilt an approximation from them. It could only do so with **flat** directions: the best k-dimensional plane through the data. An **autoencoder** does the same job with a neural network. An **encoder** squeezes the input through a narrow middle layer, the **bottleneck** or **code**, and a **decoder** tries to rebuild the input from the code alone. The training target is the input itself, so no labels are needed: the network must discover, by itself, what is worth keeping.

Because both halves are networks with non-linear activations, an autoencoder can learn curved representations that PCA cannot. This lesson trains one on the digits and compares it with PCA at the same code size, looks at the two-number codes it learns, trains a **denoising** autoencoder, which learns to rebuild clean digits from noisy ones, and uses reconstruction error to spot unusual inputs.

## The architecture

The network used here is 64 → 32 → k → 32 → 64. The hidden layers use ReLU. The code layer has **no** activation, so the code can take any values. The output uses a sigmoid, because the pixels lie between 0 and 1. The loss is the mean squared error between the output and the input. Everything else is the training of the network lessons: backpropagation through each layer and Adam updates.

One thing changes in the backward pass compared with the classifiers. With a sigmoid output and squared error, the output error signal is not P − Y. Differentiating (p − x)² through the sigmoid gives 2(p − x) · p(1 − p), averaged over all the values.

```python type
import numpy as np
from sklearn.datasets import load_digits
from sklearn.decomposition import PCA
from sklearn.model_selection import train_test_split

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

def forward(layers, X):
    activations, scores = [X], []
    code_layer = len(layers) // 2 - 1
    for k, (W, b) in enumerate(layers):
        z = activations[-1] @ W + b
        scores.append(z)
        if k == len(layers) - 1:
            activations.append(sigmoid(z))
        elif k == code_layer:
            activations.append(z)
        else:
            activations.append(np.maximum(0, z))
    return scores, activations

def train_autoencoder(sizes, X, epochs=60, lr=0.003, noise=0.0, seed=0):
    rng = np.random.default_rng(seed)
    layers = [[rng.normal(0, np.sqrt(2 / a), (a, b)), np.zeros(b)] for a, b in zip(sizes[:-1], sizes[1:])]
    first = [[np.zeros_like(p) for p in layer] for layer in layers]
    second = [[np.zeros_like(p) for p in layer] for layer in layers]
    code_layer, t = len(layers) // 2 - 1, 0
    for epoch in range(epochs):
        order = rng.permutation(len(X))
        for start in range(0, len(X), 32):
            target = X[order[start:start + 32]]
            given = np.clip(target + rng.normal(0, noise, target.shape), 0, 1) if noise else target
            scores, activations = forward(layers, given)
            out = activations[-1]
            D = 2 * (out - target) / target.size * out * (1 - out)
            t += 1
            for k in reversed(range(len(layers))):
                grads = [activations[k].T @ D, D.sum(axis=0)]
                if k > 0:
                    D = D @ layers[k][0].T
                    if k - 1 != code_layer:
                        D = D * (scores[k - 1] > 0)
                for j in range(2):
                    first[k][j] = 0.9 * first[k][j] + 0.1 * grads[j]
                    second[k][j] = 0.999 * second[k][j] + 0.001 * grads[j] ** 2
                    m_hat, v_hat = first[k][j] / (1 - 0.9 ** t), second[k][j] / (1 - 0.999 ** t)
                    layers[k][j] = layers[k][j] - lr * m_hat / (np.sqrt(v_hat) + 1e-8)
    return layers

digits = load_digits()
X_train, X_test, y_train, y_test = train_test_split(digits.data / 16, digits.target, test_size=0.3, random_state=0)

for code_size in [2, 8]:
    autoencoder = train_autoencoder([64, 32, code_size, 32, 64], X_train)
    ae_error = np.mean((forward(autoencoder, X_test)[1][-1] - X_test) ** 2)
    pca = PCA(code_size).fit(X_train)
    pca_error = np.mean((pca.inverse_transform(pca.transform(X_test)) - X_test) ** 2)
    print(f"code of {code_size} numbers: autoencoder test error {ae_error:.4f}, PCA test error {pca_error:.4f}")
```

```output
code of 2 numbers: autoencoder test error 0.0420, PCA test error 0.0537
code of 8 numbers: autoencoder test error 0.0181, PCA test error 0.0249
```

`forward` returns every layer's scores and activations, as the backward pass needs them. In the backward loop, each layer's weight gradient is (its input)ᵀ times its error signal; the signal then passes back through the weights and, except at the code layer (which has no activation), through the ReLU's derivative. The Adam update is the one from the optimisers lesson, applied to each layer's weights and biases.

With a code of just 2 numbers, the autoencoder's test reconstruction error is 0.042 against PCA's 0.054; with 8 numbers, 0.018 against 0.025. In both cases the network's curved encoding keeps substantially more of each digit than PCA's best flat projection. (With no hidden layers and no activations, an autoencoder can do no better than PCA: the best linear encoder and decoder span exactly the PCA subspace, a known result; the last challenge shows gradient descent finding that subspace.)

## What the code looks like

With a code of 2 numbers, every digit becomes a point in the plane. Predict before running: will the digits form separate groups, even though the autoencoder never saw a label?

```python type
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

def forward(layers, X):
    activations, scores = [X], []
    code_layer = len(layers) // 2 - 1
    for k, (W, b) in enumerate(layers):
        z = activations[-1] @ W + b
        scores.append(z)
        if k == len(layers) - 1:
            activations.append(sigmoid(z))
        elif k == code_layer:
            activations.append(z)
        else:
            activations.append(np.maximum(0, z))
    return scores, activations

def train_autoencoder(sizes, X, epochs=60, lr=0.003, noise=0.0, seed=0):
    rng = np.random.default_rng(seed)
    layers = [[rng.normal(0, np.sqrt(2 / a), (a, b)), np.zeros(b)] for a, b in zip(sizes[:-1], sizes[1:])]
    first = [[np.zeros_like(p) for p in layer] for layer in layers]
    second = [[np.zeros_like(p) for p in layer] for layer in layers]
    code_layer, t = len(layers) // 2 - 1, 0
    for epoch in range(epochs):
        order = rng.permutation(len(X))
        for start in range(0, len(X), 32):
            target = X[order[start:start + 32]]
            given = np.clip(target + rng.normal(0, noise, target.shape), 0, 1) if noise else target
            scores, activations = forward(layers, given)
            out = activations[-1]
            D = 2 * (out - target) / target.size * out * (1 - out)
            t += 1
            for k in reversed(range(len(layers))):
                grads = [activations[k].T @ D, D.sum(axis=0)]
                if k > 0:
                    D = D @ layers[k][0].T
                    if k - 1 != code_layer:
                        D = D * (scores[k - 1] > 0)
                for j in range(2):
                    first[k][j] = 0.9 * first[k][j] + 0.1 * grads[j]
                    second[k][j] = 0.999 * second[k][j] + 0.001 * grads[j] ** 2
                    m_hat, v_hat = first[k][j] / (1 - 0.9 ** t), second[k][j] / (1 - 0.999 ** t)
                    layers[k][j] = layers[k][j] - lr * m_hat / (np.sqrt(v_hat) + 1e-8)
    return layers

digits = load_digits()
X_train, X_test, y_train, y_test = train_test_split(digits.data / 16, digits.target, test_size=0.3, random_state=0)
autoencoder = train_autoencoder([64, 32, 2, 32, 64], X_train)
codes = forward(autoencoder, X_test)[1][2]
rebuilt = forward(autoencoder, X_test)[1][-1]

fig, axes = plt.subplots(1, 2, figsize=(11, 4.5))
points = axes[0].scatter(codes[:, 0], codes[:, 1], c=y_test, cmap="tab10", s=8)
fig.colorbar(points, ax=axes[0], label="digit")
axes[0].set_title("2-number codes of the test digits", fontsize=9)
pairs = np.hstack([np.vstack([X_test[i].reshape(8, 8), np.ones((1, 8)), rebuilt[i].reshape(8, 8), np.zeros((1, 8))]) for i in range(8)])
axes[1].imshow(pairs, cmap="gray_r")
axes[1].set_title("originals (top) and rebuilt from 2 numbers (bottom)", fontsize=9)
axes[1].axis("off")
plt.show()
```

`forward(...)[1][2]` is the activation of the code layer (activation 0 is the input, activation 1 the first hidden layer, and activation 2 the code). The left plot colours each test digit's 2-number code by its true label, which the autoencoder never saw. Digits of the same kind gather in regions of their own, some well separated (0s, 4s and 6s), others overlapping in the middle (5s and 8s especially). To rebuild an image from two numbers, the network had to place similar digits near each other, so it discovered much of the label structure by itself. The right panel shows that two numbers are enough for a recognisable but blurry version of each digit: roughly "which kind of digit, and which way it leans".

## Denoising autoencoders

An autoencoder with a wide enough code could simply learn to copy its input. A powerful way to force it to learn real structure is to **corrupt** the input and ask for the **clean** version back: add noise, or blank out pixels, and train on (noisy input, clean target) pairs. A **denoising autoencoder** must learn what digits look like in order to know which pixels are noise. The lesson's `train_autoencoder` already supports it: with `noise` above 0, Gaussian noise is added to each input batch (and clipped back to 0 to 1), while the target stays clean. Train a plain autoencoder and a denoising one (code of 16 numbers each), then give both the same noisy test digits. Before running, predict: will the plain autoencoder, which has never been shown noise, clean it up too?

```python type
import numpy as np
from sklearn.datasets import load_digits
from sklearn.decomposition import PCA
from sklearn.model_selection import train_test_split

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

def forward(layers, X):
    activations, scores = [X], []
    code_layer = len(layers) // 2 - 1
    for k, (W, b) in enumerate(layers):
        z = activations[-1] @ W + b
        scores.append(z)
        if k == len(layers) - 1:
            activations.append(sigmoid(z))
        elif k == code_layer:
            activations.append(z)
        else:
            activations.append(np.maximum(0, z))
    return scores, activations

def train_autoencoder(sizes, X, epochs=60, lr=0.003, noise=0.0, seed=0):
    rng = np.random.default_rng(seed)
    layers = [[rng.normal(0, np.sqrt(2 / a), (a, b)), np.zeros(b)] for a, b in zip(sizes[:-1], sizes[1:])]
    first = [[np.zeros_like(p) for p in layer] for layer in layers]
    second = [[np.zeros_like(p) for p in layer] for layer in layers]
    code_layer, t = len(layers) // 2 - 1, 0
    for epoch in range(epochs):
        order = rng.permutation(len(X))
        for start in range(0, len(X), 32):
            target = X[order[start:start + 32]]
            given = np.clip(target + rng.normal(0, noise, target.shape), 0, 1) if noise else target
            scores, activations = forward(layers, given)
            out = activations[-1]
            D = 2 * (out - target) / target.size * out * (1 - out)
            t += 1
            for k in reversed(range(len(layers))):
                grads = [activations[k].T @ D, D.sum(axis=0)]
                if k > 0:
                    D = D @ layers[k][0].T
                    if k - 1 != code_layer:
                        D = D * (scores[k - 1] > 0)
                for j in range(2):
                    first[k][j] = 0.9 * first[k][j] + 0.1 * grads[j]
                    second[k][j] = 0.999 * second[k][j] + 0.001 * grads[j] ** 2
                    m_hat, v_hat = first[k][j] / (1 - 0.9 ** t), second[k][j] / (1 - 0.999 ** t)
                    layers[k][j] = layers[k][j] - lr * m_hat / (np.sqrt(v_hat) + 1e-8)
    return layers

digits = load_digits()
X_train, X_test, y_train, y_test = train_test_split(digits.data / 16, digits.target, test_size=0.3, random_state=0)
noisy_test = np.clip(X_test + np.random.default_rng(5).normal(0, 0.2, X_test.shape), 0, 1)

plain = train_autoencoder([64, 32, 16, 32, 64], X_train)
denoiser = train_autoencoder([64, 32, 16, 32, 64], X_train, noise=0.2)
print(f"noisy input vs clean digit:        error {np.mean((noisy_test - X_test) ** 2):.4f}")
for name, model in [("plain autoencoder", plain), ("denoising autoencoder", denoiser)]:
    rebuilt = forward(model, noisy_test)[1][-1]
    print(f"{name:<22} rebuilt vs clean: error {np.mean((rebuilt - X_test) ** 2):.4f}")

import matplotlib.pyplot as plt
rebuilt = forward(denoiser, noisy_test)[1][-1]
rows = [noisy_test, rebuilt, X_test]
canvas = np.vstack([np.hstack([np.pad(r[i].reshape(8, 8), 1) for i in range(8)]) for r in rows])
fig, ax = plt.subplots(figsize=(8, 3.2))
ax.imshow(canvas, cmap="gray_r")
ax.set_title("noisy input (top), denoised (middle), clean original (bottom)", fontsize=9)
ax.axis("off")
plt.show()
```

```output
noisy input vs clean digit:        error 0.0251
plain autoencoder      rebuilt vs clean: error 0.0264
denoising autoencoder  rebuilt vs clean: error 0.0173
```

`np.pad(image, 1)` adds a one-pixel blank border so the digits do not touch in the picture. The plain autoencoder does not help at all: its rebuilt digits are slightly further from the clean ones (0.026) than the noisy inputs were (0.025), because it learned to reproduce whatever it is given, speckle included. The denoiser, trained for exactly this, cuts the error to 0.017. The pictures show it removing the speckle while keeping each digit's strokes.

The same idea, at a vastly larger scale, underlies **diffusion models**, which generate images by learning to remove noise step by step, and **masked language models** such as BERT, which learn language by filling in blanked-out words.

## Anomalies by reconstruction

An autoencoder trained on normal data rebuilds normal inputs well and unusual ones badly, because it has only learned to represent what it has seen. So the **reconstruction error** is an anomaly score, a learned version of the density ideas from the anomaly detection lesson. The challenges use this with PCA's reconstruction, which is quick to fit, but the logic is identical for a network.

::: challenge Score by reconstruction [easy]
Write `reconstruction_errors(X, reconstruct)` returning the mean squared error of each row, where `reconstruct` is a function mapping an array of rows to their reconstructions. Then write `most_unusual(X, reconstruct, k)` returning the indices of the `k` rows with the largest errors, the largest first.

```python starter
import numpy as np

def reconstruction_errors(X, reconstruct):
    return np.zeros(len(X))

def most_unusual(X, reconstruct, k):
    return np.arange(k)

X = np.array([[0.0, 0.0], [1.0, 1.0], [5.0, -5.0], [2.0, 2.1]])
on_the_diagonal = lambda A: np.repeat(A.mean(axis=1, keepdims=True), 2, axis=1)
print(reconstruction_errors(X, on_the_diagonal), most_unusual(X, on_the_diagonal, 2))
```

```python solution
import numpy as np

def reconstruction_errors(X, reconstruct):
    return np.mean((reconstruct(X) - X) ** 2, axis=1)

def most_unusual(X, reconstruct, k):
    return np.argsort(-reconstruction_errors(X, reconstruct))[:k]

X = np.array([[0.0, 0.0], [1.0, 1.0], [5.0, -5.0], [2.0, 2.1]])
on_the_diagonal = lambda A: np.repeat(A.mean(axis=1, keepdims=True), 2, axis=1)
print(reconstruction_errors(X, on_the_diagonal), most_unusual(X, on_the_diagonal, 2))
```

```python test
import numpy as _np
assert "reconstruction_errors" in dir() and "most_unusual" in dir(), "Keep both function names."
_X = _np.array([[0.0, 0.0], [1.0, 1.0], [5.0, -5.0], [2.0, 2.1]])
_f = lambda A: _np.repeat(A.mean(axis=1, keepdims=True), 2, axis=1)
assert _np.allclose(reconstruction_errors(_X, _f), [0.0, 0.0, 25.0, 0.0025]), f"Per-row errors should be [0, 0, 25, 0.0025] (the mean over each row's values), but got {reconstruction_errors(_X, _f)}."
assert list(most_unusual(_X, _f, 2)) == [2, 3], "The two most unusual rows are 2 (error 25) and then 3."
_r = _np.random.default_rng(0)
_Y = _r.normal(size=(30, 4))
_half = lambda A: A * 0.5
_e = _np.mean((_Y * 0.5 - _Y) ** 2, axis=1)
assert _np.allclose(reconstruction_errors(_Y, _half), _e), "Wrong for random data: average the squared error over each row's columns."
assert list(most_unusual(_Y, _half, 3)) == list(_np.argsort(-_e)[:3]), "most_unusual should list the largest errors first."
"SUCCESS: Whatever does the reconstructing, a row it cannot rebuild is a row unlike its training data."
```

Hint: `np.mean(..., axis=1)` averages each row. `np.argsort(-errors)` puts the largest errors first.
:::

::: challenge Find the digit it never saw [medium]
Use reconstruction error to find a kind of digit the model has never seen. Write `ap_for_unseen(digit, X_train, y_train, X_test, y_test, components=10)`: fit `PCA(n_components=components)` only on the training digits that are **not** `digit`, reconstruct every test digit with `inverse_transform(transform(X_test))`, score each by its mean squared reconstruction error, and return the average precision (`average_precision_score`) for detecting the test digits that **are** `digit`.

Store the result for the 8s in `ap_eights`, and for the 1s in `ap_ones`.

```python starter
import numpy as np
from sklearn.datasets import load_digits
from sklearn.decomposition import PCA
from sklearn.metrics import average_precision_score
from sklearn.model_selection import train_test_split

def ap_for_unseen(digit, X_train, y_train, X_test, y_test, components=10):
    return 0.0

digits = load_digits()
X_train, X_test, y_train, y_test = train_test_split(digits.data / 16, digits.target, test_size=0.3, random_state=0)
ap_eights = ap_for_unseen(8, X_train, y_train, X_test, y_test)
ap_ones = ap_for_unseen(1, X_train, y_train, X_test, y_test)
print(ap_eights, ap_ones)
```

```python solution
import numpy as np
from sklearn.datasets import load_digits
from sklearn.decomposition import PCA
from sklearn.metrics import average_precision_score
from sklearn.model_selection import train_test_split

def ap_for_unseen(digit, X_train, y_train, X_test, y_test, components=10):
    pca = PCA(n_components=components).fit(X_train[y_train != digit])
    errors = np.mean((pca.inverse_transform(pca.transform(X_test)) - X_test) ** 2, axis=1)
    return average_precision_score((y_test == digit).astype(int), errors)

digits = load_digits()
X_train, X_test, y_train, y_test = train_test_split(digits.data / 16, digits.target, test_size=0.3, random_state=0)
ap_eights = ap_for_unseen(8, X_train, y_train, X_test, y_test)
ap_ones = ap_for_unseen(1, X_train, y_train, X_test, y_test)
print(ap_eights, ap_ones)
```

```python test
import numpy as _np
from sklearn.datasets import load_digits as _ld
from sklearn.decomposition import PCA as _PCA
from sklearn.metrics import average_precision_score as _aps
from sklearn.model_selection import train_test_split as _tts
assert "ap_for_unseen" in dir(), "Keep the function's name as ap_for_unseen."
_d = _ld()
_Xtr, _Xte, _ytr, _yte = _tts(_d.data / 16, _d.target, test_size=0.3, random_state=0)
def _ref(dg, comps=10):
    p = _PCA(n_components=comps).fit(_Xtr[_ytr != dg])
    e = _np.mean((p.inverse_transform(p.transform(_Xte)) - _Xte) ** 2, axis=1)
    return _aps((_yte == dg).astype(int), e)
for _dg, _c in [(3, 10), (5, 6)]:
    assert _np.isclose(ap_for_unseen(_dg, _Xtr, _ytr, _Xte, _yte, _c), _ref(_dg, _c)), f"ap_for_unseen gives the wrong answer for digit {_dg} with {_c} components. Fit only on the training digits that are not that digit, and score the test digits by their own mean squared error."
assert _np.isclose(ap_eights, _ref(8)) and _np.isclose(ap_ones, _ref(1)), "ap_eights and ap_ones should come from your function."
_base8 = (_yte == 8).mean()
f"SUCCESS: A model that never saw the digit still flags it: average precision {ap_eights:.2f} for 8s and {ap_ones:.2f} for 1s, against about {_base8:.2f} for guessing. How well an unseen class stands out depends on how badly the model draws it from what it already knows."
```

Hint: `X_train[y_train != digit]` keeps only the other digits. Each test digit's score is the mean of its squared errors (`axis=1`), and the labels are `(y_test == digit)`.
:::

::: challenge A linear autoencoder finds PCA [medium]
Train the simplest autoencoder by gradient descent and check that it lands on PCA's answer. Use **tied** weights: code = Xc W and reconstruction = Xc W Wᵀ, where Xc is the centred data and W has shape `(64, k)`. The loss is L = mean over all values of (Xc W Wᵀ − Xc)².

Write `linear_ae_gradient(Xc, W)` returning ∂L/∂W. With R = Xc W Wᵀ − Xc, it is (2 / Xc.size) · (Xcᵀ R W + Rᵀ Xc W). The two terms come from W appearing twice (the weights are tied): once in the encoder, Xc W, where the usual "input transposed times error" rule gives Xcᵀ (R W), and once in the decoder, Wᵀ, where the same rule applied to the transposed matrix gives (Rᵀ Xc W); the 2/size comes from the derivative of the mean of squares. Then train with plain gradient descent: start from `np.random.default_rng(0).normal(0, 0.1, (64, 3))`, take 3,000 steps with learning rate 20, and store the result in `W`. Finally store in `gap` the largest absolute difference between your projection matrix W(WᵀW)⁻¹Wᵀ and PCA's, Vₖᵀ Vₖ, with Vₖ the first 3 rows of `PCA(3).fit(X).components_`. (Projection matrices compare the subspaces without caring which basis spans them.)

```python starter
import numpy as np
from sklearn.datasets import load_digits
from sklearn.decomposition import PCA

def linear_ae_gradient(Xc, W):
    return np.zeros_like(W)

X = load_digits().data / 16
Xc = X - X.mean(axis=0)
W = np.random.default_rng(0).normal(0, 0.1, (64, 3))
gap = 1.0
print(gap)
```

```python solution
import numpy as np
from sklearn.datasets import load_digits
from sklearn.decomposition import PCA

def linear_ae_gradient(Xc, W):
    R = Xc @ W @ W.T - Xc
    return 2 / Xc.size * (Xc.T @ R @ W + R.T @ Xc @ W)

X = load_digits().data / 16
Xc = X - X.mean(axis=0)
W = np.random.default_rng(0).normal(0, 0.1, (64, 3))
for _ in range(3000):
    W = W - 20 * linear_ae_gradient(Xc, W)
mine = W @ np.linalg.inv(W.T @ W) @ W.T
Vk = PCA(3).fit(X).components_
gap = float(np.abs(mine - Vk.T @ Vk).max())
print(gap)
```

```python test
import numpy as _np
assert "linear_ae_gradient" in dir(), "Keep the function's name as linear_ae_gradient."
_r = _np.random.default_rng(5)
_Xc = _r.normal(size=(12, 5)); _Xc -= _Xc.mean(axis=0)
_W0 = _r.normal(size=(5, 2))
def _L(W):
    return _np.mean((_Xc @ W @ W.T - _Xc) ** 2)
_num = _np.zeros_like(_W0)
for _i in _np.ndindex(_W0.shape):
    _u = _W0.copy(); _u[_i] += 1e-6
    _d = _W0.copy(); _d[_i] -= 1e-6
    _num[_i] = (_L(_u) - _L(_d)) / 2e-6
assert _np.allclose(linear_ae_gradient(_Xc, _W0), _num, atol=1e-7), "linear_ae_gradient does not match the numerical gradient of the mean squared reconstruction error."
assert _np.shape(W) == (64, 3), "W should keep the shape (64, 3)."
_Xd = load_digits().data / 16
_Vk = PCA(3).fit(_Xd).components_
_mine = W @ _np.linalg.inv(W.T @ W) @ W.T
_gap = float(_np.abs(_mine - _Vk.T @ _Vk).max())
assert _gap < 0.02, f"Your trained W spans a subspace {_gap:.3f} away from PCA's (it should be below 0.02). Train for 3000 steps with learning rate 20."
assert _np.isclose(gap, _gap), "gap should be computed from your trained W."
"SUCCESS: Gradient descent on a linear autoencoder rediscovers PCA's subspace. Only the non-linear layers let an autoencoder do better than PCA."
```

Hint: Compute `R = Xc @ W @ W.T - Xc` once, then the formula. In the training loop, `W = W - 20 * linear_ae_gradient(Xc, W)`. `np.linalg.inv(W.T @ W)` handles the fact that W's columns need not be unit length or perpendicular.
:::

## What you learned

- An autoencoder trains an encoder and decoder to rebuild the input through a narrow code, with the input as its own target: no labels needed.
- With a sigmoid output and squared error, the output signal is 2(p − x)·p(1 − p), averaged; the rest is ordinary backpropagation.
- Non-linear autoencoders beat PCA at the same code size on the digits (test error 0.042 against 0.054 with 2 numbers); a linear autoencoder can only find PCA's subspace.
- A 2-number code arranged the digits into groups by kind without seeing a label.
- Denoising autoencoders learn to rebuild clean inputs from corrupted ones, the idea behind diffusion models and masked language models.
- Reconstruction error is an anomaly score: a model fitted without 8s picked out the 8s.

An autoencoder can rebuild a digit from its code, but cannot invent a new one: pick a random code and the decoder may produce nonsense, because nothing told it which codes are sensible. The next lesson builds models that can **generate**: the variational autoencoder, which organises its codes so that random ones decode to plausible digits, and the generative adversarial network.
