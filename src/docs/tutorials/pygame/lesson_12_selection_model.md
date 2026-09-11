# Lesson 12 — A Shared Selection Model: Scene Tree, Viewport, and Inspector in Sync

## What you'll learn
- Why three widgets needing to agree on "what's selected" shouldn't hold direct references to each other
- How a small, central `QObject`-based model plus signals lets them stay in sync without knowing about each other at all
- A real feedback-loop risk when a widget both emits and listens to the same signal — and the fix
- Why the dedupe check that breaks that loop **must** use `is`, not `==` — and exactly which earlier lesson's lesson this recalls

## What you'll build
`SelectionModel` — a single, shared object holding "which `GameObject` is
currently selected," which `SceneTreeWidget`, `ViewportWidget`, and
`InspectorPanel` (Lesson 11) all connect to, so that clicking an object
anywhere updates all three consistently.

## The question
Right now, nothing connects the Scene Tree, the Viewport, and the
Inspector at all — Lesson 11's `InspectorPanel.set_target` has to be
called by *something*, but by what? The obvious-looking answer — have the
Scene Tree widget directly hold a reference to the Inspector widget and
call `inspector.set_target(obj)` when a tree item is clicked — creates a
hard dependency between two widgets that otherwise have nothing to do with
each other. What's the alternative, and what new problem does it
introduce?

---

## 1. Predict

Imagine `SceneTreeWidget` and `InspectorPanel` both connect to the *same*
shared signal — one to *announce* a new selection, the other to *react* to
one. If `SceneTreeWidget` **also** reacts to that same signal (to
highlight the newly-selected row visually), and reacting involves calling
a method that could itself re-emit the signal — what do you predict
happens? A clean update, an infinite loop, or something in between? Think
about *why*, structurally, before continuing.

---

## 2. Try it

```python
from PySide6.QtCore import QObject, Signal


class SelectionModel(QObject):
    selection_changed = Signal(object)

    def __init__(self):
        super().__init__()
        self._current = None

    def select(self, obj) -> None:
        print(f"select() called with {obj}")
        self._current = obj
        self.selection_changed.emit(obj)


model = SelectionModel()

def naive_listener(obj):
    print(f"naive_listener reacting to {obj}")
    model.select(obj)   # "re-announcing" the same selection — looks harmless

model.selection_changed.connect(naive_listener)
model.select("A")
```

Run this. Watch the console carefully — it does not run forever (Python
will eventually raise a `RecursionError`), but it does **not** cleanly
print once and stop, either.

### What this code does (mechanical explanation)

**`class SelectionModel(QObject):`**
The first time this project has subclassed `QObject` directly rather than
a `QWidget` — `QObject` is the base class for *any* Qt object capable of
having signals and slots, whether or not it has a visual appearance at
all. This is deliberate: `SelectionModel` holds shared state and notifies
listeners, but draws nothing on screen itself.

**`selection_changed = Signal(object)`**
Exactly Lesson 10's custom-signal mechanism, applied to a plain data
model instead of a widget — declared at class level, carries one argument
of any type when emitted.

**`def select(self, obj) -> None:`**
Stores the new selection and emits the signal, unconditionally, every
single time it's called — no matter what `obj` was previously.

**`model.selection_changed.connect(naive_listener)`**
Connects the signal to a plain function this time, rather than a bound
method — signals can connect to any callable.

**`model.select("A")`**
Triggers the chain: `select("A")` sets `_current = "A"`, emits
`selection_changed("A")`, which calls `naive_listener("A")`, which itself
calls `model.select("A")` again — which sets `_current = "A"` *again*
(already true, but nothing checks that), emits the signal *again*, calls
`naive_listener` *again* — and so on, each call nested inside the
previous one, until Python's call-stack depth limit is hit and a
`RecursionError` is raised.

---

## 3. Why?

### The structural cause

```
select(obj)
  → emits selection_changed(obj)
      → naive_listener(obj) runs
          → calls select(obj) again
              → emits selection_changed(obj) again
                  → naive_listener(obj) runs again
                      → ... (no base case; this never stops on its own)
```

This is a genuine mechanism issue, not a fluke: **any signal whose own
listener can cause it to be re-emitted, with nothing checking whether the
new value actually differs from the current one, has no natural stopping
point.** The `naive_listener`'s intention — "make sure the model knows
about this selection" — is redundant *every single time* after the very
first, but nothing in the code says so.

### The general shape of the fix

