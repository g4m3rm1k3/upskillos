---
title: 1.1 — A Window and a Loop
track: Forge — A Game in One File
trackOrder: 31
runtime: python
run: breakout.py
---

This chapter builds **Breakout**: a paddle at the bottom of the screen, a ball, and a wall of bricks to break. It's built the way most programs start: as **one file**, top to bottom, with every variable at the top level and no tests. That's on purpose. It's quick to write and it works, and by the end of the chapter you'll be able to say exactly what's wrong with it, with evidence. Chapter 2 starts fixing it, and each fix will teach an engineering idea you'll have felt the need for.

Breakout needs pygame-ce, which lesson 0.2 installed into `.venv`. The **Run** button uses that environment's Python, so the game runs with the right packages. In the terminal, run it with `.venv\Scripts\python breakout.py`.

This lesson builds the file a few lines at a time. Each step says what the next lines are for, shows them (new lines are green; the rest of the file is folded away), explains them, and then you run them.

## Start pygame

**Build:** the two lines every pygame program begins with.

A Python file can use code from a **package** that's been installed, here pygame-ce, by **importing** it. Then pygame has to be started before any of it is used. Create `breakout.py`:

```python file=breakout.py
import pygame

pygame.init()
```

Press **Run breakout.py**. The output pane shows one line, and the program ends:

```text
pygame-ce 2.5.8 (SDL 2.32.10, Python 3.14.3)
```

**Understand.** `import pygame` runs pygame's own code once and gives you the name `pygame` to reach everything in it: `pygame.init`, `pygame.display`, and so on. That line of output is pygame announcing itself as it's imported: its version, and the versions of what it's built on.

`pygame.init()` starts each of pygame's parts: display, keyboard, timers, sound. pygame is built on a C library called **SDL** (Simple DirectMedia Layer), which talks to the operating system for it, and each part asks SDL to set up its side. Then the file ends, so the program ends.

```check
file breakout.py -- Create breakout.py in the forge folder.
run ".venv/Scripts/python breakout.py" stdout="pygame-ce 2.5.8" label="breakout.py imports and starts pygame"
```

## Ask for a window

**Build:** a window 640 pixels wide and 480 high, with a title.

The game needs somewhere to draw. Add the size as two named values, then ask for the window after `pygame.init()`:

```python file=breakout.py
import pygame

WIDTH, HEIGHT = 640, 480

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Breakout")
```

**Understand.**

`WIDTH, HEIGHT = 640, 480` assigns two variables at once: the right side makes a tuple `(640, 480)`, and Python **unpacks** it into the two names on the left, in order. Names written in capitals are a convention meaning "a **constant**: set once, never changed". Python doesn't enforce it; it's a promise to the reader.

`pygame.display.set_mode((WIDTH, HEIGHT))` asks the operating system for a window that size. The double brackets aren't a typo: `set_mode` takes **one** argument, the size, given as a tuple, so the inner brackets build the tuple `(640, 480)` and the outer ones are the call. It returns the window's **surface**, which is kept in `screen`.

> **Surface**: a picture held in memory, as a block of numbers: a few bytes for each pixel (red, green and blue brightness, and sometimes opacity), row after row from the top-left. 640 × 480 is 307,200 pixels. Drawing on a surface means writing numbers into that block.

Nothing has been drawn yet, so every pixel is 0, which is black. `set_caption` sets the text in the window's title bar.

Look at a pixel yourself, in the REPL (lesson 0.1). Start it with the environment's Python, `.venv\Scripts\python`, so pygame is there:

```text
>>> import pygame
>>> pygame.init()
>>> screen = pygame.display.set_mode((640, 480))
>>> screen.get_at((0, 0))
Color(0, 0, 0, 255)
>>> screen.get_size()
(640, 480)
>>> pygame.quit()
```

A window opens while you do it. `get_at((0, 0))` reads the top-left pixel: red 0, green 0, blue 0, which is black, and a fourth number, 255, its **opacity** (how solid it is, from 0, invisible, to 255, fully solid). `pygame.quit()` closes the window again.

