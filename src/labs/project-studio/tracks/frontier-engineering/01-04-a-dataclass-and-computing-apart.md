---
title: 1.4 — A Dataclass, and Computing Apart From Printing
runtime: python
support: tests/conftest.py
---

`print_report` still does two jobs at once. It works out the statistics, and it prints them, a line at a time, as it goes. So the only way to get at a number it computes is to read it off the screen. A test can't ask "how many unique words?" and get `60` back, and no other program can either.

This lesson pulls the two jobs apart. Computing becomes a function in the package that **returns** every number, bundled into one object, and prints nothing. Printing becomes a function in the script that turns that object into the report's text. The bundle is a **dataclass**, the standard Python way to group named values.

## A branch for the stats

As in the last two lessons, the work goes on a branch:

```powershell
git switch -c stats
```

```check
git-branch stats -- Run git switch -c stats
```

## Read the tests first

**This step: create the supplied file and read it. No code yet.**

Click **Create provided tests/test_stats.py**:

```python file=tests/test_stats.py provided
# Tests for TextStats, analyse and format_report (lesson 1.4).
# A two-line text small enough to count by hand: 6 words, 4 different ones.
SAMPLE = "The cat sat.\nThe cat ran!\n"


def test_dataclass_compares_by_value():
    from frontier.text import TextStats
    a = TextStats(2, 6, 4, "the", 3.0, [("the", 2)], [("t", 5)])
    b = TextStats(2, 6, 4, "the", 3.0, [("the", 2)], [("t", 5)])
    assert a == b
    assert a != TextStats(2, 6, 4, "cat", 3.0, [("the", 2)], [("t", 5)])


def test_dataclass_has_named_fields():
    from frontier.text import TextStats
    stats = TextStats(2, 6, 4, "the", 3.0, [], [])
    assert (stats.lines, stats.words, stats.unique_words, stats.longest_word) == (2, 6, 4, "the")
    assert stats.average_word_length == 3.0


def test_analyse_counts_a_small_text():
    from frontier.text import TextStats, analyse
    assert analyse(SAMPLE) == TextStats(
        lines=2,
        words=6,
        unique_words=4,
        longest_word="the",
        average_word_length=3.0,
        top_words=[("the", 2), ("cat", 2), ("sat", 1), ("ran", 1)],
        top_letters=[("t", 5), ("a", 4), ("h", 2), ("e", 2), ("c", 2)],
    )


def test_analyse_keeps_only_the_top_n():
    from frontier.text import analyse
    stats = analyse(SAMPLE, top_words=1, top_letters=2)
    assert stats.top_words == [("the", 2)]
    assert stats.top_letters == [("t", 5), ("a", 4)]


def test_analyse_prints_nothing(capsys):
    from frontier.text import analyse
    analyse(SAMPLE)
    assert capsys.readouterr().out == ""


def test_report_is_the_whole_report_as_text():
    from frontier.text import analyse
    from textstats import format_report
    assert format_report(analyse(SAMPLE)) == (
        "lines: 2\n"
        "words: 6\n"
        "unique words: 4\n"
        "longest word: the\n"
        "average word length: 3.0\n"
        "\n"
        "top words:\n"
        "  the 2\n"
        "  cat 2\n"
        "  sat 1\n"
        "  ran 1\n"
        "\n"
        "top letters:\n"
        "  t 5\n"
        "  a 4\n"
        "  h 2\n"
        "  e 2\n"
        "  c 2"
    )
```

Three groups of tests, for the three things this lesson builds:

- **`test_dataclass_…`**: a `TextStats` holds seven values in a fixed order (lines, words, unique words, longest word, average word length, top words, top letters), each reachable by name, and two `TextStats` holding the same values are **equal**. That is what makes the next group short.
- **`test_analyse_…`**: `analyse` counts `SAMPLE` and returns the whole answer as one `TextStats`, so one `==` checks all seven numbers at once. The counts are small enough to check by hand: `"the"` twice, `"cat"` twice, the letter `t` five times.
- **`test_analyse_prints_nothing`** takes a parameter named `capsys`. pytest sees the name and passes in a **fixture**, an object it prepares for the test: this one catches everything printed while the test runs. `capsys.readouterr().out` is that text, and the test says it must be empty.
- **`test_report_…`**: `format_report` turns a `TextStats` into the report as **one string**, exactly as the script prints it today. Python joins string literals written next to each other, so the brackets hold one long string, written a line at a time so it can be read.

Notice the report string ends with `"  c 2"`, with no `"\n"` after it. `print` adds a newline to whatever it prints, so the string itself mustn't end in one, or the printed report would gain an extra blank line.

```check
file tests/test_stats.py -- Click "Create provided tests/test_stats.py" above.
```

