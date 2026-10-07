---
reference: optional
title: 8.2 — Moving in Two Dimensions
runtime: python
run: shooter/__main__.py
---

The shooter is still Breakout under another name. This lesson takes Breakout out of it: the paddle becomes a player who moves in eight directions, the ball and bricks go, and the player aims at the mouse. Two pieces of mathematics come with it. Moving diagonally turns out to be faster than moving straight, a bug every top-down game meets; a test will find it, and **normalising** a vector fixes it. And aiming needs the angle from the player to the mouse, which comes from a function called **atan2**.

## The shooter so far

**Build:** make sure `shooter/app.py` matches the end of lesson 8.1, the reference answer to its Your turn.

```python file=shooter/app.py
import os
import random
import sqlite3
import sys
from datetime import UTC, datetime
from pathlib import Path

import pygame

from shooter.config import KEYS, Config, ConfigError, load_config
from shooter.draw import draw
from shooter.level import LEVELS, LevelError, load_level
from shooter.model import HEIGHT, WIDTH, Game, GameState, autopilot
from shooter.scores import Score, add_score, best, end_session, open_scores, start_session
from shooter.settings import Hold, parse_args


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
        print(f"shooter: {settings.config}: {error}", file=sys.stderr)
        sys.exit(1)
    controls = config.controls
    level_file = settings.level or config.level or LEVELS / "classic.json"
    player = settings.player or config.player
    try:
        level = load_level(level_file)
    except (OSError, LevelError) as error:
        print(f"shooter: {level_file}: {error}", file=sys.stderr)
        sys.exit(1)
    game = Game(rng, level.bricks(), level.lives)
    if settings.test_frames is not None:
        game.start()
    scores_file = settings.scores
    if scores_file is None and settings.test_frames is None:
        scores_file = Path(pygame.system.get_pref_path("forge", "shooter")) / "scores.db"
    db = None
    session = None
    best_score = None
    if scores_file:
        try:
            db = open_scores(scores_file)
            best_score = best(db, level.name)
            session = start_session(db, player, datetime.now(UTC))
        except sqlite3.Error as error:
            print(f"shooter: {scores_file}: {error}; playing without keeping scores", file=sys.stderr)
            db = None

    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption(f"Shooter: {level.name}")
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
            score = Score(player, level.name, game.score, datetime.now(UTC), game.state == GameState.WON)
            add_score(db, score, session)
            best_score = best(db, level.name)

        draw(screen, font, game, best_score)
        pygame.display.flip()

        frames += 1
        if settings.test_frames is not None and frames >= settings.test_frames:
            running = False

    pygame.quit()
    if db:
        if session is not None:
            end_session(db, session, datetime.now(UTC))
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
run ".venv/Scripts/shooter --help" stdout="usage: shooter"
lacks shooter/app.py "\"forge\", \"breakout\""
```

## Clearing the board

**Build:** the shooter's model loses the ball, the paddle and the bricks, and gains a player who moves in two dimensions.

Most of `shooter/model.py` is Breakout's rules, and they go: the ball and its serve, the paddle and its autopilot, bricks and hitting them, the brick layout's numbers. Three things stay, because they're not about Breakout: `clamp`, the game states, and the outline of `Game`. The paddle becomes the player, and the change is the point of this lesson: the paddle had an `x`; the player has a **position**, a `Vector2` (lesson 3.2) with an `x` and a `y`, and moves along both.

```python file=shooter/model.py
import random
from enum import Enum

from pygame import Vector2

WIDTH, HEIGHT = 640, 480
PLAYER_SPEED = 220
PLAYER_RADIUS = 12


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(value, high))


class Player:
    def __init__(self) -> None:
        self.position = Vector2(WIDTH / 2, HEIGHT / 2)

    def move(self, direction: Vector2, dt: float) -> None:
        self.position += direction * PLAYER_SPEED * dt
        self.position.x = clamp(self.position.x, PLAYER_RADIUS, WIDTH - PLAYER_RADIUS)
        self.position.y = clamp(self.position.y, PLAYER_RADIUS, HEIGHT - PLAYER_RADIUS)


class GameState(Enum):
    TITLE = "title"
    PLAYING = "playing"
    PAUSED = "paused"
    OVER = "over"


class Game:
    def __init__(self, rng: random.Random, lives: int = 3) -> None:
        self.rng = rng
        self.player = Player()
        self.score = 0
        self.lives = lives
        self.state = GameState.TITLE

    def start(self) -> None:
        if self.state == GameState.TITLE:
            self.state = GameState.PLAYING

    def toggle_pause(self) -> None:
        if self.state == GameState.PLAYING:
            self.state = GameState.PAUSED
        elif self.state == GameState.PAUSED:
            self.state = GameState.PLAYING

    def update(self, direction: Vector2, dt: float) -> None:
        if self.state != GameState.PLAYING:
            return
        self.player.move(direction, dt)
```

- **`Player.move(direction, dt)`** takes a direction as a `Vector2`: `Vector2(1, 0)` is right, `Vector2(0, -1)` is up (y counts down the screen, lesson 1.3), `Vector2(1, -1)` is up and to the right. `direction * PLAYER_SPEED * dt` scales it to the distance this frame (`dt` seconds, lesson 1.3), and `+=` adds it to the position.
- **Two clamps**, one per axis, keep the whole player on the screen: the position is the circle's centre, so it stays at least `PLAYER_RADIUS` from every edge. The paddle's invariant from lesson 3.4, in two dimensions.
- **`GameState.WON` is gone.** Nobody clears an arena: the shooter ends only when the player runs out of lives.

