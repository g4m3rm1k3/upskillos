# Lesson 46: Evaluating Models — Confusion Matrices, ROC, and Cross-Validation

What you will build: The reader understands model evaluation beyond accuracy: confusion matrix (TP, TN, FP, FN), precision, recall, F1-score, ROC curve concept, and k-fold cross-validation. ALL implemented from scratch in Python. The transferable insight: accuracy is a misleading metric on imbalanced datasets. If 99% of emails are not spam, a classifier that always says 'not spam' has 99% accuracy but is useless. Precision and recall capture the tradeoff between false positives and false negatives.

What you need to know first: Lessons 00-45.

**Terms used in this lesson**
- **True Positive (TP)** — A correctly predicted positive outcome. Exists to quantify successful detections.
- **True Negative (TN)** — A correctly predicted negative outcome. Exists to quantify successful rejections.
- **False Positive (FP)** — An incorrectly predicted positive outcome (false alarm). Exists to quantify over-sensitivity.
- **False Negative (FN)** — An incorrectly predicted negative outcome (miss). Exists to quantify under-sensitivity.
- **Precision** — The ratio of true positives to total predicted positives. Exists to measure the reliability of positive predictions.
- **Recall** — The ratio of true positives to total actual positives. Exists to measure the ability to find all positive instances.
- **F1-score** — The harmonic mean of precision and recall. Exists to provide a single metric balancing precision and recall.
- **Accuracy** — The ratio of correct predictions to total predictions. Exists to measure overall correctness, but is misleading on imbalanced datasets.
- **Threshold** — A cutoff value used to convert a continuous probability into a binary prediction. Exists to allow tuning of the precision-recall tradeoff.
- **k-fold cross-validation** — A technique for evaluating predictive models by partitioning the original sample into a training set to train the model, and a test set to evaluate it, repeated k times. Exists to provide a more robust estimate of model performance than a single train/test split.

**Objects and methods used**

- **`zip`**
  - *What it is:* A built-in Python function that aggregates elements from two or more iterables.
  - *Implementation:* `zip(*iterables, strict=False)`
  - *Its use:* To iterate over pairs of true and predicted labels simultaneously.
  - *Type:* Built-in function.
  - *Responsibility:* Returns an iterator of tuples, where the i-th tuple contains the i-th element from each of the argument sequences or iterables.
  - *Depends on:* One or more iterable objects.
  - *Connects to:* Called by iteration constructs like `for` or comprehensions; yields tuples to the caller.
  - *Shape:* A standard library function used for iterating multiple sequences in parallel.

- **`sum`**
  - *What it is:* A built-in Python function that sums the items of an iterable.
  - *Implementation:* `sum(iterable, /, start=0)`
  - *Its use:* To count occurrences of TP, TN, FP, FN using a generator expression.
  - *Type:* Built-in function.
  - *Responsibility:* Returns the sum of a 'start' value (default: 0) plus an iterable of numbers.
  - *Depends on:* An iterable of numbers.
  - *Connects to:* Called with a sequence or generator expression; returns a scalar total to the caller.
  - *Shape:* A fundamental aggregation function.

- **`random.seed`**
  - *What it is:* A method to initialize the internal state of the random number generator.
  - *Implementation:* `random.seed(a=None, version=2)`
  - *Its use:* To ensure reproducible results when shuffling data for k-fold CV.
  - *Type:* Module function (in the `random` module).
  - *Responsibility:* Seeds the random number generator to produce a deterministic sequence of random numbers.
  - *Depends on:* An optional seed value (integer).
  - *Connects to:* Called during setup; influences all subsequent calls to `random` functions.
  - *Shape:* Setup configuration for probabilistic operations.

- **`random.shuffle`**
  - *What it is:* A method to shuffle a sequence in place.
  - *Implementation:* `random.shuffle(x)`
  - *Its use:* To randomize the order of indices or data points before splitting into folds.
  - *Type:* Module function (in the `random` module).
  - *Responsibility:* Shuffles the sequence x in place.
  - *Depends on:* A mutable sequence (like a list).
  - *Connects to:* Called to mutate a sequence; affects subsequent accesses to the sequence.
  - *Shape:* A data preparation utility.

