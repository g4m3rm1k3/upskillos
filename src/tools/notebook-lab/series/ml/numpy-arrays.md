# NumPy arrays

Machine learning is arithmetic on a very large scale. A single photo is millions of numbers. Training even a small model means multiplying and adding those numbers billions of times. Python lists can hold numbers, but they were designed to hold anything, one object at a time, and looping over them in Python is far too slow for this.

**NumPy** ("Numerical Python") is the library that makes numerical work in Python fast. Its central object is the **array**: a grid of numbers, all of the same type, stored side by side in memory, with arithmetic that works on the whole grid at once. Almost every data science and machine learning library, including pandas and scikit-learn, is built on NumPy arrays, so this series starts here. This lesson covers creating arrays, doing arithmetic on them without loops, summarising them, and generating random numbers. The next lesson covers selecting parts of arrays and working with their shapes.

## Why not just use lists?

Suppose you have the prices of a million items and want to apply a 10% discount. With a list you need a loop, or a comprehension, which is a loop in disguise:

```python type
import time
import numpy as np

prices = list(range(1_000_000))

start = time.perf_counter()
discounted = [p * 0.9 for p in prices]
list_seconds = time.perf_counter() - start

price_array = np.array(prices)
start = time.perf_counter()
discounted_array = price_array * 0.9
array_seconds = time.perf_counter() - start

print(f"list:  {list_seconds:.4f} s")
print(f"array: {array_seconds:.4f} s")
print(f"the array was about {list_seconds / array_seconds:.0f} times faster")
```

`import numpy as np` is how NumPy is always imported, so `np.` is the prefix you will see everywhere. `time.perf_counter()` reads a precise clock, so subtracting two readings measures how long the code in between took. (The exact times depend on your computer and will change a little each run.)

The timing only measures the arithmetic. Converting a big list into an array takes time too, often longer than the list calculation itself, so the gain comes from keeping data in arrays from the start and working on it many times, which is exactly what machine learning does. For the arithmetic itself, the array version is many times faster, and also shorter: `price_array * 0.9` multiplies **every** element, with no loop in sight. The loop still happens, but inside NumPy's compiled code, which works directly on raw numbers in memory. A Python loop, by contrast, has to handle each number as a separate Python object, checking its type every time. Writing code as operations on whole arrays instead of loops over elements is called **vectorisation**, and it is the most important habit in numerical Python.

## Creating arrays

`np.array` turns a list (or a list of lists) into an array:

```python type
import numpy as np

scores = np.array([72, 88, 95, 61])
print(scores)
print(type(scores))
print(scores.dtype, scores.shape, scores.ndim, scores.size)
```

```output
[72 88 95 61]
<class 'numpy.ndarray'>
int32 (4,) 1 4
```

An array has a few attributes you will use constantly:

- `dtype` is the **data type** of the elements. Every element of an array has the same type. In this notebook it is `int32`: 32-bit integers. On most desktop computers NumPy uses `int64`, 64-bit integers, instead; the difference matters for very large numbers, as a later section shows.
- `shape` is a tuple giving the size along each dimension. `(4,)` means one dimension of length 4. (The comma makes it a one-item tuple, as in Python lesson 11.)
- `ndim` is the number of dimensions, and `size` the total number of elements.

A list of lists becomes a two-dimensional array, a table of rows and columns:

```python type
import numpy as np

table = np.array([[1, 2, 3],
                  [4, 5, 6]])
print(table)
print(table.shape, table.ndim, table.size)
```

```output
[[1 2 3]
 [4 5 6]]
(2, 3) 2 6
```

The shape `(2, 3)` means 2 rows and 3 columns. In machine learning, a dataset is usually a 2D array like this, with one **row per example** (one house, one patient, one image) and one **column per feature** (its size, age or brightness). You will see that layout in nearly every lesson from here on.

NumPy also has functions for creating arrays directly:

```python type
import numpy as np

print(np.zeros(5))
print(np.ones((2, 3)))
print(np.full(3, 7.5))
print(np.arange(0, 10, 2))
print(np.linspace(0, 1, 5))
```

