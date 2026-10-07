# Prototype

Sometimes the easiest way to make a new object is to copy one that already exists and change a few things. A carefully configured machining template, a part with a dozen features, or a test fixture with nested data can take many lines to set up from scratch, while "the same as this one, but in aluminium" is one copy and one change. The **Prototype** pattern creates objects by copying a ready-made example, the prototype, instead of building them from their class.

In Python, the copying itself is provided by the `copy` module. The design questions are the interesting part: how deep should a copy go, which parts should be shared rather than copied, and what must be different in every copy (such as a serial number)?

This lesson covers:

- shallow and deep copies, and the bug that a shallow copy invites;
- a registry of prototypes: preconfigured templates that are cloned and adjusted;
- controlling copies with `__copy__` and `__deepcopy__`: sharing some references, renewing others;
- copies of objects that refer to each other in a cycle.

## Shallow and deep copies

`copy.copy(x)` makes a **shallow** copy: a new outer object whose attributes refer to the **same** inner objects as the original. `copy.deepcopy(x)` makes a **deep** copy: it copies the inner objects too, all the way down. For an object holding only numbers and strings, which cannot be changed in place, the difference does not matter. For one holding lists or other mutable objects, it matters a great deal. Predict before running: after adding a hole to the shallow copy, how many holes does the original have?

```python type
import copy

class Part:
    def __init__(self, name, material, holes):
        self.name, self.material, self.holes = name, material, holes
    def __repr__(self):
        return f"Part({self.name!r}, {self.material!r}, holes={self.holes})"

bracket = Part("bracket", "steel", [(10, 10), (40, 10)])

shallow = copy.copy(bracket)
shallow.name = "bracket-B"
shallow.holes.append((25, 30))

deep = copy.deepcopy(bracket)
deep.name = "bracket-C"
deep.holes.append((5, 5))

print(bracket)
print(shallow)
print(deep)
print("shallow shares the list:", shallow.holes is bracket.holes, "  deep does not:", deep.holes is bracket.holes)
```

```output
Part('bracket', 'steel', holes=[(10, 10), (40, 10), (25, 30)])
Part('bracket-B', 'steel', holes=[(10, 10), (40, 10), (25, 30)])
Part('bracket-C', 'steel', holes=[(10, 10), (40, 10), (25, 30), (5, 5)])
shallow shares the list: True   deep does not: False
```

Setting `shallow.name` replaced the name on the copy only. But `shallow.holes.append` changed the one list both objects share.

The original bracket now has three holes, though nobody touched it: the shallow copy's `append` changed the shared list. The deep copy got its own list, so its extra hole stayed on the copy. This is the classic prototype bug: a template quietly changed by a "copy". When a prototype contains mutable parts, clone it with `deepcopy` unless you deliberately want sharing.

## A registry of prototypes

A workshop keeps standard templates for common jobs. Each is a fully configured object stored in a dictionary under a name. A new job starts as a deep copy of a template, then gets its own adjustments. This replaces a tangle of constructor arguments and subclasses ("aluminium bracket", "thick bracket") with data. Predict before running: after making two customised brackets, is the template still the same?

```python type
from dataclasses import dataclass, field

@dataclass
class Job:
    part: str
    material: str
    thickness_mm: float
    operations: list = field(default_factory=list)

TEMPLATES = {
    "bracket": Job("bracket", "steel", 3, ["cut outline", "drill 4 x 6 mm", "deburr"]),
    "panel": Job("panel", "aluminium", 2, ["cut outline", "fold edges"]),
}

def new_job(template_name, **changes):
    job = copy.deepcopy(TEMPLATES[template_name])
    for attribute, value in changes.items():
        setattr(job, attribute, value)
    return job

thin = new_job("bracket", material="aluminium")
thin.operations.append("anodise")
thick = new_job("bracket", thickness_mm=6)
thick.operations.insert(0, "preheat")

print(thin)
print(thick)
print("template:", TEMPLATES["bracket"])
```

