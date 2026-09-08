# Lesson 10 — Compressing What Actually Varies: PCA

## What you'll learn
- A new proxy for "information": not correctness against a label, not distance to a neighbor, but **variance** — how spread out the data is.
- A genuinely new piece of math for this series: eigenvectors and eigenvalues, and what they concretely mean as "directions" and "amounts" of variance.
- A sharp, important limitation: PCA never looks at labels at all — and the direction it considers most important can be completely useless for the classification problem you actually care about.

## What you'll build
A from-scratch PCA that takes two highly redundant measurements — input size and memory usage — and compresses them into a single number that captures almost all the original information.

---

## The question

You're logging two numbers per call: `n` (input size) and `memory_kb` (peak memory used). They're not independent — memory usage scales almost linearly with input size:

| n | memory_kb |
|---|---|
| 1,000  | 52   |
| 3,000  | 148  |
| 6,000  | 305  |
| 9,000  | 447  |
| 12,000 | 603  |
| 15,000 | 755  |
| 20,000 | 995  |
| 25,000 | 1253 |
| 30,000 | 1497 |
| 35,000 | 1754 |

Storing, plotting, or feeding both numbers into a downstream model means carrying two columns of data that mostly say the same thing. If you had to summarize each row with **one** number instead of two, while losing as little information as possible, what number would you use?

---

## 1. Predict

If you plotted `n` against `memory_kb` as a scatter plot, would the points look like a wide, round cloud, or would they look almost like a single straight line? What does "almost like a single straight line" suggest about how much genuinely *new* information `memory_kb` adds once you already know `n`?

---

## 2. Try it: variance along the original axes isn't the whole story

```python
import numpy as np

n = np.array([1000, 3000, 6000, 9000, 12000, 15000, 20000, 25000, 30000, 35000], dtype=float)
memory_kb = np.array([52, 148, 305, 447, 603, 755, 995, 1253, 1497, 1754], dtype=float)

X = np.column_stack([n, memory_kb])
mean = X.mean(axis=0)
X_centered = X - mean

print(f"variance along n axis alone:         {np.var(X_centered[:, 0]):,.1f}")
print(f"variance along memory_kb axis alone: {np.var(X_centered[:, 1]):,.1f}")
```

### What this code does

- **`mean = X.mean(axis=0)`** — as in Lesson 6, `axis=0` averages down each column, producing a 2-element vector: the average `n` and the average `memory_kb`.

