---
title: 6.3 — Tables
runtime: python
run: breakout/__main__.py
---

The scores file works, but look at what `add_score` does to add one score: read every score, add one, write every score back. A thousand games in, that's a thousand scores rewritten to add one. Two games open at once each read the list, each add their own score, and whichever saves second silently deletes the other's. A save cut off halfway leaves a broken file (lesson 6.2). And answering "what's the best score on the Castle?" means loading every score into memory first. These aren't bugs in your code: they're the limits of one file holding everything. A **database** is a program built to remove them. This lesson uses **SQLite**, a complete database in one file, built into Python, and the language almost every database speaks: **SQL**.

## The app so far

**Build:** make sure `breakout/app.py` matches the end of lesson 6.2, the reference answer to its Your turn.

```python file=breakout/app.py
import os
import random
import sys
from datetime import UTC, datetime
from pathlib import Path

import pygame

from breakout.config import KEYS, Config, ConfigError, load_config
from breakout.draw import draw
from breakout.level import LEVELS, LevelError, load_level
from breakout.model import HEIGHT, WIDTH, Game, GameState, autopilot
from breakout.scores import Score, ScoresError, add_score, best, load_scores
from breakout.settings import Hold, parse_args


def main(args: list[str]) -> None:
    settings = parse_args(args)
    seed = settings.seed
    if settings.test_frames is not None:
        os.environ["SDL_VIDEODRIVER"] = "dummy"
        if seed is None:
            seed = 0
    rng = random.Random(seed)
    try:
        config = load_config(settings.config) if settings.config else Config()
    except (OSError, ConfigError) as error:
        print(f"breakout: {settings.config}: {error}", file=sys.stderr)
        sys.exit(1)
    controls = config.controls
    level_file = settings.level or config.level or LEVELS / "classic.json"
    try:
        level = load_level(level_file)
    except (OSError, LevelError) as error:
        print(f"breakout: {level_file}: {error}", file=sys.stderr)
        sys.exit(1)
    game = Game(rng, level.bricks(), level.lives)
    if settings.test_frames is not None:
        game.start()
    scores_file = settings.scores
    if scores_file is None and settings.test_frames is None:
        scores_file = Path(pygame.system.get_pref_path("forge", "breakout")) / "scores.json"
    best_score = None
    if scores_file:
        try:
            best_score = best(load_scores(scores_file), level.name)
        except (OSError, ScoresError) as error:
            print(f"breakout: {scores_file}: {error}; playing without keeping scores", file=sys.stderr)
            scores_file = None

    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption(f"Breakout: {level.name}")
    clock = pygame.time.Clock()
    font = pygame.font.Font(None, 36)

    frames = 0
    running = True
    while running:
        if settings.test_frames is None:
            dt = clock.tick(60) / 1000
        elif frames == settings.lag_at:
            dt = 0.5
        else:
            dt = 1 / 60

        for event in pygame.event.get():
            if event.type == pygame.QUIT or event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                running = False
            elif event.type == pygame.KEYDOWN and event.key == KEYS[controls.serve]:
                if game.state in (GameState.OVER, GameState.WON):
                    game = Game(rng, level.bricks(), level.lives)
                game.start()
            elif event.type == pygame.KEYDOWN and event.key == KEYS[controls.pause]:
                game.toggle_pause()

        direction = 0
        if settings.test_frames is None:
            keys = pygame.key.get_pressed()
            if keys[KEYS[controls.left]]:
                direction -= 1
            if keys[KEYS[controls.right]]:
                direction += 1
        elif settings.hold == Hold.LEFT:
            direction = -1
        elif settings.hold == Hold.RIGHT:
            direction = 1
        elif settings.hold == Hold.AUTO:
            direction = autopilot(game.ball, game.paddle)
        before = game.state
        game.update(direction, dt)
        if scores_file and game.state != before and game.state in (GameState.OVER, GameState.WON):
            add_score(scores_file, Score(level.name, game.score, datetime.now(UTC)))
            best_score = best(load_scores(scores_file), level.name)

        draw(screen, font, game, best_score)
        pygame.display.flip()

        frames += 1
        if settings.test_frames is not None and frames >= settings.test_frames:
            running = False

    pygame.quit()
    if settings.test_frames is not None:
        inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(game.ball.rect())
        print(
            f"frames={frames} paddle_x={game.paddle.rect().x} score={game.score} lives={game.lives} "
            f"bricks={len(game.bricks)} inside={inside}"
        )


def run() -> None:
    main(sys.argv[1:])
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="106 passed"
```

