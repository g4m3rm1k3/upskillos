# Lesson 7 — The Merge: A Live pygame Surface Inside a Qt Widget

## What you'll learn
- Why pygame can't just "open a window" inside your Qt app the normal way — and the headless trick that avoids a second, real OS window
- How to convert a pygame `Surface`'s raw pixels into a `QImage` Qt can paint — and the exact byte-format mismatch that causes the single most common bug in this conversion
- How `QTimer` replaces pygame's own `while running:` loop, letting Qt's one event loop drive both worlds
- The real difference between `QWidget.update()` (schedules a repaint) and calling `paintEvent` yourself

## What you'll build
`ViewportWidget` — a real Qt widget that replaces the `QLabel("Viewport")`
placeholder from Lesson 2, showing a live, animating pygame scene (a
`RenderSprite` from Lesson 6, playing an `AnimationClip` from Lesson 5)
inside the actual editor shell you built in Lessons 1–2. This is the
lesson where every previous lesson's code finally runs in one process,
together.

## The question
Lesson 1 established: exactly one event loop drives a Qt app
(`app.exec()`). Lesson 4 established: pygame expects to drive its *own*
`while running:` loop and open its *own* OS window. Both of those things
are now true of the *same program*. Which one wins, and how does the other
one's output still end up visible?

---

## 1. Predict

If, inside a running PySide6 application, you called
`pygame.display.set_mode((800, 600))` exactly as Lesson 4 did — what do
you expect to happen? A second, separate OS window opening alongside your
Qt window? An error, since Qt "owns" the app already? Something else? Form
a guess before continuing — the answer is the entire reason this lesson's
first trick exists.

---

## 2. Try it — headless pygame + a static QImage

```python
import os
os.environ["SDL_VIDEODRIVER"] = "dummy"

import sys
import pygame
from PySide6.QtWidgets import QApplication, QWidget
from PySide6.QtGui import QImage, QPainter
from PySide6.QtCore import Qt


class ViewportWidget(QWidget):
    def __init__(self) -> None:
        super().__init__()
        pygame.init()
        pygame.display.set_mode((1, 1))  # required for convert_alpha(), never shown
        self.surface = pygame.Surface((400, 300))
        self.surface.fill((30, 30, 40))
        pygame.draw.circle(self.surface, (200, 60, 60), (200, 150), 40)

    def paintEvent(self, event) -> None:
        data = pygame.image.tostring(self.surface, "RGB")
        image = QImage(data, self.surface.get_width(), self.surface.get_height(),
                        QImage.Format.Format_RGB888)
        painter = QPainter(self)
        painter.drawImage(0, 0, image)


app = QApplication(sys.argv)
widget = ViewportWidget()
widget.resize(400, 300)
widget.show()
sys.exit(app.exec())
```

Run it. **One** window appears — a Qt window — showing the red circle on a
dark background, exactly as it would have in Lesson 4's standalone pygame
script. No second window opens.

### What this code does (mechanical explanation)

