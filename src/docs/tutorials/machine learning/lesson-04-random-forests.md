# Lesson 4 — Wisdom of (Slightly Different) Crowds: Random Forests

## What you'll learn
- How to turn many individually mediocre, overfitting-prone trees into a single more reliable predictor — without changing the tree algorithm itself.
- Two distinct sources of randomness in a random forest, and why *both* are needed — one alone isn't enough.
- A real, easy-to-miss trap: averaging many models only reduces error if their mistakes are somewhat independent — and it's surprisingly easy to accidentally build a "forest" where every tree makes the same mistake.

*(This lesson reuses `gini_impurity`, `find_best_split`, and `build_tree` from Lesson 3 without re-explaining their internals — refer back if you need a refresher. Everything new gets full treatment below.)*

## What you'll build
A random forest, built from scratch, that predicts "exceeds budget" using three signals — `n`, `threads`, and one deliberately meaningless third signal — and demonstrates concretely why a forest handles that meaningless signal more gracefully than a single deep tree does.

---

## The question

Lesson 3 ended on a real limitation: a single greedy tree, given only 12 rows, can be tricked or can overfit — especially if you hand it a feature that's pure noise. Watch what happens when you add one:

```python
import numpy as np

np.random.seed(42)

n = np.array([1000, 3000, 6000, 8000, 10000, 15000, 20000, 22000, 27000, 30000, 35000, 40000], dtype=float)
threads = np.array([1, 2, 10, 1, 9, 2, 1, 10, 1, 3, 12, 2], dtype=float)
cache_temp = np.random.uniform(30, 70, size=12)   # meaningless sensor noise, unrelated to the label
exceeded = np.array([0, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1], dtype=float)
```

`cache_temp` has *nothing to do with* whether a call exceeds its budget — it's random noise. But with only 12 rows and enough tree depth, a greedy tree searching every possible threshold on every feature can sometimes find a `cache_temp` cutoff that, purely by coincidence, happens to separate the training rows well. That's not signal — it's the tree memorizing noise. A single tree trained on this exact 12-row sample has no way to tell the difference between "a real pattern" and "a coincidence that only exists in this specific sample."

---

## 1. Predict

If you trained ten *different* trees, each on a slightly different random resample of these same 12 rows, would you expect all ten to latch onto the *same* coincidental `cache_temp` threshold — or would the coincidence look different (or vanish) in each resample?

---

## 2. Try it: many trees, many random samples

```python
def bootstrap_sample(features, labels):
    indices = np.random.choice(len(labels), size=len(labels), replace=True)
    sampled_features = {name: values[indices] for name, values in features.items()}
    return sampled_features, labels[indices]

boot_features, boot_labels = bootstrap_sample(
    {"n": n, "threads": threads, "cache_temp": cache_temp}, exceeded
)
print(boot_labels)
```

### What this code does

- **`np.random.choice(len(labels), size=len(labels), replace=True)`** — `len(labels)` is `12`, so this draws `12` indices, each chosen uniformly at random from `0` through `11`, **with `replace=True`** — meaning the same index can be drawn more than once, and (as a direct consequence) some indices won't be drawn at all. This is **bootstrap sampling**: a "new" dataset the same size as the original, built by sampling *with replacement* from it.

- **`sampled_features = {name: values[indices] for name, values in features.items()}`** — a dictionary comprehension (seen before in Lesson 3), but note `indices` here isn't a boolean mask like `left`/`right` were — it's an array of *integer positions*, possibly with repeats. `values[indices]` — **integer array indexing** — builds a new array by looking up `values` at each position in `indices`, in order, including duplicates. If `indices` contains `3` twice, `values[3]` appears twice in the output.

- **`labels[indices]`** — the exact same integer-indexing operation applied to `labels`, using the *same* `indices` array, which is essential: whichever rows get duplicated or dropped from the features must be duplicated or dropped identically from the labels, or you'd be pairing the wrong label with the wrong row.

### What happens

Run it a few times (without re-seeding) and `boot_labels` will differ each time — sometimes with a `1` appearing three times and a `0` missing entirely, sometimes the reverse. Each bootstrap sample is a slightly different "view" of the same 12 rows — some rows overrepresented, some entirely absent. **On average**, about a third of the original rows are left out of any given bootstrap sample entirely (a mathematical property of sampling-with-replacement at this sample size, not something the code enforces directly).

**Why `np.random.seed(42)` appears at the very top of the script:** without it, every run of this script would produce different bootstrap samples, different trees, and different printed output — making it impossible to reliably reproduce a specific result (including the trap in Section 6). `np.random.seed(42)` forces NumPy's random number generator to produce the *same* sequence of "random" numbers every time the script runs — genuinely useful randomness for the algorithm's purposes, but perfectly reproducible for debugging, teaching, and testing.

