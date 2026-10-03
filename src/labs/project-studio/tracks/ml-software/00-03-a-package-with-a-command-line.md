---
title: 0.3 — A Package With a Command Line
track: Python Becomes Software
runtime: none
concepts: packages, command-line
revisits: modules, testing
notebook: py-modules
problem: The tool still only reads data.txt, and its files sit loose in a folder. How does it become a command anyone can run on any file?
---

The goal for this lesson is one command:

```powershell
.venv\Scripts\python -m textstats data.txt --top 3
```

```text
Characters: 418
Words: 85
Lines: 8
Most common words:
  the        11
  it         10
  of         10
```

Any file, any number of common words, chosen when the program is run instead of written into it. Getting there takes two ideas: a **package** (a folder of modules that belong together, imported by one name) and **command-line arguments** (the words typed after the program's name).

## Why a package

Picture where this project is heading. The counting functions will soon be joined by a function that reads files safely, one that builds the report, one that reads command-line arguments, and later a configuration loader. Each is a module. Left loose in the project folder, they mix with `requirements.txt`, `data.txt`, the tests, and whatever comes next, and their names (`stats`, `cli`, `config`) are generic enough to clash with other people's modules.

A **package** is a folder of modules imported under one name: `textstats.stats`, `textstats.cli`. The folder is the boundary: everything inside is the tool; everything outside (data, tests, settings) is not.

> *Picture it as* a labelled cabinet of drawers. Each drawer is a module; the cabinet's label, `textstats`, is the one name anyone needs to know to find any drawer in it: `textstats.stats`, `textstats.cli`. **Where the picture stops working:** opening the cabinet runs code (its `__init__.py`, next step); a real cabinet doesn't do anything when you open it.

Make the folder and move `stats.py` into it:

```powershell
mkdir textstats
move stats.py textstats
```

(`move` is PowerShell's short name for `Move-Item`.) The file tree now shows `textstats\stats.py`.

Two things just broke, and you can see why from the last lesson: `count.py` and `tests/test_stats.py` both say `import stats`, and Python finds `stats.py` by searching the folders in `sys.path`. Neither the project folder nor the tests folder contains `stats.py` any more. You'll fix the tests in a moment; `count.py` will be replaced.

```check
file textstats/stats.py -- In the terminal: mkdir textstats, then move stats.py textstats
missing stats.py -- move stats.py into the textstats folder; don't copy it.
```

## Make it a package

Create `textstats/__init__.py`:

```python file=textstats/__init__.py
"""Text statistics: counts, words and the most common words in a text."""

__version__ = "0.1.0"
```

A folder containing `__init__.py` is a **regular package**. When anything imports `textstats`, Python runs this file, the same way importing `stats` ran `stats.py`, and the names it defines become attributes of the package: `textstats.__version__`.

The string on the first line is a **docstring**: a string as the first statement of a module (or function or class) becomes its documentation, which `help(textstats)` shows. `__version__` is a convention for recording a package's version; you'll bump it when the tool changes.

`import textstats.stats` then finds `stats.py` *inside* the package folder. Python only looks there, so a `stats.py` anywhere else can't be picked up by mistake.

```check
run ".venv/Scripts/python -c \"import textstats; print(textstats.__version__)\"" stdout="0.1.0" label="textstats imports and reports version 0.1.0" -- Create textstats/__init__.py (two underscores either side of init).
```

## Point the tests at the package

The tests still say `import stats`. Change that one line in `tests/test_stats.py`; everything below it stays as it was:

```python file=tests/test_stats.py
# Tests for stats.py. Run them all with:
#   .venv\Scripts\python -m pytest -q tests/test_stats.py
# or only the tests whose names contain a word, with -k:
#   .venv\Scripts\python -m pytest -q tests/test_stats.py -k lines
from textstats import stats

SAMPLE = "It was the best of times,\nit was the worst of times.\n"


def test_characters_include_spaces_and_line_breaks():
    assert stats.count_characters("abc") == 3
    assert stats.count_characters("a b\n") == 4
    assert stats.count_characters("") == 0
    assert stats.count_characters(SAMPLE) == 53


def test_lines_are_counted_by_line_breaks():
    assert stats.count_lines(SAMPLE) == 2
    assert stats.count_lines("") == 0
    assert stats.count_lines("no line break at the end") == 1
    assert stats.count_lines("a\n\nb\n") == 3, "an empty line in the middle is still a line"


def test_tokenize_lowercases_and_drops_punctuation():
    assert stats.words("It was the best of times,") == ["it", "was", "the", "best", "of", "times"]


def test_tokenize_keeps_apostrophes_inside_words():
    assert stats.words("Don't stop.") == ["don't", "stop"]
    assert stats.words("'Quoted'") == ["quoted"], "quote marks around a word are not part of it"


def test_tokenize_keeps_numbers_and_skips_pure_punctuation():
    assert stats.words("-- 42 --") == ["42"]
    assert stats.words("") == []


def test_word_count_uses_the_same_idea_of_a_word():
    assert stats.count_words(SAMPLE) == 12
    assert stats.count_words("one  two\tthree\nfour") == 4
    assert stats.count_words("-- hello --") == 1, "punctuation on its own is not a word"


def test_most_common_ranks_by_count():
    assert stats.most_common("b a b", 2) == [("b", 2), ("a", 1)]


def test_most_common_breaks_ties_alphabetically():
    assert stats.most_common("b a c b a", 3) == [("a", 2), ("b", 2), ("c", 1)]
    assert stats.most_common(SAMPLE, 3) == [("it", 2), ("of", 2), ("the", 2)]


def test_most_common_with_more_requested_than_exist():
    assert stats.most_common("x y", 10) == [("x", 1), ("y", 1)]
```

`from textstats import stats` imports the package (running `__init__.py`), then the module `textstats/stats.py`, and binds the name `stats` to it, so every `stats.something` in the tests works unchanged. That's why the tests only needed one line changed: they depend on the module's *functions*, not on where its file lives.

```check
run ".venv/Scripts/python -m pytest -q tests/test_stats.py" label="the stats tests pass against the package" -- The first code line of tests/test_stats.py should be: from textstats import stats
```

## Read the new tests

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_cli.py** above.

```python file=tests/test_cli.py provided
# Tests for textstats/cli.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_cli.py
import pytest

from textstats import cli

TEXT = "It was the best of times,\nit was the worst of times.\n"


def test_report_lists_the_counts():
    report = cli.build_report(TEXT, top=3)
    assert "Characters: 53" in report
    assert "Words: 12" in report
    assert "Lines: 2" in report


def test_report_lists_the_top_words_in_order():
    lines = cli.build_report(TEXT, top=3).splitlines()
    start = lines.index("Most common words:")
    assert [line.split() for line in lines[start + 1:]] == [["it", "2"], ["of", "2"], ["the", "2"]]


def test_report_top_controls_how_many_words():
    lines = cli.build_report(TEXT, top=1).splitlines()
    assert lines[-2] == "Most common words:"
    assert lines[-1].split() == ["it", "2"]


def test_main_reads_the_file_it_is_given(tmp_path, capsys):
    poem = tmp_path / "poem.txt"
    poem.write_text("one two two\n", encoding="utf-8")
    code = cli.main([str(poem)])
    out = capsys.readouterr().out
    assert code == 0, "main returns 0 when it succeeds"
    assert "Words: 3" in out
    assert out.splitlines()[-2].split() == ["two", "2"]


def test_main_lists_five_words_unless_told_otherwise(tmp_path, capsys):
    poem = tmp_path / "poem.txt"
    poem.write_text("a b c d e f g\n", encoding="utf-8")
    cli.main([str(poem)])
    lines = capsys.readouterr().out.splitlines()
    assert len(lines) - lines.index("Most common words:") - 1 == 5


def test_main_top_option(tmp_path, capsys):
    poem = tmp_path / "poem.txt"
    poem.write_text("a b b c c c\n", encoding="utf-8")
    cli.main([str(poem), "--top", "1"])
    assert capsys.readouterr().out.splitlines()[-1].split() == ["c", "3"]


def test_main_rejects_a_top_that_is_not_a_number(tmp_path, capsys):
    poem = tmp_path / "poem.txt"
    poem.write_text("a\n", encoding="utf-8")
    with pytest.raises(SystemExit) as stopped:
        cli.main([str(poem), "--top", "two"])
    assert stopped.value.code == 2, "exit code 2 is the convention for a bad command line"
    assert "invalid int value" in capsys.readouterr().err
```

New things in this file:

- **`tmp_path` and `capsys` as parameters.** pytest looks at each test function's parameter names and, for names it recognises, passes in a ready-made object. These are called **fixtures**: things a test needs set up before it runs, provided by the test runner. *Picture it as* a work holder already clamped on the machine when the operator arrives: the test only states what it needs by name, and it's there. `tmp_path` is a brand-new empty folder (a `pathlib.Path`) for this test alone, deleted later, so tests can write real files without touching your project. `capsys` captures everything printed, so `capsys.readouterr().out` is the text that went to the screen. Neither test needs `data.txt`: each makes the exact file it needs.
- **`pytest.raises(SystemExit)`**: the code inside the `with` block is *expected* to raise `SystemExit`. If it doesn't, the test fails. `stopped.value` is the exception that was raised.
- **`cli.main([str(poem)])`**: the tests call `main` with a list of strings, exactly the words a person would type after the program name. That one design decision is what makes a command line testable, as you'll see.

```check
file tests/test_cli.py -- Click "Create provided tests/test_cli.py" above.
```

## Build the report

Create `textstats/cli.py` with the part that turns a text into a report:

```python file=textstats/cli.py
from textstats import stats


def build_report(text, top=5):
    lines = [
        f"Characters: {stats.count_characters(text)}",
        f"Words: {stats.count_words(text)}",
        f"Lines: {stats.count_lines(text)}",
        "Most common words:",
    ]
    for word, count in stats.most_common(text, top):
        lines.append(f"  {word:<10} {count}")
    return "\n".join(lines)
```

`build_report` **returns** the report as one string instead of printing it. Collecting lines in a list and joining them with `"\n"` at the end is the usual way to build multi-line text: `"\n".join(["a", "b"])` is `"a\nb"`.

Why return instead of print? Look at the first three tests: they check the report with `in` and `splitlines()`, no capturing needed. Printing is a side effect; returning is a value. Values are easy to test and easy to reuse: a web page, later in this series, will want this report too, and a web page doesn't print.

`top=5` is a **default argument**: callers who don't pass `top` get 5.

```check
run ".venv/Scripts/python -m pytest -q tests/test_cli.py -k report" label="build_report lists the counts and the top words" -- Pass top on to stats.most_common(text, top).
```

## Arguments from the command line

> **Command-line arguments**: the words typed after a program's name when it's started. `data.txt` and `--top 3` in `python -m textstats data.txt --top 3`. A **positional argument** is identified by where it is (the first word is the file); an **option** is identified by a name starting with dashes (`--top`) and is usually optional.
>
> *Picture it as* a job ticket handed to a machine operator with the part: the same machine, a different job each time, depending on what's written on the ticket. Positional arguments are the fields that are always in the same box on the ticket; options are the extras someone writes in only when they need them.

When you type `python -m textstats data.txt --top 3`, the operating system hands Python a list of strings: the words after the program name. Python stores them in `sys.argv`. Make a throwaway file `show_args.py` containing `import sys` and `print(sys.argv)`, run `.venv\Scripts\python show_args.py data.txt --top 3`, and you'll see `['show_args.py', 'data.txt', '--top', '3']`: every word is a string, even the `3`. Delete the file afterwards. You *could* read that list yourself, but then you'd also have to write the error messages, the `--help` text, the conversion of `"3"` into the number 3, and the rules for options in any order. The standard library's `argparse` does all of that from a description of the arguments. Add `main` to `cli.py`:

```python file=textstats/cli.py
import argparse

from textstats import stats


def build_report(text, top=5):
    lines = [
        f"Characters: {stats.count_characters(text)}",
        f"Words: {stats.count_words(text)}",
        f"Lines: {stats.count_lines(text)}",
        "Most common words:",
    ]
    for word, count in stats.most_common(text, top):
        lines.append(f"  {word:<10} {count}")
    return "\n".join(lines)


def main(argv=None):
    parser = argparse.ArgumentParser(
        prog="textstats",
        description="Count characters, words and lines, and list the most common words.",
    )
    parser.add_argument("file", help="the text file to analyse")
    parser.add_argument("--top", type=int, default=5, help="how many common words to list (default: 5)")
    args = parser.parse_args(argv)

    with open(args.file) as f:
        text = f.read()
    print(build_report(text, args.top))
    return 0
```

What each part does:

- **`add_argument("file")`**: a name without dashes is a **positional** argument: required, and identified by position. `args.file` will hold whatever word was typed.
- **`add_argument("--top", type=int, default=5)`**: a name with dashes is an **option**: optional, identified by name. `type=int` makes argparse call `int("3")` on the text; if that fails, argparse prints an error and stops the program with exit code 2. `default=5` is used when `--top` isn't given.
- **`parse_args(argv)`**: reads the list and returns an object with one attribute per argument. When `argv` is `None`, argparse reads `sys.argv[1:]` itself.
- **`with open(args.file) as f:`**: opens the file and guarantees it's closed when the block ends, even if an error happens inside. `count.py` never closed its file; for one small file it didn't matter, but a program that opens thousands of files without closing them runs out of file handles (the operating system lets each program have only a limited number open at once).
- **`return 0`**: by convention a program reports success with exit code 0. The next section uses it.


> **`with` statement**: runs a block of code between a guaranteed setup and a guaranteed cleanup. For a file, the cleanup is closing it. Python runs it as if you'd written:
>
> ```python
> f = open(args.file)
> try:
>     text = f.read()
> finally:
>     f.close()   # runs even if the block raised an error
> ```
>
> *Picture it as* a lockout/tagout procedure: the lock comes off at the end of the job however the job went, because the procedure, not your memory, puts it back.

```predict
question: main takes argv and passes it to parse_args. If it called parse_args() with no argument instead, would the tests still pass?
choice: Yes: argparse would read the same arguments either way
choice: No: argparse would read pytest's own command-line arguments
answer: No: argparse would read pytest's own command-line arguments
explain: With no argument, `parse_args()` reads `sys.argv`, the words typed after the program that is *actually running*. Under pytest, that's pytest, so `sys.argv` holds things like `-q tests/test_cli.py -k main`, and argparse would complain about `-k`. Accepting `argv` as a parameter (with `None` meaning "use the real command line") lets a test pass in exactly the words it wants. This is a pattern you'll meet again: let the caller hand in what the function depends on, instead of the function reaching out for it. FastAPI, later, is built around this idea.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_cli.py -k main" label="main reads a named file and handles --top" -- main(argv=None) must pass argv to parser.parse_args(argv).
```

## Run the package

One file remains: what should happen when someone runs the package itself? Create `textstats/__main__.py`:

```python file=textstats/__main__.py
from textstats.cli import main

raise SystemExit(main())
```

`python -m textstats` means "find the package `textstats` and run its `__main__.py` as the program". This file calls `main()` with no argument, so argparse reads the real command line. `raise SystemExit(code)` ends the program and makes `code` its **exit code**: 0 from a successful `main`.

> **Exit code**: a whole number every program hands back to whatever started it when it ends. By convention 0 means success and anything else means some kind of failure; which number means which failure is up to each program (argparse uses 2 for "the command was typed wrong").
>
> *Picture it as* the green or red light on a machine at the end of a cycle. The operator, or the next machine in the line, doesn't need to inspect the part to know whether the cycle went well: the light says so.

Try it:

```powershell
.venv\Scripts\python -m textstats data.txt --top 3
.venv\Scripts\python -m textstats --help
.venv\Scripts\python -m textstats data.txt --top two
```

The second prints a help page argparse wrote from your descriptions. The third prints:

```text
usage: textstats [-h] [--top TOP] file
textstats: error: argument --top: invalid int value: 'two'
```

Check the exit code PowerShell recorded for the last program with `$LASTEXITCODE`: it's `2`. Exit codes are how programs report to other programs: a script that runs `textstats` on a thousand files can test each exit code without reading any output.

```check
run ".venv/Scripts/python -m textstats data.txt" stdout="Words: 85" label="python -m textstats data.txt prints the report" -- Create textstats/__main__.py with the two lines above.
run ".venv/Scripts/python -m textstats data.txt --top 2" without="was" label="--top 2 lists only two words"
run ".venv/Scripts/python -m textstats data.txt --top two" exit=2 stderr="invalid int value" label="a non-number for --top is rejected with exit code 2"
```

## Why -m?

You might expect to run the package folder directly, the way you ran `count.py`:

```powershell
.venv\Scripts\python textstats data.txt
```

Python does allow running a folder that has a `__main__.py`: it runs that file.

```predict
question: What does `python textstats data.txt` (no -m) do?
choice: The same as python -m textstats data.txt
choice: ModuleNotFoundError: No module named 'textstats'
choice: It opens textstats as a file and fails to read it
answer: ModuleNotFoundError: No module named 'textstats'
explain: `sys.path` is the list of folders Python searches, in order, when you import something: like checking your pockets in the same order every time you look for your keys, and stopping at the first pocket that has them. Run as a path, `textstats/__main__.py` is run as a script, and for a script Python puts **the script's own folder** first in `sys.path`: that's `text-analysis\textstats`. Then `from textstats.cli import main` searches that folder for a `textstats` package, and there isn't one inside itself. The project folder, which does contain the package, isn't searched at all.

With `-m`, Python puts the **current folder** first in `sys.path` instead (the same rule that made `python -m pytest` find your modules), so `textstats` is found in `text-analysis`. That's why packages are run with `-m`.
```

Run it to see the traceback for yourself. Reading a `ModuleNotFoundError` as "which folders did Python search?" solves most import problems you'll ever meet.

## Retire count.py

`count.py` still says `import stats`, which no longer exists, and everything it did, the package now does better. Delete it:

```powershell
del count.py
```

(`del` is PowerShell's short name for `Remove-Item`.)

```check
missing count.py -- In the terminal: del count.py
run ".venv/Scripts/python -m pytest -q" label="every test in the project passes" -- Run .venv\Scripts\python -m pytest -q to see which test fails.
```

`python -m pytest -q` with no file name finds every `test_*.py` file under the current folder and runs them all.

### What you have

```text
text-analysis/
  textstats/          the package
    __init__.py         marks the folder as a package; version
    __main__.py         what python -m textstats runs
    cli.py              the command line: arguments in, report out
    stats.py            the counting
  tests/
    test_stats.py
    test_cli.py
  data.txt
  requirements.txt
```

Notice the direction of the arrows: `__main__` uses `cli`, `cli` uses `stats`, and `stats` uses nothing of yours. The counting doesn't know there's a command line; the command line doesn't know how counting works. Next lesson: what the tool does when its input is wrong.
