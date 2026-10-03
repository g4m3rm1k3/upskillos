---
title: 0.5 — Settings, and Tests You Write Yourself
track: Python Becomes Software
runtime: none
concepts: configuration, testing, classes
revisits: exceptions, file-paths, type-hints, command-line
notebook: py-type-hints-and-dataclasses, py-testing-your-code
problem: The most common words are always "the", "of" and "it". How do you change what the tool does without editing its code, and how do you know the change works?
---

Run the tool on `data.txt` and look at the list it's most proud of:

```text
Most common words:
  the        11
  it         10
  of         10
  was        10
  we         4
```

Correct, and useless. In almost any English text the most common words are *the*, *of*, *and*, *it*. Text analysis usually ignores these **stop words**, and you'll do the same in Part XIV when a spam detector needs to know which words carry meaning.

But which words to ignore depends on the text and the person. That's a **setting**: something that changes how the program behaves without being part of the program. This lesson adds a settings file, and changes how you work with tests: until now the tests were handed to you. From here on, you write them, and you write them **first**.

## Settings that aren't code

Create `textstats.toml` in the project folder:

```toml file=textstats.toml
# Settings for textstats. The command line overrides anything here.
top = 3
ignore = ["the", "of", "it", "was"]
```

This is **TOML**, a format for settings files. Each line is `key = value`; strings are quoted, lists use brackets, `#` starts a comment. Python's standard library reads it (`tomllib`, since Python 3.11), and so does nearly every modern Python tool: `pyproject.toml`, which you'll meet when this project is packaged, is TOML too.

The rule this tool will follow is the usual one for settings, in order of strength:

```text
command line     --top 1             strongest: what you typed just now
settings file    top = 3
defaults         5                   weakest: what the code assumes
```

```check
contains textstats.toml "ignore = [\"the\", \"of\", \"it\", \"was\"]" -- Create textstats.toml in the project folder (not inside textstats/).
```

## Write the tests first

Before writing `config.py`, write down what it must do, as tests. Create `tests/test_config.py`:

```python file=tests/test_config.py
# Tests for textstats/config.py, written before the code.
import pytest

from textstats.config import ConfigError, Settings, load_settings


def write(tmp_path, text):
    path = tmp_path / "textstats.toml"
    path.write_text(text, encoding="utf-8")
    return path


def test_settings_default_when_the_file_is_missing(tmp_path):
    assert load_settings(tmp_path / "missing.toml") == Settings(top=5, ignore=frozenset())


def test_settings_read_from_the_file(tmp_path):
    path = write(tmp_path, 'top = 3\nignore = ["The", "of"]\n')
    assert load_settings(path) == Settings(top=3, ignore=frozenset({"the", "of"}))


def test_settings_missing_keys_keep_their_defaults(tmp_path):
    assert load_settings(write(tmp_path, "top = 2\n")) == Settings(top=2)


def test_settings_reject_a_misspelt_key(tmp_path):
    with pytest.raises(ConfigError, match="igonre"):
        load_settings(write(tmp_path, 'igonre = ["the"]\n'))


def test_settings_reject_a_top_that_is_not_a_positive_whole_number(tmp_path):
    for bad in ["0", "-1", '"three"', "2.5", "true"]:
        with pytest.raises(ConfigError, match="top"):
            load_settings(write(tmp_path, f"top = {bad}\n"))


def test_settings_reject_broken_toml(tmp_path):
    with pytest.raises(ConfigError):
        load_settings(write(tmp_path, "top = \n"))
```

Read it as a design document. It decides, before any code exists:

- **the names**: a function `load_settings(path)`, a class `Settings`, an exception `ConfigError`;
- **what "no file" means**: not an error; the defaults;
- **that settings are compared by value**: `load_settings(...) == Settings(top=3, ...)`, so a `Settings` must know how to compare itself with `==`;
- **what's rejected**: a misspelt key, a bad `top`, a file that isn't TOML. A misspelt key is the important one. Without the check, `igonre = [...]` would be silently skipped, the tool would ignore nothing, and the user would have no idea why.

`write` is a **helper**: a plain function the tests share. Its name doesn't start with `test_`, so pytest doesn't run it as a test. `pytest.raises(ConfigError, match="igonre")` also checks that the error *message* contains `igonre`, so the message names the actual mistake.

`"true"` in the list of bad values looks odd. Remember it; it's explained in the next step.

Now run the tests, knowing they can't pass:

```powershell
.venv\Scripts\python -m pytest -q tests/test_config.py
```

```text
E   ModuleNotFoundError: No module named 'textstats.config'
1 error in 0.05s
```

