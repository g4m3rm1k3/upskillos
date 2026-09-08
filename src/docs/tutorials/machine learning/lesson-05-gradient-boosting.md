# Lesson 5 — Fixing Mistakes on Purpose: Gradient Boosting

## What you'll learn
- A second, completely different way to combine many trees — not voting on independent guesses (Lesson 4), but building trees *in sequence*, each one explicitly targeting what the previous ones got wrong.
- Why this is called "gradient" boosting — the exact same idea as Lesson 1's gradient descent, just stepping a small tree instead of stepping a number.
- A trap that is the mirror image of Lesson 4's: where random forests were hard to break by adding more trees, boosting can and will overfit if you let it run too long — a fundamentally different failure mode you need to know how to watch for.

*(This lesson reuses the recursive tree-building skeleton from Lessons 3–4. What's new: adapting that skeleton for continuous targets instead of yes/no labels, and the boosting loop itself.)*

## What you'll build
A gradient-boosted ensemble, built from scratch, that predicts actual call duration (in microseconds) from `n` and `threads` — recovering an interaction effect between the two that neither a single line (Lesson 1) nor a single shallow tree (Lesson 3) could fully capture.

---

## The question

You benchmark 11 calls, varying both `n` and `threads`:

| n | threads | time (µs) |
|---|---|---|
| 1,000  | 1  | 28  |
| 3,000  | 2  | 71  |
| 6,000  | 10 | 155 |
| 8,000  | 1  | 168 |
| 10,000 | 9  | 232 |
| 15,000 | 2  | 311 |
| 20,000 | 1  | 408 |
| 20,000 | 15 | 451 |
| 22,000 | 10 | 476 |
| 27,000 | 3  | 554 |
| 30,000 | 12 | 642 |

Look at the two rows with `n=20,000`: one took `408µs` at `threads=1`, the other took `451µs` at `threads=15` — same input size, meaningfully different time, because contention cost seems to scale with *both* `n` and `threads` together, not either alone. You don't know the exact formula. You want a model that gets progressively closer to the truth, one correction at a time.

---

## 1. Predict

If you started with the single dumbest possible model — always predict the *average* time across all 11 rows, no matter what `n` or `threads` are — which rows would that prediction be *most* wrong about: the small-`n` rows, or the large-`n` rows? (Think about which rows are furthest from the average in absolute microseconds.)

---

## 2. Try it: the worst possible starting model

```python
import numpy as np

n = np.array([1000, 3000, 6000, 8000, 10000, 15000, 20000, 20000, 22000, 27000, 30000], dtype=float)
threads = np.array([1, 2, 10, 1, 9, 2, 1, 15, 10, 3, 12], dtype=float)
time_us = np.array([28, 71, 155, 168, 232, 311, 408, 451, 476, 554, 642], dtype=float)

baseline = np.mean(time_us)
predictions = np.full_like(time_us, baseline)
residual = time_us - predictions
print(f"baseline prediction: {baseline:.1f} for every row")
print(residual)
```

### What this code does

- **`baseline = np.mean(time_us)`** — a single number: the average of all 11 measured times. This is deliberately the simplest possible model — "ignore `n` and `threads` entirely, always guess the average."

- **`predictions = np.full_like(time_us, baseline)`** — `np.full_like(array, value)` creates a *new* array with the same shape and dtype as `time_us`, but with every element set to `value`. The result is 11 copies of the same number, `baseline` — not a reference to the scalar repeated implicitly, an actual new 11-element array.

- **`residual = time_us - predictions`** — elementwise subtraction between two same-shape arrays: for each row, "how far off was the (currently identical, for every row) guess from the truth." Rows with large true times (like `n=30000 → 642`) will have large positive residuals; rows near the average will have residuals close to zero.

### What happens

The printed `residual` array will be strongly negative for the small-`n` rows (the average overshoots them) and strongly positive for the large-`n` rows (the average undershoots them badly) — confirming the prediction from Section 1. This residual array is the entire target for what happens next: **you're about to train a tree not on the original times, but on these leftover errors.**

---

## 3. Why: fit a tree to the mistake, not the target

**The mechanism:** instead of trying to build one tree that predicts `time_us` perfectly, build a small, deliberately weak tree that predicts the *residual* — the part the current model got wrong. Then add that tree's predictions, scaled down, onto the running total. Repeat: recompute the residual against the *updated* prediction, fit another small tree to *that* residual, add it in too.

First, the tree itself needs to change from Lessons 3–4's version, because the target is now a continuous number (a residual), not a `0`/`1` label:

```python
def sse_impurity(labels):
    if len(labels) == 0:
        return 0.0
    return np.sum((labels - np.mean(labels)) ** 2)

def find_best_split_regression(features, labels):
    best = {"gain": -1, "feature": None, "threshold": None}
    parent_impurity = sse_impurity(labels)
    for name, values in features.items():
        for t in np.unique(values):
            left = values <= t
            right = ~left
            if left.sum() == 0 or right.sum() == 0:
                continue
            weighted = sse_impurity(labels[left]) + sse_impurity(labels[right])
            gain = parent_impurity - weighted
            if gain > best["gain"]:
                best = {"gain": gain, "feature": name, "threshold": t, "left": left, "right": right}
    return best

def build_regression_tree(features, labels, depth=0, max_depth=1):
    if depth == max_depth or len(labels) <= 1 or sse_impurity(labels) == 0:
        return {"leaf": True, "prediction": np.mean(labels)}
    split = find_best_split_regression(features, labels)
    if split["gain"] <= 0:
        return {"leaf": True, "prediction": np.mean(labels)}
    left_features = {name: values[split["left"]] for name, values in features.items()}
    right_features = {name: values[split["right"]] for name, values in features.items()}
    return {
        "leaf": False, "feature": split["feature"], "threshold": split["threshold"],
        "left": build_regression_tree(left_features, labels[split["left"]], depth + 1, max_depth),
        "right": build_regression_tree(right_features, labels[split["right"]], depth + 1, max_depth),
    }
```

### Code mechanics — what changed from the classification tree

- **`sse_impurity(labels)`** replaces `gini_impurity`. `(labels - np.mean(labels)) ** 2` computes each row's squared distance from the group's own average, and `np.sum` adds them all up — this is **sum of squared errors (SSE)**, a measure of how spread out a group of continuous numbers is, in the same spirit as Gini measured how "mixed" a group of categories was.

- **`weighted = sse_impurity(labels[left]) + sse_impurity(labels[right])`** — notice this is a plain **sum**, not the weighted-by-count-then-divided average that Gini's version needed. SSE is already a *total* (extensive quantity) rather than an *average* (intensive quantity) — a group of 8 points naturally contributes a larger raw SSE than a group of 2, purely by having more terms in the sum, so the group-size weighting Gini needed is already built into SSE for free.

- **`{"leaf": True, "prediction": np.mean(labels)}`** — the leaf's prediction is now the group's **average**, not a majority-vote class. For continuous targets, "the best constant guess for this group" is its mean, the same logic that made `baseline = np.mean(time_us)` the best possible single guess for the *whole* dataset in Section 2.

- **`max_depth=1`** (the default here, vs. `max_depth=2` or `3` in Lessons 3–4) — boosting deliberately uses very shallow, weak trees. A depth-1 tree ("a stump") can only ask *one* question. That's intentional, and explained fully in the design decision in Section 5.

Now the boosting loop itself:

```python
def gradient_boost(features, y, num_rounds=30, learning_rate=0.1, max_depth=1):
    baseline = np.mean(y)
    predictions = np.full_like(y, baseline)
    trees = []
    for round_num in range(num_rounds):
        residual = y - predictions
        tree = build_regression_tree(features, residual, max_depth=max_depth)
        row_dicts = [{name: values[i] for name, values in features.items()} for i in range(len(y))]
        update = np.array([predict_one(tree, row) for row in row_dicts])
        predictions += learning_rate * update
        trees.append(tree)
    return baseline, trees

def predict_one(tree, sample):
    if tree["leaf"]:
        return tree["prediction"]
    if sample[tree["feature"]] <= tree["threshold"]:
        return predict_one(tree["left"], sample)
    return predict_one(tree["right"], sample)

baseline, trees = gradient_boost({"n": n, "threads": threads}, time_us)
```

- **`residual = y - predictions`** — recomputed **fresh, every round**, against whatever `predictions` has become *so far* — not the original baseline every time. Round 2's residual reflects round 1's correction already having been applied.

- **`tree = build_regression_tree(features, residual, max_depth=max_depth)`** — the tree is trained to predict the *residual*, using the same `n`/`threads` features as always. It's answering a different question each round: "given `n` and `threads`, how much is the *current* model still off by?"

- **`row_dicts = [{name: values[i] for name, values in features.items()} for i in range(len(y))]`** — `features` is stored **column-wise**, a dictionary of full arrays (`{"n": [...], "threads": [...]}`) — efficient for training, since `find_best_split_regression` needs to scan whole columns at once. But `predict_one` expects a **row-wise** dictionary — one sample's values, like `{"n": 8000, "threads": 1}`. This list comprehension bridges the two layouts, reconstructing one row-dictionary per training example so each can be run through `predict_one` individually. This column-vs-row tension is a real, recurring concern in data-heavy code (it's the same distinction behind columnar databases and formats like Parquet) — not an artifact of this toy example.