```output
Job(part='bracket', material='aluminium', thickness_mm=3, operations=['cut outline', 'drill 4 x 6 mm', 'deburr', 'anodise'])
Job(part='bracket', material='steel', thickness_mm=6, operations=['preheat', 'cut outline', 'drill 4 x 6 mm', 'deburr'])
template: Job(part='bracket', material='steel', thickness_mm=3, operations=['cut outline', 'drill 4 x 6 mm', 'deburr'])
```

`field(default_factory=list)` gives every `Job` created without operations its own new empty list. A plain `= []` default would be shared by all of them, which is the same aliasing trap, and dataclasses refuse it.

The template is untouched: each job's operations list is its own copy. Adding a new standard job is adding a dictionary entry, which could even be loaded from a file. In Python, this registry-and-clone idea covers most of what the Gang of Four's Prototype describes. Languages without dynamic classes needed more machinery for it.

## Controlling what a copy shares

A deep copy copies **everything** reachable, and that is not always right. A job might refer to the machine it will run on. A copy of the job should refer to the **same** machine, not to a duplicate machine that does not exist. And some fields must never be copied, such as a serial number that should be new in every job.

An object controls how it is copied by defining `__copy__` and `__deepcopy__`. `copy.deepcopy(obj)` calls `obj.__deepcopy__(memo)` if it exists. The `memo` dictionary records what has already been copied in this run, so passing it on in nested `deepcopy` calls keeps shared and repeated objects correct. Predict before running: does the clone have the same machine, the same operations list, and the same serial?

```python type
import itertools

class Machine:
    def __init__(self, name):
        self.name = name

serials = itertools.count(1001)

class Workorder:
    def __init__(self, machine, steps):
        self.machine = machine
        self.steps = steps
        self.serial = next(serials)

    def __deepcopy__(self, memo):
        clone = Workorder.__new__(Workorder)
        memo[id(self)] = clone
        clone.machine = self.machine
        clone.steps = copy.deepcopy(self.steps, memo)
        clone.serial = next(serials)
        return clone

lathe = Machine("lathe 2")
original = Workorder(lathe, [["face", 1.0], ["turn", 3.5]])
clone = copy.deepcopy(original)
clone.steps[1][1] = 4.0

print("same machine:", clone.machine is original.machine)
print("own steps:", clone.steps is not original.steps, original.steps, clone.steps)
print("serials:", original.serial, clone.serial)
```

```output
same machine: True
own steps: True [['face', 1.0], ['turn', 3.5]] [['face', 1.0], ['turn', 4.0]]
serials: 1001 1002
```

`Workorder.__new__(Workorder)` creates a bare object without running `__init__`, which would otherwise take a new serial and need arguments. `itertools.count(1001)` hands out 1001, 1002, ... one per `next`.

The clone shares the lathe (there is only one real lathe), has its own nested steps, so changing its second step left the original's alone, and has a fresh serial number. `memo[id(self)] = clone` is entered **before** copying the parts. If some part refers back to this work order, `deepcopy` finds the clone in the memo and uses it, instead of copying the work order again forever.

## Copies with cycles

Objects that refer to each other form a **cycle**: a fixture holds its clamps, and each clamp records which fixture it belongs to. A naive recursive copy would loop forever: copy the fixture, which copies a clamp, which copies its fixture, and so on. `deepcopy`'s memo handles this automatically, and in the copy the cycle still closes on the **new** objects. Predict before running: in the copy, does a clamp point to the original fixture or to the copied one?

```python type
class Fixture:
    def __init__(self, name):
        self.name, self.clamps = name, []

class Clamp:
    def __init__(self, fixture, position):
        self.fixture, self.position = fixture, position
        fixture.clamps.append(self)

vice = Fixture("vice A")
Clamp(vice, "left"); Clamp(vice, "right")
vice_copy = copy.deepcopy(vice)
vice_copy.name = "vice B"

print("copied clamps point to the copy:", all(c.fixture is vice_copy for c in vice_copy.clamps))
print("original clamps still point to the original:", all(c.fixture is vice for c in vice.clamps))
print([c.position for c in vice_copy.clamps], vice.name, vice_copy.name)
```

