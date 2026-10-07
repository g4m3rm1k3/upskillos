# Names and references

Twice now something has changed that seemed like it should not have. In lesson 9 a function's default list kept growing from one call to the next. And any time you pass a list to a function, the function can change your list. These are not quirks to memorise one by one. They all come from one fact about how Python works, and once you see it, a whole family of bugs becomes easy to predict and avoid.

This lesson is about what a variable really is. It is a short lesson on syntax, since there is almost nothing new to type, but it may be the most important lesson in this series for understanding what your programs actually do.

## Names are labels, not boxes

A common picture of a variable is a box with the variable's name on it, holding a value. That picture works for numbers, but it is wrong for Python, and it leads to wrong predictions. A better picture: every value is an **object** sitting somewhere in the computer's memory, and a variable is a **name tag** attached to an object. Assignment does not copy anything into a box; it ties a name to an object.

With that picture, predict what this cell prints. Does changing `b` change `a`?

```python type
a = [1, 2, 3]
b = a
b.append(4)
print("a is", a)
print("b is", b)
```

```output
a is [1, 2, 3, 4]
b is [1, 2, 3, 4]
```

Both print `[1, 2, 3, 4]`. The line `b = a` did not make a copy of the list. It tied a second name tag, `b`, to the **same** list object that `a` is tied to. There is only one list, with two names. Change it through either name and the change is visible through both. Two names for one object are called **aliases**, and this situation is called **aliasing**.

```text
a ──┐
    ├──▶ [1, 2, 3, 4]
b ──┘
```

## Same value, or same object?

This raises a question that did not exist before: are two names tied to **the same object**, or to **two different objects that happen to be equal**? Python has an operator for each.

- `==` asks whether two values are **equal**: whether they have the same contents.
- `is` asks whether two names refer to the **same object**.

```python type
a = [1, 2, 3]
b = a
c = [1, 2, 3]
print(a == b, a is b)
print(a == c, a is c)
```

```output
True True
True False
```

`a` and `c` are equal, since they have the same contents, but they are two separate lists: changing one will not affect the other. `a` and `b` are not just equal; they are one and the same object. The built-in `id` gives each object a number that identifies it, which makes this visible:

```python type
a = [1, 2, 3]
b = a
c = [1, 2, 3]
print(id(a), id(b), id(c))
```

`a` and `b` have the same id; `c` has a different one. (The numbers themselves will be different each time you run the cell; only whether they match matters.)

Nearly always you want `==`. The main place to use `is` is checking for `None`, as in `if basket is None:`. There is only ever one `None` object, and `is None` asks exactly the right question.

## Changing an object, or moving a name

There are two completely different things you can do with a name, and they look similar on the page:

- **Mutating** changes the object itself: `items.append(4)`, `items[0] = 9`, `counts["x"] = 1`. Every name tied to that object sees the change.
- **Rebinding** moves one name tag to a different object: `items = [7, 8]`. Other names are not affected at all.

Predict both outputs before you run this.

```python type
a = [1, 2, 3]
b = a
b = [7, 8]
print("a is", a)
print("b is", b)
```

```output
a is [1, 2, 3]
b is [7, 8]
```

This time `a` is unchanged. `b = [7, 8]` created a brand new list and moved the `b` tag onto it. The original list, still tagged `a`, was never touched. Assignment with `=` to a plain name always rebinds; it never changes an object.

```text
a ──▶ [1, 2, 3]
b ──▶ [7, 8]
```

## Why numbers and strings never surprise you

If aliasing is this tricky, why did it never cause trouble with numbers or strings? Because they are **immutable**: no operation can change a number or string object. So even when two names share one, there is nothing that could change it under the other name.

```python type
x = 10
y = x
y += 5
print(x, y)
```

```output
10 15
```

`y += 5` cannot change the object 10, because numbers cannot be changed. Instead it works out 15, a new object, and rebinds `y` to it. `x` still refers to 10. The same is true of every string method you learned: `upper()` cannot change a string, which is exactly why it returns a new one. With immutable values, "mutating" is impossible, so every change is a rebinding, and the box picture happens to give the right answer.