## Databases you test with aren't committed

**Build:** ignore every `.db` file: the scores you make by hand, and a database to practise in.

```text file=.gitignore
# Generated: rebuilt from requirements.txt with python -m venv .venv
.venv/

# Generated: Python's compiled bytecode
__pycache__/

# Generated: package metadata, written by pip install -e .
*.egg-info/

# Generated: coverage data, written by pytest --cov
.coverage
.coverage.*

# Scores saved by games you test by hand, and databases you practise SQL in
scores.json
*.db
```

`*.db` matches any file whose name ends in `.db`, in any folder.

```check
git-ignored scores.db -- Add *.db to .gitignore.
git-ignored practice.db
```

## SQL, by hand

**Build:** a table of scores in a practice database, made by typing SQL.

Python comes with a small SQL **shell** for SQLite. Open one on a new database file:

```powershell
.venv\Scripts\python -m sqlite3 practice.db
```

```text
sqlite3 shell, running on SQLite version 3.50.4
Connected to 'practice.db'
...
sqlite>
```

`practice.db` didn't exist, so SQLite creates it. At the `sqlite>` prompt, type each **statement** below, ending with `;`, and press Enter. The version number may differ; nothing else will.

**A table.** A database holds **tables**: rows of data, every row with the same **columns**, every column with a name and a type. Create one:

```sql
CREATE TABLE scores (
    id INTEGER PRIMARY KEY,
    level TEXT NOT NULL,
    points INTEGER NOT NULL CHECK (points >= 0),
    played_at TEXT NOT NULL
) STRICT;
```

- `id INTEGER PRIMARY KEY`: the **primary key**, a value that identifies exactly one row, never shared by two. Leave it out when you add a row, and SQLite gives each new row the next number.
- `level TEXT NOT NULL`: text, and `NOT NULL` means every row must have one. `NULL` is SQL's "no value", its `None`.
- `points INTEGER NOT NULL CHECK (points >= 0)`: a whole number that must be at least 0. A `CHECK` **constraint** is a rule the database itself enforces, whatever program writes to it.
- `played_at TEXT NOT NULL`: SQLite has no date type, so dates are stored as ISO 8601 text (lesson 6.1), which sorts correctly as text.
- `STRICT`: without it, SQLite will store any value in any column, a string in `points` included. A `STRICT` table refuses a value it can't store as the column's type. It's not quite pydantic's strict mode: text that is exactly a whole number, like `'5'`, is quietly converted and stored as the number 5; only text like `'lots'` is refused.

**Rows.** Add three:

```sql
INSERT INTO scores (level, points, played_at) VALUES ('Classic', 560, '2026-10-04T15:30:05+00:00');
INSERT INTO scores (level, points, played_at) VALUES ('Classic', 70, '2026-10-04T15:41:00+00:00');
INSERT INTO scores (level, points, played_at) VALUES ('Castle', 150, '2026-10-05T09:02:30+00:00');
```

In SQL, text values go in **single** quotes. Now ask questions. `SELECT` chooses columns; `FROM` says which table; `*` means every column:

```sql
SELECT * FROM scores;
```

```text
(1, 'Classic', 560, '2026-10-04T15:30:05+00:00')
(2, 'Classic', 70, '2026-10-04T15:41:00+00:00')
(3, 'Castle', 150, '2026-10-05T09:02:30+00:00')
```

Each row comes back as a Python tuple. `WHERE` keeps only the rows that match; `ORDER BY ... DESC` sorts, highest first (**desc**ending); `LIMIT` keeps the first few:

```sql
SELECT level, points FROM scores WHERE level = 'Classic' ORDER BY points DESC LIMIT 1;
```

```text
('Classic', 560)
```

Read it as a pipeline, each part working on what the one before it left:

