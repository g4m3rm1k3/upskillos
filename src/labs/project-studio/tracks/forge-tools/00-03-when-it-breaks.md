---
title: 0.3 — When It Breaks: Reading a Traceback
runtime: python
run: scores.py
---

Every programmer's programs crash, many times a day, for their whole career. What separates an engineer from a beginner isn't fewer crashes: it's what they do next. A beginner sees a wall of red text and starts changing things until the error goes away. An engineer **reads** it, because a traceback is the most precise bug report they'll ever get, and then follows a method that finds the cause instead of hiding the symptom.

This lesson teaches both: how to read a traceback, line by line, and the debugging method you'll use in every chapter of this series. You'll practise it in a **bug hunt** at the end, which every chapter has.

## A program that crashes

**Build:** a program that prints each player's average score, and crashes partway through.

Create `scores.py`:

```python file=scores.py
def average(scores):
    total = 0
    for score in scores:
        total += score
    return total / len(scores)


def report(name, scores):
    print(f"{name}: average {average(scores):.1f}")


def main():
    players = {
        "Ada": [120, 340, 90],
        "Grace": [410, 220],
        "Linus": [],
    }
    for name, scores in players.items():
        report(name, scores)


main()
```

Run it (the **Run scores.py** button, or `python scores.py` in the terminal):

```text
Ada: average 183.3
Grace: average 315.0
Traceback (most recent call last):
  File "C:\Users\you\Documents\forge\scores.py", line 22, in <module>
    main()
    ~~~~^^
  File "C:\Users\you\Documents\forge\scores.py", line 19, in main
    report(name, scores)
    ~~~~~~^^^^^^^^^^^^^^
  File "C:\Users\you\Documents\forge\scores.py", line 9, in report
    print(f"{name}: average {average(scores):.1f}")
                             ~~~~~~~^^^^^^^^
  File "C:\Users\you\Documents\forge\scores.py", line 5, in average
    return total / len(scores)
           ~~~~~~^~~~~~~~~~~~~
ZeroDivisionError: division by zero
```

**Understand the program first.** `players` is a **dictionary**: each name (a **key**) is paired with a list of scores (its **value**). `players.items()` gives the pairs one at a time, and `for name, scores in ...` unpacks each pair into two names:

```text
pass 1   ("Ada", [120, 340, 90])   →  name = "Ada",   scores = [120, 340, 90]
pass 2   ("Grace", [410, 220])     →  name = "Grace", scores = [410, 220]
pass 3   ("Linus", [])             →  name = "Linus", scores = []
```

`average` adds up a list with a loop (`total += score` is short for `total = total + score`) and divides by `len(scores)`, how many there are: for Ada, (120 + 340 + 90) / 3 = 183.33…. `:.1f` inside the braces of an f-string is a **format specification**: show the number with one digit after the decimal point, so 183.333… prints as `183.3`.

Ada and Grace were printed before the crash, and Linus wasn't. Nothing after the error ran: an exception stops the program at the line where it happens (lesson 0.1), and the exit code is 1.

```check
run "python scores.py" exit=1 stderr="ZeroDivisionError" label="scores.py crashes with a ZeroDivisionError" -- Type scores.py exactly as shown: Linus's list must be empty.
```

## Read it from the bottom

**Build:** nothing new: read the traceback above, from the bottom up.

**Understand: the call stack.** To read a traceback you need one idea: how Python keeps track of function calls.

> **Call stack**: the list of function calls that are in progress, each waiting for the one it called to finish. Each entry is a **frame**: one call, with its own local variables and the line it's currently on. Calling a function adds a frame on top; returning removes it.

Traced for this program, at the moment of the crash:

```text
frame (newest at the bottom)   on line   its variables
<module>  (the file itself)    22        (none of its own yet)
main()                         19        players = {...}, name = "Linus", scores = []
report("Linus", [])            9         name = "Linus", scores = []
average([])                    5         scores = [], total = 0     ← the error happened here
```

`<module>` is the code at the top level of the file, outside any function, and it's always the first frame: it's what called `main()`.

A **traceback** is a printout of the call stack at the moment an exception happened, and *most recent call last* tells you the order: the oldest frame first, the newest (where the error happened) last. So read it **from the bottom**:

1. **The last line says what went wrong**: the exception's type, `ZeroDivisionError`, then its message, `division by zero`. Read this first. Very often it's enough.
2. **The frame just above it says where**: file `scores.py`, line 5, inside the function `average`, with the line of code itself. The `~` and `^` markers underline the exact part of the line that failed: here the `/`, with `total` and `len(scores)` on either side of it.
3. **The frames above that say how the program got there**: `average` was called by `report` on line 9, which was called by `main` on line 19, which was called by the file's own code on line 22. That's the path, and it answers "with which values?": following it back, `report` was called with `scores` for Linus, which is `[]`.

So: `len([])` is 0, and `0 / 0` can't be computed. Python raised `ZeroDivisionError` rather than pretending there's an answer.

```predict
question: The program has 22 lines. On which line does the error happen?
answer: 5
explain: The **last frame** is where the error happened: `line 5, in average`. Line 22 is where the whole chain *started*, and lines 19 and 9 are calls still waiting for an answer. The bottom frame is where to start looking, although (next step) not always where the mistake is.
verify: python -c "import re, subprocess, sys; r = subprocess.run([sys.executable, 'scores.py'], capture_output=True, text=True); print(re.findall(r'line (\d+)', r.stderr)[-1])"
```

> **Engineer:** a traceback answers three questions in a fixed place each: **what** (the last line), **where** (the last frame) and **how did we get here** (every frame above it). Learn the shape once and you can read a traceback from any Python program, including libraries you've never seen: in a long traceback, scan upwards from the bottom for the first frame in *your* file, because that's usually where your code handed a library something it couldn't handle.

One shape you'll meet soon: a traceback with the line *During handling of the above exception, another exception occurred* in the middle. That's two reports stacked: a second error happened while the program was dealing with the first. Read the last one first, as always, then the one above the line, which is usually the original cause.

## Where it broke, and where it's wrong

**Build:** fix `scores.py`.

The crash is in `average`, but is `average` wrong? That depends on a question the program never answered: **what should happen for a player with no scores?** An average of no numbers doesn't exist, so `average([])` failing is arguably correct. The mistake is in `report`, which asked for something that doesn't exist. A person reading the report wants to see that Linus hasn't played.

Change `report` so that it handles that case before asking for an average:

```python file=scores.py
def average(scores):
    total = 0
    for score in scores:
        total += score
    return total / len(scores)


def report(name, scores):
    if not scores:
        print(f"{name}: no games yet")
        return
    print(f"{name}: average {average(scores):.1f}")


def main():
    players = {
        "Ada": [120, 340, 90],
        "Grace": [410, 220],
        "Linus": [],
    }
    for name, scores in players.items():
        report(name, scores)


main()
```

**Understand.** `if not scores:` is true when the list is empty. In an `if`, Python treats empty containers (`[]`, `{}`, `""`) and zero as false, and anything else as true; this is called **truthiness**. `return` with nothing after it leaves the function immediately, so the average line only runs for a list with something in it. It's a **guard clause**, as in lesson 0.1's Your turn.

```text
Ada: average 183.3
Grace: average 315.0
Linus: no games yet
```

> **Engineer:** a traceback shows where Python **noticed** a problem, which isn't always where the **mistake** is. The fix belongs where the wrong assumption was made, and finding it often means answering a question about what the program *should* do, not just how to make the error stop. Python has a way to catch an exception and carry on, `try` and `except`, which lesson 2.4 shows and Chapter 5 uses. Wrapping line 5 in it just to make the error go away would have hidden the question instead of answering it.

```check
run "python scores.py" stdout="Linus: no games yet" label="scores.py reports Linus as having no games" -- Check for an empty list at the start of report, print the message and return.
run "python scores.py" stdout="Ada: average 183.3" label="averages are still printed for players with scores"
```

## The exceptions you'll meet most

**Build:** cause each of these on purpose, so you recognise them later.

Each command below makes one deliberate mistake. Run them one at a time in the terminal and read the last two lines of each:

```powershell
python -c "score = 10; print(scroe)"
python -c "print('Score: ' + 10)"
python -c "lives = [3, 2, 1]; print(lives[3])"
python -c "player = {'name': 'Ada'}; print(player['score'])"
python -c "name = 'ada'; print(name.uppper())"
python -c "import pygmae"
python -c "print(int('ten'))"
```

```predict
question: Which exception will `print('Score: ' + 10)` raise?
choice: ValueError
choice: TypeError
choice: NameError
answer: TypeError
explain: `+` means different things for different **types**: it adds numbers and joins strings, but there's no rule for a string plus a number, so Python raises `TypeError: can only concatenate str (not "int") to str`. The fix is to turn the number into text first: `'Score: ' + str(10)`, or an f-string, `f'Score: {10}'`.
```

