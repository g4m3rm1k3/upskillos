---
title: 1.1 — A Window and a Loop
track: Forge — A Game in One File
trackOrder: 31
runtime: python
run: breakout.py
---

This chapter builds **Breakout**: a paddle at the bottom of the screen, a ball, and a wall of bricks to break. It's built the way most programs start: as **one file**, top to bottom, with every variable at the top level and no tests. That's on purpose. It's quick to write and it works, and by the end of the chapter you'll be able to say exactly what's wrong with it, with evidence. Chapter 2 starts fixing it, and each fix will teach an engineering idea you'll have felt the need for.

Breakout needs pygame-ce, which lesson 0.2 installed into `.venv`. The **Run** button uses that environment's Python, so the game runs with the right packages. In the terminal, run it with `.venv\Scripts\python breakout.py`.

## A window that stays open

**Build:** a window that stays on screen until you close it.

Create `breakout.py`:

```python file=breakout.py
import pygame

WIDTH, HEIGHT = 640, 480

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Breakout")

running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
    pygame.display.flip()

pygame.quit()
```

Press **Run breakout.py**. A black window titled *Breakout* opens, and its close button closes it. The output pane shows one line, which pygame prints whenever it's imported: `pygame-ce 2.5.8 (SDL 2.32.10, Python 3.14.3)`.

**Understand, line by line.**

`WIDTH, HEIGHT = 640, 480` assigns two variables at once: the right side makes a tuple `(640, 480)`, and Python **unpacks** it into the two names on the left, in order. Names written in capitals are a convention meaning "a **constant**: set once, never changed". Python doesn't enforce it; it's a promise to the reader.

`pygame.init()` starts each of pygame's parts: display, keyboard, timers, sound. pygame is built on a C library called **SDL** (Simple DirectMedia Layer), which talks to the operating system for it, and each part asks SDL to set up its side.

`pygame.display.set_mode((640, 480))` asks the operating system for a window 640 pixels wide and 480 high, and returns its **surface**.

> **Surface**: a picture held in memory, as a block of numbers: a few bytes for each pixel (red, green and blue brightness, and sometimes opacity), row after row from the top-left. 640 × 480 is 307,200 pixels. Drawing on a surface means writing numbers into that block.

Nothing has been drawn yet, so every pixel is 0, which is black.

`set_caption` sets the text in the window's title bar.

**The game loop.** Everything from `while running:` down runs over and over until `running` becomes `False`. Every game is built around a loop like this, because a screen can't show motion: it shows still pictures, called **frames**, one after another, and a game's job is to make the next picture, again and again.

**The event queue.** Your program never asks "is a key down right now?" at the moment someone presses it, because at that moment it's busy doing something else. Instead, the operating system notices the key press, or the mouse click, or the close button, and puts a **message** in a queue belonging to the window. Messages wait there until the program collects them. `pygame.event.get()`:

1. asks SDL to collect every message the operating system has queued for this window since the last call;
2. turns each into a pygame **event**: an object with a `type` (`pygame.QUIT`, `pygame.KEYDOWN`, `pygame.MOUSEMOTION`, …) and details such as which key;
3. returns them as a list, oldest first, and empties the queue.

So the `for` loop handles everything that happened since the last frame.

Windows uses the same queue to decide whether a program is still alive. A window that doesn't collect its messages for about five seconds is greyed out and labelled **Not Responding**. That's why a game calls `event.get()` every frame, even if it only cares about one kind of event.

**`pygame.QUIT`** is the event for the close button. Clicking it doesn't close anything by itself: it only puts a message in the queue. The loop sees it and sets `running = False`, the `while` ends after this pass, and `pygame.quit()` hands the window back to the operating system.

**`pygame.display.flip()`** shows the surface in the window. A frame is drawn in many steps (background, then bricks, then ball). If the window showed the surface *while* it was being drawn, you'd sometimes see half a frame, which looks like flickering. So everything is drawn into the surface, which nobody sees, and `flip` copies the finished picture to the screen in one go. Drawing off screen and then showing the result all at once is called **double buffering**.

