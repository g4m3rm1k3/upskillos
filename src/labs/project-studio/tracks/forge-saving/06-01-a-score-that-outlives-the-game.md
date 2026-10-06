---
title: 6.1 — A Score That Outlives the Game
track: Forge — Data That Outlives the Program
trackOrder: 36
runtime: python
run: breakout/__main__.py
---

Close the game and everything in it is gone: every score, every best. The game's objects live in memory, and memory belongs to a running program. Keeping anything for later means writing it somewhere that outlives the program, a file or a database, in a form that can be turned back into objects next time. Turning objects into bytes or text like that is called **serialisation**, and turning them back **deserialisation**. This chapter does that for scores, three ways: a JSON file in this lesson, what goes wrong with files and with Python's own `pickle` in the next, then a real database with SQL.

## The characterisation tests so far

**Build:** make sure `tests/test_characterisation.py` matches the end of lesson 5.6, the reference answer to its Your turn.

```python file=tests/test_characterisation.py
# Characterisation tests: they record what breakout.py does now, so that a change
# that alters its behaviour by accident is caught. Test runs use seed 0 unless told otherwise.
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent


def play(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "breakout", *args], cwd=ROOT, capture_output=True, text=True, check=False
    )


def last_line(*args: str) -> str:
    return play(*args).stdout.strip().splitlines()[-1]


def test_autopilot_plays_for_ten_seconds():
    assert (
        last_line("--test-run", "600", "--hold", "auto")
        == "frames=600 paddle_x=435 score=70 lives=3 bricks=33 inside=True"
    )


def test_nobody_at_the_paddle_loses():
    assert (
        last_line("--test-run", "600", "--hold", "none")
        == "frames=600 paddle_x=270 score=40 lives=0 bricks=36 inside=False"
    )


def test_autopilot_wins():
    assert (
        last_line("--test-run", "10000", "--hold", "auto")
        == "frames=10000 paddle_x=371 score=560 lives=3 bricks=0 inside=True"
    )


def test_holding_right_for_half_a_second():
    assert (
        last_line("--test-run", "30", "--hold", "right")
        == "frames=30 paddle_x=480 score=10 lives=3 bricks=39 inside=True"
    )


def test_a_slow_frame_keeps_the_ball_on_screen():
    assert (
        last_line("--test-run", "400", "--hold", "auto", "--lag-at", "40")
        == "frames=400 paddle_x=536 score=50 lives=2 bricks=35 inside=True"
    )


def test_a_bad_frame_count_is_a_usage_error():
    result = play("--test-run", "ten")
    assert result.returncode == 2
    assert result.stderr.startswith("usage: breakout")


def test_holding_left_for_a_second_stops_at_the_left_edge():
    assert (
        last_line("--test-run", "60", "--hold", "left") == "frames=60 paddle_x=0 score=10 lives=3 bricks=39 inside=True"
    )


def test_a_lost_game_stays_lost():
    assert (
        last_line("--test-run", "1000", "--hold", "none")
        == "frames=1000 paddle_x=270 score=40 lives=0 bricks=36 inside=False"
    )


def test_a_different_seed_plays_a_different_game():
    assert (
        last_line("--test-run", "600", "--hold", "auto", "--seed", "7")
        == "frames=600 paddle_x=7 score=60 lives=3 bricks=34 inside=True"
    )


def test_a_level_that_cannot_be_read_stops_the_game_with_exit_code_1(tmp_path: Path):
    missing = tmp_path / "missing.json"
    result = play("--test-run", "5", "--level", str(missing))
    assert result.returncode == 1
    assert result.stderr.startswith(f"breakout: {missing}: ")


def test_bad_settings_stop_the_game_with_exit_code_1(tmp_path: Path):
    settings = tmp_path / "settings.toml"
    settings.write_text("speed = 2\n", encoding="utf-8")
    result = play("--test-run", "5", "--config", str(settings))
    assert result.returncode == 1
    assert result.stderr == f"breakout: {settings}: speed: Extra inputs are not permitted\n"
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="96 passed"
```

## What a score is

**Build:** a module for scores, starting with what one score is, and how to find the best.

Create `breakout/scores.py`:

```python file=breakout/scores.py
"""The scores players have made, kept in a file between games."""

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class Score:
    level: str
    points: int
    when: datetime


def best(scores: list[Score], level: str) -> int | None:
    return max((score.points for score in scores if score.level == level), default=None)
```

