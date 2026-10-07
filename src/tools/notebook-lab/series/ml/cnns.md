# Convolutional networks

The last lesson built the convolution: a small filter slid across an image, producing a feature map of where its pattern appears. A **convolutional neural network** (CNN) stacks convolutions with the pieces you already have, ReLU activations and a dense output layer, plus one new piece, **pooling**, and learns its filters by backpropagation instead of having them designed by hand. CNNs were the breakthrough that made computers good at seeing: reading cheques in the 1990s, then, from 2012, recognising objects in photographs better than any earlier method.

This lesson builds a small CNN in NumPy: one convolutional layer with 16 learned 3 × 3 filters, max pooling, and a dense softmax layer. It derives the backward pass through each layer, checks it numerically, trains the network on the digits, looks at the filters it learns, and tests how it copes with shifted digits.

## Max pooling

After a convolution and ReLU, the feature maps are as large as the image. **Pooling** shrinks them: divide each map into small blocks, typically 2 × 2, and keep one number per block. **Max pooling** keeps the largest. An 8 × 8 map becomes 4 × 4.

Two things are gained. The maps are four times smaller, so later layers need fewer weights. And the network becomes slightly tolerant of small shifts: if a filter's strongest response moves by one pixel but stays within the same 2 × 2 block, the pooled value does not change. Pooling has no weights to learn.

With NumPy, 2 × 2 max pooling is a reshape and a max. A map of shape (8, 8) reshaped to (4, 2, 4, 2) groups each 2 × 2 block along axes 1 and 3:

```python type
import numpy as np

feature_map = np.array([[1, 3, 0, 2],
                        [4, 2, 1, 1],
                        [0, 0, 5, 6],
                        [1, 2, 7, 0]], dtype=float)
pooled = feature_map.reshape(2, 2, 2, 2).max(axis=(1, 3))
print(pooled)
```

```output
[[4. 2.]
 [2. 7.]]
```

The four 2 × 2 blocks have maxima 4, 2, 2 and 7.

## The network

The whole network, for a batch of `n` digit images of size 8 × 8:

1. **Convolution**: 16 filters of 3 × 3, with padding 1 so the maps stay 8 × 8, plus a bias per filter: output shape (n, 16, 8, 8).
2. **ReLU**.
3. **Max pooling** 2 × 2: (n, 16, 4, 4).
4. **Flatten** each image's maps into 16 × 4 × 4 = 256 numbers.
5. **Dense** layer to 10 scores, then **softmax**.

That is 16 × 9 + 16 = 160 weights in the convolution and 256 × 10 + 10 = 2,570 in the dense layer: 2,730 in all, against 4,810 for the 64 → 64 → 10 network of the training lesson.

## The backward pass

Backpropagation goes through the layers in reverse; each layer receives the gradient of the loss with respect to its output and produces the gradient with respect to its input (and its weights).

