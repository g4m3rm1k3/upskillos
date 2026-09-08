# Lesson 14 — Train/Test Splits: Actually Checking If It Generalizes

## What you'll learn
- Why measuring a model against the data it trained on can't answer the question that actually matters
- What `train_test_split` does mechanically, and why the split has to happen *before* any fitting
- Real, measured proof of Lesson 13's overfitting trap — a model that looks better and is actually worse
- How to read train R² next to test R² as a diagnostic, not just two separate scores

## The question
Lesson 13 ended on a warning: a flexible model can fit training data almost perfectly while learning nothing generalizable. That was stated as a risk. This lesson measures it directly — same idea, actual numbers, on data the model genuinely never saw.

## 1. Predict
If you fit a straight line on 21 movies and then check its R² on those same 21 movies versus on 9 *different* movies it never trained on, do you expect the test-set R² to be higher, lower, or about the same as the training-set R²? What about a much more flexible curve (a high-degree polynomial) — same question?

## 2. Try it
```python
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split

np.random.seed(7)
budget = np.random.uniform(1, 200, 30)
box_office = 3.5 * budget + 150 + np.random.normal(0, 80, 30)
budget = budget.reshape(-1, 1)

X_train, X_test, y_train, y_test = train_test_split(budget, box_office, test_size=0.3, random_state=42)

print("train size:", len(X_train), "test size:", len(X_test))

model = LinearRegression()
model.fit(X_train, y_train)

print("train R²:", model.score(X_train, y_train))
print("test R²:", model.score(X_test, y_test))
```

### What this code does
- `np.random.uniform(1, 200, 30)` — generates 30 random budgets. `box_office = 3.5 * budget + 150 + np.random.normal(0, 80, 30)` builds box office values that genuinely follow a linear trend (slope 3.5, intercept 150) **plus random noise** — this matters: real movies don't sit exactly on a line, so simulating that noise honestly, rather than using perfectly clean synthetic data, is what makes the coming comparison meaningful instead of artificially clean.
- `train_test_split(budget, box_office, test_size=0.3, random_state=42)` — this is the actual new concept. It randomly divides the 30 (budget, box_office) pairs into two groups: 70% (21 movies) for training, 30% (9 movies) held back entirely. `random_state=42` fixes the randomness so the same split happens every time you run this — reproducibility, not a magic number.
- Critically, `X_test`/`y_test` are **never passed to `.fit()`**, anywhere. The model has literally no access to these 9 movies during training — this isn't a metaphor, it's a hard separation enforced by which variables get passed to which function calls.
- `model.score(X_train, y_train)` — R² measured against data the model trained on (same as Lesson 13).
- `model.score(X_test, y_test)` — R² measured against the 9 movies the model has never once seen. This is the number that actually answers "does this generalize."

### What happens
Real output from running this exact code:
```
train size: 21 test size: 9
train R²: 0.791
test R²: 0.737
```
Test R² (0.737) is a bit lower than train R² (0.791) — expected, and not alarming: a model almost always performs slightly worse on data it hasn't seen, since training data is, by definition, the data it directly optimized against. A modest gap like this is a healthy sign, not a red flag.

## 3. Why?
### Code mechanics
`train_test_split` has to happen **before** `fit()`, and the test portion has to stay completely untouched by the fitting process, or the entire measurement becomes meaningless — if even a little test data leaked into training (directly, or indirectly through something like using test data to help pick which features to use), the resulting test score would no longer be measuring "performance on unseen data," it'd be measuring "performance on data that influenced the model somehow," which defeats the entire purpose.

### Runtime behavior
The split itself is just index selection — under the hood, `train_test_split` shuffles the row indices, then divides them at the 70/30 boundary you specified. Nothing about this touches the model or the fitting algorithm at all; it's purely a data-partitioning step that happens first.

### Mental model
```
30 movies
    ↓ train_test_split (before fitting anything)
21 movies (train)  +  9 movies (test, set aside, untouched)
    ↓ fit() sees ONLY the 21
model learns slope & intercept from 21 movies
    ↓ score() on train  → 0.791  (how well it fits what it learned from)
    ↓ score() on test   → 0.737  (how well it generalizes to genuinely new movies)
```

## 4. Now the overfitting trap from Lesson 13 — measured for real
```python
from sklearn.preprocessing import PolynomialFeatures
from sklearn.pipeline import make_pipeline

poly_model = make_pipeline(PolynomialFeatures(degree=9), LinearRegression())
poly_model.fit(X_train, y_train)

print("poly(degree 9) train R²:", poly_model.score(X_train, y_train))
print("poly(degree 9) test R²:", poly_model.score(X_test, y_test))
```
Real output:
```
poly(degree 9) train R²: 0.862
poly(degree 9) test R²: 0.477
```

