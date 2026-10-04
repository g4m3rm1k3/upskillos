---
title: 4.2 — Modules With One Job
runtime: python
run: breakout/__main__.py
---

The package has one module, `model.py`, that still does everything: it reads the command line, holds the rules of the game, draws it, and runs the loop. This lesson gives each of those jobs a module of its own, and meets the problem that appears as soon as modules import each other: a **circle**. Avoiding circles turns out to need a rule about which module may depend on which, and the lesson ends by writing that rule down as a test.

## The game tests so far

**Build:** make sure your files match the end of lesson 4.1. These three steps are the reference answers to its Your turn.

```python file=tests/test_game.py
import random

import pygame
from pygame import Vector2

from breakout import model


def autopilot_game(seed: int, frames: int) -> model.Game:
    game = model.Game(random.Random(seed))
    for _ in range(frames):
        game.update(model.autopilot(game.ball, game.paddle), 1 / 60)
    return game


def test_a_new_game():
    game = model.Game(random.Random(0))
    assert (game.score, game.lives, len(game.bricks)) == (0, 3, 40)
    assert game.playing()


def test_ten_seconds_of_autopilot_matches_the_test_run():
    game = autopilot_game(0, 600)
    assert (game.paddle.rect().x, game.score, game.lives, len(game.bricks)) == (435, 70, 3, 33)


def test_a_missed_ball_costs_a_life_and_a_new_ball_is_served():
    game = model.Game(random.Random(0))
    game.ball = model.Ball(Vector2(100, model.HEIGHT + 20), Vector2(0, 300))
    game.update(0, 1 / 60)
    assert game.lives == 2
    assert game.ball.position == Vector2(320, 240)


def test_a_ball_that_hits_a_brick_breaks_it_and_bounces():
    game = model.Game(random.Random(0))
    game.bricks = [model.Brick(pygame.Rect(300, 200, 70, 20), (34, 197, 94))]
    game.ball = model.Ball(Vector2(330, 225), Vector2(0, -240))
    game.update(0, 1 / 60)
    assert (game.score, len(game.bricks)) == (10, 0)
    assert game.ball.velocity.y == 240


def test_losing_the_last_life_ends_the_game():
    game = model.Game(random.Random(0))
    game.lives = 1
    game.ball = model.Ball(Vector2(100, model.HEIGHT + 20), Vector2(0, 300))
    game.update(0, 1 / 60)
    assert game.lives == 0
    assert not game.playing()
    before = (game.score, game.lives, len(game.bricks))
    game.update(0, 1 / 60)
    assert (game.score, game.lives, len(game.bricks)) == before


def test_breaking_the_last_brick_wins():
    game = model.Game(random.Random(0))
    game.bricks = [model.Brick(pygame.Rect(300, 200, 70, 20), (34, 197, 94))]
    game.ball = model.Ball(Vector2(330, 225), Vector2(0, -240))
    game.update(0, 1 / 60)
    assert game.bricks == []
    assert game.score == 10
    assert not game.playing()
```

```check
contains tests/test_game.py "from breakout import model"
```

## The argument tests so far

**Build:** the argument tests as lesson 4.1 left them.

```python file=tests/test_arguments.py
# Lesson 2.4, with --seed added in 2.6: what the game's command line should accept, and what it should refuse.
import pytest

from breakout import model
from breakout.model import Hold, Settings


def test_no_arguments_is_a_normal_game():
    assert model.parse_args([]) == Settings()


def test_a_test_run_with_every_option():
    assert model.parse_args(["--test-run", "600", "--hold", "auto", "--lag-at", "40", "--seed", "7"]) == Settings(
        test_frames=600, hold=Hold.AUTO, lag_at=40, seed=7
    )


def test_an_unknown_hold_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        model.parse_args(["--test-run", "5", "--hold", "sideways"])
    assert stopped.value.code == 2


def test_a_hold_with_nothing_after_it_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        model.parse_args(["--test-run", "5", "--hold"])
    assert stopped.value.code == 2


def test_a_lag_with_nothing_after_it_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        model.parse_args(["--test-run", "5", "--lag-at"])
    assert stopped.value.code == 2


def test_a_lag_that_is_not_a_number_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        model.parse_args(["--test-run", "5", "--lag-at", "soon"])
    assert stopped.value.code == 2


def test_a_usage_error_says_how_to_use_the_game(capsys):
    with pytest.raises(SystemExit):
        model.parse_args(["--hold", "sideways"])
    assert capsys.readouterr().out.startswith("usage: python -m breakout")


def test_a_seed_that_is_not_a_number_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        model.parse_args(["--test-run", "5", "--seed", "lucky"])
    assert stopped.value.code == 2
```

