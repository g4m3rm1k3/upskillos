# Lesson 5 — Slicing Spritesheets and Real Delta-Time Animation

## What you'll learn
- How `Surface.subsurface` slices one image into many *without* copying pixel data — and the real consequence of that
- Why animating "one frame every N loop iterations" is a hidden framerate bug, and how delta time fixes it properly
- A genuine pygame trap: subsurfaces share memory with their parent, so drawing on a "frame" can silently damage your master spritesheet

## What you'll build
A standalone script that loads a grid-based spritesheet, slices it into a
list of individual frame `Surface`s, and plays them back as a smooth
animation at a fixed frame rate — correctly, regardless of how fast the
computer running it happens to be. This is the exact mechanism Phase 6's
`AnimationClip` system builds on.

## The question
Lesson 4 displayed one static sprite. An animation is "the same sprite,
cycling through several images over time." The naive approach — advance to
the next frame once per loop iteration — has a bug baked into it that
won't show up on your machine, but will absolutely show up on someone
else's. What is it, and why?

---

## 1. Predict

```python
frame_index = 0
frames = [frame_a, frame_b, frame_c]  # pretend these exist

# inside the main loop, once per iteration:
frame_index = (frame_index + 1) % len(frames)
current = frames[frame_index]
```

If this ran inside Lesson 4's loop, and Lesson 4's loop is capped at 60
iterations per second via `clock.tick(60)`, how many times per second would
the animation cycle through all 3 frames? Now: what would happen to that
*same* code, unchanged, if it ran on a machine capped at 144 iterations per
second instead? Would the animation look the same, faster, or slower?

---

## 2. Try it

First, the naive, framerate-coupled version — deliberately, so you can see
the bug rather than just being told about it:

```python
import pygame

pygame.init()
screen = pygame.display.set_mode((400, 300))
clock = pygame.time.Clock()

sheet = pygame.image.load("assets/walk_sheet.png").convert_alpha()
frame_w, frame_h = 32, 32
frames = [sheet.subsurface(pygame.Rect(i * frame_w, 0, frame_w, frame_h))
          for i in range(4)]

frame_index = 0
running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    frame_index = (frame_index + 1) % len(frames)   # <-- the bug

    screen.fill((20, 20, 20))
    screen.blit(frames[frame_index], (180, 130))
    pygame.display.flip()
    clock.tick(60)

pygame.quit()
```

(Any 4-frame-wide spritesheet, 32px frames, works — even four solid-colored
squares side by side is enough to *see* the bug.)

### What this code does (mechanical explanation)

**`sheet = pygame.image.load(...).convert_alpha()`**
Identical mechanism to Lesson 4 — one `Surface` holding the *entire*
spritesheet image, all frames side by side in one file.

**`frame_w, frame_h = 32, 32`**
Plain tuple unpacking — two local variables assigned in one line. This
assumes a spritesheet where every frame is a fixed, known pixel size laid
out in a single row — the simplest possible layout, and a deliberate
starting point; Phase 6's real import tool will handle sheets the user
defines interactively instead of hardcoding sizes.

**`[sheet.subsurface(pygame.Rect(i * frame_w, 0, frame_w, frame_h)) for i in range(4)]`**
A list comprehension building four `Surface`s. `pygame.Rect(i * frame_w, 0,
frame_w, frame_h)` computes, for each `i` from `0` to `3`, a rectangle
`32` pixels wide starting at x-position `0, 32, 64, 96` — i.e., frame `i`'s
region within the sheet, all at `y = 0` since this sheet is a single row.

**`sheet.subsurface(rect)`**
This is the core new concept, and it is **not** the same as cropping a copy
of the image. `subsurface` returns a new `Surface` object that **shares the
same underlying pixel memory** as `sheet`, restricted to the given
rectangle — it's a *view* into `sheet`'s pixels, not an independent copy.
This is what makes slicing a spritesheet essentially free, memory-wise, no
matter how many frames it has — you're not duplicating image data four
times, you're creating four windows onto the same data. Hold onto this
fact; it's exactly what Section 6's trap depends on.

**`frame_index = (frame_index + 1) % len(frames)`**
Ordinary integer arithmetic. `% len(frames)` (modulo) wraps the index back
to `0` once it would otherwise reach `4`, producing the cycle
`0, 1, 2, 3, 0, 1, 2, 3, ...`. Nothing pygame-specific about this line at
all — and that's exactly the problem.

