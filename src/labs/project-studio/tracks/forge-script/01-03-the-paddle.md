---
title: 1.3 — The Paddle
runtime: python
run: breakout.py
---

This lesson finishes the backlog's first story, **Move the paddle**: *left and right arrows move the paddle at the same speed on any computer, and the paddle never leaves the screen.* Each half of that sentence hides an idea every game depends on: where things are on a screen, and how to make movement take the same time on a fast computer and a slow one.

## The usage check so far

**Build:** make sure `breakout.py` matches the end of lesson 1.1, with the reference answer to its Your turn.

If your answer differs, the lines below show where. Yours may be fine; matching the reference means the rest of the chapter's steps line up with your file exactly.

```python file=breakout.py
import os
import sys

import pygame

# A test run lets another program play the game, with no window:
#   python breakout.py --test-run FRAMES
args = sys.argv[1:]
test_frames = None
if "--test-run" in args:
    i = args.index("--test-run")
    if i + 1 >= len(args) or not args[i + 1].isdigit():
        print("usage: python breakout.py [--test-run FRAMES]")
        sys.exit(2)
    test_frames = int(args[i + 1])
    os.environ["SDL_VIDEODRIVER"] = "dummy"

WIDTH, HEIGHT = 640, 480

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Breakout")
clock = pygame.time.Clock()

frames = 0
running = True
while running:
    if test_frames is None:
        clock.tick(60)

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
            running = False

    pygame.display.flip()

    frames += 1
    if test_frames is not None and frames >= test_frames:
        running = False

pygame.quit()
if test_frames is not None:
    print(f"frames={frames}")
```

```check
run ".venv/Scripts/python breakout.py --test-run" exit=2 stdout="usage: python breakout.py [--test-run FRAMES]"
run ".venv/Scripts/python breakout.py --test-run 5" stdout="frames=5"
```

## A background colour

**Build:** fill the window with a dark blue-grey instead of black.

A colour in pygame is three numbers. Name the colour as a constant, and at the start of each frame's drawing, fill the whole surface with it:

```python file=breakout.py
import os
import sys

import pygame

# A test run lets another program play the game, with no window:
#   python breakout.py --test-run FRAMES
args = sys.argv[1:]
test_frames = None
if "--test-run" in args:
    i = args.index("--test-run")
    if i + 1 >= len(args) or not args[i + 1].isdigit():
        print("usage: python breakout.py [--test-run FRAMES]")
        sys.exit(2)
    test_frames = int(args[i + 1])
    os.environ["SDL_VIDEODRIVER"] = "dummy"

WIDTH, HEIGHT = 640, 480
BACKGROUND = (24, 26, 33)

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Breakout")
clock = pygame.time.Clock()

frames = 0
running = True
while running:
    if test_frames is None:
        clock.tick(60)

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
            running = False

    screen.fill(BACKGROUND)
    pygame.display.flip()

    frames += 1
    if test_frames is not None and frames >= test_frames:
        running = False

pygame.quit()
if test_frames is not None:
    print(f"frames={frames}")
```

**Understand: colours.** Each pixel of a screen is three tiny lights, red, green and blue, and a colour is how bright each one is, from 0 (off) to 255 (full). `(24, 26, 33)` is nearly black with a hint of blue; `(94, 234, 212)` is mostly green and blue, a teal. Each of the three is one **byte** of the surface's memory (lesson 1.1), which is why they stop at 255: a byte holds 256 different values, 0 to 255.

`screen.fill(BACKGROUND)` writes that colour into every one of the surface's 307,200 pixels. Run it: the window is now dark blue-grey.

```check
contains breakout.py "screen.fill(BACKGROUND)"
```

## Draw the paddle

**Build:** a paddle near the bottom of the window, and its position in the test-run summary.

Drawing anything means saying **where**, so first, how pygame counts positions.

