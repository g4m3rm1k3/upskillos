# Lesson 1 — Your First PySide6 Window (The Editor Shell Begins)

## What you'll learn
- What `QApplication`, `QMainWindow`, and `app.exec()` actually are and do
- Why Qt (and PySide6) needs an "event loop" at all
- How to read a Qt program construct-by-construct, not just paste one
- Enough to explain *why* this four-line program is the seed of the entire editor

## What you'll build
`main.py` — a blank, resizable, titled desktop window. It does nothing yet.
That's correct. Every dock, panel, and viewport in Forge will hang off this
exact object.

## The question
Godot, Blender, VS Code — every one of these is "just" a window that stays
alive, keeps redrawing itself, and reacts to your clicks, until you tell it
to close. How does a program *stay alive* like that, instead of running top
to bottom and exiting the way your basic Python scripts have so far?

---

## 1. Predict

Before you run anything: a normal Python script executes its statements once
and exits. A GUI program has to sit there, indefinitely, waiting for you to
click something. What do you think has to be different about *how* a GUI
program is structured, compared to a script that just runs top-to-bottom and
finishes?

(No wrong answer here — just form a guess. We'll come back to it.)

---

## 2. Try it

Install PySide6 first if you haven't:
```
pip install PySide6
```

```python
import sys
from PySide6.QtWidgets import QApplication, QMainWindow

app = QApplication(sys.argv)

window = QMainWindow()
window.setWindowTitle("Forge")
window.resize(1000, 700)
window.show()

sys.exit(app.exec())
```

Run it. A window titled "Forge" appears, resizable, and stays open until you
close it.

### What this code does (mechanical explanation)

**`import sys`**
`sys` is Python's standard-library module for interpreter- and
process-level things — command-line arguments, exiting with a status code.
We only use two things from it here: `sys.argv` and `sys.exit`.

**`from PySide6.QtWidgets import QApplication, QMainWindow`**
This attaches to `PySide6.QtWidgets`, a submodule of the PySide6 package, and
pulls two names out of it directly into this file's namespace. `QApplication`
and `QMainWindow` are classes, not functions — capitalized-CamelCase is Qt's
own naming convention for classes, carried over from C++ (PySide6 is a
Python binding over the C++ Qt library).

**`app = QApplication(sys.argv)`**
This constructs one `QApplication` object and binds it to the name `app`.
`sys.argv` — the list of command-line arguments your script was invoked
with — is passed in because Qt itself understands certain command-line
flags (things like `-style` for the widget theme). You're not using any of
those flags today, but the constructor still expects the list.
*Why this matters at runtime:* `QApplication` isn't just an object — its
constructor does real work: it initializes Qt's internal event system,
loads the platform's native windowing backend, and sets up things like the
system font and screen information. **Exactly one `QApplication` may exist
per process.** Constructing a second one is an error. This is the first
place where Qt code differs from "just another class" — the constructor has
global, singleton-like side effects on the process itself.

**`window = QMainWindow()`**
`QMainWindow` is a Qt class specifically meant to be a top-level application
window with built-in support for a menu bar, toolbars, dock widgets, and a
status bar — all things Forge's editor shell will use starting in Phase 2.
Right now none of that is populated, so what you see is just a blank frame.
Calling it with no arguments constructs it with defaults; a `QMainWindow` is
valid to construct at any time *after* `QApplication` exists, but not
before — the underlying windowing system has to already be initialized.

**`window.setWindowTitle("Forge")`**
A plain method call. `setWindowTitle` is a **setter method**, not a Python
property — Qt's own convention (again inherited from C++) is
`setX(...)`/`x()` pairs rather than Python's `@property` pattern, which
you'll meet properly in Lesson 3. It mutates the window's internal title
string; nothing appears on screen yet because the window hasn't been shown.

**`window.resize(1000, 700)`**
Sets the window's width and height in logical pixels *before* it's shown.
Order matters here only in the sense that these are just attribute
mutations on an object that doesn't exist on-screen yet — you could call
`resize` after `show()` too, and the window would visibly resize.

**`window.show()`**
This is the line that actually causes the operating system to allocate and
display a native window. Before this call, `window` was a fully valid
Python/Qt object living in memory, but invisible — nothing had told the
platform's window manager about it. `show()` is a request to the underlying
platform (Windows/macOS/X11/Wayland) to make the window visible and paint it
for the first time.

**`sys.exit(app.exec())`**
This is the line that answers your Prediction question, and it's the one
line in this file that behaves completely differently from ordinary script
code — see the next section.

---

## 3. Why?

### The event loop — the actual mental model

A script you've written before runs like this:

```
statement 1 → statement 2 → statement 3 → done, process exits
```

`app.exec()` does not follow that model. When you call it, **Python's
interpreter transfers control into Qt's C++ event loop**, and — this is the
important part — **`app.exec()` does not return** until the application is
told to quit (e.g., the window is closed). While it's "blocked" there, Qt is
continuously doing something like this, forever, many times per second:

```
1. Wait for something to happen (mouse click, key press, window resize,
   timer tick, redraw request — an "event")
2. When an event arrives, dispatch it to the relevant Qt object
3. That object's code runs, possibly changing state or the screen
4. Go back to step 1
```

That loop *is* "the program running." Nothing after `sys.exit(app.exec())`
executes until the loop ends — which is why your prediction should have
included something like "there has to be a way for the program to wait
indefinitely without exiting." `app.exec()` is that mechanism.

`app.exec()` returns an integer exit code once the loop ends (0 normally
means clean exit). `sys.exit(...)` then terminates the Python process using
that same code — this is how a GUI program's exit status gets reported to
your shell/OS correctly, exactly like a command-line tool's return code.

### Mental model (compact)

```
QApplication(...)   → one-time process-wide Qt setup (must exist first)
QMainWindow()        → a window object exists in memory (invisible)
.show()              → OS is told to display it
app.exec()           → hand control to Qt's event loop; blocks here
                       ...forever, reacting to events...
(window closed)      → loop ends, returns exit code
sys.exit(code)       → Python process ends with that code
```

Every widget you add in later lessons — docks, menus, the pygame viewport —
gets *events dispatched to it* by this same loop. Nothing changes about the
loop itself; you're just adding more objects for it to route events to.

---

## 4. Change one thing

```diff
-window.resize(1000, 700)
+window.resize(1000, 700)
+window.setWindowOpacity(0.85)
```

### What changed
One line added: `window.setWindowOpacity(0.85)`, a setter that takes a float
from `0.0` (fully transparent) to `1.0` (fully opaque) and applies it to the
*entire* window surface, including any future contents.

### What did not change
- `QApplication` construction and `sys.argv` handling — untouched
- The event loop mechanics (`app.exec()`) — untouched; opacity is a paint
  property, not something that affects event dispatch
- `setWindowTitle`, `resize`, `show()` — all still execute in the same order

```
change_analysis:
  changed: "added window.setWindowOpacity(0.85)"
  unchanged:
    - "QApplication construction"
    - "window title and size setup"
    - "the show()/exec() sequence"
  behavioral_difference:
    - "the window and everything drawn inside it is now semi-transparent"
  compiler_difference:
    - "none — Python is not compiled; no meaningfully different bytecode shape"
  runtime_difference:
    - "the platform's window compositor now blends this window with what's behind it on every repaint"
```

This is a throwaway change (you won't want a semi-transparent editor!) —
its only purpose is to show you that Qt's window object exposes dozens of
independent setter methods like this, and none of them touch the event-loop
machinery you just learned. That separation — "properties of a window" vs.
"the loop that drives all windows" — is worth having crisp before Phase 2.

You can remove `setWindowOpacity` now; it's not part of the real project.

---

## 5. Put it in the project

Create the real project skeleton this lesson's code belongs in:

```
forge/
├── main.py
└── forge/
    └── __init__.py
```

```python
# main.py
import sys
from PySide6.QtWidgets import QApplication, QMainWindow


def main() -> int:
    app = QApplication(sys.argv)

    window = QMainWindow()
    window.setWindowTitle("Forge")
    window.resize(1000, 700)
    window.show()

    return app.exec()


if __name__ == "__main__":
    sys.exit(main())
```

### Code walkthrough — what's new versus the version above

**`def main() -> int:`**
The `-> int` is a **return type annotation** — a type hint (foreshadowing
Lesson 3, where these become load-bearing) documenting that this function
returns an integer exit code. It has zero effect at runtime by itself;
Python does not enforce it. Its value here is documentation plus tooling —
your editor and type checkers can catch a mistake like `return None` before
you ever run the program.

**wrapping everything in `main()` instead of top-level code**
Every name created at module scope (`app`, `window`) previously leaked into
the module's global namespace. Wrapping in a function makes them **local
variables**, scoped to the function call — they're garbage-collected when
`main()` returns, rather than persisting as globals for the rest of the
process's life. This matters more once this file is imported from
elsewhere, which it will be as the project grows.

**`if __name__ == "__main__":`**
`__name__` is a variable Python sets automatically on every module. When a
file is run directly (`python main.py`), Python sets `__name__` to the
string `"__main__"` for that file. When the *same* file is instead
*imported* by another module, `__name__` is set to the module's own name
(e.g., `"main"`) instead. This `if` block therefore only runs when the file
is executed directly — a guard against accidentally starting a whole
`QApplication` and event loop just because some other file imported
something from `main.py`. You'll rely on this exact pattern for every
runnable entry point in Forge, including test files later.

### Why this design?
```
design_decision:
  problem: "How do we structure even the simplest runnable file so it scales as the project grows?"
  available_choices:
    - "top-level script code (what Lesson 1's first version used)"
    - "a main() function guarded by if __name__ == '__main__'"
  selected_choice: "main() function + __name__ guard"
  reason: "keeps entry-point code importable and testable without side effects, and avoids leaking globals"
  benefit: "later phases can import from main.py (or split it up) without accidentally launching a GUI"
  cost: "one extra layer of indirection for a program this trivial"
  future_revisit_condition: "once the project has multiple entry points (editor vs. exported runtime), this pattern gets formalized further"
```

---

## 6. Under the hood

*(Optional, included because it demystifies something you'll otherwise treat
as magic for the rest of the course.)*

`QApplication` and `QMainWindow` are Python classes, but they are **thin
wrappers around a C++ Qt library**. When you call `app.exec()`, the Python
interpreter is not itself implementing an event loop in Python bytecode —
it calls into compiled C++ code (via PySide6's binding layer) that talks
directly to the operating system's native windowing APIs (Win32 messages on
Windows, Cocoa events on macOS, X11/Wayland on Linux). This is *why* Qt
feels and performs like a native application rather than a typical
"Python GUI" — the heavy lifting genuinely is native code. Your Python
callbacks get invoked *from* that native loop when relevant events occur,
not the other way around.

```
behavior:
  compile_time:
    - "Python has no compile-time knowledge of Qt's C++ event loop; nothing here is checked ahead of time"
  runtime:
    - "app.exec() hands control to compiled C++ code"
    - "that C++ loop calls back into your Python objects when OS events arrive"
```

---

## 7. Exercise

**Predict:** If you delete the line `window.show()` entirely but keep
`app.exec()`, what will happen when you run the program? Will it error,
hang, or do something else? Form your answer, then try it.

**Break:** Comment out `app = QApplication(sys.argv)` but leave everything
else. Run it. Read the exact exception Qt/PySide6 raises. What does the
error message tell you about the "exactly one `QApplication` per process,
and it must exist first" rule from this lesson?

**Trace:** In your own words (no code needed), write the sequence of events
from the moment you run `python main.py` to the moment you click the
window's close button and the process actually exits. Use the mental-model
diagram from Section 3 as your checklist.

---

## What to remember
1. A GUI program's "aliveness" comes from an event loop (`app.exec()`), not top-to-bottom execution — this is the single biggest structural difference from scripts you've written before.
2. Exactly one `QApplication` exists per process, and it must be constructed before any Qt widgets.
3. `.show()` makes a window visible; constructing it does not.
4. Qt's `setX()`/`x()` convention replaces Python's `@property` pattern — you'll contrast the two directly in Lesson 3.
5. Wrapping runnable code in `main()` + a `__name__` guard keeps entry-point files safely importable — a pattern you'll reuse for the rest of the project.

## Next lesson
Lesson 2 stays in PySide6 and introduces **layouts** — right now this
window can only ever hold one widget, but Forge needs a menu bar, three
dock panels, and a viewport all visible at once. You'll learn why absolute
pixel positioning breaks immediately on a resizable window, and how
`QVBoxLayout`/`QHBoxLayout`/`QSplitter` solve it — setting up the exact
panel skeleton (Scene Tree | Viewport | Inspector) that the rest of the
editor gets built inside of.