**`screen.blit(frames[frame_index], (180, 130))`**
Same `blit` mechanism from Lesson 4, just indexing into the `frames` list
instead of blitting one fixed sprite — this line itself is correct and
will remain unchanged for the rest of this lesson.

---

## 3. Why?

### The bug, explained precisely

`frame_index` advances **once per loop iteration**, and
`clock.tick(60)` caps the loop at roughly 60 iterations per second — *on
this machine, under these conditions*. `clock.tick(N)` is a **cap**, not a
guarantee: if the machine is slow or busy, the loop could run at 40
iterations/second instead; if it's fast and doing very little else per
frame, it could run close to whatever `tick()` allows, but the *actual*
achieved rate still depends on real elapsed time, not a promise.

The real problem is conceptual: **the animation's speed is currently tied
to "how many times has the loop run," not to "how much real time has
passed."** On a machine where the loop happens to run at 30 iterations/sec
instead of 60 (a slow machine, a busy CPU, `tick()` given a lower cap, or
this same code with `tick()` removed entirely), the character would visibly
animate at **half speed** — despite you never touching the animation logic
itself. This is precisely why your Prediction in Section 1 should have
been "it would look different on the 144fps machine" — coupling animation
speed to loop-iteration count instead of to a clock is a bug that's
invisible until *someone else's* hardware, or *your own* future code
changes elsewhere in the loop, changes the iteration rate.

### The fix — delta time

"Delta time" (commonly `dt`) means: *how many milliseconds (or seconds)
actually elapsed since the last frame*, measured directly from a clock,
not inferred from loop-iteration counting. `clock.tick(60)` conveniently
**returns** this value — milliseconds elapsed since the *previous* call to
`tick()` — which Lesson 4 called but ignored the return value of. Using
that returned number to drive animation timing decouples "how fast frames
change" from "how many times the loop happens to run per second."

```
behavior:
  compile_time:
    - "none — this is a pure runtime/design issue, not something Python or a type checker can catch"
  runtime:
    - "clock.tick(60) both caps the loop AND returns actual elapsed milliseconds since the last call"
    - "using that returned value, rather than counting iterations, ties animation speed to real elapsed time"
```

---

## 4. Change one thing

```diff
+ frame_duration_ms = 150
+ elapsed_ms = 0.0
  frame_index = 0
  running = True
  while running:
      for event in pygame.event.get():
          if event.type == pygame.QUIT:
              running = False

-     frame_index = (frame_index + 1) % len(frames)
+     dt = clock.tick(60)
+     elapsed_ms += dt
+     if elapsed_ms >= frame_duration_ms:
+         elapsed_ms -= frame_duration_ms
+         frame_index = (frame_index + 1) % len(frames)

      screen.fill((20, 20, 20))
      screen.blit(frames[frame_index], (180, 130))
      pygame.display.flip()
-     clock.tick(60)
```

### What changed
The frame-advance line no longer runs unconditionally every iteration; it
runs only once enough real time (`frame_duration_ms`, here `150`ms per
frame) has accumulated. `clock.tick(60)` moved earlier in the loop and its
return value is now used, not discarded. The old, second `clock.tick(60)`
call at the bottom is removed — you only want to advance/measure the
clock **once** per iteration, not twice.

### What did not change
- `frames` list, `subsurface` slicing, `blit` call — untouched
- The overall `fill → blit → flip` frame structure
- Event handling

```
change_analysis:
  changed: "frame advancement now gated by accumulated real elapsed time (elapsed_ms) instead of running unconditionally every loop iteration"
  unchanged:
    - "spritesheet slicing via subsurface"
    - "the fill/blit/flip drawing sequence"
    - "event loop and QUIT handling"
  behavioral_difference:
    - "animation now advances at a fixed real-world rate (1 frame per 150ms) regardless of the loop's actual iteration rate"
  compiler_difference:
    - "none"
  runtime_difference:
    - "clock.tick()'s return value is now consumed and accumulated, rather than its return value being discarded as in Lesson 4 and the naive version above"
```

### Execution trace

