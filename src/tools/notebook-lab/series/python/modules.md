# Modules and the standard library

Everything so far has used only what is built into Python from the moment it starts: `print`, `len`, lists, dictionaries. That is a deliberately small core. Most of Python's power lives in **modules**: files of ready-made functions and tools that you load when you need them. Python comes with a large collection of them, called the **standard library**, covering mathematics, random numbers, dates and times, file formats, and a great deal more. Python is often described as coming with "batteries included" because of it.

This lesson shows how to import modules, and tours the parts of the standard library you will use most. Several of them do properly what you have been doing by hand, like the counting and grouping patterns from lesson 10. Knowing what already exists is a real skill: the fastest code to write, and the least likely to have bugs, is code someone else has already written and tested.

## Importing a module

The `import` statement loads a module and gives you a name for it. You then reach the module's contents with a dot, just as you call a method on a value.

```python type
import math

print(math.sqrt(16))
print(math.pi)
print(math.floor(3.7), math.ceil(3.2))
print(math.isclose(0.1 + 0.2, 0.3))
```

```output
4.0
3.141592653589793
3 4
True
```

`math.sqrt` is the `sqrt` function that belongs to the `math` module. `math.floor` rounds down and `math.ceil` rounds up. And `math.isclose` is the proper way to do what lesson 4 did with `abs(a - b) < 1e-9`: it asks whether two floats are equal apart from the tiny errors of floating-point arithmetic. One catch: by default it measures closeness relative to the size of the numbers, which does not work when one of them is 0. To compare with 0, give an absolute tolerance: `math.isclose(x, 0, abs_tol=1e-9)`.

Imports normally go at the top of a program, so that a reader can see at a glance which modules it depends on. Importing the same module twice is harmless: Python only loads it once.

## Other ways to import

If you use one or two things from a module often, you can import them by name. Then you use them without the module prefix:

```python type
from math import sqrt, pi

print(sqrt(2))
print(round(pi, 4))
```

```output
1.4142135623730951
3.1416
```

You can also give a module a shorter name with `as`. Some modules are nearly always imported this way; in the Machine Learning series you will see `import numpy as np` at the top of almost every notebook.

```python type
import statistics as stats

print(stats.mean([2, 4, 9]))
print(stats.median([2, 4, 9, 100]))
```

```output
5
6.5
```

There is also `from math import *`, which imports every name in the module at once. Avoid it. It fills your program with names you cannot see, any of which might silently replace one of yours, and a reader can no longer tell where a name came from.

## Exploring a module

How do you find out what a module contains? `dir(module)` lists its names, and `help(something)` shows the documentation for a function.

```python type
import math

names = [name for name in dir(math) if not name.startswith("_")]
print(len(names), "names in math, including:", names[:12])
help(math.hypot)
```

```output
62 names in math, including: ['acos', 'acosh', 'asin', 'asinh', 'atan', 'atan2', 'atanh', 'cbrt', 'ceil', 'comb', 'copysign', 'cos']
Help on built-in function hypot in module math:

hypot(...)
    hypot(*coordinates) -> value

    Multidimensional Euclidean distance from the origin to a point.

    Roughly equivalent to:
        sqrt(sum(x**2 for x in coordinates))

    For a two dimensional point (x, y), gives the hypotenuse
    using the Pythagorean theorem:  sqrt(x*x + y*y).

    For example, the hypotenuse of a 3/4/5 right triangle is:

        >>> hypot(3.0, 4.0)
        5.0
```

(Names that start with an underscore are internal to the module, so the comprehension leaves them out.) The official Python documentation describes every module in the standard library in detail, and searching for "python" plus what you want to do usually finds the right module quickly.

## random: chance, games and simulations

The `random` module produces random numbers, and picks and shuffles things at random.

```python type
import random

random.seed(7)
print(random.random())
print(random.randint(1, 6))
print(random.choice(["rock", "paper", "scissors"]))
deck = ["A", "K", "Q", "J", "10"]
random.shuffle(deck)
print(deck)
print(random.sample(range(1, 50), 6))
```

```output
0.32383276483316237
2
paper
['K', 'J', 'Q', '10', 'A']
[24, 38, 4, 33, 14, 3]
```

- `random.random()` gives a float from 0 up to (but not including) 1.
- `random.randint(a, b)` gives a whole number from `a` to `b`, and unusually for Python, `b` **is** included. A die roll is `randint(1, 6)`.
- `choice` picks one item, `shuffle` mixes a list up in place, and `sample` picks several different items.

The `random` module does not produce truly random numbers; it calculates a sequence that merely looks random, starting from a number called the **seed**. `random.seed(7)` sets the seed, so the "random" results are the same every time the cell runs. Delete that line and they change on every run. Setting a seed is essential whenever you need results someone else can reproduce, which is why you will see it constantly in data science and machine learning.

Because random numbers are cheap, you can answer questions by **simulation**: do the random experiment thousands of times and count. What fraction of the time do two dice add up to 7?

```python type
import random

random.seed(1)
trials = 100_000
sevens = 0
for _ in range(trials):
    if random.randint(1, 6) + random.randint(1, 6) == 7:
        sevens += 1
print(sevens / trials)
print(6 / 36)
```

