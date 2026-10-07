# SOLID

**SOLID** is an acronym for five object-design principles, collected by Robert C. Martin around 2000 (the acronym itself was coined by Michael Feathers). They are not laws: each is a way of predicting where change will hurt and arranging code so it hurts less. You have met most of the ideas already. This lesson names them, gives each a short before-and-after, and shows how they connect:

- **S**ingle responsibility: a class should have one reason to change;
- **O**pen/closed: add new behaviour by adding code, not by editing working code;
- **L**iskov substitution: a subclass must keep every promise its base class makes;
- **I**nterface segregation: don't force a class to provide methods it has no use for;
- **D**ependency inversion: important logic should depend on abstractions, not on concrete details.

## S: single responsibility, briefly

The single responsibility lesson split a `JobCard` that priced repairs, wrote invoices and saved itself into three classes, one per group of people who request changes. The rest of SOLID builds on that habit, so it is enough here to restate the test: if you cannot describe a class without "and", or if unrelated people would each want changes to it, it has more than one responsibility.

## O: open for extension, closed for modification

Code is **closed for modification** when adding a feature does not require editing code that already works. It is **open for extension** when the new feature can still be added, by writing new code. Here is a checkout that violates this: every new promotion means another branch in the same function, retested from scratch each time. Predict before reading on: what has to change to add a "buy 3 rolls of tape, pay for 2" offer?

```python type
def checkout_total(basket, promotions):
    total = sum(price * qty for _, price, qty in basket)
    for promo in promotions:
        if promo == "10% over £100" and total > 100:
            total -= total * 0.10
        elif promo == "free gloves with a drill":
            names = [name for name, _, _ in basket]
            if "drill" in names and "gloves" in names:
                total -= next(price for name, price, _ in basket if name == "gloves")
    return round(total, 2)

basket = [("drill", 89.00, 1), ("gloves", 6.50, 1), ("tape", 2.40, 3)]
print(checkout_total(basket, ["free gloves with a drill", "10% over £100"]))
```

```output
96.2
```

The new offer is another `elif` inside `checkout_total`. The function grows with every promotion the marketing team invents, and every edit risks the existing ones.

The open/closed version makes each promotion an **object** with one method, `saving(basket, running_total)`, and the checkout applies whichever objects it is given. A new promotion is a new class. `checkout_total` is never edited again: it is closed for modification and open for extension. Predict before running: is the total the same as before, and what does adding the tape offer take?

```python type
class PercentOver:
    def __init__(self, percent, threshold):
        self.percent, self.threshold = percent, threshold
    def saving(self, basket, running_total):
        return running_total * self.percent / 100 if running_total > self.threshold else 0

class FreeWith:
    def __init__(self, free_item, with_item):
        self.free_item, self.with_item = free_item, with_item
    def saving(self, basket, running_total):
        prices = {name: price for name, price, _ in basket}
        return prices[self.free_item] if self.free_item in prices and self.with_item in prices else 0

def checkout_total(basket, promotions):
    total = sum(price * qty for _, price, qty in basket)
    for promo in promotions:
        total -= promo.saving(basket, total)
    return round(total, 2)

print(checkout_total(basket, [FreeWith("gloves", "drill"), PercentOver(10, 100)]))

class ThreeForTwo:
    def __init__(self, item):
        self.item = item
    def saving(self, basket, running_total):
        return sum(price * (qty // 3) for name, price, qty in basket if name == self.item)

print(checkout_total(basket, [FreeWith("gloves", "drill"), ThreeForTwo("tape"), PercentOver(10, 100)]))
```

```output
96.2
93.8
```

Same total, 96.20: once the gloves are free, the basket is below £100, so the 10% offer does not apply (promotions are applied in order, each to the running total). With the tape offer added, 3 rolls for the price of 2 saves another 2.40, giving 93.80, from a new class used by unchanged code. This is polymorphism (the previous lesson) put to a design purpose. "Closed" never means "frozen forever". It means that the **usual** kind of change, here a new promotion, does not touch existing code.

