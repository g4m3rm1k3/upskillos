# Polymorphism and duck typing

`len("bolt")`, `len([1, 2, 3])` and `len({"a": 1})` all work, though a string, a list and a dictionary are stored in completely different ways. `for` loops over files, ranges, sets and generators alike. This is **polymorphism**: one piece of code working with many types, because each type supplies its own version of the operation. It is the mechanism that made composition work in the last lesson: `Robot.do_job` called `tool.work()` without knowing which tool it held.

In Python, polymorphism rests on **duck typing**: "if it walks like a duck and quacks like a duck, it is a duck". Code does not ask what type an object is. It asks the object to do something, and any object that can do it is welcome. This lesson shows what that buys, and the tools for the cases where it is not enough.

This lesson covers:

- the type switch, a chain of `isinstance` checks, and why it makes every new type expensive;
- replacing it with methods, so a new type is a new class and no other edits;
- making your own classes work with Python's built-in operations, including a trap in `sum`;
- `functools.singledispatch`, for operations on types you cannot add methods to;
- asking forgiveness rather than permission.

## The type switch

A shipping office prices letters, parcels and pallets. The first version keeps the items as plain classes holding data, and puts the logic in functions that check the type. Predict before reading on: what must change to add a fourth kind of item, say a tube for posters?

```python type
class Letter:
    def __init__(self, grams):
        self.grams = grams

class Parcel:
    def __init__(self, kg, fragile=False):
        self.kg, self.fragile = kg, fragile

class Pallet:
    def __init__(self, kg):
        self.kg = kg

def postage(item):
    if isinstance(item, Letter):
        return 0.85 if item.grams <= 100 else 1.55
    elif isinstance(item, Parcel):
        return 3.20 + 0.90 * item.kg + (2.50 if item.fragile else 0)
    elif isinstance(item, Pallet):
        return 45.00 + 0.12 * item.kg
    raise TypeError(f"cannot price {item!r}")

def label(item):
    if isinstance(item, Letter):
        return f"letter {item.grams} g"
    elif isinstance(item, Parcel):
        return f"parcel {item.kg} kg" + (" FRAGILE" if item.fragile else "")
    elif isinstance(item, Pallet):
        return f"pallet {item.kg} kg"
    raise TypeError(f"cannot label {item!r}")

for item in [Letter(80), Parcel(4, fragile=True), Pallet(600)]:
    print(f"{label(item):<22} £{postage(item):7.2f}")
```

```output
letter 80 g            £   0.85
parcel 4 kg FRAGILE    £   9.30
pallet 600 kg          £ 117.00
```

A tube needs a new branch in `postage`, a new branch in `label`, and in every other function that switches on the type: customs forms, insurance, tracking. Each is easy to forget, and a forgotten one only shows up when that function meets a tube and raises `TypeError`. Worse, the knowledge of what a parcel **is** gets scattered across every switch in the program. This pattern is a well-known warning sign, often called the **type switch** smell.

## Methods instead of switches

Move each branch into the class it belongs to. Every item class gets a `postage()` and a `label()` method, and the functions shrink to calls that work for any item. Adding the tube is now a new class, and nothing else in the program is touched. Predict before running: do `total_postage` and `manifest` need to change for the tube?

```python type
class Letter:
    def __init__(self, grams):
        self.grams = grams
    def postage(self):
        return 0.85 if self.grams <= 100 else 1.55
    def label(self):
        return f"letter {self.grams} g"

class Parcel:
    def __init__(self, kg, fragile=False):
        self.kg, self.fragile = kg, fragile
    def postage(self):
        return 3.20 + 0.90 * self.kg + (2.50 if self.fragile else 0)
    def label(self):
        return f"parcel {self.kg} kg" + (" FRAGILE" if self.fragile else "")

class Pallet:
    def __init__(self, kg):
        self.kg = kg
    def postage(self):
        return 45.00 + 0.12 * self.kg
    def label(self):
        return f"pallet {self.kg} kg"

def total_postage(items):
    return round(sum(item.postage() for item in items), 2)

def manifest(items):
    return "\n".join(f"{item.label():<22} £{item.postage():7.2f}" for item in items)

class Tube:
    def __init__(self, length_cm):
        self.length_cm = length_cm
    def postage(self):
        return 4.10 if self.length_cm <= 90 else 6.80
    def label(self):
        return f"tube {self.length_cm} cm"

batch = [Letter(80), Parcel(4, fragile=True), Pallet(600), Tube(120)]
print(manifest(batch))
print("total:", total_postage(batch))
```

