# Composition over inheritance

Inheritance is the first reuse tool most programmers learn: write a base class, subclass it, override what differs, inherit the rest. It works well for small, stable families. But inheritance is the **tightest** coupling Python offers. A subclass depends on everything its base class does, including details the base class never promised. And a hierarchy can only grow along one axis at a time. When a second, independent kind of variation appears, the number of subclasses multiplies.

**Composition** is the alternative: instead of a class **being** a kind of something, it **has** parts, and delegates work to them. A robot is not a "welding robot" subclass. It is a robot that has a welding tool and has wheels. The design principle "favour composition over inheritance" comes from the classic *Design Patterns* book, and most of the patterns later in this series are applications of it.

This lesson covers:

- the subclass explosion when a hierarchy must vary in two ways at once;
- the same design with composed parts, and swapping parts at run time;
- the **fragile base class** problem: a subclass broken by how its base class happens to work;
- when inheritance is still the right tool.

## Two kinds of variation

A factory runs robots that differ in their **tool** (welder, painter) and in how they **move** (fixed in place, on wheels, on tracks). With inheritance, each combination is a class. Predict before running: how many classes does each design need for 4 tools and 3 kinds of movement?

```python type
class Robot:
    def move_to(self, x):
        return "stays at the station"
    def work(self):
        return "does nothing"

class Welder(Robot):
    def work(self):
        return "welds a seam"

class Painter(Robot):
    def work(self):
        return "paints a panel"

class WheeledWelder(Welder):
    def move_to(self, x):
        return f"drives to {x} on wheels"

class WheeledPainter(Painter):
    def move_to(self, x):
        return f"drives to {x} on wheels"

class TrackedWelder(Welder):
    def move_to(self, x):
        return f"crawls to {x} on tracks"

class TrackedPainter(Painter):
    def move_to(self, x):
        return f"crawls to {x} on tracks"

r = TrackedPainter()
print(r.move_to("bay 3"), "and", r.work())

for tools, drives in [(2, 3), (4, 3), (6, 4)]:
    print(f"{tools} tools, {drives} drives: {tools * drives} combination classes with inheritance, {tools + drives} part classes with composition")
```

```output
crawls to bay 3 on tracks and paints a panel
2 tools, 3 drives: 6 combination classes with inheritance, 5 part classes with composition
4 tools, 3 drives: 12 combination classes with inheritance, 7 part classes with composition
6 tools, 4 drives: 24 combination classes with inheritance, 10 part classes with composition
```

Already the wheels code is written twice (in `WheeledWelder` and `WheeledPainter`), and so are the tracks. A bug fix to wheeled movement must be made in every wheeled class.

Inheritance can only share code **down one line**. Every combination of tool and drive must be its own class, and the movement code is copied into each tool's branch. The counts grow as a product: 4 tools and 3 drives need 12 combination classes, 6 and 4 need 24. A third kind of variation (say, a power source) multiplies again. Composition needs one class per **part**: 4 + 3 = 7, then 6 + 4 = 10.

## Composing parts

With composition, a `Robot` holds a `tool` object and a `drive` object, and passes work to them, which is called **delegation**. Each tool and each drive is written once. Any tool works with any drive, and since the parts are just attributes, a robot can even change its tool while running. Predict before running: what does the robot report after its tool is swapped?

```python type
class WeldingTool:
    def work(self):
        return "welds a seam"

class PaintGun:
    def work(self):
        return "paints a panel"

class Gripper:
    def work(self):
        return "moves a part"

class Fixed:
    def move_to(self, x):
        return "stays at the station"

class Wheels:
    def move_to(self, x):
        return f"drives to {x} on wheels"

class Tracks:
    def move_to(self, x):
        return f"crawls to {x} on tracks"

class Robot:
    def __init__(self, name, tool, drive):
        self.name, self.tool, self.drive = name, tool, drive

    def do_job(self, place):
        return f"{self.name} {self.drive.move_to(place)} and {self.tool.work()}"

r2 = Robot("R2", PaintGun(), Tracks())
print(r2.do_job("bay 3"))
r2.tool = Gripper()
print(r2.do_job("bay 4"))
print(Robot("W1", WeldingTool(), Fixed()).do_job("bay 1"))
```

```output
R2 crawls to bay 3 on tracks and paints a panel
R2 crawls to bay 4 on tracks and moves a part
W1 stays at the station and welds a seam
```

