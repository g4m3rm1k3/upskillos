---
title: 1.2 — Asking Questions by Hand
track: Data — Dataset Explorer
runtime: none
concepts: descriptive-statistics, aggregation
revisits: missing-values, testing, command-line
notebook: ml-expectation-and-variance, ml-exploring-a-dataset
lab: 5
problem: What's a typical house price here, how much do prices vary, and which neighbourhood costs most? Each question needs a precise answer, and each answer is a small calculation.
---

Before building any model, you ask the data simple questions. What's a typical price? How spread out are prices: are most houses near the typical one, or all over the place? Which neighbourhood costs most? A model's predictions will be judged against exactly these numbers. A model that's no better than "always predict the average price" has learned nothing, and you can only know that if you know the average.

This lesson writes each calculation yourself. They're short, and writing them means you'll know precisely what "mean", "median" and "standard deviation" compute, which matters, because in the next lesson pandas gives an answer that **differs** from yours, and you'll need to know why.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_describe.py provided
# Tests for explorer/describe.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_describe.py
from pathlib import Path

from pytest import approx

from explorer import dataset, describe

HOUSES = Path(__file__).resolve().parent.parent / "data" / "houses.csv"
ROWS = dataset.load_dataset(HOUSES)


def test_mean_of_a_list():
    assert describe.mean([1, 2, 3, 4]) == 2.5


def test_mean_of_a_column_leaves_out_missing_values():
    assert describe.present([1, None, 3]) == [1, 3]
    ages = describe.present(dataset.column(ROWS, "age"))
    assert describe.mean(ages) == approx(40.8889, abs=1e-4)


def test_median_odd_and_even_lengths():
    assert describe.median([3, 1, 2]) == 2
    assert describe.median([4, 1, 3, 2]) == 2.5, "even length: the mean of the two middle values"


def test_median_does_not_reorder_its_input():
    values = [3, 1, 2]
    describe.median(values)
    assert values == [3, 1, 2]


def test_spread_variance_is_the_mean_squared_distance_from_the_mean():
    assert describe.variance([2, 4, 4, 4, 5, 5, 7, 9]) == 4
    assert describe.std([2, 4, 4, 4, 5, 5, 7, 9]) == 2


def test_spread_of_identical_values_is_zero():
    assert describe.variance([5, 5, 5]) == 0


def test_summary_of_price():
    summary = describe.describe(ROWS, "price")
    assert summary == {
        "count": 48, "missing": 0, "mean": approx(246333.33, abs=0.01), "std": approx(72786.46, abs=0.01),
        "min": 84000, "median": 256750, "max": 441500,
    }


def test_summary_counts_what_is_missing():
    summary = describe.describe(ROWS, "age")
    assert (summary["count"], summary["missing"]) == (45, 3)


def test_filter_where_keeps_matching_rows():
    hillcrest = describe.where(ROWS, "neighbourhood", "Hillcrest")
    assert len(hillcrest) == 12
    assert all(row["neighbourhood"] == "Hillcrest" for row in hillcrest)


def test_filter_value_counts_most_common_first():
    counts = describe.value_counts(ROWS, "garage")
    assert counts == {"yes": 25, "no": 21, None: 2}
    assert list(counts) == ["yes", "no", None]


def test_group_mean_price_by_neighbourhood():
    assert describe.group_mean(ROWS, "neighbourhood", "price") == approx(
        {"Hillcrest": 285833.33, "Oldtown": 215852.94, "Riverside": 248657.89}, abs=0.01)


def test_group_mean_leaves_out_rows_with_a_missing_group():
    assert set(describe.group_mean(ROWS, "garage", "price")) == {"no", "yes"}
