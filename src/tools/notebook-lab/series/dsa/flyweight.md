# Flyweight

A CAD model of a machine frame can contain tens of thousands of bolts. Most of them are the same few types: M8 × 30 to ISO 4017, M10 × 40, and so on. If every bolt object carries the full description of its type (standard, thread, length, material, mass, drawing reference), the same few descriptions are stored tens of thousands of times. The **flyweight** pattern shares that common part. Each bolt keeps only what is unique to it, its position, and a reference to one shared object describing its type.

The pattern names the two kinds of state. **Intrinsic** state is the same for many objects and does not depend on context: the bolt type. It lives in shared flyweight objects. **Extrinsic** state differs per object, such as where a particular bolt is. It is kept outside the flyweight, by the object that uses it. Because flyweights are shared, they must be **immutable**: changing one would change it for every object that refers to it.

This lesson covers:

- the problem, measured: memory spent on repeated data;
- splitting intrinsic from extrinsic state, with a factory that hands out shared flyweights;
- slimming the per-object part further with `__slots__` or plain tuples;
- flyweights already built into Python, and why they must be immutable.

## The problem, measured

Here is the naive model: every bolt object holds a full dict describing its type. `tracemalloc` measures the memory allocated while building 50,000 of them. Predict before running: how many distinct bolt types are there among the 50,000, and how many copies of each type's description are stored?

```python type
import random, tracemalloc

TYPES = [
    ("ISO 4017", "M8", 30, "8.8 steel"), ("ISO 4017", "M8", 40, "8.8 steel"),
    ("ISO 4017", "M10", 40, "8.8 steel"), ("ISO 4762", "M6", 20, "A2 stainless"),
    ("ISO 4762", "M10", 50, "A4 stainless"), ("ISO 4017", "M12", 60, "10.9 steel"),
]

class NaiveBolt:
    def __init__(self, standard, thread, length, material, x, y, z):
        self.spec = {"standard": standard, "thread": thread, "length_mm": length, "material": material,
                     "mass_g": round(0.006 * length * int(thread[1:]) ** 2, 1),
                     "drawing": f"DWG-{standard.replace(' ', '')}-{thread}x{length}"}
        self.x, self.y, self.z = x, y, z

rng = random.Random(1)
placements = [(rng.choice(TYPES), (rng.uniform(0, 2000), rng.uniform(0, 1000), rng.uniform(0, 500))) for _ in range(50_000)]

tracemalloc.start()
naive = [NaiveBolt(*t, *pos) for t, pos in placements]
naive_bytes = tracemalloc.get_traced_memory()[0]
tracemalloc.stop()
print(f"{len(naive):,} bolts, {len({id(b.spec) for b in naive}):,} separate spec dicts, {naive_bytes / 1e6:.1f} MB")
```

`tracemalloc.get_traced_memory()[0]` is the memory currently allocated since `start()`, here all of it held by the bolts.

There are only 6 types, yet 50,000 separate spec dictionaries, each with six entries, including a freshly built drawing string: almost all of that memory is the same six descriptions repeated.

## Sharing the intrinsic state

Split the bolt in two. `BoltType` holds the intrinsic state and is immutable: a frozen dataclass. A **flyweight factory** hands out the types and guarantees one object per distinct type: it keeps a dictionary keyed by the type's defining values and returns the existing object if there is one. `Bolt` keeps the extrinsic state (its position) and a reference to its shared type. Predict before running: how many `BoltType` objects exist now, and how much memory is saved?