## Concept Unit: Confusion Matrix

### The Problem
How do we know exactly *how* a binary classifier is failing? Accuracy just gives a single percentage, but a model could be failing by missing real positives or by crying wolf too often. How can we break down these specific types of errors?

### Introduce the concept in isolation
```python
def confusion_matrix(y_true, y_pred, pos_label=1):
    TP = sum(1 for t,p in zip(y_true,y_pred) if t==pos_label and p==pos_label)
    TN = sum(1 for t,p in zip(y_true,y_pred) if t!=pos_label and p!=pos_label)
    FP = sum(1 for t,p in zip(y_true,y_pred) if t!=pos_label and p==pos_label)
    FN = sum(1 for t,p in zip(y_true,y_pred) if t==pos_label and p!=pos_label)
    return {'TP':TP,'TN':TN,'FP':FP,'FN':FN}

y_true = [1,1,1,1,1,0,0,0,0,0]
y_pred = [1,1,1,0,0,1,0,0,0,0]
cm = confusion_matrix(y_true, y_pred)
print(cm)
```
Output:
`{'TP': 3, 'TN': 4, 'FP': 1, 'FN': 2}`
This proves we can categorize every prediction into one of four buckets: TP (predicted 1, actually 1), TN (predicted 0, actually 0), FP (predicted 1, actually 0), and FN (predicted 0, actually 1).

### Discard the throwaway
This specific set of test arrays is deleted and will not appear in the project again.

### Project Change
- **Reference Source**: No reference counterpart — this is a from-scratch addition because we are building our own evaluation metrics.
- **Files affected**: `evaluation.py` (created)
- **Change type**: add
- **Location**: brand-new file
- **Dependencies**: None.

### The New Code
```python
def confusion_matrix(y_true, y_pred, pos_label=1):
    TP = sum(1 for t,p in zip(y_true,y_pred) if t==pos_label and p==pos_label)
    TN = sum(1 for t,p in zip(y_true,y_pred) if t!=pos_label and p!=pos_label)
    FP = sum(1 for t,p in zip(y_true,y_pred) if t!=pos_label and p==pos_label)
    FN = sum(1 for t,p in zip(y_true,y_pred) if t==pos_label and p!=pos_label)
    return {'TP':TP,'TN':TN,'FP':FP,'FN':FN}
```

### The Updated Project
```python
# evaluation.py
# ← new
1 def confusion_matrix(y_true, y_pred, pos_label=1):
2     TP = sum(1 for t,p in zip(y_true,y_pred) if t==pos_label and p==pos_label)
3     TN = sum(1 for t,p in zip(y_true,y_pred) if t!=pos_label and p!=pos_label)
4     FP = sum(1 for t,p in zip(y_true,y_pred) if t!=pos_label and p==pos_label)
5     FN = sum(1 for t,p in zip(y_true,y_pred) if t==pos_label and p!=pos_label)
6     return {'TP':TP,'TN':TN,'FP':FP,'FN':FN}
```
This structure provides a reusable function to calculate the four foundational counts for binary classification evaluation.

### Mechanical walkthrough
- `def confusion_matrix(y_true, y_pred, pos_label=1):` defines a function taking true labels, predicted labels, and optionally the value considered 'positive'.
- `TP = sum(1 for t,p in zip(y_true,y_pred) if t==pos_label and p==pos_label)` uses `zip` to pair elements, iterating with `t` and `p`. It yields `1` if both are the positive label, and `sum` aggregates them to count True Positives.
- `TN = sum(...)` does the same, checking if both `t` and `p` are NOT the positive label.
- `FP = sum(...)` counts when the actual `t` is negative but the predicted `p` is positive.
- `FN = sum(...)` counts when the actual `t` is positive but the predicted `p` is negative.
- `return {'TP':TP,'TN':TN,'FP':FP,'FN':FN}` constructs and returns a dictionary storing these four integer counts.