```check
contains tests/test_arguments.py "from breakout.model import Hold, Settings"
```

## The replay so far

**Build:** `replay.py` as lesson 4.1 left it.

```python file=replay.py
"""Plays a game with the autopilot, without a window, and reports each change of score, lives or bricks."""

import random
import sys

from breakout import model


def play(seed: int, frames: int) -> list[str]:
    game = model.Game(random.Random(seed))
    events = []
    for frame in range(frames):
        before = (game.score, game.lives, len(game.bricks))
        game.update(model.autopilot(game.ball, game.paddle), 1 / 60)
        after = (game.score, game.lives, len(game.bricks))
        if after != before:
            events.append(f"frame {frame}: score {after[0]}, lives {after[1]}, bricks {after[2]}")
        if not game.playing():
            events.append(f"frame {frame}: the game is over")
            break
    return events


if __name__ == "__main__":
    for line in play(int(sys.argv[1]), int(sys.argv[2])):
        print(line)
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="51 passed"
run ".venv/Scripts/python replay.py 0 600" stdout="frame 492"
```

## Settings in their own module

**Build:** everything about the command line moves to `breakout/settings.py`.

```python file=breakout/settings.py
import sys
from dataclasses import dataclass
from enum import Enum

USAGE = "usage: python -m breakout [--test-run FRAMES [--hold left|right|none|auto] [--lag-at FRAME] [--seed N]]"


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


def number_after(args: list[str], name: str) -> int | None:
    if name not in args:
        return None
    i = args.index(name)
    if i + 1 >= len(args) or not args[i + 1].isdigit():
        print(USAGE)
        sys.exit(2)
    return int(args[i + 1])


def parse_args(args: list[str]) -> Settings:
    # A test run lets another program play the game, with no window:
    #   python breakout.py --test-run FRAMES [--hold left|right|none|auto] [--lag-at FRAME] [--seed N]
    hold = Hold.NONE
    if "--hold" in args:
        i = args.index("--hold")
        names = [h.value for h in Hold]
        if i + 1 >= len(args) or args[i + 1] not in names:
            print(USAGE)
            sys.exit(2)
        hold = Hold(args[i + 1])
    return Settings(
        test_frames=number_after(args, "--test-run"),
        hold=hold,
        lag_at=number_after(args, "--lag-at"),
        seed=number_after(args, "--seed"),
    )
```

**Understand.** This is lesson 3.4's code, unchanged, in its own file: the usage line, `Hold`, `Settings`, `number_after` and `parse_args`. What they have in common is one **job**: turning a list of command-line words into a `Settings`. Nothing in this module knows that a game exists. It doesn't even import pygame.

> **Cohesion**: how closely the things in one module belong together. A cohesive module does one job, so you know where to find something and what a change to it might affect. Low cohesion, many unrelated things in one place, is the "where does this go?" feeling from lesson 1.6.

```check
file breakout/settings.py
```

## The model, without the settings

**Build:** remove those parts from `model.py`, and import them instead.

