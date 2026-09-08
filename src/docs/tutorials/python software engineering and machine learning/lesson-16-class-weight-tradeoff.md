# Lesson 16 — There's No Free Lunch: Fixing Recall Costs Something

## What you'll learn
- What `class_weight='balanced'` actually changes inside the model, mechanically
- Real, measured proof that fixing Lesson 15's zero-recall problem doesn't come free
- Why accuracy is exactly the wrong metric to watch while making this trade-off
- What F1 is, and why it's a compromise summary, not a way to avoid choosing

## The question
Lesson 15 ended with a model that caught zero real hits, hiding behind a good-looking accuracy score. `class_weight='balanced'` is a real, standard fix for making a model actually try to catch the rare class. Before assuming it's a strict improvement: does making a model pay more attention to rare hits cost anything, or is it just a free upgrade?

## 1. Predict
If a model starts actually flagging some movies as hits (instead of never predicting a hit at all), and a few of those flags are correct, what has to happen to the number of *incorrect* hit-flags for that to be possible? Can precision realistically stay perfect while recall goes up?

## 2. Try it
```python
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, confusion_matrix

np.random.seed(3)
n = 100
budget = np.random.uniform(1, 200, n)
rating = 6 + 0.005 * budget + np.random.normal(0, 1.0, n)
is_hit = (rating > 8).astype(int)

X = budget.reshape(-1, 1)
X_train, X_test, y_train, y_test = train_test_split(X, is_hit, test_size=0.3, random_state=1)

for weight in [None, "balanced"]:
    model = LogisticRegression(class_weight=weight)
    model.fit(X_train, y_train)
    predictions = model.predict(X_test)

    print(f"class_weight={weight}")
    print(" accuracy:", accuracy_score(y_test, predictions))
    print(" precision:", precision_score(y_test, predictions, zero_division=0))
    print(" recall:", recall_score(y_test, predictions, zero_division=0))
    print(" confusion matrix:", confusion_matrix(y_test, predictions).tolist())
```

### What this code does
- `class_weight=None` (the default) — every training example contributes equally to the loss the model minimizes, regardless of which class it belongs to. Since 96% of examples are "not a hit," minimizing overall error naturally biases the model toward predicting the majority class — exactly Lesson 15's failure.
- `class_weight="balanced"` — tells `LogisticRegression` to automatically reweight each class **inversely proportional to its frequency**: since hits are rare (a small fraction of training data), each individual hit example gets weighted much more heavily in the loss calculation than each individual non-hit example. Concretely, this means the model now pays a much larger mathematical penalty for misclassifying a hit than for misclassifying a non-hit — a direct, deliberate rebalancing of what the training process considers "costly to get wrong."
- Looping over `[None, "balanced"]` and printing both — this isn't for convenience, it's the actual point: the *only* way to see this trade-off honestly is side by side, on identical data and identical splits.

### What happens
Real output from this exact code:
```
class_weight=None
 accuracy: 0.933
 precision: 0.0
 recall: 0.0
 confusion matrix: [[28, 0], [2, 0]]

class_weight=balanced
 accuracy: 0.567
 precision: 0.077
 recall: 0.5
 confusion matrix: [[16, 12], [1, 1]]
```

## 3. Reading what actually changed
### The confusion matrices, side by side
```
default:   [[28, 0],       balanced:  [[16, 12],
            [2,  0]]                   [1,  1]]
```
- Default: 28 non-hits correctly identified, 0 non-hits wrongly flagged, but both real hits (row 2) missed entirely.
- Balanced: only 16 non-hits correctly identified now, and **12 non-hits got incorrectly flagged as hits** — but of the 2 real hits, 1 is now correctly caught (recall went from 0/2 to 1/2 = 0.5).

### The actual trade
Recall improved (0.0 → 0.5) — the model now catches half the real hits instead of none. But precision is *still* terrible (0.077) — of the 13 movies it flagged as hits, only 1 actually was one; the other 12 are false alarms. And accuracy collapsed (0.933 → 0.567), because those 12 new false alarms are 12 new mistakes on the (still large) group of genuinely non-hit movies.

If your prediction was "precision can't realistically stay perfect while recall goes up here" — that's exactly what happened, concretely: catching 1 more real hit required tolerating 12 new false alarms among the non-hits.

## 4. Why?
### Code mechanics
Reweighting the loss doesn't teach the model anything new about the actual pattern in the data — the underlying relationship between budget and hit-likelihood is exactly as weak and noisy as it was before. What changed is *where the model's decision boundary sits* — `class_weight='balanced'` pushes it toward flagging more borderline cases as "hit," because missing a hit is now mathematically expensive. Some of those newly-flagged borderline cases are real hits (recall improves); most, given how rare and weakly-predictable hits are in this data, are not (precision worsens).