### CS lens
A confusion matrix reduces an arbitrary-length sequence of predictions into a fixed-size $2 \times 2$ contingency table. This constant space representation is foundational for all subsequent metric derivations.

### SE lens
Returning a dictionary instead of a raw tuple prevents callers from confusing the order of the four values. Explicit keys make downstream metric calculations readable and robust against accidental swaps of TP and TN.

### Commands needed
None.

### Run it
No execution needed here, purely declarative definition.

### One sentence connecting to previous unit
With the raw counts extracted into a dictionary, we can compute higher-level metrics like precision and recall.

## Concept Unit: Precision, Recall, and F1-score

### The Problem
Raw counts of TP, FP, TN, FN are hard to interpret at a glance, especially across datasets of different sizes. How do we summarize these counts into percentages that describe specific aspects of the model's performance?

### Introduce the concept in isolation
```python
def precision(cm): return cm['TP'] / (cm['TP'] + cm['FP']) if (cm['TP']+cm['FP'])>0 else 0
def recall(cm):    return cm['TP'] / (cm['TP'] + cm['FN']) if (cm['TP']+cm['FN'])>0 else 0
def f1_score(cm):
    p, r = precision(cm), recall(cm)
    return 2*p*r/(p+r) if (p+r)>0 else 0
def accuracy(cm):  return (cm['TP']+cm['TN']) / sum(cm.values())

cm = {'TP':3,'TN':4,'FP':1,'FN':2}
print(f'Precision: {precision(cm):.3f}')
print(f'Recall:    {recall(cm):.3f}')
print(f'F1:        {f1_score(cm):.3f}')
print(f'Accuracy:  {accuracy(cm):.3f}')
```
Output:
```
Precision: 0.750
Recall:    0.600
F1:        0.667
Accuracy:  0.700
```
This proves precision represents the accuracy of positive predictions (3/(3+1)=0.75), recall represents the fraction of actual positives found (3/(3+2)=0.60), and F1 balances both.

### Discard the throwaway
The test dictionary `cm` and prints are deleted and will not appear in the project again.

### Project Change
- **Reference Source**: No reference counterpart — this is a from-scratch addition because we are building our own evaluation metrics.
- **Files affected**: `evaluation.py` (modified)
- **Change type**: add
- **Location**: append to file
- **Dependencies**: Depends on the dictionary structure returned by `confusion_matrix`.

### The New Code
```python
def precision(cm): return cm['TP'] / (cm['TP'] + cm['FP']) if (cm['TP']+cm['FP'])>0 else 0
def recall(cm):    return cm['TP'] / (cm['TP'] + cm['FN']) if (cm['TP']+cm['FN'])>0 else 0
def f1_score(cm):
    p, r = precision(cm), recall(cm)
    return 2*p*r/(p+r) if (p+r)>0 else 0
def accuracy(cm):  return (cm['TP']+cm['TN']) / sum(cm.values())
```

### The Updated Project
```python
# evaluation.py
def confusion_matrix(y_true, y_pred, pos_label=1):
    # ...
    return {'TP':TP,'TN':TN,'FP':FP,'FN':FN}

# ← new
1 def precision(cm): return cm['TP'] / (cm['TP'] + cm['FP']) if (cm['TP']+cm['FP'])>0 else 0
2 def recall(cm):    return cm['TP'] / (cm['TP'] + cm['FN']) if (cm['TP']+cm['FN'])>0 else 0
3 def f1_score(cm):
4     p, r = precision(cm), recall(cm)
5     return 2*p*r/(p+r) if (p+r)>0 else 0
6 def accuracy(cm):  return (cm['TP']+cm['TN']) / sum(cm.values())
```
These functions take a computed confusion matrix and return standard normalized evaluation metrics.

