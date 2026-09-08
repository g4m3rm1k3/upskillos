# Lesson 3 — When One Straight Line Isn't Enough: Decision Trees

## What you'll learn
- Why some patterns can't be captured by any single linear boundary — no matter how you tune `w` and `b`.
- An entirely different learning mechanism: no gradients, no learning rate, just recursively asking "which yes/no question best separates these examples?"
- A real, well-known limitation of greedy decision trees — the kind of edge case that shows up in interview questions and in production bugs alike.

## What you'll build
A decision tree, built from scratch with recursion (no library), that predicts whether a service call will exceed its time budget — this time using **two** features together, because the real rule genuinely depends on both.

---

## The question

Your monitoring data now tracks two things per call: `n` (input size) and `threads` (how many concurrent threads were contending for the same resource). The real rule turns out to be:

> exceeds budget if `n` is very large on its own, **or** if `n` is moderately large **and** contention is high.

| n | threads | exceeded? |
|---|---|---|
| 1,000  | 1  | no |
| 3,000  | 2  | no |
| 6,000  | 10 | **yes** |
| 8,000  | 1  | no |
| 10,000 | 9  | **yes** |
| 15,000 | 2  | no |
| 20,000 | 1  | no |
| 22,000 | 10 | **yes** |
| 27,000 | 1  | **yes** |
| 30,000 | 3  | **yes** |
| 35,000 | 12 | **yes** |
| 40,000 | 2  | **yes** |

Look at rows 3, 4, and 5: `n=6,000` (yes), `n=8,000` (no), `n=10,000` (yes). As `n` alone increases, the label goes yes → no → yes. **No single threshold on `n` can separate that sequence.** You genuinely need both columns.

---

## 1. Predict

Before writing anything: could logistic regression from Lesson 2 — a single straight decision boundary, even across both `n` and `threads` — perfectly separate this data? (Hint: a straight boundary in 2D is still one line; look again at rows 3–5 and ask whether *any* single line, in any orientation, can put row 3 and row 5 on the "yes" side while keeping row 4 on the "no" side, given row 4 has a larger `n` than row 3.)

---

## 2. Try it (and watch a single feature fail)

```python
import numpy as np

n = np.array([1000, 3000, 6000, 8000, 10000, 15000, 20000, 22000, 27000, 30000, 35000, 40000], dtype=float)
threads = np.array([1, 2, 10, 1, 9, 2, 1, 10, 1, 3, 12, 2], dtype=float)
exceeded = np.array([0, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1], dtype=float)

def gini_impurity(labels):
    if len(labels) == 0:
        return 0.0
    p1 = np.mean(labels)
    p0 = 1 - p1
    return 1 - p0**2 - p1**2

def best_threshold_single_feature(feature, labels):
    parent_impurity = gini_impurity(labels)
    best_gain, best_thresh = -1, None
    for t in np.unique(feature):
        left = feature <= t
        right = ~left
        if left.sum() == 0 or right.sum() == 0:
            continue
        weighted = (left.sum() * gini_impurity(labels[left]) + right.sum() * gini_impurity(labels[right])) / len(labels)
        gain = parent_impurity - weighted
        if gain > best_gain:
            best_gain, best_thresh = gain, t
    return best_thresh, best_gain

thresh, gain = best_threshold_single_feature(n, exceeded)
print(f"best n-only threshold: {thresh}, gain: {gain:.3f}")
```

### What this code does

- **`gini_impurity(labels)`** — a new kind of "how wrong is this" measurement, but for *sets*, not predictions. `np.mean(labels)` on an array of `0`s and `1`s computes the fraction that are `1` — call it `p1`. `p0 = 1 - p1` is the fraction that are `0`. `1 - p0**2 - p1**2` is the Gini formula: if a set is all one class (`p1=0` or `p1=1`), this evaluates to `1 - 1 - 0 = 0` — **zero impurity, perfectly pure**. If a set is an even 50/50 mix, it's `1 - 0.25 - 0.25 = 0.5` — **maximum impurity for two classes**. This is a measurement of *mixedness*, not of prediction error — there's no "prediction" yet at this stage, only groups of labels.