**Understand: screen coordinates.** A position on the screen is `(x, y)`, counted in pixels from the **top-left corner**: x grows to the right, and y grows **downwards**, the opposite of a graph in maths. Screens are drawn row by row from the top, so row 0 is the top one. The window's corners:

```text
(0, 0) ─────────────── (639, 0)
  │                        │
  │                        │
(0, 479) ───────────── (639, 479)
```

Pixels are numbered 0 to 639 across and 0 to 479 down: 640 and 480 of them.

> **Rect**: pygame's rectangle: a position and a size, `Rect(x, y, width, height)`, where `(x, y)` is the top-left corner. It also offers many other names for its edges, points and size, all calculated from those four numbers: `left`, `right`, `top`, `bottom`, `centerx`, `centery`, `center`, `midbottom`, `width` and `height`, and more. Assigning to any of them moves the rectangle; its size stays the same.

A paddle is a rectangle. Make one before the loop, place it, draw it each frame after the background, and report its position in a test run:

```python file=breakout.py
import os
import sys

import pygame

# A test run lets another program play the game, with no window:
#   python breakout.py --test-run FRAMES
args = sys.argv[1:]
test_frames = None
if "--test-run" in args:
    i = args.index("--test-run")
    if i + 1 >= len(args) or not args[i + 1].isdigit():
        print("usage: python breakout.py [--test-run FRAMES]")
        sys.exit(2)
    test_frames = int(args[i + 1])
    os.environ["SDL_VIDEODRIVER"] = "dummy"

WIDTH, HEIGHT = 640, 480
BACKGROUND = (24, 26, 33)
PADDLE_COLOUR = (94, 234, 212)

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Breakout")
clock = pygame.time.Clock()

paddle = pygame.Rect(0, 0, 100, 14)
paddle.midbottom = (WIDTH // 2, HEIGHT - 30)

frames = 0
running = True
while running:
    if test_frames is None:
        clock.tick(60)

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
            running = False

    screen.fill(BACKGROUND)
    pygame.draw.rect(screen, PADDLE_COLOUR, paddle)
    pygame.display.flip()

    frames += 1
    if test_frames is not None and frames >= test_frames:
        running = False

pygame.quit()
if test_frames is not None:
    print(f"frames={frames} paddle_x={paddle.x}")
```

Run it: a dark window with a teal paddle centred near the bottom.

`pygame.Rect(0, 0, 100, 14)` makes a 100 × 14 rectangle at the top-left. Then `paddle.midbottom = (320, 450)` moves it so that the middle of its bottom edge is at that point. Worked through:

```text
WIDTH // 2  = 640 // 2 = 320          (// divides and drops the fraction: a whole number)
HEIGHT - 30 = 450
midbottom = (320, 450)  →  x = 320 - 100 / 2 = 270,  y = 450 - 14 = 436
```

So the paddle covers x from 270 to 369 and y from 436 to 449. Moving a `Rect` by naming the point you care about, instead of calculating the corner yourself, is the reason `Rect` has all those names.

A `Rect`'s `right` and `bottom` are **one past** its last pixel: this paddle's `right` is 370 and its `bottom` is 450 (the point `midbottom` was set to), but the last pixels it covers are column 369 and row 449. That's what makes the sizes add up: from 270 up to, but not including, 370 is exactly 100 pixels.

Try a `Rect` on its own in the REPL (`.venv\Scripts\python`), predicting each answer first:

```text
>>> import pygame
>>> r = pygame.Rect(0, 0, 100, 14)
>>> r.midbottom = (320, 450)
>>> r.x, r.y, r.right, r.bottom
(270, 436, 370, 450)
>>> r.right = 640
>>> r.x
540
>>> r.width
100
```

Setting `right` to 640 moved the whole rectangle so its right edge is there: `x` became 640 − 100 = 540, and the width didn't change. Hold on to that 540: you'll need it soon.

