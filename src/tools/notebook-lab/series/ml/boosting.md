# Boosting

A random forest grows hundreds of deep trees **independently** and averages them. Each tree is a strong but erratic model, and averaging calms the erratic part, the variance. **Boosting** takes the opposite approach. It builds a sequence of **weak** models, each barely better than guessing, such as a tree with a single question. But it builds them **one after another**, and each new model concentrates on what the models before it got wrong. A long chain of these small corrections adds up to a very accurate model. Where bagging reduces variance, boosting attacks **bias**.

Gradient-boosted trees, in libraries such as XGBoost, LightGBM and scikit-learn's `HistGradientBoostingClassifier`, are usually the strongest off-the-shelf method for tabular data: spreadsheets, databases, logs. They feature in a large share of winning entries in machine learning competitions on such data. This lesson builds the two classic forms from scratch: **AdaBoost**, which re-weights the examples, and **gradient boosting**, which fits each new tree to the remaining errors, and which turns out to be gradient descent in disguise.

## Weak learners

A **weak learner** is a model only a little better than chance. The standard one is a **decision stump**: a tree with depth 1, one question and two leaves. On its own a stump is nearly useless for any interesting problem. The question boosting asks is: can many stumps, combined cleverly, become a strong model? The surprising answer, proved in the 1990s, is yes.

## AdaBoost

**AdaBoost** ("adaptive boosting") keeps a **weight** for every training example, starting equal. Each round:

1. Train a stump on the **weighted** data: it tries hardest to get the heavily weighted examples right.
2. Measure its **weighted error** ε: the total weight of the examples it gets wrong.
3. Give the stump a say in the final vote, α = ½ ln((1 − ε)/ε). A stump with error near 0 gets a large say; one at 0.5, no better than a coin, gets none.
4. **Increase the weights of the examples it got wrong** and decrease the others, then rescale the weights to add up to 1. The next stump will focus on the current mistakes.

The final prediction is a weighted vote of all the stumps. AdaBoost uses labels −1 and +1, which makes the formulas tidy: if the stump predicts h(x) = ±1 and the label is y = ±1, then y·h(x) is +1 when it is right and −1 when it is wrong, so a single update handles both cases:

\[
w_i \leftarrow w_i \, e^{-\alpha \, y_i h(x_i)}
\]

Right answers are multiplied by e^(−α), shrinking them; wrong answers by e^(α), growing them. scikit-learn's trees accept example weights through `fit(X, y, sample_weight=w)`. Before running the next cell, predict: as rounds are added, will the test accuracy keep rising?

```python type
import numpy as np
from sklearn.datasets import make_moons
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier

X, y01 = make_moons(300, noise=0.4, random_state=2)
X_train, X_test, y_train01, y_test01 = train_test_split(X, y01, test_size=0.5, random_state=0)
y_train, y_test = 2 * y_train01 - 1, 2 * y_test01 - 1

w = np.full(len(y_train), 1 / len(y_train))
score_train = np.zeros(len(y_train))
score_test = np.zeros(len(y_test))
for m in range(1, 201):
    stump = DecisionTreeClassifier(max_depth=1).fit(X_train, y_train, sample_weight=w)
    h = stump.predict(X_train)
    error = w[h != y_train].sum()
    alpha = 0.5 * np.log((1 - error) / error)
    w = w * np.exp(-alpha * y_train * h)
    w = w / w.sum()
    score_train += alpha * h
    score_test += alpha * stump.predict(X_test)
    if m in (1, 2, 3, 5, 20, 200):
        train_acc = (np.sign(score_train) == y_train).mean()
        test_acc = (np.sign(score_test) == y_test).mean()
        print(f"round {m:>3}: stump error {error:.3f}, say {alpha:.3f}  |  train {train_acc:.3f}, test {test_acc:.3f}")
```

