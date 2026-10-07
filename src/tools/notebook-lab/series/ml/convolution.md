# Convolution

Every network so far has treated an image as a flat list of numbers. The digit network's first layer gave each of the 64 pixels its own weight for each hidden unit, with no idea that pixel 9 sits right next to pixel 10, or below pixel 1. Shift a digit one pixel to the right and, to that network, every input changes: it has to learn "a 3 here" and "a 3 one pixel over" as separate facts. For 8 × 8 images that is tolerable; for a 1000 × 1000 photo, a single dense layer would need a billion weights per thousand units, and still could not tell that a cat in the corner is the same cat in the middle.

**Convolution** is the operation that fixes this. A small grid of weights, a **filter** (or **kernel**), slides across the image, and at each position computes one weighted sum of the pixels underneath it. The same few weights are reused at every position. This lesson builds convolution from scratch, in one dimension and then two, shows what hand-made filters detect, and covers the bookkeeping (padding, stride, channels) that convolutional networks rely on.

## Sliding a filter along a signal

Start with a one-dimensional signal, a list of numbers, and a filter of three weights. Place the filter over the first three numbers, multiply matching pairs and add them up: that is the first output. Slide one step right and repeat. A signal of length `n` and a filter of length `k` give `n − k + 1` outputs: the number of positions where the filter fits entirely.

```python type
import numpy as np

def slide(signal, kernel):
    k = len(kernel)
    return np.array([np.sum(signal[i:i + k] * kernel) for i in range(len(signal) - k + 1)])

signal = np.array([0, 0, 1, 1, 1, 1, 0, 0, 3, 0], dtype=float)
average = np.array([1, 1, 1]) / 3
difference = np.array([-1, 0, 1])

print("signal:     ", signal)
print("averaged:   ", slide(signal, average).round(2))
print("difference: ", slide(signal, difference))
print("NumPy agrees:", np.allclose(slide(signal, difference), np.correlate(signal, difference, mode="valid")))
```

```output
signal:      [0. 0. 1. 1. 1. 1. 0. 0. 3. 0.]
averaged:    [0.33 0.67 1.   1.   0.67 0.33 1.   1.  ]
difference:  [ 1.  1.  0.  0. -1. -1.  3.  0.]
NumPy agrees: True
```

The two filters do very different jobs:

- The **averaging** filter (three weights of ⅓) smooths the signal: each output is the mean of three neighbours, so the isolated spike of 3 is spread out and reduced to 1.
- The **difference** filter (−1, 0, 1) subtracts the value on the left from the value on the right. It is zero wherever the signal is flat and non-zero where it **changes**: +1 around the step up (twice, since the filter spans two positions there), −1 around the step down, and +3 where the spike rises (the drop after it would come at a position beyond the end of the signal, where the filter no longer fits). It is an **edge detector**, a discrete version of the derivative.

A note on names: mathematicians define convolution with the filter **flipped** before sliding, and `np.convolve` does that flip. What deep learning calls "convolution" is really the unflipped version, **cross-correlation** (`np.correlate`). Since the filters are learned, the flip makes no difference in practice, and this series follows the deep learning convention.

## Two dimensions

For images, the filter is a small square, typically 3 × 3, sliding across rows and down columns. At each position the output is the sum of the 9 products between the filter and the 3 × 3 patch of pixels under it. The grid of outputs is a **feature map**: it shows where in the image the pattern the filter responds to appears.

Classic hand-designed filters show what this can do. The **Sobel** filters estimate how fast brightness changes horizontally or vertically, so they light up at edges; a box filter blurs. Before running, predict: for a handwritten 0, where will the vertical-edge filter respond most strongly?

