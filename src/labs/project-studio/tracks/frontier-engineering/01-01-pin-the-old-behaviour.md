---
title: 1.1 — Pin the Old Behaviour
track: Frontier — From Script to Software
trackOrder: 15.01
runtime: python
support: data/sample.txt, tools/check_test_catches.py, tests/conftest.py
---

Most code you'll ever change was written by someone else, in a hurry, and it works. Nobody wants to touch it, because nobody is sure what it does. This chapter hands you such a script: about seventy lines that count the words and letters in a text file and print a report. Over five lessons you turn it into a small piece of software, with named functions, a module in your package, a data type, proper errors and a real command line. **The report it prints must not change by a single character.**

The script isn't throwaway. Counting words and letters is where language modelling starts: in Chapter 26 you count characters exactly this way to build your first model of text.

This lesson changes nothing in the script. It sets up the two things that make changing it safe: **Git**, so any version can come back, and a **test** that notices if the report changes.

## The script you inherited

Click **Create provided textstats.py** below. It also creates the text it reads, `data/sample.txt`, and two files you'll use later in this lesson.

```python file=textstats.py provided
# textstats.py - word stats for a text file
# usage: python textstats.py file.txt
import sys

counts = {}
letters = {}
total = 0


def go(fname):
    global total
    try:
        f = open(fname)
        data = f.read()
        f.close()
    except:
        print("couldn't read " + fname)
        sys.exit()
    lines = data.split("\n")
    nlines = 0
    for l in lines:
        if l.strip() != "":
            nlines = nlines + 1
    for l in lines:
        for w in l.split():
            w = w.strip(".,;:!?\"()'").lower()
            if w == "":
                continue
            total = total + 1
            if w in counts:
                counts[w] = counts[w] + 1
            else:
                counts[w] = 1
    for l in lines:
        for c in l:
            c = c.lower()
            if not c.isalpha():
                continue
            if c in letters:
                letters[c] = letters[c] + 1
            else:
                letters[c] = 1
    print("lines: " + str(nlines))
    print("words: " + str(total))
    print("unique words: " + str(len(counts)))
    longest = ""
    for w in counts:
        if len(w) > len(longest):
            longest = w
    print("longest word: " + longest)
    s = 0
    for w in counts:
        s = s + len(w) * counts[w]
    print("average word length: " + str(round(s / total, 2)))
    print()
    print("top words:")
    top = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    for i in range(10):
        if i < len(top):
            print("  " + top[i][0] + " " + str(top[i][1]))
    print()
    print("top letters:")
    top = sorted(letters.items(), key=lambda x: x[1], reverse=True)
    for i in range(5):
        if i < len(top):
            print("  " + top[i][0] + " " + str(top[i][1]))


if len(sys.argv) < 2:
    print("usage: python textstats.py file.txt")
else:
    go(sys.argv[1])
```

Run it:

```powershell
.venv\Scripts\python textstats.py data/sample.txt
```

```text
lines: 9
words: 100
unique words: 60
longest word: sentences
average word length: 4.34

top words:
  the 9
  word 6
  a 4
  counts 4
  they 4
  text 3
  and 3
  that 3
  at 2
  time 2

top letters:
  e 63
  t 62
  a 34
  h 30
  o 28
```

It works. Now read it as the person who has to change it. Here's what's wrong, roughly in order of how much it will hurt:

- **One function does everything.** `go` reads the file, counts lines, counts words, counts letters, works out four statistics and prints two tables: about fifty lines. You can't test the word counting without also reading a file and printing a report, and you can't reuse it anywhere.
- **Global variables.** `counts`, `letters` and `total` live outside `go`, and `go` adds to them. So the result of calling `go` depends on whether it was called before. More on this below.
- **Copy and paste.** The word-counting loop and the letter-counting loop are the same pattern twice. So are the two "top" tables. A fix made in one copy is easy to forget in the other.
- **Magic numbers.** Why 10 words and 5 letters? Nothing says, and to change either you have to find it first.
- **A bare `except:`.** It catches *every* error, including ones that have nothing to do with the file, and replaces each with the same message. Then `sys.exit()` stops the program **with the exit code for success**, so a script that called this one would think everything went fine.
- **Names that say nothing.** `go`, `l`, `w`, `c`, `s`, `f`.

None of this is unusual. Scripts get like this because each change was the quickest one at the time. Each smell above is fixed in one of the next four lessons.

The globals deserve a closer look:

```predict
question: In one Python session, `go("data/sample.txt")` is called twice. What does the second call print as `words:`?
choice: 100
choice: 200
choice: It crashes
answer: 200
explain: `total` and `counts` are created once, when the script is first imported, and `go` only ever adds to them. The second call starts from where the first one stopped, so every count is doubled. The bug can't show up from the command line, where each run is a fresh Python, which is exactly why it survives. It would show up the day someone imports `go` to count two files.
verify: script calls_twice.py
```

```check
run ".venv/Scripts/python textstats.py data/sample.txt" stdout="top letters:" label="textstats.py prints its report" -- Click "Create provided textstats.py" above, then run .venv\Scripts\python textstats.py data/sample.txt.
file data/sample.txt -- Click "Create provided textstats.py" above; it creates this file too.
```

## A save point, with Git

Before changing anything, make it possible to get back to this exact version.

**Git** is a version control system: it keeps every saved version of a folder, shows exactly what changed between any two, and can bring any of them back. Almost every software team uses it. A folder Git manages is a **repository**, and each saved version is a **commit**, a snapshot of every file, with a message saying what it is.

Check that Git is installed:

```powershell
git --version
```

If PowerShell doesn't recognise `git`, install **Git for Windows** from [git-scm.com](https://git-scm.com/download/win) with its default options, then close and reopen this window so the terminal sees it.

Every commit records who made it. If you've never used Git on this computer, tell it your name and email once (`--global` saves them for every repository you make):

```powershell
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

Now make the project folder a repository and look at it:

```powershell
git init -b main
git status
```

`git init` creates a hidden `.git` folder, where Git keeps every version. `-b main` names the first **branch** (a line of history) `main`. Lesson 1.2 explains branches.

`git status` lists your files as **untracked**: Git sees them but isn't keeping them yet. Notice what's *not* in the list: `.venv`, `__pycache__`, `.pytest_cache` and `src/frontier.egg-info`. That's the `.gitignore` from lessons 0.1 and 0.2 at work. A repository holds the files you write, not the ones a command can rebuild.

Saving a version takes two commands:

```powershell
git add .
git commit -m "Add textstats.py as it was given to me"
```

- `git add .` puts every changed file in the folder (`.`) into the **staging area**: the list of changes that will go into the next commit. Staging lets you commit some changes and keep others for later. Here you want them all.
- `git commit -m "..."` makes the commit from what's staged. The message says what the commit is, so you can find it later. Write it as what the change does.

See the history:

```powershell
git log --oneline
```

Each line is a commit: a short **hash** (an ID made from the commit's contents, different on every machine) and its message.

```check
git-config user.name -- Run git config --global user.name "Your Name", with your own name.
git-config user.email -- Run git config --global user.email "you@example.com", with your own email.
git-repo -- Run git init -b main in the project folder.
git-tracked textstats.py -- Run git add . and then git commit -m "Add textstats.py as it was given to me".
git-tracked data/sample.txt -- Run git add . and then git commit -m "Add textstats.py as it was given to me".
git-untracked .venv/pyvenv.cfg -- The environment shouldn't be in a commit. Check that .gitignore has the line .venv/
```

## Save what it prints today

The plan is to change the code and keep the report. To know the report hasn't changed, you need a copy of today's report to compare with. Save it with Python, from a small tool script. Create `tools/save_golden.py`:

```python file=tools/save_golden.py
"""Run textstats.py on the sample text and save what it prints."""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