```output
round   1: stump error 0.200, say 0.693  |  train 0.800, test 0.753
round   2: stump error 0.258, say 0.527  |  train 0.800, test 0.753
round   3: stump error 0.261, say 0.521  |  train 0.880, test 0.833
round   5: stump error 0.408, say 0.185  |  train 0.873, test 0.827
round  20: stump error 0.458, say 0.084  |  train 0.873, test 0.827
round 200: stump error 0.491, say 0.018  |  train 0.933, test 0.800
```

`2 * y - 1` turns labels 0/1 into −1/+1, and `np.sign` turns the weighted vote back into −1 or +1. Read the columns:

- The first stump has error 0.20 and a large say (0.69). Alone, it scores 0.75 on the test set, like the single question in the decision trees lesson.
- Later stumps face harder and harder weighted problems, because the weights pile up on the examples that keep being misclassified. Their errors creep towards 0.5 and their say shrinks. By round 200, ε is 0.49 and α is tiny.
- The combination climbs quickly: by round 3 the test accuracy is 0.83, better than any stump alone. Three one-question trees, combined, have built a bent boundary.
- Then something new happens. Training accuracy keeps rising (0.93 by round 200), while test accuracy slowly **falls** (0.80). The later stumps are chasing the noisiest points, the ones that keep being wrong because they are on the wrong side of the true boundary.

That last point is the key practical difference from random forests: **boosting can overfit by running too long**. The number of rounds is a setting to be chosen on validation data.

## Gradient boosting: fit the leftovers

AdaBoost's weight update looks like a clever trick. **Gradient boosting** replaces it with an idea that is easier to understand and extends to any loss. Take regression with squared error:

1. Start with a constant prediction, `F₀(x)`: the mean of `y`.
2. Compute the **residuals**, `r = y − F(x)`: what the current model still gets wrong.
3. Fit a small regression tree to the residuals: a model of the mistakes.
4. Add a fraction of it to the model: `F(x) ← F(x) + ν · tree(x)`, where ν (nu), the **learning rate**, is a small number like 0.1.
5. Repeat from step 2.

Each tree corrects some of what is left over. Here it is on noisy sine data, with trees of depth 2:

```python type
import numpy as np
import matplotlib.pyplot as plt
from sklearn.tree import DecisionTreeRegressor

rng = np.random.default_rng(0)
x = np.sort(rng.uniform(0, 6, 100))
y = np.sin(x) + rng.normal(0, 0.25, 100)
x_test = np.sort(rng.uniform(0, 6, 200))
y_test = np.sin(x_test) + rng.normal(0, 0.25, 200)

F = np.full(len(x), y.mean())
F_test = np.full(len(x_test), y.mean())
snapshots = {}
for m in range(1, 501):
    residuals = y - F
    tree = DecisionTreeRegressor(max_depth=2).fit(x.reshape(-1, 1), residuals)
    F += 0.1 * tree.predict(x.reshape(-1, 1))
    F_test += 0.1 * tree.predict(x_test.reshape(-1, 1))
    if m in (1, 5, 20, 50, 100, 500):
        print(f"{m:>3} trees: train MSE {np.mean((y - F) ** 2):.4f}, test MSE {np.mean((y_test - F_test) ** 2):.4f}")
    if m in (5, 50, 500):
        snapshots[m] = F_test.copy()

fig, ax = plt.subplots(figsize=(6, 3.5))
ax.scatter(x, y, s=8, color="grey", label="training data")
for m, prediction in snapshots.items():
    ax.plot(x_test, prediction, label=f"{m} trees")
ax.legend(fontsize=8)
plt.show()
```

```output
  1 trees: train MSE 0.4714, test MSE 0.5051
  5 trees: train MSE 0.2520, test MSE 0.2802
 20 trees: train MSE 0.0625, test MSE 0.0895
 50 trees: train MSE 0.0327, test MSE 0.0718
100 trees: train MSE 0.0218, test MSE 0.0755
500 trees: train MSE 0.0018, test MSE 0.0956
```

After 5 trees the model is a rough staircase that has barely left the mean; by 50 it follows the sine well; by 500 it has started bending around individual noisy points. The printout shows the same story. Training error falls steadily towards zero (0.0018 by 500 trees). Test error falls to about 0.072 at 50 trees, close to the noise level itself (the noise has standard deviation 0.25, so variance 0.0625, which no model can beat), then rises again to 0.096. Too many rounds overfit.

