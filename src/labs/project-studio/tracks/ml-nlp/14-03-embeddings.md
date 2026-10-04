---
title: 14.3 — Meaning, Not Just Matching: Embeddings
track: NLP — Maintenance Work Orders
runtime: none
concepts: embeddings
revisits: pca, text-features, dot-product, neural-networks, classes, testing
notebook: ml-embeddings
lab: 25
problem: To TF-IDF, "leak", "leaking", "weeping" and "dripping" are four unrelated columns. But they're used in the same kinds of note, next to the same other words. Can a program learn, from nothing but which words appear together, that they mean similar things?
---

A technician knows that an oil leak, a weeping hose, oil dripping and a puddle of oil are all the same family of problem. TF-IDF doesn't: each is a different word, a different column, and the dot product between them is zero.

But the *notes* know. "Weeping" turns up in notes with "hydraulic", "hose", "oil", "topped up". So does "leak". Words used in the same company tend to mean related things, and that can be measured. This lesson finds a handful of directions that summarise which words travel together, and represents every note, and every word, by where it sits along those directions. That's an **embedding**.

> **Embedding**: a short, dense vector of numbers representing an item (a word, a document, a product) so that items used in similar ways get similar vectors. Similarity is then measured by cosine similarity, as in lesson 14.2.
>
> *Picture it as* describing every fault not by the exact words on the ticket but by a few scores: how hydraulic it sounds, how electrical, how much like a noise problem. Two tickets with different words but the same scores are about the same kind of fault.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_embed.py provided
# Tests for embed.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_embed.py
import numpy as np
from sklearn.decomposition import TruncatedSVD

import orders

WORK_ORDERS = orders.load("data/work_orders.csv")


def model():
    import embed
    return embed.Embedding(*WORK_ORDERS, dimensions=10)


def test_every_note_becomes_ten_numbers_of_length_one():
    vectors = model().vectors
    assert vectors.shape == (400, 10)
    assert np.allclose(np.linalg.norm(vectors, axis=1), 1)


def test_the_directions_are_scikit_learns_truncated_svd():
    found = model()
    theirs = TruncatedSVD(n_components=10, algorithm="arpack").fit(found.vectorizer.transform(found.notes))
    assert np.allclose(np.abs(found.directions_), np.abs(theirs.components_), atol=1e-6)


def test_words_used_alike_end_up_close():
    found = model()
    assert {"oil", "weeping"} <= set(found.neighbours("leak"))
    assert {"grinding", "knocking"} <= set(found.neighbours("noise"))


def test_searching_by_meaning_finds_the_oil_leaks():
    results = model().top("machine leaking oil", k=4)
    assert [trade for _, _, trade, _ in results] == ["hydraulic"] * 4
    assert any("weeping" in note for _, _, _, note in results)


def test_unknown_words_find_nothing():
    assert model().top("xyz qqq") == []
```

- **`{"oil", "weeping"} <= set(...)`**: for sets, `<=` means "is contained in": both words must be among the neighbours.
- The search test asks for a note containing "weeping" among the results for "machine leaking oil", a note that shares **no word** with the query.

```check
file tests/test_embed.py -- Click "Create provided tests/test_embed.py" above.
```

## Directions of co-occurrence

Lesson 11.2 found the few directions along which ten correlated measurements varied most: the bores moving together became one component, the outer dimensions another. Do the same to the 400 × 171 TF-IDF table, and the directions are **groups of words that appear together**: one direction lights up for *hydraulic, oil, leak, weeping, hose, topped*, another for *program, crashing, backup, restored*.

The tool is the **singular value decomposition** (SVD), the method behind scikit-learn's PCA (lesson 11.2 mentioned it). It splits any table $X$ into

$$X = U\,\Sigma\,V^\top$$

where the rows of $V^\top$ are directions in word space, ordered from most important to least, and $\Sigma$ holds a **strength** for each, how much of the table it accounts for. Keep the top 10 directions and each note becomes 10 numbers: its position along each of them. Applied to word counts, this is called **latent semantic analysis** (LSA): "latent" because the directions are hidden themes nobody labelled.

> **Singular value decomposition**: the factorisation of any table into directions in its row space and column space, with a strength for each, strongest first. Keeping only the strongest few gives the best possible small approximation of the table: the same idea as keeping the top principal components.
>
> *Picture it as* summarising a year of fault tickets by a few recurring stories ("hydraulic leak", "controls crash", "spindle noise"): every ticket is mostly one or two of the stories, and every word belongs mostly to one or two.

**Where the picture stops working:** the directions aren't neatly one story each. The SVD finds directions that summarise the table best, and a direction can mix two stories or contrast them (positive for one, negative for another). Words and notes are close when they sit in the same *combination* of directions, which is why you compare whole vectors rather than read single directions.

Create `embed.py`:

```python file=embed.py
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer


def unit(rows: np.ndarray) -> np.ndarray:
    """Every row scaled to length 1 (rows of zeros stay zeros)."""
    lengths = np.linalg.norm(rows, axis=1, keepdims=True)
    return rows / np.where(lengths == 0, 1, lengths)


class Embedding:
    """Notes and words as short vectors, from the top directions of the TF-IDF table (latent semantic analysis)."""

    def __init__(self, ids: list[str], notes: list[str], trades: list[str], dimensions: int = 10):
        self.ids, self.notes, self.trades = ids, notes, trades
        self.vectorizer = TfidfVectorizer().fit(notes)
        X = self.vectorizer.transform(notes).toarray()
        _, strengths, directions = np.linalg.svd(X, full_matrices=False)
        self.directions_ = directions[:dimensions]
        self.words_ = unit((self.directions_ * strengths[:dimensions, None]).T)
        self.vectors = self.embed(notes)

    def embed(self, texts: list[str]) -> np.ndarray:
        return unit(self.vectorizer.transform(texts).toarray() @ self.directions_.T)
```

- **`np.linalg.svd(X, full_matrices=False)`** returns $U$, the strengths (as a flat array, largest first), and $V^\top$. Only the strengths and $V^\top$ are needed here, so `_` takes $U$. `full_matrices=False` skips computing parts that are never used.
- **`directions[:dimensions]`**: the top 10 rows of $V^\top$, each a direction across all 171 words.
- **`embed`**: a note's TF-IDF vector times the directions gives its position along each one: 10 numbers. **`unit`** scales them to length 1, so the dot product is cosine similarity again.
- **`self.words_`**: each **word's** embedding. Column *j* of the directions says how much word *j* takes part in each direction; weighting by the strengths and transposing gives one row of 10 numbers per word.
- **`strengths[:dimensions, None]`**: `None` makes the strengths a column, so each direction's row is multiplied by its own strength (broadcasting).

```check
run ".venv/Scripts/python -m pytest -q tests/test_embed.py -k \"length_one or truncated\"" label="every note becomes 10 numbers; the directions are scikit-learn's TruncatedSVD"
```

## Neighbours and search

Add two methods to the class (the rest of `embed.py` is unchanged):

```python file=embed.py
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer


def unit(rows: np.ndarray) -> np.ndarray:
    """Every row scaled to length 1 (rows of zeros stay zeros)."""
    lengths = np.linalg.norm(rows, axis=1, keepdims=True)
    return rows / np.where(lengths == 0, 1, lengths)


class Embedding:
    """Notes and words as short vectors, from the top directions of the TF-IDF table (latent semantic analysis)."""

    def __init__(self, ids: list[str], notes: list[str], trades: list[str], dimensions: int = 10):
        self.ids, self.notes, self.trades = ids, notes, trades
        self.vectorizer = TfidfVectorizer().fit(notes)
        X = self.vectorizer.transform(notes).toarray()
        _, strengths, directions = np.linalg.svd(X, full_matrices=False)
        self.directions_ = directions[:dimensions]
        self.words_ = unit((self.directions_ * strengths[:dimensions, None]).T)
        self.vectors = self.embed(notes)

    def embed(self, texts: list[str]) -> np.ndarray:
        return unit(self.vectorizer.transform(texts).toarray() @ self.directions_.T)

    def neighbours(self, word: str, k: int = 5) -> list[str]:
        """The k words whose embeddings point most nearly the same way as this word's."""
        vocabulary = self.vectorizer.get_feature_names_out()
        column = self.vectorizer.vocabulary_[word]
        scores = self.words_ @ self.words_[column]
        return [str(vocabulary[i]) for i in np.argsort(-scores, kind="stable")[1:k + 1]]

    def top(self, text: str, k: int = 3) -> list[tuple[float, str, str, str]]:
        """Like Search.top, but comparing embeddings instead of TF-IDF vectors."""
        scores = self.vectors @ self.embed([text])[0]
        best = np.argsort(-scores, kind="stable")[:k]
        return [(float(scores[i]), self.ids[i], self.trades[i], self.notes[i]) for i in best if scores[i] > 0]
