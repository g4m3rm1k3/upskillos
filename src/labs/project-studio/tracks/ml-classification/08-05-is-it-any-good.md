---
title: 8.5 — 95% Accurate, and Is That Good? Classification Metrics
track: Classification — A Spam Detector
runtime: none
concepts: classification-metrics
revisits: logistic-regression, naive-bayes, generalization, probability, testing
notebook: ml-classification-metrics
lab: 9
problem: A filter that never flags anything is 74% accurate on these messages. So what does 95% actually mean? Which mistakes matter more, a scam that gets through or a real message that gets blocked, and how do you measure and choose between them?
---

Lesson 8.3's Naive Bayes was right on 82 of 86 test messages, 95.3%. Logistic regression got 84, 97.7%. Those sound like grades, and they are misleading ones. Here's a "spam filter" with no model at all:

```python
def always_ham(message):
    return 0
```

It's right on every ham message, and three quarters of the messages are ham, so it scores **74.4%**. It has never caught a single scam. Any real score has to be read against that, and against what each kind of mistake costs.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_metrics.py provided
# Tests for metrics.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_metrics.py
import numpy as np
from pytest import approx
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics import f1_score, precision_score, recall_score, roc_auc_score

import messages
import nb

TEXTS, LABELS = messages.load("data/messages.csv")
TRAIN, TEST, TRAIN_LABELS, TEST_LABELS = messages.split(TEXTS, LABELS)
VECTORIZER = CountVectorizer().fit(TRAIN)
P_SPAM = nb.NaiveBayes().fit(VECTORIZER.transform(TRAIN).toarray(), TRAIN_LABELS).predict_proba(VECTORIZER.transform(TEST).toarray())[:, 1]

TRUTH = [1, 1, 0, 0, 1, 0]
CALLED = [1, 0, 1, 0, 1, 0]


def test_confusion_counts_the_four_outcomes():
    import metrics
    assert metrics.confusion(TRUTH, CALLED) == (2, 1, 1, 2)


def test_accuracy_of_always_saying_ham_looks_good():
    import metrics
    never = [0] * len(TEST_LABELS)
    assert metrics.accuracy(TEST_LABELS, never) == approx(64 / 86)


def test_rates_on_a_small_example():
    import metrics
    assert metrics.precision(TRUTH, CALLED) == approx(2 / 3)
    assert metrics.recall(TRUTH, CALLED) == approx(2 / 3)
    assert metrics.precision([1, 1, 0], [1, 0, 0]) == 1.0
    assert metrics.recall([1, 1, 0], [1, 0, 0]) == 0.5
    assert metrics.f1([1, 1, 0], [1, 0, 0]) == approx(2 * 1 * 0.5 / 1.5)


def test_rates_are_zero_rather_than_a_crash_when_nothing_is_called_spam():
    import metrics
    assert metrics.precision([1, 0], [0, 0]) == 0.0
    assert metrics.f1([1, 0], [0, 0]) == 0.0
    assert metrics.recall(TEST_LABELS, [0] * len(TEST_LABELS)) == 0.0


def test_rates_match_scikit_learn():
    import metrics
    called = (P_SPAM >= 0.5).astype(int)
    assert metrics.precision(TEST_LABELS, called) == approx(precision_score(TEST_LABELS, called))
    assert metrics.recall(TEST_LABELS, called) == approx(recall_score(TEST_LABELS, called))
    assert metrics.f1(TEST_LABELS, called) == approx(f1_score(TEST_LABELS, called))


def test_roc_auc_is_the_share_of_spam_ham_pairs_ranked_correctly():
    import metrics
    assert metrics.roc_auc([1, 0, 1, 0, 1], [0.9, 0.4, 0.4, 0.1, 0.8]) == approx(5.5 / 6)
    assert metrics.roc_auc(TEST_LABELS, P_SPAM) == approx(roc_auc_score(TEST_LABELS, P_SPAM))
