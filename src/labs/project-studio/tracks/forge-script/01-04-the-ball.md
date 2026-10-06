---
title: 1.4 — The Ball
runtime: python
run: breakout.py
---

This lesson adds the ball and finishes two stories, **Bounce the ball** and **Lose a life**. It's also where you'll hunt your first real game bug: one that only appears when a frame takes too long, that most Breakout tutorials have, and that you'll find with a **debugger**, a tool that stops a running program so you can look inside it.

## The paddle clamp so far

**Build:** make sure `breakout.py` matches the end of lesson 1.3, with the reference answer to its Your turn: the paddle clamped to the screen.

If your answer differs, the lines below show where. Yours may be fine; matching the reference means the rest of the chapter's steps line up with your file exactly.

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
    paddle_x = max(0, min(paddle_x, WIDTH - paddle.width))
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

```check
run ".venv/Scripts/python breakout.py --test-run 60 --hold left" stdout="paddle_x=0"
run ".venv/Scripts/python breakout.py --test-run 60 --hold right" stdout="paddle_x=540"
```

## A ball that moves

**Build:** a ball that flies in a straight line.

The ball needs a colour, a speed, a position and a direction. Its position changes every frame the same way the paddle's does, by speed × `dt`, but in two directions at once. Add the constants, the ball's starting values before the loop, three lines in the loop to move it, and one to draw it:

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
BALL_COLOUR = (245, 245, 245)
PADDLE_SPEED = 420
BALL_SPEED = 300

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Breakout")
clock = pygame.time.Clock()

