---
title: 2.2 — Name the Parts
runtime: python
run: breakout.py
---

The safety net is in place. Now the script can be taken apart into **functions**: named pieces, each doing one job, with clear inputs and outputs. Every step of this lesson changes the code's **structure** and must not change its **behaviour**, so after each one you'll run the characterisation tests, and all eight must still pass.

> **Refactoring**: changing the structure of code without changing what it does. The tests are how you know you haven't changed what it does.

You've written functions before. This lesson is about using them to fix specific problems from lesson 1.6's list, and about exactly what happens to variables when a function runs.

## One ball, one place

**Build:** the ball's starting values in one function, used in both places.

```python file=breakout.py
import os
import sys

import pygame

# A test run lets another program play the game, with no window:
#   python breakout.py --test-run FRAMES [--hold left|right|none|auto] [--lag-at FRAME]
args = sys.argv[1:]
test_frames = None
if "--test-run" in args:
    i = args.index("--test-run")
    if i + 1 >= len(args) or not args[i + 1].isdigit():
        print("usage: python breakout.py [--test-run FRAMES]")
        sys.exit(2)
    test_frames = int(args[i + 1])
    os.environ["SDL_VIDEODRIVER"] = "dummy"
hold = "none"
if "--hold" in args:
    hold = args[args.index("--hold") + 1]
lag_at = None
if "--lag-at" in args:
    lag_at = int(args[args.index("--lag-at") + 1])

WIDTH, HEIGHT = 640, 480
BACKGROUND = (24, 26, 33)
PADDLE_COLOUR = (94, 234, 212)
BALL_COLOUR = (245, 245, 245)
TEXT_COLOUR = (230, 230, 230)
ROW_COLOURS = [(239, 68, 68), (249, 115, 22), (234, 179, 8), (34, 197, 94), (59, 130, 246)]
PADDLE_SPEED = 420
BALL_SPEED = 300



def start_ball():
    return WIDTH / 2, HEIGHT / 2, BALL_SPEED * 0.6, -BALL_SPEED * 0.8


pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Breakout")
clock = pygame.time.Clock()
font = pygame.font.Font(None, 36)

paddle = pygame.Rect(0, 0, 100, 14)
paddle.midbottom = (WIDTH // 2, HEIGHT - 30)
paddle_x = float(paddle.x)

ball = pygame.Rect(0, 0, 12, 12)
ball_x, ball_y, ball_vx, ball_vy = start_ball()

bricks = []
for row in range(5):
    for col in range(8):
        bricks.append(pygame.Rect(16 + col * 76, 60 + row * 26, 70, 20))

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
            if ball_x < paddle_x + 40:
                direction = -1
            elif ball_x > paddle_x + 60:
                direction = 1
        paddle_x += direction * PADDLE_SPEED * dt
        paddle_x = max(0, min(paddle_x, WIDTH - paddle.width))
        paddle.x = round(paddle_x)

        ball_x += ball_vx * dt
        ball_y += ball_vy * dt
        if ball_x < 6:
            ball_x = 6
            ball_vx = abs(ball_vx)
        if ball_x > WIDTH - 6:
            ball_x = WIDTH - 6
            ball_vx = -abs(ball_vx)
        if ball_y < 6:
            ball_y = 6
            ball_vy = abs(ball_vy)
        ball.center = (round(ball_x), round(ball_y))

        if ball.colliderect(paddle) and ball_vy > 0:
            offset = (ball.centerx - paddle.centerx) / 50
            ball_vx = BALL_SPEED * 0.8 * offset
            ball_vy = -ball_vy

        hit = ball.collidelist(bricks)
        if hit != -1:
            bricks.pop(hit)
            ball_vy = -ball_vy
            score += 10

        if ball.top > HEIGHT:
            lives -= 1
            ball_x, ball_y, ball_vx, ball_vy = start_ball()

    screen.fill(BACKGROUND)
    for brick in bricks:
        pygame.draw.rect(screen, ROW_COLOURS[(brick.y - 60) // 26], brick)
    pygame.draw.rect(screen, PADDLE_COLOUR, paddle)
    pygame.draw.ellipse(screen, BALL_COLOUR, ball)
    screen.blit(font.render(f"Score {score}   Lives {lives}", True, TEXT_COLOUR), (16, 16))
    if lives == 0:
        screen.blit(font.render("Game over", True, TEXT_COLOUR), (260, 240))
    elif not bricks:
        screen.blit(font.render("You win!", True, TEXT_COLOUR), (270, 240))
    pygame.display.flip()

    frames += 1
    if test_frames is not None and frames >= test_frames:
        running = False

pygame.quit()
if test_frames is not None:
    inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(ball)
    print(f"frames={frames} paddle_x={paddle.x} score={score} lives={lives} bricks={len(bricks)} inside={inside}")
```

