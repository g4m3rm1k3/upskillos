# Lesson 9 — The Spritesheet Import Tool: `QGraphicsView` and Coordinate Mapping

## What you'll learn
- The difference between **scene coordinates** and **view coordinates** in Qt's Graphics View framework — and why that distinction exists at all
- How to convert a mouse click's pixel position into "where in the image did they actually click," correctly, regardless of zoom or scrolling
- A genuine, easy-to-miss trap: `pygame.Rect` silently truncates floats to integers, which can misalign frames sliced from user-drawn selections
- How to replace Lesson 5's hardcoded `frame_w`/`frame_h` with frame rectangles the user defines by dragging

## What you'll build
`FrameImportView` — a widget showing a loaded spritesheet, where dragging
the mouse draws a rectangle that becomes a frame boundary, producing real
`pygame.Rect` objects Lesson 5's `slice_sheet` can eventually consume
instead of assuming a fixed grid.

## The question
Lesson 5 assumed every frame was exactly `32×32` pixels, side by side.
Real spritesheets are irregular — different frame sizes, gaps, sheets the
user didn't create themselves. The user needs to *show* the editor where
each frame is by dragging a box over it. A mouse click, though, only gives
you "this many pixels from the top-left of the widget" — how does that
become "this pixel of the actual image," especially once the image can be
scrolled or zoomed independently of the widget's own size?

---

## 1. Predict

Suppose a spritesheet image is displayed inside a scrollable, zoomable
view, currently zoomed in to 200% and scrolled down somewhat. The user
clicks at pixel `(50, 50)` measured from the top-left corner of the
*widget itself*. Do you expect that to correspond to pixel `(50, 50)` of
the *original image file*? Why or why not, given zoom and scrolling are
both in play?

---

## 2. Try it

```python
import sys
from PySide6.QtWidgets import QApplication, QGraphicsView, QGraphicsScene, QGraphicsPixmapItem
from PySide6.QtGui import QPixmap
from PySide6.QtCore import Qt


class SheetView(QGraphicsView):
    def __init__(self, image_path: str):
        scene = QGraphicsScene()
        super().__init__(scene)
        pixmap = QPixmap(image_path)
        scene.addItem(QGraphicsPixmapItem(pixmap))
        scene.setSceneRect(0, 0, pixmap.width(), pixmap.height())

    def mousePressEvent(self, event) -> None:
        scene_pos = self.mapToScene(event.pos())
        print(f"clicked at scene position: {scene_pos.x():.1f}, {scene_pos.y():.1f}")


app = QApplication(sys.argv)
view = SheetView("assets/walk_sheet.png")
view.resize(500, 400)
view.show()
sys.exit(app.exec())
```

Click anywhere on the displayed image, then try scrolling or zooming
(Ctrl+scroll doesn't work yet — you'll add it in Section 4) and clicking
again. The printed coordinates track the *image*, not the widget.

### What this code does (mechanical explanation)

**`class SheetView(QGraphicsView):`**
`QGraphicsView` inherits toward `QWidget`, same as every widget so far —
but it's a specialized one: it exists specifically to *display* a
`QGraphicsScene`, which is a separate object holding a collection of items
with their own coordinate system.

**`scene = QGraphicsScene()`**
A `QGraphicsScene` is a coordinate space and a container for graphical
items — it has no size on screen by itself, and no widget-like existence;
it's a pure data/coordinate model, conceptually similar to how Lesson 4's
pygame `Surface` was "just pixels in memory" independent of any window
showing it.

**`super().__init__(scene)`**
Associates this specific `QGraphicsView` with that scene. **Multiple
views can display the same scene simultaneously**, each with its own
independent zoom and scroll position — this is *why* scene coordinates and
view coordinates have to be two genuinely separate systems: "pixel 50 of
the scene" must mean the same thing regardless of which view, at which
zoom level, is currently looking at it.

**`pixmap = QPixmap(image_path)`**
`QPixmap` is Qt's own image class, optimized for on-screen display
(distinct from `QImage`, which Lesson 7 used because it's optimized for
pixel-data manipulation — `QPixmap` and `QImage` can convert to each other,
but here you're just displaying a file, so `QPixmap` loaded directly from
disk is the simpler, correct tool).

**`scene.addItem(QGraphicsPixmapItem(pixmap))`**
`QGraphicsPixmapItem` wraps a `QPixmap` as something a `QGraphicsScene` can
contain and position. `addItem` places it into the scene at the scene's
own default origin, `(0, 0)`, by default.

