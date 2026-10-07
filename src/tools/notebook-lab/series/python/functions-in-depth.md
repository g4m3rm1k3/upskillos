# Functions in depth

The last lesson covered the core of functions: parameters in, a value out through `return`. This lesson fills in the details that make functions pleasant to use and safe to rely on. You will give parameters default values so callers can leave them out, pass arguments by name so calls explain themselves, return several values at once, and learn precisely which variables a function can see and change.

Along the way you will meet the **tuple**, Python's simplest way to bundle a few values together, and two tools it makes possible, `enumerate` and `zip`, which make many loops shorter and clearer.

## Default values

Some parameters almost always get the same value. A parameter can be given a **default**, which is used whenever the caller leaves that argument out.

```python type
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

print(greet("Ada"))
print(greet("Ada", "Good morning"))
```

```output
Hello, Ada!
Good morning, Ada!
```

`greeting="Hello"` in the definition means: if no second argument is given, use `"Hello"`. The first call gives one argument, so `greeting` gets its default. The second gives two, so the default is ignored. A parameter with a default is **optional**; one without a default is **required**, and leaving it out is an error.

Parameters with defaults must come after all the required ones. Otherwise Python could not tell which argument was meant for which parameter:

```python error SyntaxError
def greet(greeting="Hello", name):
    return f"{greeting}, {name}!"
```

The message says exactly that: `parameter without a default follows parameter with a default`.

## Passing arguments by name

So far arguments have been matched to parameters by position. You can also pass an argument by writing the parameter's name, an equals sign and the value. This is called a **keyword argument**.

```python type
def describe_pet(animal, pet_name):
    return f"{pet_name} is a {animal}."

print(describe_pet(pet_name="Mittens", animal="cat"))
print(describe_pet("dog", pet_name="Rex"))
```

```output
Mittens is a cat.
Rex is a dog.
```

With keyword arguments the order does not matter, because each value is labelled; the first call cannot suffer the mix-up you saw last lesson. You can combine the two styles, but positional arguments must come first.

Keyword arguments make calls much easier to read, especially for values like `True`, numbers and options, whose meaning is invisible from the value alone. Compare `make_box(3, 4, True)` with `make_box(width=3, height=4, filled=True)`. You have already used this: `sort(reverse=True)` passes the argument `True` to the parameter `reverse`.

`print` itself has two useful keyword parameters. `sep` is what goes between the items, a space by default, and `end` is what goes at the end, a new line by default.

```python type
print("a", "b", "c", sep="-")
print("no new line after this", end="")
print(" ... so this continues it")
for i in range(5):
    print(i, end=" ")
```

```output
a-b-c
no new line after this ... so this continues it
0 1 2 3 4
```

## Returning several values

A function can return more than one value by separating them with commas. The caller can then unpack them into separate variables in one assignment.

```python type
def min_and_max(numbers):
    return min(numbers), max(numbers)

low, high = min_and_max([7, 2, 9, 4])
print("Low:", low)
print("High:", high)
print(min_and_max([7, 2, 9, 4]))
```

```output
Low: 2
High: 9
(2, 9)
```

`low, high = ...` is an **unpacking assignment**: the first value goes to `low`, the second to `high`. The last line shows what the function really returns: `(2, 9)`, a single value in round brackets. That is a **tuple**: a fixed sequence of values, written with commas and usually round brackets. You can index a tuple and loop over it like a list, but, like a string, a tuple cannot be changed once it is made. Lesson 11 looks at tuples properly; for now, all you need is that commas make a tuple, and that a tuple can be unpacked into separate names.

Unpacking needs exactly the right number of names. `a, b = (1, 2, 3)` is a `ValueError`: too many values to unpack.

Unpacking also gives Python its famous one-line swap. In lesson 2 you swapped two variables with a temporary third one. Now you can write:

```python type
a = 5
b = 9
a, b = b, a
print(a, b)
```

```output
9 5
```

The right-hand side `b, a` is worked out first, making the tuple `(9, 5)`, and only then is it unpacked into `a` and `b`. Nothing is overwritten too early.

## enumerate and zip

Tuples and unpacking make two built-in functions possible that clean up many `for` loops.

In lesson 6 you looped over positions with `range(len(items))` to get both the position and the item. `enumerate` does this directly: it gives you a tuple of (position, item) for each item, which you unpack in the `for` line.

```python type
runners = ["Kim", "Sam", "Lee"]
for position, name in enumerate(runners):
    print(position, name)
for place, name in enumerate(runners, start=1):
    print(f"{place}. {name}")
```

```output
0 Kim
1 Sam
2 Lee
1. Kim
2. Sam
3. Lee
```

`enumerate(runners, start=1)` counts from 1 instead of 0, which is exactly what a numbered list for people needs. No `runners[i]`, and no chance of an off-by-one mistake.