**Understand.** `Score` is a frozen dataclass (lesson 3.2): which level, how many points, and **when**, as a `datetime` from the standard library's `datetime` module: a date and a time of day in one object.

`datetime` is new, so try it in the REPL first:

```text
>>> from datetime import UTC, datetime
>>> t = datetime(2026, 10, 4, 15, 41, tzinfo=UTC)
>>> print(t)
2026-10-04 15:41:00+00:00
>>> t.year, t.month, t.hour, t.tzinfo
(2026, 10, 15, datetime.timezone.utc)
>>> t.isoformat()
'2026-10-04T15:41:00+00:00'
>>> datetime(2026, 10, 4) < t
Traceback (most recent call last):
  ...
TypeError: can't compare offset-naive and offset-aware datetimes
```

A `datetime` is made from its parts, year down to minute (seconds and smaller default to 0), and its parts can be read back. `tzinfo=UTC` says which **time zone** the time is in; `+00:00` at the end is its **offset**, how far that zone is from UTC, here not at all (Paris in summer is `+02:00`, two hours ahead). `isoformat()` writes it in the international standard format, **ISO 8601**, which this lesson's Your turn needs. A `datetime` without a time zone, like `datetime(2026, 10, 4)`, can't be compared with one that has one: Python refuses to guess which zone it meant. The step "The app keeps score" says why that matters.

`best` finds the highest points on one level. The **generator expression** `score.points for score in scores if score.level == level` produces the matching points one at a time, without building a list, and `max` takes the largest. Traced for three scores, looking for `"Classic"`:

```text
score                     score.level == "Classic"?   produced
Score("Classic", 70)      yes                         70
Score("Castle", 150)      no                          (skipped)
Score("Classic", 400)     yes                         400
max(70, 400)                                          400
```

```powershell
.venv\Scripts\python -c "from datetime import UTC, datetime; from breakout.scores import Score, best; t = datetime(2026, 10, 4, tzinfo=UTC); print(best([Score('Classic', 70, t), Score('Castle', 150, t), Score('Classic', 400, t)], 'Classic'))"
```

```text
400
```

The 150 is the highest score of all, and it isn't the answer: it was on another level. `max(..., default=None)` returns `None` when nothing is produced, instead of raising `ValueError`, which is what `max` does with nothing to compare.

```predict
question: What does `best([], "Classic")` return?
choice: 0
choice: None
choice: It raises ValueError
answer: None
explain: With no scores at all, the generator produces nothing, and `max` returns its `default`, `None`. That's more honest than 0: "no best yet" and "a best of 0 points" are different facts, and the screen will show them differently. The return type, `int | None`, makes every caller deal with both.
```

```check
contains breakout/scores.py "class Score:"
run ".venv/Scripts/python -c \"from breakout.scores import best; print(best([], 'Classic'))\"" stdout="None" label="no scores, no best"
```

## Saving scores

**Build:** write a list of scores to a file, as JSON.

```python file=breakout/scores.py
"""The scores players have made, kept in a file between games."""

import json
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path


@dataclass(frozen=True)
class Score:
    level: str
    points: int
    when: datetime


def save_scores(path: Path, scores: list[Score]) -> None:
    path.write_text(json.dumps([asdict(score) for score in scores], indent=2), encoding="utf-8")


def best(scores: list[Score], level: str) -> int | None:
    return max((score.points for score in scores if score.level == level), default=None)
```

**Understand.** JSON can't hold a dataclass, only objects, arrays, strings, numbers, `true`/`false` and `null` (lesson 5.3). So each `Score` is first turned into a dict: `dataclasses.asdict(score)` makes a dict of a dataclass's fields, name to value. The list comprehension does that for every score, `json.dumps(..., indent=2)` turns the list of dicts into JSON text, indented two spaces so a person can read the file, and `write_text` writes it, replacing whatever the file held.

Look at what `asdict` gives for one score:

```powershell
.venv\Scripts\python -c "from datetime import UTC, datetime; from dataclasses import asdict; from breakout.scores import Score; print(asdict(Score('Classic', 70, datetime(2026, 10, 4, 15, 41, tzinfo=UTC))))"
```

