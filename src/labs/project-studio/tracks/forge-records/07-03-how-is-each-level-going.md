---
reference: optional
title: 7.3 — How Is Each Level Going?
runtime: python
run: breakout/__main__.py
---

The report tool from lesson 6.4 answers one question at a time: how one level's games have gone. A level designer wants the whole picture, every level in one table, and every number in it worked out by the database in a single query. That's what **grouping** does: split the rows into groups that share a value, and work out a total, a count or an average for each group. Along the way, `NULL` turns out to change sums and averages in a way that's easy to miss, and costly when it's missed.

## The scores module so far

**Build:** make sure `breakout/scores.py` matches the end of lesson 7.2, the reference answer to its Your turn.

```python file=breakout/scores.py
"""The scores players have made, kept in an SQLite database between games."""

import sqlite3
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

# Every change to the database's design, in order. A database's version is how many of them it has had,
# kept in the file as PRAGMA user_version. New ones go at the end; one that has shipped is never changed.
MIGRATIONS = [
    # 1: players and their scores (lesson 7.1). IF NOT EXISTS, so files made before versions existed fit.
    """
    CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE CHECK (name <> '')
    ) STRICT;
    CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY,
        player_id INTEGER NOT NULL REFERENCES players (id),
        level TEXT NOT NULL,
        points INTEGER NOT NULL CHECK (points >= 0),
        played_at TEXT NOT NULL
    ) STRICT;
    """,
    # 2: whether the game was won. Scores saved before this are NULL: nobody recorded it.
    """
    ALTER TABLE scores ADD COLUMN won INTEGER CHECK (won IN (0, 1));
    """,
]


@dataclass(frozen=True)
class Score:
    player: str
    level: str
    points: int
    when: datetime
    won: bool | None = None


def open_scores(path: Path) -> sqlite3.Connection:
    db = sqlite3.connect(path)
    db.execute("PRAGMA foreign_keys = ON")
    migrate(db)
    return db


def migrate(db: sqlite3.Connection) -> None:
    """Bring the database up to the newest design, one migration at a time, each completely or not at all."""
    (version,) = db.execute("PRAGMA user_version").fetchone()
    for number in range(version + 1, len(MIGRATIONS) + 1):
        try:
            db.executescript(f"BEGIN; {MIGRATIONS[number - 1]} PRAGMA user_version = {number}; COMMIT;")
        except sqlite3.Error:
            db.rollback()
            raise


def add_score(db: sqlite3.Connection, score: Score) -> None:
    with db:
        db.execute("INSERT INTO players (name) VALUES (?) ON CONFLICT (name) DO NOTHING", (score.player,))
        db.execute(
            "INSERT INTO scores (player_id, level, points, played_at, won) "
            "SELECT id, ?, ?, ?, ? FROM players WHERE name = ?",
            (score.level, score.points, score.when.isoformat(), score.won, score.player),
        )


def load_scores(db: sqlite3.Connection) -> list[Score]:
    rows = db.execute(
        """
        SELECT players.name, scores.level, scores.points, scores.played_at, scores.won
        FROM scores JOIN players ON players.id = scores.player_id
        ORDER BY scores.id
        """
    )
    return [
        Score(name, level, points, datetime.fromisoformat(played_at), None if won is None else bool(won))
        for name, level, points, played_at, won in rows
    ]


def best(db: sqlite3.Connection, level: str) -> int | None:
    (points,) = db.execute("SELECT MAX(points) FROM scores WHERE level = ?", (level,)).fetchone()
    return points
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_wins.py" stdout="3 passed"
```

## The app so far

**Build:** make sure `breakout/app.py` matches the end of lesson 7.2, too.

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
    except (OSError, UnicodeDecodeError, ConfigError) as error:
        print(f"breakout: {settings.config}: {error}", file=sys.stderr)
        sys.exit(1)
    controls = config.controls
    level_file = settings.level or config.level or LEVELS / "classic.json"
    player = settings.player or config.player
    try:
        level = load_level(level_file)
    except (OSError, UnicodeDecodeError, LevelError) as error:
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
            add_score(db, Score(player, level.name, game.score, datetime.now(UTC), game.state == GameState.WON))
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

```check
run ".venv/Scripts/python -m pytest -q" stdout="121 passed"
```

