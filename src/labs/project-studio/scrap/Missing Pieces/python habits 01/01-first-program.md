---
title: 1.1 — Your First Program
track: Getting Started
runtime: python
---

In this series you will build a **habit tracker**: a small program you run from the terminal to record things like "Read" or "Run" and see how many days in a row you did them. By the end it will save its data to a file, handle bad input, and have automated tests.

In this lesson you build the front door of the program. It will read what you type after its name, for example `python habits.py add Read`, and respond to it. Almost every command-line tool starts this way.

## Print a title

Create a new file called `habits.py` in your project folder. This is the only file the program will start from. Put one line in it.

```python file=habits.py
print("Habit Tracker")
```

`print` is a built-in **function**: a named piece of code that does a job. Here the job is to show text in the terminal. The text inside the quotes is a **string**, which is Python's type for text. The value `"Habit Tracker"` is a `str`.

Run it in the terminal, from your project folder:

```
python habits.py
```

```check
file habits.py -- Create a file named habits.py in your project folder.
run "python habits.py add" stdout="Habit Tracker" label="habits.py prints the title" -- Save the file, then run python habits.py.
```

## Read what the user typed

A program can receive words from the command line. Python puts them in a list called `sys.argv`. Replace the contents of `habits.py` with this.

```python file=habits.py
import sys

print("Habit Tracker")
command = sys.argv[1]
print(f"Command: {command}")
```

Line by line:

- `import sys` loads Python's `sys` module, a set of tools about the running program. You must import a module before using it.
- `sys.argv` is a **list** of strings. A list is an ordered row of values. `sys.argv` holds the words from the command line.
- For `python habits.py add Read`, `sys.argv` is `["habits.py", "add", "Read"]`. Position 0 is the script's own name. Positions are counted from 0, so `sys.argv[1]` is `"add"`.
- `command = sys.argv[1]` creates a **variable**: a name attached to a value. From now on `command` means `"add"`.
- `f"Command: {command}"` is an **f-string**. The `f` before the quote means that anything inside `{ }` is replaced by its value. The result is the string `Command: add`.

Try it:

```
python habits.py add Read
```

Before you try the next one, make a prediction.

```predict
question: What happens if you run `python habits.py` with nothing after it?
choice: It prints Habit Tracker, then crashes with an IndexError
choice: It crashes with an IndexError before printing anything
choice: It prints "Command: " and finishes normally
answer: It prints Habit Tracker, then crashes with an IndexError
explain: Python runs the lines in order. print("Habit Tracker") runs first. Then sys.argv[1] fails, because the list only has one item (position 0), so there is no position 1.
```

```check
run "python habits.py add" stdout="Command: add" label="the command is read from the command line" -- Make sure you wrote command = sys.argv[1] and the f-string.
run "python habits.py list" stdout="Command: list" label="a different command is shown too" -- The program must print whatever command was typed, not just add.
```

## Handle a missing command

A crash with a long error message is a poor way to greet a user. Add a guard at the top that checks the list's length first.

```python file=habits.py
import sys

if len(sys.argv) < 2:
    print("usage: python habits.py COMMAND [NAME]")
    sys.exit(1)

print("Habit Tracker")
command = sys.argv[1]
print(f"Command: {command}")
```

What the new lines do:

- `len(sys.argv)` is the number of items in the list, an `int`. For `python habits.py` it is 1. For `python habits.py add` it is 2.
- `if len(sys.argv) < 2:` runs the indented lines below it only when the condition is true, that is, when fewer than 2 items are present.
- `sys.exit(1)` stops the program immediately. The number is the **exit code**. By convention 0 means success and any other number means failure. Tools and scripts that run your program can read that number.

Notice the indentation: the two lines under `if` are shifted right by four spaces. Python uses this to know which lines belong to the `if`.

```check
run "python habits.py" stdout="usage: python habits.py COMMAND [NAME]" exit=1 label="no command prints usage and exits with code 1" -- Check the guard at the top: print the usage line, then call sys.exit(1).
run "python habits.py add" stdout="Command: add" label="a command still works" -- The guard must only trigger when no command is given.
```

## Your turn: show the habit name

The user will type a name after the command, like `python habits.py add Read`. Make the program print `Habit: Read` when a name is given.

- The name is at `sys.argv[2]`. Store it in a variable called `name`.
- A name is optional. If the user typed only `python habits.py list`, the program must not crash and must not print a `Habit:` line.
- Put your new code at the end of the file, after the `Command:` line.

You have already seen everything you need: `len(sys.argv)`, `if`, indexing and f-strings.

```check
run "python habits.py add Read" stdout="Habit: Read" label="prints the habit name" -- Print f"Habit: {name}" using sys.argv[2].
run "python habits.py add Run" stdout="Habit: Run" label="works for a different name" -- Do not type the name into the program. Read it from sys.argv[2].
run "python habits.py list" without="Habit:" stdout="Command: list" label="no name, no Habit line" -- Only print the Habit line when len(sys.argv) is greater than 2.
```

```hints
nudge: With python habits.py add Read, how many items does sys.argv have? What about python habits.py list?
concept: sys.argv[2] only exists when at least three items are in the list, so check len(sys.argv) before you read it.
shape: Add an if that tests whether len(sys.argv) is greater than 2. Inside it, set name = sys.argv[2], then print the Habit line.
answer: Add these lines at the end of habits.py:
~~~python
if len(sys.argv) > 2:
    name = sys.argv[2]
    print(f"Habit: {name}")
~~~
```