**`scene.setSceneRect(0, 0, pixmap.width(), pixmap.height())`**
Explicitly tells the scene its own coordinate bounds match the image's
actual pixel dimensions. Without this, the scene's coordinate space would
be inferred loosely from its contents' bounding box, which can produce
surprising scroll-bar behavior; setting it explicitly, matching the image
exactly, means **scene coordinate `(x, y)` corresponds exactly to pixel
`(x, y)` of the original image** — the single fact this entire lesson
depends on.

**`def mousePressEvent(self, event) -> None:`**
Another Qt virtual-method override, the same mechanism as Lesson 7's
`paintEvent` — Qt calls this automatically whenever a mouse button is
pressed while this widget has focus, passing a `QMouseEvent` describing
the click.

**`self.mapToScene(event.pos())`**
This is the answer to Section 1's prediction. `event.pos()` gives the
click position in **view coordinates** — pixels measured from this
specific widget's own top-left corner, exactly like every mouse/paint
coordinate you've worked with so far. `mapToScene(...)` is a method
`QGraphicsView` provides specifically to convert a view-coordinate point
into the corresponding **scene coordinate**, correctly accounting for
whatever this view's current zoom level and scroll position happen to be
— internally, it applies the view's own transform matrix (built from
scrolling/zooming) in reverse. This is exactly why zooming and scrolling
between clicks (as suggested in the instructions above) doesn't break the
printed coordinates: the same physical spot on the *image* always maps to
the same scene coordinate, no matter how the view is currently looking at
it.

---

## 3. Why?

### Two coordinate systems, and why both must exist

```
View coordinates:
  origin = this specific QGraphicsView widget's own top-left corner
  changes meaning if the widget is resized
  (0,0) here has nothing to do with where the image actually is on screen
  once scrolling/zooming are involved

Scene coordinates:
  origin = the QGraphicsScene's own coordinate space (set via setSceneRect)
  independent of any view's zoom or scroll position
  (0,0) here corresponds to a fixed point — in this lesson's setup,
  exactly the top-left pixel of the loaded image, always

mapToScene(view_point) → scene_point   (view → scene, accounting for zoom/scroll)
mapFromScene(scene_point) → view_point  (the reverse direction)
```

This is directly analogous to a distinction you've already learned twice:
Lesson 4's pygame `Surface` coordinates (independent of whether/how a
`Surface` is shown), and Lesson 7's pygame-Surface-vs-Qt-widget pixel
spaces. The pattern recurring across three different contexts is the same
underlying idea: **"where something is in its own coordinate system" and
"where it currently appears on screen" are not the same fact**, and
whenever a display can be scrolled, zoomed, resized, or is one of several
views onto the same data, that distinction becomes load-bearing rather
than academic.

---

## 4. Change one thing — adding zoom, to prove the mapping is correct

```diff
 class SheetView(QGraphicsView):
     def __init__(self, image_path: str):
         scene = QGraphicsScene()
         super().__init__(scene)
         pixmap = QPixmap(image_path)
         scene.addItem(QGraphicsPixmapItem(pixmap))
         scene.setSceneRect(0, 0, pixmap.width(), pixmap.height())
+        self.scale(2.0, 2.0)

     def mousePressEvent(self, event) -> None:
         scene_pos = self.mapToScene(event.pos())
         print(f"clicked at scene position: {scene_pos.x():.1f}, {scene_pos.y():.1f}")
```

### What changed
`self.scale(2.0, 2.0)` doubles the view's zoom, making the image appear
twice as large on screen.

### What did not change
`mousePressEvent`'s logic — not one character of it changed.

```
change_analysis:
  changed: "added self.scale(2.0, 2.0) in __init__"
  unchanged:
    - "mousePressEvent and its use of mapToScene"
    - "scene setup and sceneRect"
  behavioral_difference:
    - "the image visually appears twice as large; clicking the same physical spot on the enlarged image still reports the same underlying scene coordinate as it did unzoomed"
  compiler_difference:
    - "none"
  runtime_difference:
    - "QGraphicsView now applies an internal 2x transform when rendering the scene and when mapToScene/mapFromScene convert between coordinate spaces — mapToScene handles this automatically without any change to your own code"
```

**Why this matters for the actual lesson:** this is proof, not just
assertion, that `mapToScene` is doing real work — the exact same
`event.pos()` value at the exact same physical screen location now
corresponds to a *different* view-coordinate number (because the widget
"sees" more zoomed-in pixels for the same physical click point) but
`mapToScene` still correctly resolves it back to the same underlying image
pixel, because the scene coordinate space itself never changed — only how
this one view happens to be looking at it.

---

## 5. Put it in the project

