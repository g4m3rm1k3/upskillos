---
reference: optional
title: 8.3 — Things That Come and Go
runtime: python
run: shooter/__main__.py
---

Everything in Breakout existed from the first frame: one paddle, one ball (replaced, never added to), and a wall of bricks that only shrank. A shooter is different. Bullets are **created** while the game runs, dozens a second, and each one must be **removed** when it's spent, or the game slowly fills up with bullets nobody can see. Objects that come and go are the normal case in games (bullets, enemies, particles, pickups) and in most other programs (requests, connections, open files). This lesson builds them, and then hunts the bug almost everyone writes the first time they remove things from a list: removing them **while looping over it**.

## The model so far

**Build:** make sure `shooter/model.py` matches the end of lesson 8.2, the reference answer to its Your turn.

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


def toward(origin: Vector2, target: Vector2) -> Vector2:
    """Which way target is from origin: length 1, or 0 when they're the same point."""
    offset = target - origin
    if offset.length() == 0:
        return offset
    return offset.normalize()


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

```check
run ".venv/Scripts/python -m pytest -q" stdout="151 passed"
```

## The end of the barrel

**Build:** the player knows where its gun's barrel ends.

Bullets will start at the end of the barrel, and `draw` already works that point out. Two places computing the same point is how they come to disagree (lesson 2.2's DRY), so the point moves into the model, as a method of the player, and both use it:

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


def toward(origin: Vector2, target: Vector2) -> Vector2:
    """Which way target is from origin: length 1, or 0 when they're the same point."""
    offset = target - origin
    if offset.length() == 0:
        return offset
    return offset.normalize()


class Player:
    def __init__(self) -> None:
        self.position = Vector2(WIDTH / 2, HEIGHT / 2)
        self.angle = 0.0

    def move(self, direction: Vector2, dt: float) -> None:
        self.position += direction * PLAYER_SPEED * dt
        self.position.x = clamp(self.position.x, PLAYER_RADIUS, WIDTH - PLAYER_RADIUS)
        self.position.y = clamp(self.position.y, PLAYER_RADIUS, HEIGHT - PLAYER_RADIUS)

    def muzzle(self) -> Vector2:
        """The end of the gun's barrel: just outside the player, in the direction they're aiming."""
        return self.position + Vector2(PLAYER_RADIUS + 8, 0).rotate(self.angle)


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

The **muzzle** is the open end of a gun's barrel: a 20-pixel arrow pointing right, turned to the player's angle and added to its position, exactly the sum `draw` did.

## Drawing from the muzzle

**Build:** `draw` asks the player where its barrel ends, instead of working it out.

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
    pygame.draw.line(screen, PLAYER_COLOUR, player.position, player.muzzle(), 4)
    status = f"Score {game.score}   Lives {game.lives}"
    if best is not None:
        status += f"   Best {best}"
    screen.blit(font.render(status, True, TEXT_COLOUR), (16, 16))
    message = MESSAGES.get(game.state)
    if message is not None:
        text = font.render(message, True, TEXT_COLOUR)
        screen.blit(text, text.get_rect(center=screen.get_rect().center))
```

```check
contains shooter/draw.py "player.muzzle()"
run ".venv/Scripts/python -m pyright breakout shooter tests replay.py" stdout="0 errors"
```

## A bullet

**Build:** holding the trigger fires bullets that fly in the direction the player aims.

A bullet is a position and a velocity, moved each frame, like Breakout's ball before it bounced off anything:

```python file=shooter/model.py
import math
import random
from dataclasses import dataclass
from enum import Enum

from pygame import Vector2

WIDTH, HEIGHT = 640, 480
PLAYER_SPEED = 220
PLAYER_RADIUS = 12
BULLET_SPEED = 600
BULLET_RADIUS = 3


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


def toward(origin: Vector2, target: Vector2) -> Vector2:
    """Which way target is from origin: length 1, or 0 when they're the same point."""
    offset = target - origin
    if offset.length() == 0:
        return offset
    return offset.normalize()


class Player:
    def __init__(self) -> None:
        self.position = Vector2(WIDTH / 2, HEIGHT / 2)
        self.angle = 0.0

    def move(self, direction: Vector2, dt: float) -> None:
        self.position += direction * PLAYER_SPEED * dt
        self.position.x = clamp(self.position.x, PLAYER_RADIUS, WIDTH - PLAYER_RADIUS)
        self.position.y = clamp(self.position.y, PLAYER_RADIUS, HEIGHT - PLAYER_RADIUS)

    def muzzle(self) -> Vector2:
        """The end of the gun's barrel: just outside the player, in the direction they're aiming."""
        return self.position + Vector2(PLAYER_RADIUS + 8, 0).rotate(self.angle)


@dataclass
class Bullet:
    position: Vector2
    velocity: Vector2

    def move(self, dt: float) -> None:
        self.position += self.velocity * dt

    def inside(self) -> bool:
        return 0 <= self.position.x <= WIDTH and 0 <= self.position.y <= HEIGHT


class GameState(Enum):
    TITLE = "title"
    PLAYING = "playing"
    PAUSED = "paused"
    OVER = "over"


class Game:
    def __init__(self, rng: random.Random, lives: int = 3) -> None:
        self.rng = rng
        self.player = Player()
        self.bullets: list[Bullet] = []
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

    def update(self, direction: Vector2, target: Vector2, firing: bool, dt: float) -> None:
        if self.state != GameState.PLAYING:
            return
        self.player.move(direction, dt)
        self.player.angle = aim_angle(self.player.position, target)
        if firing:
            velocity = Vector2(BULLET_SPEED, 0).rotate(self.player.angle)
            self.bullets.append(Bullet(self.player.muzzle(), velocity))
        for bullet in self.bullets:
            bullet.move(dt)
```

- **`@dataclass class Bullet`** (lesson 3.2): `position` and `velocity` as fields, `move` to fly, and `inside` to say whether it's still in the arena.
- **The velocity** is `Vector2(BULLET_SPEED, 0).rotate(self.player.angle)`: 600 pixels a second pointing right, turned to the player's aim, the same way the muzzle is found. (`toward(player, target) * BULLET_SPEED` would point the same way, except when the mouse is exactly on the player, where `toward` gives the zero vector, and the bullet would hang in the air. The angle always has a direction.)
- **`self.bullets: list[Bullet] = []`** in `__init__`: each game gets its own new, empty list. Written as a class attribute, `bullets = []` at class level, one list would be shared by every `Game` ever made, lesson 3.2's shared-object trap.
- **`Bullet(self.player.muzzle(), velocity)`**: `muzzle()` returns a **new** vector each time it's called, so each bullet owns its position. If a bullet were given `self.player.position` itself, `bullet.move` would add to the player's own vector, and the player would fly off with its first bullet.
- **`firing`**: a new parameter of `update`. The model doesn't know about mice: it's told whether the trigger is held.

## The trigger

**Build:** the app tells the model when the trigger is held, and a test run counts bullets.

In a real game the trigger is the left mouse button; a test run holds the trigger down the whole time, and the summary counts bullets:

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
            firing = pygame.mouse.get_pressed()[0]
        else:
            direction = HOLDS[settings.hold]
            target = game.player.position + Vector2(1, 0)
            firing = True
        before = game.state
        game.update(direction, target, firing, dt)
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
        print(f"frames={frames} x={x:.0f} y={y:.0f} score={game.score} lives={game.lives} bullets={len(game.bullets)}")


def run() -> None:
    main(sys.argv[1:])
```

`pygame.mouse.get_pressed()` returns three booleans, the left, middle and right buttons held right now, the mouse's version of `key.get_pressed()`; `[0]` is the left button.

## Drawing bullets

**Build:** every bullet is drawn as a small yellow circle.

```python file=shooter/draw.py
import pygame

from shooter.model import BULLET_RADIUS, PLAYER_RADIUS, Game, GameState

BACKGROUND = (24, 26, 33)
PLAYER_COLOUR = (94, 234, 212)
BULLET_COLOUR = (250, 204, 21)
TEXT_COLOUR = (230, 230, 230)
MESSAGES = {
    GameState.TITLE: "SHOOTER: press Space to play",
    GameState.PAUSED: "Paused: press P to go on",
    GameState.OVER: "Game over: press Space to play again",
}


def draw(screen: pygame.Surface, font: pygame.font.Font, game: Game, best: int | None) -> None:
    screen.fill(BACKGROUND)
    for bullet in game.bullets:
        pygame.draw.circle(screen, BULLET_COLOUR, bullet.position, BULLET_RADIUS)
    player = game.player
    pygame.draw.circle(screen, PLAYER_COLOUR, player.position, PLAYER_RADIUS)
    pygame.draw.line(screen, PLAYER_COLOUR, player.position, player.muzzle(), 4)
    status = f"Score {game.score}   Lives {game.lives}"
    if best is not None:
        status += f"   Best {best}"
    screen.blit(font.render(status, True, TEXT_COLOUR), (16, 16))
    message = MESSAGES.get(game.state)
    if message is not None:
        text = font.render(message, True, TEXT_COLOUR)
        screen.blit(text, text.get_rect(center=screen.get_rect().center))
```

Bullets are drawn first, so the player is drawn over them as they leave the barrel.

```predict
question: A test run fires one bullet every frame, aiming right. How many bullets are in the game after 600 frames?
answer: 600
tolerance: 0
explain: One bullet a frame, and nothing ever removes one. After 600 frames there are 600, and all but the newest few are far off the right of the screen, still being moved every frame.
verify: .venv/Scripts/python -c "import random; from pygame import Vector2; from shooter.model import Game; g = Game(random.Random(0)); g.start(); [g.update(Vector2(0, 0), Vector2(1000, 240), True, 1 / 60) for _ in range(600)]; print(len(g.bullets))"
```

```powershell
.venv\Scripts\shooter --test-run 600
```

```text
frames=600 x=320 y=240 score=0 lives=3 bullets=600
```

A bullet that has left the screen will never be seen again, but the game still holds it, moves it every frame and checks it every frame. Run for an hour and that's 216,000 bullets. Memory a program holds on to after it's stopped needing it is a **memory leak**, and one this obvious is easy to find. The bad ones grow by a few objects an hour.

```check
run ".venv/Scripts/shooter --test-run 600" stdout="bullets=600" label="every frame of a test run fires a bullet"
```

## Spent bullets go

**Build:** a bullet that leaves the arena is removed.

The obvious way: while moving each bullet, remove it if it's left.

```python file=shooter/model.py
import math
import random
from dataclasses import dataclass
from enum import Enum

from pygame import Vector2

WIDTH, HEIGHT = 640, 480
PLAYER_SPEED = 220
PLAYER_RADIUS = 12
BULLET_SPEED = 600
BULLET_RADIUS = 3


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


def toward(origin: Vector2, target: Vector2) -> Vector2:
    """Which way target is from origin: length 1, or 0 when they're the same point."""
    offset = target - origin
    if offset.length() == 0:
        return offset
    return offset.normalize()


class Player:
    def __init__(self) -> None:
        self.position = Vector2(WIDTH / 2, HEIGHT / 2)
        self.angle = 0.0

    def move(self, direction: Vector2, dt: float) -> None:
        self.position += direction * PLAYER_SPEED * dt
        self.position.x = clamp(self.position.x, PLAYER_RADIUS, WIDTH - PLAYER_RADIUS)
        self.position.y = clamp(self.position.y, PLAYER_RADIUS, HEIGHT - PLAYER_RADIUS)

    def muzzle(self) -> Vector2:
        """The end of the gun's barrel: just outside the player, in the direction they're aiming."""
        return self.position + Vector2(PLAYER_RADIUS + 8, 0).rotate(self.angle)


@dataclass
class Bullet:
    position: Vector2
    velocity: Vector2

    def move(self, dt: float) -> None:
        self.position += self.velocity * dt

    def inside(self) -> bool:
        return 0 <= self.position.x <= WIDTH and 0 <= self.position.y <= HEIGHT


class GameState(Enum):
    TITLE = "title"
    PLAYING = "playing"
    PAUSED = "paused"
    OVER = "over"


class Game:
    def __init__(self, rng: random.Random, lives: int = 3) -> None:
        self.rng = rng
        self.player = Player()
        self.bullets: list[Bullet] = []
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

    def update(self, direction: Vector2, target: Vector2, firing: bool, dt: float) -> None:
        if self.state != GameState.PLAYING:
            return
        self.player.move(direction, dt)
        self.player.angle = aim_angle(self.player.position, target)
        if firing:
            velocity = Vector2(BULLET_SPEED, 0).rotate(self.player.angle)
            self.bullets.append(Bullet(self.player.muzzle(), velocity))
        for bullet in self.bullets:
            bullet.move(dt)
            if not bullet.inside():
                self.bullets.remove(bullet)
```

`list.remove(x)` deletes the first item equal to `x` from the list. Once the game's list no longer refers to the bullet, nothing does, and Python frees its memory: CPython counts the references to every object, and when the count reaches zero the object is destroyed (Chapter 43 looks inside this). Removing it from the list is all it takes.

How many bullets should there be now? Work it out before running anything. The muzzle is 20 pixels right of the player, at x = 340, and a bullet leaves when it passes x = 640: 300 pixels at 600 pixels a second is half a second, 30 frames. A bullet a frame, each living 30 frames, means **about 30** bullets at once, however long the game runs.

```powershell
.venv\Scripts\shooter --test-run 60
.venv\Scripts\shooter --test-run 600
```

```text
frames=60 x=320 y=240 score=0 lives=3 bullets=31
frames=600 x=320 y=240 score=0 lives=3 bullets=31
```

The leak is gone: the count stays the same from frame 60 to frame 600. But it's 31, not 30. One bullet too many, every time. "About 30" was rough arithmetic, so it's tempting to shrug. Don't: a count that's off by one, in a way you can't explain, is a bug telling you it's there.

```check
run ".venv/Scripts/shooter --test-run 600" stdout="bullets=31" label="spent bullets are removed (one too few, as you'll find)"
```

## Bug hunt: the thirty-first bullet

**Build:** nothing in the project. Find out why there's one bullet too many.

Lesson 0.3's method: **reproduce** it as small as possible, **inspect** what the program really does, then explain it. Look at the bullets themselves, the x of the first four after 40 frames, oldest first:

```powershell
.venv\Scripts\python -c "import random; from pygame import Vector2; from shooter.model import Game; g = Game(random.Random(0)); g.start(); [g.update(Vector2(0, 0), Vector2(1000, 240), True, 1 / 60) for _ in range(40)]; print(len(g.bullets), [round(b.position.x) for b in g.bullets[:4]])"
```

```text
31 [640, 640, 630, 620]
```

Bullets fired one frame apart should be 10 pixels apart (600 pixels a second, for a sixtieth of a second), and the newer ones are: 640, 630, 620. But the oldest is at 640 too. It should be 10 pixels further on, at 650, past the edge and gone. It missed a move, and because it missed one, it's still inside. Try for ten minutes before the hints: why would a bullet skip a move?

```hints
nudge: Make it smaller still. In a scratch file, make a list of numbers, `[5, -1, -2, 7]`, loop over it with `for`, and `remove` every negative number inside the loop. Print the list afterwards. Is it what you expected?
concept: `for n in numbers` doesn't copy the list. It steps through the list by **position**: the loop's **iterator** remembers "next, position 1", then "next, position 2", and stops when the position passes the end. Removing an item moves every item after it one place to the left, so the item that was at the next position is now at the current one, which the iterator has already done.
answer: The scratch example prints `[5, -2, 7]`: `-2` survived. Traced:

| Iterator at | List | Item | Action |
|---|---|---|---|
| position 0 | `[5, -1, -2, 7]` | `5` | keep |
| position 1 | `[5, -1, -2, 7]` | `-1` | remove: `-2` moves to position 1 |
| position 2 | `[5, -2, 7]` | `7` | keep |
| position 3 | `[5, -2, 7]` | none: the end | stop |

`-2` was never looked at. In the game, the same thing happens every frame: when the oldest bullet leaves and is removed, the bullet after it slides into its place and is **skipped**, so it isn't moved that frame (that's the bullet that fell behind, 10 pixels short), and if it had left too, it isn't removed until the next frame. That's the thirty-first bullet: each frame, the bullet right behind a removed one survives one frame longer than it should.

The rule: **don't add to or remove from a list while looping over it.** Loop over one list, and build another: move every bullet, then keep the ones still inside, as a new list.
```

The fix is a **list comprehension** (lesson 2.6): `[bullet for bullet in self.bullets if bullet.inside()]` builds a new list of the bullets still inside, and the game's `bullets` is replaced by it. Nothing is removed from a list while it's being looped over, because the loop that moves bullets is finished before the comprehension starts. First, a test that catches the bug, so it can never come back.

## A test for every bullet

**Build:** tests that fail on the thirty-first bullet.

```python file=tests/test_shooter_bullets.py
"""Bullets: fired, flying, and gone once they leave the arena."""

import random

from pygame import Vector2

from shooter.model import WIDTH, Bullet, Game

STILL = Vector2(0, 0)


def started_game() -> Game:
    game = Game(random.Random(0))
    game.start()
    return game


def test_every_bullet_moves_every_frame_even_after_one_leaves():
    game = started_game()
    leaving = Bullet(Vector2(WIDTH - 1, 100), Vector2(600, 0))
    staying = Bullet(Vector2(100, 100), Vector2(600, 0))
    game.bullets = [leaving, staying]
    game.update(STILL, Vector2(WIDTH, 240), firing=False, dt=0.1)
    assert game.bullets == [staying]
    assert staying.position == Vector2(160, 100)


def test_two_bullets_leaving_in_the_same_frame_both_go():
    game = started_game()
    game.bullets = [Bullet(Vector2(WIDTH - 1, 100), Vector2(600, 0)), Bullet(Vector2(WIDTH - 1, 200), Vector2(600, 0))]
    game.update(STILL, Vector2(WIDTH, 240), firing=False, dt=0.1)
    assert game.bullets == []
```

Each test sets up the exact case from the trace: a bullet one pixel from the edge, which leaves this frame, followed by another bullet. `game.bullets = [leaving, staying]` puts bullets straight into the game, the way lesson 5.1's tests built games from bricks they chose. The first test checks that the bullet behind the leaving one still moved, 600 × 0.1 = 60 pixels; the second, that two bullets leaving together both go.

```powershell
.venv\Scripts\python -m pytest -q tests/test_shooter_bullets.py
```

```text
E       assert Vector2(100, 100) == Vector2(160, 100)
E       assert [Bullet(posit...tor2(600, 0))] == []
E         Left contains one more item: Bullet(position=Vector2(639, 200), velocity=Vector2(600, 0))
2 failed in 0.27s
```

The staying bullet never moved, and of two leaving bullets, the second is still there, never moved either, at x = 639.

```check
run ".venv/Scripts/python -m pytest -q tests/test_shooter_bullets.py" exit=1 stdout="2 failed" label="the new tests catch the skipped bullet"
```

## Spent bullets, gone properly

**Build:** move every bullet, then keep the ones still inside.

```python file=shooter/model.py
import math
import random
from dataclasses import dataclass
from enum import Enum

from pygame import Vector2

WIDTH, HEIGHT = 640, 480
PLAYER_SPEED = 220
PLAYER_RADIUS = 12
BULLET_SPEED = 600
BULLET_RADIUS = 3


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


def toward(origin: Vector2, target: Vector2) -> Vector2:
    """Which way target is from origin: length 1, or 0 when they're the same point."""
    offset = target - origin
    if offset.length() == 0:
        return offset
    return offset.normalize()


class Player:
    def __init__(self) -> None:
        self.position = Vector2(WIDTH / 2, HEIGHT / 2)
        self.angle = 0.0

    def move(self, direction: Vector2, dt: float) -> None:
        self.position += direction * PLAYER_SPEED * dt
        self.position.x = clamp(self.position.x, PLAYER_RADIUS, WIDTH - PLAYER_RADIUS)
        self.position.y = clamp(self.position.y, PLAYER_RADIUS, HEIGHT - PLAYER_RADIUS)

    def muzzle(self) -> Vector2:
        """The end of the gun's barrel: just outside the player, in the direction they're aiming."""
        return self.position + Vector2(PLAYER_RADIUS + 8, 0).rotate(self.angle)


@dataclass
class Bullet:
    position: Vector2
    velocity: Vector2

    def move(self, dt: float) -> None:
        self.position += self.velocity * dt

    def inside(self) -> bool:
        return 0 <= self.position.x <= WIDTH and 0 <= self.position.y <= HEIGHT


class GameState(Enum):
    TITLE = "title"
    PLAYING = "playing"
    PAUSED = "paused"
    OVER = "over"


class Game:
    def __init__(self, rng: random.Random, lives: int = 3) -> None:
        self.rng = rng
        self.player = Player()
        self.bullets: list[Bullet] = []
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

    def update(self, direction: Vector2, target: Vector2, firing: bool, dt: float) -> None:
        if self.state != GameState.PLAYING:
            return
        self.player.move(direction, dt)
        self.player.angle = aim_angle(self.player.position, target)
        if firing:
            velocity = Vector2(BULLET_SPEED, 0).rotate(self.player.angle)
            self.bullets.append(Bullet(self.player.muzzle(), velocity))
        for bullet in self.bullets:
            bullet.move(dt)
        self.bullets = [bullet for bullet in self.bullets if bullet.inside()]
```

```powershell
.venv\Scripts\python -m pytest -q tests/test_shooter_bullets.py
.venv\Scripts\shooter --test-run 600
```

```text
2 passed in 0.14s
frames=600 x=320 y=240 score=0 lives=3 bullets=30
```

Thirty, as worked out. The arithmetic was right all along; the code wasn't.

**Engineer.** Changing a collection while something is walking through it is a bug in every language. Python's lists let it happen silently, as you saw; a `dict` refuses outright (`RuntimeError: dictionary changed size during iteration`); Java's lists throw a `ConcurrentModificationException`; C#'s throw `InvalidOperationException`. Game engines meet it constantly, because anything can destroy anything in the middle of a frame: a bullet removes a zombie while the engine is looping over zombies. Godot's answer is **`queue_free()`**: an object isn't removed when you ask, but marked, and removed at the end of the frame, when no loop is running. Chapter 10 builds Forge's version, for exactly this reason.

```check
run ".venv/Scripts/python -m pytest -q tests/test_shooter_bullets.py" stdout="2 passed"
run ".venv/Scripts/shooter --test-run 600" stdout="bullets=30"
run ".venv/Scripts/python -m pytest -q" stdout="153 passed"
```

## Your turn: one shot at a time

**Build, on your own:** the gun fires at most once every `COOLDOWN` seconds, 0.15, however long the trigger is held.

Sixty bullets a second isn't a gun, it's a hose. Real games limit how often a weapon fires with a **cooldown**: after each shot, a timer that must run out before the next. Click **Create provided tests/test_shooter_cooldown.py**:

```python file=tests/test_shooter_cooldown.py provided
"""The gun's cooldown: holding the trigger fires at once, then once every COOLDOWN seconds."""

import random

from pygame import Vector2

from shooter.model import COOLDOWN, Game

STILL = Vector2(0, 0)
RIGHT = Vector2(1000, 240)


def started_game() -> Game:
    game = Game(random.Random(0))
    game.start()
    return game


def test_the_first_shot_is_at_once_and_the_next_waits_for_the_cooldown():
    game = started_game()
    game.update(STILL, RIGHT, firing=True, dt=0.01)
    assert len(game.bullets) == 1
    game.update(STILL, RIGHT, firing=True, dt=COOLDOWN - 0.02)
    assert len(game.bullets) == 1
    game.update(STILL, RIGHT, firing=True, dt=0.03)
    assert len(game.bullets) == 2


def test_waiting_doesnt_save_shots_up():
    game = started_game()
    game.update(STILL, RIGHT, firing=False, dt=2.0)
    game.update(STILL, RIGHT, firing=True, dt=1 / 60)
    game.update(STILL, RIGHT, firing=True, dt=1 / 60)
    assert len(game.bullets) == 1
```

Read the second test closely: it describes a cooldown that **doesn't save shots up**. A player who waits two seconds and then holds the trigger gets one shot at once, then waits like anyone else, not a burst of thirteen saved-up shots.

| Test / command | Result |
|---|---|
| `pytest -q tests/test_shooter_cooldown.py` | `2 passed` |
| `shooter --test-run 600` | `bullets=3`: one shot every 0.15 s, each living half a second |
| `COOLDOWN` | a named constant in `shooter/model.py`, 0.15, with a comment saying what it measures |

The time a game has run is `dt` added up, frame by frame (lesson 1.3). When all 155 tests pass and every check is clean, commit with a message that mentions the **cooldown**.

```hints
nudge: The game needs to remember something between frames: how long until the gun may fire again. Where does a game remember things between frames?
concept: A **timer** in a game is a number of seconds that counts down by `dt` every frame. It's an attribute of the `Game`, set when something happens (a shot) and checked when it matters (the trigger is held). A cooldown that's run out is `<= 0`; it doesn't need to stop at exactly 0, because frames don't land on exact times.
shape: A constant `COOLDOWN = 0.15`. An attribute `self.cooldown = 0.0` in `__init__`, so the first shot comes at once. In `update`: count it down by `dt`; then fire only if the trigger is held **and** the cooldown is `<= 0`, and when you fire, set it back to `COOLDOWN`. Setting it, not adding to it, is what the second test is about.
answer: ~~~python
COOLDOWN = 0.15  # seconds between shots
...
        self.bullets: list[Bullet] = []
        self.cooldown = 0.0
...
        self.cooldown -= dt
        if firing and self.cooldown <= 0:
            self.cooldown = COOLDOWN
            velocity = Vector2(BULLET_SPEED, 0).rotate(self.player.angle)
            self.bullets.append(Bullet(self.player.muzzle(), velocity))
~~~

Traced for the second test: two seconds without firing take the cooldown from 0 to −2. Then the trigger: `−2 − 1/60` is `<= 0`, so one shot, and the cooldown is **set** to 0.15. Next frame: `0.15 − 1/60 = 0.133`, not `<= 0`, no shot: one bullet, as the test says. With `self.cooldown += COOLDOWN` instead, the cooldown after the first shot would be `−2.017 + 0.15 = −1.867`, still `<= 0`, and the gun would fire every frame until it had paid off two seconds of saved-up shots.

In a test run: a shot, then 0.15 s is 9 frames of 1/60 (to within a float's rounding, so the tenth frame fires), so a bullet every 9 or 10 frames, each alive for 30: three at a time.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_shooter_cooldown.py" stdout="2 passed"
run ".venv/Scripts/python -c \"import random; from pygame import Vector2; from shooter.model import Game; g = Game(random.Random(0)); g.start(); [g.update(Vector2(0, 0), Vector2(1000, 240), True, 1 / 60) for _ in range(600)]; print('bullets in flight:', len(g.bullets), 'after 600 frames')\"" stdout="bullets in flight: 3 after 600 frames" label="holding the trigger for 10 seconds keeps three bullets in flight" -- Count the cooldown down by dt every frame, and fire only when it's run out.
run ".venv/Scripts/python -m pytest -q" stdout="155 passed"
run ".venv/Scripts/python -m pyright breakout shooter tests replay.py" stdout="0 errors"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
run ".venv/Scripts/python -m ruff format --check ." stdout="already formatted" -- Run .venv\Scripts\python -m ruff format . to format your code.
git-message "cooldown"
git-clean
```

## Challenge: a pool of bullets

**Optional, ★.** Measure the cost of making bullets: `timeit` (lesson 7.6 used `time.perf_counter`) a million `Bullet(Vector2(...), Vector2(...))`. Then read about **object pools** (reusing spent objects instead of making new ones), and decide, with your measurement, whether the shooter needs one. Write your answer in a comment, on a branch.

## Challenge: bullets that run out

**Optional, ★★.** Give bullets a range: each one knows how far it has flown, and is removed after 400 pixels, even inside the arena. Test it the way `test_shooter_bullets.py` does, including a bullet that runs out in the same frame as one that leaves. On a branch.

## Challenge: a dictionary changed during the loop

**Optional, ★★.** In a scratch file, loop over a `dict` of bullets keyed by number and delete one inside the loop, and read the error. Then do the same with a `set`. Explain, in a few sentences, why Python refuses for these but not for a `list`. (A hint: what would "the next position" mean in a dictionary, whose items move around inside when it grows or shrinks?)

## What did we actually learn?

- **Objects that come and go**: created while running, and removed when spent, or the program leaks memory. CPython frees an object when nothing refers to it any more.
- **Never add to or remove from a list while looping over it**: the loop goes by position, and removing shifts what comes after. Loop over one list and build another (a comprehension), or remove after the loop.
- **A count you can't explain is a bug.** Work out what a number should be before you look at it, then believe the difference.
- **Timers in games** are seconds counted down by `dt`; **a cooldown** is set, not added to, so waiting doesn't save shots up.
- **The muzzle in one place**: when two parts of a program compute the same thing, one of them asks the other.

C# and Java refuse a list changed during a `foreach`/enhanced `for` with an exception, the safety Python gives dictionaries but not lists. Both have `removeIf`/`RemoveAll(predicate)`, which removes everything matching a condition in one safe pass: the comprehension's job, done in place.
