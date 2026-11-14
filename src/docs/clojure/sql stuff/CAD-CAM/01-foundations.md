# Lesson 01: Foundations (project, tolerance, vectors, tests)

**Goal:** by the end you have an installable Python package with a tested `Vec3` and a `Tolerance` object, and you understand *why* each piece looks the way it does.

**How to use this file:** type the code, don't paste it. Run it after every step. When a section says **Predict**, write your guess down *before* running anything. Wrong guesses are the most valuable part.

---

## 0. The big picture (read once, refer back)

### The pipeline, with hard walls between stages

```
Sketch -> Solid -> (Setup: stock, WCS, tools) -> CAM operations -> Toolpath -> G-code
                                                                               |
                                                  Sim reads ONLY the G-code -> Stock removal -> Checks
```

The sim never sees CAM's internal data. It parses the G-code text the way a controller would. If it peeked at CAM's toolpath, it would only prove CAM agrees with itself. Same reason you inspect a part on a CMM and not by re-reading the CAM program.

Each stage talks to the next through a plain data format (JSON for projects, a list of moves for toolpaths, text for G-code), so any stage can be built and tested alone.

### The four layers (dependencies only point DOWN)

```
UI (pywebview)        <- thin adapter, knows nothing about geometry
Services              <- use-cases: CreateProject, GenerateToolpath, RunSim
Domain                <- geometry, features, tools, toolpaths, G-code. Pure Python: no disk, no DB
Repositories (SQLite) <- the only code that knows SQL
```

**The domain is pure.** That is the most important rule in the whole app. It makes everything testable without a database or a window, and it is what lets you swap SQLite for Postgres later without touching geometry.

### Patterns we will meet (each only when a real problem demands it)

| Need | Pattern | Where |
|---|---|---|
| Save/load without SQL everywhere | Repository + Unit of Work | Tool library, projects |
| Different cutters, different math | Strategy | Flat / ball / bull-nose profiles, stock models |
| JSON says `"type": "pocket"`, you need an object | Factory / Registry | Loading features and CAM ops |
| Feature tree, undo/redo | Command | Extrude, cut, edit |
| Different controllers | Adapter | Posts (Fanuc, Haas, Grbl) |
| G-code modal state (G90, G21, feed) | State | The parser |
| Progress from long jobs | Observer | CAM and sim |
| Two users editing one project | Optimistic locking | Version column |

A pattern with no pain behind it is just ceremony. We introduce each one at the moment the code starts to hurt.

### Roadmap

1. **Foundations: project setup, `Vec3`, tolerance, tests** <- this file
2. Transforms and coordinate frames (machine, work, part)
3. 2D profiles: lines, arcs, offsetting
4. Tools: profile strategies, then SQLite tool library (Repository)
5. Solids: extrude, mesh, booleans
6. Feature tree as commands, persisted as JSON
7. CAM operations and toolpaths
8. G-code post, then the parser
9. Z-map simulation using the tool profile
10. Multiuser: users, ownership, version conflicts
11. pywebview glue

### The tool is a solid of revolution (preview of lesson 4 and 9)

A rotating cutter is fully described by a 2D profile: height as a function of radius, `h(r)`.

- Flat endmill: `h(r) = 0`
- Ball nose, radius `R`: `h(r) = R - sqrt(R^2 - r^2)`
- Bull nose: flat in the middle, rounded at the corner

In a Z-map sim, cutting at `(x, y, z)` means every stock cell within the tool radius becomes `min(current_height, z + h(r))`. One formula, swapped per tool type, is the Strategy pattern, and it is where sim accuracy comes from.

---

## 1. Project setup

```bash
mkdir camlab && cd camlab
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
mkdir -p src/camlab/geometry tests
touch src/camlab/__init__.py src/camlab/geometry/__init__.py
```

(Windows PowerShell has no `touch` or `mkdir -p`; create the folders and empty files in your editor instead.)

Create `pyproject.toml` in the project root:

```toml
[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[project]
name = "camlab"
version = "0.0.1"
requires-python = ">=3.11"
dependencies = ["numpy"]

[tool.setuptools.packages.find]
where = ["src"]

[tool.pytest.ini_options]
testpaths = ["tests"]
```

Install in editable mode:

```bash
pip install -e . pytest
```

### Why it looks like this

- **A script works because you ran it from the right folder. Software works because it is an installed package.** After `pip install -e .`, `from camlab.geometry.vec import Vec3` works from anywhere, including tests.
- **`src/` layout** stops Python from importing your local folder instead of the installed package. Without it you get the classic "tests pass on my machine, fail everywhere else."
- **`-e` (editable)** means the install points at your files, so edits apply immediately.
- **`__init__.py`** marks a folder as a package. Forgetting one gives `ModuleNotFoundError`, the most common beginner wall.