Run the tests:

```powershell
.venv\Scripts\python -m pytest -q
```

```text
........                                                                 [100%]
8 passed in 8.06s
```

**Understand: what a function call does.** `def start_ball():` creates a function and binds it to the name `start_ball`; the body doesn't run yet. Each **call**, `start_ball()`, does this:

1. Python creates a new **frame** for the call (lesson 0.3's call stack), with its own empty set of local variables.
2. It runs the body from the top. `return WIDTH / 2, HEIGHT / 2, …` evaluates the four expressions, packs them into a tuple `(320.0, 240.0, 180.0, -240.0)`, and ends the call, handing the tuple back.
3. The frame is thrown away, and the call expression *becomes* the returned value.

Then `ball_x, ball_y, ball_vx, ball_vy = start_ball()` unpacks the tuple into four variables, as `WIDTH, HEIGHT = 640, 480` did in lesson 1.1. The number of names on the left must match the number of items: four names and three values would raise `ValueError: not enough values to unpack`.

**What it fixes.** Debt item: *the ball's starting values are set twice.* Now they're set once, and the two places that need them both ask the function. Change the starting speed in `start_ball` and both the first ball and every ball after a miss change together. A function is a **name for a piece of knowledge**: "how a ball starts" now lives in exactly one place.

> **Engineer:** **don't repeat yourself** (often shortened to *DRY*): every piece of knowledge should have one authoritative place in the code. The test isn't "do these lines look the same?" but "if one changes, must the other change too?" If so, they're the same knowledge, and belong in one place.

```check
contains breakout.py "def start_ball():"
run ".venv/Scripts/python -m pytest -q" stdout="8 passed" label="all eight characterisation tests still pass" -- A refactoring must not change behaviour: compare start_ball's return values with the four lines it replaced.
```

## Where names live

**Build:** nothing to keep. Find out how Python decides which variable a name means inside a function.

`start_ball` reads `WIDTH` and `BALL_SPEED`, which are defined at the top level of the file, outside any function. Reading them works. Changing one is different. Run this in the terminal:

```powershell
python -c "exec('speed = 300\ndef faster():\n    speed = speed + 10\n    return speed\nprint(faster())')"
```

That's this small program, run through `exec` so it fits on one command line:

```python
speed = 300
def faster():
    speed = speed + 10
    return speed
print(faster())
```

```predict
question: What will it print?
choice: 310
choice: 300
choice: An error
answer: An error
explain: `UnboundLocalError: cannot access local variable 'speed' where it is not associated with a value`. Before a function runs, Python looks at its whole body. Any name that's **assigned** anywhere in the function is **local** to it, for the whole function. `speed = speed + 10` assigns to `speed`, so inside `faster`, `speed` always means the local one, even on the right-hand side, which is evaluated first, when the local `speed` doesn't have a value yet. The global `speed` is never even looked at.
```

**Understand: scope.** When Python meets a name inside a function, it looks it up in this order, and uses the first place that has it:

1. **Local**: the function's own variables (its parameters, and any name assigned in its body).
2. **Enclosing**: the variables of a function this one is written inside, if any.
3. **Global**: the names defined at the top level of the file (the module).
4. **Built-in**: Python's own names, like `print`, `len`, `max`.

This is called the **LEGB rule**, and it's one more lookup order, like `PATH` and `sys.path`. The important consequence: **a function can read a global, but assigning to a name makes a new local instead of changing the global.** (There is a `global` keyword that lets a function change a global variable. It's almost always a sign that the function should return a value instead, so this series never uses it.)

