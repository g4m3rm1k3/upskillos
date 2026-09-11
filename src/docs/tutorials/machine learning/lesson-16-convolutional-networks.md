# Lesson 16 — Same Filter, Every Position: Convolutional Networks

## What you'll learn
- Why a fully-connected layer is a poor fit for image-like data: it assigns a completely separate weight to every input position, forcing the network to re-learn the same pattern independently for every location it might appear in.
- The convolution operation: sliding one small, **reused** filter across an entire input, producing a feature map that lights up specifically where a pattern appears.
- A genuinely common, concrete bug: stacking convolutional layers without accounting for how much each one shrinks the input — a mistake that turns into a real, hard error, not a subtle accuracy problem.

## What you'll build
An edge detector, built from scratch with a 3×3 filter — just 9 numbers total — that locates a vertical edge in a small synthetic image, and correctly reports "nothing here" when pointed at a pattern it wasn't designed to find.

---

## The question

Imagine a modest 28×28 image feeding into a fully-connected hidden layer of just 100 neurons, the way every earlier lesson's networks connected every input to every neuron. That's `28 × 28 × 100 = 78,400` weights, for one single layer, on a genuinely small image. Real images are far larger, and this doesn't even address a deeper problem: if that fully-connected layer learns to recognize an edge sitting in the top-left corner, does it have any built-in reason to also recognize the exact same edge if it instead appears in the bottom-right corner?

---

## 1. Predict

A fully-connected hidden neuron has its own separate weight for every single input pixel. If that neuron's weights happen to line up with "there's a bright-to-dark transition in the top-left corner," and the same transition later shows up in the bottom-right corner of a different image, does that neuron have any mechanism for recognizing it there too? What would need to be true of the weights for position to stop mattering?

---

## 2. Try it: one patch, one dot product

```python
import numpy as np

image = np.zeros((8, 8))
image[:, 4:] = 10.0   # left half dark (0), right half bright (10) — a clean vertical edge at column 4

kernel = np.array([
    [1, 0, -1],
    [1, 0, -1],
    [1, 0, -1],
], dtype=float)

patch = image[0:3, 2:5]
print(patch)
print(np.sum(patch * kernel))
```

### What this code does

- **`image[:, 4:] = 10.0`** — slice assignment: every row, columns `4` onward, set to `10.0` — the rest stays at the `0.0` from `np.zeros`. This creates one clean vertical edge, right at column `4`, and nothing else.

- **`kernel = np.array([[1, 0, -1], [1, 0, -1], [1, 0, -1]])`** — a hand-designed **vertical edge detector**: it looks at three columns at once, and computes "left column's brightness minus right column's brightness" (weight `1` on the left, `-1` on the right), repeated across all three rows. A region that's *uniformly* bright or dark contributes close to nothing; a region that transitions from dark to bright contributes a large value.

- **`patch = image[0:3, 2:5]`** — a 3×3 slice of the image: rows `0` through `2`, columns `2` through `4`. This particular patch straddles the edge (columns `2`, `3` are dark; column `4` is bright).

- **`np.sum(patch * kernel)`** — elementwise multiplication between the `3×3` patch and the `3×3` kernel, then summed into a single number — a **dot product** between two flattened `3×3` grids. This one number is the filter's entire "opinion" about this one specific patch.

### What happens

`patch` prints as `[[0, 0, 10], [0, 0, 10], [0, 0, 10]]`. The dot product with `kernel` works out to exactly `-30`: each row contributes `0·1 + 0·0 + 10·(-1) = -10`, and three identical rows sum to `-30`. **This single number is the entire output of applying this filter at this one position.** The rest of this lesson is about doing this same tiny computation at every possible position across the image, automatically.

---

## 3. Why: slide the same 9 numbers everywhere

**The mechanism:** repeat Section 2's one-patch computation at *every* valid position in the image, sliding the same, unchanged kernel across it, producing one output value per position — a full grid called a **feature map**.