```predict
question: What will you see when you run it?
choice: A black window titled Breakout, until you close it
choice: A window that appears and vanishes at once
choice: Nothing: a window needs drawing before it appears
answer: A window that appears and vanishes at once
explain: The program does exactly what it says: start pygame, make a window, set its title, and then there are no more lines, so the program ends, and the operating system closes its window. Keeping a window on screen means the program must keep running. That's the next step.
```

Run it and watch closely.

```check
contains breakout.py "pygame.display.set_mode((WIDTH, HEIGHT))"
run ".venv/Scripts/python breakout.py" label="breakout.py opens its window and ends without an error"
```

## A loop that keeps it open

**Build:** keep the program running, so the window stays.

A screen can't show motion: it shows still pictures, called **frames**, one after another, and a game's job is to make the next picture, again and again. So every game is built around a loop. Add one at the end:

```python file=breakout.py
import pygame

WIDTH, HEIGHT = 640, 480

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Breakout")

running = True
while running:
    pygame.display.flip()
```

**Understand.** `while running:` repeats the indented line for as long as `running` is `True`, and nothing changes it yet, so it repeats forever. This is the **game loop**.

**`pygame.display.flip()`** shows the surface in the window. A frame is drawn in many steps (background, then bricks, then ball). If the window showed the surface *while* it was being drawn, you'd sometimes see half a frame, which looks like flickering. So everything is drawn into the surface, which nobody sees, and `flip` copies the finished picture to the screen in one go. Drawing off screen and then showing the result all at once is called **double buffering**.

Run it. The black window stays. Now click its close button. Nothing happens. Wait a few seconds and Windows greys the window out and labels it **Not Responding**. Stop it with **■ Stop** (or Ctrl+C in the terminal). If Windows offers to close the program for you, or to wait for it, closing it is fine too. Why that happens is the next step.

```check
contains breakout.py "while running:"
contains breakout.py "pygame.display.flip()"
```

## Listen to the close button

**Build:** collect what the operating system sends the window, and stop when the close button is clicked.

**The event queue.** Your program can't be interrupted at the moment someone presses a key, because at that moment it's busy doing something else. Instead, the operating system notices the key press, or the mouse click, or the close button, and puts a **message** in a queue belonging to the window. Messages wait there until the program collects them, and the last version never collected any. Windows uses that queue to decide whether a program is still alive: a window that doesn't collect its messages for about five seconds is marked **Not Responding**. So the loop must collect them on every pass:

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

**Understand.** `pygame.event.get()`:

1. asks SDL to collect every message the operating system has queued for this window since the last call;
2. turns each into a pygame **event**: an object with a `type` (`pygame.QUIT`, `pygame.KEYDOWN`, `pygame.MOUSEMOTION`, …) and details such as which key;
3. returns them as a list, oldest first, and empties the queue.

So the `for` loop handles everything that happened since the last frame. **`pygame.QUIT`** is the event for the close button: like every event type, it's a number, kept in a named constant so the code says `pygame.QUIT` rather than a meaningless `256`. Clicking it doesn't close anything by itself: it only puts a message in the queue. The loop sees it and sets `running = False`, the `while` ends after this pass, and `pygame.quit()`, after the loop, hands the window back to the operating system.

Run it: the window stays, and now its close button closes it. While it's open, open Task Manager (Ctrl+Shift+Esc) and find Python on the **Processes** tab.

```predict
question: How busy will the processor be, for a program that draws nothing but black?
choice: Almost idle: there's nothing to draw
choice: One processor core kept fully busy
choice: Every core fully busy
answer: One processor core kept fully busy
explain: Nothing in the loop ever waits. As soon as one pass ends, the next begins, many thousands of times a second, each copying a black picture to the screen. A processor core runs whatever it's given as fast as it can, so the one running this loop stays fully busy doing work nobody can see. A Python program like this one does one thing at a time, so it keeps only one core busy, and Task Manager shows its share of the whole processor: on an 8-core machine, about 12%. Close the window and watch the number drop.
```

> **Engineer:** a game is an **event-driven** program: it doesn't run from top to bottom and stop, it waits for things to happen and reacts. Desktop apps, web servers and phone apps all have a loop like this at their centre, usually hidden inside a framework. In Chapter 21 you'll meet Qt's version, and it will look familiar.