## L: Liskov substitution

Barbara Liskov's principle says: wherever code uses a base class, any subclass must work in its place **without the code noticing**. A subclass may do more, but it must keep every promise the base class makes. The classic violation is a `Square` subclass of `Rectangle`. Geometrically, a square is a rectangle. But a `Rectangle` object promises that setting its width leaves its height alone, and a square cannot keep that promise. Predict before running: what area does `stretch` produce for each shape?

```python type
class Rectangle:
    def __init__(self, width, height):
        self.width, self.height = width, height
    def set_width(self, w):
        self.width = w
    def set_height(self, h):
        self.height = h
    def area(self):
        return self.width * self.height

class Square(Rectangle):
    def __init__(self, side):
        super().__init__(side, side)
    def set_width(self, w):
        self.width = self.height = w
    def set_height(self, h):
        self.width = self.height = h

def stretch(shape):
    shape.set_width(10)
    shape.set_height(2)
    return shape.area()

print("rectangle:", stretch(Rectangle(4, 4)))
print("square:   ", stretch(Square(4)))
```

```output
rectangle: 20
square:    4
```

`stretch` was written against `Rectangle`'s promise: after `set_width(10)` and `set_height(2)` the area is 20. The square answers 4. `stretch` is not buggy. The subclass broke the contract, so any code that accepts a `Rectangle` can now be broken by a `Square`.

The usual rules for keeping substitutability:

- a subclass must accept **at least** the inputs the base accepts (it may not demand more);
- it must deliver **at least** what the base promises about results and state afterwards;
- it must not raise errors the base never raises in that situation.

The fix is usually not a cleverer subclass but a different design. Here, make shapes immutable: no setters, just `area()`, and `Square` and `Rectangle` as separate classes. Then neither has a promise the other could break, and `Square` could even subclass `Rectangle` safely, since there is no setter whose promise it would violate. An "is a" relationship in the real world does not guarantee an "is substitutable for" relationship in code. Only the second justifies inheritance.

## I: interface segregation

An interface that bundles many operations forces every implementer to provide all of them. An office-machine base class with `print_doc`, `scan` and `fax` forces a simple printer to "implement" scanning and faxing, usually by raising `NotImplementedError`. Now any code holding an `OfficeMachine` cannot trust that `scan` works: the interface makes a promise its implementers break, a Liskov problem again. **Interface segregation** says: split it into small interfaces, so each class provides exactly what it can do, and each function asks for exactly what it needs.

```python type
from typing import Protocol, runtime_checkable

@runtime_checkable
class Printer(Protocol):
    def print_doc(self, doc): ...

@runtime_checkable
class Scanner(Protocol):
    def scan(self): ...

class DeskPrinter:
    def print_doc(self, doc):
        return f"printed {doc!r}"

class OfficeMultifunction:
    def print_doc(self, doc):
        return f"printed {doc!r} in colour"
    def scan(self):
        return "scanned page"

def print_all(printer, docs):
    return [printer.print_doc(d) for d in docs]

for device in [DeskPrinter(), OfficeMultifunction()]:
    print(f"{type(device).__name__:<20} printer: {isinstance(device, Printer)!s:<5}  scanner: {isinstance(device, Scanner)}")
print(print_all(DeskPrinter(), ["invoice", "manifest"]))
```

```output
DeskPrinter          printer: True   scanner: False
OfficeMultifunction  printer: True   scanner: True
["printed 'invoice'", "printed 'manifest'"]
```

`print_all` asks only for a `Printer`, so the desk printer qualifies without pretending to scan. A class that can do more simply satisfies more of the small interfaces. With protocols, no class even has to declare them: having the methods is enough. Remember that a runtime `isinstance` check against a protocol looks only at method names, not at their arguments or meaning.

## D: dependency inversion