The model has changed, and the three files that use it haven't. Before touching them, ask pyright what's now wrong:

```powershell
.venv\Scripts\python -m pyright shooter
```

```text
shooter\app.py:13:59 - error: "autopilot" is unknown import symbol
shooter\app.py:39:38 - error: Expected 2 positional arguments
shooter\app.py:77:61 - error: Cannot access attribute "WON" for class "type[GameState]"
shooter\app.py:95:40 - error: Cannot access attribute "ball" for class "Game"
...
shooter\draw.py:19:23 - error: Cannot access attribute "bricks" for class "Game"
...
shooter\level.py:8:99 - error: "Brick" is unknown import symbol
22 errors, 0 warnings, 0 informations
```

Twenty-two errors, each one a line that still uses something the model no longer has. That's a **to-do list made by the type checker**: every place the change reaches, found without running the game. Without types you'd find them one crash at a time. The next three steps work through the list.

## Drawing the arena

**Build:** draw the player, and stop drawing what's gone.

```python file=shooter/draw.py
import pygame

from shooter.model import PLAYER_RADIUS, Game, GameState

BACKGROUND = (24, 26, 33)
PLAYER_COLOUR = (94, 234, 212)
TEXT_COLOUR = (230, 230, 230)
MESSAGES = {
    GameState.TITLE: "SHOOTER: press Space to play",
    GameState.PAUSED: "Paused: press P to go on",
    GameState.OVER: "Game over: press Space to play again",
}


def draw(screen: pygame.Surface, font: pygame.font.Font, game: Game, best: int | None) -> None:
    screen.fill(BACKGROUND)
    player = game.player
    pygame.draw.circle(screen, PLAYER_COLOUR, player.position, PLAYER_RADIUS)
    status = f"Score {game.score}   Lives {game.lives}"
    if best is not None:
        status += f"   Best {best}"
    screen.blit(font.render(status, True, TEXT_COLOUR), (16, 16))
    message = MESSAGES.get(game.state)
    if message is not None:
        text = font.render(message, True, TEXT_COLOUR)
        screen.blit(text, text.get_rect(center=screen.get_rect().center))
```

`pygame.draw.circle(surface, colour, centre, radius)` fills a circle around a centre point. It accepts a `Vector2` as the centre, so the player's position goes straight in. The status line and the centred message are Breakout's, unchanged; the title message has lost its `WON` line.

## Up and down

**Build:** two more actions a player can set keys for.

```python file=shooter/config.py
"""Settings a player keeps in a file: the level to start with, and which keys do what."""

import tomllib
from pathlib import Path
from typing import Annotated, Self

import pygame
from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints, ValidationError, model_validator
from pydantic_core import ErrorDetails

KEYS = {
    "left": pygame.K_LEFT,
    "right": pygame.K_RIGHT,
    "up": pygame.K_UP,
    "down": pygame.K_DOWN,
    "space": pygame.K_SPACE,
    "return": pygame.K_RETURN,
} | {chr(code): code for code in range(pygame.K_a, pygame.K_z + 1)}


class ConfigError(ValueError):
    """A settings file that can't be used, with every problem found in it."""

    def __init__(self, problems: list[str]) -> None:
        super().__init__("; ".join(problems))
        self.problems = problems


def check_key(name: str) -> str:
    if name not in KEYS:
        raise ValueError(f"unknown key {name!r}: use a-z, or left, right, up, down, space or return")
    return name


Key = Annotated[str, AfterValidator(check_key)]


class Controls(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid", frozen=True)

    left: Key = "left"
    right: Key = "right"
    up: Key = "up"
    down: Key = "down"
    serve: Key = "space"
    pause: Key = "p"

    @model_validator(mode="after")
    def no_key_does_two_things(self) -> Self:
        actions: dict[str, str] = {}
        for action, key in self.model_dump().items():
            if key in actions:
                raise ValueError(f"{actions[key]} and {action} both use {key!r}")
            actions[key] = action
        return self


class Config(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid", frozen=True)

    level: Path | None = Field(default=None, strict=False)
    player: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)] = "Player"
    controls: Controls = Controls()


def describe(error: ErrorDetails) -> str:
    where = ".".join(str(part) for part in error["loc"]) or "the file"
    return f"{where}: {error['msg'].removeprefix('Value error, ')}"


def load_config(path: Path) -> Config:
    try:
        data = tomllib.loads(path.read_text(encoding="utf-8-sig"))
    except tomllib.TOMLDecodeError as error:
        raise ConfigError([f"not valid TOML: {error}"]) from None
    try:
        config = Config.model_validate(data)
    except ValidationError as error:
        raise ConfigError([describe(problem) for problem in error.errors()]) from None
    if config.level is None:
        return config
    return config.model_copy(update={"level": path.parent / config.level})
```

`up` and `down` are new fields on `Controls` (lesson 5.5), with the arrow keys as defaults. Everything else about them comes free: a settings file can set `up = "w"`, a key name that isn't in `KEYS` is refused with the usual message, and the `model_validator` refuses one key for two actions, now across six actions instead of four.

## The app, without levels

**Build:** the app reads four keys into a direction, and stops loading levels.

The shooter has one arena, so everything about levels goes: the `--level` file, `load_level` and the level's name. Delete the copy's level code and level files:

```powershell
Remove-Item shooter\level.py
Remove-Item -Recurse shooter\levels
```

Then the app:

```python file=shooter/app.py
import os
import random
import sqlite3
import sys
from datetime import UTC, datetime
from pathlib import Path

import pygame
from pygame import Vector2

from shooter.config import KEYS, Config, ConfigError, load_config
from shooter.draw import draw
from shooter.model import HEIGHT, WIDTH, Game, GameState
from shooter.scores import Score, add_score, best, end_session, open_scores, start_session
from shooter.settings import Hold, parse_args

ARENA = "Arena"  # the shooter's only level: its scores are saved under this name
HOLDS = {Hold.NONE: Vector2(0, 0), Hold.LEFT: Vector2(-1, 0), Hold.RIGHT: Vector2(1, 0), Hold.AUTO: Vector2(0, 0)}


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
        print(f"shooter: {settings.config}: {error}", file=sys.stderr)
        sys.exit(1)
    controls = config.controls
    player = settings.player or config.player
    game = Game(rng)
    if settings.test_frames is not None:
        game.start()
    scores_file = settings.scores
    if scores_file is None and settings.test_frames is None:
        scores_file = Path(pygame.system.get_pref_path("forge", "shooter")) / "scores.db"
    db = None
    session = None
    best_score = None
    if scores_file:
        try:
            db = open_scores(scores_file)
            best_score = best(db, ARENA)
            session = start_session(db, player, datetime.now(UTC))
        except sqlite3.Error as error:
            print(f"shooter: {scores_file}: {error}; playing without keeping scores", file=sys.stderr)
            db = None

    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Shooter")
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
                if game.state == GameState.OVER:
                    game = Game(rng)
                game.start()
            elif event.type == pygame.KEYDOWN and event.key == KEYS[controls.pause]:
                game.toggle_pause()

        if settings.test_frames is None:
            keys = pygame.key.get_pressed()
            left, right = keys[KEYS[controls.left]], keys[KEYS[controls.right]]
            up, down = keys[KEYS[controls.up]], keys[KEYS[controls.down]]
            direction = Vector2(right - left, down - up)
        else:
            direction = HOLDS[settings.hold]
        before = game.state
        game.update(direction, dt)
        if db and game.state != before and game.state == GameState.OVER:
            score = Score(player, ARENA, game.score, datetime.now(UTC), False)
            add_score(db, score, session)
            best_score = best(db, ARENA)

        draw(screen, font, game, best_score)
        pygame.display.flip()

        frames += 1
        if settings.test_frames is not None and frames >= settings.test_frames:
            running = False

    pygame.quit()
    if db:
        if session is not None:
            end_session(db, session, datetime.now(UTC))
        db.close()
    if settings.test_frames is not None:
        x, y = game.player.position
        print(f"frames={frames} x={x:.0f} y={y:.0f} score={game.score} lives={game.lives}")


def run() -> None:
    main(sys.argv[1:])
```

- **The four keys become a direction**: `right - left` is `1` with only Right held, `-1` with only Left, and `0` with both or neither, because `True` and `False` count as `1` and `0` in arithmetic (`bool` is a kind of `int`). The same for `down - up`. Then `Vector2(right - left, down - up)` is the direction to move.
- **`ARENA = "Arena"`**: scores are saved by level name (lesson 6.1), and the shooter's one level needs a name. It's a **named constant**, written once and used three times, so the name can't be spelt two ways.
- **`HOLDS`**: a test run can't press keys, so `--hold` chooses a direction (lesson 1.3). The copied option offers `left`, `right`, `none` and `auto`; there's no autopilot yet, so `auto` stands still for now. A dictionary from each choice to its direction replaces Breakout's chain of `if`s.
- **The summary** prints the player's position, rounded with `:.0f` (a format specification: a fixed-point number with no decimals).
- **`GameState.OVER` only**: Breakout restarted after `OVER` or `WON`; with `WON` gone, the condition is simpler. This was one of pyright's 22 errors.

```predict
question: The player starts at x = 320 and moves right at 220 pixels a second. Where is it after a test run of 60 frames holding right?
answer: 540
tolerance: 0
explain: A test run plays each frame as 1/60 of a second, so 60 frames are exactly 1 second: 220 pixels, from 320 to 540. That's still inside the screen, whose right edge for the player's centre is 640 − 12 = 628.
verify: .venv/Scripts/python -c "import random; from pygame import Vector2; from shooter.model import Game; g = Game(random.Random(0)); g.start(); [g.update(Vector2(1, 0), 1 / 60) for _ in range(60)]; print(round(g.player.position.x))"
```

```powershell
.venv\Scripts\shooter --test-run 60 --hold right
.venv\Scripts\python -m pyright breakout shooter tests replay.py
```

```text
frames=60 x=540 y=240 score=0 lives=3
0 errors, 0 warnings, 0 informations
```

Run `.venv\Scripts\shooter` and move with the arrow keys: a circle that goes in eight directions and stops at the edges.

```check
missing shooter/level.py -- Remove-Item shooter\level.py
run ".venv/Scripts/shooter --test-run 60 --hold right" stdout="frames=60 x=540 y=240" label="holding right moves the player right"
run ".venv/Scripts/python -m pyright breakout shooter tests replay.py" stdout="0 errors" -- Work through pyright's list: each error is a line that still uses something the model no longer has.
```

## Keys to a direction

**Build:** turning keys into a direction becomes a function in the model, where it can be tested.

The rule "these keys mean this direction" is game logic, but it's in the app, where it can only run with a real keyboard. Lesson 5.1's **functional core** says where it belongs: a function that takes plain values and returns a value, testable without a window. In the model:

```python file=shooter/model.py
import random
from enum import Enum

from pygame import Vector2

WIDTH, HEIGHT = 640, 480
PLAYER_SPEED = 220
PLAYER_RADIUS = 12


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(value, high))


def direction_from(left: bool, right: bool, up: bool, down: bool) -> Vector2:
    """Which way the held keys point."""
    return Vector2(right - left, down - up)


class Player:
    def __init__(self) -> None:
        self.position = Vector2(WIDTH / 2, HEIGHT / 2)

    def move(self, direction: Vector2, dt: float) -> None:
        self.position += direction * PLAYER_SPEED * dt
        self.position.x = clamp(self.position.x, PLAYER_RADIUS, WIDTH - PLAYER_RADIUS)
        self.position.y = clamp(self.position.y, PLAYER_RADIUS, HEIGHT - PLAYER_RADIUS)


class GameState(Enum):
    TITLE = "title"
    PLAYING = "playing"
    PAUSED = "paused"
    OVER = "over"


class Game:
    def __init__(self, rng: random.Random, lives: int = 3) -> None:
        self.rng = rng
        self.player = Player()
        self.score = 0
        self.lives = lives
        self.state = GameState.TITLE

    def start(self) -> None:
        if self.state == GameState.TITLE:
            self.state = GameState.PLAYING

    def toggle_pause(self) -> None:
        if self.state == GameState.PLAYING:
            self.state = GameState.PAUSED
        elif self.state == GameState.PAUSED:
            self.state = GameState.PLAYING

    def update(self, direction: Vector2, dt: float) -> None:
        if self.state != GameState.PLAYING:
            return
        self.player.move(direction, dt)
```

```check
contains shooter/model.py "def direction_from(left: bool, right: bool, up: bool, down: bool) -> Vector2:"
```

## The app asks the model

**Build:** the app passes what the keyboard says to `direction_from`.

```python file=shooter/app.py
import os
import random
import sqlite3
import sys
from datetime import UTC, datetime
from pathlib import Path

import pygame
from pygame import Vector2

from shooter.config import KEYS, Config, ConfigError, load_config
from shooter.draw import draw
from shooter.model import HEIGHT, WIDTH, Game, GameState, direction_from
from shooter.scores import Score, add_score, best, end_session, open_scores, start_session
from shooter.settings import Hold, parse_args

ARENA = "Arena"  # the shooter's only level: its scores are saved under this name
HOLDS = {Hold.NONE: Vector2(0, 0), Hold.LEFT: Vector2(-1, 0), Hold.RIGHT: Vector2(1, 0), Hold.AUTO: Vector2(0, 0)}


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
        print(f"shooter: {settings.config}: {error}", file=sys.stderr)
        sys.exit(1)
    controls = config.controls
    player = settings.player or config.player
    game = Game(rng)
    if settings.test_frames is not None:
        game.start()
    scores_file = settings.scores
    if scores_file is None and settings.test_frames is None:
        scores_file = Path(pygame.system.get_pref_path("forge", "shooter")) / "scores.db"
    db = None
    session = None
    best_score = None
    if scores_file:
        try:
            db = open_scores(scores_file)
            best_score = best(db, ARENA)
            session = start_session(db, player, datetime.now(UTC))
        except sqlite3.Error as error:
            print(f"shooter: {scores_file}: {error}; playing without keeping scores", file=sys.stderr)
            db = None

    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Shooter")
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
                if game.state == GameState.OVER:
                    game = Game(rng)
                game.start()
            elif event.type == pygame.KEYDOWN and event.key == KEYS[controls.pause]:
                game.toggle_pause()

        if settings.test_frames is None:
            keys = pygame.key.get_pressed()
            direction = direction_from(
                keys[KEYS[controls.left]],
                keys[KEYS[controls.right]],
                keys[KEYS[controls.up]],
                keys[KEYS[controls.down]],
            )
        else:
            direction = HOLDS[settings.hold]
        before = game.state
        game.update(direction, dt)
        if db and game.state != before and game.state == GameState.OVER:
            score = Score(player, ARENA, game.score, datetime.now(UTC), False)
            add_score(db, score, session)
            best_score = best(db, ARENA)

        draw(screen, font, game, best_score)
        pygame.display.flip()

        frames += 1
        if settings.test_frames is not None and frames >= settings.test_frames:
            running = False

    pygame.quit()
    if db:
        if session is not None:
            end_session(db, session, datetime.now(UTC))
        db.close()
    if settings.test_frames is not None:
        x, y = game.player.position
        print(f"frames={frames} x={x:.0f} y={y:.0f} score={game.score} lives={game.lives}")


def run() -> None:
    main(sys.argv[1:])
```

Nothing has changed for the player: the same keys give the same vector. But now a test can ask the model a question the keyboard never could.

```check
run ".venv/Scripts/shooter --test-run 60 --hold right" stdout="frames=60 x=540 y=240"
run ".venv/Scripts/python -m pyright breakout shooter tests replay.py" stdout="0 errors"
```

## Is diagonal faster?

**Build:** a test of the player's speed in every direction.

```predict
question: In one second, the player holding only Right moves 220 pixels. How far does the player holding Right and Up together move?
choice: 220 pixels, the same
choice: More than 220 pixels
choice: Less than 220 pixels
answer: More than 220 pixels
explain: Holding both makes the direction `Vector2(1, -1)`, and every frame moves 220 × dt along **each** axis: 220 pixels right and 220 up in a second. The distance actually travelled is the diagonal of that square, longer than either side.
```

Check it in the REPL first. A vector's **length** (also called its **magnitude**) is how far it reaches: by Pythagoras' theorem, `√(x² + y²)`, and `Vector2.length()` works it out:

```text
>>> from pygame import Vector2
>>> Vector2(3, 4).length()
5.0
>>> Vector2(1, 1).length()
1.4142135623730951
```