```python type
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_digits

def conv2d(image, kernel):
    k = kernel.shape[0]
    rows, cols = image.shape[0] - k + 1, image.shape[1] - k + 1
    out = np.zeros((rows, cols))
    for r in range(rows):
        for c in range(cols):
            out[r, c] = np.sum(image[r:r + k, c:c + k] * kernel)
    return out

digit = load_digits().images[0] / 16
filters = {
    "vertical edges (Sobel)": np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]),
    "horizontal edges (Sobel)": np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]]),
    "blur (box)": np.ones((3, 3)) / 9,
}

fig, axes = plt.subplots(1, 4, figsize=(11, 3))
axes[0].imshow(digit, cmap="gray_r")
axes[0].set_title("input 8 × 8", fontsize=9)
for ax, (name, kernel) in zip(axes[1:], filters.items()):
    feature_map = conv2d(digit, kernel)
    ax.imshow(feature_map, cmap="RdBu_r", vmin=-np.abs(feature_map).max(), vmax=np.abs(feature_map).max())
    ax.set_title(f"{name}\n{feature_map.shape[0]} × {feature_map.shape[1]}", fontsize=8)
for ax in axes:
    ax.axis("off")
plt.show()
```

`image[r:r + k, c:c + k]` is the k × k patch at row `r`, column `c`, and the two loops visit every position where the filter fits, giving a 6 × 6 feature map from the 8 × 8 image. In the plots, red is positive and blue negative.

The vertical-edge filter responds strongly along the **left and right sides** of the 0, with opposite signs: on the left side brightness rises from left to right (blank to ink), on the right side it falls. Along the top and bottom of the ring, where the ink runs horizontally, it barely responds; that is where the horizontal-edge filter lights up instead. The blur filter produces a softened copy. With three filters, each image becomes three feature maps describing **what** kind of local pattern is **where**.

## Why this is the right idea for images

A convolutional layer is just a layer whose weights are a set of filters. It differs from a dense layer in three ways that suit images:

- **Locality**: each output depends only on a small neighbourhood of pixels. Nearby pixels are related; distant ones, at first, are not.
- **Weight sharing**: the same filter is used at every position, so a 3 × 3 filter has 9 weights (plus a bias) whatever the image size; the channels section below compares this with a dense layer.
- **Shift equivariance**: shift the input and the feature map shifts with it, because the same filter is applied everywhere. A feature detector learned in one corner works in every corner.

You can check the last property directly: shift the digit one pixel right, and the feature map is the old one shifted one pixel right too (except at the border, where pixels fall off the edge):

```python type
import numpy as np
from sklearn.datasets import load_digits

def conv2d(image, kernel):
    k = kernel.shape[0]
    rows, cols = image.shape[0] - k + 1, image.shape[1] - k + 1
    return np.array([[np.sum(image[r:r + k, c:c + k] * kernel) for c in range(cols)] for r in range(rows)])

digit = load_digits().images[0] / 16
shifted = np.zeros_like(digit)
shifted[:, 1:] = digit[:, :-1]
sobel = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]])
original_map, shifted_map = conv2d(digit, sobel), conv2d(shifted, sobel)
print("shifted map equals the original map moved right (ignoring the first column):",
      np.allclose(shifted_map[:, 1:], original_map[:, :-1]))
```

```output
shifted map equals the original map moved right (ignoring the first column): True
```

The comparison skips the first column of the new map, where the blank column that slid in sits under the filter.

## Padding, stride and output size

Two settings control the output size:

- **Padding**: adding a border of zeros, `p` pixels wide, around the image before sliding. With a 3 × 3 filter and padding 1, the output is the same size as the input ("same" padding); without padding ("valid") it shrinks by 2 each layer.
- **Stride**: how far the filter moves between positions. Stride 2 skips every other position and halves the output size, a cheap way to shrink feature maps.

For an input of size `n`, filter size `k`, padding `p` and stride `s`, the output size is

\[
\left\lfloor \frac{n + 2p - k}{s} \right\rfloor + 1
\]

where ⌊ ⌋ means rounding down. For the digit: (8 + 0 − 3)/1 + 1 = 6, as above; with padding 1, 8; with padding 1 and stride 2, ⌊7/2⌋ + 1 = 4.

## Channels: many filters, many inputs

A colour image has three **channels** (red, green and blue), each its own grid. A filter for it is a 3 × 3 × 3 block: at each position it multiplies all 27 numbers under it and adds them up, combining the channels into a single output. A convolutional layer has many such filters, say 16, and produces 16 feature maps, which become the 16 input channels of the next layer. The shapes are:

- input: (channels_in, height, width)
- filters: (filters, channels_in, k, k), plus one bias per filter
- output: (filters, new height, new width)

Writing it with loops over positions is slow. NumPy's `sliding_window_view` builds every k × k patch as a view of the image without copying it, after which the whole convolution is one `einsum`, a NumPy function that multiplies and sums arrays along named axes:

```python type
import numpy as np
from numpy.lib.stride_tricks import sliding_window_view

def conv_layer(images, filters, biases):
    k = filters.shape[-1]
    patches = sliding_window_view(images, (k, k), axis=(2, 3))
    return np.einsum("nchwij,fcij->nfhw", patches, filters) + biases[None, :, None, None]

rng = np.random.default_rng(0)
images = rng.normal(size=(5, 3, 32, 32))
filters = rng.normal(size=(16, 3, 3, 3))
biases = np.zeros(16)
maps = conv_layer(images, filters, biases)
print("5 colour images", images.shape, "->", maps.shape)
print("weights in this layer:", filters.size + biases.size)
print("a dense layer from 3 × 32 × 32 inputs to an output this size would need", f"{3 * 32 * 32 * 16 * 30 * 30:,}", "weights")
```

```output
5 colour images (5, 3, 32, 32) -> (5, 16, 30, 30)
weights in this layer: 448
a dense layer from 3 × 32 × 32 inputs to an output this size would need 44,236,800 weights
```

`sliding_window_view(images, (k, k), axis=(2, 3))` has shape (n, channels, rows, cols, k, k): every patch of every channel of every image. The `einsum` string names each axis with a letter: `n` image, `c` channel, `h` and `w` position, `i` and `j` within the patch, `f` filter. It multiplies patches and filters, sums over the letters that do not appear after the arrow (`c`, `i`, `j`) and returns the rest. The result: 16 feature maps of 30 × 30 for each of the 5 images, from just 448 weights; a dense layer producing the same number of outputs from the same inputs would need over 44 million.

The next lesson stacks these layers into a full convolutional network and trains it. Its filters are not designed by hand like the Sobel filters: they are learned by gradient descent, and the first layer's filters usually end up looking very like edge detectors.

::: challenge Convolution in one dimension [easy]
Write `conv1d(signal, kernel, stride=1)`: slide the kernel along the signal **without flipping it**, taking a weighted sum at each position where it fits entirely, and moving `stride` places each time. Return a NumPy array of the outputs.

```python starter
import numpy as np

def conv1d(signal, kernel, stride=1):
    return np.zeros(len(signal))

print(conv1d(np.array([1.0, 2, 3, 4, 5, 6]), np.array([1.0, 0, -1]), stride=2))
```

```python solution
import numpy as np

def conv1d(signal, kernel, stride=1):
    k = len(kernel)
    return np.array([np.sum(signal[i:i + k] * kernel) for i in range(0, len(signal) - k + 1, stride)])

print(conv1d(np.array([1.0, 2, 3, 4, 5, 6]), np.array([1.0, 0, -1]), stride=2))
```

```python test
import numpy as _np
assert "conv1d" in dir(), "Keep the function's name as conv1d."
_s = _np.array([0.0, 0, 1, 1, 1, 1, 0, 0, 3, 0])
assert _np.allclose(conv1d(_s, _np.array([-1.0, 0, 1])), _np.correlate(_s, [-1.0, 0, 1], mode="valid")), "With stride 1, conv1d should match np.correlate(signal, kernel, mode='valid')."
assert _np.allclose(conv1d(_s, _np.array([1.0, 2.0])), _np.correlate(_s, [1.0, 2.0], mode="valid")), "Don't flip the kernel: [1, 2] gives signal[i] + 2·signal[i + 1]."
assert _np.allclose(conv1d(_np.array([1.0, 2, 3, 4, 5, 6]), _np.array([1.0, 0, -1]), stride=2), [-2.0, -2.0]), "With stride 2 the kernel visits positions 0 and 2 only (position 4 would run off the end)."
assert len(conv1d(_np.arange(10.0), _np.ones(3), stride=3)) == 3, "Length 10, kernel 3, stride 3: positions 0, 3 and 6, so 3 outputs."
"SUCCESS: The whole operation behind convolutional networks, in one line."
```