## Groups, by hand

**Build:** a practice database with six games in it, and questions about each level.

Open the SQL shell on a new practice file:

```powershell
.venv\Scripts\python -m sqlite3 stats.db
```

Make a small scores table and six games: four on Classic, one on Castle, one on a level called Tiny. Two of the games have `NULL` in `won`, because nobody recorded the result:

```sql
CREATE TABLE scores (id INTEGER PRIMARY KEY, level TEXT NOT NULL, points INTEGER NOT NULL, won INTEGER) STRICT;
INSERT INTO scores (level, points, won) VALUES ('Classic', 560, 1), ('Classic', 70, 0), ('Castle', 150, 0), ('Classic', 40, 0), ('Classic', 310, NULL), ('Tiny', 20, NULL);
```

**One group per level.** `GROUP BY level` sorts the rows into groups, one for each different `level`, and then each aggregate (lesson 6.3) is worked out once per group instead of once for the whole table:

```sql
SELECT level, COUNT(*), MAX(points), AVG(points) FROM scores GROUP BY level ORDER BY level;
```

```text
('Castle', 1, 150, 150.0)
('Classic', 4, 560, 245.0)
('Tiny', 1, 20, 20.0)
```

Traced: first the rows are put in groups by their `level`, then each group becomes one row of the answer:

```text
group      rows in it (points)        COUNT(*)   MAX(points)   AVG(points)
Castle     150                        1          150           150 / 1 = 150.0
Classic    560, 70, 40, 310           4          560           980 / 4 = 245.0
Tiny       20                         1          20            20 / 1 = 20.0
```

Without `GROUP BY`, the same aggregates make one row for the whole table: `SELECT COUNT(*), MAX(points) FROM scores` gives `(6, 560)`. Notice `245.0`: `AVG` always gives a real number, a number with a decimal point, even when every value is a whole number. Lesson 7.4 meets a division that doesn't.

**What can go next to `GROUP BY`.** Each column in the `SELECT` must have one value per group: either the column the groups are made from (`level`), or an aggregate over the group. `SELECT level, points FROM scores GROUP BY level` asks for "the points" of a group of four games, which has no single answer. Most databases refuse it; SQLite answers with the points of one of the group's rows, and doesn't promise which. Treat it as a mistake that SQLite happens not to report. There's one exception, and lesson 7.4 uses it: when you group by a table's **primary key**, every row in a group is the same row of that table, so its other columns *do* have one value per group. `GROUP BY sessions.id` lets you select `sessions.started_at` safely, and PostgreSQL, strict about this rule, accepts it too.

**Aggregates skip `NULL`.** Predict, then ask:

```predict
question: The Classic group's `won` values are 1, 0, 0 and NULL. What does `AVG(won)` give for Classic?
choice: 0.25: one win in four games
choice: 0.333...: one win in three games
choice: NULL, because one of the values is NULL
answer: 0.333...: one win in three games
explain: Every aggregate except `COUNT(*)` skips `NULL`. `AVG(won)` adds the three known values (1 + 0 + 0 = 1) and divides by how many there are, 3. The game with no recorded result simply isn't counted, as if it had never been played. That's often right for an average ("of the games we know about, a third were won"), but it's a choice, and the query makes it silently.
```

```sql
SELECT level, COUNT(*), COUNT(won), SUM(won), AVG(won) FROM scores GROUP BY level ORDER BY level;
```

```text
('Castle', 1, 1, 0, 0.0)
('Classic', 4, 3, 1, 0.3333333333333333)
('Tiny', 1, 0, None, None)
```

- `COUNT(*)` counts rows; `COUNT(won)` counts the rows where `won` isn't `NULL`. For Classic, 4 games, 3 of them with a known result.
- For Tiny, every `won` is `NULL`, so `SUM(won)` has nothing to add and gives `NULL`, not 0. "No known results" isn't "no wins", and SQL keeps them apart. Python code reading this gets `None`. Keep that in mind for the next step.

**Comparing with `NULL`.** `NULL` means "unknown", and SQL takes that seriously: is an unknown value equal to 1? Unknown. So any comparison with `NULL` gives `NULL`, not true or false, and `WHERE` keeps only rows where its condition is true:

```sql
SELECT NULL = NULL, NULL IS NULL, 1 = NULL;
SELECT COUNT(*) FROM scores WHERE won = NULL;
SELECT COUNT(*) FROM scores WHERE won IS NULL;
SELECT COUNT(*) FROM scores WHERE won <> 1;
```

```text
(None, 1, None)
(0,)
(2,)
(3,)
```

- `NULL = NULL` is `NULL`: two unknowns aren't known to be equal. `won = NULL` is never true, so it matches nothing, not even the two rows whose `won` is `NULL`.
- **`IS NULL`** is the test for "is this unknown?", and is always true or false; **`IS NOT NULL`** is its opposite. Lesson 7.4 uses both.
- `won <> 1` ("not won") gives 3, not 5: the two games with no recorded result are neither won nor not won, as far as SQL knows, so they're left out. A count of "games not won" that silently skips the unknown ones is exactly the kind of mistake this lesson is about.

True, false and unknown: SQL's logic has three values, where Python's has two.

**Choosing groups: `HAVING`.** `WHERE` filters **rows**, before they're grouped; `HAVING` filters **groups**, after the aggregates are worked out, so it can test them:

```sql
SELECT level, COUNT(*) FROM scores WHERE points >= 100 GROUP BY level ORDER BY level;
```

```text
('Castle', 1)
('Classic', 2)
```

```sql
SELECT level, COUNT(*) FROM scores GROUP BY level HAVING COUNT(*) >= 2;
```

```text
('Classic', 4)
```

The first counts only the games of 100 points or more in each level: the rows with fewer were dropped before grouping, so Classic has 2 and Tiny has none left at all. The second keeps every row, groups them, and then keeps only the groups with at least 2 games. `WHERE COUNT(*) >= 2` would be an error: when `WHERE` runs, no group exists yet to count. The whole order:

```text
FROM → WHERE (rows) → GROUP BY → aggregates → HAVING (groups) → SELECT → ORDER BY
```

Type `.quit` to leave the shell.

```check
run ".venv/Scripts/python -m sqlite3 stats.db \"SELECT level, COUNT(*), MAX(points) FROM scores GROUP BY level ORDER BY level\"" stdout="('Classic', 4, 560)" label="stats.db has the six practice games"
run ".venv/Scripts/python -m sqlite3 stats.db \"SELECT SUM(won) FROM scores WHERE level = 'Tiny'\"" stdout="(None,)" label="Tiny has no known results"
```

## Every level at once

**Build:** the report tool prints a line for every level when it's given no level name.

```python file=breakout/report.py
"""Level reports for level designers: how a level's games have gone. Written by a teammate.

usage: python -m breakout.report SCORES_DB                  every level, one line each
       python -m breakout.report SCORES_DB LEVEL            how the level's games have gone
       python -m breakout.report SCORES_DB LEVEL --forget   delete the level's scores
"""

import sqlite3
import sys


def report(db: sqlite3.Connection, level: str) -> str:
    played, best, average = db.execute(
        "SELECT COUNT(*), MAX(points), AVG(points) FROM scores WHERE level = ?", (level,)
    ).fetchone()
    if played == 0:
        return f"{level}: no scores yet"
    return f"{level}: {played} played, best {best}, average {average:.0f}"


def level_table(db: sqlite3.Connection) -> list[str]:
    rows = db.execute(
        """
        SELECT level, COUNT(*), SUM(won), MAX(points), AVG(points)
        FROM scores
        GROUP BY level
        ORDER BY level
        """
    )
    return [
        f"{level}: {played} played, {wins} won, best {best}, average {average:.0f}"
        for level, played, wins, best, average in rows
    ]


def forget(db: sqlite3.Connection, level: str) -> int:
    with db:
        return db.execute("DELETE FROM scores WHERE level = ?", (level,)).rowcount


if __name__ == "__main__":
    db = sqlite3.connect(sys.argv[1])
    if len(sys.argv) == 2:
        for line in level_table(db):
            print(line)
    elif "--forget" in sys.argv[3:]:
        print(f"forgot {forget(db, sys.argv[2])} scores")
    else:
        print(report(db, sys.argv[2]))
    db.close()
```

