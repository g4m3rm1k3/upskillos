---
title: 0.1 — The Terminal and Your First Program
track: Applied ML — Python from Zero
trackOrder: 19
runtime: python
run: hello.py
---

This is the first lesson of **Applied Machine Learning**, a series that starts with no programming at all and ends with machine-learning tools a software team would really use: a report on which tests are flaky, a model that predicts when a test will blow its time budget, a bug-report triager, a warning on risky changes. You'll learn the Python, the mathematics and the reasoning behind both, and **you'll type every line yourself**. Nothing is pasted in for you, because typing code, running it and seeing what breaks is the learning.

**What you need:** a computer and some patience. No programming, no maths beyond arithmetic.

## How every lesson works

Each step gives you **a small program to type**, usually a few lines, in a file of its own. You run it, see what it prints, and *then* read how it works. Code first, then the explanation, so you always have something real in front of you while you read about it.

Each explanation has two parts:

- **How it works**: what the computer actually does, step by step, often traced with real values. Not just "this line prints the total", but how the total got there.
- **Why**: why the code is written this way, and what goes wrong with the obvious alternative.

**New words** get a precise definition first, in the words other programmers use, so you can search for them. Sometimes a comparison follows, marked *Picture it as*. It comes after the explanation, never instead of it, and it says where the comparison stops working.

**Predict before you look.** Some steps ask you to commit to an answer before you run something. Wrong predictions are the useful ones: they show exactly which part of your picture needs fixing.

**Try it** sections give you changes to make on purpose: break things, change numbers, and watch what happens. **Your turn** steps show no code, only what your program must do, with checks that run it. Hints come one at a time, each giving away a little more.

**Check my work** runs real checks on the real files in your project folder. **Next step** is never locked.

## Make the project folder

Everything this series builds lives in one folder.

1. Click **Choose folder…** in the middle of this window.
2. Go to your **Documents** folder.
3. Click **New folder**, name it `ci-toolkit`, and press Enter.
4. Select the new `ci-toolkit` folder and click **Select Folder**.

The name comes from what you'll build first. **CI** stands for *continuous integration*: a team's computers run every test automatically, every night or after every change, and record which tests passed, which failed and how long each took. That record is real data that every software team has, and over the next chapters you'll turn it into tools.

The folder is yours, not this app's. Open it in File Explorer and you'll see exactly the files shown in the tree on the left.