While the window is open, open Task Manager (Ctrl+Shift+Esc) and find Python on the **Processes** tab.

```predict
question: How busy will the processor be, for a program that draws nothing but black?
choice: Almost idle: there's nothing to draw
choice: One processor core kept fully busy
choice: Every core fully busy
answer: One processor core kept fully busy
explain: Nothing in the loop ever waits. As soon as one pass ends, the next begins, many thousands of times a second, each copying a black picture to the screen. A processor core runs whatever it's given as fast as it can, so the one running this loop stays fully busy doing work nobody can see. A Python program like this one does one thing at a time, so it keeps only one core busy, and Task Manager shows its share of the whole processor: on an 8-core machine, about 12%. Close the window and watch the number drop.
```

> **Engineer:** a game is an **event-driven** program: it doesn't run from top to bottom and stop, it waits for things to happen and reacts. Desktop apps, web servers and phone apps all have a loop like this at their centre, usually hidden inside a framework. In Chapter 18 you'll meet Qt's version, and it will look familiar.

```check
file breakout.py -- Create breakout.py in the forge folder.
contains breakout.py "pygame.event.get()" -- The loop must collect events every pass, or Windows marks the window Not Responding.
contains breakout.py "pygame.display.flip()"
```

## Sixty frames a second

**Build:** slow the loop down to the speed of the screen, and quit with Escape.

```python file=breakout.py
import pygame

WIDTH, HEIGHT = 640, 480

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Breakout")
clock = pygame.time.Clock()

running = True
while running:
    clock.tick(60)

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
            running = False

    pygame.display.flip()

pygame.quit()
```

**Understand: how `clock.tick(60)` works.** Most screens show about 60 pictures a second, so drawing more than 60 is wasted work.

1. 60 frames a second means one frame every 1000 / 60 ≈ 16.7 milliseconds (ms). That's the **frame budget**.
2. A `Clock` remembers when `tick` was last called. Each call measures how long has passed since then: the time the last pass spent handling events and drawing.
3. If that's less than 16.7 ms, it **sleeps** for the difference. If the work took 3 ms, it sleeps about 13.7 ms.
4. It returns the milliseconds since the previous call. That's the **frame time**, and lesson 1.3 uses it to move things at a steady speed.

**Sleeping** means the program tells the operating system "don't run me for 13 ms". The operating system takes it off the processor until then and runs other programs, or nothing. Run the game and look at Task Manager again: the number has dropped close to zero, because the loop now spends most of each frame not running at all.

If a frame's work takes **longer** than 16.7 ms, `tick` doesn't sleep, and the game runs slower than 60 frames a second. Nothing makes up the lost time.

**`KEYDOWN` and `K_ESCAPE`.** Pressing a key puts a `KEYDOWN` event in the queue, and `event.key` holds a number identifying which key: `pygame.K_ESCAPE` is the Escape key's number. `elif` checks the second condition only when the first was false. In `event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE`, Python evaluates the left side of `and` first, and if it's false, doesn't look at the right side at all, which matters here: a `QUIT` or mouse event has no `key`, so asking for it would raise an `AttributeError` (lesson 0.3).

> **Engineer:** don't do work nobody will see. A game that keeps one core fully busy drains a laptop's battery and heats the machine for nothing. The same idea, *do only the work that has an effect*, comes back when the game has hundreds of objects (Chapter 14) and when training an agent wants the opposite: no sleeping at all, as fast as possible (Chapter 31).

```check
contains breakout.py "clock.tick(60)" -- Make a pygame.time.Clock() before the loop, and call clock.tick(60) once per pass.
contains breakout.py "pygame.K_ESCAPE"
```

## Let a program run the game

