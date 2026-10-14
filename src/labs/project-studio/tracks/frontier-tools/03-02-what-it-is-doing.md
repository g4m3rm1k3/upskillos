---
title: 3.2 — What It's Doing
runtime: python
support: tests/conftest.py
---

The debugger is for a bug you can reproduce in a second. Some programs can't be paused like that. A model's training runs for an hour, overnight, on a computer you can't sit at, and when it goes wrong at 3 a.m. there's nobody at a `(Pdb)` prompt. What you want then is a record: what the program was doing, step by step, written as it ran.

`print` can write that record, but it's the wrong tool. Its lines mix with the program's real output, you can't turn them off without editing the code, and they're all equally loud. Python's `logging` module fixes all three. In this lesson you add it to your `frontier-textstats` command: quiet by default, a running commentary with `--verbose`, and a warning that shows up even when you didn't ask for one. Chapter 11's experiment harness keeps a log of every training run, written this way.

## Read the tests first

**This step: create the supplied file and read it. No code yet.**

Click **Create provided tests/test_logging.py**:

```python file=tests/test_logging.py provided
# Tests for logging in the frontier-textstats command (lesson 3.2). Each runs the command as a
# separate program, as test_cli.py does, so each starts with logging set up from scratch.
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPORT = (ROOT / "tests" / "golden" / "sample.txt").read_text(encoding="utf-8")


def run(arguments):
    command = [sys.executable, "-m", "frontier.textstats_cli", "data/sample.txt"] + arguments
    return subprocess.run(command, cwd=ROOT, capture_output=True, text=True)


def test_quiet_run_prints_only_the_report():
    result = run([])
    assert result.stdout == REPORT
    assert result.stderr == ""


def test_verbose_logs_on_stderr():
    result = run(["--verbose"])
    assert result.stdout == REPORT
    assert "INFO: reading data/sample.txt" in result.stderr
    assert "INFO: 100 words" in result.stderr


def test_warning_when_top_is_more_than_the_words():
    result = run(["--top", "1000"])
    assert result.returncode == 0
    assert "WARNING: asked for the top 1000 words" in result.stderr
```

- **Quiet by default:** an ordinary run prints the report on stdout, exactly the golden file, and nothing at all on stderr.
- **`--verbose`** adds lines on **stderr** that say what the command is doing, each starting with its **level**, `INFO`. The report on stdout doesn't change by a single character.
- **A warning:** asking for the top 1000 words of a 100-word file still works, but says so on stderr, even without `--verbose`. That's your Your turn.

```check
file tests/test_logging.py -- Click "Create provided tests/test_logging.py" above.
```

## A logger, and its levels

A **logger** is the object you send messages to. `logging.getLogger(__name__)` gives each module a logger named after it, made once at the top of the module. Every message is sent at a **level**, and the method's name is the level. From least to most serious:

| Method | For |
|---|---|
| `logger.debug` | details only someone hunting a bug wants |
| `logger.info` | what the program is doing: "reading the file", "epoch 3 of 10" |
| `logger.warning` | something odd that didn't stop it |
| `logger.error` | something that did |

The message is written with `%s` (any value) and `%d` (a whole number) as placeholders, and the values come after it as arguments: `logger.info("reading %s", args.path)`. The logger fills them in only if the message is actually going to be shown, so a message that's switched off costs almost nothing. Add `import logging`, the logger, and two `info` messages to `src/frontier/textstats_cli.py`:

```python file=src/frontier/textstats_cli.py
"""The frontier-textstats command: word and letter statistics for a text file."""
import argparse
import logging
import sys

from frontier.text import TextStats, analyse

logger = logging.getLogger(__name__)


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
    logger.info("reading %s", args.path)
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
    logger.info("%d words, %d different", stats.words, stats.unique_words)
    print(format_report(stats))


if __name__ == "__main__":
    main()
```

The first message says which file is about to be read; the second, after `analyse`, says how many words it found, `%d` taking `stats.words` and the second `%d` taking `stats.unique_words`. Nothing else changed.

Unless a program says otherwise, logging shows only messages at `WARNING` and above.

```predict
question: You run `.venv\Scripts\python -m frontier.textstats_cli data/sample.txt` now. What appears on stderr?
choice: the two INFO lines
choice: nothing
answer: nothing
explain: Both messages are `info`, which is below `WARNING`, so they're dropped before anything is written. That's the point: the messages stay in the code, ready, and cost nothing until someone asks for them. The next step lets them through.
verify: script quiet_by_default.py
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_logging.py -k quiet" label="an ordinary run still prints only the report" -- Use logger.info, not print, so the messages stay hidden by default.
contains src/frontier/textstats_cli.py "logging.getLogger(__name__)" label="the module has a logger" -- logger = logging.getLogger(__name__), at the top, below the imports.
```

## Switch it on with --verbose

The **program** decides which messages to show, in one place: its entry point, `main`. `logging.basicConfig` sets that up. Its `level=` is the lowest level shown, and its `format=` is how each line looks: `%(levelname)s: %(message)s` gives `INFO: reading data/sample.txt`. Messages go to stderr, so they never mix with the report on stdout.

