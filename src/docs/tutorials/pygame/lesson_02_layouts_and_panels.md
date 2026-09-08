# Lesson 2 — Layouts, Splitters, and the Panel Skeleton

## What you'll learn
- Why `QMainWindow` can only ever have **one** central widget, and how layouts solve that
- The difference between a *layout* (arranges widgets) and a *widget* (a thing on screen)
- Qt's parent-child ownership model — and a real trap it causes if you don't understand it
- How to build Forge's actual three-panel skeleton: Scene Tree | Viewport | Inspector

## What you'll build
The real panel skeleton of the editor — three empty-but-real regions,
resizable by dragging the boundary between them, exactly like Godot's or
Blender's window layout (minus the content, which comes in later phases).

## The question
`window.setCentralWidget(...)` — the one method `QMainWindow` gives you for
putting content in the middle of the window — takes exactly **one** widget
argument. Forge needs three side-by-side regions in that same space. How do
you put three things where the API only accepts one?

---

## 1. Predict

Before reading on: what do you think happens if you call
`window.setCentralWidget(widget_a)` and then, later in the same function,
call `window.setCentralWidget(widget_b)`? Does the window now show both?
Does it error? Form a guess.

---

## 2. Try it

```python
from PySide6.QtWidgets import QWidget, QHBoxLayout, QLabel

def build_panels() -> QWidget:
    container = QWidget()
    layout = QHBoxLayout(container)

    layout.addWidget(QLabel("Scene Tree"))
    layout.addWidget(QLabel("Viewport"))
    layout.addWidget(QLabel("Inspector"))

    return container
```

Wire it into last lesson's `main()` by replacing the plain `window.show()`
block with:

```python
window.setCentralWidget(build_panels())
window.show()
```

Run it. You'll see one window, divided into three equal vertical strips,
each labeled. Resize the window — the three strips resize with it.

### What this code does (mechanical explanation)

**`def build_panels() -> QWidget:`**
A plain function, type-hinted to return a `QWidget`. Nothing Qt-specific
about the `def` itself — but note that `QLabel`, `QHBoxLayout`, and the
`container` you're about to build are all *subclasses of* `QWidget`
somewhere in their inheritance chain. `-> QWidget` is honest, not vague:
Qt's own class hierarchy makes "returns a QWidget" a real, checkable
promise.

**`container = QWidget()`**
`QWidget` is Qt's base class for *anything visible*. On its own, an empty
`QWidget` is just a blank rectangle. Here it exists purely to **hold a
layout** — it's the thing `setCentralWidget` will eventually receive, since
that method needs exactly one widget, not a layout directly.

**`layout = QHBoxLayout(container)`**
This is the line that answers this lesson's core question, and it does two
things at once, which is easy to misread:
1. It constructs a `QHBoxLayout` — a Qt object whose entire job is to
   compute *where child widgets go* (arranged left-to-right, hence "H") and
   *recompute that arrangement whenever the available space changes*.
2. Passing `container` as the constructor argument **immediately installs
   this layout onto that widget** — equivalent to calling
   `container.setLayout(layout)` separately. After this line, `container`
   and `layout` are linked: any widget you add to `layout` will visually
   appear *inside* `container`.

A layout is not a widget and has no appearance of its own — it's a
*geometry manager*. This is the conceptual split to hold onto: `QWidget` =
a visible thing; `QHBoxLayout` = a rule for arranging visible things.

