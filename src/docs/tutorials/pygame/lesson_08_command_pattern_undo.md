# Lesson 8 — The Command Pattern and `QUndoStack`

## What you'll learn
- Why directly mutating a `GameObject` from the UI makes undo impossible, structurally, not just "hard"
- How `QUndoCommand`/`QUndoStack` formalize "a reversible action" as its own object
- A serious, real trap: capturing a *reference* to mutable state as your "old value" instead of a genuine copy — and why it silently breaks undo
- How pushing a new command after undoing correctly discards the old "future" (redo branch)

## What you'll build
`MoveObjectCommand` — the first real, undoable edit operation in Forge:
dragging an object changes its `Transform`'s position, and that change can
be undone and redone correctly, including many small drag-movements
collapsing into a single undo step.

## The question
Once the viewport (Lesson 7) is live and objects exist as real
`GameObject`s (Lesson 3), the natural next step is letting the user drag
one to move it — which means code somewhere runs
`game_object.transform.x = new_x`. Every serious editor supports Ctrl+Z.
What, structurally, is missing from a plain assignment like that, that
makes undo actually work?

---

## 1. Predict

```python
game_object.transform.x = 100
game_object.transform.x = 250
game_object.transform.x = 400
```

After these three lines run, in a plain, undo-unaware program, is there
*any* information left in memory — anywhere — that would let you get back
to `x = 250`, or `x = 100`? Think about what actually happened to the
values `100` and `250` the moment each subsequent assignment ran, before
answering.

---

## 2. Try it

```python
from PySide6.QtGui import QUndoCommand, QUndoStack
from forge.model import GameObject, Transform


class MoveObjectCommand(QUndoCommand):
    def __init__(self, game_object: GameObject, new_x: float, new_y: float):
        super().__init__("Move Object")
        self.game_object = game_object
        self.new_x = new_x
        self.new_y = new_y
        self.old_x = game_object.transform.x
        self.old_y = game_object.transform.y

    def redo(self) -> None:
        self.game_object.transform.x = self.new_x
        self.game_object.transform.y = self.new_y

    def undo(self) -> None:
        self.game_object.transform.x = self.old_x
        self.game_object.transform.y = self.old_y


player = GameObject(name="Player", transform=Transform(x=0, y=0))
stack = QUndoStack()

stack.push(MoveObjectCommand(player, 100, 0))
print(player.transform.x)   # 100

stack.push(MoveObjectCommand(player, 250, 0))
print(player.transform.x)   # 250

stack.undo()
print(player.transform.x)   # 100 — back to the previous state

stack.redo()
print(player.transform.x)   # 250 again
```

### What this code does (mechanical explanation)

**`class MoveObjectCommand(QUndoCommand):`**
`QUndoCommand` is Qt's base class for exactly one idea: **a reversible
action, packaged as an object**, rather than an action that just happens
and is forgotten. Subclassing it, the same inheritance mechanism from
Lessons 2 and 6, is how you tell Qt "here is a specific kind of reversible
edit."

**`super().__init__("Move Object")`**
The string is the command's **display text** — used automatically by Qt
if you build an Edit menu's "Undo Move Object" / "Redo Move Object" labels
from the stack (Section 5 does exactly this). It's not a functional
identifier; it's what the *user* sees.

**`self.game_object = game_object`**
The command stores a **reference** to the actual `GameObject` it will act
on — not a copy of the whole object, since the point is to mutate this
*specific* object's real state, the same one the viewport (Lesson 7) is
drawing from.

**`self.new_x = new_x` / `self.old_x = game_object.transform.x`**
Two plain floats, captured **at the moment the command is constructed** —
`new_x`/`new_y` are what the move is going *to*; `old_x`/`old_y` are read
directly from the object's *current* state before anything changes, so the
command has both endpoints of the move available for later.

**`def redo(self) -> None:`**
A method you're overriding — `QUndoCommand`'s own `redo` does nothing by
default. This is where the actual mutation happens: setting
`game_object.transform.x`/`y` to the new values. Note this method is not
called immediately when you construct the command — it's called by
`QUndoStack.push()`, explained next.

**`def undo(self) -> None:`**
The mirror image of `redo` — restores the values captured *before* the
move. This pairing — `redo` applies a change, `undo` reverses that exact
same change — is the entire contract `QUndoCommand` asks you to implement;
nothing else is required for a minimal, working command.

**`stack = QUndoStack()`**
Constructs the history container — internally, two stacks (conceptually
"already-done" and "undone, available to redo"), though you never touch
either directly; all interaction goes through `push`/`undo`/`redo`.