```output
0.16621
0.16666666666666666
```

The simulated answer comes very close to the exact answer, 6 in 36. (Python ignores underscores in numbers, so `100_000` is just an easier way to read 100000.) The Machine Learning series begins its study of probability this way.

## collections: better counting and grouping

The `collections` module has data structures that take the work out of common patterns. `Counter` is a dictionary built for counting. Give it any collection and it counts the items:

```python type
from collections import Counter

votes = ["red", "blue", "red", "green", "red", "blue"]
counts = Counter(votes)
print(counts)
print(counts["red"], counts["purple"])
print(counts.most_common(2))
print(Counter("banana").most_common(1))
```

```output
Counter({'red': 3, 'blue': 2, 'green': 1})
3 0
[('red', 3), ('blue', 2)]
[('a', 3)]
```

That replaces the whole counting loop from lesson 10. A missing key gives 0 instead of a `KeyError`, and `most_common(n)` returns the `n` most frequent items with their counts, as a list of tuples, largest first.

`defaultdict` is a dictionary that creates a starting value for any key you use that is not there yet. With `list` as the starting value, the grouping pattern loses its `if`:

```python type
from collections import defaultdict

animals = ["cat", "cow", "dog", "duck", "crab"]
by_letter = defaultdict(list)
for animal in animals:
    by_letter[animal[0]].append(animal)
print(dict(by_letter))
```

```output
{'c': ['cat', 'cow', 'crab'], 'd': ['dog', 'duck']}
```

When `by_letter["c"]` is used for the first time, `defaultdict` calls `list()` to create an empty list for it, so `append` always has a list to add to. Notice it is written `defaultdict(list)`, not `defaultdict(list())`: you hand over the function itself, and `defaultdict` calls it each time it needs a new empty list. Lesson 22 explains passing functions around like this.

## itertools: combinations and more

The `itertools` module has tools for looping in clever ways. Three of the most useful answer questions about arrangements:

```python type
from itertools import combinations, permutations, product

team = ["Ada", "Alan", "Grace"]
print(list(combinations(team, 2)))
print(list(permutations(team, 2)))
print(list(product("AB", [1, 2])))
```

```output
[('Ada', 'Alan'), ('Ada', 'Grace'), ('Alan', 'Grace')]
[('Ada', 'Alan'), ('Ada', 'Grace'), ('Alan', 'Ada'), ('Alan', 'Grace'), ('Grace', 'Ada'), ('Grace', 'Alan')]
[('A', 1), ('A', 2), ('B', 1), ('B', 2)]
```

- `combinations(items, k)` gives every way to choose `k` items when order does not matter: every possible pair of team members.
- `permutations(items, k)` gives every way when order *does* matter, so (Ada, Alan) and (Alan, Ada) both appear.
- `product(a, b)` pairs every item of `a` with every item of `b`, like a nested loop.

`accumulate` produces running totals, the job of the last lesson's buggy function, in one line:

```python type
from itertools import accumulate

print(list(accumulate([1, 2, 3, 4])))
```

```output
[1, 3, 6, 10]
```

## Dates and times

The `datetime` module understands the calendar, with its months of different lengths and its leap years, so you never have to. A `date` is a day; subtracting two dates gives a `timedelta`, a length of time.

```python type
from datetime import date, timedelta

moon_landing = date(1969, 7, 20)
print(moon_landing.strftime("%A %d %B %Y"))
gap = date(2000, 1, 1) - moon_landing
print(gap.days, "days from the moon landing to the year 2000")
print(moon_landing + timedelta(days=100))
print(date.fromisoformat("2024-02-28") + timedelta(days=1))
```

```output
Sunday 20 July 1969
11122 days from the moon landing to the year 2000
1969-10-28
2024-02-29
```