## Why "gradient"?

For the squared error loss ½(y − F)², the derivative with respect to the prediction F is −(y − F). So the residual, y − F, is exactly the **negative gradient** of the loss with respect to the predictions. Each round of gradient boosting computes the negative gradient at every training example and takes a small step in that direction, just as gradient descent did in the gradient descent lesson. The difference is what gets updated: not a weight vector, but the **predictions themselves**, with a tree used to turn "how each training prediction should move" into a rule that also works for new points.

That view tells you how to boost with **any** differentiable loss: replace the residuals by the negative gradient of that loss. For classification with log loss, the model's output F is a score, the probability is σ(F), and the negative gradient of the log loss with respect to the score is y − σ(F): the label minus the predicted probability, the same "error" that appeared in the logistic regression lesson. Boosting for classification fits each new tree to those. (AdaBoost turns out to be gradient boosting with a different loss, the exponential loss e^(−yF), which is where its exponential weights come from.)

## Learning rate and number of trees

The learning rate and the number of trees trade off against each other. A smaller learning rate means each tree corrects less, so more trees are needed, but the result often generalises better, because no single tree can push the model far towards the noise. The common recipe: pick a small learning rate (0.05 to 0.1), and choose the number of trees by watching validation error, stopping when it stops improving. This is called **early stopping**. The trees are kept small, typically depth 3 to 6, since each only needs to capture a piece of what is left.

## Boosting in scikit-learn

scikit-learn has `GradientBoostingClassifier` and `GradientBoostingRegressor`, which work as above. It also has `HistGradientBoostingClassifier` and `HistGradientBoostingRegressor`, which first sort each feature's values into at most 256 bins so that finding splits is very fast. This is the same idea as LightGBM and XGBoost, and it is the version to use on real data. It also handles missing values directly.

```python type
from sklearn.datasets import load_breast_cancer
from sklearn.ensemble import GradientBoostingClassifier, HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.model_selection import cross_val_score

X, y = load_breast_cancer(return_X_y=True)
for name, model in [("random forest", RandomForestClassifier(random_state=0)),
                    ("gradient boosting", GradientBoostingClassifier(random_state=0)),
                    ("histogram gradient boosting", HistGradientBoostingClassifier(random_state=0))]:
    scores = cross_val_score(model, X, y, cv=5)
    print(f"{name:<28} mean accuracy {scores.mean():.3f}")
```

```output
random forest                mean accuracy 0.963
gradient boosting            mean accuracy 0.963
histogram gradient boosting  mean accuracy 0.967
```

On this small, clean dataset all three score about 96–97%: when data is this easy, the choice of strong model hardly matters. The advantages of boosting show up on larger, messier problems, where well-tuned boosted trees usually come out ahead. They also need more care, since the learning rate, the number of trees and the tree size all interact, which is why the hyperparameter search lesson later in this series matters.

::: challenge One round of AdaBoost [easy]
Write the two formulas at the heart of AdaBoost:

- `stump_say(error)` returns α = ½ ln((1 − error)/error).
- `reweight(w, y, h, alpha)` takes the current weights `w`, labels `y` and predictions `h` (both arrays of −1 and +1), and returns the new weights `w · e^(−α y h)`, rescaled to add up to 1.

```python starter
import numpy as np

def stump_say(error):
    return 0.0

def reweight(w, y, h, alpha):
    return w

w = np.full(4, 0.25)
y = np.array([1, 1, -1, -1])
h = np.array([1, -1, -1, -1])
alpha = stump_say(0.25)
print(alpha, reweight(w, y, h, alpha))
```

```python solution
import numpy as np

def stump_say(error):
    return 0.5 * np.log((1 - error) / error)

def reweight(w, y, h, alpha):
    new = w * np.exp(-alpha * y * h)
    return new / new.sum()

w = np.full(4, 0.25)
y = np.array([1, 1, -1, -1])
h = np.array([1, -1, -1, -1])
alpha = stump_say(0.25)
print(alpha, reweight(w, y, h, alpha))
```