```output
copied clamps point to the copy: True
original clamps still point to the original: True
['left', 'right'] vice A vice B
```

When `deepcopy` reaches a clamp's `fixture` attribute, the memo already holds the copy of `vice`, so the clamp is linked to that copy.

The copied clamps belong to the copied fixture, and the originals are undisturbed: the structure, cycle and all, was reproduced. A hand-written `__deepcopy__` must keep this behaviour by recording the new object in `memo` first and passing `memo` on, as `Workorder` did.

::: challenge Cloning a template safely [easy]
`TOOLSETS` holds prototype tool lists for common jobs. Write `toolset_for(job, extra=())`, which returns a **deep** copy of `TOOLSETS[job]` with the tools in `extra` appended to its `"tools"` list, so the template is never changed. Each toolset is a dict with a `"name"` and a `"tools"` list of `[tool, size]` lists.

```python starter
import copy

TOOLSETS = {
    "drilling": {"name": "drilling", "tools": [["centre drill", 3], ["drill", 6]]},
    "tapping": {"name": "tapping", "tools": [["drill", 5], ["tap M6", 6]]},
}

def toolset_for(job, extra=()):
    toolset = TOOLSETS[job]
    toolset["tools"].extend(extra)
    return toolset

print(toolset_for("drilling", [["countersink", 10]]))
print(TOOLSETS["drilling"])
```

```python solution
import copy

TOOLSETS = {
    "drilling": {"name": "drilling", "tools": [["centre drill", 3], ["drill", 6]]},
    "tapping": {"name": "tapping", "tools": [["drill", 5], ["tap M6", 6]]},
}

def toolset_for(job, extra=()):
    toolset = copy.deepcopy(TOOLSETS[job])
    toolset["tools"].extend(copy.deepcopy(list(extra)))
    return toolset

print(toolset_for("drilling", [["countersink", 10]]))
print(TOOLSETS["drilling"])
```

```python test
assert "toolset_for" in dir(), "Keep the function's name as toolset_for."
_saved = {"drilling": {"name": "drilling", "tools": [["centre drill", 3], ["drill", 6]]}, "tapping": {"name": "tapping", "tools": [["drill", 5], ["tap M6", 6]]}}
TOOLSETS.clear(); TOOLSETS.update(__import__("copy").deepcopy(_saved))
_t = toolset_for("drilling", [["countersink", 10]])
assert _t == {"name": "drilling", "tools": [["centre drill", 3], ["drill", 6], ["countersink", 10]]}, f"Got {_t}."
assert TOOLSETS == _saved, "The template must not change when a toolset is made from it."
_t["tools"][0][1] = 99
assert TOOLSETS["drilling"]["tools"][0][1] == 3, "Changing a tool in the copy must not change the template's tool: copy deeply."
_u = toolset_for("tapping")
assert _u == _saved["tapping"] and _u is not TOOLSETS["tapping"], "With no extras, return an equal but separate copy."
_a, _b = toolset_for("tapping"), toolset_for("tapping")
_a["tools"].append(["reamer", 6])
assert _b == _saved["tapping"], "Two toolsets made from one template must be independent."
"SUCCESS: Every toolset is a deep copy, so templates stay pristine however the copies are changed."
```

Hint: Start with `copy.deepcopy(TOOLSETS[job])`, then extend its `"tools"` list. Copying the extras too means the caller's own lists are not shared with the toolset either.
:::

::: challenge Clone with changes and a new serial [medium]
Write a class `PartTemplate(name, material, features)`, where `features` is a list of dicts. Each instance gets a `serial` from a shared counter starting at 1 when it is created. Give it a method `clone(**changes)` that returns a new `PartTemplate` with:

- deep copies of the features, so the clone's features can be changed freely;
- any attributes named in `changes` set to the given values (raise `AttributeError` for a name the part does not have);
- a **new** serial from the counter (never the original's).

`next_serial()` should be a module-level function returning the next number from the counter, used by both `__init__` and `clone`.

```python starter
import copy, itertools

class PartTemplate:
    def __init__(self, name, material, features):
        self.name, self.material, self.features = name, material, features

p = PartTemplate("plate", "steel", [{"type": "hole", "d": 6}])
print(p.name)
```

```python solution
import copy, itertools

_counter = itertools.count(1)

def next_serial():
    return next(_counter)

class PartTemplate:
    def __init__(self, name, material, features):
        self.name, self.material, self.features = name, material, features
        self.serial = next_serial()

    def clone(self, **changes):
        twin = copy.copy(self)
        twin.features = copy.deepcopy(self.features)
        for attribute, value in changes.items():
            if not hasattr(self, attribute):
                raise AttributeError(f"PartTemplate has no attribute {attribute!r}")
            setattr(twin, attribute, value)
        twin.serial = next_serial()
        return twin

p = PartTemplate("plate", "steel", [{"type": "hole", "d": 6}])
q = p.clone(material="aluminium")
print(p.serial, q.serial, q.material, q.features)
```

```python test
for _n in ["PartTemplate", "next_serial"]:
    assert _n in dir(), f"Define {_n}."
_p = PartTemplate("plate", "steel", [{"type": "hole", "d": 6}, {"type": "slot", "w": 8}])
_q = _p.clone(material="aluminium")
assert isinstance(_q, PartTemplate) and _q is not _p, "clone returns a new PartTemplate."
assert (_q.name, _q.material) == ("plate", "aluminium") and _p.material == "steel", "Changes apply to the clone only."
assert _q.features == _p.features and _q.features is not _p.features and _q.features[0] is not _p.features[0], "Features are deep copies."
_q.features[0]["d"] = 8
assert _p.features[0]["d"] == 6, "Changing the clone's features must not touch the original's."
assert _q.serial != _p.serial and _q.serial > _p.serial, f"The clone needs a new serial; got {_p.serial} and {_q.serial}."
_r = _p.clone()
assert len({_p.serial, _q.serial, _r.serial}) == 3, "Every part, cloned or not, has its own serial."
_seen = next_serial()
_s = _p.clone()
assert _s.serial == _seen + 1, "clone should take its serial from next_serial()."
try:
    _p.clone(colour="red")
    assert False, "An unknown attribute should raise AttributeError."
except AttributeError:
    pass
"SUCCESS: Each clone copies what it should (the features), shares nothing mutable with its prototype, and gets an identity of its own."
```

Hint: Make `_counter = itertools.count(1)` and `next_serial()` returning `next(_counter)`; set `self.serial = next_serial()` in `__init__`. In `clone`, start from `copy.copy(self)`, replace `features` with a `deepcopy`, apply changes with `setattr` after checking `hasattr`, then give it a new serial.
:::

::: challenge Copying with shared and renewed parts [hard]
A production `Cell` (a group of machines working on one job) has a `name`, a reference to the shared `site` object (the factory building it is in), a list of `Station` objects, and an `id`. Each `Station` has a `name`, a `settings` dict, and a `cell` attribute pointing back to its cell: a cycle. Write `__deepcopy__` for `Cell` so that `copy.deepcopy(cell)`:

- shares the **same** `site` object (there is only one factory building);
- deep copies the stations, so their settings are independent, **and** each copied station's `cell` points to the new cell;
- gives the new cell a fresh `id` from `next(cell_ids)`, a module-level `itertools.count(1)`.

Write `Cell(name, site)` with an `add_station(name, **settings)` method that creates a `Station`, links it to the cell, and returns it.

```python starter
import copy, itertools

cell_ids = itertools.count(1)

class Station:
    def __init__(self, name, settings, cell):
        self.name, self.settings, self.cell = name, settings, cell

class Cell:
    def __init__(self, name, site):
        self.name, self.site = name, site
        self.stations = []
        self.id = next(cell_ids)

print("add add_station and __deepcopy__ to Cell")
```

```python solution
import copy, itertools

cell_ids = itertools.count(1)

class Station:
    def __init__(self, name, settings, cell):
        self.name, self.settings, self.cell = name, settings, cell

class Cell:
    def __init__(self, name, site):
        self.name, self.site = name, site
        self.stations = []
        self.id = next(cell_ids)

    def add_station(self, name, **settings):
        station = Station(name, settings, self)
        self.stations.append(station)
        return station

    def __deepcopy__(self, memo):
        clone = Cell.__new__(Cell)
        memo[id(self)] = clone
        clone.name = self.name
        clone.site = self.site
        clone.id = next(cell_ids)
        clone.stations = copy.deepcopy(self.stations, memo)
        return clone

site = object()
cell = Cell("weld line", site)
cell.add_station("tack", amps=90)
twin = copy.deepcopy(cell)
print(twin.site is site, twin.stations[0].cell is twin, cell.id, twin.id)
```

```python test
import copy as _copy
for _n in ["Cell", "Station"]:
    assert _n in dir(), f"Define {_n}."
class _Site:
    pass
_site = _Site()
_c = Cell("weld line", _site)
_s1 = _c.add_station("tack", amps=90)
_s2 = _c.add_station("seam", amps=140, speed=12)
assert isinstance(_s1, Station) and _s1.cell is _c and _c.stations == [_s1, _s2], "add_station creates a Station linked to the cell, adds and returns it."
assert _s2.settings == {"amps": 140, "speed": 12}, "Station settings come from the keyword arguments."
_t = _copy.deepcopy(_c)
assert isinstance(_t, Cell) and _t is not _c and _t.name == "weld line", "deepcopy gives a new Cell."
assert _t.site is _site, "The site must be shared, not copied."
assert len(_t.stations) == 2 and all(_ts is not _os for _ts, _os in zip(_t.stations, _c.stations)), "Stations are copied."
assert all(_ts.cell is _t for _ts in _t.stations), "Each copied station must point to the NEW cell: record the clone in memo before copying the stations, and pass memo on."
assert all(_os.cell is _c for _os in _c.stations), "The original stations still point to the original cell."
_t.stations[0].settings["amps"] = 100
assert _c.stations[0].settings["amps"] == 90, "Settings must be deep copied."
assert _t.id != _c.id, "The copy needs a fresh id."
_u = _copy.deepcopy(_c)
assert len({_c.id, _t.id, _u.id}) == 3, "Every copy gets its own id."
_pair = _copy.deepcopy([_c, _c])
assert _pair[0] is _pair[1], "The same cell appearing twice in one deepcopy is copied once."
"SUCCESS: The copy shares what is truly shared, duplicates what belongs to it, renews its identity, and closes the station-to-cell cycle on the new objects."
```

Hint: In `__deepcopy__(self, memo)`, create `clone = Cell.__new__(Cell)` and immediately set `memo[id(self)] = clone`. Copy `name`, share `site`, take a fresh `id`, and set `clone.stations = copy.deepcopy(self.stations, memo)`. When `deepcopy` reaches each station's `cell`, it finds `self` in the memo and uses the clone.
:::

## What you learned

- Prototype creates objects by copying a configured example and adjusting the copy. A registry of templates turns variants into data instead of subclasses or long constructor calls.
- `copy.copy` is shallow: the copy shares the original's inner objects, so changing a shared list changes the template. `copy.deepcopy` copies everything reachable; use it for prototypes with mutable parts.
- `__deepcopy__(self, memo)` controls a copy: share what is truly shared (a machine, a site), deep copy what belongs to the object, and renew identities such as serials and ids.
- `deepcopy`'s memo copies each object once and reproduces cycles on the new objects. A custom `__deepcopy__` must record the clone in `memo` before copying parts, and pass `memo` on.

The next lesson moves from creating objects to connecting them: the adapter pattern, which makes an object with the wrong interface fit the one the code expects.