```
1. clock.tick(60) called: sleeps if needed to cap the loop near 60/sec,
   returns milliseconds elapsed since its own previous call (e.g. 16ms)
2. elapsed_ms += dt  → running total of real elapsed time grows
3. if elapsed_ms >= 150: this is false almost every iteration at first
   (16ms accumulating slowly toward 150)
4. ...loop continues, elapsed_ms keeps growing: 16, 33, 49, ... eventually
   crosses 150
5. once elapsed_ms >= 150: subtract 150 (not reset to 0 — this preserves
   any small "overshoot" so timing doesn't drift over many frames),
   advance frame_index by one (wrapping via %)
6. screen.blit draws whichever frame frame_index currently points to
7. repeat — frame_index advances roughly 6.6 times per second
   (1000ms / 150ms), regardless of whether the loop itself runs at
   60/sec, 30/sec, or 144/sec
```

---

## 5. Put it in the project

```python
# forge/animation.py
from dataclasses import dataclass, field
import pygame


@dataclass
class AnimationClip:
    frames: list[pygame.Surface]
    frame_duration_ms: int = 150
    loop: bool = True

    _elapsed_ms: float = field(default=0.0, init=False, repr=False)
    _frame_index: int = field(default=0, init=False, repr=False)

    def update(self, dt_ms: float) -> None:
        self._elapsed_ms += dt_ms
        while self._elapsed_ms >= self.frame_duration_ms:
            self._elapsed_ms -= self.frame_duration_ms
            self._frame_index += 1
            if self._frame_index >= len(self.frames):
                self._frame_index = 0 if self.loop else len(self.frames) - 1

    @property
    def current_frame(self) -> pygame.Surface:
        return self.frames[self._frame_index]


def slice_sheet(sheet: pygame.Surface, frame_w: int, frame_h: int) -> list[pygame.Surface]:
    columns = sheet.get_width() // frame_w
    return [
        sheet.subsurface(pygame.Rect(i * frame_w, 0, frame_w, frame_h))
        for i in range(columns)
    ]
```

### Code walkthrough — what's new versus Section 4

**`_elapsed_ms: float = field(default=0.0, init=False, repr=False)`**
Three new pieces on top of Lesson 3's `field(...)` usage:
- `init=False` tells `@dataclass`'s generated `__init__` to **not** accept
  this as a constructor argument at all — it's internal bookkeeping, always
  starting at its default, never something a caller should set directly
  when creating an `AnimationClip`.
- `repr=False` excludes it from the generated `__repr__` — printing an
  `AnimationClip` won't clutter the output with internal timing state
  irrelevant to identifying *which clip* it is.
- The leading underscore in `_elapsed_ms` is the same convention from
  Lesson 2 (`_build_panels`) — signaling "internal," not enforced.

