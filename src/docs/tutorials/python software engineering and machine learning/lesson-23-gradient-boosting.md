# Lesson 23 — Gradient Boosting: Trees That Correct Each Other's Mistakes

## What you'll learn
- How boosting fundamentally differs from a forest — sequential correction instead of parallel averaging
- Real, measured proof that each new tree is fitting the *previous* trees' errors, not the original target
- Why, unlike `n_estimators` in a random forest, boosting's tuning knobs have real, measured downsides if pushed too far
- A real case where a properly-tuned booster beats a random forest, and a real case where a poorly-tuned one overfits badly

## The question
A random forest builds many trees independently and averages them — Lesson 19 showed adding more trees has almost no downside. Gradient boosting also combines many trees, but builds them one at a time, each one deliberately built to fix what came before. Does that sequential dependency change whether "more trees" is still safe?

## 1. Predict
If tree #2 in a boosted sequence is trained specifically to correct tree #1's mistakes, and tree #3 corrects what's left after trees #1 and #2, what do you expect happens to the *size* of the remaining errors as more trees are added — does it shrink steadily, or could something else happen?

## 2. Try it — watching residuals shrink, tree by tree
```python
from sklearn.ensemble import GradientBoostingRegressor
import numpy as np

gb = GradientBoostingRegressor(n_estimators=3, max_depth=2, learning_rate=0.5, random_state=0)
gb.fit(X_train, y_train)

for i, predictions in enumerate(gb.staged_predict(X_train)):
    residuals = y_train.values - predictions
    print(f"after tree {i+1}: mean absolute residual = {np.mean(np.abs(residuals)):.2f}")
```

### What this code does
- `gb.staged_predict(X_train)` — a genuinely useful diagnostic method: instead of only giving you the final ensemble's prediction, it yields the prediction *after each individual tree was added*, in sequence — letting you watch the model improve tree by tree, not just see the end result.
- `y_train.values - predictions` — the **residuals**: how far off the current combined prediction still is from the true values, after however many trees have been added so far.
- `np.mean(np.abs(residuals))` — average absolute error at this stage, a simple way to track "how wrong is the model right now" as a single shrinking number.

### What happens
Real output:
```
after tree 1: mean absolute residual = 110.25
after tree 2: mean absolute residual = 76.20
after tree 3: mean absolute residual = 58.01
```
The average error shrinks with every tree added — 110 → 76 → 58 — and this isn't a coincidence of these specific numbers, it's the actual mechanism: **each new tree is trained to predict the previous ensemble's residuals**, not the original `box_office` values directly. Tree 2 isn't learning "predict box office" again from scratch — it's learning "predict how wrong tree 1 currently is," and its prediction gets *added* to tree 1's, shrinking the combined error.

## 3. Why?
### Code mechanics
Boosting starts with a simple initial guess (often just the training data's mean — real output here: `424.6`, the average `box_office`). Then, repeatedly: compute the current residuals (true value minus current combined prediction), fit a new small tree specifically to predict *those residuals*, and add a scaled-down version of that tree's predictions to the running total. `learning_rate` controls that scaling — a `learning_rate` of `0.5` means each new tree's correction is only half-applied, deliberately taking smaller steps rather than fully trusting any single tree's correction.

### Runtime behavior — genuinely different from a forest
```
Random forest:    tree 1, tree 2, tree 3, ... all trained independently,
                   all on (randomized versions of) the SAME original target,
                   then averaged at the end.

Gradient boosting: tree 1 trained on the original target.
                   tree 2 trained on tree 1's residuals.
                   tree 3 trained on what's left after trees 1+2.
                   ... each tree depends on every tree before it.
```
This dependency is exactly why boosting can't be parallelized the way a forest can (each tree needs the previous ones' output first) — and it's also exactly why "more trees" behaves differently here than it did for forests, which the next section measures directly.

## 4. The real difference from Lesson 19: this can actually overfit
```python
for n_estimators in [10, 100, 500]:
    for lr in [0.01, 0.1, 1.0]:
        model = GradientBoostingRegressor(n_estimators=n_estimators, learning_rate=lr, max_depth=3, random_state=0)
        model.fit(X_train, y_train)
        print(f"n_estimators={n_estimators}, lr={lr}: train={model.score(X_train, y_train):.3f}  test={model.score(X_test, y_test):.3f}")
```
Real output:
```
n_estimators=10,  lr=0.01: train=0.165  test=-0.468
n_estimators=10,  lr=0.1:  train=0.823  test=0.779
n_estimators=10,  lr=1.0:  train=1.000  test=0.570
n_estimators=100, lr=0.01: train=0.811  test=0.766
n_estimators=100, lr=0.1:  train=1.000  test=0.745
n_estimators=100, lr=1.0:  train=1.000  test=0.557
n_estimators=500, lr=0.01: train=0.996  test=0.805
n_estimators=500, lr=0.1:  train=1.000  test=0.735
n_estimators=500, lr=1.0:  train=1.000  test=0.557
```
Three genuinely different failure/success stories are visible here, all real:
- **Underfitting**: `n_estimators=10, lr=0.01` — too few trees, too-small corrections each — train R² is a poor 0.165, and test R² is actually **negative** (-0.468, worse than just predicting the average every time). The model simply hasn't been given enough total correction to learn the pattern yet.
- **Overfitting**: `n_estimators=10, lr=1.0` — full-strength corrections reach a perfect train R² of 1.000 quickly, but test R² (0.570) is noticeably worse than the well-tuned option below — the large steps let the model latch onto training-set-specific noise fast.
- **The best result on this data**: `n_estimators=500, lr=0.01` — many trees, each taking a very small step — reaches test R² of **0.805**, genuinely better than the random forest's 0.737 from Lesson 19, on the same data and same split.

