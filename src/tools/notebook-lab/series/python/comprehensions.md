# Comprehensions

By now you have written this shape of code many times: start with an empty list, loop over something, perhaps check a condition, and append a result. It is so common that Python has a special, compact syntax for it, the **comprehension**. A comprehension builds a list, dictionary or set in a single expression, and it reads almost like a sentence: "the square of x, for each x in numbers, if x is odd".

Comprehensions are everywhere in real Python code, so you need to be able to read them fluently. This lesson shows how each one corresponds exactly to a loop you already know how to write, which makes both reading and writing them straightforward. It also covers when **not** to use one, which matters just as much.

## From a loop to a list comprehension

Here is the familiar pattern, and the comprehension that does the same job:

```python type
numbers = [1, 2, 3, 4, 5]

squares = []
for n in numbers:
    squares.append(n * n)
print(squares)

squares = [n * n for n in numbers]
print(squares)
```

```output
[1, 4, 9, 16, 25]
[1, 4, 9, 16, 25]
```

Both produce `[1, 4, 9, 16, 25]`. The comprehension packs the loop into the brackets of the list it builds. Compare the two versions piece by piece:

- `n * n`, the value that was appended, comes **first**.
- `for n in numbers` is the loop line, without its colon.
- The empty list, the `append` and the separate lines are gone; the square brackets say "build a list from these".

Read `[n * n for n in numbers]` as "a list of n times n, for each n in numbers". The expression at the front can be anything, including a method call or a function call:

```python type
names = ["ada", "grace", "alan"]
print([name.title() for name in names])
print([len(name) for name in names])
print([f"Hello, {name}" for name in names])
```

```output
['Ada', 'Grace', 'Alan']
[3, 5, 4]
['Hello, ada', 'Hello, grace', 'Hello, alan']
```

## Filtering with if

A comprehension can end with an `if`, which keeps only the items for which the condition is true. It corresponds to an `if` inside the loop:

```python type
temperatures = [14, 22, 31, 18, 27, 33]

hot = []
for t in temperatures:
    if t > 25:
        hot.append(t)
print(hot)

hot = [t for t in temperatures if t > 25]
print(hot)
```

```output
[31, 27, 33]
[31, 27, 33]
```

To translate any comprehension back into a loop, take the parts in this order: the `for`, then the `if`, and only then the expression at the front, which becomes the `append`. The expression is written first but runs last.

The filter and the expression can be combined: `[t * 9 / 5 + 32 for t in temperatures if t > 25]` converts only the hot days to Fahrenheit.

## Choosing a value versus filtering

There is a second way to use `if` in a comprehension, and it is easy to confuse with the first. Predict both results before you run the cell.

```python type
numbers = [3, -1, 4, -5, 9]
print([n for n in numbers if n > 0])
print([n if n > 0 else 0 for n in numbers])
```

```output
[3, 4, 9]
[3, 0, 4, 0, 9]
```

The first keeps only the positive numbers, so the result is shorter: `[3, 4, 9]`. The second has an `if ... else` at the **front**. That is the conditional expression from lesson 4, choosing which value to produce, and it keeps every item: negative numbers become 0, giving `[3, 0, 4, 0, 9]`. The rule:

- `if` at the **end** (no `else`) is a filter: it decides **whether** an item is included.
- `if ... else` at the **front** chooses **what** value each item becomes.

## Dictionary and set comprehensions

The same idea works for dictionaries and sets. A **dictionary comprehension** uses curly braces and a `key: value` pair at the front:

```python type
names = ["ada", "grace", "alan"]
lengths = {name: len(name) for name in names}
print(lengths)

prices = {"bread": 1.45, "milk": 0.95, "cake": 3.50}
cheap = {item: price for item, price in prices.items() if price < 2}
print(cheap)
```

```output
{'ada': 3, 'grace': 5, 'alan': 4}
{'bread': 1.45, 'milk': 0.95}
```

Unpacking works in the `for` part exactly as in a normal loop, so `for item, price in prices.items()` gives each pair.

A **set comprehension** is curly braces with a single value at the front, and like any set it drops duplicates:

```python type
words = ["apple", "avocado", "banana", "blueberry", "cherry"]
first_letters = {word[0] for word in words}
print(sorted(first_letters))
```

```output
['a', 'b', 'c']
```

(There is no "tuple comprehension". Round brackets make something different, which you will meet in a moment; to get a tuple, pass that to `tuple()`, as in `tuple(x * 2 for x in items)`.)

## Loops inside comprehensions

A comprehension can contain more than one `for`. They run in the order they are written, outermost first, exactly like nested loops. This flattens a grid into one list:

```python type
grid = [[1, 2, 3], [4, 5, 6]]

flat = []
for row in grid:
    for cell in row:
        flat.append(cell)
print(flat)

flat = [cell for row in grid for cell in row]
print(flat)
```

```output
[1, 2, 3, 4, 5, 6]
[1, 2, 3, 4, 5, 6]
```

The two `for` clauses are in the same order as the two nested `for` lines, and the result is one flat list.

A comprehension can also be the **expression at the front** of another comprehension. Then the inner comprehension builds a whole row on each pass of the outer loop, and the result is a list of lists:

```python type
table = [[r * c for c in range(1, 4)] for r in range(1, 3)]
print(table)
```

```output
[[1, 2, 3], [2, 4, 6]]
```

That prints `[[1, 2, 3], [2, 4, 6]]`: for each `r`, the inner comprehension makes the row `[r * 1, r * 2, r * 3]`. Keep the two forms apart: two `for` clauses inside **one** pair of brackets give a flat list, while brackets **inside** brackets give a list of lists. The same idea gives a one-line answer to the grid trap from the last lesson:

```python type
grid = [[0] * 3 for _ in range(2)]
grid[0][0] = 1
print(grid)
```

```output
[[1, 0, 0], [0, 0, 0]]
```

The inner `[0] * 3` is evaluated again on every pass of the loop, so each row is a new, separate list. This is the standard way to build a grid in Python.

## Generator expressions: sum, any and all

If you only need to feed the values into a function like `sum`, `max` or `min`, you do not need to build a list at all. Write the comprehension with round brackets instead, and it becomes a **generator expression**, which produces its values one at a time as the function asks for them. When a generator expression is the only argument to a function, you can even leave out its own brackets:

```python type
numbers = [3, 7, 2, 8]
print(sum(n * n for n in numbers))
print(max(len(word) for word in ["fig", "banana", "kiwi"]))
```

```output
126
6
```

This uses less memory than building a list first, which matters when there are millions of values. Lesson 21 explains how generators work.

Two built-in functions are designed to work with generator expressions:

- `any(...)` is `True` if **at least one** value is true.
- `all(...)` is `True` if **every** value is true.

```python type
scores = [72, 88, 45, 91]
print(any(s < 50 for s in scores))
print(all(s >= 40 for s in scores))
print(all(s >= 50 for s in scores))
```

```output
True
True
False
```

"Did anyone fail?" and "did everyone pass?" each become one readable line. Both stop as soon as they know the answer: `any` stops at the first true value, and `all` at the first false one.

## Comprehension variables stay inside

The loop variable of a comprehension exists only inside the comprehension. Unlike a `for` loop, it does not remain afterwards:

```python type
n = "unchanged"
squares = [n * n for n in range(4)]
print(squares)
print(n)
```

```output
[0, 1, 4, 9]
unchanged
```

The comprehension's `n` is separate from the `n` outside it, so the outer `n` is untouched. This is another reason comprehensions are tidy: they cannot accidentally overwrite a variable of yours.

## When not to use a comprehension

A comprehension is for **building a collection**. Keep to two rules:

1. **Do not use one for its side effects.** `[print(x) for x in items]` works, but it builds a list of `None`s that nobody wants, just to call `print`. When the point of a loop is to *do* something, like printing or changing another list, write a normal `for` loop.
2. **Keep it short.** If a comprehension has several conditions, nested loops and a complicated expression, it becomes harder to read than the loop it replaced. Once it does not comfortably fit on a line, or you have to read it twice, write the loop instead.

Clarity is the goal; comprehensions are a tool for clarity, not a test of cleverness.

::: challenge Squares of the odd numbers [easy]
Write a function `odd_squares(numbers)` that returns a list of the squares of only the odd numbers in `numbers`, in their original order. Use a list comprehension.

`odd_squares([1, 2, 3, 4, 5])` returns `[1, 9, 25]`.

```python starter
def odd_squares(numbers):
    result = []
    return result

print(odd_squares([1, 2, 3, 4, 5]))
```

```python solution
def odd_squares(numbers):
    return [n * n for n in numbers if n % 2 == 1]

print(odd_squares([1, 2, 3, 4, 5]))
```

