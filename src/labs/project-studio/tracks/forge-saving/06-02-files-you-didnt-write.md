---
title: 6.2 — Files You Didn't Write
runtime: python
run: breakout/__main__.py
---

The scores file is written by the game, so it's tempting to trust it. But a file outlives the program that wrote it: a player can open it in an editor, a crash can cut it off halfway through saving, and a "scores file" can arrive from somewhere else entirely. This lesson looks at the shortcut Python offers for saving anything (`pickle`) and why it must never load a file you didn't write, then makes the game survive a broken scores file with a policy chosen on purpose.

## The scores module so far

**Build:** make sure `breakout/scores.py` matches the end of lesson 6.1, the reference answer to its Your turn.

```python file=breakout/scores.py
"""The scores players have made, kept in a file between games."""

import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


@dataclass(frozen=True)
class Score:
    level: str
    points: int
    when: datetime


def load_scores(path: Path) -> list[Score]:
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    return [Score(item["level"], item["points"], datetime.fromisoformat(item["when"])) for item in data]


def save_scores(path: Path, scores: list[Score]) -> None:
    data = [{"level": score.level, "points": score.points, "when": score.when.isoformat()} for score in scores]
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def add_score(path: Path, score: Score) -> None:
    save_scores(path, [*load_scores(path), score])


def best(scores: list[Score], level: str) -> int | None:
    return max((score.points for score in scores if score.level == level), default=None)
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="101 passed"
```

## The shortcut: pickle

**Build:** see what Python's own format can do, then what it costs. Click **Create provided make_gift.py**.

```python file=make_gift.py provided
"""Makes gift.pickle: a file that runs code the moment it's loaded. Harmless: the code it runs only prints."""

import pickle


class Gift:
    def __reduce__(self) -> tuple[object, tuple[str]]:
        return (print, ("This pickle just ran code on your computer. It could as easily have deleted your files.",))


with open("gift.pickle", "wb") as file:
    pickle.dump(Gift(), file)
print("made gift.pickle")
```

First, the appeal. Python's `pickle` module saves almost any object, with no conversions to write:

```powershell
.venv\Scripts\python -c "import pickle; from datetime import UTC, datetime; from breakout.scores import Score; s = Score('Classic', 560, datetime.now(UTC)); print(pickle.loads(pickle.dumps(s)) == s)"
```

```text
True
```

No `isoformat`, no `fromisoformat`: `pickle.dumps` turns the `Score` into bytes and `pickle.loads` turns them back, `datetime` and all. Now run the provided file, then load what it made, as a game would load a scores file:

```powershell
.venv\Scripts\python make_gift.py
.venv\Scripts\python -c "import pickle; pickle.load(open('gift.pickle', 'rb'))"
```

```text
made gift.pickle
This pickle just ran code on your computer. It could as easily have deleted your files.
```

**Understand: how pickle rebuilds objects.** A pickle isn't data in the way JSON is: it's a small **program** for rebuilding objects, of instructions like "import `breakout.scores`, get `Score`, call it with these values". When a class can't be rebuilt that simple way, it can say how with a method named `__reduce__`, which returns a function and the arguments to call it with; the pickle stores both, and loading **calls** them. `Gift.__reduce__` returns `print` and a message, so loading the file prints. A file made by someone else can name any function in Python instead: one that deletes files, or downloads and runs a program. Nothing is checked first, because pickle can't tell rebuilding an object from anything else a function might do. Python's documentation opens with a warning: **never unpickle data you didn't write yourself**, or that could have been changed by anyone else.

`with open("gift.pickle", "wb") as file:` opens the file for **w**riting **b**ytes, and `with` closes it again at the end of the block, even if an exception is raised inside: the reliable way to make sure a file is closed.

Two more costs. A pickle can only be read by Python, so no other program or language can use the scores. And it stores **where the class lives** (`breakout.scores`, `Score`): rename the module or the class and every saved file stops loading. A format you design yourself, like the JSON from lesson 6.1, has neither problem.

Delete both files: they were for the demonstration.

```powershell
Remove-Item make_gift.py, gift.pickle
```

```check
missing make_gift.py -- Delete make_gift.py and gift.pickle: Remove-Item make_gift.py, gift.pickle
missing gift.pickle
```