There is one surprise here. For lists, `+=` is special. Predict whether `a` changes.

```python type
a = [1, 2]
b = a
b += [3]
print("a is", a)
c = [1, 2]
d = c
d = d + [3]
print("c is", c)
```

```output
a is [1, 2, 3]
c is [1, 2]
```

`b += [3]` **mutates** the list in place, like `extend`, so `a` sees the change. But `d = d + [3]` builds a new list with `+` and rebinds `d`, so `c` is untouched. For numbers and strings the two forms mean the same thing; for lists they do not.

## Functions receive the object, not a copy

When you call a function, each parameter becomes a new name for the **same object** the caller passed in. No copy is made. So a function can mutate a list you give it, and you will see the change afterwards.

```python type
def add_bonus(scores):
    for i in range(len(scores)):
        scores[i] += 5

results = [60, 72, 85]
add_bonus(results)
print(results)
```

```output
[65, 77, 90]
```

`results` was changed by the function, even though the function never mentions it. Inside the function, `scores` was another name for the caller's list. A change a function makes that you can see from outside is called a **side effect**. Sometimes it is exactly what you want, as with the list method `sort`. But a side effect you did not expect is one of the hardest bugs to track down, because the code that changes the list may be far away from the code that notices.

Rebinding a parameter, on the other hand, never affects the caller: it only moves the function's own name tag.

```python type
def replace(items):
    items = [0, 0, 0]

numbers = [1, 2, 3]
replace(numbers)
print(numbers)
```

```output
[1, 2, 3]
```

`numbers` is unchanged, because `items = [0, 0, 0]` only moved the local name. Now the default-list bug from lesson 9 makes complete sense: the default list was one object, created once, and every call without an argument received a new name for that same object, then mutated it.

## Making copies

When you need a separate list you can change safely, make a copy. There are several equivalent ways, and all make a new list with the same items:

```python type
original = [3, 1, 2]
copy1 = original.copy()
copy2 = list(original)
copy3 = original[:]
copy1.append(99)
print(original, copy1)
print(copy1 is original, copy2 is original, copy3 is original)
```

```output
[3, 1, 2] [3, 1, 2, 99]
False False False
```

A slice with no start and no end, `[:]`, is a slice of the whole list, and every slice is a new list.

These are **shallow** copies: a new outer list, but holding the very same items. For numbers and strings that is all you need. For a list of lists, the inner lists are shared between the original and the copy:

```python type
grid = [[1, 2], [3, 4]]
grid_copy = grid.copy()
grid_copy[0][0] = 99
grid_copy.append([5, 6])
print("grid is", grid)
print("grid_copy is", grid_copy)
```

```output
grid is [[99, 2], [3, 4]]
grid_copy is [[99, 2], [3, 4], [5, 6]]
```

Appending a new row affected only the copy, since the outer lists are separate. But `grid_copy[0][0] = 99` changed the grid too, because `grid_copy[0]` and `grid[0]` are one and the same inner list. To copy a grid completely, copy each row as well:

```python type
grid = [[1, 2], [3, 4]]
full_copy = []
for row in grid:
    full_copy.append(row.copy())
full_copy[0][0] = 99
print("grid is", grid)
print("full_copy is", full_copy)
```

```output
grid is [[1, 2], [3, 4]]
full_copy is [[99, 2], [3, 4]]
```

A copy that copies everything inside as well, all the way down, is called a **deep copy**. Python has a ready-made function for it in the `copy` module, which you will be able to use once you have learned to import modules.

## A famous trap: repeating a list

In lesson 3, `"-" * 20` repeated a string. `*` repeats lists too, and `[0] * 3` is `[0, 0, 0]`. That makes this look like a neat way to build a 3 by 3 grid. Predict what the last line prints.

```python type
grid = [[0] * 3] * 3
print(grid)
grid[0][0] = 1
print(grid)
```

