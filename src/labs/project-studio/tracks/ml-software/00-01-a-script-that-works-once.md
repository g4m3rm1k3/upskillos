---
title: 0.1 — A Script That Works Once
track: Python Becomes Software
trackOrder: 20
runtime: python
run: count.py
concepts: virtual-environments
notebook: py-running-code, py-files-and-text
problem: You have a script that counts words in a file. Can anyone else use it, or test it, or build on it?
---

This is the first lesson of **Machine Learning — From Mathematics to Production**. By the end of the series you'll have built a machine-learning platform: people sign in, upload a dataset, train models, compare them and make predictions in a browser. You'll also understand the mathematics underneath every model, because you'll have written the simple version of each one yourself before using the library.

That's a long way from here, and the series doesn't start with machine learning. It starts with something more basic that every later chapter depends on: **turning a Python script into software**. A script is a file that runs. Software is code that other people (and other code) can run, test, reuse and change without breaking. Every machine-learning project you'll build is software in this sense, and most ML code that fails in practice fails as software, not as mathematics.

> **Software**: code that people other than its author, and other programs, can run on their own inputs, test, reuse and change without breaking it.
>
> *Picture it as* the difference between a note you scribble to remember a measurement and a drawing released to the shop floor. The note works for you, today. The drawing has to be complete enough that someone else can make the part next year without asking you anything.

You need basic Python: variables, `if`, loops, functions, lists, dictionaries, and reading a file. Everything else is taught when a problem needs it.

**How each lesson works.** You type the code (the panel shows exactly what changes in each step), and **Check my work** runs your real code in your real project folder. Some steps ask you to **predict** what will happen before you run something: commit to an answer, then read the explanation. Wrong predictions are the useful ones.

**How new words are introduced.** Every new term gets a definition first: the precise meaning, in the words the rest of the field uses. Then, where it helps, a picture to hang it on, marked *Picture it as*. The picture is there to help the definition click, never to replace it: when you read documentation or talk to other programmers, they'll use the real term. Where a picture stops matching the real thing, the lesson says so.

**Three ways to learn each idea.** The box above lists the concepts this lesson's checks demonstrate, and links to the same ideas in the **Notebook Lab** (short runnable notebooks) and, from Chapter 1 on, the **Machine Learning Lab** (interactive visualisations). Use them when something here doesn't click.

This chapter's project is a **text analysis tool**. You'll start it the way most programs start: as a script that works once.

## Choose the project folder

1. Click **Choose folder…** in the middle of this window.
2. Go to your **Documents** folder, make a **New folder** named `text-analysis`, select it and click **Select Folder**.

The terminal at the bottom now runs inside `text-analysis`.

