---
title: 2.6 — Randomness You Can Test
runtime: python
run: breakout.py
---

Every game of Breakout starts the same way: the ball leaves the middle at exactly the same angle. This lesson makes the serve random, which every real Breakout does, and in doing so meets a problem every project with randomness meets: **how do you test something that's different every time?** The answer is a habit you've already used twice, with `dt` and the slow frame: make the hidden input an explicit one.

## The whole file so far

**Build:** make sure your file matches the end of lesson 2.5.

The whole file, which is also the reference answer to lesson 2.5's Your turn:

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

```check
contains breakout.py "def autopilot(ball_x: float, paddle_x: float) -> int:"
run ".venv/Scripts/python -m pyright breakout.py" stdout="0 errors"
run ".venv/Scripts/python -m pytest -q" stdout="33 passed"
```

## How a computer makes random numbers

**Build:** nothing to keep. Find out where random numbers come from.

A computer follows instructions exactly, so it can't be random by itself. What Python's `random` module gives you are **pseudo-random** numbers: a sequence produced by a fixed calculation that *looks* random. Run this twice:

```powershell
python -c "import random; r = random.Random(42); print([r.randint(1, 6) for _ in range(10)])"
```

```predict
question: What will the second run print, compared with the first?
choice: A different list: the numbers are random
choice: The same list, exactly
choice: The same numbers in a different order
answer: The same list, exactly
explain: Both runs print `[6, 1, 1, 6, 3, 2, 2, 2, 6, 1]`. `random.Random(42)` creates a **random number generator** object (an **RNG**; not the same thing as Python's "generator functions", which you'll meet much later) whose internal state is set from the number 42, the **seed**. Each call to `randint` does a fixed calculation on that state, which produces the next number and updates the state. Same seed, same starting state, same calculations: the same sequence, every time, on every computer. Seed 43 gives a completely different list: `[1, 3, 6, 2, 4, 3, 6, 6, 1, 4]`.
```

**Understand: seeds and generators.**

> **Pseudo-random number generator (PRNG)**: a calculation that turns a starting value, the **seed**, into a long sequence of numbers that pass statistical tests for randomness but are entirely determined by the seed. Python's is called the Mersenne Twister.

- `random.Random(seed)` makes a generator of your own. Its methods produce the numbers: `randint(1, 6)` a whole number from 1 to 6, `uniform(a, b)` a float between `a` and `b`, with every value in that range equally likely, `choice(list)` an item of a list.
- `random.Random()` with no seed (or `None`) seeds itself from the operating system's source of unpredictable data, so each run differs. That's what a game wants when a person is playing.
- The functions directly in the `random` module, like `random.randint`, use one hidden, shared generator. Any code anywhere can draw numbers from it and change what everyone else gets next: lesson 1.6's global state problem, in the standard library.

The comprehension `[r.randint(1, 6) for _ in range(10)]` builds a list by evaluating `r.randint(1, 6)` once for each of 10 passes. `_` is the conventional name for a loop variable whose value isn't used.

> **Engineer:** randomness is just another input. If a function reaches for the shared generator, its output depends on something no caller can see or control, and it can't be tested. If it's **given** a generator, a test can give it one with a known seed and get a known result, and the game can give it an unseeded one. The function can't tell the difference, and doesn't need to.

## A random serve

**Build:** the ball leaves the middle in a random direction, always upwards and at the same speed.

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

**Understand: the command line gains `--seed`.** `USAGE` mentions it, and `parse_args` reads it with `number_after`, exactly like `--test-run` and `--lag-at`, and returns it as a fourth value, so `main` now unpacks four.

**Understand: the serve.** `start_ball` now takes a generator, `rng`, and asks it for one number: how much of the speed goes sideways, `across`, anywhere from −0.6 to 0.6. The rest must go upwards, at the speed that keeps the total exactly `BALL_SPEED`. That's lesson 1.4's Pythagoras, solved for the missing side:

```text
across² + up² = 1        so        up = √(1 − across²)

across = 0.6  →  up = √(1 − 0.36) = √0.64 = 0.8      (the old fixed serve)
across = 0    →  up = √1 = 1                         (straight up)
across = -0.3 →  up = √(1 − 0.09) = √0.91 ≈ 0.954    (a little to the left)
```

