# Lesson 4 — Yes or No: Logistic Regression

## Concept, in plain English

Regression predicts a number (a price, a temperature). Classification predicts
a category — most simply, yes/no. You could try to reuse Lesson 3's machinery
directly (predict a number, call anything above 0.5 "yes"), but the dot
product's output ranges over all real numbers, including things like `-40` or
`300`, which don't mean anything as a "probability of yes." We need to squash
that unbounded number into the `0` to `1` range — that squashing function is
the sigmoid, and it's the one genuinely new piece of math this lesson.

## The math

Sigmoid function:

```
sigmoid(z) = 1 / (1 + e^(-z))
```

where `z` is Lesson 3's dot product (`weights · features + intercept`) — same
computation as before, just fed through this new function before being called
a "prediction."

Why this particular shape: as `z → +infinity`, `e^(-z) → 0`, so `sigmoid → 1`.
As `z → -infinity`, `e^(-z) → infinity`, so `sigmoid → 0`. At `z = 0`,
`sigmoid = 1/(1+1) = 0.5`. It smoothly maps "very confident no" to "very
confident yes" through "unsure," which is exactly what a probability should
do.

**Why not reuse mean squared error?** Squared error penalizes a prediction of
`0.9` when the answer is `1` only a little (`(1-0.9)²=0.01`), but for
classification, being *confidently wrong* should be penalized much more
severely than being *unconfident*. The loss function that does this is called
log-loss (or cross-entropy):

```
log_loss = -(actual_y * log(predicted_y) + (1 - actual_y) * log(1 - predicted_y))
```

Worked example: `actual_y = 1` (true answer is "yes"), `predicted_y = 0.9`
(model is fairly confident yes):

```
log_loss = -(1 * log(0.9) + 0 * log(0.1)) = -log(0.9) ≈ 0.105
```

Now the same true answer, but a bad model, `predicted_y = 0.1`:

```
log_loss = -(1 * log(0.1) + 0 * log(0.9)) = -log(0.1) ≈ 2.303
```

Being confidently wrong (`0.1` when the truth is `1`) costs over 20x more than
being confidently right. That's the whole design intent of log-loss, visible
directly in the numbers.

## Type this — Cell 1 (new notebook)

```python
import math

def sigmoid(z):
    return 1 / (1 + math.exp(-z))
```

Check it against the hand-reasoning above:

```python
sigmoid(0)
```

You should get exactly `0.5`.

## Type this — Cell 2

Prediction, reusing Lesson 3's `dot_product`, now passed through `sigmoid`:

```python
def predict_probability(features, weights, intercept):
    z = dot_product(weights, features) + intercept
    return sigmoid(z)
```

(If this is a fresh notebook, retype `dot_product` from Lesson 3 Cell 2 first
— same function, no changes.)

## Type this — Cell 3

Log-loss for one point:

```python
def log_loss(actual_y, predicted_y):
    return -(actual_y * math.log(predicted_y) + (1 - actual_y) * math.log(1 - predicted_y))
```

Check both hand-worked examples:

```python
log_loss(actual_y=1, predicted_y=0.9)
```

```python
log_loss(actual_y=1, predicted_y=0.1)
```

You should see roughly `0.105` and `2.303`, matching your paper work.

## What just happened

You now have a working "confidence penalty" function. Notice it blows up
(`math.log(0)` is undefined) if `predicted_y` is *exactly* `0` or `1` — a real
implementation clips those values slightly away from the extremes; we're
skipping that detail here since your data won't hit it exactly.

## Type this — Cell 4

Data — two features, binary labels (`1` = yes, `0` = no):

```python
classification_features = [[1, 1], [2, 1], [1, 3], [3, 3], [4, 2], [5, 4]]
classification_labels = [0, 0, 0, 1, 1, 1]
```

Average log-loss across the dataset, same loop pattern as every previous
lesson:

```python
def mean_log_loss(feature_data, labels, weights, intercept):
    total = 0
    for features, actual_y in zip(feature_data, labels):
        predicted_y = predict_probability(features, weights, intercept)
        total = total + log_loss(actual_y, predicted_y)
    return total / len(feature_data)
```

## Type this — Cell 5

The gradient. Here's a genuinely nice surprise: when you work through the
calculus (sigmoid's derivative and log-loss's derivative combine and mostly
cancel), the gradient formula for logistic regression comes out *identical in
form* to Lesson 3's linear regression gradient — only `predicted_y` now means
"sigmoid output" instead of "raw dot product":

```python
def compute_logistic_gradients(feature_data, labels, weights, intercept):
    num_weights = len(weights)
    weight_gradients = [0] * num_weights
    intercept_gradient = 0
    for features, actual_y in zip(feature_data, labels):
        predicted_y = predict_probability(features, weights, intercept)
        error_term = predicted_y - actual_y
        for i in range(num_weights):
            weight_gradients[i] = weight_gradients[i] + (error_term * features[i])
        intercept_gradient = intercept_gradient + error_term
    weight_gradients = [g / len(feature_data) for g in weight_gradients]
    intercept_gradient = intercept_gradient / len(feature_data)
    return weight_gradients, intercept_gradient
```

## Type this — Cell 6

Gradient descent, same loop shape as Lesson 3, different gradient function:

```python
def gradient_descent_logistic(feature_data, labels, num_features, learning_rate, num_steps):
    weights = [0] * num_features
    intercept = 0
    for step in range(num_steps):
        weight_gradients, intercept_gradient = compute_logistic_gradients(feature_data, labels, weights, intercept)
        weights = [w - learning_rate * g for w, g in zip(weights, weight_gradients)]
        intercept = intercept - learning_rate * intercept_gradient
    return weights, intercept
```

Run it:

```python
gradient_descent_logistic(classification_features, classification_labels, num_features=2, learning_rate=0.1, num_steps=5000)
```

## What just happened

You trained a classifier with the *exact same gradient descent loop shape* as
Lessons 2 and 3 — only the prediction function (add a sigmoid) and the loss
function (log-loss instead of squared error) changed. This pattern —
prediction function + loss function + generic gradient descent loop — is the
entire recipe for every model in this course, including the neural networks in
Phase B.

## Checkpoint exercise

1. Use the weights and intercept you just trained to call
   `predict_probability` on a new point, e.g. `[3, 2]`. Convert it to a
   yes/no answer yourself by checking if it's above or below `0.5`.
2. Plot `sigmoid(z)` for `z` values from `-10` to `10` (a simple
   `matplotlib` line plot) so you can *see* the S-curve shape the math above
   describes.
3. On paper, verify that `compute_logistic_gradients`'s `error_term =
   predicted_y - actual_y` really does simplify from the full log-loss +
   sigmoid derivative — you don't need to complete the full derivation
   rigorously, just confirm the sign makes sense: if the model predicts too
   high a probability, `error_term` is positive, so the weight update should
   push weights down.

That closes the "one dot product, one loss function" pattern. Lesson 5 uses a
different mechanism entirely — decision trees, which don't use gradient
descent at all. Say "next lesson" when ready.