```text
FROM scores                 (1, Classic, 560)  (2, Classic, 70)  (3, Castle, 150)
WHERE level = 'Classic'     (1, Classic, 560)  (2, Classic, 70)
ORDER BY points DESC        (1, Classic, 560)  (2, Classic, 70)      560 before 70
LIMIT 1                     (1, Classic, 560)
SELECT level, points        ('Classic', 560)
```

And SQL can calculate over many rows at once with **aggregate functions**: `MAX`, `MIN`, `COUNT`, `SUM`, `AVG`:

```sql
SELECT MAX(points), COUNT(*) FROM scores WHERE level = 'Classic';
```

```text
(560, 2)
```

`MAX(points)` is the largest `points` among the rows `WHERE` kept. `COUNT(*)` counts those rows: the `*` means "whole rows", not any one column. One row comes back, however many rows went in.

Last, try to break a rule:

```sql
INSERT INTO scores (level, points, played_at) VALUES ('Classic', -5, '2026-10-05T10:00:00+00:00');
```

```text
IntegrityError (SQLITE_CONSTRAINT_CHECK): CHECK constraint failed: points >= 0
```

The database refuses, and nothing is added. And a value of the wrong type:

```sql
INSERT INTO scores (level, points, played_at) VALUES ('Classic', 'lots', '2026-10-05T10:00:00+00:00');
```

```text
IntegrityError (unknown): cannot store TEXT value in INTEGER column scores.points
```

That's `STRICT` at work. Type `.quit` to leave the shell.

**Understand: what you just did.** SQL is **declarative**: `SELECT MAX(points) ... WHERE level = 'Classic'` says *what* you want, not how to find it. The database decides how: which rows to read, in what order, using what shortcuts (Chapter 7 measures one, an **index**). That's the opposite of the Python you've written, where every loop says exactly how. It's why one short SQL statement can replace a loop over every score in memory.

```predict
question: Two copies of Breakout use the JSON scores file of lesson 6.1. Both start, so both read the same three scores. Copy A's game ends and saves; then copy B's game ends and saves. How many scores are in the file?
answer: 4
explain: A saves the three it read plus its own: four. B saves the three **it** read, which don't include A's, plus its own: also four, written over A's file. A's score is gone, and nothing reported an error. This is called a **lost update**, and it happens whenever two writers each read, change and write back the whole thing. A database avoids it because each `INSERT` adds one row to what's there **now**, rather than writing back a copy read earlier.
verify: .venv/Scripts/python -c "a = ['x', 'y', 'z']; b = list(a); a = a + ['A']; b = b + ['B']; print(len(b))"
```

```check
run ".venv/Scripts/python -m sqlite3 practice.db \"SELECT MAX(points), COUNT(*) FROM scores WHERE level = 'Classic'\"" stdout="(560, 2)" label="practice.db holds the three scores you added"
```

## The scores module, on SQLite

**Build:** a scores module that opens a database, and makes sure the table is there.

This replaces the whole JSON version: `TypeAdapter`, `ScoresError` and `describe` all go. The app still imports the old names, so `breakout` won't start until "The app opens the database", three steps on; the checks until then use the module on its own.

```python file=breakout/scores.py
"""The scores players have made, kept in an SQLite database between games."""

import sqlite3
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY,
    level TEXT NOT NULL,
    points INTEGER NOT NULL CHECK (points >= 0),
    played_at TEXT NOT NULL
) STRICT
"""


@dataclass(frozen=True)
class Score:
    level: str
    points: int
    when: datetime


def open_scores(path: Path) -> sqlite3.Connection:
    db = sqlite3.connect(path)
    db.execute(SCHEMA)
    return db
```

**Understand.** `SCHEMA` is the `CREATE TABLE` from the practice, as a string, with one addition: `IF NOT EXISTS`, so running it creates the table the first time and does nothing every time after. The **schema** is the design of the tables: their names, columns, types and rules. `Score` is back to a plain dataclass, with a plain `datetime`.

**`open_scores(path)`** opens the database file, creating it if needed: `sqlite3.connect` returns a **connection**, the program's line to the database. `db.execute(SCHEMA)` runs one SQL statement through it. Then the connection is returned, for the rest of the program to use.

