---
title: 3.4 — Choices, Rules and a Pause Button for Git
runtime: python
run: breakout.py
---

Three tools for keeping objects honest. **Enums** replace strings that can only be one of a few values, so a typo becomes an error instead of a silent `False`. **Invariants** are rules an object guarantees about itself, enforced by the object, not by everyone who uses it. And `git stash` lets you set work aside for a minute, to answer the question every programmer asks when a test fails: *was it me?*

## The whole files so far

**Build:** make sure `breakout.py` matches the end of lesson 3.3, the reference answer to its Your turn.

```python file=breakout.py
import math
import os
import random
import sys
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
HOLDS = ["left", "right", "none", "auto"]
USAGE = "usage: python breakout.py [--test-run FRAMES [--hold left|right|none|auto] [--lag-at FRAME] [--seed N]]"



@dataclass(frozen=True)
class Settings:
    test_frames: int | None = None
    hold: str = "none"
    lag_at: int | None = None
    seed: int | None = None


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(value, high))


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
    hold = "none"
    if "--hold" in args:
        i = args.index("--hold")
        if i + 1 >= len(args) or args[i + 1] not in HOLDS:
            print(USAGE)
            sys.exit(2)
        hold = args[i + 1]
    return Settings(
        test_frames=number_after(args, "--test-run"),
        hold=hold,
        lag_at=number_after(args, "--lag-at"),
        seed=number_after(args, "--seed"),
    )


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
    def __init__(self) -> None:
        self.x = float(WIDTH // 2 - PADDLE_WIDTH // 2)

    def move(self, direction: int, dt: float) -> None:
        self.x = clamp(self.x + direction * PADDLE_SPEED * dt, 0, WIDTH - PADDLE_WIDTH)

    def rect(self) -> pygame.Rect:
        return pygame.Rect(round(self.x), HEIGHT - 30 - PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT)


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


def draw(screen: pygame.Surface, font: pygame.font.Font, paddle: pygame.Rect, ball: Ball,
         bricks: list[Brick], score: int, lives: int) -> None:
    screen.fill(BACKGROUND)
    for brick in bricks:
        pygame.draw.rect(screen, brick.current_colour(), brick.rect)
    pygame.draw.rect(screen, PADDLE_COLOUR, paddle)
    pygame.draw.ellipse(screen, BALL_COLOUR, ball.rect())
    screen.blit(font.render(f"Score {score}   Lives {lives}", True, TEXT_COLOUR), (16, 16))
    if lives == 0:
        screen.blit(font.render("Game over", True, TEXT_COLOUR), (260, 240))
    elif not bricks:
        screen.blit(font.render("You win!", True, TEXT_COLOUR), (270, 240))


def main(args: list[str]) -> None:
    settings = parse_args(args)
    seed = settings.seed
    if settings.test_frames is not None:
        os.environ["SDL_VIDEODRIVER"] = "dummy"
        if seed is None:
            seed = 0
    rng = random.Random(seed)

    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Breakout")
    clock = pygame.time.Clock()
    font = pygame.font.Font(None, 36)

    paddle = Paddle()

    ball = serve(rng)

    bricks = make_bricks()

    score = 0
    lives = 3
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
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                running = False

        if lives > 0 and bricks:
            direction = 0
            if settings.test_frames is None:
                keys = pygame.key.get_pressed()
                if keys[pygame.K_LEFT]:
                    direction -= 1
                if keys[pygame.K_RIGHT]:
                    direction += 1
            elif settings.hold == "left":
                direction = -1
            elif settings.hold == "right":
                direction = 1
            elif settings.hold == "auto":
                direction = autopilot(ball, paddle)
            paddle.move(direction, dt)

            ball.move(dt)
            ball.bounce_off_walls()
            bounce_off_paddle(ball, paddle.rect())

            hit = hit_brick(ball.rect(), bricks)
            if hit is not None:
                score += bricks[hit].hit()
                if bricks[hit].hits_left == 0:
                    bricks.pop(hit)
                ball.velocity.y = -ball.velocity.y

            if ball.rect().top > HEIGHT:
                lives -= 1
                if lives > 0:
                    ball = serve(rng)

        draw(screen, font, paddle.rect(), ball, bricks, score, lives)
        pygame.display.flip()

        frames += 1
        if settings.test_frames is not None and frames >= settings.test_frames:
            running = False

    pygame.quit()
    if settings.test_frames is not None:
        inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(ball.rect())
        print(f"frames={frames} paddle_x={paddle.rect().x} score={score} lives={lives} bricks={len(bricks)} inside={inside}")


if __name__ == "__main__":
    main(sys.argv[1:])
```