```

New in this file: **`approx`**. Decimal fractions like 0.1 can't be stored exactly in binary floating point, so `0.1 + 0.2 == 0.3` is `False` in Python (and in every language using standard floats). `approx(246333.33, abs=0.01)` accepts any number within 0.01 of that value. Comparing floats with `==` is almost always a bug; comparing them with a tolerance is how numerical code is tested. The dictionary comparisons work because `approx` can wrap a whole dictionary.

```check
file tests/test_describe.py -- Click "Create provided tests/test_describe.py" above.
```

## What's typical: the mean

The **mean** (the everyday "average") of values $x_1, x_2, \ldots, x_n$ is their sum divided by how many there are:

$$\bar{x} = \frac{1}{n}\sum_{i=1}^{n} x_i$$

$\sum_{i=1}^{n} x_i$ ("sigma") is mathematics' way of writing a loop: add up $x_i$ for every $i$ from 1 to $n$. $\bar{x}$ ("x-bar") is the usual name for a mean. Read the formula as code and it's one line. Create `explorer/describe.py`:

```python file=explorer/describe.py
def present(values: list) -> list:
    return [value for value in values if value is not None]


def mean(values: list[float]) -> float:
    return sum(values) / len(values)
```

`present` removes the missing values. It's separate from `mean` on purpose: what to do about missing values is a **decision**, and making it visible (`mean(present(ages))`) is better than hiding it inside every statistic.

```predict
question: The mean of the 45 recorded ages is 40.89. If the 3 missing ages had been stored as 0 instead of None, what would the "mean age" come out as? (two decimal places)
answer: 38.33
tolerance: 0.01
explain: The 45 recorded ages add up to 1840. Divided by 45 that's 40.89. With three zeros added, it's 1840 divided by 48: 38.33. Three houses whose age nobody recorded have made the whole neighbourhood look 2½ years newer.

This is why `typed` turned empty cells into `None` rather than `0`. A missing value is not a value, and every calculation has to decide what to do about it.
verify: .venv/Scripts/python -c "from explorer import dataset; ages = [a or 0 for a in dataset.column(dataset.load_dataset('data/houses.csv'), 'age')]; print(round(sum(ages) / len(ages), 2))"
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_describe.py -k test_mean" label="mean and present work" -- present keeps every value that is not None; mean is sum(values) / len(values).
```

## The median

The **median** is the middle value once the values are sorted: half are below it, half above. With an even number of values there's no single middle, so it's the mean of the two in the middle. Add it:

```python file=explorer/describe.py
def present(values: list) -> list:
    return [value for value in values if value is not None]


def mean(values: list[float]) -> float:
    return sum(values) / len(values)


def median(values: list[float]) -> float:
    ordered = sorted(values)
    middle = len(ordered) // 2
    if len(ordered) % 2 == 1:
        return ordered[middle]
    return (ordered[middle - 1] + ordered[middle]) / 2
```

Trace `[4, 1, 3, 2]`: `ordered` is `[1, 2, 3, 4]`, `middle` is `4 // 2 = 2` (`//` divides and rounds down), the length is even, so the answer is the mean of `ordered[1]` and `ordered[2]`: (2 + 3) / 2 = 2.5. For `[3, 1, 2]`: `middle` is 1, the length is odd, and `ordered[1]` is 2.

`sorted(values)` returns a **new** sorted list. `values.sort()` would sort the caller's list in place, a side effect the caller didn't ask for: the fourth test exists to catch that.

```predict
question: The prices have mean 246,333 and median 256,750. A new house sells for 5,000,000. Which moves more?
choice: The mean
choice: The median
choice: They move by the same amount
answer: The mean
explain: The mean adds every value in, so one huge price drags it up by about 5,000,000 ÷ 49 ≈ 97,000. The median only cares about the middle position: one extra value above it shifts the middle by half a place, so it moves from 256,750 to one of its neighbouring prices, a few thousand at most.

That's why house prices and salaries are usually reported as medians: a few extreme values ("outliers") pull the mean away from what a typical case looks like. Neither is "right"; they answer different questions. The mean matters for totals (49 houses × mean = total value); the median describes a typical house.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_describe.py -k median" label="median works for odd and even lengths, and leaves its input alone" -- sorted(values) makes a new list; values.sort() would change the caller's.
```

