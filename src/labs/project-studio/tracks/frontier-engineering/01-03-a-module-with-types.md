---
title: 1.3 — A Module, With Types
runtime: python
support: tests/conftest.py
---

`split_words`, `tally` and `top` don't print anything or read any file. They take text or counts and return an answer, which makes them useful outside this script. Chapter 26 builds a model of text from exactly these counts. So they move out of the script and into your package, as the module `frontier.text`, where any code in the project can import them.

Code that other code imports needs to say what it accepts and what it returns. In this lesson the functions get **type hints**, and a tool, **mypy**, reads them and finds mistakes without running anything.

## A branch for the move

Same as last lesson: new work goes on a branch of its own.

```powershell
git switch -c package
```

```check
git-branch package -- Run git switch -c package
```

## A module for the counting

Create `src/frontier/text.py`, and copy the five counting functions into it from `textstats.py`, with the `PUNCTUATION` constant they use. Copy, don't cut: the script still uses its own copies until the next step deletes them.

```python file=src/frontier/text.py
"""Counting words and letters in text."""

PUNCTUATION = ".,;:!?\"()'"


def count_lines(text):
    """How many lines have something on them."""
    return sum(1 for line in text.split("\n") if line.strip())


def split_words(text):
    """The words in text: lower case, without punctuation at either end."""
    words = []
    for word in text.split():
        word = word.strip(PUNCTUATION).lower()
        if word:
            words.append(word)
    return words


def letters(text):
    """Every letter in text, lower case, in order."""
    return [c for c in text.lower() if c.isalpha()]


def tally(items):
    """How many times each item appears, in order of first appearance."""
    counts = {}
    for item in items:
        counts[item] = counts.get(item, 0) + 1
    return counts


def top(counts, n):
    """The n most common items, as (item, count) pairs, most common first."""
    return sorted(counts.items(), key=lambda pair: pair[1], reverse=True)[:n]
```

```predict
question: Lesson 0.2 installed the package with `pip install -e .`. You've just added a new file, `text.py`, to it. Does `import frontier.text` work, without installing again?
choice: It imports
choice: ModuleNotFoundError until you install again
answer: It imports
explain: An editable install doesn't copy files. It added your `src` folder to `sys.path`, so Python looks in the real folder every time it imports, and finds whatever is there now. You only install again when `pyproject.toml` changes, as it did for the `frontier-info` command.
verify: .venv/Scripts/python -c "import frontier.text; print('It imports')"
```

```check
run ".venv/Scripts/python -c \"from frontier.text import count_lines, split_words, letters, tally, top; print('ok')\"" stdout="ok" label="frontier.text has the five counting functions" -- Create src/frontier/text.py with count_lines, split_words, letters, tally and top.
```

## The script imports them

Now the script uses the module's functions instead of its own. Delete the five functions and `PUNCTUATION` from `textstats.py`, and import the functions instead:

```python file=textstats.py
# textstats.py - word stats for a text file
# usage: python textstats.py file.txt
import sys

from frontier.text import count_lines, letters, split_words, tally, top

TOP_WORDS = 10
TOP_LETTERS = 5


def print_top(title, counts, n):
    print(title)
    for item, count in top(counts, n):
        print("  " + item + " " + str(count))


def print_report(path):
    try:
        f = open(path)
        text = f.read()
        f.close()
    except:
        print("couldn't read " + path)
        sys.exit()
    words = split_words(text)
    counts = tally(words)
    average = sum(len(word) for word in words) / len(words)
    print("lines: " + str(count_lines(text)))
    print("words: " + str(len(words)))
    print("unique words: " + str(len(counts)))
    print("longest word: " + max(counts, key=len))
    print("average word length: " + str(round(average, 2)))
    print()
    print_top("top words:", counts, TOP_WORDS)
    print()
    print_top("top letters:", tally(letters(text)), TOP_LETTERS)


def main():
    if len(sys.argv) < 2:
        print("usage: python textstats.py file.txt")
    else:
        print_report(sys.argv[1])


if __name__ == "__main__":
    main()
```

What's left in the script is the part about *this program*: how the report looks, and the command line. What moved is the part any program could use. That's the line most splits between modules follow.

The tests in `tests/test_pieces.py` should test the module too, not the script. Open it and replace every `from textstats import` with `from frontier.text import` (`Ctrl+H` opens Replace in the editor; **Replace All** does all eight at once). Then run both test files:

```powershell
.venv\Scripts\python -m pytest -q tests/test_pieces.py tests/test_legacy_output.py
```