```check
contains breakout.py "def current_colour(self) -> tuple[int, int, int]:"
run ".venv/Scripts/python -m pyright breakout.py" stdout="0 errors"
```

## The whole test file so far

**Build:** the unit tests as lesson 3.3 left them.

```python file=tests/test_breakout.py
import math
import random

import pygame
from pygame import Vector2

import breakout


def test_clamp_leaves_a_value_in_range_alone():
    assert breakout.clamp(2, 0, 3) == 2


def test_clamp_raises_a_value_below_the_range():
    assert breakout.clamp(-5, 0, 3) == 0


def test_clamp_lowers_a_value_above_the_range():
    assert breakout.clamp(9, 0, 3) == 3


def test_the_same_seed_serves_the_same_ball():
    assert breakout.serve(random.Random(1)) == breakout.serve(random.Random(1))


def test_every_serve_starts_in_the_middle_going_up_at_full_speed():
    for seed in range(100):
        ball = breakout.serve(random.Random(seed))
        assert ball.position == Vector2(320, 240)
        assert ball.velocity.y < 0
        assert abs(ball.velocity.x) <= 0.6 * breakout.BALL_SPEED
        assert math.isclose(ball.velocity.length(), breakout.BALL_SPEED)


def test_a_new_paddle_is_centred_near_the_bottom():
    assert breakout.Paddle().rect() == pygame.Rect(270, 436, 100, 14)


def test_holding_right_for_half_a_second_moves_the_paddle_210_pixels():
    paddle = breakout.Paddle()
    paddle.move(1, 0.5)
    assert paddle.x == 480


def test_the_paddle_stops_at_the_right_edge():
    paddle = breakout.Paddle()
    paddle.move(1, 1)
    assert paddle.x == 540


def test_the_paddle_stops_at_the_left_edge():
    paddle = breakout.Paddle()
    paddle.move(-1, 1)
    assert paddle.x == 0


def test_the_autopilot_steers_towards_the_ball():
    paddle = breakout.Paddle()
    assert breakout.autopilot(breakout.Ball(Vector2(100, 240), Vector2(0, 0)), paddle) == -1
    assert breakout.autopilot(breakout.Ball(Vector2(320, 240), Vector2(0, 0)), paddle) == 0
    assert breakout.autopilot(breakout.Ball(Vector2(500, 240), Vector2(0, 0)), paddle) == 1


def test_a_ball_moves_by_its_velocity_times_dt():
    ball = breakout.Ball(Vector2(100, 100), Vector2(180, -240))
    ball.move(0.5)
    assert ball == breakout.Ball(Vector2(190, -20), Vector2(180, -240))


def test_a_ball_in_the_middle_of_the_screen_is_left_alone():
    ball = breakout.Ball(Vector2(100, 100), Vector2(180, -240))
    ball.bounce_off_walls()
    assert ball == breakout.Ball(Vector2(100, 100), Vector2(180, -240))


def test_the_left_wall_sends_the_ball_right():
    ball = breakout.Ball(Vector2(3, 100), Vector2(-180, -240))
    ball.bounce_off_walls()
    assert ball == breakout.Ball(Vector2(6, 100), Vector2(180, -240))


def test_the_right_wall_sends_the_ball_left():
    ball = breakout.Ball(Vector2(638, 100), Vector2(180, -240))
    ball.bounce_off_walls()
    assert ball == breakout.Ball(Vector2(634, 100), Vector2(-180, -240))


def test_the_top_wall_sends_the_ball_down():
    ball = breakout.Ball(Vector2(100, 2), Vector2(180, -240))
    ball.bounce_off_walls()
    assert ball == breakout.Ball(Vector2(100, 6), Vector2(180, 240))


def test_a_ball_far_past_the_top_is_put_back_and_keeps_moving_down():
    # Lesson 1.4's bug: after one slow frame the ball was 40 pixels past the top, and the
    # wall flipped its direction every frame, so it never came back.
    ball = breakout.Ball(Vector2(100, -40), Vector2(180, 240))
    ball.bounce_off_walls()
    assert ball == breakout.Ball(Vector2(100, 6), Vector2(180, 240))


def test_a_ball_knows_its_rectangle():
    assert breakout.Ball(Vector2(320, 438), Vector2(0, 0)).rect() == pygame.Rect(314, 432, 12, 12)


def test_the_paddle_bounces_a_ball_coming_down_straight_up_from_its_middle():
    ball = breakout.Ball(Vector2(320, 438), Vector2(180, 240))
    breakout.bounce_off_paddle(ball, pygame.Rect(270, 436, 100, 14))
    assert ball.velocity == Vector2(0, -240)


def test_the_paddle_steers_a_ball_hitting_its_right_end():
    ball = breakout.Ball(Vector2(370, 438), Vector2(180, 240))
    breakout.bounce_off_paddle(ball, pygame.Rect(270, 436, 100, 14))
    assert ball.velocity == Vector2(240, -240)


def test_the_paddle_ignores_a_ball_moving_up():
    ball = breakout.Ball(Vector2(320, 438), Vector2(180, -240))
    breakout.bounce_off_paddle(ball, pygame.Rect(270, 436, 100, 14))
    assert ball.velocity == Vector2(180, -240)


def test_the_wall_has_forty_bricks_from_the_top_left():
    bricks = breakout.make_bricks()
    assert len(bricks) == 40
    assert bricks[-1] == breakout.Brick(pygame.Rect(548, 164, 70, 20), breakout.ROW_COLOURS[4])


def test_the_top_row_is_tough():
    bricks = breakout.make_bricks()
    assert bricks[0] == breakout.Brick(pygame.Rect(16, 60, 70, 20), breakout.ROW_COLOURS[0], hits_left=2, points=30)
    assert all(brick.hits_left == 2 for brick in bricks[:8])
    assert all(brick.hits_left == 1 for brick in bricks[8:])


def test_a_tough_brick_survives_its_first_hit():
    brick = breakout.Brick(pygame.Rect(0, 0, 70, 20), (239, 68, 68), hits_left=2)
    assert brick.hit() == 0
    assert brick.hits_left == 1


def test_an_ordinary_brick_breaks_at_once_for_10_points():
    brick = breakout.Brick(pygame.Rect(0, 0, 70, 20), (34, 197, 94))
    assert brick.hit() == 10
    assert brick.hits_left == 0


def test_a_tough_brick_scores_its_points_when_it_breaks():
    brick = breakout.Brick(pygame.Rect(0, 0, 70, 20), (239, 68, 68), hits_left=2, points=30)
    assert brick.hit() == 0
    assert brick.hit() == 30
    assert brick.hits_left == 0


def test_an_untouched_brick_keeps_its_colour():
    brick = breakout.Brick(pygame.Rect(0, 0, 70, 20), (239, 68, 68), hits_left=2, points=30)
    assert brick.current_colour() == (239, 68, 68)


def test_a_cracked_brick_is_drawn_darker():
    brick = breakout.Brick(pygame.Rect(0, 0, 70, 20), (239, 68, 68), hits_left=2, points=30)
    brick.hit()
    assert brick.current_colour() == (143, 40, 40)
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="44 passed"
```

