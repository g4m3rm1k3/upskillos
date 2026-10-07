# What learning is

Everything so far has been preparation. This lesson is where machine learning begins, and it starts with the most important question of all: what does it mean for a program to **learn**?

In ordinary programming, a person works out the rules and writes them as code: if the email contains "winner" and "claim your prize", mark it as spam. That works until the spammers change their wording, and for many problems nobody can write the rules down at all. What rules tell a photo of a cat from a photo of a dog? Machine learning turns the process round. Instead of writing the rules, you collect **examples** with the right answers, and an algorithm finds rules that reproduce those answers. This lesson sets out the pieces every learning method shares (data, model, loss, and training) and the one idea that separates real learning from memorisation: **generalising** to examples the program has never seen.

## Examples, features and labels

The most common kind of machine learning is **supervised learning**: learning from examples that come with the right answer. Each example has:

- **features**, the inputs you know: a house's area, bedrooms and age; an email's words; an image's pixels. Written `x`, or `X` for a whole table of examples, one row per example as in the NumPy lessons.
- a **label** or **target**, the answer you want to predict: the house's price, whether the email is spam, what the image shows. Written `y`.

The goal is a function that takes the features of a **new** example, one whose answer you do not know, and predicts its label.

Supervised problems come in two kinds:

- **Regression**: the label is a number, like a price or a temperature.
- **Classification**: the label is one of a set of categories, like spam or not spam, or which digit an image shows.

There are other kinds of machine learning too. In **unsupervised learning** there are no labels at all, and the aim is to find structure, such as groups of similar customers; later parts of this series cover it. In **reinforcement learning**, an agent learns from rewards for its actions, which is how game-playing programs learn; it comes late in the series. But the ideas in this lesson apply to all of them.

## A model is a function with adjustable numbers

A **model** is a function from features to a prediction, with some numbers inside it that are not fixed in advance. Those numbers are the model's **parameters**, and learning means choosing them. A straight line is the simplest example:

\[
\hat{y} = w x + b
\]

The prediction `ŷ` depends on the feature `x` and two parameters: the slope `w` (a **weight**) and the intercept `b` (a **bias**). Different values of `w` and `b` give different lines, and so different predictions. The set of all functions a model could represent, by choosing its parameters, is its **model family**: here, every straight line.

Here is some data, and three lines with different parameters. Which fits best?

```python type
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(0)
x = rng.uniform(0, 10, 30)
y = 3 * x + 5 + rng.normal(0, 3, 30)

fig, ax = plt.subplots()
ax.scatter(x, y, color="black", s=15)
grid = np.linspace(0, 10, 100)
for w, b in [(1, 15), (3, 5), (5, -3)]:
    ax.plot(grid, w * grid + b, label=f"w = {w}, b = {b}")
ax.legend()
ax.set_xlabel("x")
ax.set_ylabel("y")
plt.show()
```

By eye, the middle line fits best. Learning means making that judgement precise and automatic, for models far too complicated to judge by eye.

## A loss measures how wrong the model is

To pick the best parameters, you need a number that says how bad any particular choice is. That number is the **loss** (also called the cost or error). For regression, the usual choice is the **mean squared error** from the calculus lessons: the average of the squared differences between predictions and true labels.

\[
L(w, b) = \frac{1}{n} \sum_{i=1}^{n} (w x_i + b - y_i)^2
\]

Lower is better, and a perfect fit would score 0. The loss turns "which line fits best?" into "which `w` and `b` make `L` smallest?":

```python type
import numpy as np

rng = np.random.default_rng(0)
x = rng.uniform(0, 10, 30)
y = 3 * x + 5 + rng.normal(0, 3, 30)

def mse(w, b):
    return np.mean((w * x + b - y) ** 2)

for w, b in [(1, 15), (3, 5), (5, -3)]:
    print(f"w = {w}, b = {b}: loss {mse(w, b):.1f}")
```

```output
w = 1, b = 15: loss 50.1
w = 3, b = 5: loss 8.6
w = 5, b = -3: loss 51.8
```

The middle line has by far the lowest loss, matching what your eye said.

## Training is minimising the loss

**Training** a model means searching for the parameters that make the loss on the training examples as small as possible. You have already met two ways to do this: solving directly for the least squares answer (the linear systems lesson), and walking downhill with gradient descent (the gradients lesson). Here is gradient descent finding the best line for this data:

```python type
import numpy as np

rng = np.random.default_rng(0)
x = rng.uniform(0, 10, 30)
y = 3 * x + 5 + rng.normal(0, 3, 30)

w, b = 0.0, 0.0
for step in range(5001):
    error = w * x + b - y
    w -= 0.01 * 2 * np.mean(error * x)
    b -= 0.01 * 2 * np.mean(error)
    if step in (0, 10, 100, 1000, 5000):
        print(f"step {step:>4}: w = {w:.3f}, b = {b:.3f}, loss = {np.mean((w * x + b - y) ** 2):.2f}")
```

```output
step    0: w = 2.937, b = 0.437, loss = 40.74
step   10: w = 3.697, b = 0.814, loss = 14.53
step  100: w = 3.437, b = 2.678, loss = 10.54
step 1000: w = 2.997, b = 5.835, loss = 7.89
step 5000: w = 2.993, b = 5.866, loss = 7.89
```

The loss falls as the parameters move close to `w = 3` and `b = 5`, the values used to generate the data. (Not exactly to them: with only 30 noisy points, the line that fits **these** examples best is slightly different from the true one, here with an intercept nearer 5.9.) The algorithm was never told those values; it found them from the examples alone. That is learning, in its simplest form, and every method in this series follows the same recipe:

1. choose a **model family** with parameters,
2. choose a **loss** that measures how wrong a prediction is,
3. **train**: find the parameters that minimise the loss on the training data.

Methods differ in which model family they use (lines, trees, neural networks) and how they search for the best parameters, but the recipe is always the same.

## Always compare with a baseline

Is a loss of 9 good? On its own, a loss means nothing: it depends on the units and how spread out the labels are. So always compare a model with a **baseline**: the simplest possible predictor, which ignores the features entirely. For regression, the obvious baseline predicts the **mean** of the training labels for every example.

```python type
import numpy as np

rng = np.random.default_rng(0)
x = rng.uniform(0, 10, 30)
y = 3 * x + 5 + rng.normal(0, 3, 30)

baseline_loss = np.mean((y.mean() - y) ** 2)
model_loss = np.mean((3.0 * x + 5.0 - y) ** 2)
print(f"baseline (always predict the mean): {baseline_loss:.1f}")
print(f"the line:                           {model_loss:.1f}")
```

```output
baseline (always predict the mean): 97.8
the line:                           8.6
```

The line's loss is a small fraction of the baseline's, so it has learned something real. A model that cannot beat the baseline has learned nothing useful, however sophisticated it is, and it happens more often than you would think. For classification, the equivalent baseline always predicts the most common class.

## Memorising is not learning

Here is a model that gets every training example exactly right: it simply remembers them. Given an `x` it has seen before, it returns the `y` it saw with it; given one it has not seen, it can only guess, so it returns the average label.

```python type
import numpy as np

class Memoriser:
    def fit(self, x, y):
        self.table = dict(zip(np.round(x, 3), y))
        self.fallback = y.mean()

    def predict(self, x):
        return np.array([self.table.get(value, self.fallback) for value in np.round(x, 3)])

rng = np.random.default_rng(1)
x_train = rng.uniform(0, 10, 30)
y_train = 3 * x_train + 5 + rng.normal(0, 3, 30)
x_new = rng.uniform(0, 10, 30)
y_new = 3 * x_new + 5 + rng.normal(0, 3, 30)

model = Memoriser()
model.fit(x_train, y_train)
print("loss on the training examples:", np.mean((model.predict(x_train) - y_train) ** 2).round(2))
print("loss on new examples:         ", np.mean((model.predict(x_new) - y_new) ** 2).round(2))
```

```output
loss on the training examples: 0.0
loss on new examples:          85.84
```

Predict both numbers before running it. On its training examples, its loss is 0: perfect. On new examples, from exactly the same source, it is no better than the baseline, because it learned nothing about the **relationship** between `x` and `y`. It only stored the answers.

This is the central idea of machine learning. The point is never to do well on the examples you trained on: you already know their answers. The point is to do well on **new** examples. The ability to do that is called **generalisation**, and it is what separates learning from memorising.

## The test set

So how do you measure how well a model generalises? You cannot use the training examples, since a model can score perfectly on those by memorising. The answer is to set aside some of your examples before training, never let the model see them, and measure the loss on them at the end. Those held-out examples are the **test set**; the rest are the **training set**. This is the split you wrote in the indexing lesson.

The test set only works if it is kept truly separate. Once you start adjusting your model because of its test score, trying one version and then another until the test score looks good, the test set is no longer new data: you have been fitting it by hand. A later lesson on validation shows how to make choices properly, with a separate **validation set**. For now the rule is: use the test set once, at the end.

## Too simple, or too flexible

