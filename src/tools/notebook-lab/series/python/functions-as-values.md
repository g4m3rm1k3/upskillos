# Functions as values

A function is a value, just like a number, a string or a list. You can store it in a variable, put it in a list or a dictionary, pass it to another function, and return it from a function. You have already done a little of this without noticing: `defaultdict(list)` handed the function `list` to `defaultdict`, which called it whenever it needed an empty list.

Treating functions as values is one of the most useful ideas in programming. It lets you write general code that is customised by passing in a small piece of behaviour: "sort these, and here is how to compare them", "do this to every item", "call this when the button is pressed". This lesson covers passing functions around, the `key` argument of `sorted`, the small anonymous functions called `lambda`, functions that create other functions, and how to write functions that accept any number of arguments.

## A function is an object

Without the parentheses, a function's name refers to the function itself rather than calling it. Predict what the first two lines print, and whether the last line is `True` or `False`:

```python type
def shout(text):
    return text.upper() + "!"

print(shout)
print(len)
yell = shout
print(yell("hello"))
print(yell is shout)
```

Printing a function shows what it is, not a result: `<function shout at 0x...>` for your own function (with a memory address), and `<built-in function len>` for one built into Python. `yell = shout` does not call anything; it makes `yell` a second name for the same function object, exactly like assigning a list to a second name in lesson 12. Calling `yell("hello")` runs `shout`. The difference between `shout` and `shout()` matters: the first is the function, the second is the result of calling it.

Functions can be stored in collections like any other value:

```python type
def double(x):
    return x * 2

def square(x):
    return x * x

for operation in [double, square, abs]:
    print(operation.__name__, operation(-3))
```

```output
double -6
square 9
abs 3
```

Every function knows its own name, in the attribute `__name__`.

## Passing a function to a function

A function that takes another function as an argument can leave part of its job to the caller. Here, `apply_to_all` does the looping and the caller decides what happens to each item:

```python type
def apply_to_all(func, items):
    return [func(item) for item in items]

print(apply_to_all(len, ["fig", "banana", "kiwi"]))
print(apply_to_all(str.upper, ["fig", "banana", "kiwi"]))
```

```output
[3, 6, 4]
['FIG', 'BANANA', 'KIWI']
```

`str.upper` is the `upper` method of the string class, used as an ordinary function: `str.upper("fig")` is the same as `"fig".upper()`, just as `Dog.describe(rex)` was the same as `rex.describe()` in lesson 18.

A function that takes or returns functions is called a **higher-order function**. Python's built-in `map` and `filter` are two of them: `map(func, items)` applies a function to every item, and `filter(func, items)` keeps the items for which a function returns true. Both return iterators. Comprehensions usually do the same job more readably, so most Python code uses those instead, but you will see `map` and `filter` in other people's code.

```python type
print(list(map(len, ["fig", "banana"])))
print(list(filter(str.isupper, ["A", "b", "C"])))
```

```output
[3, 6]
['A', 'C']
```

## Sorting with a key

The most common place to pass a function is the `key` argument of `sorted`, `min`, `max` and `list.sort`. The key is a function that is called on each item to get the value to sort by. The items themselves are left unchanged; only their order is decided by the keys. Before running this cell, predict where "Cherry" ends up in the plain sort.

```python type
words = ["banana", "Fig", "apple", "Cherry"]
print(sorted(words))
print(sorted(words, key=len))
print(sorted(words, key=str.lower))
print(max(words, key=len))
```

```output
['Cherry', 'Fig', 'apple', 'banana']
['Fig', 'apple', 'banana', 'Cherry']
['apple', 'banana', 'Cherry', 'Fig']
banana
```

Plain `sorted` puts every capitalised word first, as lesson 4 explained. `key=len` sorts by length. `key=str.lower` sorts by the lowercase form of each word, which is alphabetical order ignoring case; the words keep their original capitals in the result. `max(words, key=len)` finds the longest word, which replaces the "best so far" loop you wrote in lesson 6. (When keys tie, `sorted` keeps the items in their original order, which is why "banana" comes before "Cherry" in the length sort.)