## How spread out: variance and standard deviation

Two neighbourhoods can have the same mean price, one with every house close to it and one with prices all over the place. The **spread** is how far values typically are from the mean.

The obvious idea, the average distance from the mean, has a problem: distances above and below cancel. The average of $(x_i - \bar{x})$ is always exactly 0. So square each distance first (squares are never negative), then average. That's the **variance**:

$$\sigma^2 = \frac{1}{n}\sum_{i=1}^{n}(x_i - \bar{x})^2$$

Squaring has a cost: if prices are in dollars, the variance is in *dollars squared*, which means nothing to anyone. So take the square root to get back to dollars: the **standard deviation**, $\sigma$ ("sigma").

Work through the test's example, `[2, 4, 4, 4, 5, 5, 7, 9]`. The mean is 40 ÷ 8 = 5. The distances from 5 are −3, −1, −1, −1, 0, 0, 2, 4; squared, 9, 1, 1, 1, 0, 0, 4, 16, which add up to 32. The variance is 32 ÷ 8 = 4, and the standard deviation is √4 = 2. Add them:

```python file=explorer/describe.py
import math


def present(values: list) -> list:
    return [value for value in values if value is not None]


def mean(values: list[float]) -> float:
    return sum(values) / len(values)


def median(values: list[float]) -> float:
    ordered = sorted(values)
    middle = len(ordered) // 2
    if len(ordered) % 2 == 1:
        return ordered[middle]
    return (ordered[middle - 1] + ordered[middle]) / 2


def variance(values: list[float]) -> float:
    m = mean(values)
    return sum((x - m) ** 2 for x in values) / len(values)


def std(values: list[float]) -> float:
    return math.sqrt(variance(values))
```

`variance` computes the mean once, before the loop. Writing `(x - mean(values)) ** 2` inside the generator would recompute the mean for every value: correct, but 48 times the work, and a million times the work for a million values.

You'll meet squared distances again and again. In Chapter 3, the **loss** that tells a model how wrong it is will be the mean squared distance between its predictions and the true prices: the variance formula with "the mean" replaced by "the prediction".

```check
run ".venv/Scripts/python -m pytest -q tests/test_describe.py -k spread" label="variance and std match the worked example" -- variance: the mean of (x - m) ** 2; std: math.sqrt(variance(values)).
```

## Describe a column

One function that answers all of it for a column. Add `describe` to the end of `explorer/describe.py`:

```python file=explorer/describe.py
import math

from explorer.dataset import Row, column


def present(values: list) -> list:
    return [value for value in values if value is not None]


def mean(values: list[float]) -> float:
    return sum(values) / len(values)


def median(values: list[float]) -> float:
    ordered = sorted(values)
    middle = len(ordered) // 2
    if len(ordered) % 2 == 1:
        return ordered[middle]
    return (ordered[middle - 1] + ordered[middle]) / 2


def variance(values: list[float]) -> float:
    m = mean(values)
    return sum((x - m) ** 2 for x in values) / len(values)


def std(values: list[float]) -> float:
    return math.sqrt(variance(values))


def describe(rows: list[Row], name: str) -> dict[str, float]:
    values = present(column(rows, name))
    return {
        "count": len(values),
        "missing": len(rows) - len(values),
        "mean": mean(values),
        "std": std(values),
        "min": min(values),
        "median": median(values),
        "max": max(values),
    }
```

Seven numbers that summarise a whole column. For `price`: 48 houses, none missing, mean 246,333, standard deviation 72,786, from 84,000 to 441,500 with the middle at 256,750. Read the standard deviation as "prices typically sit about 73,000 away from the mean". That number will matter in Chapter 3: a model whose predictions are typically 73,000 off has learned nothing that "always guess the mean" doesn't already know.

