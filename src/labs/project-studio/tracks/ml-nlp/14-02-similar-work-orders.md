---
title: 14.2 — Has This Happened Before? Similarity Search
track: NLP — Maintenance Work Orders
runtime: none
concepts: text-features
revisits: dot-product, distance, nearest-neighbours, numpy, classes, testing
notebook: ml-embeddings
lab: 34
problem: A press is dripping hydraulic oil at 2 a.m. The fastest fix is often whatever fixed it last time. With every work order as a TF-IDF vector, how do you find the past ones most like a new note, and where does matching words let you down?
---

A maintenance technician facing an unfamiliar fault asks: *has this happened before, and what fixed it?* The answer is in the work-order history, if you can find it. Searching for an exact phrase misses notes worded differently; reading 400 notes is out of the question at 2 a.m.

With every note now a TF-IDF vector, "find similar notes" becomes "find nearby vectors": lesson 9.1's nearest neighbours, for text.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_search.py provided
# Tests for search.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_search.py
import numpy as np
from pytest import approx
from sklearn.metrics.pairwise import cosine_similarity

import orders

IDS, NOTES, TRADES = orders.load("data/work_orders.csv")


def engine():
    import search
    return search.Search(IDS, NOTES, TRADES)


def test_a_note_is_perfectly_similar_to_itself():
    assert engine().similarities(NOTES[5])[5] == approx(1.0)


def test_similarity_is_cosine_similarity():
    found = engine()
    assert np.allclose(found.similarities("oil leak"), cosine_similarity(found.vectors, found.vector("oil leak")[None])[:, 0])


def test_top_returns_the_closest_notes_best_first():
    results = engine().top("screen frozen again", k=4)
    assert [number for _, number, _, _ in results][0] == "WO0295"
    scores = [score for score, _, _, _ in results]
    assert scores == sorted(scores, reverse=True)
    assert {trade for _, _, trade, _ in results} == {"controls"}


def test_top_finds_nothing_for_words_it_has_never_seen():
    assert engine().top("xyz qqq") == []
```

- **`cosine_similarity(A, B)`** from scikit-learn gives the cosine similarity of every row of `A` with every row of `B`. `found.vector("oil leak")[None]` turns the one vector into a one-row table, and `[:, 0]` takes the single column of answers.
- The last test is about honesty: a query with no known words is similar to nothing, and a search should say so rather than return four random notes.

```check
file tests/test_search.py -- Click "Create provided tests/test_search.py" above.
```

## Similar notes point the same way

Two notes are similar when they use the same important words in similar proportions: when their TF-IDF vectors **point in the same direction**. Lesson 2.1's cosine measures exactly that:

> **Cosine similarity**: $\cos\theta = \dfrac{\mathbf{a} \cdot \mathbf{b}}{\|\mathbf{a}\|\,\|\mathbf{b}\|}$, the cosine of the angle between two vectors. 1 when they point the same way, 0 when they're at right angles (for word vectors: no words in common). Length doesn't matter, only direction.
>
> *Picture it as* comparing two parts' defect profiles by their *mix*, not their total: a part with 2 scratches and 1 dent and another with 20 scratches and 10 dents have the same profile. Cosine similarity compares the mix.

Lesson 14.1 scaled every TF-IDF row to length 1. For unit vectors the bottom of the fraction is 1 × 1, so **cosine similarity is just the dot product**. Comparing a new note with all 400 at once is then a single matrix-times-vector product: `vectors @ query`.

Why cosine and not lesson 2.1's distance? A short note and a long note about the same problem have different lengths but the same direction. On unit vectors the two measures agree anyway, ranking notes in the same order, but cosine is the convention for text because it says what's meant: *same direction*.

Create `search.py`:

```python file=search.py
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer


class Search:
    """TF-IDF search over past work orders."""

    def __init__(self, ids: list[str], notes: list[str], trades: list[str]):
        self.ids, self.notes, self.trades = ids, notes, trades
        self.vectorizer = TfidfVectorizer().fit(notes)
        self.vectors = self.vectorizer.transform(notes).toarray()

    def vector(self, text: str) -> np.ndarray:
        return self.vectorizer.transform([text]).toarray()[0]

    def similarities(self, text: str) -> np.ndarray:
        """Cosine similarity of every past note with the text: all rows have length 1, so a dot product."""
        return self.vectors @ self.vector(text)
```

- The class builds the TF-IDF vectors for every past note **once**, in `__init__`, and keeps them. Each search then costs one multiplication, not a rebuild.
- **`.toarray()[0]`**: `transform` takes a list of texts and returns a table; `[0]` takes the one row for the one query.

```check
run ".venv/Scripts/python -m pytest -q tests/test_search.py -k similar" label="a note is perfectly similar to itself, and the dot product is cosine similarity"
```

## The closest few

Add `top`:

```python file=search.py
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer


class Search:
    """TF-IDF search over past work orders."""

    def __init__(self, ids: list[str], notes: list[str], trades: list[str]):
        self.ids, self.notes, self.trades = ids, notes, trades
        self.vectorizer = TfidfVectorizer().fit(notes)
        self.vectors = self.vectorizer.transform(notes).toarray()

    def vector(self, text: str) -> np.ndarray:
        return self.vectorizer.transform([text]).toarray()[0]

    def similarities(self, text: str) -> np.ndarray:
        """Cosine similarity of every past note with the text: all rows have length 1, so a dot product."""
        return self.vectors @ self.vector(text)

    def top(self, text: str, k: int = 3) -> list[tuple[float, str, str, str]]:
        """(similarity, id, trade, note) of the k most similar past notes, best first; none that share no words."""
        scores = self.similarities(text)
        best = np.argsort(-scores, kind="stable")[:k]
        return [(float(scores[i]), self.ids[i], self.trades[i], self.notes[i]) for i in best if scores[i] > 0]
```

- **`np.argsort(-scores, kind="stable")`**: sorting the *negated* scores puts the largest first (lesson 9.1's stable sort: ties keep their original order, so results are repeatable).
- **`for i in best if scores[i] > 0`**: a list comprehension can filter as it goes; notes with a similarity of exactly 0 share no words with the query and are left out.

```check
run ".venv/Scripts/python -m pytest -q tests/test_search.py" label="search returns the closest past work orders, best first, and nothing for unknown words"
```

## Searching the history

Create `find.py`:

```python file=find.py
import orders
import search

engine = search.Search(*orders.load("data/work_orders.csv"))
for question in ["hydraulic oil dripping from the press", "screen frozen again", "machine leaking oil"]:
    print(f"\n{question}")
    for score, number, trade, note in engine.top(question, k=4):
        print(f"  {score:.2f}  {number}  {trade:<11} {note}")
```

**`search.Search(*orders.load(...))`**: `load` returns three lists, and `*` unpacks them into the three arguments of `Search`.

```powershell
.venv\Scripts\python find.py
```

```text

hydraulic oil dripping from the press
  0.84  WO0358  hydraulic   hydraulic oil dripping from press 1. topped up hydraulic oil
  0.77  WO0179  hydraulic   hydraulic oil dripping from lathe 3. topped up hydraulic oil
  0.77  WO0303  hydraulic   hydraulic oil dripping from grinder 2. topped up hydraulic oil
  0.66  WO0317  hydraulic   hydraulic oil dripping from mill 5. bled air from system

screen frozen again
  0.94  WO0295  controls    press 4 screen frozen
  0.71  WO0151  controls    mill 2 screen frozen. recalibrated axis
  0.70  WO0134  controls    press 1 screen frozen. replaced network switch
  0.69  WO0347  controls    lathe 3 screen frozen. replaced network switch

machine leaking oil
  0.67  WO0184  coolant     mill 5 leaking
  0.62  WO0089  controls    saw 1 leaking
  0.48  WO0208  mechanical  mill 5 leaking. replaced belt
  0.48  WO0368  electrical  mill 5 leaking. replaced relay
```

The first two searches work well: the right trade, and the fixes that were used (top up the oil; for a frozen screen, a network switch twice). That's a useful tool already.

The third shows the limit. "machine leaking oil" matches short, vague notes containing the word **leaking**, closed by four different trades, one fixed with a relay. Meanwhile, the history is full of notes saying "oil **leak** under the press", "hydraulic hose **weeping**", "**puddle** of oil": exactly what this technician wants, and none of them contain "leaking". To TF-IDF, *leak* and *leaking* are as unrelated as *leak* and *fuse*: different words, different columns, a dot product of zero.

```predict
question: Why do the short notes "mill 5 leaking" and "saw 1 leaking" score highest, above longer notes that also contain "leaking"?
choice: Because they were entered most recently
choice: Because their vectors are scaled to length 1, and with so few words, "leaking" carries most of that length, so they point almost the same way as a query whose main known word is "leaking"
choice: Because TF-IDF prefers short documents in general
answer: Because their vectors are scaled to length 1, and with so few words, "leaking" carries most of that length, so they point almost the same way as a query whose main known word is "leaking"
explain: Normalising to length 1 shares the length out among a note's words. In "mill 5 leaking" there are only two words ("5" is too short to count), so "leaking" gets a big share. In "mill 5 leaking. replaced belt", the share is split four ways. The query's only rare word is "leaking" ("machine" isn't in the vocabulary, and "oil" is common), so the notes most dominated by "leaking" win. A search engine that only matches words is easily led by one word.
```

```check
run ".venv/Scripts/python find.py" stdout="  0.94  WO0295  controls    press 4 screen frozen" label="find.py searches the work-order history"
```

Matching words gets you a long way, and it's what most search boxes still do. The next lesson gives the search some sense of *meaning*: a representation in which *leak*, *weeping* and *dripping* end up close together, learned from nothing but how words are used.
