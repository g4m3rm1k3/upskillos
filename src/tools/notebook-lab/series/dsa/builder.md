# Builder

Some objects are awkward to create in one go. Some take a dozen settings, most of them optional. Others are put together piece by piece, in an order that matters, with rules that span the pieces: you cannot cut metal before the spindle is turning. The **builder** pattern separates the step-by-step construction of such an object from the object itself. A builder object collects the parts through a series of method calls, and a final `build()` checks the whole and produces the finished object.

Python's keyword arguments and dataclasses solve the first problem (many settings) so well that the classic builder is rarely needed for it. The second problem, construction as a **process** with rules across steps, is where builders still earn their place. This lesson shows both.

This lesson covers:

- the problem of many settings, and Python's answer: keyword arguments, defaults and dataclasses;
- making variations of an object with `dataclasses.replace`;
- the builder pattern with a fluent interface, for objects assembled step by step;
- validating the whole object at `build()` time.

## Many settings: keyword arguments first

A laser-cutting job has a material, a thickness, and many optional settings: power, speed, passes, gas, focus offset. In languages without keyword arguments, constructors like `CutJob("steel", 3, 80, 1200, 1, "N2", 0)` are unreadable, and builders were invented largely to avoid them. In Python, keyword arguments with defaults name every setting at the call site, and a dataclass writes the constructor for you. Predict before running: what does the second job's `repr` show for the settings it did not mention?

```python type
from dataclasses import dataclass, replace

@dataclass(frozen=True)
class CutJob:
    material: str
    thickness_mm: float
    power_pct: int = 80
    speed_mm_min: int = 1200
    passes: int = 1
    gas: str = "air"
    tags: tuple = ()

    def __post_init__(self):
        if not 0 < self.power_pct <= 100:
            raise ValueError(f"power must be 1-100%, not {self.power_pct}")
        if self.passes < 1:
            raise ValueError("at least one pass")

standard = CutJob("plywood", 6)
fine = CutJob("stainless", 1.5, power_pct=95, speed_mm_min=600, gas="N2")
print(standard)
print(fine)
try:
    CutJob("acrylic", 3, power_pct=140)
except ValueError as error:
    print("ValueError:", error)
```

```output
CutJob(material='plywood', thickness_mm=6, power_pct=80, speed_mm_min=1200, passes=1, gas='air', tags=())
CutJob(material='stainless', thickness_mm=1.5, power_pct=95, speed_mm_min=600, passes=1, gas='N2', tags=())
ValueError: power must be 1-100%, not 140
```

`__post_init__` runs right after the dataclass's generated `__init__`, which makes it the place to check settings. With `frozen=True` the object cannot be changed afterwards, so a job checked at creation stays valid.

Every setting the call did not name took its default, and the `repr` lists them all, so a job's full configuration is visible at a glance. Invalid combinations are refused at creation. For "many optional settings", this is the whole solution in Python: no builder class needed.

Variations are just as easy. `dataclasses.replace` copies a frozen object with some fields changed, which is often what a builder's "start from this and tweak it" step is for:

```python type
thick = replace(standard, thickness_mm=12, passes=2, tags=("test cut",))
print(thick)
print("original unchanged:", standard.thickness_mm, standard.passes)
```

```output
CutJob(material='plywood', thickness_mm=12, power_pct=80, speed_mm_min=1200, passes=2, gas='air', tags=('test cut',))
original unchanged: 6 1
```

`replace` builds a new object, so `__post_init__` runs again and checks the new combination.

## When construction is a process

Now consider making a CNC **toolpath**: the list of moves a machine follows. It is built up move by move, in order. It has rules spanning the moves: the spindle must be on before any cutting move, a feed rate must be set before the first cutting move, and the program must end with the spindle off and the tool lifted clear. No single constructor call can express this. The program is the **result** of a sequence of steps.

A builder keeps the in-progress state (the moves so far, the current position, whether the spindle is on) and offers one method per step. Each step method returns the builder itself (`return self`), so steps can be chained one after another. This is a **fluent interface**. `build()` checks the whole program and returns the finished, immutable result. Predict before running: what does `build()` say about the second, careless program?