result = subprocess.run(
    [sys.executable, "textstats.py", "data/sample.txt"],
    cwd=ROOT, capture_output=True, text=True, check=True,
)
golden = ROOT / "tests" / "golden"
golden.mkdir(exist_ok=True)
(golden / "sample.txt").write_text(result.stdout, encoding="utf-8")
print(result.stdout)
```

- **`subprocess.run`** runs another program and waits for it to finish. The program and its arguments go in a list. `sys.executable` is the path of the Python running this file, the project's `.venv` Python, so the script runs with the same environment.
- **`cwd=ROOT`** runs it in the project folder, whatever folder you start this tool from. `capture_output=True` collects what it prints instead of showing it, `text=True` gives that back as a string rather than bytes, and `check=True` raises an error if the program fails.
- **`Path`** (from `pathlib`) is a file path as an object. `Path(__file__)` is this file, `.resolve()` makes it absolute, and each `.parent` goes up one folder: `tools/save_golden.py` → `tools` → the project. The `/` operator joins paths. `mkdir(exist_ok=True)` creates the folder unless it's already there. `write_text` writes a string to the file, and `encoding="utf-8"` says how to turn text into bytes, the same way on every computer.

Why not `textstats.py > tests/golden/sample.txt` in PowerShell? Depending on the PowerShell version, `>` writes UTF-16, an encoding twice the size that most tools read as garbage. Python writes exactly what you tell it to.

Run it:

```powershell
.venv\Scripts\python tools/save_golden.py
```

A saved copy of correct output is often called a **golden file**: the answer everything is compared against.

```check
file tests/golden/sample.txt -- Run .venv\Scripts\python tools/save_golden.py
contains tests/golden/sample.txt "top letters:" label="the golden file holds the whole report" -- Run .venv\Scripts\python tools/save_golden.py again.
```

## Your turn: a test that pins the report

**Build, on your own:** `tests/test_legacy_output.py`, with one test, `test_sample_report_unchanged`. It runs `textstats.py` on `data/sample.txt`, the way `save_golden.py` does, and asserts that what it prints is **exactly** the text in `tests/golden/sample.txt`.

A test like this is called a **characterisation test**. It doesn't say the output is right: it says the output is *what it was*. That's all a refactor needs. Whatever you change in the next lessons, if this test still passes, a user of the script sees no difference.

Run it:

```powershell
.venv\Scripts\python -m pytest -q tests/test_legacy_output.py
```

Then commit the test and the golden file, with a message of your own. **Check my work** also runs your test once against a copy of the script whose report says `line count:` instead of `lines:` (that's `tools/check_test_catches.py`), and puts the script back afterwards. A test that passes whatever the script prints isn't a safety net.

```hints
nudge: Start from `save_golden.py`: the test needs the same `subprocess.run` call. Then, instead of writing the golden file, read it, and compare.
concept: `Path.read_text(encoding="utf-8")` reads a file into a string. `result.stdout` is what the script printed. `assert a == b` fails the test if they differ, and pytest shows where.
answer: Create `tests/test_legacy_output.py`:
~~~python
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def test_sample_report_unchanged():
    result = subprocess.run(
        [sys.executable, "textstats.py", "data/sample.txt"],
        cwd=ROOT, capture_output=True, text=True, check=True,
    )
    expected = (ROOT / "tests" / "golden" / "sample.txt").read_text(encoding="utf-8")
    assert result.stdout == expected
~~~
Then commit it: `git add .` and `git commit -m "Pin the report with a characterisation test"`.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_legacy_output.py" label="your test passes on the untouched script" -- Run textstats.py as save_golden.py does, read tests/golden/sample.txt, and assert the two are equal.
run ".venv/Scripts/python tools/check_test_catches.py" label="your test fails when the report changes" -- Compare result.stdout with the whole golden file, not just whether the script ran.
git-tracked tests/test_legacy_output.py -- Commit it: git add . then git commit -m "your message".
git-tracked tests/golden/sample.txt -- Commit it: git add . then git commit -m "your message".
```

## Watch it catch a change

You've never seen your test fail, so you only have the checker's word that it can. See for yourself. In `textstats.py`, change the `2` in `round(s / total, 2)` to `1`, then run the test:

```powershell
.venv\Scripts\python -m pytest -q tests/test_legacy_output.py
```

It fails, and pytest shows the two texts side by side, with the line that differs: `4.34` against `4.3`. Now ask Git what you changed:

```powershell
git diff
```

`git diff` compares your files with the last commit: lines starting with `-` were removed and lines starting with `+` were added. One character changed, and Git found it in a seventy-line file. Put the file back as it was in the last commit:

```powershell
git restore textstats.py
```

Run the test again: it passes. Those three commands are how the rest of this chapter goes. Change something, run the test, and when it fails, look at `git diff` and either fix it or `git restore`.

```check
run ".venv/Scripts/python -m pytest -q tests/test_legacy_output.py" label="the test passes again" -- Put textstats.py back with git restore textstats.py
git-clean -- Something isn't committed yet. Run git status to see what, then commit it or put it back with git restore.
```

### What you have

```text
frontier/
  textstats.py            the script, exactly as it was given to you
  data/sample.txt         the text it reads
  tools/
    save_golden.py        saves today's report
    check_test_catches.py
  tests/
    golden/sample.txt     today's report
    test_legacy_output.py the characterisation test
  .git/                   every version, starting now
```

Next lesson: the fifty-line function becomes small functions with names, on a Git branch of its own.
