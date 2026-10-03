---
title: 0.4 — When Things Go Wrong
track: Python Becomes Software
runtime: none
concepts: exceptions, file-paths, type-hints
revisits: testing, command-line
notebook: py-errors-and-exceptions, py-files-and-text, py-type-hints-and-dataclasses
problem: Give the tool a missing file, a folder, or a file with accented letters, and it crashes or gets the words wrong. How should software fail?
---

Try the tool on things that aren't a good text file:

```powershell
.venv\Scripts\python -m textstats nope.txt
.venv\Scripts\python -m textstats tests
```

Both print a **traceback**: a dozen lines naming files inside your package and inside Python, ending in `FileNotFoundError` or `PermissionError`. A traceback is the right output for the *programmer* while writing the code. It's the wrong output for someone *using* the tool: they made an ordinary mistake (a typo in a file name), and the program answered with its internals.

Software has to decide, for each thing that can go wrong, whether it's **the user's mistake** (report it plainly and stop) or **a bug** (let the traceback through, because someone needs to fix the code). This lesson makes those decisions for `textstats`, and fixes a quieter failure along the way: text that isn't English.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

Click **Create provided tests/test_errors.py** above.

```python file=tests/test_errors.py provided
# Tests for reading files safely and reporting errors. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_errors.py
from textstats import cli, stats
from textstats.files import read_text


def test_read_text_reads_utf8(tmp_path):
    path = tmp_path / "accents.txt"
    path.write_bytes("naïve café\n".encode("utf-8"))
    assert read_text(path) == "naïve café\n"


def test_read_text_accepts_a_string_path(tmp_path):
    path = tmp_path / "plain.txt"
    path.write_text("hi", encoding="utf-8")
    assert read_text(str(path)) == "hi"


def test_unicode_words_keep_their_accents():
    assert stats.words("Naïve café, déjà vu") == ["naïve", "café", "déjà", "vu"]


def test_unicode_words_still_split_on_underscores_and_dashes():
    assert stats.words("snake_case — dash") == ["snake", "case", "dash"]


def test_missing_file_is_reported_not_raised(tmp_path, capsys):
    code = cli.main([str(tmp_path / "nope.txt")])
    captured = capsys.readouterr()
    assert code == 1, "exit code 1: the program ran but couldn't do its job"
    assert captured.out == "", "nothing goes to standard output on failure"
    assert "textstats: cannot read" in captured.err
    assert "nope.txt" in captured.err, "say which file"


def test_a_folder_is_reported_not_raised(tmp_path, capsys):
    code = cli.main([str(tmp_path)])
    assert code == 1
    assert "textstats: cannot read" in capsys.readouterr().err


def test_a_file_that_is_not_utf8_is_reported(tmp_path, capsys):
    path = tmp_path / "old.txt"
    path.write_bytes("café".encode("cp1252"))
    code = cli.main([str(path)])
    assert code == 1
    assert "not UTF-8" in capsys.readouterr().err


def test_an_empty_file_is_reported_as_empty_counts(tmp_path, capsys):
    path = tmp_path / "empty.txt"
    path.write_text("", encoding="utf-8")
    assert cli.main([str(path)]) == 0
    assert "Words: 0" in capsys.readouterr().out
```

The last test is the interesting one. An empty file isn't an error: zero words is a correct answer. Deciding what is and isn't an error is part of the design, and a test is a good place to write the decision down.

`write_bytes` writes raw **bytes**, not text, so the tests can create files in a precise encoding. `"café".encode("cp1252")` produces the bytes an old Windows program would have saved. You'll see why that matters in the next step.

```check
file tests/test_errors.py -- Click "Create provided tests/test_errors.py" above.
```

## Which encoding?

A file holds **bytes**, numbers from 0 to 255. Text is characters. An **encoding** is the rule that converts between them. For plain English letters every common encoding agrees (`a` is byte 97 everywhere), which is why `data.txt` worked. For anything else they disagree:

| Text | UTF-8 bytes | cp1252 bytes |
|---|---|---|
| `a` | `61` | `61` |
| `é` | `C3 A9` | `E9` |
| `€` | `E2 82 AC` | `80` |

**UTF-8** is the encoding of the web and of nearly every modern file. **cp1252** is the old Windows encoding for Western European languages.

`open(path)` without `encoding=` decodes with the **system's default**. Before Python 3.15 that's the locale encoding: cp1252 on most Windows machines, UTF-8 on macOS and Linux. So the same program reading the same UTF-8 file gives `café` on a Mac and `cafÃ©` on Windows (the two UTF-8 bytes of `é`, decoded as two cp1252 characters). Python 3.15 changes the default to UTF-8, but code that names its encoding behaves the same on every version and every machine. Name it.

Create `textstats/files.py`:

```python file=textstats/files.py
from pathlib import Path


def read_text(path: str | Path) -> str:
    return Path(path).read_text(encoding="utf-8")
```

