---
title: 2.4 — Removing, Counting and Committing
runtime: python
---

The program can add, list, mark and undo. In this last lesson of the chapter you add `remove` and `stats`, update the help text, and then record your work in Git. You also learn the accumulator, a loop pattern you will use constantly: start with a value and update it on every pass.

Your `habits.py` should be the finished program from lesson 2.3, with `add`, `done`, `undo` and `list`.

## The remove command

To stop tracking a habit, take its dict out of the `habits` list. The `.remove` method from last lesson works on any list, including a list of dicts. Add the branch:

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
        elif command == "remove":
            habit = find_habit(habits, argument)
            if habit is None:
                print(f"No habit named {argument}")
            else:
                habits.remove(habit)
                print(f"Removed {argument}")
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

`habits.remove(habit)` deletes that dict from the list. Python finds it by comparing each item with `habit`, and the match is the dict itself. Notice how `done`, `undo` and `remove` all start with the same three lines: find the habit and handle `None`. That repetition is fine for now. You can clean it up in a later chapter.

```check
run "python habits.py" stdin="add Read\nremove Read\nlist\nquit\n" stdout="No habits yet" label="a removed habit is gone from the list" -- Call habits.remove(habit) after finding the habit.
run "python habits.py" stdin="add Read\nremove Read\nquit\n" stdout="Removed Read" label="remove confirms" -- Print f"Removed {argument}".
run "python habits.py" stdin="remove Nope\nquit\n" stdout="No habit named Nope" label="an unknown habit is reported" -- Test habit is None right after find_habit.
```

## Count with an accumulator

Suppose you want the total number of days done across all habits. You can do that with a loop and a variable that keeps a running total. This is called an **accumulator**. Try it in the Python prompt:

```
>>> lengths = [2, 0, 3]
>>> total = 0
>>> for length in lengths:
...     total = total + length
...
>>> total
5
```

`total = 0` sets the starting value. Each pass adds the next number to it. `total = total + length` reads: take the current `total`, add `length`, and store the result back in `total`.

```predict
question: A loop runs total = total + length over the lengths 4, 1 and 2, starting from total = 0. What is total at the end?
answer: 7
explain: The total goes 0, then 4, then 5, then 7.
```

Now put it into a function and use it in a `stats` command. Also bring the help text up to date so it lists every command.

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


def total_days(habits):
    total = 0
    for habit in habits:
        total = total + len(habit["days"])
    return total


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
            print("Commands: add NAME, done NAME, undo NAME, remove NAME, list, stats, quit")
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
        elif command == "remove":
            habit = find_habit(habits, argument)
            if habit is None:
                print(f"No habit named {argument}")
            else:
                habits.remove(habit)
                print(f"Removed {argument}")
        elif command == "list":
            if len(habits) == 0:
                print("No habits yet")
            else:
                for number, habit in enumerate(habits, start=1):
                    print(f"{number}. {describe(habit)}")
        elif command == "stats":
            print(f"Habits: {len(habits)}, days done: {total_days(habits)}")
        else:
            print(f"Unknown command: {command}")
    print("Goodbye")


main()
```

`total_days` takes the list of habit dicts and returns one `int`. Inside the loop, `len(habit["days"])` is how many days that habit has. The new `stats` branch prints two numbers on one line.

```check
run "python habits.py" stdin="add Read\nadd Run\ndone Read\nstats\nquit\n" stdout="Habits: 2, days done: 1" label="stats counts habits and days" -- Use len(habits) and total_days(habits) in one f-string.
run "python habits.py" stdin="stats\nquit\n" stdout="Habits: 0, days done: 0" label="stats works with nothing stored" -- The accumulator starts at 0, so an empty list gives 0.
run "python habits.py" stdin="help\nquit\n" stdout="undo NAME, remove NAME" label="help mentions the new commands" -- Update the help text to list undo and remove.
```

## Commit the chapter

Now record all of this. First give the README a usage section, so the next person (maybe you in a month) knows how to use the tool. Replace its contents with this:

```markdown file=README.md
# Habit Tracker

A command-line tool for tracking daily habits.

## Usage

Run `python habits.py`, then type commands at the `>` prompt:

- `add NAME` starts tracking a habit
- `done NAME` marks it done for today
- `undo NAME` takes today's mark back
- `remove NAME` stops tracking it
- `list` shows all habits
- `stats` shows totals
- `quit` leaves the program

Habits are only kept while the program is running.
```

Then stage both changed files and commit:

```
git add habits.py README.md
git commit -m "Add interactive command loop with add, done, undo, remove and stats"
git status
```

```check
contains README.md "## Usage" label="README has a Usage section" -- Add the Usage section from the lesson to README.md.
contains README.md "done NAME" label="README describes the done command" -- List the commands in the README.
git-commits 3 label="there are at least three commits" -- Run git add habits.py README.md and then git commit -m "your message".
git-clean label="the working tree is clean" -- Everything should be committed. Check git status for leftover files.
```

## Your turn: the best habit

Add a `best` command that names the habit with the most days done. Then commit it.

- `best` prints `Best: NAME`, where NAME is the habit with the most days done.
- If two habits tie, the one added first wins. With no days marked at all, the first habit added is the best.
- If there are no habits, print `No habits yet`.
- Write a function `best_habit(habits)` that returns the winning habit dict (or `None` for an empty list), and call it from the new `best` branch.
- Add `best` to the help text, before `quit`.
- Commit with a message that contains the word `best`. The working tree must be clean afterwards.

Hint on the method: use the accumulator idea, but keep the winner instead of a sum. Start with `None`, and while looping, replace the winner only when a habit has strictly more days than the current winner.

```check
run "python habits.py" stdin="add Read\nadd Run\ndone Run\nbest\nquit\n" stdout="Best: Run" label="the habit with most days wins" -- Compare len(habit["days"]) with the current best's length.
run "python habits.py" stdin="add Read\nadd Run\nbest\nquit\n" stdout="Best: Read" label="ties go to the habit added first" -- Replace the winner only when the new count is strictly greater: use >, not >=.
run "python habits.py" stdin="best\nquit\n" stdout="No habits yet" label="no habits means no best" -- Return None from best_habit for an empty list, and print No habits yet when you get None.
run "python habits.py" stdin="help\nquit\n" stdout="best" label="help lists best" -- Add best to the help text, before quit.
git-commits 4 label="there are at least four commits" -- Stage habits.py and commit it.
git-message "best" label="the latest commit message mentions best" -- Use a message such as: git commit -m "Add best command".
git-clean label="the working tree is clean" -- Commit everything with git add and git commit.
```

```hints
nudge: With the accumulator you kept a running total. What do you need to keep this time, and what is the starting value?
concept: Keep the winner so far in a variable that starts as None. For each habit, if the winner is None, or the habit has strictly more days than the winner, make this habit the new winner. Strictly more is what makes ties go to the earlier habit.
shape: Write best_habit like total_days: a loop with a variable before it and a return after it. In main, call best_habit, test for None as you did with find_habit, and print Best: with the name.
answer: Add this function above main:
~~~python
def best_habit(habits):
    best = None
    for habit in habits:
        if best is None or len(habit["days"]) > len(best["days"]):
            best = habit
    return best
~~~
Add this branch next to stats:
~~~python
        elif command == "best":
            best = best_habit(habits)
            if best is None:
                print("No habits yet")
            else:
                print(f"Best: {best['name']}")
~~~
Update the help line to end with "list, stats, best, quit", then run:
~~~
git add habits.py
git commit -m "Add best command"
~~~
```
