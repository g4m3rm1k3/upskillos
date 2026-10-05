---
title: 0.2 — Numbers, Names and Text
runtime: python
---

The CI data you'll analyse is mostly numbers (how many seconds each test took) and text (each test's name, and whether it passed). This lesson is about those two kinds of value: how to calculate with numbers, how to give a value a **name** so you can use it again, and how to put numbers into text. Along the way you'll meet a surprise that catches out professional programmers: a computer can add three decimals and get an answer that's very slightly wrong. You'll see exactly why.

Every example in this lesson is a small file in the `explore` folder, run with `python explore/<name>.py`.

## Arithmetic

Three nights of `test_export` took 4.1, 4.1 and 3.8 seconds. Create `explore/arith.py`:

```python file=explore/arith.py
# Three runs of test_export, in seconds
print(4.1 + 4.1 + 3.8)
print((4.1 + 4.1 + 3.8) / 3)
print(4.1 + 4.1 + 3.8 / 3)
```

The last two lines differ only in the brackets. Commit to an answer first:

```predict
question: Do the last two lines print the same number?
choice: Yes: the brackets don't change anything
choice: No: the last line divides only 3.8 by 3
answer: No: the last line divides only 3.8 by 3
explain: Python follows the same order as maths at school: `*` and `/` are done **before** `+` and `-`. So `4.1 + 4.1 + 3.8 / 3` means `4.1 + 4.1 + (3.8 / 3)`, which is 8.2 + 1.2666… = 9.4666…. Brackets are worked out first, so `(4.1 + 4.1 + 3.8) / 3` adds first and then divides, giving 12.0 / 3 = 4.0, the average.
```

```powershell
python explore/arith.py
```

```text
12.0
4.0
9.466666666666665
```

**How it works.** Python works out an **expression** (any piece of code that produces a value, like `4.1 + 4.1`) by following **precedence** rules, the order in which operators are applied:

1. `( )` brackets, innermost first
2. `**` (power)
3. `*`, `/`, `//`, `%`
4. `+`, `-`

Operators of equal rank go left to right, so `4.1 + 4.1 + 3.8` is `(4.1 + 4.1) + 3.8`. The second line is the **mean** (the average) of the three runs: add them up, divide by how many there are. The third line is a bug that produces a perfectly reasonable-looking number, which is the most dangerous kind. When in doubt, add brackets: they never hurt and they show the reader what you meant.

```check
run "python explore/arith.py" stdout="12.0\n4.0\n9.466666666666665" label="arith.py prints the sum, the mean and the bracket-less version" -- Type the three print lines exactly, with the brackets only on the second.
```

## Names

Typing the same numbers over and over is slow and error-prone. Give them names. Create `explore/names.py`:

```python file=explore/names.py
first = 4.1
second = 4.1
third = 3.8
total = first + second + third
print("total:", total)
mean = total / 3
print("mean:", mean)
```

```powershell
python explore/names.py
```

```text
total: 12.0
mean: 4.0
```

> **Variable**: a name that refers to a value. **Assignment**: the statement `name = value`, which makes the name refer to the value.

**How it works.** `first = 4.1` is not a question and not an equation. It's an instruction with two parts, carried out right to left:

1. Work out the right-hand side (here just `4.1`, a number).
2. Attach the name on the left to that value.

So when Python reaches `total = first + second + third`, it looks up what each name refers to (4.1, 4.1, 3.8), adds them (12.0), and attaches the name `total` to the result. After that line, `total` refers to 12.0; it doesn't remember how 12.0 was made, and changing `first` later would **not** change `total`.

Names must start with a letter or `_`, can contain letters, digits and `_`, and can't contain spaces. Python's convention is lowercase words joined by underscores: `run_count`, `slowest_test`. Choose names that say what the value *means*: `mean` tells a reader far more than `x`.

### Step through it in CodeLens

With `explore/names.py` open in the editor, press **🔬 Trace in CodeLens** above it. CodeLens runs the file one line at a time. Press **Next** and watch the **variables** pane: after each line, a new name appears with its value. Notice that `total` appears in one step with the value 12.0, already worked out. Press **Back to Project Studio** when you're done.

