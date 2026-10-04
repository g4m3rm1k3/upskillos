---
title: 14.1 — Words That Matter: TF-IDF
track: NLP — Maintenance Work Orders
trackOrder: 34
runtime: none
support: data/work_orders.csv
concepts: text-features
revisits: probability, naive-bayes, logistic-regression, cross-validation, numpy, classes, testing
notebook: ml-naive-bayes
lab: 11
problem: Four hundred maintenance work orders, each a few typed words by whoever fixed the machine. Every note says "on", most say "replaced", and only a few say "encoder". When you turn notes into numbers, should every word count the same, or should rare, specific words count for more?
---

Chapter 0 started with counting words in a text file. This chapter comes back to text with everything since: a maintenance department's **work orders**, the short notes typed when a machine breaks down and someone fixes it.

```text
grinder 2 hydraulic hose weeping. replaced o-ring on manifold
lathe 3 alarm 1050 axis following error. rehomed axes
mill 5 down
```

Each was closed by one of five trades: hydraulic, electrical, mechanical, coolant, or controls. Three jobs for this chapter:

1. **Route** a new work order to the right trade automatically.
2. **Search** past work orders for ones like a new problem: "has this happened before, and what fixed it?"
3. Make the search understand that "leak", "weeping" and "dripping" mean much the same, even when they share no letters.

This lesson improves the bag of words from lesson 8.2, which counted every word the same.

## A new project

1. **Choose folder…** → in **Documents**, a **New folder** named `work-orders`.
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

**This step: create the supplied files and read them. No code yet.** The button also creates `data/work_orders.csv`: 400 made-up work orders with their id, the trade that closed them, and the note. Some notes are as unhelpful as real ones ("mill 5 down"), on purpose.

```python file=tests/test_tfidf.py provided
# Tests for orders.py and tfidf.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_tfidf.py
import numpy as np
from pytest import approx
from sklearn.feature_extraction.text import TfidfVectorizer

SMALL = ["oil leak on mill", "oil leak on lathe", "fuse on mill"]


def test_load_reads_every_work_order():
    import orders
    ids, notes, trades = orders.load("data/work_orders.csv")
    assert len(ids) == len(notes) == len(trades) == 400
    assert (ids[0], notes[0], trades[0]) == ("WO0001", "no coolant flow on saw 1. changed coolant", "coolant")
    assert sorted(set(trades)) == ["controls", "coolant", "electrical", "hydraulic", "mechanical"]


def test_idf_is_highest_for_the_rarest_words():
    import tfidf
    model = tfidf.Tfidf().fit(SMALL)
    assert model.counter_.get_feature_names_out().tolist() == ["fuse", "lathe", "leak", "mill", "oil", "on"]
    assert model.document_frequency_.tolist() == [1, 1, 2, 2, 2, 3]
    assert tfidf.Tfidf().fit(["leak leak leak", "fuse"]).document_frequency_.tolist() == [1, 1]
    assert model.idf_ == approx([1.6931, 1.6931, 1.2877, 1.2877, 1.2877, 1.0], abs=1e-4)


def test_every_row_has_length_one():
    import tfidf
    rows = tfidf.Tfidf().fit(SMALL).transform(SMALL)
    assert np.linalg.norm(rows, axis=1) == approx([1, 1, 1])
    assert rows[2].round(4).tolist() == [0.7203, 0, 0, 0.5478, 0, 0.4254]


def test_unknown_words_give_an_empty_row_not_an_error():
    import tfidf
    assert not tfidf.Tfidf().fit(SMALL).transform(["completely new words"]).any()


def test_matches_scikit_learns_vectorizer():
    import orders, tfidf
    _, notes, _ = orders.load("data/work_orders.csv")
    assert np.allclose(tfidf.Tfidf().fit(notes).transform(notes), TfidfVectorizer().fit(notes).transform(notes).toarray())
```

`SMALL` is three notes small enough to work through by hand below. "on" is in all three; "fuse" and "lathe" are in one each. The extra line with `"leak leak leak"` checks that a word repeated within one note still counts as one note.

```check
file tests/test_tfidf.py -- Click "Create provided tests/test_tfidf.py" above.
file data/work_orders.csv
```

## Load the work orders

Create `orders.py`:

```python file=orders.py
import csv


def load(path: str) -> tuple[list[str], list[str], list[str]]:
    """(ids, notes, trades), one of each per work order."""
    ids, notes, trades = [], [], []
    with open(path, newline="", encoding="utf-8") as file:
        for row in csv.DictReader(file):
            ids.append(row["id"])
            notes.append(row["note"])
            trades.append(row["trade"])
    return ids, notes, trades
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_tfidf.py -k load" label="400 work orders from five trades"
```

## Rare words carry more information

In a bag of words, "on" counts as much as "encoder". But "on" is in 88 of the 400 notes and says nothing about which trade is needed, while "encoder" is in 13 and points straight at controls. A word that appears in nearly every document is like a gauge that always reads the same: it can't tell parts apart.

So weight each word by how **rare** it is across the collection. The usual measure:

> **Inverse document frequency** (IDF): for a word appearing in $df$ of the $n$ documents, $\text{idf} = \ln\dfrac{1 + n}{1 + df} + 1$. The rarer the word, the larger its IDF. A word in every document gets the minimum, 1.
>
> **TF-IDF**: each word's count in a document (its **term frequency**, TF) times its IDF. Then each document's row is scaled to length 1, so long and short notes are comparable.
>
> *Picture it as* how informative an inspection finding is. "Part has burrs" on every report from a shop that always leaves burrs tells you nothing; "part has porosity", seen on 2 reports in 400, tells you a lot about which process went wrong. The rarer the finding, the more it narrows things down.

Why that formula: $\frac{n}{df}$ is "one in how many documents has this word", and the log tames it, so a word in 1 of 400 documents isn't 400 times as important as one in all of them, just $\ln 400 \approx 6$ times. The $1 +$'s are **smoothing** (as in lesson 8.3): they stop a word that appears in *every* document getting an IDF of exactly 0, and the final $+1$ keeps every known word's weight positive. It's scikit-learn's default form.

Work the `SMALL` example, $n = 3$:

| word | in how many notes | idf |
|---|---|---|
| fuse, lathe | 1 | ln(4/2) + 1 = 1.6931 |
| leak, mill, oil | 2 | ln(4/3) + 1 = 1.2877 |
| on | 3 | ln(4/4) + 1 = 1.0 |

The third note, "fuse on mill", has counts fuse 1, mill 1, on 1. Times IDF: 1.6931, 1.2877, 1.0. Its length is $\sqrt{1.6931^2 + 1.2877^2 + 1^2} = 2.3505$, and dividing by that gives **0.7203, 0.5478, 0.4254**: "fuse" counts most, "on" least.

Create `tfidf.py`, using lesson 8.2's word counting (scikit-learn's `CountVectorizer`, which you checked equals your `bag.py`):

```python file=tfidf.py
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer


class Tfidf:
    def fit(self, texts: list[str]) -> "Tfidf":
        self.counter_ = CountVectorizer().fit(texts)
        counts = self.counter_.transform(texts).toarray()
        self.document_frequency_ = (counts > 0).sum(axis=0)
        self.idf_ = np.log((1 + len(texts)) / (1 + self.document_frequency_)) + 1
        return self
```

- **`(counts > 0).sum(axis=0)`**: `counts > 0` is `True` wherever a note contains a word at all (however many times), and summing down each column counts the **notes** containing each word: its document frequency.
- **`np.log`** is the natural log, ln.
- Fitting learns the vocabulary and the IDFs **from the training notes only**: they're part of the model (lesson 7.4).

```check
run ".venv/Scripts/python -m pytest -q tests/test_tfidf.py -k rarest" label="document frequencies and IDFs, highest for the rarest words" -- document_frequency_ = (counts > 0).sum(axis=0); idf_ = np.log((1 + n) / (1 + document_frequency_)) + 1
```

## Weight and normalise

Add `transform`:

```python file=tfidf.py
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer


class Tfidf:
    def fit(self, texts: list[str]) -> "Tfidf":
        self.counter_ = CountVectorizer().fit(texts)
        counts = self.counter_.transform(texts).toarray()
        self.document_frequency_ = (counts > 0).sum(axis=0)
        self.idf_ = np.log((1 + len(texts)) / (1 + self.document_frequency_)) + 1
        return self

    def transform(self, texts: list[str]) -> np.ndarray:
        weighted = self.counter_.transform(texts).toarray() * self.idf_
        lengths = np.linalg.norm(weighted, axis=1, keepdims=True)
        return weighted / np.where(lengths == 0, 1, lengths)
```

