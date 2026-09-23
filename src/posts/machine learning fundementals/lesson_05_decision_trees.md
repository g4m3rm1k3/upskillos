# Lesson 5 — Splitting Decisions: Decision Trees

## Concept, in plain English

Every model so far has been "find the best numbers for a formula." A decision
tree is completely different: it's a series of yes/no questions
(`is feature_2 > 3?`) arranged so that, by the time you've answered a few of
them, you know the answer. No gradient descent, no weights — just picking the
*best question* to ask at each step, over and over.

"Best question" needs a precise meaning. A good question is one that, once
answered, leaves you much more certain about the label than you were before.
That "how uncertain am I" measurement is **entropy**, and "how much a question
reduces it" is **information gain**.

## The math

Entropy of a set of labels (using `0`/`1` labels, `p` = fraction of `1`s):

```
entropy = -(p * log2(p) + (1 - p) * log2(1 - p))
```

This is the same log-loss shape from Lesson 4, applied to a whole group
instead of one prediction. Worked examples:
- All labels the same, `p = 1.0`: `entropy = -(1*log2(1) + 0*log2(0))`. By
  convention `0 * log2(0) = 0` (the limit), so `entropy = 0` — zero
  uncertainty, makes sense, every label is identical.
- Perfectly mixed, `p = 0.5`: `entropy = -(0.5*log2(0.5) + 0.5*log2(0.5)) =
  -(0.5*-1 + 0.5*-1) = 1.0` — maximum uncertainty for a binary label.

Information gain of a question: entropy *before* asking it, minus the
weighted average entropy of the two groups it splits the data into *after*:

```
information_gain = entropy_before - (
    (fraction_in_left_group  * entropy_of_left_group) +
    (fraction_in_right_group * entropy_of_right_group)
)
```

Worked example: 4 points, labels `[0, 0, 1, 1]` — `entropy_before = 1.0`
(perfectly mixed). Suppose a question splits them into left `[0, 0]` and right
`[1, 1]`:
- `entropy_of_left_group = 0` (all same), `entropy_of_right_group = 0` (all same)
- `information_gain = 1.0 - (0.5*0 + 0.5*0) = 1.0` — this question perfectly
  separated the classes, so it captures *all* the available information. That's
  the best possible score, and it's exactly the tip-off that this is a great
  question to ask.

## Type this — Cell 1 (new notebook)

```python
import math

def entropy(labels):
    if len(labels) == 0:
        return 0
    fraction_positive = sum(labels) / len(labels)
    if fraction_positive == 0 or fraction_positive == 1:
        return 0
    fraction_negative = 1 - fraction_positive
    return -(fraction_positive * math.log2(fraction_positive) + fraction_negative * math.log2(fraction_negative))
```

Check against both hand examples:

```python
entropy([1, 1, 1, 1])
```

```python
entropy([0, 0, 1, 1])
```

You should get `0.0` and `1.0`.

## What just happened

The `if fraction_positive == 0 or fraction_positive == 1` guard exists purely
because `log2(0)` is undefined — you're handling the same edge case Lesson 4
mentioned but skipped, since decision trees hit it constantly (any pure group
has entropy exactly 0).

## Type this — Cell 2

A "question" here is simply: pick one feature, pick a threshold, split the
data into "at or below threshold" and "above threshold." Write the split
first:

```python
def split_data(feature_data, labels, feature_index, threshold):
    left_labels = []
    right_labels = []
    for features, label in zip(feature_data, labels):
        if features[feature_index] <= threshold:
            left_labels.append(label)
        else:
            right_labels.append(label)
    return left_labels, right_labels
```

## Type this — Cell 3

Information gain, using `entropy` and `split_data` together:

```python
def information_gain(feature_data, labels, feature_index, threshold):
    entropy_before = entropy(labels)
    left_labels, right_labels = split_data(feature_data, labels, feature_index, threshold)
    total_count = len(labels)
    fraction_left = len(left_labels) / total_count
    fraction_right = len(right_labels) / total_count
    entropy_after = (fraction_left * entropy(left_labels)) + (fraction_right * entropy(right_labels))
    return entropy_before - entropy_after
```

## Type this — Cell 4

Reuse Lesson 4's classification data to test it:

```python
classification_features = [[1, 1], [2, 1], [1, 3], [3, 3], [4, 2], [5, 4]]
classification_labels = [0, 0, 0, 1, 1, 1]
```

```python
information_gain(classification_features, classification_labels, feature_index=0, threshold=2)
```

Try a few different `feature_index`/`threshold` combinations by hand and
compare the scores — you're doing manually what the next cell automates.

## Type this — Cell 5

Search over every feature and a range of thresholds to find the single best
question — this is "training" a decision tree stump (one question, one
split):

```python
def find_best_split(feature_data, labels):
    num_features = len(feature_data[0])
    best_gain = -1
    best_feature_index = None
    best_threshold = None
    for feature_index in range(num_features):
        candidate_thresholds = sorted(set(features[feature_index] for features in feature_data))
        for threshold in candidate_thresholds:
            gain = information_gain(feature_data, labels, feature_index, threshold)
            if gain > best_gain:
                best_gain = gain
                best_feature_index = feature_index
                best_threshold = threshold
    return best_feature_index, best_threshold, best_gain
```

Run it:

```python
find_best_split(classification_features, classification_labels)
```

## What just happened

`find_best_split` tries every plausible question (every feature, every value
that appears as a candidate threshold) and keeps the one with the highest
information gain. A real decision tree just repeats this: split, then
recursively call `find_best_split` again on each of the two resulting groups,
stopping when a group is pure (entropy `0`) or too small to split further.

## Checkpoint exercise

1. Manually apply `find_best_split`'s winning split to your data (using
   `split_data`), then call `find_best_split` again on the resulting left and
   right groups separately. Notice one or both may already be pure
   (`entropy == 0`) — if so, that branch is a finished leaf.
2. Add a `print` inside `find_best_split`'s loop showing every
   `(feature_index, threshold, gain)` combination it tries, so you can watch
   it search rather than only seeing the winner.
3. This lesson never used gradient descent — no weights, no learning rate.
   Note down, in your own words, why: what would "the derivative of
   information gain" even mean here? (It doesn't, cleanly — thresholds are
   discrete choices, not something you nudge smoothly. That's *why* trees use
   search instead of calculus.)

Next lesson: k-means clustering — no labels at all this time, just points and
the question "which points belong together." Say "next lesson" when ready.
