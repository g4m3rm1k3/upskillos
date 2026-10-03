---
title: 1.3 — pandas: The Same Questions, Less Code
track: Data — Dataset Explorer
runtime: none
concepts: pandas, descriptive-statistics
revisits: missing-values, aggregation, testing
notebook: ml-pandas-dataframes, ml-pandas-reshaping
lab: 2
problem: Your hand-written explorer works but every new question needs new code, and every calculation loops in Python. What does a library built for tables do differently, and can you trust its answers?
---

**pandas** is the standard Python library for tables of data. Almost every machine-learning project uses it to load, clean and inspect data before a model sees it. You're going to learn it differently from most people: by checking every answer it gives against the code you wrote in the last lesson. Where they agree, you'll know exactly what pandas computed. Where they disagree, and there is one place, you'll find out which of you is answering a different question.

## Install pandas

The problem from the last lesson justifies a new dependency, so add it. Update `requirements.txt`:

```text file=requirements.txt
pytest==9.1.1
pandas==3.0.6
```

Install again:

```powershell
.venv\Scripts\python -m pip install -r requirements.txt
```

pip reads the whole file, sees pytest is already installed at the right version, and installs pandas with its own requirements. The important one is **NumPy**, the library pandas stores its numbers in. You'll use NumPy directly in the next chapter, and you'll see in this lesson's last step why its arrays are fast.

```check
run ".venv/Scripts/python -c \"import pandas; print(pandas.__version__)\"" stdout="3.0.6" label="pandas 3.0.6 is installed in the project's Python" -- Add pandas==3.0.6 to requirements.txt, then .venv\Scripts\python -m pip install -r requirements.txt
```

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_frame.py provided
# Tests for explorer/frame.py: pandas must agree with your own code. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_frame.py
from pathlib import Path

import pandas as pd
from pytest import approx

from explorer import dataset, describe, frame

HOUSES = Path(__file__).resolve().parent.parent / "data" / "houses.csv"
ROWS = dataset.load_dataset(HOUSES)


def test_shape_matches_your_rows():
    df = frame.load_frame(HOUSES)
    assert df.shape == (48, 7)
    assert list(df.columns) == list(ROWS[0])


def test_nan_marks_the_missing_cells():
    df = frame.load_frame(HOUSES)
    assert df["age"].isna().sum() == 3
    assert pd.isna(df.loc[5, "age"]), "house 6 (row 5) has no recorded age"


def test_summary_matches_yours():
    df = frame.load_frame(HOUSES)
    for name in ["price", "sqft", "age", "bedrooms"]:
        mine = describe.describe(ROWS, name)
        theirs = frame.describe_column(df, name)
        for stat in mine:
            assert theirs[stat] == approx(mine[stat]), f"{name}: {stat} differs"


def test_where_matches_yours():
    df = frame.load_frame(HOUSES)
    theirs = frame.where(df, "neighbourhood", "Hillcrest")["id"].tolist()
    assert theirs == [row["id"] for row in describe.where(ROWS, "neighbourhood", "Hillcrest")]


def test_groups_match_yours():
    df = frame.load_frame(HOUSES)
    for by in ["neighbourhood", "garage", "bedrooms"]:
        assert frame.group_mean(df, by, "price") == approx(describe.group_mean(ROWS, by, "price")), by
```

This is a different kind of test from the ones you've seen. It doesn't contain any expected numbers at all. It says: **whatever your code answered, pandas must answer the same.** Your code is the *reference implementation*, and you trust it because you wrote it, traced it and tested it against worked examples. When you replace hand-written code with a library, tests like this are how you prove the replacement didn't change any answers.

```check
file tests/test_frame.py -- Click "Create provided tests/test_frame.py" above.
```

## A DataFrame

Create `explorer/frame.py`:

```python file=explorer/frame.py
from pathlib import Path

import pandas as pd


def load_frame(path: str | Path) -> pd.DataFrame:
    return pd.read_csv(path)
