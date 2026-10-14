---
title: 4.1 — Words as Vectors
track: Frontier — Vectors and Matrices
trackOrder: 15.04
runtime: python
support: tests/conftest.py
---

A search engine, a recommendation, a chatbot finding the right page of your documents: each one has to answer "how alike are these two pieces of text?" A computer can't compare meanings, but it can compare numbers. So the first step is to turn text into numbers, a list of them per text, in a way that keeps something of what the text says. Then "how alike" becomes arithmetic.

A list of numbers like that is a **vector**. This chapter is about vectors, and tables of them (matrices), because every model in this series is made of them: a word, an image and a game position all go into a model as vectors. In this lesson you build them from plain Python lists and measure how alike some sentences are. You'll find that the obvious measure is fooled by long sentences, and fix it with the one the industry uses, **cosine similarity**. Chapter 69 uses exactly this to search your documents for a language model.

## Read the tests first

**This step: create the supplied file and read it. No code yet.**

Click **Create provided tests/test_vectors.py**:

```python file=tests/test_vectors.py provided
# Tests for frontier.vectors (lesson 4.1): texts as lists of numbers, and how alike two of them are.
import math

import pytest

CAT = ["the", "cat", "sat", "on", "the", "mat"]
DOG = ["the", "dog", "sat", "on", "the", "log"]


def test_vocabulary_is_every_word_once_sorted():
    from frontier.vectors import vocabulary
    assert vocabulary([CAT, DOG]) == ["cat", "dog", "log", "mat", "on", "sat", "the"]


def test_counts_follow_the_word_order():
    from frontier.vectors import count_vector
    vocab = ["cat", "dog", "log", "mat", "on", "sat", "the"]
    assert count_vector(CAT, vocab) == [1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 2.0]
    assert count_vector(["zebra", "the"], vocab) == [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0]


def test_dot_multiplies_and_adds():
    from frontier.vectors import dot
    assert dot([1.0, 2.0, 3.0], [4.0, 5.0, 6.0]) == 32.0


def test_dot_refuses_mismatched_sizes():
    from frontier.vectors import dot
    with pytest.raises(ValueError):
        dot([1.0, 2.0], [1.0, 2.0, 3.0])


def test_length_is_pythagoras():
    from frontier.vectors import length
    assert length([3.0, 4.0]) == 5.0


def test_cosine_of_a_vector_with_itself_is_one():
    from frontier.vectors import cosine
    assert math.isclose(cosine([1.0, 2.0, 2.0], [1.0, 2.0, 2.0]), 1.0)


def test_cosine_ignores_how_long():
    from frontier.vectors import cosine
    assert math.isclose(cosine([1.0, 2.0], [3.0, 6.0]), 1.0)


def test_cosine_with_nothing_shared_is_zero():
    from frontier.vectors import cosine
    assert cosine([1.0, 0.0], [0.0, 2.0]) == 0.0


def test_cosine_of_zeros_raises():
    from frontier.vectors import cosine
    with pytest.raises(ValueError, match="zeros"):
        cosine([0.0, 0.0], [1.0, 2.0])
    with pytest.raises(ValueError, match="zeros"):
        cosine([1.0, 2.0], [0.0, 0.0])
```

Each test imports what it needs inside itself, as lesson 3.4's did, so the tests for the parts you've written can pass before the rest exist.

- **`vocabulary`** lists every word in any of the texts, once each, in alphabetical order.
- **`count_vector`** turns a text into a vector: one number per vocabulary word, how often that word occurs. A word that isn't in the vocabulary (`"zebra"`) is left out.
- **`dot`** and **`length`** are the two pieces of arithmetic everything else is built from, and **`cosine`**, your Your turn, puts them together.

```check
file tests/test_vectors.py -- Click "Create provided tests/test_vectors.py" above.
```

## Words become numbers

To compare two texts as lists of numbers, the lists have to line up: position 0 must mean the same word in both. So first fix a **vocabulary**, the words the vectors talk about, in an order everyone shares. Sorting makes the order easy to read and the same on every run.

`vocabulary` collects the words with a **set comprehension**: like a list comprehension, but in `{}` braces, so it builds a set and each word is kept once. It has two `for`s, read left to right, as in lesson 2.2: for each text, for each word in it. `count_vector` then reuses your `tally` from Chapter 1 and reads one count per vocabulary word, with `get` giving 0 for a word the text doesn't have. The counts are made `float`, because the arithmetic coming next divides. Create `src/frontier/vectors.py`:

```python file=src/frontier/vectors.py
"""Documents as vectors: lists of numbers that can be compared."""
from frontier.text import tally


def vocabulary(documents: list[list[str]]) -> list[str]:
    """Every word in any of the documents, once each, in alphabetical order."""
    return sorted({word for words in documents for word in words})


def count_vector(words: list[str], vocab: list[str]) -> list[float]:
    """How often each vocabulary word occurs in words, in the vocabulary's order."""
    counts = tally(words)
    return [float(counts.get(word, 0)) for word in vocab]
```

For "the cat sat on the mat" and "the dog sat on the log", the vocabulary is `cat, dog, log, mat, on, sat, the`, and the first sentence becomes `[1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 2.0]`: one cat, no dog, no log, one mat, and so on, with two of "the" at the end. The word order of the sentence is gone; only the counts are kept. That's called a **bag of words**, and it throws away a lot ("dog bites man" and "man bites dog" become the same vector). It's still enough to tell many texts apart, and Part 7 brings the order back.

```check
run ".venv/Scripts/python -m pytest -q tests/test_vectors.py -k vocabulary" label="the vocabulary is every word once, sorted" -- sorted() of a set comprehension with two fors: for words in documents for word in words.
run ".venv/Scripts/python -m pytest -q tests/test_vectors.py -k counts" label="the counts line up with the vocabulary" -- One float per vocabulary word: float(counts.get(word, 0)) for word in vocab.
run ".venv/Scripts/python -m mypy --strict src/frontier/vectors.py" stdout="Success" label="mypy --strict passes" -- vocabulary returns list[str], count_vector returns list[float].
```

## Multiply and add: the dot product

The most important operation on two vectors is the **dot product**: multiply the numbers at each position, then add up the results. For `[1, 2, 3]` and `[4, 5, 6]` it's 1×4 + 2×5 + 3×6 = 32. On count vectors it measures overlap: a position adds something only where **both** texts have that word, and adds more when both have it often.

In symbols, for vectors **a** and **b** with *n* numbers each:

**a · b** = a₁b₁ + a₂b₂ + … + aₙbₙ

The dot product only makes sense when the vectors are the same length, and plain `zip` would hide a mistake: it stops quietly at the end of the shorter list. `zip(a, b, strict=True)` raises a `ValueError` instead when the lengths differ, so a mismatched vocabulary is caught where it happens. Add `dot` at the end of `src/frontier/vectors.py`:

```python file=src/frontier/vectors.py
"""Documents as vectors: lists of numbers that can be compared."""
from frontier.text import tally


def vocabulary(documents: list[list[str]]) -> list[str]:
    """Every word in any of the documents, once each, in alphabetical order."""
    return sorted({word for words in documents for word in words})


def count_vector(words: list[str], vocab: list[str]) -> list[float]:
    """How often each vocabulary word occurs in words, in the vocabulary's order."""
    counts = tally(words)
    return [float(counts.get(word, 0)) for word in vocab]


def dot(a: list[float], b: list[float]) -> float:
    """The dot product: each pair of matching numbers multiplied, then all added up."""
    return sum(x * y for x, y in zip(a, b, strict=True))
```

The generator expression walks both vectors side by side, `x` from `a` and `y` from `b`, multiplying as it goes, and `sum` adds the products. Work one out by hand before you run anything:

```predict
question: The cat sentence is `[1, 0, 0, 1, 1, 1, 2]` and the dog sentence `[0, 1, 1, 0, 1, 1, 2]`, over `cat, dog, log, mat, on, sat, the`. What is their dot product?
choice: 2.0
choice: 4.0
choice: 6.0
choice: 8.0
answer: 6.0
explain: Only the words both sentences have add anything: on (1×1), sat (1×1) and the (2×2). That's 1 + 1 + 4 = 6.0. Notice that "the", the least interesting word, gives the most.
verify: script dot_cat_dog.py
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_vectors.py -k dot" label="dot multiplies and adds, and refuses different lengths" -- sum(x * y for x, y in zip(a, b, strict=True))
run ".venv/Scripts/python -m mypy --strict src/frontier/vectors.py" stdout="Success" label="mypy --strict still passes" -- dot takes two list[float] and returns float.
```

## Is a bigger dot product more alike?

Time to measure. This experiment compares the cat sentence with four sentences, itself included, and prints each dot product. One is nothing but "the", and one is the cat sentence written out twice. `split_words` from Chapter 1 does the splitting, and the format spec `:5.1f` means 5 characters wide with 1 decimal place, so the numbers line up. Create `experiments/compare_sentences.py`:

```python file=experiments/compare_sentences.py
"""How alike some short sentences are, measured with vectors."""
from frontier.text import split_words
from frontier.vectors import count_vector, dot, vocabulary

sentences = [
    "the cat sat on the mat",
    "the dog sat on the log",
    "the the the the",
    "the cat sat on the mat, the cat sat on the mat",
]
documents = [split_words(sentence) for sentence in sentences]
vocab = vocabulary(documents)
vectors = [count_vector(words, vocab) for words in documents]
for sentence, vector in zip(sentences, vectors):
    print(f"{dot(vectors[0], vector):5.1f}  {sentence}")
```

