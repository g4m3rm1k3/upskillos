# Lesson 19 — Random Forests: Averaging Away Overfitting Instead of Constraining It

## What you'll learn
- Why combining many overfit trees can outperform any single constrained one
- What "bootstrap sampling" and "random feature subsets" actually mean, mechanically, in how a forest is built
- Real numbers showing exactly how much a forest improves on a single unconstrained tree, and where adding more trees stops helping
- Why `n_estimators` behaves completely differently from `max_depth` as a tuning knob — one has almost no downside, the other trades train fit for test fit directly

## The question
Lesson 18 fixed a tree's overfitting by constraining `max_depth`, trading away some training fit to gain test performance. Is that the only fix? What if, instead of forcing one tree to be simpler, you let many trees stay complex — even fully unconstrained — and combine their answers?

## 1. Predict
An unconstrained single tree got train R² = 1.0, test R² = 0.545 (Lesson 18). If you trained 200 *separate* unconstrained trees, each overfitting in its own way, and averaged all their predictions together — would you expect the result to still overfit just as badly, or could averaging actually help?

## 2. Try it
```python
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor

single = DecisionTreeRegressor(random_state=0).fit(X_train, y_train)
print("single tree — train:", single.score(X_train, y_train), " test:", single.score(X_test, y_test))

forest = RandomForestRegressor(n_estimators=200, random_state=0).fit(X_train, y_train)
print("forest (200 trees) — train:", forest.score(X_train, y_train), " test:", forest.score(X_test, y_test))
```

### What this code does
- `RandomForestRegressor(n_estimators=200)` — builds 200 individual decision trees, **each one unconstrained by default**, exactly the kind of tree that overfit badly on its own in Lesson 18. `n_estimators` is simply "how many trees to build."
- Each of those 200 trees is trained differently, on purpose, through two separate randomization mechanisms (detailed in step 3) — they are not 200 copies of the same tree.
- `forest.predict(...)` (used internally by `.score()`) runs the input through all 200 trees and **averages** their individual predictions into one final number.

### What happens
Real output:
```
single tree — train: 1.0    test: 0.545
forest (200 trees) — train: 0.966  test: 0.737
```
The forest's train R² dropped slightly from the single tree's perfect 1.0 — but its test R² jumped from 0.545 to 0.737, a substantially better result on data it never trained on. If you predicted averaging would help, this is exactly why, made concrete: 200 differently-overfit trees, each memorizing different noise, average out toward the real underlying pattern instead of any one tree's specific memorized quirks.

## 3. Why — the two sources of randomness
### Bootstrap sampling
Each of the 200 trees is trained not on the full training set, but on a **random sample of the same size, drawn with replacement** — meaning some training examples appear multiple times in a given tree's sample, and others don't appear at all. This is called *bootstrapping*. Because each tree sees a slightly different (re-sampled) version of the data, each one ends up memorizing slightly different noise — the specific quirks it overfits to are different from tree to tree, purely because of which examples happened to be resampled.

### Random feature subsets
At each individual split, rather than considering every available feature (`budget`, `year`, `code1`) to find the best question, each tree is restricted to a **random subset** of features at that particular split. This forces different trees to sometimes rely on different features to make their splits, further diversifying what each tree ends up learning, rather than all 200 trees converging on the exact same dominant feature every time.

### Why averaging then works
If every tree's overfitting were identical, averaging them would just reproduce the same overfit result — no benefit at all. Because bootstrap sampling and random feature subsets make each tree overfit to *different* specific noise, that noise tends to cancel out when averaged across 200 independent (differently wrong) trees, while the real underlying signal — present in every resampled version of the data, since it's actually there — reinforces itself across all of them and survives the averaging. This general technique (train many high-variance models on randomized variations of the data, then average) is called **bagging** (bootstrap aggregating), and random forests are its most common application.

### Mental model
```
single unconstrained tree:  memorizes ALL the noise in the one dataset it saw
                             → perfect train fit, poor generalization

200 trees, each on a different bootstrap sample + random feature subsets:
                             → each memorizes DIFFERENT noise
                             → average cancels out noise, keeps real signal
                             → good train fit (not perfect), better generalization
```

