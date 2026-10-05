---
title: 3.2 — Dataclasses and Vectors
runtime: python
run: breakout.py
---

Lesson 3.1's classes work, but writing them was repetitive: `__init__` assigns every parameter to an attribute of the same name, and comparing two balls needed a helper because `==` meant "same object". This lesson lets Python generate that code, replaces pairs of numbers with **vectors**, gives each brick its own colour, and turns `parse_args`'s four-value tuple into something with names.

## The whole files so far

**Build:** make sure both files match the end of lesson 3.1. These are the reference answers to its Your turn.

```python file=breakout.py
import math
import os
import random
import sys

import pygame

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


def parse_args(args: list[str]) -> tuple[int | None, str, int | None, int | None]:
    # A test run lets another program play the game, with no window:
    #   python breakout.py --test-run FRAMES [--hold left|right|none|auto] [--lag-at FRAME] [--seed N]
    test_frames = number_after(args, "--test-run")
    lag_at = number_after(args, "--lag-at")
    seed = number_after(args, "--seed")
    hold = "none"
    if "--hold" in args:
        i = args.index("--hold")
        if i + 1 >= len(args) or args[i + 1] not in HOLDS:
            print(USAGE)
            sys.exit(2)
        hold = args[i + 1]
    return test_frames, hold, lag_at, seed


class Ball:
    def __init__(self, x: float, y: float, vx: float, vy: float) -> None:
        self.x = x
        self.y = y
        self.vx = vx
        self.vy = vy

    def move(self, dt: float) -> None:
        self.x += self.vx * dt
        self.y += self.vy * dt

    def bounce_off_walls(self) -> None:
        if self.x < BALL_RADIUS:
            self.x, self.vx = BALL_RADIUS, abs(self.vx)
        if self.x > WIDTH - BALL_RADIUS:
            self.x, self.vx = WIDTH - BALL_RADIUS, -abs(self.vx)
        if self.y < BALL_RADIUS:
            self.y, self.vy = BALL_RADIUS, abs(self.vy)

    def rect(self) -> pygame.Rect:
        r = pygame.Rect(0, 0, BALL_RADIUS * 2, BALL_RADIUS * 2)
        r.center = (round(self.x), round(self.y))
        return r


def serve(rng: random.Random) -> Ball:
    across = rng.uniform(-0.6, 0.6)
    up = math.sqrt(1 - across * across)
    return Ball(WIDTH / 2, HEIGHT / 2, BALL_SPEED * across, -BALL_SPEED * up)


class Paddle:
    def __init__(self) -> None:
        self.x = float(WIDTH // 2 - PADDLE_WIDTH // 2)

    def move(self, direction: int, dt: float) -> None:
        self.x = clamp(self.x + direction * PADDLE_SPEED * dt, 0, WIDTH - PADDLE_WIDTH)

    def rect(self) -> pygame.Rect:
        return pygame.Rect(round(self.x), HEIGHT - 30 - PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT)


def autopilot(ball: Ball, paddle: Paddle) -> int:
    middle = paddle.x + PADDLE_WIDTH / 2
    if ball.x < middle - 10:
        return -1
    if ball.x > middle + 10:
        return 1
    return 0


def bounce_off_paddle(ball: Ball, paddle: pygame.Rect) -> None:
    rect = ball.rect()
    if rect.colliderect(paddle) and ball.vy > 0:
        offset = (rect.centerx - paddle.centerx) / (paddle.width / 2)
        ball.vx = BALL_SPEED * 0.8 * offset
        ball.vy = -ball.vy


def make_bricks() -> list[pygame.Rect]:
    bricks = []
    for row in range(len(ROW_COLOURS)):
        for col in range(8):
            x = WALL_LEFT + col * (BRICK_WIDTH + BRICK_GAP)
            y = WALL_TOP + row * (BRICK_HEIGHT + BRICK_GAP)
            bricks.append(pygame.Rect(x, y, BRICK_WIDTH, BRICK_HEIGHT))
    return bricks


def brick_colour(brick: pygame.Rect) -> tuple[int, int, int]:
    row = (brick.y - WALL_TOP) // (BRICK_HEIGHT + BRICK_GAP)
    return ROW_COLOURS[row]


def hit_brick(ball: pygame.Rect, bricks: list[pygame.Rect]) -> int | None:
    i = ball.collidelist(bricks)
    if i == -1:
        return None
    return i


def draw(screen: pygame.Surface, font: pygame.font.Font, paddle: pygame.Rect, ball: Ball,
         bricks: list[pygame.Rect], score: int, lives: int) -> None:
    screen.fill(BACKGROUND)
    for brick in bricks:
        pygame.draw.rect(screen, brick_colour(brick), brick)
    pygame.draw.rect(screen, PADDLE_COLOUR, paddle)
    pygame.draw.ellipse(screen, BALL_COLOUR, ball.rect())
    screen.blit(font.render(f"Score {score}   Lives {lives}", True, TEXT_COLOUR), (16, 16))
    if lives == 0:
        screen.blit(font.render("Game over", True, TEXT_COLOUR), (260, 240))
    elif not bricks:
        screen.blit(font.render("You win!", True, TEXT_COLOUR), (270, 240))


def main(args: list[str]) -> None:
    test_frames, hold, lag_at, seed = parse_args(args)
    if test_frames is not None:
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
        if test_frames is None:
            dt = clock.tick(60) / 1000
        elif frames == lag_at:
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
            if test_frames is None:
                keys = pygame.key.get_pressed()
                if keys[pygame.K_LEFT]:
                    direction -= 1
                if keys[pygame.K_RIGHT]:
                    direction += 1
            elif hold == "left":
                direction = -1
            elif hold == "right":
                direction = 1
            elif hold == "auto":
                direction = autopilot(ball, paddle)
            paddle.move(direction, dt)

            ball.move(dt)
            ball.bounce_off_walls()
            bounce_off_paddle(ball, paddle.rect())

            hit = hit_brick(ball.rect(), bricks)
            if hit is not None:
                bricks.pop(hit)
                ball.vy = -ball.vy
                score += 10

            if ball.rect().top > HEIGHT:
                lives -= 1
                if lives > 0:
                    ball = serve(rng)

        draw(screen, font, paddle.rect(), ball, bricks, score, lives)
        pygame.display.flip()

        frames += 1
        if test_frames is not None and frames >= test_frames:
            running = False

    pygame.quit()
    if test_frames is not None:
        inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(ball.rect())
        print(f"frames={frames} paddle_x={paddle.rect().x} score={score} lives={lives} bricks={len(bricks)} inside={inside}")


if __name__ == "__main__":
    main(sys.argv[1:])
```