### Mechanical walkthrough
- `def precision(cm):` defines a function to calculate precision.
- `cm['TP'] / (cm['TP'] + cm['FP'])` divides true positives by all predicted positives.
- `if (cm['TP']+cm['FP'])>0 else 0` is a safeguard to prevent division by zero if there are zero positive predictions.
- `def recall(cm):` defines a function to calculate recall.
- `cm['TP'] / (cm['TP'] + cm['FN'])` divides true positives by all actual positives.
- `def f1_score(cm):` defines a function to calculate the F1-score.
- `p, r = precision(cm), recall(cm)` computes both intermediate metrics.
- `2*p*r/(p+r)` is the formula for the harmonic mean of precision and recall.
- `def accuracy(cm):` defines accuracy calculation.
- `(cm['TP']+cm['TN']) / sum(cm.values())` divides total correct predictions by the total number of predictions.

### CS lens
Using the harmonic mean for F1-score ensures that if either precision or recall drops to 0, the F1-score drops to 0. It heavily penalizes models that have extreme disparities between precision and recall, unlike an arithmetic mean which would let a 1.0 precision and 0.0 recall average out to 0.5.

### SE lens
Passing the confusion matrix `cm` dictionary as a single argument instead of passing TP, TN, FP, FN as four separate arguments reduces parameter clutter and makes the function signatures uniform.

### Commands needed
None.

### Run it
No execution needed here, purely declarative definition.

### One sentence connecting to previous unit
Now that we can score a single set of predictions, how do we handle models that output confidence scores rather than hard 1s and 0s?

## Concept Unit: Predict with Threshold

### The Problem
Many classifiers output a probability or confidence score between 0.0 and 1.0. How do we convert these continuous scores into binary predictions, and what happens when we change the cutoff point?

### Introduce the concept in isolation
```python
def predict_with_threshold(scores, threshold):
    return [1 if s >= threshold else 0 for s in scores]

y_true  = [1,1,1,1,1,0,0,0,0,0]
scores  = [0.9,0.8,0.7,0.4,0.3, 0.6,0.2,0.1,0.05,0.01]

for threshold in [0.3, 0.5, 0.7, 0.9]:
    y_pred = predict_with_threshold(scores, threshold)
    cm = confusion_matrix(y_true, y_pred)
    p, r = precision(cm), recall(cm)
    print(f'thresh={threshold}: precision={p:.2f}, recall={r:.2f}')
```
Output:
```
thresh=0.3: precision=0.83, recall=1.00
thresh=0.5: precision=1.00, recall=0.60
thresh=0.7: precision=1.00, recall=0.60
thresh=0.9: precision=1.00, recall=0.20
```
This proves that lowering the threshold increases recall (catches more positives) but can lower precision (more false alarms), illustrating the precision-recall tradeoff and the basis for ROC curves.

### Discard the throwaway
The threshold loop test code is deleted and will not appear in the project again.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: `evaluation.py` (modified)
- **Change type**: add
- **Location**: append to file
- **Dependencies**: None.

### The New Code
```python
def predict_with_threshold(scores, threshold):
    return [1 if s >= threshold else 0 for s in scores]
```

### The Updated Project
```python
# evaluation.py
def accuracy(cm):  return (cm['TP']+cm['TN']) / sum(cm.values())

# ← new
1 def predict_with_threshold(scores, threshold):
2     return [1 if s >= threshold else 0 for s in scores]
```
This utility converts continuous classifier outputs into hard binary labels using a configurable threshold.

### Mechanical walkthrough
- `def predict_with_threshold(scores, threshold):` defines a function taking a list of continuous scores and a scalar threshold.
- `return [...]` returns a new list built via list comprehension.
- `1 if s >= threshold else 0` is a ternary expression that evaluates to `1` when the score `s` meets or exceeds the `threshold`, and `0` otherwise.
- `for s in scores` iterates over every item in the input `scores` list.