```powershell
.venv\Scripts\python -c "from pathlib import Path; from breakout.scores import open_scores; open_scores(Path('scores.db')).close()"
.venv\Scripts\python -m sqlite3 scores.db "SELECT sql FROM sqlite_schema"
```

```text
('CREATE TABLE scores (\n    id INTEGER PRIMARY KEY,\n    level TEXT NOT NULL,\n    points INTEGER NOT NULL CHECK (points >= 0),\n    played_at TEXT NOT NULL\n) STRICT',)
```

`sqlite_schema` is a table SQLite keeps about the database itself: one row per table, with the SQL that made it. The table is there, made by your code.

`sqlite3.connect` doesn't read the file, it only opens it. A file that isn't a database is noticed on the first `execute`:

```powershell
.venv\Scripts\python -c "import sqlite3; db = sqlite3.connect('tests/data/broken-scores.json'); print('connected'); db.execute('SELECT 1')"
```

```text
connected
...
sqlite3.DatabaseError: file is not a database
```

So in `open_scores`, it's `db.execute(SCHEMA)` that raises for a bad file: worth knowing when the app decides what to catch.

```check
contains breakout/scores.py "def open_scores(path: Path) -> sqlite3.Connection:"
contains breakout/scores.py "STRICT"
run ".venv/Scripts/python -c \"from pathlib import Path; from breakout.scores import open_scores; db = open_scores(Path(':memory:')); print(db.execute('SELECT COUNT(*) FROM scores').fetchone())\"" stdout="(0,)" label="open_scores makes the table"
```

The check opens `Path(":memory:")`: that name is special to SQLite, a database held in memory only, gone when it's closed, so checking never leaves anything behind.

## Adding a score, in a transaction

**Build:** add one score with an `INSERT`.

```python file=breakout/scores.py
"""The scores players have made, kept in an SQLite database between games."""

import sqlite3
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY,
    level TEXT NOT NULL,
    points INTEGER NOT NULL CHECK (points >= 0),
    played_at TEXT NOT NULL
) STRICT
"""


@dataclass(frozen=True)
class Score:
    level: str
    points: int
    when: datetime


def open_scores(path: Path) -> sqlite3.Connection:
    db = sqlite3.connect(path)
    db.execute(SCHEMA)
    return db


def add_score(db: sqlite3.Connection, score: Score) -> None:
    with db:
        db.execute(
            "INSERT INTO scores (level, points, played_at) VALUES (?, ?, ?)",
            (score.level, score.points, score.when.isoformat()),
        )
```

**Understand.** The values aren't written into the SQL text. Each `?` is a **placeholder**, and the values are passed separately, as a tuple. The database fills them in itself, **in order**, as values, never as SQL:

```text
INSERT INTO scores (level,        points,        played_at)
VALUES             (?,            ?,             ?)
                    score.level   score.points   score.when.isoformat()
```

The first `?` takes the first item of the tuple, and so on: positions, not names. Swap two items, and `STRICT` refuses `'Classic'` as `points`. A single value is still a tuple, with the comma of lesson 6.2: `(level,)`. Why placeholders matter so much is the next lesson.

**`with db:`** makes the `INSERT` a **transaction**: everything inside the block happens completely or not at all. At the end of the block the transaction is **committed**, made permanent on disk; if an exception is raised inside it, it's **rolled back**, as if nothing happened. The database writes changes so that a crash at any moment leaves either the old data or the new, never half: lesson 6.2's challenge, done for you.

Careful: this `with` is not lesson 6.2's `with open(...)`. Leaving `with db:` commits or rolls back, and the connection **stays open**, ready for the next statement. Closing it is still `db.close()`. And a change that's never committed is thrown away. Add one score inside a transaction, then one without, and look:

```powershell
.venv\Scripts\python -c "from datetime import UTC, datetime; from pathlib import Path; from breakout.scores import Score, add_score, open_scores; db = open_scores(Path('scores.db')); add_score(db, Score('Classic', 70, datetime(2026, 10, 4, 15, 41, tzinfo=UTC))); db.close()"
.venv\Scripts\python -c "from pathlib import Path; from breakout.scores import open_scores; db = open_scores(Path('scores.db')); db.execute('INSERT INTO scores (level, points, played_at) VALUES (?, ?, ?)', ('Castle', 150, '2026-10-05T09:02:30+00:00')); db.close()"
.venv\Scripts\python -m sqlite3 scores.db "SELECT * FROM scores"
```