### Runtime behavior
This entire shift happens during `fit()` — the reweighting changes what the training process optimizes for, not anything about how `predict()` works afterward. `predict()` is still just "does this input fall on the hit side or the non-hit side of whatever boundary training found" — the boundary itself moved, nothing about the prediction mechanism changed.

### Mental model
```
default:    boundary set to minimize overall error
                → favors the common class heavily → misses rare hits entirely

balanced:   boundary shifted toward catching more of the rare class
                → catches some real hits
                → also catches more non-hits by mistake (false alarms)
                → NOT a free improvement — a different point on the same trade-off
```

## 5. F1 — one number that reflects the trade, not a way around it
```python
from sklearn.metrics import f1_score

for weight in [None, "balanced"]:
    model = LogisticRegression(class_weight=weight).fit(X_train, y_train)
    predictions = model.predict(X_test)
    print(f"class_weight={weight}: F1 = {f1_score(y_test, predictions, zero_division=0):.3f}")
```
Real output:
```
class_weight=None: F1 = 0.000
class_weight=balanced: F1 = 0.133
```
F1 is the harmonic mean of precision and recall — a single number that's only high when *both* are reasonably high, and stays low if either one is near zero (unlike a plain average, which could be dragged up by one good number hiding one bad one). Here it correctly reflects that neither version is actually good — 0.133 is a low F1, honestly summarizing "recall improved from nothing, but precision is still poor, so this isn't a real win, just a different kind of not-good."

## 6. Trap
**Normal rule:** if recall goes up, the model got better at its job.
**Apparently equivalent code:** looking only at recall (0.0 → 0.5) and concluding `class_weight='balanced'` fixed the model.
**Surprising result:** by nearly every other measure, the balanced model is *worse* — accuracy dropped by 37 percentage points, and precision is still under 8%. A team that ships this model expecting it to reliably flag hits would find that 12 out of every 13 flags are false alarms.
**Exact reason:** recall alone answers "how much of the real thing did you catch," completely ignoring how many false alarms it took to get there. Optimizing (or evaluating) for recall in isolation, the same way Lesson 15 warned against accuracy in isolation, hides the opposite failure mode.
**Project consequence:** which trade-off is "better" — catching more hits at the cost of more false alarms, or fewer false alarms at the cost of missing more hits — is not a question a metric can answer for you. It depends entirely on what a false alarm costs versus what a missed hit costs *in the real system this model feeds into* — a business/product decision, not a modeling one. The model can hand you the trade-off curve; deciding where on that curve to stand is not the model's job.

## Exercise
- **Predict:** If false alarms (flagging a non-hit as a hit) were nearly costless in some real application, but missing an actual hit was very costly, would you prefer the default model or the balanced one here — and does F1 (which treats both errors as equally important) actually reflect that preference correctly?
- **Modify:** Try `class_weight={0: 1, 1: 5}` — a custom weighting, less extreme than `'balanced'`'s automatic ratio. Does it land somewhere between the two extremes on precision/recall, closer to one side, or somewhere unexpected?
- **Break:** Push the custom weighting much further, e.g. `class_weight={0: 1, 1: 50}`. What happens to precision and recall at the extreme — does the model eventually flag almost everything as a hit, and if so, what does that do to precision specifically?
- **Repair:** Based on the extreme case above, explain in one sentence why "just weight the rare class as heavily as possible" isn't a real solution, even though it technically maximizes recall.
- **Trace:** Using the balanced model's confusion matrix `[[16, 12], [1, 1]]`, compute precision and recall by hand from the four raw numbers, and confirm they match the reported `0.077` and `0.5`.

## What to remember
- `class_weight='balanced'` reweights the training loss, not the data itself — it changes what mistakes the model considers costly, shifting where its decision boundary lands.
- Improving recall without checking precision is the same mistake as Lesson 15's accuracy-alone trap, just pointed the opposite direction.
- F1 summarizes the trade-off honestly but doesn't resolve it — a low F1 on both sides of a comparison means neither option is actually good, not that you've found the right compromise.
- Deciding the right precision/recall balance is a judgment call about real-world costs, not something a metric can answer on its own.

## Next lesson
This closes out classification fundamentals cleanly. From here: a genuinely different model type (decision trees — how they split on features mechanically, and why they behave completely differently from a straight line or a logistic boundary), or moving to multi-feature models (using budget *and* year *and* studio together, instead of one lonely feature) to see how a model handles combining several inputs at once. Say which whenever you're ready.