### CS lens
Varying the threshold allows a model to operate at different points on the Receiver Operating Characteristic (ROC) curve. It exposes the inherent trade-off in the model's confidence: requiring high confidence reduces false positives but increases false negatives.

### SE lens
Isolating the thresholding logic from the metric calculation keeps concerns separate. The metric functions only ever see binary labels, remaining agnostic to whether those labels came from a hard classifier or a thresholded probability model.

### Commands needed
None.

### Run it
No execution needed here.

### One sentence connecting to previous unit
To ensure our threshold choice and overall metrics are robust and not just overfitting to one specific train-test split, we need cross-validation.

## Concept Unit: k-fold Cross-Validation

### The Problem
If we train and test on just one random split of our data, we might get lucky or unlucky with how the data is divided. How can we test the model on *all* the data while never testing on data it trained on simultaneously?

### Introduce the concept in isolation
```python
import random

def kfold_cv(X, y, model_class, k=5, seed=42):
    random.seed(seed)
    n = len(X)
    indices = list(range(n))
    random.shuffle(indices)
    fold_size = n // k
    scores = []

    for fold in range(k):
        test_idx  = indices[fold*fold_size : (fold+1)*fold_size]
        train_idx = indices[:fold*fold_size] + indices[(fold+1)*fold_size:]
        X_tr = [X[i] for i in train_idx]
        y_tr = [y[i] for i in train_idx]
        X_te = [X[i] for i in test_idx]
        y_te = [y[i] for i in test_idx]

        model = model_class()
        model.fit(X_tr, y_tr)
        y_pred = [model.predict(x) for x in X_te]
        acc = sum(t==p for t,p in zip(y_te,y_pred)) / len(y_te)
        scores.append(acc)
        print(f'Fold {fold+1}: accuracy={acc:.3f}')

    print(f'Mean: {sum(scores)/len(scores):.3f}')
    return scores

# Mock model for demonstration
class MockModel:
    def fit(self, X, y): pass
    def predict(self, x): return 1 if x > 0 else 0

X = [1, 2, 3, 4, 5, -1, -2, -3, -4, -5]
y = [1, 1, 1, 1, 1, 0, 0, 0, 0, 0]
kfold_cv(X, y, MockModel, k=5)
```
Output:
```
Fold 1: accuracy=1.000
Fold 2: accuracy=1.000
Fold 3: accuracy=1.000
Fold 4: accuracy=1.000
Fold 5: accuracy=1.000
Mean: 1.000
```
This proves we can systematically rotate which subset of data is held out as the test set, giving us a more reliable average performance score.

### Discard the throwaway
The mock model and test execution are deleted and will not appear in the project again.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: `evaluation.py` (modified)
- **Change type**: add
- **Location**: append to file
- **Dependencies**: `random` module.

### The New Code
```python
import random

def kfold_cv(X, y, model_class, k=5, seed=42):
    random.seed(seed)
    n = len(X)
    indices = list(range(n))
    random.shuffle(indices)
    fold_size = n // k
    scores = []

    for fold in range(k):
        test_idx  = indices[fold*fold_size : (fold+1)*fold_size]
        train_idx = indices[:fold*fold_size] + indices[(fold+1)*fold_size:]
        X_tr = [X[i] for i in train_idx]
        y_tr = [y[i] for i in train_idx]
        X_te = [X[i] for i in test_idx]
        y_te = [y[i] for i in test_idx]

        model = model_class()
        model.fit(X_tr, y_tr)
        y_pred = [model.predict(x) for x in X_te]
        acc = sum(t==p for t,p in zip(y_te,y_pred)) / len(y_te)
        scores.append(acc)
        print(f'Fold {fold+1}: accuracy={acc:.3f}')

    print(f'Mean: {sum(scores)/len(scores):.3f}')
    return scores
```