The last principle is about the direction of dependencies. **High-level** code expresses what the program is for: "send an alert when a machine overheats". **Low-level** code handles details: the email library, the SMS gateway, the database. If the high-level code creates and calls the low-level classes directly, it depends on them, and every change of detail (switch email provider, test without sending real messages) means editing the important code. **Dependency inversion** says both should depend on an **abstraction** that the high-level side defines, such as "something with `send(to, text)`". The concrete detail is then plugged in from outside.

```python type
from typing import Protocol

class Sender(Protocol):
    def send(self, to, text): ...

class OverheatMonitor:
    def __init__(self, sender: Sender, limit_c=90):
        self.sender, self.limit_c = sender, limit_c

    def check(self, machine, temperature_c):
        if temperature_c > self.limit_c:
            self.sender.send("maintenance", f"{machine} at {temperature_c} °C")
            return True
        return False

class RecordingSender:
    def __init__(self):
        self.sent = []
    def send(self, to, text):
        self.sent.append((to, text))

outbox = RecordingSender()
monitor = OverheatMonitor(outbox)
monitor.check("press 2", 85)
monitor.check("lathe 1", 97)
print(outbox.sent)
```

```output
[('maintenance', 'lathe 1 at 97 °C')]
```

`OverheatMonitor` never imports an email library. It depends only on the `Sender` protocol, which is defined beside it, on the high-level side; the concrete senders are written to fit it. That is the inversion: the detail depends on the abstraction the important code owns, not the other way round. The monitor receives its sender from outside. In production that is an email or SMS sender. In a test it is `RecordingSender`, which just remembers the messages so the test can check them. Passing collaborators in like this is called **dependency injection**, and the next lesson is about it.

The principles connect. Single responsibility decides what a class is for. Open/closed and dependency inversion use abstractions so that new cases plug in from outside. Liskov and interface segregation make sure those abstractions make promises that every implementation can keep.

::: challenge Printers and scanners [easy]
A print shop's code uses one big interface for every device, so its basic printers raise `NotImplementedError` from `scan()`. Apply interface segregation. Write two runtime-checkable protocols, `Printer` (method `print_doc(doc)`) and `Scanner` (method `scan()`). Write `LaserPrinter`, whose `print_doc(doc)` returns `f"laser: {doc}"` and which has **no** `scan` method, and `Copier`, which has `print_doc(doc)` returning `f"copier: {doc}"` and `scan()` returning `"page"`. Then write `print_all(device, docs)`, which raises `TypeError` unless `device` is a `Printer` and otherwise returns the list of printed results, and `copy_page(device)`, which raises `TypeError` unless `device` is both a `Printer` and a `Scanner` and otherwise prints what it scans, returning `device.print_doc(device.scan())`.

```python starter
from typing import Protocol, runtime_checkable

class OfficeDevice:
    def print_doc(self, doc):
        raise NotImplementedError
    def scan(self):
        raise NotImplementedError

class LaserPrinter(OfficeDevice):
    def print_doc(self, doc):
        return f"laser: {doc}"

print(LaserPrinter().print_doc("report"))
```

```python solution
from typing import Protocol, runtime_checkable

@runtime_checkable
class Printer(Protocol):
    def print_doc(self, doc): ...

@runtime_checkable
class Scanner(Protocol):
    def scan(self): ...

class LaserPrinter:
    def print_doc(self, doc):
        return f"laser: {doc}"

class Copier:
    def print_doc(self, doc):
        return f"copier: {doc}"
    def scan(self):
        return "page"

def print_all(device, docs):
    if not isinstance(device, Printer):
        raise TypeError(f"{type(device).__name__} cannot print")
    return [device.print_doc(d) for d in docs]

def copy_page(device):
    if not (isinstance(device, Printer) and isinstance(device, Scanner)):
        raise TypeError(f"{type(device).__name__} cannot copy")
    return device.print_doc(device.scan())

print(print_all(LaserPrinter(), ["report"]), copy_page(Copier()))
```