This is the first step of **test-driven development**: write a failing test (**red**), write the code that makes it pass (**green**), then tidy up with the tests guarding you (**refactor**). Seeing it fail first matters. A test you've never seen fail might not be testing anything, for example if it accidentally never runs.

```check
run ".venv/Scripts/python -m pytest -q tests/test_config.py" exit=2 stdout="No module named 'textstats.config'" label="the new tests fail, because config.py doesn't exist yet (red)" -- Create tests/test_config.py exactly as shown. It should fail to import textstats.config.
```

## Load the settings

Create `textstats/config.py`:

```python file=textstats/config.py
import tomllib
from dataclasses import dataclass
from pathlib import Path


class ConfigError(Exception):
    """A settings file that can't be used."""


@dataclass(frozen=True)
class Settings:
    top: int = 5
    ignore: frozenset[str] = frozenset()


KNOWN_KEYS = {"top", "ignore"}


def load_settings(path: str | Path) -> Settings:
    path = Path(path)
    if not path.exists():
        return Settings()
    try:
        data = tomllib.loads(path.read_text(encoding="utf-8"))
    except tomllib.TOMLDecodeError as error:
        raise ConfigError(f"{path}: {error}") from error

    unknown = sorted(set(data) - KNOWN_KEYS)
    if unknown:
        raise ConfigError(f"{path}: unknown setting {unknown[0]!r}")

    top = data.get("top", Settings.top)
    if isinstance(top, bool) or not isinstance(top, int) or top < 1:
        raise ConfigError(f"{path}: top must be a whole number of at least 1")

    ignore = data.get("ignore", [])
    if not isinstance(ignore, list) or not all(isinstance(word, str) for word in ignore):
        raise ConfigError(f"{path}: ignore must be a list of words")

    return Settings(top=top, ignore=frozenset(word.lower() for word in ignore))
```

Piece by piece:

**`class ConfigError(Exception)`** defines a new kind of exception by **inheriting** from `Exception`. It adds nothing but a name, and the name is the point: `main` can catch *this* problem without catching anything else. The docstring is its only body.

**`@dataclass(frozen=True) class Settings`.** A **class** is a blueprint for objects that carry named values together; `Settings(top=3)` makes one, and `s.top` reads it. Writing such a class by hand means writing `__init__` (to store the values), `__eq__` (so `==` compares values, which the tests need) and `__repr__` (so a failing test prints `Settings(top=3, ignore=…)` instead of `<Settings object at 0x…>`). The `@dataclass` decorator reads the annotated names and writes those three methods for you. `frozen=True` forbids changing a field after creation, so settings, once loaded, can't be changed by accident somewhere deep in the program.

**`frozenset`** is a set that can't be changed. A set because the only question asked of `ignore` is "is this word in it?", which a set answers in one step however many words it holds; a list would compare against every element. Frozen because a dataclass default must not be a shared mutable object.

**`tomllib.loads(text)`** parses TOML text into a dictionary: `{"top": 3, "ignore": ["the", "of", "it", "was"]}`. A syntax error raises `TOMLDecodeError`, which becomes a `ConfigError`. `raise … from error` keeps the original exception attached, so a programmer debugging it can still see the parser's exact complaint.

**`set(data) - KNOWN_KEYS`** is set difference: the keys in the file that aren't known. `{!r}` formats with `repr`, so the message quotes the bad name: `unknown setting 'igonre'`.

**`isinstance(top, bool)`.** In Python, `bool` is a subclass of `int`: `True == 1` and `isinstance(True, int)` is `True`. So `top = true` in TOML (which gives Python `True`) would pass `isinstance(top, int)` and be used as 1. The `"true"` case in the tests exists to catch exactly this, which is why it's checked first.

**Validating at the boundary.** Every check happens here, where outside data enters the program. Past this function, the rest of the code can trust that `settings.top` is a positive `int`. That's the same idea as `read_text`: one boundary, one place for its rules. (FastAPI, later, does this for web requests.)

```check
run ".venv/Scripts/python -m pytest -q tests/test_config.py" label="every config test passes (green)" -- Run the tests and read the first failure: its name says which rule isn't enforced yet.
```

## A test for ignoring words

The counting needs to learn to skip words. Test first again. Add one test to the end of `tests/test_stats.py`:

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


def test_most_common_can_ignore_words():
    assert stats.most_common("the cat the hat", 2, ignore=frozenset({"the"})) == [("cat", 1), ("hat", 1)]
    assert stats.most_common("The cat", 1, ignore=frozenset({"the"})) == [("cat", 1)], "ignored words match in any case"
