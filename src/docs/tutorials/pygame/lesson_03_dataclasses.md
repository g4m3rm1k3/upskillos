# Lesson 3 — `dataclasses`: The `Transform` and `GameObject` Data Model

## What you'll learn
- What `@dataclass` actually generates for you, and why "plain classes" don't give you this for free
- The difference between a type hint (compile-time-ish documentation) and real runtime behavior
- A genuine, easy-to-hit Python trap involving mutable default values — and the two different ways it shows up
- How to save a dataclass to JSON and rebuild it, exactly

## What you'll build
`Transform` and `GameObject` — the two dataclasses every panel in Forge will
eventually read from and write to. Nothing renders yet; this lesson is
entirely about getting the *data* right, since Phase 6's animation system
and Phase 7's Inspector panel both depend directly on what you build here.

## The question
An editor object — a sprite placed in a scene — needs a position, maybe a
name, maybe child objects nested under it. You could write this as an
ordinary Python class. What does an ordinary class *not* give you for free
that a project like this actually needs?

---

## 1. Predict

```python
class Point:
    def __init__(self, x: int, y: int):
        self.x = x
        self.y = y

a = Point(1, 2)
b = Point(1, 2)
print(a == b)
```

Before running this: `a` and `b` were constructed with identical arguments.
Do you expect `print(a == b)` to output `True` or `False`? Also predict:
what would `print(a)` show?

---

## 2. Try it

Run the code above first and note the two answers. Then run this:

```python
from dataclasses import dataclass

@dataclass
class Point:
    x: int
    y: int

a = Point(1, 2)
b = Point(1, 2)
print(a == b)
print(a)
```

### What this code does (mechanical explanation)

**`from dataclasses import dataclass`**
`dataclasses` is a Python standard-library module. `dataclass` is a
**decorator** — a callable that takes a class and returns a (possibly
modified) class. This is the first decorator you've used in this project;
the `@` syntax below is exactly equivalent to writing
`Point = dataclass(Point)` immediately after the class body finishes
executing.

**`@dataclass`**
Applied directly above the `class Point:` line, this decorator runs
**once, at class-definition time** — when Python first executes this file
and reaches this class, not each time you construct a `Point`. It inspects
the class body for type-annotated attributes (`x: int`, `y: int`) and, from
that, generates several methods and attaches them to the class before the
class object is finalized.

