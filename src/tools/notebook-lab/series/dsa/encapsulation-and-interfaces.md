# Encapsulation and interfaces

A class makes promises. A stock record promises its quantity is never negative. A booking calendar promises no two bookings overlap. A sorted collection promises it is sorted. These promises are called **invariants**, and the class's methods are written to keep them. But if other code can reach in and change the data directly, no method gets the chance to check, and the promise is only as good as every line of code in the program.

**Encapsulation** means keeping a class's data behind its methods, so that the methods are the only way in. It gives two benefits. The class can keep its invariants, because every change passes through code that checks. And the class can change **how** it stores things without breaking anyone, because nobody outside depended on the storage. What outside code may rely on is the class's **interface**: its public methods and what they promise. The rest is **implementation**, free to change.

This lesson covers:

- an invariant broken from outside, and protecting it;
- Python's conventions for internal names, and returning copies instead of internals;
- changing a class's internal representation without changing its interface;
- writing interfaces down: abstract base classes and protocols.

## A promise broken from outside

A parts store tracks stock. Its `remove` method refuses to take out more than there is, so the quantity can never go negative. But the quantities live in a public dictionary, and some other code, perhaps a quick fix in a report script, adjusts it directly. Predict before running: what quantity of bolts does the store report at the end?

```python type
class Stock:
    def __init__(self):
        self.levels = {}

    def add(self, part, quantity):
        self.levels[part] = self.levels.get(part, 0) + quantity

    def remove(self, part, quantity):
        if quantity > self.levels.get(part, 0):
            raise ValueError(f"only {self.levels.get(part, 0)} {part} in stock")
        self.levels[part] -= quantity

store = Stock()
store.add("bolt M8", 40)
try:
    store.remove("bolt M8", 50)
except ValueError as error:
    print("refused:", error)

store.levels["bolt M8"] -= 50
print("bolts in stock:", store.levels["bolt M8"])
```

```output
refused: only 40 bolt M8 in stock
bolts in stock: -10
```

`remove` correctly refused to take 50 bolts, but one line of outside code did it anyway, and the store now claims −10 bolts. Every piece of code that trusted the invariant, such as a reorder calculation, is now wrong, and the bug is not in `Stock` at all. The class could only keep its promise if every caller in the program behaved.

## Internal names, and handing out copies

Python has no `private` keyword. Instead, a convention everyone follows: a name starting with one underscore, like `_levels`, means "internal; don't use from outside". Linters and editors warn about it, and readers know the attribute is not part of the interface. (Two underscores, `__levels`, makes Python **mangle** the name to `_Stock__levels`. That mainly avoids clashes in subclasses, and does not make the attribute truly private.)

The second rule matters as much: never hand out the internal object itself. If a method returns `self._levels`, the caller holds the same dictionary and can change it. Return a **copy**, or a read-only view, instead. The Python from Zero lesson on properties showed the remaining tool: `@property` gives read access through a method that can compute, copy or check. Predict before running: does changing the returned dictionary affect the store?

```python type
from types import MappingProxyType

class Stock:
    def __init__(self):
        self._levels = {}

    def add(self, part, quantity):
        if quantity <= 0:
            raise ValueError("quantity must be positive")
        self._levels[part] = self._levels.get(part, 0) + quantity

    def remove(self, part, quantity):
        if quantity > self._levels.get(part, 0):
            raise ValueError(f"only {self._levels.get(part, 0)} {part} in stock")
        self._levels[part] -= quantity

    def quantity(self, part):
        return self._levels.get(part, 0)

    @property
    def levels(self):
        return MappingProxyType(self._levels)

store = Stock()
store.add("bolt M8", 40)
view = store.levels
print("view:", dict(view))
try:
    view["bolt M8"] = -10
except TypeError as error:
    print("refused:", error)
store.add("washer", 100)
print("the view follows the store:", dict(view))
print("public attributes:", [name for name in vars(store) if not name.startswith("_")])
```

