---
title: 3.5 — A Game You Can Hold
runtime: python
run: breakout.py
---

The ball, the paddle and the bricks are objects now, but the game itself is still a heap of local variables inside `main`: `score`, `lives`, `bricks`, `ball`, `paddle`, and the rules that connect them, spread through the loop. This lesson gathers them into one object, a `Game`, that you can create, step forward and inspect, with no window at all. Then you'll read a piece of code someone else wrote, which is most of what professional programming is.

## The whole files so far

**Build:** make sure `breakout.py` matches the end of lesson 3.4, the reference answer to its Your turn.

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

```check
contains breakout.py "raise ValueError("
run ".venv/Scripts/python -m pyright breakout.py" stdout="0 errors"
```

## The whole test file so far

**Build:** the unit tests as lesson 3.4 left them.

```python file=tests/test_breakout.py
import math
import random

import pygame
import pytest
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


def test_a_broken_brick_cannot_be_hit_again():
    brick = breakout.Brick(pygame.Rect(0, 0, 70, 20), (34, 197, 94))
    brick.hit()
    with pytest.raises(ValueError):
        brick.hit()
    assert brick.hits_left == 0
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="45 passed"
```

## A game object

**Build:** a `Game` class that owns everything in play and knows the rules that connect it.

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
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
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


if __name__ == "__main__":
    main(sys.argv[1:])
```

**Understand: composition.** A `Game` **has** a paddle, a ball, a list of bricks, a score and a number of lives. Its `__init__` creates them, and its `update(direction, dt)` method runs exactly the rules the loop ran before, on its own attributes. Building a bigger object out of smaller ones like this is called **composition**, and it's the main way programs are structured.

`main` is now what it should be: setup, then a loop that turns the outside world into calls on the game (keys or the autopilot become a `direction`, the clock becomes `dt`) and turns the game into pixels (`draw(screen, font, game)`). It knows nothing about bricks breaking or lives being lost. `draw` takes the whole game instead of seven separate values.

`Game.playing()` names a rule that appeared in two places as `lives > 0 and bricks`: one name, one place.

**Composition, not inheritance.** Python also lets one class be made **from** another: `class Ball(pygame.Rect):` would make a ball a special kind of `Rect`, **inheriting** all its methods. That's **inheritance**, and it means *is-a*: a ball would *be* a rectangle. It's tempting, since the ball has a rectangle. But then every `Rect` method would be part of the ball's interface (`ball.inflate`, `ball.width = 90`), anything could change it in ways that ignore `position`, and lesson 3.1's "one source of truth" would be gone. A ball **has** a position and **can make** a rectangle; it isn't one. The usual advice, "prefer composition to inheritance", comes from exactly this: inheritance shares *everything*, composition shares only what you choose. Chapter 10 uses inheritance where it fits, for the node types of the engine.

> **Engineer:** the `Game` object is the **model** of the game: its state and its rules, with nothing about screens or keyboards. `main` and `draw` are the edges that connect the model to the outside world. Separating the model from input and output is the most important structural idea in this series: it's what will let one engine run under a test, a game window, an editor (Chapter 18) and a machine-learning agent (Chapter 31).

```check
contains breakout.py "class Game:"
contains breakout.py "def draw(screen: pygame.Surface, font: pygame.font.Font, game: Game) -> None:"
run ".venv/Scripts/python -m pytest -q" stdout="45 passed" label="the game behaves exactly as before"
run ".venv/Scripts/python -m pyright breakout.py" stdout="0 errors"
```

## Play a whole game in a test

**Build:** tests that create a `Game` and step it forward, without a window and without starting another program.

Create `tests/test_game.py`:

```python file=tests/test_game.py
import random

import pygame
from pygame import Vector2

import breakout


def autopilot_game(seed: int, frames: int) -> breakout.Game:
    game = breakout.Game(random.Random(seed))
    for _ in range(frames):
        game.update(breakout.autopilot(game.ball, game.paddle), 1 / 60)
    return game


def test_a_new_game():
    game = breakout.Game(random.Random(0))
    assert (game.score, game.lives, len(game.bricks)) == (0, 3, 40)
    assert game.playing()


def test_ten_seconds_of_autopilot_matches_the_test_run():
    game = autopilot_game(0, 600)
    assert (game.paddle.rect().x, game.score, game.lives, len(game.bricks)) == (435, 70, 3, 33)


def test_a_missed_ball_costs_a_life_and_a_new_ball_is_served():
    game = breakout.Game(random.Random(0))
    game.ball = breakout.Ball(Vector2(100, breakout.HEIGHT + 20), Vector2(0, 300))
    game.update(0, 1 / 60)
    assert game.lives == 2
    assert game.ball.position == Vector2(320, 240)