- **`if len(labels) == 0: return 0.0`** — a guard clause: an empty group has no mixedness to speak of; without this, `np.mean([])` would produce a runtime warning and `nan`.

- **`for t in np.unique(feature):`** — `np.unique` returns the sorted, duplicate-free values present in `feature`. Each one is tried as a candidate split point — "what if I split the data into `feature <= t` and `feature > t`?"

- **`left = feature <= t`** — this is not a filter yet; `feature <= t` produces a new NumPy array of `True`/`False` values, one per original element — a **boolean mask**, the same length as `feature`.

- **`right = ~left`** — `~` is the elementwise boolean NOT operator applied to an array; every `True` becomes `False` and vice versa. `right` is the exact complement of `left`.

- **`if left.sum() == 0 or right.sum() == 0: continue`** — summing a boolean array counts how many `True` values it has (Python treats `True` as `1` in arithmetic contexts). If a threshold puts *everything* on one side, that's not a useful split — `continue` skips to the next candidate `t` without evaluating it further.

- **`labels[left]`** — **boolean mask indexing**: this selects only the elements of `labels` where the corresponding position in `left` is `True`. This is not the same as `labels[0]` or slicing — it's filtering by a parallel array of booleans, and it works because `left` and `labels` are the same length and correspond position-by-position.

- **`weighted = (left.sum() * gini_impurity(labels[left]) + right.sum() * gini_impurity(labels[right])) / len(labels)`** — a weighted average of the two groups' impurities, weighted by how many examples fall in each group (a split that makes one tiny pure group and one huge mixed group shouldn't score as well as an even, cleanly-split one — the weighting accounts for this).

- **`gain = parent_impurity - weighted`** — how much purer the data becomes *after* this split compared to *before* it. Positive gain means the split helped; the loop tracks whichever `t` produces the largest gain.

### What happens

Run it, and you'll see a best gain that's positive but not enough to fully separate the classes — whatever threshold wins, at least one side still contains a mix of `0`s and `1`s, because rows 3, 4, and 5 (`n=6000→yes, n=8000→no, n=10000→yes`) can never be untangled using `n` alone. The impurity after the best possible single-feature split is *better than nothing*, but not zero.

---

## 3. Why: greedy recursive splitting

**The mechanism** has no gradient, no learning rate, nothing from the last two lessons. It's a different algorithm entirely:

1. Look at the current group of examples. Measure how mixed it is (Gini impurity).
2. Try every possible threshold, on every available feature, and measure how much each candidate split would reduce that impurity.
3. Take the single best split. Divide the data into two groups accordingly.
4. **Repeat steps 1–3 separately on each of the two new groups** — this is where recursion enters — until a group is pure, or you hit a depth limit.

```python
def find_best_split(features, labels):
    best = {"gain": -1, "feature": None, "threshold": None}
    parent_impurity = gini_impurity(labels)
    for name, values in features.items():
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

def build_tree(features, labels, depth=0, max_depth=2):
    if gini_impurity(labels) == 0 or depth == max_depth:
        return {"leaf": True, "prediction": 1 if np.mean(labels) >= 0.5 else 0}

    split = find_best_split(features, labels)
    if split["gain"] <= 0:
        return {"leaf": True, "prediction": 1 if np.mean(labels) >= 0.5 else 0}

    left_features = {name: values[split["left"]] for name, values in features.items()}
    right_features = {name: values[split["right"]] for name, values in features.items()}

    return {
        "leaf": False,
        "feature": split["feature"],
        "threshold": split["threshold"],
        "left": build_tree(left_features, labels[split["left"]], depth + 1, max_depth),
        "right": build_tree(right_features, labels[split["right"]], depth + 1, max_depth),
    }

tree = build_tree({"n": n, "threads": threads}, exceeded, max_depth=2)
```

### Code mechanics

- **`{"n": n, "threads": threads}`** — a dictionary literal mapping feature *names* (strings) to their NumPy arrays. This lets `find_best_split` try every feature by name without hardcoding "try `n`, then try `threads`" as separate lines — `for name, values in features.items():` iterates over both automatically, and a third feature could be added with zero changes to the splitting logic.