```check
contains breakout.py "class Paddle:"
run ".venv/Scripts/python -m pyright breakout.py" stdout="0 errors"
```

## The whole test file so far

**Build:** the tests, as lesson 3.1 left them.

```python file=tests/test_breakout.py
import math
import random

import pygame

import breakout


def state(ball: breakout.Ball) -> tuple[float, float, float, float]:
    return (ball.x, ball.y, ball.vx, ball.vy)


def test_clamp_leaves_a_value_in_range_alone():
    assert breakout.clamp(2, 0, 3) == 2


def test_clamp_raises_a_value_below_the_range():
    assert breakout.clamp(-5, 0, 3) == 0


def test_clamp_lowers_a_value_above_the_range():
    assert breakout.clamp(9, 0, 3) == 3


def test_the_same_seed_serves_the_same_ball():
    assert state(breakout.serve(random.Random(1))) == state(breakout.serve(random.Random(1)))


def test_every_serve_starts_in_the_middle_going_up_at_full_speed():
    for seed in range(100):
        ball = breakout.serve(random.Random(seed))
        assert (ball.x, ball.y) == (320, 240)
        assert ball.vy < 0
        assert abs(ball.vx) <= 0.6 * breakout.BALL_SPEED
        assert math.isclose(math.hypot(ball.vx, ball.vy), breakout.BALL_SPEED)


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
    assert breakout.autopilot(breakout.Ball(100, 240, 0, 0), paddle) == -1
    assert breakout.autopilot(breakout.Ball(320, 240, 0, 0), paddle) == 0
    assert breakout.autopilot(breakout.Ball(500, 240, 0, 0), paddle) == 1


def test_a_ball_moves_by_its_velocity_times_dt():
    ball = breakout.Ball(100, 100, 180, -240)
    ball.move(0.5)
    assert state(ball) == (190, -20, 180, -240)


def test_a_ball_in_the_middle_of_the_screen_is_left_alone():
    ball = breakout.Ball(100, 100, 180, -240)
    ball.bounce_off_walls()
    assert state(ball) == (100, 100, 180, -240)


def test_the_left_wall_sends_the_ball_right():
    ball = breakout.Ball(3, 100, -180, -240)
    ball.bounce_off_walls()
    assert state(ball) == (6, 100, 180, -240)


def test_the_right_wall_sends_the_ball_left():
    ball = breakout.Ball(638, 100, 180, -240)
    ball.bounce_off_walls()
    assert state(ball) == (634, 100, -180, -240)


def test_the_top_wall_sends_the_ball_down():
    ball = breakout.Ball(100, 2, 180, -240)
    ball.bounce_off_walls()
    assert state(ball) == (100, 6, 180, 240)


def test_a_ball_far_past_the_top_is_put_back_and_keeps_moving_down():
    # Lesson 1.4's bug: after one slow frame the ball was 40 pixels past the top, and the
    # wall flipped its direction every frame, so it never came back.
    ball = breakout.Ball(100, -40, 180, 240)
    ball.bounce_off_walls()
    assert state(ball) == (100, 6, 180, 240)


def test_a_ball_knows_its_rectangle():
    assert breakout.Ball(320, 438, 0, 0).rect() == pygame.Rect(314, 432, 12, 12)


def test_the_paddle_bounces_a_ball_coming_down_straight_up_from_its_middle():
    ball = breakout.Ball(320, 438, 180, 240)
    breakout.bounce_off_paddle(ball, pygame.Rect(270, 436, 100, 14))
    assert (ball.vx, ball.vy) == (0, -240)


def test_the_paddle_steers_a_ball_hitting_its_right_end():
    ball = breakout.Ball(370, 438, 180, 240)
    breakout.bounce_off_paddle(ball, pygame.Rect(270, 436, 100, 14))
    assert (ball.vx, ball.vy) == (240, -240)


def test_the_paddle_ignores_a_ball_moving_up():
    ball = breakout.Ball(320, 438, 180, -240)
    breakout.bounce_off_paddle(ball, pygame.Rect(270, 436, 100, 14))
    assert (ball.vx, ball.vy) == (180, -240)


def test_the_wall_has_forty_bricks_from_the_top_left():
    bricks = breakout.make_bricks()
    assert len(bricks) == 40
    assert bricks[0] == pygame.Rect(16, 60, 70, 20)
    assert bricks[-1] == pygame.Rect(548, 164, 70, 20)


def test_each_row_of_bricks_has_its_own_colour():
    bricks = breakout.make_bricks()
    assert breakout.brick_colour(bricks[0]) == breakout.ROW_COLOURS[0]
    assert breakout.brick_colour(bricks[-1]) == breakout.ROW_COLOURS[4]
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="39 passed"
```

## Let Python write the boring parts

**Build:** `Ball` as a **dataclass**.