`Robot.do_job` does not know or care which tool or drive it has. It only relies on each having a `work` or `move_to` method: the duck typing, or protocol, from the last lesson.

The swapped robot now "moves a part": the same object took on a new behaviour without a new class. With inheritance, in ordinary code an object's class is fixed when it is created, so a welder can never become a painter. Each part can also be tested alone (a `Wheels` object needs no tool to test), and adding a fourth drive means writing one class that works with every existing tool.

## The fragile base class

The second problem with inheritance is subtler. A subclass that overrides some methods depends on **how** the base class uses its own methods, which is an implementation detail the base class never promised. A classic example: count how many items are ever added to a list by subclassing `list` and overriding `append`. Predict before running: what count does it report after one `append` and an `extend` of three items?

```python type
class CountingList(list):
    def __init__(self):
        super().__init__()
        self.added = 0

    def append(self, item):
        self.added += 1
        super().append(item)

parts = CountingList()
parts.append("bolt")
parts.extend(["nut", "washer", "pin"])
parts += ["clip"]
print("items:", len(parts), "  counted as added:", parts.added)
```

```output
items: 5   counted as added: 1
```

It reports 1, though five items were added. `list.extend` and `+=` are written in C, and they add items directly, without calling `append`. The subclass assumed `extend` would go through `append`; that was never promised, and for `list` it is false. The opposite surprise happens too: if a base class's `add_all` **does** call `add`, a subclass that counts in both methods counts everything twice. Either way, the subclass's correctness depends on internal details of its base class, which is exactly the tight coupling the design lessons warn about. Worse, a later version of the base class could change those details and break the subclass without either class's code changing.

Composition removes the dependency. A wrapper **holds** a list and exposes only the operations it supports, each written to count correctly:

```python type
class CountingBag:
    def __init__(self):
        self._items = []
        self.added = 0

    def add(self, item):
        self._items.append(item)
        self.added += 1

    def add_all(self, items):
        for item in items:
            self.add(item)

    def __len__(self):
        return len(self._items)

    def __iter__(self):
        return iter(self._items)

bag = CountingBag()
bag.add("bolt")
bag.add_all(["nut", "washer", "pin"])
print("items:", len(bag), "  counted as added:", bag.added, "  contents:", list(bag))
print("has list's extend?", hasattr(bag, "extend"))
```

```output
items: 4   counted as added: 4   contents: ['bolt', 'nut', 'washer', 'pin']
has list's extend? False
```

`CountingBag` decides exactly which operations exist, and each one counts. It has no `extend`, `insert` or `+=` waiting to bypass the count, because it inherits nothing it did not ask for. The cost is writing the operations it needs, here four short methods, and that is usually a price worth paying.

## When inheritance is right

Composition is not always better. Inheritance is the right tool when:

- the subclass really **is a** kind of the base class, and can be used anywhere the base class is expected without surprises (the SOLID lesson calls this the Liskov substitution principle);
- the hierarchy is shallow and varies along one axis only;
- a framework asks for it. Abstract base classes, `Exception` subclasses and test-case classes are designed to be subclassed, and their documentation says which methods to override.

Custom exceptions are the everyday example: `class OutOfStock(ValueError)` really is a `ValueError`, adds nothing fragile, and lets callers catch either. A useful rule of thumb: **inherit to be substituted, compose to reuse code**. If the reason for a subclass is only to get some methods for free, a part is usually better than a parent.

::: challenge Alarms from parts [easy]
A plant has alarms that beep, alarms that flash a light, and alarms that do both, written as three subclasses. Replace them with composition. Write two signal classes, `Beep` and `Flash`, each with a method `emit(message)` returning a string: `f"BEEP: {message}"` and `f"FLASH: {message}"`. Write `Both(first, second)`, a signal holding two other signals, whose `emit(message)` returns their two strings joined by `" + "`. Finally, write `Alarm(signal)` with a method `raise_alarm(message)` that returns `self.signal.emit(message.upper())`. Any signal, including a `Both`, must work in any alarm.

```python starter
class Alarm:
    def raise_alarm(self, message):
        return message.upper()

class BeepingAlarm(Alarm):
    def raise_alarm(self, message):
        return "BEEP: " + super().raise_alarm(message)

class FlashingAlarm(Alarm):
    def raise_alarm(self, message):
        return "FLASH: " + super().raise_alarm(message)

class BeepingFlashingAlarm(Alarm):
    def raise_alarm(self, message):
        text = super().raise_alarm(message)
        return "BEEP: " + text + " + FLASH: " + text

print(BeepingFlashingAlarm().raise_alarm("boiler pressure"))
```