**Understand.** `level_table` is the shell's query with one more aggregate, `SUM(won)`, the number of games won, since a won game stores 1 and a lost one 0. Each row of the result is a tuple of five values, unpacked in the comprehension and turned into one line of text. `ORDER BY level` sorts the lines by name, so the table comes out the same every time.

The command line: `sys.argv` (lesson 2.3) holds the program's name and then its arguments, so `len(sys.argv) == 2` means "a database and nothing else", and the tool prints `level_table` one line at a time. With a level name too, it does what it did before. Try it on the practice file:

```powershell
.venv\Scripts\python -m breakout.report stats.db
```

```text
Castle: 1 played, 0 won, best 150, average 150
Classic: 4 played, 1 won, best 560, average 245
Tiny: 1 played, None won, best 20, average 20
```

`None won`: Tiny's `SUM(won)` is `NULL`, it reaches Python as `None`, and the f-string writes it as it is. A designer reading the table can't tell whether that means "no wins" or a bug.

```check
contains breakout/report.py "GROUP BY level"
run ".venv/Scripts/python -m breakout.report stats.db" stdout="Classic: 4 played, 1 won, best 560, average 245" label="every level, one line each"
```

## Nothing known, counted as 0

**Build:** count a level with no recorded results as 0 wins.

```python file=breakout/report.py
"""Level reports for level designers: how a level's games have gone. Written by a teammate.

usage: python -m breakout.report SCORES_DB                  every level, one line each
       python -m breakout.report SCORES_DB LEVEL            how the level's games have gone
       python -m breakout.report SCORES_DB LEVEL --forget   delete the level's scores
"""

import sqlite3
import sys


def report(db: sqlite3.Connection, level: str) -> str:
    played, best, average = db.execute(
        "SELECT COUNT(*), MAX(points), AVG(points) FROM scores WHERE level = ?", (level,)
    ).fetchone()
    if played == 0:
        return f"{level}: no scores yet"
    return f"{level}: {played} played, best {best}, average {average:.0f}"


def level_table(db: sqlite3.Connection) -> list[str]:
    rows = db.execute(
        """
        SELECT level, COUNT(*), COALESCE(SUM(won), 0), MAX(points), AVG(points)
        FROM scores
        GROUP BY level
        ORDER BY level
        """
    )
    return [
        f"{level}: {played} played, {wins} won, best {best}, average {average:.0f}"
        for level, played, wins, best, average in rows
    ]


def forget(db: sqlite3.Connection, level: str) -> int:
    with db:
        return db.execute("DELETE FROM scores WHERE level = ?", (level,)).rowcount


if __name__ == "__main__":
    db = sqlite3.connect(sys.argv[1])
    if len(sys.argv) == 2:
        for line in level_table(db):
            print(line)
    elif "--forget" in sys.argv[3:]:
        print(f"forgot {forget(db, sys.argv[2])} scores")
    else:
        print(report(db, sys.argv[2]))
    db.close()
```

**Understand.** **`COALESCE(a, b, ...)`** gives the first of its arguments that isn't `NULL`. On its own, in the shell (any database will do, `stats.db` for instance): `SELECT COALESCE(NULL, 0), COALESCE(5, 0), COALESCE(NULL, NULL, 'x'), COALESCE(NULL, NULL);` gives `(0, 5, 'x', None)`: the first value that's known, or `NULL` if none is. `COALESCE(SUM(won), 0)` is the sum when there is one, and 0 when the sum is `NULL`. Traced for the three levels:

```text
level     SUM(won)   COALESCE(SUM(won), 0)
Castle    0          0       (0 isn't NULL: kept)
Classic   1          1
Tiny      NULL       0       (NULL: the next argument, 0)
```

Is 0 honest for Tiny? The column says how many games are **known** to have been won, and that's 0. The average below it and `COUNT(*)` still say a game was played. If the designers ever need "how many results are unknown", that's `COUNT(*) - COUNT(won)`, another column, not a reason to print `None`.

```powershell
.venv\Scripts\python -m breakout.report stats.db
```

```text
Castle: 1 played, 0 won, best 150, average 150
Classic: 4 played, 1 won, best 560, average 245
Tiny: 1 played, 0 won, best 20, average 20
```