### What changed vs. the plain line
- `PolynomialFeatures(degree=9)` — instead of fitting `box_office = m·budget + b`, this generates `budget¹, budget², budget³, ..., budget⁹` as extra input columns, then fits a linear regression on top of *all* of them — effectively fitting a 9th-degree curve, with 9 separate coefficients instead of 1 slope.
- `make_pipeline(...)` — chains the feature transformation and the model together so `fit`/`predict`/`score` apply both steps in sequence automatically.

### The actual comparison, side by side
```
                train R²    test R²
straight line:    0.791      0.737     ← small, expected gap
degree-9 curve:   0.862      0.477     ← train score UP, test score DOWN, hard
```
The degree-9 model's train R² is genuinely higher than the line's (0.862 vs 0.791) — by the training-data-only measure from Lesson 13, it looks like the better model. Its test R² is dramatically *worse* (0.477 vs 0.737) — on movies it never trained on, the simple straight line beats the fancier curve by a wide margin. This is Lesson 13's warning, now with real numbers: a training-only comparison would have picked the objectively worse model.

## 5. Why does this happen, mechanically?
With 9 separate coefficients to freely adjust against only 21 training points, the degree-9 curve has enough flexibility to bend itself around the specific random noise in *this particular* set of 21 movies — fitting quirks that have no relationship to the real underlying pattern (`3.5 × budget + 150`), because those quirks are just this specific sample's random variation, not a real pattern that would repeat in a different set of movies. The straight line, with only 2 numbers to adjust (slope and intercept), simply doesn't have enough flexibility to chase noise this way — which is precisely why it does *better*, not worse, on new data.

## 6. Trap
**Normal rule:** train/test splitting reveals overfitting reliably.
**Apparently equivalent code:** running `train_test_split` once, getting a good-looking test score, and considering the model validated.
**Surprising result:** re-run the exact same split code with a different `random_state` (say, `random_state=1` instead of `42`), and the resulting test R² for the same model can shift meaningfully — sometimes noticeably better, sometimes noticeably worse — purely because a different random 9-movie subset ended up in the test set.
**Exact reason:** with only 30 total movies, a single 9-movie test set is a small, specific sample — its particular composition (which 9 movies happened to land there) has real influence on the resulting score, separate from anything about the model's actual quality.
**Project consequence:** a single train/test split is a legitimate, useful first check — you should absolutely do it, as this lesson just did — but treating one split's test score as a precise, final verdict on a model is itself a kind of overfitting, just to a specific *split* instead of specific *training data*. The standard fix, k-fold cross-validation (running the split multiple times over different partitions and averaging the results), is worth knowing exists even before this lesson goes deep on it — it directly addresses this exact fragility.

## Exercise
- **Predict:** If you increased the test set to 50% of the data instead of 30%, would you expect the training score to go up or down, and why — think about how much data the model would now have to learn from.
- **Modify:** Try `PolynomialFeatures(degree=2)` instead of 9. Is the train/test gap smaller than degree 9's, larger than the plain line's, or somewhere in between? What does that suggest about "more flexible" not being simply good or bad, but a dial with a real cost past a certain point?
- **Break:** Set `test_size=0.9` (keep only 10% — 3 movies — for training). Fit the plain linear model and check both scores. What happens to train R² with almost no data to learn from, and does that surprise you given Lesson 13's "more data reduces sensitivity to individual points" lesson?
- **Repair:** Set `test_size` back to something reasonable (0.2–0.3 is a common real-world default) and explain in one sentence why an extreme split in either direction (too little train data, or too little test data) undermines the whole exercise.
- **Trace:** Run the degree-9 model with 3 different `random_state` values for the split (e.g. 42, 1, 7) and record all three test R² scores. How much do they vary, and what does that variation itself tell you about how much to trust any single one of them?

## What to remember
- Never evaluate a model only on data it trained on — that measures memorization capacity, not generalization.
- The test set must be set aside *before* fitting and never influence training in any way, directly or indirectly.
- A model with a better train score is not automatically the better model — check the test score before concluding anything.
- A single train/test split is informative but noisy, especially with small datasets — don't treat one split's result as definitive.

## Next lesson
Classification: predicting a category instead of a number — "will this movie be a critical hit or not," rather than a continuous rating. New territory: what "correct" even means for a yes/no prediction, and why accuracy alone can be a dangerously misleading way to measure it.