```python file=breakout/model.py
import math
import os
import random
from dataclasses import dataclass

import pygame
from pygame import Vector2

from breakout.settings import Hold, parse_args

WIDTH, HEIGHT = 640, 480
BACKGROUND = (24, 26, 33)
PADDLE_COLOUR = (94, 234, 212)
BALL_COLOUR = (245, 245, 245)
TEXT_COLOUR = (230, 230, 230)
ROW_COLOURS = [(239, 68, 68), (249, 115, 22), (234, 179, 8), (34, 197, 94), (59, 130, 246)]
PADDLE_SPEED = 420
PADDLE_WIDTH, PADDLE_HEIGHT = 100, 14
BALL_SPEED = 300
BALL_RADIUS = 6
BRICK_WIDTH, BRICK_HEIGHT, BRICK_GAP = 70, 20, 6
WALL_LEFT, WALL_TOP = 16, 60


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(value, high))


@dataclass
class Ball:
    position: Vector2
    velocity: Vector2

    def move(self, dt: float) -> None:
        self.position += self.velocity * dt

    def bounce_off_walls(self) -> None:
        if self.position.x < BALL_RADIUS:
            self.position.x = BALL_RADIUS
            self.velocity.x = abs(self.velocity.x)
        if self.position.x > WIDTH - BALL_RADIUS:
            self.position.x = WIDTH - BALL_RADIUS
            self.velocity.x = -abs(self.velocity.x)
        if self.position.y < BALL_RADIUS:
            self.position.y = BALL_RADIUS
            self.velocity.y = abs(self.velocity.y)

    def rect(self) -> pygame.Rect:
        r = pygame.Rect(0, 0, BALL_RADIUS * 2, BALL_RADIUS * 2)
        r.center = (round(self.position.x), round(self.position.y))
        return r


def serve(rng: random.Random) -> Ball:
    across = rng.uniform(-0.6, 0.6)
    up = math.sqrt(1 - across * across)
    return Ball(Vector2(WIDTH / 2, HEIGHT / 2), Vector2(across, -up) * BALL_SPEED)


class Paddle:
    # Invariant: the whole paddle is always on the screen, 0 <= x <= WIDTH - PADDLE_WIDTH.
    def __init__(self) -> None:
        self._x = float(WIDTH // 2 - PADDLE_WIDTH // 2)

    @property
    def x(self) -> float:
        return self._x

    def move(self, direction: int, dt: float) -> None:
        self._x = clamp(self._x + direction * PADDLE_SPEED * dt, 0, WIDTH - PADDLE_WIDTH)

    def rect(self) -> pygame.Rect:
        return pygame.Rect(round(self._x), HEIGHT - 30 - PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT)


def autopilot(ball: Ball, paddle: Paddle) -> int:
    middle = paddle.x + PADDLE_WIDTH / 2
    if ball.position.x < middle - 10:
        return -1
    if ball.position.x > middle + 10:
        return 1
    return 0


def bounce_off_paddle(ball: Ball, paddle: pygame.Rect) -> None:
    rect = ball.rect()
    if rect.colliderect(paddle) and ball.velocity.y > 0:
        offset = (rect.centerx - paddle.centerx) / (paddle.width / 2)
        ball.velocity = Vector2(BALL_SPEED * 0.8 * offset, -ball.velocity.y)


@dataclass
class Brick:
    rect: pygame.Rect
    colour: tuple[int, int, int]
    hits_left: int = 1
    points: int = 10
    cracked: bool = False

    def hit(self) -> int:
        if self.hits_left == 0:
            raise ValueError("this brick is already broken")
        self.hits_left -= 1
        self.cracked = True
        if self.hits_left == 0:
            return self.points
        return 0

    def current_colour(self) -> tuple[int, int, int]:
        if not self.cracked:
            return self.colour
        r, g, b = self.colour
        return int(r * 0.6), int(g * 0.6), int(b * 0.6)


def make_bricks() -> list[Brick]:
    bricks = []
    for row, colour in enumerate(ROW_COLOURS):
        for col in range(8):
            x = WALL_LEFT + col * (BRICK_WIDTH + BRICK_GAP)
            y = WALL_TOP + row * (BRICK_HEIGHT + BRICK_GAP)
            rect = pygame.Rect(x, y, BRICK_WIDTH, BRICK_HEIGHT)
            if row == 0:
                bricks.append(Brick(rect, colour, hits_left=2, points=30))
            else:
                bricks.append(Brick(rect, colour))
    return bricks


def hit_brick(ball: pygame.Rect, bricks: list[Brick]) -> int | None:
    i = ball.collidelist([brick.rect for brick in bricks])
    if i == -1:
        return None
    return i


class Game:
    def __init__(self, rng: random.Random) -> None:
        self.rng = rng
        self.paddle = Paddle()
        self.ball = serve(rng)
        self.bricks = make_bricks()
        self.score = 0
        self.lives = 3

    def playing(self) -> bool:
        return self.lives > 0 and len(self.bricks) > 0

    def update(self, direction: int, dt: float) -> None:
        if not self.playing():
            return
        self.paddle.move(direction, dt)
        self.ball.move(dt)
        self.ball.bounce_off_walls()
        bounce_off_paddle(self.ball, self.paddle.rect())

        hit = hit_brick(self.ball.rect(), self.bricks)
        if hit is not None:
            self.score += self.bricks[hit].hit()
            if self.bricks[hit].hits_left == 0:
                self.bricks.pop(hit)
            self.ball.velocity.y = -self.ball.velocity.y

        if self.ball.rect().top > HEIGHT:
            self.lives -= 1
            if self.lives > 0:
                self.ball = serve(self.rng)


def draw(screen: pygame.Surface, font: pygame.font.Font, game: Game) -> None:
    screen.fill(BACKGROUND)
    for brick in game.bricks:
        pygame.draw.rect(screen, brick.current_colour(), brick.rect)
    pygame.draw.rect(screen, PADDLE_COLOUR, game.paddle.rect())
    pygame.draw.ellipse(screen, BALL_COLOUR, game.ball.rect())
    screen.blit(font.render(f"Score {game.score}   Lives {game.lives}", True, TEXT_COLOUR), (16, 16))
    if game.lives == 0:
        screen.blit(font.render("Game over", True, TEXT_COLOUR), (260, 240))
    elif not game.bricks:
        screen.blit(font.render("You win!", True, TEXT_COLOUR), (270, 240))


def main(args: list[str]) -> None:
    settings = parse_args(args)
    seed = settings.seed
    if settings.test_frames is not None:
        os.environ["SDL_VIDEODRIVER"] = "dummy"
        if seed is None:
            seed = 0
    game = Game(random.Random(seed))

    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Breakout")
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

        direction = 0
        if settings.test_frames is None:
            keys = pygame.key.get_pressed()
            if keys[pygame.K_LEFT]:
                direction -= 1
            if keys[pygame.K_RIGHT]:
                direction += 1
        elif settings.hold == Hold.LEFT:
            direction = -1
        elif settings.hold == Hold.RIGHT:
            direction = 1
        elif settings.hold == Hold.AUTO:
            direction = autopilot(game.ball, game.paddle)
        game.update(direction, dt)

        draw(screen, font, game)
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
```

