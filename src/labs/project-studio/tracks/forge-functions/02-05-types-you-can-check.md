---
title: 2.5 — Types You Can Check
runtime: python
run: breakout.py
---

Tests find mistakes by running the code. This lesson adds a second, very different safety net: a **type checker**, which reads the code *without running it* and finds a whole family of mistakes before the program ever starts. It's how C# and Java programmers work all the time (their compilers do it), and Python can work that way too.

## What a type is

**Build:** nothing yet. First, the idea from first principles.

Every value in Python has a **type**, which says what kind of thing it is and so what can be done with it:

```powershell
python -c "print(type(3), type(3.0), type('3'), type(None), type([3]))"
```

```text
<class 'int'> <class 'float'> <class 'str'> <class 'NoneType'> <class 'list'>
```

Python's word for a type is **class**, which is why it prints `<class 'int'>`; Chapter 3 makes classes of your own. `3 + 3` works and `'3' + 3` doesn't (lesson 0.3's `TypeError`) because the types decide which operations make sense.

> **Type**: the kind of a value, which determines what operations are allowed on it. **Dynamic typing** (Python): types are checked while the program runs, by each operation, when it happens. **Static typing** (C#, Java): types are checked before the program runs, by reading the code.

The cost of dynamic typing is *when* you find out. `'Score: ' + 10` on a line that only runs when the player wins is a crash that only happens when the player wins. A **type checker** works out, by reading the code, what type each value *could* have at each point, and reports operations that would fail for some of them, on every line, including the ones your tests never reach.

## Install a type checker

**Build:** add **pyright**, the type checker that VS Code's Python support (its Pylance extension) is built on.

```text file=requirements.txt
pygame-ce==2.5.8
pytest==9.1.1
pyright[nodejs]==1.1.414
```

```powershell
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m pyright --version
```

```text
pyright 1.1.414
```

**Understand: `[nodejs]`.** pyright is written in TypeScript and runs on **Node.js**, a program for running JavaScript outside a browser. The pip package is a small Python wrapper around it. The part in square brackets is an **extra**: an optional set of additional dependencies a package offers. `pyright[nodejs]` installs a copy of Node.js as a Python package too (`nodejs-wheel-binaries`, about 40 MB), so pyright works on a computer that doesn't have Node.js installed, and the version is pinned like everything else.

```check
contains requirements.txt "pyright[nodejs]==1.1.414"
run ".venv/Scripts/python -m pyright --version" stdout="pyright 1.1.414" label="pyright 1.1.414 runs" -- Run .venv\Scripts\python -m pip install -r requirements.txt.
```

## Point it at your Python

**Build:** tell pyright which Python, and so which packages, the project uses.

Create `pyrightconfig.json` in the project folder:

```json file=pyrightconfig.json
{ "venvPath": ".", "venv": ".venv" }
```

```powershell
.venv\Scripts\python -m pyright breakout.py
```

```text
0 errors, 0 warnings, 0 informations
```

**Understand.** pyright needs to read pygame's code to know what `pygame.Rect` is, so it needs to know where pygame is installed. Without this file it looks for the Python on `PATH`, the system one, which doesn't have pygame, and reports `Import "pygame" could not be resolved`. The file is **JSON**: `{ … }` holds `"name": value` pairs. `venvPath` is the folder containing environments (`.`, the project) and `venv` is the environment's name, `.venv`.

**0 errors**, without a single annotation in the file. pyright **infers** types: it sees `WIDTH = 640` and knows `WIDTH` is an `int`; it sees `return max(low, min(value, high))` and works out what `clamp` returns from what it's given. It can only check what it can infer, though, so the next steps give it more to work with.

```check
file pyrightconfig.json
run ".venv/Scripts/python -m pyright breakout.py" stdout="0 errors" label="pyright finds no errors in breakout.py" -- pyrightconfig.json must be in the project folder: { "venvPath": ".", "venv": ".venv" }
```

## The command line so far

**Build:** make sure `breakout.py` matches the end of lesson 2.4, with the reference answer to its bug hunt.

This step has nothing new in it: it's lesson 2.4's answer, so the rest of this lesson's steps line up with your file exactly. If yours differs, the lines below show where; yours may well be fine. In the reference, `HOLDS` lists the four allowed `--hold` words, `USAGE` is one usage line shared by every error, and `number_after(args, name)` reads the number after an option, or returns `None` if the option isn't there, or prints the usage and exits if what follows isn't a number.

```python file=breakout.py
import os
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
USAGE = "usage: python breakout.py [--test-run FRAMES [--hold left|right|none|auto] [--lag-at FRAME]]"



def clamp(value, low, high):
    return max(low, min(value, high))


def number_after(args, name):
    if name not in args:
        return None
    i = args.index(name)
    if i + 1 >= len(args) or not args[i + 1].isdigit():
        print(USAGE)
        sys.exit(2)
    return int(args[i + 1])


def parse_args(args):
    # A test run lets another program play the game, with no window:
    #   python breakout.py --test-run FRAMES [--hold left|right|none|auto] [--lag-at FRAME]
    test_frames = number_after(args, "--test-run")
    lag_at = number_after(args, "--lag-at")
    hold = "none"
    if "--hold" in args:
        i = args.index("--hold")
        if i + 1 >= len(args) or args[i + 1] not in HOLDS:
            print(USAGE)
            sys.exit(2)
        hold = args[i + 1]
    return test_frames, hold, lag_at


def start_ball():
    return WIDTH / 2, HEIGHT / 2, BALL_SPEED * 0.6, -BALL_SPEED * 0.8


def move_paddle(paddle_x, direction, dt):
    return clamp(paddle_x + direction * PADDLE_SPEED * dt, 0, WIDTH - PADDLE_WIDTH)


def autopilot(ball_x, paddle_x):
    middle = paddle_x + PADDLE_WIDTH / 2
    if ball_x < middle - 10:
        return -1
    if ball_x > middle + 10:
        return 1
    return 0


def bounce_off_walls(x, y, vx, vy):
    if x < BALL_RADIUS:
        x, vx = BALL_RADIUS, abs(vx)
    if x > WIDTH - BALL_RADIUS:
        x, vx = WIDTH - BALL_RADIUS, -abs(vx)
    if y < BALL_RADIUS:
        y, vy = BALL_RADIUS, abs(vy)
    return x, y, vx, vy


def bounce_off_paddle(ball, paddle, vx, vy):
    if ball.colliderect(paddle) and vy > 0:
        offset = (ball.centerx - paddle.centerx) / (paddle.width / 2)
        return BALL_SPEED * 0.8 * offset, -vy
    return vx, vy


def make_bricks():
    bricks = []
    for row in range(len(ROW_COLOURS)):
        for col in range(8):
            x = WALL_LEFT + col * (BRICK_WIDTH + BRICK_GAP)
            y = WALL_TOP + row * (BRICK_HEIGHT + BRICK_GAP)
            bricks.append(pygame.Rect(x, y, BRICK_WIDTH, BRICK_HEIGHT))
    return bricks


def brick_colour(brick):
    row = (brick.y - WALL_TOP) // (BRICK_HEIGHT + BRICK_GAP)
    return ROW_COLOURS[row]


def draw(screen, font, paddle, ball, bricks, score, lives):
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


def main(args):
    test_frames, hold, lag_at = parse_args(args)
    if test_frames is not None:
        os.environ["SDL_VIDEODRIVER"] = "dummy"

    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Breakout")
    clock = pygame.time.Clock()
    font = pygame.font.Font(None, 36)

    paddle = pygame.Rect(0, 0, PADDLE_WIDTH, PADDLE_HEIGHT)
    paddle.midbottom = (WIDTH // 2, HEIGHT - 30)
    paddle_x = float(paddle.x)

    ball = pygame.Rect(0, 0, BALL_RADIUS * 2, BALL_RADIUS * 2)
    ball_x, ball_y, ball_vx, ball_vy = start_ball()

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

            hit = ball.collidelist(bricks)
            if hit != -1:
                bricks.pop(hit)
                ball_vy = -ball_vy
                score += 10

            if ball.top > HEIGHT:
                lives -= 1
                ball_x, ball_y, ball_vx, ball_vy = start_ball()

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

```check
run ".venv/Scripts/python -m pytest -q" stdout="passed" label="all the tests pass" -- The seven argument tests from lesson 2.4 should pass with the reference parse_args.
```

## None, caught before the game runs

**Build:** replace lesson 1.5's `-1` for "no brick hit" with `None`, and leave one mistake in, on purpose.

```python file=breakout.py
import os
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
USAGE = "usage: python breakout.py [--test-run FRAMES [--hold left|right|none|auto] [--lag-at FRAME]]"



def clamp(value, low, high):
    return max(low, min(value, high))


def number_after(args, name):
    if name not in args:
        return None
    i = args.index(name)
    if i + 1 >= len(args) or not args[i + 1].isdigit():
        print(USAGE)
        sys.exit(2)
    return int(args[i + 1])


def parse_args(args):
    # A test run lets another program play the game, with no window:
    #   python breakout.py --test-run FRAMES [--hold left|right|none|auto] [--lag-at FRAME]
    test_frames = number_after(args, "--test-run")
    lag_at = number_after(args, "--lag-at")
    hold = "none"
    if "--hold" in args:
        i = args.index("--hold")
        if i + 1 >= len(args) or args[i + 1] not in HOLDS:
            print(USAGE)
            sys.exit(2)
        hold = args[i + 1]
    return test_frames, hold, lag_at


def start_ball():
    return WIDTH / 2, HEIGHT / 2, BALL_SPEED * 0.6, -BALL_SPEED * 0.8


def move_paddle(paddle_x, direction, dt):
    return clamp(paddle_x + direction * PADDLE_SPEED * dt, 0, WIDTH - PADDLE_WIDTH)


def autopilot(ball_x, paddle_x):
    middle = paddle_x + PADDLE_WIDTH / 2
    if ball_x < middle - 10:
        return -1
    if ball_x > middle + 10:
        return 1
    return 0


def bounce_off_walls(x, y, vx, vy):
    if x < BALL_RADIUS:
        x, vx = BALL_RADIUS, abs(vx)
    if x > WIDTH - BALL_RADIUS:
        x, vx = WIDTH - BALL_RADIUS, -abs(vx)
    if y < BALL_RADIUS:
        y, vy = BALL_RADIUS, abs(vy)
    return x, y, vx, vy


def bounce_off_paddle(ball, paddle, vx, vy):
    if ball.colliderect(paddle) and vy > 0:
        offset = (ball.centerx - paddle.centerx) / (paddle.width / 2)
        return BALL_SPEED * 0.8 * offset, -vy
    return vx, vy


def make_bricks():
    bricks = []
    for row in range(len(ROW_COLOURS)):
        for col in range(8):
            x = WALL_LEFT + col * (BRICK_WIDTH + BRICK_GAP)
            y = WALL_TOP + row * (BRICK_HEIGHT + BRICK_GAP)
            bricks.append(pygame.Rect(x, y, BRICK_WIDTH, BRICK_HEIGHT))
    return bricks


def brick_colour(brick):
    row = (brick.y - WALL_TOP) // (BRICK_HEIGHT + BRICK_GAP)
    return ROW_COLOURS[row]


def hit_brick(ball, bricks):
    i = ball.collidelist(bricks)
    if i == -1:
        return None
    return i


def draw(screen, font, paddle, ball, bricks, score, lives):
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


def main(args):
    test_frames, hold, lag_at = parse_args(args)
    if test_frames is not None:
        os.environ["SDL_VIDEODRIVER"] = "dummy"

    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Breakout")
    clock = pygame.time.Clock()
    font = pygame.font.Font(None, 36)

    paddle = pygame.Rect(0, 0, PADDLE_WIDTH, PADDLE_HEIGHT)
    paddle.midbottom = (WIDTH // 2, HEIGHT - 30)
    paddle_x = float(paddle.x)

    ball = pygame.Rect(0, 0, BALL_RADIUS * 2, BALL_RADIUS * 2)
    ball_x, ball_y, ball_vx, ball_vy = start_ball()

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
            if hit != -1:
                bricks.pop(hit)
                ball_vy = -ball_vy
                score += 10

            if ball.top > HEIGHT:
                lives -= 1
                ball_x, ball_y, ball_vx, ball_vy = start_ball()

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

The new function `hit_brick` returns the index of the brick the ball overlaps, or `None` if there isn't one: lesson 1.5 called the `-1` convention "a weak one", and `None` is Python's own value for "nothing". It's a new function, rather than a change inside the loop, so that its result has a type pyright works out and reports: `int | None`. But the loop still compares with `-1`. Don't run the game.

```predict
question: pyright reads the file without running it. Will it report a problem, and where?
choice: No problem: the code ran fine before
choice: Yes, on the `if hit != -1:` line
choice: Yes, on the `bricks.pop(hit)` line
answer: Yes, on the `bricks.pop(hit)` line
explain: Comparing `None` with `-1` is perfectly legal (it's just `True`), so the `if` line is fine. The problem is what happens next: inside the `if`, `hit` might still be `None`, and `pop` needs a whole-number index. pyright reports the line where `None` would be *used* wrongly, which is line 184.
```

Ask pyright:

```powershell
.venv\Scripts\python -m pyright breakout.py
```

```text
  breakout.py:184:28 - error: Argument of type "int | None" cannot be assigned to parameter "index" of type "SupportsIndex" in function "pop"
    Type "int | None" is not assignable to type "SupportsIndex"
      "None" is incompatible with protocol "SupportsIndex"
        "__index__" is not present (reportArgumentType)
1 error, 0 warnings, 0 informations
```

**Understand: how pyright found it, without running anything.**

1. `hit_brick` has two `return` statements: one returns `None`, the other `i`, an `int`. So its return type is **`int | None`**: *either an int or None*. The `|` makes a **union type**, a type that allows any one of several.
2. `hit = hit_brick(ball, bricks)`, so `hit` is `int | None`.
3. `if hit != -1:` doesn't rule `None` out: `None != -1` is `True`. So inside the `if`, `hit` can still be `None`.
4. `bricks.pop(hit)` needs an index, a value that can act as a whole number (the `SupportsIndex` in the message), and `None` can't. In pyright's messages a **protocol** means "any type that has certain methods": `SupportsIndex` is any type with an `__index__` method, the method that lets a value be used as a list index. `int` has one; `None` doesn't.

So on any frame where the ball hits no brick, which is nearly every frame, the game would crash. Run the tests to confirm:

```powershell
.venv\Scripts\python -m pytest -q
```

```text
7 failed, 26 passed in 5.94s
```

Every one of the seven is a characterisation test, and every failure is an `AssertionError` whose actual value is pygame's greeting line, `pygame-ce 2.5.8 (SDL ...)`: the last thing the game printed before it crashed. The crash itself happened inside the game's own process, whose error output `play` captures and never shows. To see it, run the game yourself:

```powershell
.venv\Scripts\python breakout.py --test-run 60
```

The traceback ends in `TypeError: 'NoneType' object cannot be interpreted as an integer`. A test that fails for a reason it can't see is common with whole-program tests, and running the program directly is the way to the real error. The tests found it by running the game; pyright found it in two seconds by reading 200 lines. On a line that only runs in rare situations, the tests might never have found it at all.

> **Engineer:** `None` where a real value was expected is the most common crash in Python, and its cousins are the most common in C# (`NullReferenceException`) and Java (`NullPointerException`). Its inventor, Tony Hoare, called the null reference his "billion-dollar mistake". Writing `X | None` and having a checker insist that every use checks for `None` first turns that whole family of crashes into errors you see before running.

```check
run ".venv/Scripts/python -m pyright breakout.py" exit=1 stdout="int | None" label="pyright reports the unchecked None" -- This step's file deliberately keeps if hit != -1: so that pyright has something to find.
```

## Check for None

**Build:** fix the comparison.

```python file=breakout.py
import os
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
USAGE = "usage: python breakout.py [--test-run FRAMES [--hold left|right|none|auto] [--lag-at FRAME]]"



def clamp(value, low, high):
    return max(low, min(value, high))


def number_after(args, name):
    if name not in args:
        return None
    i = args.index(name)
    if i + 1 >= len(args) or not args[i + 1].isdigit():
        print(USAGE)
        sys.exit(2)
    return int(args[i + 1])


def parse_args(args):
    # A test run lets another program play the game, with no window:
    #   python breakout.py --test-run FRAMES [--hold left|right|none|auto] [--lag-at FRAME]
    test_frames = number_after(args, "--test-run")
    lag_at = number_after(args, "--lag-at")
    hold = "none"
    if "--hold" in args:
        i = args.index("--hold")
        if i + 1 >= len(args) or args[i + 1] not in HOLDS:
            print(USAGE)
            sys.exit(2)
        hold = args[i + 1]
    return test_frames, hold, lag_at


def start_ball():
    return WIDTH / 2, HEIGHT / 2, BALL_SPEED * 0.6, -BALL_SPEED * 0.8


def move_paddle(paddle_x, direction, dt):
    return clamp(paddle_x + direction * PADDLE_SPEED * dt, 0, WIDTH - PADDLE_WIDTH)


def autopilot(ball_x, paddle_x):
    middle = paddle_x + PADDLE_WIDTH / 2
    if ball_x < middle - 10:
        return -1
    if ball_x > middle + 10:
        return 1
    return 0


def bounce_off_walls(x, y, vx, vy):
    if x < BALL_RADIUS:
        x, vx = BALL_RADIUS, abs(vx)
    if x > WIDTH - BALL_RADIUS:
        x, vx = WIDTH - BALL_RADIUS, -abs(vx)
    if y < BALL_RADIUS:
        y, vy = BALL_RADIUS, abs(vy)
    return x, y, vx, vy


def bounce_off_paddle(ball, paddle, vx, vy):
    if ball.colliderect(paddle) and vy > 0:
        offset = (ball.centerx - paddle.centerx) / (paddle.width / 2)
        return BALL_SPEED * 0.8 * offset, -vy
    return vx, vy


def make_bricks():
    bricks = []
    for row in range(len(ROW_COLOURS)):
        for col in range(8):
            x = WALL_LEFT + col * (BRICK_WIDTH + BRICK_GAP)
            y = WALL_TOP + row * (BRICK_HEIGHT + BRICK_GAP)
            bricks.append(pygame.Rect(x, y, BRICK_WIDTH, BRICK_HEIGHT))
    return bricks


def brick_colour(brick):
    row = (brick.y - WALL_TOP) // (BRICK_HEIGHT + BRICK_GAP)
    return ROW_COLOURS[row]


def hit_brick(ball, bricks):
    i = ball.collidelist(bricks)
    if i == -1:
        return None
    return i


def draw(screen, font, paddle, ball, bricks, score, lives):
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


def main(args):
    test_frames, hold, lag_at = parse_args(args)
    if test_frames is not None:
        os.environ["SDL_VIDEODRIVER"] = "dummy"

    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Breakout")
    clock = pygame.time.Clock()
    font = pygame.font.Font(None, 36)

    paddle = pygame.Rect(0, 0, PADDLE_WIDTH, PADDLE_HEIGHT)
    paddle.midbottom = (WIDTH // 2, HEIGHT - 30)
    paddle_x = float(paddle.x)

    ball = pygame.Rect(0, 0, BALL_RADIUS * 2, BALL_RADIUS * 2)
    ball_x, ball_y, ball_vx, ball_vy = start_ball()

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
                ball_x, ball_y, ball_vx, ball_vy = start_ball()

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

```powershell
.venv\Scripts\python -m pyright breakout.py
.venv\Scripts\python -m pytest -q
```

```text
0 errors, 0 warnings, 0 informations
33 passed in 8.06s
```

Try union types and narrowing on their own first. Create `scratch/maybe.py`:

```python
def first_even(numbers: list[int]) -> int | None:
    for n in numbers:
        if n % 2 == 0:
            return n
    return None


x = first_even([1, 3])
reveal_type(x)
print(x + 1)
if x is not None:
    reveal_type(x)
    print(x + 1)
```

```powershell
.venv\Scripts\python -m pyright scratch\maybe.py
```

```text
  scratch\maybe.py:9:13 - information: Type of "x" is "int | None"
  scratch\maybe.py:10:7 - error: Operator "+" not supported for "None" (reportOptionalOperand)
  scratch\maybe.py:12:17 - information: Type of "x" is "int"
1 error, 0 warnings, 2 informations
```

**`reveal_type(x)`** asks pyright to report the type it has worked out for `x` at that line: the way to see what pyright **infers**, the types it works out for itself without being told (VS Code shows the same when you hover over a name). Outside the `if`, `x` is `int | None`, and `x + 1` is an error; inside `if x is not None:`, the same `x` is `int`. `reveal_type` is a message to pyright only: Python doesn't know it, and `python scratch\maybe.py` stops with `NameError: name 'reveal_type' is not defined`. Delete the two `reveal_type` lines and run it again: now it fails with `TypeError: unsupported operand type(s) for +: 'NoneType' and 'int'`, the crash pyright predicted.

**Understand: narrowing.** Inside `if hit is not None:`, pyright knows `hit` can't be `None`, because the block only runs when it isn't: so `hit` is narrowed from `int | None` to plain `int`, and `bricks.pop(hit)` is fine. This is called **type narrowing**, and it works with `is None`, `is not None`, and other checks pyright understands, such as `isinstance(value, int)`, which asks whether a value is of a given type.

```check
run ".venv/Scripts/python -m pyright breakout.py" stdout="0 errors" label="pyright is satisfied" -- Compare with None: if hit is not None:
run ".venv/Scripts/python -m pytest -q" stdout="33 passed" label="and every test passes"
```

## Write the types down

**Build:** **type hints**: the types of some functions' parameters and results, written in the code.

```python file=breakout.py
import os
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
USAGE = "usage: python breakout.py [--test-run FRAMES [--hold left|right|none|auto] [--lag-at FRAME]]"



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


def parse_args(args: list[str]) -> tuple[int | None, str, int | None]:
    # A test run lets another program play the game, with no window:
    #   python breakout.py --test-run FRAMES [--hold left|right|none|auto] [--lag-at FRAME]
    test_frames = number_after(args, "--test-run")
    lag_at = number_after(args, "--lag-at")
    hold = "none"
    if "--hold" in args:
        i = args.index("--hold")
        if i + 1 >= len(args) or args[i + 1] not in HOLDS:
            print(USAGE)
            sys.exit(2)
        hold = args[i + 1]
    return test_frames, hold, lag_at


def start_ball() -> tuple[float, float, float, float]:
    return WIDTH / 2, HEIGHT / 2, BALL_SPEED * 0.6, -BALL_SPEED * 0.8


def move_paddle(paddle_x, direction, dt):
    return clamp(paddle_x + direction * PADDLE_SPEED * dt, 0, WIDTH - PADDLE_WIDTH)


def autopilot(ball_x, paddle_x):
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


def bounce_off_paddle(ball, paddle, vx, vy):
    if ball.colliderect(paddle) and vy > 0:
        offset = (ball.centerx - paddle.centerx) / (paddle.width / 2)
        return BALL_SPEED * 0.8 * offset, -vy
    return vx, vy


def make_bricks():
    bricks = []
    for row in range(len(ROW_COLOURS)):
        for col in range(8):
            x = WALL_LEFT + col * (BRICK_WIDTH + BRICK_GAP)
            y = WALL_TOP + row * (BRICK_HEIGHT + BRICK_GAP)
            bricks.append(pygame.Rect(x, y, BRICK_WIDTH, BRICK_HEIGHT))
    return bricks


def brick_colour(brick):
    row = (brick.y - WALL_TOP) // (BRICK_HEIGHT + BRICK_GAP)
    return ROW_COLOURS[row]


def hit_brick(ball: pygame.Rect, bricks: list[pygame.Rect]) -> int | None:
    i = ball.collidelist(bricks)
    if i == -1:
        return None
    return i


def draw(screen, font, paddle, ball, bricks, score, lives):
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


def main(args):
    test_frames, hold, lag_at = parse_args(args)
    if test_frames is not None:
        os.environ["SDL_VIDEODRIVER"] = "dummy"

    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Breakout")
    clock = pygame.time.Clock()
    font = pygame.font.Font(None, 36)

    paddle = pygame.Rect(0, 0, PADDLE_WIDTH, PADDLE_HEIGHT)
    paddle.midbottom = (WIDTH // 2, HEIGHT - 30)
    paddle_x = float(paddle.x)

    ball = pygame.Rect(0, 0, BALL_RADIUS * 2, BALL_RADIUS * 2)
    ball_x, ball_y, ball_vx, ball_vy = start_ball()

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
                ball_x, ball_y, ball_vx, ball_vy = start_ball()

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

**Understand: the syntax.** A **type hint** (or **annotation**) after a parameter says what type it should be, and `->` before the colon says what the function returns:

```python
def clamp(value: float, low: float, high: float) -> float:
```

- `float` accepts an `int` too: pyright treats whole numbers as acceptable wherever a float is expected, as maths does (a special rule called **int-to-float promotion**). It only goes that way: a hint of `int` doesn't accept `3.5`.
- `list[str]` is a list whose items are all strings; `list[pygame.Rect]`, a list of `Rect`s. A type that takes another type in square brackets, like `list`, is a **generic** type.
- An empty list says nothing about what will go in it, so `bricks = []` would leave pyright guessing. A **variable annotation**, `bricks: list[pygame.Rect] = []`, says it, the same `name: type` as a parameter. Chapter 4's strict mode will insist on it; for now pyright accepts the guess.
- `tuple[float, float, float, float]` is a tuple of exactly four floats, in that order: the four values `start_ball` and `bounce_off_walls` return.
- `int | None` is an int or `None`.
- `tuple[int | None, str, int | None]` for `parse_args`: frames (or `None`), the hold, the lag frame (or `None`).

**Hints are not checked when the program runs.** See it for yourself first, in `scratch/hints_demo.py`:

```python
def double(n: int) -> int:
    return n * 2


print(double(21))
print(double("ab"))
```

```predict
question: `double` says it takes an `int`. What does `python scratch\hints_demo.py` print on its second line, for `double("ab")`?
choice: An error: "ab" isn't an int
choice: abab
choice: Nothing: it skips the call
answer: abab
explain: Python runs the function exactly as written, and `"ab" * 2` is `"abab"`: repeating a string is perfectly legal. The hint `n: int` is stored and otherwise ignored when the program runs. `.venv\Scripts\python -m pyright scratch\hints_demo.py` is what objects: `Argument of type "Literal['ab']" cannot be assigned to parameter "n" of type "int"`. (`Literal['ab']` is pyright's name for "exactly the text 'ab'".)
```

Python stores hints and otherwise ignores them: `clamp("a", "b", "c")` runs without any error and returns `"b"`, because `min` and `max` also work on strings, comparing them alphabetically: a nonsense call, a nonsense answer, and nothing to warn you. (`clamp("a", 0, 3)` would at least fail, inside `min`.) That's exactly the kind of mistake a checker exists for. They're for **readers** and for **tools**: they say exactly what a function accepts and returns, without reading its body, and pyright uses them to check every call against the function and every function against its own body. Now `breakout.start_ball()[5]` is an error pyright reports (a four-item tuple has no index 5), and so is calling `clamp` with a string.

> **Engineer:** a type hint is **documentation that can't go out of date**. A comment saying "returns the new position" can be wrong and nothing notices; a hint saying `-> float` is checked every time pyright runs. That's the same reason `requirements.txt` beats a note saying which packages to install.

```check
contains breakout.py "def clamp(value: float, low: float, high: float) -> float:"
contains breakout.py "def hit_brick(ball: pygame.Rect, bricks: list[pygame.Rect]) -> int | None:"
run ".venv/Scripts/python -m pyright breakout.py" stdout="0 errors" label="pyright is satisfied"
run ".venv/Scripts/python -m pytest -q" stdout="33 passed"
```

## Your turn: type every function

**Build, on your own:** hints on every function, enforced from now on.

First, make missing hints an error. Change `pyrightconfig.json` to:

```json
{ "venvPath": ".", "venv": ".venv", "reportMissingParameterType": "error" }
```

pyright now reports 18 errors: every parameter without a hint. Add hints to every remaining function (`move_paddle`, `autopilot`, `bounce_off_paddle`, `make_bricks`, `brick_colour`, `draw` and `main`), including a return type for each, until pyright reports 0 errors and all 33 tests still pass. A function that returns nothing has the return type `None`. A class's name works as a type: `paddle: pygame.Rect`. `reportMissingParameterType` only makes pyright insist on **parameter** hints; it won't complain about a missing return type, so adding those is your job here, and Chapter 4's strict mode will insist on them too.

Some types you'll need: a direction is an `int`; a colour is `tuple[int, int, int]`; the screen is a `pygame.Surface`; the font is a `pygame.font.Font`.

Then raise the bar again: in `BACKLOG.md`, make the definition of done say that `.venv\Scripts\python -m pyright breakout.py` reports no errors as well. Commit with a message that mentions **types**.

```hints
nudge: Take one function at a time, starting with `autopilot`. What are `ball_x` and `paddle_x` (look at where `main` gets them), and what does it return (look at its `return` lines)? Run pyright after each function and watch the count go down.
concept: Read each type off the code: the positions and speeds are floats, `direction` is −1, 0 or 1, so `int`, and the `Rect`s are `pygame.Rect`. A function's return type is the type of what its `return` statements give back: `bounce_off_paddle` returns two floats, `tuple[float, float]`; `make_bricks` returns `bricks`, a `list[pygame.Rect]`. `draw` and `main` don't return anything, so `-> None`.
shape: Every `def` line gets `name: type` for each parameter and `-> type` before the colon. A long `def` line can be split inside its parentheses, with the second line indented to line up.
answer: ~~~python
def move_paddle(paddle_x: float, direction: int, dt: float) -> float:
def autopilot(ball_x: float, paddle_x: float) -> int:
def bounce_off_paddle(ball: pygame.Rect, paddle: pygame.Rect, vx: float, vy: float) -> tuple[float, float]:
def make_bricks() -> list[pygame.Rect]:
def brick_colour(brick: pygame.Rect) -> tuple[int, int, int]:
def draw(screen: pygame.Surface, font: pygame.font.Font, paddle: pygame.Rect, ball: pygame.Rect,
         bricks: list[pygame.Rect], score: int, lives: int) -> None:
def main(args: list[str]) -> None:
~~~

`draw`'s `def` line is split in two: inside parentheses, Python lets a line continue on the next, and lining the second line up with the first parameter is the usual style. The next lesson's first step shows the whole file.
```

```check
contains pyrightconfig.json "reportMissingParameterType" -- Add "reportMissingParameterType": "error" to pyrightconfig.json.
run ".venv/Scripts/python -m pyright breakout.py" stdout="0 errors" label="every parameter has a type, and pyright finds no errors" -- Run pyright and read which parameters still lack a hint.
contains breakout.py "def autopilot(ball_x: float, paddle_x: float) -> int:"
run ".venv/Scripts/python -m pytest -q" stdout="33 passed" label="every test still passes"
contains BACKLOG.md "pyright" -- Add pyright to the definition of done in BACKLOG.md.
git-message "types"
git-clean
```

## Challenge: typos the checker can see

**Optional, ★.** `hold` is a `str`, so `elif hold == "rigth":` would pass pyright and never be true. Change its type to `Literal["left", "right", "none", "auto"]` (import `Literal` from `typing`): a type that allows only those exact strings. Then write the misspelt comparison and see pyright report it.

## Challenge: type the tests too

**Optional, ★★.** Run `.venv\Scripts\python -m pyright tests`, add `-> None` to every test function and a type to every helper, and fix what it reports. The tests are code too; Chapter 4 makes checking them part of the definition of done.

## Challenge: a taste of strict

**Optional, ★★★.** On a copy, set `"typeCheckingMode": "strict"` in `pyrightconfig.json` and fix every error in `breakout.py`: missing annotations, values whose type pyright can't know. Reading strict-mode messages is what Chapter 4 asks of you; this is the preview. Then `git restore` both files.

## What did we actually learn?

- **Every value has a type**, which decides what can be done with it. Python checks types as each operation runs; a **type checker** checks them by reading the code, before it runs, on every line.
- **Inference**: pyright works out most types itself. **Hints** write the rest down, as documentation a tool keeps honest.
- **`X | None`** says a value might be missing; **narrowing** with `is not None` proves it isn't. Together they turn the most common crash into an error found before running.
- **Tests and type checks catch different things**: tests check behaviour on the inputs they try; types check the shape of every value on every line, but not whether the numbers are right.
- **The definition of done grows again**: tests pass *and* the type checker is satisfied.

This is where Python meets C# and Java most directly. `def clamp(value: float, low: float, high: float) -> float` is `static double Clamp(double value, double low, double high)` in both, with the difference that their compilers *refuse to run* code with type errors, while Python runs it anyway and leaves the checking to a tool you run. `int | None` is C#'s `int?` (a "nullable" int), and for objects, C#'s nullable reference types (`Rect?`) are the same idea as `Rect | None`, checked the same way. Java's `Optional<Rect>` expresses the idea too, but Java's compiler doesn't make you check it; extra tools such as NullAway add that. Chapter 4 turns on pyright's **strict** mode, which brings it closer still.