```check
run "python explore/names.py" stdout="total: 12.0\nmean: 4.0" label="names.py prints the total and the mean" -- Check that each name is spelled the same way where it's assigned and where it's used.
```

## A name can change what it refers to

Assignment can use the name it's assigning to. Create `explore/running.py`:

```python file=explore/running.py
total = 0
total = total + 4.1
print(total)
total = total + 4.1
print(total)
total = total + 3.8
print(total)
```

```powershell
python explore/running.py
```

```text
4.1
8.2
12.0
```

**How it works.** `total = total + 4.1` would be nonsense as an equation (no number equals itself plus 4.1). As an instruction it's straightforward, because the right side is worked out **before** the name is attached:

| Line | Right side worked out with the old `total` | `total` refers to afterwards |
|---|---|---|
| `total = 0` | `0` | 0 |
| `total = total + 4.1` | `0 + 4.1` | 4.1 |
| `total = total + 4.1` | `4.1 + 4.1` | 8.2 |
| `total = total + 3.8` | `8.2 + 3.8` | 12.0 |

**Why start at 0?** Because adding 0 changes nothing, so the first real addition gives exactly the first value. Leave `total = 0` out and the first `total + 4.1` fails with a `NameError`: `total` doesn't refer to anything yet. This pattern, start a name at a neutral value and update it once per value, is how you'll add up any number of timings in the next lesson, with a loop doing the repeating.

Trace this file in CodeLens too, and watch the one variable change three times.

```check
run "python explore/running.py" stdout="4.1\n8.2\n12.0" label="running.py prints the total growing: 4.1, 8.2, 12.0"
```

## Types: whole numbers, decimals and text

Every value has a **type**, which decides what you can do with it. Create `explore/value_types.py` (not `types.py`: Python has a module of its own called `types`, and in lesson 0.6 you'll see why a file with the same name as one of Python's own modules causes strange errors):

```python file=explore/value_types.py
print(type(15))
print(type(4.1))
print(type("4.1"))
print(type(15 * 6))
print(type(15 / 3), 15 / 3)
```

```powershell
python explore/value_types.py
```

```text
<class 'int'>
<class 'float'>
<class 'str'>
<class 'int'>
<class 'float'> 5.0
```

**How it works.** `type(value)` tells you a value's type. You've met three:

- **`int`** (integer): a whole number like `15` or `-3`. Ints are exact and can be as large as memory allows.
- **`float`** (floating-point number): a number with a decimal point, like `4.1`. Floats are stored in a fixed amount of memory, which is why they can be very slightly off (next step).
- **`str`** (string): text. `"4.1"` is three characters, `4`, `.`, `1`, not a number, even though it looks like one.

`15 * 6` is an `int`, because multiplying two whole numbers always gives a whole number. But `15 / 3` is a `float`, `5.0`, even though 15 divides exactly: **`/` always gives a float**, so a program never gets an `int` from one division and a `float` from another depending on the numbers. When you want a whole number, use `//`.

```check
run "python explore/value_types.py" stdout="<class 'int'>\n<class 'float'>\n<class 'str'>\n<class 'int'>\n<class 'float'> 5.0" label="value_types.py prints the five types"
```

## Decimals that aren't quite right

The first three nights of `test_signup` took 2.2, 2.1 and 2.2 seconds. Create `explore/floats.py`:

```python file=explore/floats.py
print(2.2 + 2.1 + 2.2)
print(2.2 + 2.1 + 2.2 == 6.5)
```

`==` asks "are these equal?" and gives `True` or `False`. (A single `=` assigns; a double `==` compares.)

```predict
question: What do the two lines print?
choice: 6.5 and True
choice: 6.5 and False
choice: Something very close to 6.5, and False
answer: Something very close to 6.5, and False
explain: The sum comes out as **6.500000000000001**, and so it isn't equal to 6.5. This isn't a bug in Python: every language that uses the computer's standard decimal numbers does the same. The next part of this step explains exactly where the extra 0.000000000000001 comes from.
```

