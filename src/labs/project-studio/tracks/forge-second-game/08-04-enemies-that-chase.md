---
reference: optional
title: 8.4 — Enemies That Chase
runtime: python
run: shooter/__main__.py
---

A shooter needs something to shoot. This lesson adds the zombies: they appear at the edges on a timer, walk straight at the player, die when a bullet touches them, and cost a life when they reach the player, who then gets a moment of safety. Each of those is a small, general idea from game programming with a real name: a **periodic timer**, **seek** steering, **circle collision**, and **invulnerability frames**. By the end the shooter is a game you can lose, and the Your turn gives test runs an autopilot that plays it.

## The model so far

**Build:** make sure `shooter/model.py` matches the end of lesson 8.3, the reference answer to its Your turn.

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
COOLDOWN = 0.15  # seconds between shots


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
        self.cooldown = 0.0
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
        self.cooldown -= dt
        if firing and self.cooldown <= 0:
            self.cooldown = COOLDOWN
            velocity = Vector2(BULLET_SPEED, 0).rotate(self.player.angle)
            self.bullets.append(Bullet(self.player.muzzle(), velocity))
        for bullet in self.bullets:
            bullet.move(dt)
        self.bullets = [bullet for bullet in self.bullets if bullet.inside()]
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="155 passed"
```

## Where zombies come from

**Build:** a zombie appears every second, just outside a random edge of the arena.

A zombie should walk **in** from off-screen, so it starts just outside one of the four edges, at a random place along it. Try the two random choices that takes in the REPL, with a seeded generator (lesson 2.6), so you can repeat them:

```text
>>> import random
>>> rng = random.Random(0)
>>> rng.choice(["top", "right", "bottom", "left"])
'left'
>>> rng.uniform(0, 480)
363.81811341134517
>>> rng.choice(["top", "right", "bottom", "left"])
'left'
```

`rng.choice(items)` picks one item, each equally likely; `rng.uniform(a, b)` picks a float between `a` and `b`. Seed 0 picks the left edge twice running (and a third time after that): equally likely doesn't mean evenly spread over a few tries. Now the zombie, where it spawns, and a timer that spawns one every second:

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
COOLDOWN = 0.15  # seconds between shots
ZOMBIE_SPEED = 70
ZOMBIE_RADIUS = 14
SPAWN_EVERY = 1.0  # seconds between zombies


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


@dataclass
class Zombie:
    position: Vector2


def spawn_point(rng: random.Random) -> Vector2:
    """A random place just outside one of the arena's four edges, so a zombie walks in."""
    side = rng.choice(["top", "right", "bottom", "left"])
    if side == "top":
        return Vector2(rng.uniform(0, WIDTH), -ZOMBIE_RADIUS)
    if side == "right":
        return Vector2(WIDTH + ZOMBIE_RADIUS, rng.uniform(0, HEIGHT))
    if side == "bottom":
        return Vector2(rng.uniform(0, WIDTH), HEIGHT + ZOMBIE_RADIUS)
    return Vector2(-ZOMBIE_RADIUS, rng.uniform(0, HEIGHT))


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
        self.cooldown = 0.0
        self.zombies: list[Zombie] = []
        self.next_zombie = SPAWN_EVERY
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
        self.cooldown -= dt
        if firing and self.cooldown <= 0:
            self.cooldown = COOLDOWN
            velocity = Vector2(BULLET_SPEED, 0).rotate(self.player.angle)
            self.bullets.append(Bullet(self.player.muzzle(), velocity))
        for bullet in self.bullets:
            bullet.move(dt)
        self.bullets = [bullet for bullet in self.bullets if bullet.inside()]
        self.next_zombie -= dt
        if self.next_zombie <= 0:
            self.zombies.append(Zombie(spawn_point(self.rng)))
            self.next_zombie += SPAWN_EVERY
```

- **`spawn_point(rng)`** picks a side, then a place along it, and returns a point `ZOMBIE_RADIUS` beyond that edge, so the whole zombie starts out of sight. The game's own `self.rng` is passed in, so a seed decides every spawn, and test runs and tests repeat exactly.
- **`Zombie`** is only a position, for now.
- **`self.next_zombie`** is a **periodic timer**: seconds until the next zombie, counted down by `dt`. When it runs out, a zombie appears and the timer is **added to**: `self.next_zombie += SPAWN_EVERY`.

