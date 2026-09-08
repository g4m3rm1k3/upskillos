# Lesson 11 — The Reflection-Driven Inspector Panel

## What you'll learn
- How `dataclasses.fields()` lets you build UI *generically*, from a dataclass's own structure, instead of hand-writing one form per class
- A real, easy-to-miss Python subtlety: a dataclass field's `.type` can be an actual type object *or* a plain string, depending on how annotations were written — and why that breaks naive type-based logic silently
- `typing.get_type_hints()` as the correct fix, and why it exists at all
- How to route every Inspector edit through Lesson 8's undo system generically, without one hand-written `QUndoCommand` subclass per field

## What you'll build
`InspectorPanel` — a widget that, given *any* `GameObject`, looks at its
`Transform`'s fields and builds one editable row per field automatically.
Add a new field to `Transform` later, and the Inspector grows a new row
for it with zero Inspector code changes — this is the payoff Lesson 3's
type hints were building toward from the very first lesson on dataclasses.

## The question
A hand-written form — one `QLineEdit` for `x`, one for `y`, one for
`rotation`, one for `scale` — works, but it's four separate pieces of
near-identical code, and it has to be manually kept in sync every time
`Transform` gains or loses a field. `Transform` already *describes itself*
completely, as far as Python is concerned — its field names and types are
right there in the class definition. Can the Inspector be built by reading
that description, rather than by hand-writing a form that duplicates it?

---

## 1. Predict

```python
from dataclasses import dataclass, fields

@dataclass
class Transform:
    x: float = 0.0
    y: float = 0.0

for f in fields(Transform):
    print(f.name, f.type)
```

Before running this: do you expect `f.type` to print something like
`<class 'float'>` (an actual Python type object), or the plain text
`float` (a string)? Form a guess — this isn't obvious, and the answer
depends on something you can't see just by looking at the `@dataclass`
body above.

---

## 2. Try it

```python
from dataclasses import dataclass, fields

@dataclass
class Transform:
    x: float = 0.0
    y: float = 0.0

for f in fields(Transform):
    print(f.name, f.type, type(f.type))
```

Output:
```
x <class 'float'> <class 'type'>
y <class 'float'> <class 'type'>
```

Here, `f.type` genuinely is the real `float` type object. Now run this
version, changed by exactly one line at the very top of the file:

```python
from __future__ import annotations
from dataclasses import dataclass, fields

@dataclass
class Transform:
    x: float = 0.0
    y: float = 0.0

for f in fields(Transform):
    print(f.name, f.type, type(f.type))
```

Output:
```
x float <class 'str'>
y float <class 'str'>
```

**Identical class body. Different result.** `f.type` is now the *string*
`"float"`, not the type object `float`.

### What this code does (mechanical explanation)

**`from dataclasses import dataclass, fields`**
`fields` is a function (distinct from the `field(...)` helper used inside
class bodies in Lessons 3, 5, and 10) — given a dataclass or dataclass
*instance*, it returns a tuple of `Field` objects describing each
declared field.