```python type
from dataclasses import dataclass

@dataclass(frozen=True)
class BoltType:
    standard: str
    thread: str
    length_mm: int
    material: str

    @property
    def mass_g(self):
        return round(0.006 * self.length_mm * int(self.thread[1:]) ** 2, 1)

    @property
    def drawing(self):
        return f"DWG-{self.standard.replace(' ', '')}-{self.thread}x{self.length_mm}"

class BoltTypes:
    def __init__(self):
        self._pool = {}
    def get(self, standard, thread, length_mm, material):
        key = (standard, thread, length_mm, material)
        if key not in self._pool:
            self._pool[key] = BoltType(*key)
        return self._pool[key]
    def __len__(self):
        return len(self._pool)

class Bolt:
    __slots__ = ("kind", "x", "y", "z")
    def __init__(self, kind, x, y, z):
        self.kind, self.x, self.y, self.z = kind, x, y, z

types = BoltTypes()
tracemalloc.start()
shared = [Bolt(types.get(*t), *pos) for t, pos in placements]
shared_bytes = tracemalloc.get_traced_memory()[0]
tracemalloc.stop()
print(f"{len(shared):,} bolts, {len(types)} BoltType objects, {shared_bytes / 1e6:.1f} MB "
      f"({shared_bytes / naive_bytes:.0%} of the naive version)")

total_mass = sum(b.kind.mass_g for b in shared)
print(f"total bolt mass: {total_mass / 1000:.1f} kg, same as naive: {abs(total_mass - sum(b.spec['mass_g'] for b in naive)) < 1e-6}")
```

`mass_g` and `drawing` are computed properties of the type rather than stored fields: derived values need not be stored at all.

The 50,000 bolts now share 6 type objects, and the model uses a fraction of the memory while giving identical answers. (Most of the saving comes from sharing; a smaller part comes from `__slots__` on `Bolt`, explained in the next section.) The factory is essential. Without it, code would create a new `BoltType` for each bolt and nothing would be shared.

## Slimming the extrinsic part

Once the intrinsic state is shared, the remaining cost is the per-object part, and in Python an ordinary object has overhead: each instance reserves room for a per-instance attribute dictionary, `__dict__` (modern Python creates the dictionary itself only when something asks for it, which is why the gap below is moderate). `__slots__ = ("kind", "x", "y", "z")`, used on `Bolt` above, tells Python the attributes in advance, so instances store them in fixed slots with no per-instance dictionary. That saves memory, and it also makes assigning any other attribute an error. Predict before running: how big is the difference between a plain object and a slotted one?

```python type
class PlainBolt:
    def __init__(self, kind, x, y, z):
        self.kind, self.x, self.y, self.z = kind, x, y, z

bolt_type = types.get("ISO 4017", "M8", 30, "8.8 steel")
for cls in [PlainBolt, Bolt]:
    tracemalloc.start()
    objects = [cls(bolt_type, 1.0, 2.0, 3.0) for _ in range(50_000)]
    used = tracemalloc.get_traced_memory()[0]
    tracemalloc.stop()
    print(f"{cls.__name__:<10} {used / len(objects):6.0f} bytes per object")
try:
    shared[0].colour = "red"
except AttributeError as error:
    print("AttributeError:", error)
```

The slotted bolt needs noticeably fewer bytes per object, and with tens of thousands of objects that difference matters. For millions of tiny records, going further pays: store the extrinsic state in parallel arrays (a list or NumPy array of x coordinates, one of y, one of type indices) and create objects only when needed. That is the flyweight idea pushed to its limit: the "objects" become indexes into shared tables.

## Flyweights in Python itself, and why they must be immutable

Python uses flyweights internally. In CPython (the standard implementation, and the one Pyodide uses), small integers from −5 to 256 are created once and shared, so every `7` computed at run time is the same object. That is an implementation detail, not a language rule, so never rely on `is` to compare numbers. Strings can be **interned** with `sys.intern`, which returns one shared copy of equal strings: useful when millions of records repeat the same few labels. `None`, `True` and `False` are single shared objects too. Every one of these is immutable, and that is no coincidence. Predict before running: what happens to the other bolts when one shared type is changed?

```python type
import sys

print("small ints shared:", int("7") is int("7"), "  larger ints shared:", int("1000") is int("1000"))
label_one = sys.intern("".join(["ISO", " 4017"]))
label_two = sys.intern("ISO " + "4017")
print("interned strings shared:", label_one is label_two)

try:
    shared[0].kind.length_mm = 35
except Exception as error:
    print(type(error).__name__, "-", error)
```

```output
small ints shared: True   larger ints shared: False
interned strings shared: True
FrozenInstanceError - cannot assign to field 'length_mm'
```

`"".join(...)` builds the string at run time, so without `sys.intern` the two equal strings could be separate objects.