## A file cut off while saving

**Build:** a scores file as a crash would leave it, kept with the tests.

Create the folder `tests/data` and in it `broken-scores.json`, exactly as below, ending after `"points": 70,`:

```text file=tests/data/broken-scores.json
[
  {
    "level": "Classic",
    "points": 400,
    "when": "2026-10-04T15:30:05Z"
  },
  {
    "level": "Classic",
    "points": 70,
```

**Understand: how this happens.** `write_text` doesn't put the whole file on disk in one step: the operating system writes it in pieces. If the game crashes or the power goes off partway through, the file is left with only its first part. That's this file: the second score was being written when it stopped, after its points and before its time.

```powershell
.venv\Scripts\breakout --test-run 10 --scores tests/data/broken-scores.json
```

```text
Traceback (most recent call last):
  ...
json.decoder.JSONDecodeError: Expecting property name enclosed in double quotes: line 10 column 1 (char 135)
```

The game won't start at all, because of a file it only needs for one number on the screen. And a file someone edited by hand is worse in a quieter way: with `"points": "lots"`, `load_scores` makes a `Score` whose points are a string, nothing complains, and the screen shows `Best lots`. A dataclass doesn't check its fields; lesson 6.1's code trusts the file completely.

Data the tests need, kept as a file in the project, is called a **test fixture file**. It's committed, unlike `scores.json`, because it's part of the tests.

```check
file tests/data/broken-scores.json
```

## Scores checked at the boundary

**Build:** check every scores file with pydantic, as levels and settings are checked.

```python file=breakout/scores.py
"""The scores players have made, kept in a file between games."""

from dataclasses import dataclass
from pathlib import Path

from pydantic import AwareDatetime, ConfigDict, TypeAdapter, ValidationError
from pydantic_core import ErrorDetails


class ScoresError(ValueError):
    """A scores file that can't be read, with every problem found in it."""

    def __init__(self, problems: list[str]) -> None:
        super().__init__("; ".join(problems))
        self.problems = problems


@dataclass(frozen=True)
class Score:
    __pydantic_config__ = ConfigDict(strict=True, extra="forbid")

    level: str
    points: int
    when: AwareDatetime


SCORES = TypeAdapter(list[Score])


def describe(error: ErrorDetails) -> str:
    parts = [f"score {part + 1}" if isinstance(part, int) else part for part in error["loc"]]
    return f"{', '.join(parts) or 'the file'}: {error['msg']}"


def load_scores(path: Path) -> list[Score]:
    if not path.exists():
        return []
    try:
        return SCORES.validate_json(path.read_bytes())
    except ValidationError as error:
        raise ScoresError([describe(problem) for problem in error.errors()]) from None


def save_scores(path: Path, scores: list[Score]) -> None:
    path.write_bytes(SCORES.dump_json(scores, indent=2))


def add_score(path: Path, score: Score) -> None:
    save_scores(path, [*load_scores(path), score])


def best(scores: list[Score], level: str) -> int | None:
    return max((score.points for score in scores if score.level == level), default=None)
```

**Understand.**

**`TypeAdapter(list[Score])`** gives any type pydantic's checking, not only a `BaseModel`. Here it's a list of the existing `Score` dataclass: pydantic reads the dataclass's fields and types the same way it reads a model's. `validate_json` reads JSON bytes and checks them against the type; `dump_json` writes it as JSON bytes. Strictness and refusing extra fields are set by `__pydantic_config__`, a class attribute pydantic looks for on dataclasses. It has no type annotation, so it isn't a field.

**`AwareDatetime`** is a `datetime` that must include a time zone. A naive time (lesson 6.1) is refused, so every score in the file is a moment that can be compared with every other.

**No more conversions.** pydantic knows how to write a `datetime` as ISO 8601 and read it back, so the code you wrote in 6.1's Your turn is gone: `save_scores` is one line, and the file is the same format, except that pydantic writes UTC as `Z` (another ISO 8601 spelling of `+00:00`).

**What's checked, and what isn't.** Only data coming **in** through `SCORES` is checked. Unlike lesson 5.4's `BaseModel`, a dataclass created in code, `Score("Classic", 560, ...)`, isn't checked by pydantic; pyright checks it instead, before the code runs. Both together cover both directions: pyright for what your code creates, pydantic for what arrives from outside.