`pygame.draw.rect(screen, PADDLE_COLOUR, paddle)` takes three things: **where** to draw (the surface), **what colour**, and **which rectangle**.

**Understand: drawing order.** `screen.fill(BACKGROUND)` writes the background colour into all 307,200 pixels, which also wipes out the previous frame. Then `pygame.draw.rect` writes the paddle's colour into the pixels inside the rectangle. Drawing only ever *overwrites* pixels, so whatever is drawn last is on top. Without the `fill`, a moving paddle would leave a trail of every place it had been, since nothing would erase its old pixels. A game redraws the whole picture every frame. That sounds wasteful, but it's simple and always correct, and for a picture this size it takes well under a millisecond.

The test-run summary now includes `paddle_x={paddle.x}`, so a checking program can see where the paddle is.

> **Engineer:** the program now has **state** (where the paddle is) separate from **drawing** (turning that state into pixels, from scratch, every frame). Keep that separation and drawing can never get out of step with the state, because it's recalculated from it each time. It's also what will make the state testable without drawing anything, in Chapter 2.

```check
run ".venv/Scripts/python breakout.py --test-run 1" stdout="paddle_x=270" label="the paddle starts at x = 270" -- paddle.midbottom = (WIDTH // 2, HEIGHT - 30) puts a 100-pixel paddle's left edge at 270.
```

## Which way?

**Build:** the arrow keys move the paddle.

After the events are collected, work out which way the player is pushing, and move the paddle a few pixels that way:

```python file=breakout.py
import os
import sys

import pygame

# A test run lets another program play the game, with no window:
#   python breakout.py --test-run FRAMES
args = sys.argv[1:]
test_frames = None
if "--test-run" in args:
    i = args.index("--test-run")
    if i + 1 >= len(args) or not args[i + 1].isdigit():
        print("usage: python breakout.py [--test-run FRAMES]")
        sys.exit(2)
    test_frames = int(args[i + 1])
    os.environ["SDL_VIDEODRIVER"] = "dummy"

WIDTH, HEIGHT = 640, 480
BACKGROUND = (24, 26, 33)
PADDLE_COLOUR = (94, 234, 212)

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Breakout")
clock = pygame.time.Clock()

paddle = pygame.Rect(0, 0, 100, 14)
paddle.midbottom = (WIDTH // 2, HEIGHT - 30)

frames = 0
running = True
while running:
    if test_frames is None:
        clock.tick(60)

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
            running = False

    direction = 0
    keys = pygame.key.get_pressed()
    if keys[pygame.K_LEFT]:
        direction -= 1
    if keys[pygame.K_RIGHT]:
        direction += 1
    paddle.x += direction * 7

    screen.fill(BACKGROUND)
    pygame.draw.rect(screen, PADDLE_COLOUR, paddle)
    pygame.display.flip()

    frames += 1
    if test_frames is not None and frames >= test_frames:
        running = False

pygame.quit()
if test_frames is not None:
    print(f"frames={frames} paddle_x={paddle.x}")
```

**Understand: held keys, not key presses.** Lesson 1.1 handled Escape with a `KEYDOWN` *event*: one event per press, which is right for "do this once". A paddle needs the opposite: move for as long as the key is *held*. pygame keeps a table of which keys are down right now, updated as it processes events, and `pygame.key.get_pressed()` returns it. `keys[pygame.K_LEFT]` is `True` while the left arrow is held. (That's why it's read *after* `event.get()` in the frame: the table is brought up to date while the events are collected.)

`direction` starts at 0 each frame, goes down by 1 if left is held and up by 1 if right is: so it's `-1`, `0` or `1`, and holding both gives 0, which stands still. One variable for "which way" keeps the movement code in one line, whichever key caused it.

`paddle.x += direction * 7` moves the paddle 7 pixels a frame in that direction: `-7`, `0` or `+7`. Run it, click the window so it receives the keys, and hold the arrows.