**Understand: importing names.** `from breakout.settings import Hold, parse_args` runs `breakout/settings.py` (once, the first time anything imports it) and binds the two names in this module, so `main` can keep writing `parse_args(args)` and `Hold.AUTO` exactly as before.

The imports are in three groups, separated by blank lines: Python's own standard library first (`math`, `os`, …), then installed packages (`pygame`), then this project's own modules (`breakout.settings`). That's the conventional order, and it's what ruff's `I001` rule from lesson 3.6 enforces: `ruff check --fix` sorts them for you. It's more than tidiness: the groups show at a glance what a module depends on from outside, and what from inside the project.

```check
lacks breakout/model.py "class Settings" -- Remove the settings code from model.py; it lives in settings.py now.
contains breakout/model.py "from breakout.settings import Hold, parse_args"
run ".venv/Scripts/python -m breakout --test-run 600 --hold auto" stdout="frames=600 paddle_x=435 score=70" label="the game still runs"
```

## Tests import from settings

**Build:** the argument tests, importing the module they test.

```python file=tests/test_arguments.py
# Lesson 2.4, with --seed added in 2.6: what the game's command line should accept, and what it should refuse.
import pytest

from breakout import settings
from breakout.settings import Hold, Settings


def test_no_arguments_is_a_normal_game():
    assert settings.parse_args([]) == Settings()


def test_a_test_run_with_every_option():
    assert settings.parse_args(["--test-run", "600", "--hold", "auto", "--lag-at", "40", "--seed", "7"]) == Settings(
        test_frames=600, hold=Hold.AUTO, lag_at=40, seed=7
    )


def test_an_unknown_hold_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        settings.parse_args(["--test-run", "5", "--hold", "sideways"])
    assert stopped.value.code == 2


def test_a_hold_with_nothing_after_it_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        settings.parse_args(["--test-run", "5", "--hold"])
    assert stopped.value.code == 2


def test_a_lag_with_nothing_after_it_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        settings.parse_args(["--test-run", "5", "--lag-at"])
    assert stopped.value.code == 2


def test_a_lag_that_is_not_a_number_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        settings.parse_args(["--test-run", "5", "--lag-at", "soon"])
    assert stopped.value.code == 2


def test_a_usage_error_says_how_to_use_the_game(capsys):
    with pytest.raises(SystemExit):
        settings.parse_args(["--hold", "sideways"])
    assert capsys.readouterr().out.startswith("usage: python -m breakout")


def test_a_seed_that_is_not_a_number_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        settings.parse_args(["--test-run", "5", "--seed", "lucky"])
    assert stopped.value.code == 2
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="51 passed"
```

## The game loop in its own module

**Build:** `main`, the loop that connects the game to the outside world, moves to `breakout/app.py`.

```python file=breakout/app.py
import os
import random

import pygame

from breakout.model import HEIGHT, WIDTH, Game, autopilot, draw
from breakout.settings import Hold, parse_args


def main(args: list[str]) -> None:
    settings = parse_args(args)
    seed = settings.seed
    if settings.test_frames is not None:
        os.environ["SDL_VIDEODRIVER"] = "dummy"
        if seed is None:
            seed = 0
    game = Game(random.Random(seed))

    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Breakout")
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

        direction = 0
        if settings.test_frames is None:
            keys = pygame.key.get_pressed()
            if keys[pygame.K_LEFT]:
                direction -= 1
            if keys[pygame.K_RIGHT]:
                direction += 1
        elif settings.hold == Hold.LEFT:
            direction = -1
        elif settings.hold == Hold.RIGHT:
            direction = 1
        elif settings.hold == Hold.AUTO:
            direction = autopilot(game.ball, game.paddle)
        game.update(direction, dt)

        draw(screen, font, game)
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
```