```powershell
python explore/floats.py
```

```text
6.500000000000001
False
```

```check
run "python explore/floats.py" stdout="6.500000000000001\nFalse" label="floats.py prints 6.500000000000001 and False"
```

## Look at the numbers really stored

### How it works: floats are stored in binary

A computer stores a float as a **binary** number (base 2: digits 0 and 1 only) with a fixed number of digits: 53 significant binary digits, roughly 16 decimal ones.

In base 10, the digits after the point stand for tenths, hundredths, thousandths. In base 2 they stand for halves, quarters, eighths, sixteenths. Some numbers are easy in binary: 0.5 is exactly `0.1` (one half), and 6.5 is exactly `110.1`. But a tenth can't be made from halves, quarters, eighths and so on in a finite number of digits. Its binary expansion goes on forever:

```text
0.1 (decimal) = 0.000110011001100110011... (binary, the 0011 repeating forever)
```

With only 53 digits available, the repeating pattern is cut off, and the computer stores the nearest number it *can* represent. You can see the number really stored by asking for 30 decimal places. Add three lines to `explore/floats.py`:

```python file=explore/floats.py
print(2.2 + 2.1 + 2.2)
print(2.2 + 2.1 + 2.2 == 6.5)
print(f"{2.2:.30f}")
print(f"{2.1:.30f}")
print(f"{6.5:.30f}")
```

```text
6.500000000000001
False
2.200000000000000177635683940025
2.100000000000000088817841970013
6.500000000000000000000000000000
```

(The `f"{...:.30f}"` is a format you'll meet properly in two steps.) The stored 2.2 is a tiny bit **more** than 2.2, and so is the stored 2.1. Adding them adds their tiny errors too, and the result of each addition is itself rounded to the nearest number a float can hold. You can watch it happen one addition at a time: `print(2.2 + 2.1)` already prints `4.300000000000001`, and adding the last 2.2 to that lands on the float just above 6.5. 6.5 itself *can* be stored exactly (it's `110.1` in binary); the sum simply didn't land on it.

`print` normally shows the shortest decimal that would be stored as the same float, which is why `2.2` prints as `2.2` and not as its 30-digit form. Only when the error grows big enough to change that shortest decimal does it become visible, as in `6.500000000000001`.

```check
run "python explore/floats.py" stdout="2.200000000000000177635683940025\n2.100000000000000088817841970013\n6.500000000000000000000000000000" label="floats.py shows the three stored values to 30 decimal places" -- Add the three print lines with :.30f below the first two.
```

## Rounding, and comparing with a tolerance

The sum is wrong by about 0.000000000000001 seconds: harmless for timings. The danger is `==`. Code like `if total == 6.5:` silently takes the wrong branch. Two habits:

- **Round when you show a number**: `round(x, 1)` gives the number rounded to 1 decimal place, and a format like `f"{x:.1f}"` (next step) shows it that way. Do the arithmetic at full precision and round only at the end, so rounding errors don't pile up.
- **Compare floats with a tolerance**: ask whether they're *close*, not equal. `abs(a - b) < 1e-9` is `True` when `a` and `b` differ by less than 0.000000001. (`abs` gives a number's size without its sign; `1e-9` is how Python writes 1 × 10⁻⁹.)

Replace the three 30-decimal lines with these two, so the file is:

```python file=explore/floats.py
print(2.2 + 2.1 + 2.2)
print(2.2 + 2.1 + 2.2 == 6.5)
print(round(2.2 + 2.1 + 2.2, 1))
print(abs((2.2 + 2.1 + 2.2) - 6.5) < 1e-9)
```

```text
6.500000000000001
False
6.5
True
```

```check
run "python explore/floats.py" stdout="6.500000000000001\nFalse\n6.5\nTrue" label="floats.py shows the sum, the failed ==, the rounded sum and the tolerance test" -- The file should have exactly the four lines shown.
```

## Text with numbers in it

Reports are text with numbers inside. Create `explore/text.py`:

```python file=explore/text.py
test = "test_export"
seconds = 4.1
budget = 10.0
print(test + " took " + str(seconds) + " s")
print(f"{test} took {seconds} s")
print(f"{test} used {seconds / budget:.0%} of its budget")
print(f"[{test:<14}][{seconds:>6.1f}]")
```

```powershell
python explore/text.py
```

```text
test_export took 4.1 s
test_export took 4.1 s
test_export used 41% of its budget
[test_export   ][   4.1]
```

**How it works.**

- **Line 4** builds the text by **concatenation**: `+` between two strings joins them end to end. It only works string to string, so the number has to be converted first with `str(seconds)`, which makes the string `"4.1"`. It works, but it's hard to read and easy to get the spaces wrong.
- **Line 5** is an **f-string** (format string): an `f` just before the opening quote. Inside it, anything in `{ }` is an expression that Python works out and converts to text, then puts in that place. Same result, far easier to read.
- **Line 6**: after the expression, a `:` starts a **format specification**, which says how to show the value. `.0%` means "multiply by 100, show 0 decimal places, add a % sign": 4.1 / 10.0 = 0.41 becomes `41%`.
- **Line 7**: `<14` means "left-align in a space 14 characters wide" (padding with spaces), and `>6.1f` means "right-align in 6 characters, as a float (`f`) with 1 decimal place". The square brackets are just characters in the string, there so you can see the padding. You'll use widths like these to line up the columns of your CI report.

| Spec | Meaning | `4.1` becomes |
|---|---|---|
| `.1f` | 1 decimal place | `4.1` |
| `.2f` | 2 decimal places | `4.10` |
| `>6.1f` | right-aligned in 6 characters, 1 decimal place | `   4.1` |
| `.0%` | a percentage, 0 decimal places | `410%` |

```check
run "python explore/text.py" stdout="test_export took 4.1 s\ntest_export took 4.1 s\ntest_export used 41% of its budget\n[test_export   ][   4.1]" label="text.py prints all four lines, with the padding in the last one"
```

## When text looks like a number

Data read from a file always arrives as text, even the numbers. Here's what that does. Create `explore/convert.py`:

```python file=explore/convert.py
seconds = "4.1"
print(seconds * 2)
print(float(seconds) * 2)
print(seconds + 1)
```

```predict
question: What does the second line, print(seconds * 2), print?
choice: 8.2
choice: 4.14.1
choice: An error: you can't multiply text
answer: 4.14.1
explain: `seconds` refers to the **string** `"4.1"`, three characters. A string times a whole number repeats the string, as `"ab" * 3` did in lesson 0.1. So you get the characters twice: `4.14.1`. No error, and a wrong answer that looks almost like a number: if your code read timings from a file and forgot to convert them, this is the kind of nonsense it would produce.
```

```powershell
python explore/convert.py
```

```text
4.14.1
8.2
Traceback (most recent call last):
  File "C:\Users\you\Documents\ci-toolkit\explore\convert.py", line 4, in <module>
    print(seconds + 1)
          ~~~~~~~~^~~
TypeError: can only concatenate str (not "int") to str
```

**How it works.**

- **`float(seconds)`** converts: it reads the characters `"4.1"` and produces the number 4.1. Then `* 2` is real multiplication: 8.2. `int("15")` does the same for whole numbers, and `str(4.1)` goes the other way.
- **Line 4** fails. For `+`, Python looks at the type of the left side: a string, so `+` means concatenate, which needs another string on the right. It finds an `int`, and raises a **`TypeError`**: an operation was given a value of the wrong type. The message says exactly that, and the `~~~^~~` marks the operator that failed.

**Why Python refuses here, but not on line 2.** Should `"4.1" + 1` mean `"4.11"` or `5.1`? Either guess would be wrong half the time, so Python refuses to guess and makes you say which you meant: `seconds + "1"` or `float(seconds) + 1`. Multiplying a string by a whole number has only one sensible meaning, so that one is allowed. Lesson 0.6 reads real timings from a file, and every one of them will need `float(...)`.