```python solution
class Beep:
    def emit(self, message):
        return f"BEEP: {message}"

class Flash:
    def emit(self, message):
        return f"FLASH: {message}"

class Both:
    def __init__(self, first, second):
        self.first, self.second = first, second

    def emit(self, message):
        return self.first.emit(message) + " + " + self.second.emit(message)

class Alarm:
    def __init__(self, signal):
        self.signal = signal

    def raise_alarm(self, message):
        return self.signal.emit(message.upper())

print(Alarm(Both(Beep(), Flash())).raise_alarm("boiler pressure"))
```

```python test
import inspect as _inspect
for _n in ["Beep", "Flash", "Both", "Alarm"]:
    assert _n in dir(), f"Define {_n}."
assert Beep().emit("x") == "BEEP: x" and Flash().emit("y") == "FLASH: y", "Beep and Flash format their messages."
assert Alarm(Beep()).raise_alarm("door open") == "BEEP: DOOR OPEN", "An alarm upper-cases the message and hands it to its signal."
assert Alarm(Flash()).raise_alarm("smoke") == "FLASH: SMOKE"
assert Alarm(Both(Beep(), Flash())).raise_alarm("boiler pressure") == "BEEP: BOILER PRESSURE + FLASH: BOILER PRESSURE", "Both joins its two signals with ' + '."
assert Alarm(Both(Flash(), Both(Beep(), Beep()))).raise_alarm("a") == "FLASH: A + BEEP: A + BEEP: A", "A Both can hold another Both: any signal goes anywhere."
class _Siren:
    def emit(self, message):
        return f"WOO: {message}"
assert Alarm(_Siren()).raise_alarm("fire") == "WOO: FIRE", "Alarm should work with any object that has emit(), not only the classes you wrote."
_a = Alarm(Beep())
_a.signal = Flash()
assert _a.raise_alarm("swap") == "FLASH: SWAP", "Changing an alarm's signal changes how it alerts."
assert not any(issubclass(_c, Alarm) for _c in [Beep, Flash, Both]), "Signals are parts an alarm holds, not kinds of alarm: they should not subclass Alarm."
"SUCCESS: Two signals and a combiner replace every subclass, and any new signal works with every alarm."
```

Hint: Each signal class has only `emit`. `Both.__init__` stores two signals, and its `emit` calls both and joins the results. `Alarm.__init__` stores the signal, and `raise_alarm` upper-cases the message and returns `self.signal.emit(...)`.
:::

::: challenge A history that counts honestly [medium]
An editor keeps an undo history as a subclass of `list` and counts the edits recorded, but `extend` and `+=` bypass its count, the fragile-base-class problem from the lesson. Write `EditHistory` with **composition** instead (it must not subclass `list`). It holds a list internally and provides:

- `record(edit)` and `record_all(edits)`, both counting every edit added;
- `undo()`, which removes and returns the most recent edit (raise `IndexError` if there is none) and does **not** change the count;
- `recorded`, a read-only property: the total number of edits ever recorded;
- `__len__` (edits currently held) and `__iter__` (oldest first).

```python starter
class EditHistory(list):
    def __init__(self):
        super().__init__()
        self.recorded = 0

    def append(self, edit):
        self.recorded += 1
        super().append(edit)

h = EditHistory()
h.append("type 'a'")
h.extend(["type 'b'", "delete"])
print(len(h), h.recorded)
```

```python solution
class EditHistory:
    def __init__(self):
        self._edits = []
        self._recorded = 0

    def record(self, edit):
        self._edits.append(edit)
        self._recorded += 1

    def record_all(self, edits):
        for edit in edits:
            self.record(edit)

    def undo(self):
        if not self._edits:
            raise IndexError("nothing to undo")
        return self._edits.pop()

    @property
    def recorded(self):
        return self._recorded

    def __len__(self):
        return len(self._edits)

    def __iter__(self):
        return iter(self._edits)

h = EditHistory()
h.record("type 'a'")
h.record_all(["type 'b'", "delete"])
print(len(h), h.recorded, h.undo(), len(h), h.recorded)
```