```predict
question: The paddle moves 7 pixels every frame. On a computer that can only manage 30 frames a second, how fast does it move, in pixels a second?
answer: 210
explain: 7 pixels a frame × 30 frames a second = 210 pixels a second. At 60 frames a second it's 420. The same game would play at half speed on a slower computer, or whenever the computer is busy with something else. Speed shouldn't depend on how fast the frames come: the next step fixes that.
verify: .venv/Scripts/python -c "print(7 * 30)"
```

```check
contains breakout.py "pygame.key.get_pressed()" -- Read the held keys each frame with pygame.key.get_pressed(), after the events are collected.
run ".venv/Scripts/python breakout.py --test-run 1" stdout="paddle_x=270" label="with no keys held, the paddle stays where it started"
```

## The same speed on any computer

**Build:** a speed in pixels per **second**, and each frame moves by however long that frame took.

**Understand: movement per second, not per frame.** The prediction showed the problem: 7 pixels a frame is 420 pixels a second at 60 frames a second, and 210 at 30, but the story says "the same speed on any computer". So speeds are written **per second**, and each frame moves by the speed times the length of that frame:

> **Delta time** (`dt`): the time since the previous frame, in seconds. Movement each frame = speed (pixels per second) × `dt` (seconds) = pixels.

`clock.tick(60)` returns milliseconds since its last call (lesson 1.1), so `/ 1000` gives seconds. The two cases, worked through:

```text
60 frames a second:  dt = 0.0167 s,  420 × 0.0167 =  7 pixels a frame,  × 60 frames = 420 pixels a second
30 frames a second:  dt = 0.0333 s,  420 × 0.0333 = 14 pixels a frame,  × 30 frames = 420 pixels a second
```

Same speed, on both. **In a test run**, `dt` is exactly 1/60 every frame, as if the game ran at a perfect 60 frames a second. That makes test runs **deterministic**: the same command gives the same result every time, on every computer, which a check needs.

Three changes: a `PADDLE_SPEED` constant; `dt` from the clock each frame (and exactly 1/60 in a test run); and the paddle's position kept in a float, `paddle_x`, which the `Rect` copies:

```python file=breakout.py
import os
import sys

import pygame

# A test run lets another program play the game, with no window:
#   python breakout.py --test-run FRAMES
args = sys.argv[1:]
test_frames = None
if "--test-run" in args:
    i = args.index("--test-run")
    if i + 1 >= len(args) or not args[i + 1].isdigit():
        print("usage: python breakout.py [--test-run FRAMES]")
        sys.exit(2)
    test_frames = int(args[i + 1])
    os.environ["SDL_VIDEODRIVER"] = "dummy"

WIDTH, HEIGHT = 640, 480
BACKGROUND = (24, 26, 33)
PADDLE_COLOUR = (94, 234, 212)
PADDLE_SPEED = 420

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Breakout")
clock = pygame.time.Clock()

paddle = pygame.Rect(0, 0, 100, 14)
paddle.midbottom = (WIDTH // 2, HEIGHT - 30)
paddle_x = float(paddle.x)

frames = 0
running = True
while running:
    if test_frames is None:
        dt = clock.tick(60) / 1000
    else:
        dt = 1 / 60

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
            running = False

    direction = 0
    keys = pygame.key.get_pressed()
    if keys[pygame.K_LEFT]:
        direction -= 1
    if keys[pygame.K_RIGHT]:
        direction += 1
    paddle_x += direction * PADDLE_SPEED * dt
    paddle.x = round(paddle_x)

    screen.fill(BACKGROUND)
    pygame.draw.rect(screen, PADDLE_COLOUR, paddle)
    pygame.display.flip()

    frames += 1
    if test_frames is not None and frames >= test_frames:
        running = False

pygame.quit()
if test_frames is not None:
    print(f"frames={frames} paddle_x={paddle.x}")
```

