---
title: 2.3 — What Import Runs
runtime: python
run: breakout.py
---

`bounce_off_walls` is a pure function: numbers in, numbers out. Testing it should be one line: call it, check the answer. But try to call *any* function in `breakout.py` from outside, and something unexpected happens. This lesson finds out what, from first principles, and fixes it. That fix also clears one of the biggest items in your technical debt.

## Call one function from outside

**Build:** make sure your file matches the end of lesson 2.2, then try to use one of its functions from another program.

Here is the whole file as lesson 2.2 left it, which is also the reference answer to its Your turn. Compare yours with it:

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
```

Now ask Python to load `breakout.py` and call `clamp`, from the terminal:

```powershell
.venv\Scripts\python -c "import breakout; print(breakout.clamp(5, 0, 3))"
```

```predict
question: What will happen?
choice: It prints 3 straight away
choice: The game opens; when you close it, 3 is printed
choice: An error: clamp can't be used from outside the file
answer: The game opens; when you close it, 3 is printed
explain: `import breakout` **runs** `breakout.py`, top to bottom, like running it with `python breakout.py`. Defining the functions is part of that, and so is everything else at the top level: the argument parsing, `pygame.init()`, the window, and the whole game loop. Only when the loop ends (you close the window) does the import finish, and then `breakout.clamp(5, 0, 3)` runs and prints 3.
```

Run it, see the game appear, and close it.

**Understand: what `import` does.** The first time a program runs `import breakout`, Python:

1. finds `breakout.py` by searching `sys.path` (lesson 0.2); `python -c` puts the current folder first, so it's found in the project folder;
2. creates an empty **module** object: a container for names;
3. **runs every line of the file**, top to bottom, inside that module. `def` lines create functions, `WIDTH = 640` creates a constant, and a `while` loop... runs the loop;
4. stores the finished module in a dictionary, `sys.modules`, so a second `import breakout` anywhere in the same program reuses it instead of running the file again;
5. binds the name `breakout` to the module, so `breakout.clamp` finds the function.

So there's no such thing in Python as "just loading" a file's definitions: a file *is* a program, and importing it runs it. For a file that only defines functions and constants, running it just defines them. `breakout.py` also starts a game.

> **Engineer:** code at the top level of a file runs as a **side effect of importing it**. Any program that wants to reuse one function, including every test, has to accept whatever else the file does when it runs. Top-level code should only define things; anything that *does* something belongs in a function that is called on purpose.

```check
contains breakout.py "def autopilot(ball_x, paddle_x):" -- Your file should match the one above.
run ".venv/Scripts/python -m pytest -q" stdout="8 passed"
```

## Who is running?

**Build:** a tiny file that shows how a file can tell whether it was run or imported.

Create `whoami.py`:

```python file=whoami.py
print("my name is", __name__)
```

Run it both ways:

```powershell
python whoami.py
python -c "import whoami"
```

```text
my name is __main__
my name is whoami
```

**Understand.** Every module has a variable called `__name__`, set by Python before the file runs. When a file is imported, `__name__` is the module's name: `"whoami"`. When a file is run directly, as the program, Python names that module `"__main__"`, which means "the main program". So a file can ask which of the two is happening:

```python
if __name__ == "__main__":
    ...   # only when run as a program, never when imported