```output
view: {'bolt M8': 40}
refused: 'mappingproxy' object does not support item assignment
the view follows the store: {'bolt M8': 40, 'washer': 100}
public attributes: []
```

`MappingProxyType` wraps a dictionary in a **read-only view**: it can be read like a dict and always shows the current contents, but any attempt to change it raises `TypeError`. It is cheaper than a copy and safer than the original. It is read-only one level deep only: if the values were lists, those lists could still be changed through it.

The view cannot be changed, so every change to the stock goes through `add` and `remove`, which check. Nothing stops a determined programmer from writing `store._levels[...] = -10`, but the underscore makes it obvious that the line breaks the rules, and a reviewer will catch it. Python relies on this kind of agreement rather than on enforcement.

## Changing the inside, keeping the outside

The second payoff of encapsulation is freedom to change the implementation. A machine shop models its floor as a grid of cells, each either empty or holding a machine's name. The first version stores a full list of lists. Then the shop's software is used for a warehouse with 2,000 × 2,000 cells, nearly all empty, and the list of lists wastes memory on four million `None`s. Because callers only ever used `get`, `place` and `count`, the storage can be swapped for a dictionary holding just the occupied cells. Predict before running: does the same client code give the same answer on both, and how much memory does each use?

```python type
import sys, tracemalloc

class DenseFloor:
    def __init__(self, rows, cols):
        self._cells = [[None] * cols for _ in range(rows)]

    def place(self, r, c, machine):
        self._cells[r][c] = machine

    def get(self, r, c):
        return self._cells[r][c]

    def count(self):
        return sum(cell is not None for row in self._cells for cell in row)

class SparseFloor:
    def __init__(self, rows, cols):
        self._rows, self._cols = rows, cols
        self._cells = {}

    def place(self, r, c, machine):
        if not (0 <= r < self._rows and 0 <= c < self._cols):
            raise IndexError("cell outside the floor")
        if machine is None:
            self._cells.pop((r, c), None)
        else:
            self._cells[(r, c)] = machine

    def get(self, r, c):
        if not (0 <= r < self._rows and 0 <= c < self._cols):
            raise IndexError("cell outside the floor")
        return self._cells.get((r, c))

    def count(self):
        return len(self._cells)

def lay_out_workshop(floor):
    for i, machine in enumerate(["lathe", "mill", "drill", "press", "saw"]):
        floor.place(10 * i, 7 * i, machine)
    floor.place(0, 0, None)
    return floor.count(), floor.get(20, 14)

for kind in [DenseFloor, SparseFloor]:
    tracemalloc.start()
    floor = kind(2000, 2000)
    result = lay_out_workshop(floor)
    peak = tracemalloc.get_traced_memory()[1]
    tracemalloc.stop()
    print(f"{kind.__name__:<12} {result}   peak memory {peak / 1e3:,.1f} kB")
```

`tracemalloc` measures how much memory Python allocates between `start()` and `stop()`; `get_traced_memory()` returns the current and peak amounts in bytes.

`lay_out_workshop` gives the same answer on both: 4 machines (the lathe at (0, 0) was removed again), with the drill at row 20, column 14. It has no idea which floor it has. The sparse version uses a tiny fraction of the memory: well under a kilobyte for its few entries, against about 16,000 kB (16 MB) of pointers to `None`. If callers had reached into `_cells` as a list of lists, swapping would have broken all of them. The interface (`place`, `get`, `count`) was the only thing they could depend on, so it was the only thing that had to stay the same.

## Writing the interface down: ABCs and protocols

`DenseFloor` and `SparseFloor` share an interface only by agreement: nothing in the code says so. Python offers two ways to make it explicit.

An **abstract base class** (ABC) declares the methods a family of classes must provide. A subclass that leaves one of them out cannot even be created: Python raises `TypeError` at the moment of construction, not later when the missing method is called. The ABC can also supply **concrete** methods built on the abstract ones, which every subclass inherits.

