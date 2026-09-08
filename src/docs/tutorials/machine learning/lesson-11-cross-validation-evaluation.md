# Lesson 11 — Can You Trust That Number? Cross-Validation and Evaluation

## What you'll learn
- Why a single train/test split — especially on a small dataset, which is every dataset used in this series so far — can hand you a number that's more luck than measurement.
- k-fold cross-validation: a way to use *every* row as a test example exactly once, instead of trusting one arbitrary split.
- Why "accuracy" can be a genuinely dangerous number to report on its own, and the confusion-matrix metrics (precision, recall, F1) that reveal what accuracy hides.

## What you'll build
A k-fold cross-validation harness and a full confusion-matrix metric suite, applied to a realistically imbalanced "incident detection" dataset — revealing that a model boasting 90% accuracy can simultaneously be catching zero real incidents.

---

## The question

You've logged 40 calls. Only 4 of them were genuine incidents — a realistic 10% rate, not the roughly-balanced toy datasets used earlier in this series:

- 36 normal calls, `n` ranging from 1,000 to 8,000.
- 4 incident calls, `n` at 30,000, 32,000, 34,000, and 36,000.

You train a classifier. It reports **90% accuracy** on a held-out test set. Should you be impressed?

---

## 1. Predict

Before answering that: if a classifier did *nothing at all* — always predicted "normal," regardless of input — what accuracy would it get on this exact dataset, purely from the fact that 36 out of 40 calls really are normal? Compare that number, in your head, to the "90% accuracy" figure above, before reading further.

---

## 2. Try it: one split can lie to you

```python
import numpy as np

n = np.array([1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800,
              3000, 3200, 3400, 3600, 3800, 4000, 4200, 4400, 4600, 4800,
              5000, 5200, 5400, 5600, 5800, 6000, 6200, 6400, 6600, 6800,
              7000, 7200, 7400, 7600, 7800, 8000,
              30000, 32000, 34000, 36000], dtype=float)
labels = np.array([0]*36 + [1]*4)

def confusion_counts(y_true, y_pred):
    tp = np.sum((y_true == 1) & (y_pred == 1))
    tn = np.sum((y_true == 0) & (y_pred == 0))
    fp = np.sum((y_true == 0) & (y_pred == 1))
    fn = np.sum((y_true == 1) & (y_pred == 0))
    return tp, tn, fp, fn

def simple_model_predict(n_values, threshold=20000):
    return (n_values > threshold).astype(int)

split_a_test = np.array([0, 5, 10, 15, 20, 25, 30, 35])       # unlucky: no incidents at all
split_b_test = np.array([0, 10, 20, 30, 36, 37, 38, 39])      # lucky: all 4 incidents included

for name, test_idx in [("split A", split_a_test), ("split B", split_b_test)]:
    y_true = labels[test_idx]
    y_pred = simple_model_predict(n[test_idx])
    tp, tn, fp, fn = confusion_counts(y_true, y_pred)
    accuracy = (tp + tn) / len(test_idx)
    print(f"{name}: positives in test={np.sum(y_true)}  accuracy={accuracy:.2f}")
```

### What this code does

- **`labels = np.array([0]*36 + [1]*4)`** — Python list multiplication and concatenation (`[0]*36` repeats `0` thirty-six times as a list), building the label array directly rather than via a formula — deliberately explicit about the exact 36-vs-4 imbalance.

- **`confusion_counts(y_true, y_pred)`** — four boolean-and-mask combinations, each counting one of the four possible outcomes for a binary classifier: **true positive** (`tp`, correctly caught an incident), **true negative** (`tn`, correctly identified normal), **false positive** (`fp`, wrongly flagged normal as incident), **false negative** (`fn`, missed a real incident). `(y_true == 1) & (y_pred == 1)` — the `&` operator (elementwise array AND, as established in Lesson 7) — is `True` only where both conditions hold for the same row; `np.sum` counts how many rows satisfy that.

- **`split_a_test = np.array([0, 5, 10, 15, 20, 25, 30, 35])`** — eight *specific* row indices, deliberately chosen (not randomly drawn here) to land entirely within the first 36 rows — every single one a normal call, none an incident. **`split_b_test`** deliberately includes indices `36`–`39`, all four incidents, alongside four normal rows.

