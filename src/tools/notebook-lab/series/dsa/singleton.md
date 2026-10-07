# Singleton, and why to avoid it

Some things should exist only once in a program: the settings loaded from its configuration file, the pool of database connections, the log. The **Singleton** pattern guarantees a class has exactly one instance and gives everyone a global way to reach it. It is one of the best-known patterns, and one of the most criticised, because "one instance, reachable from anywhere" is a global variable with extra steps, and global state is the tight coupling the design lessons have warned about since the first one.

This lesson shows the classic Singleton, what it costs, and what Python programs usually do instead. It also covers the cases where "exactly one" really is right.

This lesson covers:

- the classic Singleton, built with `__new__`;
- what it costs: hidden dependencies and tests that leak into each other;
- Python's alternatives: modules, cached factory functions, and simply passing one instance in;
- legitimate single objects: sentinels, and one instance per name.

## The classic Singleton

A class controls creation through `__new__`, the method Python calls to make a new object before `__init__` sets it up. A Singleton's `__new__` creates the instance the first time and hands back the same one every time after. Predict before running: after `b` changes the units, what does `a` say?

```python type
class Settings:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.units = "mm"
            cls._instance.tolerance = 0.05
        return cls._instance

a = Settings()
b = Settings()
print("same object:", a is b)
b.units = "inch"
print("a.units is now", a.units)
```

```output
same object: True
a.units is now inch
```

`super().__new__(cls)` makes a plain new object of the class. The setup happens inside the `if`, not in `__init__`, because `__init__` would run again on every `Settings()` call and reset the values.

`a` and `b` are the same object, so `a` now says `"inch"`. That is the pattern working as designed: every `Settings()` anywhere in the program returns the one shared instance.

## What it costs

That sharing is exactly the problem. Here are two "tests" of code that reads the settings. The imperial test changes the units for its own purpose and forgets to put them back. Predict before running: does the metric test pass when run alone, and when run after the imperial test?

```python type
def format_length(value):
    s = Settings()
    return f"{value:.2f} {s.units}"

def test_metric_label():
    assert format_length(12.5) == "12.50 mm", format_length(12.5)
    return "pass"

def test_imperial_label():
    Settings().units = "inch"
    assert format_length(0.5) == "0.50 inch"
    return "pass"

Settings._instance = None
print("metric test alone:", test_metric_label())

Settings._instance = None
test_imperial_label()
try:
    print("metric test after imperial:", test_metric_label())
except AssertionError as error:
    print("metric test after imperial FAILS, got", error)
```

```output
metric test alone: pass
metric test after imperial FAILS, got 12.50 inch
```

`Settings._instance = None` is a reset that real code rarely has; without it the earlier cell's `"inch"` would still be in place.

Run alone, the metric test passes. Run after the imperial test, it fails, though nothing about it changed. Tests that pass or fail depending on what ran before them are among the worst bugs a test suite can have. Three costs are visible here:

- **Hidden dependency**: `format_length`'s signature says it takes a number. It secretly also depends on global settings that any code anywhere can change.
- **Shared state between tests**: every test sees every other test's changes, unless each one carefully resets.
- **"Exactly one" is a guess about the future**: the day the program must handle two machines with different units, the single instance is wired into every call site.

## Python's alternatives

**A module is already a singleton.** Python runs a module's code once, on its first import, and stores the module object in `sys.modules`. Every later `import` returns that same object. So module-level objects, such as `settings = load_settings()` in a `config.py`, are created once and shared, with no class tricks at all. It is still global state, but at least it is honest about it.

**A cached factory function** gives one lazily created instance with a reset for tests. `functools.cache` remembers a function's result, so `get_settings()` builds the object on the first call and returns the same one after that. `get_settings.cache_clear()` forgets it, which gives every test a fresh start.

**Best of all: create one and pass it in.** The program's composition root (from the dependency injection lesson) makes one `Settings` object and hands it to whatever needs it. There is still exactly one in the running program, but by arrangement, not by force. Tests make their own, and the dependency is visible in every signature. Predict before running: do the three labels affect each other now?