A **protocol** describes an interface **structurally**: any class with the right methods counts, with no inheritance needed. This is Python's duck typing ("if it has `area()`, treat it as a shape"), written down so that type checkers, and with `@runtime_checkable` also `isinstance`, can check it. Predict before running: which line fails, and with what error?

```python type
from abc import ABC, abstractmethod
from typing import Protocol, runtime_checkable

class Floor(ABC):
    @abstractmethod
    def place(self, r, c, machine): ...

    @abstractmethod
    def get(self, r, c): ...

    @abstractmethod
    def count(self): ...

    def is_free(self, r, c):
        return self.get(r, c) is None

class DictFloor(Floor):
    def __init__(self):
        self._cells = {}
    def place(self, r, c, machine):
        self._cells[(r, c)] = machine
    def get(self, r, c):
        return self._cells.get((r, c))
    def count(self):
        return len(self._cells)

class ForgetfulFloor(Floor):
    def place(self, r, c, machine):
        pass

f = DictFloor()
f.place(1, 1, "lathe")
print("is (1, 1) free?", f.is_free(1, 1), "  is (2, 2) free?", f.is_free(2, 2))
try:
    ForgetfulFloor()
except TypeError as error:
    print("TypeError:", error)

@runtime_checkable
class HasCount(Protocol):
    def count(self): ...

print("SparseFloor counts as HasCount:", isinstance(SparseFloor(5, 5), HasCount))
print("a list counts as HasCount:", isinstance([1, 2], HasCount), "  an int:", isinstance(7, HasCount))
```

```output
is (1, 1) free? False   is (2, 2) free? True
TypeError: Can't instantiate abstract class ForgetfulFloor without an implementation for abstract methods 'count', 'get'
SparseFloor counts as HasCount: True
a list counts as HasCount: True   an int: False
```

`...` (the ellipsis) is a placeholder body: these methods have no implementation in the base class.

`ForgetfulFloor()` fails immediately: Python lists the abstract methods it did not implement, `count` and `get`. `DictFloor` inherited `is_free` for free. The protocol check accepts `SparseFloor`, which never mentions `HasCount`, because it has a `count` method. It also accepts a list, which has a `count` method too (with a different meaning). Runtime protocol checks only look for the method **names**, not their arguments or meaning.

When to use which? Use an ABC when you own a family of related classes and want shared code and an early error for incomplete subclasses. Use a protocol to describe what a function needs from its argument, when the classes passed to it are not yours, or should not need to inherit anything.

::: challenge The booking sheet [easy]
Write a class `BookingSheet` for a workshop's single test rig, bookable by the hour from 9 to 17 (a booking at hour 16 runs 16:00 to 17:00, so valid hours are 9 to 16). Store the bookings in an internal attribute whose name starts with an underscore; the object must have **no** public data attributes. Provide:

- `book(hour, name)`: record the booking; raise `ValueError` if the hour is outside 9 to 16 or already booked;
- `cancel(hour)`: remove a booking; raise `KeyError` if there is none;
- `bookings()`: return the bookings as a **new** list of `(hour, name)` tuples sorted by hour, so that changing the returned list cannot change the sheet.

```python starter
class BookingSheet:
    def __init__(self):
        self.slots = {}

sheet = BookingSheet()
```

```python solution
class BookingSheet:
    def __init__(self):
        self._slots = {}

    def book(self, hour, name):
        if not 9 <= hour <= 16:
            raise ValueError(f"the rig is bookable from 9 to 16, not {hour}")
        if hour in self._slots:
            raise ValueError(f"{hour}:00 is already booked by {self._slots[hour]}")
        self._slots[hour] = name

    def cancel(self, hour):
        del self._slots[hour]

    def bookings(self):
        return sorted(self._slots.items())

sheet = BookingSheet()
sheet.book(10, "Ana")
sheet.book(9, "Ben")
print(sheet.bookings())
```