`math.sqrt` is the square root, from Python's `math` module. Multiplying both by `BALL_SPEED` gives a velocity 300 long, whichever `across` was drawn.

**Understand: who chooses the seed.** In `main`:

- **a test run with `--seed N`**: `test_frames` isn't `None`, so the outer `if` runs; `seed` is N, so `seed is None` is false and N is kept;
- **a test run without `--seed`**: the outer `if` runs, `seed` is `None`, so the inner `if` sets it to **0**, and test runs stay deterministic, which every check relies on;
- **a normal game without `--seed`**: the outer `if` is skipped, `seed` stays `None`, and `random.Random(None)` seeds itself unpredictably, so every game is different. (A normal game *with* `--seed N` uses N too, which is handy for playing the same serve again.)

The generator is made once, in `main`, and passed to `start_ball` each time a ball is served. One generator for the whole game, owned by `main`, visible in every call that uses it.

Now run the tests:

```powershell
.venv\Scripts\python -m pytest -q
```

```text
FAILED tests/test_arguments.py::test_no_arguments_is_a_normal_game - Assertio...
FAILED tests/test_arguments.py::test_a_test_run_with_every_option - Assertion...
FAILED tests/test_breakout.py::test_a_new_ball_starts_in_the_middle_moving_up_and_right
FAILED tests/test_characterisation.py::test_autopilot_plays_for_ten_seconds
FAILED tests/test_characterisation.py::test_nobody_at_the_paddle_loses - Asse...
FAILED tests/test_characterisation.py::test_autopilot_wins - AssertionError: ...
FAILED tests/test_characterisation.py::test_a_slow_frame_keeps_the_ball_on_screen
FAILED tests/test_characterisation.py::test_a_lost_game_stays_lost - Assertio...
8 failed, 25 passed in 8.38s
```

**Understand: failures you asked for.** All eight failures are this change, and they fall into three groups:

1. **The characterisation tests**: the game's behaviour changed, on purpose. These tests exist to ask "did you mean that?" Yes. So their recorded lines must be updated, deliberately, from what the game now really prints.
2. **Two argument tests**: `parse_args` now returns four values, so its **contract**, what callers can rely on it to return, changed. Every caller and every test of it has to agree with the new contract.
3. **The unit test for `start_ball`**: it calls `start_ball()` with no generator, which no longer works, and it expects one fixed serve, which no longer exists. It needs rewriting, not just updating: that's your turn.

Updating a test because the behaviour *should* have changed is normal. Updating a test because it's in the way, without understanding why it failed, is how test suites stop meaning anything. The difference is knowing which group each failure belongs to before touching it.

```check
contains breakout.py "def start_ball(rng: random.Random) -> tuple[float, float, float, float]:"
run ".venv/Scripts/python -m pyright breakout.py" stdout="0 errors" label="pyright is satisfied"
run ".venv/Scripts/python breakout.py --test-run 600 --hold auto" stdout="paddle_x=435 score=70" label="a test run with the default seed plays the expected game" -- A test run without --seed must use seed 0: random.Random(0).
```

## Update the safety net, on purpose

**Build:** the characterisation tests, re-recorded for the random serve, plus one for a different seed.

Each recorded line below is what the game prints now; check one or two yourself by running the command.

