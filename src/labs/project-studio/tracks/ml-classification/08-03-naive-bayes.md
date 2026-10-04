---
title: 8.3 — Every Word Is Evidence: Naive Bayes
track: Classification — A Spam Detector
runtime: none
concepts: naive-bayes
revisits: probability, text-features, matrices, numpy, scikit-learn, classes, testing
notebook: ml-naive-bayes
lab: 11
problem: Bayes' rule turned one word into a probability of spam. A message has many words, some pointing to spam and some to ham. How do you combine all of them into one answer, without the numbers vanishing to zero along the way?
---

Lesson 8.1 used Bayes' rule on one word. To use a whole message, you'd want $P(\text{message} \mid \text{spam})$: how likely *this exact message* is among spam. You can't count that; no other message is exactly the same. Naive Bayes estimates it from the words one at a time, by making one bold simplification.

> **Naive Bayes**: a classifier that applies Bayes' rule to a whole message by assuming each word is chosen **independently** of the others, given the class. Then the probability of the message is the product of its words' probabilities:
> $$P(\text{message} \mid \text{spam}) \approx P(w_1 \mid \text{spam}) \times P(w_2 \mid \text{spam}) \times \dots$$
> The assumption is the "naive" part, and it's plainly false ("free" and "entry" turn up together), but the classifier works well anyway, because it only has to get *which class scores higher* right, not the exact probability.
>
> *Picture it as* a panel of witnesses who each give evidence without hearing the others. Each word testifies "I'm 12 times more common in spam" or "I'm twice as common in ham", and the verdict multiplies their testimony together. Two witnesses who are really repeating the same story get counted twice, so the verdict is overconfident, but it's usually still the right verdict.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_bayes.py provided
# Tests for nb.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_bayes.py
import numpy as np
from pytest import approx
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB

import messages

TEXTS, LABELS = messages.load("data/messages.csv")
TRAIN, TEST, TRAIN_LABELS, TEST_LABELS = messages.split(TEXTS, LABELS)
VECTORIZER = CountVectorizer().fit(TRAIN)
X_TRAIN, X_TEST = VECTORIZER.transform(TRAIN).toarray(), VECTORIZER.transform(TEST).toarray()


def test_fit_learns_how_common_each_class_is():
    import nb
    model = nb.NaiveBayes().fit(np.array([[1, 0], [0, 1], [0, 1]]), [1, 0, 0])
    assert np.exp(model.log_prior_) == approx([2 / 3, 1 / 3])


def test_fit_adds_one_to_every_count_before_dividing():
    import nb
    model = nb.NaiveBayes().fit(np.array([[2, 0], [0, 1]]), [1, 0])
    assert np.exp(model.log_word_[1]) == approx([3 / 4, 1 / 4])
    assert np.exp(model.log_word_[0]) == approx([1 / 3, 2 / 3])


def test_fit_matches_scikit_learn_multinomial_nb():
    import nb
    mine, theirs = nb.NaiveBayes().fit(X_TRAIN, TRAIN_LABELS), MultinomialNB().fit(X_TRAIN, TRAIN_LABELS)
    assert mine.log_prior_ == approx(theirs.class_log_prior_)
    assert np.allclose(mine.log_word_, theirs.feature_log_prob_)


def test_predict_proba_matches_scikit_learn_and_adds_up_to_one():
    import nb
    mine = nb.NaiveBayes().fit(X_TRAIN, TRAIN_LABELS).predict_proba(X_TEST)
    assert np.allclose(mine, MultinomialNB().fit(X_TRAIN, TRAIN_LABELS).predict_proba(X_TEST))
    assert np.allclose(mine.sum(axis=1), 1)


def test_predict_proba_survives_a_very_long_message():
    import nb
    long_message = 500 * X_TEST[:1]
    probabilities = nb.NaiveBayes().fit(X_TRAIN, TRAIN_LABELS).predict_proba(long_message)
    assert not np.isnan(probabilities).any()


