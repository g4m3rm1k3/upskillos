# Lesson 8 — Logistic Regression & Classification

## What you'll learn
- Why linear regression's output (any real number) is the wrong shape for
  "yes or no" — and what the **sigmoid function** does about it
- Binary cross-entropy — a different loss function than Lesson 6's MSE,
  and why classification needs one
- That logistic regression trains via **the exact same gradient descent
  loop** as Lesson 6 — only the prediction formula and loss function
  differ
- Drawing and animating a live **decision boundary** as training
  progresses

## What you'll build
A from-scratch logistic regression classifying 2D points into two
categories, trained via gradient descent, with the learned decision
boundary line animated live in the browser as it shifts into place across
training.

## The question
Lesson 6 predicted a continuous number (`y` on a line). Classification
needs a *category* — "yes" or "no," `0` or `1`. If you tried reusing
`slope * x + intercept` directly as a "probability of being category 1,"
what specifically goes wrong, given that a probability has to stay between
`0` and `1`?

## 1. Predict

`slope * x + intercept` can output any real number — `-50`, `0`, `300`,
anything, depending on `x`. Predict: if you tried to *interpret* that raw
number directly as "the probability this point belongs to category 1,"
what breaks, concretely, for large positive or large negative inputs?

## 2. Try it — the sigmoid function

```python
import math

def sigmoid(x):
    return 1 / (1 + math.exp(-x))

for testValue in [-10, -2, -0.5, 0, 0.5, 2, 10]:
    print(testValue, "->", sigmoid(testValue))
```

### What this code does

**`1 / (1 + math.exp(-x))`**
- **This is the sigmoid function, and it directly answers your Predict
  question.** Look at the printed output: no matter how extreme `x` is
  (`-10` or `10`), the result always stays strictly between `0` and `1` —
  very negative inputs squeeze toward `0`, very positive inputs squeeze
  toward `1`, and `x = 0` lands exactly at `0.5`. `math.exp(-x)` is
  `e^(-x)` (`e`, Euler's number, ≈2.718 — a real, fixed mathematical
  constant, distinct from "Euler integration" from
  [[frontend-curriculum]] Lesson 26, despite sharing a namesake) — as `x`
  grows large and positive, `e^(-x)` shrinks toward `0`, making the whole
  fraction approach `1/1 = 1`; as `x` grows large and negative, `e^(-x)`
  explodes, making the fraction approach `0`.
- **This is the fix your Predict question was reaching for**: instead of
  using the raw linear output directly as a probability, sigmoid
  **squashes** it into the valid `[0, 1]` range first, regardless of how
  extreme the raw linear value is.

### What happens

The printed values confirm sigmoid's characteristic S-shaped behavior:
smoothly transitioning from near-`0` to near-`1` as its input increases,
symmetric around `x=0` giving exactly `0.5` — a genuine probability, usable
directly as "how confident is this model that the point belongs to
category 1."

## 3. Why — binary cross-entropy, a different loss for a different problem

```python
def predictProbability(x1, x2, weight1, weight2, bias):
    linearCombination = weight1 * x1 + weight2 * x2 + bias
    return sigmoid(linearCombination)

def binaryCrossEntropyLoss(dataPoints, weight1, weight2, bias):
    totalLoss = 0
    for x1, x2, actualLabel in dataPoints:
        predictedProbability = predictProbability(x1, x2, weight1, weight2, bias)
        predictedProbability = max(min(predictedProbability, 0.9999), 0.0001)
        totalLoss += -(actualLabel * math.log(predictedProbability) +
                        (1 - actualLabel) * math.log(1 - predictedProbability))
    return totalLoss / len(dataPoints)
```

**`weight1 * x1 + weight2 * x2 + bias`**
- Now **two** input features (`x1`, `x2` — a 2D point, not just one `x`
  like Lesson 6) each with their own **weight**, plus a `bias` (the direct
  equivalent of Lesson 6's `intercept`, renamed to the conventional ML
  term). This is still a perfectly ordinary linear combination — the same
  underlying idea as `slope * x + intercept`, just extended to two inputs
  instead of one.

