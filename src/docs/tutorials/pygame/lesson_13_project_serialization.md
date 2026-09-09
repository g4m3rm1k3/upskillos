# Lesson 13 — Saving and Loading a Whole Project

## What you'll learn
- Extending Lesson 3's single-object JSON round trip to a full scene (many root objects) plus a project-file envelope
- Why a `"version"` field belongs in a save format from day one, not added later "when needed"
- A real, quiet correctness bug: forgetting to clear `QUndoStack` after loading a new project leaves stale commands holding references to objects that no longer belong to the scene at all
- Basic, deliberate error handling for a corrupted or malformed project file

## What you'll build
`save_project`/`load_project` — real file I/O wrapping Lesson 3's
`GameObject.to_json`/`from_dict`, plus `EditorWindow.open_project`, which
correctly resets the Scene Tree, Selection, and Undo Stack together, as
one coordinated operation, when a different project is loaded.

## The question
Lesson 3 already showed a `GameObject` (including its children) round-
tripping through JSON. A real scene, though, is a *list* of root-level
objects, not one. And loading a *different* project doesn't just mean
"replace the data" — three other pieces of state (the Scene Tree's
displayed items, the current selection, and the undo history) all
implicitly refer to the *previous* project's objects. What happens to
each of those three if you only swap out the data and forget about them?

---

## 1. Predict

Suppose the user: opens Project A, moves an object (pushing a
`SetAttrCommand` onto the undo stack, Lesson 11), then opens Project B
(a completely different file, different objects) without the undo stack
being cleared. If the user now presses Ctrl+Z, what do you expect to
happen — an error, a visible change to Project B's scene, or something
else entirely? Think about what `SetAttrCommand.undo()` actually does
(Lesson 11: `setattr(self.target, self.attr_name, self.old_value)`) and
which specific object `self.target` refers to.

---

## 2. Try it

```python
from pathlib import Path
import json
from forge.model import GameObject, Transform

def save_project(path: Path, roots: list[GameObject]) -> None:
    data = {
        "version": 1,
        "roots": [obj_to_dict(obj) for obj in roots],
    }
    path.write_text(json.dumps(data, indent=2))

def obj_to_dict(obj: GameObject) -> dict:
    from dataclasses import asdict
    return asdict(obj)

def load_project(path: Path) -> list[GameObject]:
    data = json.loads(path.read_text())
    return [GameObject.from_dict(d) for d in data["roots"]]


roots = [
    GameObject(name="Player", transform=Transform(x=10, y=20)),
    GameObject(name="Enemy", transform=Transform(x=100, y=50)),
]
save_project(Path("test_project.forge"), roots)
loaded = load_project(Path("test_project.forge"))
print(loaded == roots)   # True
```

### What this code does (mechanical explanation)

**`data = {"version": 1, "roots": [...]}`**
The saved file is not *just* a list of objects — it's wrapped in a small
**envelope** dictionary with a `"version"` key alongside the actual scene
data. This is the first new idea in this lesson, and it's deliberate
enough to deserve its own explanation in Section 3, not just a mechanical
note — the file could have been saved as a bare JSON list of roots
instead, and the reasoning for *not* doing that is the point.

**`[obj_to_dict(obj) for obj in roots]`**
A list comprehension converting every root `GameObject` — each
potentially containing its own nested children, exactly as in Lesson 3 —
into a plain dictionary via `asdict`, one entry per root.

**`path.write_text(json.dumps(data, indent=2))`**
`Path.write_text` (from `pathlib`, first introduced in Lesson 5) writes a
string directly to a file, creating it if it doesn't exist, overwriting it
if it does. `json.dumps` here serializes the **entire envelope**,
including `"version"` and the full `"roots"` list — this is exactly
Lesson 3's `to_json` mechanism, just applied to a dictionary containing
several `GameObject` trees instead of calling `.to_json()` on one object
directly.

**`data = json.loads(path.read_text())`**
The reverse: read the file's text, parse it back into plain Python
dicts/lists — still just data at this point, not `GameObject`s.

**`[GameObject.from_dict(d) for d in data["roots"]]`**
Applies Lesson 3's `from_dict` (which already handles nested children
recursively) to each entry under `"roots"`, producing real, independent
`GameObject` trees.