Changing the length of one bolt's type is refused, because `BoltType` is frozen. If it were allowed, every bolt sharing that type, thousands of them, would silently become 35 mm long. To change one bolt, give it a **different** shared type from the factory: `bolt.kind = types.get(..., 35, ...)`. The flyweight itself never changes.

::: challenge A flyweight factory [easy]
Write a class `MaterialCatalogue` that hands out shared `Material` objects. `Material` is a frozen dataclass with fields `name` (str), `density_kg_m3` (float) and `cost_per_kg` (float). `MaterialCatalogue.get(name, density_kg_m3, cost_per_kg)` returns the existing `Material` if one with exactly those values was made before, and otherwise creates and stores a new one. `len(catalogue)` is the number of distinct materials created. Two separate catalogues share nothing.

```python starter
from dataclasses import dataclass

class MaterialCatalogue:
    def get(self, name, density_kg_m3, cost_per_kg):
        return (name, density_kg_m3, cost_per_kg)

print(MaterialCatalogue().get("6061 aluminium", 2700, 3.2))
```

```python solution
from dataclasses import dataclass

@dataclass(frozen=True)
class Material:
    name: str
    density_kg_m3: float
    cost_per_kg: float

class MaterialCatalogue:
    def __init__(self):
        self._pool = {}

    def get(self, name, density_kg_m3, cost_per_kg):
        key = (name, density_kg_m3, cost_per_kg)
        if key not in self._pool:
            self._pool[key] = Material(*key)
        return self._pool[key]

    def __len__(self):
        return len(self._pool)

print(MaterialCatalogue().get("6061 aluminium", 2700, 3.2))
```

```python test
import dataclasses as _dc
for _n in ["Material", "MaterialCatalogue"]:
    assert _n in dir(), f"Define {_n}."
_cat = MaterialCatalogue()
_a = _cat.get("6061 aluminium", 2700, 3.2)
assert isinstance(_a, Material) and _a.density_kg_m3 == 2700, "get returns a Material."
assert _cat.get("6061 aluminium", 2700, 3.2) is _a, "The same values must return the same shared object."
_b = _cat.get("6061 aluminium", 2700, 3.4)
assert _b is not _a and len(_cat) == 2, "Different values are a different material."
for _ in range(1000):
    _cat.get("mild steel", 7850, 0.9)
assert len(_cat) == 3, "A thousand requests for one material create it once."
try:
    _a.cost_per_kg = 0
    assert False, "Materials are shared, so they must be frozen."
except _dc.FrozenInstanceError:
    pass
assert MaterialCatalogue().get("6061 aluminium", 2700, 3.2) is not _a, "Separate catalogues share nothing."
"SUCCESS: The catalogue makes each distinct material once and shares it, and freezing it means no holder can change it for everyone else."
```

Hint: Make `Material` a `@dataclass(frozen=True)`. The catalogue keeps a dict keyed by the tuple of the three values; `get` creates a `Material` only when the key is missing.
:::

::: challenge Shared glyphs for a label printer [medium]
A label printer lays out text in a few fonts. Each character's shape, a **glyph**, is intrinsic and shared; its position on the label is extrinsic. Write:

- `Glyph`, a frozen dataclass with `char`, `font` and `advance` (the horizontal space the character takes, in points);
- `GlyphCache`, with `glyph(char, font)` returning a shared `Glyph` (one per distinct `(char, font)`), and `__len__`. Advances come from the provided table `ADVANCES[font][char]`, using `ADVANCES[font]["default"]` for characters not listed;
- `layout(text, font, cache, start_x=0)`, returning a list of `(glyph, x)` pairs: each character's glyph and the x position it starts at, each next character starting at the previous one's x plus its advance.

```python starter
from dataclasses import dataclass

ADVANCES = {
    "mono": {"default": 6},
    "sans": {"default": 6, "i": 3, "l": 3, "m": 9, "w": 9, " ": 3, "M": 10, "W": 10},
}

def layout(text, font, cache, start_x=0):
    return []

print(layout("Mill", "sans", None))
```