- **`pathlib.Path`** represents a file-system path as an object rather than a string. `Path("data.txt").read_text()` opens, reads and closes in one call. Paths also join with `/` (`Path("data") / "houses.csv"`) and know their parts (`.name`, `.suffix`, `.parent`), which you'll use later. `Path(path)` accepts either a string or a `Path`, so callers can pass either.
- **`path: str | Path` and `-> str`** are **type hints**: the parameter may be a `str` or a `Path`, and the function returns a `str`. You'll add them to the rest of the package at the end of this lesson, and see exactly what they do and don't do.

```check
run ".venv/Scripts/python -m pytest -q tests/test_errors.py -k read_text" label="read_text reads a file as UTF-8" -- Path(path).read_text(encoding="utf-8")
contains textstats/files.py "encoding=\"utf-8\"" label="read_text names its encoding" -- Without encoding="utf-8" the result depends on the machine.
```

## Read through one function

Now `main` should read files only through `read_text`. Update `textstats/cli.py`:

```python file=textstats/cli.py
import argparse

from textstats import stats
from textstats.files import read_text


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

    text = read_text(args.file)
    print(build_report(text, args.top))
    return 0
```

One place in the program now decides how files are read. When that decision changes (another encoding, reading from a URL, reading a compressed file), one function changes. That's what a **boundary** in a program is: the rest of the code doesn't know or care how text arrives.

```check
run ".venv/Scripts/python -m textstats data.txt" stdout="Words: 85" label="the tool still reports data.txt" -- from textstats.files import read_text, then text = read_text(args.file)
lacks textstats/cli.py "open(" label="cli.py reads files only through read_text"
```

## Words in any language

`read_text` now gives you `naïve café` correctly. But count its words:

```powershell
.venv\Scripts\python -c "from textstats import stats; print(stats.words('naïve café'))"
```

```predict
question: What does stats.words('naïve café') return, with the pattern [a-z0-9]+(?:'[a-z0-9]+)*?
choice: ['naïve', 'café']
choice: ['na', 've', 'caf']
choice: ['naive', 'cafe']
answer: ['na', 've', 'caf']
explain: `[a-z]` means the 26 characters from `a` to `z`, and nothing else. `ï` and `é` are different characters (with their own numbers in Unicode), so they aren't in the class: each one ends a word. The pattern was written for English and silently mangles everything else. No error, no warning: a wrong answer that looks like an answer, which is the most dangerous kind of failure.
```

The fix is to describe a word by what Unicode says a letter is, not by a list of 26 characters. In a regular expression, `\w` matches any **word character**: a letter or digit in any script (é, ß, я, 字, ٣) or an underscore. We don't want the underscore (the tests split `snake_case`), so use `[^\W_]`: a character that is *not* a non-word character and *not* an underscore, which leaves exactly letters and digits. Update `textstats/stats.py`:

```python file=textstats/stats.py
import re
from collections import Counter

WORD = re.compile(r"[^\W_]+(?:'[^\W_]+)*")


def count_characters(text):
    return len(text)


def count_lines(text):
    return len(text.splitlines())


def words(text):
    return WORD.findall(text.lower())


def count_words(text):
    return len(words(text))


def most_common(text, n):
    counts = Counter(words(text))
    ranked = sorted(counts.items(), key=lambda pair: (-pair[1], pair[0]))
    return ranked[:n]
```

`[^ … ]` is a **negated** class: any character *except* those listed. `\W` (capital) is "not a word character". So `[^\W_]` reads "not (not a word character, or an underscore)", which is "a word character other than underscore". Double negatives are awkward in English and common in regular expressions.

Because `count_words` and `most_common` both call `words`, they're fixed too. This is the payoff of the decision in lesson 0.2 to give the program **one** definition of a word.

```check
run ".venv/Scripts/python -m pytest -q tests/test_errors.py -k unicode" label="words keep accented letters and still split on underscores" -- WORD = re.compile(r"[^\W_]+(?:'[^\W_]+)*")
run ".venv/Scripts/python -m pytest -q tests/test_stats.py" label="the original word tests still pass"
```

## Fail with a message, not a traceback

When something goes wrong, Python **raises an exception**: it stops the current function, and the one that called it, and so on outwards, until some code **catches** it with `try`/`except`. If nothing catches it, Python prints the traceback and exits with code 1.

Exceptions are classes, arranged in a family tree. The part that matters here:

```text
Exception
├── OSError                  the operating system refused
│   ├── FileNotFoundError      no such file
│   ├── IsADirectoryError      it's a folder (macOS, Linux)
│   └── PermissionError        not allowed (also: a folder, on Windows)
└── ValueError
    └── UnicodeDecodeError     the bytes aren't valid in that encoding
```

`except OSError` catches `OSError` **and every class below it**. Update `textstats/cli.py`:

```python file=textstats/cli.py
import argparse
import sys

from textstats import stats
from textstats.files import read_text


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

    try:
        text = read_text(args.file)
    except UnicodeDecodeError:
        print(f"textstats: cannot read {args.file}: it is not UTF-8 text", file=sys.stderr)
        return 1
    except OSError as error:
        print(f"textstats: cannot read {args.file}: {error.strerror}", file=sys.stderr)
        return 1

    print(build_report(text, args.top))
    return 0
```

