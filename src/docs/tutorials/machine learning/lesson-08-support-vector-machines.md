# Lesson 8 — Drawing the Line with the Widest Safety Margin: Support Vector Machines

## What you'll learn
- Among the many possible lines that could separate two classes, why one specific line — the one with the widest margin on both sides — is provably the safest choice for classifying points you haven't seen yet.
- A new kind of gradient: one that's exactly zero for most of your data, and nonzero only for a handful of points that actually matter. Those points have a name: support vectors.
- SVM's training loop turns out to be Lesson 1's exact gradient descent loop again — what changes is only which points get a say in the gradient at all.

## What you'll build
A linear support vector machine, trained from scratch via gradient descent on hinge loss, that classifies calls as "safe" or "risky" — and reveals, after training, that only a small handful of the original training points actually determined the boundary.

---

## The question

You have twelve calls, cleanly split into two groups by resource pressure:

| n | threads | risk |
|---|---|---|
| 1,000 | 1 | safe |
| 1,200 | 2 | safe |
| 1,500 | 1 | safe |
| 1,800 | 1 | safe |
| 2,000 | 2 | safe |
| 2,500 | 2 | safe |
| 20,000 | 8  | risky |
| 22,000 | 9  | risky |
| 24,000 | 10 | risky |
| 25,000 | 8  | risky |
| 27,000 | 9  | risky |
| 30,000 | 10 | risky |

Unlike Lesson 3's data, there's a huge, obvious gap between the two groups — **many different straight lines could separate them perfectly.** A line hugging close to the safe group would still classify all twelve points correctly. So would a line hugging close to the risky group. So would dozens of others in between. Logistic regression (Lesson 2) would find *some* separating line, but nothing about its training process specifically asks "which of the many valid lines is the best one?"

---

## 1. Predict

If your separating line sits very close to the safe cluster (barely on the risky side of them), and a brand-new "safe" call comes in that's *slightly* more resource-intensive than anything you've seen before, is that new point more or less likely to get misclassified compared to if your line had been drawn exactly in the middle of the gap?

---

## 2. Try it: measuring the margin, not just correctness

```python
import numpy as np

n = np.array([1000, 1200, 1500, 1800, 2000, 2500, 20000, 22000, 24000, 25000, 27000, 30000], dtype=float)
threads = np.array([1, 2, 1, 1, 2, 2, 8, 9, 10, 8, 9, 10], dtype=float)
risky = np.array([0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1], dtype=float)

X = np.column_stack([n, threads])
means, stds = X.mean(axis=0), X.std(axis=0)
X = (X - means) / stds

y = 2 * risky - 1   # convert 0/1 labels to -1/+1

def margin(w, b, X, y):
    return y * (X @ w + b)

w_guess = np.array([1.0, 1.0])
b_guess = 0.0
print(margin(w_guess, b_guess, X, y))
```

### What this code does

- **`y = 2 * risky - 1`** — arithmetic on an entire array at once: `0` becomes `2*0 - 1 = -1`, `1` becomes `2*1 - 1 = 1`. **Why SVM uses `-1`/`+1` instead of the `0`/`1` convention every earlier lesson used:** the margin formula below relies on multiplying the label directly into a sign — `-1`/`+1` makes "correctly classified" and "confidence of correctness" collapse into one clean multiplication, which wouldn't work the same way with `0`/`1` (multiplying by `0` would erase information rather than flip a sign).

- **`X = np.column_stack([n, threads])`** followed by **`X = (X - means) / stds`** — the same standardization from Lessons 6–7, now stored in a variable named `X` (a common convention for "the full feature matrix") rather than `points`, purely a naming choice reflecting that this is now feeding into a matrix formula rather than a list of individual points.

- **`X @ w`** — the **`@` operator** performs matrix-vector multiplication: for each row of `X` (a 2-element point), it computes the **dot product** with `w` (also 2 elements) — `n_scaled * w[0] + threads_scaled * w[1]` — and does this for all 12 rows at once, producing a 12-element result. This generalizes Lesson 1's `w * n + b` (one feature) to any number of features simultaneously, without writing a separate term for each one.

- **`y * (X @ w + b)`** — elementwise multiplication between the label array (`-1`/`+1`) and the raw linear score. If a point is correctly classified with a large positive score on the correct side, this product is a large positive number. If a point is on the *wrong* side, the label's sign flips the product negative — **this single number is called the point's margin**, and it directly measures both correctness (sign) and confidence (magnitude) in one value.

### What happens

With `w_guess = [1.0, 1.0]` and `b_guess = 0.0` (essentially guessing that a straight, unweighted average of standardized `n` and `threads` roughly separates the classes), the printed margins will likely all be positive — every point correctly classified — but with wildly different sizes: points deep inside the safe or risky clusters will have very large margins, while points near the actual gap will have smaller ones. **The size of the smallest margin, not just whether every point is positive, is what the rest of this lesson is about.**