```python type
import math

class ToolpathBuilder:
    def __init__(self, safe_z=5.0):
        self._lines = []
        self._pos = (0.0, 0.0, safe_z)
        self._safe_z = safe_z
        self._spindle = False
        self._feed = None
        self._cut_length = 0.0
        self._problems = []

    def spindle_on(self, rpm):
        self._spindle = True
        self._lines.append(f"M3 S{rpm}")
        return self

    def spindle_off(self):
        self._spindle = False
        self._lines.append("M5")
        return self

    def feed(self, mm_per_min):
        self._feed = mm_per_min
        self._lines.append(f"F{mm_per_min}")
        return self

    def rapid_to(self, x, y, z):
        self._pos = (x, y, z)
        self._lines.append(f"G0 X{x} Y{y} Z{z}")
        return self

    def cut_to(self, x, y, z):
        if not self._spindle:
            self._problems.append(f"cut to {(x, y, z)} with the spindle off")
        if self._feed is None:
            self._problems.append(f"cut to {(x, y, z)} with no feed rate set")
        self._cut_length += math.dist(self._pos, (x, y, z))
        self._pos = (x, y, z)
        self._lines.append(f"G1 X{x} Y{y} Z{z}")
        return self

    def build(self):
        problems = list(self._problems)
        if self._spindle:
            problems.append("program ends with the spindle still on")
        if self._pos[2] < self._safe_z:
            problems.append("program ends with the tool below the safe height")
        if problems:
            raise ValueError("; ".join(problems))
        return tuple(self._lines), round(self._cut_length, 2)

program, length = (ToolpathBuilder()
    .spindle_on(12000).feed(800)
    .rapid_to(10, 10, 5).cut_to(10, 10, -2)
    .cut_to(60, 10, -2).cut_to(60, 40, -2)
    .rapid_to(60, 40, 5).spindle_off()
    .build())
print("\n".join(program))
print("cutting length:", length, "mm")

try:
    ToolpathBuilder().rapid_to(0, 0, 5).cut_to(0, 0, -1).build()
except ValueError as error:
    print("ValueError:", error)
```

```output
M3 S12000
F800
G0 X10 Y10 Z5
G1 X10 Y10 Z-2
G1 X60 Y10 Z-2
G1 X60 Y40 Z-2
G0 X60 Y40 Z5
M5
cutting length: 87.0 mm
ValueError: cut to (0, 0, -1) with the spindle off; cut to (0, 0, -1) with no feed rate set; program ends with the tool below the safe height
```

The chained calls are wrapped in brackets so they can span several lines. Each method returns the builder, so `.feed(800)` is called on whatever `.spindle_on(12000)` returned.

The good program builds, and the builder has also totalled the cutting distance along the way: 7 + 50 + 30 = 87 mm. The careless program reports **every** problem at once: it cut with the spindle off and with no feed rate, and it ended below the safe height. Collecting problems as the steps happen and reporting them at `build()` gives one complete error message instead of a fix-one-run-again loop.

## Why a separate builder?

Why not just put `spindle_on` and `cut_to` methods on the program class? Because then a half-built, invalid program would be a real object that other code could receive and run. Splitting construction from the product means:

- the product (a tuple of lines here) is only ever created complete and checked, and can be immutable;
- the builder carries the in-progress state (current position, spindle state), which the finished product has no need for;
- different builders can produce the same kind of product, or one builder can produce different representations (G-code text, or a list of segments for a preview plot).

Builders are everywhere once you look: string building with `io.StringIO`, `email.message.EmailMessage`, assembled header by header, query builders in database libraries, and `argparse.ArgumentParser`, which collects argument definitions step by step and builds a parser.

::: challenge Job variations [easy]
Write a frozen dataclass `PrintJob` for a 3D printer with fields `model` (str), `material` (str, default `"PLA"`), `layer_mm` (float, default `0.2`), `infill_pct` (int, default `20`) and `supports` (bool, default `False`). In `__post_init__`, raise `ValueError` if `layer_mm` is not between 0.05 and 0.4 inclusive, or `infill_pct` is not between 0 and 100 inclusive. Then write `draft_of(job)`, returning a copy with `layer_mm=0.3` and `infill_pct=10` and everything else unchanged, and `strong_of(job)`, returning a copy with `infill_pct=60`, using `dataclasses.replace`.

```python starter
from dataclasses import dataclass, replace

class PrintJob:
    pass

print("define PrintJob, draft_of and strong_of")
```

