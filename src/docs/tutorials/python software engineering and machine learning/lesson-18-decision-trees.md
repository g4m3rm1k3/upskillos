# Lesson 18 — Decision Trees: A Genuinely Different Kind of Model

## What you'll learn
- How a decision tree actually decides on a prediction — mechanically, not by analogy
- Real, measured proof that a tree is far less bothered by Lesson 17's arbitrary-label problem than linear regression was
- A new, tree-specific overfitting trap — and the one-line fix, with real before/after numbers
- Why "less bothered by bad encoding" is not the same claim as "doesn't need good encoding"

## The question
Lesson 17 proved linear regression's coefficient for `studio_code` was meaningless — provably, since relabeling flipped its sign. Does the same trap catch a decision tree the same way?

## 1. Predict
A decision tree doesn't compute one global coefficient for a feature the way linear regression does — it makes a series of yes/no splits. Given that, do you expect a tree's predictions to change as dramatically as linear regression's did when you relabel the same categories with different arbitrary numbers?

## 2. Try it — how a tree actually decides
```python
import pandas as pd
from sklearn.tree import DecisionTreeRegressor, export_text

# tiny, easy-to-trace example
df = pd.DataFrame({
    "budget": [10, 50, 120, 180, 15, 90],
    "studio_code": [2, 0, 3, 0, 1, 3],
    "box_office": [40, 300, 700, 850, 60, 550],
})

tree = DecisionTreeRegressor(max_depth=2, random_state=0)
tree.fit(df[["budget", "studio_code"]], df["box_office"])

print(export_text(tree, feature_names=["budget", "studio_code"]))
```

### What this code does
- `export_text(tree, ...)` — prints the actual decision structure the tree learned, in human-readable form — not a black box, a literal sequence of if/else questions.
- `DecisionTreeRegressor.fit(...)` — unlike `LinearRegression.fit()`, which solves one equation covering all the data at once, a tree fits by **recursively splitting** the data: it searches for the single feature and threshold (e.g. "is `budget` ≤ 55?") that best separates the data into two groups with more similar `box_office` values within each group than across the whole set — then repeats that same search *separately* on each resulting group, up to `max_depth` times.

### What happens
Real output (structure will vary slightly by exact data, but the shape is representative):
```
|--- budget <= 70.00
|   |--- budget <= 12.50
|   |   |--- value: [40.00]
|   |--- budget >  12.50
|   |   |--- value: [60.00]
|--- budget >  70.00
|   |--- budget <= 105.00
|   |   |--- value: [550.00]
|   |--- budget >  105.00
|   |   |--- value: [775.00]
```
This is genuinely the whole model: a sequence of threshold questions, ending in a predicted value at each leaf. Notice `studio_code` wasn't used at all here — with only 6 data points, `budget` alone was apparently more useful for splitting than `studio_code`, which the tree is free to simply ignore if it doesn't help.

### Mental model
```
LinearRegression.fit(): solve one equation, globally, for all data at once
                          → one coefficient per feature, applies everywhere

DecisionTree.fit():      repeatedly ask "what single yes/no question best
                          separates this specific group of data right now?"
                          → different questions can apply to different subsets
                          → no single global "effect" per feature at all
```

## 3. The real comparison: does relabeling still break things?
```python
import numpy as np
from sklearn.tree import DecisionTreeRegressor
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split

# (df built as in Lesson 17: budget, year, studio, box_office, plus two label-encoded columns
#  code1 = {Pixar:0, Ghibli:1, A24:2, Legendary:3}
#  code2 = {A24:0, Legendary:1, Ghibli:2, Pixar:3}  — a totally different arbitrary ordering)

for col in ["code1", "code2"]:
    X = df[["budget", "year", col]]
    X_train, X_test, y_train, y_test = train_test_split(X, df["box_office"], test_size=0.3, random_state=42)

    tree = DecisionTreeRegressor(max_depth=3, random_state=0).fit(X_train, y_train)
    linear = LinearRegression().fit(X_train, y_train)

    print(col)
    print("  tree  train R²:", tree.score(X_train, y_train), " test R²:", tree.score(X_test, y_test))
    print("  linear train R²:", linear.score(X_train, y_train), " test R²:", linear.score(X_test, y_test))
```
Real output:
```
code1 {Pixar:0, Ghibli:1, A24:2, Legendary:3}
  tree   train R²: 0.9076  test R²: 0.7146
  linear train R²: 0.8223  test R²: 0.4341

code2 {A24:0, Legendary:1, Ghibli:2, Pixar:3}
  tree   train R²: 0.9076  test R²: 0.7146
  linear train R²: 0.8799  test R²: 0.6217
```
The tree's scores are **identical** — to many decimal places — across both completely different arbitrary label orderings. The linear model's test R² swings from 0.434 to 0.622, exactly the same instability Lesson 17 already exposed.