```python test
assert "EditHistory" in dir(), "Keep the class name EditHistory."
assert not issubclass(EditHistory, list), "Use composition: EditHistory should hold a list, not be one."
_h = EditHistory()
assert len(_h) == 0 and _h.recorded == 0 and list(_h) == [], "A new history is empty."
_h.record("a"); _h.record_all(["b", "c"]); _h.record_all(iter(["d"]))
assert len(_h) == 4 and _h.recorded == 4 and list(_h) == ["a", "b", "c", "d"], f"Four edits recorded, oldest first; got {list(_h)} with recorded = {_h.recorded}."
assert _h.undo() == "d" and _h.undo() == "c", "undo removes and returns the most recent edit."
assert len(_h) == 2 and _h.recorded == 4, "Undoing does not change how many edits were ever recorded."
_h.record("e")
assert list(_h) == ["a", "b", "e"] and _h.recorded == 5, "Recording after undo adds to both."
try:
    _h.recorded = 0
    assert False, "recorded should be read-only."
except AttributeError:
    pass
_e = EditHistory()
try:
    _e.undo()
    assert False, "Undo on an empty history should raise IndexError."
except IndexError:
    pass
for _way in ["extend", "append", "insert"]:
    if hasattr(_e, _way):
        _before = _e.recorded
        _args = (0, "x") if _way == "insert" else ((["x"],) if _way == "extend" else ("x",))
        getattr(_e, _way)(*_args)
        assert _e.recorded == _before + 1, f"EditHistory offers {_way}, but adding an edit through it was not counted: every way in must count."
"SUCCESS: The history offers only operations that count, so no inherited method can slip edits past the counter."
```

Hint: Store `_edits = []` and `_recorded = 0`. `record` appends and adds 1; `record_all` loops and calls `record`. `undo` checks for an empty list, then pops. Make `recorded` a `@property` returning `_recorded`, and delegate `__len__` and `__iter__` to the list.
:::

::: challenge A configurable delivery fleet [hard]
A warehouse plans delivery runs. A vehicle is made of parts. An **engine** decides cost: `engine.cost(km)` returns the cost of driving `km` kilometres. A **body** decides capacity: `body.fits(load_kg)` returns whether a load fits. Write:

- engines `Diesel(price_per_km)` (cost `price_per_km * km`) and `Electric(price_per_km, range_km)` (same cost, but raise `ValueError` if `km` is more than its range);
- bodies `Van(max_kg)` and `Truck(max_kg)`, both with `fits(load_kg)` returning `load_kg <= max_kg`; trucks also have a fixed `toll`, 15.0 per trip, which vans don't (a van's `toll` is 0.0);
- `Vehicle(name, engine, body)` with `trip_cost(km, load_kg)`: raise `ValueError` if the load doesn't fit, otherwise return `round(engine cost + body toll, 2)`;
- `cheapest(vehicles, km, load_kg)`: return the name of the vehicle with the lowest `trip_cost` among those that can do the trip (skip vehicles that raise `ValueError`), or `None` if none can.

Each part class must work with every other: none of these five classes should inherit from another of them (a shared base class of your own, such as `Body`, is fine).

```python starter
class Vehicle:
    pass

print("define Diesel, Electric, Van, Truck, Vehicle and cheapest")
```

```python solution
class Diesel:
    def __init__(self, price_per_km):
        self.price_per_km = price_per_km

    def cost(self, km):
        return self.price_per_km * km

class Electric:
    def __init__(self, price_per_km, range_km):
        self.price_per_km, self.range_km = price_per_km, range_km

    def cost(self, km):
        if km > self.range_km:
            raise ValueError(f"{km} km is beyond the {self.range_km} km range")
        return self.price_per_km * km

class Van:
    toll = 0.0

    def __init__(self, max_kg):
        self.max_kg = max_kg

    def fits(self, load_kg):
        return load_kg <= self.max_kg

class Truck:
    toll = 15.0

    def __init__(self, max_kg):
        self.max_kg = max_kg

    def fits(self, load_kg):
        return load_kg <= self.max_kg

class Vehicle:
    def __init__(self, name, engine, body):
        self.name, self.engine, self.body = name, engine, body

    def trip_cost(self, km, load_kg):
        if not self.body.fits(load_kg):
            raise ValueError(f"{load_kg} kg does not fit in {self.name}")
        return round(self.engine.cost(km) + self.body.toll, 2)

def cheapest(vehicles, km, load_kg):
    best_name, best_cost = None, None
    for v in vehicles:
        try:
            cost = v.trip_cost(km, load_kg)
        except ValueError:
            continue
        if best_cost is None or cost < best_cost:
            best_name, best_cost = v.name, cost
    return best_name

fleet = [Vehicle("diesel van", Diesel(0.30), Van(800)),
         Vehicle("e-van", Electric(0.12, 150), Van(600)),
         Vehicle("diesel truck", Diesel(0.45), Truck(5000))]
print(cheapest(fleet, 100, 500), cheapest(fleet, 200, 500), cheapest(fleet, 100, 2000), cheapest(fleet, 100, 9000))
```