```check
run "python explore/convert.py" exit=1 stdout="4.14.1\n8.2" stderr="TypeError" label="convert.py prints 4.14.1 and 8.2, then stops with a TypeError on line 4"
```

## Fix it

Change line 4 so it adds 1 to the *number*, and run it again:

```python file=explore/convert.py
seconds = "4.1"
print(seconds * 2)
print(float(seconds) * 2)
print(float(seconds) + 1)
```

```check
run "python explore/convert.py" stdout="4.14.1\n8.2\n5.1" label="convert.py prints 4.14.1, 8.2 and 5.1 with no error" -- Wrap seconds in float(...) on the last line.
```

## Try it

Change values in the files you've written and predict each result before running it.

| Change | What to notice |
|---|---|
| In `names.py`, add `first = 100` after the `total = ...` line, then print `total` again | `total` is still 12.0. It was worked out once, from what `first` referred to *then*. |
| In `text.py`, change `.0%` to `.1%` | `41.0%`. The number after the `.` is decimal places. |
| In `text.py`, change `<14` to `>14` | The name moves to the right of its 14-character space. |
| `print(int("4.1"))` | A `ValueError`: `int` reads only whole-number text. `int(float("4.1"))` works, and gives 4, since `int` of a float **cuts off** the decimal part (it doesn't round). |
| `print(0.1 + 0.2)` | `0.30000000000000004`: the most famous example of float error. |
| `print(10 % 3)` | `1`: `%` gives the **remainder** after division. |

## Your turn: budget.py

**No code is shown in this step.** The latest run of `test_upload` took **9.0** seconds, and the team's time budget for any one test is **10.0** seconds. Create `explore/budget.py` that stores those two numbers in variables and prints exactly:

```text
test_upload: 9.0 s of 10.0 s budget (90%)
test_upload: 1.0 s to spare
```

The percentage and the time to spare must be **worked out by Python** from the two variables: `90%` and `1.0 s to spare` mustn't be typed into the file.

```hints
nudge: Store 9.0 and 10.0 in two variables with meaningful names, then build each line with an f-string.
concept: Inside an f-string's braces you can put any expression, not just a name: {latest / budget} works out the division. The format spec .0% turns 0.9 into 90%.
shape: Two print calls with f-strings. The first puts latest, budget and latest / budget with :.0% into the braces; the second puts budget - latest.
answer: ~~~python
latest = 9.0
budget = 10.0
print(f"test_upload: {latest} s of {budget} s budget ({latest / budget:.0%})")
print(f"test_upload: {budget - latest} s to spare")
~~~
`latest / budget` is 0.9, shown by `.0%` as `90%`. `budget - latest` is 1.0, a float because both are floats, so it prints as `1.0`.
```

```check
run "python explore/budget.py" stdout="test_upload: 9.0 s of 10.0 s budget (90%)\ntest_upload: 1.0 s to spare" label="budget.py prints both lines exactly" -- Check the spaces, the brackets around 90%, and that both numbers print with one decimal place.
lacks explore/budget.py "90%" label="the percentage is worked out, not typed" -- Use {latest / budget:.0%} instead of typing 90%.
lacks explore/budget.py "1.0 s to spare" label="the time to spare is worked out, not typed" -- Use {budget - latest} instead of typing 1.0.
```

## What you've learned

- **Expressions** follow **precedence**: brackets, then `**`, then `* / // %`, then `+ -`. Brackets make your meaning clear.
- **Assignment** (`name = value`) works out the right side first, then attaches the name. That's why `total = total + 4.1` works, and why a running total starts at 0.
- Values have **types**: `int`, `float`, `str`. `/` always gives a float.
- **Floats** are stored in binary with limited precision, so decimals like 2.2 are stored very slightly off. Round them to show them, and compare them with a tolerance, never with `==`.
- **f-strings** put values into text; format specs (`.1f`, `.0%`, `<14`) control how they look.
- Text that looks like a number isn't one: convert with `float(...)` or `int(...)`. A **TypeError** means a value of the wrong type reached an operation.

Next lesson: not three timings but fifteen, and a **loop** that does the adding for you.