The fix isn't "don't let listeners call back into the model" (that would
throw away a lot of legitimate, useful patterns) — it's **making the
model itself refuse to do anything, including re-emitting, when the
"new" value is the same as what it already has**. This is the same shape
of fix as Lesson 10's `playing` guard clause: give exactly one piece of
state (`_current`) the authority to short-circuit redundant work, rather
than trying to prevent every possible caller from ever calling in with a
redundant value.

---

## 4. Change one thing — the dedupe guard

```diff
     def select(self, obj) -> None:
-        print(f"select() called with {obj}")
-        self._current = obj
-        self.selection_changed.emit(obj)
+        if obj is self._current:
+            return
+        self._current = obj
+        self.selection_changed.emit(obj)
```

Run the earlier script again with this change. Output:
```
naive_listener reacting to A
```//once, cleanly, then nothing further — the recursive call to `select("A")`
inside `naive_listener` now hits the guard and returns immediately.

### What changed
One `if` added at the top of `select`, checking identity before doing
anything else.

### What did not change
Everything downstream of the guard — `self._current = obj` and the
`emit` call — is byte-for-byte identical to before; it simply doesn't run
a second time for the same object.

```
change_analysis:
  changed: "added an identity check (obj is self._current) that returns early when the selection isn't actually changing"
  unchanged:
    - "the assignment and emit statements themselves, for genuinely new selections"
  behavioral_difference:
    - "calling select() again with the same object is now a safe no-op instead of re-triggering the whole notification chain"
  compiler_difference:
    - "none"
  runtime_difference:
    - "the recursive naive_listener → select → emit → naive_listener chain now terminates after exactly one real change, rather than recursing until the call stack overflows"
```

**Why `is`, deliberately, not `==`:** this is the question Section 6
builds its entire trap around — hold onto it for now and read that section
before assuming `==` would have worked just as well here.

---

## 5. Put it in the project

```python
# forge/selection_model.py
from PySide6.QtCore import QObject, Signal
from forge.model import GameObject


class SelectionModel(QObject):
    selection_changed = Signal(object)  # emits GameObject | None

    def __init__(self):
        super().__init__()
        self._current: GameObject | None = None

    def select(self, obj: GameObject | None) -> None:
        if obj is self._current:
            return
        self._current = obj
        self.selection_changed.emit(obj)

    @property
    def current(self) -> GameObject | None:
        return self._current
```

```python
# forge/scene_tree_widget.py
from PySide6.QtWidgets import QListWidget, QListWidgetItem
from PySide6.QtCore import Qt, QSignalBlocker
from forge.model import GameObject
from forge.selection_model import SelectionModel


class SceneTreeWidget(QListWidget):
    def __init__(self, selection_model: SelectionModel):
        super().__init__()
        self.selection_model = selection_model
        self._items_by_object: dict[int, QListWidgetItem] = {}

        self.currentItemChanged.connect(self._on_item_clicked)
        self.selection_model.selection_changed.connect(self._on_selection_changed)

    def populate(self, objects: list[GameObject]) -> None:
        self.clear()
        self._items_by_object.clear()
        for obj in objects:
            item = QListWidgetItem(obj.name)
            item.setData(Qt.ItemDataRole.UserRole, obj)
            self.addItem(item)
            self._items_by_object[id(obj)] = item

    def _on_item_clicked(self, current: QListWidgetItem, _previous) -> None:
        if current is None:
            return
        obj = current.data(Qt.ItemDataRole.UserRole)
        self.selection_model.select(obj)

    def _on_selection_changed(self, obj: GameObject) -> None:
        target_item = self._items_by_object.get(id(obj)) if obj is not None else None
        with QSignalBlocker(self):
            self.setCurrentItem(target_item)
```

```python
# forge/editor_window.py — wiring it all together
class EditorWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("Forge")
        self.resize(1000, 700)
        self.undo_stack = QUndoStack(self)
        self.selection_model = SelectionModel()

        self.scene_tree = SceneTreeWidget(self.selection_model)
        self.viewport = ViewportWidget()
        self.inspector = InspectorPanel(self.undo_stack)

        self.selection_model.selection_changed.connect(self._on_selection_changed)

        splitter = QSplitter(Qt.Orientation.Horizontal)
        splitter.addWidget(self.scene_tree)
        splitter.addWidget(self.viewport)
        splitter.addWidget(self.inspector)
        self.setCentralWidget(splitter)

    def _on_selection_changed(self, obj) -> None:
        if obj is not None:
            self.inspector.set_target(obj)
```

### Code walkthrough — what's new

