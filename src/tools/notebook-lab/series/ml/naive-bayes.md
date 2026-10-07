# Naive Bayes

A spam filter sees the words "free", "win" and "money" in an email. How likely is it to be spam? You can't easily answer that directly. But the **reverse** question, how often do spam emails contain "free", is easy: count. **Bayes' rule** is the piece of probability that turns the easy, reverse question into the one you want. Built into a classifier with one bold simplification, it becomes **Naive Bayes**: one of the oldest, fastest and simplest classifiers, the method behind the first spam filters that actually worked, and still a strong baseline for text.

This lesson turns Bayes' rule into a classifier, writes a spam filter from scratch (meeting two practical problems on the way: zero counts and numbers too small for a float), and then extends the idea to numeric features.

## Bayes' rule, again

You met Bayes' rule at the end of the probability lesson, through a medical test. Here is the same reasoning once more, as counting, because the classifier is built from exactly these pieces.

A disease affects 1% of people. A test catches 90% of people who have it, and wrongly flags 5% of people who don't. Picture 10,000 people: 100 have the disease, and the test flags 90 of them; 9,900 don't, and the test flags 495 of them. Of the 585 positives, only 90 are ill, about **15%**. Written with probabilities, where P(A | B) means "the probability of A given that B is true":

\[
P(\text{ill} \mid +) = \frac{P(+ \mid \text{ill})\, P(\text{ill})}{P(+)}
\]

- P(ill) = 0.01 is the **prior**: what you believed before the evidence.
- P(+ | ill) = 0.9 is the **likelihood** of the evidence if the hypothesis is true.
- P(+) is the overall chance of the evidence: 0.01 × 0.9 + 0.99 × 0.05, all the positives from both groups.
- P(ill | +) is the **posterior**: what you should believe after the evidence.

Bayes' rule flips the conditional, from P(+ | ill), which is easy to measure, to P(ill | +), which is what you want. For a spam filter, P("free" | spam) is easy to measure by counting spam, and P(spam | "free") is what the filter needs.

## From Bayes' rule to a classifier

For classification, the hypothesis is the class and the evidence is the features `x`. For each class `c`:

\[
P(c \mid x) = \frac{P(x \mid c)\, P(c)}{P(x)}
\]

The denominator P(x) is the same for every class, so to find the most probable class you only need to compare the top: **prior × likelihood**, P(c) × P(x | c). The prior is easy: the fraction of training examples in each class. The likelihood is the hard part. With many features, P(x | c), the probability of this exact combination of feature values within class `c`, cannot be counted directly: an email's exact list of words has probably never been seen before.

The **naive** assumption fixes this: assume the features are **independent within each class**. Then the probability of the whole combination is the product of the separate probabilities:

\[
P(x \mid c) = P(x_1 \mid c) \times P(x_2 \mid c) \times \cdots \times P(x_d \mid c)
\]

Each factor is easy to estimate from counts. The assumption is almost always false: in spam, "free" and "prize" appear together far more than independence predicts. That is why the method is called naive. Yet it works well in practice, as you will see.

## A spam filter from scratch

Represent each message as a **bag of words**: just its words, ignoring order. For each class, count how often each word appears across that class's training messages, and estimate P(word | class) as that word's share of the class's words. A new message's score for a class is then the prior times the product of P(word | class) over its words.

Two practical problems appear immediately.

**Zero counts.** The word "lunch" never appears in the spam below. Its estimated P(lunch | spam) is 0, so any message containing "lunch" gets a spam score of exactly 0, whatever else it says: one unseen word vetoes all the other evidence. The fix is **Laplace smoothing** (also called add-one smoothing): pretend every word was seen `α` extra times (usually `α = 1`) in every class:

\[
P(w \mid c) = \frac{\text{count}(w, c) + \alpha}{\text{total words in } c + \alpha \cdot V}
\]

where `V` is the number of different words in the vocabulary. (Adding `α·V` underneath keeps the probabilities summing to 1.)