To sort a dictionary's keys by their values, pass the dictionary's `get` method as the key: for each key, it returns the value.

```python type
scores = {"Ada": 91, "Alan": 78, "Grace": 88}
print(sorted(scores, key=scores.get, reverse=True))
```

```output
['Ada', 'Grace', 'Alan']
```

## lambda: small functions without a name

Often the key you need is a tiny calculation that is not worth a full `def`. Sort people by age, where each person is a tuple `(name, age)`: you need a function that returns item 1 of a tuple. A **lambda** creates a small function right where it is needed:

```python type
people = [("Ada", 36), ("Alan", 41), ("Grace", 29)]
print(sorted(people, key=lambda person: person[1]))
print(min(people, key=lambda person: person[1])[0])
```

```output
[('Grace', 29), ('Ada', 36), ('Alan', 41)]
Grace
```

`lambda person: person[1]` means exactly the same as:

```python type
def get_age(person):
    return person[1]

print(sorted(people, key=get_age))
```

```output
[('Grace', 29), ('Ada', 36), ('Alan', 41)]
```

After the word `lambda` come the parameters, then a colon, then a **single expression**, which is automatically returned. There is no `def`, no name and no `return`. A lambda can only contain one expression, never statements such as `if` blocks, loops or assignments, so it is only for small things. (The one-line `a if condition else b` from lesson 4 is an expression, so it is allowed.)

Because a key function can return anything that compares, it can return a **tuple**, and tuples compare item by item (lesson 19). That sorts by one thing and breaks ties with another:

```python type
people = [("Ada", 36), ("Alan", 41), ("Bea", 29), ("Abe", 36)]
print(sorted(people, key=lambda person: (person[1], person[0])))
```

```output
[('Bea', 29), ('Abe', 36), ('Ada', 36), ('Alan', 41)]
```

The key is `(age, name)`, so the people are sorted by age, and the two 36-year-olds are put in alphabetical order.

Use a lambda where a short function is passed straight into another function, as with `key`. If a function deserves a name, or needs more than one line, write it with `def`: it will be easier to read, and it will show a real name in tracebacks.

## Choosing behaviour with a dictionary of functions

Because functions are values, a dictionary can map names to behaviours. This replaces a long `if`/`elif` chain with a lookup, and makes adding a new option a one-line change.

```python type
def add(a, b):
    return a + b

def subtract(a, b):
    return a - b

operations = {
    "+": add,
    "-": subtract,
    "*": lambda a, b: a * b,
    "/": lambda a, b: a / b,
}

for expression in ["6 + 3", "6 - 3", "6 * 3", "6 / 3"]:
    left, symbol, right = expression.split()
    result = operations[symbol](int(left), int(right))
    print(expression, "=", result)
```

```output
6 + 3 = 9
6 - 3 = 3
6 * 3 = 18
6 / 3 = 2.0
```

`operations[symbol]` looks up a function, and the `(...)` after it calls that function. This is called a **dispatch table**, and it is a small version of the Strategy pattern you will meet in the Algorithms & Design Patterns series.

## Functions that make functions

A function can define another function inside itself and return it. The inner function remembers the variables of the function that created it, even after that function has finished:

```python type
def make_multiplier(factor):
    def multiply(x):
        return x * factor
    return multiply

double = make_multiplier(2)
triple = make_multiplier(3)
print(double(10), triple(10))
```

```output
20 30
```

Each call to `make_multiplier` creates a new `multiply` function that remembers its own `factor`: 2 for `double`, 3 for `triple`. A function that remembers variables from the place it was created is called a **closure**.

A closure can also change a variable it remembers, which gives it a private, persistent state. Predict the four numbers the next cell prints. Assigning to that variable needs the `nonlocal` keyword, for the same reason as the `UnboundLocalError` in lesson 9: without it, assignment would create a new local variable inside the inner function.

```python type
def make_counter():
    count = 0
    def counter():
        nonlocal count
        count += 1
        return count
    return counter

clicks = make_counter()
print(clicks(), clicks(), clicks())
other = make_counter()
print(other())
```