```

`TRUTH` and `CALLED` are a small example to work by hand: what each message really was, and what a filter called it. The second example, `[1, 1, 0]` called `[1, 0, 0]`, is there because precision and recall come out *different* in it (one spam caught, one missed, no false alarms), so a version with the two formulas swapped can't pass.

```check
file tests/test_metrics.py -- Click "Create provided tests/test_metrics.py" above.
```

## Four outcomes, not two

A filter can be right in two ways and wrong in two ways:

| | called spam | called ham |
|---|---|---|
| **really spam** | **true positive** (TP): caught | **false negative** (FN): missed, a scam reaches the inbox |
| **really ham** | **false positive** (FP): a false alarm, a real message blocked | **true negative** (TN): delivered |

"Positive" means *called the class you're looking for* (spam), and "true"/"false" says whether that call was right.

> **Confusion matrix**: the table of these four counts. Every classification metric is a ratio of them.
>
> *Picture it as* an inspection gauge's record against a reference standard. A good part rejected (false positive) costs a part; a bad part passed (false negative) costs a customer. Quoting one "percent correct" hides which of those is happening.

Work the test's example. `TRUTH = [1, 1, 0, 0, 1, 0]`, `CALLED = [1, 0, 1, 0, 1, 0]`. Position by position: (1,1) TP, (1,0) FN, (0,1) FP, (0,0) TN, (1,1) TP, (0,0) TN. So TP = 2, FP = 1, FN = 1, TN = 2.

Create `metrics.py`:

```python file=metrics.py
import numpy as np


def confusion(y, predicted) -> tuple[int, int, int, int]:
    """(true positives, false positives, false negatives, true negatives)."""
    y, predicted = np.asarray(y), np.asarray(predicted)
    tp = int(np.sum((predicted == 1) & (y == 1)))
    fp = int(np.sum((predicted == 1) & (y == 0)))
    fn = int(np.sum((predicted == 0) & (y == 1)))
    tn = int(np.sum((predicted == 0) & (y == 0)))
    return tp, fp, fn, tn


def accuracy(y, predicted) -> float:
    tp, fp, fn, tn = confusion(y, predicted)
    return (tp + tn) / (tp + fp + fn + tn)
```

**`&`** combines two arrays of `True`/`False` element by element: `True` only where both are. (Python's `and` works on single values, not arrays; NumPy needs `&`, and the brackets around each comparison, because `&` binds more tightly than `==`.)

```check
run ".venv/Scripts/python -m pytest -q tests/test_metrics.py -k \"confusion or accuracy\"" label="the four counts, and the 74% accuracy of a filter that never flags anything"
```

## Precision and recall

Two questions matter, and each has a name:

> **Precision** = TP / (TP + FP): *of the messages called spam, what fraction really were?* High precision means few false alarms.
>
> **Recall** = TP / (TP + FN): *of the real spam, what fraction was caught?* High recall means few scams get through.
>
> *Picture them as* a quality inspector's two report lines. Precision: "of the parts I rejected, how many were really bad?" (every wrongly rejected part was scrapped for nothing). Recall: "of the bad parts made, how many did I stop?" (the rest shipped). An inspector who rejects nothing has perfect-looking scrap figures and stops no bad parts; one who rejects everything stops every bad part and scraps the whole line.

Usually you want a single number too. The **F1 score** combines the two:

$$F_1 = \frac{2 \times \text{precision} \times \text{recall}}{\text{precision} + \text{recall}}$$

This is the **harmonic mean**: unlike the ordinary average, it's dragged down hard by whichever is smaller. Precision 1.0 with recall 0.5 averages to 0.75, but F1 is 0.67; precision 1.0 and recall 0 gives F1 = 0. You can't hide a terrible recall behind a perfect precision.

Add them to `metrics.py`:

```python file=metrics.py
import numpy as np


def confusion(y, predicted) -> tuple[int, int, int, int]:
    """(true positives, false positives, false negatives, true negatives)."""
    y, predicted = np.asarray(y), np.asarray(predicted)
    tp = int(np.sum((predicted == 1) & (y == 1)))
    fp = int(np.sum((predicted == 1) & (y == 0)))
    fn = int(np.sum((predicted == 0) & (y == 1)))
    tn = int(np.sum((predicted == 0) & (y == 0)))
    return tp, fp, fn, tn


def accuracy(y, predicted) -> float:
    tp, fp, fn, tn = confusion(y, predicted)
    return (tp + tn) / (tp + fp + fn + tn)


def precision(y, predicted) -> float:
    tp, fp, _, _ = confusion(y, predicted)
    return tp / (tp + fp) if tp + fp else 0.0


def recall(y, predicted) -> float:
    tp, _, fn, _ = confusion(y, predicted)
    return tp / (tp + fn) if tp + fn else 0.0


def f1(y, predicted) -> float:
    p, r = precision(y, predicted), recall(y, predicted)
    return 2 * p * r / (p + r) if p + r else 0.0
