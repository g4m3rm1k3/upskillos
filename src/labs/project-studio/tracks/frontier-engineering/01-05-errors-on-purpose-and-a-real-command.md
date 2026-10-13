---
title: 1.5 — Errors on Purpose, and a Real Command
runtime: python
support: tests/conftest.py
---

The script has one piece of hacked-together code left, and it's the most dangerous: a bare `except:` that catches **everything**, prints "couldn't read", and stops. A missing file, a file the script isn't allowed to open and a typo in the code itself all end in the same message, so the message tells you nothing. And an empty file isn't handled at all: it crashes somewhere deep inside the counting.

This lesson decides what should happen when things go wrong, on purpose, and writes it down in tests. The script becomes a real command, `frontier-textstats`, with options and a help page, installed like `frontier-info`. Then the old script is retired, and the project goes up on GitHub.

This is the first lesson that **changes behaviour**. On the sample text the report stays exactly the same, and the characterisation test keeps checking that. But on bad input the program now behaves differently, and better, because you decided how it should.

## A branch for the command

```powershell
git switch -c command
```

```check
git-branch command -- Run git switch -c command
```

## Read the tests first

**This step: create the supplied file and read it. No code yet.**

Click **Create provided tests/test_cli.py**:

```python file=tests/test_cli.py provided
# Tests for the frontier-textstats command (lesson 1.5). Most run the command as a separate
# program, the way a user would, and look at what it printed, where, and how it exited.
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent


def run(arguments):
    """Run the command with these arguments, from the project folder."""
    command = [sys.executable, "-m", "frontier.textstats_cli"] + arguments
    return subprocess.run(command, cwd=ROOT, capture_output=True, text=True)


def test_empty_text_raises_a_value_error():
    from frontier.text import analyse
    with pytest.raises(ValueError, match="no words to count"):
        analyse("")


def test_prints_the_report():
    result = run(["data/sample.txt"])
    assert result.returncode == 0
    assert result.stdout == (ROOT / "tests" / "golden" / "sample.txt").read_text(encoding="utf-8")


def test_options_choose_how_many():
    lines = run(["data/sample.txt", "--top", "3", "--letters", "1"]).stdout.split("\n")
    words = lines.index("top words:")
    assert lines[words + 1:words + 5] == ["  the 9", "  word 6", "  a 4", ""]
    letters = lines.index("top letters:")
    assert lines[letters + 1:] == ["  e 63", ""]


def test_missing_file_exits_1_with_a_message_on_stderr():
    result = run(["no-such-file.txt"])
    assert result.returncode == 1
    assert result.stdout == ""
    assert result.stderr.startswith("textstats: can't read no-such-file.txt: ")


def test_blank_file_exits_1(tmp_path):
    blank = tmp_path / "blank.txt"
    blank.write_text("\n\n", encoding="utf-8")
    result = run([str(blank)])
    assert result.returncode == 1
    assert "no words to count" in result.stderr


def test_usage_error_exits_2():
    result = run([])
    assert result.returncode == 2
    assert "usage: frontier-textstats" in result.stderr
```

Most of these tests run the command the way lesson 1.1's test ran the script, through `subprocess.run`, and three things come back that the earlier tests never looked at:

- **`result.returncode`**, the **exit code**. Every program ends by handing the operating system a number: `0` means it worked, anything else means it didn't. Scripts, test runners and build servers decide what to do next from that number alone, without reading any text. `textstats.py` exits with `0` even when it can't read the file, which is a lie.
- **`result.stdout`** and **`result.stderr`**. A program has two output streams. **stdout** (standard output) is for its results. **stderr** (standard error) is for messages about what went wrong. Both appear in the terminal, but they're kept apart, so a user who saves the results to a file doesn't get error messages mixed into them.
- **`-m frontier.textstats_cli`** runs a module of your package as a program, the way `python -m venv` and `python -m pytest` run theirs. The module doesn't exist yet: you'll write it in this lesson.

Two pytest features appear too. **`pytest.raises(ValueError, match="...")`** is a `with` block that passes only if the code inside it raises that kind of error, with that message. **`tmp_path`** is a fixture, like `capsys` in lesson 1.4: a fresh, empty folder for that one test, so it can write a blank file without leaving it lying around. `lines.index("top words:")` finds the position of that line in the list, and the slices after it pick out the lines of each table.

So the tests decide, before any code is written:

- an empty text is an error (a `ValueError` saying "no words to count"), not a crash;
- a missing file prints `textstats: can't read <path>: <reason>` to **stderr** and exits with **1**;
- running the command wrong (no file named) exits with **2**.

```check
file tests/test_cli.py -- Click "Create provided tests/test_cli.py" above.
```

## An empty text is an error

What does `analyse` do today with a text that has no words in it? Read it through before you answer: `split_words` returns an empty list, `tally` an empty dictionary, and then the `TextStats(...)` call starts working out its fields in order.

```predict
question: What does `analyse("")` do, as `analyse` is now?
choice: ZeroDivisionError
choice: ValueError
choice: It returns a TextStats full of zeros
answer: ValueError
explain: The fields are worked out in the order they're written. `lines` and `words` are fine (both 0). Then `longest_word=max(counts, key=len)` asks for the largest item of an empty dictionary, and `max` raises a `ValueError`, before the division that would have raised `ZeroDivisionError` is ever reached. So the error is the right kind, by accident, with a message about `max` that means nothing to whoever called `analyse`.
verify: script empty_text.py
```

An **exception** is how a Python function says "I can't do what you asked". When something **raises** one, the function stops at once, and so does each function that called it, until some code catches it with `try`/`except`, or the program ends and prints it. The type says what kind of problem it is. **`ValueError`** means "the argument has the right type but a value I can't work with": exactly the case of a string with no words in it.

So raise it on purpose, at the start, with a message that names the real problem. In `analyse` in `src/frontier/text.py`, add two lines straight after the one that splits the words:

```python file=src/frontier/text.py
"""Counting words and letters in text."""
from collections.abc import Iterable
from dataclasses import dataclass

PUNCTUATION = ".,;:!?\"()'"


def count_lines(text: str) -> int:
    """How many lines have something on them."""
    return sum(1 for line in text.split("\n") if line.strip())


def split_words(text: str) -> list[str]:
    """The words in text: lower case, without punctuation at either end."""
    words = []
    for word in text.split():
        word = word.strip(PUNCTUATION).lower()
        if word:
            words.append(word)
    return words


def letters(text: str) -> list[str]:
    """Every letter in text, lower case, in order."""
    return [c for c in text.lower() if c.isalpha()]


def tally(items: Iterable[str]) -> dict[str, int]:
    """How many times each item appears, in order of first appearance."""
    counts: dict[str, int] = {}
    for item in items:
        counts[item] = counts.get(item, 0) + 1
    return counts


def top(counts: dict[str, int], n: int) -> list[tuple[str, int]]:
    """The n most common items, as (item, count) pairs, most common first."""
    return sorted(counts.items(), key=lambda pair: pair[1], reverse=True)[:n]


@dataclass
class TextStats:
    """Everything the report shows about a text."""

    lines: int
    words: int
    unique_words: int
    longest_word: str
    average_word_length: float
    top_words: list[tuple[str, int]]
    top_letters: list[tuple[str, int]]


def analyse(text: str, top_words: int = 10, top_letters: int = 5) -> TextStats:
    """Count everything the report shows. Prints nothing."""
    words = split_words(text)
    if not words:
        raise ValueError("no words to count")
    counts = tally(words)
    return TextStats(
        lines=count_lines(text),
        words=len(words),
        unique_words=len(counts),
        longest_word=max(counts, key=len),
        average_word_length=sum(len(word) for word in words) / len(words),
        top_words=top(counts, top_words),
        top_letters=top(tally(letters(text)), top_letters),
    )
```