```python
def convolve2d(image, kernel):
    kh, kw = kernel.shape
    ih, iw = image.shape
    oh, ow = ih - kh + 1, iw - kw + 1
    output = np.zeros((oh, ow))
    for i in range(oh):
        for j in range(ow):
            patch = image[i:i+kh, j:j+kw]
            output[i, j] = np.sum(patch * kernel)
    return output

feature_map = convolve2d(image, kernel)
print(feature_map[0])
```

### Code mechanics

- **`kh, kw = kernel.shape`** — unpacking a 2D array's `.shape` tuple directly into two names — here, both `3`, since the kernel is `3×3`.

- **`oh, ow = ih - kh + 1, iw - kw + 1`** — the output is **smaller** than the input, by exactly `kh - 1` in height and `kw - 1` in width. With an `8×8` image and a `3×3` kernel, that's `8 - 3 + 1 = 6` in each dimension — a `6×6` output. This shrinkage isn't a bug; it's a direct, unavoidable consequence of a `3×3` window only having room to slide to `6` distinct positions across an `8`-wide row (positions starting at column `0` through column `5` — column `6` would need columns `6, 7, 8`, and there's no column `8`).

- **`for i in range(oh): for j in range(ow):`** — a nested loop over every valid output position — for a `6×6` output, `36` total positions, `36` total `patch * kernel` computations.

- **`patch = image[i:i+kh, j:j+kw]`** — a fresh `3×3` slice for each `(i, j)`, shifted by exactly one row or column from its neighbors — the "sliding window."

- **`output[i, j] = np.sum(patch * kernel)`** — exactly Section 2's computation, repeated automatically at every position, using the **exact same 9 kernel values** every single time. **This reuse is the entire point.** A fully-connected layer would need a separate weight for every one of the `36` output positions times every one of the `64` input pixels it could connect to; this convolution needs exactly `9` numbers, used `36` times each.

### What happens

`feature_map[0]` (the first row of the output) prints `[0, 0, -30, -30, 0, 0]` — **exactly zero** everywhere the patch sat entirely within one uniform region (all-dark or all-bright), and a strong `-30` exactly at the two positions straddling the true edge. Every other row will print identically, since the original image was the same in every row. **The feature map lights up precisely where the pattern the kernel was built to detect actually occurs, and stays silent everywhere else** — this is the direct payoff of the filter, not an incidental side effect.

### Mental model

```
ONE small kernel (here, 9 numbers)
        ↓
slide it across EVERY position in the input, computing one dot product
    per position — the SAME 9 numbers, never changing based on WHERE
    in the image you currently are
        ↓
feature map: large values exactly where the kernel's pattern occurs,
    near-zero everywhere else
        ↓
a pattern learned once (in the kernel) is automatically detected at
    EVERY position — no separate weights needed per location
```

---

## 4. Change one thing

Swap out the 9 numbers inside the kernel, and leave the sliding mechanism completely untouched:

```diff
- kernel = np.array([[1, 0, -1],
-                     [1, 0, -1],
-                     [1, 0, -1]])   # vertical edge detector
+ kernel = np.array([[1,  1,  1],
+                     [0,  0,  0],
+                     [-1, -1, -1]])  # horizontal edge detector
```

```python
horizontal_kernel = np.array([
    [1, 1, 1],
    [0, 0, 0],
    [-1, -1, -1],
], dtype=float)

horizontal_map = convolve2d(image, horizontal_kernel)
print(horizontal_map[0])
```

**What changed:** which 9 numbers sit inside the kernel — this one compares the top row of a patch against the bottom row, instead of comparing the left column against the right column.

**What did not change:** `convolve2d` itself — not one line of the sliding, slicing, or summing logic was touched.

**What this reveals:** `horizontal_map` prints all zeros, every position — because this image has **no horizontal edges at all** (every row is identical to the one above and below it); the horizontal kernel correctly reports "nothing here," which is exactly the right answer, not a failure. **Which pattern a convolution detects is determined entirely by the numbers inside the kernel — the sliding, dot-product mechanism itself is completely generic and pattern-agnostic.** This mirrors Lesson 14's observation that swapping an activation function was a one-line change to *what* gets computed, without touching *how* the surrounding loop works — here, swapping a kernel is the same kind of change, one level earlier in the pipeline.

