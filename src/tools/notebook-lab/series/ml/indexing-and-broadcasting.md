# Indexing, shapes and broadcasting

In the last lesson you worked with arrays as a whole: multiply every element, sum everything, take the mean of each column. Real data work constantly needs **parts** of arrays: the first 100 rows for training and the rest for testing, one column of a table, every example with a missing value, every pixel brighter than some threshold. It also constantly needs to combine arrays of **different shapes**, like subtracting each column's average from every row of a table.

This lesson covers the tools for both. Indexing and slicing pick out parts of an array in any number of dimensions. Boolean masks and index arrays select elements by a condition or by a list of positions. Reshaping changes how the same numbers are arranged. And **broadcasting** is NumPy's rule for combining arrays whose shapes differ, which is behind a huge share of the one-line operations in machine learning code.

## Indexing and slicing one dimension

A one-dimensional array is indexed and sliced exactly like a list: positions start at 0, negative indexes count from the end, and a slice stops just before its end index.

```python type
import numpy as np

a = np.arange(10, 20)
print(a)
print(a[0], a[-1])
print(a[2:5])
print(a[::3])
print(a[::-1])
```

```output
[10 11 12 13 14 15 16 17 18 19]
10 19
[12 13 14]
[10 13 16 19]
[19 18 17 16 15 14 13 12 11 10]
```

`np.arange(10, 20)` gives the numbers 10 to 19. `a[2:5]` takes positions 2, 3 and 4, and `a[::3]` every third element.

## Two dimensions: rows and columns

A 2D array takes **two** indexes inside one pair of square brackets, separated by a comma: first the row, then the column.

```python type
import numpy as np

grid = np.array([[ 1,  2,  3,  4],
                 [ 5,  6,  7,  8],
                 [ 9, 10, 11, 12]])
print(grid[1, 2])
print(grid[0])
print(grid[:, 1])
print(grid[1:, 2:])
print(grid[-1, ::2])
```

```output
7
[1 2 3 4]
[ 2  6 10]
[[ 7  8]
 [11 12]]
[ 9 11]
```

Predict each line before you run it, reading every index as `[rows, columns]`:

- `grid[1, 2]` is row 1, column 2: the single number 7.
- `grid[0]` with one index gives the whole first row.
- `grid[:, 1]` uses a colon, meaning "everything", for the rows, and 1 for the column: the whole second column, `[2, 6, 10]`. Taking a column this way is something a list of lists cannot do in one step.
- `grid[1:, 2:]` slices both: rows from 1 on, columns from 2 on, a 2 by 2 block.
- `grid[-1, ::2]` is the last row, every second column.

In a dataset with one row per example and one column per feature, `X[:, j]` is feature `j` for every example, and `X[i]` is every feature of example `i`. You will write both constantly.

## Slices are views, not copies

Here is an important difference from lists. Slicing a list makes a new list (Python lesson 12). Slicing a NumPy array does **not** copy the data: it gives a **view**, a new way of looking at the **same** numbers in memory. Change the view, and the original changes too. Predict the last line.

```python type
import numpy as np

data = np.array([10, 20, 30, 40, 50])
middle = data[1:4]
middle[0] = 999
print(middle)
print(data)
```

```output
[999  30  40]
[ 10 999  30  40  50]
```

`data` now contains 999, because `middle` was a view onto part of it. NumPy does this deliberately: arrays can be enormous, and copying every slice would waste memory and time. When you do need an independent copy, ask for one with `.copy()`:

```python type
import numpy as np

data = np.array([10, 20, 30, 40, 50])
middle = data[1:4].copy()
middle[0] = 999
print(data)
```

```output
[10 20 30 40 50]
```

A slice being a view is the source of some very confusing bugs, where a function that "only looked at part of the data" quietly changed it. If you modify a slice and do not intend to change the original, copy it first.

## Boolean masks

You met boolean masks at the end of the last lesson. A comparison gives an array of `True`/`False` values of the same shape, and using it as an index keeps only the elements where it is `True`.

```python type
import numpy as np

ages = np.array([23, 17, 45, 12, 67, 34])
adults = ages >= 18
print(adults)
print(ages[adults])
print(ages[ages < 18])
```

```output
[ True False  True False  True  True]
[23 45 67 34]
[17 12]
```

The condition can go straight inside the brackets, as in `ages[ages < 18]`, which reads almost like English: "the ages where age is under 18".

