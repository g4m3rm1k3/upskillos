---
title: 2.2 — Adding and Listing Habits
runtime: python
---

The command loop works, but it only echoes. In this lesson the program learns two real commands: `add NAME` to start tracking a habit, and `list` to show all habits. For that you will split a typed line into words and use a second kind of loop, `for`, which goes through a list item by item.

Your `habits.py` should be the finished program from lesson 2.1: helpers unchanged, and `main` with the `quit`, `help`, empty-line and echo branches.

## Split a line into words

`add Read` is one string, but the program needs two parts: the command `add` and the argument `Read`. The string method `.split()` cuts a string into a list of smaller strings. Try it in the Python prompt (`python`):

```
>>> "add Read".split()
['add', 'Read']
>>> "add Read book".split()
['add', 'Read', 'book']
>>> "add Read book".split(maxsplit=1)
['add', 'Read book']
>>> "list".split(maxsplit=1)
['list']
```

`.split()` cuts at every run of spaces. A habit name can have spaces ("Read book"), so `maxsplit=1` says: cut at most once. Everything after the first word stays together as one string. Note that `"list".split(maxsplit=1)` gives a list with just one item, because there is nothing to cut.

```predict
question: How many items are in the list returned by "add Read book".split(maxsplit=1)?
answer: 2
explain: maxsplit=1 allows only one cut, after the first word. The result is ['add', 'Read book'], two items.
```

## Parse each line

Now restructure the loop so it splits every line into a `command` and an `argument`. You will also meet `continue`, which skips the rest of the loop body and jumps back to the top for the next line. The empty-line case uses it, because `split` on an empty line would give an empty list and `parts[0]` would crash.

```python file=habits.py
def make_habit(name):
    return {"name": name, "days": []}


def describe(habit):
    return f"Habit: {habit['name']} ({len(habit['days'])} days done)"


def is_valid_name(name):
    cleaned = name.strip()
    return len(cleaned) > 0 and len(cleaned) <= 30


def main():
    print("Habit Tracker")

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
        else:
            print(f"Unknown command: {command}")
    print("Goodbye")


main()
```

What each new piece does:

- `parts` is a list of one or two strings. `command = parts[0]` is the first word.
- `argument = ""` sets a default: an empty string. If the user typed a second part, `argument` is replaced by it. This way `argument` always exists and is always a `str`.
- The old echo is replaced by `Unknown command: ...`. A command we do not know is an error, not something to echo.

```predict
question: In this version, what does the program print if you type `add Read`?
choice: Unknown command: add
choice: Added: Read
choice: Nothing
answer: Unknown command: add
explain: The chain only knows quit and help so far. add falls through to the else, so it is reported as unknown. You will add it in the next step.
```

```check
run "python habits.py" stdin="frobnicate\nquit\n" stdout="Unknown command: frobnicate" label="unknown commands are reported" -- The else branch should print f"Unknown command: {command}".
run "python habits.py" stdin="\nquit\n" stdout="Type a command, or help" label="empty lines still get the hint" -- Keep the empty-line check, followed by continue.
run "python habits.py" stdin="help\nquit\n" stdout="Commands: add NAME, done NAME, list, quit" label="help still works" -- help is now tested against command, not line.
```

## The add command

Create the list before the loop, so it lives for the whole run. Then add a branch for `add` that checks the name, builds the habit with `make_habit`, and appends it.

```python file=habits.py
def make_habit(name):
    return {"name": name, "days": []}


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
        else:
            print(f"Unknown command: {command}")
    print("Goodbye")


main()
```

Notes:

- `habits = []` sits before the `while`. If it were inside the loop, it would be reset to empty on every line.
- For plain `add` with no name, `argument` is `""`, so `is_valid_name` returns `False` and the user sees `Invalid habit name`. You wrote that rule in lesson 1.3, and now it protects a real command.
- The `if` / `else` sits inside the `elif`. Blocks nest, and each level is indented four more spaces.

```check
run "python habits.py" stdin="add Read book\nquit\n" stdout="Added: Read book" label="add accepts names with spaces" -- Use argument, the whole text after add, as the name.
run "python habits.py" stdin="add\nquit\n" stdout="Invalid habit name" label="add with no name is rejected" -- Call is_valid_name(argument) before making the habit.
```

## The list command, with a for loop

A `for` loop runs its block once for each item in a list. Try it in the Python prompt:

```
>>> names = ["Read", "Run"]
>>> for name in names:
...     print(name)
...
Read
Run
>>> for number, name in enumerate(names, start=1):
...     print(number, name)
...
1 Read
2 Run
```

- `for name in names:` sets the **loop variable** `name` to each item in turn: first `"Read"`, then `"Run"`. The indented block runs once per item.
- `enumerate(names, start=1)` hands you pairs: a counter and the item. Python normally counts from 0, so `start=1` makes the counter begin at 1. The `for number, name in ...` line **unpacks** each pair into two variables.

Now add `list`. It prints a message if there are no habits. Otherwise it loops through them and prints each with `describe`.

```python file=habits.py
def make_habit(name):
    return {"name": name, "days": []}


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
                for habit in habits:
                    print(describe(habit))
        else:
            print(f"Unknown command: {command}")
    print("Goodbye")


main()
```

```predict
question: You type `add Read`, `add Run`, then `list`. How many lines starting with "Habit:" does list print?
answer: 2
explain: The for loop runs its body once for each habit in the list. There are two habits, so describe is printed twice.
```

```check
run "python habits.py" stdin="list\nquit\n" stdout="No habits yet" label="an empty list says so" -- Test len(habits) == 0 before looping.
run "python habits.py" stdin="add Read\nadd Run\nlist\nquit\n" stdout="Habit: Read (0 days done)" label="the first habit is listed" -- Print describe(habit) inside the for loop.
run "python habits.py" stdin="add Read\nadd Run\nlist\nquit\n" stdout="Habit: Run (0 days done)" label="the second habit is listed" -- The loop must visit every habit, not only the first.
```

## Your turn: number the list

Make `list` show a number in front of each habit, starting at 1:

```
1. Habit: Read (0 days done)
2. Habit: Run (0 days done)
```

- Use `enumerate` with `start=1`, as shown above.
- The `No habits yet` message stays as it is.
- Print the number, a dot and a space, then the text from `describe`.

```check
run "python habits.py" stdin="add Read\nadd Run\nlist\nquit\n" stdout="1. Habit: Read (0 days done)" label="the first habit is numbered 1" -- Use enumerate(habits, start=1) and print f"{number}. {describe(habit)}".
run "python habits.py" stdin="add Read\nadd Run\nlist\nquit\n" stdout="2. Habit: Run (0 days done)" label="the second habit is numbered 2" -- The counter must increase by one for each habit.
run "python habits.py" stdin="list\nquit\n" stdout="No habits yet" label="an empty list still says so" -- Leave the No habits yet branch unchanged.
```

```hints
nudge: In the Python prompt example, what did enumerate(names, start=1) give you on each pass of the loop?
concept: Each pass gives a pair, a number and an item. Unpack it with two loop variables: for number, habit in enumerate(habits, start=1).
shape: Change only the for line and the print line inside the list branch. The print should combine the number, a dot, a space and describe(habit).
answer: The loop in the list branch becomes:
~~~python
                for number, habit in enumerate(habits, start=1):
                    print(f"{number}. {describe(habit)}")
~~~
```