```check
lacks textstats.py "def tally" label="the script no longer has its own copy of the functions" -- Delete count_lines, split_words, letters, tally and top from textstats.py.
lacks tests/test_pieces.py "from textstats" label="the tests import from frontier.text" -- Replace every "from textstats import" in tests/test_pieces.py with "from frontier.text import".
run ".venv/Scripts/python -m pytest -q tests/test_pieces.py" label="the counting tests pass against the module"
run ".venv/Scripts/python -m pytest -q tests/test_legacy_output.py" label="the report hasn't changed" -- Check the import line at the top of textstats.py.
```

## Read the tests first

**This step: create the supplied file and read it. No code yet.**

Click **Create provided tests/test_annotations.py**:

```python file=tests/test_annotations.py provided
# Tests for the type hints in src/frontier/text.py (lesson 1.3).
# get_type_hints reads a function's hints back as Python objects.
from collections.abc import Iterable
from typing import get_args, get_origin, get_type_hints


def test_count_lines_is_annotated():
    from frontier.text import count_lines
    assert get_type_hints(count_lines) == {"text": str, "return": int}


def test_split_words_is_annotated():
    from frontier.text import split_words
    assert get_type_hints(split_words) == {"text": str, "return": list[str]}


def test_letters_is_annotated():
    from frontier.text import letters
    assert get_type_hints(letters) == {"text": str, "return": list[str]}


def test_tally_takes_an_iterable_of_strings():
    from frontier.text import tally
    hints = get_type_hints(tally)
    assert get_origin(hints["items"]) is Iterable and get_args(hints["items"]) == (str,)
    assert hints["return"] == dict[str, int]


def test_top_is_annotated():
    from frontier.text import top
    assert get_type_hints(top) == {"counts": dict[str, int], "n": int, "return": list[tuple[str, int]]}
```

Each test reads a function's type hints and compares them with what they should be. The next step explains what the hints mean. For now, notice what the tests say about `tally`: it takes an `Iterable` of strings, not a `list`.

```check
file tests/test_annotations.py -- Click "Create provided tests/test_annotations.py" above.
```

## Type hints

A **type hint** says what type a value should be. A parameter's hint goes after a colon, and the return type after an arrow:

```python
def count_lines(text: str) -> int:
```

"`count_lines` takes a string and returns an int." The type of a container includes the type of what's in it, in square brackets: `list[str]` is a list of strings, `dict[str, int]` is a dictionary from strings to ints, and `tuple[str, int]` is a pair whose first item is a string and second an int.

Add hints to the first two functions:

```python file=src/frontier/text.py
"""Counting words and letters in text."""

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


def letters(text):
    """Every letter in text, lower case, in order."""
    return [c for c in text.lower() if c.isalpha()]


def tally(items):
    """How many times each item appears, in order of first appearance."""
    counts = {}
    for item in items:
        counts[item] = counts.get(item, 0) + 1
    return counts


def top(counts, n):
    """The n most common items, as (item, count) pairs, most common first."""
    return sorted(counts.items(), key=lambda pair: pair[1], reverse=True)[:n]
```

Python itself doesn't check hints:

```predict
question: `split_words` now says `text: str`. What does `split_words(5)` do?
choice: TypeError, because 5 isn't a str
choice: AttributeError
choice: It returns an empty list
answer: AttributeError
explain: Python stores the hints and otherwise ignores them, so the call goes ahead. The error only comes when the function body does something an int can't: `text.split()`, and ints have no attribute `split`. The hint didn't stop the mistake. A tool that reads hints before the code runs can.
verify: script wrong_type.py
```

That tool is **mypy**. It reads your code and its hints, works out the type of every expression, and reports anything that doesn't fit, such as an int passed where a str is expected, without running anything. Add it to `requirements.txt` as a new line (keep the lines in alphabetical order):

```text
mypy==2.4.0
```

and install it as before:

```powershell
.venv\Scripts\python -m pip install -r requirements.txt
```

mypy saves what it has worked out in a folder named `.mypy_cache`, to be faster next time. Add `.mypy_cache/` to `.gitignore`. Then run it, in **strict** mode, which also reports every function that has no hints:

```powershell
.venv\Scripts\python -m mypy --strict src/frontier/text.py
```

```text
src\frontier\text.py:21: error: Function is missing a type annotation  [no-untyped-def]
src\frontier\text.py:26: error: Function is missing a type annotation  [no-untyped-def]
src\frontier\text.py:28: error: Need type annotation for "counts" (hint: "counts: dict[<type>, <type>] = ...")  [var-annotated]
src\frontier\text.py:34: error: Function is missing a type annotation  [no-untyped-def]
Found 4 errors in 1 file (checked 1 source file)
```