`(3, 4)` reaches 5, because 3² + 4² = 25. `(1, 1)` reaches √2 ≈ 1.414, so a player moving diagonally goes about 41% faster than one moving straight. Players find this: in some old games, the fastest way around a level was diagonally. Now pin the rule down with a test, written before the fix (lesson 3.3):

```python file=tests/test_shooter_model.py
"""The shooter's player: moving in eight directions."""

import math

from pygame import Vector2

from shooter.model import PLAYER_SPEED, Player, direction_from


def distance_moved(direction: Vector2, dt: float) -> float:
    player = Player()
    start = Vector2(player.position)
    player.move(direction, dt)
    return player.position.distance_to(start)


def test_moving_diagonally_is_no_faster_than_moving_straight():
    straight = distance_moved(direction_from(left=False, right=True, up=False, down=False), 0.1)
    diagonal = distance_moved(direction_from(left=False, right=True, up=True, down=False), 0.1)
    assert math.isclose(straight, PLAYER_SPEED * 0.1)
    assert math.isclose(diagonal, straight)


def test_no_keys_or_opposite_keys_mean_standing_still():
    assert direction_from(left=False, right=False, up=False, down=False) == Vector2(0, 0)
    assert direction_from(left=True, right=True, up=False, down=False) == Vector2(0, 0)
```