**`class Point:` with `x: int` and `y: int` as the only body**
This is different from Lesson-1-style code you may have seen elsewhere.
`x: int` here is **not** a normal assignment (there's no `=`) — it's a
**class-level variable annotation with no value**. On its own, without
`@dataclass`, this line would do almost nothing at runtime beyond recording
type-hint metadata; it would **not** create an instance attribute or a
constructor parameter. `@dataclass` is what scans these annotations and
turns each one into a real constructor parameter and instance attribute.

**`a = Point(1, 2)`**
This calls a constructor `@dataclass` generated for you — `__init__(self,
x: int, y: int)` — which you never wrote. Positional arguments `1` and `2`
map to `x` and `y` in the order they were declared in the class body.

**`print(a == b)` → `True`**
`@dataclass` also generates `__eq__(self, other)`, which compares `Point`
instances **field by field** (`self.x == other.x and self.y == other.y`),
not by identity. This is why the answer differs from the plain-class
version — a plain class falls back to Python's default `__eq__`, inherited
from `object`, which compares by identity (are these literally the same
object in memory?), not by value.

**`print(a)` → `Point(x=1, y=2)`**
`@dataclass` also generates `__repr__`, producing a readable,
constructor-like string. The plain class version instead falls back to
`object`'s default `__repr__`, something like
`<__main__.Point object at 0x7f...>` — the raw memory address, useless for
debugging.

---

## 3. Why?

### The underlying mechanism — three generated levels

```
source code
  ↓
language semantics
  ↓
generated/compiled representation
  ↓
runtime behavior
```

**Source:** you write two annotated lines, `x: int` and `y: int`, plus one
decorator line.

**Language semantics:** a class-level annotation without a value is a
*hint*, recorded in the class's `__annotations__` dictionary — it does not
by itself create behavior. `@dataclass` is a decorator, meaning it executes
with the fully-defined (but not yet finalized) class object as its input.

**Generated members:** `@dataclass` reads `__annotations__` and attaches,
onto the class, an `__init__` with one parameter per annotated field (in
declaration order), an `__eq__` comparing all fields, and a `__repr__`
listing all fields — none of which you wrote by hand.

**Runtime consequence:** two separately constructed `Point` objects with
equal field values compare equal with `==`, and print in a readable form —
without you writing a single line of boilerplate for either behavior.

Do not collapse this into "the decorator makes it a nicer class" — the
mechanism is specifically: *annotations are data the decorator reads, and
it generates real methods from that data.*

### Static vs. runtime — the type hints are NOT enforced

```python
p = Point("not an int", 2)   # runs without error
print(p)                     # Point(x='not an int', y=2)
```

`x: int` is a **hint**, consumed by `@dataclass` only to know *that a field
named `x` exists* — not to validate that whatever you pass in at
construction is actually an `int`. Python performs no runtime type
checking here. Tools like `mypy`, and your editor's autocompletion, use
these same annotations for *static* analysis — catching this kind of
mistake before you run the program — but nothing stops you from running
the (type-incorrect) code above and getting a working, if wrong, `Point`.

```
behavior:
  compile_time:
    - "type checkers (mypy, IDE inference) use the annotation to flag Point('x', 2) as wrong"
  runtime:
    - "@dataclass reads annotations only to know field names/order/defaults, never to validate types"
    - "Python performs no automatic type enforcement anywhere here"
```

---

## 4. Change one thing

```diff
 @dataclass
 class Point:
     x: int
     y: int
+    tags: list = []
```

Run it. You do not get a working dataclass — you get, immediately, at
class-definition time (before you ever construct a `Point`):

```
ValueError: mutable default <class 'list'> for field tags is not allowed:
use default_factory
```

### What changed
One field added, given a *mutable* default value (`[]`, an empty list).

### What did not change
- `x` and `y` — unaffected, no defaults, still required constructor arguments
- The decorator, the class name, everything else

```
change_analysis:
  changed: "added tags: list = [] as a third field"
  unchanged:
    - "x and y fields and their generated behavior"
    - "the @dataclass decorator itself"
  behavioral_difference:
    - "the class fails to be created at all — this is a definition-time error, not a construction-time error"
  compiler_difference:
    - "none — Python has no separate compiler pass here; this is @dataclass's own runtime check when it processes the class"
  runtime_difference:
    - "raises ValueError as soon as the module is loaded/imported, before any Point() is ever constructed"
```

### Why this is deliberately blocked — the trap, generalized

This is `@dataclass` protecting you from a well-known, older Python trap:
**mutable default arguments are shared across every call/instance that
doesn't override them**, because a default value is evaluated exactly
**once**, when the function/class is defined — not fresh, per call.

You can see the *ordinary function* version of the same trap without
dataclasses at all:

```python
def add_tag(tag, tags=[]):   # the [] is created ONCE, at def-time
    tags.append(tag)
    return tags

print(add_tag("a"))   # ['a']
print(add_tag("b"))   # ['a', 'b']  <- surprising! not a fresh list
```

`@dataclass` refuses to let you write the dataclass equivalent of this bug
by raising `ValueError` immediately, rather than letting you silently ship
a `GameObject` class where every instance's `tags` list is secretly the
*same* list object.

**The fix — `default_factory`:**
```python
from dataclasses import dataclass, field

@dataclass
class Point:
    x: int
    y: int
    tags: list = field(default_factory=list)
```

`field(default_factory=list)` tells `@dataclass` to call `list()` **fresh,
inside `__init__`, for every new instance**, instead of sharing one list
object across all instances. `field(...)` itself is a small configuration
object — you're not assigning `tags` a *value* anymore, you're telling the
generated `__init__` *how to compute* the value per-instance.

---

## 5. Put it in the project

```python
# forge/model.py
from dataclasses import dataclass, field
from typing import Any
import json
from dataclasses import asdict


@dataclass
class Transform:
    x: float = 0.0
    y: float = 0.0
    rotation: float = 0.0
    scale: float = 1.0


@dataclass
class GameObject:
    name: str
    transform: Transform = field(default_factory=Transform)
    children: list["GameObject"] = field(default_factory=list)

    def to_json(self) -> str:
        return json.dumps(asdict(self), indent=2)

    @staticmethod
    def from_dict(data: dict[str, Any]) -> "GameObject":
        transform = Transform(**data["transform"])
        children = [GameObject.from_dict(c) for c in data["children"]]
        return GameObject(name=data["name"], transform=transform, children=children)
```

```python
# quick manual check, not yet a real test (Phase 8 covers pytest properly)
player = GameObject(name="Player", transform=Transform(x=10, y=20))
player.children.append(GameObject(name="Weapon", transform=Transform(x=1, y=0)))

as_text = player.to_json()
print(as_text)

reloaded = GameObject.from_dict(json.loads(as_text))
print(reloaded == player)   # True
```

### Code walkthrough

**`transform: Transform = field(default_factory=Transform)`**
Same mechanism as the `tags` fix above, but the factory is a *class*
(`Transform`) rather than a builtin like `list`. `Transform` is callable —
calling `Transform()` constructs a fresh, default `Transform` instance —
so it's a valid `default_factory`. Every `GameObject` created without
specifying a `transform` gets its **own** fresh `Transform(0.0, 0.0, 0.0,
1.0)`, not a shared one.

**`children: list["GameObject"] = field(default_factory=list)`**
Two things worth separating:
- `field(default_factory=list)` — same mutable-default fix as before,
  necessary because a `GameObject` can contain other `GameObject`s and
  every instance needs its own independent list.
- `list["GameObject"]` with `"GameObject"` **in quotes** — this is a
  **forward reference**. At the point this line is being defined, the
  `GameObject` class itself is still being constructed and doesn't fully
  exist as a usable name yet. Quoting it as a string defers evaluation —
  type checkers and `dataclasses` understand this convention and resolve
  it against the eventually-completed class. Writing it unquoted
  (`list[GameObject]`) here would raise a `NameError`, since `GameObject`
  isn't defined yet at that exact line.

**`def to_json(self) -> str:`**
An ordinary instance method — `@dataclass` generates `__init__`/`__eq__`/
`__repr__` for you, but it does **not** stop you from adding your own
regular methods in the class body exactly as you would in any class.
`asdict(self)` (imported from `dataclasses`) recursively converts a
dataclass instance — including any nested dataclasses, like `transform`,
and dataclasses inside lists, like `children` — into a plain, JSON-friendly
dictionary structure. `json.dumps` then serializes that dictionary to a
string. `indent=2` is purely cosmetic, for human-readable output.

**`@staticmethod`** / **`from_dict`**
`@staticmethod` is another decorator, marking that this method **does not
receive `self`** — it doesn't operate on an existing instance, it *builds*
one, which is exactly why it's named `from_dict` (a common convention for
"alternate constructor" methods across Python codebases). Note the
recursion: `GameObject.from_dict(c) for c in data["children"]` — each
child dictionary is turned back into a real `GameObject` by calling
`from_dict` again, which is what correctly reconstructs a nested tree of
arbitrary depth, not just one flat level.