```

Names with two underscores on each side, like `__name__` and `__file__` (lesson 0.2), are called **dunder** names ("double underscore"). They're Python's own: set or used by the language itself.

```predict
question: `python -c "import whoami; import whoami"` imports the same file twice. How many times is `my name is whoami` printed?
answer: 1
explain: The first `import` runs the file and stores the finished module in `sys.modules`, a dictionary of every module this program has imported (point 4 above). The second `import` finds `whoami` already there and reuses it, without running the file again. That's why importing a module in ten files costs nothing extra, and also why changing a file while a program runs doesn't change the running program.
verify: python -c "import subprocess, sys; r = subprocess.run([sys.executable, '-c', 'import whoami; import whoami'], capture_output=True, text=True); print(r.stdout.count('my name is whoami'))"
```

Check it, and look inside `sys.modules` while you're there:

```powershell
python -c "import whoami; import whoami; import sys; print('whoami' in sys.modules)"
```

```text
my name is whoami
True
```

These checks run `python`, the system Python, not `.venv\Scripts\python`: `whoami.py` imports nothing outside the standard library, so any Python 3.12 or newer gives the same answer.

```check
run "python whoami.py" stdout="my name is __main__" label="run directly, its name is __main__"
run "python -c \"import whoami\"" stdout="my name is whoami" label="imported, its name is whoami"
```

## The arguments, read by a function

**Build:** reading the command line becomes a function that's given the arguments and returns the settings.

First, delete `whoami.py`: it was an experiment, and left in the project it would be committed with the game. `Remove-Item whoami.py`.

Right now the top of the file reads `sys.argv` the moment the file runs. Cut that block, from the `# A test run` comment to the line that reads `--lag-at`, and paste it just above `def start_ball():`, as the body of a new function `parse_args(args)`. Inside it, the `os.environ` line goes (that's a side effect, and moves down), and the function ends by returning the three settings. The block's first line, `args = sys.argv[1:]`, isn't moved but deleted: `args` is now the function's parameter, given by whoever calls it. Then, just above `pygame.init()`, call it:

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



def clamp(value, low, high):
    return max(low, min(value, high))


def parse_args(args):
    # A test run lets another program play the game, with no window:
    #   python breakout.py --test-run FRAMES [--hold left|right|none|auto] [--lag-at FRAME]
    test_frames = None
    if "--test-run" in args:
        i = args.index("--test-run")
        if i + 1 >= len(args) or not args[i + 1].isdigit():
            print("usage: python breakout.py [--test-run FRAMES]")
            sys.exit(2)
        test_frames = int(args[i + 1])
    hold = "none"
    if "--hold" in args:
        hold = args[args.index("--hold") + 1]
    lag_at = None
    if "--lag-at" in args:
        lag_at = int(args[args.index("--lag-at") + 1])
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


test_frames, hold, lag_at = parse_args(sys.argv[1:])
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
```

**Understand.** `parse_args(args)` takes the argument list and **returns** the three settings, instead of reading `sys.argv` itself. A function that reads `sys.argv` can only ever be given the real command line; one that takes `args` as a parameter can be given any list, for instance by a test. `test_frames, hold, lag_at = parse_args(...)` unpacks the three returned values into three names, like `WIDTH, HEIGHT = 640, 480` did in lesson 1.1.

The dummy video driver is set by the caller, not by `parse_args`, because it's a side effect: it belongs where things happen, not in the function that reads the settings. `parse_args` still has two side effects of its own, the usage `print` and `sys.exit(2)`. They stay for now, and lesson 2.4 shows they can still be tested, because `sys.exit` works by raising an exception.

```check
missing whoami.py -- Delete whoami.py: Remove-Item whoami.py. It was an experiment, not part of the game.
contains breakout.py "def parse_args(args):"
run ".venv/Scripts/python -m pytest -q" stdout="8 passed" label="the game still behaves exactly the same" -- main must do exactly what the top-level code did.
```

## Everything else in main

**Build:** move everything that *does* something into a function, `main`.

Above the `parse_args` call, add `def main(args):`, change the call to `parse_args(args)`, and indent everything from the call to the end of the file by one level, 4 spaces: select those lines and press **Tab** (in Project Studio's editor or VS Code; Shift+Tab undoes it). Python needs indentation made of spaces, used consistently: an `IndentationError` or `TabError` means some line isn't. The step's code shows it as one instruction, not as every line again:

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



def clamp(value, low, high):
    return max(low, min(value, high))


def parse_args(args):
    # A test run lets another program play the game, with no window:
    #   python breakout.py --test-run FRAMES [--hold left|right|none|auto] [--lag-at FRAME]
    test_frames = None
    if "--test-run" in args:
        i = args.index("--test-run")
        if i + 1 >= len(args) or not args[i + 1].isdigit():
            print("usage: python breakout.py [--test-run FRAMES]")
            sys.exit(2)
        test_frames = int(args[i + 1])
    hold = "none"
    if "--hold" in args:
        hold = args[args.index("--hold") + 1]
    lag_at = None
    if "--lag-at" in args:
        lag_at = int(args[args.index("--lag-at") + 1])
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
```