```python test
import numpy as _np
assert "stump_say" in dir() and "reweight" in dir(), "Keep both function names."
assert _np.isclose(stump_say(0.25), 0.5 * _np.log(3)), "stump_say(0.25) should be ½ ln(0.75 / 0.25) = ½ ln 3 ≈ 0.549."
assert _np.isclose(stump_say(0.5), 0.0), "A stump with error 0.5 is no better than a coin, so its say should be 0."
assert stump_say(0.1) > stump_say(0.3), "A more accurate stump should get a larger say."
_w = _np.full(4, 0.25)
_y = _np.array([1, 1, -1, -1])
_h = _np.array([1, -1, -1, -1])
_new = reweight(_w, _y, _h, stump_say(0.25))
assert _np.isclose(_np.sum(_new), 1.0), "The new weights should add up to 1."
assert _np.isclose(_new[1], 0.5), f"After this update the one misclassified example should carry exactly half the weight (0.5), but it has {_new[1]:.4f}. Multiply wrong answers by e^α and right ones by e^(−α)."
assert _np.allclose(_new[[0, 2, 3]], 1 / 6), "The three correct examples should share the other half equally."
_w2 = _np.array([0.1, 0.2, 0.3, 0.4])
_n2 = reweight(_w2, _y, _np.array([-1, 1, -1, 1]), 0.4)
_ref = _w2 * _np.exp(-0.4 * _y * _np.array([-1, 1, -1, 1])); _ref = _ref / _ref.sum()
assert _np.allclose(_n2, _ref), "reweight is wrong for unequal starting weights."
"SUCCESS: After each round, the examples the stump got wrong hold exactly half the total weight, so the next stump cannot ignore them."
```

Hint: `y * h` is +1 for a right answer and −1 for a wrong one, so `np.exp(-alpha * y * h)` shrinks the right and grows the wrong in one expression. Divide by the sum to rescale.
:::

::: challenge When to stop [medium]
A fitted scikit-learn boosting model can report its predictions after each round with `staged_predict(X)`, which yields one array of predictions per round: the first after 1 tree, the second after 2, and so on. This makes early stopping cheap: fit once with many trees, then find the round where validation error was lowest.

Write `best_number_of_trees(model, X_val, y_val)` that returns a tuple `(n_trees, mse)`: the number of trees with the lowest validation mean squared error, and that error. (If several tie, return the smallest number of trees.)

Then fit `GradientBoostingRegressor(n_estimators=500, learning_rate=0.1, max_depth=2, random_state=0)` on the starter's training data, and store the result of your function on the validation data in `best`.

```python starter
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor

def best_number_of_trees(model, X_val, y_val):
    return model.n_estimators, 0.0

rng = np.random.default_rng(0)
x = rng.uniform(0, 6, 300)
y = np.sin(x) + rng.normal(0, 0.25, 300)
X_train, y_train = x[:150].reshape(-1, 1), y[:150]
X_val, y_val = x[150:].reshape(-1, 1), y[150:]

best = None
print(best)
```

```python solution
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor

def best_number_of_trees(model, X_val, y_val):
    errors = [np.mean((y_val - prediction) ** 2) for prediction in model.staged_predict(X_val)]
    index = int(np.argmin(errors))
    return index + 1, float(errors[index])

rng = np.random.default_rng(0)
x = rng.uniform(0, 6, 300)
y = np.sin(x) + rng.normal(0, 0.25, 300)
X_train, y_train = x[:150].reshape(-1, 1), y[:150]
X_val, y_val = x[150:].reshape(-1, 1), y[150:]

model = GradientBoostingRegressor(n_estimators=500, learning_rate=0.1, max_depth=2, random_state=0).fit(X_train, y_train)
best = best_number_of_trees(model, X_val, y_val)
print(best)
```