**`self._items_by_object: dict[int, QListWidgetItem] = {}`, keyed by `id(obj)`**
`id(obj)` returns an object's unique memory identity as an integer — used
here as a dictionary key specifically **because `GameObject` is a
mutable, non-frozen dataclass and therefore not safely hashable by value**
(Python dataclasses without `frozen=True`/`eq=False` tuning don't define
`__hash__` usable this way by default) — keying by `id()` sidesteps that
entirely and, more importantly, matches this lesson's whole theme: we want
to look things up by *identity*, not by value-equality, since two
different `GameObject`s could have identical field values.

**`item.setData(Qt.ItemDataRole.UserRole, obj)`**
`QListWidgetItem` can carry arbitrary associated data via `setData`/`data`,
keyed by a "role" — `UserRole` is specifically reserved for
application-defined data with no special meaning to Qt itself. This is
how a plain visual list item carries a reference back to the actual
`GameObject` it represents.

**`self.currentItemChanged.connect(self._on_item_clicked)`** and
**`self.selection_model.selection_changed.connect(self._on_selection_changed)`**
`SceneTreeWidget` both **emits into** the model (via `select()`, when the
*user* clicks) and **listens to** the model (to keep its own visual
highlight correct when selection changes from *elsewhere* — e.g., the
user clicking directly in the Viewport instead). This dual role is exactly
Section 1's setup, and exactly why the guard in Section 4 matters here for
real, not just in the toy example.

**`with QSignalBlocker(self): self.setCurrentItem(target_item)`**
Lesson 10's fix, applied a third time, in a third context: without this,
`setCurrentItem` would fire `currentItemChanged` (Qt doesn't distinguish
programmatic from user-driven changes here either — the exact same fact
from Lesson 10), which would call `_on_item_clicked`, which would call
`self.selection_model.select(obj)` — and since `obj` here genuinely *is*
already `self.selection_model._current` (that's the whole reason this
method is running), `SelectionModel`'s own guard from Section 4 would
catch it and no-op... but relying on *two* independent guards to save you
from every possible ordering is fragile. Blocking signals here means this
particular re-entrant path never even gets attempted, on top of the
model's own protection — a "belt and suspenders" approach, deliberately,
because getting this specific interaction wrong produces a bug that's
genuinely difficult to notice by casual testing (everything *looks* like
it works, right up until a specific ordering of clicks triggers it).

**`EditorWindow._on_selection_changed`**
Notice this method does **not** need to know anything about
`SceneTreeWidget`'s internals, and `SceneTreeWidget` doesn't need to know
anything about `InspectorPanel` — both independently connect to
`selection_model.selection_changed`. This is the direct payoff of routing
through a shared model instead of widgets holding direct references to
each other: adding a *fourth* panel later that also cares about selection
requires only one new `.connect(...)` call, touching none of the existing
three widgets' code.

### Why this design?
```
design_decision:
  problem: "how do three independent widgets agree on shared selection state without directly depending on each other's internals?"
  available_choices:
    - "each widget holds direct references to the others and calls their methods when selection changes"
    - "a small, shared QObject (SelectionModel) that all widgets connect to, emitting into it and listening to it, but never referencing each other directly"
  selected_choice: "shared SelectionModel"
  reason: "direct widget-to-widget references create an ever-growing web of dependencies as more panels are added; a shared model keeps every widget's dependency list to exactly one thing (the model), regardless of how many panels eventually care about selection"
  benefit: "new selection-aware panels connect to the model without any existing widget needing to change; this is the same decoupling principle as Lesson 6's RenderSprite adapter and Lesson 9's frame_defined signal, now applied to cross-widget state"
  cost: "an extra layer of indirection (the model object) for what is conceptually 'just a shared variable,' and a discipline requirement (identity-based dedupe, signal blocking) that must be respected correctly wherever a widget both listens to and can trigger the same signal"
  future_revisit_condition: "if selection needs to support multiple simultaneously selected objects later, SelectionModel's single-object current field and Signal(object) would need to become a list/set and a differently-shaped signal — a real, anticipated future change, not handled by this design as written"
```

---

## 6. Trap

**Normal rule (Section 4):** `SelectionModel.select`'s guard uses
`obj is self._current` — identity comparison.

**Apparently equivalent code** — someone "fixes" what looks like an
overly strict check, reasoning that comparing by value is more natural in
Python generally:

```python
def select(self, obj: GameObject | None) -> None:
    if obj == self._current:   # changed from `is` to `==`
        return
    self._current = obj
    self.selection_changed.emit(obj)
```