**`loaded == roots`** → `True`
Lesson 3's generated `__eq__`, recursively through nested `GameObject`s
and `Transform`s, confirms the round trip preserved every value exactly —
the same verification approach from Lesson 3, now applied to a whole
project instead of one object.

---

## 3. Why?

### Why a `"version"` field, from the very first save format

A project file format is a **contract with the future**. The very first
version of Forge's save format is not going to be its last — Phase 6 will
eventually want to save `AnimationClip` data too; some future feature
might restructure how `Transform` is represented. Without a version
number, a loader has no way to tell "is this an old file using an older
shape, or a corrupted one" — it would simply fail confusingly on old
files the moment the format changes, with no way to write code that
adapts. With a version number present from the start, a future
`load_project` can branch (`if data["version"] == 1: ... elif == 2: ...`)
to correctly read *either* an old or a new file, migrating as needed. Not
building this in "for now, since there's only one version" is exactly the
kind of decision that's cheap to make correctly today and expensive to
retrofit once real project files already exist on someone's disk.

### The three pieces of state a "new project" implicitly invalidates

```
Loading a new project changes: the actual GameObject data (the scene)

But three OTHER pieces of state still, silently, refer to the OLD data:
  1. SceneTreeWidget's displayed items — built from the old objects
  2. SelectionModel._current — very possibly a GameObject from the old scene
  3. QUndoStack's stored commands — each holding direct references
     (self.target) to old objects (Lesson 11's SetAttrCommand)
```

Simply reassigning "the scene" to the new data does nothing to any of
these three — they don't watch the scene for changes; they hold whatever
references they were given, whenever they were given them, exactly like
every reference-vs-copy lesson in this project so far.

---

## 4. Change one thing — a real error path

```diff
 def load_project(path: Path) -> list[GameObject]:
-    data = json.loads(path.read_text())
-    return [GameObject.from_dict(d) for d in data["roots"]]
+    try:
+        data = json.loads(path.read_text())
+    except FileNotFoundError:
+        raise ProjectLoadError(f"No such file: {path}")
+    except json.JSONDecodeError as e:
+        raise ProjectLoadError(f"{path} is not valid JSON: {e}")
+
+    if "version" not in data:
+        raise ProjectLoadError(f"{path} is missing a version field")
+    if data["version"] != 1:
+        raise ProjectLoadError(f"Unsupported project version: {data['version']}")
+
+    try:
+        return [GameObject.from_dict(d) for d in data["roots"]]
+    except (KeyError, TypeError) as e:
+        raise ProjectLoadError(f"{path} is malformed: {e}")
```

```python
class ProjectLoadError(Exception):
    """Raised when a .forge project file can't be loaded."""
```

### What changed
Three separate failure modes — a missing file, invalid JSON, and a
malformed-but-valid-JSON structure — are now caught individually and
re-raised as one consistent, project-specific exception type,
`ProjectLoadError`, with a message describing *what* actually went wrong.

### What did not change
The success path — `[GameObject.from_dict(d) for d in data["roots"]]` — is
identical to before; only the surrounding error handling is new.

```
change_analysis:
  changed: "wrapped file reading, JSON parsing, version checking, and object reconstruction in explicit error handling raising a custom ProjectLoadError"
  unchanged:
    - "the successful-load code path and its result"
  behavioral_difference:
    - "callers now get one predictable exception type with a clear message for any failure, instead of a mix of FileNotFoundError, JSONDecodeError, or a raw KeyError from a missing dict key deep inside from_dict"
  compiler_difference:
    - "none"
  runtime_difference:
    - "each specific failure mode is checked and translated at the point it occurs, rather than letting whatever low-level exception happened to be raised propagate up unexplained"
```

**Why a custom exception class, specifically:** `class ProjectLoadError(Exception):`
defines a new exception type by inheriting from the built-in `Exception`
— this is the first custom exception in this project. Code calling
`load_project` (Section 5) can now write one `except ProjectLoadError:`
clause and handle *any* of these distinct underlying problems the same
way (e.g., show the user one dialog with the message), rather than needing
to know and catch three or four unrelated built-in exception types
individually.

**Connecting back to Lesson 3's stated cost:** Lesson 3's design-decision
block for `@dataclass` explicitly named "no runtime validation" as a known
cost of that choice. This is that cost, addressed directly, at exactly
the boundary where it matters most — reading a file that could have been
hand-edited, corrupted, or produced by a future, incompatible version of
Forge — rather than everywhere `GameObject` is used internally, where the
data is already known-good.