Every sentence's vector is built over the same vocabulary, so they all line up. Then each is dotted with `vectors[0]`, the cat sentence. Run it:

```powershell
.venv\Scripts\python experiments/compare_sentences.py
```

```text
  8.0  the cat sat on the mat
  6.0  the dog sat on the log
  8.0  the the the the
 16.0  the cat sat on the mat, the cat sat on the mat
```

Read it as a ranking and it's nonsense. "the the the the" scores as high as the sentence itself, and the doubled sentence scores **twice** as high as the sentence itself, though it says the same thing. The dot product grows with how many words a text has, not only with which words. A search ranked this way would always put the longest documents first.

```check
run ".venv/Scripts/python experiments/compare_sentences.py" stdout=" 16.0  the cat sat on the mat, the cat sat on the mat" label="the doubled sentence scores 16" -- Check that every vector is made with the same vocab, and each is dotted with vectors[0].
```

## How long a vector is

The fix needs a vector's **length**. Picture a vector with two numbers, `[3, 4]`, as an arrow from the corner of a grid: 3 along, 4 up. Its length is the arrow's length, and Pythagoras gives it: √(3² + 4²) = √25 = 5. With more numbers it's the same rule: square each one, add them up, take the square root. Squaring each number and adding up is the dot product of the vector with itself, so:

**‖v‖** = √(**v · v**)

The double bars are how length is written. `math.sqrt` is the square root. Add `import math` at the top of `src/frontier/vectors.py`, above the other import, and `length` at the end:

```python file=src/frontier/vectors.py
"""Documents as vectors: lists of numbers that can be compared."""
import math

from frontier.text import tally


def vocabulary(documents: list[list[str]]) -> list[str]:
    """Every word in any of the documents, once each, in alphabetical order."""
    return sorted({word for words in documents for word in words})


def count_vector(words: list[str], vocab: list[str]) -> list[float]:
    """How often each vocabulary word occurs in words, in the vocabulary's order."""
    counts = tally(words)
    return [float(counts.get(word, 0)) for word in vocab]


def dot(a: list[float], b: list[float]) -> float:
    """The dot product: each pair of matching numbers multiplied, then all added up."""
    return sum(x * y for x, y in zip(a, b, strict=True))


def length(v: list[float]) -> float:
    """How long the vector is as an arrow: the square root of its dot product with itself."""
    return math.sqrt(dot(v, v))
```

`length([3.0, 4.0])` is `dot` giving 9 + 16 = 25, then `math.sqrt` giving 5.0. The doubled sentence's vector has every count doubled, so its arrow points the same way and is twice as long: `length` of the cat sentence is √8, about 2.83, and of the doubled one √32, about 5.66.

```check
run ".venv/Scripts/python -m pytest -q tests/test_vectors.py -k length" label="length is Pythagoras" -- return math.sqrt(dot(v, v)), with import math at the top.
run ".venv/Scripts/python -m mypy --strict src/frontier/vectors.py" stdout="Success" label="mypy --strict still passes" -- length takes a list[float] and returns float.
```

## Your turn: cosine similarity

Here's the idea that fixes the ranking. As arrows, the cat sentence and the doubled one point in **exactly the same direction**; only their lengths differ. So compare directions, and ignore lengths. The angle between two arrows measures that: 0° means the same direction, and 90°, a right angle, means they have nothing in common. For count vectors, which never go negative, the angle is always between those two.

Rather than the angle itself, use its **cosine**, a number worked out from an angle: the cosine of 0° is 1, the cosine of 90° is 0, and in between it slides smoothly from one to the other. And there's a rule that gives the cosine of the angle between two vectors straight from the arithmetic you've built, with no angle measured at all:

**cos θ** = **a · b** / (‖**a**‖ ‖**b**‖)

θ (theta) is the usual name for an angle. Dividing by both lengths cancels out how long the vectors are: double one vector, and the dot product doubles, but so does that vector's length, and the two cancel. Try it in the figure. Each sentence is cut down to just two words, "cat" and "the", so it can be drawn as an arrow:

```figure
name: frontier/WordArrows
caption: Two sentences as arrows, counting only "cat" (along) and "the" (up). The dot product changes when you lengthen an arrow; the cosine changes only when you turn one.
props: {"words": ["cat", "the"], "a": [1, 2], "b": [0, 2]}
```

**Build, on your own:** `cosine(a, b)` at the end of `src/frontier/vectors.py`, returning the cosine of the angle between `a` and `b`, by the rule above, using your `dot` and `length`.

