# Adapter

Code is written against an interface: the temperature monitor calls `sensor.read_celsius()`, the report writer iterates over records. Then a new part arrives that does the right job through the wrong interface. A new supplier's sensor offers `get_temp()`, returning tenths of a degree Fahrenheit as a string. A web service returns data one page at a time. You cannot change the supplier's code, and you should not scatter special cases through your own. An **adapter** is a small object (or function) that wraps the misfit and presents the interface your code expects, translating each call.

The name comes from the travel plug adapter: neither the socket nor the appliance changes, and a small piece in between makes them fit. Adapters are among the most common patterns in practice, because every program sooner or later meets code it did not write.

This lesson covers:

- the problem: an incompatible part, and the cost of special-casing it everywhere;
- object adapters: a wrapper class that translates calls;
- function adapters, and passing everything else through with `__getattr__`;
- adapting a whole style of access: turning a paged API into a lazy iterator.

## The problem: a part with the wrong interface

A cold-store monitor checks every sensor against an alarm limit. It was written for the store's own sensors, which offer `read_celsius()` and `sensor_id`. The new supplier's sensors offer `get_temp()`, which returns a string of tenths of a degree Fahrenheit, and `serial`. Predict before running: what happens when the monitor meets the new sensor?

```python type
class StoreSensor:
    def __init__(self, sensor_id, celsius):
        self.sensor_id, self._c = sensor_id, celsius
    def read_celsius(self):
        return self._c

class AcmeProbe:
    """The supplier's class: we cannot change it."""
    def __init__(self, serial, tenths_f):
        self.serial, self._t = serial, tenths_f
    def get_temp(self):
        return str(self._t)

def alarms(sensors, limit_c):
    return [s.sensor_id for s in sensors if s.read_celsius() > limit_c]

print(alarms([StoreSensor("bay-1", -18.5), StoreSensor("bay-2", -12.0)], -15))
try:
    print(alarms([StoreSensor("bay-1", -18.5), AcmeProbe("AC-7", 104)], -15))
except AttributeError as error:
    print("AttributeError:", error)
```

```output
['bay-2']
AttributeError: 'AcmeProbe' object has no attribute 'read_celsius'
```

The monitor fails on the first call it makes to the new sensor. The tempting fix is to teach `alarms` about Acme probes with an `isinstance` check and a conversion. But then every other function that reads sensors (logging, charts, reports) needs the same special case, and the next supplier adds another. That is the type-switch smell from the polymorphism lesson, spreading.

## An object adapter

Instead, write one class that **wraps** an `AcmeProbe` and offers exactly the `StoreSensor` interface. Each call is translated: the serial becomes `sensor_id`, and the string of tenths of °F becomes a float in °C. All the knowledge about Acme's quirks lives in one place, and every existing function works unchanged. Predict before running: what temperature does the adapted probe report?

```python type
class AcmeAdapter:
    def __init__(self, probe):
        self._probe = probe

    @property
    def sensor_id(self):
        return self._probe.serial

    def read_celsius(self):
        fahrenheit = int(self._probe.get_temp()) / 10
        return round((fahrenheit - 32) * 5 / 9, 2)

probe = AcmeProbe("AC-7", 104)
adapted = AcmeAdapter(probe)
print(adapted.sensor_id, adapted.read_celsius())
print(alarms([StoreSensor("bay-1", -18.5), adapted, StoreSensor("bay-2", -12.0)], -15))
```

```output
AC-7 -12.0
['AC-7', 'bay-2']
```

`sensor_id` is a property, so the adapter reads the probe's current serial whenever asked, rather than copying it once.