```check
run ".venv/Scripts/python -m pytest -q tests/test_describe.py -k summary" label="describe summarises a column, counting what's missing"
```

## Filter, count and group

Three more questions every dataset gets asked: *which rows match?*, *how often does each category appear?*, and *what's the mean for each group?* Add them:

```python file=explorer/describe.py
import math

from explorer.dataset import Row, column


def present(values: list) -> list:
    return [value for value in values if value is not None]


def mean(values: list[float]) -> float:
    return sum(values) / len(values)


def median(values: list[float]) -> float:
    ordered = sorted(values)
    middle = len(ordered) // 2
    if len(ordered) % 2 == 1:
        return ordered[middle]
    return (ordered[middle - 1] + ordered[middle]) / 2


def variance(values: list[float]) -> float:
    m = mean(values)
    return sum((x - m) ** 2 for x in values) / len(values)


def std(values: list[float]) -> float:
    return math.sqrt(variance(values))


def describe(rows: list[Row], name: str) -> dict[str, float]:
    values = present(column(rows, name))
    return {
        "count": len(values),
        "missing": len(rows) - len(values),
        "mean": mean(values),
        "std": std(values),
        "min": min(values),
        "median": median(values),
        "max": max(values),
    }


def where(rows: list[Row], name: str, value) -> list[Row]:
    return [row for row in rows if row[name] == value]


def value_counts(rows: list[Row], name: str) -> dict:
    counts = {}
    for value in column(rows, name):
        counts[value] = counts.get(value, 0) + 1
    return dict(sorted(counts.items(), key=lambda pair: -pair[1]))


def group_mean(rows: list[Row], by: str, of: str) -> dict[str, float]:
    groups = {}
    for row in rows:
        if row[by] is None or row[of] is None:
            continue
        groups.setdefault(row[by], []).append(row[of])
    return {key: mean(values) for key, values in sorted(groups.items())}
```

- **`value_counts`** is lesson 0.2's word counter applied to a column. `None` is counted too: "how many are missing" is part of the answer. Sorting only by `-count` (no tie-break this time) works because `sorted` never has to compare two *keys*. Comparing `None` with `"yes"` would raise `TypeError`.
- **`group_mean`** is the important one. It **splits** the rows into groups by one column, **applies** `mean` to another column within each group, and **combines** the results into one dictionary. *Split, apply, combine* is the pattern behind every "average X per Y" question. `groups.setdefault(key, [])` returns the list for `key`, first storing an empty one if there isn't one yet.
- Rows whose group (or value) is missing are left out, because there's no honest group to put them in.

```predict
question: Which neighbourhood has the highest mean price?
choice: Riverside
choice: Oldtown
choice: Hillcrest
answer: Hillcrest
explain: Hillcrest: 285,833, against 248,658 for Riverside and 215,853 for Oldtown. Run `describe.group_mean(rows, "neighbourhood", "price")` to see all three.

Now try `group_mean(rows, "garage", "price")`: houses with a garage average 249,300 and without 245,214, a difference of only about 4,000. Does a garage add only 4,000 to a house's value? Not necessarily. Maybe the houses with garages also happen to be smaller, or older, and that hides the garage's real effect. A group mean compares groups that differ in many ways at once. Separating the effect of one feature from all the others is exactly what a regression model does, in Chapter 3.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_describe.py" label="every describe test passes" -- group_mean: skip rows where the group or the value is None.
```

## Questions from the command line

Give the explorer an option to describe a column. Update `explorer/cli.py`:

```python file=explorer/cli.py
import argparse
import sys

from explorer import dataset, describe


def overview(path: str, rows: list[dataset.Row]) -> str:
    missing = dataset.missing_counts(rows)
    lines = [
        f"{path}: {len(rows)} rows, {len(rows[0])} columns",
        f"{'column':<15} {'kind':<12} missing",
    ]
    for name in rows[0]:
        lines.append(f"{name:<15} {dataset.kind(name):<12} {missing[name]}")
    return "\n".join(lines)


def column_report(rows: list[dataset.Row], name: str) -> str:
    if dataset.kind(name) == "categorical":
        lines = [f"{name}: categorical"]
        for value, count in describe.value_counts(rows, name).items():
            lines.append(f"  {str(value):<12} {count}")
        return "\n".join(lines)
    summary = describe.describe(rows, name)
    lines = [f"{name}: {summary['count']} values, {summary['missing']} missing"]
    for stat in ["mean", "std", "min", "median", "max"]:
        lines.append(f"  {stat:<8} {summary[stat]:>12,.2f}")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="explorer", description="Summarise a CSV dataset.")
    parser.add_argument("file", help="the CSV file to explore")
    parser.add_argument("--describe", metavar="COLUMN", help="summarise one column")
    args = parser.parse_args(argv)

    try:
        rows = dataset.load_dataset(args.file)
    except OSError as error:
        print(f"explorer: cannot read {args.file}: {error.strerror}", file=sys.stderr)
        return 1
    except ValueError as error:
        print(f"explorer: {args.file}: {error}", file=sys.stderr)
        return 1

    if args.describe is None:
        print(overview(args.file, rows))
    elif args.describe not in dataset.SCHEMA:
        print(f"explorer: no column named {args.describe!r}", file=sys.stderr)
        return 1
    else:
        print(column_report(rows, args.describe))
    return 0
```

`{summary[stat]:>12,.2f}` is a **format specification**: `>12` right-aligns in 12 characters, `,` adds thousands separators, `.2f` shows exactly two decimal places. A categorical column gets its value counts instead, because the mean of "Riverside" and "Oldtown" means nothing. That's the practical difference between the two kinds of feature: they support different questions.

```powershell
.venv\Scripts\python -m explorer data/houses.csv --describe price
.venv\Scripts\python -m explorer data/houses.csv --describe neighbourhood
```

```text
price: 48 values, 0 missing
  mean       246,333.33
  std         72,786.46
  min         84,000.00
  median     256,750.00
  max        441,500.00
```

```check
run ".venv/Scripts/python -m explorer data/houses.csv --describe price" stdout="mean       246,333.33" label="--describe price prints the summary"
run ".venv/Scripts/python -m explorer data/houses.csv --describe garage" stdout="None         2" label="--describe on a categorical column counts each value, missing included"
run ".venv/Scripts/python -m explorer data/houses.csv --describe colour" exit=1 stderr="no column named 'colour'" label="an unknown column is reported"
```

## Where hand-written code starts to hurt

You now have eleven small functions, and each one is clear. Now ask a slightly harder question: *the mean price per bedroom count, for Riverside houses that have a garage*.

```python
riverside = describe.where(rows, "neighbourhood", "Riverside")
with_garage = describe.where(riverside, "garage", "yes")
answer = describe.group_mean(with_garage, "bedrooms", "price")
```

Three lines, which isn't bad. But notice what's piling up:

- **Every question is a new function or a new chain.** `where` only tests equality. "Houses over 1,500 square feet" needs another function, "built in the last 20 years" another, and combining two conditions needs a chain like the one above.
- **Every function loops over every row in Python.** For 48 rows that's instant. Python executes each loop step as several bytecode instructions, roughly tens of nanoseconds each, so a dataset of ten million rows takes seconds per question, and models ask millions of questions.
- **Every calculation decides about missing values separately**, and one forgotten `present` gives a `TypeError` (or worse, a wrong answer).
- **The schema is written by hand.** A new CSV with different columns needs a new `SCHEMA`.

These are exactly the problems **pandas** was built for. Next lesson, you'll install it and ask the same questions in a line each, with the tests you already have checking that its answers match yours, and find the one place they don't.