To combine conditions, use `&` for "and", `|` for "or" and `~` for "not", and put **parentheses around each comparison**. Python's `and`, `or` and `not` do not work on arrays, because they need a single `True` or `False`, and an array of many values is neither.

```python type
import numpy as np

ages = np.array([23, 17, 45, 12, 67, 34])
print(ages[(ages >= 18) & (ages < 65)])
print(ages[(ages < 18) | (ages >= 65)])
print(ages[~(ages > 30)])
```

```output
[23 45 34]
[17 12 67]
[23 17 12]
```

The parentheses matter because `&` and `|` are worked out before `<` and `>=`. Leave them out and Python first computes `18 & ages`, and the comparisons then go wrong in a confusing way. This is the error you will meet:

```python error ValueError
import numpy as np

ages = np.array([23, 17, 45, 12, 67, 34])
print(ages[ages >= 18 & ages < 65])
```

"The truth value of an array with more than one element is ambiguous" is NumPy's way of saying that something needed a single `True` or `False` but got a whole array. It is almost always missing parentheses around comparisons, or `and`/`or` where `&`/`|` were needed.

A mask can also be the target of an assignment, which changes only the selected elements. This is how you clean data in one line:

```python type
import numpy as np

readings = np.array([12.5, -999.0, 13.1, 12.9, -999.0, 14.2])
readings[readings == -999.0] = np.nan
print(readings)
print(np.nanmean(readings))
```

```output
[12.5  nan 13.1 12.9  nan 14.2]
13.175
```

Sensors and spreadsheets often use a special value like -999 to mean "missing". `np.nan` ("not a number") is the standard floating-point value for a missing or undefined number. Ordinary `mean` would return `nan` if any value is `nan`, so NumPy provides `nanmean`, `nanmax` and friends, which ignore the missing values.

`np.where(condition, a, b)` builds a new array, taking elements from `a` where the condition is true and from `b` where it is false. It is the array version of the conditional expression `a if condition else b`:

```python type
import numpy as np

scores = np.array([45, 72, 38, 90, 61])
print(np.where(scores >= 50, "pass", "fail"))
print(np.where(scores > 60, scores, 0))
```

```output
['fail' 'pass' 'fail' 'pass' 'pass']
[ 0 72  0 90 61]
```

## Selecting with a list of positions

Instead of a slice or a mask, you can index with a list or array of positions. This is called **fancy indexing**, and it picks those elements in that order, repeats included:

```python type
import numpy as np

letters = np.array(["a", "b", "c", "d", "e"])
print(letters[[0, 2, 4]])
print(letters[[4, 0, 0]])

rng = np.random.default_rng(1)
order = rng.permutation(5)
print(order, letters[order])
```

```output
['a' 'c' 'e']
['e' 'a' 'a']
[4 0 1 2 3] ['e' 'a' 'b' 'c' 'd']
```

`rng.permutation(5)` is the numbers 0 to 4 in a random order. Indexing with it **shuffles** the array. This exact trick is how datasets are shuffled before being split into training and test parts: make one random order, and use it to index both the features and the labels, so each example stays matched with its label.

Unlike slicing, **reading** with fancy indexing or a boolean mask always produces a **copy**, not a view. Assigning **through** one, as in `readings[readings == -999.0] = np.nan` above, writes into the original array.

## Changing the shape

`reshape` arranges the same elements into a different shape, as long as the total number of elements stays the same. The elements are read and written row by row.

```python type
import numpy as np

numbers = np.arange(12)
print(numbers.reshape(3, 4))
print(numbers.reshape(4, 3))
print(numbers.reshape(2, -1))
print(numbers.reshape(3, 4).T)
```

```output
[[ 0  1  2  3]
 [ 4  5  6  7]
 [ 8  9 10 11]]
[[ 0  1  2]
 [ 3  4  5]
 [ 6  7  8]
 [ 9 10 11]]
[[ 0  1  2  3  4  5]
 [ 6  7  8  9 10 11]]
[[ 0  4  8]
 [ 1  5  9]
 [ 2  6 10]
 [ 3  7 11]]
```

`reshape(3, 4)` gives 3 rows of 4. A `-1` means "work this dimension out for me": 12 elements in 2 rows must mean 6 columns. `.T` gives the **transpose**, swapping rows and columns, so a 3 by 4 array becomes 4 by 3.

