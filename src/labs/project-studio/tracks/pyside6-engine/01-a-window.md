---
title: 1 — A Window That Stays Open
runtime: python
run: main.py
---

You're building a game-engine editor: a window with a live viewport, a scene tree, and an inspector, like Godot's. Everything starts from one problem — getting a window to exist at all, and getting it to *stay*.

Six small steps. Each one runs.

## Step 1 — Make a window exist

Every program you've written so far runs top to bottom and ends. A GUI program has to do the opposite: start, then deliberately refuse to end until someone closes it.

**Predict before you type:** this file has no loop and no `while True`. Will the window stay open, or flash and vanish?

```python file=main.py
import sys
from PySide6.QtWidgets import QApplication, QWidget

app = QApplication(sys.argv)
window = QWidget()
window.show()
sys.exit(app.exec())
```

### Why this works

- **`import sys`** — Python's standard-library module for talking to the interpreter itself. Needed twice below: for `sys.argv` and `sys.exit`.
- **`from PySide6.QtWidgets import QApplication, QWidget`** — pulls two names out of Qt's widget module. `QtWidgets` is the sub-module holding everything *visible*; `QtCore` (later) holds the non-visual machinery.
- **`app = QApplication(sys.argv)`** — constructs the one object per process that represents "this GUI program is running." It owns the event loop, the list of open windows, and process-wide settings like the default font. It takes `sys.argv` because Qt reads and strips its own command-line flags (like `-style`) before your code ever sees them. **Exactly one of these exists per program** — Qt raises an error if you build a second.
- **`window = QWidget()`** — the plainest visible thing Qt has: an empty rectangle. `QWidget` is the base class of *every* visible control; used bare like this, it's just a blank window. It takes no required arguments, but it does require a `QApplication` to already exist — construct it first and Qt errors out.
- **`window.show()`** — flips the widget's visibility flag and asks the OS to put it on screen. It returns `None`, and it does **not** block or start any loop. A widget exists as an object the moment `QWidget()` returns, but stays invisible until this call.
- **`app.exec()`** — starts Qt's event loop and hands control to it. This is a **blocking call**: the next line does not run until the loop stops, which happens when the last window closes. Its return value is an exit code (`0` on a normal close).
- **`sys.exit(...)`** — ends the process using that exit code as the real process status — what a shell's `echo $?` would show. Without wrapping it, `exec()`'s return value would just be computed and thrown away.

The answer to the prediction: it stays open. `app.exec()` is what holds it there, and nothing else in the file does.

## Step 2 — Give it a title and a size

A bare `QWidget` opens at whatever size Qt picks, with no title. Both are just method calls on the object you already have.

```python file=main.py
import sys
from PySide6.QtWidgets import QApplication, QWidget

app = QApplication(sys.argv)
window = QWidget()
window.setWindowTitle("Engine")
window.resize(400, 300)
window.show()
sys.exit(app.exec())
```

### Why this works

- **`window.setWindowTitle("Engine")`** — sets the text in the title bar. Signature `setWindowTitle(str) -> None`.
- **`window.resize(400, 300)`** — sets the widget's size in pixels, width then height. Note this takes **two separate arguments**, not a tuple — unlike pygame, which will want `(400, 300)` in a moment. Small inconsistency, easy to trip on.

Both are called **before** `show()`. That ordering is deliberate: configure the widget while it's invisible, so the user never sees an untitled, wrong-sized window flash and then correct itself.

## Step 3 — Make it your own class

Right now `window` is a stock `QWidget`. To give it behavior of its own — which the next step needs — it has to become a class you control.

**Predict:** this step changes the structure but should change *nothing* you can see. Same window, same title, same size.

```python file=main.py
import sys
from PySide6.QtWidgets import QApplication, QWidget


class Viewport(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Engine")
        self.resize(400, 300)


app = QApplication(sys.argv)
window = Viewport()
window.show()
sys.exit(app.exec())
```

### Why this works

- **`class Viewport(QWidget):`** — declares a new class that *inherits from* `QWidget`. `Viewport` now is-a widget: every method `QWidget` has, `Viewport` has too, including `show()` and `resize()`.
- **`def __init__(self):`** — the constructor, run when `Viewport()` is called. `self` is the instance being built.
- **`super().__init__()`** — calls `QWidget`'s own constructor. **This is mandatory and easy to forget**: skip it and the C++ half of the widget is never initialized, and Qt fails at the first method call with an error that won't obviously point back here.
- **`self.setWindowTitle(...)` / `self.resize(...)`** — the same two calls as Step 2, now aimed at `self` instead of an outside variable, because the object now configures itself.
- **`window = Viewport()`** — constructs your class instead of a stock `QWidget`. Everything downstream is unchanged.

Nothing visible changed, exactly as predicted. What changed is that there's now a place to put behavior — which is the whole point of the step.

## Step 4 — Paint something

A widget doesn't draw itself by magic. Qt calls a method named `paintEvent` whenever it decides the widget needs repainting: when first shown, when resized, when uncovered.

```python file=main.py
import sys
from PySide6.QtWidgets import QApplication, QWidget
from PySide6.QtGui import QPainter, QColor


class Viewport(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Engine")
        self.resize(400, 300)

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.fillRect(self.rect(), QColor(20, 20, 30))
        painter.end()


app = QApplication(sys.argv)
window = Viewport()
window.show()
sys.exit(app.exec())
```

### Why this works