```output
1 2 3
1
```

`clicks` keeps its own count between calls, and `other` has a completely separate one. This is the same kind of separate state that objects gave you in lesson 18, built from a function instead of a class.

## Wrapping a function

A function that takes a function and returns a new function can **wrap** it: add behaviour before or after it, without changing the original.

```python type
def announce(func):
    def wrapper(x):
        print(f"calling {func.__name__}({x!r})")
        result = func(x)
        print(f"{func.__name__} returned {result!r}")
        return result
    return wrapper

def square(x):
    return x * x

square = announce(square)
square(7)
```

```output
calling square(7)
square returned 49
49
```

The two lines of output come from the wrapper, and the `49` after them is the value of `square(7)` itself, shown because it is the cell's last line. `announce(square)` returns `wrapper`, which calls the original `square` in the middle. Assigning it back to `square` means every later call goes through the wrapper. A function that wraps another like this is called a **decorator**, and it is used for logging, timing, checking permissions and caching. Python has a special `@` syntax for applying decorators, which you will meet in the next lesson.

## Any number of arguments: *args and **kwargs

`print` accepts any number of arguments, and `max` works with two numbers or twenty. Your own functions can too. A parameter written with one star, `*args`, collects all extra positional arguments into a tuple. One written with two stars, `**kwargs`, collects all extra keyword arguments into a dictionary. (The names `args` and `kwargs` are only a convention; the stars do the work.)

```python type
def total(*numbers):
    return sum(numbers)

print(total(1, 2, 3))
print(total())

def describe(name, **details):
    extras = ", ".join(f"{k}={v}" for k, v in details.items())
    return f"{name} ({extras})"

print(describe("Ada", born=1815, field="maths"))
```

```output
6
0
Ada (born=1815, field=maths)
```

The stars also work the other way round, in a call: `*` spreads a list or tuple out into separate positional arguments, and `**` spreads a dictionary into keyword arguments.

```python type
def point(x, y, z):
    return f"({x}, {y}, {z})"

coords = [1, 2, 3]
print(point(*coords))
options = {"z": 9, "x": 7, "y": 8}
print(point(**options))
```

```output
(1, 2, 3)
(7, 8, 9)
```

Together, these let a wrapper pass along whatever arguments it was given without knowing what they are: `def wrapper(*args, **kwargs): return func(*args, **kwargs)`. That is how real decorators are written, so that they work on any function.

::: challenge Sort the team [easy]
Write a function `sort_team(people)` that takes a list of `(name, age)` tuples and returns a new list sorted by age, youngest first. People with the same age should be ordered by name alphabetically. Use `sorted` with a `key`.

```python starter
def sort_team(people):
    return people

print(sort_team([("Ada", 36), ("Alan", 41), ("Bea", 36), ("Cy", 20)]))
```

```python solution
def sort_team(people):
    return sorted(people, key=lambda person: (person[1], person[0]))

print(sort_team([("Ada", 36), ("Alan", 41), ("Bea", 36), ("Cy", 20)]))
```

```python test
assert "sort_team" in dir(), "Keep the function's name as sort_team."
assert "key" in _source, "Use sorted with a key function."
_team = [("Ada", 36), ("Alan", 41), ("Bea", 36), ("Cy", 20)]
_copy = list(_team)
_got = sort_team(_team)
assert _got == [("Cy", 20), ("Ada", 36), ("Bea", 36), ("Alan", 41)], f"The team should be sorted to [('Cy', 20), ('Ada', 36), ('Bea', 36), ('Alan', 41)], but got {_got}."
assert _team == _copy, "sort_team should return a new list and leave the original in its order."
assert sort_team([("Zed", 30), ("Amy", 30)]) == [("Amy", 30), ("Zed", 30)], "Ties in age should be ordered by name, so ('Amy', 30) comes before ('Zed', 30)."
assert sort_team([]) == [], "sort_team([]) should return []."
"SUCCESS: One key function did the whole job."
```