## Choices, not strings

**Build:** the `--hold` setting as an **enum**.

```python file=breakout.py
import math
import os
import random
import sys
from dataclasses import dataclass
from enum import Enum

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
USAGE = "usage: python breakout.py [--test-run FRAMES [--hold left|right|none|auto] [--lag-at FRAME] [--seed N]]"



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


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(value, high))


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
    def __init__(self) -> None:
        self.x = float(WIDTH // 2 - PADDLE_WIDTH // 2)

    def move(self, direction: int, dt: float) -> None:
        self.x = clamp(self.x + direction * PADDLE_SPEED * dt, 0, WIDTH - PADDLE_WIDTH)

    def rect(self) -> pygame.Rect:
        return pygame.Rect(round(self.x), HEIGHT - 30 - PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT)


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


def draw(screen: pygame.Surface, font: pygame.font.Font, paddle: pygame.Rect, ball: Ball,
         bricks: list[Brick], score: int, lives: int) -> None:
    screen.fill(BACKGROUND)
    for brick in bricks:
        pygame.draw.rect(screen, brick.current_colour(), brick.rect)
    pygame.draw.rect(screen, PADDLE_COLOUR, paddle)
    pygame.draw.ellipse(screen, BALL_COLOUR, ball.rect())
    screen.blit(font.render(f"Score {score}   Lives {lives}", True, TEXT_COLOUR), (16, 16))
    if lives == 0:
        screen.blit(font.render("Game over", True, TEXT_COLOUR), (260, 240))
    elif not bricks:
        screen.blit(font.render("You win!", True, TEXT_COLOUR), (270, 240))


def main(args: list[str]) -> None:
    settings = parse_args(args)
    seed = settings.seed
    if settings.test_frames is not None:
        os.environ["SDL_VIDEODRIVER"] = "dummy"
        if seed is None:
            seed = 0
    rng = random.Random(seed)

    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Breakout")
    clock = pygame.time.Clock()
    font = pygame.font.Font(None, 36)

    paddle = Paddle()

    ball = serve(rng)

    bricks = make_bricks()

    score = 0
    lives = 3
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
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                running = False

        if lives > 0 and bricks:
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
                direction = autopilot(ball, paddle)
            paddle.move(direction, dt)

            ball.move(dt)
            ball.bounce_off_walls()
            bounce_off_paddle(ball, paddle.rect())

            hit = hit_brick(ball.rect(), bricks)
            if hit is not None:
                score += bricks[hit].hit()
                if bricks[hit].hits_left == 0:
                    bricks.pop(hit)
                ball.velocity.y = -ball.velocity.y

            if ball.rect().top > HEIGHT:
                lives -= 1
                if lives > 0:
                    ball = serve(rng)

        draw(screen, font, paddle.rect(), ball, bricks, score, lives)
        pygame.display.flip()

        frames += 1
        if settings.test_frames is not None and frames >= settings.test_frames:
            running = False

    pygame.quit()
    if settings.test_frames is not None:
        inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(ball.rect())
        print(f"frames={frames} paddle_x={paddle.rect().x} score={score} lives={lives} bricks={len(bricks)} inside={inside}")


if __name__ == "__main__":
    main(sys.argv[1:])
```