**Build:** a way to run the game without a window or a person, so that **Check my work** can run it.

So far, only a person can check this program: run it, look, close it. A checking program can't click a close button or watch a window. Lesson 0.1 gave the answer: a command-line program takes **arguments**, prints **output** and returns an **exit code**. So give the game a mode where a program can run it:

```powershell
.venv\Scripts\python breakout.py --test-run 600
```

That runs exactly 600 frames, with no window and no waiting between frames, and then prints what happened:

```python file=breakout.py
import os
import sys

import pygame

# A test run lets another program play the game, with no window:
#   python breakout.py --test-run FRAMES
args = sys.argv[1:]
test_frames = None
if "--test-run" in args:
    test_frames = int(args[args.index("--test-run") + 1])
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

**Understand, piece by piece.**

`args = sys.argv[1:]` is every argument after the script's name. `[1:]` is a **slice**: a new list with the items from index 1 to the end, so it leaves out `sys.argv[0]`, the script itself.

`"--test-run" in args` is `True` if any item in the list equals `"--test-run"`. `args.index("--test-run")` returns the position of the first item equal to it, so `+ 1` is the position of the word after it, the number of frames. `int(...)` turns that text, `"600"`, into the number `600`. Traced for `breakout.py --test-run 600`:

```text
sys.argv                         ['breakout.py', '--test-run', '600']
args = sys.argv[1:]              ['--test-run', '600']
"--test-run" in args             True
args.index("--test-run")         0
args[0 + 1]                      '600'
int('600')                       600   → test_frames
```

`test_frames = None` before the `if` means "not a test run" unless the `if` replaces it. `None` (lesson 0.3) is the natural value for "there isn't one".

`os.environ["SDL_VIDEODRIVER"] = "dummy"` sets an **environment variable** (lesson 0.1) inside this process. SDL reads it when the display starts, in `set_mode`, and the `dummy` driver gives it a window that exists only in memory: the program draws into a surface, as always, but nothing appears on screen. That's why it must be set before `set_mode` is called.

**No waiting.** In a test run, `clock.tick(60)` isn't called, so the frames run as fast as the computer allows: 600 frames take a fraction of a second instead of 10 seconds.

**Counting frames.** `frames += 1` adds one per pass. After each pass, a test run checks whether it has done enough frames, and if so, ends the loop exactly the way the close button does: `running = False`. At the end, it prints a summary. In Python, `is not None` is the way to test that a variable holds something other than `None`.

Run it in the terminal:

```powershell
.venv\Scripts\python breakout.py --test-run 600
```

```text
pygame-ce 2.5.8 (SDL 2.32.10, Python 3.14.3)
frames=600
```

The **Run** button still runs it normally, with a window: no arguments means no test run.

> **Engineer:** a program that only a person can operate can only be checked by a person, slowly and inconsistently. Designing a program so that other programs can drive it is called designing for **testability**, and it's one of the most important habits in this series. This test-run mode is a first, clumsy version: it can only run the *whole* game and look at the end. In Chapter 2 you'll test individual pieces directly, which is far more precise, and this mode will become unnecessary.

```check
run ".venv/Scripts/python breakout.py --test-run 30" stdout="frames=30" label="a test run of 30 frames prints frames=30" -- Count frames with frames += 1, stop the loop when frames reaches test_frames, and print f"frames={frames}" after pygame.quit().
run ".venv/Scripts/python breakout.py --test-run 600" stdout="frames=600" timeout=8 label="a test run doesn't wait between frames" -- In a test run, skip clock.tick(60): 600 frames at 60 a second would take 10 seconds.
```

## Your turn: a usage message

**Build, on your own:** make the game refuse a broken `--test-run`, the way `greet.py` did in lesson 0.1.

Right now, `breakout.py --test-run` with no number crashes with an `IndexError`, and `breakout.py --test-run ten` crashes with a `ValueError`. Try both and read the tracebacks. A program used wrongly should say how to use it instead:

| Command | Prints | Exit code |
|---|---|---|
| `.venv\Scripts\python breakout.py --test-run 5` | `frames=5` | 0 |
| `.venv\Scripts\python breakout.py --test-run` | `usage: python breakout.py [--test-run FRAMES]` | 2 |
| `.venv\Scripts\python breakout.py --test-run ten` | `usage: python breakout.py [--test-run FRAMES]` | 2 |

In a usage message, square brackets are a convention meaning "optional": the game also runs with no arguments at all.

You'll need one thing this lesson hasn't shown: a string's `.isdigit()` method returns `True` when every character in it is a digit, so `"600".isdigit()` is `True` and `"ten".isdigit()` is `False`. Try it in the terminal with `python -c "print('600'.isdigit(), 'ten'.isdigit())"`.

Try it for about 10 minutes before taking a hint.

```hints
nudge: There are two ways it can go wrong: there's no word after `--test-run` at all, or there is one but it isn't a number. Which one is the `IndexError`, and which is the `ValueError`? Each needs its own condition.
concept: If `--test-run` is at position `i`, the number should be at `i + 1`, and that position exists only when `i + 1 < len(args)`. Check that first: if it doesn't exist, `args[i + 1]` would raise `IndexError`, so the second condition must not even be evaluated. `or` evaluates left to right and stops at the first true side, which is exactly what's needed here.
shape: Inside `if "--test-run" in args:`, store the position in a variable `i`. Then one guard clause: if there's no word at `i + 1` *or* that word isn't all digits, print the usage line and `sys.exit(2)`. After the guard, the existing `int(...)` line can't fail.
answer: ~~~python
if "--test-run" in args:
    i = args.index("--test-run")
    if i + 1 >= len(args) or not args[i + 1].isdigit():
        print("usage: python breakout.py [--test-run FRAMES]")
        sys.exit(2)
    test_frames = int(args[i + 1])
    os.environ["SDL_VIDEODRIVER"] = "dummy"
