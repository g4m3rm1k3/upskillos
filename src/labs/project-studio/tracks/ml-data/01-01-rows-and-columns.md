---
title: 1.1 — Rows, Columns and Missing Values
track: Data — Dataset Explorer
trackOrder: 21
runtime: none
support: data/houses.csv
concepts: tabular-data, categorical-data, missing-values
revisits: virtual-environments, packages, testing, exceptions, command-line
notebook: py-files-and-text, ml-exploring-a-dataset
lab: 2
problem: Every model in this series learns from a table of examples. What does that table look like to a program, and what goes wrong when you read it?
---

Machine learning learns from **examples**. To predict the price of a house, a model looks at houses whose prices are known: their size, their age, how many bedrooms, which neighbourhood. Those examples almost always arrive as a **table**, usually a CSV file, and the first job in any ML project is to read the table correctly and understand what's in it.

This chapter builds a **dataset explorer**: a command-line tool, structured like `textstats`, that loads a CSV and answers questions about it. You'll build it by hand first, with plain Python lists and dictionaries, then rebuild it with **pandas**, the library almost every data scientist uses. By then you'll know exactly what pandas is doing for you, and where its answers differ from yours.

The dataset is 48 houses, and it's the same data your first model will learn from in Chapter 3.

## A new project

Make a new project folder, the same way as in lesson 0.1:

1. **Choose folder…** → in **Documents**, make a **New folder** named `dataset-explorer` → **Select Folder**.
2. Make its environment: `python -m venv .venv`
3. Create `requirements.txt` with the one package you need so far:

```text file=requirements.txt
pytest==9.1.1
```

4. Install it: `.venv\Scripts\python -m pip install -r requirements.txt`

If any of these steps feels unfamiliar, lesson 0.1 explains each one. You'll set up enough projects in this series that it becomes automatic, which is the point.

```check
run ".venv/Scripts/python -c \"import sys; assert sys.prefix != sys.base_prefix\"" label=".venv contains a working virtual environment" -- In the terminal, inside dataset-explorer: python -m venv .venv
run ".venv/Scripts/python -c \"import pytest\"" label="pytest is installed in the project's Python" -- .venv\Scripts\python -m pip install -r requirements.txt
```

## Read the tests first

**This step: create the supplied files and read them. No code yet.**

Click **Create provided tests/test_dataset.py** above. It also creates `data/houses.csv`, the dataset. Open the CSV first. Its first lines:

```text
id,neighbourhood,bedrooms,sqft,age,garage,price
1,Oldtown,3,1540,54,no,199000
2,Hillcrest,2,1350,28,yes,285500
3,Hillcrest,2,1370,31,no,266000
```

**CSV** means *comma-separated values*. The first line is the **header**: the column names. Every other line is one **row**: one house, its values in the same order as the names, separated by commas.

This is the shape of nearly all data a model learns from, and it comes with vocabulary you'll use for the rest of the series:

| Word | Means | Here |
|---|---|---|
| **observation** (row, example, sample) | one thing that was measured | one house |
| **feature** (column, variable) | one thing measured about each | `sqft`, `age`, `neighbourhood` |
| **target** (label) | the feature you want to predict | `price` |
| **numerical** feature | a quantity: arithmetic on it means something | `sqft`, `bedrooms`, `age` |
| **categorical** feature | a category: one of a fixed set of names | `neighbourhood`, `garage` |
| **missing value** | a measurement nobody recorded | the empty `age` of house 6 |

`id` is neither feature nor target: it's a name for each row. A model that learned from `id` would be learning which row of the file a house was in, which predicts nothing.

> **Feature** and **target**: the measured inputs a model is allowed to look at, and the one quantity it has to predict from them.
>
> *Picture it as* an inspection record. The features are the things you can measure on a part before final test (dimensions, weight, which machine made it); the target is the final test result you'd like to predict without running the test.

Now the tests:

```python file=tests/test_dataset.py provided
# Tests for explorer/dataset.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_dataset.py
from pathlib import Path

import pytest

from explorer import dataset

HOUSES = Path(__file__).resolve().parent.parent / "data" / "houses.csv"
FIRST = {"id": "1", "neighbourhood": "Oldtown", "bedrooms": "3", "sqft": "1540", "age": "54", "garage": "no", "price": "199000"}


def test_raw_rows_are_dictionaries_of_text():
    rows = dataset.load_rows(HOUSES)
    assert len(rows) == 48, "48 houses; the header is not a row"
    assert rows[0] == FIRST


def test_raw_keeps_header_order():
    assert list(dataset.load_rows(HOUSES)[0]) == ["id", "neighbourhood", "bedrooms", "sqft", "age", "garage", "price"]


def test_typed_converts_numbers():
    assert dataset.typed(FIRST) == {"id": 1, "neighbourhood": "Oldtown", "bedrooms": 3, "sqft": 1540,
                                    "age": 54, "garage": "no", "price": 199000}


def test_typed_turns_empty_cells_into_none():
    row = dataset.typed({**FIRST, "age": "", "garage": ""})
    assert row["age"] is None
    assert row["garage"] is None


def test_typed_names_the_column_of_a_bad_value():
    with pytest.raises(ValueError, match="sqft"):
        dataset.typed({**FIRST, "sqft": "big"})


def test_load_dataset_types_every_row():
    rows = dataset.load_dataset(HOUSES)
    assert rows[0]["price"] == 199000
    assert max(row["price"] for row in rows) == 441500


def test_column_lists_one_value_per_row():
    rows = dataset.load_dataset(HOUSES)
    assert dataset.column(rows, "bedrooms")[:3] == [3, 2, 2]
    assert dataset.column(rows, "age")[5] is None, "house 6 has no recorded age"
    assert len(dataset.column(rows, "age")) == 48


def test_missing_counts_every_column():
    rows = dataset.load_dataset(HOUSES)
    assert dataset.missing_counts(rows) == {"id": 0, "neighbourhood": 0, "bedrooms": 0, "sqft": 0,
                                            "age": 3, "garage": 2, "price": 0}


def test_kind_of_each_column():
    assert dataset.kind("sqft") == "numerical"
    assert dataset.kind("price") == "numerical"
    assert dataset.kind("neighbourhood") == "categorical"
    assert dataset.kind("garage") == "categorical"
```

Two things to notice:

- **`HOUSES` is built from `__file__`.** Every module has a `__file__` variable holding the path of its own file. `.resolve()` makes it absolute, `.parent` is the folder it's in (`tests`), and `.parent` again is the project folder. So the tests find `data/houses.csv` relative to *where they are*, not relative to wherever pytest was started: lesson 0.1's `open("data.txt")` problem, solved from the start this time.
- **`{**FIRST, "age": ""}`** builds a new dictionary: everything in `FIRST`, then `"age"` replaced. Each test makes the exact row it needs from one known-good row.

```check
file tests/test_dataset.py -- Click "Create provided tests/test_dataset.py" above.
file data/houses.csv -- The same button creates data/houses.csv.
```

## Start the package

The explorer will be a package from the start, like `textstats` became. This time you know why before you need it. Create `explorer/__init__.py`:

```python file=explorer/__init__.py
"""Load a CSV dataset and answer questions about it."""

__version__ = "0.1.0"
```

```check
run ".venv/Scripts/python -c \"import explorer; print(explorer.__version__)\"" stdout="0.1.0" label="the explorer package imports"
```

## Read the rows

Python's standard library reads CSV files with the `csv` module. Create `explorer/dataset.py`:

```python file=explorer/dataset.py
import csv
from pathlib import Path


def load_rows(path: str | Path) -> list[dict[str, str]]:
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))
```

What Python does:

1. `open(path, newline="", encoding="utf-8")` opens the file as UTF-8 text (lesson 0.4). `newline=""` is what the `csv` documentation asks for: it tells Python to hand line endings to the csv reader untouched, because a quoted CSV value may itself contain a line break, and only the csv reader can tell which line breaks end a row.
2. `csv.DictReader(f)` reads the first line as the header. Then, for each later line, it splits the line at commas (respecting quotes: `"Smith, J."` is one value) and **zips** the values with the header names into a dictionary: `{"id": "1", "neighbourhood": "Oldtown", …}`.
3. `list(...)` collects every row. The `return` is inside `with`, so the file is closed after the list is built.

So a dataset is now a **list of dictionaries**: one dictionary per row, keyed by column name. Dictionaries keep their keys in insertion order, which is why the second test can check the column order.

Look at it at the prompt, predicting each answer first:

```text
>>> from explorer import dataset
>>> rows = dataset.load_rows("data/houses.csv")
>>> len(rows)
48
>>> rows[0]["sqft"]
'1540'
>>> rows[5]["age"]
''
>>> type(rows[0]["price"])
<class 'str'>
```

`rows[0]` is the first house's dictionary; `rows[0]["sqft"]` is the value stored under `"sqft"` in it. The quotes around `'1540'` are the clue to the next step: it's text, not a number. And house 6's age (`rows[5]`, since counting starts at 0) is an empty string.

