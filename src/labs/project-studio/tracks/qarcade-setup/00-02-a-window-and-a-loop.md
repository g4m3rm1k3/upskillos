---
title: 0.2 — A Window and a Loop
runtime: python
run: window.py
support: tests/conftest.py
---

Every game is one loop that runs many times a second: **read the input, update the world, draw it, wait**. Every reinforcement-learning agent runs the same loop with different words: **observe, choose an action, let the world respond**. This lesson builds the game version in pygame, so that when the agent's loop arrives in Chapter 1 you already know the shape.

## Read the tests first

**This step: create the supplied files and read them. No code yet.**

Every lesson in this series comes with a test file: small functions that run your code and check what it does. **Check my work** runs them. Reading them first tells you exactly what you're about to build.

Click **Create provided tests/test_window.py** above. It also creates a second supplied file, `tests/conftest.py`, explained below.

```python file=tests/test_window.py provided
# Tests for window.py (lesson 0.2).
# Run them with:   .venv\Scripts\python -m pytest -q tests/test_window.py
import time

import pygame


def test_frames_run_as_many_as_asked_for():
    from window import run
    assert run(max_frames=3) == 3


def test_tick_waits_for_one_sixtieth_of_a_second():
    from window import run
    start = time.perf_counter()
    run(max_frames=30)
    assert time.perf_counter() - start >= 0.4, "30 frames at 60 a second take half a second"


def test_keys_step_left_and_right():
    from window import STEP, move
    assert move(320, pygame.K_RIGHT) == 320 + STEP
    assert move(320, pygame.K_LEFT) == 320 - STEP
    assert move(320, pygame.K_SPACE) == 320, "other keys don't move"


def test_edges_stop_the_dot():
    from window import STEP, WIDTH, move
    assert move(STEP // 2, pygame.K_LEFT) == STEP // 2
    assert move(WIDTH - STEP // 2, pygame.K_RIGHT) == WIDTH - STEP // 2
```

How to read a test:

- Each `def test_…` is one test. pytest finds every function whose name starts with `test_` in every file whose name starts with `test_`, and calls it.
- `assert something` checks that `something` is true. If it isn't, the test fails, and pytest shows the values involved and the message after the comma.
- The imports are **inside** each test. If `window.py` doesn't exist yet, or has no `move`, only the tests that need it fail; the rest still run. That's why each step below can check its own part while later parts are still missing.
- A test can't look at a real window, so the game is written to be testable: `run(max_frames=3)` runs exactly 3 frames and returns how many it ran, and `move` is a plain function that doesn't need a window at all.

Now open `tests/conftest.py`:

```python
import os

os.environ.setdefault("SDL_VIDEODRIVER", "dummy")
os.environ.setdefault("SDL_AUDIODRIVER", "dummy")
```

pytest runs a file named `conftest.py` before any test in its folder. **SDL** is the C library pygame is built on, and it reads these two environment variables when it starts. The `"dummy"` drivers make a window that exists only in memory and a sound device that plays nothing, so the tests can run your game loop without a screen and without waiting for real audio to start up (on the machine this series was written on, starting the real sound device takes about a second). `setdefault` sets each one only if it isn't set already.

Each check below runs one part of this file with `-k`: `pytest -k frames` runs only the tests whose names contain `frames`.

```check
file tests/conftest.py -- Click "Create provided tests/test_window.py" above; it creates this file too.
file tests/test_window.py -- Click "Create provided tests/test_window.py" above.
```

## A window that stays open

Create `window.py`:

```python file=window.py
import pygame

WIDTH, HEIGHT = 640, 240
BACKGROUND = (24, 26, 33)


def run(max_frames=None):
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Q-Arcade")
    frames = 0
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
        screen.fill(BACKGROUND)
        pygame.display.flip()
        frames += 1
        if max_frames is not None and frames >= max_frames:
            running = False
    pygame.quit()
    return frames


if __name__ == "__main__":
    run()
```

Press **Run**. A dark window opens and stays open until you close it.