Now run the file: `.venv\Scripts\python breakout.py --test-run 60`.

```predict
question: What does `breakout.py --test-run 60` print now?
choice: frames=60 and the rest of the summary, as before
choice: Nothing but pygame's greeting
choice: A NameError: main is not defined
answer: Nothing but pygame's greeting
explain: The file now defines `main` and never calls it. A `def` only creates the function; its body runs when something calls it, and nothing does. So the program imports pygame, defines its constants and functions, and ends. The characterisation tests fail for the same reason. The next step adds the call.
```

**Understand.** Every game variable, `paddle_x`, `ball_vx`, `lives`, `score`, `bricks`, is now a **local variable of `main`**. Nothing outside `main` can **rebind** them. A function can change one only if `main` hands it a mutable object (lesson 2.2), like the `bricks` list or a `Rect`, and then you can see it happen, in the call. Everything else reaches `main` only as a returned value that `main` chooses to store.

```check
contains breakout.py "def main(args):"
contains breakout.py "test_frames, hold, lag_at = parse_args(args)"
```

## Only when run directly

**Build:** call `main`, but only when the file is run as a program.

The `whoami.py` step showed how a file can tell: `__name__` is `"__main__"` only when the file is run directly. Add two lines at the very end, not indented:

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



def clamp(value, low, high):
    return max(low, min(value, high))


def parse_args(args):
    # A test run lets another program play the game, with no window:
    #   python breakout.py --test-run FRAMES [--hold left|right|none|auto] [--lag-at FRAME]
    test_frames = None
    if "--test-run" in args:
        i = args.index("--test-run")
        if i + 1 >= len(args) or not args[i + 1].isdigit():
            print("usage: python breakout.py [--test-run FRAMES]")
            sys.exit(2)
        test_frames = int(args[i + 1])
    hold = "none"
    if "--hold" in args:
        hold = args[args.index("--hold") + 1]
    lag_at = None
    if "--lag-at" in args:
        lag_at = int(args[args.index("--lag-at") + 1])
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

Now try the import again:

```powershell
.venv\Scripts\python -c "import breakout; print(breakout.clamp(5, 0, 3))"
```

```text
pygame-ce 2.5.8 (SDL 2.32.10, Python 3.14.3)
3
```

No game. The first line is pygame announcing itself, which it does whenever it's imported, and `breakout.py` imports pygame at its top. Then `3`. And `.venv\Scripts\python breakout.py` still starts the game.

**Understand: what moved, and why it matters.**

- **The top level now only defines things**: imports, constants, functions. Importing it has no effect except making those names available.
- **The last two lines** call `main` only when the file is the program: `sys.argv[1:]` is passed in from there, the one place that knows about the real command line.

Look back at lesson 1.6's list. *Everything is global: `ball_vx` is changed on 6 lines.* It's still changed in several places, but all of them are now inside `main`, and the functions that compute its new values receive it as a parameter and return the result. To understand the ball's velocity you read `main` and the functions it calls, not the whole file.

> **Engineer:** this file now has a **seam**: a place where you can reach in and use a piece without running the rest. Most "this code is impossible to test" problems turn out to be missing seams: code that does its work at import time, reads global settings directly, or creates the things it needs inside itself instead of being given them. You'll create seams on purpose from now on, and Chapter 9 is built around them.

```check
run ".venv/Scripts/python -c \"import breakout; print(breakout.clamp(5, 0, 3))\"" stdout="3" timeout=15 label="importing breakout no longer starts the game" -- Put everything from pygame.init() down into def main(args):, and call it only under if __name__ == "__main__":
run ".venv/Scripts/python -m pytest -q" stdout="8 passed" label="the game still behaves exactly the same" -- main must do exactly what the top-level code did.
```

## Import it from a test

