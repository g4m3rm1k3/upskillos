---
title: 8.4 — Learning the Weights: Logistic Regression
track: Classification — A Spam Detector
runtime: none
concepts: logistic-regression
revisits: linear-model, gradient-descent, gradients, loss, regularization, probability, text-features, scikit-learn, classes
notebook: ml-logistic-regression
lab: 8
problem: Naive Bayes gets each word's weight from counting, and assumes the words don't overlap. Could a model instead *learn* how much to trust each word, by gradient descent, the way the house-price model learned its weights? What would it even minimise?
---

Naive Bayes never looks at its own mistakes. Each word's evidence comes from counting, once, and words that always appear together (*claim* and *now*) get counted twice. In Chapter 3 the house-price model did something different: it started with weights of zero and **adjusted them to reduce its error**, step by step. This lesson does that for spam.

The plan is the linear model of lesson 3.1, with two changes: squash its output into a probability, and measure the error in a way that suits probabilities.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_logistic.py provided
# Tests for logistic.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_logistic.py
import math

import numpy as np
from pytest import approx
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.linear_model import LogisticRegression

import messages

TEXTS, LABELS = messages.load("data/messages.csv")
TRAIN, TEST, TRAIN_LABELS, TEST_LABELS = messages.split(TEXTS, LABELS)
VECTORIZER = CountVectorizer().fit(TRAIN)
X_TRAIN, X_TEST = VECTORIZER.transform(TRAIN).toarray(), VECTORIZER.transform(TEST).toarray()


def test_sigmoid_squashes_any_number_between_zero_and_one():
    import logistic
    assert logistic.sigmoid(np.array([0.0]))[0] == 0.5
    assert logistic.sigmoid(np.array([-30.0, 30.0])) == approx([0, 1], abs=1e-12)
    z = np.array([-2.0, 0.5, 3.0])
    assert logistic.sigmoid(-z) == approx(1 - logistic.sigmoid(z))


def test_log_loss_punishes_confident_mistakes_hardest():
    import logistic
    assert logistic.log_loss([1], [0.5]) == approx(math.log(2))
    assert logistic.log_loss([1], [0.99]) == approx(0.01005, abs=1e-5)
    assert logistic.log_loss([1], [0.01]) == approx(4.605, abs=1e-3)
    assert logistic.log_loss([0], [0.99]) == approx(4.605, abs=1e-3)


def test_gradient_matches_the_slope_measured_numerically():
    import logistic
    rng = np.random.default_rng(0)
    X, y, w, b = rng.normal(size=(20, 3)), rng.integers(0, 2, 20), rng.normal(size=3), 0.3
    grad_w, grad_b = logistic.gradient(X, y, w, b, penalty=2.0)
    h = 1e-6
    for j in range(3):
        step = np.zeros(3)
        step[j] = h
        slope = (logistic.objective(X, y, w + step, b, 2.0) - logistic.objective(X, y, w - step, b, 2.0)) / (2 * h)
        assert grad_w[j] == approx(slope, rel=1e-5)
    slope_b = (logistic.objective(X, y, w, b + h, 2.0) - logistic.objective(X, y, w, b - h, 2.0)) / (2 * h)
    assert grad_b == approx(slope_b, rel=1e-5)


def test_fit_lowers_the_objective_every_step():
    import logistic
    model = logistic.LogisticRegression(steps=200).fit(X_TRAIN, TRAIN_LABELS)
    assert all(later <= earlier for earlier, later in zip(model.history_, model.history_[1:]))


def test_fit_matches_scikit_learn():
    import logistic
    mine = logistic.LogisticRegression().fit(X_TRAIN, TRAIN_LABELS).predict_proba(X_TEST)
    theirs = LogisticRegression(C=1.0).fit(X_TRAIN, TRAIN_LABELS).predict_proba(X_TEST)
    assert np.abs(mine - theirs).max() < 0.01


def test_predict_calls_spam_from_a_probability_of_one_half():
    import logistic
    model = logistic.LogisticRegression().fit(X_TRAIN, TRAIN_LABELS)
    assert model.predict(X_TEST).tolist() == (model.predict_proba(X_TEST)[:, 1] >= 0.5).astype(int).tolist()
    assert (model.predict(X_TEST) == np.array(TEST_LABELS)).sum() == 84