That `+=` is the opposite of lesson 8.3's cooldown, and both are right. Frames don't land on exact times, so a timer usually runs out a little late: say at −0.01 s. Adding `SPAWN_EVERY` makes the next zombie come 0.99 s later, so over a minute exactly 60 zombies arrive: the leftover time is **kept**. That's what a spawner should do. A cooldown is **set** back to 0.15 instead, throwing the leftover away, because a player who waited shouldn't bank shots. Same countdown, two different promises about time.

```predict
question: A test run plays 600 frames, 10 seconds. How many zombies are in the game at the end?
answer: 10
tolerance: 0
explain: One a second for ten seconds, and nothing removes them yet. (The first arrives after one second, not at the start, because `next_zombie` starts at `SPAWN_EVERY`.)
verify: .venv/Scripts/python -c "import random; from pygame import Vector2; from shooter.model import Game; g = Game(random.Random(0)); g.start(); [g.update(Vector2(0, 0), Vector2(1000, 240), True, 1 / 60) for _ in range(600)]; print(len(g.zombies))"
```

## Zombies, counted

**Build:** the test run's summary counts the zombies.

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
        print(
            f"frames={frames} x={x:.0f} y={y:.0f} score={game.score} lives={game.lives} "
            f"bullets={len(game.bullets)} zombies={len(game.zombies)}"
        )


def run() -> None:
    main(sys.argv[1:])
```

The summary has grown past one line's width, so it's split over two f-strings that Python joins into one (strings written next to each other inside brackets are **concatenated** when the program is compiled).

## Zombies, drawn

**Build:** `draw` shows the zombies, under the bullets and the player.

```python file=shooter/draw.py
import pygame

from shooter.model import BULLET_RADIUS, PLAYER_RADIUS, ZOMBIE_RADIUS, Game, GameState

BACKGROUND = (24, 26, 33)
PLAYER_COLOUR = (94, 234, 212)
BULLET_COLOUR = (250, 204, 21)
ZOMBIE_COLOUR = (132, 204, 22)
TEXT_COLOUR = (230, 230, 230)
MESSAGES = {
    GameState.TITLE: "SHOOTER: press Space to play",
    GameState.PAUSED: "Paused: press P to go on",
    GameState.OVER: "Game over: press Space to play again",
}


def draw(screen: pygame.Surface, font: pygame.font.Font, game: Game, best: int | None) -> None:
    screen.fill(BACKGROUND)
    for zombie in game.zombies:
        pygame.draw.circle(screen, ZOMBIE_COLOUR, zombie.position, ZOMBIE_RADIUS)
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

```powershell
.venv\Scripts\shooter --test-run 600
```

```text
frames=600 x=320 y=240 score=0 lives=3 bullets=3 zombies=10
```

Ten zombies, standing just outside the edges where they appeared. Run the game, and you'll see nothing new: they're all off-screen.

```check
run ".venv/Scripts/shooter --test-run 600" stdout="bullets=3 zombies=10" label="a zombie arrives every second"
```

## Tests for the spawner

**Build:** tests that pin down where and how often zombies appear.

```python file=tests/test_shooter_zombies.py
"""Zombies: where they come from, how they chase, and what happens when they arrive."""

import random

from pygame import Vector2

from shooter.model import HEIGHT, SPAWN_EVERY, WIDTH, Game, spawn_point

STILL = Vector2(0, 0)
RIGHT = Vector2(1000, 240)


def started_game() -> Game:
    game = Game(random.Random(0))
    game.start()
    return game


def test_zombies_appear_just_outside_the_arena():
    rng = random.Random(0)
    for _ in range(100):
        point = spawn_point(rng)
        assert not (0 <= point.x <= WIDTH and 0 <= point.y <= HEIGHT)


def test_a_zombie_arrives_every_second():
    game = started_game()
    for _ in range(3):
        game.update(STILL, RIGHT, firing=False, dt=SPAWN_EVERY)
    assert len(game.zombies) == 3
```

The first test draws a hundred spawn points from one generator and checks that none is inside the arena: a test of a **property** that must hold for every random draw, rather than of one particular value. (Chapter 12 uses a library, Hypothesis, that generates the inputs for tests like this.) The second calls `update` with a `dt` of a whole second, three times: three zombies.

```check
run ".venv/Scripts/python -m pytest -q" stdout="157 passed"
```

## Zombies that chase

**Build:** every zombie walks straight at the player.

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
COOLDOWN = 0.15  # seconds between shots
ZOMBIE_SPEED = 70
ZOMBIE_RADIUS = 14
SPAWN_EVERY = 1.0  # seconds between zombies


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


@dataclass
class Zombie:
    position: Vector2

    def chase(self, target: Vector2, dt: float) -> None:
        self.position += toward(self.position, target) * ZOMBIE_SPEED * dt