**Surprising result:** selecting a *different* `GameObject` in the Scene
Tree sometimes does **nothing at all** — the Inspector keeps showing the
previously-selected object's fields, and no error appears anywhere,
despite the user having clearly clicked a different row.

**Exact reason:** this is Lesson 3's `@dataclass`-generated `__eq__`,
returning directly to matter here. Two **separate, distinct**
`GameObject` instances — say, two enemies both named `"Enemy"` with
`Transform(x=0, y=0)` at the moment of creation, before either has been
moved — compare `==` as equal, field-by-field, exactly as Lesson 3
described, **even though they are two genuinely different objects the
user can select independently**. If the currently-selected object happens
to be value-equal to the newly-clicked one, `obj == self._current`
evaluates `True`, the guard returns early, `_current` is never updated to
the *actual* newly-clicked object, and `selection_changed` never fires —
silently discarding a real, intentional selection change.

**Project consequence:** **selection identity must always be compared
with `is`, never `==`.** This isn't a stylistic preference — it's the
direct, practical consequence of `GameObject` being a value-comparable
dataclass (a deliberate, correct design choice from Lesson 3, for
JSON round-tripping and testing) combined with the fact that "which
specific object is selected" is fundamentally a question about identity,
not value. The same distinction mattered in Lesson 6's `mergeWith` (`other.game_object
is not self.game_object`) and implicitly in Lesson 8's undo-command
targeting — this lesson is the fourth time the project has needed this
exact distinction, and by now it should be recognizable on sight: **"is
this the same real-world thing" is `is`; "do these have the same current
values" is `==`.**

---

## 7. Exercise

**Predict:** If `SelectionModel.select(None)` is called while
`self._current` is already `None`, what happens, tracing through the
guard clause? Now: if it's called while `self._current` is some real
`GameObject`, what happens, and which widgets would need to correctly
handle receiving `None` through `selection_changed` (hint: look at
`SceneTreeWidget._on_selection_changed`'s handling of `obj is not None`)?

**Modify:** `EditorWindow._on_selection_changed` currently does nothing
when `obj is None` — meaning the Inspector keeps showing whatever it last
showed, even after the user deselects everything. Fix this by adding a
`clear()` method to `InspectorPanel` (removing all rows, similar to
`_clear_rows`) and calling it appropriately.

**Break:** Remove the `QSignalBlocker` from `SceneTreeWidget._on_selection_changed`
but keep `SelectionModel`'s identity guard intact. Click through several
different objects in the Scene Tree in sequence. Does anything visibly
break? Now explain, referencing Section 5's "belt and suspenders"
reasoning, under what specific circumstance (not exercised by this simple
test) removing the `QSignalBlocker` here would actually matter — think
about what else, besides `SceneTreeWidget` itself, could call
`selection_model.select()`.

**Trace:** The Viewport (Lesson 7) doesn't yet participate in selection at
all. Sketch, in your own words (no code required), what
`ViewportWidget` would need to do to (a) let the user click a sprite in
the rendered scene to select it, and (b) visually highlight whichever
`GameObject` is currently selected, regardless of what selected it. Which
of the two directions — Viewport-causes-selection vs.
selection-causes-Viewport-highlight — corresponds to `select()` calls
versus `selection_changed` listening, in the same shape as
`SceneTreeWidget`'s dual role in this lesson?

---

## What to remember
1. A shared model object (`SelectionModel`) that widgets both emit into and listen to avoids a growing web of direct widget-to-widget dependencies as more panels are added.
2. A signal whose own listener can cause it to be re-emitted has no natural stopping point unless something checks whether the value has genuinely changed before re-emitting.
3. `QSignalBlocker`, applied a third time in this project now, remains the correct guard whenever a widget's own programmatic update could re-trigger a handler meant for user-driven changes.
4. Selection identity — "is this the same real object" — must be compared with `is`; `@dataclass`-generated value equality (`==`) will incorrectly treat two distinct, coincidentally-identical objects as the same one.
5. Recognizing *which* kind of comparison a piece of logic actually needs (identity vs. value) is a recurring judgment call this project has now required in at least four separate places — Lessons 3, 6, 8, and this one.

## Next lesson
Lesson 13 covers full project serialization (Phase 7's final piece): saving
an entire scene — every `GameObject` in the tree, not just one — to a
`.forge` JSON file, and loading it back, including correctly reconstructing
`SceneTreeWidget`'s contents and resetting `SelectionModel` and the
`QUndoStack` for the newly-loaded project.
