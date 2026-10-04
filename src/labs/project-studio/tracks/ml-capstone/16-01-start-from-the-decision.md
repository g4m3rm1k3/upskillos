---
title: 16.1 — Start From the Decision: Brief, Data and the Number to Beat
track: Capstone — Your Own ML Product
trackOrder: 36
runtime: none
support: data/tool_life.csv, PROJECT.md
concepts: ml-testing
revisits: regression-metrics, cross-validation, generalization, exceptions, packages, testing
notebook: ml-capstone
lab: 33
problem: Every chapter so far handed you a problem. This one is yours. Where does a machine-learning project really start, before any model, and what do you need to know before you're allowed to train one?
---

This last chapter is a complete project from question to deployed service, done twice: once **with you**, on a worked example, and once **by you**, on a problem of your own. Each lesson builds the worked example step by step, then ends with a section, **Your own problem**, saying how to do that stage for yours.

The worked example is the kind of problem a machining cell faces every day: **how long will a cutting insert last?** A shop runs a lathe with carbide inserts. An insert that wears out mid-part scraps the part; one changed too early wastes money. Turning tests have recorded, for 240 combinations of cutting speed, feed, depth of cut, workpiece hardness and coolant, how many minutes the insert lasted before reaching its wear limit. The goal: an advisor that predicts tool life for a planned cut, and recommends the cutting speed for a tool life you want.

The order of this lesson matters more than anything in it: **decision first, data second, baseline third, model last**. Most failed ML projects fail at the first step: they build an accurate model of something nobody needed predicted.

## A new project

1. **Choose folder…** → in **Documents**, a **New folder** named `tool-life-advisor`.
2. `python -m venv .venv`
3. `requirements.txt`:

```text file=requirements.txt
pytest==9.1.1
numpy==2.5.3
scikit-learn==1.9.1
fastapi==0.142.2
uvicorn==0.54.0
httpx2==2.13.1
```

4. `.venv\Scripts\python -m pip install -r requirements.txt`

```check
run ".venv/Scripts/python -c \"import fastapi, sklearn, httpx2, pytest\"" label="FastAPI, scikit-learn, httpx2 and pytest are installed in the project's Python" -- python -m venv .venv, then .venv\Scripts\python -m pip install -r requirements.txt
```

## Read the tests first

**This step: create the supplied files and read them. No code yet.** The button also creates `data/tool_life.csv` (the 240 turning tests) and `PROJECT.md`, a project brief with blanks for you to fill.

```python file=tests/test_data.py provided
# Tests for advisor/data.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_data.py
from pathlib import Path

import pytest

from advisor import data

HEADER = "test,speed,feed,depth,hardness,coolant,tool_life\n"


def test_the_turning_tests_load():
    X, life = data.load(Path("data/tool_life.csv").read_text())
    assert X.shape == (240, 5) and life.shape == (240,)
    assert X[0].tolist() == [233, 0.13, 1.2, 180, 0.0] and life[0] == 1079.8


def test_a_cut_becomes_five_numbers_with_dry_as_1():
    assert data.to_row({"speed": "200", "feed": "0.2", "depth": "1.5", "hardness": "220", "coolant": "no"}) == [200, 0.2, 1.5, 220, 1.0]


@pytest.mark.parametrize("text, message", [
    (HEADER, "no rows"),
    (HEADER + "T1,fast,0.2,1.5,220,yes,300\n", "line 2: speed is not a number: 'fast'"),
    (HEADER + "T1,2000,0.2,1.5,220,yes,300\n", "line 2: speed 2000 is outside 20-600"),
    (HEADER + "T1,200,0.2,1.5,220,maybe,300\n", "line 2: coolant must be yes or no, not 'maybe'"),
    (HEADER + "T1,200,0.2,1.5,220,yes,-5\n", "line 2: tool life must be positive"),
    ("test,speed,feed,depth,coolant,tool_life\nT1,200,0.2,1.5,yes,300\n", "line 2: missing column: hardness"),
])
def test_bad_data_is_refused_with_a_reason(text, message):
    with pytest.raises(data.DataError) as refused:
        data.load(text)
    assert str(refused.value) == message
```