```

- **`_`** is the conventional name for a value you're unpacking but not going to use.
- **`… if tp + fp else 0.0`**: a filter that calls nothing spam has TP + FP = 0, and dividing by zero would crash. A number is "true" in an `if` unless it's 0, so this returns 0.0 in exactly that case, as scikit-learn does (with a warning).

```check
run ".venv/Scripts/python -m pytest -q tests/test_metrics.py -k rates" label="precision, recall and F1, by hand and matching scikit-learn" -- precision = tp / (tp + fp); recall = tp / (tp + fn); each 0.0 when its bottom line is 0
```

## The threshold is a choice

Both models output a probability, and so far "spam" meant P(spam) ≥ 0.5. Nothing forces 0.5. A **lower** threshold calls more messages spam: more caught, more false alarms. A **higher** one does the opposite.

Which mistake is worse depends on the use, not the mathematics. For a spam filter, a blocked message from your doctor is usually much worse than one more scam to delete. For a fraud alert, or a cracked part in a brake assembly, a miss is far worse than a false alarm. Choose the threshold for the costs.

> **ROC AUC** (area under the receiver operating characteristic curve): a single score for how well a model *ranks* positives above negatives, across every possible threshold at once. It equals the probability that a randomly chosen positive gets a higher score than a randomly chosen negative. 1.0 is a perfect ranking; 0.5 is a coin toss.
>
> *Picture it as* lining up every message by the model's P(spam), lowest to highest, and asking how cleanly the spam has gathered at one end. A threshold is then just where you draw the line in that queue; AUC says how good the queue is before you draw it.

The "random pair" description is also the simplest way to compute it: for every (spam, ham) pair, score 1 if the spam scored higher, 0.5 for a tie, 0 otherwise, and take the average. In the test's example, scores 0.9, 0.4, 0.8 for spam and 0.4, 0.1 for ham: of the 3 × 2 = 6 pairs, five are ranked correctly and (0.4, 0.4) is a tie: 5.5 / 6.

Add it to `metrics.py`:

```python file=metrics.py
import numpy as np


def confusion(y, predicted) -> tuple[int, int, int, int]:
    """(true positives, false positives, false negatives, true negatives)."""
    y, predicted = np.asarray(y), np.asarray(predicted)
    tp = int(np.sum((predicted == 1) & (y == 1)))
    fp = int(np.sum((predicted == 1) & (y == 0)))
    fn = int(np.sum((predicted == 0) & (y == 1)))
    tn = int(np.sum((predicted == 0) & (y == 0)))
    return tp, fp, fn, tn


def accuracy(y, predicted) -> float:
    tp, fp, fn, tn = confusion(y, predicted)
    return (tp + tn) / (tp + fp + fn + tn)


def precision(y, predicted) -> float:
    tp, fp, _, _ = confusion(y, predicted)
    return tp / (tp + fp) if tp + fp else 0.0


def recall(y, predicted) -> float:
    tp, _, fn, _ = confusion(y, predicted)
    return tp / (tp + fn) if tp + fn else 0.0


def f1(y, predicted) -> float:
    p, r = precision(y, predicted), recall(y, predicted)
    return 2 * p * r / (p + r) if p + r else 0.0


def roc_auc(y, scores) -> float:
    """The chance that a randomly chosen positive scores higher than a randomly chosen negative (ties count half)."""
    y, scores = np.asarray(y), np.asarray(scores)
    positives, negatives = scores[y == 1], scores[y == 0]
    wins = sum(np.sum(p > negatives) + 0.5 * np.sum(p == negatives) for p in positives)
    return float(wins / (len(positives) * len(negatives)))
```

**`np.sum(p > negatives)`**: one spam score `p` compared with the whole array of ham scores gives an array of `True`/`False`, one per ham message; its sum is how many ham messages scored lower. Adding that up over every spam message counts all the correctly ranked pairs.

```check
run ".venv/Scripts/python -m pytest -q tests/test_metrics.py" label="ROC AUC counts correctly ranked pairs, exactly as roc_auc_score does"
```

## Both models, every threshold

Create `report.py`:

```python file=report.py
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer

import logistic
import messages
import metrics
import nb

texts, labels = messages.load("data/messages.csv")
train, test, train_labels, test_labels = messages.split(texts, labels)
vectorizer = CountVectorizer().fit(train)
X_train, X_test = vectorizer.transform(train).toarray(), vectorizer.transform(test).toarray()