```python test
import ast
assert "odd_squares" in dir(), "Keep the function's name as odd_squares."
for _nums, _want in [([1, 2, 3, 4, 5], [1, 9, 25]), ([], []), ([2, 4], []), ([-3, 7], [9, 49]), ([9, 1, 9], [81, 1, 81])]:
    _got = odd_squares(_nums)
    assert _got == _want, f"odd_squares({_nums}) should return {_want}, but it returned {_got!r}."
assert any(isinstance(_n, ast.ListComp) for _n in ast.walk(ast.parse(_source))), "Write this one as a list comprehension: [... for ... in ... if ...]."
"SUCCESS: An expression, a loop and a filter, in one line."
```

Hint: The shape is `[expression for n in numbers if condition]`. The expression is the square; the condition is that `n` is odd. (For negative odd numbers, `n % 2` is still 1 in Python.)
:::

::: challenge Swap keys and values [medium]
Write a function `invert(mapping)` that returns a new dictionary with each key and value swapped. You may assume the values are all different. Use a dictionary comprehension.

`invert({"a": 1, "b": 2})` returns `{1: "a", 2: "b"}`.

```python starter
def invert(mapping):
    return {}

print(invert({"a": 1, "b": 2}))
```

```python solution
def invert(mapping):
    return {value: key for key, value in mapping.items()}

print(invert({"a": 1, "b": 2}))
```

```python test
import ast
assert "invert" in dir(), "Keep the function's name as invert."
for _d in [{"a": 1, "b": 2}, {}, {"red": "#f00", "green": "#0f0"}, {1: "one"}]:
    _got = invert(_d)
    _want = {v: k for k, v in _d.items()}
    assert _got == _want, f"invert({_d}) should return {_want}, but it returned {_got!r}."
assert any(isinstance(_n, ast.DictComp) for _n in ast.walk(ast.parse(_source))), "Write this one as a dictionary comprehension: {key: value for ... in ...}."
"SUCCESS: Keys and values swapped in one expression."
```

Hint: Loop over `mapping.items()`, unpacking each pair into two names. At the front, put the new pair the other way round: the value as the key and the key as the value.
:::

::: challenge Transpose a grid [medium]
Transposing a grid turns its rows into columns: the first row of the result is the first item of every row, the second row is the second item of every row, and so on. Write a function `transpose(grid)` that returns the transpose of a rectangular grid (a list of rows, all the same length) as a new list of lists, using a comprehension.

`transpose([[1, 2, 3], [4, 5, 6]])` returns `[[1, 4], [2, 5], [3, 6]]`. For an empty grid, return `[]`.

```python starter
def transpose(grid):
    return grid

print(transpose([[1, 2, 3], [4, 5, 6]]))
```

```python solution
def transpose(grid):
    if not grid:
        return []
    return [[row[i] for row in grid] for i in range(len(grid[0]))]

print(transpose([[1, 2, 3], [4, 5, 6]]))
```

```python test
import ast
assert "transpose" in dir(), "Keep the function's name as transpose."
for _g, _want in [
    ([[1, 2, 3], [4, 5, 6]], [[1, 4], [2, 5], [3, 6]]),
    ([[1, 2], [3, 4]], [[1, 3], [2, 4]]),
    ([[7]], [[7]]),
    ([[1, 2, 3]], [[1], [2], [3]]),
    ([], []),
]:
    _copy = [list(r) for r in _g]
    _got = transpose(_copy)
    assert _got == _want, f"transpose({_g}) should return {_want}, but it returned {_got!r}."
    assert _copy == _g, "transpose should return a new grid and leave the one it was given unchanged."
assert any(isinstance(_n, ast.ListComp) for _n in ast.walk(ast.parse(_source))), "Build the result with a list comprehension."
"SUCCESS: Rows became columns."
```

Hint: Row `i` of the result collects item `i` from every row: `[row[i] for row in grid]`. Wrap that in an outer comprehension over `i in range(len(grid[0]))`, the number of columns. Handle the empty grid first, with `if len(grid) == 0:`, since it has no `grid[0]`.
:::

## What you learned

- `[expression for item in items]` builds a list; it is the "empty list, loop, append" pattern in one line.
- `[x for x in items if condition]` filters. `[a if condition else b for x in items]` chooses a value for every item.
- `{k: v for ...}` builds a dictionary and `{x for ...}` builds a set.
- Several `for` clauses run in the order written, like nested loops. `[[0] * c for _ in range(r)]` builds a safe grid.
- A generator expression, like `sum(x * x for x in items)`, feeds values to a function without building a list. `any` and `all` answer "at least one?" and "every one?".
- A comprehension's variable does not leak out.
- Use comprehensions to build collections, not for side effects, and prefer a loop when a comprehension gets hard to read.

Your programs have mostly assumed that nothing goes wrong. Next you will learn what exceptions really are, how to raise them yourself, and how to catch them and recover.