- **`predictions += learning_rate * update`** — the exact same **shrinkage** idea as Lesson 1's `w -= learning_rate * grad_w`. `update` (this round's tree's predictions) is scaled *down* by `learning_rate` before being added — you never fully trust one round's correction, you nudge toward it.

- **`trees.append(tree)`** — every round's tree is kept, in order; predicting on new data later means walking through *all* of them, in the same sequence they were built.

### Execution trace (first two rounds)

```
round 0:
  residual = time_us - baseline_for_every_row      (large errors, especially at extreme n)
  tree_0 fit to this residual (likely splits on n, since n's effect is largest)
  predictions += learning_rate * tree_0's output    (predictions move a little closer to truth)

round 1:
  residual = time_us - predictions   ← predictions now reflect round 0's correction
  tree_1 fit to THIS SMALLER residual (may pick up on threads' effect, since n's
    dominant effect was partly absorbed by tree_0 already)
  predictions += learning_rate * tree_1's output    (predictions move closer still)

... repeats, each round's tree targeting whatever error remains after all previous rounds
```

### Mental model

```
start: predict the average for everyone (worst-but-honest baseline)
        ↓
measure the residual (exactly like Lesson 1's error, exactly like Lesson 2's error)
        ↓
fit a small, weak tree to PREDICT THAT RESIDUAL
        ↓
add a SHRUNK version of that tree's output to the running prediction
        ↓
recompute the residual against the NEW prediction
        ↓
repeat — each round chips away at whatever error is still left
```