**Underflow.** A real email has hundreds of words, each with a probability like 0.01, and the product of hundreds of small numbers is smaller than the smallest float:

```python type
import numpy as np

probabilities = np.full(200, 0.01)
print("product:", np.prod(probabilities))
print("sum of logs:", np.sum(np.log(probabilities)))
```

```output
product: 0.0
sum of logs: -921.0340371976183
```

The product **underflows** to exactly 0.0, which makes every class tie. The fix is to work with logarithms: the log of a product is the sum of the logs, and sums of moderate negative numbers are no trouble. Since the logarithm only ever increases, the class with the largest log score is the class with the largest score.

Now the filter. Six spam messages and eight normal ones (called **ham** in spam-filter jargon):

```python type
import numpy as np
from collections import Counter

spam = ["win money now", "free money offer", "win a free prize now",
        "claim your free prize", "cheap offer win money", "free entry win now"]
ham = ["meeting at noon", "lunch tomorrow at noon", "project meeting moved",
       "can you send the report", "see you at lunch", "report due tomorrow",
       "call me about the project", "are you free for lunch"]

def word_counts(messages):
    counts = Counter()
    for message in messages:
        counts.update(message.split())
    return counts

counts = {"spam": word_counts(spam), "ham": word_counts(ham)}
vocab = set(counts["spam"]) | set(counts["ham"])
priors = {"spam": len(spam) / (len(spam) + len(ham)), "ham": len(ham) / (len(spam) + len(ham))}
print("vocabulary size:", len(vocab))
print("'free' in spam:", counts["spam"]["free"], " in ham:", counts["ham"]["free"])

def log_scores(message, alpha=1):
    scores = {}
    for label in ["spam", "ham"]:
        total = sum(counts[label].values())
        score = np.log(priors[label])
        for word in message.split():
            if word in vocab:
                score += np.log((counts[label][word] + alpha) / (total + alpha * len(vocab)))
        scores[label] = score
    return scores

for message in ["free lunch tomorrow", "win free money", "free prize meeting"]:
    s = log_scores(message)
    p_spam = 1 / (1 + np.exp(s["ham"] - s["spam"]))
    print(f"{message!r:<24} log scores spam {s['spam']:.2f}, ham {s['ham']:.2f}  ->  P(spam) = {p_spam:.3f}")
```

```output
vocabulary size: 30
'free' in spam: 4  in ham: 1
'free lunch tomorrow'    log scores spam -11.15, ham -9.76  ->  P(spam) = 0.200
'win free money'         log scores spam -8.15, ham -12.25  ->  P(spam) = 0.984
'free prize meeting'     log scores spam -10.05, ham -11.15  ->  P(spam) = 0.750
```

`Counter` (from the modules lesson) counts the words, and `counter.update(words)` adds a list of words to the counts. A word missing from a `Counter` counts as 0, so smoothing handles it. Words never seen in training at all are skipped: they carry no evidence either way.

"win free money" is 98% spam. "free lunch tomorrow" is only 20% spam even though "free" appears 4 times in spam and once in ham, because "lunch" and "tomorrow" are strong ham evidence; without smoothing, "lunch" alone would have forced P(spam) to 0. "free prize meeting" mixes evidence and lands at 75%.

The last line turns two log scores back into a probability. The posterior is `e^spam / (e^spam + e^ham)`; dividing top and bottom by `e^spam` gives 1/(1 + e^(ham − spam)), the sigmoid of the score difference, just as in softmax regression.

## With scikit-learn

scikit-learn splits this into two steps. `CountVectorizer` turns messages into a matrix of word counts, one row per message and one column per vocabulary word, and `MultinomialNB` is Naive Bayes for counts, with `alpha=1` smoothing by default:

```python type
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB

spam = ["win money now", "free money offer", "win a free prize now",
        "claim your free prize", "cheap offer win money", "free entry win now"]
ham = ["meeting at noon", "lunch tomorrow at noon", "project meeting moved",
       "can you send the report", "see you at lunch", "report due tomorrow",
       "call me about the project", "are you free for lunch"]

vectorizer = CountVectorizer(token_pattern=r"\S+")
X = vectorizer.fit_transform(spam + ham)
y = np.array([1] * len(spam) + [0] * len(ham))
print("count matrix shape:", X.shape)

model = MultinomialNB().fit(X, y)
new = ["free lunch tomorrow", "win free money", "free prize meeting"]
print("P(spam):", model.predict_proba(vectorizer.transform(new))[:, 1].round(3))

words = vectorizer.get_feature_names_out()
spamminess = model.feature_log_prob_[1] - model.feature_log_prob_[0]
order = np.argsort(spamminess)
print("most spam-like:", list(words[order[-5:]]))
print("most ham-like: ", list(words[order[:5]]))
```

```output
count matrix shape: (14, 30)
P(spam): [0.2   0.984 0.75 ]
most spam-like: ['prize', 'offer', 'now', 'money', 'win']
most ham-like:  ['you', 'at', 'lunch', 'meeting', 'report']
```

The probabilities match the from-scratch filter. `token_pattern=r"\S+"` tells the vectorizer to treat every run of non-space characters as a word; its default ignores one-letter words such as "a". `feature_log_prob_` holds log P(word | class) for each class, so the difference between the two rows measures how strongly each word points to spam. The model is completely transparent: it is just a table of word frequencies.

## Numeric features: Gaussian Naive Bayes

For features that are measurements rather than counts, the usual choice is to assume each feature, within each class, follows a **normal distribution** (from the distributions lesson). Training estimates, for each class and each feature, a mean and a variance; the likelihood of a new value is the normal density at that value:

\[
p(x) = \frac{1}{\sqrt{2\pi\sigma^2}} \, e^{-(x - \mu)^2 / (2\sigma^2)}
\]

where μ and σ² are that class's mean and variance for the feature. (This is the bell curve that `stats.norm.pdf` drew in the distributions lesson.) Since the classifier adds logs, what it actually uses is the log of the density, −½ ln(2πσ²) − (x − μ)²/(2σ²): a penalty for being far from the class mean, measured in units of that class's spread, plus a term that favours classes with tighter spreads. This is **Gaussian Naive Bayes**:

```python type
from sklearn.datasets import load_iris, load_wine, load_digits
from sklearn.model_selection import cross_val_score
from sklearn.naive_bayes import GaussianNB

for name, loader in [("iris", load_iris), ("wine", load_wine), ("digits", load_digits)]:
    data = loader()
    scores = cross_val_score(GaussianNB(), data.data, data.target, cv=5)
    print(f"{name:<7} {data.data.shape[1]:>2} features: mean accuracy {scores.mean():.3f}")
```

```output
iris     4 features: mean accuracy 0.953
wine    13 features: mean accuracy 0.966
digits  64 features: mean accuracy 0.807
```

On iris and wine, where each feature really is roughly bell-shaped within each class, it scores 95% and 97% with no tuning at all, and trains instantly. On the digits it drops to about 81%, well below softmax regression's 96%. Neighbouring pixels are strongly correlated, so the independence assumption is badly wrong: the model counts what is really one piece of evidence (a stroke covering several pixels) many times over. Pixel values are also far from bell-shaped: many are almost always 0.

## Why naive still works

If the independence assumption is false, why does Naive Bayes work at all? Because classification only needs the **right class to come out on top**, not accurate probabilities. Double-counting correlated evidence pushes the probabilities towards the extremes, so Naive Bayes is often wildly overconfident, printing 0.9999 where 0.8 would be honest. Before running the next cell, guess: on the digits, how confident is Gaussian Naive Bayes on average, compared with how often it is right?