A straight line is a fairly rigid model. A much more flexible family is **polynomials**: curves like `ŷ = w₀ + w₁x + w₂x² + ... + w_d x^d`, where the **degree** `d` is the highest power. A degree-1 polynomial is a straight line; a high-degree polynomial can wiggle through almost any set of points. `np.polyfit(x, y, degree)` finds the least squares polynomial of a given degree.

Here is data that follows a gentle curve, split into training and test sets, fitted with polynomials of increasing degree. Predict which degree will do best on the test set.

```python type
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(2)
x = rng.uniform(0, 1, 40)
y = np.sin(2 * np.pi * x) + rng.normal(0, 0.25, 40)
x_train, y_train, x_test, y_test = x[:20], y[:20], x[20:], y[20:]

grid = np.linspace(0, 1, 200)
fig, axes = plt.subplots(1, 3, figsize=(12, 3.5), sharey=True)
for ax, degree in zip(axes, [1, 3, 12]):
    coefficients = np.polyfit(x_train, y_train, degree)
    train_loss = np.mean((np.polyval(coefficients, x_train) - y_train) ** 2)
    test_loss = np.mean((np.polyval(coefficients, x_test) - y_test) ** 2)
    ax.scatter(x_train, y_train, s=15, color="black", label="training")
    ax.scatter(x_test, y_test, s=15, color="tab:orange", label="test")
    ax.plot(grid, np.polyval(coefficients, grid))
    ax.set_ylim(-2, 2)
    ax.set_title(f"degree {degree}: train {train_loss:.3f}, test {test_loss:.3f}", fontsize=9)
axes[0].legend(fontsize=8)
plt.show()
```

`np.polyval(coefficients, x)` evaluates the fitted polynomial. `sharey=True` gives the three plots the same y-axis, so they can be compared.

- **Degree 1** is too rigid to follow the curve. Its loss is high on both sets: it **underfits**.
- **Degree 3** follows the true shape, and does well on both.
- **Degree 12** has the lowest **training** loss of all, because it bends to pass close to every training point, noise included. But between the training points it swings wildly, and its **test** loss is much worse. It **overfits**: like the memoriser, it has learned the noise in its particular training examples rather than the pattern.

Getting this balance right, flexible enough to capture the real pattern but not so flexible that it memorises noise, is the main practical challenge in machine learning, and several later lessons are devoted to it.

## The machine learning workflow

Every project in the rest of this series follows the same steps:

1. **Define the problem**: what are the features, what is the label, regression or classification?
2. **Explore the data**, as in the last lesson.
3. **Split** the data into training and test sets, before looking at model performance.
4. **Set a baseline.**
5. **Choose a model family and a loss, and train** on the training set.
6. **Evaluate** on the test set, compared with the baseline.
7. **Iterate**: improve features, try other models, tune them (with a validation set, never the test set).

The next lessons build the first real models, starting with the one you have already half-built: linear regression.

::: challenge Beat the baseline? [easy]
Write a function `baseline_mse(y_train, y_test)` that returns the mean squared error on the **test** labels of the baseline that always predicts the **mean of the training labels**. (Use the training mean, not the test mean: a model must never learn anything from the test set.)

Then write `improvement(model_mse, baseline)` that returns the fraction by which a model's MSE is below the baseline's: `1 − model_mse / baseline`. A result of 0 means no better than the baseline; 1 means perfect.

```python starter
import numpy as np

def baseline_mse(y_train, y_test):
    return 0.0

def improvement(model_mse, baseline):
    return 0.0

print(baseline_mse(np.array([1.0, 2.0, 3.0]), np.array([2.0, 4.0])))
```

```python solution
import numpy as np

def baseline_mse(y_train, y_test):
    prediction = y_train.mean()
    return float(np.mean((prediction - y_test) ** 2))

def improvement(model_mse, baseline):
    return 1 - model_mse / baseline

print(baseline_mse(np.array([1.0, 2.0, 3.0]), np.array([2.0, 4.0])))
```

```python test
import numpy as _np
assert "baseline_mse" in dir() and "improvement" in dir(), "Keep both function names."
assert _np.isclose(baseline_mse(_np.array([1.0, 2.0, 3.0]), _np.array([2.0, 4.0])), 2.0), "With training mean 2, predicting 2 for test labels 2 and 4 gives errors 0 and 2, so the MSE is 2.0."
_tr = _np.array([10.0, 20.0, 30.0, 40.0])
_te = _np.array([5.0, 25.0, 45.0])
assert _np.isclose(baseline_mse(_tr, _te), _np.mean((25.0 - _te) ** 2)), "Use the mean of the TRAINING labels as the prediction for every test label."
assert _np.isclose(improvement(2.5, 10.0), 0.75) and _np.isclose(improvement(10.0, 10.0), 0.0), "improvement should be 1 − model_mse / baseline."
"SUCCESS: Every model you build from now on gets compared with this."
```