That's why the functions in this lesson **return** their results instead of changing the game's variables: `start_ball` doesn't set `ball_x`, it returns a value and the caller decides where it goes.

> **Engineer:** a function that only reads its inputs and returns a result can be understood on its own: everything it can affect is in its `return`. A function that changes things outside itself has effects you can only find by reading its body. Keeping the changing to the caller is what makes the next steps testable.

## Bounces with names

**Build:** the wall and paddle bounces become functions, and the magic numbers get names.

```python file=breakout.py
import os
import sys

import pygame

# A test run lets another program play the game, with no window:
#   python breakout.py --test-run FRAMES [--hold left|right|none|auto] [--lag-at FRAME]
args = sys.argv[1:]
test_frames = None
if "--test-run" in args:
    i = args.index("--test-run")
    if i + 1 >= len(args) or not args[i + 1].isdigit():
        print("usage: python breakout.py [--test-run FRAMES]")
        sys.exit(2)
    test_frames = int(args[i + 1])
    os.environ["SDL_VIDEODRIVER"] = "dummy"
hold = "none"
if "--hold" in args:
    hold = args[args.index("--hold") + 1]
lag_at = None
if "--lag-at" in args:
    lag_at = int(args[args.index("--lag-at") + 1])

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



def clamp(value, low, high):
    return max(low, min(value, high))


def start_ball():
    return WIDTH / 2, HEIGHT / 2, BALL_SPEED * 0.6, -BALL_SPEED * 0.8


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

bricks = []
for row in range(5):
    for col in range(8):
        bricks.append(pygame.Rect(16 + col * 76, 60 + row * 26, 70, 20))

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
            if ball_x < paddle_x + 40:
                direction = -1
            elif ball_x > paddle_x + 60:
                direction = 1
        paddle_x += direction * PADDLE_SPEED * dt
        paddle_x = clamp(paddle_x, 0, WIDTH - PADDLE_WIDTH)
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

    screen.fill(BACKGROUND)
    for brick in bricks:
        pygame.draw.rect(screen, ROW_COLOURS[(brick.y - 60) // 26], brick)
    pygame.draw.rect(screen, PADDLE_COLOUR, paddle)
    pygame.draw.ellipse(screen, BALL_COLOUR, ball)
    screen.blit(font.render(f"Score {score}   Lives {lives}", True, TEXT_COLOUR), (16, 16))
    if lives == 0:
        screen.blit(font.render("Game over", True, TEXT_COLOUR), (260, 240))
    elif not bricks:
        screen.blit(font.render("You win!", True, TEXT_COLOUR), (270, 240))
    pygame.display.flip()

    frames += 1
    if test_frames is not None and frames >= test_frames:
        running = False

pygame.quit()
if test_frames is not None:
    inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(ball)
    print(f"frames={frames} paddle_x={paddle.x} score={score} lives={lives} bricks={len(bricks)} inside={inside}")
```

**Understand: the new functions.**

`clamp(value, low, high)` is lesson 1.3's `max(low, min(value, high))`, with a name that says what it does. The paddle line now reads `clamp(paddle_x, 0, WIDTH - PADDLE_WIDTH)`.

`bounce_off_walls(x, y, vx, vy)` receives the ball's position and velocity as **parameters**: local variables that start with the values the caller passes. It changes its *local* copies and returns all four. The caller unpacks them back into its own variables. Nothing outside the function is touched by it.

`x, vx = BALL_RADIUS, abs(vx)` assigns two names at once. Python evaluates the **whole right-hand side first**, `(6, abs(vx))`, and only then assigns, so the order never matters. That's why `a, b = b, a` swaps two variables.

`bounce_off_paddle(ball, paddle, vx, vy)` returns new velocities if the ball is touching the paddle and moving down, and the unchanged ones otherwise. `paddle.width / 2` replaces the `50` that was half the paddle's width, so the steering stays right if the paddle's size changes.

**Magic numbers, named.** `PADDLE_WIDTH`, `PADDLE_HEIGHT` and `BALL_RADIUS` replace `100`, `14`, `12` and six `6`s. The ball's `Rect` is now `BALL_RADIUS * 2` wide: the relationship is written down, not remembered.