---

## 5. Put it in the project

```python
# forge/editor_window.py — extending Lesson 12's version
from pathlib import Path
from forge.project_file import save_project, load_project, ProjectLoadError


class EditorWindow(QMainWindow):
    # ... __init__ from Lesson 12, unchanged, plus:

    def open_project(self, path: Path) -> None:
        try:
            roots = load_project(path)
        except ProjectLoadError as e:
            print(f"Could not open project: {e}")  # Phase 8 will replace this with a real dialog
            return

        self.selection_model.select(None)
        self.scene_tree.populate(roots)
        self.undo_stack.clear()
        self.current_project_path = path
        self.current_roots = roots

    def save_current_project(self) -> None:
        if self.current_project_path is None:
            return
        save_project(self.current_project_path, self.current_roots)
```

### Code walkthrough — what's new, and why the order matters

**`self.selection_model.select(None)`** — called **first**
Recall Lesson 12: `SelectionModel.select` only does anything if the new
value differs by identity from the current one. Clearing selection
*before* replacing the scene data ensures no code path can end up with
`selection_model._current` pointing at an object that's about to become
orphaned — if this were skipped, `_current` would keep referencing an
old-project `GameObject` until something else happened to select a new
one, and any code trusting "there is a current selection, therefore it
belongs to the current scene" would be wrong in the meantime.

**`self.scene_tree.populate(roots)`** — called **second**
Lesson 12's `populate` method already fully rebuilds `_items_by_object`
and the visible list from scratch (`self.clear()` at its start) — it was
written, back in Lesson 12, in a way that already correctly handles being
called again with an entirely new set of objects, which is exactly this
situation, arriving for real.

**`self.undo_stack.clear()`** — called **third**
This is the line Section 6's trap is entirely about. `QUndoStack.clear()`
discards every stored command — both the undo history and any pending
redo history — releasing every reference those commands held to
old-project objects. Order relative to the other two calls here doesn't
matter as much as the fact that it happens **at all**, every time a new
project is loaded, without exception.

**`self.current_project_path`** / **`self.current_roots`**
Plain attributes tracking "what's currently open," so `save_current_project`
knows where to write back to and what data to write, without needing
those to be passed in as arguments every time — a reasonable, simple
approach for now (Phase 8's polish could extend this toward a proper
"recent files" list or "unsaved changes" tracking).

### Why this design?
```
design_decision:
  problem: "loading a new project touches at least four independent pieces of state (scene data, selection, tree display, undo history) — how do you make sure all four actually get updated together, correctly, every time?"
  available_choices:
    - "let each panel/component notice a new project was loaded and update itself independently, however it sees fit"
    - "one coordinating method (EditorWindow.open_project) explicitly sequences all four updates in one place"
  selected_choice: "one coordinating method"
  reason: "these four pieces of state have real ordering dependencies (selection must be cleared before old objects are discarded; undo history must be cleared or it holds dangling references) that are easy to get right in one sequential method and easy to silently get wrong if scattered across independent listeners"
  benefit: "there is exactly one place to look to understand 'what happens when a project loads,' and exactly one place to fix if a fifth piece of state needs the same treatment later"
  cost: "EditorWindow now needs to know about the undo stack, selection model, and scene tree all directly, rather than each being fully independent of it"
  future_revisit_condition: "if 'unsaved changes' warnings are added (Phase 8), this exact method is where a check-before-discarding-the-old-project step belongs"
```

---

## 6. Trap

**Normal rule (Section 5):** `open_project` calls `self.undo_stack.clear()`
as part of loading any new project, discarding every stored command along
with the object references they hold.

**Apparently equivalent code** — someone reasonably assumes replacing the
scene data is enough, since the undo stack is "just history," and skips
the clear call to "keep it simple":

```python
def open_project(self, path: Path) -> None:
    roots = load_project(path)   # loads Project B
    self.selection_model.select(None)
    self.scene_tree.populate(roots)
    # undo_stack.clear() omitted — "the old commands are harmless, they're just history"
    self.current_roots = roots
```