```python type
import numpy as np
from sklearn.datasets import load_digits
from sklearn.model_selection import cross_val_predict
from sklearn.naive_bayes import GaussianNB

digits = load_digits()
P = cross_val_predict(GaussianNB(), digits.data, digits.target, cv=5, method="predict_proba")
confidence = P.max(axis=1)
correct = P.argmax(axis=1) == digits.target
print(f"average confidence in its chosen digit:    {confidence.mean():.3f}")
print(f"fraction actually correct:                 {correct.mean():.3f}")
print(f"predictions claiming over 99.9% certainty: {(confidence > 0.999).mean():.2f}")
```

```output
average confidence in its chosen digit:    0.988
fraction actually correct:                 0.807
predictions claiming over 99.9% certainty: 0.88
```

`cross_val_predict` is the companion of `cross_val_score`: instead of a score per fold, it returns, for every example, the prediction made by the model that did **not** train on it, here the full row of class probabilities. Each row's largest probability is the model's confidence in its choice.

It claims 98.8% confidence on average while being right 80.7% of the time, and 88% of its predictions claim more than 99.9% certainty. A calibrated model's average confidence would match its accuracy. But the double-counted evidence usually points the same way for the right class, so the ranking often survives. Use its predictions; distrust its probabilities.

Its strengths are real: training is a single pass of counting, it needs little data, it copes with tens of thousands of features (every word in a vocabulary), and it is easy to inspect. For short text with little training data it is still hard to beat.

::: challenge Bayes' rule on messages [easy]
Check that Bayes' rule and plain counting agree. Treat each message as containing a word or not (split on spaces, and match whole words).

- `p_spam_given_word(word, spam, ham)` computes P(spam | word) **by Bayes' rule**, from three easy pieces: the prior P(spam), the fraction of all messages that are spam; the likelihood P(word | spam), the fraction of spam messages containing the word; and the same for ham. The evidence is P(word | spam)·P(spam) + P(word | ham)·P(ham).
- `by_counting(word, spam, ham)` computes the same thing **directly**: among all messages containing the word, the fraction that are spam.

Store both for the word "free" in `bayes_free` and `count_free`. (Only use words that appear in at least one message.)

```python starter
spam = ["win money now", "free money offer", "win a free prize now",
        "claim your free prize", "cheap offer win money", "free entry win now"]
ham = ["meeting at noon", "lunch tomorrow at noon", "project meeting moved",
       "can you send the report", "see you at lunch", "report due tomorrow",
       "call me about the project", "are you free for lunch"]

def p_spam_given_word(word, spam, ham):
    return 0.5

def by_counting(word, spam, ham):
    return 0.5

bayes_free = p_spam_given_word("free", spam, ham)
count_free = by_counting("free", spam, ham)
print(bayes_free, count_free)
```

```python solution
spam = ["win money now", "free money offer", "win a free prize now",
        "claim your free prize", "cheap offer win money", "free entry win now"]
ham = ["meeting at noon", "lunch tomorrow at noon", "project meeting moved",
       "can you send the report", "see you at lunch", "report due tomorrow",
       "call me about the project", "are you free for lunch"]

def fraction_containing(word, messages):
    return sum(word in message.split() for message in messages) / len(messages)

def p_spam_given_word(word, spam, ham):
    prior_spam = len(spam) / (len(spam) + len(ham))
    prior_ham = 1 - prior_spam
    top = fraction_containing(word, spam) * prior_spam
    evidence = top + fraction_containing(word, ham) * prior_ham
    return top / evidence

def by_counting(word, spam, ham):
    in_spam = sum(word in message.split() for message in spam)
    in_ham = sum(word in message.split() for message in ham)
    return in_spam / (in_spam + in_ham)

bayes_free = p_spam_given_word("free", spam, ham)
count_free = by_counting("free", spam, ham)
print(bayes_free, count_free)
```

