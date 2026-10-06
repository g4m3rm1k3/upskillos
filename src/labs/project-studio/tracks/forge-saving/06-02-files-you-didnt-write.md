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

`pickle.dumps` turns the `Score` into bytes (the `s` once meant "string", from the days when Python's strings were bytes; today `dumps` returns `bytes` for pickle and `str` for json), and `pickle.loads` turns them back, `datetime` and all: no `isoformat`, no `fromisoformat`. The `s` names follow `json.loads` and `tomllib.loads` (lessons 5.3 and 5.5): `dumps`/`loads` work on bytes in memory, `dump`/`load` on an open file.

**Read the provided file before you run it.** It's harmless, and the habit isn't.

- `class Gift` has one method, `__reduce__`. It's one of Python's special double-underscore names: pickle calls it, if a class has one, to ask "how should an object of yours be rebuilt?" The answer is a pair: a function, and a tuple of arguments to call it with. `Gift` answers: `print`, with a message.
- `("This pickle ... files.",)` is a tuple of **one** item. The comma makes it a tuple; without it, the brackets would only group, and it would be a plain string. `tuple[str]` is that type: exactly one `str`. And `tuple[object, tuple[str]]` is the pair, a function (any object) and those arguments.
- `with open("gift.pickle", "wb") as file:` opens the file for **w**riting **b**ytes (pickles are bytes, not text; lesson 5.5's `"rb"` was the reading side), and `with` closes it at the end of the block, even if an exception is raised inside: the reliable way to make sure a file is closed.
- `pickle.dump(Gift(), file)` asks the `Gift` how to rebuild it, and writes the answer into the file.

Now make the file, then load it, as a game would load a scores file:

```powershell
.venv\Scripts\python make_gift.py
.venv\Scripts\python -c "import pickle; from pathlib import Path; pickle.loads(Path('gift.pickle').read_bytes())"
```

```text
made gift.pickle
This pickle just ran code on your computer. It could as easily have deleted your files.
```

**Understand: what's inside a pickle.** Python can show you, with the standard `pickletools` module:

```powershell
.venv\Scripts\python -m pickletools gift.pickle
```

```text
    0: \x80 PROTO      5
    2: \x95 FRAME      116
   11: \x8c SHORT_BINUNICODE 'builtins'
   21: \x94 MEMOIZE    (as 0)
   22: \x8c SHORT_BINUNICODE 'print'
   29: \x94 MEMOIZE    (as 1)
   30: \x93 STACK_GLOBAL
   31: \x94 MEMOIZE    (as 2)
   32: \x8c SHORT_BINUNICODE 'This pickle just ran code on your computer. It could as easily have deleted your files.'
  121: \x94 MEMOIZE    (as 3)
  122: \x85 TUPLE1
  123: \x94 MEMOIZE    (as 4)
  124: R    REDUCE
  125: \x94 MEMOIZE    (as 5)
  126: .    STOP
highest protocol among opcodes = 4
```

A pickle isn't data in the way JSON is: it's a small **program**, one instruction per line, for a simple machine that keeps a **stack** of values: a list where you only ever add to the end (**push**) or take from the end (**pop**), like a pile of plates. Skip `PROTO`, `FRAME` and `MEMOIZE` (housekeeping), and the last line (a summary), and four instructions are left:

```text
SHORT_BINUNICODE 'builtins', 'print'   push two strings
STACK_GLOBAL                           import builtins, get print: push the function
SHORT_BINUNICODE '...'  TUPLE1         push the message, wrap it in a one-item tuple
REDUCE                                 call the function with the tuple: print(...)
```

The stack after each one:

```text
after                       stack
'builtins', 'print'         ['builtins', 'print']
STACK_GLOBAL                [<print>]                       two strings popped, the function pushed
the message                 [<print>, 'This pickle...']
TUPLE1                      [<print>, ('This pickle...',)]  the message popped, a tuple pushed
REDUCE                      [None]                          both popped, print called, its result pushed
```

`REDUCE` calls a function, and the file chooses which. A file made by someone else can name any function in Python instead: one that deletes files, or downloads and runs a program. Nothing is checked first, because pickle can't tell rebuilding an object from anything else a function might do. Python's documentation opens with a warning: **never unpickle data you didn't write yourself**, or that could have been changed by anyone else.

An ordinary object, like a `Score`, is rebuilt differently, and it's worth knowing how: the pickle says "import `breakout.scores`, get `Score`, make an **empty** one (`NEWOBJ`), then set its fields to these values (`BUILD`)". `Score.__init__` is never called. See it for yourself:

```powershell
.venv\Scripts\python -c "import pickle, pickletools; from datetime import UTC, datetime; from breakout.scores import Score; pickletools.dis(pickletools.optimize(pickle.dumps(Score('Classic', 560, datetime(2026, 10, 4, tzinfo=UTC)))))"
```

(`pickletools.optimize` leaves out the `MEMOIZE` housekeeping.) Find `STACK_GLOBAL` after `'breakout.scores'` and `'Score'`, then `NEWOBJ`, the empty object, and near the end `BUILD`, which sets its fields from the values pushed in between. Inside, the `datetime` is rebuilt with `REDUCE`, a function call, like the gift. Any check you put in `__init__`, or in a dataclass's `__post_init__`, is skipped on loading: whatever the file says, the object holds.

Two more costs. A pickle can only be read by Python, so no other program or language can use the scores. And it stores **where the class lives** (`breakout.scores`, `Score`): rename the module or the class and every saved file stops loading. A format you design yourself, like the JSON from lesson 6.1, has neither problem.

So is pickle ever right? Yes: for data your own program writes and reads back, with the same code, and nobody else can touch, like a cache, or the objects Python's `multiprocessing` sends between its own processes. Never for downloads, or saves that players share. `eval` (which runs a string as Python) and `yaml.load` without a safe loader share the danger, and ruff's `S301` rule flags `pickle.loads` for the same reason as lesson 6.4's `S608`.

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

**Understand: how this happens.** `write_text` opens the file for writing, and opening a file for writing **empties it first**: the old scores are gone before the first new byte arrives. Then the new text goes to disk in pieces, as the operating system gets to it. See both in the REPL, in a scratch file:

```text
>>> from pathlib import Path
>>> p = Path("scratch/w.txt")
>>> p.write_text("hello")
5
>>> f = open(p, "w")
>>> p.stat().st_size
0
>>> f.write("abc")
3
>>> p.stat().st_size
0
>>> f.close()
>>> p.stat().st_size
3
```

(`p.stat().st_size` is the file's size on disk, in bytes.) Five bytes, then **zero** the moment it's opened for writing. After `write`, still zero: Python collected the three bytes in memory, a **buffer**, to write them later in one go, which is much faster than one at a time. They reached the disk on `close()`. Python and the operating system both buffer, so when each piece of a file actually lands is out of your program's hands. If the game crashes or the power goes off partway through, the file holds only the first part of the new text, and none of the old. That's this file: the second score was being written when it stopped, after its points and before its time.

```powershell
.venv\Scripts\breakout --test-run 10 --scores tests/data/broken-scores.json
```

```text
Traceback (most recent call last):
  ...
json.decoder.JSONDecodeError: Expecting property name enclosed in double quotes: line 10 column 1 (char 135)
```

The game won't start at all, because of a file it only needs for one number on the screen. And a file someone edited by hand is worse in a quieter way: with `"points": "lots"`, `load_scores` makes a `Score` whose points are a string, nothing complains, and the screen shows `Best lots`. A dataclass doesn't check its fields; lesson 6.1's code trusts the file completely.

A file the tests need, kept in the project, is a **test data file** (you'll also hear "fixture file"; pytest's *fixtures*, like `tmp_path`, are something else, and lesson 6.5 writes your own). It's committed, unlike `scores.json`, because it's part of the tests.

```check
file tests/data/broken-scores.json
```

## Scores checked at the boundary

**Build:** read and write the scores file with pydantic, so what comes in is checked.

`Score` stays a dataclass. Lesson 5.4 checked a `BaseModel`; pydantic can check other types too, through a **type adapter**:

```python file=breakout/scores.py
"""The scores players have made, kept in a file between games."""

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from pydantic import TypeAdapter


@dataclass(frozen=True)
class Score:
    level: str
    points: int
    when: datetime


SCORES = TypeAdapter(list[Score])


def load_scores(path: Path) -> list[Score]:
    if not path.exists():
        return []
    return SCORES.validate_json(path.read_bytes())


def save_scores(path: Path, scores: list[Score]) -> None:
    path.write_bytes(SCORES.dump_json(scores, indent=2))


def add_score(path: Path, score: Score) -> None:
    save_scores(path, [*load_scores(path), score])


def best(scores: list[Score], level: str) -> int | None:
    return max((score.points for score in scores if score.level == level), default=None)
```

**Understand.** First, a `TypeAdapter` on its own, with a simpler type, in the REPL:

```text
>>> from pydantic import TypeAdapter
>>> ints = TypeAdapter(list[int])
>>> ints.validate_json(b'[1, 2, "3"]')
[1, 2, 3]
>>> ints.validate_json(b'[1, "x"]')
Traceback (most recent call last):
  ...
pydantic_core._pydantic_core.ValidationError: 1 validation error for list[int]
1
  Input should be a valid integer, unable to parse string as an integer [...]
>>> ints.dump_json([1, 2])
b'[1,2]'
```

It reads JSON and checks it in one step (`"3"` quietly became `3`: lax mode again), reports where a problem is (`1`, the second item: positions count from 0), and writes JSON too. **`TypeAdapter(list[Score])`** gives the same checking to any type, not only a `BaseModel`: here, a list of the `Score` dataclass. pydantic reads the dataclass's fields and types the same way it reads a model's. `SCORES` is made once, when the module is imported, because building the checker takes work (pydantic reads the type's fields and builds a validator in pydantic-core, as lesson 5.4 described), and every load and save then reuses it.

- `SCORES.validate_json(...)` reads JSON and checks it against the type, returning a `list[Score]` or raising `ValidationError`.
- `SCORES.dump_json(scores, indent=2)` writes the list as JSON. pydantic knows how to write a `datetime` as ISO 8601 and read it back, so lesson 6.1's conversions are gone, and the file is the same format, except that pydantic writes UTC as `Z` (another ISO 8601 spelling of `+00:00`).

Both work on **bytes**, not text: `read_bytes` and `write_bytes`. JSON files are UTF-8 by the JSON standard, so pydantic decodes and encodes them itself, as `tomllib` did with TOML in lesson 5.5. There's no `encoding=` to forget.

The edited file from the last step is refused now:

```powershell
.venv\Scripts\python -c "import json; from breakout.scores import SCORES; print(SCORES.validate_json(json.dumps([{'level': 'Classic', 'points': 'lots', 'when': '2026-10-04T15:30:05Z'}])))"
```

```text
pydantic_core._pydantic_core.ValidationError: 1 validation error for list[Score]
0.points
  Input should be a valid integer, unable to parse string as an integer [type=int_parsing, input_value='lots', input_type=str]
```

But this is pydantic's default, **lax** mode (lesson 5.4), and it lets two things through. A time with no zone:

```powershell
.venv\Scripts\python -c "import json; from breakout.scores import SCORES; print(SCORES.validate_json(json.dumps([{'level': 'Classic', 'points': 5, 'when': '2026-10-04T15:30:05'}])))"
```

```text
[Score(level='Classic', points=5, when=datetime.datetime(2026, 10, 4, 15, 30, 5))]
```

And points written as text:

```powershell
.venv\Scripts\python -c "import json; from breakout.scores import SCORES; print(SCORES.validate_json(json.dumps([{'level': 'Classic', 'points': '5', 'when': '2026-10-04T15:30:05Z'}])))"
```

```text
[Score(level='Classic', points=5, when=datetime.datetime(2026, 10, 4, 15, 30, 5, tzinfo=TzInfo(0)))]
```

`"5"` was quietly turned into `5`. The next step closes both.

```check
contains breakout/scores.py "SCORES = TypeAdapter(list[Score])"
run ".venv/Scripts/python -c \"import json; from breakout.scores import SCORES; print(SCORES.validate_json(json.dumps([{'level': 'Classic', 'points': 'lots', 'when': '2026-10-04T15:30:05Z'}])))\"" exit=1 stderr="Input should be a valid integer" label="points that aren't a number are refused"
run ".venv/Scripts/python -m pytest -q tests/test_scores.py" stdout="5 passed" label="the scores tests still pass: same behaviour, less code"
```

## Strict, and always with a time zone

**Build:** strict checking for a score, and a time that must say its zone.

```python file=breakout/scores.py
"""The scores players have made, kept in a file between games."""

from dataclasses import dataclass
from pathlib import Path

from pydantic import AwareDatetime, ConfigDict, TypeAdapter


@dataclass(frozen=True)
class Score:
    __pydantic_config__ = ConfigDict(strict=True, extra="forbid")

    level: str
    points: int
    when: AwareDatetime


SCORES = TypeAdapter(list[Score])


def load_scores(path: Path) -> list[Score]:
    if not path.exists():
        return []
    return SCORES.validate_json(path.read_bytes())


def save_scores(path: Path, scores: list[Score]) -> None:
    path.write_bytes(SCORES.dump_json(scores, indent=2))


def add_score(path: Path, score: Score) -> None:
    save_scores(path, [*load_scores(path), score])


def best(scores: list[Score], level: str) -> int | None:
    return max((score.points for score in scores if score.level == level), default=None)
```

**Understand.** **`AwareDatetime`** is a `datetime` that must include a time zone; it's from pydantic, which arranges for pyright to see a plain `datetime` while pydantic adds the check at run time. A naive time (lesson 6.1) is refused, so every score in the file is a moment that can be compared with every other.

**`__pydantic_config__`** is lesson 5.4's `model_config` for a dataclass: a class attribute, with exactly this name, that pydantic looks for. It has no type annotation, so the dataclass doesn't make it a field. `strict=True` refuses `"5"` for an `int`; `extra="forbid"` refuses a field `Score` doesn't have. For a dataclass, pydantic words that one differently from lesson 5.4's models: a level with `"bonus": 1` is refused with `bonus: Unexpected keyword argument`, not `Extra inputs are not permitted`, because a dataclass is filled in like a function call.

```powershell
.venv\Scripts\python -c "import json; from breakout.scores import SCORES; print(SCORES.validate_json(json.dumps([{'level': 'Classic', 'points': 5, 'when': '2026-10-04T15:30:05'}])))"
.venv\Scripts\python -c "import json; from breakout.scores import SCORES; print(SCORES.validate_json(json.dumps([{'level': 'Classic', 'points': '5', 'when': '2026-10-04T15:30:05Z'}])))"
```

```text
0.when
  Input should have timezone info [type=timezone_aware, input_value='2026-10-04T15:30:05', input_type=str]
0.points
  Input should be a valid integer [type=int_type, input_value='5', input_type=str]
```

Strict mode still reads `"2026-10-04T15:30:05Z"` as a `datetime`: JSON has no date type, so a date in JSON is always a string, and pydantic accepts an ISO 8601 string there even in strict mode.

**What's checked, and what isn't.** Only data coming **in** through `SCORES` is checked. Unlike lesson 5.4's `BaseModel`, a dataclass created in code, `Score("Classic", 560, ...)`, isn't checked by pydantic; pyright checks it instead, before the code runs. Both together cover both directions: pyright for what your code creates, pydantic for what arrives from outside.

```check
contains breakout/scores.py "when: AwareDatetime"
run ".venv/Scripts/python -c \"import json; from breakout.scores import SCORES; print(SCORES.validate_json(json.dumps([{'level': 'Classic', 'points': 5, 'when': '2026-10-04T15:30:05'}])))\"" exit=1 stderr="Input should have timezone info" label="a time with no zone is refused"
```

## Every problem, in words

**Build:** one `ScoresError` that names every problem, in words a player can follow.

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

**Understand.** `ScoresError` and the `try`/`except` follow lesson 5.4's `LevelError`: catch pydantic's `ValidationError`, and raise one error holding a line for every problem, `from None` so the player sees only that.

`describe` differs in one way. A scores file is a list, so most locations start with a position: `(0, "points")` is the `points` of item 0. People count scores from 1, so each `int` part becomes `score` and the position plus 1, with the conditional expression from lesson 5.2; a `str` part, a field name, stays as it is. Traced:

```text
loc               parts                   joined
(0, "points")     ["score 1", "points"]   "score 1, points"
(1, "when")       ["score 2", "when"]     "score 2, when"
()                []                      "" or "the file" = "the file"
```

The empty location is a problem with the whole file: not JSON at all, or not a list.

To see it, write a scores file with one good score and one bad one, and load it. `scores.json` in the project is ignored by Git (lesson 6.1), so it's a safe place to try things:

```powershell
.venv\Scripts\python -c "import json; from pathlib import Path; from breakout.scores import load_scores; p = Path('scores.json'); p.write_text(json.dumps([{'level': 'Classic', 'points': 5, 'when': '2026-10-04T15:30:05Z'}, {'level': 'Classic', 'points': 'lots'}]), encoding='utf-8'); load_scores(p)"
```

```text
breakout.scores.ScoresError: score 2, points: Input should be a valid integer; score 2, when: Field required
```

The first score is fine; the second has two problems, and both are named.

```check
contains breakout/scores.py "class ScoresError(ValueError):"
run ".venv/Scripts/python -c \"import json; from pathlib import Path; from breakout.scores import load_scores; p = Path('scores.json'); p.write_text(json.dumps([{'level': 'Classic', 'points': 5, 'when': '2026-10-04T15:30:05Z'}, {'level': 'Classic', 'points': 'lots'}]), encoding='utf-8'); load_scores(p)\"" exit=1 stderr="score 2, points: Input should be a valid integer; score 2, when: Field required" label="every problem, with which score and which field"
run ".venv/Scripts/python -m pytest -q tests/test_scores.py" stdout="5 passed"
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

**Understand.** `DATA = Path(__file__).parent / "data"` finds the test data folder from the test file's own location (lesson 5.1's rule), and `test_a_file_cut_off_while_it_was_saved_is_refused` uses the broken file. The parametrised test covers the ways a person editing the file could get it wrong, one case each:

```text
the file holds                                  refused because                    location
{"level": "Classic"}                             an object, not a list              the file
[{... "points": "lots" ...}]                     points not a whole number          score 1, points
[{... "when": "2026-10-04T15:30:05"}]            a time with no zone                score 1, when
[{"level": "Classic", "points": 5}]             no time at all                     score 1, when
```

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

**Optional, ★★.** The broken file came from a save cut off partway. Make `save_scores` **atomic**: either the whole new file is there afterwards, or the old one is, never half of either. The standard way is to write the new content to a temporary file **in the same folder**, then replace the old file with it in one step, with `os.replace(temporary, path)`, which the operating system does all at once. Name the temporary file from the real one (`path.with_suffix(".tmp")`), and think about what should happen to it if writing fails. There's no automatic check, but you can write one: pytest's `monkeypatch` fixture replaces something for one test only, so `monkeypatch.setattr(Path, "write_bytes", fails_halfway)` (or whatever your code writes with) can make the write fail, and the test then checks the old file is unchanged. Lesson 6.3's database does this for you, and much more.

## Challenge: pin the policy

**Optional, ★.** The Your turn's policy, "warn, and don't touch the file", is only checked by hand. Pin it: a characterisation test that copies `broken-scores.json` into `tmp_path`, plays ten frames with `--scores` pointing at the copy, and asserts the exit code is 0, `stderr` contains `playing without keeping scores`, and the copy's bytes are unchanged (`read_bytes()` before and after). On a branch.

## Challenge: rescue what's left

**Optional, ★★.** Add `python -m breakout.scores repair BROKEN NEW`: read a broken scores file, keep every score that can still be read, and write them to a **new** file, never over the original. It needs the file's JSON to be readable, so first decide what to do when it isn't. On a branch.

## Challenge: a pickle that only opens what you allow

**Optional, ★★★.** Subclass `pickle.Unpickler` and override `find_class(module, name)` to allow only `breakout.scores.Score` and the `datetime` classes, raising `pickle.UnpicklingError` for anything else. Show that `gift.pickle` (make it again) is refused and a pickled `Score` loads. Then explain, in a comment, why this is still weaker than JSON plus validation: what does an allowed class's data still get to do? On a branch.

## What did we actually learn?

- **pickle runs code when it loads.** Never unpickle a file you didn't write. It's also Python-only and tied to your class names.
- **Files you wrote yourself still arrive from outside**: crashes cut them off, people edit them. Check them at the boundary like any other input.
- **`TypeAdapter`** checks any type, including plain dataclasses; **`AwareDatetime`** refuses naive times.
- **pyright checks what your code creates; pydantic checks what comes in.**
- **Failure policy follows purpose**: a bad level stops the game; bad scores are reported, skipped, and left untouched.
- **Test data files**, committed in `tests/data`, found from the test file's own location.
- `with` closes a file however its block ends.

C# had its own pickle, `BinaryFormatter`, which ran into exactly this problem: Microsoft marked it dangerous and then removed it from .NET entirely, and tells programs to use `System.Text.Json` instead. Java's built-in serialisation (`ObjectInputStream`) has been behind a long line of remote-code-execution attacks for the same reason, and its own architects have called it a mistake. In every language: data formats you design, checked when they're read.