```python test
import numpy as _np
from sklearn.ensemble import GradientBoostingRegressor as _GBR
assert "best_number_of_trees" in dir(), "Keep the function's name as best_number_of_trees."
_r = _np.random.default_rng(0)
_x = _r.uniform(0, 6, 300)
_y = _np.sin(_x) + _r.normal(0, 0.25, 300)
_m = _GBR(n_estimators=500, learning_rate=0.1, max_depth=2, random_state=0).fit(_x[:150].reshape(-1, 1), _y[:150])
_errs = [_np.mean((_y[150:] - p) ** 2) for p in _m.staged_predict(_x[150:].reshape(-1, 1))]
_k = int(_np.argmin(_errs))
_got = best_number_of_trees(_m, _x[150:].reshape(-1, 1), _y[150:])
assert _got[0] != _k, f"You returned {_got[0]}, which is the position in the list, counting from 0. The first staged prediction uses 1 tree, so add 1."
assert _got[0] == _k + 1 and _np.isclose(_got[1], _errs[_k]), f"The best is {_k + 1} trees with validation MSE {_errs[_k]:.4f}, but you returned {_got}."
class _Fake:
    def staged_predict(self, X):
        for v in [3.0, 1.0, 1.0, 2.0]:
            yield _np.full(len(X), v)
assert tuple(best_number_of_trees(_Fake(), _np.zeros((2, 1)), _np.array([1.0, 1.0]))) == (2, 0.0), "When several rounds tie, return the smallest number of trees."
assert best is not None and best[0] == _k + 1, f"best should be ({_k + 1}, {_errs[_k]:.4f})."
f"SUCCESS: {_k + 1} of the 500 trees were worth keeping; the rest made validation error worse ({_errs[-1]:.4f} after all 500, against {_errs[_k]:.4f} at the best point)."
```

Hint: Loop over `model.staged_predict(X_val)` (a list comprehension works), computing the MSE of each. `np.argmin` gives the position of the first smallest; position 0 means 1 tree.
:::

::: challenge Boosting for classification [medium]
Write gradient boosting for 0/1 classification with log loss, from scratch. The model keeps a score `F` for every example; the probability is σ(F) = 1/(1 + e^(−F)).

- Start every score at the **log-odds of the training base rate**: F₀ = ln(p̄ / (1 − p̄)), where p̄ is the fraction of 1s in `y`. (This is the best constant score, just as the mean is the best constant for squared error.)
- Each round, compute the negative gradient, `y − σ(F)`, fit `DecisionTreeRegressor(max_depth=depth, random_state=0)` to it, and add `lr` times the tree's prediction to `F`.

Write `boost_classifier(X, y, n_rounds, lr, depth)`, returning `(F0, trees)`, and `predict_proba(F0, trees, lr, X)`, returning σ of the final score for each row of `X`. Then train on the starter's moons split with 100 rounds, learning rate 0.1 and depth 2, and store the test accuracy (predict 1 when the probability is above 0.5) in `test_accuracy`.

```python starter
import numpy as np
from sklearn.datasets import make_moons
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeRegressor

def boost_classifier(X, y, n_rounds, lr, depth):
    return 0.0, []

def predict_proba(F0, trees, lr, X):
    return np.full(len(X), 0.5)

X, y = make_moons(300, noise=0.4, random_state=2)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.5, random_state=0)
test_accuracy = 0.0
print(test_accuracy)
```

```python solution
import numpy as np
from sklearn.datasets import make_moons
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeRegressor

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

def boost_classifier(X, y, n_rounds, lr, depth):
    rate = y.mean()
    F0 = np.log(rate / (1 - rate))
    F = np.full(len(y), F0)
    trees = []
    for _ in range(n_rounds):
        tree = DecisionTreeRegressor(max_depth=depth, random_state=0).fit(X, y - sigmoid(F))
        F += lr * tree.predict(X)
        trees.append(tree)
    return F0, trees

def predict_proba(F0, trees, lr, X):
    F = np.full(len(X), F0)
    for tree in trees:
        F += lr * tree.predict(X)
    return sigmoid(F)

X, y = make_moons(300, noise=0.4, random_state=2)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.5, random_state=0)
F0, trees = boost_classifier(X_train, y_train, 100, 0.1, 2)
test_accuracy = ((predict_proba(F0, trees, 0.1, X_test) > 0.5) == y_test).mean()
print(test_accuracy)
```