def spawn_point(rng: random.Random) -> Vector2:
    """A random place just outside one of the arena's four edges, so a zombie walks in."""
    side = rng.choice(["top", "right", "bottom", "left"])
    if side == "top":
        return Vector2(rng.uniform(0, WIDTH), -ZOMBIE_RADIUS)
    if side == "right":
        return Vector2(WIDTH + ZOMBIE_RADIUS, rng.uniform(0, HEIGHT))
    if side == "bottom":
        return Vector2(rng.uniform(0, WIDTH), HEIGHT + ZOMBIE_RADIUS)
    return Vector2(-ZOMBIE_RADIUS, rng.uniform(0, HEIGHT))


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
        self.cooldown = 0.0
        self.zombies: list[Zombie] = []
        self.next_zombie = SPAWN_EVERY
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
        self.cooldown -= dt
        if firing and self.cooldown <= 0:
            self.cooldown = COOLDOWN
            velocity = Vector2(BULLET_SPEED, 0).rotate(self.player.angle)
            self.bullets.append(Bullet(self.player.muzzle(), velocity))
        for bullet in self.bullets:
            bullet.move(dt)
        self.bullets = [bullet for bullet in self.bullets if bullet.inside()]
        self.next_zombie -= dt
        if self.next_zombie <= 0:
            self.zombies.append(Zombie(spawn_point(self.rng)))
            self.next_zombie += SPAWN_EVERY
        for zombie in self.zombies:
            zombie.chase(self.player.position, dt)
```

`chase` is lesson 8.2's Your turn at work: `toward(self.position, target)` is the unit vector from the zombie to the player, scaled to `ZOMBIE_SPEED` pixels a second and to this frame's `dt`. Each frame the zombie looks where the player is **now**, so it turns as the player moves. Steering a character straight at a target is called **seek**, the simplest of the **steering behaviours** Craig Reynolds described for game characters in 1999; Chapter 19 adds the others (arriving, fleeing, keeping apart from each other).

## A test of the chase

**Build:** a test of one zombie's walk.

```python file=tests/test_shooter_zombies.py
"""Zombies: where they come from, how they chase, and what happens when they arrive."""

import random

from pygame import Vector2

from shooter.model import HEIGHT, SPAWN_EVERY, WIDTH, ZOMBIE_SPEED, Game, Zombie, spawn_point

STILL = Vector2(0, 0)
RIGHT = Vector2(1000, 240)


def started_game() -> Game:
    game = Game(random.Random(0))
    game.start()
    return game


def test_zombies_appear_just_outside_the_arena():
    rng = random.Random(0)
    for _ in range(100):
        point = spawn_point(rng)
        assert not (0 <= point.x <= WIDTH and 0 <= point.y <= HEIGHT)


def test_a_zombie_arrives_every_second():
    game = started_game()
    for _ in range(3):
        game.update(STILL, RIGHT, firing=False, dt=SPAWN_EVERY)
    assert len(game.zombies) == 3


def test_a_zombie_walks_straight_at_its_target():
    zombie = Zombie(Vector2(0, 0))
    zombie.chase(Vector2(300, 400), dt=1.0)
    assert zombie.position == Vector2(0.6, 0.8) * ZOMBIE_SPEED