**Understand.** `app.py` is the **application**: the piece that starts pygame, reads the keyboard and the clock, asks the model to update, and draws. It imports what it uses from the other modules, and nothing imports it except `__main__.py`.

```check
file breakout/app.py
```

## The model, without the loop

**Build:** remove `main` and the imports only it needed from `model.py`.

```python file=breakout/model.py
import math
import random
from dataclasses import dataclass

import pygame
from pygame import Vector2

WIDTH, HEIGHT = 640, 480
BACKGROUND = (24, 26, 33)
PADDLE_COLOUR = (94, 234, 212)
BALL_COLOUR = (245, 245, 245)
TEXT_COLOUR = (230, 230, 230)
ROW_COLOURS = [(239, 68, 68), (249, 115, 22), (234, 179, 8), (34, 197, 94), (59, 130, 246)]
PADDLE_SPEED = 420
PADDLE_WIDTH, PADDLE_HEIGHT = 100, 14
BALL_SPEED = 300
BALL_RADIUS = 6
BRICK_WIDTH, BRICK_HEIGHT, BRICK_GAP = 70, 20, 6
WALL_LEFT, WALL_TOP = 16, 60


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(value, high))


@dataclass
class Ball:
    position: Vector2
    velocity: Vector2

    def move(self, dt: float) -> None:
        self.position += self.velocity * dt

    def bounce_off_walls(self) -> None:
        if self.position.x < BALL_RADIUS:
            self.position.x = BALL_RADIUS
            self.velocity.x = abs(self.velocity.x)
        if self.position.x > WIDTH - BALL_RADIUS:
            self.position.x = WIDTH - BALL_RADIUS
            self.velocity.x = -abs(self.velocity.x)
        if self.position.y < BALL_RADIUS:
            self.position.y = BALL_RADIUS
            self.velocity.y = abs(self.velocity.y)

    def rect(self) -> pygame.Rect:
        r = pygame.Rect(0, 0, BALL_RADIUS * 2, BALL_RADIUS * 2)
        r.center = (round(self.position.x), round(self.position.y))
        return r


def serve(rng: random.Random) -> Ball:
    across = rng.uniform(-0.6, 0.6)
    up = math.sqrt(1 - across * across)
    return Ball(Vector2(WIDTH / 2, HEIGHT / 2), Vector2(across, -up) * BALL_SPEED)


class Paddle:
    # Invariant: the whole paddle is always on the screen, 0 <= x <= WIDTH - PADDLE_WIDTH.
    def __init__(self) -> None:
        self._x = float(WIDTH // 2 - PADDLE_WIDTH // 2)

    @property
    def x(self) -> float:
        return self._x

    def move(self, direction: int, dt: float) -> None:
        self._x = clamp(self._x + direction * PADDLE_SPEED * dt, 0, WIDTH - PADDLE_WIDTH)

    def rect(self) -> pygame.Rect:
        return pygame.Rect(round(self._x), HEIGHT - 30 - PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT)


def autopilot(ball: Ball, paddle: Paddle) -> int:
    middle = paddle.x + PADDLE_WIDTH / 2
    if ball.position.x < middle - 10:
        return -1
    if ball.position.x > middle + 10:
        return 1
    return 0


def bounce_off_paddle(ball: Ball, paddle: pygame.Rect) -> None:
    rect = ball.rect()
    if rect.colliderect(paddle) and ball.velocity.y > 0:
        offset = (rect.centerx - paddle.centerx) / (paddle.width / 2)
        ball.velocity = Vector2(BALL_SPEED * 0.8 * offset, -ball.velocity.y)


@dataclass
class Brick:
    rect: pygame.Rect
    colour: tuple[int, int, int]
    hits_left: int = 1
    points: int = 10
    cracked: bool = False

    def hit(self) -> int:
        if self.hits_left == 0:
            raise ValueError("this brick is already broken")
        self.hits_left -= 1
        self.cracked = True
        if self.hits_left == 0:
            return self.points
        return 0

    def current_colour(self) -> tuple[int, int, int]:
        if not self.cracked:
            return self.colour
        r, g, b = self.colour
        return int(r * 0.6), int(g * 0.6), int(b * 0.6)


def make_bricks() -> list[Brick]:
    bricks = []
    for row, colour in enumerate(ROW_COLOURS):
        for col in range(8):
            x = WALL_LEFT + col * (BRICK_WIDTH + BRICK_GAP)
            y = WALL_TOP + row * (BRICK_HEIGHT + BRICK_GAP)
            rect = pygame.Rect(x, y, BRICK_WIDTH, BRICK_HEIGHT)
            if row == 0:
                bricks.append(Brick(rect, colour, hits_left=2, points=30))
            else:
                bricks.append(Brick(rect, colour))
    return bricks


def hit_brick(ball: pygame.Rect, bricks: list[Brick]) -> int | None:
    i = ball.collidelist([brick.rect for brick in bricks])
    if i == -1:
        return None
    return i


class Game:
    def __init__(self, rng: random.Random) -> None:
        self.rng = rng
        self.paddle = Paddle()
        self.ball = serve(rng)
        self.bricks = make_bricks()
        self.score = 0
        self.lives = 3

    def playing(self) -> bool:
        return self.lives > 0 and len(self.bricks) > 0

    def update(self, direction: int, dt: float) -> None:
        if not self.playing():
            return
        self.paddle.move(direction, dt)
        self.ball.move(dt)
        self.ball.bounce_off_walls()
        bounce_off_paddle(self.ball, self.paddle.rect())

        hit = hit_brick(self.ball.rect(), self.bricks)
        if hit is not None:
            self.score += self.bricks[hit].hit()
            if self.bricks[hit].hits_left == 0:
                self.bricks.pop(hit)
            self.ball.velocity.y = -self.ball.velocity.y

        if self.ball.rect().top > HEIGHT:
            self.lives -= 1
            if self.lives > 0:
                self.ball = serve(self.rng)


def draw(screen: pygame.Surface, font: pygame.font.Font, game: Game) -> None:
    screen.fill(BACKGROUND)
    for brick in game.bricks:
        pygame.draw.rect(screen, brick.current_colour(), brick.rect)
    pygame.draw.rect(screen, PADDLE_COLOUR, game.paddle.rect())
    pygame.draw.ellipse(screen, BALL_COLOUR, game.ball.rect())
    screen.blit(font.render(f"Score {game.score}   Lives {game.lives}", True, TEXT_COLOUR), (16, 16))
    if game.lives == 0:
        screen.blit(font.render("Game over", True, TEXT_COLOUR), (260, 240))
    elif not game.bricks:
        screen.blit(font.render("You win!", True, TEXT_COLOUR), (270, 240))
```