`describe` and `ScoresError` follow lesson 5.4's pattern: every problem, with where (`score 2, when`) and why.

```check
contains breakout/scores.py "SCORES = TypeAdapter(list[Score])"
run ".venv/Scripts/python -m pytest -q tests/test_scores.py" stdout="5 passed" label="the scores tests still pass: same behaviour, less code"
```

## Tests for what's refused

**Build:** the scores tests, with what must be refused.

```python file=tests/test_scores.py
"""What the scores file must do, and what it must refuse."""

from datetime import UTC, datetime
from pathlib import Path

import pytest

from breakout.scores import Score, ScoresError, add_score, best, load_scores, save_scores

WIN = Score("Classic", 400, datetime(2026, 10, 4, 15, 30, 5, tzinfo=UTC))
LOSS = Score("Classic", 70, datetime(2026, 10, 4, 15, 41, 0, tzinfo=UTC))
CASTLE = Score("Castle", 150, datetime(2026, 10, 5, 9, 2, 30, tzinfo=UTC))
DATA = Path(__file__).parent / "data"


def test_with_no_file_there_are_no_scores(tmp_path: Path):
    assert load_scores(tmp_path / "scores.json") == []


def test_scores_come_back_exactly_as_they_were_saved(tmp_path: Path):
    path = tmp_path / "scores.json"
    save_scores(path, [WIN, CASTLE])
    assert load_scores(path) == [WIN, CASTLE]


def test_a_new_score_is_added_after_the_old_ones(tmp_path: Path):
    path = tmp_path / "scores.json"
    add_score(path, WIN)
    add_score(path, LOSS)
    assert load_scores(path) == [WIN, LOSS]


def test_the_best_score_is_the_highest_on_that_level():
    assert best([LOSS, CASTLE, WIN], "Classic") == 400


def test_a_level_never_played_has_no_best():
    assert best([WIN, LOSS], "Castle") is None


def test_a_file_cut_off_while_it_was_saved_is_refused():
    with pytest.raises(ScoresError) as refused:
        load_scores(DATA / "broken-scores.json")
    assert str(refused.value) == "the file: Invalid JSON: EOF while parsing a value at line 10 column 0"


@pytest.mark.parametrize(
    ("text", "message"),
    [
        ('{"level": "Classic"}', "the file: Input should be a valid array"),
        (
            '[{"level": "Classic", "points": "lots", "when": "2026-10-04T15:30:05Z"}]',
            "score 1, points: Input should be a valid integer",
        ),
        (
            '[{"level": "Classic", "points": 5, "when": "2026-10-04T15:30:05"}]',
            "score 1, when: Input should have timezone info",
        ),
        ('[{"level": "Classic", "points": 5}]', "score 1, when: Field required"),
    ],
)
def test_a_file_someone_edited_badly_is_refused(tmp_path: Path, text: str, message: str):
    path = tmp_path / "scores.json"
    path.write_text(text, encoding="utf-8")
    with pytest.raises(ScoresError) as refused:
        load_scores(path)
    assert str(refused.value) == message
```

**Understand.** `DATA = Path(__file__).parent / "data"` finds the fixture folder from the test file's own location (lesson 5.1's rule), and `test_a_file_cut_off_while_it_was_saved_is_refused` uses the broken file. The parametrised test covers the ways a person editing the file could get it wrong.

```check
run ".venv/Scripts/python -m pytest -q tests/test_scores.py" stdout="10 passed"
```

## Your turn: play on, and don't make it worse

**Build, on your own:** make the game survive a scores file it can't read.

Right now, a bad scores file stops the game with a traceback (try `.venv\Scripts\breakout --test-run 10 --scores tests/data/broken-scores.json`). What should happen? Compare it with a bad level:

- A bad **level** can't be played, so lesson 5.2 refuses to start, with a message and exit code 1.
- A bad **scores file** loses the player nothing they need to play. Refusing to start would turn a lost high score into a lost game.