```python file=tests/test_characterisation.py
# Characterisation tests: they record what breakout.py does now, so that a change
# that alters its behaviour by accident is caught. Test runs use seed 0 unless told otherwise.
import subprocess
import sys
from pathlib import Path

GAME = Path(__file__).parent.parent / "breakout.py"


def play(*args):
    return subprocess.run([sys.executable, str(GAME), *args], capture_output=True, text=True)


def last_line(*args):
    return play(*args).stdout.strip().splitlines()[-1]


def test_autopilot_plays_for_ten_seconds():
    assert last_line("--test-run", "600", "--hold", "auto") == "frames=600 paddle_x=435 score=70 lives=3 bricks=33 inside=True"


def test_nobody_at_the_paddle_loses():
    assert last_line("--test-run", "600", "--hold", "none") == "frames=600 paddle_x=270 score=40 lives=0 bricks=36 inside=False"


def test_autopilot_wins():
    assert last_line("--test-run", "10000", "--hold", "auto") == "frames=10000 paddle_x=183 score=400 lives=3 bricks=0 inside=True"


def test_holding_right_for_half_a_second():
    assert last_line("--test-run", "30", "--hold", "right") == "frames=30 paddle_x=480 score=10 lives=3 bricks=39 inside=True"


def test_a_slow_frame_keeps_the_ball_on_screen():
    assert last_line("--test-run", "400", "--hold", "auto", "--lag-at", "40") == "frames=400 paddle_x=536 score=50 lives=2 bricks=35 inside=True"


def test_a_bad_frame_count_is_a_usage_error():
    result = play("--test-run", "ten")
    assert result.returncode == 2
    assert result.stdout.strip().splitlines()[-1].startswith("usage: python breakout.py")


def test_holding_left_for_a_second_stops_at_the_left_edge():
    assert last_line("--test-run", "60", "--hold", "left") == "frames=60 paddle_x=0 score=10 lives=3 bricks=39 inside=True"


def test_a_lost_game_stays_lost():
    assert last_line("--test-run", "1000", "--hold", "none") == "frames=1000 paddle_x=270 score=40 lives=0 bricks=36 inside=False"


def test_a_different_seed_plays_a_different_game():
    assert last_line("--test-run", "600", "--hold", "auto", "--seed", "7") == "frames=600 paddle_x=7 score=60 lives=3 bricks=34 inside=True"
```

**Understand.** Five recorded lines changed, and two didn't: holding right for half a second, and holding left for a second, both finish before the serve matters to anything they check. The new test pins down that `--seed` really changes the game. If a later change ignored `--seed` and always used 0, every other test would still pass, and only this one would notice.

```check
run ".venv/Scripts/python -m pytest -q tests/test_characterisation.py" stdout="9 passed" label="the nine characterisation tests pass"
```

## Update the argument tests

**Build:** the argument tests, for `parse_args`'s new contract.

```python file=tests/test_arguments.py
# Lesson 2.4, with --seed added in 2.6: what the game's command line should accept, and what it should refuse.
import pytest

import breakout


def test_no_arguments_is_a_normal_game():
    assert breakout.parse_args([]) == (None, "none", None, None)


def test_a_test_run_with_every_option():
    assert breakout.parse_args(["--test-run", "600", "--hold", "auto", "--lag-at", "40", "--seed", "7"]) == (600, "auto", 40, 7)


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

**Understand.** The two contract tests now expect four values, with `None` for "no seed given" and `7` for `--seed 7`. The new test makes `--seed lucky` a usage error, which `number_after` already handles: one function serving three options, tested through the option that uses it.

```check
run ".venv/Scripts/python -m pytest -q tests/test_arguments.py" stdout="8 passed" label="the eight argument tests pass"
```

## Your turn: test the serve

**Build, on your own:** replace the old `start_ball` test in `tests/test_breakout.py` with tests for the random serve.

A random function can't be tested by comparing with one fixed answer. Test its **properties** instead: things that must be true whatever number was drawn.

| The test's name must contain | It checks |
|---|---|
| `same_seed` | two generators with the same seed serve exactly the same ball |
| `every_serve` | for **100 different seeds**, every serve starts at (320, 240), goes **upwards**, has a sideways speed of at most 0.6 × `BALL_SPEED`, and a total speed of `BALL_SPEED` |

`math.hypot(vx, vy)` is √(vx² + vy²), the length of the velocity arrow. Delete `test_a_new_ball_starts_in_the_middle_moving_up_and_right`, then run the tests: all must pass.

There's a trap in the last property. Find it by running your test, not by reading the hints first.

```hints
nudge: If your speed check fails for some seeds, print the speed it computed (`print(math.hypot(vx, vy))` inside the loop, then run with `-s` so pytest shows printed output). Is it wrong, or just not *exactly* 300?
concept: Floats are stored in binary with about 16 significant digits, so most decimal fractions can't be stored exactly, and arithmetic on them rounds a little. `0.1 + 0.2` is `0.30000000000000004` in Python (and in C#, Java and JavaScript). For 17 of the first 100 seeds, √(vx² + vy²) comes out as `300.00000000000006`. So floats must never be compared with `==` after arithmetic: `math.isclose(a, b)` is true when they agree to about 9 significant digits, which is the right question.
shape: Two test functions. The first calls `breakout.start_ball(random.Random(1))` twice and compares the results with `==` (same seed, same calculation, so exactly equal: no rounding difference). The second loops `for seed in range(100):`, unpacks `x, y, vx, vy = breakout.start_ball(random.Random(seed))`, and asserts each property, using `math.isclose` for the speed. The file needs `import math` and `import random` at the top.
answer: ~~~python
def test_the_same_seed_serves_the_same_ball():
    assert breakout.start_ball(random.Random(1)) == breakout.start_ball(random.Random(1))