**`layout.addWidget(QLabel("Scene Tree"))`** (×3)
`QLabel(text)` constructs a simple widget whose job is to display that
text. `addWidget` does two things: it makes this label a **child** of
`container` (more on this below — it's the trap for later), and it tells
the layout "include this widget in your left-to-right arrangement." Called
three times, in order, `QHBoxLayout` places them left-to-right in that
exact call order — order matters here, unlike in a `dict` or an unordered
collection.

**`return container`**
Only `container` is returned. `layout` is a local variable that goes out of
scope when the function ends. This is safe — and is the first hint of the
ownership trap in Section 3 — because `layout` was already installed onto
`container` (step 2 above); Qt's C++ side, not Python's variable scope,
is what's actually keeping it alive.

**`window.setCentralWidget(build_panels())`**
Now the "only one central widget" constraint from the top of this lesson
makes sense: you're not fighting it, you're satisfying it — by giving
`QMainWindow` exactly one widget (`container`) that *itself* contains three
others via its layout.

---

## 3. Why?

### Layout vs. widget — the mental model

```
QMainWindow
  └── central widget (exactly one — the constraint is real)
        └── QWidget "container"
              └── QHBoxLayout (invisible; a geometry rule, not a thing on screen)
                    ├── QLabel "Scene Tree"
                    ├── QLabel "Viewport"
                    └── QLabel "Inspector"
```

`setCentralWidget` was never actually a limitation — a widget can always
contain arbitrarily more widgets inside it via a layout. "One central
widget" really means "one root of a tree that can be as deep and wide as
you want."

### Parent-child ownership (the mechanism, not just the API)

When `addWidget` runs, Qt calls `label.setParent(container)` internally.
Every `QWidget` keeps track of its parent and its list of children — this
is a **C++-level object tree**, separate from (though connected to) Python's
own reference counting and garbage collection.

This matters because of what parenting *does*: **when a parent widget is
destroyed, Qt automatically destroys all of its children too**, at the C++
level, regardless of whether Python still holds a reference to them. This
is different from ordinary Python garbage collection, which only cares
about reference counts, not about a separate "widget tree."

```
behavior:
  compile_time:
    - "none — Python does not check widget parenting statically"
  runtime:
    - "addWidget() calls setParent() internally, registering the child in Qt's C++ object tree"
    - "destroying a parent widget cascades destruction to all its children, independent of Python refcounts"
```

---

## 4. Change one thing

```diff
-layout = QHBoxLayout(container)
+layout = QSplitter()
```

Full adjusted function:
```python
from PySide6.QtWidgets import QSplitter, QLabel
from PySide6.QtCore import Qt

def build_panels() -> QSplitter:
    splitter = QSplitter(Qt.Orientation.Horizontal)
    splitter.addWidget(QLabel("Scene Tree"))
    splitter.addWidget(QLabel("Viewport"))
    splitter.addWidget(QLabel("Inspector"))
    return splitter
```

Run it. Visually near-identical at first glance — but now there's a thin
drag handle between each panel, and dragging it resizes the two panels on
either side, independently of the window's own resize behavior.

### What changed
`QHBoxLayout` (a pure geometry manager, invisible, no interactivity of its
own) is replaced by `QSplitter` (a real widget — note it's returned
directly, not wrapped in a plain `QWidget` container, because `QSplitter`
*is* a widget, unlike a layout). `QSplitter` still arranges children
left-to-right like `QHBoxLayout` did, but it also draws and manages
draggable handles between them.

### What did not change
- `addWidget` is still the method used to insert each panel, in order
- The three-child, left-to-right arrangement itself
- The parent-child ownership mechanism from Section 3 — `QSplitter` still
  parents its children exactly the way `QHBoxLayout`'s container did

```
change_analysis:
  changed: "QHBoxLayout(container) → QSplitter(Qt.Orientation.Horizontal); function now returns the splitter directly"
  unchanged:
    - "addWidget-based insertion, in call order"
    - "parent-child ownership mechanics"
    - "left-to-right arrangement"
  behavioral_difference:
    - "panels are now independently resizable at runtime via drag handles"
  compiler_difference:
    - "none — Python, no compile-time distinction"
  runtime_difference:
    - "QSplitter allocates and paints handle widgets between children, and tracks drag state for them"
```

**Why `Qt.Orientation.Horizontal`, spelled out this way?**
`Qt` here is a namespace class (`PySide6.QtCore.Qt`) holding a large number
of enums Qt uses throughout the whole library — `Orientation` is one such
enum, with members `Horizontal` and `Vertical`. This is the *first enum*
you've seen used in real Qt code; Lesson 1's Phase 1 preview of `Enum` in
Python will make this pattern feel familiar rather than arbitrary when you
get there — a fixed, named set of valid choices, not a raw string or int.

---

## 5. Put it in the project

```python
# forge/editor_window.py
from PySide6.QtWidgets import QMainWindow, QSplitter, QLabel
from PySide6.QtCore import Qt


class EditorWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("Forge")
        self.resize(1000, 700)
        self.setCentralWidget(self._build_panels())

    def _build_panels(self) -> QSplitter:
        splitter = QSplitter(Qt.Orientation.Horizontal)
        splitter.addWidget(QLabel("Scene Tree"))
        splitter.addWidget(QLabel("Viewport"))
        splitter.addWidget(QLabel("Inspector"))
        return splitter
```

```python
# main.py
import sys
from PySide6.QtWidgets import QApplication
from forge.editor_window import EditorWindow


def main() -> int:
    app = QApplication(sys.argv)
    window = EditorWindow()
    window.show()
    return app.exec()


if __name__ == "__main__":
    sys.exit(main())
```

### Code walkthrough — what's new versus Section 2/4

**`class EditorWindow(QMainWindow):`**
This is the first **subclass** in the project — previously you constructed
`QMainWindow()` directly; now you're defining your *own* class that
inherits from it. Everything `QMainWindow` can do, `EditorWindow` can do
too, plus whatever you add. This is the standard Qt pattern: you virtually
never use `QMainWindow` bare in a real app — you subclass it so the window
has a well-defined home for its own setup code and, later, its own
methods and state (selection tracking, undo stack, and so on).

**`def __init__(self) -> None:`**
The constructor for `EditorWindow`. `-> None` is honest: `__init__` never
returns a meaningful value in Python (returning anything other than `None`
from `__init__` is actually a runtime `TypeError`), so the type hint states
that constraint explicitly.

**`super().__init__()`**
`super()` gives you a proxy to the parent class — here, `QMainWindow`.
Calling its `__init__()` runs `QMainWindow`'s own constructor first. This
is **not optional housekeeping** — skip this line and `QMainWindow`'s
internal C++ setup never happens, and the object will not behave like a
real window at all (methods like `setWindowTitle` would fail or misbehave,
since the underlying native window was never created). Always call
`super().__init__()` before doing anything else in a Qt subclass's
constructor.

**`self.setWindowTitle(...)`, `self.resize(...)`, `self.setCentralWidget(...)`**
These are the exact same calls from Lesson 1 and Section 2 above — the only
difference is they're now called as `self.method(...)` from inside the
class, on the instance being constructed, instead of `window.method(...)`
from outside. Same methods, same effects, different calling context.

**`self._build_panels()`**
A leading underscore is a Python **convention** (not an enforced access
control, unlike `private` in some other languages) signaling "internal to
this class, not part of its public interface." Nothing prevents code
outside `EditorWindow` from calling `_build_panels()` — Python trusts the
convention rather than policing it.

### Why this design?
```
design_decision:
  problem: "Where does window-construction code live as the editor grows dozens of setup steps?"
  available_choices:
    - "keep building the window with free functions called from main()"
    - "subclass QMainWindow and move setup into __init__"
  selected_choice: "subclass QMainWindow"
  reason: "the window needs to own growing state (selection, undo stack, open project) — a class gives that state a home; free functions don't"
  benefit: "main() stays a thin, stable entry point; all window behavior is discoverable in one class"
  cost: "one more layer of Qt/OOP convention (super().__init__()) to get right"
  future_revisit_condition: "if the window class grows too large, panel-building logic can be split into separate panel classes — which is exactly what Phase 2's remaining lessons do"
```

---

## 6. Trap

**Normal rule:** widgets added to a layout are parented to that layout's
widget, and Qt's C++ side keeps them alive for as long as their parent
lives (Section 3).

**Apparently equivalent code:**
```python
def build_panels() -> QSplitter:
    splitter = QSplitter(Qt.Orientation.Horizontal)
    label = QLabel("Viewport")
    splitter.addWidget(label)
    return splitter

# ...elsewhere...
def add_extra_button(splitter: QSplitter) -> None:
    from PySide6.QtWidgets import QPushButton
    button = QPushButton("Refresh")
    # oops — forgot to call splitter.addWidget(button)
    button.show()
```

**Surprising result:** `button.show()` may briefly flash a tiny, parentless
window, or in some environments behave inconsistently — and worse, since
`button` is a local variable with no other reference once
`add_extra_button` returns, **Python's garbage collector may destroy the
underlying widget object shortly after**, sometimes causing a crash or a
silently vanished widget, especially in larger programs where this pattern
is buried in a callback.

**Exact reason:** `button` was constructed but never given a parent
(`splitter.addWidget(button)` was skipped). With no C++-side parent to keep
it alive per Section 3's ownership tree, its lifetime is governed *only* by
Python's normal reference counting — and a variable local to a function
that has already returned has no remaining references. This is a
real-world PySide bug class, not a contrived example.

**Project consequence:** the rule going forward — **every widget you
construct must immediately either be `addWidget`'d into a layout/splitter,
or explicitly parented** (`widget.setParent(...)`), in the same breath it's
created. Forge's later panels (Phase 2 onward) will construct many small
widgets dynamically (list items, inspector rows) — this exact mistake is
the single most common source of "why did my widget disappear" bugs in Qt
codebases.

---

## 7. Exercise

**Predict:** Given `EditorWindow.__init__`, what would happen if you called
`self.setCentralWidget(self._build_panels())` **twice** in a row, with two
separate calls? Which of the two survives on screen? Use Section 3's
ownership model to reason about the one that doesn't.

**Modify:** Change the splitter's orientation to `Qt.Orientation.Vertical`.
Predict the new panel arrangement before running it.

**Break:** Remove `super().__init__()` from `EditorWindow.__init__` entirely
and run the program. Read the actual error/behavior you get. Does it match
what "the native window was never created" predicted?

**Repair:** Take the trap's `add_extra_button` function and fix it two
different ways: (1) by calling `splitter.addWidget(button)`, and (2) by
calling `button.setParent(splitter)` without adding it to the layout at
all. Run both. What's different about the button's *position* between the
two fixes, even though both keep it alive? (Hint: revisit what a layout
does versus what mere parenting does.)

---

## What to remember
1. `QMainWindow` takes one central widget — satisfy that by giving it a widget whose *layout* holds everything else.
2. A layout (`QHBoxLayout`, etc.) arranges widgets and has no appearance itself; `QSplitter` is a real widget that both arranges *and* adds draggable handles.
3. `addWidget` parents the child into Qt's own C++ object tree — a mechanism separate from Python's garbage collector, and the reason a local `layout` variable can safely go out of scope.
4. An un-parented, un-referenced widget can be garbage-collected out from under you — always parent (via a layout or `setParent`) immediately.
5. `super().__init__()` is mandatory, first, in any `QMainWindow`/`QWidget` subclass's constructor.

## Next lesson
Lesson 3 leaves Qt aside for one lesson and goes back to pure Python:
`dataclasses`. You've now built the visual shell — next you build the
*data* that shell will eventually display: a `GameObject` and `Transform`
dataclass, with JSON round-trip save/load. This is the foundation the
Inspector panel (Phase 7) will later read via reflection.
