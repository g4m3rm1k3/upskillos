# Lesson 7 — Phase A Capstone

## Concept, in plain English

No new math this lesson. The goal is to run everything you built in Lessons
1–6 against one real (small) dataset, in one notebook, and cross-check each
hand-built result against scikit-learn's version of the same algorithm — not
to replace your code, just to confirm it's correct before you move on to
neural networks, where debugging gets harder and you'll want to trust your
foundations.

## Type this — Cell 1 (new notebook)

Load a small real dataset — the classic Iris dataset, built into
scikit-learn, no download needed. We'll use just two features and two of the
three flower species, so it stays binary and matches your Lesson 4/5 code
without modification:

```python
from sklearn.datasets import load_iris

iris = load_iris()
is_binary_subset = iris.target < 2
capstone_features = iris.data[is_binary_subset][:, :2].tolist()
capstone_labels = iris.target[is_binary_subset].tolist()
```

```python
len(capstone_features), capstone_features[0], capstone_labels[0]
```

## What just happened

`iris.target < 2` keeps only the first two species (binary classification,
matching everything you built). `[:, :2]` keeps only the first two of Iris's
four features (petal/sepal measurements), so your 2-feature functions from
Lessons 3–5 work unchanged. `.tolist()` converts from NumPy arrays back to
plain Python lists, since that's what your hand-built functions expect.

## Type this — Cell 2 — logistic regression, hand-built vs. scikit-learn

Retype (or copy forward from Lesson 4's notebook) `dot_product`, `sigmoid`,
`predict_probability`, `compute_logistic_gradients`, and
`gradient_descent_logistic`. Then:

```python
trained_weights, trained_intercept = gradient_descent_logistic(
    capstone_features, capstone_labels, num_features=2, learning_rate=0.01, num_steps=5000
)
trained_weights, trained_intercept
```

Now the scikit-learn version, same data:

```python
from sklearn.linear_model import LogisticRegression

sklearn_model = LogisticRegression()
sklearn_model.fit(capstone_features, capstone_labels)
sklearn_model.coef_, sklearn_model.intercept_
```

## What just happened

Your hand-trained `trained_weights`/`trained_intercept` should be in the same
ballpark as `sklearn_model.coef_`/`sklearn_model.intercept_` — not identical
(scikit-learn uses a more sophisticated optimizer and adds regularization by
default), but pointing the same direction and separating the classes
similarly. This is your real correctness check: if yours were wildly
different or nonsensical, that would flag a bug worth chasing down before
Phase B.

## Type this — Cell 3 — compare predictions directly

Rather than compare raw numbers, compare actual predictions on the training
data — a more meaningful check:

```python
your_correct = 0
sklearn_correct = 0
for features, actual_label in zip(capstone_features, capstone_labels):
    your_prediction = 1 if predict_probability(features, trained_weights, trained_intercept) > 0.5 else 0
    sklearn_prediction = sklearn_model.predict([features])[0]
    if your_prediction == actual_label:
        your_correct = your_correct + 1
    if sklearn_prediction == actual_label:
        sklearn_correct = sklearn_correct + 1

your_accuracy = your_correct / len(capstone_labels)
sklearn_accuracy = sklearn_correct / len(capstone_labels)
your_accuracy, sklearn_accuracy
```

This dataset subset is easy (the two species are well separated), so expect
both accuracies at or near `1.0`.

## Type this — Cell 4 — decision tree, hand-built vs. scikit-learn

Retype (or copy forward) `entropy`, `split_data`, `information_gain`, and
`find_best_split` from Lesson 5. Then:

```python
find_best_split(capstone_features, capstone_labels)
```

```python
from sklearn.tree import DecisionTreeClassifier

sklearn_tree = DecisionTreeClassifier(max_depth=1)
sklearn_tree.fit(capstone_features, capstone_labels)
sklearn_tree.tree_.feature[0], sklearn_tree.tree_.threshold[0]
```

## What just happened

`sklearn_tree.tree_.feature[0]` is the feature index scikit-learn's tree
chose for its very first (and, with `max_depth=1`, only) split;
`sklearn_tree.tree_.threshold[0]` is the threshold it chose. Compare both
directly against your `find_best_split` output — with a clean, well-separated
dataset like this one, they should pick the *same* feature and a very close
threshold, since information gain has one clear winner here.

## Type this — Cell 5 — k-means, hand-built vs. scikit-learn

Retype (or copy forward) `distance`, `compute_centroid`,
`assign_to_nearest_centroid`, `recompute_centroids`, and `k_means` from
Lesson 6. Run it on the *unlabeled* features (k-means never sees
`capstone_labels`):

```python
your_centroids, your_assignments = k_means(
    capstone_features, num_clusters=2, starting_centroids=[capstone_features[0], capstone_features[-1]], num_steps=10
)
your_centroids
```

```python
from sklearn.cluster import KMeans

sklearn_kmeans = KMeans(n_clusters=2, n_init=10)
sklearn_kmeans.fit(capstone_features)
sklearn_kmeans.cluster_centers_
```

## What just happened

Compare `your_centroids` to `sklearn_kmeans.cluster_centers_` — again,
expect close but not identical numbers (different starting points can
converge to a permuted or slightly shifted answer). If you want a cleaner
comparison, check whether your `your_assignments` groups the *same points
together* as scikit-learn's `sklearn_kmeans.labels_`, since cluster index
`0` vs `1` is arbitrary and can be swapped between the two runs.

## Checkpoint exercise — the real capstone task

Working entirely on your own now, no new code given:

1. Repeat Cells 2–3 (logistic regression comparison) using all four of
   Iris's original features instead of just two — your `predict_probability`
   and `gradient_descent_logistic` already work generically for any
   `num_features`, from Lesson 3's design.
2. Write one paragraph, in your own words, on *why* your hand-built models
   and scikit-learn's agree as closely as they do — tie it back to the math:
   same loss function, same gradient direction, just a different (more
   efficient) optimizer walking toward the same minimum.
3. If any of your three algorithms disagreed sharply with scikit-learn's,
   debug it now — this is the checkpoint to catch it, before Phase B builds
   directly on this exact same "prediction function + loss function +
   gradient descent" pattern inside a neural network.

That closes Phase A. Phase B starts by reframing Lesson 4's single logistic
regression neuron as literally one neuron of a neural network — the jump is
smaller than it sounds. Say "next lesson" when ready.