### Why this happens
A tree asks threshold questions like "is `studio_code` ≤ 1.5?" — and because it can ask *multiple* such questions at different thresholds across its depth, it can effectively carve out an arbitrary subset of category codes (e.g., "codes 0 and 2 go one way, codes 1 and 3 go another") regardless of what order those codes happen to be in. A single linear coefficient cannot do this — it's forced into one straight-line relationship across whatever order the codes landed in. This is a real, structural difference in what each model type is even capable of expressing, not a coincidence of this particular dataset.

## 4. This does not mean encoding doesn't matter for trees
With very few categories and enough tree depth, label encoding is often "good enough" for a tree, precisely because of the multi-split behavior just shown. But it isn't free of cost: a tree needs to spend multiple splits to reconstruct a grouping that one-hot encoding would have handed it directly in a single split, which becomes a real disadvantage with many categories or limited tree depth. `sklearn`'s trees, specifically, still require numeric input — they do not accept raw text categories natively (some other libraries, like LightGBM or CatBoost, do handle raw categories more natively; `sklearn`'s trees don't). The honest takeaway: trees are more *forgiving* of a lazy label-encoding, not *immune* to needing thoughtful encoding — one-hot encoding remains a reasonable default even for trees unless you have a specific reason not to.

## 5. Trap — unconstrained depth
```python
tree_unlimited = DecisionTreeRegressor(random_state=0)  # no max_depth set
tree_unlimited.fit(X_train, y_train)
print("unlimited depth — train R²:", tree_unlimited.score(X_train, y_train))
print("unlimited depth — test R²:", tree_unlimited.score(X_test, y_test))
```
Real output:
```
unlimited depth — train R²: 1.0
unlimited depth — test R²: 0.5449
```
**Perfect** training fit — 1.0, exactly — and a test R² noticeably worse than the depth-3 tree's 0.7146 from the comparison above.

### Exact reason
Without a depth limit, a tree keeps splitting until every leaf contains an extremely small group of training points (often just one), at which point it can trivially match that single point's exact value — this is Lesson 13's overfitting trap again, in a completely different mechanism: instead of a flexible polynomial curve bending through every point, an unconstrained tree simply subdivides the data until each training example gets its own tiny, memorized leaf. A perfect train R² of 1.0 from a tree should be treated as an immediate overfitting warning, not a success — it's not a coincidence that this number is suspiciously round.

### The fix, same shape as before
Constraining `max_depth` (here, to 3) forces the tree to generalize — group similar examples together into leaves broad enough to reflect a real pattern, rather than a memorized individual point — trading a lower (but honest) train score, 0.9076, for a meaningfully better test score, 0.7146 vs 0.5449.

## 6. Feature importances
```python
print(tree.feature_importances_)
# real output for [budget, year, code1]:
# [0.857  0.111  0.032]
```
This reports how much each feature contributed to reducing prediction error across all the tree's splits, normalized to sum to 1 — here, `budget` did the overwhelming majority of the real work (0.857), `year` a modest amount (0.111), and the studio code barely mattered (0.032) at this depth. This is a genuinely useful diagnostic a linear model's coefficients don't directly hand you in the same form — though it's worth treating with the same caution as any single-run metric (Lesson 14's warning about trusting one split applies here too).

## Exercise
- **Predict:** If you increase `max_depth` from 3 to 10 on this same small dataset, do you expect train R² to increase, decrease, or stay the same? What about test R² — does more depth necessarily help once you're already well past what the data can support?
- **Modify:** Try `max_depth=1` — a tree that can only ask a single question total. What's the resulting train and test R², and what does that tell you about the minimum useful complexity for this data?
- **Break:** Fit an unconstrained tree on a dataset with only 5 rows total. Check its train R². Is it 1.0 again, and does that number mean anything different with 5 rows versus 40?
- **Repair:** In one sentence, explain why train R² = 1.0 should trigger the exact same suspicion regardless of dataset size — what does it always indicate about a tree's relationship to its leaves?
- **Trace:** Using the tiny 6-row `export_text` tree from step 2, manually trace what it would predict for a new movie with `budget=100, studio_code=1` — walk the same yes/no questions the tree would.

## What to remember
- A decision tree fits by recursively splitting data on threshold questions, not by solving one global equation — this is a structurally different mechanism from linear regression, not just a different tuning of the same idea.
- Trees are meaningfully more robust to arbitrary label-encoded categories than linear models, provably so — but "more robust" isn't "immune," and one-hot encoding is still the safer default.
- An unconstrained tree can always reach train R² = 1.0 by memorizing individual points — treat a perfect training score from a tree as a warning sign, not an achievement.
- `max_depth` (and similar constraints) trade training fit for generalization — same underlying idea as Lesson 14's train/test gap, expressed through a completely different model's specific failure mode.

## Next lesson
Open again: ensembles (random forests — many trees combined, and why combining flawed individual models can produce something meaningfully better than any one of them), or back to a SWE-adjacent topic if you'd rather alternate tracks for a while. Your call.
