---
title: 11.3 — Three Numbers Instead of Ten: Using the Components
track: Dimensionality Reduction — Inspection Data
runtime: none
concepts: pca
revisits: matrices, feature-scaling, classes, clustering, testing
notebook: ml-pca
lab: 18
problem: Three components carry 94.6% of the variation in ten measurements. How do you actually turn each part into three numbers, and back into ten? And what can you do with the part of each measurement that the three don't explain?
---

Lesson 11.2 found the directions. This lesson uses them, for the two jobs PCA is most often used for on a shop floor:

1. **Watch a few numbers instead of many.** Three scores per part, each tied to a cause (tool wear, temperature, flatness), are far easier to chart than ten correlated measurements.
2. **Catch the odd part.** A part whose ten measurements *can't* be explained by the three components has something wrong that isn't one of the usual causes.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_compress.py provided
# Tests for compress.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_compress.py
import numpy as np
from pytest import approx

import measurements

PARTS, FEATURES, X = measurements.load("data/measurements.csv")


def worst(model, how_many):
    return sorted(PARTS[i] for i in np.argsort(model.residual(X))[::-1][:how_many])


def test_scores_are_one_number_per_component_per_part():
    import compress
    assert compress.Compressor(k=3).fit(X).scores(X).shape == (400, 3)


def test_keeping_every_component_loses_nothing():
    import compress
    model = compress.Compressor(k=10).fit(X)
    assert np.allclose(model.reconstruct(X), X)


def test_no_residual_when_every_component_is_kept():
    import compress
    assert compress.Compressor(k=10).fit(X).residual(X).max() == approx(0, abs=1e-9)


def test_reconstruction_is_in_micrometres():
    import compress
    model = compress.Compressor(k=3).fit(X)
    assert model.reconstruct(X)[0, 0] == approx(29.7, abs=0.05)
    assert np.abs(model.reconstruct(X) - X).mean() < 1.0


def test_odd_parts_stand_out_with_three_components():
    import compress
    assert worst(compress.Compressor(k=3).fit(X), 4) == ["P126", "P167", "P293", "P301"]


def test_odd_parts_hide_with_only_two_components():
    import compress
    assert set(worst(compress.Compressor(k=2).fit(X), 4)).isdisjoint({"P126", "P167", "P293", "P301"})
```

- **Reconstruction**: going from three numbers back to ten. With all ten components kept, nothing is lost and the ten measurements come back exactly. With three, they come back approximately: part 1's `bore_1` was 31.7 µm and comes back as 29.7.
- The last two tests are about four particular parts, P126, P167, P293 and P301. Keep an eye out for why they're special.

```check
file tests/test_compress.py -- Click "Create provided tests/test_compress.py" above.
```

## Scores and reconstruction

A part's **score** on a component is how far along that direction it lies: the dot product of its standardised measurements with the direction (lesson 11.2's projection). For all parts and all kept components at once, that's one matrix multiplication:

$$S = Z\,D^\top$$

where $D$ has one direction per row (3 × 10), so $S$ is 400 × 3.

Going back reverses it: each part is rebuilt as its scores times the directions, $\hat{Z} = S\,D$, which adds up "this much of PC1, this much of PC2, this much of PC3". Then undo the standardising, multiplying by each feature's spread and adding its mean, to get micrometres again.

> **Dimensionality reduction**: replacing many features with fewer derived ones that keep most of the information. With PCA, the new features are the scores on the top components, and the information lost is exactly the variance along the components you dropped.
>
> *Picture it as* describing a batch of parts to a colleague over the phone. You don't read out all ten measurements per part; you say "bores running about 5 µm small, parts a bit warm, flatness normal". Three facts, from which they could rebuild roughly what the ten measurements would have been.

Create `compress.py`:

```python file=compress.py
import numpy as np

import pca
import spread