```text
(1, 'Classic', 70, '2026-10-04T15:41:00+00:00')
```

One row. The second `INSERT` ran without an error, but nothing committed it, so closing the connection rolled it back. Every change to the database goes through a transaction, and `with db:` is how this module makes sure each one ends.

```check
contains breakout/scores.py "with db:"
run ".venv/Scripts/python -c \"from datetime import UTC, datetime; from pathlib import Path; from breakout.scores import open_scores; db = open_scores(Path(':memory:')); from breakout.scores import Score, add_score; add_score(db, Score('Classic', 70, datetime.now(UTC))); print(db.execute('SELECT level, points FROM scores').fetchone())\"" stdout="('Classic', 70)" label="add_score puts a row in the table"
```

## Reading the scores back

**Build:** read every score, in the order they were added, and leave a place for the best score.

```python file=breakout/scores.py
"""The scores players have made, kept in an SQLite database between games."""

import sqlite3
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY,
    level TEXT NOT NULL,
    points INTEGER NOT NULL CHECK (points >= 0),
    played_at TEXT NOT NULL
) STRICT
"""


@dataclass(frozen=True)
class Score:
    level: str
    points: int
    when: datetime


def open_scores(path: Path) -> sqlite3.Connection:
    db = sqlite3.connect(path)
    db.execute(SCHEMA)
    return db


def add_score(db: sqlite3.Connection, score: Score) -> None:
    with db:
        db.execute(
            "INSERT INTO scores (level, points, played_at) VALUES (?, ?, ?)",
            (score.level, score.points, score.when.isoformat()),
        )


def load_scores(db: sqlite3.Connection) -> list[Score]:
    rows = db.execute("SELECT level, points, played_at FROM scores ORDER BY id")
    return [Score(level, points, datetime.fromisoformat(played_at)) for level, points, played_at in rows]


def best(db: sqlite3.Connection, level: str) -> int | None:
    raise NotImplementedError("lesson 6.3's Your turn")
```

**Understand.** `db.execute(...)` returns a **cursor**: an object that hands out the rows of a result one at a time. Two ways to take them:

- **Loop over it**, as `load_scores` does: each row is a tuple of the columns asked for, here unpacked as `level, points, played_at`.
- **`.fetchone()`**: the next row, as a tuple, or `None` if there are no rows left. For a query that always gives exactly one row, like a `COUNT(*)`, it's the whole answer.

```powershell
.venv\Scripts\python -c "from pathlib import Path; from breakout.scores import load_scores, open_scores; db = open_scores(Path('scores.db')); print(db.execute('SELECT COUNT(*) FROM scores').fetchone()); print(load_scores(db))"
```

```text
(1,)
[Score(level='Classic', points=70, when=datetime.datetime(2026, 10, 4, 15, 41, tzinfo=datetime.timezone.utc))]
```

`(1,)` is a row of one column, so a tuple of one. To get the 1 itself, unpack it, as lesson 5.1's tests unpacked a list of one brick: `(count,) = row`.

`ORDER BY id` matters: SQL promises **no** order for rows unless you ask for one, so without it the scores could come back in any order.

**`best`** isn't written yet: it's the Your turn. `raise NotImplementedError(...)` makes it fail loudly, with a message saying why, if anything calls it before then.

**What's checked now?** `STRICT` refuses text in `points`, and `CHECK` refuses negative points, when the data is written, by any program. Not everything: `played_at` is `TEXT`, so the database would take `'yesterday'` or a time with no zone, and `datetime.fromisoformat` would then fail on loading, or return a naive time. That's acceptable only because every row is written by `add_score`, from a `datetime` your code made. The database checks what it can; the rest relies on there being one way in.

```check
run ".venv/Scripts/python -c \"from pathlib import Path; from breakout.scores import open_scores; db = open_scores(Path(':memory:')); from breakout.scores import load_scores; print(load_scores(db))\"" stdout="[]" label="a new database has no scores"
```