```check
contains breakout/report.py "COALESCE(SUM(won), 0)"
run ".venv/Scripts/python -m breakout.report stats.db" stdout="Tiny: 1 played, 0 won, best 20, average 20" label="no recorded result counts as 0 won"
```

## Tests for the table

**Build:** two tests for `level_table`, at the end of `tests/test_report.py`.

```python file=tests/test_report.py
import sqlite3
from datetime import UTC, datetime

from breakout.report import forget, level_table, report
from breakout.scores import Score, add_score, load_scores

WHEN = datetime(2026, 10, 4, 15, 30, 5, tzinfo=UTC)
INJECTION = "x' OR '1'='1"


def add_games(db: sqlite3.Connection, *levels: str) -> None:
    """One 100-point game by Mia on each of these levels."""
    for level in levels:
        add_score(db, Score("Mia", level, 100, WHEN))


def test_a_level_with_an_apostrophe_is_reported(db: sqlite3.Connection):
    add_games(db, "Bob's Castle")
    assert report(db, "Bob's Castle") == "Bob's Castle: 1 played, best 100, average 100"


def test_sql_in_a_level_name_is_only_a_name(db: sqlite3.Connection):
    add_games(db, "Classic", "Castle")
    assert report(db, INJECTION) == f"{INJECTION}: no scores yet"


def test_forgetting_a_name_with_sql_in_it_deletes_nothing(db: sqlite3.Connection):
    add_games(db, "Classic", "Castle")
    assert forget(db, INJECTION) == 0
    assert len(load_scores(db)) == 2


def test_every_level_gets_one_line_in_name_order(db: sqlite3.Connection):
    add_score(db, Score("Mia", "Classic", 560, WHEN, True))
    add_score(db, Score("Sam", "Classic", 40, WHEN, False))
    add_score(db, Score("Mia", "Castle", 150, WHEN, False))
    assert level_table(db) == [
        "Castle: 1 played, 0 won, best 150, average 150",
        "Classic: 2 played, 1 won, best 560, average 300",
    ]


def test_a_level_whose_results_nobody_recorded_has_0_won(db: sqlite3.Connection):
    add_games(db, "Tiny")
    assert level_table(db) == ["Tiny: 1 played, 0 won, best 100, average 100"]
```

**Understand.** The first test has three games on two levels, given out of order, and checks the lines come back sorted, with each count, best and average right: Classic's average is (560 + 40) / 2 = 300. The second uses the file's `add_games` helper, whose games are made without `won`, so their result is `None`, unknown: it's the Tiny case, pinned down.

```check
run ".venv/Scripts/python -m pytest -q tests/test_report.py" stdout="5 passed"
run ".venv/Scripts/python -m pytest -q" stdout="123 passed"
```

## Your turn: only the levels played often enough

**Build, on your own:** let `level_table` leave out levels with too few games to judge.

A level played once tells a designer nothing: one lucky game, one bad one. Click **Create provided tests/test_busy_levels.py**: their request, written as tests.

```python file=tests/test_busy_levels.py provided
"""A level designer's request, written as tests: only the levels played often enough to judge."""

import sqlite3
from datetime import UTC, datetime

from breakout.report import level_table
from breakout.scores import Score, add_score

WHEN = datetime(2026, 10, 5, 12, 0, 0, tzinfo=UTC)


def play(db: sqlite3.Connection, level: str, times: int) -> None:
    for _ in range(times):
        add_score(db, Score("Mia", level, 100, WHEN, False))


def test_every_level_is_listed_when_no_minimum_is_given(db: sqlite3.Connection):
    play(db, "Castle", 1)
    play(db, "Classic", 3)
    assert level_table(db) == [
        "Castle: 1 played, 0 won, best 100, average 100",
        "Classic: 3 played, 0 won, best 100, average 100",
    ]


def test_only_levels_played_at_least_that_often_are_listed(db: sqlite3.Connection):
    play(db, "Castle", 1)
    play(db, "Classic", 3)
    assert level_table(db, min_played=2) == ["Classic: 3 played, 0 won, best 100, average 100"]


def test_a_minimum_no_level_reaches_lists_nothing(db: sqlite3.Connection):
    play(db, "Classic", 3)
    assert level_table(db, min_played=10) == []
```