```

From `(0, 0)` towards `(300, 400)`: the offset `(300, 400)` has length 500, so the unit vector is `(0.6, 0.8)`, and one second at `ZOMBIE_SPEED` moves the zombie `(0.6, 0.8) × 70 = (42, 56)`.

```predict
question: In a test run the player stands still in the middle, and nothing can hurt it yet. After 600 frames, where are the zombies that appeared in the first four seconds?
choice: Still at the edges
choice: Spread around the arena
choice: Piled up on the player
answer: Piled up on the player
explain: Each zombie walks at 70 pixels a second straight at the player, from at most about 400 pixels away, so it arrives within six seconds, and then stays: each frame it steps about a pixel towards the player's centre, overshoots it, and steps back, so it jitters on the spot. The early zombies end up in a heap in the middle; the later ones are still walking in. Nothing has hit anything yet.
```

Run the game: zombies walk in from the edges and gather on the player, harmlessly.

```check
run ".venv/Scripts/python -m pytest -q" stdout="158 passed"
run ".venv/Scripts/shooter --test-run 600" stdout="lives=3 bullets=3 zombies=10"
```

## Circles that touch

**Build:** a bullet that touches a zombie removes both, for 10 points.

Breakout's collisions were between rectangles, `Rect.colliderect` (lesson 1.4). The shooter's things are round, and two circles overlap exactly when the distance between their centres is less than their two radiuses added together:

| Circle A | Circle B | Distance between centres | Radiuses added | Touching? |
|---|---|---|---|---|
| `(0, 0)`, radius 10 | `(15, 0)`, radius 6 | 15 | 16 | yes: 15 < 16 |
| `(0, 0)`, radius 10 | `(16, 0)`, radius 6 | 16 | 16 | no: they only meet at a point |
| `(0, 0)`, radius 10 | `(3, 4)`, radius 1 | 5 | 11 | yes: B is inside A |

That's the whole test, and it doesn't care which way anything is turned, which is why so many games use circles even for things that aren't round. In the model:

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
COOLDOWN = 0.15  # seconds between shots
ZOMBIE_SPEED = 70
ZOMBIE_RADIUS = 14
SPAWN_EVERY = 1.0  # seconds between zombies
POINTS = 10


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


def touching(a: Vector2, a_radius: float, b: Vector2, b_radius: float) -> bool:
    """Whether two circles overlap: their centres are closer than their two radiuses added together."""
    return a.distance_to(b) < a_radius + b_radius


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


@dataclass
class Zombie:
    position: Vector2

    def chase(self, target: Vector2, dt: float) -> None:
        self.position += toward(self.position, target) * ZOMBIE_SPEED * dt


def spawn_point(rng: random.Random) -> Vector2:
    """A random place just outside one of the arena's four edges, so a zombie walks in."""
    side = rng.choice(["top", "right", "bottom", "left"])
    if side == "top":
        return Vector2(rng.uniform(0, WIDTH), -ZOMBIE_RADIUS)
    if side == "right":
        return Vector2(WIDTH + ZOMBIE_RADIUS, rng.uniform(0, HEIGHT))
    if side == "bottom":
        return Vector2(rng.uniform(0, WIDTH), HEIGHT + ZOMBIE_RADIUS)
    return Vector2(-ZOMBIE_RADIUS, rng.uniform(0, HEIGHT))


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
        self.cooldown = 0.0
        self.zombies: list[Zombie] = []
        self.next_zombie = SPAWN_EVERY
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
        self.cooldown -= dt
        if firing and self.cooldown <= 0:
            self.cooldown = COOLDOWN
            velocity = Vector2(BULLET_SPEED, 0).rotate(self.player.angle)
            self.bullets.append(Bullet(self.player.muzzle(), velocity))
        for bullet in self.bullets:
            bullet.move(dt)
        self.bullets = [bullet for bullet in self.bullets if bullet.inside()]
        self.next_zombie -= dt
        if self.next_zombie <= 0:
            self.zombies.append(Zombie(spawn_point(self.rng)))
            self.next_zombie += SPAWN_EVERY
        for zombie in self.zombies:
            zombie.chase(self.player.position, dt)
        self.shoot_zombies()

    def zombie_touching(self, position: Vector2, radius: float) -> Zombie | None:
        for zombie in self.zombies:
            if touching(zombie.position, ZOMBIE_RADIUS, position, radius):
                return zombie
        return None

    def shoot_zombies(self) -> None:
        """Each bullet touching a zombie is used up, and takes the zombie with it."""
        flying: list[Bullet] = []
        for bullet in self.bullets:
            zombie = self.zombie_touching(bullet.position, BULLET_RADIUS)
            if zombie is None:
                flying.append(bullet)
            else:
                self.zombies.remove(zombie)
                self.score += POINTS
        self.bullets = flying
```