class Compressor:
    """Standardise, keep the top k principal components, and go back again."""

    def __init__(self, k: int):
        self.k = k

    def fit(self, X: np.ndarray) -> "Compressor":
        self.mean_, self.std_ = X.mean(axis=0), X.std(axis=0)
        self.directions_, self.variances_ = pca.components(spread.covariance(self.scale(X)), self.k)
        return self

    def scale(self, X: np.ndarray) -> np.ndarray:
        return (X - self.mean_) / self.std_

    def scores(self, X: np.ndarray) -> np.ndarray:
        return self.scale(X) @ self.directions_.T

    def reconstruct(self, X: np.ndarray) -> np.ndarray:
        return self.scores(X) @ self.directions_ * self.std_ + self.mean_
```

- **`fit`** remembers the scaling (lesson 10.3's pattern: new parts must be scaled like the training parts) and the top `k` directions.
- **`scores`**: standardise, then $Z D^\top$.
- **`reconstruct`**: $S D$, then `* self.std_ + self.mean_` undoes the standardising. Python works out `@` before `*` and `+`, so this is `((scores @ directions) * std) + mean`, as intended.

```check
run ".venv/Scripts/python -m pytest -q tests/test_compress.py -k \"scores or keeping or micrometres\"" label="scores are three numbers per part; reconstruction comes back in micrometres, exactly when all ten are kept"
```

## What the components can't explain

Subtract the reconstruction from the real (standardised) measurements and what's left is the part of each part that the kept components don't describe: the **residual**. For an ordinary part, that's measurement noise, small and scattered. A part with something *else* wrong, a defect that isn't tool wear or temperature, can't be rebuilt from the usual causes, and its residual is large.

> **Reconstruction error** (or residual): how far a part's actual measurements are from the version rebuilt from its top components; here, the sum of squared differences in standardised units. It's a widely used anomaly score: it asks not "is this part extreme?" but "is this part *unlike the usual patterns*?"
>
> *Picture it as* a part whose ten readings don't tell a consistent story. Bores small and outer dimensions long is a worn tool on a warm day: consistent, explainable. One bore 10 µm off while the other three are normal is a story none of the usual causes tells: a chip under the part, a damaged tool edge, a mis-probed feature.

Add `residual`:

```python file=compress.py
import numpy as np

import pca
import spread


class Compressor:
    """Standardise, keep the top k principal components, and go back again."""

    def __init__(self, k: int):
        self.k = k

    def fit(self, X: np.ndarray) -> "Compressor":
        self.mean_, self.std_ = X.mean(axis=0), X.std(axis=0)
        self.directions_, self.variances_ = pca.components(spread.covariance(self.scale(X)), self.k)
        return self

    def scale(self, X: np.ndarray) -> np.ndarray:
        return (X - self.mean_) / self.std_

    def scores(self, X: np.ndarray) -> np.ndarray:
        return self.scale(X) @ self.directions_.T

    def reconstruct(self, X: np.ndarray) -> np.ndarray:
        return self.scores(X) @ self.directions_ * self.std_ + self.mean_

    def residual(self, X: np.ndarray) -> np.ndarray:
        """How badly each row is described by the kept components (squared standardised error)."""
        Z = self.scale(X)
        return ((Z - self.scores(X) @ self.directions_) ** 2).sum(axis=1)
```

It's measured in standardised units so that every feature's error counts on the same scale, for the same reason as everything else in this chapter.

```check
run ".venv/Scripts/python -m pytest -q tests/test_compress.py" label="with three components the four odd parts stand out; with two they're hidden"
```

### Why two components hide them

The last test is the surprising one. With only two components, flatness (lesson 11.2's PC3) isn't kept, so *every* part's flatness variation lands in its residual. Flatness varies a lot from part to part on its own, and that ordinary variation drowns out the four odd parts.

```predict
question: If two components are too few, would keeping more, say six, be even better at catching odd parts?
choice: Yes: more components always describe the parts better
choice: Not necessarily: extra components start describing the odd parts' defects too, so their residuals shrink
choice: It makes no difference after three
answer: Not necessarily: extra components start describing the odd parts' defects too, so their residuals shrink
explain: Each extra component is the direction of greatest remaining variance, and after the real causes are used up, that includes the odd parts' own deviations. With four components, P293's hole-position defect is largely absorbed by the fourth, and P293 drops out of the top four. The right number of components is "all the real, shared causes, and no more", which here is three: where the explained variance jumps from 94.6% to only small gains after.
```

## The inspection report

Create `inspect_parts.py`. (Not `inspect.py`: Python has a built-in module called `inspect`, and a file with the same name in your project would be imported in its place, breaking any library that uses the real one.)

```python file=inspect_parts.py
import numpy as np