```python file=breakout.py
import math
import os
import random
import sys
from dataclasses import dataclass

import pygame

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


def parse_args(args: list[str]) -> tuple[int | None, str, int | None, int | None]:
    # A test run lets another program play the game, with no window:
    #   python breakout.py --test-run FRAMES [--hold left|right|none|auto] [--lag-at FRAME] [--seed N]
    test_frames = number_after(args, "--test-run")
    lag_at = number_after(args, "--lag-at")
    seed = number_after(args, "--seed")
    hold = "none"
    if "--hold" in args:
        i = args.index("--hold")
        if i + 1 >= len(args) or args[i + 1] not in HOLDS:
            print(USAGE)
            sys.exit(2)
        hold = args[i + 1]
    return test_frames, hold, lag_at, seed


@dataclass
class Ball:
    x: float
    y: float
    vx: float
    vy: float

    def move(self, dt: float) -> None:
        self.x += self.vx * dt
        self.y += self.vy * dt

    def bounce_off_walls(self) -> None:
        if self.x < BALL_RADIUS:
            self.x, self.vx = BALL_RADIUS, abs(self.vx)
        if self.x > WIDTH - BALL_RADIUS:
            self.x, self.vx = WIDTH - BALL_RADIUS, -abs(self.vx)
        if self.y < BALL_RADIUS:
            self.y, self.vy = BALL_RADIUS, abs(self.vy)

    def rect(self) -> pygame.Rect:
        r = pygame.Rect(0, 0, BALL_RADIUS * 2, BALL_RADIUS * 2)
        r.center = (round(self.x), round(self.y))
        return r


def serve(rng: random.Random) -> Ball:
    across = rng.uniform(-0.6, 0.6)
    up = math.sqrt(1 - across * across)
    return Ball(WIDTH / 2, HEIGHT / 2, BALL_SPEED * across, -BALL_SPEED * up)


class Paddle:
    def __init__(self) -> None:
        self.x = float(WIDTH // 2 - PADDLE_WIDTH // 2)

    def move(self, direction: int, dt: float) -> None:
        self.x = clamp(self.x + direction * PADDLE_SPEED * dt, 0, WIDTH - PADDLE_WIDTH)

    def rect(self) -> pygame.Rect:
        return pygame.Rect(round(self.x), HEIGHT - 30 - PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT)


def autopilot(ball: Ball, paddle: Paddle) -> int:
    middle = paddle.x + PADDLE_WIDTH / 2
    if ball.x < middle - 10:
        return -1
    if ball.x > middle + 10:
        return 1
    return 0


def bounce_off_paddle(ball: Ball, paddle: pygame.Rect) -> None:
    rect = ball.rect()
    if rect.colliderect(paddle) and ball.vy > 0:
        offset = (rect.centerx - paddle.centerx) / (paddle.width / 2)
        ball.vx = BALL_SPEED * 0.8 * offset
        ball.vy = -ball.vy


def make_bricks() -> list[pygame.Rect]:
    bricks = []
    for row in range(len(ROW_COLOURS)):
        for col in range(8):
            x = WALL_LEFT + col * (BRICK_WIDTH + BRICK_GAP)
            y = WALL_TOP + row * (BRICK_HEIGHT + BRICK_GAP)
            bricks.append(pygame.Rect(x, y, BRICK_WIDTH, BRICK_HEIGHT))
    return bricks


def brick_colour(brick: pygame.Rect) -> tuple[int, int, int]:
    row = (brick.y - WALL_TOP) // (BRICK_HEIGHT + BRICK_GAP)
    return ROW_COLOURS[row]


def hit_brick(ball: pygame.Rect, bricks: list[pygame.Rect]) -> int | None:
    i = ball.collidelist(bricks)
    if i == -1:
        return None
    return i


def draw(screen: pygame.Surface, font: pygame.font.Font, paddle: pygame.Rect, ball: Ball,
         bricks: list[pygame.Rect], score: int, lives: int) -> None:
    screen.fill(BACKGROUND)
    for brick in bricks:
        pygame.draw.rect(screen, brick_colour(brick), brick)
    pygame.draw.rect(screen, PADDLE_COLOUR, paddle)
    pygame.draw.ellipse(screen, BALL_COLOUR, ball.rect())
    screen.blit(font.render(f"Score {score}   Lives {lives}", True, TEXT_COLOUR), (16, 16))
    if lives == 0:
        screen.blit(font.render("Game over", True, TEXT_COLOUR), (260, 240))
    elif not bricks:
        screen.blit(font.render("You win!", True, TEXT_COLOUR), (270, 240))


def main(args: list[str]) -> None:
    test_frames, hold, lag_at, seed = parse_args(args)
    if test_frames is not None:
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
        if test_frames is None:
            dt = clock.tick(60) / 1000
        elif frames == lag_at:
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
            if test_frames is None:
                keys = pygame.key.get_pressed()
                if keys[pygame.K_LEFT]:
                    direction -= 1
                if keys[pygame.K_RIGHT]:
                    direction += 1
            elif hold == "left":
                direction = -1
            elif hold == "right":
                direction = 1
            elif hold == "auto":
                direction = autopilot(ball, paddle)
            paddle.move(direction, dt)

            ball.move(dt)
            ball.bounce_off_walls()
            bounce_off_paddle(ball, paddle.rect())

            hit = hit_brick(ball.rect(), bricks)
            if hit is not None:
                bricks.pop(hit)
                ball.vy = -ball.vy
                score += 10

            if ball.rect().top > HEIGHT:
                lives -= 1
                if lives > 0:
                    ball = serve(rng)

        draw(screen, font, paddle.rect(), ball, bricks, score, lives)
        pygame.display.flip()

        frames += 1
        if test_frames is not None and frames >= test_frames:
            running = False

    pygame.quit()
    if test_frames is not None:
        inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(ball.rect())
        print(f"frames={frames} paddle_x={paddle.rect().x} score={score} lives={lives} bricks={len(bricks)} inside={inside}")


if __name__ == "__main__":
    main(sys.argv[1:])
```

**Understand: what `@dataclass` does.** The class body now only *lists* the attributes, each with a type hint: `x: float`. These are **annotations in the class body**: no `self.`, no value. On their own they create nothing. Without `@dataclass`, `Ball(1, 2, 3, 4)` would fail, because there would be no `__init__` taking four values; it's `self.x = ...` inside a method that puts an attribute on an object. `from dataclasses import dataclass` imports one name, `dataclass`, from the standard library's `dataclasses` module, so the code says `dataclass` rather than `dataclasses.dataclass`.

