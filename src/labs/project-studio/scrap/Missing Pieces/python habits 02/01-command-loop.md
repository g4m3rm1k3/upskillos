---
title: 2.1 — A Command Loop
track: Loops and Decisions
runtime: python
---

So far the program runs once and exits. That causes a problem. Habits live in a list in memory, and memory is wiped when the program ends. A habit you add in one run is gone in the next. (In Chapter 3 you will save habits to a file.)

Until then, the fix is to make the program **interactive**. It starts once, then keeps asking you for commands until you type `quit`. The list stays in memory the whole time. This also shows you the most important idea of this chapter: the **loop**, code that repeats.

Your `habits.py` should be the finished program from lesson 1.3. The three helper functions (`make_habit`, `describe`, `is_valid_name`) stay exactly as they are. Only `main` changes, and it changes completely. The old `sys.argv` code is retired.

## Ask a question with input()

The built-in function `input` shows a message, waits for you to type a line and press Enter, and gives you what you typed. Try it in the Python prompt (`python`):

```
>>> name = input("Habit? ")
Habit? Read
>>> name
'Read'
>>> type(name)
<class 'str'>
```

The text in the parentheses, called the **prompt**, is shown before the cursor. The value you get back is always a `str`, even when you type digits.

```predict
question: At an input() prompt you type 42 and press Enter. What type is the value input() returns?
choice: int
choice: str
answer: str
explain: input() always returns what you typed as text. To use it as a number you would convert it, for example with int("42").
```

## Repeat until quit

Replace the contents of `habits.py`. The helpers stay the same; `main` becomes a loop. `import sys` is gone because nothing uses `sys` any more.

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
        if line == "quit":
            break
        print(f"You typed: {line}")


main()
```

New ideas:

- `while True:` is a **loop**. It runs the indented lines below it, then goes back to the top and runs them again. `True` is always true, so the loop would never stop by itself.
- `input("> ")` shows `> ` as the prompt. `.strip()` removes any spaces at the ends of what you typed.
- `line == "quit"` asks whether `line` equals `"quit"`. Notice the two equals signs. One `=` assigns a value to a variable; two `==` compare two values and give a `bool`.
- `break` leaves the loop at once. The lines after `break` inside the loop do not run.

Run it with `python habits.py`, type a few lines, then type `quit`. If you ever get stuck inside a running program, press Ctrl+C to stop it.

```predict
question: You type `add Read` and then `quit`. Which "You typed" lines are printed?
choice: Only "You typed: add Read"
choice: "You typed: add Read" and "You typed: quit"
choice: Nothing
answer: Only "You typed: add Read"
explain: When the line is quit, the if block runs break, which leaves the loop before the print line is reached.
```

```check
run "python habits.py" stdin="add Read\nquit\n" stdout="You typed: add Read" label="the loop echoes what you type" -- Print f"You typed: {line}" inside the while loop.
run "python habits.py" stdin="add Read\nquit\n" without="You typed: quit" label="quit ends the loop without echoing" -- Check line == "quit" and break come before the print.
```

## Say goodbye

Code after the loop runs once the loop has ended. Add a goodbye line there. It is indented as part of `main`, but not as part of the `while`.

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
        if line == "quit":
            break
        print(f"You typed: {line}")
    print("Goodbye")


main()
```

The new `print("Goodbye")` lines up with `while`, so it is not part of the loop body. It runs only after `break` has left the loop.

```check
run "python habits.py" stdin="quit\n" stdout="Goodbye" label="the program says goodbye" -- Put print("Goodbye") after the loop, lined up with while.
run "python habits.py" stdin="hello\nquit\n" stdout="You typed: hello" label="the loop still echoes input" -- Keep the echo inside the loop.
```

## Choose between commands

Right now every line gets the same reply. A real command program does different things for different commands. For that you chain tests with `if`, `elif` and `else`:

- `if` runs its block when its condition is true.
- `elif` (short for "else if") is checked only if every test above it was false.
- `else` runs when none of the tests above were true.

Exactly one block in the chain runs. Add a `help` command. `quit` stays as it is, because `break` must remain a plain `if` at the top of the chain.

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
        if line == "quit":
            break
        elif line == "help":
            print("Commands: add NAME, done NAME, list, quit")
        else:
            print(f"You typed: {line}")
    print("Goodbye")


main()
```

When you type `help`, the first test (`quit`) is false, so Python checks the `elif`, which is true, and prints the command list. The `else` is skipped. For any other line, both tests are false, so the `else` runs.

```check
run "python habits.py" stdin="help\nquit\n" stdout="Commands: add NAME, done NAME, list, quit" label="help lists the commands" -- Add an elif for help that prints the command list exactly.
run "python habits.py" stdin="help\nquit\n" without="You typed: help" label="help does not fall through to the echo" -- Use elif and else so only one block runs.
run "python habits.py" stdin="hello\nquit\n" stdout="You typed: hello" label="other lines still echo" -- The else block should keep the echo.
```

## Your turn: handle empty lines

If the user just presses Enter, `line` is an empty string, `""`. At the moment the program prints `You typed: `, which looks broken.

- Make an empty line print `Type a command, or help` instead.
- Everything else must work as before: `quit` ends the program, `help` lists commands, other lines echo.
- Add your test as another `elif` in the chain.

```check
run "python habits.py" stdin="\nquit\n" stdout="Type a command, or help" label="an empty line gets a hint" -- Add elif line == "": and print Type a command, or help.
run "python habits.py" stdin="\nquit\n" without="You typed: " label="an empty line is not echoed" -- The empty-line test must come before the else.
run "python habits.py" stdin="help\nquit\n" stdout="Commands: add NAME, done NAME, list, quit" label="help still works" -- Do not change the help text.
run "python habits.py" stdin="hello\nquit\n" stdout="You typed: hello" label="other lines still echo" -- The else should still print the echo.
```

```hints
nudge: What is the value of line when the user types nothing and presses Enter?
concept: An empty string is written "". Compare with ==, the same way you compare with "quit". Each elif adds one more possibility to the chain.
shape: Add one more elif between the help branch and the else, comparing line to the empty string.
answer: The chain inside the loop becomes:
~~~python
        if line == "quit":
            break
        elif line == "help":
            print("Commands: add NAME, done NAME, list, quit")
        elif line == "":
            print("Type a command, or help")
        else:
            print(f"You typed: {line}")
~~~
```
