---
title: 1.3 — Functions
runtime: python
---

Your program works, but all the code sits in one long block. A **function** is a named piece of code you can run whenever you need it. Splitting the program into functions keeps it readable and lets you reuse and test each part. In this lesson you turn your code into three functions and add a rule that rejects bad habit names.

Your `habits.py` should currently look like this, with the `Days done` line from lesson 1.2:

```python
import sys

if len(sys.argv) < 2:
    print("usage: python habits.py COMMAND [NAME]")
    sys.exit(1)

print("Habit Tracker")
command = sys.argv[1]
print(f"Command: {command}")

habits = []
if len(sys.argv) > 2:
    name = sys.argv[2]
    habit = {"name": name, "days": []}
    habits.append(habit)
    print(f"Habit: {name}")
    print(f"Days done: {len(habit['days'])}")

print(f"Habits stored: {len(habits)}")
```

## Move the dict into make_habit

Define a function that builds a habit dict. Add it at the top, below the import. The rest of the program stays the same except for the `habit = ...` line.

```python file=habits.py
import sys


def make_habit(name):
    return {"name": name, "days": []}


if len(sys.argv) < 2:
    print("usage: python habits.py COMMAND [NAME]")
    sys.exit(1)

print("Habit Tracker")
command = sys.argv[1]
print(f"Command: {command}")

habits = []
if len(sys.argv) > 2:
    name = sys.argv[2]
    habit = make_habit(name)
    habits.append(habit)
    print(f"Habit: {name}")
    print(f"Days done: {len(habit['days'])}")

print(f"Habits stored: {len(habits)}")
```

How a function is written:

- `def make_habit(name):` starts the definition. `def` means "define". `make_habit` is the function's name. `name` is a **parameter**: a variable that receives the value you pass in.
- The indented line is the **body**, the code that runs when the function is called.
- `return {...}` hands a value back to the caller. Here that value is a `dict`.
- `habit = make_habit(name)` **calls** the function. The value of `name` goes in, and the returned dict is stored in `habit`.

Defining a function does not run it. Nothing happens until some line calls it. The two blank lines around a function are a Python style convention.

The behaviour of the program is unchanged.

```check
run "python habits.py add Read" stdout="Habit: Read" label="still works after the refactor" -- Check that make_habit returns the dict and the call habit = make_habit(name) is in place.
run "python habits.py add Read" stdout="Habits stored: 1" label="the habit is still stored" -- The append line must still be there.
```

## Describe a habit with describe

Next, a function that turns a habit into one line of text. It takes a dict and returns a string. Replace the two print lines with a single call.

```python file=habits.py
import sys


def make_habit(name):
    return {"name": name, "days": []}


def describe(habit):
    return f"Habit: {habit['name']} ({len(habit['days'])} days done)"


if len(sys.argv) < 2:
    print("usage: python habits.py COMMAND [NAME]")
    sys.exit(1)

print("Habit Tracker")
command = sys.argv[1]
print(f"Command: {command}")

habits = []
if len(sys.argv) > 2:
    name = sys.argv[2]
    habit = make_habit(name)
    habits.append(habit)
    print(describe(habit))

print(f"Habits stored: {len(habits)}")
```

`describe` receives one habit dict and builds a string from two lookups: `habit['name']` is a `str`, and `len(habit['days'])` is an `int`. Python converts the number to text inside the f-string. The caller prints what `describe` returns.

The old `Habit: Read` and `Days done: 0` lines are now one line: `Habit: Read (0 days done)`. The function does one job: producing the text. The `print` call does another: showing it. Keeping the two apart makes both easier to test later.

```check
run "python habits.py add Read" stdout="Habit: Read (0 days done)" label="describe produces the habit line" -- The line must read exactly: Habit: Read (0 days done)
run "python habits.py add Swim" stdout="Habit: Swim (0 days done)" label="describe uses the habit's own name" -- Use habit['name'] inside describe instead of a fixed word.
```

## Put the program in main

Right now the program's logic is loose at the bottom of the file. The usual pattern is to put it in a function called `main` and call it on the last line.

