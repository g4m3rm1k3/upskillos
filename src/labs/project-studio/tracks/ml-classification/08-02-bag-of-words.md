---
title: 8.2 — Text Becomes Numbers: Bag of Words
track: Classification — A Spam Detector
runtime: none
concepts: text-features
revisits: probability, vectors, matrices, numpy, generalization, scikit-learn
notebook: ml-naive-bayes
lab: 11
problem: Every model so far took a table of numbers. A message is a string of words of any length. How do you turn text into a row of numbers, the same width for every message, without losing what makes spam look like spam?
---

A linear model computes $\mathbf{w} \cdot \mathbf{x} + b$ (lesson 3.1). That needs every message to be a vector $\mathbf{x}$ of the same length, with each position meaning the same thing in every message. Text isn't like that: "Call me" is two words and "URGENT! You have won a holiday. Call now to claim" is ten.

The simplest answer that works surprisingly well: make a list of every word seen in training, give each word one column, and describe a message by **how many times it uses each word**. The order of the words is thrown away.

> **Bag of words**: representing a text by counting how many times each word of a fixed **vocabulary** appears in it, ignoring the order. Each text becomes a row; each vocabulary word, a column.
>
> *Picture it as* tipping a message's words into a bag and shaking it. You can still count how many *claims* and *frees* are in the bag, but not which came first. "Dog bites man" and "man bites dog" make the same bag.

**Where the picture stops working:** for spam, losing the order costs little, because spam is given away mostly by *which* words appear. For meaning ("not good" against "good"), order matters a lot, and Chapter 14 comes back to it.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_features.py provided
# Tests for messages.split and bag.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_features.py
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer

import messages

TEXTS, LABELS = messages.load("data/messages.csv")


def test_split_holds_out_a_quarter_with_the_same_share_of_spam():
    train_texts, test_texts, train_labels, test_labels = messages.split(TEXTS, LABELS)
    assert (len(train_texts), len(test_texts)) == (255, 86)
    assert (sum(train_labels), sum(test_labels)) == (64, 22)
    assert messages.split(TEXTS, LABELS)[1] == test_texts


def test_vocabulary_is_every_word_once_in_alphabetical_order():
    import bag
    assert bag.vocabulary(["Win now", "now or never, win"]) == ["never", "now", "or", "win"]


def test_bag_counts_each_word_in_its_own_column():
    import bag
    counts = bag.bag_of_words(["win win now", "hello"], ["hello", "now", "win"])
    assert counts.tolist() == [[0, 1, 2], [1, 0, 0]]


def test_bag_ignores_words_outside_the_vocabulary():
    import bag
    assert bag.bag_of_words(["win a brand new car"], ["car", "win"]).tolist() == [[1, 1]]


def test_bag_matches_scikit_learn_count_vectorizer():
    import bag
    train_texts, test_texts, _, _ = messages.split(TEXTS, LABELS)
    vocab = bag.vocabulary(train_texts)
    theirs = CountVectorizer().fit(train_texts)
    assert vocab == theirs.get_feature_names_out().tolist()
    assert np.array_equal(bag.bag_of_words(test_texts, vocab), theirs.transform(test_texts).toarray())
```

The last test says the vocabulary comes from the **training** messages only, and the test messages are counted using it. That's lesson 7.4's rule: building a vocabulary learns from data, so it's part of the model.

```check
file tests/test_features.py -- Click "Create provided tests/test_features.py" above.
```

## Hold out the test messages first

Before looking at any more of the data, set aside the test set. Add `split` to `messages.py`:

```python file=messages.py
import csv
import re

from sklearn.model_selection import train_test_split

TOKEN = re.compile(r"\b\w\w+\b")


def load(path: str) -> tuple[list[str], list[int]]:
    """The texts, and their labels as numbers: 1 for spam, 0 for ham."""
    texts, labels = [], []
    with open(path, newline="", encoding="utf-8") as file:
        for row in csv.DictReader(file):
            texts.append(row["text"])
            labels.append(1 if row["label"] == "spam" else 0)
    return texts, labels


def words(text: str) -> list[str]:
    return TOKEN.findall(text.lower())


def split(texts: list[str], labels: list[int], seed: int = 0):
    """(train texts, test texts, train labels, test labels), a quarter held out, with the same share of spam in each."""
    return train_test_split(texts, labels, test_size=0.25, random_state=seed, stratify=labels)