## A dataclass

A class that only holds values needs an `__init__` that stores each argument, and more besides: a way to print itself readably, and a way to compare two of them. Writing all that by hand for seven values is long and easy to get wrong. The standard library writes it for you.

A line that starts with `@` directly above a class (or a function) is a **decorator**: Python builds the class, then hands it to the function named after the `@`, which can change it. The decorator `dataclass`, from the module `dataclasses`, reads the class's annotated names and writes the methods for you. Each annotated name, written as `name: type` like the variable hints of lesson 1.3, becomes a **field**.

Add this at the end of `src/frontier/text.py`, and its import under the other one:

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
```

From those seven lines, `@dataclass` writes three methods into `TextStats`:

- **`__init__`**, so `TextStats(2, 6, 4, "the", 3.0, [], [])` stores each argument in the field of the same position, and `TextStats(lines=2, words=6, ...)` does the same by name.
- **`__eq__`**, which Python calls for `==`: two `TextStats` are equal when every field is equal. A plain class compares by identity instead, so two separately made objects are never equal, however alike.
- **`__repr__`**, which Python calls to show an object, as `print` and pytest's failure messages do.

```predict
question: What does `print(TextStats(2, 6, 4, "the", 3.0, [], []))` show?
choice: the class name with every field's name and value
choice: <frontier.text.TextStats object at 0x...>
choice: just the values, as a tuple
answer: the class name with every field's name and value
explain: The `__repr__` that `@dataclass` writes shows `TextStats(lines=2, words=6, unique_words=4, longest_word='the', average_word_length=3.0, top_words=[], top_letters=[])`. Without the decorator, Python's default shows only the class and a memory address, which tells you nothing when a test fails.
verify: script dataclass_repr.py
```

The field hints make mypy check every `TextStats` too: a `str` passed as `lines` is an error before anything runs.

```check
run ".venv/Scripts/python -m pytest -q tests/test_stats.py -k dataclass" label="TextStats has seven fields and compares by value" -- Put @dataclass on the line above class TextStats, and give it the seven fields in the order the tests use.
run ".venv/Scripts/python -m mypy --strict src/frontier/text.py" stdout="Success" label="mypy --strict still passes" -- Every field needs a type: name: type.
```

## Computing apart from printing

Now the function that fills a `TextStats`. It does what `print_report` does today between reading the file and the first `print`, and returns everything instead of printing. Two new pieces of Python go into it. A parameter can have a **default value**, written `name: type = value`, which is used when the caller leaves that argument out: `analyse(text)` counts the top 10 words and top 5 letters, as the report does. And the call that builds the result passes each field **by name** (`lines=count_lines(text)`), which reads far better than seven bare values in a row. Add it at the end of `src/frontier/text.py`:

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

Trace it on `SAMPLE`, `"The cat sat.\nThe cat ran!\n"`: `split_words` gives six words, `tally` counts four different ones, `max(counts, key=len)` finds `"the"` (all four have three letters, and `max` keeps the first it met), and the average is 18 letters over 6 words, `3.0`. Every value lands in a named field, nothing is printed, and the caller decides what to do with the result. `average_word_length` is the exact average: rounding to two places is a matter of how the report looks, so it waits for the printing side.

```check
run ".venv/Scripts/python -m pytest -q tests/test_stats.py -k analyse" label="analyse returns a TextStats and prints nothing" -- Build the TextStats from the same expressions print_report uses today, and return it.
run ".venv/Scripts/python -m mypy --strict src/frontier/text.py" stdout="Success" label="mypy --strict still passes" -- Check analyse's hints: text: str, two int parameters with defaults, -> TextStats.
```

## Reading with `with`

The script now uses `analyse` instead of computing the numbers itself. While you're in `print_report`, change one more thing: how the file is read.

`open`, `read`, `close` has a gap. If `read` fails, `close` never runs, and the file stays open until Python happens to tidy it up. A **`with` block** closes it whatever happens. `with open(path) as f:` opens the file and names it `f`; when the indented block ends, normally or because of an error, Python closes the file. An object that knows how to clean up after a `with` block like this is called a **context manager**. A file is one, and you'll meet others.

Change `textstats.py` to read with `with`, call `analyse`, and print from the `TextStats`. `print_top` now gets the `(word, count)` pairs that `analyse` already chose, so it no longer needs `top` or `n`:

```python file=textstats.py
# textstats.py - word stats for a text file
# usage: python textstats.py file.txt
import sys

from frontier.text import analyse

TOP_WORDS = 10
TOP_LETTERS = 5


def print_top(title, pairs):
    print(title)
    for item, count in pairs:
        print("  " + item + " " + str(count))