import compress
import measurements

parts, features, X = measurements.load("data/measurements.csv")
model = compress.Compressor(k=3).fit(X)

print("parts the three components can't explain:")
residual = model.residual(X)
error = X - model.reconstruct(X)
for i in np.argsort(residual)[::-1][:6]:
    worst = np.argmax(np.abs(error[i]))
    print(f"  {parts[i]}  residual {residual[i]:5.1f}   worst feature {features[worst]:<13} {error[i, worst]:+6.1f} um")
print(f"  (99% of parts have a residual below {np.percentile(residual, 99):.1f})")

print("\nPC1 score through the run:")
scores = model.scores(X)[:, 0]
for start in range(0, 400, 100):
    print(f"  parts {start + 1:>3}-{start + 100:<3}  mean PC1 {scores[start:start + 100].mean():+5.2f}")
```

- **`np.argmax(np.abs(error[i]))`**: of the part's ten errors (actual minus rebuilt, in µm), the feature with the biggest one, either way. That's where to look.
- **`np.percentile(residual, 99)`**: the value 99% of residuals fall below, as a yardstick for "large".
- **`{error[i, worst]:+6.1f}`**: the `+` makes positive numbers print with a sign too.
- **The PC1 scores in order of manufacture**, averaged over each block of 100 parts.

```powershell
.venv\Scripts\python inspect_parts.py
```

```text
parts the three components can't explain:
  P293  residual  10.7   worst feature hole_position   +7.8 um
  P126  residual   4.9   worst feature height          -7.8 um
  P301  residual   4.0   worst feature bore_1         -10.4 um
  P167  residual   3.8   worst feature bore_3          +8.4 um
  P023  residual   2.2   worst feature length          +4.4 um
  P114  residual   1.9   worst feature hole_position   +3.1 um
  (99% of parts have a residual below 2.2)

PC1 score through the run:
  parts   1-100  mean PC1 +2.76
  parts 101-200  mean PC1 +1.02
  parts 201-300  mean PC1 -0.98
  parts 301-400  mean PC1 -2.80
```

**The odd parts.** Four parts stand well clear of the 99% line, each with one feature far from what the usual causes predict. The data was made with exactly those four defects planted: a hole out of position on P293, a short height on P126, a small bore 1 on P301 and a large bore 3 on P167. Every one is caught, and the report even names the right feature. None of these parts would necessarily fail a tolerance check: P301's bore is 10 µm small *for a part like it*, which may still be within the drawing's limits. What makes it suspicious is that it's inconsistent with everything else about that part.

**The trend.** PC1 is the bores-and-slot component, and its average falls steadily through the run, from +2.76 to −2.80: the cut features are getting smaller part by part. That's a tool wearing, visible in one number instead of five charts, and the natural signal for scheduling a tool change.

```check
run ".venv/Scripts/python inspect_parts.py" stdout="  P301  residual   4.0   worst feature bore_1         -10.4 um" label="inspect_parts.py names the odd parts and the wear trend"
```

### When to reach for PCA

| Use | How |
|---|---|
| Many correlated measurements to monitor | chart the top component scores instead of every feature |
| Spotting unusual items | reconstruction error from the top components |
| Seeing high-dimensional data | plot the first two scores against each other |
| Before a model with many correlated features | use the scores as features (inside a `Pipeline`, lesson 7.4) |

And its limits: components are **straight-line** directions, so a cause that bends the cloud into a curve needs more components than it should; and a component is a *pattern of variation*, not a cause. Here the patterns matched the causes because the causes affected separate groups of features. When two causes affect the same features, a component can mix them, and naming it takes knowledge of the process, not just the loadings.

That completes the classical machine learning in this series: regression, classification, trees, clustering and dimensionality reduction, all built from the mathematics up. The next chapter starts the part most people mean by "AI" today: **neural networks**, starting from the single logistic-regression neuron of lesson 8.4.