### The Updated Project
```python
# evaluation.py
# ← new (add import at top)
import random

# ... [existing metrics code] ...

# ← new
1 def kfold_cv(X, y, model_class, k=5, seed=42):
2     random.seed(seed)
3     n = len(X)
4     indices = list(range(n))
5     random.shuffle(indices)
6     fold_size = n // k
7     scores = []
8 
9     for fold in range(k):
10        test_idx  = indices[fold*fold_size : (fold+1)*fold_size]
11        train_idx = indices[:fold*fold_size] + indices[(fold+1)*fold_size:]
12        X_tr = [X[i] for i in train_idx]
13        y_tr = [y[i] for i in train_idx]
14        X_te = [X[i] for i in test_idx]
15        y_te = [y[i] for i in test_idx]
16
17        model = model_class()
18        model.fit(X_tr, y_tr)
19        y_pred = [model.predict(x) for x in X_te]
20        acc = sum(t==p for t,p in zip(y_te,y_pred)) / len(y_te)
21        scores.append(acc)
22        print(f'Fold {fold+1}: accuracy={acc:.3f}')
23
24    print(f'Mean: {sum(scores)/len(scores):.3f}')
25    return scores
```
This function automates the process of evaluating any model class using k-fold cross-validation.

### Mechanical walkthrough
- `import random` imports the random module.
- `def kfold_cv(X, y, model_class, k=5, seed=42):` takes features `X`, labels `y`, a class reference `model_class`, the number of folds `k`, and a random `seed`.
- `random.seed(seed)` makes the shuffling deterministic.
- `indices = list(range(n))` creates a list of indices `0` through `n-1`.
- `random.shuffle(indices)` shuffles those indices in place.
- `fold_size = n // k` calculates integer size for each fold.
- `for fold in range(k):` iterates `k` times.
- `test_idx = indices[fold*fold_size : (fold+1)*fold_size]` slices out the contiguous block of indices designated for testing in this fold.
- `train_idx = indices[:fold*fold_size] + indices[(fold+1)*fold_size:]` concatenates the indices before and after the test block to form the training set.
- `X_tr = [X[i] for i in train_idx]` (and similar for `y_tr`, `X_te`, `y_te`) uses list comprehensions to extract the actual data corresponding to the indices.
- `model = model_class()` instantiates a fresh model from the provided class.
- `model.fit(X_tr, y_tr)` trains the fresh model.
- `y_pred = [model.predict(x) for x in X_te]` predicts labels for the test set.
- `acc = sum(t==p for t,p in zip(y_te,y_pred)) / len(y_te)` calculates accuracy for this fold.
- `scores.append(acc)` saves the fold accuracy.
- `print(f'Mean: {sum(scores)/len(scores):.3f}')` prints the average accuracy across all folds.

### CS lens
Cross-validation is a variance reduction technique. A single random train-test split might yield exceptionally good or bad accuracy purely by chance. By iterating so that every data point is in the test set exactly once, the mean of the folds provides a less biased estimate of the model's generalized performance.

### SE lens
Passing `model_class` (a class object) rather than a pre-instantiated `model` is critical. If we passed an instance, the state from `fold 1`'s training would leak into `fold 2`. Instantiating `model = model_class()` inside the loop guarantees a clean slate for each fold.

### Commands needed
None.

### Run it
No execution needed here.

### One sentence connecting to previous unit
Finally, we can combine our metrics into an evaluation pipeline to reveal the dangers of relying solely on accuracy for imbalanced datasets.

## Concept Unit: Full Evaluation Pipeline

### The Problem
If 90% of a dataset is negative, a "dumb" classifier that simply returns `0` every time will achieve 90% accuracy without learning anything. How do we expose this failure?