Three functions have no hints yet, and the fourth error is about a **variable**. mypy works out a variable's type from the value it's given. `words = []` is fine: mypy sees `words.append(word)` with a `str` a few lines later and decides it's a `list[str]`. But `counts = {}` is first used in `counts.get(item, 0)`, which tells mypy nothing about what the dictionary holds. A variable can carry a hint too, written the same way as a parameter's:

```python
counts: dict[str, int] = {}
```

One more type, for `tally`. It takes a list today, but the loop inside would work just as well on a tuple, a generator expression, or the characters of a string. **`Iterable[str]`** means "anything a `for` loop can go through, giving strings". Import it at the top of the module with `from collections.abc import Iterable`. A hint that asks for no more than the function needs lets more code use the function.

```check
run ".venv/Scripts/python -m pytest -q tests/test_annotations.py -k count" label="count_lines is annotated" -- def count_lines(text: str) -> int:
run ".venv/Scripts/python -m pytest -q tests/test_annotations.py -k split" label="split_words is annotated" -- def split_words(text: str) -> list[str]:
run ".venv/Scripts/python -m mypy --version" stdout="mypy 2.4.0" label="mypy 2.4.0 is installed" -- Add mypy==2.4.0 to requirements.txt, then run .venv\Scripts\python -m pip install -r requirements.txt
contains .gitignore ".mypy_cache/" label=".gitignore ignores mypy's cache" -- Add the line .mypy_cache/ to .gitignore.
```

## Your turn: no errors from mypy

**Build, on your own:** hints on `letters`, `tally` and `top`, so that

```powershell
.venv\Scripts\python -m mypy --strict src/frontier/text.py
```

prints `Success: no issues found`. `tests/test_annotations.py` says exactly which hints each function should have. Then run all the tests, to be sure the hints changed nothing else:

```powershell
.venv\Scripts\python -m pytest -q
```

With no file named, pytest runs every test file in the `tests` folder.

```hints
nudge: Read each function's tests in `test_annotations.py`: they spell out each hint. Then fix mypy's errors one at a time, from the top.
concept: Parameters get `name: type`, the return type goes after `->` before the colon, and a variable gets `name: type = value`. `Iterable` has to be imported from `collections.abc` before a hint can use it.
answer: At the top of `src/frontier/text.py`, under the docstring:
~~~python
from collections.abc import Iterable
~~~
Then the three functions' first lines, and the variable in `tally`:
~~~python
def letters(text: str) -> list[str]:

def tally(items: Iterable[str]) -> dict[str, int]:
    counts: dict[str, int] = {}

def top(counts: dict[str, int], n: int) -> list[tuple[str, int]]:
~~~
```

```check
run ".venv/Scripts/python -m mypy --strict src/frontier/text.py" stdout="Success" label="mypy --strict finds no problems" -- Run the command and fix its errors from the top: each line names the line number and what's missing.
run ".venv/Scripts/python -m pytest -q tests/test_annotations.py -k letters" label="letters is annotated" -- letters takes a str and returns a list of str.
run ".venv/Scripts/python -m pytest -q tests/test_annotations.py -k tally" label="tally takes an Iterable[str] and returns dict[str, int]" -- Import Iterable from collections.abc, and use Iterable[str] for items.
run ".venv/Scripts/python -m pytest -q tests/test_annotations.py -k top" label="top is annotated" -- top takes dict[str, int] and an int, and returns list[tuple[str, int]].
run ".venv/Scripts/python -m pytest -q" label="every test passes" -- Run .venv\Scripts\python -m pytest -q and read the first failure.
```

## Bring it into `main`

Commit on the branch, then merge it into `main` and delete it, as in the last lesson:

```powershell
git add .
git commit -m "Move the counting functions into frontier.text, with type hints"
git switch main
git merge package
git branch -d package
```

```check
git-branch main -- Run git switch main
git-no-branch package -- Merge it first (git merge package), then delete it: git branch -d package
contains textstats.py "from frontier.text import" label="main has the script that uses frontier.text" -- On main, run git merge package
git-clean -- Something isn't committed yet. Run git status to see what.
```

### What you have

```text
src/frontier/text.py     count_lines, split_words, letters, tally, top, with type hints
textstats.py             print_top, print_report, main: the program
tests/
  test_pieces.py         now tests frontier.text
  test_annotations.py
  test_legacy_output.py  the report, unchanged
```

Next lesson: `print_report` stops printing and returns the statistics as a **dataclass**, and the bare `except:` goes.