```python
# forge/frame_import_view.py
from PySide6.QtWidgets import QGraphicsView, QGraphicsScene, QGraphicsPixmapItem, QGraphicsRectItem
from PySide6.QtGui import QPixmap, QPen, QColor
from PySide6.QtCore import Qt, QRectF, Signal
import pygame


class FrameImportView(QGraphicsView):
    frame_defined = Signal(object)  # emits a pygame.Rect

    def __init__(self, image_path: str):
        self.scene = QGraphicsScene()
        super().__init__(self.scene)
        pixmap = QPixmap(image_path)
        self.scene.addItem(QGraphicsPixmapItem(pixmap))
        self.scene.setSceneRect(0, 0, pixmap.width(), pixmap.height())

        self._drag_start = None
        self._preview_rect: QGraphicsRectItem | None = None

    def mousePressEvent(self, event) -> None:
        self._drag_start = self.mapToScene(event.pos())
        pen = QPen(QColor(255, 255, 0))
        self._preview_rect = self.scene.addRect(QRectF(), pen)

    def mouseMoveEvent(self, event) -> None:
        if self._drag_start is None or self._preview_rect is None:
            return
        current = self.mapToScene(event.pos())
        rect = QRectF(self._drag_start, current).normalized()
        self._preview_rect.setRect(rect)

    def mouseReleaseEvent(self, event) -> None:
        if self._preview_rect is None:
            return
        rect = self._preview_rect.rect()
        frame_rect = pygame.Rect(
            round(rect.x()), round(rect.y()),
            round(rect.width()), round(rect.height()),
        )
        self.frame_defined.emit(frame_rect)
        self._drag_start = None
        self._preview_rect = None
```

### Code walkthrough — what's new versus Sections 2/4

**`frame_defined = Signal(object)`**
A **custom Qt signal**, defined at class level — this is new: Lesson 7
*connected to* an existing signal (`QTimer.timeout`); here you're
*declaring your own*. `Signal(object)` means this signal, when emitted,
carries one argument of any Python object type — used here to pass along
a `pygame.Rect`. Anything elsewhere in the editor (Phase 6's frame list,
eventually) can `frame_import_view.frame_defined.connect(some_handler)`
without `FrameImportView` needing to know anything about who's listening —
the same decoupling principle Lesson 6 argued for between `GameObject` and
`RenderSprite`, now showing up as Qt's own idiomatic mechanism for it.

**`self._drag_start = None`** / **three separate event overrides**
A drag gesture spans three events, not one: `mousePressEvent` (drag
begins — record the start point, in scene coordinates), `mouseMoveEvent`
(drag continues — update a live preview rectangle), `mouseReleaseEvent`
(drag ends — finalize and emit the result). This three-event pattern for
"click and drag" recurs constantly in GUI programming and is worth
recognizing as its own idiom, distinct from a single click.

**`QRectF(self._drag_start, current).normalized()`**
`QRectF` (the floating-point cousin of `QRect`) constructed from two
`QPointF`s directly builds the rectangle spanning them. `.normalized()`
matters because a user can drag in *any* direction — up-left, down-right,
etc. — and `QRectF(pointA, pointB)` alone could otherwise describe a
rectangle with a negative width or height depending on drag direction;
`.normalized()` returns an equivalent rectangle guaranteed to have
non-negative width/height, with the top-left corner genuinely being the
top-left, regardless of which direction the user actually dragged.

**`self._preview_rect.setRect(rect)`**
Updates the on-screen preview rectangle's geometry live, every mouse-move
event during the drag — this is what makes the selection box visibly grow
and shrink as the user drags, rather than only appearing once, after the
fact, on release.

### Why this design?
```
design_decision:
  problem: "how does frame-boundary data get from 'user dragging in a Qt widget' to 'something Lesson 5's pygame-based slicing code can use'?"
  available_choices:
    - "have FrameImportView directly call into pygame/animation code itself"
    - "FrameImportView only knows how to produce a pygame.Rect and emit a signal; something else decides what to do with it"
  selected_choice: "signal-based decoupling"
  reason: "FrameImportView's job is purely 'let the user define a rectangle over an image' — it has no business knowing about AnimationClip, GameObject, or how frames get stored, mirroring the RenderSprite adapter boundary from Lesson 6"
  benefit: "the same widget could be reused for any future feature needing 'let the user draw a rectangle over an image' without modification"
  cost: "an extra signal/connect step for whoever consumes frame_defined, instead of a direct function call"
  future_revisit_condition: "if multiple simultaneous frame rectangles need to be visible/editable at once (rather than one at a time), this single-preview-rect approach needs to become a list of persistent QGraphicsRectItems, one per defined frame"
```

---

## 6. Trap

**Normal rule:** scene coordinates from `mapToScene` correspond exactly to
image pixel positions (Section 3), because `setSceneRect` was set to match
the image's own pixel dimensions exactly.

