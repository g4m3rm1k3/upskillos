# Numbers and variables

In the last lesson every calculation was thrown away the moment it was printed. If you worked out the number of seconds in a day and then wanted the number of seconds in a week, you had to type the first calculation again. Real programs cannot work like that. They need to remember a result, give it a name, and use it later: the price of an item, the score in a game, the temperature read from a sensor.

This lesson is about **variables**, which are how a program remembers things, and about the two kinds of number Python works with. By the end you will be able to store values under names, update them, and predict exactly what Python's arithmetic will give you, including a few results that surprise almost everyone the first time.

## Giving a value a name

A **variable** is a name that refers to a value. You create one with an **assignment**: a name, an equals sign, and a value.

```python type
hours_per_day = 24
print(hours_per_day)
print(hours_per_day * 7)
```

```output
24
168
```

The first line does not print anything. It tells Python: "from now on, the name `hours_per_day` refers to the number 24." After that, wherever the name appears, Python uses the value it refers to. That is why `hours_per_day * 7` prints `168`.

The equals sign in Python does not mean what it means in mathematics. In maths, `x = 5` states a fact: x and 5 are equal. In Python, `x = 5` is an instruction: make the name `x` refer to 5. It is an action, performed at one moment, like writing a label and sticking it on a box. Some people read `=` aloud as "becomes" or "gets" to keep this straight: "x gets 5".

Notice the difference quotation marks make, exactly as in the last lesson. `print(hours_per_day)` prints `24`, because without quotes Python looks up the name. `print("hours_per_day")` would print the text `hours_per_day`, because with quotes it is just characters.

## The right-hand side is worked out first

When Python runs an assignment, it first works out the value on the right of the `=`, and only then attaches the name on the left to that result. This means the right-hand side can be any calculation, including one that uses other variables.

Predict what this cell prints before you run it.

```python type
seconds_per_minute = 60
minutes_per_hour = 60
seconds_per_hour = seconds_per_minute * minutes_per_hour
seconds_per_day = seconds_per_hour * 24
print(seconds_per_hour)
print(seconds_per_day)
```

```output
3600
86400
```

It prints `3600` and `86400`. Each line builds on the ones above it, and every number now has a name that says what it means. Compare `seconds_per_hour * 24` with `60 * 60 * 24`: the first explains itself, while the second leaves the reader to work out what each 60 is for. Good names are one of the cheapest ways to make code easy to understand.

## Changing a variable

A variable can be given a new value at any time by assigning to it again. The name then refers to the new value, and the old one is forgotten.

Predict both lines of output.

```python type
score = 10
print(score)
score = 25
print(score)
```

```output
10
25
```

The first `print` shows `10` and the second shows `25`. The program runs from the top down, so each `print` shows whatever the name refers to at that moment.

Now a line that looks impossible if you read `=` as "equals":

```python type
score = 10
score = score + 5
print(score)
```

```output
15
```

In mathematics, `score = score + 5` has no solution. In Python it is completely ordinary, because the right-hand side is worked out first. Python looks up `score` (10), adds 5 to get 15, and then makes `score` refer to 15. The line means "increase score by 5".

Updating a variable in terms of itself is so common that Python has a shorter way to write it. `score += 5` means exactly the same as `score = score + 5`. There are matching versions for the other operators: `-=`, `*=` and `/=`.

```python type
lives = 3
lives -= 1
print("Lives left:", lives)
coins = 50
coins *= 2
print("Coins:", coins)
```

```output
Lives left: 2
Coins: 100
```

## Order matters

Because a program runs one line at a time, a variable only has a value from the line where it is assigned. Use it before that, and Python has never heard of it.

```python error NameError
print(total_price)
total_price = 42
```

This is the same `NameError` you met in the last lesson, and the message reads the same way: `name 'total_price' is not defined`. Nothing is misspelt this time; the name simply has no value yet on line 1, because line 2 has not run. Swap the two lines and run the cell again, and it works.

Here is a subtler version of the same idea. Predict what this prints: 30 or 20?

```python type
width = 10
area = width * 2
width = 15
print(area)
```

```output
20
```

It prints `20`. When the second line ran, `width` was 10, so `area` was set to 20. Changing `width` later does not go back and recalculate `area`; `area` refers to the number 20, not to the calculation that produced it. A spreadsheet would update the cell automatically, but a Python variable is not a formula. It holds whatever value it was last given.