## 4. How many trees is enough? — a real, measured curve
```python
for n in [1, 10, 50, 200, 1000]:
    forest = RandomForestRegressor(n_estimators=n, random_state=0).fit(X_train, y_train)
    print(f"n_estimators={n}: train={forest.score(X_train, y_train):.3f}  test={forest.score(X_test, y_test):.3f}")
```
Real output:
```
n_estimators=1:    train=0.791  test=0.644
n_estimators=10:   train=0.944  test=0.753
n_estimators=50:   train=0.960  test=0.761
n_estimators=200:  train=0.966  test=0.737
n_estimators=1000: train=0.968  test=0.742
```
Notice the shape: test R² improves quickly from 1 to 10 to 50 trees, then **plateaus** — 200 and 1000 trees perform about the same as 50, within noise. This is the real, measured version of a genuinely important property: adding more trees to a forest has **diminishing returns**, but essentially never makes things meaningfully *worse* — contrast this directly with `max_depth` in Lesson 18, where going too far in one direction (unconstrained depth) actively hurt test performance. `n_estimators` mostly just costs more computation time past a certain point, not accuracy.

## 5. Feature importances, now averaged across 200 trees
```python
print(forest.feature_importances_)
# real output: [0.874  0.063  0.062]
```
Compare to the single tree's importances from Lesson 18 (`[0.857, 0.111, 0.032]`) — broadly similar (`budget` still dominates), but averaged across 200 differently-sampled trees, this number is meaningfully more stable and trustworthy than reading it off any single tree, for the same reason a forest's predictions are more trustworthy than a single tree's: any one tree's importances reflect that tree's particular overfitting quirks; averaged across 200, those quirks wash out.

## 6. Trap
**Normal rule:** more trees in a forest can only help or plateau, never meaningfully hurt.
**Apparently equivalent code:** assuming this "no meaningful downside to more" property applies to *every* hyperparameter, and cranking `n_estimators` up as a substitute for actually thinking about `max_depth`, feature quality, or data quantity.
**Surprising result:** `n_estimators=1000` here performs essentially identically to `n_estimators=50` — no meaningful improvement despite 20x the trees and 20x the compute cost.
**Exact reason:** `n_estimators` only helps by reducing the *variance* introduced by bootstrap sampling and feature randomization — but it does nothing about the actual amount of real signal available in the data itself. Once the forest's average has converged close to what the data genuinely supports, more trees just average the same already-stable estimate more finely — there's no more signal left to extract by adding more.
**Project consequence:** don't reach for `n_estimators` as a first response to a forest underperforming — check the plateau (as done above) and stop increasing it once returns clearly flatten; if performance still isn't good enough at that point, the actual lever to look at is something else entirely — more/better features, more data, or a fundamentally different model — not more trees.

## Exercise
- **Predict:** If you used a much smaller training set (say, 10 examples instead of 28), do you expect the gap between single-tree and forest test performance to be larger or smaller than what was measured here? Think about what bootstrap resampling can even offer when the original dataset is already tiny.
- **Modify:** Set `max_features` (a `RandomForestRegressor` parameter controlling how many features are considered per split) to `1` instead of the default, forcing maximum feature randomization. Does test R² improve, worsen, or stay similar with only 3 total features to choose from?
- **Break:** Set `bootstrap=False` — every tree now trains on the *entire* training set instead of a resampled version, removing one of the two randomization sources. Does the forest's test R² get noticeably worse, and does that match what step 3's explanation would predict?
- **Repair:** Set `bootstrap` back to `True`, and explain in one sentence why removing bootstrap sampling specifically undermines the averaging benefit, even with random feature subsets still active.
- **Trace:** Using the `n_estimators` table above, identify the point where test R² stops meaningfully improving, and explain — referencing the actual numbers — why training 1000 trees instead of 50 would mostly just be wasted computation for this specific dataset.

## What to remember
- A random forest trains many trees on bootstrap-resampled data with random feature subsets per split, then averages their predictions — this is bagging.
- Averaging many differently-overfit models cancels out individual noise while preserving real shared signal — this is *why* the technique works, not just that it happens to.
- `n_estimators` has a real plateau — measure it, don't assume more is always meaningfully better.
- `max_depth` (single tree) trades train fit for test fit directly; `n_estimators` (forest) mostly just costs compute past the plateau — these are genuinely different kinds of hyperparameters, and treating them the same way is a mistake.

## Next lesson
This is a natural point to step back to SWE-adjacent ground for a bit — version control (git) is genuinely overdue at this point, given everything built across 19 lessons now lives only as loose files. Or, if you'd rather stay in ML a while longer: gradient boosting, a different way of combining many trees that (unlike a forest's parallel, independent trees) builds them one at a time, each correcting the previous ones' mistakes. Your call.