```text
{'level': 'Classic', 'points': 70, 'when': datetime.datetime(2026, 10, 4, 15, 41, tzinfo=datetime.timezone.utc)}
```

A `str`, an `int`, and a `datetime`, copied as it is. Keep that last one in mind: the game is about to find out what `json.dumps` thinks of it. (If you can't wait: `.venv\Scripts\python -c "import json; from datetime import UTC, datetime; json.dumps({'when': datetime.now(UTC)})"`. Read the last line of what it prints, then carry on.)

```check
contains breakout/scores.py "def save_scores(path: Path, scores: list[Score]) -> None:"
run ".venv/Scripts/python -c \"from breakout.scores import save_scores; print('ok')\"" stdout="ok" label="scores.py still imports cleanly"
```

## Loading scores

**Build:** read the scores back from the file.

```python file=breakout/scores.py
"""The scores players have made, kept in a file between games."""

import json
from dataclasses import asdict, dataclass
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
    return [Score(**item) for item in data]


def save_scores(path: Path, scores: list[Score]) -> None:
    path.write_text(json.dumps([asdict(score) for score in scores], indent=2), encoding="utf-8")


def best(scores: list[Score], level: str) -> int | None:
    return max((score.points for score in scores if score.level == level), default=None)
```

**Understand.** `load_scores` returns an empty list if the file doesn't exist yet, which is normal: the very first game has no scores before it. Otherwise `json.loads` turns the text into a list of dicts, and a `Score` is made from each.

`Score(**item)` is **dictionary unpacking** in a call (lesson 5.3 met `**` collecting keyword arguments; this is the other direction): each key of the dict is passed as a keyword argument, so `{"level": "Classic", "points": 70, "when": ...}` becomes `Score(level="Classic", points=70, when=...)`. Try both paths:

```powershell
.venv\Scripts\python -c "from pathlib import Path; from breakout.scores import Score, load_scores; print(load_scores(Path('nowhere.json'))); print(Score(**{'level': 'Classic', 'points': 70, 'when': '2026-10-04T15:41:00+00:00'}))"
```

```text
[]
Score(level='Classic', points=70, when='2026-10-04T15:41:00+00:00')
```

The second line is a warning. The dict's `when` was a string, as it would be in any JSON file, and the `Score` took it: a dataclass doesn't check types at run time, only pyright does, and pyright can't see inside a JSON file. Try it: `.venv\Scripts\python -c "from breakout.scores import Score; print(Score('Classic', 'lots', 'today'))"` prints `Score(level='Classic', points='lots', when='today')`, without complaint. Type hints are for the type checker; Python itself ignores them. A `Score` whose `when` is a `str` is wrong in a way nothing has caught yet.

```check
contains breakout/scores.py "def load_scores(path: Path) -> list[Score]:"
run ".venv/Scripts/python -c \"from pathlib import Path; from breakout.scores import load_scores; print(load_scores(Path('nowhere.json')))\"" stdout="[]" label="no file yet means no scores"
```

## Adding a score

**Build:** add one score to the file.

```python file=breakout/scores.py
"""The scores players have made, kept in a file between games."""

import json
from dataclasses import asdict, dataclass
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
    return [Score(**item) for item in data]


def save_scores(path: Path, scores: list[Score]) -> None:
    path.write_text(json.dumps([asdict(score) for score in scores], indent=2), encoding="utf-8")


def add_score(path: Path, score: Score) -> None:
    save_scores(path, [*load_scores(path), score])


def best(scores: list[Score], level: str) -> int | None:
    return max((score.points for score in scores if score.level == level), default=None)
```

**Understand.** `add_score` reads every score, adds one at the end, and writes them all back. `[*old, new]` is **list unpacking**: a new list with the items of `old`, then `new`. Traced, for a file that holds one score:

```text
the file before                 [{"level": "Classic", "points": 70, ...}]
load_scores(path)               [Score("Classic", 70, ...)]
[*load_scores(path), score]     [Score("Classic", 70, ...), Score("Classic", 400, ...)]
the file after                  [{"level": "Classic", "points": 70, ...}, {"level": "Classic", "points": 400, ...}]
```

```predict
question: The file holds 1,000 scores. How many scores does `add_score` write to the file to add one more?
answer: 1001
explain: `add_score` loads every score, makes a new list with one more, and `save_scores` writes the whole list back: 1,000 old scores, rewritten unchanged, plus the new one. The work grows with the file, not with what changed.
verify: .venv/Scripts/python -c "old = ['score'] * 1000; written = [*old, 'new score']; print(len(written))"
```

Rewriting the whole file to add one score is fine for a few hundred scores and a problem for a million; lesson 6.3 comes back to it.

```check
contains breakout/scores.py "[*load_scores(path), score]"
```

## Where scores are kept

**Build:** a `--scores` option.

```python file=breakout/settings.py
import argparse
from dataclasses import dataclass
from enum import Enum
from pathlib import Path


class Hold(Enum):
    NONE = "none"
    LEFT = "left"
    RIGHT = "right"
    AUTO = "auto"


@dataclass(frozen=True)
class Settings:
    test_frames: int | None = None
    hold: Hold = Hold.NONE
    lag_at: int | None = None
    seed: int | None = None
    level: Path | None = None
    config: Path | None = None
    scores: Path | None = None


def positive_int(text: str) -> int:
    value = int(text)
    if value < 1:
        raise argparse.ArgumentTypeError(f"must be at least 1, not {value}")
    return value


def make_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="breakout", description="Play Breakout. A test run lets another program play it."
    )
    parser.add_argument(
        "--test-run",
        type=positive_int,
        metavar="FRAMES",
        help="play FRAMES frames with no window, then print a summary",
    )
    parser.add_argument(
        "--hold", choices=[h.value for h in Hold], default="none", help="what the paddle does in a test run"
    )
    parser.add_argument("--lag-at", type=int, metavar="FRAME", help="in a test run, make this frame last half a second")
    parser.add_argument("--seed", type=int, metavar="N", help="seed for the random serve (test runs use 0)")
    parser.add_argument("--level", type=Path, metavar="FILE", help="play this level file (default: the classic wall)")
    parser.add_argument("--config", type=Path, metavar="FILE", help="read settings from this TOML file")
    parser.add_argument("--scores", type=Path, metavar="FILE", help="keep scores in this file (test runs keep none)")
    return parser


def parse_args(args: list[str]) -> Settings:
    options = make_parser().parse_args(args)
    return Settings(
        test_frames=options.test_run,
        hold=Hold(options.hold),
        lag_at=options.lag_at,
        seed=options.seed,
        level=options.level,
        config=options.config,
        scores=options.scores,
    )
```

**Understand.** `--scores FILE` says where to keep scores. Without it, a real game keeps them in the player's own data folder (the next step), and a **test run keeps none**: the characterisation tests play hundreds of games, and none of them should change a player's scores, or depend on what's already there.

```check
run ".venv/Scripts/python -m pytest -q tests/test_arguments.py" stdout="10 passed"
contains breakout/settings.py "\"--scores\""
```

## The best score on screen

**Build:** the drawing shows the best score, when there is one.

```python file=breakout/draw.py
import pygame

from breakout.model import Game, GameState

BACKGROUND = (24, 26, 33)
PADDLE_COLOUR = (94, 234, 212)
BALL_COLOUR = (245, 245, 245)
TEXT_COLOUR = (230, 230, 230)
MESSAGES = {
    GameState.TITLE: "BREAKOUT: press Space to play",
    GameState.PAUSED: "Paused: press P to go on",
    GameState.OVER: "Game over: press Space to play again",
    GameState.WON: "You win! Press Space to play again",
}


def draw(screen: pygame.Surface, font: pygame.font.Font, game: Game, best: int | None) -> None:
    screen.fill(BACKGROUND)
    for brick in game.bricks:
        pygame.draw.rect(screen, brick.current_colour(), brick.rect)
    pygame.draw.rect(screen, PADDLE_COLOUR, game.paddle.rect())
    pygame.draw.ellipse(screen, BALL_COLOUR, game.ball.rect())
    status = f"Score {game.score}   Lives {game.lives}"
    if best is not None:
        status += f"   Best {best}"
    screen.blit(font.render(status, True, TEXT_COLOUR), (16, 16))
    message = MESSAGES.get(game.state)
    if message is not None:
        text = font.render(message, True, TEXT_COLOUR)
        screen.blit(text, text.get_rect(center=screen.get_rect().center))
```

**Understand.** `draw` is given the best score, `int | None`, and adds `Best 560` to the status line only when there is one. It isn't given the scores file: drawing shows things, and doesn't read files.

```check
contains breakout/draw.py "best: int | None"
```

## No best score yet

**Build:** the app passes `draw` its new argument.

`draw` now needs four arguments, and the app still passes three, so right now the game crashes on its first frame with `TypeError: draw() missing 1 required positional argument: 'best'`. Until the app knows a best score, give it `None`, "no best yet":

```python file=breakout/app.py
import os
import random
import sys

import pygame

from breakout.config import KEYS, Config, ConfigError, load_config
from breakout.draw import draw
from breakout.level import LEVELS, LevelError, load_level
from breakout.model import HEIGHT, WIDTH, Game, GameState, autopilot
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
    try:
        level = load_level(level_file)
    except (OSError, UnicodeDecodeError, LevelError) as error:
        print(f"breakout: {level_file}: {error}", file=sys.stderr)
        sys.exit(1)
    game = Game(rng, level.bricks(), level.lives)
    if settings.test_frames is not None:
        game.start()

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
        game.update(direction, dt)

        draw(screen, font, game, None)
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
run ".venv/Scripts/breakout --test-run 60" stdout="frames=60" label="the game still runs, with no best score to show"
```

## The app keeps score

**Build:** the app loads the scores, adds one when a game ends, and passes the best to `draw`.

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
from breakout.scores import Score, add_score, best, load_scores
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
        scores_file = Path(pygame.system.get_pref_path("forge", "breakout")) / "scores.json"
    best_score = best(load_scores(scores_file), level.name) if scores_file else None

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

**Understand.**

**Where.** `pygame.system.get_pref_path("forge", "breakout")` returns a folder that belongs to this program and this user, creating it if needed: on Windows, `C:\Users\<you>\AppData\Roaming\forge\breakout\`. Every operating system has a place for this: on macOS it's under `~/Library/Application Support/`, and on Linux under `~/.local/share/` (`~` is your home folder). See yours: `.venv\Scripts\python -c "import pygame; print(pygame.system.get_pref_path('forge', 'breakout'))"`, then open that folder in Explorer. A program should use it rather than its own install folder: programs are usually installed under `C:\Program Files`, where a normal user isn't allowed to write, and one install is shared by everyone on the computer, while each player's scores are their own.

**Whether.** `scores_file` is a `Path` or `None`: `None` in a test run without `--scores`. `if scores_file` and `... if scores_file else None` rely on truthiness: `None` counts as false, and a `Path` always counts as true, whatever it names. So here they mean "if there is a scores file", and a test run never reads or writes one.

**When.** A game ends once, but the loop keeps running afterwards, frame after frame, with the state still `OVER` or `WON`. So the app remembers the state from `before` the update, and saves only on the frame where the state **changes** to an end state. Traced around the frame the last brick breaks:

```text
frame   before    after update   changed?   an end state?   saved?
N-1     PLAYING   PLAYING        no         no              no
N       PLAYING   WON            yes        yes             yes: one score
N+1     WON       WON            no         yes             no
N+2     WON       WON            no         yes             no
```

One game, one score. Without the `before` comparison, frame N+1 and every frame after it would save the same win again, sixty times a second.

**What time.** `datetime.now(UTC)` is the current time in **UTC**, Coordinated Universal Time, the same everywhere on Earth. `datetime.now()` without it gives the local time with no record of which time zone it's in, called a **naive** datetime. Two examples of what goes wrong without a zone. In the UK, clocks go back an hour at 02:00 on the last Sunday of October, so 01:30 happens twice that night: two naive scores saved at `01:30`, an hour apart, can't be put in order. And a game saved at 15:00 in London and one at 16:00 in Paris happened at the same moment: `+00:00` and `+01:00` record that, and a naive `15:00` and `16:00` lose it. ruff's `DTZ` rules flag naive datetimes for exactly this reason, and the pinned ruff version runs them by default: write `datetime.now()` and `ruff check` reports `DTZ005`, "called without a `tz` argument". See it: put `from datetime import datetime` and `print(datetime.now())` in `scratch/naive.py`, and run `.venv\Scripts\python -m ruff check scratch/naive.py`. Store times in UTC, with the zone recorded, and convert to local time only to show them.

Now play the classic level to the end, keeping scores in a file:

```powershell
.venv\Scripts\breakout --test-run 10000 --hold auto --scores scores.json
```

```text
Traceback (most recent call last):
  ...
TypeError: Object of type datetime is not JSON serializable
```

The autopilot wins, the app saves the score, and the game crashes. `scores.json` was never written: `json.dumps` failed before anything reached the file.

```check
run ".venv/Scripts/python -m pytest -q tests/test_characterisation.py" stdout="11 passed" label="games without --scores still play exactly as before"
```

## Scores you test with aren't committed

**Build:** ignore the scores file you use to test by hand.

```text file=.gitignore
# Generated: rebuilt from requirements.txt with python -m venv .venv
.venv/

# Generated: Python's compiled bytecode
__pycache__/

# Your own experiments (lesson 1.1's scratch files): kept, never part of the project
scratch/

# Generated: package metadata, written by pip install -e .
*.egg-info/

# Generated: coverage data, written by pytest --cov
.coverage
.coverage.*

# Scores saved by games you test by hand
scores.json
```

**Understand.** `scores.json` in the project is data the game writes while you try it out, like `.coverage`: generated, and different on every computer. A real player's scores live in their data folder, far from the project.

```check
git-ignored scores.json -- Add scores.json to .gitignore.
```

## The crash, as tests

**Build:** click **Create provided tests/test_scores.py**, then run it.

```python file=tests/test_scores.py provided
"""What the scores file must do. Two of these fail until the scores can be saved."""

from datetime import UTC, datetime
from pathlib import Path

from breakout.scores import Score, add_score, best, load_scores, save_scores

WIN = Score("Classic", 400, datetime(2026, 10, 4, 15, 30, 5, tzinfo=UTC))
LOSS = Score("Classic", 70, datetime(2026, 10, 4, 15, 41, 0, tzinfo=UTC))
CASTLE = Score("Castle", 150, datetime(2026, 10, 5, 9, 2, 30, tzinfo=UTC))


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
```

```powershell
.venv\Scripts\python -m pytest -q tests/test_scores.py
```

```text
FAILED tests/test_scores.py::test_scores_come_back_exactly_as_they_were_saved - TypeError: Object of type datetime is not JSON serializable
FAILED tests/test_scores.py::test_a_new_score_is_added_after_the_old_ones - TypeError: Object of type datetime is not JSON serializable
2 failed, 3 passed
```

**Understand.** The three scores are made with `datetime(2026, 10, 4, 15, 30, 5, tzinfo=UTC)`: year, month, day, hour, minute, second, and `tzinfo`, the time zone, as a keyword. Fixed times, not `datetime.now()`, so every run of the tests compares the same values.

This is serialisation, from the start of the lesson: turning objects into text that can be stored, and back. Lesson 5.3's table lists everything JSON can hold: objects, arrays, strings, numbers, `true`/`false`, `null`. A `datetime` isn't one of them, so `json.dumps` refuses it rather than guess. The crash happened only when a game was won, minutes into play; these tests reproduce it in a fraction of a second, and say exactly what "fixed" means: a score must come back **equal** to what was saved, `datetime` and all.

```check
file tests/test_scores.py -- Click "Create provided tests/test_scores.py" above.
run ".venv/Scripts/python -m pytest -q tests/test_scores.py" exit=1 stdout="2 failed, 3 passed" label="the two tests that save scores fail, as the game did"
```

## Your turn: dates that survive the trip

**Build, on your own:** make `save_scores` and `load_scores` work, so that all five tests pass and a won game saves its score.

You choose how a `datetime` is written in JSON, and `load_scores` must turn it back into an equal `datetime`, time zone included. You met the standard at the start of this lesson: ISO 8601, which `isoformat()` writes. Reading it back is the other half, and finding the method that does it is part of the exercise: it's in Python's documentation for `datetime` (docs.python.org, the `datetime` module), next to `isoformat`. Reading the documentation for the method you need is an everyday engineering skill; this is a gentle first time. Don't change the tests.

| Command / test | Result |
|---|---|
| `pytest -q tests/test_scores.py` | `5 passed` |
| `breakout --test-run 10000 --hold auto --scores scores.json` | finishes: `frames=10000 ... score=560 ...` |
| open `scores.json` | readable: the level, the points, and the time as text |

When all 101 tests pass and every check is clean, commit with a message that mentions **ISO 8601**, the standard's name.

```hints
nudge: The tests say a score must come back *equal*. If you only change how `when` is saved, what type is `when` when it's loaded back?
concept: **ISO 8601** writes a date and time as text like `2026-10-04T15:30:05+00:00`: year, month, day, `T`, the time, then the offset from UTC. `score.when.isoformat()` writes it, and `datetime.fromisoformat(text)` reads it back into an equal `datetime`, offset included. Because `asdict` copies the `datetime` as it is, saving needs a dict you build yourself, with `when` as text; loading needs a `Score` you build yourself, with `when` parsed.
shape: In `save_scores`, a list comprehension of dicts with `"level"`, `"points"` and `"when": score.when.isoformat()`. In `load_scores`, `Score(item["level"], item["points"], datetime.fromisoformat(item["when"]))` for each item. `asdict` is no longer used, so remove it from the import.
answer: ~~~python
def load_scores(path: Path) -> list[Score]:
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    return [Score(item["level"], item["points"], datetime.fromisoformat(item["when"])) for item in data]


def save_scores(path: Path, scores: list[Score]) -> None:
    data = [{"level": score.level, "points": score.points, "when": score.when.isoformat()} for score in scores]
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")
~~~

with `from dataclasses import dataclass` at the top. A common shortcut, `json.dumps(data, default=str)`, makes the crash go away by turning anything JSON doesn't know into text, but the score then comes back with a **string** where the `datetime` was, and the round-trip test catches it: making an error disappear isn't the same as fixing it. ISO 8601 text also sorts correctly as plain text (for times in the same zone), which the database in lesson 6.3 will use.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_scores.py" stdout="5 passed" label="scores come back exactly as they were saved"
run ".venv/Scripts/breakout --test-run 10000 --hold auto --scores scores.json" stdout="score=560" label="a won game saves its score without crashing"
run ".venv/Scripts/python -c \"from pathlib import Path; from breakout.scores import load_scores; print(load_scores(Path('scores.json'))[-1].points)\"" stdout="560" label="scores.json holds the win"
run ".venv/Scripts/python -m pytest -q" stdout="101 passed"
run ".venv/Scripts/python -m pyright breakout tests replay.py" stdout="0 errors"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
git-message "ISO 8601"
git-clean
```

## Challenge: the best score's date, in local time

**Optional, ★.** Show when the best score was set on the title screen, in the player's **local** time: `when.astimezone()` converts a UTC time to the computer's own zone. Stored as UTC, shown as local: the rule from "What time". Test the formatting function with a fixed time. On a branch.

## Challenge: the top scores, from the command line

**Optional, ★★.** Add `python -m breakout.scores FILE --top N`, which prints the N best scores on each level, sorted, without starting the game (`if __name__ == "__main__":` at the end of `scores.py`, with `argparse`). `sorted(..., key=lambda score: score.points, reverse=True)` sorts by points. On a branch.

## Challenge: let json do the conversion

**Optional, ★★.** `json.dumps(data, default=f)` calls your function `f` for every value JSON can't hold, and `json.loads(text, object_hook=g)` calls `g` with every object it reads. Use them to convert `datetime`s both ways without building the dicts by hand. Then argue, in a comment, which version is clearer to read. On a branch.

## What did we actually learn?

- **Memory belongs to a running program**; keeping anything means serialising it to a file or database, and deserialising it later.
- **JSON holds six kinds of value.** Anything else (a `datetime`, your own class) needs a representation you choose, written and read back explicitly.
- **ISO 8601** for dates and times as text; **UTC** for storing them, with the zone recorded; ruff's `DTZ` rules catch naive datetimes.
- **A round-trip test**: save, load, and compare with what you started with.
- **A test run touches nothing it wasn't given**, and a real game keeps its data in the user's data folder.
- `**dict` and `*list` unpacking; `max(..., default=None)`.

In C#, `System.Text.Json` writes a `DateTime` or `DateTimeOffset` as ISO 8601 by default, and `DateTimeOffset` is the type that keeps the offset, the equivalent of an aware `datetime`. In Java, `java.time.Instant` and `OffsetDateTime` are the aware types, and Jackson, the most used JSON library, needs its `JavaTimeModule` registered before it can write them at all: the same crash as this lesson, met by Java programmers every day.