Only `main` calls `basicConfig`, never a module like `text.py`. A module can't know whether the program using it wants messages, so it just logs; the program decides. Real formats often add the time with `%(asctime)s`; the tests leave it out, because a time is different on every run.

The option is a **flag**, an option with no value after it. `action="store_true"` makes `args.verbose` `True` when `--verbose` is given and `False` when it isn't. The level then comes from a conditional expression, as `other` swapped players in lesson 2.4. Change `parse_args` and `main` in `src/frontier/textstats_cli.py`:

```python file=src/frontier/textstats_cli.py
"""The frontier-textstats command: word and letter statistics for a text file."""
import argparse
import logging
import sys

from frontier.text import TextStats, analyse

logger = logging.getLogger(__name__)


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
    parser.add_argument("--verbose", action="store_true", help="say what the command is doing, on stderr")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)
    logging.basicConfig(level=logging.INFO if args.verbose else logging.WARNING, format="%(levelname)s: %(message)s")
    logger.info("reading %s", args.path)
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
    logger.info("%d words, %d different", stats.words, stats.unique_words)
    print(format_report(stats))


if __name__ == "__main__":
    main()
```

`basicConfig` runs first, before any message is sent, so every message meets the level it sets. With `--verbose` the lowest level shown is `INFO`; without it, `WARNING`, the same as before. Try it, then try it with the report thrown away:

```powershell
.venv\Scripts\python -m frontier.textstats_cli data/sample.txt --verbose
.venv\Scripts\python -m frontier.textstats_cli data/sample.txt --verbose > $null
```

In PowerShell, `> $null` sends stdout nowhere. The second run shows only the two `INFO` lines: they were on stderr all along. If you sent the report to a file the same way, the file would hold the report alone, with no log lines mixed in. That's what `print` couldn't do.

```check
run ".venv/Scripts/python -m pytest -q tests/test_logging.py -k verbose" label="--verbose logs on stderr" -- Call logging.basicConfig at the start of main, with level=logging.INFO if args.verbose else logging.WARNING and format="%(levelname)s: %(message)s".
run ".venv/Scripts/python -m pytest -q tests/test_logging.py -k quiet" label="without it, only the report" -- Without --verbose, the level must be logging.WARNING.
run ".venv/Scripts/python -m mypy --strict src/frontier/textstats_cli.py" stdout="Success" label="mypy --strict still passes" -- Check the spelling of logging.basicConfig and its arguments.
```

## Your turn: a warning worth showing

**Build, on your own:** a warning in `main`, sent after `analyse`, when `--top` asks for more words than the text has different words. On the sample, `--top 1000` must log:

```text
WARNING: asked for the top 1000 words, but there are only 60 different words
```

The two numbers come from `%d` placeholders, filled in from `args.top` and the stats, not typed into the message. The report still prints, and the command still exits with 0: a warning is something odd that didn't stop the program. Asking for the top 5 must warn about nothing.

Then run it, without `--verbose`:

```powershell
.venv\Scripts\python -m frontier.textstats_cli data/sample.txt --top 1000
```

The warning shows, because `WARNING` is at or above the level `main` sets when `--verbose` is missing.

```hints
nudge: Compare args.top with stats.unique_words, after analyse has worked out the stats.
concept: An if, then logger.warning with the message and two %d placeholders, followed by args.top and stats.unique_words as arguments. Not print: the test expects the "WARNING: " that the format adds.
answer: In `main`, after the `logger.info` that counts the words:
~~~python
    if args.top > stats.unique_words:
        logger.warning("asked for the top %d words, but there are only %d different words", args.top, stats.unique_words)
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_logging.py -k warning" label="too big a --top logs a warning" -- If args.top > stats.unique_words, call logger.warning with the message and the two numbers.
run ".venv/Scripts/python -m pytest -q tests/test_logging.py tests/test_cli.py tests/test_legacy_output.py" label="every command test still passes" -- The warning goes through logger.warning, which writes to stderr, so the report on stdout must not change.
run ".venv/Scripts/python -m mypy --strict src/frontier/textstats_cli.py" stdout="Success" label="mypy --strict still passes" -- logger.warning takes the message, then the values for its placeholders.
```

## When to log, and onto GitHub

A rough guide for the rest of the series:

- **`print`** is for a program's output: the report, the answer, the thing the user asked for.
- **`logging`** is for what the program says about itself while it runs: progress, numbers worth keeping, oddities.
- **The debugger** is for a bug you can reproduce, when you need to look at everything at one moment.

Your `textstats_cli` still prints its two error messages, because tests from Chapter 1 pin their exact wording and they're the command's answer to a bad request. A long-running program would log them with `logger.error` as well, so they land in the same record as everything else.

Commit and push:

```powershell
git add .
git commit -m "Log what frontier-textstats is doing, and warn when --top is too big"
git push
```

```check
git-clean -- Something isn't committed yet. Run git status to see what.
git-pushed -- Run git push
```

### What you have

```text
src/frontier/
  textstats_cli.py       a logger: INFO lines with --verbose, a WARNING when --top is too big
tests/
  test_logging.py        -k quiet, verbose, warning
```

Next lesson: the program is right, and quiet, and slow. Which part of it is slow? Guessing is usually wrong. The **profiler** measures it.