```python test
for _n in ["Printer", "Scanner", "LaserPrinter", "Copier", "print_all", "copy_page"]:
    assert _n in dir(), f"Define {_n}."
assert not hasattr(LaserPrinter(), "scan"), "LaserPrinter should not have a scan method at all, not even one that raises."
assert isinstance(LaserPrinter(), Printer) and not isinstance(LaserPrinter(), Scanner), "A laser printer is a Printer and not a Scanner."
assert isinstance(Copier(), Printer) and isinstance(Copier(), Scanner), "A copier is both."
assert print_all(LaserPrinter(), ["a", "b"]) == ["laser: a", "laser: b"] and print_all(Copier(), []) == [], "print_all prints each document."
assert copy_page(Copier()) == "copier: page", "copy_page prints what it scans."
for _bad, _f in [(LaserPrinter(), copy_page), (object(), copy_page)]:
    try:
        _f(_bad)
        assert False, f"copy_page({type(_bad).__name__}) should raise TypeError."
    except TypeError:
        pass
try:
    print_all("not a device", ["x"])
    assert False, "print_all should raise TypeError for something that cannot print."
except TypeError:
    pass
class _Plotter:
    def print_doc(self, doc):
        return f"plotted {doc}"
assert print_all(_Plotter(), ["map"]) == ["plotted map"], "Any object with print_doc counts as a Printer, no inheritance needed."
"SUCCESS: Each device provides exactly what it can do, and each function asks for exactly what it needs."
```

Hint: Each protocol is a class subclassing `Protocol`, decorated with `@runtime_checkable`, with one method whose body is `...`. The device classes need no base class at all. The functions check with `isinstance(device, Printer)` (and `Scanner`) before doing anything.
:::

::: challenge Promotions you can add without editing [medium]
Write `checkout_total(basket, promotions)` in the open/closed style. `basket` is a list of `(name, unit_price, quantity)` tuples, and each promotion is any object with a method `saving(basket, running_total)`. Start from the basket's full price, subtract each promotion's saving in order (each sees the running total after the previous ones), never letting the total go below 0, and return it rounded to 2 places. Then write three promotion classes:

- `PercentOff(percent, minimum)`: `percent`% of the running total, if the running total is at least `minimum`;
- `BuyNGetOneFree(item, n)`: for every `n + 1` units of `item`, one unit is free;
- `FixedOff(amount, item)`: `amount` off if `item` is in the basket at all, else nothing.

The test will add a promotion class of its own without touching your function.

```python starter
def checkout_total(basket, promotions):
    return 0

print(checkout_total([("tape", 2.40, 3)], []))
```

```python solution
def checkout_total(basket, promotions):
    total = sum(price * qty for _, price, qty in basket)
    for promo in promotions:
        total = max(0, total - promo.saving(basket, total))
    return round(total, 2)

class PercentOff:
    def __init__(self, percent, minimum):
        self.percent, self.minimum = percent, minimum
    def saving(self, basket, running_total):
        return running_total * self.percent / 100 if running_total >= self.minimum else 0

class BuyNGetOneFree:
    def __init__(self, item, n):
        self.item, self.n = item, n
    def saving(self, basket, running_total):
        return sum(price * (qty // (self.n + 1)) for name, price, qty in basket if name == self.item)

class FixedOff:
    def __init__(self, amount, item):
        self.amount, self.item = amount, item
    def saving(self, basket, running_total):
        return self.amount if any(name == self.item for name, _, _ in basket) else 0

print(checkout_total([("tape", 2.40, 3)], [BuyNGetOneFree("tape", 2)]))
```