Line by line, and what happens underneath:

- **`pygame.init()`** starts pygame's parts: the display, the clock, fonts, sound. **`set_mode((640, 240))`** opens a window 640 pixels wide and 240 tall, and returns `screen`, a **Surface**: a block of memory holding one colour for every pixel, 640 × 240 = 153,600 of them.
- **`while running:`** is the game loop. Each time round is one **frame**.
- **`pygame.event.get()`** is how the program hears the outside world. Windows doesn't call your code when a key is pressed or the close button is clicked. It puts a message in a **queue** belonging to your window, and the messages wait there until you collect them. `event.get()` takes every waiting message out of the queue and returns them as a list. `pygame.QUIT` is the one sent when the close button is clicked. If a program stops collecting its messages, Windows notices after a few seconds and marks the window *Not responding*. So every frame must call it, even a frame that ignores what it finds.
- **`screen.fill(BACKGROUND)`** sets every pixel in the Surface to one colour. Colours are `(red, green, blue)`, each 0 to 255; `(24, 26, 33)` is nearly black.
- **`pygame.display.flip()`** shows the frame. Drawing only changes `screen`'s memory; nothing appears in the window until `flip` copies the finished picture to it all at once. That's why you never see a half-drawn frame: the window only ever receives complete pictures.
- **`if __name__ == "__main__":`** Python sets `__name__` to `"__main__"` only in the file you ran. When a test does `from window import run`, `__name__` is `"window"`, so the game doesn't start by itself during an import. The test calls `run` itself, with `max_frames`.
- **`return frames`** is what the test checks: asked for 3 frames, the loop must run exactly 3.

```check
run ".venv/Scripts/python -m pytest -q tests/test_window.py -k frames" label="run(max_frames=3) runs exactly 3 frames" -- Count each time round the loop (frames += 1), stop when frames reaches max_frames, and return frames after pygame.quit().
```

## Sixty frames a second

Right now the loop runs as fast as the computer can go. With a hidden window, this machine managed about 85,000 frames a second. A game whose speed depends on the computer is unplayable, so the loop must wait. Add a **clock**:

```python file=window.py
import pygame

WIDTH, HEIGHT = 640, 240
BACKGROUND = (24, 26, 33)


def run(max_frames=None):
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Q-Arcade")
    clock = pygame.time.Clock()
    frames = 0
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
        screen.fill(BACKGROUND)
        pygame.display.flip()
        clock.tick(60)
        frames += 1
        if max_frames is not None and frames >= max_frames:
            running = False
    pygame.quit()
    return frames


if __name__ == "__main__":
    run()
```

**How `clock.tick(60)` decides how long to wait.** The clock remembers the moment it was last ticked. 60 frames a second means one frame every 1000 / 60 ≈ 16.7 milliseconds. Each call measures how long it has been since the previous call, and sleeps for whatever is left of the 16.7 ms. If this frame's work took 3 ms, it sleeps about 13.7 ms; if the work took 20 ms, it doesn't sleep at all, and the game runs slower than 60. So the loop runs at **at most** 60 frames a second, whatever the computer.

```predict
question: The second test runs 30 frames with tick(60). About how long will that take?
choice: About 0.03 seconds
choice: About half a second
choice: About 30 seconds
answer: About half a second
explain: 30 frames at 60 a second is 30 / 60 = 0.5 seconds. Measured on the machine this series was written on: 0.57 seconds. The first `tick` returns at once, because there's no previous tick to measure from, so it's really 29 waits of 16.7 ms (0.48 s), plus starting and stopping pygame. The test only demands at least 0.4, so a busy computer still passes.
verify: script frames_time.py
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_window.py -k tick" label="the loop runs at most 60 frames a second" -- Make a pygame.time.Clock() before the loop and call clock.tick(60) once per frame.
```

## A dot that moves

Now draw something and move it with the arrow keys:

```python file=window.py
import pygame

WIDTH, HEIGHT = 640, 240
STEP = 40
BACKGROUND = (24, 26, 33)
PLAYER = (250, 204, 21)


def move(x, key):
    if key == pygame.K_LEFT:
        x -= STEP
    elif key == pygame.K_RIGHT:
        x += STEP
    return x


def run(max_frames=None):
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Q-Arcade")
    clock = pygame.time.Clock()
    x = WIDTH // 2
    frames = 0
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                x = move(x, event.key)
        screen.fill(BACKGROUND)
        pygame.draw.circle(screen, PLAYER, (x, HEIGHT // 2), STEP // 2)
        pygame.display.flip()
        clock.tick(60)
        frames += 1
        if max_frames is not None and frames >= max_frames:
            running = False
    pygame.quit()
    return frames


if __name__ == "__main__":
    run()
```

Run it and press the arrow keys.

- **Screen coordinates.** `(0, 0)` is the **top-left** corner of the window. `x` grows to the right and `y` grows **downwards**, the opposite of a maths graph. That's because a screen is drawn row by row from the top, and pixel memory is laid out the same way. So `(x, HEIGHT // 2)` is `x` pixels from the left, halfway down. `//` divides and drops the remainder: `240 // 2` is `120`.
- **`pygame.KEYDOWN`** is the event the queue receives once when a key goes down. `event.key` says which key: `pygame.K_LEFT` and `pygame.K_RIGHT` are just numbers that name the arrow keys. Holding a key down doesn't send more `KEYDOWN` events, so each press moves the dot one step.
- **`move` is separate from the loop on purpose.** It takes a position and a key and returns the new position. It doesn't touch the window, so a test can call it directly with any key it likes, which is exactly what `test_keys_step_left_and_right` does.
- **`pygame.draw.circle(screen, colour, centre, radius)`** sets the pixels of a filled circle in `screen`'s memory. It appears at the next `flip`.

Notice the order in each frame: **input** (the events), **update** (`x` changes), **draw**, **wait**. Every game in this series keeps that order. In Chapter 1 it becomes: the agent **observes** where it is, **chooses** an action, and the world **responds**.

```check
run ".venv/Scripts/python -m pytest -q tests/test_window.py -k keys" label="move steps left and right, and ignores other keys" -- move(x, key): subtract STEP for K_LEFT, add STEP for K_RIGHT, and return x unchanged for anything else.
```

## Your turn: stop at the edges

**Build, on your own:** keep the dot inside the window.

Press the left arrow ten times: the dot leaves the window and keeps going, because nothing stops `x` from becoming negative. Change `move` so the dot's centre never goes further left than `STEP // 2` (so the whole dot, with its radius of `STEP // 2`, stays visible) and never further right than `WIDTH - STEP // 2`. `test_edges_stop_the_dot` describes exactly what's expected.

Only `move` changes. The loop doesn't need to know about edges at all, which is the point of keeping the rule in its own function.

```hints
nudge: After moving, what should happen to an x that has gone past an edge?
concept: Limiting a number to a range is called clamping: `max(low, value)` can't go below `low`, and `min(high, value)` can't go above `high`. Combined, `max(low, min(high, value))` stays between the two.
shape: Keep the two `if` branches as they are, and change only the `return` line so it returns the clamped `x`.
answer: The last line of `move` becomes:
~~~python
    return max(STEP // 2, min(WIDTH - STEP // 2, x))
~~~
With `x = -20`: `min(620, -20)` is `-20`, and `max(20, -20)` is `20`, the left edge. With `x = 660`: `min(620, 660)` is `620`, and `max(20, 620)` is `620`.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_window.py -k edges" label="the dot stops at both edges" -- Clamp before returning: max(STEP // 2, min(WIDTH - STEP // 2, x)).
run ".venv/Scripts/python -m pytest -q tests/test_window.py" label="all lesson 0.2 tests pass"
```

### What you have

A window, a loop at 60 frames a second, input from the event queue, and a rule (`move`) that's tested without a window. Chapter 1 builds the first world an agent can learn in, and lets you play it first.