`zip` walks through two (or more) lists side by side, giving a tuple of the matching items from each:

```python type
names = ["Ada", "Grace", "Alan"]
scores = [91, 88, 79]
for name, score in zip(names, scores):
    print(f"{name}: {score}")
```

```output
Ada: 91
Grace: 88
Alan: 79
```

If the lists have different lengths, `zip` stops when the shortest one runs out.

## Scope: which names a function can see

A name's **scope** is the part of the program where it can be used. Last lesson you saw that variables created inside a function are **local**: they exist only inside it. Names created outside any function, at the top level of the program, are **global**.

A function can **read** a global variable:

```python type
tax_rate = 0.2

def with_tax(price):
    return price * (1 + tax_rate)

print(with_tax(50))
```

```output
60.0
```

When Python meets a name inside a function, it looks first among the function's local names, and if it is not there, among the global ones. `tax_rate` is not local, so the global one is used.

**Assigning** to a name inside a function is different. Any assignment inside a function creates a local variable, even if a global variable has the same name. The global one is untouched:

```python type
count = 0

def increase():
    count = 100
    return count

print(increase())
print(count)
```

```output
100
0
```

The function's `count` is a separate, local variable that happens to share a name. The global `count` is still 0. This protection is what lets you use common names inside functions without accidentally changing the rest of the program.

The two rules combine into a confusing error. Predict what happens here.

```python error UnboundLocalError
count = 0

def increase():
    count = count + 1
    return count

increase()
```

Because `count` is assigned inside the function, Python treats `count` as local for the **whole** function, including the right-hand side, which runs first. At that moment the local `count` has no value yet. The message is: `cannot access local variable 'count' where it is not associated with a value`.

There is a keyword, `global`, that tells Python a name inside a function means the global variable, so it can be changed. It works, but programmers avoid it, because a function that changes global variables is hard to understand and hard to test: calling it has effects you cannot see from the call. The better design is almost always to pass the value in and return the new value out:

```python type
def increase(count):
    return count + 1

count = 0
count = increase(count)
count = increase(count)
print(count)
```

```output
2
```

Everything the function uses comes in through its parameters, and everything it produces goes out through `return`. A function like this, whose result depends only on its arguments and which changes nothing else, is called a **pure function**. Pure functions are the easiest kind to reason about and to test, so write functions this way whenever you can.

## The mutable default trap

Default values have one famous trap. A default value is created **once**, when the `def` line runs, not each time the function is called. For numbers and strings this makes no difference, because they cannot be changed. For a list, it means every call that uses the default shares the **same** list.

Predict what the three calls print.

```python type
def add_item(item, basket=[]):
    basket.append(item)
    return basket

print(add_item("apple"))
print(add_item("bread"))
print(add_item("milk"))
```

```output
['apple']
['apple', 'bread']
['apple', 'bread', 'milk']
```

You might expect three one-item baskets. Instead the basket keeps growing: `['apple']`, then `['apple', 'bread']`, then `['apple', 'bread', 'milk']`. All three calls used the one default list made when the function was defined, and each `append` changed it.

Notice what this shows about lists and functions. When a function receives a list, its parameter refers to that **same** list, not to a copy, so `append` inside the function changes the list the caller has too. That is why the default list, one list shared by every call, kept growing. Lesson 12 explains exactly why Python works this way.

The standard fix is to use `None` as the default, and create a fresh list inside the function when no list was given:

```python type
def add_item(item, basket=None):
    if basket is None:
        basket = []
    basket.append(item)
    return basket

print(add_item("apple"))
print(add_item("bread"))
```

```output
['apple']
['bread']
```

`basket is None` checks whether the value is `None`. (`is` asks whether two names refer to the very same object, which is the right way to test for `None`. Lesson 12 explains the difference between `is` and `==`.) Now each call without a basket gets its own new list. Never use a list, or anything else that can be changed, as a default value.

::: challenge Flexible greetings [easy]
Write a function `make_greeting(name, greeting="Hello", punctuation="!")` that returns a greeting built from its three parts:

- `make_greeting("Ada")` returns `"Hello, Ada!"`
- `make_greeting("Ada", "Hi")` returns `"Hi, Ada!"`
- `make_greeting("Ada", punctuation="?")` returns `"Hello, Ada?"`

```python starter
def make_greeting(name):
    return ""

print(make_greeting("Ada"))
```

```python solution
def make_greeting(name, greeting="Hello", punctuation="!"):
    return f"{greeting}, {name}{punctuation}"

print(make_greeting("Ada"))
```