### Gotchas

- Always check your venv is active (`which python` / `where python`) before installing. Installing into the system Python is how people end up with "it worked yesterday."
- If imports fail after setup, run `pip show camlab`. If it isn't listed, the install didn't happen in the venv you're using.

**Checkpoint:** your tree should look like this:

```
camlab/
  pyproject.toml
  src/camlab/__init__.py
  src/camlab/geometry/__init__.py
  tests/
```

---

## 2. Tolerance

Create `src/camlab/geometry/tolerance.py`:

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class Tolerance:
    linear: float = 1e-6    # millimetres
    angular: float = 1e-9   # radians

    def equal(self, a: float, b: float) -> bool:
        return abs(a - b) <= self.linear


DEFAULT = Tolerance()
```

### Why an object and not a constant

- Floats cannot represent most decimals exactly: `0.1 + 0.2 == 0.30000000000000004`. So in geometry, "equal" always means "within a tolerance."
- In CAM, tolerance is a **decision**, not a detail. Roughing toolpath tolerance of 0.01 mm is normal; a solid boolean may need 1e-6. If it's an object, functions can **take it as a parameter** instead of hiding a magic number.
- `frozen=True` makes instances immutable. A tolerance that changes mid-calculation causes bugs that are miserable to trace.
- `@dataclass` writes `__init__`, `__repr__` and `__eq__` for you from the field list.

### Units

Everything in this project is **millimetres and radians internally**. Convert at the edges (UI, G-code G20/G21), never in the middle. Mixed units inside the domain is how real CAD systems have crashed real spacecraft.

---

## 3. Vec3

Create `src/camlab/geometry/vec.py`:

```python
from __future__ import annotations

import math
from dataclasses import dataclass

from .tolerance import DEFAULT, Tolerance


@dataclass(frozen=True, slots=True)
class Vec3:
    x: float
    y: float
    z: float = 0.0

    def __add__(self, o: Vec3) -> Vec3:
        return Vec3(self.x + o.x, self.y + o.y, self.z + o.z)

    def __sub__(self, o: Vec3) -> Vec3:
        return Vec3(self.x - o.x, self.y - o.y, self.z - o.z)

    def __mul__(self, k: float) -> Vec3:
        return Vec3(self.x * k, self.y * k, self.z * k)

    def dot(self, o: Vec3) -> float:
        return self.x * o.x + self.y * o.y + self.z * o.z

    def cross(self, o: Vec3) -> Vec3:
        return Vec3(
            self.y * o.z - self.z * o.y,
            self.z * o.x - self.x * o.z,
            self.x * o.y - self.y * o.x,
        )

    def length(self) -> float:
        return math.sqrt(self.dot(self))

    def normalized(self, tol: Tolerance = DEFAULT) -> Vec3:
        n = self.length()
        if n <= tol.linear:
            raise ValueError("cannot normalize a zero-length vector")
        return self * (1.0 / n)

    def close_to(self, o: Vec3, tol: Tolerance = DEFAULT) -> bool:
        return (self - o).length() <= tol.linear
```

### What to understand before moving on

- **Value object.** A `Vec3` has no identity, only value. `frozen=True` means you never mutate one; you make a new one. That removes a whole class of bug where two parts of the program share a point and one silently changes it.
- **`from __future__ import annotations`** lets a method mention `Vec3` in its own type hints before the class finishes being defined.
- **`slots=True`** makes instances smaller and a bit faster. Minor here, but you will see it again.
- **`dot` and `cross`** are the two operations you will use constantly. Dot gives "how much do these point the same way" (projection, angle). Cross gives a vector perpendicular to both, with a direction set by the right-hand rule.
- **Gotcha: auto-generated `==` is exact.** `Vec3(0.1+0.2, 0, 0) == Vec3(0.3, 0, 0)` is `False`. That is why `close_to` exists, and why you never use `==` on geometry in real code.
- **Gotcha: `normalized` raises on a zero vector.** Dividing by zero (or near zero) gives `inf` or garbage direction that quietly poisons every later calculation. Fail loudly at the source.
- **Design limit to notice now:** `Vec3` objects are great for a handful of points (a sketch, a tool position) and terrible for a million. Python objects carry heavy overhead. In the sim, stock will live in a NumPy array. **Objects for meaning, arrays for bulk** is one of the central design decisions of this app.

---

## 4. Tests

Create `tests/test_vec.py`:

```python
import pytest

from camlab.geometry.vec import Vec3