**Understand: the problem with strings.** `settings.hold` was a string, `"none"`, `"left"`, `"right"` or `"auto"`, and `main` compared it with string literals. A typo, `settings.hold == "atuo"`, is a perfectly valid comparison that is simply always `False`. Nothing fails; the autopilot just quietly never runs. pyright can't help, because comparing two strings is fine.

> **Enumeration (enum)**: a type with a fixed set of named values, its **members**, and no others.

`class Hold(Enum):` declares one. Each line in its body is a member: `Hold.AUTO` is a value of type `Hold`, with a **name** (`"AUTO"`) and a **value** (`"auto"`, the word used on the command line).

```text
list(Hold)          [<Hold.NONE: 'none'>, <Hold.LEFT: 'left'>, <Hold.RIGHT: 'right'>, <Hold.AUTO: 'auto'>]
Hold("auto")        Hold.AUTO               look a member up by its value
Hold.AUTO.value     'auto'
Hold.AUTO.name      'AUTO'
Hold("sideways")    ValueError: 'sideways' is not a valid Hold
```

Now `main` compares with `Hold.LEFT`, `Hold.AUTO`: names, not strings. Misspell one, `Hold.ATUO`, and pyright reports `Cannot access attribute "ATUO" for class "type[Hold]"` before the program runs, and the program would stop with an `AttributeError` if it did. A typo can't be silent any more.