```

`train_test_split` is scikit-learn's version of the split you wrote in lesson 3.3. **`stratify=labels`** is new: it makes the split keep the same share of each class on both sides.

> **Stratified split**: a split that holds out the same *proportion* of every class, rather than a purely random set of rows.
>
> *Picture it as* sampling from each shift separately. If a quarter of production is night shift, a fair inspection sample is a quarter night-shift parts, not whatever a random draw happens to give.

With only 86 spam messages, a purely random quarter could easily hold out 15 spam or 28. Stratified, it holds out 22 of 86 (25.6%) and trains on 64 of 255 (25.1%): the same mix on both sides.

```check
run ".venv/Scripts/python -m pytest -q tests/test_features.py -k split" label="255 training and 86 test messages, each about a quarter spam"
```

## The vocabulary and the counts

Create `bag.py`:

```python file=bag.py
import numpy as np

from messages import words


def vocabulary(texts: list[str]) -> list[str]:
    return sorted({word for text in texts for word in words(text)})


def bag_of_words(texts: list[str], vocab: list[str]) -> np.ndarray:
    column = {word: i for i, word in enumerate(vocab)}
    counts = np.zeros((len(texts), len(vocab)))
    for row, text in enumerate(texts):
        for word in words(text):
            if word in column:
                counts[row, column[word]] += 1
    return counts
```

- **`{word for text in texts for word in words(text)}`** is a **set comprehension**: like a list comprehension, but in curly brackets, so duplicates disappear. The two `for`s read left to right like nested loops: for each text, for each word in it. `sorted` turns the set into an alphabetical list, so the columns come out in a fixed, predictable order.
- **`{word: i for i, word in enumerate(vocab)}`** is a **dictionary comprehension**: it maps each word to its column number, `{"hello": 0, "now": 1, "win": 2}`. Looking a word up in a dictionary is instant, where searching the list for it would check every entry.
- **`np.zeros((rows, columns))`** starts with a table of zeros, and each word adds 1 in its own column.
- **`if word in column`**: a test message may contain a word that never appeared in training. It has no column, so it's skipped.

Trace `bag_of_words(["win win now", "hello"], ["hello", "now", "win"])`: `column` is `{"hello": 0, "now": 1, "win": 2}`. Row 0: *win* adds 1 at column 2, *win* again makes it 2, *now* adds 1 at column 1: `[0, 1, 2]`. Row 1: *hello*, column 0: `[1, 0, 0]`.

```check
run ".venv/Scripts/python -m pytest -q tests/test_features.py -k \"vocabulary or bag\"" label="each message becomes a row of word counts, exactly as CountVectorizer makes them" -- vocabulary: sorted set of every word; bag_of_words: a zeros table, +1 in the word's column for each word that has one
```

## What the matrix looks like

Try it at the Python prompt (`.venv\Scripts\python`):

```text
>>> import bag, messages
>>> texts, labels = messages.load("data/messages.csv")
>>> train, test, train_labels, test_labels = messages.split(texts, labels)
>>> vocab = bag.vocabulary(train)
>>> len(vocab)
262
>>> X = bag.bag_of_words(train, vocab)
>>> X.shape
(255, 262)
>>> (X == 0).mean()
np.float64(0.966816344858554)
>>> train[0]
'Can you call the bank tomorrow? They need to confirm the account'
>>> [vocab[i] for i in X[0].nonzero()[0]]
['account', 'bank', 'call', 'can', 'confirm', 'need', 'the', 'they', 'to', 'tomorrow', 'you']
```

- **262 columns**: one per word seen in training. Real spam filters have tens of thousands.
- **96.7% zeros**: each message uses about 9 of the 262 words. A table that's mostly zeros is called **sparse**. `CountVectorizer` stores it in a special format that keeps only the non-zero entries (`.toarray()` in the test turns it back into an ordinary table); with a vocabulary of 50,000 words, storing every zero would waste almost all the memory.
- **`(X == 0).mean()`**: `X == 0` is a table of `True`/`False`, and the mean of `True`s (1) and `False`s (0) is the fraction that are `True`.
- **`X[0].nonzero()[0]`** gives the column numbers where row 0 isn't zero.

```predict
question: The test messages contain words that never appear in the training messages. What happens to those words in the test rows?
choice: They get new columns added at the end
choice: They are dropped: they have no column, so the model never sees them
choice: The program crashes on them
answer: They are dropped: they have no column, so the model never sees them
explain: The vocabulary is fixed when the model is trained, and a test row must have the same 262 columns as the training rows. 24 words in the test messages are new, including "loans", "lowest", "fee" and "hold". A spam message made mostly of new words ("Lowest rates on loans, approved in minutes") looks, to the model, almost empty. Watch for exactly those messages among the mistakes in the next lessons.
```

From here on, use scikit-learn's `CountVectorizer`. You've checked it builds the same vocabulary and the same counts, so `CountVectorizer().fit(train)` then `.transform(texts)` is now a shorthand for code you've written yourself.