---

## 5. Put it in the project

```python
def max_pool(feature_map, size=2):
    h, w = feature_map.shape
    oh, ow = h // size, w // size
    pooled = np.zeros((oh, ow))
    for i in range(oh):
        for j in range(ow):
            window = feature_map[i*size:(i+1)*size, j*size:(j+1)*size]
            pooled[i, j] = np.max(window)
    return pooled

vertical_map = convolve2d(image, kernel)
pooled = max_pool(vertical_map, size=2)
print(f"feature map shape: {vertical_map.shape}  →  pooled shape: {pooled.shape}")
print(pooled[0])
```

### Code walkthrough

- **`h // size, w // size`** — integer division: for a `6×6` feature map with `size=2`, this gives `3×3` — pooling reduces the spatial size by a fixed factor, independent of any learned weights at all.
- **`window = feature_map[i*size:(i+1)*size, j*size:(j+1)*size]`** — a **non-overlapping** `2×2` window this time (unlike convolution's overlapping slide), stepping by the full window size each time rather than by `1`.
- **`np.max(window)`** — keeps only the strongest response in each small region, discarding the rest — a deliberate, lossy compression that keeps "was this pattern present somewhere around here" while discarding exactly where within that small region it was.

Applying **two different kernels** to the same image, as in Section 4, and stacking their two resulting feature maps together is exactly what a real convolutional layer's multiple "channels" are — one learned filter per channel, each producing its own feature map, all computed from the same input.

### Why this design: choosing kernel size and number of filters

**Problem:** this lesson used one `3×3` kernel, then a second `3×3` kernel. Real networks use many more.

**Available choices:** a small kernel (`3×3`, seeing only a narrow local neighborhood per position) versus a larger one (`5×5` or more, seeing a wider neighborhood but needing more parameters — `25` instead of `9`); few filters per layer versus many.

**Selected choice:** small kernels (`3×3`), commonly stacked in multiple layers rather than using one large kernel — this is also the modern convention in real architectures.

**Reason:** a `3×3` kernel keeps the parameter count per filter tiny regardless of image size, and stacking several small-kernel layers can, layer by layer, build up sensitivity to a wider effective region of the original image without ever needing a single enormous kernel.

**Cost:** more filters per layer means more feature maps to compute and store, directly increasing computation; very small kernels alone (one single layer) can only "see" a very local neighborhood, which is exactly why they're normally stacked in multiple layers rather than used just once.

**Revisit condition:** if a task depends on very large-scale structure (patterns spanning most of the image at once), stacking enough small-kernel layers to build up that range of view — or using a larger kernel directly — becomes necessary.

---

## 6. The trap

**Normal rule:** a single convolution is a well-defined operation, producing a slightly smaller but perfectly valid output.

**Apparently reasonable extension** — real CNNs stack many convolutional layers; try doing that directly, applying the *same* unpadded `3×3` kernel repeatedly to the output of the previous layer:

```python
current = image
for layer in range(4):
    print(f"before layer {layer}: shape = {current.shape}")
    current = convolve2d(current, kernel)
```

**Surprising result:** the printed shapes shrink `8×8 → 6×6 → 4×4 → 2×2`, and the fourth call — applying a `3×3` kernel to a `2×2` input — either raises an outright error or produces a nonsensical, empty (`0×0` or negative-dimension) result, depending on how strictly the surrounding code checks shapes. **A perfectly reasonable-looking loop, extending a well-defined single operation, becomes literally impossible to execute after only a few repetitions.**

**Exact reason:** each unpadded `k×k` convolution shrinks every spatial dimension by exactly `k - 1` (established in Section 3: `oh = ih - kh + 1`). Stacking `L` such layers shrinks the total dimension by `L × (k - 1)` — for `3×3` kernels, that's `2` per layer. An `8×8` starting image can only tolerate `4` such layers before hitting `0`, and the *fifth* would require computing a `3×3` window inside a nonexistent negative-sized input. Real images and real networks are usually much larger than this lesson's toy `8×8` example, but the identical arithmetic applies at any scale — it's purely a matter of how many layers before the same wall gets hit.

**Project consequence:** this is a genuinely common, concrete bug in real CNN code — not a rare edge case, but the direct, predictable result of stacking convolutional layers without accounting for cumulative shrinkage. The standard fix is **padding**: adding a border of zeros around the input before convolving, specifically sized so the output matches the input's original spatial dimensions (or shrinks by a deliberately chosen, controlled amount) — turning an accidental, compounding side effect into a dimension you explicitly control layer by layer.

---

## 7. Under the hood

*(Optional — not required to use convolution correctly.)*

Mathematically, "true" convolution flips the kernel before sliding it (a distinction from what's sometimes called **cross-correlation**, which is what this lesson actually implemented — patches multiplied directly against the kernel, unflipped). In practice, essentially every deep learning framework calls this operation "convolution" regardless, since flipping the kernel or not makes no practical difference to what a network can learn — the kernel's values are learned from data either way, so which specific arrangement of numbers it ends up with is somewhat arbitrary. Also worth knowing: this lesson's kernels were hand-designed to demonstrate what a filter *can* detect — in a real, trainable convolutional layer, filter values start random (exactly like Lesson 13's weight matrices) and are learned via the same backpropagation mechanism from that lesson, just applied through the sliding-window structure: the gradient with respect to each of the kernel's 9 values is accumulated across *every* position the kernel was applied to, since the same 9 numbers were reused everywhere during the forward pass.

---

## 8. Exercises

- **Predict:** if you built a diagonal-edge kernel (something like `[[2, 1, 0], [1, 0, -1], [0, -1, -2]]`) and applied it to this lesson's purely vertical-edge image, would you expect a strong response, a weak response, or exactly zero? Reason from what pattern this kernel is actually built to detect.
- **Modify:** change `image` to have the edge at column `2` instead of column `4` (`image[:, 2:] = 10.0`), and confirm the vertical-edge feature map's strong response shifts to match — the *same* kernel, unmodified, correctly finds the edge wherever it now is.
- **Break:** using the loop from Section 6, change the kernel to `1×1` instead of `3×3` and see how many layers it takes before the shape becomes invalid. Explain, using the `oh = ih - kh + 1` formula, why a `1×1` kernel never shrinks the input at all — and what that implies about the *smallest* kernel size for which this trap can even occur.
- **Repair:** implement zero-padding by hand: before calling `convolve2d`, create a new array one row and one column larger on each side (`np.zeros((h+2, w+2))`), copy the original image into the center of it, and confirm that convolving the padded version with a `3×3` kernel now produces an output the *same* size as the original, unpadded image.

---

## What to remember

- A fully-connected layer assigns a completely separate weight to every input position; convolution reuses the exact same small set of weights at every position, which is both far more parameter-efficient and automatically detects a pattern regardless of where it appears.
- A feature map's values directly reflect how strongly a specific kernel's pattern matches at each position — large where the pattern occurs, near-zero elsewhere — and swapping which pattern gets detected is purely a matter of changing the numbers inside the kernel, not the surrounding sliding mechanism.
- Unpadded convolution shrinks spatial dimensions by a fixed amount every layer; stacking several such layers without padding is a real, common bug that turns a perfectly valid single operation into a literal impossibility after just a few repetitions.

## Next lesson

Convolutions are built for spatial structure — neighborhoods in a grid, where nearby elements are related regardless of exact position. Some data has a fundamentally different structure instead: sequential dependence, where each element depends specifically on what came *before* it — a sentence, a time series, a sequence of log events. That needs a different kind of memory built into the network itself — recurrent neural networks, next.