> **Pure function**: a function whose result depends only on its arguments, and which changes nothing outside itself. Called twice with the same arguments, it returns the same result, and calling it has no other effect. `clamp`, `start_ball` and `bounce_off_walls` are pure; `bounce_off_paddle` is too: it reads the two `Rect`s it's given but doesn't change them.

A pure function is the easiest thing in programming to test: give it inputs, compare its output. Lesson 2.4 does exactly that.

```check
contains breakout.py "def bounce_off_walls(x, y, vx, vy):"
contains breakout.py "def bounce_off_paddle(ball, paddle, vx, vy):"
run ".venv/Scripts/python -m pytest -q" stdout="8 passed" label="all eight characterisation tests still pass" -- Compare each function with the lines it replaced: the same conditions, the same results.
```

## Bricks and drawing

**Build:** building the wall, choosing brick colours, and drawing a frame each become a function.

```python file=breakout.py
import os
import sys

import pygame

# A test run lets another program play the game, with no window:
#   python breakout.py --test-run FRAMES [--hold left|right|none|auto] [--lag-at FRAME]
args = sys.argv[1:]
test_frames = None
if "--test-run" in args:
    i = args.index("--test-run")
    if i + 1 >= len(args) or not args[i + 1].isdigit():
        print("usage: python breakout.py [--test-run FRAMES]")
        sys.exit(2)
    test_frames = int(args[i + 1])
    os.environ["SDL_VIDEODRIVER"] = "dummy"
hold = "none"
if "--hold" in args:
    hold = args[args.index("--hold") + 1]
lag_at = None
if "--lag-at" in args:
    lag_at = int(args[args.index("--lag-at") + 1])

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



def clamp(value, low, high):
    return max(low, min(value, high))


def start_ball():
    return WIDTH / 2, HEIGHT / 2, BALL_SPEED * 0.6, -BALL_SPEED * 0.8


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
            if ball_x < paddle_x + 40:
                direction = -1
            elif ball_x > paddle_x + 60:
                direction = 1
        paddle_x += direction * PADDLE_SPEED * dt
        paddle_x = clamp(paddle_x, 0, WIDTH - PADDLE_WIDTH)
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
```

**Understand.** `make_bricks()` builds the wall from named constants and returns the list. `range(len(ROW_COLOURS))` makes as many rows as there are colours, so adding a sixth colour adds a sixth row.

`brick_colour(brick)` still works the row out backwards from `y`, but now from the **same constants** that `make_bricks` uses to place the rows. Lesson 1.6's crash came from two lines each holding their own copy of "rows are 26 apart". Now there's one copy, `BRICK_HEIGHT + BRICK_GAP`, used by both: change `BRICK_GAP` to 20 and the rows spread out with the right colours. (Try it: set `BRICK_GAP = 20`, run the game and look, then set it back to 6. The tests will remind you if you forget.)

`draw(screen, font, paddle, ball, bricks, score, lives)` is **not pure**: its whole purpose is a **side effect**, writing pixels into `screen`. That's fine. Programs exist to have effects: the aim isn't to have none, it's to keep them in clearly named places, separate from the calculations. Everything the frame shows is now passed in as an argument, so you can see from the call exactly what drawing depends on.

The main loop's drawing is now one line. Look at how the loop reads: events, then the update, then `draw(...)`, then `flip`. The structure of a frame, which was buried in 40 lines, is visible.

```check
contains breakout.py "def make_bricks():"
contains breakout.py "def draw(screen, font, paddle, ball, bricks, score, lives):"
lacks breakout.py "// 26" -- brick_colour should use the same constants as make_bricks: (brick.y - WALL_TOP) // (BRICK_HEIGHT + BRICK_GAP).
run ".venv/Scripts/python -m pytest -q" stdout="8 passed" label="all eight characterisation tests still pass"
```

## Your turn: the paddle's functions

**Build, on your own:** two more functions, then commit.

| Function | Takes | Returns |
|---|---|---|
| `move_paddle(paddle_x, direction, dt)` | the paddle's position, the direction (−1, 0 or 1) and `dt` | the new position, already clamped to the screen |
| `autopilot(ball_x, paddle_x)` | the ball's and the paddle's positions | −1, 0 or 1: the direction the autopilot steers |