**`max(min(predictedProbability, 0.9999), 0.0001)`**
- A **clamp** (the same concept as
  [[frontend-curriculum]] Lesson 22's `Math.min(distance, maxDistance)`),
  preventing `predictedProbability` from ever landing at *exactly* `0` or
  `1`. This matters for a concrete, necessary reason explained next.

**`-(actualLabel * math.log(predictedProbability) + (1 - actualLabel) * math.log(1 - predictedProbability))`**
- **This is binary cross-entropy — a genuinely different loss formula
  from Lesson 6's MSE, and worth understanding why classification needs a
  different one at all.** `actualLabel` is either `0` or `1` — so
  **exactly one** of the two terms is active for any given data point:
  if `actualLabel = 1`, the formula reduces to `-log(predictedProbability)`
  (the second term is multiplied by `(1 - 1) = 0`, vanishing); if
  `actualLabel = 0`, it reduces to `-log(1 - predictedProbability)`.
- **Why `log` specifically?** `-log(p)` is very close to `0` when `p` is
  close to `1` (a confident, correct prediction is barely penalized), but
  grows **without bound** as `p` approaches `0` (a confident, *wrong*
  prediction is penalized extremely heavily) — this asymmetric,
  increasingly-harsh-for-confident-wrongness behavior is specifically why
  cross-entropy, not MSE, is the standard loss for classification: MSE
  would penalize a wildly overconfident wrong prediction only modestly
  more than a mildly wrong one, while cross-entropy's harsh penalty for
  confident wrongness trains a classifier that only becomes highly
  confident when it's genuinely correct.
- **This is also the direct reason for the clamp above**: `math.log(0)` is
  undefined (approaches negative infinity) — without clamping
  `predictedProbability` away from exactly `0`/`1`, a sufficiently
  confident wrong prediction would crash the calculation entirely rather
  than merely producing a large loss value.

## 4. Change one thing

```diff
     for x1, x2, actualLabel in dataPoints:
         predictedProbability = predictProbability(x1, x2, weight1, weight2, bias)
         predictedProbability = max(min(predictedProbability, 0.9999), 0.0001)
-        totalLoss += -(actualLabel * math.log(predictedProbability) +
-                        (1 - actualLabel) * math.log(1 - predictedProbability))
+        error = predictedProbability - actualLabel
+        totalLoss += error * error
     return totalLoss / len(dataPoints)
```

**What changed:** swapped in Lesson 6's MSE formula directly, in place of
cross-entropy, still applied to the sigmoid-squashed probability.
**What did not change:** `predictProbability` itself, or the clamping.
**Predict, then verify**: this **technically runs** without error — MSE
doesn't strictly require cross-entropy's specific formula to function —
but training with it here generally converges **more slowly and less
reliably** for classification specifically, precisely because MSE lacks
cross-entropy's harsh, increasingly-steep penalty for confident wrong
predictions near the extremes. This is worth confirming by actually
training both versions (Section 5) side by side, watching decision
boundary convergence speed differ, rather than accepting the claim
untested.

## 5. Put it in the project — training and live decision boundary

```python
def computeGradients(dataPoints, weight1, weight2, bias):
    weight1Gradient = 0
    weight2Gradient = 0
    biasGradient = 0
    numberOfPoints = len(dataPoints)

    for x1, x2, actualLabel in dataPoints:
        predictedProbability = predictProbability(x1, x2, weight1, weight2, bias)
        error = predictedProbability - actualLabel
        weight1Gradient += error * x1
        weight2Gradient += error * x2
        biasGradient += error

    return weight1Gradient / numberOfPoints, weight2Gradient / numberOfPoints, biasGradient / numberOfPoints

def trainLogisticRegression(dataPoints, learningRate, numberOfIterations):
    weight1, weight2, bias = 0, 0, 0
    trainingHistory = []

    for iteration in range(numberOfIterations):
        gradient1, gradient2, gradientBias = computeGradients(dataPoints, weight1, weight2, bias)
        weight1 -= learningRate * gradient1
        weight2 -= learningRate * gradient2
        bias -= learningRate * gradientBias
        trainingHistory.append({"weight1": weight1, "weight2": weight2, "bias": bias})

    return weight1, weight2, bias, trainingHistory
```

**Notice how similar this is to Lesson 6's `computeGradients`/
`trainLinearRegression` — deliberately.** The update rule
(`weight -= learningRate * gradient`) is **structurally identical**, and
the gradient formulas (`error * x1`, `error * x2`, `error`) have the exact
same *shape* as Lesson 6's (`2 * error * x`, `2 * error` — the `2` differs
because MSE's derivative includes it while cross-entropy's derivative,
worked out symbolically in advance the same way Lesson 6's was, happens
not to). **This is the direct answer to this lesson's third bullet point**:
logistic regression genuinely is "the same gradient descent loop," with
only the prediction formula (linear → sigmoid-wrapped) and loss function
(MSE → cross-entropy) actually different.