**Understand: why `paddle_x` is a float.** `Rect` stores whole numbers. Give it a fraction and it **truncates**, dropping everything after the point: `rect.x = 1.67` stores 1. A slow-moving object can lose most of its movement to that, or all of it:

```predict
question: A `Rect` starts at x = 0, and `rect.x += 0.6` runs 60 times. What is `rect.x` at the end?
answer: 0
explain: Each time, `rect.x + 0.6` is `0 + 0.6 = 0.6`, and storing 0.6 in the `Rect` truncates it to 0. So every frame starts from 0 again, and the rectangle never moves at all: an object moving at 36 pixels a second, at 60 frames a second, would stand still. With a float the sixty steps add up to 36. That's why the paddle's real position is kept in `paddle_x`, a float, which is moved by exactly `speed × dt`, and the `Rect` is only set from it, with `round`, for drawing and collisions.
verify: .venv/Scripts/python -c "import pygame; r = pygame.Rect(0, 0, 1, 1); exec('for _ in range(60): r.x += 0.6'); print(r.x)"
```

`float(paddle.x)` makes the starting float from the `Rect`'s 270. `round(paddle_x)` rounds to the nearest whole number for the `Rect`. (An exact half goes to the **even** neighbour: `round(2.5)` is 2 and `round(3.5)` is 4. Python does it to avoid always rounding halves up, which would push totals upwards. Harmless here, but surprising the first time you meet it.)

See that speed × dt really is the same on any computer. In the REPL, move by 420 pixels a second for one second, once in 60 small steps and once in 30 bigger ones:

```text
>>> x = 0.0
>>> for frame in range(60):
...     x += 420 * (1 / 60)
...
>>> x
420.0
>>> x = 0.0
>>> for frame in range(30):
...     x += 420 * (1 / 30)
...
>>> x
420.0
```

(The `...` prompt means Python is waiting for the rest of the `for` block; press Enter on an empty line to finish it.) Both arrive at 420: 60 steps of 7 pixels, or 30 steps of 14. (Fractions like 1/60 are stored only approximately, and with other numbers the last digit can come out a hair off; Chapter 2 deals with that.) The flip side of moving by elapsed time: if one frame takes half a second, everything jumps half a second's distance in one go. Lesson 1.4 shows what that does to a ball.

> **Engineer:** keep the exact value, and convert only at the edge where precision is lost on purpose. The same rule applies to money (store cents, not rounded dollars, and round only when printing), to measurements, and to anything accumulated over many steps: round the stored value each step and the errors add up.

```check
contains breakout.py "paddle_x += direction * PADDLE_SPEED * dt" -- Move by speed × dt, and keep the exact position in the float paddle_x.
run ".venv/Scripts/python breakout.py --test-run 1" stdout="paddle_x=270"
```

## A paddle a program can steer

**Build:** a test run can hold an arrow key too, so a check can see the paddle move.

A test run has no keyboard, so `--hold left` or `--hold right` stands in for it, the same way `--test-run` stands in for the close button. Read it after `--test-run`, with `"none"` as the default, and use it instead of the keyboard during a test run:

```python file=breakout.py
import os
import sys

import pygame

# A test run lets another program play the game, with no window:
#   python breakout.py --test-run FRAMES [--hold left|right|none]
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

WIDTH, HEIGHT = 640, 480
BACKGROUND = (24, 26, 33)
PADDLE_COLOUR = (94, 234, 212)
PADDLE_SPEED = 420

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Breakout")
clock = pygame.time.Clock()

paddle = pygame.Rect(0, 0, 100, 14)
paddle.midbottom = (WIDTH // 2, HEIGHT - 30)
paddle_x = float(paddle.x)

frames = 0
running = True
while running:
    if test_frames is None:
        dt = clock.tick(60) / 1000
    else:
        dt = 1 / 60

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
            running = False

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
    paddle_x += direction * PADDLE_SPEED * dt
    paddle.x = round(paddle_x)

    screen.fill(BACKGROUND)
    pygame.draw.rect(screen, PADDLE_COLOUR, paddle)
    pygame.display.flip()

    frames += 1
    if test_frames is not None and frames >= test_frames:
        running = False

pygame.quit()
if test_frames is not None:
    print(f"frames={frames} paddle_x={paddle.x}")
```