Two shapes cause endless small confusions in machine learning: a 1D array of shape `(n,)`, and a 2D array with one column, shape `(n, 1)`. They hold the same numbers, but they are different arrays and behave differently, as the next section shows. Libraries such as scikit-learn often insist on the 2D form for their input. `reshape(-1, 1)` turns a 1D array into a single column, and `ravel()` flattens anything back to 1D:

```python type
import numpy as np

v = np.array([1, 2, 3])
column = v.reshape(-1, 1)
print(v.shape, column.shape)
print(column)
print(column.ravel())
```

```output
(3,) (3, 1)
[[1]
 [2]
 [3]]
[1 2 3]
```

To join arrays, `np.concatenate` puts them end to end along an existing axis, and `np.column_stack` puts 1D arrays side by side as the columns of a table:

```python type
import numpy as np

heights = np.array([1.62, 1.75, 1.80])
weights = np.array([58, 72, 80])
table = np.column_stack([heights, weights])
print(table)
print(np.concatenate([heights, np.array([1.55])]))
```

```output
[[ 1.62 58.  ]
 [ 1.75 72.  ]
 [ 1.8  80.  ]]
[1.62 1.75 1.8  1.55]
```

## Broadcasting

What happens when you add arrays of different shapes? In the last lesson, `array * 2` multiplied every element by a single number. That was the simplest case of a general rule called **broadcasting**: NumPy stretches the smaller array, without actually copying it, so that the shapes match.

The most common use: subtract each column's mean from every row, so that every feature is centred on zero.

```python type
import numpy as np

X = np.array([[1.0, 200.0],
              [3.0, 400.0],
              [5.0, 600.0]])
column_means = X.mean(axis=0)
print(column_means, column_means.shape)
print(X - column_means)
```

```output
[  3. 400.] (2,)
[[  -2. -200.]
 [   0.    0.]
 [   2.  200.]]
```

`X` has shape `(3, 2)` and `column_means` has shape `(2,)`. NumPy lines the shapes up from the **right**, and treats the `(2,)` array as a row that is repeated for every one of the 3 rows. So each row has `[3, 400]` subtracted from it, and each column of the result is centred on zero.

The rule, comparing the shapes from the rightmost dimension leftwards:

1. Two dimensions are compatible if they are **equal**, or if **one of them is 1**. A dimension of 1 is stretched to match the other.
2. If one array has fewer dimensions, it is treated as having extra dimensions of size 1 on the **left**.
3. If any pair of dimensions is neither equal nor 1, the operation fails.

Now the difference between `(n,)` and `(n, 1)`. Predict the shape of each result.

```python type
import numpy as np

row = np.array([10, 20, 30])
col = np.array([[1], [2], [3]])
print((row + row).shape)
print(row + col)
print((row + col).shape)
```

```output
(3,)
[[11 21 31]
 [12 22 32]
 [13 23 33]]
(3, 3)
```

`row + row` is `(3,)`, as you would expect. But `row` is shape `(3,)` and `col` is `(3, 1)`: lining them up from the right gives `(1, 3)` against `(3, 1)`, and every 1 stretches, so the result is a full `(3, 3)` table in which every row value has been added to every column value. This is powerful when you want it, such as building a table of every combination. When you do not, it is a silent bug: you expected 3 numbers and got 9. Printing `.shape` whenever you are unsure is the cure.

When shapes cannot be broadcast, NumPy says so:

```python error ValueError
import numpy as np

a = np.ones((3, 2))
b = np.ones(3)
print(a + b)
```

`(3, 2)` against `(3,)`: the rightmost dimensions are 2 and 3, neither equal nor 1. The message lists both shapes, which tells you exactly what went wrong. To add a value to each **row** here, `b` needs shape `(3, 1)`: `a + b.reshape(-1, 1)` works.

::: challenge Split a dataset [easy]
Machine learning models are tested on data they were not trained on. Write a function `train_test_split(X, y, test_fraction, seed)` that:

1. makes a random order of the row positions with `np.random.default_rng(seed).permutation(len(X))`,
2. uses that order to shuffle both `X` (a 2D array of features) and `y` (a 1D array of labels) the same way,
3. puts the **last** `int(len(X) * test_fraction)` shuffled rows in the test set and the rest in the training set,

and returns `X_train, X_test, y_train, y_test`, in that order.

```python starter
import numpy as np

def train_test_split(X, y, test_fraction, seed):
    return X, X, y, y

X = np.arange(20).reshape(10, 2)
y = np.arange(10)
X_train, X_test, y_train, y_test = train_test_split(X, y, 0.3, seed=0)
print(X_train.shape, X_test.shape, y_test)
```

