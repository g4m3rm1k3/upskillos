---
title: 1.5 — Bricks, Score, and the End
runtime: python
run: breakout.py
---

The last two stories in the backlog: **Break bricks and score**, and **Win or lose**. After this lesson Breakout is a complete game you can win, lose and show someone. It's also the biggest the one-file script will get, which is the point of the next lesson.

## A wall of bricks

**Build:** forty bricks in five coloured rows.

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
ROW_COLOURS = [(239, 68, 68), (249, 115, 22), (234, 179, 8), (34, 197, 94), (59, 130, 246)]
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

bricks = []
for row in range(5):
    for col in range(8):
        bricks.append(pygame.Rect(16 + col * 76, 60 + row * 26, 70, 20))

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
    for brick in bricks:
        pygame.draw.rect(screen, ROW_COLOURS[(brick.y - 60) // 26], brick)
    pygame.draw.rect(screen, PADDLE_COLOUR, paddle)
    pygame.draw.ellipse(screen, BALL_COLOUR, ball)
    pygame.display.flip()

    frames += 1
    if test_frames is not None and frames >= test_frames:
        running = False

pygame.quit()
if test_frames is not None:
    inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(ball)
    print(f"frames={frames} paddle_x={paddle.x} lives={lives} bricks={len(bricks)} inside={inside}")
```

**Understand: the nested loop.** A loop inside a loop runs the inner one completely for each pass of the outer one. Here the outer loop picks a row (0 to 4) and the inner one a column (0 to 7), so `append` runs 5 × 8 = 40 times, once per brick, row by row:

```text
row 0: col 0 → Rect(16, 60, 70, 20)    col 1 → Rect(92, 60, 70, 20)   …   col 7 → Rect(548, 60, 70, 20)
row 1: col 0 → Rect(16, 86, 70, 20)    …
…
row 4: col 7 → Rect(548, 164, 70, 20)
```

Each brick is 70 wide with a 6-pixel gap, so the next one starts 76 further along: `16 + col * 76`. Rows are 20 high with a 6-pixel gap: `60 + row * 26`. The last brick's right edge is 548 + 70 = 618, which leaves 640 − 618 = 22 pixels on the right, against 16 on the left: close enough by eye. Those numbers were picked by hand until the wall looked right, and lesson 1.6 will have something to say about numbers like these.

`bricks` is a **list of `Rect`s**. Everything the game needs to know about a brick is its rectangle, so there's no need for anything more complicated yet.

**The colour of a brick** comes from its row, worked backwards from its y: `(brick.y - 60) // 26` undoes `60 + row * 26`. A brick at y = 112 is in row (112 − 60) // 26 = 52 // 26 = 2, so `ROW_COLOURS[2]`, yellow. It works, but it's fragile: change the spacing in one place and the colours go wrong. Remember it for lesson 1.6.

The summary now reports `bricks=` too: `len(bricks)` is how many are left.

```check
run ".venv/Scripts/python breakout.py --test-run 1" stdout="bricks=40" label="the wall starts with 40 bricks" -- Two loops: for row in range(5), and inside it for col in range(8).
```

## Breaking bricks

**Build:** a brick the ball hits disappears, the ball bounces, and the score goes up.

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
ROW_COLOURS = [(239, 68, 68), (249, 115, 22), (234, 179, 8), (34, 197, 94), (59, 130, 246)]
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
        ball_x = WIDTH / 2
        ball_y = HEIGHT / 2
        ball_vx = BALL_SPEED * 0.6
        ball_vy = -BALL_SPEED * 0.8

    screen.fill(BACKGROUND)
    for brick in bricks:
        pygame.draw.rect(screen, ROW_COLOURS[(brick.y - 60) // 26], brick)
    pygame.draw.rect(screen, PADDLE_COLOUR, paddle)
    pygame.draw.ellipse(screen, BALL_COLOUR, ball)
    pygame.display.flip()

    frames += 1
    if test_frames is not None and frames >= test_frames:
        running = False

pygame.quit()
if test_frames is not None:
    inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(ball)
    print(f"frames={frames} paddle_x={paddle.x} score={score} lives={lives} bricks={len(bricks)} inside={inside}")
```

**Understand.** `ball.collidelist(bricks)` checks the ball against each `Rect` in the list, in order, and returns the **index** of the first one it overlaps, or `-1` if it overlaps none. `-1` can't be a real position in a list from the front, so it's safe to use for "none": a convention you'll see in many libraries, though it's a weak one, since forgetting to check for it gives a wrong answer instead of an error. A special value that stands for "nothing" like this is called a **sentinel**.

Try it on two bricks in the REPL:

```text
>>> import pygame
>>> bricks = [pygame.Rect(0, 0, 10, 10), pygame.Rect(20, 0, 10, 10)]
>>> pygame.Rect(22, 2, 4, 4).collidelist(bricks)
1
>>> pygame.Rect(50, 50, 1, 1).collidelist(bricks)
-1
>>> bricks.pop(1)
Rect(20, 0, 10, 10)
>>> len(bricks)
1
```

The small rectangle at x 22 overlaps the second brick, index 1; the one far away overlaps nothing, so `-1`. `pop(1)` removes that brick and returns it, which the REPL shows.

`bricks.pop(hit)` removes the item at that index from the list (and returns it, which isn't needed here). From the next frame on, the brick isn't drawn and can't be hit, because both drawing and collision go through the list. Then the ball reverses its up-down direction and the score goes up by 10.

Lesson 1.4's bug hunt taught *set the direction from the facts, don't flip it*, because a ball that stays past a wall for several frames gets flipped back and forth. So why is flipping safe here? Because the brick is removed in the same frame it's hit. Next frame there's nothing left to overlap, so this flip can only ever happen once per brick. The wall never goes away, which is what made flipping wrong there. One case still goes wrong: the ball is 12 pixels across and the gap between bricks only 6, so it can overlap **two** bricks at once. The first is removed and the ball flips; next frame it still overlaps the second, so it flips back, and carries on through the wall. It's rare, and lesson 1.6 lists it among the script's honest simplifications.

**A simplification, honestly stated:** the ball always reverses vertically, even when it hits a brick from the side, where reversing horizontally would be correct. Working out which side was hit needs the overlap measured in each direction, which Chapter 12's physics does properly. For now it looks fine almost all the time.

```text
.venv\Scripts\python breakout.py --test-run 600 --hold auto
frames=600 paddle_x=218 score=70 lives=3 bricks=33 inside=True
```

Seven bricks in ten seconds, 70 points.

```check
run ".venv/Scripts/python breakout.py --test-run 600 --hold auto" stdout="score=70" label="the autopilot breaks 7 bricks in 10 seconds, for 70 points" -- When ball.collidelist(bricks) isn't -1, pop that brick, reverse ball_vy, and add 10 to score.
run ".venv/Scripts/python breakout.py --test-run 600 --hold auto" stdout="bricks=33" label="and those bricks are gone"
```

## Words on the screen

**Build:** the score and lives, shown in the top-left corner.

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

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Breakout")
clock = pygame.time.Clock()
font = pygame.font.Font(None, 36)

paddle = pygame.Rect(0, 0, 100, 14)
paddle.midbottom = (WIDTH // 2, HEIGHT - 30)
paddle_x = float(paddle.x)

ball = pygame.Rect(0, 0, 12, 12)
ball_x = WIDTH / 2
ball_y = HEIGHT / 2
ball_vx = BALL_SPEED * 0.6
ball_vy = -BALL_SPEED * 0.8

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
        ball_x = WIDTH / 2
        ball_y = HEIGHT / 2
        ball_vx = BALL_SPEED * 0.6
        ball_vy = -BALL_SPEED * 0.8

    screen.fill(BACKGROUND)
    for brick in bricks:
        pygame.draw.rect(screen, ROW_COLOURS[(brick.y - 60) // 26], brick)
    pygame.draw.rect(screen, PADDLE_COLOUR, paddle)
    pygame.draw.ellipse(screen, BALL_COLOUR, ball)
    screen.blit(font.render(f"Score {score}   Lives {lives}", True, TEXT_COLOUR), (16, 16))
    pygame.display.flip()

    frames += 1
    if test_frames is not None and frames >= test_frames:
        running = False

pygame.quit()
if test_frames is not None:
    inside = pygame.Rect(0, 0, WIDTH, HEIGHT).contains(ball)
    print(f"frames={frames} paddle_x={paddle.x} score={score} lives={lives} bricks={len(bricks)} inside={inside}")
```

**Understand: text is a picture.** A screen only shows pixels, so text has to be turned into pixels before it can be drawn:

1. `pygame.font.Font(None, 36)` loads a **font**, a set of letter shapes, at a size of 36 pixels. `None` means pygame's built-in font, so nothing needs to be installed. Loading a font reads a file and prepares the shapes, so it's done **once**, before the loop.
2. `font.render(text, True, colour)` draws the text into a **new surface**, just big enough to hold it. `True` turns on **antialiasing**: edge pixels are blended with the background colour so curves look smooth rather than jagged.
3. `screen.blit(surface, (16, 16))` copies that surface onto the screen with its top-left corner at (16, 16). **Blit** (from *block transfer*) is the name for copying one block of pixels onto another, and it's how every image in a pygame game gets onto the screen.

See that the text really becomes a picture, sized to fit, in the REPL (after `import pygame` and `pygame.init()`):

```text
>>> font = pygame.font.Font(None, 36)
>>> font.render("Hi", True, (255, 255, 255)).get_size()
(24, 27)
>>> font.render("Hello, Forge", True, (255, 255, 255)).get_size()
(143, 27)
```

Same height, 27 pixels, because the font size is the same; the width grows with the text. That size is exactly what the centring challenge below needs.

`render` makes a new surface every frame, even when the text hasn't changed. For one short line, that costs a fraction of a millisecond. If the game had hundreds of labels, it would be worth keeping each rendered surface and making a new one only when its text changes. Measuring whether that's needed comes in Chapter 14.

```check
contains breakout.py "font.render(" -- Load the font once before the loop, then render and blit the text each frame.
run ".venv/Scripts/python breakout.py --test-run 60" stdout="frames=60" label="the game still runs" -- The font is loaded after pygame.init(), and the text drawn after screen.fill().
```

## Your turn: game over, and winning

**Build, on your own:** the *Win or lose* story.

Try this first:

```powershell
.venv\Scripts\python breakout.py --test-run 600 --hold none
```

```text
frames=600 paddle_x=270 score=110 lives=-2 bricks=29 inside=True
```

Minus two lives, and still breaking bricks. Nothing stops the game. Make it stop:

- With **no lives left**, nothing moves any more (not the paddle, not the ball, and no more bricks break), and **"Game over"** is shown in the middle of the screen.
- With **no bricks left**, nothing moves any more, and **"You win!"** is shown.
- The window stays open either way, until the player closes it or presses Escape.

| Command | Prints |
|---|---|
| `.venv\Scripts\python breakout.py --test-run 600 --hold none` | `… score=50 lives=0 bricks=35 …` |
| `.venv\Scripts\python breakout.py --test-run 1000 --hold none` | `… score=50 lives=0 bricks=35 …` (nothing changed after the game ended) |
| `.venv\Scripts\python breakout.py --test-run 10000 --hold auto` | `… paddle_x=245 score=400 lives=3 bricks=0 …` |
| `.venv\Scripts\python breakout.py --test-run 12000 --hold auto` | `… paddle_x=245 score=400 …` (the paddle stopped when the game was won) |

Where does the check go, and what should it cover? Think about which part of each frame is **the game happening** (moving things, collisions, scoring) and which part is **showing it** (drawing), and whether the second should stop when the game ends.

Try it for about 15 minutes before taking a hint.

```hints
nudge: Each frame does three things: handle events, update the game (paddle, ball, walls, paddle bounce, bricks, lives), and draw. When the game is over, which of the three should stop? If events stopped, could the player still close the window?
concept: Only the update should stop. Events must still be handled (Escape and the close button), and drawing must continue, or the "Game over" text would never be seen. So the whole update part of the frame goes inside one `if` that's true only while the game is being played: there are lives left **and** bricks left. In Python, a list is true when it's not empty (lesson 0.3's truthiness), so `bricks` on its own means "there are bricks left". The end messages are drawn with the same `font.render` and `screen.blit` as the score.
shape: `if lives > 0 and bricks:` just after the event loop, with everything from `direction = 0` down to the end of the lives check indented one level inside it. To indent many lines at once, select them in the editor and press **Tab** (**Shift+Tab** moves them back). Then, in the drawing part, after the score line: if `lives == 0`, blit "Game over" near the middle of the screen; `elif not bricks`, blit "You win!".
answer: The update, indented inside the new `if`:

~~~python
    if lives > 0 and bricks:
        direction = 0
        if test_frames is None:
            keys = pygame.key.get_pressed()
            ...
        if ball.top > HEIGHT:
            lives -= 1
            ...
~~~

and after the score line in the drawing part:

~~~python
    if lives == 0:
        screen.blit(font.render("Game over", True, TEXT_COLOUR), (260, 240))
    elif not bricks:
        screen.blit(font.render("You win!", True, TEXT_COLOUR), (270, 240))
~~~

(The next step's file has it all, in full.) The positions are roughly the middle of the screen; centring text exactly needs the rendered surface's width, which is a challenge below.

Why does `lives` stop at exactly 0? On the frame the last life is lost, `lives` becomes 0 at the end of the update. The next frame, `lives > 0` is false, so the update doesn't run, and nothing can take another life. Indenting a whole block inside one condition is a **guard**, like lesson 0.1's guard clause, but around a block instead of before a `return`.

Look at how deep the indentation now goes: four levels in places (`while`, `if`, `if`, `if`). Deep nesting is one of the signs that a piece of code is doing too much, and it's on the list for the next lesson.
```

```check
run ".venv/Scripts/python breakout.py --test-run 600 --hold none" stdout="score=50 lives=0 bricks=35" label="with no lives left, the game stops at zero" -- Put the whole update (paddle, ball, bricks, lives) inside if lives > 0 and bricks:
run ".venv/Scripts/python breakout.py --test-run 1000 --hold none" stdout="score=50 lives=0 bricks=35" label="and nothing changes after that" -- After the last life, no more bricks may break: the ball must stop too.
run ".venv/Scripts/python breakout.py --test-run 10000 --hold auto" stdout="paddle_x=245 score=400 lives=3 bricks=0" label="the autopilot clears the wall and wins"
run ".venv/Scripts/python breakout.py --test-run 12000 --hold auto" stdout="paddle_x=245 score=400" label="after winning, the paddle stops too" -- The game must also stop when there are no bricks left: if lives > 0 and bricks.
contains breakout.py "Game over"
contains breakout.py "You win!"
```

## Challenge: centre the messages

**Optional, ★.** "Game over" and "You win!" are placed at hand-picked positions, so they're only roughly centred, and would be off-centre in any other font or size. Centre them exactly, whatever the text.

You'll need to know that a surface has a `get_rect()` method, which returns a `Rect` the size of the surface at (0, 0), and that you can then move that `Rect`'s `center` (lesson 1.3) and pass the `Rect` to `blit` as the position. There's no automatic check for this one: run the game, lose on purpose, and look.

## Challenge: rows worth more

**Optional, ★.** The top row of bricks is worth 50 points, the next 40, down to 10 for the bottom row. You'll need each brick's row, which you can work out from its `y`, the way the wall was built. Notice how easily that calculation breaks if the wall's position changes: lesson 1.6 will have something to say about it. In a copy.

## Challenge: tough bricks

**Optional, ★★.** The top row needs two hits, and changes colour after the first. A `Rect` can't remember hits, so each brick needs more than a `Rect`: try a list of `[rect, hits_left]` pairs, and see what it does to every line that uses `bricks`. It's exactly the kind of strain that makes Chapters 2 and 3 give the program more structure. In a copy.

## Challenge: side hits

**Optional, ★★★.** A ball that hits a brick's side should bounce sideways, not up. Work out how much the ball and brick overlap across and how much down (`ball.clip(brick)` gives the overlapping `Rect`): if the overlap is narrower than it is tall, the ball came in from the side, so reverse `ball_vx` instead of `ball_vy`. In a copy.

## Done: commit it

**Build:** tick the last two stories and commit.

Here is the finished `breakout.py`, which is also the reference answer to the Your turn. Compare it with yours: if yours passes the checks and differs, that's fine, as long as you can explain every difference.

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

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Breakout")
clock = pygame.time.Clock()
font = pygame.font.Font(None, 36)

paddle = pygame.Rect(0, 0, 100, 14)
paddle.midbottom = (WIDTH // 2, HEIGHT - 30)
paddle_x = float(paddle.x)

ball = pygame.Rect(0, 0, 12, 12)
ball_x = WIDTH / 2
ball_y = HEIGHT / 2
ball_vx = BALL_SPEED * 0.6
ball_vy = -BALL_SPEED * 0.8

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
            ball_x = WIDTH / 2
            ball_y = HEIGHT / 2
            ball_vx = BALL_SPEED * 0.6
            ball_vy = -BALL_SPEED * 0.8

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

Breakout is finished. Tick *Break bricks and score* and *Win or lose*, move them under *Done*, and commit:

```powershell
git add .
git commit -m "Add bricks, score and the end of the game"
```

Then play it properly, start to finish, with the keyboard. It's yours.

```check
contains BACKLOG.md "- [x] No bricks left shows \"You win!\" and stops play." -- Tick the stories' checkboxes and move them under Done.
git-message "bricks"
git-clean
```

## What did we actually learn?

- **Nested loops** build a grid: the inner loop runs completely for each pass of the outer one.
- **A list of simple things** (`Rect`s) can be the whole model of part of a game: drawing and collision both go through it, so removing an item removes the brick everywhere.
- **Text is rendered into a surface and blitted**, like every image. Rendering costs time, so do it only when needed, once you've measured that it matters.
- **Separating update from drawing pays off**: ending the game meant guarding only the update, while drawing and events kept going.
- **Sentinel values like `-1` for "not found"** are common and fragile; `None` (lesson 0.3) or an exception is clearer. You'll make that choice for your own functions in Chapter 2.

In C# and Java, game frameworks keep the same split, with separate `Update` and `Draw` methods, so that "the game is paused" or "the game is over" can stop one without the other.