```output
[0. 0. 0. 0. 0.]
[[1. 1. 1.]
 [1. 1. 1.]]
[7.5 7.5 7.5]
[0 2 4 6 8]
[0.   0.25 0.5  0.75 1.  ]
```

- `np.zeros` and `np.ones` fill an array of a given shape with 0 or 1. Pass a tuple for more than one dimension.
- `np.full(shape, value)` fills it with any value.
- `np.arange(start, stop, step)` is like `range`, but gives an array, and works with floats too.
- `np.linspace(start, stop, n)` gives `n` evenly spaced numbers from `start` to `stop`, **including** `stop`. It is the usual way to make the x-values for a smooth plot.

Notice that `np.zeros(5)` gives `0.` with a decimal point: these functions make floats by default, since that is what numerical work usually needs.

## Arithmetic on whole arrays

Arithmetic operators work **element by element**. An array combined with a single number applies the operation to every element; two arrays of the same shape are combined position by position.

Predict each result before running the cell.

```python type
import numpy as np

a = np.array([1, 2, 3, 4])
b = np.array([10, 20, 30, 40])
print(a * 2)
print(a + b)
print(b / a)
print(a ** 2)
print(b - a * 3)
```

```output
[2 4 6 8]
[11 22 33 44]
[10. 10. 10. 10.]
[ 1  4  9 16]
[ 7 14 21 28]
```

Compare that with lists, where the same operators mean something completely different. Predict which of these four lines print six numbers.

```python type
import numpy as np

print([1, 2, 3] * 2)
print(np.array([1, 2, 3]) * 2)
print([1, 2] + [3, 4])
print(np.array([1, 2]) + np.array([3, 4]))
```

```output
[1, 2, 3, 1, 2, 3]
[2 4 6]
[1, 2, 3, 4]
[4 6]
```

For lists, `* 2` repeats and `+` joins, as in Python lesson 5. For arrays they are arithmetic. This is a classic source of bugs when a list sneaks in where an array was expected, so when a result looks strangely long, check whether you have a list.

Comparisons also work element by element, and give an array of `True`/`False` values:

```python type
import numpy as np

temps = np.array([14, 22, 31, 18, 27])
hot = temps > 25
print(hot)
print(hot.sum(), "hot days")
print(temps[hot])
```

```output
[False False  True False  True]
2 hot days
[31 27]
```

A boolean array can be added up, because `True` counts as 1 and `False` as 0, so `hot.sum()` counts the hot days. And `temps[hot]` uses the boolean array to **select** the elements where it is `True`. This is called **boolean masking**, and the next lesson covers it properly.

## Mathematical functions

NumPy has versions of the standard mathematical functions that work on whole arrays at once. They are called **universal functions**, or **ufuncs**.

```python type
import numpy as np

x = np.array([1.0, 4.0, 9.0, 16.0])
print(np.sqrt(x))
print(np.log(x))
print(np.exp(np.array([0.0, 1.0, 2.0])))
print(np.abs(np.array([-3, 5, -7])))
print(np.round(np.array([1.234, 5.678]), 1))
```

```output
[1. 2. 3. 4.]
[0.         1.38629436 2.19722458 2.77258872]
[1.         2.71828183 7.3890561 ]
[3 5 7]
[1.2 5.7]
```

`np.log` is the natural logarithm and `np.exp` its inverse, raising e ≈ 2.718 to a power. Both appear constantly in machine learning, for example in the functions that turn a model's raw scores into probabilities.

Use NumPy's functions on arrays, not the `math` module's. `math.sqrt` only accepts a single number, and fails on an array:

```python error TypeError
import math
import numpy as np

print(math.sqrt(np.array([1.0, 4.0, 9.0])))
```

## Summarising an array

Arrays have methods that reduce them to a single number:

```python type
import numpy as np

heights = np.array([1.62, 1.75, 1.58, 1.81, 1.70])
print(heights.sum(), heights.mean())
print(heights.min(), heights.max())
print(heights.std())
print(heights.argmax(), heights.argmin())
```

```output
8.459999999999999 1.6919999999999997
1.58 1.81
0.08376156636548768
3 2
```