always_ham = np.zeros(len(test), dtype=int)
print(f"always ham: accuracy {metrics.accuracy(test_labels, always_ham):.3f}, recall {metrics.recall(test_labels, always_ham):.3f}")

models = {"naive Bayes": nb.NaiveBayes(), "logistic regression": logistic.LogisticRegression()}
for name, model in models.items():
    p_spam = model.fit(X_train, train_labels).predict_proba(X_test)[:, 1]
    print(f"\n{name}: ROC AUC {metrics.roc_auc(test_labels, p_spam):.3f}")
    print("threshold  caught  false alarms  missed  precision  recall    F1")
    for threshold in [0.05, 0.1, 0.2, 0.5, 0.7, 0.9]:
        predicted = (p_spam >= threshold).astype(int)
        tp, fp, fn, _ = metrics.confusion(test_labels, predicted)
        print(f"{threshold:>9} {tp:>7} {fp:>13} {fn:>7} {metrics.precision(test_labels, predicted):>10.3f}"
              f" {metrics.recall(test_labels, predicted):>7.3f} {metrics.f1(test_labels, predicted):>5.3f}")
```

```powershell
.venv\Scripts\python report.py
```

```text
always ham: accuracy 0.744, recall 0.000

naive Bayes: ROC AUC 0.981
threshold  caught  false alarms  missed  precision  recall    F1
     0.05      21             4       1      0.840   0.955 0.894
      0.1      21             4       1      0.840   0.955 0.894
      0.2      21             3       1      0.875   0.955 0.913
      0.5      20             2       2      0.909   0.909 0.909
      0.7      20             1       2      0.952   0.909 0.930
      0.9      20             1       2      0.952   0.909 0.930

logistic regression: ROC AUC 0.992
threshold  caught  false alarms  missed  precision  recall    F1
     0.05      22            15       0      0.595   1.000 0.746
      0.1      21             6       1      0.778   0.955 0.857
      0.2      20             0       2      1.000   0.909 0.952
      0.5      20             0       2      1.000   0.909 0.952
      0.7      18             0       4      1.000   0.818 0.900
      0.9      12             0      10      1.000   0.545 0.706
```

How to read it:

- **Down each table, the trade-off.** Raising the threshold moves messages from "caught" and "false alarms" into "missed" and "delivered": precision rises, recall falls. Logistic regression at 0.05 catches every scam but blocks 15 real messages; at 0.9 it blocks nothing real but lets 10 of 22 scams through.
- **Across the models.** Logistic regression ranks better (AUC 0.992 against 0.981), and between thresholds 0.2 and 0.5 it has no false alarms at all, while Naive Bayes always has at least one ("Just got home, so tired" scores 0.974). For a spam filter, where a blocked real message is the costly mistake, that's the decisive difference.
- **No threshold catches everything without false alarms.** The parcel scam scores 0.11 with logistic regression, below some real messages. A threshold can only choose *which* mistakes; only better data (lesson 8.3) reduces both.

```predict
question: You plan to pick the threshold by reading this table and choosing the one with the best F1 on these 86 messages. What's wrong with that?
choice: Nothing: F1 is the right measure
choice: These are the test messages: choosing with them makes their score optimistic, as in lesson 7.2
choice: F1 can't be computed for some thresholds
answer: These are the test messages: choosing with them makes their score optimistic, as in lesson 7.2
explain: The threshold is a hyperparameter, like the degree or the ridge penalty. Choose it with cross-validation on the training messages (or a separate validation set), then report the test set once. This table is for understanding the trade-off; with 22 test spam messages, one message more or less moves recall by 0.045, so a threshold tuned to them would be tuned to noise.
```

```check
run ".venv/Scripts/python report.py" stdout="logistic regression: ROC AUC 0.992" label="report.py compares both models across thresholds"
```

### Which metric when

| Situation | Look at |
|---|---|
| Classes about equally common, mistakes equally costly | accuracy is fine |
| One class rare (spam, fraud, defects) | precision and recall; never accuracy alone |
| False alarms are expensive (blocking real mail) | precision, at a threshold that keeps it high |
| Misses are expensive (cracked parts, fraud) | recall |
| Comparing models before choosing a threshold | ROC AUC |
| One number for a balanced trade-off | F1 |

That completes the spam detector: counting, Bayes' rule, text as numbers, two models built from scratch and matched to scikit-learn, and an honest way to say how good they are. Next chapter: models you can read like a flowchart, **decision trees**.