**`def update(self, dt_ms: float) -> None:`**
This is Section 4's `if elapsed_ms >= frame_duration_ms:` logic, upgraded
to a `while` loop instead of `if`. The reason: `if` only advances **one**
frame even if a very large `dt` arrives in one call (e.g., the editor
briefly froze, or you're stepping frame-by-frame in a debugger) — a `while`
correctly advances through *multiple* frames if enough time genuinely
passed in one update, keeping playback speed accurate even after a stall,
rather than silently falling behind forever.

**`@property` / `current_frame`**
A **property** — introduced conceptually back in Lesson 1's contrast with
Qt's `setX()`/`x()` style, now used for real. `current_frame` reads like a
plain attribute access (`clip.current_frame`, no parentheses) from calling
code, but is actually backed by a method that computes the answer
(`self.frames[self._frame_index]`) on every access. This is deliberately
**not** a stored field — storing "the current frame" separately from
`_frame_index` would create two sources of truth that could drift out of
sync; the property guarantees there's exactly one.

**`slice_sheet(...)`**
A plain function, not a method — it doesn't belong to any particular
`AnimationClip` instance; it's a reusable utility that *produces* the
`frames` list an `AnimationClip` is constructed with. `sheet.get_width() //
frame_w` computes how many whole frames fit across the sheet using integer
floor division (`//`), so a sheet that isn't an exact multiple of
`frame_w` wide simply ignores the leftover partial column rather than
erroring or producing a malformed frame.

### Why this design?
```
design_decision:
  problem: "how should animation timing be structured so it's reusable across the editor's preview, the timeline scrubber (Phase 6), and eventually the exported runtime (Phase 9)?"
  available_choices:
    - "keep timing logic inline in whatever loop happens to be drawing the animation"
    - "encapsulate timing + frame-selection in an AnimationClip class with an update(dt) method"
  selected_choice: "AnimationClip class"
  reason: "every consumer (editor preview, exported game) needs identical timing behavior; duplicating the accumulator logic in each place invites the exact drift/edge-case bugs this lesson just walked through"
  benefit: "one tested implementation of frame timing; callers just provide dt and read current_frame"
  cost: "an extra layer of indirection versus a single inline loop for a one-off script"
  future_revisit_condition: "non-uniform per-frame durations (some frames longer than others) will require frame_duration_ms to become a per-frame list instead of one shared value — noted for Phase 6"
```

---

## 6. Trap

**Normal rule (Section 2):** `subsurface` returns a `Surface` that shares
pixel memory with its parent — an efficient *view*, not a copy.

**Apparently equivalent code:** imagine you're building the editor's frame
import preview (Phase 6) and want to visually mark the currently-selected
frame with a colored border, and you reach for the most obvious tool:

```python
frames = slice_sheet(sheet, 32, 32)
selected = frames[2]
selected.fill((255, 0, 0), pygame.Rect(0, 0, 32, 2))   # "draw a red top border"
```

**Surprising result:** the spritesheet's *master* image — `sheet` itself —
now has a permanent red stripe baked into frame 2's region. If you save
`sheet` back to disk, or re-slice new frames from it later, or display the
original spritesheet anywhere else in the editor (e.g. an "overview" of the
whole sheet), the damage is there too. It is not limited to the one
`Surface` reference named `selected`.

**Exact reason:** `selected` is not an independent image — it is a *view*
into the exact same pixel buffer as `sheet` (Section 2's mechanism). `fill`
mutates whatever pixel buffer a `Surface` points to; since `selected` and
the corresponding region of `sheet` are the *same* buffer, mutating one
mutates both, simultaneously, because there is only one buffer to begin
with.

**Project consequence:** the rule going forward — **never draw directly
onto a `Surface` obtained from `subsurface` if that drawing is meant to be
temporary or selection-only UI feedback.** For anything the editor needs to
visually modify without touching the source asset (highlight borders,
tint-on-hover, selection outlines), draw the *indicator* as a separate
overlay on top (e.g., `pygame.draw.rect` on the destination `Surface`
you're blitting *to*, positioned using the frame's `Rect`, not on the frame
`Surface` itself) — or, if you genuinely need an independently-editable
copy of a frame's pixels, call `.copy()` on the subsurface first, which
*does* allocate new, separate pixel memory.

---

## 7. Exercise

**Predict:** If `frame_duration_ms` is `150` and a call to `update(dt_ms=400)`
happens in one shot (e.g. after a stall), how many frames should
`_frame_index` advance, using the `while`-loop version from Section 5?
Trace it by hand before checking by running it.

**Modify:** Add a `finished` property to `AnimationClip` that returns
`True` once a non-looping (`loop=False`) clip has reached its last frame
and can't advance further. Where does the existing `if self._frame_index >=
len(self.frames): ... else len(self.frames) - 1` line already give you the
information you need for this?

**Break:** Remove the `while` in `update` and replace it with `if`. Then
call `clip.update(500)` once, with `frame_duration_ms = 150` and 4 frames.
Compare `_frame_index` after this single call between the `if` and `while`
versions. Which one "loses" elapsed time, and where does it go?

**Trace:** Using the Trap section's example, write out step by step what
`sheet`'s pixel buffer looks like immediately after
`selected.fill(...)` runs — specifically, name every `Surface` variable
that would show the red stripe if displayed, and explain why each one does
or doesn't, based only on which buffer each variable actually points to.

---

## What to remember
1. `subsurface` slices without copying — fast, but the result **shares pixel memory** with its parent; mutating one mutates both.
2. Coupling animation speed to loop-iteration count is a hidden framerate-dependence bug; always drive timing from real elapsed time (`clock.tick()`'s return value), not from counting iterations.
3. A `while` loop (not `if`) when accumulating elapsed time correctly handles large or delayed `dt` values without losing time.
4. `@dataclass` fields can be excluded from the constructor (`init=False`) and from `__repr__` (`repr=False`) for internal bookkeeping state.
5. A `@property` guarantees a derived value (like "current frame") has exactly one source of truth, rather than being stored and risking going out of sync.

## Next lesson
Lesson 6 covers `pygame.sprite.Sprite` and `pygame.sprite.Group` — pygame's
own built-in object model — and, importantly, examines *where it fits and
where it doesn't* for Forge's needs, since Forge's `GameObject` (Lesson 3)
already covers some of the same ground differently. This sets up the last
piece before Phase 4's actual pygame-inside-Qt merge.
