# Functions

You have been using functions since the first line of the first lesson: `print`, `len`, `round`, `sorted`, `max`. Each one packages up a piece of work behind a name. You do not need to know how `sorted` sorts a list; you hand it a list and get a sorted one back. That is what makes these functions so useful: they let you think about *what* you want done instead of *how* it is done.

In this lesson you will write your own functions. This is the point where programs stop being a single long list of instructions and start being built out of named parts, and it is the most important step in learning to write programs that stay understandable as they grow.

## Why write functions

Suppose a program needs to convert temperatures from Celsius to Fahrenheit in three different places. Without functions, you write the formula three times. If you then discover a mistake in it, you have to find and fix all three copies, and hope you did not miss one. With a function, the formula exists in exactly one place, under a name that says what it does.

Functions give you three things:

- **No repetition.** Write a piece of logic once and use it as many times as you like.
- **Names for ideas.** `fahrenheit(21)` says what is happening; `21 * 9 / 5 + 32` makes the reader work it out.
- **Smaller problems.** A big task can be split into functions that each do one job, and each can be written and tested on its own.

## Defining and calling a function

```python type
def greet():
    print("Hello!")
    print("Welcome to functions.")

greet()
greet()
```

```output
Hello!
Welcome to functions.
Hello!
Welcome to functions.
```

The `def` line **defines** a function. `def` is short for "define", then comes the function's name, a pair of parentheses, and a colon. The indented block below it is the function's **body**: the code it will run.

Defining a function does not run its body. It only teaches Python the new name. The body runs each time the function is **called**, by writing its name followed by parentheses: `greet()`. Here it is called twice, so the two lines print twice. Try deleting the two calls and running the cell: nothing is printed at all, because the function was defined but never used.

A function has to be defined before it is called. Python runs a cell from the top, so if the call comes first, Python has not yet seen the `def` and the name does not exist yet. That is a `NameError`, just like using a variable before assigning it.

## Parameters: giving a function input

Most functions need some information to work with. A function lists what it needs in its parentheses as **parameters**, which are names for the values it will be given.

```python type
def greet(name):
    print(f"Hello, {name}!")

greet("Ada")
greet("Grace")
```

```output
Hello, Ada!
Hello, Grace!
```

`name` is a parameter. When you call `greet("Ada")`, the value `"Ada"` is called an **argument**, and Python makes the parameter `name` refer to it while the body runs. On the next call, `name` refers to `"Grace"`. The parameter is the placeholder in the definition; the argument is the actual value in the call.

A function can have several parameters, separated by commas. The arguments are matched to them in order: the first argument to the first parameter, the second to the second.

```python type
def describe_pet(animal, pet_name):
    print(f"{pet_name} is a {animal}.")

describe_pet("cat", "Mittens")
describe_pet("Mittens", "cat")
```

```output
Mittens is a cat.
cat is a Mittens.
```

The second call has the arguments in the wrong order, and Python does exactly what it was told: it prints "cat is a Mittens." Python has no idea which order you meant; it matches by position.

## Returning a value

The functions above print things, but most of the built-in functions you know do something different: they give back a value that you can store or use in a calculation. `len("hello")` does not print 5; it gives you 5 to do something with. A function sends back a value with a `return` statement.

```python type
def fahrenheit(celsius):
    return celsius * 9 / 5 + 32

today = fahrenheit(21)
print(today)
print(fahrenheit(100) - fahrenheit(0))
```

```output
69.8
180.0
```

When Python reaches `return`, the function stops and the call is replaced by the returned value. So `fahrenheit(21)` becomes `69.8`, and that value is stored in `today`. Because a call to `fahrenheit` produces a number, it can be used anywhere a number can: in a calculation, in an f-string, as the argument to another function.

## return is not print

This is the most important distinction in this lesson, and the one that trips up almost every beginner. **`print` shows a value to the person reading the output. `return` hands a value back to the code that called the function.** They look similar in a notebook, because both make something appear, but they do completely different jobs.

Predict what each line of this cell shows.

```python type
def area_printed(width, height):
    print(width * height)

def area_returned(width, height):
    return width * height

a = area_printed(3, 4)
b = area_returned(3, 4)
print("a is", a)
print("b is", b)
```

```output
12
a is None
b is 12
```

