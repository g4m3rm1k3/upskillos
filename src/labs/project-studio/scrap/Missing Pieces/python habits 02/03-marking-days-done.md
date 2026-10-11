---
title: 2.3 — Marking Days Done
runtime: python
---

A habit tracker needs one more core feature: recording that you did a habit today. In this lesson you add the `done` command. Along the way you meet dates, searching a list, and the value `None`, which means "nothing found".

Your `habits.py` should be the finished program from lesson 2.2, with `add`, `list` and the numbered list.

## Dates as text

Python's `datetime` module has a `date` type. Try it in the Python prompt (`python`):

```
>>> from datetime import date
>>> today = date.today()
>>> today.isoformat()
'2026-10-11'
```

You will see today's date, not necessarily this one. `date.today()` gives the current date from your computer's clock. `.isoformat()` turns it into a string in the form `YYYY-MM-DD`: four-digit year, two-digit month, two-digit day. Each habit's `"days"` list will hold strings like this.

This format has a useful property: sorting the strings alphabetically also puts the dates in time order. In Chapter 6 you will use real date arithmetic for streaks. For now, strings are enough.

```predict
question: How many characters long is the string date.today().isoformat()?
answer: 10
explain: The format is YYYY-MM-DD: 4 digits, a dash, 2 digits, a dash, 2 digits. That is 4 + 1 + 2 + 1 + 2 = 10 characters.
```

## Find a habit by name

The `done` command needs to find the habit with a given name in the list. A function is the right home for that. It goes through the list and gives back the matching dict. If nothing matches it gives back `None`.

```python file=habits.py
from datetime import date


def make_habit(name):
    return {"name": name, "days": []}


def find_habit(habits, name):
    for habit in habits:
        if habit["name"] == name:
            return habit
    return None


def describe(habit):
    return f"Habit: {habit['name']} ({len(habit['days'])} days done)"


def is_valid_name(name):
    cleaned = name.strip()
    return len(cleaned) > 0 and len(cleaned) <= 30


def main():
    print("Habit Tracker")
    habits = []

    while True:
        line = input("> ").strip()
        if line == "":
            print("Type a command, or help")
            continue

        parts = line.split(maxsplit=1)
        command = parts[0]
        argument = ""
        if len(parts) > 1:
            argument = parts[1]

        if command == "quit":
            break
        elif command == "help":
            print("Commands: add NAME, done NAME, list, quit")
        elif command == "add":
            if not is_valid_name(argument):
                print("Invalid habit name")
            else:
                habit = make_habit(argument)
                habits.append(habit)
                print(f"Added: {argument}")
        elif command == "list":
            if len(habits) == 0:
                print("No habits yet")
            else:
                for number, habit in enumerate(habits, start=1):
                    print(f"{number}. {describe(habit)}")
        else:
            print(f"Unknown command: {command}")
    print("Goodbye")


main()
```

Reading `find_habit`:

- `from datetime import date` at the top loads just the `date` type from the module. You will use it in the next step.
- `find_habit(habits, name)` takes the list and the name to look for. The loop visits each habit dict. `habit["name"] == name` checks whether this one matches.
- `return habit` hands back the match and ends the function immediately, so the loop stops at the first match.
- `return None` is reached only when the loop finished without a match. `None` is Python's value for "nothing". It is not zero and not an empty string.

Nothing in the program calls `find_habit` yet, so the behaviour is unchanged.

```check
run "python habits.py" stdin="add Read\nlist\nquit\n" stdout="1. Habit: Read (0 days done)" label="the program still works" -- Only add the import and the find_habit function; do not change anything else.
contains habits.py "def find_habit(habits, name)" label="find_habit is defined" -- Define find_habit with the parameters habits and name.
```

## The done command

Add a branch for `done`. It finds the habit and reports an error if there is none (`habit is None`). Otherwise it gets today's date as a string. If that date is already in the habit's list, it says so. If not, it appends the date.

```python file=habits.py
from datetime import date


def make_habit(name):
    return {"name": name, "days": []}


def find_habit(habits, name):
    for habit in habits:
        if habit["name"] == name:
            return habit
    return None


def describe(habit):
    return f"Habit: {habit['name']} ({len(habit['days'])} days done)"


def is_valid_name(name):
    cleaned = name.strip()
    return len(cleaned) > 0 and len(cleaned) <= 30


def main():
    print("Habit Tracker")
    habits = []

    while True:
        line = input("> ").strip()
        if line == "":
            print("Type a command, or help")
            continue

        parts = line.split(maxsplit=1)
        command = parts[0]
        argument = ""
        if len(parts) > 1:
            argument = parts[1]

        if command == "quit":
            break
        elif command == "help":
            print("Commands: add NAME, done NAME, list, quit")
        elif command == "add":
            if not is_valid_name(argument):
                print("Invalid habit name")
            else:
                habit = make_habit(argument)
                habits.append(habit)
                print(f"Added: {argument}")
        elif command == "done":
            habit = find_habit(habits, argument)
            if habit is None:
                print(f"No habit named {argument}")
            else:
                today = date.today().isoformat()
                if today in habit["days"]:
                    print(f"{argument} is already done today")
                else:
                    habit["days"].append(today)
                    print(f"Marked {argument} done for {today}")
        elif command == "list":
            if len(habits) == 0:
                print("No habits yet")
            else:
                for number, habit in enumerate(habits, start=1):
                    print(f"{number}. {describe(habit)}")
        else:
            print(f"Unknown command: {command}")
    print("Goodbye")


main()
```

Two new operators:

- `habit is None` asks whether the value is `None`. Use `is` for `None`, not `==`.
- `today in habit["days"]` asks whether the string `today` is one of the items in the list. It gives `True` or `False`. In the Python prompt: `"Read" in ["Read", "Run"]` is `True`.