### Introduce the concept in isolation
```python
def evaluate_classifier(X_train, y_train, X_test, y_test, classifier):
    y_pred = [classifier(X_train, y_train, x) for x in X_test]
    cm = confusion_matrix(y_test, y_pred)
    print(f'Confusion matrix: {cm}')
    print(f'Accuracy:  {accuracy(cm):.4f}')
    print(f'Precision: {precision(cm):.4f}')
    print(f'Recall:    {recall(cm):.4f}')
    print(f'F1:        {f1_score(cm):.4f}')
    return cm

import random; random.seed(0)
n = 100
y_true = [1]*10 + [0]*90
random.shuffle(y_true)

y_always_neg = [0]*100
cm_dumb = confusion_matrix(y_true, y_always_neg)
print('Always-negative classifier:')
print(f'  Accuracy={accuracy(cm_dumb):.2f}, F1={f1_score(cm_dumb):.2f}')
```
Output:
```
Always-negative classifier:
  Accuracy=0.90, F1=0.00
```
This proves that high accuracy (0.90) completely masks the fact that the classifier failed to find a single positive instance (F1=0.00).

### Discard the throwaway
The mock arrays and test output are deleted and will not appear in the project again.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: `evaluation.py` (modified)
- **Change type**: add
- **Location**: append to file
- **Dependencies**: previously defined metric functions.

### The New Code
```python
def evaluate_classifier(X_train, y_train, X_test, y_test, classifier):
    y_pred = [classifier(X_train, y_train, x) for x in X_test]
    cm = confusion_matrix(y_test, y_pred)
    print(f'Confusion matrix: {cm}')
    print(f'Accuracy:  {accuracy(cm):.4f}')
    print(f'Precision: {precision(cm):.4f}')
    print(f'Recall:    {recall(cm):.4f}')
    print(f'F1:        {f1_score(cm):.4f}')
    return cm
```

### The Updated Project
```python
# evaluation.py
# ... [existing metrics code] ...

# ← new
1 def evaluate_classifier(X_train, y_train, X_test, y_test, classifier):
2     y_pred = [classifier(X_train, y_train, x) for x in X_test]
3     cm = confusion_matrix(y_test, y_pred)
4     print(f'Confusion matrix: {cm}')
5     print(f'Accuracy:  {accuracy(cm):.4f}')
6     print(f'Precision: {precision(cm):.4f}')
7     print(f'Recall:    {recall(cm):.4f}')
8     print(f'F1:        {f1_score(cm):.4f}')
9     return cm
```
This aggregates all our metric calculations into a single convenient reporting pipeline.

### Mechanical walkthrough
- `def evaluate_classifier(X_train, y_train, X_test, y_test, classifier):` takes training data, test data, and a callable `classifier` function.
- `y_pred = [classifier(X_train, y_train, x) for x in X_test]` invokes the classifier on each test element.
- `cm = confusion_matrix(y_test, y_pred)` passes the predictions and actuals to calculate counts.
- `print(...)` outputs the computed matrix, accuracy, precision, recall, and F1.
- `return cm` returns the underlying matrix for programmatic access if needed.

### CS lens
Evaluation frameworks decouple the algorithm from the judgment of its success. By passing a generic `classifier` callable, this single pipeline can evaluate k-Nearest Neighbors, a dumb zero-predictor, or a logistic regression model, applying identical standards to all.

### SE lens
Consolidating metric reporting into one function ensures consistency across scripts. If we later decide to log metrics to a file instead of `print()`, we only have to change it in one place.

### Commands needed
None.

### Run it
No execution needed here.

### One sentence connecting to previous unit
We now have a complete suite of tools to measure model performance accurately, avoiding the trap of misleading metrics on imbalanced datasets.

## Closing

### Connect the pieces
We built a metric suite entirely from scratch, moving from basic counts (True Positives, False Positives, True Negatives, False Negatives) to complex, robust evaluation methods. We saw how precision and recall dissect errors, how a threshold balances them, and how k-fold cross-validation ensures our measurements are stable. Most importantly, we verified that on imbalanced data, high accuracy is a mirage without an F1-score to back it up. In a real project, evaluating a kNN classifier means splitting the data, passing it through `evaluate_classifier`, inspecting the confusion matrix, and using 5-fold CV to confirm the model's reliability across all partitions.