```python test
assert "make_greeting" in dir(), "Keep the function's name as make_greeting."
_cases = [
    (("Ada",), {}, "Hello, Ada!"),
    (("Ada", "Hi"), {}, "Hi, Ada!"),
    (("Ada",), {"punctuation": "?"}, "Hello, Ada?"),
    (("Grace",), {"greeting": "Welcome", "punctuation": "."}, "Welcome, Grace."),
    ((), {"name": "Alan", "greeting": "Hey"}, "Hey, Alan!"),
]
for _args, _kwargs, _want in _cases:
    try:
        _got = make_greeting(*_args, **_kwargs)
    except TypeError as _e:
        raise AssertionError(f"Calling make_greeting with {_args} and {_kwargs} failed: {_e}. Check the parameter names and defaults.")
    assert _got == _want, f"make_greeting with {_args} and {_kwargs} should return {_want!r}, but returned {_got!r}."
"SUCCESS: Defaults and keyword arguments working together."
```

Hint: Add the two extra parameters with their defaults after `name`, exactly as named in the instructions, since callers pass them by name. An f-string can put all three parts together.
:::

::: challenge Smallest and largest [medium]
Write a function `smallest_and_largest(numbers)` that returns two values: the smallest and the largest number in the list, found in a **single** loop and without using `min` or `max`. For an empty list, return `None, None`.

`low, high = smallest_and_largest([7, 2, 9, 4])` gives `low` = 2 and `high` = 9.

```python starter
def smallest_and_largest(numbers):
    return None, None

low, high = smallest_and_largest([7, 2, 9, 4])
print(low, high)
```

```python solution
def smallest_and_largest(numbers):
    if len(numbers) == 0:
        return None, None
    smallest = numbers[0]
    largest = numbers[0]
    for n in numbers:
        if n < smallest:
            smallest = n
        if n > largest:
            largest = n
    return smallest, largest

low, high = smallest_and_largest([7, 2, 9, 4])
print(low, high)
```

```python test
assert "smallest_and_largest" in dir(), "Keep the function's name as smallest_and_largest."
assert "min(" not in _source and "max(" not in _source, "Find both values with your own loop, without min or max."
for _nums in [[7, 2, 9, 4], [5], [-3, -8, -1], [2, 2, 2], [10, 1, 10, 1]]:
    _got = smallest_and_largest(_nums)
    _want = (min(_nums), max(_nums))
    assert tuple(_got) == _want, f"For {_nums} the function should return {_want}, but it returned {_got!r}."
_got = smallest_and_largest([])
assert tuple(_got) == (None, None), f"For an empty list the function should return None, None, but it returned {_got!r}."
"SUCCESS: Both values found in one pass through the list."
```

Hint: Handle the empty list first, with an early return. Otherwise, start both `smallest` and `largest` at the first number.
:::

::: challenge Fix the shared list [medium]
The function `record` is meant to add a score to a list of scores and return the list. When no list is passed in, each call should start a **new** list. It has the mutable default bug from the lesson: calls without a list keep sharing one. Fix it, so that the three calls in the starter print `[5]`, `[8]` and `[1, 2, 3]`.

```python starter
def record(score, scores=[]):
    scores.append(score)
    return scores

print(record(5))
print(record(8))
print(record(3, [1, 2]))
```

```python solution
def record(score, scores=None):
    if scores is None:
        scores = []
    scores.append(score)
    return scores

print(record(5))
print(record(8))
print(record(3, [1, 2]))
```

```python test
assert "record" in dir(), "Keep the function's name as record."
_a = record(10)
_b = record(20)
assert _a == [10] and _b == [20], f"Two calls without a list should give two separate new lists, [10] and [20], but they gave {_a} and {_b}. The default list is still being shared."
_mine = [1]
_c = record(2, _mine)
assert _c == [1, 2] and _mine == [1, 2], "When a list is passed in, the score should be added to that list."
assert _stdout.splitlines()[:3] == ["[5]", "[8]", "[1, 2, 3]"], f"The starter's three prints should show [5], [8] and [1, 2, 3], but showed {_stdout.splitlines()[:3]}."
"SUCCESS: Each call gets a fresh list unless it passes its own."
```

Hint: Change the default to `None`. At the start of the body, check `if scores is None:` and, if so, make `scores` a new empty list. A list created inside the body is created fresh on every call.
:::

## What you learned

- A parameter can have a default, `name="value"`, making it optional. Defaults come after required parameters.
- Keyword arguments, `f(width=3)`, are matched by name, not position, and make calls easier to read. `print` has `sep` and `end`.
- `return a, b` returns a tuple, and `x, y = f()` unpacks it. `a, b = b, a` swaps two variables.
- `enumerate(items, start=1)` gives position and item together; `zip(a, b)` walks two lists side by side.
- Functions can read global variables, but assigning to a name inside a function makes it local. Reading it before assigning it there is an `UnboundLocalError`.
- Prefer pure functions: take values in through parameters and give results back through `return`, instead of changing global variables.
- A default value is created once. Never use a list as a default; use `None` and create the list inside the function.

Lists find things by position. Next you will meet the dictionary, which finds things by name: look up a word and get its definition, look up a product and get its price.