```check
contains breakout.py "pygame.event.get()" -- The loop must collect events every pass, or Windows marks the window Not Responding.
contains breakout.py "pygame.QUIT"
contains breakout.py "pygame.quit()"
```

## See the queue for yourself

**Build:** a scratch program that prints every message the window is sent.

A **scratch file** (lesson 0.1's scratch example, when a few lines are too many for the REPL) lives in its own folder, so it never mixes with the project's real files. Make a folder named `scratch`, and in it `events.py`:

```python file=scratch/events.py
import pygame

pygame.init()
pygame.display.set_mode((300, 200))
running = True
while running:
    for event in pygame.event.get():
        print(event)
        if event.type == pygame.QUIT:
            running = False
pygame.quit()
```

```powershell
.venv\Scripts\python scratch\events.py
```

Move the mouse over the little window, press a few keys, then close it. The terminal fills with lines like these:

```text
<Event(1024-MouseMotion {'pos': (152, 87), 'rel': (3, -1), 'buttons': (0, 0, 0), 'touch': False, 'window': None})>
<Event(768-KeyDown {'unicode': 'a', 'key': 97, 'mod': 4096, 'scancode': 4, 'window': None})>
<Event(769-KeyUp {'unicode': 'a', 'key': 97, 'mod': 4096, 'scancode': 4, 'window': None})>
<Event(256-Quit {})>
```

**Understand.** Each message is an **event object**: a **type**, a number with a name (`1024-MouseMotion`, `768-KeyDown`), and details that depend on the type, like where the mouse is, or which key. They arrive in the order things happened, and a key press is two events, down and up. Closing the window is just one more event, `256-Quit`, which is the number `pygame.QUIT` stands for. Nothing happens to the window unless the program reads that event and decides to stop. (This loop never rests between passes, so it keeps one core busy while it runs: the next step is about exactly that.)

## Sixty frames a second

**Build:** slow the loop down to the speed of the screen.

Most screens show about 60 pictures a second, their **refresh rate**, 60 Hz (**hertz**: times per second), so drawing more than 60 is wasted work, and that wasted work is what keeps a core busy. pygame's `Clock` can hold the loop to 60 passes a second. Make one before the loop, and call its `tick` once at the start of each pass:

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
    pygame.display.flip()

pygame.quit()
```

**Understand: how `clock.tick(60)` works.**

1. 60 frames a second means one frame every 1000 / 60 ≈ 16.7 milliseconds (ms). That's the **frame budget**.
2. A `Clock` remembers when `tick` was last called. Each call measures how long has passed since then: the time the last pass spent handling events and drawing.
3. If that's less than 16.7 ms, it **sleeps** for the difference. If the work took 3 ms, it sleeps about 13.7 ms.
4. It returns the milliseconds since the previous call. That's the **frame time**, and lesson 1.3 uses it to move things at a steady speed.

**Sleeping** means the program tells the operating system "don't run me for 13 ms". The operating system takes it off the processor until then and runs other programs, or nothing. Run the game and look at Task Manager again: the number has dropped close to zero, because the loop now spends most of each frame not running at all.

If a frame's work takes **longer** than 16.7 ms, `tick` doesn't sleep, and the game runs slower than 60 frames a second. Nothing makes up the lost time.

> **Engineer:** don't do work nobody will see. A game that keeps one core fully busy drains a laptop's battery and heats the machine for nothing. The same idea, *do only the work that has an effect*, comes back when the game has hundreds of objects (Chapter 14) and when training an agent wants the opposite: no sleeping at all, as fast as possible (Chapter 44).

```check
contains breakout.py "clock.tick(60)" -- Make a pygame.time.Clock() before the loop, and call clock.tick(60) once per pass.
```

## See what tick measures

**Build:** a scratch program that prints what `tick` returns, with and without work to do.

```python file=scratch/tick.py
import pygame

pygame.init()
clock = pygame.time.Clock()
for frame in range(5):
    print(clock.tick(60))
print("now each frame does 30 ms of work:")
for frame in range(5):
    pygame.time.wait(30)
    print(clock.tick(60))
pygame.quit()
```

```powershell
.venv\Scripts\python scratch\tick.py
```

```text
17
17
17
17
17
now each frame does 30 ms of work:
30
30
31
31
31
```

**Understand.** With nothing to do, each `tick(60)` returns about 17: it slept until 16.7 ms had passed since the last call, and rounded to whole milliseconds. `pygame.time.wait(30)` stands in for a frame whose work takes 30 ms: now `tick` has nothing to sleep, and returns about 30, the real frame time. Step 4 above, measured. The game runs at about 33 frames a second instead of 60, and nothing makes the lost time up.

```check
run ".venv/Scripts/python scratch/tick.py" stdout="now each frame does 30 ms of work" label="scratch/tick.py runs"
```

## Escape to quit

**Build:** close the game with the Escape key too.

Pressing a key also puts an event in the queue, so quitting on Escape is one more case in the same `for` loop:

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

**Understand.** Pressing a key puts a `KEYDOWN` event in the queue, and `event.key` holds a number identifying which key: `pygame.K_ESCAPE` is the Escape key's number. `elif` checks its condition only when the `if` before it was false.

In `event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE`, Python evaluates the left side of `and` first, and if it's false, doesn't look at the right side at all. That matters here: a `QUIT` or mouse event has no `key`, so asking for it would raise an `AttributeError` (lesson 0.3). Run the game and press Escape.

```check
contains breakout.py "pygame.K_ESCAPE"
```

## Read a number from the command line

**Build:** the first part of a way to run the game without a window or a person, so that **Check my work** can run it.

So far, only a person can check this program: run it, look, close it. A checking program can't click a close button or watch a window. Lesson 0.1 gave the answer: a command-line program takes **arguments**, prints **output** and returns an **exit code**. The goal is a **test run**:

```powershell
.venv\Scripts\python breakout.py --test-run 600
```

which runs exactly 600 frames, with no window and no waiting, then prints what happened. It takes three steps. First, read the number. Add `import sys` at the top, and the reading code before `WIDTH, HEIGHT`. (The blank line between `import sys` and `import pygame` is a convention from Python's style guide, **PEP 8**: modules that come with Python first, then installed packages, so a reader sees at a glance what the program needs installed.)

```python file=breakout.py
import sys

import pygame

# A test run lets another program play the game, with no window:
#   python breakout.py --test-run FRAMES
args = sys.argv[1:]
test_frames = None
if "--test-run" in args:
    test_frames = int(args[args.index("--test-run") + 1])

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

**Understand.** `sys.argv` (lesson 0.1) is the list of the command line's words. `args = sys.argv[1:]` is every argument after the script's name: `[1:]` is a **slice**, a new list with the items from index 1 to the end, so it leaves out `sys.argv[0]`, the script itself.

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

Nothing uses `test_frames` yet, so `--test-run 600` still opens a normal window that runs until you close it. Reading an input and acting on it are separate steps; the next one acts.

```check
contains breakout.py "test_frames = int(args[args.index(\"--test-run\") + 1])"
```

## Stop after that many frames

**Build:** count the frames, end the loop after `test_frames` of them, and say how many ran.

Add a counter before the loop, count each pass at the end of the loop, and print the count after `pygame.quit()`:

```python file=breakout.py
import sys

import pygame

# A test run lets another program play the game, with no window:
#   python breakout.py --test-run FRAMES
args = sys.argv[1:]
test_frames = None
if "--test-run" in args:
    test_frames = int(args[args.index("--test-run") + 1])

WIDTH, HEIGHT = 640, 480

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Breakout")
clock = pygame.time.Clock()

frames = 0
running = True
while running:
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

**Understand.** `frames += 1` adds one per pass. After each pass, a test run checks whether it has done enough frames, and if so, ends the loop exactly the way the close button does: `running = False`. In Python, `is not None` is the way to test that a variable holds something other than `None` (lesson 0.3).

Why does the condition need both halves? In an ordinary game `test_frames` is `None`, and `frames >= None` isn't allowed: Python raises a `TypeError`, because it can't say whether a number is bigger than nothing. `and` checks its left side first and stops if it's false (the same short-circuit as the Escape check), so in an ordinary game `frames >= test_frames` is never even evaluated. And `>=` rather than `==` is a habit worth having: if a frame were ever counted twice, `==` could step past the target and never stop, while `>=` still would.

At the end, a test run prints a summary; an ordinary game prints nothing.

```powershell
.venv\Scripts\python breakout.py --test-run 120
```

The window opens, stays for two seconds (120 frames at 60 a second), closes by itself, and the program prints `frames=120`. Two problems are left for the last step: a window still appears, and 600 frames would take 10 seconds.

```check
run ".venv/Scripts/python breakout.py --test-run 30" stdout="frames=30" label="a test run of 30 frames prints frames=30" -- Count frames with frames += 1, stop the loop when frames reaches test_frames, and print f"frames={frames}" after pygame.quit().
```

## No window, no waiting

**Build:** in a test run, draw into memory instead of a window, and don't sleep between frames.

Three changes: import `os`; tell SDL, before the window is made, to use a display that exists only in memory; and call `clock.tick(60)` only when it isn't a test run:

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

**Understand.** **`os`** is the standard library's module for talking to the operating system. **`os.environ`** behaves like a dictionary of this process's environment variables (lesson 0.1): reading a key gives its value, and assigning to one sets it for this process and for any program it starts, never for the shell that started it. So `os.environ["SDL_VIDEODRIVER"] = "dummy"` sets an **environment variable** inside this process. SDL reads it once, when pygame starts its display in `pygame.init()`, and the `dummy` driver gives it a window that exists only in memory: the program draws into a surface, as always, but nothing appears on screen. That's why it must be set before `pygame.init()` runs (set it afterwards and a real window opens anyway), and why it's inside the `if` that reads `--test-run`, near the top of the file.

**No waiting.** In a test run, `clock.tick(60)` isn't called, so the frames run as fast as the computer allows: 600 frames take a fraction of a second instead of 10 seconds.

```powershell
.venv\Scripts\python breakout.py --test-run 600
```

```text
pygame-ce 2.5.8 (SDL 2.32.10, Python 3.14.3)
frames=600
```

The **Run** button still runs it normally, with a window: no arguments means no test run.

> **Engineer:** a program that only a person can operate can only be checked by a person, slowly and inconsistently. Designing a program so that other programs can drive it is called designing for **testability**, and it's one of the most important habits in this series. This test-run mode is a first, clumsy version: it can only run the *whole* game and look at the end. In Chapter 2 you'll test individual pieces directly, which is far more precise; this mode stays for the checks that need the whole game running.

```check
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

## Challenge: Space changes the colour

**Optional, ★.** Each press of Space changes the window's background colour, cycling through three colours you choose. Pressing is an event (`event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE`), and the colour is state that lives between frames: a list of colours and an index into it, which goes back to 0 after the last. Fill the screen with `screen.fill(colour)` before `flip`. Do it in a copy, `scratch/colours.py`, so the main game stays as the lessons expect.

## Challenge: the real frame rate

**Optional, ★★.** Show the measured frames per second in the window's title, updated once a second. Add up `tick`'s returned milliseconds and count frames; when the total passes 1000, set the caption to the count, and start again. (pygame also has `clock.get_fps()`; try both and compare.) Then remove `tick(60)` and watch the number jump. In a copy, `scratch/fps.py`.

## Challenge: --help

**Optional, ★★.** Make `python breakout.py --help` print the usage line and exit with **0**, not 2: asking for help isn't a mistake, so it isn't a failure. Check with `$LASTEXITCODE`. In a copy of `breakout.py`, since the next lessons rewrite it.

## What did we actually learn?

- **A game is a loop** that runs once per frame: collect events, change things, draw, show. Every interactive program has a loop like this somewhere.
- **Input arrives as a queue of events**, collected each frame. A program that stops collecting them looks frozen to the operating system: you watched it happen.
- **Double buffering**: draw where nobody can see, then show the finished picture all at once.
- **Frame budget and sleeping**: 60 frames a second is 16.7 ms each; finishing early means sleeping, so the processor rests.
- **Testability is designed in.** A program other programs can run, through arguments, output and exit codes, can be checked automatically. This game's test-run mode is a first version of that idea, and its clumsiness is part of what Chapter 2 fixes.
- **Read an input, then act on it, in separate steps**, and run the program between them.

In C# or Java, a game framework (MonoGame, libGDX) hides this loop and calls your `Update` and `Draw` methods from inside it, once per frame. Chapter 10 builds the same arrangement for Forge.