**Understand.** `hold` is read the same way the number of frames is: find `"--hold"`, take the word after it. Notice it has none of the checking you added for `--test-run`: `--hold` with nothing after it crashes with an `IndexError`, and the usage line doesn't mention it. That's a deliberate shortcut, since only checks use `--hold`; lesson 1.6 puts it on the list of what's wrong with this script, and Chapter 2 fixes it. The keyboard block moves inside `if test_frames is None:`, so a person uses the keys and a test run uses `hold`. In both, the result is a `direction`, and the line that moves the paddle doesn't need to know which.

Careful reading the `if`/`elif` chain: it tests two different things. The first branch asks about `test_frames`; the two `elif`s, at the same indentation, belong to that same chain and ask about `hold`. They're only reached when it *is* a test run. The two inner `if`s about keys belong to the first branch alone:

```text
test run?   hold     branch that runs            direction
no          (any)    the keys                    -1, 0 or 1, from the arrows
yes         left     elif hold == "left"         -1
yes         right    elif hold == "right"        1
yes         none     none of them                0
```

**Test it:**

```powershell
.venv\Scripts\python breakout.py --test-run 30 --hold right
```

```text
frames=30 paddle_x=480
```

30 frames at 1/60 s is half a second; at 420 pixels a second that's 210 pixels; 270 + 210 = 480. Hold right for a moment in the real game too, and notice what happens at the edge of the screen.

```check
run ".venv/Scripts/python breakout.py --test-run 30 --hold right" stdout="paddle_x=480" label="holding right for half a second moves the paddle 210 pixels" -- Move by direction * PADDLE_SPEED * dt, with dt = 1 / 60 in a test run, and keep the position in the float paddle_x.
run ".venv/Scripts/python breakout.py --test-run 30 --hold left" stdout="paddle_x=60" label="holding left moves it the other way"
```

## Your turn: keep the paddle on the screen

**Build, on your own:** the second acceptance check: *the paddle never leaves the screen.*

Right now, holding an arrow drives the paddle off the edge. Try `--test-run 60 --hold left`: it prints `paddle_x=-150`, a paddle whose left edge is 150 pixels past the left of the window. Make the paddle stop at the edges:

| Command | Prints |
|---|---|
| `.venv\Scripts\python breakout.py --test-run 60 --hold left` | `frames=60 paddle_x=0` |
| `.venv\Scripts\python breakout.py --test-run 60 --hold right` | `frames=60 paddle_x=540` |
| `.venv\Scripts\python breakout.py --test-run 30 --hold right` | `frames=30 paddle_x=480` (unchanged) |

Why 540, and not 640? Work it out from the paddle's width before you write any code.

Try it for about 10 minutes before taking a hint.

```hints
nudge: The paddle's position is its *left* edge. What's the smallest left edge that keeps the whole paddle on screen? What's the largest, given that the paddle is 100 pixels wide and the window 640?
concept: The left edge must stay between 0 and `WIDTH - paddle.width` (640 − 100 = 540). Forcing a number into a range is called **clamping**. `max(value, 0)` can't be less than 0, and `min(value, 540)` can't be more than 540, so `max(0, min(value, 540))` is always in range. Clamp the float, `paddle_x`, so that the exact position stays in range too, not just the `Rect`.
shape: One line, after `paddle_x` is moved and before `paddle.x` is set from it: `paddle_x` becomes `paddle_x` clamped between 0 and `WIDTH - paddle.width`.
answer: ~~~python
    paddle_x += direction * PADDLE_SPEED * dt
    paddle_x = max(0, min(paddle_x, WIDTH - paddle.width))
    paddle.x = round(paddle_x)
~~~

Traced at the right edge, with the paddle at 535 and moving 7 pixels:

~~~text
paddle_x = 535 + 7       = 542
min(542, 540)            = 540
max(0, 540)              = 540     → stops at the edge
~~~

Writing `WIDTH - paddle.width` instead of `540` means the limit stays right if the window or the paddle changes size. Clamping the float, not just the `Rect`, matters: if only the `Rect` were clamped, `paddle_x` would keep growing while the key is held, and pressing left would seem to do nothing until it had come all the way back.
```