```check
run ".venv/Scripts/python -m pytest -q tests/test_dataset.py -k raw" label="load_rows reads every row as a dictionary" -- return list(csv.DictReader(f)) inside the with block.
```

## Everything is text

Every value in those rows is a **string**: `"199000"`, not `199000`. A CSV file is text, and `csv` has no way to know that `price` holds numbers. Ask the data a simple question:

```powershell
.venv\Scripts\python -c "from explorer import dataset; rows = dataset.load_rows('data/houses.csv'); print(max(r['price'] for r in rows))"
```

```predict
question: The most expensive house costs 441500. What does max() of the price column print, while the prices are still strings?
choice: 441500
choice: 84000
choice: An error: max() can't compare strings
answer: 84000
explain: Strings compare **character by character**, like words in a dictionary. "84000" starts with "8", which comes after "4" (and every other first digit in this column), so as text it's the "largest" price, though as a number it's the smallest. No error, no warning: Python compared exactly what you gave it.

Most bugs in data code look like this. The program runs and produces a confident wrong answer, because the data wasn't what the code assumed.
```

The fix is to decide, once, what type each column is: a **schema**. Add it to `explorer/dataset.py`:

```python file=explorer/dataset.py
import csv
from pathlib import Path

Value = int | str | None
Row = dict[str, Value]

SCHEMA = {
    "id": int,
    "neighbourhood": str,
    "bedrooms": int,
    "sqft": int,
    "age": int,
    "garage": str,
    "price": int,
}


def load_rows(path: str | Path) -> list[dict[str, str]]:
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def typed(raw: dict[str, str]) -> Row:
    row = {}
    for name, text in raw.items():
        if text == "":
            row[name] = None
            continue
        convert = SCHEMA[name]
        try:
            row[name] = convert(text)
        except ValueError:
            raise ValueError(f"column {name!r}: {text!r} is not a valid {convert.__name__}") from None
    return row
```

- **`Value = int | str | None`** and **`Row = dict[str, Value]`** are **type aliases**: names for types, so signatures stay readable. A row maps column names to an int, a string, or nothing.
- **`SCHEMA`** maps each column name to a **function that converts text**: `int` and `str` are functions too. `int("1540")` is `1540`; `str("Oldtown")` is unchanged. Storing functions in a dictionary and calling them later is ordinary Python, and it means the conversion rule for each column lives in one table.

  > **Schema**: the agreed description of a dataset's columns: their names, their types, and which values are allowed. *Picture it as* the spec sheet that comes with a batch of parts: it says what each measurement is and in what units, so nobody has to guess from the numbers.
- **An empty cell becomes `None`.** Python's way of saying "no value". Not `0`: a house with an unknown age is not a new house, and if missing ages became `0`, the average age would quietly drop.

  *Picture it as* an inspection sheet with a box left blank because the gauge was out for calibration. Writing "0" in that box would be a lie that looks like a measurement; leaving it visibly blank tells everyone downstream that it's unknown.
- **A bad value raises `ValueError` naming the column.** `int("big")` fails with `invalid literal for int() with base 10: 'big'`, which doesn't say *where*. Re-raising with the column name turns it into something a person can fix. `from None` hides the original exception, because the new message already says everything in it.

```check
run ".venv/Scripts/python -m pytest -q tests/test_dataset.py -k typed" label="typed converts numbers, empties become None, bad values name their column" -- An empty string must become None, checked before converting.
```

## The whole dataset, typed

Now combine the two, and add the first questions you can ask of a dataset. Update `explorer/dataset.py`:

```python file=explorer/dataset.py
import csv
from pathlib import Path

Value = int | str | None
Row = dict[str, Value]

SCHEMA = {
    "id": int,
    "neighbourhood": str,
    "bedrooms": int,
    "sqft": int,
    "age": int,
    "garage": str,
    "price": int,
}


def load_rows(path: str | Path) -> list[dict[str, str]]:
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def typed(raw: dict[str, str]) -> Row:
    row = {}
    for name, text in raw.items():
        if text == "":
            row[name] = None
            continue
        convert = SCHEMA[name]
        try:
            row[name] = convert(text)
        except ValueError:
            raise ValueError(f"column {name!r}: {text!r} is not a valid {convert.__name__}") from None
    return row


def load_dataset(path: str | Path) -> list[Row]:
    return [typed(raw) for raw in load_rows(path)]


def column(rows: list[Row], name: str) -> list[Value]:
    return [row[name] for row in rows]


def missing_counts(rows: list[Row]) -> dict[str, int]:
    return {name: column(rows, name).count(None) for name in rows[0]}


def kind(name: str) -> str:
    return "numerical" if SCHEMA[name] is int else "categorical"
```