```output
letter 80 g            £   0.85
parcel 4 kg FRAGILE    £   9.30
pallet 600 kg          £ 117.00
tube 120 cm            £   6.80
total: 133.95
```

`total_postage` and `manifest` were written before `Tube` existed and work with it unchanged. Each item knows its own rules, so everything about a tube lives in one place.

The trade-off is real, though. Methods make **new types** cheap: one class, no edits elsewhere. They make **new operations** more expensive: adding `customs_value()` means editing every class. A switch is the reverse. In most programs the set of operations is more stable than the set of types, which is why methods usually win. When it is the other way round (a fixed set of node types in a compiler, and a growing list of operations on them), the visitor pattern later in this series exists for exactly that.

## Joining Python's own protocols

Python's built-in operations are polymorphic in the same way. `len(x)` calls `x.__len__()`, `a + b` calls `a.__add__(b)`, `for` calls `__iter__`, `sorted` uses `__lt__`. Define those special methods, as in the Python from Zero lesson, and your objects work with every function written for the built-in types.

There is one trap worth knowing. `sum(items)` starts from the number 0 and adds each item to the running total, so its first step is `0 + item`. The integer 0 does not know how to add a `Money` object, so its `__add__` returns `NotImplemented`. Python then tries the **right-hand** version on the other object, `item.__radd__(0)`. If that does not exist either, `sum` fails. Predict before running: which of the two `sum` calls works?

```python type
class Money:
    def __init__(self, pence):
        self.pence = pence
    def __add__(self, other):
        if isinstance(other, Money):
            return Money(self.pence + other.pence)
        return NotImplemented
    def __repr__(self):
        return f"£{self.pence / 100:.2f}"

costs = [Money(250), Money(1999), Money(75)]
print("pairwise:", costs[0] + costs[1] + costs[2])
try:
    print(sum(costs))
except TypeError as error:
    print("sum failed:", error)

class Money(Money):
    def __radd__(self, other):
        if other == 0:
            return self
        return self.__add__(other)

costs = [Money(250), Money(1999), Money(75)]
print("sum with __radd__:", sum(costs))
```

```output
pairwise: £23.24
sum failed: unsupported operand type(s) for +: 'int' and 'Money'
sum with __radd__: £23.24
```

Returning `NotImplemented` (a special built-in value, not an error) from `__add__` tells Python "I don't know how to do this", so it can try the other operand's `__radd__` before giving up with a `TypeError`.

With `__radd__` handling the starting 0, `sum` works, along with every other piece of code that adds things up. Here `__radd__` hands anything other than 0 back to `__add__`, which is fine because adding money is commutative (a + b equals b + a); returning `NotImplemented` would work too. The second `class Money(Money)` is a quick way to extend the class in a notebook; in a real file you would add the method to the original class. Hooking into Python's protocols means your types work with the whole standard library, not just with the code you wrote for them.

## Polymorphism for types you don't own

Sometimes the types are not yours. You cannot add a `to_json` method to `datetime`, `Decimal` or `set`. Converting them is exactly the case where a type switch would creep back in. `functools.singledispatch` gives a function a **separate implementation per type**, chosen by the type of its first argument. Each implementation is registered on its own, so a new type is one new registration, anywhere in the program, without editing the others. Predict before running: what does the set become, and what happens with a type nobody registered?

```python type
from functools import singledispatch
from datetime import date
from decimal import Decimal
import json

@singledispatch
def to_plain(value):
    raise TypeError(f"no plain form for {type(value).__name__}")

@to_plain.register
def _(value: date):
    return value.isoformat()

@to_plain.register
def _(value: Decimal):
    return str(value)

@to_plain.register
def _(value: set):
    return sorted(to_plain(v) for v in value)

@to_plain.register(int)
@to_plain.register(str)
def _(value):
    return value

order = {"due": date(2026, 11, 3), "price": Decimal("19.99"), "tags": {"urgent", "fragile"}}
print(json.dumps({key: to_plain(value) for key, value in order.items()}))
try:
    to_plain(3.5j)
except TypeError as error:
    print("TypeError:", error)
```

```output
{"due": "2026-11-03", "price": "19.99", "tags": ["fragile", "urgent"]}
TypeError: no plain form for complex
```

`@to_plain.register` reads the type from the parameter's annotation (`value: date`); `@to_plain.register(int)` names it directly. The name `_` is a convention for "this function is only reached through the dispatcher".

