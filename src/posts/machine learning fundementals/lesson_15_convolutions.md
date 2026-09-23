# Lesson 15 — Convolutions: A Sliding Dot Product

## Concept, in plain English

Lesson 13's digit classifier flattened an 8×8 image into 64 separate numbers,
throwing away the fact that neighboring pixels are related — pixel `(3,3)`
and pixel `(3,4)` are next to each other, but flattening treats them as
unrelated. Convolution fixes this: instead of one weight per pixel, use one
*small* set of weights (a filter, e.g. 3×3) and slide it across every
position in the image, computing a dot product at each stop. The same 9
weights get reused at every position — this is genuinely new, everything
before this lesson used a fresh weight per input.

## The math

A filter is a small grid of weights, e.g. 3×3. At each position, "apply the
filter" means: overlay it on a 3×3 patch of the image, multiply each filter
weight by the pixel underneath it, sum the results — a dot product, exactly
like Lesson 3, just arranged in 2D instead of a flat list.

Worked example, a 3×3 filter and a 3×3 image patch:

```
filter = [[1, 0, -1],
          [1, 0, -1],
          [1, 0, -1]]

patch  = [[2, 4, 6],
          [1, 3, 5],
          [0, 2, 4]]

result = (1*2 + 0*4 + -1*6) + (1*1 + 0*3 + -1*5) + (1*0 + 0*2 + -1*4)
       = (2 - 6) + (1 - 5) + (0 - 4)
       = -4 + -4 + -4 = -12
```

This particular filter (positive left column, negative right column) detects
a *vertical edge* — a sharp change from bright to dark, left to right. That's
the intuition behind convolution: different filters detect different simple
patterns, and stacking many filters (many small weight sets) lets the network
detect many patterns at once, all learned by the exact same gradient descent
you already know — the filter's numbers are just more weights to update.

## Type this — Cell 1 (new notebook)

```python
def dot_product_2d(filter_weights, patch):
    total = 0
    for filter_row, patch_row in zip(filter_weights, patch):
        for filter_value, patch_value in zip(filter_row, patch_row):
            total = total + filter_value * patch_value
    return total
```

Check against the hand example:

```python
edge_filter = [[1, 0, -1], [1, 0, -1], [1, 0, -1]]
sample_patch = [[2, 4, 6], [1, 3, 5], [0, 2, 4]]
dot_product_2d(edge_filter, sample_patch)
```

You should get `-12`.

## Type this — Cell 2

"Sliding" means calling `dot_product_2d` once per valid position, moving the
patch one pixel at a time:

```python
def convolve(image, filter_weights):
    filter_size = len(filter_weights)
    image_height = len(image)
    image_width = len(image[0])
    output_height = image_height - filter_size + 1
    output_width = image_width - filter_size + 1

    output = []
    for row in range(output_height):
        output_row = []
        for col in range(output_width):
            patch = [image_row[col:col + filter_size] for image_row in image[row:row + filter_size]]
            output_row.append(dot_product_2d(filter_weights, patch))
        output.append(output_row)
    return output
```

## What just happened

`output_height`/`output_width` shrink relative to the input — a 3×3 filter on
an 8×8 image can only be centered at 6×6 distinct positions before it runs
off the edge. This shrinkage is a genuine, well-known property of convolution
you'll see referenced as "valid" padding; real networks often pad the image
with zeros around the border specifically to avoid this shrinkage, but we'll
keep it simple here.

## Type this — Cell 3

Load a real digit image (from Lesson 13's dataset) and run your edge filter
across it:

```python
from sklearn.datasets import load_digits

digits = load_digits()
sample_image = digits.images[0].tolist()

edge_result = convolve(sample_image, edge_filter)
edge_result
```

## Type this — Cell 4

Visualize the original and the filtered result side by side:

```python
import matplotlib.pyplot as plt

fig, axes = plt.subplots(1, 2)
axes[0].imshow(sample_image, cmap="gray")
axes[0].set_title("original")
axes[1].imshow(edge_result, cmap="gray")
axes[1].set_title("vertical edges")
```

## What just happened

The right image should highlight vertical strokes of the digit more strongly
than horizontal ones — the filter is doing exactly what its numbers say:
reacting strongly where brightness changes sharply left-to-right, staying
near zero where the image is flat or where the edge runs the other direction.

## Type this — Cell 5 — now let PyTorch do it, and learn the filter

```python
import torch
import torch.nn as nn

conv_layer = nn.Conv2d(in_channels=1, out_channels=4, kernel_size=3)
```

`out_channels=4` means: don't use one filter, learn four separate ones
simultaneously — four different 3×3 weight sets, each starting random, each
free to specialize in detecting a different pattern once trained, via the
exact same backprop from Phase B.

```python
image_tensor = torch.tensor(sample_image).unsqueeze(0).unsqueeze(0).float()
conv_output = conv_layer(image_tensor)
conv_output.shape
```

`.unsqueeze(0)` twice adds two extra dimensions PyTorch expects (batch size,
then channel count) — your hand-written `convolve` skipped these since it
only ever handled one image, one filter, at a time.

## What just happened

`conv_output.shape` should show `4` output channels — one 6×6 result per
learned filter, same shrinkage math as your hand-written version, just four
filters computed at once instead of your single hand-picked `edge_filter`.
Crucially, `conv_layer`'s filter weights aren't fixed like yours were — they
start random and get trained by gradient descent exactly like every other
weight in this course, which means the network *discovers* useful filters
(edges, corners, textures) on its own rather than you hand-designing them.

## Checkpoint exercise

1. Design your own 3×3 filter by hand (e.g. a horizontal-edge detector — the
   transpose of `edge_filter`) and run it through your `convolve` function
   on the same digit image; compare the visualization against the vertical
   version.
2. Build a tiny CNN (`nn.Conv2d` followed by `nn.Flatten()` then
   `nn.Linear`) and train it on Lesson 13's 0-vs-1 digit task, comparing
   test accuracy against Lesson 13's plain `SimpleNetwork` on the identical
   held-out test set.
3. In your own words: why does reusing the same small filter across every
   position use *fewer* weights than Lesson 13's fully-connected approach
   (one weight per pixel per hidden neuron)? Tie the answer back to the
   filter's fixed 3×3=9-weight size versus 64 weights per neuron.

Next lesson: sequences — why a plain network (or even a CNN) can't naturally
handle order, and how a recurrent network's hidden state fixes that. Say
"next lesson" when ready.