**`for f in fields(Transform):`**
Each `f` is a `Field` object — an object `@dataclass` itself builds
internally while processing the class body (Lesson 3's mechanism), now
exposed for your own code to read.

**`f.name`**
The field's name as a plain string (`"x"`, `"y"`) — this part is always a
string, unambiguously, regardless of anything else in this lesson.

**`f.type`**
This is the value under investigation. In the *first* version, it's the
actual `float` type object — the same object you'd get from typing
`float` directly in code, which is why `type(f.type)` printed
`<class 'type'>` (the type of a type object). In the *second* version, it
is instead the **string** `"float"` — the literal text that was written
in the source code, unevaluated — which is why `type(f.type)` printed
`<class 'str'>`.

**`from __future__ import annotations`**
This is the single line responsible for the difference, and it's worth
understanding precisely what it does: it turns on **postponed evaluation
of annotations** for the entire file. Normally, when Python processes
`x: float = 0.0`, it evaluates `float` as an expression immediately,
obtaining the real type object, and stores that object as the
annotation. With this import active, Python instead stores the
**unevaluated source text** of the annotation — literally the string
`"float"` — and never evaluates it at all, unless something later
explicitly asks it to. `@dataclass` reads whatever the annotation
happens to be — an object or a string — and passes it straight through
into `Field.type`, without evaluating it either.

---

## 3. Why?

### Why postponed evaluation exists at all

Lesson 3 needed a **quoted forward reference** —
`children: list["GameObject"]` — specifically because `GameObject`
wasn't fully defined yet at the point that line executed. `from __future__
import annotations` exists to solve exactly that class of problem more
broadly: with it active, *every* annotation in the file is automatically
treated the way Lesson 3 manually quoted just that one — deferred, never
evaluated unless asked, which means forward references, circular type
dependencies between classes, and self-referencing classes all "just work"
without individually-quoted strings scattered through the code. It's a
genuinely useful feature — the problem this lesson is surfacing isn't that
the feature is bad, it's that **it changes what `Field.type` actually
contains**, silently, based on one import line that might be far away
from — or even absent from — the file doing the reflecting.

### The mechanism, precisely

```
source annotation: x: float

WITHOUT `from __future__ import annotations`:
  Python evaluates `float` immediately → real type object stored
  dataclasses.fields()[i].type → <class 'float'>

WITH `from __future__ import annotations`:
  Python stores the annotation's source text, unevaluated
  dataclasses.fields()[i].type → the string "float"
```

Code that does `if field.type is float:` works correctly in the first
case and **silently, permanently fails** — never matching, never
raising an error — in the second, because it's comparing a string to a
type object, which is never `True`, and Python raises no warning about it.

```
behavior:
  compile_time:
    - "none — this is entirely a runtime property of how the module was written, not something a type checker flags by default"
  runtime:
    - "whether Field.type is a real type object or a string depends on whether `from __future__ import annotations` is active in the module where the dataclass is DEFINED — not where fields() is called from"
```

### The correct fix — `typing.get_type_hints`

```python
from typing import get_type_hints

hints = get_type_hints(Transform)
print(hints)   # {'x': <class 'float'>, 'y': <class 'float'>}
```

`get_type_hints` is specifically built to solve this: given a class, it
looks up **every** annotation — resolving any that were stored as strings
back into real type objects, by evaluating them against that class's own
module's namespace (so forward references to classes defined later in the
same module resolve correctly too, once the module has finished loading).
It always returns real type objects, regardless of whether
`from __future__ import annotations` was active where the class was
defined. This is the tool Section 5 uses for the real Inspector, instead
of reading `Field.type` directly.

---

## 4. Change one thing — from printing to building a widget, per field

```diff
-for f in fields(Transform):
-    print(f.name, f.type)
+from PySide6.QtWidgets import QDoubleSpinBox, QLineEdit, QCheckBox
+from typing import get_type_hints
+
+hints = get_type_hints(Transform)
+for f in fields(Transform):
+    field_type = hints[f.name]
+    if field_type is float:
+        widget = QDoubleSpinBox()
+    elif field_type is bool:
+        widget = QCheckBox()
+    else:
+        widget = QLineEdit()
+    print(f.name, "->", type(widget).__name__)
```

### What changed
Instead of printing each field's raw type, this looks up the *resolved*
type via `hints[f.name]` and picks a concrete Qt widget class based on it.

### What did not change
`fields(Transform)` is still used to get the field **names** — `hints` is
only consulted for reliable **type** information; the two serve different,
complementary purposes and neither alone gives you everything you need.

```
change_analysis:
  changed: "type lookup switched from f.type directly to hints[f.name] via get_type_hints"
  unchanged:
    - "iterating fields(Transform) to discover field names"
  behavioral_difference:
    - "widget selection now works correctly regardless of whether the Transform class's module uses postponed annotation evaluation"
  compiler_difference:
    - "none"
  runtime_difference:
    - "get_type_hints performs one resolution pass over the whole class up front, rather than relying on whatever raw form each field happened to store"
```

---

## 5. Put it in the project

```python
# forge/inspector_panel.py
from dataclasses import fields
from typing import get_type_hints
from PySide6.QtWidgets import QWidget, QFormLayout, QDoubleSpinBox, QLineEdit, QCheckBox
from PySide6.QtCore import QSignalBlocker
from PySide6.QtGui import QUndoStack
from forge.model import GameObject
from forge.commands import SetAttrCommand


class InspectorPanel(QWidget):
    def __init__(self, undo_stack: QUndoStack):
        super().__init__()
        self.undo_stack = undo_stack
        self.target: GameObject | None = None
        self._widgets: dict[str, QWidget] = {}
        self.layout_ = QFormLayout(self)

    def set_target(self, game_object: GameObject) -> None:
        self.target = game_object
        self._clear_rows()
        transform = game_object.transform
        hints = get_type_hints(type(transform))

        for f in fields(transform):
            field_type = hints[f.name]
            value = getattr(transform, f.name)
            widget = self._make_widget(field_type, value, f.name)
            self._widgets[f.name] = widget
            self.layout_.addRow(f.name, widget)

    def _make_widget(self, field_type: type, value, field_name: str) -> QWidget:
        if field_type is float:
            widget = QDoubleSpinBox()
            widget.setRange(-99999, 99999)
            with QSignalBlocker(widget):
                widget.setValue(value)
            widget.valueChanged.connect(
                lambda new_value, name=field_name: self._on_field_edited(name, new_value)
            )
            return widget

        if field_type is bool:
            widget = QCheckBox()
            with QSignalBlocker(widget):
                widget.setChecked(value)
            widget.toggled.connect(
                lambda new_value, name=field_name: self._on_field_edited(name, new_value)
            )
            return widget

        widget = QLineEdit()
        with QSignalBlocker(widget):
            widget.setText(str(value))
        widget.editingFinished.connect(
            lambda name=field_name, w=widget: self._on_field_edited(name, w.text())
        )
        return widget

    def _on_field_edited(self, field_name: str, new_value) -> None:
        command = SetAttrCommand(self.target.transform, field_name, new_value)
        self.undo_stack.push(command)

    def refresh_from_target(self) -> None:
        if self.target is None:
            return
        for name, widget in self._widgets.items():
            value = getattr(self.target.transform, name)
            with QSignalBlocker(widget):
                if isinstance(widget, QDoubleSpinBox):
                    widget.setValue(value)
                elif isinstance(widget, QCheckBox):
                    widget.setChecked(value)
                else:
                    widget.setText(str(value))

    def _clear_rows(self) -> None:
        while self.layout_.rowCount():
            self.layout_.removeRow(0)
        self._widgets.clear()
```

```python
# forge/commands.py — a generic replacement for Lesson 8's one-off MoveObjectCommand
from PySide6.QtGui import QUndoCommand


class SetAttrCommand(QUndoCommand):
    def __init__(self, target, attr_name: str, new_value):
        super().__init__(f"Set {attr_name}")
        self.target = target
        self.attr_name = attr_name
        self.new_value = new_value
        self.old_value = getattr(target, attr_name)   # a float/bool/str — immutable, safe (Lesson 8's trap avoided)

    def redo(self) -> None:
        setattr(self.target, self.attr_name, self.new_value)

    def undo(self) -> None:
        setattr(self.target, self.attr_name, self.old_value)

    def id(self) -> int:
        return hash(("SetAttrCommand", id(self.target), self.attr_name)) & 0x7FFFFFFF

    def mergeWith(self, other: "QUndoCommand") -> bool:
        if not isinstance(other, SetAttrCommand):
            return False
        if other.target is not self.target or other.attr_name != self.attr_name:
            return False
        self.new_value = other.new_value
        return True
```

### Code walkthrough — what's new

**`self._widgets: dict[str, QWidget] = {}`**
A dictionary mapping field name to the actual widget built for it —
needed so `refresh_from_target` can later find "the widget currently
showing `x`" without rebuilding the whole form from scratch every time.

**`self.layout_ = QFormLayout(self)`**
`QFormLayout` (note the trailing underscore on the attribute name —
avoiding shadowing the built-in name `layout`, a minor but real Python
naming consideration) is a Qt layout specialized for exactly this shape:
label-and-field rows, stacked vertically — a natural fit for "one row per
dataclass field," and a new layout type beyond Lesson 2's `QHBoxLayout`/
`QSplitter`.

**`hints = get_type_hints(type(transform))`**
`type(transform)` retrieves the *class* (`Transform`) from an *instance*
(`transform`) — `get_type_hints` needs the class, not an instance, mirroring
how `fields()` itself works with either but reflection tools generally
expect the class.

**`getattr(transform, f.name)`** / **`setattr(self.target, self.attr_name, ...)`**
`getattr`/`setattr` read or write an attribute using its **name as a
string**, rather than a hardcoded `transform.x`. This is precisely what
makes the code generic — it works identically whether `f.name` is `"x"`,
`"rotation"`, or a field that doesn't exist yet at the time this code was
written. `SetAttrCommand` is deliberately generic for the same reason —
one command class, driven by a string attribute name, replacing what would
otherwise need to be a separate `QUndoCommand` subclass per field.

**`self.old_value = getattr(target, attr_name)`**
Directly connects back to Lesson 8's trap: here, `old_value` is always a
`float`, `bool`, or `str` — every one of which is **immutable** — so
there's no possibility of the aliasing bug from Lesson 8's
`BrokenMoveCommand`, where a captured reference to a *mutable* object
silently became "the new value" by the time `undo()` read it. This
generic command only works safely *because* it operates one primitive
field at a time, never a whole mutable object.

**`with QSignalBlocker(widget): widget.setValue(value)`** (repeated
throughout `_make_widget` and `refresh_from_target`)
Exactly Lesson 10's fix, applied here for the same underlying reason:
every widget in this panel has a connected "user changed this" handler
(`valueChanged`, `toggled`, `editingFinished`), and every place this code
*programmatically* sets a widget's displayed value — during initial
construction, and during `refresh_from_target` — must not let that
trigger the same handler a real user edit would, or it would push a
spurious undo command for a change the user never made.

**`lambda new_value, name=field_name: self._on_field_edited(name, new_value)`**
The `name=field_name` default-argument trick deliberately **captures the
current value of `field_name` at the time the lambda is created**, rather
than looking it up later. This matters because this lambda is created
fresh inside a `for` loop, once per field — without `name=field_name`
defaulting it in, every one of these lambdas would share the *same*
`field_name` variable from the enclosing scope, and by the time any of
them actually ran (after the loop has finished), `field_name` would hold
whatever its *last* value was for every single lambda — a classic Python
closure trap, distinct in mechanism from the mutable-aliasing traps of
earlier lessons, but similarly rooted in "a name refers to something that
can change out from under you" if you're not deliberate about it.

### Why this design?
```
design_decision:
  problem: "how do you build an editable form for an arbitrary dataclass without writing one hand-coded widget-wiring block per field, per class?"
  available_choices:
    - "hand-write a QDoubleSpinBox/QLineEdit/etc. block for every known field of every known dataclass"
    - "reflect over fields()/get_type_hints() and generate widgets generically, keyed by field name via getattr/setattr"
  selected_choice: "reflection-based generation"
  reason: "Transform today has 4 fields; GameObject and future component types will have more, and hand-written Inspector code would need editing every time any of them changes shape"
  benefit: "adding a field to Transform (or any future dataclass shown in the Inspector) requires zero Inspector code changes"
  cost: "type-to-widget mapping logic is more abstract and must correctly handle every type that could appear — an unmapped type currently falls back to a plain QLineEdit + str(), which is a reasonable default but not necessarily ideal for every type"
  future_revisit_condition: "an enum-typed field would currently fall through to the QLineEdit branch; Phase 7's later polish should add a QComboBox branch keyed off checking whether field_type is an Enum subclass"
```

---

## 6. Trap

**Normal rule (Sections 2–3):** `dataclasses.fields()[i].type` may be a
real type object or a string, and code relying on it directly for type
comparisons must account for that — which is exactly why Section 5's real
code uses `get_type_hints` instead of `f.type` directly.

**Apparently equivalent code** — someone reasonably "simplifies" the
Inspector by skipping the `get_type_hints` call, reasoning that
`Transform`'s own file doesn't use `from __future__ import annotations`,
so `f.type` should be fine:

```python
def _make_widget(self, f, value):
    if f.type is float:          # using f.type directly, not hints[f.name]
        widget = QDoubleSpinBox()
    ...
```

This works, and passes every test — **until** some later lesson or some
other contributor adds `from __future__ import annotations` to the top of
`forge/model.py`, for a completely unrelated reason (say, to clean up a
forward-reference elsewhere in that same file, exactly the kind of
motivation Lesson 3 already gave you for `GameObject`'s `children` field).

**Surprising result:** the Inspector doesn't crash. It doesn't error at
all. Every field silently falls through to the generic `QLineEdit`
branch — `x`, `y`, `rotation`, `scale` all now render as plain text
fields instead of number spinboxes, with no exception anywhere to point
you at the cause, because `"float" is float` is simply `False`, quietly,
every time.

**Exact reason:** exactly Section 3's mechanism — `from __future__ import
annotations` changed every annotation in `forge/model.py`, including
`Transform`'s, from real type objects into strings, and `f.type is float`
silently and permanently stopped matching, with no error to signal that
anything had changed.

**Project consequence:** **any code reflecting over dataclass field types
for behavior-affecting decisions (not just display, like this Inspector)
must use `get_type_hints()`, never `Field.type` directly** — this is a
project-wide rule, not something local to `InspectorPanel`, because the
failure mode is silent and the actual cause (a `from __future__ import`
line, possibly in a completely different file than the one exhibiting the
bug) is genuinely difficult to guess at without already knowing this
lesson's mechanism.

---

## 7. Exercise

**Predict:** If `Transform` gains a new field, `locked: bool = False`,
with no other code changes anywhere, what will `InspectorPanel.set_target`
produce for that field the next time it runs? Trace through `_make_widget`
to justify your answer rather than guessing.

**Modify:** `_on_field_edited` currently always constructs a
`SetAttrCommand` targeting `self.target.transform`. Generalize it to
accept a target object as a parameter (rather than hardcoding
`.transform`), so the same `InspectorPanel` could, in a future lesson,
show fields belonging to `GameObject` itself (like `name`) alongside
`Transform`'s fields, each row correctly pushing commands against the
right object.

**Break:** Remove the `name=field_name` default-argument capture from one
of the three `lambda`s in `_make_widget`, leaving a bare
`lambda new_value: self._on_field_edited(field_name, new_value)`. Build an
Inspector for a dataclass with at least 3 fields, edit each field's widget
in turn, and observe which field name(s) actually get passed to
`_on_field_edited`. Does the result match "every lambda shares the loop
variable's final value" from Section 5's explanation?

**Trace:** Walk through, step by step, what happens when: (1) the user
edits the `x` spin box directly, versus (2) an undo/redo elsewhere in the
app changes `transform.x` and something calls `inspector.refresh_from_target()`
afterward. At which exact line does each path either push a new
`SetAttrCommand`, or deliberately avoid doing so — and why must those two
paths behave differently even though both ultimately change the same
underlying value?

---

## What to remember
1. `dataclasses.fields()` lets you build UI (or any behavior) generically from a class's own structure, instead of hand-writing one block per field per class.
2. A field's `.type` may be a real type object or a plain string depending on whether `from __future__ import annotations` is active where the class was *defined* — a fact invisible from the call site doing the reflecting.
3. `typing.get_type_hints()` always resolves annotations to real type objects, regardless of that setting, and is the correct tool for any type-based reflection logic.
4. A generic `SetAttrCommand`, driven by an attribute name string, can replace many hand-written `QUndoCommand` subclasses — safely, as long as the values it captures are immutable (Lesson 8's trap doesn't apply to primitives).
5. A `lambda` created inside a loop that needs the loop variable's *current* value at creation time must capture it via a default argument (`name=field_name`), or every such lambda will see only the loop's final value once actually called.

## Next lesson
Lesson 12 wires selection together across three panels at once: clicking
an object in the Scene Tree, clicking one in the Viewport, and the
Inspector all need to agree on "what's currently selected" — using Qt
signals to keep three independent widgets synchronized without any one of
them directly depending on the other two's internals.