One case needs care. A vector of zeros (a text with none of the vocabulary's words) has length 0, so it's a point, not an arrow, and has no direction to compare. Dividing by its length would raise `ZeroDivisionError`, which says nothing useful. Instead, if either vector has length 0, raise a `ValueError` whose message contains the word `zeros`, such as `a vector of zeros has no direction`. Check this **before** dividing.

```hints
nudge: The rule is one line: dot(a, b) divided by the product of the two lengths. Before it, an if that raises when either length is 0.
concept: The brackets matter: dot(a, b) / (length(a) * length(b)). Without them, Python divides by length(a) and then multiplies by length(b). The check is if length(a) == 0 or length(b) == 0: raise ValueError(...), so both vectors are checked, not just the first.
answer: At the end of `src/frontier/vectors.py`:
~~~python
def cosine(a: list[float], b: list[float]) -> float:
    """How alike two vectors' directions are: 1 for the same direction, 0 for nothing shared."""
    if length(a) == 0 or length(b) == 0:
        raise ValueError("a vector of zeros has no direction")
    return dot(a, b) / (length(a) * length(b))
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_vectors.py -k cosine" label="cosine ignores length, and refuses zeros" -- dot(a, b) / (length(a) * length(b)), after raising ValueError("a vector of zeros has no direction") if either length is 0.
run ".venv/Scripts/python -m pytest -q tests/test_vectors.py" label="every vector test passes" -- Leave vocabulary, count_vector, dot and length as they were.
run ".venv/Scripts/python -m mypy --strict src/frontier/vectors.py" stdout="Success" label="mypy --strict still passes" -- cosine takes two list[float] and returns float.
```

## The ranking, fixed, and onto GitHub

Now give the experiment a cosine column. Import `cosine` as well, and print it after the dot product, with `:.3f` for 3 decimal places. Change `experiments/compare_sentences.py`:

```python file=experiments/compare_sentences.py
"""How alike some short sentences are, measured with vectors."""
from frontier.text import split_words
from frontier.vectors import cosine, count_vector, dot, vocabulary

sentences = [
    "the cat sat on the mat",
    "the dog sat on the log",
    "the the the the",
    "the cat sat on the mat, the cat sat on the mat",
]
documents = [split_words(sentence) for sentence in sentences]
vocab = vocabulary(documents)
vectors = [count_vector(words, vocab) for words in documents]
for sentence, vector in zip(sentences, vectors):
    print(f"{dot(vectors[0], vector):5.1f}  {cosine(vectors[0], vector):.3f}  {sentence}")
```

```predict
question: What cosine does the experiment print for the doubled sentence, "the cat sat on the mat, the cat sat on the mat"?
choice: 0.500
choice: 1.000
choice: 2.000
answer: 1.000
explain: Doubling every count doubles the dot product (8 to 16) and doubles that vector's length (√8 to √32), so the doubling cancels: 16 / (√8 × √32) = 16 / 16 = 1. Same direction, cosine 1, however long the text.
verify: script cosine_doubled.py
```

```powershell
.venv\Scripts\python experiments/compare_sentences.py
```

```text
  8.0  1.000  the cat sat on the mat
  6.0  0.750  the dog sat on the log
  8.0  0.707  the the the the
 16.0  1.000  the cat sat on the mat, the cat sat on the mat
```

The doubled sentence now ties with the sentence itself, as it should, and the dog sentence, which shares three words, now beats "the the the the", which shares one. The margin is small because "the" is in every sentence and still counts the most. Words like that carry almost no meaning, and real systems weight them down or leave them out; the vectors you build later in the series learn their numbers instead of counting them.

One more thing to notice: `1.000` is rounded. Ask Python for the doubled sentence's cosine in full and you get `0.9999999999999998`, not `1.0`, because √8 and √32 are rounded floats (lesson 2.6). That's why the tests compare cosines with `math.isclose`, never `==`.

```check
run ".venv/Scripts/python experiments/compare_sentences.py" stdout="0.750  the dog sat on the log" label="the dog sentence's cosine is 0.750" -- Import cosine, and print cosine(vectors[0], vector) with :.3f after the dot product.
```

Commit and push:

```powershell
git add .
git commit -m "Texts as count vectors, compared with the dot product and cosine similarity"
git push
```

```check
git-clean -- Something isn't committed yet. Run git status to see what.
git-pushed -- Run git push
```

### What you have

```text
src/frontier/
  vectors.py             vocabulary, count_vector, dot, length, cosine (plain Python lists)
experiments/
  compare_sentences.py   four sentences against the first: dot product and cosine
tests/
  test_vectors.py        -k vocabulary, counts, dot, length, cosine
```

Next lesson: the same vectors as NumPy arrays, properly this time, with your list versions as the answers they must agree with.