```python test
assert "BookingSheet" in dir(), "Keep the class name BookingSheet."
_s = BookingSheet()
assert all(_n.startswith("_") for _n in vars(_s)), f"Keep all data in underscore attributes; found public ones: {[_n for _n in vars(_s) if not _n.startswith('_')]}."
_s.book(14, "Ana"); _s.book(9, "Ben"); _s.book(16, "Cy")
assert _s.bookings() == [(9, "Ben"), (14, "Ana"), (16, "Cy")], f"bookings() should be sorted by hour; got {_s.bookings()}."
for _bad in [8, 17, 20]:
    try:
        _s.book(_bad, "Dee")
        assert False, f"Booking hour {_bad} should raise ValueError."
    except ValueError:
        pass
try:
    _s.book(14, "Eve")
    assert False, "Double-booking 14:00 should raise ValueError."
except ValueError:
    pass
assert _s.bookings() == [(9, "Ben"), (14, "Ana"), (16, "Cy")], "Refused bookings must not change the sheet."
_copy = _s.bookings()
_copy.append((12, "Hacker")); _copy.clear()
assert _s.bookings() == [(9, "Ben"), (14, "Ana"), (16, "Cy")], "Changing the list bookings() returned must not change the sheet: return a new list."
_s.cancel(14)
assert _s.bookings() == [(9, "Ben"), (16, "Cy")], "cancel removes the booking."
try:
    _s.cancel(14)
    assert False, "Cancelling an hour with no booking should raise KeyError."
except KeyError:
    pass
"SUCCESS: Every change goes through book and cancel, which check, and callers get copies: the sheet's promise of no clashes cannot be broken through its interface."
```

Hint: Rename `slots` to `_slots`. `book` checks `9 <= hour <= 16` and `hour in self._slots` before storing. `cancel` can simply `del self._slots[hour]`, which raises `KeyError` by itself. `sorted(self._slots.items())` builds a fresh sorted list of tuples.
:::

::: challenge A ring buffer behind a fixed interface [medium]
A sensor keeps its last `capacity` readings. The first version, `ListHistory`, stores them in a list and deletes the oldest with `pop(0)`, which shifts every remaining item: O(capacity) per reading. Write `RingHistory` with the **same interface**, `add(value)`, `latest(n)` (the newest n readings, oldest first, or fewer if fewer exist), `__len__` and `mean()` (`None` when empty), but stored in a fixed-size list used as a **ring**. Keep the index where the next reading goes, and when it reaches the end, wrap round to 0, overwriting the oldest reading. Then `add` is O(1). Keep a running total too, so `mean()` is O(1). The test runs the same random operations on both classes and compares every answer.

```python starter
class ListHistory:
    def __init__(self, capacity):
        self._capacity, self._items = capacity, []

    def add(self, value):
        self._items.append(value)
        if len(self._items) > self._capacity:
            self._items.pop(0)

    def latest(self, n):
        return self._items[-n:] if n > 0 else []

    def __len__(self):
        return len(self._items)

    def mean(self):
        return sum(self._items) / len(self._items) if self._items else None

class RingHistory:
    def __init__(self, capacity):
        pass

h = RingHistory(3)
```

```python solution
class ListHistory:
    def __init__(self, capacity):
        self._capacity, self._items = capacity, []

    def add(self, value):
        self._items.append(value)
        if len(self._items) > self._capacity:
            self._items.pop(0)

    def latest(self, n):
        return self._items[-n:] if n > 0 else []

    def __len__(self):
        return len(self._items)

    def mean(self):
        return sum(self._items) / len(self._items) if self._items else None

class RingHistory:
    def __init__(self, capacity):
        self._slots = [None] * capacity
        self._next = 0
        self._size = 0
        self._total = 0

    def add(self, value):
        if self._size == len(self._slots):
            self._total -= self._slots[self._next]
        else:
            self._size += 1
        self._slots[self._next] = value
        self._total += value
        self._next = (self._next + 1) % len(self._slots)

    def latest(self, n):
        n = max(0, min(n, self._size))
        start = (self._next - n) % len(self._slots)
        return [self._slots[(start + i) % len(self._slots)] for i in range(n)]

    def __len__(self):
        return self._size

    def mean(self):
        return self._total / self._size if self._size else None

h = RingHistory(3)
for v in [5, 6, 7, 8]:
    h.add(v)
print(h.latest(3), len(h), h.mean())
```