## Choosing names

Python has a few rules about what a name can be:

- It can contain letters, digits and underscores (`_`), but no spaces or other symbols.
- It cannot start with a digit.
- Capital letters count: `Score` and `score` are two different variables, just as `Print` and `print` were different names in the last lesson.
- It cannot be one of the few dozen words Python reserves for itself, such as `if`, `for` and `class`.

Break a rule and you get a syntax error before anything runs:

```python error SyntaxError
2nd_place = "Ada"
```

The message, `invalid decimal literal`, is Python's way of saying it read the `2` as the start of a number and then found letters where more digits should be. A name like `second_place` or `place_2` is fine.

Beyond the rules there is a strong convention. Python programmers write variable names in lowercase with underscores between words, like `seconds_per_day` or `total_price`. This style is called **snake case**. And choose names that say what the value means. `d = 86400` is legal, but a week later you will have to work out what `d` was; `seconds_per_day = 86400` tells you.

## Two kinds of number: int and float

Python has two main kinds of number. An **integer**, or `int`, is a whole number: `7`, `0`, `-3`. A **floating-point number**, or `float`, is a number with a decimal point: `7.5`, `0.25`, `-3.0`. The name "floating point" refers to how the computer stores them: the decimal point can "float" to any position, so the same format can hold both 0.000001 and 1000000.0.

Every value in Python has a **type**, and the built-in function `type` tells you what it is.

```python type
print(type(7))
print(type(7.0))
print(type(10 / 2))
print(type(10 + 2))
```

```output
<class 'int'>
<class 'float'>
<class 'float'>
<class 'int'>
```

Each line prints something like `<class 'int'>`. Read that as "the type is int"; the word "class" is Python's general name for a type, and you will learn what it really means much later. `7` and `7.0` are equal in value but different in type: one is an `int`, the other a `float`. This explains the mystery from the last lesson. Division with `/` always produces a float, even when the answer is whole, because in general dividing two whole numbers does not give a whole number. `10 / 2` is `5.0`, a float. Addition, subtraction and multiplication of two ints give an int.

When an int and a float meet in one calculation, the result is a float. Python will not throw away the part after the decimal point unless you ask it to.

```python type
print(3 + 0.5)
print(2 * 1.5)
print(4 - 4.0)
```

```output
3.5
3.0
0.0
```

## Whole-number division and remainders

Often you want division that stays in whole numbers: how many full boxes can I fill, and how many items are left over? Python has two operators for exactly this.

- `//` is **floor division**: it divides and then rounds down to a whole number.
- `%` gives the **remainder** after that division. (It is often called "modulo" or "mod".)

Predict both results: 17 items packed into boxes of 5.

```python type
items = 17
box_size = 5
print("Full boxes:", items // box_size)
print("Left over:", items % box_size)
```

```output
Full boxes: 3
Left over: 2
```

`17 // 5` is `3`, because 5 fits into 17 three whole times, and `17 % 5` is `2`, because three boxes of 5 use 15 items and 2 remain. The two always fit together: `box_size * full_boxes + left_over` gets you back to 17.

This pair of operators turns up constantly. Converting a number of seconds into minutes and seconds is the same problem as filling boxes: `125 // 60` is 2 full minutes, and `125 % 60` is 5 seconds left over. The remainder also tells you whether one number divides another exactly: `n % 2` is 0 for every even number and 1 for every odd one.

## When floats are not exact

Run this cell. What do you expect `0.1 + 0.2` to be?

```python type
print(0.1 + 0.2)
print(0.1 + 0.2 - 0.3)
```

```output
0.30000000000000004
5.551115123125783e-17
```

The answer is `0.30000000000000004`, not 0.3. The second line makes the gap visible: instead of 0, it prints a tiny number, about 0.00000000000000006, written in the scientific style `5.551115123125783e-17` ("times ten to the power minus 17"). This is not a bug in Python; every programming language that uses standard floating-point numbers does the same thing. A computer stores numbers in binary, in base 2, and in binary most decimal fractions cannot be written exactly. It is the same problem you have writing one third in decimal: 0.333333... never ends, so any finite version is slightly off. The number 0.1 is stored as the closest binary fraction the computer can hold, which is very slightly more than 0.1.