def test_a_ball_that_hits_a_brick_breaks_it_and_bounces():
    game = breakout.Game(random.Random(0))
    game.bricks = [breakout.Brick(pygame.Rect(300, 200, 70, 20), (34, 197, 94))]
    game.ball = breakout.Ball(Vector2(330, 225), Vector2(0, -240))
    game.update(0, 1 / 60)
    assert (game.score, len(game.bricks)) == (10, 0)
    assert game.ball.velocity.y == 240
```

```powershell
.venv\Scripts\python -m pytest -q tests/test_game.py --durations=5
```

```text
0.01s call     tests/test_game.py::test_ten_seconds_of_autopilot_matches_the_test_run
4 passed in 0.12s
```

**Understand.** `test_ten_seconds_of_autopilot_matches_the_test_run` plays 600 frames, the same game as the characterisation test `test_autopilot_plays_for_ten_seconds`, and gets the same numbers. The characterisation test takes about a second, because it starts Python and pygame in a new process. This one takes a hundredth of a second, because it's 600 method calls on an object.

The other three tests **arrange** a situation directly, by setting the game's attributes: a ball just below the screen, or a wall of one brick with the ball inside it. Then one `update`, then check the result. Before `Game` existed, testing "a missed ball costs a life" meant playing until the ball happened to be missed. Now it's three lines.

These are **integration tests**: they test several pieces working together (`Game`, `Ball`, `Paddle`, `Brick`), which no unit test does, but without the whole program around them. They sit in the middle of the testing pyramid from lesson 2.4: slower and broader than unit tests, far faster and more precise than characterisation tests.

```check
run ".venv/Scripts/python -m pytest -q tests/test_game.py" stdout="4 passed"
```

## Read code you didn't write

**Build:** nothing to write. Read a module you're given, and predict what it does.

Most working programmers spend more time reading code than writing it: other people's code, libraries, and their own code from months ago. Click **Create provided replay.py** and read it before running anything:

```python file=replay.py provided
"""Plays a game with the autopilot, without a window, and reports each change of score, lives or bricks."""
import random
import sys

import breakout


def play(seed: int, frames: int) -> list[str]:
    game = breakout.Game(random.Random(seed))
    events = []
    for frame in range(frames):
        before = (game.score, game.lives, len(game.bricks))
        game.update(breakout.autopilot(game.ball, game.paddle), 1 / 60)
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

A method for reading code you don't know, in order:

1. **What is it for?** The docstring at the top (a string as the first statement of a module, class or function is its **docstring**, its built-in documentation) says it plays a game and reports changes.
2. **What goes in and out?** `play(seed: int, frames: int) -> list[str]`: a seed and a number of frames in, a list of lines out. The bottom says how it's run: `python replay.py SEED FRAMES`.
3. **Follow the main path.** A game; a loop over frames; each frame, the score, lives and bricks before and after one `update`; a line if anything changed; stop early if the game ended.
4. **Trace one case by hand**, before running it. Then run it and compare.

Answer these before running the module:

```predict
question: How many lines does `play(0, 600)` return?
answer: 7
explain: One line for each frame where the score, the lives or the number of bricks changed. With seed 0, the characterisation tests already told you what happens in 600 frames: the autopilot breaks 7 bricks (score 70, bricks 33) and loses no lives, so 7 frames change something. The game is still being played at frame 600, so there's no "game is over" line.
verify: .venv/Scripts/python -c "import replay; print(len(replay.play(0, 600)))"
```

```predict
question: For a whole game, `play(0, 10000)`, how many lines? The autopilot wins, and the wall has 40 bricks, 8 of them tough.
answer: 41
explain: A tough brick's first hit only cracks it: the score doesn't change (it scores 0) and the number of bricks doesn't change, so `after == before` and nothing is reported. Only the 40 hits that *break* a brick change something: 40 lines. Then, on the frame the last brick breaks, `game.playing()` is false, so one more line, "the game is over", and `break` ends the loop at frame 7609, long before 10000.
verify: .venv/Scripts/python -c "import replay; print(len(replay.play(0, 10000)))"
```

```predict
question: Suppose `before = (game.score, game.lives, len(game.bricks))` were replaced by `before = game`, and `after = …` by `after = game`. What would `play` return?
choice: The same lines as now
choice: An empty list, or just "the game is over"
choice: A line for every frame
answer: An empty list, or just "the game is over"
explain: `before = game` doesn't copy the game: it's a second name for the same object (lesson 3.1's aliasing). After `update`, `after` is that same object too, so `after != before` is always `False`, and no change is ever reported. The tuple works because it copies the three *numbers* at that moment: integers can't change, so the tuple keeps the "before" values even after the game moves on.
```

Now run it and compare with your predictions:

```powershell
.venv\Scripts\python replay.py 0 600
```