**Build:** the first test that calls a function directly.

Create `tests/test_breakout.py`:

```python file=tests/test_breakout.py
import breakout


def test_clamp_leaves_a_value_in_range_alone():
    assert breakout.clamp(2, 0, 3) == 2
```

```powershell
.venv\Scripts\python -m pytest -q
```

```text
.........                                                                [100%]
9 passed in 8.22s
```

Give pytest a file's path and it runs only the tests in that file. Run just the new file and look at the time:

```powershell
.venv\Scripts\python -m pytest -q tests/test_breakout.py
```

```text
.                                                                        [100%]
1 passed in 0.08s
```

**Understand.** This is a **unit test**: it tests one small unit of code, here one function, directly, without running the program. 0.08 seconds, against about one second for each characterisation test, because no game runs: Python imports `breakout` (defining its functions, nothing more), calls `clamp`, compares. You could run thousands of these in the time one game takes.

`import breakout` works here for a reason that's worth knowing exactly: `python -m pytest` puts the **current folder** at the front of `sys.path` (the empty first entry from lesson 0.2), and you ran it from the project folder, where `breakout.py` is. Which means it depends on where you are. Try it from inside `tests`:

```powershell
cd tests
..\.venv\Scripts\python -m pytest -q test_breakout.py
cd ..
```

```text
E   ModuleNotFoundError: No module named 'breakout'
```

A hidden input again: the current folder.

> **Unit test**: a test of one small piece of code (a function, or later a class) on its own, without the rest of the program. **Fast, precise, and narrow**: it runs in milliseconds and, when it fails, says exactly which piece is wrong, but it can't see how the pieces work together. That's what characterisation tests and, later, **integration tests** (tests of several real pieces working together, from Chapter 6) are for.

```check
run ".venv/Scripts/python -m pytest -q tests/test_breakout.py" stdout="1 passed" label="the unit test passes"
```

## Tell pytest where the code is

**Build:** a settings file that makes the tests work from any folder.

Create `pytest.ini` in the project folder:

```ini file=pytest.ini
[pytest]
pythonpath = .
```

```powershell
cd tests
..\.venv\Scripts\python -m pytest -q test_breakout.py
cd ..
```

```text
1 passed in 0.08s
```

**Understand.** When pytest starts, it looks for a settings file, starting in the current folder and going up through the folders above it. `pytest.ini` is one of the names it looks for. The folder where it finds one becomes the **root folder** of the project, and the settings in it apply. `pythonpath = .` tells pytest to put the root folder (`.`, relative to the settings file) on `sys.path`, whichever folder you start from. The **INI** format is old and simple: a `[section]` heading, then `name = value` lines. Traced, for `python -m pytest` started inside the `tests` folder:

```text
started in            forge\tests     no pytest.ini here: go up
looks in              forge           pytest.ini found: forge is the root folder
pythonpath = .        forge is added to sys.path
import breakout       found as forge\breakout.py
```

pytest prints its decision in the header of a run without `-q`: `rootdir: C:\Users\you\Documents\forge` and `configfile: pytest.ini`.

Now the setting is written down in the project, instead of depending on where you happen to be standing. Chapter 4 moves it into the project's main settings file, `pyproject.toml`.

```check
file pytest.ini
run "cd tests; ../.venv/Scripts/python -m pytest -q test_breakout.py" stdout="1 passed" label="the unit test passes even when pytest is started inside tests" -- pytest.ini goes in the project folder, with the two lines [pytest] and pythonpath = .
```

## Your turn: pin down clamp

**Build, on your own:** two more unit tests for `clamp`, then commit.

`clamp` has three behaviours, and one test covers the first:

| Test name | Behaviour |
|---|---|
| `test_clamp_leaves_a_value_in_range_alone` | a value inside the range comes back unchanged (done) |
| `test_clamp_raises_a_value_below_the_range` | a value below `low` comes back as `low` |
| `test_clamp_lowers_a_value_above_the_range` | a value above `high` comes back as `high` |