Then use them in the loop in place of the code they replace. `autopilot` must make exactly the same decisions as the current code (left if the ball is more than 10 pixels left of the paddle's middle, right if more than 10 pixels right), and the tests will tell you if it doesn't. Write `PADDLE_WIDTH / 2` rather than 40 and 60.

When all eight tests pass, commit with a message that mentions **functions**.

Try it for about 15 minutes before taking a hint.

```hints
nudge: Find the lines that change `paddle_x` and the lines that set `direction` when `hold == "auto"`. Those are the bodies of the two functions. What does each one need to know (its parameters), and what does it produce (its return value)?
concept: `move_paddle` is the two lines `paddle_x += …` and `paddle_x = clamp(…)` combined into one expression, returned: the new position. `autopilot` turns "if the ball is left of the middle, direction is −1" into `return -1`. A function can have several `return` statements; the first one reached ends the call, so `if …: return -1`, then `if …: return 1`, then `return 0` covers all three cases without `elif`.
shape: Both functions go above `bounce_off_walls`. In the loop, the `hold == "auto"` branch becomes one line, `direction = autopilot(ball_x, paddle_x)`, and the two `paddle_x` lines become `paddle_x = move_paddle(paddle_x, direction, dt)`.
answer: ~~~python
def move_paddle(paddle_x, direction, dt):
    return clamp(paddle_x + direction * PADDLE_SPEED * dt, 0, WIDTH - PADDLE_WIDTH)


def autopilot(ball_x, paddle_x):
    middle = paddle_x + PADDLE_WIDTH / 2
    if ball_x < middle - 10:
        return -1
    if ball_x > middle + 10:
        return 1
    return 0
~~~

and in the loop:

~~~python
        elif hold == "auto":
            direction = autopilot(ball_x, paddle_x)
        paddle_x = move_paddle(paddle_x, direction, dt)
~~~

`middle - 10` is `paddle_x + 50 - 10`, the old `paddle_x + 40`, and `middle + 10` the old `paddle_x + 60`, so the decisions are identical, which the tests confirm. The next lesson's first step shows the whole file.
```

```check
contains breakout.py "def move_paddle(paddle_x, direction, dt):" -- Use exactly this name and these parameters.
contains breakout.py "def autopilot(ball_x, paddle_x):"
lacks breakout.py "paddle_x + 40" -- The loop should call autopilot instead of deciding inline.
run ".venv/Scripts/python -m pytest -q" stdout="8 passed" label="all eight characterisation tests still pass" -- autopilot must make the same decisions as before: left beyond 10 pixels left of the middle, right beyond 10 pixels right.
git-message "functions" -- Commit with a message that mentions functions.
git-clean
```

## What did we actually learn?

- **A function names a piece of knowledge**, so it lives in one place (DRY). A call gets its own frame, runs the body, and becomes the returned value.
- **Scope (LEGB)**: assigning a name inside a function makes it local; functions read globals but should return results rather than change them.
- **Pure functions** depend only on their arguments and change nothing else: the easiest code to understand and to test. **Side effects** (like drawing) are necessary, and best kept in clearly named places.
- **Named constants** replace magic numbers and write relationships down: `BALL_RADIUS * 2`, `BRICK_HEIGHT + BRICK_GAP`.
- **Refactoring under tests**: change structure in small steps, and run the tests after every one.

The file is longer than before (181 lines against 143), and that's fine: length was never the problem, *understanding* was, and the loop now reads as a list of named steps. But there's a catch you may have noticed. These functions are pure and easy to test, yet the tests still run the whole game. Why can't a test just call `bounce_off_walls(3, 100, -180, -240)` and check the answer? The next lesson finds out, and fixes it.

In C# and Java, every function is a **method** inside a class (`static` if it doesn't belong to an object), with its parameter and return types written out: `static double Clamp(double value, double low, double high)`. Their scope rules are simpler than Python's: a variable is local to the block where it's declared, and there's no way to accidentally make a new local by assigning. To return several values at once, C# has tuples much like Python's, `(double X, double Y)`, and Java uses a small `record` type.