```check
lacks breakout/model.py "def main(" -- main lives in app.py now.
lacks breakout/model.py "import os" -- Only main used os.
```

## Start from the app

**Build:** `__main__.py` starts the game from its new home.

```python file=breakout/__main__.py
import sys

from breakout.app import main

main(sys.argv[1:])
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="51 passed"
run ".venv/Scripts/python -m pyright breakout" stdout="0 errors"
```

## A circle of imports

**Build:** start moving drawing into its own module, the obvious way, and find out why it doesn't work.

First, make `app.py` import `draw` from a new module, `breakout.draw`, and keep the four colours in `app.py` for now (the drawing code needs them, and they were next to `draw` in the model):

```python file=breakout/app.py
import os
import random

import pygame

from breakout.draw import draw
from breakout.model import HEIGHT, WIDTH, Game, autopilot
from breakout.settings import Hold, parse_args

BACKGROUND = (24, 26, 33)
PADDLE_COLOUR = (94, 234, 212)
BALL_COLOUR = (245, 245, 245)
TEXT_COLOUR = (230, 230, 230)


def main(args: list[str]) -> None:
    settings = parse_args(args)
    seed = settings.seed
    if settings.test_frames is not None:
        os.environ["SDL_VIDEODRIVER"] = "dummy"
        if seed is None:
            seed = 0
    game = Game(random.Random(seed))

    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Breakout")
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

        direction = 0
        if settings.test_frames is None:
            keys = pygame.key.get_pressed()
            if keys[pygame.K_LEFT]:
                direction -= 1
            if keys[pygame.K_RIGHT]:
                direction += 1
        elif settings.hold == Hold.LEFT:
            direction = -1
        elif settings.hold == Hold.RIGHT:
            direction = 1
        elif settings.hold == Hold.AUTO:
            direction = autopilot(game.ball, game.paddle)
        game.update(direction, dt)

        draw(screen, font, game)
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
```