- **`from PySide6.QtGui import QPainter, QColor`** — a third Qt module. `QtGui` sits between `QtCore` and `QtWidgets`: drawing, images, fonts — the visual primitives that aren't themselves controls.
- **`def paintEvent(self, event):`** — you are **overriding** a method `QWidget` already defines. Qt calls it; your code never does. The name is fixed — spell it `paintevent` and Qt silently keeps calling the base version, and you get an empty window with no error to explain why.
- **`event`** — a `QPaintEvent` describing which region needs repainting. This lesson repaints everything and ignores it; a performance-sensitive app would use it to repaint only the dirty rectangle.
- **`painter = QPainter(self)`** — a painter aimed at this widget. Qt only allows painting a widget from inside its own `paintEvent`; construct one anywhere else and Qt warns and draws nothing.
- **`self.rect()`** — the widget's own area as a `QRect`, `(0, 0, width, height)`. Using it rather than hardcoding `400, 300` means the fill still covers everything after a resize.
- **`QColor(20, 20, 30)`** — red, green, blue, each 0–255. A very dark blue-grey.
- **`painter.end()`** — finishes the painting operation explicitly rather than leaving it to garbage collection.

## Step 5 — Bring in pygame, off to the side

Here's the thing that makes this project interesting: pygame is normally *both* a drawing library and a window-and-event-loop library. You only want the first half. A `pygame.Surface` is just a block of pixels in memory — it is **not** a window and doesn't need one.

This step creates that surface and proves it exists. The window still looks identical.

```python file=main.py
import sys
import pygame
from PySide6.QtWidgets import QApplication, QWidget
from PySide6.QtGui import QPainter, QColor

pygame.init()
surface = pygame.Surface((400, 300))
surface.fill((30, 20, 40))
print("surface size:", surface.get_size())


class Viewport(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Engine")
        self.resize(400, 300)

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.fillRect(self.rect(), QColor(20, 20, 30))
        painter.end()


app = QApplication(sys.argv)
window = Viewport()
window.show()
sys.exit(app.exec())
```

### Why this works

- **`pygame.init()`** — starts up pygame's subsystems. Safe to call even though we'll never open a pygame window.
- **`pygame.Surface((400, 300))`** — allocates memory for 400×300 pixels and returns an object wrapping it. Takes a **single `(width, height)` tuple** — compare `window.resize(400, 300)` above, which takes two arguments. No window is created, nothing is registered with the OS; this is pure memory allocation.
- **`surface.fill((30, 20, 40))`** — overwrites every pixel with one RGB colour, given as a tuple.
- **`print("surface size:", ...)`** — proof of life. Watch the Output pane below the editor: the surface is real, holding real pixels, while the window on screen is still being painted entirely by Qt.

**Note what did *not* happen:** no second window appeared. That's the whole reason we use `pygame.Surface(...)` and never `pygame.display.set_mode(...)` — that other call asks the OS for a real window, and would give you a stray second one sitting next to your Qt window. It never appears anywhere in this project.

## Step 6 — Put pygame's pixels on the Qt window

Now connect the two halves: take the surface's raw bytes, wrap them in Qt's own image type, and paint that instead of the flat colour.

```python file=main.py
import sys
import pygame
from PySide6.QtWidgets import QApplication, QWidget
from PySide6.QtGui import QPainter, QImage

pygame.init()
surface = pygame.Surface((400, 300))


class Viewport(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Engine")
        self.resize(400, 300)

    def paintEvent(self, event):
        surface.fill((20, 20, 30))
        pygame.draw.circle(surface, (255, 100, 50), (200, 150), 40)

        w, h = surface.get_size()
        data = pygame.image.tostring(surface, "RGB")
        image = QImage(data, w, h, QImage.Format.Format_RGB888)

        painter = QPainter(self)
        painter.drawImage(0, 0, image)
        painter.end()


app = QApplication(sys.argv)
window = Viewport()
window.show()
sys.exit(app.exec())
```

### Why this works

- **`pygame.draw.circle(surface, (255, 100, 50), (200, 150), 40)`** — writes a filled circle's pixels straight into the surface's memory: target surface, RGB colour, `(x, y)` centre, radius. It returns a `Rect` of the area it touched, which we don't need.
- **`pygame.image.tostring(surface, "RGB")`** — reads every pixel out as one `bytes` object: three bytes per pixel, red-green-blue, row by row from the top. The `"RGB"` is a **format specifier**, not a filename — pygame surfaces can hold pixels in several internal layouts, and this pins down exactly which one comes out.
- **`QImage(data, w, h, QImage.Format.Format_RGB888)`** — wraps those bytes as a Qt image with no decoding step (this isn't loading a PNG; it's saying "these bytes already *are* pixels, laid out like this"). `Format_RGB888` means 3 bytes per pixel, RGB order, no alpha, no padding — **it must match `tostring`'s `"RGB"` exactly.** Mismatch them (say `"RGBA"` against `RGB888`) and Qt starts reading each pixel one byte early: you get a diagonal, colour-shifted smear rather than any kind of error.
- **`painter.drawImage(0, 0, image)`** — copies the whole image onto the widget at position `(0, 0)`. This is the line that finally makes pygame's work visible.

Note `QColor` is gone from the imports — nothing uses it now that pygame fills the background. The whole `paintEvent` runs fresh every repaint: clear the surface, draw on it, convert, blit.

That's the bridge. Everything from here — sprites, tile maps, a scene tree, an inspector panel — is built on exactly this: pygame draws into memory, Qt puts memory on screen.