---

## 3. Why: two kinds of randomness, and a vote

Bootstrap sampling alone (what Section 2 demonstrated) is called **bagging** (bootstrap aggregating). A random forest adds a second, independent source of randomness: at *every single split* inside *every tree*, only a random subset of features is even considered — not all of them.

```python
def find_best_split(features, labels, num_features_to_try):
    feature_names = list(features.keys())
    chosen_names = np.random.choice(feature_names, size=num_features_to_try, replace=False)

    best = {"gain": -1, "feature": None, "threshold": None}
    parent_impurity = gini_impurity(labels)
    for name in chosen_names:
        values = features[name]
        for t in np.unique(values):
            left = values <= t
            right = ~left
            if left.sum() == 0 or right.sum() == 0:
                continue
            weighted = (left.sum() * gini_impurity(labels[left]) + right.sum() * gini_impurity(labels[right])) / len(labels)
            gain = parent_impurity - weighted
            if gain > best["gain"]:
                best = {"gain": gain, "feature": name, "threshold": t, "left": left, "right": right}
    return best
```

### Code mechanics (what's new vs. Lesson 3)

- **`np.random.choice(feature_names, size=num_features_to_try, replace=False)`** — this is the *same function* used for bootstrap sampling above, but used differently: `replace=False` means no name can be picked twice, and `feature_names` is a list of strings (`["n", "threads", "cache_temp"]`), not a range of integers. The result is a random subset — e.g., `["threads", "cache_temp"]` — chosen fresh, independently, **every time this function is called**, which means every single split, at every depth, in every tree, gets its own random subset.

- **`for name in chosen_names:`** — the search loop from Lesson 3 is unchanged, except it now only ever considers the handful of names in `chosen_names`, never all of them at once. If `cache_temp` isn't in the randomly chosen subset for a particular split, it's structurally impossible for that split to use it — not "unlikely," genuinely impossible for that one decision.

Now assemble a full forest:

```python
def build_tree(features, labels, depth=0, max_depth=3, num_features_to_try=2):
    if gini_impurity(labels) == 0 or depth == max_depth:
        return {"leaf": True, "prediction": 1 if np.mean(labels) >= 0.5 else 0}
    split = find_best_split(features, labels, num_features_to_try)
    if split["gain"] <= 0:
        return {"leaf": True, "prediction": 1 if np.mean(labels) >= 0.5 else 0}
    left_features = {name: values[split["left"]] for name, values in features.items()}
    right_features = {name: values[split["right"]] for name, values in features.items()}
    return {
        "leaf": False, "feature": split["feature"], "threshold": split["threshold"],
        "left": build_tree(left_features, labels[split["left"]], depth + 1, max_depth, num_features_to_try),
        "right": build_tree(right_features, labels[split["right"]], depth + 1, max_depth, num_features_to_try),
    }

def build_forest(features, labels, num_trees=25, max_depth=3, num_features_to_try=2):
    forest = []
    for _ in range(num_trees):
        boot_features, boot_labels = bootstrap_sample(features, labels)
        tree = build_tree(boot_features, boot_labels, max_depth=max_depth, num_features_to_try=num_features_to_try)
        forest.append(tree)
    return forest

def predict_one(tree, sample):
    if tree["leaf"]:
        return tree["prediction"]
    if sample[tree["feature"]] <= tree["threshold"]:
        return predict_one(tree["left"], sample)
    return predict_one(tree["right"], sample)

def predict_forest(forest, sample):
    votes = [predict_one(tree, sample) for tree in forest]
    return 1 if np.mean(votes) >= 0.5 else 0

forest = build_forest({"n": n, "threads": threads, "cache_temp": cache_temp}, exceeded)
```

- **`for _ in range(num_trees): ... forest.append(tree)`** — `_` is a conventional throwaway variable name, used because the loop counter itself is never needed, only the fact that the body runs `num_trees` times. Each iteration draws a *fresh* bootstrap sample (a new random call, different from every other iteration) and grows a completely independent tree from it.

- **`votes = [predict_one(tree, sample) for tree in forest]`** — a list comprehension: run every tree in the forest on the same `sample`, collecting each tree's individual `0`/`1` prediction into a plain Python list.