```python solution
from dataclasses import dataclass, replace

@dataclass(frozen=True)
class PrintJob:
    model: str
    material: str = "PLA"
    layer_mm: float = 0.2
    infill_pct: int = 20
    supports: bool = False

    def __post_init__(self):
        if not 0.05 <= self.layer_mm <= 0.4:
            raise ValueError(f"layer height {self.layer_mm} mm is out of range")
        if not 0 <= self.infill_pct <= 100:
            raise ValueError(f"infill {self.infill_pct}% is out of range")

def draft_of(job):
    return replace(job, layer_mm=0.3, infill_pct=10)

def strong_of(job):
    return replace(job, infill_pct=60)

print(draft_of(PrintJob("bracket.stl", supports=True)))
```

```python test
import dataclasses as _dc
for _n in ["PrintJob", "draft_of", "strong_of"]:
    assert _n in dir(), f"Define {_n}."
assert _dc.is_dataclass(PrintJob), "PrintJob should be a dataclass."
_j = PrintJob("bracket.stl")
assert (_j.material, _j.layer_mm, _j.infill_pct, _j.supports) == ("PLA", 0.2, 20, False), "Check the defaults."
try:
    _j.infill_pct = 50
    assert False, "PrintJob should be frozen."
except _dc.FrozenInstanceError:
    pass
for _bad in [dict(layer_mm=0.5), dict(layer_mm=0.01), dict(infill_pct=101), dict(infill_pct=-1)]:
    try:
        PrintJob("x.stl", **_bad)
        assert False, f"PrintJob with {_bad} should raise ValueError."
    except ValueError:
        pass
assert PrintJob("x.stl", layer_mm=0.05, infill_pct=0) and PrintJob("x.stl", layer_mm=0.4, infill_pct=100), "The limits themselves are allowed."
_s = PrintJob("gear.stl", material="PETG", supports=True)
assert draft_of(_s) == PrintJob("gear.stl", "PETG", 0.3, 10, True), f"draft_of keeps the rest; got {draft_of(_s)}."
assert strong_of(_s) == PrintJob("gear.stl", "PETG", 0.2, 60, True), f"strong_of only changes infill; got {strong_of(_s)}."
assert _s.infill_pct == 20, "The original job must be unchanged."
"SUCCESS: A frozen dataclass with checks and defaults covers many settings, and replace() makes checked variations without any builder class."
```

Hint: Decorate with `@dataclass(frozen=True)`, list the fields with their defaults, and raise in `__post_init__`. `draft_of` returns `replace(job, layer_mm=0.3, infill_pct=10)`.
:::

::: challenge A fluent query builder [medium]
Write `QueryBuilder(table)`, a fluent builder for simple SQL `SELECT` statements. Each step method returns `self`:

- `select(*columns)`: the columns to fetch (default, if never called: `*`);
- `where(condition, value)`: add a condition such as `"qty < ?"` with its value; several conditions are joined with `AND`;
- `order_by(column, descending=False)`;
- `limit(n)`.

`build()` returns a tuple `(sql, params)`. The SQL looks like `SELECT name, qty FROM parts WHERE qty < ? AND bin = ? ORDER BY qty DESC LIMIT 5`, leaving out any clause that was not used. `params` is the list of where-values in order, a new list each time, so changing it does not change the builder. `build()` raises `ValueError` if `limit` was given something that is not a positive integer, or if a condition does not contain exactly one `?`. Values never go into the SQL text itself, only into `params`, which is how real programs avoid SQL injection.

```python starter
class QueryBuilder:
    def __init__(self, table):
        self.table = table
    def build(self):
        return f"SELECT * FROM {self.table}", []

print(QueryBuilder("parts").build())
```

```python solution
class QueryBuilder:
    def __init__(self, table):
        self._table = table
        self._columns = ["*"]
        self._conditions, self._params = [], []
        self._order = None
        self._limit = None

    def select(self, *columns):
        self._columns = list(columns)
        return self

    def where(self, condition, value):
        self._conditions.append(condition)
        self._params.append(value)
        return self

    def order_by(self, column, descending=False):
        self._order = f"{column} DESC" if descending else column
        return self

    def limit(self, n):
        self._limit = n
        return self

    def build(self):
        for condition in self._conditions:
            if condition.count("?") != 1:
                raise ValueError(f"condition {condition!r} needs exactly one ?")
        if self._limit is not None and not (isinstance(self._limit, int) and self._limit > 0):
            raise ValueError(f"limit must be a positive integer, not {self._limit!r}")
        sql = f"SELECT {', '.join(self._columns)} FROM {self._table}"
        if self._conditions:
            sql += " WHERE " + " AND ".join(self._conditions)
        if self._order:
            sql += f" ORDER BY {self._order}"
        if self._limit is not None:
            sql += f" LIMIT {self._limit}"
        return sql, list(self._params)

print(QueryBuilder("parts").select("name", "qty").where("qty < ?", 20).order_by("qty", descending=True).limit(5).build())
```