```python file=habits.py
import sys


def make_habit(name):
    return {"name": name, "days": []}


def describe(habit):
    return f"Habit: {habit['name']} ({len(habit['days'])} days done)"


def main():
    if len(sys.argv) < 2:
        print("usage: python habits.py COMMAND [NAME]")
        sys.exit(1)

    print("Habit Tracker")
    command = sys.argv[1]
    print(f"Command: {command}")

    habits = []
    if len(sys.argv) > 2:
        name = sys.argv[2]
        habit = make_habit(name)
        habits.append(habit)
        print(describe(habit))

    print(f"Habits stored: {len(habits)}")


main()
```

Everything that was loose is now indented under `def main():`. The only code outside a function is the final line, `main()`, which starts the program. Variables created inside a function, like `habits` and `command`, exist only while that function runs. They are **local** to it.

```predict
question: You delete the last line, main(), and run `python habits.py add Read`. What is printed?
choice: Nothing
choice: The same output as before
choice: An error
answer: Nothing
explain: The def lines only define the functions. With no line that calls main(), nothing runs, so Python finishes without printing anything and without an error.
```

Put the line back before you continue.

```check
run "python habits.py add Read" stdout="Habit: Read (0 days done)" label="the program still runs through main" -- Make sure main() is called on the last line, with no indentation.
run "python habits.py" stdout="usage: python habits.py COMMAND [NAME]" exit=1 label="usage is still shown with no command" -- The guard should be the first thing inside main.
```

## Clean up and test a name

A habit named `"   "` (only spaces) or one with a 200-letter name is a mistake. Before writing the rule, try three tools in the Python prompt (`python`):

```
>>> "  Read  ".strip()
'Read'
>>> len("Read")
4
>>> len("Read") > 0 and len("Read") <= 30
True
>>> not True
False
```

- `.strip()` is a string method that returns a copy with spaces removed from both ends.
- `and` is true only when both sides are true. `len(x) > 0 and len(x) <= 30` means the length is between 1 and 30.
- `not` flips a bool: `not True` is `False`, and `not False` is `True`.

A function that answers a yes-or-no question and returns a `bool` is a **predicate**. Its name often starts with `is_`.

## Your turn: validate the habit name

Add a rule: a habit name must have between 1 and 30 characters after stripping spaces from both ends.

- Write a function `is_valid_name(name)` that returns `True` or `False`.
- In `main`, when a name is given, call `is_valid_name`. If it returns `False`, print `Invalid habit name` and stop with `sys.exit(1)`. Do this before creating the habit.
- Names of 1 to 30 characters must still work exactly as before.

```check
run "python habits.py add Read" stdout="Habit: Read (0 days done)" label="a normal name still works" -- A valid name must reach make_habit and print the habit line.
run "python habits.py add aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" stdout="Habits stored: 1" label="a 30-letter name is valid" -- Use <= 30, not < 30.
run "python habits.py add aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" stdout="Invalid habit name" exit=1 label="a 31-letter name is rejected" -- Print Invalid habit name and call sys.exit(1) when is_valid_name returns False.
run "python habits.py list" stdout="Habits stored: 0" label="no name is still fine" -- Only validate when a name was given.
```

```hints
nudge: Which two numbers are the limits for len(cleaned)? Is each limit allowed or not allowed?
concept: Strip first, then measure. Combine the two comparisons with and. In main, if not is_valid_name(name): is how you test for a bad name.
shape: Write is_valid_name above main with a cleaned variable. In main, add an if not is_valid_name(name) block that prints and exits, placed before make_habit is called.
answer: Add this function above main:
~~~python
def is_valid_name(name):
    cleaned = name.strip()
    return len(cleaned) > 0 and len(cleaned) <= 30
~~~
And in main, the name block becomes:
~~~python
    if len(sys.argv) > 2:
        name = sys.argv[2]
        if not is_valid_name(name):
            print("Invalid habit name")
            sys.exit(1)
        habit = make_habit(name)
        habits.append(habit)
        print(describe(habit))
~~~
```