The line `@dataclass` above the class is a **decorator**: a function that receives the class just after it's created, and returns it changed. Writing `@dataclass` above `class Ball:` means exactly the same as writing `Ball = dataclass(Ball)` straight after the class: the class is passed to the function, and the name `Ball` is bound to whatever it returns. `dataclass` reads the list of annotated attributes, called **fields**, and writes three methods for you:

- `__init__(self, x: float, y: float, vx: float, vy: float)`, assigning each field: exactly the one you wrote by hand in lesson 3.1.
- `__repr__`, which says how the object is shown when printed: `Ball(x=320.0, y=240.0, vx=180.0, vy=-240.0)` instead of `<breakout.Ball object at 0x00000129AECDCAD0>`. pytest uses it in failure reports, so a failing test now shows the ball's values.
- `__eq__`, which `==` calls: two `Ball`s are equal when all their fields are equal, compared in order.

Dunder methods like these are how classes plug into Python's own syntax: `==` calls `__eq__`, `print` and the interactive prompt call `__repr__`, and calling the class calls `__init__`. Defining one changes what the syntax does for your objects.

The methods you wrote, `move`, `bounce_off_walls` and `rect`, are untouched: a dataclass is an ordinary class with some methods written for it. `Paddle` stays a plain class: its `__init__` takes nothing and works out its own starting position, so it isn't a list of values given from outside, which is what a dataclass describes.

```predict
question: In lesson 3.1, two `Ball`s made with the same four numbers weren't `==`. What does `Ball(1, 2, 3, 4) == Ball(1, 2, 3, 4)` give now?
choice: True
choice: False
answer: True
explain: `@dataclass` wrote an `__eq__` that compares the fields in order, so two balls holding the same values are equal, even though they're still two separate objects (`is` would still say `False`). That's what lets a test compare a whole ball with one `==`, as the next step does.
verify: .venv/Scripts/python -c "import breakout; print(breakout.Ball(1, 2, 3, 4) == breakout.Ball(1, 2, 3, 4))"
```

> **Dataclass**: a class whose main job is to hold data, declared by listing its fields with types; `@dataclass` generates the initialiser, the printed form and value equality.

The old tests still pass, unchanged: their `state` helper still works. But it's no longer needed.

```check
contains breakout.py "@dataclass"
run ".venv/Scripts/python -m pytest -q" stdout="39 passed" label="every test still passes"
run ".venv/Scripts/python -m pyright breakout.py" stdout="0 errors"
```

## Tests that compare whole objects

**Build:** drop the `state` helper, and compare balls directly.

```python file=tests/test_breakout.py
import math
import random

import pygame

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
        assert (ball.x, ball.y) == (320, 240)
        assert ball.vy < 0
        assert abs(ball.vx) <= 0.6 * breakout.BALL_SPEED
        assert math.isclose(math.hypot(ball.vx, ball.vy), breakout.BALL_SPEED)


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
    assert breakout.autopilot(breakout.Ball(100, 240, 0, 0), paddle) == -1
    assert breakout.autopilot(breakout.Ball(320, 240, 0, 0), paddle) == 0
    assert breakout.autopilot(breakout.Ball(500, 240, 0, 0), paddle) == 1


def test_a_ball_moves_by_its_velocity_times_dt():
    ball = breakout.Ball(100, 100, 180, -240)
    ball.move(0.5)
    assert ball == breakout.Ball(190, -20, 180, -240)


def test_a_ball_in_the_middle_of_the_screen_is_left_alone():
    ball = breakout.Ball(100, 100, 180, -240)
    ball.bounce_off_walls()
    assert ball == breakout.Ball(100, 100, 180, -240)


def test_the_left_wall_sends_the_ball_right():
    ball = breakout.Ball(3, 100, -180, -240)
    ball.bounce_off_walls()
    assert ball == breakout.Ball(6, 100, 180, -240)


def test_the_right_wall_sends_the_ball_left():
    ball = breakout.Ball(638, 100, 180, -240)
    ball.bounce_off_walls()
    assert ball == breakout.Ball(634, 100, -180, -240)


def test_the_top_wall_sends_the_ball_down():
    ball = breakout.Ball(100, 2, 180, -240)
    ball.bounce_off_walls()
    assert ball == breakout.Ball(100, 6, 180, 240)


def test_a_ball_far_past_the_top_is_put_back_and_keeps_moving_down():
    # Lesson 1.4's bug: after one slow frame the ball was 40 pixels past the top, and the
    # wall flipped its direction every frame, so it never came back.
    ball = breakout.Ball(100, -40, 180, 240)
    ball.bounce_off_walls()
    assert ball == breakout.Ball(100, 6, 180, 240)


def test_a_ball_knows_its_rectangle():
    assert breakout.Ball(320, 438, 0, 0).rect() == pygame.Rect(314, 432, 12, 12)


def test_the_paddle_bounces_a_ball_coming_down_straight_up_from_its_middle():
    ball = breakout.Ball(320, 438, 180, 240)
    breakout.bounce_off_paddle(ball, pygame.Rect(270, 436, 100, 14))
    assert (ball.vx, ball.vy) == (0, -240)


def test_the_paddle_steers_a_ball_hitting_its_right_end():
    ball = breakout.Ball(370, 438, 180, 240)
    breakout.bounce_off_paddle(ball, pygame.Rect(270, 436, 100, 14))
    assert (ball.vx, ball.vy) == (240, -240)


def test_the_paddle_ignores_a_ball_moving_up():
    ball = breakout.Ball(320, 438, 180, -240)
    breakout.bounce_off_paddle(ball, pygame.Rect(270, 436, 100, 14))
    assert (ball.vx, ball.vy) == (180, -240)


def test_the_wall_has_forty_bricks_from_the_top_left():
    bricks = breakout.make_bricks()
    assert len(bricks) == 40
    assert bricks[0] == pygame.Rect(16, 60, 70, 20)
    assert bricks[-1] == pygame.Rect(548, 164, 70, 20)


def test_each_row_of_bricks_has_its_own_colour():
    bricks = breakout.make_bricks()
    assert breakout.brick_colour(bricks[0]) == breakout.ROW_COLOURS[0]
    assert breakout.brick_colour(bricks[-1]) == breakout.ROW_COLOURS[4]
```