**Surprising result:** the user has Project A open, moves an object
(`SetAttrCommand` pushed), opens Project B via this version of
`open_project`, sees Project B's scene displayed correctly — and then
presses Ctrl+Z, expecting either "nothing happens" or an error. Instead,
**nothing visible happens, but it isn't a no-op** — the old
`SetAttrCommand.undo()` genuinely runs, genuinely calls
`setattr(self.target, self.attr_name, self.old_value)` on Project A's
now-discarded `GameObject`, correctly restoring *that* object's field to
its old value — an object that isn't part of the currently displayed
scene, isn't reachable through `self.current_roots`, and yet is being
mutated right now, kept alive purely because the stale `SetAttrCommand`
still holds a reference to it (Lesson 2's ownership discussion again:
holding a reference is what keeps an object alive, regardless of whether
it's still "in use" in any meaningful sense).

**Exact reason:** the undo stack's stored `SetAttrCommand` objects hold
direct references to Project A's `GameObject`s (Lesson 11:
`self.target = target`) — those references don't become invalid or get
automatically cleaned up just because a *different* `roots` list was
assigned elsewhere. The command doesn't know or care that "the current
project" changed; it only knows the specific object it was built to edit,
and it will happily edit that object again, from beyond its own project's
lifetime, the instant `stack.undo()` calls it.

**Project consequence:** **any state that holds direct object references
tied to "the currently open project" must be explicitly reset whenever a
different project is loaded — there is no automatic mechanism that does
this for you.** This is precisely why Section 5's `open_project` treats
`undo_stack.clear()` as mandatory, not optional cleanup — skipping it
doesn't produce a crash or an obvious error, which is exactly what makes
it dangerous: the bug is a wasted, confusing Ctrl+Z with no visible effect
on the screen the user is actually looking at, and no indication anywhere
of what actually happened instead.

---

## 7. Exercise

**Predict:** If `self.undo_stack.clear()` in `open_project` were replaced
with `self.undo_stack = QUndoStack(self)` (constructing a brand-new stack
instead of clearing the existing one), would this also fix the trap's
bug? What's different about the *old* `QUndoStack` object in this version
— is it still referenced by anything, and does that matter here the way
it mattered for the old `GameObject`s?

**Modify:** `load_project`'s error handling (Section 4) currently prints
to the console. Change `EditorWindow.open_project` so a failed load shows
a `QMessageBox` (look up `QMessageBox.warning`) with the `ProjectLoadError`'s
message, instead of a `print`.

**Break:** Deliberately hand-edit a saved `.forge` file's JSON to change
`"version": 1` to `"version": 2`, leaving everything else intact, and try
to open it with the code from Section 4. Confirm you get a
`ProjectLoadError` with a clear message rather than a confusing crash
somewhere inside `GameObject.from_dict`. Now do the same test but instead
delete the `"roots"` key entirely — does the error message still clearly
identify what's wrong?

**Trace:** Write out, step by step, everything that happens — in the
*correct*, Section-5 version of `open_project` — from the moment
`open_project(path_to_project_b)` is called while Project A is open with
one pushed `SetAttrCommand`, up through the point where the old
`SetAttrCommand` object itself becomes eligible for garbage collection.
Name specifically which line removes the last remaining reference to it.

---

## What to remember
1. A save-file format should include a version field from its very first version — retrofitting one onto files that already exist is far more painful than including one from the start.
2. Loading a new project isn't just "replace the data" — every piece of state elsewhere in the app that holds direct references to the *old* data (selection, undo history, displayed UI items) must be explicitly reset too.
3. `QUndoStack.clear()` is not optional cleanup when switching projects — stale commands holding references to discarded objects will happily run their `undo()`/`redo()` against those orphaned objects, silently, with no visible effect on the currently displayed scene.
4. Wrapping distinct low-level failure modes (missing file, invalid JSON, malformed structure) in one custom exception type gives callers a single, predictable way to handle "loading failed," instead of needing to know every possible underlying exception.
5. Holding a reference to an object is what keeps it alive in Python, regardless of whether that object is still meaningfully "in use" by the rest of the program — the same fact from Lesson 2's widget-ownership discussion, now explaining a save/load correctness bug instead of a UI-rendering one.

## Next lesson
Lesson 14 begins Phase 8: writing `pytest` tests for the data model and
serialization layer specifically — and an explicit discussion of *why*
this project deliberately does **not** try to write automated tests for
the Qt/pygame-rendering side of the code, which is a real, considered
testing-strategy decision, not an oversight.