```

`import pandas as pd` is a universal convention: every pandas example you'll find online writes `pd`.

`pd.read_csv(path)` does everything your `load_rows`, `SCHEMA` and `typed` did together, plus guessing the schema. It returns a **DataFrame**: a table whose columns each have one type. Explore it in the terminal:

```powershell
.venv\Scripts\python -i -c "from explorer import frame; df = frame.load_frame('data/houses.csv')"
```

`-i` keeps Python running after the command, at a `>>>` prompt, with `df` defined. Try:

```python
>>> df.head(3)          # the first 3 rows, as a table
>>> df.shape            # (48, 7): rows, columns
>>> df["price"]         # one column: a Series
>>> df.loc[5]           # one row, by its label
>>> df.dtypes           # each column's type
```

> **DataFrame**: pandas' table type: named columns, each holding values of one type, plus row labels. **Series**: one column on its own, with its row labels.
>
> *Picture it as* a spreadsheet tab where every column has been formatted as one kind of value (number, text, date) and the row numbers down the left are part of the data. **Where the picture stops working:** in a spreadsheet you can type text into a number column; in a DataFrame each column really is one type, which is what makes it fast.

A **Series** is one column: values plus an **index**, the labels down the left side (0 to 47 here, one per row). A DataFrame is a set of Series sharing one index. `df["price"]` picks a column by name; `df.loc[5]` picks a row by its index label. Type `exit()` to leave.

Now look at the types pandas chose:

```text
id                 int64
neighbourhood        str
bedrooms           int64
sqft               int64
age              float64
garage               str
price              int64
```

```predict
question: Every recorded age is a whole number. Why is age float64 when bedrooms and sqft are int64?
choice: pandas reads every column with a missing cell as text
choice: Missing values are stored as NaN, which is a float, so the whole column becomes float
choice: The ages in the file are written with decimal points
answer: Missing values are stored as NaN, which is a float, so the whole column becomes float
explain: pandas stores each column as one block of numbers of a single type (that's what makes it fast, as you'll see). An `int64` block has no way to say "nothing here": every bit pattern is some integer. So pandas marks missing numbers with **NaN** ("not a number"), a special floating-point value that every processor understands, and a column containing NaN must be a float column. Look at `df.loc[5, "age"]`: it prints `nan`.

NaN has odd behaviour you should know: `float("nan") == float("nan")` is `False`, because NaN is defined to be unequal to everything, itself included. That's why you test for it with `pd.isna(x)` or `series.isna()`, never with `==`. Your own code used `None`, which Python compares normally; pandas uses NaN because it has to fit inside a float array.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_frame.py -k \"shape or nan\"" label="the DataFrame has 48 rows, 7 columns and NaN where values are missing" -- return pd.read_csv(path)
```

## Describe, the pandas way

A Series has a method for every statistic you wrote. Add `describe_column` to `explorer/frame.py`, mapping your seven numbers onto them:

```python file=explorer/frame.py
from pathlib import Path

import pandas as pd


def load_frame(path: str | Path) -> pd.DataFrame:
    return pd.read_csv(path)


def describe_column(df: pd.DataFrame, name: str) -> dict[str, float]:
    values = df[name]
    return {
        "count": int(values.count()),
        "missing": int(values.isna().sum()),
        "mean": float(values.mean()),
        "std": float(values.std()),
        "min": float(values.min()),
        "median": float(values.median()),
        "max": float(values.max()),
    }