The errors are tiny, around the 16th significant digit, so for most purposes they do not matter. They matter in two situations. First, never test whether two floats are exactly equal; check that they are close instead (you will learn how in a later lesson). Second, when you show a float to a person, round it. The built-in function `round` takes a number and how many decimal places to keep:

```python type
print(round(0.1 + 0.2, 2))
print(round(3.14159, 3))
print(round(2.5))
print(round(3.5))
```

```output
0.3
3.142
2
4
```

`round` with no second number rounds to a whole number. You may notice that `round(2.5)` gives `2`, not 3, while `round(3.5)` gives `4`. When a number is exactly halfway, Python rounds to the nearest even number. This avoids a small bias that always rounding halves up would cause when you add up many rounded numbers.

## Converting between types

The functions `int` and `float` convert a value to that type.

```python type
print(float(7))
print(int(7.9))
print(int(-7.9))
print(abs(-7.9))
```

```output
7.0
7
-7
7.9
```

`float(7)` gives `7.0`. `int(7.9)` gives `7`: converting to an int simply cuts off everything after the decimal point, it does not round. With a negative number that means `int(-7.9)` is `-7`, cutting towards zero. If you want the nearest whole number, use `round`. Note that this is not quite the same as `//`, which always rounds **down**: `-7 // 2` is `-4` (down from -3.5), while `int(-7 / 2)` is `-3` (towards zero). For positive numbers the two agree. The last line shows one more useful built-in, `abs`, which gives the **absolute value**: the size of a number without its sign.

Python's ints have no size limit. They grow as large as your computer's memory allows, which is not true in many other languages:

```python type
print(2 ** 100)
```

```output
1267650600228229401496703205376
```

::: challenge The shopping bill [easy]
The starter defines what was bought and what each item costs. Calculate the total cost of the whole shopping trip and store it in a variable called `total`. Then print it with the label `Total:`, like this: `Total: 7.9`.

Use the variables in your calculation instead of typing the numbers again. The check changes the prices and quantities to make sure your calculation really uses them.

```python starter
apples = 4
apple_price = 0.5
loaves = 2
loaf_price = 1.45
milk = 1
milk_price = 3.0

total = 0
```

```python solution
apples = 4
apple_price = 0.5
loaves = 2
loaf_price = 1.45
milk = 1
milk_price = 3.0

total = apples * apple_price + loaves * loaf_price + milk * milk_price
print("Total:", round(total, 2))
```

```python test
import io, contextlib
assert abs(total - 7.9) < 1e-9, f"total should be 7.9 (4 apples at 0.5, 2 loaves at 1.45 and 1 milk at 3.0), but it is {total}."
assert "Total:" in _stdout, "Print the total with the label, like: print(\"Total:\", total)"
_lines = ["apples = 4", "apple_price = 0.5", "loaves = 2", "loaf_price = 1.45", "milk = 1", "milk_price = 3.0"]
for _line in _lines:
    assert _line in _source, f"Keep the starter's line {_line} exactly as it is, so the check can change it."
_changed = _source
for _old, _new in [("apples = 4", "apples = 10"), ("apple_price = 0.5", "apple_price = 0.2"), ("loaves = 2", "loaves = 3"), ("loaf_price = 1.45", "loaf_price = 1.0"), ("milk = 1", "milk = 2"), ("milk_price = 3.0", "milk_price = 2.5")]:
    _changed = _changed.replace(_old, _new, 1)
_ns = {}
with contextlib.redirect_stdout(io.StringIO()):
    exec(_changed, _ns)
assert abs(_ns.get("total", 0) - 10.0) < 1e-9, "When the check changes every quantity and price, your total should change to 10.0, but it did not. Build total from all six variables, not from typed-in numbers."
"SUCCESS: Your total is calculated from the variables, so it stays right when the prices change."
```

Hint: Each item costs its quantity times its price, so the apples cost `apples * apple_price`. Add up the three items in one line: `total = ... + ... + ...`. If the printed total has a long tail of digits, `round(total, 2)` tidies it.
:::

::: challenge Hours, minutes and seconds [medium]
A timer has counted `total_seconds` seconds. Split it into whole hours, whole minutes left over, and seconds left over, and store them in variables called `hours`, `minutes` and `seconds`.