Since `habit["days"]` is the same list inside the dict that `habits` holds, appending to it changes the habit in place. `list` will see the change.

```predict
question: What does `"Read" in ["Read", "Run"]` give?
choice: True
choice: False
choice: An error
answer: True
explain: in checks whether the value is one of the items of the list, and "Read" is the first item.
```

```check
run "python habits.py" stdin="add Read\ndone Read\nquit\n" stdout="Marked Read done for" label="done marks the habit" -- Append today's date to habit["days"] and print Marked ... done for ...
run "python habits.py" stdin="add Read\ndone Read\ndone Read\nquit\n" stdout="Read is already done today" label="doing it twice in a day is caught" -- Test today in habit["days"] before appending.
run "python habits.py" stdin="done Nope\nquit\n" stdout="No habit named Nope" label="an unknown habit is reported" -- Test habit is None right after find_habit.
```

## Fix the grammar

If you mark a habit done and run `list`, it says `1 days done`. Fix that: one day should say `day`. Change `describe` to choose the word.

```python file=habits.py
from datetime import date


def make_habit(name):
    return {"name": name, "days": []}


def find_habit(habits, name):
    for habit in habits:
        if habit["name"] == name:
            return habit
    return None


def describe(habit):
    count = len(habit["days"])
    if count == 1:
        label = "day"
    else:
        label = "days"
    return f"Habit: {habit['name']} ({count} {label} done)"


def is_valid_name(name):
    cleaned = name.strip()
    return len(cleaned) > 0 and len(cleaned) <= 30


def main():
    print("Habit Tracker")
    habits = []

    while True:
        line = input("> ").strip()
        if line == "":
            print("Type a command, or help")
            continue

        parts = line.split(maxsplit=1)
        command = parts[0]
        argument = ""
        if len(parts) > 1:
            argument = parts[1]

        if command == "quit":
            break
        elif command == "help":
            print("Commands: add NAME, done NAME, list, quit")
        elif command == "add":
            if not is_valid_name(argument):
                print("Invalid habit name")
            else:
                habit = make_habit(argument)
                habits.append(habit)
                print(f"Added: {argument}")
        elif command == "done":
            habit = find_habit(habits, argument)
            if habit is None:
                print(f"No habit named {argument}")
            else:
                today = date.today().isoformat()
                if today in habit["days"]:
                    print(f"{argument} is already done today")
                else:
                    habit["days"].append(today)
                    print(f"Marked {argument} done for {today}")
        elif command == "list":
            if len(habits) == 0:
                print("No habits yet")
            else:
                for number, habit in enumerate(habits, start=1):
                    print(f"{number}. {describe(habit)}")
        else:
            print(f"Unknown command: {command}")
    print("Goodbye")


main()
```

`describe` now stores the length in a variable `count` so it is computed once and used twice. The `if` picks the word `label`. Zero and two or more are plural: `0 days`, `2 days`. Only exactly one is singular.

```check
run "python habits.py" stdin="add Read\ndone Read\nlist\nquit\n" stdout="1. Habit: Read (1 day done)" label="one day is singular" -- Use count == 1 to choose the word day.
run "python habits.py" stdin="add Read\nlist\nquit\n" stdout="1. Habit: Read (0 days done)" label="zero days is plural" -- Only exactly 1 is singular. 0 stays days.
```

## Your turn: undo today

Mistakes happen. Add an `undo NAME` command that removes today's mark again. First, one new tool: a list's `.remove(value)` method deletes the first item equal to `value`. Try it in the Python prompt:

```
>>> days = ["2026-10-10", "2026-10-11"]
>>> days.remove("2026-10-11")
>>> days
['2026-10-10']
```

Now build the command. It must behave like this:

- If there is no habit with that name, print `No habit named NAME`.
- If today's date is not in the habit's days, print `Nothing to undo for NAME`.
- Otherwise remove today's date from the habit's days and print `Undid today for NAME`.
- Put it in the `elif` chain next to `done`. Reuse `find_habit`, `date.today().isoformat()` and `in`.

```check
run "python habits.py" stdin="add Read\ndone Read\nundo Read\nlist\nquit\n" stdout="Undid today for Read" label="undo removes today's mark" -- Call habit["days"].remove(today) and print Undid today for ...
run "python habits.py" stdin="add Read\ndone Read\nundo Read\nlist\nquit\n" stdout="1. Habit: Read (0 days done)" label="the day count goes back to 0" -- The habit's days list must be changed by remove.
run "python habits.py" stdin="add Read\nundo Read\nquit\n" stdout="Nothing to undo for Read" label="undo with no mark today is harmless" -- Check today in habit["days"] before removing, or .remove will crash.
run "python habits.py" stdin="undo Nope\nquit\n" stdout="No habit named Nope" label="undo of an unknown habit is reported" -- Test habit is None right after find_habit.
```

```hints
nudge: Which of your existing branches already does "find the habit, then look at today's date"? What differs?
concept: .remove(today) crashes if today is not in the list. So test today in habit["days"] first, and only remove it when the test is true.
shape: Copy the shape of the done branch: find the habit, handle None, compute today, then choose between two outcomes with if/else.
answer: Add this branch to the chain, for example right after the done branch:
~~~python
        elif command == "undo":
            habit = find_habit(habits, argument)
            if habit is None:
                print(f"No habit named {argument}")
            else:
                today = date.today().isoformat()
                if today in habit["days"]:
                    habit["days"].remove(today)
                    print(f"Undid today for {argument}")
                else:
                    print(f"Nothing to undo for {argument}")
~~~
```
