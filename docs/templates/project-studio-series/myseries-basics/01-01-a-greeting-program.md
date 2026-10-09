---
title: 1.1 — A Greeting Program
track: My Series — The Basics
trackOrder: 99
runtime: python
---

This is the introduction: a paragraph or two on what this lesson builds and why it's worth building. Say what the learner will have at the end, in their own project folder.

This lesson builds `greet.py`, a program that greets someone by name, and then, on the learner's own, a function that shouts the greeting.

## A program that greets

Create `greet.py` in your project folder:

```python file=greet.py
import sys


def greet(name):
    return f"Hello, {name}!"


if __name__ == "__main__":
    print(greet(sys.argv[1]))
```

Explain the code after showing it, a point per idea:

- **`greet(name)`** returns the greeting instead of printing it, so other code can use it, and a test can check it.
- **`sys.argv`** is the list of words on the command line. `sys.argv[0]` is the script's own name, so the first word after it is `sys.argv[1]`.
- **`if __name__ == "__main__":`** runs the last line only when the file is run as a program, not when another file imports `greet`.

Run it:

```powershell
python greet.py Ada
```

Before running it without a name, predict what happens:

```predict
question: What does `python greet.py` do, with no name after it?
choice: It prints Hello, !
choice: It stops with an IndexError
answer: It stops with an IndexError
explain: With no name, `sys.argv` holds only the script's name, so `sys.argv[1]` asks for an item that isn't there, and Python stops with an `IndexError`.
verify: python -c "import subprocess, sys; r = subprocess.run([sys.executable, 'greet.py'], capture_output=True, text=True); print('It stops with an IndexError' if 'IndexError' in r.stderr else 'It prints Hello, !')"
```

```check
run "python greet.py Ada" stdout="Hello, Ada!" label="greet.py greets Ada by name" -- Save greet.py, then run python greet.py Ada yourself.
```

## Your turn: shout it

**Build, on your own:** a function `shout(name)` in `greet.py` that returns the same greeting in capital letters: `shout("Ada")` returns `"HELLO, ADA!"`. Use `greet` rather than writing the greeting out a second time.

Try it from the terminal:

```powershell
python -c "from greet import shout; print(shout('Ada'))"
```

```hints
nudge: `shout` can call `greet` and change what it returns.
concept: Every string has an `upper()` method that returns it in capital letters.
answer: Add to `greet.py`, above the `if __name__` line:
~~~python
def shout(name):
    return greet(name).upper()
~~~
```

```check
run "python -c \"from greet import shout; print(shout('Ada'))\"" stdout="HELLO, ADA!" label="shout('Ada') returns HELLO, ADA!" -- Return greet(name) in capital letters.
run "python greet.py Ada" stdout="Hello, Ada!" label="greet.py still greets normally" -- Leave greet and the last two lines as they were.
```

### What you have

```text
greet.py      greet(name), shout(name)
```

End each lesson by saying what comes next.