def test_predict_picks_the_class_with_the_higher_score():
    import nb
    model = nb.NaiveBayes().fit(X_TRAIN, TRAIN_LABELS)
    assert model.predict(X_TEST).tolist() == model.scores(X_TEST).argmax(axis=1).tolist()
    assert (model.predict(X_TEST) == np.array(TEST_LABELS)).sum() == 82
```

- The test file uses scikit-learn's `CountVectorizer`, which lesson 8.2 showed is identical to your `bag.py`.
- `500 * X_TEST[:1]` is one test message with every count multiplied by 500: a 5,000-word message. The test checks the answer still comes out as numbers, not `nan` ("not a number", NumPy's result for things like 0 ÷ 0).

```check
file tests/test_bayes.py -- Click "Create provided tests/test_bayes.py" above.
```

## Two problems with multiplying

To use the formula, you need $P(\text{word} \mid \text{spam})$ for every word. Naive Bayes estimates it slightly differently from lesson 8.1: not "the fraction of spam *messages* containing the word", but "the fraction of all the *words* in spam that are this word", so a word used twice counts twice:

$$P(\text{link} \mid \text{spam}) = \frac{\text{times "link" appears in spam}}{\text{total words in spam}}$$

Two things go wrong when you multiply these together.

**A zero wipes out everything.** In the training data, *link* appears 10 times in spam and only once in ham, and *win* never appears in ham at all. So $P(\text{win} \mid \text{ham}) = 0$, and *any* message containing *win* gets $P(\text{message} \mid \text{ham}) = 0 \times \dots = 0$, however many ham words it also has: "Did you win the game? See you at the library tonight" would be certainly spam. One word with no ham examples outvotes all the others.

The fix is to pretend every word was seen one extra time in each class:

$$P(\text{word} \mid \text{spam}) = \frac{\text{count in spam} + 1}{\text{total words in spam} + V}$$

where $V$ is the vocabulary size (262), added to the bottom so the probabilities still add up to 1. This is **Laplace smoothing** (or **add-one smoothing**). *Picture it as* never quoting a reject rate of exactly zero from a small sample: zero rejects in 40 parts means "rare", not "impossible". In the training spam there are 638 words, so *link* gets (10 + 1) / (638 + 262) = 0.0122 in spam and (1 + 1) / (1641 + 262) = 0.00105 in ham: about 12 times more likely in spam.

**The product vanishes.** Each word's probability is small, around 0.01. A 200-word message multiplies 200 of them:

```text
>>> 0.01 ** 200
0.0
```

The true answer is $10^{-400}$, but the smallest number a Python float can hold is about $10^{-308}$. Anything smaller rounds to exactly 0, called **underflow**, and then spam and ham both score 0 and can't be compared.

The fix is **logarithms**. The log of a product is the sum of the logs, $\log(a \times b) = \log a + \log b$, so instead of multiplying tiny numbers you add moderate negative ones:

```text
>>> import math
>>> 200 * math.log(0.01)
-921.0340371976182
```

No underflow. And because $\log$ always increases as its input increases, whichever class has the larger product also has the larger sum of logs. Comparing **log scores** gives the same winner.

> **Logarithm** (natural log, `math.log` or `np.log`): the power you'd raise $e \approx 2.718$ to, to get the number. $\log 1 = 0$; numbers between 0 and 1 have negative logs; $\log(a \times b) = \log a + \log b$. Its inverse is $e^x$, `np.exp`.
>
> *Picture it as* a gearbox that turns multiplication into addition: multiplying 200 tiny numbers becomes adding 200 manageable ones, and nothing falls off the bottom of the scale.

## Fit: count, smooth, take logs

Create `nb.py`:

```python file=nb.py
import numpy as np


class NaiveBayes:
    def __init__(self, smoothing: float = 1.0):
        self.smoothing = smoothing

    def fit(self, X: np.ndarray, y) -> "NaiveBayes":
        y = np.asarray(y)
        self.log_prior_ = np.log([np.mean(y == 0), np.mean(y == 1)])
        counts = np.array([X[y == label].sum(axis=0) for label in (0, 1)]) + self.smoothing
        self.log_word_ = np.log(counts / counts.sum(axis=1, keepdims=True))
        return self