`area_printed(3, 4)` prints `12` as it runs, but it returns nothing, so `a` is `None`: the same "nothing" value you met when `sort()` returned `None`. Any function that ends without reaching a `return` gives back `None`. `area_returned` prints nothing while it runs, but `b` holds 12 and can be used in further calculations. To see the difference, click **+ Add cell** at the bottom of the page and try `a + 1` and then `b + 1` in the new cell.

The rule of thumb: a function that calculates something should **return** it, and let the caller decide whether to print it, store it or use it. Printing inside a function is only right when showing something is the function's whole purpose, like `greet`.

## return ends the function

`return` stops the function immediately, even if there are more lines after it. This is often used to return early once the answer is known.

```python type
def sign(number):
    if number > 0:
        return "positive"
    if number < 0:
        return "negative"
    return "zero"

print(sign(7), sign(-2), sign(0))
```

```output
positive negative zero
```

Once `number > 0` is true and `"positive"` is returned, the rest of the body never runs. This is why the second test does not need to be an `elif`: if the first `return` happened, Python never reaches it. The final `return "zero"` only runs when neither earlier `return` did.

A `return` inside a loop ends the loop and the function together. That makes searching very neat: return the moment you find what you are looking for.

```python type
def first_negative(numbers):
    for n in numbers:
        if n < 0:
            return n
    return None

print(first_negative([4, 8, -3, 5, -9]))
print(first_negative([1, 2, 3]))
```

```output
-3
None
```

Compare this with the `break` pattern from the last lesson. Here there is no extra variable to set and no `break`: `return n` hands back the answer and stops everything. The `return None` after the loop only runs if the loop finishes without finding a negative number.

## Variables inside a function stay inside

Variables created inside a function, including its parameters, are **local**: they exist only while the function runs, and only inside it. Once the function returns, they are gone.

```python error NameError
def add_tax(price):
    tax = price * 0.2
    return price + tax

total = add_tax(50)
print(total)
print(tax)
```

`total` prints fine: `60.0`. But `tax` was created inside `add_tax`, so outside the function the name does not exist, and asking for it is a `NameError`. This is a feature, not a limitation. It means you can use a name like `tax` or `total` inside a function without worrying that it will clash with a variable of the same name elsewhere in the program. A function's own variables are sealed inside it: they cannot leak out, and nothing outside can see them. The next lesson looks at these rules, called **scope**, more closely.

## Functions that use other functions

Once a function exists, other functions can call it, and that is how larger programs are built: small, tested pieces combined into bigger ones.

```python type
def average(numbers):
    return sum(numbers) / len(numbers)

def describe_scores(scores):
    avg = average(scores)
    best = max(scores)
    return f"{len(scores)} scores, average {avg:.1f}, best {best}"

print(describe_scores([72, 88, 95, 61]))
```

```output
4 scores, average 79.0, best 95
```

`describe_scores` does not need to know how an average is calculated; it just calls `average`. If you later improve `average`, every function that uses it benefits at once.

## Describing a function: docstrings

A string on the first line of a function's body is its **docstring**, short for documentation string. It describes what the function does, what it expects and what it returns. It does not affect how the function runs, but Python keeps it, and the built-in `help` function shows it.

```python type
def bmi(weight_kg, height_m):
    """Return the body mass index for a weight in kilograms and a height in metres."""
    return weight_kg / height_m ** 2

print(round(bmi(70, 1.75), 1))
help(bmi)
```

```output
22.9
Help on function bmi:

bmi(weight_kg, height_m)
    Return the body mass index for a weight in kilograms and a height in metres.
```

Docstrings are written in triple quotes by convention, even when they fit on one line. Writing one also helps you: if you cannot describe what a function does in a sentence, it is probably trying to do too many things.

## Designing a function

When you write a function, decide three things before writing its body:

1. **Its name.** Usually a verb or a description of the result: `count_vowels`, `fahrenheit`, `is_valid_email`. A function that answers a yes-or-no question often starts with `is_` or `has_` and returns `True` or `False`.
2. **Its inputs.** What does it need to know? Those are its parameters.
3. **Its output.** What does it give back? That is what it returns.

Then test it by calling it with a few examples whose answers you already know, including awkward ones: an empty list, a zero, a negative number. A function is easy to test precisely because it is separate from the rest of the program.

::: challenge Return, don't print [easy]
The function `rectangle_area` in the starter prints the area instead of returning it, so code that tries to use the result gets `None`. Run it first and read the error. Then fix the function so that it **returns** the area, and the last line prints `Total area: 22`.