- **`find_best_split`** is the single-feature version from Section 2, generalized: the outer `for name, values in features.items()` loop tries *each column*, and the inner `for t in np.unique(values)` loop tries every threshold within that column — so this now searches across `n`'s thresholds *and* `threads`'s thresholds, keeping whichever single (feature, threshold) pair gives the highest gain.

- **`build_tree(features, labels, depth=0, max_depth=2)`** — `depth` and `max_depth` have default values (`0` and `2`), meaning they don't need to be supplied on the *first* call, but recursive calls explicitly pass `depth + 1` to track how deep the recursion has gone.

- **`if gini_impurity(labels) == 0 or depth == max_depth:`** — the **base case** of the recursion. Every recursive function needs one: a condition that stops the recursion instead of calling itself again. Here, two independent reasons to stop: the group is already pure (nothing left to split), or you've hit the depth limit (a deliberate design choice, covered in Section 5).

- **`return {"leaf": True, "prediction": ...}`** — a dictionary representing a **leaf node**: no further splitting, just a final answer. `1 if np.mean(labels) >= 0.5 else 0` is a conditional expression picking the majority class in this group as the prediction.

- **`if split["gain"] <= 0: return {"leaf": True, ...}`** — a second stopping condition, independent of depth or purity: if *no* split actually helps (best gain isn't positive), stop here too rather than splitting pointlessly. **This exact line is the one responsible for the trap in Section 6.**

- **`{name: values[split["left"]] for name, values in features.items()}`** — a **dictionary comprehension**: build a new dictionary with the same keys (`"n"`, `"threads"`), but with each array filtered down to only the rows that went to the left side of the split. This is how the recursive call receives a smaller dataset — the original `n` and `threads` arrays are never mutated, new filtered copies are created at each level.

- **`"left": build_tree(left_features, labels[split["left"]], depth + 1, max_depth)`** — this is the recursive call: `build_tree` calling itself, with a smaller dataset and an incremented depth. The dictionary being constructed (`{"leaf": False, "feature": ..., "left": ..., "right": ...}`) isn't finished being built until *both* recursive calls (`left` and `right`) have themselves fully finished — including all of *their* recursive calls. The tree is built bottom-up in terms of when each piece finishes, even though you read the code top-down.

### Execution trace (conceptual, for the top call)

```
1. build_tree(all 12 rows) checks: not pure, depth 0 ≠ max_depth 2 → keep going
2. find_best_split tries every threshold on BOTH n and threads
3. best split found: probably "n <= 20000" or similar — separates most of the
   clear no's from clear yes's, though not perfectly (rows 3 and 5 are still
   on the "no" side numerically, since n=6000 and n=10000 are both ≤ 20000)
4. data splits into left_features (n ≤ threshold) and right_features (n > threshold)
5. build_tree(left group, depth=1) is called — it recurses AGAIN, likely
   finding that "threads" is now the useful feature to split on, since within
   the low-n group, threads is what separates rows 3 and 5 (high threads,
   exceeded) from rows like row 4 (low threads, not exceeded)
6. build_tree(right group, depth=1) is called separately — likely already
   pure or close to it, since large n alone usually means "yes"
7. once both recursive calls return, the top-level dictionary is complete
```

### Mental model

```
is this group already all one label?  → yes → leaf, done
        ↓ no
try every threshold on every feature
        ↓
keep the split that reduces mixedness the most
        ↓
divide into two groups
        ↓
recurse on EACH group independently, as if it were a brand new problem
        ↓
stop when pure, or out of depth, or no split helps anymore
```

---

## 4. Change one thing

The entire reason this dataset is solvable is a single design choice in `find_best_split` — searching across *both* features instead of one:

```diff
- def best_threshold_single_feature(feature, labels):
-     ...
-     for t in np.unique(feature):
+ def find_best_split(features, labels):
+     ...
+     for name, values in features.items():
+         for t in np.unique(values):
```

**What changed:** the function signature goes from accepting one array (`feature`) to accepting a dictionary of named arrays (`features`), and a new outer loop iterates over that dictionary before the existing threshold loop runs.

**What did not change:** the impurity math itself — `gini_impurity`, the weighted-average formula, and the gain calculation are copied over completely untouched. Nothing about *how a split is scored* changed; only *how many candidate splits get scored* changed.

**Behavioral consequence:** with only `n` available, rows 3–5 (`6000→yes, 8000→no, 10000→yes`) could never be separated (Section 2). With `threads` also available, the recursive call on the low-`n` group can find that `threads <= 5` vs `threads > 5` separates those exact rows cleanly — a feature that was completely invisible to the single-feature version. **Adding a feature to a decision tree's search space is often a bigger lever than tuning any hyperparameter** — this is a very different intuition than gradient-based models, where you're usually tuning existing numbers rather than expanding what the algorithm is even allowed to look at.

---

## 5. Put it in the project

```python
def predict(tree, sample):
    if tree["leaf"]:
        return tree["prediction"]
    if sample[tree["feature"]] <= tree["threshold"]:
        return predict(tree["left"], sample)
    return predict(tree["right"], sample)

test_cases = [
    {"n": 5000, "threads": 1},
    {"n": 12000, "threads": 9},
    {"n": 28000, "threads": 1},
]
for case in test_cases:
    result = predict(tree, case)
    print(f"n={case['n']:>6} threads={case['threads']:>2}  → {'EXCEEDS' if result else 'within budget'}")
```

### Code walkthrough

- **`predict(tree, sample)`** — another recursive function, but simpler than `build_tree`: its base case is `if tree["leaf"]:`, returning immediately once it reaches a leaf.
- **`sample[tree["feature"]]`** — `tree["feature"]` evaluates to a string like `"n"` or `"threads"` (stored when the tree was built); `sample[...]` then uses that string to look up the matching value in the `sample` dictionary. This is why `build_tree` stored feature *names*, not just positions — it lets `predict` ask "what was this sample's value for whichever feature this exact node happened to split on," without `predict` needing to know in advance which features exist.
- **`return predict(tree["left"], sample)`** — recursion again: descend into whichever branch matches the comparison, passing the *same* `sample` down, since the sample itself doesn't change, only which node of the tree you're looking at.

One genuinely useful property of trees that gradient-based models don't give you for free: you can print the *reasoning*, not just the answer, by walking the same structure and logging each decision instead of just returning a value — worth trying as an exercise below.

### Why this design: choosing max_depth

**Problem:** `build_tree` was called with `max_depth=2`. Why not let it grow until every leaf is perfectly pure?

**Available choices:** `max_depth=2` (shallow, current choice), no depth limit at all (grow until every leaf is pure), or a depth limit tuned via a held-out validation set (a technique for a later lesson).

**Selected choice:** a small, fixed depth limit.

**Reason:** with only 12 training examples, a tree allowed to grow without limit can carve out a separate branch for *every single row*, including any noise — it will fit the training data perfectly and generalize terribly. This is the same overfitting concern from Lesson 1's bridge, just showing up in a completely different algorithm.

**Cost:** a shallow tree might miss a genuinely useful, more specific pattern buried three or four splits deep, if the data actually contained one.

**Revisit condition:** if you have far more training data (hundreds or thousands of rows instead of 12), a deeper tree becomes safer, because there's enough data to support more specific splits without each one being based on just one or two examples.

---

## 6. The trap

**Normal rule:** `find_best_split` should reliably find *some* useful split whenever the data isn't already pure, because there's always a way to separate a mixed group somewhat.

**Apparently equivalent, perfectly reasonable data** — a small XOR-style dataset:

```python
xor_a = np.array([0, 0, 1, 1], dtype=float)
xor_b = np.array([0, 1, 0, 1], dtype=float)
xor_label = np.array([0, 1, 1, 0], dtype=float)   # label = a XOR b

split = find_best_split({"a": xor_a, "b": xor_b}, xor_label)
print(split["gain"])
```

**Surprising result:** `split["gain"]` prints `0.0` (or a value so close to it that `if split["gain"] <= 0` triggers) — even though `a` and `b` *together* perfectly determine the label. `build_tree` on this data returns a single leaf predicting the majority class, essentially a coin flip, despite the data being 100% predictable in principle.

**Exact reason:** check what a split on `a <= 0` alone does to the labels: the left group (`a=0`) has labels `[0, 1]` — still perfectly mixed. The right group (`a=1`) has labels `[1, 0]` — also perfectly mixed. Splitting on `a` alone doesn't reduce impurity *at all*, because knowing `a` alone tells you nothing about the label — you need to know `a` **and** `b` together. The same is true splitting on `b` alone. Since `find_best_split` only evaluates the impurity improvement from **one split at a time**, and every single-feature split here yields zero gain, the algorithm has no signal telling it "split anyway, because the *next* split will reveal everything." It's greedy — it can't see two moves ahead.

**Project consequence:** if a real feature pair interacts this way — individually uninformative, jointly decisive — a plain greedy decision tree, exactly as built here, will silently miss it and hand back a near-coin-flip leaf, with no error or warning. This isn't a coding bug; it's a structural blind spot of greedy, single-split-at-a-time algorithms. It's also *exactly* the kind of pattern that combining many trees (each built on a different random subset of data or features) can sometimes stumble onto by chance, even when no single tree can find it deliberately — which is the idea behind the next lesson.

---

## 7. Under the hood

*(Optional — not required to build or use decision trees correctly.)*

Real decision tree implementations (like scikit-learn's) don't recompute `np.unique` and re-scan every threshold from scratch at every node the way this from-scratch version does — they typically pre-sort each feature once and scan efficiently, and often support alternative impurity measures like entropy (information gain) instead of Gini, which behaves similarly but isn't identical numerically. They also usually support "if no split improves things right now, try letting it split anyway up to a small tolerance" as a way to partially work around the exact greedy blind spot demonstrated in Section 6 — though no amount of tuning make a purely greedy, single-split-at-a-time search see arbitrarily deep interactions for free.

---

## 8. Exercises

- **Predict:** for the original 12-row dataset, before running `build_tree`, guess which feature the *very first* split will use — `n` or `threads` — and why, based on which one you think can separate the largest, cleanest chunk of the data in one cut.
- **Modify:** change `predict` so that instead of just returning `0` or `1`, it also returns (or prints) the sequence of decisions it made — e.g., `"n=12000 <= 20000 → threads=9 > 5 → EXCEEDS"`. This is the "explainability" property mentioned in Section 5.
- **Break:** set `max_depth=10` on the original 12-row dataset and inspect the resulting tree (print it, or count how many leaf nodes it has). Does it end up more complex than necessary, given only 12 training rows? What would you expect to happen if you tested this deep tree on a 13th row it had never seen?
- **Repair:** using the XOR dataset from Section 6, modify `build_tree`'s stopping condition so that it's allowed to make one split even when `gain <= 0`, purely to test whether the *next* level down reveals a useful pattern. (Hint: you'll need to remove or loosen the `if split["gain"] <= 0: return leaf` line for at least the first call.) Confirm that after this change, the tree can perfectly predict XOR.

---

## What to remember

- Some patterns can't be separated by any single line, no matter how it's oriented — decision trees handle this by asking a *sequence* of yes/no questions instead of drawing one boundary.
- A decision tree's "training" is a completely different mechanism from gradient descent — greedy recursive splitting by impurity reduction, with no gradients or learning rate involved at all.
- Greedy, one-split-at-a-time search has a real blind spot: features that are only informative *in combination* (like XOR) can look completely useless to a single split, causing the algorithm to stop early even when a perfect answer exists one level deeper.

## Next lesson

You just watched a single decision tree go blind on a pattern it structurally couldn't see in one step. The fix production systems actually use isn't "build one smarter tree" — it's building *many* imperfect trees, each seeing a different random slice of the data or features, and combining their votes. That's a random forest, and it turns the previous lesson's weakness into the next lesson's whole design principle.