def print_report(path):
    try:
        with open(path) as f:
            text = f.read()
    except:
        print("couldn't read " + path)
        sys.exit()
    stats = analyse(text, TOP_WORDS, TOP_LETTERS)
    print("lines: " + str(stats.lines))
    print("words: " + str(stats.words))
    print("unique words: " + str(stats.unique_words))
    print("longest word: " + stats.longest_word)
    print("average word length: " + str(round(stats.average_word_length, 2)))
    print()
    print_top("top words:", stats.top_words)
    print()
    print_top("top letters:", stats.top_letters)


def main():
    if len(sys.argv) < 2:
        print("usage: python textstats.py file.txt")
    else:
        print_report(sys.argv[1])


if __name__ == "__main__":
    main()
```

`stats.lines`, `stats.words` and the rest read the fields by name. The bare `except:` and `sys.exit()` stay for now, so that nothing about the output changes in this lesson: the next lesson replaces them on purpose. Run the characterisation test, which still compares the whole report with the golden file:

```powershell
.venv\Scripts\python -m pytest -q tests/test_legacy_output.py
```

```predict
question: Straight after a `with open("data/sample.txt") as f:` block has finished, what is `f.closed`?
choice: True
choice: False
choice: NameError: f is gone
answer: True
explain: The name `f` outlives the block (a `with` block, like an `if` or a `for`, doesn't give its names a scope of their own), but the file it names was closed the moment the block ended. Reading from it now would raise `ValueError: I/O operation on closed file`.
verify: script with_closed.py
```

```check
contains textstats.py "with open(path) as f:" label="the file is read in a with block" -- Replace the open, read and close lines with: with open(path) as f: and then text = f.read() indented under it.
lacks textstats.py "f.close()" label="no close() left to forget" -- The with block closes the file: delete f.close().
run ".venv/Scripts/python -m pytest -q tests/test_legacy_output.py" label="the report hasn't changed" -- Compare your print lines with the ones above: each reads a field of stats.
```

## Your turn: the report as one string

**Build, on your own:** a function `format_report(stats)` in `textstats.py` that returns the whole report as one string, exactly the text `print_report` prints today, without a newline at the end. Then:

1. `print_report` reads the file as it does now, and prints `format_report(analyse(text, TOP_WORDS, TOP_LETTERS))` with one `print`.
2. `print_top` is no longer needed. Delete it.
3. Give `format_report` type hints, `stats: TextStats` and `-> str`. A class is a type, so its name works as a hint. Import `TextStats` next to `analyse`.

Run the new test and the characterisation test:

```powershell
.venv\Scripts\python -m pytest -q tests/test_stats.py tests/test_legacy_output.py
```

Now the report's text can be tested without printing anything, and the same numbers could just as easily be written to a file, or sent to a web page.

```hints
nudge: Build a list of the report's lines, in order, then join them. Each `print(...)` in `print_report` today becomes one item in the list, and each `print()` becomes an empty string.
concept: `"\n".join(lines)` puts a newline between the lines and none after the last, which is what `print` expects. Lines can be added with `lines.append(...)`, including in a `for` loop over `stats.top_words`.
answer: In `textstats.py`, import `TextStats` too: `from frontier.text import TextStats, analyse`. Then, in place of `print_top`:
~~~python
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
~~~
and the end of `print_report`, after the `try` block, is one line:
~~~python
    print(format_report(analyse(text, TOP_WORDS, TOP_LETTERS)))
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_stats.py -k report" label="format_report returns the whole report, with no final newline" -- Join the lines with "\n" and return the result; don't add a newline at the end.
run ".venv/Scripts/python -m pytest -q tests/test_legacy_output.py" label="the printed report hasn't changed" -- print_report should print format_report(...) once, with nothing else.
lacks textstats.py "def print_top" label="print_top is gone" -- format_report does its job now: delete print_top.
```

## Bring it into `main`

Commit on the branch, merge into `main`, delete the branch:

```powershell
git add .
git commit -m "Compute the stats apart from printing them"
git switch main
git merge stats
git branch -d stats
```

```check
git-branch main -- Run git switch main
git-no-branch stats -- Merge it first (git merge stats), then delete it: git branch -d stats
contains textstats.py "def format_report" label="main has format_report" -- On main, run git merge stats
git-clean -- Something isn't committed yet. Run git status to see what.
```

### What you have

```text
src/frontier/text.py     the counting functions, TextStats and analyse: compute, print nothing
textstats.py             format_report, print_report, main: how the report looks, and the command line
tests/
  test_stats.py          TextStats, analyse, format_report
  test_legacy_output.py  the report, unchanged
```

Next lesson: the bare `except:` goes. A missing file and an empty file each get an error that says what went wrong, and the script becomes a real command.