> **Path**: the address of a file or folder, written as the folders you pass through to reach it. Yours is something like `C:\Users\you\Documents\ci-toolkit`: the drive `C:`, then the folder `Users`, then your own folder, then `Documents`, then `ci-toolkit`. Each `\` means "go inside".

## Meet the terminal

The panel at the bottom of this window is a **terminal**.

> **Terminal**: a window where you type commands and see what they print. **Shell**: the program inside the terminal that reads each command and runs it. On Windows the shell here is **PowerShell**.

Click in the terminal, type this, and press **Enter**:

```powershell
pwd
```

```text
Path
----
C:\Users\you\Documents\ci-toolkit
```

**How it works.** `pwd` means *print working directory*. The shell keeps one folder as its **current directory** (also called the *working directory*; *directory* is another word for folder), and commands act on that folder unless you name another. It starts as your project folder. When `pwd` finishes, the shell prints a new **prompt**, the `PS C:\...>` line, which means "done; waiting for the next command".

Now make a folder for the small programs you'll write in the next few lessons:

```powershell
mkdir explore
ls
```

`mkdir` means *make directory*. `ls` lists what's in the current directory; you'll see `explore` there, and in the file tree on the left. The terminal and the file tree look at the same real folder on your disk.

Two habits that save a lot of typing: **↑** brings back the previous command, and **Tab** finishes a file or folder name you've started.

```check
dir explore -- Type mkdir explore in the terminal and press Enter.
```

## Which Python?

**Python** is a program that runs programs written in the Python language. Ask the shell which one you have:

```powershell
python --version
```

```text
Python 3.13.5
```

Your number may differ. This series needs **3.12 or newer**.

If the shell says *The term 'python' is not recognized*, Python isn't installed (or the shell can't find it). Install it from [python.org/downloads](https://www.python.org/downloads/): run the installer, **tick "Add python.exe to PATH"** on its first screen, finish, then close this whole window and open it again, so the shell starts fresh and can find the new program.

**How it works.** When you type a word like `python`, the shell doesn't understand it. It looks through a list of folders, called **PATH**, for a program file named `python.exe`, and runs the first one it finds, passing it the rest of the line (`--version`). That's why ticking "Add python.exe to PATH" matters: it adds Python's folder to that list. You can see which file the shell found:

```powershell
(Get-Command python).Source
```

```check
run "python -c \"import sys; assert sys.version_info >= (3, 12), sys.version\"" label="Python 3.12 or newer runs from the terminal" -- Install Python 3.12 or newer from python.org, tick "Add python.exe to PATH", then close and reopen this window.
```

## Your first program

Create a file called `hello.py` in the `ci-toolkit` folder (click **New file** above the file tree, or right-click in it), and type this into it:

```python file=hello.py
print("Hello from ci-toolkit")
```

Save it with **Ctrl+S**, then run it from the terminal:

```powershell
python hello.py
```

```text
Hello from ci-toolkit
```

You've written and run a program.

**How it works.** The shell found `python.exe` and gave it one word: `hello.py`. Python opened that file, read the whole thing, and then carried out its instructions from top to bottom. There's one instruction here: `print(...)`.

- **`print`** is a **function**: a named piece of behaviour you can use. Writing a name followed by round brackets, `print(...)`, **calls** it: "do your thing, with what's in the brackets".
- What's in the brackets is the **argument**: the value you hand to the function. `print` writes its argument to the terminal, then moves to a new line.
- **`"Hello from ci-toolkit"`** is a **string**: a piece of text. The double quotes mark where the text starts and ends; they aren't part of it, which is why they don't appear in the output.

**Why the quotes matter.** Without them, Python would read `Hello` as a *name* for something, look for a thing called `Hello`, and fail. The quotes say "this is data, not an instruction". You'll see exactly that failure in a few steps.

```check
run "python hello.py" stdout="Hello from ci-toolkit" label="python hello.py prints Hello from ci-toolkit" -- Save hello.py in the ci-toolkit folder (not inside explore), then run python hello.py.
```

## Several instructions, in order

Replace `hello.py` with this. The first line starts with `#`:

```python file=hello.py
# What the nightly CI ran
print("ci-toolkit")
print("Nightly runs:", 15)
print(15 * 6)
print("15 * 6")
```

Before running it, predict:

```predict
question: What do the last two lines print?
choice: 90 and 90
choice: 90 and 15 * 6
choice: 15 * 6 and 15 * 6
answer: 90 and 15 * 6
explain: `15 * 6` without quotes is **arithmetic**: `*` means multiply, so Python works out 90 and prints the number. `"15 * 6"` with quotes is a **string**: five characters of text that happen to look like a sum. Python never looks inside a string for instructions, so it prints the characters exactly as they are.

This is the most important distinction in this lesson: **code** is what Python carries out; **data** is what the code works on. Quotes turn code-looking text into data.
```

```powershell
python hello.py
```

```text
ci-toolkit
Nightly runs: 15
90
15 * 6
```

**How it works.**

- Line 1 starts with **`#`**, which makes it a **comment**: Python ignores everything from `#` to the end of the line. Comments are notes for people reading the code, and they're how you'll explain *why* a line exists when it isn't obvious.
- The lines run **in order, top to bottom**, one after another. Each `print` finishes before the next starts, so the output appears in the same order as the lines.
- `print("Nightly runs:", 15)` gives `print` **two arguments**, separated by a comma: a string and a number. `print` writes them one after the other with a space between. `15` has no quotes, so it's a number, not text.
- For `print(15 * 6)`, Python works out what's in the brackets **first**, getting 90, and only then calls `print` with 90. Whatever's inside the brackets is finished before the function is called. That rule will matter a great deal once the brackets hold more complicated things.

There are 15 nightly runs of 6 tests each in the data you'll use soon, which is where those numbers come from.