**`stack.push(MoveObjectCommand(player, 100, 0))`**
This is the line that answers Section 1's prediction, and it does two
things worth separating clearly: it **calls `redo()` on the command
immediately** (so the move actually happens right now, as a side effect of
pushing), *and* it stores the command object itself in the stack's
history — meaning the specific values `100` and `0` (and, inside the
command, the previous `0`/`0`) are **not thrown away** the way a plain
assignment throws away whatever the variable held before. The command
object is the thing preserving that information.

**`stack.undo()`**
Looks up the most recently pushed (and not-yet-undone) command, calls its
`undo()` method, and moves it onto the "available to redo" side
internally. It does not know or care *what* `undo()` does — it's calling
whatever method you defined, trusting your implementation to be a correct
inverse of `redo()`.

**`stack.redo()`**
The mirror: calls the most recently undone command's `redo()` again, and
moves it back onto the "already-done" side.

---

## 3. Why?

### The structural problem, precisely

Section 1's prediction should now be answerable exactly: after three plain
assignments, **nothing remains in memory that ever held `100` or `250`** —
each assignment simply overwrote the variable's value; the old value,
having no other reference pointing to it, becomes eligible for garbage
collection the instant it's replaced. A plain assignment is not "a
reversible action that happened" — it's just a value being replaced, with
zero record of what it replaced. Undo requires something to actually
**exist as data** representing "what would reverse this" — which is
precisely what `MoveObjectCommand`'s `old_x`/`old_y` fields are: the thing
a bare assignment never created.

### The mental model

```
QUndoCommand subclass:
  redo() → applies the change
  undo() → reverses that exact change
  (both must be correct inverses of each other)

QUndoStack:
  push(cmd)   → calls cmd.redo() immediately, then records cmd in history
  undo()      → calls the most recent command's undo(), moves it to "redoable"
  redo()      → calls the most recently undone command's redo() again
  push(new)   → discards any currently-redoable commands (Section 6)
```

The stack itself contains **no domain knowledge whatsoever** about moving
objects, transforms, or anything else — it only knows "these are objects
with `redo`/`undo` methods, in this order." This is what makes it reusable
for every future kind of edit (renaming an object, deleting one, editing
an animation clip) without the stack itself ever changing.

---

## 4. Change one thing — merging many small moves into one undo step

A drag operation fires dozens of small position updates per second while
the mouse moves. Pushing a separate `MoveObjectCommand` for *every* pixel
of movement would make one drag require dozens of Ctrl+Z presses to undo
— clearly wrong. `QUndoCommand` supports **merging**:

```diff
 class MoveObjectCommand(QUndoCommand):
     def __init__(self, game_object: GameObject, new_x: float, new_y: float):
         super().__init__("Move Object")
         self.game_object = game_object
         self.new_x = new_x
         self.new_y = new_y
         self.old_x = game_object.transform.x
         self.old_y = game_object.transform.y

     def redo(self) -> None:
         self.game_object.transform.x = self.new_x
         self.game_object.transform.y = self.new_y

     def undo(self) -> None:
         self.game_object.transform.x = self.old_x
         self.game_object.transform.y = self.old_y
+
+    def id(self) -> int:
+        return 1  # unique per command TYPE, not per instance
+
+    def mergeWith(self, other: "QUndoCommand") -> bool:
+        if not isinstance(other, MoveObjectCommand):
+            return False
+        if other.game_object is not self.game_object:
+            return False
+        self.new_x = other.new_x
+        self.new_y = other.new_y
+        return True
```

### What changed
Two new overridden methods. `id()` returns a fixed integer identifying
"this command type can potentially merge with adjacent commands of the
same `id()`." `mergeWith(other)` is called automatically by `QUndoStack`
when a *new* command is pushed immediately after one with the same `id()`
— if it returns `True`, the new command is absorbed into the existing one
(here, by simply updating `new_x`/`new_y` to the newer target) rather than
being stored as a separate history entry at all.

### What did not change
- `redo`/`undo`'s own logic — completely untouched
- The rest of `stack.push`/`undo`/`redo` behavior from Section 2

```
change_analysis:
  changed: "added id() and mergeWith() overrides"
  unchanged:
    - "redo()/undo() implementations"
    - "how QUndoStack.push/undo/redo are called from outside"
  behavioral_difference:
    - "consecutive MoveObjectCommands on the same game_object collapse into a single undo step instead of one per push"
  compiler_difference:
    - "none"
  runtime_difference:
    - "QUndoStack checks id() and calls mergeWith() automatically inside push(), before deciding whether to store a new history entry at all"
```