- **`X_centered = X - mean`** — subtracting the mean from every row shifts the data so it's centered on the origin `(0, 0)`, without changing its *shape* at all — this is called **centering**, and it's a required first step for PCA (the math below only makes sense relative to the data's own center, not its raw position in space).

- **`np.var(X_centered[:, 0])`** — `X_centered[:, 0]` selects the first column (all rows, column index `0`) — this is `n`'s values, centered. `np.var` computes the variance: the average squared distance from the mean, a direct numeric measure of "how spread out" this one column is on its own.

### What happens

Both printed variances will be large — `n` ranges over tens of thousands, `memory_kb` over hundreds to thousands — but neither number, by itself, tells you how the *two columns move together*. What you actually want to know is: is there some **single direction** — not necessarily lined up with either the `n` axis or the `memory_kb` axis — along which the data varies even *more* than it does along either original axis alone? That direction is what PCA finds.

---

## 3. Why: the direction of maximum spread

**The mechanism:** compute the **covariance matrix** (a table describing not just each feature's own spread, but how every pair of features varies *together*), then find its **eigenvectors** — directions in space that the covariance matrix doesn't rotate, only stretches — and its **eigenvalues** — exactly how much stretching happens along each of those directions. The eigenvector with the largest eigenvalue is, by construction, the single direction along which the data has the most variance.

```python
cov_matrix = np.cov(X_centered, rowvar=False)
eigenvalues, eigenvectors = np.linalg.eigh(cov_matrix)

order = np.argsort(eigenvalues)[::-1]
eigenvalues = eigenvalues[order]
eigenvectors = eigenvectors[:, order]

explained_ratio = eigenvalues / np.sum(eigenvalues)
print(f"eigenvalues (sorted): {eigenvalues}")
print(f"explained variance ratio: {explained_ratio}")

k = 1
principal_components = eigenvectors[:, :k]
X_reduced = X_centered @ principal_components
print(X_reduced[:5])
```

### Code mechanics

- **`np.cov(X_centered, rowvar=False)`** — computes the covariance matrix. **`rowvar=False`** tells NumPy that each *column* is a variable (`n`, `memory_kb`) and each *row* is an observation — the opposite of NumPy's historical default, which assumes rows are variables. Getting this backwards silently computes covariance between *calls* instead of between *features*, producing a matrix of the wrong shape entirely. The result here is a `2×2` matrix: the diagonal holds each feature's own variance (matching Section 2's numbers), and the off-diagonal holds how strongly `n` and `memory_kb` vary *together* — a large positive off-diagonal value confirms what the scatter plot in Section 1 suggested.

- **`np.linalg.eigh(cov_matrix)`** — `eigh` (as opposed to plain `eig`) is specifically for **symmetric** matrices, which every covariance matrix always is; it's more numerically stable and guarantees real (not complex) eigenvalues, which a general-purpose eigenvalue solver wouldn't guarantee. It returns `eigenvalues` (a 1D array) and `eigenvectors` (a 2D array where **each column** — not each row — is one eigenvector), sorted in **ascending** order by default.

- **`order = np.argsort(eigenvalues)[::-1]`** — `argsort` gives ascending order (as always); `[::-1]` is Python slice notation for "reverse the sequence," flipping ascending into descending — needed because you want the *largest*-variance direction first.

- **`eigenvectors[:, order]`** — reorders the *columns* of `eigenvectors` to match the new descending order — reordering columns, not rows, because each column is one complete eigenvector.

- **`explained_ratio = eigenvalues / np.sum(eigenvalues)`** — what fraction of the *total* variance in the data each eigenvector accounts for. For this dataset, expect the first value to be extremely close to `1.0` (something like `0.999`) — nearly all the spread in the data lies along a single direction, exactly matching the "almost a straight line" observation from Section 1.

- **`principal_components = eigenvectors[:, :k]`** — slicing to keep only the first `k` columns (eigenvectors), discarding the rest. With `k=1`, this keeps only the single highest-variance direction.

- **`X_reduced = X_centered @ principal_components`** — matrix multiplication (as in Lesson 8) projects every centered data point onto the kept direction(s), producing a `(10, 1)` result — **one number per original row**, replacing the original two columns.

### Execution trace

```
1. center the data (subtract the mean from every point)
2. compute the covariance matrix — how features vary together, not just individually
3. eigendecompose it — get candidate directions (eigenvectors) and how much
   variance lies along each (eigenvalues)
4. sort directions from most to least variance explained
5. keep only the top k directions
6. project every original point onto just those k directions
        ↓
each original point, originally 2 numbers, is now represented by k numbers,
losing only whatever variance lived in the discarded directions
```

### Mental model

```
original features           →    principal components
(may be redundant,                (ranked by how much
 correlated, hard to                spread/information
 summarize)                         they capture)
        ↓
keep only the top few components
        ↓
compressed representation, with a KNOWN, QUANTIFIED amount of
information (variance) discarded — not a guess
```

---

## 4. Change one thing

Here's the exact difference between compression and a lossless operation, isolated:

```diff
- k = 1
+ k = 2
  principal_components = eigenvectors[:, :k]
  X_reduced = X_centered @ principal_components
```

**What changed:** how many of the two available eigenvectors are kept.

**What did not change:** the covariance matrix, the eigendecomposition, and the sort order are computed identically either way — `k` only affects the final slicing step.

**What this reveals:** with `k=2` (all available components kept), `X_reduced` isn't a compression at all — it's the *same* information, just rotated into a new coordinate system aligned with the directions of maximum and minimum variance. You can reconstruct the original data *exactly* from a `k=2` reduction (up to floating-point precision) by multiplying back through `principal_components.T` and adding the mean back. With `k=1`, reconstruction is only **approximate** — you've genuinely thrown away whatever variance lived along the second eigenvector, and that loss is exactly `explained_ratio[1]` of the total original variance, a number you can check precisely rather than needing to guess at.

---

## 5. Put it in the project

```python
def reconstruct(X_reduced, principal_components, mean):
    return X_reduced @ principal_components.T + mean

X_approx = reconstruct(X_reduced, principal_components, mean)
reconstruction_error = np.mean((X - X_approx) ** 2)
print(f"average squared reconstruction error: {reconstruction_error:.4f}")
print(f"original n=20000, memory=995   →  reconstructed: {X_approx[6]}")
```

### Code walkthrough

- **`X_reduced @ principal_components.T`** — the reverse of the projection step: multiplying the compressed `(10, 1)` representation by the *transpose* of the kept eigenvector(s) maps back into the original 2D space — approximately, since only `k=1` of the 2 available directions was kept.
- **`+ mean`** — undoes the centering from Section 2, shifting the reconstructed points back to the original scale.
- **`reconstruction_error`** — for this dataset, expect this to be very small relative to the original values' scale, confirming numerically (not just via `explained_ratio`) that almost nothing was lost by keeping only one dimension.

### Why this design: choosing k

**Problem:** `k=1` was chosen for this 2-feature example, but with more original features, how many components should you keep?

**Available choices:** a fixed, small `k` chosen by inspection (fine for 2 features, impractical for hundreds), or a `k` chosen by a **variance-explained threshold** — keep adding components, in order, until the cumulative `explained_ratio` crosses some target, commonly `95%` or `99%`.

**Selected choice:** for this dataset, `k=1` already captures over `99%` of the variance, so a `95%` threshold would select `k=1` automatically without needing to hand-pick it.

**Cost:** a higher threshold (say, `99.9%`) keeps more components, preserving more information but compressing less — there's a direct, explicit tradeoff between how much you shrink the data and how much variance you're willing to discard, and — unlike some earlier lessons' tradeoffs — you can read the exact number off `explained_ratio` rather than estimating it.

**Revisit condition:** if reconstruction error (Section 5) or downstream model performance degrades noticeably after reducing dimensions, the threshold was probably too aggressive — raise it and keep more components.

---

## 6. The trap

**Normal rule:** keeping the highest-variance direction(s) should preserve "the most important information" in the data.

**Apparently reasonable application** — a genuinely two-class dataset, where one feature has enormous variance and the other has tiny variance:

```python
feature1 = np.array([100, -80, 60, -120, 90, -70, 110, -95], dtype=float)
feature2 = np.array([-0.5, -0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5], dtype=float)
class_label = np.array([0, 0, 0, 0, 1, 1, 1, 1])

X2 = np.column_stack([feature1, feature2])
mean2 = X2.mean(axis=0)
X2_centered = X2 - mean2

cov2 = np.cov(X2_centered, rowvar=False)
eigenvalues2, eigenvectors2 = np.linalg.eigh(cov2)
order2 = np.argsort(eigenvalues2)[::-1]
eigenvalues2, eigenvectors2 = eigenvalues2[order2], eigenvectors2[:, order2]

pc1 = eigenvectors2[:, :1]
X2_reduced = X2_centered @ pc1
print(f"explained variance ratio: {eigenvalues2 / np.sum(eigenvalues2)}")
print(f"PC1 values by class 0: {X2_reduced[class_label == 0].ravel()}")
print(f"PC1 values by class 1: {X2_reduced[class_label == 1].ravel()}")
```

**Surprising result:** `explained_ratio` shows PC1 capturing nearly all the variance (`feature1`'s huge spread dominates), exactly as PCA is supposed to work. But printing `X2_reduced` split by class reveals the two classes' PC1 values are **completely intermixed** — there's no threshold on PC1 alone that separates class `0` from class `1`. And yet the *original* 2D data was perfectly, trivially separable: `feature2 < 0` is always class `0`, `feature2 > 0` is always class `1`.

**Exact reason:** PCA's entire selection criterion is variance in the feature space — it has **no knowledge of `class_label` whatsoever**, because PCA is unsupervised, just like Lesson 6's k-means. `feature1` happens to have large variance purely because of its numeric scale, and that variance is completely uncorrelated with the class label — it's essentially noise, as far as the classification problem is concerned. `feature2` has tiny variance in absolute terms, but that tiny variance happens to be *exactly* the information that determines the class. PCA, following its actual objective (maximize captured variance) faithfully, keeps the large-but-irrelevant direction and discards the small-but-essential one.

**Project consequence:** running PCA before a classifier, purely as a standard preprocessing step, can silently destroy your ability to classify — this is a real, well-documented failure mode, not a contrived edge case. PCA answers "which directions vary the most," which is a fundamentally different question from "which directions predict the label" — never assume the two coincide, and be especially cautious applying PCA before a supervised model when some features might have small but label-critical variance sitting alongside larger but label-irrelevant variance.

---

## 7. Under the hood

*(Optional — not required to use PCA correctly.)*

Real implementations (like scikit-learn's `PCA`) typically don't compute the covariance matrix and eigendecompose it the way this lesson did — they apply a related technique called **singular value decomposition (SVD)** directly to the centered data matrix, which is more numerically stable, especially when the number of features is large relative to the number of samples (a case where computing the covariance matrix explicitly can lose precision). The results are mathematically equivalent to what this lesson computed; the eigendecomposition route was used here because it connects more directly to "variance along a direction," which is the core intuition worth understanding first. Also worth remembering from Lessons 6–8: if your original features are on very different numeric scales (not the case in this lesson's `n`/`memory_kb` example, which happen to be roughly comparable), standardizing before computing the covariance matrix is usually necessary — otherwise the largest-scale feature can dominate the "variance" calculation for reasons having nothing to do with genuine informativeness, a distinct but related issue to this lesson's Section 6 trap.

---

## 8. Exercises

- **Predict:** if you added a third feature to the original `n`/`memory_kb` dataset that was pure random noise, uncorrelated with everything else, would you expect `explained_ratio`'s first value to go up, go down, or stay about the same? Reason about what adding an unrelated dimension does to the total variance being divided into.
- **Modify:** compute `explained_ratio`'s *cumulative* sum (`np.cumsum(explained_ratio)`) for the Section 6 trap dataset, and identify the smallest `k` needed to cross a `99.9%` threshold. Confirm it requires keeping *both* components, not just one — despite PC1 alone already exceeding `99%`.
- **Break:** in the Section 6 trap dataset, multiply `feature2` by `1000` before running PCA (make its scale comparable to `feature1`'s) and see whether PC1 now captures the label-relevant direction instead. Explain why simply rescaling a feature can flip which direction PCA considers "important" — connecting back to the standardization point from Section 7.
- **Trace:** for the point `feature1=90, feature2=0.5` (a class-`1` point) in the trap dataset, walk through centering, then projecting onto `pc1` by hand (or with a calculator), and confirm numerically that its resulting single PC1 value lands inside the range of class-`0` points' PC1 values too — demonstrating the overlap directly.

---

## What to remember

- PCA measures "importance" purely as variance — spread in the feature space — which is a genuinely different notion of information than anything in the supervised lessons before it.
- Eigenvectors of the covariance matrix give directions of variance; eigenvalues give the amount along each — sorting and keeping the top few is how compression happens, and the fraction of variance discarded is always exactly knowable, not a guess.
- PCA is completely blind to labels — the highest-variance direction can be totally unrelated to what you're trying to predict, and can even be a direction that actively discards the one dimension your classifier needed. Never assume PCA-then-classify is safe without checking.

## Next lesson

Every lesson in this series has quietly assumed that a low error on the data you trained on, or a single train/test split, tells you the model is actually good. That assumption breaks more often than it seems like it should. Before moving into the deep learning half of this series, the next lesson covers how to actually validate whether a model works — cross-validation, and what "trustworthy" evaluation really requires.