The date becomes `"2026-11-03"`, the decimal `"19.99"`, the set a sorted list. A complex number has no registered implementation, so the base function runs and raises a clear `TypeError`. `json.dumps` itself refuses dates and decimals, and `to_plain` is how a program teaches it, one type at a time.

## Ask forgiveness, not permission

Duck typing has a matching habit for code that is unsure whether an object can do something. One style checks first: "look before you leap", or `if hasattr(obj, "write"): ...`. Python code usually prefers the other style: just try it, and handle the failure. This is "easier to ask forgiveness than permission", **EAFP**:

```python type
import io

def save_report(lines, destination):
    try:
        write = destination.write
    except AttributeError:
        raise TypeError(f"cannot write to {type(destination).__name__}") from None
    for line in lines:
        write(line + "\n")

buffer = io.StringIO()
save_report(["pallet 600 kg", "tube 120 cm"], buffer)
print(repr(buffer.getvalue()))
try:
    save_report(["x"], 42)
except TypeError as error:
    print("TypeError:", error)
```

```output
'pallet 600 kg\ntube 120 cm\n'
TypeError: cannot write to int
```

`raise ... from None` replaces the `AttributeError` with a clearer `TypeError` and hides the original from the traceback.

`save_report` works with an open file, a `StringIO`, a network socket wrapper or a test double: anything with a `write` method. It never asks what the destination **is**, only whether it can write. Checking `isinstance(destination, io.TextIOBase)` instead would reject perfectly good objects that simply do not inherit from that class.

::: challenge Money that adds up [easy]
Write a class `Money(amount, currency)` holding a whole number of pence (or cents) and a currency code such as `"GBP"`. Make it work with Python's own operations:

- `a + b` returns a new `Money`, raising `ValueError` if the currencies differ, and returning `NotImplemented` for anything that is not `Money`;
- `sum(list_of_money)` works, through `__radd__` handling the starting 0;
- `a == b` is True when amount and currency both match;
- `repr` gives `Money(1250, 'GBP')`.

```python starter
class Money:
    def __init__(self, amount, currency):
        self.amount, self.currency = amount, currency

print(Money(250, "GBP"))
```

```python solution
class Money:
    def __init__(self, amount, currency):
        self.amount, self.currency = amount, currency

    def __add__(self, other):
        if not isinstance(other, Money):
            return NotImplemented
        if other.currency != self.currency:
            raise ValueError(f"cannot add {self.currency} and {other.currency}")
        return Money(self.amount + other.amount, self.currency)

    def __radd__(self, other):
        if other == 0:
            return self
        return NotImplemented

    def __eq__(self, other):
        return isinstance(other, Money) and (self.amount, self.currency) == (other.amount, other.currency)

    def __repr__(self):
        return f"Money({self.amount}, {self.currency!r})"

print(sum([Money(250, "GBP"), Money(1000, "GBP")]))
```

```python test
assert "Money" in dir(), "Keep the class name Money."
assert Money(250, "GBP") + Money(1000, "GBP") == Money(1250, "GBP"), "Adding two GBP amounts gives the total in GBP."
assert repr(Money(1250, "GBP")) == "Money(1250, 'GBP')", f"repr should be Money(1250, 'GBP'); got {Money(1250, 'GBP')!r}."
assert Money(5, "EUR") != Money(5, "GBP") and Money(5, "EUR") != 5, "Equal only when amount and currency both match."
assert sum([Money(250, "GBP"), Money(1000, "GBP"), Money(1, "GBP")]) == Money(1251, "GBP"), "sum() should work: handle the starting 0 in __radd__."
assert sum([Money(7, "USD")]) == Money(7, "USD") and sum([], Money(0, "GBP")) == Money(0, "GBP"), "sum of one item, and sum with an explicit start."
try:
    Money(1, "GBP") + Money(1, "EUR")
    assert False, "Adding different currencies should raise ValueError."
except ValueError:
    pass
assert Money(1, "GBP").__add__(3) is NotImplemented, "For a non-Money, return NotImplemented rather than raising, so Python can try the other operand."
try:
    Money(1, "GBP") + 3
    assert False, "Money + 3 should fail with TypeError: return NotImplemented for non-Money."
except TypeError:
    pass
_m = Money(100, "GBP")
_ = _m + Money(1, "GBP")
assert _m == Money(100, "GBP"), "Adding must return a new Money, not change the original."
"SUCCESS: Money now joins in with +, == and sum(), so any code written for numbers' addition can total it."
```