**Why `other.game_object is not self.game_object` uses `is`, not `==`:**
This deliberately checks **object identity** (Lesson 3's distinction
between `@dataclass`-generated value equality and identity comparison) —
two *different* `GameObject`s could coincidentally have identical field
values and would compare `==` as equal under Lesson 3's generated `__eq__`,
but they must **not** have their move commands merged together, since
they're genuinely different objects in the scene. `is` is the correct
check here specifically because identity, not value-equality, is what
determines "is this the same drag operation continuing."

---

## 5. Put it in the project

```python
# forge/editor_window.py (extending Lesson 7's version)
from PySide6.QtWidgets import QMainWindow, QSplitter, QLabel, QMenuBar
from PySide6.QtGui import QUndoStack
from PySide6.QtCore import Qt
from forge.viewport_widget import ViewportWidget


class EditorWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("Forge")
        self.resize(1000, 700)
        self.undo_stack = QUndoStack(self)
        self.setCentralWidget(self._build_panels())
        self._build_edit_menu()

    def _build_panels(self) -> QSplitter:
        splitter = QSplitter(Qt.Orientation.Horizontal)
        splitter.addWidget(QLabel("Scene Tree"))
        splitter.addWidget(ViewportWidget())
        splitter.addWidget(QLabel("Inspector"))
        return splitter

    def _build_edit_menu(self) -> None:
        edit_menu = self.menuBar().addMenu("&Edit")
        undo_action = self.undo_stack.createUndoAction(self, "Undo")
        redo_action = self.undo_stack.createRedoAction(self, "Redo")
        undo_action.setShortcut("Ctrl+Z")
        redo_action.setShortcut("Ctrl+Shift+Z")
        edit_menu.addAction(undo_action)
        edit_menu.addAction(redo_action)
```

### Code walkthrough — what's new

**`self.undo_stack = QUndoStack(self)`**
Passing `self` as the constructor argument **parents** the stack to the
window — the same ownership mechanism from Lesson 2, now applied to a
non-visual object. This ensures the stack is cleaned up automatically when
the window is, and is idiomatic Qt: one undo stack, owned by the window
whose edits it tracks, created once and referenced by every future command
(`self.undo_stack.push(MoveObjectCommand(...))` will be called from
wherever the viewport handles a drag, in a later lesson).

**`self.menuBar().addMenu("&Edit")`**
`QMainWindow` provides a menu bar automatically (part of what made
`QMainWindow` the right base class back in Lesson 2, versus plain
`QWidget`). `&Edit` — the ampersand marks `E` as this menu's keyboard
mnemonic (Alt+E opens it on platforms that support that convention); the
ampersand itself is not displayed.

