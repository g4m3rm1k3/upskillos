---
title: 3.3 — Test First
runtime: python
run: breakout.py
---

Every test so far was written *after* the code it tests: characterisation tests for code that already worked, unit tests for functions already written. This lesson adds a new feature the other way round. You'll write a test for behaviour that doesn't exist yet, watch it fail, write just enough code to make it pass, and repeat. This way of working is called **test-driven development**, and it changes how a feature gets designed, not just how it gets tested.

The feature is a new story:

> **Tough bricks.** As a player, I want the top row to take two hits, so that clearing the wall takes more skill.
> - A top-row brick survives its first hit, and is drawn darker once it's cracked.
> - Breaking a top-row brick scores 30; other bricks still score 10.

## The whole files so far

**Build:** make sure your files match the end of lesson 3.2, the reference answer to its Your turn.

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


def make_bricks() -> list[Brick]:
    bricks = []
    for row, colour in enumerate(ROW_COLOURS):
        for col in range(8):
            x = WALL_LEFT + col * (BRICK_WIDTH + BRICK_GAP)
            y = WALL_TOP + row * (BRICK_HEIGHT + BRICK_GAP)
            bricks.append(Brick(pygame.Rect(x, y, BRICK_WIDTH, BRICK_HEIGHT), colour))
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
        pygame.draw.rect(screen, brick.colour, brick.rect)
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
                bricks.pop(hit)
                ball.velocity.y = -ball.velocity.y
                score += 10

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
contains breakout.py "def parse_args(args: list[str]) -> Settings:"
run ".venv/Scripts/python -m pyright breakout.py" stdout="0 errors"
```

## The argument tests so far

**Build:** the argument tests, as lesson 3.2 left them.

```python file=tests/test_arguments.py
# Lesson 2.4, with --seed added in 2.6: what the game's command line should accept, and what it should refuse.
import pytest

import breakout
from breakout import Settings


def test_no_arguments_is_a_normal_game():
    assert breakout.parse_args([]) == Settings()


def test_a_test_run_with_every_option():
    assert breakout.parse_args(["--test-run", "600", "--hold", "auto", "--lag-at", "40", "--seed", "7"]) == Settings(test_frames=600, hold="auto", lag_at=40, seed=7)


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

```check
run ".venv/Scripts/python -m pytest -q" stdout="38 passed"
```

## Red: a brick that survives a hit

**Build:** a test for the first rule, before there's any code for it.

Add this test at the end of `tests/test_breakout.py`:

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
    assert bricks[0] == breakout.Brick(pygame.Rect(16, 60, 70, 20), breakout.ROW_COLOURS[0])
    assert bricks[-1] == breakout.Brick(pygame.Rect(548, 164, 70, 20), breakout.ROW_COLOURS[4])


def test_a_tough_brick_survives_its_first_hit():
    brick = breakout.Brick(pygame.Rect(0, 0, 70, 20), (239, 68, 68), hits_left=2)
    assert brick.hit() == 0
    assert brick.hits_left == 1
