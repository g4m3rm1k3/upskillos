// Lab 02 runnable cells and math ↔ code tables, keyed by lesson id.
// Rhythm for every cell: predict the output, run it, change one value, explain.
const LOG = `import io
import numpy as np
import pandas as pd

raw = """build,branch,size_mb,files,duration_s
b1,main,40,120,52
b2,dev,12,30,unknown
b3,main,55,160,71
b4,dev,20,60,-1
b5,main,40960,110,50
b6,dev,18,45,24
b3,main,55,160,71
b7,main,,90,40
"""`

export const extras = {
  'l02-functions': {
    mathCode: {
      rows: [
        ['same inputs → same output', 'def clean(rows): return [r for r in rows if r is not None]', 'A pure stage: reads its argument, returns a new value.'],
        ['stage order', 'evaluate(fit(split(clean(load(path)), seed)))', 'The pipeline is function composition; the order is part of the design.'],
        ['hidden state → parameter', 'def split(rows, seed=42, test_fraction=0.25)', 'Every choice that can change the result is an argument.'],
      ],
    },
    notebook: {
      title: 'Lab 02.1 · Pure functions and pipeline order',
      intro: 'See a mutating function change its caller’s data, rewrite it as a pure function, and check that purity does not make stages reorderable.',
      cells: [{
        title: 'A function that mutates its input',
        prose: '**Predict** what the second call returns and what `rows` contains afterwards.',
        code: `def add_row(rows):
    rows.append(0)
    return len(rows)

rows = [1, 2, 3]
print(add_row(rows), add_row(rows), rows)`,
      }, {
        title: 'The pure version',
        prose: '**Predict** both calls and `rows`. **Then change** the pure version to use `rows.append` and rerun.',
        code: `def add_row_pure(rows):
    return len(rows + [0])      # builds a new list; the caller's list is untouched

rows = [1, 2, 3]
print(add_row_pure(rows), add_row_pure(rows), rows)`,
      }, {
        title: 'Pure stages, different orders, different experiments',
        prose: 'Both stages are pure. **Predict** whether cleaning before or after splitting gives the same training set.',
        code: `import random

def clean(rows):
    return [r for r in rows if r >= 0]            # drop sentinel rows (-1)

def split(rows, seed=0, test_fraction=0.25):
    order = list(range(len(rows)))
    random.Random(seed).shuffle(order)
    k = int(len(rows) * (1 - test_fraction))
    return [rows[i] for i in order[:k]], [rows[i] for i in order[k:]]

data = [5, -1, 7, 3, -1, 9, 4, 6]
train_a, _ = split(clean(data))                    # clean, then split
train_b = clean(split(data)[0])                    # split, then clean the training part
print("clean → split:", train_a, " n =", len(train_a))
print("split → clean:", train_b, " n =", len(train_b))`,
      }],
    },
  },
  'l02-indexing': {
    mathCode: {
      rows: [
        ['$x_i$', 'x[i]', 'Integer indexing picks one position.'],
        ['$\\{x_i : x_i > 5\\}$', 'x[x > 5]', 'A boolean mask keeps the True positions.'],
        ['$\\bar x_{\\cdot j}$ (column means)', 'X.mean(axis=0)', 'Axis 0 (the rows) disappears: one value per column.'],
        ['$x_{ij} - \\bar x_{\\cdot j}$', 'X - X.mean(axis=0)', 'Broadcasting subtracts each column’s mean from every row.'],
      ],
    },
    notebook: {
      title: 'Lab 02.2 · Index, mask, reduce, broadcast',
      intro: 'Every cell asks you to predict a value **and** a shape before running.',
      cells: [{
        title: 'Positions and masks',
        prose: '**Predict** each line. **Then change** the mask to `(x > 3) & (x < 9)`.',
        code: `import numpy as np
x = np.array([4, 9, 2, 7])
print(x[0], x[-1], x[1:3], x[[3, 0]])
mask = x > 5
print(mask, x[mask])`,
      }, {
        title: 'Axis: which one disappears?',
        prose: '**Predict** both shapes.',
        code: `X = np.array([[1., 2., 3.],
              [4., 5., 6.]])
print(X.mean(axis=0), X.mean(axis=0).shape)
print(X.mean(axis=1), X.mean(axis=1).shape)`,
      }, {
        title: 'Broadcasting centers every column',
        prose: '**Predict** the column means after centering.',
        code: `centered = X - X.mean(axis=0)       # (2, 3) − (3,) → (2, 3)
print(centered)
print(centered.mean(axis=0))`,
      }, {
        title: 'The (n, 1) trap, with numbers',
        prose: 'Both lines print one plausible MSE. **Predict** which is wrong and by how much.',
        code: `y = np.array([3., 5., 7., 9., 11.])
pred = y + 0.5                           # every prediction is 0.5 too high: MSE should be 0.25
right = np.mean((pred - y) ** 2)
wrong = np.mean((pred.reshape(-1, 1) - y) ** 2)   # (5, 1) − (5,) → (5, 5)
print("right:", right, "  wrong:", wrong)`,
      }],
    },
  },
  'l02-pandas': {
    mathCode: {
      rows: [
        ['a table of typed columns', 'df = pd.read_csv(path, na_values=["unknown"])', 'Tell pandas what missing looks like.'],
        ['$\\{\\text{rows} : \\text{size} > 50\\}$', 'df.loc[df["size_mb"] > 50, "files"]', 'Select rows by a mask and a column by name.'],
        ['$\\bar y_g$ for each group $g$', 'df.groupby("branch")["duration_s"].mean()', 'One mean per group.'],
      ],
    },
    notebook: {
      title: 'Lab 02.3 · A first look with pandas',
      intro: 'Load a small, deliberately messy build log and run the five first checks from the lesson.',
      cells: [{
        title: 'Load it and check the types',
        prose: '**Predict**: which column is read as text (dtype `object`, or `str` in pandas 3), and why?',
        code: LOG + `
df = pd.read_csv(io.StringIO(raw))
print(df.shape)
print(df.dtypes)`,
      }, {
        title: 'Tell pandas what missing looks like',
        prose: '**Predict** the dtype of `duration_s` now, and how many values are missing in each column.',
        code: `df = pd.read_csv(io.StringIO(raw), na_values=["unknown"])
print(df.dtypes["duration_s"])
print(df.isna().sum())`,
      }, {
        title: 'Summaries expose impossible values',
        prose: '**Predict** which two numbers in `describe()` are physically impossible.',
        code: `print(df[["size_mb", "duration_s"]].describe().loc[["min", "max"]])
print("exact duplicate rows:", df.duplicated().sum())`,
      }, {
        title: 'Group, then aggregate',
        prose: '**Predict** whether main or dev builds take longer on average, ignoring invalid rows for now.',
        code: `ok = df[df["duration_s"] >= 0]
print(ok.groupby("branch")["duration_s"].mean())`,
      }],
    },
  },
  'l02-missing': {
    mathCode: {
      rows: [
        ['$m = \\operatorname{median}(x_{\\text{train}})$', 'fill = np.nanmedian(x_train)', 'Learned from training rows only, ignoring NaN.'],
        ['$\\tilde x_i = x_i$ or $m$', 'np.where(np.isnan(x), fill, x)', 'Apply the same fill to every split.'],
        ['$\\mathbb{1}[x_i \\text{ missing}]$', 'np.isnan(x).astype(float)', 'The missing indicator column.'],
      ],
    },
    notebook: {
      title: 'Lab 02.4 · Mean, median and a missing indicator',
      intro: 'Compare mean and median fills on skewed data, learn the fill from training rows only, and keep the missingness signal.',
      cells: [{
        title: 'Mean versus median',
        prose: '**Predict** both fill values. **Then change** 100 to 10 and predict again.',
        code: `import numpy as np
x_train = np.array([2, np.nan, 9, 4, 100])
print("mean  :", np.nanmean(x_train))
print("median:", np.nanmedian(x_train))`,
      }, {
        title: 'Learn on training rows, apply everywhere',
        prose: 'The validation row with a gap gets the **training** median. **Predict** the filled validation array.',
        code: `x_val = np.array([np.nan, 7, 3])
fill = np.nanmedian(x_train)                     # learned once, from training rows
print(np.where(np.isnan(x_val), fill, x_val))
print("leaky fill (all rows):", np.nanmedian(np.concatenate([x_train, x_val])))`,
      }, {
        title: 'Keep a missing indicator',
        prose: 'After filling, the model can no longer tell which values were real. The indicator restores that information.',
        code: `x = np.array([2, np.nan, 9, np.nan, 4])
features = np.column_stack([np.where(np.isnan(x), fill, x), np.isnan(x).astype(float)])
print(features)`,
      }],
    },
  },
  'l02-look': {
    mathCode: {
      rows: [
        ['sentinel → missing', 'df["duration_s"].replace(-1, np.nan)', 'A fake number becomes an honest gap.'],
        ['unit repair (stated rule)', 'df.loc[df["size_mb"] > 1000, "size_mb"] /= 1024', 'Only with a rule you can defend.'],
        ['exact duplicates', 'df.drop_duplicates()', 'One build counted once.'],
      ],
    },
    notebook: {
      title: 'Lab 02.5 · Sentinels, units and duplicates',
      intro: 'Repair the messy log one rule at a time and watch the summary statistics change after each rule.',
      cells: [{
        title: 'The raw means',
        prose: '**Predict**: is the raw mean duration too high or too low, and the raw mean size?',
        code: LOG + `
df = pd.read_csv(io.StringIO(raw), na_values=["unknown"])
print(df[["size_mb", "duration_s"]].mean())`,
      }, {
        title: 'Apply the rules, logging each one',
        prose: 'Each rule prints how many rows it touched. **Change** the order of the rules: does anything change?',
        code: `log = []
clean = df.copy()
n = (clean["duration_s"] == -1).sum(); clean["duration_s"] = clean["duration_s"].replace(-1, np.nan); log.append(f"sentinel -1 → NaN: {n} rows")
n = (clean["size_mb"] > 1000).sum(); clean.loc[clean["size_mb"] > 1000, "size_mb"] /= 1024; log.append(f"KB → MB: {n} rows")
n = clean.duplicated().sum(); clean = clean.drop_duplicates(); log.append(f"exact duplicates dropped: {n} rows")
print("\\n".join(log))
print(clean[["size_mb", "duration_s"]].mean())`,
      }],
    },
  },
  'l02-seeds': {
    mathCode: {
      rows: [
        ['a seeded generator', 'rng = np.random.default_rng(seed)', 'Same seed → same sequence.'],
        ['a random split', 'idx = rng.permutation(n); train, test = idx[:k], idx[k:]', 'Shuffle positions, then cut.'],
        ['an invariant', 'assert set(train) | set(test) == set(range(n))', 'True for every correct split.'],
      ],
    },
    notebook: {
      title: 'Lab 02.6 · Seeds and invariant tests',
      intro: 'Show that a seeded split repeats exactly, then write the tests that every correct split must pass — and watch them catch a broken one.',
      cells: [{
        title: 'Same seed, same split',
        prose: '**Predict** whether the first two lines match, and the third.',
        code: `import numpy as np

def split(n, seed, test_fraction=0.25):
    rng = np.random.default_rng(seed)
    idx = rng.permutation(n)
    k = int(n * (1 - test_fraction))
    return idx[:k], idx[k:]

print(split(8, seed=42)[1])
print(split(8, seed=42)[1])
print(split(8, seed=7)[1])`,
      }, {
        title: 'Invariants every split must satisfy',
        prose: 'These checks hold for every correct split. **Then break** `split` (for example, use `idx[:k+1]` for training) and rerun.',
        code: `def check_split(train, test, n, test_fraction=0.25):
    assert len(set(train) & set(test)) == 0, "a row is in both parts"
    assert set(train) | set(test) == set(range(n)), "a row is missing"
    assert len(test) == n - int(n * (1 - test_fraction)), "wrong size"
    tr2, te2 = split(n, seed=0)
    assert (split(n, seed=0)[0] == tr2).all(), "same seed gave a different split"
    return "all invariants hold"

train, test = split(80, seed=0)
print(check_split(train, test, 80))
print(np.__version__)`,
      }],
    },
  },
}