### What happens

Both splits will very likely report **high accuracy** — the classifier easily gets the normal calls right in split A (there's nothing else to get right, since there are zero incidents in that test set at all), and does well on split B too, since the huge `n` gap makes incidents easy to spot. But split A's accuracy number tells you **nothing whatsoever** about whether the model can detect an incident — it was never tested on one. Split B's accuracy, meanwhile, was computed on a test set where incidents make up 50% of the rows, four times their true 10% rate in the full dataset — not representative of what you'd see in production. **A single random split, especially with a rare class, can hand you a number that looks meaningful but was really decided by which handful of rows happened to land in the test set.**

---

## 3. Why: use every row as the test set, exactly once

**The mechanism** behind k-fold cross-validation: split the whole dataset into `k` roughly equal chunks ("folds"). For each fold in turn, treat it as the test set and train on everything else; repeat `k` times total, so every single row gets used as a test example in exactly one round. Average the results across all `k` rounds.

```python
def make_folds(num_rows, k, seed=0):
    rng = np.random.RandomState(seed)
    indices = np.arange(num_rows)
    rng.shuffle(indices)
    return np.array_split(indices, k)

def precision_recall_f1(tp, fp, fn):
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
    return precision, recall, f1

def cross_validate(n_values, labels, k=5, threshold=20000, seed=0):
    folds = make_folds(len(labels), k, seed)
    results = []
    for i, test_idx in enumerate(folds):
        y_true = labels[test_idx]
        y_pred = simple_model_predict(n_values[test_idx], threshold)
        tp, tn, fp, fn = confusion_counts(y_true, y_pred)
        accuracy = (tp + tn) / len(test_idx)
        precision, recall, f1 = precision_recall_f1(tp, fp, fn)
        results.append((accuracy, precision, recall, f1))
        print(f"fold {i}: n_test={len(test_idx):>2} positives_in_test={np.sum(y_true)}  "
              f"accuracy={accuracy:.2f} precision={precision:.2f} recall={recall:.2f} f1={f1:.2f}")
    return np.array(results)

fold_results = cross_validate(n, labels, k=5)
print(f"\naverage across folds: {fold_results.mean(axis=0)}")
```

### Code mechanics

- **`rng = np.random.RandomState(seed)`** — a *dedicated* random number generator object, distinct from the global generator used by plain `np.random.seed(...)` in earlier lessons. Using a dedicated instance means shuffling these particular indices doesn't consume or interfere with random numbers used anywhere else in a larger program — a real, practical concern once code grows beyond a single self-contained script.

- **`rng.shuffle(indices)`** — shuffles `indices` **in place** (modifies the array directly, returns nothing) — randomizing which original rows end up in which fold, so folds aren't just "the first 8 rows, the next 8 rows," which could accidentally group similar data together depending on how the dataset happened to be ordered.

- **`np.array_split(indices, k)`** — splits an array into `k` pieces, and — unlike the stricter `np.split`, which requires the array to divide evenly and raises an error otherwise — `array_split` tolerates uneven division, making some folds one element larger than others if `num_rows` isn't a multiple of `k`.

- **`precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0`** — a guard against dividing by zero (echoing the numerical-safety theme from Lessons 2 and 6): if a fold's model made zero positive predictions at all, `tp + fp` is `0`, and precision is conventionally reported as `0.0` rather than crashing on division by zero.

- **`precision`** answers: *of everything the model flagged as an incident, how much actually was one?* **`recall`** answers: *of everything that actually was an incident, how much did the model catch?* **`f1`** combines both into one number via their harmonic mean, which — unlike a plain average — stays low if *either* precision or recall is low, rather than being pulled up by whichever one is high.

- **`for i, test_idx in enumerate(folds):`** — each of the `k` folds gets a turn as the test set; whatever isn't `test_idx` for that round implicitly serves as the training data (in a genuinely trainable model, you'd fit it using only those rows — this lesson's fixed `threshold=20000` doesn't need fitting, so training is a no-op here, but the *evaluation* structure is identical to a real trainable model's).

### Mental model

```
shuffle all rows, split into k folds
        ↓
for each fold:
    hold this ONE fold out as test
    train on everything else
    evaluate on the held-out fold
        ↓
every row has now been a test example EXACTLY ONCE across all k rounds
        ↓
average the per-fold metrics — this average is far less at the mercy of
which specific rows happened to land in any one lucky or unlucky split
```

---

## 4. Change one thing

Here's the smallest possible change with the largest possible consequence — computing additional metrics from confusion counts you'd already calculated anyway:

```diff
  tp, tn, fp, fn = confusion_counts(y_true, y_pred)
  accuracy = (tp + tn) / len(test_idx)
- print(f"accuracy={accuracy:.2f}")
+ precision, recall, f1 = precision_recall_f1(tp, fp, fn)
+ print(f"accuracy={accuracy:.2f} precision={precision:.2f} recall={recall:.2f} f1={f1:.2f}")
```

**What changed:** how many numbers get reported from the exact same underlying predictions.

**What did not change:** `tp`, `tn`, `fp`, and `fn` — the raw counts — are computed identically either way; nothing about the model or its predictions changed at all.

**Why this single change matters enormously:** two models can report *identical* accuracy while having wildly different `tp`, `fp`, `fn` breakdowns underneath — accuracy alone can't distinguish "catches every incident, with a few false alarms" from "catches no incidents at all, but the dataset is imbalanced enough that being wrong about the rare class barely dents the accuracy number." Section 6 makes this concrete with real numbers.

---

## 5. Put it in the project

```python
for k_value in [5, 10]:
    print(f"\n--- k={k_value} ---")
    results = cross_validate(n, labels, k=k_value)
    print(f"average: accuracy={results[:,0].mean():.2f} precision={results[:,1].mean():.2f} "
          f"recall={results[:,2].mean():.2f} f1={results[:,3].mean():.2f}")
```

### Code walkthrough

- **`results[:, 0].mean()`** — `results` is a 2D array where each row is one fold's `(accuracy, precision, recall, f1)`; `results[:, 0]` selects the first column (accuracy) across all folds (as in Lesson 5's diagnostics), and `.mean()` averages just that column.