- **Dense and softmax**: exactly as before. D = (P − Y)/n, the weight gradient is flatᵀ D, and the gradient flowing back to the flattened maps is D Wᵀ, reshaped to (n, 16, 4, 4).
- **Max pooling**: each pooled value is a copy of one input value, the maximum of its block, so only that input affects the loss. The gradient of each pooled value goes back to the position that held the maximum, and every other position in the block gets zero. One trap: if several positions tie for the maximum (common in blank areas, where a filter gives the same value everywhere), the gradient must still go to **one** of them, or it would be counted several times. In code, `first_max_mask` puts a 1 at the first maximum of each 2 × 2 block (it rearranges each block's four values into a row, takes `argmax`, and turns that into a one-hot pattern with `np.eye(4)`), and `np.repeat` spreads each pooled gradient over its block.
- **ReLU**: multiply by 1 where the score was positive, 0 elsewhere, as always.
- **Convolution**: each output is Σ patch × filter, so, exactly like a dense layer's "error times input", each filter weight's gradient is the sum, over every image and every position, of the error signal at that position times the pixel that weight was multiplied by there. With all the patches from `sliding_window_view`, that is one `einsum`. (A deeper network would also need the gradient with respect to the convolution's **input**, to pass further back: each input pixel collects error × weight from every output position whose window covered it. This network's convolution is the first layer, so it is not needed here; the second challenge builds it.)

```python type
import numpy as np
from numpy.lib.stride_tricks import sliding_window_view
from sklearn.datasets import load_digits

FILTERS = 16

def softmax(Z):
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)

def init(seed):
    rng = np.random.default_rng(seed)
    return {"K": rng.normal(0, np.sqrt(2 / 9), (FILTERS, 3, 3)), "bk": np.zeros(FILTERS),
            "W": rng.normal(0, np.sqrt(2 / (FILTERS * 16)), (FILTERS * 16, 10)), "b": np.zeros(10)}

def forward(params, images):
    padded = np.pad(images, ((0, 0), (1, 1), (1, 1)))
    patches = sliding_window_view(padded, (3, 3), axis=(1, 2))
    Z = np.einsum("nhwij,fij->nfhw", patches, params["K"]) + params["bk"][None, :, None, None]
    A = np.maximum(0, Z)
    pooled = A.reshape(len(images), FILTERS, 4, 2, 4, 2).max(axis=(3, 5))
    flat = pooled.reshape(len(images), -1)
    return patches, Z, A, pooled, flat, softmax(flat @ params["W"] + params["b"])

def first_max_mask(A):
    n, f = A.shape[:2]
    blocks = A.reshape(n, f, 4, 2, 4, 2).transpose(0, 1, 2, 4, 3, 5).reshape(n, f, 4, 4, 4)
    first = np.eye(4)[blocks.argmax(axis=-1)]
    return first.reshape(n, f, 4, 4, 2, 2).transpose(0, 1, 2, 4, 3, 5).reshape(n, f, 8, 8)

def gradients(params, images, labels):
    patches, Z, A, pooled, flat, P = forward(params, images)
    n = len(images)
    D = (P - np.eye(10)[labels]) / n
    grads = {"W": flat.T @ D, "b": D.sum(axis=0)}
    d_pooled = (D @ params["W"].T).reshape(n, FILTERS, 4, 4)
    d_A = first_max_mask(A) * np.repeat(np.repeat(d_pooled, 2, axis=2), 2, axis=3)
    d_Z = d_A * (Z > 0)
    grads["K"] = np.einsum("nhwij,nfhw->fij", patches, d_Z)
    grads["bk"] = d_Z.sum(axis=(0, 2, 3))
    return grads

images, labels = load_digits().images[:5] / 16, load_digits().target[:5]
params = init(1)
params["bk"] += 0.1
grads = gradients(params, images, labels)

def loss(p):
    P = forward(p, images)[-1]
    return -np.mean(np.log(P[np.arange(5), labels]))

for name, index in [("K", (2, 1, 1)), ("bk", (5,)), ("W", (40, 3))]:
    up = {k: v.copy() for k, v in params.items()}
    down = {k: v.copy() for k, v in params.items()}
    up[name][index] += 1e-6
    down[name][index] -= 1e-6
    print(f"{name}{list(index)}: backprop {grads[name][index]:.8f}, numerical {(loss(up) - loss(down)) / 2e-6:.8f}")
```

```output
K[2, 1, 1]: backprop -0.06405408, numerical -0.06405408
bk[5]: backprop -0.25032839, numerical -0.25032839
W[40, 3]: backprop 0.01483990, numerical 0.01483990
```

`load_digits().images` gives the digits as 8 × 8 grids. The `einsum` in `forward` is the multi-filter convolution from the last lesson (one input channel here); the one in `gradients` sums patch × error over images (`n`) and positions (`h`, `w`) for each filter weight. The gradient check agrees to about eight decimal places for a filter weight, a filter bias and a dense weight. One subtlety: the biases are nudged to 0.1 before checking. In the blank parts of a digit every pixel under the filter is 0, so with biases of exactly 0 the score is exactly 0, right on the corner of the ReLU, where nudging up and nudging down give different slopes and the numerical estimate is meaningless. Gradient checks should avoid such corners. (With biases of 0.1, those blank areas produce four equal values in a pooling block: exactly the tie case that `first_max_mask` handles.)

## Training it

Same recipe as before: mini-batches of 32, momentum, 10 epochs. Before running, predict: will the CNN, with about half the parameters, beat the dense network's 97%?

```python type
import numpy as np
from numpy.lib.stride_tricks import sliding_window_view
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split

FILTERS = 16

def softmax(Z):
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)

def init(seed):
    rng = np.random.default_rng(seed)
    return {"K": rng.normal(0, np.sqrt(2 / 9), (FILTERS, 3, 3)), "bk": np.zeros(FILTERS),
            "W": rng.normal(0, np.sqrt(2 / (FILTERS * 16)), (FILTERS * 16, 10)), "b": np.zeros(10)}

def forward(params, images):
    padded = np.pad(images, ((0, 0), (1, 1), (1, 1)))
    patches = sliding_window_view(padded, (3, 3), axis=(1, 2))
    Z = np.einsum("nhwij,fij->nfhw", patches, params["K"]) + params["bk"][None, :, None, None]
    A = np.maximum(0, Z)
    pooled = A.reshape(len(images), FILTERS, 4, 2, 4, 2).max(axis=(3, 5))
    flat = pooled.reshape(len(images), -1)
    return patches, Z, A, pooled, flat, softmax(flat @ params["W"] + params["b"])

def first_max_mask(A):
    n, f = A.shape[:2]
    blocks = A.reshape(n, f, 4, 2, 4, 2).transpose(0, 1, 2, 4, 3, 5).reshape(n, f, 4, 4, 4)
    first = np.eye(4)[blocks.argmax(axis=-1)]
    return first.reshape(n, f, 4, 4, 2, 2).transpose(0, 1, 2, 4, 3, 5).reshape(n, f, 8, 8)

def gradients(params, images, labels):
    patches, Z, A, pooled, flat, P = forward(params, images)
    n = len(images)
    D = (P - np.eye(10)[labels]) / n
    grads = {"W": flat.T @ D, "b": D.sum(axis=0)}
    d_pooled = (D @ params["W"].T).reshape(n, FILTERS, 4, 4)
    d_A = first_max_mask(A) * np.repeat(np.repeat(d_pooled, 2, axis=2), 2, axis=3)
    d_Z = d_A * (Z > 0)
    grads["K"] = np.einsum("nhwij,nfhw->fij", patches, d_Z)
    grads["bk"] = d_Z.sum(axis=(0, 2, 3))
    return grads

def accuracy(params, images, labels):
    return (forward(params, images)[-1].argmax(axis=1) == labels).mean()

digits = load_digits()
X_train, X_test, y_train, y_test = train_test_split(digits.images / 16, digits.target, test_size=0.3, random_state=0)

params = init(0)
rng = np.random.default_rng(0)
velocity = {name: np.zeros_like(value) for name, value in params.items()}
for epoch in range(1, 11):
    order = rng.permutation(len(X_train))
    for start in range(0, len(X_train), 32):
        batch = order[start:start + 32]
        grads = gradients(params, X_train[batch], y_train[batch])
        for name in params:
            velocity[name] = 0.9 * velocity[name] + grads[name]
            params[name] -= 0.05 * velocity[name]
    if epoch in (1, 5, 10):
        print(f"epoch {epoch:>2}: test accuracy {accuracy(params, X_test, y_test):.3f}")

def shift_right(images, pixels):
    moved = np.zeros_like(images)
    moved[:, :, pixels:] = images[:, :, :-pixels]
    return moved

for pixels in [1, 2]:
    print(f"test digits shifted {pixels} pixel(s) right: accuracy {accuracy(params, shift_right(X_test, pixels), y_test):.3f}")
```

```output
epoch  1: test accuracy 0.881
epoch  5: test accuracy 0.970
epoch 10: test accuracy 0.981
test digits shifted 1 pixel(s) right: accuracy 0.557
test digits shifted 2 pixel(s) right: accuracy 0.156
```

After 10 epochs the CNN reads about **98%** of the unseen digits, a little better than the dense network from the training lesson, with about half as many parameters. On images this small (8 × 8, already centred and scaled), there is little room for convolution to show its strength; on real photographs, hundreds of pixels across, the gap between convolutional and dense networks is enormous.

The shift test is sobering, and honest. Shifting every test digit one pixel to the right drops the accuracy to about 0.56, and two pixels to about 0.16. A dense network trained on the same split does worse still (in a separate run with scikit-learn's `MLPClassifier`, about 0.41 to 0.47 for a one-pixel shift), but neither is truly shift-proof. The convolution itself is shift-equivariant, but the dense layer after pooling still learns "this feature at this position", and one 2 × 2 pooling only absorbs very small shifts. Real CNNs get much more robustness from **many** layers of convolution and pooling, from **global pooling** (averaging each feature map over all positions before the dense layer), and above all from **data augmentation** with shifted, scaled and rotated training images.

## What the filters learn

Each of the 16 filters is a 3 × 3 grid of learned weights, and can be drawn as a tiny image:

```python type
import numpy as np
import matplotlib.pyplot as plt
from numpy.lib.stride_tricks import sliding_window_view
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split

FILTERS = 16

def softmax(Z):
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)

def init(seed):
    rng = np.random.default_rng(seed)
    return {"K": rng.normal(0, np.sqrt(2 / 9), (FILTERS, 3, 3)), "bk": np.zeros(FILTERS),
            "W": rng.normal(0, np.sqrt(2 / (FILTERS * 16)), (FILTERS * 16, 10)), "b": np.zeros(10)}

def forward(params, images):
    padded = np.pad(images, ((0, 0), (1, 1), (1, 1)))
    patches = sliding_window_view(padded, (3, 3), axis=(1, 2))
    Z = np.einsum("nhwij,fij->nfhw", patches, params["K"]) + params["bk"][None, :, None, None]
    A = np.maximum(0, Z)
    pooled = A.reshape(len(images), FILTERS, 4, 2, 4, 2).max(axis=(3, 5))
    flat = pooled.reshape(len(images), -1)
    return patches, Z, A, pooled, flat, softmax(flat @ params["W"] + params["b"])

def first_max_mask(A):
    n, f = A.shape[:2]
    blocks = A.reshape(n, f, 4, 2, 4, 2).transpose(0, 1, 2, 4, 3, 5).reshape(n, f, 4, 4, 4)
    first = np.eye(4)[blocks.argmax(axis=-1)]
    return first.reshape(n, f, 4, 4, 2, 2).transpose(0, 1, 2, 4, 3, 5).reshape(n, f, 8, 8)

def gradients(params, images, labels):
    patches, Z, A, pooled, flat, P = forward(params, images)
    n = len(images)
    D = (P - np.eye(10)[labels]) / n
    grads = {"W": flat.T @ D, "b": D.sum(axis=0)}
    d_pooled = (D @ params["W"].T).reshape(n, FILTERS, 4, 4)
    d_A = first_max_mask(A) * np.repeat(np.repeat(d_pooled, 2, axis=2), 2, axis=3)
    d_Z = d_A * (Z > 0)
    grads["K"] = np.einsum("nhwij,nfhw->fij", patches, d_Z)
    grads["bk"] = d_Z.sum(axis=(0, 2, 3))
    return grads

digits = load_digits()
X_train, X_test, y_train, y_test = train_test_split(digits.images / 16, digits.target, test_size=0.3, random_state=0)
params = init(0)
initial_filters = params["K"].copy()
rng = np.random.default_rng(0)
velocity = {name: np.zeros_like(value) for name, value in params.items()}
for epoch in range(10):
    order = rng.permutation(len(X_train))
    for start in range(0, len(X_train), 32):
        batch = order[start:start + 32]
        grads = gradients(params, X_train[batch], y_train[batch])
        for name in params:
            velocity[name] = 0.9 * velocity[name] + grads[name]
            params[name] -= 0.05 * velocity[name]

change = np.abs(params["K"] - initial_filters).mean()
print(f"average size of a filter weight at the start: {np.abs(initial_filters).mean():.2f}; average change during training: {change:.2f}")

fig, axes = plt.subplots(4, 8, figsize=(9, 5))
for f in range(16):
    for row, kernels in [(0, initial_filters), (2, params["K"])]:
        ax = axes[row + f // 8, f % 8]
        ax.imshow(kernels[f], cmap="RdBu_r", vmin=-np.abs(kernels[f]).max(), vmax=np.abs(kernels[f]).max())
        ax.axis("off")
axes[0, 0].set_title("before training (rows 1-2)", fontsize=8, loc="left")
axes[2, 0].set_title("after training (rows 3-4)", fontsize=8, loc="left")
plt.show()

maps = forward(params, X_test[:1])[2][0]
fig, axes = plt.subplots(2, 9, figsize=(10, 2.6))
axes[0, 0].imshow(X_test[0], cmap="gray_r")
axes[0, 0].set_title("input", fontsize=8)
for ax in axes.ravel():
    ax.axis("off")
for f in range(16):
    axes[f // 8, 1 + f % 8].imshow(maps[f], cmap="gray_r")
plt.show()
```

```output
average size of a filter weight at the start: 0.37; average change during training: 0.26
```

The first figure shows the 16 filters before training (top two rows) and after (bottom two rows), red positive and blue negative; the second shows the input digit and what each learned filter produces from it, after ReLU.

Be honest about what you see. The filters have changed, but only partly: the average weight moved by about 0.26, against a starting size of about 0.37, and many learned filters still resemble their random beginnings. Random 3 × 3 filters already look somewhat like edge detectors (positive on one side, negative on the other), so on tiny 8 × 8 digits with 10 epochs of training there is little pressure to change them much: the dense layer does a lot of the work. The famous result comes from large CNNs trained on photographs: there the first layer's filters reliably become clean edge and colour detectors, and deeper layers combine them into textures, parts and objects, with nobody telling the network about edges.

## Deeper networks

Real CNNs stack many convolution layers. Each layer's filters look at a small window of the previous layer's maps, but those maps already summarise windows of the layer before, so deeper layers "see" ever larger regions of the original image. That region is a unit's **receptive field**. Two stacked 3 × 3 convolutions see a 5 × 5 region of the input; with pooling in between, the receptive field grows much faster. Landmark architectures: **LeNet** (1998, digits), **AlexNet** (2012, the deep learning breakthrough on photographs), **VGG** (stacks of 3 × 3 convolutions) and **ResNet** (2015, over 100 layers, made trainable by "skip connections" that add each block's input to its output, giving gradients a direct path backwards). Libraries such as PyTorch provide all these layers with their backward passes built in, using exactly the ideas of this lesson.

::: challenge Max pooling [easy]
Write `max_pool(A, size)` for a batch of feature maps of shape `(n, filters, height, width)`, where height and width are divisible by `size`: return the maximum of each `size × size` block, with shape `(n, filters, height // size, width // size)`.

```python starter
import numpy as np

def max_pool(A, size):
    return A

A = np.arange(32, dtype=float).reshape(1, 2, 4, 4)
print(max_pool(A, 2))
```

```python solution
import numpy as np

def max_pool(A, size):
    n, f, h, w = A.shape
    return A.reshape(n, f, h // size, size, w // size, size).max(axis=(3, 5))

A = np.arange(32, dtype=float).reshape(1, 2, 4, 4)
print(max_pool(A, 2))
```

```python test
import numpy as _np
assert "max_pool" in dir(), "Keep the function's name as max_pool."
_m = _np.array([[1, 3, 0, 2], [4, 2, 1, 1], [0, 0, 5, 6], [1, 2, 7, 0]], dtype=float).reshape(1, 1, 4, 4)
assert _np.array_equal(max_pool(_m, 2), [[[[4, 2], [2, 7]]]]), f"For the lesson's example the pooled map is [[4, 2], [2, 7]], but got {max_pool(_m, 2)}."
_r = _np.random.default_rng(0)
_A = _r.normal(size=(3, 5, 6, 9))
_out = max_pool(_A, 3)
assert _np.shape(_out) == (3, 5, 2, 3), f"A (3, 5, 6, 9) batch pooled in 3 × 3 blocks should have shape (3, 5, 2, 3), not {_np.shape(_out)}."
_ref = _np.array([[[[_A[i, f, r * 3:r * 3 + 3, c * 3:c * 3 + 3].max() for c in range(3)] for r in range(2)] for f in range(5)] for i in range(3)])
assert _np.allclose(_out, _ref), "The values are wrong: each output should be the maximum of one size × size block. Check that you reshape to (n, f, h // size, size, w // size, size) and take the max over axes 3 and 5."
"SUCCESS: Each block reduced to its strongest response."
```

Hint: Reshape to `(n, f, h // size, size, w // size, size)`, so each block's rows are on axis 3 and its columns on axis 5, then take `.max(axis=(3, 5))`.
:::

::: challenge The gradient for the input [medium]
To stack convolution layers, backpropagation must pass the gradient **through** a convolution to its input. For the lesson's convolution (padding 1, 3 × 3 filters, one input channel), the forward pass is Z[n, f, h, w] = Σᵢⱼ padded[n, h + i, w + j] · K[f, i, j] + bias. So each padded input pixel at (h + i, w + j) receives d_Z[n, f, h, w] · K[f, i, j] from every output position (h, w), every filter f, and every offset (i, j) that touches it.

Write `conv_input_gradient(d_Z, K)` that takes `d_Z` of shape `(n, F, H, W)` and `K` of shape `(F, 3, 3)` and returns the gradient for the unpadded input, shape `(n, H, W)`: build the gradient for the padded input (shape `(n, H + 2, W + 2)`), adding the contributions for each of the nine offsets, then crop off the padding border.

The check compares your result with numerical gradients.

```python starter
import numpy as np

def conv_input_gradient(d_Z, K):
    n, F, H, W = d_Z.shape
    return np.zeros((n, H, W))
```

```python solution
import numpy as np

def conv_input_gradient(d_Z, K):
    n, F, H, W = d_Z.shape
    d_padded = np.zeros((n, H + 2, W + 2))
    for i in range(3):
        for j in range(3):
            d_padded[:, i:i + H, j:j + W] += np.einsum("nfhw,f->nhw", d_Z, K[:, i, j])
    return d_padded[:, 1:-1, 1:-1]
```

```python test
import numpy as _np
from numpy.lib.stride_tricks import sliding_window_view as _swv
assert "conv_input_gradient" in dir(), "Keep the function's name as conv_input_gradient."
_r = _np.random.default_rng(2)
_X = _r.normal(size=(2, 5, 6))
_K = _r.normal(size=(3, 3, 3))
_G = _r.normal(size=(2, 3, 5, 6))
def _forward(X):
    patches = _swv(_np.pad(X, ((0, 0), (1, 1), (1, 1))), (3, 3), axis=(1, 2))
    return _np.einsum("nhwij,fij->nfhw", patches, _K)
def _objective(X):
    return _np.sum(_forward(X) * _G)
_num = _np.zeros_like(_X)
for _idx in _np.ndindex(_X.shape):
    _u = _X.copy(); _u[_idx] += 1e-6
    _d = _X.copy(); _d[_idx] -= 1e-6
    _num[_idx] = (_objective(_u) - _objective(_d)) / 2e-6
_got = conv_input_gradient(_G, _K)
assert _np.shape(_got) == (2, 5, 6), f"The result should have the input's shape (2, 5, 6), not {_np.shape(_got)}: crop the padding."
_flipped = _np.zeros((2, 7, 8))
for _i in range(3):
    for _j in range(3):
        _flipped[:, _i:_i + 5, _j:_j + 6] += _np.einsum("nfhw,f->nhw", _G, _K[:, 2 - _i, 2 - _j])
assert not _np.allclose(_got, _flipped[:, 1:-1, 1:-1]), "You used the filter flipped: offset (i, j) should use K[f, i, j]."
assert _np.allclose(_got, _num, atol=1e-6), "Your input gradient does not match the numerical one. Each offset (i, j) adds d_Z weighted by K[:, i, j] into the window starting at row i, column j of the padded gradient."
"SUCCESS: With the input gradient, convolution layers can be stacked and trained end to end. (It is itself a convolution: of the padded error with the flipped filters.)"
```

Hint: Loop over the nine offsets. For offset `(i, j)`, `np.einsum("nfhw,f->nhw", d_Z, K[:, i, j])` sums each position's error times that weight over the filters; add it into `d_padded[:, i:i + H, j:j + W]`. Finally return `d_padded[:, 1:-1, 1:-1]`.
:::

::: challenge Receptive fields [medium]
A unit's receptive field is the size of the input region it can see. For a stack of layers, each given as `(kernel_size, stride)` (a pooling layer counts too: 2 × 2 pooling with stride 2 is `(2, 2)`), the receptive field can be computed layer by layer: start with `field = 1` and `jump = 1` (the distance in input pixels between neighbouring units); for each layer, `field += (kernel_size - 1) * jump`, then `jump *= stride`. Why: a layer's window spans `kernel_size` neighbouring units of the layer below, which adds `kernel_size − 1` gaps of `jump` input pixels each to what one unit sees; and a stride of `s` puts neighbouring units `s` times further apart in the input.

Write `receptive_field(layers)` implementing this. Then store the receptive field of three 3 × 3 convolutions with stride 1 in `three_convs`, of the lesson's network (a 3 × 3 convolution then 2 × 2 pooling) in `lesson_net`, and of the stack `conv3, pool2, conv3, pool2, conv3` (strides 1, 2, 1, 2, 1) in `small_vgg`.

```python starter
def receptive_field(layers):
    return 1

three_convs = receptive_field([(3, 1)] * 3)
lesson_net = receptive_field([(3, 1), (2, 2)])
small_vgg = receptive_field([(3, 1), (2, 2), (3, 1), (2, 2), (3, 1)])
print(three_convs, lesson_net, small_vgg)
```

```python solution
def receptive_field(layers):
    field, jump = 1, 1
    for kernel_size, stride in layers:
        field += (kernel_size - 1) * jump
        jump *= stride
    return field

three_convs = receptive_field([(3, 1)] * 3)
lesson_net = receptive_field([(3, 1), (2, 2)])
small_vgg = receptive_field([(3, 1), (2, 2), (3, 1), (2, 2), (3, 1)])
print(three_convs, lesson_net, small_vgg)
```

```python test
assert "receptive_field" in dir(), "Keep the function's name as receptive_field."
assert receptive_field([]) == 1, "With no layers, a unit sees exactly 1 pixel."
assert receptive_field([(3, 1)]) == 3, "One 3 × 3 convolution sees 3 pixels across."
assert receptive_field([(3, 1), (3, 1)]) == 5, "Two stacked 3 × 3 convolutions see 5 pixels across."
assert receptive_field([(2, 2), (3, 1)]) == 6, "Pooling first doubles the jump, so a following 3 × 3 convolution adds (3 − 1) × 2 = 4: field 2 + 4 = 6. Update the field before the jump within each layer."
assert three_convs == 7 and lesson_net == 4 and small_vgg == 18, f"Expected 7, 4 and 18, but got {three_convs}, {lesson_net} and {small_vgg}."
"SUCCESS: Three small convolutions see as far as one 7 × 7, and each pooling layer makes every later layer see twice as far. Depth is how CNNs come to see whole objects with 3 × 3 filters."
```

Hint: Loop over the `(kernel_size, stride)` pairs, updating `field` with the current `jump` first, then multiplying `jump` by the stride.
:::

## What you learned

- A CNN stacks convolution, ReLU and pooling layers, then flattens the maps into dense layers; its filters are learned by backpropagation.
- Max pooling keeps each block's maximum: smaller maps and slight tolerance of small shifts. Its backward pass routes each gradient to the block's maximum (one position only, even when there are ties).
- To stack convolutions, the gradient must also pass to a convolution's input: each input pixel collects error × weight from every window that covered it.
- A convolution's filter gradient sums (error at each position × the pixel the weight touched there) over all images and positions: one `einsum` over the patches.
- A 16-filter CNN read about 98% of unseen digits with about half the parameters of the dense network. On such small images its filters moved only partly from their random start; in large CNNs on photographs, first-layer filters become clear edge detectors.
- One convolution and pooling layer does not make a network shift-proof (one-pixel shifts dropped accuracy to about 0.56); depth, global pooling and data augmentation provide real robustness.
- Stacking layers grows the receptive field; LeNet, AlexNet, VGG and ResNet (with skip connections) are the landmark designs.

Images have a grid; sentences, speech and stock prices have an **order**. The next lesson builds the network for sequences: the recurrent neural network, which reads one step at a time while carrying a memory of what came before.