```

The gradient test is lesson 2.4's idea used as a safety net: the gradient you'll derive with algebra must equal the slope measured by nudging each weight a tiny amount `h` each way. If they disagree, the algebra is wrong.

```check
file tests/test_logistic.py -- Click "Create provided tests/test_logistic.py" above.
```

## From a score to a probability

Start the way lesson 3.1 did: a weighted sum of the features plus a bias, $z = \mathbf{w} \cdot \mathbf{x} + b$. Each word gets a weight, and a message's score is the sum of the weights of its words (times their counts). But $z$ can be any number, −40 or 12, and a probability has to be between 0 and 1. So pass it through a function that squashes:

$$\sigma(z) = \frac{1}{1 + e^{-z}}$$

> **Sigmoid** (the **logistic function**), $\sigma$: an S-shaped curve that turns any number into one between 0 and 1. $\sigma(0) = 0.5$; large positive $z$ gives nearly 1; large negative, nearly 0.
>
> *Picture it as* a dimmer switch with end stops. Turning the knob (the score) brightens the light smoothly in the middle, but however far you turn it, the light never goes past fully on or below fully off.

> **Logistic regression**: a classifier that computes a linear score $z = \mathbf{w} \cdot \mathbf{x} + b$ and reports $\sigma(z)$ as the probability of class 1. Despite the name, it's for classification; "regression" is because, inside, it's fitting a linear model.

How the formula behaves: when $z$ is large and positive, $e^{-z}$ is tiny, so $\sigma(z) \approx 1/1 = 1$. When $z$ is large and negative, $e^{-z}$ is huge, so $\sigma(z) \approx 0$. And $\sigma(-z) = 1 - \sigma(z)$: the curve is symmetric about 0.5, which the first test checks.

The score has a meaning too: $z$ is the **log odds**, $\log\frac{P(\text{spam})}{P(\text{ham})}$, the same "total evidence" you added up for Naive Bayes in lesson 8.3. Logistic regression *learns* the evidence each word carries instead of counting it.

Create `logistic.py`:

```python file=logistic.py
import numpy as np


def sigmoid(z: np.ndarray) -> np.ndarray:
    return 1 / (1 + np.exp(-z))
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_logistic.py -k sigmoid" label="sigmoid maps 0 to 0.5, extremes to 0 and 1, and is symmetric"
```

## What to minimise: log loss

For house prices, the error was squared distance. For a probability, what matters is how much probability the model put on **what actually happened**. If a message is spam and the model said P(spam) = 0.99, that's nearly perfect; 0.5 is a shrug; 0.01 is confidently wrong. The loss for one message is

$$-\log(p) \text{ if it's spam,} \qquad -\log(1 - p) \text{ if it's ham}$$

and, using $y = 1$ for spam and $0$ for ham to switch between them, the average over all messages is

$$L = -\frac{1}{n}\sum_i \Big[y_i \log p_i + (1 - y_i)\log(1 - p_i)\Big]$$

For a spam message ($y = 1$) the second term is multiplied by 0 and vanishes, leaving $-\log p$; for ham the first vanishes.

> **Log loss** (also **cross-entropy**): the average of $-\log(\text{probability the model gave to the right answer})$. 0 for certainty in the right answer; 0.693 ($\log 2$) for a 50–50 shrug; and growing without limit as the model becomes certain of the wrong answer.
>
> *Picture it as* a forecaster paid by how much probability they put on the weather that actually happened. Saying "90% sun" on a sunny day costs little; saying "99% sun" on the day of the flood costs a fortune. It rewards being right *and* being honest about how sure you are.

```predict
question: One spam message. Model A says P(spam) = 0.4, model B says P(spam) = 0.01. Both are wrong at a threshold of 0.5. How do their log losses compare?
choice: About the same: both got it wrong
choice: B's loss is about 5 times A's
choice: B's loss is 100 times A's
answer: B's loss is about 5 times A's
explain: A: −log(0.4) ≈ 0.92. B: −log(0.01) ≈ 4.61, about 5 times as much. Counting mistakes (accuracy) can't tell A and B apart; log loss can, and its gradient pushes hardest on the confident mistakes. That's what makes it a good thing to minimise.
```

Add `log_loss` to `logistic.py`:

```python file=logistic.py
import numpy as np