paddle = pygame.Rect(0, 0, 100, 14)
paddle.midbottom = (WIDTH // 2, HEIGHT - 30)
paddle_x = float(paddle.x)

ball = pygame.Rect(0, 0, 12, 12)
ball_x = WIDTH / 2
ball_y = HEIGHT / 2
ball_vx = BALL_SPEED * 0.6
ball_vy = -BALL_SPEED * 0.8

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
    paddle_x = max(0, min(paddle_x, WIDTH - paddle.width))
    paddle.x = round(paddle_x)

    ball_x += ball_vx * dt
    ball_y += ball_vy * dt
    ball.center = (round(ball_x), round(ball_y))

    screen.fill(BACKGROUND)
    pygame.draw.rect(screen, PADDLE_COLOUR, paddle)
    pygame.draw.ellipse(screen, BALL_COLOUR, ball)
    pygame.display.flip()

    frames += 1
    if test_frames is not None and frames >= test_frames:
        running = False

pygame.quit()
if test_frames is not None:
    print(f"frames={frames} paddle_x={paddle.x}")
```

Run it: the ball flies up and to the right, and off the screen. Run it again to see it again.

**Understand: velocity.** The ball's position is `(ball_x, ball_y)`, floats for the reason lesson 1.3 found. Its **velocity** is how fast it moves in each direction, in pixels per second: `ball_vx` across and `ball_vy` down. Each frame moves it by velocity × `dt`, the same rule as the paddle:

```text
first frame of a test run (dt = 1/60):
ball_x = 320 + 180 × (1/60) = 323
ball_y = 240 + (-240) × (1/60) = 236     (negative vy is upwards, since y grows downwards)
```

**Why `0.6` and `0.8`?** They make the ball move at exactly `BALL_SPEED`, 300 pixels a second, along a slant. In one second the ball moves 180 pixels across (300 × 0.6) and 240 up (300 × 0.8), from the centre (320, 240) to (500, 0). How far is that, along the slant? Draw it: the path is the long side of a triangle with a square corner, whose other two sides are the 180 across and the 240 up:

```text
                      ● (500, 0)   after one second
                     /|
          how far?  / |
                   /  |  240 up
                  /   |
       (320, 240) ●---┘
                  180 across
```

**Pythagoras' theorem** says that in a triangle with a square corner (a **right angle**), the long side multiplied by itself equals the other two sides, each multiplied by itself, added together. A number multiplied by itself is its **square**, written ², and the **square root**, written √, undoes squaring: √*n* is the number that, multiplied by itself, gives *n*. So:

```text
long side²  = 180² + 240² = 32,400 + 57,600 = 90,000
long side   = √90,000 = 300          (because 300 × 300 = 90,000)
```

300 pixels in one second: exactly `BALL_SPEED`. That works for any speed because 0.6² + 0.8² = 0.36 + 0.64 = 1, so the slant is always 1 × the speed. A velocity like `(vx, vy)` is often drawn as an arrow, and the arrow's length, worked out this way, is the actual speed. A pair of numbers with a direction and a length like this is called a **vector**, and its length is its **magnitude**. Python can work it out: in the REPL, `import math` then `math.hypot(180, 240)` gives `300.0` (`hypot` is short for *hypotenuse*, the slanted side).

`ball_x = WIDTH / 2` uses `/`, not lesson 1.3's `//`: `/` always gives a float (`320.0`), which is what a position that moves by fractions of a pixel needs.

`ball.center = (round(ball_x), round(ball_y))` places the 12 × 12 `Rect` so that its centre is on the float position. The `Rect` is used for drawing and, soon, for collisions. `pygame.draw.ellipse` draws the largest ellipse that fits in a rectangle, which for a square is a circle.

> **Engineer:** position and velocity, moved by velocity × time each frame, is the whole of motion in a game. Gravity (Chapter 12) will change velocity by acceleration × time in exactly the same way. The pattern, *state updated from its rate of change, a small step at a time*, is also how physics simulations, animations and even some machine learning (Chapter 46) work.

```check
contains breakout.py "ball_x += ball_vx * dt" -- Move the ball by ball_vx * dt and ball_vy * dt each frame.
contains breakout.py "pygame.draw.ellipse(screen, BALL_COLOUR, ball)"
```

## Is the ball still on screen?

**Build:** the test-run summary says whether the ball is still inside the window, so a check can tell a ball in play from one that's flown off.

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
BALL_COLOUR = (245, 245, 245)
PADDLE_SPEED = 420
BALL_SPEED = 300

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Breakout")
clock = pygame.time.Clock()

paddle = pygame.Rect(0, 0, 100, 14)
paddle.midbottom = (WIDTH // 2, HEIGHT - 30)
paddle_x = float(paddle.x)

ball = pygame.Rect(0, 0, 12, 12)
ball_x = WIDTH / 2
ball_y = HEIGHT / 2
ball_vx = BALL_SPEED * 0.6
ball_vy = -BALL_SPEED * 0.8

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
    paddle_x = max(0, min(paddle_x, WIDTH - paddle.width))
    paddle.x = round(paddle_x)

    ball_x += ball_vx * dt
    ball_y += ball_vy * dt
    ball.center = (round(ball_x), round(ball_y))

    screen.fill(BACKGROUND)
    pygame.draw.rect(screen, PADDLE_COLOUR, paddle)
    pygame.draw.ellipse(screen, BALL_COLOUR, ball)
    pygame.display.flip()

    frames += 1
    if test_frames is not None and frames >= test_frames:
        running = False

pygame.quit()
if test_frames is not None:
    inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(ball)
    print(f"frames={frames} paddle_x={paddle.x} inside={inside}")
```

The test-run summary now ends with `inside=`: whether the ball's `Rect` is entirely inside the window. `Rect.contains(other)` is `True` when `other` fits completely within it.

`pygame.Rect(0, 0, WIDTH, HEIGHT)` is a rectangle exactly the size of the window, made just to ask the question. Traced for the first frame of a test run, with the ball's 12 × 12 `Rect` centred on (323, 236): it covers x 317 to 328 and y 230 to 241, all within 0 to 639 and 0 to 479, so `inside` is `True`. Two seconds later the ball is far above the top, y below 0, and it's `False`.

```check
run ".venv/Scripts/python breakout.py --test-run 30" stdout="inside=True" label="after half a second, the ball is still on screen"
run ".venv/Scripts/python breakout.py --test-run 120" stdout="inside=False" label="after two seconds, it has flown off the screen" -- Move the ball by ball_vx * dt and ball_vy * dt each frame.
```

## Bounce off the walls

**Build:** the ball bounces off the left, right and top walls.

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
BALL_COLOUR = (245, 245, 245)
PADDLE_SPEED = 420
BALL_SPEED = 300

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Breakout")
clock = pygame.time.Clock()

paddle = pygame.Rect(0, 0, 100, 14)
paddle.midbottom = (WIDTH // 2, HEIGHT - 30)
paddle_x = float(paddle.x)

ball = pygame.Rect(0, 0, 12, 12)
ball_x = WIDTH / 2
ball_y = HEIGHT / 2
ball_vx = BALL_SPEED * 0.6
ball_vy = -BALL_SPEED * 0.8

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
    paddle_x = max(0, min(paddle_x, WIDTH - paddle.width))
    paddle.x = round(paddle_x)

    ball_x += ball_vx * dt
    ball_y += ball_vy * dt
    if ball_x < 6 or ball_x > WIDTH - 6:
        ball_vx = -ball_vx
    if ball_y < 6:
        ball_vy = -ball_vy
    ball.center = (round(ball_x), round(ball_y))

    screen.fill(BACKGROUND)
    pygame.draw.rect(screen, PADDLE_COLOUR, paddle)
    pygame.draw.ellipse(screen, BALL_COLOUR, ball)
    pygame.display.flip()

    frames += 1
    if test_frames is not None and frames >= test_frames:
        running = False

pygame.quit()
if test_frames is not None:
    inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(ball)
    print(f"frames={frames} paddle_x={paddle.x} inside={inside}")
```

**Understand: a bounce flips one direction.** When the ball hits a side wall, its sideways movement reverses and its up-down movement doesn't change; a hit on the top reverses up-down and leaves sideways alone. Flipping the sign of one velocity component is exactly that. Traced at the top wall:

```text
before:  ball_y = 5.5,  ball_vy = -240   (moving up, and past the edge)
5.5 < 6  →  ball_vy = 240                (now moving down)
next frame: ball_y = 5.5 + 240 × (1/60) = 9.5
```

Why 6, not 0? `ball_x` and `ball_y` are the ball's **centre**, and the ball's radius is 6, so its edge touches the wall when its centre is 6 pixels away. `WIDTH - 6` is the same on the right. `or` makes one `if` cover both side walls, since the response to either is the same.

There's no bottom wall: that's where the paddle has to be. The ball still falls out of the bottom, for the moment.

```check
run ".venv/Scripts/python breakout.py --test-run 150" stdout="inside=True" label="after 2.5 seconds, the ball has bounced and is still on screen" -- Flip ball_vy at the top (ball_y < 6) and ball_vx at the sides (ball_x < 6 or ball_x > WIDTH - 6).
```

## The paddle bounces it

**Build:** the ball bounces up off the paddle, and test runs get an autopilot.

```python file=breakout.py
import os
import sys

import pygame

# A test run lets another program play the game, with no window:
#   python breakout.py --test-run FRAMES [--hold left|right|none|auto]
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
BALL_COLOUR = (245, 245, 245)
PADDLE_SPEED = 420
BALL_SPEED = 300

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Breakout")
clock = pygame.time.Clock()

paddle = pygame.Rect(0, 0, 100, 14)
paddle.midbottom = (WIDTH // 2, HEIGHT - 30)
paddle_x = float(paddle.x)

ball = pygame.Rect(0, 0, 12, 12)
ball_x = WIDTH / 2
ball_y = HEIGHT / 2
ball_vx = BALL_SPEED * 0.6
ball_vy = -BALL_SPEED * 0.8

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
    if ball_x < 6 or ball_x > WIDTH - 6:
        ball_vx = -ball_vx
    if ball_y < 6:
        ball_vy = -ball_vy
    ball.center = (round(ball_x), round(ball_y))

    if ball.colliderect(paddle) and ball_vy > 0:
        ball_vy = -ball_vy

    screen.fill(BACKGROUND)
    pygame.draw.rect(screen, PADDLE_COLOUR, paddle)
    pygame.draw.ellipse(screen, BALL_COLOUR, ball)
    pygame.display.flip()

    frames += 1
    if test_frames is not None and frames >= test_frames:
        running = False

pygame.quit()
if test_frames is not None:
    inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(ball)
    print(f"frames={frames} paddle_x={paddle.x} inside={inside}")
```

**Understand: collision.** `ball.colliderect(paddle)` is `True` when the two rectangles overlap at all. pygame works it out from the edges: two rectangles overlap exactly when each one's left edge is left of the other's right edge, and each one's top edge is above the other's bottom edge. With the paddle at x 270–369 and y 436–449, and the ball's `Rect` at x 314–325 and y 432–443:

```text
ball.left 314 < paddle.right 370   and   paddle.left 270 < ball.right 326    → overlap across
ball.top  432 < paddle.bottom 450  and   paddle.top 436  < ball.bottom 444   → overlap down
both  →  colliderect is True
```

(`right` and `bottom` are one past the last pixel: a `Rect` at x 270 that's 100 wide covers 270 to 369, and its `right` is 370.)

Try the rule on its own in the REPL, where you choose the rectangles:

```text
>>> import pygame
>>> a = pygame.Rect(0, 0, 10, 10)
>>> a.colliderect(pygame.Rect(9, 9, 5, 5))
True
>>> a.colliderect(pygame.Rect(10, 0, 5, 5))
False
```

The first overlaps `a` by one pixel, at (9, 9). The second starts at x 10, exactly `a.right`: the two touch, but no pixel is in both, so they don't collide.

**Why `and ball_vy > 0`?** The ball moves 4 or 5 pixels a frame and the paddle is 14 thick, so the ball overlaps the paddle for **several frames** in a row. Without the condition, the first overlapping frame flips the ball upwards; the next frame it still overlaps, so it flips back down; and so on, the ball shuddering inside the paddle. Only bouncing when the ball is moving **down** (positive `vy`, since y grows downwards) means each touch bounces exactly once. It's a small rule that matters: *collision isn't an event that happens once, it's a state that lasts several frames*, so code that reacts to it must ask whether it has already reacted.

**The autopilot.** A test run can't hold the arrow keys at the right moments, so `--hold auto` steers for it: if the ball is left of the paddle's middle (more than 10 pixels left of `paddle_x + 50`), move left; if right of it, move right; otherwise stay. It's a simple rule, and it's enough to keep the ball in play. Why `paddle_x + 50`? `paddle_x` is the paddle's left edge and the paddle is 100 wide, so its middle is 50 further on; the code compares the ball with `paddle_x + 40` and `paddle_x + 60`, 10 pixels either side of that. Why not move whenever the ball isn't exactly at the middle? A paddle moving 7 pixels a frame would overshoot by a few pixels, then move back and overshoot the other way, wobbling forever. The 20-pixel **dead zone** in the middle, where it stays still, stops that.

```check
run ".venv/Scripts/python breakout.py --test-run 600 --hold auto" stdout="inside=True" label="with the autopilot, the ball is still in play after 10 seconds" -- Bounce when ball.colliderect(paddle) and ball_vy > 0.
```

## Missing the ball costs a life

**Build:** three lives; missing the ball costs one, and the ball comes back.

```python file=breakout.py
import os
import sys

import pygame

# A test run lets another program play the game, with no window:
#   python breakout.py --test-run FRAMES [--hold left|right|none|auto]
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
BALL_COLOUR = (245, 245, 245)
PADDLE_SPEED = 420
BALL_SPEED = 300

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Breakout")
clock = pygame.time.Clock()

paddle = pygame.Rect(0, 0, 100, 14)
paddle.midbottom = (WIDTH // 2, HEIGHT - 30)
paddle_x = float(paddle.x)

ball = pygame.Rect(0, 0, 12, 12)
ball_x = WIDTH / 2
ball_y = HEIGHT / 2
ball_vx = BALL_SPEED * 0.6
ball_vy = -BALL_SPEED * 0.8

lives = 3
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
    if ball_x < 6 or ball_x > WIDTH - 6:
        ball_vx = -ball_vx
    if ball_y < 6:
        ball_vy = -ball_vy
    ball.center = (round(ball_x), round(ball_y))

    if ball.colliderect(paddle) and ball_vy > 0:
        ball_vy = -ball_vy

    if ball.top > HEIGHT:
        lives -= 1
        ball_x = WIDTH / 2
        ball_y = HEIGHT / 2
        ball_vx = BALL_SPEED * 0.6
        ball_vy = -BALL_SPEED * 0.8

    screen.fill(BACKGROUND)
    pygame.draw.rect(screen, PADDLE_COLOUR, paddle)
    pygame.draw.ellipse(screen, BALL_COLOUR, ball)
    pygame.display.flip()

    frames += 1
    if test_frames is not None and frames >= test_frames:
        running = False

pygame.quit()
if test_frames is not None:
    inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(ball)
    print(f"frames={frames} paddle_x={paddle.x} lives={lives} inside={inside}")
```

**Understand.** `ball.top > HEIGHT` is `True` once the whole ball is below the bottom of the window: its top edge is past the last row. Then `lives` goes down by one and the ball is put back where it started, with its starting velocity, so play continues. The summary prints `lives=` now. Try it with nobody at the paddle:

```powershell
.venv\Scripts\python breakout.py --test-run 400 --hold none
```

```text
frames=400 paddle_x=270 lives=1 inside=True
```

Two misses in under 7 seconds. And with `--test-run 1000 --hold none` it prints `lives=-2`, because nothing stops the game at zero yet. That's the *Win or lose* story, in lesson 1.5.

Look at the four lines that put the ball back: they're the same four lines that set it up before the loop. **Duplicated code** like this is a problem waiting to happen: change the starting speed in one place and forget the other, and the ball behaves differently after a miss. Leave it for now, and remember it for lesson 1.6.

```check
run ".venv/Scripts/python breakout.py --test-run 200 --hold none" stdout="lives=2" label="one miss in 200 frames costs one life" -- When ball.top > HEIGHT, take a life and put the ball back.
run ".venv/Scripts/python breakout.py --test-run 600 --hold auto" stdout="lives=3" label="the autopilot keeps all three lives"
```

## Simulate a slow frame

**Build:** a way to make one frame take half a second, in a test run.

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
PADDLE_SPEED = 420
BALL_SPEED = 300

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Breakout")
clock = pygame.time.Clock()

paddle = pygame.Rect(0, 0, 100, 14)
paddle.midbottom = (WIDTH // 2, HEIGHT - 30)
paddle_x = float(paddle.x)

ball = pygame.Rect(0, 0, 12, 12)
ball_x = WIDTH / 2
ball_y = HEIGHT / 2
ball_vx = BALL_SPEED * 0.6
ball_vy = -BALL_SPEED * 0.8

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
    if ball_x < 6 or ball_x > WIDTH - 6:
        ball_vx = -ball_vx
    if ball_y < 6:
        ball_vy = -ball_vy
    ball.center = (round(ball_x), round(ball_y))

    if ball.colliderect(paddle) and ball_vy > 0:
        ball_vy = -ball_vy

    if ball.top > HEIGHT:
        lives -= 1
        ball_x = WIDTH / 2
        ball_y = HEIGHT / 2
        ball_vx = BALL_SPEED * 0.6
        ball_vy = -BALL_SPEED * 0.8

    screen.fill(BACKGROUND)
    pygame.draw.rect(screen, PADDLE_COLOUR, paddle)
    pygame.draw.ellipse(screen, BALL_COLOUR, ball)
    pygame.display.flip()

    frames += 1
    if test_frames is not None and frames >= test_frames:
        running = False

pygame.quit()
if test_frames is not None:
    inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(ball)
    print(f"frames={frames} paddle_x={paddle.x} lives={lives} inside={inside}")
```

**Understand: why frames are sometimes slow.** In a real game, `dt` is usually about 1/60 of a second, but not always. On Windows, **while you drag a window by its title bar, the program's loop stops**: Windows runs its own loop that moves the window, and your `while` loop doesn't get control back until you let go. When it does, the first `clock.tick` measures the whole time you were dragging. Half a second of dragging means one frame with `dt = 0.5`. A slow disk, or the computer briefly busy with something else, does the same on a smaller scale.

`--lag-at 40` makes frame 40 of a test run that half-second frame, so the effect can be reproduced exactly, on any computer, as often as needed. **Reproduce** is step 2 of the debugging method from lesson 0.3, and this is how it's done for bugs that depend on timing: make the timing an input.

In the code, `elif frames == lag_at:` is checked only in a test run. `frames` counts the passes already finished, so it's 40 at the start of the 41st pass: "frame 40" counts from 0, like a list index. When there's no `--lag-at`, `lag_at` is `None`, and `frames == None` is simply `False` every time. `==` can compare a number with `None`; it's `>`, `<`, `>=` and `<=` that can't (lesson 1.1's `TypeError`).

Run it:

```powershell
.venv\Scripts\python breakout.py --test-run 400 --hold auto --lag-at 40
```

```text
frames=400 paddle_x=287 lives=3 inside=False
```

`inside=False`, with three lives left: the ball is outside the window and still in play. Without the lag, `inside=True`. Something is wrong. (You can also make it happen for real: run the game and drag the window by its title bar for a second, while the ball is close to a wall.)

```check
run ".venv/Scripts/python breakout.py --test-run 400 --hold auto" stdout="inside=True" label="without a slow frame, the ball stays on screen"
run ".venv/Scripts/python breakout.py --test-run 400 --hold auto --lag-at 40" stdout="inside=False" label="with a half-second frame at frame 40, the ball ends up off screen (for now)" -- This step is meant to show the bug: if the ball stays inside, compare your wall code with the lesson's.
```

## Five frames, one line at a time

**Build:** the wall's logic on its own, small enough to watch line by line.

The game is 113 lines and runs 60 frames a second, which is too much to follow by eye. Debugging gets much easier when you cut a problem down to the smallest program that still shows it, a **minimal reproduction**. Create `trace_wall.py`, which keeps only what the top wall does to a ball for five frames, one of them slow:

```python file=trace_wall.py
# Lesson 1.4's wall bug in five frames, small enough to step through in CodeLens.
# One frame is slow (dt = 0.5), like a frame spent dragging the window.
BALL_RADIUS = 6

y = 80.0
vy = -240.0
for dt in [1 / 60, 0.5, 1 / 60, 1 / 60, 1 / 60]:
    y += vy * dt
    if y < BALL_RADIUS:
        vy = -vy
    print(f"dt={dt:.3f}  y={y:6.1f}  vy={vy:+.0f}")
```

Its `print` uses three **format specifications** after the colons: `{dt:.3f}` shows 3 decimal places; `{y:6.1f}` shows 1 decimal place and pads the number to at least 6 characters wide, so the columns line up (that's why `-40.0` prints as ` -40.0`, with a space in front); and `{vy:+.0f}` shows no decimal places and always a sign, `+240` or `-240`. Run it in the terminal with `python trace_wall.py`. Then open it in the editor and press **🔬 Trace in CodeLens** above it. CodeLens runs the program one line at a time and shows every variable after each line; use its step buttons to move forwards and backwards. Watch `y` and `vy` from the slow frame on.

```predict
question: After the slow frame (the second), what does `vy` do on each of the next three frames?
choice: It stays at +240: the ball heads back down and recovers
choice: It flips sign every frame: -240, +240, -240
choice: It becomes 0
answer: It flips sign every frame: -240, +240, -240
explain: The slow frame takes `y` to -44, past the wall, so `vy` flips to +240. The next frame moves the ball only 4 pixels, to -40: still past the wall, so `vy` flips again, to -240. The next frame takes it back to -44, and so on. The ball never gets back below 6. In CodeLens you can see it happen on the `vy = -vy` line, every frame. The output's last line is `dt=0.017  y= -40.0  vy=-240`.
```

Five frames and four variables are the whole bug. The next step finds the same behaviour in the real game, with a **debugger**, and fixes it. Practise the debugger here first, where nothing else is going on. Copy the file into your scratch folder and add one line, `breakpoint()`, as the first line inside the `for` loop:

```powershell
Copy-Item trace_wall.py scratch\pdb_practice.py
```

```python
for dt in [1 / 60, 0.5, 1 / 60, 1 / 60, 1 / 60]:
    breakpoint()
    y += vy * dt
```

Run `python scratch\pdb_practice.py`. It stops, and waits at a `(Pdb)` prompt:

```text
> C:\Users\you\Documents\forge\scratch\pdb_practice.py(8)<module>()
-> breakpoint()
(Pdb) p dt, y, vy
(0.016666666666666666, 80.0, -240.0)
(Pdb) n
> C:\Users\you\Documents\forge\scratch\pdb_practice.py(9)<module>()
-> y += vy * dt
(Pdb) c
dt=0.017  y=  76.0  vy=-240
> C:\Users\you\Documents\forge\scratch\pdb_practice.py(8)<module>()
-> breakpoint()
(Pdb) p dt, y, vy
(0.5, 76.0, -240.0)
(Pdb) q
```

The first two lines say where it stopped: the file, the line number in brackets, and, after `->`, the line that runs **next**. `p` prints values; `n` runs one line and stops again; `c` carries on until the program reaches `breakpoint()` again, one frame later, now with the slow `dt` of 0.5. Type `q`, and `y` when asked, to stop. Keep stepping with `n` through the slow frame if you like: you'll watch `vy` flip, exactly as CodeLens showed.

```check
run "python trace_wall.py" stdout="dt=0.017  y= -40.0  vy=-240" label="the five-frame reproduction shows the ball stuck past the wall" -- Type trace_wall.py exactly as shown.
```

## Your turn: bug hunt — the ball that escapes

**Build, on your own:** find out why one slow frame lets the ball escape, and fix it.

Work through the method from lesson 0.3. **Observe** and **reproduce** are done. This time, **inspect** with a debugger instead of `print`.

**Using a debugger.** Python includes one, called **pdb**. Calling `breakpoint()` anywhere in a program stops it there and hands you a `(Pdb)` prompt in the terminal, where you can look at every variable and then let the program carry on. Stopping on *every* frame would be tedious, so put it inside an `if`, which makes a **conditional breakpoint**: it stops only when something suspicious is true. Add these two lines right after `ball.center = …`:

```python
    if ball_y < 0:
        breakpoint()
```

Run the reproducing command in the terminal (not with the Run button: pdb needs to read what you type):

```powershell
.venv\Scripts\python breakout.py --test-run 400 --hold auto --lag-at 40
```

At the `(Pdb)` prompt, these are the commands you need:

| Command | What it does |
|---|---|
| `p frames, dt, ball_y, ball_vy` | **p**rint the values of variables or expressions |
| `c` | **c**ontinue running, until the next breakpoint |
| `n` | run the **n**ext line, then stop again |
| `l` | **l**ist the lines around where the program stopped |
| `q` | **q**uit: stop the program (answer `y` when asked) |
| `w` | **w**here: the chain of calls that led here, like a traceback (lesson 0.3) |
| `h` | **h**elp: every command, and `h p` explains one |

Here is a real session, shortened: before each `-> breakpoint()`, pdb also prints a line naming the file and line number, as in the practice. Read it before running your own:

```text
-> breakpoint()
(Pdb) p frames, dt, ball_y, ball_vy
(40, 0.5, -40.0, 240.0)
(Pdb) c
-> breakpoint()
(Pdb) p frames, dt, ball_y, ball_vy
(41, 0.016666666666666666, -36.0, -240.0)
(Pdb) c
-> breakpoint()
(Pdb) p frames, dt, ball_y, ball_vy
(42, 0.016666666666666666, -40.0, 240.0)
```

Now **form a hypothesis** from that evidence, before changing anything. What is `ball_vy` doing from one frame to the next, why, and why doesn't the ball ever get back below `ball_y = 6`? Then **fix** it, and **remove the breakpoint**: left in, it would stop the game for every player.

| Command | Prints (end of the line) |
|---|---|
| `.venv\Scripts\python breakout.py --test-run 400 --hold auto --lag-at 40` | `inside=True` |
| `.venv\Scripts\python breakout.py --test-run 400 --hold auto --lag-at 57` | `inside=True` |
| `.venv\Scripts\python breakout.py --test-run 400 --hold auto --lag-at 78` | `inside=True` |
| `.venv\Scripts\python breakout.py --test-run 600 --hold auto` | `lives=3 inside=True` |

The fix must work for all three walls, not just the top one: a slow frame at frame 78 puts the ball past a side wall.

One built-in function you may want: `abs(x)` is the size of a number without its sign, so `abs(-240)` and `abs(240)` are both `240`. That makes `abs(v)` always positive and `-abs(v)` always negative, whatever `v` was.

Try it for about 15 minutes before taking a hint. This is a real bug in a real kind of code; finding it yourself is worth the time.

```hints
nudge: Trace it with the numbers from the session. Frame 40 moved the ball 120 pixels up (dt is 0.5), to y = −40. What does the wall code do when y = −40? And on frame 41, after moving 4 pixels, y is −36: what does the wall code do then? Is the ball any closer to being back inside?
concept: The wall code *flips* the direction every frame the ball is past the edge. Normally the ball is only past the edge for one frame, so one flip is right. After a big jump it's past the edge by more than one frame's movement, so it's still past the edge after flipping and moving back, flips again, moves out again: forever. Two ideas fix it, and the best fix uses both. **Set** the direction instead of flipping it: past the top, the ball must move *down*, so make `ball_vy` positive with `abs(ball_vy)`, whatever it was. And **put the ball back** at the edge (`ball_y = 6`), so it's never left outside at all.
shape: Split the side-wall `if` into two, one per wall, since each needs a different direction. For each of the three walls: if the ball is past it, move the ball back to the edge and set the direction away from that wall: `abs(...)` for "positive", `-abs(...)` for "negative". Then delete the breakpoint.
answer: ~~~python
    if ball_x < 6:
        ball_x = 6
        ball_vx = abs(ball_vx)
    if ball_x > WIDTH - 6:
        ball_x = WIDTH - 6
        ball_vx = -abs(ball_vx)
    if ball_y < 6:
        ball_y = 6
        ball_vy = abs(ball_vy)
~~~

Traced from the session's frame 40, with the fix:

~~~text
frame 40:  ball_y = -40.0 < 6  →  ball_y = 6,  ball_vy = abs(240.0)  = 240   (down)
frame 41:  ball_y = 6 + 4 = 10, not < 6, nothing to do                        (back in play)
~~~

`abs` makes the direction a fact about the wall ("away from the top means down") instead of a guess about the past ("it must have been going up"). That's why it can't flip-flop: being past the top edge always means moving down, however many frames in a row it happens. Moving the ball back to the edge means it's never drawn outside the window either.

A tempting fix that doesn't work: limiting `dt` to at most 0.05 seconds. It makes the jump smaller (15 pixels instead of 120), but 15 pixels past the edge is still more than one 4-pixel frame, so the flip-flop can still happen. Measured by putting the slow frame at each of 301 different frames (0 to 300) of a test run: the original code lost the ball on 66 of them, the `dt` limit alone on 6, and this fix on none. Limiting `dt` is a good idea for other reasons (Chapter 12), but on its own it makes the bug rarer, which is worse than obvious: a rare bug is harder to reproduce.
```

```check
run ".venv/Scripts/python breakout.py --test-run 400 --hold auto --lag-at 40" stdout="inside=True" label="a slow frame near the top wall no longer loses the ball" -- When the ball is past a wall, put it back at the edge and set its direction away from the wall with abs().
run ".venv/Scripts/python breakout.py --test-run 400 --hold auto --lag-at 57" stdout="inside=True" label="nor at frame 57" -- Limiting dt makes this bug rarer, but frame 57 still loses the ball: put the ball back at the edge and set its direction with abs().
run ".venv/Scripts/python breakout.py --test-run 400 --hold auto --lag-at 78" stdout="inside=True" label="nor near a side wall, at frame 78" -- Fix the side walls the same way: one if for each wall.
run ".venv/Scripts/python breakout.py --test-run 600 --hold auto" stdout="lives=3 inside=True" label="normal play is unchanged"
lacks breakout.py "breakpoint()" -- Remove the breakpoint when you've finished with it.
```

## Steer the ball

**Build:** the ball leaves the paddle at an angle that depends on where it hit, and the two stories are done.

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
PADDLE_SPEED = 420
BALL_SPEED = 300

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Breakout")
clock = pygame.time.Clock()

paddle = pygame.Rect(0, 0, 100, 14)
paddle.midbottom = (WIDTH // 2, HEIGHT - 30)
paddle_x = float(paddle.x)

ball = pygame.Rect(0, 0, 12, 12)
ball_x = WIDTH / 2
ball_y = HEIGHT / 2
ball_vx = BALL_SPEED * 0.6
ball_vy = -BALL_SPEED * 0.8

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

    if ball.top > HEIGHT:
        lives -= 1
        ball_x = WIDTH / 2
        ball_y = HEIGHT / 2
        ball_vx = BALL_SPEED * 0.6
        ball_vy = -BALL_SPEED * 0.8

    screen.fill(BACKGROUND)
    pygame.draw.rect(screen, PADDLE_COLOUR, paddle)
    pygame.draw.ellipse(screen, BALL_COLOUR, ball)
    pygame.display.flip()

    frames += 1
    if test_frames is not None and frames >= test_frames:
        running = False

pygame.quit()
if test_frames is not None:
    inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(ball)
    print(f"frames={frames} paddle_x={paddle.x} lives={lives} inside={inside}")
```

**Understand: steering.** Without it, the ball's sideways speed never changes, so it follows the same path forever and the player can't aim. Now the bounce sets `ball_vx` from where the ball touched the paddle:

```text
offset = (ball.centerx - paddle.centerx) / 50      the paddle's half-width is 50

ball hits the left end:    (270 - 320) / 50 = -1.0  →  ball_vx = 300 × 0.8 × -1.0 = -240  (sharply left)
ball hits the middle:      (320 - 320) / 50 =  0.0  →  ball_vx = 0                        (straight up)
ball hits the right end:   (370 - 320) / 50 =  1.0  →  ball_vx = 240                       (sharply right)
```

(The ball can overlap the paddle's very end with its centre slightly past it, so `offset` can be a little beyond ±1.) Dividing by the half-width turns a distance in pixels into a number from −1 to 1 that doesn't depend on the paddle's size: a **normalised** value. The `0.8` limits how sharply the ball can be steered. At the very end of the paddle, `ball_vx` is 300 × 0.8 = 240, the same size as `ball_vy`'s 240, so the steepest bounce is a perfect diagonal, as far across as up: an angle of 45 degrees, half of a square corner's 90. Without the `0.8` it would be 300 across for every 240 up: a flatter path that takes longer to travel between the paddle and the bricks, and is harder to play.

One honest flaw: the ball's *speed* now changes. `ball_vy` keeps its size while `ball_vx` changes, so a ball sent off at an angle is faster than one sent straight up (√(240² + 240²) ≈ 339 against 240). Many Breakout games have that quirk; it's added to the list for lesson 1.6.

Your wall fix is in this file too, so this step's code is the reference answer to the bug hunt.

Tick and move the two stories, *Bounce the ball* and *Lose a life*, to *Done* in `BACKLOG.md`, then commit:

```powershell
git add .
git commit -m "Add the ball: walls, paddle bounce with steering, lives"
```

```check
run ".venv/Scripts/python breakout.py --test-run 600 --hold auto" stdout="lives=3" label="the autopilot still keeps the ball in play"
contains breakout.py "offset" -- Work out offset from where the ball hit the paddle, and set ball_vx from it.
contains BACKLOG.md "- [x] Missing the ball costs one of three lives, and the ball comes back." -- Tick the stories' checkboxes and move them under Done.
git-message "steering" -- Commit with the message shown, or one that mentions steering.
git-clean
```

## Challenge: the same speed after steering

**Optional, ★★.** Steering changes `ball_vx` but not `ball_vy`, so a steep bounce makes the ball faster than `BALL_SPEED` (the lesson's honest flaw). After setting `ball_vx`, scale both parts so that `math.hypot(ball_vx, ball_vy)` is `BALL_SPEED` again: work out the current magnitude, then multiply both by `BALL_SPEED / magnitude`. Do it in a copy, `scratch/breakout_speed.py`: the next lessons' checks expect the numbers the main game gives.

## Challenge: serve from the paddle

**Optional, ★★.** After a miss, the ball sits on the paddle and moves with it until Space is pressed, then leaves upwards. That needs one more piece of state (is the ball being held?), and lesson 1.3's difference between a key press (an event) and a key being held. In a copy.

## Challenge: no tunnelling

**Optional, ★★★.** A slow frame near the paddle can carry the ball from above it to below it in one step, without the two ever overlapping: the ball **tunnels** through. Reproduce it with `--lag-at` (find a frame where the ball is just above the paddle), then fix it: remember where the ball was before the move, and bounce if its path crossed the paddle's top edge during the frame, not only if it overlaps now. In a copy.

## What did we actually learn?

- **Position, velocity and `dt`**: motion is state updated from its rate of change, a small step each frame. A velocity is an arrow; Pythagoras gives its length.
- **Collision is a state that lasts several frames**, not a single event. Code that reacts to it must make sure it reacts once (`and ball_vy > 0`).
- **Make timing an input** to reproduce timing bugs: a fixed `dt`, and a forced slow frame, turned a "sometimes, when you drag the window" bug into a command that fails every time.
- **A debugger** stops a program and shows its state: `breakpoint()`, made conditional with an `if`, and `p`, `c`, `n`, `l`, `q`.
- **Set state from facts, don't flip it from assumptions**: "past the top means move down" can't get stuck; "flip the direction" can.
- **Normalising** turns a measurement into a value that doesn't depend on size.

Every language has a debugger with these same operations: Visual Studio and Rider for C#, IntelliJ and Eclipse for Java, and VS Code for all three. They show the variables in a panel instead of making you type `p`, and you click in the margin to set a breakpoint (a conditional one with a right-click), but stopping, inspecting, stepping and continuing work exactly as they do in pdb. Chapter 3 adds stepping into and out of functions.
