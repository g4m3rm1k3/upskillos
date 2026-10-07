# Errors and exceptions

Since the first lesson you have been reading error messages and fixing the code that caused them. Those errors were mistakes in the program. But some errors are not mistakes at all: they are things going wrong in the world the program deals with. A user types "ten" where a number was expected. A file is missing. A network connection drops. A well-written program cannot prevent these; it has to expect them and decide what to do.

In Python, both kinds of error are **exceptions**. This lesson shows what an exception really is, how to read a traceback that runs through several functions, how to **catch** an exception and recover from it, and how to **raise** your own exceptions when your code is given something it cannot work with.

## What an exception is

When Python hits a problem it cannot continue past, it creates an **exception**: an object describing what went wrong. It then **raises** it, which means it stops what it is doing and abandons each function in turn, looking for code that has said it can handle this kind of problem. If none is found, the program stops and Python prints the exception as the error message you are used to.

You have already met most of the common kinds, and each name tells you the category of problem:

- `NameError`: a name that does not exist.
- `TypeError`: an operation on the wrong type of value, like `"a" + 1`.
- `ValueError`: the right type but an unacceptable value, like `int("ten")`.
- `IndexError` and `KeyError`: a position or key that is not there.
- `ZeroDivisionError`: dividing by zero.
- `AttributeError`: a method or attribute the value does not have, like `(5).upper()`.

```python error ZeroDivisionError
average = 10 / 0
```

## Reading a traceback through several functions

When an error happens inside a function that was called by another function, the traceback shows the whole chain of calls that led there. That chain is called the **call stack**. Open "Show full traceback" after running this cell.

```python error ValueError
def parse_age(text):
    return int(text)

def register(name, age_text):
    age = parse_age(age_text)
    return f"{name} is {age}"

print(register("Ada", "36"))
print(register("Grace", "eighty-five"))
```

The red line tells you the kind of problem and the details: `invalid literal for int() with base 10: 'eighty-five'`, meaning `int` was given text that is not a whole number. ("Base 10" means ordinary decimal digits.) The full traceback lists the calls, **oldest first**:

```text
Traceback (most recent call last):
  File "<exec>", line 9, in <module>
  File "<exec>", line 5, in register
  File "<exec>", line 2, in parse_age
ValueError: invalid literal for int() with base 10: 'eighty-five'
```

The three `File` lines say, in order:

1. Line 9, at the top level of the cell, called `register`.
2. Line 5, inside `register`, called `parse_age`.
3. Line 2, inside `parse_age`, called `int`, which failed.

`<module>` means the top level of the cell, outside any function. Read the list from the bottom up: the last line says what went wrong, the frame just above it says exactly where, and each frame above that says who called it. The bug is not always in the last frame. Here `parse_age` did nothing wrong; it was *given* bad text, and to understand why, you follow the stack up to the call that passed it in. Notice also that the first call, for Ada, succeeded and printed before the second one failed.

## Catching an exception: try and except

A `try` statement lets you attempt something that might fail and say what to do if it does.

```python type
text = "eighty-five"
try:
    age = int(text)
    print("Age is", age)
except ValueError:
    print(f"'{text}' is not a whole number.")
print("The program carries on.")
```

```output
'eighty-five' is not a whole number.
The program carries on.
```

Python runs the `try` block. If no exception happens, the `except` block is skipped. If a `ValueError` is raised anywhere in the `try` block, Python immediately stops the block (so "Age is" is never printed), jumps to the matching `except` block and runs it, and then carries on after the whole statement as if nothing had gone wrong. The exception has been **caught** or **handled**. Change `text` to `"85"` and run it again to see the other path.

The `except` line names the kind of exception it handles. Any other kind of exception is not caught and still stops the program, which is what you want: this code knows what to do about bad text, but it has no idea what to do about, say, a `NameError`.

## Catch only what you expect

It is possible to write `except:` with no exception type, which catches everything. This is almost always a mistake, and the reason is worth seeing. Predict what this prints: the code is meant to turn text into a number.

```python type
text = "42"
try:
    number = int(txt)
except:
    number = 0
print("Number:", number)
```

```output
Number: 0
```

It prints `0`, and gives no hint that anything is wrong. The real problem is a typo, `txt` instead of `text`, which is a `NameError`. The bare `except` caught it and quietly treated it as bad input. Bugs like this can hide for months. Written as `except ValueError:`, the typo would have produced a `NameError` straight away, pointing at the exact line.

So: catch the **specific** exception you expect, around the **smallest** piece of code that can raise it. Everything else should still fail loudly.

## Getting the details, and handling several kinds

`except SomeError as e:` gives the exception object a name, so you can look at its message:

```python type
try:
    value = int("3.5")
except ValueError as e:
    print("Could not convert:", e)
```

```output
Could not convert: invalid literal for int() with base 10: '3.5'
```