```

Run it and watch it fail:

```powershell
.venv\Scripts\python -m pytest -q tests/test_stats.py -k ignore
```

```text
E       TypeError: most_common() got an unexpected keyword argument 'ignore'
1 failed, 9 deselected
```

Red, for the right reason: the feature doesn't exist yet. A test that fails for the *wrong* reason (a typo in the test, say) would be worth fixing before going on.

```check
run ".venv/Scripts/python -m pytest -q tests/test_stats.py -k ignore" exit=1 stdout="unexpected keyword argument 'ignore'" label="the new test fails because most_common has no ignore yet (red)"
```

## Ignore words when counting

Update `most_common` in `textstats/stats.py`:

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


def most_common(text: str, n: int, ignore: frozenset[str] = frozenset()) -> list[tuple[str, int]]:
    counts = Counter(word for word in words(text) if word not in ignore)
    ranked = sorted(counts.items(), key=lambda pair: (-pair[1], pair[0]))
    return ranked[:n]
```

`word for word in words(text) if word not in ignore` is a **generator expression**: like a list comprehension, but it hands words to `Counter` one at a time instead of building a list first. Words are already lowercased by `words()`, and `load_settings` lowercased the ignore list, so `"The"` in the text matches `"the"` in the settings.

`ignore` has a default, `frozenset()`, so every existing call to `most_common` (and every existing test) still works. Adding a parameter with a default is how a function grows without breaking its callers.

```check
run ".venv/Scripts/python -m pytest -q tests/test_stats.py" label="the ignore test passes, and so does every older one (green)"
```

## Wire it into the command line

Update `textstats/cli.py`:

```python file=textstats/cli.py
import argparse
import sys

from textstats import stats
from textstats.config import ConfigError, load_settings
from textstats.files import read_text


def build_report(text: str, top: int = 5, ignore: frozenset[str] = frozenset()) -> str:
    lines = [
        f"Characters: {stats.count_characters(text)}",
        f"Words: {stats.count_words(text)}",
        f"Lines: {stats.count_lines(text)}",
        "Most common words:",
    ]
    for word, count in stats.most_common(text, top, ignore):
        lines.append(f"  {word:<10} {count}")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="textstats",
        description="Count characters, words and lines, and list the most common words.",
    )
    parser.add_argument("file", help="the text file to analyse")
    parser.add_argument("--top", type=int, default=None, help="how many common words to list (default: the settings file's, else 5)")
    parser.add_argument("--config", default="textstats.toml", help="the settings file (default: textstats.toml)")
    args = parser.parse_args(argv)

    try:
        settings = load_settings(args.config)
    except ConfigError as error:
        print(f"textstats: {error}", file=sys.stderr)
        return 1
    top = args.top if args.top is not None else settings.top

    try:
        text = read_text(args.file)
    except UnicodeDecodeError:
        print(f"textstats: cannot read {args.file}: it is not UTF-8 text", file=sys.stderr)
        return 1
    except OSError as error:
        print(f"textstats: cannot read {args.file}: {error.strerror}", file=sys.stderr)
        return 1

    print(build_report(text, top, settings.ignore))
    return 0
```

The precedence rule is one line: `top = args.top if args.top is not None else settings.top`. For it to work, `--top` needs a default of **`None`**, not 5. With `default=5`, the program couldn't tell "the user typed `--top 5`" from "the user typed nothing", and the settings file could never take effect. `None` means "not given", and the defaults live in one place: `Settings`.

Try the three levels:

```powershell
.venv\Scripts\python -m textstats data.txt
.venv\Scripts\python -m textstats data.txt --top 1
.venv\Scripts\python -m textstats data.txt --config none.toml
```

The first lists `we 4`, `age 2`, `all 2`: three words, none of them ignored ones. The second lists only `we`. The third points at a settings file that doesn't exist, so it gets the defaults: `the` is back, with four more words.

```check
run ".venv/Scripts/python -m textstats data.txt" stdout="we         4" without="the        11" label="the settings file's ignore list is used"
run ".venv/Scripts/python -m textstats data.txt" without="before" label="the settings file's top = 3 lists three words" -- --top needs default=None, so the program can tell "not given" from "5".
run ".venv/Scripts/python -m textstats data.txt --top 1" without="age" label="--top on the command line beats the settings file"
run ".venv/Scripts/python -m textstats data.txt --config none.toml" stdout="the        11" label="with no settings file, the defaults apply"
```

## The test that broke

Run the whole suite:

```powershell
.venv\Scripts\python -m pytest -q
```