---

## 3. Why: hinge loss makes confidently-correct points count for nothing

**The mechanism:** define "acceptable" as margin `≥ 1` — not just "correct," but "correct with at least a full unit of safety buffer." Any point with margin below `1` is penalized; any point at or above `1` is penalized **exactly zero**, no matter how far past `1` it is.

```python
def hinge_loss_and_gradient(w, b, X, y, lam):
    n_samples = len(y)
    margins = y * (X @ w + b)
    violating = margins < 1

    hinge = np.mean(np.maximum(0, 1 - margins))
    loss = 0.5 * lam * np.dot(w, w) + hinge

    grad_w = lam * w - (X[violating].T @ y[violating]) / n_samples
    grad_b = -np.sum(y[violating]) / n_samples
    return loss, grad_w, grad_b
```

### Code mechanics

- **`violating = margins < 1`** — a boolean mask flagging exactly the points that don't yet have a full safety margin. This is the single most important line in the function: everything downstream treats "violating" and "safely correct" points completely differently.

- **`np.maximum(0, 1 - margins)`** — elementwise: for a point with `margin = 1.5` (safely past the buffer), `1 - 1.5 = -0.5`, and `max(0, -0.5) = 0` — **zero penalty**. For a point with `margin = 0.3` (inside the buffer or on the wrong side), `1 - 0.3 = 0.7`, a real penalty proportional to how far inside the buffer it sits. This elementwise "clip negative values to zero" shape is exactly the ReLU function used throughout deep learning, appearing here for a different reason (loss shaping) rather than as a network activation.

- **`0.5 * lam * np.dot(w, w)`** — `np.dot(w, w)` is `w`'s dot product with itself, equal to the sum of its squared components — this is `||w||²`, a measure of how large the weight vector is. Added to the loss, scaled by `lam`, this discourages `w` from growing arbitrarily large — this term is what's directly responsible for preferring a *wide* margin rather than merely *some* separating line: mathematically, a smaller `||w||` for a fixed separation corresponds to a wider gap between the classes.

- **`X[violating]`** — boolean mask indexing on a 2D array (seen in Lesson 6): selects only the *rows* of `X` belonging to violating points — often a small handful, sometimes zero, out of the full training set.

- **`X[violating].T @ y[violating]`** — `.T` transposes `X[violating]` from shape `(num_violating, 2)` to `(2, num_violating)`, so the subsequent `@` (matrix-vector multiply against `y[violating]`, shape `(num_violating,)`) produces a 2-element result — one gradient contribution per feature, summed across only the violating points. **Points that aren't violating contribute nothing here at all** — they were excluded by the boolean mask before this line even runs.

- **`grad_b = -np.sum(y[violating]) / n_samples`** — similarly, only violating points' labels contribute to how `b` should move.

**This is the core conceptual payoff:** a point with margin comfortably above `1` produces `grad_w` contribution of exactly `0` and `grad_b` contribution of exactly `0` — it is **completely invisible** to the training process at that step, however correctly it's classified. Compare this to Lesson 2's logistic regression, where `error = p - exceeded` is essentially never *exactly* zero for any point, meaning every single point always nudges the gradient by at least a small amount, forever.

Now train it with the exact same loop shape as Lesson 1:

```python
w, b = np.zeros(2), 0.0
learning_rate = 0.05
lam = 0.01

for step in range(1000):
    loss, grad_w, grad_b = hinge_loss_and_gradient(w, b, X, y, lam)
    w -= learning_rate * grad_w
    b -= learning_rate * grad_b

final_margins = margin(w, b, X, y)
support_vectors = final_margins < 1.01
print(f"trained w={w}, b={b:.3f}")
print(f"support vectors (points that shaped the boundary): {np.sum(support_vectors)} out of {len(y)}")
```

- **`w, b = np.zeros(2), 0.0`** — `np.zeros(2)` creates a 2-element array of zeroes (one weight per feature), rather than a single scalar `0.0` as in Lesson 1 — reflecting that `w` is now a vector, not a single number, because there are two features.
- **`w -= learning_rate * grad_w`**, **`b -= learning_rate * grad_b`** — character-for-character the same update rule as Lesson 1's `w -= learning_rate * grad_w`, just operating on a vector instead of a scalar for `w`.
- **`support_vectors = final_margins < 1.01`** — a small tolerance above the exact boundary of `1`, used only for identifying which points ended up close enough to have actually influenced training (in practice, floating-point training rarely lands points at *exactly* `1.0`).

### Execution trace (conceptual, across training)