```

Line by line:

- **`np.mean(y == 0)`**: `y == 0` is an array of `True`/`False`, and its mean is the fraction of ham: $P(\text{ham})$. `log_prior_` holds $[\log P(\text{ham}), \log P(\text{spam})]$, ham first because ham is class 0.
- **`X[y == label]`** keeps the rows of that class (a mask, lesson 1.3), and **`.sum(axis=0)`** adds down the columns: how many times each word appears in that class. With both classes stacked, `counts` has 2 rows and 262 columns. `+ self.smoothing` adds 1 to every one of the 524 numbers.
- **`counts.sum(axis=1, keepdims=True)`** adds *along* each row: the total words per class (plus 262). `keepdims=True` keeps the answer as a column (2 rows, 1 column) instead of a flat pair, so dividing the 2 × 262 table by it divides **each row by its own total**: NumPy's broadcasting (lesson 2.2).
- The names end in `_`, scikit-learn's convention for "learned by `fit`" (lesson 3.3).

```check
run ".venv/Scripts/python -m pytest -q tests/test_bayes.py -k fit" label="fit learns log class shares and smoothed log word shares, the same numbers as MultinomialNB" -- counts = per-class column sums + smoothing; log_word_ = np.log(counts / counts.sum(axis=1, keepdims=True))
```

## Predict: add up the evidence

The log score of a class for one message is its log prior plus, for every word, (how many times the word appears) × (log probability of the word in that class). For all messages at once, that's one matrix multiplication (lesson 2.2):

$$\text{scores} = X\,(\text{log\_word})^\top + \text{log\_prior}$$

$X$ is messages × words, $\text{log\_word}^\top$ is words × 2, so the result is messages × 2: a ham score and a spam score per message.

Turning two log scores into probabilities means undoing the logs with `np.exp` and dividing each by their total. But for a long message the scores are around −5,000, and $e^{-5000}$ underflows to 0, giving 0 ÷ 0 = `nan`. The trick: **subtract the larger score from both first**. That divides both $e^{\text{score}}$s by the same number, so their ratio (all that matters) is unchanged, and the larger one becomes $e^0 = 1$, safely away from zero.

Add three methods to `nb.py`:

```python file=nb.py
import numpy as np


class NaiveBayes:
    def __init__(self, smoothing: float = 1.0):
        self.smoothing = smoothing

    def fit(self, X: np.ndarray, y) -> "NaiveBayes":
        y = np.asarray(y)
        self.log_prior_ = np.log([np.mean(y == 0), np.mean(y == 1)])
        counts = np.array([X[y == label].sum(axis=0) for label in (0, 1)]) + self.smoothing
        self.log_word_ = np.log(counts / counts.sum(axis=1, keepdims=True))
        return self

    def scores(self, X: np.ndarray) -> np.ndarray:
        return X @ self.log_word_.T + self.log_prior_

    def predict(self, X: np.ndarray) -> np.ndarray:
        return self.scores(X).argmax(axis=1)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        scores = self.scores(X)
        scores = scores - scores.max(axis=1, keepdims=True)
        odds = np.exp(scores)
        return odds / odds.sum(axis=1, keepdims=True)
```

- **`.T`** is the transpose (lesson 2.2): `log_word_` is 2 × 262, `.T` makes it 262 × 2.
- **`+ self.log_prior_`**: a pair added to every row, broadcasting again.
- **`.argmax(axis=1)`** gives, for each row, the *position* of its largest value: 0 if the ham score is larger, 1 if spam. Positions and class numbers line up because ham is column 0.
- **`predict_proba`** returns two columns, $P(\text{ham})$ and $P(\text{spam})$, the same shape scikit-learn uses. `[:, 1]` takes the spam column.

```check
run ".venv/Scripts/python -m pytest -q tests/test_bayes.py" label="probabilities match MultinomialNB, add up to 1, and survive a 5,000-word message" -- scores = X @ log_word_.T + log_prior_; subtract each row's max before np.exp
```

## Try it

Create `classify.py`:

```python file=classify.py
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer

import messages
import nb