def test_float_trap():
    assert 0.1 + 0.2 != 0.3


def test_exact_equality_is_unreliable_but_close_to_works():
    a = Vec3(0.1 + 0.2, 0, 0)
    b = Vec3(0.3, 0, 0)
    assert a != b
    assert a.close_to(b)


def test_cross_follows_right_hand_rule():
    x, y = Vec3(1, 0, 0), Vec3(0, 1, 0)
    assert x.cross(y).close_to(Vec3(0, 0, 1))


def test_normalized_has_unit_length():
    assert Vec3(3, 4, 0).normalized().length() == pytest.approx(1.0)


def test_normalizing_zero_vector_raises():
    with pytest.raises(ValueError):
        Vec3(0, 0, 0).normalized()
```

Create `tests/test_tolerance.py`:

```python
from camlab.geometry.tolerance import Tolerance


def test_equal_within_tolerance():
    tol = Tolerance(linear=0.01)
    assert tol.equal(1.000, 1.005)
    assert not tol.equal(1.000, 1.02)


def test_tolerance_is_immutable():
    import dataclasses
    import pytest

    tol = Tolerance()
    with pytest.raises(dataclasses.FrozenInstanceError):
        tol.linear = 5.0
```

Run:

```bash
pytest -v
```

### Why tests this early

A test is a measurement. "A 3-4-0 vector has length 5" is a known answer, like checking a gauge block. When you later write offsetting or booleans, you will check against shapes whose answer you know (a 10 mm radius circle offset inward by 3 must have radius 7). If you can't state the expected answer beforehand, you don't understand the operation yet.

`pytest.approx` exists because of the float problem again: it compares within a relative tolerance.

---

## 5. Predict, then check

Write your answers down first. Then verify in a Python shell (`python` then `from camlab.geometry.vec import Vec3`).

1. What is `Vec3(1, 0, 0).cross(Vec3(0, 1, 0))`? What if you swap the order? Why would that matter for deciding which side of a toolpath is "left" (climb vs conventional milling)?
2. What does `Vec3(1, 2, 3).x = 5` do, and why?
3. What does `Vec3(1e-9, 0, 0).normalized()` do with the default tolerance? What if you pass `Tolerance(linear=1e-12)`?
4. Is `Vec3(1, 2, 3) == Vec3(1.0, 2.0, 3.0)` true? Why?
5. Is `Vec3(1, 0, 0) * 2 == Vec3(2, 0, 0)` true? What would break if you wrote `2 * Vec3(1, 0, 0)`?

---

## 6. Exercises (do these before lesson 02)

Add each one with a test written **first** (the test should fail, then you make it pass).

1. `__neg__` so `-v` works.
2. `__truediv__` so `v / 2` works. What should `v / 0` do?
3. `distance_to(other)`.
4. `__rmul__` so `2 * v` works. (Look up what `__rmul__` is for; question 5 above is the hint.)
5. `angle_to(other, tol)` returning radians. Gotcha to discover by testing: `math.acos` raises on inputs like `1.0000000000000002`. How do you guard against that? (Hint: clamp.)
6. `project_onto(other)`, the component of `self` along `other`. You will use this in lesson 3 for distance from a point to a line.

---

## 7. Answers (don't look until you've tried)

1. `(0, 0, 1)`. Swapped, it is `(0, 0, -1)`. Cross product is anti-commutative. For a toolpath moving in direction `d` with Z up, `Z x d` points to the **left** of travel and `d x Z` to the right. Which side the tool offsets to, combined with spindle direction, is what makes a cut climb or conventional.
2. Raises `dataclasses.FrozenInstanceError`, because the dataclass is frozen. Immutability is enforced, not just a convention.
3. With the default tolerance (1e-6) it raises `ValueError`, since the length 1e-9 is below tolerance. With `Tolerance(linear=1e-12)` it returns approximately `Vec3(1, 0, 0)`. The tolerance decides what counts as "zero," which is why it's a parameter.
4. True. Python compares `1 == 1.0` as equal, and dataclass `==` compares field by field. (Exact float equality is still unreliable after arithmetic, just not here.)
5. Both are exact here, so the first is `True`. `2 * Vec3(...)` fails with `TypeError` because `int.__mul__` doesn't know about `Vec3`, and Python only tries `Vec3.__rmul__` if you define it. That's exercise 4.

---

## 8. What to send back

- Output of `pytest -v`
- Your answers to section 5 (even the wrong ones)
- Your OS and `python --version`
- Any exercise you got stuck on

Next file: `02-transforms.md`, covering rotation matrices, 4x4 homogeneous transforms, and the machine / work / part coordinate frames, with NumPy introduced where bulk math begins.
