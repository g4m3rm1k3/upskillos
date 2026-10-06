---
title: 3.1 — A Ball That Knows Itself
track: Forge — Objects and Data
trackOrder: 33
runtime: python
run: breakout.py
---

Chapter 2 ended with a **code smell**: a sign in the code, not yet a bug, that its structure will cause bugs. Look at how the ball travels through `breakout.py`: four separate numbers, `ball_x, ball_y, ball_vx, ball_vy`, unpacked from `start_ball`, passed into `bounce_off_walls`, returned and unpacked again. Nothing says they belong together. Nothing stops a call from passing them in the wrong order: `bounce_off_walls(x, y, vy, vx)` would type-check perfectly (they're all floats) and make the ball bounce off the walls in nonsense ways.

This chapter is about **objects**: values that bundle data together with the operations that belong to it. You've been *using* objects since lesson 1.1 (`pygame.Rect` is one: it holds a position and size, and knows how to `colliderect`). Now you'll make your own, and understand exactly what happens in memory when you do.

## A class for the ball

**Build:** a new kind of value, `Ball`, that holds a ball's position and velocity together.

The game keeps the ball in four loose variables, `ball_x`, `ball_y`, `ball_vx` and `ball_vy`, which every function has to be handed one by one, in the right order. A **class** lets you make one value that holds all four.

> **Class**: a description of a kind of object: what data each one holds and what operations it supports. **Object** (or **instance**): one value made from a class, with its own copy of the data. **Attribute**: a named piece of data stored on an object. **Method**: a function defined inside a class, called on an object.

Try a class on its own first, away from the game. Create `scratch/counter.py`:

```python
class Counter:
    def __init__(self, start):
        self.n = start

    def add(self):
        self.n += 1


a = Counter(0)
b = Counter(10)
a.add()
a.add()
b.add()
print(a.n, b.n)
```

Run it: `python scratch\counter.py` prints `2 11`. Two objects from one class, and each has its own `n`: `a` was added to twice, `b` once, and neither touched the other. The definitions below explain every line; come back to this file and change it as you read them. Two experiments worth one run each:

- In `__init__`, write `n = start` instead of `self.n = start`. Now it makes a local variable that vanishes when `__init__` returns, and the next line that reads `self.n` fails with `AttributeError: 'Counter' object has no attribute 'n'`.
- Delete `self` from `def add(self):`. Now `a.add()` fails with `TypeError: Counter.add() takes 0 positional arguments but 1 was given`: the object really is passed as the first argument, whether the method asks for it or not.

Put both back. Those two errors are the most common ones anyone makes with their first classes, and now you'll recognise them.

Add the class just above `start_ball`. For now it has one method, `__init__`, which stores the four numbers:

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


def start_ball(rng: random.Random) -> tuple[float, float, float, float]:
    across = rng.uniform(-0.6, 0.6)
    up = math.sqrt(1 - across * across)
    return WIDTH / 2, HEIGHT / 2, BALL_SPEED * across, -BALL_SPEED * up


def move_paddle(paddle_x: float, direction: int, dt: float) -> float:
    return clamp(paddle_x + direction * PADDLE_SPEED * dt, 0, WIDTH - PADDLE_WIDTH)


def autopilot(ball_x: float, paddle_x: float) -> int:
    middle = paddle_x + PADDLE_WIDTH / 2
    if ball_x < middle - 10:
        return -1
    if ball_x > middle + 10:
        return 1
    return 0


def bounce_off_walls(x: float, y: float, vx: float, vy: float) -> tuple[float, float, float, float]:
    if x < BALL_RADIUS:
        x, vx = BALL_RADIUS, abs(vx)
    if x > WIDTH - BALL_RADIUS:
        x, vx = WIDTH - BALL_RADIUS, -abs(vx)
    if y < BALL_RADIUS:
        y, vy = BALL_RADIUS, abs(vy)
    return x, y, vx, vy


def bounce_off_paddle(ball: pygame.Rect, paddle: pygame.Rect, vx: float, vy: float) -> tuple[float, float]:
    if ball.colliderect(paddle) and vy > 0:
        offset = (ball.centerx - paddle.centerx) / (paddle.width / 2)
        return BALL_SPEED * 0.8 * offset, -vy
    return vx, vy


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


def draw(screen: pygame.Surface, font: pygame.font.Font, paddle: pygame.Rect, ball: pygame.Rect,
         bricks: list[pygame.Rect], score: int, lives: int) -> None:
    screen.fill(BACKGROUND)
    for brick in bricks:
        pygame.draw.rect(screen, brick_colour(brick), brick)
    pygame.draw.rect(screen, PADDLE_COLOUR, paddle)
    pygame.draw.ellipse(screen, BALL_COLOUR, ball)
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

    paddle = pygame.Rect(0, 0, PADDLE_WIDTH, PADDLE_HEIGHT)
    paddle.midbottom = (WIDTH // 2, HEIGHT - 30)
    paddle_x = float(paddle.x)

    ball = pygame.Rect(0, 0, BALL_RADIUS * 2, BALL_RADIUS * 2)
    ball_x, ball_y, ball_vx, ball_vy = start_ball(rng)

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
                direction = autopilot(ball_x, paddle_x)
            paddle_x = move_paddle(paddle_x, direction, dt)
            paddle.x = round(paddle_x)

            ball_x += ball_vx * dt
            ball_y += ball_vy * dt
            ball_x, ball_y, ball_vx, ball_vy = bounce_off_walls(ball_x, ball_y, ball_vx, ball_vy)
            ball.center = (round(ball_x), round(ball_y))
            ball_vx, ball_vy = bounce_off_paddle(ball, paddle, ball_vx, ball_vy)

            hit = hit_brick(ball, bricks)
            if hit is not None:
                bricks.pop(hit)
                ball_vy = -ball_vy
                score += 10

            if ball.top > HEIGHT:
                lives -= 1
                ball_x, ball_y, ball_vx, ball_vy = start_ball(rng)

        draw(screen, font, paddle, ball, bricks, score, lives)
        pygame.display.flip()

        frames += 1
        if test_frames is not None and frames >= test_frames:
            running = False

    pygame.quit()
    if test_frames is not None:
        inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(ball)
        print(f"frames={frames} paddle_x={paddle.x} score={score} lives={lives} bricks={len(bricks)} inside={inside}")


if __name__ == "__main__":
    main(sys.argv[1:])
```

`class Ball:` creates a new type named `Ball`, the way `def` creates a function. The functions indented inside it are its **methods**. Nothing uses `Ball` yet: the game runs exactly as before. Try making one:

```powershell
.venv\Scripts\python -c "import breakout; b = breakout.Ball(320, 240, 180, -240); print(b.x, b.vy)"
```

```text
320 -240
```

**Understand: what `Ball(320, 240, 180, -240)` does.** Calling a class makes an object:

1. Python creates a new, empty object of type `Ball`.
2. It calls the class's `__init__` method (the **initialiser**, a dunder name from lesson 2.3), passing the new object as the first argument and your arguments after it: `Ball.__init__(new_object, 320, 240, 180, -240)`.
3. `__init__` stores the values on the object: `self.x = x` creates an attribute named `x` on that object and binds it to the value of the parameter `x`.
4. The call returns the object.

`self` is just the name of the first parameter: the object the method was called on. It isn't a keyword; it's a convention so strong that every Python programmer uses it.

`__init__` is annotated `-> None` because it returns nothing: it only stores values on the object. The *call* `Ball(...)` is what returns the new object. pyright works out each attribute's type from the `__init__` parameters it's assigned from: `self.x = x`, with `x: float`, makes `b.x` a `float`. Type hints don't convert anything, though: `Ball(320, ...)` stores the `int` 320, which pyright accepts because an `int` is allowed where a `float` is expected (lesson 2.5). That's why the output above is `320`, not `320.0`; `move`, in the next step, makes floats.

```check
contains breakout.py "class Ball:"
run ".venv/Scripts/python -c \"import breakout; b = breakout.Ball(320, 240, 180, -240); print(b.x, b.vy)\"" stdout="320 -240" label="a Ball holds the four numbers it was made with"
run ".venv/Scripts/python -m pytest -q tests/test_characterisation.py" stdout="9 passed" label="the game behaves exactly as before"
run ".venv/Scripts/python -m pyright breakout.py" stdout="0 errors"
```

## A ball that moves itself

**Build:** the ball's own methods for moving and for bouncing off the walls.

Moving a ball and bouncing it off the walls only ever involve the ball's own four numbers, so those belong to the ball. Add two methods after `__init__`, inside the class. They read and change the object's attributes through `self`:

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


def start_ball(rng: random.Random) -> tuple[float, float, float, float]:
    across = rng.uniform(-0.6, 0.6)
    up = math.sqrt(1 - across * across)
    return WIDTH / 2, HEIGHT / 2, BALL_SPEED * across, -BALL_SPEED * up


def move_paddle(paddle_x: float, direction: int, dt: float) -> float:
    return clamp(paddle_x + direction * PADDLE_SPEED * dt, 0, WIDTH - PADDLE_WIDTH)


def autopilot(ball_x: float, paddle_x: float) -> int:
    middle = paddle_x + PADDLE_WIDTH / 2
    if ball_x < middle - 10:
        return -1
    if ball_x > middle + 10:
        return 1
    return 0


def bounce_off_walls(x: float, y: float, vx: float, vy: float) -> tuple[float, float, float, float]:
    if x < BALL_RADIUS:
        x, vx = BALL_RADIUS, abs(vx)
    if x > WIDTH - BALL_RADIUS:
        x, vx = WIDTH - BALL_RADIUS, -abs(vx)
    if y < BALL_RADIUS:
        y, vy = BALL_RADIUS, abs(vy)
    return x, y, vx, vy


def bounce_off_paddle(ball: pygame.Rect, paddle: pygame.Rect, vx: float, vy: float) -> tuple[float, float]:
    if ball.colliderect(paddle) and vy > 0:
        offset = (ball.centerx - paddle.centerx) / (paddle.width / 2)
        return BALL_SPEED * 0.8 * offset, -vy
    return vx, vy


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


def draw(screen: pygame.Surface, font: pygame.font.Font, paddle: pygame.Rect, ball: pygame.Rect,
         bricks: list[pygame.Rect], score: int, lives: int) -> None:
    screen.fill(BACKGROUND)
    for brick in bricks:
        pygame.draw.rect(screen, brick_colour(brick), brick)
    pygame.draw.rect(screen, PADDLE_COLOUR, paddle)
    pygame.draw.ellipse(screen, BALL_COLOUR, ball)
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

    paddle = pygame.Rect(0, 0, PADDLE_WIDTH, PADDLE_HEIGHT)
    paddle.midbottom = (WIDTH // 2, HEIGHT - 30)
    paddle_x = float(paddle.x)

    ball = pygame.Rect(0, 0, BALL_RADIUS * 2, BALL_RADIUS * 2)
    ball_x, ball_y, ball_vx, ball_vy = start_ball(rng)

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
                direction = autopilot(ball_x, paddle_x)
            paddle_x = move_paddle(paddle_x, direction, dt)
            paddle.x = round(paddle_x)

            ball_x += ball_vx * dt
            ball_y += ball_vy * dt
            ball_x, ball_y, ball_vx, ball_vy = bounce_off_walls(ball_x, ball_y, ball_vx, ball_vy)
            ball.center = (round(ball_x), round(ball_y))
            ball_vx, ball_vy = bounce_off_paddle(ball, paddle, ball_vx, ball_vy)

            hit = hit_brick(ball, bricks)
            if hit is not None:
                bricks.pop(hit)
                ball_vy = -ball_vy
                score += 10

            if ball.top > HEIGHT:
                lives -= 1
                ball_x, ball_y, ball_vx, ball_vy = start_ball(rng)

        draw(screen, font, paddle, ball, bricks, score, lives)
        pygame.display.flip()

        frames += 1
        if test_frames is not None and frames >= test_frames:
            running = False

    pygame.quit()
    if test_frames is not None:
        inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(ball)
        print(f"frames={frames} paddle_x={paddle.x} score={score} lives={lives} bricks={len(bricks)} inside={inside}")


if __name__ == "__main__":
    main(sys.argv[1:])
```

**Understand: calling a method.** `ball.move(dt)` is shorthand. Python looks up `move` on the object's class and calls it with the object as the first argument: exactly `Ball.move(ball, dt)`. Inside, `self` *is* `ball`, so `self.x += self.vx * dt` changes `ball`'s `x`. Traced:

```text
ball = Ball(100, 100, 180, -240)      ball.x = 100, ball.vx = 180, ...
ball.move(0.5)
  → Ball.move(ball, 0.5)              self is ball, dt = 0.5
  → self.x += self.vx * dt            ball.x = 100 + 180 × 0.5 = 190
  → self.y += self.vy * dt            ball.y = 100 + (-240) × 0.5 = -20
```

Try it:

```powershell
.venv\Scripts\python -c "import breakout; b = breakout.Ball(100, 100, 180, -240); b.move(0.5); print(b.x, b.y)"
```

```text
190.0 -20.0
```

**Methods change the object.** In Chapter 2, `bounce_off_walls` was pure: values in, new values out. Now `ball.bounce_off_walls()` changes the ball it's called on and returns nothing (`-> None`). That's a trade: the call is simpler (no four values to unpack, no way to pass them in the wrong order), but the function now has an effect beyond its return value. The rule that keeps it manageable: **a method changes only its own object**. `Ball.move` changes the ball and nothing else.

The game still uses the old function `bounce_off_walls(x, y, vx, vy)`; the method is a second copy of the same rules, for now. Two steps on, the game switches to the method and the function is deleted.

```check
run ".venv/Scripts/python -c \"import breakout; b = breakout.Ball(100, 100, 180, -240); b.move(0.5); print(b.x, b.y)\"" stdout="190.0 -20.0" label="move changes the ball by velocity times dt" -- Move by self.vx * dt and self.vy * dt.
run ".venv/Scripts/python -m pytest -q tests/test_characterisation.py" stdout="9 passed" label="the game behaves exactly as before"
run ".venv/Scripts/python -m pyright breakout.py" stdout="0 errors"
```

## A rectangle, made when asked

**Build:** the ball makes its own `Rect` from its position whenever one is needed.

Drawing and collisions need a `Rect`. Instead of the ball keeping one that has to be updated every time it moves, give `Ball` a method that makes a fresh one from `x` and `y`:

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


def start_ball(rng: random.Random) -> tuple[float, float, float, float]:
    across = rng.uniform(-0.6, 0.6)
    up = math.sqrt(1 - across * across)
    return WIDTH / 2, HEIGHT / 2, BALL_SPEED * across, -BALL_SPEED * up


def move_paddle(paddle_x: float, direction: int, dt: float) -> float:
    return clamp(paddle_x + direction * PADDLE_SPEED * dt, 0, WIDTH - PADDLE_WIDTH)


def autopilot(ball_x: float, paddle_x: float) -> int:
    middle = paddle_x + PADDLE_WIDTH / 2
    if ball_x < middle - 10:
        return -1
    if ball_x > middle + 10:
        return 1
    return 0


def bounce_off_walls(x: float, y: float, vx: float, vy: float) -> tuple[float, float, float, float]:
    if x < BALL_RADIUS:
        x, vx = BALL_RADIUS, abs(vx)
    if x > WIDTH - BALL_RADIUS:
        x, vx = WIDTH - BALL_RADIUS, -abs(vx)
    if y < BALL_RADIUS:
        y, vy = BALL_RADIUS, abs(vy)
    return x, y, vx, vy


def bounce_off_paddle(ball: pygame.Rect, paddle: pygame.Rect, vx: float, vy: float) -> tuple[float, float]:
    if ball.colliderect(paddle) and vy > 0:
        offset = (ball.centerx - paddle.centerx) / (paddle.width / 2)
        return BALL_SPEED * 0.8 * offset, -vy
    return vx, vy


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


def draw(screen: pygame.Surface, font: pygame.font.Font, paddle: pygame.Rect, ball: pygame.Rect,
         bricks: list[pygame.Rect], score: int, lives: int) -> None:
    screen.fill(BACKGROUND)
    for brick in bricks:
        pygame.draw.rect(screen, brick_colour(brick), brick)
    pygame.draw.rect(screen, PADDLE_COLOUR, paddle)
    pygame.draw.ellipse(screen, BALL_COLOUR, ball)
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

    paddle = pygame.Rect(0, 0, PADDLE_WIDTH, PADDLE_HEIGHT)
    paddle.midbottom = (WIDTH // 2, HEIGHT - 30)
    paddle_x = float(paddle.x)

    ball = pygame.Rect(0, 0, BALL_RADIUS * 2, BALL_RADIUS * 2)
    ball_x, ball_y, ball_vx, ball_vy = start_ball(rng)

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
                direction = autopilot(ball_x, paddle_x)
            paddle_x = move_paddle(paddle_x, direction, dt)
            paddle.x = round(paddle_x)

            ball_x += ball_vx * dt
            ball_y += ball_vy * dt
            ball_x, ball_y, ball_vx, ball_vy = bounce_off_walls(ball_x, ball_y, ball_vx, ball_vy)
            ball.center = (round(ball_x), round(ball_y))
            ball_vx, ball_vy = bounce_off_paddle(ball, paddle, ball_vx, ball_vy)

            hit = hit_brick(ball, bricks)
            if hit is not None:
                bricks.pop(hit)
                ball_vy = -ball_vy
                score += 10

            if ball.top > HEIGHT:
                lives -= 1
                ball_x, ball_y, ball_vx, ball_vy = start_ball(rng)

        draw(screen, font, paddle, ball, bricks, score, lives)
        pygame.display.flip()

        frames += 1
        if test_frames is not None and frames >= test_frames:
            running = False

    pygame.quit()
    if test_frames is not None:
        inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(ball)
        print(f"frames={frames} paddle_x={paddle.x} score={score} lives={lives} bricks={len(bricks)} inside={inside}")


if __name__ == "__main__":
    main(sys.argv[1:])
```

**Understand.** `rect()` builds a 12 × 12 `Rect` and puts its centre on the ball's position, rounded to whole pixels, then returns it. For a ball at (320, 240), the centre is (320, 240), so the `Rect` starts 6 pixels up and left of it:

```powershell
.venv\Scripts\python -c "import breakout; print(breakout.Ball(320, 240, 180, -240).rect())"
```

```text
Rect(314, 234, 12, 12)
```

**One source of truth.** In Chapter 2 the game kept the ball's position twice: the four floats, and the `Rect`, set from them each frame. Two copies of the same fact always risk disagreeing. Now there's one copy, the position, and the rectangle is **derived** from it each time it's asked for, so the two can't disagree.

```check
run ".venv/Scripts/python -c \"import breakout; print(breakout.Ball(320, 240, 180, -240).rect())\"" stdout="Rect(314, 234, 12, 12)" label="the ball's Rect is centred on its position"
run ".venv/Scripts/python -m pytest -q tests/test_characterisation.py" stdout="9 passed" label="the game behaves exactly as before"
run ".venv/Scripts/python -m pyright breakout.py" stdout="0 errors"
```

## The game plays with a Ball

**Build:** the game uses a `Ball` instead of the four loose variables.

Every use of the ball changes the same way: the four variables become one `ball`, and `ball_x` becomes `ball.x`. Make the changes:

- `start_ball` becomes `serve`: the same calculation, returning one `Ball` instead of four loose numbers.
- In `main`, `ball = serve(rng)` replaces the `Rect` and the four variables.
- The loop calls `ball.move(dt)` and `ball.bounce_off_walls()`, and the old `bounce_off_walls` function is deleted.
- Everything that needs a rectangle asks for `ball.rect()`.
- `autopilot` and `draw` take the `Ball` (a class's name works as a type hint, like `float`).
- The paddle bounce isn't converted yet: it's called with `ball.rect()` and the ball's velocity, and its results are stored back on the ball.

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


def move_paddle(paddle_x: float, direction: int, dt: float) -> float:
    return clamp(paddle_x + direction * PADDLE_SPEED * dt, 0, WIDTH - PADDLE_WIDTH)


def autopilot(ball: Ball, paddle_x: float) -> int:
    middle = paddle_x + PADDLE_WIDTH / 2
    if ball.x < middle - 10:
        return -1
    if ball.x > middle + 10:
        return 1
    return 0


def bounce_off_paddle(ball: pygame.Rect, paddle: pygame.Rect, vx: float, vy: float) -> tuple[float, float]:
    if ball.colliderect(paddle) and vy > 0:
        offset = (ball.centerx - paddle.centerx) / (paddle.width / 2)
        return BALL_SPEED * 0.8 * offset, -vy
    return vx, vy


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

    paddle = pygame.Rect(0, 0, PADDLE_WIDTH, PADDLE_HEIGHT)
    paddle.midbottom = (WIDTH // 2, HEIGHT - 30)
    paddle_x = float(paddle.x)

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
                direction = autopilot(ball, paddle_x)
            paddle_x = move_paddle(paddle_x, direction, dt)
            paddle.x = round(paddle_x)

            ball.move(dt)
            ball.bounce_off_walls()
            ball.vx, ball.vy = bounce_off_paddle(ball.rect(), paddle, ball.vx, ball.vy)

            hit = hit_brick(ball.rect(), bricks)
            if hit is not None:
                bricks.pop(hit)
                ball.vy = -ball.vy
                score += 10

            if ball.rect().top > HEIGHT:
                lives -= 1
                ball = serve(rng)

        draw(screen, font, paddle, ball, bricks, score, lives)
        pygame.display.flip()

        frames += 1
        if test_frames is not None and frames >= test_frames:
            running = False

    pygame.quit()
    if test_frames is not None:
        inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(ball.rect())
        print(f"frames={frames} paddle_x={paddle.x} score={score} lives={lives} bricks={len(bricks)} inside={inside}")


if __name__ == "__main__":
    main(sys.argv[1:])
```

Now check that the game behaves exactly as before:

```powershell
.venv\Scripts\python -m pytest -q tests/test_characterisation.py
```

```text
FAILED tests/test_characterisation.py::test_nobody_at_the_paddle_loses - AssertionError: ...
FAILED tests/test_characterisation.py::test_a_lost_game_stays_lost - AssertionError: ...
2 failed, 7 passed
```

It doesn't. Both failures say `inside=True` where the game used to end with `inside=False`. This is exactly what characterisation tests are for: a change meant only to restructure the code has changed what the game does, and they noticed. The next step works out why.

```check
run ".venv/Scripts/python -m pytest -q tests/test_characterisation.py" exit=1 stdout="2 failed, 7 passed" label="two characterisation tests notice a change in behaviour"
run ".venv/Scripts/python -m pyright breakout.py" stdout="0 errors"
```

## No new ball after the last life

**Build:** serve a new ball only if the player has lives left.

Trace what happens when the last life is lost, before and now:

```text
Chapter 2, lives 1 → 0:   start_ball reset the four numbers to the middle of the screen,
                          but nothing updated the separate Rect, which stayed below the screen.
                          The game ended; the summary checked the Rect: inside=False.
Now, lives 1 → 0:         serve makes a new Ball in the middle of the screen, and its Rect
                          is derived from that position: inside=True. The game is over, but
                          a fresh ball sits in the middle of the Game over screen.
```

Chapter 2's code had a real bug there, which nobody noticed: after the last life, the numbers and the `Rect` disagreed about where the ball was. With one source of truth, the disagreement can't happen, and the rule has to be said out loud: no ball after the last life. Add it:

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


def move_paddle(paddle_x: float, direction: int, dt: float) -> float:
    return clamp(paddle_x + direction * PADDLE_SPEED * dt, 0, WIDTH - PADDLE_WIDTH)


def autopilot(ball: Ball, paddle_x: float) -> int:
    middle = paddle_x + PADDLE_WIDTH / 2
    if ball.x < middle - 10:
        return -1
    if ball.x > middle + 10:
        return 1
    return 0


def bounce_off_paddle(ball: pygame.Rect, paddle: pygame.Rect, vx: float, vy: float) -> tuple[float, float]:
    if ball.colliderect(paddle) and vy > 0:
        offset = (ball.centerx - paddle.centerx) / (paddle.width / 2)
        return BALL_SPEED * 0.8 * offset, -vy
    return vx, vy


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

    paddle = pygame.Rect(0, 0, PADDLE_WIDTH, PADDLE_HEIGHT)
    paddle.midbottom = (WIDTH // 2, HEIGHT - 30)
    paddle_x = float(paddle.x)

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
                direction = autopilot(ball, paddle_x)
            paddle_x = move_paddle(paddle_x, direction, dt)
            paddle.x = round(paddle_x)

            ball.move(dt)
            ball.bounce_off_walls()
            ball.vx, ball.vy = bounce_off_paddle(ball.rect(), paddle, ball.vx, ball.vy)

            hit = hit_brick(ball.rect(), bricks)
            if hit is not None:
                bricks.pop(hit)
                ball.vy = -ball.vy
                score += 10

            if ball.rect().top > HEIGHT:
                lives -= 1
                if lives > 0:
                    ball = serve(rng)

        draw(screen, font, paddle, ball, bricks, score, lives)
        pygame.display.flip()

        frames += 1
        if test_frames is not None and frames >= test_frames:
            running = False

    pygame.quit()
    if test_frames is not None:
        inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(ball.rect())
        print(f"frames={frames} paddle_x={paddle.x} score={score} lives={lives} bricks={len(bricks)} inside={inside}")


if __name__ == "__main__":
    main(sys.argv[1:])
```

**Understand.** `if lives > 0:` serves only while the game goes on. When the last life is lost, the ball stays where it fell, below the screen, which is what the characterisation tests recorded.

```check
run ".venv/Scripts/python -m pytest -q tests/test_characterisation.py" stdout="9 passed" label="the game behaves exactly as before"
run ".venv/Scripts/python -m pyright breakout.py" stdout="0 errors"
```

## The paddle bounce takes a Ball

**Build:** the paddle bounce is given the ball itself, and changes its velocity.

The last place still unpacking the ball's numbers is the paddle bounce. Change it to take the `Ball` and set its velocity directly, and the call in the loop becomes one line:

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


def move_paddle(paddle_x: float, direction: int, dt: float) -> float:
    return clamp(paddle_x + direction * PADDLE_SPEED * dt, 0, WIDTH - PADDLE_WIDTH)


def autopilot(ball: Ball, paddle_x: float) -> int:
    middle = paddle_x + PADDLE_WIDTH / 2
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

    paddle = pygame.Rect(0, 0, PADDLE_WIDTH, PADDLE_HEIGHT)
    paddle.midbottom = (WIDTH // 2, HEIGHT - 30)
    paddle_x = float(paddle.x)

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
                direction = autopilot(ball, paddle_x)
            paddle_x = move_paddle(paddle_x, direction, dt)
            paddle.x = round(paddle_x)

            ball.move(dt)
            ball.bounce_off_walls()
            bounce_off_paddle(ball, paddle)

            hit = hit_brick(ball.rect(), bricks)
            if hit is not None:
                bricks.pop(hit)
                ball.vy = -ball.vy
                score += 10

            if ball.rect().top > HEIGHT:
                lives -= 1
                if lives > 0:
                    ball = serve(rng)

        draw(screen, font, paddle, ball, bricks, score, lives)
        pygame.display.flip()

        frames += 1
        if test_frames is not None and frames >= test_frames:
            running = False

    pygame.quit()
    if test_frames is not None:
        inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(ball.rect())
        print(f"frames={frames} paddle_x={paddle.x} score={score} lives={lives} bricks={len(bricks)} inside={inside}")


if __name__ == "__main__":
    main(sys.argv[1:])
```

**Understand.** Why isn't this a method of `Ball`, like the wall bounce? Because it involves **two** objects, the ball and the paddle. The rule *a method changes only its own object* would be broken whichever class it went in, so for now it stays a function, given both, changing the ball. Lesson 3.5 shows who calls it: the `Game` object that owns both the ball and the paddle (and the challenges there move it in).

> **Engineer:** **encapsulation**: keep data together with the code that understands it. Everything about how a ball moves and bounces is now inside `Ball`. The main loop says *what* happens (`ball.move(dt)`, `ball.bounce_off_walls()`), and `Ball` knows *how*. To change how a ball bounces, there's one place to look.

```check
contains breakout.py "class Ball:"
run ".venv/Scripts/python -m pytest -q tests/test_characterisation.py" stdout="9 passed" label="the game behaves exactly as before" -- The characterisation tests pin the game's behaviour: compare each method with the function it replaced.
run ".venv/Scripts/python -m pyright breakout.py" stdout="0 errors"
```

## Objects in memory

**Build:** nothing to keep. Find out what a variable holding an object actually holds.

```powershell
.venv\Scripts\python -c "import breakout; a = breakout.Ball(1, 2, 3, 4); b = breakout.Ball(1, 2, 3, 4); c = a; print(a == b, a == c, a is c)"
```

```predict
question: `a` and `b` were made with the same four numbers; `c = a`. What does it print?
choice: True True True
choice: False True True
choice: True True False
answer: False True True
explain: `a == b` is `False`: two separate objects, and for a class that doesn't say otherwise, `==` asks "is it the *same object*?", not "do they hold the same values?". `c = a` doesn't copy anything: it makes `c` a second name for the object `a` names, so `a == c` and `a is c` are both `True`.
```

**Understand: names and objects.** A variable doesn't contain an object. It **refers** to one: the object lives somewhere in memory, and the name is bound to it. Assignment binds a name; it never copies. So after `c = a`:

```text
a ──┐
    ├──▶  Ball object #1   {'x': 1, 'y': 2, 'vx': 3, 'vy': 4}
c ──┘

b ─────▶  Ball object #2   {'x': 1, 'y': 2, 'vx': 3, 'vy': 4}
```

Change the object through one name and every name sees it. Two names for one object is called **aliasing**. See it, and where the attributes live:

```powershell
.venv\Scripts\python -c "import breakout; a = breakout.Ball(1, 2, 3, 4); c = a; c.x = 99; print(a.x); print(a.__dict__); print(id(a) == id(c))"
```

```text
99
{'x': 99, 'y': 2, 'vx': 3, 'vy': 4}
True
```

`c.x = 99` changed the one object both names refer to, so `a.x` is 99. An object's attributes are stored in a dictionary, `a.__dict__`, which is what `self.x = x` was writing into. `id(a)` gives a number unique to each object while it exists, and `a is c` means exactly `id(a) == id(c)`.

That's also how `bounce_off_paddle(ball, paddle)` works now: the parameter `ball` inside the function is another name for the same object `main` holds, so changing `ball.vy` inside the function changes the game's ball. Passing an object to a function passes a **reference** to it, never a copy.

Don't mix this up with lesson 2.2's rule that assigning to a parameter doesn't affect the caller. Both are true, and the REPL shows the difference:

```text
>>> import breakout
>>> def change(b):
...     b.x = 99
...
>>> def replace(b):
...     b = breakout.Ball(0, 0, 0, 0)
...
>>> a = breakout.Ball(1, 2, 3, 4)
>>> change(a)
>>> a.x
99
>>> replace(a)
>>> a.x
99
```

`change` changed **the object** both names refer to: the caller sees it. `replace` made its **name** `b` refer to a new object, which only moved the local name: the caller's `a` is untouched. When you do want an independent object, `copy.copy(a)` (from the standard library's `copy` module) makes a new one with the same attributes, and `copy.copy(a) is a` is `False`.

> **Engineer:** aliasing is how objects get shared, and how bugs get shared too. When a function changes an object it was given, every other part of the program holding that object sees the change. Be explicit about it: a function that changes its argument returns `None` (`bounce_off_paddle`, `ball.move`), and one that doesn't change it returns a new value instead. Keeping "do something" and "answer a question" apart is called **command-query separation**. Mixing the two, changing an argument *and* returning something, is a classic source of confusion; lesson 3.3 breaks the rule once, on purpose, and says why.

## Test the ball

**Build:** the unit tests, rewritten for `Ball` and `serve`.

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


def test_holding_right_for_half_a_second_moves_the_paddle_210_pixels():
    assert breakout.move_paddle(270, 1, 0.5) == 480


def test_the_paddle_stops_at_the_right_edge():
    assert breakout.move_paddle(500, 1, 1) == 540


def test_the_paddle_stops_at_the_left_edge():
    assert breakout.move_paddle(10, -1, 1) == 0


def test_the_autopilot_steers_towards_the_ball():
    assert breakout.autopilot(breakout.Ball(100, 240, 0, 0), 270) == -1
    assert breakout.autopilot(breakout.Ball(320, 240, 0, 0), 270) == 0
    assert breakout.autopilot(breakout.Ball(500, 240, 0, 0), 270) == 1


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

```powershell
.venv\Scripts\python -m pytest -q
```

```text
......................................                                   [100%]
38 passed in 8.85s
```

**Understand.** The tests of methods follow a new pattern: **arrange** an object in a known state, **act** by calling a method that changes it, then **assert** on its state afterwards. The `state` helper turns a ball into a tuple of its four numbers, because comparing two `Ball`s with `==` asks whether they're the same object, which is never what a test means. (The next lesson removes the need for `state`.)

`test_a_ball_knows_its_rectangle` checks the one place a `Rect` is now made from the position: centre (320, 438) and radius 6 give a 12 × 12 square with its top-left corner at (314, 432).

```check
run ".venv/Scripts/python -m pytest -q" stdout="38 passed" label="every test passes" -- Replace tests/test_breakout.py with the file above.
```

## Your turn: a paddle that knows itself

**Build, on your own:** a `Paddle` class, used in place of `move_paddle` and the loose `paddle_x`.

| Part | Does |
|---|---|
| `Paddle()` | a paddle centred near the bottom: `x` is 270.0 |
| `paddle.x` | the left edge, as a float |
| `paddle.move(direction, dt)` | moves it at `PADDLE_SPEED`, clamped to the screen; returns nothing |
| `paddle.rect()` | its `Rect`: 100 × 14, with its top at `HEIGHT - 30 - PADDLE_HEIGHT` |

Then:

- delete `move_paddle`, and use a `Paddle` in `main` instead of `paddle`, `paddle_x` and the two lines that set them up;
- change `autopilot` to take the `Paddle` (it reads `paddle.x`);
- rewrite the three paddle tests and the autopilot test in `tests/test_breakout.py` to use `Paddle`, **keeping their names**, and add a test named `test_a_new_paddle_is_centred_near_the_bottom`.

The game must behave exactly as before (the characterisation tests will tell you), pyright must find no errors in `breakout.py` and `tests/test_breakout.py`, and then commit with a message that mentions **classes**.

Try it for about 20 minutes before taking a hint.

```hints
nudge: Follow `Ball` as a pattern. Which values does a paddle need to remember (its attributes)? Which operations change it (methods that return `None`)? Which values are calculated from it when asked (methods that return something)?
concept: A paddle needs only `x`: its width, height and `y` never change, so they're constants, and `rect()` builds the `Rect` from `x` and them, the same "one source of truth" as `Ball.rect()`. `move` is the old `move_paddle` with `self.x` in place of the parameter, stored back into `self.x` instead of returned. Every place in `main` that used `paddle` as a `Rect` now uses `paddle.rect()`.
shape: `class Paddle:` with `__init__(self) -> None` setting `self.x = float(WIDTH // 2 - PADDLE_WIDTH // 2)`, `move(self, direction: int, dt: float) -> None`, and `rect(self) -> pygame.Rect`. In `main`: `paddle = Paddle()`, `paddle.move(direction, dt)`, `autopilot(ball, paddle)`, and `paddle.rect()` wherever a `Rect` is needed (the bounce, `draw`, the summary). A test arranges `paddle = breakout.Paddle()`, acts with `paddle.move(1, 0.5)`, and asserts `paddle.x == 480`.
answer: ~~~python
class Paddle:
    def __init__(self) -> None:
        self.x = float(WIDTH // 2 - PADDLE_WIDTH // 2)

    def move(self, direction: int, dt: float) -> None:
        self.x = clamp(self.x + direction * PADDLE_SPEED * dt, 0, WIDTH - PADDLE_WIDTH)

    def rect(self) -> pygame.Rect:
        return pygame.Rect(round(self.x), HEIGHT - 30 - PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT)
~~~

and in the tests, for example:

~~~python
def test_holding_right_for_half_a_second_moves_the_paddle_210_pixels():
    paddle = breakout.Paddle()
    paddle.move(1, 0.5)
    assert paddle.x == 480
~~~

`HEIGHT - 30 - PADDLE_HEIGHT` is 436, the same top edge `midbottom = (320, 450)` gave in lesson 1.3, written as a calculation from named values. The next lesson's first step shows both whole files.
```

```check
contains breakout.py "class Paddle:"
lacks breakout.py "def move_paddle(" -- Delete move_paddle: Paddle.move replaces it.
run ".venv/Scripts/python -m pytest -q -k paddle_210" stdout="1 passed" label="the half-second paddle test, rewritten for Paddle, passes"
run ".venv/Scripts/python -m pytest -q -k centred_near_the_bottom" stdout="1 passed" label="a test for a new paddle's position passes"
run ".venv/Scripts/python -m pytest -q" stdout="39 passed" label="every test passes" -- The characterisation tests check the game still behaves exactly the same.
run ".venv/Scripts/python -m pyright breakout.py tests/test_breakout.py" stdout="0 errors"
git-message "classes" -- Commit with a message that mentions classes.
git-clean
```

## Challenge: a ball that knows its speed

**Optional, ★.** Add a method `speed()` to `Ball` that returns the length of its velocity (`math.hypot`, lesson 1.4), and a test that every serve has speed `BALL_SPEED` (use `math.isclose`, lesson 2.6). A value worked out from the object's own data, with one place that knows how.

## Challenge: two balls

**Optional, ★★.** In a copy, keep a list of two `Ball`s in `main`, the second served from a different seed, each moving and bouncing itself. Count how many lines you'd have needed with eight loose variables instead. Objects carry their own state, and a loop over objects replaces a pile of parallel variables.

## Challenge: an aliasing bug on purpose

**Optional, ★★.** In the REPL, write `balls = [breakout.serve(random.Random(0))] * 3`, predict what moving `balls[0]` does to `balls[1]`, then check. `[x] * 3` repeats the **reference**, so it's one ball three times. Fix it with a comprehension that serves three separate balls.

## What did we actually learn?

- **A class** describes a kind of object; **calling it** makes an instance and runs `__init__` on it. **`self`** is the object a method was called on: `ball.move(dt)` is `Ball.move(ball, dt)`.
- **Methods change their own object**, which simplifies calls at the cost of effects beyond the return value. Keep each method's changes to its own object.
- **One source of truth**: store a fact once, derive everything else from it. Two copies drift apart, as the ball's `Rect` did in Chapter 2.
- **Names refer to objects**; assignment and argument passing never copy. Two names for one object is aliasing.
- **`==` on a plain class means "the same object"**, and tests that compare objects need to say what they really mean.

C# and Java have classes too, with the same ideas and different spellings: `class Ball { public double X; ... public void Move(double dt) { X += Vx * dt; } }`. `this` in place of `self`, and it's implicit: inside a method, `X` means `this.X` without writing it. A constructor `public Ball(double x, ...)` plays `__init__`'s part. And objects of a class are passed by reference exactly as in Python (C# `struct`s are the exception: they're copied, which is one reason C# has both).
