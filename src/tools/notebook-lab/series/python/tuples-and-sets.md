# Tuples and sets

You have met three kinds of collection so far: strings, lists and dictionaries. This lesson adds the last two basic ones. A **tuple** is a fixed group of values, like the two coordinates of a point or the day, month and year of a date. A **set** is a collection of unique values with no order, built for one question above all: "is this thing in here?"

Neither can do anything a list could not do with some extra effort. But choosing the collection that matches the shape of your data makes code shorter, faster and harder to get wrong, so the lesson ends with a guide to choosing between all five.

## Tuples

You met tuples briefly in lesson 9: a function that returns several values returns a tuple, and a tuple can be unpacked into separate names. A tuple is written as values separated by commas, usually inside round brackets.

```python type
point = (3, 4)
date = (14, "March", 1879)
print(point[0], point[1])
print(date[1])
print(len(date))
```

```output
3 4
March
3
```

A tuple is a sequence, so indexing, slicing, `len`, `in` and `for` loops all work exactly as they do for lists and strings. The difference is that a tuple is **immutable**: once it is made, it can never be changed. There is no `append`, and you cannot assign to an item.

```python error TypeError
point = (3, 4)
point[0] = 10
```

## Why have an unchangeable list?

If a tuple is just a list you cannot change, why use one? There are three good reasons.

**It says what the data means.** A list usually holds any number of the same kind of thing: a list of scores, a list of names. A tuple usually holds a fixed number of values that each mean something different: a point is (x, y), a date is (day, month, year). When you see `(3, 4)` you know there will always be exactly two parts.

**It protects the data.** A value that cannot be changed cannot be changed by accident. If you pass a tuple to a function, you know the function cannot alter it behind your back.

**It can be a dictionary key or a set member**, as long as everything inside it is unchangeable too. Last lesson, a list could not be a dictionary key, because it could change after being stored. A tuple can, which is why a map of cities keyed by `(latitude, longitude)` works.

## Making tuples, and one trap

The commas make a tuple, not the brackets. The brackets are only there for readability, or to avoid confusion inside a longer expression.

```python type
a = 1, 2, 3
b = (1, 2, 3)
print(a == b)
print(type(a))
```

```output
True
<class 'tuple'>
```

That leads to the one trap with tuples. Predict the types of `c` and `d`.

```python type
c = (5)
d = (5,)
print(type(c))
print(type(d))
```

```output
<class 'int'>
<class 'tuple'>
```

`(5)` is just the number 5 in brackets, exactly as brackets work in arithmetic. A tuple with one item needs a trailing comma: `(5,)`. An empty tuple is `()`.

`tuple()` and `list()` convert between the two, which is how you get a changeable copy of a tuple, or freeze a list:

```python type
frozen = tuple([3, 1, 2])
thawed = list(frozen)
thawed.append(4)
print(frozen, thawed)
```

```output
(3, 1, 2) [3, 1, 2, 4]
```

## Unpacking, revisited

Unpacking assigns each item of a tuple to its own name, and it works for any sequence, not only tuples:

```python type
x, y = (3, 4)
day, month, year = (14, "March", 1879)
first, second = "hi"
print(x, y, month, second)
```

```output
3 4 March i
```

When you only want some of the values, a name with a `*` in front collects "all the rest" into a list:

```python type
scores = [98, 91, 85, 77, 70]
best, *others = scores
print(best, others)
*all_but_last, worst = scores
print(all_but_last, worst)
```

```output
98 [91, 85, 77, 70]
[98, 91, 85, 77] 70
```

A common convention is to unpack a value you do not need into a variable called `_`, which tells the reader it is deliberately ignored: `_, month, _ = date`.

## Sets

A **set** is an unordered collection of unique values. It is written with curly braces, like a dictionary but with single values instead of pairs.

```python type
colours = {"red", "green", "blue", "red", "green"}
print(colours)
print(len(colours))
print("red" in colours)
```

The duplicates vanish: a set holds each value at most once, so this set has three items, not five. Sets are **unordered**: they do not keep items in the order you wrote them, and the order they print in may differ from one run to another. So a set has no positions, and indexing one is an error.

```python error TypeError
colours = {"red", "green", "blue"}
print(colours[0])
```

There is one more trap, and it is the reverse of the one-item tuple. Predict the type of `empty`.

```python type
empty = {}
print(type(empty))
really_empty = set()
print(type(really_empty))
```

```output
<class 'dict'>
<class 'set'>
```

`{}` is an empty **dictionary**, because dictionaries came first in Python's history. An empty set has to be written `set()`.

## What sets are good at

**Removing duplicates.** Converting a list to a set throws away the repeats. Convert back to a list if you need one, remembering that the original order is lost.