```check
run "python hello.py" stdout="ci-toolkit\nNightly runs: 15\n90\n15 * 6" label="hello.py prints its four lines, with 15 * 6 worked out on the third" -- Type the five lines exactly as shown, including the quotes on the last one, and save.
```

## When it breaks: a NameError

Programs crash. Every programmer's do, many times a day. What matters is reading what Python tells you when they do. Make a crash on purpose: create `explore/broken.py` (inside the `explore` folder) with a misspelling on line 2:

```python file=explore/broken.py
print("before")
pritn("oops")
print("after")
```

```predict
question: You run it. What appears?
choice: Nothing at all: Python refuses to run a file with a mistake in it
choice: "before", then an error, and "after" never prints
choice: All three lines, because Python skips the line it doesn't understand
answer: "before", then an error, and "after" never prints
explain: Python runs the lines in order. Line 1 is fine, so `before` prints. On line 2 it looks for something called `pritn`, there's nothing by that name, so it stops the program with an error. Line 3 never runs: Python doesn't skip a broken line and carry on, because the lines after it might depend on what it should have done.
```

```powershell
python explore/broken.py
```

```text
before
Traceback (most recent call last):
  File "C:\Users\you\Documents\ci-toolkit\explore\broken.py", line 2, in <module>
    pritn("oops")
    ^^^^^
NameError: name 'pritn' is not defined. Did you mean: 'print'?
```

> **Traceback**: the report Python prints when a program stops with an error. It says where the error happened and what kind of error it was.

**Read it from the bottom up.** The last line is the most important:

- **`NameError`** is the *kind* of error: Python met a name it doesn't know. **`name 'pritn' is not defined`** says which name. Python even guesses what you meant.
- Above it, the line of code itself, with `^^^^^` under the exact part that failed.
- Above that, **where**: the file, and **line 2**. `in <module>` means "in the main part of the file", not inside some smaller piece; you'll see other names there once your programs have functions.

**How it works.** `print` isn't magic: it's a name Python knows from the start, attached to the printing behaviour. When Python reaches `pritn(...)`, it looks the name up, finds nothing, and **raises** a `NameError`, which stops the program unless something deals with it. The program then **exits** with a code that tells the shell it failed: `0` means success, anything else means failure. Python uses `1` here. Tools like CI systems read that code to decide whether a run passed.

Fix nothing yet: the next step needs this file.

```check
run "python explore/broken.py" exit=1 stdout="before" stderr="NameError" label="broken.py prints before, then stops with a NameError" -- Line 2 must say pritn, misspelled, exactly as shown.
run "python explore/broken.py" exit=1 without="after" label="after never prints"
```

## When it breaks before it starts: a SyntaxError

Change `explore/broken.py`: spell `print` correctly on line 2, and delete the closing quote on line 3:

```python file=explore/broken.py
print("before")
print("oops")
print("after)
```

```predict
question: Line 1 is still fine. Does "before" print this time?
choice: Yes: lines run in order, and line 1 has nothing wrong with it
choice: No: nothing prints at all
answer: No: nothing prints at all
explain: Before running a single line, Python reads the **whole file** and translates it into simpler instructions for itself. This step is called **compiling**. A missing quote makes the file impossible to translate: Python can't tell where the string was meant to end. So it stops during compiling, before line 1 has run.

A `NameError` is different. `pritn("oops")` is perfectly well-formed Python, a name followed by brackets. Python only discovers that the name doesn't exist when it gets to that line while running.
```

```powershell
python explore/broken.py
```

```text
  File "C:\Users\you\Documents\ci-toolkit\explore\broken.py", line 3
    print("after)
          ^
SyntaxError: unterminated string literal (detected at line 3)
```

No `before`, and no `Traceback (most recent call last)` heading, because nothing was running yet.

**How it works.** Python handles a file in two stages:

1. **Compile**: read the whole file and check that it is well-formed Python (its **syntax**: the rules of how the language is written, like grammar for a sentence). Turn it into instructions.
2. **Run**: carry out those instructions, one at a time.

A **SyntaxError** comes from stage 1, so nothing runs. A **NameError** comes from stage 2, so the lines before it have already run. *String literal* means a string written directly in the code with quotes; *unterminated* means it never ends. The `^` points at where the string started.