### Execution trace — the full round trip

```
1. GameObject(name="Player", transform=Transform(x=10, y=20)) constructed
   → transform's rotation/scale take their defaults (0.0 / 1.0)
   → children defaults to a fresh empty list (its own default_factory call)
2. player.children.append(...) mutates that list in place
3. player.to_json() calls asdict(player)
   → recursively walks: GameObject → its Transform → its children list → each child GameObject → their Transform
   → produces a plain nested dict, no dataclass objects remain
4. json.dumps(...) turns that dict into a JSON-formatted string
5. json.loads(as_text) parses the string back into plain dicts/lists
   → note: still plain dicts here, NOT GameObject/Transform objects yet
6. GameObject.from_dict(...) walks that plain-dict structure
   → Transform(**data["transform"]) unpacks the transform dict as keyword
     arguments into a real Transform instance
   → recursively rebuilds each child as a real GameObject
7. reloaded is a fully independent GameObject tree, structurally identical
   → reloaded == player is True because of @dataclass's generated,
     field-by-field __eq__ — recursively, since Transform and the nested
     GameObjects are dataclasses too
```

### Why this design?
```
design_decision:
  problem: "how should Forge represent an object placed in a scene, in a way that survives being saved to disk and reloaded?"
  available_choices:
    - "plain classes with hand-written __init__/__eq__/to_json"
    - "@dataclass with default_factory and asdict-based serialization"
    - "a third-party schema/validation library (e.g. pydantic)"
  selected_choice: "@dataclass"
  reason: "zero extra dependency, standard library, and the generated __eq__ is exactly what round-trip tests in Phase 8 will rely on"
  benefit: "less boilerplate, and type hints double as documentation the Inspector panel (Phase 7) can introspect via dataclasses.fields()"
  cost: "no runtime validation — a corrupted project file could load bad data (e.g. a string where a float belongs) without immediately erroring"
  future_revisit_condition: "if project files start coming from untrusted sources or need strict validation, revisit pydantic or manual checks in from_dict"
```