```python test
import random as _random, time as _time
assert "RingHistory" in dir(), "Keep the class name RingHistory."
_h = RingHistory(3)
assert len(_h) == 0 and _h.mean() is None and _h.latest(2) == [], "An empty history has length 0, mean None and no readings."
for _v in [5, 6, 7, 8]:
    _h.add(_v)
assert _h.latest(3) == [6, 7, 8] and len(_h) == 3 and _h.mean() == 7, f"After 5, 6, 7, 8 with capacity 3: latest(3) is [6, 7, 8], mean 7; got {_h.latest(3)}, {_h.mean()}."
assert _h.latest(10) == [6, 7, 8] and _h.latest(1) == [8] and _h.latest(0) == [], "latest(n) gives at most what is stored, oldest first."
_rng = _random.Random(18)
for _ in range(60):
    _cap = _rng.randint(1, 8)
    _a, _b = ListHistory(_cap), RingHistory(_cap)
    for _step in range(40):
        _v = _rng.randint(-50, 50)
        _a.add(_v); _b.add(_v)
        _n = _rng.randint(0, _cap + 2)
        assert _b.latest(_n) == _a.latest(_n), f"Capacity {_cap}: latest({_n}) gave {_b.latest(_n)}, expected {_a.latest(_n)}."
        assert len(_b) == len(_a), "Lengths differ from ListHistory."
        assert abs(_b.mean() - _a.mean()) < 1e-9, "Means differ from ListHistory."
assert all(_n.startswith("_") for _n in vars(RingHistory(4))), "Keep the ring's data in underscore attributes."
_big = RingHistory(200_000)
_start = _time.perf_counter()
for _v in range(400_000):
    _big.add(_v)
    if _v % 1000 == 0:
        _big.mean()
    if _time.perf_counter() - _start > 4:
        break
_el = _time.perf_counter() - _start
assert _el < 3, f"400,000 readings into a 200,000-reading history took over {_el:.1f} s: add and mean must be O(1), with no shifting and no re-summing."
assert _big.latest(2) == [399_998, 399_999] and _big.mean() == sum(range(200_000, 400_000)) / 200_000, "The large history's contents are wrong."
"SUCCESS: The same four methods hide a completely different structure: O(1) adds and means instead of shifting the whole list."
```

Hint: Keep `_slots` (a list of `capacity` Nones), `_next` (where the next reading goes), `_size` and `_total`. In `add`, if the ring is full, subtract the value about to be overwritten. Then store, add to the total, and advance `_next` with `% capacity`. For `latest(n)`, clamp n to `_size`; the oldest of those is at `(_next - n) % capacity`, and the rest follow, wrapping round.
:::

::: challenge Shapes behind an ABC and a protocol [hard]
Write an abstract base class `Shape` (subclass `ABC`) with two abstract methods, `area()` and `perimeter()`, and one concrete method `describe()` returning `f"{type(self).__name__}: area {self.area():.2f}, perimeter {self.perimeter():.2f}"`. Then write `Circle(radius)` and `Rectangle(width, height)` as subclasses. Next, write a runtime-checkable protocol `HasArea` with one method, `area()`. Finally, write `total_area(items)`, which adds up `item.area()` for every item. It should accept **any** object that satisfies `HasArea`, even one unrelated to `Shape`, and raise `TypeError` with `repr(item)` in the message if one does not.

```python starter
from abc import ABC, abstractmethod
from typing import Protocol, runtime_checkable
import math

class Shape(ABC):
    pass

print("define Shape, Circle, Rectangle, HasArea and total_area")
```