## The app opens the database

**Build:** the app keeps its scores in `scores.db`.

```python file=breakout/app.py
import os
import random
import sqlite3
import sys
from datetime import UTC, datetime
from pathlib import Path

import pygame

from breakout.config import KEYS, Config, ConfigError, load_config
from breakout.draw import draw
from breakout.level import LEVELS, LevelError, load_level
from breakout.model import HEIGHT, WIDTH, Game, GameState, autopilot
from breakout.scores import Score, add_score, best, open_scores
from breakout.settings import Hold, parse_args


def main(args: list[str]) -> None:
    settings = parse_args(args)
    seed = settings.seed
    if settings.test_frames is not None:
        os.environ["SDL_VIDEODRIVER"] = "dummy"
        if seed is None:
            seed = 0
    rng = random.Random(seed)
    try:
        config = load_config(settings.config) if settings.config else Config()
    except (OSError, ConfigError) as error:
        print(f"breakout: {settings.config}: {error}", file=sys.stderr)
        sys.exit(1)
    controls = config.controls
    level_file = settings.level or config.level or LEVELS / "classic.json"
    try:
        level = load_level(level_file)
    except (OSError, LevelError) as error:
        print(f"breakout: {level_file}: {error}", file=sys.stderr)
        sys.exit(1)
    game = Game(rng, level.bricks(), level.lives)
    if settings.test_frames is not None:
        game.start()
    scores_file = settings.scores
    if scores_file is None and settings.test_frames is None:
        scores_file = Path(pygame.system.get_pref_path("forge", "breakout")) / "scores.db"
    db = None
    best_score = None
    if scores_file:
        try:
            db = open_scores(scores_file)
            best_score = best(db, level.name)
        except sqlite3.Error as error:
            print(f"breakout: {scores_file}: {error}; playing without keeping scores", file=sys.stderr)
            db = None

    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption(f"Breakout: {level.name}")
    clock = pygame.time.Clock()
    font = pygame.font.Font(None, 36)

    frames = 0
    running = True
    while running:
        if settings.test_frames is None:
            dt = clock.tick(60) / 1000
        elif frames == settings.lag_at:
            dt = 0.5
        else:
            dt = 1 / 60

        for event in pygame.event.get():
            if event.type == pygame.QUIT or event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                running = False
            elif event.type == pygame.KEYDOWN and event.key == KEYS[controls.serve]:
                if game.state in (GameState.OVER, GameState.WON):
                    game = Game(rng, level.bricks(), level.lives)
                game.start()
            elif event.type == pygame.KEYDOWN and event.key == KEYS[controls.pause]:
                game.toggle_pause()

        direction = 0
        if settings.test_frames is None:
            keys = pygame.key.get_pressed()
            if keys[KEYS[controls.left]]:
                direction -= 1
            if keys[KEYS[controls.right]]:
                direction += 1
        elif settings.hold == Hold.LEFT:
            direction = -1
        elif settings.hold == Hold.RIGHT:
            direction = 1
        elif settings.hold == Hold.AUTO:
            direction = autopilot(game.ball, game.paddle)
        before = game.state
        game.update(direction, dt)
        if db and game.state != before and game.state in (GameState.OVER, GameState.WON):
            add_score(db, Score(level.name, game.score, datetime.now(UTC)))
            best_score = best(db, level.name)

        draw(screen, font, game, best_score)
        pygame.display.flip()

        frames += 1
        if settings.test_frames is not None and frames >= settings.test_frames:
            running = False

    pygame.quit()
    if db:
        db.close()
    if settings.test_frames is not None:
        inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(game.ball.rect())
        print(
            f"frames={frames} paddle_x={game.paddle.rect().x} score={game.score} lives={game.lives} "
            f"bricks={len(game.bricks)} inside={inside}"
        )


def run() -> None:
    main(sys.argv[1:])
```

**Understand.** The app opens the database once, at the start, and keeps the connection, `db`, for the whole run: every finished game is one `add_score`. It's closed after the game loop. The policy from lesson 6.2 stays: if the database can't be opened (`sqlite3.Error` is the parent of every error the `sqlite3` module raises), warn and play without keeping scores. `db = None` in the `except` matters: `open_scores` raised before returning, so `db` was never set to a connection, but setting it again says plainly that from here on there's no database, and `if db` checks it, like `if scores_file` did.