```

Each line replaces one of your functions:

| Your code | pandas | Note |
|---|---|---|
| `len(present(values))` | `values.count()` | counts the non-missing values |
| `len(rows) - len(present(...))` | `values.isna().sum()` | `isna()` gives a Series of `True`/`False`; summing counts the `True`s (True is 1) |
| `mean(present(values))` | `values.mean()` | skips NaN by default |
| `std(present(values))` | `values.std()` | skips NaN by default |
| `median`, `min`, `max` | `.median()`, `.min()`, `.max()` | |

Notice that you never wrote `present`. pandas skips NaN in every statistic **by default** (`skipna=True`). Convenient, and also a decision made for you: in your code the decision was visible; here it's a default you have to know about.

`int(...)` and `float(...)` turn pandas' results (NumPy number types such as `numpy.int64`) into plain Python numbers, so the dictionary looks like yours.

Run the comparison:

```powershell
.venv\Scripts\python -m pytest -q tests/test_frame.py -k summary
```

```predict
question: The test compares all seven statistics for four columns. Which statistic, if any, disagrees?
choice: None: pandas computes the same things
choice: mean
choice: std
choice: median
answer: std
explain: The failure reads `price: std differs`, with pandas giving about 73,557 against your 72,786. Same data, both skipping missing values, so the two standard deviations must be answering slightly different questions. The next step says what they are.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_frame.py -k summary" exit=1 stdout="std differs" label="the comparison finds the one statistic that disagrees: std" -- Use values.std() for now, with no arguments: this step is about seeing the difference.
```

## Sample or population?

Your variance divided the sum of squared distances by $n$. pandas' `std()` divides by $n - 1$:

$$s^2 = \frac{1}{n-1}\sum_{i=1}^{n}(x_i - \bar{x})^2$$

For 48 houses that's 47 instead of 48, a factor of $\sqrt{48/47} \approx 1.0106$, and 72,786 × 1.0106 ≈ 73,557: exactly the difference you saw.

Why would anyone divide by $n - 1$? Because the two formulas answer different questions:

- **Population** standard deviation ($\div n$, your version): *how spread out are these 48 houses?* If these 48 are all you care about, this is the exact answer.

- **Sample** standard deviation ($\div (n - 1)$, pandas' default): *these 48 houses are a sample from a town of thousands; how spread out is the town?*

*Picture it as* inspection. Measure every part in a box of 48 and you know that box's spread exactly: population. Measure 48 parts pulled from a run of 10,000 and you're estimating the whole run's spread from a sample, and the formula needs a small correction to avoid underestimating it.

For the second question, dividing by $n$ comes out **too small on average**. The distances are measured from $\bar{x}$, the mean of *this sample*, and the sample mean sits, by construction, as close as possible to the sample's own values: any other number, including the town's true mean, would give a larger sum of squared distances. So squared distances from $\bar{x}$ understate squared distances from the true mean. Dividing by $n - 1$ instead of $n$ corrects for this exactly, on average. (It's called **Bessel's correction**; the Notebook Lab's *Estimation and uncertainty* lesson simulates it so you can watch the bias disappear.)

In machine learning, the data you have is almost always a sample of the data the model will meet later, which is why pandas defaults to $n - 1$. NumPy's `np.std`, which you'll meet next chapter, defaults to $n$. Two widely used libraries, two different defaults for the "same" statistic: this is why you check.

The explorer is describing *these* houses, so match your definition. `ddof` means "delta degrees of freedom": the divisor is $n - \text{ddof}$. Update `explorer/frame.py`:

```python file=explorer/frame.py
from pathlib import Path

import pandas as pd


def load_frame(path: str | Path) -> pd.DataFrame:
    return pd.read_csv(path)


def describe_column(df: pd.DataFrame, name: str) -> dict[str, float]:
    values = df[name]
    return {
        "count": int(values.count()),
        "missing": int(values.isna().sum()),
        "mean": float(values.mean()),
        "std": float(values.std(ddof=0)),
        "min": float(values.min()),
        "median": float(values.median()),
        "max": float(values.max()),
    }
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_frame.py -k summary" label="with ddof=0, every statistic agrees with yours" -- values.std(ddof=0) divides by n, as your std does.
```

## Masks and groups

Two more of your functions to replace. Add them to `explorer/frame.py`:

```python file=explorer/frame.py
from pathlib import Path

import pandas as pd


def load_frame(path: str | Path) -> pd.DataFrame:
    return pd.read_csv(path)


def describe_column(df: pd.DataFrame, name: str) -> dict[str, float]:
    values = df[name]
    return {
        "count": int(values.count()),
        "missing": int(values.isna().sum()),
        "mean": float(values.mean()),
        "std": float(values.std(ddof=0)),
        "min": float(values.min()),
        "median": float(values.median()),
        "max": float(values.max()),
    }


def where(df: pd.DataFrame, name: str, value) -> pd.DataFrame:
    return df[df[name] == value]


def group_mean(df: pd.DataFrame, by: str, of: str) -> dict:
    return df.groupby(by)[of].mean().to_dict()