The tests follow lesson 15.1's pattern exactly: valid rows become numbers, bad files are refused with a reason that names the line. That's deliberate. The capstone reuses what the studio taught; the new work is in the decisions.

```check
file tests/test_data.py -- Click "Create provided tests/test_data.py" above.
file data/tool_life.csv
file PROJECT.md
```

## The brief

Open `PROJECT.md`. It has six sections, each a question, and every question is about the **problem**, not the model:

| section | the question | why it comes first |
|---|---|---|
| The decision | who acts on the answer, and what do they do differently? | a prediction nobody acts on is worthless, however accurate |
| The prediction | what exactly is predicted, from which inputs, when? | inputs must be known *at the moment* the answer is needed (lesson 7.4's leakage) |
| The data | where from, how much, what could be wrong? | most of the work, and most of the risk |
| The number to beat | how good is the simplest answer without ML? | lesson 8.5: an accuracy means nothing without it |
| When it's wrong | what does each kind of mistake cost; what must it never do? | lesson 8.5 again: errors aren't equal |
| Results | what it achieves, honestly measured | filled in at the end (lesson 16.4) |

> **Problem framing**: turning a business or engineering need into a precise prediction task: who decides, what is predicted, from what, when, and how success and failure are measured. It's the step that decides whether everything after it is useful.
>
> *Picture it as* the drawing before the part. A part made perfectly to the wrong drawing is scrap, and no amount of care on the machine fixes it. The brief is the drawing.

Fill in the first five sections for the tool-life advisor (leave **Results** for lesson 16.4). Write in your own words; for example, *The decision*: "The cell lead sets cutting speed for each new job, and plans insert changes so that no insert wears out mid-part." Think about *When it's wrong*: predicting **too long** a life means an insert fails mid-part (scrap, possibly a crash); predicting **too short** a life means changing inserts early (cost). Which is worse, and what does that mean for how the advisor should present its answers?

The checks only confirm that every **TODO** in those five sections has been replaced; whether the answers are good is for you, and for whoever you'd show the brief to.

```check
lacks PROJECT.md "TODO: Who will act" label="the decision is written"
lacks PROJECT.md "TODO: What exactly" label="the prediction is written"
lacks PROJECT.md "TODO: Where does the data" label="the data is described"
lacks PROJECT.md "TODO: What is the simplest" label="the number to beat is described"
lacks PROJECT.md "TODO: What happens when" label="the cost of mistakes is written"
```

## The package

```python file=advisor/__init__.py
"""The Tool Life Advisor: predicts insert life from cutting conditions, and recommends cutting speed."""
```

```check
file advisor/__init__.py
```

## Data you can trust

Create `advisor/data.py`. It's lesson 15.1's `data.py` adapted to turning tests: physical limits for each setting, `coolant` as an indicator (1 when **dry**, since running dry is the condition that changes tool life), and a positive tool life:

```python file=advisor/data.py
import csv
import io

import numpy as np

LIMITS = {"speed": (20, 600), "feed": (0.02, 1.0), "depth": (0.1, 10), "hardness": (100, 400)}


class DataError(ValueError):
    """The data can't be used, and the message says why."""


def to_row(record: dict) -> list[float]:
    """One cut as five numbers: speed (m/min), feed (mm/rev), depth (mm), hardness (HB), and 1 if dry."""
    row = []
    for name, (low, high) in LIMITS.items():
        try:
            value = float(record[name])
        except KeyError:
            raise DataError(f"missing column: {name}") from None
        except ValueError:
            raise DataError(f"{name} is not a number: {record[name]!r}") from None
        if not low <= value <= high:
            raise DataError(f"{name} {value:g} is outside {low}-{high}")
        row.append(value)
    if record.get("coolant") not in ("yes", "no"):
        raise DataError(f"coolant must be yes or no, not {record.get('coolant')!r}")
    row.append(1.0 if record["coolant"] == "no" else 0.0)
    return row


def load(text: str) -> tuple[np.ndarray, np.ndarray]:
    """The turning tests as cutting conditions and tool lives (minutes); DataError if anything is wrong."""
    X, life = [], []
    for number, record in enumerate(csv.DictReader(io.StringIO(text)), start=2):
        try:
            X.append(to_row(record))
            minutes = float(record["tool_life"])
        except (DataError, KeyError, ValueError) as error:
            raise DataError(f"line {number}: {error}") from None
        if minutes <= 0:
            raise DataError(f"line {number}: tool life must be positive")
        life.append(minutes)
    if not life:
        raise DataError("no rows")
    return np.array(X), np.array(life)
```

- **`for name, (low, high) in LIMITS.items()`**: each item is a name and a pair, and the brackets unpack the pair in the same step.
- **`except (DataError, KeyError, ValueError) as error`**: a tuple of exception types catches any of them. Whatever went wrong on a line, the message gets the line number added.
- **Tool life must be positive**: lesson 16.2 will take its logarithm, and $\log 0$ doesn't exist.

```check
run ".venv/Scripts/python -m pytest -q tests/test_data.py" label="the 240 turning tests load; bad files are refused with the line and the reason"
```

## The number to beat

Before any model: how well can you do with none? For a number, the simplest sensible answer is the **average** of past tool lives, whatever the conditions. scikit-learn calls a model like that a **dummy**. Create `baseline.py`:

```python file=baseline.py
from pathlib import Path

import numpy as np
from sklearn.dummy import DummyRegressor
from sklearn.model_selection import KFold, cross_val_score

from advisor import data

X, life = data.load(Path("data/tool_life.csv").read_text())
print(f"{len(life)} tests; tool life from {life.min():.0f} to {life.max():.0f} minutes, median {np.median(life):.0f}")
folds = KFold(n_splits=5, shuffle=True, random_state=0)
error = -cross_val_score(DummyRegressor(), X, life, cv=folds, scoring="neg_root_mean_squared_error").mean()
print(f"always the average: typical error {error:.0f} minutes")
```

**`DummyRegressor()`** ignores the inputs and predicts the training mean: a model with all the methods of a real one, so the same cross-validation (lesson 7.3) measures it.

```powershell
.venv\Scripts\python baseline.py
```

```text
240 tests; tool life from 36 to 5958 minutes, median 353
always the average: typical error 821 minutes
```

The number to beat is **821 minutes**. It's large because tool life varies enormously: from half an hour to 100 hours, depending mostly on speed. Notice too that the median (353) is far below the average (653): a few very long lives pull the average up. That lopsidedness will matter in the next lesson. Write the 821 into the brief's *The number to beat* section if you haven't already.

```check
run ".venv/Scripts/python baseline.py" stdout="always the average: typical error 821 minutes" label="baseline.py measures the number to beat"
```

```predict
question: A model gets the typical error down from 821 to 400 minutes. Is it good enough to set cutting speeds with?
choice: Yes: it halves the error
choice: That depends on the decision in the brief: an error of 400 minutes is small for a 3,000-minute insert and useless for a 100-minute one
choice: No model is ever good enough for that
answer: That depends on the decision in the brief: an error of 400 minutes is small for a 3,000-minute insert and useless for a 100-minute one
explain: "Good enough" is defined by the decision, not the metric. A typical error averaged over everything hides that inserts at high speed live only an hour or two, where a 400-minute error is meaningless. This is why the brief comes first: it tells you what to measure. For tool life, an error *relative to the life* (a percentage) matters more than minutes, which is a strong hint about the next lesson.
```

## Your own problem

Do this lesson's work for a problem you care about, in a new project folder:

1. **Copy `PROJECT.md`** and fill in the five sections for your problem *before* touching data. If you can't answer *The decision*, stop: find who would use the answer, and ask them.
2. **Find your data.** Your own measurements, records from work, or a public data set (the UCI Machine Learning Repository and OpenML have thousands; government open-data sites have more). Check that every input would really be known when the prediction is needed.
3. **Write `data.py`** with your columns, their physical or logical limits, and tests for the ways your data can be wrong. You'll learn more about the data from writing the validation than from any chart.
4. **Measure the baseline** with `DummyRegressor` (for a number) or `DummyClassifier` (for a category), and write it in the brief.

If you don't have a problem yet, carry on with tool life: the next three lessons work as a complete project on their own.