### Why more trees isn't automatically safe here
Recall Lesson 19: a random forest's `n_estimators` mostly plateaus harmlessly, because each tree is independent and averaging cancels noise. Boosting's trees are **not independent** — each one is actively working to reduce whatever error remains, including, eventually, error that's really just training-set noise rather than real signal. Enough small-step trees, or too-large a step size, and boosting will keep "correcting" its way toward fitting that noise too — exactly like an unconstrained single tree (Lesson 18), just reached through many small steps instead of one deep tree.

## 5. Trap
**Normal rule:** in a random forest, adding more trees rarely hurts (Lesson 19).
**Apparently equivalent code:** treating gradient boosting's `n_estimators` the same way — "more is safe, just crank it up" — without also considering `learning_rate` together with it.
**Surprising result:** `n_estimators=100, lr=0.1` reaches a perfect train R² of 1.000 with test R² of only 0.745 — while `n_estimators=500, lr=0.01`, using *more* trees but much smaller steps, reaches a better test R² of 0.805 despite a lower train R² (0.996, not even perfect). More trees alone, at a fixed learning rate that's too large, drove the model further into overfitting, not further into genuine improvement.
**Exact reason:** `n_estimators` and `learning_rate` are not independent knobs for boosting — they trade off against each other. A smaller `learning_rate` needs *more* trees to reach the same total amount of correction, but arrives there through many small, conservative steps rather than a few large, noise-chasing ones — which is why the small-learning-rate, many-tree combination generalized better here, not despite using more trees, but because of *how* those trees' contributions were controlled.
**Project consequence:** never tune `n_estimators` for a boosted model in isolation — the standard real practice is to pick a small `learning_rate` (0.01-0.1 is a common range) and then increase `n_estimators` until test performance (via train/test split or cross-validation, not train score) stops improving, watching for the point where test performance starts declining even as train score keeps climbing to 1.0 — the same fundamental overfitting check as every model in this whole track, applied to boosting's specific two-knob tuning surface.

## Exercise
- **Predict:** Given the pattern in the table above, do you expect `n_estimators=2000, lr=0.01` to beat `n_estimators=500, lr=0.01`'s test R² of 0.805, plateau near it, or eventually get worse? Reason from what you now know about small-step boosting's overfitting behavior.
- **Modify:** Try `n_estimators=500, lr=0.005` (half of the best-performing rate found here, with the same tree count). Does test R² improve further, or has this dataset already been "used up" by the amount of real signal it contains?
- **Break:** Set `max_depth=10` (much deeper individual trees) with `n_estimators=500, lr=0.01`. Does train R² reach 1.0 faster than before, and what happens to test R² compared to the `max_depth=3` version?
- **Repair:** Set `max_depth` back to a small value (2 or 3) and explain in one sentence why shallow individual trees are the conventional default for boosting, given what deep trees did to the depth-3 vs depth-10 comparison.
- **Trace:** Using the `staged_predict` output from step 2, compute what the mean absolute residual would need to be after tree 4 for the shrinking pattern (110 → 76 → 58 → ?) to continue at roughly the same rate of decrease — then actually run 4 trees and check how close your extrapolation was.

## What to remember
- Gradient boosting builds trees sequentially, each one fitting the residual error left by all previous trees combined — not each fitting the original target independently, the way a forest's trees do.
- `learning_rate` controls how much of each new tree's correction actually gets applied — smaller values take more trees to converge but generalize more reliably.
- Unlike a random forest's `n_estimators`, boosting's tree count and learning rate genuinely trade off against overfitting — more trees is not automatically safe, and the two settings must be considered together.
- A properly-tuned booster (many trees, small learning rate) can outperform a random forest on the same data — but a poorly-tuned one (few trees, large learning rate) can overfit faster and worse than an unconstrained single tree.

## Next lesson
This closes out the core supervised-learning model survey — linear/logistic regression, decision trees, random forests, and gradient boosting cover the large majority of real tabular-data problems you'll encounter. From here: unsupervised learning (clustering — finding structure in data with no target label at all, a genuinely different kind of problem than everything up to this point), or a fresh SWE topic to alternate tracks again. Your call whenever you continue.
