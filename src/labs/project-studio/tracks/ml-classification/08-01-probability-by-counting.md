---
title: 8.1 — Spam or Not? Probability by Counting
track: Classification — A Spam Detector
trackOrder: 28
runtime: none
support: data/messages.csv
concepts: probability
revisits: descriptive-statistics, testing, functions
notebook: ml-probability-by-simulation
lab: 4
problem: Every model so far predicted a number. A spam filter predicts a category: spam or not. Before any model, what can simply counting messages tell you, and how do you turn "this word appears in spam" into "this message is probably spam"?
---

Every model so far has answered *how much?*: a price. Many real questions ask *which one?*: spam or not, defective or not, which of ten digits. That's **classification**, and this chapter builds a spam filter from scratch, in the same order as before: count by hand, then the mathematics, then your own model, then the library.

> **Classification**: predicting which of a fixed set of categories (**classes**) something belongs to. With two classes it's **binary** classification, and the classes are usually numbered 1 (the one you're looking for, here *spam*) and 0 (everything else, here *ham*: the traditional name for messages that aren't spam).

The first tool isn't a model at all. It's counting, and the idea that comes out of counting: **probability**.

## A new project

1. **Choose folder…** → in **Documents**, a **New folder** named `spam-detector`.
2. `python -m venv .venv`
3. `requirements.txt`:

```text file=requirements.txt
pytest==9.1.1
numpy==2.5.3
scikit-learn==1.9.1
```

4. `.venv\Scripts\python -m pip install -r requirements.txt`

```check
run ".venv/Scripts/python -c \"import sklearn, numpy, pytest\"" label="NumPy, scikit-learn and pytest are installed in the project's Python" -- python -m venv .venv, then .venv\Scripts\python -m pip install -r requirements.txt
```

## Read the tests first

**This step: create the supplied files and read them. No code yet.** The button also creates `data/messages.csv`: 341 short text messages, each labelled `spam` or `ham`. Open it and read twenty or so. (They're invented for this course, but written to look like the real thing, including some honest messages that *sound* like spam: "You won the raffle at work!")

```python file=tests/test_counting.py provided
# Tests for messages.py and counting.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_counting.py
from pytest import approx


def data():
    import messages
    return messages.load("data/messages.csv")


def test_load_reads_every_message_with_a_numeric_label():
    texts, labels = data()
    assert len(texts) == len(labels) == 341
    assert texts[0] == "Offer still stands, you can stay at ours tonight"
    assert set(labels) == {0, 1} and sum(labels) == 86


def test_words_are_lowercase_and_at_least_two_characters():
    import messages
    assert messages.words("URGENT! You've won £500, call 08001234 now") == ["urgent", "you", "ve", "won", "500", "call", "08001234", "now"]
    assert messages.words("I'm at a cafe") == ["at", "cafe"]


def test_p_spam_is_the_fraction_of_messages_that_are_spam():
    import counting
    assert counting.p_spam([1, 0, 0, 1]) == 0.5
    assert counting.p_spam(data()[1]) == approx(86 / 341)


def test_word_given_label_counts_messages_not_occurrences():
    import counting
    texts, labels = ["win win win", "hello", "win now"], [1, 1, 0]
    assert counting.p_word_given("win", 1, texts, labels) == 0.5
    assert counting.p_word_given("win", 0, texts, labels) == 1.0
    assert counting.p_word_given("claim", 1, *data()) == approx(34 / 86)


def test_counted_p_spam_given_word():
    import counting
    assert counting.p_spam_given_word("claim", *data()) == approx(34 / 45)
    assert counting.p_spam_given_word("won", *data()) == approx(15 / 38)


def test_bayes_rule_agrees_with_counting_directly():
    import counting
    texts, labels = data()
    for word in ["claim", "free", "won", "link", "now", "reply"]:
        assert counting.bayes(word, texts, labels) == approx(counting.p_spam_given_word(word, texts, labels))
```

- **`*data()`** in `p_word_given("claim", 1, *data())`: `data()` returns a pair `(texts, labels)`, and the `*` unpacks it into two separate arguments, so the call is `p_word_given("claim", 1, texts, labels)`.
- The last test checks that two quite different calculations give the same answer. That's the heart of the lesson.

```check
file tests/test_counting.py -- Click "Create provided tests/test_counting.py" above.
file data/messages.csv
```

## Messages and words

Create `messages.py`:

```python file=messages.py
import csv
import re

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
```

- **Labels become numbers**, 1 and 0, because the mathematics in this chapter adds and multiplies them. `sum(labels)` is then simply the number of spam messages.
- **`encoding="utf-8"`**: the file contains `£`. Saying which encoding a text file uses, rather than leaving it to the computer's default (which differs between Windows and macOS), means it reads the same everywhere.
- **`TOKEN`** is a **regular expression** (lesson 0.2): `\w` is one "word character" (a letter, digit or `_`), `\w+` one or more of them, and `\b` a word **b**oundary. So `\b\w\w+\b` matches whole words at least two characters long. Single letters like `I` and `a` are dropped, and `You've` splits at the apostrophe into `you` and `ve`.

Splitting text into pieces like this is **tokenisation**, and the pieces are **tokens**. This rule isn't the only possible one. It's chosen because it's exactly scikit-learn's default, which lesson 8.2 relies on.

```check
run ".venv/Scripts/python -m pytest -q tests/test_counting.py -k \"load or words\"" label="341 messages load with labels 1 and 0; words are lowercase tokens"
```

## Probability is a fraction

> **Probability**: a number from 0 to 1 saying how often something happens, out of all the cases that could happen. When every message is equally likely to be picked, the probability that a picked message is spam is just (number of spam messages) ÷ (number of messages). It's written $P(\text{spam})$.
>
> *Picture it as* a reject rate. If 86 parts in a batch of 341 are rejects, a part pulled at random has a 86/341 ≈ 0.25 chance of being a reject: the rate *is* the probability.

Two more ideas, both still just fractions:

> **Conditional probability**: the probability of something *given* that something else is true, written $P(A \mid B)$ and read "the probability of A given B". You count only the cases where B is true, and ask what fraction of *those* have A.
>
> *Picture it as* a reject rate for one machine. "The reject rate, given the part came from machine 3" ignores every part from the other machines: same counting, smaller batch.

So two different questions about the word *claim*:

- $P(\text{claim} \mid \text{spam})$: of the **spam** messages, what fraction contain *claim*?
- $P(\text{spam} \mid \text{claim})$: of the messages **containing *claim***, what fraction are spam?

They sound alike and are completely different numbers. The second is the one a spam filter needs. Create `counting.py`:

```python file=counting.py
from messages import words


def p_spam(labels: list[int]) -> float:
    return sum(labels) / len(labels)


def p_word_given(word: str, label: int, texts: list[str], labels: list[int]) -> float:
    """P(word | label): the fraction of messages with this label that contain the word."""
    with_label = [text for text, l in zip(texts, labels) if l == label]
    return sum(word in words(text) for text in with_label) / len(with_label)


def p_spam_given_word(word: str, texts: list[str], labels: list[int]) -> float:
    """P(spam | word), counted directly: of the messages containing the word, the fraction that are spam."""
    containing = [l for text, l in zip(texts, labels) if word in words(text)]
    return sum(containing) / len(containing)
```

- **`zip(texts, labels)`** pairs each text with its label (lesson 7.3), and the list comprehension keeps only the ones you want.
- **`sum(word in words(text) for text in with_label)`** adds up `True`s and `False`s. In Python, `True` counts as 1 and `False` as 0, so the sum is the number of messages containing the word. A message saying "win win win" counts **once**: the question is *which messages contain it*, not how many times.
- **`sum(containing)`**: `containing` is a list of labels, 1s and 0s, so its sum is the number of spam messages among them.

```check
run ".venv/Scripts/python -m pytest -q tests/test_counting.py -k \"p_spam_is or word_given or counted\"" label="probabilities are fractions of messages, counted directly"
```

Now predict, before the next step prints it:

```predict
question: 15 of the 86 spam messages contain the word "won", and 23 of the 255 ham messages do. If a message contains "won", is it more likely spam or ham?
choice: Spam: "won" is a typical spam word
choice: Ham: more of the messages containing "won" are ham
answer: Ham: more of the messages containing "won" are ham
explain: P(won | spam) = 15/86 ≈ 0.17 is about twice P(won | ham) = 23/255 ≈ 0.09, so "won" is twice as common *in* spam. But there's three times as much ham, so the ham messages containing "won" (23) outnumber the spam ones (15). P(spam | won) = 15/38 ≈ 0.39: more likely ham. Forgetting how common each class is to begin with is called neglecting the base rate, and it's one of the most common errors in reasoning about probability, by people and by models.
```

## Bayes' rule: turning one around into the other

Counting $P(\text{spam} \mid \text{word})$ directly works for one word. But a message has many words, and almost no other message in the data has *exactly* that combination, so there's nothing to count. What you *can* estimate for each word separately is $P(\text{word} \mid \text{spam})$. **Bayes' rule** turns one into the other:

$$P(\text{spam} \mid \text{word}) = \frac{P(\text{word} \mid \text{spam})\; P(\text{spam})}{P(\text{word})}$$

where the bottom line adds up the two ways a message can contain the word, from spam or from ham:

$$P(\text{word}) = P(\text{word} \mid \text{spam})\,P(\text{spam}) + P(\text{word} \mid \text{ham})\,P(\text{ham})$$

Why it's true, in counts rather than symbols: $P(\text{word} \mid \text{spam}) \times P(\text{spam})$ is (spam with the word ÷ spam) × (spam ÷ all) = (spam with the word ÷ all). The bottom line is likewise (all messages with the word ÷ all). Divide, and "÷ all" cancels: (spam with the word) ÷ (messages with the word). Exactly the direct count.

> **Bayes' rule**: a formula for reversing a conditional probability, $P(A \mid B)$ from $P(B \mid A)$, using how common A is to begin with ($P(A)$, the **prior**). The answer, $P(A \mid B)$, is the **posterior**: the belief *after* seeing B.
>
> *Picture it as* an inspection alarm. A sensor beeps for 95% of cracked parts, and false-alarms on 5% of good ones. Cracks are rare: 1 part in 100. When it beeps, is the part cracked? Out of 10,000 parts: 100 cracked, 95 beeps; 9,900 good, 495 false beeps. Of 590 beeps, only 95 are cracks: **16%**. A good sensor, and still most of its alarms are false, because good parts are so common.

**Where the picture stops working:** in the alarm, you knew the 1-in-100 crack rate from outside. For messages, $P(\text{spam})$ is measured from *this* data set. If tomorrow's inbox has a different mix, the prior is wrong, and so is every posterior computed with it.

Add `bayes` to `counting.py`:

```python file=counting.py
from messages import words


def p_spam(labels: list[int]) -> float:
    return sum(labels) / len(labels)


def p_word_given(word: str, label: int, texts: list[str], labels: list[int]) -> float:
    """P(word | label): the fraction of messages with this label that contain the word."""
    with_label = [text for text, l in zip(texts, labels) if l == label]
    return sum(word in words(text) for text in with_label) / len(with_label)


def p_spam_given_word(word: str, texts: list[str], labels: list[int]) -> float:
    """P(spam | word), counted directly: of the messages containing the word, the fraction that are spam."""
    containing = [l for text, l in zip(texts, labels) if word in words(text)]
    return sum(containing) / len(containing)


def bayes(word: str, texts: list[str], labels: list[int]) -> float:
    """P(spam | word) from Bayes' rule."""
    spam = p_spam(labels)
    word_if_spam = p_word_given(word, 1, texts, labels)
    word_if_ham = p_word_given(word, 0, texts, labels)
    p_word = word_if_spam * spam + word_if_ham * (1 - spam)
    return word_if_spam * spam / p_word
```

`1 - spam` is $P(\text{ham})$: a message is either spam or ham, so the two probabilities add up to 1.

```check
run ".venv/Scripts/python -m pytest -q tests/test_counting.py" label="Bayes' rule gives exactly the counted answer for every word" -- p_word = word_if_spam * spam + word_if_ham * (1 - spam); return word_if_spam * spam / p_word
```

## What the words say

Create `explore.py`:

```python file=explore.py
import counting
import messages

texts, labels = messages.load("data/messages.csv")
print(f"{len(texts)} messages, {sum(labels)} spam: P(spam) = {counting.p_spam(labels):.3f}")
print("word      P(word|spam)  P(word|ham)  P(spam|word)")
for word in ["claim", "free", "now", "won", "reply", "link", "call"]:
    print(f"{word:<9} {counting.p_word_given(word, 1, texts, labels):>12.3f} {counting.p_word_given(word, 0, texts, labels):>12.3f}"
          f" {counting.bayes(word, texts, labels):>13.3f}")
```

```powershell
.venv\Scripts\python explore.py
```

```text
341 messages, 86 spam: P(spam) = 0.252
word      P(word|spam)  P(word|ham)  P(spam|word)
claim            0.395        0.043         0.756
free             0.337        0.078         0.592
now              0.453        0.024         0.867
won              0.174        0.090         0.395
reply            0.291        0.110         0.472
link             0.174        0.004         0.938
call             0.209        0.071         0.500
```

What decides $P(\text{spam} \mid \text{word})$ is the **ratio** of the first two columns, weighed against the prior of 0.252. *now* appears in 45% of spam and only 2.4% of ham, a ratio of about 19, which overwhelms spam being the minority: 0.867. *won* has a ratio of only about 2, not enough to overcome three-to-one odds in favour of ham.

No single word decides. *link* comes close (0.938), but one ham message contains it too. A filter needs to combine the evidence from **every** word in a message, and that's what the next two lessons build: first turning messages into numbers a model can use, then a model that combines the words with Bayes' rule.

```check
run ".venv/Scripts/python explore.py" stdout="won              0.174        0.090         0.395" label="explore.py prints each word's evidence"
```