This is why it's called *gradient* boosting: `residual = y - predictions` is, for squared-error loss, mathematically proportional to the negative gradient of the loss with respect to the current predictions — the exact same "which direction reduces error" question Lesson 1 answered with calculus on two numbers (`w`, `b`). Here, the "step" taken in that direction isn't a number — it's an entire small tree, because the thing being adjusted is a whole prediction function, not two scalars.

---

## 4. Change one thing

The regression tree above and the classification tree from Lesson 3 share the *exact same recursive skeleton* — here's everything that actually differs, isolated:

```diff
- def gini_impurity(labels):
-     p1 = np.mean(labels)
-     p0 = 1 - p1
-     return 1 - p0**2 - p1**2
+ def sse_impurity(labels):
+     return np.sum((labels - np.mean(labels)) ** 2)

- weighted = (left.sum() * gini_impurity(labels[left]) + right.sum() * gini_impurity(labels[right])) / len(labels)
+ weighted = sse_impurity(labels[left]) + sse_impurity(labels[right])

- return {"leaf": True, "prediction": 1 if np.mean(labels) >= 0.5 else 0}
+ return {"leaf": True, "prediction": np.mean(labels)}
```

**What changed:** the impurity measure (mixedness of categories vs. spread of numbers), the group-combination formula (weighted average vs. plain sum, per the extensive-vs-intensive point above), and what a leaf outputs (a rounded class vs. a raw mean).