Hint: The baseline predicts one number, `y_train.mean()`, for every test example. Its MSE is the mean of the squared differences between that number and each test label.
:::

::: challenge Memorise, then generalise [medium]
Write a class `NearestNeighbour1D` with two methods, following the same pattern as the `Memoriser`:

- `fit(x, y)` stores the training features and labels (as NumPy arrays);
- `predict(x_new)` returns, for each value in `x_new`, the training label of the **closest** training `x`.

Then, with the starter's data, compute its MSE on the training set and on the test set, storing them in `train_mse` and `test_mse`. Like the memoriser, it is perfect on the training set; unlike it, it makes a sensible guess for new values. Is its test loss better than the baseline's, `baseline`?

```python starter
import numpy as np

class NearestNeighbour1D:
    def fit(self, x, y):
        pass

    def predict(self, x_new):
        return np.zeros(len(x_new))

rng = np.random.default_rng(3)
x = rng.uniform(0, 10, 60)
y = 3 * x + 5 + rng.normal(0, 3, 60)
x_train, y_train, x_test, y_test = x[:40], y[:40], x[40:], y[40:]
baseline = np.mean((y_train.mean() - y_test) ** 2)

train_mse = 0.0
test_mse = 0.0
print(train_mse, test_mse, baseline)
```

```python solution
import numpy as np

class NearestNeighbour1D:
    def fit(self, x, y):
        self.x = np.asarray(x)
        self.y = np.asarray(y)

    def predict(self, x_new):
        distances = np.abs(np.asarray(x_new).reshape(-1, 1) - self.x)
        return self.y[distances.argmin(axis=1)]

rng = np.random.default_rng(3)
x = rng.uniform(0, 10, 60)
y = 3 * x + 5 + rng.normal(0, 3, 60)
x_train, y_train, x_test, y_test = x[:40], y[:40], x[40:], y[40:]
baseline = np.mean((y_train.mean() - y_test) ** 2)

model = NearestNeighbour1D()
model.fit(x_train, y_train)
train_mse = np.mean((model.predict(x_train) - y_train) ** 2)
test_mse = np.mean((model.predict(x_test) - y_test) ** 2)
print(train_mse, test_mse, baseline)
```

```python test
import numpy as _np
assert "NearestNeighbour1D" in dir(), "Keep the class name NearestNeighbour1D."
_m = NearestNeighbour1D()
_m.fit(_np.array([1.0, 5.0, 9.0]), _np.array([10.0, 50.0, 90.0]))
_p = _np.asarray(_m.predict(_np.array([0.0, 2.9, 3.1, 8.0, 5.0])))
assert _np.allclose(_p, [10, 10, 50, 90, 50]), f"For x_new [0, 2.9, 3.1, 8, 5] the nearest training x are 1, 1, 5, 9, 5, so the predictions should be [10, 10, 50, 90, 50], but got {_p.tolist()}."
_rng = _np.random.default_rng(3)
_x = _rng.uniform(0, 10, 60)
_y = 3 * _x + 5 + _rng.normal(0, 3, 60)
_ref = NearestNeighbour1D()
_ref.fit(_x[:40], _y[:40])
assert _np.isclose(train_mse, 0), f"On its own training data the nearest neighbour is the point itself, so train_mse should be 0, but it is {train_mse}."
assert _np.isclose(test_mse, _np.mean((_ref.predict(_x[40:]) - _y[40:]) ** 2)), "test_mse should be the model's MSE on x_test and y_test."
assert test_mse < baseline, "The nearest-neighbour model should beat the baseline on the test set."
"SUCCESS: Perfect on the training set like the memoriser, but it generalises, because it uses closeness. (It still loses to the straight line, which gets about 12.7 on this test set against its 16.3: a perfect training score is never the goal.)"
```

Hint: In `predict`, find each new value's distance to every training `x`. `x_new.reshape(-1, 1) - self.x` broadcasts into a table with one row per new value and one column per training value (the indexing lesson's `(n, 1)` against `(n,)` trick); `argmin(axis=1)` then gives the closest training position for each row. A loop over the new values also works.
:::

::: challenge Choose the degree [medium]
Choosing the degree is a decision about the model, so by the lesson's rule it must **not** be made with the test set. Instead, set aside a separate **validation set** for making choices (the validation lesson later covers this properly). Here the starter splits the data into 15 training points and 45 validation points.