**Understand.** What each one means, and its most common cause:

| Exception | What it means | Usually caused by |
|---|---|---|
| `NameError: name 'scroe' is not defined. Did you mean: 'score'?` | no variable or function with that name exists here | a typo, or using a variable before assigning it |
| `TypeError: can only concatenate str (not "int") to str` | an operation got a value of a type it can't work with | mixing text and numbers, or a value being `None` (Python's "nothing here" value, met properly in the next step) when you expected something else |
| `IndexError: list index out of range` | a list position that doesn't exist | counting from 1 instead of 0: a 3-item list has indexes 0, 1, 2 |
| `KeyError: 'score'` | a dictionary has no such key | a typo, or a key that was never added |
| `AttributeError: 'str' object has no attribute 'uppper'. Did you mean: 'upper'?` | that kind of value has no method or attribute with that name | a typo, or the value isn't the type you think it is |
| `ModuleNotFoundError: No module named 'pygmae'` | `import` searched `sys.path` and found nothing (lesson 0.2) | a typo, the package not installed, or the wrong Python running |
| `ValueError: invalid literal for int() with base 10: 'ten'` | the type was right, the value wasn't usable | converting text that isn't a number |
| `ZeroDivisionError: division by zero` | division by zero | an empty list, or a count of zero |

Notice the `Did you mean` suggestions: recent Pythons compare the name you typed with the names that do exist, and suggest the closest. Trust them when they appear.

> **Engineer:** an exception's **type** is information, not decoration. `KeyError` and `IndexError` both mean "it's not there", but they point at different kinds of value; `TypeError` and `ValueError` separate "wrong kind of thing" from "right kind, bad value". When you write your own errors (Chapter 5), you'll choose types the same way, so that whoever reads your traceback knows what went wrong from its last line.

## A crash far from its cause

**Build:** type a program whose crash is three functions away from its mistake.