| Call | Result |
|---|---|
| `level_table(db)` | every level, as now |
| `level_table(db, min_played=2)` | only levels with at least 2 games |
| `level_table(db, min_played=10)` | `[]` when no level has 10 |

Do the choosing in the SQL, with the clause that filters groups, and pass the number with a `?` placeholder: the database should never send back rows only for Python to throw them away. When all 126 tests pass and every check is clean, commit with a message that mentions **HAVING**.

```hints
nudge: Which clause filters groups instead of rows? Where in the query does it go, compared with `GROUP BY` and `ORDER BY`?
concept: `HAVING COUNT(*) >= ?` keeps only the groups with at least that many rows. It goes after `GROUP BY` and before `ORDER BY`. A placeholder needs its value passed as a tuple, `(min_played,)` with the comma (lesson 6.2), as the second argument to `execute`. A parameter with a default, `min_played: int = 1`, keeps every existing call working: every level has at least 1 game, so 1 leaves nothing out.
shape: `def level_table(db: sqlite3.Connection, min_played: int = 1) -> list[str]:`, one more line in the query, and `(min_played,)` after the query string, inside `execute(...)`.
answer: ~~~python
def level_table(db: sqlite3.Connection, min_played: int = 1) -> list[str]:
    rows = db.execute(
        """
        SELECT level, COUNT(*), COALESCE(SUM(won), 0), MAX(points), AVG(points)
        FROM scores
        GROUP BY level
        HAVING COUNT(*) >= ?
        ORDER BY level
        """,
        (min_played,),
    )
    return [
        f"{level}: {played} played, {wins} won, best {best}, average {average:.0f}"
        for level, played, wins, best, average in rows
    ]
~~~

`WHERE COUNT(*) >= ?` fails with `misuse of aggregate: COUNT()`: when `WHERE` runs, there are only rows, no groups to count. Filtering the list in Python afterwards would pass the tests, but the database would still work out and send every level's numbers for nothing, and with thousands of levels that's real work thrown away.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_busy_levels.py" stdout="3 passed" label="the designers' request is met"
contains breakout/report.py "HAVING" -- Choose the groups in SQL, with HAVING, not in Python afterwards.
run ".venv/Scripts/python -m pytest -q" stdout="126 passed"
run ".venv/Scripts/python -m pyright breakout tests replay.py" stdout="0 errors"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
git-message "HAVING"
git-clean
```

## Challenge: how many are unknown?

**Optional, ★.** Add an `unknown` column to `level_table`: the games whose result wasn't recorded, `COUNT(*) - COUNT(won)`. Test it with one game whose `won` is `None`. On a branch. (The report reads whatever file it's given with a plain `sqlite3.connect`: on a file from before lesson 7.2 it fails with `no such column: won`. Opening it with `open_scores` instead would migrate it first.)

## Challenge: a table of players

**Optional, ★★.** Add `player_table(db)`: one line per player with their games, wins and best score, joining `scores` to `players` (lesson 7.1) and grouping by `players.name`, with a `HAVING` that leaves out players with no wins. Test it. On a branch.

## Challenge: a win rate

**Optional, ★★.** Show each level's win rate as a percentage, worked out in SQL: `ROUND(AVG(won) * 100, 1)`. Decide what to print when every result is unknown (`AVG` of nothing known is `NULL`), and test that case. On a branch.

## What did we actually learn?

- **`GROUP BY`** splits rows into groups that share a value; aggregates then give one answer per group.
- **Only grouped columns and aggregates** belong next to `GROUP BY`; SQLite allows more, and the answer is then one row's value, chosen for you.
- **Aggregates skip `NULL`** (all but `COUNT(*)`): averages leave unknown values out, and the sum of nothing known is `NULL`, not 0.
- **`NULL` is unknown**: comparisons with it are unknown too, so test it with `IS NULL` / `IS NOT NULL`, never `= NULL`.
- **`COALESCE`** chooses a value for `NULL`, deliberately.
- **`WHERE` filters rows, `HAVING` filters groups**: `FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY`.
- **Let the database do the work** it's built for, and send back only what's needed.

The same `GROUP BY` and `HAVING` are in every SQL database, and in C#'s LINQ (`GroupBy`, then `Where` on the groups) and Java's streams (`Collectors.groupingBy`). Spreadsheet pivot tables are the same idea with a mouse.