```

Run it:

```powershell
.venv\Scripts\python -m pytest -q tests/test_breakout.py
```

```text
E       TypeError: Brick.__init__() got an unexpected keyword argument 'hits_left'
1 failed, 21 passed in 0.34s
```

**Understand: the cycle.**

> **Test-driven development (TDD)**: writing code in short cycles of three steps. **Red**: write a test for the next small piece of behaviour, and run it to see it fail. **Green**: write the simplest code that makes it pass. **Refactor**: improve the code's structure, with every test still passing. Then the next piece.

Seeing it fail first matters, and *how* it fails matters too. This one fails with `TypeError: ... unexpected keyword argument 'hits_left'`: `Brick` has no `hits_left` yet, which is exactly right. If it had *passed*, the test would be checking something that already worked, so it couldn't tell you anything about your new code. If it had failed for an unexpected reason, a typo in the test say, you'd fix the test before writing any code.

Writing the test first also designs the code. Before `Brick` had a `hit` method, the test had to decide what calling it looks like: `brick.hit()`, returning the points scored, `0` for a brick that only cracked. Deciding that from the **caller's side** tends to give simpler interfaces than deciding it while writing the inside.

```check
run ".venv/Scripts/python -m pytest -q -k survives_its_first_hit" exit=1 stdout="1 failed" label="the new test fails, because Brick has no hits yet" -- This step is the red one: the test should fail. If it passes, Brick already has hits_left.
```

## Green: just enough

**Build:** the simplest code that makes the test pass.

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

    def hit(self) -> int:
        self.hits_left -= 1
        return 0


def make_bricks() -> list[Brick]:
    bricks = []
    for row, colour in enumerate(ROW_COLOURS):
        for col in range(8):
            x = WALL_LEFT + col * (BRICK_WIDTH + BRICK_GAP)
            y = WALL_TOP + row * (BRICK_HEIGHT + BRICK_GAP)
            bricks.append(Brick(pygame.Rect(x, y, BRICK_WIDTH, BRICK_HEIGHT), colour))
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
        pygame.draw.rect(screen, brick.colour, brick.rect)
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
                bricks.pop(hit)
                ball.velocity.y = -ball.velocity.y
                score += 10

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

```text
22 passed in 0.18s
```

**Understand: "just enough".** `hit` always returns 0. That's obviously not the finished rule: a brick that breaks should score points. But no test says so *yet*, and the rule in TDD is to write only the code a failing test demands. It feels strange, and it's deliberate: every line of the finished code will exist because a test needed it, so every line is tested. The next test will force the points in.

`hits_left: int = 1` gives the field a **default**, so every existing `Brick(rect, colour)` call still works and means "a brick that breaks in one hit". Fields with defaults must come after fields without them, because, as with function parameters, Python fills them in order.

**Commit at every green.** The tests pass, so this is a safe point to come back to:

```powershell
git add .
git commit -m "A brick can take more than one hit"
```

Small, frequent commits mean that if the next step goes badly, `git restore .` brings back a working state that's minutes old, not hours.

```check
run ".venv/Scripts/python -m pytest -q" stdout="39 passed"
git-message "more than one hit" -- Commit at this green: git add . then git commit -m "A brick can take more than one hit".
git-clean
```

## Red: what breaking is worth

**Build:** two more tests, for the points.

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
    assert bricks[0] == breakout.Brick(pygame.Rect(16, 60, 70, 20), breakout.ROW_COLOURS[0])
    assert bricks[-1] == breakout.Brick(pygame.Rect(548, 164, 70, 20), breakout.ROW_COLOURS[4])


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
```

```text
E       assert 0 == 10
E        +  where 0 = hit()
E        +    where hit = Brick(rect=Rect(0, 0, 70, 20), colour=(34, 197, 94), hits_left=0).hit
E       TypeError: Brick.__init__() got an unexpected keyword argument 'points'
2 failed, 22 passed in 0.33s
```

**Understand.** Two failures, each for the right reason. An ordinary brick's `hit()` returns 0 where 10 is expected, and pytest shows the whole `Brick` it was called on, thanks to the dataclass's `__repr__`: `hits_left=0`, so it did break, it just scored nothing. And `points` doesn't exist yet. Red.

```check
run ".venv/Scripts/python -m pytest -q tests/test_breakout.py" exit=1 stdout="2 failed" label="the two new tests fail (red)"
```

## Green: points

**Build:** a `points` field, scored when a brick breaks.

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

    def hit(self) -> int:
        self.hits_left -= 1
        if self.hits_left == 0:
            return self.points
        return 0


def make_bricks() -> list[Brick]:
    bricks = []
    for row, colour in enumerate(ROW_COLOURS):
        for col in range(8):
            x = WALL_LEFT + col * (BRICK_WIDTH + BRICK_GAP)
            y = WALL_TOP + row * (BRICK_HEIGHT + BRICK_GAP)
            bricks.append(Brick(pygame.Rect(x, y, BRICK_WIDTH, BRICK_HEIGHT), colour))
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
        pygame.draw.rect(screen, brick.colour, brick.rect)
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
                bricks.pop(hit)
                ball.velocity.y = -ball.velocity.y
                score += 10

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

```text
24 passed in 0.18s
```