## …and its other half

**Build:** `breakout/draw.py`, taking the colours from `app.py`, where they are.

```python file=breakout/draw.py
import pygame

from breakout.app import BACKGROUND, BALL_COLOUR, PADDLE_COLOUR, TEXT_COLOUR
from breakout.model import Game


def draw(screen: pygame.Surface, font: pygame.font.Font, game: Game) -> None:
    screen.fill(BACKGROUND)
    for brick in game.bricks:
        pygame.draw.rect(screen, brick.current_colour(), brick.rect)
    pygame.draw.rect(screen, PADDLE_COLOUR, game.paddle.rect())
    pygame.draw.ellipse(screen, BALL_COLOUR, game.ball.rect())
    screen.blit(font.render(f"Score {game.score}   Lives {game.lives}", True, TEXT_COLOUR), (16, 16))
    if game.lives == 0:
        screen.blit(font.render("Game over", True, TEXT_COLOUR), (260, 240))
    elif not game.bricks:
        screen.blit(font.render("You win!", True, TEXT_COLOUR), (270, 240))
```

Run the game:

```powershell
.venv\Scripts\python -m breakout --test-run 5
```

```text
  File "C:\Users\you\Documents\forge\breakout\draw.py", line 3, in <module>
    from breakout.app import BACKGROUND, BALL_COLOUR, PADDLE_COLOUR, TEXT_COLOUR
ImportError: cannot import name 'BACKGROUND' from partially initialized module 'breakout.app' (most likely due to a circular import)
```

**Understand: what "partially initialized" means.** Follow the imports, remembering that importing a module **runs** it, top to bottom (lesson 2.3), and that `sys.modules` records a module the moment its import *starts*, so a second import of it doesn't start it again:

```text
python -m breakout runs __main__.py
  from breakout.app import main
    → start running app.py              (sys.modules now has breakout.app, still empty)
      line: from breakout.draw import draw
        → start running draw.py
          line: from breakout.app import BACKGROUND, ...
            → breakout.app is already in sys.modules: use it as it is
            → but app.py has only run as far as its own import of draw:
              BACKGROUND, defined further down app.py, doesn't exist yet
            → ImportError: cannot import name 'BACKGROUND' from partially initialized module
```

`app.py` needs `draw.py` finished before it can continue, and `draw.py` needs `app.py` finished before *it* can continue. Neither can finish first. That's a **circular import**, and it's always a sign that the code is in the wrong place, not that Python is being awkward: two modules that need each other aren't really two separate jobs.

```check
run ".venv/Scripts/python -m breakout --test-run 5" exit=1 stderr="circular import" label="the circle stops the game from starting (for now)" -- This step is meant to fail: draw.py imports from app.py, and app.py imports draw.py.
```

## Your turn: one direction only

**Build, on your own:** break the circle, then write the rule that keeps it broken.

The fix comes from asking which module the colours **belong** to. They're used only to draw: they're part of the drawing job. So:

1. Move the four colours into `breakout/draw.py`, and remove them from `app.py`. `draw.py` imports `Game` from the model and nothing from `app.py`.
2. Remove `draw` and the four colours from `model.py` too, if they're still there: drawing isn't part of the model. (`ROW_COLOURS` stays: each brick's colour is part of the brick.)
3. Write `tests/test_architecture.py`, with three tests that check which of the game's modules each module **loads** when it's imported on its own:

| Test name | Importing… | …loads exactly these game modules |
|---|---|---|
| `test_settings_depend_on_nothing_else_in_the_game` | `breakout.settings` | `breakout`, `breakout.settings` |
| `test_the_model_depends_on_nothing_else_in_the_game` | `breakout.model` | `breakout`, `breakout.model` |
| `test_drawing_depends_only_on_the_model` | `breakout.draw` | `breakout`, `breakout.draw`, `breakout.model` |

`sys.modules` (lesson 2.3) is the dictionary of every module imported so far. Importing a module and then listing the keys of `sys.modules` that start with `breakout` shows exactly which game modules it pulled in. Do it in a **fresh** Python, with `subprocess.run` as in the characterisation tests: the Python running the tests has already imported every module that any test uses, so its own `sys.modules` would show everything.

When everything passes (54 tests), with pyright satisfied on `breakout` and the new test file, and ruff satisfied, commit with a message that mentions **modules**.

Try it for about 25 minutes before taking a hint.

```hints
nudge: Start with the circle: once the colours are in `draw.py`, does `draw.py` still need anything from `app.py`? Run the game to check. Then the test: what single line of Python, run with `python -c`, would print the names of every module that `import breakout.model` loaded?
concept: A fresh Python process is the only clean slate: `subprocess.run([sys.executable, "-c", code], cwd=ROOT, capture_output=True, text=True, check=True)` runs `code` and returns what it printed. The code imports the module, then loops over `sys.modules` printing every name. Keep the printed lines that start with `breakout` (pygame also prints its banner line), and compare the **set** of them with the expected set: a set ignores order, which is right, since import order isn't the point.
shape: A helper `loaded_by(module: str) -> set[str]` builds the code string with an f-string, runs it, and returns `{line for line in result.stdout.splitlines() if line.startswith("breakout")}`, a **set comprehension**. Then three one-line tests comparing `loaded_by("breakout.model")` and friends with set literals like `{"breakout", "breakout.model"}`. `check=True` here, unlike the characterisation tests: if the import itself fails, as it would with a circle, the helper should fail loudly.
answer: ~~~python
# Which parts of the game may depend on which. Each check imports one module in a fresh Python,
# because this test process has already imported every module the other tests use.
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent


def loaded_by(module: str) -> set[str]:
    code = f"import sys, {module}\nfor name in sys.modules:\n    print(name)"
    result = subprocess.run([sys.executable, "-c", code], cwd=ROOT, capture_output=True, text=True, check=True)
    return {line for line in result.stdout.splitlines() if line.startswith("breakout")}


def test_settings_depend_on_nothing_else_in_the_game():
    assert loaded_by("breakout.settings") == {"breakout", "breakout.settings"}


def test_the_model_depends_on_nothing_else_in_the_game():
    assert loaded_by("breakout.model") == {"breakout", "breakout.model"}


def test_drawing_depends_only_on_the_model():
    assert loaded_by("breakout.draw") == {"breakout", "breakout.draw", "breakout.model"}
~~~

and `breakout/draw.py`:

~~~python
import pygame

from breakout.model import Game

BACKGROUND = (24, 26, 33)
PADDLE_COLOUR = (94, 234, 212)
BALL_COLOUR = (245, 245, 245)
TEXT_COLOUR = (230, 230, 230)


def draw(screen: pygame.Surface, font: pygame.font.Font, game: Game) -> None:
    ...
~~~

`breakout` itself appears in every set because importing `breakout.model` first imports the package `breakout` (its `__init__.py`). Try the test on a version where the model still imports the settings: `Extra items in the left set: 'breakout.settings'`. A rule that a test checks is a rule that can't quietly erode. The next lesson's first steps show the whole files.
```

```check
run ".venv/Scripts/python -m breakout --test-run 600 --hold auto" stdout="frames=600 paddle_x=435 score=70" label="the game starts again: no circle"
lacks breakout/app.py "BACKGROUND = " -- The colours belong to drawing: define them in draw.py, not app.py.
lacks breakout/model.py "def draw(" -- Drawing isn't part of the model.
run ".venv/Scripts/python -m pytest -q tests/test_architecture.py" stdout="3 passed" label="the three architecture tests pass"
run ".venv/Scripts/python -m pytest -q" stdout="54 passed"
run ".venv/Scripts/python -m pyright breakout tests/test_architecture.py" stdout="0 errors"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
git-message "modules"
git-clean
```

## What did we actually learn?

- **One module, one job**: settings, the model, drawing, the application. **Cohesion** is how well a module's contents belong together.
- **Imports run modules**, and `sys.modules` records a module as soon as its import starts. A **circular import** finds the other module half-finished.
- **A circle means misplaced code.** Ask what each piece belongs to, and move it; don't reach for tricks to make the circle work.
- **Dependency direction**: settings and the model depend on nothing else in the game; drawing depends on the model; the app depends on everything. Arrows point one way: down.
- **Architecture tests** turn that rule into something a failing test enforces.
- **Import groups** (standard library, installed, project) show what a module depends on, inside and out.

```text
                 app.py          ← the outside world: pygame window, keys, clock
               ↙   ↓    ↘
     settings.py  draw.py  ↓
                     ↘     ↓
                      model.py   ← the rules: no window, no command line
```

C# and Java compilers refuse many circles outright: two projects can't reference each other in .NET, and Java modules can't `requires` each other in a cycle. Inside one project, circles between classes are allowed but treated as a design smell, and teams use the same kind of architecture tests to forbid them: **ArchUnit** for Java and **NetArchTest** for C# let you write "classes in `..model..` must not depend on classes in `..ui..`" as an ordinary unit test. Chapter 9 makes this boundary the centre of the engine.