```python solution
from dataclasses import dataclass

ADVANCES = {
    "mono": {"default": 6},
    "sans": {"default": 6, "i": 3, "l": 3, "m": 9, "w": 9, " ": 3, "M": 10, "W": 10},
}

@dataclass(frozen=True)
class Glyph:
    char: str
    font: str
    advance: int

class GlyphCache:
    def __init__(self):
        self._pool = {}
    def glyph(self, char, font):
        key = (char, font)
        if key not in self._pool:
            table = ADVANCES[font]
            self._pool[key] = Glyph(char, font, table.get(char, table["default"]))
        return self._pool[key]
    def __len__(self):
        return len(self._pool)

def layout(text, font, cache, start_x=0):
    placed, x = [], start_x
    for char in text:
        g = cache.glyph(char, font)
        placed.append((g, x))
        x += g.advance
    return placed

cache = GlyphCache()
print([(g.char, x) for g, x in layout("Mill", "sans", cache)])
```

```python test
for _n in ["Glyph", "GlyphCache", "layout"]:
    assert _n in dir(), f"Define {_n}."
_c = GlyphCache()
_placed = layout("Mill", "sans", _c)
assert [(_g.char, _x) for _g, _x in _placed] == [("M", 0), ("i", 10), ("l", 13), ("l", 16)], f"Got {[(_g.char, _x) for _g, _x in _placed]}."
assert _placed[2][0] is _placed[3][0], "The two l's share one glyph object."
assert len(_c) == 3, "Mill needs three distinct glyphs."
assert [_x for _, _x in layout("ab", "mono", _c, start_x=100)] == [100, 106], "start_x moves the whole line; mono uses the default advance."
assert _c.glyph("M", "sans") is not _c.glyph("M", "mono") and _c.glyph("M", "mono").advance == 6, "The same character in another font is another glyph."
_before = len(_c)
_long = layout("Maintenance will run while the mill is idle " * 200, "sans", _c)
assert len(_long) == 44 * 200 and len(_c) - _before <= 20, f"8,800 characters should need only a handful of new glyphs; made {len(_c) - _before}."
assert layout("", "sans", _c) == [], "No text, no glyphs."
"SUCCESS: Thousands of placed characters share a few glyph objects, and each placement stores only a reference and a position."
```

Hint: The cache keys its dict by `(char, font)` and builds a `Glyph` with `ADVANCES[font].get(char, ADVANCES[font]["default"])`. `layout` keeps a running `x`, appending `(glyph, x)` and adding the glyph's advance.
:::

::: challenge A compact terrain map [hard]
A warehouse robot plans routes over a floor map of up to 1,000 × 1,000 cells, and each cell is one of a few terrain types: `"floor"`, `"ramp"`, `"rack"`, `"wet"`. Storing an object per cell would be millions of objects. Write:

- `Terrain`, a frozen dataclass with `name`, `move_cost` (an int) and `passable` (a bool);
- `TERRAINS`, a list of the four shared `Terrain` objects, in this order: floor (cost 1, passable), ramp (cost 3, passable), rack (cost 0, not passable), wet (cost 5, passable);
- `FloorMap(width, height)`, storing **one byte per cell** in a `bytearray`: the index of the cell's terrain in `TERRAINS`, initially all floor. Methods: `set(x, y, name)` (raise `KeyError` for an unknown terrain name, `IndexError` for a cell off the map), `get(x, y)` returning the **shared** `Terrain` object, and `path_cost(cells)` returning the total `move_cost` of a list of `(x, y)` cells, or `None` if any of them is not passable.

```python starter
from dataclasses import dataclass

class FloorMap:
    def __init__(self, width, height):
        self.width, self.height = width, height

print("write Terrain, TERRAINS and FloorMap")
```