```

- **`self.vectorizer.vocabulary_[word]`**: the vectorizer's dictionary from each word to its column number.
- **`[1:k + 1]`**: the most similar word to any word is itself (similarity 1), so skip position 0.
- **`top`** has the same shape as lesson 14.2's `Search.top`, so the two can be swapped and compared. A query with no known words embeds to all zeros, so every score is 0 and nothing is returned.

```check
run ".venv/Scripts/python -m pytest -q tests/test_embed.py" label="leak sits near weeping and oil; searching by meaning finds the oil leaks"
```

## Words and meanings

Create `meaning.py`:

```python file=meaning.py
import embed
import orders
import search

work_orders = orders.load("data/work_orders.csv")
by_words = search.Search(*work_orders)
by_meaning = embed.Embedding(*work_orders, dimensions=10)

for word in ["leak", "noise", "crashing"]:
    print(f"words used like '{word}': {', '.join(by_meaning.neighbours(word))}")

question = "machine leaking oil"
for name, engine in [("matching words", by_words), ("matching meaning", by_meaning)]:
    print(f"\n{question}, {name}:")
    for score, number, trade, note in engine.top(question, k=4):
        print(f"  {score:.2f}  {number}  {trade:<11} {note}")
```

```powershell
.venv\Scripts\python meaning.py
```

```text
words used like 'leak': under, oil, weeping, topped, up
words used like 'noise': making, strange, grinding, spindle, knocking
words used like 'crashing': program, load, restored, backup, 1050

machine leaking oil, matching words:
  0.67  WO0184  coolant     mill 5 leaking
  0.62  WO0089  controls    saw 1 leaking
  0.48  WO0208  mechanical  mill 5 leaking. replaced belt
  0.48  WO0368  electrical  mill 5 leaking. replaced relay

machine leaking oil, matching meaning:
  0.92  WO0109  hydraulic   oil leak under mill 2. topped up hydraulic oil
  0.91  WO0393  hydraulic   oil leak under compressor
  0.90  WO0254  hydraulic   mill 5 hydraulic hose weeping. topped up hydraulic oil
  0.89  WO0243  hydraulic   oil leak under lathe 3
```

- **"leak" sits near "weeping"**, though the two never appear in the same note. They're neighbours because they keep the same company: "oil", "hydraulic", "topped up". Nobody told the program they were synonyms. Likewise "noise" lands with "grinding" and "knocking", and "crashing" with "program", "backup" and alarm "1050".
- **The search by meaning** finds the oil leaks, all hydraulic, including the weeping hose, which shares no word with "machine leaking oil".

```check
run ".venv/Scripts/python meaning.py" stdout="words used like 'noise': making, strange, grinding, spindle, knocking" label="meaning.py finds words used alike and searches by meaning"
```

### The limits, and where embeddings go next

Ten numbers per note is a heavy summary, and it blurs. Search for "spindle making grinding noise" by meaning, and the top results are vague "making a strange noise" notes from several trades: the embedding knows it's a *noise* problem, but has squeezed out the detail that "spindle" and "grinding" add. Matching words finds the spindle-bearing jobs directly. Real search systems usually **combine both**: words for precision, embeddings to catch what's phrased differently.

```predict
question: The embedding learned that "leak" and "weeping" are related from 400 work orders. What would it make of "weeps", a word that's in none of them?
choice: It would place it next to "weeping"
choice: Nothing: an unseen word has no column, so it contributes nothing, exactly as in lesson 8.2
choice: It would cause an error
answer: Nothing: an unseen word has no column, so it contributes nothing, exactly as in lesson 8.2
explain: These embeddings are built from the vocabulary of this collection; a new word has no TF-IDF column and so no embedding. Modern embeddings, from neural networks trained on billions of sentences, work with pieces of words and an enormous vocabulary, so "weeps" lands near "weeping" and "leak" automatically. They are the same idea (similar use, similar vector, compared with cosine similarity) learned by a network instead of an SVD, and they're what powers today's search and language models.
```

That completes the modelling chapters of this series. You've built, from the mathematics up and checked against the libraries: linear and logistic regression, naive Bayes, nearest neighbours, trees and forests, k-means, PCA, neural networks with backpropagation, PyTorch models for images, and text search by words and by meaning. The next chapter puts models into a real application, with all the software around them that Chapters 4–6 started.
