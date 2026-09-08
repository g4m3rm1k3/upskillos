# Lesson 15 — Classification: When 93% Accuracy Means the Model Learned Nothing

## What you'll learn
- What changes moving from predicting a number (Lessons 13-14) to predicting a category
- Why "accuracy" can be a genuinely misleading metric — with real numbers proving it, not a warning to take on faith
- What a confusion matrix actually shows, construct by construct
- Precision and recall: two different, both necessary answers to "how good is this model," and why accuracy alone hides both

## The question
Instead of "how much box office will this make" (a number), ask "will this movie be a critical hit" — rating above 8, yes or no. Critical hits are rare — say, 4% of movies in your data. Before writing any code: if a model just always guessed "no, not a hit" for every single movie, what accuracy would it get, and would you call that model good?

## 1. Predict
Given a dataset where only 4% of movies are hits, if you train a real classifier and it reports 93% accuracy, is that good? What's the minimum accuracy a model could get on this data by doing something completely useless?

## 2. Try it
```python
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

np.random.seed(3)
n = 100
budget = np.random.uniform(1, 200, n)
rating = 6 + 0.005 * budget + np.random.normal(0, 1.0, n)
is_hit = (rating > 8).astype(int)

print("hit rate:", is_hit.mean())

X = budget.reshape(-1, 1)
X_train, X_test, y_train, y_test = train_test_split(X, is_hit, test_size=0.3, random_state=1)

model = LogisticRegression()
model.fit(X_train, y_train)
predictions = model.predict(X_test)

print("accuracy:", accuracy_score(y_test, predictions))
```

### What this code does
- `is_hit = (rating > 8).astype(int)` — turns a boolean array (`True`/`False`) into `1`/`0` integers. Classification models generally want numeric class labels, not raw booleans, even though the underlying meaning is identical.
- `LogisticRegression()` — despite the name, this is a **classification** model, not a regression predicting a continuous number. It's called "regression" for historical/mathematical reasons (it internally fits something regression-like before converting the result into a probability), but its actual job here is producing a `0` or `1` prediction.
- `model.fit(X_train, y_train)` — same shape of call as Lesson 13's `LinearRegression`, but internally solving a different problem: instead of minimizing squared error against a continuous target, it's finding parameters that best separate the two classes.
- `model.predict(X_test)` — returns actual `0`/`1` predictions (not probabilities — there's a separate `.predict_proba()` for that, which you'll meet in a later lesson).
- `accuracy_score(y_test, predictions)` — the simplest possible classification metric: the fraction of predictions that exactly matched the true label.

### What happens
Real output from this exact code:
```
hit rate: 0.04
accuracy: 0.9333333333333333
```
93.3% accuracy. Sounds impressive on its own. Hold that number — the next step is where it falls apart.

## 3. The trap, immediately
```python
from sklearn.dummy import DummyClassifier

dummy = DummyClassifier(strategy="most_frequent")
dummy.fit(X_train, y_train)
dummy_predictions = dummy.predict(X_test)

print("dummy accuracy:", accuracy_score(y_test, dummy_predictions))
print("model's actual predictions:", np.bincount(predictions))
```
Real output:
```
dummy accuracy: 0.9333333333333333
```
**Identical.** `DummyClassifier(strategy="most_frequent")` does no learning whatsoever — it just always predicts whichever class was most common in training (here, "not a hit"), every single time, for every input, ignoring the input entirely. It achieves the *exact same* 93.3% accuracy as the real, trained logistic regression model.

```
model's actual predictions: [30]
```
This is the real finding: `np.bincount(predictions)` shows every single one of the 30 test predictions was class `0` ("not a hit"). The trained model never once predicted "hit" — not correctly, not incorrectly, not at all. It learned to do exactly what the dummy baseline does for free: always guess the majority class.

## 4. Why does this happen?
### Code mechanics
With only 4 hits out of 100 movies total (and only 2 hits landing in this particular 30-movie test set), a model minimizing overall error can achieve very good scores by simply never predicting the rare class — the cost of missing the few real hits is mathematically small compared to the reward of getting the many non-hits right, if "accuracy" is the only thing being optimized. Nothing forced the model to try to catch hits specifically; accuracy as a target doesn't ask for that.

### Runtime behavior
This isn't a bug in `LogisticRegression`, or evidence it's a bad algorithm — it correctly minimized what it was told to minimize. The actual failure is upstream: accuracy, as a metric, treats "correctly predicting the common case" and "correctly predicting the rare case" as equally valuable, when for most real problems (fraud, disease, rare defects, critical hits) the rare case is usually the one that actually matters.

### Mental model
```
100 movies, 4 hits (4%)
        ↓ a model that always says "not a hit"
correct on 96 (the true non-hits) + wrong on 4 (the missed hits)
        ↓
accuracy = 96/100 = 96% overall (93% specifically in this test split)
        ↓
looks great, catches ZERO of the thing you actually wanted to predict
```