```python test
assert "QueryBuilder" in dir(), "Keep the class name QueryBuilder."
assert QueryBuilder("parts").build() == ("SELECT * FROM parts", []), "With no steps: all columns, no clauses."
_q = QueryBuilder("parts").select("name", "qty").where("qty < ?", 20).where("bin = ?", "A3").order_by("qty", descending=True).limit(5)
assert _q.build() == ("SELECT name, qty FROM parts WHERE qty < ? AND bin = ? ORDER BY qty DESC LIMIT 5", [20, "A3"]), f"Got {_q.build()!r}."
assert QueryBuilder("t").order_by("name").build() == ("SELECT * FROM t ORDER BY name", []), "Ascending order has no DESC."
_b = QueryBuilder("t")
assert _b.select("a") is _b and _b.where("a = ?", 1) is _b and _b.order_by("a") is _b and _b.limit(1) is _b, "Every step should return the builder itself, so calls can be chained."
_evil = "x'; DROP TABLE parts; --"
_sql, _params = QueryBuilder("parts").where("name = ?", _evil).build()
assert _evil not in _sql and _params == [_evil], "Values must go into params, never into the SQL text."
for _make in [lambda: QueryBuilder("t").limit(0), lambda: QueryBuilder("t").limit(2.5), lambda: QueryBuilder("t").where("a = 1", 5), lambda: QueryBuilder("t").where("a = ? OR b = ?", 5)]:
    try:
        _make().build()
        assert False, "build() should raise ValueError for a bad limit or a condition without exactly one '?'."
    except ValueError:
        pass
_r1 = QueryBuilder("t").where("a = ?", 1)
_s1, _p1 = _r1.build()
_p1.append("junk")
assert _r1.build()[1] == [1], "build() should return a copy of the params, so callers can't change the builder."
"SUCCESS: Steps can come in any order and be chained, the finished query is checked once at build(), and values travel separately from the SQL text."
```

Hint: Keep the pieces in attributes: a column list (start with `["*"]`), lists of conditions and params, an order string and a limit. Each step method sets its piece and `return self`. `build()` checks, then joins the pieces that are set.
:::

::: challenge A drilling program builder [hard]
Write `DrillProgramBuilder(sheet_w, sheet_h)` for a sheet of the given size in millimetres. Its steps, each returning `self`:

- `tool(diameter_mm)`: select a drill; it applies to the holes added after it;
- `hole(x, y, depth)`: add a hole at (x, y) with the current tool;
- `grid(x0, y0, dx, dy, nx, ny, depth)`: add an `nx` × `ny` grid of holes starting at (x0, y0), stepping `dx` and `dy`, going row by row (all x positions for the first y, then the next y).

`build()` returns a tuple of `(diameter, x, y, depth)` tuples, the holes in the order they were added, after checking the whole program. It raises `ValueError` listing **every** problem found, joined by `"; "`:

- a hole added before any tool was selected: `"hole at (x, y) has no tool"`;
- a hole whose edge would be outside the sheet (the centre must be at least the radius from every edge): `"hole at (x, y) is off the sheet"`;
- two holes overlapping (centre distance less than the sum of the radii): `"holes at (x1, y1) and (x2, y2) overlap"`, reported for each overlapping pair in the order they were added.

Coordinates in messages are shown as Python prints the tuple `(x, y)`.

```python starter
class DrillProgramBuilder:
    def __init__(self, sheet_w, sheet_h):
        pass
    def build(self):
        return ()

print(DrillProgramBuilder(100, 50).build())
```