```predict
question: You only added things. Does every test still pass?
choice: Yes
choice: No: a test in test_cli.py fails
choice: No: a test in test_config.py fails
answer: No: a test in test_cli.py fails
explain: `test_main_lists_five_words_unless_told_otherwise` fails: it found 3 words, not 5. The test calls `cli.main([path])` with no `--config`, so `main` loads `textstats.toml` **from the current folder**, and pytest was started in the project folder, where your settings file now says `top = 3`.

The code is right; the test environment leaked into the test. Its result depends on which folder pytest is run from and what files happen to be there: the same hidden assumption as `open("data.txt")` in lesson 0.1, now inside the tests. A test that passes or fails depending on where it's run is worse than no test, because nobody can trust what it says.
```

The fix belongs to the tests, not the code: every test should run in a folder of its own, empty, so nothing outside the test can affect it. Create `tests/conftest.py`:

```python file=tests/conftest.py
# pytest runs this file before the tests in this folder.
import pytest


@pytest.fixture(autouse=True)
def run_in_an_empty_folder(tmp_path, monkeypatch):
    """Each test starts in its own empty folder, so no file in the project can change its result."""
    monkeypatch.chdir(tmp_path)
```

- **`conftest.py`** is a file pytest loads automatically, before the tests beside it. Fixtures defined in it are available to every test in the folder.
- **`@pytest.fixture`** turns a function into a fixture, like the `tmp_path` and `capsys` you've been using. **`autouse=True`** applies it to every test, without each test asking for it by name.
- **`monkeypatch`** is a built-in fixture that changes something for the length of one test and **puts it back afterwards**. `monkeypatch.chdir(tmp_path)` changes the current folder to the test's empty `tmp_path`, and restores it when the test ends, so one test can never leave the next one somewhere strange.

Every test in this project uses `tmp_path` or no files at all, so none of them depends on the current folder, and now none can.

```check
run ".venv/Scripts/python -m pytest -q" label="every test passes, whichever folder it runs from" -- Create tests/conftest.py with the autouse fixture above.
```

## Challenge: a minimum word length

No code is given for this step. Use what you've practised.

**The feature:** a setting `min_length` (a whole number, default 1). Words shorter than it are left out of the **most common words**. They still count in `Words:`, which counts every word.

1. **Test first.** In `tests/test_stats.py`, add a test whose name contains `min_length`, showing `most_common` leaving out short words. Run it and see it fail.
2. Give `most_common` a `min_length` parameter with a default, so every existing call still works.
3. Teach `Settings` and `load_settings` about `min_length` (and don't forget the list of known keys).
4. Pass it through `build_report` and `main`.
5. Create `challenge.toml` containing:

   ```toml
   top = 3
   min_length = 6
   ```

   and run `.venv\Scripts\python -m textstats data.txt --config challenge.toml`. The three most common words of six letters or more are `before`, `direct` and `season`, twice each.

```check
run ".venv/Scripts/python -m pytest -q -k min_length" label="a test of yours about min_length exists and passes" -- Name the test so it contains min_length, e.g. test_most_common_min_length_leaves_out_short_words. pytest exits with "no tests ran" if no name matches.
run ".venv/Scripts/python -m textstats data.txt --config challenge.toml" stdout="before" without="times" label="with min_length = 6, short words are left out of the list" -- times has 5 letters and appears twice: it must not be listed.
run ".venv/Scripts/python -m textstats data.txt --config challenge.toml" stdout="Words: 85" label="every word still counts in the word total"
run ".venv/Scripts/python -m pytest -q" label="every test still passes"
```

### Chapter 0: what you built, and why each piece exists

| Piece | The problem it fixed |
|---|---|
| A virtual environment and pinned `requirements.txt` | Packages that differ from machine to machine |
| Functions that take text and return values | Counting that couldn't be tested without a file |
| Tests, written first | "It works" being a feeling instead of a fact |
| A module and `if __name__ == "__main__"` | Code that ran when another program only wanted to use it |
| A package, run with `-m` | Loose files, and imports that depended on the current folder |
| `argparse` | A file name written into the code |
| `read_text` with `encoding="utf-8"` | The same file giving different text on different computers |
| Exceptions, stderr and exit codes | Tracebacks shown to people who made ordinary mistakes |
| Type hints | Not knowing what a function takes and returns without reading it |
| A settings file, validated at the boundary | Behaviour that could only change by editing code |
| An isolated test folder | Tests whose result depended on where they were run |

Every one of these will come back. The next chapter applies them to **data**: rows and columns from a CSV file, the raw material of every model in this series.
