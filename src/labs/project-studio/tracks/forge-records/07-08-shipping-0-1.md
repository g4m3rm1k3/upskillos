---
reference: optional
title: 7.8 — Shipping 0.1
runtime: python
run: breakout/__main__.py
---

Since lesson 4.3, `pyproject.toml` has said `version = "0.1.0"`: a promise more than a fact, because nothing marked what 0.1.0 was. This lesson keeps the promise. Shipping a version is more than the code: you look at what was actually built against what was planned (a **sprint review**), write down what changed for the people using it (a **changelog**), check that it works somewhere other than your own folder, mark the exact commit that **is** 0.1.0 (a **tag**), and then look back at how the work went, so the next stretch goes better (a **retrospective**). There's no new Python in this lesson: it's the part of software engineering that happens around the code.

## The scores module so far

**Build:** make sure `breakout/scores.py` matches the end of lesson 7.7, the reference answer to its Your turn.

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
    # 3: play sessions. Scores saved before sessions existed belong to none: their session_id is NULL.
    """
    CREATE TABLE sessions (
        id INTEGER PRIMARY KEY,
        player_id INTEGER NOT NULL REFERENCES players (id),
        started_at TEXT NOT NULL,
        ended_at TEXT
    ) STRICT;
    ALTER TABLE scores ADD COLUMN session_id INTEGER REFERENCES sessions (id);
    """,
    # 4: a score in a session must be the session's player's (lesson 7.5). SQLite can't add a rule to a table
    # that exists, so scores is rebuilt: a new table with the rule, every row copied in, the old one replaced.
    """
    UPDATE scores SET session_id = NULL
    WHERE session_id IS NOT NULL
      AND player_id <> (SELECT player_id FROM sessions WHERE sessions.id = scores.session_id);
    CREATE UNIQUE INDEX sessions_id_player ON sessions (id, player_id);
    CREATE TABLE scores_new (
        id INTEGER PRIMARY KEY,
        player_id INTEGER NOT NULL REFERENCES players (id),
        level TEXT NOT NULL,
        points INTEGER NOT NULL CHECK (points >= 0),
        played_at TEXT NOT NULL,
        won INTEGER CHECK (won IN (0, 1)),
        session_id INTEGER,
        FOREIGN KEY (session_id, player_id) REFERENCES sessions (id, player_id)
    ) STRICT;
    INSERT INTO scores_new (id, player_id, level, points, played_at, won, session_id)
    SELECT id, player_id, level, points, played_at, won, session_id FROM scores;
    DROP TABLE scores;
    ALTER TABLE scores_new RENAME TO scores;
    """,
    # 5: indexes for the questions the game asks (lesson 7.6): each level's best, and a player's scores.
    """
    CREATE INDEX scores_level_points ON scores (level, points);
    CREATE INDEX scores_player ON scores (player_id);
    """,
    # 6: indexes for a player's sessions and each session's scores (lesson 7.6's Your turn).
    """
    CREATE INDEX sessions_player ON sessions (player_id);
    CREATE INDEX scores_session ON scores (session_id);
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
    db.execute("PRAGMA journal_mode = WAL")
    migrate(db)
    return db


def migrate(db: sqlite3.Connection) -> None:
    """Bring the database up to the newest design, one migration at a time, each completely or not at all.

    Each migration takes the write lock before it reads the version, so two programs opening an old file at the
    same moment can't both run the same migration: the second waits for the first, then finds it done.
    """
    db.autocommit = True  # from here until the end, the SQL itself says when each transaction begins and ends
    try:
        while True:
            db.execute("BEGIN IMMEDIATE")
            (version,) = db.execute("PRAGMA user_version").fetchone()
            if version >= len(MIGRATIONS):
                db.execute("COMMIT")
                return
            try:
                db.executescript(f"{MIGRATIONS[version]} PRAGMA user_version = {version + 1};")
            except sqlite3.Error:
                db.execute("ROLLBACK")
                raise
            db.execute("COMMIT")
    finally:
        db.autocommit = sqlite3.LEGACY_TRANSACTION_CONTROL


def start_session(db: sqlite3.Connection, player: str, when: datetime) -> int:
    with db:
        db.execute("INSERT INTO players (name) VALUES (?) ON CONFLICT (name) DO NOTHING", (player,))
        cursor = db.execute(
            "INSERT INTO sessions (player_id, started_at) SELECT id, ? FROM players WHERE name = ?",
            (when.isoformat(), player),
        )
    assert cursor.lastrowid is not None
    return cursor.lastrowid


def end_session(db: sqlite3.Connection, session: int, when: datetime) -> None:
    with db:
        db.execute("UPDATE sessions SET ended_at = ? WHERE id = ?", (when.isoformat(), session))


def add_score(db: sqlite3.Connection, score: Score, session: int | None = None) -> None:
    with db:
        db.execute("INSERT INTO players (name) VALUES (?) ON CONFLICT (name) DO NOTHING", (score.player,))
        db.execute(
            "INSERT INTO scores (player_id, level, points, played_at, won, session_id) "
            "SELECT id, ?, ?, ?, ?, ? FROM players WHERE name = ?",
            (score.level, score.points, score.when.isoformat(), score.won, session, score.player),
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
run ".venv/Scripts/python -m pytest -q" stdout="146 passed"
```

## The sprint review

**Build:** bring `BACKLOG.md` up to date with what the game really does.

A **sprint** is a stretch of work with a goal; in agile teams (lesson 1.2) it's usually one or two weeks. At its end, the **sprint review** compares what was planned with what was built, by looking at the working software, and updates the backlog to match. Open your `BACKLOG.md` (lesson 1.2, with lesson 1.6's technical debt, last touched in lesson 4.4) and compare it with the game. It's out of date in three ways:

- **Pause** is still under To do. Lesson 4.6 built it, with the title screen, and nobody moved the story.
- **Chapters 5 to 7 aren't in it at all.** Levels from files, settings, scores, players, sessions and the report tool were all built without a story, because each lesson said what to build. A team's backlog is how everyone else knows what the product does; work that never reaches it is invisible.
- **The technical debt list describes a script that no longer exists.** The duplicated starting position, the colours worked out backwards, the global variables: Chapters 2 to 4 paid them off. Meanwhile, real debt has piled up in later lessons and was only ever mentioned in passing.

Here is the backlog after the review:

```markdown file=BACKLOG.md
# Breakout backlog

Stories are written from the player's side: who wants it, what, and why.
A story is done when every acceptance check under it is ticked, `.venv\Scripts\python -m pytest` passes, `.venv\Scripts\python -m pyright breakout tests replay.py` reports no errors, `.venv\Scripts\python -m ruff format --check .` and `.venv\Scripts\python -m ruff check .` pass, and the work is committed.

# To do

### Messages that name my keys
As a player who has changed my keys, I want the game's messages to name the keys I chose, so that I'm never told to press a key that does nothing.
- [ ] With `serve = "w"` in the settings file, the title screen says "press W to play".
- [ ] The pause and game-over messages name the configured keys too.

### Faster ball
As a player, I want the ball to speed up as the wall gets smaller, so that the game gets harder as I get better.
- [ ] Every 10 bricks broken, the ball's speed goes up by 10%.

# Done

### Play sessions (0.1.0)
As a player, I want my games grouped into sessions, so that I can see how long I played each time.
- [x] Opening the game starts a session and closing it ends it; each score belongs to its session.
- [x] A report lists a player's sessions with how long each lasted and how many games it held.

### How each level is going (0.1.0)
As a level designer, I want to see how every level's games have gone, so that I know which levels are too hard.
- [x] `python -m breakout.report SCORES_DB` prints one line per level: games, wins, best and average.
- [x] A level name containing SQL is only ever a name.

### Who played (0.1.0)
As a player, I want my scores saved under my name, so that two people can share the game.
- [x] `--player NAME`, or `player` in the settings file, says who is playing; the default is Player.

### Best score kept (0.1.0)
As a player, I want my best score on each level kept between games, so that I have something to beat.
- [x] Every finished game is saved; the best score on the level is shown while playing.
- [x] A scores file that's broken, or from an older version of the game, never stops the game.

### My keys and my level (0.1.0)
As a player, I want to choose my keys and my starting level in a settings file, so that the game fits how I play.
- [x] `--config FILE` reads a TOML file with a level and the keys for each action.
- [x] A setting that's wrong is reported with where and why, and the game doesn't start.

### Levels from files (0.1.0)
As a level designer, I want levels to be files I can edit, so that I can make levels without changing the code.
- [x] `--level FILE` plays a level from a JSON file.
- [x] A level file that's wrong is reported with where and why, every problem at once.

### Title screen and pause (0.1.0)
As a player, I want to start when I'm ready and pause with P, so that I don't lose a life while I'm away.
- [x] The game waits on a title screen until Space is pressed.
- [x] P pauses and continues; after a game, Space starts a new one.

### Serve in a random direction
As a player, I want the ball to start in a different direction each game, so that games aren't all the same.
- [x] Each serve goes upwards at full speed, at a different angle.

### Win or lose
As a player, I want the game to end when I clear the wall or run out of lives, so that I know how I did.
- [x] No lives left shows "Game over" and stops play.
- [x] No bricks left shows "You win!" and stops play.

### Break bricks and score
As a player, I want to break bricks with the ball, so that I have a goal.
- [x] A ball that hits a brick removes it, bounces, and scores 10 points.
- [x] The score and lives are shown on screen.

### Lose a life
As a player, I want to lose a life when I miss the ball, so that missing matters.
- [x] Missing the ball costs one of three lives, and the ball comes back.

### Bounce the ball
As a player, I want a ball that bounces off the walls and my paddle, so that there's something to keep in play.
- [x] The ball bounces off the left, right and top walls.
- [x] The ball bounces up off the paddle, steered by where it hits.

### Move the paddle
As a player, I want to move a paddle with the arrow keys, so that I can get under the ball.
- [x] Left and right arrows move the paddle at the same speed on any computer.
- [x] The paddle never leaves the screen.

### Open the game
As a player, I want the game to open in a window and close when I'm finished, so that I can play it.
- [x] A 640 × 480 window titled Breakout opens.
- [x] The close button and Escape both quit.

# Technical debt

- The levels folder isn't package data: only an editable install finds the levels (lesson 5.1; Chapter 55 ships them).
- `app.py`'s main loop is four levels deep, with the test-run code still woven through it (lesson 4.7).
- The report tool opens a database with a plain `sqlite3.connect`: no migrations, no foreign keys (lesson 7.3).
- `add_score` and `start_session` repeat the same player lookup (lesson 7.4).
- A score names its level by the level's name, in every row (lesson 7.5).
- If another program holds the scores database for more than 5 seconds, saving a score crashes the game (lesson 7.7).
```

**Understand: what changed, and why.**

- **Done stories are labelled `(0.1.0)`** when they're new in this release, so the changelog can be written from them. Each one is written from the side of whoever uses it, as lesson 1.2's were: "As a level designer..." is a new kind of user, the person the report tool and level files are for.
- **A known bug became a story.** "Messages that name my keys" was lesson 5.5's known gap: the title screen tells a player with `serve = "w"` to press Space. It's under To do, first, because a player meets it the moment they use the settings file, and it's a story, not debt, because a player can see it.
- **Faster ball** stays. Nobody built it; that's fine. The review's job is to say so honestly, and to decide whether it still matters.
- **The technical debt list** now holds only debt that exists, each item with the lesson where it came from, so whoever pays it off can read why it's there. Debt you can't list, you can't decide to pay.

```check
contains BACKLOG.md "### Messages that name my keys"
contains BACKLOG.md "### Title screen and pause (0.1.0)"
contains BACKLOG.md "saving a score crashes the game (lesson 7.7)"
```

## A changelog

**Build:** a file that tells players what's in each release.

`git log` (lesson 1.2) already records every change, so why another file? Because its audience is different. The log is for developers: one entry per commit, in the words of the moment ("Keep a write-ahead log, so a reader never blocks a save"). A **changelog** is for the people who use the program: one section per release, newest first, saying what they'll notice. Players don't care that `migrate` takes a lock; they care that the game keeps their best score.

```markdown file=CHANGELOG.md
# Changelog

Every release of Breakout, newest first: what a player or a level designer will notice.
The format follows Keep a Changelog (keepachangelog.com), and versions follow Semantic Versioning (semver.org).

[0.1.0] - 2026-10-07
--------------------

The first release: Breakout, playable, with levels, settings and scores of its own.

### Added

- A title screen, pause with P, and a new game with Space after the last one ends.
- Levels as JSON files, chosen with `--level`; three come with the game: Classic, Castle and Bob's Castle.
- A settings file, chosen with `--config`, for the starting level and the keys for each action.
- Scores kept between games in a database, with the best on each level shown while playing.
- Players, chosen with `--player` or in the settings file, and play sessions from opening the game to closing it.
- `python -m breakout.report`, which shows how each level's games have gone.
- `--test-run`, `--seed` and `--hold` for playing the game without a person, in tests.
```

**Understand.** The version's heading is written with a line of dashes under it: that's Markdown's other way to write a level-2 heading, the same as starting the line with `##`, and you'll see both in changelogs. (It's written that way here because this lesson's own steps are `##` headings.) The format is a widely used convention, **Keep a Changelog**: a heading per version with its date (ISO 8601, lesson 6.1; put the day you release, not this one), and the changes sorted under `Added`, `Changed`, `Fixed` and `Removed`. 0.1.0 is the first release, so everything is `Added`. The `Done` stories labelled `(0.1.0)` are where these lines came from: the backlog says what was built and why, the changelog what a user will find.

**What 0.1.0 means.** **Semantic Versioning** gives each part of `MAJOR.MINOR.PATCH` a meaning: a **patch** release (0.1.1) only fixes bugs; a **minor** release (0.2.0) adds things without breaking anything that worked; a **major** release (1.0.0) is allowed to break things, and says so. A major version of **0** means "not stable yet": anything may change in any release. That's honest for a game whose scores database has changed design seven times in one chapter. (Chapter 57 releases Forge itself, where a version number becomes a promise to other people's code.)

```check
contains CHANGELOG.md "[0.1.0] - "
```

Commit both files:

```powershell
git add BACKLOG.md CHANGELOG.md
git commit -m "Sprint review: bring the backlog up to date, and a changelog for 0.1.0"
```

```check
git-message "changelog"
git-clean
```

## Does it work anywhere else?

**Build:** nothing in the project. Install the game from the repository into a new folder, as anyone else would, and run the tests there.

Everything so far has run in your own `forge` folder, which has things a fresh copy wouldn't: files you forgot to commit, a `.venv` that has packages `requirements.txt` doesn't mention, a `scores.db`. "It works on my machine" is the oldest excuse in software, and the way to avoid it is to try another machine, or at least another folder. `git clone` (Chapter 16 uses it with GitHub) copies a repository, with its whole history, into a new folder:

```powershell
git clone . $env:TEMP\breakout-0.1
Push-Location $env:TEMP\breakout-0.1
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m pytest -q
```

```text
146 passed
```

Every test passes in a folder that holds only what's committed, with only the packages `requirements.txt` names. That proves the repository is complete: nothing the game needs lives only in your folder. Go back to your project, and delete the copy:

```powershell
Pop-Location
Remove-Item -Recurse -Force $env:TEMP\breakout-0.1
```

`Push-Location` is PowerShell's `cd` that remembers where you were, and `Pop-Location` goes back there. (If a test had failed there and not here, the difference between the two folders would be the bug: a file you forgot to `git add` is the usual one.)

## The release, tagged

**Build:** mark the commit that is version 0.1.0.

A commit hash names a commit, but nobody remembers `e75bd7d`. A **tag** is a name that points at one commit for ever: unlike a branch (lesson 4.6), it never moves.

```powershell
git tag -a v0.1.0 -m "Breakout 0.1.0: levels, settings, scores, players and sessions"
git describe --tags
git show v0.1.0 --no-patch
```

```text
v0.1.0
tag v0.1.0
Tagger: ...
Date:   ...

Breakout 0.1.0: levels, settings, scores, players and sessions

commit ...
```

- `git tag -a v0.1.0 -m "..."` makes an **annotated** tag: a small object of its own, with who made it, when, and a message, like a commit. Without `-a` and `-m`, a **lightweight** tag is just a name for a commit, with nothing else. Releases use annotated tags, so the tag records who released it and why.
- The `v` in front is a convention, so a tag reads as a version, not a branch name.
- `git describe --tags` names the current commit by the nearest tag: exactly `v0.1.0` now. After the next commit it will say something like `v0.1.0-1-g3f2a9c1`: one commit after v0.1.0, at commit `3f2a9c1`. That's a useful version name for a build that isn't a release.
- From now on, `git switch --detach v0.1.0` (lesson 4.6's `switch`, onto a commit instead of a branch) brings back exactly what was released, whatever happens to `main`. When a player reports a bug in 0.1.0, that's the code to look at.

```check
run "git describe --tags" stdout="v0.1.0" label="the release commit is tagged v0.1.0"
run "git cat-file -t v0.1.0" stdout="tag" label="as an annotated tag, with a message" -- Use git tag -a with -m, so the tag records who released it and why.
```

## Your turn: the retrospective

**Build, on your own:** write the retrospective for 0.1.0, and act on one thing it finds.

A **retrospective** looks back at **how** the work went, not what was built: the sprint review did that. The usual shape is three questions: what went well, what didn't, and what you'll change. Be specific, and honest: "Lesson 7.5's migration needed a second migration in 7.6 because I edited one that had already run" teaches something; "it went fine" doesn't. Chapters 4 to 7 are your material: the bugs you hunted, the steps that confused you, the checks that caught you, the things you'd now do first.

| File | Holds |
|---|---|
| `docs/retrospective-0.1.md` | three headings, What went well, What didn't and What we'll change, each with at least two points of your own |
| `BACKLOG.md` | one item from "what we'll change" that can be acted on, added where it belongs: a story under To do, or a line under Technical debt |

When every check is clean, commit with a message that mentions **retrospective**.

```hints
nudge: Look back through your commits since the end of Chapter 3: `git log --oneline`. Which commits fixed something an earlier commit broke? Which lessons did you need the hints for, and why?
concept: A good retrospective point names one thing, says why it happened, and, under "what we'll change", says what you'll do differently in a way you could check afterwards. "Write the test before changing a migration" can be checked; "be more careful" can't. One action, done, beats five, forgotten: that's why one of them goes into the backlog, where the next sprint review will see whether it happened.
shape: A Markdown file in a new `docs` folder, with the three headings and a short bulleted list under each. Then one line or story in `BACKLOG.md`. Then one commit with both.
answer: Yours will be different, and should be. An example, from someone who did these chapters:

~~~markdown
# Retrospective: 0.1.0

What went well
--------------

- Writing the failing test first for every Your turn: I knew when I was done.
- Migrations: the tests against `LESSON_7_1_DATABASE` caught a migration that would have broken real files.

What didn't
-----------

- I edited a migration that had already run on my own `scores.db`, and lost an hour to a file that said one version and had another design.
- `BACKLOG.md` went stale for three chapters, because nothing reminded me to update it.

What we'll change
-----------------

- Before editing a migration, check whether it has run anywhere: if it has, add a new one.
- At the end of every chapter, review the backlog, the way this lesson did.
~~~

and, under Technical debt in `BACKLOG.md`, or as a story in To do, the second action:

~~~markdown
- The backlog is only reviewed when a lesson says so: review it at the end of every chapter (retrospective 0.1).
~~~
```

```check
contains docs/retrospective-0.1.md "What went well"
contains docs/retrospective-0.1.md "What didn't"
contains docs/retrospective-0.1.md "What we'll change"
git-message "retrospective"
git-clean
```

## Challenge: the version, from the game itself

**Optional, ★.** Add `breakout --version`, which prints `breakout 0.1.0`, read with `importlib.metadata.version("breakout")` (it reads the version pip installed from `pyproject.toml`, so there's one place to change it), using `argparse`'s `action="version"`. Test it like the other arguments (lesson 4.3). On a branch.

## Challenge: a release check, as a script

**Optional, ★★.** Every release needs the same checks: tests, pyright, ruff, formatting, a clean working tree, a changelog section for the version in `pyproject.toml`. Write `check_release.py`, which runs each with `subprocess.run` (as the characterisation tests' `play()` does) and prints which passed and which failed, with exit code 1 if any did. Run it before tagging 0.1.1. On a branch.

## Challenge: the first patch release

**Optional, ★★.** Pick the story "Messages that name my keys", build it (lesson 5.5's challenge has the design), then release 0.1.1: move the story to Done, add a `## [0.1.1]` section under `### Fixed` (a player can see the bug, so the fix is a fix), change the version in `pyproject.toml`, tag it. Is it really a patch, by Semantic Versioning's rules? Decide, and write why in the commit message.

## What did we actually learn?

- **A sprint review** compares what was built with the plan, by looking at the software, and updates the backlog: stale stories, missing stories, and debt that's really there.
- **A changelog** is written for users, per release; `git log` is for developers, per commit. **Keep a Changelog** and **Semantic Versioning** (`MAJOR.MINOR.PATCH`, and `0.x` meaning "not stable yet").
- **A clean clone** proves the repository has everything: "it works on my machine" checked, not assumed.
- **Annotated tags** mark a release for ever; `git describe` names any commit by its nearest tag.
- **A retrospective** looks at how the work went, and turns one lesson into a checkable action.

## Chapter 7, zoomed out: data that grows up

The chapter began with one table of scores and ends with four tables that know who played, in which session, on which level, and that stay correct while two programs use them at once. Every lesson answered a question a small database never has to ask:

- **What is each fact about?** Players stored once (7.1), facts about the key and nothing else (7.5), and a copy kept only with a rule that guards it.
- **What about the files that already exist?** A version in the file and migrations in order (7.2), tested against old designs, written to keep data, never to invent it (7.5).
- **What does a question cost?** Groups and aggregates done by the database (7.3, 7.4), measured on a million rows, answered from indexes, and guarded by tests that read the plan (7.6).
- **Who else is using it?** Locks, isolation, a write-ahead log, and a race found by stepping through it (7.7).

Behind them all is the question from Chapter 5, **who controls this data?**, with a new answer: **time**. Data written by last month's version of your own program is data you no longer fully control, and every migration in this chapter was written for it.

**Chapter 7's challenges**, to come back to (on branches): a player's own best ★, rename a player ★★, find the orphans ★★ (7.1); a file from the future ★, a column that can't be NULL ★★, a copy before changing anything ★★ (7.2); how many are unknown ★, a table of players ★★, a win rate ★★ (7.3); the longest session ★, sessions that never ended ★★, one way to find a player ★★ (7.4); find the disagreements first ★, remove the copy instead ★★, levels as a table ★★★ (7.5); an index on a calculation ★, grouping from an index ★★, a speed test that doesn't flake ★★★ (7.6); tell the player why ★, two programs, a thousand scores each ★★, a log that only grows ★★★ (7.7); the version from the game itself ★, a release check as a script ★★, the first patch release ★★ (this lesson).

Breakout 0.1.0 is done. It's also, by now, the wrong shape for what comes next: a second game in Chapter 8 will copy it, and find out how much of it was ever really "Breakout" and how much was "a game". That question is where the engine begins.