**Apparently equivalent code** — passing those coordinates straight into a
`pygame.Rect`, since they already "are" the right pixel positions:

```python
rect = self._preview_rect.rect()   # a QRectF — x/y/width/height are floats
frame_rect = pygame.Rect(rect.x(), rect.y(), rect.width(), rect.height())
```

**Surprising result:** frames sliced using rectangles built this way can
end up misaligned by a pixel here and there — most noticeably, an
animation that should loop seamlessly shows a faint, flickering seam, or
adjacent frames sliced from a tightly-packed sheet very slightly overlap
or gap, in a way that's hard to spot from reading the code but easy to see
once the animation is playing.

**Exact reason:** `pygame.Rect`'s constructor **accepts floats without
complaint, and silently truncates each one toward zero** when storing
them — a `pygame.Rect` always stores integer coordinates internally, with
no warning or error when you hand it floats. A drag ending at scene
position `x = 47.8` becomes `Rect(x=47, ...)`, not `48` — truncation, not
rounding. Two adjacent, carefully-aligned drags — one ending at `47.8` and
the next beginning at `47.9` — could truncate to the *same* starting pixel,
`47`, silently overlapping by a pixel, or could each round differently
enough to leave a one-pixel gap, depending on the exact fractional values
involved — and nothing in `pygame.Rect`'s API surfaces this happening.

**Project consequence:** the working version in Section 5 uses `round(...)`
explicitly on every value before constructing the `pygame.Rect` — `round()`
rounds to the *nearest* integer (so `47.8` becomes `48`, not `47`),
which is a deliberate, considered choice, not merely "make the error go
away." **Whenever floating-point scene/view coordinates are converted into
a `pygame.Rect` (or any integer-pixel structure), the rounding must be
explicit and intentional** — relying on `pygame.Rect`'s silent truncation
is exactly the mistake that produces the seam/overlap bug described above,
and it will not raise an exception to tell you it happened.

---

## 7. Exercise

**Predict:** Given `QRectF(self._drag_start, current).normalized()`, if a
user drags from `(200, 150)` to `(50, 30)` — up and to the left — what
would the *unnormalized* rectangle's `width()` and `height()` be (hint:
consider what "second point minus first point" produces for each
dimension), and what does `.normalized()` correct about that?

**Modify:** Add a minimum-size guard in `mouseReleaseEvent`: if the
finalized `rect`'s width or height, in scene coordinates, is less than 4
pixels, don't emit `frame_defined` at all (treat it as an accidental
click, not a real frame). Where exactly should this check go, relative to
the `round(...)` calls already there?

**Break:** Replace every `round(...)` in `mouseReleaseEvent` with plain
`int(...)` instead, then manually construct a drag (in your head or by
testing) starting at scene position `x = 10.9`. What does `int(10.9)`
produce, versus `round(10.9)`? Which one matches what a user visually
positioned their drag over, more often — and why does `int()`'s
truncate-toward-zero behavior on an already-fractional value compound the
exact silent-truncation problem the Trap section describes, rather than
fixing it?

**Trace:** Write out, in order, which coordinate space each value lives in
at each step of a single drag: `event.pos()` in `mousePressEvent`
→ `self._drag_start` → `event.pos()` in `mouseMoveEvent` → `current` →
the `QRectF` passed to `setRect` → the final `pygame.Rect` emitted. Label
each as "view coordinates" or "scene coordinates," and identify the one
line in the whole class where the conversion between the two actually
happens.

---

## What to remember
1. `QGraphicsScene` coordinates are independent of any particular `QGraphicsView`'s zoom/scroll; `mapToScene`/`mapFromScene` convert between a specific view's pixel coordinates and the scene's own coordinate space.
2. `setSceneRect` matching the loaded image's exact pixel dimensions is what makes scene coordinates directly equal to image pixel positions — this is a deliberate setup choice, not automatic.
3. A drag gesture is three separate events (`mousePressEvent`/`mouseMoveEvent`/`mouseReleaseEvent`), not one — recognize this as its own recurring GUI idiom.
4. `.normalized()` on a `QRectF` built from two arbitrary points guarantees non-negative width/height regardless of drag direction.
5. `pygame.Rect` silently truncates float arguments toward zero — always round explicitly and intentionally before constructing one from floating-point coordinates.

## Next lesson
Lesson 10 builds the playback/timeline half of Phase 6: taking the list of
`pygame.Rect`s this lesson's tool produces, constructing a real
`AnimationClip` (Lesson 5) from them, and adding a scrubbable timeline
widget so the user can preview and adjust frame timing interactively.