**`self.undo_stack.createUndoAction(self, "Undo")`**
Rather than you writing your own `QAction` and manually keeping its
enabled/disabled state and label text ("Undo Move Object" vs. plain
"Undo," grayed out when there's nothing to undo) in sync with the stack,
`QUndoStack` provides this factory method that returns a fully wired-up
`QAction` — clicking it calls `stack.undo()`, and its enabled state and
text update automatically as the stack's contents change. This is a
convenience method built specifically because "an Undo menu item" is such
a common need that Qt provides it rather than making every application
reimplement the same wiring.

### Why this design?
```
design_decision:
  problem: "how should undo/redo state be represented so any future kind of edit (move, rename, delete, animation edits) can participate in the same history?"
  available_choices:
    - "ad-hoc: each editor feature keeps its own private list of 'previous values' and manual undo logic"
    - "a single QUndoCommand-based history: every edit becomes a command object pushed onto one shared QUndoStack"
  selected_choice: "QUndoStack with QUndoCommand subclasses per edit type"
  reason: "a single shared stack gives a single, correctly-ordered Ctrl+Z history across every kind of edit, rather than each feature needing its own undo bookkeeping"
  benefit: "new edit types (Phase 7's rename/delete, Phase 6's animation edits) just add new QUndoCommand subclasses; the stack, menu wiring, and shortcuts never change"
  cost: "every mutation must be routed through a command object instead of a direct assignment — more ceremony for simple, one-off changes"
  future_revisit_condition: "if a mutation genuinely never needs to be undoable (e.g. purely internal cache state), it's fine to skip the command pattern for it — not every state change in the program needs to go through QUndoStack"
```

---

## 6. Trap

**Normal rule:** `MoveObjectCommand.__init__` captures `old_x`/`old_y` as
plain `float` values, read *before* any mutation happens — floats are
immutable, so `self.old_x = 100.0` genuinely preserves that number
regardless of what happens to `transform.x` afterward.

**Apparently equivalent code** — imagine "simplifying" the command to
store the whole `Transform`, reasoning that it's more convenient than
tracking `x`/`y` separately:

```python
class BrokenMoveCommand(QUndoCommand):
    def __init__(self, game_object: GameObject, new_x: float, new_y: float):
        super().__init__("Move Object")
        self.game_object = game_object
        self.new_x = new_x
        self.new_y = new_y
        self.old_transform = game_object.transform   # looks like a snapshot

    def redo(self) -> None:
        self.game_object.transform.x = self.new_x
        self.game_object.transform.y = self.new_y

    def undo(self) -> None:
        self.game_object.transform.x = self.old_transform.x
        self.game_object.transform.y = self.old_transform.y
```

**Surprising result:** calling `stack.undo()` after this command's `redo()`
has run does **nothing** — the object doesn't move back at all.

**Exact reason:** `self.old_transform = game_object.transform` does not
copy the `Transform` — `Transform` is a mutable `@dataclass` (Lesson 3;
it has no `frozen=True`), and this line binds `self.old_transform` to the
**exact same object** as `game_object.transform`. When `redo()` later runs
`self.game_object.transform.x = self.new_x`, it mutates that one shared
object in place — and since `self.old_transform` is *the same object, not
a snapshot of it*, `self.old_transform.x` has *also* already become
`self.new_x` by the time `undo()` reads it. This is, once again, the exact
aliasing mistake from Lessons 3 and 6 — assignment binds a name to an
object rather than copying it — now surfacing specifically inside undo
logic, where it's especially dangerous because it fails *silently*: no
error, no crash, undo just quietly does nothing.

**Project consequence:** **any command that needs to remember "the value
before" must capture immutable, independent values (plain numbers,
strings) or a genuine copy (`dataclasses.replace(transform)`, or
reconstructing a new `Transform(...)`) — never a bare reference to a live,
mutable object that the `redo()` in the very same command is about to
mutate.** This is exactly why the working version in Section 2 stored
`old_x`/`old_y` as two separate `float`s rather than "the old transform" —
immutability of the captured value is what makes it trustworthy as a
record of the past.

---

## 7. Exercise

**Predict:** After `stack.push(cmd_a)`, `stack.push(cmd_b)`, `stack.undo()`,
and then `stack.push(cmd_c)` (a brand-new command, not a redo), what
happens to `cmd_b`? Is it still reachable via `stack.redo()` afterward?
Reason from "push() discards any currently-redoable commands" before
checking the actual Qt documentation to confirm.

**Modify:** Write a `RenameObjectCommand(QUndoCommand)` following the exact
same shape as `MoveObjectCommand` — `old_name`/`new_name` as plain strings
(immutable, so Section 6's trap doesn't even apply here — explain why
strings being immutable makes this command inherently safer to write than
`MoveObjectCommand` was).

**Break:** Take the Trap section's `BrokenMoveCommand`, keep
`old_transform = game_object.transform` exactly as written, but change
`Transform` (Lesson 3) to use `@dataclass(frozen=True)`. Would this fix
the bug on its own? Trace through what `game_object.transform.x = ...`
would even mean if `Transform` were frozen, and what you'd have to change
elsewhere (hint: you can no longer mutate fields in place at all) to make
that combination work correctly.

**Repair:** Using `mergeWith` from Section 4, add a guard so that a
merge is refused (returns `False`) if more than, say, 800 milliseconds
have passed since the earlier command was created — meaning a pause in
dragging starts a *new* undo step instead of merging into a very old one
indefinitely. What data would `MoveObjectCommand` need to store, and
when, to make this check possible?

---

## What to remember
1. A plain assignment discards the old value with nothing left to reverse it — undo requires something that actually *stores* "how to reverse this" as data.
2. `QUndoCommand` formalizes a reversible edit as `redo()`/`undo()`, a correct-inverse pair you implement; `QUndoStack` only knows how to call them in the right order, with no domain knowledge of its own.
3. `stack.push()` calls `redo()` immediately — pushing a command both records history *and* performs the action, in one call.
4. Pushing a new command after undoing discards the previously-redoable commands — the "redo branch" doesn't survive a genuinely new edit.
5. Capturing "the old value" as a reference to a live mutable object (instead of an immutable value or a real copy) breaks undo silently — the same aliasing hazard from Lessons 3 and 6, now hiding inside history/state-tracking code specifically.

## Next lesson
Lesson 9 begins Phase 6, the animation system's editor-facing half: a
spritesheet import tool built with `QGraphicsView`, letting you click-drag
frame boundaries visually instead of hardcoding `frame_w`/`frame_h` the
way Lesson 5's standalone script did.