```python solution
import numpy as np

def train_test_split(X, y, test_fraction, seed):
    order = np.random.default_rng(seed).permutation(len(X))
    X_shuffled = X[order]
    y_shuffled = y[order]
    n_test = int(len(X) * test_fraction)
    split = len(X) - n_test
    return X_shuffled[:split], X_shuffled[split:], y_shuffled[:split], y_shuffled[split:]

X = np.arange(20).reshape(10, 2)
y = np.arange(10)
X_train, X_test, y_train, y_test = train_test_split(X, y, 0.3, seed=0)
print(X_train.shape, X_test.shape, y_test)
```

```python test
import numpy as _np
assert "train_test_split" in dir(), "Keep the function's name as train_test_split."
_X = _np.arange(20).reshape(10, 2)
_y = _np.arange(10)
_out = train_test_split(_X, _y, 0.3, 0)
assert len(_out) == 4, "Return four arrays: X_train, X_test, y_train, y_test."
_Xtr, _Xte, _ytr, _yte = _out
assert _Xtr.shape == (7, 2) and _Xte.shape == (3, 2) and _ytr.shape == (7,) and _yte.shape == (3,), f"With 10 rows and a test fraction of 0.3 the shapes should be (7, 2), (3, 2), (7,), (3,), but got {_Xtr.shape}, {_Xte.shape}, {_ytr.shape}, {_yte.shape}."
_order = _np.random.default_rng(0).permutation(10)
assert _np.array_equal(_yte, _y[_order][7:]), f"The test labels should be the last 3 of the shuffled labels, {_y[_order][7:]}, but got {_yte}."
assert _np.array_equal(_Xte[:, 0] // 2, _yte), "Each row of X must stay matched with its label: shuffle X and y with the same order."
assert sorted(_np.concatenate([_ytr, _yte]).tolist()) == list(range(10)), "Every example should appear exactly once across train and test."
"SUCCESS: One permutation, applied to both arrays, keeps every example with its label."
```

Hint: Index both `X` and `y` with the same `order` array. The split point is the number of rows minus the number of test rows; slice before it for training and from it for testing.
:::