~~~

The order of the two conditions matters. For `breakout.py --test-run`, `i` is 0 and `len(args)` is 1, so `i + 1 >= len(args)` is `True` and `or` stops there: `args[1]` is never looked at, so there's no `IndexError`. Swap them and the crash comes back. `not` turns `True` into `False` and back, so `not "ten".isdigit()` is `True`. (`isdigit` also rejects `-5` and `2.5`, which is right: neither is a number of frames.)
```

```check
run ".venv/Scripts/python breakout.py --test-run 5" stdout="frames=5" label="--test-run 5 still runs 5 frames"
run ".venv/Scripts/python breakout.py --test-run" exit=2 stdout="usage: python breakout.py [--test-run FRAMES]" label="--test-run with no number prints the usage line and exits with 2" -- Check that there is a word after --test-run before reading it.
run ".venv/Scripts/python breakout.py --test-run ten" exit=2 stdout="usage: python breakout.py [--test-run FRAMES]" label="--test-run ten prints the usage line and exits with 2" -- .isdigit() is False for "ten".
```

## What did we actually learn?

- **A game is a loop** that runs once per frame: collect events, change things, draw, show. Every interactive program has a loop like this somewhere.
- **Input arrives as a queue of events**, collected each frame. A program that stops collecting them looks frozen to the operating system.
- **Double buffering**: draw where nobody can see, then show the finished picture all at once.
- **Frame budget and sleeping**: 60 frames a second is 16.7 ms each; finishing early means sleeping, so the processor rests.
- **Testability is designed in.** A program other programs can run, through arguments, output and exit codes, can be checked automatically. This game's test-run mode is a first version of that idea, and its clumsiness is part of what Chapter 2 fixes.

In C# or Java, a game framework (MonoGame, libGDX) hides this loop and calls your `Update` and `Draw` methods from inside it, once per frame. Chapter 10 builds the same arrangement for Forge.