104 tenths is 10.4 °F, which is −12 °C, above the −15 °C limit, so the probe raises an alarm with the others. The monitor has no idea it is talking to an Acme device. This is an **object adapter**: it holds the adaptee and delegates to it. (A **class adapter** would instead subclass `AcmeProbe` and add the methods. That works, but it couples the adapter to the supplier's internals, and the composition lesson explained why holding is usually better than inheriting.)

## Function adapters, and passing the rest through

Not every mismatch needs a class. When code expects a **function** with one signature and you have one with another, a small wrapping function is the adapter. `functools.partial` fixes some arguments in advance, which adapts many call signatures in one line. And `sorted(key=...)` with a `lambda` adapts objects to "something comparable".

Sometimes an adapter should translate a few methods and pass **everything else** straight through to the wrapped object. Writing a forwarding method for each is tedious. Python calls `__getattr__(self, name)` only when normal attribute lookup fails, so an adapter can define the methods it translates and send all other names to the adaptee. Predict before running: which calls go through the adapter's own code?

```python type
from functools import partial

def log_reading(writer, sensor_id, celsius):
    writer(f"{sensor_id}: {celsius:.1f} °C")

lines = []
log_reading(lines.append, "bay-1", -18.5)

def legacy_logger(level, message, *, channel):
    lines.append(f"[{channel}/{level}] {message}")

log_reading(partial(legacy_logger, "INFO", channel="coldstore"), "AC-7", -12.0)
print(lines)

class PassThroughAcme(AcmeAdapter):
    def __getattr__(self, name):
        return getattr(self._probe, name)

class AcmeProbeV2(AcmeProbe):
    def battery_pct(self):
        return 81

p2 = PassThroughAcme(AcmeProbeV2("AC-9", 50))
print(p2.read_celsius(), p2.battery_pct(), p2.serial)
```

```output
['bay-1: -18.5 °C', '[coldstore/INFO] AC-7: -12.0 °C']
-15.0 81 AC-9
```

`partial(legacy_logger, "INFO", channel="coldstore")` makes a new function that calls `legacy_logger("INFO", message, channel="coldstore")` with whatever single argument it is given: exactly the one-argument "writer" that `log_reading` expects.

`read_celsius` is the adapter's own translated method. `battery_pct` and `serial` are not defined on the adapter, so normal lookup fails and `__getattr__` forwards them to the probe. A pass-through adapter stays tiny however large the adaptee's interface is. The cost is that the adapter's real interface is less obvious to a reader. Use it when "the same, plus translations" really is the intent.

## Adapting a style of access

Adapters can bridge whole ways of working, not just method names. A supplier's web service returns parts one **page** at a time: `fetch_page(n)` returns a list of items and a flag saying whether more pages exist. Your code wants to just loop: `for part in catalogue:`. A generator is a natural adapter here. It fetches a page, yields its items one by one, and fetches the next page only when the loop asks for more. Predict before running: how many pages are fetched to find the first part over £50?

```python type
PRICES = [4.5, 12.0, 8.25, 3.1, 61.0, 7.0, 99.0, 2.5, 15.0, 33.0, 71.0]

calls = []
def fetch_page(n, size=3):
    calls.append(n)
    page = PRICES[n * size:(n + 1) * size]
    return [{"sku": f"P{n * size + i}", "price": p} for i, p in enumerate(page)], (n + 1) * size < len(PRICES)

def all_parts(fetch):
    n = 0
    while True:
        items, more = fetch(n)
        yield from items
        if not more:
            return
        n += 1

first_expensive = next(part for part in all_parts(fetch_page) if part["price"] > 50)
print(first_expensive, "after fetching pages", calls)
calls.clear()
print(len(list(all_parts(fetch_page))), "parts in", len(calls), "pages")
```

```output
{'sku': 'P4', 'price': 61.0} after fetching pages [0, 1]
11 parts in 4 pages
```

`yield from items` yields each item of the page in turn, as a loop with `yield` would.

The first part over £50 is on page 1, so only pages 0 and 1 are fetched: the generator stops as soon as the search stops asking. Reading everything takes all 4 pages. The rest of the program sees an ordinary iterable and works with `for`, `next`, `sum`, `sorted` and everything else written for iterables, while the paging lives in one function.

::: challenge A scale adapter [easy]
Your packing station calls `scale.weight_kg()` and reads `scale.name`. A new bench scale has a different interface: its `display()` method returns text such as `"1234 g"` (always whole grams), and its label is in an attribute `model`. Write `BenchScaleAdapter(scale)` that wraps one and provides `weight_kg()` (a float in kilograms, reading the scale each time it is called) and `name` (the scale's model). The existing function `total_kg(scales)` must work with adapted scales without any change.

```python starter
class BenchScale:
    def __init__(self, model, grams):
        self.model, self._g = model, grams
    def display(self):
        return f"{self._g} g"

def total_kg(scales):
    return round(sum(s.weight_kg() for s in scales), 3)

class BenchScaleAdapter:
    pass

print(BenchScale("BS-200", 1234).display())
```

```python solution
class BenchScale:
    def __init__(self, model, grams):
        self.model, self._g = model, grams
    def display(self):
        return f"{self._g} g"

def total_kg(scales):
    return round(sum(s.weight_kg() for s in scales), 3)

class BenchScaleAdapter:
    def __init__(self, scale):
        self._scale = scale

    @property
    def name(self):
        return self._scale.model

    def weight_kg(self):
        grams = int(self._scale.display().split()[0])
        return grams / 1000

print(total_kg([BenchScaleAdapter(BenchScale("BS-200", 1234)), BenchScaleAdapter(BenchScale("BS-200", 766))]))
```

```python test
for _n in ["BenchScaleAdapter", "BenchScale", "total_kg"]:
    assert _n in dir(), f"Keep {_n} defined."
_a = BenchScaleAdapter(BenchScale("BS-200", 1234))
assert _a.weight_kg() == 1.234 and _a.name == "BS-200", f"Got {_a.weight_kg()} kg and name {_a.name!r}."
assert BenchScaleAdapter(BenchScale("X", 0)).weight_kg() == 0, "0 g is 0 kg."
class _Native:
    name = "native"
    def weight_kg(self):
        return 2.5
assert total_kg([_a, _Native(), BenchScaleAdapter(BenchScale("Y", 766))]) == 4.5, "Adapted and native scales mix freely in total_kg."
class _Changing:
    model = "C"
    def __init__(self):
        self.g = 100
    def display(self):
        return f"{self.g} g"
_c = _Changing()
_ad = BenchScaleAdapter(_c)
_c.g = 2500
assert _ad.weight_kg() == 2.5, "Read the scale's display at the moment weight_kg is called, not once at creation."
"SUCCESS: One adapter class translates grams-as-text into the kilograms the packing code expects, and nothing else had to change."
```

Hint: Store the wrapped scale. `weight_kg` reads `display()`, takes the number before the space with `split()[0]`, converts to `int`, and divides by 1000. `name` can be a property returning the scale's `model`.
:::

::: challenge A notifier adapter with pass-through [medium]
The alert system expects a notifier with `notify(level, text)`, where `level` is `"info"`, `"warning"` or `"critical"`. A third-party paging service offers instead `page(priority, msg)`, where priority is 1 (critical) to 3 (info), plus many other methods (`status()`, `quiet_hours`, and so on) the alert system never uses but the operations team does. Write `PagerAdapter(pager)` with a `notify(level, text)` that maps `"critical"` to 1, `"warning"` to 2 and `"info"` to 3, raises `ValueError` for any other level, and calls `pager.page(priority, text)`. Every **other** attribute or method must pass straight through to the wrapped pager, using `__getattr__`.

```python starter
class Pager:
    def __init__(self):
        self.sent = []
        self.quiet_hours = (23, 6)
    def page(self, priority, msg):
        self.sent.append((priority, msg))
    def status(self):
        return f"{len(self.sent)} pages sent"

class PagerAdapter:
    pass

print(Pager().status())
```

```python solution
class Pager:
    def __init__(self):
        self.sent = []
        self.quiet_hours = (23, 6)
    def page(self, priority, msg):
        self.sent.append((priority, msg))
    def status(self):
        return f"{len(self.sent)} pages sent"

class PagerAdapter:
    PRIORITY = {"critical": 1, "warning": 2, "info": 3}

    def __init__(self, pager):
        self._pager = pager

    def notify(self, level, text):
        if level not in self.PRIORITY:
            raise ValueError(f"unknown level {level!r}")
        self._pager.page(self.PRIORITY[level], text)

    def __getattr__(self, name):
        return getattr(self._pager, name)

pager = Pager()
alerts = PagerAdapter(pager)
alerts.notify("critical", "freezer 3 warm")
print(alerts.status(), pager.sent)
```

```python test
for _n in ["PagerAdapter", "Pager"]:
    assert _n in dir(), f"Keep {_n} defined."
_p = Pager()
_a = PagerAdapter(_p)
_a.notify("critical", "freezer 3 warm"); _a.notify("info", "door closed"); _a.notify("warning", "humidity high")
assert _p.sent == [(1, "freezer 3 warm"), (3, "door closed"), (2, "humidity high")], f"Levels map to priorities 1, 3 and 2; got {_p.sent}."
try:
    _a.notify("panic", "x")
    assert False, "An unknown level should raise ValueError."
except ValueError:
    pass
assert _p.sent[-1] == (2, "humidity high"), "A refused alert must not be paged."
assert _a.status() == "3 pages sent" and _a.quiet_hours == (23, 6), "Other methods and attributes should pass through to the pager."
_p.quiet_hours = (22, 7)
assert _a.quiet_hours == (22, 7), "Pass-through should read the pager's current value, not a copy."
try:
    _a.no_such_thing
    assert False, "A name the pager doesn't have should still raise AttributeError."
except AttributeError:
    pass
assert "status" not in vars(type(_a)), "Don't write forwarding methods by hand: let __getattr__ pass them through."
"SUCCESS: The adapter translates the one call the alert system makes and forwards everything else, so both teams use the same object."
```

Hint: Keep a dict from level to priority. `notify` checks the level, then calls `self._pager.page(...)`. `__getattr__(self, name)` returns `getattr(self._pager, name)`; Python calls it only for names the adapter itself does not have.
:::

::: challenge A lazy adapter over a paged API [hard]
A supplier's stock service is paged: `fetch(cursor)` returns a dict `{"items": [...], "next": cursor_or_None}`, where you start with cursor `None` and stop when `"next"` is `None`. Write a class `StockFeed(fetch)` that adapts it into an ordinary iterable, so that `for item in StockFeed(fetch)` yields every item in order. It must be **lazy**: a page is fetched only when the loop needs its first item, so stopping early fetches no further pages. Iterating the same `StockFeed` twice must start from the beginning again (implement `__iter__` as a generator method). Also give it a method `first(predicate)` returning the first item for which `predicate(item)` is true, fetching as few pages as possible, or `None` if no item matches.

```python starter
class StockFeed:
    def __init__(self, fetch):
        self.fetch = fetch

pages = {None: {"items": [1, 2], "next": "b"}, "b": {"items": [3], "next": None}}
print("define __iter__ and first; the first page is", pages[None])
```

```python solution
class StockFeed:
    def __init__(self, fetch):
        self._fetch = fetch

    def __iter__(self):
        cursor = None
        while True:
            page = self._fetch(cursor)
            yield from page["items"]
            cursor = page["next"]
            if cursor is None:
                return

    def first(self, predicate):
        return next((item for item in self if predicate(item)), None)

pages = {None: {"items": [1, 2], "next": "b"}, "b": {"items": [3], "next": None}}
print(list(StockFeed(lambda cursor: pages[cursor])))
```

```python test
assert "StockFeed" in dir(), "Keep the class name StockFeed."
_pages = {None: {"items": ["a", "b"], "next": "p2"}, "p2": {"items": [], "next": "p3"}, "p3": {"items": ["c", "d", "e"], "next": "p4"}, "p4": {"items": ["f"], "next": None}}
_log = []
def _fetch(_cursor):
    _log.append(_cursor)
    return _pages[_cursor]
_feed = StockFeed(_fetch)
assert _log == [], "Creating the feed should fetch nothing yet."
assert list(_feed) == list("abcdef") and _log == [None, "p2", "p3", "p4"], f"All items in order, each page fetched once (an empty page is fine); fetched {_log}."
_log.clear()
assert list(_feed) == list("abcdef") and len(_log) == 4, "Iterating again starts from the beginning."
_log.clear()
for _item in _feed:
    if _item == "b":
        break
assert _log == [None], f"Stopping after 'b' should fetch only the first page; fetched {_log}."
_log.clear()
assert _feed.first(lambda _x: _x in "cd") == "c" and _log == [None, "p2", "p3"], f"first() should stop fetching once it finds a match; fetched {_log}."
_log.clear()
assert _feed.first(lambda _x: _x == "z") is None and len(_log) == 4, "No match: None, after reading everything."
_it = iter(_feed)
_log.clear()
assert next(_it) == "a" and _log == [None], "Nothing is fetched until the first item is asked for."
assert StockFeed(lambda _c: {"items": [], "next": None}).first(bool) is None and list(StockFeed(lambda _c: {"items": [], "next": None})) == [], "An empty feed yields nothing."
"SUCCESS: Paging is hidden behind ordinary iteration, and because the adapter is a generator, pages are fetched only when the loop actually needs them."
```

Hint: Make `__iter__` a generator: start with `cursor = None`, then loop: fetch the page, `yield from page["items"]`, move to `page["next"]`, and `return` when it is `None`. `first` can be `next((item for item in self if predicate(item)), None)`, which stops at the first match.
:::

## What you learned

- An adapter wraps an object with the wrong interface and presents the one your code expects, translating each call. The knowledge of the misfit lives in one place, and existing code works unchanged.
- Prefer object adapters, which hold the adaptee, to class adapters, which subclass it.
- A small function, `functools.partial` or a `lambda` is often adapter enough when the mismatch is in a call signature.
- `__getattr__` runs only when normal lookup fails, so an adapter can translate a few methods and pass every other name through to the adaptee.
- Adapters can bridge styles of access: a generator turns a paged API into a lazy iterable that fetches pages only when the loop needs them.

The next lesson wraps objects for a different reason: not to change their interface, but to add behaviour while keeping it, with the decorator pattern and Python's `@decorators`.