```text
frame 11: score 10, lives 3, bricks 39
frame 119: score 20, lives 3, bricks 38
frame 227: score 30, lives 3, bricks 37
frame 351: score 40, lives 3, bricks 36
frame 356: score 50, lives 3, bricks 35
frame 362: score 60, lives 3, bricks 34
frame 492: score 70, lives 3, bricks 33
```

`replay.py` uses only `Game`, `autopilot` and the game's attributes: it's a whole new tool, written against the model without touching `breakout.py`. That's the payoff of separating the model from input and output.

```check
file replay.py -- Click "Create provided replay.py" above.
run ".venv/Scripts/python replay.py 0 600" stdout="frame 492: score 70, lives 3, bricks 33" label="replay.py reports seven changes in ten seconds"
```

## Your turn: the end of a game

**Build, on your own:** two more tests in `tests/test_game.py`, arranged directly, for the *Win or lose* story.

| Test name must contain | It checks |
|---|---|
| `last_life` | a game with one life left, whose ball is below the screen: after one `update`, `lives` is 0, the game isn't `playing()`, and a further `update` changes nothing (score, lives and bricks all the same) |
| `last_brick` | a game whose wall is a single brick, with the ball inside it: after one `update`, the brick is gone, the score went up by 10, and the game isn't `playing()` |

Then make each fail once, on purpose (break the rule in `Game` it depends on), put it back, and commit with a message that mentions the **model**: this lesson made the game a model you can hold.

```hints
nudge: Copy the arrange step of `test_a_missed_ball_costs_a_life_and_a_new_ball_is_served` and `test_a_ball_that_hits_a_brick_breaks_it_and_bounces`. What's different about the situations you need?
concept: Arrange by setting attributes: `game.lives = 1` before putting the ball below the screen; `game.bricks = [one brick]` and a ball inside it. For "a further update changes nothing", record the three numbers in a tuple before the second `update` (the same idea `replay.py` uses) and compare after.
shape: Both tests: create `game = breakout.Game(random.Random(0))`, set up the situation, `game.update(0, 1 / 60)`, then assert. The first also stores `before = (game.score, game.lives, len(game.bricks))`, calls `update` again, and asserts the tuple is unchanged.
answer: ~~~python
def test_losing_the_last_life_ends_the_game():
    game = breakout.Game(random.Random(0))
    game.lives = 1
    game.ball = breakout.Ball(Vector2(100, breakout.HEIGHT + 20), Vector2(0, 300))
    game.update(0, 1 / 60)
    assert game.lives == 0
    assert not game.playing()
    before = (game.score, game.lives, len(game.bricks))
    game.update(0, 1 / 60)
    assert (game.score, game.lives, len(game.bricks)) == before


def test_breaking_the_last_brick_wins():
    game = breakout.Game(random.Random(0))
    game.bricks = [breakout.Brick(pygame.Rect(300, 200, 70, 20), (34, 197, 94))]
    game.ball = breakout.Ball(Vector2(330, 225), Vector2(0, -240))
    game.update(0, 1 / 60)
    assert game.bricks == []
    assert game.score == 10
    assert not game.playing()
~~~

Setting `game.lives` from a test reaches into the object's state, which lesson 3.4 said other code shouldn't do. Tests are the usual exception: arranging an exact situation directly is what makes them short and precise. If `lives` had an invariant to protect, it would be worth giving `Game` a proper way to set up such situations instead.
```

```check
run ".venv/Scripts/python -m pytest -q -k last_life" stdout="1 passed" label="losing the last life ends the game, and nothing changes after"
run ".venv/Scripts/python -m pytest -q -k last_brick" stdout="1 passed" label="breaking the last brick wins"
run ".venv/Scripts/python -m pytest -q" stdout="51 passed"
run ".venv/Scripts/python -m pyright breakout.py tests/test_breakout.py tests/test_game.py" stdout="0 errors"
git-message "model"
git-clean
```

## What did we actually learn?

- **Composition**: a bigger object made of smaller ones, each responsible for its own part. Prefer it to **inheritance**, which shares everything; inherit only when one thing truly *is* another.
- **The model** (state and rules) separated from **input and output** (keys, clock, pixels) can be driven by anything: a window, a test, a replay tool.
- **Integration tests** check pieces working together, in-process: a hundred times faster than running the program, and able to arrange exact situations.
- **Reading code**: purpose, inputs and outputs, the main path, then a hand trace of one case, before running it.
- **Copies versus references**: a tuple of numbers captures values at a moment; a second name for an object doesn't.

In C# and Java, the same split is everywhere under different names: a game's model and its rendering, a web application's domain model and its controllers, a desktop app's view model and its views (the "MVC" and "MVVM" patterns). Inheritance in those languages is written `class Ball : Shape` (C#) and `class Ball extends Shape` (Java), and the same advice applies: favour composition. *Effective Java*, the standard book on Java style, has an item titled exactly that: *Favor composition over inheritance*.