**What did not change:** `find_best_split`'s outer structure — looping over features and thresholds, tracking the best gain — and `build_tree`'s recursion, base cases, and dictionary-based tree structure are *identical*, copy-pasteable between classification and regression. The recursive "keep splitting until pure or out of depth" algorithm doesn't care whether the target is categories or numbers — only the definition of "impure" and "what a leaf says" needs to change.

---

## 5. Put it in the project

```python
def predict_boosted(baseline, trees, learning_rate, sample):
    prediction = baseline
    for tree in trees:
        prediction += learning_rate * predict_one(tree, sample)
    return prediction

test_cases = [
    {"n": 5000, "threads": 1},
    {"n": 20000, "threads": 8},
    {"n": 28000, "threads": 2},
]
for case in test_cases:
    estimate = predict_boosted(baseline, trees, learning_rate=0.1, sample=case)
    print(f"n={case['n']:>6} threads={case['threads']:>2}  predicted time: {estimate:.1f} µs")
```

### Code walkthrough

- **`for tree in trees: prediction += learning_rate * predict_one(tree, sample)`** — prediction on new data mirrors training exactly: start from the same `baseline`, then walk through *every* tree in the order they were built, adding each one's shrunk contribution. A sample that was never in the training set still gets a sensible prediction, because each tree only ever looked at `n` and `threads` — the same features available at prediction time.

### Why this design: num_rounds, learning_rate, and stump depth

**Problem:** the boosting loop needs three settings — how many rounds, how much to shrink each round's contribution, and how deep each individual tree is allowed to be.

**Available choices:** many rounds with heavy shrinkage (small `learning_rate`) vs. few rounds with little shrinkage; shallow stumps (`max_depth=1`) vs. deeper trees per round.

**Selected choice:** `num_rounds=30`, `learning_rate=0.1`, `max_depth=1` — many rounds, each contributing a small, shallow correction.

**Reason:** this mirrors Lesson 1's learning-rate tradeoff *exactly*, just at the level of whole trees instead of numbers — a large `learning_rate` here has the same overshoot risk as a large learning rate did for `w`/`b` in Lesson 1. Shallow stumps are deliberate too: a single depth-1 tree is a genuinely weak, high-bias model on its own (it can only ask one yes/no question), and boosting's whole premise is that *many* weak, slightly-different corrections stacked together can approximate something a single strong model couldn't easily express — deep individual trees would defeat that purpose and reintroduce the overfitting risk from Lesson 3, just per-round instead of overall.

**Cost:** more rounds means more computation, and (as Section 6 shows in detail) more rounds isn't free even setting compute aside.

**Revisit condition:** if predictions on genuinely new data are worse than predictions on training data by a wide margin, that's a sign `num_rounds` is too high for how much real data you have — the exact subject of the next section.

---

## 6. The trap

**Normal rule:** more boosting rounds should make the model fit the training data better and better — each round explicitly targets whatever error is left.