```python type
import sys, math
from functools import cache
from dataclasses import dataclass

import math as maths_again
print("a module is created once:", maths_again is math is sys.modules["math"])

@dataclass
class MachineSettings:
    units: str = "mm"
    tolerance: float = 0.05

@cache
def get_settings():
    print("  (loading settings)")
    return MachineSettings()

print(get_settings() is get_settings())
get_settings.cache_clear()
print(get_settings() is get_settings())

def label(value, settings):
    return f"{value:.2f} {settings.units}"

imperial = MachineSettings(units="inch")
print(label(0.5, imperial), "|", label(12.5, MachineSettings()), "|", label(12.5, MachineSettings()))
```

```output
a module is created once: True
  (loading settings)
True
  (loading settings)
True
0.50 inch | 12.50 mm | 12.50 mm
```

The cached factory printed "(loading settings)" once per cache: once, then once more after `cache_clear`.

With the settings passed in, the imperial "test" uses its own object, and the metric ones get fresh defaults. Nothing leaks, because nothing is shared unless the code says so. Two machines with different units are simply two `MachineSettings` objects.

## When one really is right

Some single objects are genuinely good design.

**Sentinels.** `None`, `True`, `False` and `...` are single objects that Python compares with `is`. A program can make its own with `MISSING = object()`, a unique marker meaning "no value was given". It is needed when `None` itself is a valid value. Because the sentinel is immutable and has no state, sharing it costs nothing.

**One instance per name.** `logging.getLogger("pumps")` returns the same logger object every time it is asked for `"pumps"`, and a different one for `"valves"`. This is a **registry**, a dictionary of instances keyed by name. Code in different places can share a logger by agreeing on a name, without passing the object around. Loggers are still shared, mutable, global state (their levels and handlers can be changed from anywhere), which is why the hard challenge builds a registry you create and pass in instead. Predict before running: which of these are the same object?

```python type
import logging

print(logging.getLogger("pumps") is logging.getLogger("pumps"))
print(logging.getLogger("pumps") is logging.getLogger("valves"))

MISSING = object()

def setting(options, name, default=MISSING):
    if name in options:
        return options[name]
    if default is MISSING:
        raise KeyError(f"no setting {name!r} and no default given")
    return default

options = {"coolant": None}
print(setting(options, "coolant"), setting(options, "speed", default=None))
try:
    setting(options, "speed")
except KeyError as error:
    print("KeyError:", error)
```

```output
True
False
None None
KeyError: "no setting 'speed' and no default given"
```

`setting(options, "coolant")` returns `None` because the setting **exists** with the value `None`. `setting(options, "speed", default=None)` returns the caller's chosen default, `None`. Only with no default at all does a missing name raise. A plain `default=None` could not tell "no default" from "default of None"; the sentinel can.

The rule of thumb: a single **stateless** or **immutable** object (a sentinel, a constant, an enum member) is harmless to share. A single **mutable** object that the whole program reads and writes is global state, whatever pattern it wears. Prefer to create it once and pass it in.

::: challenge A sentinel for "no default" [easy]
Write `first_match(items, predicate, default=...)` returning the first item for which `predicate(item)` is true. If no item matches, return `default` when one was given, and raise `LookupError` when none was given. `None`, `0`, `False` and `""` are all valid defaults (and valid items), so use a sentinel: a module-level `NO_DEFAULT = object()` as the default value, compared with `is`.

```python starter
def first_match(items, predicate, default=None):
    for item in items:
        if predicate(item):
            return item
    return default

print(first_match([3, 8, 12], lambda x: x > 5))
```

```python solution
NO_DEFAULT = object()

def first_match(items, predicate, default=NO_DEFAULT):
    for item in items:
        if predicate(item):
            return item
    if default is NO_DEFAULT:
        raise LookupError("no item matches and no default was given")
    return default

print(first_match([3, 8, 12], lambda x: x > 5), first_match([], bool, default=None))
```