## 5. Put it in the project — the confusion matrix
```python
from sklearn.metrics import confusion_matrix, precision_score, recall_score

cm = confusion_matrix(y_test, predictions)
print(cm)

print("precision:", precision_score(y_test, predictions, zero_division=0))
print("recall:", recall_score(y_test, predictions, zero_division=0))
```
Real output:
```
[[28  0]
 [ 2  0]]
precision: 0.0
recall: 0.0
```

### Code walkthrough
- `confusion_matrix(y_test, predictions)` returns a 2×2 grid. Reading it requires knowing the layout: rows are the **true** labels (row 0 = actual "not hit", row 1 = actual "hit"), columns are the **predicted** labels (column 0 = predicted "not hit", column 1 = predicted "hit").
  - `28` (row 0, col 0): 28 movies that truly weren't hits, correctly predicted as not hits.
  - `0` (row 0, col 1): 0 non-hits incorrectly predicted as hits.
  - `2` (row 1, col 0): **2 movies that actually were hits, predicted as not-hits** — this is the number that matters, and accuracy alone completely hides it.
  - `0` (row 1, col 1): 0 hits correctly caught.
- `precision_score` — of everything the model *predicted* as a hit, what fraction actually were hits? The model predicted zero hits at all, so this is `0/0`, and `zero_division=0` tells `sklearn` to report `0.0` for that undefined case rather than raising an error.
- `recall_score` — of everything that *actually was* a hit, what fraction did the model catch? 0 out of 2 real hits caught → `0.0`. This is the number that most directly exposes the failure accuracy hid: the model's ability to find the thing you actually care about is precisely zero.

### Why this design?
Precision and recall exist specifically because they separate "how good is the model when it does claim something" from "how much of the real thing does it actually find" — two genuinely different failure modes that a single accuracy number collapses into one, hiding whichever one is bad.

## 6. Trap
**Normal rule:** a higher accuracy score means a better classifier.
**Apparently equivalent code:** comparing two models purely by their accuracy score on an imbalanced dataset, picking whichever number is higher.
**Surprising result:** exactly demonstrated above — a model that learned literally nothing about the actual pattern achieved identical accuracy to one that at least attempted to fit real data.
**Exact reason:** accuracy weighs every correct prediction equally, regardless of how rare or important that class is — on an imbalanced dataset, "predict the majority class always" is a legitimate strategy for maximizing accuracy specifically, entirely independent of whether the model learned anything useful.
**Project consequence:** on any dataset where one class is rare and matters more than its rarity suggests (hits, fraud, disease, defects — genuinely most real classification problems people actually care about), accuracy should never be reported alone, and never used alone to compare models. Precision and recall (or a combined summary like F1, which you'll likely meet soon) need to be checked every time, specifically because accuracy's blind spot is largest exactly where the stakes are highest.

## Exercise
- **Predict:** If you artificially balanced the dataset (equal numbers of hits and non-hits) before training, do you expect the accuracy-vs-dummy gap to close, widen, or stay about the same? Why would balancing the classes change how much accuracy rewards a lazy "always guess the majority" strategy?
- **Modify:** Compute the dummy baseline's precision and recall too (not just accuracy). What do you expect them to be, given it never predicts the positive class at all?
- **Break:** Change `LogisticRegression()` to `LogisticRegression(class_weight='balanced')` — a real, standard option that tells the model to penalize missing rare-class examples more heavily — and rerun. Does accuracy go up, down, or stay similar? What happens to recall specifically?
- **Repair:** Based on the previous exercise, explain in one sentence what `class_weight='balanced'` is actually trading away in exchange for better recall — is there a cost, and if so, where does it show up?
- **Trace:** Using the confusion matrix `[[28, 0], [2, 0]]`, compute precision and recall yourself by hand from the four numbers, and verify your calculation matches `sklearn`'s reported `0.0` for both.

## What to remember
- Accuracy alone is a genuinely misleading metric on imbalanced data — always compare against a dummy baseline before trusting an accuracy number means anything.
- A confusion matrix's four cells separately show correct and incorrect predictions for *each* class — read the whole grid, not just the diagonal.
- Precision answers "when the model claims positive, how often is it right"; recall answers "of the real positives, how many did it catch" — these are different questions with different failure modes.
- A rare, important class needs metrics that specifically account for its rarity — accuracy was never built to do that.

## Next lesson
`class_weight='balanced'` and other ways to actually address imbalance properly are the natural next stop — along with the real cost that comes with them (more false alarms in exchange for catching more real hits), and how to decide which trade-off is actually right for a specific problem rather than just maximizing one number blindly.