**Understand.** `assert ball == breakout.Ball(6, 100, 180, -240)` reads as what it means: the ball should now be *this* ball. If it fails, pytest prints both with their field names, `Ball(x=3, y=100, vx=-180, vy=-240) == Ball(x=6, …)`, and points at the fields that differ.

```check
lacks tests/test_breakout.py "def state(" -- Compare Ball objects with == now that Ball is a dataclass.
run ".venv/Scripts/python -m pytest -q" stdout="39 passed"
```

## A ball made of vectors

**Build:** the ball's position and velocity as `Vector2`s, pygame's two-dimensional vectors.

**Understand first: a vector.** A position `(x, y)` and a velocity `(vx, vy)` are each a pair of numbers that always travel together and obey the same arithmetic: add two of them component by component, multiply one by a number to scale it.

> **Vector**: a quantity with several components, written `(x, y)` in two dimensions, that you add and scale as a single value. Velocity is a vector: its direction is where it points, and its **length** is the speed.

`pygame.Vector2` implements exactly that. Try it before using it:

```powershell
.venv\Scripts\python -c "from pygame import Vector2; v = Vector2(180, -240); print(v + Vector2(1, 1)); print(v * 0.5); print(v.length())"
```

```text
[181, -239]
[90, -120]
300.0
```

Adding adds each component; multiplying by a number scales each one; `.length()` is lesson 1.4's Pythagoras, √(180² + 240²) = 300. `from pygame import Vector2` makes the name `Vector2` available directly, so the code can say `Vector2(...)` rather than `pygame.Vector2(...)`.

Now change the `Ball` class itself: two fields instead of four, and its methods written with them. Change the class only; the rest of the file comes next.

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


def parse_args(args: list[str]) -> tuple[int | None, str, int | None, int | None]:
    # A test run lets another program play the game, with no window:
    #   python breakout.py --test-run FRAMES [--hold left|right|none|auto] [--lag-at FRAME] [--seed N]
    test_frames = number_after(args, "--test-run")
    lag_at = number_after(args, "--lag-at")
    seed = number_after(args, "--seed")
    hold = "none"
    if "--hold" in args:
        i = args.index("--hold")
        if i + 1 >= len(args) or args[i + 1] not in HOLDS:
            print(USAGE)
            sys.exit(2)
        hold = args[i + 1]
    return test_frames, hold, lag_at, seed


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
    return Ball(WIDTH / 2, HEIGHT / 2, BALL_SPEED * across, -BALL_SPEED * up)