```output
[[0, 0, 0], [0, 0, 0], [0, 0, 0]]
[[1, 0, 0], [1, 0, 0], [1, 0, 0]]
```

Setting one cell changed a whole column: every row now starts with 1. `[[0] * 3] * 3` made one row, and then a list holding **three references to that same row**. There is only one row object, with three positions pointing at it. Build the rows separately instead, so that each is its own object:

```python type
grid = []
for _ in range(3):
    grid.append([0] * 3)
grid[0][0] = 1
print(grid)
```

```output
[[1, 0, 0], [0, 0, 0], [0, 0, 0]]
```

`[0] * 3` is safe on its own, because the items are numbers, which cannot be changed. The trap is only when the thing being repeated is itself changeable. (The loop variable is `_` because its value is not used; the loop is only for repeating three times.)

## Replacing a list's contents in place

Sometimes a function should change the caller's list, but the easiest way to compute the new contents is to build a new list. Assigning to the whole-list slice, `items[:] = new_list`, replaces the **contents** of the existing list object, so every name tied to it sees the new contents.

```python type
def keep_positive(items):
    kept = []
    for x in items:
        if x > 0:
            kept.append(x)
    items[:] = kept

readings = [4, -2, 7, -9, 1]
alias = readings
keep_positive(readings)
print(readings, alias)
```

```output
[4, 7, 1] [4, 7, 1]
```

Writing `items = kept` instead would only move the function's own name, and the caller's list would stay as it was. Compare the two, and you have the whole lesson: `items[:] = ...` mutates, `items = ...` rebinds.

::: challenge No side effects [easy]
The function `with_bonus` is supposed to **return a new list** with 5 added to each score, leaving the list it is given unchanged. At the moment it changes the caller's list as a side effect. Fix it so that after the starter runs, `results` is still `[60, 72, 85]` and `boosted` is `[65, 77, 90]`.

```python starter
def with_bonus(scores):
    for i in range(len(scores)):
        scores[i] += 5
    return scores

results = [60, 72, 85]
boosted = with_bonus(results)
print(results, boosted)
```

```python solution
def with_bonus(scores):
    boosted = []
    for score in scores:
        boosted.append(score + 5)
    return boosted

results = [60, 72, 85]
boosted = with_bonus(results)
print(results, boosted)
```

```python test
assert "with_bonus" in dir(), "Keep the function's name as with_bonus."
_orig = [1, 2, 3]
_got = with_bonus(_orig)
assert _got == [6, 7, 8], f"with_bonus([1, 2, 3]) should return [6, 7, 8], but it returned {_got!r}."
assert _orig == [1, 2, 3], f"with_bonus changed the list it was given: it is now {_orig}. Build and return a new list instead."
assert _got is not _orig, "with_bonus returned the same list object it was given. Return a new list."
assert with_bonus([]) == [], "with_bonus([]) should return []."
"SUCCESS: A pure function: new list out, original untouched."
```

Hint: Instead of assigning into `scores`, start a new empty list, append `score + 5` for each score, and return the new list. Then the caller's list is never touched.
:::

::: challenge A proper grid [easy]
Write a function `make_grid(rows, cols, fill)` that returns a list of `rows` lists, each containing `cols` copies of `fill`. Every row must be its own separate list, so that changing one cell changes only that cell.

`make_grid(2, 3, 0)` returns `[[0, 0, 0], [0, 0, 0]]`.

```python starter
def make_grid(rows, cols, fill):
    return [[fill] * cols] * rows

grid = make_grid(2, 3, 0)
grid[0][0] = 1
print(grid)
```

```python solution
def make_grid(rows, cols, fill):
    grid = []
    for _ in range(rows):
        grid.append([fill] * cols)
    return grid

grid = make_grid(2, 3, 0)
grid[0][0] = 1
print(grid)
```