texts, labels = messages.load("data/messages.csv")
train, test, train_labels, test_labels = messages.split(texts, labels)
vectorizer = CountVectorizer().fit(train)
model = nb.NaiveBayes().fit(vectorizer.transform(train).toarray(), train_labels)

probabilities = model.predict_proba(vectorizer.transform(test).toarray())[:, 1]
predictions = (probabilities >= 0.5).astype(int)
correct = int(np.sum(predictions == np.array(test_labels)))
print(f"correct on {correct} of {len(test)} test messages ({correct / len(test):.1%})")
print("mistakes:")
for text, label, p in zip(test, test_labels, probabilities):
    if (p >= 0.5) != label:
        print(f"  {'spam' if label else 'ham '} P(spam)={p:.3f}  {text}")

evidence = model.log_word_[1] - model.log_word_[0]
vocab = vectorizer.get_feature_names_out()
print("strongest spam words:", ", ".join(vocab[np.argsort(evidence)[::-1][:6]]))
print("strongest ham words: ", ", ".join(vocab[np.argsort(evidence)[:6]]))
```

- **`(probabilities >= 0.5).astype(int)`**: `True`/`False` for each message, turned into 1/0. 0.5 is the **threshold**: call it spam if spam is more likely than not. Lesson 8.5 questions that choice.
- **`evidence`**: for each word, $\log P(w \mid \text{spam}) - \log P(w \mid \text{ham})$. Positive means the word pushes towards spam. `np.argsort` (lesson 7.4) ranks them.

```powershell
.venv\Scripts\python classify.py
```

```text
correct on 82 of 86 test messages (95.3%)
mistakes:
  ham  P(spam)=0.545  Reply when you can, no rush
  spam P(spam)=0.001  Your parcel is on hold. Pay the 1.99 fee at the link to release it
  ham  P(spam)=0.974  Just got home, so tired
  spam P(spam)=0.283  Lowest rates on loans, approved in minutes. Call today
strongest spam words: 1000, win, 500, waiting, winner, holiday
strongest ham words:  if, tonight, tomorrow, library, weekend, still
```

```check
run ".venv/Scripts/python classify.py" stdout="correct on 82 of 86 test messages (95.3%)" label="classify.py measures the filter on the 86 held-out messages"
```

### Reading a mistake

The model is only adding numbers, so you can follow it exactly. Here is the evidence for "Just got home, so tired", from `model.log_prior_` and `evidence`:

| | evidence (log ratio) |
|---|---|
| prior: log(0.251 / 0.749) | −1.09 |
| *just* | +2.14 |
| *got* | +0.06 |
| *home* | +2.54 |
| *so*, *tired* | not in the vocabulary: ignored |
| **total** | **+3.65** |

A total of +3.65 means spam is $e^{3.65} \approx 38$ times more likely than ham, so P(spam) = 38 / 39 ≈ 0.974. Why does *home* point so strongly to spam? Because in the **training** messages, every message containing *home* was the "Earn £1000 a week from home!" scam. The ham messages about getting home all happened to land in the test set. The model learned exactly what its training data said.

The two missed spam messages fail for the reason lesson 8.2 predicted: their giveaway words (*hold*, *fee*, *release*, *lowest*, *loans*) never appeared in training, so they're silently dropped, and what's left (*the*, *at*, *on*, *it*, *pay*) sounds like ordinary conversation.

```predict
question: What would most reliably fix both kinds of mistake?
choice: A cleverer formula
choice: More training messages, covering more ways people write ham and spam
choice: A higher threshold than 0.5
answer: More training messages, covering more ways people write ham and spam
explain: Every mistake here comes from the training data, not the arithmetic: "home" only ever appeared in one kind of spam, and the parcel and loan scams used words the model had never seen. A different threshold trades one kind of mistake for the other (lesson 8.5) but can't teach the model new words. With text, more varied data almost always beats a cleverer model.
```

scikit-learn's version is `MultinomialNB()` ("multinomial" because it models word *counts*), with `alpha=1.0` as the smoothing; you've checked it learns exactly your numbers. Next: a model that doesn't assume the words are independent, and *learns* how much to trust each one.