- **`touching`** is the table above, as a function. `distance_to` (lesson 8.2's test used it) works out `√(dx² + dy²)`.
- **`zombie_touching(position, radius)`** returns the first zombie touching a circle, or `None`.
- **`shoot_zombies`** removes in two ways, both safe. Bullets: it builds a new list, `flying`, of the bullets that hit nothing, and replaces the old list with it, the fix from lesson 8.3. Zombies: `self.zombies.remove(zombie)` **is** called while a loop is running, but that loop is over `self.bullets`, not `self.zombies`; the loop over zombies, inside `zombie_touching`, has already returned. Nothing is walking through the zombie list when it changes.

## Tests for hits

**Build:** tests of the circle test, and of a bullet hitting a zombie.

```python file=tests/test_shooter_zombies.py
"""Zombies: where they come from, how they chase, and what happens when they arrive."""

import random

from pygame import Vector2

from shooter.model import HEIGHT, POINTS, SPAWN_EVERY, WIDTH, ZOMBIE_SPEED, Bullet, Game, Zombie, spawn_point, touching

STILL = Vector2(0, 0)
RIGHT = Vector2(1000, 240)


def started_game() -> Game:
    game = Game(random.Random(0))
    game.start()
    return game


def test_zombies_appear_just_outside_the_arena():
    rng = random.Random(0)
    for _ in range(100):
        point = spawn_point(rng)
        assert not (0 <= point.x <= WIDTH and 0 <= point.y <= HEIGHT)


def test_a_zombie_arrives_every_second():
    game = started_game()
    for _ in range(3):
        game.update(STILL, RIGHT, firing=False, dt=SPAWN_EVERY)
    assert len(game.zombies) == 3


def test_a_zombie_walks_straight_at_its_target():
    zombie = Zombie(Vector2(0, 0))
    zombie.chase(Vector2(300, 400), dt=1.0)
    assert zombie.position == Vector2(0.6, 0.8) * ZOMBIE_SPEED


def test_circles_touch_when_their_centres_are_closer_than_their_radiuses_added_together():
    assert touching(Vector2(0, 0), 10, Vector2(15, 0), 6)
    assert not touching(Vector2(0, 0), 10, Vector2(16, 0), 6)


def test_a_bullet_that_hits_a_zombie_scores_and_both_are_gone():
    game = started_game()
    game.zombies = [Zombie(Vector2(100, 100))]
    game.bullets = [Bullet(Vector2(100, 100), Vector2(0, 0))]
    game.update(STILL, RIGHT, firing=False, dt=0.01)
    assert game.zombies == []
    assert game.bullets == []
    assert game.score == POINTS
```

The second test puts a bullet with no velocity exactly on a zombie, so the hit doesn't depend on how far anything moves in 0.01 seconds.

```powershell
.venv\Scripts\shooter --test-run 600
```

```text
frames=600 x=320 y=240 score=10 lives=3 bullets=3 zombies=9
```

The test run aims right the whole time, so only zombies that come from the right walk into its bullets: one in ten seconds.

```check
run ".venv/Scripts/python -m pytest -q" stdout="160 passed"
run ".venv/Scripts/shooter --test-run 600" stdout="score=10 lives=3 bullets=3 zombies=9"
```

## Bitten

**Build:** a zombie that reaches the player costs a life, and the player can't be bitten again for a moment and a half. No lives left ends the game.

If every zombie touching the player took a life every frame, a heap of ten zombies would take all three lives in a twentieth of a second, before the player could react. Games give a player who's just been hit a short time when nothing can hurt them, called **invulnerability frames**, or **i-frames**, and show it by making the player blink.

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
COOLDOWN = 0.15  # seconds between shots
ZOMBIE_SPEED = 70
ZOMBIE_RADIUS = 14
SPAWN_EVERY = 1.0  # seconds between zombies
POINTS = 10
SAFE_FOR = 1.5  # seconds a bitten player can't be bitten again


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


def touching(a: Vector2, a_radius: float, b: Vector2, b_radius: float) -> bool:
    """Whether two circles overlap: their centres are closer than their two radiuses added together."""
    return a.distance_to(b) < a_radius + b_radius


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


@dataclass
class Zombie:
    position: Vector2

    def chase(self, target: Vector2, dt: float) -> None:
        self.position += toward(self.position, target) * ZOMBIE_SPEED * dt


def spawn_point(rng: random.Random) -> Vector2:
    """A random place just outside one of the arena's four edges, so a zombie walks in."""
    side = rng.choice(["top", "right", "bottom", "left"])
    if side == "top":
        return Vector2(rng.uniform(0, WIDTH), -ZOMBIE_RADIUS)
    if side == "right":
        return Vector2(WIDTH + ZOMBIE_RADIUS, rng.uniform(0, HEIGHT))
    if side == "bottom":
        return Vector2(rng.uniform(0, WIDTH), HEIGHT + ZOMBIE_RADIUS)
    return Vector2(-ZOMBIE_RADIUS, rng.uniform(0, HEIGHT))


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
        self.cooldown = 0.0
        self.zombies: list[Zombie] = []
        self.next_zombie = SPAWN_EVERY
        self.safe = 0.0
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
        self.cooldown -= dt
        if firing and self.cooldown <= 0:
            self.cooldown = COOLDOWN
            velocity = Vector2(BULLET_SPEED, 0).rotate(self.player.angle)
            self.bullets.append(Bullet(self.player.muzzle(), velocity))
        for bullet in self.bullets:
            bullet.move(dt)
        self.bullets = [bullet for bullet in self.bullets if bullet.inside()]
        self.next_zombie -= dt
        if self.next_zombie <= 0:
            self.zombies.append(Zombie(spawn_point(self.rng)))
            self.next_zombie += SPAWN_EVERY
        for zombie in self.zombies:
            zombie.chase(self.player.position, dt)
        self.shoot_zombies()
        self.bite(dt)
        if self.lives == 0:
            self.state = GameState.OVER

    def zombie_touching(self, position: Vector2, radius: float) -> Zombie | None:
        for zombie in self.zombies:
            if touching(zombie.position, ZOMBIE_RADIUS, position, radius):
                return zombie
        return None

    def shoot_zombies(self) -> None:
        """Each bullet touching a zombie is used up, and takes the zombie with it."""
        flying: list[Bullet] = []
        for bullet in self.bullets:
            zombie = self.zombie_touching(bullet.position, BULLET_RADIUS)
            if zombie is None:
                flying.append(bullet)
            else:
                self.zombies.remove(zombie)
                self.score += POINTS
        self.bullets = flying

    def bite(self, dt: float) -> None:
        """A zombie that reaches the player costs a life, unless they're still safe from the last bite."""
        self.safe = max(0.0, self.safe - dt)
        if self.safe > 0:
            return
        zombie = self.zombie_touching(self.player.position, PLAYER_RADIUS)
        if zombie is not None:
            self.zombies.remove(zombie)
            self.lives -= 1
            self.safe = SAFE_FOR
```

- **`self.safe`**: seconds of safety left, counted down by `dt` and never below 0 (`max(0.0, ...)`), so `self.safe > 0` means "safe right now". A bite sets it to `SAFE_FOR`, 1.5.
- **The biting zombie goes too**, so the player isn't bitten again by the same zombie the moment the safety runs out.
- **No lives left** sets `GameState.OVER`, and the app, unchanged since lesson 8.2, saves the score (test runs keep no scores).

## Blinking

**Build:** while the player is safe, it blinks.

```python file=shooter/draw.py
import pygame

from shooter.model import BULLET_RADIUS, PLAYER_RADIUS, ZOMBIE_RADIUS, Game, GameState

BACKGROUND = (24, 26, 33)
PLAYER_COLOUR = (94, 234, 212)
BULLET_COLOUR = (250, 204, 21)
ZOMBIE_COLOUR = (132, 204, 22)
TEXT_COLOUR = (230, 230, 230)
MESSAGES = {
    GameState.TITLE: "SHOOTER: press Space to play",
    GameState.PAUSED: "Paused: press P to go on",
    GameState.OVER: "Game over: press Space to play again",
}


def draw(screen: pygame.Surface, font: pygame.font.Font, game: Game, best: int | None) -> None:
    screen.fill(BACKGROUND)
    for zombie in game.zombies:
        pygame.draw.circle(screen, ZOMBIE_COLOUR, zombie.position, ZOMBIE_RADIUS)
    for bullet in game.bullets:
        pygame.draw.circle(screen, BULLET_COLOUR, bullet.position, BULLET_RADIUS)
    player = game.player
    if int(game.safe * 10) % 2 == 0:  # while safe, shown every other tenth of a second: it blinks
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

`int(game.safe * 10) % 2 == 0` decides whether to draw the player this frame. Traced: with no safety, `int(0 * 10) % 2` is `0`, so always drawn. With 1.48 s left, `int(14.8)` is 14, even, drawn; at 1.38 s, 13, odd, hidden; at 1.28 s, 12, drawn. The player shows and hides every tenth of a second until the safety runs out.

## Tests for bites

**Build:** tests of a bite, the safety after it, and the last bite.

```python file=tests/test_shooter_zombies.py
"""Zombies: where they come from, how they chase, and what happens when they arrive."""

import random

from pygame import Vector2

from shooter.model import (
    HEIGHT,
    POINTS,
    SAFE_FOR,
    SPAWN_EVERY,
    WIDTH,
    ZOMBIE_SPEED,
    Bullet,
    Game,
    GameState,
    Zombie,
    spawn_point,
    touching,
)

STILL = Vector2(0, 0)
RIGHT = Vector2(1000, 240)


def started_game() -> Game:
    game = Game(random.Random(0))
    game.start()
    return game


def test_zombies_appear_just_outside_the_arena():
    rng = random.Random(0)
    for _ in range(100):
        point = spawn_point(rng)
        assert not (0 <= point.x <= WIDTH and 0 <= point.y <= HEIGHT)


def test_a_zombie_arrives_every_second():
    game = started_game()
    for _ in range(3):
        game.update(STILL, RIGHT, firing=False, dt=SPAWN_EVERY)
    assert len(game.zombies) == 3


def test_a_zombie_walks_straight_at_its_target():
    zombie = Zombie(Vector2(0, 0))
    zombie.chase(Vector2(300, 400), dt=1.0)
    assert zombie.position == Vector2(0.6, 0.8) * ZOMBIE_SPEED


def test_circles_touch_when_their_centres_are_closer_than_their_radiuses_added_together():
    assert touching(Vector2(0, 0), 10, Vector2(15, 0), 6)
    assert not touching(Vector2(0, 0), 10, Vector2(16, 0), 6)


def test_a_bullet_that_hits_a_zombie_scores_and_both_are_gone():
    game = started_game()
    game.zombies = [Zombie(Vector2(100, 100))]
    game.bullets = [Bullet(Vector2(100, 100), Vector2(0, 0))]
    game.update(STILL, RIGHT, firing=False, dt=0.01)
    assert game.zombies == []
    assert game.bullets == []
    assert game.score == POINTS


def test_a_bite_costs_a_life_then_the_player_is_safe_for_a_moment():
    game = started_game()
    game.zombies = [Zombie(Vector2(game.player.position)), Zombie(Vector2(game.player.position))]
    game.update(STILL, RIGHT, firing=False, dt=0.01)
    assert game.lives == 2
    assert len(game.zombies) == 1
    game.update(STILL, RIGHT, firing=False, dt=SAFE_FOR / 2)
    assert game.lives == 2
    game.update(STILL, RIGHT, firing=False, dt=SAFE_FOR)
    assert game.lives == 1


def test_the_last_bite_ends_the_game():
    game = started_game()
    game.lives = 1
    game.zombies = [Zombie(Vector2(game.player.position))]
    game.update(STILL, RIGHT, firing=False, dt=0.01)
    assert game.state == GameState.OVER
```

In the bite test, two zombies stand exactly on the player, each with its **own** copy of the player's position, `Vector2(game.player.position)`. The first bites (two lives left, one zombie left); the second can't, until the safety has run out.

```powershell
.venv\Scripts\shooter --test-run 600
```

```text
frames=600 x=320 y=240 score=10 lives=0 bullets=3 zombies=4
```

Game over within ten seconds: standing still and shooting one way doesn't work. Play it yourself with `.venv\Scripts\shooter`, and see how long you last.

```check
run ".venv/Scripts/python -m pytest -q" stdout="162 passed"
run ".venv/Scripts/shooter --test-run 600" stdout="lives=0" label="a test run that stands still is bitten to death"
```

## Your turn: an autopilot

**Build, on your own:** `--hold auto` plays the shooter: it aims at the nearest zombie, and keeps firing.

Breakout's test runs had an autopilot (lesson 1.4) that steered the paddle under the ball, which let tests play whole games. The copied `--hold auto` has done nothing since lesson 8.2. Click **Create provided tests/test_shooter_nearest.py**:

```python file=tests/test_shooter_nearest.py provided
"""nearest: the zombie the autopilot aims at."""

from pygame import Vector2

from shooter.model import Zombie, nearest


def test_nearest_is_the_closest_zombie_wherever_it_is_in_the_list():
    far = Zombie(Vector2(100, 0))
    close = Zombie(Vector2(0, 30))
    middle = Zombie(Vector2(-50, 0))
    assert nearest(Vector2(0, 0), [far, close, middle]) is close


def test_with_no_zombies_nothing_is_nearest():
    assert nearest(Vector2(0, 0), []) is None
```

| Test / command | Result |
|---|---|
| `pytest -q tests/test_shooter_nearest.py` | `2 passed` |
| `shooter --test-run 1800 --hold auto` | the player survives 30 seconds: `lives=3`, and a score of a few hundred |
| `shooter --test-run 1800` (no `--hold`) | as before: the test run aims right |

`nearest(position, zombies)` belongs in the model, next to `touching`; deciding to use it for `--hold auto` belongs in the app, where `HOLDS` already decides how a test run moves. When all 164 tests pass and every check is clean, commit with a message that mentions the **autopilot**.

```hints
nudge: The first test checks that the nearest zombie is found wherever it is in the list, so you'll need to compare every zombie's distance. Which built-in function finds the smallest item of a list, and how do you tell it what "smallest" means?
concept: `min(items, key=...)` returns the item for which the `key` function gives the smallest value: `min(words, key=len)` is the shortest word. Here the key is a zombie's distance from `position`. The key can be a **lambda**, a function written inline as an expression: `lambda zombie: position.distance_to(zombie.position)` takes a zombie and returns that number. `min` of an empty list raises `ValueError`, so the empty case needs its own answer: `None`, which the return type `Zombie | None` says is possible.
shape: In the model, `nearest` returns `None` for an empty list, and otherwise `min` with a key. In the app's test-run branch, after choosing the direction: if the hold is `Hold.AUTO` and `nearest(...)` found a zombie, the target is that zombie's position; otherwise it stays to the right. `firing` stays `True`.
answer: In `shooter/model.py`:

~~~python
def nearest(position: Vector2, zombies: list[Zombie]) -> Zombie | None:
    """The zombie closest to position, or None if there are none."""
    if not zombies:
        return None
    return min(zombies, key=lambda zombie: position.distance_to(zombie.position))
~~~

In `shooter/app.py`, `nearest` added to the import from `shooter.model`, and:

~~~python
        else:
            direction = HOLDS[settings.hold]
            target = game.player.position + Vector2(1, 0)
            closest = nearest(game.player.position, game.zombies)
            if settings.hold == Hold.AUTO and closest is not None:
                target = closest.position
            firing = True
~~~

Traced for the first test, from `(0, 0)`: `far` is 100 away, `close` 30, `middle` 50, so `min` returns `close`, the second in the list. The test uses `is`, not `==`: it wants that very zombie, not one that happens to be equal. With the autopilot, every zombie is shot as it walks in: one a second, 10 points each.

~~~text
frames=1800 x=320 y=240 score=290 lives=3 bullets=3 zombies=1
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_shooter_nearest.py" stdout="2 passed"
run ".venv/Scripts/shooter --test-run 1800 --hold auto" stdout="lives=3" label="the autopilot survives 30 seconds" -- In the app's test-run branch, aim at nearest(...)'s position when the hold is Hold.AUTO.
run ".venv/Scripts/shooter --test-run 600" stdout="lives=0" label="without --hold auto, a test run still aims right"
run ".venv/Scripts/python -m pytest -q" stdout="164 passed"
run ".venv/Scripts/python -m pyright breakout shooter tests replay.py" stdout="0 errors"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
run ".venv/Scripts/python -m ruff format --check ." stdout="already formatted" -- Run .venv\Scripts\python -m ruff format . to format your code.
git-message "autopilot"
git-clean
```

## Challenge: waves

**Optional, ★.** The game never gets harder. Make the spawner speed up: every 10 zombies, `SPAWN_EVERY` for this game shrinks by 10%, but never below 0.3 seconds. It's state of one game, so it's an attribute of `Game`, not a change to the constant. Test it with `dt` steps of a whole second, as the spawner's test does. On a branch.

## Challenge: zombies that keep apart

**Optional, ★★.** Zombies pile into one circle on top of each other. Add **separation**, another of Reynolds' steering behaviours: each zombie also moves away from any zombie closer than two radiuses, by a little, so a crowd spreads into a ring. Which list are you looping over while zombies move, and is anything added or removed during it? On a branch.

## Challenge: the autopilot dodges

**Optional, ★★.** The autopilot stands still. Make it move away from the nearest zombie when one is closer than 100 pixels (`-toward(...)`, a unit vector pointing the other way), and measure with `--test-run 3600` whether it scores more or less than standing still. Is moving worth it? On a branch.

## What did we actually learn?

- **A periodic timer** keeps its leftover time (`+=`) so the average rate is exact; **a cooldown** throws it away (set to the full time). Both count down by `dt`.
- **Seek**: each frame, move at full speed along the unit vector to the target, wherever it is now. The simplest steering behaviour.
- **Circle collision**: the distance between centres is less than the radiuses added together. It doesn't care about rotation.
- **Removing safely** from two lists at once: build a new list for the one you're looping over; only remove from the other once no loop over it is running.
- **Invulnerability frames**: a timer that makes the player safe after a hit, shown by blinking.
- **`min(items, key=...)`** and **lambda**: the smallest item by any measure you write inline.

Godot does most of this for you, which is why it's worth having done it by hand once: an `Area2D` with a `CircleShape2D` reports overlaps through a `body_entered` signal (Chapter 12), a `Timer` node has a `one_shot` setting (a cooldown) or repeats (a spawner), and `Vector2.direction_to(target)` is `toward`. In C#, `zombies.MinBy(z => z.Position.DistanceTo(position))` is `min` with a key; Java's `zombies.stream().min(Comparator.comparingDouble(...))` is the same, with more words.