```python test
import inspect as _inspect
assert "first_match" in dir() and "NO_DEFAULT" in dir(), "Define NO_DEFAULT and first_match."
assert _inspect.signature(first_match).parameters["default"].default is NO_DEFAULT, "The default parameter's default value should be the NO_DEFAULT sentinel."
assert first_match([3, 8, 12], lambda x: x > 5) == 8, "The first item over 5 is 8."
assert first_match([0, False, None, ""], lambda x: True) == 0, "The first item, 0, matches."
for _d in [None, 0, False, "", []]:
    assert first_match([1, 2], lambda x: x > 5, default=_d) is _d, f"A default of {_d!r} must be returned as given."
try:
    first_match([1, 2], lambda x: x > 5)
    assert False, "With no match and no default, raise LookupError."
except LookupError:
    pass
try:
    first_match([], bool)
    assert False, "An empty list with no default raises LookupError."
except LookupError:
    pass
"SUCCESS: The sentinel is one unique, stateless object, so it can mean 'nothing was given' even when None, 0 or False are perfectly good answers."
```

Hint: Put `NO_DEFAULT = object()` above the function and use it as `default`'s default value. After the loop, check `if default is NO_DEFAULT:` and raise; otherwise return `default`.
:::

::: challenge One settings object, resettable [medium]
Some code really does need a lazily created, shared settings object. Write it the testable way. `load_settings(text)` parses lines like `"units = mm"` into a dict, stripping spaces around keys and values (both stay strings) and ignoring blank lines and lines starting with `#`. `get_settings()` returns the settings parsed from the module-level string `CONFIG_TEXT`, creating them on the **first** call only (use `functools.cache`), and returning the very same dict object afterwards. `reset_settings()` forgets the cached settings, so the next `get_settings()` parses `CONFIG_TEXT` again.

```python starter
CONFIG_TEXT = """
# machine settings
units = mm
tolerance = 0.05
"""

def get_settings():
    return {}

print(get_settings())
```

```python solution
from functools import cache

CONFIG_TEXT = """
# machine settings
units = mm
tolerance = 0.05
"""

def load_settings(text):
    settings = {}
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        key, value = line.split("=", 1)
        settings[key.strip()] = value.strip()
    return settings

@cache
def get_settings():
    return load_settings(CONFIG_TEXT)

def reset_settings():
    get_settings.cache_clear()

print(get_settings())
```

```python test
for _n in ["load_settings", "get_settings", "reset_settings"]:
    assert _n in dir(), f"Define {_n}."
assert load_settings("a = 1\n\n# note\n  b=two  \n") == {"a": "1", "b": "two"}, f"load_settings gave {load_settings('a = 1')!r}..."
assert load_settings("url = http://x?a=b") == {"url": "http://x?a=b"}, "Split on the first '=' only."
reset_settings()
CONFIG_TEXT = "units = mm\n"
_first = get_settings()
assert _first == {"units": "mm"} and get_settings() is _first, "get_settings should return the same dict object every time."
CONFIG_TEXT = "units = inch\n"
assert get_settings() is _first and get_settings()["units"] == "mm", "Without a reset, the settings are not re-read."
reset_settings()
_second = get_settings()
assert _second == {"units": "inch"} and _second is not _first, "After reset_settings, the next call parses CONFIG_TEXT afresh."
_parses = []
_real_load = load_settings
def _spy(text):
    _parses.append(text)
    return _real_load(text)
load_settings = _spy
try:
    reset_settings()
    for _ in range(5):
        get_settings()
finally:
    load_settings = _real_load
assert len(_parses) == 1, f"The settings should be parsed once per reset, not on every call; parsed {len(_parses)} times."
"SUCCESS: One shared settings object, created lazily, with a reset that gives every test a clean start."
```

Hint: `load_settings` loops over `text.splitlines()`, skips blank and `#` lines, and splits each on the first `=` with `split("=", 1)`. Decorate `get_settings` with `@cache` (from `functools`) and have it return `load_settings(CONFIG_TEXT)`. `reset_settings` calls `get_settings.cache_clear()`.
:::