**Understand.** `hit` now returns the brick's points on the hit that breaks it, and 0 on any earlier hit. `points: int = 10` keeps every ordinary brick at 10. Nothing in the game uses `hit` yet: the rules exist and are tested on their own, before they're connected to anything. Commit at this green.

```powershell
git add .
git commit -m "A brick scores its points when it breaks"
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="41 passed"
git-message "scores its points"
git-clean
```

## Red: the wall has a tough row

**Build:** a test that the wall's top row is tough.

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
```

**Understand.** `test_the_top_row_is_tough` checks the first brick completely, then uses `all(...)` for the rest: `all` takes a sequence of true/false values and is true only if every one is. `brick.hits_left == 2 for brick in bricks[:8]` is a **generator expression**: like a list comprehension without the square brackets, producing the values one at a time for `all` to check. `bricks[:8]` is the first eight bricks (the top row, since `make_bricks` builds row by row), and `bricks[8:]` all the others.

```check
run ".venv/Scripts/python -m pytest -q -k top_row_is_tough" exit=1 stdout="1 failed" label="the new test fails (red)"
```

## Green: tough bricks in the game

**Build:** `make_bricks` makes the top row tough, and the game uses `hit`.

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

    def hit(self) -> int:
        self.hits_left -= 1
        if self.hits_left == 0:
            return self.points
        return 0


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
        pygame.draw.rect(screen, brick.colour, brick.rect)
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

**Understand.** In the loop, a hit no longer removes the brick unconditionally: `score += bricks[hit].hit()` adds whatever the hit scored (0 for a crack), and the brick is removed only once `hits_left` reaches 0. The ball bounces either way.

Now the unit tests pass, and one characterisation test fails:

```text
FAILED tests/test_characterisation.py::test_autopilot_wins
```

The game's behaviour changed, on purpose: the top row needs two hits now, and is worth more. Run the command it checks and look:

```powershell
.venv\Scripts\python breakout.py --test-run 10000 --hold auto
```

```text
frames=10000 paddle_x=371 score=560 lives=3 bricks=0 inside=True
```

560: 8 tough bricks × 30, plus 32 ordinary bricks × 10. That's the right maximum for the new rules, so the next step updates the recording. The other eight characterisation tests still pass: none of them run long enough for the ball to reach the top row, which is worth noticing, because it means only one test covers the whole wall.

```check
run ".venv/Scripts/python -m pytest -q tests/test_breakout.py" stdout="25 passed" label="every unit test passes"
run ".venv/Scripts/python breakout.py --test-run 10000 --hold auto" stdout="score=560" label="clearing the whole wall now scores 560"
```

## Re-record the win

**Build:** the one characterisation test whose behaviour changed, re-recorded.

In `tests/test_characterisation.py`, change `test_autopilot_wins`'s recorded line to what the game now prints:

```python
def test_autopilot_wins():
    assert last_line("--test-run", "10000", "--hold", "auto") == "frames=10000 paddle_x=371 score=560 lives=3 bricks=0 inside=True"
