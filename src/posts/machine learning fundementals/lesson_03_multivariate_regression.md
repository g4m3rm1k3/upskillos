# Lesson 3 — More Than One Input: Multivariate Regression

## Concept, in plain English

Real predictions almost never depend on just one number. House price depends
on square footage *and* number of bedrooms *and* age. Lesson 1's line was
`slope * x + intercept` — one weight, one input. Now we need one weight *per
input*, all added together. That sum-of-weighted-inputs is called a dot
product, and it's the single most-used operation in all of machine learning —
you'll see it again in every remaining lesson of this course.

## The math

One data point now has several features, e.g. `[square_feet, num_bedrooms]`.
Each feature gets its own weight. Prediction becomes:

```
predicted_y = (weight_1 * feature_1) + (weight_2 * feature_2) + ... + intercept
```

That sum of `weight_i * feature_i` terms is the **dot product** of the weight
vector and the feature vector. Worked example: weights `[3, 2]`, features
`[10, 5]`:

```
dot_product = 3*10 + 2*5 = 30 + 10 = 40
```

Nothing new is happening mathematically here — it's Lesson 1's single
multiplication, just repeated once per feature and summed. The derivative
story from Lesson 2 also doesn't change in kind: each weight gets its own
partial derivative, computed the exact same way, just with that weight's
matching feature standing in for `x`.

## Type this — Cell 1 (new notebook for this lesson)

Data with two features per point. Each *row* is one point; each point has two
features:

```python
feature_data = [[1, 10], [2, 20], [3, 15], [4, 25], [5, 30]]
target_values = [21, 42, 39, 58, 71]
```

## Type this — Cell 2

Dot product, by hand with a loop — no NumPy yet, so you see exactly what it's
doing:

```python
def dot_product(weights, features):
    total = 0
    for weight, feature in zip(weights, features):
        total = total + weight * feature
    return total
```

Check it against the hand example:

```python
dot_product([3, 2], [10, 5])
```

You should get `40`.

## What just happened

`zip(weights, features)` walks both lists together, pairing each weight with
its matching feature. This is the entire mechanism behind "a neuron" later in
Phase B — remember this function, you'll recognize it again.

## Type this — Cell 3

Prediction, now built from `dot_product` instead of a single multiplication:

```python
def predict_multivariate(features, weights, intercept):
    return dot_product(weights, features) + intercept
```

Sanity check against your data — pick a plausible `[weight_1, weight_2]` you
guess and see roughly how far off it is; don't worry about getting it right,
you're about to let gradient descent handle that.

## Type this — Cell 4

Mean squared error, same shape as Lesson 1, now looping over `feature_data`:

```python
def mean_squared_error_multivariate(feature_data, target_values, weights, intercept):
    total_error = 0
    for features, actual_y in zip(feature_data, target_values):
        predicted_y = predict_multivariate(features, weights, intercept)
        total_error = total_error + (actual_y - predicted_y) ** 2
    return total_error / len(feature_data)
```

## Type this — Cell 5

The gradient, generalized. Each weight gets its own derivative, computed with
its own matching feature — this is the only real conceptual jump in this
lesson, so go slowly:

```python
def compute_weight_gradients(feature_data, target_values, weights, intercept):
    num_weights = len(weights)
    weight_gradients = [0] * num_weights
    intercept_gradient = 0
    for features, actual_y in zip(feature_data, target_values):
        predicted_y = predict_multivariate(features, weights, intercept)
        error_term = actual_y - predicted_y
        for i in range(num_weights):
            weight_gradients[i] = weight_gradients[i] + (2 * error_term * (-features[i]))
        intercept_gradient = intercept_gradient + (2 * error_term * (-1))
    weight_gradients = [g / len(feature_data) for g in weight_gradients]
    intercept_gradient = intercept_gradient / len(feature_data)
    return weight_gradients, intercept_gradient
```

## What just happened

Compare this to Lesson 2's `average_slope_derivative`. Same formula
(`2 * error_term * (-x)`) — it's just now applied once per feature per point,
accumulated into a list instead of a single number. Nothing new mathematically,
only bookkeeping.

## Type this — Cell 6

Gradient descent loop, updating a whole list of weights each step:

```python
def gradient_descent_multivariate(feature_data, target_values, num_features, learning_rate, num_steps):
    weights = [0] * num_features
    intercept = 0
    for step in range(num_steps):
        weight_gradients, intercept_gradient = compute_weight_gradients(feature_data, target_values, weights, intercept)
        weights = [w - learning_rate * g for w, g in zip(weights, weight_gradients)]
        intercept = intercept - learning_rate * intercept_gradient
    return weights, intercept
```

Run it:

```python
gradient_descent_multivariate(feature_data, target_values, num_features=2, learning_rate=0.001, num_steps=2000)
```

## Type this — Cell 7 — now bring in NumPy

You just built the dot product and the weighted-sum-plus-gradient machinery by
hand. NumPy's `@` operator does the dot product in one symbol — now that you
know what it's replacing, use it:

```python
import numpy as np
weights_array = np.array([3, 2])
features_array = np.array([10, 5])
weights_array @ features_array
```

Confirm it matches your `dot_product([3, 2], [10, 5])` result from Cell 2.

## Checkpoint exercise

1. Rewrite `predict_multivariate` using `weights_array @ features_array`
   instead of your hand-written `dot_product`, and confirm the predictions
   match your original version on the same inputs.
2. Add a third feature to `feature_data` (make up plausible numbers) and rerun
   `gradient_descent_multivariate` with `num_features=3`. Nothing else about
   the code needs to change — that's the point of writing it generically.

Next lesson: classification instead of prediction — prices become yes/no
decisions, and squared error stops making sense, so we derive a replacement
loss function from scratch. Say "next lesson" when ready.