::: challenge One instance per name, without globals [hard]
Write a `Registry` class that gives out one instance per name, like `logging.getLogger`, but as an ordinary object you create and pass around, so two registries (say, one per test) never share anything. `Registry(factory)` stores a factory function. `get(name)` returns the instance for `name`, calling `factory(name)` the first time that name is asked for and returning the same object every time after. `names()` returns the sorted list of names created so far. `__contains__` reports whether a name has been created, **without** creating it. `drop(name)` forgets an instance (raising `KeyError` for an unknown name), so the next `get` makes a fresh one.

Then write `Meter(name)`, a small class with a `name` attribute, a `total` starting at 0, and a method `add(amount)`, to use as a factory.

```python starter
class Registry:
    def __init__(self, factory):
        self.factory = factory

    def get(self, name):
        return self.factory(name)

print("define Registry and Meter")
```

```python solution
class Registry:
    def __init__(self, factory):
        self._factory = factory
        self._instances = {}

    def get(self, name):
        if name not in self._instances:
            self._instances[name] = self._factory(name)
        return self._instances[name]

    def names(self):
        return sorted(self._instances)

    def __contains__(self, name):
        return name in self._instances

    def drop(self, name):
        del self._instances[name]

class Meter:
    def __init__(self, name):
        self.name = name
        self.total = 0

    def add(self, amount):
        self.total += amount

meters = Registry(Meter)
meters.get("coolant").add(5)
meters.get("coolant").add(3)
print(meters.get("coolant").total, meters.names())
```

```python test
for _n in ["Registry", "Meter"]:
    assert _n in dir(), f"Define {_n}."
_made = []
def _factory(name):
    _made.append(name)
    return Meter(name)
_r = Registry(_factory)
_a = _r.get("coolant")
assert _r.get("coolant") is _a and _made == ["coolant"], "The same name gives the same object, made once."
_a.add(5); _r.get("coolant").add(3)
assert _r.get("coolant").total == 8 and _a.name == "coolant", "Updates through any reference reach the one instance."
assert _r.get("air") is not _a and _r.names() == ["air", "coolant"], "Different names give different objects; names() is sorted."
assert "air" in _r and "oil" not in _r and _made == ["coolant", "air"], "`in` reports names already created without creating new ones."
_other = Registry(Meter)
assert _other.get("coolant") is not _a and _other.get("coolant").total == 0, "Two registries share nothing: each test can have its own."
_r.drop("coolant")
assert "coolant" not in _r and _r.get("coolant") is not _a and _r.get("coolant").total == 0, "After drop, the next get makes a fresh instance."
try:
    _r.drop("never-made")
    assert False, "Dropping an unknown name should raise KeyError."
except KeyError:
    pass
assert Registry(str.upper).get("abc") == "ABC", "Any factory works, not just Meter."
"SUCCESS: One instance per name, shared by agreement on the name, yet the registry is an ordinary object: tests make their own and nothing leaks."
```

Hint: Keep a dict from name to instance. `get` creates with the factory only when the name is missing. `names()` is `sorted(self._instances)`, `__contains__` checks the dict, and `drop` deletes from it (`del` raises `KeyError` by itself).
:::

## What you learned

- Singleton makes a class return one shared instance, usually through `__new__`. Every caller gets the same mutable object.
- That is global state: hidden dependencies, tests that pass or fail depending on what ran before, and a hard-wired "only one" that the future may contradict.
- A module is already created once and shared. `functools.cache` on a factory gives one lazily created instance with `cache_clear` for tests. Best of all, create one in the composition root and pass it in.
- Sharing is harmless for stateless or immutable objects: sentinels such as `object()` markers, constants and enum members. A registry gives one instance per name, and as an ordinary object it can be created fresh for each test.

The next lesson creates new objects by copying existing ones: the prototype pattern, and Python's `copy` module.