```python test
import math as _math
assert "p_spam_given_word" in dir() and "by_counting" in dir(), "Keep both function names."
_spam = ["win money now", "free money offer", "win a free prize now", "claim your free prize", "cheap offer win money", "free entry win now"]
_ham = ["meeting at noon", "lunch tomorrow at noon", "project meeting moved", "can you send the report", "see you at lunch", "report due tomorrow", "call me about the project", "are you free for lunch"]
assert _math.isclose(by_counting("free", _spam, _ham), 0.8), "'free' appears in 5 messages, 4 of them spam, so counting gives 0.8."
assert _math.isclose(by_counting("lunch", _spam, _ham), 0.0), "'lunch' appears only in ham, so counting gives 0."
assert _math.isclose(by_counting("you", _spam, _ham), 0.0), "Match whole words: 'your' in a spam message is not 'you'. Use message.split()."
for _w in ["free", "win", "lunch", "at", "offer"]:
    _c = by_counting(_w, _spam, _ham)
    assert _math.isclose(p_spam_given_word(_w, _spam, _ham), _c), f"For {_w!r}, Bayes' rule should give the same answer as counting, {_c:.3f}, but p_spam_given_word gave {p_spam_given_word(_w, _spam, _ham):.3f}. Check the prior and the evidence."
_s2, _h2 = ["a b", "a"], ["a", "b", "c", "c"]
assert _math.isclose(p_spam_given_word("a", _s2, _h2), 2 / 3), "With 2 spam and 4 ham messages, where 'a' is in both spam and one ham, P(spam | 'a') should be 2/3. Remember the prior: spam is only a third of these messages."
assert _math.isclose(bayes_free, 0.8) and _math.isclose(count_free, 0.8), "bayes_free and count_free should both be 0.8."
"SUCCESS: Bayes' rule is just counting, rearranged: the likelihoods and the prior rebuild exactly the fraction you would get by counting directly."
```

Hint: `word in message.split()` is `True` for a whole-word match, and `sum` over booleans counts the `True`s. For Bayes' rule, the top is `P(word | spam) * P(spam)`; divide by the evidence.
:::

::: challenge Smoothed word probabilities [medium]
Write a function `word_probabilities(messages, vocab, alpha)` that returns a dictionary mapping **every** word in `vocab` to its smoothed probability within those messages: `(count + alpha) / (total + alpha * len(vocab))`, where `count` is how often the word appears in `messages` and `total` is the number of words in `messages` that are in the vocabulary. The probabilities must add up to 1.

Then, using the lesson's spam messages and the vocabulary of all the messages, store the spam probability of "lunch" with `alpha=1` in `p_lunch`, and with `alpha=0` in `p_lunch_unsmoothed`.

```python starter
spam = ["win money now", "free money offer", "win a free prize now",
        "claim your free prize", "cheap offer win money", "free entry win now"]
ham = ["meeting at noon", "lunch tomorrow at noon", "project meeting moved",
       "can you send the report", "see you at lunch", "report due tomorrow",
       "call me about the project", "are you free for lunch"]
vocab = sorted({word for message in spam + ham for word in message.split()})

def word_probabilities(messages, vocab, alpha):
    return {}

p_lunch = 0.0
p_lunch_unsmoothed = 0.0
print(p_lunch, p_lunch_unsmoothed)
```

```python solution
from collections import Counter

spam = ["win money now", "free money offer", "win a free prize now",
        "claim your free prize", "cheap offer win money", "free entry win now"]
ham = ["meeting at noon", "lunch tomorrow at noon", "project meeting moved",
       "can you send the report", "see you at lunch", "report due tomorrow",
       "call me about the project", "are you free for lunch"]
vocab = sorted({word for message in spam + ham for word in message.split()})

def word_probabilities(messages, vocab, alpha):
    counts = Counter()
    for message in messages:
        counts.update(word for word in message.split() if word in vocab)
    total = sum(counts.values())
    return {word: (counts[word] + alpha) / (total + alpha * len(vocab)) for word in vocab}

p_lunch = word_probabilities(spam, vocab, 1)["lunch"]
p_lunch_unsmoothed = word_probabilities(spam, vocab, 0)["lunch"]
print(p_lunch, p_lunch_unsmoothed)
```