`parse_args` still checks the word against the allowed values (now built from the enum itself, `[h.value for h in Hold]`, so the list can't drift out of step with the members), then turns it into a member with `Hold(args[i + 1])`. From there on, the rest of the program only ever sees `Hold`s.

One trap remains: a `Hold` is not equal to its value. `settings.hold == "auto"` is `False` even when the hold is `Hold.AUTO`, because a member and a string are different types. Inside the program, always compare members with members.

> **Engineer:** "make illegal states unrepresentable". When a value can only be one of a few things, give it a type that can only hold those things. Then a whole class of bugs (misspellings, unexpected values, forgotten cases) can't happen, instead of having to be checked for.

```check
contains breakout.py "class Hold(Enum):"
run ".venv/Scripts/python -m pyright breakout.py" stdout="0 errors"
run ".venv/Scripts/python -m pytest -q tests/test_characterisation.py" stdout="9 passed" label="the game behaves exactly as before"
```

## Tests speak in choices

**Build:** the argument tests, comparing with `Hold` members.

```python file=tests/test_arguments.py
# Lesson 2.4, with --seed added in 2.6: what the game's command line should accept, and what it should refuse.
import pytest

import breakout
from breakout import Hold, Settings


def test_no_arguments_is_a_normal_game():
    assert breakout.parse_args([]) == Settings()


def test_a_test_run_with_every_option():
    assert breakout.parse_args(["--test-run", "600", "--hold", "auto", "--lag-at", "40", "--seed", "7"]) == Settings(test_frames=600, hold=Hold.AUTO, lag_at=40, seed=7)


def test_an_unknown_hold_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        breakout.parse_args(["--test-run", "5", "--hold", "sideways"])
    assert stopped.value.code == 2


def test_a_hold_with_nothing_after_it_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        breakout.parse_args(["--test-run", "5", "--hold"])
    assert stopped.value.code == 2


def test_a_lag_with_nothing_after_it_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        breakout.parse_args(["--test-run", "5", "--lag-at"])
    assert stopped.value.code == 2


def test_a_lag_that_is_not_a_number_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        breakout.parse_args(["--test-run", "5", "--lag-at", "soon"])
    assert stopped.value.code == 2


def test_a_usage_error_says_how_to_use_the_game(capsys):
    with pytest.raises(SystemExit):
        breakout.parse_args(["--hold", "sideways"])
    assert capsys.readouterr().out.startswith("usage: python breakout.py")


def test_a_seed_that_is_not_a_number_is_a_usage_error():
    with pytest.raises(SystemExit) as stopped:
        breakout.parse_args(["--test-run", "5", "--seed", "lucky"])
    assert stopped.value.code == 2
```

Commit this step on its own: one change, one commit.

```powershell
git add .
git commit -m "Use an enum for the hold setting"
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="44 passed"
run ".venv/Scripts/python -m pyright breakout.py" stdout="0 errors"
git-message "enum"
git-clean
```

## A rule the paddle keeps

**Build:** the paddle guarantees it's always on screen, and nobody can break that from outside.

```python file=breakout.py
import math
import os
import random
import sys
from dataclasses import dataclass
from enum import Enum

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
USAGE = "usage: python breakout.py [--test-run FRAMES [--hold left|right|none|auto] [--lag-at FRAME] [--seed N]]"



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


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(value, high))


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


def draw(screen: pygame.Surface, font: pygame.font.Font, paddle: pygame.Rect, ball: Ball,
         bricks: list[Brick], score: int, lives: int) -> None:
    screen.fill(BACKGROUND)
    for brick in bricks:
        pygame.draw.rect(screen, brick.current_colour(), brick.rect)
    pygame.draw.rect(screen, PADDLE_COLOUR, paddle)
    pygame.draw.ellipse(screen, BALL_COLOUR, ball.rect())
    screen.blit(font.render(f"Score {score}   Lives {lives}", True, TEXT_COLOUR), (16, 16))
    if lives == 0:
        screen.blit(font.render("Game over", True, TEXT_COLOUR), (260, 240))
    elif not bricks:
        screen.blit(font.render("You win!", True, TEXT_COLOUR), (270, 240))


def main(args: list[str]) -> None:
    settings = parse_args(args)
    seed = settings.seed
    if settings.test_frames is not None:
        os.environ["SDL_VIDEODRIVER"] = "dummy"
        if seed is None:
            seed = 0
    rng = random.Random(seed)

    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Breakout")
    clock = pygame.time.Clock()
    font = pygame.font.Font(None, 36)

    paddle = Paddle()

    ball = serve(rng)

    bricks = make_bricks()

    score = 0
    lives = 3
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
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                running = False

        if lives > 0 and bricks:
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
                direction = autopilot(ball, paddle)
            paddle.move(direction, dt)

            ball.move(dt)
            ball.bounce_off_walls()
            bounce_off_paddle(ball, paddle.rect())

            hit = hit_brick(ball.rect(), bricks)
            if hit is not None:
                score += bricks[hit].hit()
                if bricks[hit].hits_left == 0:
                    bricks.pop(hit)
                ball.velocity.y = -ball.velocity.y

            if ball.rect().top > HEIGHT:
                lives -= 1
                if lives > 0:
                    ball = serve(rng)

        draw(screen, font, paddle.rect(), ball, bricks, score, lives)
        pygame.display.flip()

        frames += 1
        if settings.test_frames is not None and frames >= settings.test_frames:
            running = False

    pygame.quit()
    if settings.test_frames is not None:
        inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(ball.rect())
        print(f"frames={frames} paddle_x={paddle.rect().x} score={score} lives={lives} bricks={len(bricks)} inside={inside}")


if __name__ == "__main__":
    main(sys.argv[1:])
```

**Understand: invariants.**

> **Invariant**: a rule about an object that is true from the moment it's created and stays true after every operation on it.

The paddle's invariant: its whole width is on the screen, `0 <= x <= 540`. `move` keeps it, by clamping. But until now anything could break it from outside: `paddle.x = 900` was allowed. An invariant that depends on every other piece of code behaving is a hope, not a guarantee.

So the paddle now keeps its position in `self._x`. A leading underscore is Python's convention for **private**: "this is internal; don't touch it from outside the class". Python doesn't enforce it (Python trusts programmers), but pyright, linters and every Python programmer read it that way.

**`@property`** makes a method behave like an attribute. `paddle.x` *calls* the method `x` and returns its result, with no parentheses at the call. Because there's only a "get" method and no "set" method, `paddle.x` can be read but not assigned:

```text
paddle.x = 900
AttributeError: property 'x' of 'Paddle' object has no setter        (when run)
error: Cannot assign to attribute "x" for class "Paddle"              (pyright, before running)
```

Everything that read `paddle.x` before, `autopilot`, the tests, still reads it the same way. That's the point of a property: the **interface** stays the same while the class takes control of its **implementation**. The only way to change `_x` is `move`, and `move` keeps the rule.

The comment at the top of the class states the invariant. Writing it down tells every future reader what `move`, and any method added later, must preserve.

> **Engineer:** **encapsulation** (lesson 3.1) has two halves: keeping data with the code that understands it, and keeping everyone else from changing that data directly. The second half is what makes an invariant something you can rely on: if only the class's own methods can change its state, you only have to check those methods to know the rule holds.

```check
contains breakout.py "@property"
contains breakout.py "self._x"
run ".venv/Scripts/python -m pytest -q" stdout="44 passed"
run ".venv/Scripts/python -m pyright breakout.py" stdout="0 errors"
```

## Was it me? `git stash`

**Build:** set your uncommitted work aside, check something, and bring it back.

You have uncommitted changes: the paddle property. Suppose a test had failed just now. The first question is always *did my change break it, or was it already broken?* To answer it, you need to run the tests on the code **without** your change, and then get your change back.

```powershell
git stash
```

```text
Saved working directory and index state WIP on main: 801d708 Use an enum for the hold setting
```

(The number and message are those of your last commit.)

```powershell
git status --short
.venv\Scripts\python -m pytest -q
git stash list
```

`git status` prints nothing: the working tree is back to the last commit. The tests run against that code. `git stash list` shows the saved work: `stash@{0}: WIP on main: ...`. Now bring it back:

```powershell
git stash pop
```

```text
...
	modified:   breakout.py
...
Dropped refs/stash@{0} (07e2de691cc65bd8bfa200802c8d843706959191)
```

**Understand.** `git stash` takes every uncommitted change, in the working tree and the staging area, saves it as a special commit that isn't on any branch, and then restores your files to the last commit. *WIP* stands for "work in progress". `git stash pop` reapplies the saved changes to your files and **drops** the stash, deleting it. (`git stash apply` reapplies without dropping, if you want to keep it.) Stashes form a **stack**: the most recent is `stash@{0}`, and `pop` takes the top one.

Untracked files, new files Git has never seen, are not stashed unless you add `-u`. A stash is also easy to forget about: `git stash list` shows what's there. For anything longer than a few minutes, a commit on a branch (Chapter 4) is safer.

Now commit the paddle work:

```powershell
git add .
git commit -m "Keep the paddle on screen with a read-only property"
```

```check
git-message "property" -- Commit with a message that mentions property.
git-clean -- git stash pop brings your change back; then commit it.
```

## Your turn: a broken brick stays broken

**Build, on your own, test first:** the brick's invariant.

A brick's `hits_left` is never negative. Right now, calling `hit()` on a brick that's already broken would make it −1, and score its points a second time if the code allowed it. The game doesn't do that today (broken bricks are removed at once), but nothing in `Brick` prevents it. Make `Brick` keep its own rule:

- Hitting a brick with `hits_left == 0` raises **`ValueError`**, with a message saying the brick is already broken, and changes nothing.
- Everything else behaves as before.

**Red** first: a test named `test_a_broken_brick_cannot_be_hit_again` that breaks an ordinary brick with one hit, then checks that a second `hit()` raises `ValueError` (lesson 2.4's `pytest.raises`) and that `hits_left` is still 0. **Green**: the smallest change to `hit`. Commit with a message that mentions **broken**.

```hints
nudge: Lesson 2.4 checked that `parse_args` raises `SystemExit`. The same `with pytest.raises(...):` checks for `ValueError`. What does the test need to do *before* that block, to have a broken brick?
concept: **Raising** an exception is how a function refuses to do something: `raise ValueError("...")` stops the function at that line, and the exception travels up to whoever called it, the same way `sys.exit` raised `SystemExit`. `ValueError` is Python's standard exception for "an argument or state has the right type but an unacceptable value". Raise it at the *start* of `hit`, before anything is changed, so a refused hit leaves the brick exactly as it was.
shape: In `hit`, before `self.hits_left -= 1`: `if self.hits_left == 0: raise ValueError("this brick is already broken")`. The test: a brick, `brick.hit()`, then `with pytest.raises(ValueError): brick.hit()`, then `assert brick.hits_left == 0`. `import pytest` at the top of the test file.
answer: ~~~python
    def hit(self) -> int:
        if self.hits_left == 0:
            raise ValueError("this brick is already broken")
        self.hits_left -= 1
        self.cracked = True
        if self.hits_left == 0:
            return self.points
        return 0
~~~

~~~python
def test_a_broken_brick_cannot_be_hit_again():
    brick = breakout.Brick(pygame.Rect(0, 0, 70, 20), (34, 197, 94))
    brick.hit()
    with pytest.raises(ValueError):
        brick.hit()
    assert brick.hits_left == 0
~~~

The check comes before any change, so the refused hit can't half-happen. This style is sometimes called **fail fast**: report the impossible situation at the moment it occurs, loudly, rather than carrying on with a negative `hits_left` that causes a strange bug somewhere else much later. The next lesson's first step shows the whole file.
```

```check
run ".venv/Scripts/python -m pytest -q -k cannot_be_hit_again" stdout="1 passed" label="hitting a broken brick raises ValueError and changes nothing"
contains breakout.py "raise ValueError(" -- Raise ValueError at the start of hit when hits_left is already 0.
run ".venv/Scripts/python -m pytest -q" stdout="45 passed"
run ".venv/Scripts/python -m pyright breakout.py tests/test_breakout.py" stdout="0 errors"
git-message "broken"
git-clean
```

## What did we actually learn?

- **Enums** give a fixed set of named choices a type of its own: typos become errors, and the set of choices is defined once.
- **Invariants** are rules an object keeps from creation onwards. Write them down; enforce them inside the object.
- **Private by convention** (`_x`) and **read-only properties** (`@property` without a setter) let a class control its own state while keeping a simple interface.
- **Fail fast**: raise an exception (`ValueError`) the moment an impossible request arrives, before changing anything.
- **`git stash`** sets uncommitted work aside and brings it back: the quickest way to answer "was it me?".

C# and Java have both ideas built in, enforced by the compiler: `enum Hold { None, Left, Right, Auto }` in both (Java's enums can even hold values and methods, like Python's), `private double x;` with a public **getter** (`public double X { get; private set; }` in C#, a `getX()` method in Java) for a read-only property, and `throw new ArgumentException("...")` (C#) or `throw new IllegalStateException("...")` (Java) to fail fast. Python's versions rely more on convention and tools; the design is the same.