**Why it's built this way.** Checking the whole file first means a typo near the end can't leave a half-finished run behind: either the file is valid Python or nothing happens. Errors that depend on what the program is doing, like an unknown name, can only be found while it runs.

```check
run "python explore/broken.py" exit=1 stderr="SyntaxError" without="before" label="broken.py stops with a SyntaxError before printing anything" -- Delete only the closing quote on line 3, and spell print correctly on line 2.
```

## Fix it

Put the closing quote back on line 3:

```python file=explore/broken.py
print("before")
print("oops")
print("after")
```

Run it again: all three lines print. Fixing a SyntaxError means finding the place where the file stops being well-formed. Python points at where it *noticed* the problem, which is usually the right line, but not always: an unclosed bracket is often only noticed on a later line.

```check
run "python explore/broken.py" stdout="before\noops\nafter" label="broken.py, fixed, prints all three lines" -- Put the closing quote back on line 3: print("after")
```

## Try it

Make these changes one at a time in `explore/broken.py` (or a new file in `explore`), run each, and see whether you can explain the result before reading the note.

| Change | What to notice |
|---|---|
| `print(7 / 2)` | `3.5`. `/` is division, and it gives a decimal answer even when both numbers are whole. |
| `print(7 // 2)` | `3`. `//` divides and throws away the remainder. You'll use it in lesson 0.3 to find the middle of a list. |
| `print(2 ** 10)` | `1024`. `**` means "to the power of". |
| `print()` | An empty line: `print` with no argument prints nothing, then moves to a new line. |
| `print(1, 2, 3)` | `1 2 3`: several arguments, separated by spaces. |
| `print("ab" * 3)` | `ababab`. A string times a number repeats the string. The same `*` does a different job depending on what it's given. |
| `Print("hi")` | `NameError`: Python cares about capital letters. `Print` and `print` are different names. |
| `print("hi"` | `SyntaxError`: a bracket opened and never closed. Read where Python says it noticed. |

## Your turn: about.py

**No code is shown in this step.** Create `about.py` in the `ci-toolkit` folder. When you run `python about.py`, it must print exactly these three lines:

```text
ci-toolkit
A report on nightly test runs.
15 runs x 6 tests = 90 results
```

One rule: the number `90` must not appear anywhere in your file. Python must work it out, as it did in `hello.py`.

```hints
nudge: You need three print calls, one for each line. Look again at how hello.py printed a string and a number with one print.
concept: print accepts several arguments separated by commas and writes them with a space between. A string is printed exactly as written; arithmetic without quotes is worked out first.
shape: The third line is several arguments: the text "15 runs x 6 tests =", then 15 * 6 without quotes, then the text "results". Count the spaces print adds between arguments.
answer: ~~~python
print("ci-toolkit")
print("A report on nightly test runs.")
print("15 runs x 6 tests =", 15 * 6, "results")
~~~
print puts one space between each argument, so the three arguments of the last call print as `15 runs x 6 tests =`, a space, `90`, a space, `results`.
```

```check
run "python about.py" stdout="ci-toolkit\nA report on nightly test runs.\n15 runs x 6 tests = 90 results" label="about.py prints the three lines exactly" -- Check spelling, the full stop after runs, and the spaces around = in the last line.
lacks about.py "90" label="about.py doesn't contain 90: Python works it out" -- Write 15 * 6 instead of 90, without quotes, as its own argument to print.
```

## What you've learned

- A **project** is a folder. The **terminal** runs commands in its **current directory**; `pwd`, `ls`, `mkdir` show and change what's there.
- `python file.py` runs a program: Python **compiles** the whole file, then **runs** its lines in order, top to bottom.
- `print(...)` **calls** a **function** with **arguments**, and the arguments are worked out before the call.
- Quotes make a **string**: data, never instructions. `15 * 6` is worked out; `"15 * 6"` is printed as it is.
- A **traceback** is read from the bottom: the kind of error, the message, then where. A **SyntaxError** stops everything before it starts; a **NameError** stops the program at the line where it happens.

Next lesson: numbers that change. You'll give values names, and meet the first surprise in how computers store decimals.