---

## 6. Trap

**Normal rule:** `@dataclass`'s generated `__eq__` compares fields
value-by-value, recursively through nested dataclasses (Section 5's
execution trace, step 7).

**Apparently equivalent code:**
```python
seq_a = GameObject(name="A", children=[GameObject(name="Child")])
seq_b = GameObject(name="A", children=[GameObject(name="Child")])
print(seq_a == seq_b)
```

**Result:** `True` — this one actually works as expected, because `list`
itself defines `__eq__` to compare element-by-element, and `GameObject`'s
generated `__eq__` compares its fields (including that `children` list)
recursively. Good — but now compare it against a case using something
Python's `list.__eq__` also handles correctly, versus a real trap case:

```python
from dataclasses import dataclass

@dataclass
class Sequence:
    operations: list

op_list = ["MOVE", "ROTATE"]
seq1 = Sequence(operations=op_list)
seq2 = Sequence(operations=op_list)

print(seq1 == seq2)          # True — same values
seq1.operations.append("SCALE")
print(seq1 == seq2)          # True AGAIN — surprising?
print(seq1.operations)       # ['MOVE', 'ROTATE', 'SCALE']
print(seq2.operations)       # ['MOVE', 'ROTATE', 'SCALE']  <- also changed!
```

**Surprising result:** appending to `seq1.operations` also changed
`seq2.operations`, even though you never touched `seq2` directly.

**Exact reason:** `seq1` and `seq2` were both constructed by passing the
**same** `op_list` object as the `operations` argument — dataclasses do
**not** copy mutable arguments you pass in explicitly; they only protect
you from *shared defaults* (Section 4's fix), not from you *deliberately*
handing two instances the same mutable object. `seq1.operations` and
`seq2.operations` are two names pointing at the exact same list in memory.

**Project consequence:** whenever Forge code needs two `GameObject`s to
have *independently mutable* children/lists — e.g., duplicating an object
in the Scene Tree — you must construct a **new** list explicitly
(`list(original.children)`, or a full deep copy for nested dataclasses),
never pass the same list reference into two constructors. This will matter
directly in Phase 7 when you implement "duplicate object."

---

## 7. Exercise

**Predict:** Given `Transform`'s defaults, what does
`Transform() == Transform(x=0.0, y=0.0, rotation=0.0, scale=1.0)` evaluate
to? Why, mechanically?

**Modify:** Add a `visible: bool = True` field to `GameObject`. Does
`to_json`/`from_dict` need any changes to correctly round-trip this new
field? Why or why not — trace through `asdict` and `from_dict` to justify
your answer rather than just testing it.

**Break:** Remove `field(default_factory=list)` from `children` and
replace it with plain `= []`. Run the file. Read the exact error and match
it against Section 4's explanation.

**Trace:** Write out, step by step (like Section 5's execution trace), what
happens when you call `GameObject.from_dict()` on a dictionary that's
**missing** the `"transform"` key entirely. Where, exactly, does it fail?

**Repair:** Using the Trap section's `Sequence` example, write a corrected
version of code that duplicates a `GameObject` (name + a **copy** of its
transform and children, not shared references) using `dataclasses.replace`
or a manually written `duplicate()` method. Verify with `==` that the copy
is equal in value but mutating one doesn't affect the other.

---

## What to remember
1. `@dataclass` reads type annotations at class-definition time and generates `__init__`, `__eq__`, and `__repr__` from them — it doesn't validate types at runtime.
2. Mutable default values are dangerous because they're created once, at definition time, and shared; `@dataclass` blocks the obvious mistake and forces `field(default_factory=...)` instead.
3. `default_factory` fixes *shared defaults*, but does **not** protect you from passing the *same* mutable object into two instances yourself — that's still your responsibility.
4. `asdict()` + `json.dumps()`/`json.loads()` gives you a full round trip, but reconstructing nested dataclasses from plain dicts back into real objects (`from_dict`) has to be written by hand, recursively.
5. Forward references (`list["GameObject"]`, quoted) are needed when a class refers to its own type before its own definition is complete.

## Next lesson
Lesson 4 moves into pygame-ce, deliberately with **no Qt in the room yet**:
`Surface`, `Rect`, and loading/blitting an image. You'll build a small
standalone script that loads a spritesheet and displays one frame of it —
setting up everything Phase 3 needs before Lesson 6 slices that spritesheet
into individual animation frames.