```python test
for _n in ["checkout_total", "PercentOff", "BuyNGetOneFree", "FixedOff"]:
    assert _n in dir(), f"Define {_n}."
_basket = [("drill", 89.00, 1), ("gloves", 6.50, 2), ("tape", 2.40, 7)]
assert checkout_total(_basket, []) == 118.8, f"No promotions: the full price, 118.80; got {checkout_total(_basket, [])}."
assert checkout_total(_basket, [BuyNGetOneFree("tape", 2)]) == 114.0, "7 rolls on 'buy 2 get 1 free': 2 free rolls, 4.80 off."
assert checkout_total(_basket, [FixedOff(5, "drill")]) == 113.8 and checkout_total(_basket, [FixedOff(5, "saw")]) == 118.8, "FixedOff applies only if the item is in the basket."
assert checkout_total(_basket, [PercentOff(10, 100)]) == 106.92 and checkout_total(_basket, [PercentOff(10, 200)]) == 118.8, "PercentOff needs the running total to reach the minimum."
assert checkout_total(_basket, [FixedOff(20, "drill"), PercentOff(10, 100)]) == 98.8, "Order matters: after 20 off, 98.80 is below the 100 minimum."
assert checkout_total(_basket, [PercentOff(10, 100), FixedOff(20, "drill")]) == 86.92, "The other order: 10% of 118.80, then 20 off."
assert checkout_total([("pin", 0.10, 1)], [FixedOff(5, "pin")]) == 0, "The total never goes below 0."
assert checkout_total([], [PercentOff(50, 0)]) == 0, "An empty basket costs nothing."
class _StaffDiscount:
    def saving(self, basket, running_total):
        return running_total / 4
assert checkout_total(_basket, [_StaffDiscount()]) == 89.1, "A promotion class written later must work with your unchanged checkout_total."
import ast as _ast
_fn = next(_n for _n in _ast.walk(_ast.parse(_source)) if isinstance(_n, _ast.FunctionDef) and _n.name == "checkout_total")
_named = {_n.id for _n in _ast.walk(_fn) if isinstance(_n, _ast.Name)}
assert not (_named & {"PercentOff", "BuyNGetOneFree", "FixedOff", "isinstance"}), "checkout_total should not mention specific promotions or check types: it just asks each one for its saving."
"SUCCESS: The checkout asks each promotion for its saving, so new promotions are new classes and the checkout never changes."
```

Hint: In `checkout_total`, start from `sum(price * qty ...)` and, for each promotion, set `total = max(0, total - promo.saving(basket, total))`. Each class stores its settings in `__init__` and computes its saving from the basket and running total.
:::

::: challenge A substitutability checker [hard]
Liskov substitution is about promises, and promises can be tested. Write `stack_violations(make_stack)`, where `make_stack` is a function that returns a new, empty stack object. Check these promises of a stack, and return a list of short strings naming each one that is broken (an empty list if all hold), using exactly these names:

- `"lifo"`: after pushing 1, 2, 3, three pops return 3, 2, 1;
- `"len"`: `len()` is 0 when new, 2 after two pushes, 1 after a pop;
- `"peek"`: after pushing 5 then 7, `peek()` returns 7 and leaves the length at 2;
- `"empty pop"`: popping a new, empty stack raises `IndexError` (any other exception, or none, breaks the promise);
- `"accepts None"`: pushing `None` and popping returns `None` (a stack must hold any value).

Each check must use a **fresh** stack from `make_stack()`. A check that crashes with any exception other than the one it expects counts as broken: catch `Exception` around each check, so one broken promise never stops the others being checked. The test will run your checker on several stack classes, some of them subtly wrong.

```python starter
class ListStack:
    def __init__(self):
        self._items = []
    def push(self, x):
        self._items.append(x)
    def pop(self):
        return self._items.pop()
    def peek(self):
        return self._items[-1]
    def __len__(self):
        return len(self._items)

def stack_violations(make_stack):
    return []

print(stack_violations(ListStack))
```