So: warn, play, and **don't touch the file**. Saving a new score would overwrite the broken file with a list holding only the new score, destroying whatever could still be recovered from it by hand. So for the rest of the run, keep no scores at all.

| Command | Result |
|---|---|
| `breakout --test-run 10000 --hold auto --scores tests/data/broken-scores.json` | error output: `breakout: tests\data\broken-scores.json: the file: Invalid JSON: ...; playing without keeping scores`; the game plays to the end: `... score=560 ...` |
| afterwards | `tests/data/broken-scores.json` is exactly as it was |

Catch `OSError` too: a scores file the player isn't allowed to read is the same situation. When all 106 tests pass and every check is clean, commit with a message that mentions the **scores file**.

```hints
nudge: Where does the app load the scores for the first time? What could it do there instead of crashing, and what would stop it from saving later?
concept: Wrap the first `load_scores` in `try`/`except (OSError, ScoresError) as error:`, like the level and settings loading above it. In the `except`, print the warning to `sys.stderr`, and set `scores_file = None`: every later use of `scores_file` already checks it first (`if scores_file`), so nothing is ever saved for the rest of the run. The best score stays `None`.
shape: Import `ScoresError`. Replace the one-line `best_score = ...` with `best_score = None`, then `if scores_file:` containing the `try`/`except`.
answer: ~~~python
    best_score = None
    if scores_file:
        try:
            best_score = best(load_scores(scores_file), level.name)
        except (OSError, ScoresError) as error:
            print(f"breakout: {scores_file}: {error}; playing without keeping scores", file=sys.stderr)
            scores_file = None
~~~

with `from breakout.scores import Score, ScoresError, add_score, best, load_scores`. Catching the error but leaving `scores_file` set looks fine at first, then crashes at the end of the first game, when `add_score` reads the broken file again. The fix is about **policy** as much as code: the same exception means "stop" for a level and "carry on without it" for scores, decided by what the data is for. Silently deleting the broken file and starting again would also stop the crash, and throw away the player's history without asking.
```

```check
run ".venv/Scripts/breakout --test-run 10000 --hold auto --scores tests/data/broken-scores.json" stderr="playing without keeping scores" label="a broken scores file is reported, not fatal"
run ".venv/Scripts/breakout --test-run 10000 --hold auto --scores tests/data/broken-scores.json" stdout="score=560" label="the game is played to the end"
lacks tests/data/broken-scores.json "560" -- Never save over a scores file you couldn't read: set scores_file = None.
run ".venv/Scripts/python -m pytest -q" stdout="106 passed"
run ".venv/Scripts/python -m pyright breakout tests replay.py" stdout="0 errors"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
git-message "scores file"
git-clean
```

## Challenge: never leave half a file

**Optional, ★★.** The broken file came from a save cut off partway. Make `save_scores` **atomic**: either the whole new file is there afterwards, or the old one is, never half of either. The standard way is to write the new content to a temporary file **in the same folder**, then replace the old file with it in one step, with `os.replace(temporary, path)`, which the operating system does all at once. Name the temporary file from the real one (`path.with_suffix(".tmp")`), and think about what should happen to it if writing fails. There's no automatic check: the tests must still pass, and reading the code is the proof. Lesson 6.3's database does this for you, and much more.

## What did we actually learn?

- **pickle runs code when it loads.** Never unpickle a file you didn't write. It's also Python-only and tied to your class names.
- **Files you wrote yourself still arrive from outside**: crashes cut them off, people edit them. Check them at the boundary like any other input.
- **`TypeAdapter`** checks any type, including plain dataclasses; **`AwareDatetime`** refuses naive times.
- **pyright checks what your code creates; pydantic checks what comes in.**
- **Failure policy follows purpose**: a bad level stops the game; bad scores are reported, skipped, and left untouched.
- **Test fixture files**, committed in `tests/data`, found from the test file's own location.
- `with` closes a file however its block ends.

C# had its own pickle, `BinaryFormatter`, which ran into exactly this problem: Microsoft marked it dangerous and then removed it from .NET entirely, and tells programs to use `System.Text.Json` instead. Java's built-in serialisation (`ObjectInputStream`) has been behind a long line of remote-code-execution attacks for the same reason, and its own architects have called it a mistake. In every language: data formats you design, checked when they're read.