```python solution
from abc import ABC, abstractmethod
from typing import Protocol, runtime_checkable
import math

class Shape(ABC):
    @abstractmethod
    def area(self): ...

    @abstractmethod
    def perimeter(self): ...

    def describe(self):
        return f"{type(self).__name__}: area {self.area():.2f}, perimeter {self.perimeter():.2f}"

class Circle(Shape):
    def __init__(self, radius):
        self.radius = radius
    def area(self):
        return math.pi * self.radius ** 2
    def perimeter(self):
        return 2 * math.pi * self.radius

class Rectangle(Shape):
    def __init__(self, width, height):
        self.width, self.height = width, height
    def area(self):
        return self.width * self.height
    def perimeter(self):
        return 2 * (self.width + self.height)

@runtime_checkable
class HasArea(Protocol):
    def area(self): ...

def total_area(items):
    total = 0
    for item in items:
        if not isinstance(item, HasArea):
            raise TypeError(f"{item!r} has no area() method")
        total += item.area()
    return total

print(Circle(1).describe())
print(total_area([Circle(1), Rectangle(2, 3)]))
```

```python test
import inspect as _inspect, math as _math
for _n in ["Shape", "Circle", "Rectangle", "HasArea", "total_area"]:
    assert _n in dir(), f"Define {_n}."
try:
    Shape()
    assert False, "Shape itself should not be constructible: it is abstract."
except TypeError:
    pass
assert _inspect.isabstract(Shape) and {"area", "perimeter"} <= set(Shape.__abstractmethods__), "Shape should declare area and perimeter as abstract methods."
class _Half(Shape):
    def area(self):
        return 1
try:
    _Half()
    assert False, "A subclass missing perimeter() should fail to construct."
except TypeError:
    pass
assert Circle(2).describe() == "Circle: area 12.57, perimeter 12.57", f"Got {Circle(2).describe()!r}."
assert Rectangle(3, 4).describe() == "Rectangle: area 12.00, perimeter 14.00", f"Got {Rectangle(3, 4).describe()!r}."
assert "describe" not in vars(Circle) and "describe" not in vars(Rectangle), "describe belongs in Shape only; the subclasses inherit it."
class _Plot:
    def __init__(self, a):
        self.a = a
    def area(self):
        return self.a
assert not issubclass(_Plot, Shape), "(test setup)"
assert isinstance(_Plot(5), HasArea) and not isinstance(5, HasArea) and not isinstance("text", HasArea), "HasArea should match anything with an area() method, via @runtime_checkable."
_t = total_area([Circle(1), Rectangle(2, 3), _Plot(10)])
assert abs(_t - (_math.pi + 16)) < 1e-9, f"total_area should accept shapes and any object with area(); got {_t}."
assert total_area([]) == 0, "No items, no area."
try:
    total_area([Rectangle(1, 1), 42])
    assert False, "total_area should raise TypeError for an item without area()."
except TypeError as _e:
    assert "42" in str(_e), f"Name the offending item in the error message; got {_e}."
"SUCCESS: The ABC guarantees every Shape is complete and shares describe(); the protocol lets total_area accept anything with an area(), no inheritance required."
```

Hint: Decorate `area` and `perimeter` in `Shape` with `@abstractmethod` and give them `...` bodies; `describe` is an ordinary method. The protocol is a class subclassing `Protocol`, decorated with `@runtime_checkable`, containing `def area(self): ...`. In `total_area`, check `isinstance(item, HasArea)` before using each item, and raise `TypeError(f"{item!r} ...")` if not.
:::

## What you learned

- A class's invariants are only safe if every change goes through its methods. Public mutable data lets any line of the program break them.
- Python marks internal names with a leading underscore and relies on agreement, not enforcement. Return copies or read-only views (`MappingProxyType`), never the internal objects themselves.
- Callers that use only the interface survive a complete change of representation. A dense grid became a sparse one, and a shifting list became a ring buffer, without touching client code.
- An abstract base class declares required methods, refuses to construct incomplete subclasses, and can share concrete methods. A protocol describes an interface by structure, so any class with the right methods qualifies; runtime checks only look at method names.

The next lesson compares two ways of reusing code, inheritance and composition, and shows why deep inheritance hierarchies tend to break when requirements change.