```

Then commit:

```powershell
git add .
git commit -m "Make the top row tough: two hits, 30 points"
```

```check
contains tests/test_characterisation.py "score=560" -- Update test_autopilot_wins to the line the game now prints.
run ".venv/Scripts/python -m pytest -q" stdout="42 passed"
git-message "tough"
git-clean
```

## Your turn: cracked bricks look cracked

**Build, on your own, test first:** the story's last acceptance check: *a top-row brick is drawn darker once it's cracked.*

| Rule | Example |
|---|---|
| A brick that hasn't been hit is drawn in its own colour | an untouched tough red brick: `(239, 68, 68)` |
| A brick that has been hit, but not broken, is drawn darker: each of its three colour numbers × 0.6, rounded **down** | a cracked tough red brick: `(143, 40, 40)` |

Work in the cycle:

1. **Red:** write two tests, named `test_an_untouched_brick_keeps_its_colour` and `test_a_cracked_brick_is_drawn_darker`, calling a method `current_colour()` that doesn't exist yet. Run them; see them fail, for the right reason.
2. **Green:** add `current_colour()` to `Brick`, and whatever it needs to know. Run until both pass. **Commit.**
3. **Refactor:** make `draw` use `brick.current_colour()`. Run every test, then play the game and hit a red brick once. **Commit**, with a message that mentions **cracked**.

`int(x)` rounds a positive float down to a whole number: `int(143.4)` is 143.

Try it for about 20 minutes before taking a hint.

```hints
nudge: What does a brick need to *know* to answer "what colour am I now?" It knows its colour and `hits_left`, but `hits_left == 1` could be a cracked tough brick or an untouched ordinary one. What's missing?
concept: The brick needs to remember whether it has been hit. A new field with a default, `cracked: bool = False`, set to `True` in `hit()`, does it. `current_colour` returns `self.colour` when not cracked, and otherwise the darker colour. A tuple of three numbers can be **unpacked** into three names, `r, g, b = self.colour`, scaled, and packed back: `return int(r * 0.6), int(g * 0.6), int(b * 0.6)`.
shape: Tests first: make a tough brick with `hits_left=2, points=30`; for the first test, assert `current_colour()` is its colour; for the second, call `hit()` once first, then assert `(143, 40, 40)`. Then the field and the method in `Brick`, then `brick.current_colour()` in `draw` in place of `brick.colour`.
answer: The tests:

~~~python
def test_an_untouched_brick_keeps_its_colour():
    brick = breakout.Brick(pygame.Rect(0, 0, 70, 20), (239, 68, 68), hits_left=2, points=30)
    assert brick.current_colour() == (239, 68, 68)


def test_a_cracked_brick_is_drawn_darker():
    brick = breakout.Brick(pygame.Rect(0, 0, 70, 20), (239, 68, 68), hits_left=2, points=30)
    brick.hit()
    assert brick.current_colour() == (143, 40, 40)
~~~

and `Brick`:

~~~python
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
~~~

239 × 0.6 = 143.4 → 143, and 68 × 0.6 = 40.8 → 40. The first test passes even before `cracked` exists, if `current_colour` just returns `self.colour`; only the second forces the real rule, which is why a behaviour needs more than one example. The next lesson's first step shows the whole file.
```

```check
run ".venv/Scripts/python -m pytest -q -k untouched_brick" stdout="1 passed" label="an untouched brick keeps its colour"
run ".venv/Scripts/python -m pytest -q -k cracked_brick" stdout="1 passed" label="a cracked brick is drawn darker" -- Each colour number times 0.6, rounded down with int().
contains breakout.py "brick.current_colour()" -- draw should use current_colour, or nobody will see the crack.
run ".venv/Scripts/python -m pytest -q" stdout="44 passed"
run ".venv/Scripts/python -m pyright breakout.py tests/test_breakout.py" stdout="0 errors"
git-message "cracked"
git-clean
```

## When not to test first

TDD fits code with **clear rules you can state before writing it**: how many hits, how many points, what colour. It fits badly when you don't yet know what you want, and only find out by trying: how a bounce should *feel*, which colour looks right, whether a shake on impact is fun. For those, write a quick experiment, called a **spike**, play with it until you know what you want, then throw it away, or keep it and pull the rules out of it into functions with tests, as Chapter 2 did with the whole game. The tough-brick colour factor, 0.6, was chosen by looking at it; the rule "cracked means × 0.6" is tested.

## What did we actually learn?

- **TDD**: red (a failing test for the next small behaviour), green (the simplest code that passes), refactor (improve with tests green). Repeat.
- **Fail first, for the right reason**: a test you haven't seen fail might not test anything; one that fails for the wrong reason needs fixing first.
- **Tests design interfaces**: writing the call before the code tends to give simpler, more usable functions and methods.
- **Commit at every green**: small steps you can always return to.
- **Defaults on fields** add behaviour without breaking existing callers.
- **One example rarely pins a rule**: the untouched-colour test passes for the wrong implementation; the cracked one doesn't.
- **Spike, then test** for things you can only decide by trying.

TDD is the same in every language: xUnit or JUnit test first, red, green, refactor. The cycle was popularised by Kent Beck's book *Test-Driven Development: By Example*, whose examples are in Java.