What Python does with this:

1. It runs the `try` block. If `read_text` returns normally, both `except` blocks are skipped.
2. If an exception is raised inside the `try` block, Python checks each `except` in order and runs the **first** one whose class matches (the exception's class or any class above it).
3. `except OSError as error` binds the exception object to `error`. `error.strerror` is the operating system's own description, such as `No such file or directory`.
4. Nothing else is caught. A `TypeError` from a bug in `build_report` still produces a traceback, which is right: that's a bug, and hiding it would make it harder to find.

**`print(..., file=sys.stderr)`** writes to **standard error** instead of standard output. A program has two output streams so that results and complaints can go to different places: `python -m textstats a.txt > report.txt` redirects the report into a file, and an error still appears on screen instead of hiding inside `report.txt`. The tests check this: on failure `captured.out == ""`.

**`return 1`**: exit code 1 means "ran, but couldn't do the job". With argparse's 2 for "you typed the command wrong" and 0 for success, the tool now reports all three outcomes in a way other programs can test.

```predict
question: Why catch OSError instead of FileNotFoundError?
choice: OSError is faster to check
choice: A folder, a missing file and a file you may not read are all the user's problem, and they raise different OSError subclasses
choice: FileNotFoundError can't be caught
answer: A folder, a missing file and a file you may not read are all the user's problem, and they raise different OSError subclasses
explain: The user can hand the tool a missing file (FileNotFoundError), a folder (IsADirectoryError on macOS and Linux, PermissionError on Windows: the same mistake raises different exceptions on different systems), or a file they aren't allowed to read (PermissionError). All of them mean "this path can't be read", and the operating system's own message says which. Catching the common parent handles them all, on every system, without listing each.

What you must not do is write a bare `except:` or `except Exception:` here. That would also catch bugs in your own code and print them as "cannot read the file", sending the user to look for a problem with their file that isn't there.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_errors.py -k \"reported or empty\"" label="missing files, folders and non-UTF-8 files are reported" -- Wrap text = read_text(args.file) in try; catch UnicodeDecodeError first, then OSError; print to sys.stderr and return 1.
run ".venv/Scripts/python -m textstats nope.txt" exit=1 stderr="textstats: cannot read" label="a missing file gives a one-line message and exit code 1"
```

## Say what the types are

Each function in `stats.py` expects certain types and returns certain types, but nothing in the code says so. Add type hints:

```python file=textstats/stats.py
import re
from collections import Counter

WORD = re.compile(r"[^\W_]+(?:'[^\W_]+)*")


def count_characters(text: str) -> int:
    return len(text)


def count_lines(text: str) -> int:
    return len(text.splitlines())


def words(text: str) -> list[str]:
    return WORD.findall(text.lower())


def count_words(text: str) -> int:
    return len(words(text))


def most_common(text: str, n: int) -> list[tuple[str, int]]:
    counts = Counter(words(text))
    ranked = sorted(counts.items(), key=lambda pair: (-pair[1], pair[0]))
    return ranked[:n]
```

`list[str]` is "a list of strings"; `tuple[str, int]` is "a pair of a string and an int", so `most_common` returns a list of `(word, count)` pairs. Read the signature and you know how to call the function and what you'll get back, without reading its body.

```predict
question: With these hints, what happens when you call stats.count_words(42)?
choice: Python refuses to call it: TypeError, an int is not a str
choice: It runs and fails inside: AttributeError, 'int' object has no attribute 'lower'
choice: It returns 0
answer: It runs and fails inside: AttributeError, 'int' object has no attribute 'lower'
explain: Python **does not check type hints when your code runs**. They're stored on the function (`stats.count_words.__annotations__`) and otherwise ignored. So `count_words(42)` calls `words(42)`, which calls `42.lower()`, and integers have no `lower` method.

Hints are read by tools *before* the code runs: your editor uses them for autocompletion and to underline a call like `count_words(42)`, and type checkers such as mypy or pyright check a whole project against them. They're documentation that tools can verify. Libraries you'll use later lean on them heavily: FastAPI reads a function's type hints to decide how to convert and validate web requests.
```

```check
contains textstats/stats.py "def words(text: str) -> list[str]:" label="words is annotated: str in, list[str] out"
contains textstats/stats.py "def most_common(text: str, n: int) -> list[tuple[str, int]]:" label="most_common is annotated"
run ".venv/Scripts/python -m pytest -q" label="every test in the project passes"
```

### What changed

```text
textstats/
  files.py     NEW  the one place files are read: UTF-8, any path type
  cli.py            errors become messages on stderr and exit codes
  stats.py          words in any language; type hints
```

The tool now has three outcomes (0, 1, 2), writes results and errors to different streams, reads the same file the same way on every computer, and says what its functions take and return. Next lesson: settings that change how it behaves without changing its code, and tests you write yourself.
