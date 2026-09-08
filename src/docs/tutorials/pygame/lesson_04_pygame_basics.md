# Lesson 4 — pygame-ce Basics: `Surface`, `Rect`, and Getting Pixels on Screen

## What you'll learn
- What a `Surface` actually is (a pixel buffer, not a "window")
- Why pygame's coordinate system has `(0, 0)` at the **top-left**, not the bottom-left
- Why *you* write pygame's event loop by hand — unlike Qt's `app.exec()`, which wrote it for you
- The single most common pygame trap: `convert()` vs `convert_alpha()`, and why transparent PNGs turn black without it

## What you'll build
A standalone script — deliberately with **no PySide6 involved** — that opens
a window, loads an image, and displays it correctly, transparency intact.
This is the last "no Qt in the room" lesson before Lesson 5 slices a real
spritesheet, and before Phase 4 merges this rendering entirely into the
editor shell you built in Lessons 1–2.

## The question
Lesson 1 taught you that Qt's `app.exec()` hands control to an event loop
you never wrote yourself. pygame is structured completely differently — so
differently that it will initially look *more* manual and *more*
error-prone. Why would a 2D library choose that, and what do you actually
have to write by hand to get a stable, responsive window?

---

## 1. Predict

Before reading on: if a GUI needs an event loop to stay alive and
responsive (Lesson 1), and pygame doesn't hand you one automatically like
Qt did — what do you think happens if you open a pygame window and *never*
write any kind of loop at all? Will it just sit there fine, error
immediately, or something else?

---

## 2. Try it

```python
import sys
import pygame

pygame.init()
screen = pygame.display.set_mode((800, 600))
pygame.display.set_caption("Forge — pygame test")

running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    screen.fill((30, 30, 40))
    pygame.display.flip()

pygame.quit()
sys.exit()
```

Run it. A dark blue-gray window opens, titled "Forge — pygame test," and
closes cleanly when you click its close button.

### What this code does (mechanical explanation)

**`import pygame`**
Note this project uses `pygame-ce` (the actively maintained community
fork), but the package still imports as `pygame` — the module name didn't
change, only the PyPI package name and what gets installed.

**`pygame.init()`**
Initializes every pygame subsystem (display, audio, joystick, font, etc.)
that has internal state to set up. This is pygame's equivalent of Lesson
1's `QApplication()` constructor in spirit — a required, one-time setup
call — but structurally different: it's a plain function call, not a
class you instantiate, and pygame has **no "exactly one instance" rule**
the way `QApplication` did.

**`screen = pygame.display.set_mode((800, 600))`**
This is the line that actually creates the OS-level window **and** returns
something you'll use constantly: a `pygame.Surface` representing that
window's own pixel buffer. This is the first core concept to get exactly
right: **a `Surface` is just a rectangular grid of pixels in memory** — it
has no concept of "being a window" by itself. `screen` happens to be *the
one Surface that is also shown on screen*, because it came from
`set_mode`. Every image you load later is *also* a `Surface` — just one
that isn't automatically displayed anywhere.

**`pygame.display.set_caption(...)`**
Sets the OS window's title bar text — directly analogous to Lesson 1's
`window.setWindowTitle(...)`, just as a module-level function instead of a
method on an object, matching pygame's overall style (mostly functions
grouped into modules like `pygame.display`, `pygame.event`, rather than
Qt's everything-is-an-object-with-methods style).

**`running = True` / `while running:`**
Here is the direct answer to this lesson's core question. Qt's
`app.exec()` *was* the loop — internal, written in C++, invisible to you.
pygame gives you no such thing. **You write the loop yourself**, as an
ordinary Python `while` loop. This is a real design difference, not
laziness on pygame's part: pygame is a lower-level library, closer to "a
thin wrapper over SDL" than "a complete application framework" — it gives
you the primitives (a window, an event queue, pixel-copying) and trusts
you to drive them.