Every finished game calls `best(db, level.name)`, which still raises `NotImplementedError`: a game played with a scores database stops at its end until the Your turn. Test runs without `--scores` keep none and never call it.

```powershell
.venv\Scripts\breakout --test-run 10 --scores tests/data/broken-scores.json
```

```text
breakout: tests\data\broken-scores.json: file is not a database; playing without keeping scores
frames=10 ...
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_characterisation.py" stdout="11 passed"
run ".venv/Scripts/breakout --test-run 10 --scores tests/data/broken-scores.json" stderr="file is not a database; playing without keeping scores" label="a file that isn't a database is reported, not fatal"
```

## Tests against a real database

**Build:** the scores tests, for a database.

```python file=tests/test_scores.py
"""What the scores database must do, and what it must refuse."""

import sqlite3
from datetime import UTC, datetime
from pathlib import Path

import pytest

from breakout.scores import Score, add_score, best, load_scores, open_scores

WIN = Score("Classic", 400, datetime(2026, 10, 4, 15, 30, 5, tzinfo=UTC))
LOSS = Score("Classic", 70, datetime(2026, 10, 4, 15, 41, 0, tzinfo=UTC))
CASTLE = Score("Castle", 150, datetime(2026, 10, 5, 9, 2, 30, tzinfo=UTC))
DATA = Path(__file__).parent / "data"


def test_a_new_database_has_no_scores(tmp_path: Path):
    db = open_scores(tmp_path / "scores.db")
    assert load_scores(db) == []
    db.close()


def test_scores_come_back_exactly_as_they_were_saved(tmp_path: Path):
    db = open_scores(tmp_path / "scores.db")
    add_score(db, WIN)
    add_score(db, CASTLE)
    assert load_scores(db) == [WIN, CASTLE]
    db.close()


def test_scores_are_still_there_when_the_database_is_opened_again(tmp_path: Path):
    db = open_scores(tmp_path / "scores.db")
    add_score(db, WIN)
    db.close()
    db = open_scores(tmp_path / "scores.db")
    assert load_scores(db) == [WIN]
    db.close()


def test_the_best_score_is_the_highest_on_that_level(tmp_path: Path):
    db = open_scores(tmp_path / "scores.db")
    for score in [LOSS, CASTLE, WIN]:
        add_score(db, score)
    assert best(db, "Classic") == 400
    db.close()


def test_a_level_never_played_has_no_best(tmp_path: Path):
    db = open_scores(tmp_path / "scores.db")
    add_score(db, WIN)
    assert best(db, "Castle") is None
    db.close()


def test_negative_points_are_refused_by_the_database(tmp_path: Path):
    db = open_scores(tmp_path / "scores.db")
    with pytest.raises(sqlite3.IntegrityError):
        add_score(db, Score("Classic", -5, WIN.when))
    assert load_scores(db) == []
    db.close()


def test_a_file_that_is_not_a_database_is_refused():
    with pytest.raises(sqlite3.DatabaseError):
        open_scores(DATA / "broken-scores.json")
```

```powershell
.venv\Scripts\python -m pytest -q tests/test_scores.py
```

```text
FAILED tests/test_scores.py::test_the_best_score_is_the_highest_on_that_level - NotImplementedError: lesson 6.3's Your turn
FAILED tests/test_scores.py::test_a_level_never_played_has_no_best - NotImplementedError: lesson 6.3's Your turn
2 failed, 5 passed
```

**Understand.** Every test makes a **real** SQLite database in its own `tmp_path`: not a pretend one, so the tests check the real SQL, the real constraints and the real file. `test_scores_are_still_there_when_the_database_is_opened_again` checks the point of the whole chapter: close it, open it again, and the score is still there. `test_negative_points_are_refused_by_the_database` checks the `CHECK` constraint and that a refused `INSERT` leaves nothing behind. And the cut-off JSON file from lesson 6.2 has a new use: it's a file that isn't a database.

Every test repeats the same two lines, open at the start and `db.close()` at the end, and a test that fails before its last line never closes its database at all. Lesson 6.5 fixes both.