```python test
import inspect as _inspect
for _n in ["Diesel", "Electric", "Van", "Truck", "Vehicle", "cheapest"]:
    assert _n in dir(), f"Define {_n}."
_mine = [Diesel, Electric, Van, Truck, Vehicle]
for _c in _mine:
    assert not any(_b in _mine for _b in _inspect.getmro(_c)[1:]), f"{_c.__name__} should not inherit from another of your classes: compose parts instead."
assert Diesel(0.3).cost(100) == 30 and Electric(0.1, 50).cost(50) == 5, "Engines cost price_per_km × km."
try:
    Electric(0.1, 50).cost(51)
    assert False, "An electric engine should refuse a trip beyond its range."
except ValueError:
    pass
assert Van(800).fits(800) and not Van(800).fits(801) and Truck(5000).fits(4999), "Bodies check the load against max_kg."
assert Van(1).toll == 0.0 and Truck(1).toll == 15.0, "Vans pay no toll; trucks pay 15.0 per trip."
_dv = Vehicle("diesel van", Diesel(0.30), Van(800))
_ev = Vehicle("e-van", Electric(0.12, 150), Van(600))
_dt = Vehicle("diesel truck", Diesel(0.45), Truck(5000))
_et = Vehicle("e-truck", Electric(0.20, 300), Truck(4000))
assert _dv.trip_cost(100, 500) == 30.0 and _dt.trip_cost(100, 500) == 60.0 and _et.trip_cost(100, 500) == 35.0, "trip_cost is engine cost plus toll, rounded."
try:
    _ev.trip_cost(10, 700)
    assert False, "A load that does not fit should raise ValueError."
except ValueError:
    pass
_fleet = [_dv, _ev, _dt, _et]
assert cheapest(_fleet, 100, 500) == "e-van", "100 km, 500 kg: the e-van costs 12.00."
assert cheapest(_fleet, 200, 500) == "e-truck", "200 km is beyond the e-van's range; the e-truck at 55.00, toll included, beats the diesel van at 60.00."
assert cheapest(_fleet, 100, 2000) == "e-truck", "2,000 kg needs a truck: the e-truck at 35.00 beats the diesel truck at 60.00."
assert cheapest(_fleet, 400, 4500) == "diesel truck", "4,500 kg for 400 km: only the diesel truck can do it."
assert cheapest(_fleet, 100, 9000) is None and cheapest([], 10, 1) is None, "If no vehicle can do the trip, return None."
_odd = Vehicle("e-truck-lite", Electric(0.05, 1000), Van(3000))
assert cheapest(_fleet + [_odd], 100, 2000) == "e-truck-lite", "Any engine works with any body: an electric engine in a large van body."
"SUCCESS: Two engines and two bodies give every combination with no subclasses, and new parts work with all the existing ones."
```

Hint: Give each engine a `cost(km)` and each body `fits(load_kg)` and a `toll` (a class attribute works well). `Vehicle.trip_cost` asks the body first, then adds `self.engine.cost(km)` and `self.body.toll`. `cheapest` tries every vehicle inside `try`/`except ValueError` and keeps the lowest cost.
:::

## What you learned

- Inheritance shares code down one line. When objects vary in two independent ways, every combination needs its own subclass, and the shared code is copied between branches.
- Composition builds objects from parts and delegates to them: one class per part, any combination, and parts can be swapped while the program runs.
- A subclass depends on how its base class uses its own methods. Overriding `append` on a `list` misses `extend` and `+=`. This fragile base class problem disappears when a wrapper holds the object instead and exposes only the operations it supports.
- Inherit when a subclass really is a substitutable kind of its base, in a shallow hierarchy, or when a framework is designed for it (exceptions, ABCs). Compose to reuse code.

The next lesson looks at the mechanism that makes composition work: polymorphism, where one piece of code works with many types because they share an interface.