**`for event in pygame.event.get():`**
`pygame.event.get()` returns a list of every input/system event that has
occurred since the last time you asked (mouse moves, key presses, the
window's close button, etc.) — pygame accumulates these internally in a
queue; calling this function drains that queue into a Python list you can
iterate.

**`if event.type == pygame.QUIT:`**
Each `event` object has a `.type` attribute, an integer constant.
`pygame.QUIT` is one such constant, specifically the one pygame sends when
the user clicks the window's close button (or otherwise asks the OS to
close it). **Crucially: nothing about clicking the close button
automatically closes anything.** It only causes this specific event to
appear in the queue — your code deciding to set `running = False` in
response is the *entire reason* the window actually closes. Skip this
`if`, and the window becomes literally unclosable via its own close button
(you'd have to kill the process externally).

**`running = False`**
Ordinary variable reassignment — this is what makes the `while running:`
condition false on its *next* check, ending the loop on the following
iteration, not instantly.

**`screen.fill((30, 30, 40))`**
`fill` is a `Surface` method that overwrites every pixel in that Surface
with one solid color. `(30, 30, 40)` is an RGB tuple — three integers,
0–255 each, for red/green/blue. This line exists for a reason you'll feel
immediately if you comment it out: without clearing the Surface each
frame, whatever was drawn last frame is never erased, and every subsequent
`blit` (Lesson 5) would visibly smear across the screen.

**`pygame.display.flip()`**
This is the line that actually pushes everything you've drawn onto
`screen` to the physical monitor. Until this call, all your drawing
(`fill`, and later `blit`) only modified an **in-memory** pixel buffer —
nothing the user can see yet. `flip()` is pygame's double-buffering
mechanism: while the user is seeing one buffer, you're free to draw the
*next* frame into the other one, then swap. This is why the pattern is
always "clear → draw → flip," every single frame, without exception.

**`pygame.quit()`**
The cleanup counterpart to `pygame.init()` — releases the subsystems that
were initialized. Convention, and good practice, but note it runs only
*after* the loop above has already ended (`running` became `False`) —
control genuinely does fall through to this line eventually, unlike Qt's
`app.exec()`, which blocked indefinitely until told to stop.

---

## 3. Why?

### Coordinate system — the thing that will confuse you exactly once

pygame's coordinate origin `(0, 0)` is the **top-left** corner of a
`Surface`. X increases rightward (as you'd expect); **Y increases
downward**, not upward. This trips up almost everyone coming from math
class or from y-up 3D engines. In pygame:

```
(0, 0) ---- X increases --->
  |
  Y increases
  |
  v
```

This matters immediately once `Rect` and `blit` positioning enter the
picture in the next section — "move down" means *adding* to Y, not
subtracting.

### `Surface` vs. window — the mental model

```
pygame.init()              → subsystems ready
pygame.display.set_mode()  → OS window created; returns the ONE Surface
                              that is also the visible screen
pygame.image.load()         → returns a Surface too — but NOT visible on
                              its own; it's just pixels in memory
Surface.blit(other_surface) → copies pixels from one Surface onto another,
                              at a given position — this is how an image
                              gets "onto" the screen Surface
pygame.display.flip()       → pushes the screen Surface's current pixels
                              to the actual monitor
```

Every `Surface` — whether it's the screen or a loaded PNG — is the *same
kind of object* and supports the same operations (`fill`, `blit`, getting
its `Rect`). The screen is not special except that it's the one connected
to the OS window.

---

## 4. Change one thing

```diff
-    screen.fill((30, 30, 40))
+    screen.fill((30, 30, 40))
+    pygame.draw.circle(screen, (200, 60, 60), (400, 300), 40)
```

Run it. A solid red circle appears centered in the window.

### What changed
One drawing call added, after the fill and before `flip()`.

### What did not change
- The loop structure, event handling, and `flip()` call — untouched
- The fact that `fill` still must run *before* any drawing each frame

```
change_analysis:
  changed: "added pygame.draw.circle(screen, (200, 60, 60), (400, 300), 40) between fill and flip"
  unchanged:
    - "event loop structure and QUIT handling"
    - "fill-then-flip framing of each iteration"
  behavioral_difference:
    - "a circle is now visibly drawn every frame, at pixel position (400, 300)"
  compiler_difference:
    - "none — Python, no compile step"
  runtime_difference:
    - "one additional Surface-mutating call executes per loop iteration, still cleared by the next frame's fill()"
```

**Why `(400, 300)` lands center-screen:** the window is `800×600`; half of
each dimension is `400` and `300` — the coordinate system explained above
means this point is measured from the top-left corner, `400` pixels right
and `300` pixels down.

---

## 5. Put it in the project

```python
# forge_pygame_test.py  (temporary — Phase 4 replaces the window entirely)
import sys
from pathlib import Path
import pygame


def main() -> int:
    pygame.init()
    screen = pygame.display.set_mode((800, 600))
    pygame.display.set_caption("Forge — spritesheet test")
    clock = pygame.time.Clock()

    sprite_path = Path("assets/placeholder.png")
    sprite = pygame.image.load(sprite_path).convert_alpha()
    sprite_rect = sprite.get_rect(center=(400, 300))

    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        screen.fill((30, 30, 40))
        screen.blit(sprite, sprite_rect)
        pygame.display.flip()
        clock.tick(60)

    pygame.quit()
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

(Use any small PNG with transparency for `assets/placeholder.png` — even a
quick shape exported from any image editor works for testing.)

### Code walkthrough — what's new

**`sprite_path = Path("assets/placeholder.png")`**
`pathlib.Path` (standard library) represents a filesystem path as an
object rather than a plain string — it's used here instead of a raw
string because pygame's loading functions accept both, and `Path` will be
the standard the rest of Forge uses (project files, asset references) once
Lesson 3's `GameObject` model starts referencing actual files.

**`pygame.image.load(sprite_path)`**
Reads the PNG from disk and decodes it into a `Surface`. By itself, this
`Surface`'s internal pixel format is **not guaranteed to match** the
screen's own pixel format — which matters for the next call.

**`.convert_alpha()`**
This is the line the trap in Section 6 is entirely about — read it
carefully now. `convert_alpha()` returns a **new** `Surface`, converted to
a pixel format that (a) matches the display for fast blitting and (b)
**preserves the image's alpha (transparency) channel**. Chained directly
onto `load(...)`, the intermediate un-converted `Surface` is discarded
immediately — only the converted one is kept, assigned to `sprite`.

**`sprite.get_rect(center=(400, 300))`**
`get_rect()` returns a `pygame.Rect` — an object bundling `x, y, width,
height` (and many convenience properties like `.center`, `.topleft`,
`.right`) describing a rectangular region. Called with `center=(400, 300)`,
it constructs a `Rect` the same size as `sprite`, but *positioned* so its
center lands at `(400, 300)` — you're not moving `sprite`'s pixels at all
here; you're computing *where* to later place them.

**`screen.blit(sprite, sprite_rect)`**
`blit` copies `sprite`'s pixels onto `screen`, positioned according to
`sprite_rect`. Passing a `Rect` (rather than a plain `(x, y)` tuple) as the
position argument is valid — `blit` only reads its `.topleft` corner from
the `Rect` to decide where to start copying pixels; `sprite_rect`'s width
and height aren't used to resize anything here, they were only used a
moment ago to *compute* that correct top-left corner via `center=`.

**`clock = pygame.time.Clock()`** / **`clock.tick(60)`**
`Clock()` constructs a small object for timing. `clock.tick(60)`, called
once per loop iteration, does two things: it makes the loop *sleep* just
long enough that iterations happen no faster than 60 times per second
(capping CPU usage and preventing the window from redrawing thousands of
times a second for no visual benefit), and it returns the actual elapsed
milliseconds since the last call — which Lesson 5's animation timing will
use directly as "delta time."

### Why this design?
```
design_decision:
  problem: "how do you load an image so it displays with correct transparency and reasonable performance?"
  available_choices:
    - "pygame.image.load(path) alone, with no conversion"
    - "pygame.image.load(path).convert() — format-matched, but drops alpha"
    - "pygame.image.load(path).convert_alpha() — format-matched, alpha preserved"
  selected_choice: "convert_alpha()"
  reason: "Forge's sprites are transparent PNGs (sprite sheets with empty space between frames); losing alpha would make every sprite appear on an opaque black/colored box"
  benefit: "correct transparency and fast blitting, at the cost of one conversion call per loaded image"
  cost: "convert_alpha() requires a display mode to already exist (set_mode must run first) — ordering matters"
  future_revisit_condition: "opaque, fully-rectangular art (e.g. tile backgrounds with no transparency) should use plain convert() instead, for a small performance gain — revisit per-asset in Phase 6"
```

---

## 6. Trap

**Normal rule (Section 5):** loading a transparent PNG and calling
`convert_alpha()` on it preserves transparency correctly when blitted.

**Apparently equivalent code:**
```python
sprite = pygame.image.load(sprite_path).convert()
```

**Surprising result:** the sprite displays with a **solid black box**
(or occasionally another solid color, depending on the source image)
exactly where the transparent areas should be — the shape itself looks
right, but it's sitting inside an opaque rectangle instead of blending
into the background.

**Exact reason:** `convert()` (no `_alpha`) also converts the `Surface` to
match the display's pixel format for fast blitting — **but it discards the
alpha channel entirely**, treating every pixel as fully opaque. Whatever
color values were stored in the originally-transparent pixels are now
drawn as solid, opaque color, because there's no alpha information left to
tell `blit` to skip or blend them.

**Project consequence:** every sprite and spritesheet Forge loads (Lesson
5 onward) must use `convert_alpha()`, never plain `convert()` — with one
narrow exception: fully opaque background art (Section 5's design-decision
note) can safely use `convert()` for a minor performance benefit, precisely
*because* it has no transparency to lose in the first place. The rule
isn't "always use convert_alpha()" — it's "know which case you're in."

---

## 7. Exercise

**Predict:** If you swap the order of `screen.fill(...)` and
`screen.blit(sprite, sprite_rect)` — blitting *before* filling — what will
you see on screen? Reason from "fill overwrites every pixel" before
running it.

**Modify:** Change `sprite_rect = sprite.get_rect(center=(400, 300))` to
`sprite_rect = sprite.get_rect(topleft=(400, 300))`. Predict how the
sprite's on-screen position changes, using the coordinate-system
explanation in Section 3, before you run it.

**Break:** Remove the `if event.type == pygame.QUIT: running = False`
check entirely (keep the `for` loop itself). Run the program and try to
close the window normally. What actually happens, and why does this
confirm that closing the OS window and stopping your loop are two
separate, unlinked things unless you connect them yourself?

**Repair:** Take the Trap section's black-box version
(`.convert()` instead of `.convert_alpha()`) and, without changing that
line back, fix the visual problem a different way: using
`sprite.set_colorkey(...)` to mark one specific color as transparent
instead. Look up `set_colorkey` and explain, in your own words, why this
is a different *mechanism* (a single "invisible color") than a true alpha
channel (a *per-pixel* transparency value) — and why that difference means
`set_colorkey` can't handle partially-transparent (semi-see-through) pixels
the way `convert_alpha()` can.

---

## What to remember
1. A `Surface` is just a pixel buffer in memory — the screen is one Surface among many, not a special type of object.
2. pygame's coordinate origin is top-left; Y increases downward.
3. Unlike Qt's `app.exec()`, pygame gives you no built-in event loop — you write `while running:` yourself, and closing the window only works because *you* check for `pygame.QUIT` and set `running = False`.
4. `fill()` → draw → `flip()`, every frame, in that order, is the non-negotiable pattern — skipping `fill()` smears old frames.
5. `convert_alpha()` preserves per-pixel transparency; plain `convert()` silently discards it, producing solid boxes where transparency should be.

## Next lesson
Lesson 5 slices a real spritesheet into individual animation frames using
`Surface.subsurface`, and introduces `pygame.time.Clock`-driven delta time
properly — the two pieces Forge's animation system (Phase 6) is built on
directly.