Hint: The kernel fits at starting positions 0 to `len(signal) - k`; `range(0, len(signal) - k + 1, stride)` visits every `stride`-th one.
:::

::: challenge Padding and stride in two dimensions [medium]
Write `conv2d(image, kernel, padding=0, stride=1)` for a 2-D image and a square kernel: pad the image with `padding` rows and columns of zeros on every side (`np.pad`), then slide the kernel with the given stride, without flipping it. Also write `output_size(n, k, padding, stride)` using the formula from the lesson.

The check compares your answers with a reference for several settings, so the output shape must follow the formula.

```python starter
import numpy as np

def output_size(n, k, padding, stride):
    return n

def conv2d(image, kernel, padding=0, stride=1):
    return image
```

```python solution
import numpy as np

def output_size(n, k, padding, stride):
    return (n + 2 * padding - k) // stride + 1

def conv2d(image, kernel, padding=0, stride=1):
    k = kernel.shape[0]
    padded = np.pad(image, padding)
    rows = output_size(image.shape[0], k, padding, stride)
    cols = output_size(image.shape[1], k, padding, stride)
    out = np.zeros((rows, cols))
    for r in range(rows):
        for c in range(cols):
            patch = padded[r * stride:r * stride + k, c * stride:c * stride + k]
            out[r, c] = np.sum(patch * kernel)
    return out
```

```python test
import numpy as _np
from scipy.signal import correlate2d as _c2d
assert "conv2d" in dir() and "output_size" in dir(), "Keep both function names."
assert "correlate" not in _source and "convolve" not in _source, "Write the sliding loop yourself rather than calling a library correlation."
assert output_size(8, 3, 0, 1) == 6 and output_size(8, 3, 1, 1) == 8 and output_size(8, 3, 1, 2) == 4 and output_size(28, 5, 2, 2) == 14, "output_size should be (n + 2p − k) // s + 1."
_r = _np.random.default_rng(0)
_img = _r.normal(size=(7, 9))
_ker = _r.normal(size=(3, 3))
assert _np.allclose(conv2d(_img, _ker), _c2d(_img, _ker, mode="valid")), "Without padding or stride, conv2d should match scipy's correlate2d(image, kernel, mode='valid'). Don't flip the kernel."
_full = _c2d(_np.pad(_img, 1), _ker, mode="valid")
assert _np.shape(conv2d(_img, _ker, padding=1)) == (7, 9) and _np.allclose(conv2d(_img, _ker, padding=1), _full), "With padding 1, a 3 × 3 kernel should keep the image size, and match correlating the zero-padded image."
assert _np.allclose(conv2d(_img, _ker, padding=1, stride=2), _full[::2, ::2]), "Stride 2 should keep every other position, starting from the first."
_k5 = _r.normal(size=(5, 5))
_out = conv2d(_img, _k5, padding=2, stride=3)
assert _np.shape(_out) == (3, 3) and _np.allclose(_out, _c2d(_np.pad(_img, 2), _k5, mode="valid")[::3, ::3]), "Check a 5 × 5 kernel with padding 2 and stride 3."
"SUCCESS: Padding to keep the size, stride to shrink it, and the formula that predicts the result."
```

Hint: `np.pad(image, padding)` adds `padding` zeros on every side. The patch for output position `(r, c)` starts at row `r * stride` and column `c * stride` of the padded image.
:::

::: challenge Recover a hidden filter [medium]
A convolution is linear in its weights: each output is the dot product of a patch with the kernel. So if you know an input image and the feature map some unknown 3 × 3 filter produced from it, you can find the filter by least squares, exactly as in the least squares lesson.

Write `recover_kernel(image, feature_map, k)`: build a matrix with one row per output position, holding that position's k × k patch flattened (`patch.ravel()`), solve the least squares problem `patches @ w ≈ feature_map.ravel()` with `np.linalg.lstsq`, and return `w` reshaped to `(k, k)`. Use it on the starter's image and noisy feature map, and store the result in `found`.