Write the other two in `tests/test_breakout.py`. Then make each fail once, on purpose: change `clamp` to `return value`, run the tests, see which fail and read why, and put it back. Commit with a message that mentions **main**.

```hints
nudge: Each test is one call to `breakout.clamp` with numbers you choose, and one `assert` comparing the result with what it should be. Pick values where the right answer is obvious: what's `clamp(-5, 0, 3)`?
concept: Choose inputs that only a correct `clamp` gets right. If you test `clamp(0, 0, 3) == 0`, a broken `clamp` that just returns `value` would pass too, because 0 is already in range. A value clearly below the range, like −5, only comes back as 0 if the lower bound is really applied. That's what "make it fail on purpose" checks.
shape: Two functions with the given names, each `assert breakout.clamp(…) == …`. Then `git add .` and `git commit -m "..."`.
answer: ~~~python
def test_clamp_raises_a_value_below_the_range():
    assert breakout.clamp(-5, 0, 3) == 0


def test_clamp_lowers_a_value_above_the_range():
    assert breakout.clamp(9, 0, 3) == 3
~~~

With `clamp` broken to `return value`, both new tests fail (`assert -5 == 0`, `assert 9 == 3`) and the first passes, since 2 really is in range. A test that passes for broken code isn't testing anything; each of these three catches a different way `clamp` could go wrong.
```

```check
run ".venv/Scripts/python -m pytest -q -k below_the_range" stdout="1 passed" label="a test for a value below the range passes" -- Name it test_clamp_raises_a_value_below_the_range.
run ".venv/Scripts/python -m pytest -q -k above_the_range" stdout="1 passed" label="a test for a value above the range passes" -- Name it test_clamp_lowers_a_value_above_the_range.
git-message "main" -- Commit with a message that mentions main.
git-clean
```

## Challenge: what runs at import?

**Optional, ★.** In `scratch/run_or_import.py`, put a `print` at the top level, another inside a function that's never called, and a third under `if __name__ == "__main__":`. Predict exactly what `python scratch\run_or_import.py` prints, and what `python -c "import sys; sys.path.insert(0, 'scratch'); import run_or_import"` prints, then check. (`sys.path.insert(0, ...)` puts a folder at the front of the import search, lesson 0.2.)

## Challenge: hidden inputs

**Optional, ★★.** `main` still reads things that aren't its parameters: the clock, the keyboard, `os.environ`. List every input `main` has that isn't passed in, under *Technical debt* in `BACKLOG.md`, with a line number for each. Spotting where a function reaches outside itself is the skill Chapter 9 depends on.

## Challenge: a parse that doesn't exit

**Optional, ★★.** On a copy, change `parse_args` so it never prints or exits: it returns either the settings or an error message, and `main` does the printing and `sys.exit(2)`. Note which of lesson 2.4's tests would have to change, and why. Moving side effects to the edge of a program, and what it costs. (A common shape for that edge is `sys.exit(main(sys.argv[1:]))`, with `main` returning the exit code; this series keeps `main` returning nothing, so a normal end exits with 0.)

## What did we actually learn?

- **Importing a file runs it**, top to bottom, once per program (then `sys.modules` remembers it). So top-level code should only define things.
- **`if __name__ == "__main__":`** separates "run as a program" from "imported as a module", and `main(args)` holds everything the program does.
- **Locals instead of globals**: the game's state lives in `main`, and functions receive and return values.
- **Seams**: a function that takes its inputs as parameters (`parse_args(args)` rather than reading `sys.argv`) can be called from anywhere, including tests.
- **Unit tests** call one piece directly: milliseconds instead of seconds, and a failure that names the piece.
- **Write configuration down** (`pytest.ini`) instead of depending on where commands are run.

C# and Java avoid this problem by design. A Java file contains only classes, and a program starts at one designated method, `public static void main(String[] args)`. In C# it's `static void Main(string[] args)`, or, since C# 9, statements written directly in **one** file of the project, which becomes the entry point; no other file may do it. Using a class from another file never runs anything but what you call. Python's `if __name__ == "__main__": main(sys.argv[1:])` is the same idea, built by hand.