```python test
assert "make_grid" in dir(), "Keep the function's name as make_grid."
_g = make_grid(2, 3, 0)
assert _g == [[0, 0, 0], [0, 0, 0]], f"make_grid(2, 3, 0) should return [[0, 0, 0], [0, 0, 0]], but it returned {_g!r}."
_g[0][0] = 1
assert _g == [[1, 0, 0], [0, 0, 0]], f"After setting grid[0][0] = 1 only one cell should change, but the grid is {_g}. Each row must be its own list."
_g2 = make_grid(3, 2, ".")
assert _g2 == [[".", "."], [".", "."], [".", "."]], f"make_grid(3, 2, '.') should return three rows of two dots, but returned {_g2!r}."
assert _g2[0] is not _g2[1] and _g2[1] is not _g2[2], "Two rows are the same list object. Create each row separately."
assert make_grid(0, 5, 0) == [], "make_grid(0, 5, 0) should return an empty list."
"SUCCESS: Every row is its own list."
```

Hint: Build the grid with a loop that runs `rows` times, appending a new row `[fill] * cols` each time. Each pass through the loop creates a brand new row list.
:::

::: challenge Remove in place [medium]
Write a function `remove_all(items, value)` that removes every occurrence of `value` from the list `items`, **changing the caller's list itself**. It should return nothing. After `remove_all(data, 0)`, `data` has no zeros left, and any other name for the same list sees the change too.

Remember the warning from lesson 6: removing items from a list while looping over it skips items.

```python starter
def remove_all(items, value):
    kept = []
    for x in items:
        if x != value:
            kept.append(x)
    items = kept

data = [0, 1, 0, 0, 2, 0]
remove_all(data, 0)
print(data)
```

```python solution
def remove_all(items, value):
    kept = []
    for x in items:
        if x != value:
            kept.append(x)
    items[:] = kept

data = [0, 1, 0, 0, 2, 0]
remove_all(data, 0)
print(data)
```

```python test
assert "remove_all" in dir(), "Keep the function's name as remove_all."
_data = [0, 1, 0, 0, 2, 0]
_alias = _data
_ret = remove_all(_data, 0)
assert _data == [1, 2], f"After remove_all(data, 0), data should be [1, 2], but it is {_data}. Is the caller's list itself being changed, or only a local name?"
assert _alias is _data and _alias == [1, 2], "Other names for the same list should see the change too."
assert _ret is None, f"remove_all should change the list and return nothing (None), but it returned {_ret!r}."
for _items, _v, _want in [(["a", "b", "a"], "a", ["b"]), ([5, 5, 5], 5, []), ([1, 2], 9, [1, 2]), ([], 1, [])]:
    _l = list(_items)
    remove_all(_l, _v)
    assert _l == _want, f"Removing {_v!r} from {_items} should leave {_want}, but left {_l}."
"SUCCESS: items[:] = ... changed the object itself, not just a name."
```

Hint: The starter builds the right list, but the last line only rebinds a local name. How do you replace the **contents** of a list, rather than moving a name?
:::

## What you learned

- A variable is a name tied to an object, not a box holding a value. `b = a` ties a second name to the same object.
- `==` asks whether values are equal; `is` asks whether two names refer to the same object. Use `is` for `None`.
- Mutating (`append`, `x[i] = ...`, `x[:] = ...`) changes the object, and all its names see it. Rebinding (`x = ...`) moves one name and affects nothing else.
- Numbers and strings are immutable, so aliasing them is always safe. A tuple cannot be changed, but a list inside it still can.
- For lists, `b += [3]` mutates but `b = b + [3]` makes a new list.
- A function's parameters are new names for the caller's objects. Mutating them is a side effect the caller sees; rebinding them is not.
- `.copy()`, `list(x)` and `x[:]` make shallow copies. Lists of lists need each inner list copied too.
- `[[0] * n] * m` repeats one row m times; build rows in a loop instead.

You have written the same kind of loop many times now: start with an empty list, loop, maybe test with `if`, and append. Next you will learn comprehensions, Python's one-line way of writing exactly that.