```check
run ".venv/Scripts/python breakout.py --test-run 60 --hold left" stdout="paddle_x=0" label="the paddle stops at the left edge" -- The left edge can't go below 0.
run ".venv/Scripts/python breakout.py --test-run 60 --hold right" stdout="paddle_x=540" label="the paddle stops at the right edge" -- The left edge can't go past WIDTH - paddle.width, which is 540.
run ".venv/Scripts/python breakout.py --test-run 30 --hold right" stdout="paddle_x=480" label="normal movement is unchanged"
```

## Done: commit it

**Build:** mark the story done and commit.

The story's acceptance checks are both true now, so the story is **done** (lesson 1.2's definition: every check ticked, and the work committed). In `BACKLOG.md`, tick both checkboxes of *Move the paddle* by changing `- [ ]` to `- [x]`, and move the whole story, heading and all, under *Done*. Then:

```powershell
git add .
git commit -m "Add the paddle: arrow keys, steady speed, stays on screen"
```

```check
contains BACKLOG.md "- [x] The paddle never leaves the screen." -- Tick both of the story's checkboxes: - [x]
git-message "paddle"
git-clean
```

## Challenge: Shift for speed

**Optional, ★.** While either Shift key is held, the paddle moves twice as fast. `keys[pygame.K_LSHIFT] or keys[pygame.K_RSHIFT]` is `True` while one is down; the speed × dt rule does the rest. Try it in a copy, `scratch/paddle_shift.py`, so the main game stays as the next lessons expect.

## Challenge: a paddle with weight

**Optional, ★★.** Instead of moving at full speed at once, the paddle **accelerates**: give it a velocity that changes towards `direction * PADDLE_SPEED` by at most 3000 pixels per second each second, slowing down the same way when no key is held. It must still stop at the edges and move the same on any computer. Velocity changes by acceleration × dt, and position by velocity × dt: dt twice.

## Challenge: the mouse

**Optional, ★★.** Make the paddle's centre follow the mouse: `pygame.mouse.get_pos()` returns the pointer's `(x, y)`. Keep it on the screen. Then think: does this need dt? Why not? (Compare "move by" with "set to".)

## What did we actually learn?

- **Screen coordinates** start at the top-left, with y growing downwards. A `Rect` holds a position and size, and names every edge and point so you can place it by the one you care about.
- **State is separate from drawing**: each frame redraws everything from the current values.
- **Events for presses, the key table for holding**: `KEYDOWN` happens once, `get_pressed()` says what's held now.
- **Delta time**: speeds per second, multiplied by each frame's length, so movement is the same on any computer. Test runs use a fixed `dt`, which makes them deterministic.
- **Keep exact values, round at the edge**: a whole-number `Rect` loses movement; the float position doesn't.
- **Clamping** keeps a value in a range, with `max` and `min`.

Every engine has the same pieces. In C#, MonoGame's `Update(GameTime gameTime)` gets the frame time as `gameTime.ElapsedGameTime.TotalSeconds`; in Java, libGDX's `render()` gets it from `Gdx.graphics.getDeltaTime()`. Coordinates are where engines differ: MonoGame uses x-right, y-down like pygame, but libGDX puts (0, 0) at the **bottom**-left with y growing upwards, like a maths graph. Always check which way y goes before trusting a position.