Create `leaderboard.py`, which says where a player ranks. Read it before running it: `SCORES` is a dictionary from each name to a score (written in capitals because it's meant never to change). `find_score` goes through `SCORES.items()`, name and score together, and returns the score whose name matches. `rank` counts how many scores in `SCORES.values()`, the scores alone, are higher than the player's, and adds 1.

```python file=leaderboard.py
import sys

SCORES = {
    "ada": 1250,
    "grace": 980,
    "linus": 1430,
}


def find_score(name):
    for player, score in SCORES.items():
        if player == name:
            return score


def rank(name):
    score = find_score(name)
    better = 0
    for other in SCORES.values():
        if other > score:
            better += 1
    return better + 1


def main():
    if len(sys.argv) != 2:
        print("usage: python leaderboard.py NAME")
        sys.exit(2)
    name = sys.argv[1]
    print(f"{name} is ranked {rank(name)} of {len(SCORES)}")


main()
```

Try it:

```powershell
python leaderboard.py ada
python leaderboard.py linus
python leaderboard.py Ada
```

```text
ada is ranked 2 of 3
linus is ranked 1 of 3
Traceback (most recent call last):
  File "C:\Users\you\Documents\forge\leaderboard.py", line 33, in <module>
    main()
    ~~~~^^
  File "C:\Users\you\Documents\forge\leaderboard.py", line 30, in main
    print(f"{name} is ranked {rank(name)} of {len(SCORES)}")
                              ~~~~^^^^^^
  File "C:\Users\you\Documents\forge\leaderboard.py", line 20, in rank
    if other > score:
       ^^^^^^^^^^^^^
TypeError: '>' not supported between instances of 'int' and 'NoneType'
```

**Understand: the debugging method.** This is the method you'll use for every bug in this series. Here it is, worked through once:

1. **Observe.** Read the traceback from the bottom: a `TypeError` on line 20, in `rank`: `>` was given an `int` and a `NoneType`.
2. **Reproduce.** Find the smallest command that makes it happen every time: `python leaderboard.py Ada`. A bug you can trigger on demand is half solved; one you can't is a guessing game.
3. **Form a hypothesis.** `other` comes from `SCORES.values()`, so it's an `int`. So `score` must be the `NoneType` value. Hypothesis: *`score` is `None`.*
4. **Inspect.** Test it, instead of assuming. Add a line to `rank`, just after `score = find_score(name)`:

   ```python
   print("DEBUG score =", repr(score))
   ```

   Run `python leaderboard.py Ada` again: it prints `DEBUG score = None` before crashing. **`repr`** shows a value the way you'd write it in code, so text appears with its quotes (`'Ada'` rather than `Ada`) and stray spaces become visible. Always use it when printing a value to debug.
5. **Isolate.** Why is it `None`? Follow it to where it came from: `find_score("Ada")`. That loop compares `"Ada"` with each key, `"ada"`, `"grace"`, `"linus"`, and `==` on strings is exact, capital letters included, so no key matches. The loop ends without reaching `return score`.

   > **`None`**: Python's value for "nothing here". A function that ends without running a `return` statement returns `None`. Its type is called `NoneType`, which is the name in the error message. To test for it, write `value is None`. `is` asks whether two names refer to the very **same object**, not just equal ones; there is only ever one `None` object, so `is None` is exact, and it's the form every Python programmer uses. See the difference in the REPL (lesson 0.1):

   ```text
   >>> a = [1, 2]
   >>> b = [1, 2]
   >>> a == b
   True
   >>> a is b
   False
   >>> c = a
   >>> c is a
   True
   >>> x = None
   >>> x is None
   True
   ```

   `a` and `b` are two lists with equal contents, so `==` is `True`, but they're two separate objects, so `is` is `False`. `c = a` doesn't copy anything: it's a second name for the same list, so `c is a` is `True`.

   So the cause is in `find_score`, two calls before the crash, and there are really **two** problems: names don't match regardless of capitals, and a name that isn't on the board at all (try `python leaderboard.py Bob`) crashes too, when it should get a message.
6. **Fix**: the next step is yours.
7. **Check it can't come back.** Re-run the command that reproduced it, and the cases that already worked, to be sure the fix broke nothing. From Chapter 2 on, this becomes a **regression test**: a test that runs automatically every time, so this bug can never quietly return.

Remove the `DEBUG` line once you've seen it. Debugging output left in a program is a bug of its own.

> **Engineer:** the method replaces guessing with evidence. Each step either narrows down where the bug can be or proves a guess wrong, and a wrong guess you've *proved* wrong is progress too. In Chapter 1 you'll do the inspect step with a debugger instead of `print`, which lets you stop a program and look at every variable.

```check
run "python leaderboard.py ada" stdout="ada is ranked 2 of 3" label="leaderboard.py ranks ada" -- Type leaderboard.py exactly as shown.
run "python leaderboard.py Ada" exit=1 stderr="TypeError" label="leaderboard.py crashes for Ada (for now)" -- The bug is meant to be there in this step: the next step fixes it. If it doesn't crash, compare your file with the lesson's.
```

## Your turn: bug hunt

**Build, on your own:** fix `leaderboard.py`, using what the method found.

| Command | Prints | Exit code |
|---|---|---|
| `python leaderboard.py ada` | `ada is ranked 2 of 3` | 0 |
| `python leaderboard.py Ada` | `Ada is ranked 2 of 3` | 0 |
| `python leaderboard.py LINUS` | `LINUS is ranked 1 of 3` | 0 |
| `python leaderboard.py Bob` | `No player called Bob` | 1 |

The name is printed the way the person typed it. Fix each problem where it's caused, not where it crashes: `rank` should never be handed a `None`. Why exit code 1 for Bob, not 2? The command was used correctly, with one name as the usage line asks; it's the data that doesn't contain the name, so it's "something went wrong while working", lesson 0.1's 1.

Try it for about 10 minutes before taking a hint. When it works, run all four commands again: that's step 7 of the method.

```hints
nudge: Two separate problems: matching names regardless of capitals, and a name that isn't there at all. Take them one at a time. Which function decides whether a name matches, and which function should notice that nobody was found, before `rank` is ever called?
concept: Strings have a method `.lower()` that returns a copy in lower case, so `"LINUS".lower() == "linus"` is `True`, and the keys are already lower case. For a missing player, `find_score` returns `None`, and `score is None` tests for that. The check belongs in `main`, before `rank`, since `main` is the part that talks to the person and decides the exit code.
shape: In `find_score`, compare `player == name.lower()`. In `main`, after reading `name`, call `find_score(name)` and, if the result `is None`, print `No player called {name}` and `sys.exit(1)`: a guard clause again. Then the existing `print` with `rank(name)` only ever runs for a real player.
answer: The changed `find_score` and `main` (the rest of the file stays as it was):

~~~python
def find_score(name):
    for player, score in SCORES.items():
        if player == name.lower():
            return score


def main():
    if len(sys.argv) != 2:
        print("usage: python leaderboard.py NAME")
        sys.exit(2)
    name = sys.argv[1]
    if find_score(name) is None:
        print(f"No player called {name}")
        sys.exit(1)
    print(f"{name} is ranked {rank(name)} of {len(SCORES)}")
~~~

`name.lower()` is used only for comparing: the printed name stays the way it was typed, as the table asks. The missing-player check is in `main` because it's about talking to the person: `find_score` reports "nobody" by returning `None`, and `main` decides what that means for the user (a message) and for other programs (exit code 1, lesson 0.1). `rank` can now assume it's given a real player, which is what its code already assumed. One cost remains: `find_score(name)` now runs twice, once in `main` and again inside `rank`. With three players that's nothing. The cleaner shape looks the score up once in `main` and passes it to `rank` as a second argument, so `rank` never searches at all: try it if you like.
```

```check
run "python leaderboard.py ada" stdout="ada is ranked 2 of 3" label="ada is still ranked 2 of 3"
run "python leaderboard.py Ada" stdout="Ada is ranked 2 of 3" label="Ada, with a capital, is ranked 2 of 3" -- Compare names in lower case in find_score, but print the name as typed.
run "python leaderboard.py LINUS" stdout="LINUS is ranked 1 of 3" label="LINUS is ranked 1 of 3"
run "python leaderboard.py Bob" exit=1 stdout="No player called Bob" label="Bob gets a message and exit code 1, not a traceback" -- In main, check whether find_score returned None before calling rank.
run "python leaderboard.py Ada" without="DEBUG" label="the debugging line is gone"
```

## Challenge: the best game too

**Optional, ★.** Make `scores.py` also print each player's **best** single score, on the same line as the average, still handling Linus, who has played no games. Decide first what "best of no games" should print, and why. It's the same question as the average, and it deserves the same kind of answer.

## Challenge: ties

**Optional, ★★.** Give two players the same score, 1250, in `leaderboard.py`. Both should be "ranked 2", and the next player down "ranked 4" (the usual sports rule: two players share second place, so nobody is third). Write the expected output for every player first, then trace `rank` by hand for both tied players before changing any code. Does the current `rank` already do it? Find out by reasoning, then by running it.

## Challenge: a bug of your own

**Optional, ★★.** Write a program of about 15 lines whose crash is three function calls away from its cause: for example a function that returns `None` in one branch, called by one function, whose result is used by another. Put it away for a day (or swap it with a friend), then find the cause using only the traceback and the debugging method. Writing a bug on purpose teaches you what the traceback can and can't tell you.

## What did we actually learn?

- **A traceback is the call stack at the moment of failure**, oldest call first. Read it from the bottom: *what* (the last line), *where* (the last frame), *how we got here* (the frames above).
- **Where Python noticed isn't always where the mistake is.** Follow the bad value back to where it was made, and fix it there.
- **Some bugs are really unanswered questions** about what the program should do ("what's the average of no scores?"). Answering the question is the fix; silencing the error isn't.
- **The debugging method**: observe, reproduce, hypothesise, inspect, isolate, fix, and check it can't come back. It turns guessing into evidence, and it works the same in every language.
- **`None` travels.** A function that silently returns `None` passes the problem along until something far away tries to use it. Making "nobody found" explicit, and handling it where it's decided, is a habit you'll use in every chapter.

In C# and Java the same report is called a **stack trace**, and it's printed the other way up: the **most recent call first**, at the top, with the error message above it. The idea is identical; only the reading direction changes. `NullReferenceException` (C#) and `NullPointerException` (Java) are those languages' versions of using a `None` where a real value was expected, and they're the most common crash in both. From lesson 2.5, a type checker will catch this one before your program even runs.

**Chapter 0's challenges**, to come back to: an exit code you choose ★, find a program the way the shell does ★★, greet everyone ★★ (lesson 0.1); two Pythons, explained ★★, check every pinned package ★★★ (lesson 0.2); the best game too ★, ties ★★, a bug of your own ★★ (this lesson).

That's Chapter 0. You have a project folder, a terminal you understand, an isolated Python with pinned packages, and a method for when things break. Chapter 1 starts the game: Breakout, in a single file, and your first git commit.