def sigmoid(z: np.ndarray) -> np.ndarray:
    return 1 / (1 + np.exp(-z))


def log_loss(y, p) -> float:
    y, p = np.asarray(y), np.clip(p, 1e-15, 1 - 1e-15)
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))
```

**`np.clip(p, low, high)`** limits every value to that range. $\log 0$ is minus infinity, so a probability of exactly 0 or 1 would break the sum; nudging it to $10^{-15}$ keeps the loss finite (just very large). scikit-learn's `log_loss` does the same.

```check
run ".venv/Scripts/python -m pytest -q tests/test_logistic.py -k log_loss" label="log loss is log 2 for a shrug, small for confident right answers, large for confident wrong ones"
```

## The gradient, and a penalty

Gradient descent (lesson 3.2) needs the slope of the loss with respect to each weight. Using the chain rule (lesson 2.3) through the log and the sigmoid, almost everything cancels, and the result is strikingly simple:

$$\frac{\partial L}{\partial w_j} = \frac{1}{n}\sum_i (p_i - y_i)\,x_{ij}, \qquad \frac{\partial L}{\partial b} = \frac{1}{n}\sum_i (p_i - y_i)$$

The same shape as linear regression's gradient: (prediction − truth) × feature, averaged. Each message pushes each of its words' weights in proportion to how wrong the model was about it. In matrix form, the first is $X^\top(\mathbf{p} - \mathbf{y}) / n$, one line of NumPy.

You don't have to take the algebra on trust: the test compares the formula with the slope measured numerically.

One more thing is needed. If some word appears only in spam (*win*, *link* nearly), the model can always reduce the loss a little more by making that word's weight bigger, pushing those messages' probabilities from 0.999 to 0.9999. The loss never reaches its minimum; the weights grow forever. That's overfitting, and lesson 7.2's cure applies: add a penalty $\lambda \sum_j w_j^2$, here scaled as $\frac{\lambda}{2n}\sum_j w_j^2$ to match scikit-learn. Its slope adds $\lambda w_j / n$ to each weight's gradient. The bias isn't penalised.

Add the objective (loss plus penalty) and its gradient:

```python file=logistic.py
import numpy as np


def sigmoid(z: np.ndarray) -> np.ndarray:
    return 1 / (1 + np.exp(-z))


def log_loss(y, p) -> float:
    y, p = np.asarray(y), np.clip(p, 1e-15, 1 - 1e-15)
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))


def objective(X: np.ndarray, y, w: np.ndarray, b: float, penalty: float) -> float:
    """What training minimises: log loss plus the weight penalty."""
    return log_loss(y, sigmoid(X @ w + b)) + float(penalty * np.sum(w ** 2)) / (2 * len(y))


def gradient(X: np.ndarray, y, w: np.ndarray, b: float, penalty: float) -> tuple[np.ndarray, float]:
    """The slope of the objective with respect to the weights, and to the bias."""
    n = len(y)
    error = sigmoid(X @ w + b) - y
    return X.T @ error / n + penalty * w / n, float(np.mean(error))
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_logistic.py -k gradient" label="the gradient formula equals the slope measured by nudging each weight" -- error = sigmoid(X @ w + b) - y; grad_w = X.T @ error / n + penalty * w / n; grad_b = mean(error)
```

## Training

Now gradient descent, exactly as in lesson 3.2, wrapped in a class with scikit-learn's method names:

```python file=logistic.py
import numpy as np


def sigmoid(z: np.ndarray) -> np.ndarray:
    return 1 / (1 + np.exp(-z))


def log_loss(y, p) -> float:
    y, p = np.asarray(y), np.clip(p, 1e-15, 1 - 1e-15)
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))


def objective(X: np.ndarray, y, w: np.ndarray, b: float, penalty: float) -> float:
    """What training minimises: log loss plus the weight penalty."""
    return log_loss(y, sigmoid(X @ w + b)) + float(penalty * np.sum(w ** 2)) / (2 * len(y))


def gradient(X: np.ndarray, y, w: np.ndarray, b: float, penalty: float) -> tuple[np.ndarray, float]:
    """The slope of the objective with respect to the weights, and to the bias."""
    n = len(y)
    error = sigmoid(X @ w + b) - y
    return X.T @ error / n + penalty * w / n, float(np.mean(error))