- **`return 1 if np.mean(votes) >= 0.5 else 0`** — `np.mean` on a list of `0`s and `1`s gives the *fraction* of trees that voted `1`; if at least half did, the forest's final answer is `1`. This is **majority voting**, and it's the entire payoff of building many trees instead of one: no single tree's individual mistake (including one caused by coincidentally trusting `cache_temp`) can dominate the final answer unless a majority of trees happen to make the *same* mistake.

### Mental model

```
one dataset
        ↓ resample with replacement, N times
N slightly different "views" of the same data
        ↓ grow one tree per view, each also restricted to random feature subsets per split
N somewhat different, imperfect trees
        ↓ each tree votes on a new sample
majority vote
        ↓
a prediction that's wrong only if MOST trees are wrong in the same way
```

---

## 4. Change one thing

Here's the single most important design choice in this whole algorithm, isolated as a diff — restrict the feature search per split, or don't:

```diff
  def find_best_split(features, labels, num_features_to_try):
      feature_names = list(features.keys())
-     chosen_names = feature_names                          # consider ALL features, every split
+     chosen_names = np.random.choice(feature_names, size=num_features_to_try, replace=False)
```

**What changed:** whether the split search considers every available feature every time, or only a small random subset.

**What did not change:** `bootstrap_sample` is untouched — both versions still resample rows with replacement before growing each tree. Both versions are still "bagging" in that sense.

**Why this single line matters more than it looks:** if `n` is simply the strongest feature for most of the training data, then even with different bootstrap samples, the greedy search in `find_best_split` will pick `n` as the very first split *almost every time*, for *almost every tree* — because bootstrap resampling changes *which rows* are present, but it doesn't change the fact that `n` remains the most informative feature on most resamples. Result: with `chosen_names = feature_names` (no restriction), the trees end up structurally very similar near the top — same first split, often same second split — which means they tend to make the *same* mistakes on the *same* kinds of examples. Restricting to a random subset per split *forces* some trees, on some splits, to build around `threads` or even `cache_temp` simply because `n` wasn't in the randomly chosen subset that time — producing trees that genuinely differ from each other in structure, not just in which rows they happened to see.

---

## 5. Put it in the project

```python
test_cases = [
    {"n": 5000, "threads": 1, "cache_temp": 50.0},
    {"n": 12000, "threads": 9, "cache_temp": 62.0},
    {"n": 28000, "threads": 1, "cache_temp": 41.0},
]
for case in test_cases:
    votes = [predict_one(tree, case) for tree in forest]
    confidence = np.mean(votes)
    print(f"n={case['n']:>6} threads={case['threads']:>2}  "
          f"votes: {int(confidence*len(forest))}/{len(forest)}  → "
          f"{'EXCEEDS' if confidence >= 0.5 else 'within budget'}")
```

### Code walkthrough

- **`int(confidence*len(forest))`** — `confidence` is a fraction (like `0.72`); multiplying by `len(forest)` (the total tree count) and converting to `int` recovers the raw count of trees that voted `1`, purely for a more readable printout — `18/25` reads more concretely than `0.72`.

Notice this printout gives you something Lesson 3's single tree never could: a **confidence level**. A single tree only ever says "yes" or "no." A forest can say "22 out of 25 trees agree" versus "13 out of 25" — the second case is a near-coin-flip the single-tree version would have reported with the exact same false confidence as the first.

### Why this design: choosing num_trees and num_features_to_try