Hint: In `__add__`, return `NotImplemented` if `other` is not a `Money`, raise on a currency mismatch, else return a new `Money`. `__radd__` returns `self` when `other == 0` (that is `sum`'s starting value). `__eq__` compares both fields.
:::

::: challenge Kill the type switch [medium]
A workshop's maintenance planner has `hours_until_service(machine)` with an `isinstance` chain over three machine classes. Rewrite it: give each machine class a method `hours_until_service()` holding its own rule, and write two functions that work with **any** machine having that method, with no `isinstance` anywhere:

- `due_first(machines)` returns the machine with the fewest hours left (the first such machine if tied), or `None` for an empty list;
- `overdue(machines)` returns the list of machines with zero or fewer hours left, in their original order.

The rules: a `Lathe(hours_run)` is serviced every 500 hours, so hours left is `500 - hours_run`; a `Compressor(hours_run, dusty)` every 250 hours, or 150 if `dusty`; a `Press(strokes)` every 100,000 strokes, at 600 strokes an hour, so hours left is `(100_000 - strokes) / 600`.

```python starter
class Lathe:
    def __init__(self, hours_run):
        self.hours_run = hours_run

class Compressor:
    def __init__(self, hours_run, dusty=False):
        self.hours_run, self.dusty = hours_run, dusty

class Press:
    def __init__(self, strokes):
        self.strokes = strokes

def hours_until_service(machine):
    if isinstance(machine, Lathe):
        return 500 - machine.hours_run
    if isinstance(machine, Compressor):
        return (150 if machine.dusty else 250) - machine.hours_run
    if isinstance(machine, Press):
        return (100_000 - machine.strokes) / 600
    raise TypeError(machine)

print([hours_until_service(m) for m in [Lathe(420), Compressor(100, dusty=True), Press(97_000)]])
```

```python solution
class Lathe:
    def __init__(self, hours_run):
        self.hours_run = hours_run
    def hours_until_service(self):
        return 500 - self.hours_run

class Compressor:
    def __init__(self, hours_run, dusty=False):
        self.hours_run, self.dusty = hours_run, dusty
    def hours_until_service(self):
        return (150 if self.dusty else 250) - self.hours_run

class Press:
    def __init__(self, strokes):
        self.strokes = strokes
    def hours_until_service(self):
        return (100_000 - self.strokes) / 600

def due_first(machines):
    return min(machines, key=lambda m: m.hours_until_service(), default=None)

def overdue(machines):
    return [m for m in machines if m.hours_until_service() <= 0]

print([m.hours_until_service() for m in [Lathe(420), Compressor(100, dusty=True), Press(97_000)]])
```

```python test
for _n in ["Lathe", "Compressor", "Press", "due_first", "overdue"]:
    assert _n in dir(), f"Define {_n}."
import ast as _ast
_calls = [_n.func.id for _n in _ast.walk(_ast.parse(_source)) if isinstance(_n, _ast.Call) and isinstance(_n.func, _ast.Name)]
assert "isinstance" not in _calls and "type" not in _calls, "No type checks: each class carries its own rule."
assert Lathe(420).hours_until_service() == 80, "A lathe at 420 hours has 80 left."
assert Compressor(100).hours_until_service() == 150 and Compressor(100, dusty=True).hours_until_service() == 50, "Compressors: 250 hours, or 150 when dusty."
assert Press(97_000).hours_until_service() == 5.0, "A press at 97,000 strokes has 3,000 strokes, 5 hours, left."
_l, _c, _p = Lathe(420), Compressor(100, dusty=True), Press(97_000)
assert due_first([_l, _c, _p]) is _p, "The press, at 5 hours, is due first."
assert due_first([]) is None, "No machines: None."
_a, _b = Lathe(400), Lathe(400)
assert due_first([_a, _b]) is _a, "On a tie, return the first."
_late = [Lathe(520), Compressor(260), Press(100_000), Lathe(10)]
assert overdue(_late) == _late[:3], "Machines at zero or fewer hours are overdue, in their original order."
class _Robot:
    def __init__(self, left):
        self.left = left
    def hours_until_service(self):
        return self.left
_r = _Robot(-3)
assert due_first([_l, _r]) is _r and overdue([_l, _r]) == [_r], "A new kind of machine with hours_until_service() must work without any change to your functions."
"SUCCESS: Each machine knows its own service rule, so the planner works with any machine, including ones invented later."
```

Hint: Move each branch of the switch into a method of its class, with `machine.` replaced by `self.`. `due_first` is `min(machines, key=..., default=None)` (min keeps the first of equal items). `overdue` is a list comprehension calling the method.
:::

::: challenge A dispatcher for measurements [hard]
Readings arrive from many sensors as different Python types, and the dashboard needs every value as a short display string. Write `display` with `functools.singledispatch`:

- an `int` shows as itself with thousands separators: `12345` becomes `"12,345"`;
- a `float` shows to 2 decimal places: `3.14159` becomes `"3.14"`;
- a `bool` shows as `"yes"` or `"no"` (careful: `bool` is a subclass of `int`, so it needs its own registration, which singledispatch prefers because it is more specific);
- a `str` shows as itself;
- a `list` or `tuple` shows each element with `display`, joined by `", "` inside square brackets: `[1, 2.5, True]` becomes `"[1, 2.50, yes]"`;
- a `dict` shows as `"key: value"` pairs (both displayed) joined by `", "` inside braces;
- `None` shows as `"-"`;
- any other type raises `TypeError` naming the type.

The test will then register a brand-new type on your function from outside, without editing your code, and check that nested lists and dicts containing it display correctly.

```python starter
from functools import singledispatch

def display(value):
    return str(value)

print(display([1, 2.5, True, None]))
```

```python solution
from functools import singledispatch

@singledispatch
def display(value):
    raise TypeError(f"cannot display {type(value).__name__}")

@display.register
def _(value: int):
    return f"{value:,}"

@display.register
def _(value: bool):
    return "yes" if value else "no"

@display.register
def _(value: float):
    return f"{value:.2f}"

@display.register
def _(value: str):
    return value

@display.register(list)
@display.register(tuple)
def _(value):
    return "[" + ", ".join(display(v) for v in value) + "]"

@display.register
def _(value: dict):
    return "{" + ", ".join(f"{display(k)}: {display(v)}" for k, v in value.items()) + "}"

@display.register(type(None))
def _(value):
    return "-"

print(display([1, 2.5, True, None]))
```

```python test
assert "display" in dir() and hasattr(display, "register"), "display should be a singledispatch function (it needs .register)."
assert display(12345) == "12,345" and display(-7) == "-7", "ints use thousands separators."
assert display(3.14159) == "3.14" and display(2.0) == "2.00", "floats show 2 decimal places."
assert display(True) == "yes" and display(False) == "no", "bools show yes/no, not 1/0: register bool separately."
assert display("kPa") == "kPa" and display(None) == "-", "strings show as themselves; None as -."
assert display([1, 2.5, True, None]) == "[1, 2.50, yes, -]", f"Got {display([1, 2.5, True, None])!r}."
assert display((1000, "x")) == "[1,000, x]", "Tuples display like lists."
assert display({"temp": 21.456, "ok": True}) == "{temp: 21.46, ok: yes}", f"Got {display({'temp': 21.456, 'ok': True})!r}."
assert display([]) == "[]" and display({}) == "{}", "Empty collections."
try:
    display(3 + 4j)
    assert False, "An unregistered type should raise TypeError."
except TypeError as _e:
    assert "complex" in str(_e), f"Name the type in the error; got {_e}."
class _Celsius:
    def __init__(self, c):
        self.c = c
@display.register
def _(value: _Celsius):
    return f"{value.c:.1f} °C"
assert display({"boiler": [_Celsius(81.25), 3]}) == "{boiler: [81.2 °C, 3]}", "A type registered later must work inside nested lists and dicts: call display recursively, not str()."
"SUCCESS: Each type's display rule is registered on its own, collections recurse through display, and new types plug in from anywhere."
```

Hint: Decorate a base `display` with `@singledispatch` that raises `TypeError`. Register `int`, `bool`, `float`, `str` and `dict` with annotated parameters; register `list` and `tuple` together by stacking `@display.register(list)` and `@display.register(tuple)`; register `type(None)` for None. Inside the collection handlers, call `display` on each element so newly registered types work there too.
:::

## What you learned

- Polymorphism lets one piece of code work with many types, each supplying its own version of an operation. Duck typing asks objects to act rather than checking what they are.
- A type switch (`isinstance` chains) scatters each type's rules over every function that switches, and a new type needs edits everywhere. Methods put each type's rules in its class, so a new type is just a new class. New operations are then the expensive change, which suits most programs.
- Special methods join Python's own protocols. `sum` starts at 0, so it needs `__radd__`; returning `NotImplemented` lets Python try the other operand.
- `functools.singledispatch` gives a function one implementation per type, registered separately: polymorphism for types you cannot add methods to.
- EAFP: try the operation and handle the failure, instead of checking types first, so any object able to do the job is accepted.

The next lesson collects the main object-design principles under one name, SOLID, with a before and after for each.