### Why this design: choosing k for k-fold

**Problem:** how many folds should you use — `k=5`? `k=10`? As many folds as rows (called "leave-one-out")?

**Available choices:** a small `k` (like `5`), a larger `k` (like `10`), or leave-one-out (`k = len(labels)`, testing on exactly one row per round).

**Selected choice:** `k=5` or `k=10` are the most common defaults in practice.

**Reason:** with `k=5`, each fold holds out `20%` of the data for testing, using `80%` for training each round — a reasonable balance. Leave-one-out uses the *most* possible training data each round (helpful when data is scarce, as it is here), but requires training the model `40` separate times for this dataset, and produces per-fold metrics based on a single test row each — for classification metrics like precision/recall computed per fold, a single-row test fold is almost meaningless on its own (though the overall average across all 40 one-row folds still carries information).

**Cost:** larger `k` means more training runs (more compute) in exchange for using more data per training round; smaller `k` is cheaper but each round trains on less data and tests on more.

**Revisit condition:** with a genuinely small dataset (this lesson's 40 rows, or the even smaller 10–12 row datasets used earlier in this series), leaning toward a larger `k` (or even leave-one-out) is common specifically because there's so little data that holding out a large test chunk each round would leave too little to train on.

---

## 6. The trap

**Normal rule:** a model reporting high accuracy has learned something useful about telling the classes apart.

**Apparently reasonable comparison** — a baseline "model" that does no work at all, always predicting the majority class:

```python
baseline_pred = np.zeros(len(labels), dtype=int)
tp, tn, fp, fn = confusion_counts(labels, baseline_pred)
accuracy = (tp + tn) / len(labels)
precision, recall, f1 = precision_recall_f1(tp, fp, fn)
print(f"baseline (always predict 'normal'): accuracy={accuracy:.2f}  "
      f"precision={precision:.2f} recall={recall:.2f} f1={f1:.2f}")
```

**Surprising result:** `accuracy` prints `0.90` — a 90% accurate "model" — despite `baseline_pred` containing **literally no logic at all**: it always outputs `0`, never once considering `n`. `recall` prints `0.00` — this baseline catches **zero** of the four actual incidents, by construction, every single time. If someone reported only the accuracy figure, `0.90` sounds like a working, respectable classifier; the confusion matrix reveals it's completely blind to the exact thing it was supposedly built to detect.

**Exact reason:** accuracy is defined as `(tp + tn) / total` — it counts *both* classes' correct predictions with equal weight, and with 36 normal calls contributing to `tn` versus only 4 incidents contributing to `tp`, getting the majority class right 36 times out of 40 already produces a 90% score, entirely independent of how the minority class is handled. Accuracy, by its very definition, rewards a model for exploiting class imbalance — it doesn't distinguish "good at the easy majority class" from "good at the hard, rare, usually-more-important minority class."

**Project consequence:** whenever classes are imbalanced — which is the *normal* case for real problems like fraud, rare disease diagnosis, or incident detection, not an edge case — accuracy alone is not just incomplete, it's actively misleading, because it can look nearly identical for a genuinely useful detector and a detector that does nothing. Always report precision, recall (and typically F1) alongside accuracy for imbalanced problems, and be specifically suspicious of any high-accuracy claim on a rare-event detection task until you've seen the confusion matrix behind it.

---

## 7. Under the hood

*(Optional — not required to perform cross-validation correctly.)*

This lesson's `make_folds` shuffles rows randomly without regard to their labels, which means — as Section 2 demonstrated with hand-picked examples — a fold can, by chance, end up with very few or even zero positive examples, especially with a rare class like this one. Real cross-validation implementations commonly use **stratified k-fold**, which deliberately preserves the overall class ratio (here, roughly 10% positive) *within every single fold*, rather than leaving that to chance. This lesson's version doesn't implement stratification — a known simplification, in the same spirit as earlier lessons flagging early-stopping (Lesson 5) or KD-trees (Lesson 7) as real refinements left unimplemented. Also worth knowing: precision, recall, and F1 aren't the only metrics for imbalanced classification — ROC curves and the area under them (AUC) are another common family, useful particularly when you want to evaluate a model's ranking ability across every possible decision threshold at once, rather than committing to one threshold up front the way this lesson's `simple_model_predict` does.

---

## 8. Exercises

- **Predict:** for `k=10` on this 40-row dataset, each fold holds exactly 4 rows. Given only 4 incidents total in the whole dataset, what's the best case and worst case for how many incidents could land in any single fold? What does that suggest about how noisy individual fold metrics might still be, even with cross-validation?
- **Modify:** implement a simple stratified version of `make_folds`: shuffle the positive-labeled indices and negative-labeled indices *separately*, then distribute each group evenly across the `k` folds, so every fold ends up with roughly the same 10% positive rate. Compare the per-fold `positives_in_test` counts against the unstratified version.
- **Break:** change `simple_model_predict`'s threshold to `50000` (higher than every `n` value in the dataset, so it never predicts an incident at all). Run `cross_validate` and confirm the average accuracy still looks deceptively reasonable, while precision, recall, and F1 all reveal the truth.
- **Trace:** for split A from Section 2 (the all-normal test set), walk through `confusion_counts` by hand: what are `tp`, `fp`, and `fn` when there are literally zero positive examples in `y_true`? Explain why `precision_recall_f1`'s zero-division guards make `recall` report `0.0` in this case, even though there was no incident for the model to have any chance of catching — and why that's a slightly misleading edge case worth knowing about, distinct from Section 6's genuine failure.

---

## What to remember

- A single train/test split's reported metrics depend heavily on which specific rows happened to land in the test set — especially damaging when the class you care about most is rare. k-fold cross-validation fixes this by using every row as a test example exactly once and averaging the results.
- Accuracy treats every class as equally important by definition — on imbalanced data, that means a model can score misleadingly high by simply being good at the easy, common class while being completely useless at the rare, often more important one.
- Precision, recall, and F1, computed from the same confusion matrix accuracy is computed from, reveal exactly what accuracy hides — always check them together on any imbalanced classification problem, not accuracy in isolation.

## Next lesson

This closes out the classic machine learning half of this series — every algorithm so far was a specific, hand-designed shape: a line, a tree, a set of neighbors, a probability table. The next half asks a different question entirely: what if, instead of designing the shape of the model yourself, you built it out of the smallest possible reusable unit — a single artificial neuron — and let stacking many of them discover the right shape on its own? That's the leap into deep learning, starting with the perceptron.