def test_every_serve_starts_in_the_middle_going_up_at_full_speed():
    for seed in range(100):
        x, y, vx, vy = breakout.start_ball(random.Random(seed))
        assert (x, y) == (320, 240)
        assert vy < 0
        assert abs(vx) <= 0.6 * breakout.BALL_SPEED
        assert math.isclose(math.hypot(vx, vy), breakout.BALL_SPEED)
~~~

with `import math` and `import random` added at the top of the file. The loop turns one test into a hundred checks; if one fails, pytest's report shows the values, and `seed` among the local variables if you run with `-l` (show locals). Comparing the whole tuple in the first test with `==` is safe because nothing is being compared that was computed two different ways: the same seed runs the same calculation, so the bits are identical. The next step shows the whole file.
```

```check
run ".venv/Scripts/python -m pytest -q -k same_seed" stdout="1 passed" label="a test that the same seed serves the same ball passes"
run ".venv/Scripts/python -m pytest -q -k every_serve" stdout="1 passed" label="a test of every serve's properties, over many seeds, passes" -- Compare the speed with math.isclose, not ==: floats round.
lacks tests/test_breakout.py "start_ball()" -- Remove the old test that calls start_ball() with no generator.
run ".venv/Scripts/python -m pytest -q" stdout="36 passed" label="the whole suite passes"
```

## Done: the end of Chapter 2

**Build:** the reference test file, a commit, and the debt list brought up to date.

Here is the whole of `tests/test_breakout.py`, the reference answer to the Your turn:

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
    assert breakout.start_ball(random.Random(1)) == breakout.start_ball(random.Random(1))


def test_every_serve_starts_in_the_middle_going_up_at_full_speed():
    for seed in range(100):
        x, y, vx, vy = breakout.start_ball(random.Random(seed))
        assert (x, y) == (320, 240)
        assert vy < 0
        assert abs(vx) <= 0.6 * breakout.BALL_SPEED
        assert math.isclose(math.hypot(vx, vy), breakout.BALL_SPEED)


def test_holding_right_for_half_a_second_moves_the_paddle_210_pixels():
    assert breakout.move_paddle(270, 1, 0.5) == 480


def test_the_paddle_stops_at_the_right_edge():
    assert breakout.move_paddle(500, 1, 1) == 540


def test_the_paddle_stops_at_the_left_edge():
    assert breakout.move_paddle(10, -1, 1) == 0


def test_the_autopilot_steers_towards_the_ball():
    assert breakout.autopilot(100, 270) == -1
    assert breakout.autopilot(320, 270) == 0
    assert breakout.autopilot(500, 270) == 1


def test_a_ball_in_the_middle_of_the_screen_is_left_alone():
    assert breakout.bounce_off_walls(100, 100, 180, -240) == (100, 100, 180, -240)


def test_the_left_wall_sends_the_ball_right():
    assert breakout.bounce_off_walls(3, 100, -180, -240) == (6, 100, 180, -240)


def test_the_right_wall_sends_the_ball_left():
    assert breakout.bounce_off_walls(638, 100, 180, -240) == (634, 100, -180, -240)


def test_the_top_wall_sends_the_ball_down():
    assert breakout.bounce_off_walls(100, 2, 180, -240) == (100, 6, 180, 240)


def test_a_ball_far_past_the_top_is_put_back_and_keeps_moving_down():
    # Lesson 1.4's bug: after one slow frame the ball was 40 pixels past the top, and the
    # wall flipped its direction every frame, so it never came back.
    assert breakout.bounce_off_walls(100, -40, 180, 240) == (100, 6, 180, 240)


def test_the_paddle_bounces_a_ball_coming_down_straight_up_from_its_middle():
    paddle = pygame.Rect(270, 436, 100, 14)
    ball = pygame.Rect(0, 0, 12, 12)
    ball.center = (320, 438)
    assert breakout.bounce_off_paddle(ball, paddle, 180, 240) == (0, -240)


def test_the_paddle_steers_a_ball_hitting_its_right_end():
    paddle = pygame.Rect(270, 436, 100, 14)
    ball = pygame.Rect(0, 0, 12, 12)
    ball.center = (370, 438)
    assert breakout.bounce_off_paddle(ball, paddle, 180, 240) == (240, -240)


def test_the_paddle_ignores_a_ball_moving_up():
    paddle = pygame.Rect(270, 436, 100, 14)
    ball = pygame.Rect(0, 0, 12, 12)
    ball.center = (320, 438)
    assert breakout.bounce_off_paddle(ball, paddle, 180, -240) == (180, -240)


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

**Understand: why `==` failed for the speed.** With seed 0, the default for every test run, the serve's speed comes out as `300.00000000000006`, not 300; with seed 9 it's `299.99999999999994`. Of seeds 0 to 99, 17 aren't exactly 300. The maths is right; the arithmetic isn't exact. A float is stored in binary with about 16 significant digits, so most decimal fractions can't be stored exactly, and each operation rounds a tiny amount: try `python -c "print(0.1 + 0.2)"`, which prints `0.30000000000000004`. Squaring, adding and taking a square root, as `math.hypot` does, rounds several times.

So two floats that come from arithmetic should be compared as **close enough**, not equal. `math.isclose(a, b)` is `True` when the difference between them is tiny compared with their size (by default, within about one part in a billion). The earlier tests that use `==`, like `start_ball` in lesson 2.4 or `(x, y) == (320, 240)` here, are safe only because those values come out exact: `640 / 2` is exactly 320. When a value comes from a calculation that can round, use `isclose`.

Add a story for the serve to `BACKLOG.md` under *Done* (*As a player, I want the ball to start in a different direction each game, so that games aren't all the same*, with its checks ticked), update the *Technical debt* list, and commit with a message that mentions the **serve**:

```powershell
git add .
git commit -m "Serve the ball in a random direction, with seeded test runs"
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="36 passed"
run ".venv/Scripts/python -m pyright breakout.py" stdout="0 errors"
git-message "serve"
git-clean
```

## What did we actually learn? (Chapter 2)

This chapter changed almost every line of `breakout.py` without changing what the game does, then added a feature, safely. On the way:

- **A safety net first**: characterisation tests pin down current behaviour before a refactoring, and make every later change visible.
- **Functions** name pieces of knowledge so each lives in one place, with parameters in and results out. **Pure functions** are the easiest code there is to understand and test.
- **Importing runs code**; `main()` and the `__name__` guard make a file usable as a module, and turn global state into local state.
- **Unit tests** check one piece directly, fast and precisely; **regression tests** keep fixed bugs fixed; a **failing test is a bug report**.
- **Types**: a checker reads the code and finds mistakes on every line before it runs, `X | None` included.
- **Hidden inputs become parameters**: the current folder, `dt`, the random generator. Each one made something testable that wasn't.
- **Floats round**: compare them with `math.isclose`, never `==`, after arithmetic.
- **Tests that fail after an intentional change** are asking a question; answer it deliberately.

Look at your technical debt list. Fixed: the duplicated ball set-up, the colour coupling, global state, the half-checked arguments, the magic numbers in the physics. Still there: the test machinery tangled into `main`, a `main` that's still long and deeply nested, and two "tuple" results, `parse_args`'s four values and the ball's four numbers passed everywhere, that only make sense if you remember which position means what. That last one is where **Chapter 3** starts: objects and data. A ball that knows its own position and velocity, a `Settings` object with names instead of positions, and a brick that knows its own colour.

In C# and Java the same randomness discipline applies: `new Random(42)` in both is a seeded generator, and passing a `Random` (or, in modern Java, a `RandomGenerator`) into the code that needs it, instead of creating one inside, is how their tests control randomness. Comparing doubles with a tolerance, `Assert.Equal(expected, actual, precision)` in xUnit and `assertEquals(expected, actual, delta)` in JUnit, is the same lesson as `math.isclose`.