The sum prints as `8.459999999999999` rather than 8.46: float arithmetic is very slightly inexact, as you saw in Python lesson 2, so round results when you show them to people. `mean` is the average. `std` is the **standard deviation**, a measure of how spread out the values are around the mean; a later lesson explains exactly how it is calculated. `argmax` gives the **position** of the largest value rather than the value itself, which is often what you need: "which example scored highest?"

For a 2D array, these methods take an **axis** argument that says which direction to summarise along. `axis=0` collapses the rows, giving one result per column; `axis=1` collapses the columns, giving one result per row.

```python type
import numpy as np

marks = np.array([[70, 85, 90],
                  [60, 75, 80],
                  [90, 95, 85]])
print(marks.mean(axis=0))
print(marks.mean(axis=1))
print(marks.mean())
```

```output
[73.33333333 85.         85.        ]
[81.66666667 71.66666667 90.        ]
81.11111111111111
```

If each row is a student and each column a test, `axis=0` gives each test's average and `axis=1` each student's. With no axis, you get the mean of all nine numbers. A way to remember it: the axis you name is the one that disappears.

## Data types

Every array has one `dtype`, and it matters. NumPy picks one from the values you give it, and converts between them when needed. Predict what `-1.9` becomes when converted to an integer.

```python type
import numpy as np

counts = np.array([1, 2, 3])
print(counts.dtype, (counts / 2).dtype)
mixed = np.array([1, 2.5, 3])
print(mixed, mixed.dtype)
as_ints = np.array([1.9, -1.9, 2.5]).astype(int)
print(as_ints)
```

```output
int32 float64
[1.  2.5 3. ] float64
[ 1 -1  2]
```

Division produces floats, as in plain Python. A list mixing integers and floats becomes a float array, since every element must share one type. `astype(int)` converts to integers by cutting off the decimal part towards zero, like Python's `int()`, which is why `1.9` becomes 1 and `-1.9` becomes -1.

Unlike Python's integers, which grow as large as needed, NumPy integers have a fixed size. A 32-bit integer can only hold values up to 2,147,483,647 (about 2.1 billion). Go past that, and the result silently **wraps around** to a large negative number, with no error:

```python type
import numpy as np

big = np.array([2_147_483_647])
print(big.dtype, big + 1)
print(np.array([50_000]) ** 2)
print(np.array([50_000], dtype=np.int64) ** 2)
print(np.array([50_000.0]) ** 2)
```

```output
int32 [-2147483648]
[-1794967296]
[2500000000]
[2.5e+09]
```

Squaring 50,000 should give 2.5 billion, but in `int32` it wraps to a negative number. Asking for a bigger type with `dtype=np.int64`, or using floats, gives the right answer. This silent wrap-around is a real trap when counting or multiplying large numbers, and it is one reason most numerical work uses floats.

## Random numbers

Machine learning uses random numbers everywhere: to shuffle data, to split it into parts, to start a model's parameters at random values, and to simulate. NumPy's random numbers come from a **generator** object, created with a seed so results are repeatable, exactly like `random.seed` in Python lesson 16.

```python type
import numpy as np

rng = np.random.default_rng(42)
print(rng.integers(1, 7, size=10))
print(rng.random(3))
print(rng.normal(loc=170, scale=10, size=5).round(1))
print(rng.choice(["red", "green", "blue"], size=4))
```

```output
[1 5 4 3 3 6 1 5 2 1]
[0.97562235 0.7611397  0.78606431]
[169.8 161.5 178.8 177.8 170.7]
['green' 'blue' 'green' 'green']
```