**Apparently equivalent, reasonable-looking change** — you get a 12th benchmark row, and (not knowing it's corrupted, say a garbage-collection pause happened mid-measurement) you add it and simply run more rounds to make sure the model "learns" it too:

```python
n_with_outlier = np.append(n, 5000)
threads_with_outlier = np.append(threads, 1)
time_with_outlier = np.append(time_us, 900)   # true value should be ~110µs; this is a corrupted measurement

baseline2, trees2 = gradient_boost(
    {"n": n_with_outlier, "threads": threads_with_outlier}, time_with_outlier,
    num_rounds=300, learning_rate=0.1
)

for rounds in [10, 50, 150, 300]:
    _, partial_trees = gradient_boost(
        {"n": n_with_outlier, "threads": threads_with_outlier}, time_with_outlier,
        num_rounds=rounds, learning_rate=0.1
    )
    pred_on_outlier = predict_boosted(baseline2, partial_trees, 0.1, {"n": 5000, "threads": 1})
    print(f"rounds={rounds:>3}  prediction at the corrupted row's inputs: {pred_on_outlier:.1f} µs")
```

**Surprising result:** as `rounds` climbs from `10` to `300`, the prediction at `n=5000, threads=1` creeps steadily toward `900` — the corrupted value — even though every *other* row's true relationship suggests that input should predict somewhere around `110µs`. Given enough rounds, gradient boosting will chase down and effectively memorize a single bad measurement, distorting the model specifically around that one input.

**Exact reason:** each round's tree is trained to predict *whatever residual currently exists* — it has no way to distinguish "this residual reflects a real pattern I haven't captured yet" from "this residual exists because one measurement was garbage." With enough rounds, the residual at the corrupted row never fully goes away until some tree specifically carves out a leaf just for it — and eventually one does, because that's a residual sitting right there waiting to be reduced, same as any other. Compare this to Lesson 4's random forest: adding more *independent* trees to a forest doesn't do this, because averaging many trees that each only saw the outlier some of the time (via bootstrap sampling) dilutes its influence. Boosting's sequential, error-correcting design has no such dilution built in — it's structurally aimed at reducing training error as far as it possibly can, given enough rounds.

**Project consequence:** unlike a random forest's `num_trees`, which you can usually set generously without much fear (Lesson 4's version doesn't overfit by adding more trees — it plateaus), gradient boosting's `num_rounds` is a parameter that genuinely needs to be limited using data the model didn't train on — a held-out validation set, stopping rounds once validation error starts creeping up even as training error keeps falling. This lesson's from-scratch version doesn't implement that check; treat that gap as a known limitation, not a stylistic omission.

---

## 7. Under the hood

*(Optional — not required to use gradient boosting correctly.)*

This lesson used `residual = y - predictions` directly because squared-error loss makes the negative gradient exactly equal to the residual. "Gradient boosting" as a general technique isn't limited to squared error — for other loss functions (like the log-loss from Lesson 2), you fit each new tree to the actual negative gradient of *that* loss with respect to the current predictions, which isn't simply "true value minus prediction" anymore, but the same "fit a weak model to whatever direction reduces loss" principle still applies. Real libraries (XGBoost, LightGBM) build on this same core loop but add explicit regularization terms specifically to counteract Section 6's overfitting trap — controlling tree complexity and shrinkage together, rather than relying on the user to manually pick a stopping point via trial and error.

---

## 8. Exercises

- **Predict:** for the clean (no-outlier) 11-row dataset, would increasing `learning_rate` from `0.1` to `0.5` while keeping `num_rounds=30` fixed make the model converge to a good fit in *fewer* effective rounds, or would you expect the same kind of overshoot risk Lesson 1's trap demonstrated? Reason from the update line `predictions += learning_rate * update` before testing.
- **Modify:** change `max_depth` in `build_regression_tree`'s calls from `1` to `2`, keeping everything else the same, and compare how many rounds it takes to reach a similarly small residual on the clean dataset. What does this suggest about the relationship between individual tree strength and the number of rounds needed?
- **Break:** using the corrupted 12-row dataset from Section 6, run `gradient_boost` with `num_rounds=300` and check the *training* SSE (`np.sum((time_with_outlier - final_predictions)**2)`) versus the same value computed using only 30 rounds. Confirm that training error keeps shrinking well past the point where predictions have visibly started overfitting to the corrupted row.
- **Repair:** implement a simple early-stopping check: split the clean 11-row dataset into a small training set (first 9 rows) and a validation set (last 2 rows), run boosting round by round, and stop as soon as the validation SSE increases from one round to the next rather than running a fixed `num_rounds`.

---

## What to remember

- Gradient boosting builds trees sequentially, each one trained specifically to predict the *residual* left over by all previous trees — this is the same guess-measure-adjust loop from Lesson 1, just stepping an entire small tree instead of two numbers.
- The recursive tree-building algorithm from Lessons 3–4 didn't need to change to support continuous targets — only the impurity measure (SSE instead of Gini) and the leaf output (mean instead of majority class) did.
- Boosting and bagging fail in opposite directions: random forests are hard to overfit by adding more trees (Lesson 4), while gradient boosting can and will overfit if you don't limit rounds, because each round is explicitly built to reduce whatever error remains — including error caused by nothing more than bad data.

## Next lesson

Every algorithm so far — regression, classification, both kinds of trees — was trained with a label telling you the *correct* answer for every row. What do you do when you have data but no labels at all — no one ever told you which calls were "slow" or "fast," you just have raw measurements and a hunch that some of them cluster together? That's unsupervised learning, and it starts with a surprisingly simple algorithm: k-means clustering.