A `try` can have several `except` clauses, and Python uses the first one that matches. One clause can also handle several kinds by listing them in a tuple:

```python type
def safe_divide(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return None
    except TypeError as e:
        print("Bad input:", e)
        return None

print(safe_divide(10, 4))
print(safe_divide(10, 0))
print(safe_divide(10, "two"))
```

```output
2.5
None
Bad input: unsupported operand type(s) for /: 'int' and 'str'
None
```

Writing `except (ValueError, TypeError):` would handle either kind with the same block.

## else and finally

A `try` statement can have two more parts:

- `else:` runs only if the `try` block finished **without** an exception.
- `finally:` runs **always**, whether there was an exception or not, and even if it was not caught.

```python type
def load_number(text):
    try:
        number = int(text)
    except ValueError:
        print(f"  {text!r}: not a number")
        return None
    else:
        print(f"  {text!r}: converted")
        return number
    finally:
        print("  (finished trying", repr(text) + ")")

print(load_number("12"))
print(load_number("twelve"))
```

```output
  '12': converted
  (finished trying '12')
12
  'twelve': not a number
  (finished trying 'twelve')
None
```

`else` keeps the `try` block small: only the line that might fail goes in `try`, and what to do after success goes in `else`. `finally` is for clean-up that must happen no matter what, such as closing a file; you will see it used that way in lesson 17. Notice that `finally` ran even though both paths had already reached a `return`.

## Raising your own exceptions

Your own functions can raise exceptions too, with the `raise` statement. Do this when a function is given something it cannot sensibly work with. It is much better to stop at once, with a clear message, than to carry on and produce a wrong answer that causes a confusing failure somewhere else later.

```python type
def set_volume(level):
    if level < 0 or level > 10:
        raise ValueError(f"volume must be between 0 and 10, got {level}")
    return f"Volume set to {level}"

print(set_volume(7))
try:
    print(set_volume(11))
except ValueError as e:
    print("Refused:", e)
```

```output
Volume set to 7
Refused: volume must be between 0 and 10, got 11
```

`raise ValueError("message")` creates a `ValueError` with your message and raises it, exactly like Python's own. Choose the kind that matches the problem: `ValueError` for an unacceptable value, `TypeError` for the wrong type of value. And write the message for the person who will read it: say what was expected and what was actually received.

Sometimes you want to catch an exception, do something, and then let it carry on upwards anyway. A bare `raise` inside an `except` block re-raises the exception being handled:

```python error ValueError
def parse(text):
    try:
        return int(text)
    except ValueError:
        print("Logging: could not parse", repr(text))
        raise

parse("oops")
```

## Ask permission or ask forgiveness?

There are two styles of dealing with something that might fail. One is to check first: "look before you leap".

```python type
stock = {"apples": 5}
if "pears" in stock:
    print(stock["pears"])
else:
    print("No pears")
```

```output
No pears
```

The other is to just try it and handle the failure: "it's easier to ask forgiveness than permission".

```python type
stock = {"apples": 5}
try:
    print(stock["pears"])
except KeyError:
    print("No pears")
```

```output
No pears
```

Both are fine, and Python programmers use both. Checking first is clearer when failure is common and the check is simple. Trying first is often better when failure is rare, or when the check would repeat the work, as with converting text to a number, where the easiest way to find out whether text is a valid number is to try converting it.

::: challenge Safe conversion [easy]
Write a function `safe_int(text, default=0)` that returns `text` converted to an integer, or `default` if it cannot be converted. Catch only the exception that `int` raises for bad text.

`safe_int("42")` returns 42, `safe_int("forty")` returns 0, and `safe_int("3.5", -1)` returns -1.

```python starter
def safe_int(text, default=0):
    return int(text)

print(safe_int("42"), safe_int("forty"))
```

```python solution
def safe_int(text, default=0):
    try:
        return int(text)
    except ValueError:
        return default

print(safe_int("42"), safe_int("forty"))
```

```python test
import ast
assert "safe_int" in dir(), "Keep the function's name as safe_int."
for _args, _want in [(("42",), 42), (("forty",), 0), (("3.5", -1), -1), ((" 7 ",), 7), (("",), 0), (("-12",), -12)]:
    _got = safe_int(*_args)
    assert _got == _want, f"safe_int{_args} should return {_want}, but it returned {_got!r}."
_handlers = [_n for _n in ast.walk(ast.parse(_source)) if isinstance(_n, ast.ExceptHandler)]
assert _handlers, "Use try and except."
assert all(_h.type is not None for _h in _handlers), "Name the exception you expect (except ValueError:) instead of a bare except."
"SUCCESS: Bad text gives the default, and nothing else is silently swallowed."
```

Hint: Put the `return int(text)` inside a `try` block, and add `except ValueError:` that returns `default`.
:::

::: challenge Bank withdrawals [medium]
Write a function `withdraw(balance, amount)` that returns the new balance after taking out `amount`. It must refuse bad requests by **raising** a `ValueError`:

- if `amount` is zero or negative, with a message containing `"positive"`;
- if `amount` is more than `balance`, with a message containing `"insufficient"`.

`withdraw(100, 30)` returns 70. `withdraw(100, 130)` raises `ValueError`.

```python starter
def withdraw(balance, amount):
    return balance - amount

print(withdraw(100, 30))
```

```python solution
def withdraw(balance, amount):
    if amount <= 0:
        raise ValueError(f"amount must be positive, got {amount}")
    if amount > balance:
        raise ValueError(f"insufficient funds: balance {balance}, requested {amount}")
    return balance - amount

print(withdraw(100, 30))
```

```python test
assert "withdraw" in dir(), "Keep the function's name as withdraw."
assert withdraw(100, 30) == 70, f"withdraw(100, 30) should return 70, but returned {withdraw(100, 30)!r}."
assert withdraw(50, 50) == 0, "Withdrawing the whole balance is allowed: withdraw(50, 50) should return 0."
for _args, _word in [((100, 130), "insufficient"), ((100, 0), "positive"), ((100, -5), "positive"), ((0, 1), "insufficient")]:
    try:
        _r = withdraw(*_args)
    except ValueError as _e:
        assert _word in str(_e).lower(), f"withdraw{_args} raised ValueError, but its message {str(_e)!r} should mention {_word!r}."
    else:
        raise AssertionError(f"withdraw{_args} should raise ValueError, but it returned {_r!r}.")
"SUCCESS: Bad withdrawals are refused loudly, with clear messages."
```

Hint: Check the two bad cases at the start of the function with `if` statements, and `raise ValueError("...")` with a helpful message in each. If neither applies, return the new balance. Which check comes first matters for `withdraw(100, -5)`: that one should complain about "positive".
:::

::: challenge Tolerant parsing [medium]
A file of results has one `name,score` pair per line, but some lines are broken. Write a function `parse_scores(lines)` that returns a tuple of two things: a dictionary mapping each name to its score as an integer, and the number of lines that could not be used.

A line is unusable if it does not split into exactly two parts at the comma, or if the score is not a whole number. Those are the only two problems to check for; an empty name is still allowed. Remove spaces around the name and score.

```python starter
def parse_scores(lines):
    scores = {}
    bad = 0
    for line in lines:
        name, score = line.split(",")
        scores[name] = int(score)
    return scores, bad

print(parse_scores(["Ada, 91", "Alan,x", "Grace,88", "oops"]))
```

```python solution
def parse_scores(lines):
    scores = {}
    bad = 0
    for line in lines:
        try:
            name, score = line.split(",")
            scores[name.strip()] = int(score)
        except ValueError:
            bad += 1
    return scores, bad

print(parse_scores(["Ada, 91", "Alan,x", "Grace,88", "oops"]))
```

```python test
assert "parse_scores" in dir(), "Keep the function's name as parse_scores."
_cases = [
    (["Ada, 91", "Alan,x", "Grace,88", "oops"], ({"Ada": 91, "Grace": 88}, 2)),
    ([], ({}, 0)),
    (["a,1,2", " Bo , 7 "], ({"Bo": 7}, 1)),
    (["x,", ",5", "Cy,-3"], ({"": 5, "Cy": -3}, 1)),
]
for _lines, _want in _cases:
    try:
        _got = parse_scores(_lines)
    except Exception as _e:
        raise AssertionError(f"parse_scores({_lines}) raised {type(_e).__name__}: {_e}. Catch the error for a broken line and count it instead.")
    assert tuple(_got) == _want, f"parse_scores({_lines}) should return {_want}, but it returned {_got!r}."
"SUCCESS: Good lines are kept, broken ones are counted, and nothing crashes."
```

Hint: Both kinds of broken line raise a `ValueError`: unpacking the wrong number of parts into `name, score`, and `int` on text that is not a number. So put the two lines that do the work inside `try`, and count the line in `except ValueError:`. `int` already ignores spaces around a number; the name needs `strip()`.
:::

## What you learned

- An exception is an object describing a problem. Raising it abandons each function in turn until something handles it; if nothing does, the program stops and prints it.
- A traceback lists the call stack oldest first. Read from the bottom: what went wrong, where, and who called it.
- `try: ... except SomeError:` runs the `except` block if that kind of exception is raised in the `try` block, then carries on.
- Catch specific exceptions around the smallest code that can raise them. A bare `except:` hides real bugs.
- `except SomeError as e` gives access to the message. `else` runs after success; `finally` always runs.
- `raise ValueError("message")` reports that your function was given something it cannot use. A bare `raise` in an `except` block passes the exception on.
- Checking first and trying first are both valid; pick whichever is clearer for the case.

Catching an exception tells you something went wrong. Finding out **why** is debugging, and next you will learn to do it systematically instead of by guesswork.
