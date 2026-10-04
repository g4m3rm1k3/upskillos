---
title: 15.1 — A Studio, Not a Script: Layers and Data Validation
track: Production ML — The Defect Studio
trackOrder: 35
runtime: none
support: data/parts.csv, data/summer_runs.csv
concepts: ml-testing
revisits: data-access-layers, web-api, ensembles, logistic-regression, cross-validation, exceptions, packages, testing
notebook: ml-sklearn-workflow
lab: 28
problem: Every model in this series lived in a script you ran yourself. A quality department wants one place where engineers upload run data, train defect models, compare them, and send live predictions to the line, without you in the loop. Where does each piece of that go, and what stops someone uploading a file that breaks everything?
---

This chapter builds the **Defect Studio**: a small, real machine-learning service for Chapter 9's injection-moulding data. Quality engineers will:

- **upload** a CSV of runs (settings and whether each failed inspection);
- **train** a model on it (logistic regression or a random forest), in the background;
- **compare** experiments by their cross-validated accuracy;
- **predict** the defect risk of runs about to start, from the line's own software;
- **watch** for the process drifting away from what the model was trained on.

Everything in it is something you've built before: FastAPI (Chapter 4), SQLite and a repository (Chapter 5), safe handling of untrusted input (Chapter 6), cross-validated models (Chapters 7–9). What's new is **putting them together so they stay manageable**.

## Layers

In Chapter 4 the whole app was one file: routes, model loading and prediction side by side. That's fine for one route. A studio with uploads, training jobs, a database, saved models and monitoring in one file would be a few hundred lines where everything can touch everything, and every change risks breaking something unrelated.

So the studio is split into **layers**, each with one job and each depending only on the layers below it:

```text
studio/
  api.py          web: turns HTTP requests into calls, and results or errors into responses  (lesson 15.4)
  services.py     what the studio does: upload, start training, predict                        (15.3)
  database.py     the SQL, and nothing else                                                    (15.3)
  artifacts.py    saving and loading trained models                                            (15.2)
  ml.py           training and scoring, with no idea there's a web app                         (this lesson)
  data.py         what valid run data looks like                                               (this lesson)
```

> **Layered architecture**: organising code so each layer handles one kind of concern and only calls the layers beneath it. The web layer knows about HTTP but not SQL; the database layer knows SQL but not HTTP; the ML layer knows neither.
>
> *Picture it as* a production line split into cells. The machining cell doesn't know how parts are packed; the packing cell doesn't know how they were machined. Each cell has a defined input and output, so one can be changed, tested or replaced without stopping the others.

The payoff comes in testing: `ml.py` can be tested with no server, no database and no files; `api.py` can be tested with the training replaced by something instant. This lesson writes the two bottom layers.

## A new project

1. **Choose folder…** → in **Documents**, a **New folder** named `defect-studio`.
2. `python -m venv .venv`
3. `requirements.txt`:

```text file=requirements.txt
pytest==9.1.1
numpy==2.5.3
scikit-learn==1.9.1
joblib==1.6.0
fastapi==0.142.2
uvicorn==0.54.0
httpx2==2.13.1
```

4. `.venv\Scripts\python -m pip install -r requirements.txt`

`joblib` would be installed anyway (scikit-learn needs it), but lesson 15.2 imports it directly, and **anything you import, you list**. If scikit-learn ever stopped depending on it, the studio would break without warning.

```check
run ".venv/Scripts/python -c \"import fastapi, sklearn, joblib, httpx2, pytest\"" label="FastAPI, scikit-learn, joblib, httpx2 and pytest are installed in the project's Python" -- python -m venv .venv, then .venv\Scripts\python -m pip install -r requirements.txt
```

## Read the tests first