> **Terminal**: a program that runs other programs from commands you type. The one in this window is **PowerShell**, the standard terminal on Windows. **Current working directory**: the folder a running program treats as "here". The terminal has one (it's shown in its prompt), and every program you start from it inherits it.
>
> *Picture it as* where you're standing in a building. Directions like "second door on the left" only work from the spot you were standing when you got them. A file name without a folder, like `data.txt`, is that kind of direction. This matters at the end of the lesson.

 Check which Python you have:

```powershell
python --version
```

```text
Python 3.13.14
```

This series needs **Python 3.12 or newer**. The numerical packages it uses later (NumPy 2.5, pandas 3) don't install on older versions.

If PowerShell says `python` isn't recognized, or opens the Microsoft Store, install Python from [python.org](https://www.python.org/downloads/). In the installer, tick **Add python.exe to PATH**. Then close and reopen this window so the terminal sees it.

```check
run "python -c \"import sys; assert sys.version_info >= (3, 12), sys.version\"" label="Python 3.12 or newer runs from the terminal" -- Install Python 3.12 or newer from python.org and tick "Add python.exe to PATH", then reopen this window.
```

## A Python of its own

A **package** (in this sense) is a library of Python code that someone published so others can install it: NumPy, pandas and pytest are packages. **pip** is the program that downloads and installs them. When you `pip install` a package, it goes into one Python installation's `site-packages` folder, shared by every program that uses that Python. Two projects that need different versions of the same package would break each other. A **virtual environment** prevents that: a folder holding a Python of its own, with its own empty `site-packages`.

> **Virtual environment**: a folder containing a Python launcher and an empty `site-packages` of its own, so that packages installed for this project are invisible to every other project, and the other way round.
>
> *Picture it as* giving each job its own toolbox instead of one shared drawer that every job takes from and puts back into. **Where the picture stops working:** the toolboxes still share one workbench. The standard library (`os`, `json`, `random`, …) comes from the main Python installation and isn't copied; only installed packages are kept separate.

```powershell
python -m venv .venv
```

`-m venv` means "run the standard-library module named `venv`". `.venv` is the folder it makes. It takes a few seconds and prints nothing.

The folder doesn't contain a copy of Python. `.venv\Scripts\python.exe` is a small launcher, and beside it sits `.venv\pyvenv.cfg`, a short text file. Open it:

```text
home = C:\Users\you\AppData\Local\Programs\Python\Python313
include-system-site-packages = false
version = 3.13.14
```

When a Python starts, it looks for `pyvenv.cfg` beside itself. Finding one, it loads the standard library from `home`, but searches for installed packages only in `.venv\Lib\site-packages`. That's the whole trick: one shared standard library, one private set of packages per project.

There are now two Pythons on your machine. Ask each one where it is:

```powershell
python -c "import sys; print(sys.executable)"
.venv\Scripts\python -c "import sys; print(sys.executable)"
```

The first is the system Python; the second is this project's. This series always runs the project's Python **by its path**, `.venv\Scripts\python`, so it never matters which one a bare `python` finds. The **Run** button does the same: a project with a `.venv` folder runs on its Python.

(If you've used `Activate.ps1` before: it puts `.venv\Scripts` at the front of this terminal's `PATH`, so a bare `python` finds the project's first. It's a convenience, not a requirement, and it lasts only for one terminal session.)

```check
file .venv/pyvenv.cfg -- Type python -m venv .venv in the terminal, inside the text-analysis folder.
run ".venv/Scripts/python -c \"import sys; assert sys.prefix != sys.base_prefix\"" label=".venv contains a working virtual environment"
```

## Pin what the project needs

Create a file named `requirements.txt`: right-click in the file tree, or **New file** in the editor.

```text file=requirements.txt
pytest==9.1.1
```

One package. **pytest** runs test files: small programs that call your code with known inputs and check the answers. It's how **Check my work** judges most steps from the next lesson on.

You may have expected NumPy, pandas or scikit-learn here. They're coming, but this series has a rule: **a library appears when a problem needs it**, so you know what it's for. NumPy arrives when Python lists become too slow for arithmetic on thousands of numbers. pandas arrives when hand-written dataset code gets painful. Right now the only problem is "how do we know the code works?", and pytest answers it.

`==9.1.1` **pins** an exact version. Without a pin, pip installs whatever is newest on the day you run it, and a project that worked in March can break in June with no change to your code. With a pin, every install of this project gets the same pytest.

> *Picture it as* a bill of materials. "M6 bolts" gets you whatever the stores have this week; "M6 × 20, ISO 4762, grade 8.8" gets you the same part every time. `pytest` is the first kind of line; `pytest==9.1.1` is the second.

```check
contains requirements.txt "pytest==9.1.1" -- One line: pytest==9.1.1
```

## Install it

```powershell
.venv\Scripts\python -m pip install -r requirements.txt
```

`-r requirements.txt` means "install everything listed in this file". `python -m pip` runs pip **inside that particular Python**, so it installs into that Python's `site-packages`: the project's. A bare `pip` command is whichever `pip.exe` your `PATH` finds first, which may belong to a different Python. Getting this wrong is one of the most common setup bugs: the install says it worked, and then your program can't find the package.

pip reads pytest's own list of requirements too (`pluggy`, `iniconfig` and a few others), so the last line, `Successfully installed …`, names more than one package.

Finally, `.venv` holds files that only work on this machine (`pyvenv.cfg` names this computer's Python by its full path). Nobody copies a `.venv` to another computer: they copy `requirements.txt` and run the install again. If you use Git, a `.gitignore` containing `.venv/` keeps the environment out of it.

```check
run ".venv/Scripts/python -c \"import pytest\"" label="pytest imports in the project's Python" -- Run .venv\Scripts\python -m pip install -r requirements.txt and wait for "Successfully installed".
```

## Something to analyse

Create `data.txt` and type (or paste) the opening of Charles Dickens's *A Tale of Two Cities*, line breaks included:

```text file=data.txt
It was the best of times, it was the worst of times,
it was the age of wisdom, it was the age of foolishness,
it was the epoch of belief, it was the epoch of incredulity,
it was the season of Light, it was the season of Darkness,
it was the spring of hope, it was the winter of despair,
we had everything before us, we had nothing before us,
we were all going direct to Heaven, we were all going direct
the other way.
```

It's short enough to count by eye, which matters: the first test of any program is a case where you already know the answer. It also has the awkward features real text has: `It` and `it` (same word?), `times,` with a comma attached, and a line that ends mid-sentence.

```check
file data.txt -- Create data.txt in the project folder and paste the passage into it.
```

## The script everyone writes first

Create `count.py`:

```python file=count.py
text = open("data.txt").read()

characters = len(text)
words = len(text.split())
lines = len(text.splitlines())

print("Characters:", characters)
print("Words:", words)
print("Lines:", lines)
```

Click **Run**. The output pane shows:

```text
Characters: 418
Words: 85
Lines: 8
```

Before reading the explanation, try the pieces yourself on a short string. Typing `.venv\Scripts\python` with no file name starts Python's **interactive prompt**, `>>>`: each line you type runs immediately, and the value of an expression is shown. Type the lines after `>>>` one at a time, and **predict each answer before pressing Enter**:

```text
.venv\Scripts\python
>>> text = "It was the best\nof times,\n"
>>> len(text)
26
>>> text.split()
['It', 'was', 'the', 'best', 'of', 'times,']
>>> text.splitlines()
['It was the best', 'of times,']
>>> print("Words:", 6)
Words: 6
>>> exit()
```

`"\n"` inside a string is how you write a **line break** (a "newline"): one character, even though it takes two to type. That's why `len` says 26: 15 characters, a newline, 9 more, a newline.

Now `count.py` line by line. Here is what Python executes:

1. `open("data.txt")` asks the operating system for the file named `data.txt` and returns a **file object**. `.read()` reads all of it into one string. Every line break in the file is in that string as the character `"\n"`.
2. `len(text)` counts characters, and the 8 line breaks are characters too: the passage has 410 visible characters (spaces included) plus 8 `"\n"`.
3. `text.split()` with no argument splits on **any run of whitespace** (spaces, tabs, line breaks) and drops empty pieces, so `"of times,\nit"` becomes `["of", "times,", "it"]`. Notice `"times,"`: the comma is part of the "word".
4. `text.splitlines()` splits at line breaks. A final `"\n"` at the end of the file doesn't start a ninth, empty line.
5. `print("Characters:", characters)` prints each argument it's given, separated by a space. So one call can print a label and a number together.

A **string** is Python's type for text: a sequence of characters. A **method** is a function that belongs to a value and is called with a dot: `text.split()` means "the `split` function of this particular string". Strings come with dozens of methods; `split`, `splitlines` and `lower` are the ones this chapter uses.

```check
run ".venv/Scripts/python count.py" stdout="Words: 85" label="count.py reports 85 words" -- Save count.py and data.txt, then press Run.
run ".venv/Scripts/python count.py" stdout="Lines: 8"
```

## Where does "data.txt" come from?

The script works. Now use it the way someone else would: from a different folder. In the terminal, go up one level and run the same file:

```powershell
cd ..
.\text-analysis\.venv\Scripts\python .\text-analysis\count.py
```

```predict
question: Run from the Documents folder instead of text-analysis, what does count.py do?
choice: Prints the same three lines as before
choice: Crashes with FileNotFoundError for data.txt
choice: Prints Characters: 0, Words: 0, Lines: 0
answer: Crashes with FileNotFoundError for data.txt
explain: A relative path such as "data.txt" is looked up in the **current working directory**: the folder the program was started from, which is wherever the terminal was. It is not the folder the script lives in. Started from Documents, Python looks for Documents\data.txt, which doesn't exist, and `open` raises `FileNotFoundError: [Errno 2] No such file or directory: 'data.txt'`.

The script only works when it's started from one particular folder. That's a hidden assumption, and hidden assumptions are what make "it works on my machine" software.
```

Go back into the project before continuing:

```powershell
cd text-analysis
```

## What this script can't do

`count.py` works once, for one person, in one folder, on one file. List what would have to change for anything more:

- **The file name is written into the code.** To count a different file, you edit the program. A tool should take the file as an input: `python -m textstats report.txt`.
- **It can't be tested without a file.** The counting is mixed up with reading `data.txt` and printing. To check that word counting handles `"times,"` correctly, you'd need to create a file and read the printed output. Code that takes a string and returns a number can be checked with one line.
- **It can't be reused.** If another program wanted the word count, `import count` would *run the whole script*: open `data.txt` and print three lines as a side effect. You'll see exactly why in the next lesson.
- **Its idea of a word is wrong.** `"times,"` and `"times"`, `"It"` and `"it"` count as different words. That doesn't change the total, but it ruins the next obvious feature: the most common words.
- **It fails badly.** A missing file produces a traceback meant for programmers, not a message meant for the person using the tool.

Each item is a reason for something you'll learn in this chapter: functions with inputs and outputs, tests, modules and imports, packages, command-line arguments, exceptions and type hints. None of it is introduced because "professionals do it"; each fixes one of the problems above.

The same problems turn up in machine-learning code all the time. A training script that only runs from one folder, can't be tested without a 2 GB dataset, and can't be imported by the web app that needs its predictions is the ML version of `count.py`. This chapter is the habit that prevents it.

Next lesson: the counting moves into functions you can test.