::: challenge Standardise the features [medium]
Many models need every feature (column) to have mean 0 and standard deviation 1. (Use NumPy's default `std`; a later lesson explains a small variation of it used in statistics.) Write a function `standardise(X)` that takes a 2D array and returns a new array where every column has had its own mean subtracted and has then been divided by its own standard deviation. Use broadcasting; no loops.

```python starter
import numpy as np

def standardise(X):
    return X

X = np.array([[1.0, 200.0], [3.0, 400.0], [5.0, 600.0]])
Z = standardise(X)
print(Z.round(3))
print(Z.mean(axis=0).round(3), Z.std(axis=0).round(3))
```

```python solution
import numpy as np

def standardise(X):
    return (X - X.mean(axis=0)) / X.std(axis=0)

X = np.array([[1.0, 200.0], [3.0, 400.0], [5.0, 600.0]])
Z = standardise(X)
print(Z.round(3))
print(Z.mean(axis=0).round(3), Z.std(axis=0).round(3))
```

```python test
import numpy as _np
import ast as _ast
assert "standardise" in dir(), "Keep the function's name as standardise."
assert not any(isinstance(_n, (_ast.For, _ast.While, _ast.ListComp)) for _n in _ast.walk(_ast.parse(_source))), "Use broadcasting on the whole array, with no loop."
_rng = _np.random.default_rng(3)
for _X in [_np.array([[1.0, 200.0], [3.0, 400.0], [5.0, 600.0]]), _rng.normal(50, 10, size=(40, 3))]:
    _orig = _X.copy()
    _Z = standardise(_X)
    assert _Z.shape == _X.shape, f"The result should keep the shape {_X.shape}, but it is {_Z.shape}."
    assert _np.allclose(_Z.mean(axis=0), 0), f"Every column should have mean 0, but the column means are {_Z.mean(axis=0)}."
    assert _np.allclose(_Z.std(axis=0), 1), f"Every column should have standard deviation 1, but they are {_Z.std(axis=0)}."
    assert _np.array_equal(_X, _orig), "standardise should return a new array and leave X unchanged."
"SUCCESS: Every feature is now on the same scale, in one broadcast line."
```

Hint: `X.mean(axis=0)` and `X.std(axis=0)` each give one number per column, shape `(n_columns,)`. That shape broadcasts against every row of `X`.
:::

::: challenge Distances to every point [medium]
Write a function `distances(points, target)` that takes a 2D array `points` with one point per row, shape `(n, 2)`, and a single point `target`, shape `(2,)`, and returns a 1D array of the straight-line distance from each point to the target. By Pythagoras' theorem, the distance between points `(x₁, y₁)` and `(x₂, y₂)` is

\[
d = \sqrt{(x_1 - x_2)^2 + (y_1 - y_2)^2}
\] Then write `nearest_index(points, target)`, returning the row position of the nearest point. No loops.

This calculation is the heart of the k-nearest-neighbours method later in this series.

```python starter
import numpy as np

def distances(points, target):
    return np.zeros(len(points))

def nearest_index(points, target):
    return 0

pts = np.array([[0, 0], [3, 4], [1, 1], [-2, 2]])
print(distances(pts, np.array([1, 2])))
print(nearest_index(pts, np.array([1, 2])))
```

```python solution
import numpy as np

def distances(points, target):
    differences = points - target
    return np.sqrt((differences ** 2).sum(axis=1))

def nearest_index(points, target):
    return int(distances(points, target).argmin())

pts = np.array([[0, 0], [3, 4], [1, 1], [-2, 2]])
print(distances(pts, np.array([1, 2])))
print(nearest_index(pts, np.array([1, 2])))
```

```python test
import numpy as _np
import ast as _ast
assert "distances" in dir() and "nearest_index" in dir(), "Keep both function names."
assert not any(isinstance(_n, (_ast.For, _ast.While, _ast.ListComp)) for _n in _ast.walk(_ast.parse(_source))), "Use broadcasting instead of a loop."
_pts = _np.array([[0, 0], [3, 4], [1, 1], [-2, 2]])
_t = _np.array([1, 2])
_want = _np.sqrt(((_pts - _t) ** 2).sum(axis=1))
_got = distances(_pts, _t)
assert _np.shape(_got) == (4,), f"distances should return one number per point, shape (4,), but got shape {_np.shape(_got)}."
assert _np.allclose(_got, _want), f"The distances should be {_want.round(3)}, but got {_np.round(_got, 3)}."
assert nearest_index(_pts, _t) == 2, f"The nearest point to (1, 2) is at row 2, (1, 1), but nearest_index returned {nearest_index(_pts, _t)}."
_rng = _np.random.default_rng(5)
_P = _rng.normal(size=(200, 2))
_T = _np.array([0.3, -0.1])
assert nearest_index(_P, _T) == int(_np.sqrt(((_P - _T) ** 2).sum(axis=1)).argmin()), "nearest_index gave the wrong row for a larger random set of points."
"SUCCESS: Every distance at once, thanks to broadcasting."
```

Hint: `points - target` broadcasts the target across every row, giving each point's difference in x and y. Square, add up along each row (which axis collapses the columns?), and take the square root. `argmin` then gives the position of the smallest distance.
:::

## What you learned

- 1D arrays index and slice like lists. 2D arrays take `[row, column]`: `X[i]` is a row, `X[:, j]` a column, `X[a:b, c:d]` a block.
- Slices are **views** onto the same memory: changing them changes the original. Use `.copy()` for an independent array.
- A boolean mask selects elements: `a[a > 0]`. Combine conditions with `&`, `|` and `~`, with parentheses around each comparison. Assigning to a mask changes only those elements.
- `np.nan` marks missing values, and `np.nanmean` and similar functions ignore them. `np.where(condition, a, b)` chooses element by element.
- Indexing with a list or array of positions (fancy indexing) selects and reorders; `rng.permutation(n)` gives a random order for shuffling. Masks and fancy indexing produce copies.
- `reshape` rearranges elements (`-1` means "work it out"), `.T` transposes, `ravel` flattens, and `reshape(-1, 1)` makes a column. `(n,)` and `(n, 1)` are different shapes.
- Broadcasting lines shapes up from the right; each pair of dimensions must be equal or 1, and 1s are stretched. It lets you combine a table with a row or a column in one step, and it silently makes a table when you mix `(n,)` and `(n, 1)`.

Numbers alone are hard to understand. Next you will learn to plot them with matplotlib: line plots, scatter plots and histograms, chosen to answer a specific question about the data.
