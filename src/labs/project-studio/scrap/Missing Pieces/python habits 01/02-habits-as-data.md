---
title: 1.2 — Habits as Data
runtime: python
---

A habit tracker needs to hold information: the name of each habit and the days you did it. In this lesson you learn the four kinds of values Python uses for that, then store a habit inside your program.

Your `habits.py` should currently look like this, with your solution from lesson 1.1 at the end:

```python
import sys

if len(sys.argv) < 2:
    print("usage: python habits.py COMMAND [NAME]")
    sys.exit(1)

print("Habit Tracker")
command = sys.argv[1]
print(f"Command: {command}")

if len(sys.argv) > 2:
    name = sys.argv[2]
    print(f"Habit: {name}")
```

If yours differs, compare it with this and fix it first. The steps below build on this exact file.

## Try values in the Python prompt

Python has an interactive mode where you type one line and see the result straight away. Start it in the terminal:

```
python
```

You will see a `>>>` prompt. Type each line below and press Enter. To leave, type `exit()`.

```
>>> "Read"
'Read'
>>> 42
42
>>> True
True
>>> type("Read")
<class 'str'>
>>> type(42)
<class 'int'>
>>> type(True)
<class 'bool'>
```

Three basic types:

- `str` is text, written in quotes.
- `int` is a whole number.
- `bool` is a yes-or-no value. There are exactly two: `True` and `False`.

Notice that `"42"` in quotes is a `str`, not an `int`. The quotes decide the type.

```predict
question: In Python, what does "2" + "3" produce?
choice: 5
choice: 23
choice: An error
answer: 23
explain: Both values are strings, because they are in quotes. Adding two strings joins them end to end. To add numbers, you would write 2 + 3 without quotes.
```

## Lists

A **list** holds several values in order. You write it with square brackets. Try these in the prompt:

```
>>> habits = ["Read", "Run"]
>>> habits[0]
'Read'
>>> len(habits)
2
>>> habits.append("Swim")
>>> habits
['Read', 'Run', 'Swim']
```

- `habits[0]` is the first item. Counting starts at 0.
- `len(habits)` is how many items the list has.
- `habits.append("Swim")` adds an item to the end. It changes the list itself and gives nothing back.

```predict
question: After running `habits = ["Read", "Run"]` and then `habits.append("Swim")`, what is `len(habits)`?
answer: 3
explain: The list started with 2 items and append added one more, so it has 3.
```

## Dictionaries

A **dictionary** (`dict`) holds values that you look up by a name instead of a position. The names are called **keys**. You write it with curly braces and `key: value` pairs.

```
>>> habit = {"name": "Read", "days": []}
>>> habit["name"]
'Read'
>>> habit["days"]
[]
>>> habit["days"].append("2026-10-11")
>>> habit["days"]
['2026-10-11']
>>> len(habit["days"])
1
```

This dictionary has two keys. `"name"` holds a `str`. `"days"` holds a list, which starts empty and will hold the dates you did the habit. `habit["days"]` looks up the list, and `.append(...)` adds to it.

This shape, a dict with a name and a list of days, is how the whole project stores one habit.

## Store the habit in the program

Now put a list and a dict into `habits.py`. Replace the file with this:

```python file=habits.py
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

print(f"Habits stored: {len(habits)}")
```

What changed:

- `habits = []` makes an empty list of type `list`. It will hold one dict per habit.
- `habit = {"name": name, "days": []}` builds the dict for one habit. `name` is the variable from the command line.
- `habits.append(habit)` puts that dict into the list.
- The last line prints how many habits are in the list. It sits outside the `if`, so it always runs. Notice it is not indented.

```check
run "python habits.py add Read" stdout="Habits stored: 1" label="adding a habit stores one habit" -- Create habits = [] before the if, and append the habit dict inside it.
run "python habits.py list" stdout="Habits stored: 0" label="no name means no habit stored" -- The final print must be outside the if block, with no indentation.
```

## Does it remember?

Run the program twice in a row:

```
python habits.py add Read
python habits.py add Read
```

```predict
question: What does the second run print for the "Habits stored" line?
choice: Habits stored: 2
choice: Habits stored: 1
answer: Habits stored: 1
explain: Variables live in the computer's memory only while the program runs. When the program ends, the list disappears. Each run starts with a new empty list. In Chapter 3 you will save habits to a file so they survive.
```

This is the main limit of the program right now. Keep it in mind.

## Your turn: count the days

Print how many days the new habit has been done. A new habit has none, so you will see `Days done: 0`.

- Print the line `Days done: ` followed by the length of the habit's `"days"` list.
- Use the `habit` dict you already have, and look up its `"days"` key.
- Only print it when a habit was added. For `python habits.py list`, there is no habit, so there must be no `Days done` line.

```check
run "python habits.py add Read" stdout="Days done: 0" label="a new habit has 0 days done" -- Print f"Days done: {len(habit['days'])}" inside the if block.
run "python habits.py add Run" stdout="Habit: Run" label="the habit name still prints" -- Keep the Habit line. You are adding a line, not replacing one.
run "python habits.py list" without="Days done" stdout="Habits stored: 0" label="no habit, no Days done line" -- The new print must be inside the if block, because habit only exists there.
```

```hints
nudge: Which variable holds the dict for the habit? Which key inside it holds the list of days?
concept: habit["days"] is the list of days. len() of that list is the number of days done. In an f-string that is already inside double quotes, use single quotes for the key: {len(habit['days'])}.
shape: Add one print line inside the if block, after the Habit line, using an f-string with len(habit['days']).
answer: The if block becomes:
~~~python
if len(sys.argv) > 2:
    name = sys.argv[2]
    habit = {"name": name, "days": []}
    habits.append(habit)
    print(f"Habit: {name}")
    print(f"Days done: {len(habit['days'])}")
~~~
```