```check
run ".venv/Scripts/python -m pytest -q tests/test_scores.py" exit=1 stdout="2 failed, 5 passed" label="everything but the best score works"
```

## Your turn: the best score, in SQL

**Build, on your own:** write `best(db, level)` with one SQL query, so that every scores test passes.

| Test | Expects |
|---|---|
| `test_the_best_score_is_the_highest_on_that_level` | 400, from scores of 70 and 400 on the Classic and 150 on the Castle |
| `test_a_level_never_played_has_no_best` | `None` |

Let the database do the work: no loop in Python, and no `load_scores`. Pass the level with a `?` placeholder, as `add_score` does. Then play a game to the end with `--scores scores.db`, and ask the database yourself:

```powershell
.venv\Scripts\python -m sqlite3 scores.db "SELECT * FROM scores"
```

When all 103 tests pass and every check is clean, commit with a message that mentions **SQLite**.

```hints
nudge: You wrote this query in the practice shell. What did it return, and what type is that in Python?
concept: `db.execute(sql, values)` returns a cursor; `.fetchone()` gives the first row as a tuple, here a tuple of one value, like `(400,)`. `MAX` over no rows at all is `NULL`, which comes back as `None`: exactly what a level never played should give. The values for the placeholders must be a tuple even when there's only one, and a tuple of one is written with a comma: `(level,)`. Without the comma, `(level)` is just `level`, a string, and sqlite3 treats each of its letters as a separate value.
shape: One `db.execute("SELECT MAX(points) FROM scores WHERE level = ?", (level,))`, then `.fetchone()`, then take the one value out of the row and return it. Unpacking a one-item tuple: `(points,) = row`.
answer: ~~~python
def best(db: sqlite3.Connection, level: str) -> int | None:
    (points,) = db.execute("SELECT MAX(points) FROM scores WHERE level = ?", (level,)).fetchone()
    return points
~~~

`(points,) = ...` unpacks the row and fails loudly if it ever doesn't have exactly one value. Returning the row itself, `(400,)`, is the commonest slip: it's not equal to `400`, and the test says so. Without `WHERE`, `MAX` would be over every level, and a level never played would get another level's best.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_scores.py" stdout="7 passed" label="every scores test passes"
run ".venv/Scripts/breakout --test-run 10000 --hold auto --scores scores.db" stdout="score=560" label="a won game is saved in the database"
run ".venv/Scripts/python -m sqlite3 scores.db \"SELECT MAX(points) FROM scores WHERE level = 'Classic'\"" stdout="(560,)" label="the database holds the win"
run ".venv/Scripts/python -m pytest -q" stdout="103 passed"
run ".venv/Scripts/python -m pyright breakout tests replay.py" stdout="0 errors"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
git-message "SQLite"
git-clean
```

## What did we actually learn?

- **One file holding everything** means rewriting it all, lost updates, and half-written saves. A **database** is built to avoid them.
- **SQL**: `CREATE TABLE` with types, `PRIMARY KEY`, `NOT NULL`, `CHECK` and `STRICT`; `INSERT`; `SELECT ... FROM ... WHERE ... ORDER BY ... LIMIT`; aggregates like `MAX` and `COUNT`. It's **declarative**: say what, and the database works out how.
- **Constraints** are rules the database enforces for every program that writes to it.
- **Transactions**: `with db:` commits all or rolls back all.
- **Placeholders**: values passed separately from the SQL, `?` and a tuple. A tuple of one needs its comma.
- **Tests against a real database** in a temporary folder, not a pretend one.

The scores saved by lessons 6.1 and 6.2 in the JSON file aren't moved into the database: for a game no one has released, starting again is fine. Once players have data, moving it is a job of its own, called a **migration**, and Chapter 17 does one.

C# talks to SQLite through `Microsoft.Data.Sqlite`, and to other databases through the same **ADO.NET** interface: a connection, a command, `@level` parameters instead of `?`, and a transaction. Java's equivalent is **JDBC**: `Connection`, `PreparedStatement` with `?` placeholders, exactly like this lesson's. The SQL itself barely changes between them: it's a language of its own, and the one thing every one of these programs has in common.