**This step: create the supplied files and read them. No code yet.** The button also creates `data/parts.csv` (Chapter 9's 500 runs) and `data/summer_runs.csv` (60 newer runs, used in lesson 15.5).

```python file=tests/test_core.py provided
# Tests for studio/data.py and studio/ml.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_core.py
from pathlib import Path

import pytest

from studio import data

HEADER = "temperature,pressure,cooling,humidity,material,defect\n"
PARTS = Path("data/parts.csv").read_text()


def test_a_run_becomes_five_numbers():
    run = {"temperature": "221.5", "pressure": "1003", "cooling": "8.3", "humidity": "32", "material": "B"}
    assert data.to_row(run) == [221.5, 1003, 8.3, 32, 1.0]


@pytest.mark.parametrize("text, message", [
    (HEADER, "no rows"),
    ("temperature,pressure,cooling,humidity,material\n220,800,15,40,A\n", "missing column: defect"),
    (HEADER + "220,800,15,40,A,0\n220,hot,15,40,A,1\n", "line 3: pressure is not a number: 'hot'"),
    (HEADER + "220,800,15,40,A,0\n2200,800,15,40,A,1\n", "line 3: temperature 2200 is outside 150-300"),
    (HEADER + "220,800,15,40,C,0\n", "line 2: material must be A or B, not 'C'"),
    (HEADER + "220,800,15,40,A,0\n", "needs both good and defective runs to learn from"),
])
def test_bad_data_is_refused_with_a_reason(text, message):
    with pytest.raises(data.DataError) as refused:
        data.parse_runs(text)
    assert str(refused.value) == message


def test_good_data_parses():
    X, y = data.parse_runs(PARTS)
    assert X.shape == (500, 5) and y.sum() == 183


def test_train_reports_cross_validated_accuracy_against_the_baseline():
    from studio import ml
    X, y = data.parse_runs(PARTS)
    model, metrics = ml.train(X, y, "forest")
    assert metrics == {"accuracy": 0.814, "baseline": 0.634}
    assert model.predict_proba(X[:3]).shape == (3, 2)


def test_logistic_regression_is_the_other_kind():
    from studio import ml
    X, y = data.parse_runs(PARTS)
    assert ml.train(X, y, "logistic")[1]["accuracy"] == 0.728
    with pytest.raises(ValueError):
        ml.make_model("neural", seed=0)
```

- **`@pytest.mark.parametrize("text, message", [...])`** runs the test once for each pair in the list, with `text` and `message` set from it. Six bad files, one test function, and pytest reports each case separately.
- **`with pytest.raises(data.DataError) as refused:`** passes only if the code inside raises that exception; `refused.value` is the exception itself, and `str(...)` its message.
- Every refusal has an exact message. A message is part of what's being built: an engineer whose upload is refused needs to know which line and why.

```check
file tests/test_core.py -- Click "Create provided tests/test_core.py" above.
file data/parts.csv
file data/summer_runs.csv
```

## Rules for valid data

A model trained on bad data is a bad model that looks like a good one. A temperature typed as 2200 instead of 220, a pressure column full of text, a material code nobody's heard of: any of these, uploaded once, quietly corrupts every model trained afterwards. So the studio checks data **before** anything learns from it, and refuses with a reason.

> **Data validation**: checking that incoming data has the expected columns, types and plausible values, *before* it's used, and rejecting it with an explanation if not. In ML systems it plays the part input validation played in Chapter 6: the boundary where untrusted data is checked.
>
> *Picture it as* goods-in inspection. Material is checked against its certificate before it's released to production, because once it's been machined into parts, finding out it was the wrong grade is far more expensive.

First create the package. A folder becomes an importable **package** when it contains a file called `__init__.py` (lesson 0.3); it can be empty, but a one-line description is useful:

```python file=studio/__init__.py
"""The Defect Studio: upload run data, train defect models, serve and watch predictions."""
```

```check
file studio/__init__.py
```

## Checking every run

Now `studio/data.py`:

```python file=studio/data.py
import csv
import io

import numpy as np

FEATURES = ["temperature", "pressure", "cooling", "humidity", "material"]
LIMITS = {"temperature": (150, 300), "pressure": (300, 1500), "cooling": (1, 60), "humidity": (0, 100)}


class DataError(ValueError):
    """The data can't be used, and the message says why."""


def to_row(record: dict) -> list[float]:
    """One run's settings as five numbers, checked against what the machines can actually do."""
    row = []
    for name in FEATURES[:-1]:
        try:
            value = float(record[name])
        except KeyError:
            raise DataError(f"missing column: {name}") from None
        except ValueError:
            raise DataError(f"{name} is not a number: {record[name]!r}") from None
        low, high = LIMITS[name]
        if not low <= value <= high:
            raise DataError(f"{name} {value:g} is outside {low}-{high}")
        row.append(value)
    material = record.get("material")
    if material not in ("A", "B"):
        raise DataError(f"material must be A or B, not {material!r}")
    row.append(1.0 if material == "B" else 0.0)
    return row


def parse_runs(text: str) -> tuple[np.ndarray, np.ndarray]:
    """A CSV of runs (with a defect column) as settings and labels; DataError if anything is wrong."""
    records = list(csv.DictReader(io.StringIO(text)))
    if not records:
        raise DataError("no rows")
    if "defect" not in records[0]:
        raise DataError("missing column: defect")
    rows, labels = [], []
    for number, record in enumerate(records, start=2):
        try:
            rows.append(to_row(record))
        except DataError as error:
            raise DataError(f"line {number}: {error}") from None
        if record["defect"] not in ("0", "1"):
            raise DataError(f"line {number}: defect must be 0 or 1")
        labels.append(int(record["defect"]))
    if len(set(labels)) < 2:
        raise DataError("needs both good and defective runs to learn from")
    return np.array(rows), np.array(labels)
```

- **`class DataError(ValueError)`**: a custom exception (lesson 0.5's `ConfigError`), inheriting from `ValueError` because bad data is a bad value, so the layers above can catch exactly "the data was bad" and answer 422, without catching unrelated bugs.
- **`LIMITS`**: the range each setting can physically have. These aren't the process limits a model learns; they're the machine's capabilities, so anything outside is a typing or sensor error.
- **`raise … from None`**: re-raises as a `DataError` and hides the original `KeyError`/`ValueError`, so the message an engineer sees is the clear one.
- **`{record[name]!r}`**: `!r` formats the value with quotes (`'hot'`), so an empty or odd value is visible in the message.
- **`io.StringIO(text)`**: makes a string behave like an open file, because `csv.DictReader` reads from files and an upload arrives as text.
- **`enumerate(records, start=2)`**: line 1 is the header, so the first run is line 2, which matches what the engineer sees if they open the file in a spreadsheet.
- **The last check**: a file of only good runs (or only bad ones) can't teach anything about the difference, and training on it would "succeed" with a meaningless model.

```check
run ".venv/Scripts/python -m pytest -q tests/test_core.py -k \"five_numbers or refused or good_data\"" label="valid runs become numbers; six kinds of bad file are refused with an exact reason"
```

## Training, with no idea there's a web app

The ML layer takes arrays and returns a fitted model and its numbers. It doesn't read files, write to a database or know about HTTP. Create `studio/ml.py`:

```python file=studio/ml.py
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

KINDS = ("logistic", "forest")


def make_model(kind: str, seed: int):
    if kind == "logistic":
        return make_pipeline(StandardScaler(), LogisticRegression())
    if kind == "forest":
        return RandomForestClassifier(n_estimators=100, random_state=seed)
    raise ValueError(f"unknown model kind: {kind}")


def train(X: np.ndarray, y: np.ndarray, kind: str, seed: int = 0):
    """(fitted model, metrics): accuracy by 5-fold cross-validation, and the always-pass baseline."""
    folds = StratifiedKFold(n_splits=5, shuffle=True, random_state=seed)
    accuracy = cross_val_score(make_model(kind, seed), X, y, cv=folds).mean()
    model = make_model(kind, seed).fit(X, y)
    return model, {"accuracy": round(float(accuracy), 4), "baseline": round(float(max(y.mean(), 1 - y.mean())), 4)}
```

- **Two kinds**, as a pipeline (lesson 7.4: the scaler is fitted inside each fold) or a forest (lesson 9.4: no scaling needed).
- **`train` measures, then fits**: cross-validation estimates how well this kind of model does on runs it hasn't seen; then a final model is fitted on *all* the data, since it's the one that will be used. The reported accuracy describes the final model's kind and data size, not the final model on its own training data (which would be lesson 7.1's trap).
- **The baseline** is always reported beside the accuracy (lesson 8.5): here, 63.4% for "always pass". An accuracy means nothing without it.
- **`seed`** fixes the folds and the forest's randomness, so the same data gives the same model. Lesson 15.2 will depend on that.

```check
run ".venv/Scripts/python -m pytest -q tests/test_core.py" label="training reports cross-validated accuracy (forest 0.814, logistic 0.728) against the 0.634 baseline"
```

```predict
question: An engineer uploads a file where every run from one bad week has humidity typed as a percentage of 1 (0.45 instead of 45). Every value is between 0 and 100. What happens?
choice: The studio refuses it: the values are wrong
choice: The studio accepts it, because every value is within the limits; validation catches impossible values, not every mistake
choice: The model notices and corrects it
answer: The studio accepts it, because every value is within the limits; validation catches impossible values, not every mistake
explain: 0.45% humidity is implausible but not impossible by the LIMITS rule, so it passes. Validation is a net with a mesh size: it catches what you thought to check. Lesson 15.5's drift check would flag it afterwards (humidity far below its training mean), which is why production ML has both: rules at the door, and monitoring of what gets through.
```

The two bottom layers are done and fully tested without a server, a database or a file being written. Next: saving a trained model so it can be trusted later.