Write a function `polynomial_losses(x_train, y_train, x_val, y_val, degrees)` that fits a polynomial of each degree in `degrees` to the training data with `np.polyfit`, and returns two lists: the training MSE and the validation MSE for each degree, in order.

Then set `best_degree` to the degree from 1 to 10 with the **lowest validation MSE**. Print the two lists too, and look at how each changes as the degree rises.

```python starter
import numpy as np

def polynomial_losses(x_train, y_train, x_val, y_val, degrees):
    return [], []

rng = np.random.default_rng(4)
x = rng.uniform(0, 1, 60)
y = np.sin(2 * np.pi * x) + rng.normal(0, 0.2, 60)
x_train, y_train, x_val, y_val = x[:15], y[:15], x[15:], y[15:]

best_degree = 1
print(best_degree)
```

```python solution
import numpy as np

def polynomial_losses(x_train, y_train, x_val, y_val, degrees):
    train_losses, val_losses = [], []
    for degree in degrees:
        coefficients = np.polyfit(x_train, y_train, degree)
        train_losses.append(float(np.mean((np.polyval(coefficients, x_train) - y_train) ** 2)))
        val_losses.append(float(np.mean((np.polyval(coefficients, x_val) - y_val) ** 2)))
    return train_losses, val_losses

rng = np.random.default_rng(4)
x = rng.uniform(0, 1, 60)
y = np.sin(2 * np.pi * x) + rng.normal(0, 0.2, 60)
x_train, y_train, x_val, y_val = x[:15], y[:15], x[15:], y[15:]

degrees = list(range(1, 11))
train_losses, val_losses = polynomial_losses(x_train, y_train, x_val, y_val, degrees)
best_degree = degrees[int(np.argmin(val_losses))]
print(np.round(train_losses, 3))
print(np.round(val_losses, 3))
print(best_degree)
```

```python test
import numpy as _np
assert "polynomial_losses" in dir(), "Keep the function's name as polynomial_losses."
_rng = _np.random.default_rng(4)
_x = _rng.uniform(0, 1, 60)
_y = _np.sin(2 * _np.pi * _x) + _rng.normal(0, 0.2, 60)
_tr, _va = polynomial_losses(_x[:15], _y[:15], _x[15:], _y[15:], [1, 3, 5])
assert len(_tr) == 3 and len(_va) == 3, "Return one training loss and one validation loss per degree."
for _d, _a, _b in zip([1, 3, 5], _tr, _va):
    _c = _np.polyfit(_x[:15], _y[:15], _d)
    assert _np.isclose(_a, _np.mean((_np.polyval(_c, _x[:15]) - _y[:15]) ** 2)), f"The training MSE for degree {_d} is wrong."
    assert _np.isclose(_b, _np.mean((_np.polyval(_c, _x[15:]) - _y[15:]) ** 2)), f"The validation MSE for degree {_d} is wrong."
assert _tr[0] >= _tr[1] >= _tr[2], "Training loss should never increase as the degree rises."
_all_tr, _all_va = polynomial_losses(_x[:15], _y[:15], _x[15:], _y[15:], list(range(1, 11)))
assert best_degree == list(range(1, 11))[int(_np.argmin(_all_va))], f"best_degree should be the degree from 1 to 10 with the lowest VALIDATION loss, {list(range(1, 11))[int(_np.argmin(_all_va))]}, but it is {best_degree}."
"SUCCESS: Training loss keeps falling as the degree rises; validation loss falls, bottoms out around degree 6, then shoots up. That turn is overfitting, and the validation set is how you see it."
```

Hint: Loop over the degrees; for each, fit with `np.polyfit`, evaluate with `np.polyval` on both sets, and append the two MSEs. Then find the position of the smallest validation loss with `np.argmin`.
:::

## What you learned

- Machine learning finds rules from examples instead of having a person write them. In supervised learning each example has features `x` and a label `y`; regression predicts numbers, classification predicts categories.
- A model is a function with parameters; its model family is every function it can represent.
- A loss, such as mean squared error, measures how wrong the predictions are. Training means finding the parameters that minimise the loss on the training data, by solving directly or by gradient descent.
- The recipe for every method: model family, loss, training.
- Always compare with a baseline, such as predicting the training mean; a model that cannot beat it has learned nothing.
- The goal is generalisation, doing well on new examples. Memorising the training set scores perfectly on it and learns nothing.
- Hold out a test set, never train on it, and use it once at the end.
- Too rigid a model underfits; too flexible a model overfits, doing better on training data but worse on new data.

Next you will build linear regression properly: the least squares solution, where its formula comes from, and what the fitted weights tell you.