```
early in training: w, b are near zero, so most points have small or even
    negative margins → almost every point is "violating" → gradient is
    computed from nearly the whole dataset
        ↓
as training proceeds: w, b move toward separating the classes → points deep
    inside each cluster start crossing margin ≥ 1 → they DROP OUT of the
    gradient calculation entirely, one by one
        ↓
by the end: only a small number of points near the actual gap between
    clusters still have margin < 1 → only THOSE points still influence
    any further adjustment to w, b
```

### Mental model

```
score = w·x + b            (same linear score as every earlier lesson)
        ↓
margin = y * score          (positive means correct; size means confidence)
        ↓
margin ≥ 1 → this point contributes NOTHING to the gradient, ever again
margin < 1 → this point actively pulls w, b to fix it
        ↓
only the points still pulling at the end are the "support vectors" —
literally the points holding the boundary in place
```

---

## 4. Change one thing

Put Lesson 2's logistic regression gradient and this lesson's SVM gradient side by side — the contrast is the entire point of this lesson:

```diff
- error = p - exceeded                       # LOGISTIC REGRESSION (Lesson 2)
- grad_w = (2 / count) * np.sum(error * n)    # every point contributes, always

+ violating = margins < 1                     # SVM (this lesson)
+ grad_w = lam * w - (X[violating].T @ y[violating]) / n_samples   # only violating points contribute
```

**What changed:** logistic regression's gradient is built from `error` for **every** training point, computed from a smooth probability that's never exactly `0`. SVM's gradient is built **only** from points that fail to clear the margin — everything else is filtered out entirely before the gradient sum even happens.

**What did not change:** both are still `w -= learning_rate * grad_w`, both are still trying to find a linear boundary `w·x + b`, and both were derived by asking "which direction reduces this specific loss function."

**Why this distinction matters practically:** logistic regression's probability output keeps shifting, however slightly, in response to *every* data point, even ones classified with near-certainty — in large datasets, this means every point pulls on the boundary a little, forever. SVM's hinge loss deliberately creates a "dead zone" of exactly-zero influence for confidently-correct points, so the final boundary is determined by a small, identifiable subset of the data — the support vectors — a genuinely different notion of "which data matters."

---

## 5. Put it in the project

```python
def predict(w, b, query, means, stds):
    scaled = (query - means) / stds
    score = scaled @ w + b
    return 1 if score >= 0 else 0

test_cases = np.array([
    [3000, 2],
    [18000, 7],
    [2200, 1],
])
for case in test_cases:
    result = predict(w, b, case, means, stds)
    print(f"n={case[0]:>6} threads={case[1]:>2}  → {'RISKY' if result else 'safe'}")
```

### Code walkthrough

- **`predict(w, b, query, means, stds)`** — needs only `w`, `b`, and the training set's `means`/`stds` for scaling — **it does not need the original training data at all**. This is the direct opposite of Lesson 7's k-NN, where prediction *required* the entire stored training set every time. Here, training compressed 12 rows of data down into just 2 numbers (`w`) plus a bias (`b`) — prediction cost is now fixed, tiny, and completely independent of how large the original training set was, exactly the property Lesson 7's trap identified as missing from k-NN.

### Why this design: choosing lam (the margin/fit tradeoff)

**Problem:** `lam=0.01` controls how strongly the `0.5 * lam * ||w||²` term discourages a large `w`.

**Available choices:** a larger `lam` (stronger preference for a wide margin, more tolerant of a few points sitting inside the buffer), a smaller `lam` (prioritizes fitting the training data as tightly as possible, narrower margin), or `lam` chosen via validation on held-out data.

**Selected choice (here):** a small-to-moderate `lam`, appropriate because this dataset has a large, unambiguous gap between classes — there's little tension between "wide margin" and "correctly classify everything" when the classes are this well-separated.

**Cost:** with messier, less clearly separated real data, increasing `lam` trades away some training accuracy in exchange for a boundary that's less sensitive to any single point — the same bias/variance shape that's appeared under different names in every previous lesson (max_depth, num_rounds, learning_rate, k).

**Revisit condition:** if the margin ends up extremely narrow (support vectors sitting almost exactly on top of each other from opposite classes), or if the model performs noticeably worse on new data than on training data, increasing `lam` is the standard first thing to try.

---

## 6. The trap

**Normal rule:** hinge loss training should be able to drive most points comfortably past margin `1`, given enough gradient descent steps, whenever the classes are genuinely separable by a straight line.

**Apparently identical setup, applied to different data** — reuse the exact same `hinge_loss_and_gradient` and training loop, but on Lesson 3's original interleaved data instead of this lesson's cleanly-separated data:

```python
n2 = np.array([1000, 3000, 6000, 8000, 10000, 15000, 20000, 22000, 27000, 30000, 35000, 40000], dtype=float)
threads2 = np.array([1, 2, 10, 1, 9, 2, 1, 10, 1, 3, 12, 2], dtype=float)
exceeded2 = np.array([0, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1], dtype=float)

X2 = np.column_stack([n2, threads2])
means2, stds2 = X2.mean(axis=0), X2.std(axis=0)
X2 = (X2 - means2) / stds2
y2 = 2 * exceeded2 - 1

w2, b2 = np.zeros(2), 0.0
for step in range(1000):
    loss, grad_w, grad_b = hinge_loss_and_gradient(w2, b2, X2, y2, lam=0.01)
    w2 -= 0.05 * grad_w
    b2 -= 0.05 * grad_b
    if step % 200 == 0:
        print(f"step {step:>4}  loss={loss:.3f}  violating points: {np.sum(margin(w2, b2, X2, y2) < 1)}")
```

**Surprising result:** unlike this lesson's main dataset, `loss` here stops improving after some point and **plateaus at a nonzero value** — the printed count of violating points never reaches `0`, no matter how many additional steps you run. Recall from Lesson 3: rows with `n=6000` (exceeded) and `n=8000` (not exceeded) and `n=10000` (exceeded) genuinely cannot be separated by a single straight line, no matter how it's oriented.

**Exact reason:** hinge loss is built entirely around the assumption that a linear boundary *can* achieve margin `≥ 1` for every point, given the right `w` and `b`. When the data isn't linearly separable, there is no `w`, `b` that satisfies this for all points — some points are mathematically guaranteed to keep violating the margin forever, regardless of how long training runs, because the underlying pattern (Lesson 3's OR-of-AND rule) simply isn't expressible as `w·x + b ≥ some threshold`.

**Project consequence:** plain linear SVM inherits **the exact same fundamental limitation as logistic regression** (Lesson 2) — both draw one straight decision boundary, and both are structurally unable to represent patterns that require more than one straight cut. A persistently nonzero, plateaued loss and a persistently nonzero count of violating points — even after far more training steps than usual — is a real, checkable symptom telling you "this data may not be linearly separable," not "training needs more iterations."

---

## 7. Under the hood

*(Optional — not required to train or use a linear SVM correctly.)*

The standard fix for non-linearly-separable data isn't to abandon SVM — it's the **kernel trick**: instead of computing `w·x` directly in the original feature space, you compute a similarity function between pairs of points that behaves *as if* the data had been transformed into a much higher-dimensional space where a straight boundary genuinely could separate it — without ever explicitly constructing that higher-dimensional representation, which would often be computationally prohibitive. Real SVM implementations (like scikit-learn's `SVC`) also don't typically train via plain gradient descent on hinge loss the way this lesson did — they solve an equivalent quadratic programming problem directly, which converges more precisely and is where the term "support vector machine" solvers usually come from historically. This lesson's gradient-descent version is mathematically a valid, if less standard, way to arrive at approximately the same boundary, chosen here specifically because it reuses the exact training loop from every earlier lesson in this series.

---

## 8. Exercises

- **Predict:** if you increased `lam` from `0.01` to `1.0` on the main (separable) dataset, would you expect the number of support vectors at the end of training to increase or decrease? Reason from what a larger `lam` does to how strongly a wide margin is preferred over exactly fitting every point.
- **Modify:** after training on the main dataset, print each point's final margin alongside its `n` and `threads` values, sorted from smallest margin to largest. Confirm that the points with the smallest margins are exactly the ones closest to the gap between the safe and risky clusters in the original table.
- **Break:** on the main (separable) dataset, set `lam = 0` (no regularization term at all) and observe whether `w` grows without bound as training continues. Explain, referencing the loss formula, why removing `lam` removes any incentive to keep `w` small once every point already clears margin `1`.
- **Trace:** for a single point with `margin = 0.95` right before a gradient step, and the exact same point recomputed with `margin = 1.05` right after, walk through which branch of `violating = margins < 1` it falls into in each case, and explain the exact moment during training when this specific point would have stopped contributing to `grad_w`.

---

## What to remember

- Among many valid separating lines, SVM specifically seeks the one with the widest margin, by penalizing `||w||` directly alongside classification error — margin width isn't a side effect, it's built into the loss function on purpose.
- Hinge loss creates a hard cutoff: points classified with enough confidence contribute exactly zero to the gradient, permanently, once they cross margin `1` — the final boundary is determined only by the "support vectors" still violating that margin.
- A plain linear SVM has the identical blind spot as logistic regression — data that isn't linearly separable will show up as a loss that plateaus above zero and a support-vector count that never reaches zero, no matter how long you train.

## Next lesson

Every algorithm so far has drawn some kind of geometric boundary, or measured distance directly between points. There's a completely different family of methods that skips geometry entirely and asks a probability question straight out of counting: "given everything I've seen, how likely is each outcome?" That's Naive Bayes — and it will feel closer to basic statistics than to anything built so far in this series.