`strftime` formats a date as text, using codes like `%A` for the weekday name and `%B` for the month name. `date.fromisoformat` reads a date written in the standard year-month-day form. The last line shows the module handling a leap year: the day after 28 February 2024 is 29 February. (`date.today()` gives today's date.)

## copy: deep copies

Lesson 12 promised a function that copies a list of lists all the way down. Here it is:

```python type
import copy

grid = [[1, 2], [3, 4]]
deep = copy.deepcopy(grid)
deep[0][0] = 99
print(grid, deep)
```

```output
[[1, 2], [3, 4]] [[99, 2], [3, 4]]
```

`copy.deepcopy` copies the outer list and everything inside it, however deeply nested, so changing the copy never affects the original.

## Your own modules

A module is simply a file of Python code with a name ending in `.py`. If you save functions in a file called `helpers.py`, another program in the same folder can `import helpers` and call `helpers.some_function()`. Large programs are organised this way, split across many files, each a module that groups related functions. In these notebooks everything lives in cells, so you will not write module files here, but every `import` you write works in exactly this way.

::: challenge Most common words [easy]
Write a function `top_words(text, n)` that returns the `n` most common words in `text` as a list of `(word, count)` tuples, most common first. Treat capital and small letters as the same, and split on spaces. Use `Counter`.

`top_words("the cat and the hat and the bat", 2)` returns `[("the", 3), ("and", 2)]`.

```python starter
def top_words(text, n):
    return []

print(top_words("the cat and the hat and the bat", 2))
```

```python solution
from collections import Counter

def top_words(text, n):
    return Counter(text.lower().split()).most_common(n)

print(top_words("the cat and the hat and the bat", 2))
```

```python test
assert "top_words" in dir(), "Keep the function's name as top_words."
assert "Counter" in _source, "Use collections.Counter for this one."
for _args, _want in [
    (("the cat and the hat and the bat", 2), [("the", 3), ("and", 2)]),
    (("Go go GO stop", 1), [("go", 3)]),
    (("", 3), []),
    (("a b a", 5), [("a", 2), ("b", 1)]),
]:
    _got = top_words(*_args)
    assert list(_got) == _want, f"top_words{_args} should return {_want}, but it returned {_got!r}."
"SUCCESS: A whole counting loop replaced by one line."
```

Hint: Import `Counter` from `collections`. Build a `Counter` from the lowercased, split text, and call its `most_common(n)` method.
:::

::: challenge Pairs that add up [medium]
Write a function `pairs_with_sum(numbers, target)` that returns a list of every pair of **different positions** in `numbers` whose values add up to `target`, as tuples in the order `itertools.combinations` produces them.

`pairs_with_sum([1, 4, 3, 2], 5)` returns `[(1, 4), (3, 2)]`.

```python starter
def pairs_with_sum(numbers, target):
    return []

print(pairs_with_sum([1, 4, 3, 2], 5))
```

```python solution
from itertools import combinations

def pairs_with_sum(numbers, target):
    return [pair for pair in combinations(numbers, 2) if pair[0] + pair[1] == target]

print(pairs_with_sum([1, 4, 3, 2], 5))
```

```python test
from itertools import combinations as _comb
assert "pairs_with_sum" in dir(), "Keep the function's name as pairs_with_sum."
assert "combinations" in _source, "Use itertools.combinations to generate the pairs."
for _nums, _t in [([1, 4, 3, 2], 5), ([], 3), ([5], 5), ([2, 2, 2], 4), ([0, -1, 1, 3], 0)]:
    _want = [p for p in _comb(_nums, 2) if sum(p) == _t]
    _got = pairs_with_sum(_nums, _t)
    assert [tuple(p) for p in _got] == _want, f"pairs_with_sum({_nums}, {_t}) should return {_want}, but it returned {_got!r}."
"SUCCESS: combinations did the pairing, and a comprehension did the filtering."
```

Hint: `combinations(numbers, 2)` gives every pair of items from different positions. Keep the pairs whose two values add up to `target`, for example with a list comprehension that filters.
:::

::: challenge Days between dates [medium]
Write a function `days_between(start, end)` that takes two dates written as text in the form `"YYYY-MM-DD"` and returns the number of days from `start` to `end` as an integer. It is negative if `end` is before `start`.

`days_between("2024-02-01", "2024-03-01")` returns 29, because 2024 is a leap year.

```python starter
def days_between(start, end):
    return 0

print(days_between("2024-02-01", "2024-03-01"))
```

```python solution
from datetime import date

def days_between(start, end):
    return (date.fromisoformat(end) - date.fromisoformat(start)).days

print(days_between("2024-02-01", "2024-03-01"))
```

```python test
from datetime import date as _date
assert "days_between" in dir(), "Keep the function's name as days_between."
for _s, _e in [("2024-02-01", "2024-03-01"), ("2023-02-01", "2023-03-01"), ("2000-01-01", "2000-01-01"), ("2024-12-31", "2025-01-01"), ("2025-01-10", "2025-01-01"), ("1969-07-20", "2000-01-01")]:
    _want = (_date.fromisoformat(_e) - _date.fromisoformat(_s)).days
    _got = days_between(_s, _e)
    assert _got == _want, f"days_between({_s!r}, {_e!r}) should return {_want}, but it returned {_got!r}."
"SUCCESS: The datetime module handled the calendar for you."
```

Hint: `date.fromisoformat(text)` turns `"2024-02-01"` into a `date`. Subtracting one date from another gives a `timedelta`, and its `.days` attribute is the number of days.
:::

## What you learned

- `import module` loads a module; use its contents as `module.name`. `from module import name` imports specific names, and `import module as short` renames it. Avoid `import *`.
- `dir()` and `help()` explore a module, and the Python documentation describes them all.
- `math` has `sqrt`, `pi`, `floor`, `ceil` and `isclose` (the right way to compare floats).
- `random` has `random`, `randint` (both ends included), `choice`, `shuffle` and `sample`. `random.seed` makes results repeatable.
- `collections.Counter` counts, with `most_common`; `defaultdict(list)` makes grouping easy.
- `itertools` has `combinations`, `permutations`, `product` and `accumulate`.
- `datetime` handles dates: subtract them for a `timedelta`, and use `fromisoformat` and `strftime` to read and write them.
- `copy.deepcopy` copies nested data completely. A module is just a `.py` file of code.

Next you will work with files: reading text data line by line, writing results out, and making sure files are always closed properly.