Hint: Use a key that returns a tuple, as in the lesson: sort by age first, then by name.
:::

::: challenge A running average [medium]
Write a function `make_averager()` that returns a function. Each time the returned function is called with a number, it returns the average of **all** the numbers it has been given so far. Separate averagers must keep separate totals.

```python starter
def make_averager():
    def add(number):
        return number
    return add

avg = make_averager()
print(avg(10), avg(20), avg(60))
```

```python solution
def make_averager():
    total = 0
    count = 0
    def add(number):
        nonlocal total, count
        total += number
        count += 1
        return total / count
    return add

avg = make_averager()
print(avg(10), avg(20), avg(60))
```

```python test
assert "make_averager" in dir(), "Keep the function's name as make_averager."
_a = make_averager()
assert _a(10) == 10, "The first call, avg(10), should return 10."
assert _a(20) == 15, "After 10 and 20 the average is 15."
assert _a(60) == 30, "After 10, 20 and 60 the average is 30."
_b = make_averager()
assert _b(4) == 4, "A second averager must start fresh, so its first call returns 4."
assert _a(10) == 25, "The first averager must keep its own total: after 10, 20, 60 and 10 the average is 25."
"SUCCESS: A closure with its own memory."
```

Hint: The total and the count must survive between calls, so where must they live? And which keyword lets the inner function change them?
:::

::: challenge Compose [medium]
Write a function `compose(*functions)` that returns a new function. The new function takes one value and passes it through each function in turn, **from left to right**, returning the final result. With no functions, it returns the value unchanged.

`compose(str.strip, str.lower, len)("  HeLLo ")` returns 5: strip gives `"HeLLo"`, lower gives `"hello"`, and len gives 5.

```python starter
def compose(*functions):
    def run(value):
        return value
    return run

clean_length = compose(str.strip, str.lower, len)
print(clean_length("  HeLLo "))
```

```python solution
def compose(*functions):
    def run(value):
        for func in functions:
            value = func(value)
        return value
    return run

clean_length = compose(str.strip, str.lower, len)
print(clean_length("  HeLLo "))
```

```python test
assert "compose" in dir(), "Keep the function's name as compose."
assert compose(str.strip, str.lower, len)("  HeLLo ") == 5, "compose(str.strip, str.lower, len)('  HeLLo ') should return 5."
_add1 = lambda x: x + 1
_dbl = lambda x: x * 2
assert compose(_add1, _dbl)(3) == 8, "Functions must run left to right: add 1 then double turns 3 into 8."
assert compose(_dbl, _add1)(3) == 7, "Double then add 1 turns 3 into 7."
assert compose()(42) == 42, "With no functions, compose()(42) should return 42 unchanged."
_f = compose(_add1)
assert _f(1) == 2 and _f(10) == 11, "A composed function must work when called more than once."
"SUCCESS: Functions in, a new function out."
```

Hint: `functions` arrives as a tuple of functions, and `run` is a closure, so it can still see that tuple after `compose` has returned.
:::

## What you learned

- Functions are values: without parentheses a name refers to the function itself. They can be assigned, stored in lists and dictionaries, passed and returned.
- A higher-order function takes or returns functions. `map` and `filter` are built in, though comprehensions are usually clearer.
- `sorted`, `min`, `max` and `list.sort` take a `key` function that says what to compare. A key that returns a tuple sorts by several things.
- `lambda params: expression` makes a small unnamed function; use `def` for anything bigger or worth naming.
- A dictionary of functions (a dispatch table) replaces a long `if`/`elif` chain.
- A closure is an inner function that remembers the variables where it was created; `nonlocal` lets it change them.
- A decorator is a function that wraps another function to add behaviour.
- `*args` collects extra positional arguments into a tuple, `**kwargs` collects keyword arguments into a dictionary, and `*` and `**` in a call spread them back out.

Next you will add type hints, which document what a function expects and returns, and meet dataclasses, which write the boring parts of a class for you. They use the `@` decorator syntax that this lesson set up.