```python type
visits = ["home", "about", "home", "shop", "home", "about"]
unique_pages = set(visits)
print(unique_pages)
print(len(unique_pages), "different pages")
print(sorted(unique_pages))
```

**Fast membership tests.** To answer `x in some_list`, Python checks the items one at a time until it finds a match, so a list of a million items can need a million comparisons. A set uses the same hashing trick as dictionary keys, so `x in some_set` takes about the same very short time however big the set is. When you check membership many times against a large collection, make it a set. (Like dictionary keys, set members must be unchangeable, so a set can hold numbers, strings and tuples, but not lists.)

**Changing a set.** Sets are mutable. `add` puts in one value (doing nothing if it is already there), `remove` takes one out (a `KeyError` if it is missing), and `discard` takes one out if it is there and quietly does nothing if not.

```python type
seen = set()
seen.add("Ada")
seen.add("Grace")
seen.add("Ada")
seen.discard("Linus")
print(seen)
```

```output
{'Ada', 'Grace'}
```

## Set operations

The real power of sets is comparing them. These operations come straight from mathematics, where sets were studied long before computers.

```python type
python_club = {"Ada", "Grace", "Alan", "Linus"}
chess_club = {"Alan", "Magnus", "Grace", "Judit"}
print(python_club | chess_club)
print(python_club & chess_club)
print(python_club - chess_club)
print(python_club ^ chess_club)
```

- `a | b` is the **union**: everything in either set. (Everyone in at least one club.)
- `a & b` is the **intersection**: everything in both. (Members of both clubs.)
- `a - b` is the **difference**: what is in `a` but not in `b`. (Python club members who do not play chess.) Note that `b - a` is a different answer.
- `a ^ b` is the **symmetric difference**: what is in exactly one of them.

You can also ask whether one set is entirely inside another. `a <= b` is `True` when every item of `a` is also in `b`: `a` is a **subset** of `b`.

```python type
required = {"flour", "eggs", "milk"}
cupboard = {"flour", "sugar", "eggs", "milk", "salt"}
print(required <= cupboard)
print(required - cupboard)
```

```output
True
set()
```

A shopping check in one line: everything required is in the cupboard, and `required - cupboard` shows what is missing (nothing, here, so an empty set).

## Choosing a collection

You now know five collections. Here is how to choose between them:

- **str**: text.
- **list**: an ordered group you will change, usually of the same kind of thing. The default choice for "a bunch of items".
- **tuple**: a fixed group of values that belong together, each with its own meaning, like a point or a record. Also for anything that must be a dictionary key.
- **dict**: when you look things up by a key, or count or group things.
- **set**: when all that matters is whether something is present, when duplicates must go, or when comparing groups.

A useful test is to say out loud what you need. "A list of students" is a list. "The mark for each student" is a dictionary. "The students who handed in homework" is a set, since you ask whether someone is in it. "A student's name and year of birth" is a tuple.

::: challenge Unique, in order [easy]
Converting a list to a set removes duplicates but loses the order. Write a function `unique_in_order(items)` that returns a new list with the duplicates removed and the **first** occurrence of each item kept in its original place.

`unique_in_order([3, 1, 3, 2, 1])` returns `[3, 1, 2]`. Use a set to remember what you have already seen, so each check is fast.

```python starter
def unique_in_order(items):
    return items

print(unique_in_order([3, 1, 3, 2, 1]))
```

```python solution
def unique_in_order(items):
    seen = set()
    result = []
    for item in items:
        if item not in seen:
            seen.add(item)
            result.append(item)
    return result

print(unique_in_order([3, 1, 3, 2, 1]))
```

```python test
assert "unique_in_order" in dir(), "Keep the function's name as unique_in_order."
for _items, _want in [([3, 1, 3, 2, 1], [3, 1, 2]), ([], []), (["b", "a", "b"], ["b", "a"]), ([1, 2, 3], [1, 2, 3]), ([7, 7, 7], [7])]:
    _copy = list(_items)
    _got = unique_in_order(_copy)
    assert _got == _want, f"unique_in_order({_items}) should return {_want}, but it returned {_got!r}."
    assert _copy == _items, "unique_in_order should return a new list and leave the list it was given unchanged."
import ast
_tree = ast.parse(_source)
assert any((isinstance(_n, ast.Call) and getattr(_n.func, "id", "") == "set") or isinstance(_n, (ast.Set, ast.SetComp)) for _n in ast.walk(_tree)), "Use a set to remember the items you have already seen."
"SUCCESS: Duplicates gone, order kept."
```

Hint: Keep two things: a set of items seen so far, and a result list. For each item, if it is not in the set yet, add it to both. `x not in seen` is the opposite of `x in seen`.
:::

::: challenge Club members [medium]
Write a function `club_report(club_a, club_b)` that takes two sets of names and returns a tuple of three **sorted lists**:

1. names in both clubs,
2. names only in `club_a`,
3. names in exactly one of the two clubs.

For `{"Ada", "Alan", "Grace"}` and `{"Alan", "Judit"}` it returns `(["Alan"], ["Ada", "Grace"], ["Ada", "Grace", "Judit"])`.

```python starter
def club_report(club_a, club_b):
    return [], [], []

print(club_report({"Ada", "Alan", "Grace"}, {"Alan", "Judit"}))
```

```python solution
def club_report(club_a, club_b):
    both = sorted(club_a & club_b)
    only_a = sorted(club_a - club_b)
    exactly_one = sorted(club_a ^ club_b)
    return both, only_a, exactly_one

print(club_report({"Ada", "Alan", "Grace"}, {"Alan", "Judit"}))
```

```python test
assert "club_report" in dir(), "Keep the function's name as club_report."
for _a, _b in [({"Ada", "Alan", "Grace"}, {"Alan", "Judit"}), (set(), {"X"}), ({"P", "Q"}, {"P", "Q"}), ({"Zed", "Amy", "Bo"}, {"Cy", "Amy"})]:
    _got = club_report(_a, _b)
    _want = (sorted(_a & _b), sorted(_a - _b), sorted(_a ^ _b))
    assert isinstance(_got, tuple) and len(_got) == 3, f"club_report should return a tuple of three lists, but returned {_got!r}."
    assert tuple(_got) == _want, f"For {sorted(_a)} and {sorted(_b)} the report should be {_want}, but it was {_got!r}. Are all three lists sorted?"
"SUCCESS: Intersection, difference and symmetric difference, all in one report."
```

Hint: Each list is one set operation: `&` for both, `-` for only in the first, `^` for exactly one. `sorted` turns a set into a sorted list. Return the three with commas between them to make a tuple.
:::

::: challenge The nearest point [medium]
Points on a map are stored as `(x, y)` tuples. Write a function `nearest(points, target)` that returns the point in `points` that is closest to the point `target`. The straight-line distance between `(x1, y1)` and `(x2, y2)` is

\[
\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}
\]

In Python, a square root can be written as a power of one half: `x ** 0.5`. If two points are equally close, return the one that comes first. If `points` is empty, return `None`. Unpack the tuples into named coordinates rather than writing `p[0]` and `p[1]` everywhere; it makes the formula much easier to read.

```python starter
def nearest(points, target):
    return None

print(nearest([(5, 5), (1, 2), (-1, 0)], (0, 0)))
```

```python solution
def nearest(points, target):
    tx, ty = target
    best = None
    best_distance = None
    for point in points:
        x, y = point
        distance = ((x - tx) ** 2 + (y - ty) ** 2) ** 0.5
        if best is None or distance < best_distance:
            best = point
            best_distance = distance
    return best

print(nearest([(5, 5), (1, 2), (-1, 0)], (0, 0)))
```

```python test
assert "nearest" in dir(), "Keep the function's name as nearest."
for _pts, _t, _want in [
    ([(5, 5), (1, 2), (-1, 0)], (0, 0), (-1, 0)),
    ([(5, 5), (1, 2)], (4, 4), (5, 5)),
    ([(1, 0), (0, 1)], (0, 0), (1, 0)),
    ([(10, 10)], (0, 0), (10, 10)),
    ([], (0, 0), None),
    ([(2, 2), (-3, 1)], (-2, 2), (-3, 1)),
]:
    _got = nearest(_pts, _t)
    assert _got == _want, f"nearest({_pts}, {_t}) should return {_want}, but it returned {_got!r}."
"SUCCESS: You unpacked each point and kept the closest one seen so far."
```

Hint: Unpack the target once, `tx, ty = target`, and each point inside the loop, `x, y = point`. The square root is `** 0.5`. Use the "best so far" pattern, starting with `best = None`, and replace the best only when a point is strictly closer, so ties keep the first.
:::

## What you learned

- A tuple is an immutable sequence: `(3, 4)`. The commas make it; a one-item tuple needs a trailing comma, `(5,)`.
- Use a tuple for a fixed group of values that each mean something, for data that must not change, and for dictionary keys.
- Unpacking assigns each item to a name; `*rest` collects the remaining items into a list.
- A set holds unique values with no order and no indexing. `{}` is an empty dictionary; an empty set is `set()`.
- Sets remove duplicates and make `in` fast. `add`, `remove` and `discard` change them.
- `|`, `&`, `-` and `^` give union, intersection, difference and symmetric difference; `<=` tests for a subset.
- Choose a collection by the shape of the data: list for an ordered group, tuple for a fixed record, dict for lookup, set for membership.

Several times now a change to a list has shown up somewhere you did not expect it, such as the shared default list in lesson 9. Next you will find out exactly why, by looking at how Python's names refer to values.