```python solution
import math

class DrillProgramBuilder:
    def __init__(self, sheet_w, sheet_h):
        self._w, self._h = sheet_w, sheet_h
        self._tool = None
        self._holes = []

    def tool(self, diameter_mm):
        self._tool = diameter_mm
        return self

    def hole(self, x, y, depth):
        self._holes.append((self._tool, x, y, depth))
        return self

    def grid(self, x0, y0, dx, dy, nx, ny, depth):
        for j in range(ny):
            for i in range(nx):
                self.hole(x0 + i * dx, y0 + j * dy, depth)
        return self

    def build(self):
        problems = []
        for d, x, y, _ in self._holes:
            if d is None:
                problems.append(f"hole at {(x, y)} has no tool")
            elif x - d / 2 < 0 or y - d / 2 < 0 or x + d / 2 > self._w or y + d / 2 > self._h:
                problems.append(f"hole at {(x, y)} is off the sheet")
        for i, (d1, x1, y1, _) in enumerate(self._holes):
            for d2, x2, y2, _ in self._holes[i + 1:]:
                if d1 is not None and d2 is not None and math.dist((x1, y1), (x2, y2)) < (d1 + d2) / 2:
                    problems.append(f"holes at {(x1, y1)} and {(x2, y2)} overlap")
        if problems:
            raise ValueError("; ".join(problems))
        return tuple(self._holes)

print(DrillProgramBuilder(100, 50).tool(6).grid(10, 10, 20, 15, 3, 2, 4).tool(10).hole(80, 25, 8).build())
```

```python test
assert "DrillProgramBuilder" in dir(), "Keep the class name DrillProgramBuilder."
_b = DrillProgramBuilder(100, 50)
assert _b.tool(6) is _b and _b.hole(10, 10, 4) is _b and _b.grid(30, 10, 10, 10, 1, 1, 4) is _b, "Every step returns the builder."
_p = DrillProgramBuilder(100, 50).tool(6).grid(10, 10, 20, 15, 3, 2, 4).tool(10).hole(80, 25, 8).build()
assert _p == ((6, 10, 10, 4), (6, 30, 10, 4), (6, 50, 10, 4), (6, 10, 25, 4), (6, 30, 25, 4), (6, 50, 25, 4), (10, 80, 25, 8)), f"Grid row by row, then the 10 mm hole; got {_p}."
assert DrillProgramBuilder(10, 10).build() == (), "An empty program is fine."
def _err(_builder):
    try:
        _builder.build()
    except ValueError as _e:
        return str(_e)
    return None
assert _err(DrillProgramBuilder(100, 50).hole(20, 20, 3)) == "hole at (20, 20) has no tool", "A hole before any tool."
assert _err(DrillProgramBuilder(100, 50).tool(10).hole(4, 25, 3)) == "hole at (4, 25) is off the sheet", "A 10 mm hole centred 4 mm from the edge pokes off the sheet."
assert _err(DrillProgramBuilder(100, 50).tool(10).hole(5, 5, 3).hole(95, 45, 3)) is None, "Exactly touching the edges is allowed."
assert _err(DrillProgramBuilder(100, 50).tool(8).hole(20, 20, 3).hole(27, 20, 3)) == "holes at (20, 20) and (27, 20) overlap", "Centres 7 mm apart, radii sum 8: overlap."
assert _err(DrillProgramBuilder(100, 50).tool(8).hole(20, 20, 3).hole(28, 20, 3)) is None, "Exactly touching holes are allowed."
_many = DrillProgramBuilder(30, 30).hole(1, 1, 1).tool(6).hole(2, 15, 1).hole(15, 15, 1).hole(18, 15, 1)
assert _err(_many) == "hole at (1, 1) has no tool; hole at (2, 15) is off the sheet; holes at (15, 15) and (18, 15) overlap", f"Report every problem at once, in order; got {_err(_many)!r}."
"SUCCESS: Holes are added step by step with the current tool, and build() checks the whole sheet at once, so a bad program can never reach the machine."
```

Hint: Store holes as `(tool, x, y, depth)` with whatever the current tool is (possibly None). `grid` is two nested loops calling `self.hole`. In `build`, first loop over holes for tool and edge problems, then over every pair `i < j` for overlaps, using `math.dist` and the radii `d / 2`. Collect the messages and raise once.
:::

## What you learned

- For objects with many optional settings, Python's keyword arguments, defaults and dataclasses replace the classic builder: every setting is named at the call site, and `__post_init__` checks combinations.
- `dataclasses.replace` makes checked variations of a frozen object.
- A builder is worth it when construction is a **process**: parts added step by step, in-progress state to track, and rules spanning the parts.
- Builder methods that return `self` give a fluent, chainable interface; `build()` checks the whole and returns a finished, often immutable product, so a half-built object never escapes.
- Collecting every problem and reporting them together at `build()` turns a fix-one-at-a-time loop into a single complete error.

The next lesson looks at a pattern for having exactly one of something, Singleton, and why Python programs are usually better off without it.