- `rng.integers(low, high, size)` gives whole numbers from `low` up to but **not** including `high`, so `integers(1, 7)` simulates a die. (Python's `random.randint` included both ends; NumPy follows the usual Python rule of excluding the end.)
- `rng.random(size)` gives floats between 0 and 1.
- `rng.normal(loc, scale, size)` gives numbers from a **normal distribution**, the bell curve, centred on `loc` and spread out by `scale`. The probability lessons later in this series explain it.
- `rng.choice(items, size)` picks at random from a collection.

With a generator you can simulate thousands of experiments in one line. What fraction of 100,000 die rolls are sixes?

```python type
import numpy as np

rng = np.random.default_rng(0)
rolls = rng.integers(1, 7, size=100_000)
print((rolls == 6).mean())
print(1 / 6)
```

```output
0.16536
0.16666666666666666
```

`rolls == 6` is a boolean array, and its mean is the fraction of `True` values. With enough rolls, the fraction comes out very close to the exact probability, one sixth.

::: challenge Scale to 0–1 [easy]
Many machine learning methods work better when every feature is on the same scale. Write a function `min_max_scale(values)` that takes a NumPy array and returns a new array where the smallest value becomes 0, the largest becomes 1, and everything else is in proportion between them:

\[
\text{scaled} = \frac{x - \min}{\max - \min}
\]

Use array arithmetic, with no loop. `min_max_scale(np.array([10, 15, 20]))` returns `array([0. , 0.5, 1. ])`.

```python starter
import numpy as np

def min_max_scale(values):
    return values

print(min_max_scale(np.array([10, 15, 20])))
```

```python solution
import numpy as np

def min_max_scale(values):
    return (values - values.min()) / (values.max() - values.min())

print(min_max_scale(np.array([10, 15, 20])))
```

```python test
import numpy as _np
import ast as _ast
assert "min_max_scale" in dir(), "Keep the function's name as min_max_scale."
assert not any(isinstance(_n, (_ast.For, _ast.While, _ast.ListComp)) for _n in _ast.walk(_ast.parse(_source))), "Use array arithmetic on the whole array, with no loop or comprehension."
for _v in [_np.array([10, 15, 20]), _np.array([3.0, -1.0, 7.0, 1.0]), _np.array([0, 100])]:
    _got = min_max_scale(_v)
    _want = (_v - _v.min()) / (_v.max() - _v.min())
    assert isinstance(_got, _np.ndarray), f"min_max_scale should return a NumPy array, got {type(_got).__name__}."
    assert _np.allclose(_got, _want), f"For {_v} the result should be {_want}, but got {_got}."
_big = _np.arange(1_000_000, dtype=float)
_r = min_max_scale(_big)
assert _r[0] == 0 and _r[-1] == 1, "The smallest value should become 0 and the largest 1."
"SUCCESS: One line, no loop, and it scales a million values instantly."
```

Hint: `values.min()` and `values.max()` are single numbers. Subtracting a number from an array subtracts it from every element, and dividing an array by a number divides every element.
:::

::: challenge Weather summary [easy]
Write a function `summarise(temps)` that takes a NumPy array of daily temperatures and returns a dictionary with:

- `"mean"`: the average temperature, rounded to 1 decimal place,
- `"range"`: the highest minus the lowest,
- `"hot_days"`: how many days were above 25,
- `"hottest_day"`: the **position** of the hottest day (the first one, if several tie).

Use NumPy methods and boolean arrays; no loops.

```python starter
import numpy as np

def summarise(temps):
    return {}

print(summarise(np.array([18, 26, 31, 22, 31, 15])))
```

```python solution
import numpy as np

def summarise(temps):
    return {
        "mean": round(float(temps.mean()), 1),
        "range": temps.max() - temps.min(),
        "hot_days": int((temps > 25).sum()),
        "hottest_day": int(temps.argmax()),
    }

print(summarise(np.array([18, 26, 31, 22, 31, 15])))
```

```python test
import numpy as _np
import ast as _ast
assert "summarise" in dir(), "Keep the function's name as summarise."
assert not any(isinstance(_n, (_ast.For, _ast.While)) for _n in _ast.walk(_ast.parse(_source))), "Use NumPy methods and boolean arrays instead of loops."
for _t in [_np.array([18, 26, 31, 22, 31, 15]), _np.array([5.5, 6.0, 4.5]), _np.array([30, 30, 30])]:
    _got = summarise(_t)
    assert isinstance(_got, dict), "summarise should return a dictionary."
    _want = {"mean": round(float(_t.mean()), 1), "range": _t.max() - _t.min(), "hot_days": int((_t > 25).sum()), "hottest_day": int(_t.argmax())}
    for _k, _v in _want.items():
        assert _k in _got, f"The dictionary is missing the key {_k!r}."
        assert _np.isclose(_got[_k], _v), f"For {_t}, {_k!r} should be {_v}, but it is {_got[_k]}."
"SUCCESS: A whole summary without a single loop."
```

Hint: `temps.mean()`, `temps.max()`, `temps.min()` and `temps.argmax()` do most of it. For the hot days, compare the whole array with 25 and add up the resulting booleans.
:::

::: challenge Simulate coin flips [easy]
Write a function `heads_share(n, seed)` that simulates `n` coin flips and returns the fraction that came up heads. Create the generator with `np.random.default_rng(seed)`, and flip all the coins in **one** call, `rng.integers(0, 2, size=n)`, where 1 means heads. Then write a second function `heads_fractions(n, trials, seed)` that returns a NumPy array of the heads fraction in each of `trials` separate experiments of `n` flips, all drawn from **one** generator with **one** call to `rng.integers(0, 2, size=(trials, n))`.

For large `n`, the fractions cluster tightly around 0.5; for small `n`, they spread out widely. The last line of the starter shows this.

```python starter
import numpy as np

def heads_share(n, seed):
    return 0.5

def heads_fractions(n, trials, seed):
    return np.zeros(trials)

print(heads_share(1000, 1))
print(heads_fractions(10, 5, 1), heads_fractions(10_000, 5, 1))
```

```python solution
import numpy as np

def heads_share(n, seed):
    rng = np.random.default_rng(seed)
    flips = rng.integers(0, 2, size=n)
    return flips.mean()

def heads_fractions(n, trials, seed):
    rng = np.random.default_rng(seed)
    flips = rng.integers(0, 2, size=(trials, n))
    return flips.mean(axis=1)

print(heads_share(1000, 1))
print(heads_fractions(10, 5, 1), heads_fractions(10_000, 5, 1))
```

```python test
import numpy as _np
assert "heads_share" in dir() and "heads_fractions" in dir(), "Keep both function names."
for _n, _s in [(1000, 1), (10, 7), (1, 3)]:
    _want = _np.random.default_rng(_s).integers(0, 2, size=_n).mean()
    _got = heads_share(_n, _s)
    assert _np.isclose(_got, _want), f"heads_share({_n}, {_s}) should be {_want}, got {_got}. Create the generator from the seed and flip with one rng.integers(0, 2, size=n) call."
for _n, _t, _s in [(10, 5, 1), (100, 3, 2)]:
    _want = _np.random.default_rng(_s).integers(0, 2, size=(_t, _n)).mean(axis=1)
    _got = heads_fractions(_n, _t, _s)
    assert isinstance(_got, _np.ndarray) and _got.shape == (_t,), f"heads_fractions({_n}, {_t}, {_s}) should return an array of {_t} fractions, got {_got!r}."
    assert _np.allclose(_got, _want), f"heads_fractions({_n}, {_t}, {_s}) should be {_want}, got {_got}. Use one call with size=(trials, n), then average each row."
"SUCCESS: Thousands of experiments in a single array operation."
```

Hint: The fraction of heads is the mean of the 0s and 1s. With `size=(trials, n)` you get a 2D array with one experiment per row; average along `axis=1` to get one fraction per row.
:::

## What you learned

- NumPy arrays hold numbers of one type side by side in memory. Operations on whole arrays run in compiled code, so they are much faster than Python loops. Writing code this way is called vectorisation.
- `np.array` makes an array from a list; `np.zeros`, `np.ones`, `np.full`, `np.arange` and `np.linspace` create arrays directly. `shape`, `ndim`, `size` and `dtype` describe them.
- In machine learning, a dataset is usually a 2D array with one row per example and one column per feature.
- Arithmetic and comparisons work element by element. Lists behave differently: `*` repeats and `+` joins.
- Universal functions like `np.sqrt`, `np.exp` and `np.log` apply to every element.
- `sum`, `mean`, `min`, `max`, `std`, `argmax` and `argmin` summarise an array; `axis=0` works down the columns and `axis=1` along the rows.
- A boolean array counts with `sum`, gives a fraction with `mean`, and selects elements as a mask.
- `rng = np.random.default_rng(seed)` makes a repeatable random generator, with `integers` (end excluded), `random`, `normal` and `choice`.

Next you will take arrays apart and reshape them: indexing and slicing in several dimensions, boolean masks, and broadcasting, the rule that decides what happens when arrays of different shapes meet.