**`os.environ["SDL_VIDEODRIVER"] = "dummy"`** — placed *before* `import pygame`
pygame is built on top of SDL, a lower-level library that talks to the
actual operating system's windowing/graphics APIs. `SDL_VIDEODRIVER` is an
environment variable SDL itself reads **once, when it initializes** — this
line must run before pygame (and therefore SDL) initializes, which is why
it's placed before `import pygame` even executes, not just before
`pygame.init()`. Setting it to `"dummy"` tells SDL to use a fake video
backend that satisfies every API call (so `pygame.display.set_mode()`
doesn't error) **without ever asking the OS to create a real, visible
window**. This is exactly what answers Section 1's prediction: the reason
no second window appears is that pygame's own window-creation machinery is
being told, at the lowest level, to no-op.

**`pygame.display.set_mode((1, 1))`**
Recall from Lesson 4: several pygame operations — notably `convert()` and
`convert_alpha()` — require a display mode to already be set, because they
need to know the display's native pixel format to convert *to*. With the
dummy driver active, calling `set_mode` still satisfies that requirement
internally, even though nothing is ever actually shown by pygame itself.
The size `(1, 1)` is deliberately trivial — this "window" is never seen by
anyone, so its size is irrelevant; only its *existence* matters.

**`self.surface = pygame.Surface((400, 300))`**
This is the crucial shift from every previous pygame lesson: this
`Surface` was **not** obtained from `pygame.display.set_mode()` (which
would be "the screen"). It's a plain, independent, in-memory pixel buffer
— exactly the kind Lesson 4 described loaded images as being. Drawing onto
it (`fill`, `pygame.draw.circle`) works identically to drawing onto the
screen Surface from earlier lessons, because — as Lesson 4 emphasized —
**every `Surface` supports the same operations**; only the screen one is
automatically shown anywhere, and this one isn't shown by pygame at all.

**`def paintEvent(self, event) -> None:`**
This is a Qt **virtual method override** — the first one in this project.
Every `QWidget` has a `paintEvent` method that Qt's event loop calls
*automatically*, whenever that widget needs to be (re)drawn — after
`show()`, after being resized, after being uncovered by another window,
or after you explicitly ask for a repaint (Section 5). You never call
`paintEvent` yourself directly; overriding it is how you tell Qt *what*
to draw when it decides a repaint is needed. This connects directly back
to Lesson 1: `paintEvent` calls are themselves just another kind of event
dispatched by the one event loop `app.exec()` started.

**`pygame.image.tostring(self.surface, "RGB")`**
Extracts the `Surface`'s pixel data as a raw Python `bytes` object, laid
out according to the format string given — `"RGB"` here means 3 bytes per
pixel, red-green-blue, no alpha. This function is pygame's side of the
bridge: it doesn't know or care about Qt; it just hands you raw bytes.

**`QImage(data, width, height, QImage.Format.Format_RGB888)`**
This is Qt's side of the bridge, and it is the single most error-prone
line in this entire lesson (Section 6 is built entirely around getting
this wrong once, on purpose). `QImage` is Qt's own image/pixel-buffer
class — its constructor here is being told: "here are raw bytes,
`width`×`height` pixels, and here is exactly how to interpret each pixel's
bytes." `QImage.Format.Format_RGB888` specifies 3 bytes per pixel, in
red-green-blue order — **this must match** what `pygame.image.tostring`
was told to produce (`"RGB"`) or the colors will be wrong, which is
exactly Section 6's trap.

**`painter = QPainter(self)`** / **`painter.drawImage(0, 0, image)`**
`QPainter` is Qt's drawing API — constructed with `self` (this widget) as
its target means anything drawn through `painter` is drawn onto *this*
widget's surface. `drawImage(0, 0, image)` copies `image`'s pixels onto
the widget starting at position `(0, 0)` — directly analogous to pygame's
own `blit`, just spelled differently and belonging to a different library.
`QPainter` **must** be constructed inside `paintEvent` (or code called from
it) — Qt only permits painting on a widget during its designated paint
event, not at arbitrary times, which is part of why the redraw-scheduling
mechanism in Section 5 exists at all.

---

## 3. Why?

### Why headless, not a second real pygame window

The alternative — letting pygame open its own real, visible window
alongside Qt's — would give you two separate OS windows the user would see
and could move/close independently, with **two disconnected event loops**
neither of which knows about the other. That's not "pygame inside the
editor," that's two unrelated programs sharing a process. The headless
`SDL_VIDEODRIVER=dummy` trick is what makes "one pixel buffer pygame draws
into, shown inside one Qt widget among several" possible at all.

### The pixel-format bridge — the actual mechanism

```
pygame Surface (in-memory pixel buffer)
        ↓ pygame.image.tostring(surface, FORMAT_STRING)
raw bytes, laid out according to FORMAT_STRING
        ↓ QImage(bytes, w, h, QIMAGE_FORMAT)
QImage (Qt's own pixel buffer), interpreted according to QIMAGE_FORMAT
        ↓ QPainter(widget).drawImage(...)
pixels copied onto the widget's own drawable surface
```

**Nothing here is checked for you.** `tostring`'s format string and
`QImage`'s format enum are two independent pieces of API, from two
unrelated libraries, that happen to need to agree with each other by
convention — there is no shared type or validation step that would catch
you specifying `"RGB"` on one side and an RGBA-expecting format on the
other. This is exactly the kind of "two libraries glued together" seam
where bugs live, and exactly why Section 6 devotes a full trap to it.

```
behavior:
  compile_time:
    - "none — Python performs no static checking that the format string and QImage format enum agree"
  runtime:
    - "pygame.image.tostring produces raw bytes with a byte layout entirely determined by the format string you pass"
    - "QImage interprets those same bytes according to whatever format enum you separately specify — mismatches produce a valid-looking but wrong-colored image, not an error"
```

---

## 4. Change one thing — from a static image to a live animation

```diff
 class ViewportWidget(QWidget):
     def __init__(self) -> None:
         super().__init__()
         pygame.init()
         pygame.display.set_mode((1, 1))
         self.surface = pygame.Surface((400, 300))
-        self.surface.fill((30, 30, 40))
-        pygame.draw.circle(self.surface, (200, 60, 60), (200, 150), 40)
+        self.angle = 0
+        self.clock = pygame.time.Clock()
+        self.timer = QTimer(self)
+        self.timer.timeout.connect(self._on_tick)
+        self.timer.start(16)  # roughly 60 times per second
+
+    def _on_tick(self) -> None:
+        dt = self.clock.tick(60)
+        self.angle = (self.angle + dt * 0.1) % 360
+        self.surface.fill((30, 30, 40))
+        offset_x = 200 + int(100 * pygame.math.Vector2(1, 0).rotate(self.angle).x)
+        pygame.draw.circle(self.surface, (200, 60, 60), (offset_x, 150), 30)
+        self.update()

     def paintEvent(self, event) -> None:
         data = pygame.image.tostring(self.surface, "RGB")
         image = QImage(data, self.surface.get_width(), self.surface.get_height(),
                         QImage.Format.Format_RGB888)
         painter = QPainter(self)
         painter.drawImage(0, 0, image)
```

(`from PySide6.QtCore import QTimer` added to the imports.)

Run it. The circle now sweeps left and right smoothly, continuously,
while the window stays fully responsive (movable, resizable) — because
none of this blocks Qt's own event loop.

### What changed
Drawing moved out of `__init__` (a one-time setup) and into `_on_tick`, a
new method run repeatedly by a `QTimer`. `paintEvent` itself is
**completely unchanged** — it still just converts whatever is currently in
`self.surface` and paints it; it has no idea whether that content is
static or animating.

### What did not change
- The `tostring`/`QImage`/`QPainter` bridge from Section 2 — identical
- `paintEvent`'s responsibilities — purely "convert and paint current
  state," never "decide what the current state should be"

```
change_analysis:
  changed: "drawing logic moved from one-time __init__ code to a QTimer-driven _on_tick method; self.update() added at the end of each tick"
  unchanged:
    - "the pygame-Surface-to-QImage-to-QPainter pipeline in paintEvent"
    - "headless pygame setup (SDL_VIDEODRIVER, display.set_mode)"
  behavioral_difference:
    - "the viewport now animates continuously instead of showing one fixed frame"
  compiler_difference:
    - "none"
  runtime_difference:
    - "a second, independent timer-driven callback now runs roughly 60 times/second, entirely managed by Qt's own event loop rather than a separate while loop"
```

### `QTimer` — reconciling "two loops" into one

This is the direct answer to this lesson's opening question. `QTimer(self)`
constructs a timer parented to this widget (Lesson 2's ownership rules
apply here too — this timer will be destroyed automatically if the widget
is). `.timeout.connect(self._on_tick)` is a **signal-slot connection**
(the mechanism briefly named back in the Phase 2 roadmap, now used for
real): `timeout` is a signal `QTimer` emits every time its interval
elapses; connecting it to `self._on_tick` means Qt's event loop will call
`_on_tick` automatically, as one more kind of event, every ~16ms.
**pygame's own `while running:` loop from Lesson 4 is completely gone.**
There is only ever one loop in this program now — Qt's — and pygame's
per-frame work (`clock.tick`, drawing) happens *inside* a callback that
loop invokes, rather than pygame running its own separate loop alongside
it.

### `self.clock.tick(60)` here vs. Lesson 4/5

Same object, same method, same return value (elapsed milliseconds) as
Lessons 4 and 5 — but notice it's no longer *capping* a loop the way it
did in Lesson 4 (there's no `while` loop here for it to throttle); it's
being used purely for its **return value**, exactly like Lesson 5's
delta-time accumulation. `QTimer.start(16)` is now the thing setting the
approximate frame rate, not `clock.tick`.

---

## 5. `self.update()` — scheduling a repaint, not painting immediately

The last line of `_on_tick` is `self.update()` — and this is worth being
exact about, because of a naming collision this project has already set up
for you. **This `update()` is `QWidget.update()`**, not
`AnimationClip.update()` from Lesson 5, nor `Group.update()` from Lesson 6
— three different methods, on three unrelated classes, that happen to
share a name because "update" is a common word, not because they're the
same mechanism. `QWidget.update()` does **not** repaint the widget
immediately, synchronously, on the spot. It **schedules** a repaint,
telling Qt "sometime soon — the next time you're processing events and get
to it — call this widget's `paintEvent`." This is deliberate: if every
state change triggered an immediate, synchronous repaint, rapid changes
within the same tick could cause redundant, wasted painting. Qt instead
batches these requests and repaints once per actual event-loop pass. (A
`repaint()` method also exists, forcing an immediate, synchronous redraw —
but it's rarely what you want, precisely because it bypasses this
batching.)

```
behavior:
  compile_time:
    - "none — nothing distinguishes these same-named methods statically beyond which class you're calling it on"
  runtime:
    - "QWidget.update() marks the widget as needing a repaint and returns immediately; the actual paintEvent call happens later, when Qt's event loop next processes paint events"
```

---

## 6. Trap

**Normal rule (Section 2):** `pygame.image.tostring(surface, FORMAT)` and
`QImage(..., QIMAGE_FORMAT)` must be told **matching** pixel layouts for
colors to display correctly.

**Apparently equivalent code** — someone reasonably assumes "RGBA" and
"RGBA8888" obviously go together:

```python
data = pygame.image.tostring(self.surface, "RGBA")
image = QImage(data, w, h, QImage.Format.Format_RGB888)   # mismatched format!
```

**Surprising result:** the image renders — no crash, no exception — but
with **visibly wrong colors**: a red circle might appear cyan or shifted
in hue, and the whole image is often subtly skewed/sheared-looking,
because the byte counts per pixel don't even match (`"RGBA"` is 4 bytes
per pixel; `Format_RGB888` expects 3), so `QImage` misinterprets where one
pixel's data ends and the next begins, offsetting the entire interpretation
of the buffer after the very first row.

**Exact reason:** `QImage`'s constructor has **no way to verify** that the
raw bytes you handed it actually match the format you claim they're in —
it trusts you completely and just reinterprets the same bytes according to
whatever format enum you specified. This is the runtime consequence
predicted in Section 3: two unrelated libraries' format conventions must
be kept in sync *by the programmer*, with nothing in either API enforcing
agreement.

**Project consequence:** the rule going forward — **`tostring`'s format
string and `QImage`'s format enum are chosen together, as a pair, every
single time**, and any sprite/asset with actual transparency needs the
4-byte-per-pixel pair (`"RGBA"` with `QImage.Format.Format_RGBA8888`), not
the 3-byte pair used in this lesson's examples so far. Forge's real
`ViewportWidget` (Section 7) uses the RGBA pair for exactly this reason —
sprites in this project are transparent PNGs (Lesson 4), and the viewport
must preserve that transparency all the way through this conversion, not
just up to the point of loading the image.

---

## 7. Put it in the project

```python
# forge/viewport_widget.py
import os
os.environ.setdefault("SDL_VIDEODRIVER", "dummy")

import pygame
from PySide6.QtWidgets import QWidget
from PySide6.QtGui import QImage, QPainter
from PySide6.QtCore import QTimer


class ViewportWidget(QWidget):
    def __init__(self, width: int = 640, height: int = 480) -> None:
        super().__init__()
        pygame.init()
        pygame.display.set_mode((1, 1))
        self.surface = pygame.Surface((width, height), pygame.SRCALPHA)
        self.clock = pygame.time.Clock()
        self.sprites = pygame.sprite.Group()  # populated in Phase 6/7

        self.timer = QTimer(self)
        self.timer.timeout.connect(self._on_tick)
        self.timer.start(16)

    def _on_tick(self) -> None:
        dt = self.clock.tick(60)
        self.sprites.update(dt)
        self.surface.fill((30, 30, 40, 255))
        self.sprites.draw(self.surface)
        self.update()

    def paintEvent(self, event) -> None:
        data = pygame.image.tostring(self.surface, "RGBA")
        image = QImage(data, self.surface.get_width(), self.surface.get_height(),
                        QImage.Format.Format_RGBA8888)
        painter = QPainter(self)
        painter.drawImage(0, 0, image)
```

```python
# forge/editor_window.py — replacing Lesson 2's QLabel("Viewport")
from PySide6.QtWidgets import QMainWindow, QSplitter, QLabel
from PySide6.QtCore import Qt
from forge.viewport_widget import ViewportWidget


class EditorWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("Forge")
        self.resize(1000, 700)
        self.setCentralWidget(self._build_panels())

    def _build_panels(self) -> QSplitter:
        splitter = QSplitter(Qt.Orientation.Horizontal)
        splitter.addWidget(QLabel("Scene Tree"))
        splitter.addWidget(ViewportWidget())
        splitter.addWidget(QLabel("Inspector"))
        return splitter
```

### Code walkthrough — what's new versus Sections 2/4

**`pygame.Surface((width, height), pygame.SRCALPHA)`**
The `pygame.SRCALPHA` flag, passed as a second argument, tells pygame to
give this `Surface` a genuine per-pixel alpha channel from the moment it's
created — necessary here because Section 6's trap resolution requires
RGBA data all the way through; without this flag, a plain `Surface` has no
alpha channel to extract in the first place, regardless of what format
string you later ask `tostring` for.

**`self.surface.fill((30, 30, 40, 255))`**
A four-value color tuple instead of three — the fourth value is the alpha
channel for the fill itself (`255` = fully opaque background), matching
the `SRCALPHA` surface's format.

**`self.sprites = pygame.sprite.Group()`**
Directly Lesson 6's `Group`, stored as an attribute so later lessons
(Phase 6/7) can add `RenderSprite`s to it from outside this class, without
`ViewportWidget` needing to know anything about `GameObject` or
`AnimationClip` itself — it only knows how to update, draw, and display
*whatever* is in its group, exactly the separation of concerns Lesson 6's
design decision aimed for.

**`self.sprites.update(dt)`** / **`self.sprites.draw(self.surface)`**
Lesson 6's `Group` methods, called every tick instead of once — this is
the entire "batched many-objects" payoff arriving for real: however many
`RenderSprite`s eventually populate this group, these two lines don't
change.

### Why this design?
```
design_decision:
  problem: "how does the editor's live game-preview actually get embedded into one panel of the Qt shell, given the two frameworks' conflicting assumptions about owning a window and an event loop?"
  available_choices:
    - "run pygame in a separate process/thread with its own real window, positioned to look embedded"
    - "headless pygame Surface, converted to QImage, painted via QWidget.paintEvent, driven by QTimer"
  selected_choice: "headless Surface + QImage + QTimer"
  reason: "a separate process/window can't be reliably docked, resized, or layered with other Qt panels the way a real QWidget can, and cross-process communication would add significant complexity for no benefit here"
  benefit: "the viewport behaves exactly like any other Qt widget — dockable, resizable, layered with the Scene Tree/Inspector — because it genuinely is one"
  cost: "a per-frame CPU cost for the Surface→bytes→QImage conversion, and the format-matching discipline from Section 6's trap, on every single frame"
  future_revisit_condition: "if profiling (Phase 8) shows the per-frame conversion is a bottleneck at higher resolutions/frame rates, revisit using a shared memory buffer or a different Qt image format to avoid a full byte copy every tick"
```

---

## 8. Exercise

**Predict:** If `self.timer.start(16)` were changed to `self.timer.start(200)`
(a tick roughly every 1/5 second), what would you expect to happen to the
*smoothness* of any animation playing through `RenderSprite`/`AnimationClip`
— and, separately, would `AnimationClip`'s own timing (Lesson 5, driven by
real elapsed `dt`) still be *correct*, just choppier? Reason from Lesson
5's delta-time mechanism, not just intuition.