```python solution
from dataclasses import dataclass

@dataclass(frozen=True)
class Terrain:
    name: str
    move_cost: int
    passable: bool

TERRAINS = [Terrain("floor", 1, True), Terrain("ramp", 3, True), Terrain("rack", 0, False), Terrain("wet", 5, True)]
_INDEX = {t.name: i for i, t in enumerate(TERRAINS)}

class FloorMap:
    def __init__(self, width, height):
        self.width, self.height = width, height
        self._cells = bytearray(width * height)

    def _offset(self, x, y):
        if not (0 <= x < self.width and 0 <= y < self.height):
            raise IndexError(f"cell {(x, y)} is off the map")
        return y * self.width + x

    def set(self, x, y, name):
        self._cells[self._offset(x, y)] = _INDEX[name]

    def get(self, x, y):
        return TERRAINS[self._cells[self._offset(x, y)]]

    def path_cost(self, cells):
        total = 0
        for x, y in cells:
            terrain = self.get(x, y)
            if not terrain.passable:
                return None
            total += terrain.move_cost
        return total

floor = FloorMap(5, 3)
floor.set(2, 1, "ramp")
print(floor.get(2, 1), floor.path_cost([(0, 1), (1, 1), (2, 1), (3, 1)]))
```

```python test
import tracemalloc as _tm, dataclasses as _dc
for _n in ["Terrain", "TERRAINS", "FloorMap"]:
    assert _n in dir(), f"Define {_n}."
assert [(_t.name, _t.move_cost, _t.passable) for _t in TERRAINS] == [("floor", 1, True), ("ramp", 3, True), ("rack", 0, False), ("wet", 5, True)], "Check the four terrains and their order."
_m = FloorMap(5, 3)
assert _m.get(4, 2) is TERRAINS[0], "Every cell starts as the shared floor object."
_m.set(2, 1, "ramp"); _m.set(3, 1, "wet")
assert _m.get(2, 1) is TERRAINS[1] and _m.get(3, 1) is TERRAINS[3], "get returns the shared Terrain objects."
assert _m.path_cost([(0, 1), (1, 1), (2, 1), (3, 1)]) == 1 + 1 + 3 + 5, "Costs add up along the path."
_m.set(1, 1, "rack")
assert _m.path_cost([(0, 1), (1, 1), (2, 1)]) is None, "A path through a rack is impossible."
assert _m.path_cost([]) == 0, "An empty path costs nothing."
for _bad in [(5, 0), (0, 3), (-1, 0)]:
    try:
        _m.get(*_bad)
        assert False, f"Cell {_bad} is off a 5 × 3 map: raise IndexError."
    except IndexError:
        pass
try:
    _m.set(0, 0, "lava")
    assert False, "An unknown terrain should raise KeyError."
except KeyError:
    pass
try:
    TERRAINS[0].move_cost = 9
    assert False, "Terrains are shared: they must be frozen."
except _dc.FrozenInstanceError:
    pass
_tm.start()
_big = FloorMap(1000, 1000)
for _x in range(0, 1000, 10):
    _big.set(_x, 500, "rack")
_used = _tm.get_traced_memory()[0]
_tm.stop()
assert _used < 2_000_000, f"A million cells use {_used / 1e6:.1f} MB: store one byte per cell, not an object per cell."
assert _big.get(10, 500) is TERRAINS[2] and _big.get(11, 500) is TERRAINS[0], "The large map works like the small one."
"SUCCESS: A million cells cost a megabyte: each cell is one byte pointing into four shared, immutable terrain objects."
```

Hint: Keep `bytearray(width * height)` (all zeros, so all floor) and index it with `y * width + x` after a bounds check. `set` stores the terrain's index, found from a dict of name to index (an unknown name raises `KeyError` by itself). `get` returns `TERRAINS[index]`.
:::

## What you learned

- When many objects repeat the same data, the flyweight pattern shares it: intrinsic state (common, context-free) lives in shared objects, and extrinsic state (per object) is stored by whoever uses them.
- A flyweight factory guarantees one object per distinct value. Without it, nothing would be shared.
- Flyweights must be immutable, such as frozen dataclasses, because a change would reach every object sharing them. To change one user, point it at a different flyweight.
- `__slots__` removes the per-instance dictionary from the many small extrinsic objects. Going further, extrinsic state can live in compact arrays, with objects reduced to indexes into shared tables.
- Python itself shares small integers, interned strings, `None`, `True` and `False`, all immutable.

The next lesson moves to the behavioural patterns, which are about how objects communicate. It begins with Observer: letting objects subscribe to events without the sender knowing who they are.