- **`load_dataset`** is a **list comprehension**: `[typed(raw) for raw in load_rows(path)]` builds a new list by applying `typed` to every raw row. Written as a loop, it's:

  ```python
  result = []
  for raw in load_rows(path):
      result.append(typed(raw))
  return result
  ```
- **`column`** turns the table sideways: from "one dictionary per house" to "one list per feature". Statistics are computed on columns, so you'll call this constantly.
- **`missing_counts`** is a **dictionary comprehension**: `{key: value for … in …}`. For each column name (the keys of the first row), it counts the `None`s in that column.
- **`kind`** decides from the schema: integer columns are numerical, text columns categorical. `SCHEMA[name] is int` asks whether the converter *is* the `int` function itself.

```check
run ".venv/Scripts/python -m pytest -q tests/test_dataset.py" label="every dataset test passes" -- missing_counts: for each name in rows[0], column(rows, name).count(None).
```

## A first look from the command line

Now a command that summarises any file with this schema. Create `explorer/cli.py`:

```python file=explorer/cli.py
import argparse
import sys

from explorer import dataset


def overview(path: str, rows: list[dataset.Row]) -> str:
    missing = dataset.missing_counts(rows)
    lines = [
        f"{path}: {len(rows)} rows, {len(rows[0])} columns",
        f"{'column':<15} {'kind':<12} missing",
    ]
    for name in rows[0]:
        lines.append(f"{name:<15} {dataset.kind(name):<12} {missing[name]}")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="explorer", description="Summarise a CSV dataset.")
    parser.add_argument("file", help="the CSV file to explore")
    args = parser.parse_args(argv)

    try:
        rows = dataset.load_dataset(args.file)
    except OSError as error:
        print(f"explorer: cannot read {args.file}: {error.strerror}", file=sys.stderr)
        return 1
    except ValueError as error:
        print(f"explorer: {args.file}: {error}", file=sys.stderr)
        return 1

    print(overview(args.file, rows))
    return 0
```

Everything here is something you built in Chapter 0, now used again: `argparse`, a `main(argv)` that returns an exit code, expected errors caught and reported on stderr, a function (`overview`) that returns text instead of printing it. The new `except ValueError` catches the bad-value error you wrote in `typed`, so a corrupt CSV gets a one-line message naming the column.

And `explorer/__main__.py`, so the package runs with `-m`. Create it in the next step.

```check
run ".venv/Scripts/python -c \"from explorer import cli, dataset; print(cli.overview('x', dataset.load_dataset('data/houses.csv')))\"" stdout="48 rows, 7 columns" label="overview describes the dataset's shape"
```

## Run the explorer

Create `explorer/__main__.py`:

```python file=explorer/__main__.py
from explorer.cli import main

raise SystemExit(main())
```

```powershell
.venv\Scripts\python -m explorer data/houses.csv
```

```text
data/houses.csv: 48 rows, 7 columns
column          kind         missing
id              numerical    0
neighbourhood   categorical  0
bedrooms        numerical    0
sqft            numerical    0
age             numerical    3
garage          categorical  2
price           numerical    0
```

This is the first thing to look at in any dataset, before any model: **how much data, what kinds of features, and what's missing.** Three ages and two garages are missing. Every later step has to decide what to do about them: leave those houses out, fill the gaps with a typical value, or treat "unknown" as a category of its own. Each choice changes what a model learns, and Chapter 3 will make one of them.

`id` says `numerical`, because it's stored as an `int`. That's a limitation of deciding kinds from Python types alone: `id` is a number you'd never do arithmetic on. Knowing what a column *means* is your job, not the code's.

```check
run ".venv/Scripts/python -m explorer data/houses.csv" stdout="48 rows, 7 columns" label="python -m explorer data/houses.csv prints the overview"
run ".venv/Scripts/python -m explorer data/houses.csv" stdout="age             numerical    3" label="the overview counts the missing ages"
run ".venv/Scripts/python -m explorer nothing.csv" exit=1 stderr="explorer: cannot read" label="a missing file is reported, not raised"
```

### What you have

```text
dataset-explorer/
  explorer/
    __init__.py
    __main__.py
    cli.py           arguments in, overview out
    dataset.py       CSV → typed rows; columns; missing values; kinds
  data/houses.csv
  tests/test_dataset.py
```

Next lesson: asking the dataset real questions (what's typical, how spread out, which neighbourhood costs most), written by hand, so you know exactly what each answer means.