```python starter
def rectangle_area(width, height):
    print(width * height)

total = rectangle_area(3, 4) + rectangle_area(2, 5)
print("Total area:", total)
```

```python solution
def rectangle_area(width, height):
    return width * height

total = rectangle_area(3, 4) + rectangle_area(2, 5)
print("Total area:", total)
```

```python test
import io, contextlib
assert "rectangle_area" in dir(), "Keep the function's name as rectangle_area."
with contextlib.redirect_stdout(io.StringIO()) as _out:
    _result = rectangle_area(6, 7)
assert _result == 42, f"rectangle_area(6, 7) should return 42, but it returned {_result!r}. Replace print with return."
assert _out.getvalue() == "", "rectangle_area should return the area without printing anything."
assert "Total area: 22" in _stdout, "The last line should print: Total area: 22"
"SUCCESS: The function returns its result, so the caller can add the areas together."
```

Hint: Change `print(width * height)` to `return width * height`. Before the fix, each call gives back `None`, and `None + None` is the error you saw.
:::

::: challenge Count the vowels [medium]
Write a function `count_vowels(text)` that returns how many vowels (a, e, i, o, u) are in `text`, counting capital letters too. `count_vowels("Hello World")` returns 3, and `count_vowels("")` returns 0.

```python starter
def count_vowels(text):
    return 0

print(count_vowels("Hello World"))
```

```python solution
def count_vowels(text):
    count = 0
    for letter in text.lower():
        if letter in "aeiou":
            count += 1
    return count

print(count_vowels("Hello World"))
```

```python test
assert "count_vowels" in dir(), "Keep the function's name as count_vowels."
for _text, _want in [("Hello World", 3), ("", 0), ("rhythm", 0), ("AEIOU", 5), ("Programming in Python", 5), ("Queueing", 5)]:
    _got = count_vowels(_text)
    assert _got == _want, f"count_vowels({_text!r}) should return {_want}, but it returned {_got!r}."
"SUCCESS: count_vowels works for any text, capitals included."
```

Hint: Loop over the letters of `text.lower()`, so capitals are counted too. `letter in "aeiou"` checks whether a letter is a vowel. Use a counter as an accumulator, and return it after the loop.
:::

::: challenge Keep it in range [medium]
Write a function `clamp(value, low, high)` that returns `value` if it lies between `low` and `high`, returns `low` if `value` is smaller than `low`, and returns `high` if it is larger than `high`. This is used everywhere, from keeping a game character on the screen to limiting a volume control.

`clamp(15, 0, 10)` returns 10, `clamp(-3, 0, 10)` returns 0, and `clamp(7, 0, 10)` returns 7. Do not use the built-in `min` or `max` for this one.

```python starter
def clamp(value, low, high):
    return value

print(clamp(15, 0, 10))
```

```python solution
def clamp(value, low, high):
    if value < low:
        return low
    if value > high:
        return high
    return value

print(clamp(15, 0, 10))
```

```python test
assert "clamp" in dir(), "Keep the function's name as clamp."
assert "min(" not in _source and "max(" not in _source, "Solve this one with if statements rather than min or max."
for _args, _want in [((15, 0, 10), 10), ((-3, 0, 10), 0), ((7, 0, 10), 7), ((0, 0, 10), 0), ((10, 0, 10), 10), ((2.5, 1.0, 2.0), 2.0), ((-50, -10, -5), -10)]:
    _got = clamp(*_args)
    assert _got == _want, f"clamp{_args} should return {_want}, but it returned {_got!r}."
"SUCCESS: clamp keeps any value within its limits."
```

Hint: Two `if` statements with early returns do it: if the value is below `low`, return `low`; if it is above `high`, return `high`. If neither happened, the value is already in range, so return it unchanged.
:::

## What you learned

- `def name(parameters):` defines a function. Its body runs only when the function is called, as `name(arguments)`.
- Parameters are the names in the definition; arguments are the values passed in a call, matched in order.
- `return value` hands a value back to the caller and ends the function at once. A function with no `return` gives back `None`.
- `print` shows a value to a person; `return` gives it to the code. Functions that calculate should return.
- Variables created inside a function are local: they vanish when it returns and do not clash with names outside.
- Functions can call other functions, which is how programs are built from small tested pieces.
- A docstring describes what a function does, and `help` shows it.

Next you will look more closely at how functions work: default values for parameters, passing arguments by name, returning several values at once, and the exact rules for which names a function can see.