```

**`df[df[name] == value]`** reads strangely the first time. Take it apart:

1. `df["neighbourhood"] == "Hillcrest"` doesn't give one `True` or `False`. A Series compared with a value compares **every element**, giving a Series of 48 booleans: `False, True, True, False, …`. This is called a **mask**: a column of `True`/`False` values that says, row by row, whether to keep the row. *Picture it as* a stencil laid over the table: the holes are where the mask is `True`, and `df[mask]` keeps only the rows you can see through the holes. Try `df["neighbourhood"] == "Hillcrest"` at the prompt to see the mask itself before it's used.
2. `df[mask]` keeps the rows where the mask is `True`.

Masks combine with `&` (and), `|` (or) and `~` (not), with parentheses around each comparison. The question that took three chained calls by hand is one expression:

```python
df[(df["neighbourhood"] == "Riverside") & (df["garage"] == "yes")].groupby("bedrooms")["price"].mean()
```

and "over 1,500 square feet", which needed a new function, is just `df[df["sqft"] > 1500]`.

**`df.groupby(by)[of].mean()`** is split–apply–combine in one line: split the rows into groups by `by`, take column `of` in each group, apply `mean`, and combine the results into a Series indexed by group. `.to_dict()` turns it into the same dictionary shape as yours. Rows whose group is NaN are dropped by default (`dropna=True`), which is exactly the decision your `group_mean` made.

```check
run ".venv/Scripts/python -m pytest -q tests/test_frame.py" label="pandas agrees with your code on every question" -- where: df[df[name] == value]; group_mean: df.groupby(by)[of].mean().to_dict()
```

## How much faster, and why

The last lesson claimed your functions would be slow on large data. Measure it. Create `bench.py` in the project folder:

```python file=bench.py
import random
import time

import pandas as pd

from explorer import describe

values = [random.random() for _ in range(1_000_000)]
column = pd.Series(values)


def seconds(task):
    start = time.perf_counter()
    task()
    return time.perf_counter() - start


by_hand = seconds(lambda: describe.std(values))
by_pandas = seconds(lambda: column.std(ddof=0))
print(f"your std:   {by_hand:.4f} s")
print(f"pandas std: {by_pandas:.4f} s")
print(f"pandas is {by_hand / by_pandas:.0f} times faster")
print(f"a pandas column is stored as: {type(column.to_numpy()).__name__} of {column.dtype}")
```

`time.perf_counter()` reads a high-resolution clock; the difference between two readings is the elapsed time in seconds. `lambda: describe.std(values)` wraps the call in a function so `seconds` can time it.

```powershell
.venv\Scripts\python bench.py
```

On the machine this lesson was written on, your `std` took about 0.1 seconds for a million values and pandas about 0.01: **roughly 10 times faster**, for the same answer. Your numbers will differ; the ratio is what matters.

Why? *Picture it as* hand-cutting a million blanks with shears, checking each one, versus feeding a coil through a stamping press: same parts, but the press does the repetitive part in one continuous machine operation. Your `variance` is the shears. It runs a Python loop: for each of a million values, the interpreter fetches the next object from the list, checks its type, subtracts, squares, adds, and each of those is several bytecode instructions. The last line of output gives pandas' secret: a pandas column is stored as an **`ndarray` of `float64`**, a NumPy array. That's one contiguous block of memory holding a million raw 8-byte numbers, with no Python objects in it at all, and NumPy loops over it in compiled C code, where subtracting and squaring each number takes a nanosecond or so.

```check
run ".venv/Scripts/python bench.py" stdout="times faster" label="bench.py compares the two"
run ".venv/Scripts/python bench.py" stdout="ndarray of float64" label="a pandas column is a NumPy array of float64"
```

### Chapter 1: what you know now

- A dataset is a table: **observations** (rows) of **features** (columns), one of which may be the **target** to predict. Features are **numerical** or **categorical**, and some values are **missing**.
- A CSV file is text. Choosing types (a schema) is a decision, and getting it wrong gives confident wrong answers.
- **Mean**, **median**, **variance** and **standard deviation** are short calculations you can write yourself, and you know what each one is sensitive to.
- **pandas** answers the same questions in a line each, skips missing values by default, and computes the **sample** standard deviation by default.
- Underneath pandas is **NumPy**: arrays of raw numbers processed in compiled loops.

That last point leads straight into the next chapter. To understand what a model does, you need the mathematics of numbers in bulk: **vectors** and **matrices**. And you'll build them the same way: by hand first, then with NumPy.