- **`* self.idf_`**: each column multiplied by its word's IDF (broadcasting, lesson 2.2).
- **`np.linalg.norm(weighted, axis=1, keepdims=True)`**: each row's length (lesson 2.1), kept as a column so the division goes row by row.
- **`np.where(lengths == 0, 1, lengths)`**: a note with no known words has length 0, and dividing by 0 would give `nan`. `np.where(condition, a, b)` picks `a` where the condition is true and `b` elsewhere, so those rows are divided by 1 instead and stay all zeros.

```check
run ".venv/Scripts/python -m pytest -q tests/test_tfidf.py" label="your TF-IDF equals scikit-learn's TfidfVectorizer on all 400 notes"
```

## Does it help?

Create `weights.py` to see the weights, then compare counts with TF-IDF for routing work orders, using lesson 7.4's pipelines and lesson 7.3's cross-validation:

```python file=weights.py
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.pipeline import make_pipeline

import orders
import tfidf

ids, notes, trades = orders.load("data/work_orders.csv")
model = tfidf.Tfidf().fit(notes)
vocabulary = list(model.counter_.get_feature_names_out())

print("word        in how many notes   idf")
for word in ["replaced", "on", "mill", "oil", "encoder", "leak", "weeping"]:
    column = vocabulary.index(word)
    print(f"{word:<12}{model.document_frequency_[column]:>18}{model.idf_[column]:>7.2f}")

note = "oil leak under mill 2"
row = model.transform([note])[0]
print(f"\n'{note}':", ", ".join(f"{vocabulary[i]} {row[i]:.2f}" for i in np.flatnonzero(row)))

folds = StratifiedKFold(n_splits=5, shuffle=True, random_state=0)
for name, features in [("word counts", CountVectorizer()), ("tf-idf", TfidfVectorizer())]:
    pipeline = make_pipeline(features, LogisticRegression(max_iter=1000))
    print(f"trade from note, {name:<12}{cross_val_score(pipeline, notes, trades, cv=folds).mean():.3f}")
```

- **`StratifiedKFold`** is lesson 7.3's shuffled `KFold`, keeping each trade's share the same in every fold (lesson 8.2's stratifying).
- **`LogisticRegression(max_iter=1000)`** with five trades instead of two: scikit-learn uses the many-class version (lesson 13.3's softmax over five scores). `max_iter` gives its solver enough steps to finish.

```powershell
.venv\Scripts\python weights.py
```

```text
word        in how many notes   idf
replaced                   133   2.10
on                          88   2.51
mill                        82   2.58
oil                         36   3.38
encoder                     13   4.35
leak                        10   4.60
weeping                      7   4.91

'oil leak under mill 2': leak 0.59, mill 0.33, oil 0.44, under 0.59
trade from note, word counts 0.922
trade from note, tf-idf      0.945
```

- "replaced" is in a third of all notes, so it's down-weighted most; "weeping" and "leak", the specific words, get about twice its weight.
- In "oil leak under mill 2", "mill" gets the least weight (0.33): it says which machine, not what's wrong. "2" isn't there at all: single characters aren't words (lesson 8.1's tokeniser).
- Routing improves from **92.2% to 94.5%** of work orders sent to the right trade, by doing nothing but reweighting the same words.

```predict
question: About 5% of work orders still go to the wrong trade. Look at notes like "mill 5 down" and "operator reports fault on saw 1". What would fix those?
choice: A bigger model
choice: Nothing the model can do: the note doesn't say what was wrong, so any trade could have closed it; the fix is a better note
choice: More TF-IDF smoothing
answer: Nothing the model can do: the note doesn't say what was wrong, so any trade could have closed it; the fix is a better note
explain: "mill 5 down" was written by whoever reported the fault, before anyone knew the cause. In this data, those generic notes were closed by every trade. No amount of modelling can recover information that isn't in the text. In practice, the fix is upstream: a work-order form that asks what was observed (noise? leak? alarm number?). As in lesson 8.3, the data limits the model more than the method does.
```

```check
run ".venv/Scripts/python weights.py" stdout="trade from note, tf-idf      0.945" label="weights.py shows the IDF weights and that TF-IDF routes more work orders correctly"
```

From here on, use scikit-learn's `TfidfVectorizer`: you've checked it computes exactly your numbers. Next, the second job: finding past work orders like a new one.