**Modify:** Add a second `pygame.draw.rect` call inside `_on_tick`,
drawing a small marker that moves independently of the circle example
from Section 4. Confirm both animate correctly in the same widget,
confirming `paintEvent` genuinely doesn't care how many things were drawn
into `self.surface` before it runs.

**Break:** Deliberately reintroduce Section 6's trap — mismatch the format
string and the `QImage` format enum — in the real `ViewportWidget` from
Section 7 (which uses `SRCALPHA` + RGBA throughout). Predict what you'll
see given that *both* sides now expect 4-byte pixels, just interpreted
with different channel orders, before running it. Is the failure mode the
same "sheared image" as Section 6's original example, or different — and
why, given the byte-count now actually matches?

**Trace:** Write out, in order, every event-loop-driven call that happens
between "16 milliseconds pass" and "new pixels are visible on screen,"
naming which object emits or handles each step (`QTimer` → ? → ? → ...).
Use Section 4 and Section 5's explanations as your source, not guesswork.

---

## What to remember
1. `SDL_VIDEODRIVER=dummy`, set before `import pygame`, lets pygame satisfy its own API requirements (like needing a display mode for `convert_alpha()`) without ever opening a real, visible second window.
2. A pygame `Surface` doesn't have to be "the screen" — it's just a pixel buffer, which is exactly what makes rendering into an off-screen one, then handing its pixels to Qt, possible.
3. `pygame.image.tostring(...)`'s format string and `QImage(...)`'s format enum must be chosen as a matching pair every time — nothing enforces this for you, and a mismatch produces wrong colors with no error.
4. `QTimer` replaces pygame's own `while running:` loop entirely — there is exactly one event loop in this program (Qt's), and pygame's per-frame work happens inside a callback that loop invokes.
5. `QWidget.update()` schedules a repaint for later; it does not paint immediately — actual drawing only happens inside `paintEvent`, called back by Qt's event loop.

## Next lesson
Lesson 8 covers the Command pattern and `QUndoStack` (Phase 5) — now that
the viewport is live, the next real editor feature is making changes to a
`GameObject` (like moving it) undoable, which the Inspector panel (Phase 7)
will depend on being in place before it lets you edit anything.