```python solution
class ListStack:
    def __init__(self):
        self._items = []
    def push(self, x):
        self._items.append(x)
    def pop(self):
        return self._items.pop()
    def peek(self):
        return self._items[-1]
    def __len__(self):
        return len(self._items)

def stack_violations(make_stack):
    def lifo():
        s = make_stack()
        for x in [1, 2, 3]:
            s.push(x)
        return [s.pop(), s.pop(), s.pop()] == [3, 2, 1]

    def length():
        s = make_stack()
        if len(s) != 0:
            return False
        s.push("a"); s.push("b")
        if len(s) != 2:
            return False
        s.pop()
        return len(s) == 1

    def peek():
        s = make_stack()
        s.push(5); s.push(7)
        return s.peek() == 7 and len(s) == 2

    def empty_pop():
        s = make_stack()
        try:
            s.pop()
        except IndexError:
            return True
        return False

    def accepts_none():
        s = make_stack()
        s.push(None)
        return s.pop() is None

    broken = []
    for name, check in [("lifo", lifo), ("len", length), ("peek", peek), ("empty pop", empty_pop), ("accepts None", accepts_none)]:
        try:
            ok = check()
        except Exception:
            ok = False
        if not ok:
            broken.append(name)
    return broken

print(stack_violations(ListStack))
```

```python test
assert "stack_violations" in dir(), "Keep the function's name as stack_violations."
class _Good:
    def __init__(self): self._i = []
    def push(self, x): self._i.append(x)
    def pop(self): return self._i.pop()
    def peek(self): return self._i[-1]
    def __len__(self): return len(self._i)
assert stack_violations(_Good) == [], f"A correct stack breaks no promises; got {stack_violations(_Good)}."
class _Queueish(_Good):
    def pop(self): return self._i.pop(0)
assert stack_violations(_Queueish) == ["lifo"], f"Popping from the front breaks only LIFO; got {stack_violations(_Queueish)}."
class _PeekPops(_Good):
    def peek(self): return self._i.pop()
assert stack_violations(_PeekPops) == ["peek"], f"A peek that removes the item breaks peek; got {stack_violations(_PeekPops)}."
class _SilentEmpty(_Good):
    def pop(self): return self._i.pop() if self._i else None
assert stack_violations(_SilentEmpty) == ["empty pop"], f"Returning None from an empty pop breaks its promise; got {stack_violations(_SilentEmpty)}."
class _WrongError(_Good):
    def pop(self):
        if not self._i:
            raise ValueError("empty")
        return self._i.pop()
assert stack_violations(_WrongError) == ["empty pop"], "Raising ValueError instead of IndexError also breaks it."
class _NoNone(_Good):
    def push(self, x):
        if x is None:
            raise TypeError("no None")
        self._i.append(x)
assert stack_violations(_NoNone) == ["accepts None"], f"Refusing None breaks accepts None, and the crash must not stop the other checks; got {stack_violations(_NoNone)}."
class _NoLen(_Good):
    __len__ = None
_r = stack_violations(_NoLen)
assert "len" in _r and "lifo" not in _r and "accepts None" not in _r, f"A stack without len breaks len (and peek, which checks the length); got {_r}."
_made = []
def _counting_factory():
    _made.append(1)
    return _Good()
stack_violations(_counting_factory)
assert len(_made) >= 5, "Use a fresh stack from make_stack() for each check."
"SUCCESS: Each promise is a small test, so a subclass that cannot be substituted is caught by name before any code relies on it."
```

Hint: Write one small function per promise that builds `s = make_stack()`, exercises it, and returns True or False. For `"empty pop"`, return True only from `except IndexError`. Then loop over `(name, check)` pairs, call each inside `try`/`except Exception` (treating a crash as broken), and collect the names that failed.
:::

## What you learned

- **S**: one reason to change per class.
- **O**: make the common change, a new case, an addition rather than an edit, by giving each case its own object behind a shared method.
- **L**: a subclass must accept what the base accepts, deliver what it promises, and raise nothing new. "Is a" in the real world, like a square and a rectangle, does not guarantee substitutability in code. Promises can be checked by tests.
- **I**: split broad interfaces into small ones, so classes implement only what they can really do and functions ask only for what they need.
- **D**: important logic depends on abstractions it defines, and concrete details are passed in from outside.

The next lesson develops that last idea into a practical technique: dependency injection, and how it makes code testable without real databases, clocks or networks.