**Problem:** `build_forest` was called with `num_trees=25` and (via `build_tree`'s default) `num_features_to_try=2` out of 3 total features. Why these numbers?

**Available choices:** more trees (smoother voting, but more computation, with rapidly diminishing returns past a few hundred), fewer trees (faster, but a handful of trees can still occasionally agree on the same coincidence), a smaller `num_features_to_try` like `1` (maximally decorrelated trees, but each individual tree is weaker/more myopic since it often can't see the best feature at all), or a larger one closer to the total feature count (stronger individual trees, but more correlated — the exact issue from Section 4).

**Selected choice:** `num_features_to_try=2` out of 3 — a common rule of thumb for classification is roughly the square root of the total feature count; with only 3 features here, that rounds up to 2, a genuine restriction without crippling every tree.

**Cost:** with very few features to begin with (like this 3-feature example), there's a real, visible tension between decorrelating trees and leaving each tree enough signal to be individually useful — this tradeoff is much less painful once you have dozens or hundreds of features, which is the more typical real-world setting for random forests.

**Revisit condition:** if you notice through testing that many individual trees in the forest perform barely better than a coin flip, `num_features_to_try` may be too small for how many features you have; if the forest's predictions barely differ from a single tree's, it may be too large.

---

## 6. The trap

**Normal rule:** averaging many models' predictions reduces variance — the more independent the models' individual mistakes are, the more those mistakes cancel out in the vote.

**Apparently equivalent, "simpler" code** — someone reasonably decides the feature-restriction step seems like unnecessary complexity and removes it, keeping only bootstrap resampling:

```python
def find_best_split_bagging_only(features, labels):
    feature_names = list(features.keys())    # ALL features considered, every split — same as Section 4's "before"
    ...
```

**Surprising result:** if you build 25 trees this way and check what feature each one splits on *first*, you'll find the overwhelming majority pick `n` at the very top — because, as established in Section 4, `n` remains the strongest feature across nearly every bootstrap resample. The 25 trees, despite being grown from 25 different random samples, end up structurally similar to each other near the top of the tree. When you then run majority voting over these 25 trees, the forest's predictions barely differ from what a *single* well-grown tree on the full dataset would have produced — you did 25× more computation for only a marginal accuracy improvement.

**Exact reason:** bagging (bootstrap resampling of rows) only randomizes *which examples* each tree sees — it does nothing to stop the greedy split-search from consistently preferring the same dominant feature, given that feature really is informative on most resamples. Statistically, averaging `N` predictions only reduces variance roughly in proportion to how *independent* their errors are; identically-structured trees don't make independent errors, they make the *same* errors on the *same* kinds of inputs, so the averaging step has little left to cancel out. Random feature subsetting (Section 3) is specifically what breaks this correlation, by structurally preventing some trees, at some splits, from even being *allowed* to use the dominant feature.

**Project consequence:** "I built a random forest" doesn't automatically mean you got the variance-reduction benefit random forests are known for — if you (or a library default) accidentally disable feature subsampling, or set `num_features_to_try` equal to the total feature count, you've quietly built 25 correlated trees wearing a forest costume, not a real random forest. This is worth checking directly (as in Section 4's diff) rather than assuming "more trees" alone is doing the work.

---

## 7. Under the hood

*(Optional — not required to build or use a random forest correctly.)*

Because bootstrap sampling leaves out roughly a third of the original rows for any given tree, those left-out rows can be used as a free validation set for *that specific tree* — a technique called **out-of-bag (OOB) error estimation**. Real implementations (like scikit-learn's `RandomForestClassifier`) can report an OOB accuracy estimate without you needing to hold out a separate validation set at all, because every row is "held out" for *some* subset of trees automatically, just by virtue of how bootstrap sampling works. This lesson's from-scratch version doesn't implement OOB scoring, but recognizing *why* it's possible — a direct consequence of how `bootstrap_sample` works — is worth understanding before you rely on it in a real library.

---

## 8. Exercises

- **Predict:** if you set `num_features_to_try=3` (the full feature count, matching the trap in Section 6) and rebuilt the forest, would you expect the votes for the second test case (`n=12000, threads=9, cache_temp=62.0`) to become more unanimous, less unanimous, or stay about the same, compared to `num_features_to_try=2`? Reason it out before testing.
- **Modify:** add a `count_first_splits` function that builds 25 trees and tallies how often each feature name appears as the *very top* split (`tree["feature"]` on the root node only, before recursing). Run it once with `num_features_to_try=3` and once with `num_features_to_try=2`, and compare the tallies — this directly measures the correlation problem from Section 6.
- **Break:** set `num_trees=1`. Confirm that `predict_forest` now behaves identically to a single call to `predict_one` — explain, in terms of the `votes` list and `np.mean`, exactly why a "forest" of one tree can never disagree with itself.
- **Trace:** for the first test case (`n=5000, threads=1, cache_temp=50.0`), imagine two specific trees in the forest disagree — one says `0`, one says `1` — while the other 23 say `0`. Walk through what `votes`, `confidence`, and the final printed line would look like, without running the code.

---

## What to remember

- Random forests combine two independent sources of randomness — resampling *rows* (bagging) and restricting *features considered per split* — and both matter; bagging alone often isn't enough to decorrelate the trees.
- Averaging reduces error only when the things being averaged make somewhat independent mistakes; a "forest" of nearly identical trees gives you the computational cost of an ensemble without most of the statistical benefit.
- Unlike a single tree, a forest can report a *confidence* (vote fraction), which is often more useful in practice than a bare yes/no — a near-tied vote is meaningfully different information from a unanimous one, even though a single tree can't express that difference at all.

## Next lesson

Random forests build many trees *independently* and let them vote afterward — no tree ever knows what the others got wrong. There's a completely different way to combine trees: build them **one at a time, in sequence**, where each new tree is trained specifically to correct the mistakes the trees before it made. That's boosting — and it brings gradients, in a new disguise, right back into the picture.