class LogisticRegression:
    def __init__(self, penalty: float = 1.0, learning_rate: float = 0.5, steps: int = 3000):
        self.penalty, self.learning_rate, self.steps = penalty, learning_rate, steps

    def fit(self, X: np.ndarray, y) -> "LogisticRegression":
        y = np.asarray(y, dtype=float)
        w, b = np.zeros(X.shape[1]), 0.0
        self.history_ = []
        for _ in range(self.steps):
            grad_w, grad_b = gradient(X, y, w, b, self.penalty)
            w, b = w - self.learning_rate * grad_w, b - self.learning_rate * grad_b
            self.history_.append(objective(X, y, w, b, self.penalty))
        self.coef_, self.intercept_ = w, b
        return self

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        p = sigmoid(X @ self.coef_ + self.intercept_)
        return np.column_stack([1 - p, p])

    def predict(self, X: np.ndarray) -> np.ndarray:
        return (self.predict_proba(X)[:, 1] >= 0.5).astype(int)
```

- **`w, b = w - …, b - …`** updates both at once: the right-hand side is worked out completely, using the old `w` and `b`, before either is replaced.
- **`self.history_`** records the objective after every step, so you (and the test) can watch it fall.
- **`np.column_stack([1 - p, p])`** makes the same two-column shape as `nb.NaiveBayes.predict_proba` and scikit-learn: P(ham), P(spam).

scikit-learn's `LogisticRegression(C=1.0)` minimises the same objective, with `C` = 1 / penalty (its name for the same dial, turned the other way: *larger* C, *weaker* penalty). It uses a faster method than plain gradient descent, so after 3,000 steps your weights are close to its answer but not identical; the test allows 0.01 of difference in any probability.

```check
run ".venv/Scripts/python -m pytest -q tests/test_logistic.py" label="training lowers the objective every step and ends within 0.01 of scikit-learn's probabilities"
```

## What it learned

At the Python prompt:

```text
>>> import numpy as np, messages, logistic
>>> from sklearn.feature_extraction.text import CountVectorizer
>>> texts, labels = messages.load("data/messages.csv")
>>> train, test, train_labels, test_labels = messages.split(texts, labels)
>>> vectorizer = CountVectorizer().fit(train)
>>> model = logistic.LogisticRegression().fit(vectorizer.transform(train).toarray(), train_labels)
>>> round(model.history_[0], 3), round(model.history_[99], 3), round(model.history_[-1], 3)
(0.594, 0.148, 0.113)
>>> (model.predict(vectorizer.transform(test).toarray()) == np.array(test_labels)).sum()
np.int64(84)
>>> vocab = vectorizer.get_feature_names_out()
>>> [str(vocab[i]) for i in np.argsort(model.coef_)[::-1][:5]]
['link', 'now', 'claim', 'to', 'free']
>>> [str(vocab[i]) for i in np.argsort(model.coef_)[:5]]
['the', 'if', 'tonight', 'tomorrow', 'weekend']
```

84 of 86, two better than Naive Bayes. Both of Naive Bayes' false alarms ("Just got home, so tired" and "Reply when you can") are now correctly ham: logistic regression *learned* that *home* and *reply* are weak evidence when the rest of the message is ordinary, because it adjusted the weights against its own mistakes on the training messages. The two missed scams are still missed: their giveaway words have no weights at all.

The penalty earns its place, too. Train without it and watch the objective and the largest weight:

| penalty | steps | final objective | largest weight |
|---|---|---|---|
| 1 | 1,000 | 0.113 | 1.71 |
| 1 | 10,000 | 0.113 | 1.71 |
| 0 | 1,000 | 0.013 | 2.88 |
| 0 | 3,000 | 0.004 | 3.69 |
| 0 | 10,000 | 0.001 | 4.56 |

With the penalty, training settles: more steps change nothing. Without it, the training loss keeps creeping towards 0 and the weights keep growing, for as long as you let it run. That's a model becoming ever more certain about its training messages, the definition of overfitting from lesson 7.1.

Logistic regression is the model you'll see most often for classification: fast, its weights are readable, and its probabilities are usually honest. It's also the single neuron that Chapter 12 builds neural networks from. Next: when it says 84 of 86, is that actually good?