```python starter
import numpy as np

def recover_kernel(image, feature_map, k):
    return np.zeros((k, k))

rng = np.random.default_rng(3)
image = rng.normal(size=(20, 20))
secret = np.array([[0.0, 1.0, 0.0], [1.0, -4.0, 1.0], [0.0, 1.0, 0.0]])
feature_map = np.array([[np.sum(image[r:r + 3, c:c + 3] * secret) for c in range(18)] for r in range(18)])
feature_map = feature_map + rng.normal(0, 0.05, feature_map.shape)
found = recover_kernel(image, feature_map, 3)
print(found.round(2))
```

```python solution
import numpy as np

def recover_kernel(image, feature_map, k):
    rows, cols = feature_map.shape
    patches = np.array([image[r:r + k, c:c + k].ravel() for r in range(rows) for c in range(cols)])
    w, *_ = np.linalg.lstsq(patches, feature_map.ravel(), rcond=None)
    return w.reshape(k, k)

rng = np.random.default_rng(3)
image = rng.normal(size=(20, 20))
secret = np.array([[0.0, 1.0, 0.0], [1.0, -4.0, 1.0], [0.0, 1.0, 0.0]])
feature_map = np.array([[np.sum(image[r:r + 3, c:c + 3] * secret) for c in range(18)] for r in range(18)])
feature_map = feature_map + rng.normal(0, 0.05, feature_map.shape)
found = recover_kernel(image, feature_map, 3)
print(found.round(2))
```

```python test
import numpy as _np
assert "recover_kernel" in dir(), "Keep the function's name as recover_kernel."
_r = _np.random.default_rng(8)
_img = _r.normal(size=(12, 15))
_true = _r.normal(size=(3, 3))
_fm = _np.array([[_np.sum(_img[r:r + 3, c:c + 3] * _true) for c in range(13)] for r in range(10)])
assert _np.allclose(recover_kernel(_img, _fm, 3), _true, atol=1e-8), "With an exact feature map, recover_kernel should find the filter exactly. Each row of the patch matrix is one output position's patch, flattened in the same row-by-row order as the kernel."
_k4 = _r.normal(size=(4, 4))
_fm4 = _np.array([[_np.sum(_img[r:r + 4, c:c + 4] * _k4) for c in range(12)] for r in range(9)])
assert _np.allclose(recover_kernel(_img, _fm4, 4), _k4, atol=1e-8), "It should work for other kernel sizes and non-square images."
_secret = _np.array([[0.0, 1.0, 0.0], [1.0, -4.0, 1.0], [0.0, 1.0, 0.0]])
assert _np.allclose(found, _secret, atol=0.05), f"found should be close to the hidden filter, but got {_np.round(found, 2)}."
"SUCCESS: You recovered the hidden filter, a Laplacian that responds to spots and corners, from its output alone. Training a convolutional layer is this idea scaled up: adjust the filter's weights until its outputs are useful."
```

Hint: Loop over every output position `(r, c)` and collect `image[r:r + k, c:c + k].ravel()` as one row. `np.linalg.lstsq(A, b, rcond=None)` returns a tuple whose first element is the solution.
:::

## What you learned

- Convolution slides a small filter across a signal or image, taking a weighted sum at each position; a length-`k` filter on a length-`n` signal gives `n − k + 1` outputs. Deep learning's "convolution" does not flip the filter (cross-correlation).
- Averaging filters smooth; difference filters such as (−1, 0, 1) and Sobel's detect edges. A feature map shows where a filter's pattern occurs.
- Convolutional layers are local, share weights across positions (few parameters) and are shift-equivariant (shift the input, the map shifts).
- Output size is ⌊(n + 2p − k)/s⌋ + 1: padding `p` preserves size, stride `s` shrinks it.
- With channels, filters have shape (filters, channels_in, k, k) and each output map combines all input channels. `sliding_window_view` and `einsum` compute a whole layer without Python loops.
- A convolution is linear in its weights, so filters can be fitted, by least squares here and by gradient descent in a network.

The next lesson builds a full convolutional network: convolution layers with ReLU, pooling to shrink the maps, and a dense layer at the end, trained with backpropagation through the convolutions to read handwritten digits.