For 7384 seconds the answer is 2 hours, 3 minutes and 4 seconds, because 2 × 3600 + 3 × 60 + 4 = 7384. Your code must work for any number of seconds: the check tries a different one.

```python starter
total_seconds = 7384

hours = 0
minutes = 0
seconds = 0
print(hours, "h", minutes, "m", seconds, "s")
```

```python solution
total_seconds = 7384

hours = total_seconds // 3600
minutes = total_seconds % 3600 // 60
seconds = total_seconds % 60
print(hours, "h", minutes, "m", seconds, "s")
```

```python test
import io, contextlib
assert (hours, minutes, seconds) == (2, 3, 4), f"For 7384 seconds you should get 2 hours, 3 minutes, 4 seconds, but you got {hours}, {minutes}, {seconds}."
assert "total_seconds = 7384" in _source, "Keep the line total_seconds = 7384 exactly as it is, so the check can try other values."
for _secs, _want in [(90061, (25, 1, 1)), (59, (0, 0, 59)), (3600, (1, 0, 0))]:
    _ns = {}
    with contextlib.redirect_stdout(io.StringIO()):
        exec(_source.replace("total_seconds = 7384", f"total_seconds = {_secs}"), _ns)
    _got = (_ns.get("hours"), _ns.get("minutes"), _ns.get("seconds"))
    assert _got == _want, f"For {_secs} seconds the answer should be {_want[0]} h {_want[1]} m {_want[2]} s, but your code gives {_got[0]} h {_got[1]} m {_got[2]} s."
"SUCCESS: Your conversion works for any number of seconds."
```

Hint: An hour is 3600 seconds, so `total_seconds // 3600` is the number of whole hours. What is left after taking the hours out is `total_seconds % 3600`; floor-divide that by 60 to get the minutes. The seconds are whatever is left over after dividing by 60.
:::

::: challenge Swap two variables [medium]
The starter gives `a` the value 5 and `b` the value 9. Write code that swaps them, so that `a` refers to 9 and `b` refers to 5.

Do not type the numbers again: your code must swap whatever values `a` and `b` have, and the check tries others. The obvious attempt, `a = b` followed by `b = a`, does not work. Try it first and work out why before you fix it.

```python starter
a = 5
b = 9

# Swap a and b here.

print("a is", a)
print("b is", b)
```

```python solution
a = 5
b = 9

temp = a
a = b
b = temp

print("a is", a)
print("b is", b)
```

```python test
import io, contextlib
assert (a, b) == (9, 5), f"After swapping, a should be 9 and b should be 5, but a is {a} and b is {b}."
assert "a = 5" in _source and "b = 9" in _source, "Keep the lines a = 5 and b = 9 as they are, so the check can try other values."
_ns = {}
with contextlib.redirect_stdout(io.StringIO()):
    exec(_source.replace("a = 5", "a = 111").replace("b = 9", "b = 222"), _ns)
assert (_ns.get("a"), _ns.get("b")) == (222, 111), "Your code swapped 5 and 9 but not other values. Swap using the variables, not typed-in numbers."
"SUCCESS: Swapped. Keeping a copy of one value before overwriting it is a pattern you will use again."
```

Hint: After `a = b`, both names refer to 9 and the 5 is gone, so there is nothing left to give to `b`. Before you overwrite `a`, store its value in a third variable, such as `temp`.
:::

## What you learned

- An assignment `name = value` makes a name refer to a value. Python works out the right-hand side first, then attaches the name.
- Assigning again gives the name a new value. `x = x + 1` and `x += 1` both increase `x` by one.
- A variable holds a value, not a formula: changing one variable never recalculates another.
- Names use letters, digits and underscores, cannot start with a digit, and are case-sensitive. Python style is lowercase snake case, with names that say what the value means.
- `int` is for whole numbers and `float` for numbers with a decimal point. `/` always gives a float; mixing an int and a float gives a float.
- `//` divides and rounds down, and `%` gives the remainder.
- Floats are stored in binary and are often very slightly off, so round them for display and never compare them for exact equality.
- `int()` cuts off the decimal part, `float()` adds one, `round()` rounds, and `abs()` removes the sign.

Next you will work with text: taking strings apart, joining them together, and building messages that include the values of your variables.