**Frontend — the decision boundary itself**: a logistic regression's
decision boundary is the line where `predictedProbability = 0.5` exactly
— which, since `sigmoid(0) = 0.5` (confirmed in Section 2's printed
output), means exactly where `weight1*x1 + weight2*x2 + bias = 0`. Solving
for `x2` in terms of `x1` gives the boundary line's equation directly:

```js
function decisionBoundaryX2(x1, weight1, weight2, bias) {
  return -(weight1 * x1 + bias) / weight2;
}
```

Reusing Lesson 6's exact animation structure (canvas, `fetch` the training
history JSON, loop through steps with `requestAnimationFrame`), plot each
data point colored by its actual label, and draw
`decisionBoundaryX2` as a line — watch it rotate and shift into place as
`weight1`/`weight2`/`bias` update across the loaded training history,
exactly the same replay technique as Lesson 6's fit line.

### What happens

The decision boundary line starts in a near-random position/orientation
(from the initial `weight1=weight2=bias=0` — actually, notice `bias`
starting at 0 too means the very first boundary is degenerate; watch what
the very first few frames actually show) and rotates/shifts into a
position correctly separating the two colored groups of points, mirroring
Lesson 6/7's convergence visualizations but for a categorical boundary
instead of a continuous fit line or landscape.

## 6. Trap

Predict, then test: construct a dataset where the two categories are
**not** linearly separable — e.g. category 1 points forming a ring around
a cluster of category 0 points (no single straight line can separate
them cleanly, unlike two simple side-by-side clusters).

Train logistic regression on it and watch the decision boundary
animation. **The trap: the boundary will settle into *some* straight
line, converging in the sense that the loss stops decreasing much
further — but it will never achieve good separation, because logistic
regression, as built here, can only ever produce a straight-line
boundary.** No amount of additional training iterations or learning-rate
tuning fixes this — **it's a fundamental limitation of the model's
structure, not a training problem.** This is worth experiencing directly:
the loss curve looking like it's "converged" doesn't automatically mean
the model is doing well at the actual task — it might just mean it's
found the *best possible straight line*, which can still be a genuinely
bad classifier for the actual data's real shape. This is precisely the
limitation Lesson 9's neural network exists to remove.

## 7. Exercise

- **Predict:** For a dataset with two clearly-separable clusters far
  apart, would you expect training to converge (loss stop decreasing) in
  fewer or more iterations than Lesson 6's linear regression on its
  simple dataset? Reason about the shapes of each loss landscape before
  testing.
- **Modify:** Add a third input feature (`x3`, with its own `weight3`) —
  confirm the gradient descent loop's structure barely changes, just one
  more parallel gradient/update, reinforcing how mechanical scaling up
  the number of features actually is.
- **Break:** Set every data point's `actualLabel` to `1` (no negative
  examples at all). What does the trained decision boundary end up doing,
  and can you explain why using the cross-entropy formula directly (what
  happens to the loss if the model just always predicts close to `1`)?
- **Trace:** Confirm algebraically (by hand, or by testing numerically)
  that `sigmoid(0) = 0.5` exactly — and connect this to why
  `weight1*x1 + weight2*x2 + bias = 0` is genuinely the correct equation
  for "exactly 50% confidence," i.e. the boundary between the two
  predicted classes.

## What to remember
- Sigmoid squashes any real number into `(0, 1)`, turning an ordinary
  linear combination into something usable as a genuine probability.
- Binary cross-entropy penalizes confident wrong predictions far more
  harshly than MSE does — the actual reason it's the standard
  classification loss, not an arbitrary substitution.
- Logistic regression trains via the *exact same* gradient descent loop
  as linear regression — only the prediction formula and loss function
  differ, not the underlying training mechanism.
- A converged loss doesn't mean a good model — logistic regression's
  straight-line-only decision boundary is a real, structural limitation no
  amount of training fixes, directly motivating Lesson 9's neural network.

## Next lesson
Lesson 9 builds a tiny neural network from scratch — multiple layers,
non-linear activation functions, and the actual mechanism (a **hidden
layer**) that finally lets a decision boundary bend, fixing exactly the
straight-line limitation this lesson's Trap section just made concrete.