```python test
import math as _math
assert "word_probabilities" in dir(), "Keep the function's name as word_probabilities."
_v = ["a", "b", "c", "d"]
_p = word_probabilities(["a a b", "b a x"], _v, 1)
assert isinstance(_p, dict) and sorted(_p) == _v, "The dictionary should have an entry for every word in vocab, including words that never appear."
assert _math.isclose(_p["a"], 4 / 9) and _math.isclose(_p["d"], 1 / 9), f"For messages ['a a b', 'b a x'] with vocabulary a–d and alpha 1, 'a' should be (3+1)/(5+4) = 4/9 and 'd' (0+1)/9, but got {_p['a']:.4f} and {_p['d']:.4f}. 'x' is not in the vocabulary, so it doesn't count towards the total."
assert _math.isclose(sum(_p.values()), 1.0), "The probabilities should add up to 1."
_p2 = word_probabilities(["a a b", "b a x"], _v, 0.5)
assert _math.isclose(_p2["c"], 0.5 / 7), "With alpha 0.5, an unseen word should get 0.5 / (5 + 0.5 × 4)."
assert _math.isclose(p_lunch, 1 / 53), f"p_lunch should be 1/53 ≈ 0.0189 (0 + 1 over 23 spam words + 30 vocabulary words), but got {p_lunch}."
assert p_lunch_unsmoothed == 0, "Without smoothing, 'lunch' never appears in spam, so its probability is exactly 0."
"SUCCESS: Smoothing turns 'never seen' into 'rare', so one word can no longer veto all the others."
```

Hint: Count only words that are in the vocabulary, so the total matches. Then build the dictionary with a comprehension over `vocab`; a `Counter` gives 0 for missing words.
:::

::: challenge Gaussian Naive Bayes from scratch [hard]
Write Gaussian Naive Bayes yourself. `fit_gnb(X, y)` returns a tuple `(classes, priors, means, variances)`: the sorted class labels, each class's share of the examples, and for each class the mean and variance of every feature (arrays of shape `(number of classes, number of features)`). `predict_gnb(model, X)` returns the predicted class for each row of `X`.

For prediction, compute each class's log score: log prior plus, for each feature, the log of the normal density, which is

`-0.5 * np.log(2 * np.pi * var) - (x - mean) ** 2 / (2 * var)`

summed over the features. Predict the class with the largest score. Add a tiny `1e-9` to every variance to avoid dividing by zero. The test checks your predictions against scikit-learn's `GaussianNB` on the wine data.

```python starter
import numpy as np
from sklearn.datasets import load_wine

def fit_gnb(X, y):
    classes = np.unique(y)
    return classes, None, None, None

def predict_gnb(model, X):
    classes = model[0]
    return np.full(len(X), classes[0])

wine = load_wine()
model = fit_gnb(wine.data, wine.target)
print("training accuracy:", (predict_gnb(model, wine.data) == wine.target).mean())
```

```python solution
import numpy as np
from sklearn.datasets import load_wine

def fit_gnb(X, y):
    classes = np.unique(y)
    priors = np.array([(y == c).mean() for c in classes])
    means = np.array([X[y == c].mean(axis=0) for c in classes])
    variances = np.array([X[y == c].var(axis=0) for c in classes]) + 1e-9
    return classes, priors, means, variances

def predict_gnb(model, X):
    classes, priors, means, variances = model
    scores = np.log(priors) + (
        -0.5 * np.log(2 * np.pi * variances)[None, :, :]
        - (X[:, None, :] - means[None, :, :]) ** 2 / (2 * variances[None, :, :])
    ).sum(axis=2)
    return classes[scores.argmax(axis=1)]

wine = load_wine()
model = fit_gnb(wine.data, wine.target)
print("training accuracy:", (predict_gnb(model, wine.data) == wine.target).mean())
```