```python test
import numpy as _np
from sklearn.datasets import make_moons as _mm
from sklearn.model_selection import train_test_split as _tts
from sklearn.tree import DecisionTreeRegressor as _DTR
assert "boost_classifier" in dir() and "predict_proba" in dir(), "Keep both function names."
_sig = lambda z: 1 / (1 + _np.exp(-z))
_X, _y = _mm(300, noise=0.4, random_state=2)
_Xtr, _Xte, _ytr, _yte = _tts(_X, _y, test_size=0.5, random_state=0)
_ys = _np.array([1, 0, 0, 0, 1, 0, 0, 0])
_F0, _t = boost_classifier(_np.arange(8.0).reshape(-1, 1), _ys, 0, 0.1, 1)
assert _np.isclose(_F0, _np.log(0.25 / 0.75)), f"With 2 ones out of 8, F0 should be the log-odds ln(0.25 / 0.75) ≈ −1.099, but got {_F0}."
assert _np.allclose(predict_proba(_F0, _t, 0.1, _np.zeros((3, 1))), 0.25), "With no trees, every predicted probability should be the base rate, σ(F0)."
_F = _np.full(len(_ytr), _np.log(_ytr.mean() / (1 - _ytr.mean())))
_Fte = _np.full(len(_yte), _F[0])
for _ in range(20):
    _tree = _DTR(max_depth=2, random_state=0).fit(_Xtr, _ytr - _sig(_F))
    _F += 0.1 * _tree.predict(_Xtr)
    _Fte += 0.1 * _tree.predict(_Xte)
_F0b, _tb = boost_classifier(_Xtr, _ytr, 20, 0.1, 2)
assert len(_tb) == 20, "boost_classifier should return one tree per round."
_got = predict_proba(_F0b, _tb, 0.1, _Xte)
assert _np.allclose(_got, _sig(_Fte)), "After 20 rounds your probabilities differ from the expected ones. Fit each tree to y − σ(F), the label minus the current probability, and add lr times its prediction to F."
_F0c, _tc = boost_classifier(_Xtr, _ytr, 100, 0.1, 2)
_acc = ((predict_proba(_F0c, _tc, 0.1, _Xte) > 0.5) == _yte).mean()
assert _np.isclose(test_accuracy, _acc), f"test_accuracy should be {_acc:.3f}."
f"SUCCESS: Trees fitted to 'label minus probability', the logistic regression gradient, reach {_acc:.2f} on the noisy moons."
```

Hint: Keep an array `F` of current scores for the training examples. Each round, the target for the new tree is `y - sigmoid(F)`. `predict_proba` must rebuild the score for new rows the same way: start at `F0` and add `lr * tree.predict(X)` for every tree.
:::

## What you learned

- Boosting builds weak learners (often stumps) one after another, each focusing on what the previous ones got wrong. Bagging reduces variance; boosting reduces bias.
- AdaBoost re-weights the examples: a stump with weighted error ε gets a say α = ½ ln((1 − ε)/ε), and the weights update by `w · e^(−α y h)`, growing for mistakes. The final model is the sign of the weighted vote.
- Gradient boosting starts from a constant and repeatedly fits a small tree to the residuals, adding a fraction ν (the learning rate) of each.
- The residuals are the negative gradient of the squared error with respect to the predictions, so gradient boosting is gradient descent on the predictions. Any differentiable loss works: for log loss, fit trees to y − σ(F).
- Unlike random forests, boosting overfits if run too long. Choose the number of trees by early stopping on validation data (`staged_predict`), with a small learning rate and small trees.
- `HistGradientBoostingClassifier` (like LightGBM and XGBoost) is the fast, practical choice for tabular data.

Trees build their boundaries from many small pieces. The next lesson returns to a single boundary, chosen with a different goal: not just to separate the classes, but to leave the widest possible margin between them. That is the support vector machine.