class Paddle:
    def __init__(self) -> None:
        self.x = float(WIDTH // 2 - PADDLE_WIDTH // 2)

    def move(self, direction: int, dt: float) -> None:
        self.x = clamp(self.x + direction * PADDLE_SPEED * dt, 0, WIDTH - PADDLE_WIDTH)

    def rect(self) -> pygame.Rect:
        return pygame.Rect(round(self.x), HEIGHT - 30 - PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT)


def autopilot(ball: Ball, paddle: Paddle) -> int:
    middle = paddle.x + PADDLE_WIDTH / 2
    if ball.x < middle - 10:
        return -1
    if ball.x > middle + 10:
        return 1
    return 0


def bounce_off_paddle(ball: Ball, paddle: pygame.Rect) -> None:
    rect = ball.rect()
    if rect.colliderect(paddle) and ball.vy > 0:
        offset = (rect.centerx - paddle.centerx) / (paddle.width / 2)
        ball.vx = BALL_SPEED * 0.8 * offset
        ball.vy = -ball.vy


def make_bricks() -> list[pygame.Rect]:
    bricks = []
    for row in range(len(ROW_COLOURS)):
        for col in range(8):
            x = WALL_LEFT + col * (BRICK_WIDTH + BRICK_GAP)
            y = WALL_TOP + row * (BRICK_HEIGHT + BRICK_GAP)
            bricks.append(pygame.Rect(x, y, BRICK_WIDTH, BRICK_HEIGHT))
    return bricks


def brick_colour(brick: pygame.Rect) -> tuple[int, int, int]:
    row = (brick.y - WALL_TOP) // (BRICK_HEIGHT + BRICK_GAP)
    return ROW_COLOURS[row]


def hit_brick(ball: pygame.Rect, bricks: list[pygame.Rect]) -> int | None:
    i = ball.collidelist(bricks)
    if i == -1:
        return None
    return i


def draw(screen: pygame.Surface, font: pygame.font.Font, paddle: pygame.Rect, ball: Ball,
         bricks: list[pygame.Rect], score: int, lives: int) -> None:
    screen.fill(BACKGROUND)
    for brick in bricks:
        pygame.draw.rect(screen, brick_colour(brick), brick)
    pygame.draw.rect(screen, PADDLE_COLOUR, paddle)
    pygame.draw.ellipse(screen, BALL_COLOUR, ball.rect())
    screen.blit(font.render(f"Score {score}   Lives {lives}", True, TEXT_COLOUR), (16, 16))
    if lives == 0:
        screen.blit(font.render("Game over", True, TEXT_COLOUR), (260, 240))
    elif not bricks:
        screen.blit(font.render("You win!", True, TEXT_COLOUR), (270, 240))


def main(args: list[str]) -> None:
    test_frames, hold, lag_at, seed = parse_args(args)
    if test_frames is not None:
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
        if test_frames is None:
            dt = clock.tick(60) / 1000
        elif frames == lag_at:
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
            if test_frames is None:
                keys = pygame.key.get_pressed()
                if keys[pygame.K_LEFT]:
                    direction -= 1
                if keys[pygame.K_RIGHT]:
                    direction += 1
            elif hold == "left":
                direction = -1
            elif hold == "right":
                direction = 1
            elif hold == "auto":
                direction = autopilot(ball, paddle)
            paddle.move(direction, dt)

            ball.move(dt)
            ball.bounce_off_walls()
            bounce_off_paddle(ball, paddle.rect())

            hit = hit_brick(ball.rect(), bricks)
            if hit is not None:
                bricks.pop(hit)
                ball.vy = -ball.vy
                score += 10

            if ball.rect().top > HEIGHT:
                lives -= 1
                if lives > 0:
                    ball = serve(rng)

        draw(screen, font, paddle.rect(), ball, bricks, score, lives)
        pygame.display.flip()

        frames += 1
        if test_frames is not None and frames >= test_frames:
            running = False

    pygame.quit()
    if test_frames is not None:
        inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(ball.rect())
        print(f"frames={frames} paddle_x={paddle.rect().x} score={score} lives={lives} bricks={len(bricks)} inside={inside}")


if __name__ == "__main__":
    main(sys.argv[1:])
```

**Understand.** `self.position += self.velocity * dt` is both of lesson 1.4's lines, `x += vx * dt` and `y += vy * dt`, in one: `velocity * dt` scales the velocity, and `+=` adds it to the position. `.x` and `.y` read or set one component, which is what the wall bounces need: each wall changes only one direction. They're written one assignment per line now, because each line changes a different object, the position or the velocity, and reads more clearly that way.

The rest of the game still says `ball.x` and `ball.vx`, which no longer exist, so the game can't run until the next step updates them. The class can be tried on its own:

```powershell
.venv\Scripts\python -c "import breakout; from pygame import Vector2; b = breakout.Ball(Vector2(100, 100), Vector2(180, -240)); b.move(0.5); print(b.position)"
```

```text
[190, -20]
```

```check
contains breakout.py "position: Vector2"
run ".venv/Scripts/python -c \"import breakout; from pygame import Vector2; b = breakout.Ball(Vector2(100, 100), Vector2(180, -240)); b.move(0.5); print(b.position)\"" stdout="[190, -20]" label="a Ball made of vectors moves by velocity times dt"
```

## The game uses the vectors

**Build:** every use of the ball's numbers outside the class changes to the vectors.

Four places: `serve` builds the vectors; `autopilot` reads `ball.position.x`; the paddle bounce sets a new velocity; and the brick bounce flips `velocity.y`:

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


def parse_args(args: list[str]) -> tuple[int | None, str, int | None, int | None]:
    # A test run lets another program play the game, with no window:
    #   python breakout.py --test-run FRAMES [--hold left|right|none|auto] [--lag-at FRAME] [--seed N]
    test_frames = number_after(args, "--test-run")
    lag_at = number_after(args, "--lag-at")
    seed = number_after(args, "--seed")
    hold = "none"
    if "--hold" in args:
        i = args.index("--hold")
        if i + 1 >= len(args) or args[i + 1] not in HOLDS:
            print(USAGE)
            sys.exit(2)
        hold = args[i + 1]
    return test_frames, hold, lag_at, seed


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


def make_bricks() -> list[pygame.Rect]:
    bricks = []
    for row in range(len(ROW_COLOURS)):
        for col in range(8):
            x = WALL_LEFT + col * (BRICK_WIDTH + BRICK_GAP)
            y = WALL_TOP + row * (BRICK_HEIGHT + BRICK_GAP)
            bricks.append(pygame.Rect(x, y, BRICK_WIDTH, BRICK_HEIGHT))
    return bricks


def brick_colour(brick: pygame.Rect) -> tuple[int, int, int]:
    row = (brick.y - WALL_TOP) // (BRICK_HEIGHT + BRICK_GAP)
    return ROW_COLOURS[row]


def hit_brick(ball: pygame.Rect, bricks: list[pygame.Rect]) -> int | None:
    i = ball.collidelist(bricks)
    if i == -1:
        return None
    return i


def draw(screen: pygame.Surface, font: pygame.font.Font, paddle: pygame.Rect, ball: Ball,
         bricks: list[pygame.Rect], score: int, lives: int) -> None:
    screen.fill(BACKGROUND)
    for brick in bricks:
        pygame.draw.rect(screen, brick_colour(brick), brick)
    pygame.draw.rect(screen, PADDLE_COLOUR, paddle)
    pygame.draw.ellipse(screen, BALL_COLOUR, ball.rect())
    screen.blit(font.render(f"Score {score}   Lives {lives}", True, TEXT_COLOUR), (16, 16))
    if lives == 0:
        screen.blit(font.render("Game over", True, TEXT_COLOUR), (260, 240))
    elif not bricks:
        screen.blit(font.render("You win!", True, TEXT_COLOUR), (270, 240))


def main(args: list[str]) -> None:
    test_frames, hold, lag_at, seed = parse_args(args)
    if test_frames is not None:
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
        if test_frames is None:
            dt = clock.tick(60) / 1000
        elif frames == lag_at:
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
            if test_frames is None:
                keys = pygame.key.get_pressed()
                if keys[pygame.K_LEFT]:
                    direction -= 1
                if keys[pygame.K_RIGHT]:
                    direction += 1
            elif hold == "left":
                direction = -1
            elif hold == "right":
                direction = 1
            elif hold == "auto":
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
        if test_frames is not None and frames >= test_frames:
            running = False

    pygame.quit()
    if test_frames is not None:
        inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(ball.rect())
        print(f"frames={frames} paddle_x={paddle.rect().x} score={score} lives={lives} bricks={len(bricks)} inside={inside}")


if __name__ == "__main__":
    main(sys.argv[1:])
```

**Understand: the serve.** `Vector2(across, -up)` is a direction of length 1, and `* BALL_SPEED` scales it to the right speed. Traced for the old fixed serve, `across = 0.6`:

```text
up = √(1 − 0.6²) = √0.64 = 0.8
Vector2(0.6, -0.8).length() = √(0.36 + 0.64) = √1 = 1
Vector2(0.6, -0.8) * 300    = Vector2(180, -240)        the velocity lesson 1.4 started with
```

**A trap, from lesson 3.1's aliasing.** A `Vector2` is a **mutable** object, and `+=` on it changes it **in place** rather than making a new one (for a float, `x += 1` makes a new number and rebinds `x`; a `Vector2` changes itself). Run:

```powershell
.venv\Scripts\python -c "import breakout; from pygame import Vector2; start = Vector2(320, 240); a = breakout.Ball(start, Vector2(180, -240)); c = breakout.Ball(start, Vector2(0, -300)); a.move(1); print(c.position)"
```

```predict
question: Ball `a` moved for one second. Ball `c` didn't move. What is `c.position`?
choice: [320, 240]: c didn't move
choice: [500, 0]: c moved with a
choice: An error
answer: [500, 0]: c moved with a
explain: Both balls were given the **same** `Vector2` object, `start`, as their position: two names (`a.position` and `c.position`) for one object. `a.move(1)` ran `self.position += self.velocity * dt`, which changed that one object in place, from (320, 240) by (180, −240) to (500, 0). So `c`'s position changed too. That's why `serve` makes a **new** `Vector2` every time it's called, and why every ball in the game has its own.
```

So when does a change in place matter? Only when something else holds the same vector. The ball's position and velocity are its own, made fresh by `serve`, so `+=` and the brick bounce's `velocity.y = -velocity.y` are safe. The paddle bounce makes a **new** `Vector2` instead, simply because it changes both components at once.

```check
contains breakout.py "position: Vector2"
run ".venv/Scripts/python -m pytest -q tests/test_characterisation.py" stdout="9 passed" label="the game behaves exactly as before"
run ".venv/Scripts/python -m pyright breakout.py" stdout="0 errors"
```

## Tests in vectors

**Build:** the unit tests, rewritten for vectors.

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
    assert bricks[0] == pygame.Rect(16, 60, 70, 20)
    assert bricks[-1] == pygame.Rect(548, 164, 70, 20)


def test_each_row_of_bricks_has_its_own_colour():
    bricks = breakout.make_bricks()
    assert breakout.brick_colour(bricks[0]) == breakout.ROW_COLOURS[0]
    assert breakout.brick_colour(bricks[-1]) == breakout.ROW_COLOURS[4]
```

**Understand.** `ball.velocity.length()` replaces `math.hypot(ball.vx, ball.vy)`, and two `Vector2`s compare equal when their components do, so `ball.velocity == Vector2(0, -240)` checks both components at once.

```check
run ".venv/Scripts/python -m pytest -q" stdout="39 passed"
run ".venv/Scripts/python -m pyright tests/test_breakout.py" stdout="0 errors"
```

## Bricks that know their colour

**Build:** a `Brick` dataclass holding its rectangle and its colour.

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


def parse_args(args: list[str]) -> tuple[int | None, str, int | None, int | None]:
    # A test run lets another program play the game, with no window:
    #   python breakout.py --test-run FRAMES [--hold left|right|none|auto] [--lag-at FRAME] [--seed N]
    test_frames = number_after(args, "--test-run")
    lag_at = number_after(args, "--lag-at")
    seed = number_after(args, "--seed")
    hold = "none"
    if "--hold" in args:
        i = args.index("--hold")
        if i + 1 >= len(args) or args[i + 1] not in HOLDS:
            print(USAGE)
            sys.exit(2)
        hold = args[i + 1]
    return test_frames, hold, lag_at, seed


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
    test_frames, hold, lag_at, seed = parse_args(args)
    if test_frames is not None:
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
        if test_frames is None:
            dt = clock.tick(60) / 1000
        elif frames == lag_at:
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
            if test_frames is None:
                keys = pygame.key.get_pressed()
                if keys[pygame.K_LEFT]:
                    direction -= 1
                if keys[pygame.K_RIGHT]:
                    direction += 1
            elif hold == "left":
                direction = -1
            elif hold == "right":
                direction = 1
            elif hold == "auto":
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
        if test_frames is not None and frames >= test_frames:
            running = False

    pygame.quit()
    if test_frames is not None:
        inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(ball.rect())
        print(f"frames={frames} paddle_x={paddle.rect().x} score={score} lives={lives} bricks={len(bricks)} inside={inside}")


if __name__ == "__main__":
    main(sys.argv[1:])
```

**Understand.** Lesson 1.6's crash came from working out a brick's colour backwards from its `y`. Lesson 2.2 made both use the same constants. Now nothing is worked out backwards at all: `make_bricks` gives each `Brick` its colour when it's made, and `draw` just uses `brick.colour`. `brick_colour` is gone, and so is the coupling.

`for row, colour in enumerate(ROW_COLOURS):` loops over the colours and **numbers** them: `enumerate` gives pairs `(0, red)`, `(1, orange)`, …, unpacked into `row` and `colour`.

`[brick.rect for brick in bricks]` in `hit_brick` is a **list comprehension**, like lesson 2.6's: a new list of each brick's `rect`, in the same order, because `collidelist` needs `Rect`s. The index it returns is the same in both lists. Notice `brick.rect` has no brackets while `ball.rect()` does: a brick never moves, so it **stores** its `Rect` as a field, while a ball **makes** one from its position each time, with a method. Brackets call a method; no brackets read an attribute.

```check
contains breakout.py "class Brick:"
lacks breakout.py "def brick_colour(" -- A Brick holds its colour; nothing needs to work it out from y.
run ".venv/Scripts/python -m pytest -q tests/test_characterisation.py" stdout="9 passed"
run ".venv/Scripts/python -m pyright breakout.py" stdout="0 errors"
```

## Tests for bricks

**Build:** the brick tests, comparing whole `Brick`s.

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
```

The two brick tests became one: a `Brick` compared with `==` checks its rectangle and its colour together.

```check
run ".venv/Scripts/python -m pytest -q" stdout="38 passed"
```

## Your turn: settings with names

**Build, on your own:** replace `parse_args`'s four-value tuple with a **frozen** dataclass, `Settings`.

`main` currently starts with `test_frames, hold, lag_at, seed = parse_args(args)`: four values whose meaning depends entirely on their order. Make `parse_args` return a `Settings` instead:

| Field | Type | Default |
|---|---|---|
| `test_frames` | `int \| None` | `None` |
| `hold` | `str` | `"none"` |
| `lag_at` | `int \| None` | `None` |
| `seed` | `int \| None` | `None` |

- Declare it with `@dataclass(frozen=True)`. Fields get defaults the same way parameters do: `test_frames: int | None = None`.
- `main` uses `settings.test_frames`, `settings.hold` and so on, in place of the four local variables. (Keep a local `seed`: `main` changes it to 0 for test runs, and a frozen `Settings` can't be changed.)
- Update the two contract tests in `tests/test_arguments.py` to compare with `Settings` objects: `breakout.parse_args([]) == Settings()`, and the full one with keyword arguments.

**Three things you'll need, new here:**

- **Keyword arguments.** A call can name its arguments, `Settings(test_frames=600, seed=7)`, in any order, and leave out any that have defaults. The `__init__` that `@dataclass` writes accepts them like any function does.
- **Defaults and their order.** A field written `seed: int | None = None` has a default. As with function parameters, fields with defaults must come after fields without one; here every field has one, so it doesn't arise.
- **A decorator with arguments.** `@dataclass(frozen=True)` makes the class refuse changes once an object is made. Try it:

  ```powershell
  .venv\Scripts\python -c "from dataclasses import dataclass; exec('@dataclass(frozen=True)\nclass P:\n    x: int = 0\np = P(x=5)\nprint(p)\np.x = 1')"
  ```

  It prints `P(x=5)`, then a traceback ending `dataclasses.FrozenInstanceError: cannot assign to field 'x'`.

A call too long for one line can carry on over several lines, as long as the break is inside its brackets: Python keeps reading until the brackets close.

When all 38 tests pass and pyright finds no errors in `breakout.py` and `tests/test_breakout.py` (`tests/test_arguments.py` isn't type-checked yet: its helpers get their hints in Chapter 4), commit with a message that mentions **dataclass**.

```hints
nudge: Start with the class: four fields with types and defaults, under `@dataclass(frozen=True)`. Then make `parse_args` build one and return it. Then follow pyright's errors through `main`: each one points at a line still using the old four variables.
concept: `Settings(test_frames=600, hold="auto")` makes an object with those two fields and the defaults for the rest. Passing arguments by name, **keyword arguments**, makes the call say what each value is, which is the whole point. `frozen=True` makes the dataclass refuse changes after it's made: `settings.seed = 5` raises `FrozenInstanceError: cannot assign to field 'seed'`, which is why `main` copies `seed` into a local before possibly changing it.
shape: `parse_args` works out `hold` as before, then `return Settings(test_frames=number_after(args, "--test-run"), hold=hold, lag_at=number_after(args, "--lag-at"), seed=number_after(args, "--seed"))`. In `main`: `settings = parse_args(args)`, `seed = settings.seed`, and `settings.` in front of every other use. In the tests: `from breakout import Settings` at the top.
answer: ~~~python
@dataclass(frozen=True)
class Settings:
    test_frames: int | None = None
    hold: str = "none"
    lag_at: int | None = None
    seed: int | None = None
~~~

~~~python
def parse_args(args: list[str]) -> Settings:
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
~~~

and in the tests:

~~~python
def test_no_arguments_is_a_normal_game():
    assert breakout.parse_args([]) == Settings()


def test_a_test_run_with_every_option():
    assert breakout.parse_args(["--test-run", "600", "--hold", "auto", "--lag-at", "40", "--seed", "7"]) == Settings(test_frames=600, hold="auto", lag_at=40, seed=7)
~~~

Why frozen? Settings are read everywhere and should never change while the game runs. Making that a rule the object enforces, instead of a convention everyone must remember, is the point: an attempt to change one is an error at the line that tries, not a mystery later. Inside parentheses a long call can span several lines, which is how `return Settings(…)` is laid out. The next lesson's first step shows the whole file.
```

```check
contains breakout.py "@dataclass(frozen=True)" -- Declare Settings with @dataclass(frozen=True).
contains breakout.py "def parse_args(args: list[str]) -> Settings:"
run ".venv/Scripts/python -m pytest -q -k every_option" stdout="1 passed" label="the full contract test, comparing with a Settings, passes"
run ".venv/Scripts/python -m pytest -q" stdout="38 passed"
run ".venv/Scripts/python -m pyright breakout.py tests/test_breakout.py" stdout="0 errors"
git-message "dataclass"
git-clean
```

## What did we actually learn?

- **`@dataclass`** generates `__init__`, `__repr__` and `__eq__` from a list of typed fields: less code, readable failure reports, and `==` that compares values.
- **Decorators** change a function or class right after it's defined; **dunder methods** connect a class to Python's syntax.
- **Vectors** bundle components that move together and obey the same arithmetic. `Vector2` adds, scales and measures length.
- **Mutable objects are shared by reference**, and in-place operations like `+=` on a `Vector2` change them for every name that refers to them. Make a new object when it must not be shared.
- **Frozen** dataclasses can't be changed after creation: settings, configuration and other values that must stay fixed should be.
- **Keyword arguments** make calls say what each value means.

A dataclass is what C# calls a **record** and Java calls a **record** too: `public record Settings(int? TestFrames, string Hold, int? LagAt, int? Seed);` in C#, `public record Settings(Integer testFrames, String hold, Integer lagAt, Integer seed) {}` in Java. Both generate the constructor, equality and printed form, and both are immutable by default, like `frozen=True`. Java has no keyword arguments; C# does (`new Settings(TestFrames: 600, ...)`).