```python test
import numpy as _np
from sklearn.datasets import load_wine as _lw, load_iris as _li
from sklearn.model_selection import train_test_split as _tts
from sklearn.naive_bayes import GaussianNB as _GNB
assert "fit_gnb" in dir() and "predict_gnb" in dir(), "Keep both function names."
_w = _lw()
_m = fit_gnb(_w.data, _w.target)
assert len(_m) == 4, "fit_gnb should return (classes, priors, means, variances)."
_c, _pr, _mu, _var = _m
assert _np.allclose(_pr, _np.bincount(_w.target) / len(_w.target)), "priors should be each class's fraction of the examples."
assert _np.shape(_mu) == (3, 13) and _np.allclose(_mu[1], _w.data[_w.target == 1].mean(axis=0)), "means should have one row per class and one column per feature: the mean of each feature within each class."
assert _np.allclose(_np.asarray(_var) - 1e-9, _np.array([_w.data[_w.target == k].var(axis=0) for k in range(3)])), "variances should be each feature's variance within each class (np.var), plus 1e-9."
for _load, _seed in [(_lw, 0), (_li, 1)]:
    _d = _load()
    _Xtr, _Xte, _ytr, _yte = _tts(_d.data, _d.target, test_size=0.4, random_state=_seed)
    _mine = predict_gnb(fit_gnb(_Xtr, _ytr), _Xte)
    _theirs = _GNB().fit(_Xtr, _ytr).predict(_Xte)
    assert (_np.asarray(_mine) == _theirs).mean() >= 0.98, f"Your predictions agree with scikit-learn's GaussianNB on only {(_np.asarray(_mine) == _theirs).mean():.0%} of test points. Check the log density and that you add the log prior."
_y2 = _np.array([5, 5, 9, 9])
_X2 = _np.array([[0.0], [0.2], [3.0], [3.4]])
assert list(predict_gnb(fit_gnb(_X2, _y2), _np.array([[0.1], [3.1]]))) == [5, 9], "predict_gnb should return the class labels themselves (here 5 and 9), not their positions."
_same = (_np.array([0, 1]), _np.array([0.3, 0.7]), _np.zeros((2, 1)), _np.ones((2, 1)))
assert list(predict_gnb(_same, _np.array([[0.5]]))) == [1], "When two classes have identical means and variances, the prior should decide: add np.log(priors) to each class's score."
_spread = (_np.array([0, 1]), _np.array([0.5, 0.5]), _np.zeros((2, 1)), _np.array([[1.0], [100.0]]))
assert list(predict_gnb(_spread, _np.array([[0.0]]))) == [0], "At the shared mean, the class with the narrower spread is more likely. Include the -0.5 * np.log(2 * np.pi * var) term of the log density."
"SUCCESS: A complete classifier: one mean and one variance per class and feature, then Bayes' rule in log form."
```

Hint: In `fit_gnb`, use `X[y == c]` to select each class's rows and take `.mean(axis=0)` and `.var(axis=0)`. In `predict_gnb`, broadcasting `X[:, None, :] - means[None, :, :]` gives shape `(n, classes, features)`; sum the log densities over `axis=2`, add `np.log(priors)`, and use `classes[scores.argmax(axis=1)]`.
:::

## What you learned

- Bayes' rule turns P(evidence | hypothesis) into P(hypothesis | evidence): posterior = likelihood × prior / evidence. It is counting, rearranged.
- A Bayes classifier picks the class with the largest P(c) × P(x | c). The naive assumption, that features are independent within each class, makes P(x | c) a product of easy one-feature estimates.
- For text: a bag of words, word frequencies per class, and Laplace smoothing (add `α` to every count) so an unseen word cannot veto everything.
- Multiply probabilities by adding their logs, to avoid underflow.
- `CountVectorizer` + `MultinomialNB` do this in scikit-learn; `feature_log_prob_` shows which words point to which class.
- Gaussian Naive Bayes models each feature within each class as a normal distribution: 95–97% on iris and wine, but 81% on digits, whose pixels are strongly correlated.
- Naive Bayes is fast, transparent and good with little data, but its probabilities are usually overconfident: trust its rankings more than its numbers.

Naive Bayes and every model before it combine all the features at once. The next model asks one question about one feature at a time, like a game of twenty questions: the decision tree.