`distance_moved` makes a player, copies its starting position (a new `Vector2` built from the old one, because `start = player.position` would be the **same** vector and move with it: lesson 3.2's aliasing), moves it for 0.1 seconds, and measures with `distance_to`, the length of the line between two points. The keyword arguments `left=False, right=True, ...` make each call say which keys are held.

```powershell
.venv\Scripts\python -m pytest -q tests/test_shooter_model.py
```

```text
E       assert False
E        +  where False = <built-in function isclose>(31.11269837220809, 22.0)
FAILED tests/test_shooter_model.py::test_moving_diagonally_is_no_faster_than_moving_straight
1 failed, 1 passed in 0.29s
```

Traced: straight, the player moves `(22, 0)`, length 22. Diagonally it moves `(22, -22)`, length √(22² + 22²) = 22 × 1.414 = 31.11. The test caught the bug with numbers, before anyone had to notice it by playing.

```check
run ".venv/Scripts/python -m pytest -q tests/test_shooter_model.py" exit=1 stdout="1 failed, 1 passed" label="the test finds the diagonal bug"
```

## One speed in every direction

**Build:** every direction the keys give has length 1.

A vector with length 1 is a **unit vector**: it says only which way, not how far. Turning a vector into the unit vector pointing the same way is **normalising** it: dividing both parts by its length. `Vector2.normalize()` does it:

```text
>>> Vector2(3, 4).normalize()
Vector2(0.6, 0.8)
>>> Vector2(1, 1).normalize()
Vector2(0.707107, 0.707107)
>>> Vector2(0, 0).normalize()
Traceback (most recent call last):
  ...
ValueError: Can't normalize Vector of length zero
```

`(3, 4)` divided by its length 5 is `(0.6, 0.8)`, and `(1, 1)` divided by 1.414 is `(0.707, 0.707)`: each moves 0.707 along both axes, which adds up to exactly 1 along the diagonal. (pygame shows six digits; the numbers inside are full floats.) The last line is the case to remember: the zero vector has no direction, and dividing by its length, 0, is impossible, so `normalize` refuses. A player holding no keys asks for exactly that vector, sixty times a second.

```python file=shooter/model.py
import random
from enum import Enum

from pygame import Vector2

WIDTH, HEIGHT = 640, 480
PLAYER_SPEED = 220
PLAYER_RADIUS = 12


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(value, high))


def direction_from(left: bool, right: bool, up: bool, down: bool) -> Vector2:
    """Which way the held keys point: length 1, or 0 when no keys are held or they cancel out."""
    direction = Vector2(right - left, down - up)
    if direction.length() == 0:
        return direction
    return direction.normalize()


class Player:
    def __init__(self) -> None:
        self.position = Vector2(WIDTH / 2, HEIGHT / 2)

    def move(self, direction: Vector2, dt: float) -> None:
        self.position += direction * PLAYER_SPEED * dt
        self.position.x = clamp(self.position.x, PLAYER_RADIUS, WIDTH - PLAYER_RADIUS)
        self.position.y = clamp(self.position.y, PLAYER_RADIUS, HEIGHT - PLAYER_RADIUS)


class GameState(Enum):
    TITLE = "title"
    PLAYING = "playing"
    PAUSED = "paused"
    OVER = "over"


class Game:
    def __init__(self, rng: random.Random, lives: int = 3) -> None:
        self.rng = rng
        self.player = Player()
        self.score = 0
        self.lives = lives
        self.state = GameState.TITLE

    def start(self) -> None:
        if self.state == GameState.TITLE:
            self.state = GameState.PLAYING

    def toggle_pause(self) -> None:
        if self.state == GameState.PLAYING:
            self.state = GameState.PAUSED
        elif self.state == GameState.PAUSED:
            self.state = GameState.PLAYING

    def update(self, direction: Vector2, dt: float) -> None:
        if self.state != GameState.PLAYING:
            return
        self.player.move(direction, dt)
```

A vector of length 0 is returned as it is: standing still. Anything else is normalised.

```predict
question: Why normalise in direction_from, and not inside Player.move, which every movement goes through?
choice: Player.move is called more often
choice: Because only keys give lengths that are too long; something else may rightly ask for less than full speed
choice: Because Player.move can't call normalize
answer: Because only keys give lengths that are too long; something else may rightly ask for less than full speed
explain: Chapter 11 adds gamepads, whose sticks tilt part of the way: a stick pushed halfway gives a direction of length 0.5, which should mean half speed. If `Player.move` normalised everything, a gently tilted stick would run at full speed. The fix belongs where the problem comes from, four keys that can add up to √2, not where every direction passes.
```

```powershell
.venv\Scripts\python -m pytest -q tests/test_shooter_model.py
```

```text
2 passed in 0.21s
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_shooter_model.py" stdout="2 passed"
run ".venv/Scripts/python -m pytest -q" stdout="148 passed"
```

## Aiming at the mouse

**Build:** the player turns to face the mouse pointer.

Aiming needs the **angle** from the player to the mouse: which way the gun points. Given the offset from one point to another, `(dx, dy)`, the angle comes from **`math.atan2(dy, dx)`**, the "two-argument arctangent". It returns the angle in **radians**, the unit mathematics uses (a full turn is 2π radians, so half a turn is π ≈ 3.14), between −π and π. `math.degrees` converts to degrees:

```text
>>> import math
>>> math.atan2(0, 1)
0.0
>>> math.atan2(1, 0)
1.5707963267948966
>>> math.degrees(math.atan2(1, 0))
90.0
>>> math.degrees(math.atan2(0, -1))
180.0
>>> math.degrees(math.atan2(-1, -1))
-135.0
```

| Mouse is | Offset `(dx, dy)` | `atan2(dy, dx)` in degrees |
|---|---|---|
| to the right | `(1, 0)` | 0 |
| below (down the screen) | `(0, 1)` | 90 |
| to the left | `(−1, 0)` | 180 |
| above | `(0, −1)` | −90 |
| up and to the left | `(−1, −1)` | −135 |

Two things to notice. **The order is `y` first**, `atan2(dy, dx)`: easy to get backwards. And **angles go clockwise on the screen**: in a mathematics book y points up and 90° is straight up, but on a screen y points down (lesson 1.3), so 90° is straight down. Why not `math.atan(dy / dx)`, the ordinary arctangent? It divides first, so it fails when `dx` is 0 (straight up or down), and it can't tell opposite directions apart: `atan(1 / 1)` and `atan(-1 / -1)` are both 45°, because the signs cancel. `atan2` looks at both signs, which is why it has two arguments.

The model gets a function for the angle, and the player remembers it:

```python file=shooter/model.py
import math
import random
from enum import Enum

from pygame import Vector2

WIDTH, HEIGHT = 640, 480
PLAYER_SPEED = 220
PLAYER_RADIUS = 12


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(value, high))


def direction_from(left: bool, right: bool, up: bool, down: bool) -> Vector2:
    """Which way the held keys point: length 1, or 0 when no keys are held or they cancel out."""
    direction = Vector2(right - left, down - up)
    if direction.length() == 0:
        return direction
    return direction.normalize()


def aim_angle(origin: Vector2, target: Vector2) -> float:
    """The angle from origin to target, in degrees: 0 points right, and 90 points down the screen."""
    offset = target - origin
    return math.degrees(math.atan2(offset.y, offset.x))


class Player:
    def __init__(self) -> None:
        self.position = Vector2(WIDTH / 2, HEIGHT / 2)
        self.angle = 0.0

    def move(self, direction: Vector2, dt: float) -> None:
        self.position += direction * PLAYER_SPEED * dt
        self.position.x = clamp(self.position.x, PLAYER_RADIUS, WIDTH - PLAYER_RADIUS)
        self.position.y = clamp(self.position.y, PLAYER_RADIUS, HEIGHT - PLAYER_RADIUS)


class GameState(Enum):
    TITLE = "title"
    PLAYING = "playing"
    PAUSED = "paused"
    OVER = "over"


class Game:
    def __init__(self, rng: random.Random, lives: int = 3) -> None:
        self.rng = rng
        self.player = Player()
        self.score = 0
        self.lives = lives
        self.state = GameState.TITLE

    def start(self) -> None:
        if self.state == GameState.TITLE:
            self.state = GameState.PLAYING

    def toggle_pause(self) -> None:
        if self.state == GameState.PLAYING:
            self.state = GameState.PAUSED
        elif self.state == GameState.PAUSED:
            self.state = GameState.PLAYING

    def update(self, direction: Vector2, target: Vector2, dt: float) -> None:
        if self.state != GameState.PLAYING:
            return
        self.player.move(direction, dt)
        self.player.angle = aim_angle(self.player.position, target)
```

`update` takes a `target`, the point to aim at, and sets the player's angle each frame. Until the app passes one, the shooter won't start: pyright says where (`Argument missing for parameter "dt"`, in `app.py`).

## The app supplies the mouse

**Build:** the app aims at the mouse pointer; a test run, with no mouse, aims to the right.

```python file=shooter/app.py
import os
import random
import sqlite3
import sys
from datetime import UTC, datetime
from pathlib import Path

import pygame
from pygame import Vector2

from shooter.config import KEYS, Config, ConfigError, load_config
from shooter.draw import draw
from shooter.model import HEIGHT, WIDTH, Game, GameState, direction_from
from shooter.scores import Score, add_score, best, end_session, open_scores, start_session
from shooter.settings import Hold, parse_args

ARENA = "Arena"  # the shooter's only level: its scores are saved under this name
HOLDS = {Hold.NONE: Vector2(0, 0), Hold.LEFT: Vector2(-1, 0), Hold.RIGHT: Vector2(1, 0), Hold.AUTO: Vector2(0, 0)}


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
        print(f"shooter: {settings.config}: {error}", file=sys.stderr)
        sys.exit(1)
    controls = config.controls
    player = settings.player or config.player
    game = Game(rng)
    if settings.test_frames is not None:
        game.start()
    scores_file = settings.scores
    if scores_file is None and settings.test_frames is None:
        scores_file = Path(pygame.system.get_pref_path("forge", "shooter")) / "scores.db"
    db = None
    session = None
    best_score = None
    if scores_file:
        try:
            db = open_scores(scores_file)
            best_score = best(db, ARENA)
            session = start_session(db, player, datetime.now(UTC))
        except sqlite3.Error as error:
            print(f"shooter: {scores_file}: {error}; playing without keeping scores", file=sys.stderr)
            db = None

    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Shooter")
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
                if game.state == GameState.OVER:
                    game = Game(rng)
                game.start()
            elif event.type == pygame.KEYDOWN and event.key == KEYS[controls.pause]:
                game.toggle_pause()

        if settings.test_frames is None:
            keys = pygame.key.get_pressed()
            direction = direction_from(
                keys[KEYS[controls.left]],
                keys[KEYS[controls.right]],
                keys[KEYS[controls.up]],
                keys[KEYS[controls.down]],
            )
            target = Vector2(pygame.mouse.get_pos())
        else:
            direction = HOLDS[settings.hold]
            target = game.player.position + Vector2(1, 0)
        before = game.state
        game.update(direction, target, dt)
        if db and game.state != before and game.state == GameState.OVER:
            score = Score(player, ARENA, game.score, datetime.now(UTC), False)
            add_score(db, score, session)
            best_score = best(db, ARENA)

        draw(screen, font, game, best_score)
        pygame.display.flip()

        frames += 1
        if settings.test_frames is not None and frames >= settings.test_frames:
            running = False

    pygame.quit()
    if db:
        if session is not None:
            end_session(db, session, datetime.now(UTC))
        db.close()
    if settings.test_frames is not None:
        x, y = game.player.position
        print(f"frames={frames} x={x:.0f} y={y:.0f} score={game.score} lives={game.lives}")


def run() -> None:
    main(sys.argv[1:])
```

`pygame.mouse.get_pos()` returns the pointer's position in the window as `(x, y)`, which `Vector2(...)` turns into a vector.

```check
run ".venv/Scripts/shooter --test-run 60 --hold right" stdout="frames=60 x=540 y=240"
```

## Drawing the barrel

**Build:** a barrel from the player's centre, 20 pixels long, pointing along the angle.

```python file=shooter/draw.py
import pygame
from pygame import Vector2

from shooter.model import PLAYER_RADIUS, Game, GameState

BACKGROUND = (24, 26, 33)
PLAYER_COLOUR = (94, 234, 212)
TEXT_COLOUR = (230, 230, 230)
MESSAGES = {
    GameState.TITLE: "SHOOTER: press Space to play",
    GameState.PAUSED: "Paused: press P to go on",
    GameState.OVER: "Game over: press Space to play again",
}


def draw(screen: pygame.Surface, font: pygame.font.Font, game: Game, best: int | None) -> None:
    screen.fill(BACKGROUND)
    player = game.player
    pygame.draw.circle(screen, PLAYER_COLOUR, player.position, PLAYER_RADIUS)
    barrel = player.position + Vector2(PLAYER_RADIUS + 8, 0).rotate(player.angle)
    pygame.draw.line(screen, PLAYER_COLOUR, player.position, barrel, 4)
    status = f"Score {game.score}   Lives {game.lives}"
    if best is not None:
        status += f"   Best {best}"
    screen.blit(font.render(status, True, TEXT_COLOUR), (16, 16))
    message = MESSAGES.get(game.state)
    if message is not None:
        text = font.render(message, True, TEXT_COLOUR)
        screen.blit(text, text.get_rect(center=screen.get_rect().center))
```

`Vector2(PLAYER_RADIUS + 8, 0)` is a 20-pixel arrow pointing right, at angle 0. **`rotate(angle)`** turns a vector by an angle in degrees; with y pointing down, a positive angle turns it clockwise on the screen, the same convention as `atan2`, so the two agree. Adding the turned arrow to the player's position gives the barrel's end:

```text
>>> Vector2(20, 0).rotate(90)
Vector2(-0, 20)
>>> Vector2(20, 0).rotate(-135)
Vector2(-14.1421, -14.1421)
```

At 90° the barrel points down (`-0` is a float's negative zero, equal to 0); at −135° it points up and to the left. Run `.venv\Scripts\shooter`, start, and move the mouse around the player.

## Tests for the angles

**Build:** the table of angles, as a test.

```python file=tests/test_shooter_model.py
"""The shooter's player: moving in eight directions, and aiming."""

import math

from pygame import Vector2

from shooter.model import PLAYER_SPEED, Player, aim_angle, direction_from


def distance_moved(direction: Vector2, dt: float) -> float:
    player = Player()
    start = Vector2(player.position)
    player.move(direction, dt)
    return player.position.distance_to(start)


def test_moving_diagonally_is_no_faster_than_moving_straight():
    straight = distance_moved(direction_from(left=False, right=True, up=False, down=False), 0.1)
    diagonal = distance_moved(direction_from(left=False, right=True, up=True, down=False), 0.1)
    assert math.isclose(straight, PLAYER_SPEED * 0.1)
    assert math.isclose(diagonal, straight)


def test_no_keys_or_opposite_keys_mean_standing_still():
    assert direction_from(left=False, right=False, up=False, down=False) == Vector2(0, 0)
    assert direction_from(left=True, right=True, up=False, down=False) == Vector2(0, 0)


def test_angles_go_clockwise_on_the_screen_because_y_points_down():
    centre = Vector2(100, 100)
    assert aim_angle(centre, Vector2(150, 100)) == 0
    assert aim_angle(centre, Vector2(100, 150)) == 90
    assert aim_angle(centre, Vector2(50, 100)) == 180
    assert aim_angle(centre, Vector2(100, 50)) == -90
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="149 passed"
run ".venv/Scripts/python -m pyright breakout shooter tests replay.py" stdout="0 errors"
```

## Your turn: toward

**Build, on your own:** a function the next two lessons need, `toward(origin, target)`, the unit vector from one point to another.

Bullets will fly from the player towards where it aims, and zombies will walk towards the player: both need "which way is that point from this one", as a direction of length 1. Click **Create provided tests/test_shooter_toward.py**:

```python file=tests/test_shooter_toward.py provided
"""toward: the direction from one point to another, for anything that moves at something."""

from pygame import Vector2

from shooter.model import toward


def test_toward_has_length_1_and_points_at_the_target():
    assert toward(Vector2(0, 0), Vector2(3, 4)) == Vector2(0.6, 0.8)
    assert toward(Vector2(10, 10), Vector2(10, 0)) == Vector2(0, -1)


def test_toward_the_same_point_is_no_direction_at_all():
    assert toward(Vector2(5, 5), Vector2(5, 5)) == Vector2(0, 0)
```

```powershell
.venv\Scripts\python -m pytest -q tests/test_shooter_toward.py
```

```text
E   ImportError: cannot import name 'toward' from 'shooter.model'
```

| Test | Result |
|---|---|
| `pytest -q tests/test_shooter_toward.py` | `2 passed` |
| `toward(Vector2(5, 5), Vector2(5, 5))` | `Vector2(0, 0)`, with no error |

Write `toward` in `shooter/model.py`, typed and with a docstring like its neighbours. When all 151 tests pass and every check is clean, commit with a message that mentions **toward**.

```hints
nudge: The offset from `origin` to `target` is a subtraction of two vectors. What do you do with a vector to keep only its direction?
concept: `target - origin` is the vector from origin to target: its length is the distance between them, and its direction is the one you want. Normalising it keeps the direction and makes the length 1. But when the two points are the same, the offset is the zero vector, which `normalize` refuses, exactly as in `direction_from`.
shape: The same three steps as `direction_from`: work out the vector (here, `target - origin`), return it unchanged if its length is 0, and otherwise return it normalised.
answer: ~~~python
def toward(origin: Vector2, target: Vector2) -> Vector2:
    """Which way target is from origin: length 1, or 0 when they're the same point."""
    offset = target - origin
    if offset.length() == 0:
        return offset
    return offset.normalize()
~~~

Traced for the first test: `Vector2(3, 4) - Vector2(0, 0)` is `(3, 4)`, length 5, normalised to `(0.6, 0.8)`. The second: `(10, 0) - (10, 10)` is `(0, -10)`, straight up, normalised to `(0, -1)`. The third: `(5, 5) - (5, 5)` is `(0, 0)`, length 0, returned as it is, where `normalize` would have raised `ValueError`. The tests compare vectors with `==`, which for pygame's vectors allows a difference of up to a millionth, so `0.6` and the float division's result count as equal.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_shooter_toward.py" stdout="2 passed"
run ".venv/Scripts/python -m pytest -q" stdout="151 passed"
run ".venv/Scripts/python -m pyright breakout shooter tests replay.py" stdout="0 errors"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
run ".venv/Scripts/python -m ruff format --check ." stdout="already formatted" -- Run .venv\Scripts\python -m ruff format . to format your code.
git-message "toward"
git-clean
```

## Challenge: a crosshair

**Optional, ★.** Hide the system's mouse pointer while playing (`pygame.mouse.set_visible`) and draw a crosshair at the mouse position instead: two short lines crossing, in `draw`. Which module should know the mouse position, and how does it get to `draw`? On a branch.

## Challenge: aiming with the keyboard

**Optional, ★★.** Add four aiming actions to `Controls` (`aim_left`, `aim_right`, `aim_up`, `aim_down`) so a player can aim without a mouse, in eight directions. `direction_from` already turns four keys into a unit vector: what can `aim_angle` do with one? When no aiming key is held, keep the last angle. On a branch.

## Challenge: speeding up and slowing down

**Optional, ★★.** The player reaches full speed instantly and stops dead. Give the player a velocity that moves towards `direction * PLAYER_SPEED` by at most `ACCELERATION * dt` each frame (`Vector2.move_towards` does exactly this). Test that the player takes the expected time to reach full speed, and that the diagonal is still no faster. On a branch.

## What did we actually learn?

- **A vector's length** is `√(x² + y²)`; adding two unit moves at right angles gives length √2, the **diagonal speed bug**.
- **Normalising** makes a **unit vector**: direction only. The **zero vector** can't be normalised, so every normalisation needs a decision about it.
- **Fix a problem where it comes from**: only keys produce too-long directions, so `direction_from` normalises, and `Player.move` still accepts slower directions.
- **`atan2(dy, dx)`** gives the angle of an offset, in radians from −π to π, using both signs; `math.degrees` converts. On a screen, angles go clockwise. **`rotate`** turns a vector by degrees, the same way.
- **A type checker's errors after a change are a to-do list** of every place the change reaches.

Godot's `Vector2.normalized()` and Unity's `Vector2.normalized` both return the zero vector for a zero vector, instead of raising an error: a different answer to the same decision, and one that hides the case instead of making you decide. C#'s `Math.Atan2(y, x)` and Java's `Math.atan2(y, x)` take their arguments in the same order as Python's: y first, everywhere.