`not words` is true when the list is empty (lesson 1.2's truthiness: an empty list counts as false). `raise ValueError("no words to count")` makes a `ValueError` holding that message and raises it. Nothing after it in `analyse` runs, so `max` and the division never see an empty text. A function that checks its input first and fails with a clear message is said to **fail fast**: the error points at the cause, not at some line further on where the bad value finally broke something.

```check
run ".venv/Scripts/python -m pytest -q tests/test_cli.py -k empty" label="analyse('') raises ValueError: no words to count" -- Right after words = split_words(text): if not words: raise ValueError("no words to count")
run ".venv/Scripts/python -m mypy --strict src/frontier/text.py" stdout="Success" label="mypy --strict still passes"
```

## A real command with argparse

A command has to read its **arguments**, the words typed after its name. `sys.argv` holds them, but working out which word is the file, which is an option, what the option's number is, and what to say when something's missing takes a lot of fiddly code. The standard library's **`argparse`** does it for you: you describe the arguments, and it reads them, converts them, writes a help page, and reports mistakes.

Create `src/frontier/textstats_cli.py`. Copy `format_report` into it from `textstats.py` (as in lesson 1.3, the old copy stays until the old script is retired):

```python file=src/frontier/textstats_cli.py
"""The frontier-textstats command: word and letter statistics for a text file."""
import argparse

from frontier.text import TextStats, analyse


def format_report(stats: TextStats) -> str:
    lines = [
        "lines: " + str(stats.lines),
        "words: " + str(stats.words),
        "unique words: " + str(stats.unique_words),
        "longest word: " + stats.longest_word,
        "average word length: " + str(round(stats.average_word_length, 2)),
        "",
        "top words:",
    ]
    for word, count in stats.top_words:
        lines.append("  " + word + " " + str(count))
    lines.append("")
    lines.append("top letters:")
    for letter, count in stats.top_letters:
        lines.append("  " + letter + " " + str(count))
    return "\n".join(lines)


def parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog="frontier-textstats", description="Word and letter statistics for a text file.")
    parser.add_argument("path", help="the text file to read")
    parser.add_argument("--top", type=int, default=10, help="how many of the most common words to list")
    parser.add_argument("--letters", type=int, default=5, help="how many of the most common letters to list")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)
    with open(args.path, encoding="utf-8") as f:
        text = f.read()
    print(format_report(analyse(text, args.top, args.letters)))


if __name__ == "__main__":
    main()
```

- **`argparse.ArgumentParser(prog=..., description=...)`** makes a parser: `prog` is the command's name as the help page shows it, `description` the sentence under it.
- **`add_argument("path", ...)`**: a name without dashes is a **positional** argument, required, in that position. A name starting with `--` is an **option**: it may be left out, and then it's `default`. **`type=int`** turns the typed text `"3"` into the number `3`, and reports an error for `"three"`. Each `help` text goes on the help page.
- **`parse_args(argv)`** reads the arguments and returns an **`argparse.Namespace`**, an object with one attribute per argument: `args.path`, `args.top`, `args.letters`. Given `None`, it reads the real command line, `sys.argv[1:]`. Given a list, it reads that list instead, which lets a test call `main(["data/sample.txt", "--top", "3"])` without starting a new program.
- **`list[str] | None`** is a type hint for "a list of strings, or `None`": the `|` between two types means either one. `main`'s `argv` defaults to `None`, so a plain `main()` reads the real command line.
- **`encoding="utf-8"`**. Without it, `open` uses the operating system's default encoding, and on Windows that isn't UTF-8: a text file written on another computer, with an `é` or a curly quote in it, would come out garbled or not read at all. The sample is plain English, so its report doesn't change.

Try it, and its help page, which `argparse` wrote from your descriptions:

```powershell
.venv\Scripts\python -m frontier.textstats_cli data/sample.txt --top 3
.venv\Scripts\python -m frontier.textstats_cli --help
```

Now run it wrong, with no file named:

```predict
question: `.venv\Scripts\python -m frontier.textstats_cli` (no arguments): what exit code does it end with?
choice: 0
choice: 1
choice: 2
answer: 2
explain: `argparse` sees the required `path` is missing, prints a usage line and the error to stderr, and exits with code 2. By a long Unix tradition, 2 means "you used the command wrong", 1 means "it tried and failed", and 0 means success. `test_usage_error_exits_2` checks exactly this, and you got it without writing a line of error handling.
verify: script usage_exit.py
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_cli.py -k prints" label="the command prints the same report as the script" -- main reads args.path with encoding="utf-8" and prints format_report(analyse(text, args.top, args.letters)).
run ".venv/Scripts/python -m pytest -q tests/test_cli.py -k options" label="--top and --letters choose how many lines each table has" -- Add the --top and --letters options with type=int, and pass args.top and args.letters to analyse.
run ".venv/Scripts/python -m pytest -q tests/test_cli.py -k usage" label="no file named: exit code 2 and a usage message"
run ".venv/Scripts/python -m mypy --strict src/frontier/text.py src/frontier/textstats_cli.py" stdout="Success" label="mypy --strict passes on text.py and textstats_cli.py" -- Read mypy's first error: it names the line and what it expected.
```

## Errors that say what went wrong

Run the command on a file that doesn't exist, and Python prints a long **traceback** (the list of every function that was running when the error happened) ending in `FileNotFoundError`. That's useful when the bug is in your code, but here the code is fine: the user typed the wrong name. They need one line saying so, on stderr, and an exit code of 1.

Catch exactly the errors you expect, and no others. `open` raises **`OSError`** (or one of its more specific kinds, such as `FileNotFoundError` and `PermissionError`) when the operating system can't open the file, and `analyse` now raises `ValueError` for a text with no words. Change `main` to catch them, and import `sys`, which it now uses, under `import argparse`:

```python file=src/frontier/textstats_cli.py
"""The frontier-textstats command: word and letter statistics for a text file."""
import argparse
import sys

from frontier.text import TextStats, analyse


def format_report(stats: TextStats) -> str:
    lines = [
        "lines: " + str(stats.lines),
        "words: " + str(stats.words),
        "unique words: " + str(stats.unique_words),
        "longest word: " + stats.longest_word,
        "average word length: " + str(round(stats.average_word_length, 2)),
        "",
        "top words:",
    ]
    for word, count in stats.top_words:
        lines.append("  " + word + " " + str(count))
    lines.append("")
    lines.append("top letters:")
    for letter, count in stats.top_letters:
        lines.append("  " + letter + " " + str(count))
    return "\n".join(lines)


def parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog="frontier-textstats", description="Word and letter statistics for a text file.")
    parser.add_argument("path", help="the text file to read")
    parser.add_argument("--top", type=int, default=10, help="how many of the most common words to list")
    parser.add_argument("--letters", type=int, default=5, help="how many of the most common letters to list")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)
    try:
        with open(args.path, encoding="utf-8") as f:
            text = f.read()
    except OSError as error:
        print(f"textstats: can't read {args.path}: {error.strerror}", file=sys.stderr)
        sys.exit(1)
    try:
        stats = analyse(text, args.top, args.letters)
    except ValueError as error:
        print(f"textstats: {args.path}: {error}", file=sys.stderr)
        sys.exit(1)
    print(format_report(stats))


if __name__ == "__main__":
    main()
```

- **`try:` … `except OSError as error:`** runs the indented block; if it raises an `OSError` (or one of its kinds), Python jumps to the `except` block, with the exception named `error`. Any **other** exception carries on up as before. That's the difference from the bare `except:`, which also caught `NameError` from a typo, and even `KeyboardInterrupt` from pressing Ctrl+C.
- **`error.strerror`** is the operating system's own reason, such as `No such file or directory`. `str(error)` of a `ValueError` is its message, which is what `{error}` puts into the f-string.
- **`print(..., file=sys.stderr)`** writes to stderr instead of stdout.
- **`sys.exit(1)`** ends the program with exit code 1. (The old script's `sys.exit()`, with no number, exits with 0: success.)

Then, if you redirect the output to a file, the error still reaches you:

```predict
question: `.venv\Scripts\python -m frontier.textstats_cli no-such-file.txt > out.txt` saves stdout in `out.txt`. What does `out.txt` contain?
choice: nothing
choice: the error message
answer: nothing
explain: `>` redirects stdout only. The message went to stderr, so it appears in the terminal and `out.txt` is empty. If the program had printed the message to stdout, it would be hidden in the file, and anything reading `out.txt` as a report would read an error message instead.
verify: script stderr_redirect.py
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_cli.py -k missing" label="a missing file: exit code 1, one line on stderr, nothing on stdout" -- Catch OSError around the with block, print the message with file=sys.stderr, then sys.exit(1).
run ".venv/Scripts/python -m pytest -q tests/test_cli.py -k blank" label="a file with no words: exit code 1, and says why" -- Catch ValueError around the analyse call, and print the error on stderr.
run ".venv/Scripts/python -m mypy --strict src/frontier/text.py src/frontier/textstats_cli.py" stdout="Success" label="mypy --strict still passes" -- Did you add import sys?
```

## A command of its own

Lesson 0.2 turned `main` in `frontier.info` into the command `frontier-info`. Do the same here: add a second line to the `[project.scripts]` section of `pyproject.toml`:

```toml
frontier-textstats = "frontier.textstats_cli:main"
```

pip only creates commands when it installs, so install again:

```powershell
.venv\Scripts\python -m pip install -e .
.venv\Scripts\frontier-textstats data/sample.txt
```

The command calls `main()` with no arguments, so `argv` is `None` and `argparse` reads what you typed after `frontier-textstats`.

```check
run ".venv/Scripts/frontier-textstats data/sample.txt" stdout="lines: 9" label="frontier-textstats is a command" -- Add frontier-textstats = "frontier.textstats_cli:main" under [project.scripts] in pyproject.toml, then install again with .venv\Scripts\python -m pip install -e .
```

## Your turn: retire the old script

**Build, on your own:** a project with no `textstats.py`, where everything uses the command instead:

1. `tests/test_legacy_output.py` runs the module instead of the script: `[sys.executable, "-m", "frontier.textstats_cli", "data/sample.txt"]` in place of `[sys.executable, "textstats.py", "data/sample.txt"]`. It still compares with the same golden file, which is the proof the command prints exactly what the script did.
2. `tools/save_golden.py` runs the module too, the same way.
3. `tests/test_stats.py` imports `format_report` from `frontier.textstats_cli`.
4. Delete `textstats.py`, and `tools/check_test_catches.py` (it existed only for lesson 1.1's check, and it edits the old script). **`git rm <file>`** deletes a file and stages the deletion for the next commit in one go: `git rm textstats.py tools/check_test_catches.py`.

Then run every test:

```powershell
.venv\Scripts\python -m pytest -q
```

```hints
nudge: Three files mention the old script: find them with Ctrl+Shift+F (search the whole project) for `textstats.py` and `from textstats`. Change those, then delete the two files with one `git rm`.
concept: `"-m", "frontier.textstats_cli"` as two separate items in the list is how `subprocess.run` passes `-m frontier.textstats_cli`: each word of the command line is one item. The golden file doesn't change, because the output doesn't.
answer: In `tests/test_legacy_output.py` and in `tools/save_golden.py`, the list becomes:
~~~python
        [sys.executable, "-m", "frontier.textstats_cli", "data/sample.txt"],
~~~
In `tests/test_stats.py`:
~~~python
    from frontier.textstats_cli import format_report
~~~
Then: `git rm textstats.py tools/check_test_catches.py`, and `.venv\Scripts\python -m pytest -q`.
```

```check
missing textstats.py label="the old script is gone" -- git rm textstats.py
lacks tests/test_legacy_output.py "textstats.py" label="the characterisation test runs the command" -- Use [sys.executable, "-m", "frontier.textstats_cli", "data/sample.txt"].
contains tools/save_golden.py "frontier.textstats_cli" label="save_golden.py runs the command" -- Use the same list as the characterisation test.
run ".venv/Scripts/python -m pytest -q" label="every test passes" -- Read the first failure: an ImportError means a file still imports textstats.
```

## Bring it into `main`, and onto GitHub

Merge as usual:

```powershell
git add .
git commit -m "Turn the script into the frontier-textstats command"
git switch main
git merge command
git branch -d command
```

Your repository has only ever lived in this folder. **GitHub** keeps a copy online: a backup, a way to work from another computer, and where other people can see your work. Every chapter from here on adds to it, and by the end it's your portfolio.

1. Sign in at [github.com](https://github.com) (make an account if you don't have one), click **New repository**, name it `frontier`, and create it **empty**: no README, no `.gitignore`, no licence, because your repository already has its own history.
2. GitHub shows the repository's address, like `https://github.com/<you>/frontier.git`. Tell your repository about it:

   ```powershell
   git remote add origin https://github.com/<you>/frontier.git
   ```

   A **remote** is another copy of the repository that yours can send commits to and fetch them from. `origin` is the usual name for the main one.
3. Send `main` to it:

   ```powershell
   git push -u origin main
   ```

   The first push opens a window to sign in to GitHub. `-u` remembers that your `main` goes to `origin`'s `main`, so from now on a plain `git push` is enough.

Refresh the page on GitHub: your files and every commit since lesson 1.1 are there.

```check
git-branch main -- Run git switch main
git-no-branch command -- Merge it first (git merge command), then delete it: git branch -d command
git-clean -- Something isn't committed yet. Run git status to see what.
git-remote origin -- Run git remote add origin with your repository's address.
git-pushed -- Run git push -u origin main
```

### What you have

```text
src/frontier/
  text.py              analyse raises ValueError for a text with no words
  textstats_cli.py     format_report, parse_args, main: the frontier-textstats command
tests/
  test_cli.py          the command: output, options, exit codes, stderr
  test_stats.py
  test_legacy_output.py  runs the command; the report is still the 1.1 report
pyproject.toml         two commands: frontier-info, frontier-textstats
```

Chapter 1 is done. The hacked-together script is now a tested, typed package with a real command, and its history is on GitHub. Chapter 2 starts on the computer science underneath: how fast code is, and why.
